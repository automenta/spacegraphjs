/**
 * @file InstancedEdgeManager.js - Manages instanced rendering for edges.
 * This is an optimization for rendering a large number of edges by reducing draw calls.
 * It uses THREE.InstancedMesh with a cylinder geometry to represent edges.
 * This approach might trade some visual fidelity of Line2 for performance.
 */
import * as THREE from 'three';

const MAX_INSTANCED_EDGES = 5000; // Max instances for edges
const DEFAULT_EDGE_THICKNESS = 0.5; // Default thickness for instanced edges (radius of cylinder)

class InstancedEdgeGroup {
    constructor(scene) {
        // Base geometry: a cylinder pointing along the Y-axis, height 1, radius 0.5 (diameter 1)
        // We'll scale its height to match edge length, and radius for thickness.
        this.geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1);
        this.material = new THREE.MeshStandardMaterial({
            roughness: 0.8,
            metalness: 0.2,
            vertexColors: true, // For per-instance color
        });

        this.instancedMesh = new THREE.InstancedMesh(this.geometry, this.material, MAX_INSTANCED_EDGES);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        }
        // Instanced edges should generally not cast shadows for performance, but can receive.
        this.instancedMesh.castShadow = false;
        this.instancedMesh.receiveShadow = true;

        scene.add(this.instancedMesh);

        this.edgeIdToInstanceId = new Map();
        this.instanceIdToEdgeId = new Map();
        this.activeInstances = 0;
        // TODO: Implement slot reuse for better memory management if edges are frequently added/removed
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
        const position = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5); // Midpoint
        const direction = new THREE.Vector3().subVectors(targetPos, sourcePos);
        const length = direction.length();
        direction.normalize();

        // Cylinder's default orientation is along Y-axis.
        // We need to orient it along the 'direction' vector.
        const quaternion = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0); // Cylinder's original axis
        if (!direction.equals(new THREE.Vector3(0,0,0))) { // Avoid issues with zero vector
            if (up.dot(direction) > 0.9999 || up.dot(direction) < -0.9999) { // Aligned or opposite
                 if (up.dot(direction) < -0.9999) { // Opposite
                    quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0), Math.PI); // Rotate 180 deg around X
                 } // Else, already aligned, no rotation needed for quaternion.setFromUnitVectors(up, direction)
            } else {
                 quaternion.setFromUnitVectors(up, direction);
            }
        }


        const thickness = edge.data?.thicknessInstanced ?? DEFAULT_EDGE_THICKNESS;
        // Scale: Y for length, X and Z for thickness (radius)
        // Base cylinder has height 1 and radius 0.5.
        // Scale Y by 'length'. Scale X and Z by 'thickness / 0.5' = thickness * 2.
        const scale = new THREE.Vector3(thickness * 2, length, thickness * 2);

        matrix.compose(position, quaternion, scale);
        this.instancedMesh.setMatrixAt(instanceId, matrix);
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    updateEdgeColor(edge, instanceIdOverride = null) {
        const instanceId = instanceIdOverride ?? this.edgeIdToInstanceId.get(edge.id);
        if (instanceId === undefined || !this.instancedMesh.instanceColor) return;

        // For simplicity, using edge.data.color. Gradients are complex for this simple instancing.
        const color = new THREE.Color(edge.data?.color ?? 0x888888); // Default to gray
        this.instancedMesh.setColorAt(instanceId, color);
        this.instancedMesh.instanceColor.needsUpdate = true;
    }

    removeEdge(edge) {
        const instanceId = this.edgeIdToInstanceId.get(edge.id);
        if (instanceId === undefined) return;

        // "Remove" by scaling to zero. Proper slot management needed for production.
        const matrix = new THREE.Matrix4().makeScale(0, 0, 0);
        this.instancedMesh.setMatrixAt(instanceId, matrix);
        this.instancedMesh.instanceMatrix.needsUpdate = true;

        this.edgeIdToInstanceId.delete(edge.id);
        this.instanceIdToEdgeId.delete(instanceId);
        // Note: activeInstances is not decremented here, leading to eventual cap if not managed.
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
                    edgeId: edgeId // Custom: add edgeId here
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
        // For now, a single group. Could be extended for different edge materials/types.
        this.edgeGroup = new InstancedEdgeGroup(this.scene);
    }

    addEdge(edge) {
        if (this.edgeGroup) {
            const instanceId = this.edgeGroup.addEdge(edge);
            if (instanceId !== null) {
                edge.isInstanced = true;
                edge.instanceId = instanceId; // Store its instanceId
                if (edge.line) edge.line.visible = false; // Hide original Line2 mesh
                // Also hide arrowheads if they exist on the original edge
                if (edge.arrowheads) {
                    if(edge.arrowheads.source) edge.arrowheads.source.visible = false;
                    if(edge.arrowheads.target) edge.arrowheads.target.visible = false;
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
        // Make original Line2 visible again if needed, or assume it's fully removed/re-added by EdgePlugin
        // if (edge.line) edge.line.visible = true;
    }

    raycast(raycaster) {
        return this.edgeGroup?.getRaycastIntersection(raycaster);
    }

    dispose() {
        this.edgeGroup?.dispose();
        this.edgeGroup = null;
    }
}
Okay, I'll start with Phase 2: Implement Advanced Rendering & Visuals.

First, I'll tackle the post-processing effects. I'll use the `postprocessing` npm package as it's a popular and comprehensive library for Three.js.

I need to:
1.  Install the `postprocessing` package.
2.  Modify `RenderingPlugin.js` to integrate it.
3.  Implement Bloom, SSAO, and Outline effects.
4.  Add configuration options for these effects.
