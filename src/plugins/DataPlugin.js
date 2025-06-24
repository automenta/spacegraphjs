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
    }

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
            camera: null,
        };

        nodePlugin.getNodes().forEach((node) => {
            graphData.nodes.push({
                id: node.id,
                type: node.data.type || 'unknown',
                position: { x: node.position.x, y: node.position.y, z: node.position.z },
                mass: node.mass,
                isPinned: node.isPinned || false,
                data: { ...node.data },
            });
        });

        edgePlugin.getEdges().forEach((edge) => {
            graphData.edges.push({
                sourceId: edge.source.id,
                targetId: edge.target.id,
                data: { ...edge.data },
            });
        });

        if (options.includeCamera && cameraPlugin) {
            const camControls = cameraPlugin.getControls();
            if (camControls) {
                graphData.camera = {
                    position: {
                        x: camControls.targetPosition.x,
                        y: camControls.targetPosition.y,
                        z: camControls.targetPosition.z,
                    },
                    lookAt: {
                        x: camControls.targetLookAt.x,
                        y: camControls.targetLookAt.y,
                        z: camControls.targetLookAt.z,
                    },
                    mode: camControls.getCameraMode ? camControls.getCameraMode() : 'orbit',
                };
            }
        } else {
            delete graphData.camera;
        }

        try {
            return JSON.stringify(graphData, null, options.prettyPrint ? 2 : undefined);
        } catch (error) {
            console.error('DataPlugin: Error serializing graph to JSON:', error);
            return null;
        }
    }

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
            Array.from(nodePlugin.getNodes().keys()).forEach((id) => nodePlugin.removeNode(id));
        }

        const importedNodesMap = new Map();
        for (const nodeData of graphData.nodes) {
            const node = nodePlugin.createAndAddNode({
                id: nodeData.id,
                type: nodeData.type,
                position: nodeData.position,
                data: nodeData.data,
                mass: nodeData.mass,
            });

            if (node) {
                if (nodeData.isPinned) node.isPinned = true;
                importedNodesMap.set(node.id, node);
            } else {
                console.warn(`DataPlugin: Failed to create node during import:`, nodeData);
            }
        }

        const currentLayout = layoutPlugin.layoutManager?.getActiveLayout();
        if (currentLayout && typeof currentLayout.setPinState === 'function') {
            graphData.nodes.forEach((nodeData) => {
                if (nodeData.isPinned) {
                    const nodeInstance = importedNodesMap.get(nodeData.id);
                    if (nodeInstance) currentLayout.setPinState(nodeInstance, true);
                }
            });
        }

        for (const edgeData of graphData.edges) {
            const sourceNode = importedNodesMap.get(edgeData.sourceId);
            const targetNode = importedNodesMap.get(edgeData.targetId);

            if (sourceNode && targetNode) {
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

        layoutPlugin.kick();

        this.space.emit('data:imported');
        console.log('DataPlugin: Graph data imported successfully.');
        return true;
    }

    dispose() {
        super.dispose();
    }
}
