import { Plugin } from '../core/Plugin.js';
import { PerformanceManager } from '../performance/PerformanceManager.js';
import { WorkerManager, LayoutWorkerManager } from '../performance/WorkerManager.js';

/**
 * PerformancePlugin integrates all performance optimization features into SpaceGraphJS.
 * Handles instancing, culling, LOD, memory management, and web worker coordination.
 */
export class PerformancePlugin extends Plugin {
    constructor(spaceGraph, pluginManager, config = {}) {
        super(spaceGraph, pluginManager);
        
        this.config = {
            enabled: true,
            
            // Performance features
            enableInstancing: true,
            enableCulling: true,
            enableLOD: true,
            enableMemoryManagement: true,
            enableWorkers: true,
            
            // Auto-optimization
            autoOptimize: true,
            optimizationInterval: 5000, // 5 seconds
            
            // Performance thresholds
            targetFrameRate: 60,
            performanceThreshold: 0.8, // Optimize when performance drops below 80%
            
            ...config
        };
        
        this.performanceManager = null;
        this.workerManager = null;
        this.layoutWorkerManager = null;
        
        this.optimizationTimer = null;
        this.performanceMetrics = {
            frameRate: 60,
            frameTime: 16.67,
            memoryUsage: 0,
            objectCount: 0
        };
        
        this.isMonitoring = false;
    }

    getName() {
        return 'PerformancePlugin';
    }

    init() {
        super.init();
        
        if (!this.config.enabled) {
            console.log('PerformancePlugin disabled');
            return;
        }
        
        // Initialize performance manager
        this.performanceManager = new PerformanceManager(this.space);
        
        // Initialize worker managers
        this.workerManager = new WorkerManager();
        this.layoutWorkerManager = new LayoutWorkerManager();
        
        // Get rendering plugin reference
        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (renderingPlugin) {
            this.performanceManager.init(renderingPlugin);
        }
        
        // Initialize worker managers
        if (this.config.enableWorkers) {
            this._initializeWorkers();
        }
        
        // Setup performance monitoring
        if (this.config.autoOptimize) {
            this._startPerformanceMonitoring();
        }
        
        // Expose performance API
        this._exposePerformanceAPI();
        
        // Subscribe to events
        this._subscribeToEvents();
        
        // console.log('PerformancePlugin initialized');
    }

    /**
     * Initialize web workers
     */
    async _initializeWorkers() {
        try {
            await this.layoutWorkerManager.init();
            // console.log('Performance workers initialized');
        } catch (error) {
            console.error('Failed to initialize performance workers:', error);
        }
    }

    /**
     * Subscribe to relevant events
     */
    _subscribeToEvents() {
        // Update performance manager on render loop
        this.space.on('render:beforeRender', () => {
            if (this.performanceManager) {
                this.performanceManager.update();
            }
        });
        
        // Monitor graph changes
        this.space.on('graph:changed', this._onGraphChanged.bind(this));
        
        // Handle layout requests with workers
        this.space.on('layout:calculate', this._onLayoutCalculate.bind(this));
    }

    /**
     * Start performance monitoring
     */
    _startPerformanceMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        this.optimizationTimer = setInterval(() => {
            this._updatePerformanceMetrics();
            this._checkPerformanceThresholds();
        }, this.config.optimizationInterval);
        
