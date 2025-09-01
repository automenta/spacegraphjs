// src/ui/hud/AdvancedHudManager.js
import {HudOverlayPanel} from './HudOverlayPanel.js';
import {KeyboardShortcutsDialog} from '../dialogs/KeyboardShortcutsDialog.js';
import {LayoutSettingsDialog} from '../dialogs/LayoutSettingsDialog.js';
import {MenuBar} from './MenuBar.js';
import {PinnedWindow} from './PinnedWindow.js';
import {$} from '../../utils.js'; // Added for DOM querying

// Default settings for the Advanced HUD
const DEFAULT_ADVANCED_HUD_SETTINGS = {
    showPerformanceMetrics: true,
    showMinimap: true, // Retain minimap for now, can be a pinned section later
    showNotifications: true,
    showProgressIndicators: true,
    showCrosshair: false, // Crosshair might be a specific tool/mode feature
    hudOpacity: 0.9,
    showStatusBar: true, // Traditional status bar at the bottom
    showMenuBar: true,   // New menu bar at the top
};

export class AdvancedHudManager {
    space = null;
    container = null;
    _uiPluginCallbacks = null;

    hudLayer = null;
    hudMainMenuButton = null;
    hudPopupMenu = null;
    hudModeIndicator = null;
    hudCameraModeDescription = null;
    hudSelectionInfo = null;
    hudKeyboardShortcutsButton = null;
    hudLayoutSettingsButton = null;

    isPopupMenuVisible = false;

    keyboardShortcutsDialog = null;
    layoutSettingsDialog = null;

    performanceMetrics = {
        fps: 0,
        frameTime: 0,
        nodeCount: 0,
        edgeCount: 0,
        lastUpdateTime: performance.now()
    };
    _performanceMonitoringRafId = null;

    constructor(space, container, uiPluginCallbacks) {
        this.space = space;
        this.container = container;
        this._uiPluginCallbacks = uiPluginCallbacks;

        this.settings = {...DEFAULT_ADVANCED_HUD_SETTINGS};

        this.notifications = [];
        this.progressIndicators = new Map();

        this.menuBar = null;
        this.pinnedWindows = new Map();

        this._createHudElements();
        this._setupMenuBar();
        this._createAdvancedHudElements();

        this.keyboardShortcutsDialog = new KeyboardShortcutsDialog(this.space);
        this.layoutSettingsDialog = new LayoutSettingsDialog(this.space);

        this._bindEvents();
        this.updateHudSelectionInfo();
        this.updateHudCameraMode();
        this._startPerformanceMonitoring();
        this._subscribeToAdvancedEvents();

        this.applyHudSettings(this.settings);
        this._populateDefaultMenus();
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
        const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
        const cameraModes = cameraPlugin?.getAvailableCameraModes() || {
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

    _setupMenuBar() {
        if (!this.settings.showMenuBar) return;
        this.menuBar = new MenuBar(this); // Pass `this` (AdvancedHudManager instance)
        // The MenuBar constructor should append its container to this.hudLayer or a specific region
        // If MenuBar doesn't auto-append, append it here:
        this.hudLayer.insertBefore(this.menuBar.container, this.hudLayer.firstChild); // Prepend if no top region
    }

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
            document.addEventListener('click', this._handleClickOutsideMenu, {capture: true, once: true});
            document.addEventListener('keydown', this._handleEscKey, {capture: true, once: true});
        } else {
            this.hudPopupMenu.classList.add('hidden');
            this.hudMainMenuButton.classList.remove('active');
            // Clean up listeners if any were missed or if closed by other means
            document.removeEventListener('click', this._handleClickOutsideMenu, {capture: true});
            document.removeEventListener('keydown', this._handleEscKey, {capture: true});
        }
    };

