import * as THREE from 'three';
import { HtmlNode } from '../graph/nodes/HtmlNode.js';
import { PluginManager } from './PluginManager.js';
import { RenderingPlugin } from '../plugins/RenderingPlugin.js';
import { CameraPlugin } from '../plugins/CameraPlugin.js';
import { NodePlugin } from '../plugins/NodePlugin.js';
import { EdgePlugin } from '../plugins/EdgePlugin.js';
import { LayoutPlugin } from '../plugins/LayoutPlugin.js';
import { UIPlugin } from '../plugins/UIPlugin.js';
import { MinimapPlugin } from '../plugins/MinimapPlugin.js';
import { DataPlugin } from '../plugins/DataPlugin.js';

export class SpaceGraph {
    _cam = null;
    _listeners = new Map();
    plugins = null;
    options = {};

    constructor(containerElement, options = {}) {
        if (!containerElement) throw new Error('SpaceGraph requires a valid HTML container element.');

        this.container = containerElement;
        this.options = options;
        this.plugins = new PluginManager(this);

        const uiOptions = options.ui || {};
        const { contextMenuElement, confirmDialogElement } = uiOptions;

        this.plugins.add(new CameraPlugin(this, this.plugins));
        this.plugins.add(new RenderingPlugin(this, this.plugins));
        this.plugins.add(new NodePlugin(this, this.plugins));
        this.plugins.add(new EdgePlugin(this, this.plugins));
        this.plugins.add(new LayoutPlugin(this, this.plugins));
        this.plugins.add(new UIPlugin(this, this.plugins, contextMenuElement, confirmDialogElement));
        this.plugins.add(new MinimapPlugin(this, this.plugins));
        this.plugins.add(new DataPlugin(this, this.plugins));
    }

    async init() {
        await this.plugins.initPlugins();

        const cameraPlugin = this.plugins.getPlugin('CameraPlugin');
        cameraPlugin?.centerView(null, 0);
        cameraPlugin?.setInitialState();

        this._setupEventListeners();
    }

