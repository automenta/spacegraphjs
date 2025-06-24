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
        if (renderingPlugin && renderingPlugin.getWebGLScene()) {
            this.instancedEdgeManager = new InstancedEdgeManager(renderingPlugin.getWebGLScene());
        } else {
            console.error('EdgePlugin: RenderingPlugin or its scene not available for InstancedEdgeManager setup.');
        }
    }

    handleRendererResize({ width, height }) {
        this.edges.forEach((edge) => {
            if (!edge.isInstanced && edge.updateResolution) {
                edge.updateResolution(width, height);
            }
        });
    }

    _checkAndSwitchInstancingMode() {
        const shouldUseInstancing = this.edges.size >= INSTANCE_THRESHOLD;
        if (this.useInstancedEdges === shouldUseInstancing) return;

        this.useInstancedEdges = shouldUseInstancing;
        console.log(`EdgePlugin: Switching instancing mode. Now using instanced edges: ${this.useInstancedEdges}`);

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (!renderingPlugin || !this.instancedEdgeManager) return;

        const webglScene = renderingPlugin.getWebGLScene();
        const cssScene = renderingPlugin.getCSS3DScene();

        this.edges.forEach((edge) => {
            if (edge.isInstanced) {
            } else {
                if (edge.line) webglScene?.remove(edge.line);
                if (edge.arrowheads?.source) webglScene?.remove(edge.arrowheads.source);
                if (edge.arrowheads?.target) webglScene?.remove(edge.arrowheads.target);
                if (edge.labelObject) cssScene?.remove(edge.labelObject);
            }

            if (this.useInstancedEdges) {
                this.instancedEdgeManager.addEdge(edge);
            } else {
                edge.isInstanced = false;
                if (edge.line) {
                    edge.line.visible = true;
                    webglScene?.add(edge.line);
                }
                if (edge.arrowheads?.source) {
                    edge.arrowheads.source.visible = true;
                    webglScene?.add(edge.arrowheads.source);
                }
                if (edge.arrowheads?.target) {
                    edge.arrowheads.target.visible = true;
                    webglScene?.add(edge.arrowheads.target);
                }
                if (edge.labelObject) {
                    cssScene?.add(edge.labelObject);
                }
            }
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
            console.log(`EdgePlugin: Instancing mode is now: ${this.useInstancedEdges} (checked at addEdge)`);
        }

        if (this.useInstancedEdges && this.instancedEdgeManager) {
            this.instancedEdgeManager.addEdge(edge);
            if (edge.labelObject) {
                const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
                renderingPlugin?.getCSS3DScene()?.add(edge.labelObject);
            }
        } else {
            const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
            if (renderingPlugin) {
                const webglScene = renderingPlugin.getWebGLScene();
                const cssScene = renderingPlugin.getCSS3DScene();
                if (edge.line) webglScene?.add(edge.line);
                if (edge.arrowheads?.source) webglScene?.add(edge.arrowheads.source);
                if (edge.arrowheads?.target) webglScene?.add(edge.arrowheads.target);
                if (edge.labelObject) cssScene?.add(edge.labelObject);
            } else {
                console.warn('EdgePlugin: RenderingPlugin not available for standard edge.');
            }
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

        const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
        layoutPlugin?.removeEdgeFromLayout(edge);

        if (edge.isInstanced && this.instancedEdgeManager) {
            this.instancedEdgeManager.removeEdge(edge);
        }
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
            } else if (edge.update && typeof edge.update === 'function') {
                edge.update();
            }
            if (edge.updateLabelPosition && typeof edge.updateLabelPosition === 'function') {
                edge.updateLabelPosition();
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
