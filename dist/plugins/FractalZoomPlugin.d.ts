/**
 * FractalZoomPlugin integrates fractal zooming capabilities into SpaceGraphJS.
 * This plugin provides infinite zoom with level-of-detail management and content adaptation.
 */
export class FractalZoomPlugin extends Plugin {
    constructor(spaceGraph: any, pluginManager: any, config?: {});
    config: {
        enabled: boolean;
        autoLOD: boolean;
        zoomStep: number;
        maxZoomIn: number;
        maxZoomOut: number;
        transitionDuration: number;
    };
    fractalZoomManager: FractalZoomManager;
    contentAdapters: Map<any, any>;
    zoomListeners: Set<any>;
    /**
     * Subscribe to relevant events
     */
    _subscribeToEvents(): void;
    /**
     * Setup default content adapters for different node types
     */
    _setupDefaultContentAdapters(): void;
    /**
     * Handle node addition
     */
    _onNodeAdded(nodeId: any, node: any): void;
    /**
     * Handle node removal
     */
    _onNodeRemoved(nodeId: any, node: any): void;
    /**
     * Handle zoom level changes
     */
    _onZoomLevelChanged(data: any): void;
    /**
     * Handle LOD updates
     */
    _onLODUpdated(data: any): void;
    /**
     * Create default content adapter for a node
     */
    _createDefaultContentAdapter(nodeId: any, node: any): void;
    /**
     * Extract summary from text content
     */
    _extractSummary(text: any): any;
    /**
     * Extract detail from text content
     */
    _extractDetail(text: any): any;
    /**
     * Zoom to a specific level
     */
    zoomToLevel(level: any, duration: any): void;
    /**
     * Zoom in by one step
     */
    zoomIn(): void;
    /**
     * Zoom out by one step
     */
    zoomOut(): void;
    /**
     * Reset zoom to default level
     */
    resetZoom(duration: any): void;
    /**
     * Get current zoom level
     */
    getZoomLevel(): number;
    /**
     * Get zoom range information
     */
    getZoomRange(): {
        min: number;
        max: number;
        current: number;
        target: number;
    };
    /**
     * Check if currently transitioning
     */
    isTransitioning(): boolean;
    /**
     * Add a content adapter for a specific node
     */
    addContentAdapter(nodeId: any, adapter: any): void;
    /**
     * Remove content adapter for a node
     */
    removeContentAdapter(nodeId: any): void;
    /**
     * Add custom LOD level
     */
    addLODLevel(zoomLevel: any, config: any): void;
    /**
     * Add zoom level change listener
     */
    addZoomListener(listener: any): void;
    /**
     * Remove zoom level change listener
     */
    removeZoomListener(listener: any): void;
    /**
     * Enable/disable fractal zoom
     */
    setEnabled(enabled: any): void;
    /**
     * Update plugin configuration
     */
    updateConfig(newConfig: any): void;
    /**
     * Get current LOD configuration
     */
    getCurrentLODConfig(): any;
    /**
     * Force LOD update
     */
    updateLOD(): void;
}
import { Plugin } from '../core/Plugin.js';
import { FractalZoomManager } from '../zoom/FractalZoomManager.js';