    on(eventName, callback) {
        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, new Set());
        }
        this._listeners.get(eventName).add(callback);
    }

    off(eventName, callback) {
        this._listeners.get(eventName)?.delete(callback);
    }

    emit(eventName, ...args) {
        this._listeners.get(eventName)?.forEach((callback) => {
            callback(...args);
        });
    }

    _setupEventListeners() {
        this.on('ui:request:addNode', (nodeInstance) => {
            this.plugins.getPlugin('NodePlugin')?.addNode(nodeInstance);
        });

        this.on('ui:request:createNode', (nodeConfig) => {
            this.plugins.getPlugin('NodePlugin')?.createAndAddNode(nodeConfig);
        });

        this.on('node:added', (addedNode) => {
            if (addedNode) {
                setTimeout(() => {
                    this.focusOnNode(addedNode, 0.6, true);
                    this.plugins.getPlugin('UIPlugin')?.setSelectedNode(addedNode);
                    if (addedNode instanceof HtmlNode && addedNode.data.editable) {
                        addedNode.htmlElement?.querySelector('.node-content')?.focus();
                    }
                }, 100);
            }
        });

        this.on('ui:request:removeNode', (nodeId) => {
            this.plugins.getPlugin('NodePlugin')?.removeNode(nodeId);
        });
        this.on('ui:request:addEdge', (sourceNode, targetNode, data) => {
            this.plugins.getPlugin('EdgePlugin')?.addEdge(sourceNode, targetNode, data);
        });

        this.on('edge:added', () => {});

        this.on('ui:request:removeEdge', (edgeId) => {
            this.plugins.getPlugin('EdgePlugin')?.removeEdge(edgeId);
        });

        this.on('ui:request:autoZoomNode', (node) => this.autoZoom(node));
        this.on('ui:request:centerView', () => this.centerView());
        this.on('ui:request:resetView', () => {
            this.plugins.getPlugin('CameraPlugin')?.resetView();
        });
        this.on('ui:request:toggleBackground', (color, alpha) => {
            this.plugins.getPlugin('RenderingPlugin')?.setBackground(color, alpha);
        });

        this.on('ui:request:reverseEdge', (edgeId) => {
            const edgePlugin = this.plugins.getPlugin('EdgePlugin');
            const edge = edgePlugin?.getEdgeById(edgeId);
            if (edge) {
                [edge.source, edge.target] = [edge.target, edge.source];
                edge.update();
                this.plugins.getPlugin('LayoutPlugin')?.kick();
            }
        });
        this.on('ui:request:adjustContentScale', (node, factor) => {
            if (node instanceof HtmlNode) node.adjustContentScale(factor);
        });
        this.on('ui:request:adjustNodeSize', (node, factor) => {
            if (node instanceof HtmlNode) node.adjustNodeSize(factor);
        });
        this.on('ui:request:zoomCamera', (deltaY) => {
            this.plugins.getPlugin('CameraPlugin')?.zoom(deltaY);
        });
        this.on('ui:request:focusOnNode', (node, duration, pushHistory) =>
            this.focusOnNode(node, duration, pushHistory)
        );
        this.on('ui:request:updateEdge', (edgeId, property, value) => {
            const edgePlugin = this.plugins.getPlugin('EdgePlugin');
            const edge = edgePlugin?.getEdgeById(edgeId);
            if (!edge) return;
            switch (property) {
                case 'color':
                    edge.data.color = value;
                    edge.setHighlight(this.plugins.getPlugin('UIPlugin')?.getSelectedEdges().has(edge));
                    break;
                case 'thickness':
                    edge.data.thickness = value;
                    if (edge.line?.material) edge.line.material.linewidth = edge.data.thickness;
                    break;
                case 'constraintType':
                    edge.data.constraintType = value;
                    if (value === 'rigid' && !edge.data.constraintParams?.distance) {
                        edge.data.constraintParams = {
                            distance: edge.source.position.distanceTo(edge.target.position),
                            stiffness: 0.1,
                        };
                    } else if (value === 'weld' && !edge.data.constraintParams?.distance) {
                        edge.data.constraintParams = {
                            distance: edge.source.getBoundingSphereRadius() + edge.target.getBoundingSphereRadius(),
                            stiffness: 0.5,
                        };
                    } else if (value === 'elastic' && !edge.data.constraintParams?.stiffness) {
                        edge.data.constraintParams = { stiffness: 0.001, idealLength: 200 };
                    }
                    this.plugins.getPlugin('LayoutPlugin')?.kick();
                    break;
            }
        });
    }

    addNode(nodeInstance) {
        const nodePlugin = this.plugins.getPlugin('NodePlugin');
        const layoutPlugin = this.plugins.getPlugin('LayoutPlugin');
        const addedNode = nodePlugin?.addNode(nodeInstance);
        if (addedNode && layoutPlugin) layoutPlugin.kick();
        return addedNode;
    }

    addEdge(sourceNode, targetNode, data = {}) {
        const edgePlugin = this.plugins.getPlugin('EdgePlugin');
        const layoutPlugin = this.plugins.getPlugin('LayoutPlugin');
        const addedEdge = edgePlugin?.addEdge(sourceNode, targetNode, data);
        if (addedEdge && layoutPlugin) layoutPlugin.kick();
        return addedEdge;
    }

    createNode(nodeConfig) {
        return this.plugins.getPlugin('NodePlugin')?.createAndAddNode(nodeConfig);
    }

    togglePinNode(nodeId) {
        this.plugins.getPlugin('LayoutPlugin')?.layoutManager?.togglePinNode(nodeId);
    }

    centerView(targetPosition = null, duration = 0.7) {
        this.plugins.getPlugin('CameraPlugin')?.centerView(targetPosition, duration);
    }

    focusOnNode(node, duration = 0.6, pushHistory = false) {
        this.plugins.getPlugin('CameraPlugin')?.focusOnNode(node, duration, pushHistory);
    }

    autoZoom(node) {
        const cameraPlugin = this.plugins.getPlugin('CameraPlugin');
        if (!node || !cameraPlugin) return;

        if (cameraPlugin.getCurrentTargetNodeId() === node.id) {
            cameraPlugin.popState();
            cameraPlugin.setCurrentTargetNodeId(null);
        } else {
            cameraPlugin.pushState();
            cameraPlugin.setCurrentTargetNodeId(node.id);
            cameraPlugin.focusOnNode(node, 0.6, false);
        }
    }

    screenToWorld(screenX, screenY, targetZ = 0) {
        const cameraPlugin = this.plugins.getPlugin('CameraPlugin');
        const camInstance = cameraPlugin?.getCameraInstance();
        if (!camInstance) return null;

        camInstance.updateMatrixWorld();
        const raycaster = new THREE.Raycaster();
        const vec = new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(vec, camInstance);
        const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -targetZ);
        const intersectPoint = new THREE.Vector3();
        return raycaster.ray.intersectPlane(targetPlane, intersectPoint) ?? null;
    }

    getPointerNDC(screenX, screenY) {
        // Convert screen coordinates to normalized device coordinates (NDC)
        // x: -1 to 1 (left to right)
        // y: -1 to 1 (bottom to top)
        return new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
    }

    intersectedObjects(screenX, screenY) {
        const cameraPlugin = this.plugins.getPlugin('CameraPlugin');
        const camInstance = cameraPlugin?.getCameraInstance();
        if (!camInstance) return null;

        camInstance.updateMatrixWorld();
        const vec = new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, camInstance);
        raycaster.params.Line.threshold = 5;

        const nodePlugin = this.plugins.getPlugin('NodePlugin');
        const edgePlugin = this.plugins.getPlugin('EdgePlugin');
        const renderingPlugin = this.plugins.getPlugin('RenderingPlugin');
        const instancedNodeManager = renderingPlugin?.getInstancedMeshManager();
        const instancedEdgeManager = edgePlugin?.instancedEdgeManager;

        // This will store the closest valid intersection found.
        // Structure: { object: THREE.Object3D, node?: Node, edge?: Edge, distance: number, type: string }
        let closestIntersect = null;

        // --- 1. Raycast against Instanced Nodes ---
        if (instancedNodeManager) {
            // Assuming instancedNodeManager.raycast returns an object like { distance, nodeId, object? (optional, actual instance mesh/marker) }
            const instancedNodeHit = instancedNodeManager.raycast(raycaster);
            if (instancedNodeHit) {
                const node = nodePlugin?.getNodeById(instancedNodeHit.nodeId);
                if (node) {
                    // If instancedNodeHit.object is not provided, use node.mesh as a fallback.
                    closestIntersect = { object: instancedNodeHit.object || node.mesh, node, edge: null, distance: instancedNodeHit.distance, type: 'node' };
                }
            }
        }

        // --- 2. Raycast against Non-Instanced Node Meshes ---
        const allNodes = nodePlugin?.getNodes(); // Cache for efficiency if used multiple times.
        if (allNodes) {
            const nonInstancedNodeMeshes = [];
            allNodes.forEach(node => {
                // Filter for nodes that are not instanced, have a mesh, and are visible.
                if (!node.isInstanced && node.mesh && node.mesh.visible) {
                    nonInstancedNodeMeshes.push(node.mesh);
                }
            });

            if (nonInstancedNodeMeshes.length > 0) {
                const nodeIntersects = raycaster.intersectObjects(nonInstancedNodeMeshes, false); // false = non-recursive
                if (nodeIntersects.length > 0) {
                    // If this intersection is closer than any found so far.
                    if (!closestIntersect || nodeIntersects[0].distance < closestIntersect.distance) {
                        const intersectedMesh = nodeIntersects[0].object;
                        // Retrieve the SpaceGraph Node associated with this THREE.Mesh via userData.
                        const node = nodePlugin.getNodeById(intersectedMesh.userData?.nodeId);
                        if (node) {
                            closestIntersect = { object: intersectedMesh, node, edge: null, distance: nodeIntersects[0].distance, type: 'node' };
                        }
                    }
                }
            }
        }

        // --- 3. Raycast against Instanced Edges ---
        if (instancedEdgeManager) {
            // Assuming instancedEdgeManager.raycast returns { distance, edgeId, object? }
            const instancedEdgeHit = instancedEdgeManager.raycast(raycaster);
            if (instancedEdgeHit) {
                // If this intersection is closer than any found so far.
                if (!closestIntersect || instancedEdgeHit.distance < closestIntersect.distance) {
                    const edge = edgePlugin?.getEdgeById(instancedEdgeHit.edgeId);
                    if (edge) {
                        closestIntersect = { object: instancedEdgeHit.object || edge.line, node: null, edge, distance: instancedEdgeHit.distance, type: 'edge' };
                    }
                }
            }
        }

        // --- 4. Raycast against Non-Instanced Edge Lines ---
        const allEdges = edgePlugin?.getEdges();
        if (allEdges) {
            const nonInstancedEdgeLines = [];
            allEdges.forEach(edge => {
                if (!edge.isInstanced && edge.line && edge.line.visible) {
                    nonInstancedEdgeLines.push(edge.line);
                }
            });

            if (nonInstancedEdgeLines.length > 0) {
                const edgeIntersects = raycaster.intersectObjects(nonInstancedEdgeLines, false);
                if (edgeIntersects.length > 0) {
                    if (!closestIntersect || edgeIntersects[0].distance < closestIntersect.distance) {
                        const intersectedLine = edgeIntersects[0].object;
                        const edge = edgePlugin.getEdgeById(intersectedLine.userData?.edgeId);
                        if (edge) {
                            closestIntersect = { object: intersectedLine, node: null, edge, distance: edgeIntersects[0].distance, type: 'edge' };
                        }
                    }
                }
            }
        }

        // --- 5. Raycast against Metaframe Handles ---
        // Metaframe handles (spheres/planes for resize/drag) are added directly to the scene.
        // They need to be included in the intersection test.
        // `userData.ownerNode` is assumed to be set on these handles by `Metaframe.js`.
        if (allNodes) { // Re-use `allNodes` from above.
            const metaframeHandles = [];
            allNodes.forEach(node => {
                if (node.metaframe && node.metaframe.isVisible) {
                    Object.values(node.metaframe.resizeHandles).forEach(handle => metaframeHandles.push(handle));
                    if (node.metaframe.dragHandle) {
                        metaframeHandles.push(node.metaframe.dragHandle);
                    }
                }
            });

            if (metaframeHandles.length > 0) {
                const handleIntersects = raycaster.intersectObjects(metaframeHandles, false);
                if (handleIntersects.length > 0) {
                    if (!closestIntersect || handleIntersects[0].distance < closestIntersect.distance) {
                        const intersectedHandleObject = handleIntersects[0].object;
                        const ownerNode = intersectedHandleObject.userData?.ownerNode;
                        if (ownerNode) {
                            // If a handle is hit, it's the primary 'object'.
                            // The 'node' field in the result is set to the handle's owner.
                            // UIManager._getTargetInfo will use object.name to determine it's a handle.
                            closestIntersect = {
                                object: intersectedHandleObject,
                                node: ownerNode, // The node owning the handle.
                                edge: null,      // Not an edge.
                                distance: handleIntersects[0].distance,
                                type: 'metaframe_handle' // Explicit type for this category.
                            };
                        }
                    }
                }
            }
        }

        // --- Return Structure ---
        // Consistently return the underlying THREE.Object3D, associated graph node/edge, and distance.
        // This allows UIManager to inspect object.name for handles or use node/edge directly.
        if (closestIntersect) {
            return {
                object: closestIntersect.object,
                node: closestIntersect.node,
                edge: closestIntersect.edge,
                distance: closestIntersect.distance,
                // type: closestIntersect.type // Optional: could be useful for UIManager if it needs explicit types.
            };
        }
        return null; // No intersection found.
    }

    animate() {
        const frame = () => {
            this.plugins.updatePlugins();
            requestAnimationFrame(frame);
        };
        frame();
    }

    dispose() {
        this.plugins.disposePlugins();
        this._listeners.clear();
    }

    exportGraphToJSON(options) {
        return this.plugins.getPlugin('DataPlugin')?.exportGraphToJSON(options) || null;
    }

    async importGraphFromJSON(jsonData, options) {
        return (await this.plugins.getPlugin('DataPlugin')?.importGraphFromJSON(jsonData, options)) || false;
    }
}
