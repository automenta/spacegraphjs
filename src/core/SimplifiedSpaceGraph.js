import * as THREE from "three";
import { PluginManager } from "./PluginManager.js";
import { ConsolidatedPlugin } from "../plugins/ConsolidatedPlugin.js";
import { ConsolidatedFactory } from "./ConsolidatedFactory.js";
import { ConsolidatedLayoutManager } from "../layout/ConsolidatedLayoutManager.js";

export class SimplifiedSpaceGraph {
  _listeners = new Map();
  plugins = null;
  options = {};

  // Properties for camera mouse controls
  _isDragging = false;
  _lastMouseX = 0;
  _lastMouseY = 0;

  // Bound event handlers for camera mouse controls
  _boundHandleContextMenuEvent = null;
  _boundHandleMouseDownEvent = null;
  _boundHandleMouseMoveEvent = null;
  _boundHandleMouseUpOrLeaveEvent = null;
  _boundHandleWheelEvent = null;

  constructor(containerElement, options = {}) {
    if (!containerElement)
      throw new Error("SpaceGraph requires a valid HTML container element.");

    this.container = containerElement;
    this.options = options;
    this.plugins = new PluginManager(this);

    // Initialize consolidated plugins
    this._initPlugins();
  }

  _initPlugins() {
    // Add consolidated plugins for each major functionality
    this.plugins.add(
      new ConsolidatedPlugin(
        this,
        this.plugins,
        ConsolidatedPlugin.PLUGIN_TYPES.CAMERA,
      ),
    );
    this.plugins.add(
      new ConsolidatedPlugin(
        this,
        this.plugins,
        ConsolidatedPlugin.PLUGIN_TYPES.RENDERING,
      ),
    );
    this.plugins.add(
      new ConsolidatedPlugin(
        this,
        this.plugins,
        ConsolidatedPlugin.PLUGIN_TYPES.NODE,
      ),
    );
    this.plugins.add(
      new ConsolidatedPlugin(
        this,
        this.plugins,
        ConsolidatedPlugin.PLUGIN_TYPES.EDGE,
      ),
    );
    this.plugins.add(
      new ConsolidatedPlugin(
        this,
        this.plugins,
        ConsolidatedPlugin.PLUGIN_TYPES.LAYOUT,
      ),
    );
    this.plugins.add(
      new ConsolidatedPlugin(
        this,
        this.plugins,
        ConsolidatedPlugin.PLUGIN_TYPES.UI,
      ),
    );
    this.plugins.add(
      new ConsolidatedPlugin(
        this,
        this.plugins,
        ConsolidatedPlugin.PLUGIN_TYPES.DATA,
      ),
    );
    this.plugins.add(
      new ConsolidatedPlugin(
        this,
        this.plugins,
        ConsolidatedPlugin.PLUGIN_TYPES.MINIMAP,
      ),
    );
    this.plugins.add(
      new ConsolidatedPlugin(
        this,
        this.plugins,
        ConsolidatedPlugin.PLUGIN_TYPES.PERFORMANCE,
      ),
    );
    this.plugins.add(
      new ConsolidatedPlugin(
        this,
        this.plugins,
        ConsolidatedPlugin.PLUGIN_TYPES.FRACTAL_ZOOM,
      ),
    );
  }

  async init() {
    await this.plugins.initPlugins();

    // Initialize bound event handlers
    this._boundHandleContextMenuEvent = this._handleContextMenuEvent.bind(this);
    this._boundHandleMouseDownEvent = this._handleMouseDownEvent.bind(this);
    this._boundHandleMouseMoveEvent = this._handleMouseMoveEvent.bind(this);
    this._boundHandleMouseUpOrLeaveEvent =
      this._handleMouseUpOrLeaveEvent.bind(this);
    this._boundHandleWheelEvent = this._handleWheelEvent.bind(this);

    this._setupAllEventListeners();
    this._setupCameraMouseControls();
  }

