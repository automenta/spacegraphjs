import { $, $$ } from '../../utils.js';
import { KeyboardShortcutsDialog } from '../dialogs/KeyboardShortcutsDialog.js';
import { LayoutSettingsDialog } from '../dialogs/LayoutSettingsDialog.js';

/**
 * Manages Heads-Up Display (HUD) elements, including a main menu for settings and actions,
 * and selection information.
 */
export class HudManager {
    /**
     * Creates an instance of HudManager.
     * @param {SpaceGraph} space - The main SpaceGraph instance.
     * @param {HTMLElement} container - The main container element for the graph.
     * @param {object} uiPluginCallbacks - Callbacks provided by the UIPlugin.
     * @param {function} uiPluginCallbacks.getSelectedNodes - Function to get currently selected nodes.
     * @param {function} uiPluginCallbacks.getSelectedEdges - Function to get currently selected edges.
     */
    constructor(space, container, uiPluginCallbacks) {
        this.space = space;
        this.container = container;
        this._uiPluginCallbacks = uiPluginCallbacks;

        this.hudLayer = null;
        this.hudMainMenuButton = null;
        this.hudPopupMenu = null;
        this.hudModeIndicator = null;
        this.hudCameraModeDescription = null; // Clean up description element
        this.hudSelectionInfo = null;
        this.hudKeyboardShortcutsButton = null;
        this.hudLayoutSettingsButton = null;

        this.isPopupMenuVisible = false;

        this.keyboardShortcutsDialog = new KeyboardShortcutsDialog(space);
        this.layoutSettingsDialog = new LayoutSettingsDialog(space);

        this.performanceMetrics = {
            fps: 0,
            frameTime: 0,
            nodeCount: 0,
            edgeCount: 0,
            lastUpdateTime: performance.now()
        };
        this._performanceMonitoringRafId = null;

        this._createHudElements();
        this._bindEvents();
        this.updateHudSelectionInfo(); // Initial update
        this.updateHudCameraMode(); // Initial update, this will also update description
        this._startPerformanceMonitoring();
    }

    /**
     * Creates and appends all HUD elements to the DOM.
     * @private
     */
    _createHudElements() {
        this.hudLayer = $('#hud-layer');
        if (!this.hudLayer) {
            this.hudLayer = document.createElement('div');
            this.hudLayer.id = 'hud-layer';
            this.container.parentNode.appendChild(this.hudLayer);
        }

        // Main Menu Button
        this.hudMainMenuButton = document.createElement('div');
        this.hudMainMenuButton.id = 'hud-main-menu-button';
        this.hudMainMenuButton.textContent = '☰'; // Hamburger icon
        this.hudMainMenuButton.title = 'Open Menu';
        this.hudLayer.appendChild(this.hudMainMenuButton);

        // Popup Menu Container
        this.hudPopupMenu = document.createElement('div');
        this.hudPopupMenu.id = 'hud-popup-menu';
        this.hudPopupMenu.classList.add('hidden'); // Initially hidden

        // Camera Mode Indicator (Select)
        this.hudModeIndicator = document.createElement('select');
        this.hudModeIndicator.id = 'hud-mode-indicator';
        const cameraModes = this.space.plugins.getPlugin('CameraPlugin')?.getAvailableCameraModes() || {
            'orbit': 'Orbit Control',
            'free': 'Free Look'
        };
        for (const modeKey in cameraModes) {
            const option = document.createElement('option');
            option.value = modeKey;
            option.textContent = cameraModes[modeKey];
            this.hudModeIndicator.appendChild(option);
        }
        const cameraGroup = this._createMenuGroup('Camera Mode:', this.hudModeIndicator);
        this.hudPopupMenu.appendChild(cameraGroup);

        // Camera Mode Description Area
        this.hudCameraModeDescription = document.createElement('div');
        this.hudCameraModeDescription.id = 'hud-camera-mode-description';
        this.hudCameraModeDescription.className = 'hud-menu-item-description';
        this.hudPopupMenu.appendChild(this.hudCameraModeDescription);


        // Keyboard Shortcuts Button
        this.hudKeyboardShortcutsButton = document.createElement('button'); // Changed to button for better semantics
        this.hudKeyboardShortcutsButton.id = 'hud-keyboard-shortcuts-button';
        this.hudKeyboardShortcutsButton.innerHTML = '⌨️ <span class="label">Shortcuts</span>';
        this.hudKeyboardShortcutsButton.title = 'View Keyboard Shortcuts';
        const shortcutsGroup = this._createMenuGroup(null, this.hudKeyboardShortcutsButton);
        this.hudPopupMenu.appendChild(shortcutsGroup);

        // Layout Settings Button
        this.hudLayoutSettingsButton = document.createElement('button'); // Changed to button
        this.hudLayoutSettingsButton.id = 'hud-layout-settings-button';
        this.hudLayoutSettingsButton.innerHTML = '📐 <span class="label">Layout</span>';
        this.hudLayoutSettingsButton.title = 'Layout Settings';
        const layoutGroup = this._createMenuGroup(null, this.hudLayoutSettingsButton);
        this.hudPopupMenu.appendChild(layoutGroup);

        this.hudLayer.appendChild(this.hudPopupMenu);


        // Selection Info (remains directly in hudLayer)
        this.hudSelectionInfo = $('#hud-selection-info');
        if (!this.hudSelectionInfo) {
            this.hudSelectionInfo = document.createElement('div');
            this.hudSelectionInfo.id = 'hud-selection-info';
            this.hudLayer.appendChild(this.hudSelectionInfo);
        }
    }

