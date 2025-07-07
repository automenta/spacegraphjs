// src/ui/hud/AdvancedHudManager.js
import { $ } from '../../utils.js';
import * as THREE from 'three';
import { HudManager } from './HudManager.js';
import { HudOverlayPanel } from './HudOverlayPanel.js';
import { KeyboardShortcutsDialog } from '../dialogs/KeyboardShortcutsDialog.js'; // Keep for now
import { LayoutSettingsDialog } from '../dialogs/LayoutSettingsDialog.js';   // Keep for now
import { MenuBar } from './MenuBar.js';
import { PinnedWindow } from './PinnedWindow.js';

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

export class AdvancedHudManager extends HudManager {
    constructor(space, container, uiPluginCallbacks) {
        super(space, container, uiPluginCallbacks); // Base HudManager constructor
        
        this.settings = { ...DEFAULT_ADVANCED_HUD_SETTINGS, ...this.settings }; // Merge with base settings

        // this.performanceMetrics is now inherited from HudManager
        this.notifications = this.notifications || []; // Ensure array exists from base or init
        this.progressIndicators = this.progressIndicators || new Map(); // Ensure map exists

        // Remove or hide elements from base HudManager that are replaced by MenuBar system
        if (this.hudMainMenuButton) this.hudMainMenuButton.style.display = 'none';
        if (this.hudPopupMenu) this.hudPopupMenu.style.display = 'none';
        // If base HudManager creates its own status bar or specific panels, hide/remove them here.
        // For example, if HudManager had a `this.statusBar`, you might do:
        // if (this.statusBar) this.statusBar.style.display = 'none';

        // New Menu Bar System
        this.menuBar = null;
        this.pinnedWindows = new Map();
        
        this._setupMenuBar(); // Setup MenuBar first, it will occupy the top region

        // Re-setup or adapt other HUD elements if they are still needed
        // and not part of the new MenuBar/PinnedWindow system.
        this._createAdvancedHudElements(); // This will adapt existing elements or create new ones
        
        this._startPerformanceMonitoring(); // Already in parent, ensure it's called appropriately
        this._subscribeToAdvancedEvents();

        // Dialogs (if not managed by base or need specific handling)
        this.keyboardShortcutsDialog = new KeyboardShortcutsDialog(this.hudLayer);
        this.layoutSettingsDialog = new LayoutSettingsDialog(this.hudLayer, this.space);

        this.applyHudSettings(this.settings); // Apply initial/merged settings
        this._populateDefaultMenus(); // Populate menu bar with default items
    }

    _setupMenuBar() {
        if (!this.settings.showMenuBar) return;
        this.menuBar = new MenuBar(this); // Pass `this` (AdvancedHudManager instance)
        // The MenuBar constructor should append its container to this.hudLayer or a specific region
        // If MenuBar doesn't auto-append, append it here:
        if(this.hudRegionTop) { // Assuming hudRegionTop is created by base or here
             this.hudRegionTop.appendChild(this.menuBar.container);
        } else {
            this.hudLayer.insertBefore(this.menuBar.container, this.hudLayer.firstChild); // Prepend if no top region
        }
    }

    // Override or adapt _createAdvancedHudElements from parent
    _createAdvancedHudElements() {
        // If base class creates regions, we might not need to recreate them
        // super._createAdvancedHudElements(); // Call if base class sets up common regions

        // Ensure regions exist if not created by base
        if (!this.hudRegionTop) {
            this.hudRegionTop = document.createElement('div');
            this.hudRegionTop.className = 'hud-region hud-region-top';
            this.hudLayer.appendChild(this.hudRegionTop);
        }
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
            (this.hudTopCenterGroup || this.hudRegionTop || this.hudLayer).appendChild(this.notificationContainer);
        }


        // Progress Container
        this.progressContainer = this.progressContainer || this._createProgressContainer();
         if (!this.progressContainer.parentNode) {
            (this.hudRegionBottom || this.hudLayer).appendChild(this.progressContainer);
        }


        // Status Bar (Traditional bottom bar)
        this.statusBar = document.createElement('div');
        this.statusBar.id = 'advanced-status-bar';
        this.statusBar.className = 'status-bar'; // CSS will style this
        this.hudLayer.appendChild(this.statusBar);
        // Populate status bar sections
        this.statusSelection = document.createElement('span'); this.statusBar.appendChild(this.statusSelection);
        this.statusCamera = document.createElement('span');    this.statusBar.appendChild(this.statusCamera);
        this.statusNodeCount = document.createElement('span'); this.statusBar.appendChild(this.statusNodeCount);
        this.statusLayout = document.createElement('span');    this.statusBar.appendChild(this.statusLayout); // Added for layout status
        
