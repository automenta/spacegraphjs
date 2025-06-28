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

        const gizmoButtonsData = [
            {
                id: 'tb-gizmo-translate',
                text: '✥',
                title: 'Translate Gizmo (T)',
                action: 'setGizmoMode',
                mode: 'translate',
            },
            { id: 'tb-gizmo-rotate', text: '↷', title: 'Rotate Gizmo (R)', action: 'setGizmoMode', mode: 'rotate' },
            { id: 'tb-gizmo-scale', text: '↔', title: 'Scale Gizmo (S)', action: 'setGizmoMode', mode: 'scale' },
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

        const gizmoButtonGroup = document.createElement('div');
        gizmoButtonGroup.className = 'toolbar-button-group';
        gizmoButtonsData.forEach((btnData) => {
            const button = createButton(btnData, gizmoButtonGroup);
            if (btnData.mode) {
                this._gizmoModeButtons[btnData.mode] = button;
            }
        });
        this.toolbarElement.appendChild(gizmoButtonGroup);

        utilityButtons.forEach((btnData) => createButton(btnData));

        // UIManager will emit 'ui:gizmoModeViewUpdated' with the initial mode.
        // For now, let's assume 'translate' is the default and set it.
        this.updateActiveGizmoButton('translate');
    }

    _subscribeToSpaceEvents() {
        this.space.on('ui:gizmoModeViewUpdated', this._onGizmoModeViewUpdated);
    }

    _unsubscribeFromSpaceEvents() {
        this.space.off('ui:gizmoModeViewUpdated', this._onGizmoModeViewUpdated);
    }

    _onGizmoModeViewUpdated = (data) => {
        if (data && data.mode) {
            this.updateActiveGizmoButton(data.mode);
        }
    };

    updateActiveGizmoButton(activeMode) {
        for (const mode in this._gizmoModeButtons) {
            if (this._gizmoModeButtons[mode]) {
                // Check if button exists
                this._gizmoModeButtons[mode].classList.remove('active');
            }
        }
        if (this._gizmoModeButtons[activeMode]) {
            this._gizmoModeButtons[activeMode].classList.add('active');
        }
    }

    _handleToolbarAction(action, data = {}) {
        // data can carry mode for setGizmoMode
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
            case 'setGizmoMode':
                if (data.mode) {
                    this.space.emit('toolbar:gizmoModeChangeRequested', { mode: data.mode });
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
