export class NodePlugin extends Plugin {
    nodes: Map<any, any>;
    nodeFactory: any;
    instancedMeshManager: any;
    /**
     * Registers all known node types with the NodeFactory.
     * This method is called during plugin construction to ensure all types
     * are available before any nodes are created.
     * To add a new node type:
     * 1. Create your node class (e.g., MyCustomNode extends BaseNode).
     * 2. Ensure it has a static `typeName` property (e.g., static typeName = 'myCustom').
     * 3. Import it into this file (NodePlugin.js).
     * 4. Add a line here: `this.nodeFactory.registerType(MyCustomNode.typeName, MyCustomNode);`
     */
    _registerNodeTypes(): void;
    addNode(nodeInstance: any): any;
    createAndAddNode({ id, type, position, data, mass }: {
        id: any;
        type: any;
        position: any;
        data?: {};
        mass?: number;
    }): any;
    removeNode(nodeId: any): void;
    getNodeById(id: any): any;
    getNodes(): Map<any, any>;
}
import { Plugin } from '../core/Plugin.js';
