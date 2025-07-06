import * as THREE from 'three';

/**
 * PerformanceManager handles optimization strategies for large-scale graph visualization.
 * Includes instancing, culling, level-of-detail, and memory management.
 */
export class PerformanceManager {
    constructor(spaceGraph) {
        this.space = spaceGraph;
        this.renderingPlugin = null;
        
        // Performance configuration
        this.config = {
            enableInstancing: true,
            enableCulling: true,
            enableLOD: true,
            enableMemoryManagement: true,
            
            // Instancing thresholds
            instanceThreshold: 10, // Minimum objects to enable instancing
            maxInstances: 1000,    // Maximum instances per batch
            
            // Culling configuration
            frustumCulling: true,
            distanceCulling: true,
            maxRenderDistance: 10000,
            
            // LOD configuration
            lodLevels: [
                { distance: 100, quality: 'high' },
                { distance: 500, quality: 'medium' },
                { distance: 1500, quality: 'low' },
                { distance: 5000, quality: 'minimal' }
            ],
            
            // Memory management
            memoryBudget: 512 * 1024 * 1024, // 512MB
            garbageCollectionThreshold: 0.8,  // Trigger GC at 80% memory
            maxCachedObjects: 1000
        };
        
        // Performance tracking
        this.stats = {
            totalObjects: 0,
            visibleObjects: 0,
            instancedObjects: 0,
            culledObjects: 0,
            memoryUsage: 0,
            frameTime: 0,
            avgFrameTime: 0
        };
        
        // Performance systems
        this.instanceManager = new InstanceManager(this);
        this.cullingManager = new CullingManager(this);
        this.lodManager = new LODManager(this);
        this.memoryManager = new MemoryManager(this);
        
        // Performance monitoring
        this.frameTimeHistory = [];
        this.maxFrameHistory = 60; // Keep 1 second of history at 60fps
        this.lastFrameTime = performance.now();
        
        this._bindEvents();
    }

    /**
     * Initialize performance manager with rendering plugin
     */
    init(renderingPlugin) {
        this.renderingPlugin = renderingPlugin;
        this.instanceManager.init(renderingPlugin);
        this.cullingManager.init(renderingPlugin);
        this.lodManager.init(renderingPlugin);
        this.memoryManager.init();
        
        // console.log('PerformanceManager initialized');
    }

    /**
     * Bind to relevant events
     */
    _bindEvents() {
        this.space.on('node:added', this._onNodeAdded.bind(this));
        this.space.on('node:removed', this._onNodeRemoved.bind(this));
        this.space.on('edge:added', this._onEdgeAdded.bind(this));
        this.space.on('edge:removed', this._onEdgeRemoved.bind(this));
        this.space.on('camera:changed', this._onCameraChanged.bind(this));
    }

    /**
     * Handle node addition
     */
    _onNodeAdded(nodeId, node) {
        this.stats.totalObjects++;
        
        if (this.config.enableInstancing) {
            this.instanceManager.registerObject(node);
        }
        
        if (this.config.enableLOD) {
            this.lodManager.registerObject(node);
        }
    }

    /**
     * Handle node removal
     */
    _onNodeRemoved(nodeId, node) {
        this.stats.totalObjects--;
        
        if (this.config.enableInstancing) {
            this.instanceManager.unregisterObject(node);
        }
        
        if (this.config.enableLOD) {
            this.lodManager.unregisterObject(node);
        }
    }

    /**
     * Handle edge addition
     */
    _onEdgeAdded(edgeId, edge) {
        this.stats.totalObjects++;
        
        if (this.config.enableInstancing) {
            this.instanceManager.registerObject(edge);
        }
        
        if (this.config.enableLOD) {
            this.lodManager.registerObject(edge);
        }
    }

    /**
     * Handle edge removal
     */
    _onEdgeRemoved(edgeId, edge) {
        this.stats.totalObjects--;
        
        if (this.config.enableInstancing) {
            this.instanceManager.unregisterObject(edge);
        }
        
        if (this.config.enableLOD) {
            this.lodManager.unregisterObject(edge);
        }
    }

    /**
     * Handle camera changes for culling and LOD updates
     */
    _onCameraChanged(data) {
        if (this.config.enableCulling) {
            this.cullingManager.updateCulling();
        }
        
        if (this.config.enableLOD) {
            this.lodManager.updateLOD();
        }
    }

