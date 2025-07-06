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
    _listeners = new Map();
    plugins = null;
    options = {};

    // Properties for camera mouse controls
    _isDragging = false;
    _lastMouseX = 0;
    _lastMouseY = 0;

    // Bound event handlers for camera mouse controls
    _boundHandleContextMenuEvent = null;
    _boundHandleMouseDownEvent = null;
    _boundHandleMouseMoveEvent = null;
    _boundHandleMouseUpOrLeaveEvent = null;
    _boundHandleWheelEvent = null;

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

        // Cache frequently used plugins
        this._cameraPlugin = this.plugins.getPlugin('CameraPlugin');
        this._nodePlugin = this.plugins.getPlugin('NodePlugin');
        this._edgePlugin = this.plugins.getPlugin('EdgePlugin');
        this._layoutPlugin = this.plugins.getPlugin('LayoutPlugin');
        this._uiPlugin = this.plugins.getPlugin('UIPlugin');
        this._renderingPlugin = this.plugins.getPlugin('RenderingPlugin');
        this._dataPlugin = this.plugins.getPlugin('DataPlugin'); // Cache DataPlugin

        this._cameraPlugin?.centerView(null, 0);
        this._cameraPlugin?.setInitialState();

        // Initialize bound event handlers
        this._boundHandleContextMenuEvent = this._handleContextMenuEvent.bind(this);
        this._boundHandleMouseDownEvent = this._handleMouseDownEvent.bind(this);
        this._boundHandleMouseMoveEvent = this._handleMouseMoveEvent.bind(this);
        this._boundHandleMouseUpOrLeaveEvent = this._handleMouseUpOrLeaveEvent.bind(this);
        this._boundHandleWheelEvent = this._handleWheelEvent.bind(this);

        this._setupAllEventListeners();
        this._setupCameraMouseControls();
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

    /** Sets up all event listeners by delegating to more specific methods. */
    _setupAllEventListeners() {
        this._setupNodeEventListeners();
        this._setupEdgeEventListeners();
        this._setupUIEventListeners();
        this._setupCameraEventListeners();
        // this._setupOtherEventListeners(); // Retained if other event types are added later
    }

    /** Sets up event listeners related to node operations. */
    _setupNodeEventListeners() {
        this.on('ui:request:addNode', (nodeInstance) => this._nodePlugin?.addNode(nodeInstance));
        this.on('ui:request:createNode', (nodeConfig) => this._nodePlugin?.createAndAddNode(nodeConfig));
        this.on('node:added', this._handleNodeAdded.bind(this));
        this.on('ui:request:removeNode', (nodeId) => this._nodePlugin?.removeNode(nodeId));
        this.on('ui:request:adjustContentScale', this._handleAdjustContentScale.bind(this));
        this.on('ui:request:adjustNodeSize', this._handleAdjustNodeSize.bind(this));
    }

    /** Handles actions to take after a node has been added. */
    _handleNodeAdded(addedNodeId, addedNodeInstance) {
        if (!addedNodeInstance) return;
        // Delay focusing and selecting to allow the graph to settle.
        setTimeout(() => {
            this.focusOnNode(addedNodeInstance, 0.6, true);
            this._uiPlugin?.setSelectedNode(addedNodeInstance);
            if (addedNodeInstance instanceof HtmlNode && addedNodeInstance.data.editable) {
                addedNodeInstance.htmlElement?.querySelector('.node-content')?.focus();
            }
        }, 100);
    }

    /** Handles requests to adjust content scale for HTML nodes. */
    _handleAdjustContentScale(node, factor) {
        if (node instanceof HtmlNode) {
            node.adjustContentScale(factor);
        }
    }

    /** Handles requests to adjust node size for HTML nodes. */
    _handleAdjustNodeSize(node, factor) {
        if (node instanceof HtmlNode) {
            node.adjustNodeSize(factor);
        }
    }

    /** Sets up event listeners related to edge operations. */
    _setupEdgeEventListeners() {
        this.on('ui:request:addEdge', (sourceNode, targetNode, data) => this._edgePlugin?.addEdge(sourceNode, targetNode, data));
        // 'edge:added' listener can be used for logging or other side effects if needed.
        this.on('edge:added', () => { /* console.log('Edge added event received'); */ });
        this.on('ui:request:removeEdge', (edgeId) => this._edgePlugin?.removeEdge(edgeId));
        this.on('ui:request:reverseEdge', this._handleReverseEdge.bind(this));
        this.on('ui:request:updateEdge', this._handleUpdateEdge.bind(this));
    }

    /** Handles requests to reverse an edge. */
    _handleReverseEdge(edgeId) {
        const edge = this._edgePlugin?.getEdgeById(edgeId);
        if (!edge) return;

        [edge.source, edge.target] = [edge.target, edge.source];
        edge.update();
        this._layoutPlugin?.kick();
    }

    /** Handles requests to update specific properties of an edge. */
    _handleUpdateEdge(edgeId, property, value) {
        const edge = this._edgePlugin?.getEdgeById(edgeId);
        if (!edge) return;

        switch (property) {
            case 'color':
                edge.data.color = value;
                edge.setHighlight(this._uiPlugin?.getSelectedEdges().has(edge));
                break;
            case 'thickness':
                edge.data.thickness = value;
                if (edge.line?.material) edge.line.material.linewidth = edge.data.thickness;
                break;
            case 'constraintType':
                this._updateEdgeConstraint(edge, value);
                this._layoutPlugin?.kick();
                break;
            default:
                // console.warn(`SpaceGraph: Unknown property "${property}" for edge update.`);
                break;
        }
    }

    /** Updates the constraint parameters for an edge based on its type. */
    _updateEdgeConstraint(edge, constraintType) {
        edge.data.constraintType = constraintType;
        const params = edge.data.constraintParams || {};

        switch (constraintType) {
            case 'rigid':
                if (!params.distance) {
                    params.distance = edge.source.position.distanceTo(edge.target.position);
                }
                params.stiffness = params.stiffness ?? 0.1;
                break;
            case 'weld':
                if (!params.distance) {
                    params.distance = edge.source.getBoundingSphereRadius() + edge.target.getBoundingSphereRadius();
                }
                params.stiffness = params.stiffness ?? 0.5;
                break;
            case 'elastic':
                params.stiffness = params.stiffness ?? 0.001;
                params.idealLength = params.idealLength ?? 200;
                break;
        }
        edge.data.constraintParams = params;
    }


    /** Sets up event listeners related to UI elements like background. */
    _setupUIEventListeners() {
        this.on('ui:request:toggleBackground', (color, alpha) => this._renderingPlugin?.setBackground(color, alpha));
    }

    /** Sets up event listeners related to camera controls and view manipulation. */
    _setupCameraEventListeners() {
        this.on('ui:request:autoZoomNode', (node) => this.autoZoom(node));
        this.on('ui:request:centerView', () => this.centerView());
        this.on('ui:request:resetView', () => this._cameraPlugin?.resetView());
        this.on('ui:request:zoomCamera', (deltaY) => this._cameraPlugin?.zoom(deltaY));
        this.on('ui:request:focusOnNode', (node, duration, pushHistory) => this.focusOnNode(node, duration, pushHistory));
    }

    // _setupOtherEventListeners() {
    //     // Placeholder for any other event listeners that don't fit specific categories
    // }

    addNode(nodeInstance) {
        const addedNode = this._nodePlugin?.addNode(nodeInstance);
        if (addedNode && this._layoutPlugin) this._layoutPlugin.kick();
        return addedNode;
    }

    addEdge(sourceNode, targetNode, data = {}) {
        const addedEdge = this._edgePlugin?.addEdge(sourceNode, targetNode, data);
        if (addedEdge && this._layoutPlugin) this._layoutPlugin.kick();
        return addedEdge;
    }

    createNode(nodeConfig) {
        return this._nodePlugin?.createAndAddNode(nodeConfig);
    }

    togglePinNode(nodeId) {
        this._layoutPlugin?.layoutManager?.togglePinNode(nodeId);
    }

    centerView(targetPosition = null, duration = 0.7) {
        this._cameraPlugin?.centerView(targetPosition, duration);
    }

    focusOnNode(node, duration = 0.6, pushHistory = false) {
        this._cameraPlugin?.focusOnNode(node, duration, pushHistory);
    }

    autoZoom(node) {
        if (!node || !this._cameraPlugin) return;

        if (this._cameraPlugin.getCurrentTargetNodeId() === node.id) {
            this._cameraPlugin.popState();
            this._cameraPlugin.setCurrentTargetNodeId(null);
        } else {
            this._cameraPlugin.pushState();
            this._cameraPlugin.setCurrentTargetNodeId(node.id);
            this._cameraPlugin.focusOnNode(node, 0.6, false);
        }
    }

    screenToWorld(screenX, screenY, targetZ = 0) {
        const camInstance = this._cameraPlugin?.getCameraInstance();
        if (!camInstance) return null;

        camInstance.updateMatrixWorld();
        const raycaster = new THREE.Raycaster();
        const vec = new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(vec, camInstance);
        const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -targetZ);
        const intersectPoint = new THREE.Vector3();
        return raycaster.ray.intersectPlane(targetPlane, intersectPoint) ?? null;
    }

    _intersectInstancedNodes(raycaster) {
        const instancedNodeManager = this._renderingPlugin?.getInstancedMeshManager();
        if (!instancedNodeManager) return null;

        const intersection = instancedNodeManager.raycast(raycaster);
        if (intersection) {
            const node = this._nodePlugin?.getNodeById(intersection.nodeId);
            if (node) {
                return { node, distance: intersection.distance, type: 'node' };
            }
        }
        return null;
    }

    _intersectNonInstancedNodes(raycaster, currentClosest) {
        const currentNodes = this._nodePlugin?.getNodes();
        if (!currentNodes) return currentClosest;

        const nonInstancedNodeMeshes = [...currentNodes.values()]
            .filter((n) => !n.isInstanced && n.mesh && n.mesh.visible)
            .map((n) => n.mesh);

        if (nonInstancedNodeMeshes.length > 0) {
            const intersects = raycaster.intersectObjects(nonInstancedNodeMeshes, false);
            if (intersects.length > 0 && (!currentClosest || intersects[0].distance < currentClosest.distance)) {
                const intersectedMesh = intersects[0].object;
                const node = this._nodePlugin.getNodeById(intersectedMesh.userData?.nodeId);
                if (node) {
                    return { node, distance: intersects[0].distance, type: 'node' };
                }
            }
        }
        return currentClosest;
    }

    _intersectInstancedEdges(raycaster, currentClosest) {
        const instancedEdgeManager = this._edgePlugin?.instancedEdgeManager;
        if (!instancedEdgeManager) return currentClosest;

        const intersection = instancedEdgeManager.raycast(raycaster);
        if (intersection && (!currentClosest || intersection.distance < currentClosest.distance)) {
            const edge = this._edgePlugin?.getEdgeById(intersection.edgeId);
            if (edge) {
                return { edge, distance: intersection.distance, type: 'edge' };
            }
        }
        return currentClosest;
    }

    _intersectNonInstancedEdges(raycaster, currentClosest) {
        const currentEdges = this._edgePlugin?.getEdges();
        if (!currentEdges) return currentClosest;

        const nonInstancedEdgeLines = [...currentEdges.values()]
            .filter((e) => !e.isInstanced && e.line && e.line.visible)
            .map((e) => e.line);

        if (nonInstancedEdgeLines.length > 0) {
            const intersects = raycaster.intersectObjects(nonInstancedEdgeLines, false);
            if (intersects.length > 0 && (!currentClosest || intersects[0].distance < currentClosest.distance)) {
                const intersectedLine = intersects[0].object;
                const edge = this._edgePlugin.getEdgeById(intersectedLine.userData?.edgeId);
                if (edge) {
                    return { edge, distance: intersects[0].distance, type: 'edge' };
                }
            }
        }
        return currentClosest;
    }

    intersectedObjects(screenX, screenY) {
        const camInstance = this._cameraPlugin?.getCameraInstance();
        if (!camInstance) return null;

        camInstance.updateMatrixWorld();
        const vec = new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, camInstance);
        raycaster.params.Line.threshold = 5;

        let closestIntersect = null;

        // Check instanced nodes
        closestIntersect = this._intersectInstancedNodes(raycaster);

        // Check non-instanced nodes
        closestIntersect = this._intersectNonInstancedNodes(raycaster, closestIntersect);

        // Check instanced edges
        closestIntersect = this._intersectInstancedEdges(raycaster, closestIntersect);

        // Check non-instanced edges
        closestIntersect = this._intersectNonInstancedEdges(raycaster, closestIntersect);

        if (!closestIntersect) return null;

        return closestIntersect.type === 'node'
            ? { node: closestIntersect.node, distance: closestIntersect.distance }
            : { edge: closestIntersect.edge, distance: closestIntersect.distance };
    }

    animate() {
        const frame = () => {
            this.plugins.updatePlugins();
            requestAnimationFrame(frame);
        };
        frame();
    }

    get layoutManager() {
        return this._layoutPlugin?.layoutManager;
    }

    dispose() {
        this.plugins.disposePlugins();
        this._listeners.clear();
        // Consider removing event listeners from this.container if they were added directly
        // For example, if _setupCameraMouseControls adds listeners, they should be removed here.
        this._removeCameraMouseControls(); // Call a new method to remove listeners
    }

    exportGraphToJSON(options) {
        return this._dataPlugin?.exportGraphToJSON(options) || null;
    }

    async importGraphFromJSON(jsonData, options) {
        return (await this._dataPlugin?.importGraphFromJSON(jsonData, options)) || false;
    }

    _setupCameraMouseControls() {
        if (!this._cameraPlugin || !this.container) return;

        const cameraControls = this._cameraPlugin.getControls(); // This is the instance of Camera.js

        // Prevent default context menu - this one is simple enough to keep inline or bind if it grew
        // For consistency with the pattern for others, and if it might grow, binding is safer.
        // However, the original code had it as an inline arrow function directly accessing cameraControls.
        // Let's ensure all event listeners are handled via the bound properties.
        // The original contextmenu handler was:
        // this.container.addEventListener('contextmenu', (event) => {
        //     if (cameraControls.cameraMode === 'drag_orbit' && cameraControls.isOrbitDragging) {
        //         event.preventDefault();
        //     }
        // });
        // This will be replaced by using this._boundHandleContextMenuEvent

        this.container.addEventListener('contextmenu', this._boundHandleContextMenuEvent);
        this.container.addEventListener('mousedown', this._boundHandleMouseDownEvent);
        this.container.addEventListener('mousemove', this._boundHandleMouseMoveEvent);
        this.container.addEventListener('mouseup', this._boundHandleMouseUpOrLeaveEvent);
        this.container.addEventListener('mouseleave', this._boundHandleMouseUpOrLeaveEvent); // Correct: mouseup and mouseleave can share handler logic
        this.container.addEventListener('wheel', this._boundHandleWheelEvent, { passive: false });
    }

    /** Handles the contextmenu event on the container. */
    _handleContextMenuEvent(event) {
        const cameraControls = this._cameraPlugin?.getControls();
        if (cameraControls?.cameraMode === 'drag_orbit' && cameraControls?.isOrbitDragging) {
            event.preventDefault();
        }
    }

    _handleMouseDownEvent(event) {
        const cameraControls = this._cameraPlugin?.getControls();
        if (!cameraControls) return;

        this._isDragging = true;
        this._lastMouseX = event.clientX;
        this._lastMouseY = event.clientY;

        if (cameraControls.cameraMode === 'drag_orbit') {
            if (event.button === 0) { // Left mouse button
                cameraControls.startPan(event.clientX, event.clientY);
            } else if (event.button === 1 || event.button === 2) { // Middle or Right mouse button
                event.preventDefault();
                cameraControls.startOrbitDrag(event.clientX, event.clientY);
            }
        } else if (cameraControls.cameraMode === 'orbit' || cameraControls.cameraMode === 'top_down') {
            if (event.button === 0) { // Left mouse button for orbit/top_down pan
                cameraControls.startPan(event.clientX, event.clientY);
            }
        }
    }

    _handleMouseMoveEvent(event) {
        if (!this._isDragging) return;
        const cameraControls = this._cameraPlugin?.getControls();
        if (!cameraControls) return;

        const deltaX = event.clientX - this._lastMouseX;
        const deltaY = event.clientY - this._lastMouseY;
        this._lastMouseX = event.clientX;
        this._lastMouseY = event.clientY;

        if (cameraControls.isPanning) {
            cameraControls.pan(deltaX, deltaY);
        } else if (cameraControls.isOrbitDragging) {
            cameraControls.orbitDrag(deltaX, deltaY);
        }
    }

    _handleMouseUpOrLeaveEvent() {
        if (!this._isDragging) return;
        const cameraControls = this._cameraPlugin?.getControls();
        if (!cameraControls) return;

        if (cameraControls.isPanning) {
            cameraControls.endPan();
        }
        if (cameraControls.isOrbitDragging) {
            cameraControls.endOrbitDrag();
        }
        this._isDragging = false;
    }

    _handleWheelEvent(event) {
        const cameraControls = this._cameraPlugin?.getControls();
        if (!cameraControls) return;
        this.emit('ui:request:zoomCamera', event.deltaY);
        event.preventDefault();
    }

    _removeCameraMouseControls() {
        if (!this.container) return;
        this.container.removeEventListener('contextmenu', this._boundHandleContextMenuEvent);
        this.container.removeEventListener('mousedown', this._boundHandleMouseDownEvent);
        this.container.removeEventListener('mousemove', this._boundHandleMouseMoveEvent);
        this.container.removeEventListener('mouseup', this._boundHandleMouseUpOrLeaveEvent);
        this.container.removeEventListener('mouseleave', this._boundHandleMouseUpOrLeaveEvent);
        this.container.removeEventListener('wheel', this._boundHandleWheelEvent);
    }
}
