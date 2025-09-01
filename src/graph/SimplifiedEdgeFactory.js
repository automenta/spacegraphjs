import { BaseFactory } from "../core/BaseFactory.js";
import { ConsolidatedEdge } from "./ConsolidatedEdge.js";

export class SimplifiedEdgeFactory extends BaseFactory {
  constructor(space) {
    super();
    this.space = space;
    this._registerCoreEdgeTypes();
  }

  _registerCoreEdgeTypes() {
    // Register the consolidated edge type for all edge variations
    this.registerType("consolidated", ConsolidatedEdge);

    // Register common aliases for backward compatibility
    this.registerType("straight", ConsolidatedEdge);
    this.registerType("curved", ConsolidatedEdge);
    this.registerType("labeled", ConsolidatedEdge);
    this.registerType("dotted", ConsolidatedEdge);
    this.registerType("dynamic", ConsolidatedEdge);
    this.registerType("flow", ConsolidatedEdge);
    this.registerType("spring", ConsolidatedEdge);
    this.registerType("bezier", ConsolidatedEdge);

    // Set default edge type
    this.registerType("default", ConsolidatedEdge);
  }

  /**
   * Creates a new edge instance of a given type.
   * @param {string} id - The unique ID for the edge.
   * @param {string} type - The typeName of the edge to create.
   * @param {Node} sourceNode - The source node instance.
   * @param {Node} targetNode - The target node instance.
   * @param {object} [data={}] - Custom data for the edge.
   * @returns {BaseEdge|null} The created edge instance, or null if the type is not found.
   */
  createEdge(id, type, sourceNode, targetNode, data = {}) {
    const effectiveType = data?.type || type || "default";
    const edgeInstance = this.create(
      effectiveType,
      [id, sourceNode, targetNode, data],
      "default",
    );
    if (edgeInstance) {
      edgeInstance.space = this.space;
    }
    return edgeInstance;
  }
}