    /**
     * Main update loop - should be called every frame
     */
    update() {
        const currentTime = performance.now();
        const frameTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Update frame time statistics
        this._updateFrameStats(frameTime);
        
        // Update performance systems
        if (this.config.enableCulling) {
            this.cullingManager.update();
        }
        
        if (this.config.enableLOD) {
            this.lodManager.update();
        }
        
        if (this.config.enableMemoryManagement) {
            this.memoryManager.update();
        }
        
        // Update statistics
        this._updateStats();
    }

    /**
     * Update frame time statistics
     */
    _updateFrameStats(frameTime) {
        this.stats.frameTime = frameTime;
        this.frameTimeHistory.push(frameTime);
        
        if (this.frameTimeHistory.length > this.maxFrameHistory) {
            this.frameTimeHistory.shift();
        }
        
        // Calculate average frame time
        const total = this.frameTimeHistory.reduce((sum, time) => sum + time, 0);
        this.stats.avgFrameTime = total / this.frameTimeHistory.length;
    }

    /**
     * Update performance statistics
     */
    _updateStats() {
        this.stats.visibleObjects = this.cullingManager.getVisibleCount();
        this.stats.instancedObjects = this.instanceManager.getInstancedCount();
        this.stats.culledObjects = this.stats.totalObjects - this.stats.visibleObjects;
        this.stats.memoryUsage = this.memoryManager.getMemoryUsage();
    }

    /**
     * Get current performance statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Get detailed performance report
     */
    getPerformanceReport() {
        return {
            stats: this.getStats(),
            config: { ...this.config },
            instancing: this.instanceManager.getReport(),
            culling: this.cullingManager.getReport(),
            lod: this.lodManager.getReport(),
            memory: this.memoryManager.getReport()
        };
    }

    /**
     * Update performance configuration
     */
    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // Notify subsystems of config changes
        if (oldConfig.enableInstancing !== this.config.enableInstancing) {
            this.instanceManager.setEnabled(this.config.enableInstancing);
        }
        
        if (oldConfig.enableCulling !== this.config.enableCulling) {
            this.cullingManager.setEnabled(this.config.enableCulling);
        }
        
        if (oldConfig.enableLOD !== this.config.enableLOD) {
            this.lodManager.setEnabled(this.config.enableLOD);
        }
    }

    /**
     * Optimize performance based on current conditions
     */
    optimizePerformance() {
        const stats = this.getStats();
        const avgFrameTime = stats.avgFrameTime;
        const targetFrameTime = 16.67; // 60 FPS
        
        if (avgFrameTime > targetFrameTime * 1.5) {
            // Performance is poor, enable more aggressive optimizations
            // console.log('Performance degraded, enabling aggressive optimizations');
            
            this.updateConfig({
                enableInstancing: true,
                enableCulling: true,
                maxRenderDistance: Math.max(1000, this.config.maxRenderDistance * 0.8),
                instanceThreshold: Math.max(5, this.config.instanceThreshold - 2)
            });
            
            // Force LOD to lower quality
            this.lodManager.setAggressiveMode(true);
            
        } else if (avgFrameTime < targetFrameTime * 0.8) {
            // Performance is good, can afford higher quality
            this.updateConfig({
                maxRenderDistance: Math.min(10000, this.config.maxRenderDistance * 1.1),
                instanceThreshold: Math.min(20, this.config.instanceThreshold + 1)
            });
            
            this.lodManager.setAggressiveMode(false);
        }
    }

    /**
     * Force garbage collection and cleanup
     */
    cleanup() {
        this.memoryManager.forceCleanup();
        this.instanceManager.cleanup();
        this.cullingManager.cleanup();
        this.lodManager.cleanup();
    }

    /**
     * Dispose of the performance manager
     */
    dispose() {
        this.space.off('node:added', this._onNodeAdded.bind(this));
        this.space.off('node:removed', this._onNodeRemoved.bind(this));
        this.space.off('edge:added', this._onEdgeAdded.bind(this));
        this.space.off('edge:removed', this._onEdgeRemoved.bind(this));
        this.space.off('camera:changed', this._onCameraChanged.bind(this));
        
        this.instanceManager.dispose();
        this.cullingManager.dispose();
        this.lodManager.dispose();
        this.memoryManager.dispose();
        
        // console.log('PerformanceManager disposed');
    }
}

/**
 * InstanceManager handles object instancing for improved performance
 */
class InstanceManager {
    constructor(performanceManager) {
        this.perfManager = performanceManager;
        this.enabled = true;
        
        // Instance groups by geometry type
        this.instanceGroups = new Map();
        this.registeredObjects = new Map();
        this.instancedCount = 0;
    }

    init(renderingPlugin) {
        this.renderingPlugin = renderingPlugin;
    }

