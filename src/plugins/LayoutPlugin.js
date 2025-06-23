/**
 * @file LayoutPlugin.js - Manages graph layout algorithms for SpaceGraph.
 * @licence MIT
 */

import { Plugin } from '../core/Plugin.js';
import { ForceLayout } from '../layout/ForceLayout.js'; // Assuming ForceLayout is here

export class LayoutPlugin extends Plugin {
    /** @type {ForceLayout | null} */ // Should be a generic LayoutAlgorithm type later
    activeLayout = null;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
    }

    getName() {
        return 'LayoutPlugin';
    }

    init() {
        super.init();
        // Instantiate and set the default layout.
        // ForceLayout expects the SpaceGraph instance.
        // We might need to refactor ForceLayout later to not depend on the whole space instance directly,
        // or pass specific dependencies (node/edge plugins).
        this.activeLayout = new ForceLayout(this.space);

        // Populate the layout with existing nodes and edges if any were added before layout init.
        // This is important if plugins are initialized in a specific order.
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');

        if (nodePlugin && this.activeLayout && typeof this.activeLayout.addNode === 'function') {
            nodePlugin.getNodes().forEach((node) => this.activeLayout.addNode(node));
        }
        if (edgePlugin && this.activeLayout && typeof this.activeLayout.addEdge === 'function') {
            edgePlugin.getEdges().forEach((edge) => this.activeLayout.addEdge(edge));
        }
        // this.kick(); // Initial kick can be deferred or handled by application post-setup. Or done after listeners.

        this._setupEventListeners();
        this.kick(); // Kick after setup and potential population.
    }

    _setupEventListeners() {
        if (!this.space) return;
        const uiPlugin = this.pluginManager.getPlugin('UIPlugin');

        this.space.on('node:dragstart', (draggedNodeInstance) => {
            if (this.activeLayout && typeof this.activeLayout.fixNode === 'function') {
                const selectedNodes = uiPlugin?.getSelectedNodes();
                if (selectedNodes && selectedNodes.has(draggedNodeInstance)) {
                    selectedNodes.forEach(sNode => this.activeLayout.fixNode(sNode));
                } else {
                    // Fallback or if dragging a non-selected node (though selection should precede drag)
                    this.activeLayout.fixNode(draggedNodeInstance);
                }
            }
        });

        this.space.on('node:drag', (eventData) => {
            // Node position is already updated by BaseNode.drag().
            // Layout system might need a kick if it's not automatically handling fixed node movements.
            // If layout is very active, continuous kicking might be performance intensive.
            // For now, let dragend handle the kick.
        });

        this.space.on('node:dragend', (draggedNodeInstance) => {
            if (this.activeLayout && typeof this.activeLayout.releaseNode === 'function') {
                 const selectedNodes = uiPlugin?.getSelectedNodes();
                if (selectedNodes && selectedNodes.has(draggedNodeInstance)) {
                    selectedNodes.forEach(sNode => this.activeLayout.releaseNode(sNode));
                } else {
                    this.activeLayout.releaseNode(draggedNodeInstance);
                }
            }
            this.kick(); // Recalculate layout after node(s) are released.
        });

        // Event-driven updates for graph structure changes
        this.space.on('node:added', (node) => {
            this.addNodeToLayout(node);
            this.kick();
        });
        this.space.on('node:removed', (nodeId, node) => {
            // node instance is passed as second arg
            if (node) this.removeNodeFromLayout(node);
            this.kick();
        });
        this.space.on('edge:added', (edge) => {
            this.addEdgeToLayout(edge);
            this.kick();
        });
        this.space.on('edge:removed', (edgeId, edge) => {
            // edge instance is passed as second arg
            if (edge) this.removeEdgeFromLayout(edge);
            this.kick();
        });
    }

    /**
     * Adds a node to the current layout.
     * @param {import('../graph/nodes/BaseNode.js').BaseNode} node
     */
    addNodeToLayout(node) {
        this.activeLayout?.addNode(node);
    }

    /**
     * Removes a node from the current layout.
     * @param {import('../graph/nodes/BaseNode.js').BaseNode} node
     */
    removeNodeFromLayout(node) {
        this.activeLayout?.removeNode(node);
    }

    /**
     * Adds an edge to the current layout.
     * @param {import('../graph/Edge.js').Edge} edge
     */
    addEdgeToLayout(edge) {
        this.activeLayout?.addEdge(edge);
    }

    /**
     * Removes an edge from the current layout.
     * @param {import('../graph/Edge.js').Edge} edge
     */
    removeEdgeFromLayout(edge) {
        this.activeLayout?.removeEdge(edge);
    }

    /**
     * Triggers the layout algorithm to re-calculate positions.
     */
    kick() {
        this.activeLayout?.kick();
    }

    /**
     * Stops the layout algorithm.
     */
    stop() {
        this.activeLayout?.stop();
    }

    /**
     * The main update loop for the layout, if it requires explicit stepping.
     * ForceLayout manages its own animation via 'kick' and internal rAF loop for physics.
     * Other layouts might need this.
     */
    update() {
        // if (this.activeLayout && typeof this.activeLayout.step === 'function') {
        //     this.activeLayout.step();
        // }
    }

    dispose() {
        super.dispose();
        this.stop();
        this.activeLayout = null;
        // console.log('LayoutPlugin disposed.');
    }
}
