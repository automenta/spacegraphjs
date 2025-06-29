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
import { TranslationGizmo } from './gizmos/TranslationGizmo.js'; // Added Gizmo
import { ConfirmDialog } from './dialogs/ConfirmDialog.js';
import { ContextMenu } from './menus/ContextMenu.js';
import { createAdaptiveGeometricHub, createFractalAxisManipulators, updateFractalUIScale, setFractalElementActive, applySemanticZoomToAxis, createFractalRingManipulator, createFractalScaleManipulators } from './fractal/FractalUIElements.js';
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
        this.space.on('toolbar:toolModeChangeRequested', this._handleToolModeChangeRequest);


        // Initialize Gizmos
        this.gizmo = new TranslationGizmo(); // Renamed from translationGizmo
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

    _handleToolModeChangeRequest = ({ mode }) => {
        if (mode === 'rotate') {
            if (this.activeGizmoMode === 'rotate') {
                this.activeGizmoMode = null; // Toggle off
            } else {
                this.activeGizmoMode = 'rotate'; // Toggle on
                // When activating rotate tool, ensure AGH is not in a transform mode
                this.aghCurrentModeCycle = 0;
                if(this.fractalAxisManipulators) this.fractalAxisManipulators.visible = false;
                if(this.fractalRotationManipulators) this.fractalRotationManipulators.visible = false;
                if(this.fractalScaleManipulators) this.fractalScaleManipulators.visible = false;
                this.hudManager.updateAGHModeIndicator(this.aghCurrentModeCycle); // Update HUD
            }
        } else {
            // Handle other tools if any, or set to null if an unknown tool is requested
            this.activeGizmoMode = null;
        }
        // Force an update of selection-based UI elements
        this._onSelectionChanged({
            selected: this._uiPluginCallbacks.getSelectedNodes(),
            type: 'node' // Assume node selection for context, or get actual type
        });
        this.space.emit('ui:activeToolViewUpdated', { mode: this.activeGizmoMode });
        this.hudManager.updateAGHModeIndicator(this.aghCurrentModeCycle); // Also update if tool mode changes affecting AGH
    };

    _createSelectionScaleHandles() {
        this.selectionScaleHandlesGroup = new THREE.Group();
        this.selectionScaleHandlesGroup.name = 'SelectionScaleHandles';
        this.selectionScaleHandlesGroup.visible = false;

        const handleGeometry = new THREE.BoxGeometry(SELECTION_HANDLE_SIZE, SELECTION_HANDLE_SIZE, SELECTION_HANDLE_SIZE);
        const handleMaterial = new THREE.MeshBasicMaterial({
            color: SELECTION_HANDLE_COLOR,
            depthTest: false, // Render on top
            transparent: true,
            opacity: 0.8
        });

        // Create 8 corner handles
        const positions = [
            // Front face
            { x: -0.5, y: 0.5, z: 0.5, name: 'topLeftFront' }, { x: 0.5, y: 0.5, z: 0.5, name: 'topRightFront' },
            { x: -0.5, y: -0.5, z: 0.5, name: 'bottomLeftFront' }, { x: 0.5, y: -0.5, z: 0.5, name: 'bottomRightFront' },
            // Back face
            { x: -0.5, y: 0.5, z: -0.5, name: 'topLeftBack' }, { x: 0.5, y: 0.5, z: -0.5, name: 'topRightBack' },
            { x: -0.5, y: -0.5, z: -0.5, name: 'bottomLeftBack' }, { x: 0.5, y: -0.5, z: -0.5, name: 'bottomRightBack' }
        ];

        positions.forEach(posInfo => {
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
            this.fractalScaleManipulators
        ];

        manipulatorGroupsToReset.forEach(group => {
            if (group) {
                group.children.forEach(child => {
                    if (child.userData.isFractalUIElement) {
                        child.userData.zoomLevel = 0; // Reset zoom level data

                        // If this child was the currently hovered fractal element, deactivate its hover state.
                        // Note: this.hoveredFractalElement itself will be updated by _handleHover on next mouse move if needed.
                        if (this.hoveredFractalElement === child) {
                            const originalColor = child.userData.originalColor ||
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
            selectedNodes.forEach(node => {
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
                    selectedNodes.forEach(n => tempCenter.add(n.position));
                    tempCenter.divideScalar(selectedNodes.size || 1);
                }
                const defaultSize = Math.max(SELECTION_HANDLE_SIZE * 2, 1); // Ensure size is at least 1
                selectionBoundingBox.setFromCenterAndSize(tempCenter, new THREE.Vector3(defaultSize, defaultSize, defaultSize));
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
                    this.selectionScaleHandles.forEach(handle => {
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
                    if (camera) updateFractalUIScale(this.adaptiveGeometricHub, camera, REFERENCE_DISTANCE_FRACTAL_UI, center);
                    this.adaptiveGeometricHub.visible = true;
                } else {
                    this.adaptiveGeometricHub.visible = false;
                }
            }

            // Update and show/hide Old Gizmo (now primarily for Rotation)
            if (this.gizmo) {
                if (this.activeGizmoMode === 'rotate' && selectedNodes.size > 0) {
                    this.gizmo.position.copy(center);
                    if (selectedNodes.size === 1) {
                        const node = selectedNodes.values().next().value;
                        if (node.mesh) this.gizmo.quaternion.copy(node.mesh.getWorldQuaternion(new THREE.Quaternion()));
                        else this.gizmo.quaternion.identity();
                    } else {
                        this.gizmo.quaternion.identity(); // World aligned for multi-select rotation
                    }
                    if (camera) this.gizmo.updateScale(camera);
                    this.gizmo.showOnly('rotate'); // New method in TranslationGizmo
                    if(this.selectionScaleHandlesGroup) this.selectionScaleHandlesGroup.visible = false;
                    if(this.adaptiveGeometricHub) this.adaptiveGeometricHub.visible = false; // Hide AGH if rotate tool is active
                    if(this.fractalAxisManipulators) this.fractalAxisManipulators.visible = false;
                    if(this.fractalScaleManipulators) this.fractalScaleManipulators.visible = false;
                     // Keep fractal rotation manipulators hidden as old gizmo is handling rotation
                    if(this.fractalRotationManipulators) this.fractalRotationManipulators.visible = false;

                } else if (this.activeGizmoMode === 'translate' && selectedNodes.size > 0) {
                    // Similar setup if we decide to keep old gizmo for translation tool
                    this.gizmo.position.copy(center);
                    this.gizmo.quaternion.identity(); // Typically world-aligned for translation tool
                    if (camera) this.gizmo.updateScale(camera);
                    this.gizmo.showOnly('translate');
                    if(this.selectionScaleHandlesGroup) this.selectionScaleHandlesGroup.visible = false;
                    if(this.adaptiveGeometricHub) this.adaptiveGeometricHub.visible = false;
                    if(this.fractalAxisManipulators) this.fractalAxisManipulators.visible = false;
                    if(this.fractalRotationManipulators) this.fractalRotationManipulators.visible = false;
                    if(this.fractalScaleManipulators) this.fractalScaleManipulators.visible = false;
                }
                else {
                    this.gizmo.hide(); // Hide all parts if not in a specific tool mode that uses it
                }
            }
            // Ensure Fractal manipulators are hidden if their parent AGH isn't in the right cycle OR if old gizmo is active
            if (this.fractalAxisManipulators) this.fractalAxisManipulators.visible = showAGH && this.aghCurrentModeCycle === 1 && !this.gizmo?.visible;
            if (this.fractalRotationManipulators) this.fractalRotationManipulators.visible = showAGH && this.aghCurrentModeCycle === 2 && !this.gizmo?.visible;
            if (this.fractalScaleManipulators) this.fractalScaleManipulators.visible = showAGH && this.aghCurrentModeCycle === 3 && !this.gizmo?.visible;


        } else { // No nodes selected
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
            case InteractionState.FRACTAL_HUB_ACTIVE:
                document.body.style.cursor = 'grab';
                break;
            case InteractionState.FRACTAL_DRAGGING:
            case InteractionState.FRACTAL_ROTATING:
            case InteractionState.FRACTAL_SCALING:
                if (this.draggedFractalElementInfo?.element) {
                    const originalColor = this.draggedFractalElementInfo.element.userData.originalColor ||
                                          (this.draggedFractalElementInfo.element.material.color ?
                                           this.draggedFractalElementInfo.element.material.color.clone() :
                                           new THREE.Color(0xffffff));
                    setFractalElementActive(this.draggedFractalElementInfo.element, false, originalColor, false); // isGrabbed = false
                }
                this.draggedFractalElementInfo = null;
                this.selectedNodesInitialPositions.clear();
                this.selectedNodesInitialQuaternions.clear();
                this.selectedNodesInitialScales.clear();
                this.space.isDragging = false;
                break;
            case InteractionState.SCALING_SELECTION: // End previous scaling state
                if (this.draggedSelectionScaleHandleInfo?.handle) {
                    this.draggedSelectionScaleHandleInfo.handle.material.color.copy(this.draggedSelectionScaleHandleInfo.handle.userData.originalColor);
                }
                this.draggedSelectionScaleHandleInfo = null;
                this.selectedNodesInitialPositions.clear();
                this.selectedNodesInitialScales.clear();
                if (this.selectionScaleHandlesGroup?.userData) {
                    delete this.selectionScaleHandlesGroup.userData.originalBoundingBox;
                    delete this.selectionScaleHandlesGroup.userData.initialCentroid;
                }
                document.body.style.cursor = 'default';
                this.space.isDragging = false;
                break;
        }

        const oldState = this.currentState;
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

                // Define interaction plane parallel to world XY, at the node's initial Z depth.
                this.dragInteractionPlane.setFromNormalAndCoplanarPoint(
                    new THREE.Vector3(0, 0, 1), // Normal is world Z-axis
                    this.draggedNodeInitialWorldPos // Point on the plane
                );

                const raycaster = new THREE.Raycaster();
                const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera);
                const initialIntersectionPoint = new THREE.Vector3();

                if (raycaster.ray.intersectPlane(this.dragInteractionPlane, initialIntersectionPoint)) {
                    this.dragOffset.subVectors(initialIntersectionPoint, this.draggedNodeInitialWorldPos);
                } else {
                    // Fallback if ray doesn't intersect the defined XY plane (e.g., camera looking straight up/down)
                    // Project to a plane facing the camera at the node's depth as a secondary measure.
                    const cameraForward = new THREE.Vector3();
                    camera.getWorldDirection(cameraForward);
                    const fallbackPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraForward, this.draggedNodeInitialWorldPos);
                    if (raycaster.ray.intersectPlane(fallbackPlane, initialIntersectionPoint)) {
                        this.dragOffset.subVectors(initialIntersectionPoint, this.draggedNodeInitialWorldPos);
                    } else {
                        // Further fallback: use screenToWorld at node's Z, this is less ideal as it doesn't use initial world pos.
                        const fallbackWorldPos = this.space.screenToWorld(
                            this.pointerState.clientX,
                            this.pointerState.clientY,
                            this.draggedNodeInitialWorldPos.z
                        );
                        this.dragOffset = fallbackWorldPos
                            ? fallbackWorldPos.sub(this.draggedNode.position) // Offset from current, not initial - might be jumpy
                            : new THREE.Vector3();
                    }
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

                // Additional setup for gizmo rotation
                if (this.draggedGizmoHandleInfo.type === 'rotate') {
                    const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                    if (camera) {
                        const { axis } = this.draggedGizmoHandleInfo;
                        const gizmoWorldPosition = this.gizmo.position.clone();

                        const rotationAxisWorld = TranslationGizmo.getAxisVector(axis).clone().applyQuaternion(this.gizmo.quaternion);
                        this.draggedGizmoHandleInfo.rotationPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(rotationAxisWorld, gizmoWorldPosition);

                        // Get initial intersection point on this plane from gizmoDragStartPointerWorldPos (which is already on the handle)
                        // We need to project gizmoDragStartPointerWorldPos onto the rotationPlane to get a consistent starting point for angle calculation
                        const initialPointerOnPlane = new THREE.Vector3();
                        const rayToStartHandle = new THREE.Ray(camera.position, this.gizmoDragStartPointerWorldPos.clone().sub(camera.position).normalize());
                        if (!rayToStartHandle.intersectPlane(this.draggedGizmoHandleInfo.rotationPlane, initialPointerOnPlane)) {
                             // Fallback if initial point projection fails: use point on plane closest to gizmoDragStartPointerWorldPos
                            this.draggedGizmoHandleInfo.rotationPlane.projectPoint(this.gizmoDragStartPointerWorldPos, initialPointerOnPlane);
                        }

                        this.draggedGizmoHandleInfo.initialPointerOnPlane = initialPointerOnPlane.clone();

                        const initialVectorOnPlane = new THREE.Vector3().subVectors(initialPointerOnPlane, gizmoWorldPosition);
                        let initialAngle = 0;
                        // Angle calculation based on axis (consistent with FRACTAL_ROTATING)
                        if (axis === 'y') {
                            initialAngle = Math.atan2(initialVectorOnPlane.z, initialVectorOnPlane.x);
                        } else if (axis === 'x') {
                            initialAngle = Math.atan2(initialVectorOnPlane.z, initialVectorOnPlane.y);
                        } else { // axis === 'z'
                            initialAngle = Math.atan2(initialVectorOnPlane.y, initialVectorOnPlane.x);
                        }
                        this.draggedGizmoHandleInfo.initialAngle = initialAngle;
                        this.draggedGizmoHandleInfo.cumulativeDeltaQuaternion = new THREE.Quaternion();
                        this.draggedGizmoHandleInfo.gizmoCenter = gizmoWorldPosition.clone();
                    }
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
                document.body.style.cursor = 'default';
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (camera && this.adaptiveGeometricHub?.visible) {
                    const aghWorldPos = this.adaptiveGeometricHub.getWorldPosition(new THREE.Vector3());
                    updateFractalUIScale(this.adaptiveGeometricHub, camera, REFERENCE_DISTANCE_FRACTAL_UI, aghWorldPos);
                    if (this.fractalAxisManipulators?.visible) {
                        const transAxesWorldPos = this.fractalAxisManipulators.getWorldPosition(new THREE.Vector3());
                        updateFractalUIScale(this.fractalAxisManipulators, camera, REFERENCE_DISTANCE_FRACTAL_UI, transAxesWorldPos);
                    }
                    if (this.fractalRotationManipulators?.visible) {
                        const rotAxesWorldPos = this.fractalRotationManipulators.getWorldPosition(new THREE.Vector3());
                        updateFractalUIScale(this.fractalRotationManipulators, camera, REFERENCE_DISTANCE_FRACTAL_UI, rotAxesWorldPos);
                    }
                    if (this.fractalScaleManipulators?.visible) {
                        const scaleAxesWorldPos = this.fractalScaleManipulators.getWorldPosition(new THREE.Vector3());
                        updateFractalUIScale(this.fractalScaleManipulators, camera, REFERENCE_DISTANCE_FRACTAL_UI, scaleAxesWorldPos);
                    }
                }
                break;
            }
            case InteractionState.FRACTAL_DRAGGING:
            case InteractionState.FRACTAL_ROTATING:
            case InteractionState.FRACTAL_SCALING: {
                // Common setup for fractal transformations
                // this.draggedFractalElementInfo is set by _onPointerDown
                // this.selectedNodesInitialPositions/Quaternions/Scales are set in _onPointerDown or _transitionToState
                document.body.style.cursor = 'grabbing';
                this.space.isDragging = true;
                break;
            }
            case InteractionState.SCALING_SELECTION: {
                this.draggedSelectionScaleHandleInfo = data.handleInfo;
                const selectedNodes = data.selectedNodes;

                if (!this.selectionScaleHandlesGroup || !this.selectionScaleHandlesGroup.userData.currentBoundingBox || selectedNodes.size === 0) {
                    // console.warn("SCALING_SELECTION: Missing data for scaling operation.");
                    this._transitionToState(InteractionState.IDLE);
                    return;
                }

                this.selectionScaleHandlesGroup.userData.originalBoundingBox = this.selectionScaleHandlesGroup.userData.currentBoundingBox.clone();
                this.selectionScaleHandlesGroup.userData.initialCentroid = this.selectionScaleHandlesGroup.position.clone();

                this.selectedNodesInitialPositions.clear();
                this.selectedNodesInitialScales.clear(); // Will store world dimensions

                selectedNodes.forEach(node => {
                    this.selectedNodesInitialPositions.set(node.id, node.position.clone());
                    let size;
                    if (node.getActualSize) { // For HtmlNode or similar
                        size = node.getActualSize();
                    } else if (node.mesh) { // For ShapeNode or basic mesh nodes
                         // Attempt to get world scale, assuming mesh origin is node origin
                        size = node.mesh.getWorldScale(new THREE.Vector3());
                        // If local scale is more representative of "size" (e.g. if parented), this might need adjustment.
                        // For unparented nodes, world scale = local scale.
                    } else {
                        size = new THREE.Vector3(1, 1, 1); // Fallback size
                    }
                    this.selectedNodesInitialScales.set(node.id, size.clone());

                    // Store initial offset from the scaling pivot (centroid of selection)
                    const initialOffset = node.position.clone().sub(this.selectionScaleHandlesGroup.userData.initialCentroid);
                    node.userData.initialOffsetFromSelectionCentroid = initialOffset;
                });

                if (this.draggedSelectionScaleHandleInfo.handle) {
                    this.draggedSelectionScaleHandleInfo.handle.material.color.setHex(SELECTION_HANDLE_HOVER_COLOR); // Highlight active handle
                }
                // Determine cursor based on handle name/type if needed
                document.body.style.cursor = 'nwse-resize'; // Generic resize cursor
                this.space.isDragging = true;
                break;
            }
            case InteractionState.IDLE: {
                if (this._uiPluginCallbacks.getSelectedNodes()?.size === 0) {
                    this.adaptiveGeometricHub?.hide();
                    this.fractalAxisManipulators?.hide();
                    this.fractalRotationManipulators?.hide();
                    this.fractalScaleManipulators?.hide();
                } else if (this.adaptiveGeometricHub?.visible &&
                           !this.fractalAxisManipulators?.visible &&
                           !this.fractalRotationManipulators?.visible &&
                           !this.fractalScaleManipulators?.visible) {
                    document.body.style.cursor = 'default';
                } else {
                    document.body.style.cursor = this.gizmo?.visible ? 'default' : 'grab'; // Fallback
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

            // AGH click behavior now applies if any nodes are selected (single or multiple)
            if (fractalType === 'agh' && selectedNodes.size > 0 && this.adaptiveGeometricHub) {
                if (this.activeGizmoMode === 'rotate') { // If toolbar's rotate tool is active, AGH click does nothing for transforms
                    this.contextMenu.hide();
                    return;
                }
                // Clicked on the Adaptive Geometric Hub: Cycle through manipulator modes
                this.aghCurrentModeCycle = (this.aghCurrentModeCycle + 1) % 4; // 0:None, 1:Translate, 2:Rotate, 3:Scale

                // Determine the pivot/center for the manipulators.
                // This will be the AGH's current position, which is the centroid for multi-select
                // or the single node's position for single-select.
                const manipulatorPosition = this.adaptiveGeometricHub.position.clone();
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();

                // Hide all first, then show the current mode's manipulators
                this.fractalAxisManipulators.visible = false;
                this.fractalRotationManipulators.visible = false;
                this.fractalScaleManipulators.visible = false;

                // Reset zoom levels when hiding manipulators explicitly or switching
                const resetZoomAndUnhighlight = (group) => {
                    if (!group) return;
                    group.children.forEach(child => {
                        if (child.userData.isFractalUIElement) {
                            child.userData.zoomLevel = 0;
                            // If this child was the hovered one, unhighlight it
                            if (this.hoveredFractalElement === child) {
                                const originalColor = child.userData.originalColor || new THREE.Color(0xffffff);
                                setFractalElementActive(child, false, originalColor, false);
                                this.hoveredFractalElement = null;
                            }
                            // Apply base semantic zoom to reset visuals
                            if (child.userData.axis && typeof applySemanticZoomToAxis === 'function') {
                                const elementType = child.userData.type; // e.g. 'translate_axis', 'rotate_axis', 'scale_axis', 'scale_uniform'
                                let manipulatorType = 'translate'; // default
                                if (elementType === 'rotate_axis') manipulatorType = 'rotate';
                                else if (elementType === 'scale_axis' || elementType === 'scale_uniform') manipulatorType = elementType;

                                applySemanticZoomToAxis(group, child.userData.axis, 0, manipulatorType);
                            }
                        }
                    });
                };

                resetZoomAndUnhighlight(this.fractalAxisManipulators);
                resetZoomAndUnhighlight(this.fractalRotationManipulators);
                resetZoomAndUnhighlight(this.fractalScaleManipulators);


                let activeManipulatorGroup = null;
                switch (this.aghCurrentModeCycle) {
                    case 1: // Translate
                        activeManipulatorGroup = this.fractalAxisManipulators;
                        break;
                    case 2: // Rotate
                        activeManipulatorGroup = this.fractalRotationManipulators;
                        break;
                    case 3: // Scale
                        activeManipulatorGroup = this.fractalScaleManipulators;
                        break;
                    case 0: // None
                    default:
                        // All are already hidden
                        break;
                }

                if (activeManipulatorGroup) {
                    // Position the active manipulator group at the AGH's position
                    activeManipulatorGroup.position.copy(manipulatorPosition);
                    activeManipulatorGroup.quaternion.identity(); // World aligned
                    // Reset zoom levels for all children of the now active group before making visible
                    activeManipulatorGroup.children.forEach(child => {
                        if (child.userData.isFractalUIElement && child.userData.axis) {
                            child.userData.zoomLevel = 0;
                             const elementType = child.userData.type;
                             let manipulatorType = 'translate'; // default
                             if (elementType === 'rotate_axis') manipulatorType = 'rotate';
                             else if (elementType === 'scale_axis' || elementType === 'scale_uniform') manipulatorType = elementType;
                             applySemanticZoomToAxis(activeManipulatorGroup, child.userData.axis, 0, manipulatorType);
                        }
                    });
                    // Update scale based on AGH's position (centroid or single node)
                    if (camera) updateFractalUIScale(activeManipulatorGroup, camera, REFERENCE_DISTANCE_FRACTAL_UI, manipulatorPosition);
                    activeManipulatorGroup.visible = true;
                }

                this._transitionToState(InteractionState.FRACTAL_HUB_ACTIVE);
                this.hudManager.updateAGHModeIndicator(this.aghCurrentModeCycle); // Update HUD

            } else if (fractalType === 'translate_axis' && selectedNodes.size > 0) {
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
                };

                const manipulatorWorldPosition = this.fractalAxisManipulators.getWorldPosition(new THREE.Vector3());
                const axisD = new THREE.Vector3();
                if (fractalAxis === 'x') axisD.set(1, 0, 0);
                else if (fractalAxis === 'y') axisD.set(0, 1, 0);
                else if (fractalAxis === 'z') axisD.set(0, 0, 1);

                const vecFromManipulatorOriginToClick = new THREE.Vector3().subVectors(initialPointerWorldPos, manipulatorWorldPosition);
                const t = vecFromManipulatorOriginToClick.dot(axisD);
                const initialProjectedPntOnAxis = manipulatorWorldPosition.clone().addScaledVector(axisD, t);

                this.draggedFractalElementInfo.initialProjectedPointOnAxis = initialProjectedPntOnAxis;
                this.draggedFractalElementInfo.axisDirection = axisD.clone();

                this.selectedNodesInitialPositions.clear();
                selectedNodes.forEach(node => {
                    this.selectedNodesInitialPositions.set(node.id, node.position.clone());
                });

                const originalColorForGrab = fractalObject.userData.originalColor || (fractalObject.material.color ? fractalObject.material.color.clone() : new THREE.Color(0xffffff));
                setFractalElementActive(fractalObject, true, originalColorForGrab, true);

                this._transitionToState(InteractionState.FRACTAL_DRAGGING, {
                    draggedFractalInfo: this.draggedFractalElementInfo,
                    selectedNodes: selectedNodes
                });
            } else if (fractalType === 'rotate_axis' && selectedNodes.size > 0) {
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (!camera) return;

                this.selectedNodesInitialQuaternions.clear();
                this.selectedNodesInitialPositions.clear();
                selectedNodes.forEach(node => {
                    const worldQuaternion = node.mesh ? node.mesh.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
                    this.selectedNodesInitialQuaternions.set(node.id, worldQuaternion);
                    this.selectedNodesInitialPositions.set(node.id, node.position.clone());
                });

                const manipulatorGroup = this.fractalRotationManipulators;
                const manipulatorWorldPosition = manipulatorGroup.getWorldPosition(new THREE.Vector3());
                const rotationPlaneNormal = new THREE.Vector3();
                if (fractalAxis === 'x') rotationPlaneNormal.set(1, 0, 0);
                else if (fractalAxis === 'y') rotationPlaneNormal.set(0, 1, 0);
                else if (fractalAxis === 'z') rotationPlaneNormal.set(0, 0, 1);
                // Assuming manipulators are world-aligned for now.
                // If they could rotate with the node, apply manipulatorGroup.quaternion to rotationPlaneNormal.

                const rotationPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(rotationPlaneNormal, manipulatorWorldPosition);

                const raycaster = new THREE.Raycaster();
                const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera);
                const initialPointerOnPlane = new THREE.Vector3();
                if (!raycaster.ray.intersectPlane(rotationPlane, initialPointerOnPlane)) {
                    // Fallback: if ray is parallel to plane, use a point on the handle itself if possible,
                    // or a point on plane closest to pointer ray. For simplicity, using manipulator center as fallback.
                    const intersects = raycaster.intersectObject(fractalObject, false);
                    if (intersects.length > 0) {
                        initialPointerOnPlane.copy(intersects[0].point);
                    } else {
                        initialPointerOnPlane.copy(manipulatorWorldPosition);
                    }
                }

                const initialVectorOnPlane = new THREE.Vector3().subVectors(initialPointerOnPlane, manipulatorWorldPosition);
                let initialAngle = 0;
                // Calculate angle based on the plane of rotation (defined by fractalAxis)
                if (fractalAxis === 'y') { // Rotation around Y, plane is XZ
                    initialAngle = Math.atan2(initialVectorOnPlane.z, initialVectorOnPlane.x);
                } else if (fractalAxis === 'x') { // Rotation around X, plane is YZ
                    initialAngle = Math.atan2(initialVectorOnPlane.z, initialVectorOnPlane.y);
                } else { // Rotation around Z, plane is XY
                    initialAngle = Math.atan2(initialVectorOnPlane.y, initialVectorOnPlane.x);
                }

                this.draggedFractalElementInfo = {
                    element: fractalObject,
                    type: fractalType,
                    axis: fractalAxis,
                    initialPointerWorldPos: initialPointerOnPlane.clone(), // This is the point on the plane
                    rotationPlane: rotationPlane.clone(),
                    manipulatorCenter: manipulatorWorldPosition.clone(),
                    initialAngle: initialAngle,
                    cumulativeDeltaQuaternion: new THREE.Quaternion(), // Initialize cumulative rotation
                };

                // Store initial offset from pivot for each selected node
                selectedNodes.forEach(node => {
                    node.userData.initialOffsetFromPivot = node.position.clone().sub(manipulatorWorldPosition);
                });

                const originalColorForGrab = fractalObject.userData.originalColor || (fractalObject.material.color ? fractalObject.material.color.clone() : new THREE.Color(0xffffff));
                setFractalElementActive(fractalObject, true, originalColorForGrab, true);

                this._transitionToState(InteractionState.FRACTAL_ROTATING, {
                    draggedFractalInfo: this.draggedFractalElementInfo,
                    selectedNodes: selectedNodes
                });
            } else if ((fractalType === 'scale_axis' || fractalType === 'scale_uniform') && selectedNodes.size > 0) {
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (!camera) return;

                // Store initial scales and positions for selected nodes
                this.selectedNodesInitialScales.clear();
                this.selectedNodesInitialPositions.clear(); // Also store positions for pivot logic if needed
                selectedNodes.forEach(node => {
                    const worldScale = node.mesh ? node.mesh.getWorldScale(new THREE.Vector3()) : node.getActualSize() || new THREE.Vector3(1, 1, 1);
                    this.selectedNodesInitialScales.set(node.id, worldScale.clone());
                    this.selectedNodesInitialPositions.set(node.id, node.position.clone());
                });

                const raycaster = new THREE.Raycaster();
                const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera);
                const intersects = raycaster.intersectObject(fractalObject, false);
                let initialPointerWorldPos = new THREE.Vector3();
                if (intersects.length > 0) {
                    initialPointerWorldPos.copy(intersects[0].point);
                } else { // Fallback similar to translation
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
                    startPointerScreenPos: new THREE.Vector2(this.pointerState.clientX, this.pointerState.clientY),
                    manipulatorCenter: this.fractalScaleManipulators.getWorldPosition(new THREE.Vector3()),
                };

                // Store initial world dimensions and initial offset from pivot for each node
                selectedNodes.forEach(node => {
                    const initialWorldScale = node.getActualSize ? node.getActualSize() : (node.mesh ? node.mesh.scale.clone() : new THREE.Vector3(100, 100, 100));
                    this.selectedNodesInitialScales.set(node.id, initialWorldScale); // Store as world dimensions

                    const initialPosition = node.position.clone();
                    this.selectedNodesInitialPositions.set(node.id, initialPosition);
                    node.userData.initialOffsetFromPivot = initialPosition.clone().sub(this.draggedFractalElementInfo.manipulatorCenter);
                });

                const originalColorForGrab = fractalObject.userData.originalColor || new THREE.Color(0xffffff);
                setFractalElementActive(fractalObject, true, originalColorForGrab, true); // isGrabbed = true

                this._transitionToState(InteractionState.FRACTAL_SCALING, {
                    draggedFractalInfo: this.draggedFractalElementInfo,
                    selectedNodes: selectedNodes
                });
            }
            this.contextMenu.hide();
            this.hudManager.hideFractalTooltip(); // Hide tooltip on click/drag start
            return;
        }

        // Selection Scale Handle Interaction
        if (this.pointerState.button === 0 && targetInfo.selectionScaleHandleInfo) {
            e.preventDefault();
            e.stopPropagation();
            const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
            if (selectedNodes && selectedNodes.size > 0) {
                this._transitionToState(InteractionState.SCALING_SELECTION, {
                    handleInfo: targetInfo.selectionScaleHandleInfo,
                    selectedNodes: selectedNodes,
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

            case InteractionState.SCALING_SELECTION: {
                e.preventDefault();
                if (!this.draggedSelectionScaleHandleInfo || !this.space.isDragging) break;

                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (!camera || !this.selectionScaleHandlesGroup?.userData?.originalBoundingBox) break;

                const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
                if (!selectedNodes || selectedNodes.size === 0) break;

                const initialBBox = this.selectionScaleHandlesGroup.userData.originalBoundingBox;
                const initialCentroid = this.selectionScaleHandlesGroup.userData.initialCentroid.clone();
                const _handleName = this.draggedSelectionScaleHandleInfo.handle.name;

                // Project pointer onto a plane for consistent interaction
                // Plane is typically aligned with camera view, passing through the initial handle position
                const handleInitialWorldPos = this.draggedSelectionScaleHandleInfo.handle.getWorldPosition(new THREE.Vector3());
                const planeNormal = camera.getWorldDirection(new THREE.Vector3()).negate();
                const interactionPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, handleInitialWorldPos);

                const raycaster = new THREE.Raycaster();
                const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera);

                const currentPointerOnPlane = new THREE.Vector3();
                if (!raycaster.ray.intersectPlane(interactionPlane, currentPointerOnPlane)) break;

                // Calculate displacement from initial handle position
                const dragDisplacement = currentPointerOnPlane.clone().sub(handleInitialWorldPos);

                // Determine scale factor - this is simplified for uniform corner scaling
                // More complex logic needed for axial/planar or different handle types
                const initialSize = initialBBox.getSize(new THREE.Vector3());
                const initialHandleRelPos = this.draggedSelectionScaleHandleInfo.handle.userData.relativePosition.clone();

                // Project displacement onto the vector from centroid to handle corner
                // This vector indicates the direction of scaling for this handle
                const centroidToHandleInitial = new THREE.Vector3(
                    initialHandleRelPos.x * initialSize.x,
                    initialHandleRelPos.y * initialSize.y,
                    initialHandleRelPos.z * initialSize.z
                );
                if (centroidToHandleInitial.lengthSq() === 0) break; // Avoid division by zero

                const displacementAlongHandleAxis = dragDisplacement.dot(centroidToHandleInitial.clone().normalize());

                // Calculate scale factor
                // (Initial distance from centroid to handle + displacement) / Initial distance
                const initialDistToHandle = centroidToHandleInitial.length();
                let scaleFactor = (initialDistToHandle + displacementAlongHandleAxis) / initialDistToHandle;
                scaleFactor = Math.max(0.01, scaleFactor); // Prevent zero or negative scale

                // Apply scale
                const newBoxSize = initialSize.clone().multiplyScalar(scaleFactor);

                selectedNodes.forEach(node => {
                    const initialNodeSize = this.selectedNodesInitialScales.get(node.id);
                    const initialOffset = node.userData.initialOffsetFromSelectionCentroid;

                    if (initialNodeSize && initialOffset) {
                        const newNodeSize = initialNodeSize.clone().multiplyScalar(scaleFactor);
                        newNodeSize.x = Math.max(1, newNodeSize.x); // Min dimension
                        newNodeSize.y = Math.max(1, newNodeSize.y);
                        newNodeSize.z = Math.max(1, newNodeSize.z);

                        if (typeof node.resize === 'function') {
                            node.resize(newNodeSize);
                        } else if (node.mesh) { // Fallback for simple mesh scaling
                           // This assumes the mesh's local scale directly corresponds to its world size
                           // relative to its initial world size.
                           const _baseSize = this.selectedNodesInitialScales.get(node.id); // This was world scale or actual size
                           if (node.baseSize) { // HtmlNode like
                                node.mesh.scale.set(newNodeSize.x / node.baseSize.width, newNodeSize.y / node.baseSize.height, newNodeSize.z / (node.baseSize.depth || 1));
                           } else { // ShapeNode like - assuming initial mesh scale was 1,1,1 for its 'size'
                                node.mesh.scale.copy(newNodeSize); // This might not be generally correct if initial scale wasn't 1
                           }
                        }

                        const newOffset = initialOffset.clone().multiplyScalar(scaleFactor);
                        const newPos = initialCentroid.clone().add(newOffset);
                        node.setPosition(newPos.x, newPos.y, newPos.z);
                    }
                });

                // Update positions of the scale handles themselves based on the new overall bounding box
                const newSelectionBBox = new THREE.Box3();
                selectedNodes.forEach(node => {
                    if (node.mesh) {
                        node.mesh.updateWorldMatrix(true, false);
                        newSelectionBBox.union(new THREE.Box3().setFromObject(node.mesh, true));
                    } else {
                        newSelectionBBox.expandByPoint(node.position);
                    }
                });
                 if (newSelectionBBox.isEmpty() || newSelectionBBox.min.equals(newSelectionBBox.max)) {
                    newSelectionBBox.setFromCenterAndSize(initialCentroid, newBoxSize); // Use calculated new size
                 }


                this.selectionScaleHandlesGroup.position.copy(newSelectionBBox.getCenter(new THREE.Vector3()));
                const currentGroupSize = newSelectionBBox.getSize(new THREE.Vector3());
                const minDim = 0.1; // Define minDim here
                currentGroupSize.x = Math.max(minDim, currentGroupSize.x);
                currentGroupSize.y = Math.max(minDim, currentGroupSize.y);
                currentGroupSize.z = Math.max(minDim, currentGroupSize.z);

                this.selectionScaleHandles.forEach(h => {
                    const relPos = h.userData.relativePosition;
                    h.position.set(relPos.x * currentGroupSize.x, relPos.y * currentGroupSize.y, relPos.z * currentGroupSize.z);
                });
                this.selectionScaleHandlesGroup.userData.currentBoundingBox = newSelectionBBox.clone();


                this.space.emit('graph:nodes:transformed', { nodes: Array.from(selectedNodes), transformationType: 'scale' });
                break;
            }

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

                // New method: Project pointer ray onto the drag axis line
                const { axisDirection, initialProjectedPointOnAxis } = this.draggedFractalElementInfo;

                // The manipulator group (and thus its conceptual origin for the drag line) moves with the node.
                // For calculating the current point on the axis, we use its current world position.
                const currentManipulatorWorldPosition = this.fractalAxisManipulators.getWorldPosition(new THREE.Vector3());

                // Define the infinite line for dragging based on its current position and stored world-space direction
                const dragLine = new THREE.Line3(
                    currentManipulatorWorldPosition.clone().addScaledVector(axisDirection, -100000), // A point far behind
                    currentManipulatorWorldPosition.clone().addScaledVector(axisDirection, 100000)  // A point far ahead
                );

                const currentProjectedPointOnAxis = new THREE.Vector3();
                // Project the mouse ray (raycaster.ray) onto the dragLine
                raycaster.ray.closestPointToLine(dragLine, false, currentProjectedPointOnAxis); // clampToLine = false for infinite line

                // The projectedDelta is the movement ALONG THE AXIS from its initial projected point.
                const projectedDelta = new THREE.Vector3().subVectors(
                    currentProjectedPointOnAxis,
                    initialProjectedPointOnAxis // initialProjectedPointOnAxis was calculated at drag start, in world space.
                );

                selectedNodes.forEach(node => {
                    const initialPos = this.selectedNodesInitialPositions.get(node.id); // Node's position at the very start of drag
                    if (initialPos) {
                        const newPos = initialPos.clone().add(projectedDelta);
                        node.setPosition(newPos.x, newPos.y, newPos.z);
                    }
                });

                // Update AGH and Manipulators to follow the centroid of the selected nodes
                if (this.adaptiveGeometricHub && this.fractalAxisManipulators && selectedNodes.size > 0) {
                    const currentCentroid = new THREE.Vector3();
                    selectedNodes.forEach(node => currentCentroid.add(node.position));
                    currentCentroid.divideScalar(selectedNodes.size);

                    this.adaptiveGeometricHub.position.copy(currentCentroid);
                    this.fractalAxisManipulators.position.copy(currentCentroid);

                    if (camera) { // Also update their scale as they move
                        updateFractalUIScale(this.adaptiveGeometricHub, camera, REFERENCE_DISTANCE_FRACTAL_UI, currentCentroid);
                        updateFractalUIScale(this.fractalAxisManipulators, camera, REFERENCE_DISTANCE_FRACTAL_UI, currentCentroid);
                    }
                }
                this.space.emit('graph:nodes:transformed', { nodes: Array.from(selectedNodes), transformationType: 'translate' });
                break;
            }
            case InteractionState.FRACTAL_ROTATING: {
                e.preventDefault();
                if (!this.draggedFractalElementInfo || !this.space.isDragging || !this.draggedFractalElementInfo.rotationPlane) break;
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (!camera) break;
                const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
                if (!selectedNodes || selectedNodes.size === 0) break;

                const { axis, rotationPlane, manipulatorCenter, initialAngle, cumulativeDeltaQuaternion } = this.draggedFractalElementInfo;

                const raycaster = new THREE.Raycaster();
                const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera);
                const currentPointerOnPlane = new THREE.Vector3();
                if (!raycaster.ray.intersectPlane(rotationPlane, currentPointerOnPlane)) break;

                const currentVectorOnPlane = new THREE.Vector3().subVectors(currentPointerOnPlane, manipulatorCenter);
                let currentAngle = 0;
                if (axis === 'y') {
                    currentAngle = Math.atan2(currentVectorOnPlane.z, currentVectorOnPlane.x);
                } else if (axis === 'x') {
                    currentAngle = Math.atan2(currentVectorOnPlane.z, currentVectorOnPlane.y);
                } else {
                    currentAngle = Math.atan2(currentVectorOnPlane.y, currentVectorOnPlane.x);
                }

                let angleDelta = currentAngle - initialAngle;
                angleDelta = ((angleDelta + Math.PI) % (2 * Math.PI)) - Math.PI;

                const rotationAxisVector = new THREE.Vector3();
                if (axis === 'x') rotationAxisVector.set(1, 0, 0);
                else if (axis === 'y') rotationAxisVector.set(0, 1, 0);
                else if (axis === 'z') rotationAxisVector.set(0, 0, 1);
                // Assuming manipulators are world-aligned. If they could rotate with node, apply manipulatorGroup.quaternion.

                const frameDeltaQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxisVector, angleDelta);
                cumulativeDeltaQuaternion.premultiply(frameDeltaQuaternion);
                this.draggedFractalElementInfo.initialAngle = currentAngle; // Update for next frame's delta

                const pivotPoint = manipulatorCenter.clone();
                selectedNodes.forEach(node => {
                    const originalStartPos = this.selectedNodesInitialPositions.get(node.id);
                    const originalStartQuaternion = this.selectedNodesInitialQuaternions.get(node.id);
                    const originalOffsetFromPivot = node.userData.initialOffsetFromPivot;

                    if (originalStartPos && originalStartQuaternion && originalOffsetFromPivot) {
                        const rotatedOffset = originalOffsetFromPivot.clone().applyQuaternion(cumulativeDeltaQuaternion);
                        const newPos = pivotPoint.clone().add(rotatedOffset);
                        node.setPosition(newPos.x, newPos.y, newPos.z);

                        if (node.mesh) {
                            const newQuaternion = cumulativeDeltaQuaternion.clone().multiply(originalStartQuaternion);
                            node.mesh.quaternion.copy(newQuaternion);
                        }
                    }
                });
                this.space.emit('graph:nodes:transformed', { nodes: Array.from(selectedNodes), transformationType: 'rotate' });
                break;
            }
            case InteractionState.FRACTAL_SCALING: {
                e.preventDefault();
                if (!this.draggedFractalElementInfo || !this.space.isDragging) break; // Add null check for this.draggedFractalElementInfo
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (!camera) break;
                const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
                if (!selectedNodes || selectedNodes.size === 0) break;

                const { axis: scaleAxis, type: scaleType, startPointerScreenPos, manipulatorCenter: pivotPoint } = this.draggedFractalElementInfo;
                const currentPointerScreenPos = new THREE.Vector2(this.pointerState.clientX, this.pointerState.clientY);
                const screenDelta = currentPointerScreenPos.clone().sub(startPointerScreenPos);

                // Determine scale factor based on dominant screen delta component, relative to camera view
                // This is a common approach for screen-space driven scaling.
                // Project a unit vector along camera's right and up onto the screen plane.
                const _camRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
                const _camUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);

                // For axial scaling, we want movement along the axis on screen to drive scale.
                // For uniform, a general "outward" mouse movement from center.
                // A simpler, often effective method is to use combined X and Y screen movement.
                // Positive delta (e.g. right or up) increases scale, negative decreases.
                // To make it more intuitive: movement away from the screen center (or manipulator center projected to screen)
                // could mean scale up, towards means scale down.

                const _sensitivity = 0.005; // General sensitivity
                let scaleMultiplierDelta = 1.0;

                if (scaleType === 'scale_uniform') {
                    // For uniform scale, consider radial distance change from projected manipulator center
                    const manipulatorScreenPos = pivotPoint.clone().project(camera);
                    const startPointerNdc = new THREE.Vector2(
                        (startPointerScreenPos.x / window.innerWidth) * 2 - 1,
                        -(startPointerScreenPos.y / window.innerHeight) * 2 + 1
                    );
                    const currentPointerNdc = new THREE.Vector2(
                        (currentPointerScreenPos.x / window.innerWidth) * 2 - 1,
                        -(currentPointerScreenPos.y / window.innerHeight) * 2 + 1
                    );
                    const distStart = startPointerNdc.distanceTo(manipulatorScreenPos);
                    const distCurrent = currentPointerNdc.distanceTo(manipulatorScreenPos);

                    if (distStart > 0.001) { // Avoid division by zero
                         scaleMultiplierDelta = distCurrent / distStart;
                    }

                } else if (scaleType === 'scale_axis') {
                    // For axial scale, use mouse delta along a screen direction that "feels" like the axis
                    // This is tricky. A simpler approach: use screenDelta.x or .y based on axis.
                    // Or, use the dot product of screenDelta with the projected axis on screen.
                    // For now, let's use a simpler combined delta:
                    // For axial scale, use mouse delta along a screen direction that "feels" like the axis
                    const axialSensitivity = 0.005; // Sensitivity for axial scaling

                    let axisWorldDir = new THREE.Vector3();
                    if (scaleAxis === 'x') axisWorldDir.set(1, 0, 0);
                    else if (scaleAxis === 'y') axisWorldDir.set(0, 1, 0);
                    else if (scaleAxis === 'z') axisWorldDir.set(0, 0, 1);

                    // Project the world axis onto the screen
                    const p1World = pivotPoint.clone(); // Center of the manipulator group
                    const p2World = pivotPoint.clone().add(axisWorldDir);

                    const p1ScreenNDC = new THREE.Vector2(p1World.clone().project(camera).x, p1World.clone().project(camera).y);
                    const p2ScreenNDC = new THREE.Vector2(p2World.clone().project(camera).x, p2World.clone().project(camera).y);

                    const screenAxisDirectionNDC = p2ScreenNDC.clone().sub(p1ScreenNDC).normalize();

                    // screenDelta is the pointer movement in pixels from the last frame
                    // (currentPointerScreenPos - startPointerScreenPos, where startPointerScreenPos was last frame's current)
                    const pointerMovementPixels = screenDelta.clone(); // screenDelta is already (current - previous_current)

                    // Dot product of pixel pointer movement with the normalized screen direction of the axis
                    const projectionOfMovement = pointerMovementPixels.dot(screenAxisDirectionNDC);

                    scaleMultiplierDelta = 1.0 + projectionOfMovement * axialSensitivity;
                }
                scaleMultiplierDelta = Math.max(0.01, scaleMultiplierDelta); // Prevent zero or negative scale

                // Store cumulative scale factor if not present
                if (this.draggedFractalElementInfo.cumulativeScaleMultiplier === undefined) {
                    this.draggedFractalElementInfo.cumulativeScaleMultiplier = {x: 1, y: 1, z: 1, uniform: 1};
                }

                let appliedScaleFactorX = 1, appliedScaleFactorY = 1, appliedScaleFactorZ = 1;

                if (scaleType === 'scale_uniform') {
                    this.draggedFractalElementInfo.cumulativeScaleMultiplier.uniform *= scaleMultiplierDelta;
                    const totalUniformScale = this.draggedFractalElementInfo.cumulativeScaleMultiplier.uniform;
                    appliedScaleFactorX = totalUniformScale;
                    appliedScaleFactorY = totalUniformScale;
                    appliedScaleFactorZ = totalUniformScale;
                } else { // scale_axis
                    if (scaleAxis === 'x') {
                        this.draggedFractalElementInfo.cumulativeScaleMultiplier.x *= scaleMultiplierDelta;
                        appliedScaleFactorX = this.draggedFractalElementInfo.cumulativeScaleMultiplier.x;
                    } else if (scaleAxis === 'y') {
                        this.draggedFractalElementInfo.cumulativeScaleMultiplier.y *= scaleMultiplierDelta;
                        appliedScaleFactorY = this.draggedFractalElementInfo.cumulativeScaleMultiplier.y;
                    } else if (scaleAxis === 'z') {
                        this.draggedFractalElementInfo.cumulativeScaleMultiplier.z *= scaleMultiplierDelta;
                        appliedScaleFactorZ = this.draggedFractalElementInfo.cumulativeScaleMultiplier.z;
                    }
                }


                selectedNodes.forEach(node => {
                    const originalNodeDimensions = this.selectedNodesInitialScales.get(node.id); // Node's dimensions at drag start
                    const originalOffsetFromPivot = node.userData.initialOffsetFromPivot; // Offset from pivot at drag start

                    if (!originalNodeDimensions || !originalOffsetFromPivot) return;

                    // 1. Calculate new node dimensions
                    const newAbsoluteNodeDimensions = originalNodeDimensions.clone();
                    newAbsoluteNodeDimensions.x *= appliedScaleFactorX;
                    newAbsoluteNodeDimensions.y *= appliedScaleFactorY;
                    newAbsoluteNodeDimensions.z *= appliedScaleFactorZ;

                    // Ensure minimum dimensions for the node (e.g., 1 world unit)
                    newAbsoluteNodeDimensions.x = Math.max(1, newAbsoluteNodeDimensions.x);
                    newAbsoluteNodeDimensions.y = Math.max(1, newAbsoluteNodeDimensions.y);
                    newAbsoluteNodeDimensions.z = Math.max(1, newAbsoluteNodeDimensions.z);

                    if (typeof node.resize === 'function') {
                        node.resize(newAbsoluteNodeDimensions);
                    } else if (node.mesh) { // Fallback for simple mesh scaling
                        const baseSize = node.baseSize || {width:1, height:1, depth:1}; // Assuming baseSize for HtmlNode like scaling
                        node.mesh.scale.set(
                            newAbsoluteNodeDimensions.x / (baseSize.width || 1),
                            newAbsoluteNodeDimensions.y / (baseSize.height || 1),
                            newAbsoluteNodeDimensions.z / (baseSize.depth || 1)
                        );
                    }


                    // 2. Calculate new node position (scaled offset from pivot)
                    const newOffsetFromPivot = originalOffsetFromPivot.clone();
                    newOffsetFromPivot.x *= appliedScaleFactorX;
                    newOffsetFromPivot.y *= appliedScaleFactorY;
                    newOffsetFromPivot.z *= appliedScaleFactorZ;

                    const newPos = pivotPoint.clone().add(newOffsetFromPivot);
                    node.setPosition(newPos.x, newPos.y, newPos.z);
                });

                // Update startPointerScreenPos for next delta calculation to make scaling continuous
                this.draggedFractalElementInfo.startPointerScreenPos.copy(currentPointerScreenPos);
                // Reset individual axis/uniform multipliers for next frame, as cumulative is now stored.
                // This is slightly different from rotation. For scaling, each frame's delta is applied to the cumulative.
                // So, the stored cumulative is the state, and startPointerScreenPos is reset.

                if (this.adaptiveGeometricHub && this.fractalScaleManipulators) {
                    this.adaptiveGeometricHub.position.copy(pivotPoint);
                    this.fractalScaleManipulators.position.copy(pivotPoint);
                    if (camera) {
                        updateFractalUIScale(this.adaptiveGeometricHub, camera, REFERENCE_DISTANCE_FRACTAL_UI, pivotPoint);
                        updateFractalUIScale(this.fractalScaleManipulators, camera, REFERENCE_DISTANCE_FRACTAL_UI, pivotPoint);
                    }
                }
                this.space.emit('graph:nodes:transformed', { nodes: Array.from(selectedNodes), transformationType: 'scale' });
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

                    const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
                    const nodesToMove = selectedNodes?.size > 0 && selectedNodes.has(this.draggedNode)
                        ? selectedNodes
                        : new Set([this.draggedNode]);

                    if (e.altKey) { // World Z-axis movement
                        // dy (vertical screen movement) controls Z depth
                        const zDelta = -dy * ALT_Z_DRAG_SENSITIVITY; // Invert dy for natural feel (drag up = move further)
                        nodesToMove.forEach(node => {
                            const _initialPos = this.selectedNodesInitialPositions.get(node.id) || this.draggedNodeInitialWorldPos;
                            // It's better to apply delta to the position at the start of the alt-drag or overall drag.
                            // For simplicity, we'll adjust current position based on delta from last frame.
                            // This requires storing the *absolute* initial position for each node if ALT is held.
                            // For now, let's apply delta to current position.
                            const newPos = node.position.clone();
                            newPos.z += zDelta;
                            node.drag(newPos); // Assuming node.drag updates position and potentially other properties
                            // draggedNodeInitialWorldPos needs to be updated if we want continuous alt-drag from that point
                        });
                        // Update initial world pos for next frame if alt is held, to make delta continuous
                        this.draggedNodeInitialWorldPos.z += zDelta;


                    } else if (e.shiftKey) { // World Y-axis movement
                        const yDelta = -dy * SHIFT_Y_DRAG_SENSITIVITY; // Invert dy for natural feel (drag up = move up)
                        nodesToMove.forEach(node => {
                            const newPos = node.position.clone();
                            newPos.y += yDelta;
                            node.drag(newPos);
                        });
                         this.draggedNodeInitialWorldPos.y += yDelta;


                    } else { // Default XY plane movement
                        const raycaster = new THREE.Raycaster();
                        const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                        raycaster.setFromCamera(pointerNDC, camera);

                        // dragInteractionPlane is world XY at initial Z of draggedNodeInitialWorldPos
                        // Re-set the plane's constant based on the possibly updated Z from Alt-drag
                        this.dragInteractionPlane.setFromNormalAndCoplanarPoint(
                            new THREE.Vector3(0,0,1),
                            this.draggedNodeInitialWorldPos // Use the potentially Z-shifted initial position
                        );

                        const intersectionPoint = new THREE.Vector3();
                        if (raycaster.ray.intersectPlane(this.dragInteractionPlane, intersectionPoint)) {
                            // The dragOffset was calculated relative to the original Z.
                            // We need to calculate the new position based on the intersection point
                            // and the original offset from the *initial* XY position.
                            const newPrimaryNodePos = intersectionPoint.clone().sub(this.dragOffset);

                            // Calculate the delta from the primary dragged node's original position (at the start of this XY drag segment)
                            // to its new calculated position.
                            const currentPrimaryNodePos = this.draggedNode.position.clone();
                            const xyDragDelta = newPrimaryNodePos.clone().sub(currentPrimaryNodePos);
                            xyDragDelta.z = 0; // Ensure no Z change from this operation

                            nodesToMove.forEach(sNode => {
                                const newPos = sNode.position.clone().add(xyDragDelta);
                                sNode.drag(newPos);
                                if (sNode.mesh) sNode.mesh.quaternion.copy(this.draggedNodeInitialQuaternion);
                            });
                        }
                    }

                    // Common emit event after any movement type
                    this.space.emit('graph:node:dragged', {
                        node: this.draggedNode, // Could be changed to emit all moved nodes
                        position: this.draggedNode.position.clone(), // Position of the primary dragged node
                    });
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
                const originalColor = element.userData.originalColor || new THREE.Color(0xffffff);
                setFractalElementActive(element, false, originalColor, false);
            }
            this.draggedFractalElementInfo = null;
            this.selectedNodesInitialPositions.clear();
            this.selectedNodesInitialQuaternions.clear();
            // Note: FRACTAL_DRAGGING does not use selectedNodesInitialScales, so not clearing it here.
            // Transition to FRACTAL_HUB_ACTIVE if manipulators are still meant to be visible
            if (this.areAnyFractalManipulatorsVisible()) {
                this._transitionToState(InteractionState.FRACTAL_HUB_ACTIVE);
            } else {
                this._transitionToState(InteractionState.IDLE);
            }
        } else if (currentInteractionState === InteractionState.FRACTAL_ROTATING || currentInteractionState === InteractionState.FRACTAL_SCALING) {
            if (this.draggedFractalElementInfo?.element) {
                const element = this.draggedFractalElementInfo.element;
                const originalColor = element.userData.originalColor || new THREE.Color(0xffffff);
                setFractalElementActive(element, false, originalColor, false);
            }
            this.draggedFractalElementInfo = null;
            this.selectedNodesInitialPositions.clear();
            this.selectedNodesInitialQuaternions.clear();
            this.selectedNodesInitialScales.clear();
            if (this.draggedFractalElementInfo) {
                if (this.draggedFractalElementInfo.cumulativeDeltaQuaternion) {
                    delete this.draggedFractalElementInfo.cumulativeDeltaQuaternion;
                }
                if (this.draggedFractalElementInfo.cumulativeScaleMultiplier) {
                    delete this.draggedFractalElementInfo.cumulativeScaleMultiplier;
                }
            }
            if (this.areAnyFractalManipulatorsVisible()) {
                this._transitionToState(InteractionState.FRACTAL_HUB_ACTIVE);
            } else {
                this._transitionToState(InteractionState.IDLE);
            }
        } else if (targetInfo.fractalElementInfo?.type === 'agh' &&
                   this.areAnyFractalManipulatorsVisible() &&
                   this.currentState !== InteractionState.FRACTAL_DRAGGING &&
                   this.currentState !== InteractionState.FRACTAL_ROTATING &&
                   this.currentState !== InteractionState.FRACTAL_SCALING &&
                   !this.pointerState.isDraggingThresholdMet) {
            // This case handles a click on AGH that toggled manipulators on.
            // We want to stay in FRACTAL_HUB_ACTIVE.
            // No explicit transition needed if already in FRACTAL_HUB_ACTIVE from _onPointerDown.
            // However, if _onPointerDown transitioned to FRACTAL_HUB_ACTIVE, and no drag occurred, we are good.
            // If a drag *almost* happened but didn't meet threshold, pointerState.isDraggingThresholdMet is false.
            // If we are in IDLE but AGH is clicked to show manipulators, _onPointerDown handles transition.
            // This block might be redundant if _onPointerDown correctly sets FRACTAL_HUB_ACTIVE.
            // The main goal is: if manipulators are visible after a click (not drag), state should reflect that.
        } else if (currentInteractionState === InteractionState.SCALING_SELECTION) {
            if (this.draggedSelectionScaleHandleInfo?.handle) {
                 this.draggedSelectionScaleHandleInfo.handle.material.color.copy(this.draggedSelectionScaleHandleInfo.handle.userData.originalColor);
            }
            this.draggedSelectionScaleHandleInfo = null;
            this.selectedNodesInitialPositions.clear();
            this.selectedNodesInitialScales.clear();
             if (this.selectionScaleHandlesGroup?.userData) {
                delete this.selectionScaleHandlesGroup.userData.originalBoundingBox;
                delete this.selectionScaleHandlesGroup.userData.initialCentroid;
            }
            // After scaling, transition to IDLE, selection handles will be updated/shown by _onSelectionChanged if nodes are still selected.
            this._transitionToState(InteractionState.IDLE);
        } else if (this.currentState !== InteractionState.IDLE) {
             this._transitionToState(InteractionState.IDLE);
        }

        this.activePointerId = null;
    };

    areAnyFractalManipulatorsVisible() {
        return (this.fractalAxisManipulators && this.fractalAxisManipulators.visible) ||
               (this.fractalRotationManipulators && this.fractalRotationManipulators.visible) ||
               (this.fractalScaleManipulators && this.fractalScaleManipulators.visible);
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
        let msg = '';
        let handled = false;

        switch (e.key) {
            case 'Delete':
            case 'Backspace': {
                if (primarySelectedNode) {
                    msg =
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
                    msg =
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
            case 'Enter': {
                if (primarySelectedNode instanceof HtmlNode && primarySelectedNode.data.editable && !isEditingText) {
                    primarySelectedNode.htmlElement?.querySelector('.node-content')?.focus();
                    handled = true;
                }
                break;
            }
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

                // Apply the semantic zoom visual change
                const elementType = this.hoveredFractalElement.userData.type;
                const elementAxis = this.hoveredFractalElement.userData.axis;

                if (elementType === 'translate_axis' && this.fractalAxisManipulators && elementAxis && ['x', 'y', 'z'].includes(elementAxis)) {
                    applySemanticZoomToAxis(this.fractalAxisManipulators, elementAxis, newZoomLevel);
                } else if (elementType === 'rotate_axis' && this.fractalRotationManipulators && elementAxis && ['x', 'y', 'z'].includes(elementAxis)) {
                    // Placeholder: Call a specific function for ring zoom or extend applySemanticZoomToAxis
                    // applySemanticZoomToRing(this.fractalRotationManipulators, elementAxis, newZoomLevel); // Future function
                    // For now, let's try to use applySemanticZoomToAxis if it can handle rings or add a simple case there.
                    // This might require applySemanticZoomToAxis to be more generic or to have specific handling for rings.
                    // As a quick placeholder, we can just log or make a very simple visual change directly here or in a new small function.
                    // For now, we will rely on a modified applySemanticZoomToAxis to handle this (or ignore if not implemented for rings yet).
                    if (typeof applySemanticZoomToAxis === 'function') {
                         applySemanticZoomToAxis(this.fractalRotationManipulators, elementAxis, newZoomLevel, 'rotate');
                    }
                } else if ((elementType === 'scale_axis' || elementType === 'scale_uniform') && this.fractalScaleManipulators && elementAxis && ['x', 'y', 'z', 'xyz'].includes(elementAxis)) {
                    if (typeof applySemanticZoomToAxis === 'function') {
                        applySemanticZoomToAxis(this.fractalScaleManipulators, elementAxis, newZoomLevel, elementType); // Pass 'scale_axis' or 'scale_uniform' as type
                    }
                } else {
                    // console.log(`Semantic zoom not applied: Invalid elementType (${elementType}), axisType (${elementAxis}), or manipulators not found.`);
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
        let selectionScaleHandleInfo = null; // Added for selection scale handles


        if (!nodeControlsButton && !contentEditableEl && !interactiveEl) {
            const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
            if (camera) {
                const raycaster = new THREE.Raycaster();
                const pointerNDC = this.space.getPointerNDC(event.clientX, event.clientY);
                raycaster.setFromCamera(pointerNDC, camera);

                let closestHit = null;

                // 1. Check Selection Scale Handles
                if (this.selectionScaleHandlesGroup && this.selectionScaleHandlesGroup.visible) {
                    const handleIntersects = raycaster.intersectObjects(this.selectionScaleHandles, false); // false for non-recursive
                    if (handleIntersects.length > 0) {
                        const firstHit = handleIntersects[0];
                        if (firstHit.object.userData.isSelectionScaleHandle) {
                             closestHit = {
                                type: 'selectionScaleHandle',
                                info: {
                                    handle: firstHit.object,
                                    type: firstHit.object.userData.handleType, // e.g., 'corner'
                                    name: firstHit.object.name,
                                },
                                distance: firstHit.distance
                            };
                        }
                    }
                }


                // 2. Check for Fractal UI intersection if no closer selection handle hit
                if (!closestHit || (newFractalElInfo && newFractalElInfo.distance < closestHit.distance)) {
                    // Check AGH
                    if (this.adaptiveGeometricHub && this.adaptiveGeometricHub.visible) {
                        const aghIntersect = raycaster.intersectObject(this.adaptiveGeometricHub, false);
                        if (aghIntersect.length > 0 && aghIntersect[0].object.userData.isFractalUIElement) {
                            if (!closestHit || aghIntersect[0].distance < closestHit.distance) {
                                closestHit = { type: 'fractal', info: { object: aghIntersect[0].object, type: 'agh', distance: aghIntersect[0].distance }, distance: aghIntersect[0].distance };
                            }
                        }
                    }
                    // Check Translation Axes
                    if (this.fractalAxisManipulators && this.fractalAxisManipulators.visible) {
                        const intersects = raycaster.intersectObjects(this.fractalAxisManipulators.children, true);
                        const validIntersect = intersects.find(i => i.object.userData.isFractalUIElement && i.object.userData.type === 'translate_axis');
                        if (validIntersect) {
                             if (!closestHit || validIntersect.distance < closestHit.distance) {
                                closestHit = { type: 'fractal', info: { object: validIntersect.object, type: 'translate_axis', axis: validIntersect.object.userData.axis, distance: validIntersect.distance }, distance: validIntersect.distance };
                            }
                        }
                    }
                    // Check Rotation Rings
                    if (this.fractalRotationManipulators && this.fractalRotationManipulators.visible) {
                        const intersects = raycaster.intersectObjects(this.fractalRotationManipulators.children, true);
                        const validIntersect = intersects.find(i => i.object.userData.isFractalUIElement && i.object.userData.type === 'rotate_axis');
                        if (validIntersect) {
                            if (!closestHit || validIntersect.distance < closestHit.distance) {
                                closestHit = { type: 'fractal', info: { object: validIntersect.object, type: 'rotate_axis', axis: validIntersect.object.userData.axis, distance: validIntersect.distance }, distance: validIntersect.distance };
                            }
                        }
                    }
                    // Check Scale Cubes
                    if (this.fractalScaleManipulators && this.fractalScaleManipulators.visible) {
                        const intersects = raycaster.intersectObjects(this.fractalScaleManipulators.children, true);
                        const validIntersect = intersects.find(i => i.object.userData.isFractalUIElement && (i.object.userData.type === 'scale_axis' || i.object.userData.type === 'scale_uniform'));
                        if (validIntersect) {
                             if (!closestHit || validIntersect.distance < closestHit.distance) {
                                closestHit = { type: 'fractal', info: { object: validIntersect.object, type: validIntersect.object.userData.type, axis: validIntersect.object.userData.axis, distance: validIntersect.distance }, distance: validIntersect.distance };
                            }
                        }
                    }
                }


                // 3. If no UI controls hit or closer fractal/selection hit, check for old Gizmo
                if (!closestHit || (newGizmoHInfo && newGizmoHInfo.distance < closestHit.distance)) {
                    if (this.gizmo && this.gizmo.visible) {
                        const gizmoIntersects = raycaster.intersectObjects(this.gizmo.handles.children, true);
                        if (gizmoIntersects.length > 0) {
                            const intersectedHandleMesh = gizmoIntersects[0].object;
                            if (intersectedHandleMesh.userData?.isGizmoHandle) {
                                if (!closestHit || gizmoIntersects[0].distance < closestHit.distance) {
                                    closestHit = {
                                        type: 'gizmo',
                                        info: {
                                            axis: intersectedHandleMesh.userData.axis,
                                            type: intersectedHandleMesh.userData.gizmoType,
                                            part: intersectedHandleMesh.userData.part,
                                            object: intersectedHandleMesh,
                                            distance: gizmoIntersects[0].distance,
                                        },
                                        distance: gizmoIntersects[0].distance
                                    };
                                }
                            }
                        }
                    }
                }

                // Assign based on closest hit
                if (closestHit) {
                    if (closestHit.type === 'selectionScaleHandle') selectionScaleHandleInfo = closestHit.info;
                    else if (closestHit.type === 'fractal') fractalElementInfo = closestHit.info;
                    else if (closestHit.type === 'gizmo') gizmoHandleInfo = closestHit.info;
                }


                // 4. If no UI controls hit, check for graph elements (nodes, edges, metaframes)
                // This should only happen if none of the above specific UI elements were hit closer or at all.
                if (!selectionScaleHandleInfo && !fractalElementInfo && !gizmoHandleInfo) {
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
            fractalElementInfo,
            selectionScaleHandleInfo,
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

            if (this.hoveredFractalElement) { // If exiting hover from a fractal element, hide its tooltip
                this.hudManager.hideFractalTooltip();
            }
            // this.hoveredFractalElement will be nulled or updated below

            if (this.hoveredEdge) {
                const selectedEdges = this._uiPluginCallbacks.getSelectedEdges() || new Set();
                if (!selectedEdges.has(this.hoveredEdge)) this.hoveredEdge.setHoverStyle(false);
            }
            this.hoveredEdge = null;

            // Handle selection scale handle unhover
            if (this.hoveredSelectionScaleHandle) {
                this.hoveredSelectionScaleHandle.material.color.copy(this.hoveredSelectionScaleHandle.userData.originalColor);
                this.hoveredSelectionScaleHandle = null;
                // Hide tooltip if one was shown for scale handles
            }
        }

        const targetInfo = this._getTargetInfo(e);
        const {
            node: newlyHoveredNode,
            intersectedEdge: newHoveredEdge,
            metaframeHandleInfo: newMFHInfo,
            gizmoHandleInfo: newGizmoHInfo,
            fractalElementInfo: newFractalElInfo,
            selectionScaleHandleInfo: newScaleHandleInfo,
        } = targetInfo;


        // --- Priority Hover Handling ---
        // 1. Selection Scale Handles
        if (this.hoveredSelectionScaleHandle !== newScaleHandleInfo?.handle) {
            if (this.hoveredSelectionScaleHandle) {
                this.hoveredSelectionScaleHandle.material.color.copy(this.hoveredSelectionScaleHandle.userData.originalColor);
            }
            this.hoveredSelectionScaleHandle = newScaleHandleInfo?.handle || null;
            if (this.hoveredSelectionScaleHandle) {
                this.hoveredSelectionScaleHandle.material.color.setHex(SELECTION_HANDLE_HOVER_COLOR);
            }
        }

        // 2. Fractal UI Hover (only if no scale handle is hovered)
        if (!this.hoveredSelectionScaleHandle) {
            if (this.hoveredFractalElement !== newFractalElInfo?.object) {
                if (this.hoveredFractalElement) {
                    const oldHoveredElement = this.hoveredFractalElement;
                    const originalColor = oldHoveredElement.userData.originalColor ||
                                          (oldHoveredElement.material.color ? oldHoveredElement.material.color.clone() : new THREE.Color(0xffffff));
                    setFractalElementActive(oldHoveredElement, false, originalColor, false);
                    this.hudManager.hideFractalTooltip();
                }
                this.hoveredFractalElement = newFractalElInfo?.object || null;
                if (this.hoveredFractalElement) {
                    const newHoveredElement = this.hoveredFractalElement;
                    const originalColor = newHoveredElement.userData.originalColor ||
                                          (newHoveredElement.material.color ? newHoveredElement.material.color.clone() : new THREE.Color(0xffffff));
                    setFractalElementActive(newHoveredElement, true, originalColor, false);
                    if (newHoveredElement.userData.tooltipText) {
                        this.hudManager.showFractalTooltip(newHoveredElement.userData.tooltipText, e.clientX, e.clientY);
                    }
                }
            } else if (this.hoveredFractalElement && newFractalElInfo?.object === this.hoveredFractalElement) {
                if (this.hoveredFractalElement.userData.tooltipText) {
                    this.hudManager.showFractalTooltip(this.hoveredFractalElement.userData.tooltipText, e.clientX, e.clientY);
                }
            }
        } else { // If a scale handle is hovered, ensure fractal element is unhovered
            if (this.hoveredFractalElement) {
                 const oldHoveredElement = this.hoveredFractalElement;
                 const originalColor = oldHoveredElement.userData.originalColor || new THREE.Color(0xffffff);
                 setFractalElementActive(oldHoveredElement, false, originalColor, false);
                 this.hudManager.hideFractalTooltip();
                 this.hoveredFractalElement = null;
            }
        }

        // 3. Gizmo Hover (only if no scale handle or fractal element is hovered)
        if (!this.hoveredSelectionScaleHandle && !this.hoveredFractalElement) {
            if (this.hoveredGizmoHandle !== newGizmoHInfo?.object) {
                if (this.hoveredGizmoHandle && this.gizmo) this.gizmo.setHandleActive(this.hoveredGizmoHandle, false);
                this.hoveredGizmoHandle = newGizmoHInfo?.object || null;
                if (this.hoveredGizmoHandle && this.gizmo) this.gizmo.setHandleActive(this.hoveredGizmoHandle, true);
            }
        } else { // If scale handle or fractal is hovered, ensure gizmo is not highlighted
            if (this.hoveredGizmoHandle && this.gizmo) {
                this.gizmo.setHandleActive(this.hoveredGizmoHandle, false);
                this.hoveredGizmoHandle = null;
            }
        }


        // 4. Metaframe Hover (lowest priority among 3D handles)
        if (!this.hoveredSelectionScaleHandle && !this.hoveredFractalElement && !this.hoveredGizmoHandle) {
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
        } else { // If any higher priority handle is hovered, ensure metaframe is not active
             if (this.currentHoveredGLHandle) {
                const oldMf = this.currentHoveredGLHandle.node?.ensureMetaframe();
                if (oldMf) {
                    oldMf.highlightHandle(this.currentHoveredGLHandle.handleMesh, false);
                    oldMf.setHandleTooltip(this.hoveredHandleType, '', false);
                }
                this.currentHoveredGLHandle = null;
            }
            this.hoveredHandleType = null;
            if (this.hoveredNodeForMetaframe && !selectedNodes.has(this.hoveredNodeForMetaframe)) {
                 this.hoveredNodeForMetaframe.ensureMetaframe()?.hide();
                 this.hoveredNodeForMetaframe = null;
            }
        }


        // 5. Edge Hover (original)
        const currentlySelectedEdges = this._uiPluginCallbacks.getSelectedEdges() || new Set();
        if (this.hoveredEdge !== newHoveredEdge) {
            if (this.hoveredEdge && !currentlySelectedEdges.has(this.hoveredEdge))
                this.hoveredEdge.setHoverStyle(false);
            this.hoveredEdge = newHoveredEdge;
            if (this.hoveredEdge && !currentlySelectedEdges.has(this.hoveredEdge)) this.hoveredEdge.setHoverStyle(true);
        }

        // Cursor logic based on hover priority
        if (this.hoveredSelectionScaleHandle) {
            document.body.style.cursor = 'nwse-resize'; // Or more specific if different handle types
        } else if (this.hoveredFractalElement) {
            document.body.style.cursor = 'pointer';
        } else if (this.hoveredGizmoHandle) {
            document.body.style.cursor = 'pointer';
        } else if (this.currentHoveredGLHandle) {
            // Cursor set by metaframe logic
        } else if (this.hoveredEdge) {
            document.body.style.cursor = 'pointer';
        } else if (
            this.adaptiveGeometricHub?.visible ||
            this.gizmo?.visible ||
            this.selectionScaleHandlesGroup?.visible || // Added this condition
            this.hoveredNodeForMetaframe ||
            (newlyHoveredNode && selectedNodes.has(newlyHoveredNode))
        ) {
            document.body.style.cursor = (this.adaptiveGeometricHub?.visible || this.gizmo?.visible || this.selectionScaleHandlesGroup?.visible) ? 'default' : 'grab';
        } else {
            document.body.style.cursor = 'grab';
        }


        // Update scaling for visible UI elements
        const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        if (camera) {
            if (this.adaptiveGeometricHub?.visible && this.adaptiveGeometricHub.parent) {
                 const aghWorldPos = this.adaptiveGeometricHub.getWorldPosition(new THREE.Vector3());
                 updateFractalUIScale(this.adaptiveGeometricHub, camera, REFERENCE_DISTANCE_FRACTAL_UI, aghWorldPos);
            }
            if (this.fractalAxisManipulators?.visible && this.fractalAxisManipulators.parent) {
                const transAxesWorldPos = this.fractalAxisManipulators.getWorldPosition(new THREE.Vector3());
                updateFractalUIScale(this.fractalAxisManipulators, camera, REFERENCE_DISTANCE_FRACTAL_UI, transAxesWorldPos);
            }
            if (this.fractalRotationManipulators?.visible && this.fractalRotationManipulators.parent) {
                const rotAxesWorldPos = this.fractalRotationManipulators.getWorldPosition(new THREE.Vector3());
                updateFractalUIScale(this.fractalRotationManipulators, camera, REFERENCE_DISTANCE_FRACTAL_UI, rotAxesWorldPos);
            }
            if (this.fractalScaleManipulators?.visible && this.fractalScaleManipulators.parent) {
                const scaleAxesWorldPos = this.fractalScaleManipulators.getWorldPosition(new THREE.Vector3());
                updateFractalUIScale(this.fractalScaleManipulators, camera, REFERENCE_DISTANCE_FRACTAL_UI, scaleAxesWorldPos);
            }
            if (this.gizmo?.visible && this.gizmo.parent) {
                this.gizmo.updateScale(camera);
            }
            if (this.selectionScaleHandlesGroup?.visible && this.selectionScaleHandlesGroup.parent) {
                const groupWorldPos = this.selectionScaleHandlesGroup.getWorldPosition(new THREE.Vector3());
                const dist = Math.max(1, groupWorldPos.distanceTo(camera.position));
                const scaleFactor = Math.max(0.01, dist / REFERENCE_DISTANCE_FRACTAL_UI);
                this.selectionScaleHandlesGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
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
            this.fractalAxisManipulators.children.forEach(child => {
                child.geometry?.dispose();
                child.material?.dispose();
            });
            this.fractalAxisManipulators = null;
        }
        if (this.fractalRotationManipulators) {
            this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.remove(this.fractalRotationManipulators);
            this.fractalRotationManipulators.children.forEach(child => {
                child.geometry?.dispose();
                child.material?.dispose();
                if (child.userData.degreeMarkers) { // Dispose degree markers if any
                    child.userData.degreeMarkers.forEach(marker => {
                        marker.geometry?.dispose();
                        marker.material?.dispose(); // Assuming markers share material or have own
                    });
                }
            });
            this.fractalRotationManipulators = null;
        }
        if (this.fractalScaleManipulators) {
            this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.remove(this.fractalScaleManipulators);
            this.fractalScaleManipulators.children.forEach(child => {
                child.geometry?.dispose();
                child.material?.dispose();
            });
            this.fractalScaleManipulators = null;
        }

        if (this.selectionScaleHandlesGroup) {
            this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.remove(this.selectionScaleHandlesGroup);
            this.selectionScaleHandles.forEach(handle => {
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
            if (!gizmoInfo.rotationPlane || gizmoInfo.initialAngle === undefined || !gizmoInfo.cumulativeDeltaQuaternion || !gizmoInfo.gizmoCenter) {
                // console.warn("Gizmo rotation not properly initialized.", gizmoInfo);
                return;
            }

            const currentPointerOnPlane = new THREE.Vector3();
            if (!raycaster.ray.intersectPlane(gizmoInfo.rotationPlane, currentPointerOnPlane)) return;

            const currentVectorOnPlane = new THREE.Vector3().subVectors(currentPointerOnPlane, gizmoInfo.gizmoCenter);
            let currentAngle = 0;
            if (gizmoInfo.axis === 'y') {
                currentAngle = Math.atan2(currentVectorOnPlane.z, currentVectorOnPlane.x);
            } else if (gizmoInfo.axis === 'x') {
                currentAngle = Math.atan2(currentVectorOnPlane.z, currentVectorOnPlane.y);
            } else { // axis === 'z'
                currentAngle = Math.atan2(currentVectorOnPlane.y, currentVectorOnPlane.x);
            }

            let angleDelta = currentAngle - gizmoInfo.initialAngle;
            angleDelta = ((angleDelta + Math.PI) % (2 * Math.PI)) - Math.PI; // Normalize

            const rotationAxisWorld = TranslationGizmo.getAxisVector(gizmoInfo.axis).clone().applyQuaternion(this.gizmo.quaternion);
            const frameDeltaQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxisWorld, angleDelta);

            // Accumulate rotation
            gizmoInfo.cumulativeDeltaQuaternion.premultiply(frameDeltaQuaternion);

            // Update initialAngle for next frame's delta calculation
            gizmoInfo.initialAngle = currentAngle;


            // Apply the CUMULATIVE rotation to initial states
            const pivotPoint = gizmoInfo.gizmoCenter;

            if (selectedNodes.size > 1 && this.multiSelectionHelper) {
                // Rotate the helper object using the cumulative rotation from its initial state (which was aligned with gizmo at drag start)
                // The multiSelectionHelper's initial quaternion was identity relative to the gizmo's frame if gizmo itself can rotate.
                // Or, if gizmo is always world-aligned for multi-select rotation, helper starts world-aligned.
                // For simplicity, assume multiSelectionHelper starts with gizmo's orientation, or identity if gizmo is world-aligned.
                // The initial setup for multiSelectionHelper in GIZMO_DRAGGING already sets its position and quaternion.
                // We apply the cumulative delta to its initial quaternion.

                // If multiSelectionHelper's initial quaternion was stored (e.g. multiSelectionHelper.userData.initialQuaternion)
                // this.multiSelectionHelper.quaternion.copy(gizmoInfo.cumulativeDeltaQuaternion).multiply(multiSelectionHelper.userData.initialQuaternion);
                // For now, let's assume it starts as identity relative to the cumulative rotation.
                this.multiSelectionHelper.quaternion.copy(gizmoInfo.cumulativeDeltaQuaternion);
                // The helper's position is the pivotPoint (gizmoCenter)
                this.multiSelectionHelper.position.copy(pivotPoint);
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
                        const initialNodeWorldPos = this.selectedNodesInitialPositions.get(node.id);
                        const initialNodeWorldQuaternion = this.selectedNodesInitialQuaternions.get(node.id);
                        const offsetFromPivot = node.userData.initialOffsetFromMultiSelectCenter; // This was offset from helper's initial position

                        if (initialNodeWorldPos && initialNodeWorldQuaternion && offsetFromPivot) {
                            // The offsetFromPivot was in the coordinate system of the multiSelectionHelper *before* any rotation.
                            // Now, apply the helper's current (cumulative) rotation to this offset.
                            const rotatedOffset = offsetFromPivot.clone().applyQuaternion(this.multiSelectionHelper.quaternion);
                            const newWorldPos = pivotPoint.clone().add(rotatedOffset);
                            node.setPosition(newWorldPos.x, newWorldPos.y, newWorldPos.z);

                            // Node's new orientation = helper's current orientation * node's initial orientation relative to helper
                            // Assuming node's initial orientation relative to helper was identity for simplicity of this example,
                            // or it was stored. For now, let's combine the cumulative rotation with the node's original world rotation.
                            // This is equivalent to rotating the node in world space by the same cumulative amount as the helper.
                            if (node.mesh) {
                                const newQuaternion = gizmoInfo.cumulativeDeltaQuaternion.clone().multiply(initialNodeWorldQuaternion);
                                node.mesh.quaternion.copy(newQuaternion);
                            }
                        }
                    }
                });
            } else { // Single node selection
                selectedNodes.forEach((node) => {
                    const initialPos = this.selectedNodesInitialPositions.get(node.id);
                    const initialQuaternion = this.selectedNodesInitialQuaternions.get(node.id);
                    if (initialPos && initialQuaternion) {
                        const offset = initialPos.clone().sub(pivotPoint);
                        offset.applyQuaternion(gizmoInfo.cumulativeDeltaQuaternion);
                        const newPos = pivotPoint.clone().add(offset);
                        node.setPosition(newPos.x, newPos.y, newPos.z);

                        if (node.mesh) {
                            const newQuaternion = gizmoInfo.cumulativeDeltaQuaternion.clone().multiply(initialQuaternion);
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
