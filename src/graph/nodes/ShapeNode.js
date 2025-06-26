import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Node} from './Node.js';
import {createCSS3DLabelObject, applyLabelLOD} from '../../utils/labelUtils.js';

export class ShapeNode extends Node {
    static typeName = 'shape';
    shape = 'sphere';
    size = 50;
    color = 0xffffff;
    gltfUrl = null;
    lodData = [];
    isSelected = false;
    isHovered = false;

    constructor(id, position, data = {}, mass = 1.5) {
        super(id, position, data, mass);
        this.shape = this.data.shape ?? 'sphere';
        // Ensure size is a finite number, default to 50 if not
        this.size = Number.isFinite(this.data.size) ? this.data.size : 50;
        this.color = this.data.color ?? 0xffffff;
        this.gltfUrl = this.data.gltfUrl ?? null;
        this.lodData = this.data.lodLevels ?? [];

        this.mesh = new THREE.LOD();
        this.mesh.userData = { nodeId: this.id, type: 'shape-node-lod' };
        this._setupLODLevels();

        if (this.data.label) {
            this.labelObject = this._createLabel();
            this.labelObject.userData = { nodeId: this.id, type: 'shape-label' };
        }
        this.update();
        // Initial bounding sphere update, will be re-updated on GLTF load
        this.updateBoundingSphere();
    }

    getDefaultData() {
        return {
            label: '',
            shape: 'sphere',
            size: 50,
            color: 0xffffff,
            type: 'shape',
            lodLevels: [],
            labelLod: [],
        };
    }

    _setupLODLevels() {
        if (this.lodData?.length) {
            this.lodData.forEach((levelConf) => {
                const levelMesh = this._createRepresentationForLevel(levelConf);
                if (levelMesh) this.mesh.addLevel(levelMesh, levelConf.distance);
            });
        } else {
            const mainRepresentation = this._createRepresentationForLevel({
                shape: this.shape,
                gltfUrl: this.gltfUrl,
                gltfScale: this.data.gltfScale,
                size: this.size,
                color: this.color,
            });
            if (mainRepresentation) this.mesh.addLevel(mainRepresentation, 0);

            const placeholderSize = Math.max(10, (this.size || 50) / 3);
            const placeholder = this._createMeshForLevel({
                shape: 'box',
                size: placeholderSize,
                color: this.color,
            });
            if (placeholder) this.mesh.addLevel(placeholder, this.data.lodDistanceSimple ?? 700);
            this.mesh.addLevel(new THREE.Object3D(), this.data.lodDistanceHide ?? 1500);
        }
    }

    _createRepresentationForLevel(levelConfig) {
        return (levelConfig.shape === 'gltf' && levelConfig.gltfUrl)
            ? (() => {
                const gltfGroup = new THREE.Group();
                gltfGroup.castShadow = true;
                gltfGroup.receiveShadow = true;
                this._loadGltfModelForLevel(levelConfig, gltfGroup);
                return gltfGroup;
            })()
            : (levelConfig.shape ? this._createMeshForLevel(levelConfig) : null);
    }

