import * as THREE from "three";

const MAX_INSTANCED_EDGES = 5000;
const DEFAULT_EDGE_THICKNESS = 0.5;
const DEFAULT_ARROWHEAD_SIZE = 1.5;

class InstancedArrowheadGroup {
  constructor(scene) {
    this.geometry = new THREE.ConeGeometry(0.5, 1, 8); // Cone pointing along Y-axis
    this.material = new THREE.MeshStandardMaterial({
      roughness: 0.8,
      metalness: 0.2,
      vertexColors: true,
    });

    this.instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      MAX_INSTANCED_EDGES * 2,
    ); // Max 2 arrowheads per edge
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.instanceColor?.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.castShadow = false;
    this.instancedMesh.receiveShadow = true;

    scene.add(this.instancedMesh);

    this.arrowheadIdToInstanceId = new Map(); // Maps edgeId_source/target to instanceId
    this.instanceIdToArrowheadId = new Map(); // Maps instanceId to edgeId_source/target
    this.activeInstances = 0;

    // Reusable objects for performance
    this._matrix = new THREE.Matrix4();
    this._position = new THREE.Vector3();
    this._direction = new THREE.Vector3();
    this._quaternion = new THREE.Quaternion();
    this._scale = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._color = new THREE.Color();
  }

  addArrowhead(edge, type) {
    // type: 'source' or 'target'
    if (this.activeInstances >= MAX_INSTANCED_EDGES * 2) {
      console.warn("InstancedEdgeManager: Max arrowhead instances reached.");
      return null;
    }

    const instanceId = this.activeInstances++;
    const arrowheadId = `${edge.id}_${type}`;
    this.arrowheadIdToInstanceId.set(arrowheadId, instanceId);
    this.instanceIdToArrowheadId.set(instanceId, arrowheadId);

    this.updateArrowheadTransform(edge, type, instanceId);
    this.updateArrowheadColor(edge, instanceId);
    return instanceId;
  }

  updateArrowheadTransform(
    edge,
    type,
    instanceId = this.arrowheadIdToInstanceId.get(`${edge.id}_${type}`),
  ) {
    if (instanceId === undefined) return;

    const sourcePos = edge.source.position;
    const targetPos = edge.target.position;

    const arrowheadSize = edge.data?.arrowheadSize ?? DEFAULT_ARROWHEAD_SIZE;

    // Calculate direction
    this._direction.subVectors(targetPos, sourcePos).normalize();

    // Calculate position
    if (type === "target") {
      this._position
        .copy(targetPos)
        .sub(this._direction.clone().multiplyScalar(arrowheadSize * 0.5));
    } else {
      // 'source'
      this._position
        .copy(sourcePos)
        .add(this._direction.clone().multiplyScalar(arrowheadSize * 0.5));
    }

    // Calculate orientation
    if (!this._direction.equals(new THREE.Vector3(0, 0, 0))) {
      if (
        this._up.dot(this._direction) > 0.9999 ||
        this._up.dot(this._direction) < -0.9999
      ) {
        if (this._up.dot(this._direction) < -0.9999)
          this._quaternion.setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            Math.PI,
          );
      } else {
        this._quaternion.setFromUnitVectors(this._up, this._direction);
      }
    } else {
      this._quaternion.identity();
    }

    // Set scale
    this._scale.set(arrowheadSize, arrowheadSize, arrowheadSize);

    // Compose matrix and update
    this._matrix.compose(this._position, this._quaternion, this._scale);
    this.instancedMesh.setMatrixAt(instanceId, this._matrix);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  updateArrowheadColor(edge, instanceId) {
    if (instanceId === undefined || !this.instancedMesh.instanceColor) return;

    // Use arrowhead color if specified, otherwise use edge color
    const colorValue =
      edge.data?.arrowheadColor ?? edge.data?.color ?? 0x888888;
    this._color.set(colorValue);
    this.instancedMesh.setColorAt(instanceId, this._color);
    this.instancedMesh.instanceColor.needsUpdate = true;
  }

  removeArrowhead(edge, type) {
    const arrowheadId = `${edge.id}_${type}`;
    const instanceId = this.arrowheadIdToInstanceId.get(arrowheadId);
    if (instanceId === undefined) return;

    // Scale to zero to effectively hide
    this.instancedMesh.setMatrixAt(instanceId, this._matrix.makeScale(0, 0, 0));
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    this.arrowheadIdToInstanceId.delete(arrowheadId);
    this.instanceIdToArrowheadId.delete(instanceId);
  }

  dispose() {
    this.instancedMesh.parent?.remove(this.instancedMesh);
    this.instancedMesh.geometry.dispose();
    this.instancedMesh.material.dispose();
    this.arrowheadIdToInstanceId.clear();
    this.instanceIdToArrowheadId.clear();
  }
}

class InstancedEdgeGroup {
  constructor(scene) {
    this.geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1);
    this.material = new THREE.MeshStandardMaterial({
      roughness: 0.8,
      metalness: 0.2,
      vertexColors: true,
    });

