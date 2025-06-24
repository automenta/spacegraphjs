/**
 * @file EdgePlugin.js - Manages graph edges for SpaceGraph.
 * @licence MIT
 */

import { Plugin } from '../core/Plugin.js';
import { Utils } from '../utils.js';
import { EdgeFactory } from '../graph/EdgeFactory.js';
import { InstancedEdgeManager } from '../rendering/InstancedEdgeManager.js'; // Added

const INSTANCE_THRESHOLD = 50; // Number of edges after which instancing is used.

export class EdgePlugin extends Plugin {
    /** @type {Map<string, import('../graph/Edge.js').Edge>} */
    edges = new Map();
    /** @type {EdgeFactory} */
    edgeFactory = null;
    /** @type {InstancedEdgeManager | null} */
    instancedEdgeManager = null; // Added
    useInstancedEdges = false; // Added

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.edgeFactory = new EdgeFactory(spaceGraph);
        // InstancedEdgeManager will be initialized in init() after RenderingPlugin is ready
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
            // InstancedEdgeManager currently doesn't need resolution updates for cylinders
        });
    }

    _checkAndSwitchInstancingMode() {
        const shouldUseInstancing = this.edges.size >= INSTANCE_THRESHOLD;
        if (this.useInstancedEdges === shouldUseInstancing) {
            return; // No change in mode
        }

        this.useInstancedEdges = shouldUseInstancing;
        console.log(`EdgePlugin: Switching instancing mode. Now using instanced edges: ${this.useInstancedEdges}`);

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (!renderingPlugin || !this.instancedEdgeManager) return;

        const webglScene = renderingPlugin.getWebGLScene();
        const cssScene = renderingPlugin.getCSS3DScene();

        this.edges.forEach((edge) => {
            // Remove current representation
            if (edge.isInstanced) {
                // This case (switching from instanced to non-instanced) means this.instancedEdgeManager.removeEdge was called
                // but the edge object itself still exists. We need to re-add its Line2 representation.
                // For simplicity, this transition logic is complex if removeEdge fully cleans up.
                // Let's assume removeEdge in InstancedEdgeManager just hides it.
                // This part needs careful implementation if frequent dynamic switching is required.
                // For now, focusing on one-way switch to instancing for newly added edges beyond threshold.
            } else {
                if (edge.line) webglScene?.remove(edge.line);
                if (edge.arrowheads?.source) webglScene?.remove(edge.arrowheads.source);
                if (edge.arrowheads?.target) webglScene?.remove(edge.arrowheads.target);
                if (edge.labelObject) cssScene?.remove(edge.labelObject);
            }

            // Add new representation
            if (this.useInstancedEdges) {
                this.instancedEdgeManager.addEdge(edge); // This will mark edge.isInstanced = true and hide Line2
            } else {
                // This path is tricky if an edge was previously instanced.
                // It would need its Line2 (and arrowheads, label) to be made visible again.
                // For now, this function primarily handles the switch *towards* instancing.
                // A full two-way dynamic switch is a larger refactor.
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
                    // Label visibility is usually managed by its own logic, ensure it's added
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

        // Decide rendering strategy
        // For simplicity, let's make the decision here. A full dynamic switch is more complex.
        // If instancing is active OR if adding this edge *crosses* the threshold.
        const currentlyShouldUseInstancing = this.edges.size >= INSTANCE_THRESHOLD;
        if (this.useInstancedEdges !== currentlyShouldUseInstancing) {
            this.useInstancedEdges = currentlyShouldUseInstancing;
            // This implies a potential mode switch for ALL edges if the threshold is crossed.
            // For now, new edges adopt the current mode. A full re-render of all edges
            // on mode switch is deferred.
            console.log(`EdgePlugin: Instancing mode is now: ${this.useInstancedEdges} (checked at addEdge)`);
        }

        if (this.useInstancedEdges && this.instancedEdgeManager) {
            this.instancedEdgeManager.addEdge(edge);
            // Note: LabeledEdge's CSS3D label won't be handled by InstancedEdgeManager.
            // This needs consideration if instanced edges are also LabeledEdges.
            // For now, assume instanced edges are simple lines.
            if (edge.labelObject) {
                // If a label object exists, ensure it's added to CSS scene
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
        // The edge.dispose() method handles Line2, arrowheads, and label removal from scenes.
        // If it was instanced, its primary visuals were already hidden by InstancedEdgeManager.
        // We still call dispose for any other cleanup the edge might need.
        edge.dispose();
        this.edges.delete(edgeId);
        this.space.emit('edge:removed', edgeId, edge);

        // Optional: Check if we should switch back from instancing if count drops below threshold
        // This adds complexity with re-creating Line2 objects. For now, mode switch is one-way or based on current count.
        // const shouldStillUseInstancing = (this.edges.size >= INSTANCE_THRESHOLD);
        // if (this.useInstancedEdges && !shouldStillUseInstancing) {
        //    this._checkAndSwitchInstancingMode(); // This would re-evaluate all edges
        // }
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
                this.instancedEdgeManager.updateEdge(edge); // Updates transform/color of instanced representation
            } else if (edge.update && typeof edge.update === 'function') {
                edge.update(); // Standard Line2 update
            }
            // Common updates for all edges, e.g., label positioning for LabeledEdge
            if (edge.updateLabelPosition && typeof edge.updateLabelPosition === 'function') {
                edge.updateLabelPosition();
            }
        });
    }

    dispose() {
        super.dispose();
        this.instancedEdgeManager?.dispose(); // Dispose manager
        this.instancedEdgeManager = null;
        this.edges.forEach((edge) => edge.dispose()); // Dispose individual edges
        this.edges.clear();
        // console.log('EdgePlugin disposed.');
    }
}
