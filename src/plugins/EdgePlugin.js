/**
 * @file EdgePlugin.js - Manages graph edges for SpaceGraph.
 * @licence MIT
 */

import { Plugin } from '../core/Plugin.js';
import { Edge } from '../graph/Edge.js'; // Assuming Edge class is in this path
import { Utils } from '../utils.js';   // For Utils.generateId

export class EdgePlugin extends Plugin {
    /** @type {Map<string, Edge>} */
    edges = new Map();

    // For temporarily storing selected edge from SpaceGraph, until selection model is also a plugin
    _tempSelectedEdgeRef = null;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
    }

    getName() {
        return 'EdgePlugin';
    }

    init() {
        super.init();
        if (this.space) {
            this._tempSelectedEdgeRef = this.space.edgeSelected;
        }
    }

    /**
     * Adds an edge between two nodes.
     * @param {import('../graph/nodes/BaseNode.js').BaseNode} sourceNode - The source node instance.
     * @param {import('../graph/nodes/BaseNode.js').BaseNode} targetNode - The target node instance.
     * @param {object} [data={}] - Optional data for the edge.
     * @returns {Edge | null} The added edge or null if failed.
     */
    addEdge(sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode || sourceNode === targetNode) {
            console.warn("EdgePlugin: Attempted to add edge with invalid source or target.");
            return null;
        }

        // Check for duplicate edges
        for (const existingEdge of this.edges.values()) {
            if ((existingEdge.source === sourceNode && existingEdge.target === targetNode) ||
                (existingEdge.source === targetNode && existingEdge.target === sourceNode)) {
                console.warn(`EdgePlugin: Duplicate edge ignored between ${sourceNode.id} and ${targetNode.id}.`);
                return existingEdge; // Or null, depending on desired behavior
            }
        }

        const edgeId = Utils.generateId('edge');
        const edge = new Edge(edgeId, sourceNode, targetNode, data);
        this.edges.set(edge.id, edge);

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (renderingPlugin && edge.line) {
            renderingPlugin.getWebGLScene()?.add(edge.line);
        } else if (!renderingPlugin) {
            console.warn("EdgePlugin: RenderingPlugin not available to add edge to scene.");
        }

        const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
        layoutPlugin?.addEdgeToLayout(edge);

        this.space.emit('edge:added', edge);
        return edge;
    }

    /**
     * Removes an edge from the graph by its ID.
     * @param {string} edgeId - The ID of the edge to remove.
     */
    removeEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) {
            console.warn(`EdgePlugin: Edge with ID ${edgeId} not found for removal.`);
            return;
        }

        if (this.space && this.space.edgeSelected === edge) {
            this.space.setSelectedEdge(null); // setSelectedEdge is still on SpaceGraph
        }

        const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
        layoutPlugin?.removeEdgeFromLayout(edge);

        edge.dispose(); // Edge should handle removing its line from the scene.
        this.edges.delete(edgeId);
        this.space.emit('edge:removed', edgeId, edge);
    }

    /**
     * Retrieves an edge by its ID.
     * @param {string} id - The ID of the edge to retrieve.
     * @returns {Edge | undefined}
     */
    getEdgeById(id) {
        return this.edges.get(id);
    }

    /**
     * Retrieves all edges.
     * @returns {Map<string, Edge>}
     */
    getEdges() {
        return this.edges;
    }

    /**
     * Retrieves edges connected to a specific node.
     * @param {import('../graph/nodes/BaseNode.js').BaseNode} node - The node to find connected edges for.
     * @returns {Edge[]} An array of connected edges.
     */
    getEdgesForNode(node) {
        const connectedEdges = [];
        for (const edge of this.edges.values()) {
            if (edge.source === node || edge.target === node) {
                connectedEdges.push(edge);
            }
        }
        return connectedEdges;
    }


    update() {
        // Corresponds to this.edges.forEach(edge => edge.update()); in old SpaceGraph.updateNodesAndEdges
        this.edges.forEach(edge => {
            if (edge.update && typeof edge.update === 'function') {
                edge.update(); // Edge update usually doesn't need space instance
            }
        });
    }

    dispose() {
        super.dispose();
        this.edges.forEach(edge => edge.dispose());
        this.edges.clear();
        // console.log('EdgePlugin disposed.');
    }
}