    this.instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      MAX_INSTANCED_EDGES,
    );
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.instanceColor?.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.castShadow = false;
    this.instancedMesh.receiveShadow = true;

    scene.add(this.instancedMesh);

    this.edgeIdToInstanceId = new Map();
    this.instanceIdToEdgeId = new Map();
    this.activeInstances = 0;

    // Reusable objects for performance
    this._matrix = new THREE.Matrix4();
    this._position = new THREE.Vector3();
    this._direction = new THREE.Vector3();
    this._quaternion = new THREE.Quaternion();
    this._scale = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._color = new THREE.Color();
  }

  addEdge(edge) {
    if (this.activeInstances >= MAX_INSTANCED_EDGES) {
      console.warn("InstancedEdgeManager: Max instances reached.");
      return null;
    }

    const instanceId = this.activeInstances++;
    this.edgeIdToInstanceId.set(edge.id, instanceId);
    this.instanceIdToEdgeId.set(instanceId, edge.id);

    this.updateEdgeTransform(edge, instanceId);
    this.updateEdgeColor(edge, instanceId);
    return instanceId;
  }

  updateEdgeTransform(edge, instanceId = this.edgeIdToInstanceId.get(edge.id)) {
    if (instanceId === undefined) return;

    const sourcePos = edge.source.position;
    const targetPos = edge.target.position;

    // Calculate midpoint position
    this._position.addVectors(sourcePos, targetPos).multiplyScalar(0.5);

    // Calculate direction and length
    this._direction.subVectors(targetPos, sourcePos);
    const length = this._direction.length();

    // Handle zero-length edges
    if (length === 0) {
      this.instancedMesh.setMatrixAt(
        instanceId,
        this._matrix.makeScale(0, 0, 0),
      );
      this.instancedMesh.instanceMatrix.needsUpdate = true;
      return;
    }

    this._direction.normalize();

    // Calculate orientation
    if (!this._direction.equals(new THREE.Vector3(0, 0, 0))) {
      if (
        this._up.dot(this._direction) > 0.9999 ||
        this._up.dot(this._direction) < -0.9999
      ) {
        if (this._up.dot(this._direction) < -0.9999)
          this._quaternion.setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            Math.PI,
          );
      } else {
        this._quaternion.setFromUnitVectors(this._up, this._direction);
      }
    } else {
      this._quaternion.identity();
    }

    // Calculate scale (thickness, length, thickness)
    const thickness = edge.data?.thicknessInstanced ?? DEFAULT_EDGE_THICKNESS;
    this._scale.set(thickness, length, thickness);

    // Compose matrix and update
    this._matrix.compose(this._position, this._quaternion, this._scale);
    this.instancedMesh.setMatrixAt(instanceId, this._matrix);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  updateEdgeColor(edge, instanceId = this.edgeIdToInstanceId.get(edge.id)) {
    if (instanceId === undefined || !this.instancedMesh.instanceColor) return;

    const colorValue = edge.data?.color ?? 0x888888;
    this._color.set(colorValue);
    this.instancedMesh.setColorAt(instanceId, this._color);
    this.instancedMesh.instanceColor.needsUpdate = true;
  }

  removeEdge(edge) {
    const instanceId = this.edgeIdToInstanceId.get(edge.id);
    if (instanceId === undefined) return;

    // Scale to zero to effectively hide
    this.instancedMesh.setMatrixAt(instanceId, this._matrix.makeScale(0, 0, 0));
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    this.edgeIdToInstanceId.delete(edge.id);
    this.instanceIdToEdgeId.delete(instanceId);
  }

  getRaycastIntersection(raycaster) {
    if (!this.instancedMesh || this.activeInstances === 0) return null;

    const intersection = raycaster.intersectObject(this.instancedMesh);
    if (intersection.length === 0) return null;

    const instanceId = intersection[0].instanceId;
    const edgeId = this.instanceIdToEdgeId.get(instanceId);
    return edgeId ? { ...intersection[0], edgeId } : null;
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
    this.arrowheadGroup = new InstancedArrowheadGroup(this.scene);
  }

  addEdge(edge) {
    const instanceId = this.edgeGroup?.addEdge(edge);
    if (instanceId === null) {
      edge.isInstanced = false;
      return false;
    }
    edge.isInstanced = true;
    edge.instanceId = instanceId;
    if (edge.line) edge.line.visible = false;
    if (edge.data.arrowheads?.source) {
      this.arrowheadGroup?.addArrowhead(edge, "source");
    }
    if (edge.data.arrowheads?.target) {
      this.arrowheadGroup?.addArrowhead(edge, "target");
    }
    return true;
  }

  updateEdge(edge) {
    if (edge.isInstanced) {
      this.edgeGroup?.updateEdgeTransform(edge);
      this.edgeGroup?.updateEdgeColor(edge);
      if (edge.data.arrowheads?.source)
        this.arrowheadGroup?.updateArrowheadTransform(edge, "source");
      if (edge.data.arrowheads?.target)
        this.arrowheadGroup?.updateArrowheadTransform(edge, "target");
      this.arrowheadGroup?.updateArrowheadColor(edge);
    }
  }

  removeEdge(edge) {
    if (!edge.isInstanced) return;
    this.edgeGroup?.removeEdge(edge);
    if (edge.data.arrowheads?.source)
      this.arrowheadGroup?.removeArrowhead(edge, "source");
    if (edge.data.arrowheads?.target)
      this.arrowheadGroup?.removeArrowhead(edge, "target");
    edge.isInstanced = false;
  }

  raycast(raycaster) {
    return this.edgeGroup?.getRaycastIntersection(raycaster);
  }

  dispose() {
    this.edgeGroup?.dispose();
    this.arrowheadGroup?.dispose();
    this.edgeGroup = null;
    this.arrowheadGroup = null;
  }
}
