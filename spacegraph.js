/**
 * @license MIT
 * @module spacegraph
 * @description A JavaScript library for creating interactive 2D/3D Zooming User Interfaces (ZUI)
 * built with Three.js and HTML/CSS. It provides a scene graph, event handling,
 * and a variety of node types to build complex, data-driven visualizations.
 */
import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { gsap } from 'gsap';

// UI Manager Imports
import { PointerInputHandler } from './js/ui/PointerInputHandler.js';
import { HtmlAppNode } from './js/HtmlAppNode.js';
import { KeyboardInputHandler } from './js/ui/KeyboardInputHandler.js';
import { WheelInputHandler } from './js/ui/WheelInputHandler.js';
import { DragAndDropHandler } from './js/ui/DragAndDropHandler.js';
import { ContextMenuManager } from './js/ui/ContextMenuManager.js';
import { LinkingManager } from './js/ui/LinkingManager.js';
import { EdgeMenuManager } from './js/ui/EdgeMenuManager.js';
import { DialogManager } from './js/ui/DialogManager.js';

export const $ = (selector, context = document) => context.querySelector(selector);
export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
export const lerp = (a, b, t) => a + (b - a) * t;
export const generateId = (prefix = 'id') =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const DEG2RAD = Math.PI / 180;

/**
 * @class SpaceGraph
 * @classdesc Manages the entire 2D/3D graph visualization, including nodes, edges, rendering, and user interactions.
 * It orchestrates components like {@link UIManager}, {@link CameraController}, and {@link ForceLayout}.
 * The SpaceGraph is the main entry point for creating and interacting with the visualization.
 *
 * It also features an event emitter system that allows other parts of an application to subscribe to
 * significant events occurring within the graph.
 *
 * @typedef {object} UIElements
 * @description An optional object that can be passed to the {@link SpaceGraph} constructor (and subsequently to {@link UIManager})
 * to provide pre-existing DOM elements for UI components like context menus or dialogs.
 * If elements are not provided, UIManager may create default ones.
 * @property {HTMLElement} [contextMenuEl] - A pre-existing DOM element to be used for context menus.
 * @property {HTMLElement} [confirmDialogEl] - A pre-existing DOM element for confirmation dialogs.
 * @property {HTMLElement} [statusIndicatorEl] - A pre-existing DOM element for displaying status messages.
 *
 * @fires SpaceGraph#nodeAdded
 * @fires SpaceGraph#nodeRemoved
 * @fires SpaceGraph#edgeAdded
 * @fires SpaceGraph#edgeRemoved
 * @fires SpaceGraph#nodeSelected
 * @fires SpaceGraph#edgeSelected
 *
 * @example
 * // HTML setup:
 * // <div id="graph-container" style="width: 800px; height: 600px;"></div>
 *
 * import { SpaceGraph } from './spacegraph.js';
 *
 * const container = document.getElementById('graph-container');
 * const graph = new SpaceGraph(container);
 *
 * // Add some nodes
 * graph.addNode({ type: 'note', id: 'node1', content: 'Hello', x: 0, y: 0 });
 * graph.addNode({ type: 'shape', id: 'node2', shape: 'sphere', x: 100, y: 50, label: 'Sphere' });
 * graph.addNode({
 *   type: 'html',
 *   id: 'node3',
 *   content: '<em>HTML Content</em>',
 *   x: -100, y: -50,
 *   width: 150, height: 50
 * });
 *
 * // Add an edge
 * graph.addEdge(graph.getNodeById('node1'), graph.getNodeById('node2'), { color: 0xff0000 });
 *
 * graph.centerView();
 *
 * // Listen for node additions
 * graph.on('nodeAdded', (eventData) => {
 *   console.log('A node was added:', eventData.node.id);
 * });
 */
export class SpaceGraph {
    /**
     * @private
     * @property {Map<string, Set<Function>>} _events - Internal map to store event listeners.
     *                                                Keys are event names, values are Sets of callback functions.
     */
    _events = new Map();

    /** @property {Map<string, BaseNode>} nodes - A map of all nodes in the graph, keyed by their IDs. Each node is an instance of a class extending {@link BaseNode}. */
    nodes = new Map();
    /** @property {Map<string, Edge>} edges - A map of all edges in the graph, keyed by their IDs. Each edge is an instance of {@link Edge}. */
    edges = new Map();
    /** @property {BaseNode | null} selectedNode - The currently selected node (an instance of {@link BaseNode}), if any. */
    selectedNode = null;
    /** @property {Edge | null} selectedEdge - The currently selected edge (an instance of {@link Edge}), if any. */
    selectedEdge = null;
    /** @property {boolean} isLinking - Flag indicating if the user is currently in the process of creating a new link (edge) between nodes. */
    isLinking = false;
    /** @property {BaseNode | null} linkSourceNode - The source node (an instance of {@link BaseNode}) from which a new link is being dragged. */
    linkSourceNode = null;
    /** @property {THREE.Line | null} tempLinkLine - A temporary Three.js {@link THREE.Line} object used to visualize a link being created by the user before it's finalized. */
    tempLinkLine = null;
    /** @property {UIManager | null} uiManager - Manages user interface elements and interactions. See {@link UIManager}. */
    uiManager = null;
    /** @property {CameraController | null} cameraController - Controls the camera's position, orientation, and movement. See {@link CameraController}. */
    cameraController = null;
    /** @property {ForceLayout | null} layoutEngine - Manages the physics-based layout of nodes and edges. See {@link ForceLayout}. */
    layoutEngine = null;
    /** @property {{color: number, alpha: number}} background - The background color and alpha (opacity) for the WebGL renderer. Default is `{color: 0x000000, alpha: 0.0}` (transparent black). */
    background = { color: 0x000000, alpha: 0.0 };
    /** @property {SpaceGraphConfig} config - Configuration object for SpaceGraph settings. Merges user-provided config with defaults. See {@link SpaceGraphConfig}. */
    config = {};

    /**
     * @typedef {object} SpaceGraphConfig
     * @description Configuration object for initializing the SpaceGraph instance.
     * Defines settings for rendering, camera behavior, and default properties for nodes and edges,
     * allowing customization of the graph's appearance and interaction dynamics.
     * @property {object} [rendering] - Settings related to visual rendering.
     * @property {number} [rendering.defaultBackgroundColor=0x000000] - Default background color for the WebGL canvas (hexadecimal).
     * @property {number} [rendering.defaultBackgroundAlpha=0.0] - Default background alpha (opacity) for the WebGL canvas (0.0 to 1.0).
     * @property {number} [rendering.lineIntersectionThreshold=5] - Raycaster threshold (in world units) for detecting intersections with lines (edges).
     * @property {object} [camera] - Settings for the {@link CameraController}.
     * @property {number} [camera.initialPositionZ=700] - Initial Z-axis position of the camera.
     * @property {number} [camera.fov=70] - Camera's vertical field of view in degrees.
     * @property {number} [camera.zoomSpeed=0.0015] - Multiplier for camera zoom sensitivity.
     * @property {number} [camera.panSpeed=0.8] - Multiplier for camera panning sensitivity.
     * @property {number} [camera.dampingFactor=0.12] - Damping factor for smoothing camera movements (higher means faster interpolation).
     * @property {object} [defaults] - Default properties for newly created nodes and edges.
     * @property {object} [defaults.node] - Default properties for nodes.
     * @property {object} [defaults.node.html] - Default properties for HTML-based nodes (like {@link HtmlNodeElement} or {@link NoteNode}).
     * @property {number} [defaults.node.html.width=160] - Default width in pixels.
     * @property {number} [defaults.node.html.height=70] - Default height in pixels.
     * @property {boolean} [defaults.node.html.billboard=true] - Whether HTML nodes should always face the camera.
     * @property {number} [defaults.node.html.contentScale=1.0] - Default scale factor for the content inside an HTML node.
     * @property {string} [defaults.node.html.backgroundColor='var(--node-bg-default)'] - Default CSS background color string.
     * @property {object} [defaults.node.shape] - Default properties for shape-based nodes (like {@link ShapeNode}).
     * @property {string} [defaults.node.shape.shape='sphere'] - Default shape type (e.g., 'sphere', 'box').
     * @property {number} [defaults.node.shape.size=50] - Default size (e.g., diameter for sphere, side length for box).
     * @property {number} [defaults.node.shape.color=0xffffff] - Default color (hexadecimal).
     * @property {object} [defaults.edge] - Default properties for edges ({@link Edge}).
     * @property {number} [defaults.edge.color=0x00d0ff] - Default edge color (hexadecimal).
     * @property {number} [defaults.edge.thickness=1.5] - Default edge line thickness.
     * @property {number} [defaults.edge.opacity=0.6] - Default edge line opacity (0.0 to 1.0).
     */

    /**
     * Creates an instance of SpaceGraph.
     * Initializes the 3D scenes (WebGL and CSS3D), renderers, camera, lighting,
     * UI manager ({@link UIManager}), layout engine ({@link ForceLayout}), and event listeners.
     * @constructor
     * @param {HTMLElement} containerElement - The DOM element that will host the SpaceGraph visualization.
     *                                       This element should have defined dimensions (width and height).
     * @param {Partial<SpaceGraphConfig>} [config={}] - Optional configuration object to override default settings. See {@link SpaceGraphConfig}.
     * @param {UIElements} [uiElements={}] - Optional pre-existing UI DOM elements to be used by the {@link UIManager}.
     *                                   Can include `contextMenuEl`, `confirmDialogEl`, `statusIndicatorEl`. See {@link UIElements}.
     * @throws {Error} If `containerElement` is not provided or is not a valid {@link HTMLElement}.
     * @example
     * const graphContainer = document.getElementById('myGraphContainer');
     * const spaceGraph = new SpaceGraph(graphContainer, { camera: { fov: 75 }});
     */
    constructor(containerElement, config = {}, uiElements = {}) {
        if (!containerElement || !(containerElement instanceof HTMLElement)) {
            throw new Error('SpaceGraph requires a valid HTML container element.');
        }
        /** @property {HTMLElement} container - The main container DOM element for the graph. */
        this.container = containerElement;
        this.config = { ...this.getDefaultConfig(), ...config };
        // Deep merge for nested objects like camera, rendering, defaults
        if (config.rendering) this.config.rendering = { ...this.getDefaultConfig().rendering, ...config.rendering };
        if (config.camera) this.config.camera = { ...this.getDefaultConfig().camera, ...config.camera };
        if (config.defaults) {
            this.config.defaults = { ...this.getDefaultConfig().defaults };
            if (config.defaults.node) {
                this.config.defaults.node = { ...this.getDefaultConfig().defaults.node };
                if (config.defaults.node.html)
                    this.config.defaults.node.html = {
                        ...this.getDefaultConfig().defaults.node.html,
                        ...config.defaults.node.html,
                    };
                if (config.defaults.node.shape)
                    this.config.defaults.node.shape = {
                        ...this.getDefaultConfig().defaults.node.shape,
                        ...config.defaults.node.shape,
                    };
            }
            if (config.defaults.edge)
                this.config.defaults.edge = { ...this.getDefaultConfig().defaults.edge, ...config.defaults.edge };
        }

        /** @property {THREE.Scene} scene - The main Three.js scene for WebGL objects (like shapes and edges). */
        this.scene = new THREE.Scene();
        /** @property {THREE.Scene} cssScene - The Three.js scene for CSS3D objects (HTML elements). */
        this.cssScene = new THREE.Scene();

        /**
         * @private
         * @property {THREE.PerspectiveCamera} _camera - The main perspective camera.
         */
        this._camera = new THREE.PerspectiveCamera(
            this.config.camera.fov,
            window.innerWidth / window.innerHeight,
            1,
            20000
        );
        this._camera.position.z = this.config.camera.initialPositionZ;

        this._setupRenderers();
        this.background = {
            // Initialize from config
            color: this.config.rendering.defaultBackgroundColor,
            alpha: this.config.rendering.defaultBackgroundAlpha,
        };
        this.setBackground(this.background.color, this.background.alpha);

        this.cameraController = new CameraController(this._camera, this.container, {
            zoomSpeed: this.config.camera.zoomSpeed,
            panSpeed: this.config.camera.panSpeed,
            dampingFactor: this.config.camera.dampingFactor,
        });
        this.layoutEngine = new ForceLayout(this);
        /** @property {Map<string, TypeDefinition>} nodeTypes - Registered custom node type definitions. */
        this.nodeTypes = new Map(); // Initialize for custom node types

        this.uiManager = new UIManager(this, uiElements);

        this._setupLighting();

        this.centerView(null, 0);
        this.cameraController.setInitialState();

        window.addEventListener('resize', this._onWindowResize.bind(this), false);

        this._animate();
        this.layoutEngine.start();
    }

    /**
     * Sets up the WebGL and CSS3D renderers, creating their respective DOM elements if they don't exist.
     * This method is called internally by the constructor.
     * @private
     */
    _setupRenderers() {
        /** @property {HTMLCanvasElement} webglCanvas - The canvas element used for WebGL rendering (e.g., {@link ShapeNode}s, {@link Edge}s). */
        this.webglCanvas = $('#webgl-canvas', this.container);
        if (!this.webglCanvas) {
            this.webglCanvas = document.createElement('canvas');
            this.webglCanvas.id = 'webgl-canvas';
            this.container.appendChild(this.webglCanvas);
        }
        /** @property {THREE.WebGLRenderer} webglRenderer - The main WebGL renderer. */
        this.webglRenderer = new THREE.WebGLRenderer({
            canvas: this.webglCanvas,
            antialias: true,
            alpha: true,
        });
        this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
        this.webglRenderer.setPixelRatio(window.devicePixelRatio);

        /** @property {HTMLElement} css3dContainer - The container div for the CSS3D renderer. */
        this.css3dContainer = $('#css3d-container', this.container);
        if (!this.css3dContainer) {
            this.css3dContainer = document.createElement('div');
            this.css3dContainer.id = 'css3d-container';
            this.container.appendChild(this.css3dContainer);
        }
        Object.assign(this.css3dContainer.style, {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '2',
        });

        /** @property {CSS3DRenderer} cssRenderer - The renderer for CSS3D objects. */
        this.cssRenderer = new CSS3DRenderer();
        this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
        this.css3dContainer.appendChild(this.cssRenderer.domElement);
        this.webglCanvas.style.position = 'absolute';
        this.webglCanvas.style.inset = '0';
        this.webglCanvas.style.zIndex = '1'; // WebGL canvas behind CSS3D container
    }

