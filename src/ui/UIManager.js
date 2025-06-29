import * as THREE from 'three';
// import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'; // Unused
import { $, $$ } from '../utils.js';
import { HtmlNode } from '../graph/nodes/HtmlNode.js';

const ALT_Z_DRAG_SENSITIVITY = 1.0;

// Import decomposed modules
import { InteractionState } from './InteractionState.js';
import { TranslationGizmo } from './gizmos/TranslationGizmo.js'; // Added Gizmo
import { ConfirmDialog } from './dialogs/ConfirmDialog.js';
import { ContextMenu } from './menus/ContextMenu.js';
import { createAdaptiveGeometricHub, createFractalAxisManipulators, updateFractalUIScale, setFractalElementActive, applySemanticZoomToAxis } from './fractal/FractalUIElements.js';
import { EdgeMenu } from './menus/EdgeMenu.js';
import { HudManager } from './hud/HudManager.js';
import { Toolbar } from './Toolbar.js';

/**
 * @class UIManager
 * Manages all user interface interactions within the SpaceGraph,
 * including pointer events, keyboard inputs, context menus, dialogs,
 * and transformation gizmos.
 */
export class UIManager {
    space = null;
    container = null;

    // Decomposed components
    confirmDialog = null;
    contextMenu = null;
    edgeMenu = null;
    hudManager = null;
    toolbar = null;

    currentState = InteractionState.IDLE;
    activePointerId = null;

    // --- Traditional Drag/Resize (Metaframe or direct node) ---
    draggedNode = null;
    dragOffset = new THREE.Vector3();
    draggedNodeInitialQuaternion = new THREE.Quaternion();
    dragInteractionPlane = new THREE.Plane();
    draggedNodeInitialWorldPos = new THREE.Vector3();

    resizedNode = null;
    activeResizeHandleType = null;
    resizeStartPointerPos = { x: 0, y: 0 };
    resizeStartNodeScale = new THREE.Vector3(1, 1, 1);
    resizeStartNodeSize = new THREE.Vector3(1, 1, 1);
    resizeStartHandleLocalPos = new THREE.Vector3();
    resizeInteractionPlane = new THREE.Plane();
    resizeNodeInitialMatrixWorld = new THREE.Matrix4();

    // --- Gizmo Interaction ---
    /** @type {TranslationGizmo | null} The main gizmo instance (handles translation, rotation, scale). */
    gizmo = null;
    /** @type {'translate' | 'rotate' | 'scale' | null} The currently active gizmo *mode* (selected via toolbar, e.g.). */
    activeGizmoMode = 'translate'; // Default to translate
    /** @type {THREE.Mesh | null} The THREE.Mesh of the currently hovered gizmo handle part. */
    hoveredGizmoHandle = null;
    /**
     * @typedef {object} GizmoHandleInfo
     * @property {string} axis - The axis or plane of the handle (e.g., 'x', 'y', 'z', 'xy').
     * @property {string} type - The type of gizmo (e.g., 'translate').
     * @property {string} part - The part of the handle (e.g., 'arrow', 'plane').
     * @property {THREE.Mesh} object - The specific THREE.Mesh of the handle part.
     * @property {number} [distance] - Optional distance from camera during raycast.
     */
    /** @type {GizmoHandleInfo | null} Information about the gizmo handle currently being dragged. */
    draggedGizmoHandleInfo = null;
    /** @type {THREE.Vector3} Initial world position on the gizmo handle where dragging started. */
    gizmoDragStartPointerWorldPos = new THREE.Vector3();
    /** @type {Map<string, THREE.Vector3>} Stores initial positions of selected nodes at the start of a gizmo drag. Key is node ID. */
    selectedNodesInitialPositions = new Map();
    /** @type {Map<string, THREE.Quaternion>} Stores initial quaternions of selected nodes at the start of a gizmo drag. Key is node ID. */
    selectedNodesInitialQuaternions = new Map();
    /** @type {Map<string, THREE.Vector3>} Stores initial scales of selected nodes at the start of a gizmo drag. Key is node ID. */
    selectedNodesInitialScales = new Map();
    /** @type {THREE.Object3D | null} Helper object to represent the center of multi-selection for gizmo operations, storing its initial transform. */
    multiSelectionHelper = null;

    // --- Fractal UI Interaction ---
    /** @type {THREE.Mesh | null} The Adaptive Geometric Hub instance. */
    adaptiveGeometricHub = null;
    /** @type {THREE.Group | null} Group containing fractal axis manipulators. */
    fractalAxisManipulators = null;
    /** @type {THREE.Mesh | null} The currently hovered fractal UI element. */
    hoveredFractalElement = null;
    /** @type {object | null} Information about the fractal element currently being dragged. */
    draggedFractalElementInfo = null;
    // draggedFractalElementInfo might include: { element: THREE.Mesh, type: 'translate_axis', axis: 'x', initialOffset: THREE.Vector3 }
    fractalUIInteractionPlane = new THREE.Plane();

    // --- General Hover/Selection ---
    hoveredEdge = null;
    hoveredHandleType = null; // For Metaframe handles
    currentHoveredGLHandle = null; // For Metaframe handles (THREE.Object3D)
    hoveredNodeForMetaframe = null;

    pointerState = {
        down: false,
        button: -1,
        clientX: 0,
        clientY: 0,
        startClientX: 0,
        startClientY: 0,
        isDraggingThresholdMet: false,
        DRAG_THRESHOLD: 5,
    };

    tempLinkLine = null;

    _uiPluginCallbacks = {
        setSelectedNode: () => {},
        setSelectedEdge: () => {},
        cancelLinking: () => {},
        getIsLinking: () => false,
        getLinkSourceNode: () => null,
        getSelectedNodes: () => new Set(),
        getSelectedEdges: () => new Set(),
        completeLinking: () => {},
    };

    /**
     * Creates an instance of UIManager.
     * @param {SpaceGraph} space - The SpaceGraph instance.
     * @param {HTMLElement} contextMenuEl - The DOM element for the context menu.
     * @param {HTMLElement} confirmDialogEl - The DOM element for the confirm dialog.
     * @param {object} uiPluginCallbacks - Callbacks provided by UIPlugin for selection and linking.
     */
    constructor(space, contextMenuEl, confirmDialogEl, uiPluginCallbacks) {
        if (!space || !contextMenuEl || !confirmDialogEl)
            throw new Error('UIManager requires SpaceGraph instance and UI elements.');
        this.space = space;
        this.container = space.container;

        this._uiPluginCallbacks = { ...this._uiPluginCallbacks, ...uiPluginCallbacks };

        this.confirmDialog = new ConfirmDialog(this.space, confirmDialogEl);
        this.contextMenu = new ContextMenu(this.space, contextMenuEl, this._uiPluginCallbacks);
        this.edgeMenu = new EdgeMenu(this.space, this._uiPluginCallbacks);
        this.hudManager = new HudManager(this.space, this.container, this._uiPluginCallbacks);
        this.toolbar = new Toolbar(this.space, $('#toolbar'));

        // Initialize Gizmos
        this.gizmo = new TranslationGizmo(); // Renamed from translationGizmo
        this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.add(this.gizmo);
        this.gizmo.hide();

        this.multiSelectionHelper = new THREE.Object3D();

        // Initialize Fractal UI Elements
        this.adaptiveGeometricHub = createAdaptiveGeometricHub();
        this.fractalAxisManipulators = createFractalAxisManipulators();
        const webglScene = this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene();
        if (webglScene) {
            webglScene.add(this.adaptiveGeometricHub);
            webglScene.add(this.fractalAxisManipulators);
        }
        // adaptiveGeometricHub and fractalAxisManipulators are set to visible = false by default in their creation functions

        this._applySavedTheme();
        this._bindEvents();
        this._subscribeToSpaceGraphEvents();
    }

    _applySavedTheme() {
        localStorage.getItem('spacegraph-theme') === 'light'
            ? document.body.classList.add('theme-light')
            : document.body.classList.remove('theme-light');
    }

    _bindEvents() {
        const passiveFalse = { passive: false };
        this.container.addEventListener('pointerdown', this._onPointerDown, passiveFalse);
        window.addEventListener('pointermove', this._onPointerMove, passiveFalse);
        window.addEventListener('pointerup', this._onPointerUp, passiveFalse);
        this.container.addEventListener('contextmenu', this._onContextMenu, passiveFalse);
        document.addEventListener('click', this._onDocumentClick, true);
        window.addEventListener('keydown', this._onKeyDown);
        this.container.addEventListener('wheel', this._onWheel, passiveFalse);

        this.space.on('ui:request:confirm', this._onRequestConfirm);
        this.space.on('ui:request:editNode', this._onEditNodeRequest);
        this.space.on('ui:request:deleteNode', this._onDeleteNodeRequest);
    }

    _subscribeToSpaceGraphEvents() {
        this.space.on('selection:changed', this._onSelectionChanged);
        this.space.on('graph:cleared', this._onGraphCleared); // Listener for graph clear
        this.space.on('linking:started', this._onLinkingStarted);
        this.space.on('linking:cancelled', this._onLinkingCancelled);
        this.space.on('linking:succeeded', this._onLinkingCompleted);
        this.space.on('linking:failed', this._onLinkingCompleted);
        this.space.on('camera:modeChanged', this._onCameraModeChanged);
    }

    /**
     * Handles graph clearing by hiding any active gizmo.
     * @private
     */
    _onGraphCleared = () => {
        if (this.gizmo) {
            this.gizmo.hide();
        }
        // this.activeGizmoMode remains, it's a user setting
    };

    _onRequestConfirm = (payload) => {
        this.confirmDialog.show(payload.message, payload.onConfirm);
    };

    _onCameraModeChanged = (data) => {
        this.hudManager.updateHudCameraMode(data.newMode);
    };

    _onEditNodeRequest = ({ node }) => {
        this.space.emit('ui:node:editRequested', { node });
    };

    _onDeleteNodeRequest = ({ node }) => {
        this.space.emit('ui:request:confirm', {
            message: `Delete node "${node.id.substring(0, 10)}..."?`,
            onConfirm: () => this.space.emit('ui:request:removeNode', node.id),
        });
    };

    /**
     * Handles selection changes to show/hide and position the appropriate gizmo.
     * @private
     * @param {object} payload - The selection change payload.
     * @param {Set<Node|Edge>} payload.selected - The set of selected items.
     * @param {'node'|'edge'} payload.type - The type of items selected.
     */
    _onSelectionChanged = (payload) => {
        const selectedNodes = payload.selected.size > 0 && payload.type === 'node' ? payload.selected : new Set();
        const selectedEdges = payload.selected.size > 0 && payload.type === 'edge' ? payload.selected : new Set();

        if (selectedEdges.size === 1) {
            const edge = selectedEdges.values().next().value;
            if (!this.edgeMenu.edgeMenuObject || this.edgeMenu.edgeMenuObject.element.dataset.edgeId !== edge.id) {
                this.edgeMenu.show(edge);
            } else {
                this.edgeMenu.updatePosition(edge);
            }
        } else {
            this.edgeMenu.hide();
        }

        const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();

        // Hide all transform UIs by default, then show the appropriate one.
        this.gizmo?.hide();
        this.adaptiveGeometricHub?.hide();
        this.fractalAxisManipulators?.hide();

        if (selectedNodes.size === 1 && this.adaptiveGeometricHub) {
            const node = selectedNodes.values().next().value;
            this.adaptiveGeometricHub.position.copy(node.position);

            // Initial orientation for AGH (e.g., identity or match node if meaningful)
            this.adaptiveGeometricHub.quaternion.identity();

            if (camera) updateFractalUIScale(this.adaptiveGeometricHub, camera, 500, node.position);
            this.adaptiveGeometricHub.show();
            // Fractal axis manipulators are not shown until AGH is interacted with.

        } else if (selectedNodes.size > 0 && this.gizmo) { // Fallback to old gizmo for multi-select for now
            const center = new THREE.Vector3();
            selectedNodes.forEach((n) => center.add(n.position));
            center.divideScalar(selectedNodes.size);
            this.gizmo.position.copy(center);
            this.gizmo.quaternion.identity(); // World orientation for multi-select

            if (camera) this.gizmo.updateScale(camera);
            this.gizmo.show();
        }
        // If selectedNodes.size is 0, all transform UIs remain hidden.

        this.hudManager.updateHudSelectionInfo();
    };