  on(eventName, callback) {
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }
    this._listeners.get(eventName).add(callback);
  }

  off(eventName, callback) {
    this._listeners.get(eventName)?.delete(callback);
  }

  emit(eventName, ...args) {
    this._listeners.get(eventName)?.forEach((callback) => {
      callback(...args);
    });
  }

  /** Sets up all event listeners by delegating to more specific methods. */
  _setupAllEventListeners() {
    this._setupNodeEventListeners();
    this._setupEdgeEventListeners();
    this._setupUIEventListeners();
    this._setupCameraEventListeners();
  }

  /** Sets up event listeners related to node operations. */
  _setupNodeEventListeners() {
    this.on("ui:request:addNode", (nodeInstance) => {
      const nodePlugin = this.plugins.getPlugin("ConsolidatedNodePlugin");
      // Handle node addition
    });
    this.on("ui:request:createNode", (nodeConfig) => {
      const nodePlugin = this.plugins.getPlugin("ConsolidatedNodePlugin");
      // Handle node creation
    });
    this.on("node:added", this._handleNodeAdded.bind(this));
  }

  /** Handles actions to take after a node has been added. */
  _handleNodeAdded(addedNodeId, addedNodeInstance) {
    // Handle post-node addition logic
  }

  /** Sets up event listeners related to edge operations. */
  _setupEdgeEventListeners() {
    this.on("ui:request:addEdge", (sourceNode, targetNode, data) => {
      const edgePlugin = this.plugins.getPlugin("ConsolidatedEdgePlugin");
      // Handle edge addition
    });
    this.on("ui:request:removeEdge", (edgeId) => {
      const edgePlugin = this.plugins.getPlugin("ConsolidatedEdgePlugin");
      // Handle edge removal
    });
  }

  /** Sets up event listeners related to UI elements like background. */
  _setupUIEventListeners() {
    this.on("ui:request:toggleBackground", (color, alpha) => {
      const renderingPlugin = this.plugins.getPlugin(
        "ConsolidatedRenderingPlugin",
      );
      // Handle background toggle
    });
  }

  /** Sets up event listeners related to camera controls and view manipulation. */
  _setupCameraEventListeners() {
    this.on("ui:request:autoZoomNode", (node) => {
      const cameraPlugin = this.plugins.getPlugin("ConsolidatedCameraPlugin");
      // Handle auto zoom
    });
    this.on("ui:request:centerView", () => {
      const cameraPlugin = this.plugins.getPlugin("ConsolidatedCameraPlugin");
      // Handle center view
    });
  }

  addNode(nodeInstance) {
    const nodePlugin = this.plugins.getPlugin("ConsolidatedNodePlugin");
    // Add node logic
    return nodeInstance;
  }

  addEdge(sourceNode, targetNode, data = {}) {
    const edgePlugin = this.plugins.getPlugin("ConsolidatedEdgePlugin");
    // Add edge logic
    return null; // Return edge instance
  }

  createNode(nodeConfig) {
    const nodePlugin = this.plugins.getPlugin("ConsolidatedNodePlugin");
    // Create node logic
    return null; // Return node instance
  }

  animate() {
    const frame = () => {
      this.plugins.updatePlugins();
      requestAnimationFrame(frame);
    };
    frame();
  }

  dispose() {
    this.plugins.disposePlugins();
    this._listeners.clear();
    this._removeCameraMouseControls();
  }

  exportGraphToJSON(options) {
    const dataPlugin = this.plugins.getPlugin("ConsolidatedDataPlugin");
    // Export logic
    return null;
  }

  async importGraphFromJSON(jsonData, options) {
    const dataPlugin = this.plugins.getPlugin("ConsolidatedDataPlugin");
    // Import logic
    return false;
  }

  _setupCameraMouseControls() {
    // Setup camera mouse controls
  }

  /** Handles the contextmenu event on the container. */
  _handleContextMenuEvent(event) {
    // Handle context menu
  }

  _handleMouseDownEvent(event) {
    // Handle mouse down
  }

  _handleMouseMoveEvent(event) {
    // Handle mouse move
  }

  _handleMouseUpOrLeaveEvent() {
    // Handle mouse up or leave
  }

  _handleWheelEvent(event) {
    // Handle wheel event
    event.preventDefault();
  }

  _removeCameraMouseControls() {
    // Remove camera mouse controls
  }
}