        this._updateAllStatusDisplays();
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
        if (selectedNodes.size === 1) text = `Node: ${selectedNodes.values().next().value.id.substring(0,8)}`;
        else if (selectedNodes.size > 1) text = `${selectedNodes.size} Nodes`;
        else if (selectedEdges.size === 1) text = `Edge: ${selectedEdges.values().next().value.id.substring(0,8)}`;
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
            }
            else {
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
        fileMenu.addMenuItem('exportGraph', 'Export Graph...', () => this._exportGraph(), { hotkey: 'Ctrl+E' });
        fileMenu.addMenuItem('importGraph', 'Import Graph...', () => { this.showNotification('Import not implemented yet.'); });
        fileMenu.addSeparator();
        fileMenu.addMenuItem('takeScreenshot', 'Take Screenshot', () => this._takeScreenshot());
        fileMenu.addSeparator();
        fileMenu.addMenuItem('toggleFullscreen', 'Toggle Fullscreen', () => this._toggleFullscreen(), { hotkey: 'F11' });

        const viewMenu = this.menuBar.addMenu('view', 'View');
        const appearanceSection = viewMenu.addSection('appearance', 'Appearance Options', true);
        appearanceSection.addMenuItem('toggleGrid', 'Grid', (checked) => this._toggleGrid(), { type: 'checkbox', checked: false, updateHandler: (item) => {
            const RPlugin = this.space.plugins.getPlugin('RenderingPlugin');
            if (RPlugin) item.setChecked(RPlugin.isGridVisible()); // Sync with actual state
        }});
        appearanceSection.addMenuItem('toggleAxes', 'Axes', (checked) => this._toggleAxes(), { type: 'checkbox', checked: false, updateHandler: (item) => {
            const RPlugin = this.space.plugins.getPlugin('RenderingPlugin');
            if (RPlugin) item.setChecked(RPlugin.areAxesVisible());
        } });
        // ... other view items like labels, shadows

        const hudSection = viewMenu.addSection('hudElements', 'HUD Elements', true);
        hudSection.addMenuItem('togglePerformance', 'Performance Metrics', (checked) => {
            this.applyHudSettings({ showPerformanceMetrics: checked });
        }, { type: 'checkbox', checked: this.settings.showPerformanceMetrics });
        hudSection.addMenuItem('toggleMinimap', 'Minimap', (checked) => {
            this.applyHudSettings({ showMinimap: checked });
        }, { type: 'checkbox', checked: this.settings.showMinimap });
         hudSection.addMenuItem('toggleStatusBar', 'Status Bar', (checked) => {
            this.applyHudSettings({ showStatusBar: checked });
        }, { type: 'checkbox', checked: this.settings.showStatusBar });

        // Example: Add performance metrics to menu bar status area
        this.fpsStatusElement = document.createElement('div');
        this.fpsStatusElement.className = 'status-bar-item'; // Use same styling as status bar items or new one
        this.menuBar.addStatusElement('fpsDisplay', this.fpsStatusElement);
    }

    update() {
        super.update(); // Call base class update for its own logic (e.g. performance monitoring)
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
    _setupPerformancePanel() { /* Now managed by _createAdvancedHudElements or as a pinned window */ }
    _setupMinimap() { /* Now managed by _createAdvancedHudElements or as a pinned window */ }
    _setupToolbar() { /* Replaced by MenuBar */ }
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
        if(fill) fill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        if(percentText) percentText.textContent = `${Math.round(percentage)}%`;

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
            const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `spacegraph_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showNotification('Graph exported successfully', 'success', 2000);
        }}
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
    _setViewMode(mode) { this.space.emit('ui:request:setViewMode', mode); }
    _toggleGrid() { this.space.emit('ui:request:toggleGrid'); }
    _toggleAxes() { this.space.emit('ui:request:toggleAxes'); }
    _toggleLabels() { this.space.emit('ui:request:toggleLabels'); }
    _toggleShadows() { this.space.emit('ui:request:toggleShadows'); }

    // Pinning logic
    pinSection(section) {
        if (this.pinnedWindows.has(section.id)) {
            // Focus existing window or handle as needed
            // For now, let's assume it brings to front or similar
            const existingWindow = this.pinnedWindows.get(section.id);
            existingWindow.container.style.zIndex = HudManager.getNextZIndex();
            return;
        }
        const pinnedWindow = new PinnedWindow(this, section); // `this` is AdvancedHudManager
        this.pinnedWindows.set(section.id, pinnedWindow);
        // PinnedWindow constructor already appends to hudLayer.
        pinnedWindow.container.style.zIndex = HudManager.getNextZIndex();
    }

    unpinSection(sectionId) {
        const pinnedWindow = this.pinnedWindows.get(sectionId);
        if (pinnedWindow) {
            pinnedWindow.dispose(); // Removes from DOM
            this.pinnedWindows.delete(sectionId);
        }
    }

    applyHudSettings(settings) {
        const oldSettings = { ...this.settings };
        // super.applyHudSettings(settings); // Apply base settings and then specific ones - THIS LINE IS REMOVED

        // Merge incoming settings with current settings
        const oldShowMenuBar = this.settings.showMenuBar;
        this.settings = { ...this.settings, ...settings };

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

        super.dispose(); // Call base class dispose
    }
}