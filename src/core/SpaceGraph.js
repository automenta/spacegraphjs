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
    // nodeSelected = null; // Moved to UIPlugin
    // edgeSelected = null; // Moved to UIPlugin
    // isLinking = false; // Moved to UIPlugin
    // linkSourceNode = null; // Moved to UIPlugin
    // tempLinkLine = null; // Managed by UIPlugin or a dedicated linking visual handler
    // ui = null; // Moved to UIPlugin
    _cam = null; // This THREE.PerspectiveCamera is now created and managed by CameraPlugin.
    // It's also set on this.space._cam by CameraPlugin for now.
    // layout = null; // Moved to LayoutPlugin

    // Properties like scene, cssScene, renderGL, camera instance (THREE.PerspectiveCamera),
    // CameraControls instance, and Layout instance are now managed by their respective plugins.

    _listeners = new Map(); // Event bus listeners
    pluginManager = null;
    contextMenuElement = null; // Added
    confirmDialogElement = null; // Added

    constructor(containerElement, contextMenuElement, confirmDialogElement) {
        // Modified
        if (!containerElement) throw new Error('SpaceGraph requires a valid HTML container element.');
        if (!contextMenuElement) throw new Error('SpaceGraph requires a contextMenuElement.');
        if (!confirmDialogElement) throw new Error('SpaceGraph requires a confirmDialogElement.');

        this.container = containerElement;
        this.contextMenuElement = contextMenuElement; // Added
        this.confirmDialogElement = confirmDialogElement; // Added
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
        this.pluginManager.registerPlugin(
            new UIPlugin(this, this.pluginManager, this.contextMenuElement, this.confirmDialogElement)
        ); // Modified

        // _cam is now created by CameraPlugin and assigned to this.space._cam in CameraPlugin.init() for now.
        // Direct instantiation of THREE.PerspectiveCamera, CameraControls, Layout, and UIManager is removed from here.

        // Initialize all registered plugins.
        // RenderingPlugin's init() sets up scenes, renderers, lighting.
        // CameraPlugin's init() creates the camera, controls.
        this.pluginManager.initPlugins();

        // Initial camera setup
        const cameraPlugin = this.pluginManager.getPlugin('CameraPlugin');
        if (cameraPlugin) {
            cameraPlugin.centerView(null, 0); // Request plugin to center
            cameraPlugin.setInitialState(); // Request plugin to set initial state
        }

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
            this._listeners.get(eventName).forEach((callback) => {
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
        // Listener for adding a node, simplified
        this.on('ui:request:addNode', (nodeInstance) => {
            // NodePlugin.addNode will emit 'node:added' which is handled below
            this.pluginManager.getPlugin('NodePlugin')?.addNode(nodeInstance);
            // If LayoutPlugin doesn't listen to node:added to kick, we might need to kick here.
            // For now, assuming NodePlugin's addNode or LayoutPlugin's addNodeToLayout handles kicking or LayoutPlugin listens.
            // const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
            // layoutPlugin?.kick(); // Or this is handled by LayoutPlugin reacting to node:added
        });

        // Listener for when a node is actually added and confirmed by NodePlugin
        this.on('node:added', (addedNode) => {
            if (addedNode) {
                // LayoutPlugin now listens to node:added and kicks itself.
                // const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
                // layoutPlugin?.kick();

                setTimeout(() => {
                    // Allow node to be added to scene before focusing
                    this.focusOnNode(addedNode, 0.6, true); // focusOnNode delegates to CameraPlugin
                    this.pluginManager.getPlugin('UIPlugin')?.setSelectedNode(addedNode);
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
            // EdgePlugin.addEdge will emit 'edge:added'
            this.pluginManager.getPlugin('EdgePlugin')?.addEdge(sourceNode, targetNode, data);
            // Assuming LayoutPlugin listens to 'edge:added' to kick, or its addEdgeToLayout handles it.
            // const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
            // layoutPlugin?.kick();
        });

        // Listener for when an edge is actually added
        this.on('edge:added', (addedEdge) => {
            if (addedEdge) {
                // LayoutPlugin now listens to edge:added and kicks itself.
                // const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
                // layoutPlugin?.kick();
                // Any other actions upon edge addition can go here (e.g., selection)
            }
        });

        this.on('ui:request:removeEdge', (edgeId) => {
            // EdgePlugin.removeEdge calls LayoutPlugin.removeEdgeFromLayout
            this.pluginManager.getPlugin('EdgePlugin')?.removeEdge(edgeId);
        });
        // UIPlugin now listens to these events directly. SpaceGraph doesn't need to handle them here.
        // this.on('ui:request:setSelectedNode', (node) => this.pluginManager.getPlugin('UIPlugin')?.setSelectedNode(node));
        // this.on('ui:request:setSelectedEdge', (edge) => this.pluginManager.getPlugin('UIPlugin')?.setSelectedEdge(edge));
        this.on('ui:request:autoZoomNode', (node) => this.autoZoom(node)); // Uses methods now on CameraPlugin
        this.on('ui:request:centerView', () => this.centerView()); // Uses methods now on CameraPlugin
        this.on('ui:request:resetView', () => {
            this.pluginManager.getPlugin('CameraPlugin')?.resetView();
        });
        this.on('ui:request:toggleBackground', (color, alpha) => {
            const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
            renderingPlugin?.setBackground(color, alpha);
        });
        // UIPlugin now listens to these events directly.
        // this.on('ui:request:startLinking', (sourceNode) => this.pluginManager.getPlugin('UIPlugin')?.startLinking(sourceNode));
        // this.on('ui:request:cancelLinking', () => this.pluginManager.getPlugin('UIPlugin')?.cancelLinking());
        // this.on('ui:request:completeLinking', (screenX, screenY) => this.pluginManager.getPlugin('UIPlugin')?.completeLinking(screenX, screenY));
        this.on('ui:request:reverseEdge', (edgeId) => {
            const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
            const uiPlugin = this.pluginManager.getPlugin('UIPlugin');
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
        this.on('ui:request:focusOnNode', (node, duration, pushHistory) =>
            this.focusOnNode(node, duration, pushHistory)
        ); // Uses methods now on CameraPlugin
        this.on('ui:request:updateEdge', (edgeId, property, value) => {
            const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
            const uiPlugin = this.pluginManager.getPlugin('UIPlugin');
            const edge = edgePlugin?.getEdgeById(edgeId);
            if (!edge) return;
            switch (property) {
                case 'color':
                    edge.data.color = value;
                    // setHighlight might need to be a method on Edge or EdgePlugin
                    edge.setHighlight(uiPlugin?.getSelectedEdge() === edge);
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

    addNode(nodeInstance) {
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
        if (nodePlugin) {
            const addedNode = nodePlugin.addNode(nodeInstance); // NodePlugin calls LayoutPlugin.addNodeToLayout
            if (addedNode && layoutPlugin) {
                layoutPlugin.kick();
            }
            return addedNode;
        }
        console.error('SpaceGraph: NodePlugin not available to add node.');
        return undefined;
    }

    addEdge(sourceNode, targetNode, data = {}) {
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
        const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
        if (edgePlugin) {
            const addedEdge = edgePlugin.addEdge(sourceNode, targetNode, data); // EdgePlugin calls LayoutPlugin.addEdgeToLayout
            if (addedEdge && layoutPlugin) {
                layoutPlugin.kick();
            }
            return addedEdge;
        }
        console.error('SpaceGraph: EdgePlugin not available to add edge.');
        return undefined;
    }

    // updateNodesAndEdges() is removed as its responsibilities are covered by pluginManager.updatePlugins()
    // which calls individual plugin update methods (Node, Edge, UI, Rendering, Layout).

    // render() and _onWindowResize() methods are removed as they are handled by RenderingPlugin.

    /**
     * Centers the view on a target position or the graph's centroid.
     * Delegates to CameraPlugin.
     * @param {THREE.Vector3 | object | null} targetPosition - Optional target position.
     * @param {number} duration - Animation duration.
     */
    centerView(targetPosition = null, duration = 0.7) {
        this.pluginManager.getPlugin('CameraPlugin')?.centerView(targetPosition, duration);
    }

    /**
     * Focuses the camera on a specific node.
     * Delegates to CameraPlugin.
     * @param {BaseNode} node - The node to focus on.
     * @param {number} duration - Animation duration.
     * @param {boolean} pushHistory - Whether to push the current camera state to history.
     */
    focusOnNode(node, duration = 0.6, pushHistory = false) {
        this.pluginManager.getPlugin('CameraPlugin')?.focusOnNode(node, duration, pushHistory);
    }

    /**
     * Toggles zoom between the current view and a specific node.
     * If already focused on the node, it pops the camera state. Otherwise, it focuses.
     * @param {BaseNode} node - The node to auto-zoom to.
     */
    autoZoom(node) {
        const cameraPlugin = this.pluginManager.getPlugin('CameraPlugin');
        if (!node || !cameraPlugin) return;

        if (cameraPlugin.getCurrentTargetNodeId() === node.id) {
            cameraPlugin.popState();
            cameraPlugin.setCurrentTargetNodeId(null); // Clear target when zooming out
        } else {
            cameraPlugin.pushState();
            cameraPlugin.setCurrentTargetNodeId(node.id);
            // focusOnNode in CameraPlugin handles the actual camera movement
            cameraPlugin.focusOnNode(node, 0.6, false); // pushHistory is false because we already pushed
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

    // setSelectedNode, setSelectedEdge, _startLinking, _completeLinking, _cancelLinking
    // have been moved to UIPlugin.js

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

        const nodeMeshes = [...currentNodes.values()].map((n) => n.mesh).filter(Boolean);
        const nodeIntersects = nodeMeshes.length > 0 ? raycaster.intersectObjects(nodeMeshes, false) : [];
        if (nodeIntersects.length > 0) {
            const intersectedMesh = nodeIntersects[0].object;
            const node = nodePlugin.getNodeById(intersectedMesh.userData?.nodeId);
            if (node) return { node, distance: nodeIntersects[0].distance };
        }

        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
        const currentEdges = edgePlugin?.getEdges();
        if (!currentEdges) return null; // Or handle differently if only nodes are relevant

        const edgeLines = [...currentEdges.values()].map((e) => e.line).filter(Boolean);
        const edgeIntersects = edgeLines.length > 0 ? raycaster.intersectObjects(edgeLines, false) : [];
        if (edgeIntersects.length > 0) {
            const intersectedLine = edgeIntersects[0].object;
            const edge = edgePlugin.getEdgeById(intersectedLine.userData?.edgeId);
            if (edge) return { edge, distance: edgeIntersects[0].distance };
        }

        return null;
    }

    // _startLinking, _completeLinking, _cancelLinking are moved to UIPlugin.js

    animate() {
        const frame = () => {
            this.pluginManager.updatePlugins(); // Calls update on all plugins (Rendering, Layout, Nodes, Edges, UI, etc.)
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
        console.log('SpaceGraph disposed.');
    }
}
