import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { $, $$ } from '../utils.js';
import { HtmlNode } from '../graph/nodes/HtmlNode.js';
import { NoteNode } from '../graph/nodes/NoteNode.js';
import { ShapeNode } from '../graph/nodes/ShapeNode.js';

const InteractionState = {
    IDLE: 'IDLE',
    PANNING: 'PANNING',
    DRAGGING_NODE: 'DRAGGING_NODE',
    RESIZING_NODE: 'RESIZING_NODE',
    LINKING_NODE: 'LINKING_NODE',
};

export class UIManager {
    space = null;
    container = null;
    contextMenuElement = null;
    confirmDialogElement = null;
    toolbarElement = null;
    edgeMenuObject = null;

    currentState = InteractionState.IDLE;
    activePointerId = null;

    draggedNode = null;
    draggedNodeInitialZ = 0;
    dragOffset = new THREE.Vector3();

    resizedNode = null;
    resizeStartPointerPos = { x: 0, y: 0 };
    resizeStartNodeSize = { width: 0, height: 0 };

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

    confirmCallback = null;
    tempLinkLine = null;

    hudLayer = null;
    hudModeIndicator = null;
    hudSelectionInfo = null;
    hudKeyboardShortcutsButton = null;
    keyboardShortcutsDialogElement = null;
    hudLayoutSettingsButton = null;
    layoutSettingsDialogElement = null;

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

    keyboardShortcuts = [
        { keys: ['Delete', 'Backspace'], description: 'Delete selected node(s) or edge(s)' },
        { keys: ['Escape'], description: 'Close menus, cancel linking, deselect all, or exit pointer lock' },
        { keys: ['Enter'], description: 'Focus content of selected HTML node (if editable)' },
        { keys: ['+', '='], description: 'Zoom in content of selected HTML node' },
        { keys: ['Ctrl/Meta + +', 'Ctrl/Meta + ='], description: 'Increase size of selected HTML node' },
        { keys: ['-'], description: 'Zoom out content of selected HTML node' },
        { keys: ['Ctrl/Meta + -'], description: 'Decrease size of selected HTML node' },
        { keys: ['Spacebar'], description: 'Focus on selected item or center view' },
        { keys: ['Scroll Wheel'], description: 'Zoom camera' },
        { keys: ['Ctrl/Meta + Scroll Wheel'], description: 'Adjust content scale of hovered HTML node' },
        { keys: ['Middle Mouse Button (on node)'], description: 'Auto-zoom to node' },
        { keys: ['Alt + Drag Node (vertical)'], description: 'Adjust node Z-depth' },
    ];

    constructor(space, contextMenuEl, confirmDialogEl, uiPluginCallbacks) {
        if (!space || !contextMenuEl || !confirmDialogEl)
            throw new Error('UIManager requires SpaceGraph instance and UI elements.');
        this.space = space;
        this.container = space.container;
        this.contextMenuElement = contextMenuEl;
        this.confirmDialogElement = confirmDialogEl;
        this.toolbarElement = $('#toolbar');

        this._uiPluginCallbacks = { ...this._uiPluginCallbacks, ...uiPluginCallbacks };

        this._createHudElements();

        this._bindEvents();
        this._subscribeToSpaceGraphEvents();
        this._setupToolbar();
        this._applySavedTheme();
        this._updateHudSelectionInfo();
        this._updateHudCameraMode();
    }

