import { Edge } from './Edge.js';
import { CurvedEdge } from './CurvedEdge.js';
import { LabeledEdge } from './LabeledEdge.js';
import { DottedEdge } from './DottedEdge.js'; // Added DottedEdge
import { DynamicThicknessEdge } from './DynamicThicknessEdge.js'; // Added DynamicThicknessEdge

export class EdgeFactory {
    constructor(space) {
        this.space = space;
        this.edgeTypes = new Map();
        // _registerDefaultEdgeTypes will be called by EdgePlugin now


    // This method could be removed if EdgePlugin calls registerEdgeType directly for each
    // Or kept if it's a convenient way to register a common set. For now, assume EdgePlugin calls directly.
    // registerCoreEdgeTypes() {
    //     // Register existing types using static typeName
    //     this.registerEdgeType(Edge.typeName, Edge); // 'straight'
        this.registerEdgeType(CurvedEdge.typeName, CurvedEdge); // 'curved'
        this.registerEdgeType(LabeledEdge.typeName, LabeledEdge); // 'labeled'

        // Register new types
        this.registerEdgeType(DottedEdge.typeName, DottedEdge); // 'dotted'
        this.registerEdgeType(DynamicThicknessEdge.typeName, DynamicThicknessEdge); // 'dynamicThickness'

        // Set default edge type
        this.registerEdgeType('default', Edge); // Default to basic straight edge
    }

    registerEdgeType(typeName, edgeClass) {
        if (!typeName) {
            console.warn('EdgeFactory: Attempted to register an edge class without a typeName.', edgeClass);
            return;
        }
        if (this.edgeTypes.has(typeName)) {
            // console.warn(`EdgeFactory: Edge type "${typeName}" already registered. Overwriting.`);
            // Allow overwriting
        }
        this.edgeTypes.set(typeName, edgeClass);
    }

    /**
     * Creates a new edge instance of a given type.
     * The actual registration of types is typically handled by the EdgePlugin.
     * @param {string} id - The unique ID for the edge.
     * @param {string} type - The typeName of the edge to create.
     * @param {BaseNode} sourceNode - The source node instance.
     * @param {BaseNode} targetNode - The target node instance.
     * @param {object} [data={}] - Custom data for the edge.
     * @returns {Edge|null} The created edge instance, or null if the type is not found.
     */
    createEdge(id, type, sourceNode, targetNode, data = {}) {
        // Allow data.type to override the explicit type parameter
        const effectiveType = data?.type || type;
        const EdgeClass = this.edgeTypes.get(effectiveType) || this.edgeTypes.get('default');

        if (!EdgeClass) {
            console.warn(`EdgeFactory: Edge type "${effectiveType}" not found and no default available for ID "${id}".`);
            return null;
        }

        const edgeInstance = new EdgeClass(id, sourceNode, targetNode, data);
        edgeInstance.space = this.space; // Ensure space context is set
        return edgeInstance;
    }
}