    _updateNormalizedPointerState(e, isDownEvent = undefined) {
        this.pointerState.clientX = e.clientX;
        this.pointerState.clientY = e.clientY;
        if (isDownEvent !== undefined) {
            this.pointerState.down = isDownEvent;
            if (isDownEvent) {
                this.pointerState.button = e.button;
                this.pointerState.startClientX = e.clientX;
                this.pointerState.startClientY = e.clientY;
                this.pointerState.isDraggingThresholdMet = false;
            } else {
                this.pointerState.button = -1;
            }
        }
        if (this.pointerState.down && !this.pointerState.isDraggingThresholdMet) {
            const dx = this.pointerState.clientX - this.pointerState.startClientX;
            const dy = this.pointerState.clientY - this.pointerState.startClientY;
            if (Math.sqrt(dx * dx + dy * dy) > this.pointerState.DRAG_THRESHOLD) {
                this.pointerState.isDraggingThresholdMet = true;
            }
        }
    }

    _transitionToState(newState, data = {}) {
        if (this.currentState === newState && newState !== InteractionState.GIZMO_DRAGGING) return;

        switch (this.currentState) {
            case InteractionState.DRAGGING_NODE:
                this.draggedNode?.endDrag();
                document.body.style.cursor = 'grab';
                this.draggedNode = null;
                this.space.isDragging = false;
                break;
            case InteractionState.RESIZING_NODE:
                this.resizedNode?.endResize();
                document.body.style.cursor = 'grab';
                this.resizedNode = null;
                this.space.isDragging = false;
                break;
            case InteractionState.GIZMO_DRAGGING:
                if (this.gizmo && this.draggedGizmoHandleInfo?.object) {
                    this.gizmo.setHandleActive(this.draggedGizmoHandleInfo.object, false);
                }
                this.draggedGizmoHandleInfo = null;
                this.selectedNodesInitialPositions.clear();
                this.selectedNodesInitialQuaternions.clear();
                this.selectedNodesInitialScales.clear();
                this.multiSelectionHelper?.position.set(0, 0, 0);
                this.multiSelectionHelper?.quaternion.identity();
                this.multiSelectionHelper?.scale.set(1, 1, 1);

                document.body.style.cursor = this.gizmo?.visible ? 'default' : 'grab';
                this.space.isDragging = false;
                break;
            case InteractionState.PANNING:
                this.space.plugins.getPlugin('CameraPlugin')?.endPan();
                document.body.style.cursor = 'grab';
                break;
            case InteractionState.LINKING_NODE:
                document.body.style.cursor = 'grab';
                $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
                break;
            case InteractionState.FRACTAL_HUB_ACTIVE: // Cleanup when leaving FRACTAL_HUB_ACTIVE
                // If manipulators were visible and we are not transitioning to FRACTAL_DRAGGING,
                // they might need to be explicitly hidden if the new state is IDLE.
                // However, _onSelectionChanged or specific actions should handle hiding them.
                // For now, just reset cursor if not handled by subsequent state.
                document.body.style.cursor = 'grab';
                break;
            case InteractionState.FRACTAL_DRAGGING: // Cleanup when leaving FRACTAL_DRAGGING
                if (this.draggedFractalElementInfo?.element) {
                     // Ensure originalColor is available or use current material color
                    const originalColor = this.draggedFractalElementInfo.element.userData.originalColor ||
                                          (this.draggedFractalElementInfo.element.material.color ?
                                           this.draggedFractalElementInfo.element.material.color.clone() :
                                           new THREE.Color(0xffffff)); // Fallback
                    setFractalElementActive(this.draggedFractalElementInfo.element, false, originalColor);
                }
                this.draggedFractalElementInfo = null;
                this.selectedNodesInitialPositions.clear(); // Clear stored initial positions
                // Cursor will be set by the new state (e.g., FRACTAL_HUB_ACTIVE or IDLE)
                this.space.isDragging = false;
                break;
        }

        const oldState = this.currentState; // Store old state before updating
        this.currentState = newState;

        switch (newState) {
            case InteractionState.DRAGGING_NODE: {
                this.draggedNode = data.node;
                this.draggedNodeInitialWorldPos.copy(this.draggedNode.position);
                if (this.draggedNode.mesh) this.draggedNodeInitialQuaternion.copy(this.draggedNode.mesh.quaternion);
                this.draggedNode.startDrag();
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (!camera) {
                    this._transitionToState(InteractionState.IDLE);
                    return;
                }
                const cameraForward = new THREE.Vector3();
                camera.getWorldDirection(cameraForward);
                this.dragInteractionPlane.setFromNormalAndCoplanarPoint(cameraForward, this.draggedNodeInitialWorldPos);
                const raycaster = new THREE.Raycaster();
                const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera);
                const initialIntersectionPoint = new THREE.Vector3();
                if (raycaster.ray.intersectPlane(this.dragInteractionPlane, initialIntersectionPoint)) {
                    this.dragOffset.subVectors(initialIntersectionPoint, this.draggedNodeInitialWorldPos);
                } else {
                    const fallbackWorldPos = this.space.screenToWorld(
                        this.pointerState.clientX,
                        this.pointerState.clientY,
                        this.draggedNodeInitialWorldPos.z
                    );
                    this.dragOffset = fallbackWorldPos
                        ? fallbackWorldPos.sub(this.draggedNode.position)
                        : new THREE.Vector3();
                }
                document.body.style.cursor = 'grabbing';
                this.space.isDragging = true;
                break;
            }
            case InteractionState.RESIZING_NODE: {
                this.resizedNode = data.node;
                this.resizedNode.startResize();
                this.space.isDragging = true;
                this.resizeStartPointerPos = { x: this.pointerState.clientX, y: this.pointerState.clientY };
                this.activeResizeHandleType = data.handleType || null;
                if (!this.resizedNode.mesh) {
                    this._transitionToState(InteractionState.IDLE);
                    return;
                }
                this.resizeNodeInitialMatrixWorld.copy(this.resizedNode.mesh.matrixWorld);
                this.resizeStartNodeScale.copy(this.resizedNode.mesh.scale);
                const actualSize = this.resizedNode.getActualSize();
                if (actualSize) this.resizeStartNodeSize.copy(actualSize);
                else this.resizeStartNodeSize.copy(this.resizedNode.mesh.scale);
                const handleObject = data.metaframeHandleInfo?.object;
                if (handleObject) {
                    const handleWorldPos = handleObject.getWorldPosition(new THREE.Vector3());
                    const nodeWorldPos = this.resizedNode.mesh.getWorldPosition(new THREE.Vector3());
                    this.resizeStartHandleLocalPos.subVectors(handleWorldPos, nodeWorldPos);
                    const inverseNodeWorldQuaternion = this.resizedNode.mesh
                        .getWorldQuaternion(new THREE.Quaternion())
                        .invert();
                    this.resizeStartHandleLocalPos.applyQuaternion(inverseNodeWorldQuaternion);
                } else {
                    const halfSize = this.resizeStartNodeSize.clone().multiplyScalar(0.5);
                    switch (this.activeResizeHandleType) {
                        case 'topLeft':
                            this.resizeStartHandleLocalPos.set(-halfSize.x, halfSize.y, 0);
                            break;
                        case 'topRight':
                            this.resizeStartHandleLocalPos.set(halfSize.x, halfSize.y, 0);
                            break;
                        case 'bottomLeft':
                            this.resizeStartHandleLocalPos.set(-halfSize.x, -halfSize.y, 0);
                            break;
                        case 'bottomRight':
                            this.resizeStartHandleLocalPos.set(halfSize.x, -halfSize.y, 0);
                            break;
                        default:
                            this.resizeStartHandleLocalPos.set(0, 0, 0);
                    }
                }
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (camera) {
                    const nodeLocalZAxisInWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(
                        this.resizedNode.mesh.getWorldQuaternion(new THREE.Quaternion())
                    );
                    const initialHandleWorldPos = this.resizeStartHandleLocalPos
                        .clone()
                        .applyMatrix4(this.resizeNodeInitialMatrixWorld);
                    this.resizeInteractionPlane.setFromNormalAndCoplanarPoint(
                        nodeLocalZAxisInWorld,
                        initialHandleWorldPos
                    );
                } else {
                    this.resizeInteractionPlane.setComponents(0, 0, 1, -this.resizedNode.position.z);
                }
                document.body.style.cursor = this._getCursorForHandle(this.activeResizeHandleType) || 'nwse-resize';
                break;
            }
            case InteractionState.GIZMO_DRAGGING: {
                this.draggedGizmoHandleInfo = data.gizmoHandleInfo;
                this.gizmoDragStartPointerWorldPos.copy(data.initialPointerWorldPos);

                this.selectedNodesInitialPositions.clear();
                this.selectedNodesInitialQuaternions.clear();
                this.selectedNodesInitialScales.clear();
                data.selectedNodes.forEach((node) => {
                    this.selectedNodesInitialPositions.set(node.id, node.position.clone());
                    const worldQuaternion = node.mesh
                        ? node.mesh.getWorldQuaternion(new THREE.Quaternion())
                        : new THREE.Quaternion();
                    this.selectedNodesInitialQuaternions.set(node.id, worldQuaternion);
                    const worldScale = node.mesh
                        ? node.mesh.getWorldScale(new THREE.Vector3())
                        : new THREE.Vector3(1, 1, 1);
                    this.selectedNodesInitialScales.set(node.id, worldScale);
                });

                if (data.selectedNodes.size > 1 && this.multiSelectionHelper && this.gizmo) {
                    this.multiSelectionHelper.position.copy(this.gizmo.position);
                    this.multiSelectionHelper.quaternion.copy(this.gizmo.quaternion); // Align helper with gizmo itself
                    this.multiSelectionHelper.scale.set(1, 1, 1); // Reset scale for helper
                    this.multiSelectionHelper.updateMatrixWorld(true);

                    data.selectedNodes.forEach((node) => {
                        const initialPos = this.selectedNodesInitialPositions.get(node.id);
                        if (initialPos) {
                            // Store offset in local coords of the multiSelectionHelper
                            const localOffset = this.multiSelectionHelper.worldToLocal(initialPos.clone());
                            node.userData.initialOffsetFromMultiSelectCenter = localOffset;
                        }
                    });
                }

                if (this.gizmo && this.draggedGizmoHandleInfo.object) {
                    this.gizmo.setHandleActive(this.draggedGizmoHandleInfo.object, true);
                }
                document.body.style.cursor = 'grabbing';
                this.space.isDragging = true;
                break;
            }
            case InteractionState.PANNING: {
                this.space.plugins
                    .getPlugin('CameraPlugin')
                    ?.startPan(this.pointerState.clientX, this.pointerState.clientY);
                document.body.style.cursor = 'grabbing';
                break;
            }
            case InteractionState.LINKING_NODE: {
                document.body.style.cursor = 'crosshair';
                this._createTempLinkLine(data.sourceNode);
                break;
            }
            case InteractionState.FRACTAL_HUB_ACTIVE: {
                // AGH is visible, manipulators might be too. Cursor is default or pointer if over element.
                document.body.style.cursor = 'default'; // Or handled by _handleHover
                // This state implies AGH is visible. Manipulators visibility is toggled by direct AGH click.
                // Ensure scaling is updated if necessary.
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (camera && this.adaptiveGeometricHub?.visible) {
                    const worldPosAGH = this.adaptiveGeometricHub.getWorldPosition(new THREE.Vector3());
                    updateFractalUIScale(this.adaptiveGeometricHub, camera, 500, worldPosAGH);
                    if (this.fractalAxisManipulators?.visible) {
                        const worldPosAxes = this.fractalAxisManipulators.getWorldPosition(new THREE.Vector3());
                        updateFractalUIScale(this.fractalAxisManipulators, camera, 500, worldPosAxes);
                    }
                }
                break;
            }
            case InteractionState.FRACTAL_DRAGGING: {
                // Data should include { draggedFractalInfo, selectedNodes }
                // this.draggedFractalElementInfo is set by _onPointerDown before transitioning to this state.
                // this.selectedNodesInitialPositions is also set in _onPointerDown.
                document.body.style.cursor = 'grabbing';
                this.space.isDragging = true;
                break;
            }
            case InteractionState.IDLE: {
                // Ensure fractal UI elements are hidden if we transition to IDLE and they shouldn't be visible.
                // _onSelectionChanged normally handles this if selection is cleared.
                // If selection persists but interaction ends (e.g. Esc), AGH might stay if a node is selected.
                if (this._uiPluginCallbacks.getSelectedNodes()?.size === 0) {
                    this.adaptiveGeometricHub?.hide();
                    this.fractalAxisManipulators?.hide();
                } else if (this.adaptiveGeometricHub?.visible && !this.fractalAxisManipulators?.visible) {
                    // If only AGH is visible (manipulators were hidden), cursor can be default
                     document.body.style.cursor = 'default';
                } else {
                    // Fallback cursor if gizmo or nothing is relevant
                    document.body.style.cursor = this.gizmo?.visible ? 'default' : 'grab';
                }
                break;
            }
        }
        this.space.emit('interaction:stateChanged', { newState, oldState: oldState, data });
    }

    _onPointerDown = (e) => {
        if (this.activePointerId !== null && this.activePointerId !== e.pointerId) return;
        this.activePointerId = e.pointerId;
        this._updateNormalizedPointerState(e, true);
        const targetInfo = this._getTargetInfo(e);

        const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
        if (
            cameraPlugin?.getCameraMode() === 'free' &&
            cameraPlugin.getControls()?.isPointerLocked &&
            this.pointerState.button === 0
        )
            return;

        // Fractal UI Interaction takes highest precedence
        if (this.pointerState.button === 0 && targetInfo.fractalElementInfo) {
            e.preventDefault();
            e.stopPropagation();
            const { object: fractalObject, type: fractalType, axis: fractalAxis } = targetInfo.fractalElementInfo;
            const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();

            if (fractalType === 'agh' && selectedNodes.size === 1) {
                // Clicked on the Adaptive Geometric Hub
                if (this.fractalAxisManipulators) {
                    if (this.fractalAxisManipulators.visible) {
                        this.fractalAxisManipulators.visible = false;
                        // If a manipulator element was hovered, deactivate it and clear the hover state,
                        // as the manipulators are now hidden. This prevents unintended interactions (like semantic zoom)
                        // with a now-hidden element if the pointer hasn't moved.
                        if (this.hoveredFractalElement && this.fractalAxisManipulators.children.includes(this.hoveredFractalElement)) {
                            const originalColor = this.hoveredFractalElement.userData.originalColor ||
                                                  (this.hoveredFractalElement.material.color ?
                                                   this.hoveredFractalElement.material.color.clone() :
                                                   new THREE.Color(0xffffff)); // Fallback
                            setFractalElementActive(this.hoveredFractalElement, false, originalColor, false);
                            this.hoveredFractalElement = null;
                        }
                        this._transitionToState(InteractionState.IDLE);
                    } else {
                        const node = selectedNodes.values().next().value;
                        this.fractalAxisManipulators.position.copy(node.position);
                        // TODO: Set orientation of manipulators based on node or world, similar to gizmo
                        this.fractalAxisManipulators.quaternion.identity();
                        const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                        if (camera) updateFractalUIScale(this.fractalAxisManipulators, camera, 500, node.position);
                        this.fractalAxisManipulators.visible = true;
                        this._transitionToState(InteractionState.FRACTAL_HUB_ACTIVE);
                    }
                }
            } else if (fractalType === 'translate_axis' && selectedNodes.size > 0) {
                // Clicked on a fractal axis manipulator
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (!camera) return;

                const raycaster = new THREE.Raycaster();
                const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera);

                const intersects = raycaster.intersectObject(fractalObject, false);
                let initialPointerWorldPos = new THREE.Vector3();
                if (intersects.length > 0) {
                    initialPointerWorldPos.copy(intersects[0].point);
                } else {
                    // Fallback: project onto a plane (similar to gizmo logic)
                    const planeNormal = new THREE.Vector3();
                    camera.getWorldDirection(planeNormal).negate();
                    const interactionPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, fractalObject.getWorldPosition(new THREE.Vector3()));
                    if (!raycaster.ray.intersectPlane(interactionPlane, initialPointerWorldPos)) {
                        initialPointerWorldPos.copy(fractalObject.getWorldPosition(new THREE.Vector3()));
                    }
                }

                this.draggedFractalElementInfo = {
                    element: fractalObject,
                    type: fractalType,
                    axis: fractalAxis,
                    initialPointerWorldPos: initialPointerWorldPos.clone(),
                    // Store initial positions of selected nodes
                };

                this.selectedNodesInitialPositions.clear();
                 selectedNodes.forEach(node => {
                    this.selectedNodesInitialPositions.set(node.id, node.position.clone());
                });

                // Setup interaction plane (e.g., perpendicular to drag axis, or view plane)
                // For axis drag, often a line-plane intersection or point projection is used.
                // Let's use a view-aligned plane for simplicity for now, passing through the initial hit point.
                const viewDirection = camera.getWorldDirection(new THREE.Vector3()).negate();
                this.fractalUIInteractionPlane.setFromNormalAndCoplanarPoint(viewDirection, initialPointerWorldPos);

                // Ensure originalColor is available or use current material color
                const originalColorForGrab = fractalObject.userData.originalColor ||
                                           (fractalObject.material.color ?
                                            fractalObject.material.color.clone() :
                                            new THREE.Color(0xffffff)); // Fallback
                setFractalElementActive(fractalObject, true, originalColorForGrab, true); // isGrabbed = true

                this._transitionToState(InteractionState.FRACTAL_DRAGGING, {
                    draggedFractalInfo: this.draggedFractalElementInfo,
                    selectedNodes: selectedNodes
                });
            }
            this.contextMenu.hide();
            return;
        }

        // Gizmo Interaction (original)
        if (this.pointerState.button === 0 && targetInfo.gizmoHandleInfo) {
            e.preventDefault();
            e.stopPropagation();
            const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
            if (selectedNodes && selectedNodes.size > 0 && this.gizmo) {
                // Ensure gizmo exists
                // Store initial transforms for all selected nodes
                // This is now handled inside _transitionToState GIZMO_DRAGGING block

                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                const raycaster = new THREE.Raycaster();
                const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera);

                let initialPointerWorldPosOnGizmo = new THREE.Vector3();
                // Intersect with the specific handle mesh
                const intersects = raycaster.intersectObject(targetInfo.gizmoHandleInfo.object, false);
                if (intersects.length > 0) {
                    initialPointerWorldPosOnGizmo.copy(intersects[0].point);
                } else {
                    // Fallback: project onto a plane facing the camera, centered at the gizmo
                    // This is crucial for rotation handles where the click might not be exactly on the mesh
                    const gizmoPlaneNormal = new THREE.Vector3();
                    camera.getWorldDirection(gizmoPlaneNormal); // Normal faces away from camera
                    const interactionPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
                        gizmoPlaneNormal.negate(),
                        this.gizmo.position
                    );
                    if (!raycaster.ray.intersectPlane(interactionPlane, initialPointerWorldPosOnGizmo)) {
                        // Further fallback if plane intersection fails (should be rare)
                        initialPointerWorldPosOnGizmo.copy(this.gizmo.position);
                    }
                }

                this._transitionToState(InteractionState.GIZMO_DRAGGING, {
                    gizmoHandleInfo: targetInfo.gizmoHandleInfo,
                    initialPointerWorldPos: initialPointerWorldPosOnGizmo,
                    selectedNodes: selectedNodes, // Pass the set of selected nodes
                });
            }
            this.contextMenu.hide();
            return;
        }

        if (this.pointerState.button === 1) {
            e.preventDefault();
            if (targetInfo.node) this.space.emit('ui:request:autoZoomNode', targetInfo.node);
            return;
        }

        if (this.pointerState.button === 0) {
            if (targetInfo.nodeControls) {
                e.preventDefault();
                e.stopPropagation();
                this._handleNodeControlButtonClick(targetInfo.nodeControls, targetInfo.node);
                return;
            }
            if (targetInfo.metaframeHandleInfo && targetInfo.metaframeHandleInfo.node) {
                e.preventDefault();
                e.stopPropagation();
                const { node: handleNode, type: handleType } = targetInfo.metaframeHandleInfo;
                if (handleType === 'dragHandle') {
                    this._transitionToState(InteractionState.DRAGGING_NODE, { node: handleNode });
                    this._uiPluginCallbacks.setSelectedNode(handleNode, e.shiftKey);
                } else {
                    this._transitionToState(InteractionState.RESIZING_NODE, { node: handleNode, handleType });
                    this._uiPluginCallbacks.setSelectedNode(handleNode, false);
                }
                this.contextMenu.hide();
                return;
            }
            if (targetInfo.node) {
                e.preventDefault();
                if (targetInfo.contentEditable || targetInfo.interactiveElement) {
                    e.stopPropagation();
                    this._uiPluginCallbacks.setSelectedNode(targetInfo.node, e.shiftKey);
                    this.contextMenu.hide();
                    return;
                }
                this._transitionToState(InteractionState.DRAGGING_NODE, { node: targetInfo.node });
                this._uiPluginCallbacks.setSelectedNode(targetInfo.node, e.shiftKey);
                this.contextMenu.hide();
                return;
            }
            if (targetInfo.intersectedEdge) {
                e.preventDefault();
                this._uiPluginCallbacks.setSelectedEdge(targetInfo.intersectedEdge, e.shiftKey);
                this.contextMenu.hide();
                return;
            }
            this._transitionToState(InteractionState.PANNING);
            this.contextMenu.hide();
            if (!e.shiftKey) this._uiPluginCallbacks.setSelectedNode(null, false);
        }
    };

    _onPointerMove = (e) => {
        if (e.pointerId !== this.activePointerId && this.activePointerId !== null) return;
        const prevX = this.pointerState.clientX;
        const prevY = this.pointerState.clientY;
        this._updateNormalizedPointerState(e);
        const dx = this.pointerState.clientX - prevX;
        const dy = this.pointerState.clientY - prevY;

        switch (this.currentState) {
            case InteractionState.IDLE:
                this._handleHover(e);
                break;
            case InteractionState.FRACTAL_DRAGGING: {
                e.preventDefault();
                if (!this.draggedFractalElementInfo || !this.space.isDragging) break;
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (!camera) break;
                const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
                if (!selectedNodes || selectedNodes.size === 0) break;

                const raycaster = new THREE.Raycaster();
                const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera);

                const currentPointerWorldPos = new THREE.Vector3();
                if (!raycaster.ray.intersectPlane(this.fractalUIInteractionPlane, currentPointerWorldPos)) break;

                const dragDelta = new THREE.Vector3().subVectors(currentPointerWorldPos, this.draggedFractalElementInfo.initialPointerWorldPos);

                const axisVector = new THREE.Vector3();
                if (this.draggedFractalElementInfo.axis === 'x') axisVector.set(1,0,0);
                else if (this.draggedFractalElementInfo.axis === 'y') axisVector.set(0,1,0);
                else if (this.draggedFractalElementInfo.axis === 'z') axisVector.set(0,0,1);

                // TODO: Consider fractalAxisManipulators' world orientation if not identity.
                // For prototype, assume world axes alignment for the manipulators.
                // If manipulators could be oriented with the node, apply this.fractalAxisManipulators.quaternion to axisVector.
                const projectedDelta = dragDelta.clone().projectOnVector(axisVector);

                selectedNodes.forEach(node => {
                    const initialPos = this.selectedNodesInitialPositions.get(node.id);
                    if (initialPos) {
                        const newPos = initialPos.clone().add(projectedDelta);
                        node.setPosition(newPos.x, newPos.y, newPos.z);
                    }
                });

                // Update AGH and Manipulators to follow the (first) selected node
                const primaryNode = selectedNodes.values().next().value;
                if (primaryNode && this.adaptiveGeometricHub && this.fractalAxisManipulators) {
                    this.adaptiveGeometricHub.position.copy(primaryNode.position);
                    this.fractalAxisManipulators.position.copy(primaryNode.position);
                     if (camera) { // Also update their scale as they move
                        updateFractalUIScale(this.adaptiveGeometricHub, camera, 500, primaryNode.position);
                        updateFractalUIScale(this.fractalAxisManipulators, camera, 500, primaryNode.position);
                    }
                }
                this.space.emit('graph:nodes:transformed', { nodes: Array.from(selectedNodes), transformationType: 'translate' });
                break;
            }
            case InteractionState.GIZMO_DRAGGING:
                e.preventDefault();
                this._handleGizmoDrag(e);
                break;
            case InteractionState.DRAGGING_NODE:
                e.preventDefault();
                if (this.draggedNode) {
                    const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                    if (!camera) break;
                    const raycaster = new THREE.Raycaster();
                    const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                    raycaster.setFromCamera(pointerNDC, camera);
                    let currentInteractionPlane = this.dragInteractionPlane;
                    if (e.altKey) {
                        const planeShiftAmount = dy * ALT_Z_DRAG_SENSITIVITY;
                        const cameraForward = new THREE.Vector3();
                        camera.getWorldDirection(cameraForward);
                        this.draggedNodeInitialWorldPos.addScaledVector(cameraForward, planeShiftAmount);
                        this.dragInteractionPlane.setFromNormalAndCoplanarPoint(
                            cameraForward,
                            this.draggedNodeInitialWorldPos
                        );
                        currentInteractionPlane = this.dragInteractionPlane;
                    }
                    const intersectionPoint = new THREE.Vector3();
                    if (raycaster.ray.intersectPlane(currentInteractionPlane, intersectionPoint)) {
                        const primaryNodeNewCalculatedPos = intersectionPoint.clone().sub(this.dragOffset);
                        const dragDelta = primaryNodeNewCalculatedPos.clone().sub(this.draggedNode.position);
                        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
                        if (selectedNodes?.size > 0 && selectedNodes.has(this.draggedNode)) {
                            selectedNodes.forEach((sNode) => {
                                const newPos =
                                    sNode === this.draggedNode
                                        ? primaryNodeNewCalculatedPos
                                        : sNode.position.clone().add(dragDelta);
                                sNode.drag(newPos);
                                if (sNode.mesh) sNode.mesh.quaternion.copy(this.draggedNodeInitialQuaternion);
                            });
                        } else {
                            this.draggedNode.drag(primaryNodeNewCalculatedPos);
                            if (this.draggedNode.mesh)
                                this.draggedNode.mesh.quaternion.copy(this.draggedNodeInitialQuaternion);
                        }
                        this.space.emit('graph:node:dragged', {
                            node: this.draggedNode,
                            position: primaryNodeNewCalculatedPos,
                        });
                    }
                }
                break;
            case InteractionState.RESIZING_NODE:
                e.preventDefault();
                if (this.resizedNode && this.resizedNode.mesh) {
                    const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                    if (!camera) break;
                    const raycaster = new THREE.Raycaster();
                    const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                    raycaster.setFromCamera(pointerNDC, camera);
                    const currentHandleWorldPosOnPlane = new THREE.Vector3();
                    if (!raycaster.ray.intersectPlane(this.resizeInteractionPlane, currentHandleWorldPosOnPlane)) break;
                    const initialHandleWorldPos = this.resizeStartHandleLocalPos
                        .clone()
                        .applyMatrix4(this.resizeNodeInitialMatrixWorld);
                    const worldDisplacement = new THREE.Vector3().subVectors(
                        currentHandleWorldPosOnPlane,
                        initialHandleWorldPos
                    );
                    const inverseInitialNodeMatrix = new THREE.Matrix4()
                        .copy(this.resizeNodeInitialMatrixWorld)
                        .invert();
                    const worldDisplacementEndPoint = initialHandleWorldPos.clone().add(worldDisplacement);
                    const localEndPoint = worldDisplacementEndPoint.clone().applyMatrix4(inverseInitialNodeMatrix);
                    const localStartPoint = initialHandleWorldPos.clone().applyMatrix4(inverseInitialNodeMatrix);
                    const localDisplacement = new THREE.Vector3().subVectors(localEndPoint, localStartPoint);
                    let deltaWidth = 0,
                        deltaHeight = 0;
                    if (this.activeResizeHandleType.includes('Left')) deltaWidth = -localDisplacement.x;
                    else if (this.activeResizeHandleType.includes('Right')) deltaWidth = localDisplacement.x;
                    if (this.activeResizeHandleType.includes('Top')) deltaHeight = localDisplacement.y;
                    else if (this.activeResizeHandleType.includes('Bottom')) deltaHeight = -localDisplacement.y;
                    let newWorldWidth = Math.max(20, this.resizeStartNodeSize.x + deltaWidth);
                    let newWorldHeight = Math.max(20, this.resizeStartNodeSize.y + deltaHeight);
                    const newWorldDimensions = new THREE.Vector3(
                        newWorldWidth,
                        newWorldHeight,
                        this.resizeStartNodeSize.z
                    );
                    this.resizedNode.resize(newWorldDimensions);
                    this.space.emit('graph:node:resized', {
                        node: this.resizedNode,
                        ...(this.resizedNode instanceof HtmlNode && {
                            size: { ...this.resizedNode.size },
                            scale: {
                                x: newWorldWidth / this.resizedNode.baseSize.width,
                                y: newWorldHeight / this.resizedNode.baseSize.height,
                                z: this.resizeStartNodeScale.z,
                            },
                        }),
                        ...(!(this.resizedNode instanceof HtmlNode) && { worldDimensions: { ...newWorldDimensions } }),
                    });
                }
                break;
            case InteractionState.PANNING:
                e.preventDefault();
                this.space.plugins.getPlugin('CameraPlugin')?.pan(dx, dy);
                break;
            case InteractionState.LINKING_NODE:
                e.preventDefault();
                this._updateTempLinkLine(this.pointerState.clientX, this.pointerState.clientY);
                const targetInfo = this._getTargetInfo(e);
                $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
                const targetElement = targetInfo.node?.htmlElement ?? targetInfo.node?.labelObject?.element;
                if (
                    targetInfo.node &&
                    targetInfo.node !== this._uiPluginCallbacks.getLinkSourceNode() &&
                    targetElement
                ) {
                    targetElement.classList.add('linking-target');
                }
                break;
        }
    };

    _onPointerUp = (e) => {
        if (e.pointerId !== this.activePointerId) return;
        this._updateNormalizedPointerState(e, false);
        const currentInteractionState = this.currentState;

        if (!this.pointerState.isDraggingThresholdMet && e.button === 0) {
            const targetInfo = this._getTargetInfo(e);
            if (
                targetInfo.node instanceof HtmlNode &&
                targetInfo.node.data.editable &&
                targetInfo.element?.closest('.node-content') ===
                    targetInfo.node.htmlElement.querySelector('.node-content')
            ) {
                // This condition is met when a user clicks (not drags) on the content area of an editable HTML node.
                // Future: Could potentially auto-focus or enter an edit mode here if not already handled by browser default behavior.
                // For now, no specific action is taken, allowing default browser behavior for contentEditable.
            }
        }

        if (currentInteractionState === InteractionState.LINKING_NODE && e.button === 0) {
            this._uiPluginCallbacks.completeLinking(this.pointerState.clientX, this.pointerState.clientY);
        }

        const targetInfo = this._getTargetInfo(e); // Get target info for context on pointer up

        if (currentInteractionState === InteractionState.FRACTAL_DRAGGING) {
            if (this.draggedFractalElementInfo?.element) {
                const element = this.draggedFractalElementInfo.element;
                // Use the stored original color for deactivation, isGrabbed defaults to false
                const originalColor = element.userData.originalColor ||
                                      (element.material.color ? element.material.color.clone() : new THREE.Color(0xffffff));
                setFractalElementActive(element, false, originalColor, false);
            }
            this.draggedFractalElementInfo = null;
            this.selectedNodesInitialPositions.clear();
            // After dragging a fractal element, if manipulators are still meant to be visible,
            // transition to FRACTAL_HUB_ACTIVE. Otherwise, IDLE.
            if (this.fractalAxisManipulators && this.fractalAxisManipulators.visible) {
                 this._transitionToState(InteractionState.FRACTAL_HUB_ACTIVE);
            } else {
                 this._transitionToState(InteractionState.IDLE);
            }
        } else if (targetInfo.fractalElementInfo?.type === 'agh' && this.fractalAxisManipulators?.visible && this.currentState !== InteractionState.FRACTAL_DRAGGING && !this.pointerState.isDraggingThresholdMet) {
            // This case handles a click on AGH that toggled manipulators on. We want to stay in FRACTAL_HUB_ACTIVE.
            // No explicit transition needed if already in FRACTAL_HUB_ACTIVE from _onPointerDown
            // However, if _onPointerDown transitioned to FRACTAL_HUB_ACTIVE, and no drag occurred, we are good.
            // If a drag *almost* happened but didn't meet threshold, pointerState.isDraggingThresholdMet is false.
            // If we are in IDLE but AGH is clicked to show manipulators, _onPointerDown handles transition.
            // This block might be redundant if _onPointerDown correctly sets FRACTAL_HUB_ACTIVE.
            // The main goal is: if manipulators are visible after a click (not drag), state should reflect that.
        } else if (this.currentState !== InteractionState.IDLE) {
             this._transitionToState(InteractionState.IDLE);
        }

        this.activePointerId = null;
    };

    _handleNodeControlButtonClick(buttonEl, node) {
        if (!(node instanceof HtmlNode)) return;
        const actionClass = [...buttonEl.classList].find((cls) => cls.startsWith('node-') && !cls.includes('button'));
        const action = actionClass?.substring('node-'.length);
        switch (action) {
            case 'delete':
                this.space.emit('ui:request:confirm', {
                    message: `Delete node "${node.id.substring(0, 10)}..."?`,
                    onConfirm: () => this.space.emit('ui:request:removeNode', node.id),
                });
                break;
            case 'content-zoom-in':
                this.space.emit('ui:request:adjustContentScale', { node, factor: 1.15 });
                break;
            case 'content-zoom-out':
                this.space.emit('ui:request:adjustContentScale', { node, factor: 1 / 1.15 });
                break;
            case 'grow':
                this.space.emit('ui:request:adjustNodeSize', { node, factor: 1.2 });
                break;
            case 'shrink':
                this.space.emit('ui:request:adjustNodeSize', { node, factor: 1 / 1.2 });
                break;
        }
    }

    _onContextMenu = (e) => {
        e.preventDefault();
        this._updateNormalizedPointerState(e);
        this.contextMenu.hide();
        const targetInfo = this._getTargetInfo(e);
        if (targetInfo.gizmoHandleInfo) return;
        this.contextMenu.show(e.clientX, e.clientY, {
            node: targetInfo.node,
            intersectedEdge: targetInfo.intersectedEdge,
            shiftKey: e.shiftKey,
        });
    };

    _onDocumentClick = (e) => {
        if (
            this.contextMenu.contextMenuElement.contains(e.target) ||
            this.contextMenu.contextMenuElement.style.display === 'none'
        )
            return;
        if (this.edgeMenu.edgeMenuObject?.element?.contains(e.target)) return;
        if (this.confirmDialog.confirmDialogElement.contains(e.target)) return;
        if (this.hudManager.keyboardShortcutsDialog.keyboardShortcutsDialogElement?.contains(e.target)) return;
        if (this.hudManager.layoutSettingsDialog.layoutSettingsDialogElement?.contains(e.target)) return;

        this.contextMenu.hide();
        if (this.edgeMenu.edgeMenuObject) {
            const targetInfo = this._getTargetInfo(e);
            const selectedEdges = this._uiPluginCallbacks.getSelectedEdges();
            const clickedSelectedEdge = targetInfo.intersectedEdge && selectedEdges?.has(targetInfo.intersectedEdge);
            if (!clickedSelectedEdge) this._uiPluginCallbacks.setSelectedEdge(null, false);
        }
    };

    _onKeyDown = (e) => {
        const activeEl = document.activeElement;
        const isEditingText =
            activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
        if (isEditingText && e.key !== 'Escape') return;

        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
        const selectedEdges = this._uiPluginCallbacks.getSelectedEdges();
        const primarySelectedNode = selectedNodes.size > 0 ? selectedNodes.values().next().value : null;
        const primarySelectedEdge = selectedEdges.size > 0 ? selectedEdges.values().next().value : null;
        let handled = false;
        let msg = ''; // msg variable declared here

        switch (e.key) {
            case 'Delete':
            case 'Backspace': {
                if (primarySelectedNode) {
                    msg = // msg is assigned here
                        selectedNodes.size > 1
                            ? `Delete ${selectedNodes.size} selected nodes?`
                            : `Delete node "${primarySelectedNode.id.substring(0, 10)}..."?`;
                    this.space.emit('ui:request:confirm', {
                        message: msg,
                        onConfirm: () =>
                            selectedNodes.forEach((n) => this.space.emit('ui:request:removeNode', n.id)),
                    });
                    handled = true;
                } else if (primarySelectedEdge) {
                    msg = // msg is assigned here
                        selectedEdges.size > 1
                            ? `Delete ${selectedEdges.size} selected edges?`
                            : `Delete edge "${primarySelectedEdge.id.substring(0, 10)}..."?`;
                    this.space.emit('ui:request:confirm', {
                        message: msg,
                        onConfirm: () =>
                            selectedEdges.forEach((edge) => this.space.emit('ui:request:removeEdge', edge.id)),
                    });
                    handled = true;
                }
                break;
            }
            case 'Escape': {
                if (this._uiPluginCallbacks.getIsLinking()) {
                    this._uiPluginCallbacks.cancelLinking();
                    handled = true;
                } else if (this.hudManager.isLayoutSettingsDialogVisible()) {
                    this.hudManager.layoutSettingsDialog.hide();
                    handled = true;
                } else if (this.hudManager.isKeyboardShortcutsDialogVisible()) {
                    this.hudManager.keyboardShortcutsDialog.hide();
                    handled = true;
                } else if (this.contextMenu.contextMenuElement.style.display === 'block') {
                    this.contextMenu.hide();
                    handled = true;
                } else if (this.confirmDialog.confirmDialogElement.style.display === 'block') {
                    this.confirmDialog.hide();
                    handled = true;
                } else if (this.edgeMenu.edgeMenuObject) {
                    this._uiPluginCallbacks.setSelectedEdge(null, false);
                    handled = true;
                } else if (selectedNodes.size > 0 || selectedEdges.size > 0) {
                    this._uiPluginCallbacks.setSelectedNode(null, false);
                    handled = true;
                }
                const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
                if (camPlugin?.getCameraMode() === 'free' && camPlugin.getControls()?.isPointerLocked) {
                    camPlugin.exitPointerLock();
                    handled = true;
                }
                break;
            }
            case 'Enter':
                if (primarySelectedNode instanceof HtmlNode && primarySelectedNode.data.editable && !isEditingText) {
                    primarySelectedNode.htmlElement?.querySelector('.node-content')?.focus();
                    handled = true;
                }
                break;
            case '+':
            case '=': {
                if (primarySelectedNode instanceof HtmlNode) {
                    const eventName =
                        e.ctrlKey || e.metaKey ? 'ui:request:adjustNodeSize' : 'ui:request:adjustContentScale';
                    const factor = e.ctrlKey || e.metaKey ? 1.2 : 1.15;
                    this.space.emit(eventName, { node: primarySelectedNode, factor });
                    handled = true;
                }
                break;
            }
            case '-':
            case '_': {
                if (primarySelectedNode instanceof HtmlNode) {
                    const eventName =
                        e.ctrlKey || e.metaKey ? 'ui:request:adjustNodeSize' : 'ui:request:adjustContentScale';
                    const factor = e.ctrlKey || e.metaKey ? 1 / 1.2 : 1 / 1.15;
                    this.space.emit(eventName, { node: primarySelectedNode, factor });
                    handled = true;
                }
                break;
            }
            case ' ': {
                if (primarySelectedNode) {
                    this.space.emit('ui:request:focusOnNode', primarySelectedNode, 0.5, true);
                    handled = true;
                } else if (primarySelectedEdge) {
                    const midPoint = new THREE.Vector3().lerpVectors(
                        primarySelectedEdge.source.position,
                        primarySelectedEdge.target.position,
                        0.5
                    );
                    const dist = primarySelectedEdge.source.position.distanceTo(primarySelectedEdge.target.position);
                    const cam = this.space.plugins.getPlugin('CameraPlugin');
                    cam?.pushState();
                    cam?.moveTo(midPoint.x, midPoint.y, midPoint.z + dist * 0.6 + 100, 0.5, midPoint);
                    handled = true;
                } else {
                    this.space.emit('ui:request:centerView');
                    handled = true;
                }
                break;
            }
        }
        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    _onWheel = (e) => {
        const targetInfo = this._getTargetInfo(e);
        if (targetInfo.element?.closest('.node-content')?.scrollHeight > targetInfo.element?.clientHeight) return;
        if (targetInfo.element?.closest('.edge-menu-frame input[type="range"]')) return;

        if ((e.ctrlKey || e.metaKey) && targetInfo.node instanceof HtmlNode) {
            e.preventDefault();
            e.stopPropagation();
            const scaleFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            this.space.emit('ui:request:adjustContentScale', { node: targetInfo.node, factor: scaleFactor });
        } else {
            // Semantic Zoom Placeholder for Fractal UI
            if (this.hoveredFractalElement &&
                this.hoveredFractalElement.userData.isFractalUIElement &&
                this.hoveredFractalElement.userData.axis &&
                (this.currentState === InteractionState.FRACTAL_HUB_ACTIVE || (this.currentState === InteractionState.IDLE && this.adaptiveGeometricHub?.visible))) {

                e.preventDefault();
                e.stopPropagation();
                console.log("Semantic zoom on axis:", this.hoveredFractalElement.userData.axis, "deltaY:", e.deltaY);

                // Placeholder visual feedback: temporarily change color
                const axisType = this.hoveredFractalElement.userData.axis;
                console.log("Semantic zoom on axis:", axisType, "deltaY:", e.deltaY); // Per TODO_FractalUI.md placeholder

                // Initialize or update zoom level stored on the hovered element's userData
                if (this.hoveredFractalElement.userData.zoomLevel === undefined) {
                    this.hoveredFractalElement.userData.zoomLevel = 0;
                }
                const currentZoomLevel = this.hoveredFractalElement.userData.zoomLevel;
                let newZoomLevel = currentZoomLevel;

                if (e.deltaY < 0) { // Zoom in
                    newZoomLevel = Math.min(3, currentZoomLevel + 1); // Cap zoom-in level
                } else { // Zoom out
                    newZoomLevel = Math.max(-2, currentZoomLevel - 1); // Cap zoom-out level
                }
                this.hoveredFractalElement.userData.zoomLevel = newZoomLevel;

                // Apply the semantic zoom visual change only for the X-axis in this iteration
                if (this.fractalAxisManipulators && axisType === 'x') {
                    applySemanticZoomToAxis(this.fractalAxisManipulators, axisType, newZoomLevel);

                    // Clear any existing timeout to prevent multiple reverts or premature resets
                    if (this.hoveredFractalElement.userData.zoomResetTimeout) {
                        clearTimeout(this.hoveredFractalElement.userData.zoomResetTimeout);
                        this.hoveredFractalElement.userData.zoomResetTimeout = null;
                    }

                    // Set a timeout to revert the semantic zoom effect to the normal hover state.
                    // This makes the zoom visual "temporary" for this iteration.
                    this.hoveredFractalElement.userData.zoomResetTimeout = setTimeout(() => {
                        // Check if the element is still part of the visible manipulators and still the one that was zoomed
                        if (this.fractalAxisManipulators &&
                            this.hoveredFractalElement &&
                            this.hoveredFractalElement.userData.axis === axisType &&
                            this.hoveredFractalElement.userData.zoomResetTimeout) { // Check if this timeout is still the active one

                            applySemanticZoomToAxis(this.fractalAxisManipulators, axisType, 0); // Reset visual scale to normal
                            this.hoveredFractalElement.userData.zoomLevel = 0; // Reset stored zoom level

                            // Re-apply the standard hover effect if the element is still hovered.
                            // setFractalElementActive handles storing/using originalColor internally.
                            const originalColor = this.hoveredFractalElement.userData.originalColor ||
                                                  (this.hoveredFractalElement.material.color ? this.hoveredFractalElement.material.color.clone() : new THREE.Color(0xffffff));
                            setFractalElementActive(this.hoveredFractalElement, true, originalColor, false);
                        }
                        if (this.hoveredFractalElement) { // Ensure hoveredFractalElement still exists before trying to clear timeout property
                           this.hoveredFractalElement.userData.zoomResetTimeout = null;
                        }
                    }, 500); // Revert after 0.5 seconds
                } else {
                     // Placeholder for other axes or if manipulators are not found
                    console.log(`Semantic zoom visual not yet implemented for axis ${axisType} or manipulators not found.`);
                }
                return; // Prevent camera zoom
            }
            // Default camera zoom
            e.preventDefault();
            this.space.emit('ui:request:zoomCamera', e.deltaY);
        }
    };

    /**
     * Determines what object or UI element is under the pointer.
     * Prioritizes HTML elements, then Gizmo handles, then other graph objects.
     * @private
     * @param {MouseEvent|PointerEvent} event The pointer event.
     * @returns {object} Information about the target.
     * @property {HTMLElement} element - The direct HTML element under pointer.
     * @property {HTMLElement} [nodeElement] - The .node-common ancestor, if any.
     * @property {HTMLElement} [nodeControls] - Clicked node control button, if any.
     * @property {HTMLElement} [contentEditable] - Clicked contentEditable element, if any.
     * @property {HTMLElement} [interactiveElement] - Clicked general interactive HTML element, if any.
     * @property {Node} [node] - The SpaceGraph Node under pointer, if any.
     * @property {Edge} [intersectedEdge] - The SpaceGraph Edge under pointer, if any.
     * @property {object} [metaframeHandleInfo] - Info if a Metaframe handle was hit.
     * @property {GizmoHandleInfo} [gizmoHandleInfo] - Info if a Gizmo handle was hit.
     */
    _getTargetInfo(event) {
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const nodeElement = element?.closest('.node-common');
        const nodeControlsButton = element?.closest('.node-controls button');
        const contentEditableEl = element?.closest('[contenteditable="true"]');
        const interactiveEl = element?.closest('button, input, textarea, select, a, .clickable');

        let graphNode = nodeElement
            ? this.space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeElement.dataset.nodeId)
            : null;
        let intersectedEdge = null;
        let metaframeHandleInfo = null;
        let gizmoHandleInfo = null;
        let fractalElementInfo = null; // Added for fractal UI

        if (!nodeControlsButton && !contentEditableEl && !interactiveEl) {
            const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
            if (camera) {
                const raycaster = new THREE.Raycaster();
                const pointerNDC = this.space.getPointerNDC(event.clientX, event.clientY);
                raycaster.setFromCamera(pointerNDC, camera);

                // 1. Check for Fractal UI intersection first
                if (this.adaptiveGeometricHub && this.adaptiveGeometricHub.visible) {
                    const aghIntersect = raycaster.intersectObject(this.adaptiveGeometricHub, false);
                    if (aghIntersect.length > 0 && aghIntersect[0].object.userData.isFractalUIElement) {
                        fractalElementInfo = {
                            object: aghIntersect[0].object,
                            type: 'agh', // Adaptive Geometric Hub
                            distance: aghIntersect[0].distance,
                        };
                    }
                }
                if (!fractalElementInfo && this.fractalAxisManipulators && this.fractalAxisManipulators.visible) {
                    const axisIntersects = raycaster.intersectObjects(this.fractalAxisManipulators.children, false); // Non-recursive for simple axes group
                    if (axisIntersects.length > 0 && axisIntersects[0].object.userData.isFractalUIElement) {
                        const intersectedObject = axisIntersects[0].object;
                        fractalElementInfo = {
                            object: intersectedObject,
                            type: 'translate_axis', // For now, all manipulators are translate axes
                            axis: intersectedObject.userData.axis,
                            distance: axisIntersects[0].distance,
                        };
                    }
                }

                // 2. If no fractal UI hit, check for old Gizmo
                if (!fractalElementInfo && this.gizmo && this.gizmo.visible) {
                    const gizmoIntersects = raycaster.intersectObjects(this.gizmo.handles.children, true);
                    if (gizmoIntersects.length > 0) {
                        const intersectedHandleMesh = gizmoIntersects[0].object;
                        if (intersectedHandleMesh.userData?.isGizmoHandle) {
                            gizmoHandleInfo = {
                                axis: intersectedHandleMesh.userData.axis,
                                type: intersectedHandleMesh.userData.gizmoType,
                                part: intersectedHandleMesh.userData.part,
                                object: intersectedHandleMesh,
                                distance: gizmoIntersects[0].distance,
                            };
                        }
                    }
                }

                // 3. If no UI controls hit, check for graph elements (nodes, edges, metaframes)
                if (!fractalElementInfo && !gizmoHandleInfo) {
                    const generalIntersect = this.space.intersectedObjects(event.clientX, event.clientY);
                    if (generalIntersect) {
                        const { object, node: resolvedNode, edge: resolvedEdge } = generalIntersect;
                        if (resolvedNode) graphNode = resolvedNode;
                        if (resolvedEdge) intersectedEdge = resolvedEdge;
                        if (object && object.name && graphNode && graphNode.metaframe?.isVisible) {
                            if (object.name.startsWith('resizeHandle-')) {
                                const handleTypeStr = object.name.substring('resizeHandle-'.length);
                                metaframeHandleInfo = { type: handleTypeStr, object: object, node: graphNode };
                            } else if (object.name === 'dragHandle') {
                                metaframeHandleInfo = { type: 'dragHandle', object: object, node: graphNode };
                            }
                        }
                    }
                }
            }
        }

        return {
            element,
            nodeElement,
            nodeControls: nodeControlsButton,
            contentEditable: contentEditableEl,
            interactiveElement: interactiveEl,
            node: graphNode,
            intersectedEdge,
            metaframeHandleInfo,
            gizmoHandleInfo,
            fractalElementInfo, // Added
        };
    }

    _getCursorForHandle(handleType) {
        switch (handleType) {
            case 'topLeft':
            case 'bottomRight':
                return 'nwse-resize';
            case 'topRight':
            case 'bottomLeft':
                return 'nesw-resize';
            case 'dragHandle':
                return 'grab';
            default:
                return 'default';
        }
    }

    _getTooltipTextForHandle(handleType) {
        switch (handleType) {
            case 'topLeft':
                return 'Resize (Top-Left)';
            case 'topRight':
                return 'Resize (Top-Right)';
            case 'bottomLeft':
                return 'Resize (Bottom-Left)';
            case 'bottomRight':
                return 'Resize (Bottom-Right)';
            case 'dragHandle':
                return 'Move Node';
            default:
                return '';
        }
    }

    _handleHover(e) {
        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes() || new Set();
        if (this.pointerState.down || this.currentState !== InteractionState.IDLE) {
            if (this.hoveredNodeForMetaframe && !selectedNodes.has(this.hoveredNodeForMetaframe))
                this.hoveredNodeForMetaframe.metaframe?.hide();
            this.hoveredNodeForMetaframe = null;
            if (this.currentHoveredGLHandle && this.currentHoveredGLHandle.node?.metaframe) {
                this.currentHoveredGLHandle.node.metaframe.highlightHandle(
                    this.currentHoveredGLHandle.handleMesh,
                    false
                );
                this.currentHoveredGLHandle.node.metaframe.setHandleTooltip(this.hoveredHandleType, '', false);
            }
            this.currentHoveredGLHandle = null;
            this.hoveredHandleType = null;
            if (this.hoveredGizmoHandle && this.gizmo) this.gizmo.setHandleActive(this.hoveredGizmoHandle, false); // Use this.gizmo
            this.hoveredGizmoHandle = null;
            if (this.hoveredEdge) {
                const selectedEdges = this._uiPluginCallbacks.getSelectedEdges() || new Set();
                if (!selectedEdges.has(this.hoveredEdge)) this.hoveredEdge.setHoverStyle(false);
            }
            this.hoveredEdge = null;
            return;
        }

        const targetInfo = this._getTargetInfo(e);
        const {
            node: newlyHoveredNode,
            intersectedEdge: newHoveredEdge,
            metaframeHandleInfo: newMFHInfo,
            gizmoHandleInfo: newGizmoHInfo,
            fractalElementInfo: newFractalElInfo, // Added
        } = targetInfo;

        // 1. Handle Fractal UI Hover
        if (this.hoveredFractalElement !== newFractalElInfo?.object) {
            if (this.hoveredFractalElement) {
                const oldHoveredElement = this.hoveredFractalElement;
                const originalColor = oldHoveredElement.userData.originalColor ||
                                      (oldHoveredElement.material.color ? oldHoveredElement.material.color.clone() : new THREE.Color(0xffffff));
                setFractalElementActive(oldHoveredElement, false, originalColor, false); // isActive = false, isGrabbed = false
            }

            this.hoveredFractalElement = newFractalElInfo?.object || null;

            if (this.hoveredFractalElement) {
                const newHoveredElement = this.hoveredFractalElement;
                 // Store original color before highlighting if not already stored (setFractalElementActive handles this internally now)
                const originalColor = newHoveredElement.userData.originalColor ||
                                      (newHoveredElement.material.color ? newHoveredElement.material.color.clone() : new THREE.Color(0xffffff));
                setFractalElementActive(newHoveredElement, true, originalColor, false); // isActive = true, isGrabbed = false
            }
        }

        // 2. Handle Gizmo Hover (original)
        // Ensure gizmo hover doesn't interfere if fractal hover is active
        if (!this.hoveredFractalElement && this.hoveredGizmoHandle !== newGizmoHInfo?.object) {
            if (this.hoveredGizmoHandle && this.gizmo) this.gizmo.setHandleActive(this.hoveredGizmoHandle, false);
            this.hoveredGizmoHandle = newGizmoHInfo?.object || null;
            if (this.hoveredGizmoHandle && this.gizmo) this.gizmo.setHandleActive(this.hoveredGizmoHandle, true);
        } else if (this.hoveredFractalElement && this.hoveredGizmoHandle) {
            // If fractal element is hovered, ensure gizmo is not also highlighted
            if (this.gizmo) this.gizmo.setHandleActive(this.hoveredGizmoHandle, false);
            this.hoveredGizmoHandle = null;
        }

        // 3. Handle Metaframe Hover (original)
        if (this.hoveredNodeForMetaframe !== newlyHoveredNode) {
            if (this.hoveredNodeForMetaframe && !selectedNodes.has(this.hoveredNodeForMetaframe))
                this.hoveredNodeForMetaframe.ensureMetaframe()?.hide();
            if (newlyHoveredNode && !selectedNodes.has(newlyHoveredNode) && newlyHoveredNode.metaframe) {
                const mf = newlyHoveredNode.ensureMetaframe();
                if (mf) {
                    mf.show();
                    Object.values(mf.resizeHandles).forEach((h) => mf.highlightHandle(h, false));
                    if (mf.dragHandle) mf.highlightHandle(mf.dragHandle, false);
                }
            }
            this.hoveredNodeForMetaframe = newlyHoveredNode;
        }

        if (
            this.hoveredHandleType !== newMFHInfo?.type ||
            this.currentHoveredGLHandle?.handleMesh !== newMFHInfo?.object
        ) {
            if (this.currentHoveredGLHandle) {
                const oldMf = this.currentHoveredGLHandle.node?.ensureMetaframe();
                if (oldMf) {
                    oldMf.highlightHandle(this.currentHoveredGLHandle.handleMesh, false);
                    oldMf.setHandleTooltip(this.hoveredHandleType, '', false);
                }
            }
            if (newMFHInfo) {
                const curMf = newMFHInfo.node?.ensureMetaframe();
                if (curMf?.isVisible) {
                    document.body.style.cursor = this._getCursorForHandle(newMFHInfo.type);
                    curMf.highlightHandle(newMFHInfo.object, true);
                    curMf.setHandleTooltip(newMFHInfo.type, this._getTooltipTextForHandle(newMFHInfo.type), true);
                }
                this.currentHoveredGLHandle = { node: newMFHInfo.node, handleMesh: newMFHInfo.object };
            } else {
                this.currentHoveredGLHandle = null;
            }
            this.hoveredHandleType = newMFHInfo?.type || null;
        }

        // 4. Handle Edge Hover (original)
        const currentlySelectedEdges = this._uiPluginCallbacks.getSelectedEdges() || new Set();
        if (this.hoveredEdge !== newHoveredEdge) {
            if (this.hoveredEdge && !currentlySelectedEdges.has(this.hoveredEdge))
                this.hoveredEdge.setHoverStyle(false);
            this.hoveredEdge = newHoveredEdge;
            if (this.hoveredEdge && !currentlySelectedEdges.has(this.hoveredEdge)) this.hoveredEdge.setHoverStyle(true);
        }

        // Cursor logic prioritizing fractal, then gizmo, then metaframe, etc.
        if (this.hoveredFractalElement) {
            document.body.style.cursor = 'pointer'; // Generic pointer for fractal elements
        } else if (this.hoveredGizmoHandle) {
            document.body.style.cursor = 'pointer';
        } else if (this.currentHoveredGLHandle) {
            /* cursor set by metaframe logic */
        } else if (this.hoveredEdge) {
            document.body.style.cursor = 'pointer';
        } else if (
            this.adaptiveGeometricHub?.visible || // if fractal UI is active
            this.gizmo?.visible ||
            this.hoveredNodeForMetaframe ||
            (newlyHoveredNode && selectedNodes.has(newlyHoveredNode))
        ) {
            document.body.style.cursor = (this.adaptiveGeometricHub?.visible || this.gizmo?.visible) ? 'default' : 'grab';
        } else {
            document.body.style.cursor = 'grab';
        }

        // Update scaling for visible UI elements
        const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        if (camera) {
            if (this.adaptiveGeometricHub?.visible && this.adaptiveGeometricHub.parent) { // Check parent as it might be removed from scene
                 const worldPosAGH = this.adaptiveGeometricHub.getWorldPosition(new THREE.Vector3());
                 updateFractalUIScale(this.adaptiveGeometricHub, camera, 500, worldPosAGH);
            }
            if (this.fractalAxisManipulators?.visible && this.fractalAxisManipulators.parent) {
                const worldPosAxes = this.fractalAxisManipulators.getWorldPosition(new THREE.Vector3());
                updateFractalUIScale(this.fractalAxisManipulators, camera, 500, worldPosAxes);
            }
            if (this.gizmo?.visible && this.gizmo.parent) {
                this.gizmo.updateScale(camera);
            }
        }
    }

    _createTempLinkLine(sourceNode) {
        this._removeTempLinkLine();
        const material = new THREE.LineDashedMaterial({
            color: 0xffaa00,
            linewidth: 2,
            dashSize: 8,
            gapSize: 4,
            transparent: true,
            opacity: 0.9,
            depthTest: false,
        });
        const points = [sourceNode.position.clone(), sourceNode.position.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.tempLinkLine = new THREE.Line(geometry, material);
        this.tempLinkLine.computeLineDistances();
        this.tempLinkLine.renderOrder = 1;
        this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.add(this.tempLinkLine);
    }

    _updateTempLinkLine(screenX, screenY) {
        if (
            !this.tempLinkLine ||
            !this._uiPluginCallbacks.getIsLinking() ||
            !this._uiPluginCallbacks.getLinkSourceNode()
        )
            return;
        const sourceNode = this._uiPluginCallbacks.getLinkSourceNode();
        let projectionZ = sourceNode.position.z;
        const potentialTargetInfo = this.space.intersectedObjects(screenX, screenY);
        if (potentialTargetInfo?.node && potentialTargetInfo.node !== sourceNode)
            projectionZ = potentialTargetInfo.node.position.z;
        const targetPos = this.space.screenToWorld(screenX, screenY, projectionZ);
        if (targetPos) {
            const positions = this.tempLinkLine.geometry.attributes.position;
            positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z);
            positions.needsUpdate = true;
            this.tempLinkLine.geometry.computeBoundingSphere();
            this.tempLinkLine.computeLineDistances();
        }
    }

    _removeTempLinkLine() {
        if (this.tempLinkLine) {
            this.tempLinkLine.geometry?.dispose();
            this.tempLinkLine.material?.dispose();
            this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.remove(this.tempLinkLine);
            this.tempLinkLine = null;
        }
    }

    _onLinkingStarted = (data) =>
        this._transitionToState(InteractionState.LINKING_NODE, { sourceNode: data.sourceNode });
    _onLinkingCancelled = () => {
        this._removeTempLinkLine();
        if (this.currentState === InteractionState.LINKING_NODE) this._transitionToState(InteractionState.IDLE);
    };
    _onLinkingCompleted = () => {
        this._removeTempLinkLine();
        if (this.currentState === InteractionState.LINKING_NODE) this._transitionToState(InteractionState.IDLE);
    };

    /**
     * Cleans up event listeners and disposes of UI components and gizmos.
     */
    dispose() {
        const passiveFalse = { passive: false };
        this.container.removeEventListener('pointerdown', this._onPointerDown, passiveFalse);
        window.removeEventListener('pointermove', this._onPointerMove, passiveFalse);
        window.removeEventListener('pointerup', this._onPointerUp, passiveFalse);
        this.container.removeEventListener('contextmenu', this._onContextMenu, passiveFalse);
        document.removeEventListener('click', this._onDocumentClick, true);
        window.removeEventListener('keydown', this._onKeyDown);
        this.container.removeEventListener('wheel', this._onWheel, passiveFalse);

        this.space.off('ui:request:confirm', this._onRequestConfirm);
        this.space.off('ui:request:editNode', this._onEditNodeRequest);
        this.space.off('ui:request:deleteNode', this._onDeleteNodeRequest);
        this.space.off('selection:changed', this._onSelectionChanged);
        this.space.off('graph:cleared', this._onGraphCleared);
        this.space.off('linking:started', this._onLinkingStarted);
        this.space.off('linking:cancelled', this._onLinkingCancelled);
        this.space.off('linking:succeeded', this._onLinkingCompleted);
        this.space.off('linking:failed', this._onLinkingCompleted);
        this.space.off('camera:modeChanged', this._onCameraModeChanged);

        this._removeTempLinkLine();
        this.confirmDialog.dispose();
        this.contextMenu.dispose();
        this.edgeMenu.dispose();
        this.hudManager.dispose();
        this.toolbar.dispose();

        if (this.gizmo) {
            this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.remove(this.gizmo);
            this.gizmo.dispose();
            this.gizmo = null;
        }
        if (this.adaptiveGeometricHub) {
            this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.remove(this.adaptiveGeometricHub);
            this.adaptiveGeometricHub.geometry?.dispose();
            this.adaptiveGeometricHub.material?.dispose();
            this.adaptiveGeometricHub = null;
        }
        if (this.fractalAxisManipulators) {
            this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.remove(this.fractalAxisManipulators);
            this.fractalAxisManipulators.children.forEach(child => {
                child.geometry?.dispose();
                child.material?.dispose();
            });
            this.fractalAxisManipulators = null;
        }
        if (this.multiSelectionHelper) {
            // If it was added to any scene, remove it. Typically not added to scene directly.
            this.multiSelectionHelper = null;
        }

        this.space = null;
        this.container = null;
        this.draggedNode = null;
        this.resizedNode = null;
        this.hoveredEdge = null;
        this.hoveredGizmoHandle = null;
        this.draggedGizmoHandleInfo = null;
        this._uiPluginCallbacks = null;
    }

    /**
     * Handles the dragging logic when a gizmo handle is being manipulated.
     * Calculates the drag delta based on mouse movement and the active gizmo handle,
     * then applies the transformation to the selected nodes.
     * @private
     * @param {PointerEvent} event - The pointer move event.
     */
    _handleGizmoDrag(event) {
        if (!this.draggedGizmoHandleInfo || !this.gizmo || !this.space.isDragging) return;
        const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!camera) return;
        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
        if (!selectedNodes || selectedNodes.size === 0) return;

        const raycaster = new THREE.Raycaster();
        const pointerNDC = this.space.getPointerNDC(event.clientX, event.clientY);
        raycaster.setFromCamera(pointerNDC, camera);

        const gizmoInfo = this.draggedGizmoHandleInfo;
        const currentPointerWorldPos = new THREE.Vector3();
        // const gizmoWorldPosition = this.gizmo.position.clone();
        // const gizmoWorldQuaternion = this.gizmo.quaternion.clone();

        // --- Translation ---
        if (gizmoInfo.type === 'translate') {
            let dragDelta = new THREE.Vector3();
            if (gizmoInfo.part === 'arrow') {
                const axisVectorWorld = TranslationGizmo.getAxisVector(gizmoInfo.axis)
                    .clone()
                    .applyQuaternion(this.gizmo.quaternion);
                const dragLine = new THREE.Line3(
                    this.gizmo.position.clone().sub(axisVectorWorld.clone().multiplyScalar(10000)),
                    this.gizmo.position.clone().add(axisVectorWorld.clone().multiplyScalar(10000))
                );
                raycaster.ray.closestPointToLine(dragLine, false, currentPointerWorldPos);
            } else if (gizmoInfo.part === 'plane') {
                const planeNormalWorld = TranslationGizmo.getPlaneNormal(gizmoInfo.axis)
                    .clone()
                    .applyQuaternion(this.gizmo.quaternion);
                const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
                    planeNormalWorld,
                    this.gizmoDragStartPointerWorldPos
                );
                if (!raycaster.ray.intersectPlane(dragPlane, currentPointerWorldPos)) return;
            }
            if (this.gizmoDragStartPointerWorldPos.lengthSq() > 0) {
                dragDelta.subVectors(currentPointerWorldPos, this.gizmoDragStartPointerWorldPos);
            } else return;

            selectedNodes.forEach((node) => {
                const initialPos = this.selectedNodesInitialPositions.get(node.id);
                if (initialPos) {
                    const newPos = initialPos.clone().add(dragDelta);
                    node.setPosition(newPos.x, newPos.y, newPos.z); // Use Node's method if available for side effects
                }
            });
            this.space.emit('graph:nodes:transformed', {
                nodes: Array.from(selectedNodes),
                transformationType: 'translate',
            });
        }
        // --- Rotation ---
        else if (gizmoInfo.type === 'rotate') {
            const rotationSpeed = 0.025; // Adjust for sensitivity
            const deltaPointer = new THREE.Vector2(event.movementX, event.movementY);
            const rotationAxisWorld = TranslationGizmo.getAxisVector(gizmoInfo.axis)
                .clone()
                .applyQuaternion(this.gizmo.quaternion);

            // Project pointer movement onto a vector perpendicular to both camera view and rotation axis
            // This gives a more intuitive rotation control based on mouse direction
            const viewDirection = camera.getWorldDirection(new THREE.Vector3()).negate();
            let _rotationSign = 1;

            // Determine dominant component of pointer movement relative to screen axes
            // and align with the rotation axis projected to screen space
            const _screenPerpendicularToAxis = rotationAxisWorld.clone().cross(viewDirection);

            // The sign of rotation depends on the dot product of pointer movement and screenPerpendicularToAxis
            // Simplified: Use movementX for Y-axis rotation, movementY for X-axis rotation. Z-axis is trickier.
            let angleIncrement = 0;
            if (gizmoInfo.axis === 'y') {
                // Rotation around world Y (or gizmo's Y)
                angleIncrement = -deltaPointer.x * rotationSpeed;
            } else if (gizmoInfo.axis === 'x') {
                // Rotation around world X (or gizmo's X)
                angleIncrement = deltaPointer.y * rotationSpeed;
            } else {
                // Z-axis rotation
                // Project gizmo center and current pointer to screen space
                const gizmoScreenPos = this.gizmo.position.clone().project(camera);
                const prevPointerScreenPos = new THREE.Vector2(
                    this.pointerState.clientX - event.movementX,
                    this.pointerState.clientY - event.movementY
                )
                    .sub(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2))
                    .multiply(new THREE.Vector2(1 / (window.innerWidth / 2), -1 / (window.innerHeight / 2)));
                const currentPointerScreenPos = new THREE.Vector2(this.pointerState.clientX, this.pointerState.clientY)
                    .sub(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2))
                    .multiply(new THREE.Vector2(1 / (window.innerWidth / 2), -1 / (window.innerHeight / 2)));

                const prevAngle = Math.atan2(
                    prevPointerScreenPos.y - gizmoScreenPos.y,
                    prevPointerScreenPos.x - gizmoScreenPos.x
                );
                const currentAngle = Math.atan2(
                    currentPointerScreenPos.y - gizmoScreenPos.y,
                    currentPointerScreenPos.x - gizmoScreenPos.x
                );
                angleIncrement = currentAngle - prevAngle;
            }

            const deltaRotation = new THREE.Quaternion().setFromAxisAngle(rotationAxisWorld, angleIncrement);

            if (selectedNodes.size > 1 && this.multiSelectionHelper) {
                this.multiSelectionHelper.quaternion.premultiply(deltaRotation); // Rotate the helper
                this.multiSelectionHelper.updateMatrixWorld(true);

                selectedNodes.forEach((node) => {
                    const initialLocalOffset = node.userData.initialOffsetFromMultiSelectCenter;
                    const initialQuaternion = this.selectedNodesInitialQuaternions.get(node.id);
                    if (initialLocalOffset && initialQuaternion) {
                        const newWorldPos = this.multiSelectionHelper.localToWorld(initialLocalOffset.clone());
                        node.setPosition(newWorldPos.x, newWorldPos.y, newWorldPos.z);

                        // Calculate node's new world rotation
                        // Node's new orientation = helper's new orientation * initial orientation relative to helper
                        // Initial orientation relative to helper = helper_initial_inverse * node_initial_world
                        // For simplicity now, let's assume nodes adopt the helper's rotation directly if they started aligned,
                        // or maintain their relative rotation to it.
                        // This requires storing initial relative quaternions or a more complex calculation.
                        // Simplest for now: apply the delta rotation to each node's current world rotation.
                        // This is not quite right for multi-select usually. The helper method is better.

                        // To correctly apply rotation around a common pivot (multiSelectionHelper.position)
                        // to nodes that might have their own orientations:
                        // 1. Get node's initial world quaternion: initialNodeWorldQuaternion
                        // 2. Get helper's initial world quaternion: initialHelperWorldQuaternion
                        // 3. Calculate node's quaternion relative to helper: initialNodeRelativeQuaternion = initialHelperWorldQuaternion.clone().invert().multiply(initialNodeWorldQuaternion)
                        // 4. New node world quaternion = newHelperWorldQuaternion.multiply(initialNodeRelativeQuaternion)
                        // For now, a simpler approach for HTML nodes (which don't have intrinsic rotation)
                        // and shape nodes (where we directly set mesh quaternion):
                        if (node.mesh) {
                            const newWorldQuaternion = this.multiSelectionHelper.quaternion.clone(); // Simplified: align with helper
                            // A more correct approach would be:
                            // const initialRelQuaternion = node.userData.initialRelativeQuaternion; (if stored)
                            // const newWorldQuaternion = this.multiSelectionHelper.quaternion.clone().multiply(initialRelQuaternion);
                            node.mesh.quaternion.copy(newWorldQuaternion);
                        }
                    }
                });
            } else {
                // Single node selection
                selectedNodes.forEach((node) => {
                    const initialPos = this.selectedNodesInitialPositions.get(node.id);
                    const initialQuaternion = this.selectedNodesInitialQuaternions.get(node.id);
                    if (initialPos && initialQuaternion) {
                        // Rotate position around gizmo center
                        const offset = initialPos.clone().sub(this.gizmo.position);
                        offset.applyQuaternion(deltaRotation);
                        const newPos = this.gizmo.position.clone().add(offset);
                        node.setPosition(newPos.x, newPos.y, newPos.z);

                        if (node.mesh) {
                            // Only ShapeNodes usually have a mesh to rotate
                            const newQuaternion = deltaRotation.clone().multiply(initialQuaternion);
                            node.mesh.quaternion.copy(newQuaternion);
                        }
                    }
                });
            }
            this.space.emit('graph:nodes:transformed', {
                nodes: Array.from(selectedNodes),
                transformationType: 'rotate',
            });
        }
        // --- Scaling ---
        else if (gizmoInfo.type === 'scale') {
            const scaleSpeed = 0.01; // Adjust for sensitivity
            let scaleFactorDelta = new THREE.Vector3(event.movementX, event.movementY, 0).length() * scaleSpeed;
            if (event.movementX + event.movementY < 0) scaleFactorDelta *= -1; // Simplistic direction check

            let scaleDeltaVec = new THREE.Vector3(1, 1, 1);

            if (gizmoInfo.axis === 'xyz') {
                // Uniform scale
                const scaleVal = 1 + scaleFactorDelta;
                scaleDeltaVec.set(scaleVal, scaleVal, scaleVal);
            } else {
                // Axis-specific scale
                const _axisVectorGizmoSpace = TranslationGizmo.getAxisVector(gizmoInfo.axis);
                if (gizmoInfo.axis === 'x') scaleDeltaVec.x += scaleFactorDelta;
                else if (gizmoInfo.axis === 'y') scaleDeltaVec.y += scaleFactorDelta;
                else if (gizmoInfo.axis === 'z') scaleDeltaVec.z += scaleFactorDelta;
            }

            // Ensure scale factors are positive
            scaleDeltaVec.x = Math.max(0.01, scaleDeltaVec.x);
            scaleDeltaVec.y = Math.max(0.01, scaleDeltaVec.y);
            scaleDeltaVec.z = Math.max(0.01, scaleDeltaVec.z);

            if (selectedNodes.size > 1 && this.multiSelectionHelper) {
                // Apply scale to the helper. Nodes will be scaled relative to this helper.
                this.multiSelectionHelper.scale.multiply(scaleDeltaVec);
                this.multiSelectionHelper.updateMatrixWorld(true);

                selectedNodes.forEach((node) => {
                    const initialLocalOffset = node.userData.initialOffsetFromMultiSelectCenter;
                    const initialScale = this.selectedNodesInitialScales.get(node.id); // World scale initially
                    if (initialLocalOffset && initialScale) {
                        const newWorldPos = this.multiSelectionHelper.localToWorld(initialLocalOffset.clone());
                        node.setPosition(newWorldPos.x, newWorldPos.y, newWorldPos.z);

                        // Calculate the new target world dimensions/scale for the node.
                        // initialScale here is the node's initial world scale (which for HtmlNode's 1x1 plane means its world dimensions).
                        // scaleDeltaVec is the multiplicative factor derived from mouse movement.
                        const newWorldDimensions = initialScale.clone().multiply(scaleDeltaVec);

                        // Ensure minimum dimensions to prevent nodes from becoming too small or inverted.
                        // Node's resize method should also enforce its own minimums.
                        newWorldDimensions.x = Math.max(1, newWorldDimensions.x); // Min dimension of 1 world unit
                        newWorldDimensions.y = Math.max(1, newWorldDimensions.y);
                        newWorldDimensions.z = Math.max(1, newWorldDimensions.z);

                        if (typeof node.resize === 'function') {
                            node.resize(newWorldDimensions);
                        } else {
                            // Fallback for nodes that might not have a resize method but have a mesh
                            // This situation should ideally be avoided by ensuring all scalable nodes have `resize`.
                            if (node.mesh) {
                                node.mesh.scale.copy(newWorldDimensions); // Assuming mesh scale directly maps to world dimensions
                            }
                        }
                    }
                });
            } else {
                // Single node selection
                selectedNodes.forEach((node) => {
                    const initialScale = this.selectedNodesInitialScales.get(node.id); // Initial world dimensions/scale
                    if (initialScale) {
                        const newWorldDimensions = initialScale.clone().multiply(scaleDeltaVec);

                        newWorldDimensions.x = Math.max(1, newWorldDimensions.x);
                        newWorldDimensions.y = Math.max(1, newWorldDimensions.y);
                        newWorldDimensions.z = Math.max(1, newWorldDimensions.z);

                        if (typeof node.resize === 'function') {
                            node.resize(newWorldDimensions);
                        } else {
                             if (node.mesh) {
                                // Fallback if no resize method, attempt to scale mesh directly.
                                // This is less ideal as it bypasses any node-specific logic in resize.
                                node.mesh.scale.copy(newWorldDimensions);
                            }
                        }
                    }
                });
            }
            this.space.emit('graph:nodes:transformed', {
                nodes: Array.from(selectedNodes),
                transformationType: 'scale',
            });
        }

        // Update Gizmo Position (always to center of selection)
        if (selectedNodes.size > 0) {
            const center = new THREE.Vector3();
            selectedNodes.forEach((n) => center.add(n.position));
            center.divideScalar(selectedNodes.size);
            this.gizmo.position.copy(center);

            // Update Gizmo Orientation for single selection
            if (selectedNodes.size === 1) {
                const node = selectedNodes.values().next().value;
                if (node.mesh) this.gizmo.quaternion.copy(node.mesh.getWorldQuaternion(new THREE.Quaternion()));
                else this.gizmo.quaternion.identity(); // HTML nodes typically don't have own 3D orientation
            } else {
                // For multi-select, gizmo orientation is aligned with multiSelectionHelper if rotation/scale, or world if translate
                if (gizmoInfo.type === 'rotate' || gizmoInfo.type === 'scale') {
                    if (this.multiSelectionHelper) this.gizmo.quaternion.copy(this.multiSelectionHelper.quaternion);
                } else {
                    this.gizmo.quaternion.identity(); // World aligned for multi-translate
                }
            }
        }

        if (camera) this.gizmo.updateScale(camera);
    }
}
