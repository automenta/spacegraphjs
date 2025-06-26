import {Plugin} from '../core/Plugin.js';
import {Utils} from '../utils.js';
import {EdgeFactory} from '../graph/EdgeFactory.js';
import {InstancedEdgeManager} from '../rendering/InstancedEdgeManager.js';

// Import all edge types
import {Edge} from '../graph/edges/Edge.js';
import {CurvedEdge} from '../graph/edges/CurvedEdge.js';
import {LabeledEdge} from '../graph/edges/LabeledEdge.js';
import {DottedEdge} from '../graph/edges/DottedEdge.js';
import {DynamicThicknessEdge} from '../graph/edges/DynamicThicknessEdge.js';

const INSTANCE_THRESHOLD = 50;

export class EdgePlugin extends Plugin {
    edges = new Map();
    edgeFactory = null;
    instancedEdgeManager = null;
    useInstancedEdges = false;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.edgeFactory = new EdgeFactory(spaceGraph); // Factory for creating edge instances
        this._registerEdgeTypes(); // Centralized registration of all known edge types
    }

    /**
     * Registers all known edge types with the EdgeFactory.
     * This method is called during plugin construction.
     * To add a new edge type:
     * 1. Create your edge class (e.g., MyCustomEdge extends Edge).
     * 2. Ensure it has a static `typeName` property (e.g., static typeName = 'myCustomEdge').
     * 3. Import it into this file (EdgePlugin.js).
     * 4. Add a line here: `this.edgeFactory.registerType(MyCustomEdge.typeName, MyCustomEdge);`
     */
    _registerEdgeTypes() {
        this.edgeFactory.registerType(Edge.typeName, Edge);
        this.edgeFactory.registerType(CurvedEdge.typeName, CurvedEdge);
        this.edgeFactory.registerType(LabeledEdge.typeName, LabeledEdge);
        this.edgeFactory.registerType(DottedEdge.typeName, DottedEdge);
        this.edgeFactory.registerType(DynamicThicknessEdge.typeName, DynamicThicknessEdge);

        this.edgeFactory.registerType('default', Edge);
    }

    getName() {
        return 'EdgePlugin';
    }

    init() {
        super.init();
        this.space.on('renderer:resize', this.handleRendererResize.bind(this));

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (!renderingPlugin?.getWebGLScene()) {
            console.error('EdgePlugin: RenderingPlugin or scene not available.');
            return;
        }
        this.instancedEdgeManager = new InstancedEdgeManager(renderingPlugin.getWebGLScene());
    }

    handleRendererResize({ width, height }) {
        this.edges.forEach((edge) => {
            if (!edge.isInstanced && edge.updateResolution) edge.updateResolution(width, height);
        });
    }

    _checkAndSwitchInstancingMode() {
        const shouldUseInstancing = this.edges.size >= INSTANCE_THRESHOLD;
        if (this.useInstancedEdges === shouldUseInstancing) return;

        this.useInstancedEdges = shouldUseInstancing;

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (!renderingPlugin || !this.instancedEdgeManager) return;

        const webglScene = renderingPlugin.getWebGLScene();
        const cssScene = renderingPlugin.getCSS3DScene();

        this.edges.forEach((edge) => {
            if (this.useInstancedEdges) {
                if (!edge.isInstanced) {
                    webglScene?.remove(edge.line);
                    if (edge.arrowheads?.source) webglScene?.remove(edge.arrowheads.source);
                    if (edge.arrowheads?.target) webglScene?.remove(edge.arrowheads.target);
                    this.instancedEdgeManager.addEdge(edge);
                }
            } else {
                if (edge.isInstanced) {
                    this.instancedEdgeManager.removeEdge(edge);
                }
                if (edge.line) webglScene?.add(edge.line);
                if (edge.arrowheads?.source) webglScene?.add(edge.arrowheads.source);
                if (edge.arrowheads?.target) webglScene?.add(edge.arrowheads.target);
            }
            if (edge.labelObject) {
                if (this.useInstancedEdges) {
                    cssScene?.add(edge.labelObject);
                } else {
                    cssScene?.add(edge.labelObject);
                }
            }
        });
    }

    addEdge(sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode || sourceNode === targetNode) {
            console.warn('EdgePlugin: Invalid source or target.');
            return null;
        }
        for (const existingEdge of this.edges.values()) {
            if ((existingEdge.source === sourceNode && existingEdge.target === targetNode) ||
                (existingEdge.source === targetNode && existingEdge.target === sourceNode)) {
                console.warn(`EdgePlugin: Duplicate edge ignored between ${sourceNode.id} and ${targetNode.id}.`);
                return existingEdge;
            }
        }

        const edge = this.edgeFactory.createEdge(Utils.generateId('edge'), data.type || 'default', sourceNode, targetNode, data);
        if (!edge) {
            console.error(`EdgePlugin: Failed to create edge type "${data.type || 'default'}".`);
            return null;
        }
        this.edges.set(edge.id, edge);

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        const webglScene = renderingPlugin?.getWebGLScene();
        const cssScene = renderingPlugin?.getCSS3DScene();

        if (this.edges.size >= INSTANCE_THRESHOLD) {
            this.instancedEdgeManager.addEdge(edge);
        } else {
            if (edge.line) webglScene?.add(edge.line);
            if (edge.arrowheads?.source) webglScene?.add(edge.arrowheads.source);
            if (edge.arrowheads?.target) webglScene?.add(edge.arrowheads.target);
        }
        if (edge.labelObject) cssScene?.add(edge.labelObject);

        this._checkAndSwitchInstancingMode();
        this.space.emit('edge:added', edge);
        return edge;
    }

    removeEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) return console.warn(`EdgePlugin: Edge ${edgeId} not found.`);

        this.pluginManager.getPlugin('UIPlugin')?.getSelectedEdge() === edge &&
            this.pluginManager.getPlugin('UIPlugin').setSelectedEdge(null);

        this.pluginManager.getPlugin('LayoutPlugin')?.removeEdgeFromLayout(edge);

        if (edge.isInstanced && this.instancedEdgeManager) this.instancedEdgeManager.removeEdge(edge);
        else {
            const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
            renderingPlugin?.getWebGLScene()?.remove(edge.line);
            if (edge.arrowheads?.source) renderingPlugin?.getWebGLScene()?.remove(edge.arrowheads.source);
            if (edge.arrowheads?.target) renderingPlugin?.getWebGLScene()?.remove(edge.arrowheads.target);
            if (edge.labelObject) renderingPlugin?.getCSS3DScene()?.remove(edge.labelObject);
        }

        edge.dispose();
        this.edges.delete(edgeId);
        this._checkAndSwitchInstancingMode();
        this.space.emit('edge:removed', edgeId, edge);
    }

    getEdgeById(id) {
        return this.edges.get(id);
    }
    getEdges() {
        return this.edges;
    }

    getEdgesForNode(node) {
        const connectedEdges = [];
        for (const edge of this.edges.values()) {
            if (edge.source === node || edge.target === node) connectedEdges.push(edge);
        }
        return connectedEdges;
    }

    update() {
        this.edges.forEach((edge) => {
            if (edge.isInstanced && this.instancedEdgeManager) this.instancedEdgeManager.updateEdge(edge);
            else edge.update?.();
            edge.updateLabelPosition?.();
        });
    }

    dispose() {
        super.dispose();
        this.instancedEdgeManager?.dispose();
        this.instancedEdgeManager = null;
        this.edges.forEach((edge) => edge.dispose());
        this.edges.clear();
    }
}
