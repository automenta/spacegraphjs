import { $, $$ } from '../../utils.js';
import { KeyboardShortcutsDialog } from '../dialogs/KeyboardShortcutsDialog.js';
import { LayoutSettingsDialog } from '../dialogs/LayoutSettingsDialog.js';

export class HudManager {
    constructor(space, container, uiPluginCallbacks) {
        this.space = space;
        this.container = container;
        this._uiPluginCallbacks = uiPluginCallbacks;

        this.hudLayer = null;
        this.hudModeIndicator = null;
        this.hudSelectionInfo = null;
        this.hudKeyboardShortcutsButton = null;
        this.hudLayoutSettingsButton = null;

        this.keyboardShortcutsDialog = new KeyboardShortcutsDialog(space);
        this.layoutSettingsDialog = new LayoutSettingsDialog(space);

        this._createHudElements();
        this._bindEvents();
        this.updateHudSelectionInfo(); // Initial update
        this.updateHudCameraMode(); // Initial update
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
            // Remove old div if it exists
            this.hudModeIndicator.remove();
            this.hudModeIndicator = null;
        }

        if (!this.hudModeIndicator) {
            this.hudModeIndicator = document.createElement('select');
            this.hudModeIndicator.id = 'hud-mode-indicator';

            const cameraModes = {
                orbit: 'Orbit Control',
                free: 'Free Look',
            };

            for (const modeKey in cameraModes) {
                const option = document.createElement('option');
                option.value = modeKey;
                option.textContent = cameraModes[modeKey];
                this.hudModeIndicator.appendChild(option);
            }
            this.hudLayer.appendChild(this.hudModeIndicator);
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
        }

        this.hudLayoutSettingsButton = $('#hud-layout-settings');
        if (!this.hudLayoutSettingsButton) {
            this.hudLayoutSettingsButton = document.createElement('div');
            this.hudLayoutSettingsButton.id = 'hud-layout-settings';
            this.hudLayoutSettingsButton.textContent = '📐';
            this.hudLayoutSettingsButton.title = 'Layout Settings';
            this.hudLayoutSettingsButton.style.cursor = 'pointer';
            this.hudLayer.appendChild(this.hudLayoutSettingsButton);
        }
    }

    _bindEvents() {
        this.hudModeIndicator.addEventListener('change', this._onModeIndicatorChange);
        this.hudKeyboardShortcutsButton.addEventListener('click', this._onKeyboardShortcutsButtonClick);
        this.hudLayoutSettingsButton.addEventListener('click', this._onLayoutSettingsButtonClick);
    }

    _onModeIndicatorChange = (event) => {
        const newMode = event.target.value;
        this.space.emit('ui:request:setCameraMode', newMode);
    };

    _onKeyboardShortcutsButtonClick = () => {
        this.keyboardShortcutsDialog.show();
    };

    _onLayoutSettingsButtonClick = () => {
        this.layoutSettingsDialog.show();
    };

    updateHudCameraMode(mode) {
        if (this.hudModeIndicator?.tagName === 'SELECT') {
            this.hudModeIndicator.value =
                mode || this.space.plugins.getPlugin('CameraPlugin')?.getCameraMode() || 'orbit';
        }
    }

    updateHudSelectionInfo() {
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

    isKeyboardShortcutsDialogVisible() {
        return this.keyboardShortcutsDialog.keyboardShortcutsDialogElement?.style.display === 'block';
    }

    isLayoutSettingsDialogVisible() {
        return this.layoutSettingsDialog.layoutSettingsDialogElement?.style.display === 'block';
    }

    hideAllDialogs() {
        this.keyboardShortcutsDialog.hide();
        this.layoutSettingsDialog.hide();
    }

    dispose() {
        this.hudModeIndicator?.removeEventListener('change', this._onModeIndicatorChange);
        this.hudKeyboardShortcutsButton?.removeEventListener('click', this._onKeyboardShortcutsButtonClick);
        this.hudLayoutSettingsButton?.removeEventListener('click', this._onLayoutSettingsButtonClick);

        this.hudLayer?.remove();
        this.hudLayer = null;
        this.hudModeIndicator = null;
        this.hudSelectionInfo = null;
        this.hudKeyboardShortcutsButton = null;
        this.hudLayoutSettingsButton = null;

        this.keyboardShortcutsDialog.dispose();
        this.layoutSettingsDialog.dispose();

        this.space = null;
        this.container = null;
        this._uiPluginCallbacks = null;
    }
}