    registerObject(object) {
        if (!this.enabled || !object || !object.object3d) return;
        
        const geometryKey = this._getGeometryKey(object);
        if (!geometryKey) return;
        
        if (!this.instanceGroups.has(geometryKey)) {
            this.instanceGroups.set(geometryKey, {
                objects: [],
                instancedMesh: null,
                needsUpdate: true
            });
        }
        
        const group = this.instanceGroups.get(geometryKey);
        group.objects.push(object);
        group.needsUpdate = true;
        
        this.registeredObjects.set(object.id, geometryKey);
        
        // Check if we should enable instancing for this group
        if (group.objects.length >= this.perfManager.config.instanceThreshold) {
            this._createInstancedMesh(geometryKey);
        }
    }

    unregisterObject(object) {
        const geometryKey = this.registeredObjects.get(object.id);
        if (!geometryKey) return;
        
        const group = this.instanceGroups.get(geometryKey);
        if (group) {
            const index = group.objects.indexOf(object);
            if (index !== -1) {
                group.objects.splice(index, 1);
                group.needsUpdate = true;
            }
            
            // If group becomes too small, disable instancing
            if (group.objects.length < this.perfManager.config.instanceThreshold && group.instancedMesh) {
                this._destroyInstancedMesh(geometryKey);
            }
        }
        
        this.registeredObjects.delete(object.id);
    }

    _getGeometryKey(object) {
        // Generate a key based on object geometry and material
        if (object.object3d && object.object3d.children.length > 0) {
            const child = object.object3d.children[0];
            if (child.geometry && child.material) {
                return `${child.geometry.type}_${child.material.type}`;
            }
        }
        return null;
    }

    _createInstancedMesh(geometryKey) {
        const group = this.instanceGroups.get(geometryKey);
        if (!group || group.objects.length === 0) return;
        
        // Get reference geometry and material
        const refObject = group.objects[0].object3d.children[0];
        const geometry = refObject.geometry;
        const material = refObject.material.clone();
        
        // Create instanced mesh
        const maxInstances = Math.min(group.objects.length, this.perfManager.config.maxInstances);
        const instancedMesh = new THREE.InstancedMesh(geometry, material, maxInstances);
        
        // Set instance transforms
        const matrix = new THREE.Matrix4();
        group.objects.forEach((object, index) => {
            if (index >= maxInstances) return;
            
            matrix.setPosition(object.position.x, object.position.y, object.position.z);
            instancedMesh.setMatrixAt(index, matrix);
            
            // Hide original object
            object.object3d.visible = false;
        });
        
        instancedMesh.instanceMatrix.needsUpdate = true;
        group.instancedMesh = instancedMesh;
        
        // Add to scene
        if (this.renderingPlugin) {
            this.renderingPlugin.getWebGLScene().add(instancedMesh);
        }
        
        this.instancedCount += group.objects.length;
        // console.log(`Created instanced mesh for ${geometryKey} with ${group.objects.length} instances`);
    }

    _destroyInstancedMesh(geometryKey) {
        const group = this.instanceGroups.get(geometryKey);
        if (!group || !group.instancedMesh) return;
        
        // Remove from scene
        if (this.renderingPlugin) {
            this.renderingPlugin.getWebGLScene().remove(group.instancedMesh);
        }
        
        // Show original objects
        group.objects.forEach(object => {
            object.object3d.visible = true;
        });
        
        this.instancedCount -= group.objects.length;
        group.instancedMesh.dispose();
        group.instancedMesh = null;
    }

    getInstancedCount() {
        return this.instancedCount;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (!enabled) {
            // Destroy all instanced meshes
            this.instanceGroups.forEach((group, key) => {
                if (group.instancedMesh) {
                    this._destroyInstancedMesh(key);
                }
            });
        }
    }

    getReport() {
        return {
            enabled: this.enabled,
            groupCount: this.instanceGroups.size,
            instancedCount: this.instancedCount,
            registeredCount: this.registeredObjects.size
        };
    }

    cleanup() {
        // Clean up empty groups
        this.instanceGroups.forEach((group, key) => {
            if (group.objects.length === 0) {
                if (group.instancedMesh) {
                    this._destroyInstancedMesh(key);
                }
                this.instanceGroups.delete(key);
            }
        });
    }

    dispose() {
        this.instanceGroups.forEach((group, key) => {
            if (group.instancedMesh) {
                this._destroyInstancedMesh(key);
            }
        });
        
        this.instanceGroups.clear();
        this.registeredObjects.clear();
    }
}

/**
 * CullingManager handles frustum and distance culling
 */