    _createMeshForLevel(levelConfig) {
        let geometry;
        // Ensure levelConfig.size is a finite number, default to this.size if not
        const effectiveLevelSize = Number.isFinite(levelConfig.size) ? levelConfig.size : this.size;
        const effectiveSize = Math.max(5, effectiveLevelSize); // Ensure minimum size
        const shapeType = levelConfig.shape || 'sphere';
        const color = levelConfig.color || this.color;

        switch (shapeType) {
            case 'box':
                geometry = new THREE.BoxGeometry(effectiveSize, effectiveSize, effectiveSize);
                break;
            case 'sphere':
            default:
                geometry = new THREE.SphereGeometry(effectiveSize / 2, 32, 16);
                break;
        }
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.7,
            metalness: 0.1,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    _loadGltfModelForLevel(levelConfig, targetGroup) {
        if (!levelConfig.gltfUrl || !targetGroup) return;

        const loader = new GLTFLoader();
        loader.load(
            levelConfig.gltfUrl,
            (gltf) => {
                const modelScene = gltf.scene;
                modelScene.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // Apply color if specified and material allows
                        if (levelConfig.color && child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (mat.isMeshStandardMaterial || mat.isMeshBasicMaterial) {
                                        mat.color.set(levelConfig.color);
                                    }
                                });
                            } else if (child.material.isMeshStandardMaterial || child.material.isMeshBasicMaterial) {
                                child.material.color.set(levelConfig.color);
                            }
                        }
                    }
                });

                const bbox = new THREE.Box3().setFromObject(modelScene);
                const modelSize = new THREE.Vector3();
                bbox.getSize(modelSize);
                const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);
                let scale = 1;
                if (maxDim > 0) {
                    let targetDimension = levelConfig.gltfScale ?? this.data.gltfScale ?? levelConfig.size ?? this.size;
                    // Ensure targetDimension is a finite and positive number, default to 50 if not
                    if (!Number.isFinite(targetDimension) || targetDimension <= 0) {
                        targetDimension = 50; // Fallback to a reasonable default
                    }
                    scale = targetDimension / maxDim;
                }
                modelScene.scale.set(scale, scale, scale);

                const center = new THREE.Vector3();
                bbox.getCenter(center);
                // Adjust position based on the original bounding box center, scaled
                modelScene.position.sub(center.multiplyScalar(scale));

                while (targetGroup.children.length > 0) targetGroup.remove(targetGroup.children[0]);
                targetGroup.add(modelScene);

                const lodLevelEntry = this.mesh.levels.find((l) => l.object === targetGroup);
                if (lodLevelEntry?.distance === 0) {
                    this.updateBoundingSphere();
                }
                this.space?.emit('node:updated', {
                    node: this,
                    property: 'mesh_lod_level_loaded',
                    levelDetail: levelConfig,
                });
            },
            undefined,
            (error) => {
                console.error(`ShapeNode: Failed to load GLTF model from ${levelConfig.gltfUrl}. Falling back to primitive shape.`, error);
                const fallbackSize = levelConfig.size || this.size || 20;
                const fallbackColor = levelConfig.color || this.color || 0xff0000;
                const fallbackMesh = this._createMeshForLevel({
                    shape: 'box',
                    size: fallbackSize,
                    color: fallbackColor,
                });
                // Clear existing children before adding the fallback mesh
                while (targetGroup.children.length > 0) targetGroup.remove(targetGroup.children[0]);
                targetGroup.add(fallbackMesh);
                const lodLevelEntry = this.mesh.levels.find((l) => l.object === targetGroup);
                if (lodLevelEntry?.distance === 0) {
                    this.updateBoundingSphere();
                }
            }
        );
    }

    updateBoundingSphere() {
        if (!this._boundingSphere) this._boundingSphere = new THREE.Sphere();

        let objectToBound = null;
        if (this.mesh.levels.length > 0) {
            objectToBound = this.mesh.levels[0].object;
        }

        if (objectToBound) {
            const box = new THREE.Box3();
            // Compute bounding box in world coordinates, traversing all children
            box.setFromObject(objectToBound, true);

            // Check if the computed box is valid (not empty or containing NaNs)
            if (!box.isEmpty() && isFinite(box.min.x) && isFinite(box.max.x)) {
                const size = new THREE.Vector3();
                box.getSize(size);
                // The radius should be half the length of the diagonal of the bounding box
                this._boundingSphere.radius = size.length() / 2;
                // The center of the bounding sphere should be the node's position
                this._boundingSphere.center.copy(this.position);
            } else {
                // Fallback if bounding box computation failed or resulted in invalid values
                console.warn(`ShapeNode ${this.id}: Bounding box computation failed for object. Using fallback radius.`);
                this._boundingSphere.radius = (this.size || 50) / 2;
                this._boundingSphere.center.copy(this.position);
            }
        } else {
            // Fallback if no mesh or LOD levels are available
            this._boundingSphere.radius = (this.size || 50) / 2;
            this._boundingSphere.center.copy(this.position);
        }
    }

    _createLabel() {
        const styleData = {
            color: 'var(--sg-node-text)',
            backgroundColor: 'var(--sg-label-bg, rgba(10, 10, 20, 0.75))',
            fontSize: '14px',
        };
        return createCSS3DLabelObject(this.data.label, this.id, 'node-label-3d', styleData, 'shape-label');
    }

    update(space) {
        if (this.mesh) this.mesh.position.copy(this.position);
        if (this.labelObject) {
            const offset = this.getBoundingSphereRadius() * 1.1 + 10;
            this.labelObject.position.copy(this.position).y += offset;
            if (space?._cam) this.labelObject.quaternion.copy(space._cam.quaternion);
            applyLabelLOD(this.labelObject, this.data.labelLod, space);
        }
    }

    getBoundingSphereRadius() {
        // If bounding sphere hasn't been computed or is invalid for GLTF, recompute or use fallback
        if (!this._boundingSphere || (this.shape === 'gltf' && this.mesh?.children.length === 0 && this._boundingSphere.radius === 0)) {
            this.updateBoundingSphere();
        }
        return this._boundingSphere?.radius ?? this.size / 2;
    }

    setSelectedStyle(selected) {
        this.isSelected = selected;
        if (this.mesh instanceof THREE.LOD) {
            this.mesh.levels.forEach((level) => {
                level.object?.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.emissive?.setHex(selected ? 0xFFFF00 : 0x000000);
                        child.material.emissiveIntensity = (selected && child.material.emissive?.getHex() !== 0x000000) ? 1.0 : 0.0;
                    }
                });
            });
        }
        this.labelObject?.element?.classList.toggle('selected', selected);
        if (selected && this.isHovered) this.setHoverStyle(false, true);
    }

    setHoverStyle(hovered, force = false) {
        if (!force && this.isSelected) return;

        this.isHovered = hovered;

        if (this.mesh instanceof THREE.LOD) {
            this.mesh.levels.forEach((level) => {
                level.object?.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const targetEmissive = hovered && !this.isSelected ? 0x222200 : 0x000000;
                        const targetIntensity = hovered && !this.isSelected ? 0.4 : 0.0;
                        child.material.emissive?.setHex(targetEmissive);
                        child.material.emissiveIntensity = (targetEmissive !== 0x000000) ? targetIntensity : 0.0;
                    }
                });
            });
        }
        if (!this.isSelected) this.labelObject?.element?.classList.toggle('hovered', hovered);
    }

    dispose() {
        if (this.mesh) {
            if (this.mesh instanceof THREE.LOD) {
                this.mesh.levels.forEach((level) => {
                    level.object?.traverse((child) => {
                        if (child.isMesh) {
                            child.geometry?.dispose();
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else {
                                child.material?.dispose();
                            }
                        }
                    });
                });
            } else {
                this.mesh.geometry?.dispose();
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(mat => mat.dispose());
                } else {
                    this.mesh.material?.dispose();
                }
            }
            this.mesh.parent?.remove(this.mesh);
            this.mesh = null;
        }
        this.labelObject?.element?.remove();
        this.labelObject = null;
        super.dispose();
    }
}
