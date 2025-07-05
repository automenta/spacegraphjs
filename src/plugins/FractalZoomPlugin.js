import { Plugin } from '../core/Plugin.js';
import { FractalZoomManager } from '../zoom/FractalZoomManager.js';
import { createContentAdapter } from '../zoom/ContentAdapter.js';

/**
 * FractalZoomPlugin integrates fractal zooming capabilities into SpaceGraphJS.
 * This plugin provides infinite zoom with level-of-detail management and content adaptation.
 */
export class FractalZoomPlugin extends Plugin {
    constructor(spaceGraph, pluginManager, config = {}) {
        super(spaceGraph, pluginManager);
        
        this.config = {
            enabled: true,
            autoLOD: true,
            zoomStep: 0.5,
            maxZoomIn: 20,
            maxZoomOut: -10,
            transitionDuration: 0.8,
            ...config
        };
        
        this.fractalZoomManager = null;
        this.contentAdapters = new Map();
        this.zoomListeners = new Set();
    }

    getName() {
        return 'FractalZoomPlugin';
    }

    init() {
        super.init();
        
        if (!this.config.enabled) return;
        
        // Create fractal zoom manager
        this.fractalZoomManager = new FractalZoomManager(this.space);
        
        // Configure zoom parameters
        this.fractalZoomManager.zoomStep = this.config.zoomStep;
        this.fractalZoomManager.maxZoomIn = this.config.maxZoomIn;
        this.fractalZoomManager.maxZoomOut = this.config.maxZoomOut;
        this.fractalZoomManager.transitionDuration = this.config.transitionDuration;
        
        // Initialize with camera plugin
        const cameraPlugin = this.pluginManager.getPlugin('CameraPlugin');
        if (cameraPlugin) {
            this.fractalZoomManager.init(cameraPlugin);
        }
        
        this._subscribeToEvents();
        this._setupDefaultContentAdapters();
        
        // Expose fractal zoom API
        this.space.fractalZoom = {
            zoomToLevel: this.zoomToLevel.bind(this),
            zoomIn: this.zoomIn.bind(this),
            zoomOut: this.zoomOut.bind(this),
            resetZoom: this.resetZoom.bind(this),
            getZoomLevel: this.getZoomLevel.bind(this),
            getZoomRange: this.getZoomRange.bind(this),
            addContentAdapter: this.addContentAdapter.bind(this),
            addLODLevel: this.addLODLevel.bind(this),
            isTransitioning: this.isTransitioning.bind(this)
        };
        
        console.log('FractalZoomPlugin initialized');
    }

    /**
     * Subscribe to relevant events
     */
    _subscribeToEvents() {
        this.space.on('node:added', this._onNodeAdded.bind(this));
        this.space.on('node:removed', this._onNodeRemoved.bind(this));
        this.space.on('fractal-zoom:levelChanged', this._onZoomLevelChanged.bind(this));
        this.space.on('fractal-zoom:lodUpdated', this._onLODUpdated.bind(this));
    }

    /**
     * Setup default content adapters for different node types
     */
    _setupDefaultContentAdapters() {
        // Add default content adapters when nodes are created
        // This will be handled in _onNodeAdded
    }

    /**
     * Handle node addition
     */
    _onNodeAdded(nodeInstance) {
        if (!this.fractalZoomManager || !nodeInstance) return; // Added check for nodeInstance
        
        // Auto-create content adapter based on node type and content
        // Pass nodeInstance.id as the first argument and nodeInstance as the second
        this._createDefaultContentAdapter(nodeInstance.id, nodeInstance);
    }

    /**
     * Handle node removal
     */
    _onNodeRemoved(nodeId, node) {
        // Remove content adapter
        if (this.contentAdapters.has(nodeId)) {
            const adapter = this.contentAdapters.get(nodeId);
            adapter.dispose();
            this.contentAdapters.delete(nodeId);
        }
    }

    /**
     * Handle zoom level changes
     */
    _onZoomLevelChanged(data) {
        this.space.emit('ui:fractalZoom:levelChanged', data);
        
        // Notify zoom listeners
        this.zoomListeners.forEach(listener => {
            if (typeof listener === 'function') {
                listener(data);
            }
        });
    }

    /**
     * Handle LOD updates
     */
    _onLODUpdated(data) {
        this.space.emit('ui:fractalZoom:lodUpdated', data);
    }

    /**
     * Create default content adapter for a node
     */
    _createDefaultContentAdapter(nodeId, node) {
        if (!node.htmlElement) return;
        
        const content = node.htmlElement.querySelector('.node-content');
        if (!content) return;
        
        const text = content.textContent || content.innerHTML;
        
        // Determine adapter type based on content
        let adapter;
        
        if (text.length > 200) {
            // Long text - create progressive text adapter
            adapter = createContentAdapter(nodeId, 'text');
            
            const summary = this._extractSummary(text);
            const detail = this._extractDetail(text);
            
            adapter.defineProgressiveText(summary, detail, text);
        } else if (content.querySelector('table, chart, canvas')) {
            // Data content - create data adapter
            adapter = createContentAdapter(nodeId, 'data');
            // TODO: Extract and process data for different zoom levels
        } else {
            // Simple content - create basic HTML adapter
            adapter = createContentAdapter(nodeId, 'html');
            adapter.defineHTMLLevel(-10, 10, text);
        }
        
        if (adapter) {
            this.addContentAdapter(nodeId, adapter);
        }
    }

