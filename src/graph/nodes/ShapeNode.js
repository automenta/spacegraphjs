import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BaseNode } from './BaseNode.js';

/**
 * Represents a 3D shape-based node in the graph, supporting basic geometric shapes
 * and GLTF model loading, with Level of Detail (LOD) capabilities.
 * The node's primary visual representation (`this.mesh`) is a `THREE.LOD` object.
 */
export class ShapeNode extends BaseNode {
    /** @type {string} Default shape if not specified by LOD levels or main data. */
    shape = 'sphere';
    /** @type {number} Default size if not specified by LOD levels or main data. */
    size = 50;
    /** @type {number} Default color if not specified by LOD levels or main data. */
    color = 0xffffff;
    /** @type {string | null} URL for the primary GLTF model if no LOD levels specify one at distance 0. */
    gltfUrl = null;
    /** @type {Array<Object>} Configuration for LOD levels.
     * Each object: `{ distance: number, shape?: string, gltfUrl?: string, gltfScale?: number, size?: number, color?: number }`
     */
    lodData = [];

    /**
     * Creates an instance of ShapeNode.
     * @param {string} id Unique ID for the node.
     * @param {{x: number, y: number, z: number}} position Initial position.
     * @param {Object} [data={}] Node data, including `shape`, `size`, `color`, `gltfUrl`, `lodLevels`, `label`, `labelLod`.
     * @param {number} [mass=1.5] Mass for physics calculations.
     */
    constructor(id, position, data = {}, mass = 1.5) {
        super(id, position, data, mass);
        this.shape = this.data.shape ?? 'sphere';
        this.size = this.data.size ?? 50;
        this.color = this.data.color ?? 0xffffff;
        this.gltfUrl = this.data.gltfUrl ?? null;
        this.lodData = this.data.lodLevels ?? []; // Example: [{ distance: 0, shape: 'sphere', size: 50, color: 0xff0000 }, { distance: 200, shape: 'box', size: 20, color: 0x00ff00 }]

        // this.mesh will now be the THREE.LOD object
        this.mesh = new THREE.LOD();
        this.mesh.userData = { nodeId: this.id, type: 'shape-node-lod' };
        this._setupLODLevels();

        if (this.data.label) {
            this.labelObject = this._createLabel();
            this.labelObject.userData = { nodeId: this.id, type: 'shape-label' }; // Link back
        }
        this.update();
        // updateBoundingSphere will be called after the first LOD level is loaded,
        // or after all synchronous levels are added.
        // For now, let's call it after _setupLODLevels if it resulted in any mesh.
        if (this.mesh.levels.length > 0 && this.mesh.levels[0].object) {
            this.updateBoundingSphere();
        }
    }

    getDefaultData() {
        return {
            label: '',
            shape: 'sphere', // Default shape for LOD level 0 if not specified
            size: 50,
            color: 0xffffff,
            type: 'shape',
            lodLevels: [], // e.g., [{ distance: 0, shape/gltfUrl, size, color }, { distance: 300, shape, size, color }]
            labelLod: [], // Similar to HtmlNode for label visibility/styling
        };
    }

    _setupLODLevels() {
        if (this.lodData && this.lodData.length > 0) {
            this.lodData.forEach(levelConf => {
                const levelMesh = this._createRepresentationForLevel(levelConf);
                if (levelMesh) {
                    this.mesh.addLevel(levelMesh, levelConf.distance);
                }
            });
        } else {
            // Default LOD setup:
            // Level 0: Main shape/GLTF
            const mainRepresentation = this._createRepresentationForLevel({
                shape: this.shape, // Original overall shape
                gltfUrl: this.gltfUrl, // Original overall gltfUrl
                gltfScale: this.data.gltfScale,
                size: this.size,   // Original overall size
                color: this.color, // Original overall color
            });
            if (mainRepresentation) {
                this.mesh.addLevel(mainRepresentation, 0);
            }

            // Level 1: Simpler placeholder (e.g., a small box)
            const placeholderSize = Math.max(10, (this.size || 50) / 3);
            const placeholder = this._createMeshForLevel({
                shape: 'box', // Or a very low-poly sphere
                size: placeholderSize,
                color: this.color, // Can be a distinct LOD color
            });
            if (placeholder) {
                this.mesh.addLevel(placeholder, (this.data.lodDistanceSimple ?? 700));
            }
             // Level 2: Nothing (disappears)
            this.mesh.addLevel(new THREE.Object3D(), (this.data.lodDistanceHide ?? 1500));
        }
        // After levels are set up, if the first level is a GLTF that needs loading,
        // it would have been initiated by _createRepresentationForLevel -> _loadGltfModelForLevel.
        // updateBoundingSphere should be called once the primary mesh is available.
    }

