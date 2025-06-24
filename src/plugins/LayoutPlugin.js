/**
 * @file LayoutPlugin.js - Manages graph layout algorithms for SpaceGraph.
 * @licence MIT
 */

import { Plugin } from '../core/Plugin.js';
import { ForceLayout } from '../layout/ForceLayout.js';
import { GridLayout } from '../layout/GridLayout.js';
import { CircularLayout } from '../layout/CircularLayout.js'; // Import CircularLayout
import { LayoutManager } from '../layout/LayoutManager.js';

export class LayoutPlugin extends Plugin {
    /** @type {LayoutManager | null} */
    layoutManager = null;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.layoutManager = new LayoutManager(spaceGraph, pluginManager);
    }

    getName() {
        return 'LayoutPlugin';
    }

    async init() { // init can be async due to applyLayout
        super.init();

        // Create and register layout instances
        const forceLayout = new ForceLayout(this.space); // ForceLayout constructor takes space
        this.layoutManager.registerLayout('force', forceLayout);

        const gridLayout = new GridLayout(); // GridLayout constructor is empty, context set by LayoutManager
        this.layoutManager.registerLayout('grid', gridLayout);

        const circularLayout = new CircularLayout(); // CircularLayout constructor is empty
        this.layoutManager.registerLayout('circular', circularLayout);

        // TODO: Register SphericalLayout, HierarchicalLayout

        // Set a default layout
        // applyLayout will call init() on the layout, which might populate it.
        await this.layoutManager.applyLayout('force');
        // No need to manually populate here if layout.init() handles it,
        // which LayoutManager's applyLayout calls.

        this._setupEventListeners();
        // this.kick(); // Initial kick might be handled by applyLayout or layout's own run method.
        // If ForceLayout's run/kick is not called by applyLayout, we might need it here.
        // ForceLayout.run() is called by LayoutManager.applyLayout.
        // ForceLayout's constructor doesn't auto-start.
    }

    _setupEventListeners() {
        if (!this.space || !this.layoutManager) return;
        const uiPlugin = this.pluginManager.getPlugin('UIPlugin');
        const activeLayout = this.layoutManager.getActiveLayout(); // Get initial active layout

        // Note: activeLayout might change. Event listeners should ideally operate on the
        // currently active layout via this.layoutManager.getActiveLayout() if the action
        // is generic, or the layout itself should handle these via its own event listeners
        // if it registers them with this.space.
        // For now, assuming these event handlers in LayoutPlugin are for generic layout interactions.

        this.space.on('node:dragstart', (draggedNodeInstance) => {
            const currentLayout = this.layoutManager.getActiveLayout();
            if (currentLayout && typeof currentLayout.fixNode === 'function') {
                const selectedNodes = uiPlugin?.getSelectedNodes();
                if (selectedNodes && selectedNodes.has(draggedNodeInstance)) {
                    selectedNodes.forEach(sNode => currentLayout.fixNode(sNode));
                } else {
                    currentLayout.fixNode(draggedNodeInstance);
                }
            }
        });

        this.space.on('node:drag', (eventData) => {
            // Node position updated by BaseNode.drag().
            // Continuous layouts (like force-directed) might pick this up if they read positions each tick.
            // Or a specific 'node:moved' event could be emitted if layouts need to react more directly.
            // For now, assuming fixed nodes' positions are directly used by the layout.
        });

        this.space.on('node:dragend', (draggedNodeInstance) => {
            const currentLayout = this.layoutManager.getActiveLayout();
            if (currentLayout && typeof currentLayout.releaseNode === 'function') {
                const selectedNodes = uiPlugin?.getSelectedNodes();
                if (selectedNodes && selectedNodes.has(draggedNodeInstance)) {
                    selectedNodes.forEach(sNode => currentLayout.releaseNode(sNode));
                } else {
                    currentLayout.releaseNode(draggedNodeInstance);
                }
            }
            this.kick(); // Recalculate layout after node(s) are released.
        });

        // Event-driven updates for graph structure changes, delegated through LayoutManager
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
     * Adds a node to the current layout via the LayoutManager.
     * @param {import('../graph/nodes/BaseNode.js').BaseNode} node
     */
    addNodeToLayout(node) {
        this.layoutManager?.addNodeToLayout(node);
    }

    /**
     * Removes a node from the current layout via the LayoutManager.
     * @param {import('../graph/nodes/BaseNode.js').BaseNode} node
     */
    removeNodeFromLayout(node) {
        this.layoutManager?.removeNodeFromLayout(node);
    }

    /**
     * Adds an edge to the current layout via the LayoutManager.
     * @param {import('../graph/Edge.js').Edge} edge
     */
    addEdgeToLayout(edge) {
        this.layoutManager?.addEdgeToLayout(edge);
    }

    /**
     * Removes an edge from the current layout via the LayoutManager.
     * @param {import('../graph/Edge.js').Edge} edge
     */
    removeEdgeFromLayout(edge) {
        this.layoutManager?.removeEdgeFromLayout(edge);
    }

    /**
     * Triggers the layout algorithm to re-calculate positions via the LayoutManager.
     */
    kick() {
        this.layoutManager?.kick();
    }

    /**
     * Stops the current layout algorithm via the LayoutManager.
     */
    stop() {
        this.layoutManager?.stopLayout();
    }

    /**
     * Applies a new layout.
     * @param {string} name - The name of the layout to apply.
     * @param {object} [config={}] - Configuration for the new layout.
     */
    async applyLayout(name, config = {}) {
        if (this.layoutManager) {
            return await this.layoutManager.applyLayout(name, config);
        }
        console.error("LayoutPlugin: LayoutManager not available to apply layout.");
        return false;
    }

    /**
     * Toggles the pinned state of a node in the current layout.
     * @param {string} nodeId - The ID of the node to toggle pin state for.
     */
    togglePinNode(nodeId) {
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const node = nodePlugin?.getNodeById(nodeId);
        if (!node) {
            console.warn(`LayoutPlugin: Node with ID ${nodeId} not found for pinning.`);
            return;
        }

        const currentLayout = this.layoutManager?.getActiveLayout();
        if (currentLayout && typeof currentLayout.setPinState === 'function') {
            // Toggle the current pinned state
            currentLayout.setPinState(node, !node.isPinned);
            this.space.emit('node:pinned', { node, isPinned: node.isPinned });
        } else {
            console.warn(`LayoutPlugin: Active layout does not support pinning or setPinState method.`);
        }
    }

    /**
     * The main update loop for the layout, delegating to LayoutManager.
     * This is for layouts that require continuous updates (e.g. physics steps).
     */
    update() {
        this.layoutManager?.update();
    }

    dispose() {
        super.dispose();
        this.layoutManager?.dispose();
        this.layoutManager = null;
        // console.log('LayoutPlugin disposed.');
    }
}
