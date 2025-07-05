import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FlowEdge } from './FlowEdge.js';

// Mock Three.js dependencies
const mockThree = {
    BufferGeometry: vi.fn(() => ({ setAttribute: vi.fn() })),
    BufferAttribute: vi.fn(),
    PointsMaterial: vi.fn(),
    Points: vi.fn(() => ({ 
        position: { copy: vi.fn() },
        lookAt: vi.fn()
    })),
    Vector3: vi.fn(() => ({
        copy: vi.fn(),
        lerp: vi.fn(),
        distanceTo: vi.fn(() => 5)
    })),
    Color: vi.fn()
};

global.THREE = mockThree;

describe('FlowEdge', () => {
    let edge;
    let sourceNode;
    let targetNode;
    
    beforeEach(() => {
        sourceNode = {
            id: 'source',
            position: { x: 0, y: 0, z: 0 },
            getWorldPosition: vi.fn(() => ({ x: 0, y: 0, z: 0 }))
        };
        
        targetNode = {
            id: 'target',
            position: { x: 10, y: 0, z: 0 },
            getWorldPosition: vi.fn(() => ({ x: 10, y: 0, z: 0 }))
        };
        
        edge = new FlowEdge(
            'flow-edge-1',
            sourceNode,
            targetNode,
            {
                flowSpeed: 2.0,
                particleCount: 20,
                particleSize: 0.1,
                flowColor: 0x00ff00,
                bidirectional: false
            }
        );
    });

    it('should create a FlowEdge with correct properties', () => {
        expect(edge.id).toBe('flow-edge-1');
        expect(edge.source).toBe(sourceNode);
        expect(edge.target).toBe(targetNode);
        expect(edge.options.flowSpeed).toBe(2.0);
        expect(edge.options.particleCount).toBe(20);
    });

    it('should initialize particle system', () => {
        expect(edge.particles).toBeDefined();
        expect(edge.particles.length).toBe(20);
    });

    it('should have flow control methods', () => {
        expect(typeof edge.startFlow).toBe('function');
        expect(typeof edge.stopFlow).toBe('function');
        expect(typeof edge.pauseFlow).toBe('function');
        expect(typeof edge.setFlowSpeed).toBe('function');
    });

    it('should control flow state correctly', () => {
        expect(edge.isFlowing).toBe(true);
        
        edge.stopFlow();
        expect(edge.isFlowing).toBe(false);
        
        edge.startFlow();
        expect(edge.isFlowing).toBe(true);
    });

    it('should update flow speed', () => {
        edge.setFlowSpeed(5.0);
        expect(edge.options.flowSpeed).toBe(5.0);
    });

    it('should handle bidirectional flow', () => {
        const biFlow = new FlowEdge('bi-flow', sourceNode, targetNode, { bidirectional: true });
        expect(biFlow.options.bidirectional).toBe(true);
    });

    it('should update particle positions on animation', () => {
        const updateSpy = vi.spyOn(edge, 'updateParticles');
        edge.update(0.016); // 60 FPS delta
        expect(updateSpy).toHaveBeenCalled();
    });

    it('should calculate flow direction correctly', () => {
        const direction = edge.getFlowDirection();
        expect(direction).toBeDefined();
    });

    it('should handle particle lifecycle', () => {
        const particle = edge.particles[0];
        expect(particle.progress).toBeGreaterThanOrEqual(0);
        expect(particle.progress).toBeLessThanOrEqual(1);
    });

    it('should reset particles when flow restarts', () => {
        edge.stopFlow();
        edge.startFlow();
        
        edge.particles.forEach(particle => {
            expect(particle.progress).toBeLessThan(0.1); // Should be reset
        });
    });
});