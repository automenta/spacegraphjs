import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { $, $$ } from '../utils.js';
import { HtmlNode } from '../graph/nodes/HtmlNode.js';
import { NoteNode } from '../graph/nodes/NoteNode.js';
import { ShapeNode } from '../graph/nodes/ShapeNode.js';

export class UIManager {
    space = null;
    container = null;
    contextMenuElement = null;
    confirmDialogElement = null;
    toolbarElement = null; // Added
    edgeMenuObject = null;

    draggedNode = null;
    draggedNodeInitialZ = 0;
    resizedNode = null;
    hoveredEdge = null;
    resizeStartPos = { x: 0, y: 0 };
    resizeStartSize = { width: 0, height: 0 };
    dragOffset = new THREE.Vector3();
    pointerState = {
        down: false,
        primary: false,
        secondary: false,
        middle: false,
        potentialClick: true,
        lastPos: { x: 0, y: 0 },
        startPos: { x: 0, y: 0 },
    };
    confirmCallback = null;
    tempLinkLine = null;

    constructor(space, contextMenuEl, confirmDialogEl) {
        if (!space || !contextMenuEl || !confirmDialogEl)
            throw new Error('UIManager requires SpaceGraph instance and UI elements.');
        this.space = space;
        this.container = space.container;
        this.contextMenuElement = contextMenuEl;
        this.confirmDialogElement = confirmDialogEl;
        this.toolbarElement = $('#toolbar');
        this._bindEvents();
        this._subscribeToSpaceGraphEvents();
        this._setupToolbar();
        this._applySavedTheme();
    }

    _applySavedTheme() {
        const savedTheme = localStorage.getItem('spacegraph-theme');
        if (savedTheme === 'light') {
            document.body.classList.add('theme-light');
        } else {
            document.body.classList.remove('theme-light'); // Ensure dark is default if no preference or 'dark'
        }
        // Update toggle button appearance if needed, e.g. after toolbar is created
        const themeButton = this.toolbarElement?.querySelector('#tb-toggle-theme');
        if (themeButton) {
            // Example: themeButton.textContent = document.body.classList.contains('theme-light') ? '🌙 Dark' : '☀️ Light';
        }
    }

    _setupToolbar() {
        if (!this.toolbarElement) {
            return;
        }
        this.toolbarElement.innerHTML = '';

        const buttons = [
            { id: 'tb-add-node', text: '➕ Node', title: 'Add Default Node', action: 'addNode' },
            { id: 'tb-center-view', text: '🎯 Center', title: 'Center View', action: 'centerView' },
            { id: 'tb-reset-view', text: '🔄 Reset', title: 'Reset View', action: 'resetView' },
            { id: 'tb-toggle-theme', text: '🎨 Theme', title: 'Toggle Light/Dark Theme', action: 'toggleTheme' },
        ];

        buttons.forEach((btnData) => {
            const button = document.createElement('button');
            button.id = btnData.id;
            button.textContent = btnData.text;
            button.title = btnData.title;
            button.addEventListener('click', () => this._handleToolbarAction(btnData.action, button));
            this.toolbarElement.appendChild(button);
        });
    }

    _handleToolbarAction(action, buttonElement) {
        // Added buttonElement
        switch (action) {
            case 'addNode': {
                const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
                const cam = camPlugin?.getCameraInstance();
                let nodePos = { x: 0, y: 0, z: 0 };

                if (cam) {
                    const camPos = new THREE.Vector3();
                    const camDir = new THREE.Vector3();
                    cam.getWorldPosition(camPos);
                    cam.getWorldDirection(camDir);
                    const distanceInFront = 300;
                    const targetPos = camPos.add(camDir.multiplyScalar(distanceInFront));
                    nodePos = { x: targetPos.x, y: targetPos.y, z: 0 };
                } else {
                    nodePos = { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100, z: 0 };
                }

                this.space.emit('ui:request:createNode', {
                    type: 'html',
                    position: nodePos,
                    data: { label: 'New Node', content: 'Edit me!' },
                });
                break;
            }
            case 'centerView':
                this.space.emit('ui:request:centerView');
                break;
            case 'resetView':
                this.space.emit('ui:request:resetView');
                break;
            case 'toggleTheme':
                document.body.classList.toggle('theme-light');
                const currentTheme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
                localStorage.setItem('spacegraph-theme', currentTheme);
                // if (buttonElement) { // Update button text/icon
                //    buttonElement.textContent = currentTheme === 'light' ? '🌙 Dark' : '☀️ Light';
                // }
                this.space.emit('theme:changed', { theme: currentTheme });
                break;
            default:
                console.warn('UIManager: Unknown toolbar action:', action);
        }
    }

