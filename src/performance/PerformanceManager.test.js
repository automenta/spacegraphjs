import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PerformanceManager } from './PerformanceManager.js';

// Mock Performance API
global.performance = {
    now: vi.fn(() => 16.666), // Mock 60 FPS
    memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000
    }
};

describe('PerformanceManager', () => {
    let perfManager;
    let mockSpace;
    let mockNodes;
    let mockEdges;
    
    beforeEach(() => {
        mockNodes = [
            { 
                id: 'node1', 
                position: { x: 0, y: 0, z: 0 },
                visible: true,
                mesh: { visible: true },
                instanceId: null
            },
            { 
                id: 'node2', 
                position: { x: 50, y: 0, z: 0 },
                visible: true,
                mesh: { visible: true },
                instanceId: null
            },
            { 
                id: 'node3', 
                position: { x: 100, y: 0, z: 0 },
                visible: false,
                mesh: { visible: false },
                instanceId: null
            }
        ];
        
        mockEdges = [
            { id: 'edge1', source: mockNodes[0], target: mockNodes[1], visible: true },
            { id: 'edge2', source: mockNodes[1], target: mockNodes[2], visible: true }
        ];
        
        mockSpace = {
            camera: {
                position: { x: 0, y: 0, z: 10 },
                getWorldDirection: vi.fn(() => ({ x: 0, y: 0, z: -1 }))
            },
            getNodes: vi.fn(() => mockNodes),
            getEdges: vi.fn(() => mockEdges),
            renderer: {
                info: {
                    render: { triangles: 1000, calls: 50 }
                }
            },
            emit: vi.fn()
        };
        
        perfManager = new PerformanceManager(mockSpace, {
            enableInstancing: true,
            enableCulling: true,
            enableLOD: true,
            memoryThreshold: 0.8,
            targetFPS: 60,
            cullingDistance: 100
        });
    });

    it('should create PerformanceManager with correct options', () => {
        expect(perfManager.options.enableInstancing).toBe(true);
        expect(perfManager.options.enableCulling).toBe(true);
        expect(perfManager.options.enableLOD).toBe(true);
        expect(perfManager.options.targetFPS).toBe(60);
    });

    it('should have performance monitoring methods', () => {
        expect(typeof perfManager.startPerformanceMonitoring).toBe('function');
        expect(typeof perfManager.stopPerformanceMonitoring).toBe('function');
        expect(typeof perfManager.getPerformanceMetrics).toBe('function');
        expect(typeof perfManager.updatePerformanceMetrics).toBe('function');
    });

    it('should track FPS correctly', () => {
        perfManager.startPerformanceMonitoring();
        
        // Simulate frame updates
        perfManager.updatePerformanceMetrics();
        perfManager.updatePerformanceMetrics();
        
        const metrics = perfManager.getPerformanceMetrics();
        expect(metrics.fps).toBeDefined();
        expect(metrics.frameTime).toBeDefined();
    });

    it('should monitor memory usage', () => {
        const metrics = perfManager.getPerformanceMetrics();
        expect(metrics.memory.used).toBeDefined();
        expect(metrics.memory.total).toBeDefined();
        expect(metrics.memory.percentage).toBeDefined();
    });

    it('should have frustum culling methods', () => {
        expect(typeof perfManager.performFrustumCulling).toBe('function');
        expect(typeof perfManager.isInFrustum).toBe('function');
        expect(typeof perfManager.updateCulling).toBe('function');
    });

    it('should perform frustum culling', () => {
        const cullingSpy = vi.spyOn(perfManager, 'performFrustumCulling');
        perfManager.updateCulling();
        expect(cullingSpy).toHaveBeenCalled();
    });

    it('should handle distance culling', () => {
        const distanceCullingSpy = vi.spyOn(perfManager, 'performDistanceCulling');
        perfManager.updateCulling();
        expect(distanceCullingSpy).toHaveBeenCalled();
    });

    it('should have instancing methods', () => {
        expect(typeof perfManager.enableInstancing).toBe('function');
        expect(typeof perfManager.disableInstancing).toBe('function');
        expect(typeof perfManager.updateInstancing).toBe('function');
        expect(typeof perfManager.createInstancedMesh).toBe('function');
    });

    it('should manage instanced meshes', () => {
        perfManager.enableInstancing();
        expect(perfManager.instancingEnabled).toBe(true);
        
        const instancedMesh = perfManager.createInstancedMesh('sphere', 100);
        expect(instancedMesh).toBeDefined();
        expect(perfManager.instancedMeshes.has('sphere')).toBe(true);
    });

    it('should have LOD management methods', () => {
        expect(typeof perfManager.enableLOD).toBe('function');
        expect(typeof perfManager.disableLOD).toBe('function');
        expect(typeof perfManager.updateLOD).toBe('function');
        expect(typeof perfManager.calculateLODLevel).toBe('function');
    });

    it('should calculate LOD levels based on distance', () => {
        const node = mockNodes[0];
        const lodLevel = perfManager.calculateLODLevel(node);
        expect(lodLevel).toBeGreaterThanOrEqual(0);
        expect(lodLevel).toBeLessThanOrEqual(3);
    });

    it('should have memory management methods', () => {
        expect(typeof perfManager.checkMemoryUsage).toBe('function');
        expect(typeof perfManager.optimizeMemory).toBe('function');
        expect(typeof perfManager.clearUnusedResources).toBe('function');
    });

    it('should detect memory pressure', () => {
        const memoryInfo = perfManager.checkMemoryUsage();
        expect(memoryInfo.isHighUsage).toBeDefined();
        expect(memoryInfo.percentage).toBeDefined();
    });

    it('should optimize performance when needed', () => {
        const optimizeSpy = vi.spyOn(perfManager, 'optimizePerformance');
        
        // Simulate low FPS
        perfManager.performanceMetrics.fps = 30;
        perfManager.update();
        
        expect(optimizeSpy).toHaveBeenCalled();
    });

    it('should adjust quality settings based on performance', () => {
        perfManager.performanceMetrics.fps = 25; // Below target
        
        const adjustSpy = vi.spyOn(perfManager, 'adjustQualitySettings');
        perfManager.optimizePerformance();
        
        expect(adjustSpy).toHaveBeenCalled();
    });

    it('should provide performance statistics', () => {
        const stats = perfManager.getDetailedStats();
        expect(stats.rendering).toBeDefined();
        expect(stats.memory).toBeDefined();
        expect(stats.culling).toBeDefined();
        expect(stats.instancing).toBeDefined();
    });

    it('should handle performance warnings', () => {
        const warningSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        // Simulate high memory usage
        global.performance.memory.usedJSHeapSize = 3500000; // 87.5% of limit
        perfManager.checkMemoryUsage();
        
        expect(warningSpy).toHaveBeenCalled();
        warningSpy.mockRestore();
    });

    it('should update all performance systems', () => {
        const cullingUpdateSpy = vi.spyOn(perfManager, 'updateCulling');
        const lodUpdateSpy = vi.spyOn(perfManager, 'updateLOD');
        const instancingUpdateSpy = vi.spyOn(perfManager, 'updateInstancing');
        
        perfManager.update();
        
        expect(cullingUpdateSpy).toHaveBeenCalled();
        expect(lodUpdateSpy).toHaveBeenCalled();
        expect(instancingUpdateSpy).toHaveBeenCalled();
    });

    it('should emit performance events', () => {
        perfManager.performanceMetrics.fps = 20; // Low FPS
        perfManager.update();
        
        expect(mockSpace.emit).toHaveBeenCalledWith('performanceWarning', {
            type: 'lowFPS',
            value: 20,
            threshold: 60
        });
    });
});