    /**
     * Sets up basic lighting (ambient and directional) for the main WebGL scene.
     * This method is called internally by the constructor.
     * @private
     */
    _setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Soft white light
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(0.5, 1, 0.75);
        this.scene.add(directionalLight);
    }

    /**
     * @typedef {object} VisualOutputs
     * @description An object returned by a {@link TypeDefinition}'s `onCreate` method, specifying the visual components of a custom node.
     * It can include Three.js objects for WebGL rendering and/or HTML elements for CSS3D rendering.
     * @property {(THREE.Mesh|undefined)} mesh - Optional Three.js {@link THREE.Mesh} for the node's WebGL representation (e.g., for shapes).
     * @property {(HTMLElement|undefined)} htmlElement - Optional {@link HTMLElement} for the node's HTML/CSS representation. This element will be wrapped in a {@link CSS3DObject}.
     * @property {(CSS3DObject|undefined)} cssObject - Optional, pre-created Three.js {@link CSS3DObject} that wraps the `htmlElement`. If not provided but `htmlElement` is, SpaceGraph creates it.
     * @property {(CSS3DObject|undefined)} labelObject - Optional {@link CSS3DObject} for rendering a text label, often used by {@link ShapeNode} or custom types needing a separate 3D label.
     */

    /**
     * @typedef {object} TypeDefinition
     * @description Defines the structure, appearance, and lifecycle behavior for a custom node type.
     * This definition is registered with {@link SpaceGraph#registerNodeType} and used to instantiate nodes of that custom type.
     * Methods within the definition allow for fine-grained control over node creation, updates, disposal, and interaction responses.
     * All callback methods receive the {@link RegisteredNode} instance as their first parameter and the {@link SpaceGraph} instance as the second (where applicable).
     * @property {function(RegisteredNode, SpaceGraph): VisualOutputs} onCreate - **Required.** Function to create the visual representation (mesh, HTML element) of the node.
     *                                                                         Must return a {@link VisualOutputs} object.
     * @property {function(RegisteredNode, SpaceGraph): object} [getDefaults] - Function that returns an object containing default data properties for this node type.
     *                                                                       This is merged with data provided during node creation.
     * @property {function(RegisteredNode, SpaceGraph)} [onUpdate] - Function called every frame during the animation loop to update the node's visual or internal state.
     *                                                              Useful for animations or data-driven visual changes.
     * @property {function(RegisteredNode, SpaceGraph)} [onDispose] - Function to clean up any custom resources (event listeners, complex objects) when the node is removed.
     *                                                               Standard Three.js objects (meshes, CSS3DObjects returned by `onCreate`) are handled by {@link RegisteredNode#dispose}.
     * @property {function(RegisteredNode, number, number, number, SpaceGraph)} [onSetPosition] - Custom logic for when the node's position is set programmatically or by the layout engine.
     *                                                                                          Allows overriding default position handling.
     * @property {function(RegisteredNode, boolean, SpaceGraph)} [onSetSelectedStyle] - Custom logic for applying/removing visual styles when the node is selected or deselected.
     * @property {function(RegisteredNode, boolean, SpaceGraph)} [onSetHoverStyle] - Custom logic for applying/removing visual styles when the node is hovered over.
     * @property {function(RegisteredNode, SpaceGraph): number} [getBoundingSphereRadius] - Custom logic to calculate the node's bounding sphere radius, used for focusing and layout.
     * @property {function(RegisteredNode, SpaceGraph)} [onStartDrag] - Custom logic executed when a drag operation starts on this node.
     * @property {function(RegisteredNode, THREE.Vector3, SpaceGraph)} [onDrag] - Custom logic executed during a drag operation, providing the new target position.
     * @property {function(RegisteredNode, SpaceGraph)} [onEndDrag] - Custom logic executed when a drag operation ends on this node.
 * @property {function(RegisteredNode, object, SpaceGraph)} [onDataUpdate] - Called when `spaceGraph.updateNodeData(nodeId, newData)` is used, or when data is automatically propagated to an input port via `RegisteredNode.emit()`.
 *                                                                           Allows the node to react to specific data changes. `newData` contains only the changed properties (the keys that were updated). The node's `data` property (`nodeInst.data`) will have already been updated with these changes before this callback is invoked.
 * @property {Class<RegisteredNode|HtmlAppNode>} [nodeClass] - Optional. A reference to a class that extends {@link RegisteredNode} or {@link HtmlAppNode}.
 *                                                 If provided, SpaceGraph will instantiate this class for nodes of this type, instead of the generic `RegisteredNode`.
 *                                                 This allows for more complex, encapsulated node behaviors by defining lifecycle methods (e.g., `onInit`, `onDataUpdate`, `render`) as methods of the provided class.
 *                                                 For HTML-based interactive nodes, extending {@link HtmlAppNode} is recommended.
     */

    /**
     * Registers a new node type definition, allowing for the creation of custom nodes with unique appearances and behaviors.
     * Once registered, nodes of this type can be added using {@link SpaceGraph#addNode} by specifying the `typeName` in the `type` property of the node data.
     *
     * @param {string} typeName - The unique name for this node type (e.g., 'my-custom-node', 'data-widget').
     *                            This name will be used as the `type` when adding nodes of this kind.
     * @param {TypeDefinition} typeDefinition - An object defining the lifecycle methods, default data, and visual creation
     *                                        for nodes of this type. See {@link TypeDefinition} for details on required and optional methods.
     * @throws {Error} If a node type with the same `typeName` is already registered.
     * @throws {Error} If `typeDefinition` is invalid (e.g., missing the required `onCreate` method).
     * @example
     * spaceGraph.registerNodeType('custom-data-node', {
     *   onCreate: (node, graph) => {
     *     // 'node' is the RegisteredNode instance being created
     *     // 'graph' is the SpaceGraph instance
     *     const el = document.createElement('div');
     *     el.className = 'custom-data-display';
     *     el.innerHTML = `<h3>${node.data.title}</h3><p>${node.data.value}</p>`;
     *     el.style.width = '200px';
     *     el.style.height = '100px';
     *     el.style.backgroundColor = 'lightblue';
     *     el.style.border = '1px solid blue';
     *     el.style.padding = '10px';
     *     // Return an object with the `htmlElement` and optionally `cssObject`
     *     // SpaceGraph will create the CSS3DObject if not provided directly.
     *     return { htmlElement: el };
     *   },
     *   getDefaults: (initialData) => ({
     *     title: 'Untitled',
     *     value: 0,
     *     color: 'lightblue', // Example custom default
     *     ...initialData // Merge with any data provided at node creation
     *   }),
     *   onUpdate: (node, graph) => {
     *     // Optional: Called each frame to update the node's visual or internal state
     *     // For example, if the node's appearance depends on external data
     *     const contentEl = node.htmlElement.querySelector('p');
     *     if (contentEl) contentEl.textContent = `Value: ${node.data.value}`;
     *   },
     *   onDispose: (node) => {
     *     // Optional: Clean up any custom resources when the node is removed
     *     console.log(`Custom node ${node.id} disposed.`);
     *   },
     *   // ... other optional lifecycle methods like onSetPosition, onSetSelectedStyle, etc.
     * });
     *
     * // Then, you can add nodes of this custom type:
     * graph.addNode({ type: 'custom-data-node', id: 'data1', title: 'Sensor A', value: 42 });
     */
    registerNodeType(typeName, typeDefinition) {
        if (this.nodeTypes.has(typeName)) {
            throw new Error(`Node type "${typeName}" is already registered.`);
        }
        if (!typeDefinition || typeof typeDefinition.onCreate !== 'function') {
            throw new Error(`Invalid typeDefinition for "${typeName}": onCreate method is required.`);
        }
        this.nodeTypes.set(typeName, typeDefinition);
        console.log(`Node type "${typeName}" registered.`);
    }

    /**
     * Sets the background color and opacity of the WebGL canvas.
     * The underlying HTML canvas element's background style is also updated for consistency, especially when alpha is 0.
     *
     * @param {number} [color=0x000000] - The hexadecimal color value (e.g., `0xff0000` for red).
     * @param {number} [alpha=0.0] - The opacity, ranging from `0.0` (fully transparent) to `1.0` (fully opaque).
     * @example
     * // Set a semi-transparent blue background
     * spaceGraph.setBackground(0x0000ff, 0.5);
     *
     * // Set a fully opaque black background
     * spaceGraph.setBackground(0x000000, 1.0);
     *
     * // Make background transparent
     * spaceGraph.setBackground(0x000000, 0.0);
     */
    setBackground(color = 0x000000, alpha = 0.0) {
        this.background = { color, alpha };
        this.webglRenderer.setClearColor(color, alpha);
        // Set the canvas style for cases where WebGL context isn't fully opaque or for visual consistency
        this.webglCanvas.style.backgroundColor =
            alpha === 0 ? 'transparent' : `#${color.toString(16).padStart(6, '0')}`;
    }

    /**
     * @typedef {object} NodeDataObject
     * @description A plain JavaScript object used to define the properties of a node when adding it to the graph
     * via {@link SpaceGraph#addNode}. It specifies the node's type, initial position, appearance, and any custom data.
     * @property {string} type - The type of the node (e.g., 'note', 'html', 'shape', or a custom type name
     *                           registered with {@link SpaceGraph#registerNodeType}). This determines which node class or
     *                           {@link TypeDefinition} will be used to instantiate the node.
     * @property {string} [id] - Optional unique ID for the node. If not provided, one will be generated automatically
     *                           (e.g., `node-1678886400000-randomstr`).
     * @property {number} [x=0] - Initial x-coordinate in world space.
     * @property {number} [y=0] - Initial y-coordinate in world space.
     * @property {number} [z=0] - Initial z-coordinate in world space.
     * @property {string} [label] - Text label for the node. For {@link ShapeNode}s, this is displayed as a 3D label. For HTML-based nodes, it might be used as default content or title.
     * @property {string} [content] - HTML content for 'html' or 'note' type nodes (e.g., `"<p>Hello World</p>"`).
     * @property {string} [shape] - For 'shape' type nodes, specifies the geometry (e.g., 'box', 'sphere'). See {@link ShapeNode}.
     * @property {number} [size] - For 'shape' type nodes, defines the characteristic size (e.g., diameter for a sphere, side length for a box).
     * @property {number} [color] - For 'shape' type nodes, specifies the color as a hexadecimal number (e.g., `0xff0000` for red).
     * @property {number} [width] - For 'html' or 'note' type nodes, specifies the width of the HTML element in pixels. See {@link HtmlNodeElement}.
     * @property {number} [height] - For 'html' or 'note' type nodes, specifies the height of the HTML element in pixels. See {@link HtmlNodeElement}.
     * @property {boolean} [editable=false] - For 'note' type nodes (or custom HTML nodes supporting it), determines if the content is user-editable.
     * @property {object} [ports] - For {@link RegisteredNode} types, defines input/output ports. Example: `{ inputs: { in1: { type: 'number' } }, outputs: { out1: { type: 'string' } } }`.
     * @property {*} [any] - Any other properties specific to a custom node type can be included. These will be passed to the node's data object.
     */

    /**
     * Adds a node to the graph.
     * This method can accept either a pre-instantiated node object (which must extend {@link BaseNode})
     * or a plain JavaScript object ({@link NodeDataObject}) describing the node to be created.
     * If a data object is provided, a node of the specified `type` will be instantiated.
     * Supported built-in types are 'note' (see {@link NoteNode}), 'html' (see {@link HtmlNodeElement}),
     * and 'shape' (see {@link ShapeNode}). Custom types can be registered using {@link SpaceGraph#registerNodeType}.
     *
     * Emits a `nodeAdded` event upon successful addition.
     *
     * @param {BaseNode | NodeDataObject} dataOrInstance - Either a node instance (e.g., `new NoteNode(...)`)
     *                                                   or a data object defining the node (e.g., `{ type: 'note', id: 'myNote', content: 'Hello world' }`).
     *                                                   See {@link NodeDataObject} for common properties.
     * @returns {BaseNode | null} The added or created node instance (an object extending {@link BaseNode}).
     *                            Returns `null` if node creation fails (e.g., unknown type, missing required data, or ID already exists and is not an instance).
     * @throws {Error} If `dataOrInstance` is not a valid object or a {@link BaseNode} instance.
     * @fires SpaceGraph#nodeAdded
     * @example
     * // Add a 'note' node using a data object
     * const noteNode = spaceGraph.addNode({
     *   type: 'note',
     *   id: 'my-note-1',
     *   x: 100, y: 50, z: 0,
     *   content: 'This is an editable note.'
     * });
     *
     * // Add a 'shape' node (sphere)
     * const sphereNode = spaceGraph.addNode({
     *   type: 'shape',
     *   shape: 'sphere', // 'box' is also available
     *   label: 'My Sphere',
     *   x: -150, y: 0, z: 10,
     *   size: 60,
     *   color: 0x00ff00 // Green
     * });
     *
     * // Add an 'html' node with custom HTML content
     * const htmlNode = spaceGraph.addNode({
     *   type: 'html',
     *   content: '<h2>Custom HTML</h2><p>Rendered in 3D space.</p>',
     *   width: 250, height: 120,
     *   x: 0, y: -100, z: 0
     * });
     *
     * // Assuming 'custom-widget' type is registered:
     * // const customNode = spaceGraph.addNode({ type: 'custom-widget', id: 'cw1', customProp: 'value' });
     *
     * // Adding a pre-instantiated node (less common for typical usage).
     * // MyCustomNode must be a class that extends BaseNode or one of its derivatives (e.g., ShapeNode, HtmlAppNode).
     * // import { MyCustomNode } from './my-custom-node.js'; // Assuming MyCustomNode extends BaseNode
     * // const preInstantiatedNode = new MyCustomNode('custom-id', {x:0,y:0,z:0}, { someData: 'abc', type: 'my-type' });
     * // spaceGraph.addNode(preInstantiatedNode); // The node should be fully initialized.
     */
    addNode(dataOrInstance) {
        let nodeInstance;

        if (dataOrInstance instanceof BaseNode) {
            nodeInstance = dataOrInstance;
            if (!nodeInstance.id) nodeInstance.id = generateId('node'); // Ensure ID if missing
            if (this.nodes.has(nodeInstance.id)) {
                console.warn(
                    `Node instance with ID ${nodeInstance.id} already exists or ID is duplicated. Returning existing node.`
                );
                return this.nodes.get(nodeInstance.id);
            }
        } else if (typeof dataOrInstance === 'object' && dataOrInstance !== null) {
            const data = dataOrInstance; // data is a NodeDataObject
            if (!data.type) {
                console.error(
                    "Node data must include a 'type' property to determine which node class to instantiate.",
                    data
                );
                return null;
            }
            data.id = data.id ?? generateId('node'); // Ensure ID if missing
            if (this.nodes.has(data.id)) {
                console.warn(`Node with ID ${data.id} already exists. Returning existing node.`);
                return this.nodes.get(data.id);
            }

            const position = { x: data.x ?? 0, y: data.y ?? 0, z: data.z ?? 0 };

            // Check registered custom types first
            if (this.nodeTypes.has(data.type)) {
                const typeDefinition = this.nodeTypes.get(data.type);
                // Check if the typeDefinition specifies a custom node class
                if (typeDefinition.nodeClass) {
                    nodeInstance = new typeDefinition.nodeClass(data.id, data, typeDefinition, this);
                } else {
                    nodeInstance = new RegisteredNode(data.id, data, typeDefinition, this);
                }
            }
            // Then check built-in types
            else if (data.type === 'note') {
                nodeInstance = new NoteNode(data.id, position, data);
            } else if (data.type === 'html') {
                nodeInstance = new HtmlNodeElement(data.id, position, data);
            } else if (data.type === 'shape' || data.shape) {
                // data.shape for backward compatibility
                nodeInstance = new ShapeNode(data.id, position, data);
            } else {
                console.error(
                    `Unknown or unregistered node type: "${data.type}". Please register it using spaceGraph.registerNodeType().`
                );
                return null;
            }
        } else {
            throw new Error('Invalid argument to addNode. Must be a BaseNode instance or a NodeDataObject.');
        }

        if (!nodeInstance) {
            console.error('Node instantiation failed for an unknown reason.', dataOrInstance);
            return null;
        }

        this.nodes.set(nodeInstance.id, nodeInstance);
        nodeInstance.spaceGraph = this; // Ensure the node has a reference back to the graph

        // Add visual elements to the appropriate scenes
        if (nodeInstance.cssObject) this.cssScene.add(nodeInstance.cssObject);
        if (nodeInstance.mesh) this.scene.add(nodeInstance.mesh);
        if (nodeInstance.labelObject) this.cssScene.add(nodeInstance.labelObject); // For labels of ShapeNodes or custom nodes

        this.layoutEngine?.addNode(nodeInstance); // Add to physics layout engine
        this._emit('nodeAdded', { node: nodeInstance });
        return nodeInstance;
    }

    /**
     * Removes a node and all its connected edges from the graph.
     * If the node is currently selected or involved in linking, these states are cleared.
     * The node's `dispose` method is called to clean up its resources.
     * Emits a `nodeRemoved` event upon successful removal.
     *
     * @param {string} nodeId - The ID of the node to remove.
     * @returns {boolean} True if the node was found and removed, false otherwise.
     * @fires SpaceGraph#nodeRemoved
     * @example
     * spaceGraph.removeNode('my-note-1');
     */
    removeNode(nodeId) {
        const nodeToRemove = this.nodes.get(nodeId);
        if (!nodeToRemove) {
            console.warn(`Node with ID "${nodeId}" not found for removal.`);
            return false;
        }

        // Clear selection or linking state if this node is involved
        if (this.selectedNode === nodeToRemove) this.setSelectedNode(null);
        if (this.linkSourceNode === nodeToRemove) this.uiManager?.cancelLinking(); // UIManager handles temp line removal

        // Find and remove all edges connected to this node
        const edgesToRemove = [...this.edges.values()].filter(
            (edge) => edge.source === nodeToRemove || edge.target === nodeToRemove
        );
        edgesToRemove.forEach((edge) => this.removeEdge(edge.id)); // removeEdge will emit its own events

        nodeToRemove.dispose(); // Call node's internal cleanup (removes from scenes, disposes geometry/materials)
        this.nodes.delete(nodeId);
        this.layoutEngine?.removeNode(nodeToRemove); // Remove from physics layout

        this._emit('nodeRemoved', { nodeId: nodeId, node: nodeToRemove });
        return true;
    }

    /**
     * @typedef {object} EdgeDataObject
     * @description A plain JavaScript object defining the properties of an edge when adding it to the graph
     * via {@link SpaceGraph#addEdge}. It specifies the edge's appearance, physics behavior, and optional port connections.
     * @property {string} [id] - Optional unique ID for the edge. If not provided, one will be generated automatically.
     * @property {number} [color=0x00d0ff] - Hexadecimal color of the edge line (e.g., `0xff0000` for red).
     * @property {number} [thickness=1.5] - Thickness of the edge line in world units. Note: WebGL line width rendering capabilities for thicknesses > 1 can vary by platform.
     * @property {number} [opacity=0.6] - Opacity of the edge line (0.0 to 1.0).
     * @property {string} [style='solid'] - Style of the edge. Currently primarily 'solid'. Future support may include 'dashed'.
     * @property {string} [constraintType='elastic'] - Type of physics constraint for the {@link ForceLayout} engine.
     *                                               Options: 'elastic' (spring-like), 'rigid' (fixed length), 'weld' (nodes attempt to stay at a distance based on their radii).
     * @property {object} [constraintParams] - Parameters specific to the `constraintType`.
     * @property {number} [constraintParams.stiffness] - For 'elastic' or 'rigid' constraints, determines how strongly the constraint is enforced.
     * @property {number} [constraintParams.idealLength] - For 'elastic' constraints, the desired resting length of the edge.
     * @property {number} [constraintParams.distance] - For 'rigid' or 'weld' constraints, the fixed distance to maintain.
 * @property {string} [sourcePort] - If the `sourceNode` is a {@link RegisteredNode} with defined output ports, this string specifies the name of the output port from which this edge originates.
 *                                   Used by {@link RegisteredNode#emit} for automatic data propagation.
 * @property {string} [targetPort] - If the `targetNode` is a {@link RegisteredNode` with defined input ports, this string specifies the name of the input port to which this edge connects.
 *                                   Used by {@link RegisteredNode#emit} to determine the key for `updateNodeData` on the target node.
     */

    /**
     * Adds an edge connecting two nodes in the graph.
     * Edges are represented visually as lines (see {@link Edge}) and can influence the physics-based layout via the {@link ForceLayout} engine.
     * Emits an `edgeAdded` event upon successful addition.
     *
     * @param {BaseNode} sourceNode - The source node instance for the edge. Must be a valid {@link BaseNode} already present in the graph.
     * @param {BaseNode} targetNode - The target node instance for the edge. Must be a valid {@link BaseNode} already present in the graph.
     * @param {Partial<EdgeDataObject>} [data={}] - Optional data object for the edge, allowing customization of properties like
     *                                   `color`, `thickness`, `opacity`, `constraintType`, `constraintParams`, `sourcePort`, and `targetPort`.
     *                                   See {@link EdgeDataObject} for all available options and default values.
     * @returns {Edge | null} The created {@link Edge} instance, or `null` if creation failed.
     *                        Failure can occur if:
     *                        - `sourceNode` or `targetNode` are invalid or not found in the graph.
     *                        - `sourceNode` and `targetNode` are the same node.
     *                        - An identical edge (same source and target, or vice-versa if undirected) already exists.
     * @fires SpaceGraph#edgeAdded
     * @example
     * const nodeA = spaceGraph.getNodeById('nodeA');
     * const nodeB = spaceGraph.getNodeById('nodeB');
     * if (nodeA && nodeB) {
     *   const newEdge = spaceGraph.addEdge(nodeA, nodeB, {
     *     color: 0xff00ff, // Magenta
     *     thickness: 2,
     *     constraintType: 'elastic',
     *     constraintParams: { stiffness: 0.002, idealLength: 150 }
     *   });
     *   if (newEdge) console.log(`Edge ${newEdge.id} created.`);
     * }
     *
     * // Example with ports (assuming nodes 'nodeC' and 'nodeD' are RegisteredNodes with defined ports)
     * // const nodeC = spaceGraph.getNodeById('nodeC');
     * // const nodeD = spaceGraph.getNodeById('nodeD');
     * // if (nodeC && nodeD) {
     * //   spaceGraph.addEdge(nodeC, nodeD, { sourcePort: 'output1', targetPort: 'inputA' });
     * // }
     */
    addEdge(sourceNode, targetNode, data = {}) {
        if (!sourceNode || !(sourceNode instanceof BaseNode) || !this.nodes.has(sourceNode.id)) {
            console.error('addEdge: Invalid or non-existent source node.', sourceNode);
            return null;
        }
        if (!targetNode || !(targetNode instanceof BaseNode) || !this.nodes.has(targetNode.id)) {
            console.error('addEdge: Invalid or non-existent target node.', targetNode);
            return null;
        }
        if (sourceNode === targetNode) {
            console.warn('addEdge: Source and target nodes cannot be the same.');
            return null;
        }

        // Check for duplicate edges (simple check, could be enhanced for directed graphs or multi-edges if needed)
        const duplicate = [...this.edges.values()].find(
            (e) =>
                (e.source === sourceNode && e.target === targetNode) ||
                (e.source === targetNode && e.target === sourceNode) // Considers undirected duplicates
        );
        if (duplicate) {
            console.warn(`addEdge: Duplicate edge between ${sourceNode.id} and ${targetNode.id} ignored.`);
            return duplicate; // Or return null if duplicates are strictly disallowed
        }

        const edgeId = data.id ?? generateId('edge');
        const edge = new Edge(edgeId, sourceNode, targetNode, data);
        edge.spaceGraph = this; // Ensure reference back to the graph

        this.edges.set(edge.id, edge);
        if (edge.threeObject) this.scene.add(edge.threeObject); // Add visual line to WebGL scene
        this.layoutEngine?.addEdge(edge); // Add to physics layout
        this._emit('edgeAdded', { edge: edge });
        return edge;
    }

    /**
     * Removes an edge from the graph by its ID.
     * If the edge is currently selected, it will be deselected.
     * The edge's `dispose` method is called to clean up its resources.
     * Emits an `edgeRemoved` event upon successful removal.
     *
     * @param {string} edgeId - The ID of the edge to remove.
     * @returns {boolean} True if the edge was found and removed, false otherwise.
     * @fires SpaceGraph#edgeRemoved
     * @example
     * const edgeToRemove = spaceGraph.getEdgeById('my-edge-1');
     * if (edgeToRemove) {
     *   spaceGraph.removeEdge(edgeToRemove.id);
     * }
     */
    removeEdge(edgeId) {
        const edgeToRemove = this.edges.get(edgeId);
        if (!edgeToRemove) {
            console.warn(`Edge with ID "${edgeId}" not found for removal.`);
            return false;
        }

        if (this.selectedEdge === edgeToRemove) this.setSelectedEdge(null); // Deselect if it was selected

        edgeToRemove.dispose(); // Call edge's internal cleanup (removes from scene, disposes geometry/material)
        this.edges.delete(edgeId);
        this.layoutEngine?.removeEdge(edgeToRemove); // Remove from physics layout

        this._emit('edgeRemoved', { edgeId: edgeId, edge: edgeToRemove });
        return true;
    }

    /**
     * Retrieves a node by its ID.
     * @param {string} id - The ID of the node.
     * @returns {BaseNode | undefined} The node instance, or undefined if not found.
     */
    getNodeById = (id) => this.nodes.get(id);
    /**
     * Retrieves an edge by its ID.
     * @param {string} id - The ID of the edge.
     * @returns {Edge | undefined} The edge instance, or undefined if not found.
     */
    getEdgeById = (id) => this.edges.get(id);

    /**
     * Updates specific data properties of a node and invokes its `onDataUpdate` lifecycle method.
     * This is the primary way to send data to a node's input ports or trigger reactive updates.
     * If a node's `emit` method (with `propagateViaPorts=true`) is called for an output port,
     * and that port is connected by an edge to an input port of another node, this `updateNodeData`
     * method is called implicitly on the target node by the SpaceGraph system.
     *
     * @param {string} nodeId - The ID of the node to update.
     * @param {object} newData - An object containing the data properties to update. For example,
     *                           if updating an input port named `data_in`, `newData` would be `{ data_in: 'new value' }`.
     * @returns {BaseNode | null} The updated node instance, or `null` if the node is not found.
     * @see RegisteredNode#onDataUpdate
     * @see RegisteredNode#emit
     * @example
     * // Assuming 'nodeX' has an input port 'config' defined in its TypeDefinition or class.
     * spaceGraph.updateNodeData('nodeX', { config: { color: 'red', size: 20 } });
     * // This will trigger nodeX.onDataUpdate(nodeXInstance, { config: { color: 'red', size: 20 } });
     * // (after nodeXInstance.data.config is updated).
     */
    updateNodeData(nodeId, newData) {
        const nodeToUpdate = this.getNodeById(nodeId);
        if (!nodeToUpdate) {
            console.warn(`updateNodeData: Node with ID "${nodeId}" not found.`);
            return null;
        }

        // Merge new data into the node's existing data
        // Note: This performs a shallow merge. For deep merge, a utility would be needed.
        Object.assign(nodeToUpdate.data, newData);

        // Trigger the node's onDataUpdate lifecycle method, if it exists
        // This can be defined in its TypeDefinition or as a class method (e.g., for HtmlAppNode derivatives)
        if (nodeToUpdate.typeDefinition?.onDataUpdate) {
            nodeToUpdate.typeDefinition.onDataUpdate(nodeToUpdate, newData, this);
        } else if (typeof nodeToUpdate.onDataUpdate === 'function') {
            // This covers classes extending RegisteredNode/HtmlAppNode that define onDataUpdate as a method
            nodeToUpdate.onDataUpdate(newData); // Pass only newData as per typical class method signature
        }

        // If the node has a specific update method related to data (e.g. a render method)
        // it might need to be called here, or onDataUpdate should handle it.
        // For general visual updates, SpaceGraph's main animation loop calls node.update().

        return nodeToUpdate;
    }

    /**
     * @private
     * Internal method called each frame by `_animate`. It iterates through all nodes and edges,
     * calling their respective `update` methods. This allows nodes and edges to update their
     * visual appearance (e.g., billboarding for HTML nodes, edge line updates).
     * It also triggers an update for the edge menu position if visible.
     * @private
     */
    _updateNodesAndEdges() {
        this.nodes.forEach((node) => node.update(this)); // `this` (SpaceGraph instance) is passed for context
        this.edges.forEach((edge) => edge.update(this)); // `this` (SpaceGraph instance) is passed for context
        this.uiManager?.edgeMenuManager?.update();
    }

    /**
     * Internal method called each frame by `_animate`. It renders both the WebGL scene
     * (containing {@link ShapeNode}s, {@link Edge} lines, etc.) and the CSS3D scene
     * (containing {@link HtmlNodeElement}s, labels, etc.) using their respective renderers
     * and the main camera.
     * @private
     */
    _render() {
        this.webglRenderer.render(this.scene, this._camera);
        this.cssRenderer.render(this.cssScene, this._camera);
    }

    /**
     * The main animation loop, managed by `requestAnimationFrame`.
     * On each frame, it calls `_updateNodesAndEdges` to update the state and appearance of graph elements,
     * and then calls `_render` to draw the scenes.
     * This method is started by the constructor and runs continuously.
     * @private
     */
    _animate() {
        this._updateNodesAndEdges();
        this._render();
        requestAnimationFrame(this._animate.bind(this)); // Bind `this` to ensure correct context in the next frame
    }

    /**
     * Handles window resize events. It updates the camera's aspect ratio
     * and resizes both the WebGL and CSS3D renderers to fit the new window dimensions.
     * This method is bound as an event listener to the `window`'s 'resize' event.
     * @private
     */
    _onWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix(); // Must be called after changing camera properties like aspect.
        this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
        this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Centers the camera view. If a `targetPosition` is provided, it centers on that point.
     * Otherwise, it calculates the average position of all nodes in the graph and centers on that.
     * If no nodes exist and no target is provided, it centers on the world origin (0,0,0).
     * The camera zooms out to a default distance suitable for viewing multiple nodes.
     *
     * @param {THREE.Vector3 | null} [targetPosition=null] - Optional specific {@link THREE.Vector3} to center on.
     *                                                       If `null`, the average position of all nodes is used.
     * @param {number} [duration=0.7] - Duration of the centering animation in seconds.
     * @see CameraController#moveTo
     * @example
     * // Center on the average position of all nodes
     * spaceGraph.centerView();
     *
     * // Center on a specific point (e.g., world origin)
     * spaceGraph.centerView(new THREE.Vector3(0, 0, 0));
     */
    centerView(targetPosition = null, duration = 0.7) {
        let targetFocusPoint;
        if (targetPosition instanceof THREE.Vector3) {
            targetFocusPoint = targetPosition.clone();
        } else if (this.nodes.size > 0) {
            targetFocusPoint = new THREE.Vector3();
            this.nodes.forEach((node) => targetFocusPoint.add(node.position));
            targetFocusPoint.divideScalar(this.nodes.size);
        } else {
            targetFocusPoint = new THREE.Vector3(0, 0, 0); // Default to origin if no nodes and no target
        }
        // Determine a suitable camera distance based on whether it's a general view or focusing on a specific point
        const cameraDistance = this.nodes.size > 1 || !targetPosition ? 700 : 400;
        this.cameraController.moveTo(
            targetFocusPoint.x,
            targetFocusPoint.y,
            targetFocusPoint.z + cameraDistance,
            duration,
            targetFocusPoint
        );
    }

    /**
     * Focuses the camera on a specific node, adjusting the zoom level to fit the node comfortably in view.
     * The camera will look directly at the node's position.
     *
     * @param {BaseNode} node - The {@link BaseNode} instance to focus on. Must be a valid node in the graph.
     * @param {number} [duration=0.6] - Duration of the focusing animation in seconds.
     * @param {boolean} [pushHistory=false] - If `true`, the current camera state is pushed onto the
     *                                        {@link CameraController}'s view history before moving, allowing for "back" navigation.
     * @see CameraController#moveTo
     * @see BaseNode#getBoundingSphereRadius
     * @example
     * const myNode = spaceGraph.getNodeById('node-1');
     * if (myNode) {
     *   spaceGraph.focusOnNode(myNode, 0.5, true); // Focus with 0.5s animation, save current view to history
     * }
     */
    focusOnNode(node, duration = 0.6, pushHistory = false) {
        if (!node || !(node instanceof BaseNode) || !this.cameraController || !this._camera) {
            console.warn('focusOnNode: Invalid node or camera controller.', node);
            return;
        }
        const targetFocusPoint = node.position.clone();

        const fovRadians = this._camera.fov * DEG2RAD;
        // Determine node size for appropriate zoom level
        let nodeVisualSize = 100; // Default visual size if specific metrics are unavailable
        if (typeof node.getBoundingSphereRadius === 'function') {
            nodeVisualSize = node.getBoundingSphereRadius() * 2; // Use diameter from bounding sphere
        } else if (node.size && typeof node.size.width === 'number' && typeof node.size.height === 'number') {
            // For HtmlNodeElement-like nodes
            // Consider aspect ratio for HTML nodes; use larger dimension relative to FoV
            nodeVisualSize = Math.max(node.size.width / this._camera.aspect, node.size.height) * 1.2; // Add padding
        }
        // Calculate camera distance to fit the node in view based on its size and camera FOV
        const cameraDistance = nodeVisualSize / (2 * Math.tan(fovRadians / 2)) + 50; // Add some padding distance

        if (pushHistory) this.cameraController.pushState();
        this.cameraController.moveTo(
            targetFocusPoint.x,
            targetFocusPoint.y,
            targetFocusPoint.z + cameraDistance,
            duration,
            targetFocusPoint
        );
    }

    /**
     * Implements an "auto-zoom" or "smart focus" behavior.
     * If the provided `node` is already the currently focused target (tracked by {@link CameraController#currentTargetNodeId}),
     * the camera will "zoom out" by popping the previous state from the {@link CameraController}'s view history.
     * Otherwise, it will focus on the given `node`, pushing the current camera state to history first.
     * This allows for a toggle-like focus/defocus interaction.
     *
     * @param {BaseNode} node - The {@link BaseNode} to apply auto-zoom logic to.
     * @see CameraController#pushState
     * @see CameraController#popState
     * @see CameraController#setCurrentTargetNodeId
     * @see SpaceGraph#focusOnNode
     * @example
     * // Assuming 'nodeToFocus' is a valid BaseNode instance
     * // First click (or call): focuses on 'nodeToFocus'
     * spaceGraph.autoZoom(nodeToFocus);
     * // Second click (or call) on the same 'nodeToFocus': zooms out to previous view
     * spaceGraph.autoZoom(nodeToFocus);
     */
    autoZoom(node) {
        if (!node || !(node instanceof BaseNode) || !this.cameraController) {
            console.warn('autoZoom: Invalid node or camera controller.', node);
            return;
        }
        const currentTargetNodeId = this.cameraController.getCurrentTargetNodeId();
        if (currentTargetNodeId === node.id) {
            this.cameraController.popState();
        } else {
            this.cameraController.pushState();
            this.cameraController.setCurrentTargetNodeId(node.id);
            this.focusOnNode(node, 0.6, false); // focusOnNode will handle moveTo
        }
    }

    /**
     * Converts screen coordinates (e.g., from a mouse click) to world coordinates.
     * The conversion projects the screen point onto a virtual plane in 3D space.
     * This plane is defined by being normal to the Z-axis (i.e., parallel to the XY plane)
     * and positioned at the specified `targetZ` depth in world space.
     *
     * @param {number} screenX - The X-coordinate on the screen (typically `event.clientX`).
     * @param {number} screenY - The Y-coordinate on the screen (typically `event.clientY`).
     * @param {number} [targetZ=0] - The Z-depth in world space of the target plane onto which the screen coordinates will be projected.
     *                                 This determines the Z-value of the resulting world coordinate.
     * @returns {THREE.Vector3 | null} A {@link THREE.Vector3} representing the world coordinates.
     *                                 Returns `null` if the projection fails (which is rare with a simple plane).
     * @example
     * container.addEventListener('click', (event) => {
     *   const worldCoords = spaceGraph.screenToWorld(event.clientX, event.clientY, 0);
     *   if (worldCoords) {
     *     console.log(`Clicked at world position: X=${worldCoords.x}, Y=${worldCoords.y}, Z=${worldCoords.z}`);
     *     // Could use this to place a new node, for example:
     *     // spaceGraph.addNode({ type: 'note', x: worldCoords.x, y: worldCoords.y, z: worldCoords.z, content: 'Clicked here!' });
     *   }
     * });
     */
    screenToWorld(screenX, screenY, targetZ = 0) {
        // Normalize screen coordinates to range [-1, 1]
        const normalizedScreenPos = new THREE.Vector3(
            (screenX / window.innerWidth) * 2 - 1,
            -(screenY / window.innerHeight) * 2 + 1,
            0.5 // NDC Z value for points on the near plane (0.0) or mid-way (0.5) for ray direction
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(normalizedScreenPos, this._camera);

        // Define a plane at the targetZ depth, parallel to XY plane (normal along Z-axis)
        const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -targetZ);
        const intersectionPoint = new THREE.Vector3();

        // Find intersection of the ray with the plane
        return raycaster.ray.intersectPlane(targetPlane, intersectionPoint) ? intersectionPoint : null;
    }

    /**
     * Sets the currently selected node. This involves:
     * 1. Deselecting any previously selected node or edge by updating their visual styles.
     * 2. Updating the visual style of the new `node` to indicate selection.
     * 3. Storing the `node` in the `this.selectedNode` property.
     * 4. Emitting a `nodeSelected` event with the new and previously selected nodes.
     *
     * The actual styling changes are typically delegated to the node's `setSelectedStyle` method
     * (see {@link BaseNode#setSelectedStyle}, {@link HtmlNodeElement#setSelectedStyle}, etc.).
     *
     * @param {BaseNode | null} node - The {@link BaseNode} instance to select.
     *                                 Provide `null` to deselect the currently selected node.
     * @fires SpaceGraph#nodeSelected
     * @see BaseNode#setSelectedStyle
     * @example
     * const myNode = spaceGraph.getNodeById('node-abc');
     * if (myNode) {
     *   spaceGraph.setSelectedNode(myNode); // Selects 'node-abc'
     * }
     * // ... later, to deselect
     * spaceGraph.setSelectedNode(null);
     */
    setSelectedNode(node) {
        if (this.selectedNode === node) return; // No change if already selected or deselecting null

        const previouslySelectedNode = this.selectedNode;

        // Deselect previously selected node
        if (this.selectedNode) {
            this.selectedNode.setSelectedStyle(false);
            // Note: The 'selected' class toggle is now primarily handled within BaseNode's setSelectedStyle,
            // which might be overridden by specific node types.
            // However, if a generic class was being applied directly here, it should be reviewed.
            // For now, assume setSelectedStyle(false) handles all necessary visual deselection.
        }

        this.selectedNode = node;

        // Select new node
        if (this.selectedNode) {
            this.selectedNode.setSelectedStyle(true);
            // Similar to deselection, assume setSelectedStyle(true) handles all visual selection.
            if (this.selectedEdge) this.setSelectedEdge(null); // Deselect any currently selected edge
        }
        this._emit('nodeSelected', { selectedNode: this.selectedNode, previouslySelectedNode: previouslySelectedNode });
    }

    /**
     * Sets the currently selected edge. This involves:
     * 1. Deselecting any previously selected edge or node by updating their visual styles.
     * 2. Updating the visual style of the new `edge` to indicate selection (typically via {@link Edge#setHighlight}).
     * 3. Storing the `edge` in the `this.selectedEdge` property.
     * 4. Triggering the {@link UIManager} to show or hide an edge-specific menu.
     * 5. Emitting an `edgeSelected` event with the new and previously selected edges.
     *
     * @param {Edge | null} edge - The {@link Edge} instance to select.
     *                             Provide `null` to deselect the currently selected edge.
     * @fires SpaceGraph#edgeSelected
     * @see Edge#setHighlight
     * @see UIManager#showEdgeMenu
     * @see UIManager#hideEdgeMenu
     * @example
     * const myEdge = spaceGraph.getEdgeById('edge-123');
     * if (myEdge) {
     *   spaceGraph.setSelectedEdge(myEdge); // Selects 'edge-123' and may show its context menu
     * }
     * // ... later, to deselect
     * spaceGraph.setSelectedEdge(null);
     */
    setSelectedEdge(edge) {
        if (this.selectedEdge === edge) return; // No change

        const previouslySelectedEdge = this.selectedEdge;

        // Deselect previously selected edge
        if (this.selectedEdge) {
            this.selectedEdge.setHighlight(false);
            this.uiManager?.hideEdgeMenu();
        }

        this.selectedEdge = edge;

        // Select new edge
        if (this.selectedEdge) {
            this.selectedEdge.setHighlight(true);
            if (this.selectedNode) this.setSelectedNode(null); // Deselect any currently selected node
            this.uiManager?.showEdgeMenu(this.selectedEdge);
        }
        this._emit('edgeSelected', { selectedEdge: this.selectedEdge, previouslySelectedEdge: previouslySelectedEdge });
    }

    /**
     * Finds the topmost interactable graph object (node or edge) at given screen coordinates.
     * This method uses raycasting to determine which object is under the cursor.
     * It prioritizes node meshes first, then edges.
     *
     * @param {number} screenX - X-coordinate on the screen (e.g., `event.clientX`).
     * @param {number} screenY - Y-coordinate on the screen (e.g., `event.clientY`).
     * @returns {BaseNode | Edge | null} The intersected {@link BaseNode} or {@link Edge} instance,
     *                                   or `null` if no interactable object is found at the given coordinates.
     * @example
     * container.addEventListener('mousemove', (event) => {
     *   const object = spaceGraph.intersectedObject(event.clientX, event.clientY);
     *   if (object instanceof BaseNode) {
     *     console.log('Hovering over node:', object.id);
     *   } else if (object instanceof Edge) {
     *     console.log('Hovering over edge:', object.id);
     *   }
     * });
     */
    intersectedObject(screenX, screenY) {
        const vec = new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, this._camera);
        raycaster.params.Line.threshold = this.config.rendering.lineIntersectionThreshold;

        // Check for node meshes first (typically more specific interaction)
        const nodeMeshes = [...this.nodes.values()].map((n) => n.mesh).filter(Boolean);
        if (nodeMeshes.length > 0) {
            const intersects = raycaster.intersectObjects(nodeMeshes);
            if (intersects.length > 0) {
                const intersectedMesh = intersects[0].object;
                // Find the node instance corresponding to this mesh
                return [...this.nodes.values()].find((n) => n.mesh === intersectedMesh);
            }
        }

        // Then check for edges
        const edgeObjects = [...this.edges.values()].map((e) => e.threeObject).filter(Boolean);
        if (edgeObjects.length > 0) {
            const intersects = raycaster.intersectObjects(edgeObjects);
            if (intersects.length > 0) {
                const intersectedLine = intersects[0].object;
                // Find the edge instance corresponding to this line
                return [...this.edges.values()].find((edge) => edge.threeObject === intersectedLine);
            }
        }
        return null; // No intersection
    }

    /**
     * Cleans up all resources used by the SpaceGraph instance.
     * This includes stopping the layout engine, disposing of all nodes and edges,
     * disposing of Three.js renderers and scenes, and removing event listeners.
     * Call this method when the SpaceGraph instance is no longer needed to prevent memory leaks.
     *
     * @example
     * // Sometime later, when cleaning up:
     * spaceGraph.dispose();
     * spaceGraph = null; // Allow garbage collection
     */
    dispose() {
        console.log(`Disposing SpaceGraph instance...`);
        // Stop ongoing processes
        this.cameraController?.dispose();
        this.layoutEngine?.stop(); // Stop simulation first
        this.layoutEngine?.dispose();

        // Dispose all nodes and edges
        // Iterate over copies as dispose() might modify the collections indirectly
        [...this.nodes.values()].forEach((node) => node.dispose());
        [...this.edges.values()].forEach((edge) => edge.dispose());
        this.nodes.clear();
        this.edges.clear();

        if (this.nodeTypes) this.nodeTypes.clear(); // Clear registered node types
        if (this._events) this._events.clear(); // Clear all event listeners

        // Clear Three.js scenes
        this.scene?.clear(); // Removes all objects from the scene
        this.cssScene?.clear();

        // Dispose renderers and their DOM elements
        this.webglRenderer?.dispose(); // Releases WebGL context
        if (this.webglCanvas) this.webglCanvas.remove();

        if (this.cssRenderer?.domElement) this.cssRenderer.domElement.remove();
        if (this.css3dContainer) this.css3dContainer.remove();

        // Remove event listeners attached by SpaceGraph itself
        window.removeEventListener('resize', this._onWindowResize.bind(this)); // Ensure correct bound function removal

        // Dispose UIManager (which handles its own event listeners)
        this.uiManager?.dispose();

        // Nullify properties to help garbage collection
        this.container = null;
        this.scene = null;
        this.cssScene = null;
        this.webglRenderer = null;
        this.cssRenderer = null;
        this.webglCanvas = null;
        this.css3dContainer = null;
        this._camera = null;
        this.cameraController = null;
        this.layoutEngine = null;
        this.uiManager = null;
        this.selectedNode = null;
        this.selectedEdge = null;
        this.linkSourceNode = null;
        this.tempLinkLine = null;
        this._events = null;

        console.log('SpaceGraph disposed successfully.');
    }

    /**
     * Returns the default configuration options for SpaceGraph.
     * Users can override these by passing a config object to the constructor.
     * @returns {SpaceGraphConfig} The default configuration object. See {@link SpaceGraphConfig} for details on the structure.
     * @protected
     */
    getDefaultConfig() {
        return {
            rendering: {
                defaultBackgroundColor: 0x000000,
                defaultBackgroundAlpha: 0.0,
                lineIntersectionThreshold: 5,
            },
            camera: {
                initialPositionZ: 700,
                fov: 70,
                zoomSpeed: 0.0015,
                panSpeed: 0.8,
                dampingFactor: 0.12,
            },
            defaults: {
                node: {
                    html: {
                        width: 160,
                        height: 70,
                        billboard: true,
                        contentScale: 1.0,
                        backgroundColor: 'var(--node-bg-default)',
                    },
                    shape: {
                        shape: 'sphere',
                        size: 50,
                        color: 0xffffff,
                    },
                },
                edge: {
                    color: 0x00d0ff,
                    thickness: 1.5,
                    opacity: 0.6,
                },
            },
        };
    }

    // --- Event Emitter System ---

    /**
     * Registers an event handler for the given event name.
     * @param {string} eventName - The name of the event to listen for. Available events include:
     *                             'nodeAdded', 'nodeRemoved', 'edgeAdded', 'edgeRemoved',
     *                             'nodeSelected', 'edgeSelected'.
     * @param {Function} callback - The function to call when the event is emitted.
     *                              This function will receive an event-specific data object as its argument.
     *                              - `nodeAdded`: `{ node: BaseNode }`
     *                              - `nodeRemoved`: `{ nodeId: string, node: BaseNode }`
     *                              - `edgeAdded`: `{ edge: Edge }`
     *                              - `edgeRemoved`: `{ edgeId: string, edge: Edge }`
     *                              - `nodeSelected`: `{ selectedNode: BaseNode | null, previouslySelectedNode: BaseNode | null }`
     *                              - `edgeSelected`: `{ selectedEdge: Edge | null, previouslySelectedEdge: Edge | null }`
     * @example
     * spaceGraph.on('nodeAdded', (eventData) => {
     *   console.log('Node added:', eventData.node.id, eventData.node);
     * });
     * spaceGraph.on('nodeSelected', (eventData) => {
     *   if (eventData.selectedNode) {
     *     console.log('Node selected:', eventData.selectedNode.id);
     *   } else {
     *     console.log('Node deselected. Previously selected:', eventData.previouslySelectedNode?.id);
     *   }
     * });
     */
    on(eventName, callback) {
        if (typeof callback !== 'function') {
            console.error(`Cannot register event "${eventName}": callback is not a function.`);
            return;
        }
        if (!this._events.has(eventName)) {
            this._events.set(eventName, new Set());
        }
        this._events.get(eventName).add(callback);
    }

    /**
     * Removes a previously registered event handler for a specific event.
     * For the removal to be successful, the `callback` function must be the exact same instance
     * that was originally passed to {@link SpaceGraph#on}.
     *
     * @param {string} eventName - The name of the event to stop listening for (e.g., 'nodeAdded').
     * @param {Function} callback - The callback function instance to remove from the listeners for this event.
     * @example
     * const onNodeAdd = (data) => console.log('Node added:', data.node.id);
     * spaceGraph.on('nodeAdded', onNodeAdd);
     * // ...later
     * spaceGraph.off('nodeAdded', onNodeAdd);
     */
    off(eventName, callback) {
        if (this._events.has(eventName)) {
            const listeners = this._events.get(eventName);
            listeners.delete(callback);
            if (listeners.size === 0) {
                this._events.delete(eventName);
            }
        }
    }

    /**
     * Emits an event with the given name and data, calling all registered listener callbacks for that event.
     * This method is primarily intended for internal use by the SpaceGraph system to fire its standard events
     * (like `nodeAdded`, `edgeSelected`, etc.). However, it can also be used to emit custom, application-specific events
     * if the SpaceGraph instance is extended or used as a central event bus.
     *
     * @param {string} eventName - The name of the event to emit (e.g., 'nodeAdded', 'customAppEvent').
     * @param {object} [data={}] - The data object to pass as an argument to each event listener's callback function.
     * @protectedremarks This method is marked as protected because direct emission of internal events by external code
     *                 could lead to inconsistent state if not handled carefully. For custom events, consider prefixing
     *                 event names to avoid clashes with internal SpaceGraph events.
     * @example
     * // Internal example (how SpaceGraph might fire an event):
     * // this._emit('nodeAdded', { node: newNodeInstance });
     * //
     * // Custom event example:
     * // spaceGraph._emit('customApplicationEvent', { detail: 'something happened' });
     */
    _emit(eventName, data = {}) {
        if (this._events.has(eventName)) {
            // Iterate over a copy in case a callback modifies the listeners Set (e.g., calls off())
            [...this._events.get(eventName)].forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for "${eventName}":`, error);
                }
            });
        }
    }
}

export { HtmlAppNode };

/**
 * @class BaseNode
 * @classdesc Abstract base class for all node types within a {@link SpaceGraph}.
 * It defines the common interface and core functionalities inherited by all specialized node classes,
 * such as managing position, data, unique identification, and basic lifecycle methods (update, dispose).
 *
 * `BaseNode` instances are typically not created directly. Instead, subclasses like
 * {@link HtmlNodeElement}, {@link ShapeNode}, or {@link RegisteredNode} are instantiated.
 *
 * @property {string} id - Unique identifier for the node. Automatically generated (e.g., `node-timestamp-random`)
 *                         if not provided in the constructor data.
 * @property {SpaceGraph | null} spaceGraph - Reference to the parent {@link SpaceGraph} instance.
 *                                          This is set when the node is added to the graph via {@link SpaceGraph#addNode}.
 * @property {THREE.Vector3} position - The current 3D position of the node in world space.
 *                                      Managed by the {@link ForceLayout} engine or direct manipulation.
 * @property {object} data - An object containing arbitrary data associated with the node.
 *                           The structure of this data often includes properties like `label`, `type`,
 *                           and other attributes specific to the node's type or application requirements (e.g., `content` for notes, `shape` for shapes).
 *                           This is typically initialized from {@link NodeDataObject} upon creation.
 * @property {number} mass - Mass of the node, used by the {@link ForceLayout} engine for physics simulations.
 *                           Must be a positive value. Default is `1.0`.
 * @property {THREE.Mesh | null} mesh - Optional Three.js {@link THREE.Mesh} for WebGL-rendered visual representation of the node.
 *                                      Primarily used by {@link ShapeNode} and custom {@link RegisteredNode}s that create WebGL visuals.
 * @property {CSS3DObject | null} cssObject - Optional Three.js {@link CSS3DObject} used for rendering an `htmlElement`
 *                                           as part of the 3D scene. Utilized by {@link HtmlNodeElement} and {@link RegisteredNode}s with HTML content.
 * @property {HTMLElement | null} htmlElement - Optional underlying {@link HTMLElement} associated with `cssObject`.
 *                                            This is the actual DOM element that gets rendered in 3D space.
 * @property {CSS3DObject | null} labelObject - Optional {@link CSS3DObject} for rendering a text label associated with the node,
 *                                             typically used by {@link ShapeNode}s or custom nodes requiring separate 3D labels.
 */
export class BaseNode {
    /** @type {string} */
    id = null;
    /** @type {SpaceGraph | null} */
    spaceGraph = null;
    /** @type {THREE.Vector3} */
    position = new THREE.Vector3();
    /** @type {object} */
    data = {};
    /** @type {number} */
    mass = 1.0;
    /** @type {THREE.Mesh | null} */
    mesh = null;
    /** @type {CSS3DObject | null} */
    cssObject = null;
    /** @type {HTMLElement | null} */
    htmlElement = null;
    /** @type {CSS3DObject | null} */
    labelObject = null;

    /**
     * Constructs a BaseNode instance.
     * As `BaseNode` is an abstract class, this constructor is typically called via `super()` from a subclass constructor.
     * It initializes the node's ID, position, data (merging with defaults), and mass.
     *
     * @constructor
     * @param {string | null} id - Unique ID for the node. If `null` or `undefined`, a new ID will be generated by {@link generateId}.
     * @param {{x: number, y: number, z: number}} [position={x:0,y:0,z:0}] - Initial 3D position of the node in world space.
     * @param {object} [data={}] - Initial data for the node. This will be merged with default data provided by the node type's `getDefaultData()` method.
     *                             See {@link NodeDataObject} for common properties.
     * @param {number} [mass=1.0] - Mass of the node for physics calculations by {@link ForceLayout}. Must be positive (clamped to a minimum of 0.1).
     * @example
     * // Called from a subclass constructor:
     * // super(id, position, { ...myData, ...data }, mass);
     */
    constructor(id, position = { x: 0, y: 0, z: 0 }, data = {}, mass = 1.0) {
        this.id = id ?? generateId('node');
        this.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0); // Ensure x,y,z defaults if not in position object
        this.data = { ...this.getDefaultData(), ...data }; // Merge provided data with defaults
        this.mass = Math.max(0.1, mass); // Ensure mass is positive and non-zero
    }

    /**
     * Provides default data for a node. Subclasses should override this method
     * to define their specific default properties (e.g., type-specific attributes like `content`, `shape`, `size`).
     * The object returned by this method is merged with the `data` provided in the constructor,
     * with the constructor's data taking precedence.
     *
     * @returns {object} An object containing default data properties.
     *                   The base implementation returns an object with a `label` property set to the node's `id`.
     * @protected
     * @example
     * // In a subclass like ShapeNode:
     * getDefaultData() {
     *   return {
     *     ...super.getDefaultData(), // Includes label: this.id
     *     type: 'shape',
     *     shape: 'sphere',
     *     size: 50,
     *     color: 0xffffff
     *   };
     * }
     */
    getDefaultData() {
        return { label: this.id };
    }

    /**
     * Sets the 3D position of the node in world space.
     * Subclasses are expected to override this method to also update the positions
     * of their specific visual components (e.g., `this.mesh.position`, `this.cssObject.position`).
     * The base method only updates `this.position`.
     *
     * @param {number} x - The new x-coordinate in world space.
     * @param {number} y - The new y-coordinate in world space.
     * @param {number} z - The new z-coordinate in world space.
     * @example
     * myNode.setPosition(100, 50, -20);
     */
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        // Subclasses should update their visual objects here, e.g.:
        // if (this.mesh) this.mesh.position.copy(this.position);
        // if (this.cssObject) this.cssObject.position.copy(this.position);
    }

    /**
     * Abstract method intended to be called by {@link SpaceGraph#_animate} (the main animation loop) via {@link SpaceGraph#_updateNodesAndEdges}.
     * Subclasses must implement this method to update their state, position, orientation,
     * or any other dynamic aspects of the node (e.g., making an HTML node face the camera if billboarded).
     *
     * @param {SpaceGraph} spaceGraphInstance - Reference to the parent {@link SpaceGraph} instance,
     *                                          providing access to global graph properties like the camera ({@link SpaceGraph#_camera}).
     * @abstract
     * @example
     * // In a subclass like HtmlNodeElement:
     * update(spaceGraphInstance) {
     *   if (this.cssObject) {
     *     this.cssObject.position.copy(this.position); // Update CSS3DObject position
     *     if (this.billboard && spaceGraphInstance?._camera) { // If billboard is true
     *       this.cssObject.quaternion.copy(spaceGraphInstance._camera.quaternion); // Face the camera
     *     }
     *   }
     * }
     */
    update(spaceGraphInstance) {
        // Base implementation does nothing.
        // Subclasses override this to update visuals, e.g.:
        // if (this.cssObject && this.billboard) {
        //   this.cssObject.quaternion.copy(spaceGraphInstance._camera.quaternion);
        // }
        // if (this.mesh) this.mesh.position.copy(this.position);
    }

    /**
     * Cleans up resources used by the node. This is crucial for preventing memory leaks when nodes are removed
     * from the graph via {@link SpaceGraph#removeNode}.
     * Subclasses **must** override this method to dispose of their specific Three.js objects
     * (geometries, materials, textures), remove any DOM elements they created, and detach event listeners.
     *
     * The base implementation handles disposal of `this.mesh` (and its geometry/material),
     * `this.cssObject` (and its element), and `this.labelObject` (and its element).
     * It also clears the reference to `this.spaceGraph`.
     *
     * @example
     * // In a subclass with custom resources:
     * dispose() {
     *   // Dispose custom Three.js objects
     *   this.myCustomMesh?.geometry?.dispose();
     *   this.myCustomMesh?.material?.dispose();
     *   this.myCustomMesh?.parent?.remove(this.myCustomMesh);
     *   // Remove custom DOM elements
     *   this.myCustomDiv?.remove();
     *   // Remove custom event listeners
     *   window.removeEventListener('mousemove', this.myMouseMoveListener);
     *
     *   super.dispose(); // **Important**: Call super.dispose() to clean up common resources
     * }
     */
    dispose() {
        // Dispose WebGL mesh resources
        if (this.mesh) {
            this.mesh.parent?.remove(this.mesh); // Remove from scene graph
            this.mesh.geometry?.dispose();
            // Material disposal: check if material is an array (multi-material) or single
            if (Array.isArray(this.mesh.material)) {
                this.mesh.material.forEach((m) => m.dispose());
            } else if (this.mesh.material) {
                this.mesh.material.dispose();
            }
            this.mesh = null;
        }

        // Dispose CSS3DObject and its underlying HTML element
        if (this.cssObject) {
            this.cssObject.parent?.remove(this.cssObject); // Remove from CSS3D scene
            this.cssObject.element?.remove(); // Remove the HTML element from DOM
            this.cssObject = null;
        }

        // Dispose label object and its underlying HTML element
        if (this.labelObject) {
            this.labelObject.parent?.remove(this.labelObject);
            this.labelObject.element?.remove();
            this.labelObject = null;
        }

        // If htmlElement is managed independently and is not cssObject.element (rare for current subclasses)
        // It should be handled here. However, for current known subclasses, cssObject.element is the htmlElement.
        // If this.htmlElement might be different from this.cssObject.element, uncomment and test:
        // if (this.htmlElement && this.htmlElement !== this.cssObject?.element && this.htmlElement !== this.labelObject?.element) {
        //    this.htmlElement.remove();
        // }
        this.htmlElement = null; // Cleared as it's typically linked to cssObject.element

        this.spaceGraph = null; // Break reference to parent graph to aid garbage collection
        // console.log(`BaseNode ${this.id} disposed resources.`);
    }

    /**
     * Calculates and returns the radius of the node's bounding sphere in world units.
     * This is used by the {@link ForceLayout} engine for collision detection and by the
     * {@link CameraController} (via {@link SpaceGraph#focusOnNode}) for appropriate zooming.
     * Subclasses should override this to provide an accurate radius based on their specific visual representation (mesh size, HTML element dimensions).
     *
     * @returns {number} The radius of the node's bounding sphere.
     *                   Base implementation returns a small default value (`10`).
     */
    getBoundingSphereRadius() {
        return 10;
    } // Default placeholder, subclasses must override for accurate behavior.

    /**
     * Applies or removes a visual style indicating selection.
     * This method is called by {@link SpaceGraph#setSelectedNode}.
     * Subclasses should implement the specific styling changes (e.g., changing color, adding a border or class).
     *
     * @param {boolean} selected - `true` if the node is being selected, `false` if it's being deselected.
     * @example
     * // In an HtmlNodeElement subclass:
     * setSelectedStyle(selected) {
     *   this.htmlElement?.classList.toggle('selected', selected);
     * }
     * // In a ShapeNode subclass:
     * setSelectedStyle(selected) {
     *   if (this.mesh?.material?.emissive) { // Check if material supports emissive color
     *     this.mesh.material.emissive.setHex(selected ? 0x888800 : 0x000000); // Yellowish tint when selected
     *   }
     * }
     */
    setSelectedStyle(selected) {
        /* Base implementation does nothing. Subclasses should override. */
    }

    /**
     * Called by {@link UIManager} when a drag operation starts on this node.
     * The base implementation adds a 'dragging' CSS class to `this.htmlElement` (if it exists)
     * and fixes the node in the {@link ForceLayout} engine to prevent it from being affected by physics during the drag.
     * Subclasses can override for custom drag start behavior, but should typically call `super.startDrag()`.
     */
    startDrag() {
        this.htmlElement?.classList.add('dragging');
        this.spaceGraph?.layoutEngine?.fixNode(this);
    }

    /**
     * Called by {@link UIManager} during a drag operation to update the node's position.
     * The base implementation calls `this.setPosition()` with the new coordinates.
     * Subclasses usually don't need to override this unless they have very specific drag update logic
     * beyond simple position setting.
     *
     * @param {THREE.Vector3} newPosition - The new target position for the node in world space,
     *                                      typically derived from mouse/pointer coordinates.
     */
    drag(newPosition) {
        this.setPosition(newPosition.x, newPosition.y, newPosition.z);
    }

    /**
     * Called by {@link UIManager} when a drag operation ends on this node.
     * The base implementation removes the 'dragging' CSS class from `this.htmlElement` (if it exists),
     * releases the node in the {@link ForceLayout} engine (allowing physics to affect it again),
     * and "kicks" the layout engine to help settle the graph.
     * Subclasses can override for custom drag end behavior, but should typically call `super.endDrag()`.
     */
    endDrag() {
        this.htmlElement?.classList.remove('dragging');
        this.spaceGraph?.layoutEngine?.releaseNode(this);
        this.spaceGraph?.layoutEngine?.kick(); // Re-energize layout after user interaction
    }
}

/**
 * @class HtmlNodeElement
 * @classdesc Represents a node whose visual representation is primarily an HTML element,
 * rendered in the 3D space using Three.js {@link CSS3DObject}.
 * This class is suitable for displaying rich HTML content, text, and interactive UI elements as nodes.
 * It extends {@link BaseNode}.
 *
 * @extends BaseNode
 * @property {{width: number, height: number}} size - The dimensions (width and height in pixels) of the main HTML element.
 *                                                  Default is `{width: 160, height: 70}` or values from {@link SpaceGraphConfig}.
 * @property {boolean} billboard - If `true`, the node's HTML element will always face the camera.
 *                                If `false`, it maintains a fixed orientation in 3D space. Default is `true`.
 */
export class HtmlNodeElement extends BaseNode {
    /**
     * @type {{width: number, height: number}}
     * @description The dimensions of the HTML element.
     */
    size = { width: 160, height: 70 };
    /**
     * @type {boolean}
     * @description If true, the node always faces the camera.
     */
    billboard = true;

    /**
     * Creates an instance of HtmlNodeElement.
     * Initializes the HTML structure, CSS3DObject, and applies initial data and styling.
     *
     * @constructor
     * @param {string | null} id - Unique ID for the node. See {@link BaseNode#constructor}.
     * @param {{x: number, y: number, z: number}} [position={x:0,y:0,z:0}] - Initial position. See {@link BaseNode#constructor}.
     * @param {NodeDataObject} [data={}] - Initial data object. Properties like `width`, `height`, `content`, `editable`,
     *                                   `billboard`, `contentScale`, `backgroundColor` are commonly used.
     *                                   Defaults are taken from {@link SpaceGraphConfig} if not provided. See {@link BaseNode#constructor}.
     * @example
     * const htmlNode = new HtmlNodeElement('myHtmlNode', {x: 0, y: 50, z: 10}, {
     *   content: '<h1>Hello</h1><p>This is an HTML node.</p>',
     *   width: 200,
     *   height: 100,
     *   editable: false,
     *   billboard: true
     * });
     * spaceGraph.addNode(htmlNode);
     */
    constructor(id, position = { x: 0, y: 0, z: 0 }, data = {}) {
        // Temporarily set spaceGraph on data if passed, so super() can access it via this.getDefaultData()
        // This is a bit of a workaround for the order of operations.
        const tempData = { ...data };
        if (data.spaceGraph) {
            tempData.spaceGraphForDefault = data.spaceGraph;
        }

        super(id, position, tempData, data.mass ?? 1.0); // `tempData` here is merged with BaseNode's default by super()
        // BaseNode constructor will call getDefaultData. We need spaceGraph available for that.
        // After super() is called, this.spaceGraph is properly set up by BaseNode if spaceGraphForDefault was in tempData.
        // Or, if it wasn't, it might be null, which is fine if getDefaultData handles it.

        // Finalize properties based on defaults from SpaceGraphConfig if available, then data, then class defaults.
        // this.data is now populated by super() call which invokes this.getDefaultData().
        const htmlDefaults = this.spaceGraph?.config?.defaults?.node?.html || {};

        this.size.width = this.data.width ?? htmlDefaults.width ?? 160;
        this.size.height = this.data.height ?? htmlDefaults.height ?? 70;
        this.billboard = this.data.billboard ?? htmlDefaults.billboard ?? true;
        // Ensure this.data reflects the chosen values for contentScale and backgroundColor
        this.data.contentScale = this.data.contentScale ?? htmlDefaults.contentScale ?? 1.0;
        this.data.backgroundColor =
            this.data.backgroundColor ?? htmlDefaults.backgroundColor ?? 'var(--node-bg-default)';

        this.htmlElement = this._createHtmlElement(); // Uses this.size and this.data
        this.cssObject = new CSS3DObject(this.htmlElement);
        this.cssObject.userData = { nodeId: this.id, type: 'html-node' }; // For raycasting identification

        this.update(); // Initial position and orientation update
        this.setContentScale(this.data.contentScale); // Apply initial content scale
        this.setBackgroundColor(this.data.backgroundColor); // Apply initial background color
    }

    /**
     * Provides default data specific to HtmlNodeElement.
     * Merges with {@link BaseNode#getDefaultData} and potentially with global defaults from {@link SpaceGraphConfig}.
     * @override
     * @returns {NodeDataObject} Default data including `type`, `content`, `width`, `height`, etc.
     * @protected
     */
    getDefaultData() {
        // Access spaceGraph via this.data.spaceGraphForDefault if set, or this.spaceGraph (which might be set by BaseNode if passed early)
        const spaceGraphInstance = this.data.spaceGraphForDefault || this.spaceGraph;
        const graphHtmlDefaults = spaceGraphInstance?.config?.defaults?.node?.html || {};
        return {
            ...super.getDefaultData(), // Includes label: this.id from BaseNode
            type: 'html',
            content: '',
            width: graphHtmlDefaults.width ?? 160,
            height: graphHtmlDefaults.height ?? 70,
            contentScale: graphHtmlDefaults.contentScale ?? 1.0,
            backgroundColor: graphHtmlDefaults.backgroundColor ?? 'var(--node-bg-default)',
            billboard: graphHtmlDefaults.billboard ?? true,
            editable: false,
            // Note: `label` (from super.getDefaultData()) is often used as initial content if `data.content` is empty.
        };
    }

    /**
     * Creates the main HTML structure for the node, including content area and control buttons.
     * This element is then wrapped by a {@link CSS3DObject} for rendering in the 3D scene.
     * @returns {HTMLElement} The created HTML element, typically a `<div>`.
     * @private
     */
    _createHtmlElement() {
        const el = document.createElement('div');
        el.className = 'node-html';
        if (this.data.type === 'note') el.classList.add('note-node'); // Add specific class for NoteNode styling
        el.id = `node-html-${this.id}`; // Unique ID for the HTML element
        el.dataset.nodeId = this.id; // Store node ID in dataset for easy retrieval from DOM
        el.style.width = `${this.size.width}px`;
        el.style.height = `${this.size.height}px`;

        // Basic structure with content area and controls
        el.innerHTML = `
          <div class="node-inner-wrapper">
              <div class="node-content" spellcheck="false" style="transform: scale(${this.data.contentScale});">${this.data.label || this.data.content || ''}</div>
              <div class="node-controls">
                  <button class="node-quick-button node-content-zoom-in" title="Zoom In Content (+)">+</button>
                  <button class="node-quick-button node-content-zoom-out" title="Zoom Out Content (-)">-</button>
                  <button class="node-quick-button node-grow" title="Grow Node (Ctrl++)">➚</button>
                  <button class="node-quick-button node-shrink" title="Shrink Node (Ctrl+-)">➘</button>
                  <button class="node-quick-button delete-button node-delete" title="Delete Node (Del)">×</button>
              </div>
          </div>
          <div class="resize-handle" title="Resize Node"></div>
      `;
        if (this.data.editable) this._initContentEditable(el);
        return el;
    }

    /**
     * Initializes content editable features if the node is marked as editable.
     * @param {HTMLElement} element - The HTML element of the node.
     * @private
     */
    _initContentEditable(element) {
        const contentDiv = $('.node-content', element);
        if (contentDiv) {
            contentDiv.contentEditable = 'true';
            let debounceTimer;
            contentDiv.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.data.content = contentDiv.innerHTML; // Store full HTML content in node data
                    this.data.label = contentDiv.textContent || ''; // Update label from text content for tooltips/search
                    // Optionally, emit an event indicating content change
                    // this.spaceGraph?._emit('nodeContentChanged', { node: this, content: this.data.content });
                }, 300); // Debounce to avoid excessive updates
            });
            // Prevent pointer events (like dragging for graph panning) when interacting with editable content
            contentDiv.addEventListener('pointerdown', (e) => e.stopPropagation());
            contentDiv.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true }); // For touch devices
            // Allow wheel scrolling within the content div if it overflows, preventing graph zoom
            contentDiv.addEventListener(
                'wheel',
                (e) => {
                    if (
                        contentDiv.scrollHeight > contentDiv.clientHeight ||
                        contentDiv.scrollWidth > contentDiv.clientWidth
                    ) {
                        e.stopPropagation(); // Stop wheel event from propagating to graph zoom/pan
                    }
                },
                { passive: false }
            ); // `passive: false` is needed to call `stopPropagation` on wheel events
        }
    }

    /**
     * Sets the node's 3D position and updates the position of its associated {@link CSS3DObject}.
     * @override
     * @param {number} x - The new x-coordinate in world space.
     * @param {number} y - The new y-coordinate in world space.
     * @param {number} z - The new z-coordinate in world space.
     */
    setPosition(x, y, z) {
        super.setPosition(x, y, z); // Updates this.position
        if (this.cssObject) this.cssObject.position.copy(this.position); // Sync CSS3DObject's position
    }

    /**
     * Sets the size (width and height) of the node's HTML element.
     * Persists the new dimensions to `this.data.width` and `this.data.height`.
     * Notifies the {@link ForceLayout} engine to re-evaluate by calling `kick()`.
     *
     * @param {number} width - The new width in pixels. Minimum is 80.
     * @param {number} height - The new height in pixels. Minimum is 40.
     * @param {boolean} [scaleContent=false] - If `true`, attempts to scale the node's content
     *                                        (via {@link HtmlNodeElement#setContentScale}) proportionally to the size change.
     * @example
     * htmlNode.setSize(300, 150); // Resize to 300px width, 150px height
     * htmlNode.setSize(200, 100, true); // Resize and attempt to scale content
     */
    setSize(width, height, scaleContent = false) {
        const oldWidth = this.size.width;
        const oldHeight = this.size.height;
        this.size.width = Math.max(80, width); // Minimum dimensions
        this.size.height = Math.max(40, height);
        if (this.htmlElement) {
            this.htmlElement.style.width = `${this.size.width}px`;
            this.htmlElement.style.height = `${this.size.height}px`;
        }
        if (scaleContent && oldWidth > 0 && oldHeight > 0) {
            const scaleFactor = Math.sqrt((this.size.width * this.size.height) / (oldWidth * oldHeight));
            this.setContentScale(this.data.contentScale * scaleFactor);
        }
        this.data.width = this.size.width; // Persist to data
        this.data.height = this.size.height; // Persist to data
        this.spaceGraph?.layoutEngine?.kick(); // Notify layout engine of size change
    }

    /**
     * Sets the scale of the node's content area (the `.node-content` div).
     * The scale is clamped between 0.3 and 3.0. Persists the scale to `this.data.contentScale`.
     *
     * @param {number} scale - The new scale factor for the content.
     * @example
     * htmlNode.setContentScale(1.5); // Make content 50% larger
     * htmlNode.setContentScale(0.8); // Make content 20% smaller
     */
    setContentScale(scale) {
        this.data.contentScale = clamp(scale, 0.3, 3.0); // Clamp scale factor
        const contentEl = this.htmlElement?.querySelector('.node-content');
        if (contentEl) contentEl.style.transform = `scale(${this.data.contentScale})`;
    }

    /**
     * Sets the background color of the node's main HTML element.
     * This is typically applied via a CSS custom property (`--node-bg`) defined in the node's style.
     * Persists the color to `this.data.backgroundColor`.
     *
     * @param {string} color - A valid CSS color string (e.g., 'rgba(255,0,0,0.5)', '#ff0000', 'red').
     * @example
     * htmlNode.setBackgroundColor('lightblue');
     * htmlNode.setBackgroundColor('var(--my-custom-node-color)'); // Using a CSS variable
     */
    setBackgroundColor(color) {
        this.data.backgroundColor = color;
        this.htmlElement?.style.setProperty('--node-bg', this.data.backgroundColor);
    }

    /**
     * Adjusts the content scale by a given factor, multiplying the current scale.
     * For example, a `deltaFactor` of `1.1` increases the scale by 10%.
     *
     * @param {number} deltaFactor - The factor by which to multiply the current content scale.
     * @see HtmlNodeElement#setContentScale
     */
    adjustContentScale(deltaFactor) {
        this.setContentScale(this.data.contentScale * deltaFactor);
    }

    /**
     * Adjusts the node's overall size (width and height) by a given factor.
     *
     * @param {number} factor - The factor by which to multiply the current width and height.
     * @see HtmlNodeElement#setSize
     */
    adjustNodeSize(factor) {
        this.setSize(this.size.width * factor, this.size.height * factor, false); // scaleContent is false by default
    }

    /**
     * Updates the node's visual state. Called every frame by the {@link SpaceGraph} animation loop.
     * For `HtmlNodeElement`, this ensures the {@link CSS3DObject} position matches `this.position`.
     * If `this.billboard` is true, it also updates the {@link CSS3DObject}'s orientation to face the camera.
     * @override
     * @param {SpaceGraph} spaceGraphInstance - The parent {@link SpaceGraph} instance, providing access to the camera.
     */
    update(spaceGraphInstance) {
        if (this.cssObject) {
            this.cssObject.position.copy(this.position); // Sync position with BaseNode position
            if (this.billboard && spaceGraphInstance?._camera) {
                // If billboard is true, make it face the camera
                this.cssObject.quaternion.copy(spaceGraphInstance._camera.quaternion);
            }
        }
    }

    /**
     * Cleans up resources specific to `HtmlNodeElement`.
     * This primarily involves removing the `htmlElement` from the DOM and ensuring the `cssObject` is
     * correctly disposed of by calling `super.dispose()`.
     * @override
     */
    dispose() {
        // The super.dispose() method handles removal of cssObject and its element (this.htmlElement).
        // If htmlElement were managed entirely separately AND was not the element of cssObject,
        // it would need explicit removal here. For now, super.dispose() covers it.
        super.dispose();
        // this.htmlElement is already nullified by super.dispose() if it was cssObject.element
        // this.cssObject is already nullified by super.dispose()
    }

    /**
     * Calculates the bounding sphere radius for the HTML node.
     * This approximation is based on the diagonal of the node's `size` (width and height),
     * scaled by `this.data.contentScale`.
     * Used for layout calculations and camera focusing.
     * @override
     * @returns {number} The approximate radius of the node's bounding sphere.
     */
    getBoundingSphereRadius() {
        // Approximate based on the diagonal of the HTML element, considering its content scale.
        const scaledWidth = this.size.width * (this.data.contentScale ?? 1.0);
        const scaledHeight = this.size.height * (this.data.contentScale ?? 1.0);
        return Math.sqrt(scaledWidth ** 2 + scaledHeight ** 2) / 2;
    }

    /**
     * Applies or removes a visual style indicating selection by toggling a 'selected' CSS class
     * on the node's `htmlElement`.
     * @override
     * @param {boolean} selected - `true` to apply selection style, `false` to remove.
     */
    setSelectedStyle(selected) {
        this.htmlElement?.classList.toggle('selected', selected);
    }

    /**
     * Called by {@link UIManager} when a resize operation starts on this node's resize handle.
     * Adds a 'resizing' CSS class to the `htmlElement` and fixes the node in the {@link ForceLayout} engine.
     */
    startResize() {
        this.htmlElement?.classList.add('resizing');
        this.spaceGraph?.layoutEngine?.fixNode(this); // Prevent layout engine from moving the node during resize
    }
    /**
     * Called by {@link UIManager} during a resize operation. Updates the node's size.
     * @param {number} newWidth - The new target width for the node.
     * @param {number} newHeight - The new target height for the node.
     */
    resize(newWidth, newHeight) {
        this.setSize(newWidth, newHeight);
    }
    /**
     * Called by {@link UIManager} when a resize operation ends.
     * Removes the 'resizing' CSS class and releases the node in the {@link ForceLayout} engine.
     */
    endResize() {
        this.htmlElement?.classList.remove('resizing');
        this.spaceGraph?.layoutEngine?.releaseNode(this); // Allow layout engine to affect the node again
    }
}

/**
 * @class NoteNode
 * @classdesc A specialized {@link HtmlNodeElement} for creating editable text notes.
 * It pre-configures the `HtmlNodeElement` to be editable and sets its `type` to 'note',
 * which can be used for specific styling or behavior.
 * @extends HtmlNodeElement
 */
export class NoteNode extends HtmlNodeElement {
    /**
     * Creates an instance of NoteNode.
     * @constructor
     * @param {string | null} id - Unique ID for the node. See {@link BaseNode#constructor}.
     * @param {{x:number, y:number, z:number}} [pos={x:0,y:0,z:0}] - Initial position. See {@link BaseNode#constructor}.
     * @param {NodeDataObject} [data={content:''}] - Initial data. The `content` property is typically used for the note's text.
     *                                               `editable` will be forced to `true`, and `type` to `'note'`.
     * @example
     * const myNote = new NoteNode('my-note-id', {x: 10, y: 20}, { content: "This is an important note!" });
     * spaceGraph.addNode(myNote);
     */
    constructor(id, pos = { x: 0, y: 0, z: 0 }, data = { content: '' }) {
        const mergedData = { ...data, type: 'note', editable: true, label: data.content || data.label }; // Ensure 'note' type and editable
        super(id, pos, mergedData);
    }
}

/**
 * @class RegisteredNode
 * @classdesc Represents a custom node whose behavior and appearance are defined by a {@link TypeDefinition}
 * object that was registered with the {@link SpaceGraph} instance via {@link SpaceGraph#registerNodeType}.
 * This class acts as a bridge between the generic node lifecycle and the custom logic provided in the `TypeDefinition`.
 *
 * It handles the instantiation of visual elements (mesh, HTML) based on the `onCreate` method of its `TypeDefinition`,
 * and delegates other lifecycle events (update, dispose, etc.) to the corresponding methods in the `TypeDefinition` if they exist.
 *
 * @extends BaseNode
 * @property {TypeDefinition | null} typeDefinition - The {@link TypeDefinition} object that dictates this node's behavior and appearance.
 *                                                  This is provided during construction and is essential for the node's functionality.
 * @property {HTMLElement[]} portElements - Array of {@link HTMLElement}s representing input/output ports, if defined in the node's data
 *                                         (via `data.ports`) and an `htmlElement` is created by the `typeDefinition.onCreate` method
 *                                         to host these ports. See {@link RegisteredNode#_createAndRenderPorts}.
 */
export class RegisteredNode extends BaseNode {
    /** @type {TypeDefinition | null} */
    typeDefinition = null;
    /** @type {HTMLElement[]} */
    portElements = [];
    /**
     * @private
     * @type {Map<string, Set<Function>> | undefined}
     * @description Stores listeners registered directly on this node instance when this node *is the emitter*.
     *              Map structure: `Map<eventName, Set<callbackFunction>>`.
     *              Callbacks are invoked by `this.emit()`.
     */
    _listeners; // Initialized in constructor
    /**
     * @private
     * @type {Map<string, Map<string, Set<Function>>> | undefined}
     * @description Tracks listeners that *this node* has registered on *other* nodes.
     *              Used for cleanup in `dispose()` to remove this node's listeners from the emitters it was listening to.
     *              Map structure: `Map<emitterNodeId, Map<eventName, Set<callbackFunction>>>`.
     */
    _listeningTo; // Initialized in constructor


    /**
     * Creates an instance of RegisteredNode.
     * This constructor is typically called internally by {@link SpaceGraph#addNode} when a node of a registered custom type is being added.
     * It sets up the node based on its `typeDefinition`, creates its visual elements via `typeDefinition.onCreate`,
     * and initializes internal structures for event handling.
     *
     * @constructor
     * @param {string} id - Unique ID for the node.
     * @param {NodeDataObject} initialUserData - The initial data object for the node.
     * @param {TypeDefinition} typeDefinition - The {@link TypeDefinition} object for this node type.
     * @param {SpaceGraph} spaceGraphRef - Reference to the parent {@link SpaceGraph} instance.
     */
    constructor(id, initialUserData, typeDefinition, spaceGraphRef) {
        super(
            id,
            { x: initialUserData.x ?? 0, y: initialUserData.y ?? 0, z: initialUserData.z ?? 0 },
            initialUserData, // Pass all initialUserData to BaseNode, it will merge with defaults
            initialUserData.mass ?? typeDefinition.getDefaults?.(this, spaceGraphRef)?.mass ?? 1.0 // Pass nodeInst and graphInst to getDefaults
        );

        this.typeDefinition = typeDefinition;
        this.spaceGraph = spaceGraphRef; // Crucial for callbacks in typeDefinition

        // Initialize listener maps
        /**
         * @private
         * Stores listeners registered *on this node* (i.e., when this node is the Emitter).
         * Key: eventName (string), Value: Set of callback functions.
         */
        this._listeners = new Map();

        /**
         * @private
         * Stores listeners that *this node* has registered *on other nodes*.
         * Key: emitterNodeId (string), Value: Map<eventName, Set<callbackFunctions>>.
         * Used to clean up these listeners when this node is disposed.
         */
        this._listeningTo = new Map();

        // onCreate is mandatory and should return visual elements
        const visualOutputs = this.typeDefinition.onCreate(this, this.spaceGraph);
        if (visualOutputs) {
            this.mesh = visualOutputs.mesh;
            this.htmlElement = visualOutputs.htmlElement; // Could be the main element or a container for ports etc.
            this.cssObject = visualOutputs.cssObject || (this.htmlElement ? new CSS3DObject(this.htmlElement) : null);
            this.labelObject = visualOutputs.labelObject;

            // Assign userData for raycasting identification
            if (this.mesh) this.mesh.userData = { nodeId: this.id, type: this.data.type };
            if (this.cssObject) this.cssObject.userData = { nodeId: this.id, type: this.data.type };
            if (this.htmlElement && !this.htmlElement.dataset.nodeId) this.htmlElement.dataset.nodeId = this.id; // Ensure htmlElement has nodeId
            if (this.labelObject) this.labelObject.userData = { nodeId: this.id, type: `${this.data.type}-label` };
        }

        this.portElements = [];
        this._createAndRenderPorts(); // Create ports if defined in data.ports and htmlElement exists

        this.update(); // Initial update call
    }

    /**
     * Retrieves default data for this node by invoking the `getDefaults` method from its {@link TypeDefinition}, if provided.
     * This allows custom node types to specify their own set of default properties.
     * The result is merged with {@link BaseNode}'s default data.
     * @override
     * @returns {object} Default data object for this registered node type.
     * @protected
     */
    getDefaultData() {
        // `this.data` is already partially populated by BaseNode's constructor using `initialUserData`.
        // The `typeDefinition.getDefaults` method is called here to fetch type-specific defaults.
        // These are then merged by the BaseNode constructor logic.

        // In RegisteredNode (and its derivatives like HtmlAppNode), `this.typeDefinition` is set
        // and `this.spaceGraph` is set before `super()` calls this method.
        // `initialUserData` is available as `this.data` at this point due to BaseNode's constructor.
        if (this.typeDefinition?.getDefaults) {
            // Pass `this` (the node instance, which has `this.data` populated with initialUserData)
            // and `this.spaceGraph` to getDefaults.
            return this.typeDefinition.getDefaults(this, this.spaceGraph);
        }
        // Fallback to BaseNode's default data if no getDefaults in typeDefinition.
        // This ensures 'label' is still defaulted from id if nothing else is provided.
        return super.getDefaultData();
    }

    /**
     * Creates and renders HTML elements for input/output ports if `this.data.ports` is defined
     * and an `this.htmlElement` (typically created by `typeDefinition.onCreate`) exists to append them to.
     * Ports are styled with CSS classes `node-port`, `port-input`, `port-output`.
     * Data attributes `data-port-name`, `data-port-type`, `data-port-data-type` are added for interaction.
     * @private
     */
    _createAndRenderPorts() {
        if (!this.data.ports || !this.htmlElement) {
            return;
        }

        const portBaseSpacing = 20; // Example, can be styled via CSS
        const portSize = 12; // Example
        const nodeHeight = this.htmlElement.offsetHeight;
        const nodeWidth = this.htmlElement.offsetWidth; // Needed if ports were top/bottom

        // Clear existing port elements from DOM if any (e.g. on a re-render call, though not typical now)
        this.portElements.forEach((pE) => pE.remove());
        this.portElements = [];

        if (this.data.ports.inputs) {
            const inputKeys = Object.keys(this.data.ports.inputs);
            inputKeys.forEach((portName, i) => {
                const portDef = this.data.ports.inputs[portName];
                const portEl = document.createElement('div');
                portEl.className = 'node-port port-input';
                portEl.dataset.portName = portName;
                portEl.dataset.portType = 'input';
                portEl.dataset.portDataType = portDef.type || 'any'; // For type checking during linking
                portEl.title = portDef.label || portName; // Tooltip

                // Position port on the left side, distributed vertically
                portEl.style.left = `-${portSize / 2}px`; // Half outside
                const yPos = (nodeHeight / (inputKeys.length + 1)) * (i + 1) - portSize / 2;
                portEl.style.top = `${Math.max(0, Math.min(nodeHeight - portSize, yPos))}px`;

                this.htmlElement.appendChild(portEl);
                this.portElements.push(portEl);
            });
        }

        if (this.data.ports.outputs) {
            const outputKeys = Object.keys(this.data.ports.outputs);
            outputKeys.forEach((portName, i) => {
                const portDef = this.data.ports.outputs[portName];
                const portEl = document.createElement('div');
                portEl.className = 'node-port port-output';
                portEl.dataset.portName = portName;
                portEl.dataset.portType = 'output';
                portEl.dataset.portDataType = portDef.type || 'any';
                portEl.title = portDef.label || portName;

                // Position port on the right side
                portEl.style.right = `-${portSize / 2}px`;
                const yPos = (nodeHeight / (outputKeys.length + 1)) * (i + 1) - portSize / 2;
                portEl.style.top = `${Math.max(0, Math.min(nodeHeight - portSize, yPos))}px`;

                this.htmlElement.appendChild(portEl);
                this.portElements.push(portEl);
            });
        }
    }

    /**
     * Updates the node's visual state. Called every frame by the {@link SpaceGraph} animation loop.
     * Delegates to the `onUpdate` method of its {@link TypeDefinition} if provided.
     * If `onUpdate` is not defined, it performs default updates:
     * - Syncs `cssObject` and `mesh` positions with `this.position`.
     * - Billboards and positions `labelObject` if it exists.
     * @override
     * @param {SpaceGraph} spaceGraphInstance - The parent {@link SpaceGraph} instance.
     */
    update(spaceGraphInstance) {
        if (this.typeDefinition?.onUpdate) {
            this.typeDefinition.onUpdate(this, this.spaceGraph || spaceGraphInstance);
        } else {
            // Default update logic if onUpdate is not provided by the TypeDefinition
            if (this.cssObject) this.cssObject.position.copy(this.position);
            if (this.mesh) this.mesh.position.copy(this.position);

            if (this.labelObject && (this.spaceGraph?._camera || spaceGraphInstance?._camera)) {
                const camera = this.spaceGraph?._camera || spaceGraphInstance?._camera;
                // Position label above the node, adjusted by bounding sphere radius
                const offset = this.getBoundingSphereRadius() * 1.1 + 10;
                this.labelObject.position.copy(this.position).y += offset;
                this.labelObject.quaternion.copy(camera.quaternion); // Billboard
            }
        }
    }

    /**
     * Cleans up resources. Calls `onDispose` from the {@link TypeDefinition} if provided,
     * then removes port elements and calls `super.dispose()` to clean up common/Three.js resources.
     * @override
     */
    dispose() {
        if (this.typeDefinition?.onDispose) {
            this.typeDefinition.onDispose(this, this.spaceGraph);
        }

        this.portElements.forEach((portEl) => portEl.remove());
        this.portElements = [];

        // BaseNode.dispose() will handle mesh, cssObject, labelObject, and their elements.
        super.dispose();

        this.typeDefinition = null; // Release reference

        // Clean up listeners this node has registered on other nodes.
        // Iterate over a copy of keys if modification during iteration is an issue, though Set.delete should be fine.
        this._listeningTo.forEach((eventMap, emitterId) => {
            const emitterNode = this.spaceGraph?.getNodeById(emitterId);
            if (emitterNode && emitterNode instanceof RegisteredNode && emitterNode._listeners) {
                eventMap.forEach((callbacks, eventName) => {
                    callbacks.forEach(cb => {
                        emitterNode._listeners.get(eventName)?.delete(cb);
                        if (emitterNode._listeners.get(eventName)?.size === 0) {
                            emitterNode._listeners.delete(eventName);
                        }
                    });
                });
            }
        });
        this._listeningTo.clear();

        // Clean up listeners registered on this node by other nodes.
        // This tells any nodes that were listening to this node, that this node is gone.
        // (This part is more complex as it requires listeners to also de-register from their side,
        // or for this._listeners to store listenerNode references, which it does not in current design for emit.)
        // The current _listeners map (Map<eventName, Set<callback>>) does not know which node owns the callback.
        // The cleanup in _listeningTo handles the primary responsibility of a node cleaning up *its own* outgoing listeners.
        // For incoming listeners (this._listeners), clearing them here prevents further emits but doesn't inform the listening nodes.
        // A more robust system might involve a central event manager or more complex tracking.
        // For now, clearing this node's ability to emit to stale listeners is the main action.
        this._listeners.clear();
    }

    /**
     * Sets the node's 3D position. Delegates to `onSetPosition` from the {@link TypeDefinition} if provided,
     * otherwise updates visual components' positions directly.
     * @override
     * @param {number} x - The new x-coordinate.
     * @param {number} y - The new y-coordinate.
     * @param {number} z - The new z-coordinate.
     */
    setPosition(x, y, z) {
        super.setPosition(x, y, z); // Updates this.position
        if (this.typeDefinition?.onSetPosition) {
            this.typeDefinition.onSetPosition(this, x, y, z, this.spaceGraph);
        } else {
            // Default position update for visuals if not handled by TypeDefinition's onSetPosition
            if (this.mesh) this.mesh.position.copy(this.position);
            if (this.cssObject) this.cssObject.position.copy(this.position);
            // Note: Label position is often handled during the `update` phase for billboarding.
        }
    }

    /**
     * Applies or removes selection styling. Delegates to `onSetSelectedStyle` from the {@link TypeDefinition} if provided.
     * Manages visibility of port elements (shows on select, hides on deselect).
     * If no custom `onSetSelectedStyle` is defined, it applies a default style (e.g., adds 'selected' class to `htmlElement` or changes mesh emissive color).
     * @override
     * @param {boolean} selected - `true` if the node is selected, `false` otherwise.
     */
    setSelectedStyle(selected) {
        if (this.portElements && this.portElements.length > 0) {
            this.portElements.forEach((portEl) => {
                portEl.style.display = selected ? 'block' : 'none'; // Show ports when selected
            });
        }

        if (this.typeDefinition?.onSetSelectedStyle) {
            this.typeDefinition.onSetSelectedStyle(this, selected, this.spaceGraph);
        } else {
            // Default selection behavior if not overridden by TypeDefinition
            if (this.htmlElement) {
                this.htmlElement.classList.toggle('selected', selected);
            } else if (this.mesh?.material?.emissive) {
                // Basic emissive highlight for mesh-based nodes
                this.mesh.material.emissive.setHex(selected ? 0x888800 : 0x000000);
            }
            // Default for label object as well
            if (this.labelObject?.element) {
                this.labelObject.element.classList.toggle('selected', selected);
            }
        }
    }

    /**
     * Applies or removes hover styling. Delegates to `onSetHoverStyle` from the {@link TypeDefinition} if available.
     * @param {boolean} hovered - `true` if the node is being hovered over, `false` otherwise.
     */
    setHoverStyle(hovered) {
        if (this.typeDefinition?.onSetHoverStyle) {
            this.typeDefinition.onSetHoverStyle(this, hovered, this.spaceGraph);
        }
        // Default CSS :hover effects on htmlElement or ports are often sufficient.
        // No complex default WebGL hover effect is provided here out-of-the-box.
    }

    /**
     * Calculates the bounding sphere radius. Delegates to `getBoundingSphereRadius` from the {@link TypeDefinition} if provided.
     * Otherwise, it attempts to calculate based on the dimensions of `htmlElement` or `mesh.geometry.boundingSphere`.
     * Falls back to `super.getBoundingSphereRadius()` if no other calculation is possible.
     * @override
     * @returns {number} The node's bounding sphere radius.
     */
    getBoundingSphereRadius() {
        if (this.typeDefinition?.getBoundingSphereRadius) {
            return this.typeDefinition.getBoundingSphereRadius(this, this.spaceGraph);
        }
        // Fallback calculations if not provided by TypeDefinition
        if (this.htmlElement) {
            // Consider content scale for HTML elements
            const scale = this.data.contentScale ?? 1.0;
            return Math.max(this.htmlElement.offsetWidth * scale, this.htmlElement.offsetHeight * scale) / 2;
        }
        if (this.mesh?.geometry) {
            if (!this.mesh.geometry.boundingSphere) {
                this.mesh.geometry.computeBoundingSphere();
            }
            return this.mesh.geometry.boundingSphere.radius;
        }
        return super.getBoundingSphereRadius(); // BaseNode's default (small value)
    }

    /**
     * Handles the start of a drag operation. Delegates to `onStartDrag` from the {@link TypeDefinition} if provided,
     * otherwise calls `super.startDrag()`.
     * @override
     */
    startDrag() {
        if (this.typeDefinition?.onStartDrag) this.typeDefinition.onStartDrag(this, this.spaceGraph);
        else super.startDrag();
    }
    /**
     * Handles a drag operation. Delegates to `onDrag` from the {@link TypeDefinition} if provided,
     * otherwise calls `super.drag()`.
     * @override
     * @param {THREE.Vector3} newPosition - The new target position.
     */
    drag(newPosition) {
        if (this.typeDefinition?.onDrag) this.typeDefinition.onDrag(this, newPosition, this.spaceGraph);
        else super.drag(newPosition);
    }
    /**
     * Handles the end of a drag operation. Delegates to `onEndDrag` from the {@link TypeDefinition} if provided,
     * otherwise calls `super.endDrag()`.
     * @override
     */
    endDrag() {
        if (this.typeDefinition?.onEndDrag) this.typeDefinition.onEndDrag(this, this.spaceGraph);
        else super.endDrag();
    }

    /**
     * Emits an event from this node.
     * If the `eventName` matches a defined output port of this node (from `this.data.ports.outputs`),
     * and `propagateViaPorts` is true, the `payload` is automatically sent to any input ports
     * on other nodes that are connected to this output port by an edge. This is achieved by calling
     * `spaceGraph.updateNodeData()` on the target node, with the target port's name as the key and `payload` as the value.
     *
     * Additionally, this method invokes any callback functions that were directly registered on this node
     * for the given `eventName` using `someOtherNode.listenTo(thisNode, eventName, callback)`.
     *
     * @param {string} eventName - The name of the event to emit. If this matches an output port name defined in `this.data.ports.outputs`,
     *                             and `propagateViaPorts` is true, the data will be propagated through connected edges.
     * @param {*} payload - The data to send with the event. This will be passed to connected input ports and direct listeners.
     * @param {boolean} [propagateViaPorts=true] - If `true` (default) and `eventName` is a defined output port,
     *                                            the data is propagated to connected input ports on other nodes.
     *                                            Set to `false` to only trigger direct listeners registered via `listenTo` for this `eventName`,
     *                                            without port-based propagation.
     * @example
     * // In a node's method (e.g., part of an HtmlAppNode subclass or a TypeDefinition method for a RegisteredNode):
     * // this.emit('dataProcessed', { result: 42 }); // Assuming 'dataProcessed' is an output port
     * // this.emit('stateChanged', { newState: 'active' }, false); // Only for direct listeners
     */
    emit(eventName, payload, propagateViaPorts = true) {
        // 1. Automatic Port-Based Data Propagation
        if (propagateViaPorts && this.data.ports?.outputs?.[eventName] && this.spaceGraph) {
            this.spaceGraph.edges.forEach(edge => {
                if (edge.source === this && edge.data.sourcePort === eventName) {
                    const targetNode = edge.target;
                    const targetPortName = edge.data.targetPort;
                    if (targetNode && targetPortName && targetNode instanceof RegisteredNode) {
                        if (targetNode.data.ports?.inputs?.[targetPortName]) {
                            // console.log(`Propagating data from ${this.id}:${eventName} to ${targetNode.id}:${targetPortName}`, payload);
                            this.spaceGraph.updateNodeData(targetNode.id, { [targetPortName]: payload });
                        } else {
                            console.warn(`Output port ${this.id}:${eventName} connected to undefined input port ${targetNode.id}:${targetPortName}`);
                        }
                    }
                }
            });
        }

        // 2. Direct `listenTo` Listeners
        // Callbacks stored in `this._listeners` (Map<eventName, Set<callback>>) are executed.
        if (this._listeners.has(eventName)) {
            // Iterate over a copy in case a callback modifies the listeners Set (e.g., calls stopListening)
            [...this._listeners.get(eventName)].forEach(callback => {
                try {
                    callback(payload, this); // Pass payload and this node as the sender
                } catch (error) {
                    console.error(`Error in direct listener for event "${eventName}" on node ${this.id}:`, error);
                }
            });
        }
    }

    /**
     * Registers a listener on an `emitterNode` for a specific event.
     * When `emitterNode` calls its `emit(eventName, payload)` method, the provided `callback`
     * function will be executed if the `eventName` matches.
     * This node (the instance on which `listenTo` is called) keeps track of this subscription internally
     * so that the listener can be automatically removed when this listening node is disposed via {@link RegisteredNode#dispose},
     * preventing memory leaks or errors from stale callbacks.
     *
     * @param {RegisteredNode} emitterNode - The node instance to listen to. This node must be an instance of
     *                                     `RegisteredNode` or its subclasses (like {@link HtmlAppNode}) as they possess the `emit` mechanism.
     * @param {string} eventName - The name of the event to listen for on the `emitterNode`.
     * @param {function(any, RegisteredNode): void} callback - The function to execute when the event is emitted.
     *                                                        The callback receives two arguments:
     *                                                        1. `payload`: The data payload of the event, as passed to `emitterNode.emit()`.
     *                                                        2. `senderNodeInstance`: The `emitterNode` instance that emitted the event (i.e., `emitterNode` itself).
     * @example
     * // In an HtmlAppNode subclass (this is nodeB, the listener):
     * // onInit() { // Or any other appropriate place
     * //   const nodeA = this.spaceGraph.getNodeById('nodeA'); // Assume nodeA is a RegisteredNode
     * //   if (nodeA instanceof RegisteredNode) { // Type check for safety
     * //     this.listenTo(nodeA, 'dataReady', (data, sender) => {
     * //       console.log(`Node ${this.id} received data from ${sender.id}:`, data);
     * //       this.processIncomingData(data); // Example method in nodeB's class
     * //     });
     * //   }
     * // }
     *
     * // Elsewhere, nodeA (an instance of RegisteredNode or HtmlAppNode) might do:
     * // nodeA.emit('dataReady', { value: 123 });
     * // This would trigger the callback registered by nodeB.
     */
    listenTo(emitterNode, eventName, callback) {
        if (!(emitterNode instanceof RegisteredNode)) {
            console.error(`Cannot listenTo: emitterNode with id '${emitterNode?.id}' is not a RegisteredNode.`);
            return;
        }
        if (typeof callback !== 'function') {
            console.error('Cannot listenTo: provided callback is not a function.');
            return;
        }

        // Register the callback on the emitterNode's internal _listeners map.
        if (!emitterNode._listeners.has(eventName)) {
            emitterNode._listeners.set(eventName, new Set());
        }
        emitterNode._listeners.get(eventName).add(callback);

        // This listening node (this) also needs to track this subscription for its own disposal.
        if (!this._listeningTo.has(emitterNode.id)) {
            this._listeningTo.set(emitterNode.id, new Map());
        }
        const eventMapForEmitter = this._listeningTo.get(emitterNode.id);
        if (!eventMapForEmitter.has(eventName)) {
            eventMapForEmitter.set(eventName, new Set());
        }
        eventMapForEmitter.get(eventName).add(callback);
    }

    /**
     * Removes a listener that this node previously registered on an `emitterNode` for a specific event and callback.
     *
     * @param {RegisteredNode} emitterNode - The node instance from which to stop listening.
     * @param {string} eventName - The name of the event.
     * @param {Function} callback - The specific callback function instance that was originally registered.
     *                              This must be the same function reference.
     */
    stopListening(emitterNode, eventName, callback) {
        if (!(emitterNode instanceof RegisteredNode) || !emitterNode._listeners?.has(eventName) || typeof callback !== 'function') {
            return;
        }
        emitterNode._listeners.get(eventName).delete(callback);
        if (emitterNode._listeners.get(eventName).size === 0) {
            emitterNode._listeners.delete(eventName);
        }

        if (this._listeningTo.has(emitterNode.id) && this._listeningTo.get(emitterNode.id).has(eventName)) {
            this._listeningTo.get(emitterNode.id).get(eventName).delete(callback);
            if (this._listeningTo.get(emitterNode.id).get(eventName).size === 0) {
                this._listeningTo.get(emitterNode.id).delete(eventName);
            }
            if (this._listeningTo.get(emitterNode.id).size === 0) {
                this._listeningTo.delete(emitterNode.id);
            }
        }
    }
}

/**
 * @class ShapeNode
 * @classdesc Represents a node visualized as a simple geometric shape (e.g., sphere, box) using WebGL.
 * Extends {@link BaseNode}. The shape, size, and color are configurable.
 *
 * @extends BaseNode
 * @property {string} shape - The type of geometric shape. Supported values: 'sphere', 'box'. Default: 'sphere'.
 * @property {number} size - The characteristic size of the shape (e.g., diameter for a sphere, side length for a box). Default: 50.
 * @property {number} color - The hexadecimal color of the shape (e.g., `0xffffff` for white). Default: `0xffffff`.
 */
export class ShapeNode extends BaseNode {
    /** @type {string} */
    shape = 'sphere';
    /** @type {number} */
    size = 50;
    /** @type {number} */
    color = 0xffffff;

    /**
     * Creates an instance of ShapeNode.
     *
     * @constructor
     * @param {string | null} id - Unique ID. See {@link BaseNode#constructor}.
     * @param {{x: number, y: number, z: number}} position - Initial position. See {@link BaseNode#constructor}.
     * @param {NodeDataObject} [data={}] - Initial data, including `shape`, `size`, `color`, and `label`.
     *                                   Defaults are taken from {@link SpaceGraphConfig} if not provided.
     * @param {number} [mass=1.5] - Mass of the node for physics calculations.
     * @example
     * const sphereNode = new ShapeNode('sphere1', {x: -50, y: 0}, {
     *   label: "My Sphere",
     *   shape: 'sphere',
     *   size: 60,
     *   color: 0x00ff00 // Green
     * });
     * spaceGraph.addNode(sphereNode);
     *
     * const boxNode = new ShapeNode('box1', {x: 50, y: 0}, {
     *   label: "My Box",
     *   shape: 'box',
     *   size: 40,
     *   color: 0xff0000 // Red
     * });
     * spaceGraph.addNode(boxNode);
     */
    constructor(id, position, data = {}, mass = 1.5) {
        // Similar workaround as in HtmlNodeElement for spaceGraph access during super()
        const tempData = { ...data };
        if (data.spaceGraph) {
            tempData.spaceGraphForDefault = data.spaceGraph;
        }
        super(id, position, tempData, mass); // this.data is now populated

        const shapeDefaults = this.spaceGraph?.config?.defaults?.node?.shape || {};

        // Finalize properties based on defaults from SpaceGraphConfig, then data, then class hardcoded defaults.
        // this.data contains merged data from constructor's `data` and `this.getDefaultData()`.
        this.shape = this.data.shape ?? shapeDefaults.shape ?? 'sphere';
        this.size = this.data.size ?? shapeDefaults.size ?? 50;
        this.color = this.data.color ?? shapeDefaults.color ?? 0xffffff;

        // Ensure this.data also reflects the final chosen values if they came from graphDefaults or class defaults,
        // as `getDefaultData` might have been called before `this.spaceGraph` was available.
        this.data.shape = this.shape;
        this.data.size = this.size;
        this.data.color = this.color;

        this.mesh = this._createMesh(); // Creates the Three.js mesh based on shape, size, color
        this.mesh.userData = { nodeId: this.id, type: 'shape-node' }; // For raycasting

        if (this.data.label) {
            // If a label is provided in data
            this.labelObject = this._createLabel(); // Create a CSS3DObject for the label
            this.labelObject.userData = { nodeId: this.id, type: 'shape-label' };
        }
        this.update(); // Initial position and label update
    }

    /**
     * Provides default data specific to ShapeNode.
     * Merges with {@link BaseNode#getDefaultData} and global defaults from {@link SpaceGraphConfig}.
     * @override
     * @returns {NodeDataObject} Default data including `type`, `shape`, `size`, `color`.
     * @protected
     */
    getDefaultData() {
        const spaceGraphInstance = this.data.spaceGraphForDefault || this.spaceGraph;
        const graphShapeDefaults = spaceGraphInstance?.config?.defaults?.node?.shape || {};
        return {
            ...super.getDefaultData(), // Includes label: this.id from BaseNode
            type: 'shape',
            shape: graphShapeDefaults.shape ?? 'sphere',
            size: graphShapeDefaults.size ?? 50,
            color: graphShapeDefaults.color ?? 0xffffff,
            // `label` is already part of super.getDefaultData()
        };
    }

    /**
     * Creates the Three.js {@link THREE.Mesh} for the shape based on `this.shape`, `this.size`, and `this.color`.
     * Supports 'box' and 'sphere' shapes.
     * @returns {THREE.Mesh} The created Three.js mesh.
     * @private
     */
    _createMesh() {
        let geometry;
        const effectiveSize = Math.max(10, this.size); // Enforce a minimum visual size
        switch (this.shape) {
            case 'box':
                geometry = new THREE.BoxGeometry(effectiveSize, effectiveSize, effectiveSize);
                break;
            case 'sphere':
            default: // Default to sphere if shape is unknown or not specified
                geometry = new THREE.SphereGeometry(effectiveSize / 2, 16, 12); // size is diameter, so radius is size/2
                break;
        }
        const material = new THREE.MeshStandardMaterial({
            // Using MeshStandardMaterial for PBR-like appearance
            color: this.color,
            roughness: 0.6,
            metalness: 0.2,
        });
        return new THREE.Mesh(geometry, material);
    }

    /**
     * Creates a {@link CSS3DObject} for the node's label if `this.data.label` is provided.
     * The label is a simple HTML `<div>` element styled with basic CSS.
     * @returns {CSS3DObject | null} The created label object, or `null` if no label data.
     * @private
     */
    _createLabel() {
        const div = document.createElement('div');
        div.className = 'node-label-3d'; // For styling via external CSS
        div.textContent = this.data.label;
        div.dataset.nodeId = this.id; // For potential DOM-based interactions or debugging
        Object.assign(div.style, {
            // Basic default inline styling (can be overridden by CSS class)
            color: 'white', // Text color
            backgroundColor: 'rgba(0,0,0,0.6)', // Semi-transparent black background
            padding: '3px 6px',
            borderRadius: '4px',
            fontSize: '14px',
            pointerEvents: 'none', // Label itself is not interactive by default
            textAlign: 'center',
        });
        return new CSS3DObject(div);
    }

    /**
     * Updates the node's visual state. Called every frame by the {@link SpaceGraph} animation loop.
     * For `ShapeNode`, this syncs the `this.mesh.position` with `this.position`.
     * If a `labelObject` exists, it positions it above the mesh and makes it face the camera (billboarding).
     * @override
     * @param {SpaceGraph} spaceGraphInstance - The parent {@link SpaceGraph} instance, providing access to the camera.
     */
    update(spaceGraphInstance) {
        if (this.mesh) this.mesh.position.copy(this.position); // Sync mesh position

        if (this.labelObject) {
            // Position label slightly above the node's mesh
            const offset = this.getBoundingSphereRadius() * 1.1 + 10; // 10 units padding above sphere
            this.labelObject.position.copy(this.position).y += offset;
            if (spaceGraphInstance?._camera) {
                // Billboard the label to face the camera
                this.labelObject.quaternion.copy(spaceGraphInstance._camera.quaternion);
            }
        }
    }

    /**
     * Cleans up resources specific to `ShapeNode`.
     * This involves disposing of the Three.js mesh (geometry, material) and the label object (if any),
     * then calling `super.dispose()` for common cleanup.
     * @override
     */
    dispose() {
        // super.dispose() will handle this.mesh and this.labelObject if they are standard properties.
        // Explicitly nullifying them here after super.dispose() is redundant if BaseNode.dispose() correctly clears them.
        // However, if BaseNode.dispose() were not guaranteed to clear them, or if these were custom properties
        // not known to BaseNode, then direct cleanup here would be essential.
        // (In this case, 'shape', 'size', 'color' are primitive/data, not disposable objects themselves)
        super.dispose(); // BaseNode.dispose handles mesh, labelObject, and their elements.
    }

    /**
     * Calculates the bounding sphere radius based on the node's `shape` and `size`.
     * For a 'box', it's the half-diagonal. For a 'sphere', it's `size / 2`.
     * @override
     * @returns {number} The radius of the bounding sphere.
     */
    getBoundingSphereRadius() {
        const effectiveSize = Math.max(10, this.size); // Consistent with _createMesh
        switch (this.shape) {
            case 'box':
                // For a box, the bounding sphere radius is half the length of its space diagonal.
                return Math.sqrt(3 * (effectiveSize / 2) ** 2);
            case 'sphere':
            default:
                return effectiveSize / 2; // For a sphere, size is diameter, so radius is size / 2.
        }
    }

    /**
     * Applies or removes a visual style indicating selection.
     * For `ShapeNode`, this typically involves changing the emissive color of the mesh material
     * to make it glow and toggling a 'selected' CSS class on the `labelObject.element` if it exists.
     * @override
     * @param {boolean} selected - `true` to apply selection style, `false` to remove.
     */
    setSelectedStyle(selected) {
        if (this.mesh?.material) {
            // Check if the material is a standard material that supports emissive property
            if ('emissive' in this.mesh.material) {
                this.mesh.material.emissive.setHex(selected ? 0x888800 : 0x000000); // Yellowish tint when selected
            }
        }
        this.labelObject?.element?.classList.toggle('selected', selected);
    }
}

/**
 * @class Edge
 * @classdesc Represents a visual and logical connection (an edge) between two {@link BaseNode} instances within a {@link SpaceGraph}.
 * Each edge has a unique ID, references to its source and target nodes, and an associated data object
 * that defines its appearance (color, thickness, opacity) and physical properties for the {@link ForceLayout} engine
 * (constraint type, stiffness, ideal length).
 * Its visual representation is a {@link THREE.Line} object.
 */
export class Edge {
    // Define default data as a static property
    static DEFAULT_EDGE_DATA = {
        color: 0x00d0ff,
        thickness: 1.5,
        opacity: 0.6,
        style: 'solid',
        constraintType: 'elastic',
        constraintParams: { stiffness: 0.001, idealLength: 200 },
    };

    /**
     * Unique identifier for the edge.
     * @type {string}
     */
    id;
    /**
     * The source node of the edge.
     * @type {BaseNode | null}
     */
    source;
    /**
     * The target node of the edge.
     * @type {BaseNode | null}
     */
    target;
    /**
     * Reference to the parent {@link SpaceGraph} instance.
     * @type {SpaceGraph | null}
     */
    spaceGraph = null;
    /**
     * The Three.js {@link THREE.Line} object that visually represents this edge in the WebGL scene.
     * @type {THREE.Line | null}
     */
    threeObject = null;
    /**
     * Data associated with the edge, controlling its appearance and physics behavior.
     * This object is initialized by merging class defaults, {@link SpaceGraphConfig} defaults for edges,
     * and specific data provided during instantiation.
     *
     * @type {object}
     * @property {number} color - Hexadecimal color of the edge line (e.g., `0x00d0ff` for light blue).
     *                            Default is `0x00d0ff` or from {@link SpaceGraphConfig}.
     * @property {number} thickness - Thickness of the edge line. Note: WebGL line rendering capabilities can vary.
     *                               Default is `1.5` or from {@link SpaceGraphConfig}.
     * @property {number} opacity - Opacity of the edge line (0.0 for fully transparent, 1.0 for fully opaque).
     *                             Default is `0.6` or from {@link SpaceGraphConfig}.
     * @property {string} style - Visual style of the edge. Currently primarily supports 'solid'.
     *                            Future extensions might include 'dashed'. Default is 'solid'.
     * @property {string} constraintType - Type of physics constraint used by the {@link ForceLayout} engine.
     *                                   Supported types:
     *                                   - `'elastic'`: Spring-like connection, attempts to maintain an `idealLength`.
     *                                   - `'rigid'`: Attempts to maintain a fixed `distance`.
     *                                   - `'weld'`: A stronger rigid constraint, often used to keep nodes "stuck" together based on their radii.
     *                                   Default is `'elastic'`.
     * @property {object} constraintParams - Parameters specific to the `constraintType`.
     * @property {number} [constraintParams.stiffness] - For 'elastic', 'rigid', or 'weld' constraints.
     *                                                  Determines how strongly the constraint is enforced (higher is stronger).
     *                                                  Defaults vary by `constraintType` (e.g., `0.001` for elastic, `0.1` for rigid).
     * @property {number} [constraintParams.idealLength] - For 'elastic' constraints only. The desired resting length of the edge.
     *                                                    Default is `200` or from {@link SpaceGraphConfig}.
     * @property {number} [constraintParams.distance] - For 'rigid' or 'weld' constraints. The fixed distance the edge tries to maintain.
     *                                                 For 'weld', it might default to the sum of node radii.
     * @property {string} [sourcePort] - If `source` node is a {@link RegisteredNode} with ports, the name of the output port.
     * @property {string} [targetPort] - If `target` node is a {@link RegisteredNode} with ports, the name of the input port.
     */
    data = {}; // This will be populated in the constructor by merging defaults

    /**
     * Creates an instance of Edge.
     *
     * @constructor
     * @param {string} id - Unique ID for the edge (e.g., generated by {@link generateId}).
     * @param {BaseNode} sourceNode - The source {@link BaseNode} for the edge.
     * @param {BaseNode} targetNode - The target {@link BaseNode} for the edge.
     * @param {Partial<EdgeDataObject>} [data={}] - Optional data object to override default edge properties.
     *                                            See {@link EdgeDataObject} and `this.data` property description.
     * @throws {Error} If `sourceNode` or `targetNode` is not provided or invalid.
     * @example
     * const node1 = spaceGraph.getNodeById('node1');
     * const node2 = spaceGraph.getNodeById('node2');
     * if (node1 && node2) {
     *   const edgeId = generateId('edge');
     *   const newEdge = new Edge(edgeId, node1, node2, {
     *     color: 0xff0000, // Red edge
     *     thickness: 2,
     *     constraintType: 'rigid',
     *     constraintParams: { distance: 150, stiffness: 0.05 }
     *   });
     *   // Typically, you would use spaceGraph.addEdge(node1, node2, data) which handles ID generation and adding to graph.
     *   // This direct constructor usage is less common externally.
     * }
     */
    constructor(id, sourceNode, targetNode, data = {}) {
        if (!sourceNode || !(sourceNode instanceof BaseNode)) throw new Error('Edge requires a valid source BaseNode.');
        if (!targetNode || !(targetNode instanceof BaseNode)) throw new Error('Edge requires a valid target BaseNode.');
        this.id = id;
        this.source = sourceNode;
        this.target = targetNode;
        this.spaceGraph = sourceNode.spaceGraph; // Inherit spaceGraph reference from a node

        const globalEdgeDefaults = this.spaceGraph?.config?.defaults?.edge || {};
        const classLevelDefaults = Edge.DEFAULT_EDGE_DATA; // Accessing the static default data

        // Determine smart default constraint parameters based on type
        const currentConstraintType = data.constraintType || classLevelDefaults.constraintType;
        const smartConstraintParams = this._getDefaultConstraintParams(currentConstraintType, sourceNode, targetNode);

        // Initialize this.data by merging:
        // 1. Class-level hardcoded defaults
        // 2. Global defaults from SpaceGraphConfig
        // 3. Instance-specific data passed to constructor
        // 4. Smart constraint params (which might depend on node positions/radii)
        this.data = {
            ...classLevelDefaults, // Start with class's own hardcoded defaults
            ...globalEdgeDefaults, // Override with global graph config defaults
            ...data, // Override with instance-specific data
            constraintParams: {
                // Deep merge for constraintParams separately
                ...classLevelDefaults.constraintParams, // Base for constraint params
                ...(globalEdgeDefaults.constraintParams || {}), // Global defaults for constraint params (ensure it's an object)
                ...smartConstraintParams, // Type-specific smart defaults (calculated)
                ...(data.constraintParams || {}), // Instance-specific constraint params
            },
        };
        // Ensure constraintType from data or defaults is correctly set
        this.data.constraintType = currentConstraintType;

        this.threeObject = this._createThreeObject(); // Uses this.data for color, thickness, opacity
        this.update(); // Set initial line positions
    }

    /**
     * Determines default physics parameters for an edge based on its `constraintType`.
     * This is used during edge construction to provide sensible defaults if not explicitly specified.
     * For 'rigid' constraints, it defaults to the current distance between nodes.
     * For 'weld' constraints, it defaults to the sum of the nodes' bounding sphere radii.
     * For 'elastic' (default), it uses predefined stiffness and ideal length.
     *
     * @param {string} constraintType - The type of constraint (e.g., 'elastic', 'rigid', 'weld').
     * @param {BaseNode} sourceNode - The source {@link BaseNode}.
     * @param {BaseNode} targetNode - The target {@link BaseNode}.
     * @returns {object} An object containing default parameters (e.g., `stiffness`, `idealLength`, `distance`)
     *                   appropriate for the given `constraintType`.
     * @private
     */
    _getDefaultConstraintParams(constraintType, sourceNode, targetNode) {
        const forceLayoutSettings = this.spaceGraph?.layoutEngine?.settings;
        switch (constraintType) {
            case 'rigid':
                return {
                    distance: sourceNode.position.distanceTo(targetNode.position),
                    stiffness: forceLayoutSettings?.defaultRigidStiffness ?? 0.1,
                };
            case 'weld':
                return {
                    distance: sourceNode.getBoundingSphereRadius() + targetNode.getBoundingSphereRadius(),
                    stiffness: forceLayoutSettings?.defaultWeldStiffness ?? 0.5,
                };
            case 'elastic':
            default:
                return {
                    stiffness: forceLayoutSettings?.defaultElasticStiffness ?? 0.001,
                    idealLength: forceLayoutSettings?.defaultElasticIdealLength ?? 200,
                };
        }
    }

    /**
     * Creates the Three.js {@link THREE.Line} object that visually represents the edge.
     * The line's material is configured based on `this.data.color`, `this.data.thickness`,
     * and `this.data.opacity`. The geometry is initialized with the current positions of the
     * source and target nodes.
     *
     * @returns {THREE.Line} The created Three.js line object.
     * @private
     */
    _createThreeObject() {
        const material = new THREE.LineBasicMaterial({
            color: this.data.color,
            linewidth: this.data.thickness, // Note: WebGL spec often limits this to 1. Effective thickness might require custom shaders/geometry.
            transparent: true,
            opacity: this.data.opacity,
            depthTest: false, // Render lines without being occluded by nodes for better visibility in dense graphs.
        });
        const points = [this.source.position.clone(), this.target.position.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.renderOrder = -1; // Attempt to render lines before (or "on top of") most other objects. Adjust as needed.
        line.userData.edgeId = this.id; // Store edge ID in userData for easy identification during raycasting.
        return line;
    }

    /**
     * Updates the edge's visual representation (the {@link THREE.Line} object)
     * to reflect the current positions of its source and target nodes.
     * This method is called by {@link SpaceGraph#_animate} (via {@link SpaceGraph#_updateNodesAndEdges})
     * in each frame of the animation loop.
     */
    update() {
        if (!this.threeObject || !this.source || !this.target) return; // Ensure all required objects exist
        const positions = this.threeObject.geometry.attributes.position; // Get position buffer attribute
        // Update the coordinates of the two points defining the line
        positions.setXYZ(0, this.source.position.x, this.source.position.y, this.source.position.z);
        positions.setXYZ(1, this.target.position.x, this.target.position.y, this.target.position.z);
        positions.needsUpdate = true; // Signal to Three.js that the geometry has changed
        this.threeObject.geometry.computeBoundingSphere(); // Crucial for raycasting and view frustum culling
    }

    /**
     * Sets a visual highlight state for the edge. When highlighted, the edge typically becomes
     * more opaque and may change color to stand out.
     *
     * @param {boolean} highlight - `true` to apply highlight style, `false` to revert to normal style.
     * @example
     * // Highlight an edge
     * myEdge.setHighlight(true);
     * // Remove highlight
     * myEdge.setHighlight(false);
     */
    setHighlight(highlight) {
        if (!this.threeObject?.material) return; // Ensure material exists
        const material = this.threeObject.material;
        material.opacity = highlight ? 1.0 : (this.data.opacity ?? 0.6); // Full opacity when highlighted, else its configured opacity
        material.color.set(highlight ? 0x00ffff : this.data.color); // Example: Cyan highlight, else its configured color
        // Note: `linewidth` changes are not reliably supported by all WebGL renderers for `LineBasicMaterial`.
        // For thicker highlighted lines, a different line rendering approach (e.g., THREE.Line2, mesh lines) might be needed.
        material.needsUpdate = true; // Signal to Three.js that material properties have changed
    }

    /**
     * Cleans up resources used by the edge. This involves disposing of the
     * Three.js line geometry and material, and removing the `threeObject` from its parent scene.
     * It also nullifies references to nodes and the graph to aid garbage collection.
     * Called by {@link SpaceGraph#removeEdge}.
     */
    dispose() {
        if (this.threeObject) {
            this.threeObject.geometry?.dispose(); // Dispose geometry
            this.threeObject.material?.dispose(); // Dispose material
            this.threeObject.parent?.remove(this.threeObject); // Remove from scene
            this.threeObject = null;
        }
        // Nullify references to aid garbage collection and prevent stale interactions
        this.source = null;
        this.target = null;
        this.spaceGraph = null;
    }
}

/**
 * @class UIManager
 * @classdesc Manages all user interactions with the {@link SpaceGraph}, including pointer events (click, drag, wheel),
 * keyboard shortcuts, context menus, dialogs, and drag-and-drop operations for node creation.
 * It acts as the primary interface between user input and graph operations.
 *
 * @property {SpaceGraph} spaceGraph - Reference to the main {@link SpaceGraph} instance it manages.
 * @property {HTMLElement} container - The DOM element that contains the {@link SpaceGraph} visualization and to which many event listeners are attached.
 * @property {HTMLElement | null} contextMenuElement - DOM element for the main context menu. Created if not provided.
 * @property {HTMLElement | null} confirmDialogElement - DOM element for confirmation dialogs (e.g., delete node/edge). Created if not provided.
 * @property {CSS3DObject | null} edgeMenuObject - A {@link CSS3DObject} used to display a small, interactive menu near a selected {@link Edge}.
 * @property {BaseNode | null} draggedNode - The {@link BaseNode} instance currently being dragged by the user. `null` if no node is being dragged.
 * @property {HtmlNodeElement | null} resizedNode - The {@link HtmlNodeElement} instance currently being resized by the user. `null` if no node is being resized.
 * @property {Edge | null} hoveredEdge - The {@link Edge} instance currently under the mouse cursor and highlighted (if not selected). `null` otherwise.
 * @property {{x: number, y: number}} resizeStartPos - Screen coordinates (clientX, clientY) where the current resize operation started.
 * @property {{width: number, height: number}} resizeStartSize - Original width and height of the `resizedNode` when the resize operation began.
 * @property {THREE.Vector3} dragOffset - Offset vector from the `draggedNode`'s origin (position) to the actual point where the drag initiated on the node,
 *                                        used to maintain smooth dragging.
 * @property {object} pointerState - Tracks the current state of pointer (mouse/touch) interactions.
 * @property {boolean} pointerState.down - `true` if any pointer button is currently pressed down.
 * @property {boolean} pointerState.primary - `true` if the primary button (typically left mouse button) is pressed.
 * @property {boolean} pointerState.secondary - `true` if the secondary button (typically right mouse button) is pressed.
 * @property {boolean} pointerState.middle - `true` if the middle mouse button is pressed.
 * @property {boolean} pointerState.potentialClick - `true` if the current pointer interaction started as a press and hasn't involved significant movement,
 *                                                 indicating it could be a click/tap. Set to `false` on significant pointer move.
 * @property {{x: number, y: number}} pointerState.lastPos - Last recorded screen coordinates (clientX, clientY) of the pointer.
 * @property {{x: number, y: number}} pointerState.startPos - Screen coordinates where the current pointer interaction (press) started.
 * @property {function | null} confirmCallback - Stores the callback function to be executed if the user confirms an action in the `confirmDialogElement`.
 * @property {HTMLElement | null} statusIndicatorElement - DOM element used to display brief status messages or feedback to the user. Created if not provided.
 * @property {HTMLElement | null} linkingTargetPortElement - The specific {@link HTMLElement} representing a node port that is currently highlighted as a valid target during a linking operation.
 *                                                        Used internally for visual feedback.
 * @private
 */
export class UIManager {
    /** @type {SpaceGraph} */
    spaceGraph = null;
    /** @type {HTMLElement} */
    container = null;

    // UI Elements, potentially created by UIManager if not provided
    /** @type {HTMLElement | null} */
    contextMenuEl = null;
    /** @type {HTMLElement | null} */
    confirmDialogEl = null;
    /** @type {HTMLElement | null} */
    statusIndicatorEl = null;

    // Handlers for different UI aspects
    /** @type {PointerInputHandler} */
    pointerInputHandler = null;
    /** @type {KeyboardInputHandler} */
    keyboardInputHandler = null;
    /** @type {WheelInputHandler} */
    wheelInputHandler = null;
    /** @type {DragAndDropHandler} */
    dragAndDropHandler = null;
    /** @type {ContextMenuManager} */
    contextMenuManager = null;
    /** @type {LinkingManager} */
    linkingManager = null;
    /** @type {EdgeMenuManager} */
    edgeMenuManager = null;
    /** @type {DialogManager} */
    dialogManager = null;

    /** @type {Edge | null} */
    _hoveredEdge = null; // Managed by UIManager facade for handleEdgeHover

    /**
     * @typedef {object} UIElements
     * @description An optional object that can be passed to the {@link UIManager} constructor
     * to provide pre-existing DOM elements for UI components.
     * @property {HTMLElement} [contextMenuEl]
     * @property {HTMLElement} [confirmDialogEl]
     * @property {HTMLElement} [statusIndicatorEl]
     */

    constructor(spaceGraph, uiElements = {}) {
        if (!spaceGraph) {
            throw new Error('UIManager requires a SpaceGraph instance.');
        }
        this.spaceGraph = spaceGraph;
        this.container = spaceGraph.container;

        // Initialize UI elements, creating them if not provided or found
        this.contextMenuEl = uiElements.contextMenuEl || document.querySelector('#context-menu');
        if (!this.contextMenuEl || !document.body.contains(this.contextMenuEl)) {
            this.contextMenuEl = document.createElement('div');
            this.contextMenuEl.id = 'context-menu';
            this.contextMenuEl.className = 'context-menu';
            document.body.appendChild(this.contextMenuEl);
        }

        this.confirmDialogEl = uiElements.confirmDialogEl || document.querySelector('#confirm-dialog');
        if (!this.confirmDialogEl || !document.body.contains(this.confirmDialogEl)) {
            this.confirmDialogEl = document.createElement('div');
            this.confirmDialogEl.id = 'confirm-dialog';
            this.confirmDialogEl.className = 'dialog';
            this.confirmDialogEl.innerHTML =
                '<p id="confirm-message">Are you sure?</p><button id="confirm-yes">Yes</button><button id="confirm-no">No</button>';
            document.body.appendChild(this.confirmDialogEl);
        }

        this.statusIndicatorEl = uiElements.statusIndicatorEl || document.querySelector('#status-indicator');
        if (!this.statusIndicatorEl || !document.body.contains(this.statusIndicatorEl)) {
            this.statusIndicatorEl = document.createElement('div');
            this.statusIndicatorEl.id = 'status-indicator';
            document.body.appendChild(this.statusIndicatorEl);
        }

        // Instantiate new handlers, passing `this` as the facade
        this.pointerInputHandler = new PointerInputHandler(this.spaceGraph, this);
        this.keyboardInputHandler = new KeyboardInputHandler(this.spaceGraph, this);
        this.wheelInputHandler = new WheelInputHandler(this.spaceGraph, this);
        this.dragAndDropHandler = new DragAndDropHandler(this.spaceGraph, this);
        this.contextMenuManager = new ContextMenuManager(this.spaceGraph, this);
        this.linkingManager = new LinkingManager(this.spaceGraph, this);
        this.edgeMenuManager = new EdgeMenuManager(this.spaceGraph, this);
        this.dialogManager = new DialogManager(this.spaceGraph, this);

        this._bindEvents();
    }

    _bindEvents() {
        this.pointerInputHandler.bindEvents();
        this.keyboardInputHandler.bindEvents();
        this.wheelInputHandler.bindEvents();
        this.dragAndDropHandler.bindEvents();
        this.contextMenuManager.bindEvents();
        // LinkingManager, EdgeMenuManager, DialogManager are controlled by other handlers/facade calls.

        document.addEventListener('click', this._onDocumentClick.bind(this), true);
    }

    _onDocumentClick(event) {
        this.contextMenuManager.hideContextMenuIfNeeded(event);
        this.edgeMenuManager.hideEdgeMenuIfNeeded(event);
    }

    // --- Facade Methods for Sub-Managers ---
    getDomElement(name) {
        if (name === 'contextMenu') return this.contextMenuEl;
        if (name === 'confirmDialog') return this.confirmDialogEl;
        if (name === 'statusIndicator') return this.statusIndicatorEl;
        return null;
    }

    getTargetInfoForWheel(event) {
        return this.pointerInputHandler._getTargetInfo(event);
    }
    getTargetInfoForMenu(event) {
        return this.pointerInputHandler._getTargetInfo(event);
    }
    getTargetInfoForLink(event) {
        return this.pointerInputHandler._getTargetInfo(event);
    }

    showConfirmDialog(message, onConfirm) {
        this.dialogManager.showConfirm(message, onConfirm);
    }
    showStatus(message, type, duration) {
        this.dialogManager.showStatus(message, type, duration);
    }
    hideContextMenu() {
        this.contextMenuManager.hideContextMenu();
    }

    handleNodeControlButtonClick(buttonElement, node) {
        // Logic from original UIManager._handleNodeControlButtonClick
        // Assuming HtmlNodeElement is available in this scope (e.g. imported or defined in spacegraph.js)
        if (!(node instanceof HtmlNodeElement)) return;

        const actionMap = {
            'node-delete': () =>
                this.showConfirmDialog(`Delete node "${node.id.substring(0, 10)}..."?`, () =>
                    this.spaceGraph.removeNode(node.id)
                ),
            'node-content-zoom-in': () => node.adjustContentScale(1.15),
            'node-content-zoom-out': () => node.adjustContentScale(1 / 1.15),
            'node-grow': () => node.adjustNodeSize(1.2),
            'node-shrink': () => node.adjustNodeSize(0.8),
        };
        for (const cls of buttonElement.classList) {
            if (actionMap[cls]) {
                actionMap[cls]();
                break;
            }
        }
    }

    handleEdgeHover(event) {
        const { intersectedEdge } = this.pointerInputHandler._getTargetInfo(event);
        if (this._hoveredEdge !== intersectedEdge) {
            if (this._hoveredEdge && this._hoveredEdge !== this.spaceGraph.selectedEdge) {
                this._hoveredEdge.setHighlight(false);
            }
            this._hoveredEdge = intersectedEdge;
            if (this._hoveredEdge && this._hoveredEdge !== this.spaceGraph.selectedEdge) {
                this._hoveredEdge.setHighlight(true);
            }
        }
    }

    handleEscape() {
        if (this.linkingManager.isLinking()) {
            this.linkingManager.cancelLinking();
            return true;
        }
        // Check contextMenuEl style directly as ContextMenuManager doesn't expose an isVisible method
        if (this.contextMenuEl && this.contextMenuEl.style.display === 'block') {
            this.contextMenuManager.hideContextMenu();
            return true;
        }
        // Same for confirmDialogEl
        if (this.confirmDialogEl && this.confirmDialogEl.style.display === 'block') {
            this.dialogManager._hideConfirm();
            return true;
        } // DialogManager needs public hide or handles escape internally
        if (this.edgeMenuManager._edgeMenuObject) {
            this.spaceGraph.setSelectedEdge(null);
            return true;
        } // Deselecting edge hides its menu
        if (this.spaceGraph.selectedNode || this.spaceGraph.selectedEdge) {
            this.spaceGraph.setSelectedNode(null);
            this.spaceGraph.setSelectedEdge(null);
            return true;
        }
        return false;
    }

    // --- Edge Menu specific methods now part of EdgeMenuManager, but UIManager may need to trigger show/hide ---
    // Called by SpaceGraph.setSelectedEdge
    showEdgeMenu(edge) {
        this.edgeMenuManager.showEdgeMenu(edge);
    }

    hideEdgeMenu() {
        this.edgeMenuManager.hideEdgeMenu();
    }

    // Called by SpaceGraph._updateNodesAndEdges (animation loop)
    updateEdgeMenuPosition() {
        this.edgeMenuManager.update(); // EdgeMenuManager's update calls its own updateEdgeMenuPosition
    }

    // --- Linking specific methods are now part of LinkingManager, but UIManager may need to trigger cancel ---
    // Called by SpaceGraph if needed, or by KeyboardInputHandler via facade's handleEscape
    cancelLinking() {
        this.linkingManager.cancelLinking();
    }

    dispose() {
        this.pointerInputHandler.dispose();
        this.keyboardInputHandler.dispose();
        this.wheelInputHandler.dispose();
        this.dragAndDropHandler.dispose();
        this.contextMenuManager.dispose();
        this.linkingManager.dispose();
        this.edgeMenuManager.dispose();
        this.dialogManager.dispose();

        document.removeEventListener('click', this._onDocumentClick.bind(this), true);

        // Remove DOM elements if UIManager was responsible for creating them
        if (
            this.contextMenuEl &&
            this.contextMenuEl.id === 'context-menu' &&
            this.contextMenuEl.parentElement === document.body
        ) {
            this.contextMenuEl.remove();
        }
        if (
            this.confirmDialogEl &&
            this.confirmDialogEl.id === 'confirm-dialog' &&
            this.confirmDialogEl.parentElement === document.body
        ) {
            this.confirmDialogEl.remove();
        }
        if (
            this.statusIndicatorEl &&
            this.statusIndicatorEl.id === 'status-indicator' &&
            this.statusIndicatorEl.parentElement === document.body
        ) {
            this.statusIndicatorEl.remove();
        }

        this.spaceGraph = null;
        this.container = null;
        this.contextMenuEl = null;
        this.confirmDialogEl = null;
        this.statusIndicatorEl = null;
        this._hoveredEdge = null;
        console.log('UIManager (Facade) disposed.');
    }
}

/**
 * @class CameraController
 * @classdesc Manages the {@link THREE.PerspectiveCamera} for the {@link SpaceGraph},
 * enabling user interactions such as panning, zooming, and focusing on nodes.
 * It employs smooth animations (via GSAP) for camera transitions and maintains a view history
 * for "back" navigation functionality (e.g., {@link SpaceGraph#autoZoom}).
 *
 * @property {THREE.PerspectiveCamera | null} camera - The Three.js {@link THREE.PerspectiveCamera} instance being controlled.
 * @property {HTMLElement | null} domElement - The DOM element to which event listeners for camera control are attached
 *                                           (typically the {@link SpaceGraph#container}).
 * @property {boolean} isPanning - `true` if a camera pan operation (initiated by pointer drag) is currently in progress.
 * @property {THREE.Vector2} panStart - Screen coordinates (X, Y) where the current pan operation started.
 * @property {THREE.Vector3} targetPosition - The desired target position for the camera. The camera smoothly interpolates towards this.
 * @property {THREE.Vector3} targetLookAt - The desired point in 3D space for the camera to look at.
 * @property {THREE.Vector3} currentLookAt - The current point in 3D space the camera is looking at, used for smooth interpolation during `_updateLoop`.
 * @property {number} zoomSpeed - Multiplier for camera zoom sensitivity. Configurable via constructor. Default: `0.0015`.
 * @property {number} panSpeed - Multiplier for camera panning sensitivity. Configurable via constructor. Default: `0.8`.
 * @property {number} minZoom - Minimum distance the camera can zoom in towards its `targetLookAt` point. Default: `20`.
 * @property {number} maxZoom - Maximum distance the camera can zoom out from its `targetLookAt` point. Default: `15000`.
 * @property {number} dampingFactor - Factor for smoothing camera movements (linear interpolation). Higher values result in faster interpolation.
 *                                  Configurable via constructor. Default: `0.12`.
 * @property {number | null} animationFrameId - ID of the current `requestAnimationFrame` used for the `_updateLoop`. `null` if the loop is not active.
 * @property {Array<{position: THREE.Vector3, lookAt: THREE.Vector3, targetNodeId: string | null}>} viewHistory -
 *           Stack storing previous camera states (position, lookAt point, and optionally the ID of the focused node)
 *           to enable "back" navigation ({@link CameraController#popState}).
 * @property {number} maxHistory - Maximum number of states to store in `viewHistory`. Default: `20`.
 * @property {string | null} currentTargetNodeId - The ID of the {@link BaseNode} currently targeted by an auto-zoom operation ({@link SpaceGraph#autoZoom}).
 *                                                `null` if no specific node is targeted.
 * @property {{position: THREE.Vector3, lookAt: THREE.Vector3} | null} initialState -
 *           The initial camera position and look-at point, captured by {@link CameraController#setInitialState}.
 *           Used by {@link CameraController#resetView}.
 */
export class CameraController {
    /** @type {THREE.PerspectiveCamera | null} */
    camera = null;
    /** @type {HTMLElement | null} */
    domElement = null;
    /** @type {boolean} */
    isPanning = false;
    /** @type {THREE.Vector2} */
    panStart = new THREE.Vector2();
    /** @type {THREE.Vector3} */
    targetPosition = new THREE.Vector3();
    /** @type {THREE.Vector3} */
    targetLookAt = new THREE.Vector3();
    /** @type {THREE.Vector3} */
    currentLookAt = new THREE.Vector3();
    /** @type {number} */
    zoomSpeed = 0.0015;
    /** @type {number} */
    panSpeed = 0.8;
    /** @type {number} */
    minZoom = 20;
    /** @type {number} */
    maxZoom = 15000;
    /** @type {number} */
    dampingFactor = 0.12;
    /** @type {number | null} */
    animationFrameId = null;
    /** @type {Array<{position: THREE.Vector3, lookAt: THREE.Vector3, targetNodeId: string | null}>} */
    viewHistory = [];
    /** @type {number} */
    maxHistory = 20;
    /** @type {string | null} */
    currentTargetNodeId = null;
    /** @type {{position: THREE.Vector3, lookAt: THREE.Vector3} | null} */
    initialState = null;

    /**
     * Creates an instance of CameraController.
     *
     * @constructor
     * @param {THREE.PerspectiveCamera} threeCamera - The Three.js {@link THREE.PerspectiveCamera} to control.
     * @param {HTMLElement} domElement - The DOM element to which pointer event listeners for camera control will be attached.
     * @param {object} [config={}] - Optional configuration object to override default camera control settings.
     * @param {number} [config.zoomSpeed=0.0015] - Zoom sensitivity.
     * @param {number} [config.panSpeed=0.8] - Panning sensitivity.
     * @param {number} [config.dampingFactor=0.12] - Movement smoothing factor.
     * @param {number} [config.minZoom=20] - Minimum zoom distance.
     * @param {number} [config.maxZoom=15000] - Maximum zoom distance.
     * @example
     * const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 20000);
     * const graphContainer = document.getElementById('graph-container');
     * const cameraController = new CameraController(camera, graphContainer, { zoomSpeed: 0.002 });
     */
    constructor(threeCamera, domElement, config = {}) {
        this.camera = threeCamera;
        this.domElement = domElement;

        this.zoomSpeed = config.zoomSpeed ?? this.zoomSpeed;
        this.panSpeed = config.panSpeed ?? this.panSpeed;
        this.dampingFactor = config.dampingFactor ?? this.dampingFactor;
        this.minZoom = config.minZoom ?? this.minZoom;
        this.maxZoom = config.maxZoom ?? this.maxZoom;

        this.targetPosition.copy(this.camera.position);
        // Assume initial lookAt is towards the origin from the camera's initial Z position,
        // or a point on the Z=0 plane directly "in front" of the camera.
        this.targetLookAt.set(this.camera.position.x, this.camera.position.y, 0);
        this.currentLookAt.copy(this.targetLookAt);
        this._updateLoop(); // Start the continuous update (interpolation) loop.
    }

    /**
     * Stores the current camera's target position and look-at point as the `initialState`.
     * This state is used by {@link CameraController#resetView} to return the camera to a known configuration.
     * Typically called once after the initial camera setup or a significant view change that should be considered "home".
     */
    setInitialState() {
        if (!this.initialState) {
            this.initialState = {
                position: this.targetPosition.clone(), // Current target, not actual camera position, for consistency
                lookAt: this.targetLookAt.clone(),
            };
        }
    }

    /**
     * Initiates a camera pan operation based on a pointer event (typically primary button drag).
     * Sets `isPanning` to `true` and records the starting pointer position.
     * Kills any ongoing GSAP animations for `targetPosition` and `targetLookAt` to allow manual control.
     *
     * @param {PointerEvent} event - The DOM {@link PointerEvent} that started the pan (e.g., `pointerdown`).
     */
    startPan(event) {
        if (event.button !== 0 || this.isPanning) return; // Only pan with primary button, not if already panning.
        this.isPanning = true;
        this.panStart.set(event.clientX, event.clientY);
        this.domElement.classList.add('panning'); // For cursor styling via CSS.
        gsap.killTweensOf(this.targetPosition); // Stop programmatic movements.
        gsap.killTweensOf(this.targetLookAt);
        this.currentTargetNodeId = null; // Panning clears any specific node focus from autoZoom.
    }

    /**
     * Updates the camera's `targetPosition` and `targetLookAt` during a pan operation.
     * Calculates the pan offset based on pointer movement and current camera distance/FOV for a more intuitive feel.
     *
     * @param {PointerEvent} event - The DOM {@link PointerEvent} during pointer movement (e.g., `pointermove`).
     */
    pan(event) {
        if (!this.isPanning) return;

        const deltaX = event.clientX - this.panStart.x;
        const deltaY = event.clientY - this.panStart.y;

        // Calculate pan amount based on camera distance to the look-at point and field of view.
        // This makes panning feel more consistent regardless of zoom level.
        const cameraToLookAtDistance = this.camera.position.distanceTo(this.currentLookAt);
        const verticalFovRadians = this.camera.fov * DEG2RAD;
        const viewPlaneHeightAtLookAt = 2 * Math.tan(verticalFovRadians / 2) * Math.max(1, cameraToLookAtDistance); // Effective height of the view plane.
        const viewportHeight = this.domElement.clientHeight || window.innerHeight;

        const panXAmount = -(deltaX / viewportHeight) * viewPlaneHeightAtLookAt * this.panSpeed;
        const panYAmount = (deltaY / viewportHeight) * viewPlaneHeightAtLookAt * this.panSpeed;

        // Get camera's local right and up vectors to pan relative to camera orientation.
        const rightVector = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
        const upVector = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
        const panOffset = rightVector.multiplyScalar(panXAmount).add(upVector.multiplyScalar(panYAmount));

        this.targetPosition.add(panOffset);
        this.targetLookAt.add(panOffset); // Pan the look-at point along with the camera position for an orbital pan.
        this.panStart.set(event.clientX, event.clientY); // Update pan start for the next delta calculation.
    }

    /**
     * Ends the current camera pan operation by setting `isPanning` to `false` and removing panning-specific CSS classes.
     */
    endPan() {
        if (this.isPanning) {
            this.isPanning = false;
            this.domElement.classList.remove('panning');
        }
    }

    /**
     * Zooms the camera in or out based on a wheel event. The zoom is directed towards the
     * mouse cursor's projection on the current `targetLookAt` plane, creating a "zoom to cursor" effect.
     * Kills any ongoing GSAP animations for smooth user-controlled zoom.
     *
     * @param {WheelEvent} event - The DOM {@link WheelEvent}.
     */
    zoom(event) {
        gsap.killTweensOf(this.targetPosition); // Stop programmatic zoom/move.
        gsap.killTweensOf(this.targetLookAt);
        this.currentTargetNodeId = null; // User zoom clears specific node focus.

        const zoomDelta = -event.deltaY * this.zoomSpeed;
        const currentDistance = this.targetPosition.distanceTo(this.targetLookAt);
        // Exponential zoom factor for smoother feel at different zoom levels.
        let newDistance = currentDistance * Math.pow(0.95, zoomDelta * 12);
        newDistance = clamp(newDistance, this.minZoom, this.maxZoom); // Apply zoom limits.
        const zoomAmount = newDistance - currentDistance;

        // Determine zoom direction: towards mouse cursor on the look-at plane, or camera's forward if no intersection.
        const mouseWorldPosition = this._getLookAtPlaneIntersection(event.clientX, event.clientY);
        const zoomDirection = new THREE.Vector3();
        if (mouseWorldPosition) {
            // Zoom towards the point on the look-at plane under the mouse cursor.
            zoomDirection.copy(mouseWorldPosition).sub(this.targetPosition).normalize();
        } else {
            // Fallback: zoom along the camera's current view direction.
            this.camera.getWorldDirection(zoomDirection);
        }
        this.targetPosition.addScaledVector(zoomDirection, zoomAmount);
    }

    /**
     * Calculates the intersection point of a ray cast from screen coordinates (e.g., mouse cursor)
     * with the plane defined by the camera's current `targetLookAt` point and oriented perpendicular
     * to the camera's view direction. This is useful for "zoom to cursor" or placing objects on that plane.
     *
     * @param {number} screenX - The X-coordinate on the screen (e.g., `event.clientX`).
     * @param {number} screenY - The Y-coordinate on the screen (e.g., `event.clientY`).
     * @returns {THREE.Vector3 | null} The intersection point in world space, or `null` if no intersection occurs (rare for a plane).
     * @private
     */
    _getLookAtPlaneIntersection(screenX, screenY) {
        // Normalize screen coordinates to NDC (-1 to +1 range)
        const normalizedScreenCoords = new THREE.Vector3(
            (screenX / window.innerWidth) * 2 - 1,
            -(screenY / window.innerHeight) * 2 + 1,
            0.5 // Z-component for ray direction in NDC space (0.5 is between near and far plane)
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(normalizedScreenCoords, this.camera);

        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);

        // Create a plane that is normal to the camera's viewing direction and passes through the targetLookAt point.
        const lookAtPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
            cameraDirection.negate(),
            this.targetLookAt
        );

        const intersectionPoint = new THREE.Vector3();
        return raycaster.ray.intersectPlane(lookAtPlane, intersectionPoint) ? intersectionPoint : null;
    }

    /**
     * Smoothly animates the camera to a specified target position and updates its look-at point.
     * Uses GSAP for tweening. Any existing camera animations are interrupted.
     *
     * @param {number} x - Target X-coordinate for the camera's position.
     * @param {number} y - Target Y-coordinate for the camera's position.
     * @param {number} z - Target Z-coordinate for the camera's position.
     * @param {number} [duration=0.7] - Duration of the animation in seconds.
     * @param {THREE.Vector3 | null} [lookAtTarget=null] - Optional new point for the camera to look at.
     *                                                    If `null`, the look-at point defaults to `(x, y, 0)`
     *                                                    (a point on the Z=0 plane directly "under" the new camera X,Y).
     * @example
     * // Move camera to (100, 200, 500) looking at world origin over 1 second
     * cameraController.moveTo(100, 200, 500, 1, new THREE.Vector3(0,0,0));
     * // Move camera to (0,0,800) looking at (0,0,0) (default lookAt behavior)
     * cameraController.moveTo(0,0,800);
     */
    moveTo(x, y, z, duration = 0.7, lookAtTarget = null) {
        this.setInitialState(); // Ensure initial state is captured if this is the first significant move.
        const targetPositionVec = new THREE.Vector3(x, y, z);
        // Default lookAt to a point on Z=0 plane below the camera's new X,Y, or use the specified target.
        const targetLookAtVec = lookAtTarget
            ? lookAtTarget.clone()
            : new THREE.Vector3(targetPositionVec.x, targetPositionVec.y, 0);

        gsap.killTweensOf(this.targetPosition); // Interrupt existing position animations.
        gsap.killTweensOf(this.targetLookAt); // Interrupt existing look-at animations.

        gsap.to(this.targetPosition, {
            x: targetPositionVec.x,
            y: targetPositionVec.y,
            z: targetPositionVec.z,
            duration,
            ease: 'power3.out', // Smooth easing function
            overwrite: true, // Overwrite any conflicting tweens on the same properties
        });
        gsap.to(this.targetLookAt, {
            x: targetLookAtVec.x,
            y: targetLookAtVec.y,
            z: targetLookAtVec.z,
            duration,
            ease: 'power3.out',
            overwrite: true,
        });
    }

    /**
     * Resets the camera to its `initialState` (position and look-at point) if set,
     * otherwise to a default俯瞰view (0,0,700) looking at origin.
     * Clears the view history and any current target node ID.
     *
     * @param {number} [duration=0.7] - Duration of the reset animation in seconds.
     */
    resetView(duration = 0.7) {
        if (this.initialState) {
            this.moveTo(
                this.initialState.position.x,
                this.initialState.position.y,
                this.initialState.position.z,
                duration,
                this.initialState.lookAt
            );
        } else {
            // Fallback to a default俯瞰view if initialState was somehow not set.
            this.moveTo(0, 0, 700, duration, new THREE.Vector3(0, 0, 0));
        }
        this.viewHistory = []; // Clear navigation history.
        this.currentTargetNodeId = null; // Clear any auto-zoom target.
    }

    /**
     * Pushes the current camera's target state (position, look-at point, and `currentTargetNodeId`)
     * onto the `viewHistory` stack. This enables "back" navigation ({@link CameraController#popState}).
     * If the history exceeds `maxHistory`, the oldest state is removed.
     */
    pushState() {
        if (this.viewHistory.length >= this.maxHistory) {
            this.viewHistory.shift(); // Remove the oldest state to maintain max history size.
        }
        this.viewHistory.push({
            position: this.targetPosition.clone(),
            lookAt: this.targetLookAt.clone(),
            targetNodeId: this.currentTargetNodeId,
        });
    }

    /**
     * Pops a state from the `viewHistory` and smoothly moves the camera to that state.
     * If the history is empty, it calls {@link CameraController#resetView}.
     * Restores `currentTargetNodeId` from the popped state.
     *
     * @param {number} [duration=0.6] - Duration of the animation to the previous state, in seconds.
     */
    popState(duration = 0.6) {
        if (this.viewHistory.length > 0) {
            const prevState = this.viewHistory.pop();
            this.moveTo(prevState.position.x, prevState.position.y, prevState.position.z, duration, prevState.lookAt);
            this.currentTargetNodeId = prevState.targetNodeId; // Restore the focused node ID associated with the popped state.
        } else {
            this.resetView(duration); // If no history, reset to the initial/default view.
        }
    }

    /**
     * Returns the ID of the node currently targeted by an auto-zoom operation, if any.
     * @returns {string | null} The ID of the currently targeted {@link BaseNode}, or `null`.
     */
    getCurrentTargetNodeId = () => this.currentTargetNodeId;

    /**
     * Sets the ID of the node currently targeted by an auto-zoom operation.
     * This is typically used by {@link SpaceGraph#autoZoom}.
     * @param {string | null} nodeId - The ID of the {@link BaseNode} to target, or `null` to clear the target.
     */
    setCurrentTargetNodeId = (nodeId) => {
        this.currentTargetNodeId = nodeId;
    };

    /**
     * The main update loop for the camera controller, driven by `requestAnimationFrame`.
     * It smoothly interpolates the camera's actual `position` and `currentLookAt` point
     * towards their respective target values (`targetPosition`, `targetLookAt`) using a damping factor.
     * This creates smooth, continuous camera movements.
     * If the camera is very close to its target and no GSAP animations are active, it snaps to the target
     * to prevent minute, perpetual interpolations.
     * @private
     */
    _updateLoop = () => {
        const positionDelta = this.targetPosition.distanceTo(this.camera.position);
        const lookAtDelta = this.targetLookAt.distanceTo(this.currentLookAt);

        // Only interpolate if there's a significant difference, or if panning (which updates targets directly and continuously).
        if (positionDelta > 0.01 || lookAtDelta > 0.01 || this.isPanning) {
            this.camera.position.lerp(this.targetPosition, this.dampingFactor);
            this.currentLookAt.lerp(this.targetLookAt, this.dampingFactor);
            this.camera.lookAt(this.currentLookAt);
        } else if (!gsap.isTweening(this.targetPosition) && !gsap.isTweening(this.targetLookAt)) {
            // If very close to target and no GSAP animation is running for either target,
            // snap to the target values to avoid tiny, perpetual interpolations ("drifting").
            if (positionDelta > 0 || lookAtDelta > 0) {
                // Check if not already exactly at target
                this.camera.position.copy(this.targetPosition);
                this.currentLookAt.copy(this.targetLookAt);
                this.camera.lookAt(this.currentLookAt);
            }
        }
        this.animationFrameId = requestAnimationFrame(this._updateLoop);
    };

    /**
     * Cleans up resources used by the CameraController.
     * Cancels any pending `requestAnimationFrame` for the update loop and kills any active GSAP tweens
     * controlling the camera's target position or look-at point.
     * Nullifies references to the camera and DOM element.
     */
    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        gsap.killTweensOf(this.targetPosition); // Stop any GSAP animations on targetPosition.
        gsap.killTweensOf(this.targetLookAt); // Stop any GSAP animations on targetLookAt.

        this.camera = null;
        this.domElement = null;
        this.viewHistory = []; // Clear history.
        console.log('CameraController disposed.');
    }
}

/**
 * @class ForceLayout
 * @classdesc Implements a physics-based force-directed layout algorithm to arrange nodes and edges
 * within a {@link SpaceGraph}. It simulates forces such as repulsion between nodes,
 * attraction along edges (springs), and a centering force (gravity).
 * The simulation runs iteratively, updating node positions until the system's energy falls below a threshold or it's manually stopped.
 *
 * @property {SpaceGraph | null} spaceGraph - Reference to the parent {@link SpaceGraph} instance.
 * @property {BaseNode[]} nodes - Array of {@link BaseNode} instances currently included in the layout simulation.
 * @property {Edge[]} edges - Array of {@link Edge} instances currently included in the layout simulation.
 * @property {Map<string, THREE.Vector3>} velocities - Map storing the current velocity vector for each node, keyed by node ID.
 *                                                    Velocities are updated each simulation step.
 * @property {Set<BaseNode>} fixedNodes - A {@link Set} of {@link BaseNode}s that are fixed in position.
 *                                       These nodes are not affected by layout forces but still exert forces on other nodes.
 * @property {boolean} isRunning - `true` if the layout simulation is currently active and performing calculations.
 * @property {number | null} animationFrameId - ID of the `requestAnimationFrame` used for the simulation loop. `null` if not running.
 * @property {number} energy - Current total kinetic energy of the system. Used to determine if the layout has stabilized.
 *                             The simulation may auto-stop if energy is below `settings.minEnergyThreshold`.
 * @property {number} lastKickTime - Timestamp (from `Date.now()`) of the last time the layout was "kicked"
 *                                  (e.g., via {@link ForceLayout#kick} or when nodes/edges are added/removed).
 *                                  Used with `settings.autoStopDelay` to manage auto-stopping.
 * @property {number | null} autoStopTimeout - Timeout ID for automatically stopping the simulation when energy remains low
 *                                            for a certain duration after the last kick.
 * @property {object} settings - Configuration settings for the force layout algorithm.
 * @property {number} settings.repulsion - Strength of the repulsive force between nodes (Coulomb's law analogy). Higher values push nodes further apart. Default: `3000`.
 * @property {number} settings.attraction - Base attraction strength (spring stiffness) for 'elastic' edges. Default: `0.001`.
 *                                          This value is used to initialize `settings.defaultElasticStiffness`. Its effect is combined with edge-specific stiffness.
 * @property {number} settings.idealEdgeLength - Default ideal resting length for 'elastic' edges, used if not specified on the edge itself. Default: `200`.
 *                                                This is a target length that elastic edges will try to achieve. This value is used to initialize `settings.defaultElasticIdealLength`.
 * @property {number} settings.centerStrength - Strength of the force pulling all nodes towards `settings.gravityCenter`. Default: `0.0005`.
 * @property {number} settings.damping - Damping factor applied to node velocities each step, reducing oscillations and helping the system stabilize.
 *                                     Value typically between 0 (no movement) and 1 (no damping). Default: `0.92`.
 * @property {number} settings.minEnergyThreshold - Kinetic energy level below which the simulation is considered stable and may auto-stop. Default: `0.1`.
 * @property {THREE.Vector3} settings.gravityCenter - The {@link THREE.Vector3} point in world space towards which the `centerStrength` force pulls nodes. Default: `(0,0,0)`.
 * @property {number} settings.zSpreadFactor - Multiplier for forces in the Z direction. Values less than 1 reduce Z-axis movement,
 *                                           encouraging a more 2.5D or planar layout. Default: `0.15`.
 * @property {number} settings.autoStopDelay - Milliseconds to wait after a `kick` before the simulation can auto-stop if energy is low. Default: `4000`.
 * @property {number} settings.nodePadding - Factor to multiply a node's {@link BaseNode#getBoundingSphereRadius} by when calculating repulsion.
 *                                          Acts as padding to prevent nodes from getting too close. Default: `1.2`.
 * @property {number} settings.defaultElasticStiffness - Default stiffness for 'elastic' edges if not specified in {@link Edge#data}.
 *                                                       Initialized from `settings.attraction`.
 * @property {number} settings.defaultElasticIdealLength - Default ideal length for 'elastic' edges if not specified in {@link Edge#data}.
 *                                                          Initialized from `settings.idealEdgeLength`.
 * @property {number} settings.defaultRigidStiffness - Default stiffness for 'rigid' edges if not specified. Default: `0.1`.
 * @property {number} settings.defaultWeldStiffness - Default stiffness for 'weld' edges if not specified. Default: `0.5`.
 */
export class ForceLayout {
    /** @type {SpaceGraph | null} */
    spaceGraph = null;
    /** @type {BaseNode[]} */
    nodes = [];
    /** @type {Edge[]} */
    edges = [];
    /** @type {Map<string, THREE.Vector3>} */
    velocities = new Map();
    /** @type {Set<BaseNode>} */
    fixedNodes = new Set();
    /** @type {boolean} */
    isRunning = false;
    /** @type {number | null} */
    animationFrameId = null;
    /** @type {number} */
    energy = Infinity;
    /** @type {number} */
    lastKickTime = 0;
    /** @type {number | null} */
    autoStopTimeout = null;

    /** @type {object} */
    settings = {
        repulsion: 3000,
        attraction: 0.001,
        idealEdgeLength: 200,
        centerStrength: 0.0005,
        damping: 0.92,
        minEnergyThreshold: 0.1,
        gravityCenter: new THREE.Vector3(0, 0, 0),
        zSpreadFactor: 0.15,
        autoStopDelay: 4000, // ms
        nodePadding: 1.2,
        defaultElasticStiffness: 0.001,
        defaultElasticIdealLength: 200,
        defaultRigidStiffness: 0.1,
        defaultWeldStiffness: 0.5,
    };

    /**
     * Creates an instance of ForceLayout.
     *
     * @constructor
     * @param {SpaceGraph} spaceGraphInstance - The {@link SpaceGraph} instance this layout engine will operate on.
     * @param {Partial<ForceLayout['settings']>} [config={}] - Optional configuration object to override default layout settings.
     *                                               See `this.settings` property for all available options.
     * @example
     * const layout = new ForceLayout(spaceGraphInstance, { repulsion: 4000, damping: 0.9 });
     */
    constructor(spaceGraphInstance, config = {}) {
        this.spaceGraph = spaceGraphInstance;
        // Merge provided config with default settings
        this.settings = { ...this.settings, ...config };
        // Ensure default elastic parameters are initialized or updated if general attraction/idealEdgeLength were part of 'config'.
        // If 'config.attraction' is provided, it updates 'defaultElasticStiffness'.
        // If 'config.idealEdgeLength' is provided, it updates 'defaultElasticIdealLength'.
        // These defaults are used for edges of type 'elastic' if they don't specify their own stiffness/idealLength.
        this.settings.defaultElasticStiffness = this.settings.attraction ?? this.settings.defaultElasticStiffness;
        this.settings.defaultElasticIdealLength = this.settings.idealEdgeLength ?? this.settings.defaultElasticIdealLength;
        // Default stiffness for rigid and weld constraints are typically independent of the general 'attraction' or 'idealEdgeLength'
        // for elastic springs, so they retain their specific defaults unless overridden in 'config'.
    }

    /**
     * Adds a node to the layout simulation. Initializes its velocity if it's not already tracked.
     * Calls {@link ForceLayout#kick} to potentially energize the simulation.
     *
     * @param {BaseNode} node - The {@link BaseNode} instance to add.
     * @public
     * @example
     * const newNode = spaceGraph.addNode({ type: 'shape', id: 'n1', x: 0, y: 0 });
     * // spaceGraph.addNode internally calls layoutEngine.addNode(newNode);
     */
    addNode(node) {
        if (!this.velocities.has(node.id)) {
            this.nodes.push(node);
            this.velocities.set(node.id, new THREE.Vector3());
            this.kick(); // Add some energy to integrate the new node
        }
    }

    /**
     * Removes a node from the layout simulation. Also removes it from the `fixedNodes` set if present.
     * If the number of nodes becomes less than 2, the simulation might be stopped.
     * Calls {@link ForceLayout#kick} to adjust the layout.
     *
     * @param {BaseNode} node - The {@link BaseNode} instance to remove.
     * @public
     * @example
     * // spaceGraph.removeNode internally calls layoutEngine.removeNode(nodeInstance);
     */
    removeNode(node) {
        this.nodes = this.nodes.filter((n) => n !== node);
        this.velocities.delete(node.id);
        this.fixedNodes.delete(node);
        if (this.nodes.length < 2 && this.isRunning) this.stop();
        else this.kick();
    }

    /**
     * Adds an edge to the layout simulation. Edges define attractive forces between nodes.
     * Calls {@link ForceLayout#kick} to potentially energize the simulation.
     *
     * @param {Edge} edge - The {@link Edge} instance to add.
     * @public
     * @example
     * const nodeA = spaceGraph.getNodeById('a');
     * const nodeB = spaceGraph.getNodeById('b');
     * const newEdge = spaceGraph.addEdge(nodeA, nodeB);
     * // spaceGraph.addEdge internally calls layoutEngine.addEdge(newEdge);
     */
    addEdge(edge) {
        if (!this.edges.includes(edge)) {
            this.edges.push(edge);
            this.kick();
        }
    }

    /**
     * Removes an edge from the layout simulation.
     * Calls {@link ForceLayout#kick} to adjust the layout.
     *
     * @param {Edge} edge - The {@link Edge} instance to remove.
     * @public
     * @example
     * // spaceGraph.removeEdge internally calls layoutEngine.removeEdge(edgeInstance);
     */
    removeEdge(edge) {
        this.edges = this.edges.filter((e) => e !== edge);
        this.kick();
    }

    /**
     * Fixes a {@link BaseNode}'s position, preventing it from being moved by layout forces.
     * The node's velocity is set to zero. Fixed nodes still exert forces on other nodes.
     *
     * @param {BaseNode} node - The {@link BaseNode} to fix in position.
     * @public
     * @example
     * const specialNode = spaceGraph.getNodeById('special');
     * if (specialNode) spaceGraph.layoutEngine.fixNode(specialNode);
     */
    fixNode(node) {
        this.fixedNodes.add(node);
        this.velocities.get(node.id)?.set(0, 0, 0);
    }

    /**
     * Releases a previously fixed {@link BaseNode}, allowing it to be moved by layout forces again.
     *
     * @param {BaseNode} node - The {@link BaseNode} to release.
     * @public
     * @example
     * const specialNode = spaceGraph.getNodeById('special');
     * if (specialNode) spaceGraph.layoutEngine.releaseNode(specialNode);
     */
    releaseNode(node) {
        this.fixedNodes.delete(node);
    }

    /**
     * Runs a fixed number of simulation steps ({@link ForceLayout#_calculateStep}).
     * This is typically used for initial layout stabilization when a graph is first loaded,
     * or after significant structural changes if continuous simulation is not desired.
     * The simulation stops early if the system's energy falls below `settings.minEnergyThreshold`.
     * After the steps, it ensures the graph's visuals are updated.
     *
     * @param {number} [steps=100] - The number of simulation steps to run.
     * @public
     * @example
     * // After loading a large graph:
     * spaceGraph.layoutEngine.stop(); // Ensure it's not running continuously
     * spaceGraph.layoutEngine.runOnce(150); // Perform 150 layout iterations
     */
    runOnce(steps = 100) {
        console.log(`ForceLayout: Running ${steps} initial steps...`);
        let i = 0;
        for (; i < steps; i++) {
            if (this._calculateStep() < this.settings.minEnergyThreshold) break; // Stop if system stabilizes early
        }
        console.log(`ForceLayout: Initial steps completed after ${i} iterations.`);
        this.spaceGraph._updateNodesAndEdges(); // Ensure graph visuals reflect final positions
    }

    /**
     * Starts the continuous layout simulation loop using `requestAnimationFrame`.
     * The simulation calculates forces and updates node positions in each frame.
     * It automatically stops if the system's kinetic energy (`this.energy`) falls below
     * `settings.minEnergyThreshold` for a duration defined by `settings.autoStopDelay`
     * after the last {@link ForceLayout#kick}.
     * Does nothing if already running or if there are fewer than two nodes.
     * @public
     * @example
     * spaceGraph.layoutEngine.start();
     */
    start() {
        if (this.isRunning || this.nodes.length < 2) return; // Don't start if already running or too few nodes
        console.log('ForceLayout: Starting simulation.');
        this.isRunning = true;
        this.lastKickTime = Date.now();
        const loop = () => {
            if (!this.isRunning) return;
            this.energy = this._calculateStep();
            // Check for auto-stop condition
            if (
                this.energy < this.settings.minEnergyThreshold &&
                Date.now() - this.lastKickTime > this.settings.autoStopDelay
            ) {
                this.stop();
            } else {
                this.animationFrameId = requestAnimationFrame(loop);
            }
        };
        this.animationFrameId = requestAnimationFrame(loop);
    }

    /**
     * Stops the continuous layout simulation.
     * Cancels the `requestAnimationFrame` loop and any pending auto-stop timeout.
     * @public
     * @example
     * spaceGraph.layoutEngine.stop();
     */
    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        clearTimeout(this.autoStopTimeout); // Clear any pending auto-stop
        this.animationFrameId = null;
        this.autoStopTimeout = null;
        console.log('ForceLayout: Simulation stopped. Energy:', this.energy?.toFixed(4));
    }

    /**
     * "Kicks" the layout by adding a small random velocity to all non-fixed nodes.
     * This helps to escape local energy minima, re-energize a stalled simulation,
     * or integrate new nodes/edges smoothly.
     * It resets `this.energy` to `Infinity` and `this.lastKickTime` to now.
     * If the simulation is not running and there are nodes, it starts the simulation.
     * It also resets the auto-stop timer.
     *
     * @param {number} [intensity=1] - Multiplier for the kick strength. Higher values result in a stronger kick.
     * @public
     * @example
     * spaceGraph.layoutEngine.kick(1.5); // Give a stronger kick
     */
    kick(intensity = 1) {
        if (this.nodes.length === 0) return;
        this.lastKickTime = Date.now();
        this.energy = Infinity; // Reset energy and kick time
        this.nodes.forEach((node) => {
            if (!this.fixedNodes.has(node)) {
                this.velocities.get(node.id)?.add(
                    new THREE.Vector3(
                        Math.random() - 0.5,
                        Math.random() - 0.5,
                        (Math.random() - 0.5) * this.settings.zSpreadFactor
                    )
                        .normalize()
                        .multiplyScalar(intensity * (1 + Math.random() * 2)) // Add some randomness to kick strength
                );
            }
        });
        if (!this.isRunning) this.start();
        // Reset auto-stop timer
        clearTimeout(this.autoStopTimeout);
        this.autoStopTimeout = setTimeout(() => {
            if (this.isRunning && this.energy < this.settings.minEnergyThreshold) this.stop();
        }, this.settings.autoStopDelay);
    }

    /**
     * Updates the layout engine's settings with new values.
     * Merges the `newSettings` object with the current `this.settings`.
     * Propagates general settings like `attraction` and `idealEdgeLength` to specific
     * default elastic constraint parameters. Calls {@link ForceLayout#kick} to
     * re-energize the simulation with the new settings.
     *
     * @param {Partial<ForceLayout['settings']>} newSettings - An object containing settings to update.
     *                                                        Only provided properties will be changed.
     * @public
     * @example
     * spaceGraph.layoutEngine.setSettings({
     *   repulsion: 5000,
     *   damping: 0.9,
     *   zSpreadFactor: 0.1
     * });
     */
    setSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        // Propagate relevant general settings to specific defaults if they were updated
        if (newSettings.attraction !== undefined) {
            this.settings.defaultElasticStiffness = newSettings.attraction;
        }
        if (newSettings.idealEdgeLength !== undefined) {
            this.settings.defaultElasticIdealLength = newSettings.idealEdgeLength;
        }
        // Other settings like defaultRigidStiffness and defaultWeldStiffness are updated if directly provided in newSettings.
        // These are typically distinct from the elastic spring parameters.
        console.log('ForceLayout settings updated:', this.settings);
        this.kick(); // Re-energize simulation with new settings
    }

    /**
     * Calculates one step (iteration) of the force-directed layout algorithm.
     * This method performs the core physics simulation:
     * 1. Initializes forces for all nodes to zero.
     * 2. Calculates repulsive forces between all pairs of nodes (Coulomb's law analogy),
     *    considering node sizes ({@link BaseNode#getBoundingSphereRadius} and `settings.nodePadding`)
     *    to prevent overlap.
     * 3. Calculates attractive forces along edges (Hooke's law / spring forces), based on
     *    the edge's `constraintType` ('elastic', 'rigid', 'weld') and its associated parameters
     *    (stiffness, ideal length/distance).
     * 4. Applies a centering force (gravity) pulling all nodes towards `settings.gravityCenter`.
     * 5. Updates node velocities based on the calculated net forces and node mass (`node.mass`).
     * 6. Applies damping (`settings.damping`) to velocities to help stabilize the system.
     * 7. Caps node speeds to prevent instability.
     * 8. Updates node positions (`node.position`) based on their new velocities.
     * 9. Calculates the total kinetic energy of the system.
     *
     * Forces in the Z-dimension are scaled by `settings.zSpreadFactor` to control the layout's depth.
     *
     * @returns {number} The total kinetic energy of the system after this step. This value is used
     *                   to determine if the layout has stabilized (see `settings.minEnergyThreshold`).
     * @private
     */
    _calculateStep() {
        if (this.nodes.length < 2 && this.edges.length === 0) return 0; // Not enough elements for forces
        let totalSystemEnergy = 0;
        // Initialize forces for each node
        const forces = new Map(this.nodes.map((node) => [node.id, new THREE.Vector3()]));
        const { repulsion, centerStrength, gravityCenter, zSpreadFactor, damping, nodePadding } = this.settings;
        const tempDelta = new THREE.Vector3(); // Reusable vector for delta calculations

        // Calculate repulsive forces between all pairs of nodes
        for (let i = 0; i < this.nodes.length; i++) {
            const nodeA = this.nodes[i];
            for (let j = i + 1; j < this.nodes.length; j++) {
                const nodeB = this.nodes[j];
                tempDelta.subVectors(nodeB.position, nodeA.position);
                let distSq = tempDelta.lengthSq();
                if (distSq < 1e-4) {
                    // Avoid division by zero or extreme forces if nodes are too close
                    distSq = 1e-4;
                    tempDelta.randomDirection().multiplyScalar(0.01); // Add a tiny random offset
                }
                const dist = Math.sqrt(distSq);
                // Consider node sizes for repulsion (collision avoidance)
                const radiusA = nodeA.getBoundingSphereRadius() * nodePadding;
                const radiusB = nodeB.getBoundingSphereRadius() * nodePadding;
                const combinedRadius = radiusA + radiusB;
                const overlap = combinedRadius - dist;

                let forceMag = -repulsion / distSq; // Standard Coulomb repulsion
                if (overlap > 0) {
                    // Add extra repulsion if nodes overlap
                    forceMag -= (repulsion * Math.pow(overlap, 2) * 0.01) / dist; // Stronger force for overlap
                }
                const forceVec = tempDelta.normalize().multiplyScalar(forceMag);
                forceVec.z *= zSpreadFactor; // Apply Z-spread factor
                if (!this.fixedNodes.has(nodeA)) forces.get(nodeA.id)?.add(forceVec);
                if (!this.fixedNodes.has(nodeB)) forces.get(nodeB.id)?.sub(forceVec); // Newton's third law
            }
        }

        // Calculate attractive forces for edges (spring forces)
        this.edges.forEach((edge) => {
            const { source, target, data: edgeData } = edge;
            if (!source || !target || !this.velocities.has(source.id) || !this.velocities.has(target.id)) return; // Ensure nodes exist
            tempDelta.subVectors(target.position, source.position);
            const distance = tempDelta.length() + 1e-6; // Add epsilon to prevent division by zero
            let forceMag = 0;
            const params = edgeData.constraintParams || {};
            const type = edgeData.constraintType || 'elastic';

            switch (type) {
                case 'rigid': {
                    const targetDist = params.distance ?? source.position.distanceTo(target.position); // Use current distance if not specified
                    const rStiffness = params.stiffness ?? this.settings.defaultRigidStiffness;
                    forceMag = rStiffness * (distance - targetDist);
                    break;
                }
                case 'weld': {
                    // Similar to rigid but might use node radii for default distance
                    const weldDist =
                        params.distance ?? source.getBoundingSphereRadius() + target.getBoundingSphereRadius();
                    const wStiffness = params.stiffness ?? this.settings.defaultWeldStiffness;
                    forceMag = wStiffness * (distance - weldDist);
                    break;
                }
                case 'elastic':
                default: {
                    const idealLen = params.idealLength ?? this.settings.defaultElasticIdealLength;
                    const eStiffness = params.stiffness ?? this.settings.defaultElasticStiffness;
                    forceMag = eStiffness * (distance - idealLen); // Hooke's Law
                    break;
                }
            }
            const forceVec = tempDelta.normalize().multiplyScalar(forceMag);
            forceVec.z *= zSpreadFactor; // Apply Z-spread
            if (!this.fixedNodes.has(source)) forces.get(source.id)?.add(forceVec);
            if (!this.fixedNodes.has(target)) forces.get(target.id)?.sub(forceVec);
        });

        // Apply centering force (gravity towards a central point)
        if (centerStrength > 0) {
            this.nodes.forEach((node) => {
                if (this.fixedNodes.has(node)) return;
                const forceVec = tempDelta.subVectors(gravityCenter, node.position).multiplyScalar(centerStrength);
                forceVec.z *= zSpreadFactor * 0.5; // May want different Z spread for centering
                forces.get(node.id)?.add(forceVec);
            });
        }

        // Update velocities and positions for each node
        this.nodes.forEach((node) => {
            if (this.fixedNodes.has(node)) return; // Skip fixed nodes
            const force = forces.get(node.id);
            const velocity = this.velocities.get(node.id);
            if (!force || !velocity) return;

            const mass = node.mass || 1.0; // Use node's mass or default
            const acceleration = tempDelta.copy(force).divideScalar(mass); // F = ma -> a = F/m
            velocity.add(acceleration).multiplyScalar(damping); // Apply damping to velocity

            // Speed limit to prevent instability
            const speed = velocity.length();
            if (speed > 50) velocity.multiplyScalar(50 / speed); // Max speed cap

            node.position.add(velocity); // Update position based on velocity
            totalSystemEnergy += 0.5 * mass * velocity.lengthSq(); // Kinetic energy: 0.5 * m * v^2
        });
        return totalSystemEnergy;
    }

    /**
     * Cleans up resources used by the ForceLayout engine.
     * Stops the simulation, clears internal arrays/maps (nodes, edges, velocities, fixedNodes),
     * and nullifies the reference to the {@link SpaceGraph} instance.
     * @public
     * @example
     * // When the SpaceGraph instance is being disposed:
     * // spaceGraph.layoutEngine.dispose();
     */
    dispose() {
        this.stop();
        this.nodes = [];
        this.edges = [];
        this.velocities.clear();
        this.fixedNodes.clear();
        this.spaceGraph = null;
        console.log('ForceLayout disposed.');
    }
}