    /**
     * Creates a 3D representation (mesh or group for GLTF) for a given LOD level configuration.
     * @param {Object} levelConfig Configuration for the LOD level.
     * @param {string} [levelConfig.shape] Shape type ('box', 'sphere', 'gltf').
     * @param {string} [levelConfig.gltfUrl] URL if shape is 'gltf'.
     * @param {number} [levelConfig.gltfScale] Scale factor for GLTF model.
     * @param {number} [levelConfig.size] Size for basic shapes or fallback for GLTF scaling.
     * @param {number} [levelConfig.color] Color for basic shapes.
     * @returns {THREE.Object3D | null} The created 3D object for the level, or null.
     * @protected
     */
    _createRepresentationForLevel(levelConfig) {
        // levelConfig can contain: shape, gltfUrl, gltfScale, size, color
        if (levelConfig.shape === 'gltf' && levelConfig.gltfUrl) {
            // For GLTF, we create a Group that the model will be loaded into.
            // The GLTFLoader is async, so addLevel might happen before model is loaded.
            // THREE.LOD handles this by adding the group, and the model populates it later.
            const gltfGroup = new THREE.Group();
            gltfGroup.castShadow = true;
            gltfGroup.receiveShadow = true;
            this._loadGltfModelForLevel(levelConfig, gltfGroup);
            return gltfGroup;
        } else if (levelConfig.shape) {
            return this._createMeshForLevel(levelConfig);
        }
        return null; // Or a default placeholder if config is insufficient
    }

