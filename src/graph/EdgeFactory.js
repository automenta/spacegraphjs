import { BaseFactory } from '../core/BaseFactory.js'; // Import BaseFactory
import {Edge} from './edges/Edge.js';
import {CurvedEdge} from './edges/CurvedEdge.js';
import {LabeledEdge} from './edges/LabeledEdge.js';
import {DottedEdge} from './edges/DottedEdge.js';
import {DynamicThicknessEdge} from './edges/DynamicThicknessEdge.js';
import {FlowEdge} from './edges/FlowEdge.js';
import {SpringEdge} from './edges/SpringEdge.js';
import {BezierEdge} from './edges/BezierEdge.js';

export class EdgeFactory extends BaseFactory { // Extend BaseFactory
    constructor(space) {
        super(); // Call BaseFactory constructor
        this.space = space;
    }

    registerCoreEdgeTypes() {
        this.registerType(Edge.typeName, Edge);
        this.registerType(CurvedEdge.typeName, CurvedEdge);
        this.registerType(LabeledEdge.typeName, LabeledEdge);
        this.registerType(DottedEdge.typeName, DottedEdge);
        this.registerType(DynamicThicknessEdge.typeName, DynamicThicknessEdge);
        
        // Advanced edge types
        this.registerType(FlowEdge.typeName, FlowEdge);
        this.registerType(SpringEdge.typeName, SpringEdge);
        this.registerType(BezierEdge.typeName, BezierEdge);

        this.registerType('default', Edge);
    }

    /**
     * Creates a new edge instance of a given type.
     * @param {string} id - The unique ID for the edge.
     * @param {string} type - The typeName of the edge to create.
     * @param {Node} sourceNode - The source node instance.
     * @param {Node} targetNode - The target node instance.
     * @param {object} [data={}] - Custom data for the edge.
     * @returns {Edge|null} The created edge instance, or null if the type is not found.
     */
    createEdge(id, type, sourceNode, targetNode, data = {}) {
        const effectiveType = data?.type || type;
        const edgeInstance = this.create(effectiveType, [id, sourceNode, targetNode, data], 'default');
        if (edgeInstance) {
            edgeInstance.space = this.space;
        }
        return edgeInstance;
    }
}