    _createHudElements() {
        this.hudLayer = $('#hud-layer');
        if (!this.hudLayer) {
            this.hudLayer = document.createElement('div');
            this.hudLayer.id = 'hud-layer';
            this.container.parentNode.appendChild(this.hudLayer);
        }

        this.hudModeIndicator = $('#hud-mode-indicator');
        if (this.hudModeIndicator?.tagName === 'DIV') {
            this.hudModeIndicator.remove();
            this.hudModeIndicator = null;
        }

        if (!this.hudModeIndicator) {
            this.hudModeIndicator = document.createElement('select');
            this.hudModeIndicator.id = 'hud-mode-indicator';

            const cameraModes = {
                'orbit': 'Orbit Control',
                'free': 'Free Look'
            };

            for (const modeKey in cameraModes) {
                const option = document.createElement('option');
                option.value = modeKey;
                option.textContent = cameraModes[modeKey];
                this.hudModeIndicator.appendChild(option);
            }
            this.hudLayer.appendChild(this.hudModeIndicator);

            this.hudModeIndicator.addEventListener('change', (event) => {
                const newMode = event.target.value;
                this.space.emit('ui:request:setCameraMode', newMode);
            });
        }

        this.hudSelectionInfo = $('#hud-selection-info');
        if (!this.hudSelectionInfo) {
            this.hudSelectionInfo = document.createElement('div');
            this.hudSelectionInfo.id = 'hud-selection-info';
            this.hudLayer.appendChild(this.hudSelectionInfo);
        }

        this.hudKeyboardShortcutsButton = $('#hud-keyboard-shortcuts');
        if (!this.hudKeyboardShortcutsButton) {
            this.hudKeyboardShortcutsButton = document.createElement('div');
            this.hudKeyboardShortcutsButton.id = 'hud-keyboard-shortcuts';
            this.hudKeyboardShortcutsButton.textContent = '⌨️';
            this.hudKeyboardShortcutsButton.title = 'View Keyboard Shortcuts';
            this.hudKeyboardShortcutsButton.style.cursor = 'pointer';
            this.hudLayer.appendChild(this.hudKeyboardShortcutsButton);

            this.hudKeyboardShortcutsButton.addEventListener('click', () => {
                this._showKeyboardShortcutsDialog();
            });
        }

        this.hudLayoutSettingsButton = $('#hud-layout-settings');
        if (!this.hudLayoutSettingsButton) {
            this.hudLayoutSettingsButton = document.createElement('div');
            this.hudLayoutSettingsButton.id = 'hud-layout-settings';
            this.hudLayoutSettingsButton.textContent = '📐';
            this.hudLayoutSettingsButton.title = 'Layout Settings';
            this.hudLayoutSettingsButton.style.cursor = 'pointer';
            this.hudLayer.appendChild(this.hudLayoutSettingsButton);

            this.hudLayoutSettingsButton.addEventListener('click', () => {
                this._showLayoutSettingsDialog();
            });
        }
    }

    _showLayoutSettingsDialog() {
        const layoutPlugin = this.space.plugins.getPlugin('LayoutPlugin');
        if (!layoutPlugin?.layoutManager) {
            console.warn('UIManager: LayoutPlugin not available for layout settings.');
            return;
        }

        if (!this.layoutSettingsDialogElement) {
            this.layoutSettingsDialogElement = document.createElement('div');
            this.layoutSettingsDialogElement.id = 'layout-settings-dialog';
            this.layoutSettingsDialogElement.className = 'dialog';
            this.layoutSettingsDialogElement.addEventListener('pointerdown', (e) => e.stopPropagation());
            document.body.appendChild(this.layoutSettingsDialogElement);
        }

        const currentLayoutName = layoutPlugin.layoutManager.getActiveLayoutName();
        const availableLayouts = [...layoutPlugin.layoutManager.layouts.keys()];

        let dialogHTML = `
            <h2>Layout Settings</h2>
            <div>
                <label for="layout-select">Current Layout: </label>
                <select id="layout-select">
        `;
        availableLayouts.forEach(name => {
            const displayName = name.charAt(0).toUpperCase() + name.slice(1);
            dialogHTML += `<option value="${name}" ${name === currentLayoutName ? 'selected' : ''}>${displayName}</option>`;
        });
        dialogHTML += `
                </select>
            </div>
            <div class="layout-options-container" style="margin-top: 15px; min-height: 50px;">
                <p><em>Layout-specific options will be available here in a future update.</em></p>
            </div>
            <button id="apply-layout-button" style="margin-right: 10px;">Apply Layout</button>
            <button id="close-layout-dialog">Close</button>
        `;

        this.layoutSettingsDialogElement.innerHTML = dialogHTML;

        $('#apply-layout-button', this.layoutSettingsDialogElement)?.addEventListener('click', () => {
            const selectedLayout = $('#layout-select', this.layoutSettingsDialogElement)?.value;
            if (selectedLayout) {
                this.space.emit('ui:request:applyLayout', selectedLayout);
                setTimeout(() => this._updateLayoutSettingsDialogContent(layoutPlugin), 100);
            }
        });

        $('#close-layout-dialog', this.layoutSettingsDialogElement)?.addEventListener('click', () => {
            this._hideLayoutSettingsDialog();
        });

        this.layoutSettingsDialogElement.style.display = 'block';
        this.space.emit('ui:layoutsettings:shown');
    }

    _updateLayoutSettingsDialogContent(layoutPlugin) {
        if (!this.layoutSettingsDialogElement || this.layoutSettingsDialogElement.style.display === 'none') return;
        if (!layoutPlugin?.layoutManager) return;

        const currentLayoutName = layoutPlugin.layoutManager.getActiveLayoutName();
        const selectElement = $('#layout-select', this.layoutSettingsDialogElement);
        selectElement && (selectElement.value = currentLayoutName);
    }

