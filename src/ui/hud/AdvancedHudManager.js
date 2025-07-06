import { $ } from '../../utils.js';
import * as THREE from 'three'; // Added for _handleToolbarAction
import { HudManager } from './HudManager.js';
import { HudOverlayPanel } from './HudOverlayPanel.js';

export class AdvancedHudManager extends HudManager {
    constructor(space, container, uiPluginCallbacks) {
        super(space, container, uiPluginCallbacks);
        
        this.settings = {
            showPerformanceMetrics: true,
            showMinimap: false,
            showStatusBar: true,
            showNotifications: true,
            showProgressIndicators: true,
            autoHideDelay: 3000,
            hudOpacity: 0.9
        };

        this.performanceMetrics = {
            fps: 0,
            frameTime: 0,
            nodeCount: 0,
            edgeCount: 0,
            lastUpdateTime: 0
        };

        this.notifications = [];
        this.progressIndicators = new Map();
        this.statusItems = new Map();

        // Hide the basic selection info from HudManager if it exists
        if (this.hudSelectionInfo) {
            this.hudSelectionInfo.style.display = 'none';
        }
        
        this._createAdvancedHudElements();
        this._startPerformanceMonitoring();
        this._subscribeToAdvancedEvents();
    }

    _createAdvancedHudElements() {
        // Create main HUD regions
        this.hudRegionTop = document.createElement('div');
        this.hudRegionTop.className = 'hud-region hud-region-top';
        this.hudLayer.appendChild(this.hudRegionTop);

        this.hudRegionMiddle = document.createElement('div');
        this.hudRegionMiddle.className = 'hud-region hud-region-middle';
        this.hudLayer.appendChild(this.hudRegionMiddle);

        this.hudRegionLeft = document.createElement('div');
        this.hudRegionLeft.className = 'hud-region-left';
        this.hudRegionMiddle.appendChild(this.hudRegionLeft);

        this.hudRegionRight = document.createElement('div');
        this.hudRegionRight.className = 'hud-region-right';
        this.hudRegionMiddle.appendChild(this.hudRegionRight);

        this.hudRegionBottom = document.createElement('div');
        this.hudRegionBottom.className = 'hud-region hud-region-bottom';
        this.hudLayer.appendChild(this.hudRegionBottom);

        // Create groups within hudRegionTop for better alignment
        this.hudTopLeftGroup = document.createElement('div');
        this.hudTopLeftGroup.className = 'hud-top-group hud-top-left-group';
        this.hudRegionTop.appendChild(this.hudTopLeftGroup);

        this.hudTopCenterGroup = document.createElement('div');
        this.hudTopCenterGroup.className = 'hud-top-group hud-top-center-group';
        this.hudRegionTop.appendChild(this.hudTopCenterGroup);

        this.hudTopRightGroup = document.createElement('div');
        this.hudTopRightGroup.className = 'hud-top-group hud-top-right-group';
        this.hudRegionTop.appendChild(this.hudTopRightGroup);


        // Ensure main menu from HudManager is in the top-left group
        if (this.hudMainMenuButton && this.hudPopupMenu) {
            this.hudTopLeftGroup.appendChild(this.hudMainMenuButton);
            // this.hudTopLeftGroup.appendChild(this.hudPopupMenu); // Popup menu positioning might be better at hudLayer or body level
            this.hudLayer.appendChild(this.hudPopupMenu); // Keep popup menu on main layer for z-indexing
            this.hudMainMenuButton.style.position = 'relative';
            this.hudMainMenuButton.style.left = 'unset';
            this.hudMainMenuButton.style.top = 'unset';
        }

        // Performance Monitor
        const perfPanelContent = this._createPerformancePanelContent();
        this.performanceOverlay = new HudOverlayPanel('hud-performance-overlay', 'Performance', {
            parentElement: this.hudLayer,
            initialPosition: { x: 50, y: 80 }
        });
        this.performanceOverlay.setContent(perfPanelContent);
        if (this.settings.showPerformanceMetrics) { // Show by default if setting is true
            // this.performanceOverlay.show(); // Initially hidden, toggled by menu
        }
        
        // Quick Actions Panel
        const quickActionsContent = this._createQuickActionsPanelContent();
        this.quickActionsOverlay = new HudOverlayPanel('hud-quick-actions-overlay', 'Quick Actions', {
            parentElement: this.hudLayer,
            initialPosition: { x: 50, y: 280 }
        });
        this.quickActionsOverlay.setContent(quickActionsContent);
        this._bindQuickActions(this.quickActionsOverlay.contentElement); // Bind actions to content within overlay

        // Notification System (Top Center Group)
        this.notificationContainer = this._createNotificationContainer();
        this.hudTopCenterGroup.appendChild(this.notificationContainer);

        // Progress Indicators (Bottom Center area of Bottom Region or directly in Bottom Region)
        this.progressContainer = this._createProgressContainer();
        this.hudRegionBottom.appendChild(this.progressContainer); // Example placement
        
        // Camera Status Indicator (Right Sidebar/Region) - Keep for now, or make overlay
        this.cameraStatusIndicator = this._createCameraStatusIndicator();
        // this.hudRegionRight.appendChild(this.cameraStatusIndicator); // Decide if this becomes an overlay too
        
        // Layout Status Indicator (Left Sidebar/Region) - Keep for now, or make overlay
        this.layoutStatusIndicator = this._createLayoutStatusIndicator();
        // this.hudRegionLeft.appendChild(this.layoutStatusIndicator);

        // Populate the main menu
        this._populateMainMenu();

        // Remove original panel containers if they were added directly to hudLayer or groups
        // This is handled by not adding them in the first place if they are overlay content
        document.getElementById('hud-performance-panel')?.remove();
        document.getElementById('hud-quick-actions')?.remove();
    }

