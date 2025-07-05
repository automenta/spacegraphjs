import {Plugin} from '../core/Plugin.js';
import {ForceLayout} from '../layout/ForceLayout.js';
import {GridLayout} from '../layout/GridLayout.js';
import {CircularLayout} from '../layout/CircularLayout.js';
import {SphericalLayout} from '../layout/SphericalLayout.js';
import {HierarchicalLayout} from '../layout/HierarchicalLayout.js';
import {TreeMapLayout} from '../layout/TreeMapLayout.js'; // Added TreeMapLayout
import {RadialLayout} from '../layout/RadialLayout.js'; // Added RadialLayout
import {AdvancedLayoutManager} from '../layout/AdvancedLayoutManager.js';

export class LayoutPlugin extends Plugin {
    layoutManager = null;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.layoutManager = new AdvancedLayoutManager(spaceGraph, pluginManager);
    }

    getName() {
        return 'LayoutPlugin';
    }

    async init() {
        super.init();

        // To add a new layout:
        // 1. Create your layout class (e.g., MyCustomLayout). It should adhere to the
        //    common layout interface (init, run, stop, updateConfig, dispose, etc.).
        // 2. Import it into this file (LayoutPlugin.js).
        // 3. Instantiate and register it with the LayoutManager below.
        //    Use a unique string key for the layout (e.g., MyCustomLayout.layoutName or 'myCustom').
        //    Example: this.layoutManager.registerLayout('myCustom', new MyCustomLayout({ option: value }));

        this.layoutManager.registerLayout('force', new ForceLayout());
        this.layoutManager.registerLayout('grid', new GridLayout());
        this.layoutManager.registerLayout('circular', new CircularLayout());
        this.layoutManager.registerLayout('spherical', new SphericalLayout());
        this.layoutManager.registerLayout('hierarchical', new HierarchicalLayout());
        this.layoutManager.registerLayout(TreeMapLayout.layoutName, new TreeMapLayout());
        this.layoutManager.registerLayout(RadialLayout.layoutName, new RadialLayout());

        // Enable advanced layout features by default
        this.layoutManager.enableAdvancedFeatures({
            connections: true,
            constraints: false,
            nesting: false,
            adaptive: false,
            autoMode: false
        });

        await this.layoutManager.applyLayout('force');
        this._setupEventListeners();
    }

    _setupEventListeners() {
        if (!this.space || !this.layoutManager) return;
        const uiPlugin = this.pluginManager.getPlugin('UIPlugin');

        this.space.on('ui:request:applyLayout', (layoutName) => this.applyLayout(layoutName));

        this.space.on('node:dragstart', (draggedNodeInstance) => {
            const currentLayout = this.layoutManager.getActiveLayout();
            if (!currentLayout || typeof currentLayout.fixNode !== 'function') return;
            const selectedNodes = uiPlugin?.getSelectedNodes();
            selectedNodes?.has(draggedNodeInstance)
                ? selectedNodes.forEach((sNode) => currentLayout.fixNode(sNode))
                : currentLayout.fixNode(draggedNodeInstance);
        });

        this.space.on('node:dragend', (draggedNodeInstance) => {
            const currentLayout = this.layoutManager.getActiveLayout();
            if (!currentLayout || typeof currentLayout.releaseNode !== 'function') return;
            const selectedNodes = uiPlugin?.getSelectedNodes();
            selectedNodes?.has(draggedNodeInstance)
                ? selectedNodes.forEach((sNode) => currentLayout.releaseNode(sNode))
                : currentLayout.releaseNode(draggedNodeInstance);
            this.kick();
        });

        this.space.on('node:added', (nodeId, nodeInstance) => { // Correctly capture both arguments
            this.addNodeToLayout(nodeInstance); // Use the nodeInstance
            this.kick();
        });
        this.space.on('node:removed', (nodeId, node) => {
            node && this.removeNodeFromLayout(node);
            this.kick();
        });
        this.space.on('edge:added', (edge) => {
            this.addEdgeToLayout(edge);
            this.kick();
        });
        this.space.on('edge:removed', (edgeId, edge) => {
            edge && this.removeEdgeFromLayout(edge);
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
        return this.layoutManager?.applyLayout(name, config) || false;
    }

    togglePinNode(nodeId) {
        const node = this.pluginManager.getPlugin('NodePlugin')?.getNodeById(nodeId);
        if (!node) return console.warn(`LayoutPlugin: Node ${nodeId} not found.`);

        const currentLayout = this.layoutManager?.getActiveLayout();
        if (currentLayout && typeof currentLayout.setPinState === 'function') {
            currentLayout.setPinState(node, !node.isPinned);
            this.space.emit('node:pinned', { node, isPinned: node.isPinned });
        } else {
            console.warn(`LayoutPlugin: Active layout does not support pinning.`);
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
