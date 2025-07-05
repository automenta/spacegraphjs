import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdvancedCameraControls } from './AdvancedCameraControls.js';

// Mock Three.js dependencies
const mockThree = {
    Vector3: vi.fn(() => ({
        copy: vi.fn(),
        normalize: vi.fn(),
        multiplyScalar: vi.fn(),
        add: vi.fn(),
        sub: vi.fn(),
        length: vi.fn(() => 1),
        distanceTo: vi.fn(() => 5),
        lerp: vi.fn(),
        x: 0, y: 0, z: 0
    })),
    Euler: vi.fn(() => ({
        x: 0, y: 0, z: 0
    })),
    Quaternion: vi.fn(() => ({
        slerp: vi.fn()
    })),
    Clock: vi.fn(() => ({
        getDelta: vi.fn(() => 0.016),
        getElapsedTime: vi.fn(() => 1.0)
    }))
};

global.THREE = mockThree;

describe('AdvancedCameraControls', () => {
    let controls;
    let mockCamera;
    let mockSpace;
    
    beforeEach(() => {
        mockCamera = {
            position: { x: 0, y: 0, z: 10, copy: vi.fn(), lerp: vi.fn() },
            rotation: { x: 0, y: 0, z: 0 },
            quaternion: { slerp: vi.fn() },
            lookAt: vi.fn(),
            updateProjectionMatrix: vi.fn()
        };
        
        mockSpace = {
            camera: mockCamera,
            getNodes: vi.fn(() => []),
            renderer: { domElement: { clientWidth: 800, clientHeight: 600 } },
            emit: vi.fn()
        };
        
        controls = new AdvancedCameraControls(mockSpace, {
            autoZoomSpeed: 2.0,
            autoRotationSpeed: 1.0,
            peekDistance: 5.0,
            cinematicDuration: 3000,
            smoothingFactor: 0.1
        });
    });

    it('should create AdvancedCameraControls with correct options', () => {
        expect(controls.options.autoZoomSpeed).toBe(2.0);
        expect(controls.options.autoRotationSpeed).toBe(1.0);
        expect(controls.options.peekDistance).toBe(5.0);
        expect(controls.options.cinematicDuration).toBe(3000);
    });

    it('should have auto-zoom methods', () => {
        expect(typeof controls.enableAutoZoom).toBe('function');
        expect(typeof controls.disableAutoZoom).toBe('function');
        expect(typeof controls.setAutoZoomTarget).toBe('function');
        expect(typeof controls.isAutoZoomEnabled).toBe('function');
    });

    it('should enable and disable auto-zoom', () => {
        controls.enableAutoZoom();
        expect(controls.isAutoZoomEnabled()).toBe(true);
        
        controls.disableAutoZoom();
        expect(controls.isAutoZoomEnabled()).toBe(false);
    });

    it('should have auto-rotation methods', () => {
        expect(typeof controls.enableAutoRotation).toBe('function');
        expect(typeof controls.disableAutoRotation).toBe('function');
        expect(typeof controls.setRotationAxis).toBe('function');
        expect(typeof controls.isAutoRotationEnabled).toBe('function');
    });

    it('should enable and disable auto-rotation', () => {
        controls.enableAutoRotation();
        expect(controls.isAutoRotationEnabled()).toBe(true);
        
        controls.disableAutoRotation();
        expect(controls.isAutoRotationEnabled()).toBe(false);
    });

    it('should have peek mode methods', () => {
        expect(typeof controls.enablePeekMode).toBe('function');
        expect(typeof controls.disablePeekMode).toBe('function');
        expect(typeof controls.peekAt).toBe('function');
        expect(typeof controls.isPeekModeEnabled).toBe('function');
    });

    it('should handle peek mode correctly', () => {
        const targetPosition = { x: 5, y: 0, z: 0 };
        controls.enablePeekMode();
        expect(controls.isPeekModeEnabled()).toBe(true);
        
        controls.peekAt(targetPosition);
        expect(controls.peekTarget).toEqual(targetPosition);
    });

    it('should have cinematic mode methods', () => {
        expect(typeof controls.startCinematicMode).toBe('function');
        expect(typeof controls.stopCinematicMode).toBe('function');
        expect(typeof controls.addCinematicKeyframe).toBe('function');
        expect(typeof controls.isCinematicModeActive).toBe('function');
    });

    it('should manage cinematic keyframes', () => {
        const keyframe = {
            position: { x: 0, y: 0, z: 10 },
            rotation: { x: 0, y: 0, z: 0 },
            duration: 2000
        };
        
        controls.addCinematicKeyframe(keyframe);
        expect(controls.cinematicKeyframes).toHaveLength(1);
        expect(controls.cinematicKeyframes[0]).toEqual(keyframe);
    });

    it('should start and stop cinematic mode', () => {
        const keyframe = {
            position: { x: 5, y: 5, z: 5 },
            rotation: { x: 0.1, y: 0.1, z: 0 },
            duration: 1000
        };
        
        controls.addCinematicKeyframe(keyframe);
        controls.startCinematicMode();
        expect(controls.isCinematicModeActive()).toBe(true);
        
        controls.stopCinematicMode();
        expect(controls.isCinematicModeActive()).toBe(false);
    });

    it('should update camera position during auto-zoom', () => {
        const target = { x: 10, y: 0, z: 0 };
        controls.setAutoZoomTarget(target);
        controls.enableAutoZoom();
        
        const updateSpy = vi.spyOn(controls, 'updateAutoZoom');
        controls.update();
        expect(updateSpy).toHaveBeenCalled();
    });

    it('should rotate camera during auto-rotation', () => {
        controls.enableAutoRotation();
        
        const updateSpy = vi.spyOn(controls, 'updateAutoRotation');
        controls.update();
        expect(updateSpy).toHaveBeenCalled();
    });

    it('should handle multiple camera modes simultaneously', () => {
        controls.enableAutoZoom();
        controls.enableAutoRotation();
        
        expect(controls.isAutoZoomEnabled()).toBe(true);
        expect(controls.isAutoRotationEnabled()).toBe(true);
    });

    it('should calculate smooth camera transitions', () => {
        const startPos = { x: 0, y: 0, z: 10 };
        const endPos = { x: 5, y: 5, z: 5 };
        const progress = 0.5;
        
        const interpolated = controls.interpolatePosition(startPos, endPos, progress);
        expect(interpolated).toBeDefined();
    });

    it('should handle camera bounds and limits', () => {
        controls.setCameraBounds({
            min: { x: -10, y: -10, z: 1 },
            max: { x: 10, y: 10, z: 20 }
        });
        
        expect(controls.cameraBounds).toBeDefined();
        expect(controls.cameraBounds.min.x).toBe(-10);
        expect(controls.cameraBounds.max.x).toBe(10);
    });

    it('should emit camera events', () => {
        controls.enableAutoZoom();
        expect(mockSpace.emit).toHaveBeenCalledWith('cameraStateChanged', {
            autoZoom: true,
            autoRotation: false,
            peekMode: false,
            cinematicMode: false
        });
    });
});