    /**
     * Creates a simple geometric mesh (e.g., box, sphere) for an LOD level.
     * @param {Object} levelConfig Configuration for the mesh.
     * @param {string} [levelConfig.shape='sphere'] The type of shape.
     * @param {number} [levelConfig.size] The size of the shape.
     * @param {number} [levelConfig.color] The color of the shape.
     * @returns {THREE.Mesh} The created mesh.
     * @protected
     */
    _createMeshForLevel(levelConfig) {
        // levelConfig: { shape, size, color }
        let geometry;
        const effectiveSize = Math.max(5, levelConfig.size || this.size); // Use level size or node's default
        const shapeType = levelConfig.shape || 'sphere'; // Default to sphere if no shape specified for level
        const color = levelConfig.color || this.color;

        switch (shapeType) {
            case 'box':
                geometry = new THREE.BoxGeometry(effectiveSize, effectiveSize, effectiveSize);
                break;
            case 'sphere':
            default:
                geometry = new THREE.SphereGeometry(effectiveSize / 2, 8, 6); // Lower poly for LOD
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

    /**
     * Loads a GLTF model for a specific LOD level and adds it to the targetGroup.
     * @param {Object} levelConfig Configuration for the GLTF model.
     * @param {string} levelConfig.gltfUrl URL of the GLTF model.
     * @param {number} [levelConfig.gltfScale] Scale factor for the model.
     * @param {number} [levelConfig.size] Fallback size for scaling if gltfScale is not provided.
     * @param {THREE.Group} targetGroup The THREE.Group object (part of an LOD level) to which the loaded model will be added.
     * @protected
     */
    _loadGltfModelForLevel(levelConfig, targetGroup) {
        // levelConfig: { gltfUrl, gltfScale, size (fallback for scale) }
        // targetGroup is the THREE.Group already added to an LOD level
        if (!levelConfig.gltfUrl || !targetGroup) {
            console.error('ShapeNode: GLTF URL or target group not provided for LOD GLTF loading.');
            return;
        }

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
                    // Use gltfScale from levelConfig, or node's main gltfScale, or fallback to level's size / maxDim
                    const scaleFactor = levelConfig.gltfScale ?? this.data.gltfScale ?? levelConfig.size ?? this.size;
                    scale = scaleFactor / maxDim;
                }
                modelScene.scale.set(scale, scale, scale);

                const center = box.getCenter(new THREE.Vector3());
                modelScene.position.sub(center.multiplyScalar(scale));

                // Clear previous children of targetGroup if any (e.g. if re-setting LOD)
                while (targetGroup.children.length > 0) {
                    targetGroup.remove(targetGroup.children[0]);
                }
                targetGroup.add(modelScene);

                // If this is the primary LOD level (distance 0), update the overall bounding sphere.
                const lodLevelEntry = this.mesh.levels.find(l => l.object === targetGroup);
                if (lodLevelEntry && lodLevelEntry.distance === 0) {
                    this.updateBoundingSphere(); // Crucial for layout and interaction
                }
                this.space?.emit('node:updated', { node: this, property: 'mesh_lod_level_loaded', levelDetail: levelConfig });
            },
            undefined,
            (error) => {
                console.error(`ShapeNode (${this.id}): Error loading GLTF for LOD from ${levelConfig.gltfUrl}:`, error);
                // Optionally add a fallback placeholder to targetGroup on error
                const fallbackSize = levelConfig.size || this.size || 20;
                const fallbackColor = levelConfig.color || this.color || 0xff0000;
                const fallbackMesh = this._createMeshForLevel({shape: 'box', size: fallbackSize, color: fallbackColor });
                targetGroup.add(fallbackMesh);
                const lodLevelEntry = this.mesh.levels.find(l => l.object === targetGroup);
                if (lodLevelEntry && lodLevelEntry.distance === 0) {
                    this.updateBoundingSphere();
                }

            }
        );
    }


    updateBoundingSphere() {
        // The bounding sphere should be based on the highest detail level (level 0)
        // or the currently visible level if that's more appropriate for some interactions.
        // For layout, highest detail is usually best.
        if (this.mesh.levels.length > 0) {
            const primaryRepresentation = this.mesh.levels[0].object;
            if (primaryRepresentation) {
                // Ensure the object's matrix is up-to-date if it has been transformed relative to the LOD object.
                // primaryRepresentation.updateWorldMatrix(true, false); // Might be needed if object has local transform

                // Create a temporary Box3 helper if not available on object directly
                const box = new THREE.Box3();

                // If the primary representation has children (like a GLTF model in a Group),
                // expand the box to include all children.
                if (primaryRepresentation.children.length > 0) {
                    box.setFromObject(primaryRepresentation, true); // true to traverse children precisely
                } else if (primaryRepresentation.geometry) { // For simple THREE.Mesh
                    // Ensure geometry is available and has a boundingBox/Sphere
                    if (!primaryRepresentation.geometry.boundingBox) {
                        primaryRepresentation.geometry.computeBoundingBox();
                    }
                    if (primaryRepresentation.geometry.boundingBox) {
                         box.copy(primaryRepresentation.geometry.boundingBox).applyMatrix4(primaryRepresentation.matrixWorld);
                    } else { // Fallback if no boundingBox (should be rare for valid geometry)
                         box.setFromCenterAndSize(primaryRepresentation.position, new THREE.Vector3(this.size, this.size, this.size));
                    }
                } else { // Fallback for empty groups or unknown objects at level 0
                    // Use node's overall size as a rough estimate centered at the LOD's position
                    const lodPosition = this.mesh.getWorldPosition(new THREE.Vector3());
                    box.setFromCenterAndSize(lodPosition, new THREE.Vector3(this.size, this.size, this.size));
                }


                if (!this._boundingSphere) this._boundingSphere = new THREE.Sphere();

                if (!box.isEmpty()) {
                    box.getBoundingSphere(this._boundingSphere);
                    // The box.getBoundingSphere sets the center in world space if box was from world matrix.
                    // Or, if primaryRepresentation was not added to LOD yet, box is local.
                    // We need to ensure the sphere's center is at this.position.
                } else {
                    // Fallback if box is empty (e.g., GLTF not loaded for level 0)
                    this._boundingSphere.center.copy(this.position); // Already world space
                    this._boundingSphere.radius = (this.size || 50) / 2;
                }
            } else {
                 // Default if primaryRepresentation is null (e.g. LOD setup failed or level 0 is empty)
                if (!this._boundingSphere) this._boundingSphere = new THREE.Sphere();
                this._boundingSphere.center.copy(this.position);
                this._boundingSphere.radius = (this.size || 50) / 2;
            }
        } else {
            // No LOD levels defined - default to node's position and size
            if (!this._boundingSphere) this._boundingSphere = new THREE.Sphere();
            this._boundingSphere.center.copy(this.position);
            this._boundingSphere.radius = (this.size || 50) / 2;
        }

        // Final check: ensure the boundingSphere's center is always at the node's logical position.
        // The LOD object itself is placed at this.position. The bounding sphere for physics/layout
        // should also be centered there, regardless of the internal structure of the LOD's contents.
        if (this._boundingSphere) {
            this._boundingSphere.center.copy(this.position);
        }
    }


    _createLabel() {
        const div = document.createElement('div');
        // Use a different class for 3D labels
        div.className = 'node-label-3d node-common';
        div.textContent = this.data.label;
        div.dataset.nodeId = this.id; // Link back
        // Style to prevent interaction and ensure visibility
        // These will now default to CSS variables set in .node-label-3d or .node-common
        // Object.assign(div.style, {
        //     pointerEvents: 'none', // Set by CSS
        //     color: 'var(--sg-node-text)', // Set by CSS
        //     backgroundColor: 'var(--sg-label-bg, rgba(0,0,0,0.5))', // Custom var or default
        //     padding: '2px 5px', // Set by CSS
        //     borderRadius: '3px', // Set by CSS
        //     fontSize: '14px', // Set by CSS
        //     textAlign: 'center', // Set by CSS
        //     whiteSpace: 'nowrap', // Set by CSS
        // });
        // We can add a more specific class if needed, or rely on .node-label-3d
        return new CSS3DObject(div);
    }

    update(space) {
        if (this.mesh) this.mesh.position.copy(this.position);
        if (this.labelObject) {
            // Position label slightly above the node's bounding sphere top
            const offset = this.getBoundingSphereRadius() * 1.1 + 10; // 10px padding
            this.labelObject.position.copy(this.position).y += offset;
            if (space?.camera?._cam) {
                // Billboard effect for label
                this.labelObject.quaternion.copy(space.camera._cam.quaternion);
            }
            this._applyLabelLOD(space); // Apply LOD to the label
        }
    }

    _applyLabelLOD(space) { // Adapted from HtmlNode
        if (!this.labelObject?.element || !this.data.labelLod || this.data.labelLod.length === 0) {
            if (this.labelObject?.element) this.labelObject.element.style.visibility = '';
            return;
        }

        const camera = space?.plugins?.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!camera) return;

        const distanceToCamera = this.position.distanceTo(camera.position);
        const sortedLodLevels = [...this.data.labelLod].sort((a, b) => (b.distance || 0) - (a.distance || 0));

        let appliedRule = false;
        for (const level of sortedLodLevels) {
            if (distanceToCamera >= (level.distance || 0)) {
                if (level.style && level.style.includes('visibility:hidden')) {
                    this.labelObject.element.style.visibility = 'hidden';
                } else {
                    this.labelObject.element.style.visibility = '';
                    // todo: apply other styles from level.style if any, e.g. opacity
                }
                // Additional LOD effects for labels (e.g., changing text content or scale) can be added here.
                // For ShapeNode labels, direct content change or scaling of the CSS3DObject might be less common
                // than for HtmlNode, but visibility is key.
                appliedRule = true;
                break;
            }
        }
        if (!appliedRule) {
            this.labelObject.element.style.visibility = '';
        }
    }

    // dispose() is handled by BaseNode

    getBoundingSphereRadius() {
        // Ensure _boundingSphere is initialized and up-to-date if necessary
        if (!this._boundingSphere || (this.shape === 'gltf' && this.mesh?.children.length === 0)) {
            // If GLTF hasn't loaded, or sphere not calculated, provide a default based on size
            // Or trigger updateBoundingSphere if appropriate, but be careful of performance.
            // For now, a default based on 'size' for unloaded GLTFs is a fallback.
            if (this.shape === 'gltf' && (!this._boundingSphere || this._boundingSphere.radius === 0)) {
                 return this.size / 2; // Fallback for unloaded GLTF
            }
            // If not GLTF or already calculated, this._boundingSphere should be valid.
            // If _boundingSphere is still not set, calculate it once.
            if(!this._boundingSphere) this.updateBoundingSphere();
        }
        return this._boundingSphere?.radius ?? (this.size / 2);
    }

    setSelectedStyle(selected) {
        // Apply selection style to all objects in all LOD levels
        if (this.mesh instanceof THREE.LOD) {
            this.mesh.levels.forEach(level => {
                const object = level.object;
                if (object) {
                    object.traverse(child => {
                        if (child.isMesh && child.material) {
                            // Ensure material is unique before modifying, or this will affect other nodes if material is shared.
                            // For simplicity, assuming materials are not shared between distinct interactive elements after initial creation.
                            // If they could be, child.material.clone() would be needed here before setHex.
                            child.material.emissive?.setHex(selected ? 0x555500 : 0x000000);
                            if (child.material.emissiveMap) { // If there's an emissive map, toggling emissive color might not be visible.
                                child.material.emissiveIntensity = selected ? 1.0 : 0.0;
                            }
                        }
                    });
                }
            });
        }

        // Visual feedback on the label
        this.labelObject?.element?.classList.toggle('selected', selected);
    }
}
