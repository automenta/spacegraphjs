/**
 * Base class for all layout implementations, providing common functionality
 */
export class BaseLayout {
  space = null;
  pluginManager = null;
  nodes = [];
  edges = [];
  settings = {};

  constructor(config = {}) {
    this.settings = { ...this.getDefaultSettings(), ...config };
  }

  /**
   * Returns the default settings for this layout
   * @returns {Object} Default settings object
   */
  getDefaultSettings() {
    return {
      animate: true,
    };
  }

  /**
   * Sets the context for the layout
   * @param {SpaceGraph} space - The space graph instance
   * @param {PluginManager} pluginManager - The plugin manager instance
   */
  setContext(space, pluginManager) {
    this.space = space;
    this.pluginManager = pluginManager;
  }

  /**
   * Updates the layout configuration
   * @param {Object} newConfig - New configuration settings
   */
  updateConfig(newConfig) {
    this.settings = { ...this.settings, ...newConfig };
  }

  /**
   * Initializes the layout with nodes and edges
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @param {Object} config - Configuration settings
   */
  init(nodes, edges, config = {}) {
    if (config) this.updateConfig(config);
    this.nodes = [...nodes];
    this.edges = [...edges];
  }

  /**
   * Runs the layout algorithm
   */
  run() {
    // To be implemented by subclasses
  }

  /**
   * Stops the layout algorithm
   */
  stop() {
    // To be implemented by subclasses
  }

  /**
   * Adds a node to the layout
   * @param {Node} node - The node to add
   */
  addNode(node) {
    // To be implemented by subclasses
  }

  /**
   * Removes a node from the layout
   * @param {Node} node - The node to remove
   */
  removeNode(node) {
    // To be implemented by subclasses
  }

  /**
   * Adds an edge to the layout
   * @param {Edge} edge - The edge to add
   */
  addEdge(edge) {
    // To be implemented by subclasses
  }

  /**
   * Removes an edge from the layout
   * @param {Edge} edge - The edge to remove
   */
  removeEdge(edge) {
    // To be implemented by subclasses
  }

  /**
   * Disposes of the layout's resources
   */
  dispose() {
    this.nodes = [];
    this.edges = [];
    this.space = null;
    this.pluginManager = null;
  }
}
