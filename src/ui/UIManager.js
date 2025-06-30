import * as THREE from 'three';
// import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'; // Unused
import { $, $$ } from '../utils.js';
import { HtmlNode } from '../graph/nodes/HtmlNode.js';

const ALT_Z_DRAG_SENSITIVITY = 1.0;
const SHIFT_Y_DRAG_SENSITIVITY = 1.0; // Added for Y-axis dragging
const REFERENCE_DISTANCE_FRACTAL_UI = 500; // Reference distance for fractal UI scaling
const SELECTION_HANDLE_SIZE = 10; // For new selection scaling handles
const SELECTION_HANDLE_COLOR = 0x00ccff;
const SELECTION_HANDLE_HOVER_COLOR = 0x0099cc;

// Import decomposed modules
import { InteractionState } from './InteractionState.js';
import { UIStateManager } from './core/UIStateManager.js';
import { UITargetIdentifier } from './core/UITargetIdentifier.js';
import { UIHoverLogic } from './core/UIHoverLogic.js';
import { UIEventHandlers } from './core/UIEventHandlers.js';
import { GizmoInteractionHandler } from './core/GizmoInteractionHandler.js';
import { SelectionScaleHandler } from './core/SelectionScaleHandler.js';
import { TransformGizmo } from './gizmos/TransformGizmo.js'; // Renamed from TranslationGizmo
import { ConfirmDialog } from './dialogs/ConfirmDialog.js';
import { ContextMenu } from './menus/ContextMenu.js';
import {
    createAdaptiveGeometricHub,
    createFractalAxisManipulators,
    updateFractalUIScale,
    setFractalElementActive,
    applySemanticZoomToAxis,
    createFractalRingManipulator,
    createFractalScaleManipulators,
} from './fractal/FractalUIElements.js';
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
    stateManager = null; // Added state manager
    targetIdentifier = null; // Added target identifier
    hoverLogic = null; // Added hover logic
    eventHandlers = null; // Added event handlers
    gizmoInteractionHandler = null; // Added gizmo interaction handler
    selectionScaleHandler = null; // Added selection scale handler

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
    /** @type {TransformGizmo | null} The main gizmo instance (handles translation, rotation, scale). */
    gizmo = null;
    /** @type {'translate' | 'rotate' | 'scale' | null} The currently active gizmo *mode* (selected via toolbar, e.g.). */
    activeGizmoMode = 'translate'; // Default to translate
    /** @type {THREE.Mesh | null} The THREE.Mesh of the currently hovered gizmo handle part. */
    hoveredGizmoHandle = null;
    /** @type {boolean} Whether the gizmo operates in world space or local space. */
    isGizmoInWorldSpace = true;
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
    /** @type {THREE.Group | null} Group containing fractal axis manipulators (translation). */
    fractalAxisManipulators = null;
    /** @type {THREE.Group | null} Group containing fractal rotation manipulators. */
    fractalRotationManipulators = null; // Added for rotation rings
    /** @type {THREE.Group | null} Group containing fractal scale manipulators. */
    fractalScaleManipulators = null;
    /** @type {THREE.Mesh | null} The currently hovered fractal UI element. */
    hoveredFractalElement = null;
    /** @type {object | null} Information about the fractal element currently being dragged or interacted with. */
    draggedFractalElementInfo = null;
    // draggedFractalElementInfo might include:
    // { element: THREE.Mesh, type: 'translate_axis' | 'rotate_axis' | 'scale_axis' | 'scale_uniform', axis: 'x'|'y'|'z'|'xyz',
    //   initialPointerWorldPos?: THREE.Vector3, initialProjectedPointOnAxis?: THREE.Vector3, axisDirection?: THREE.Vector3,
    //   initialRotationAngle?: number, rotationPlane?: THREE.Plane }
    fractalUIInteractionPlane = new THREE.Plane(); // Used for some fractal interactions, might be deprecated for axis-specific logic
    /** @type {number} Current mode for AGH cycling: 0=None, 1=Translate, 2=Rotate, 3=Scale */
    aghCurrentModeCycle = 0;

    // --- Selection Scaling Handles ---
    /** @type {THREE.Group | null} Group to hold selection scaling handles. */
    selectionScaleHandlesGroup = null;
    /** @type {Array<THREE.Mesh>} Array of selection scaling handle meshes. */
    selectionScaleHandles = [];
    /** @type {THREE.Mesh | null} The currently hovered selection scaling handle. */
    hoveredSelectionScaleHandle = null;
    /** @type {object | null} Information about the selection handle being dragged. */
    draggedSelectionScaleHandleInfo = null; // e.g., { handle: THREE.Mesh, type: 'corner', originalBoundingBox: THREE.Box3 }

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
        this.stateManager = new UIStateManager(this); // Initialize StateManager
        this.targetIdentifier = new UITargetIdentifier(this); // Initialize TargetIdentifier
        this.hoverLogic = new UIHoverLogic(this); // Initialize HoverLogic
        this.eventHandlers = new UIEventHandlers(this); // Initialize EventHandlers
        this.gizmoInteractionHandler = new GizmoInteractionHandler(this); // Initialize GizmoInteractionHandler
        this.selectionScaleHandler = new SelectionScaleHandler(this); // Initialize SelectionScaleHandler
        this.space.on('toolbar:toolModeChangeRequested', this._handleToolModeChangeRequest);

        // Initialize Gizmos
        this.gizmo = new TransformGizmo(); // Renamed from TranslationGizmo
        this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.add(this.gizmo);
        this.gizmo.hide();

        this.multiSelectionHelper = new THREE.Object3D();

        // Initialize Fractal UI Elements
        this.adaptiveGeometricHub = createAdaptiveGeometricHub();
        this.fractalAxisManipulators = createFractalAxisManipulators(); // Translation manipulators

        // Create and setup rotation manipulators
        this.fractalRotationManipulators = new THREE.Group();
        this.fractalRotationManipulators.name = 'FractalRotationManipulators';
        const xRotationRing = createFractalRingManipulator('x');
        const yRotationRing = createFractalRingManipulator('y');
        const zRotationRing = createFractalRingManipulator('z');
        this.fractalRotationManipulators.add(xRotationRing);
        this.fractalRotationManipulators.add(yRotationRing);
        this.fractalRotationManipulators.add(zRotationRing);
        this.fractalRotationManipulators.visible = false; // Initially hidden

        // Create and setup scale manipulators
        this.fractalScaleManipulators = createFractalScaleManipulators();
        this.fractalScaleManipulators.visible = false; // Initially hidden

        const webglScene = this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene();
        if (webglScene) {
            webglScene.add(this.adaptiveGeometricHub);
            webglScene.add(this.fractalAxisManipulators);
            webglScene.add(this.fractalRotationManipulators);
            webglScene.add(this.fractalScaleManipulators);
        }
        // AGH, axis, rotation, and scale manipulators are set to visible = false initially

        this._createSelectionScaleHandles();
        if (webglScene && this.selectionScaleHandlesGroup) {
            webglScene.add(this.selectionScaleHandlesGroup);
        }

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
        this.container.addEventListener('pointerdown', this.eventHandlers.onPointerDown, passiveFalse);
        window.addEventListener('pointermove', this.eventHandlers.onPointerMove, passiveFalse);
        window.addEventListener('pointerup', this.eventHandlers.onPointerUp, passiveFalse);
        this.container.addEventListener('contextmenu', this.eventHandlers.onContextMenu, passiveFalse);
        document.addEventListener('click', this.eventHandlers.onDocumentClick, true);
        window.addEventListener('keydown', this.eventHandlers.onKeyDown);
        this.container.addEventListener('wheel', this.eventHandlers.onWheel, passiveFalse);

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

    _handleToolModeChangeRequest = ({ mode }) => {
        // Valid gizmo modes that can be activated via toolbar/hotkey
        const validGizmoModes = ['translate', 'rotate', 'scale'];

        if (validGizmoModes.includes(mode)) {
            if (this.activeGizmoMode === mode) {
                this.activeGizmoMode = null; // Toggle off if clicking the same tool again
            } else {
                this.activeGizmoMode = mode; // Activate the new tool mode
                // When activating a gizmo tool, ensure AGH is not in a transform mode
                // and hide direct selection handles implicitly via _onSelectionChanged's logic
                this.aghCurrentModeCycle = 0;
                if (this.fractalAxisManipulators) this.fractalAxisManipulators.visible = false;
                if (this.fractalRotationManipulators) this.fractalRotationManipulators.visible = false;
                if (this.fractalScaleManipulators) this.fractalScaleManipulators.visible = false;
                // No need to explicitly hide selectionScaleHandlesGroup here,
                // _onSelectionChanged will do it based on activeGizmoMode.
            }
        } else {
            // If an unknown mode or a mode that doesn't use the main gizmo is requested
            this.activeGizmoMode = null;
        }

        this.hudManager.updateAGHModeIndicator(this.aghCurrentModeCycle); // Update HUD for AGH state

        // Force an update of selection-based UI elements like gizmo, selection handles, AGH
        this._onSelectionChanged({
            selected: this._uiPluginCallbacks.getSelectedNodes(),
            type: 'node', // Assuming node selection for context
        });
        this.space.emit('ui:activeToolViewUpdated', { mode: this.activeGizmoMode });
    };

    _createSelectionScaleHandles() {
        this.selectionScaleHandlesGroup = new THREE.Group();
        this.selectionScaleHandlesGroup.name = 'SelectionScaleHandles';
        this.selectionScaleHandlesGroup.visible = false;

        const handleGeometry = new THREE.BoxGeometry(
            SELECTION_HANDLE_SIZE,
            SELECTION_HANDLE_SIZE,
            SELECTION_HANDLE_SIZE
        );
        const handleMaterial = new THREE.MeshBasicMaterial({
            color: SELECTION_HANDLE_COLOR,
            depthTest: false, // Render on top
            transparent: true,
            opacity: 0.8,
        });

        // Create 8 corner handles
        const positions = [
            // Front face
            { x: -0.5, y: 0.5, z: 0.5, name: 'topLeftFront' },
            { x: 0.5, y: 0.5, z: 0.5, name: 'topRightFront' },
            { x: -0.5, y: -0.5, z: 0.5, name: 'bottomLeftFront' },
            { x: 0.5, y: -0.5, z: 0.5, name: 'bottomRightFront' },
            // Back face
            { x: -0.5, y: 0.5, z: -0.5, name: 'topLeftBack' },
            { x: 0.5, y: 0.5, z: -0.5, name: 'topRightBack' },
            { x: -0.5, y: -0.5, z: -0.5, name: 'bottomLeftBack' },
            { x: 0.5, y: -0.5, z: -0.5, name: 'bottomRightBack' },
        ];

        positions.forEach((posInfo) => {
            const handle = new THREE.Mesh(handleGeometry.clone(), handleMaterial.clone());
            handle.name = `selectionScaleHandle-${posInfo.name}`;
            // Store relative position for easy update based on bounding box size
            handle.userData.relativePosition = new THREE.Vector3(posInfo.x, posInfo.y, posInfo.z);
            handle.userData.isSelectionScaleHandle = true;
            handle.userData.handleType = 'corner'; // All are corner handles for now for uniform scaling
            handle.userData.originalColor = handle.material.color.clone(); // For hover effect
            this.selectionScaleHandles.push(handle);
            this.selectionScaleHandlesGroup.add(handle);
        });
    }

    /**
     * Handles graph clearing by hiding any active gizmo.
     * @private
     */
    _onGraphCleared = () => {
        if (this.gizmo) {
            this.gizmo.hide();
        }
        if (this.selectionScaleHandlesGroup) {
            this.selectionScaleHandlesGroup.visible = false;
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
        if (this.gizmo) this.gizmo.hide();
        if (this.adaptiveGeometricHub) this.adaptiveGeometricHub.visible = false;
        if (this.selectionScaleHandlesGroup) this.selectionScaleHandlesGroup.visible = false;

        // Hide all manipulator groups and reset their zoom levels and visual states.
        const manipulatorGroupsToReset = [
            this.fractalAxisManipulators,
            this.fractalRotationManipulators,
            this.fractalScaleManipulators,
        ];

        manipulatorGroupsToReset.forEach((group) => {
            if (group) {
                group.children.forEach((child) => {
                    if (child.userData.isFractalUIElement) {
                        child.userData.zoomLevel = 0; // Reset zoom level data

                        // If this child was the currently hovered fractal element, deactivate its hover state.
                        // Note: this.hoveredFractalElement itself will be updated by _handleHover on next mouse move if needed.
                        if (this.hoveredFractalElement === child) {
                            const originalColor =
                                child.userData.originalColor ||
                                (child.material.color ? child.material.color.clone() : new THREE.Color(0xffffff));
                            setFractalElementActive(child, false, originalColor, false);
                            // No need to null this.hoveredFractalElement here; _handleHover will manage it.
                        }

                        // Apply semantic zoom visuals for zoom level 0 to ensure clean state.
                        // This relies on setFractalElementActive having already potentially restored originalColor if unhovering.
                        // The applySemanticZoomToAxis will then use that restored originalColor for its emissive calculations if needed.
                        if (child.userData.axis && typeof applySemanticZoomToAxis === 'function') {
                            const elementType = child.userData.type;
                            let manipulatorType = 'translate'; // Default
                            if (elementType === 'rotate_axis') {
                                manipulatorType = 'rotate';
                            } else if (elementType === 'scale_axis' || elementType === 'scale_uniform') {
                                manipulatorType = elementType;
                            } else if (elementType === 'translate_axis') {
                                manipulatorType = 'translate';
                            }
                            applySemanticZoomToAxis(group, child.userData.axis, 0, manipulatorType);
                        }
                    }
                });
                group.visible = false;
            }
        });

        this.aghCurrentModeCycle = 0; // Reset AGH cycle state
        this.hudManager.updateAGHModeIndicator(this.aghCurrentModeCycle); // Update HUD on selection change

        if (selectedNodes.size > 0) {
            const selectionBoundingBox = new THREE.Box3();
            selectedNodes.forEach((node) => {
                if (node.mesh) {
                    node.mesh.updateWorldMatrix(true, false);
                    const nodeBox = new THREE.Box3().setFromObject(node.mesh, true);
                    selectionBoundingBox.union(nodeBox);
                } else {
                    selectionBoundingBox.expandByPoint(node.position);
                }
            });

            if (selectionBoundingBox.isEmpty() || selectionBoundingBox.min.equals(selectionBoundingBox.max)) {
                const tempCenter = new THREE.Vector3();
                if (selectedNodes.size === 1) {
                    tempCenter.copy(selectedNodes.values().next().value.position);
                } else {
                    selectedNodes.forEach((n) => tempCenter.add(n.position));
                    tempCenter.divideScalar(selectedNodes.size || 1);
                }
                const defaultSize = Math.max(SELECTION_HANDLE_SIZE * 2, 1); // Ensure size is at least 1
                selectionBoundingBox.setFromCenterAndSize(
                    tempCenter,
                    new THREE.Vector3(defaultSize, defaultSize, defaultSize)
                );
            }

            const center = selectionBoundingBox.getCenter(new THREE.Vector3());
            const size = selectionBoundingBox.getSize(new THREE.Vector3());
            const minDim = 0.1;
            size.x = Math.max(size.x, minDim);
            size.y = Math.max(size.y, minDim);
            size.z = Math.max(size.z, minDim);

            let showAGH = false; // Default: direct manipulation handles take precedence
            let _showOldGizmo = false;
            let showSelectionHandles = true;

            if (this.activeGizmoMode === 'rotate' || this.activeGizmoMode === 'translate') {
                showSelectionHandles = false; // Don't show selection handles if an old gizmo tool is active
                _showOldGizmo = true;
                showAGH = false; // Also hide AGH if old gizmo is active
            }
            // If AGH cycle is active for a transform, it might take precedence too.
            if (this.aghCurrentModeCycle === 1 || this.aghCurrentModeCycle === 2 || this.aghCurrentModeCycle === 3) {
                showSelectionHandles = false;
                showAGH = true; // AGH interaction implies its manipulators are primary
            }

            // Update and show/hide Selection Scale Handles
            if (this.selectionScaleHandlesGroup) {
                if (showSelectionHandles) {
                    this.selectionScaleHandlesGroup.position.copy(center);
                    this.selectionScaleHandlesGroup.quaternion.identity();
                    this.selectionScaleHandles.forEach((handle) => {
                        const relPos = handle.userData.relativePosition;
                        handle.position.set(relPos.x * size.x, relPos.y * size.y, relPos.z * size.z);
                    });
                    if (camera) {
                        const dist = Math.max(1, center.distanceTo(camera.position)); // Ensure dist is positive
                        const scaleFactor = Math.max(0.01, dist / REFERENCE_DISTANCE_FRACTAL_UI);
                        this.selectionScaleHandlesGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    }
                    this.selectionScaleHandlesGroup.visible = true;
                    this.selectionScaleHandlesGroup.userData.currentBoundingBox = selectionBoundingBox.clone();
                } else {
                    this.selectionScaleHandlesGroup.visible = false;
                }
            }

            // Update and show/hide AGH
            if (this.adaptiveGeometricHub) {
                if (showAGH) {
                    this.adaptiveGeometricHub.position.copy(center);
                    this.adaptiveGeometricHub.quaternion.identity();
                    if (camera)
                        updateFractalUIScale(this.adaptiveGeometricHub, camera, REFERENCE_DISTANCE_FRACTAL_UI, center);
                    this.adaptiveGeometricHub.visible = true;
                } else {
                    this.adaptiveGeometricHub.visible = false;
                }
            }

            // Update and show/hide Old Gizmo (now primarily for Rotation)
            if (this.gizmo) {
                if (this.activeGizmoMode === 'rotate' && selectedNodes.size > 0) {
                    this.gizmo.position.copy(center);
                    if (selectedNodes.size === 1 && !this.isGizmoInWorldSpace) {
                        const node = selectedNodes.values().next().value;
                        if (node.mesh) {
                            this.gizmo.quaternion.copy(node.mesh.getWorldQuaternion(new THREE.Quaternion()));
                        } else {
                            this.gizmo.quaternion.identity(); // Fallback for nodes without a mesh
                        }
                    } else {
                        this.gizmo.quaternion.identity(); // World aligned for multi-select or if in world space
                    }
                    if (camera) this.gizmo.updateScale(camera);
                    this.gizmo.showOnly('rotate');
                    if (this.selectionScaleHandlesGroup) this.selectionScaleHandlesGroup.visible = false;
                    if (this.adaptiveGeometricHub) this.adaptiveGeometricHub.visible = false; // Hide AGH if rotate tool is active
                    if (this.fractalAxisManipulators) this.fractalAxisManipulators.visible = false;
                    if (this.fractalScaleManipulators) this.fractalScaleManipulators.visible = false;
                    // Keep fractal rotation manipulators hidden as old gizmo is handling rotation
                    if (this.fractalRotationManipulators) this.fractalRotationManipulators.visible = false;
                } else if (this.activeGizmoMode === 'translate' && selectedNodes.size > 0) {
                    this.gizmo.position.copy(center);
                    if (selectedNodes.size === 1 && !this.isGizmoInWorldSpace) {
                        const node = selectedNodes.values().next().value;
                        if (node.mesh) {
                            this.gizmo.quaternion.copy(node.mesh.getWorldQuaternion(new THREE.Quaternion()));
                        } else {
                            this.gizmo.quaternion.identity(); // Fallback for nodes without a mesh
                        }
                    } else {
                        this.gizmo.quaternion.identity(); // World aligned for multi-select or if in world space
                    }
                    if (camera) this.gizmo.updateScale(camera);
                    this.gizmo.showOnly('translate');
                    if (this.selectionScaleHandlesGroup) this.selectionScaleHandlesGroup.visible = false;
                    if (this.adaptiveGeometricHub) this.adaptiveGeometricHub.visible = false;
                    if (this.fractalAxisManipulators) this.fractalAxisManipulators.visible = false;
                    if (this.fractalRotationManipulators) this.fractalRotationManipulators.visible = false;
                    if (this.fractalScaleManipulators) this.fractalScaleManipulators.visible = false;
                } else if (this.activeGizmoMode === 'scale' && selectedNodes.size > 0) {
                    // Added for scale mode
                    this.gizmo.position.copy(center);
                    if (selectedNodes.size === 1 && !this.isGizmoInWorldSpace) {
                        const node = selectedNodes.values().next().value;
                        if (node.mesh) {
                            this.gizmo.quaternion.copy(node.mesh.getWorldQuaternion(new THREE.Quaternion()));
                        } else {
                            this.gizmo.quaternion.identity();
                        }
                    } else {
                        this.gizmo.quaternion.identity();
                    }
                    if (camera) this.gizmo.updateScale(camera);
                    this.gizmo.showOnly('scale');
                    if (this.selectionScaleHandlesGroup) this.selectionScaleHandlesGroup.visible = false;
                    if (this.adaptiveGeometricHub) this.adaptiveGeometricHub.visible = false;
                    if (this.fractalAxisManipulators) this.fractalAxisManipulators.visible = false;
                    if (this.fractalRotationManipulators) this.fractalRotationManipulators.visible = false;
                    if (this.fractalScaleManipulators) this.fractalScaleManipulators.visible = false;
                } else {
                    this.gizmo.hide(); // Hide all parts if not in a specific tool mode that uses it
                }
            }
            // Ensure Fractal manipulators are hidden if their parent AGH isn't in the right cycle OR if old gizmo is active
            if (this.fractalAxisManipulators)
                this.fractalAxisManipulators.visible =
                    showAGH && this.aghCurrentModeCycle === 1 && !this.gizmo?.visible;
            if (this.fractalRotationManipulators)
                this.fractalRotationManipulators.visible =
                    showAGH && this.aghCurrentModeCycle === 2 && !this.gizmo?.visible;
            if (this.fractalScaleManipulators)
                this.fractalScaleManipulators.visible =
                    showAGH && this.aghCurrentModeCycle === 3 && !this.gizmo?.visible;
        } else {
            // No nodes selected
            if (this.adaptiveGeometricHub) this.adaptiveGeometricHub.visible = false;
            if (this.gizmo) this.gizmo.hide();
            if (this.selectionScaleHandlesGroup) this.selectionScaleHandlesGroup.visible = false;
            if (this.fractalAxisManipulators) this.fractalAxisManipulators.visible = false;
            if (this.fractalRotationManipulators) this.fractalRotationManipulators.visible = false;
            if (this.fractalScaleManipulators) this.fractalScaleManipulators.visible = false;
            this.hudManager.updateAGHModeIndicator(0); // No nodes selected, so AGH mode is effectively None
        }
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
        this.stateManager.transitionToState(InteractionState.LINKING_NODE, { sourceNode: data.sourceNode });
    _onLinkingCancelled = () => {
        this._removeTempLinkLine();
        if (this.currentState === InteractionState.LINKING_NODE)
            this.stateManager.transitionToState(InteractionState.IDLE);
    };
    _onLinkingCompleted = () => {
        this._removeTempLinkLine();
        if (this.currentState === InteractionState.LINKING_NODE)
            this.stateManager.transitionToState(InteractionState.IDLE);
    };

    /**
     * Cleans up event listeners and disposes of UI components and gizmos.
     */
    dispose() {
        const passiveFalse = { passive: false };
        this.container.removeEventListener('pointerdown', this.eventHandlers.onPointerDown, passiveFalse);
        window.removeEventListener('pointermove', this.eventHandlers.onPointerMove, passiveFalse);
        window.removeEventListener('pointerup', this.eventHandlers.onPointerUp, passiveFalse);
        this.container.removeEventListener('contextmenu', this.eventHandlers.onContextMenu, passiveFalse);
        document.removeEventListener('click', this.eventHandlers.onDocumentClick, true);
        window.removeEventListener('keydown', this.eventHandlers.onKeyDown);
        this.container.removeEventListener('wheel', this.eventHandlers.onWheel, passiveFalse);

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
        this.space.off('toolbar:toolModeChangeRequested', this._handleToolModeChangeRequest);

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
            this.fractalAxisManipulators.children.forEach((child) => {
                child.geometry?.dispose();
                child.material?.dispose();
            });
            this.fractalAxisManipulators = null;
        }
        if (this.fractalRotationManipulators) {
            this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.remove(this.fractalRotationManipulators);
            this.fractalRotationManipulators.children.forEach((child) => {
                child.geometry?.dispose();
                child.material?.dispose();
                if (child.userData.degreeMarkers) {
                    // Dispose degree markers if any
                    child.userData.degreeMarkers.forEach((marker) => {
                        marker.geometry?.dispose();
                        marker.material?.dispose(); // Assuming markers share material or have own
                    });
                }
            });
            this.fractalRotationManipulators = null;
        }
        if (this.fractalScaleManipulators) {
            this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.remove(this.fractalScaleManipulators);
            this.fractalScaleManipulators.children.forEach((child) => {
                child.geometry?.dispose();
                child.material?.dispose();
            });
            this.fractalScaleManipulators = null;
        }

        if (this.selectionScaleHandlesGroup) {
            this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.remove(this.selectionScaleHandlesGroup);
            this.selectionScaleHandles.forEach((handle) => {
                handle.geometry?.dispose();
                handle.material?.dispose();
            });
            this.selectionScaleHandles = [];
            this.selectionScaleHandlesGroup = null;
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
}