    _hideLayoutSettingsDialog = () => {
        if (this.layoutSettingsDialogElement) {
            this.layoutSettingsDialogElement.style.display = 'none';
            this.space.emit('ui:layoutsettings:hidden');
        }
    }

    _showKeyboardShortcutsDialog() {
        if (!this.keyboardShortcutsDialogElement) {
            this.keyboardShortcutsDialogElement = document.createElement('div');
            this.keyboardShortcutsDialogElement.id = 'keyboard-shortcuts-dialog';
            this.keyboardShortcutsDialogElement.className = 'dialog';
            this.keyboardShortcutsDialogElement.addEventListener('pointerdown', (e) => e.stopPropagation());


            let tableHTML = `
                <h2>Keyboard Shortcuts</h2>
                <table class="shortcuts-table">
                    <thead>
                        <tr>
                            <th>Key(s)</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            this.keyboardShortcuts.forEach(shortcut => {
                tableHTML += `
                    <tr>
                        <td>${shortcut.keys.map(key => `<kbd>${key}</kbd>`).join(' / ')}</td>
                        <td>${shortcut.description}</td>
                    </tr>
                `;
            });
            tableHTML += `
                    </tbody>
                </table>
                <button id="close-shortcuts-dialog">Close</button>
            `;
            this.keyboardShortcutsDialogElement.innerHTML = tableHTML;
            document.body.appendChild(this.keyboardShortcutsDialogElement);

            $('#close-shortcuts-dialog', this.keyboardShortcutsDialogElement)?.addEventListener('click', () => {
                this._hideKeyboardShortcutsDialog();
            });
        }
        this.keyboardShortcutsDialogElement.style.display = 'block';
        this.space.emit('ui:keyboardshortcuts:shown');
    }

    _hideKeyboardShortcutsDialog = () => {
        if (this.keyboardShortcutsDialogElement) {
            this.keyboardShortcutsDialogElement.style.display = 'none';
            this.space.emit('ui:keyboardshortcuts:hidden');
        }
    }

    _applySavedTheme() {
        localStorage.getItem('spacegraph-theme') === 'light'
            ? document.body.classList.add('theme-light')
            : document.body.classList.remove('theme-light');
    }

    _setupToolbar() {
        if (!this.toolbarElement) return;
        this.toolbarElement.innerHTML = '';
        const buttons = [
            { id: 'tb-add-node', text: '➕', title: 'Add Default Node', action: 'addNode' },
            { id: 'tb-center-view', text: '🎯', title: 'Center View', action: 'centerView' },
            { id: 'tb-reset-view', text: '🔄', title: 'Reset View', action: 'resetView' },
            { id: 'tb-toggle-theme', text: '🎨', title: 'Toggle Light/Dark Theme', action: 'toggleTheme' },
        ];
        buttons.forEach((btnData) => {
            const button = document.createElement('button');
            button.id = btnData.id;
            button.textContent = btnData.text;
            button.title = btnData.title;
            button.addEventListener('click', () => this._handleToolbarAction(btnData.action));
            this.toolbarElement.appendChild(button);
        });
    }

    _handleToolbarAction(action) {
        switch (action) {
            case 'addNode': {
                const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
                const cam = camPlugin?.getCameraInstance();
                let nodePos = { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100, z: 0 };
                if (cam) {
                    const camPos = new THREE.Vector3();
                    const camDir = new THREE.Vector3();
                    cam.getWorldPosition(camPos);
                    cam.getWorldDirection(camDir);
                    const distanceInFront = 300;
                    const targetPos = camPos.add(camDir.multiplyScalar(distanceInFront));
                    nodePos = { x: targetPos.x, y: targetPos.y, z: 0 };
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
            case 'toggleTheme': {
                document.body.classList.toggle('theme-light');
                const currentTheme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
                localStorage.setItem('spacegraph-theme', currentTheme);
                this.space.emit('theme:changed', { theme: currentTheme });
                break;
            }
            default:
                console.warn('UIManager: Unknown toolbar action:', action);
        }
    }

    _bindEvents() {
        const passiveFalse = { passive: false };
        this.container.addEventListener('pointerdown', this._onPointerDown, passiveFalse);
        window.addEventListener('pointermove', this._onPointerMove, passiveFalse);
        window.addEventListener('pointerup', this._onPointerUp, passiveFalse);
        this.container.addEventListener('contextmenu', this._onContextMenu, passiveFalse);
        document.addEventListener('click', this._onDocumentClick, true);
        this.contextMenuElement.addEventListener('click', this._onContextMenuClick);
        $('#confirm-yes', this.confirmDialogElement)?.addEventListener('click', this._onConfirmYes);
        $('#confirm-no', this.confirmDialogElement)?.addEventListener('click', this._onConfirmNo);
        window.addEventListener('keydown', this._onKeyDown);
        this.container.addEventListener('wheel', this._onWheel, passiveFalse);
    }

    _subscribeToSpaceGraphEvents() {
        this.space.on('selection:changed', this._onSelectionChanged);
        this.space.on('linking:started', this._onLinkingStarted);
        this.space.on('linking:cancelled', this._onLinkingCancelled);
        this.space.on('linking:succeeded', this._onLinkingCompleted);
        this.space.on('linking:failed', this._onLinkingCompleted);
        this.space.on('camera:modeChanged', this._onCameraModeChanged);
    }

    _onCameraModeChanged = (data) => {
        this._updateHudCameraMode(data.newMode);
    };

    _updateHudCameraMode(mode) {
        if (this.hudModeIndicator?.tagName === 'SELECT') {
            const cameraMode = mode || this.space.plugins.getPlugin('CameraPlugin')?.getCameraMode() || 'orbit';
            this.hudModeIndicator.value = cameraMode;
        }
    }

    _updateHudSelectionInfo() {
        if (!this.hudSelectionInfo) return;

        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
        const selectedEdges = this._uiPluginCallbacks.getSelectedEdges();

        if (selectedNodes.size === 1) {
            const node = selectedNodes.values().next().value;
            this.hudSelectionInfo.textContent = `Selected: Node ${node.data.label || node.id.substring(0, 8)}`;
        } else if (selectedNodes.size > 1) {
            this.hudSelectionInfo.textContent = `Selected: ${selectedNodes.size} Nodes`;
        } else if (selectedEdges.size === 1) {
            const edge = selectedEdges.values().next().value;
            this.hudSelectionInfo.textContent = `Selected: Edge ${edge.id.substring(0, 8)}`;
        } else if (selectedEdges.size > 1) {
            this.hudSelectionInfo.textContent = `Selected: ${selectedEdges.size} Edges`;
        } else {
            this.hudSelectionInfo.textContent = 'Selected: None';
        }
    }

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

                // Calculate initial screen scale for resizing:
                const node = this.resizedNode;
                const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
                const cam = cameraPlugin?.getCameraInstance();

                if (node && cam && node.cssObject) {
                    const localOrigin = new THREE.Vector3(0, 0, 0);
                    const localOffsetX = new THREE.Vector3(1, 0, 0); // For width scaling
                    const localOffsetY = new THREE.Vector3(0, 1, 0); // For height scaling

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
                        x: screenOffsetYNDC.x * halfW + halfW,
                        y: -screenOffsetYNDC.y * halfH + halfH,
                    };

                    this.resizeNodeScreenScaleX = Math.abs(screenOffsetXPx.x - screenOriginPx.x);
                    this.resizeNodeScreenScaleY = Math.abs(screenOffsetYPx.y - screenOriginPx.y);

                    if (this.resizeNodeScreenScaleX < 0.001) this.resizeNodeScreenScaleX = 0.001;
                    if (this.resizeNodeScreenScaleY < 0.001) this.resizeNodeScreenScaleY = 0.001;
                } else {
                    // Fallback to direct scaling if camera or node info is missing
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
                this._hideContextMenu();
                return;
            }

            if (targetInfo.node) {
                e.preventDefault();
                if (targetInfo.contentEditable || targetInfo.interactiveElement) {
                    e.stopPropagation();
                    this._uiPluginCallbacks.setSelectedNode(targetInfo.node, e.shiftKey);
                    this._hideContextMenu();
                    return;
                }
                this._transitionToState(InteractionState.DRAGGING_NODE, { node: targetInfo.node });
                this._uiPluginCallbacks.setSelectedNode(targetInfo.node, e.shiftKey);
                this._hideContextMenu();
                return;
            }

            if (targetInfo.intersectedEdge) {
                e.preventDefault();
                this._uiPluginCallbacks.setSelectedEdge(targetInfo.intersectedEdge, e.shiftKey);
                this._hideContextMenu();
                return;
            }

            this._transitionToState(InteractionState.PANNING);
            this._hideContextMenu();
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
                                    sNodeTargetPos.z = sNode.position.z;
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

                    // Use MIN_SIZE from HtmlNode static property for consistency
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
                this._showConfirmDialog(`Delete node "${node.id.substring(0, 10)}..."?`, () =>
                    this.space.emit('ui:request:removeNode', node.id)
                );
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
                console.warn('Unknown node control action:', action);
        }
    }

    _onContextMenu = (e) => {
        e.preventDefault();
        this._updateNormalizedPointerState(e);
        this._hideContextMenu();

        const targetInfo = this._getTargetInfo(e);
        let menuItems = [];
        let contextTarget = null;

        if (targetInfo.node) {
            contextTarget = targetInfo.node;
            if (!e.shiftKey) {
                this._uiPluginCallbacks.setSelectedNode(contextTarget, false);
            }
            menuItems = this._getContextMenuItemsForNode(contextTarget);
        } else if (targetInfo.intersectedEdge) {
            contextTarget = targetInfo.intersectedEdge;
            if (!e.shiftKey) {
                this._uiPluginCallbacks.setSelectedEdge(contextTarget, false);
            }
            menuItems = this._getContextMenuItemsForEdge(contextTarget);
        } else {
            if (!e.shiftKey) {
                 this._uiPluginCallbacks.setSelectedNode(null, false);
            }
            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, 0);
            menuItems = this._getContextMenuItemsForBackground(worldPos);
        }

        if (menuItems.length > 0) {
            this._showContextMenu(e.clientX, e.clientY, menuItems);
        }
    };

    _onDocumentClick = (e) => {
        if (this.contextMenuElement.contains(e.target) || this.contextMenuElement.style.display === 'none') return;
        if (this.edgeMenuObject?.element?.contains(e.target)) return;
        if (this.confirmDialogElement.contains(e.target)) return;

        this._hideContextMenu();

        if (this.edgeMenuObject) {
            const targetInfo = this._getTargetInfo(e);
            const selectedEdges = this._uiPluginCallbacks.getSelectedEdges();
            const clickedSelectedEdge = targetInfo.intersectedEdge && selectedEdges?.has(targetInfo.intersectedEdge);

            if (!clickedSelectedEdge) {
                 this._uiPluginCallbacks.setSelectedEdge(null, false);
            }
        }
    };

    _onContextMenuClick = (e) => {
        const li = e.target.closest('li[data-action]');
        if (!li || li.classList.contains('disabled')) return;

        const { action, nodeId, edgeId, positionX, positionY, positionZ } = li.dataset;
        const worldPos = positionX ? { x: parseFloat(positionX), y: parseFloat(positionY), z: parseFloat(positionZ) } : null;

        this._hideContextMenu();

        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
        const edgePlugin = this.space.plugins.getPlugin('EdgePlugin');

        const targetNode = nodeId ? nodePlugin?.getNodeById(nodeId) : null;
        const targetEdge = edgeId ? edgePlugin?.getEdgeById(edgeId) : null;

        switch (action) {
            case 'edit-node-content':
                if (targetNode instanceof HtmlNode && targetNode.data.editable) {
                    targetNode.htmlElement?.querySelector('.node-content')?.focus();
                }
                break;
            case 'delete-node':
                if (targetNode) {
                    this._showConfirmDialog(`Delete node "${targetNode.id.substring(0, 10)}..."?`, () =>
                        this.space.emit('ui:request:removeNode', targetNode.id)
                    );
                }
                break;
            case 'start-linking-node':
                if (targetNode) {
                    this.space.emit('ui:request:startLinking', targetNode);
                }
                break;
            case 'autozoom-node':
                if (targetNode) {
                    this.space.emit('ui:request:autoZoomNode', targetNode);
                }
                break;
            case 'toggle-pin-node':
                if (targetNode) {
                    this.space.togglePinNode(targetNode.id);
                }
                break;

            case 'edit-edge-style':
                if (targetEdge) {
                    this._uiPluginCallbacks.setSelectedEdge(targetEdge, false);
                }
                break;
            case 'reverse-edge-direction':
                if (targetEdge) {
                    this.space.emit('ui:request:reverseEdge', targetEdge.id);
                }
                break;
            case 'delete-edge':
                if (targetEdge) {
                    this._showConfirmDialog(`Delete edge "${targetEdge.id.substring(0, 10)}..."?`, () =>
                        this.space.emit('ui:request:removeEdge', targetEdge.id)
                    );
                }
                break;

            case 'create-html-node':
                worldPos && this.space.emit('ui:request:createNode', { type: 'html', position: worldPos, data: { label: 'New Node', content: 'Edit me!' } });
                break;
            case 'create-note-node':
                 worldPos && this.space.emit('ui:request:createNode', { type: 'note', position: worldPos, data: { content: 'New Note ✨' } });
                break;
            case 'create-shape-node-box':
                 worldPos && this.space.emit('ui:request:createNode', { type: 'shape', position: worldPos, data: { label: 'Box Node 📦', shape: 'box', size: 60, color: Math.random() * 0xffffff } });
                break;
           case 'create-shape-node-sphere':
                 worldPos && this.space.emit('ui:request:createNode', { type: 'shape', position: worldPos, data: { label: 'Sphere Node 🌐', shape: 'sphere', size: 60, color: Math.random() * 0xffffff } });
                break;

            case 'center-camera-view':
                this.space.emit('ui:request:centerView');
                break;
            case 'reset-camera-view':
                this.space.emit('ui:request:resetView');
                break;
            case 'toggle-background-visibility': {
                const renderingPlugin = this.space.plugins.getPlugin('RenderingPlugin');
                if (renderingPlugin) {
                    const newAlpha = renderingPlugin.background.alpha === 0 ? 1.0 : 0;
                    const newColor = newAlpha === 0 ? 0x000000 : (document.body.classList.contains('theme-light') ? 0xf4f4f4 : 0x1a1a1d) ;
                    this.space.emit('ui:request:toggleBackground', newColor, newAlpha);
                }
                break;
            }
            default:
                console.warn('Unknown context menu action:', action);
        }
    };

    _onConfirmYes = () => {
        this.confirmCallback?.();
        this._hideConfirmDialog();
    };
    _onConfirmNo = () => this._hideConfirmDialog();

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
                    this._showConfirmDialog(message, () =>
                        selectedNodes.forEach(node => this.space.emit('ui:request:removeNode', node.id))
                    );
                    handled = true;
                } else if (primarySelectedEdge) {
                    const message = selectedEdges.size > 1
                        ? `Delete ${selectedEdges.size} selected edges?`
                        : `Delete edge "${primarySelectedEdge.id.substring(0, 10)}..."?`;
                    this._showConfirmDialog(message, () =>
                        selectedEdges.forEach(edge => this.space.emit('ui:request:removeEdge', edge.id))
                    );
                    handled = true;
                }
                break;

            case 'Escape':
                if (this._uiPluginCallbacks.getIsLinking()) {
                    this._uiPluginCallbacks.cancelLinking();
                    handled = true;
                } else if (this.layoutSettingsDialogElement?.style.display === 'block') {
                    this._hideLayoutSettingsDialog();
                    handled = true;
                } else if (this.keyboardShortcutsDialogElement?.style.display === 'block') {
                    this._hideKeyboardShortcutsDialog();
                    handled = true;
                } else if (this.contextMenuElement.style.display === 'block') {
                    this._hideContextMenu();
                    handled = true;
                } else if (this.confirmDialogElement.style.display === 'block') {
                    this._hideConfirmDialog();
                    handled = true;
                } else if (this.edgeMenuObject) {
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

    _getContextMenuItemsForNode(node) {
        const items = [];
        if (node instanceof HtmlNode && node.data.editable) {
            items.push({ label: '📝 Edit Content', action: 'edit-node-content', nodeId: node.id });
        }
        items.push({ label: '🔗 Start Link', action: 'start-linking-node', nodeId: node.id });
        items.push({ label: '🔎 Auto Zoom', action: 'autozoom-node', nodeId: node.id });

        // Corrected: Access isPinned directly from the node object
        const isPinned = node.isPinned || false;
        items.push({ label: isPinned ? '📌 Unpin' : '📌 Pin', action: 'toggle-pin-node', nodeId: node.id });

        items.push({ type: 'separator' });
        items.push({ label: '🗑️ Delete Node', action: 'delete-node', nodeId: node.id, isDestructive: true });
        return items;
    }

    _getContextMenuItemsForEdge(edge) {
        return [
            { label: '🎨 Edit Style', action: 'edit-edge-style', edgeId: edge.id },
            { label: '↔️ Reverse Direction', action: 'reverse-edge-direction', edgeId: edge.id },
            { type: 'separator' },
            { label: '🗑️ Delete Edge', action: 'delete-edge', edgeId: edge.id, isDestructive: true },
        ];
    }

    _getContextMenuItemsForBackground(worldPos) {
        const items = [];
        if (worldPos) {
            const posData = { positionX: worldPos.x, positionY: worldPos.y, positionZ: worldPos.z };
            items.push({ label: '📄 Add HTML Node', action: 'create-html-node', ...posData });
            items.push({ label: '📝 Add Note', action: 'create-note-node', ...posData });
            items.push({ label: '📦 Add Box', action: 'create-shape-node-box', ...posData });
            items.push({ label: '🌐 Add Sphere', action: 'create-shape-node-sphere', ...posData });
        }
        items.push({ type: 'separator' });
        items.push({ label: '🎯 Center View', action: 'center-camera-view' });
        items.push({ label: '🔄 Reset View', action: 'reset-camera-view' });

        const renderingPlugin = this.space.plugins.getPlugin('RenderingPlugin');
        if (renderingPlugin) {
            const isTransparent = renderingPlugin.background.alpha === 0;
            items.push({
                label: isTransparent ? '🖼️ Opaque BG' : '💨 Transparent BG',
                action: 'toggle-background-visibility',
            });
        }
        return items;
    }

    _showContextMenu(x, y, items) {
        const cm = this.contextMenuElement;
        cm.innerHTML = '';
        const ul = document.createElement('ul');

        items.forEach(itemData => {
            const li = document.createElement('li');
            if (itemData.type === 'separator') {
                li.className = 'separator';
            } else {
                li.textContent = itemData.label;
                Object.keys(itemData).forEach(key => {
                    if (key !== 'label' && key !== 'type' && key !== 'isDestructive' && itemData[key] !== undefined && itemData[key] !== null) {
                        li.dataset[key] = String(itemData[key]);
                    }
                });
                itemData.disabled && li.classList.add('disabled');
                itemData.isDestructive && li.classList.add('destructive');
            }
            ul.appendChild(li);
        });
        cm.appendChild(ul);

        const { offsetWidth: menuWidth, offsetHeight: menuHeight } = cm;
        const margin = 5;
        let finalX = x + margin;
        if (finalX + menuWidth > window.innerWidth - margin) {
            finalX = x - menuWidth - margin;
        }
        let finalY = y + margin;
        if (finalY + menuHeight > window.innerHeight - margin) {
            finalY = y - menuHeight - margin;
        }
        cm.style.left = `${Math.max(margin, finalX)}px`;
        cm.style.top = `${Math.max(margin, finalY)}px`;
        cm.style.display = 'block';

        this.space.emit('ui:contextmenu:shown', { x, y, items });
    }

    _hideContextMenu = () => {
        if (this.contextMenuElement.style.display === 'block') {
            this.contextMenuElement.style.display = 'none';
            this.contextMenuElement.innerHTML = '';
            this.space.emit('ui:contextmenu:hidden');
        }
    };

    _showConfirmDialog(message, onConfirm) {
        const messageEl = $('#confirm-message', this.confirmDialogElement);
        messageEl && (messageEl.textContent = message);
        this.confirmCallback = onConfirm;
        this.confirmDialogElement.style.display = 'block';
        this.space.emit('ui:confirmdialog:shown', { message });
    }

    _hideConfirmDialog = () => {
        if (this.confirmDialogElement.style.display === 'block') {
            this.confirmDialogElement.style.display = 'none';
            this.confirmCallback = null;
            this.space.emit('ui:confirmdialog:hidden');
        }
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

    showEdgeMenu(edge) {
        if (!edge) return;
        this.hideEdgeMenu();

        const menuElement = this._createEdgeMenuElement(edge);
        this.edgeMenuObject = new CSS3DObject(menuElement);
        this.space.plugins.getPlugin('RenderingPlugin')?.getCSS3DScene()?.add(this.edgeMenuObject);
        this.updateEdgeMenuPosition();
        this.space.emit('ui:edgemenu:shown', { edge });
    }

    _createEdgeMenuElement(edge) {
        const menu = document.createElement('div');
        menu.className = 'edge-menu-frame';
        menu.dataset.edgeId = edge.id;

        const edgeColorHex = `#${edge.data.color?.toString(16).padStart(6, '0') || 'ffffff'}`;

        menu.innerHTML = `
            <input type="color" value="${edgeColorHex}" title="Edge Color" data-property="color">
            <input type="range" min="0.5" max="10" step="0.1" value="${edge.data.thickness || 1}" title="Edge Thickness" data-property="thickness">
            <select title="Constraint Type" data-property="constraintType">
                ${['elastic', 'rigid', 'weld', 'none'].map(type =>
                    `<option value="${type}" ${edge.data.constraintType === type ? 'selected' : ''}>${type.charAt(0).toUpperCase() + type.slice(1)}</option>`
                ).join('')}
            </select>
            <button title="Delete Edge" class="delete-button" data-action="delete-edge">×</button>
        `;

        menu.addEventListener('input', (e) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
                const property = e.target.dataset.property;
                if (!property) return;

                let value = e.target.value;
                if (e.target.type === 'color') {
                    value = parseInt(value.substring(1), 16);
                } else if (e.target.type === 'range') {
                    value = parseFloat(value);
                }

                this.space.emit('ui:request:updateEdge', edge.id, property, value);
            }
        });

