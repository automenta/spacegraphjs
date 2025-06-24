import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BaseNode } from './BaseNode.js';

export class ShapeNode extends BaseNode {
    shape = 'sphere';
    size = 50; // Used for basic shapes and as a fallback scale for GLTF
    color = 0xffffff; // Used for basic shapes
    gltfUrl = null; // URL for GLTF model

    constructor(id, position, data = {}, mass = 1.5) {
        super(id, position, data, mass);
        this.shape = this.data.shape ?? 'sphere';
        this.size = this.data.size ?? 50;
        this.color = this.data.color ?? 0xffffff;
        this.gltfUrl = this.data.gltfUrl ?? null;

        this.mesh = this._createMesh(); // Initialize mesh (placeholder for GLTF)
        this.mesh.userData = { nodeId: this.id, type: 'shape-node' };

        if (this.shape === 'gltf' && this.gltfUrl) {
            this._loadGltfModel();
        }

        if (this.data.label) {
            this.labelObject = this._createLabel();
            this.labelObject.userData = { nodeId: this.id, type: 'shape-label' }; // Link back
        }
        this.update();
        this.updateBoundingSphere(); // Initial calculation
    }

    getDefaultData() {
        return { label: '', shape: 'sphere', size: 50, color: 0xffffff, type: 'shape' };
    }

    _createMesh() {
        if (this.shape === 'gltf') {
            // For GLTF, initially return an empty Group. Model will be loaded into this.
            const group = new THREE.Group();
            group.castShadow = true; // Apply to group so children inherit if not set
            group.receiveShadow = true;
            return group;
        }

        let geometry;
        const effectiveSize = Math.max(10, this.size);
        switch (this.shape) {
            case 'box':
                geometry = new THREE.BoxGeometry(effectiveSize, effectiveSize, effectiveSize);
                break;
            case 'sphere':
            default:
                geometry = new THREE.SphereGeometry(effectiveSize / 2, 16, 12);
                break;
            // TODO: Add more shapes (Cone, Cylinder, Torus...)
            // case 'cone':
            //     geometry = new THREE.ConeGeometry(effectiveSize / 2, effectiveSize, 16);
            //     break;
            // case 'cylinder':
            //     geometry = new THREE.CylinderGeometry(effectiveSize / 2, effectiveSize / 2, effectiveSize, 16);
            //     break;
        }
        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.6,
            metalness: 0.2,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    _loadGltfModel() {
        if (!this.gltfUrl || !this.mesh || !(this.mesh instanceof THREE.Group)) {
            console.error('ShapeNode: GLTF URL not provided or mesh is not a Group for GLTF loading.');
            return;
        }

        const loader = new GLTFLoader();
        loader.load(
            this.gltfUrl,
            (gltf) => {
                // Clear previous model if any (e.g. on URL change)
                while (this.mesh.children.length > 0) {
                    this.mesh.remove(this.mesh.children[0]);
                }

                const modelScene = gltf.scene;

                // Ensure all parts of the loaded GLTF model cast/receive shadows
                modelScene.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Optional: Auto-scale model to fit roughly within 'this.size'
                // This is a simple heuristic and might need adjustment based on model origins.
                const box = new THREE.Box3().setFromObject(modelScene);
                const modelSize = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);
                let scale = 1;
                if (maxDim > 0) {
                    scale = (this.data.gltfScale ?? this.size) / maxDim;
                }
                modelScene.scale.set(scale, scale, scale);

                // Center the model
                const center = box.getCenter(new THREE.Vector3());
                modelScene.position.sub(center.multiplyScalar(scale));

                this.mesh.add(modelScene);
                this.updateBoundingSphere(); // Recalculate bounding sphere after model is loaded and scaled

                this.space?.emit('node:updated', { node: this, property: 'mesh' });
                // console.log(`ShapeNode (${this.id}): GLTF model loaded from ${this.gltfUrl}`);
            },
            undefined, // onProgress callback (optional)
            (error) => {
                console.error(`ShapeNode (${this.id}): Error loading GLTF model from ${this.gltfUrl}:`, error);
            }
        );
    }

    updateBoundingSphere() {
        if (this.mesh && (this.shape === 'gltf' || this.mesh.children.length > 0)) {
            // Ensure bounding box is computed for the current state of the mesh
            this.mesh.geometry?.computeBoundingBox(); // For basic shapes if their geometry is directly on mesh

            const box = new THREE.Box3().setFromObject(this.mesh); // For GLTF or complex groups
            if (!this._boundingSphere) this._boundingSphere = new THREE.Sphere();
            box.getBoundingSphere(this._boundingSphere);
        } else if (this.mesh) {
             // Fallback for simple shapes before GLTF load or if no children
            if (!this._boundingSphere) this._boundingSphere = new THREE.Sphere();
            this.mesh.geometry?.computeBoundingSphere();
            if(this.mesh.geometry?.boundingSphere) {
                 this._boundingSphere.copy(this.mesh.geometry.boundingSphere);
            } else {
                // Default small sphere if no geometry yet
                this._boundingSphere.radius = this.size / 2 || 10;
            }
        }
        // Ensure position is applied to the sphere
        if(this._boundingSphere) this._boundingSphere.center.copy(this.position);
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
        // Visual feedback on the 3D mesh
        if (this.mesh?.material) {
            this.mesh.material.emissive?.setHex(selected ? 0x555500 : 0x000000);
        }
        // Visual feedback on the label
        this.labelObject?.element?.classList.toggle('selected', selected);
        // Add CSS rule for .node-label-3d.selected { /* styles */ } if needed
    }
}
