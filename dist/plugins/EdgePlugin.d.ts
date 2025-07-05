export class EdgePlugin extends Plugin {
    edges: Map<any, any>;
    edgeFactory: any;
    instancedEdgeManager: any;
    useInstancedEdges: boolean;
    /**
     * Registers all known edge types with the EdgeFactory.
     * This method is called during plugin construction.
     * To add a new edge type:
     * 1. Create your edge class (e.g., MyCustomEdge extends Edge).
     * 2. Ensure it has a static `typeName` property (e.g., static typeName = 'myCustomEdge').
     * 3. Import it into this file (EdgePlugin.js).
     * 4. Add a line here: `this.edgeFactory.registerType(MyCustomEdge.typeName, MyCustomEdge);`
     */
    _registerEdgeTypes(): void;
    handleRendererResize({ width, height }: {
        width: any;
        height: any;
    }): void;
    _checkAndSwitchInstancingMode(): void;
    addEdge(sourceNode: any, targetNode: any, data?: {}): any;
    removeEdge(edgeId: any): void;
    getEdgeById(id: any): any;
    getEdges(): Map<any, any>;
    getEdgesForNode(node: any): any[];
}
import { Plugin } from '../core/Plugin.js';
