import * as THREE from 'three';
// import { Camera } from '../camera/Camera.js'; // Used by CameraPlugin
// Will be managed by UIPlugin
// import { ForceLayout } from '../layout/ForceLayout.js'; // Used by LayoutPlugin
// Used by EdgePlugin & Edge class itself
import { HtmlNode } from '../graph/nodes/HtmlNode.js'; // Example node type
import { PluginManager } from './PluginManager.js';
import { RenderingPlugin } from '../plugins/RenderingPlugin.js';
import { CameraPlugin } from '../plugins/CameraPlugin.js';
import { NodePlugin } from '../plugins/NodePlugin.js';
import { EdgePlugin } from '../plugins/EdgePlugin.js';
import { LayoutPlugin } from '../plugins/LayoutPlugin.js';
import { UIPlugin } from '../plugins/UIPlugin.js';
import { MinimapPlugin } from '../plugins/MinimapPlugin.js';
import { DataPlugin } from '../plugins/DataPlugin.js'; // Import DataPlugin

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
    plugins = null;
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
        this.plugins = new PluginManager(this);

        // Register CameraPlugin FIRST
        this.plugins.add(new CameraPlugin(this, this.plugins));
        // Register RenderingPlugin SECOND
        this.plugins.add(new RenderingPlugin(this, this.plugins));
        // Register NodePlugin
        this.plugins.add(new NodePlugin(this, this.plugins));
        // Register EdgePlugin
        this.plugins.add(new EdgePlugin(this, this.plugins));
        // Register LayoutPlugin
        this.plugins.add(new LayoutPlugin(this, this.plugins));
        // Register UIPlugin
        this.plugins.add(new UIPlugin(this, this.plugins, this.contextMenuElement, this.confirmDialogElement)); // Modified
        // Register MinimapPlugin (can be after UI or Rendering)
        this.plugins.add(new MinimapPlugin(this, this.plugins));
        // Register DataPlugin
        this.plugins.add(new DataPlugin(this, this.plugins));

        // _cam is now created by CameraPlugin and assigned to this.space._cam in CameraPlugin.init() for now.
        // Direct instantiation of THREE.PerspectiveCamera, CameraControls, Layout, and UIManager is removed from here.

        // Plugin initialization will be handled by a separate async init() method.
    }

    /**
     * Asynchronously initializes all registered plugins and performs initial setup.
     * This method must be called and awaited after constructing SpaceGraph.
     * @returns {Promise<void>}
     */
    async init() {
        // Initialize all registered plugins.
        // RenderingPlugin's init() sets up scenes, renderers, lighting.
        // CameraPlugin's init() creates the camera, controls.
        // LayoutPlugin.init() is async and will be awaited.
        await this.plugins.initPlugins();

        // Initial camera setup
        const cameraPlugin = this.plugins.getPlugin('CameraPlugin');
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
                    // console.error(`Error in event listener for "${eventName}":`, error);
                    // Minimal logging in core, let plugins handle specific errors or use a dedicated logger plugin
                }
            });
        }
    }

    // --- Internal Event Listeners for UI Requests ---
    _setupEventListeners() {
        // Listener for adding a node, simplified
        this.on('ui:request:addNode', (nodeInstance) => {
            // NodePlugin.addNode will emit 'node:added' which is handled below
            this.plugins.getPlugin('NodePlugin')?.addNode(nodeInstance);
        });

        // Listener for creating a node from data, using the factory
        this.on('ui:request:createNode', (nodeConfig) => {
            // NodePlugin.createAndAddNode will internally call addNode, which emits 'node:added'
            this.plugins.getPlugin('NodePlugin')?.createAndAddNode(nodeConfig);
        });

        // Listener for when a node is actually added and confirmed by NodePlugin
        this.on('node:added', (addedNode) => {
            if (addedNode) {
                setTimeout(() => {
                    // Allow node to be added to scene before focusing
                    this.focusOnNode(addedNode, 0.6, true); // focusOnNode delegates to CameraPlugin
                    this.plugins.getPlugin('UIPlugin')?.setSelectedNode(addedNode);
                    if (addedNode instanceof HtmlNode && addedNode.data.editable) {
                        addedNode.htmlElement?.querySelector('.node-content')?.focus();
                    }
                }, 100);
            }
        });

        this.on('ui:request:removeNode', (nodeId) => {
            this.plugins.getPlugin('NodePlugin')?.removeNode(nodeId); // NodePlugin's removeNode will call EdgePlugin
        });
        this.on('ui:request:addEdge', (sourceNode, targetNode, data) => {
            // EdgePlugin.addEdge will emit 'edge:added'
            this.plugins.getPlugin('EdgePlugin')?.addEdge(sourceNode, targetNode, data);
        });

        // Listener for when an edge is actually added
        this.on('edge:added', (_addedEdge) => {
            // if (addedEdge) {
            // Actions upon edge addition can go here (e.g., selection, if not handled by UIPlugin)
            // }
        });

        this.on('ui:request:removeEdge', (edgeId) => {
            // EdgePlugin.removeEdge calls LayoutPlugin.removeEdgeFromLayout
            this.plugins.getPlugin('EdgePlugin')?.removeEdge(edgeId);
        });

        this.on('ui:request:autoZoomNode', (node) => this.autoZoom(node));
        this.on('ui:request:centerView', () => this.centerView());
        this.on('ui:request:resetView', () => {
            this.plugins.getPlugin('CameraPlugin')?.resetView();
        });
        this.on('ui:request:toggleBackground', (color, alpha) => {
            const renderingPlugin = this.plugins.getPlugin('RenderingPlugin');
            renderingPlugin?.setBackground(color, alpha);
        });

        this.on('ui:request:reverseEdge', (edgeId) => {
            const edgePlugin = this.plugins.getPlugin('EdgePlugin');
            // const uiPlugin = this.plugins.getPlugin('UIPlugin'); // uiPlugin not used here
            const edge = edgePlugin?.getEdgeById(edgeId);
            if (edge) {
                [edge.source, edge.target] = [edge.target, edge.source];
                edge.update(); // Edge internal update
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
            // const _uiPlugin = this.plugins.getPlugin('UIPlugin'); // _uiPlugin not used
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

    // _setupRenderers, _setupLighting, setBackground, render, _onWindowResize are now in RenderingPlugin.
    // addNode, removeNode, getNodeById are now in NodePlugin.
    // addEdge, removeEdge, getEdgeById are now in EdgePlugin.

    // getNodeById is removed, use NodePlugin.getNodeById(id) via pluginManager
    // getEdgeById is removed, use EdgePlugin.getEdgeById(id) via pluginManager

    addNode(nodeInstance) {
        const nodePlugin = this.plugins.getPlugin('NodePlugin');
        const layoutPlugin = this.plugins.getPlugin('LayoutPlugin');
        if (nodePlugin) {
            const addedNode = nodePlugin.addNode(nodeInstance); // NodePlugin calls LayoutPlugin.addNodeToLayout
            if (addedNode && layoutPlugin) {
                layoutPlugin.kick();
            }
            return addedNode;
        }
        // console.error('SpaceGraph: NodePlugin not available to add node.');
        return undefined;
    }

    addEdge(sourceNode, targetNode, data = {}) {
        const edgePlugin = this.plugins.getPlugin('EdgePlugin');
        const layoutPlugin = this.plugins.getPlugin('LayoutPlugin');
        if (edgePlugin) {
            const addedEdge = edgePlugin.addEdge(sourceNode, targetNode, data); // EdgePlugin calls LayoutPlugin.addEdgeToLayout
            if (addedEdge && layoutPlugin) {
                layoutPlugin.kick();
            }
            return addedEdge;
        }
        // console.error('SpaceGraph: EdgePlugin not available to add edge.');
        return undefined;
    }

    /**
     * Creates a new node from configuration data using the NodeFactory and adds it to the graph.
     * This is a convenience method that wraps the NodePlugin's createAndAddNode functionality.
     * @param {object} nodeConfig - Configuration for the new node.
     * @param {string} nodeConfig.type - The type of node to create (e.g., 'html', 'shape').
     * @param {object} nodeConfig.position - Initial position {x, y, z}.
     * @param {object} [nodeConfig.data={}] - Custom data for the node.
     * @param {number} [nodeConfig.mass=1.0] - Mass for physics calculations.
     * @param {string} [nodeConfig.id] - Optional ID; one will be generated if not provided.
     * @returns {import('../graph/nodes/BaseNode.js').BaseNode | undefined} The created node, or undefined on failure.
     */
    createNode(nodeConfig) {
        const nodePlugin = this.plugins.getPlugin('NodePlugin');
        if (nodePlugin) {
            // createAndAddNode in NodePlugin will emit 'node:added', triggering layout kicks etc.
            return nodePlugin.createAndAddNode(nodeConfig);
        }
        // console.error('SpaceGraph: NodePlugin not available to create node.');
        return undefined;
    }

    /**
     * Toggles the pinned state of a specific node.
     * @param {string} nodeId - The ID of the node to pin/unpin.
     */
    togglePinNode(nodeId) {
        const layoutPlugin = this.plugins.getPlugin('LayoutPlugin');
        if (layoutPlugin && typeof layoutPlugin.togglePinNode === 'function') {
            layoutPlugin.togglePinNode(nodeId);
        } else {
            // console.warn('SpaceGraph: LayoutPlugin not available or does not support togglePinNode.');
        }
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
        this.plugins.getPlugin('CameraPlugin')?.centerView(targetPosition, duration);
    }

    /**
     * Focuses the camera on a specific node.
     * Delegates to CameraPlugin.
     * @param {BaseNode} node - The node to focus on.
     * @param {number} duration - Animation duration.
     * @param {boolean} pushHistory - Whether to push the current camera state to history.
     */
    focusOnNode(node, duration = 0.6, pushHistory = false) {
        this.plugins.getPlugin('CameraPlugin')?.focusOnNode(node, duration, pushHistory);
    }

    /**
     * Toggles zoom between the current view and a specific node.
     * If already focused on the node, it pops the camera state. Otherwise, it focuses.
     * @param {BaseNode} node - The node to auto-zoom to.
     */
    autoZoom(node) {
        const cameraPlugin = this.plugins.getPlugin('CameraPlugin');
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

    // setSelectedNode, setSelectedEdge, _startLinking, _completeLinking, _cancelLinking
    // have been moved to UIPlugin.js

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
        const instancedNodeManager = renderingPlugin?.getInstancedMeshManager(); // Renamed for clarity
        const instancedEdgeManager = edgePlugin?.instancedEdgeManager; // Get from EdgePlugin

        let closestIntersect = null;

        // 1. Raycast against instanced nodes
        if (instancedNodeManager) {
            const instancedNodeIntersection = instancedNodeManager.raycast(raycaster);
            if (instancedNodeIntersection) {
                const node = nodePlugin?.getNodeById(instancedNodeIntersection.nodeId);
                if (node) {
                    closestIntersect = { node, distance: instancedNodeIntersection.distance, type: 'node' };
                }
            }
        }

        // 2. Raycast against non-instanced node meshes
        const currentNodes = nodePlugin?.getNodes();
        if (currentNodes) {
            const nonInstancedNodeMeshes = [...currentNodes.values()]
                .filter((n) => !n.isInstanced && n.mesh && n.mesh.visible) // Only check non-instanced, visible meshes
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

        // 3. Raycast against instanced edges (if no node was hit closer or at all)
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

        // 4. Raycast against non-instanced edges (Line2) (only if no node/instanced_edge was hit closer or at all)
        const currentEdges = edgePlugin?.getEdges();
        if (currentEdges) {
            // Filter out already instanced edges from this check
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

        // Return only the relevant part (node or edge)
        if (closestIntersect) {
            if (closestIntersect.type === 'node')
                return { node: closestIntersect.node, distance: closestIntersect.distance };
            if (closestIntersect.type === 'edge')
                return { edge: closestIntersect.edge, distance: closestIntersect.distance };
        }

        return null;
    }

    // _startLinking, _completeLinking, _cancelLinking are moved to UIPlugin.js

    animate() {
        const frame = () => {
            this.plugins.updatePlugins(); // Calls update on all plugins (Rendering, Layout, Nodes, Edges, UI, etc.)
            requestAnimationFrame(frame);
        };
        frame();
    }

    dispose() {
        this.plugins.disposePlugins(); // Disposes RenderingPlugin, CameraPlugin, NodePlugin, EdgePlugin, LayoutPlugin etc.

        // this.camera?.dispose(); // Handled by CameraPlugin
        // this.layout?.stop(); // Handled by LayoutPlugin
        // Node disposal and clearing is handled by NodePlugin.dispose()
        // Edge disposal and clearing is handled by EdgePlugin.dispose()
        // Scene clearing, renderer disposal, css3d container removal, and resize listener
        // are now handled by RenderingPlugin.dispose().
        // UIManager disposal is handled by UIPlugin.dispose().

        // this.ui?.dispose(); // Handled by UIPlugin
        this._listeners.clear(); // Clear all event listeners on SpaceGraph itself
    }

    // --- Data Import/Export Methods ---
    /**
     * Exports the current graph to a JSON string.
     * @param {object} options - Export options (see DataPlugin.exportGraphToJSON).
     * @returns {string | null} JSON string or null on error.
     */
    exportGraphToJSON(options) {
        const dataPlugin = this.plugins.getPlugin('DataPlugin');
        if (dataPlugin) {
            return dataPlugin.exportGraphToJSON(options);
        }
        // console.error('SpaceGraph: DataPlugin not available for export.');
        return null;
    }

    /**
     * Imports a graph from a JSON string or object.
     * @param {string | object} jsonData - JSON string or object.
     * @param {object} options - Import options (see DataPlugin.importGraphFromJSON).
     * @returns {Promise<boolean>} True if import was successful, false otherwise.
     */
    async importGraphFromJSON(jsonData, options) {
        const dataPlugin = this.plugins.getPlugin('DataPlugin');
        if (dataPlugin) {
            return await dataPlugin.importGraphFromJSON(jsonData, options);
        }
        // console.error('SpaceGraph: DataPlugin not available for import.');
        return false;
    }
}