    // Helper to create a standard menu item (button)
    _createMenuItem(label, actionCallback, parentMenu, icon = null, id = null) {
        const menuItem = document.createElement('button');
        menuItem.className = 'hud-menu-item';
        if (id) menuItem.id = `hud-menu-${id}`;

        let content = '';
        if (icon) {
            content += `<span class="hud-menu-icon">${icon}</span> `;
        }
        content += `<span class="hud-menu-label">${label}</span>`;
        menuItem.innerHTML = content;
        menuItem.title = label;

        if (actionCallback) {
            menuItem.addEventListener('click', (event) => {
                actionCallback(event);
                // Close the main popup after action, unless it's a submenu trigger
                if (this.isPopupMenuVisible && !menuItem.classList.contains('hud-submenu-trigger')) {
                    this._togglePopupMenu();
                }
            });
        }
        parentMenu.appendChild(menuItem);
        return menuItem;
    }

    // Helper to create a submenu
    _createSubmenu(label, parentMenuItem, icon = null) {
        parentMenuItem.classList.add('hud-submenu-trigger');
        const arrow = document.createElement('span');
        arrow.className = 'hud-submenu-arrow';
        arrow.innerHTML = ' ▶';
        parentMenuItem.appendChild(arrow);

        const submenu = document.createElement('div');
        submenu.className = 'hud-submenu hidden';
        
        // Append submenu relative to the popup menu for easier positioning
        this.hudPopupMenu.appendChild(submenu);

        let timeoutId = null;

        const show = () => {
            clearTimeout(timeoutId);
            // Hide other submenus at the same level
            Array.from(this.hudPopupMenu.querySelectorAll('.hud-submenu-trigger.active')).forEach(el => {
                if (el !== parentMenuItem) {
                    el.classList.remove('active');
                    const otherSub = this.hudPopupMenu.querySelector(`.hud-submenu[aria-labelledby="${el.id}"]`);
                    otherSub?.classList.add('hidden');
                    otherSub?.classList.remove('visible');
                }
            });

            parentMenuItem.classList.add('active');
            submenu.classList.remove('hidden');
            submenu.classList.add('visible');
            submenu.setAttribute('aria-labelledby', parentMenuItem.id);


            // Position submenu
            const parentRect = parentMenuItem.getBoundingClientRect();
            const popupRect = this.hudPopupMenu.getBoundingClientRect();

            submenu.style.position = 'absolute'; // Ensure it's absolutely positioned
            submenu.style.left = `${parentMenuItem.offsetWidth}px`;
            submenu.style.top = `${parentMenuItem.offsetTop}px`; // Relative to hudPopupMenu

            // Adjust if submenu goes off-screen (basic example)
            const screenPadding = 10;
            if (popupRect.left + parentMenuItem.offsetWidth + submenu.offsetWidth > window.innerWidth - screenPadding) {
                submenu.style.left = `-${submenu.offsetWidth}px`;
            }
            if (popupRect.top + parentMenuItem.offsetTop + submenu.offsetHeight > window.innerHeight - screenPadding) {
                submenu.style.top = `${parentMenuItem.offsetTop + parentMenuItem.offsetHeight - submenu.offsetHeight}px`;
            }

        };

        const hide = () => {
            parentMenuItem.classList.remove('active');
            submenu.classList.add('hidden');
            submenu.classList.remove('visible');
        };

        parentMenuItem.addEventListener('mouseenter', show);
        parentMenuItem.addEventListener('mouseover', show); // Ensure it shows on mouseover too

        parentMenuItem.addEventListener('mouseleave', () => { timeoutId = setTimeout(hide, 200); });
        submenu.addEventListener('mouseenter', () => clearTimeout(timeoutId));
        submenu.addEventListener('mouseleave', () => { timeoutId = setTimeout(hide, 200); });
        
        // Close submenu if main popup is closed
        this.space.on('hud:popupMenuToggled', (isVisible) => {
            if(!isVisible) hide();
        });

        return submenu;
    }

