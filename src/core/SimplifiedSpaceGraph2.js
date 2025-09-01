import * as THREE from "three";
import { SimplifiedPluginManager } from "./SimplifiedPluginManager.js";
import { ConsolidatedPlugin } from "../plugins/ConsolidatedPlugin.js";
import { SimplifiedNodeFactory } from "../graph/SimplifiedNodeFactory.js";
import { SimplifiedEdgeFactory } from "../graph/SimplifiedEdgeFactory.js";
import { ConsolidatedLayoutManager } from "../layout/ConsolidatedLayoutManager.js";
import { SimplifiedUIManager } from "../ui/SimplifiedUIManager.js";
import { Utils } from "../utils.js";

export class SpaceGraph {
  _listeners = new Map();
  plugins = null;
  options = {};

  // Properties for camera mouse controls
  _isDragging = false;
  _lastMouseX = 0;
  _lastMouseY = 0;

  // Factories
  nodeFactory = null;
  edgeFactory = null;

  // Layout manager
  layoutManager = null;

  // UI manager
  uiManager = null;

  constructor(containerElement, options = {}) {
    if (!containerElement)
      throw new Error("SpaceGraph requires a valid HTML container element.");

    this.container = containerElement;
    this.options = options;
    this.plugins = new SimplifiedPluginManager(this);

    // Initialize factories
    this.nodeFactory = new SimplifiedNodeFactory(this);
    this.edgeFactory = new SimplifiedEdgeFactory(this);

    // Initialize layout manager
    this.layoutManager = new ConsolidatedLayoutManager(this, this.plugins);

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

    // Initialize UI manager if UI options are provided
    const uiOptions = this.options.ui || {};
    const { contextMenuElement, confirmDialogElement } = uiOptions;

    if (contextMenuElement && confirmDialogElement) {
      this.uiManager = new SimplifiedUIManager(
        this,
        contextMenuElement,
        confirmDialogElement,
        {
          setSelectedNode: this._setSelectedNode.bind(this),
          setSelectedEdge: this._setSelectedEdge.bind(this),
          cancelLinking: this._cancelLinking.bind(this),
          getIsLinking: this._getIsLinking.bind(this),
          getLinkSourceNode: this._getLinkSourceNode.bind(this),
          getSelectedNodes: this._getSelectedNodes.bind(this),
          getSelectedEdges: this._getSelectedEdges.bind(this),
          completeLinking: this._completeLinking.bind(this),
        },
      );
    }

    // Emit init event
    this.emit("graph:initialized");
  }

  // Event system
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

  // Node management
  addNode(nodeInstance) {
    nodeInstance.id = nodeInstance.id || Utils.generateId("node");
    this.emit("node:added", nodeInstance.id, nodeInstance);
    this.layoutManager.addNode(nodeInstance);
    return nodeInstance;
  }

  createNode(nodeConfig) {
    const { id, type, position, data = {}, mass = 1.0 } = nodeConfig;
    const nodeId = id || Utils.generateId("node");

    if (!type || !position) {
      console.error("SpaceGraph: Type and position required.");
      return undefined;
    }

    const nodeInstance = this.nodeFactory.createNode(
      nodeId,
      type,
      position,
      data,
      mass,
    );
    return nodeInstance ? this.addNode(nodeInstance) : undefined;
  }

  removeNode(nodeId) {
    this.emit("node:removed", nodeId);
    // Remove node from layout manager
    // Note: In a full implementation, you would also remove from plugins
  }

  // Edge management
  addEdge(sourceNode, targetNode, data = {}) {
    if (!sourceNode || !targetNode || sourceNode === targetNode) {
      console.warn("SpaceGraph: Invalid source or target.");
      return null;
    }

    const edgeId = Utils.generateId("edge");
    const edgeInstance = this.edgeFactory.createEdge(
      edgeId,
      data.type || "default",
      sourceNode,
      targetNode,
      data,
    );

    if (edgeInstance) {
      this.emit("edge:added", edgeInstance);
      this.layoutManager.addEdge(edgeInstance);
      return edgeInstance;
    }

    return null;
  }

  removeEdge(edgeId) {
    this.emit("edge:removed", edgeId);
    // Remove edge from layout manager
  }

  // Layout management
  applyLayout(layoutType, config = {}) {
    this.layoutManager.applyLayout(layoutType, config);
  }

  // UI management
  _setSelectedNode(node, multiSelect = false) {
    this.emit("ui:selectedNode", { node, multiSelect });
  }

  _setSelectedEdge(edge, multiSelect = false) {
    this.emit("ui:selectedEdge", { edge, multiSelect });
  }

  _cancelLinking() {
    this.emit("ui:cancelLinking");
  }

  _getIsLinking() {
    return false; // Simplified
  }

  _getLinkSourceNode() {
    return null; // Simplified
  }

  _getSelectedNodes() {
    return new Set(); // Simplified
  }

  _getSelectedEdges() {
    return new Set(); // Simplified
  }

  _completeLinking(screenX, screenY) {
    this.emit("ui:completeLinking", { screenX, screenY });
  }

  // Animation
  animate() {
    const frame = () => {
      this.plugins.updatePlugins();
      this.layoutManager.kick(); // Update layout
      requestAnimationFrame(frame);
    };
    frame();
  }

  // Cleanup
  dispose() {
    this.plugins.disposePlugins();
    this.layoutManager.dispose();
    this.uiManager?.dispose();
    this._listeners.clear();
  }

  // Data export/import
  exportGraphToJSON(options = {}) {
    // Simplified export
    return JSON.stringify({
      nodes: [],
      edges: [],
    });
  }

  async importGraphFromJSON(jsonData, options = {}) {
    // Simplified import
    return true;
  }
}
