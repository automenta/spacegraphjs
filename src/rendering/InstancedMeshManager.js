import * as THREE from 'three';

const MAX_INSTANCES_PER_TYPE = 1000; // Max instances per geometry type for PoC

class InstancedMeshGroup {
    constructor(geometry, material, scene) {
        this.geometry = geometry;
        this.material = material.clone(); // Clone to allow modifications like vertexColors
        this.material.vertexColors = true; // Crucial for per-instance colors

        this.instancedMesh = new THREE.InstancedMesh(this.geometry, this.material, MAX_INSTANCES_PER_TYPE);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // Important for updates
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        }

        scene.add(this.instancedMesh);

        this.nodeIdToInstanceId = new Map(); // Map original node ID to instance ID
        this.instanceIdToNodeId = new Map(); // Map instance ID back to original node ID
        this.activeInstances = 0;
        this.availableInstanceSlots = []; // For reusing slots (not implemented in PoC's first pass)
    }

    addNode(node) {
        if (this.activeInstances >= MAX_INSTANCES_PER_TYPE) {
            console.warn('InstancedMeshManager: Max instances reached for this type.');
            return null;
        }

        const instanceId = this.activeInstances++;
        this.nodeIdToInstanceId.set(node.id, instanceId);
        this.instanceIdToNodeId.set(instanceId, node.id);

        this.updateNodeTransform(node, instanceId);
        this.updateNodeColor(node, instanceId);

        return instanceId;
    }

    updateNodeTransform(node, instanceIdOverride = null) {
        const instanceId = instanceIdOverride ?? this.nodeIdToInstanceId.get(node.id);
        if (instanceId === undefined) return;

        // ShapeNode's mesh might not exist or might be a placeholder if fully instanced.
        // We need to construct the matrix from node.position, node.rotation (if any), and node.size.
        const matrix = new THREE.Matrix4();
        const position = node.position;
        const rotation = node.mesh?.quaternion || new THREE.Quaternion(); // Assuming node.mesh.quaternion if available

        // Scale based on node.size. Assuming node.size is diameter for sphere, or uniform size for box.
        // For sphere, geometry is radius 1, so scale by size/2.
        // For box, geometry is size 1, so scale by size.
        // This needs to be geometry-specific. For PoC sphere (radius 0.5 for a 1-unit diameter sphere):
        const scaleValue = node.size / 2 / 0.5; // If base sphere geometry is radius 0.5 (diameter 1)
                                            // Or node.size if base geometry is 1x1x1 cube.
                                            // Let's assume ShapeNode's default sphere has radius `size/2`.
                                            // If our base instanced sphere geometry has radius 1, then scale is `node.size / 2`.
                                            // If our base instanced sphere geometry has radius 0.5, then scale is `node.size`.
        // For this PoC, let's assume the base geometry for instancing is a unit sphere (radius 0.5, diameter 1).
        // Then, the scale factor will be node.size.
        // However, ShapeNode's SphereGeometry(effectiveSize / 2, ...), so its radius is node.size/2.
        // If our instanced geometry is a new SphereGeometry(0.5, 16, 12) (diameter 1), scale is node.size.

        // Let's use a standard unit sphere (radius 0.5) for instancing.
        // ShapeNode creates SphereGeometry(effectiveSize / 2, ...). So its radius is this.size / 2.
        // Scale needed = (node.size / 2) / 0.5 = node.size.
        const scale = new THREE.Vector3(node.size, node.size, node.size);


        matrix.compose(position, rotation, scale);
        this.instancedMesh.setMatrixAt(instanceId, matrix);
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    updateNodeColor(node, instanceIdOverride = null) {
        const instanceId = instanceIdOverride ?? this.nodeIdToInstanceId.get(node.id);
        if (instanceId === undefined || !this.instancedMesh.instanceColor) return;

        const color = new THREE.Color(node.data.color || 0xffffff); // Default to white if no color
        this.instancedMesh.setColorAt(instanceId, color);
        this.instancedMesh.instanceColor.needsUpdate = true;
    }

    removeNode(node) {
        const instanceId = this.nodeIdToInstanceId.get(node.id);
        if (instanceId === undefined) return;

        // Simple removal: Set scale to zero for the instance matrix
        // A more robust solution would involve managing a free list of instanceIds
        // and potentially compacting the arrays, or re-adding the last active instance
        // into the freed slot.
        const matrix = new THREE.Matrix4().makeScale(0, 0, 0); // Zero scale
        this.instancedMesh.setMatrixAt(instanceId, matrix);
        this.instancedMesh.instanceMatrix.needsUpdate = true;

        // TODO: Manage availableInstanceSlots for reuse if activeInstances is not decremented
        // For now, we don't decrement activeInstances, just make it invisible.
        // This means MAX_INSTANCES_PER_TYPE is a hard cap on total nodes ever added of this type.
        this.nodeIdToInstanceId.delete(node.id);
        this.instanceIdToNodeId.delete(instanceId);
        // this.activeInstances--; // If we were to implement slot reuse
    }

    getRaycastIntersection(raycaster) {
        if (!this.instancedMesh || this.activeInstances === 0) return null;

        const intersection = raycaster.intersectObject(this.instancedMesh);
        if (intersection.length > 0) {
            const instanceId = intersection[0].instanceId;
            const nodeId = this.instanceIdToNodeId.get(instanceId);
            if (nodeId) {
                // Return an object compatible with what UIManager might expect
                return {
                    object: this.instancedMesh, // The instanced mesh itself
                    point: intersection[0].point,
                    distance: intersection[0].distance,
                    instanceId: instanceId,
                    nodeId: nodeId // Custom: add nodeId here
                };
            }
        }
        return null;
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
        this.meshGroups = new Map(); // Map: geometryType -> InstancedMeshGroup
        this._initDefaultGeometries();
    }

    _initDefaultGeometries() {
        // For PoC, only sphere. In a full system, would have box, cylinder etc.
        const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 12); // Unit sphere (diameter 1, radius 0.5)
        const defaultMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.6,
            metalness: 0.2,
            // vertexColors: true will be set by InstancedMeshGroup
        });
        this.meshGroups.set('sphere', new InstancedMeshGroup(sphereGeometry, defaultMaterial, this.scene));

        // Example for box if we were to expand:
        // const boxGeometry = new THREE.BoxGeometry(1, 1, 1); // Unit box
        // this.meshGroups.set('box', new InstancedMeshGroup(boxGeometry, defaultMaterial, this.scene));
    }

    getNodeGroup(node) {
        // Determine group based on node.data.shape or other criteria
        if (node.data.shape === 'sphere') {
            return this.meshGroups.get('sphere');
        }
        // Add more types like 'box' here
        return null;
    }

    addNode(node) {
        const group = this.getNodeGroup(node);
        if (group) {
            const instanceId = group.addNode(node);
            if (instanceId !== null) {
                node.isInstanced = true; // Mark the node as being instanced
                node.instanceId = instanceId; // Store its instanceId
                if(node.mesh) node.mesh.visible = false; // Hide original mesh if it exists
                return true;
            }
        }
        node.isInstanced = false;
        return false;
    }

    updateNode(node) {
        if (!node.isInstanced) return;
        const group = this.getNodeGroup(node);
        if (group) {
            group.updateNodeTransform(node);
            group.updateNodeColor(node);
        }
    }

    removeNode(node) {
        if (!node.isInstanced) return;
        const group = this.getNodeGroup(node);
        if (group) {
            group.removeNode(node);
            node.isInstanced = false;
        }
    }

    // Method for raycasting against all managed instanced meshes
    raycast(raycaster) {
        let closestIntersection = null;
        for (const group of this.meshGroups.values()) {
            const intersection = group.getRaycastIntersection(raycaster);
            if (intersection) {
                if (!closestIntersection || intersection.distance < closestIntersection.distance) {
                    closestIntersection = intersection;
                }
            }
        }
        return closestIntersection; // This will include nodeId if an instance is hit
    }

    dispose() {
        this.meshGroups.forEach(group => group.dispose());
        this.meshGroups.clear();
    }
}
