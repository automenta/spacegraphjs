import { Plugin } from '../core/Plugin.js';
import { Utils } from '../utils.js';
import { EdgeFactory } from '../graph/EdgeFactory.js';
import { InstancedEdgeManager } from '../rendering/InstancedEdgeManager.js';

const INSTANCE_THRESHOLD = 50;

export class EdgePlugin extends Plugin {
    edges = new Map();
    edgeFactory = null;
    instancedEdgeManager = null;
    useInstancedEdges = false;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.edgeFactory = new EdgeFactory(spaceGraph);
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
            if (edge.isInstanced) {
                // If it was instanced, it's already handled by InstancedEdgeManager
            } else {
                webglScene?.remove(edge.line);
                webglScene?.remove(edge.arrowheads?.source);
                webglScene?.remove(edge.arrowheads?.target);
                cssScene?.remove(edge.labelObject);
            }

            if (this.useInstancedEdges) {
                this.instancedEdgeManager.addEdge(edge);
            } else {
                edge.isInstanced = false;
                if (edge.line) webglScene?.add(edge.line);
                if (edge.arrowheads?.source) webglScene?.add(edge.arrowheads.source);
                if (edge.arrowheads?.target) webglScene?.add(edge.arrowheads.target);
                if (edge.labelObject) cssScene?.add(edge.labelObject);
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

        const currentlyShouldUseInstancing = this.edges.size >= INSTANCE_THRESHOLD;
        if (this.useInstancedEdges !== currentlyShouldUseInstancing) this.useInstancedEdges = currentlyShouldUseInstancing;

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (this.useInstancedEdges && this.instancedEdgeManager) {
            this.instancedEdgeManager.addEdge(edge);
            renderingPlugin?.getCSS3DScene()?.add(edge.labelObject);
        } else {
            renderingPlugin?.getWebGLScene()?.add(edge.line);
            renderingPlugin?.getWebGLScene()?.add(edge.arrowheads?.source);
            renderingPlugin?.getWebGLScene()?.add(edge.arrowheads?.target);
            renderingPlugin?.getCSS3DScene()?.add(edge.labelObject);
        }

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
        edge.dispose();
        this.edges.delete(edgeId);
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
