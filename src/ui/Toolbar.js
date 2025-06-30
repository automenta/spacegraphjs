import * as THREE from 'three'; // Keep THREE if other actions use it.

export class Toolbar {
    constructor(space, toolbarElement) {
        this.space = space;
        this.toolbarElement = toolbarElement;
        this._gizmoModeButtons = {}; // To store references for easy active state update
        this._setupToolbar();
        this._subscribeToSpaceEvents();
    }

    _setupToolbar() {
        if (!this.toolbarElement) return;
        this.toolbarElement.innerHTML = '';
        this._gizmoModeButtons = {};

        const mainButtons = [{ id: 'tb-add-node', text: '➕', title: 'Add Default Node (N)', action: 'addNode' }];

        // Translate and Scale are now default interactions. Only Rotate remains as an explicit tool.
        const toolButtonsData = [
            { id: 'tb-tool-rotate', text: '↷', title: 'Rotate Tool (R)', action: 'setToolMode', mode: 'rotate' },
            // Future tools could be added here
        ];

        const utilityButtons = [
            { id: 'tb-center-view', text: '🎯', title: 'Center View (Space)', action: 'centerView' },
            { id: 'tb-reset-view', text: '🔄', title: 'Reset View', action: 'resetView' },
            { id: 'tb-toggle-theme', text: '🎨', title: 'Toggle Theme', action: 'toggleTheme' },
        ];

        const createButton = (btnData, group = this.toolbarElement) => {
            const button = document.createElement('button');
            button.id = btnData.id;
            button.innerHTML = btnData.text; // Use innerHTML for icons if they are HTML entities
            button.title = btnData.title;
            button.addEventListener('click', () => this._handleToolbarAction(btnData.action, btnData));
            group.appendChild(button);
            return button;
        };

        mainButtons.forEach((btnData) => createButton(btnData));

        if (toolButtonsData.length > 0) {
            const toolButtonGroup = document.createElement('div');
            toolButtonGroup.className = 'toolbar-button-group';
            toolButtonsData.forEach((btnData) => {
                const button = createButton(btnData, toolButtonGroup);
                if (btnData.mode) {
                    // Should always be true for tool buttons
                    this._gizmoModeButtons[btnData.mode] = button; // Reusing _gizmoModeButtons for general tool modes
                }
            });
            this.toolbarElement.appendChild(toolButtonGroup);
        }

        utilityButtons.forEach((btnData) => createButton(btnData));

        // UIManager will emit 'ui:activeToolViewUpdated' with the initial mode (likely null or default).
        this.updateActiveToolButton(null); // No tool active by default
    }

    _subscribeToSpaceEvents() {
        this.space.on('ui:activeToolViewUpdated', this._onActiveToolViewUpdated);
    }

    _unsubscribeFromSpaceEvents() {
        this.space.off('ui:activeToolViewUpdated', this._onActiveToolViewUpdated);
    }

    _onActiveToolViewUpdated = (data) => {
        // data might be null if no tool is active, or { mode: 'rotate' }
        this.updateActiveToolButton(data ? data.mode : null);
    };

    updateActiveToolButton(activeMode) {
        // Renamed from updateActiveGizmoButton
        for (const mode in this._gizmoModeButtons) {
            // Still using _gizmoModeButtons map
            if (this._gizmoModeButtons[mode]) {
                this._gizmoModeButtons[mode].classList.remove('active');
            }
        }
        if (activeMode && this._gizmoModeButtons[activeMode]) {
            this._gizmoModeButtons[activeMode].classList.add('active');
        }
    }

    _handleToolbarAction(action, data = {}) {
        // data can carry mode for setToolMode
        switch (action) {
            case 'addNode': {
                const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
                const cam = camPlugin?.getCameraInstance();
                let nodePos = {
                    x: Math.random() * 200 - 100,
                    y: Math.random() * 200 - 100,
                    z: Math.random() * 50 - 25,
                };
                if (cam) {
                    const camPos = new THREE.Vector3();
                    const camDir = new THREE.Vector3();
                    cam.getWorldPosition(camPos);
                    cam.getWorldDirection(camDir);
                    const distanceInFront = 300 + Math.random() * 100 - 50; // Add some variation
                    const targetPos = camPos.add(camDir.multiplyScalar(distanceInFront));
                    nodePos = { x: targetPos.x, y: targetPos.y, z: targetPos.z };
                }
                this.space.emit('ui:request:createNode', {
                    type: 'html', // Or a random type, or cycle through types
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
            case 'setToolMode': // Renamed from setGizmoMode
                if (data.mode) {
                    // If the clicked tool is already active, request to deactivate it (set mode to null)
                    // Otherwise, request to activate the new tool mode.
                    // UIManager will handle the actual state of activeGizmoMode.
                    this.space.emit('toolbar:toolModeChangeRequested', { mode: data.mode });
                }
                break;
            default:
            // console.warn('Toolbar: Unknown action:', action);
        }
    }

    dispose() {
        this._unsubscribeFromSpaceEvents();
        if (this.toolbarElement) {
            this.toolbarElement.innerHTML = '';
            // Any buttons with event listeners are wiped.
            this.toolbarElement = null;
        }
        this._gizmoModeButtons = null;
        this.space = null;
    }
}
