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
        if (renderingPlugin?.getWebGLScene()) {
            this.instancedEdgeManager = new InstancedEdgeManager(renderingPlugin.getWebGLScene());
        } else {
            console.error('EdgePlugin: RenderingPlugin or its scene not available for InstancedEdgeManager setup.');
        }
    }

    handleRendererResize({ width, height }) {
        this.edges.forEach((edge) => {
            if (!edge.isInstanced && edge.updateResolution) edge.updateResolution(width, height);
        });
    }

    addEdge(sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode || sourceNode === targetNode) {
            console.warn('EdgePlugin: Attempted to add edge with invalid source or target.');
            return null;
        }
        for (const existingEdge of this.edges.values()) {
            if (
                (existingEdge.source === sourceNode && existingEdge.target === targetNode) ||
                (existingEdge.source === targetNode && existingEdge.target === sourceNode)
            ) {
                console.warn(`EdgePlugin: Duplicate edge ignored between ${sourceNode.id} and ${targetNode.id}.`);
                return existingEdge;
            }
        }

        const edgeId = Utils.generateId('edge');
        const edgeType = data.type || 'default';
        const edge = this.edgeFactory.createEdge(edgeId, edgeType, sourceNode, targetNode, data);
        if (!edge) {
            console.error(`EdgePlugin: Failed to create edge of type "${edgeType}".`);
            return null;
        }
        this.edges.set(edge.id, edge);

        const currentlyShouldUseInstancing = this.edges.size >= INSTANCE_THRESHOLD;
        if (this.useInstancedEdges !== currentlyShouldUseInstancing) {
            this.useInstancedEdges = currentlyShouldUseInstancing;
        }

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (this.useInstancedEdges && this.instancedEdgeManager) {
            this.instancedEdgeManager.addEdge(edge);
            renderingPlugin?.getCSS3DScene()?.add(edge.labelObject);
        } else if (renderingPlugin) {
            const webglScene = renderingPlugin.getWebGLScene();
            const cssScene = renderingPlugin.getCSS3DScene();
            webglScene?.add(edge.line);
            webglScene?.add(edge.arrowheads?.source);
            webglScene?.add(edge.arrowheads?.target);
            cssScene?.add(edge.labelObject);
        } else {
            console.warn('EdgePlugin: RenderingPlugin not available for standard edge.');
        }

        this.space.emit('edge:added', edge);
        return edge;
    }

    removeEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) {
            console.warn(`EdgePlugin: Edge with ID ${edgeId} not found for removal.`);
            return;
        }

        const uiPlugin = this.pluginManager.getPlugin('UIPlugin');
        if (uiPlugin?.getSelectedEdge() === edge) uiPlugin.setSelectedEdge(null);

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
            if (edge.isInstanced && this.instancedEdgeManager) {
                this.instancedEdgeManager.updateEdge(edge);
            } else if (edge.update) {
                edge.update();
            }
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