    _bindEvents() {
        const passiveOpts = { passive: false };
        this.container.addEventListener('pointerdown', this._onPointerDown, passiveOpts);
        window.addEventListener('pointermove', this._onPointerMove, passiveOpts);
        window.addEventListener('pointerup', this._onPointerUp, passiveOpts);
        this.container.addEventListener('contextmenu', this._onContextMenu, passiveOpts);
        document.addEventListener('click', this._onDocumentClick, true);
        this.contextMenuElement.addEventListener('click', this._onContextMenuClick, false);
        $('#confirm-yes', this.confirmDialogElement)?.addEventListener('click', this._onConfirmYes, false);
        $('#confirm-no', this.confirmDialogElement)?.addEventListener('click', this._onConfirmNo, false);
        window.addEventListener('keydown', this._onKeyDown, false);
        this.container.addEventListener('wheel', this._onWheel, passiveOpts);
    }

    _subscribeToSpaceGraphEvents() {
        this.space.on('node:selected', this._onNodeSelected);
        this.space.on('edge:selected', this._onEdgeSelected);
        this.space.on('node:added', this._onNodeAdded);
        this.space.on('node:removed', this._onNodeRemoved);
        this.space.on('edge:added', this._onEdgeAdded);
        this.space.on('edge:removed', this._onEdgeRemoved);
        this.space.on('layout:started', this._onLayoutStarted);
        this.space.on('layout:stopped', this._onLayoutStopped);
        this.space.on('ui:linking:started', this._onLinkingStarted);
        this.space.on('ui:linking:cancelled', this._onLinkingCancelled);
        this.space.on('ui:linking:completed', this._onLinkingCompleted);
    }

    _updatePointerState(e, isDown) {
        this.pointerState.down = isDown;
        this.pointerState.primary = isDown && e.button === 0;
        this.pointerState.secondary = isDown && e.button === 2;
        this.pointerState.middle = isDown && e.button === 1;
        if (isDown) {
            this.pointerState.potentialClick = true;
            this.pointerState.startPos = { x: e.clientX, y: e.clientY };
            this.pointerState.lastPos = { x: e.clientX, y: e.clientY };
        }
    }

    _onPointerDown = (e) => {
        this._updatePointerState(e, true);

        if (this.pointerState.secondary) {
            e.preventDefault();
            return;
        }

        const targetInfo = this._getTargetInfo(e);

        if (this.pointerState.primary) {
            if (this._handlePointerDownControls(e, targetInfo)) return;
            if (this._handlePointerDownResize(e, targetInfo)) return;
            if (this._handlePointerDownNode(e, targetInfo)) return;
            if (this._handlePointerDownEdge(e, targetInfo)) return;
            if (this._handlePointerDownBackground(e, targetInfo)) return;
        }

        if (this.pointerState.middle) {
            e.preventDefault();
        }
    };

    _onPointerMove = (e) => {
        if (!this.pointerState.down) {
            this._handleHover(e);
            return;
        }

        const totalDx = e.clientX - this.pointerState.startPos.x;
        const totalDy = e.clientY - this.pointerState.startPos.y;

        if (Math.sqrt(totalDx ** 2 + totalDy ** 2) > 3) this.pointerState.potentialClick = false;
        this.pointerState.lastPos = { x: e.clientX, y: e.clientY };

        if (this.resizedNode) {
            e.preventDefault();
            const newWidth = this.resizeStartSize.width + totalDx;
            const newHeight = this.resizeStartSize.height + totalDy;
            this.resizedNode.resize(newWidth, newHeight);
            return;
        }

        if (this.draggedNode) {
            e.preventDefault();
            let targetZ = this.draggedNodeInitialZ;

            if (e.altKey) {
                const dy = e.clientY - this.pointerState.lastPos.y;
                const zSensitivity = 1.0;
                targetZ -= dy * zSensitivity;
                this.draggedNodeInitialZ = targetZ;
            }

            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, targetZ);

            if (worldPos) {
                let primaryNodeNewCalculatedPos = worldPos.clone().sub(this.dragOffset);
                primaryNodeNewCalculatedPos.z = targetZ;
                const dragDelta = primaryNodeNewCalculatedPos.clone().sub(this.draggedNode.position);
                const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
                const selectedNodes = uiPlugin?.getSelectedNodes();

                if (selectedNodes && selectedNodes.size > 0) {
                    selectedNodes.forEach((sNode) => {
                        if (sNode === this.draggedNode) {
                            sNode.drag(primaryNodeNewCalculatedPos);
                        } else {
                            const sNodeTargetPos = sNode.position.clone().add(dragDelta);
                            sNode.drag(sNodeTargetPos);
                        }
                    });
                } else if (this.draggedNode) {
                    this.draggedNode.drag(primaryNodeNewCalculatedPos);
                }
            }
            return;
        }

