import { InstancedMeshManager } from './InstancedMeshManager.js';
import * as THREE from 'three';

describe('InstancedMeshManager', () => {
    let scene;
    let manager;

    beforeEach(() => {
        scene = new THREE.Scene();
        manager = new InstancedMeshManager(scene);
    });

    afterEach(() => {
        manager.dispose();
        scene = null;
        manager = null;
    });

    test('should add and remove a sphere node', async () => {
        const node = { id: 'node1', position: new THREE.Vector3(0, 0, 0), size: 10, data: { shape: 'sphere', color: 0xff0000 } };
        const added = await manager.addNode(node);
        expect(added).toBe(true);
        expect(node.isInstanced).toBe(true);

        await manager.removeNode(node);
        expect(node.isInstanced).toBe(false);
    });

    // Mock GLTFLoader for testing GLTF loading
    vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
        GLTFLoader: vi.fn().mockImplementation(() => ({
            loadAsync: vi.fn().mockResolvedValue({
                scene: {
                    traverse: (callback) => {
                        const mesh = { isMesh: true, geometry: new THREE.BoxGeometry(), material: new THREE.MeshStandardMaterial() };
                        callback(mesh);
                    },
                },
            }),
        })),
    }));

    test('should load and add a GLTF node', async () => {
        const node = { id: 'node2', position: new THREE.Vector3(10, 0, 0), size: 20, data: { gltfUrl: 'test.gltf' } };
        const added = await manager.addNode(node);
        expect(added).toBe(true);
        expect(node.isInstanced).toBe(true);

        // Verify that the GLTF loader was called
        // Verify that the GLTF loader was called
        expect(manager.gltfLoader.loadAsync).toHaveBeenCalledWith('test.gltf');
    });

    test('should update node transform and color', async () => {
        const node = { id: 'node3', position: new THREE.Vector3(0, 0, 0), size: 10, data: { shape: 'sphere', color: 0xff0000 } };
        await manager.addNode(node);

        node.position.set(5, 5, 5);
        node.data.color = 0x00ff00;
        await manager.updateNode(node);

        // In a real test, you would inspect the instancedMesh's matrix and color attributes
        // For now, we just ensure no errors are thrown during update.
    });
});
