import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MAX_INSTANCES_PER_TYPE = 1000;

class InstancedMeshGroup {
    constructor(geometry, material, scene) {
        this.geometry = geometry;
        this.material = material.clone();
        this.material.vertexColors = true;

        this.instancedMesh = new THREE.InstancedMesh(this.geometry, this.material, MAX_INSTANCES_PER_TYPE);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.instancedMesh.instanceColor?.setUsage(THREE.DynamicDrawUsage);

        scene.add(this.instancedMesh);

        this.nodeIdToInstanceId = new Map();
        this.instanceIdToNodeId = new Map();
        this.activeInstances = 0;
    }

    addNode(node) {
        if (this.activeInstances >= MAX_INSTANCES_PER_TYPE) {
            console.warn('InstancedMeshManager: Max instances reached.');
            return null;
        }

        const instanceId = this.activeInstances++;
        this.nodeIdToInstanceId.set(node.id, instanceId);
        this.instanceIdToNodeId.set(instanceId, node.id);

        this.updateNodeTransform(node, instanceId);
        this.updateNodeColor(node, instanceId);

        return instanceId;
    }

    updateNodeTransform(node, instanceId = this.nodeIdToInstanceId.get(node.id)) {
        if (instanceId === undefined) return;

        const matrix = new THREE.Matrix4();
        const position = node.position;
        const rotation = node.mesh?.quaternion || new THREE.Quaternion();
        const scale = new THREE.Vector3(node.size, node.size, node.size);

        matrix.compose(position, rotation, scale);
        this.instancedMesh.setMatrixAt(instanceId, matrix);
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    updateNodeColor(node, instanceId = this.nodeIdToInstanceId.get(node.id)) {
        if (instanceId === undefined || !this.instancedMesh.instanceColor) return;

        const color = new THREE.Color(node.data.color || 0xffffff);
        this.instancedMesh.setColorAt(instanceId, color);
        this.instancedMesh.instanceColor.needsUpdate = true;
    }

    removeNode(node) {
        const instanceId = this.nodeIdToInstanceId.get(node.id);
        if (instanceId === undefined) return;

        this.instancedMesh.setMatrixAt(instanceId, new THREE.Matrix4().makeScale(0, 0, 0));
        this.instancedMesh.instanceMatrix.needsUpdate = true;

        this.nodeIdToInstanceId.delete(node.id);
        this.instanceIdToNodeId.delete(instanceId);
    }

    getRaycastIntersection(raycaster) {
        if (!this.instancedMesh || this.activeInstances === 0) return null;

        const intersection = raycaster.intersectObject(this.instancedMesh);
        if (intersection.length === 0) return null;

        const instanceId = intersection[0].instanceId;
        const nodeId = this.instanceIdToNodeId.get(instanceId);
        return nodeId ? { ...intersection[0], nodeId } : null;
    }

    dispose() {
        this.instancedMesh.parent?.remove(this.instancedMesh);
        this.instancedMesh.geometry.dispose();
        this.instancedMesh.material.dispose();
        this.nodeIdToInstanceId.clear();
        this.instanceIdToNodeId.clear();
    }
}

export class InstancedMeshManager {
    constructor(scene) {
        this.scene = scene;
        this.meshGroups = new Map();
        this.gltfLoader = new GLTFLoader();
        this.loadedGltfGeometries = new Map();
        this._initDefaultGeometries();
    }

    async _loadGltfModel(url) {
        if (this.loadedGltfGeometries.has(url)) {
            return this.loadedGltfGeometries.get(url);
        }

        try {
            const gltf = await this.gltfLoader.loadAsync(url);
            let geometry = null;
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    geometry = child.geometry;
                }
            });

            if (geometry) {
                this.loadedGltfGeometries.set(url, geometry);
                return geometry;
            } else {
                console.warn(`GLTF model at ${url} contains no mesh geometry.`);
                return null;
            }
        } catch (error) {
            console.error(`Error loading GLTF model from ${url}:`, error);
            return null;
        }
    }

    _initDefaultGeometries() {
        const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 12);
        const defaultMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.6,
            metalness: 0.2,
        });
        this.meshGroups.set('sphere', new InstancedMeshGroup(sphereGeometry, defaultMaterial, this.scene));
    }

    async getNodeGroup(node) {
        if (node.data.shape === 'sphere') {
            return this.meshGroups.get('sphere');
        } else if (node.data.gltfUrl) {
            let group = this.meshGroups.get(node.data.gltfUrl);
            if (!group) {
                const geometry = await this._loadGltfModel(node.data.gltfUrl);
                if (geometry) {
                    const material = new THREE.MeshStandardMaterial({
                        roughness: 0.6,
                        metalness: 0.2,
                    });
                    group = new InstancedMeshGroup(geometry, material, this.scene);
                    this.meshGroups.set(node.data.gltfUrl, group);
                }
            }
            return group;
        }
        return null;
    }

    async addNode(node) {
        const group = await this.getNodeGroup(node);
        if (!group) {
            node.isInstanced = false;
            return false;
        }
        const instanceId = group.addNode(node);
        if (instanceId === null) {
            node.isInstanced = false;
            return false;
        }
        node.isInstanced = true;
        node.instanceId = instanceId;
        if (node.mesh) node.mesh.visible = false;
        return true;
    }

    async updateNode(node) {
        if (!node.isInstanced) return;
        const group = await this.getNodeGroup(node);
        if (group) {
            group.updateNodeTransform(node);
            group.updateNodeColor(node);
        }
    }

    async removeNode(node) {
        if (!node.isInstanced) return;
        const group = await this.getNodeGroup(node);
        if (group) {
            group.removeNode(node);
            node.isInstanced = false;
        }
    }

    raycast(raycaster) {
        let closestIntersection = null;
        for (const group of this.meshGroups.values()) {
            const intersection = group.getRaycastIntersection(raycaster);
            if (intersection && (!closestIntersection || intersection.distance < closestIntersection.distance)) {
                closestIntersection = intersection;
            }
        }
        return closestIntersection;
    }

    dispose() {
        this.meshGroups.forEach((group) => group.dispose());
        this.meshGroups.clear();
    }
}