        menu.addEventListener('click', (e) => {
            if (e.target.closest('button[data-action="delete-edge"]')) {
                this._showConfirmDialog(`Delete edge "${edge.id.substring(0, 10)}..."?`, () =>
                    this.space.emit('ui:request:removeEdge', edge.id)
                );
            }
        });

        menu.addEventListener('pointerdown', (e) => e.stopPropagation());
        menu.addEventListener('wheel', (e) => e.stopPropagation());

        return menu;
    }

    hideEdgeMenu = () => {
        if (this.edgeMenuObject) {
            this.edgeMenuObject.element?.remove();
            this.edgeMenuObject.parent?.remove(this.edgeMenuObject);
            this.edgeMenuObject = null;
            this.space.emit('ui:edgemenu:hidden');
        }
    };

    updateEdgeMenuPosition = () => {
        if (!this.edgeMenuObject || !this.edgeMenuObject.element?.parentNode) return;

        const selectedEdges = this._uiPluginCallbacks.getSelectedEdges();
        if (selectedEdges.size !== 1) {
            this.hideEdgeMenu();
            return;
        }
        const edge = selectedEdges.values().next().value;

        const midPoint = new THREE.Vector3().lerpVectors(edge.source.position, edge.target.position, 0.5);
        this.edgeMenuObject.position.copy(midPoint);

        const camInstance = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        camInstance && this.edgeMenuObject.lookAt(camInstance.position);
        this.edgeMenuObject.element.style.transform = `scale(${1 / this.space.plugins.getPlugin('RenderingPlugin').getCSS3DRenderer().getSize().width * 100000})`;
    };

    _onSelectionChanged = (payload) => {
        // This event is emitted by UIPlugin, so UIManager just needs to react
        // and update its own display based on the new selection state.
        const selectedEdges = payload.selected.size > 0 && payload.type === 'edge' ? payload.selected : new Set();
        if (selectedEdges.size === 1) {
            const edge = selectedEdges.values().next().value;
            if (!this.edgeMenuObject || this.edgeMenuObject.element.dataset.edgeId !== edge.id) {
                this.showEdgeMenu(edge);
            } else {
                 this.updateEdgeMenuPosition();
            }
        } else {
            this.hideEdgeMenu();
        }
        this._updateHudSelectionInfo();
    };

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
        this.contextMenuElement.removeEventListener('click', this._onContextMenuClick);
        $('#confirm-yes', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmYes);
        $('#confirm-no', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmNo);
        window.removeEventListener('keydown', this._onKeyDown);
        this.container.removeEventListener('wheel', this._onWheel, passiveFalse);

        this.space.off('selection:changed', this._onSelectionChanged);
        this.space.off('linking:started', this._onLinkingStarted);
        this.space.off('linking:cancelled', this._onLinkingCancelled);
        this.space.off('linking:succeeded', this._onLinkingCompleted);
        this.space.off('linking:failed', this._onLinkingCompleted);
        this.space.off('camera:modeChanged', this._onCameraModeChanged);

        this._removeTempLinkLine();
        this.hideEdgeMenu();
        this._hideContextMenu();
        this._hideConfirmDialog();
        this._hideKeyboardShortcutsDialog();
        this.keyboardShortcutsDialogElement?.remove();
        this._hideLayoutSettingsDialog();
        this.layoutSettingsDialogElement?.remove();
        if(this.toolbarElement) this.toolbarElement.innerHTML = '';
        this.hudLayer?.remove();

        this.space = null;
        this.container = null;
        this.contextMenuElement = null;
        this.confirmDialogElement = null;
        this.toolbarElement = null;
        this.draggedNode = null;
        this.resizedNode = null;
        this.hoveredEdge = null;
        this.confirmCallback = null;
        this._uiPluginCallbacks = null;

        console.log('UIManager disposed.');
    }
}