    _populateMainMenu() {
        if (!this.hudPopupMenu) return;

        // Clear existing items except essential ones if any (e.g. camera mode which is already there)
        // For now, let's find a good place to insert new items.
        // The camera mode is in a 'hud-menu-group'. We can insert before/after such groups or specific items.
        const firstGroup = this.hudPopupMenu.querySelector('.hud-menu-group');

        // 0. Selection Info (non-interactive, at the top)
        this.menuSelectionInfo = document.createElement('div');
        this.menuSelectionInfo.id = 'hud-menu-selection-info';
        this.menuSelectionInfo.className = 'hud-menu-item hud-menu-static-item'; // Static item
        this.hudPopupMenu.insertBefore(this.menuSelectionInfo, firstGroup); // Insert at the top
        this.updateHudSelectionInfo(); // Initial update

        // 1. Toolbar Items (as direct menu items)
        this._createMenuItem('➕ Add Node', () => this._handleToolbarAction('addNode'), this.hudPopupMenu, '➕', 'add-node');
        this._createMenuItem('🎨 Toggle Theme', () => this._handleToolbarAction('toggleTheme'), this.hudPopupMenu, '🎨', 'toggle-theme');


        // 2. Navigation Submenu
        const navMenuItem = this._createMenuItem('🧭 Navigation', null, this.hudPopupMenu, '🧭', 'nav-menu');
        const navSubmenu = this._createSubmenu('Navigation', navMenuItem);
        this._createMenuItem('🔍+ Zoom In', () => this.space.plugins.getPlugin('CameraPlugin')?.zoom(-5), navSubmenu, '🔍+');
        this._createMenuItem('🔍- Zoom Out', () => this.space.plugins.getPlugin('CameraPlugin')?.zoom(5), navSubmenu, '🔍-');
        this._createMenuItem('🎯 Center View', () => this._handleToolbarAction('centerView'), navSubmenu, '🎯'); // Re-use toolbar action
        this._createMenuItem('🔄 Reset View', () => this._handleToolbarAction('resetView'), navSubmenu, '🔄'); // Re-use toolbar action
        this._createMenuItem('⛶ Fullscreen', () => this._toggleFullscreen(), navSubmenu, '⛶');
        this._createMenuItem('📸 Screenshot', () => this._takeScreenshot(), navSubmenu, '📸');

        // 3. View Submenu
        const viewMenuItem = this._createMenuItem('👁️ View', null, this.hudPopupMenu, '👁️', 'view-menu');
        const viewSubmenu = this._createSubmenu('View', viewMenuItem);
        this._createMenuItem('3D/2D Mode', () => this._toggleViewMode(), viewSubmenu); // Placeholder for actual 3D/2D toggle logic
        this._createMenuItem('⊞ Grid', () => this._toggleGrid(), viewSubmenu, '⊞');
        this._createMenuItem('⊥ Axes', () => this._toggleAxes(), viewSubmenu, '⊥');
        this._createMenuItem('🏷️ Labels', () => this._toggleLabels(), viewSubmenu, '🏷️');
        this._createMenuItem('☀️ Shadows', () => this._toggleShadows(), viewSubmenu, '☀️');

        // 4. Status Submenu (for items from old status bar)
        const statusMenuItem = this._createMenuItem('ℹ️ Status', null, this.hudPopupMenu, 'ℹ️', 'status-menu');
        const statusSubmenu = this._createSubmenu('Status', statusMenuItem);
        // These will be dynamic, so we create placeholders and update them
        this.menuStatusLayout = this._createMenuItem('Layout: ...', null, statusSubmenu, '⚙️');
        this.menuStatusCamera = this._createMenuItem('Camera: ...', null, statusSubmenu, '📷');
        this.menuStatusZoom = this._createMenuItem('Zoom: ...', null, statusSubmenu, '🔎');
        this.menuStatusCoords = this._createMenuItem('Coords: ...', null, statusSubmenu, '📍');
        this.menuStatusTime = this._createMenuItem('Time: ...', null, statusSubmenu, '🕒');
        this._updateMenuStatusItems(); // Initial update

        // Panel Toggles
        this._createMenuItem('📊 Performance', () => this.performanceOverlay.toggle(), this.hudPopupMenu, '📊', 'toggle-performance');
        this._createMenuItem('⚡ Quick Actions', () => this.quickActionsOverlay.toggle(), this.hudPopupMenu, '⚡', 'toggle-quick-actions');


        // Add a separator before existing items like Camera Mode, Shortcuts, Layout Settings
        const separator = document.createElement('hr');
        separator.className = 'hud-menu-separator';
        this.hudPopupMenu.insertBefore(separator, firstGroup);

        // Remove original verbose status bar if it exists (it was created by _createAdvancedHudElements before this function runs)
        document.getElementById('hud-status-bar')?.remove();
        this.statusBar = null;

        // Remove original navigation and view controls if they exist
        document.getElementById('hud-navigation-controls')?.remove();
        this.navigationControls = null;
        document.getElementById('hud-view-mode-controls')?.remove();
        this.viewModeControls = null;
    }

    // Actions from Toolbar.js, adapted for AdvancedHudManager
    _handleToolbarAction(action) {
        switch (action) {
            case 'addNode': {
                const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
                const cam = camPlugin?.getCameraInstance();
                let nodePos = { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100, z: 0 };
                if (cam) {
                    // THREE is now imported at the top of the file
                    const camPos = new THREE.Vector3();
                    const camDir = new THREE.Vector3();
                    cam.getWorldPosition(camPos);
                    cam.getWorldDirection(camDir);
                    const distanceInFront = 300;
                    const targetPos = camPos.add(camDir.multiplyScalar(distanceInFront));
                    nodePos = { x: targetPos.x, y: targetPos.y, z: 0 };
                }
                this.space.emit('ui:request:createNode', {
                    type: 'html', // Or a default type from config
                    position: nodePos,
                    data: { label: 'New Node', content: 'Edit me!' },
                });
                this.showNotification('Node added', 'success');
                break;
            }
            case 'centerView':
                this.space.emit('ui:request:centerView');
                this.showNotification('View centered', 'info');
                break;
            case 'resetView':
                this.space.emit('ui:request:resetView');
                this.showNotification('View reset', 'info');
                break;
            case 'toggleTheme': {
                document.body.classList.toggle('theme-light');
                const currentTheme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
                localStorage.setItem('spacegraph-theme', currentTheme);
                this.space.emit('theme:changed', { theme: currentTheme });
                this.showNotification(`Theme changed to ${currentTheme}`, 'info');
                break;
            }
            default:
                console.warn('AdvancedHudManager: Unknown toolbar action:', action);
        }
    }

