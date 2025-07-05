import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FractalZoomManager } from './FractalZoomManager.js';

describe('FractalZoomManager', () => {
    let zoomManager;
    let mockSpace;
    let mockNodes;
    
    beforeEach(() => {
        mockSpace = {
            camera: {
                position: { x: 0, y: 0, z: 10 },
                zoom: 1
            },
            getNodes: vi.fn(() => mockNodes),
            emit: vi.fn()
        };
        
        mockNodes = [
            { 
                id: 'node1', 
                position: { x: 0, y: 0, z: 0 },
                visible: true,
                isDetailNode: false,
                parentId: null,
                getLevelOfDetail: vi.fn(() => 'high'),
                setLevelOfDetail: vi.fn(),
                getContentAdapter: vi.fn(() => ({ adapt: vi.fn() }))
            },
            { 
                id: 'node2', 
                position: { x: 5, y: 0, z: 0 },
                visible: true,
                isDetailNode: false,
                parentId: null,
                getLevelOfDetail: vi.fn(() => 'medium'),
                setLevelOfDetail: vi.fn(),
                getContentAdapter: vi.fn(() => ({ adapt: vi.fn() }))
            }
        ];
        
        zoomManager = new FractalZoomManager(mockSpace, {
            maxZoomLevel: 10,
            minZoomLevel: 0.1,
            detailThreshold: 2.0,
            lodLevels: ['low', 'medium', 'high', 'ultra'],
            cacheSize: 100
        });
    });

    it('should create a FractalZoomManager with correct options', () => {
        expect(zoomManager.options.maxZoomLevel).toBe(10);
        expect(zoomManager.options.minZoomLevel).toBe(0.1);
        expect(zoomManager.options.detailThreshold).toBe(2.0);
        expect(zoomManager.options.lodLevels).toEqual(['low', 'medium', 'high', 'ultra']);
    });

    it('should have zoom control methods', () => {
        expect(typeof zoomManager.setZoomLevel).toBe('function');
        expect(typeof zoomManager.getZoomLevel).toBe('function');
        expect(typeof zoomManager.zoomIn).toBe('function');
        expect(typeof zoomManager.zoomOut).toBe('function');
        expect(typeof zoomManager.resetZoom).toBe('function');
    });

    it('should set and get zoom level correctly', () => {
        zoomManager.setZoomLevel(2.5);
        expect(zoomManager.getZoomLevel()).toBe(2.5);
    });

    it('should clamp zoom level to valid range', () => {
        zoomManager.setZoomLevel(20); // Above max
        expect(zoomManager.getZoomLevel()).toBe(10);
        
        zoomManager.setZoomLevel(0.01); // Below min
        expect(zoomManager.getZoomLevel()).toBe(0.1);
    });

    it('should handle zoom in/out operations', () => {
        zoomManager.setZoomLevel(1.0);
        
        zoomManager.zoomIn(2.0);
        expect(zoomManager.getZoomLevel()).toBe(2.0);
        
        zoomManager.zoomOut(0.5);
        expect(zoomManager.getZoomLevel()).toBe(1.0);
    });

    it('should reset zoom to default level', () => {
        zoomManager.setZoomLevel(5.0);
        zoomManager.resetZoom();
        expect(zoomManager.getZoomLevel()).toBe(1.0);
    });

    it('should have LOD management methods', () => {
        expect(typeof zoomManager.updateLevelOfDetail).toBe('function');
        expect(typeof zoomManager.calculateLOD).toBe('function');
        expect(typeof zoomManager.shouldShowDetails).toBe('function');
    });

    it('should calculate LOD based on zoom level', () => {
        zoomManager.setZoomLevel(0.5);
        const lod = zoomManager.calculateLOD(mockNodes[0]);
        expect(lod).toBe('low');
        
        zoomManager.setZoomLevel(5.0);
        const highLod = zoomManager.calculateLOD(mockNodes[0]);
        expect(highLod).toBe('high');
    });

    it('should determine when to show details', () => {
        zoomManager.setZoomLevel(0.5);
        expect(zoomManager.shouldShowDetails(mockNodes[0])).toBe(false);
        
        zoomManager.setZoomLevel(5.0);
        expect(zoomManager.shouldShowDetails(mockNodes[0])).toBe(true);
    });

    it('should update all nodes LOD when zoom changes', () => {
        const updateSpy = vi.spyOn(zoomManager, 'updateLevelOfDetail');
        zoomManager.setZoomLevel(3.0);
        
        expect(updateSpy).toHaveBeenCalled();
    });

    it('should handle detail node creation', () => {
        expect(typeof zoomManager.createDetailNode).toBe('function');
        expect(typeof zoomManager.removeDetailNode).toBe('function');
    });

    it('should manage detail node lifecycle', () => {
        const detailNode = zoomManager.createDetailNode(mockNodes[0], 'high');
        expect(detailNode.isDetailNode).toBe(true);
        expect(detailNode.parentId).toBe(mockNodes[0].id);
        
        zoomManager.removeDetailNode(detailNode);
        expect(zoomManager.detailNodes.has(detailNode.id)).toBe(false);
    });

    it('should cache content adaptations', () => {
        const cacheKey = zoomManager.getCacheKey(mockNodes[0], 'high');
        expect(typeof cacheKey).toBe('string');
        
        zoomManager.setCachedContent(cacheKey, 'cached content');
        expect(zoomManager.getCachedContent(cacheKey)).toBe('cached content');
    });

    it('should handle cache size limits', () => {
        // Fill cache beyond limit
        for (let i = 0; i < 150; i++) {
            zoomManager.setCachedContent(`key-${i}`, `content-${i}`);
        }
        
        expect(zoomManager.contentCache.size).toBeLessThanOrEqual(100);
    });

    it('should emit zoom events', () => {
        zoomManager.setZoomLevel(3.0);
        expect(mockSpace.emit).toHaveBeenCalledWith('zoomChanged', {
            oldZoom: expect.any(Number),
            newZoom: 3.0
        });
    });

    it('should handle smooth zoom transitions', () => {
        const smoothZoomSpy = vi.spyOn(zoomManager, 'smoothZoomTo');
        zoomManager.smoothZoomTo(5.0, 1000);
        expect(smoothZoomSpy).toHaveBeenCalledWith(5.0, 1000);
    });
});