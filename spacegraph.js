/**
 * @license MIT
 * @module spacegraph
 * @description A JavaScript library for creating interactive 2D/3D Zooming User Interfaces (ZUI)
 * built with Three.js and HTML/CSS. It provides a scene graph, event handling,
 * and a variety of node types to build complex, data-driven visualizations.
 */
import * as THREE from 'three';
import {CSS3DObject, CSS3DRenderer} from 'three/addons/renderers/CSS3DRenderer.js';
import {gsap} from "gsap";

export const $ = (selector, context = document) => context.querySelector(selector);
export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
export const lerp = (a, b, t) => a + (b - a) * t;
export const generateId = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
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
 * **Available Events:**
 *  - `nodeAdded`: Fired when a new node is successfully added to the graph.
 *    - Data: `{ node: BaseNode }` - The node instance that was added.
 *  - `nodeRemoved`: Fired when a node is successfully removed from the graph.
 *    - Data: `{ nodeId: string, node: BaseNode }` - The ID of the removed node and the node instance itself.
 *  - `edgeAdded`: Fired when a new edge is successfully added to the graph.
 *    - Data: `{ edge: Edge }` - The edge instance that was added.
 *  - `edgeRemoved`: Fired when an edge is successfully removed from the graph.
 *    - Data: `{ edgeId: string, edge: Edge }` - The ID of the removed edge and the edge instance itself.
 *  - `nodeSelected`: Fired when a node is selected or deselected.
 *    - Data: `{ selectedNode: BaseNode | null, previouslySelectedNode: BaseNode | null }`
 *  - `edgeSelected`: Fired when an edge is selected or deselected.
 *    - Data: `{ selectedEdge: Edge | null, previouslySelectedEdge: Edge | null }`
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

    /** @property {Map<string, BaseNode>} nodes - A map of all nodes in the graph, keyed by their IDs. */
    nodes = new Map();
    /** @property {Map<string, Edge>} edges - A map of all edges in the graph, keyed by their IDs. */
    edges = new Map();
    /** @property {BaseNode | null} selectedNode - The currently selected node, if any. */
    selectedNode = null;
    /** @property {Edge | null} selectedEdge - The currently selected edge, if any. */
    selectedEdge = null;
    /** @property {boolean} isLinking - Flag indicating if the user is currently creating a link between nodes. */
    isLinking = false;
    /** @property {BaseNode | null} linkSourceNode - The source node from which a new link is being dragged. */
    linkSourceNode = null;
    /** @property {THREE.Line | null} tempLinkLine - A temporary line object used to visualize a link being created. */
    tempLinkLine = null;
    /** @property {UIManager | null} uiManager - Manages user interface elements and interactions. See {@link UIManager}. */
    uiManager = null;
    /** @property {CameraController | null} cameraController - Controls the camera's position, orientation, and movement. See {@link CameraController}. */
    cameraController = null;
    /** @property {ForceLayout | null} layoutEngine - Manages the physics-based layout of nodes and edges. See {@link ForceLayout}. */
    layoutEngine = null;
    /** @property {{color: number, alpha: number}} background - The background color and alpha for the WebGL renderer. Default is `{color: 0x000000, alpha: 0.0}` (transparent black). */
    background = {color: 0x000000, alpha: 0.0};
    /** @property {object} config - Configuration object for SpaceGraph settings. */
    config = {};

    /**
     * @typedef {object} SpaceGraphConfig
     * @property {object} [rendering] - Rendering related settings.
     * @property {number} [rendering.defaultBackgroundColor=0x000000] - Default background color for WebGL.
     * @property {number} [rendering.defaultBackgroundAlpha=0.0] - Default background alpha for WebGL.
     * @property {number} [rendering.lineIntersectionThreshold=5] - Raycaster threshold for line intersections (edges).
     * @property {object} [camera] - Camera controller settings.
     * @property {number} [camera.initialPositionZ=700] - Initial Z position of the camera.
     * @property {number} [camera.fov=70] - Camera field of view.
     * @property {number} [camera.zoomSpeed=0.0015] - Camera zoom speed.
     * @property {number} [camera.panSpeed=0.8] - Camera pan speed.
     * @property {number} [camera.dampingFactor=0.12] - Camera movement damping factor.
     * @property {object} [defaults] - Default properties for nodes and edges.
     * @property {object} [defaults.node] - Default properties for nodes.
     * @property {object} [defaults.node.html] - Default properties for HTML nodes.
     * @property {number} [defaults.node.html.width=160]
     * @property {number} [defaults.node.html.height=70]
     * @property {boolean} [defaults.node.html.billboard=true]
     * @property {number} [defaults.node.html.contentScale=1.0]
     * @property {string} [defaults.node.html.backgroundColor='var(--node-bg-default)']
     * @property {object} [defaults.node.shape] - Default properties for shape nodes.
     * @property {string} [defaults.node.shape.shape='sphere']
     * @property {number} [defaults.node.shape.size=50]
     * @property {number} [defaults.node.shape.color=0xffffff]
     * @property {object} [defaults.edge] - Default properties for edges.
     * @property {number} [defaults.edge.color=0x00d0ff]
     * @property {number} [defaults.edge.thickness=1.5]
     * @property {number} [defaults.edge.opacity=0.6]
     */

    /**
     * Creates an instance of SpaceGraph.
     * Initializes the 3D scenes (WebGL and CSS3D), renderers, camera, lighting,
     * UI manager, layout engine, and event listeners.
     * @constructor
     * @param {HTMLElement} containerElement - The DOM element that will host the SpaceGraph visualization.
     *                                       This element should have defined dimensions (width and height).
     * @param {SpaceGraphConfig} [config={}] - Optional configuration object to override default settings.
     * @param {object} [uiElements={}] - Optional pre-existing UI DOM elements to be used by the {@link UIManager}.
     *                                   Can include `contextMenuEl`, `confirmDialogEl`, `statusIndicatorEl`.
     * @throws {Error} If `containerElement` is not provided or is not a valid HTML element.
     * @example
     * const graphContainer = document.getElementById('myGraphContainer');
     * const spaceGraph = new SpaceGraph(graphContainer, { camera: { fov: 75 }});
     */
    constructor(containerElement, config = {}, uiElements = {}) {
        if (!containerElement || !(containerElement instanceof HTMLElement)) {
            throw new Error("SpaceGraph requires a valid HTML container element.");
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
                if (config.defaults.node.html) this.config.defaults.node.html = { ...this.getDefaultConfig().defaults.node.html, ...config.defaults.node.html };
                if (config.defaults.node.shape) this.config.defaults.node.shape = { ...this.getDefaultConfig().defaults.node.shape, ...config.defaults.node.shape };
            }
            if (config.defaults.edge) this.config.defaults.edge = { ...this.getDefaultConfig().defaults.edge, ...config.defaults.edge };
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
        this.background = { // Initialize from config
            color: this.config.rendering.defaultBackgroundColor,
            alpha: this.config.rendering.defaultBackgroundAlpha
        };
        this.setBackground(this.background.color, this.background.alpha);

        this.cameraController = new CameraController(this._camera, this.container, {
            zoomSpeed: this.config.camera.zoomSpeed,
            panSpeed: this.config.camera.panSpeed,
            dampingFactor: this.config.camera.dampingFactor
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
     * @private
     * Sets up the WebGL and CSS3D renderers.
     */
    _setupRenderers() {
        /** @property {HTMLCanvasElement} webglCanvas - The canvas element for WebGL rendering. */
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
            alpha: true
        });
        this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
        this.webglRenderer.setPixelRatio(window.devicePixelRatio);

        /** @property {HTMLElement} css3dContainer - The container div for the CSS3D renderer. */
        this.css3dContainer = $('#css3d-container', this.container);
        if(!this.css3dContainer) {
            this.css3dContainer = document.createElement('div');
            this.css3dContainer.id = 'css3d-container';
            this.container.appendChild(this.css3dContainer);
        }
        Object.assign(this.css3dContainer.style, {
            position: 'absolute', inset: '0', width: '100%',
            height: '100%', pointerEvents: 'none', zIndex: '2'
        });

        /** @property {CSS3DRenderer} cssRenderer - The renderer for CSS3D objects. */
        this.cssRenderer = new CSS3DRenderer();
        this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
        this.css3dContainer.appendChild(this.cssRenderer.domElement);
        this.webglCanvas.style.position = 'absolute';
        this.webglCanvas.style.inset = '0';
        this.webglCanvas.style.zIndex = '1';
    }

    /**
     * @private
     * Sets up basic lighting for the scene.
     */
    _setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(0.5, 1, 0.75);
        this.scene.add(directionalLight);
    }

    /**
     * @typedef {object} VisualOutputs
     * @property {(THREE.Mesh|undefined)} mesh - Optional Three.js mesh for the node.
     * @property {(HTMLElement|undefined)} htmlElement - Optional HTML element for the node.
     * @property {(CSS3DObject|undefined)} cssObject - Optional CSS3DObject for the node.
     * @property {(CSS3DObject|undefined)} labelObject - Optional CSS3DObject for the node's label.
     */

    /**
     * @typedef {object} TypeDefinition
     * @property {function(RegisteredNode, SpaceGraph): VisualOutputs} onCreate - Function to create the visual representation of the node.
     * @property {function(RegisteredNode): object} [getDefaults] - Function to return default data for this node type.
     * @property {function(RegisteredNode, SpaceGraph)} [onUpdate] - Function called each frame to update the node.
     * @property {function(RegisteredNode)} [onDispose] - Function to clean up resources when the node is removed.
     * @property {function(RegisteredNode, number, number, number)} [onSetPosition] - Custom logic for when node position is set.
     * @property {function(RegisteredNode, boolean)} [onSetSelectedStyle] - Custom logic for applying selected style.
     * @property {function(RegisteredNode, boolean)} [onSetHoverStyle] - Custom logic for applying hover style.
     * @property {function(RegisteredNode): number} [getBoundingSphereRadius] - Custom logic for node's bounding sphere.
     * @property {function(RegisteredNode)} [onStartDrag] - Custom logic for when node dragging starts.
     * @property {function(RegisteredNode, THREE.Vector3)} [onDrag] - Custom logic for when node is dragged.
     * @property {function(RegisteredNode)} [onEndDrag] - Custom logic for when node dragging ends.
     */

    /**
     * Registers a new node type definition.
     * @param {string} typeName - The unique name for this node type (e.g., 'my-custom-node').
     * @param {TypeDefinition} typeDefinition - An object defining the lifecycle methods, default data,
     *                                        and behavior for nodes of this type. See {@link TypeDefinition}.
     * @throws {Error} If a type with the same name is already registered.
     * @throws {Error} If `typeDefinition` is invalid (e.g., missing `onCreate` method).
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
     * @param {number} [color=0x000000] - The hexadecimal color value.
     * @param {number} [alpha=0.0] - The opacity (0 for transparent, 1 for opaque).
     */
    setBackground(color = 0x000000, alpha = 0.0) {
        this.background = {color, alpha};
        this.webglRenderer.setClearColor(color, alpha);
        this.webglCanvas.style.backgroundColor = alpha === 0 ? 'transparent' : `#${color.toString(16).padStart(6, '0')}`;
    }

    /**
     * @typedef {object} NodeDataObject
     * @property {string} type - The type of the node (e.g., 'note', 'html', 'shape', or a registered custom type).
     * @property {string} [id] - Optional unique ID for the node. If not provided, one will be generated.
     * @property {number} [x=0] - Initial x-coordinate.
     * @property {number} [y=0] - Initial y-coordinate.
     * @property {number} [z=0] - Initial z-coordinate.
     * @property {string} [label] - Text label for the node.
     * @property {string} [content] - HTML content for HTML-based nodes.
     * @property {string} [shape] - For 'shape' type nodes (e.g., 'box', 'sphere').
     * @property {number} [size] - Size for 'shape' type nodes.
     * @property {number} [color] - Color for 'shape' type nodes.
     * @property {number} [width] - Width for 'html' type nodes.
     * @property {number} [height] - Height for 'html' type nodes.
     * @property {boolean} [editable] - If the content of an HTML node is editable.
     * @property {object} [ports] - Port definitions for RegisteredNode types.
     * @property {*} [any] - Other type-specific data.
     */

    /**
     * Adds a node to the graph.
     * This method can accept either a pre-instantiated node object (which must extend {@link BaseNode})
     * or a plain JavaScript object ({@link NodeDataObject}) describing the node to be created.
     * If a data object is provided, a node of the specified `type` will be instantiated.
     * Supported built-in types are 'note', 'html', and 'shape'. Custom types can be registered
     * using {@link SpaceGraph#registerNodeType}.
     *
     * @param {BaseNode | NodeDataObject} dataOrInstance - Either a node instance (e.g., `new NoteNode(...)`)
     *                                                   or a data object (e.g., `{ type: 'note', content: 'Hi' }`).
     * @returns {BaseNode | null} The added or created node instance. Returns `null` if node creation fails
     *                            (e.g., unknown type, missing required data).
     * @throws {Error} If `dataOrInstance` is not a valid object or `BaseNode` instance.
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
     * // Adding a pre-instantiated node (less common for typical usage)
     * // import { MyCustomNode } from './my-custom-node.js'; // Assuming MyCustomNode extends BaseNode
     * // const preInstantiatedNode = new MyCustomNode('custom-id', {x:0,y:0,z:0}, {someData: 'abc'});
     * // spaceGraph.addNode(preInstantiatedNode);
     */
    addNode(dataOrInstance) {
        let nodeInstance;

        if (dataOrInstance instanceof BaseNode) {
            nodeInstance = dataOrInstance;
            if (!nodeInstance.id) nodeInstance.id = generateId('node'); // Ensure ID if missing
            if (this.nodes.has(nodeInstance.id)) {
                console.warn(`Node instance with ID ${nodeInstance.id} already exists or ID is duplicated. Returning existing node.`);
                return this.nodes.get(nodeInstance.id);
            }
        } else if (typeof dataOrInstance === 'object' && dataOrInstance !== null) {
            const data = dataOrInstance; // data is a NodeDataObject
            if (!data.type) {
                console.error("Node data must include a 'type' property to determine which node class to instantiate.", data);
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
                nodeInstance = new RegisteredNode(data.id, data, typeDefinition, this);
            }
            // Then check built-in types
            else if (data.type === 'note') {
                nodeInstance = new NoteNode(data.id, position, data);
            } else if (data.type === 'html') {
                nodeInstance = new HtmlNodeElement(data.id, position, data);
            } else if (data.type === 'shape' || data.shape) { // data.shape for backward compatibility
                nodeInstance = new ShapeNode(data.id, position, data);
            } else {
                console.error(`Unknown or unregistered node type: "${data.type}". Please register it using spaceGraph.registerNodeType().`);
                return null;
            }
        } else {
            throw new Error("Invalid argument to addNode. Must be a BaseNode instance or a NodeDataObject.");
        }

        if (!nodeInstance) {
            console.error("Node instantiation failed for an unknown reason.", dataOrInstance);
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
        const edgesToRemove = [...this.edges.values()].filter(edge => edge.source === nodeToRemove || edge.target === nodeToRemove);
        edgesToRemove.forEach(edge => this.removeEdge(edge.id)); // removeEdge will emit its own events

        nodeToRemove.dispose(); // Call node's internal cleanup (removes from scenes, disposes geometry/materials)
        this.nodes.delete(nodeId);
        this.layoutEngine?.removeNode(nodeToRemove); // Remove from physics layout

        this._emit('nodeRemoved', { nodeId: nodeId, node: nodeToRemove });
        return true;
    }

    /**
     * @typedef {object} EdgeDataObject
     * @property {string} [id] - Optional unique ID for the edge. If not provided, one will be generated.
     * @property {number} [color=0x00d0ff] - Color of the edge line.
     * @property {number} [thickness=1.5] - Thickness of the edge line.
     * @property {string} [style='solid'] - Style of the edge (currently 'solid', future: 'dashed').
     * @property {string} [constraintType='elastic'] - Type of physics constraint ('elastic', 'rigid', 'weld').
     * @property {object} [constraintParams] - Parameters for the constraint (e.g., stiffness, idealLength).
     * @property {string} [sourcePort] - Name of the source port if connecting to a RegisteredNode port.
     * @property {string} [targetPort] - Name of the target port if connecting to a RegisteredNode port.
     */

    /**
     * Adds an edge connecting two nodes in the graph.
     * Edges are represented visually as lines and can influence the physics-based layout.
     *
     * @param {BaseNode} sourceNode - The source node instance for the edge. Must be a valid {@link BaseNode} present in the graph.
     * @param {BaseNode} targetNode - The target node instance for the edge. Must be a valid {@link BaseNode} present in the graph.
     * @param {EdgeDataObject} [data={}] - Optional data for the edge, such as `color`, `thickness`,
     *                                   `constraintType`, `constraintParams`, `sourcePort`, `targetPort`. See {@link EdgeDataObject}.
     * @returns {Edge | null} The created {@link Edge} instance, or `null` if creation failed (e.g., nodes are invalid,
     *                        source and target are the same, or a duplicate edge already exists).
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
            console.error("addEdge: Invalid or non-existent source node.", sourceNode); return null;
        }
        if (!targetNode || !(targetNode instanceof BaseNode) || !this.nodes.has(targetNode.id)) {
            console.error("addEdge: Invalid or non-existent target node.", targetNode); return null;
        }
        if (sourceNode === targetNode) {
            console.warn("addEdge: Source and target nodes cannot be the same."); return null;
        }

        // Check for duplicate edges (simple check, could be enhanced for directed graphs or multi-edges if needed)
        const_duplicate = [...this.edges.values()].find(e =>
            (e.source === sourceNode && e.target === targetNode) ||
            (e.source === targetNode && e.target === sourceNode) // Considers undirected duplicates
        );
        if (const_duplicate) {
             console.warn(`addEdge: Duplicate edge between ${sourceNode.id} and ${targetNode.id} ignored.`);
            return const_duplicate; // Or return null if duplicates are strictly disallowed
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
     * @private
     * Internal method to update all nodes and edges. Called in the animation loop.
     */
    _updateNodesAndEdges() {
        this.nodes.forEach(node => node.update(this));
        this.edges.forEach(edge => edge.update(this));
        this.uiManager?.updateEdgeMenuPosition();
    }

    /**
     * @private
     * Internal method to render both WebGL and CSS3D scenes. Called in the animation loop.
     */
    _render() {
        this.webglRenderer.render(this.scene, this._camera);
        this.cssRenderer.render(this.cssScene, this._camera);
    }

    /**
     * @private
     * Main animation loop. Updates nodes/edges and renders scenes.
     */
    _animate() {
        this._updateNodesAndEdges();
        this._render();
        requestAnimationFrame(this._animate.bind(this));
    }

    /**
     * @private
     * Handles window resize events to update camera aspect ratio and renderer sizes.
     */
    _onWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
        this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Centers the camera view on a target position or the average position of all nodes.
     * @param {THREE.Vector3 | null} [targetPosition=null] - Optional target position. If null, uses average of nodes.
     * @param {number} [duration=0.7] - Animation duration in seconds.
     */
    centerView(targetPosition = null, duration = 0.7) {
        let targetPos;
        if (targetPosition instanceof THREE.Vector3) {
            targetPos = targetPosition.clone();
        } else if (this.nodes.size > 0) {
            targetPos = new THREE.Vector3();
            this.nodes.forEach(node => targetPos.add(node.position));
            targetPos.divideScalar(this.nodes.size);
        } else {
             targetPos = new THREE.Vector3(0,0,0);
        }
        const distance = this.nodes.size > 1 ? 700 : 400;
        this.cameraController.moveTo(targetPos.x, targetPos.y, targetPos.z + distance, duration, targetPos);
    }

    /**
     * Focuses the camera on a specific node.
     * @param {BaseNode} node - The node to focus on.
     * @param {number} [duration=0.6] - Animation duration in seconds.
     * @param {boolean} [pushHistory=false] - Whether to push the current camera state to history for "back" navigation.
     */
    focusOnNode(node, duration = 0.6, pushHistory = false) {
        if (!node || !this.cameraController || !this._camera) return;
        const targetPos = node.position.clone();

        const fov = this._camera.fov * DEG2RAD;
        const aspect = this._camera.aspect;
        let nodeSize = 100; // Default size if specific sizing info isn't available

        if (node.getBoundingSphereRadius) { // Prefer method if available
             nodeSize = node.getBoundingSphereRadius() * 2; // Diameter
        } else if (node.size && node.size.width && node.size.height) { // For HtmlNodeElement like nodes
             nodeSize = Math.max(node.size.width / aspect, node.size.height) * 1.2; // Factor in aspect for width
        }
        // Calculate distance to fit the node in view based on its size and camera FOV
        const distance = (nodeSize / (2 * Math.tan(fov / 2))) + 50; // Add some padding

        if (pushHistory) this.cameraController.pushState();
        this.cameraController.moveTo(targetPos.x, targetPos.y, targetPos.z + distance, duration, targetPos);
    }

    /**
     * Implements an "auto-zoom" behavior. If the target node is already focused, it zooms out (pops history).
     * Otherwise, it focuses on the given node (pushes history).
     * @param {BaseNode} node - The node for auto-zoom.
     */
    autoZoom(node) {
        if (!node || !this.cameraController) return;
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
     * Converts screen coordinates (e.g., mouse click) to world coordinates on a plane at a given Z-depth.
     * @param {number} screenX - X-coordinate on the screen.
     * @param {number} screenY - Y-coordinate on the screen.
     * @param {number} [targetZ=0] - The Z-depth of the target plane in world space.
     * @returns {THREE.Vector3 | null} The world coordinates, or null if intersection fails.
     */
    screenToWorld(screenX, screenY, targetZ = 0) {
        const vec = new THREE.Vector3((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1, 0.5);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, this._camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -targetZ); // Plane facing camera at targetZ
        const intersectPoint = new THREE.Vector3();
        return raycaster.ray.intersectPlane(plane, intersectPoint) ? intersectPoint : null;
    }

    /**
     * Sets the currently selected node. This typically involves updating visual styles
     * to highlight the selected node and deselecting any previously selected node or edge.
     * The actual styling change is often delegated to the node's `setSelectedStyle` method.
     *
     * @param {BaseNode | null} node - The node to select. Provide `null` to deselect the current node.
     * @see BaseNode#setSelectedStyle
     * @fires SpaceGraph#nodeSelected
     * @example
     * const myNode = spaceGraph.getNodeById('node-abc');
     * if (myNode) {
     *   spaceGraph.setSelectedNode(myNode); // Selects 'node-abc'
     * }
     * spaceGraph.setSelectedNode(null); // Deselects any currently selected node
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
     * Sets the currently selected edge. This typically involves updating visual styles
     * to highlight the selected edge and deselecting any previously selected edge or node.
     * The {@link UIManager} might display an edge-specific menu.
     * Emits an `edgeSelected` event.
     *
     * @param {Edge | null} edge - The edge to select. Provide `null` to deselect the current edge.
     * @see Edge#setHighlight
     * @fires SpaceGraph#edgeSelected
     * @example
     * const myEdge = spaceGraph.getEdgeById('edge-123');
     * if (myEdge) {
     *   spaceGraph.setSelectedEdge(myEdge); // Selects 'edge-123'
     * }
     * spaceGraph.setSelectedEdge(null); // Deselects any currently selected edge
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
     * @param {number} screenX - X-coordinate on the screen.
     * @param {number} screenY - Y-coordinate on the screen.
     * @returns {BaseNode | Edge | null} The intersected object, or null if none.
     */
    intersectedObject(screenX, screenY) {
        const vec = new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, this._camera);
        raycaster.params.Line.threshold = this.config.rendering.lineIntersectionThreshold;

        // Check for node meshes first (typically more specific interaction)
        const nodeMeshes = [...this.nodes.values()].map(n => n.mesh).filter(Boolean);
        if (nodeMeshes.length > 0) {
            const intersects = raycaster.intersectObjects(nodeMeshes);
            if (intersects.length > 0) {
                const intersectedMesh = intersects[0].object;
                // Find the node instance corresponding to this mesh
                return [...this.nodes.values()].find(n => n.mesh === intersectedMesh);
            }
        }

        // Then check for edges
        const edgeObjects = [...this.edges.values()].map(e => e.threeObject).filter(Boolean);
        if (edgeObjects.length > 0) {
            const intersects = raycaster.intersectObjects(edgeObjects);
            if (intersects.length > 0) {
                const intersectedLine = intersects[0].object;
                // Find the edge instance corresponding to this line
                return [...this.edges.values()].find(edge => edge.threeObject === intersectedLine);
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
        [...this.nodes.values()].forEach(node => node.dispose());
        [...this.edges.values()].forEach(edge => edge.dispose());
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
        this.scene = null; this.cssScene = null;
        this.webglRenderer = null; this.cssRenderer = null;
        this.webglCanvas = null; this.css3dContainer = null;
        this._camera = null;
        this.cameraController = null; this.layoutEngine = null; this.uiManager = null;
        this.selectedNode = null; this.selectedEdge = null;
        this.linkSourceNode = null; this.tempLinkLine = null;
        this._events = null;


        console.log("SpaceGraph disposed successfully.");
    }

    /**
     * Returns the default configuration options for SpaceGraph.
     * Users can override these by passing a config object to the constructor.
     * @returns {SpaceGraphConfig} The default configuration object.
     * @protected
     */
    getDefaultConfig() {
        return {
            rendering: {
                defaultBackgroundColor: 0x000000,
                defaultBackgroundAlpha: 0.0,
                lineIntersectionThreshold: 5
            },
            camera: {
                initialPositionZ: 700,
                fov: 70,
                zoomSpeed: 0.0015,
                panSpeed: 0.8,
                dampingFactor: 0.12
            },
            defaults: {
                node: {
                    html: {
                        width: 160,
                        height: 70,
                        billboard: true,
                        contentScale: 1.0,
                        backgroundColor: 'var(--node-bg-default)'
                    },
                    shape: {
                        shape: 'sphere',
                        size: 50,
                        color: 0xffffff
                    }
                },
                edge: {
                    color: 0x00d0ff,
                    thickness: 1.5,
                    opacity: 0.6
                }
            }
        };
    }


    // --- Event Emitter System ---

    /**
     * Registers an event handler for the given event name.
     * @param {string} eventName - The name of the event to listen for (e.g., 'nodeAdded', 'edgeRemoved').
     * @param {Function} callback - The function to call when the event is emitted.
     *                              This function will receive an event data object as its argument.
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
     * Removes a previously registered event handler.
     * The callback must be the same function instance that was used for `on`.
     * @param {string} eventName - The name of the event to stop listening for.
     * @param {Function} callback - The callback function to remove.
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
     * Emits an event, calling all registered listeners for that event name.
     * This is primarily for internal use but can be used to emit custom events.
     * @param {string} eventName - The name of the event to emit.
     * @param {object} [data={}] - The data object to pass to event listeners.
     * @protected  // Or public if intended for external custom events
     * @example
     * // Internal example:
     * // this._emit('nodeAdded', { node: newNodeInstance });
     * //
     * // Custom event example:
     * // spaceGraph._emit('customApplicationEvent', { detail: 'something happened' });
     */
    _emit(eventName, data = {}) {
        if (this._events.has(eventName)) {
            // Iterate over a copy in case a callback modifies the listeners Set (e.g., calls off())
            [...this._events.get(eventName)].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for "${eventName}":`, error);
                }
            });
        }
    }
}

/**
 * @class BaseNode
 * @classdesc Abstract base class for all node types in the SpaceGraph.
 * It provides common properties such as `id`, `position`, `data`, and `mass`,
 * as well as core methods for updating, disposing, and interacting with the node.
 * Specific node types (e.g., {@link HtmlNodeElement}, {@link ShapeNode}, {@link RegisteredNode})
 * extend `BaseNode` to implement their unique visual representations and behaviors.
 *
 * Developers typically do not instantiate `BaseNode` directly but rather use or create
 * one of its subclasses.
 *
 * @property {string} id - Unique identifier for the node. Automatically generated if not provided in the constructor.
 * @property {SpaceGraph | null} spaceGraph - Reference to the parent {@link SpaceGraph} instance. Set when the node is added to a graph.
 * @property {THREE.Vector3} position - The current 3D position of the node in world space.
 * @property {object} data - An object containing arbitrary data associated with the node.
 *                           The structure of this data depends on the node type and application needs.
 *                           It often includes properties like `label`, `type`, and type-specific attributes (e.g., `content` for notes).
 * @property {number} mass - Mass of the node, used by the {@link ForceLayout} engine for physics simulations. Default is `1.0`.
 * @property {THREE.Mesh | null} mesh - Optional Three.js mesh for WebGL-rendered visual representation of the node (e.g., for {@link ShapeNode}).
 * @property {CSS3DObject | null} cssObject - Optional Three.js `CSS3DObject` for rendering HTML content as part of the 3D scene.
 *                                        Used by {@link HtmlNodeElement} and potentially {@link RegisteredNode}.
 * @property {HTMLElement | null} htmlElement - Optional underlying HTML element associated with `cssObject` or used for direct DOM manipulation.
 * @property {CSS3DObject | null} labelObject - Optional `CSS3DObject` for rendering a text label associated with the node, typically used by {@link ShapeNode}.
 */
class BaseNode {
    id = null;
    spaceGraph = null;
    position = new THREE.Vector3();
    data = {};
    mass = 1.0;
    mesh = null;
    cssObject = null;
    htmlElement = null;
    labelObject = null;

    /**
     * Constructs a BaseNode instance.
     * As `BaseNode` is abstract, this constructor is typically called via `super()` from a subclass.
     *
     * @constructor
     * @param {string | null} id - Unique ID for the node. If `null` or `undefined`, a new ID will be generated.
     * @param {{x: number, y: number, z: number}} [position={x:0,y:0,z:0}] - Initial 3D position of the node.
     * @param {object} [data={}] - Initial data for the node. This will be merged with default data provided by `getDefaultData()`.
     * @param {number} [mass=1.0] - Mass of the node for physics calculations. Must be positive.
     * @example
     * // Called from a subclass constructor:
     * // super(id, position, { ...myData, ...data }, mass);
     */
    constructor(id, position = {x: 0, y: 0, z: 0}, data = {}, mass = 1.0) {
        this.id = id ?? generateId('node');
        this.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0); // Ensure x,y,z defaults if not in position object
        this.data = { ...this.getDefaultData(), ...data }; // Merge provided data with defaults
        this.mass = Math.max(0.1, mass); // Ensure mass is positive and non-zero
    }

    /**
     * Provides default data for a node. Subclasses should override this method
     * to define their specific default properties. The returned object will be
     * merged with the `data` provided in the constructor.
     *
     * @returns {object} An object containing default data properties.
     *                   Base implementation returns `{ label: this.id }`.
     * @protected
     * @example
     * // In a subclass:
     * // getDefaultData() {
     * //   return {
     * //     ...super.getDefaultData(), // Optional: include base defaults
     * //     customProperty: 'defaultValue',
     * //     size: 50
     * //   };
     * // }
     */
    getDefaultData() { return { label: this.id }; }

    /**
     * Sets the 3D position of the node in world space.
     * Subclasses may override this to update positions of their visual components (meshes, HTML elements).
     *
     * @param {number} x - The new x-coordinate.
     * @param {number} y - The new y-coordinate.
     * @param {number} z - The new z-coordinate.
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
     * Abstract method intended to be called by {@link SpaceGraph} in its animation loop.
     * Subclasses should implement this method to update their state, position, orientation,
     * or any other dynamic aspects of the node.
     *
     * @param {SpaceGraph} spaceGraphInstance - Reference to the parent {@link SpaceGraph} instance,
     *                                          providing access to global graph properties like the camera.
     * @abstract
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
     * Cleans up resources used by the node. This is crucial for preventing memory leaks when nodes are removed.
     * Subclasses must override this method to dispose of their specific Three.js objects (geometries, materials, textures),
     * remove DOM elements, and detach event listeners.
     * It's important to call `super.dispose()` if overriding in a subclass that itself might be further subclassed,
     * though for direct `BaseNode` children, it's often more about cleaning their own specific resources.
     *
     * @example
     * // In a subclass:
     * // dispose() {
     * //   this.mesh?.geometry?.dispose();
     * //   this.mesh?.material?.dispose();
     * //   this.mesh?.parent?.remove(this.mesh);
     * //   this.htmlElement?.remove();
     * //   // any other custom cleanup
     * //   super.dispose(); // If BaseNode had its own complex resources to clean
     * // }
     */
    dispose() {
        // Base implementation can clear common references, though subclasses are primary actors.
        if (this.mesh) {
            this.mesh.parent?.remove(this.mesh);
            this.mesh.geometry?.dispose();
            // Material disposal depends on whether it's shared. Assume not shared for now.
            if (Array.isArray(this.mesh.material)) {
                this.mesh.material.forEach(m => m.dispose());
            } else if (this.mesh.material) {
                this.mesh.material.dispose();
            }
            this.mesh = null;
        }
        if (this.cssObject) {
            this.cssObject.parent?.remove(this.cssObject);
            this.cssObject.element?.remove(); // Remove the HTML element from DOM
            this.cssObject = null;
        }
        if (this.labelObject) {
            this.labelObject.parent?.remove(this.labelObject);
            this.labelObject.element?.remove();
            this.labelObject = null;
        }
        // htmlElement is often the same as cssObject.element, so it might already be handled.
        // If htmlElement is managed independently, it should be removed here.
        // this.htmlElement?.remove(); // Be cautious if it's shared with cssObject.element
        this.htmlElement = null;

        this.spaceGraph = null; // Break reference to parent graph
        // console.log(`BaseNode ${this.id} disposed resources.`);
    }

    /**
     * Calculates and returns the radius of the node's bounding sphere.
     * Used for layout calculations and camera focusing. Subclasses should override.
     * @returns {number} The radius of the bounding sphere.
     */
    getBoundingSphereRadius() { return 10; } // Default placeholder

    /**
     * Applies or removes a visual style indicating selection.
     * Subclasses should implement specific styling changes.
     * @param {boolean} selected - True if the node is selected, false otherwise.
     */
    setSelectedStyle(selected) { /* Base implementation does nothing */ }

    /**
     * Called when a drag operation starts on this node.
     * Fixes the node in the layout engine.
     */
    startDrag() {
        this.htmlElement?.classList.add('dragging');
        this.spaceGraph?.layoutEngine?.fixNode(this);
    }

    /**
     * Called during a drag operation to update the node's position.
     * @param {THREE.Vector3} newPosition - The new target position for the node.
     */
    drag(newPosition) {
        this.setPosition(newPosition.x, newPosition.y, newPosition.z);
    }

    /**
     * Called when a drag operation ends on this node.
     * Releases the node in the layout engine and triggers a layout "kick".
     */
    endDrag() {
        this.htmlElement?.classList.remove('dragging');
        this.spaceGraph?.layoutEngine?.releaseNode(this);
        this.spaceGraph?.layoutEngine?.kick();
    }
}

/**
 * @class HtmlNodeElement
 * @classdesc Represents a node whose visual representation is primarily an HTML element rendered via CSS3D.
 * Extends BaseNode.
 * @extends BaseNode
 */
export class HtmlNodeElement extends BaseNode {
    /** @property {{width: number, height: number}} size - The dimensions of the HTML element. */
    size = {width: 160, height: 70};
    /** @property {boolean} billboard - If true, the node always faces the camera. */
    billboard = true;

    /**
     * @constructor
     * @param {string | null} id - Unique ID.
     * @param {{x: number, y: number, z: number}} [position={x:0,y:0,z:0}] - Initial position.
     * @param {NodeDataObject} [data={}] - Initial data, including potential `width`, `height`, `content`, `editable`.
     */
    constructor(id, position = {x: 0, y: 0, z: 0}, data = {}) {
        // BaseNode constructor will call getDefaultData, which needs spaceGraph to be set first
        // Temporarily set it, then call super, then finalize data merging.
        if (data.spaceGraph) this.spaceGraph = data.spaceGraph; // If passed in data for early access

        super(id, position, data, data.mass ?? 1.0); // data here is merged with BaseNode's default

        // Now that this.spaceGraph is potentially set by BaseNode (if it was part of `data`),
        // and `this.data` is initialized by `super()`, we can safely access `this.spaceGraph.config`.
        const htmlDefaults = this.spaceGraph?.config?.defaults?.node?.html || {};

        this.size.width = data.width ?? htmlDefaults.width ?? 160;
        this.size.height = data.height ?? htmlDefaults.height ?? 70;
        this.billboard = data.billboard ?? htmlDefaults.billboard ?? true;
        // data.contentScale and data.backgroundColor are handled by getDefaultData and merged by BaseNode
        // We ensure they are part of `this.data` correctly.
        this.data.contentScale = data.contentScale ?? this.data.contentScale ?? htmlDefaults.contentScale ?? 1.0;
        this.data.backgroundColor = data.backgroundColor ?? this.data.backgroundColor ?? htmlDefaults.backgroundColor ?? 'var(--node-bg-default)';


        this.htmlElement = this._createHtmlElement(); // Uses this.size and this.data
        this.cssObject = new CSS3DObject(this.htmlElement);
        this.cssObject.userData = { nodeId: this.id, type: 'html-node' }; // For raycasting identification

        this.update(); // Initial position update
        this.setContentScale(this.data.contentScale ?? 1.0);
        if (this.data.backgroundColor) {
            this.setBackgroundColor(this.data.backgroundColor);
        }
    }

    /**
     * @override
     * @returns {NodeDataObject} Default data specific to HtmlNodeElement.
     * @protected
     */
    getDefaultData() {
        // Get defaults from SpaceGraph config if available
        const graphDefaults = this.spaceGraph?.config?.defaults?.node?.html || {};
        return {
            ...super.getDefaultData(), // Include label:id from BaseNode
            type: 'html',
            content: '',
            width: graphDefaults.width ?? 160,
            height: graphDefaults.height ?? 70,
            contentScale: graphDefaults.contentScale ?? 1.0,
            backgroundColor: graphDefaults.backgroundColor ?? 'var(--node-bg-default)',
            billboard: graphDefaults.billboard ?? true,
            editable: false,
            // Note: `label` is already part of super.getDefaultData()
        };
    }

    /**
     * Creates the main HTML element for the node.
     * @returns {HTMLElement} The created HTML element.
     * @private
     */
    _createHtmlElement() {
        const el = document.createElement('div');
        el.className = 'node-html';
        if (this.data.type === 'note') el.classList.add('note-node'); // Specific styling for notes
        el.id = `node-html-${this.id}`;
        el.dataset.nodeId = this.id;
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
        if(this.data.editable) this._initContentEditable(el);
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
            contentDiv.contentEditable = "true";
            let debounceTimer;
            contentDiv.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.data.content = contentDiv.innerHTML; // Store full HTML content
                    this.data.label = contentDiv.textContent || ''; // Store plain text for label/tooltip
                }, 300);
            });
            // Prevent pointer events on contenteditable from triggering graph interactions like panning
            contentDiv.addEventListener('pointerdown', e => e.stopPropagation());
            contentDiv.addEventListener('touchstart', e => e.stopPropagation(), {passive: true});
            // Allow wheel scrolling within the content if it overflows
            contentDiv.addEventListener('wheel', e => {
                if (contentDiv.scrollHeight > contentDiv.clientHeight || contentDiv.scrollWidth > contentDiv.clientWidth) {
                    e.stopPropagation();
                }
            }, {passive: false});
        }
    }

    /**
     * @override
     * Sets the node's position and updates its CSS3DObject.
     */
    setPosition(x, y, z) {
        super.setPosition(x,y,z);
        if (this.cssObject) this.cssObject.position.copy(this.position);
    }

    /**
     * Sets the size of the HTML element.
     * @param {number} width - New width.
     * @param {number} height - New height.
     * @param {boolean} [scaleContent=false] - Whether to attempt to scale content proportionally with size change.
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
     * Sets the scale of the node's content area.
     * @param {number} scale - The new scale factor (clamped between 0.3 and 3.0).
     */
    setContentScale(scale) {
        this.data.contentScale = clamp(scale, 0.3, 3.0);
        const contentEl = this.htmlElement?.querySelector('.node-content');
        if (contentEl) contentEl.style.transform = `scale(${this.data.contentScale})`;
    }

    /**
     * Sets the background color of the node's HTML element.
     * @param {string} color - CSS color string.
     */
    setBackgroundColor(color) {
        this.data.backgroundColor = color;
        this.htmlElement?.style.setProperty('--node-bg', this.data.backgroundColor);
    }

    /**
     * Adjusts the content scale by a delta factor.
     * @param {number} deltaFactor - Factor to multiply the current content scale by.
     */
    adjustContentScale(deltaFactor) {
        this.setContentScale(this.data.contentScale * deltaFactor);
    }

    /**
     * Adjusts the node size by a factor.
     * @param {number} factor - Factor to multiply current width and height by.
     */
    adjustNodeSize(factor) {
        this.setSize(this.size.width * factor, this.size.height * factor, false);
    }

    /**
     * @override
     * Updates the CSS3DObject's position and, if billboard is true, its orientation to face the camera.
     */
    update(spaceGraphInstance) {
        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            if (this.billboard && spaceGraphInstance?._camera) {
                 this.cssObject.quaternion.copy(spaceGraphInstance._camera.quaternion);
            }
        }
    }

    /**
     * @override
     * Disposes of the HTML element and CSS3DObject.
     */
    dispose() {
        super.dispose();
        this.htmlElement?.remove();
        this.cssObject?.parent?.remove(this.cssObject);
        this.htmlElement = null;
        this.cssObject = null;
    }

    /**
     * @override
     * Calculates bounding sphere radius based on HTML element size and content scale.
     * @returns {number}
     */
    getBoundingSphereRadius() {
        // Approximate based on diagonal of the scaled element
        return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2 * (this.data.contentScale ?? 1.0);
    }

    /**
     * @override
     * Toggles the 'selected' class on the HTML element.
     */
    setSelectedStyle(selected) {
        this.htmlElement?.classList.toggle('selected', selected);
    }

    /**
     * Called when a resize operation starts. Adds 'resizing' class and fixes node in layout.
     */
    startResize() {
        this.htmlElement?.classList.add('resizing');
        this.spaceGraph?.layoutEngine?.fixNode(this);
    }
    /**
     * Called during resize operation. Updates node size.
     * @param {number} newWidth
     * @param {number} newHeight
     */
    resize(newWidth, newHeight) { this.setSize(newWidth, newHeight); }
    /**
     * Called when resize operation ends. Removes 'resizing' class and releases node in layout.
     */
    endResize() {
        this.htmlElement?.classList.remove('resizing');
        this.spaceGraph?.layoutEngine?.releaseNode(this);
    }
}

/**
 * @class NoteNode
 * @classdesc A specialized HtmlNodeElement for creating editable text notes.
 * @extends HtmlNodeElement
 */
export class NoteNode extends HtmlNodeElement {
    /**
     * @constructor
     * @param {string | null} id - Unique ID.
     * @param {{x:number, y:number, z:number}} [pos={x:0,y:0,z:0}] - Initial position.
     * @param {NodeDataObject} [data={content:''}] - Initial data, typically just `content`.
     */
    constructor(id, pos = {x: 0, y: 0, z: 0}, data = {content: ''}) {
        const mergedData = { ...data, type: 'note', editable: true, label: data.content || data.label };
        super(id, pos, mergedData);
    }
}

/**
 * @class RegisteredNode
 * @classdesc A node type that is created and managed based on a `TypeDefinition` registered with SpaceGraph.
 * This allows for custom node behaviors and appearances.
 * @extends BaseNode
 */
export class RegisteredNode extends BaseNode {
    /** @property {TypeDefinition | null} typeDefinition - The definition object that dictates this node's behavior and appearance. */
    typeDefinition = null;
    /** @property {HTMLElement[]} portElements - Array of DOM elements representing input/output ports, if any. */
    portElements = [];

    /**
     * @constructor
     * @param {string} id - Unique ID for the node.
     * @param {NodeDataObject} initialUserData - Initial data for the node, including its type and potentially x,y,z coordinates.
     * @param {TypeDefinition} typeDefinition - The type definition object from `SpaceGraph.nodeTypes`.
     * @param {SpaceGraph} spaceGraphRef - Reference to the parent SpaceGraph instance.
     */
    constructor(id, initialUserData, typeDefinition, spaceGraphRef) {
        super(id,
              { x: initialUserData.x ?? 0, y: initialUserData.y ?? 0, z: initialUserData.z ?? 0 },
              initialUserData, // Pass all initialUserData to BaseNode, it will merge with defaults
              initialUserData.mass ?? typeDefinition.getDefaults?.(initialUserData)?.mass ?? 1.0);

        this.typeDefinition = typeDefinition;
        this.spaceGraph = spaceGraphRef; // Crucial for callbacks in typeDefinition

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
            if (this.labelObject) this.labelObject.userData = { nodeId: this.id, type: `${this.data.type}-label`};
        }

        this.portElements = [];
        this._createAndRenderPorts(); // Create ports if defined in data.ports and htmlElement exists

        this.update(); // Initial update call
    }

    /**
     * @override
     * @returns {object} Default data by invoking `getDefaults` from the type definition.
     * @protected
     */
    getDefaultData() {
        // data property is already populated by BaseNode constructor using initialUserData.
        // typeDefinition.getDefaults might be used to fill in any missing type-specific properties.
        const typeDefDefaults = this.typeDefinition?.getDefaults ? this.typeDefinition.getDefaults(this.data || {}) : {};
        return typeDefDefaults; // BaseNode will merge this with its own defaults (like label:id)
    }

    /**
     * Creates and renders HTML elements for input/output ports if defined in `this.data.ports`
     * and an `htmlElement` exists to append them to.
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
        this.portElements.forEach(pE => pE.remove());
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
                portEl.style.left = `-${portSize/2}px`; // Half outside
                const yPos = (nodeHeight / (inputKeys.length + 1)) * (i + 1) - (portSize / 2);
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
                portEl.style.right = `-${portSize/2}px`;
                const yPos = (nodeHeight / (outputKeys.length + 1)) * (i + 1) - (portSize / 2);
                portEl.style.top = `${Math.max(0, Math.min(nodeHeight - portSize, yPos))}px`;

                this.htmlElement.appendChild(portEl);
                this.portElements.push(portEl);
            });
        }
    }

    /**
     * @override
     * Calls `onUpdate` from the type definition if provided, otherwise performs basic updates.
     */
    update(spaceGraphInstance) {
        if (this.typeDefinition?.onUpdate) {
            this.typeDefinition.onUpdate(this, this.spaceGraph || spaceGraphInstance);
        } else {
            // Default update logic if onUpdate is not provided
            if (this.cssObject) this.cssObject.position.copy(this.position);
            if (this.mesh) this.mesh.position.copy(this.position);
            // Basic label billboarding & positioning
            if (this.labelObject && (this.spaceGraph?._camera || spaceGraphInstance?._camera)) {
                const offset = (this.getBoundingSphereRadius() * 1.1) + 10; // Default offset logic
                this.labelObject.position.copy(this.position).y += offset;
                this.labelObject.quaternion.copy((this.spaceGraph?._camera || spaceGraphInstance?._camera).quaternion);
            }
        }
    }

    /**
     * @override
     * Calls `onDispose` from the type definition and cleans up visual elements.
     */
    dispose() {
        if (this.typeDefinition?.onDispose) {
            this.typeDefinition.onDispose(this);
        }

        this.portElements.forEach(portEl => portEl.remove());
        this.portElements = [];

        // Dispose Three.js resources
        this.mesh?.geometry?.dispose(); this.mesh?.material?.dispose(); this.mesh?.parent?.remove(this.mesh);
        this.cssObject?.element?.remove(); this.cssObject?.parent?.remove(this.cssObject); // cssObject.element is the htmlElement
        this.labelObject?.element?.remove(); this.labelObject?.parent?.remove(this.labelObject);

        this.mesh = null; this.cssObject = null; this.htmlElement = null; this.labelObject = null;
        this.typeDefinition = null; // Release reference to type definition
        super.dispose();
    }

    /**
     * @override
     * Calls `onSetPosition` from type definition or applies default position update.
     */
    setPosition(x,y,z) {
        super.setPosition(x,y,z);
        if (this.typeDefinition?.onSetPosition) {
            this.typeDefinition.onSetPosition(this,x,y,z);
        } else {
            // Default position update for visuals if not handled by onSetPosition
            if (this.mesh) this.mesh.position.copy(this.position);
            if (this.cssObject) this.cssObject.position.copy(this.position);
            // Label position is typically handled in 'update' for billboarding
        }
    }

    /**
     * @override
     * Calls `onSetSelectedStyle` from type definition or applies default selection style.
     * Also manages visibility of port elements.
     */
    setSelectedStyle(selected) {
        // Show/hide ports based on selection
        if (this.portElements && this.portElements.length > 0) {
            this.portElements.forEach(portEl => {
                portEl.style.display = selected ? 'block' : 'none'; // Or use a class
            });
        }

        if (this.typeDefinition?.onSetSelectedStyle) {
            this.typeDefinition.onSetSelectedStyle(this, selected);
        } else {
            // Default selection style
            if (this.htmlElement) this.htmlElement.classList.toggle('selected', selected);
            else if (this.mesh?.material?.emissive) this.mesh.material.emissive.setHex(selected ? 0x888800 : 0x000000); // Example emissive highlight

            if (this.labelObject?.element) this.labelObject.element.classList.toggle('selected', selected);
        }
    }

    /**
     * Applies or removes hover style. Calls `onSetHoverStyle` from type definition if available.
     * @param {boolean} hovered - True if hovered, false otherwise.
     */
    setHoverStyle(hovered) {
        if (this.typeDefinition?.onSetHoverStyle) {
            this.typeDefinition.onSetHoverStyle(this,hovered);
        }
        // No default hover style for ports beyond CSS :hover for now
    }

    /**
     * @override
     * Calls `getBoundingSphereRadius` from type definition or calculates based on visuals.
     * @returns {number}
     */
    getBoundingSphereRadius() {
        if (this.typeDefinition?.getBoundingSphereRadius) {
            return this.typeDefinition.getBoundingSphereRadius(this);
        }
        if (this.htmlElement) return Math.max(this.htmlElement.offsetWidth, this.htmlElement.offsetHeight) / 2;
        if (this.mesh?.geometry) {
            if (!this.mesh.geometry.boundingSphere) this.mesh.geometry.computeBoundingSphere();
            return this.mesh.geometry.boundingSphere.radius;
        }
        return super.getBoundingSphereRadius(); // Fallback to BaseNode default
    }

    /** @override */
    startDrag() {
        if (this.typeDefinition?.onStartDrag) this.typeDefinition.onStartDrag(this); else super.startDrag();
    }
    /** @override */
    drag(newPosition) {
        if (this.typeDefinition?.onDrag) this.typeDefinition.onDrag(this, newPosition); else super.drag(newPosition);
    }
    /** @override */
    endDrag() {
        if (this.typeDefinition?.onEndDrag) this.typeDefinition.onEndDrag(this); else super.endDrag();
    }
}

/**
 * @class ShapeNode
 * @classdesc Represents a simple geometric shape (e.g., box, sphere) node using WebGL.
 * @extends BaseNode
 */
export class ShapeNode extends BaseNode {
    /** @property {string} shape - The type of geometric shape (e.g., 'sphere', 'box'). */
    shape = 'sphere';
    /** @property {number} size - The characteristic size of the shape (e.g., diameter for sphere, side length for box). */
    size = 50;
    /** @property {number} color - The hexadecimal color of the shape. */
    color = 0xffffff;

    /**
     * @constructor
     * @param {string | null} id - Unique ID.
     * @param {{x: number, y: number, z: number}} position - Initial position.
     * @param {NodeDataObject} [data={}] - Initial data, including `shape`, `size`, `color`, `label`.
     * @param {number} [mass=1.5] - Mass of the node.
     */
    constructor(id, position, data = {}, mass = 1.5) {
        if (data.spaceGraph) this.spaceGraph = data.spaceGraph;
        super(id, position, data, mass);

        const shapeDefaults = this.spaceGraph?.config?.defaults?.node?.shape || {};

        // Properties are taken from data if provided, then from graph config defaults, then from class hardcoded defaults.
        // this.data already contains merged data from constructor's `data` and `getDefaultData`.
        this.shape = data.shape ?? this.data.shape ?? shapeDefaults.shape ?? 'sphere';
        this.size = data.size ?? this.data.size ?? shapeDefaults.size ?? 50;
        this.color = data.color ?? this.data.color ?? shapeDefaults.color ?? 0xffffff;

        // Ensure this.data reflects the final chosen values if they came from graphDefaults or class defaults
        this.data.shape = this.shape;
        this.data.size = this.size;
        this.data.color = this.color;


        this.mesh = this._createMesh();
        this.mesh.userData = { nodeId: this.id, type: 'shape-node' }; // For raycasting

        if (this.data.label) {
            this.labelObject = this._createLabel();
            this.labelObject.userData = { nodeId: this.id, type: 'shape-label' };
        }
        this.update(); // Initial position update
    }

    /**
     * @override
     * @returns {NodeDataObject} Default data specific to ShapeNode.
     * @protected
     */
    getDefaultData() {
        const graphDefaults = this.spaceGraph?.config?.defaults?.node?.shape || {};
        return {
            ...super.getDefaultData(),
            type: 'shape',
            shape: graphDefaults.shape ?? 'sphere',
            size: graphDefaults.size ?? 50,
            color: graphDefaults.color ?? 0xffffff,
            // label is from super.getDefaultData()
        };
    }

    /**
     * Creates the Three.js mesh for the shape.
     * @returns {THREE.Mesh} The created mesh.
     * @private
     */
    _createMesh() {
        let geometry;
        const effectiveSize = Math.max(10, this.size); // Minimum size
        switch (this.shape) {
            case 'box':
                geometry = new THREE.BoxGeometry(effectiveSize, effectiveSize, effectiveSize);
                break;
            case 'sphere':
            default:
                geometry = new THREE.SphereGeometry(effectiveSize / 2, 16, 12); // Diameter to radius
                break;
        }
        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.6,
            metalness: 0.2,
        });
        return new THREE.Mesh(geometry, material);
    }

    /**
     * Creates a CSS3DObject for the node's label if a label is provided in data.
     * @returns {CSS3DObject | null} The created label object, or null.
     * @private
     */
    _createLabel() {
        const div = document.createElement('div');
        div.className = 'node-label-3d'; // For styling via CSS
        div.textContent = this.data.label;
        div.dataset.nodeId = this.id; // For potential interaction
        Object.assign(div.style, { // Basic default styling
            color: 'white', backgroundColor: 'rgba(0,0,0,0.6)', padding: '3px 6px',
            borderRadius: '4px', fontSize: '14px', pointerEvents: 'none', // Non-interactive by default
            textAlign: 'center',
        });
        return new CSS3DObject(div);
    }

    /**
     * @override
     * Updates the position of the mesh and the label (if it exists and faces the camera).
     */
    update(spaceGraphInstance) {
        if (this.mesh) this.mesh.position.copy(this.position);
        if (this.labelObject) {
            const offset = this.getBoundingSphereRadius() * 1.1 + 10; // Position label above the node
            this.labelObject.position.copy(this.position).y += offset;
            if (spaceGraphInstance?._camera) { // Billboard the label
                this.labelObject.quaternion.copy(spaceGraphInstance._camera.quaternion);
            }
        }
    }

    /**
     * @override
     * Disposes of the mesh, its geometry/material, and the label object.
     */
    dispose() {
        super.dispose();
        this.mesh?.geometry?.dispose();
        this.mesh?.material?.dispose();
        this.mesh?.parent?.remove(this.mesh);
        this.mesh = null;

        this.labelObject?.element?.remove(); // Remove HTML element of CSS3DObject
        this.labelObject?.parent?.remove(this.labelObject);
        this.labelObject = null;
    }

    /**
     * @override
     * Calculates bounding sphere radius based on the shape and size.
     * @returns {number}
     */
    getBoundingSphereRadius() {
        switch (this.shape) {
            case 'box': return Math.sqrt(3 * (this.size / 2) ** 2); // Half-diagonal of the box
            case 'sphere':
            default: return this.size / 2; // Radius of the sphere
        }
    }

    /**
     * @override
     * Applies selection style: sets emissive color on the mesh and toggles 'selected' class on label.
     */
    setSelectedStyle(selected) {
        if (this.mesh?.material) {
            // Ensure material has emissive property (MeshStandardMaterial does)
            this.mesh.material.emissive?.setHex(selected ? 0x888800 : 0x000000); // Yellowish tint when selected
        }
        this.labelObject?.element?.classList.toggle('selected', selected);
    }
}

/**
 * @class Edge
 * @classdesc Represents a connection (edge) between two nodes in the graph.
 * Manages its visual representation (a Three.js line) and associated data.
 */
export class Edge {
    /** @property {string} id - Unique identifier for the edge. */
    id;
    /** @property {BaseNode | null} source - The source node of the edge. */
    source;
    /** @property {BaseNode | null} target - The target node of the edge. */
    target;
    /** @property {SpaceGraph | null} spaceGraph - Reference to the parent SpaceGraph instance. */
    spaceGraph = null;
    /** @property {THREE.Line | null} threeObject - The Three.js Line object representing the edge. */
    threeObject = null;
    /**
     * @property {EdgeDataObject} data - Data associated with the edge, controlling its appearance and physics.
     * @property {number} data.color - Default color: `0x00d0ff`.
     * @property {number} data.thickness - Default thickness: `1.5`.
     * @property {string} data.style - Default style: `'solid'`. (Future: 'dashed')
     * @property {string} data.constraintType - Default physics constraint: `'elastic'`. Others: 'rigid', 'weld'.
     * @property {object} data.constraintParams - Parameters for the constraint.
     * @property {number} data.constraintParams.stiffness - Stiffness for elastic/rigid constraints.
     * @property {number} data.constraintParams.idealLength - Ideal length for elastic constraints.
     * @property {number} data.constraintParams.distance - Fixed distance for rigid/weld constraints.
     */
    data = {
        color: 0x00d0ff,
        thickness: 1.5,
        style: 'solid', // Future: 'dashed'
        constraintType: 'elastic', // 'elastic', 'rigid', 'weld'
        constraintParams: { stiffness: 0.001, idealLength: 200 } // Defaults for elastic
    };

    /**
     * @constructor
     * @param {string} id - Unique ID for the edge.
     * @param {BaseNode} sourceNode - The source node.
     * @param {BaseNode} targetNode - The target node.
     * @param {Partial<EdgeDataObject>} [data={}] - Optional data to override defaults.
     * @throws {Error} If sourceNode or targetNode is not provided.
     */
    constructor(id, sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode) throw new Error("Edge requires valid source and target nodes.");
        this.id = id;
        this.source = sourceNode;
        this.target = targetNode;
        this.spaceGraph = sourceNode.spaceGraph; // Assume sourceNode has spaceGraph reference

        const edgeDefaults = this.spaceGraph?.config?.defaults?.edge || {};

        // Smart default constraint parameters based on type, merged with provided data
        const defaultConstraintParams = this._getDefaultConstraintParams(data.constraintType || this.data.constraintType, sourceNode, targetNode);

        // Initialize this.data by merging class defaults, graph config defaults, and then specific instance data
        const classDefaults = { // The original hardcoded defaults of the Edge class
            color: 0x00d0ff,
            thickness: 1.5,
            style: 'solid',
            opacity: 0.6, // Added opacity to defaults
            constraintType: 'elastic',
            constraintParams: { stiffness: 0.001, idealLength: 200 }
        };

        this.data = {
            ...classDefaults, // Start with class's own hardcoded defaults
            color: edgeDefaults.color ?? classDefaults.color, // Then apply graph config defaults
            thickness: edgeDefaults.thickness ?? classDefaults.thickness,
            opacity: edgeDefaults.opacity ?? classDefaults.opacity,
            ...data,      // Override with any data provided for this specific edge instance
            constraintParams: { // Deep merge for constraintParams separately
                ...classDefaults.constraintParams, // Base for constraint params
                ...defaultConstraintParams,        // Overwrite with type-specific smart defaults
                ...(data.constraintParams || {})   // Finally, apply instance-specific constraint params
            }
        };

        this.threeObject = this._createThreeObject(); // Uses this.data for color, thickness, opacity
        this.update(); // Initial update of line positions
    }

    /**
     * Determines default constraint parameters based on the constraint type.
     * @param {string} constraintType - The type of constraint.
     * @param {BaseNode} sourceNode - The source node.
     * @param {BaseNode} targetNode - The target node.
     * @returns {object} Default parameters for the given constraint type.
     * @private
     */
    _getDefaultConstraintParams(constraintType, sourceNode, targetNode) {
        switch (constraintType) {
            case 'rigid':
                return { distance: sourceNode.position.distanceTo(targetNode.position), stiffness: 0.1 };
            case 'weld':
                return { distance: sourceNode.getBoundingSphereRadius() + targetNode.getBoundingSphereRadius(), stiffness: 0.5 };
            case 'elastic':
            default:
                return { stiffness: 0.001, idealLength: 200 };
        }
    }

    /**
     * Creates the Three.js Line object for the edge.
     * @returns {THREE.Line} The line object.
     * @private
     */
    _createThreeObject() {
        const material = new THREE.LineBasicMaterial({
            color: this.data.color,
            linewidth: this.data.thickness, // Note: linewidth > 1 often not effective in WebGL without extensions
            transparent: true,
            opacity: this.data.opacity, // Use configured opacity
            depthTest: false, // Render lines on top of meshes for better visibility
        });
        const points = [this.source.position.clone(), this.target.position.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.renderOrder = -1; // Render before most other objects, can be adjusted
        line.userData.edgeId = this.id; // For raycasting identification
        return line;
    }

    /**
     * Updates the edge's line geometry to reflect current source and target node positions.
     * Called by SpaceGraph in the animation loop.
     */
    update() {
        if (!this.threeObject || !this.source || !this.target) return;
        const positions = this.threeObject.geometry.attributes.position;
        positions.setXYZ(0, this.source.position.x, this.source.position.y, this.source.position.z);
        positions.setXYZ(1, this.target.position.x, this.target.position.y, this.target.position.z);
        positions.needsUpdate = true;
        this.threeObject.geometry.computeBoundingSphere(); // Important for raycasting
    }

    /**
     * Sets a visual highlight state for the edge.
     * @param {boolean} highlight - True to highlight, false to unhighlight.
     */
    setHighlight(highlight) {
        if (!this.threeObject?.material) return;
        this.threeObject.material.opacity = highlight ? 1.0 : 0.6;
        // Consider changing color or thickness too, if desired
        this.threeObject.material.color.set(highlight ? 0x00ffff : this.data.color); // Example: Cyan highlight
        this.threeObject.material.needsUpdate = true;
    }

    /**
     * Cleans up resources used by the edge (geometry, material).
     */
    dispose() {
        if (this.threeObject) {
            this.threeObject.geometry?.dispose();
            this.threeObject.material?.dispose();
            this.threeObject.parent?.remove(this.threeObject);
            this.threeObject = null;
        }
        // Clear references to break potential cycles, though JS GC should handle this
        this.source = null;
        this.target = null;
        this.spaceGraph = null;
    }
}

/**
 * @class UIManager
 * @classdesc Manages user interactions, context menus, dialogs, and input event handling for SpaceGraph.
 */
export class UIManager {
    /** @property {SpaceGraph} spaceGraph - Reference to the main SpaceGraph instance. */
    spaceGraph = null;
    /** @property {HTMLElement} container - The DOM element containing the SpaceGraph. */
    container = null;
    /** @property {HTMLElement | null} contextMenuElement - DOM element for the context menu. */
    contextMenuElement = null;
    /** @property {HTMLElement | null} confirmDialogElement - DOM element for confirmation dialogs. */
    confirmDialogElement = null;
    /** @property {CSS3DObject | null} edgeMenuObject - CSS3DObject used to display a menu for a selected edge. */
    edgeMenuObject = null;

    /** @property {BaseNode | null} draggedNode - The node currently being dragged by the user. */
    draggedNode = null;
    /** @property {HtmlNodeElement | null} resizedNode - The HTML node currently being resized. */
    resizedNode = null;
    /** @property {Edge | null} hoveredEdge - The edge currently being hovered over by the mouse. */
    hoveredEdge = null;
    /** @property {{x: number, y: number}} resizeStartPos - Screen coordinates where resizing started. */
    resizeStartPos = {x: 0, y: 0};
    /** @property {{width: number, height: number}} resizeStartSize - Original size of the node when resizing started. */
    resizeStartSize = {width: 0, height: 0};
    /** @property {THREE.Vector3} dragOffset - Offset from the node's origin to the point where dragging started. */
    dragOffset = new THREE.Vector3();

    /**
     * @property {object} pointerState - Tracks the state of pointer interactions.
     * @property {boolean} pointerState.down - Is any pointer button currently pressed.
     * @property {boolean} pointerState.primary - Is the primary button (left-click) pressed.
     * @property {boolean} pointerState.secondary - Is the secondary button (right-click) pressed.
     * @property {boolean} pointerState.middle - Is the middle button pressed.
     * @property {boolean} pointerState.potentialClick - True if the current interaction could be a click (no significant drag).
     * @property {{x: number, y: number}} pointerState.lastPos - Last recorded pointer position.
     * @property {{x: number, y: number}} pointerState.startPos - Pointer position where the current interaction started.
     */
    pointerState = {
        down: false, primary: false, secondary: false, middle: false,
        potentialClick: true, lastPos: {x: 0, y: 0}, startPos: {x: 0, y: 0}
    };
    /** @property {function | null} confirmCallback - Callback function to execute if a confirmation dialog is accepted. */
    confirmCallback = null;
    /** @property {HTMLElement | null} statusIndicatorElement - DOM element to display brief status messages. */
    statusIndicatorElement = null;

    /**
     * @property {HTMLElement | null} linkingTargetPortElement - The port element currently highlighted as a valid target during linking.
     * @private
     */
    linkingTargetPortElement = null;

    /**
     * @typedef {object} UIElements
     * @property {HTMLElement} [contextMenuEl] - Pre-existing DOM element for the context menu.
     * @property {HTMLElement} [confirmDialogEl] - Pre-existing DOM element for the confirmation dialog.
     * @property {HTMLElement} [statusIndicatorEl] - Pre-existing DOM element for the status indicator.
     */

    /**
     * @constructor
     * @param {SpaceGraph} spaceGraph - The SpaceGraph instance to manage UI for.
     * @param {UIElements} [uiElements={}] - Optional pre-existing UI DOM elements.
     * @throws {Error} If spaceGraph is not provided.
     */
    constructor(spaceGraph, uiElements = {}) {
        if (!spaceGraph) {
            throw new Error("UIManager requires a SpaceGraph instance.");
        }
        this.spaceGraph = spaceGraph;
        this.container = spaceGraph.container;

        // Initialize UI elements, creating them if not provided
        this.contextMenuElement = uiElements.contextMenuEl || document.querySelector('#context-menu');
        if (!this.contextMenuElement || !document.body.contains(this.contextMenuElement)) {
            this.contextMenuElement = document.createElement('div');
            this.contextMenuElement.id = 'context-menu';
            this.contextMenuElement.className = 'context-menu'; // For CSS styling
            document.body.appendChild(this.contextMenuElement);
        }

        this.confirmDialogElement = uiElements.confirmDialogEl || document.querySelector('#confirm-dialog');
        if (!this.confirmDialogElement || !document.body.contains(this.confirmDialogElement)) {
            this.confirmDialogElement = document.createElement('div');
            this.confirmDialogElement.id = 'confirm-dialog';
            this.confirmDialogElement.className = 'dialog'; // For CSS styling
            this.confirmDialogElement.innerHTML = '<p id="confirm-message">Are you sure?</p><button id="confirm-yes">Yes</button><button id="confirm-no">No</button>';
            document.body.appendChild(this.confirmDialogElement);
        }

        this.statusIndicatorElement = uiElements.statusIndicatorEl || document.querySelector('#status-indicator');
        if (!this.statusIndicatorElement || !document.body.contains(this.statusIndicatorElement)) {
            this.statusIndicatorElement = document.createElement('div');
            this.statusIndicatorElement.id = 'status-indicator';
            // CSS typically handles initial visibility/fade-in
            document.body.appendChild(this.statusIndicatorElement);
        }

        this._bindEvents();
    }

    /**
     * Binds all necessary event listeners for UI interactions.
     * @private
     */
    _bindEvents() {
        const opts = { passive: false }; // For event listeners where preventDefault might be called
        this.container.addEventListener('pointerdown', this._onPointerDown.bind(this), false);
        window.addEventListener('pointermove', this._onPointerMove.bind(this), false); // Listen on window for dragging outside container
        window.addEventListener('pointerup', this._onPointerUp.bind(this), false); // Listen on window for releasing outside container
        this.container.addEventListener('contextmenu', this._onContextMenu.bind(this), opts);

        // Drag and Drop from palette (or external source if data type matches)
        this.container.addEventListener('dragover', this._onDragOver.bind(this), false);
        this.container.addEventListener('drop', this._onDrop.bind(this), false);

        // Global click listener to hide menus if clicked outside
        document.addEventListener('click', this._onDocumentClick.bind(this), true); // Use capture phase

        // Listeners for UI elements if they exist
        this.contextMenuElement?.addEventListener('click', this._onContextMenuClick.bind(this), false);
        $('#confirm-yes', this.confirmDialogElement)?.addEventListener('click', this._onConfirmYes.bind(this), false);
        $('#confirm-no', this.confirmDialogElement)?.addEventListener('click', this._onConfirmNo.bind(this), false);
        window.addEventListener('keydown', this._onKeyDown.bind(this), false); // Global keydown for shortcuts
        this.container.addEventListener('wheel', this._onWheel.bind(this), opts); // Wheel for zooming/panning
    }

    /**
     * Updates the internal pointer state based on a pointer event.
     * @param {PointerEvent} e - The pointer event.
     * @param {boolean} isDown - True if the pointer button is being pressed, false if released.
     * @private
     */
    _updatePointerState(e, isDown) {
        this.pointerState.down = isDown;
        this.pointerState.primary = isDown && e.button === 0;
        this.pointerState.secondary = isDown && e.button === 2;
        this.pointerState.middle = isDown && e.button === 1;
        if (isDown) {
            this.pointerState.potentialClick = true; // Reset on new mousedown
            this.pointerState.startPos = {x: e.clientX, y: e.clientY};
        }
        this.pointerState.lastPos = {x: e.clientX, y: e.clientY};
    }

    /**
     * Gathers information about the UI element and graph object (node/edge) under the cursor.
     * @param {MouseEvent} event - The mouse event (typically pointerdown, pointermove, or contextmenu).
     * @returns {{
     *   element: HTMLElement | null,
     *   nodeHtmlElement: HTMLElement | null,
     *   resizeHandle: HTMLElement | null,
     *   nodeControlsButton: HTMLElement | null,
     *   contentEditable: HTMLElement | null,
     *   interactiveInNode: HTMLElement | null,
     *   node: BaseNode | null,
     *   intersectedEdge: Edge | null
     * }}
     * @private
     */
    _getTargetInfo(event) {
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const nodeHtmlElement = element?.closest('.node-html'); // Check if over an HTML node
        const resizeHandle = element?.closest('.resize-handle');
        const nodeControlsButton = element?.closest('.node-controls button');
        const contentEditable = element?.closest('[contenteditable="true"]');
        const interactiveInNode = element?.closest('.node-content button, .node-content input, .node-content a');

        let node = null;
        if (nodeHtmlElement) {
            node = this.spaceGraph.getNodeById(nodeHtmlElement.dataset.nodeId);
        }

        let intersectedEdge = null;
        let intersectedShapeNode = null; // Specifically for ShapeNode, as HTML nodes are found above

        // If not a direct interaction with an HTML node's specific parts (like resize handle or button),
        // then perform raycasting to find 3D objects (ShapeNodes, Edges).
        const isDirectHtmlInteraction = nodeHtmlElement && (resizeHandle || nodeControlsButton || contentEditable || interactiveInNode);

        if (!isDirectHtmlInteraction) {
            const intersected = this.spaceGraph.intersectedObject(event.clientX, event.clientY);
            if (intersected) {
                if (intersected instanceof Edge) {
                    intersectedEdge = intersected;
                } else if (intersected instanceof ShapeNode) { // Only consider ShapeNode here, HtmlNodeElement found via DOM
                    intersectedShapeNode = intersected;
                    if (!node) node = intersectedShapeNode; // Prioritize HtmlNodeElement if both somehow present
                }
            }
        }
        
        return {
            element, nodeHtmlElement, resizeHandle, nodeControlsButton, contentEditable, interactiveInNode,
            node: node || intersectedShapeNode, // Final node (HTML or Shape)
            intersectedEdge
        };
    }

    /**
     * Handles pointer down events on the SpaceGraph container.
     * Initiates node dragging, resizing, linking, or camera panning.
     * @param {PointerEvent} e - The pointer event.
     * @private
     */
    _onPointerDown(e) {
        this._updatePointerState(e, true);
        const targetInfo = this._getTargetInfo(e);

        // Handle clicks on node internal controls (buttons)
        if (targetInfo.nodeControlsButton && targetInfo.node instanceof HtmlNodeElement) {
            e.preventDefault(); e.stopPropagation(); // Prevent graph interaction
            this._handleNodeControlButtonClick(targetInfo.nodeControlsButton, targetInfo.node);
            this._hideContextMenu(); return;
        }

        // Handle clicks on node ports for linking
        const portElement = targetInfo.element?.closest('.node-port');
        if (portElement && targetInfo.node) {
            e.preventDefault(); e.stopPropagation();
            this.spaceGraph.isLinking = true;
            this.spaceGraph.linkSourceNode = targetInfo.node;
            this.spaceGraph.linkSourcePortInfo = { // Store info about the source port
                name: portElement.dataset.portName,
                type: portElement.dataset.portType, // 'input' or 'output'
                element: portElement // Optional: for visual feedback on source port later
            };
            this._createTempLinkLine(targetInfo.node /*, portElement */); // Pass portElement if line should start from port
            this.container.style.cursor = 'crosshair';
            this._hideContextMenu();
            return;
        }

        // Handle clicks on resize handles for HTML nodes
        if (targetInfo.resizeHandle && targetInfo.node instanceof HtmlNodeElement) {
            e.preventDefault(); e.stopPropagation();
            this.resizedNode = targetInfo.node;
            this.resizedNode.startResize();
            this.resizeStartPos = {x: e.clientX, y: e.clientY};
            this.resizeStartSize = {...this.resizedNode.size}; // Copy size
            this.container.style.cursor = 'nwse-resize'; // Indicate resizing
            this._hideContextMenu(); return;
        }

        // Handle interactions with a node (dragging or selecting)
        if (targetInfo.node) {
            if (targetInfo.interactiveInNode || targetInfo.contentEditable) {
                 e.stopPropagation(); // Allow interaction with node's internal content
                 if(this.spaceGraph.selectedNode !== targetInfo.node) this.spaceGraph.setSelectedNode(targetInfo.node);
                 this._hideContextMenu();
            } else { // Start dragging the node
                e.preventDefault();
                this.draggedNode = targetInfo.node;
                this.draggedNode.startDrag();
                if (this.draggedNode instanceof HtmlNodeElement && this.draggedNode.htmlElement) {
                    this.draggedNode.htmlElement.classList.add('node-dragging-html'); // Visual feedback
                }
                // Calculate offset for smooth dragging
                const worldPos = this.spaceGraph.screenToWorld(e.clientX, e.clientY, this.draggedNode.position.z);
                this.dragOffset = worldPos ? worldPos.sub(this.draggedNode.position) : new THREE.Vector3();
                this.container.style.cursor = 'grabbing';
                if(this.spaceGraph.selectedNode !== targetInfo.node) this.spaceGraph.setSelectedNode(targetInfo.node);
                this._hideContextMenu(); return;
            }
        } else if (targetInfo.intersectedEdge) { // Handle interaction with an edge
            e.preventDefault();
            this.spaceGraph.setSelectedEdge(targetInfo.intersectedEdge);
            this._hideContextMenu(); return;
        } else { // Clicked on background
            this._hideContextMenu();
            if (this.spaceGraph.selectedNode || this.spaceGraph.selectedEdge) {
                // If something was selected, a background click might deselect (handled in _onPointerUp if it's a click)
            } else if (this.pointerState.primary) { // If nothing selected, primary click on background starts camera pan
                this.spaceGraph.cameraController?.startPan(e);
            }
        }
    }

    /**
     * Handles clicks on internal control buttons of an HtmlNodeElement.
     * @param {HTMLElement} button - The clicked button element.
     * @param {HtmlNodeElement} node - The node to which the button belongs.
     * @private
     */
    _handleNodeControlButtonClick(button, node) {
        if (!(node instanceof HtmlNodeElement)) return;

        const actionMap = {
            'node-delete': () => this._showConfirm(`Delete node "${node.id.substring(0,10)}..."?`, () => this.spaceGraph.removeNode(node.id)),
            'node-content-zoom-in': () => node.adjustContentScale(1.15),
            'node-content-zoom-out': () => node.adjustContentScale(1/1.15),
            'node-grow': () => node.adjustNodeSize(1.2),
            'node-shrink': () => node.adjustNodeSize(0.8)
        };
        for (const cls of button.classList) { // Check button's classes for an action
            if (actionMap[cls]) {
                actionMap[cls]();
                break;
            }
        }
    }

    /**
     * Handles pointer move events. Updates node dragging, resizing, link creation, or camera panning.
     * @param {PointerEvent} e - The pointer event.
     * @private
     */
    _onPointerMove(e) {
        // Update potentialClick status if mouse moved significantly
        const dx = e.clientX - this.pointerState.lastPos.x;
        const dy = e.clientY - this.pointerState.lastPos.y;
        if (dx !== 0 || dy !== 0) this.pointerState.potentialClick = false;
        this.pointerState.lastPos = {x: e.clientX, y: e.clientY};

        // Handle node resizing
        if (this.resizedNode) {
            e.preventDefault();
            const newWidth = this.resizeStartSize.width + (e.clientX - this.resizeStartPos.x);
            const newHeight = this.resizeStartSize.height + (e.clientY - this.resizeStartPos.y);
            this.resizedNode.resize(newWidth, newHeight); return;
        }
        // Handle node dragging
        if (this.draggedNode) {
            e.preventDefault();
            const worldPos = this.spaceGraph.screenToWorld(e.clientX, e.clientY, this.draggedNode.position.z);
            if (worldPos) this.draggedNode.drag(worldPos.sub(this.dragOffset)); return;
        }
        // Handle link creation (updating temporary line and highlighting target port/node)
        if (this.spaceGraph.isLinking) {
            e.preventDefault();
            this._updateTempLinkLine(e.clientX, e.clientY);

            // Clear previous target port highlight
            if (this.linkingTargetPortElement) {
                this.linkingTargetPortElement.classList.remove('linking-target-port');
                this.linkingTargetPortElement = null;
            }
            // Clear previous target node highlight (general node, not specific port)
            $$('.node-html.linking-target', this.container).forEach(el => el.classList.remove('linking-target'));

            const targetInfoMove = this._getTargetInfo(e); // Get info about what's under cursor now
            const targetNode = targetInfoMove.node;
            const targetPortElement = targetInfoMove.element?.closest('.node-port');

            if (targetPortElement && targetNode && targetNode !== this.spaceGraph.linkSourceNode) { // Hovering over a valid port on a different node
                const sourcePortType = this.spaceGraph.linkSourcePortInfo?.type;
                const targetPortType = targetPortElement.dataset.portType;
                // Basic validation: output can connect to input, or input to output
                if (sourcePortType && targetPortType && sourcePortType !== targetPortType) {
                    targetPortElement.classList.add('linking-target-port'); // Highlight valid target port
                    this.linkingTargetPortElement = targetPortElement;
                    if (targetNode.htmlElement) targetNode.htmlElement.classList.add('linking-target'); // Highlight node too
                }
            } else if (targetNode && targetNode !== this.spaceGraph.linkSourceNode && targetNode.htmlElement) {
                // If hovering over a valid node but not a specific port (allow node-to-node linking as fallback)
                 targetNode.htmlElement.classList.add('linking-target'); // Highlight node
            }
            return;
        }

        // Handle camera panning
        if (this.pointerState.primary && this.spaceGraph.cameraController?.isPanning) {
             this.spaceGraph.cameraController.pan(e);
        }

        // Handle edge hovering when not actively interacting with something else
        if (!this.pointerState.down && !this.resizedNode && !this.draggedNode && !this.spaceGraph.isLinking) {
            const { intersectedEdge } = this._getTargetInfo(e);
            if (this.hoveredEdge !== intersectedEdge) { // If hovered edge changed
                if (this.hoveredEdge && this.hoveredEdge !== this.spaceGraph.selectedEdge) {
                    this.hoveredEdge.setHighlight(false); // Unhighlight previous
                }
                this.hoveredEdge = intersectedEdge;
                if (this.hoveredEdge && this.hoveredEdge !== this.spaceGraph.selectedEdge) {
                    this.hoveredEdge.setHighlight(true); // Highlight new
                }
            }
        }
    }

    /**
     * Handles pointer up events. Finalizes dragging, resizing, linking, or click actions.
     * @param {PointerEvent} e - The pointer event.
     * @private
     */
    _onPointerUp(e) {
        this.container.style.cursor = this.spaceGraph.isLinking ? 'crosshair' : 'grab'; // Reset cursor

        if (this.resizedNode) { // Finalize resizing
            this.resizedNode.endResize(); this.resizedNode = null;
        } else if (this.draggedNode) { // Finalize dragging
            if (this.draggedNode instanceof HtmlNodeElement && this.draggedNode.htmlElement) {
                this.draggedNode.htmlElement.classList.remove('node-dragging-html');
            }
            this.draggedNode.endDrag(); this.draggedNode = null;
        } else if (this.spaceGraph.isLinking && e.button === 0) { // Finalize linking (primary button release)
            this._completeLinking(e);
        } else if (e.button === 1 && this.pointerState.potentialClick) { // Middle mouse button click (auto-zoom)
            const {node} = this._getTargetInfo(e);
            if (node) { this.spaceGraph.autoZoom(node); e.preventDefault(); }
        } else if (e.button === 0 && this.pointerState.potentialClick) { // Primary button click
             const targetInfo = this._getTargetInfo(e);
             // If clicked on background (not a node or edge) and not during a pan, deselect everything
             if (!targetInfo.node && !targetInfo.intersectedEdge && !this.spaceGraph.cameraController?.isPanning) {
                this.spaceGraph.setSelectedNode(null);
                this.spaceGraph.setSelectedEdge(null);
            }
        }

        this.spaceGraph.cameraController?.endPan(); // End any camera panning
        this._updatePointerState(e, false); // Update pointer state to "up"
        // Clear any lingering visual cues for linking targets
        $$('.node-html.linking-target', this.container).forEach(el => el.classList.remove('linking-target'));
        if (this.linkingTargetPortElement) {
            this.linkingTargetPortElement.classList.remove('linking-target-port');
            this.linkingTargetPortElement = null;
        }
    }

    /**
     * Handles context menu events (typically right-click). Displays a context-sensitive menu.
     * @param {MouseEvent} e - The mouse event.
     * @private
     */
    _onContextMenu(e) {
        e.preventDefault(); // Prevent default browser context menu
        this._hideContextMenu(); // Hide any existing menu
        const targetInfo = this._getTargetInfo(e);
        let items = []; // Items to show in the context menu

        if (targetInfo.node) { // Context menu on a node
            if (this.spaceGraph.selectedNode !== targetInfo.node) this.spaceGraph.setSelectedNode(targetInfo.node);
            items = this._getContextMenuItemsNode(targetInfo.node);
        } else if (targetInfo.intersectedEdge) { // Context menu on an edge
            if (this.spaceGraph.selectedEdge !== targetInfo.intersectedEdge) this.spaceGraph.setSelectedEdge(targetInfo.intersectedEdge);
            items = this._getContextMenuItemsEdge(targetInfo.intersectedEdge);
        } else { // Context menu on the background
            this.spaceGraph.setSelectedNode(null); this.spaceGraph.setSelectedEdge(null);
            const worldPos = this.spaceGraph.screenToWorld(e.clientX, e.clientY, 0); // Get world position for node creation
            items = this._getContextMenuItemsBackground(worldPos);
        }
        if (items.length > 0) this._showContextMenu(e.clientX, e.clientY, items);
    }

    /**
     * Handles global document clicks, primarily to hide menus if a click occurs outside them.
     * @param {MouseEvent} e - The click event.
     * @private
     */
    _onDocumentClick(e) {
        // Check if the click was inside any of the managed UI elements
        const clickedContextMenu = this.contextMenuElement?.contains(e.target);
        const clickedEdgeMenu = this.edgeMenuObject?.element?.contains(e.target);
        const clickedConfirmDialog = this.confirmDialogElement?.contains(e.target);

        if (!clickedContextMenu) this._hideContextMenu(); // Hide context menu if click was outside
        if (!clickedEdgeMenu && this.edgeMenuObject) { // If edge menu is open and click was outside
            const targetInfo = this._getTargetInfo(e);
            // Deselect edge if click was not on the currently selected edge
            if (this.spaceGraph.selectedEdge !== targetInfo.intersectedEdge) {
                 this.spaceGraph.setSelectedEdge(null);
            }
        }
        // Confirmation dialog is modal-like, usually handled by its own buttons, but this could be extended.
    }

    /**
     * Generates context menu items for a given node.
     * @param {BaseNode} node - The node for which to generate menu items.
     * @returns {Array<object>} An array of menu item objects.
     * @private
     */
    _getContextMenuItemsNode(node) {
        const items = [];
        if (node instanceof HtmlNodeElement && node.data.editable) {
            items.push({ label: "Edit Content 📝", action: "edit-node", nodeId: node.id });
        }
        // General node actions
        items.push({label: "Start Link (Node) ✨", action: "start-link-node", nodeId: node.id});
        items.push({label: "Auto Zoom / Back 🖱️", action: "autozoom-node", nodeId: node.id});
        items.push({type: 'separator'});
        items.push({label: "Delete Node 🗑️", action: "delete-node", nodeId: node.id, class: 'delete-action'});
        return items;
    }

    /**
     * Generates context menu items for a given edge.
     * @param {Edge} edge - The edge for which to generate menu items.
     * @returns {Array<object>} An array of menu item objects.
     * @private
     */
    _getContextMenuItemsEdge(edge) {
        return [
            {label: "Edit Edge Style...", action: "edit-edge", edgeId: edge.id}, // Placeholder for future style editing
            {label: "Reverse Edge Direction", action: "reverse-edge", edgeId: edge.id},
            {type: 'separator'},
            {label: "Delete Edge 🗑️", action: "delete-edge", edgeId: edge.id, class: 'delete-action'},
        ];
    }

    /**
     * Generates context menu items for the graph background.
     * @param {THREE.Vector3 | null} worldPos - The world position where the context menu was invoked.
     * @returns {Array<object>} An array of menu item objects.
     * @private
     */
    _getContextMenuItemsBackground(worldPos) {
        const items = [];
        if (worldPos) { // Actions to create nodes at the clicked position
            const posStr = JSON.stringify({x: Math.round(worldPos.x), y: Math.round(worldPos.y), z: Math.round(worldPos.z)});
            items.push({label: "Create Note Here 📝", action: "create-note", position: posStr});
            items.push({label: "Create Box Here 📦", action: "create-box", position: posStr});
            items.push({label: "Create Sphere Here 🌐", action: "create-sphere", position: posStr});
        }
        items.push({type: 'separator'});
        // General graph actions
        items.push({label: "Center View 🧭", action: "center-view"});
        items.push({label: "Reset Zoom & Pan", action: "reset-view"});
        items.push({
            label: this.spaceGraph.background.alpha === 0 ? "Set Dark Background" : "Set Transparent BG",
            action: "toggle-background"
        });
        return items;
    }

    /**
     * Handles clicks on items within the context menu.
     * @param {MouseEvent} event - The click event from the context menu.
     * @private
     */
    _onContextMenuClick(event) {
        const li = event.target.closest('li');
        if (!li || !li.dataset.action) return;
        const data = li.dataset; const action = data.action;
        this._hideContextMenu();

        // Define actions based on 'data.action'
        const actions = {
            'edit-node': () => {
                const node = this.spaceGraph.getNodeById(data.nodeId);
                if (node instanceof HtmlNodeElement && node.data.editable) {
                    node.htmlElement?.querySelector('.node-content')?.focus(); // Focus contenteditable part
                }
            },
            'delete-node': () => this._showConfirm(`Delete node "${data.nodeId.substring(0,10)}..."?`, () => this.spaceGraph.removeNode(data.nodeId)),
            'delete-edge': () => this._showConfirm(`Delete edge "${data.edgeId.substring(0,10)}..."?`, () => this.spaceGraph.removeEdge(data.edgeId)),
            'autozoom-node': () => { const n = this.spaceGraph.getNodeById(data.nodeId); if(n) this.spaceGraph.autoZoom(n); },
            'create-note': () => this._createNodeFromMenu(data.position, NoteNode, {content: 'New Note ✨'}),
            'create-box': () => this._createNodeFromMenu(data.position, ShapeNode, {label: 'Box', shape: 'box', color: Math.random() * 0xffffff}),
            'create-sphere': () => this._createNodeFromMenu(data.position, ShapeNode, {label: 'Sphere', shape: 'sphere', color: Math.random() * 0xffffff}),
            'center-view': () => this.spaceGraph.centerView(),
            'reset-view': () => this.spaceGraph.cameraController?.resetView(),
            'start-link-node': () => {
                const n = this.spaceGraph.getNodeById(data.nodeId);
                if(n) this._startLinking(n); // Node-to-node linking initiated from context menu
            },
            'reverse-edge': () => {
                const edge = this.spaceGraph.getEdgeById(data.edgeId);
                if (edge) { // Swap source and target
                    [edge.source, edge.target] = [edge.target, edge.source];
                    edge.update(); // Update visual representation
                    this.spaceGraph.layoutEngine?.kick(); // Re-evaluate layout
                }
            },
            'edit-edge': () => { // Selects the edge, which might show the edge menu for further edits
                const e = this.spaceGraph.getEdgeById(data.edgeId); if(e) this.spaceGraph.setSelectedEdge(e);
            },
            'toggle-background': () => this.spaceGraph.setBackground(
                this.spaceGraph.background.alpha === 0 ? 0x101018 : 0x000000, // Toggle between dark and transparent
                this.spaceGraph.background.alpha === 0 ? 1.0 : 0.0
            ),
        };
        actions[action]?.() ?? console.warn("Unknown context menu action:", action);
    }

    /**
     * Helper function to create a node from a context menu action.
     * @param {string} positionData - JSON string of the target position {x, y, z}.
     * @param {Function} NodeTypeClass - The class of the node to create (e.g., NoteNode, ShapeNode).
     * @param {object} nodeDataParams - Additional data parameters for the new node.
     * @private
     */
    _createNodeFromMenu(positionData, NodeTypeClass, nodeDataParams) {
        if (!positionData) { console.error("Position data missing for node creation"); return; }
        try {
            const pos = JSON.parse(positionData);
            const newNode = this.spaceGraph.addNode(new NodeTypeClass(null, pos, nodeDataParams));
            this.spaceGraph.layoutEngine?.kick(); // Adjust layout for new node
            // Focus and select the new node after a short delay to allow rendering
            setTimeout(() => {
                this.spaceGraph.focusOnNode(newNode, 0.6, true);
                this.spaceGraph.setSelectedNode(newNode);
                if (newNode instanceof NoteNode) { // If it's a note, focus its content for immediate editing
                    newNode.htmlElement?.querySelector('.node-content')?.focus();
                }
            }, 100);
        } catch (err) { console.error("Failed to create node from menu:", err); }
    }

    /**
     * Displays the context menu at the given screen coordinates with the specified items.
     * @param {number} x - Screen X coordinate.
     * @param {number} y - Screen Y coordinate.
     * @param {Array<object>} items - Array of menu item objects to display. Each item can have `label`, `action`, `type ('separator')`, `disabled`, `class`, and other `data-*` attributes.
     * @private
     */
    _showContextMenu(x, y, items) {
        if (!this.contextMenuElement) return;
        this.contextMenuElement.innerHTML = ''; // Clear previous items
        const ul = document.createElement('ul');
        items.forEach(item => {
            if (item.type === 'separator') {
                const li = document.createElement('li'); li.className = 'separator';
                ul.appendChild(li); return;
            }
            if (item.disabled) return; // Skip disabled items
            const li = document.createElement('li');
            li.textContent = item.label;
            if(item.class) li.classList.add(item.class);
            // Store all other item properties as data attributes for action handling
            Object.entries(item).forEach(([key, value]) => {
                if (value !== undefined && value !== null && key !== 'type' && key !== 'label' && key !== 'class') {
                    li.dataset[key] = typeof value === 'object' ? JSON.stringify(value) : value;
                }
            });
            ul.appendChild(li);
        });
        this.contextMenuElement.appendChild(ul);

        // Position the menu, ensuring it stays within viewport
        const menuWidth = this.contextMenuElement.offsetWidth;
        const menuHeight = this.contextMenuElement.offsetHeight;
        let finalX = x + 5; let finalY = y + 5;
        if (finalX + menuWidth > window.innerWidth) finalX = x - menuWidth - 5;
        if (finalY + menuHeight > window.innerHeight) finalY = y - menuHeight - 5;
        finalX = Math.max(5, finalX); finalY = Math.max(5, finalY); // Clamp to viewport edges

        this.contextMenuElement.style.left = `${finalX}px`;
        this.contextMenuElement.style.top = `${finalY}px`;
        this.contextMenuElement.style.display = 'block';
    }
    /**
     * Hides the context menu.
     * @private
     */
    _hideContextMenu = () => { if (this.contextMenuElement) this.contextMenuElement.style.display = 'none'; }

    /**
     * Shows a confirmation dialog.
     * @param {string} message - The message to display in the dialog.
     * @param {function} onConfirm - Callback function to execute if "Yes" is clicked.
     * @private
     */
    _showConfirm(message, onConfirm) {
        const msgEl = $('#confirm-message', this.confirmDialogElement);
        if (msgEl) msgEl.textContent = message;
        this.confirmCallback = onConfirm;
        if (this.confirmDialogElement) this.confirmDialogElement.style.display = 'block';
    }
    /**
     * Hides the confirmation dialog.
     * @private
     */
    _hideConfirm = () => { if (this.confirmDialogElement) this.confirmDialogElement.style.display = 'none'; this.confirmCallback = null; }
    /**
     * Handles "Yes" click in the confirmation dialog.
     * @private
     */
    _onConfirmYes = () => { this.confirmCallback?.(); this._hideConfirm(); }
    /**
     * Handles "No" click in the confirmation dialog.
     * @private
     */
    _onConfirmNo = () => { this._hideConfirm(); }

    /**
     * Initiates the node linking process.
     * @param {BaseNode} sourceNode - The node from which the link starts.
     * @param {HTMLElement | null} [sourcePortElement=null] - Optional source port element if linking from a specific port.
     * @private
     */
    _startLinking(sourceNode, sourcePortElement = null) {
        if (!sourceNode) return;
        this.spaceGraph.isLinking = true;
        this.spaceGraph.linkSourceNode = sourceNode;
        if (sourcePortElement) { // If linking starts from a specific port
            this.spaceGraph.linkSourcePortInfo = {
                name: sourcePortElement.dataset.portName,
                type: sourcePortElement.dataset.portType,
                element: sourcePortElement // Store for potential visual feedback
            };
        } else { // Node-to-node linking (no specific port)
            this.spaceGraph.linkSourcePortInfo = null;
        }
        this.container.style.cursor = 'crosshair';
        this._createTempLinkLine(sourceNode, sourcePortElement);
    }

    /**
     * Creates a temporary visual line when starting to link nodes.
     * @param {BaseNode} sourceNode - The source node of the link.
     * @param {HTMLElement | null} [sourcePortElement=null] - The specific port element on the source node, if any.
     * @private
     */
    _createTempLinkLine(sourceNode, sourcePortElement = null) {
        this._removeTempLinkLine(); // Clear any existing temp line
        const startPos = sourceNode.position.clone();
        // Future enhancement: if sourcePortElement, calculate its world position for a more precise line start.

        const material = new THREE.LineDashedMaterial({
            color: 0xffaa00, linewidth: 2, dashSize: 8, gapSize: 4,
            transparent: true, opacity: 0.9, depthTest: false
        });
        const points = [startPos.clone(), startPos.clone()]; // Start and end at same point initially
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.spaceGraph.tempLinkLine = new THREE.Line(geometry, material);
        this.spaceGraph.tempLinkLine.computeLineDistances(); // Required for dashed lines
        this.spaceGraph.tempLinkLine.renderOrder = 1; // Render above other lines
        this.spaceGraph.scene.add(this.spaceGraph.tempLinkLine);
    }

    /**
     * Updates the endpoint of the temporary linking line to follow the mouse cursor.
     * @param {number} screenX - Current X coordinate of the mouse.
     * @param {number} screenY - Current Y coordinate of the mouse.
     * @private
     */
    _updateTempLinkLine(screenX, screenY) {
        if (!this.spaceGraph.tempLinkLine || !this.spaceGraph.linkSourceNode) return;
        // Convert screen coords to world coords at the Z-depth of the source node (simplification)
        const targetPos = this.spaceGraph.screenToWorld(screenX, screenY, this.spaceGraph.linkSourceNode.position.z);
        if (targetPos) {
            const positions = this.spaceGraph.tempLinkLine.geometry.attributes.position;
            positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z); // Update the second point of the line
            positions.needsUpdate = true;
            this.spaceGraph.tempLinkLine.geometry.computeBoundingSphere();
            this.spaceGraph.tempLinkLine.computeLineDistances();
        }
    }
    /**
     * Removes the temporary linking line from the scene.
     * @private
     */
    _removeTempLinkLine() {
        if (this.spaceGraph.tempLinkLine) {
            this.spaceGraph.tempLinkLine.geometry?.dispose();
            this.spaceGraph.tempLinkLine.material?.dispose();
            this.spaceGraph.scene.remove(this.spaceGraph.tempLinkLine);
            this.spaceGraph.tempLinkLine = null;
        }
    }
    /**
     * Completes the linking process when the pointer is released over a valid target.
     * @param {PointerEvent} event - The pointer event.
     * @private
     */
    _completeLinking(event) {
        this._removeTempLinkLine();
        const targetInfo = this._getTargetInfo(event); // Info about what's under the cursor
        const targetNode = targetInfo.node;
        const targetPortElement = targetInfo.element?.closest('.node-port');
        let edgeData = {}; // Data for the new edge

        if (targetNode && targetNode !== this.spaceGraph.linkSourceNode) { // Must be a different node
            if (this.spaceGraph.linkSourcePortInfo && targetPortElement) { // Port-to-port connection
                const sourcePortType = this.spaceGraph.linkSourcePortInfo.type;
                const targetPortType = targetPortElement.dataset.portType;

                if (sourcePortType !== targetPortType) { // e.g., output to input (basic validation)
                    edgeData = {
                        sourcePort: this.spaceGraph.linkSourcePortInfo.name,
                        targetPort: targetPortElement.dataset.portName,
                        // Could add sourcePortType and targetPortType if needed by Edge or app logic
                    };
                    this.spaceGraph.addEdge(this.spaceGraph.linkSourceNode, targetNode, edgeData);
                } else { // Invalid port-to-port connection (e.g. input to input)
                    console.warn("Link rejected: Cannot connect port of type", sourcePortType, "to port of type", targetPortType);
                }
            } else if (!this.spaceGraph.linkSourcePortInfo && !targetPortElement) { // Node-to-node connection
                this.spaceGraph.addEdge(this.spaceGraph.linkSourceNode, targetNode, {});
            } else { // Mixed mode (one side has a port, other doesn't)
                console.warn("Link rejected: Mixed port/node connection not directly handled by this logic yet.");
            }
        }
        this.cancelLinking(); // Clean up linking state
    }

    /**
     * Cancels an in-progress linking operation.
     * @public
     */
    cancelLinking() {
        this._removeTempLinkLine();
        // Clear any visual feedback on the source port if it was applied
        // if (this.spaceGraph.linkSourcePortInfo?.element) {
        //    this.spaceGraph.linkSourcePortInfo.element.classList.remove('linking-source-port');
        // }
        // Clear target port highlighting
        if (this.linkingTargetPortElement) {
            this.linkingTargetPortElement.classList.remove('linking-target-port');
            this.linkingTargetPortElement = null;
        }
        this.spaceGraph.isLinking = false;
        this.spaceGraph.linkSourceNode = null;
        this.spaceGraph.linkSourcePortInfo = null;
        this.container.style.cursor = 'grab'; // Reset cursor
        $$('.node-html.linking-target', this.container).forEach(el => el.classList.remove('linking-target')); // Clear node highlighting
    }

    /**
     * Handles global keydown events for shortcuts.
     * @param {KeyboardEvent} event - The keyboard event.
     * @private
     */
    _onKeyDown(event) {
        const activeEl = document.activeElement;
        // Ignore keydowns if user is typing in an input, textarea, or contenteditable element, unless it's Escape.
        const isEditing = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
        if (isEditing && event.key !== 'Escape') return;

        const selectedNode = this.spaceGraph.selectedNode;
        const selectedEdge = this.spaceGraph.selectedEdge;
        let handled = false; // Flag to prevent default browser action if event is handled

        switch (event.key) {
            case 'Delete': case 'Backspace':
                if (selectedNode) { this._showConfirm(`Delete node "${selectedNode.id.substring(0,10)}..."?`, () => this.spaceGraph.removeNode(selectedNode.id)); handled = true; }
                else if (selectedEdge) { this._showConfirm(`Delete edge "${selectedEdge.id.substring(0,10)}..."?`, () => this.spaceGraph.removeEdge(selectedEdge.id)); handled = true; }
                break;
            case 'Escape':
                if (this.spaceGraph.isLinking) { this.cancelLinking(); handled = true; }
                else if (this.contextMenuElement?.style.display === 'block') { this._hideContextMenu(); handled = true; }
                else if (this.confirmDialogElement?.style.display === 'block') { this._hideConfirm(); handled = true; }
                else if (this.edgeMenuObject) { this.spaceGraph.setSelectedEdge(null); handled = true; } // Hide edge menu by deselecting edge
                else if (selectedNode || selectedEdge) { this.spaceGraph.setSelectedNode(null); this.spaceGraph.setSelectedEdge(null); handled = true; } // Deselect anything
                break;
            case 'Enter':
                if (selectedNode instanceof NoteNode) { // Focus content of selected NoteNode
                    selectedNode.htmlElement?.querySelector('.node-content')?.focus(); handled = true;
                }
                break;
            case '+': case '=': // Zoom in content or grow node
                if (selectedNode instanceof HtmlNodeElement) {
                    event.ctrlKey || event.metaKey ? selectedNode.adjustNodeSize(1.2) : selectedNode.adjustContentScale(1.15);
                    handled = true;
                }
                break;
            case '-': case '_': // Zoom out content or shrink node
                if (selectedNode instanceof HtmlNodeElement) {
                     event.ctrlKey || event.metaKey ? selectedNode.adjustNodeSize(0.8) : selectedNode.adjustContentScale(0.85); // Using 0.85 for shrink to be less drastic than 1/1.15
                     handled = true;
                }
                break;
            case ' ': // Focus on selection or center view
                if (selectedNode) { this.spaceGraph.focusOnNode(selectedNode, 0.5, true); handled = true; }
                else if (selectedEdge) {
                    const midPoint = new THREE.Vector3().lerpVectors(selectedEdge.source.position, selectedEdge.target.position, 0.5);
                    const dist = selectedEdge.source.position.distanceTo(selectedEdge.target.position);
                    this.spaceGraph.cameraController?.pushState();
                    this.spaceGraph.cameraController?.moveTo(midPoint.x, midPoint.y, midPoint.z + dist * 0.6 + 100, 0.5, midPoint);
                    handled = true;
                } else { this.spaceGraph.centerView(); handled = true; }
                break;

            case 'Tab': // Navigate between nodes
                event.preventDefault(); // Prevent default Tab behavior
                const nodes = Array.from(this.spaceGraph.nodes.values());
                if (nodes.length === 0) break;
                nodes.sort((a, b) => a.id.localeCompare(b.id)); // Consistent ordering
                let currentIndex = -1;
                if (this.spaceGraph.selectedNode) {
                    currentIndex = nodes.findIndex(n => n === this.spaceGraph.selectedNode);
                }
                let nextIndex;
                if (event.shiftKey) { // Shift+Tab for reverse navigation
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : nodes.length - 1;
                } else { // Tab for forward navigation
                    nextIndex = currentIndex < nodes.length - 1 ? currentIndex + 1 : 0;
                }
                if (nodes[nextIndex]) {
                    this.spaceGraph.setSelectedNode(nodes[nextIndex]);
                    this.spaceGraph.focusOnNode(nodes[nextIndex], 0.3, true);
                }
                handled = true;
                break;

            case 'ArrowUp': // Spatial navigation between nodes
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                event.preventDefault();
                let currentNode = this.spaceGraph.selectedNode;
                const allGraphNodes = Array.from(this.spaceGraph.nodes.values());

                if (!currentNode) { // If no node is selected, select the "first" one
                    if (allGraphNodes.length > 0) {
                        allGraphNodes.sort((a, b) => a.id.localeCompare(b.id)); // Consistent sort
                        currentNode = allGraphNodes[0];
                        this.spaceGraph.setSelectedNode(currentNode);
                        this.spaceGraph.focusOnNode(currentNode, 0.3, true);
                    } else {
                        break; // No nodes to navigate
                    }
                }
                if (!currentNode) break; // Should be set if allGraphNodes.length > 0

                const directionVector = new THREE.Vector3();
                if (event.key === 'ArrowUp') directionVector.set(0, 1, 0);
                else if (event.key === 'ArrowDown') directionVector.set(0, -1, 0);
                else if (event.key === 'ArrowLeft') directionVector.set(-1, 0, 0);
                else if (event.key === 'ArrowRight') directionVector.set(1, 0, 0);

                let bestCandidateNode = null;
                let minScore = Infinity;
                const vectorToOther = new THREE.Vector3(); // For reuse to avoid allocations in loop

                for (const otherNode of allGraphNodes) {
                    if (otherNode === currentNode) continue;

                    vectorToOther.subVectors(otherNode.position, currentNode.position);
                    const distance = vectorToOther.length();
                    if (distance === 0) continue; // Should not happen with distinct nodes

                    const normalizedVectorToOther = vectorToOther.normalize();
                    const dotProduct = normalizedVectorToOther.dot(directionVector);

                    // Prefer nodes that are generally in the arrow key's direction (dotProduct > some_threshold)
                    // A common threshold is 0 (more than 90 degrees off is ignored) or higher for stricter directionality.
                    // Using 0.3 for a slightly wider cone than perfectly aligned (0.5 would be <60 deg off-axis).
                    if (dotProduct > 0.3) {
                        // Score prioritizes alignment (higher dotProduct is better) and proximity (lower distance is better).
                        // (1.5 - dotProduct) makes alignment factor stronger.
                        const score = distance * (1.5 - dotProduct); // Lower score is better
                        if (score < minScore) {
                            minScore = score;
                            bestCandidateNode = otherNode;
                        }
                    }
                }

                if (bestCandidateNode) {
                    this.spaceGraph.setSelectedNode(bestCandidateNode);
                    this.spaceGraph.focusOnNode(bestCandidateNode, 0.3, true);
                }
                handled = true;
                break;
        }
        if (handled) event.preventDefault();
    }

    /**
     * Handles wheel events for zooming or, if Ctrl/Meta key is pressed, for adjusting content scale of HTML nodes.
     * @param {WheelEvent} e - The wheel event.
     * @private
     */
    _onWheel = (e) => {
        const targetInfo = this._getTargetInfo(e);
        // Do not interfere if wheeling over node controls, edge menu, or inside an editable area
        if (e.target.closest('.node-controls, .edge-menu-frame') || targetInfo.contentEditable) return;

        if (e.ctrlKey || e.metaKey) { // Ctrl/Meta + Wheel for content scaling on HTML nodes
            if (targetInfo.node instanceof HtmlNodeElement) {
                e.preventDefault(); e.stopPropagation(); // Prevent browser zoom and graph zoom
                targetInfo.node.adjustContentScale(e.deltaY < 0 ? 1.1 : (1 / 1.1));
            }
        } else { // Default wheel action: graph zoom
            e.preventDefault();
            this.spaceGraph.cameraController?.zoom(e);
        }
    }

    /**
     * Shows a small menu near a selected edge for quick actions.
     * @param {Edge} edge - The edge to show the menu for.
     * @public
     */
    showEdgeMenu(edge) {
        if (!edge || this.edgeMenuObject) return; // Don't show if no edge or menu already exists
        this.hideEdgeMenu(); // Hide any existing menu

        const menuElement = document.createElement('div');
        menuElement.className = 'edge-menu-frame'; // For CSS styling
        menuElement.dataset.edgeId = edge.id;
        menuElement.innerHTML = `
          <button title="Color (NYI)" data-action="color">🎨</button>
          <button title="Thickness (NYI)" data-action="thickness">➖</button>
          <button title="Style (NYI)" data-action="style">〰️</button>
          <button title="Constraint (NYI)" data-action="constraint">🔗</button>
          <button title="Delete Edge" class="delete" data-action="delete">×</button>
      `;

        menuElement.addEventListener('click', (e) => { // Event listener for menu item clicks
            const button = e.target.closest('button');
            if (!button) return;
            const action = button.dataset.action;
            e.stopPropagation(); // Prevent click from propagating to graph background

            switch (action) {
                case 'delete':
                    this._showConfirm(`Delete edge "${edge.id.substring(0,10)}..."?`, () => this.spaceGraph.removeEdge(edge.id));
                    break;
                case 'color': case 'thickness': case 'style': case 'constraint':
                    // These would ideally open more detailed UI or cycle through options
                    console.warn(`Edge menu action '${action}' not fully implemented.`);
                    break;
            }
        });
        
        // Prevent graph interactions when interacting with the menu itself
        menuElement.addEventListener('pointerdown', e => e.stopPropagation());
        menuElement.addEventListener('wheel', e => e.stopPropagation());

        this.edgeMenuObject = new CSS3DObject(menuElement);
        this.spaceGraph.cssScene.add(this.edgeMenuObject);
        this.updateEdgeMenuPosition(); // Position it correctly
    }

    /**
     * Hides the edge menu.
     * @public
     */
    hideEdgeMenu() {
        if (this.edgeMenuObject) {
            this.edgeMenuObject.element?.remove(); // Remove HTML element from DOM
            this.edgeMenuObject.parent?.remove(this.edgeMenuObject); // Remove CSS3DObject from scene
            this.edgeMenuObject = null;
        }
    }

    /**
     * Updates the position of the edge menu to be near the midpoint of the selected edge.
     * @public
     */
    updateEdgeMenuPosition() {
        if (!this.edgeMenuObject || !this.spaceGraph.selectedEdge) return;
        const edge = this.spaceGraph.selectedEdge;
        const midPoint = new THREE.Vector3().lerpVectors(edge.source.position, edge.target.position, 0.5);
        this.edgeMenuObject.position.copy(midPoint);
        if (this.spaceGraph._camera) { // Billboard if camera exists
             this.edgeMenuObject.quaternion.copy(this.spaceGraph._camera.quaternion);
        }
    }

    /**
     * Cleans up all resources and event listeners used by the UIManager.
     * @public
     */
    dispose() {
        this.container.removeEventListener('pointerdown', this._onPointerDown);
        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
        this.container.removeEventListener('contextmenu', this._onContextMenu);
        document.removeEventListener('click', this._onDocumentClick, true);
        this.contextMenuElement?.removeEventListener('click', this._onContextMenuClick);
        $('#confirm-yes', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmYes);
        $('#confirm-no', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmNo);
        window.removeEventListener('keydown', this._onKeyDown);
        this.container.removeEventListener('wheel', this._onWheel);

        // Remove drag and drop listeners
        this.container.removeEventListener('dragover', this._onDragOver);
        this.container.removeEventListener('drop', this._onDrop);

        this.hideEdgeMenu(); 
        this.contextMenuElement?.remove(); 
        this.confirmDialogElement?.remove(); 
        this.statusIndicatorElement?.remove();

        this.spaceGraph = null; this.container = null;
        this.contextMenuElement = null; this.confirmDialogElement = null; this.statusIndicatorElement = null;
        this.draggedNode = null; this.resizedNode = null; this.hoveredEdge = null;
        this.confirmCallback = null;
        console.log("UIManager disposed.");
    }

    // --- Drag and Drop Node Creation ---
    _onDragOver(event) {
        event.preventDefault();
        if (event.dataTransfer.types.includes('application/x-spacegraph-node-type')) {
            event.dataTransfer.dropEffect = 'copy';
            this.container.classList.add('drag-over-active');
        } else {
            event.dataTransfer.dropEffect = 'none';
        }
    }

    _onDrop(event) {
        event.preventDefault();
        this.container.classList.remove('drag-over-active');

        const rawData = event.dataTransfer.getData('application/x-spacegraph-node-type');
        if (!rawData) {
            console.warn("Drop event without spacegraph node data.");
            return;
        }

        let nodeCreationData;
        try {
            nodeCreationData = JSON.parse(rawData);
        } catch (err) {
            console.error("Failed to parse dragged node data:", err);
            return;
        }

        if (!nodeCreationData.type) {
            console.error("Dragged node data is missing 'type' property.");
            return;
        }

        const worldPos = this.spaceGraph.screenToWorld(event.clientX, event.clientY, 0);
        if (!worldPos) {
            console.error("Could not convert drop position to world coordinates.");
            return;
        }

        // Merge world position into the creation data
        const finalNodeData = { ...nodeCreationData, x: worldPos.x, y: worldPos.y, z: worldPos.z };

        // UIManager directly calls SpaceGraph.addNode with the data object.
        // SpaceGraph.addNode will handle instantiation of RegisteredNode or legacy nodes.
        const newNode = this.spaceGraph.addNode(finalNodeData);

        if (newNode) {
            console.log(`Node of type '${finalNodeData.type}' created by drop:`, newNode.id);
            this.spaceGraph.setSelectedNode(newNode);
            this.spaceGraph.layoutEngine?.kick();
            // Optional: Focus, similar to _createNodeFromMenu
            // setTimeout(() => {
            //    this.spaceGraph.focusOnNode(newNode, 0.6, true);
            //    if (newNode instanceof NoteNode) {
            //        newNode.htmlElement?.querySelector('.node-content')?.focus();
            //    }
            // }, 100);
        } else {
            // Error messages would be handled by SpaceGraph.addNode if creation failed
            console.error("Failed to create node from dropped data via SpaceGraph.addNode.", finalNodeData);
        }
    }
}

/**
 * @class CameraController
 * @classdesc Manages camera movements, including panning, zooming, focusing, and maintaining a view history.
 */
export class CameraController {
    /** @property {THREE.PerspectiveCamera} camera - The Three.js camera instance being controlled. */
    camera = null;
    /** @property {HTMLElement} domElement - The DOM element to which event listeners for camera control are attached (usually the SpaceGraph container). */
    domElement = null;
    /** @property {boolean} isPanning - True if a camera pan operation is currently in progress. */
    isPanning = false;
    /** @property {THREE.Vector2} panStart - Screen coordinates where the current pan operation started. */
    panStart = new THREE.Vector2();
    /** @property {THREE.Vector3} targetPosition - The desired target position for the camera. The camera smoothly interpolates towards this. */
    targetPosition = new THREE.Vector3();
    /** @property {THREE.Vector3} targetLookAt - The desired point in space for the camera to look at. */
    targetLookAt = new THREE.Vector3();
    /** @property {THREE.Vector3} currentLookAt - The current point in space the camera is looking at, used for smooth interpolation. */
    currentLookAt = new THREE.Vector3();
    /** @property {number} zoomSpeed - Multiplier for camera zoom sensitivity. */
    zoomSpeed = 0.0015;
    /** @property {number} panSpeed - Multiplier for camera panning sensitivity. */
    panSpeed = 0.8;
    /** @property {number} minZoom - Minimum distance the camera can zoom in towards its look-at point. */
    minZoom = 20;
    /** @property {number} maxZoom - Maximum distance the camera can zoom out from its look-at point. */
    maxZoom = 15000;
    /** @property {number} dampingFactor - Factor for smoothing camera movements (lerp). Higher values mean faster interpolation. */
    dampingFactor = 0.12;
    /** @property {number | null} animationFrameId - ID of the current animation frame request, used for the update loop. */
    animationFrameId = null;
    /** @property {Array<object>} viewHistory - Stack to store previous camera states (position, lookAt, targetNodeId) for "back" navigation. */
    viewHistory = [];
    /** @property {number} maxHistory - Maximum number of states to store in the view history. */
    maxHistory = 20;
    /** @property {string | null} currentTargetNodeId - The ID of the node currently focused by autoZoom, if any. */
    currentTargetNodeId = null;
    /** @property {{position: THREE.Vector3, lookAt: THREE.Vector3} | null} initialState - The initial camera position and look-at point, stored for resetView. */
    initialState = null;

    /**
     * @constructor
     * @param {THREE.PerspectiveCamera} threeCamera - The Three.js camera to control.
     * @param {HTMLElement} domElement - The DOM element for attaching event listeners.
     */
    constructor(threeCamera, domElement, config = {}) {
        this.camera = threeCamera;
        this.domElement = domElement;

        // Use provided config values or fallback to existing class defaults
        this.zoomSpeed = config.zoomSpeed ?? 0.0015;
        this.panSpeed = config.panSpeed ?? 0.8;
        this.dampingFactor = config.dampingFactor ?? 0.12;
        // minZoom and maxZoom can remain class defaults or also be made configurable
        // this.minZoom = config.minZoom ?? 20;
        // this.maxZoom = config.maxZoom ?? 15000;


        this.targetPosition.copy(this.camera.position);
        this.targetLookAt.copy(new THREE.Vector3(0,0,0)); // Default initial look-at
        this.currentLookAt.copy(this.targetLookAt);
        this._updateLoop(); // Start the continuous update loop
    }

    /**
     * Stores the current camera state as the initial state if not already set.
     * This is used by `resetView`.
     */
    setInitialState() {
        if (!this.initialState) {
            this.initialState = {
                position: this.targetPosition.clone(),
                lookAt: this.targetLookAt.clone()
            };
        }
    }

    /**
     * Initiates a camera pan operation.
     * @param {PointerEvent} event - The pointer event that started the pan.
     */
    startPan(event) {
        if (event.button !== 0 || this.isPanning) return; // Only pan with primary button, and not if already panning
        this.isPanning = true;
        this.panStart.set(event.clientX, event.clientY);
        this.domElement.classList.add('panning'); // For cursor styling
        gsap.killTweensOf(this.targetPosition); // Stop any ongoing moveTo animations
        gsap.killTweensOf(this.targetLookAt);
        this.currentTargetNodeId = null; // Panning clears any specific node focus
    }

    /**
     * Updates the camera position during a pan operation.
     * @param {PointerEvent} event - The pointer move event.
     */
    pan(event) {
        if (!this.isPanning) return;
        const deltaX = event.clientX - this.panStart.x;
        const deltaY = event.clientY - this.panStart.y;

        // Calculate pan amount based on camera distance and FOV to make it feel more natural
        const cameraDist = this.camera.position.distanceTo(this.currentLookAt);
        const vFOV = this.camera.fov * DEG2RAD;
        const viewHeight = this.domElement.clientHeight || window.innerHeight;
        // Effective height of the view plane at the currentLookAt distance
        const height = 2 * Math.tan(vFOV / 2) * Math.max(1, cameraDist);

        const panXAmount = -(deltaX / viewHeight) * height * this.panSpeed;
        const panYAmount = (deltaY / viewHeight) * height * this.panSpeed;

        // Get camera's local right and up vectors
        const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
        const panOffset = right.multiplyScalar(panXAmount).add(up.multiplyScalar(panYAmount));

        this.targetPosition.add(panOffset);
        this.targetLookAt.add(panOffset); // Pan the look-at point along with the position
        this.panStart.set(event.clientX, event.clientY); // Update pan start for next delta calculation
    }

    /**
     * Ends the current camera pan operation.
     */
    endPan() {
        if (this.isPanning) {
            this.isPanning = false;
            this.domElement.classList.remove('panning');
        }
    }

    /**
     * Zooms the camera in or out, typically based on a mouse wheel event.
     * The zoom is directed towards the mouse cursor's position on the current look-at plane.
     * @param {WheelEvent} event - The wheel event.
     */
    zoom(event) {
        gsap.killTweensOf(this.targetPosition); // Stop any ongoing moveTo animations
        gsap.killTweensOf(this.targetLookAt);
        this.currentTargetNodeId = null; // Zooming clears specific node focus

        const delta = -event.deltaY * this.zoomSpeed; // Wheel delta determines zoom amount and direction
        const currentDist = this.targetPosition.distanceTo(this.targetLookAt);
        let newDist = currentDist * Math.pow(0.95, delta * 12); // Exponential zoom feels more natural
        newDist = clamp(newDist, this.minZoom, this.maxZoom); // Clamp within defined zoom limits
        const zoomFactorAmount = (newDist - currentDist);

        // Determine zoom direction: towards mouse cursor on the look-at plane, or camera's forward if no intersection
        const mouseWorldPos = this._getLookAtPlaneIntersection(event.clientX, event.clientY);
        const direction = new THREE.Vector3();
        if (mouseWorldPos) {
            direction.copy(mouseWorldPos).sub(this.targetPosition).normalize();
        } else { // Fallback to camera's current view direction
            this.camera.getWorldDirection(direction);
        }
        this.targetPosition.addScaledVector(direction, zoomFactorAmount);
    }

    /**
     * Calculates the intersection point of a ray cast from the screen coordinates
     * with the plane defined by the camera's current `targetLookAt` point and its view direction.
     * @param {number} screenX - Screen X coordinate.
     * @param {number} screenY - Screen Y coordinate.
     * @returns {THREE.Vector3 | null} The intersection point in world space, or null.
     * @private
     */
    _getLookAtPlaneIntersection(screenX, screenY) {
        const vec = new THREE.Vector3((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1, 0.5);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, this.camera);
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        // Plane is normal to camera direction, passing through targetLookAt point
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir.negate(), this.targetLookAt);
        const intersectPoint = new THREE.Vector3();
        return raycaster.ray.intersectPlane(plane, intersectPoint) ? intersectPoint : null;
    }

    /**
     * Smoothly moves the camera to a specified position and updates its look-at target.
     * @param {number} x - Target X coordinate for camera position.
     * @param {number} y - Target Y coordinate for camera position.
     * @param {number} z - Target Z coordinate for camera position.
     * @param {number} [duration=0.7] - Duration of the animation in seconds.
     * @param {THREE.Vector3 | null} [lookAtTarget=null] - Optional new look-at point. If null, uses (x, y, 0).
     */
    moveTo(x, y, z, duration = 0.7, lookAtTarget = null) {
        this.setInitialState(); // Ensure initial state is captured if this is the first move
        const targetPosVec = new THREE.Vector3(x, y, z);
        // Default lookAt to a point on Z=0 plane below camera, or specified target
        const targetLookVec = lookAtTarget ? lookAtTarget.clone() : new THREE.Vector3(x, y, 0);

        gsap.killTweensOf(this.targetPosition); gsap.killTweensOf(this.targetLookAt); // Interrupt existing animations
        gsap.to(this.targetPosition, { x: targetPosVec.x, y: targetPosVec.y, z: targetPosVec.z, duration, ease: "power3.out", overwrite: true });
        gsap.to(this.targetLookAt, { x: targetLookVec.x, y: targetLookVec.y, z: targetLookVec.z, duration, ease: "power3.out", overwrite: true });
    }

    /**
     * Resets the camera to its initial or a default state.
     * @param {number} [duration=0.7] - Duration of the reset animation.
     */
    resetView(duration = 0.7) {
        if (this.initialState) {
            this.moveTo(this.initialState.position.x, this.initialState.position.y, this.initialState.position.z, duration, this.initialState.lookAt);
        } else { // Fallback if initial state wasn't set (should ideally always be set)
            this.moveTo(0, 0, 700, duration, new THREE.Vector3(0,0,0));
        }
        this.viewHistory = []; this.currentTargetNodeId = null; // Clear history on reset
    }

    /**
     * Pushes the current camera state (position, look-at, focused node ID) onto the view history stack.
     */
    pushState() {
        if (this.viewHistory.length >= this.maxHistory) this.viewHistory.shift(); // Maintain max history size
        this.viewHistory.push({
            position: this.targetPosition.clone(),
            lookAt: this.targetLookAt.clone(),
            targetNodeId: this.currentTargetNodeId
        });
    }

    /**
     * Pops a state from the view history and moves the camera to it.
     * If history is empty, resets the view.
     * @param {number} [duration=0.6] - Duration of the animation to the previous state.
     */
    popState(duration = 0.6) {
        if (this.viewHistory.length > 0) {
            const prevState = this.viewHistory.pop();
            this.moveTo(prevState.position.x, prevState.position.y, prevState.position.z, duration, prevState.lookAt);
            this.currentTargetNodeId = prevState.targetNodeId; // Restore focused node ID
        } else {
            this.resetView(duration); // If no history, reset to initial view
        }
    }

    /** @returns {string | null} The ID of the node currently targeted by autoZoom, or null. */
    getCurrentTargetNodeId = () => this.currentTargetNodeId;
    /** Sets the ID of the node currently targeted by autoZoom.
     * @param {string | null} nodeId - The ID of the node.
     */
    setCurrentTargetNodeId = (nodeId) => { this.currentTargetNodeId = nodeId; };

    /**
     * The main update loop for the camera controller.
     * Smoothly interpolates the camera's actual position and look-at point towards their target values.
     * This loop runs continuously via `requestAnimationFrame`.
     * @private
     */
    _updateLoop = () => {
        const deltaPos = this.targetPosition.distanceTo(this.camera.position);
        const deltaLookAt = this.targetLookAt.distanceTo(this.currentLookAt);

        // Only interpolate if there's a significant difference or if panning (which updates targets directly)
        if (deltaPos > 0.01 || deltaLookAt > 0.01 || this.isPanning) {
            this.camera.position.lerp(this.targetPosition, this.dampingFactor);
            this.currentLookAt.lerp(this.targetLookAt, this.dampingFactor);
            this.camera.lookAt(this.currentLookAt);
        } else if (!gsap.isTweening(this.targetPosition) && !gsap.isTweening(this.targetLookAt)) {
            // If very close and no GSAP animation is running, snap to target to avoid tiny drifts
            if (deltaPos > 0 || deltaLookAt > 0) { // Check if not already exactly at target
                this.camera.position.copy(this.targetPosition);
                this.currentLookAt.copy(this.targetLookAt);
                this.camera.lookAt(this.currentLookAt);
            }
        }
        this.animationFrameId = requestAnimationFrame(this._updateLoop);
    }

    /**
     * Cleans up resources: cancels animation frame and kills any GSAP tweens.
     */
    dispose() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        gsap.killTweensOf(this.targetPosition); gsap.killTweensOf(this.targetLookAt);
        this.camera = null; this.domElement = null; this.viewHistory = []; // Clear references
        console.log("CameraController disposed.");
    }
}

/**
 * @class ForceLayout
 * @classdesc Implements a physics-based force-directed layout algorithm to arrange nodes and edges.
 */
export class ForceLayout {
    /** @property {SpaceGraph} spaceGraph - Reference to the SpaceGraph instance this layout engine belongs to. */
    spaceGraph = null;
    /** @property {BaseNode[]} nodes - Array of nodes currently managed by the layout engine. */
    nodes = [];
    /** @property {Edge[]} edges - Array of edges currently managed by the layout engine. */
    edges = [];
    /** @property {Map<string, THREE.Vector3>} velocities - Map storing the current velocity of each node, keyed by node ID. */
    velocities = new Map();
    /** @property {Set<BaseNode>} fixedNodes - Set of nodes that are fixed in position and not affected by layout forces. */
    fixedNodes = new Set();
    /** @property {boolean} isRunning - True if the layout simulation is currently active. */
    isRunning = false;
    /** @property {number | null} animationFrameId - ID of the current animation frame request for the simulation loop. */
    animationFrameId = null;
    /** @property {number} energy - Current total kinetic energy of the system. Used to determine if layout has stabilized. */
    energy = Infinity;
    /** @property {number} lastKickTime - Timestamp of the last time the layout was "kicked" (had energy injected). */
    lastKickTime = 0;
    /** @property {number | null} autoStopTimeout - Timeout ID for automatically stopping the simulation when energy is low. */
    autoStopTimeout = null;

    /**
     * @property {object} settings - Configuration settings for the force layout.
     * @property {number} settings.repulsion - Strength of the repulsive force between nodes.
     * @property {number} settings.attraction - Base attraction strength (stiffness) for elastic edges.
     * @property {number} settings.idealEdgeLength - Ideal resting length for elastic edges.
     * @property {number} settings.centerStrength - Strength of the force pulling nodes towards the gravity center.
     * @property {number} settings.damping - Damping factor applied to node velocities each step, reducing oscillations.
     * @property {number} settings.minEnergyThreshold - Energy level below which the simulation might auto-stop.
     * @property {THREE.Vector3} settings.gravityCenter - The point towards which the centerStrength force pulls nodes.
     * @property {number} settings.zSpreadFactor - Multiplier for forces in the Z direction, to encourage 2.5D layout.
     * @property {number} settings.autoStopDelay - Milliseconds to wait after a kick before auto-stopping if energy is low.
     * @property {number} settings.nodePadding - Factor to multiply node bounding sphere radius for repulsion calculations (padding).
     * @property {number} settings.defaultElasticStiffness - Default stiffness for 'elastic' edges if not specified on edge data.
     * @property {number} settings.defaultElasticIdealLength - Default ideal length for 'elastic' edges.
     * @property {number} settings.defaultRigidStiffness - Default stiffness for 'rigid' edges.
     * @property {number} settings.defaultWeldStiffness - Default stiffness for 'weld' edges.
     */
    settings = {
        repulsion: 3000,
        attraction: 0.001, // Base stiffness for elastic edges
        idealEdgeLength: 200, // Base ideal length for elastic edges
        centerStrength: 0.0005,
        damping: 0.92,
        minEnergyThreshold: 0.1,
        gravityCenter: new THREE.Vector3(0, 0, 0),
        zSpreadFactor: 0.15, // How much Z forces are scaled, for 2.5D effect
        autoStopDelay: 4000, // ms
        nodePadding: 1.2, // Multiplier for node radius in repulsion
        defaultElasticStiffness: 0.001, // Fallback, should be set from attraction
        defaultElasticIdealLength: 200, // Fallback, should be set from idealEdgeLength
        defaultRigidStiffness: 0.1,
        defaultWeldStiffness: 0.5,
    };

    /**
     * @constructor
     * @param {SpaceGraph} spaceGraphInstance - The SpaceGraph instance.
     * @param {object} [config={}] - Optional configuration overrides for layout settings.
     */
    constructor(spaceGraphInstance, config = {}) {
        this.spaceGraph = spaceGraphInstance;
        this.settings = {...this.settings, ...config};
        // Ensure default elastic parameters are consistent with general attraction/idealLength
        this.settings.defaultElasticStiffness = this.settings.attraction;
        this.settings.defaultElasticIdealLength = this.settings.idealEdgeLength;
    }

    /**
     * Adds a node to the layout simulation.
     * @param {BaseNode} node - The node to add.
     */
    addNode(node) {
        if (!this.velocities.has(node.id)) {
            this.nodes.push(node);
            this.velocities.set(node.id, new THREE.Vector3());
            this.kick(); // Add some energy to integrate the new node
        }
    }
    /**
     * Removes a node from the layout simulation.
     * @param {BaseNode} node - The node to remove.
     */
    removeNode(node) {
        this.nodes = this.nodes.filter(n => n !== node);
        this.velocities.delete(node.id);
        this.fixedNodes.delete(node);
        if (this.nodes.length < 2 && this.isRunning) this.stop(); else this.kick();
    }
    /**
     * Adds an edge to the layout simulation.
     * @param {Edge} edge - The edge to add.
     */
    addEdge(edge) { if (!this.edges.includes(edge)) { this.edges.push(edge); this.kick(); } }
    /**
     * Removes an edge from the layout simulation.
     * @param {Edge} edge - The edge to remove.
     */
    removeEdge(edge) { this.edges = this.edges.filter(e => e !== edge); this.kick(); }

    /**
     * Fixes a node's position, preventing it from being moved by layout forces.
     * @param {BaseNode} node - The node to fix.
     */
    fixNode(node) { this.fixedNodes.add(node); this.velocities.get(node.id)?.set(0,0,0); }
    /**
     * Releases a fixed node, allowing it to be moved by layout forces again.
     * @param {BaseNode} node - The node to release.
     */
    releaseNode(node) { this.fixedNodes.delete(node);  }

    /**
     * Runs a fixed number of simulation steps, typically for initial layout stabilization.
     * @param {number} [steps=100] - The number of simulation steps to run.
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
     * Starts the continuous layout simulation loop.
     * The simulation will run until explicitly stopped or if it auto-stops due to low energy.
     */
    start() {
        if (this.isRunning || this.nodes.length < 2) return; // Don't start if already running or too few nodes
        console.log("ForceLayout: Starting simulation.");
        this.isRunning = true; this.lastKickTime = Date.now();
        const loop = () => {
            if (!this.isRunning) return;
            this.energy = this._calculateStep();
            // Check for auto-stop condition
            if (this.energy < this.settings.minEnergyThreshold && Date.now() - this.lastKickTime > this.settings.autoStopDelay) {
                this.stop();
            } else {
                this.animationFrameId = requestAnimationFrame(loop);
            }
        };
        this.animationFrameId = requestAnimationFrame(loop);
    }

    /**
     * Stops the layout simulation.
     */
    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        clearTimeout(this.autoStopTimeout); // Clear any pending auto-stop
        this.animationFrameId = null; this.autoStopTimeout = null;
        console.log("ForceLayout: Simulation stopped. Energy:", this.energy?.toFixed(4));
    }

    /**
     * "Kicks" the layout by adding random velocity to non-fixed nodes.
     * This helps to escape local energy minima and re-energize the simulation.
     * Automatically starts the simulation if it's not running.
     * @param {number} [intensity=1] - Multiplier for the kick strength.
     */
    kick(intensity = 1) {
        if (this.nodes.length === 0) return;
        this.lastKickTime = Date.now(); this.energy = Infinity; // Reset energy and kick time
        this.nodes.forEach(node => {
            if (!this.fixedNodes.has(node)) {
                this.velocities.get(node.id)?.add(
                    new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, (Math.random()-0.5)*this.settings.zSpreadFactor)
                    .normalize().multiplyScalar(intensity * (1 + Math.random()*2)) // Add some randomness to kick strength
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
     * Updates the layout engine's settings.
     * @param {object} newSettings - An object with settings to override. See `ForceLayout.settings` for available options.
     */
    setSettings(newSettings) {
        this.settings = {...this.settings, ...newSettings};
        // Propagate relevant general settings to specific defaults
        this.settings.defaultElasticStiffness = this.settings.attraction;
        this.settings.defaultElasticIdealLength = this.settings.idealEdgeLength;
        console.log("ForceLayout settings updated:", this.settings);
        this.kick(); // Re-energize simulation with new settings
    }

    /**
     * Calculates one step of the force-directed layout.
     * Applies repulsion, attraction, and centering forces to nodes.
     * Updates node velocities and positions.
     * @returns {number} The total kinetic energy of the system after this step.
     * @private
     */
    _calculateStep() {
        if (this.nodes.length < 2 && this.edges.length === 0) return 0; // Not enough elements for forces
        let totalSystemEnergy = 0;
        // Initialize forces for each node
        const forces = new Map(this.nodes.map(node => [node.id, new THREE.Vector3()]));
        const { repulsion, centerStrength, gravityCenter, zSpreadFactor, damping, nodePadding } = this.settings;
        const tempDelta = new THREE.Vector3(); // Reusable vector for delta calculations

        // Calculate repulsive forces between all pairs of nodes
        for (let i = 0; i < this.nodes.length; i++) {
            const nodeA = this.nodes[i];
            for (let j = i + 1; j < this.nodes.length; j++) {
                const nodeB = this.nodes[j];
                tempDelta.subVectors(nodeB.position, nodeA.position);
                let distSq = tempDelta.lengthSq();
                if (distSq < 1e-4) { // Avoid division by zero or extreme forces if nodes are too close
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
                if (overlap > 0) { // Add extra repulsion if nodes overlap
                    forceMag -= (repulsion * Math.pow(overlap, 2) * 0.01) / dist; // Stronger force for overlap
                }
                const forceVec = tempDelta.normalize().multiplyScalar(forceMag);
                forceVec.z *= zSpreadFactor; // Apply Z-spread factor
                if (!this.fixedNodes.has(nodeA)) forces.get(nodeA.id)?.add(forceVec);
                if (!this.fixedNodes.has(nodeB)) forces.get(nodeB.id)?.sub(forceVec); // Newton's third law
            }
        }

        // Calculate attractive forces for edges (spring forces)
        this.edges.forEach(edge => {
            const {source, target, data: edgeData} = edge;
            if (!source || !target || !this.velocities.has(source.id) || !this.velocities.has(target.id)) return; // Ensure nodes exist
            tempDelta.subVectors(target.position, source.position);
            const distance = tempDelta.length() + 1e-6; // Add epsilon to prevent division by zero
            let forceMag = 0;
            const params = edgeData.constraintParams || {};
            const type = edgeData.constraintType || 'elastic';

            switch (type) {
                case 'rigid':
                    const targetDist = params.distance ?? source.position.distanceTo(target.position); // Use current distance if not specified
                    const rStiffness = params.stiffness ?? this.settings.defaultRigidStiffness;
                    forceMag = rStiffness * (distance - targetDist);
                    break;
                case 'weld': // Similar to rigid but might use node radii for default distance
                    const weldDist = params.distance ?? (source.getBoundingSphereRadius() + target.getBoundingSphereRadius());
                    const wStiffness = params.stiffness ?? this.settings.defaultWeldStiffness;
                    forceMag = wStiffness * (distance - weldDist);
                    break;
                case 'elastic':
                default:
                    const idealLen = params.idealLength ?? this.settings.defaultElasticIdealLength;
                    const eStiffness = params.stiffness ?? this.settings.defaultElasticStiffness;
                    forceMag = eStiffness * (distance - idealLen); // Hooke's Law
                    break;
            }
            const forceVec = tempDelta.normalize().multiplyScalar(forceMag);
            forceVec.z *= zSpreadFactor; // Apply Z-spread
            if (!this.fixedNodes.has(source)) forces.get(source.id)?.add(forceVec);
            if (!this.fixedNodes.has(target)) forces.get(target.id)?.sub(forceVec);
        });

        // Apply centering force (gravity towards a central point)
        if (centerStrength > 0) {
            this.nodes.forEach(node => {
                if (this.fixedNodes.has(node)) return;
                const forceVec = tempDelta.subVectors(gravityCenter, node.position).multiplyScalar(centerStrength);
                forceVec.z *= zSpreadFactor * 0.5; // May want different Z spread for centering
                forces.get(node.id)?.add(forceVec);
            });
        }

        // Update velocities and positions for each node
        this.nodes.forEach(node => {
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
     * Cleans up resources used by the ForceLayout engine. Stops the simulation.
     */
    dispose() {
        this.stop();
        this.nodes = []; this.edges = [];
        this.velocities.clear(); this.fixedNodes.clear();
        this.spaceGraph = null;
        console.log("ForceLayout disposed.");
    }
}