    _toggleViewMode() {
        // Placeholder - actual logic to toggle between 2D/3D would go here
        // For now, just a notification. This might involve camera changes or rendering modes.
        const currentMode3D = !this.space.is2DMode; // Assuming a property like is2DMode exists or can be added
        this.space.emit('ui:request:setViewMode', currentMode3D ? '2d' : '3d');
        // The _setViewMode method already shows a notification.
    }

    _updateMenuStatusItems() {
        if (!this.menuStatusLayout) return; // Check if menu items are created

        const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
        const layoutPlugin = this.space.plugins.getPlugin('LayoutPlugin');

        // Layout Status
        const layoutManager = layoutPlugin?.layoutManager;
        const currentLayout = layoutManager?.getCurrentLayout();
        this.menuStatusLayout.innerHTML = `<span class="hud-menu-icon"></span><span class="hud-menu-label">Layout: ${currentLayout?.name || 'N/A'}</span>`;

        // Camera Status
        if (cameraPlugin) {
            const mode = cameraPlugin.getCameraMode();
            this.menuStatusCamera.innerHTML = `<span class="hud-menu-icon"></span><span class="hud-menu-label">Camera: ${mode}</span>`;

            const cam = cameraPlugin.getCameraInstance();
            if (cam) {
                const zoom = cam.zoom?.toFixed(1) || (cam.position.length() / 1000).toFixed(1); // Approximation
                this.menuStatusZoom.innerHTML = `<span class="hud-menu-icon"></span><span class="hud-menu-label">Zoom: ${zoom}</span>`;

                const target = cameraPlugin.controls?.target || cam.position; // Simplified
                this.menuStatusCoords.innerHTML = `<span class="hud-menu-icon"></span><span class="hud-menu-label">Coords: ${target.x.toFixed(0)}, ${target.y.toFixed(0)}, ${target.z.toFixed(0)}</span>`;
            }
        }
        
        // Time
        this.menuStatusTime.innerHTML = `<span class="hud-menu-icon"></span><span class="hud-menu-label">Time: ${new Date().toLocaleTimeString()}</span>`;
    }

    _startPerformanceMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();

        const updatePerformance = () => {
            frameCount++;
            const currentTime = performance.now();

            if (currentTime - lastTime >= 1000) {
                this.performanceMetrics.fps = frameCount;
                this.performanceMetrics.frameTime = (currentTime - lastTime) / frameCount;

                const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
                const edgePlugin = this.space.plugins.getPlugin('EdgePlugin');

                this.performanceMetrics.nodeCount = nodePlugin?.getNodes()?.size || 0;
                this.performanceMetrics.edgeCount = edgePlugin?.getEdges()?.size || 0;

                this._updatePerformanceDisplay();
                this._updateMenuStatusItems(); // Update status submenu periodically

                frameCount = 0;
                lastTime = currentTime;
            }

            requestAnimationFrame(updatePerformance);
        };

