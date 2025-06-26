import {Plugin} from '../core/Plugin.js';
import {Utils} from '../utils.js';
import {NodeFactory} from '../graph/NodeFactory.js';

// Import all node types
import {HtmlNode} from '../graph/nodes/HtmlNode.js';
import {ShapeNode} from '../graph/nodes/ShapeNode.js';
import {ImageNode} from '../graph/nodes/ImageNode.js';
import {VideoNode} from '../graph/nodes/VideoNode.js';
import {IFrameNode} from '../graph/nodes/IFrameNode.js';
import {GroupNode} from '../graph/nodes/GroupNode.js';
import {DataNode} from '../graph/nodes/DataNode.js';
import {NoteNode} from '../graph/nodes/NoteNode.js';
import {AudioNode} from '../graph/nodes/AudioNode.js';
import {DocumentNode} from '../graph/nodes/DocumentNode.js';
import {ChartNode} from '../graph/nodes/ChartNode.js';


export class NodePlugin extends Plugin {
    nodes = new Map();
    nodeFactory = null;
    instancedMeshManager = null;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.nodeFactory = new NodeFactory(spaceGraph); // Factory for creating node instances
        this._registerNodeTypes(); // Centralized registration of all known node types
    }

    /**
     * Registers all known node types with the NodeFactory.
     * This method is called during plugin construction to ensure all types
     * are available before any nodes are created.
     * To add a new node type:
     * 1. Create your node class (e.g., MyCustomNode extends BaseNode).
     * 2. Ensure it has a static `typeName` property (e.g., static typeName = 'myCustom').
     * 3. Import it into this file (NodePlugin.js).
     * 4. Add a line here: `this.nodeFactory.registerNodeType(MyCustomNode.typeName, MyCustomNode);`
     */
    _registerNodeTypes() {
        // Core types from NodeFactory's previous internal method
        // this.nodeFactory.registerCoreNodeTypes(); // If we kept the method in factory

        // Or register them directly here:
        this.nodeFactory.registerNodeType(HtmlNode.typeName, HtmlNode);
        this.nodeFactory.registerNodeType(ShapeNode.typeName, ShapeNode);
        this.nodeFactory.registerNodeType(ImageNode.typeName, ImageNode);
        this.nodeFactory.registerNodeType(VideoNode.typeName, VideoNode);
        this.nodeFactory.registerNodeType(IFrameNode.typeName, IFrameNode);
        this.nodeFactory.registerNodeType(GroupNode.typeName, GroupNode);
        this.nodeFactory.registerNodeType(DataNode.typeName, DataNode);
        this.nodeFactory.registerNodeType(NoteNode.typeName, NoteNode);

        this.nodeFactory.registerNodeType(AudioNode.typeName, AudioNode);
        this.nodeFactory.registerNodeType(DocumentNode.typeName, DocumentNode);
        this.nodeFactory.registerNodeType(ChartNode.typeName, ChartNode);

        // Set default node type
        this.nodeFactory.registerNodeType('default', ShapeNode);
    }

    getName() {
        return 'NodePlugin';
    }

    init() {
        super.init();
        this.instancedMeshManager = this.pluginManager.getPlugin('RenderingPlugin')?.getInstancedMeshManager();
    }

    addNode(nodeInstance) {
        nodeInstance.id ??= Utils.generateId('node');
        if (this.nodes.has(nodeInstance.id)) {
            console.warn(`NodePlugin: Node ${nodeInstance.id} already exists.`);
            return this.nodes.get(nodeInstance.id);
        }

        this.nodes.set(nodeInstance.id, nodeInstance);
        nodeInstance.space = this.space;

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        const cssScene = renderingPlugin?.getCSS3DScene();
        const webglScene = renderingPlugin?.getWebGLScene();

        let successfullyInstanced = false;
        if (this.instancedMeshManager && nodeInstance instanceof ShapeNode && nodeInstance.data.shape === 'sphere') {
            successfullyInstanced = this.instancedMeshManager.addNode(nodeInstance);
        }

        if (nodeInstance.cssObject && cssScene) cssScene.add(nodeInstance.cssObject);
        if (nodeInstance.labelObject && cssScene) cssScene.add(nodeInstance.labelObject);
        if (!successfullyInstanced && nodeInstance.mesh && webglScene) webglScene.add(nodeInstance.mesh);

        this.space.emit('node:added', nodeInstance);
        return nodeInstance;
    }

    createAndAddNode({ id, type, position, data = {}, mass = 1.0 }) {
        const nodeId = id || Utils.generateId('node');
        if (!type || !position) {
            console.error('NodePlugin: Type and position required.');
            return undefined;
        }

        const nodeInstance = this.nodeFactory.createNode(nodeId, type, position, data, mass);
        return nodeInstance ? this.addNode(nodeInstance) : undefined;
    }

    removeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return console.warn(`NodePlugin: Node ${nodeId} not found.`);

        const uiPlugin = this.pluginManager.getPlugin('UIPlugin');
        if (uiPlugin?.getSelectedNode() === node) uiPlugin.setSelectedNode(null);
        if (uiPlugin?.getLinkSourceNode() === node) uiPlugin.cancelLinking();

        this.pluginManager.getPlugin('EdgePlugin')?.getEdgesForNode(node).forEach((edge) =>
            this.pluginManager.getPlugin('EdgePlugin')?.removeEdge(edge.id)
        );

        this.pluginManager.getPlugin('LayoutPlugin')?.removeNodeFromLayout(node);

        if (node.isInstanced && this.instancedMeshManager) this.instancedMeshManager.removeNode(node);
        node.dispose();
        this.nodes.delete(nodeId);
        this.space.emit('node:removed', nodeId, node);
    }

    getNodeById(id) {
        return this.nodes.get(id);
    }

    getNodes() {
        return this.nodes;
    }

    update() {
        this.nodes.forEach((node) => {
            if (node.isInstanced && this.instancedMeshManager) this.instancedMeshManager.updateNode(node);
            node.update?.(this.space);
        });
    }

    dispose() {
        super.dispose();
        this.nodes.forEach((node) => node.dispose());
        this.nodes.clear();
    }
}
