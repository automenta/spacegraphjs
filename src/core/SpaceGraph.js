import * as THREE from 'three';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { Utils, $ } from '../utils.js';
// import { Camera } from '../camera/Camera.js'; // Used by CameraPlugin
import { UIManager } from '../ui/UIManager.js'; // Will be managed by UIPlugin
// import { ForceLayout } from '../layout/ForceLayout.js'; // Used by LayoutPlugin
import { Edge } from '../graph/Edge.js'; // Used by EdgePlugin & Edge class itself
import { HtmlNode } from '../graph/nodes/HtmlNode.js'; // Example node type
import { PluginManager } from './PluginManager.js';
import { RenderingPlugin } from '../plugins/RenderingPlugin.js';
import { CameraPlugin } from '../plugins/CameraPlugin.js';
import { NodePlugin } from '../plugins/NodePlugin.js';
import { EdgePlugin } from '../plugins/EdgePlugin.js';
import { LayoutPlugin } from '../plugins/LayoutPlugin.js';
import { UIPlugin } from '../plugins/UIPlugin.js';

export class SpaceGraph {
    // nodes = new Map(); // Moved to NodePlugin
    // edges = new Map(); // Moved to EdgePlugin
    nodeSelected = null; // Selection model will eventually be a plugin or part of UI/Interaction plugin
    edgeSelected = null; // Selection model will eventually be a plugin or part of UI/Interaction plugin
    isLinking = false;
    linkSourceNode = null;
    tempLinkLine = null;
    // ui = null; // Moved to UIPlugin
    _cam = null; // This THREE.PerspectiveCamera is now created and managed by CameraPlugin.
                 // It's also set on this.space._cam by CameraPlugin for now.
    // layout = null; // Moved to LayoutPlugin

    // Properties like scene, cssScene, renderGL, camera instance (THREE.PerspectiveCamera),
    // CameraControls instance, and Layout instance are now managed by their respective plugins.

    _listeners = new Map(); // Event bus listeners
    pluginManager = null;

    constructor(containerElement) {
        if (!containerElement) throw new Error("SpaceGraph requires a valid HTML container element.");
        this.container = containerElement;
        this.pluginManager = new PluginManager(this);

        // Register RenderingPlugin
        this.pluginManager.registerPlugin(new RenderingPlugin(this, this.pluginManager));
        // Register CameraPlugin
        this.pluginManager.registerPlugin(new CameraPlugin(this, this.pluginManager));
        // Register NodePlugin
        this.pluginManager.registerPlugin(new NodePlugin(this, this.pluginManager));
        // Register EdgePlugin
        this.pluginManager.registerPlugin(new EdgePlugin(this, this.pluginManager));
        // Register LayoutPlugin
        this.pluginManager.registerPlugin(new LayoutPlugin(this, this.pluginManager));
        // Register UIPlugin
        this.pluginManager.registerPlugin(new UIPlugin(this, this.pluginManager));

        // _cam is now created by CameraPlugin and assigned to this.space._cam in CameraPlugin.init() for now.
        // Direct instantiation of THREE.PerspectiveCamera, CameraControls, Layout, and UIManager is removed from here.

        // Initialize all registered plugins.
        // RenderingPlugin's init() sets up scenes, renderers, lighting.
        // CameraPlugin's init() creates the camera, controls, and does initial centering/state set.
        this.pluginManager.initPlugins();

        // Initial camera setup (centerView, setInitialState) is now handled within CameraPlugin.init()

        this._setupEventListeners(); // Setup internal event listeners for UI requests
    }

