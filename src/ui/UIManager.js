import * as THREE from 'three';
// import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'; // Unused
import { $, $$ } from '../utils.js';
import { HtmlNode } from '../graph/nodes/HtmlNode.js';

// Import decomposed modules
import { InteractionState } from './InteractionState.js';
import { ConfirmDialog } from './dialogs/ConfirmDialog.js';
import { ContextMenu } from './menus/ContextMenu.js';
import { EdgeMenu } from './menus/EdgeMenu.js';
import { HudManager } from './hud/HudManager.js';
import { Toolbar } from './Toolbar.js';

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

    draggedNode = null;
    //draggedNodeInitialZ = 0; // Replaced by dragInteractionPlane and initial world position
    dragOffset = new THREE.Vector3(); // Will store the offset on the interaction plane
    draggedNodeInitialQuaternion = new THREE.Quaternion(); // For debugging rotation
    dragInteractionPlane = new THREE.Plane(); // Plane for dragging calculations
    draggedNodeInitialWorldPos = new THREE.Vector3(); // Initial world position of the node when drag starts

    resizedNode = null;
    activeResizeHandleType = null; // For metaframe handles: 'topLeft', 'topRight', etc.
    resizeStartPointerPos = { x: 0, y: 0 }; // Screen position
    // For Generic Nodes (using Metaframe handles)
    resizeStartNodeScale = new THREE.Vector3(1, 1, 1); // Initial scale of the node's mesh
    resizeStartNodeSize = new THREE.Vector3(1, 1, 1); // Initial world size of the node (from getActualSize)
    resizeStartHandleLocalPos = new THREE.Vector3(); // Initial local position of the active handle relative to node center
    resizeInteractionPlane = new THREE.Plane(); // Plane for resize calculations
    resizeNodeInitialMatrixWorld = new THREE.Matrix4(); // Node's initial world matrix

    hoveredEdge = null;
    hoveredHandleType = null; // To track hovered metaframe handle for cursor changes
    currentHoveredGLHandle = null; // The actual THREE.Object3D of the handle
    hoveredNodeForMetaframe = null; // Tracks node whose metaframe is shown due to hover

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

    // Callbacks provided by the UIPlugin
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

    constructor(space, contextMenuEl, confirmDialogEl, uiPluginCallbacks) {
        if (!space || !contextMenuEl || !confirmDialogEl)
            throw new Error('UIManager requires SpaceGraph instance and UI elements.');
        this.space = space;
        this.container = space.container;

        this._uiPluginCallbacks = { ...this._uiPluginCallbacks, ...uiPluginCallbacks };

        // Initialize decomposed components
        this.confirmDialog = new ConfirmDialog(this.space, confirmDialogEl);
        this.contextMenu = new ContextMenu(this.space, contextMenuEl, this._uiPluginCallbacks);
        this.edgeMenu = new EdgeMenu(this.space, this._uiPluginCallbacks);
        this.hudManager = new HudManager(this.space, this.container, this._uiPluginCallbacks);
        this.toolbar = new Toolbar(this.space, $('#toolbar'));

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
        this.space.on('linking:started', this._onLinkingStarted);
        this.space.on('linking:cancelled', this._onLinkingCancelled);
        this.space.on('linking:succeeded', this._onLinkingCompleted);
        this.space.on('linking:failed', this._onLinkingCompleted);
        this.space.on('camera:modeChanged', this._onCameraModeChanged);
    }

    _onRequestConfirm = (payload) => {
        this.confirmDialog.show(payload.message, payload.onConfirm);
    };

    _onCameraModeChanged = (data) => {
        this.hudManager.updateHudCameraMode(data.newMode);
    };

    _onEditNodeRequest = ({ node }) => {
        // Emit a more specific event for other plugins to handle (e.g., opening a property editor)
        this.space.emit('ui:node:editRequested', { node });
    };

    _onDeleteNodeRequest = ({ node }) => {
        this.space.emit('ui:request:confirm', {
            message: `Delete node "${node.id.substring(0, 10)}..."?`,
            onConfirm: () => this.space.emit('ui:request:removeNode', node.id),
        });
    };

    _onSelectionChanged = (payload) => {
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
        if (this.currentState === newState) return;

        // console.log(`UIManager: Exiting state: ${this.currentState}, transitioning to ${newState}`);
        switch (this.currentState) {
            case InteractionState.DRAGGING_NODE:
                this.draggedNode?.endDrag();
                // Reset cursor to default 'grab' as it will likely transition to IDLE or be updated by hover.
                document.body.style.cursor = 'grab';
                this.draggedNode = null;
                this.space.isDragging = false; // Reset flag
                break;
            case InteractionState.RESIZING_NODE:
                this.resizedNode?.endResize();
                // Reset cursor to default 'grab' as it will likely transition to IDLE or be updated by hover.
                document.body.style.cursor = 'grab';
                this.resizedNode = null;
                this.space.isDragging = false; // Reset flag
                break;
            case InteractionState.PANNING:
                this.space.plugins.getPlugin('CameraPlugin')?.endPan();
                // Reset cursor to default 'grab' as it will likely transition to IDLE or be updated by hover.
                document.body.style.cursor = 'grab';
                break;
            case InteractionState.LINKING_NODE:
                // Reset cursor to default 'grab' as it will likely transition to IDLE or be updated by hover.
                document.body.style.cursor = 'grab';
                $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
                break;
        }

        this.currentState = newState;

        switch (newState) {
            case InteractionState.DRAGGING_NODE: {
                this.draggedNode = data.node;
                // Store initial world position of the node. This is crucial for defining the interaction plane's depth
                // and for calculating the offset if Alt-key Z adjustment is used.
                this.draggedNodeInitialWorldPos.copy(this.draggedNode.position);

                if (this.draggedNode.mesh) {
                    // Preserve initial orientation if the node has a mesh, to restore it during drag,
                    // preventing the node from re-orienting if the drag logic only sets position.
                    this.draggedNodeInitialQuaternion.copy(this.draggedNode.mesh.quaternion);
                }
                this.draggedNode.startDrag(); // Notify node it's being dragged (e.g., for visual state changes).

                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (!camera) {
                    // console.error("UIManager: Camera not found for DRAGGING_NODE state setup.");
                    this._transitionToState(InteractionState.IDLE); // Revert to IDLE if camera is essential and missing.
                    return;
                }

                // 1. Define the dragging interaction plane:
                //    - Normal: Camera's current forward vector (so the plane faces the camera).
                //    - Coplanar Point: The node's initial world position.
                //    This setup means the node starts on this plane, and dragging will occur on this camera-aligned plane.
                const cameraForward = new THREE.Vector3();
                camera.getWorldDirection(cameraForward); // This vector points in the direction the camera is looking.
                this.dragInteractionPlane.setFromNormalAndCoplanarPoint(cameraForward, this.draggedNodeInitialWorldPos);

                // 2. Calculate the initial drag offset:
                //    This offset is the 3D vector from the node's initial world position (draggedNodeInitialWorldPos)
                //    to the initial projection of the mouse pointer onto the dragInteractionPlane.
                //    During dragging, this offset is subtracted from the current mouse projection on the plane
                //    to determine the node's new position, making the node appear "stuck" to the cursor correctly.
                const raycaster = new THREE.Raycaster();
                // Convert screen mouse coordinates to Normalized Device Coordinates (NDC) for raycasting.
                const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera); // Setup ray from camera through mouse position.

                const initialIntersectionPoint = new THREE.Vector3();
                if (raycaster.ray.intersectPlane(this.dragInteractionPlane, initialIntersectionPoint)) {
                    // dragOffset = initialIntersectionPointOnPlane - nodeInitialWorldPosition
                    this.dragOffset.subVectors(initialIntersectionPoint, this.draggedNodeInitialWorldPos);
                } else {
                    // Fallback strategy if the ray doesn't intersect the plane (e.g., if plane is somehow behind camera).
                    // This should be rare with a forward-facing plane.
                    // Uses a simpler screen-to-world projection based on the node's initial Z depth.
                    const fallbackWorldPos = this.space.screenToWorld(
                        this.pointerState.clientX,
                        this.pointerState.clientY,
                        this.draggedNodeInitialWorldPos.z // Fallback to a plane at the node's initial Z depth.
                    );
                    // Calculate fallback dragOffset based on current node position (less accurate for the new plane method but better than nothing).
                    this.dragOffset = fallbackWorldPos ? fallbackWorldPos.sub(this.draggedNode.position) : new THREE.Vector3();
                    // console.warn("UIManager: Drag interaction plane intersection failed during setup. Using fallback offset.");
                }

                document.body.style.cursor = 'grabbing'; // Set cursor to indicate dragging.
                this.space.isDragging = true; // Global flag for space state.
                break;
            }
            case InteractionState.RESIZING_NODE: {
                this.resizedNode = data.node;
                this.resizedNode.startResize(); // Notify node for visual state changes.
                this.space.isDragging = true;   // Global flag.
                this.resizeStartPointerPos = { x: this.pointerState.clientX, y: this.pointerState.clientY }; // Initial screen pointer.
                this.activeResizeHandleType = data.handleType || null; // e.g., 'topLeft', 'bottomRight'.

                if (!this.resizedNode.mesh) {
                    // console.error("UIManager: Resized node has no mesh, cannot proceed with resize setup.");
                    this._transitionToState(InteractionState.IDLE);
                    return;
                }

                // Store initial geometric properties of the node at the start of resize.
                // These are used as references to calculate changes.
                this.resizeNodeInitialMatrixWorld.copy(this.resizedNode.mesh.matrixWorld); // Node's initial world transformation.
                this.resizeStartNodeScale.copy(this.resizedNode.mesh.scale); // Node's mesh initial scale.

                const actualSize = this.resizedNode.getActualSize(); // Node's initial world dimensions.
                if (actualSize) {
                    this.resizeStartNodeSize.copy(actualSize);
                } else {
                    // Fallback if actual size isn't available (e.g., node not fully initialized).
                    // console.warn("UIManager: Could not get actual size for resized node. Using mesh scale as fallback.");
                    this.resizeStartNodeSize.copy(this.resizedNode.mesh.scale);
                }

                // Determine the initial local position of the active resize handle.
                // This position is relative to the node's origin and aligned with the node's local axes.
                const handleObject = data.metaframeHandleInfo?.object; // The THREE.Object3D of the handle.
                if (handleObject) {
                    const handleWorldPos = handleObject.getWorldPosition(new THREE.Vector3());
                    // To get local position: transform world position by inverse of node's world matrix.
                    // P_local = M_world_inverse * P_world
                    // A simpler way for position only (if not dealing with shear/complex transforms):
                    // LocalPos = WorldPosOfHandle - WorldPosOfNode (gives vector in world space)
                    // Then rotate this vector by inverse of node's world rotation.
                    const nodeWorldPos = this.resizedNode.mesh.getWorldPosition(new THREE.Vector3());
                    this.resizeStartHandleLocalPos.subVectors(handleWorldPos, nodeWorldPos); // Vector from node origin to handle in world space.

                    const inverseNodeWorldQuaternion = this.resizedNode.mesh.getWorldQuaternion(new THREE.Quaternion()).invert();
                    this.resizeStartHandleLocalPos.applyQuaternion(inverseNodeWorldQuaternion); // Rotate to node's local orientation.
                } else {
                    // Fallback: Estimate local handle position if direct handle object is not available.
                    // This is less precise and ideally should not be reached if metaframe provides handle info.
                    const halfSize = this.resizeStartNodeSize.clone().multiplyScalar(0.5);
                    switch (this.activeResizeHandleType) {
                        case 'topLeft': this.resizeStartHandleLocalPos.set(-halfSize.x, halfSize.y, 0); break;
                        case 'topRight': this.resizeStartHandleLocalPos.set(halfSize.x, halfSize.y, 0); break;
                        case 'bottomLeft': this.resizeStartHandleLocalPos.set(-halfSize.x, -halfSize.y, 0); break;
                        case 'bottomRight': this.resizeStartHandleLocalPos.set(halfSize.x, -halfSize.y, 0); break;
                        default: this.resizeStartHandleLocalPos.set(0,0,0); // Should not happen.
                    }
                }

                // Define the interaction plane for resizing:
                // - Normal: The node's local Z-axis, transformed into world space. This means the plane is aligned with the node's "face".
                // - Coplanar Point: The initial world position of the handle being dragged.
                // Mouse movements will be projected onto this plane.
                const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance(); // Needed for raycasting.
                if (camera) {
                    const nodeLocalZAxisInWorld = new THREE.Vector3(0, 0, 1);
                    nodeLocalZAxisInWorld.applyQuaternion(this.resizedNode.mesh.getWorldQuaternion(new THREE.Quaternion()));

                    // Initial world position of the handle (recalculate for clarity or use from above if transformed correctly)
                    const initialHandleWorldPos = this.resizeStartHandleLocalPos.clone().applyMatrix4(this.resizeNodeInitialMatrixWorld);
                    this.resizeInteractionPlane.setFromNormalAndCoplanarPoint(nodeLocalZAxisInWorld, initialHandleWorldPos);
                } else {
                    // Fallback if camera isn't available (e.g., during setup or error).
                    // console.error("UIManager: Camera not found for RESIZING_NODE state setup.");
                    // Define a default plane, e.g., world XY plane at node's Z depth.
                    this.resizeInteractionPlane.setComponents(0,0,1, -this.resizedNode.position.z);
                }

                document.body.style.cursor = this._getCursorForHandle(this.activeResizeHandleType) || 'nwse-resize';
                break;
            }
            case InteractionState.PANNING: {
                this.space.plugins
                    .getPlugin('CameraPlugin')
                    ?.startPan(this.pointerState.clientX, this.pointerState.clientY);
                document.body.style.cursor = 'grabbing'; // Consistent target
                break;
            }
            case InteractionState.LINKING_NODE: {
                document.body.style.cursor = 'crosshair'; // Consistent target
                this._createTempLinkLine(data.sourceNode);
                break;
            }
            case InteractionState.IDLE: {
                document.body.style.cursor = 'grab'; // Consistent target
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
        if (
            cameraPlugin?.getCameraMode() === 'free' &&
            cameraPlugin.getControls()?.isPointerLocked &&
            this.pointerState.button === 0
        ) {
            return;
        }

        if (this.pointerState.button === 1) {
            e.preventDefault();
            if (targetInfo.node) {
                this.space.emit('ui:request:autoZoomNode', targetInfo.node);
            }
            return;
        }

        if (this.pointerState.button === 0) {
            if (targetInfo.nodeControls) {
                e.preventDefault();
                e.stopPropagation();
                this._handleNodeControlButtonClick(targetInfo.nodeControls, targetInfo.node);
                return;
            }

            // Prioritize Metaframe Handles (Drag or Resize)
            if (targetInfo.metaframeHandleInfo && targetInfo.metaframeHandleInfo.node) {
                e.preventDefault();
                e.stopPropagation();
                const handleNode = targetInfo.metaframeHandleInfo.node;
                const handleType = targetInfo.metaframeHandleInfo.type;

                if (handleType === 'dragHandle') {
                    this._transitionToState(InteractionState.DRAGGING_NODE, { node: handleNode });
                    this._uiPluginCallbacks.setSelectedNode(handleNode, e.shiftKey);
                } else {
                    // Resize handle
                    this._transitionToState(InteractionState.RESIZING_NODE, {
                        node: handleNode,
                        handleType: handleType, // e.g., 'topLeft'
                    });
                    this._uiPluginCallbacks.setSelectedNode(handleNode, false); // Do not allow multi-select when initiating resize
                }
                this.contextMenu.hide();
                return;
            }

            // Removed specific block for HtmlNode's own resize handle as it's been removed from HtmlNode.

            if (targetInfo.node) {
                // If already handled by metaframeDragHandle, this block won't be reached for starting a drag.
                // It will still handle clicks on contentEditable or interactive elements within the node.
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
            if (!e.shiftKey) {
                this._uiPluginCallbacks.setSelectedNode(null, false);
            }
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

            case InteractionState.DRAGGING_NODE:
                e.preventDefault();
                if (this.draggedNode) {
                    const camera = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                    if (!camera) break;

                    const raycaster = new THREE.Raycaster();
                    const pointerNDC = this.space.getPointerNDC(this.pointerState.clientX, this.pointerState.clientY);
                    raycaster.setFromCamera(pointerNDC, camera);

                    let currentInteractionPlane = this.dragInteractionPlane; // Start with the plane defined at drag start (or last Alt-adjustment).

                    if (e.altKey) {
                        // Alt-key is pressed: Adjust the depth of the interaction plane.
                        // The amount to shift the plane is based on vertical mouse movement (dy).
                        const planeShiftAmount = dy * 0.5; // Sensitivity factor for depth change.

                        const cameraForward = new THREE.Vector3();
                        camera.getWorldDirection(cameraForward); // Get current camera viewing direction.

                        // Modify `draggedNodeInitialWorldPos`, which anchors the plane's depth.
                        // A positive dy (mouse moves down screen) means planeShiftAmount is positive.
                        // To move the node "further" into the scene (away from camera along its view vector),
                        // we subtract planeShiftAmount scaled by cameraForward from `draggedNodeInitialWorldPos`.
                        // (Assumes cameraForward points from camera towards scene; if it's view vector towards camera, then add).
                        // Let's assume camera.getWorldDirection() gives vector pointing into the scene.
                        // So, to move further (positive dy, positive planeShiftAmount), we want to move `draggedNodeInitialWorldPos`
                        // further along `cameraForward`. If `cameraForward` is direction of view, then effectively add `planeShiftAmount`
                        // in that direction (or subtract `-planeShiftAmount`).
                        // The current code `addScaledVector(cameraForward, -planeShiftAmount)` means:
                        // - if dy is positive (mouse down), planeShiftAmount positive, so add -planeShiftAmount -> move *against* cameraForward (closer).
                        // - if dy is negative (mouse up), planeShiftAmount negative, so add -planeShiftAmount -> move *with* cameraForward (further).
                        // This feels inverted. Let's correct: positive dy (mouse down) should push node away.
                        this.draggedNodeInitialWorldPos.addScaledVector(cameraForward, planeShiftAmount);

                        // Update the main dragInteractionPlane to this new depth.
                        // Its normal remains camera-facing.
                        this.dragInteractionPlane.setFromNormalAndCoplanarPoint(cameraForward, this.draggedNodeInitialWorldPos);
                        currentInteractionPlane = this.dragInteractionPlane; // Use this newly defined plane for the current intersection.

                        // The original dragOffset (calculated at drag start) is maintained.
                        // This means the node will "stick" to the cursor's projection on this new plane,
                        // effectively changing its Z-depth while maintaining its screen-projected X,Y relative to the cursor.
                    }

                    // 1. Find where the current mouse ray intersects the (potentially Z-adjusted) interaction plane.
                    const intersectionPoint = new THREE.Vector3();
                    if (raycaster.ray.intersectPlane(currentInteractionPlane, intersectionPoint)) {
                        // 2. Calculate the new node position:
                        //    newPosition = intersectionPointOnPlane - dragOffset
                        //    This applies the initial offset to the current mouse projection on the plane.
                        const primaryNodeNewCalculatedPos = intersectionPoint.clone().sub(this.dragOffset);

                        // (No specific Z override here; Z is implicitly handled by the intersectionPoint on the currentInteractionPlane)

                        // 3. Calculate delta for multi-node drag and apply updates.
                        const dragDelta = primaryNodeNewCalculatedPos.clone().sub(this.draggedNode.position);
                        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();

                        if (selectedNodes?.size > 0 && selectedNodes.has(this.draggedNode)) {
                            selectedNodes.forEach((sNode) => {
                                const newPos = (sNode === this.draggedNode)
                                    ? primaryNodeNewCalculatedPos
                                    : sNode.position.clone().add(dragDelta);

                                sNode.drag(newPos);
                                if (sNode.mesh) { // Preserve orientation
                                    sNode.mesh.quaternion.copy(this.draggedNodeInitialQuaternion);
                                }
                            });
                        } else {
                            this.draggedNode.drag(primaryNodeNewCalculatedPos);
                            if (this.draggedNode.mesh) { // Preserve orientation
                                this.draggedNode.mesh.quaternion.copy(this.draggedNodeInitialQuaternion);
                            }
                        }

                        this.space.emit('graph:node:dragged', {
                            node: this.draggedNode,
                            position: primaryNodeNewCalculatedPos, // The primary node's new position
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
                    // 1. Project current mouse position onto the resize interaction plane.
                    // This plane is aligned with the node's face and passes through the handle's initial world position.
                    const currentHandleWorldPosOnPlane = new THREE.Vector3();
                    if (!raycaster.ray.intersectPlane(this.resizeInteractionPlane, currentHandleWorldPosOnPlane)) {
                        break; // Pointer doesn't intersect the resize plane, skip update.
                    }

                    // 2. Calculate the handle's initial world position using its stored local position and the node's initial world matrix.
                    const initialHandleWorldPos = this.resizeStartHandleLocalPos.clone().applyMatrix4(this.resizeNodeInitialMatrixWorld);

                    // 3. Determine the displacement of the handle in world space, constrained to the resize plane.
                    const worldDisplacement = new THREE.Vector3().subVectors(currentHandleWorldPosOnPlane, initialHandleWorldPos);

                    // 4. Transform this world displacement into the node's local coordinate system (at the start of resize).
                    // This gives us how much the handle has moved along the node's local X and Y axes.
                    const inverseInitialNodeMatrix = new THREE.Matrix4().copy(this.resizeNodeInitialMatrixWorld).invert();

                    // To correctly transform a displacement vector, we transform its start and end points to local space
                    // and then find their difference. This avoids issues with the translation part of the matrix.
                    const worldDisplacementEndPoint = initialHandleWorldPos.clone().add(worldDisplacement);
                    const localEndPoint = worldDisplacementEndPoint.clone().applyMatrix4(inverseInitialNodeMatrix);
                    const localStartPoint = initialHandleWorldPos.clone().applyMatrix4(inverseInitialNodeMatrix); // Should be close to resizeStartHandleLocalPos
                    const localDisplacement = new THREE.Vector3().subVectors(localEndPoint, localStartPoint);


                    let deltaWidth = 0;  // Change in width in node's local units.
                    let deltaHeight = 0; // Change in height in node's local units.

                    // 5. Determine how localDisplacement translates to deltaWidth and deltaHeight based on which handle is active.
                    //    Assumes:
                    //    - Node's local +X axis corresponds to "width".
                    //    - Node's local +Y axis corresponds to "height".
                    //    - Handle types like 'topLeft', 'bottomRight' indicate which corner is being manipulated.
                    //    For 'Left' handles, a positive localDisplacement.x means the handle moved right (reducing size if fixed point is right),
                    //    so deltaWidth is negative.
                    //    For 'Top' handles, a positive localDisplacement.y means handle moved up (increasing size if fixed point is bottom).
                    if (this.activeResizeHandleType.includes('Left')) {
                        deltaWidth = -localDisplacement.x; // Moving left handle to positive X decreases width.
                    } else if (this.activeResizeHandleType.includes('Right')) {
                        deltaWidth = localDisplacement.x;  // Moving right handle to positive X increases width.
                    }

                    if (this.activeResizeHandleType.includes('Top')) {
                        deltaHeight = localDisplacement.y; // Moving top handle to positive Y increases height.
                    } else if (this.activeResizeHandleType.includes('Bottom')) {
                        deltaHeight = -localDisplacement.y;// Moving bottom handle to positive Y decreases height.
                    }

                    // 6. Calculate new target world dimensions for the node.
                    let newWorldWidth = this.resizeStartNodeSize.x + deltaWidth;
                    let newWorldHeight = this.resizeStartNodeSize.y + deltaHeight;

                    // 7. Enforce minimum dimensions.
                    const MIN_DIMENSION = 20; // Minimum allowed world dimension for width/height.
                    newWorldWidth = Math.max(MIN_DIMENSION, newWorldWidth);
                    newWorldHeight = Math.max(MIN_DIMENSION, newWorldHeight);

                    // Create a vector for the new world dimensions. Z dimension remains unchanged from start of resize.
                    const newWorldDimensions = new THREE.Vector3(newWorldWidth, newWorldHeight, this.resizeStartNodeSize.z);

                    // 8. Apply the resize to the node.
                    //    Node.resize() is expected to handle this. For HtmlNode, its mesh.scale is updated to these world dimensions.
                    //    For other nodes, if their mesh geometry isn't 1x1, their resize method might need to convert
                    //    world dimensions to an appropriate scale factor.
                    this.resizedNode.resize(newWorldDimensions);

                    // 9. Emit resize event with relevant data.
                    this.space.emit('graph:node:resized', {
                        node: this.resizedNode,
                        // For HtmlNode, provide its internal pixel 'size' and its 'scale' relative to its baseSize.
                        ...(this.resizedNode instanceof HtmlNode && {
                            size: { ...this.resizedNode.size }, // Current pixel size
                            scale: { // Scale relative to its original 'baseSize' (data.width/height)
                                x: newWorldWidth / this.resizedNode.baseSize.width,
                                y: newWorldHeight / this.resizedNode.baseSize.height,
                                z: this.resizeStartNodeScale.z // Preserve original Z scale factor if any
                            }
                        }),
                        // For other generic nodes, report the calculated new world dimensions.
                        ...(!(this.resizedNode instanceof HtmlNode) && { worldDimensions: { ...newWorldDimensions } })
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
                /* empty */
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
            case 'delete':
                this.space.emit('ui:request:confirm', {
                    message: `Delete node "${node.id.substring(0, 10)}..."?`,
                    onConfirm: () => this.space.emit('ui:request:removeNode', node.id),
                });
                break;
            case 'content-zoom-in':
                this.space.emit('ui:request:adjustContentScale', node, 1.15);
                break;
            case 'content-zoom-out':
                this.space.emit('ui:request:adjustContentScale', node, 1 / 1.15);
                break;
            case 'grow':
                this.space.emit('ui:request:adjustNodeSize', node, 1.2);
                break;
            case 'shrink':
                this.space.emit('ui:request:adjustNodeSize', node, 1 / 1.2);
                break;
            default:
            // console.warn('UIManager: Unknown node control action:', action);
        }
    }

    _onContextMenu = (e) => {
        e.preventDefault();
        this._updateNormalizedPointerState(e);
        this.contextMenu.hide();

        const targetInfo = this._getTargetInfo(e);
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

            if (!clickedSelectedEdge) {
                this._uiPluginCallbacks.setSelectedEdge(null, false);
            }
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

        switch (e.key) {
            case 'Delete':
            case 'Backspace': {
                if (primarySelectedNode) {
                    {
                        // Block for lexical declaration
                        const message =
                            selectedNodes.size > 1
                                ? `Delete ${selectedNodes.size} selected nodes?`
                                : `Delete node "${primarySelectedNode.id.substring(0, 10)}..."?`;
                        this.space.emit('ui:request:confirm', {
                            message: message,
                            onConfirm: () =>
                                selectedNodes.forEach((node) => this.space.emit('ui:request:removeNode', node.id)),
                        });
                        handled = true;
                    }
                } else if (primarySelectedEdge) {
                    {
                        // Block for lexical declaration
                        const message =
                            selectedEdges.size > 1
                                ? `Delete ${selectedEdges.size} selected edges?`
                                : `Delete edge "${primarySelectedEdge.id.substring(0, 10)}..."?`;
                        this.space.emit('ui:request:confirm', {
                            message: message,
                            onConfirm: () =>
                                selectedEdges.forEach((edge) => this.space.emit('ui:request:removeEdge', edge.id)),
                        });
                        handled = true;
                    }
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
                const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
                if (cameraPlugin?.getCameraMode() === 'free' && cameraPlugin.getControls()?.isPointerLocked) {
                    cameraPlugin.exitPointerLock();
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
                    let factor;
                    let eventName;
                    if (e.ctrlKey || e.metaKey) {
                        eventName = 'ui:request:adjustNodeSize';
                        factor = 1.2; // Factor for node size adjustment
                    } else {
                        eventName = 'ui:request:adjustContentScale';
                        factor = 1.15; // Factor for content scale adjustment
                    }
                    this.space.emit(eventName, { node: primarySelectedNode, factor: factor });
                    handled = true;
                }
                break;
            }
            case '-':
            case '_': {
                if (primarySelectedNode instanceof HtmlNode) {
                    let factor;
                    let eventName;
                    if (e.ctrlKey || e.metaKey) {
                        eventName = 'ui:request:adjustNodeSize';
                        factor = 1 / 1.2; // Factor for node size adjustment
                    } else {
                        eventName = 'ui:request:adjustContentScale';
                        factor = 1 / 1.15; // Factor for content scale adjustment
                    }
                    this.space.emit(eventName, { node: primarySelectedNode, factor: factor });
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
                    const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
                    camPlugin?.pushState();
                    camPlugin?.moveTo(midPoint.x, midPoint.y, midPoint.z + dist * 0.6 + 100, 0.5, midPoint);
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

        if (
            targetInfo.element?.closest('.node-content') &&
            targetInfo.element.scrollHeight > targetInfo.element.clientHeight
        )
            return;
        if (targetInfo.element?.closest('.edge-menu-frame input[type="range"]')) return;

        if ((e.ctrlKey || e.metaKey) && targetInfo.node instanceof HtmlNode) {
            e.preventDefault();
            e.stopPropagation();
            const scaleFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            this.space.emit('ui:request:adjustContentScale', { node: targetInfo.node, factor: scaleFactor });
        } else {
            e.preventDefault();
            this.space.emit('ui:request:zoomCamera', e.deltaY);
        }
    };

    _getTargetInfo(event) {
        const element = document.elementFromPoint(event.clientX, event.clientY);

        const nodeElement = element?.closest('.node-common');
        // const resizeHandle = element?.closest('.resize-handle'); // Removed as HtmlNode's own handle is gone
        const nodeControlsButton = element?.closest('.node-controls button');
        const contentEditableEl = element?.closest('[contenteditable="true"]');
        const interactiveEl = element?.closest('button, input, textarea, select, a, .clickable');

        let graphNode = nodeElement
            ? this.space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeElement.dataset.nodeId)
            : null;
        let intersectedEdge = null;
        // This will now store an object { type: string, object: THREE.Object3D, node: Node } if a handle is hit
        let metaframeHandleInfo = null;

        // Prioritize HTML element interactions before raycasting into the 3D scene.
        const needsRaycast = !nodeControlsButton && !contentEditableEl && !interactiveEl;

        if (needsRaycast) {
            const intersectedObjectResult = this.space.intersectedObjects(event.clientX, event.clientY);
            if (intersectedObjectResult) {
                const { object, node: intersectedGraphNode, edge: intersectedRayEdge } = intersectedObjectResult;

                if (intersectedGraphNode && !graphNode) {
                    graphNode = intersectedGraphNode;
                }
                intersectedEdge = intersectedRayEdge || null;

                // Check if the intersected 3D object (`object`) is a metaframe handle.
                // `intersectedGraphNode` is the node whose mesh was hit (could be the same as `graphNode` or different).
                // `object` is the specific THREE.Object3D from the raycaster.
                if (object && object.name && intersectedGraphNode && intersectedGraphNode.metaframe?.isVisible) {
                    const ownerNode = intersectedGraphNode; // The node that owns the metaframe and potentially this handle.

                    if (object.name.startsWith('resizeHandle-')) {
                        const handleType = object.name.substring('resizeHandle-'.length);
                        // Verify that the intersected 'object' is indeed one of the known resize handle meshes
                        // belonging to the 'ownerNode's metaframe.
                        if (
                            ownerNode.metaframe.resizeHandles &&
                            ownerNode.metaframe.resizeHandles[handleType] === object
                        ) {
                            metaframeHandleInfo = { type: handleType, object: object, node: ownerNode };
                            // If a handle is hit, the 'effective' graph node for interaction purposes is the owner of the handle.
                            graphNode = ownerNode;
                        }
                    } else if (object.name === 'dragHandle') {
                        // Verify that the intersected 'object' is the drag handle mesh
                        // belonging to the 'ownerNode's metaframe.
                        if (ownerNode.metaframe.dragHandle === object) {
                            metaframeHandleInfo = { type: 'dragHandle', object: object, node: ownerNode };
                            // If the drag handle is hit, the 'effective' graph node is its owner.
                            graphNode = ownerNode;
                        }
                    }
                }
                // If we hit a metaframe handle, we prioritize that interaction over a general node click,
                // especially if the handle is visually on top or closer to the camera.
                // The `intersectedObjects` method should ideally return the closest object,
                // so if a handle is returned, it was the "true" target.
                // We also ensure that the graphNode is set to the node owning the metaframe.
            }
        }

        return {
            element,
            nodeElement,
            // resizeHandle, // This is for HtmlNode's own handle - REMOVED
            nodeControls: nodeControlsButton,
            contentEditable: contentEditableEl,
            interactiveElement: interactiveEl,
            node: graphNode,
            intersectedEdge,
            metaframeHandleInfo, // { type: string, object: THREE.Object3D, node: Node } or null
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
            // TODO: Add cases for middle handles if they are implemented later
            // case 'top': case 'bottom': return 'ns-resize';
            // case 'left': case 'right': return 'ew-resize';
            case 'dragHandle': // Assuming dragHandle might also want a specific cursor on hover
                return 'grab'; // Or 'move'
            default:
                return 'default'; // Should not happen for valid handles
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
            // Future:
            // case 'top': return 'Resize (Top)';
            // case 'bottom': return 'Resize (Bottom)';
            // case 'left': return 'Resize (Left)';
            // case 'right': return 'Resize (Right)';
            default:
                return '';
        }
    }

    _handleHover(e) {
        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes() || new Set();

        // If an interaction (drag, resize, pan, link) is active, or pointer is down,
        // clear all hover effects and do not process new ones.
        if (this.pointerState.down || this.currentState !== InteractionState.IDLE) {
            // If an interaction starts, hide any metaframe that was visible purely due to hover.
            // Selected nodes (managed by UIPlugin callbacks) keep their metaframes.
            if (this.hoveredNodeForMetaframe && !selectedNodes.has(this.hoveredNodeForMetaframe)) {
                this.hoveredNodeForMetaframe.metaframe?.hide();
            }
            this.hoveredNodeForMetaframe = null; // Reset node hovered for metaframe visibility

            // Cleanup active handle highlighting and tooltips
            if (this.currentHoveredGLHandle && this.currentHoveredGLHandle.node?.metaframe) {
                this.currentHoveredGLHandle.node.metaframe.highlightHandle(
                    this.currentHoveredGLHandle.handleMesh,
                    false
                );
                this.currentHoveredGLHandle.node.metaframe.setHandleTooltip(this.hoveredHandleType, '', false);
            }
            this.currentHoveredGLHandle = null;
            this.hoveredHandleType = null;

            // Cleanup edge highlighting (if not selected)
            if (this.hoveredEdge) {
                const selectedEdges = this._uiPluginCallbacks.getSelectedEdges() || new Set();
                // Only de-highlight if it's not a selected edge (selected edges maintain their highlight)
                if (!selectedEdges.has(this.hoveredEdge)) {
                    this.hoveredEdge.setHighlight(false);
                }
            }
            this.hoveredEdge = null;
            return; // Exit early, active interaction state will manage cursors etc.
        }

        // Get information about the object(s) under the cursor. _getTargetInfo now also considers metaframe handles.
        const targetInfo = this._getTargetInfo(e);
        const newlyHoveredNode = targetInfo.node; // This could be a node mesh or a node owning an intersected handle.
        const newHoveredEdge = targetInfo.intersectedEdge;
        const newHoveredHandleInfo = targetInfo.metaframeHandleInfo; // Info if a handle is directly hit.

        // --- Part 1: Manage Metaframe visibility for hovered nodes ---
        // Handles showing/hiding metaframes for nodes that are hovered but NOT selected.
        // Selected nodes manage their metaframe visibility via their `setSelectedStyle` method (called by UIPlugin).
        if (this.hoveredNodeForMetaframe !== newlyHoveredNode) {
            // If there was a previously hovered node (whose metaframe was shown due to hover),
            // and that node is NOT currently selected, hide its metaframe.
            if (this.hoveredNodeForMetaframe && !selectedNodes.has(this.hoveredNodeForMetaframe)) {
                // ensureMetaframe will be called by metaframe.hide() if metaframe itself calls it,
                // or we can call it here. Node.setSelectedStyle now calls it.
                // For direct calls like this, it's safer to ensure it exists.
                this.hoveredNodeForMetaframe.ensureMetaframe()?.hide();
            }

            // If there's a new node being hovered, and it's NOT currently selected,
            // show its metaframe and ensure its handles are in the default visual state.
            if (newlyHoveredNode && !selectedNodes.has(newlyHoveredNode)) {
                const metaframe = newlyHoveredNode.ensureMetaframe(); // Ensure metaframe exists
                if (metaframe) {
                    metaframe.show();
                    // Reset highlights on handles when metaframe is freshly shown by hover.
                    Object.values(metaframe.resizeHandles).forEach((handle) =>
                        metaframe.highlightHandle(handle, false)
                    );
                    if (metaframe.dragHandle) {
                        metaframe.highlightHandle(metaframe.dragHandle, false);
                    }
                }
            }
            this.hoveredNodeForMetaframe = newlyHoveredNode; // Update the record of which node's metaframe is shown by hover.
        }

        // --- Part 2: Handle Metaframe Handle Hover Effects (highlights, tooltips, cursor) ---
        // This applies if a specific handle (of any visible metaframe) is hovered.
        // newHoveredHandleInfo.node is the owner of the handle.
        if (
            this.hoveredHandleType !== newHoveredHandleInfo?.type ||
            this.currentHoveredGLHandle?.handleMesh !== newHoveredHandleInfo?.object
        ) {
            // De-highlight previous handle and hide its tooltip if it exists.
            if (this.currentHoveredGLHandle) {
                const oldMetaframe = this.currentHoveredGLHandle.node?.ensureMetaframe();
                if (oldMetaframe) {
                    oldMetaframe.highlightHandle(
                        this.currentHoveredGLHandle.handleMesh,
                        false
                    );
                    oldMetaframe.setHandleTooltip(this.hoveredHandleType, '', false);
                }
            }

            if (newHoveredHandleInfo) {
                const currentMetaframe = newHoveredHandleInfo.node?.ensureMetaframe();
                if (currentMetaframe?.isVisible) {
                    // If a new handle is hovered and its parent metaframe is visible:
                    document.body.style.cursor = this._getCursorForHandle(newHoveredHandleInfo.type);
                    currentMetaframe.highlightHandle(newHoveredHandleInfo.object, true); // Highlight the handle mesh itself.
                    const tooltipText = this._getTooltipTextForHandle(newHoveredHandleInfo.type);
                    currentMetaframe.setHandleTooltip(newHoveredHandleInfo.type, tooltipText, true); // Show tooltip.
                }
                this.currentHoveredGLHandle = {
                    node: newHoveredHandleInfo.node,
                    handleMesh: newHoveredHandleInfo.object,
                };
            } else {
                // No specific handle is hovered, or its metaframe is not visible.
                // Cursor will be set by general logic below.
                this.currentHoveredGLHandle = null;
            }
            this.hoveredHandleType = newHoveredHandleInfo?.type || null; // Update record of hovered handle type.
        }

        // --- Part 3: Handle Edge Hover Highlight ---
        const currentlySelectedEdges = this._uiPluginCallbacks.getSelectedEdges() || new Set();
        if (this.hoveredEdge !== newHoveredEdge) {
            // If previously hovered edge is no longer hovered and not selected, remove its hover style.
            if (this.hoveredEdge && !currentlySelectedEdges.has(this.hoveredEdge)) {
                this.hoveredEdge.setHoverStyle(false);
            }
            this.hoveredEdge = newHoveredEdge; // Update record of hovered edge.
            // If new edge is hovered and not selected, apply its hover style.
            if (this.hoveredEdge && !currentlySelectedEdges.has(this.hoveredEdge)) {
                this.hoveredEdge.setHoverStyle(true);
            }
        }

        // --- Part 4: Final cursor setting based on hover hierarchy ---
        if (this.currentHoveredGLHandle) {
            // Cursor is already set by handle hover logic.
        } else if (this.hoveredEdge) {
            document.body.style.cursor = 'pointer'; // Generic pointer for clickable edges.
        } else if (this.hoveredNodeForMetaframe || (newlyHoveredNode && selectedNodes.has(newlyHoveredNode))) {
            // If hovering a node (either its metaframe is shown by hover, or it's selected and its metaframe is visible),
            // set cursor to 'grab' indicating it might be draggable or the area is interactive.
            document.body.style.cursor = 'grab';
        } else {
            document.body.style.cursor = 'grab'; // Default cursor for empty pannable space.
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

        let projectionZ = sourceNode.position.z; // Default to source node's Z depth.

        // Raycast to find if a potential target node is under the cursor.
        const potentialTargetInfo = this.space.intersectedObjects(screenX, screenY);

        // If hovering over a different node, use its Z depth for the projection plane.
        // This makes the temporary linking line visually connect more accurately to the
        // apparent depth of the object under the cursor.
        if (potentialTargetInfo?.node && potentialTargetInfo.node !== sourceNode) {
            projectionZ = potentialTargetInfo.node.position.z;
        }
        // Alternative fallback (optional): Use camera's focal depth if no node is hit.
        // else {
        //    const cameraControls = this.space.plugins.getPlugin('CameraPlugin')?.getControls();
        //    if (cameraControls) {
        //        projectionZ = cameraControls.targetLookAt.z;
        //    }
        // }

        // Project the screen cursor onto the determined Z-plane to get the world coordinates for the line's end.
        const targetPos = this.space.screenToWorld(screenX, screenY, projectionZ);

        if (targetPos) {
            const positions = this.tempLinkLine.geometry.attributes.position;
            // Update the second point (index 1) of the line.
            positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z);
            positions.needsUpdate = true;
            this.tempLinkLine.geometry.computeBoundingSphere(); // Important for frustum culling.
            this.tempLinkLine.computeLineDistances(); // Required for dashed line rendering.
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

    _onLinkingStarted = (data) => {
        this._transitionToState(InteractionState.LINKING_NODE, { sourceNode: data.sourceNode });
    };

    _onLinkingCancelled = (_data) => {
        this._removeTempLinkLine();
        if (this.currentState === InteractionState.LINKING_NODE) {
            this._transitionToState(InteractionState.IDLE);
        }
    };

    _onLinkingCompleted = (_data) => {
        this._removeTempLinkLine();
        if (this.currentState === InteractionState.LINKING_NODE) {
            this._transitionToState(InteractionState.IDLE);
        }
    };

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

        this.space = null;
        this.container = null;
        this.draggedNode = null;
        this.resizedNode = null;
        this.hoveredEdge = null;
        this._uiPluginCallbacks = null;

        // console.log('UIManager disposed.');
    }
}
