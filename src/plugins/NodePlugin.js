import { Plugin } from '../core/Plugin.js';
import { Utils } from '../utils.js';
import { NodeFactory } from '../graph/nodes/NodeFactory.js';
import { ShapeNode } from '../graph/nodes/ShapeNode.js';

export class NodePlugin extends Plugin {
    nodes = new Map();
    nodeFactory = null;
    instancedMeshManager = null;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.nodeFactory = new NodeFactory(spaceGraph);
    }

    getName() {
        return 'NodePlugin';
    }

    init() {
        super.init();
        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (renderingPlugin && typeof renderingPlugin.getInstancedMeshManager === 'function') {
            this.instancedMeshManager = renderingPlugin.getInstancedMeshManager();
        } else {
            console.warn('NodePlugin: InstancedMeshManager not available from RenderingPlugin.');
        }
    }

    addNode(nodeInstance) {
        if (!nodeInstance.id) nodeInstance.id = Utils.generateId('node');
        if (this.nodes.has(nodeInstance.id)) {
            console.warn(`NodePlugin: Node with ID ${nodeInstance.id} already exists.`);
            return this.nodes.get(nodeInstance.id);
        }

        this.nodes.set(nodeInstance.id, nodeInstance);
        nodeInstance.space = this.space;

        let successfullyInstanced = false;
        if (this.instancedMeshManager && nodeInstance instanceof ShapeNode && nodeInstance.data.shape === 'sphere') {
            if (this.instancedMeshManager.addNode(nodeInstance)) {
                successfullyInstanced = true;
            }
        }

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (renderingPlugin) {
            const cssScene = renderingPlugin.getCSS3DScene();
            if (nodeInstance.cssObject && cssScene) cssScene.add(nodeInstance.cssObject);
            if (nodeInstance.labelObject && cssScene) cssScene.add(nodeInstance.labelObject);

            if (!successfullyInstanced && nodeInstance.mesh) {
                const webglScene = renderingPlugin.getWebGLScene();
                if (webglScene) {
                    webglScene.add(nodeInstance.mesh);
                } else {
                    console.warn('NodePlugin: WebGLScene not available for non-instanced mesh.');
                }
            }
        } else {
            console.warn('NodePlugin: RenderingPlugin not available to add node to scenes.');
        }

        this.space.emit('node:added', nodeInstance);
        return nodeInstance;
    }

    createAndAddNode({ id, type, position, data = {}, mass = 1.0 }) {
        const nodeId = id || Utils.generateId('node');
        if (!type || !position) {
            console.error('NodePlugin: Node type and position are required to create a node.');
            return undefined;
        }

        const nodeInstance = this.nodeFactory.createNode(nodeId, type, position, data, mass);

        if (nodeInstance) {
            return this.addNode(nodeInstance);
        }
        return undefined;
    }

    removeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            console.warn(`NodePlugin: Node with ID ${nodeId} not found for removal.`);
            return;
        }

        const uiPlugin = this.pluginManager.getPlugin('UIPlugin');
        if (uiPlugin?.getSelectedNode() === node) {
            uiPlugin.setSelectedNode(null);
        }
        if (uiPlugin?.getLinkSourceNode() === node) {
            uiPlugin.cancelLinking();
        }

        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
        if (edgePlugin && typeof edgePlugin.getEdgesForNode === 'function') {
            edgePlugin.getEdgesForNode(node).forEach((edge) => edgePlugin.removeEdge(edge.id));
        } else {
            console.warn(
                `NodePlugin: EdgePlugin not available or functional during removeNode(${nodeId}). Connected edges may remain.`
            );
        }

        const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
        layoutPlugin?.removeNodeFromLayout(node);

        if (node.isInstanced && this.instancedMeshManager) {
            this.instancedMeshManager.removeNode(node);
        }
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
            if (node.isInstanced && this.instancedMeshManager) {
                this.instancedMeshManager.updateNode(node);
            }
            if (node.update && typeof node.update === 'function') {
                node.update(this.space);
            }
        });
    }

    dispose() {
        super.dispose();
        this.nodes.forEach((node) => node.dispose());
        this.nodes.clear();
    }
}
