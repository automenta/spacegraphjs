/**
 * @file NodePlugin.js - Manages graph nodes for SpaceGraph.
 * @licence MIT
 */

import { Plugin } from '../core/Plugin.js';
import { Utils } from '../utils.js'; // For Utils.generateId

export class NodePlugin extends Plugin {
    /** @type {Map<string, import('../graph/nodes/BaseNode.js').BaseNode>} */
    nodes = new Map();

    // For temporarily storing selected node from SpaceGraph, until selection model is also a plugin
    // This is not ideal but helps transition.
    _tempSelectedNodeRef = null;
    _tempLinkSourceNodeRef = null;


    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
    }

    getName() {
        return 'NodePlugin';
    }

    init() {
        super.init();
        // If SpaceGraph has a selectedNode or linkSourceNode property we want to sync with,
        // we could potentially get it here. For now, methods will update these.
        if (this.space) {
            this._tempSelectedNodeRef = this.space.nodeSelected;
            this._tempLinkSourceNodeRef = this.space.linkSourceNode;
        }
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
            console.warn("NodePlugin: RenderingPlugin not available to add node to scenes.");
        }

        const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
        layoutPlugin?.addNodeToLayout(nodeInstance);

        this.space.emit('node:added', nodeInstance);
        return nodeInstance;
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

        // Handle selection if the removed node was selected (temporary direct access)
        if (this.space && this.space.nodeSelected === node) {
            this.space.setSelectedNode(null); // setSelectedNode is still on SpaceGraph
        }
        if (this.space && this.space.linkSourceNode === node) {
            this.space._cancelLinking(); // _cancelLinking is still on SpaceGraph
        }

        // Remove connected edges. This logic might move to an EdgePlugin or be event-driven.
        // For now, it mirrors SpaceGraph's current behavior.
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
        if (edgePlugin && typeof edgePlugin.getEdgesForNode === 'function') {
            const connectedEdges = edgePlugin.getEdgesForNode(node);
            connectedEdges.forEach(edge => edgePlugin.removeEdge(edge.id));
        } else if (this.space && this.space.edges && typeof this.space.removeEdge === 'function') {
            // Fallback for transitional period if EdgePlugin isn't fully active
            // or if SpaceGraph still has direct edge management methods.
            // This block should become obsolete after EdgePlugin is fully integrated.
            const edgesToRemoveIds = [];
            for (const [edgeId, edge] of this.space.edges) { // Accessing space.edges directly
                if (edge.source === node || edge.target === node) {
                    edgesToRemoveIds.push(edgeId);
                }
            }
            edgesToRemoveIds.forEach(edgeId => this.space.removeEdge(edgeId)); // Calling space.removeEdge
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
        this.nodes.forEach(node => {
            if (node.update && typeof node.update === 'function') {
                node.update(this.space); // Pass space instance for context if needed by node
            }
        });
    }

    dispose() {
        super.dispose();
        this.nodes.forEach(node => node.dispose());
        this.nodes.clear();
        // console.log('NodePlugin disposed.');
    }
}
