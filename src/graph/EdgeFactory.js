/**
 * @file EdgeFactory.js - Factory for creating different types of edges.
 * @licence MIT
 */

import { Edge } from './Edge.js'; // Straight edge
import { CurvedEdge } from './CurvedEdge.js';
import { LabeledEdge } from './LabeledEdge.js';
// Import other edge types here as they are created

export class EdgeFactory {
    constructor(space) {
        this.space = space; // Pass SpaceGraph instance if edge constructors need it
        this.edgeTypes = new Map();
        this._registerDefaultEdgeTypes();
    }

    _registerDefaultEdgeTypes() {
        this.registerEdgeType('straight', Edge);
        this.registerEdgeType('curved', CurvedEdge);
        this.registerEdgeType('labeled', LabeledEdge);
        // Register other default types here

        // Fallback to straight edge if type is not specified or not found
        this.registerEdgeType('default', Edge); // Default remains straight edge
    }

    /**
     * Registers a new edge type.
     * @param {string} typeName - The unique key for the edge type (e.g., 'straight', 'curved').
     * @param {typeof Edge} edgeClass - The class constructor for this edge type.
     */
    registerEdgeType(typeName, edgeClass) {
        if (this.edgeTypes.has(typeName)) {
            // console.warn(`EdgeFactory: Edge type "${typeName}" is already registered. Overwriting.`);
        }
        this.edgeTypes.set(typeName, edgeClass);
    }

    /**
     * Creates an edge instance of a specified type.
     * @param {string} id - The unique ID for the new edge.
     * @param {string} type - The type of edge to create (must be registered).
     * @param {import('./nodes/BaseNode.js').BaseNode} sourceNode - The source node.
     * @param {import('./nodes/BaseNode.js').BaseNode} targetNode - The target node.
     * @param {object} data - The data object for the edge.
     * @returns {Edge | null} The created edge instance, or null if type is invalid.
     */
    createEdge(id, type, sourceNode, targetNode, data = {}) {
        const EdgeClass = this.edgeTypes.get(type) || this.edgeTypes.get(data.type) || this.edgeTypes.get('default');

        if (EdgeClass) {
            // Pass space instance to constructor if needed by EdgeClass
            // For now, assuming new EdgeClass(id, sourceNode, targetNode, data)
            const edgeInstance = new EdgeClass(id, sourceNode, targetNode, data);

            // Similar to NodeFactory, EdgePlugin will set edge.space if needed by the edge instance itself.
            // Edge class constructor doesn't take space currently.
            // CurvedEdge uses this.space in its update() method. This needs to be set.
            edgeInstance.space = this.space;

            return edgeInstance;
        } else {
            console.error(`EdgeFactory: Unknown edge type "${type}". Cannot create edge.`);
            return null;
        }
    }
}
