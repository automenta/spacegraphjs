export class EdgeFactory extends BaseFactory {
    constructor(space: any);
    space: any;
    registerCoreEdgeTypes(): void;
    /**
     * Creates a new edge instance of a given type.
     * @param {string} id - The unique ID for the edge.
     * @param {string} type - The typeName of the edge to create.
     * @param {Node} sourceNode - The source node instance.
     * @param {Node} targetNode - The target node instance.
     * @param {object} [data={}] - Custom data for the edge.
     * @returns {Edge|null} The created edge instance, or null if the type is not found.
     */
    createEdge(id: string, type: string, sourceNode: Node, targetNode: Node, data?: object): Edge | null;
}
import { BaseFactory } from '../core/BaseFactory.js';
import { Edge } from './edges/Edge.js';
