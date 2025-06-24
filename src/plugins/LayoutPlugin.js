import { Plugin } from '../core/Plugin.js';
import { ForceLayout } from '../layout/ForceLayout.js';
import { GridLayout } from '../layout/GridLayout.js';
import { CircularLayout } from '../layout/CircularLayout.js';
import { SphericalLayout } from '../layout/SphericalLayout.js';
import { HierarchicalLayout } from '../layout/HierarchicalLayout.js';
import { LayoutManager } from '../layout/LayoutManager.js';

export class LayoutPlugin extends Plugin {
    layoutManager = null;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.layoutManager = new LayoutManager(spaceGraph, pluginManager);
    }

    getName() {
        return 'LayoutPlugin';
    }

    async init() {
        super.init();

        const forceLayout = new ForceLayout(this.space);
        this.layoutManager.registerLayout('force', forceLayout);

        const gridLayout = new GridLayout();
        this.layoutManager.registerLayout('grid', gridLayout);

        const circularLayout = new CircularLayout();
        this.layoutManager.registerLayout('circular', circularLayout);

        const sphericalLayout = new SphericalLayout();
        this.layoutManager.registerLayout('spherical', sphericalLayout);

        const hierarchicalLayout = new HierarchicalLayout();
        this.layoutManager.registerLayout('hierarchical', hierarchicalLayout);

        await this.layoutManager.applyLayout('force');

        this._setupEventListeners();
    }

    _setupEventListeners() {
        if (!this.space || !this.layoutManager) return;

        this.space.on('ui:request:applyLayout', (layoutName) => this.applyLayout(layoutName));

        this.space.on('node:dragstart', (draggedNodeInstance) => {
            const currentLayout = this.layoutManager.getActiveLayout();
            if (!currentLayout?.fixNode) return;
            const uiPlugin = this.pluginManager.getPlugin('UIPlugin');
            const selectedNodes = uiPlugin?.getSelectedNodes();
            if (selectedNodes?.has(draggedNodeInstance)) {
                selectedNodes.forEach((sNode) => currentLayout.fixNode(sNode));
            } else {
                currentLayout.fixNode(draggedNodeInstance);
            }
        });

        this.space.on('node:dragend', (draggedNodeInstance) => {
            const currentLayout = this.layoutManager.getActiveLayout();
            if (!currentLayout?.releaseNode) return;
            const uiPlugin = this.pluginManager.getPlugin('UIPlugin');
            const selectedNodes = uiPlugin?.getSelectedNodes();
            if (selectedNodes?.has(draggedNodeInstance)) {
                selectedNodes.forEach((sNode) => currentLayout.releaseNode(sNode));
            } else {
                currentLayout.releaseNode(draggedNodeInstance);
            }
            this.kick();
        });

        this.space.on('node:added', (node) => {
            this.addNodeToLayout(node);
            this.kick();
        });
        this.space.on('node:removed', (nodeId, node) => {
            if (node) this.removeNodeFromLayout(node);
            this.kick();
        });
        this.space.on('edge:added', (edge) => {
            this.addEdgeToLayout(edge);
            this.kick();
        });
        this.space.on('edge:removed', (edgeId, edge) => {
            if (edge) this.removeEdgeFromLayout(edge);
            this.kick();
        });
    }

    addNodeToLayout(node) {
        this.layoutManager?.addNodeToLayout(node);
    }

    removeNodeFromLayout(node) {
        this.layoutManager?.removeNodeFromLayout(node);
    }

    addEdgeToLayout(edge) {
        this.layoutManager?.addEdgeToLayout(edge);
    }

    removeEdgeFromLayout(edge) {
        this.layoutManager?.removeEdgeFromLayout(edge);
    }

    kick() {
        this.layoutManager?.kick();
    }

    stop() {
        this.layoutManager?.stopLayout();
    }

    async applyLayout(name, config = {}) {
        return this.layoutManager?.applyLayout(name, config);
    }

    togglePinNode(nodeId) {
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const node = nodePlugin?.getNodeById(nodeId);
        if (!node) {
            console.warn(`LayoutPlugin: Node with ID ${nodeId} not found for pinning.`);
            return;
        }

        const currentLayout = this.layoutManager?.getActiveLayout();
        if (currentLayout?.setPinState) {
            currentLayout.setPinState(node, !node.isPinned);
            this.space.emit('node:pinned', { node, isPinned: node.isPinned });
        } else {
            console.warn(`LayoutPlugin: Active layout does not support pinning or setPinState method.`);
        }
    }

    update() {
        this.layoutManager?.update();
    }

    dispose() {
        super.dispose();
        this.layoutManager?.dispose();
        this.layoutManager = null;
    }
}