        if (this.space.isLinking) {
            e.preventDefault();
            this._updateTempLinkLine(e.clientX, e.clientY);
            const targetInfo = this._getTargetInfo(e);
            $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
            const targetElement = targetInfo.node?.htmlElement ?? targetInfo.node?.labelObject?.element;
            if (targetInfo.node && targetInfo.node !== this.space.linkSourceNode && targetElement) {
                targetElement.classList.add('linking-target');
            }
            return;
        }

        if (this.pointerState.primary) {
            const dx = e.clientX - this.pointerState.lastPos.x;
            const dy = e.clientY - this.pointerState.lastPos.y;
            this.space.plugins.getPlugin('CameraPlugin')?.pan(dx, dy);
        }
    };

    _onPointerUp = (e) => {
        if (this.resizedNode) {
            this.resizedNode.endResize();
            this.resizedNode = null;
        } else if (this.draggedNode) {
            this.draggedNode.endDrag();
            this.draggedNode = null;
        } else if (this.space.isLinking && e.button === 0) {
            this.space.emit('ui:request:completeLinking', e.clientX, e.clientY);
        } else if (e.button === 1 && this.pointerState.potentialClick) {
            const { node } = this._getTargetInfo(e);
            if (node) {
                this.space.emit('ui:request:autoZoomNode', node);
                e.preventDefault();
            }
        }
        this.space.plugins.getPlugin('CameraPlugin')?.endPan();
        this._updatePointerState(e, false);
        $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
    };

    _onContextMenu = (e) => {
        e.preventDefault();
        this._hideContextMenu();
        const targetInfo = this._getTargetInfo(e);
        let menuItems = [];
        let target = null;

        if (targetInfo.node) {
            target = targetInfo.node;
            this.space.emit('ui:request:setSelectedNode', target, false);
            menuItems = this._getContextMenuItemsNode(target);
        } else if (targetInfo.intersectedEdge) {
            target = targetInfo.intersectedEdge;
            this.space.emit('ui:request:setSelectedEdge', target, false);
            menuItems = this._getContextMenuItemsEdge(target);
        } else {
            this.space.emit('ui:request:setSelectedNode', null, false);
            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, 0);
            menuItems = this._getContextMenuItemsBackground(worldPos);
        }
        if (menuItems.length > 0) this._showContextMenu(e.clientX, e.clientY, menuItems);
    };

    _onDocumentClick = (e) => {
        const clickedContextMenu = this.contextMenuElement.contains(e.target);
        const clickedEdgeMenu = this.edgeMenuObject?.element?.contains(e.target);
        const clickedConfirmDialog = this.confirmDialogElement.contains(e.target);

        if (!clickedContextMenu) this._hideContextMenu();

        if (!clickedEdgeMenu && this.edgeMenuObject) {
            const targetInfo = this._getTargetInfo(e);
            const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
            if (uiPlugin && !uiPlugin.getSelectedEdges().has(targetInfo.intersectedEdge)) {
                this.space.emit('ui:request:setSelectedEdge', null, false);
            }
        }

        const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
        const cameraControls = cameraPlugin?.getControls();
        if (
            !e.shiftKey &&
            !clickedContextMenu &&
            !clickedEdgeMenu &&
            !clickedConfirmDialog &&
            this.pointerState.potentialClick &&
            !cameraControls?.isPanning &&
            !this.space.isLinking
        ) {
            const targetInfo = this._getTargetInfo(e);
            const clickedOnGraphElement =
                targetInfo.nodeElement ||
                targetInfo.intersectedObjectResult?.node ||
                targetInfo.intersectedObjectResult?.edge;
            if (!clickedOnGraphElement) {
                this.space.emit('ui:request:setSelectedNode', null, false);
            }
        }
    };

    _onContextMenuClick = (e) => {
        const li = e.target.closest('li[data-action]');
        if (!li) return;
        const { action, nodeId, edgeId, position: positionData } = li.dataset;
        this._hideContextMenu();

        const actions = {
            'edit-node': () => {
                const node = this.space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeId);
                if (node instanceof HtmlNode && node.data.editable) {
                    node.htmlElement?.querySelector('.node-content')?.focus();
                }
            },
            'delete-node': () =>
                this._showConfirm(`Delete node "${nodeId?.substring(0, 10)}..."?`, () =>
                    this.space.emit('ui:request:removeNode', nodeId)
                ),
            'delete-edge': () =>
                this._showConfirm(`Delete edge "${edgeId?.substring(0, 10)}..."?`, () =>
                    this.space.emit('ui:request:removeEdge', edgeId)
                ),
            'autozoom-node': () =>
                this.space.emit(
                    'ui:request:autoZoomNode',
                    this.space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeId)
                ),
            'create-note': () =>
                this.space.emit(
                    'ui:request:addNode',
                    new NoteNode(null, JSON.parse(positionData), { content: 'New Note ✨' })
                ),
            'create-box': () =>
                this.space.emit(
                    'ui:request:addNode',
                    new ShapeNode(null, JSON.parse(positionData), {
                        label: 'Box Node 📦',
                        shape: 'box',
                        size: 60,
                        color: Math.random() * 0xffffff,
                    })
                ),
            'create-sphere': () =>
                this.space.emit(
                    'ui:request:addNode',
                    new ShapeNode(null, JSON.parse(positionData), {
                        label: 'Sphere Node 🌐',
                        shape: 'sphere',
                        size: 60,
                        color: Math.random() * 0xffffff,
                    })
                ),
            'center-view': () => this.space.emit('ui:request:centerView'),
            'reset-view': () => this.space.emit('ui:request:resetView'),
            'start-link': () =>
                this.space.emit(
                    'ui:request:startLinking',
                    this.space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeId)
                ),
            'reverse-edge': () => this.space.emit('ui:request:reverseEdge', edgeId),
            'edit-edge': () =>
                this.space.emit(
                    'ui:request:setSelectedEdge',
                    this.space.plugins.getPlugin('EdgePlugin')?.getEdgeById(edgeId)
                ),
            'toggle-pin-node': () => this.space.togglePinNode(nodeId),
            'toggle-background': () => {
                const renderingPlugin = this.space.plugins.getPlugin('RenderingPlugin');
                if (renderingPlugin) {
                    this.space.emit(
                        'ui:request:toggleBackground',
                        renderingPlugin.background.alpha === 0 ? 0x1a1a1d : 0x000000,
                        renderingPlugin.background.alpha === 0 ? 1.0 : 0
                    );
                }
            },
        };
        actions[action]?.() ?? console.warn('Unknown context menu action:', action);
    };

    _onConfirmYes = () => {
        this.confirmCallback?.();
        this._hideConfirm();
    };
    _onConfirmNo = () => this._hideConfirm();

    _onKeyDown = (e) => {
        const activeEl = document.activeElement;
        const isEditing =
            activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
        if (isEditing && e.key !== 'Escape') return;

        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
        const selectedNodes = uiPlugin?.getSelectedNodes();
        const selectedEdges = uiPlugin?.getSelectedEdges();
        const primarySelectedNode =
            selectedNodes && selectedNodes.size > 0 ? selectedNodes.values().next().value : null;
        const primarySelectedEdge =
            selectedEdges && selectedEdges.size > 0 ? selectedEdges.values().next().value : null;
        let handled = true;

        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                if (primarySelectedNode) {
                    const message =
                        selectedNodes.size > 1
                            ? `Delete ${selectedNodes.size} selected nodes?`
                            : `Delete node "${primarySelectedNode.id.substring(0, 10)}..."?`;
                    this._showConfirm(message, () =>
                        selectedNodes.forEach((node) => this.space.emit('ui:request:removeNode', node.id))
                    );
                } else if (primarySelectedEdge) {
                    const message =
                        selectedEdges.size > 1
                            ? `Delete ${selectedEdges.size} selected edges?`
                            : `Delete edge "${primarySelectedEdge.id.substring(0, 10)}..."?`;
                    this._showConfirm(message, () =>
                        selectedEdges.forEach((edge) => this.space.emit('ui:request:removeEdge', edge.id))
                    );
                } else handled = false;
                break;
            case 'Escape':
                if (this.space.isLinking) this.space.emit('ui:request:cancelLinking');
                else if (this.contextMenuElement.style.display === 'block') this._hideContextMenu();
                else if (this.confirmDialogElement.style.display === 'block') this._hideConfirm();
                else if (this.edgeMenuObject) this.space.emit('ui:request:setSelectedEdge', null, false);
                else if ((selectedNodes && selectedNodes.size > 0) || (selectedEdges && selectedEdges.size > 0))
                    this.space.emit('ui:request:setSelectedNode', null, false);
                else handled = false;
                break;
            case 'Enter':
                if (primarySelectedNode instanceof HtmlNode && primarySelectedNode.data.editable)
                    primarySelectedNode.htmlElement?.querySelector('.node-content')?.focus();
                else handled = false;
                break;
            case '+':
            case '=':
                if (primarySelectedNode instanceof HtmlNode)
                    e.ctrlKey || e.metaKey
                        ? this.space.emit('ui:request:adjustNodeSize', primarySelectedNode, 1.2)
                        : this.space.emit('ui:request:adjustContentScale', primarySelectedNode, 1.15);
                else handled = false;
                break;
            case '-':
            case '_':
                if (primarySelectedNode instanceof HtmlNode)
                    e.ctrlKey || e.metaKey
                        ? this.space.emit('ui:request:adjustNodeSize', primarySelectedNode, 1 / 1.2)
                        : this.space.emit('ui:request:adjustContentScale', primarySelectedNode, 1 / 1.15);
                else handled = false;
                break;
            case ' ':
                if (primarySelectedNode) this.space.emit('ui:request:focusOnNode', primarySelectedNode, 0.5, true);
                else if (primarySelectedEdge) {
                    const midPoint = new THREE.Vector3().lerpVectors(
                        primarySelectedEdge.source.position,
                        primarySelectedEdge.target.position,
                        0.5
                    );
                    const dist = primarySelectedEdge.source.position.distanceTo(primarySelectedEdge.target.position);
                    const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
                    cameraPlugin?.pushState();
                    cameraPlugin?.moveTo(midPoint.x, midPoint.y, midPoint.z + dist * 0.6 + 100, 0.5, midPoint);
                } else this.space.emit('ui:request:centerView');
                break;
            default:
                handled = false;
        }
        if (handled) e.preventDefault();
    };

    _onWheel = (e) => {
        const targetInfo = this._getTargetInfo(e);
        if (e.target.closest('.node-controls, .edge-menu-frame') || targetInfo.contentEditable) return;
        if (e.ctrlKey || e.metaKey) {
            if (targetInfo.node instanceof HtmlNode) {
                e.preventDefault();
                e.stopPropagation();
                this.space.emit('ui:request:adjustContentScale', targetInfo.node, e.deltaY < 0 ? 1.1 : 1 / 1.1);
            }
        } else {
            e.preventDefault();
            this.space.emit('ui:request:zoomCamera', e.deltaY);
        }
    };

    _getTargetInfo(event) {
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const nodeElement = element?.closest('.node-common');
        const resizeHandle = element?.closest('.resize-handle');
        const nodeControls = element?.closest('.node-controls button');
        const contentEditable = element?.closest('[contenteditable="true"]');
        const interactiveElement = element?.closest('button, input, textarea, select, a');
        let node = nodeElement
            ? this.space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeElement.dataset.nodeId)
            : null;
        let intersectedObjectResult = null;
        const needsRaycast = !element || (!resizeHandle && !nodeControls && !contentEditable && !interactiveElement);
        if (needsRaycast) {
            intersectedObjectResult = this.space.intersectedObjects(event.clientX, event.clientY);
            if (intersectedObjectResult?.node && (!node || nodeElement?.classList.contains('node-label-3d'))) {
                node = intersectedObjectResult.node;
            }
        }
        return {
            element,
            nodeElement,
            resizeHandle,
            nodeControls,
            contentEditable,
            interactiveElement,
            node,
            intersectedEdge: intersectedObjectResult?.edge ?? null,
            intersectedObjectResult,
        };
    }

    _handleHover(e) {
        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
        const selectedEdges = uiPlugin?.getSelectedEdges();
        if (this.pointerState.down || this.draggedNode || this.resizedNode || this.space.isLinking) {
            if (this.hoveredEdge && !selectedEdges?.has(this.hoveredEdge)) this.hoveredEdge.setHighlight(false);
            this.hoveredEdge = null;
            return;
        }
        const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
        const edgePlugin = this.space.plugins.getPlugin('EdgePlugin');
        const camInstance = cameraPlugin?.getCameraInstance();
        if (!camInstance || !edgePlugin) {
            if (this.hoveredEdge && !selectedEdges?.has(this.hoveredEdge)) this.hoveredEdge.setHighlight(false);
            this.hoveredEdge = null;
            return;
        }
        const vec = new THREE.Vector2(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, camInstance);
        raycaster.params.Line.threshold = 5;
        const currentEdgesMap = edgePlugin.getEdges();
        const edgeLines = [...currentEdgesMap.values()].map((edge) => edge.line).filter(Boolean);
        const intersects = edgeLines.length > 0 ? raycaster.intersectObjects(edgeLines, false) : [];
        const intersectedEdgeInstance =
            intersects.length > 0 ? edgePlugin.getEdgeById(intersects[0].object.userData.edgeId) : null;
        if (this.hoveredEdge !== intersectedEdgeInstance) {
            if (this.hoveredEdge && !selectedEdges?.has(this.hoveredEdge)) this.hoveredEdge.setHighlight(false);
            this.hoveredEdge = intersectedEdgeInstance;
            if (this.hoveredEdge && !selectedEdges?.has(this.hoveredEdge)) this.hoveredEdge.setHighlight(true);
        }
    }

    _handlePointerDownControls(e, targetInfo) {
        if (targetInfo.nodeControls && targetInfo.node instanceof HtmlNode) {
            e.preventDefault();
            e.stopPropagation();
            const button = targetInfo.nodeControls;
            const actionClass = [...button.classList].find((cls) => cls.startsWith('node-') && !cls.includes('button'));
            const action = actionClass?.substring('node-'.length);
            const actions = {
                delete: () =>
                    this._showConfirm(`Delete node "${targetInfo.node.id.substring(0, 10)}..."?`, () =>
                        this.space.emit('ui:request:removeNode', targetInfo.node.id)
                    ),
                'content-zoom-in': () => this.space.emit('ui:request:adjustContentScale', targetInfo.node, 1.15),
                'content-zoom-out': () => this.space.emit('ui:request:adjustContentScale', targetInfo.node, 1 / 1.15),
                grow: () => this.space.emit('ui:request:adjustNodeSize', targetInfo.node, 1.2),
                shrink: () => this.space.emit('ui:request:adjustNodeSize', targetInfo.node, 1 / 1.2),
            };
            if (action && actions[action]) actions[action]();
            this._hideContextMenu();
            return true;
        }
        return false;
    }

    _handlePointerDownResize(e, targetInfo) {
        if (targetInfo.resizeHandle && targetInfo.node instanceof HtmlNode) {
            e.preventDefault();
            e.stopPropagation();
            this.resizedNode = targetInfo.node;
            this.resizedNode.startResize();
            this.resizeStartPos = { x: e.clientX, y: e.clientY };
            this.resizeStartSize = { ...this.resizedNode.size };
            this.container.style.cursor = 'nwse-resize';
            this._hideContextMenu();
            return true;
        }
        return false;
    }

    _handlePointerDownNode(e, targetInfo) {
        const canDrag =
            targetInfo.node &&
            !targetInfo.nodeControls &&
            !targetInfo.resizeHandle &&
            !targetInfo.interactiveElement &&
            !targetInfo.contentEditable;
        if (canDrag) {
            e.preventDefault();
            this.draggedNode = targetInfo.node;
            this.draggedNode.startDrag();
            this.draggedNodeInitialZ = this.draggedNode.position.z;
            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, this.draggedNodeInitialZ);
            this.dragOffset = worldPos ? worldPos.sub(this.draggedNode.position) : new THREE.Vector3();
            this.container.style.cursor = 'grabbing';
            this.space.emit('ui:request:setSelectedNode', targetInfo.node, e.shiftKey);
            this._hideContextMenu();
            return true;
        }
        if (targetInfo.node && (targetInfo.interactiveElement || targetInfo.contentEditable)) {
            e.stopPropagation();
            this.space.emit('ui:request:setSelectedNode', targetInfo.node, false);
            this._hideContextMenu();
        }
        return false;
    }

    _handlePointerDownEdge(e, targetInfo) {
        if (targetInfo.intersectedEdge && !targetInfo.node) {
            e.preventDefault();
            this.space.emit('ui:request:setSelectedEdge', targetInfo.intersectedEdge, e.shiftKey);
            this._hideContextMenu();
            return true;
        }
        return false;
    }

    _handlePointerDownBackground(e, targetInfo) {
        if (!targetInfo.node && !targetInfo.intersectedEdge) {
            this._hideContextMenu();
            this.space.plugins.getPlugin('CameraPlugin')?.startPan(e.clientX, e.clientY);
        }
        return false;
    }

    _getContextMenuItemsNode(node) {
        const items = [];
        if (node instanceof HtmlNode && node.data.editable)
            items.push({ label: 'Edit Content 📝', action: 'edit-node', nodeId: node.id });
        items.push({ label: 'Start Link ✨', action: 'start-link', nodeId: node.id });
        items.push({ label: 'Auto Zoom / Back 🖱️', action: 'autozoom-node', nodeId: node.id });
        const pinActionLabel = node.isPinned ? 'Unpin Node 📌' : 'Pin Node 📌';
        items.push({ label: pinActionLabel, action: 'toggle-pin-node', nodeId: node.id });
        items.push({ type: 'separator' });
        items.push({ label: 'Delete Node 🗑️', action: 'delete-node', nodeId: node.id });
        return items;
    }

    _getContextMenuItemsEdge(edge) {
        return [
            { label: 'Edit Style...', action: 'edit-edge', edgeId: edge.id },
            { label: 'Reverse Direction', action: 'reverse-edge', edgeId: edge.id },
            { type: 'separator' },
            { label: 'Delete Edge 🗑️', action: 'delete-edge', edgeId: edge.id },
        ];
    }

    _getContextMenuItemsBackground(worldPos) {
        const items = [];
        if (worldPos) {
            const posStr = JSON.stringify({ x: worldPos.x, y: worldPos.y, z: worldPos.z });
            items.push({ label: 'Create Note Here 📝', action: 'create-note', position: posStr });
            items.push({ label: 'Create Box Here 📦', action: 'create-box', position: posStr });
            items.push({ label: 'Create Sphere Here 🌐', action: 'create-sphere', position: posStr });
        }
        items.push({ type: 'separator' });
        items.push({ label: 'Center View 🧭', action: 'center-view' });
        items.push({ label: 'Reset Zoom & Pan', action: 'reset-view' });
        const renderingPlugin = this.space.plugins.getPlugin('RenderingPlugin');
        if (renderingPlugin) {
            items.push({
                label: renderingPlugin.background.alpha === 0 ? 'Set Dark Background' : 'Set Transparent BG',
                action: 'toggle-background',
            });
        }
        return items;
    }

    _showContextMenu(x, y, items) {
        const cm = this.contextMenuElement;
        cm.innerHTML = '';
        const ul = document.createElement('ul');
        items.forEach((itemData) => {
            const li = document.createElement('li');
            if (itemData.type === 'separator') li.className = 'separator';
            else {
                li.textContent = itemData.label;
                Object.entries(itemData).forEach(([k, v]) => {
                    if (k !== 'label' && k !== 'type' && v != null) li.dataset[k] = String(v);
                });
                if (itemData.disabled) li.classList.add('disabled');
            }
            ul.appendChild(li);
        });
        cm.appendChild(ul);
        const { offsetWidth: menuWidth, offsetHeight: menuHeight } = cm;
        const margin = 5;
        let finalX = x + margin + menuWidth > window.innerWidth - margin ? x - menuWidth - margin : x + margin;
        let finalY = y + margin + menuHeight > window.innerHeight - margin ? y - menuHeight - margin : y + margin;
        cm.style.left = `${Math.max(margin, finalX)}px`;
        cm.style.top = `${Math.max(margin, finalY)}px`;
        cm.style.display = 'block';
    }

    _hideContextMenu = () => {
        this.contextMenuElement.style.display = 'none';
        this.contextMenuElement.innerHTML = '';
    };
    _showConfirm(message, onConfirm) {
        const messageEl = $('#confirm-message', this.confirmDialogElement);
        if (messageEl) messageEl.textContent = message;
        this.confirmCallback = onConfirm;
        this.confirmDialogElement.style.display = 'block';
    }
    _hideConfirm = () => {
        this.confirmDialogElement.style.display = 'none';
        this.confirmCallback = null;
    };

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
        if (!this.tempLinkLine || !this.space.linkSourceNode) return;
        const targetPos = this.space.screenToWorld(screenX, screenY, this.space.linkSourceNode.position.z);
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

    showEdgeMenu(edge) {
        if (!edge) return;
        this.hideEdgeMenu();
        const menuElement = this._createEdgeMenuElement(edge);
        this.edgeMenuObject = new CSS3DObject(menuElement);
        this.space.cssScene.add(this.edgeMenuObject);
        this.updateEdgeMenuPosition();
    }

    _createEdgeMenuElement(edge) {
        const menu = document.createElement('div');
        menu.className = 'edge-menu-frame';
        menu.dataset.edgeId = edge.id;
        menu.innerHTML = `
            <input type="color" value="#${edge.data.color.toString(16).padStart(6, '0')}" title="Color" data-action="color">
            <input type="range" min="0.5" max="5" step="0.1" value="${edge.data.thickness}" title="Thickness" data-action="thickness">
            <select title="Constraint Type" data-action="constraintType">
                ${['elastic', 'rigid', 'weld'].map((n) => `<option value="${n}" ${edge.data.constraintType === n ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
            <button title="Delete Edge" class="delete" data-action="delete">×</button>
        `;
        menu.addEventListener('pointerdown', (e) => e.stopPropagation());
        menu.addEventListener('wheel', (e) => e.stopPropagation());
        menu.addEventListener('input', (e) => {
            const target = e.target;
            const action = target.dataset.action;
            const edgeId = menu.dataset.edgeId;
            const edgePlugin = this.space.plugins.getPlugin('EdgePlugin');
            const currentEdge = edgePlugin?.getEdgeById(edgeId);
            if (!currentEdge) return;
            let value;
            switch (action) {
                case 'color':
                    value = parseInt(target.value.substring(1), 16);
                    break;
                case 'thickness':
                    value = parseFloat(target.value);
                    break;
                case 'constraintType':
                    value = target.value;
                    break;
            }
            this.space.emit('ui:request:updateEdge', edgeId, action, value);
        });
        menu.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button || button.dataset.action !== 'delete') return;
            const edgeId = menu.dataset.edgeId;
            this._showConfirm(`Delete edge "${edgeId?.substring(0, 10)}..."?`, () =>
                this.space.emit('ui:request:removeEdge', edgeId)
            );
        });
        return menu;
    }

    hideEdgeMenu = () => {
        if (this.edgeMenuObject) {
            this.edgeMenuObject.element?.remove();
            this.edgeMenuObject.parent?.remove(this.edgeMenuObject);
            this.edgeMenuObject = null;
        }
    };
    updateEdgeMenuPosition = () => {
        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
        const selectedEdges = uiPlugin?.getSelectedEdges();
        if (!this.edgeMenuObject || !this.edgeMenuObject.element?.parentNode) return;
        if (!selectedEdges || selectedEdges.size !== 1) {
            this.hideEdgeMenu();
            return;
        }
        const edge = selectedEdges.values().next().value;
        const midPoint = new THREE.Vector3().lerpVectors(edge.source.position, edge.target.position, 0.5);
        this.edgeMenuObject.position.copy(midPoint);
        const camInstance = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        if (camInstance) this.edgeMenuObject.quaternion.copy(camInstance.quaternion);
    };

    _onNodeSelected = (targetNode) => {};
    _onEdgeSelected = (targetEdge) => {
        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
        const selectedEdges = uiPlugin?.getSelectedEdges();
        if (targetEdge && selectedEdges && selectedEdges.size === 1 && selectedEdges.has(targetEdge))
            this.showEdgeMenu(targetEdge);
        else this.hideEdgeMenu();
    };
    _onNodeAdded = (node) => {};
    _onNodeRemoved = (nodeId, node) => {};
    _onEdgeAdded = (edge) => {};
    _onEdgeRemoved = (edgeId, edge) => {};
    _onLayoutStarted = () => {};
    _onLayoutStopped = () => {};
    _onLinkingStarted = (sourceNode) => {
        this.container.style.cursor = 'crosshair';
        this._createTempLinkLine(sourceNode);
        this._hideContextMenu();
    };
    _onLinkingCancelled = () => {
        this._removeTempLinkLine();
        this.container.style.cursor = 'grab';
        $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
    };
    _onLinkingCompleted = () => {
        this._removeTempLinkLine();
        this.container.style.cursor = 'grab';
        $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
    };

    dispose() {
        const passiveOpts = { passive: false };
        this.container.removeEventListener('pointerdown', this._onPointerDown);
        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
        this.container.removeEventListener('contextmenu', this._onContextMenu, passiveOpts);
        document.removeEventListener('click', this._onDocumentClick, true);
        this.contextMenuElement.removeEventListener('click', this._onContextMenuClick);
        $('#confirm-yes', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmYes);
        $('#confirm-no', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmNo);
        window.removeEventListener('keydown', this._onKeyDown);
        this.container.removeEventListener('wheel', this._onWheel, passiveOpts);

        this.space.off('node:selected', this._onNodeSelected);
        this.space.off('edge:selected', this._onEdgeSelected);
        this.space.off('node:added', this._onNodeAdded);
        this.space.off('node:removed', this._onNodeRemoved);
        this.space.off('edge:added', this._onEdgeAdded);
        this.space.off('edge:removed', this._onEdgeRemoved);
        this.space.off('layout:started', this._onLayoutStarted);
        this.space.off('layout:stopped', this._onLayoutStopped);
        this.space.off('ui:linking:started', this._onLinkingStarted);
        this.space.off('ui:linking:cancelled', this._onLinkingCancelled);
        this.space.off('ui:linking:completed', this._onLinkingCompleted);

        this.hideEdgeMenu();
        this.space = null;
        this.container = null;
        this.contextMenuElement = null;
        this.confirmDialogElement = null;
        this.draggedNode = null;
        this.resizedNode = null;
        this.hoveredEdge = null;
        this.confirmCallback = null;
        console.log('UIManager disposed.');
    }
}
