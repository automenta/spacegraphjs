/**
 * @file DataPlugin.js - Handles exporting and importing graph data for SpaceGraph.
 * @licence MIT
 */

import { Plugin } from '../core/Plugin.js';

export class DataPlugin extends Plugin {
    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
    }

    getName() {
        return 'DataPlugin';
    }

    init() {
        super.init();
        // console.log('DataPlugin initialized.');
    }

    /**
     * Exports the current graph structure to a JSON string.
     * @param {object} options - Export options.
     * @param {boolean} [options.prettyPrint=false] - Whether to pretty print the JSON.
     * @param {boolean} [options.includeCamera=false] - Whether to include camera state.
     * @returns {string | null} JSON string representation of the graph, or null on error.
     */
    exportGraphToJSON(options = { prettyPrint: false, includeCamera: false }) {
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
        const cameraPlugin = this.pluginManager.getPlugin('CameraPlugin');

        if (!nodePlugin || !edgePlugin) {
            console.error('DataPlugin: NodePlugin or EdgePlugin not available.');
            return null;
        }

        const graphData = {
            nodes: [],
            edges: [],
            camera: null, // Placeholder for camera data
        };

        // Serialize nodes
        nodePlugin.getNodes().forEach(node => {
            graphData.nodes.push({
                id: node.id,
                type: node.data.type || 'unknown', // Essential for NodeFactory
                position: { x: node.position.x, y: node.position.y, z: node.position.z },
                mass: node.mass,
                isPinned: node.isPinned || false,
                data: { ...node.data }, // Full data object, includes type-specifics
            });
        });

        // Serialize edges
        edgePlugin.getEdges().forEach(edge => {
            graphData.edges.push({
                // id: edge.id, // Optional, can be auto-generated on import
                sourceId: edge.source.id,
                targetId: edge.target.id,
                data: { ...edge.data }, // Full data object, includes type, constraints, label etc.
            });
        });

        if (options.includeCamera && cameraPlugin) {
            const camControls = cameraPlugin.getControls();
            if (camControls) {
                 graphData.camera = {
                    position: {x: camControls.targetPosition.x, y: camControls.targetPosition.y, z: camControls.targetPosition.z },
                    lookAt: {x: camControls.targetLookAt.x, y: camControls.targetLookAt.y, z: camControls.targetLookAt.z },
                    mode: camControls.getCameraMode ? camControls.getCameraMode() : 'orbit', // if getCameraMode exists
                 };
            }
        } else {
            delete graphData.camera; // Remove if not included
        }


        try {
            return JSON.stringify(graphData, null, options.prettyPrint ? 2 : undefined);
        } catch (error) {
            console.error('DataPlugin: Error serializing graph to JSON:', error);
            return null;
        }
    }

    /**
     * Imports a graph from a JSON string or object.
     * @param {string | object} jsonData - The JSON string or pre-parsed object.
     * @param {object} options - Import options.
     * @param {boolean} [options.clearExistingGraph=true] - Whether to clear the current graph before importing.
     * @returns {boolean} True if import was successful, false otherwise.
     */
    async importGraphFromJSON(jsonData, options = { clearExistingGraph: true }) {
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
        const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
        const cameraPlugin = this.pluginManager.getPlugin('CameraPlugin');


        if (!nodePlugin || !edgePlugin || !layoutPlugin) {
            console.error('DataPlugin: Required plugins (Node, Edge, Layout) not available for import.');
            return false;
        }

        let graphData;
        try {
            graphData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            if (!graphData || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) {
                throw new Error('Invalid graph data structure.');
            }
        } catch (error) {
            console.error('DataPlugin: Error parsing JSON for import:', error);
            return false;
        }

        if (options.clearExistingGraph) {
            // Create arrays of IDs to avoid issues with modifying maps while iterating
            const currentNodeIds = Array.from(nodePlugin.getNodes().keys());
            currentNodeIds.forEach(id => nodePlugin.removeNode(id));

            // Edges are typically removed when nodes are removed, but explicit clear can be added if needed
            // const currentEdgeIds = Array.from(edgePlugin.getEdges().keys());
            // currentEdgeIds.forEach(id => edgePlugin.removeEdge(id));
        }

        // Import nodes
        // Use a map to quickly find re-created node instances for edge connections
        const importedNodesMap = new Map();
        for (const nodeData of graphData.nodes) {
            // NodeFactory uses data.type, so ensure it's there.
            // The serialized nodeData.data should contain the original data.type.
            const node = nodePlugin.createAndAddNode({
                id: nodeData.id, // Use original ID
                type: nodeData.type, // Explicitly pass type to createAndAddNode
                position: nodeData.position,
                data: nodeData.data, // Pass the full original data object
                mass: nodeData.mass,
            });

            if (node) {
                if (nodeData.isPinned) {
                    node.isPinned = true;
                    // If layout is active and supports pinning, inform it.
                    // This is tricky as layout might not be active/chosen yet.
                    // Pinning is often best applied after initial layout.
                }
                importedNodesMap.set(node.id, node);
            } else {
                console.warn(`DataPlugin: Failed to create node during import:`, nodeData);
            }
        }

        // Apply pinning after all nodes are created and potentially after first layout pass
        // For now, direct pinning if node.isPinned was true in data.
         graphData.nodes.forEach(nodeData => {
            if (nodeData.isPinned) {
                const nodeInstance = importedNodesMap.get(nodeData.id);
                if (nodeInstance) {
                    // Ensure layout is aware of this pin state.
                    // Direct call to togglePinNode on LayoutPlugin might be best if available
                    // or set node.isPinned and let layout's init pick it up.
                    // For simplicity, we set isPinned, and assume layout will respect it on next run.
                    layoutPlugin.togglePinNode?.(nodeInstance.id); // This will toggle it to the desired state
                    if (!nodeInstance.isPinned) layoutPlugin.togglePinNode?.(nodeInstance.id); // Ensure it's pinned if it got unpinned
                }
            }
        });


        // Import edges
        for (const edgeData of graphData.edges) {
            const sourceNode = importedNodesMap.get(edgeData.sourceId);
            const targetNode = importedNodesMap.get(edgeData.targetId);

            if (sourceNode && targetNode) {
                // EdgeFactory uses data.type
                edgePlugin.addEdge(sourceNode, targetNode, edgeData.data);
            } else {
                console.warn(`DataPlugin: Could not find source/target node for edge during import:`, edgeData);
            }
        }

        if (graphData.camera && cameraPlugin) {
            const camControls = cameraPlugin.getControls();
            const camData = graphData.camera;
            if (camControls && camData.position && camData.lookAt) {
                camControls.moveTo(camData.position.x, camData.position.y, camData.position.z, 0.5, camData.lookAt);
                if (camData.mode && camControls.setCameraMode) {
                    camControls.setCameraMode(camData.mode);
                }
            }
        }


        // Optionally, trigger a layout update
        // await layoutPlugin.applyLayout(layoutPlugin.layoutManager?.getActiveLayoutName() || 'force');
        layoutPlugin.kick(); // A simpler kick might be enough, or a full re-apply.

        this.space.emit('data:imported');
        console.log('DataPlugin: Graph data imported successfully.');
        return true;
    }

    dispose() {
        super.dispose();
        // console.log('DataPlugin disposed.');
    }
}
