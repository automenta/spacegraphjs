import { Edge } from './Edge.js';
import { CurvedEdge } from './CurvedEdge.js';
import { LabeledEdge } from './LabeledEdge.js';

export class EdgeFactory {
    constructor(space) {
        this.space = space;
        this.edgeTypes = new Map();
        this._registerDefaultEdgeTypes();
    }

    _registerDefaultEdgeTypes() {
        this.registerEdgeType('straight', Edge);
        this.registerEdgeType('curved', CurvedEdge);
        this.registerEdgeType('labeled', LabeledEdge);
        this.registerEdgeType('default', Edge);
    }

    registerEdgeType(typeName, edgeClass) {
        if (this.edgeTypes.has(typeName)) {
            return;
        }
        this.edgeTypes.set(typeName, edgeClass);
    }

    createEdge(id, type, sourceNode, targetNode, data = {}) {
        const EdgeClass = this.edgeTypes.get(type) || this.edgeTypes.get(data.type) || this.edgeTypes.get('default');
        if (!EdgeClass) return null;

        const edgeInstance = new EdgeClass(id, sourceNode, targetNode, data);
        edgeInstance.space = this.space;
        return edgeInstance;
    }
}
