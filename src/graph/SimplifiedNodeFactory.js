import { BaseFactory } from "../core/BaseFactory.js";
import { ConsolidatedNode } from "../graph/ConsolidatedNode.js";

export class SimplifiedNodeFactory extends BaseFactory {
  constructor(space) {
    super();
    this.space = space;
    this._registerCoreNodeTypes();
  }

  _registerCoreNodeTypes() {
    // Register the consolidated node type for all node variations
    this.registerType("consolidated", ConsolidatedNode);

    // Register common aliases for backward compatibility
    this.registerType("html", ConsolidatedNode);
    this.registerType("shape", ConsolidatedNode);
    this.registerType("image", ConsolidatedNode);
    this.registerType("video", ConsolidatedNode);
    this.registerType("iframe", ConsolidatedNode);
    this.registerType("group", ConsolidatedNode);
    this.registerType("note", ConsolidatedNode);
    this.registerType("data", ConsolidatedNode);
    this.registerType("audio", ConsolidatedNode);
    this.registerType("document", ConsolidatedNode);
    this.registerType("chart", ConsolidatedNode);
    this.registerType("controlpanel", ConsolidatedNode);
    this.registerType("progress", ConsolidatedNode);
    this.registerType("canvas", ConsolidatedNode);
    this.registerType("proceduralshape", ConsolidatedNode);
    this.registerType("textmesh", ConsolidatedNode);
    this.registerType("metawidget", ConsolidatedNode);

    // Set default node type
    this.registerType("default", ConsolidatedNode);
  }

  /**
   * Creates a new node instance of a given type.
   * @param {string} id - The unique ID for the node.
   * @param {string} type - The typeName of the node to create.
   * @param {object} position - An object with x, y, z coordinates.
   * @param {object} [data={}] - Custom data for the node.
   * @param {number} [mass=1.0] - The mass of the node.
   * @returns {BaseNode|null} The created node instance, or null if the type is not found.
   */
  createNode(id, type, position, data = {}, mass = 1.0) {
    const effectiveType = data?.type || type || "default";
    const nodeInstance = this.create(
      effectiveType,
      [id, position, data, mass],
      "default",
    );
    if (nodeInstance) {
      nodeInstance.space = this.space;
    }
    return nodeInstance;
  }
}
