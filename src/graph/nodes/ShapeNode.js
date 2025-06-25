import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BaseNode } from './BaseNode.js';

export class ShapeNode extends BaseNode {
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
        this.size = this.data.size ?? 50;
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
        if (this.mesh.levels.length > 0 && this.mesh.levels[0].object) {
            this.updateBoundingSphere();
        }
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
                glttfGroup.castShadow = true;
                gltfGroup.receiveShadow = true;
                this._loadGltfModelForLevel(levelConfig, gltfGroup);
                return gltfGroup;
            })()
            : (levelConfig.shape ? this._createMeshForLevel(levelConfig) : null);
    }

    _createMeshForLevel(levelConfig) {
        let geometry;
        const effectiveSize = Math.max(5, levelConfig.size || this.size);
        const shapeType = levelConfig.shape || 'sphere';
        const color = levelConfig.color || this.color;

        switch (shapeType) {
            case 'box':
                geometry = new THREE.BoxGeometry(effectiveSize, effectiveSize, effectiveSize);
                break;
            case 'sphere':
            default:
                geometry = new THREE.SphereGeometry(effectiveSize / 2, 8, 6);
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
                    }
                });

                const box = new THREE.Box3().setFromObject(modelScene);
                const modelSize = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);
                let scale = 1;
                if (maxDim > 0) {
                    const scaleFactor = levelConfig.gltfScale ?? this.data.gltfScale ?? levelConfig.size ?? this.size;
                    scale = scaleFactor / maxDim;
                }
                modelScene.scale.set(scale, scale, scale);

                const center = box.getCenter(new THREE.Vector3());
                modelScene.position.sub(center.multiplyScalar(scale));

                while (targetGroup.children.length > 0) targetGroup.remove(targetGroup.children[0]);
                targetGroup.add(modelScene);

                const lodLevelEntry = this.mesh.levels.find((l) => l.object === targetGroup);
                if (lodLevelEntry?.distance === 0) this.updateBoundingSphere();
                this.space?.emit('node:updated', {
                    node: this,
                    property: 'mesh_lod_level_loaded',
                    levelDetail: levelConfig,
                });
            },
            undefined,
            () => {
                const fallbackSize = levelConfig.size || this.size || 20;
                const fallbackColor = levelConfig.color || this.color || 0xff0000;
                const fallbackMesh = this._createMeshForLevel({
                    shape: 'box',
                    size: fallbackSize,
                    color: fallbackColor,
                });
                targetGroup.add(fallbackMesh);
                const lodLevelEntry = this.mesh.levels.find((l) => l.object === targetGroup);
                if (lodLevelEntry?.distance === 0) this.updateBoundingSphere();
            }
        );
    }

    updateBoundingSphere() {
        if (!this._boundingSphere) this._boundingSphere = new THREE.Sphere();

        if (this.mesh.levels.length > 0) {
            const primaryRepresentation = this.mesh.levels[0].object;
            if (primaryRepresentation) {
                const box = new THREE.Box3();
                if (primaryRepresentation.children.length > 0) {
                    box.setFromObject(primaryRepresentation, true);
                } else if (primaryRepresentation.geometry) {
                    if (!primaryRepresentation.geometry.boundingBox) primaryRepresentation.geometry.computeBoundingBox();
                    box.copy(primaryRepresentation.geometry.boundingBox).applyMatrix4(primaryRepresentation.matrixWorld);
                } else {
                    box.setFromCenterAndSize(this.mesh.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(this.size, this.size, this.size));
                }

                if (!box.isEmpty()) {
                    box.getBoundingSphere(this._boundingSphere);
                } else {
                    this._boundingSphere.radius = (this.size || 50) / 2;
                }
            } else {
                this._boundingSphere.radius = (this.size || 50) / 2;
            }
        } else {
            this._boundingSphere.radius = (this.size || 50) / 2;
        }
        this._boundingSphere.center.copy(this.position);
    }

    _createLabel() {
        const div = document.createElement('div');
        div.className = 'node-label-3d node-common';
        div.textContent = this.data.label;
        div.dataset.nodeId = this.id;
        return new CSS3DObject(div);
    }

    update(space) {
        if (this.mesh) this.mesh.position.copy(this.position);
        if (this.labelObject) {
            const offset = this.getBoundingSphereRadius() * 1.1 + 10;
            this.labelObject.position.copy(this.position).y += offset;
            if (space?.camera?._cam) this.labelObject.quaternion.copy(space.camera._cam.quaternion);
            this._applyLabelLOD(space);
        }
    }

    _applyLabelLOD(space) {
        if (!this.labelObject?.element || !this.data.labelLod?.length) {
            if (this.labelObject?.element) this.labelObject.element.style.visibility = '';
            return;
        }

        const camera = space?.plugins?.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!camera) return;

        const distanceToCamera = this.position.distanceTo(camera.position);
        const sortedLodLevels = [...this.data.labelLod].sort((a, b) => (b.distance || 0) - (a.distance || 0));

        let visibilityApplied = false;
        for (const level of sortedLodLevels) {
            if (distanceToCamera >= (level.distance || 0)) {
                this.labelObject.element.style.visibility = level.style?.includes('visibility:hidden') ? 'hidden' : '';
                visibilityApplied = true;
                break;
            }
        }
        if (!visibilityApplied) this.labelObject.element.style.visibility = '';
    }

    getBoundingSphereRadius() {
        if (!this._boundingSphere || (this.shape === 'gltf' && this.mesh?.children.length === 0)) {
            if (this.shape === 'gltf' && (!this._boundingSphere || this._boundingSphere.radius === 0)) {
                return this.size / 2;
            }
            if (!this._boundingSphere) this.updateBoundingSphere();
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
}