    /**
     * Helper method to create a group container for a HUD menu item.
     * @param {string|null} labelText - Text for the label. If null, no label is created.
     * @param {HTMLElement} controlElement - The control element (e.g., select, button) for the group.
     * @returns {HTMLDivElement} The created group element.
     * @private
     */
    _createMenuGroup(label, controlElement) {
        const group = document.createElement('div');
        group.className = 'hud-menu-group';
        if (label) {
            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            if (controlElement.id) {
                labelEl.htmlFor = controlElement.id;
            }
            group.appendChild(labelEl);
        }
        group.appendChild(controlElement);
        return group;
    }

    /**
     * Toggles the visibility of the HUD popup menu.
     * Manages event listeners for closing the menu.
     * @param {Event} [event] - The click event that triggered the toggle.
     * @private
     */
    _togglePopupMenu = (event) => {
        event?.stopPropagation(); // Prevent click from immediately closing if it bubbles to document
        this.isPopupMenuVisible = !this.isPopupMenuVisible;
        if (this.isPopupMenuVisible) {
            this.hudPopupMenu.classList.remove('hidden');
            this.hudMainMenuButton.classList.add('active');
            // Add a one-time event listener to close the menu when clicking outside
            document.addEventListener('click', this._handleClickOutsideMenu, { capture: true, once: true });
            document.addEventListener('keydown', this._handleEscKey, { capture: true, once: true });
        } else {
            this.hudPopupMenu.classList.add('hidden');
            this.hudMainMenuButton.classList.remove('active');
            // Clean up listeners if any were missed or if closed by other means
            document.removeEventListener('click', this._handleClickOutsideMenu, { capture: true });
            document.removeEventListener('keydown', this._handleEscKey, { capture: true });
        }
    };

    _handleClickOutsideMenu = (event) => {
        if (!this.hudPopupMenu.contains(event.target) && event.target !== this.hudMainMenuButton) {
            if (this.isPopupMenuVisible) {
                this._togglePopupMenu(); // Close it
            }
        } else {
            // Click was inside or on the button, re-attach listener if menu still open
            if(this.isPopupMenuVisible) {
                 document.addEventListener('click', this._handleClickOutsideMenu, { capture: true, once: true });
            }
        }
        document.removeEventListener('keydown', this._handleEscKey, { capture: true });
    };

    /**
     * Handles the Escape key press to close the popup menu.
     * @param {KeyboardEvent} event - The keydown event.
     * @private
     */
    _handleEscKey = (event) => {
        if (event.key === 'Escape' && this.isPopupMenuVisible) {
            this._togglePopupMenu(); // Close it
        } else if (this.isPopupMenuVisible) {
            // Re-attach listener if menu still open and another key was pressed
            document.addEventListener('keydown', this._handleEscKey, { capture: true, once: true });
        }
         document.removeEventListener('click', this._handleClickOutsideMenu, { capture: true });
    };

