import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { TranslationGizmo } from './TranslationGizmo';

// Mock THREE.Material and its methods if they cause issues in pure JS environment
// For simple tests, direct instantiation might be fine.
// vi.mock('three', async () => {
//     const actualThree = await vi.importActual('three');
//     return {
//         ...actualThree,
//         MeshBasicMaterial: vi.fn().mockImplementation(() => ({
//             color: new actualThree.Color(),
//             clone: vi.fn().mockReturnThis(),
//             dispose: vi.fn(),
//         })),
//         // Mock other geometries/materials if needed
//     };
// });


describe('TranslationGizmo', () => {
    let gizmo;

    beforeEach(() => {
        gizmo = new TranslationGizmo();
    });

    test('constructor: should initialize correctly', () => {
        expect(gizmo).toBeInstanceOf(THREE.Object3D);
        expect(gizmo.name).toBe('TranslationGizmo');
        expect(gizmo.handles).toBeInstanceOf(THREE.Object3D);
        expect(gizmo.visible).toBe(false);
        expect(gizmo.renderOrder).toBe(1000);
    });

    test('constructor: should create axis arrow handles with correct userData', () => {
        const expectedAxes = ['x', 'y', 'z'];
        let arrowHandleCount = 0;
        gizmo.handles.children.forEach(handle => {
            if (handle.userData.part === 'arrow') {
                arrowHandleCount++;
                expect(expectedAxes).toContain(handle.userData.axis);
                expect(handle.userData.type).toBe('gizmo');
                expect(handle.userData.gizmoType).toBe('translate');
                expect(handle.userData.isGizmoHandle).toBe(true);
                expect(handle.material).toBeDefined();
            }
        });
        // Each axis arrow consists of a line and a cone, so 2 meshes per arrow * 3 axes = 6
        expect(arrowHandleCount).toBe(6);
    });

    test('constructor: should create plane handles with correct userData', () => {
        const expectedPlanes = ['xy', 'yz', 'xz'];
        let planeHandleCount = 0;
        gizmo.handles.children.forEach(handle => {
            if (handle.userData.part === 'plane') {
                planeHandleCount++;
                expect(expectedPlanes).toContain(handle.userData.axis);
                expect(handle.userData.type).toBe('gizmo');
                expect(handle.userData.gizmoType).toBe('translate');
                expect(handle.userData.isGizmoHandle).toBe(true);
                expect(handle.material).toBeDefined();
                expect(handle.material.opacity).toBe(0.5); // As defined
            }
        });
        expect(planeHandleCount).toBe(3);
    });

    test('updateScale(): should modify gizmo scale based on camera distance', () => {
        const mockCamera = new THREE.PerspectiveCamera();
        // Position camera such that distance / 500 = 2 for scale factor
        mockCamera.position.set(0, 0, 1000);
        gizmo.position.set(0, 0, 0);

        // Assuming default scale of Object3D is (1,1,1)
        gizmo.updateScale(mockCamera);
        expect(gizmo.scale.x).toBeCloseTo(2.0);
        expect(gizmo.scale.y).toBeCloseTo(2.0);
        expect(gizmo.scale.z).toBeCloseTo(2.0);

        mockCamera.position.set(0, 0, 250); // distance / 500 = 0.5
        gizmo.updateScale(mockCamera);
        expect(gizmo.scale.x).toBeCloseTo(0.5);
    });

    test('show() and hide(): should toggle visibility', () => {
        gizmo.show();
        expect(gizmo.visible).toBe(true);
        gizmo.hide();
        expect(gizmo.visible).toBe(false);
    });

    test('setHandleActive(): should change material for active state and restore for inactive', () => {
        // Find an X-axis arrow handle part (e.g., the line)
        const xArrowLine = gizmo.handles.children.find(h => h.userData.axis === 'x' && h.userData.part === 'arrow');
        expect(xArrowLine).toBeDefined();

        const originalMaterial = xArrowLine.material;
        const hoverMaterial = gizmo._materials.hover; // The shared hover material

        gizmo.setHandleActive(xArrowLine, true);
        // Check if the material of both parts of the X arrow (line and head) is the hover material
        gizmo.handles.children.forEach(child => {
            if (child.userData.axis === 'x' && child.userData.part === 'arrow') {
                expect(child.material).toBe(hoverMaterial);
            }
        });
        // Check if hover material color/opacity was set based on original
        expect(hoverMaterial.color.getHex()).toBe(gizmo._originalMaterials.x_arrow.color.clone().multiplyScalar(1.5).getHex());
        expect(hoverMaterial.opacity).toBeCloseTo(gizmo._originalMaterials.x_arrow.opacity * 1.2);


        gizmo.setHandleActive(xArrowLine, false);
        gizmo.handles.children.forEach(child => {
            if (child.userData.axis === 'x' && child.userData.part === 'arrow') {
                expect(child.material).toBe(originalMaterial); // Should be restored
            }
        });
    });

    test('resetHandlesState(): should restore original materials to all handles', () => {
        const xArrowLine = gizmo.handles.children.find(h => h.userData.axis === 'x' && h.userData.part === 'arrow');
        const xyPlane = gizmo.handles.children.find(h => h.userData.axis === 'xy' && h.userData.part === 'plane');

        // Activate a couple of handles
        gizmo.setHandleActive(xArrowLine, true);
        gizmo.setHandleActive(xyPlane, true);

        expect(xArrowLine.material).toBe(gizmo._materials.hover);
        expect(xyPlane.material).toBe(gizmo._materials.hover);

        gizmo.resetHandlesState();

        expect(xArrowLine.material).toBe(gizmo._originalMaterials.x_arrow);
        expect(xyPlane.material).toBe(gizmo._originalMaterials.xy_plane);
    });

    test('dispose(): should dispose materials and remove handles', () => {
        const disposeSpies = Object.values(gizmo._materials).map(m => vi.spyOn(m, 'dispose'));
        const geometryDisposeSpies = gizmo.handles.children.map(h => vi.spyOn(h.geometry, 'dispose'));
        const removeSpy = vi.spyOn(gizmo, 'remove');

        gizmo.dispose();

        disposeSpies.forEach(spy => expect(spy).toHaveBeenCalled());
        geometryDisposeSpies.forEach(spy => expect(spy).toHaveBeenCalled());
        expect(removeSpy).toHaveBeenCalledWith(gizmo.handles);
    });

    test('getAxisVector(): should return correct world axis vectors', () => {
        expect(TranslationGizmo.getAxisVector('x')).toEqual(new THREE.Vector3(1, 0, 0));
        expect(TranslationGizmo.getAxisVector('y')).toEqual(new THREE.Vector3(0, 1, 0));
        expect(TranslationGizmo.getAxisVector('z')).toEqual(new THREE.Vector3(0, 0, 1));
        expect(TranslationGizmo.getAxisVector('unknown')).toEqual(new THREE.Vector3(0, 0, 0));
    });

    test('getPlaneNormal(): should return correct world plane normal vectors', () => {
        expect(TranslationGizmo.getPlaneNormal('xy')).toEqual(new THREE.Vector3(0, 0, 1)); // Normal is Z
        expect(TranslationGizmo.getPlaneNormal('yz')).toEqual(new THREE.Vector3(1, 0, 0)); // Normal is X
        expect(TranslationGizmo.getPlaneNormal('xz')).toEqual(new THREE.Vector3(0, 1, 0)); // Normal is Y
        expect(TranslationGizmo.getPlaneNormal('unknown')).toEqual(new THREE.Vector3(0, 0, 0));
    });
});
