/**
 * @file EdgePlugin.js - Manages graph edges for SpaceGraph.
 * @licence MIT
 */

import { Plugin } from '../core/Plugin.js';
// Edge class is now primarily used via EdgeFactory
// import { Edge } from '../graph/Edge.js';
import { Utils } from '../utils.js'; // For Utils.generateId
import { EdgeFactory } from '../graph/EdgeFactory.js';

export class EdgePlugin extends Plugin {
    /** @type {Map<string, import('../graph/Edge.js').Edge>} */
    edges = new Map();
    /** @type {EdgeFactory} */
    edgeFactory = null;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.edgeFactory = new EdgeFactory(spaceGraph);
    }

    getName() {
        return 'EdgePlugin';
    }

    init() {
        super.init();
        // _tempSelectedEdgeRef removed, UIPlugin manages selection.
        this.space.on('renderer:resize', this.handleRendererResize.bind(this));
    }

    handleRendererResize({ width, height }) {
        this.edges.forEach(edge => {
            if (edge.updateResolution) {
                edge.updateResolution(width, height);
            }
        });
    }

    /**
     * Adds an edge between two nodes.
     * @param {import('../graph/nodes/BaseNode.js').BaseNode} sourceNode - The source node instance.
     * @param {import('../graph/nodes/BaseNode.js').BaseNode} targetNode - The target node instance.
     * @param {object} [data={}] - Optional data for the edge. Should include `type` if not default.
     * @returns {import('../graph/Edge.js').Edge | null} The added edge or null if failed.
     */
    addEdge(sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode || sourceNode === targetNode) {
            console.warn('EdgePlugin: Attempted to add edge with invalid source or target.');
            return null;
        }

        // Check for duplicate edges (basic check, might need refinement for different edge types if allowed)
        for (const existingEdge of this.edges.values()) {
            if (
                (existingEdge.source === sourceNode && existingEdge.target === targetNode) ||
                (existingEdge.source === targetNode && existingEdge.target === sourceNode)
            ) {
                // Consider if different types of edges between same nodes are allowed.
                // For now, assume only one edge (of any type) between two nodes.
                console.warn(`EdgePlugin: Duplicate edge ignored between ${sourceNode.id} and ${targetNode.id}.`);
                return existingEdge;
            }
        }

        const edgeId = Utils.generateId('edge');
        const edgeType = data.type || 'default'; // 'default' will be resolved by factory

        const edge = this.edgeFactory.createEdge(edgeId, edgeType, sourceNode, targetNode, data);

        if (!edge) {
            console.error(`EdgePlugin: Failed to create edge of type "${edgeType}".`);
            return null;
        }

        // The factory now sets edge.space if the edge class needs it (like CurvedEdge)
        // edge.space = this.space; // Ensure edge has reference to SpaceGraph instance if factory doesn't set it

        this.edges.set(edge.id, edge);

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (renderingPlugin) {
            const webglScene = renderingPlugin.getWebGLScene();
            const cssScene = renderingPlugin.getCSS3DScene();

            if (edge.line) webglScene?.add(edge.line);

            // Add arrowheads if they exist
            if (edge.arrowheads?.source) webglScene?.add(edge.arrowheads.source);
            if (edge.arrowheads?.target) webglScene?.add(edge.arrowheads.target);

            // Add labelObject if it exists (for LabeledEdge and now CurvedEdge with label)
            if (edge.labelObject) cssScene?.add(edge.labelObject);

        } else {
            console.warn('EdgePlugin: RenderingPlugin not available to add edge components to scene.');
        }

        // const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin'); // LayoutPlugin now listens to edge:added
        // layoutPlugin?.addEdgeToLayout(edge);

        this.space.emit('edge:added', edge); // Emit event
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

        const uiPlugin = this.pluginManager.getPlugin('UIPlugin');
        if (uiPlugin?.getSelectedEdge() === edge) {
            uiPlugin.setSelectedEdge(null);
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
        this.edges.forEach((edge) => {
            if (edge.update && typeof edge.update === 'function') {
                edge.update(); // Edge update usually doesn't need space instance
            }
        });
    }

    dispose() {
        super.dispose();
        this.edges.forEach((edge) => edge.dispose());
        this.edges.clear();
        // console.log('EdgePlugin disposed.');
    }
}
