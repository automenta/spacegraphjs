import { InstancedEdgeManager } from './InstancedEdgeManager.js';
import * as THREE from 'three';

describe('InstancedEdgeManager', () => {
    let scene;
    let manager;

    beforeEach(() => {
        scene = new THREE.Scene();
        manager = new InstancedEdgeManager(scene);
    });

    afterEach(() => {
        manager.dispose();
        scene = null;
        manager = null;
    });

    test('should add and remove an edge', () => {
        const edge = {
            id: 'edge1',
            source: { position: new THREE.Vector3(0, 0, 0) },
            target: { position: new THREE.Vector3(10, 0, 0) },
            data: { color: 0x0000ff, thicknessInstanced: 1.0 }
        };
        const added = manager.addEdge(edge);
        expect(added).toBe(true);
        expect(edge.isInstanced).toBe(true);

        manager.removeEdge(edge);
        expect(edge.isInstanced).toBe(false);
    });

    test('should add and remove an edge with arrowheads', () => {
        const edge = {
            id: 'edge2',
            source: { position: new THREE.Vector3(0, 0, 0) },
            target: { position: new THREE.Vector3(10, 0, 0) },
            data: { color: 0x00ff00, thicknessInstanced: 1.0, arrowheads: { source: true, target: true } }
        };
        const added = manager.addEdge(edge);
        expect(added).toBe(true);
        expect(edge.isInstanced).toBe(true);

        manager.removeEdge(edge);
        expect(edge.isInstanced).toBe(false);
    });

    test('should update edge transform and color', () => {
        const edge = {
            id: 'edge3',
            source: { position: new THREE.Vector3(0, 0, 0) },
            target: { position: new THREE.Vector3(10, 0, 0) },
            data: { color: 0xff0000, thicknessInstanced: 0.8 }
        };
        manager.addEdge(edge);

        edge.target.position.set(20, 0, 0);
        edge.data.color = 0x0000ff;
        manager.updateEdge(edge);

        // In a real test, you would inspect the instancedMesh's matrix and color attributes
        // For now, we just ensure no errors are thrown during update.
    });
});