        updatePerformance();
    }

    _subscribeToAdvancedEvents() {
        super._subscribeToAdvancedEvents?.(); // Call base class if it has this method

        // Camera events (covered by _updateMenuStatusItems called in _startPerformanceMonitoring)
        // Layout events (covered by _updateMenuStatusItems)
        // Selection events
        this.space.on('selection:changed', () => this.updateHudSelectionInfo()); // This updates the new menu selection info

        // Graph events (covered by performance monitoring updates for node/edge counts)
    }
     _togglePopupMenu = (event) => {
        super._togglePopupMenu(event); // Call base class method
        this.space.emit('hud:popupMenuToggled', this.isPopupMenuVisible);
    };


    // Override parent methods to include advanced features
    updateHudSelectionInfo() {
        // Update the new menu selection info element
        if (!this.menuSelectionInfo) return;

        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
        const selectedEdges = this._uiPluginCallbacks.getSelectedEdges();

        let text = 'Selected: None';
        if (selectedNodes.size === 1) {
            const node = selectedNodes.values().next().value;
            text = `Selected: Node ${node.data.label || node.id.substring(0, 8)}`;
        } else if (selectedNodes.size > 1) {
            text = `Selected: ${selectedNodes.size} Nodes`;
        } else if (selectedEdges.size === 1) {
            const edge = selectedEdges.values().next().value;
            text = `Selected: Edge ${edge.id.substring(0, 8)}`;
        } else if (selectedEdges.size > 1) {
            text = `Selected: ${selectedEdges.size} Edges`;
        }
        this.menuSelectionInfo.textContent = text;

        // Also call the original status bar update if it's still relevant or for other parts of it
        // However, the plan is to remove the old status bar's selection info part.
        // So, this primarily updates the new menu item.
        // If the old #adv-selection-info element from the status bar still exists and is used,
        // it would be updated by the original super.updateHudSelectionInfo() if called.
        // For now, we assume the new menu item is the primary display.
    }

    _createPerformancePanelContent() {
        const content = document.createElement('div');
        // No id or hud-panel class here, it's managed by HudOverlayPanel
        content.innerHTML = `
            <div class="performance-metric">
                <span class="metric-label">FPS:</span>
                <span class="metric-value" id="fps-value">60</span>
                </div>
                <div class="performance-metric">
                    <span class="metric-label">Frame Time:</span>
                    <span class="metric-value" id="frametime-value">16ms</span>
                </div>
                <div class="performance-metric">
                    <span class="metric-label">Nodes:</span>
                    <span class="metric-value" id="nodes-count">0</span>
                </div>
                <div class="performance-metric">
                    <span class="metric-label">Edges:</span>
                    <span class="metric-value" id="edges-count">0</span>
                </div>
                <div class="performance-metric">
                    <span class="metric-label">Memory:</span>
                    <span class="metric-value" id="memory-usage">0MB</span>
                </div>
        `;
        // Binding toggle is now part of HudOverlayPanel (close button)
        return content;
    }

    _createStatusBar() {
        const statusBar = document.createElement('div');
        statusBar.id = 'hud-status-bar';
        statusBar.className = 'hud-status-bar'; // Removed hud-bottom-full, will ensure it takes width via CSS
        statusBar.innerHTML = `
            <div class="status-section status-left">
                <span class="status-item" id="layout-status">Layout: Force</span>
                <span class="status-item" id="camera-mode-status">Camera: Orbit</span>
                <span class="status-item" id="adv-selection-info">Selected: None</span>
            </div>
            <div class="status-section status-center">
                <span class="status-item" id="current-action-status">Ready</span>
            </div>
            <div class="status-section status-right">
                <span class="status-item" id="zoom-level-status">Zoom: 100%</span>
                <span class="status-item" id="coordinates-status">0, 0, 0</span>
                <span class="status-item" id="time-status"></span>
            </div>
        `;
        
        this.hudLayer.appendChild(statusBar);
        this._startTimeUpdater(statusBar.querySelector('#time-status'));
        return statusBar;
    }

    _createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'hud-notifications';
        container.className = 'hud-notifications hud-top-center'; // hud-top-center will be restyled for flex
        // Appending is now handled in _createAdvancedHudElements
        return container;
    }

    _createProgressContainer() {
        const container = document.createElement('div');
        container.id = 'hud-progress-indicators';
        container.className = 'hud-progress-container hud-bottom-center'; // hud-bottom-center will be restyled for flex
         // Appending is now handled in _createAdvancedHudElements
        return container;
    }

    _createCameraStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'hud-camera-status';
        indicator.className = 'hud-indicator'; // Removed hud-right-center
        indicator.innerHTML = `
            <div class="indicator-icon" id="camera-mode-icon">📹</div>
            <div class="indicator-details">
                <div class="indicator-line" id="camera-position">Pos: 0, 0, 0</div>
                <div class="indicator-line" id="camera-target">Target: 0, 0, 0</div>
                <div class="indicator-line" id="camera-distance">Distance: 0</div>
            </div>
        `;
        
        this.hudLayer.appendChild(indicator);
        return indicator;
    }

    _createLayoutStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'hud-layout-status';
        indicator.className = 'hud-indicator'; // Removed hud-left-center
        indicator.innerHTML = `
            <div class="indicator-icon" id="layout-mode-icon">🔗</div>
            <div class="indicator-details">
                <div class="indicator-line" id="layout-type">Type: Force</div>
                <div class="indicator-line" id="layout-running">Status: Running</div>
                <div class="indicator-line" id="layout-energy">Energy: 0</div>
            </div>
        `;
        
        this.hudLayer.appendChild(indicator);
        return indicator;
    }

    _createNavigationControls() {
        const controls = document.createElement('div');
        controls.id = 'hud-navigation-controls';
        controls.className = 'hud-controls'; // Removed hud-bottom-right
        controls.innerHTML = `
            <div class="control-group">
                <button class="nav-button" id="nav-zoom-in" title="Zoom In">🔍+</button>
                <button class="nav-button" id="nav-zoom-out" title="Zoom Out">🔍-</button>
            </div>
            <div class="control-group">
                <button class="nav-button" id="nav-center" title="Center View">⌖</button>
                <button class="nav-button" id="nav-reset" title="Reset View">🏠</button>
            </div>
            <div class="control-group">
                <button class="nav-button" id="nav-fullscreen" title="Toggle Fullscreen">⛶</button>
                <button class="nav-button" id="nav-screenshot" title="Take Screenshot">📸</button>
            </div>
        `;
        
        this.hudLayer.appendChild(controls);
        this._bindNavigationControls(controls);
        return controls;
    }

    _createViewModeControls() {
        const controls = document.createElement('div');
        controls.id = 'hud-view-mode-controls';
        controls.className = 'hud-controls hud-top-right'; // Changed to hud-top-right for simpler CSS handling
        controls.innerHTML = `
            <div class="view-mode-toggle">
                <button class="mode-button active" id="mode-3d" title="3D View">3D</button>
                <button class="mode-button" id="mode-2d" title="2D View">2D</button>
            </div>
            <div class="view-options">
                <button class="option-button" id="toggle-grid" title="Toggle Grid">⊞</button>
                <button class="option-button" id="toggle-axes" title="Toggle Axes">⊥</button>
                <button class="option-button" id="toggle-labels" title="Toggle Labels">🏷️</button>
                <button class="option-button" id="toggle-shadows" title="Toggle Shadows">☀️</button>
            </div>
        `;
        
        this.hudLayer.appendChild(controls);
        this._bindViewModeControls(controls);
        return controls;
    }

    _createQuickActionsPanelContent() {
        const content = document.createElement('div');
        // No id or hud-panel class here
        content.innerHTML = `
            <div class="action-group">
                <button class="action-button" id="action-add-node" title="Add Node">➕ Node</button>
                <button class="action-button" id="action-add-edge" title="Add Edge">🔗 Edge</button>
                </div>
                <div class="action-group">
                    <button class="action-button" id="action-select-all" title="Select All">◉ All</button>
                    <button class="action-button" id="action-clear-selection" title="Clear Selection">◯ Clear</button>
                </div>
                <div class="action-group">
                    <button class="action-button" id="action-auto-layout" title="Auto Layout">🎯 Auto</button>
                    <button class="action-button" id="action-export" title="Export Graph">💾 Export</button>
                </div>
        `;
        // _bindQuickActions is called on this content after it's added to an overlay
        // _bindPanelToggle is handled by HudOverlayPanel
        return content;
    }

    // _bindPanelToggle(panel) { // This logic is now within HudOverlayPanel
    //     const toggle = panel.querySelector('.hud-panel-toggle');
    //     const content = panel.querySelector('.hud-panel-content');

    //     if (toggle && content) {
    //         toggle.addEventListener('click', () => {
    //             const isVisible = !content.classList.contains('collapsed');
    //             content.classList.toggle('collapsed', isVisible);
    //             toggle.classList.toggle('collapsed', isVisible);
    //         });
    //     }
    // }

    _bindNavigationControls(controls) {
        const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
        
        controls.querySelector('#nav-zoom-in').addEventListener('click', () => {
            cameraPlugin?.zoom(-5);
        });
        
        controls.querySelector('#nav-zoom-out').addEventListener('click', () => {
            cameraPlugin?.zoom(5);
        });
        
        controls.querySelector('#nav-center').addEventListener('click', () => {
            cameraPlugin?.centerView();
        });
        
        controls.querySelector('#nav-reset').addEventListener('click', () => {
            cameraPlugin?.resetView();
        });
        
        controls.querySelector('#nav-fullscreen').addEventListener('click', () => {
            this._toggleFullscreen();
        });
        
        controls.querySelector('#nav-screenshot').addEventListener('click', () => {
            this._takeScreenshot();
        });
    }

    _bindViewModeControls(controls) {
        // 3D/2D mode toggle
        const mode3d = controls.querySelector('#mode-3d');
        const mode2d = controls.querySelector('#mode-2d');
        
        mode3d.addEventListener('click', () => {
            mode3d.classList.add('active');
            mode2d.classList.remove('active');
            this._setViewMode('3d');
        });
        
        mode2d.addEventListener('click', () => {
            mode2d.classList.add('active');
            mode3d.classList.remove('active');
            this._setViewMode('2d');
        });
        
        // View options
        controls.querySelector('#toggle-grid').addEventListener('click', () => {
            this._toggleGrid();
        });
        
        controls.querySelector('#toggle-axes').addEventListener('click', () => {
            this._toggleAxes();
        });
        
        controls.querySelector('#toggle-labels').addEventListener('click', () => {
            this._toggleLabels();
        });
        
        controls.querySelector('#toggle-shadows').addEventListener('click', () => {
            this._toggleShadows();
        });
    }

    _bindQuickActions(panel) {
        panel.querySelector('#action-add-node').addEventListener('click', () => {
            this._addRandomNode();
        });
        
        panel.querySelector('#action-add-edge').addEventListener('click', () => {
            this.space.emit('ui:request:startLinking');
        });
        
        panel.querySelector('#action-select-all').addEventListener('click', () => {
            this._selectAllNodes();
        });
        
        panel.querySelector('#action-clear-selection').addEventListener('click', () => {
            this._clearSelection();
        });
        
        panel.querySelector('#action-auto-layout').addEventListener('click', () => {
            this._applyAutoLayout();
        });
        
        panel.querySelector('#action-export').addEventListener('click', () => {
            this._exportGraph();
        });
    }

    _startPerformanceMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const updatePerformance = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                this.performanceMetrics.fps = frameCount;
                this.performanceMetrics.frameTime = (currentTime - lastTime) / frameCount;
                
                const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
                const edgePlugin = this.space.plugins.getPlugin('EdgePlugin');
                
                this.performanceMetrics.nodeCount = nodePlugin?.getNodes()?.size || 0;
                this.performanceMetrics.edgeCount = edgePlugin?.getEdges()?.size || 0;
                
                this._updatePerformanceDisplay();
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(updatePerformance);
        };
        
        updatePerformance();
    }

    _startTimeUpdater(timeElement) {
        if (!timeElement) return;
        
        const updateTime = () => {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString();
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    _subscribeToAdvancedEvents() {
        // Camera events
        this.space.on('camera:moved', () => this._updateCameraStatus());
        this.space.on('camera:modeChanged', () => this._updateCameraStatus());
        this.space.on('camera:autoZoomToggled', () => this._updateCameraStatus());
        this.space.on('camera:autoRotationToggled', () => this._updateCameraStatus());
        
        // Layout events
        this.space.on('layout:started', (event) => this._updateLayoutStatus(event));
        this.space.on('layout:stopped', (event) => this._updateLayoutStatus(event));
        this.space.on('layout:adapted', (event) => this._updateLayoutStatus(event));
        
        // Selection events
        this.space.on('selection:changed', () => this.updateHudSelectionInfo());
        
        // Graph events
        this.space.on('node:added', () => this._updateGraphStatus());
        this.space.on('node:removed', () => this._updateGraphStatus());
        this.space.on('edge:added', () => this._updateGraphStatus());
        this.space.on('edge:removed', () => this._updateGraphStatus());
    }

    _updatePerformanceDisplay() {
        const fpsEl = $('#fps-value');
        const frameTimeEl = $('#frametime-value');
        const nodesEl = $('#nodes-count');
        const edgesEl = $('#edges-count');
        const memoryEl = $('#memory-usage');
        
        if (fpsEl) fpsEl.textContent = Math.round(this.performanceMetrics.fps);
        if (frameTimeEl) frameTimeEl.textContent = `${this.performanceMetrics.frameTime.toFixed(1)}ms`;
        if (nodesEl) nodesEl.textContent = this.performanceMetrics.nodeCount;
        if (edgesEl) edgesEl.textContent = this.performanceMetrics.edgeCount;
        
        if (memoryEl && performance.memory) {
            const memoryMB = performance.memory.usedJSHeapSize / (1024 * 1024);
            memoryEl.textContent = `${memoryMB.toFixed(1)}MB`;
        }
    }

    _updateCameraStatus() {
        const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
        if (!cameraPlugin) return;
        
        const camera = cameraPlugin.getCameraInstance();
        const mode = cameraPlugin.getCameraMode();
        const status = cameraPlugin.getAdvancedControlsStatus?.() || {};
        
        // Update camera indicator
        const posEl = $('#camera-position');
        const targetEl = $('#camera-target');
        const distanceEl = $('#camera-distance');
        
        if (posEl && camera) {
            const pos = camera.position;
            posEl.textContent = `Pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
        }
        
        // Update status bar
        const modeStatusEl = $('#camera-mode-status');
        if (modeStatusEl) {
            let statusText = `Camera: ${mode}`;
            if (status.autoZoom) statusText += ' [AutoZoom]';
            if (status.autoRotation) statusText += ' [AutoRotate]';
            if (status.peekMode) statusText += ' [Peek]';
            if (status.cinematicMode) statusText += ' [Cinematic]';
            modeStatusEl.textContent = statusText;
        }
    }

    _updateLayoutStatus(event) {
        const layoutEl = $('#layout-type');
        const statusEl = $('#layout-running');
        const energyEl = $('#layout-energy');
        const statusBarEl = $('#layout-status');
        
        if (layoutEl && event) {
            layoutEl.textContent = `Type: ${event.name || 'Unknown'}`;
        }
        
        if (statusEl) {
            statusEl.textContent = event?.type === 'started' ? 'Status: Running' : 'Status: Stopped';
        }
        
        if (statusBarEl && event) {
            statusBarEl.textContent = `Layout: ${event.name || 'Unknown'}`;
        }
    }

    _updateGraphStatus() {
        // This method used to call _updateMinimap().
        // If other graph-status related HUD updates are needed, they can go here.
        // For now, it's empty as the minimap update is removed.
    }

    // Notification System
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `hud-notification hud-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-icon">${this._getNotificationIcon(type)}</div>
            <div class="notification-content">${message}</div>
            <button class="notification-close" title="Close">×</button>
        `;
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this._removeNotification(notification));
        
        this.notificationContainer.appendChild(notification);
        this.notifications.push(notification);
        
        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => this._removeNotification(notification), duration);
        }
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('notification-visible');
        });
        
        return notification;
    }

    _getNotificationIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || icons.info;
    }

    _removeNotification(notification) {
        notification.classList.remove('notification-visible');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications = this.notifications.filter(n => n !== notification);
        }, 300);
    }

    // Progress Indicators
    showProgress(id, label, progress = 0) {
        let indicator = this.progressIndicators.get(id);
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'hud-progress-indicator';
            indicator.innerHTML = `
                <div class="progress-label">${label}</div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-percent">0%</div>
            `;
            
            this.progressContainer.appendChild(indicator);
            this.progressIndicators.set(id, indicator);
        }
        
        const fill = indicator.querySelector('.progress-fill');
        const percent = indicator.querySelector('.progress-percent');
        
        fill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        percent.textContent = `${Math.round(progress)}%`;
        
        if (progress >= 100) {
            setTimeout(() => this.hideProgress(id), 1000);
        }
    }

    hideProgress(id) {
        const indicator = this.progressIndicators.get(id);
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
            this.progressIndicators.delete(id);
        }
    }

    // Utility methods for quick actions
    _addRandomNode() {
        const position = {
            x: (Math.random() - 0.5) * 400,
            y: (Math.random() - 0.5) * 400,
            z: (Math.random() - 0.5) * 200
        };
        
        const nodeTypes = ['ControlPanelNode', 'ProgressNode', 'TextMeshNode', 'ShapeNode'];
        const randomType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
        
        const node = this.space.addNode({
            id: `quick_node_${Date.now()}`,
            type: randomType,
            position,
            data: { content: 'Quick Node' }
        });
        
        this.showNotification(`Added ${randomType}`, 'success', 2000);
        return node;
    }

    _selectAllNodes() {
        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
        const nodes = Array.from(nodePlugin?.getNodes()?.values() || []);
        
        nodes.forEach(node => {
            this._uiPluginCallbacks.setSelectedNode(node, true);
        });
        
        this.showNotification(`Selected ${nodes.length} nodes`, 'info', 2000);
    }

    _clearSelection() {
        this._uiPluginCallbacks.setSelectedNode(null, false);
        this._uiPluginCallbacks.setSelectedEdge(null, false);
        this.showNotification('Selection cleared', 'info', 2000);
    }

    _applyAutoLayout() {
        const layoutPlugin = this.space.plugins.getPlugin('LayoutPlugin');
        if (layoutPlugin?.layoutManager?.toggleAutoZoom) {
            const enabled = layoutPlugin.layoutManager.toggleAutoZoom();
            this.showNotification(`Auto-zoom ${enabled ? 'enabled' : 'disabled'}`, 'info', 2000);
        }
    }

    _exportGraph() {
        const data = this.space.exportGraphToJSON();
        if (data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `spacegraph_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showNotification('Graph exported successfully', 'success', 2000);
        }
    }

    _toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }

    _takeScreenshot() {
        const renderingPlugin = this.space.plugins.getPlugin('RenderingPlugin');
        if (renderingPlugin) {
            // This would need to be implemented in the rendering plugin
            this.showNotification('Screenshot feature not yet implemented', 'warning', 2000);
        }
    }

    _setViewMode(mode) {
        this.space.emit('ui:request:setViewMode', mode);
        this.showNotification(`Switched to ${mode.toUpperCase()} view`, 'info', 2000);
    }

    _toggleGrid() {
        this.space.emit('ui:request:toggleGrid');
        this.showNotification('Grid toggled', 'info', 1500);
    }

    _toggleAxes() {
        this.space.emit('ui:request:toggleAxes');
        this.showNotification('Axes toggled', 'info', 1500);
    }

    _toggleLabels() {
        this.space.emit('ui:request:toggleLabels');
        this.showNotification('Labels toggled', 'info', 1500);
    }

    _toggleShadows() {
        this.space.emit('ui:request:toggleShadows');
        this.showNotification('Shadows toggled', 'info', 1500);
    }

    // Override parent methods to include advanced features
    updateHudSelectionInfo() {
        // Directly update the advanced selection info in the status bar
        const advSelectionInfoEl = $('#adv-selection-info');
        if (!advSelectionInfoEl) return;

        const selectedNodes = this._uiPluginCallbacks.getSelectedNodes();
        const selectedEdges = this._uiPluginCallbacks.getSelectedEdges();

        if (selectedNodes.size === 1) {
            const node = selectedNodes.values().next().value;
            advSelectionInfoEl.textContent = `Selected: Node ${node.data.label || node.id.substring(0, 8)}`;
        } else if (selectedNodes.size > 1) {
            advSelectionInfoEl.textContent = `Selected: ${selectedNodes.size} Nodes`;
        } else if (selectedEdges.size === 1) {
            const edge = selectedEdges.values().next().value;
            advSelectionInfoEl.textContent = `Selected: Edge ${edge.id.substring(0, 8)}`;
        } else if (selectedEdges.size > 1) {
            advSelectionInfoEl.textContent = `Selected: ${selectedEdges.size} Edges`;
        } else {
            advSelectionInfoEl.textContent = 'Selected: None';
        }
    }

    updateHudCameraMode(mode) {
        super.updateHudCameraMode(mode);
        this._updateCameraStatus();
    }

    // Configuration
    updateHudSettings(newSettings) {
        const oldShowMinimap = this.settings.showMinimap;
        this.settings = { ...this.settings, ...newSettings };
        
        // Apply settings
        if (this.hudLayer) {
            this.hudLayer.style.opacity = this.settings.hudOpacity;
        }
        
        // Show/hide panels based on settings
        if (this.performancePanel) {
            this.performancePanel.style.display = this.settings.showPerformanceMetrics ? 'block' : 'none';
        }

        if (this.statusBar) {
            this.statusBar.style.display = this.settings.showStatusBar ? 'block' : 'none';
        }

        // Emit event if showMinimap setting changed
        if (this.settings.showMinimap !== oldShowMinimap && this.space) {
            this.space.emit('ui:request:toggleMinimap', { show: this.settings.showMinimap });
        }
    }

    getHudSettings() {
        return { ...this.settings };
    }

    dispose() {
        // Clear notifications and progress indicators
        this.notifications.forEach(notification => this._removeNotification(notification));
        this.progressIndicators.forEach((indicator, id) => this.hideProgress(id));
        
        super.dispose();
    }
}