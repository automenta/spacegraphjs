import { BaseEdge } from "../BaseEdge.js";

/**
 * Base class for all edge types - now extends BaseEdge for common functionality
 */
export class Edge extends BaseEdge {
  static typeName = "straight"; // Default base edge type

  /**
   * Constructor for Edge - now calls parent constructor
   */
  constructor(id, sourceNode, targetNode, data = {}) {
    // Call parent constructor for common functionality
    super(id, sourceNode, targetNode, data);
  }

  /**
   * Updates the edge - to be implemented by subclasses
   */
  update() {
    // Call parent update method for common functionality
    super.update();
    // Subclasses can add specific update logic here
  }
}
