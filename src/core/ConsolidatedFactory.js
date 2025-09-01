import { BaseFactory } from "../core/BaseFactory.js";
import { ConsolidatedNode } from "../graph/ConsolidatedNode.js";
import { ConsolidatedEdge } from "../graph/ConsolidatedEdge.js";

// Consolidated factory that handles both nodes and edges
export class ConsolidatedFactory extends BaseFactory {
  constructor(space) {
    super();
    this.space = space;
    this._registerCoreTypes();
  }

  _registerCoreTypes() {
    // Register consolidated types
    this.registerType("node", ConsolidatedNode);
    this.registerType("edge", ConsolidatedEdge);

    // Register common aliases
    this.registerType("html", ConsolidatedNode);
    this.registerType("shape", ConsolidatedNode);
    this.registerType("image", ConsolidatedNode);
    this.registerType("video", ConsolidatedNode);
    this.registerType("iframe", ConsolidatedNode);
    this.registerType("group", ConsolidatedNode);
    this.registerType("note", ConsolidatedNode);

    this.registerType("straight", ConsolidatedEdge);
    this.registerType("curved", ConsolidatedEdge);
    this.registerType("dotted", ConsolidatedEdge);
    this.registerType("labeled", ConsolidatedEdge);

    // Set defaults
    this.registerType("defaultNode", ConsolidatedNode);
    this.registerType("defaultEdge", ConsolidatedEdge);
  }

  /**
   * Creates a new node instance
   * @param {string} id - The unique ID for the node
   * @param {string} type - The type of node to create
   * @param {object} position - Position object with x, y, z coordinates
   * @param {object} data - Custom data for the node
   * @param {number} mass - The mass of the node
   * @returns {BaseNode} The created node instance
   */
  createNode(id, type, position, data = {}, mass = 1.0) {
    // Ensure type is in data for consolidated node
    const nodeData = { ...data, type: type || data.type || "shape" };
    return this.create("node", [id, position, nodeData, mass], "defaultNode");
  }

  /**
   * Creates a new edge instance
   * @param {string} id - The unique ID for the edge
   * @param {string} type - The type of edge to create
   * @param {Node} sourceNode - The source node instance
   * @param {Node} targetNode - The target node instance
   * @param {object} data - Custom data for the edge
   * @returns {BaseEdge} The created edge instance
   */
  createEdge(id, type, sourceNode, targetNode, data = {}) {
    // Ensure type is in data for consolidated edge
    const edgeData = { ...data, type: type || data.type || "straight" };
    return this.create(
      "edge",
      [id, sourceNode, targetNode, edgeData],
      "defaultEdge",
    );
  }

  /**
   * Creates a node or edge based on the entity type
   * @param {'node'|'edge'} entityType - The type of entity to create
   * @param {string} id - The unique ID for the entity
   * @param {object} config - Configuration object
   * @returns {BaseNode|BaseEdge} The created entity instance
   */
  createEntity(entityType, id, config = {}) {
    switch (entityType) {
      case "node":
        return this.createNode(
          id,
          config.type,
          config.position,
          config.data,
          config.mass,
        );
      case "edge":
        return this.createEdge(
          id,
          config.type,
          config.sourceNode,
          config.targetNode,
          config.data,
        );
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }
}
