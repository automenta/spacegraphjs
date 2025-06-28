import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
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
    draggedNodeInitialZ = 0;
    dragOffset = new THREE.Vector3();

    resizedNode = null;
    activeResizeHandleType = null; // For metaframe handles: 'topLeft', 'topRight', etc.
    resizeStartPointerPos = { x: 0, y: 0 };
    // For HtmlNodes
    resizeStartNodeSize = { width: 0, height: 0 };
    resizeNodeScreenScaleX = 1;
    resizeNodeScreenScaleY = 1;
    // For Generic Nodes (using Metaframe handles)
    resizeStartNodeScale = new THREE.Vector3(1, 1, 1);


    hoveredEdge = null;
    hoveredHandleType = null; // To track hovered metaframe handle for cursor changes
    currentHoveredGLHandle = null; // The actual THREE.Object3D of the handle

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

        console.log(`UIManager: Exiting state: ${this.currentState}, transitioning to ${newState}`);
        switch (this.currentState) {
            case InteractionState.DRAGGING_NODE:
                this.draggedNode?.endDrag();
                document.body.style.cursor = 'grab'; // Consistent target
                this.draggedNode = null;
                this.space.isDragging = false; // Reset flag
                break;
            case InteractionState.RESIZING_NODE:
                this.resizedNode?.endResize();
                document.body.style.cursor = 'grab'; // Consistent target
                this.resizedNode = null;
                this.space.isDragging = false; // Reset flag
                break;
            case InteractionState.PANNING:
                this.space.plugins.getPlugin('CameraPlugin')?.endPan();
                document.body.style.cursor = 'grab'; // Consistent target
                break;
            case InteractionState.LINKING_NODE:
                document.body.style.cursor = 'grab'; // Consistent target
                $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
                break;
        }

        this.currentState = newState;

        switch (newState) {
            case InteractionState.DRAGGING_NODE: {
                this.draggedNode = data.node;
                this.draggedNodeInitialZ = this.draggedNode.position.z;
                this.draggedNode.startDrag();

                const worldPos = this.space.screenToWorld(
                    this.pointerState.clientX,
                    this.pointerState.clientY,
                    this.draggedNodeInitialZ
                );
                this.dragOffset = worldPos ? worldPos.sub(this.draggedNode.position) : new THREE.Vector3();
                document.body.style.cursor = 'grabbing'; // Consistent target
                this.space.isDragging = true; // Set flag
                break;
            }
            case InteractionState.RESIZING_NODE: {
                this.resizedNode = data.node;
                this.resizedNode.startResize();
                this.space.isDragging = true; // Set flag
                this.resizeStartPointerPos = { x: this.pointerState.clientX, y: this.pointerState.clientY };
                this.activeResizeHandleType = data.handleType || null; // Store the handle type, e.g., 'topLeft'

                // Unified logic for all nodes using Metaframe handles
                this.resizeStartNodeScale = this.resizedNode.mesh
                    ? this.resizedNode.mesh.scale.clone()
                    : new THREE.Vector3(1, 1, 1);

                // Set cursor based on handle type
                document.body.style.cursor = this._getCursorForHandle(this.activeResizeHandleType) || 'nwse-resize'; // Fallback + Consistent target
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
                } else { // Resize handle
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
                    let targetZ = this.draggedNodeInitialZ;
                    if (e.altKey) {
                        targetZ -= dy * 1.0;
                        this.draggedNodeInitialZ = targetZ;
                    }

                    const worldPos = this.space.screenToWorld(
                        this.pointerState.clientX,
                        this.pointerState.clientY,
                        targetZ
                    );
                    if (worldPos) {
                        const primaryNodeNewCalculatedPos = worldPos.clone().sub(this.dragOffset);
                        primaryNodeNewCalculatedPos.z = targetZ;

                        const dragDelta = primaryNodeNewCalculatedPos.clone().sub(this.draggedNode.position);
                        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();

                        if (selectedNodes?.size > 0 && selectedNodes.has(this.draggedNode)) {
                            selectedNodes.forEach((sNode) => {
                                if (sNode === this.draggedNode) {
                                    sNode.drag(primaryNodeNewCalculatedPos);
                                } else {
                                    const sNodeTargetPos = sNode.position.clone().add(dragDelta);
                                    // sNodeTargetPos.z = sNode.position.z; // Allow Z-depth change for all selected nodes
                                    sNode.drag(sNodeTargetPos);
                                }
                            });
                        } else {
                            this.draggedNode.drag(primaryNodeNewCalculatedPos);
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
                if (this.resizedNode) {
                    const totalDx_screen = this.pointerState.clientX - this.resizeStartPointerPos.x;
                    const totalDy_screen = this.pointerState.clientY - this.resizeStartPointerPos.y;

                    // Unified resizing logic for all nodes (including HtmlNode) using Metaframe handles
                    let scaleXFactor = 1;
                    let scaleYFactor = 1;
                    const sensitivity = 0.005; // Adjust as needed

                    // Determine scale factors based on which handle is being dragged
                    switch (this.activeResizeHandleType) {
                        case 'topLeft':
                            scaleXFactor = 1 - totalDx_screen * sensitivity;
                            scaleYFactor = 1 + totalDy_screen * sensitivity; // Screen Y is inverted
                            break;
                        case 'topRight':
                            scaleXFactor = 1 + totalDx_screen * sensitivity;
                            scaleYFactor = 1 + totalDy_screen * sensitivity;
                            break;
                        case 'bottomLeft':
                            scaleXFactor = 1 - totalDx_screen * sensitivity;
                            scaleYFactor = 1 - totalDy_screen * sensitivity;
                            break;
                        case 'bottomRight':
                            scaleXFactor = 1 + totalDx_screen * sensitivity;
                            scaleYFactor = 1 - totalDy_screen * sensitivity;
                            break;
                        default: // Should ideally not happen if activeResizeHandleType is always set
                            console.warn('UIManager: Unknown resize handle type:', this.activeResizeHandleType);
                            break;
                    }

                    let newScaleX = this.resizeStartNodeScale.x * scaleXFactor;
                    let newScaleY = this.resizeStartNodeScale.y * scaleYFactor;

                    // Clamp scale to a minimum value to prevent inversion or zero scale
                    const MIN_SCALE = 0.1; // TODO: This could be Node.MIN_SCALE if defined
                    newScaleX = Math.max(MIN_SCALE, newScaleX);
                    newScaleY = Math.max(MIN_SCALE, newScaleY);

                    const newScale = new THREE.Vector3(newScaleX, newScaleY, this.resizeStartNodeScale.z);

                    // Node.resize() is expected to handle its internal logic (e.g. HtmlNode converting scale to pixels)
                    this.resizedNode.resize(newScale);

                    this.space.emit('graph:node:resized', {
                        node: this.resizedNode,
                        scale: { ...newScale }, // For listeners interested in the scale
                        // For HtmlNode, its 'size' property is updated internally by its new resize method
                        ...(this.resizedNode instanceof HtmlNode && { size: { ...this.resizedNode.size } }),
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
                console.warn('UIManager: Unknown node control action:', action);
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
                } else if (primarySelectedEdge) {
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

                // Check if the intersected object is a metaframe handle
                if (object && object.name) {
                    if (object.name.startsWith('resizeHandle-')) {
                        // Ensure this handle belongs to the currently selected node's metaframe
                        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
                        const primarySelectedNode = selectedNodes.values().next().value;
                        if (primarySelectedNode && primarySelectedNode.metaframe?.isVisible) {
                            const handleType = object.name.substring('resizeHandle-'.length);
                            if (primarySelectedNode.metaframe.resizeHandles[handleType] === object) {
                                metaframeHandleInfo = { type: handleType, object: object, node: primarySelectedNode };
                                graphNode = primarySelectedNode;
                            }
                        }
                    } else if (object.name === 'dragHandle') {
                        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
                        const primarySelectedNode = selectedNodes.values().next().value;
                        if (primarySelectedNode && primarySelectedNode.metaframe?.isVisible && primarySelectedNode.metaframe.dragHandle === object) {
                            metaframeHandleInfo = { type: 'dragHandle', object: object, node: primarySelectedNode };
                            graphNode = primarySelectedNode;
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
        }
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
        };
    }

    _getTooltipTextForHandle(handleType) {
        switch (handleType) {
            case 'topLeft': return 'Resize (Top-Left)';
            case 'topRight': return 'Resize (Top-Right)';
            case 'bottomLeft': return 'Resize (Bottom-Left)';
            case 'bottomRight': return 'Resize (Bottom-Right)';
            case 'dragHandle': return 'Move Node';
            // Future:
            // case 'top': return 'Resize (Top)';
            // case 'bottom': return 'Resize (Bottom)';
            // case 'left': return 'Resize (Left)';
            // case 'right': return 'Resize (Right)';
            default: return '';
        }
    }

    _handleHover(e) {
        if (this.pointerState.down || this.currentState !== InteractionState.IDLE) {
            // Reset cursor and tooltip if an interaction starts while hovering a handle
            if (this.hoveredHandleType) {
                document.body.style.cursor = 'default'; // Or restore to previous if tracked
                if (this.currentHoveredGLHandle && this.currentHoveredGLHandle.node && this.currentHoveredGLHandle.node.metaframe) {
                    const prevMetaframe = this.currentHoveredGLHandle.node.metaframe;
                    prevMetaframe.highlightHandle(this.currentHoveredGLHandle.handleMesh, false);
                    prevMetaframe.setHandleTooltip(this.hoveredHandleType, '', false); // Hide tooltip
                }
                this.hoveredHandleType = null;
                this.currentHoveredGLHandle = null;
            }
            // Reset edge highlight
            if (this.hoveredEdge) {
                const selectedEdges = this._uiPluginCallbacks.getSelectedEdges();
                if (!selectedEdges.has(this.hoveredEdge)) {
                    this.hoveredEdge.setHighlight(false);
                }
                this.hoveredEdge = null;
            }
            return;
        }

        const targetInfo = this._getTargetInfo(e);
        const newHoveredEdge = targetInfo.intersectedEdge;

        const newHoveredHandleInfo = targetInfo.metaframeHandleInfo; // This is { type, object, node } or null

        // Handle Metaframe Handle Hover Effects (Cursor and Visual Highlight)
        if (this.hoveredHandleType !== newHoveredHandleInfo?.type || this.currentHoveredGLHandle?.handleMesh !== newHoveredHandleInfo?.object) {
            // De-highlight previous handle and hide its tooltip
            if (this.currentHoveredGLHandle && this.currentHoveredGLHandle.node && this.currentHoveredGLHandle.node.metaframe) {
                const prevMetaframe = this.currentHoveredGLHandle.node.metaframe;
                prevMetaframe.highlightHandle(this.currentHoveredGLHandle.handleMesh, false);
                prevMetaframe.setHandleTooltip(this.hoveredHandleType, '', false);
            }

            if (newHoveredHandleInfo) {
                document.body.style.cursor = this._getCursorForHandle(newHoveredHandleInfo.type);
                const currentMetaframe = newHoveredHandleInfo.node.metaframe;
                if (currentMetaframe) { // Ensure metaframe exists
                    currentMetaframe.highlightHandle(newHoveredHandleInfo.object, true);
                    const tooltipText = this._getTooltipTextForHandle(newHoveredHandleInfo.type);
                    currentMetaframe.setHandleTooltip(newHoveredHandleInfo.type, tooltipText, true);
                }
                this.currentHoveredGLHandle = { node: newHoveredHandleInfo.node, handleMesh: newHoveredHandleInfo.object };
            } else {
                document.body.style.cursor = 'grab'; // Default cursor when not on a handle
                this.currentHoveredGLHandle = null;
            }
            this.hoveredHandleType = newHoveredHandleInfo?.type || null;
        }

        // Handle Edge Hover Highlight
        if (this.hoveredEdge !== newHoveredEdge) {
            const selectedEdges = this._uiPluginCallbacks.getSelectedEdges();
            if (this.hoveredEdge && !selectedEdges.has(this.hoveredEdge)) {
                this.hoveredEdge.setHighlight(false);
            }
            this.hoveredEdge = newHoveredEdge;
            if (this.hoveredEdge && !selectedEdges.has(this.hoveredEdge)) {
                this.hoveredEdge.setHighlight(true);
            }
        }

        // If not hovering over a handle or an edge, ensure default cursor
        if (!newHoveredHandleInfo?.type && !newHoveredEdge) {
            document.body.style.cursor = 'grab';
        } else if (newHoveredHandleInfo?.type) { // If on a handle, ensure its cursor is set
            document.body.style.cursor = this._getCursorForHandle(newHoveredHandleInfo.type);
        }
        // If only on an edge, cursor is not changed by edge hover itself currently.
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
        const targetPos = this.space.screenToWorld(screenX, screenY, sourceNode.position.z);

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

        console.log('UIManager disposed.');
    }
}
