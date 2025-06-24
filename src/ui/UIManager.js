import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { $, $$ } from '../utils.js';
import { HtmlNode } from '../graph/nodes/HtmlNode.js';
import { NoteNode } from '../graph/nodes/NoteNode.js';
import { ShapeNode } from '../graph/nodes/ShapeNode.js';

// Interaction states
const InteractionState = {
    IDLE: 'IDLE',
    PANNING: 'PANNING', // Camera panning
    DRAGGING_NODE: 'DRAGGING_NODE',
    RESIZING_NODE: 'RESIZING_NODE',
    LINKING_NODE: 'LINKING_NODE',
    // Add other states as needed, e.g., FREE_CAMERA_MOVE
};

export class UIManager {
    space = null;
    container = null;
    contextMenuElement = null;
    confirmDialogElement = null;
    toolbarElement = null;
    edgeMenuObject = null;

    // Interaction state
    currentState = InteractionState.IDLE;
    activePointerId = null; // For multi-touch, though primarily supporting single pointer for now

    // Dragging/Resizing specific state
    draggedNode = null; // The primary node being interacted with
    draggedNodeInitialZ = 0;
    dragOffset = new THREE.Vector3(); // Offset from node origin to pointer click point

    resizedNode = null;
    resizeStartPointerPos = { x: 0, y: 0 }; // Screen coords
    resizeStartNodeSize = { width: 0, height: 0 };

    // Hovering state
    hoveredEdge = null;

    // Pointer tracking
    pointerState = {
        down: false, // General pointer down state
        button: -1, // 0: primary, 1: middle, 2: secondary
        clientX: 0,
        clientY: 0,
        startClientX: 0,
        startClientY: 0,
        isDraggingThresholdMet: false, // To differentiate click from drag
        DRAG_THRESHOLD: 5, // Pixels
    };

    confirmCallback = null;
    tempLinkLine = null; // Visual for linking

    // HUD Elements
    hudLayer = null;
    hudModeIndicator = null;
    hudSelectionInfo = null;
    hudKeyboardShortcutsButton = null;
    keyboardShortcutsDialogElement = null;
    hudLayoutSettingsButton = null; // For layout settings
    layoutSettingsDialogElement = null; // Dialog for layout settings


    // Keyboard shortcuts definition
    keyboardShortcuts = [
        { keys: ['Delete', 'Backspace'], description: 'Delete selected node(s) or edge(s)' },
        { keys: ['Escape'], description: 'Close menus, cancel linking, deselect all, or exit pointer lock' },
        { keys: ['Enter'], description: 'Focus content of selected HTML node (if editable)' },
        { keys: ['+', '='], description: 'Zoom in content of selected HTML node' },
        { keys: ['Ctrl/Meta + +', 'Ctrl/Meta + ='], description: 'Increase size of selected HTML node' },
        { keys: ['-'], description: 'Zoom out content of selected HTML node' },
        { keys: ['Ctrl/Meta + -'], description: 'Decrease size of selected HTML node' },
        { keys: ['Spacebar'], description: 'Focus on selected item or center view' },
        // { keys: ['C'], description: 'Toggle Free Camera mode (Example - currently not active by default)' }, // Example for future
        { keys: ['Scroll Wheel'], description: 'Zoom camera' },
        { keys: ['Ctrl/Meta + Scroll Wheel'], description: 'Adjust content scale of hovered HTML node' },
        { keys: ['Middle Mouse Button (on node)'], description: 'Auto-zoom to node' },
        { keys: ['Alt + Drag Node (vertical)'], description: 'Adjust node Z-depth' },
    ];


    constructor(space, contextMenuEl, confirmDialogEl) {
        if (!space || !contextMenuEl || !confirmDialogEl)
            throw new Error('UIManager requires SpaceGraph instance and UI elements.');
        this.space = space;
        this.container = space.container;
        this.contextMenuElement = contextMenuEl;
        this.confirmDialogElement = confirmDialogEl;
        this.toolbarElement = $('#toolbar');

        this._createHudElements(); // Create HUD elements dynamically

        this._bindEvents();
        this._subscribeToSpaceGraphEvents();
        this._setupToolbar();
        this._applySavedTheme(); // Apply theme after elements are created
        this._updateHudSelectionInfo(); // Initial update
        this._updateHudCameraMode(); // Initial update
    }

