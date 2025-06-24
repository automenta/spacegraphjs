import * as THREE from 'three';

const MAX_INSTANCED_EDGES = 5000;
const DEFAULT_EDGE_THICKNESS = 0.5;

class InstancedEdgeGroup {
    constructor(scene) {
        this.geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1);
        this.material = new THREE.MeshStandardMaterial({
            roughness: 0.8,
            metalness: 0.2,
            vertexColors: true,
        });

        this.instancedMesh = new THREE.InstancedMesh(this.geometry, this.material, MAX_INSTANCED_EDGES);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        }
        this.instancedMesh.castShadow = false;
        this.instancedMesh.receiveShadow = true;

        scene.add(this.instancedMesh);

        this.edgeIdToInstanceId = new Map();
        this.instanceIdToEdgeId = new Map();
        this.activeInstances = 0;
    }

    addEdge(edge) {
        if (this.activeInstances >= MAX_INSTANCED_EDGES) {
            console.warn('InstancedEdgeManager: Max instances reached.');
            return null;
        }

        const instanceId = this.activeInstances++;
        this.edgeIdToInstanceId.set(edge.id, instanceId);
        this.instanceIdToEdgeId.set(instanceId, edge.id);

        this.updateEdgeTransform(edge, instanceId);
        this.updateEdgeColor(edge, instanceId);
        return instanceId;
    }

    updateEdgeTransform(edge, instanceIdOverride = null) {
        const instanceId = instanceIdOverride ?? this.edgeIdToInstanceId.get(edge.id);
        if (instanceId === undefined) return;

        const sourcePos = edge.source.position;
        const targetPos = edge.target.position;

        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);
        const direction = new THREE.Vector3().subVectors(targetPos, sourcePos);
        const length = direction.length();
        direction.normalize();

        const quaternion = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        if (!direction.equals(new THREE.Vector3(0, 0, 0))) {
            if (up.dot(direction) > 0.9999 || up.dot(direction) < -0.9999) {
                if (up.dot(direction) < -0.9999) {
                    quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
                }
            } else {
                quaternion.setFromUnitVectors(up, direction);
            }
        }

        const thickness = edge.data?.thicknessInstanced ?? DEFAULT_EDGE_THICKNESS;
        const scale = new THREE.Vector3(thickness * 2, length, thickness * 2);

        matrix.compose(position, quaternion, scale);
        this.instancedMesh.setMatrixAt(instanceId, matrix);
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    updateEdgeColor(edge, instanceIdOverride = null) {
        const instanceId = instanceIdOverride ?? this.edgeIdToInstanceId.get(edge.id);
        if (instanceId === undefined || !this.instancedMesh.instanceColor) return;

        const color = new THREE.Color(edge.data?.color ?? 0x888888);
        this.instancedMesh.setColorAt(instanceId, color);
        this.instancedMesh.instanceColor.needsUpdate = true;
    }

    removeEdge(edge) {
        const instanceId = this.edgeIdToInstanceId.get(edge.id);
        if (instanceId === undefined) return;

        const matrix = new THREE.Matrix4().makeScale(0, 0, 0);
        this.instancedMesh.setMatrixAt(instanceId, matrix);
        this.instancedMesh.instanceMatrix.needsUpdate = true;

        this.edgeIdToInstanceId.delete(edge.id);
        this.instanceIdToEdgeId.delete(instanceId);
    }

    getRaycastIntersection(raycaster) {
        if (!this.instancedMesh || this.activeInstances === 0) return null;

        const intersection = raycaster.intersectObject(this.instancedMesh);
        if (intersection.length > 0) {
            const instanceId = intersection[0].instanceId;
            const edgeId = this.instanceIdToEdgeId.get(instanceId);
            if (edgeId) {
                return {
                    object: this.instancedMesh,
                    point: intersection[0].point,
                    distance: intersection[0].distance,
                    instanceId: instanceId,
                    edgeId: edgeId,
                };
            }
        }
        return null;
    }

    dispose() {
        this.instancedMesh.parent?.remove(this.instancedMesh);
        this.instancedMesh.geometry.dispose();
        this.instancedMesh.material.dispose();
        this.edgeIdToInstanceId.clear();
        this.instanceIdToEdgeId.clear();
    }
}

export class InstancedEdgeManager {
    constructor(scene) {
        this.scene = scene;
        this.edgeGroup = new InstancedEdgeGroup(this.scene);
    }

    addEdge(edge) {
        if (this.edgeGroup) {
            const instanceId = this.edgeGroup.addEdge(edge);
            if (instanceId !== null) {
                edge.isInstanced = true;
                edge.instanceId = instanceId;
                if (edge.line) edge.line.visible = false;
                if (edge.arrowheads) {
                    if (edge.arrowheads.source) edge.arrowheads.source.visible = false;
                    if (edge.arrowheads.target) edge.arrowheads.target.visible = false;
                }
                return true;
            }
        }
        edge.isInstanced = false;
        return false;
    }

    updateEdge(edge) {
        if (!edge.isInstanced || !this.edgeGroup) return;
        this.edgeGroup.updateEdgeTransform(edge);
        this.edgeGroup.updateEdgeColor(edge);
    }

    removeEdge(edge) {
        if (!edge.isInstanced || !this.edgeGroup) return;
        this.edgeGroup.removeEdge(edge);
        edge.isInstanced = false;
    }

    raycast(raycaster) {
        return this.edgeGroup?.getRaycastIntersection(raycaster);
    }

    dispose() {
        this.edgeGroup?.dispose();
        this.edgeGroup = null;
    }
}