class CullingManager {
    constructor(performanceManager) {
        this.perfManager = performanceManager;
        this.enabled = true;
        
        this.camera = null;
        this.frustum = new THREE.Frustum();
        this.cameraMatrix = new THREE.Matrix4();
        
        this.visibleObjects = new Set();
        this.culledObjects = new Set();
        
        this.lastCameraPosition = new THREE.Vector3();
        this.cameraMovedThreshold = 10; // Only update culling if camera moved significantly
    }

    init(renderingPlugin) {
        this.renderingPlugin = renderingPlugin;
        
        // Get camera reference
        const cameraPlugin = this.perfManager.space.plugins.getPlugin('CameraPlugin');
        if (cameraPlugin) {
            this.camera = cameraPlugin.getCameraInstance();
        }
    }

    updateCulling() {
        if (!this.enabled || !this.camera) return;
        
        // Check if camera moved significantly
        const currentPos = this.camera.position;
        if (currentPos.distanceTo(this.lastCameraPosition) < this.cameraMovedThreshold) {
            return;
        }
        
        this.lastCameraPosition.copy(currentPos);
        
        // Update frustum
        this.cameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.cameraMatrix);
        
        // Test all objects
        const nodePlugin = this.perfManager.space.plugins.getPlugin('NodePlugin');
        const edgePlugin = this.perfManager.space.plugins.getPlugin('EdgePlugin');

        const nodes = nodePlugin ? nodePlugin.getNodes() : new Map();
        const edges = edgePlugin ? edgePlugin.getEdges() : new Map();
        
        [...nodes.values(), ...edges.values()].forEach(object => {
            this._testObjectCulling(object);
        });
    }

    _testObjectCulling(object) {
        if (!object.object3d) return;
        
        let shouldCull = false;
        
        // Distance culling
        if (this.perfManager.config.distanceCulling && this.camera) {
            const distance = object.position.distanceTo(this.camera.position);
            if (distance > this.perfManager.config.maxRenderDistance) {
                shouldCull = true;
            }
        }
        
        // Frustum culling
        if (!shouldCull && this.perfManager.config.frustumCulling) {
            if (!this.frustum.intersectsObject(object.object3d)) {
                shouldCull = true;
            }
        }
        
        // Update visibility
        if (shouldCull) {
            if (this.visibleObjects.has(object)) {
                this.visibleObjects.delete(object);
                this.culledObjects.add(object);
                object.object3d.visible = false;
            }
        } else {
            if (this.culledObjects.has(object)) {
                this.culledObjects.delete(object);
                this.visibleObjects.add(object);
                object.object3d.visible = true;
            }
        }
    }

    update() {
        // Periodic culling update
        this.updateCulling();
    }

    getVisibleCount() {
        return this.visibleObjects.size;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (!enabled) {
            // Make all objects visible
            this.culledObjects.forEach(object => {
                object.object3d.visible = true;
            });
            this.culledObjects.clear();
        }
    }

    getReport() {
        return {
            enabled: this.enabled,
            visibleCount: this.visibleObjects.size,
            culledCount: this.culledObjects.size
        };
    }

    cleanup() {
        // Nothing specific to clean up
    }

    dispose() {
        this.visibleObjects.clear();
        this.culledObjects.clear();
    }
}

/**
 * LODManager handles level-of-detail optimization
 */
class LODManager {
    constructor(performanceManager) {
        this.perfManager = performanceManager;
        this.enabled = true;
        this.aggressiveMode = false;
        
        this.camera = null;
        this.lodObjects = new Map(); // object -> current LOD level
    }

    init(renderingPlugin) {
        this.renderingPlugin = renderingPlugin;
        
        // Get camera reference
        const cameraPlugin = this.perfManager.space.plugins.getPlugin('CameraPlugin');
        if (cameraPlugin) {
            this.camera = cameraPlugin.getCameraInstance();
        }
    }

    registerObject(object) {
        if (!this.enabled) return;
        this.lodObjects.set(object, 'high');
    }

    unregisterObject(object) {
        this.lodObjects.delete(object);
    }

    updateLOD() {
        if (!this.enabled || !this.camera) return;
        
        this.lodObjects.forEach((currentLOD, object) => {
            const distance = object.position.distanceTo(this.camera.position);
            const newLOD = this._calculateLOD(distance);
            
            if (newLOD !== currentLOD) {
                this._applyLOD(object, newLOD);
                this.lodObjects.set(object, newLOD);
            }
        });
    }

    _calculateLOD(distance) {
        const levels = this.perfManager.config.lodLevels;
        
        for (let i = 0; i < levels.length; i++) {
            if (distance <= levels[i].distance) {
                return levels[i].quality;
            }
        }
        
        return 'minimal';
    }

