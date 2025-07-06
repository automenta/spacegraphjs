import * as THREE from 'three';
import {HtmlNode} from '../graph/nodes/HtmlNode.js';
import {PluginManager} from './PluginManager.js';
import {RenderingPlugin} from '../plugins/RenderingPlugin.js';
import {CameraPlugin} from '../plugins/CameraPlugin.js';
import {NodePlugin} from '../plugins/NodePlugin.js';
import {EdgePlugin} from '../plugins/EdgePlugin.js';
import {LayoutPlugin} from '../plugins/LayoutPlugin.js';
import {UIPlugin} from '../plugins/UIPlugin.js';
import {MinimapPlugin} from '../plugins/MinimapPlugin.js';
import {DataPlugin} from '../plugins/DataPlugin.js';
import {FractalZoomPlugin} from '../plugins/FractalZoomPlugin.js';
import {PerformancePlugin} from '../plugins/PerformancePlugin.js';

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
        this.plugins.add(new FractalZoomPlugin(this, this.plugins));
        this.plugins.add(new PerformancePlugin(this, this.plugins));
    }

    async init() {
        await this.plugins.initPlugins();

        const cameraPlugin = this.plugins.getPlugin('CameraPlugin');
        cameraPlugin?.centerView(null, 0);
        cameraPlugin?.setInitialState();

        this._setupEventListeners();
        this._setupCameraMouseControls(); // Add this line
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

        this.on('node:added', (addedNodeId, addedNodeInstance) => {
            if (addedNodeInstance) {
                setTimeout(() => {
                    this.focusOnNode(addedNodeInstance, 0.6, true);
                    this.plugins.getPlugin('UIPlugin')?.setSelectedNode(addedNodeInstance);
                    if (addedNodeInstance instanceof HtmlNode && addedNodeInstance.data.editable) {
                        addedNodeInstance.htmlElement?.querySelector('.node-content')?.focus();
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

        let closestIntersect = null;

        if (instancedNodeManager) {
            const instancedNodeIntersection = instancedNodeManager.raycast(raycaster);
            if (instancedNodeIntersection) {
                const node = nodePlugin?.getNodeById(instancedNodeIntersection.nodeId);
                if (node) {
                    closestIntersect = { node, distance: instancedNodeIntersection.distance, type: 'node' };
                }
            }
        }

        const currentNodes = nodePlugin?.getNodes();
        if (currentNodes) {
            const nonInstancedNodeMeshes = [...currentNodes.values()]
                .filter((n) => !n.isInstanced && n.mesh && n.mesh.visible)
                .map((n) => n.mesh);

            if (nonInstancedNodeMeshes.length > 0) {
                const nodeIntersects = raycaster.intersectObjects(nonInstancedNodeMeshes, false);
                if (nodeIntersects.length > 0) {
                    if (!closestIntersect || nodeIntersects[0].distance < closestIntersect.distance) {
                        const intersectedMesh = nodeIntersects[0].object;
                        const node = nodePlugin.getNodeById(intersectedMesh.userData?.nodeId);
                        if (node) {
                            closestIntersect = { node, distance: nodeIntersects[0].distance, type: 'node' };
                        }
                    }
                }
            }
        }

        if (instancedEdgeManager) {
            const instancedEdgeIntersection = instancedEdgeManager.raycast(raycaster);
            if (instancedEdgeIntersection) {
                if (!closestIntersect || instancedEdgeIntersection.distance < closestIntersect.distance) {
                    const edge = edgePlugin?.getEdgeById(instancedEdgeIntersection.edgeId);
                    if (edge) {
                        closestIntersect = { edge, distance: instancedEdgeIntersection.distance, type: 'edge' };
                    }
                }
            }
        }

        const currentEdges = edgePlugin?.getEdges();
        if (currentEdges) {
            const nonInstancedEdgeLines = [...currentEdges.values()]
                .filter((e) => !e.isInstanced && e.line && e.line.visible)
                .map((e) => e.line);

            if (nonInstancedEdgeLines.length > 0) {
                const edgeIntersects = raycaster.intersectObjects(nonInstancedEdgeLines, false);
                if (edgeIntersects.length > 0) {
                    if (!closestIntersect || edgeIntersects[0].distance < closestIntersect.distance) {
                        const intersectedLine = edgeIntersects[0].object;
                        const edge = edgePlugin.getEdgeById(intersectedLine.userData?.edgeId);
                        if (edge) {
                            closestIntersect = { edge, distance: edgeIntersects[0].distance, type: 'edge' };
                        }
                    }
                }
            }
        }

        return closestIntersect?.type === 'node'
            ? { node: closestIntersect.node, distance: closestIntersect.distance }
            : closestIntersect?.type === 'edge'
            ? { edge: closestIntersect.edge, distance: closestIntersect.distance }
            : null;
    }

    animate() {
        const frame = () => {
            this.plugins.updatePlugins();
            requestAnimationFrame(frame);
        };
        frame();
    }

    get layoutManager() {
        return this.plugins.getPlugin('LayoutPlugin')?.layoutManager;
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

    _setupCameraMouseControls() {
        const cameraPlugin = this.plugins.getPlugin('CameraPlugin');
        if (!cameraPlugin || !this.container) return;

        const cameraControls = cameraPlugin.getControls(); // This is the instance of Camera.js

        let lastMouseX = 0;
        let lastMouseY = 0;
        let isDragging = false; // General dragging state for any button

        // Prevent default context menu
        this.container.addEventListener('contextmenu', (event) => {
            if (cameraControls.cameraMode === 'drag_orbit' && cameraControls.isOrbitDragging) {
                event.preventDefault();
            }
            // Allow context menu in other modes or if not orbit dragging
        });

        this.container.addEventListener('mousedown', (event) => {
            if (!cameraControls) return;
            isDragging = true;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;

            if (cameraControls.cameraMode === 'drag_orbit') {
                if (event.button === 0) { // Left mouse button
                    cameraControls.startPan(event.clientX, event.clientY);
                } else if (event.button === 1 || event.button === 2) { // Middle or Right mouse button
                    event.preventDefault(); // Prevent default middle-click (scroll) or right-click (context menu)
                    cameraControls.startOrbitDrag(event.clientX, event.clientY);
                }
            } else if (cameraControls.cameraMode === 'orbit' || cameraControls.cameraMode === 'top_down') {
                 if (event.button === 0) { // Left mouse button for orbit/top_down pan
                    cameraControls.startPan(event.clientX, event.clientY);
                }
            }
            // Other modes might have their own specific handling (e.g., Free, First Person via PointerLock)
        });

        this.container.addEventListener('mousemove', (event) => {
            if (!isDragging || !cameraControls) return;

            const deltaX = event.clientX - lastMouseX;
            const deltaY = event.clientY - lastMouseY;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;

            if (cameraControls.isPanning) {
                cameraControls.pan(deltaX, deltaY);
            } else if (cameraControls.isOrbitDragging) {
                cameraControls.orbitDrag(deltaX, deltaY);
            }
        });

        const handleMouseUp = () => {
            if (!isDragging || !cameraControls) return;

            if (cameraControls.isPanning) {
                cameraControls.endPan();
            }
            if (cameraControls.isOrbitDragging) {
                cameraControls.endOrbitDrag();
            }
            isDragging = false;
        };

        this.container.addEventListener('mouseup', handleMouseUp);
        this.container.addEventListener('mouseleave', () => { // Handle case where mouse leaves container while dragging
            if (isDragging) {
                handleMouseUp();
            }
        });

        // Wheel events for zoom (already handled by UIPlugin via 'ui:request:zoomCamera', but good to be aware)
        // Consider if wheel events should also be centralized here if not for the existing event.
        this.container.addEventListener('wheel', (event) => {
            if (!cameraControls) return;
            // Let Camera.js handle zoom logic, including min/max zoom distance
            // Positive deltaY means scrolling down (zoom out), negative means scrolling up (zoom in)
            // The existing zoom implementation in Camera.js seems to handle the direction correctly.
            // cameraControls.zoom(event.deltaY); // This would bypass the UIPlugin event
            this.emit('ui:request:zoomCamera', event.deltaY); // Continue using the existing event
            event.preventDefault(); // Prevent page scroll
        }, { passive: false }); // Allow preventDefault
    }
}
