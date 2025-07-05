/**
 * FractalZoomManager provides infinite zoom capabilities with level-of-detail management.
 * This is the core component for implementing a true ZUI (Zooming User Interface).
 */
export class FractalZoomManager {
    constructor(spaceGraph: any);
    space: any;
    cameraPlugin: any;
    currentZoomLevel: number;
    targetZoomLevel: number;
    zoomTransitionTween: gsap.core.Tween;
    lodLevels: Map<any, any>;
    zoomThresholds: any[];
    contentAdapters: Map<any, any>;
    zoomStep: number;
    maxZoomIn: number;
    maxZoomOut: number;
    transitionDuration: number;
    lodUpdateThreshold: number;
    memoryBudget: number;
    isTransitioning: boolean;
    /**
     * Initialize default LOD levels with different detail configurations
     */
    _initializeLODLevels(): void;
    /**
     * Bind event listeners for zoom interactions
     */
    _bindEvents(): void;
    /**
     * Initialize with camera plugin reference
     */
    init(cameraPlugin: any): void;
    /**
     * Handle zoom requests from UI interactions
     */
    _onZoomRequest(deltaY: any): void;
    /**
     * Handle direct zoom level setting
     */
    _onSetZoomLevel(zoomLevel: any): void;
    /**
     * Handle camera changes that might affect zoom level
     */
    _onCameraChanged(data: any): void;
    /**
     * Calculate current zoom level based on camera distance
     */
    _calculateZoomLevelFromCamera(): void;
    /**
     * Zoom to a specific level with smooth transition
     */
    zoomToLevel(targetLevel: any, duration?: number): void;
    /**
     * Update camera position based on current zoom level
     */
    _updateCameraForZoomLevel(): void;
    /**
     * Update level-of-detail for all graph elements
     */
    _updateLOD(): void;
    /**
     * Get current LOD configuration based on zoom level
     */
    getCurrentLODConfig(): any;
    /**
     * Update LOD for a specific node
     */
    _updateNodeLOD(node: any, lodConfig: any): void;
    /**
     * Update LOD for a specific edge
     */
    _updateEdgeLOD(edge: any, lodConfig: any): void;
    /**
     * Calculate scale multiplier for current LOD
     */
    _calculateScaleMultiplier(lodConfig: any): number;
    /**
     * Get line width multiplier for edge detail level
     */
    _getLineWidthMultiplier(detailLevel: any): 2 | 1 | 0 | 0.5 | 1.5;
    /**
     * Get opacity multiplier for edge detail level
     */
    _getOpacityMultiplier(detailLevel: any): 1 | 0 | 0.3 | 0.7;
    /**
     * Add custom LOD configuration
     */
    addLODLevel(zoomLevel: any, config: any): void;
    /**
     * Register a content adapter for a specific node
     */
    registerContentAdapter(nodeId: any, adapter: any): void;
    /**
     * Apply content adapters for current zoom level
     */
    _applyContentAdapters(): void;
    /**
     * Get current zoom level
     */
    getZoomLevel(): number;
    /**
     * Get zoom range
     */
    getZoomRange(): {
        min: number;
        max: number;
        current: number;
        target: number;
    };
    /**
     * Reset zoom to default level
     */
    resetZoom(duration?: number): void;
    /**
     * Zoom in by one step
     */
    zoomIn(): void;
    /**
     * Zoom out by one step
     */
    zoomOut(): void;
    /**
     * Check if currently transitioning
     */
    isTransitioningZoom(): boolean;
    /**
     * Dispose of the fractal zoom manager
     */
    dispose(): void;
}