    _applyLOD(object, lodLevel) {
        if (!object.object3d) return;
        
        // Apply LOD-specific optimizations
        switch (lodLevel) {
            case 'high':
                this._applyHighLOD(object);
                break;
            case 'medium':
                this._applyMediumLOD(object);
                break;
            case 'low':
                this._applyLowLOD(object);
                break;
            case 'minimal':
                this._applyMinimalLOD(object);
                break;
        }
    }

    _applyHighLOD(object) {
        // Full quality rendering
        if (object.object3d.material) {
            object.object3d.material.wireframe = false;
        }
        if (object.labelObject) {
            object.labelObject.visible = true;
        }
    }

    _applyMediumLOD(object) {
        // Reduced quality
        if (object.labelObject) {
            object.labelObject.visible = true;
        }
    }

    _applyLowLOD(object) {
        // Low quality
        if (object.labelObject) {
            object.labelObject.visible = false;
        }
    }

    _applyMinimalLOD(object) {
        // Minimal quality - wireframe or simple shapes
        if (object.object3d.material) {
            object.object3d.material.wireframe = this.aggressiveMode;
        }
        if (object.labelObject) {
            object.labelObject.visible = false;
        }
    }

    update() {
        this.updateLOD();
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (!enabled) {
            // Reset all objects to high LOD
            this.lodObjects.forEach((currentLOD, object) => {
                this._applyLOD(object, 'high');
            });
        }
    }

    setAggressiveMode(aggressive) {
        this.aggressiveMode = aggressive;
        // Force LOD update
        this.updateLOD();
    }

    getReport() {
        const lodCounts = {};
        this.lodObjects.forEach(lod => {
            lodCounts[lod] = (lodCounts[lod] || 0) + 1;
        });
        
        return {
            enabled: this.enabled,
            aggressiveMode: this.aggressiveMode,
            objectCount: this.lodObjects.size,
            lodDistribution: lodCounts
        };
    }

    cleanup() {
        // Nothing specific to clean up
    }

    dispose() {
        this.lodObjects.clear();
    }
}

/**
 * MemoryManager handles memory optimization and garbage collection
 */
class MemoryManager {
    constructor(performanceManager) {
        this.perfManager = performanceManager;
        this.enabled = true;
        
        this.memoryUsage = 0;
        this.cachedObjects = new Map();
        this.lastCleanup = performance.now();
        this.cleanupInterval = 30000; // 30 seconds
    }

    init() {
        // Setup memory monitoring
        if (performance.memory) {
            setInterval(() => {
                this.memoryUsage = performance.memory.usedJSHeapSize;
            }, 1000);
        }
    }

    update() {
        if (!this.enabled) return;
        
        const now = performance.now();
        
        // Periodic cleanup
        if (now - this.lastCleanup > this.cleanupInterval) {
            this._performCleanup();
            this.lastCleanup = now;
        }
        
        // Check memory pressure
        if (this._isMemoryPressureHigh()) {
            this.forceCleanup();
        }
    }

    _isMemoryPressureHigh() {
        if (!performance.memory) return false;
        
        const usageRatio = this.memoryUsage / this.perfManager.config.memoryBudget;
        return usageRatio > this.perfManager.config.garbageCollectionThreshold;
    }

    _performCleanup() {
        // Clean up cached objects
        if (this.cachedObjects.size > this.perfManager.config.maxCachedObjects) {
            const excess = this.cachedObjects.size - this.perfManager.config.maxCachedObjects;
            const keysToDelete = Array.from(this.cachedObjects.keys()).slice(0, excess);
            
            keysToDelete.forEach(key => {
                const obj = this.cachedObjects.get(key);
                if (obj && obj.dispose) {
                    obj.dispose();
                }
                this.cachedObjects.delete(key);
            });
        }
        
        // Suggest garbage collection
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }
    }

    forceCleanup() {
        // console.log('Performing force cleanup due to memory pressure');
        
        // More aggressive cleanup
        this.cachedObjects.clear();
        
        // Force garbage collection
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }
        
        this.lastCleanup = performance.now();
    }

    getMemoryUsage() {
        return this.memoryUsage;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    getReport() {
        return {
            enabled: this.enabled,
            memoryUsage: this.memoryUsage,
            cachedObjectCount: this.cachedObjects.size,
            lastCleanup: this.lastCleanup
        };
    }

    cleanup() {
        this._performCleanup();
    }

    dispose() {
        this.cachedObjects.clear();
    }
}