        // console.log('Performance monitoring started');
    }

    /**
     * Stop performance monitoring
     */
    _stopPerformanceMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.optimizationTimer) {
            clearInterval(this.optimizationTimer);
            this.optimizationTimer = null;
        }
        
        // console.log('Performance monitoring stopped');
    }

    /**
     * Update performance metrics
     */
    _updatePerformanceMetrics() {
        if (!this.performanceManager) return;
        
        const stats = this.performanceManager.getStats();
        
        this.performanceMetrics = {
            frameRate: 1000 / stats.avgFrameTime,
            frameTime: stats.avgFrameTime,
            memoryUsage: stats.memoryUsage,
            objectCount: stats.totalObjects,
            visibleObjects: stats.visibleObjects,
            instancedObjects: stats.instancedObjects
        };
        
        // Emit performance update event
        this.space.emit('performance:update', this.performanceMetrics);
    }

    /**
     * Check performance thresholds and trigger optimizations
     */
    _checkPerformanceThresholds() {
        const targetFrameTime = 1000 / this.config.targetFrameRate;
        const performanceRatio = targetFrameTime / this.performanceMetrics.frameTime;
        
        if (performanceRatio < this.config.performanceThreshold) {
            console.log(`Performance below threshold (${(performanceRatio * 100).toFixed(1)}%), triggering optimizations`);
            this._triggerOptimizations();
        }
    }

    /**
     * Trigger performance optimizations
     */
    _triggerOptimizations() {
        if (!this.performanceManager) return;
        
        // Run automatic performance optimization
        this.performanceManager.optimizePerformance();
        
        // Emit optimization event
        this.space.emit('performance:optimized', {
            reason: 'automatic',
            metrics: this.performanceMetrics
        });
    }

    /**
     * Handle graph changes
     */
    _onGraphChanged(data) {
        // Force performance update on significant graph changes
        if (data.changeType === 'major' || data.objectsChanged > 10) {
            this._updatePerformanceMetrics();
        }
    }

    /**
     * Handle layout calculation requests
     */
    async _onLayoutCalculate(data) {
        if (!this.config.enableWorkers || !this.layoutWorkerManager.initialized) {
            // Fall back to main thread
            return;
        }
        
        try {
            const { layoutType, nodes, edges, config } = data;
            
            const result = await this.layoutWorkerManager.calculateLayout(
                layoutType,
                nodes,
                edges,
                config
            );
            
            // Apply results
            this.space.emit('layout:result', result);
            
        } catch (error) {
            console.error('Worker layout calculation failed:', error);
            this.space.emit('layout:error', error);
        }
    }

    /**
     * Expose performance API to SpaceGraph
     */
    _exposePerformanceAPI() {
        this.space.performance = {
            // Performance monitoring
            getMetrics: () => this.getPerformanceMetrics(),
            getDetailedReport: () => this.getDetailedPerformanceReport(),
            
            // Configuration
            updateConfig: (config) => this.updatePerformanceConfig(config),
            getConfig: () => ({ ...this.config }),
            
            // Manual optimization
            optimize: () => this.optimizePerformance(),
            cleanup: () => this.cleanupPerformance(),
            
            // Feature controls
            setInstancingEnabled: (enabled) => this.setInstancingEnabled(enabled),
            setCullingEnabled: (enabled) => this.setCullingEnabled(enabled),
            setLODEnabled: (enabled) => this.setLODEnabled(enabled),
            setWorkersEnabled: (enabled) => this.setWorkersEnabled(enabled),
            
            // Worker controls
            getWorkerStats: () => this.getWorkerStats(),
            terminateWorkers: () => this.terminateWorkers(),
            
            // Monitoring controls
            startMonitoring: () => this._startPerformanceMonitoring(),
            stopMonitoring: () => this._stopPerformanceMonitoring(),
            isMonitoring: () => this.isMonitoring
        };
    }

    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    /**
     * Get detailed performance report
     */
    getDetailedPerformanceReport() {
        if (!this.performanceManager) {
            return { error: 'Performance manager not initialized' };
        }
        
        return {
            metrics: this.getPerformanceMetrics(),
            manager: this.performanceManager.getPerformanceReport(),
            workers: this.workerManager ? this.workerManager.getStats() : null,
            config: { ...this.config }
        };
    }

    /**
     * Update performance configuration
     */
    updatePerformanceConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // Apply configuration changes
        if (this.performanceManager) {
            this.performanceManager.updateConfig(this.config);
        }
        
        if (this.workerManager) {
            this.workerManager.updateConfig(this.config);
        }
        
        // Handle monitoring changes
        if (oldConfig.autoOptimize !== this.config.autoOptimize) {
            if (this.config.autoOptimize) {
                this._startPerformanceMonitoring();
            } else {
                this._stopPerformanceMonitoring();
            }
        }
        
        this.space.emit('performance:configChanged', { oldConfig, newConfig: this.config });
    }

    /**
     * Manually trigger performance optimization
     */
    optimizePerformance() {
        if (this.performanceManager) {
            this.performanceManager.optimizePerformance();
            this.space.emit('performance:optimized', { reason: 'manual' });
        }
    }

    /**
     * Cleanup performance resources
     */
    cleanupPerformance() {
        if (this.performanceManager) {
            this.performanceManager.cleanup();
        }
        
        if (this.workerManager) {
            this.workerManager.cleanupIdleWorkers();
        }
        
        this.space.emit('performance:cleanup');
    }

    /**
     * Enable/disable instancing
     */
    setInstancingEnabled(enabled) {
        this.config.enableInstancing = enabled;
        if (this.performanceManager) {
            this.performanceManager.updateConfig({ enableInstancing: enabled });
        }
    }

    /**
     * Enable/disable culling
     */
    setCullingEnabled(enabled) {
        this.config.enableCulling = enabled;
        if (this.performanceManager) {
            this.performanceManager.updateConfig({ enableCulling: enabled });
        }
    }

    /**
     * Enable/disable LOD
     */
    setLODEnabled(enabled) {
        this.config.enableLOD = enabled;
        if (this.performanceManager) {
            this.performanceManager.updateConfig({ enableLOD: enabled });
        }
    }

    /**
     * Enable/disable workers
     */
    setWorkersEnabled(enabled) {
        this.config.enableWorkers = enabled;
        
        if (this.workerManager) {
            this.workerManager.setEnabled(enabled);
        }
        
        if (this.layoutWorkerManager) {
            this.layoutWorkerManager.setEnabled(enabled);
        }
    }

    /**
     * Get worker statistics
     */
    getWorkerStats() {
        const stats = {
            workerManager: this.workerManager ? this.workerManager.getStats() : null,
            layoutWorkerManager: this.layoutWorkerManager ? this.layoutWorkerManager.getStats() : null
        };
        
        return stats;
    }

    /**
     * Terminate all workers
     */
    terminateWorkers() {
        if (this.workerManager) {
            this.workerManager.terminateAll();
        }
        
        if (this.layoutWorkerManager) {
            this.layoutWorkerManager.terminateAll();
        }
    }

    /**
     * Check if performance features are enabled
     */
    isEnabled() {
        return this.config.enabled;
    }

    /**
     * Enable/disable the entire performance plugin
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        
        if (!enabled) {
            this._stopPerformanceMonitoring();
            this.terminateWorkers();
        } else if (this.config.autoOptimize) {
            this._startPerformanceMonitoring();
        }
    }

    /**
     * Get performance status
     */
    getStatus() {
        return {
            enabled: this.config.enabled,
            monitoring: this.isMonitoring,
            instancing: this.config.enableInstancing,
            culling: this.config.enableCulling,
            lod: this.config.enableLOD,
            workers: this.config.enableWorkers,
            workerStats: this.getWorkerStats()
        };
    }

    dispose() {
        super.dispose();
        
        // Stop monitoring
        this._stopPerformanceMonitoring();
        
        // Dispose of managers
        if (this.performanceManager) {
            this.performanceManager.dispose();
            this.performanceManager = null;
        }
        
        if (this.workerManager) {
            this.workerManager.dispose();
            this.workerManager = null;
        }
        
        if (this.layoutWorkerManager) {
            this.layoutWorkerManager.dispose();
            this.layoutWorkerManager = null;
        }
        
        // Remove API from space
        if (this.space.performance) {
            delete this.space.performance;
        }
        
        // console.log('PerformancePlugin disposed');
    }
}