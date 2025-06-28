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
    /** @type {TranslationGizmo | null} The translation gizmo instance. */
    translationGizmo = null;
    /** @type {'translate' | 'rotate' | 'scale' | null} The currently active gizmo type. */
    activeGizmo = null;
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
        this.translationGizmo = new TranslationGizmo();
        this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.add(this.translationGizmo);
        this.translationGizmo.hide();

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
        if (this.translationGizmo) {
            this.translationGizmo.hide();
        }
        this.activeGizmo = null;
    }

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

        if (selectedNodes.size === 1) {
            const node = selectedNodes.values().next().value;
            this.translationGizmo.position.copy(node.position);
            if (camera) this.translationGizmo.updateScale(camera);
            this.translationGizmo.show();
            this.activeGizmo = 'translate';
        } else if (selectedNodes.size > 1) {
            const center = new THREE.Vector3();
            selectedNodes.forEach(n => center.add(n.position));
            center.divideScalar(selectedNodes.size);
            this.translationGizmo.position.copy(center);
            if (camera) this.translationGizmo.updateScale(camera);
            this.translationGizmo.show();
            this.activeGizmo = 'translate';
        } else {
            this.translationGizmo.hide();
            this.activeGizmo = null;
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
                if (this.translationGizmo && this.draggedGizmoHandleInfo?.object) {
                     this.translationGizmo.setHandleActive(this.draggedGizmoHandleInfo.object, false);
                }
                this.draggedGizmoHandleInfo = null;
                document.body.style.cursor = this.activeGizmo ? 'default' : 'grab';
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
        }

        this.currentState = newState;

        switch (newState) {
            case InteractionState.DRAGGING_NODE: {
                this.draggedNode = data.node;
                this.draggedNodeInitialWorldPos.copy(this.draggedNode.position);
                if (this.draggedNode.mesh) this.draggedNodeInitialQuaternion.copy(this.draggedNode.mesh.quaternion);
                this.draggedNode.startDrag();
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (!camera) { this._transitionToState(InteractionState.IDLE); return; }
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
                    const fallbackWorldPos = this.space.screenToWorld(this.pointerState.clientX, this.pointerState.clientY, this.draggedNodeInitialWorldPos.z);
                    this.dragOffset = fallbackWorldPos ? fallbackWorldPos.sub(this.draggedNode.position) : new THREE.Vector3();
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
                if (!this.resizedNode.mesh) { this._transitionToState(InteractionState.IDLE); return; }
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
                    const inverseNodeWorldQuaternion = this.resizedNode.mesh.getWorldQuaternion(new THREE.Quaternion()).invert();
                    this.resizeStartHandleLocalPos.applyQuaternion(inverseNodeWorldQuaternion);
                } else {
                    const halfSize = this.resizeStartNodeSize.clone().multiplyScalar(0.5);
                    switch (this.activeResizeHandleType) {
                        case 'topLeft': this.resizeStartHandleLocalPos.set(-halfSize.x, halfSize.y, 0); break;
                        case 'topRight': this.resizeStartHandleLocalPos.set(halfSize.x, halfSize.y, 0); break;
                        case 'bottomLeft': this.resizeStartHandleLocalPos.set(-halfSize.x, -halfSize.y, 0); break;
                        case 'bottomRight': this.resizeStartHandleLocalPos.set(halfSize.x, -halfSize.y, 0); break;
                        default: this.resizeStartHandleLocalPos.set(0,0,0);
                    }
                }
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (camera) {
                    const nodeLocalZAxisInWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(this.resizedNode.mesh.getWorldQuaternion(new THREE.Quaternion()));
                    const initialHandleWorldPos = this.resizeStartHandleLocalPos.clone().applyMatrix4(this.resizeNodeInitialMatrixWorld);
                    this.resizeInteractionPlane.setFromNormalAndCoplanarPoint(nodeLocalZAxisInWorld, initialHandleWorldPos);
                } else {
                    this.resizeInteractionPlane.setComponents(0, 0, 1, -this.resizedNode.position.z);
                }
                document.body.style.cursor = this._getCursorForHandle(this.activeResizeHandleType) || 'nwse-resize';
                break;
            }
            case InteractionState.GIZMO_DRAGGING: {
                this.draggedGizmoHandleInfo = data.gizmoHandleInfo;
                this.gizmoDragStartPointerWorldPos.copy(data.initialPointerWorldPos);
                this.selectedNodesInitialPositions = data.selectedNodesInitialPositions;
                if (this.translationGizmo && this.draggedGizmoHandleInfo.type === 'translate' && this.draggedGizmoHandleInfo.object) {
                    this.translationGizmo.setHandleActive(this.draggedGizmoHandleInfo.object, true);
                }
                document.body.style.cursor = 'grabbing';
                this.space.isDragging = true;
                break;
            }
            case InteractionState.PANNING: {
                this.space.plugins.getPlugin('CameraPlugin')?.startPan(this.pointerState.clientX, this.pointerState.clientY);
                document.body.style.cursor = 'grabbing';
                break;
            }
            case InteractionState.LINKING_NODE: {
                document.body.style.cursor = 'crosshair';
                this._createTempLinkLine(data.sourceNode);
                break;
            }
            case InteractionState.IDLE: {
                document.body.style.cursor = this.activeGizmo ? 'default' : 'grab';
                break;
            }
        }
        this.space.emit('interaction:stateChanged', { newState, oldState: this.currentState, data });
    }

    _onPointerDown = (e) => {
        if (this.activePointerId !== null && this.activePointerId !== e.pointerId) return;
        this.activePointerId = e.pointerId;
        this._updateNormalizedPointerState(e, true);
        const targetInfo = this._getTargetInfo(e);

        const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
        if (cameraPlugin?.getCameraMode() === 'free' && cameraPlugin.getControls()?.isPointerLocked && this.pointerState.button === 0) return;

        // Gizmo Interaction takes precedence
        if (this.pointerState.button === 0 && targetInfo.gizmoHandleInfo) {
            e.preventDefault();
            e.stopPropagation();
            const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
            if (selectedNodes && selectedNodes.size > 0) {
                const initialPositions = new Map();
                selectedNodes.forEach(node => initialPositions.set(node.id, node.position.clone()));

                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                const raycaster = new THREE.Raycaster();
                const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera);

                let initialPointerWorldPosOnGizmo = new THREE.Vector3();
                const intersects = raycaster.intersectObject(targetInfo.gizmoHandleInfo.object, false);
                if (intersects.length > 0) {
                    initialPointerWorldPosOnGizmo.copy(intersects[0].point);
                } else {
                    const gizmoPlaneNormal = new THREE.Vector3();
                    camera.getWorldDirection(gizmoPlaneNormal);
                    const interactionPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(gizmoPlaneNormal, this.translationGizmo.position);
                    if (!raycaster.ray.intersectPlane(interactionPlane, initialPointerWorldPosOnGizmo)) {
                        initialPointerWorldPosOnGizmo.copy(this.translationGizmo.position);
                    }
                }

                this._transitionToState(InteractionState.GIZMO_DRAGGING, {
                    gizmoHandleInfo: targetInfo.gizmoHandleInfo,
                    initialPointerWorldPos: initialPointerWorldPosOnGizmo,
                    selectedNodesInitialPositions: initialPositions
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
                e.preventDefault(); e.stopPropagation();
                this._handleNodeControlButtonClick(targetInfo.nodeControls, targetInfo.node);
                return;
            }
            if (targetInfo.metaframeHandleInfo && targetInfo.metaframeHandleInfo.node) {
                e.preventDefault(); e.stopPropagation();
                const {node: handleNode, type: handleType} = targetInfo.metaframeHandleInfo;
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
                        this.dragInteractionPlane.setFromNormalAndCoplanarPoint(cameraForward, this.draggedNodeInitialWorldPos);
                        currentInteractionPlane = this.dragInteractionPlane;
                    }
                    const intersectionPoint = new THREE.Vector3();
                    if (raycaster.ray.intersectPlane(currentInteractionPlane, intersectionPoint)) {
                        const primaryNodeNewCalculatedPos = intersectionPoint.clone().sub(this.dragOffset);
                        const dragDelta = primaryNodeNewCalculatedPos.clone().sub(this.draggedNode.position);
                        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
                        if (selectedNodes?.size > 0 && selectedNodes.has(this.draggedNode)) {
                            selectedNodes.forEach((sNode) => {
                                const newPos = sNode === this.draggedNode ? primaryNodeNewCalculatedPos : sNode.position.clone().add(dragDelta);
                                sNode.drag(newPos);
                                if (sNode.mesh) sNode.mesh.quaternion.copy(this.draggedNodeInitialQuaternion);
                            });
                        } else {
                            this.draggedNode.drag(primaryNodeNewCalculatedPos);
                            if (this.draggedNode.mesh) this.draggedNode.mesh.quaternion.copy(this.draggedNodeInitialQuaternion);
                        }
                        this.space.emit('graph:node:dragged', { node: this.draggedNode, position: primaryNodeNewCalculatedPos });
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
                    const initialHandleWorldPos = this.resizeStartHandleLocalPos.clone().applyMatrix4(this.resizeNodeInitialMatrixWorld);
                    const worldDisplacement = new THREE.Vector3().subVectors(currentHandleWorldPosOnPlane, initialHandleWorldPos);
                    const inverseInitialNodeMatrix = new THREE.Matrix4().copy(this.resizeNodeInitialMatrixWorld).invert();
                    const worldDisplacementEndPoint = initialHandleWorldPos.clone().add(worldDisplacement);
                    const localEndPoint = worldDisplacementEndPoint.clone().applyMatrix4(inverseInitialNodeMatrix);
                    const localStartPoint = initialHandleWorldPos.clone().applyMatrix4(inverseInitialNodeMatrix);
                    const localDisplacement = new THREE.Vector3().subVectors(localEndPoint, localStartPoint);
                    let deltaWidth = 0, deltaHeight = 0;
                    if (this.activeResizeHandleType.includes('Left')) deltaWidth = -localDisplacement.x;
                    else if (this.activeResizeHandleType.includes('Right')) deltaWidth = localDisplacement.x;
                    if (this.activeResizeHandleType.includes('Top')) deltaHeight = localDisplacement.y;
                    else if (this.activeResizeHandleType.includes('Bottom')) deltaHeight = -localDisplacement.y;
                    let newWorldWidth = Math.max(20, this.resizeStartNodeSize.x + deltaWidth);
                    let newWorldHeight = Math.max(20, this.resizeStartNodeSize.y + deltaHeight);
                    const newWorldDimensions = new THREE.Vector3(newWorldWidth, newWorldHeight, this.resizeStartNodeSize.z);
                    this.resizedNode.resize(newWorldDimensions);
                    this.space.emit('graph:node:resized', {
                        node: this.resizedNode,
                        ...(this.resizedNode instanceof HtmlNode && { size: { ...this.resizedNode.size }, scale: { x: newWorldWidth / this.resizedNode.baseSize.width, y: newWorldHeight / this.resizedNode.baseSize.height, z: this.resizeStartNodeScale.z } }),
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
                if (targetInfo.node && targetInfo.node !== this._uiPluginCallbacks.getLinkSourceNode() && targetElement) {
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
            if (targetInfo.node instanceof HtmlNode && targetInfo.node.data.editable && targetInfo.element?.closest('.node-content') === targetInfo.node.htmlElement.querySelector('.node-content')) {
            }
        }

        if (currentInteractionState === InteractionState.LINKING_NODE && e.button === 0) {
            this._uiPluginCallbacks.completeLinking(this.pointerState.clientX, this.pointerState.clientY);
        }
        this._transitionToState(InteractionState.IDLE);
        this.activePointerId = null;
    };

    _handleNodeControlButtonClick(buttonEl, node) {
        if (!(node instanceof HtmlNode)) return;
        const actionClass = [...buttonEl.classList].find((cls) => cls.startsWith('node-') && !cls.includes('button'));
        const action = actionClass?.substring('node-'.length);
        switch (action) {
            case 'delete': this.space.emit('ui:request:confirm', { message: `Delete node "${node.id.substring(0,10)}..."?`, onConfirm: () => this.space.emit('ui:request:removeNode', node.id) }); break;
            case 'content-zoom-in': this.space.emit('ui:request:adjustContentScale', {node, factor: 1.15}); break;
            case 'content-zoom-out': this.space.emit('ui:request:adjustContentScale', {node, factor: 1/1.15}); break;
            case 'grow': this.space.emit('ui:request:adjustNodeSize', {node, factor: 1.2}); break;
            case 'shrink': this.space.emit('ui:request:adjustNodeSize', {node, factor: 1/1.2}); break;
        }
    }

    _onContextMenu = (e) => {
        e.preventDefault();
        this._updateNormalizedPointerState(e);
        this.contextMenu.hide();
        const targetInfo = this._getTargetInfo(e);
        if (targetInfo.gizmoHandleInfo) return;
        this.contextMenu.show(e.clientX, e.clientY, { node: targetInfo.node, intersectedEdge: targetInfo.intersectedEdge, shiftKey: e.shiftKey });
    };

    _onDocumentClick = (e) => {
        if (this.contextMenu.contextMenuElement.contains(e.target) || this.contextMenu.contextMenuElement.style.display === 'none') return;
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
        const isEditingText = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
        if (isEditingText && e.key !== 'Escape') return;

        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
        const selectedEdges = this._uiPluginCallbacks.getSelectedEdges();
        const primarySelectedNode = selectedNodes.size > 0 ? selectedNodes.values().next().value : null;
        const primarySelectedEdge = selectedEdges.size > 0 ? selectedEdges.values().next().value : null;
        let handled = false;

        switch (e.key) {
            case 'Delete': case 'Backspace':
                if (primarySelectedNode) {
                    const msg = selectedNodes.size > 1 ? `Delete ${selectedNodes.size} selected nodes?` : `Delete node "${primarySelectedNode.id.substring(0,10)}..."?`;
                    this.space.emit('ui:request:confirm', { message: msg, onConfirm: () => selectedNodes.forEach(n => this.space.emit('ui:request:removeNode', n.id))});
                    handled = true;
                } else if (primarySelectedEdge) {
                    const msg = selectedEdges.size > 1 ? `Delete ${selectedEdges.size} selected edges?` : `Delete edge "${primarySelectedEdge.id.substring(0,10)}..."?`;
                    this.space.emit('ui:request:confirm', { message: msg, onConfirm: () => selectedEdges.forEach(edge => this.space.emit('ui:request:removeEdge', edge.id))});
                    handled = true;
                }
                break;
            case 'Escape':
                if (this._uiPluginCallbacks.getIsLinking()) { this._uiPluginCallbacks.cancelLinking(); handled = true; }
                else if (this.hudManager.isLayoutSettingsDialogVisible()) { this.hudManager.layoutSettingsDialog.hide(); handled = true; }
                else if (this.hudManager.isKeyboardShortcutsDialogVisible()) { this.hudManager.keyboardShortcutsDialog.hide(); handled = true; }
                else if (this.contextMenu.contextMenuElement.style.display === 'block') { this.contextMenu.hide(); handled = true; }
                else if (this.confirmDialog.confirmDialogElement.style.display === 'block') { this.confirmDialog.hide(); handled = true; }
                else if (this.edgeMenu.edgeMenuObject) { this._uiPluginCallbacks.setSelectedEdge(null, false); handled = true; }
                else if (selectedNodes.size > 0 || selectedEdges.size > 0) { this._uiPluginCallbacks.setSelectedNode(null, false); handled = true; }
                const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
                if (camPlugin?.getCameraMode() === 'free' && camPlugin.getControls()?.isPointerLocked) { camPlugin.exitPointerLock(); handled = true; }
                break;
            case 'Enter':
                if (primarySelectedNode instanceof HtmlNode && primarySelectedNode.data.editable && !isEditingText) {
                    primarySelectedNode.htmlElement?.querySelector('.node-content')?.focus(); handled = true;
                }
                break;
            case '+': case '=':
                if (primarySelectedNode instanceof HtmlNode) {
                    const eventName = (e.ctrlKey || e.metaKey) ? 'ui:request:adjustNodeSize' : 'ui:request:adjustContentScale';
                    const factor = (e.ctrlKey || e.metaKey) ? 1.2 : 1.15;
                    this.space.emit(eventName, { node: primarySelectedNode, factor }); handled = true;
                }
                break;
            case '-': case '_':
                if (primarySelectedNode instanceof HtmlNode) {
                    const eventName = (e.ctrlKey || e.metaKey) ? 'ui:request:adjustNodeSize' : 'ui:request:adjustContentScale';
                    const factor = (e.ctrlKey || e.metaKey) ? 1/1.2 : 1/1.15;
                    this.space.emit(eventName, { node: primarySelectedNode, factor }); handled = true;
                }
                break;
            case ' ':
                if (primarySelectedNode) { this.space.emit('ui:request:focusOnNode', primarySelectedNode, 0.5, true); handled = true; }
                else if (primarySelectedEdge) {
                    const midPoint = new THREE.Vector3().lerpVectors(primarySelectedEdge.source.position, primarySelectedEdge.target.position, 0.5);
                    const dist = primarySelectedEdge.source.position.distanceTo(primarySelectedEdge.target.position);
                    const cam = this.space.plugins.getPlugin('CameraPlugin');
                    cam?.pushState();
                    cam?.moveTo(midPoint.x, midPoint.y, midPoint.z + dist * 0.6 + 100, 0.5, midPoint);
                    handled = true;
                } else { this.space.emit('ui:request:centerView'); handled = true; }
                break;
        }
        if (handled) { e.preventDefault(); e.stopPropagation(); }
    };

    _onWheel = (e) => {
        const targetInfo = this._getTargetInfo(e);
        if (targetInfo.element?.closest('.node-content')?.scrollHeight > targetInfo.element?.clientHeight) return;
        if (targetInfo.element?.closest('.edge-menu-frame input[type="range"]')) return;

        if ((e.ctrlKey || e.metaKey) && targetInfo.node instanceof HtmlNode) {
            e.preventDefault(); e.stopPropagation();
            const scaleFactor = e.deltaY < 0 ? 1.1 : 1/1.1;
            this.space.emit('ui:request:adjustContentScale', { node: targetInfo.node, factor: scaleFactor });
        } else {
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

        let graphNode = nodeElement ? this.space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeElement.dataset.nodeId) : null;
        let intersectedEdge = null;
        let metaframeHandleInfo = null;
        let gizmoHandleInfo = null;

        if (!nodeControlsButton && !contentEditableEl && !interactiveEl) {
            const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
            if (camera) {
                const raycaster = new THREE.Raycaster();
                const pointerNDC = this.space.getPointerNDC(event.clientX, event.clientY);
                raycaster.setFromCamera(pointerNDC, camera);

                if (this.translationGizmo && this.translationGizmo.visible) {
                    const gizmoIntersects = raycaster.intersectObjects(this.translationGizmo.handles.children, false);
                    if (gizmoIntersects.length > 0) {
                        const intersectedHandle = gizmoIntersects[0].object;
                        if (intersectedHandle.userData?.isGizmoHandle) {
                            gizmoHandleInfo = {
                                axis: intersectedHandle.userData.axis,
                                type: intersectedHandle.userData.gizmoType,
                                part: intersectedHandle.userData.part,
                                object: intersectedHandle,
                                distance: gizmoIntersects[0].distance
                            };
                        }
                    }
                }
                if (!gizmoHandleInfo) {
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
            element, nodeElement, nodeControls: nodeControlsButton, contentEditable: contentEditableEl,
            interactiveElement: interactiveEl, node: graphNode, intersectedEdge,
            metaframeHandleInfo, gizmoHandleInfo
        };
    }

    _getCursorForHandle(handleType) {
        switch (handleType) {
            case 'topLeft': case 'bottomRight': return 'nwse-resize';
            case 'topRight': case 'bottomLeft': return 'nesw-resize';
            case 'dragHandle': return 'grab';
            default: return 'default';
        }
    }

    _getTooltipTextForHandle(handleType) {
        switch (handleType) {
            case 'topLeft': return 'Resize (Top-Left)';
            case 'topRight': return 'Resize (Top-Right)';
            case 'bottomLeft': return 'Resize (Bottom-Left)';
            case 'bottomRight': return 'Resize (Bottom-Right)';
            case 'dragHandle': return 'Move Node';
            default: return '';
        }
    }

    _handleHover(e) {
        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes() || new Set();
        if (this.pointerState.down || this.currentState !== InteractionState.IDLE) {
            if (this.hoveredNodeForMetaframe && !selectedNodes.has(this.hoveredNodeForMetaframe)) this.hoveredNodeForMetaframe.metaframe?.hide();
            this.hoveredNodeForMetaframe = null;
            if (this.currentHoveredGLHandle && this.currentHoveredGLHandle.node?.metaframe) {
                this.currentHoveredGLHandle.node.metaframe.highlightHandle(this.currentHoveredGLHandle.handleMesh, false);
                this.currentHoveredGLHandle.node.metaframe.setHandleTooltip(this.hoveredHandleType, '', false);
            }
            this.currentHoveredGLHandle = null; this.hoveredHandleType = null;
            if (this.hoveredGizmoHandle && this.translationGizmo) this.translationGizmo.setHandleActive(this.hoveredGizmoHandle, false);
            this.hoveredGizmoHandle = null;
            if (this.hoveredEdge) {
                const selectedEdges = this._uiPluginCallbacks.getSelectedEdges() || new Set();
                if(!selectedEdges.has(this.hoveredEdge)) this.hoveredEdge.setHoverStyle(false);
            }
            this.hoveredEdge = null;
            return;
        }

        const targetInfo = this._getTargetInfo(e);
        const { node: newlyHoveredNode, intersectedEdge: newHoveredEdge, metaframeHandleInfo: newMFHInfo, gizmoHandleInfo: newGizmoHInfo } = targetInfo;

        if (this.hoveredGizmoHandle !== newGizmoHInfo?.object) {
            if (this.hoveredGizmoHandle && this.translationGizmo) this.translationGizmo.setHandleActive(this.hoveredGizmoHandle, false);
            this.hoveredGizmoHandle = newGizmoHInfo?.object || null;
            if (this.hoveredGizmoHandle && this.translationGizmo) this.translationGizmo.setHandleActive(this.hoveredGizmoHandle, true);
        }

        if (this.hoveredNodeForMetaframe !== newlyHoveredNode) {
            if (this.hoveredNodeForMetaframe && !selectedNodes.has(this.hoveredNodeForMetaframe)) this.hoveredNodeForMetaframe.ensureMetaframe()?.hide();
            if (newlyHoveredNode && !selectedNodes.has(newlyHoveredNode) && newlyHoveredNode.metaframe) {
                const mf = newlyHoveredNode.ensureMetaframe();
                if (mf) {
                    mf.show();
                    Object.values(mf.resizeHandles).forEach(h => mf.highlightHandle(h, false));
                    if (mf.dragHandle) mf.highlightHandle(mf.dragHandle, false);
                }
            }
            this.hoveredNodeForMetaframe = newlyHoveredNode;
        }

        if (this.hoveredHandleType !== newMFHInfo?.type || this.currentHoveredGLHandle?.handleMesh !== newMFHInfo?.object) {
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
            } else { this.currentHoveredGLHandle = null; }
            this.hoveredHandleType = newMFHInfo?.type || null;
        }

        const currentlySelectedEdges = this._uiPluginCallbacks.getSelectedEdges() || new Set();
        if (this.hoveredEdge !== newHoveredEdge) {
            if (this.hoveredEdge && !currentlySelectedEdges.has(this.hoveredEdge)) this.hoveredEdge.setHoverStyle(false);
            this.hoveredEdge = newHoveredEdge;
            if (this.hoveredEdge && !currentlySelectedEdges.has(this.hoveredEdge)) this.hoveredEdge.setHoverStyle(true);
        }

        if (this.hoveredGizmoHandle) document.body.style.cursor = 'pointer';
        else if (this.currentHoveredGLHandle) { /* cursor set by metaframe logic */ }
        else if (this.hoveredEdge) document.body.style.cursor = 'pointer';
        else if (this.activeGizmo || this.hoveredNodeForMetaframe || (newlyHoveredNode && selectedNodes.has(newlyHoveredNode))) {
            document.body.style.cursor = this.activeGizmo ? 'default' : 'grab';
        }
        else document.body.style.cursor = 'grab';

        if (this.translationGizmo?.visible) {
            const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
            if (camera) this.translationGizmo.updateScale(camera);
        }
    }

    _createTempLinkLine(sourceNode) {
        this._removeTempLinkLine();
        const material = new THREE.LineDashedMaterial({ color: 0xffaa00, linewidth: 2, dashSize: 8, gapSize: 4, transparent: true, opacity: 0.9, depthTest: false });
        const points = [sourceNode.position.clone(), sourceNode.position.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.tempLinkLine = new THREE.Line(geometry, material);
        this.tempLinkLine.computeLineDistances();
        this.tempLinkLine.renderOrder = 1;
        this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.add(this.tempLinkLine);
    }

    _updateTempLinkLine(screenX, screenY) {
        if (!this.tempLinkLine || !this._uiPluginCallbacks.getIsLinking() || !this._uiPluginCallbacks.getLinkSourceNode()) return;
        const sourceNode = this._uiPluginCallbacks.getLinkSourceNode();
        let projectionZ = sourceNode.position.z;
        const potentialTargetInfo = this.space.intersectedObjects(screenX, screenY);
        if (potentialTargetInfo?.node && potentialTargetInfo.node !== sourceNode) projectionZ = potentialTargetInfo.node.position.z;
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

    _onLinkingStarted = (data) => this._transitionToState(InteractionState.LINKING_NODE, { sourceNode: data.sourceNode });
    _onLinkingCancelled = () => { this._removeTempLinkLine(); if (this.currentState === InteractionState.LINKING_NODE) this._transitionToState(InteractionState.IDLE); };
    _onLinkingCompleted = () => { this._removeTempLinkLine(); if (this.currentState === InteractionState.LINKING_NODE) this._transitionToState(InteractionState.IDLE); };

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

        if (this.translationGizmo) {
            this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.remove(this.translationGizmo);
            this.translationGizmo.dispose();
            this.translationGizmo = null;
        }

        this.space = null; this.container = null; this.draggedNode = null; this.resizedNode = null;
        this.hoveredEdge = null; this.hoveredGizmoHandle = null; this.draggedGizmoHandleInfo = null;
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
        if (!this.draggedGizmoHandleInfo || !this.translationGizmo || !this.space.isDragging) return;
        const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!camera) return;
        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
        if (!selectedNodes || selectedNodes.size === 0) return;

        const raycaster = new THREE.Raycaster();
        const pointerNDC = this.space.getPointerNDC(event.clientX, event.clientY);
        raycaster.setFromCamera(pointerNDC, camera);

        const gizmoInfo = this.draggedGizmoHandleInfo;
        let dragDelta = new THREE.Vector3();
        const currentPointerWorldPos = new THREE.Vector3();

        if (gizmoInfo.type === 'translate') {
            const gizmoWorldPosition = this.translationGizmo.position.clone();
            if (gizmoInfo.part === 'arrow') {
                const axisVectorWorld = TranslationGizmo.getAxisVector(gizmoInfo.axis).clone().applyQuaternion(this.translationGizmo.quaternion);
                const dragLine = new THREE.Line3(gizmoWorldPosition.clone().sub(axisVectorWorld.clone().multiplyScalar(10000)), gizmoWorldPosition.clone().add(axisVectorWorld.clone().multiplyScalar(10000)));
                raycaster.ray.closestPointToLine(dragLine, false, currentPointerWorldPos);
            } else if (gizmoInfo.part === 'plane') {
                const planeNormalWorld = TranslationGizmo.getPlaneNormal(gizmoInfo.axis).clone().applyQuaternion(this.translationGizmo.quaternion);
                const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormalWorld, this.gizmoDragStartPointerWorldPos);
                if (!raycaster.ray.intersectPlane(dragPlane, currentPointerWorldPos)) {
                     return;
                }
            }

            if (this.gizmoDragStartPointerWorldPos.lengthSq() > 0) {
                 dragDelta.subVectors(currentPointerWorldPos, this.gizmoDragStartPointerWorldPos);
            } else {
                return;
            }
        }

        selectedNodes.forEach(node => {
            const initialPos = this.selectedNodesInitialPositions.get(node.id);
            if (initialPos) {
                const newPos = initialPos.clone().add(dragDelta);
                node.position.copy(newPos);
                if (node.isHtmlNode && node.cssObject) node.cssObject.position.copy(newPos);
            }
        });

        this.space.emit('graph:nodes:transformed', { nodes: Array.from(selectedNodes), transformationType: 'translate' });

        if (selectedNodes.size > 1) {
            const center = new THREE.Vector3();
            selectedNodes.forEach(n => center.add(n.position));
            center.divideScalar(selectedNodes.size);
            this.translationGizmo.position.copy(center);
        } else if (selectedNodes.size === 1) {
            this.translationGizmo.position.copy(selectedNodes.values().next().value.position);
        }

        if (camera) this.translationGizmo.updateScale(camera);
    }
}