    /**
     * Binds event listeners to HUD elements.
     * @private
     */
    _bindEvents() {
        this.hudMainMenuButton.addEventListener('click', this._togglePopupMenu);
        this.hudModeIndicator.addEventListener('change', this._onModeIndicatorChange);
        this.hudKeyboardShortcutsButton.addEventListener('click', this._onKeyboardShortcutsButtonClick);
        this.hudLayoutSettingsButton.addEventListener('click', this._onLayoutSettingsButtonClick);
    }

    _getCameraModeDescriptions() {
        // These descriptions can be expanded or fetched from elsewhere if needed
        return {
            orbit: "Orbit: Rotate around a central point. Pan, zoom.",
            free: "Free Look: Fly freely (WASD/Mouse). Requires pointer lock.",
            topDown: "Top Down: 2D-like top-down view. Pan and zoom height.",
            firstPerson: "First Person (Experimental): Simulates a first-person view. Uses Free Look controls.",
            // Add descriptions for other modes if they appear in the dropdown
        };
    }

    _updateCameraModeDescription(modeKey) {
        if (!this.hudCameraModeDescription) return;
        const descriptions = this._getCameraModeDescriptions();
        this.hudCameraModeDescription.textContent = descriptions[modeKey] || "Select a mode to see its description.";
        this.hudCameraModeDescription.style.padding = '5px 0'; // Basic styling
        this.hudCameraModeDescription.style.fontSize = '0.9em';
        this.hudCameraModeDescription.style.opacity = '0.8';
    }

    _onModeIndicatorChange = (event) => {
        const newMode = event.target.value;
        this.space.emit('ui:request:setCameraMode', newMode);
        this._updateCameraModeDescription(newMode);
        // Optionally close popup after selection
        // if (this.isPopupMenuVisible) this._togglePopupMenu();
    };

    /** @private */
    _onKeyboardShortcutsButtonClick = () => {
        this.keyboardShortcutsDialog.show();
        if (this.isPopupMenuVisible) this._togglePopupMenu(); // Close popup
    };

    /** @private */
    _onLayoutSettingsButtonClick = () => {
        this.layoutSettingsDialog.show();
        if (this.isPopupMenuVisible) this._togglePopupMenu(); // Close popup
    };

    /**
     * Updates the HUD camera mode selector with the current camera mode
     * and ensures the list of available modes is current.
     * @param {string} [mode] - The camera mode to set. Defaults to the current mode from CameraPlugin.
     */
    updateHudCameraMode(mode) {
        if (this.hudModeIndicator) { // Check if element exists
            const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
            const currentMode = mode || cameraPlugin?.getCameraMode();

            // Update options if they changed (e.g. new camera types registered)
            const availableModes = cameraPlugin?.getAvailableCameraModes();
            if (availableModes) {
                const existingOptions = Array.from(this.hudModeIndicator.options).map(opt => opt.value);
                const newModeKeys = Object.keys(availableModes);

                if (existingOptions.length !== newModeKeys.length || !newModeKeys.every(key => existingOptions.includes(key))) {
                    this.hudModeIndicator.innerHTML = ''; // Clear existing options
                    for (const modeKey in availableModes) {
                        const option = document.createElement('option');
                        option.value = modeKey;
                        option.textContent = availableModes[modeKey];
                        this.hudModeIndicator.appendChild(option);
                    }
                }
            }
            if (currentMode) {
                this.hudModeIndicator.value = currentMode;
                this._updateCameraModeDescription(currentMode); // Update description too
            } else {
                // If no current mode, maybe show a default or clear description
                this._updateCameraModeDescription('');
            }
        }
    }

    /**
     * Updates the HUD element that displays information about the current selection (nodes/edges).
     */
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

    /**
     * Checks if the keyboard shortcuts dialog is currently visible.
     * @returns {boolean} True if visible, false otherwise.
     */
    isKeyboardShortcutsDialogVisible() {
        return this.keyboardShortcutsDialog.keyboardShortcutsDialogElement?.style.display === 'block';
    }

