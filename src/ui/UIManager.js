import * as THREE from 'three';
import {CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';
import {$, $$} from '../utils.js';
import {HtmlNode} from '../graph/nodes/HtmlNode.js';

// Import decomposed modules
import { InteractionState } from './InteractionState.js';
import { ConfirmDialog } from './dialogs/ConfirmDialog.js';
import { ContextMenu } from './menus/ContextMenu.js';
import { EdgeMenu } from './menus/EdgeMenu.js';
import { AdvancedHudManager } from './hud/AdvancedHudManager.js';
// import { Toolbar } from './Toolbar.js'; // Toolbar will be removed

export class UIManager {
    space = null;
    container = null;

    // Decomposed components
    confirmDialog = null;
    contextMenu = null;
    edgeMenu = null;
    hudManager = null;
    // toolbar = null; // Toolbar will be removed

    currentState = InteractionState.IDLE;
    activePointerId = null;

    draggedNode = null;
    draggedNodeInitialZ = 0;
    dragOffset = new THREE.Vector3();

    resizedNode = null;
    resizeStartPointerPos = { x: 0, y: 0 };
    resizeStartNodeSize = { width: 0, height: 0 };
    resizeNodeScreenScaleX = 1;
    resizeNodeScreenScaleY = 1;

    hoveredEdge = null;

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
        this.hudManager = new AdvancedHudManager(this.space, this.container, this._uiPluginCallbacks);
        // this.toolbar = new Toolbar(this.space, $('#toolbar')); // Toolbar will be removed

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
                this.container.style.cursor = 'grab';
                this.draggedNode = null;
                break;
            case InteractionState.RESIZING_NODE:
                this.resizedNode?.endResize();
                this.container.style.cursor = 'grab';
                this.resizedNode = null;
                break;
            case InteractionState.PANNING:
                this.space.plugins.getPlugin('CameraPlugin')?.endPan();
                this.container.style.cursor = 'grab';
                break;
            case InteractionState.LINKING_NODE:
                this.container.style.cursor = 'grab';
                $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
                break;
        }

        this.currentState = newState;

        switch (newState) {
            case InteractionState.DRAGGING_NODE:
                this.draggedNode = data.node;
                this.draggedNodeInitialZ = this.draggedNode.position.z;
                this.draggedNode.startDrag();

                const worldPos = this.space.screenToWorld(
                    this.pointerState.clientX,
                    this.pointerState.clientY,
                    this.draggedNodeInitialZ
                );
                this.dragOffset = worldPos ? worldPos.sub(this.draggedNode.position) : new THREE.Vector3();
                this.container.style.cursor = 'grabbing';
                break;

            case InteractionState.RESIZING_NODE:
                this.resizedNode = data.node;
                this.resizedNode.startResize();
                this.resizeStartNodeSize = { ...this.resizedNode.size };
                this.resizeStartPointerPos = { x: this.pointerState.clientX, y: this.pointerState.clientY };
                this.container.style.cursor = 'nwse-resize';

                const node = this.resizedNode;
                const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
                const cam = cameraPlugin?.getCameraInstance();

                if (node && cam && node.cssObject) {
                    const localOrigin = new THREE.Vector3(0, 0, 0);
                    const localOffsetX = new THREE.Vector3(1, 0, 0);
                    const localOffsetY = new THREE.Vector3(0, 1, 0);

                    const worldOrigin = localOrigin.clone().applyMatrix4(node.cssObject.matrixWorld);
                    const worldOffsetX = localOffsetX.clone().applyMatrix4(node.cssObject.matrixWorld);
                    const worldOffsetY = localOffsetY.clone().applyMatrix4(node.cssObject.matrixWorld);

                    const screenOriginNDC = worldOrigin.clone().project(cam);
                    const screenOffsetXNDC = worldOffsetX.clone().project(cam);
                    const screenOffsetYNDC = worldOffsetY.clone().project(cam);

                    const halfW = window.innerWidth / 2;
                    const halfH = window.innerHeight / 2;

                    const screenOriginPx = {
                        x: screenOriginNDC.x * halfW + halfW,
                        y: -screenOriginNDC.y * halfH + halfH,
                    };
                    const screenOffsetXPx = {
                        x: screenOffsetXNDC.x * halfW + halfW,
                        y: -screenOffsetXNDC.y * halfH + halfH,
                    };
                    const screenOffsetYPx = {
                        x: screenOffsetYNDC.x * halfW + halfH,
                        y: -screenOffsetYNDC.y * halfH + halfH,
                    };

                    this.resizeNodeScreenScaleX = Math.abs(screenOffsetXPx.x - screenOriginPx.x);
                    this.resizeNodeScreenScaleY = Math.abs(screenOffsetYPx.y - screenOriginPx.y);

                    if (this.resizeNodeScreenScaleX < 0.001) this.resizeNodeScreenScaleX = 0.001;
                    if (this.resizeNodeScreenScaleY < 0.001) this.resizeNodeScreenScaleY = 0.001;
                } else {
                    this.resizeNodeScreenScaleX = 1;
                    this.resizeNodeScreenScaleY = 1;
                }
                break;

            case InteractionState.PANNING:
                this.space.plugins
                    .getPlugin('CameraPlugin')
                    ?.startPan(this.pointerState.clientX, this.pointerState.clientY);
                this.container.style.cursor = 'grabbing';
                break;
            case InteractionState.LINKING_NODE:
                this.container.style.cursor = 'crosshair';
                this._createTempLinkLine(data.sourceNode);
                break;
            case InteractionState.IDLE:
                this.container.style.cursor = 'grab';
                break;
        }
        this.space.emit('interaction:stateChanged', { newState, oldState: this.currentState, data });
    }

    _onPointerDown = (e) => {
        if (this.activePointerId !== null && this.activePointerId !== e.pointerId) return;
        this.activePointerId = e.pointerId;

        this._updateNormalizedPointerState(e, true);
        const targetInfo = this._getTargetInfo(e);

        const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
        if (cameraPlugin?.getCameraMode() === 'free' && cameraPlugin.getControls()?.isPointerLocked && this.pointerState.button === 0) {
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

            if (targetInfo.resizeHandle && targetInfo.node instanceof HtmlNode) {
                e.preventDefault();
                e.stopPropagation();
                this._transitionToState(InteractionState.RESIZING_NODE, { node: targetInfo.node });
                this._uiPluginCallbacks.setSelectedNode(targetInfo.node, false);
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

                    const worldPos = this.space.screenToWorld(this.pointerState.clientX, this.pointerState.clientY, targetZ);
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
                        this.space.emit('graph:node:dragged', {node: this.draggedNode, position: primaryNodeNewCalculatedPos});
                    }
                }
                break;

            case InteractionState.RESIZING_NODE:
                e.preventDefault();
                if (this.resizedNode) {
                    const totalDx_screen = this.pointerState.clientX - this.resizeStartPointerPos.x;
                    const totalDy_screen = this.pointerState.clientY - this.resizeStartPointerPos.y;

                    const deltaWidth_local = totalDx_screen / (this.resizeNodeScreenScaleX || 1);
                    const deltaHeight_local = totalDy_screen / (this.resizeNodeScreenScaleY || 1);

                    const newWidth = this.resizeStartNodeSize.width + deltaWidth_local;
                    const newHeight = this.resizeStartNodeSize.height + deltaHeight_local;

                    this.resizedNode.resize(
                        Math.max(HtmlNode.MIN_SIZE.width, newWidth),
                        Math.max(HtmlNode.MIN_SIZE.height, newHeight)
                    );
                    this.space.emit('graph:node:resized', {node: this.resizedNode, size: { ...this.resizedNode.size }});
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
            case 'delete':
                this.space.emit('ui:request:confirm', {
                    message: `Delete node "${node.id.substring(0, 10)}..."?`,
                    onConfirm: () => this.space.emit('ui:request:removeNode', node.id)
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
            shiftKey: e.shiftKey
        });
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

            if (!clickedSelectedEdge) {
                 this._uiPluginCallbacks.setSelectedEdge(null, false);
            }
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
            case 'Delete':
            case 'Backspace':
                if (primarySelectedNode) {
                    const message = selectedNodes.size > 1
                        ? `Delete ${selectedNodes.size} selected nodes?`
                        : `Delete node "${primarySelectedNode.id.substring(0, 10)}..."?`;
                    this.space.emit('ui:request:confirm', {
                        message: message,
                        onConfirm: () => selectedNodes.forEach(node => this.space.emit('ui:request:removeNode', node.id))
                    });
                    handled = true;
                } else if (primarySelectedEdge) {
                    const message = selectedEdges.size > 1
                        ? `Delete ${selectedEdges.size} selected edges?`
                        : `Delete edge "${primarySelectedEdge.id.substring(0, 10)}..."?`;
                    this.space.emit('ui:request:confirm', {
                        message: message,
                        onConfirm: () => selectedEdges.forEach(edge => this.space.emit('ui:request:removeEdge', edge.id))
                    });
                    handled = true;
                }
                break;

            case 'Escape':
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

            case 'Enter':
                if (primarySelectedNode instanceof HtmlNode && primarySelectedNode.data.editable && !isEditingText) {
                    primarySelectedNode.htmlElement?.querySelector('.node-content')?.focus();
                    handled = true;
                }
                break;

            case '+':
            case '=':
                if (primarySelectedNode instanceof HtmlNode) {
                    const factor = e.key === '+' || e.key === '=' ? 1.15 : 1.2;
                    (e.ctrlKey || e.metaKey)
                        ? this.space.emit('ui:request:adjustNodeSize', primarySelectedNode, factor)
                        : this.space.emit('ui:request:adjustContentScale', primarySelectedNode, factor);
                    handled = true;
                }
                break;
            case '-':
            case '_':
                 if (primarySelectedNode instanceof HtmlNode) {
                    const factor = e.key === '-' || e.key === '_' ? 1 / 1.15 : 1 / 1.2;
                    (e.ctrlKey || e.metaKey)
                        ? this.space.emit('ui:request:adjustNodeSize', primarySelectedNode, factor)
                        : this.space.emit('ui:request:adjustContentScale', primarySelectedNode, factor);
                    handled = true;
                }
                break;

            case ' ':
                if (primarySelectedNode) {
                    this.space.emit('ui:request:focusOnNode', primarySelectedNode, 0.5, true);
                    handled = true;
                } else if (primarySelectedEdge) {
                    const midPoint = new THREE.Vector3().lerpVectors(primarySelectedEdge.source.position, primarySelectedEdge.target.position, 0.5);
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

        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    _onWheel = (e) => {
        const targetInfo = this._getTargetInfo(e);

        if (targetInfo.element?.closest('.node-content') && targetInfo.element.scrollHeight > targetInfo.element.clientHeight) return;
        if (targetInfo.element?.closest('.edge-menu-frame input[type="range"]')) return;

        if ((e.ctrlKey || e.metaKey) && targetInfo.node instanceof HtmlNode) {
            e.preventDefault();
            e.stopPropagation();
            const scaleFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            this.space.emit('ui:request:adjustContentScale', targetInfo.node, scaleFactor);
        } else {
            e.preventDefault();
            this.space.emit('ui:request:zoomCamera', e.deltaY);
        }
    };

    _getTargetInfo(event) {
        const element = document.elementFromPoint(event.clientX, event.clientY);

        const nodeElement = element?.closest('.node-common');
        const resizeHandle = element?.closest('.resize-handle');
        const nodeControlsButton = element?.closest('.node-controls button');
        const contentEditableEl = element?.closest('[contenteditable="true"]');
        const interactiveEl = element?.closest('button, input, textarea, select, a, .clickable');

        let graphNode = nodeElement ? this.space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeElement.dataset.nodeId) : null;
        let intersectedEdge = null;

        // Prioritize HTML element interactions before raycasting into the 3D scene.
        // Raycasting can be a performance bottleneck on very dense graphs,
        // so minimizing its calls or optimizing the objects it checks is important.
        const needsRaycast = !resizeHandle && !nodeControlsButton && !contentEditableEl && !interactiveEl;

        if (needsRaycast) {
            const intersectedObjectResult = this.space.intersectedObjects(event.clientX, event.clientY);
            if (intersectedObjectResult) {
                if (intersectedObjectResult.node && !graphNode) {
                    graphNode = intersectedObjectResult.node;
                }
                intersectedEdge = intersectedObjectResult.edge || null;
            }
        }

        return {
            element,
            nodeElement,
            resizeHandle,
            nodeControls: nodeControlsButton,
            contentEditable: contentEditableEl,
            interactiveElement: interactiveEl,
            node: graphNode,
            intersectedEdge,
        };
    }

    _handleHover(e) {
        if (this.pointerState.down || this.currentState !== InteractionState.IDLE) {
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
        if (!this.tempLinkLine || !this._uiPluginCallbacks.getIsLinking() || !this._uiPluginCallbacks.getLinkSourceNode()) return;

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
        // this.toolbar.dispose(); // Toolbar will be removed

        this.space = null;
        this.container = null;
        this.draggedNode = null;
        this.resizedNode = null;
        this.hoveredEdge = null;
        this._uiPluginCallbacks = null;

        console.log('UIManager disposed.');
    }
}
