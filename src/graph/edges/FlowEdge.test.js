import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FlowEdge } from './FlowEdge.js';

// Mock Three.js module
vi.mock('three', async (importOriginal) => {
    const actualThree = await importOriginal(); // Import to allow spreading other exports
    return {
        ...actualThree,
        BufferGeometry: vi.fn(() => ({
            setAttribute: vi.fn(),
            dispose: vi.fn() // Added dispose
        })),
        BufferAttribute: vi.fn(),
        ShaderMaterial: vi.fn(() => ({ // Changed from PointsMaterial to ShaderMaterial
            dispose: vi.fn(), // Added dispose
            uniforms: { time: { value: 0 }, glowIntensity: { value: 0} }
        })),
        Points: vi.fn(() => ({
            position: { copy: vi.fn() },
            lookAt: vi.fn(),
            geometry: { attributes: { position: { array: [], needsUpdate: false }, size: { array: [], needsUpdate: false }, color: { array: [], needsUpdate: false } }, dispose: vi.fn() }, // Mock geometry with attributes
            material: { uniforms: { time: { value: 0 }, glowIntensity: { value: 0} }, dispose: vi.fn() }, // Mock material
            parent: { remove: vi.fn() }, // Mock parent for removal
            userData: {}
        })),
        Vector3: vi.fn((x = 0, y = 0, z = 0) => ({
            x, y, z,
            copy: vi.fn().mockReturnThis(),
            lerp: vi.fn().mockReturnThis(),
            lerpVectors: vi.fn().mockReturnThis(), // Added for _getPositionOnCurve
            distanceTo: vi.fn(() => 5),
        })),
        Color: vi.fn(() => ({ r: 0, g: 1, b: 0 })), // Example color
        AdditiveBlending: 'AdditiveBlendingConstant', // Mock constant
    };
});


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
                // flowSpeed: 2.0, // This will be stored in data if needed, but particleSpeed initializes the actual speed property
                particleSpeed: 2.0, // Use the correct property name for initialization
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
        expect(edge.particleSpeed).toBe(2.0);
        expect(edge.data.particleSpeed).toBe(2.0);
        expect(edge.particleCount).toBe(20);
        expect(edge.data.particleCount).toBe(20);
    });

    it('should initialize particle system', () => {
        expect(edge.particles).toBeDefined();
        expect(edge.particles.length).toBe(20);
    });

    it('should have animation control methods', () => {
        expect(typeof edge.setAnimated).toBe('function');
        expect(typeof edge.setParticleSpeed).toBe('function');
        // No direct start/stop/pause, it's through setAnimated.
    });

    it('should control animation state correctly via setAnimated', () => {
        // Default is animated: true from constructor data
        expect(edge.data.animated).toBe(true);
        expect(edge.animationFrame).not.toBeNull();

        edge.setAnimated(false);
        expect(edge.data.animated).toBe(false);
        expect(edge.animationFrame).toBeNull();
        
        edge.setAnimated(true);
        expect(edge.data.animated).toBe(true);
        expect(edge.animationFrame).not.toBeNull();
    });

    it('should update particle speed', () => {
        edge.setParticleSpeed(5.0);
        expect(edge.particleSpeed).toBe(5.0);
        expect(edge.data.particleSpeed).toBe(5.0);
    });

    it('should handle bidirectional flow via flowDirection in data', () => {
        // Constructor sets this.flowDirection from data.flowDirection
        // Test if data.bidirectional (if it were a primary option) translates to flowDirection
        // The current code uses data.flowDirection (1, -1, or 0 for bidirectional)
        const biFlowEdge = new FlowEdge('bi-flow', sourceNode, targetNode, { flowDirection: 0 }); // 0 for bidirectional
        expect(biFlowEdge.flowDirection).toBe(0);
        expect(biFlowEdge.data.flowDirection).toBe(0);

        const forwardFlowEdge = new FlowEdge('forward-flow', sourceNode, targetNode, { flowDirection: 1 });
        expect(forwardFlowEdge.flowDirection).toBe(1);

        const backwardFlowEdge = new FlowEdge('backward-flow', sourceNode, targetNode, { flowDirection: -1 });
        expect(backwardFlowEdge.flowDirection).toBe(-1);
    });

    it('should call _updateParticles when edge public update is called', () => {
        // _updateParticles is called by _startAnimation and the public update()
        const updateInternalSpy = vi.spyOn(edge, '_updateParticles');
        edge.update(); // Call public update method
        expect(updateInternalSpy).toHaveBeenCalled();
        updateInternalSpy.mockRestore();
    });

    it('should have correct flowDirection property access and modification', () => {
        // flowDirection is set in constructor from data.flowDirection (default 1 from FlowEdge.js if not provided)
        // The test case provides `bidirectional: false` which is not directly used for flowDirection.
        // Default `flowDirection` in `FlowEdge.js` constructor if `data.flowDirection` is undefined is 1.
        expect(edge.flowDirection).toBe(1);

        edge.setFlowDirection(-1);
        expect(edge.flowDirection).toBe(-1);
        expect(edge.data.flowDirection).toBe(-1);
    });

    it('should have particles with progress property', () => {
        expect(edge.particles.length).toBeGreaterThan(0);
        const particle = edge.particles[0];
        expect(particle).toHaveProperty('progress');
        // Initial progress is based on i / particleCount, so it's between 0 and 1.
        expect(particle.progress).toBeGreaterThanOrEqual(0);
    });

    it('particle progress should change after animation updates', () => {
        // This test assumes requestAnimationFrame and timers are handled to observe change.
        // Mocking requestAnimationFrame to immediately call the callback for simplicity in testing _updateParticles.
        // We also need to control time via vi.useFakeTimers() for performance.now() if used by _updateParticles.

        // Initial progress of the first particle
        const initialProgress = edge.particles[0].progress;

        // Simulate some time passing and an update cycle
        // This will depend on how _updateParticles uses time.
        // If it uses performance.now(), advance timers.
        // For this test, let's directly call _updateParticles multiple times
        // as requestAnimationFrame is mocked to run immediately.

        edge.setAnimated(true); // Ensure animation is "running"
        
        // Call _updateParticles a few times which should be triggered by mocked requestAnimationFrame
        // However, since _startAnimation uses a closure for animate, spying or direct calls are easier.
        // Let's call _updateParticles directly for this test to check its effect.
        edge._updateParticles();
        edge._updateParticles();

        expect(edge.particles[0].progress).not.toBe(initialProgress);
    });
});

// Mock requestAnimationFrame and cancelAnimationFrame for _startAnimation/_stopAnimation
// These need to be at the module scope or setup/teardown correctly if per-test.
// For simplicity, let's make them module-scoped for now if they don't interfere.
// However, it's better to manage this with setup/teardown if tests conflict.

// Using beforeEach and afterEach to manage timers and animation frame mocks
beforeEach(() => {
    vi.useFakeTimers();
    global.requestAnimationFrame = vi.fn((cb) => {
        // Simulate async by not calling immediately, or call if testing synchronous part of it
        // cb(); // Call immediately for some tests, or manage with timers.
        return Date.now(); // Return a mock ID
    });
    global.cancelAnimationFrame = vi.fn();
    global.performance = { now: vi.fn(() => Date.now()) }; // Mock performance.now
});

afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
    delete global.performance;
});