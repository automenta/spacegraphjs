/**
 * @file NodePlugin.js - Manages graph nodes for SpaceGraph.
 * @licence MIT
 */

import { Plugin } from '../core/Plugin.js';
import { Utils } from '../utils.js'; // For Utils.generateId
import { NodeFactory } from '../graph/nodes/NodeFactory.js';

export class NodePlugin extends Plugin {
    /** @type {Map<string, import('../graph/nodes/BaseNode.js').BaseNode>} */
    nodes = new Map();
    /** @type {NodeFactory} */
    nodeFactory = null;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.nodeFactory = new NodeFactory(spaceGraph); // Pass space instance if factory needs it
    }

    getName() {
        return 'NodePlugin';
    }

    init() {
        super.init();
        // _tempSelectedNodeRef and _tempLinkSourceNodeRef are removed as selection/linking
        // state is now managed by UIPlugin.
    }

    /**
     * Adds a node instance to the graph.
     * @param {import('../graph/nodes/BaseNode.js').BaseNode} nodeInstance - The node to add.
     * @returns {import('../graph/nodes/BaseNode.js').BaseNode | undefined} The added node or undefined if failed.
     */
    addNode(nodeInstance) {
        if (!nodeInstance.id) nodeInstance.id = Utils.generateId('node');
        if (this.nodes.has(nodeInstance.id)) {
            console.warn(`NodePlugin: Node with ID ${nodeInstance.id} already exists.`);
            return this.nodes.get(nodeInstance.id);
        }

        this.nodes.set(nodeInstance.id, nodeInstance);
        nodeInstance.space = this.space; // Ensure node has reference to SpaceGraph instance

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (renderingPlugin) {
            const cssScene = renderingPlugin.getCSS3DScene();
            const webglScene = renderingPlugin.getWebGLScene();
            if (nodeInstance.cssObject && cssScene) cssScene.add(nodeInstance.cssObject);
            if (nodeInstance.mesh && webglScene) webglScene.add(nodeInstance.mesh);
            if (nodeInstance.labelObject && cssScene) cssScene.add(nodeInstance.labelObject);
        } else {
            console.warn('NodePlugin: RenderingPlugin not available to add node to scenes.');
        }

        // const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin'); // LayoutPlugin now listens to node:added
        // layoutPlugin?.addNodeToLayout(nodeInstance);

        this.space.emit('node:added', nodeInstance); // Emit event AFTER node is added to plugin and scenes
        return nodeInstance;
    }

    /**
     * Creates a new node using the factory and adds it to the graph.
     * @param {object} config - Configuration object for the node.
     * @param {string} [config.id] - Optional ID for the node. If not provided, one will be generated.
     * @param {string} config.type - The type of node to create (e.g., 'html', 'shape').
     * @param {object} config.position - The initial position (e.g., { x, y, z }).
     * @param {object} [config.data={}] - Data for the node.
     * @param {number} [config.mass=1.0] - Mass of the node.
     * @returns {import('../graph/nodes/BaseNode.js').BaseNode | undefined} The created and added node or undefined if failed.
     */
    createAndAddNode({ id, type, position, data = {}, mass = 1.0 }) {
        const nodeId = id || Utils.generateId('node');
        if (!type || !position) {
            console.error('NodePlugin: Node type and position are required to create a node.');
            return undefined;
        }

        const nodeInstance = this.nodeFactory.createNode(nodeId, type, position, data, mass);

        if (nodeInstance) {
            return this.addNode(nodeInstance); // Use the existing addNode logic to manage and add to scene
        }
        return undefined;
    }

    /**
     * Removes a node from the graph by its ID.
     * @param {string} nodeId - The ID of the node to remove.
     */
    removeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            console.warn(`NodePlugin: Node with ID ${nodeId} not found for removal.`);
            return;
        }

        // Handle selection and linking state if the removed node was involved.
        const uiPlugin = this.pluginManager.getPlugin('UIPlugin');
        if (uiPlugin?.getSelectedNode() === node) {
            uiPlugin.setSelectedNode(null);
        }
        if (uiPlugin?.getLinkSourceNode() === node) {
            uiPlugin.cancelLinking(); // UIPlugin's cancelLinking should handle cleanup and events
        }

        // Remove connected edges. This logic might move to an EdgePlugin or be event-driven.
        // For now, it mirrors SpaceGraph's current behavior.
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
        if (edgePlugin && typeof edgePlugin.getEdgesForNode === 'function') {
            const connectedEdges = edgePlugin.getEdgesForNode(node);
            connectedEdges.forEach((edge) => edgePlugin.removeEdge(edge.id));
        } else {
            // If EdgePlugin is not available or doesn't have getEdgesForNode,
            // connected edges won't be removed. This indicates a setup issue.
            console.warn(
                `NodePlugin: EdgePlugin not available or functional during removeNode(${nodeId}). Connected edges may remain.`
            );
        }

        const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
        layoutPlugin?.removeNodeFromLayout(node);

        node.dispose(); // Node should handle removing its objects from scenes.
        this.nodes.delete(nodeId);
        this.space.emit('node:removed', nodeId, node);
    }

    /**
     * Retrieves a node by its ID.
     * @param {string} id - The ID of the node to retrieve.
     * @returns {import('../graph/nodes/BaseNode.js').BaseNode | undefined}
     */
    getNodeById(id) {
        return this.nodes.get(id);
    }

    /**
     * Retrieves all nodes.
     * @returns {Map<string, import('../graph/nodes/BaseNode.js').BaseNode>}
     */
    getNodes() {
        return this.nodes;
    }

    update() {
        // Corresponds to this.nodes.forEach(node => node.update(this.space)); in old SpaceGraph.updateNodesAndEdges
        this.nodes.forEach((node) => {
            if (node.update && typeof node.update === 'function') {
                node.update(this.space); // Pass space instance for context if needed by node
            }
        });
    }

    dispose() {
        super.dispose();
        this.nodes.forEach((node) => node.dispose());
        this.nodes.clear();
        // console.log('NodePlugin disposed.');
    }
}