    _createHudElements() {
        this.hudLayer = $('#hud-layer');
        if (!this.hudLayer) {
            this.hudLayer = document.createElement('div');
            this.hudLayer.id = 'hud-layer';
            this.container.parentNode.appendChild(this.hudLayer);
        }

        // Convert hudModeIndicator to a select element
        this.hudModeIndicator = $('#hud-mode-indicator');
        if (this.hudModeIndicator && this.hudModeIndicator.tagName === 'DIV') { // If old div exists, remove it
            this.hudModeIndicator.remove();
            this.hudModeIndicator = null;
        }

        if (!this.hudModeIndicator) {
            this.hudModeIndicator = document.createElement('select');
            this.hudModeIndicator.id = 'hud-mode-indicator';

            // Define camera modes for the dropdown
            // These should match CAMERA_MODES in Camera.js: { ORBIT: 'orbit', FREE: 'free' }
            const cameraModes = {
                'orbit': 'Orbit Control',
                'free': 'Free Look'
                // Add other modes here if they exist
            };

            for (const modeKey in cameraModes) {
                const option = document.createElement('option');
                option.value = modeKey;
                option.textContent = cameraModes[modeKey];
                this.hudModeIndicator.appendChild(option);
            }
            this.hudLayer.appendChild(this.hudModeIndicator);

            // Add event listener for when the selection changes
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

        // Create Keyboard Shortcuts Button
        this.hudKeyboardShortcutsButton = $('#hud-keyboard-shortcuts');
        if (!this.hudKeyboardShortcutsButton) {
            this.hudKeyboardShortcutsButton = document.createElement('div'); // Using div for styling consistency with other HUD items
            this.hudKeyboardShortcutsButton.id = 'hud-keyboard-shortcuts';
            this.hudKeyboardShortcutsButton.textContent = '⌨️'; // Keyboard emoji
            this.hudKeyboardShortcutsButton.title = 'View Keyboard Shortcuts';
            this.hudKeyboardShortcutsButton.style.cursor = 'pointer'; // Make it look clickable
            this.hudLayer.appendChild(this.hudKeyboardShortcutsButton);

            this.hudKeyboardShortcutsButton.addEventListener('click', () => {
                this._showKeyboardShortcutsDialog();
            });
        }

        // Create Layout Settings Button
        this.hudLayoutSettingsButton = $('#hud-layout-settings');
        if (!this.hudLayoutSettingsButton) {
            this.hudLayoutSettingsButton = document.createElement('div');
            this.hudLayoutSettingsButton.id = 'hud-layout-settings';
            this.hudLayoutSettingsButton.textContent = '📐'; // Ruler/Layout emoji
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
        if (!layoutPlugin || !layoutPlugin.layoutManager) {
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
                <!-- Layout-specific options will go here in the future -->
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
                // Optionally close dialog, or update current layout display if kept open
                // For now, let's assume applyLayout might take time, so we don't auto-close.
                // Update the displayed current layout name after a short delay or event
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
        if (!layoutPlugin || !layoutPlugin.layoutManager) return;

        const currentLayoutName = layoutPlugin.layoutManager.getActiveLayoutName();
        const selectElement = $('#layout-select', this.layoutSettingsDialogElement);
        if (selectElement) {
            selectElement.value = currentLayoutName;
        }
        // Future: update layout-specific options here
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
            this.keyboardShortcutsDialogElement.className = 'dialog'; // Reuse dialog styling
            // Prevent clicks inside dialog from propagating to graph or closing other things
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
        const savedTheme = localStorage.getItem('spacegraph-theme');
        if (savedTheme === 'light') {
            document.body.classList.add('theme-light');
        } else {
            document.body.classList.remove('theme-light');
        }
        // const themeButton = this.toolbarElement?.querySelector('#tb-toggle-theme');
        // if (themeButton) { /* update icon/text */ }
    }

    _setupToolbar() {
        if (!this.toolbarElement) return;
        this.toolbarElement.innerHTML = '';
        const buttons = [
            { id: 'tb-add-node', text: '➕', title: 'Add Default Node', action: 'addNode' }, // Node emoji was already there, just shortening text
            { id: 'tb-center-view', text: '🎯', title: 'Center View', action: 'centerView' }, // Center emoji was already there
            { id: 'tb-reset-view', text: '🔄', title: 'Reset View', action: 'resetView' },     // Reset emoji was already there
            { id: 'tb-toggle-theme', text: '🎨', title: 'Toggle Light/Dark Theme', action: 'toggleTheme' }, // Theme emoji was already there
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

    _handleToolbarAction(action, _buttonElement) {
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
                    const distanceInFront = 300; // Distance from camera to place the new node
                    const targetPos = camPos.add(camDir.multiplyScalar(distanceInFront));
                    nodePos = { x: targetPos.x, y: targetPos.y, z: 0 }; // Place on Z=0 plane initially
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
        window.addEventListener('pointermove', this._onPointerMove, passiveFalse); // Listen on window for drags outside container
        window.addEventListener('pointerup', this._onPointerUp, passiveFalse); // Listen on window
        this.container.addEventListener('contextmenu', this._onContextMenu, passiveFalse);
        document.addEventListener('click', this._onDocumentClick, true); // Capture phase for global click handling
        this.contextMenuElement.addEventListener('click', this._onContextMenuClick);
        $('#confirm-yes', this.confirmDialogElement)?.addEventListener('click', this._onConfirmYes);
        $('#confirm-no', this.confirmDialogElement)?.addEventListener('click', this._onConfirmNo);
        window.addEventListener('keydown', this._onKeyDown);
        this.container.addEventListener('wheel', this._onWheel, passiveFalse);
    }

    _subscribeToSpaceGraphEvents() {
        this.space.on('node:selected', this._onNodeSelectedOrDeselected); // Unified handler
        this.space.on('edge:selected', this._onEdgeSelectedOrDeselected); // Unified handler
        this.space.on('selection:changed', this._onSelectionChanged); // More generic event

        // Linking state changes from UIPlugin
        this.space.on('linking:started', this._onLinkingStarted);
        this.space.on('linking:cancelled', this._onLinkingCancelled);
        this.space.on('linking:succeeded', this._onLinkingCompleted);
        this.space.on('linking:failed', this._onLinkingCompleted);
        this.space.on('camera:modeChanged', this._onCameraModeChanged); // Listen for camera mode changes
    }

    _onCameraModeChanged = (data) => { // data = { newMode, oldMode }
        this._updateHudCameraMode(data.newMode);
    };

    _updateHudCameraMode(mode) {
        // Now that hudModeIndicator is a select element
        if (this.hudModeIndicator && this.hudModeIndicator.tagName === 'SELECT') {
            const cameraMode = mode || this.space.plugins.getPlugin('CameraPlugin')?.getCameraMode() || 'orbit';
            this.hudModeIndicator.value = cameraMode;
        } else if (this.hudModeIndicator) { // Fallback for old div if somehow still present
            const cameraMode = mode || this.space.plugins.getPlugin('CameraPlugin')?.getCameraMode() || 'orbit';
            const modeName = cameraMode.charAt(0).toUpperCase() + cameraMode.slice(1);
            this.hudModeIndicator.textContent = `Mode: ${modeName}`;
        }
    }

    _updateHudSelectionInfo() {
        if (this.hudSelectionInfo) {
            const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
            if (!uiPlugin) {
                this.hudSelectionInfo.textContent = 'Selected: N/A';
                return;
            }
            const selectedNodes = uiPlugin.getSelectedNodes();
            const selectedEdges = uiPlugin.getSelectedEdges();

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
    }


    // --- Centralized Event Normalization & State Update ---
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
                // On up, reset button, potentially other things if needed
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

    // --- Interaction State Machine ---
    _transitionToState(newState, data = {}) {
        if (this.currentState === newState) return;

        // Exit current state logic (if any)
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
                // Visual cleanup is handled by _onLinkingCancelled or _onLinkingCompleted
                this.container.style.cursor = 'grab';
                $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
                break;
        }

        this.currentState = newState;
        // console.log(`Entering state: ${this.currentState}`, data);

        // Enter new state logic
        switch (newState) {
            case InteractionState.DRAGGING_NODE:
                this.draggedNode = data.node;
                this.draggedNodeInitialZ = this.draggedNode.position.z;
                this.draggedNode.startDrag();

                // Calculate drag offset in world space
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
                this.resizeStartNodeSize = { ...this.resizedNode.size }; // current size
                this.resizeStartPointerPos = { x: this.pointerState.clientX, y: this.pointerState.clientY };
                this.container.style.cursor = 'nwse-resize';
                break;

            case InteractionState.PANNING:
                this.space.plugins
                    .getPlugin('CameraPlugin')
                    ?.startPan(this.pointerState.clientX, this.pointerState.clientY);
                this.container.style.cursor = 'grabbing'; // Or specific panning cursor
                break;
            case InteractionState.LINKING_NODE:
                // Actual linking state is managed by UIPlugin, UIManager just reacts visually
                this.container.style.cursor = 'crosshair';
                this._createTempLinkLine(data.sourceNode); // data.sourceNode comes from linking:started event
                break;
            case InteractionState.IDLE:
                this.container.style.cursor = 'grab'; // Default cursor
                break;
        }
        this.space.emit('interaction:stateChanged', { newState, oldState: this.currentState, data });
    }

    // --- Pointer Event Handlers ---
    _onPointerDown = (e) => {
        // TODO: Handle multi-touch if e.pointerId is different and activePointerId is set
        // For now, assume single pointer interaction or prioritize first.
        if (this.activePointerId !== null && this.activePointerId !== e.pointerId) return;
        this.activePointerId = e.pointerId;

        this._updateNormalizedPointerState(e, true);
        const targetInfo = this._getTargetInfo(e); // Use normalized state if needed

        // If in free camera mode and pointer is locked, primary clicks are for camera look, not graph interaction.
        const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
        if (cameraPlugin?.getCameraMode() === 'free' && cameraPlugin.getControls()?.isPointerLocked && this.pointerState.button === 0) {
            // Allow PointerLockControls to handle mouse movement for looking.
            // Other buttons (middle/right for autozoom/context menu) might still be processed if needed.
            // For now, if locked and primary button, assume it's for camera view control.
            // We might want to allow specific UI elements (like a HUD button) to still be clickable.
            // This would require checking if e.target is part of such UI.
            // e.preventDefault(); // Prevent any default browser actions if any were to occur.
            return;
        }

        // Secondary button (right-click) for context menu
        if (this.pointerState.button === 2) {
            // Context menu handled by _onContextMenu, which is a separate listener.
            // We might want to prevent default pan/drag from starting here.
            e.preventDefault(); // Prevent default browser context menu
            return; // Let _onContextMenu handle it
        }

        // Middle mouse button for auto-zoom
        if (this.pointerState.button === 1) {
            e.preventDefault(); // Prevent default browser scroll/pan
            if (targetInfo.node) {
                this.space.emit('ui:request:autoZoomNode', targetInfo.node);
            }
            return; // Middle click actions are usually terminal for this event
        }

        // Primary button (left-click/touch)
        if (this.pointerState.button === 0) {
            if (targetInfo.nodeControls) {
                // Click on a node's internal quick control button (delete, zoom content etc.)
                e.preventDefault();
                e.stopPropagation(); // Prevent this click from bubbling to node selection/drag
                this._handleNodeControlButtonClick(targetInfo.nodeControls, targetInfo.node);
                // Typically doesn't start a drag/pan state
                return;
            }

            if (targetInfo.resizeHandle && targetInfo.node instanceof HtmlNode) {
                e.preventDefault();
                e.stopPropagation();
                this._transitionToState(InteractionState.RESIZING_NODE, { node: targetInfo.node });
                this.space.emit('ui:request:setSelectedNode', targetInfo.node, false); // Select node being resized
                this._hideContextMenu();
                return;
            }

            if (targetInfo.node) {
                e.preventDefault();
                // If node is contentEditable or an interactive element inside, let it handle focus/input
                if (targetInfo.contentEditable || targetInfo.interactiveElement) {
                    e.stopPropagation(); // Prevent graph drag
                    this.space.emit('ui:request:setSelectedNode', targetInfo.node, e.shiftKey);
                    this._hideContextMenu();
                    // Do not transition to DRAGGING_NODE for these cases
                    return;
                }
                // Default action for node is to initiate potential drag
                this._transitionToState(InteractionState.DRAGGING_NODE, { node: targetInfo.node });
                this.space.emit('ui:request:setSelectedNode', targetInfo.node, e.shiftKey);
                this._hideContextMenu();
                return;
            }

            if (targetInfo.intersectedEdge) {
                e.preventDefault();
                this.space.emit('ui:request:setSelectedEdge', targetInfo.intersectedEdge, e.shiftKey);
                this._hideContextMenu();
                // Selecting an edge doesn't usually start a drag state by itself.
                return;
            }

            // If clicked on background (no node/edge/control)
            this._transitionToState(InteractionState.PANNING);
            this._hideContextMenu();
            // Do not deselect if shift is pressed (handled by UIPlugin's selection logic)
            if (!e.shiftKey) {
                 this.space.emit('ui:request:setSelectedNode', null, false); // Deselect all
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
                this._handleHover(e); // Update hover effects
                break;

            case InteractionState.DRAGGING_NODE:
                e.preventDefault();
                if (this.draggedNode) {
                    let targetZ = this.draggedNodeInitialZ;
                    if (e.altKey) { // Alt + drag to change Z
                        targetZ -= dy * 1.0; // Sensitivity for Z movement
                        this.draggedNodeInitialZ = targetZ;
                    }

                    const worldPos = this.space.screenToWorld(this.pointerState.clientX, this.pointerState.clientY, targetZ);
                    if (worldPos) {
                        const primaryNodeNewCalculatedPos = worldPos.clone().sub(this.dragOffset);
                        primaryNodeNewCalculatedPos.z = targetZ; // Ensure Z is maintained or updated

                        const dragDelta = primaryNodeNewCalculatedPos.clone().sub(this.draggedNode.position);
                        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
                        const selectedNodes = uiPlugin?.getSelectedNodes();

                        // Drag all selected nodes
                        if (selectedNodes && selectedNodes.size > 0 && selectedNodes.has(this.draggedNode)) {
                            selectedNodes.forEach((sNode) => {
                                if (sNode === this.draggedNode) {
                                    sNode.drag(primaryNodeNewCalculatedPos);
                                } else {
                                    // Apply delta to other selected nodes to move them together
                                    const sNodeTargetPos = sNode.position.clone().add(dragDelta);
                                    // Preserve individual Z for other nodes unless explicitly changing all
                                    sNodeTargetPos.z = sNode.position.z; // Or apply Z delta if that's desired
                                    sNode.drag(sNodeTargetPos);
                                }
                            });
                        } else { // Should not happen if selection is handled correctly on pointer down
                            this.draggedNode.drag(primaryNodeNewCalculatedPos);
                        }
                        this.space.emit('graph:node:dragged', {node: this.draggedNode, position: primaryNodeNewCalculatedPos});
                    }
                }
                break;

            case InteractionState.RESIZING_NODE:
                e.preventDefault();
                if (this.resizedNode) {
                    const totalDx = this.pointerState.clientX - this.resizeStartPointerPos.x;
                    const totalDy = this.pointerState.clientY - this.resizeStartPointerPos.y;
                    const newWidth = Math.max(50, this.resizeStartNodeSize.width + totalDx); // Min width
                    const newHeight = Math.max(30, this.resizeStartNodeSize.height + totalDy); // Min height
                    this.resizedNode.resize(newWidth, newHeight);
                    this.space.emit('graph:node:resized', {node: this.resizedNode, size: {newWidth, newHeight}});
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
                const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
                if (targetInfo.node && targetInfo.node !== uiPlugin?.getLinkSourceNode() && targetElement) {
                    targetElement.classList.add('linking-target');
                }
                break;
        }
    };

    _onPointerUp = (e) => {
        if (e.pointerId !== this.activePointerId) return;

        this._updateNormalizedPointerState(e, false);
        const currentInteractionState = this.currentState; // Capture before transitioning to IDLE

        // Handle click/tap action if drag threshold wasn't met
        if (!this.pointerState.isDraggingThresholdMet && e.button === 0) {
            // This is a click/tap. Selection is already handled on pointerdown.
            // Any specific click actions (not drag related) would go here.
            // For example, if a node was clicked, and it wasn't a drag, maybe open an editor or focus.
            const targetInfo = this._getTargetInfo(e);
            if (targetInfo.node && targetInfo.node instanceof HtmlNode && targetInfo.node.data.editable) {
                 if (targetInfo.element && targetInfo.element.closest('.node-content') === targetInfo.node.htmlElement.querySelector('.node-content')) {
                    // Click was inside content area, ensure focus.
                    // targetInfo.node.htmlElement?.querySelector('.node-content')?.focus();
                 }
            }
        }


        if (currentInteractionState === InteractionState.LINKING_NODE && e.button === 0) {
            // UIPlugin will handle the logic of completing the link via 'ui:request:completeLinking'
            this.space.emit('ui:request:completeLinking', this.pointerState.clientX, this.pointerState.clientY);
        }
        // Always transition to IDLE on pointer up, specific states clean themselves up.
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
            case 'grow': // Node size
                this.space.emit('ui:request:adjustNodeSize', node, 1.2);
                break;
            case 'shrink': // Node size
                this.space.emit('ui:request:adjustNodeSize', node, 1 / 1.2);
                break;
            default:
                console.warn('Unknown node control action:', action);
        }
    }


    _onContextMenu = (e) => {
        e.preventDefault();
        this._updateNormalizedPointerState(e); // Update with current coords for menu positioning
        this._hideContextMenu(); // Hide any existing menu

        const targetInfo = this._getTargetInfo(e);
        let menuItems = [];
        let contextTarget = null; // The actual graph item (node/edge) for the menu

        if (targetInfo.node) {
            contextTarget = targetInfo.node;
            // Ensure the right-clicked node becomes the primary selection if not multi-selecting
            if (!e.shiftKey) { // TODO: Check if shift key is part of context menu logic for multi-select actions
                this.space.emit('ui:request:setSelectedNode', contextTarget, false);
            }
            menuItems = this._getContextMenuItemsForNode(contextTarget);
        } else if (targetInfo.intersectedEdge) {
            contextTarget = targetInfo.intersectedEdge;
            if (!e.shiftKey) {
                this.space.emit('ui:request:setSelectedEdge', contextTarget, false);
            }
            menuItems = this._getContextMenuItemsForEdge(contextTarget);
        } else {
            // Clicked on background
            if (!e.shiftKey) { // Deselect if not holding shift (standard behavior)
                 this.space.emit('ui:request:setSelectedNode', null, false);
            }
            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, 0); // Get world position for context
            menuItems = this._getContextMenuItemsForBackground(worldPos);
        }

        if (menuItems.length > 0) {
            this._showContextMenu(e.clientX, e.clientY, menuItems, contextTarget);
        }
    };

    _onDocumentClick = (e) => {
        // This handler is in capture phase.
        // It's used to globally close menus if a click occurs outside of them.

        // Check if the click was on the context menu itself or initiated from within it.
        if (this.contextMenuElement.contains(e.target) || this.contextMenuElement.style.display === 'none') {
            // If click is inside menu, or menu is already hidden, do nothing here.
            // Menu item clicks are handled by _onContextMenuClick.
            return;
        }

        // Check if click was on edge menu
        if (this.edgeMenuObject?.element?.contains(e.target)) {
            return;
        }

        // Check if click was on confirm dialog
        if (this.confirmDialogElement.contains(e.target)) {
            return;
        }

        // If the click was outside, hide the context menu.
        this._hideContextMenu();

        // If edge menu is visible and click is outside of it, and not on the selected edge, hide it.
        if (this.edgeMenuObject) {
            const targetInfo = this._getTargetInfo(e);
            const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
            const selectedEdges = uiPlugin?.getSelectedEdges();
            let clickedSelectedEdge = false;
            if (targetInfo.intersectedEdge && selectedEdges) {
                clickedSelectedEdge = selectedEdges.has(targetInfo.intersectedEdge);
            }

            if (!clickedSelectedEdge) {
                 this.space.emit('ui:request:setSelectedEdge', null, false); // This will trigger hideEdgeMenu via _onEdgeSelectedOrDeselected
            }
        }
    };

    _onContextMenuClick = (e) => {
        const li = e.target.closest('li[data-action]');
        if (!li || li.classList.contains('disabled')) return;

        const { action, nodeId, edgeId, positionX, positionY, positionZ } = li.dataset;
        const worldPos = positionX ? { x: parseFloat(positionX), y: parseFloat(positionY), z: parseFloat(positionZ) } : null;

        this._hideContextMenu(); // Hide after action is determined

        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
        const edgePlugin = this.space.plugins.getPlugin('EdgePlugin');
        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');

        const targetNode = nodeId ? nodePlugin?.getNodeById(nodeId) : null;
        const targetEdge = edgeId ? edgePlugin?.getEdgeById(edgeId) : null;

        switch (action) {
            // Node Actions
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
                    this.space.togglePinNode(targetNode.id); // togglePinNode is on SpaceGraph, calls LayoutPlugin
                }
                break;

            // Edge Actions
            case 'edit-edge-style': // This implies showing the edge menu if not already visible
                if (targetEdge) {
                    this.space.emit('ui:request:setSelectedEdge', targetEdge, false); // Ensure it's selected to show menu
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

            // Background Actions
            case 'create-html-node':
                if (worldPos) this.space.emit('ui:request:createNode', { type: 'html', position: worldPos, data: { label: 'New Node', content: 'Edit me!' } });
                break;
            case 'create-note-node':
                 if (worldPos) this.space.emit('ui:request:createNode', { type: 'note', position: worldPos, data: { content: 'New Note ✨' } });
                break;
            case 'create-shape-node-box':
                 if (worldPos) this.space.emit('ui:request:createNode', { type: 'shape', position: worldPos, data: { label: 'Box Node 📦', shape: 'box', size: 60, color: Math.random() * 0xffffff } });
                break;
           case 'create-shape-node-sphere':
                 if (worldPos) this.space.emit('ui:request:createNode', { type: 'shape', position: worldPos, data: { label: 'Sphere Node 🌐', shape: 'sphere', size: 60, color: Math.random() * 0xffffff } });
                break;

            // Global View Actions
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
        // Allow text editing inputs to capture keys unless it's Escape
        const activeEl = document.activeElement;
        const isEditingText = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
        if (isEditingText && e.key !== 'Escape') return;

        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
        if (!uiPlugin) return;

        const selectedNodes = uiPlugin.getSelectedNodes();
        const selectedEdges = uiPlugin.getSelectedEdges();
        const primarySelectedNode = selectedNodes.size > 0 ? selectedNodes.values().next().value : null;
        const primarySelectedEdge = selectedEdges.size > 0 ? selectedEdges.values().next().value : null;

        let handled = false; // Flag to call e.preventDefault()

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
                if (uiPlugin.getIsLinking()) { // Check linking state via UIPlugin
                    this.space.emit('ui:request:cancelLinking'); // UIPlugin handles actual cancellation
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
                } else if (this.edgeMenuObject) { // If edge edit menu is open
                    this.space.emit('ui:request:setSelectedEdge', null, false); // Deselect to hide
                    handled = true;
                } else if (selectedNodes.size > 0 || selectedEdges.size > 0) {
                    this.space.emit('ui:request:setSelectedNode', null, false); // Deselect all
                    handled = true;
                }
                // If in free camera mode, Escape might unlock pointer (handled by Camera.js)
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

            // Node content/size adjustments (Ctrl/Meta for node size, no modifier for content scale)
            case '+':
            case '=': // NumpadPlus or Equal
                if (primarySelectedNode instanceof HtmlNode) {
                    const factor = e.key === '+' || e.key === '=' ? 1.15 : 1.2; // Slightly different factors
                    if (e.ctrlKey || e.metaKey) {
                        this.space.emit('ui:request:adjustNodeSize', primarySelectedNode, factor);
                    } else {
                        this.space.emit('ui:request:adjustContentScale', primarySelectedNode, factor);
                    }
                    handled = true;
                }
                break;
            case '-':
            case '_': // NumpadSubtract or Minus
                 if (primarySelectedNode instanceof HtmlNode) {
                    const factor = e.key === '-' || e.key === '_' ? 1 / 1.15 : 1 / 1.2;
                    if (e.ctrlKey || e.metaKey) {
                        this.space.emit('ui:request:adjustNodeSize', primarySelectedNode, factor);
                    } else {
                        this.space.emit('ui:request:adjustContentScale', primarySelectedNode, factor);
                    }
                    handled = true;
                }
                break;

            case ' ': // Spacebar
                if (primarySelectedNode) {
                    this.space.emit('ui:request:focusOnNode', primarySelectedNode, 0.5, true); // Focus with history
                    handled = true;
                } else if (primarySelectedEdge) {
                    // Focus on edge midpoint
                    const midPoint = new THREE.Vector3().lerpVectors(primarySelectedEdge.source.position, primarySelectedEdge.target.position, 0.5);
                    const dist = primarySelectedEdge.source.position.distanceTo(primarySelectedEdge.target.position);
                    const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
                    camPlugin?.pushState(); // Save current view
                    camPlugin?.moveTo(midPoint.x, midPoint.y, midPoint.z + dist * 0.6 + 100, 0.5, midPoint);
                    handled = true;
                } else {
                    // If nothing selected, center view on graph or default
                    this.space.emit('ui:request:centerView');
                    handled = true;
                }
                break;
            // Add more keyboard shortcuts here, e.g., for camera modes, tool activation
            // case 'c': // Example: toggle free camera mode
            //     const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
            //     if (camPlugin) {
            //         const currentMode = camPlugin.getCameraMode();
            //         camPlugin.setCameraMode(currentMode === 'orbit' ? 'free' : 'orbit');
            //         if (camPlugin.getCameraMode() === 'free') camPlugin.requestPointerLock();
            //         handled = true;
            //     }
            //     break;
        }

        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    _onWheel = (e) => {
        const targetInfo = this._getTargetInfo(e);

        // Prevent zoom if wheeling over an interactive element inside a node (e.g. scrollable content)
        // or a UI element like edge menu with its own scroll/range inputs.
        if (targetInfo.element) {
            if (targetInfo.element.closest('.node-content') && targetInfo.element.scrollHeight > targetInfo.element.clientHeight) {
                // If the wheeled element is scrollable content within a node, let the browser handle scrolling.
                return;
            }
            if (targetInfo.element.closest('.edge-menu-frame input[type="range"]')) {
                // If wheeling over a range input in edge menu, let it handle.
                return;
            }
        }
        // Ctrl/Meta + Wheel to adjust content scale of a hovered HTML node
        if ((e.ctrlKey || e.metaKey) && targetInfo.node instanceof HtmlNode) {
            e.preventDefault();
            e.stopPropagation();
            const scaleFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            this.space.emit('ui:request:adjustContentScale', targetInfo.node, scaleFactor);
        } else {
            // Default wheel action: Zoom camera
            e.preventDefault();
            this.space.emit('ui:request:zoomCamera', e.deltaY);
        }
    };

    _getTargetInfo(event) {
        // Use document.elementFromPoint for initial check, then raycast if needed.
        const element = document.elementFromPoint(event.clientX, event.clientY);

        const nodeElement = element?.closest('.node-common'); // HTML nodes
        const resizeHandle = element?.closest('.resize-handle');
        const nodeControlsButton = element?.closest('.node-controls button'); // Quick controls on node
        const contentEditableEl = element?.closest('[contenteditable="true"]');
        const interactiveEl = element?.closest('button, input, textarea, select, a, .clickable'); // General interactive elements

        let graphNode = null; // This will hold the BaseNode instance
        if (nodeElement) {
            graphNode = this.space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeElement.dataset.nodeId);
        }

        let intersectedEdge = null;
        let intersectedObjectResult = null; // Store full raycast result if done

        // Raycast if:
        // 1. No specific HTML element like resize handle or control button was hit.
        // 2. The hit element isn't an interactive part of an HTML node (like its content area).
        // 3. We need to check for 3D objects (ShapeNodes, Edges) that don't have direct HTML counterparts at pointer.
        const needsRaycast = !resizeHandle && !nodeControlsButton && !contentEditableEl && !interactiveEl;

        if (needsRaycast) {
            intersectedObjectResult = this.space.intersectedObjects(event.clientX, event.clientY);
            if (intersectedObjectResult) {
                if (intersectedObjectResult.node && !graphNode) { // If raycast found a node and we didn't get one from HTML
                    graphNode = intersectedObjectResult.node;
                }
                if (intersectedObjectResult.edge) {
                    intersectedEdge = intersectedObjectResult.edge;
                }
            }
        }

        return {
            element: element, // The direct HTML element under pointer
            nodeElement: nodeElement, // The .node-common HTML element, if any
            resizeHandle: resizeHandle,
            nodeControls: nodeControlsButton, // Renamed from nodeControls to be more specific
            contentEditable: contentEditableEl,
            interactiveElement: interactiveEl,
            node: graphNode, // The BaseNode instance (from HTML or raycast)
            intersectedEdge: intersectedEdge, // The Edge instance (from raycast)
            intersectedObjectResult: intersectedObjectResult, // Full raycast data if performed
        };
    }

    _handleHover(e) {
        // Do not process hover if any pointer button is down or in a non-idle state
        if (this.pointerState.down || this.currentState !== InteractionState.IDLE) {
            if (this.hoveredEdge) { // Clear previous hover if interaction starts
                const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
                if (!uiPlugin?.getSelectedEdges().has(this.hoveredEdge)) {
                    this.hoveredEdge.setHighlight(false);
                }
                this.hoveredEdge = null;
            }
            return;
        }

        const targetInfo = this._getTargetInfo(e); // Use the same comprehensive target info
        let newHoveredEdge = targetInfo.intersectedEdge;

        // Update visual feedback for edges
        if (this.hoveredEdge !== newHoveredEdge) {
            const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
            const selectedEdges = uiPlugin?.getSelectedEdges();

            if (this.hoveredEdge && !selectedEdges?.has(this.hoveredEdge)) {
                this.hoveredEdge.setHighlight(false); // Remove highlight from previously hovered
            }
            this.hoveredEdge = newHoveredEdge;
            if (this.hoveredEdge && !selectedEdges?.has(this.hoveredEdge)) {
                this.hoveredEdge.setHighlight(true); // Add highlight to newly hovered
            }
        }
        // TODO: Add hover feedback for nodes if desired (e.g., slight border change)
        // This would require comparing targetInfo.node with a this.hoveredNode property.
    }


    _getContextMenuItemsForNode(node) {
        const items = [];
        if (node instanceof HtmlNode && node.data.editable) {
            items.push({ label: '📝 Edit Content', action: 'edit-node-content', nodeId: node.id });
        }
        items.push({ label: '🔗 Start Link', action: 'start-linking-node', nodeId: node.id }); // Changed emoji for "Start Link"
        items.push({ label: '🔎 Auto Zoom', action: 'autozoom-node', nodeId: node.id }); // Changed "Auto Zoom / Back" and emoji

        const layoutPlugin = this.space.plugins.getPlugin('LayoutPlugin');
        const isPinned = layoutPlugin?.isNodePinned(node.id) || false;
        items.push({ label: isPinned ? '📌 Unpin' : '📌 Pin', action: 'toggle-pin-node', nodeId: node.id }); // Shortened Pin/Unpin

        items.push({ type: 'separator' });
        items.push({ label: '🗑️ Delete Node', action: 'delete-node', nodeId: node.id, isDestructive: true });
        return items;
    }

    _getContextMenuItemsForEdge(edge) {
        return [
            { label: '🎨 Edit Style', action: 'edit-edge-style', edgeId: edge.id }, // Changed "Edit Style..."
            { label: '↔️ Reverse Direction', action: 'reverse-edge-direction', edgeId: edge.id },
            { type: 'separator' },
            { label: '🗑️ Delete Edge', action: 'delete-edge', edgeId: edge.id, isDestructive: true },
        ];
    }

    _getContextMenuItemsForBackground(worldPos) {
        const items = [];
        if (worldPos) {
            const posData = { positionX: worldPos.x, positionY: worldPos.y, positionZ: worldPos.z };
            items.push({ label: '📄 Add HTML Node', action: 'create-html-node', ...posData }); // Changed "Create HTML Node"
            items.push({ label: '📝 Add Note', action: 'create-note-node', ...posData });       // Changed "Create Note Here"
            items.push({ label: '📦 Add Box', action: 'create-shape-node-box', ...posData });        // Changed "Create Box Here"
            items.push({ label: '🌐 Add Sphere', action: 'create-shape-node-sphere', ...posData });  // Changed "Create Sphere Here"
        }
        items.push({ type: 'separator' });
        items.push({ label: '🎯 Center View', action: 'center-camera-view' }); // Changed emoji for Center View
        items.push({ label: '🔄 Reset View', action: 'reset-camera-view' }); // Changed "Reset Zoom & Pan" and emoji

        const renderingPlugin = this.space.plugins.getPlugin('RenderingPlugin');
        if (renderingPlugin) {
            const isTransparent = renderingPlugin.background.alpha === 0;
            items.push({
                label: isTransparent ? '🖼️ Opaque BG' : '💨 Transparent BG', // Added emojis for background toggle
                action: 'toggle-background-visibility',
            });
        }
        return items;
    }

    _showContextMenu(x, y, items, _targetContext = null) { // targetContext can be node/edge for future use
        const cm = this.contextMenuElement;
        cm.innerHTML = ''; // Clear previous items
        const ul = document.createElement('ul');

        items.forEach(itemData => {
            const li = document.createElement('li');
            if (itemData.type === 'separator') {
                li.className = 'separator';
            } else {
                li.textContent = itemData.label;
                // Store all relevant data attributes for the action
                Object.keys(itemData).forEach(key => {
                    if (key !== 'label' && key !== 'type' && key !== 'isDestructive' && itemData[key] !== undefined && itemData[key] !== null) {
                        li.dataset[key] = String(itemData[key]);
                    }
                });
                if (itemData.disabled) { // Check for explicit disabled flag
                    li.classList.add('disabled');
                }
                if (itemData.isDestructive) {
                    li.classList.add('destructive');
                }
            }
            ul.appendChild(li);
        });
        cm.appendChild(ul);

        // Position the menu, ensuring it stays within viewport
        const { offsetWidth: menuWidth, offsetHeight: menuHeight } = cm;
        const margin = 5; // Small margin from window edges
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
            this.contextMenuElement.innerHTML = ''; // Clear items
            this.space.emit('ui:contextmenu:hidden');
        }
    };

    _showConfirmDialog(message, onConfirm) {
        const messageEl = $('#confirm-message', this.confirmDialogElement);
        if (messageEl) messageEl.textContent = message;
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

    // --- Visuals for Linking ---
    _createTempLinkLine(sourceNode) {
        this._removeTempLinkLine(); // Ensure any old one is gone
        const material = new THREE.LineDashedMaterial({
            color: 0xffaa00, // Bright orange, good visibility
            linewidth: 2,
            dashSize: 8,
            gapSize: 4,
            transparent: true,
            opacity: 0.9,
            depthTest: false, // Render on top
        });
        // Start and end points are initially the same (sourceNode.position)
        const points = [sourceNode.position.clone(), sourceNode.position.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.tempLinkLine = new THREE.Line(geometry, material);
        this.tempLinkLine.computeLineDistances(); // Required for dashed lines
        this.tempLinkLine.renderOrder = 1; // Ensure it's drawn over other things if needed

        this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.add(this.tempLinkLine);
    }

    _updateTempLinkLine(screenX, screenY) {
        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
        if (!this.tempLinkLine || !uiPlugin?.getIsLinking() || !uiPlugin?.getLinkSourceNode()) return;

        const sourceNode = uiPlugin.getLinkSourceNode();
        // Project pointer to the Z-plane of the source node for a flat linking experience
        const targetPos = this.space.screenToWorld(screenX, screenY, sourceNode.position.z);

        if (targetPos) {
            const positions = this.tempLinkLine.geometry.attributes.position;
            positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z); // Update the second point
            positions.needsUpdate = true;
            this.tempLinkLine.geometry.computeBoundingSphere(); // Important for raycasting if line itself was interactive
            this.tempLinkLine.computeLineDistances(); // Update for dashed appearance
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

    // --- Edge Menu ---
    showEdgeMenu(edge) {
        if (!edge) return;
        this.hideEdgeMenu(); // Hide any existing one

        const menuElement = this._createEdgeMenuElement(edge);
        this.edgeMenuObject = new CSS3DObject(menuElement); // Create CSS3D object for positioning in 3D space
        this.space.plugins.getPlugin('RenderingPlugin')?.getCSS3DScene()?.add(this.edgeMenuObject);
        this.updateEdgeMenuPosition(); // Position it correctly
        this.space.emit('ui:edgemenu:shown', { edge });
    }

    _createEdgeMenuElement(edge) {
        const menu = document.createElement('div');
        menu.className = 'edge-menu-frame'; // Use this class for styling
        menu.dataset.edgeId = edge.id;

        // Sanitize color for input: ensure it's hex and starts with #
        let edgeColorHex = `#${edge.data.color?.toString(16).padStart(6, '0') || 'ffffff'}`;


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

        // Event listeners for live updates
        menu.addEventListener('input', (e) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
                const property = e.target.dataset.property;
                if (!property) return;

                let value = e.target.value;
                if (e.target.type === 'color') {
                    value = parseInt(value.substring(1), 16); // Convert hex string to number
                } else if (e.target.type === 'range') {
                    value = parseFloat(value);
                }
                // For select, value is already string.

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

        // Prevent pointer events on the menu from propagating to the graph (e.g., starting a pan)
        menu.addEventListener('pointerdown', (e) => e.stopPropagation());
        menu.addEventListener('wheel', (e) => e.stopPropagation()); // Allow scrolling range inputs etc.

        return menu;
    }

    hideEdgeMenu = () => {
        if (this.edgeMenuObject) {
            this.edgeMenuObject.element?.remove(); // Remove HTML element from DOM
            this.edgeMenuObject.parent?.remove(this.edgeMenuObject); // Remove 3D object from scene
            this.edgeMenuObject = null;
            this.space.emit('ui:edgemenu:hidden');
        }
    };

    updateEdgeMenuPosition = () => {
        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
        if (!this.edgeMenuObject || !this.edgeMenuObject.element?.parentNode || !uiPlugin) return;

        const selectedEdges = uiPlugin.getSelectedEdges();
        if (selectedEdges.size !== 1) {
            this.hideEdgeMenu();
            return;
        }
        const edge = selectedEdges.values().next().value; // Get the single selected edge

        // Position menu at the midpoint of the edge
        const midPoint = new THREE.Vector3().lerpVectors(edge.source.position, edge.target.position, 0.5);
        this.edgeMenuObject.position.copy(midPoint);

        // Orient menu to face the camera (optional, can make it hard to read if camera moves fast)
        const camInstance = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        if (camInstance) {
            // this.edgeMenuObject.quaternion.copy(camInstance.quaternion); // Simple billboard
            // Or, more advanced: lookAt camera but keep upright
             this.edgeMenuObject.lookAt(camInstance.position);
        }
        this.edgeMenuObject.element.style.transform = `scale(${1 / this.space.plugins.getPlugin('RenderingPlugin').getCSS3DRenderer().getSize().width * 100000})`; // Adjust scale
    };


    // --- Event Handlers for SpaceGraph Events ---
    _onSelectionChanged = (payload) => {
        // payload = { selected: [{item, type}, ...], deselected: [{item, type}, ...] }
        // This is a more generic handler. Specific _onNodeSelected/_onEdgeSelected might still be useful
        // for reacting to the primary selected item if UIManager needs that distinction.

        // Example: if a single edge is selected, show edge menu. Otherwise, hide.
        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
        if (uiPlugin) {
            const selectedEdges = uiPlugin.getSelectedEdges();
            if (selectedEdges.size === 1) {
                const edge = selectedEdges.values().next().value;
                // Ensure menu is shown for the currently selected edge, or if it's different
                if (!this.edgeMenuObject || this.edgeMenuObject.element.dataset.edgeId !== edge.id) {
                    this.showEdgeMenu(edge);
                } else {
                     this.updateEdgeMenuPosition(); // Already visible, just update position
                }
            } else {
                this.hideEdgeMenu();
            }
        }
        this._updateHudSelectionInfo(); // Update HUD on any selection change
    };

    // Specific handlers for node/edge selection if needed beyond _onSelectionChanged
    _onNodeSelectedOrDeselected = (targetNode) => {
        // Called when a node is the primary subject of a selection/deselection action.
        // `targetNode` can be null if selection is cleared.
        // UIManager might use this to update some specific UI related to a single "active" node.
    };

    _onEdgeSelectedOrDeselected = (targetEdge) => {
        // Similar to _onNodeSelectedOrDeselected, but for edges.
        // This is where the logic to show/hide the edge menu is now primarily driven by _onSelectionChanged,
        // but this hook remains if direct reaction to a primary edge interaction is needed.
        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
        if (uiPlugin) {
            const selectedEdges = uiPlugin.getSelectedEdges();
            if (targetEdge && selectedEdges.has(targetEdge) && selectedEdges.size === 1) {
                 if (!this.edgeMenuObject || this.edgeMenuObject.element.dataset.edgeId !== targetEdge.id) {
                    this.showEdgeMenu(targetEdge);
                }
            } else if (!targetEdge || !selectedEdges.has(targetEdge)) {
                // If the targetEdge was deselected, or selection cleared, hide menu only if it was for this edge or no edge.
                if (this.edgeMenuObject && (!targetEdge || this.edgeMenuObject.element.dataset.edgeId === targetEdge?.id)) {
                     this.hideEdgeMenu();
                } else if (selectedEdges.size !== 1) { // general hide if not single selection
                    this.hideEdgeMenu();
                }
            }
        }
    };


    // Linking Process Event Handlers (called by UIPlugin state changes)
    _onLinkingStarted = (data) => { // data = { sourceNode }
        this._transitionToState(InteractionState.LINKING_NODE, { sourceNode: data.sourceNode });
    };

    _onLinkingCancelled = (_data) => { // data = { sourceNode }
        this._removeTempLinkLine();
        if (this.currentState === InteractionState.LINKING_NODE) {
            this._transitionToState(InteractionState.IDLE);
        }
    };

    _onLinkingCompleted = (_data) => { // data = { source, target } or { source } if failed
        this._removeTempLinkLine();
        if (this.currentState === InteractionState.LINKING_NODE) {
            this._transitionToState(InteractionState.IDLE);
        }
    };


    dispose() {
        // Remove all event listeners
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

        // Unsubscribe from SpaceGraph events
        this.space.off('node:selected', this._onNodeSelectedOrDeselected);
        this.space.off('edge:selected', this._onEdgeSelectedOrDeselected);
        this.space.off('selection:changed', this._onSelectionChanged);
        this.space.off('linking:started', this._onLinkingStarted);
        this.space.off('linking:cancelled', this._onLinkingCancelled);
        this.space.off('linking:succeeded', this._onLinkingCompleted);
        this.space.off('linking:failed', this._onLinkingCompleted);
        this.space.off('camera:modeChanged', this._onCameraModeChanged);


        // Clean up UI elements created by UIManager
        this._removeTempLinkLine();
        this.hideEdgeMenu();
        this._hideContextMenu();
        this._hideConfirmDialog();
        this._hideKeyboardShortcutsDialog();
        this.keyboardShortcutsDialogElement?.remove();
        this._hideLayoutSettingsDialog(); // Ensure it's hidden
        this.layoutSettingsDialogElement?.remove(); // Remove from DOM
        if(this.toolbarElement) this.toolbarElement.innerHTML = '';
        this.hudLayer?.remove();


        // Nullify references
        this.space = null;
        this.container = null;
        this.contextMenuElement = null;
        this.confirmDialogElement = null;
        this.toolbarElement = null;
        this.draggedNode = null;
        this.resizedNode = null;
        this.hoveredEdge = null;
        this.confirmCallback = null;

        console.log('UIManager disposed.');
    }
}