    /**
     * Extract summary from text content
     */
    _extractSummary(text) {
        // Simple summary extraction - first sentence or first 50 characters
        const firstSentence = text.match(/[^\.!?]*[\.!?]/);
        if (firstSentence) {
            return firstSentence[0].trim();
        }
        return text.substring(0, 50) + (text.length > 50 ? '...' : '');
    }

    /**
     * Extract detail from text content
     */
    _extractDetail(text) {
        // Medium detail - first paragraph or first 150 characters
        const firstParagraph = text.split('\n')[0];
        if (firstParagraph.length > 20) {
            return firstParagraph;
        }
        return text.substring(0, 150) + (text.length > 150 ? '...' : '');
    }

    /**
     * Zoom to a specific level
     */
    zoomToLevel(level, duration) {
        if (this.fractalZoomManager) {
            this.fractalZoomManager.zoomToLevel(level, duration);
        }
    }

    /**
     * Zoom in by one step
     */
    zoomIn() {
        if (this.fractalZoomManager) {
            this.fractalZoomManager.zoomIn();
        }
    }

    /**
     * Zoom out by one step
     */
    zoomOut() {
        if (this.fractalZoomManager) {
            this.fractalZoomManager.zoomOut();
        }
    }

    /**
     * Reset zoom to default level
     */
    resetZoom(duration) {
        if (this.fractalZoomManager) {
            this.fractalZoomManager.resetZoom(duration);
        }
    }

    /**
     * Get current zoom level
     */
    getZoomLevel() {
        return this.fractalZoomManager ? this.fractalZoomManager.getZoomLevel() : 0;
    }

    /**
     * Get zoom range information
     */
    getZoomRange() {
        return this.fractalZoomManager ? this.fractalZoomManager.getZoomRange() : {
            min: -10, max: 20, current: 0, target: 0
        };
    }

    /**
     * Check if currently transitioning
     */
    isTransitioning() {
        return this.fractalZoomManager ? this.fractalZoomManager.isTransitioningZoom() : false;
    }

    /**
     * Add a content adapter for a specific node
     */
    addContentAdapter(nodeId, adapter) {
        if (this.contentAdapters.has(nodeId)) {
            // Dispose of existing adapter
            this.contentAdapters.get(nodeId).dispose();
        }
        
        this.contentAdapters.set(nodeId, adapter);
        
        if (this.fractalZoomManager) {
            this.fractalZoomManager.registerContentAdapter(nodeId, adapter);
        }
    }

    /**
     * Remove content adapter for a node
     */
    removeContentAdapter(nodeId) {
        if (this.contentAdapters.has(nodeId)) {
            const adapter = this.contentAdapters.get(nodeId);
            adapter.dispose();
            this.contentAdapters.delete(nodeId);
        }
    }

    /**
     * Add custom LOD level
     */
    addLODLevel(zoomLevel, config) {
        if (this.fractalZoomManager) {
            this.fractalZoomManager.addLODLevel(zoomLevel, config);
        }
    }

    /**
     * Add zoom level change listener
     */
    addZoomListener(listener) {
        this.zoomListeners.add(listener);
    }

    /**
     * Remove zoom level change listener
     */
    removeZoomListener(listener) {
        this.zoomListeners.delete(listener);
    }

    /**
     * Enable/disable fractal zoom
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        if (!enabled && this.fractalZoomManager) {
            this.fractalZoomManager.resetZoom(0.5);
        }
    }

    /**
     * Update plugin configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (this.fractalZoomManager) {
            this.fractalZoomManager.zoomStep = this.config.zoomStep;
            this.fractalZoomManager.maxZoomIn = this.config.maxZoomIn;
            this.fractalZoomManager.maxZoomOut = this.config.maxZoomOut;
            this.fractalZoomManager.transitionDuration = this.config.transitionDuration;
        }
    }

    /**
     * Get current LOD configuration
     */
    getCurrentLODConfig() {
        return this.fractalZoomManager ? this.fractalZoomManager.getCurrentLODConfig() : null;
    }

    /**
     * Force LOD update
     */
    updateLOD() {
        if (this.fractalZoomManager) {
            this.fractalZoomManager._updateLOD();
        }
    }

    dispose() {
        super.dispose();
        
        // Clean up content adapters
        this.contentAdapters.forEach(adapter => adapter.dispose());
        this.contentAdapters.clear();
        
        // Clean up zoom listeners
        this.zoomListeners.clear();
        
        // Dispose fractal zoom manager
        if (this.fractalZoomManager) {
            this.fractalZoomManager.dispose();
            this.fractalZoomManager = null;
        }
        
        // Remove API from space
        if (this.space.fractalZoom) {
            delete this.space.fractalZoom;
        }
        
        console.log('FractalZoomPlugin disposed');
    }
}