    _handleClickOutsideMenu = (event) => {
        if (!this.hudPopupMenu.contains(event.target) && event.target !== this.hudMainMenuButton) {
            if (this.isPopupMenuVisible) {
                this._togglePopupMenu(); // Close it
            }
        } else {
            // Click was inside or on the button, re-attach listener if menu still open
            if (this.isPopupMenuVisible) {
                document.addEventListener('click', this._handleClickOutsideMenu, {capture: true, once: true});
            }
        }
        document.removeEventListener('keydown', this._handleEscKey, {capture: true});
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
            document.addEventListener('keydown', this._handleEscKey, {capture: true, once: true});
        }
        document.removeEventListener('click', this._handleClickOutsideMenu, {capture: true});
    };

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
            console.error("AdvancedHudManager: Failed to start performance monitoring.", error);
            // Ensure performanceMetrics are reset to safe defaults if startup fails
            this.performanceMetrics = {
                fps: 'N/A',
                frameTime: 'N/A',
                nodeCount: 'N/A',
                edgeCount: 'N/A',
                lastUpdateTime: 0
            };
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
            console.error("AdvancedHudManager: Error updating performance metrics.", error);
            // Set to 'N/A' or keep previous values to indicate an issue without crashing
            this.performanceMetrics.fps = 'N/A';
            this.performanceMetrics.frameTime = 'N/A';
            // Optionally keep node/edge counts or set them to 'N/A' as well
            // this.performanceMetrics.nodeCount = 'N/A';
            // this.performanceMetrics.edgeCount = 'N/A';
        }
    }

    // Override or adapt _createAdvancedHudElements from parent
        _createAdvancedHudElements() {
        // If base class creates regions, we might not need to recreate them
        // super._createAdvancedHudElements(); // Call if base class sets up common regions

        // Ensure regions exist if not created by base
        this.hudRegionTop = document.createElement('div');
        this.hudRegionTop.className = 'hud-region hud-region-top';
        this.hudLayer.appendChild(this.hudRegionTop);
        // ... other regions as needed ...

        // Performance Panel (can be a pinned window later, or a simple div for now)
        this.performancePanel = document.createElement('div');
        this.performancePanel.id = 'advanced-performance-panel'; // New ID to avoid conflict
        this.performancePanel.className = 'hud-panel'; // General styling
        this.hudLayer.appendChild(this.performancePanel); // Example: directly on hudLayer
        try {
            this.updatePerformanceMetrics(); // Initial call to populate metrics
        } catch (error) {
            console.error("AdvancedHudManager: Error during initial call to updatePerformanceMetrics", error);
            // Performance metrics will be updated by the animation loop in HudManager,
            // or display 'N/A' if errors persist.
        }


        // Minimap Panel (can be a pinned window later)
        this.minimapPanel = document.createElement('div');
        this.minimapPanel.id = 'advanced-minimap-panel';
        this.minimapPanel.className = 'hud-panel';
        this.minimapPanel.innerHTML = '<p>Minimap Area</p>'; // Placeholder
        this.hudLayer.appendChild(this.minimapPanel);

        // Notification Container (usually top-center or bottom)
        this.notificationContainer = this.notificationContainer || this._createNotificationContainer();
        if (!this.notificationContainer.parentNode) { // If base didn't add it or we want to move it
            this.hudLayer.appendChild(this.notificationContainer);
        }


        // Progress Container
        this.progressContainer = this.progressContainer || this._createProgressContainer();
        if (!this.progressContainer.parentNode) {
            this.hudLayer.appendChild(this.progressContainer);
        }


        // Status Bar (Traditional bottom bar)
        this.statusBar = document.createElement('div');
        this.statusBar.id = 'advanced-status-bar';
        this.statusBar.className = 'status-bar'; // CSS will style this
        this.hudLayer.appendChild(this.statusBar);
        // Populate status bar sections
        this.statusSelection = document.createElement('span');
        this.statusBar.appendChild(this.statusSelection);
        this.statusCamera = document.createElement('span');
        this.statusBar.appendChild(this.statusCamera);
        this.statusNodeCount = document.createElement('span');
        this.statusBar.appendChild(this.statusNodeCount);
        this.statusLayout = document.createElement('span');
        this.statusBar.appendChild(this.statusLayout); // Added for layout status

        this._updateAllStatusDisplays();
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

    _setupMenuBar() {
        if (!this.settings.showMenuBar) return;
        this.menuBar = new MenuBar(this); // Pass `this` (AdvancedHudManager instance)
        // The MenuBar constructor should append its container to this.hudLayer or a specific region
        // If MenuBar doesn't auto-append, append it here:
        this.hudLayer.insertBefore(this.menuBar.container, this.hudLayer.firstChild); // Prepend if no top region
    }

    _updateAllStatusDisplays() {
        this._updateSelectionStatus();
        this._updateCameraStatus();
        this._updateNodeCountStatus();
        this._updateLayoutStatus(); // Initial call
    }

    _updateSelectionStatus() {
        if (!this.settings.showStatusBar || !this.statusSelection) return;
        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes ? this._uiPluginCallbacks.getSelectedNodes() : new Set();
        const selectedEdges = this._uiPluginCallbacks.getSelectedEdges ? this._uiPluginCallbacks.getSelectedEdges() : new Set();
        let text = 'Selection: None';
        if (selectedNodes.size === 1) text = `Node: ${selectedNodes.values().next().value.id.substring(0, 8)}`;
        else if (selectedNodes.size > 1) text = `${selectedNodes.size} Nodes`;
        else if (selectedEdges.size === 1) text = `Edge: ${selectedEdges.values().next().value.id.substring(0, 8)}`;
        else if (selectedEdges.size > 1) text = `${selectedEdges.size} Edges`;
        this.statusSelection.textContent = text;
    }

    _updateCameraStatus() {
        if (!this.settings.showStatusBar || !this.statusCamera) return;
        const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
        const mode = camPlugin?.getCameraMode ? camPlugin.getCameraMode() : 'N/A';
        this.statusCamera.textContent = `Cam: ${mode}`;
    }

    _updateNodeCountStatus() {
        if (!this.settings.showStatusBar || !this.statusNodeCount) return;
        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
        const count = nodePlugin && typeof nodePlugin.getNodes === 'function' ? nodePlugin.getNodes().size : 0;
        this.statusNodeCount.textContent = `Nodes: ${count}`;
    }

    _updateLayoutStatus(eventData) {
        if (!this.settings.showStatusBar || !this.statusLayout) return;
        if (eventData && eventData.type) { // Check if eventData and type exist
            const layoutName = eventData.name || "Unnamed Layout";
            if (eventData.type === "started") {
                this.statusLayout.textContent = `Layout: ${layoutName} (Running)`;
            } else if (eventData.type === "stopped") {
                this.statusLayout.textContent = `Layout: ${layoutName} (Stopped)`;
            } else if (eventData.type === "adapted") {
                this.statusLayout.textContent = `Layout: ${layoutName} (Adapted)`;
            } else {
                this.statusLayout.textContent = `Layout: ${layoutName} (${eventData.type})`;
            }
        } else {
            // Initial call or no event data, clear or set default
            const layoutPlugin = this.space.plugins.getPlugin('LayoutPlugin');
            const currentLayout = layoutPlugin?.getCurrentLayout ? layoutPlugin.getCurrentLayout() : null;
            if (currentLayout && currentLayout.isRunning()) {
                this.statusLayout.textContent = `Layout: ${currentLayout.name || 'Active'} (Running)`;
            } else if (currentLayout) {
                this.statusLayout.textContent = `Layout: ${currentLayout.name || 'Active'} (Stopped)`;
            } else {
                this.statusLayout.textContent = "Layout: Idle";
            }
        }
    }

    _updateMinimap() {
        if (!this.settings.showMinimap || !this.minimapPanel) return;
        // console.log("AdvancedHudManager: _updateMinimap called. Minimap drawing logic would go here.");
        // For now, just indicate it's active or needs update
        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
        const nodeCount = nodePlugin && typeof nodePlugin.getNodes === 'function' ? nodePlugin.getNodes().size : 0;
        this.minimapPanel.innerHTML = `<p>Minimap Active (${nodeCount} nodes)</p><p style='font-size:0.8em; opacity:0.7;'>(Actual drawing not implemented in this fix)</p>`;
    }

    _updateGraphStatus() {
        this._updateNodeCountStatus(); // Update node count in status bar
        if (this.minimapPanel && this.settings.showMinimap) {
            this._updateMinimap();
        }
    }

    _subscribeToAdvancedEvents() {
        if (!this.space) return;

        // Camera events
        this.space.on('camera:moved', () => this._updateCameraStatus());
        this.space.on('camera:modeChanged', (eventData) => this._updateCameraStatus()); // mode might be in eventData.newMode

        // Layout events (example event names, verify with SpaceGraph actual events)
        this.space.on('layout:started', (eventData) => this._updateLayoutStatus(eventData));
        this.space.on('layout:stopped', (eventData) => this._updateLayoutStatus(eventData));
        this.space.on('layout:adapted', (eventData) => this._updateLayoutStatus(eventData)); // If layout emits adaptation events

        // Selection events
        this.space.on('selection:changed', () => this._updateSelectionStatus());

        // Graph structure events (for minimap, node counts, etc.)
        this.space.on('node:added', () => this._updateGraphStatus());
        this.space.on('node:removed', () => this._updateGraphStatus());
        this.space.on('edge:added', () => this._updateGraphStatus());
        this.space.on('edge:removed', () => this._updateGraphStatus());

        // Other potential advanced events can be added here
        // e.g., this.space.on('tool:activated', (eventData) => this._updateToolStatus(eventData));
    }

    _populateDefaultMenus() {
        if (!this.menuBar) return;

        const fileMenu = this.menuBar.addMenu('file', 'File');
        fileMenu.addMenuItem('exportGraph', 'Export Graph...', () => this._exportGraph(), {hotkey: 'Ctrl+E'});
        fileMenu.addMenuItem('importGraph', 'Import Graph...', () => {
            this.showNotification('Import not implemented yet.');
        });
        fileMenu.addSeparator();
        fileMenu.addMenuItem('takeScreenshot', 'Take Screenshot', () => this._takeScreenshot());
        fileMenu.addSeparator();
        fileMenu.addMenuItem('toggleFullscreen', 'Toggle Fullscreen', () => this._toggleFullscreen(), {hotkey: 'F11'});

        const viewMenu = this.menuBar.addMenu('view', 'View');
        const appearanceSection = viewMenu.addSection('appearance', 'Appearance Options', true);
        appearanceSection.addMenuItem('toggleGrid', 'Grid', (checked) => this._toggleGrid(), {
            type: 'checkbox', checked: false, updateHandler: (item) => {
                const RPlugin = this.space.plugins.getPlugin('RenderingPlugin');
                if (RPlugin) item.setChecked(RPlugin.isGridVisible()); // Sync with actual state
            }
        });
        appearanceSection.addMenuItem('toggleAxes', 'Axes', (checked) => this._toggleAxes(), {
            type: 'checkbox', checked: false, updateHandler: (item) => {
                const RPlugin = this.space.plugins.getPlugin('RenderingPlugin');
                if (RPlugin) item.setChecked(RPlugin.areAxesVisible());
            }
        });
        // ... other view items like labels, shadows

        const hudSection = viewMenu.addSection('hudElements', 'HUD Elements', true);
        hudSection.addMenuItem('togglePerformance', 'Performance Metrics', (checked) => {
            this.applyHudSettings({showPerformanceMetrics: checked});
        }, {type: 'checkbox', checked: this.settings.showPerformanceMetrics});
        hudSection.addMenuItem('toggleMinimap', 'Minimap', (checked) => {
            this.applyHudSettings({showMinimap: checked});
        }, {type: 'checkbox', checked: this.settings.showMinimap});
        hudSection.addMenuItem('toggleStatusBar', 'Status Bar', (checked) => {
            this.applyHudSettings({showStatusBar: checked});
        }, {type: 'checkbox', checked: this.settings.showStatusBar});

        // Example: Add performance metrics to menu bar status area
        this.fpsStatusElement = document.createElement('div');
        this.fpsStatusElement.className = 'status-bar-item'; // Use same styling as status bar items or new one
        this.menuBar.addStatusElement('fpsDisplay', this.fpsStatusElement);
    }

    update() {
        if (this.menuBar) this.menuBar.update();
        this._updateAllStatusDisplays(); // Keep status bar updated

        try {
            if (this.fpsStatusElement && this.performanceMetrics) {
                const fpsValue = this.performanceMetrics.fps;
                // Check if fpsValue is a number before calling toFixed
                const displayFps = typeof fpsValue === 'number' ? fpsValue.toFixed(0) : fpsValue;
                this.fpsStatusElement.textContent = `FPS: ${displayFps || 'N/A'}`;
            }
        } catch (error) {
            console.error("AdvancedHudManager: Error updating FPS display.", error);
            if (this.fpsStatusElement) {
                this.fpsStatusElement.textContent = "FPS: Error";
            }
        }
    }

    // Override or adapt methods related to old HUD components
    _setupPerformancePanel() { /* Now managed by _createAdvancedHudElements or as a pinned window */
    }

    _setupMinimap() { /* Now managed by _createAdvancedHudElements or as a pinned window */
    }

    _setupToolbar() { /* Replaced by MenuBar */
    }

    // _setupStatusBar() { /* Replaced by new status bar logic in _createAdvancedHudElements */ }

    // Keep notification and progress logic, but ensure containers are correctly parented
    _createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'hud-notifications';
        container.className = 'hud-notifications';
        return container;
    }

    _createProgressContainer() {
        const container = document.createElement('div');
        container.id = 'hud-progress-indicators';
        container.className = 'hud-progress-container';
        return container;
    }

    showNotification(message, type = 'info', duration = 3000) {
        if (!this.settings.showNotifications || !this.notificationContainer) return;
        const toast = HudOverlayPanel.createToast(message, type); // Use static method from HudOverlayPanel
        this.notificationContainer.appendChild(toast);
        this.notifications.push(toast);
        setTimeout(() => this._removeNotification(toast), duration);
    }

    _removeNotification(toastElement) {
        if (toastElement.parentNode === this.notificationContainer) {
            this.notificationContainer.removeChild(toastElement);
        }
        this.notifications = this.notifications.filter(n => n !== toastElement);
    }

    showProgress(id, message, percentage) { /* Similar adaptation for progress */
        if (!this.settings.showProgressIndicators || !this.progressContainer) return;
        let progressToast = this.progressIndicators.get(id);
        if (!progressToast) {
            progressToast = HudOverlayPanel.createToast(message, 'progress'); // Use static method
            progressToast.id = `progress-${id}`;
            this.progressContainer.appendChild(progressToast);
            this.progressIndicators.set(id, progressToast);
        }
        // ... update logic for progress bar ...
        const fill = progressToast.querySelector('.progress-fill');
        const percentText = progressToast.querySelector('.progress-percent');
        if (fill) fill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        if (percentText) percentText.textContent = `${Math.round(percentage)}%`;

        if (percentage >= 100) setTimeout(() => this.hideProgress(id), 1000);
    }

    hideProgress(id) { /* ... */
        const indicator = this.progressIndicators.get(id);
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
            this.progressIndicators.delete(id);
        }
    }

    // Adapt quick actions to be added to the "Demo Menu" or similar
    _exportGraph() { /* ... */
        const graphData = this.space.exportGraphToJSON();
        if (graphData) {
            const blob = new Blob([JSON.stringify(graphData, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `spacegraph_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showNotification('Graph exported successfully', 'success', 2000);
        }
    }

    _toggleFullscreen() { /* ... */
        if (!document.fullscreenElement) {
            this.hudLayer.requestFullscreen?.() || this.container.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }

    _takeScreenshot() { /* ... */
        const rendererPlugin = this.space.plugins.getPlugin('RenderingPlugin');
        if (rendererPlugin && rendererPlugin.takeScreenshot) {
            rendererPlugin.takeScreenshot();
        } else {
            this.showNotification('Screenshot feature not available.', 'warning', 2000);
        }
    }

    _setViewMode(mode) {
        this.space.emit('ui:request:setViewMode', mode);
    }

    _toggleGrid() {
        this.space.emit('ui:request:toggleGrid');
    }

    _toggleAxes() {
        this.space.emit('ui:request:toggleAxes');
    }

    _toggleLabels() {
        this.space.emit('ui:request:toggleLabels');
    }

    _toggleShadows() {
        this.space.emit('ui:request:toggleShadows');
    }

    static _nextZIndex = 1000;

    static getNextZIndex() {
        return AdvancedHudManager._nextZIndex++;
    }

    // Pinning logic
    pinSection(section) {
        if (this.pinnedWindows.has(section.id)) {
            // Focus existing window or handle as needed
            // For now, let's assume it brings to front or similar
            const existingWindow = this.pinnedWindows.get(section.id);
            existingWindow.container.style.zIndex = AdvancedHudManager.getNextZIndex();
            return;
        }
        const pinnedWindow = new PinnedWindow(this, section); // `this` is AdvancedHudManager
        this.pinnedWindows.set(section.id, pinnedWindow);
        // PinnedWindow constructor already appends to hudLayer.
        pinnedWindow.container.style.zIndex = AdvancedHudManager.getNextZIndex();
    }

    unpinSection(sectionId) {
        const pinnedWindow = this.pinnedWindows.get(sectionId);
        if (pinnedWindow) {
            pinnedWindow.dispose(); // Removes from DOM
            this.pinnedWindows.delete(sectionId);
        }
    }

    applyHudSettings(settings) {
        const oldSettings = {...this.settings};

        // Merge incoming settings with current settings
        const oldShowMenuBar = this.settings.showMenuBar;
        this.settings = {...this.settings, ...settings};

        // If menuBar visibility changed from false to true, ensure it's initialized
        if (!oldShowMenuBar && this.settings.showMenuBar && !this.menuBar) {
            this._setupMenuBar();
            this._populateDefaultMenus(); // Populate menus if they weren't before
        }

        if (this.menuBar) {
            this.menuBar.container.style.display = this.settings.showMenuBar ? 'flex' : 'none';
        } else if (this.settings.showMenuBar && !this.menuBar) {
            // This should ideally be caught by the block above, but as a fallback:
            console.warn("AdvancedHudManager: settings.showMenuBar is true, but this.menuBar is still not initialized after attempting setup.");
        }

        if (this.performancePanel) {
            this.performancePanel.style.display = this.settings.showPerformanceMetrics ? 'block' : 'none';
        }
        if (this.minimapPanel) {
            this.minimapPanel.style.display = this.settings.showMinimap ? 'block' : 'none';
        }
        if (this.statusBar) {
            this.statusBar.style.display = this.settings.showStatusBar ? 'flex' : 'none';
        }

        // Opacity for the entire HUD layer
        if (this.hudLayer && typeof this.settings.hudOpacity === 'number') {
            this.hudLayer.style.opacity = this.settings.hudOpacity;
        }

        // Crosshair logic
        if (this.crosshairElement) { // Assuming a `this.crosshairElement` might exist or be created elsewhere
            this.crosshairElement.style.display = this.settings.showCrosshair ? 'block' : 'none';
        }

        // Update menu item states to reflect current settings
        if (this.menuBar) {
            if (settings.showPerformanceMetrics !== undefined) {
                this.menuBar.updateMenuItemState('togglePerformance', this.settings.showPerformanceMetrics);
            }
            if (settings.showMinimap !== undefined) {
                this.menuBar.updateMenuItemState('toggleMinimap', this.settings.showMinimap);
            }
            if (settings.showStatusBar !== undefined) {
                this.menuBar.updateMenuItemState('toggleStatusBar', this.settings.showStatusBar);
            }
            // Add similar updates for other toggleable menu items if they exist
            // e.g., toggleGrid, toggleAxes, if their state is stored in this.settings
        }
    }

    dispose() {
        if (this.menuBar) this.menuBar.dispose();
        this.pinnedWindows.forEach(pw => pw.dispose());
        this.pinnedWindows.clear();

        // Remove elements created by this class if not handled by super.dispose()
        if (this.performancePanel?.parentNode) this.performancePanel.parentNode.removeChild(this.performancePanel);
        if (this.minimapPanel?.parentNode) this.minimapPanel.parentNode.removeChild(this.minimapPanel);
        if (this.statusBar?.parentNode) this.statusBar.parentNode.removeChild(this.statusBar);
        if (this.notificationContainer?.parentNode) this.notificationContainer.parentNode.removeChild(this.notificationContainer);
        if (this.progressContainer?.parentNode) this.progressContainer.parentNode.removeChild(this.progressContainer);


        this.keyboardShortcutsDialog?.dispose();
        this.layoutSettingsDialog?.dispose();

        this.space = null;
        this.container = null;
        this._uiPluginCallbacks = null;
    }
}