    /**
     * Checks if the layout settings dialog is currently visible.
     * @returns {boolean} True if visible, false otherwise.
     */
    isLayoutSettingsDialogVisible() {
        return this.layoutSettingsDialog.layoutSettingsDialogElement?.style.display === 'block';
    }

    /**
     * Starts the performance monitoring loop.
     * @private
     */
    _startPerformanceMonitoring() {
        try {
            this.performanceMetrics.lastUpdateTime = performance.now();
            const monitor = () => {
                this.updatePerformanceMetrics();
                this._performanceMonitoringRafId = requestAnimationFrame(monitor);
            };
            this._performanceMonitoringRafId = requestAnimationFrame(monitor);
        } catch (error) {
            console.error("HudManager: Failed to start performance monitoring.", error);
            // Ensure performanceMetrics are reset to safe defaults if startup fails
            this.performanceMetrics = { fps: 'N/A', frameTime: 'N/A', nodeCount: 'N/A', edgeCount: 'N/A', lastUpdateTime: 0 };
        }
    }

    /**
     * Updates performance metrics like FPS and frame time.
     * Also attempts to update node and edge counts.
     * Includes error handling to prevent crashes.
     */
    updatePerformanceMetrics() {
        try {
            const now = performance.now();
            const deltaTime = now - (this.performanceMetrics.lastUpdateTime || now); // Ensure lastUpdateTime is valid
            this.performanceMetrics.lastUpdateTime = now;

            if (deltaTime > 0) {
                this.performanceMetrics.fps = 1000 / deltaTime;
                this.performanceMetrics.frameTime = deltaTime;
            } else {
                // Avoid division by zero or negative fps if deltaTime is 0 or negative
                this.performanceMetrics.fps = this.performanceMetrics.fps || 0; // Keep previous or 0
                this.performanceMetrics.frameTime = this.performanceMetrics.frameTime || 0;
            }

            // Attempt to get node and edge counts
            const nodePlugin = this.space?.plugins?.getPlugin('NodePlugin');
            this.performanceMetrics.nodeCount = nodePlugin && typeof nodePlugin.getNodes === 'function' ? nodePlugin.getNodes().size : (this.performanceMetrics.nodeCount || 0);

            const edgePlugin = this.space?.plugins?.getPlugin('EdgePlugin');
            this.performanceMetrics.edgeCount = edgePlugin && typeof edgePlugin.getEdges === 'function' ? edgePlugin.getEdges().size : (this.performanceMetrics.edgeCount || 0);

        } catch (error) {
            console.error("HudManager: Error updating performance metrics.", error);
            // Set to 'N/A' or keep previous values to indicate an issue without crashing
            this.performanceMetrics.fps = 'N/A';
            this.performanceMetrics.frameTime = 'N/A';
            // Optionally keep node/edge counts or set them to 'N/A' as well
            // this.performanceMetrics.nodeCount = 'N/A';
            // this.performanceMetrics.edgeCount = 'N/A';
        }
    }


    /**
     * Hides all managed dialogs and the HUD popup menu.
     */
    hideAllDialogs() {
        this.keyboardShortcutsDialog.hide();
        this.layoutSettingsDialog.hide();
        if (this.isPopupMenuVisible) {
            this._togglePopupMenu(); // Close popup menu as well
        }
    }

    /**
     * Cleans up all resources, removes elements, and detaches event listeners.
     */
    dispose() {
        if (this._performanceMonitoringRafId) {
            cancelAnimationFrame(this._performanceMonitoringRafId);
            this._performanceMonitoringRafId = null;
        }

        this.hudMainMenuButton?.removeEventListener('click', this._togglePopupMenu);
        this.hudModeIndicator?.removeEventListener('change', this._onModeIndicatorChange);
        this.hudKeyboardShortcutsButton?.removeEventListener('click', this._onKeyboardShortcutsButtonClick);
        this.hudLayoutSettingsButton?.removeEventListener('click', this._onLayoutSettingsButtonClick);

        document.removeEventListener('click', this._handleClickOutsideMenu, { capture: true });
        document.removeEventListener('keydown', this._handleEscKey, { capture: true });


        this.hudLayer?.remove();
        this.hudLayer = null;
        this.hudMainMenuButton = null;
        this.hudPopupMenu = null;
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