    // --- Event Bus Methods ---
    on(eventName, callback) {
        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, new Set());
        }
        this._listeners.get(eventName).add(callback);
    }

    off(eventName, callback) {
        if (this._listeners.has(eventName)) {
            this._listeners.get(eventName).delete(callback);
        }
    }

    emit(eventName, ...args) {
        if (this._listeners.has(eventName)) {
            this._listeners.get(eventName).forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event listener for "${eventName}":`, error);
                }
            });
        }
    }

    // --- Internal Event Listeners for UI Requests ---
    _setupEventListeners() {
        this.on('ui:request:addNode', (nodeInstance) => {
            const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
            const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
            const addedNode = nodePlugin?.addNode(nodeInstance); // NodePlugin calls LayoutPlugin.addNodeToLayout
            if (addedNode) {
                layoutPlugin?.kick();
                setTimeout(() => { // Allow node to be added to scene before focusing
                    this.focusOnNode(addedNode, 0.6, true); // focusOnNode uses CameraPlugin
                    this.setSelectedNode(addedNode); // setSelectedNode is still on SpaceGraph (selection model TBD)
                    if (addedNode instanceof HtmlNode && addedNode.data.editable) {
                        addedNode.htmlElement?.querySelector('.node-content')?.focus();
                    }
                }, 100);
            }
        });
        this.on('ui:request:removeNode', (nodeId) => {
            this.pluginManager.getPlugin('NodePlugin')?.removeNode(nodeId); // NodePlugin's removeNode will call EdgePlugin
        });
        this.on('ui:request:addEdge', (sourceNode, targetNode, data) => {
            const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
            const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
            edgePlugin?.addEdge(sourceNode, targetNode, data); // EdgePlugin calls LayoutPlugin.addEdgeToLayout
            layoutPlugin?.kick();
        });
        this.on('ui:request:removeEdge', (edgeId) => {
            // EdgePlugin.removeEdge calls LayoutPlugin.removeEdgeFromLayout
            this.pluginManager.getPlugin('EdgePlugin')?.removeEdge(edgeId);
        });
        this.on('ui:request:setSelectedNode', (node) => this.setSelectedNode(node)); // Selection model TBD
        this.on('ui:request:setSelectedEdge', (edge) => this.setSelectedEdge(edge)); // Selection model TBD
        this.on('ui:request:autoZoomNode', (node) => this.autoZoom(node)); // Uses methods now on CameraPlugin
        this.on('ui:request:centerView', () => this.centerView()); // Uses methods now on CameraPlugin
        this.on('ui:request:resetView', () => {
            this.pluginManager.getPlugin('CameraPlugin')?.resetView();
        });
        this.on('ui:request:toggleBackground', (color, alpha) => {
            const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
            renderingPlugin?.setBackground(color, alpha);
        });
        this.on('ui:request:startLinking', (sourceNode) => this._startLinking(sourceNode));
        this.on('ui:request:cancelLinking', () => this._cancelLinking());
        this.on('ui:request:completeLinking', (screenX, screenY) => this._completeLinking(screenX, screenY)); // Uses addEdge
        this.on('ui:request:reverseEdge', (edgeId) => {
            const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
            const edge = edgePlugin?.getEdgeById(edgeId);
            if (edge) {
                [edge.source, edge.target] = [edge.target, edge.source];
                edge.update(); // Edge internal update
                this.pluginManager.getPlugin('LayoutPlugin')?.kick();
            }
        });
        this.on('ui:request:adjustContentScale', (node, factor) => {
            if (node instanceof HtmlNode) node.adjustContentScale(factor);
        });
        this.on('ui:request:adjustNodeSize', (node, factor) => {
            if (node instanceof HtmlNode) node.adjustNodeSize(factor);
        });
        this.on('ui:request:zoomCamera', (deltaY) => {
            this.pluginManager.getPlugin('CameraPlugin')?.zoom(deltaY);
        });
        this.on('ui:request:focusOnNode', (node, duration, pushHistory) => this.focusOnNode(node, duration, pushHistory)); // Uses methods now on CameraPlugin
        this.on('ui:request:updateEdge', (edgeId, property, value) => {
            const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
            const edge = edgePlugin?.getEdgeById(edgeId);
            if (!edge) return;
            switch (property) {
                case 'color':
                    edge.data.color = value;
                    // setHighlight might need to be a method on Edge or EdgePlugin
                    edge.setHighlight(this.edgeSelected === edge);
                    break;
                case 'thickness':
                    edge.data.thickness = value;
                    if (edge.line?.material) edge.line.material.linewidth = edge.data.thickness; // Direct material access
                    break;
                case 'constraintType': // This implies interaction with a layout system
                    edge.data.constraintType = value;
                    // Default params logic...
                    if (value === 'rigid' && !edge.data.constraintParams?.distance) {
                        edge.data.constraintParams = {
                            distance: edge.source.position.distanceTo(edge.target.position),
                            stiffness: 0.1
                        };
                    } else if (value === 'weld' && !edge.data.constraintParams?.distance) {
                        edge.data.constraintParams = {
                            distance: edge.source.getBoundingSphereRadius() + edge.target.getBoundingSphereRadius(),
                            stiffness: 0.5
                        };
                    } else if (value === 'elastic' && !edge.data.constraintParams?.stiffness) {
                        edge.data.constraintParams = {stiffness: 0.001, idealLength: 200};
                    }
                    this.pluginManager.getPlugin('LayoutPlugin')?.kick();
                    break;
            }
        });
    }

    // _setupRenderers, _setupLighting, setBackground, render, _onWindowResize are now in RenderingPlugin.
    // addNode, removeNode, getNodeById are now in NodePlugin.
    // addEdge, removeEdge, getEdgeById are now in EdgePlugin.

    // getNodeById is removed, use NodePlugin.getNodeById(id) via pluginManager
    // getEdgeById is removed, use EdgePlugin.getEdgeById(id) via pluginManager

    updateNodesAndEdges() {
        // Node, Edge, and UI updates (like updateEdgeMenuPosition) are now handled by their
        // respective plugins' update methods, called by pluginManager.updatePlugins().
        // This method can be removed if no other direct updates are needed here.
        // For now, keeping it empty as a placeholder.
    }

    // render() and _onWindowResize() methods are removed as they are handled by RenderingPlugin.

    centerView(targetPosition = null, duration = 0.7) {
        const cameraPlugin = this.pluginManager.getPlugin('CameraPlugin');
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        if (!cameraPlugin || !nodePlugin) return;

        const currentNodes = nodePlugin.getNodes();
        let targetPos;
        if (targetPosition instanceof THREE.Vector3) {
            targetPos = targetPosition.clone();
        } else {
            targetPos = new THREE.Vector3();
            if (currentNodes.size > 0) {
                currentNodes.forEach(node => targetPos.add(node.position));
                targetPos.divideScalar(currentNodes.size);
            } else if (targetPosition && typeof targetPosition.x === 'number') {
                targetPos.set(targetPosition.x, targetPosition.y, targetPosition.z);
            }
        }
        const distance = currentNodes.size > 1 ? 700 : 400; // This logic might also move to CameraPlugin or be configurable
        cameraPlugin.moveTo(targetPos.x, targetPos.y, targetPos.z + distance, duration, targetPos);
    }

    focusOnNode(node, duration = 0.6, pushHistory = false) {
        const cameraPlugin = this.pluginManager.getPlugin('CameraPlugin');
        const camInstance = cameraPlugin?.getCameraInstance(); // THREE.PerspectiveCamera
        if (!node || !camInstance || !cameraPlugin) return;

        const targetPos = node.position.clone();
        const fov = camInstance.fov * Utils.DEG2RAD;
        const aspect = camInstance.aspect;
        const nodeSize = node.getBoundingSphereRadius() * 2; // Assuming getBoundingSphereRadius exists on node
        const projectedSize = Math.max(nodeSize, nodeSize / aspect);
        const paddingFactor = 1.5;
        const minDistance = 50;
        const distance = Math.max(minDistance, (projectedSize * paddingFactor) / (2 * Math.tan(fov / 2)));

        if (pushHistory) cameraPlugin.pushState();
        cameraPlugin.moveTo(targetPos.x, targetPos.y, targetPos.z + distance, duration, targetPos);
    }

    autoZoom(node) {
        const cameraPlugin = this.pluginManager.getPlugin('CameraPlugin');
        if (!node || !cameraPlugin) return;

        const currentTargetNodeId = cameraPlugin.getCurrentTargetNodeId();
        if (currentTargetNodeId === node.id) {
            cameraPlugin.popState();
        } else {
            cameraPlugin.pushState();
            cameraPlugin.setCurrentTargetNodeId(node.id);
            this.focusOnNode(node, 0.6, false); // focusOnNode already uses cameraPlugin
        }
    }

    screenToWorld(screenX, screenY, targetZ = 0) {
        const cameraPlugin = this.pluginManager.getPlugin('CameraPlugin');
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

    setSelectedNode(node) {
        if (this.nodeSelected === node) return;
        this.nodeSelected = node; // Update internal state first
        this.emit('node:selected', node); // Then emit event
    }

    setSelectedEdge(edge) {
        if (this.edgeSelected === edge) return;
        this.edgeSelected = edge; // Update internal state first
        this.emit('edge:selected', edge); // Then emit event
    }

    intersectedObjects(screenX, screenY) {
        const cameraPlugin = this.pluginManager.getPlugin('CameraPlugin');
        const camInstance = cameraPlugin?.getCameraInstance();
        if (!camInstance) return null;

        camInstance.updateMatrixWorld();
        const vec = new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, camInstance);
        raycaster.params.Line.threshold = 5; // This might become configurable or part of an InteractionPlugin

        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const currentNodes = nodePlugin?.getNodes();
        if (!currentNodes) return null;

        const nodeMeshes = [...currentNodes.values()].map(n => n.mesh).filter(Boolean);
        const nodeIntersects = nodeMeshes.length > 0 ? raycaster.intersectObjects(nodeMeshes, false) : [];
        if (nodeIntersects.length > 0) {
            const intersectedMesh = nodeIntersects[0].object;
            const node = nodePlugin.getNodeById(intersectedMesh.userData?.nodeId);
            if (node) return {node, distance: nodeIntersects[0].distance};
        }

        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
        const currentEdges = edgePlugin?.getEdges();
        if (!currentEdges) return null; // Or handle differently if only nodes are relevant

        const edgeLines = [...currentEdges.values()].map(e => e.line).filter(Boolean);
        const edgeIntersects = edgeLines.length > 0 ? raycaster.intersectObjects(edgeLines, false) : [];
        if (edgeIntersects.length > 0) {
            const intersectedLine = edgeIntersects[0].object;
            const edge = edgePlugin.getEdgeById(intersectedLine.userData?.edgeId);
            if (edge) return {edge, distance: edgeIntersects[0].distance};
        }

        return null;
    }

    _startLinking(sourceNode) {
        if (!sourceNode || this.isLinking) return;
        this.isLinking = true;
        this.linkSourceNode = sourceNode;
        this.emit('ui:linking:started', sourceNode);
    }

    _completeLinking(screenX, screenY) {
        const uiPlugin = this.pluginManager.getPlugin('UIPlugin');
        const uiManagerInstance = uiPlugin?.getUIManager();
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
        const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');

        if (uiManagerInstance && nodePlugin && edgePlugin && layoutPlugin && this.linkSourceNode) {
            const targetInfo = uiManagerInstance._getTargetInfo({ clientX: screenX, clientY: screenY });

            let targetNodeInstance = null;
            if (targetInfo?.node) {
                targetNodeInstance = (typeof targetInfo.node === 'string') ? nodePlugin.getNodeById(targetInfo.node) : targetInfo.node;
            }

            if (targetNodeInstance && targetNodeInstance !== this.linkSourceNode) {
                edgePlugin.addEdge(this.linkSourceNode, targetNodeInstance); // EdgePlugin calls LayoutPlugin.addEdgeToLayout
                layoutPlugin.kick();
            }
        }
        this.isLinking = false;
        this.linkSourceNode = null;
        this.emit('ui:linking:completed');
    }

    _cancelLinking() {
        this.isLinking = false;
        this.linkSourceNode = null;
        this.emit('ui:linking:cancelled');
    }

    animate() {
        const frame = () => {
            this.pluginManager.updatePlugins(); // This now calls RenderingPlugin.update() which includes rendering
            this.updateNodesAndEdges(); // Node/edge position updates, UI updates etc. (parts to be moved to plugins)
            // this.render(); // Removed, RenderingPlugin handles this via its update method.
            requestAnimationFrame(frame);
        };
        frame();
    }

    dispose() {
        this.pluginManager.disposePlugins(); // Disposes RenderingPlugin, CameraPlugin, NodePlugin, EdgePlugin, LayoutPlugin etc.

        // this.camera?.dispose(); // Handled by CameraPlugin
        // this.layout?.stop(); // Handled by LayoutPlugin
        // Node disposal and clearing is handled by NodePlugin.dispose()
        // Edge disposal and clearing is handled by EdgePlugin.dispose()
        // Scene clearing, renderer disposal, css3d container removal, and resize listener
        // are now handled by RenderingPlugin.dispose().
        // UIManager disposal is handled by UIPlugin.dispose().

        // this.ui?.dispose(); // Handled by UIPlugin
        this._listeners.clear(); // Clear all event listeners on SpaceGraph itself
        console.log("SpaceGraph disposed.");
    }
}
