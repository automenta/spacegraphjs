/**
 * PerformancePlugin integrates all performance optimization features into SpaceGraphJS.
 * Handles instancing, culling, LOD, memory management, and web worker coordination.
 */
export class PerformancePlugin extends Plugin {
    constructor(spaceGraph: any, pluginManager: any, config?: {});
    config: {
        enabled: boolean;
        enableInstancing: boolean;
        enableCulling: boolean;
        enableLOD: boolean;
        enableMemoryManagement: boolean;
        enableWorkers: boolean;
        autoOptimize: boolean;
        optimizationInterval: number;
        targetFrameRate: number;
        performanceThreshold: number;
    };
    performanceManager: PerformanceManager;
    workerManager: WorkerManager;
    layoutWorkerManager: LayoutWorkerManager;
    optimizationTimer: NodeJS.Timeout;
    performanceMetrics: {
        frameRate: number;
        frameTime: number;
        memoryUsage: number;
        objectCount: number;
    };
    isMonitoring: boolean;
    /**
     * Initialize web workers
     */
    _initializeWorkers(): Promise<void>;
    /**
     * Subscribe to relevant events
     */
    _subscribeToEvents(): void;
    /**
     * Start performance monitoring
     */
    _startPerformanceMonitoring(): void;
    /**
     * Stop performance monitoring
     */
    _stopPerformanceMonitoring(): void;
    /**
     * Update performance metrics
     */
    _updatePerformanceMetrics(): void;
    /**
     * Check performance thresholds and trigger optimizations
     */
    _checkPerformanceThresholds(): void;
    /**
     * Trigger performance optimizations
     */
    _triggerOptimizations(): void;
    /**
     * Handle graph changes
     */
    _onGraphChanged(data: any): void;
    /**
     * Handle layout calculation requests
     */
    _onLayoutCalculate(data: any): Promise<void>;
    /**
     * Expose performance API to SpaceGraph
     */
    _exposePerformanceAPI(): void;
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics(): {
        frameRate: number;
        frameTime: number;
        memoryUsage: number;
        objectCount: number;
    };
    /**
     * Get detailed performance report
     */
    getDetailedPerformanceReport(): {
        error: string;
        metrics?: undefined;
        manager?: undefined;
        workers?: undefined;
        config?: undefined;
    } | {
        metrics: {
            frameRate: number;
            frameTime: number;
            memoryUsage: number;
            objectCount: number;
        };
        manager: {
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
        workers: {
            enableWorkers: boolean;
            totalWorkers: number;
            workerPools: number;
            activeJobs: number;
            queuedJobs: number;
            workers: {};
        };
        config: {
            enabled: boolean;
            enableInstancing: boolean;
            enableCulling: boolean;
            enableLOD: boolean;
            enableMemoryManagement: boolean;
            enableWorkers: boolean;
            autoOptimize: boolean;
            optimizationInterval: number;
            targetFrameRate: number;
            performanceThreshold: number;
        };
        error?: undefined;
    };
    /**
     * Update performance configuration
     */
    updatePerformanceConfig(newConfig: any): void;
    /**
     * Manually trigger performance optimization
     */
    optimizePerformance(): void;
    /**
     * Cleanup performance resources
     */
    cleanupPerformance(): void;
    /**
     * Enable/disable instancing
     */
    setInstancingEnabled(enabled: any): void;
    /**
     * Enable/disable culling
     */
    setCullingEnabled(enabled: any): void;
    /**
     * Enable/disable LOD
     */
    setLODEnabled(enabled: any): void;
    /**
     * Enable/disable workers
     */
    setWorkersEnabled(enabled: any): void;
    /**
     * Get worker statistics
     */
    getWorkerStats(): {
        workerManager: {
            enableWorkers: boolean;
            totalWorkers: number;
            workerPools: number;
            activeJobs: number;
            queuedJobs: number;
            workers: {};
        };
        layoutWorkerManager: {
            enableWorkers: boolean;
            totalWorkers: number;
            workerPools: number;
            activeJobs: number;
            queuedJobs: number;
            workers: {};
        };
    };
    /**
     * Terminate all workers
     */
    terminateWorkers(): void;
    /**
     * Check if performance features are enabled
     */
    isEnabled(): boolean;
    /**
     * Enable/disable the entire performance plugin
     */
    setEnabled(enabled: any): void;
    /**
     * Get performance status
     */
    getStatus(): {
        enabled: boolean;
        monitoring: boolean;
        instancing: boolean;
        culling: boolean;
        lod: boolean;
        workers: boolean;
        workerStats: {
            workerManager: {
                enableWorkers: boolean;
                totalWorkers: number;
                workerPools: number;
                activeJobs: number;
                queuedJobs: number;
                workers: {};
            };
            layoutWorkerManager: {
                enableWorkers: boolean;
                totalWorkers: number;
                workerPools: number;
                activeJobs: number;
                queuedJobs: number;
                workers: {};
            };
        };
    };
}
import { Plugin } from '../core/Plugin.js';
import { PerformanceManager } from '../performance/PerformanceManager.js';
import { WorkerManager } from '../performance/WorkerManager.js';
import { LayoutWorkerManager } from '../performance/WorkerManager.js';
