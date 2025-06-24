/**
 * @file NodePlugin.js - Manages graph nodes for SpaceGraph.
 * @licence MIT
 */

import { Plugin } from '../core/Plugin.js';
import { Utils } from '../utils.js'; // For Utils.generateId
import { NodeFactory } from '../graph/nodes/NodeFactory.js';
import { ShapeNode } from '../graph/nodes/ShapeNode.js'; // Import for instanceof check

export class NodePlugin extends Plugin {
    /** @type {Map<string, import('../graph/nodes/BaseNode.js').BaseNode>} */
    nodes = new Map();
    /** @type {NodeFactory} */
    nodeFactory = null;
    /** @type {import('../rendering/InstancedMeshManager.js').InstancedMeshManager | null} */
    instancedMeshManager = null;


    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.nodeFactory = new NodeFactory(spaceGraph); // Pass space instance if factory needs it
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

        let successfullyInstanced = false;
        // Try to add to InstancedMeshManager first
        if (this.instancedMeshManager && nodeInstance instanceof ShapeNode && nodeInstance.data.shape === 'sphere') {
            // For PoC, only instancing spheres. Could expand this condition.
            if (this.instancedMeshManager.addNode(nodeInstance)) {
                successfullyInstanced = true;
                // console.log(`NodePlugin: Node ${nodeInstance.id} added to instanced rendering.`);
            }
        }

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (renderingPlugin) {
            const cssScene = renderingPlugin.getCSS3DScene();
            // Add CSS objects (labels, HTML content) regardless of instancing
            if (nodeInstance.cssObject && cssScene) cssScene.add(nodeInstance.cssObject);
            if (nodeInstance.labelObject && cssScene) cssScene.add(nodeInstance.labelObject);

            // If not successfully instanced, add its own mesh to the main scene
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

        // If node was instanced, remove from InstancedMeshManager
        if (node.isInstanced && this.instancedMeshManager) {
            this.instancedMeshManager.removeNode(node);
        }
        // BaseNode.dispose() handles removing mesh from scene if it was added.
        // If it was instanced, its mesh was not added to scene, so dispose() is fine.
        node.dispose();
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
        // Corresponds to this.nodes.forEach(node => node.update(this.space));
        this.nodes.forEach((node) => {
            if (node.isInstanced && this.instancedMeshManager) {
                // If node is instanced, its transform/color updates are handled by the manager
                this.instancedMeshManager.updateNode(node);
            }
            // Call node's own update method for other logic (like label positioning)
            // The node.update() method itself might need to be aware if it's instanced
            // to avoid trying to update its own mesh's position directly if that mesh is hidden.
            // For now, ShapeNode.update primarily updates its own mesh and label.
            // If instanced, node.mesh.position might not be used by InstancedMeshManager directly,
            // as the manager uses node.position.
            if (node.update && typeof node.update === 'function') {
                node.update(this.space);
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
