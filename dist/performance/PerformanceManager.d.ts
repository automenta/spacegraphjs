/**
 * PerformanceManager handles optimization strategies for large-scale graph visualization.
 * Includes instancing, culling, level-of-detail, and memory management.
 */
export class PerformanceManager {
    constructor(spaceGraph: any);
    space: any;
    renderingPlugin: any;
    config: {
        enableInstancing: boolean;
        enableCulling: boolean;
        enableLOD: boolean;
        enableMemoryManagement: boolean;
        instanceThreshold: number;
        maxInstances: number;
        frustumCulling: boolean;
        distanceCulling: boolean;
        maxRenderDistance: number;
        lodLevels: {
            distance: number;
            quality: string;
        }[];
        memoryBudget: number;
        garbageCollectionThreshold: number;
        maxCachedObjects: number;
    };
    stats: {
        totalObjects: number;
        visibleObjects: number;
        instancedObjects: number;
        culledObjects: number;
        memoryUsage: number;
        frameTime: number;
        avgFrameTime: number;
    };
    instanceManager: InstanceManager;
    cullingManager: CullingManager;
    lodManager: LODManager;
    memoryManager: MemoryManager;
    frameTimeHistory: any[];
    maxFrameHistory: number;
    lastFrameTime: number;
    /**
     * Initialize performance manager with rendering plugin
     */
    init(renderingPlugin: any): void;
    /**
     * Bind to relevant events
     */
    _bindEvents(): void;
    /**
     * Handle node addition
     */
    _onNodeAdded(nodeId: any, node: any): void;
    /**
     * Handle node removal
     */
    _onNodeRemoved(nodeId: any, node: any): void;
    /**
     * Handle edge addition
     */
    _onEdgeAdded(edgeId: any, edge: any): void;
    /**
     * Handle edge removal
     */
    _onEdgeRemoved(edgeId: any, edge: any): void;
    /**
     * Handle camera changes for culling and LOD updates
     */
    _onCameraChanged(data: any): void;
    /**
     * Main update loop - should be called every frame
     */
    update(): void;
    /**
     * Update frame time statistics
     */
    _updateFrameStats(frameTime: any): void;
    /**
     * Update performance statistics
     */
    _updateStats(): void;
    /**
     * Get current performance statistics
     */
    getStats(): {
        totalObjects: number;
        visibleObjects: number;
        instancedObjects: number;
        culledObjects: number;
        memoryUsage: number;
        frameTime: number;
        avgFrameTime: number;
    };
    /**
     * Get detailed performance report
     */
    getPerformanceReport(): {
        stats: {
            totalObjects: number;
            visibleObjects: number;
            instancedObjects: number;
            culledObjects: number;
            memoryUsage: number;
            frameTime: number;
            avgFrameTime: number;
        };
        config: {
            enableInstancing: boolean;
            enableCulling: boolean;
            enableLOD: boolean;
            enableMemoryManagement: boolean;
            instanceThreshold: number;
            maxInstances: number;
            frustumCulling: boolean;
            distanceCulling: boolean;
            maxRenderDistance: number;
            lodLevels: {
                distance: number;
                quality: string;
            }[];
            memoryBudget: number;
            garbageCollectionThreshold: number;
            maxCachedObjects: number;
        };
        instancing: {
            enabled: boolean;
            groupCount: number;
            instancedCount: number;
            registeredCount: number;
        };
        culling: {
            enabled: boolean;
            visibleCount: number;
            culledCount: number;
        };
        lod: {
            enabled: boolean;
            aggressiveMode: boolean;
            objectCount: number;
            lodDistribution: {};
        };
        memory: {
            enabled: boolean;
            memoryUsage: number;
            cachedObjectCount: number;
            lastCleanup: number;
        };
    };
    /**
     * Update performance configuration
     */
    updateConfig(newConfig: any): void;
    /**
     * Optimize performance based on current conditions
     */
    optimizePerformance(): void;
    /**
     * Force garbage collection and cleanup
     */
    cleanup(): void;
    /**
     * Dispose of the performance manager
     */
    dispose(): void;
}
/**
 * InstanceManager handles object instancing for improved performance
 */
declare class InstanceManager {
    constructor(performanceManager: any);
    perfManager: any;
    enabled: boolean;
    instanceGroups: Map<any, any>;
    registeredObjects: Map<any, any>;
    instancedCount: number;
    init(renderingPlugin: any): void;
    renderingPlugin: any;
    registerObject(object: any): void;
    unregisterObject(object: any): void;
    _getGeometryKey(object: any): string;
    _createInstancedMesh(geometryKey: any): void;
    _destroyInstancedMesh(geometryKey: any): void;
    getInstancedCount(): number;
    setEnabled(enabled: any): void;
    getReport(): {
        enabled: boolean;
        groupCount: number;
        instancedCount: number;
        registeredCount: number;
    };
    cleanup(): void;
    dispose(): void;
}
/**
 * CullingManager handles frustum and distance culling
 */
declare class CullingManager {
    constructor(performanceManager: any);
    perfManager: any;
    enabled: boolean;
    camera: any;
    frustum: any;
    cameraMatrix: any;
    visibleObjects: Set<any>;
    culledObjects: Set<any>;
    lastCameraPosition: any;
    cameraMovedThreshold: number;
    init(renderingPlugin: any): void;
    renderingPlugin: any;
    updateCulling(): void;
    _testObjectCulling(object: any): void;
    update(): void;
    getVisibleCount(): number;
    setEnabled(enabled: any): void;
    getReport(): {
        enabled: boolean;
        visibleCount: number;
        culledCount: number;
    };
    cleanup(): void;
    dispose(): void;
}
/**
 * LODManager handles level-of-detail optimization
 */
declare class LODManager {
    constructor(performanceManager: any);
    perfManager: any;
    enabled: boolean;
    aggressiveMode: boolean;
    camera: any;
    lodObjects: Map<any, any>;
    init(renderingPlugin: any): void;
    renderingPlugin: any;
    registerObject(object: any): void;
    unregisterObject(object: any): void;
    updateLOD(): void;
    _calculateLOD(distance: any): any;
    _applyLOD(object: any, lodLevel: any): void;
    _applyHighLOD(object: any): void;
    _applyMediumLOD(object: any): void;
    _applyLowLOD(object: any): void;
    _applyMinimalLOD(object: any): void;
    update(): void;
    setEnabled(enabled: any): void;
    setAggressiveMode(aggressive: any): void;
    getReport(): {
        enabled: boolean;
        aggressiveMode: boolean;
        objectCount: number;
        lodDistribution: {};
    };
    cleanup(): void;
    dispose(): void;
}
/**
 * MemoryManager handles memory optimization and garbage collection
 */
declare class MemoryManager {
    constructor(performanceManager: any);
    perfManager: any;
    enabled: boolean;
    memoryUsage: number;
    cachedObjects: Map<any, any>;
    lastCleanup: number;
    cleanupInterval: number;
    init(): void;
    update(): void;
    _isMemoryPressureHigh(): boolean;
    _performCleanup(): void;
    forceCleanup(): void;
    getMemoryUsage(): number;
    setEnabled(enabled: any): void;
    getReport(): {
        enabled: boolean;
        memoryUsage: number;
        cachedObjectCount: number;
        lastCleanup: number;
    };
    cleanup(): void;
    dispose(): void;
}
export {};
