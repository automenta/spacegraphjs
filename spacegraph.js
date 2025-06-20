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
     */
