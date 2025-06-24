import * as THREE from 'three';
import { BaseNode } from './BaseNode.js';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'; // For potential label

const loader = new THREE.TextureLoader();

export class ImageNode extends BaseNode {
    imageUrl = null;
    imageSize = { width: 100, height: 100 }; // Default size, or max dimension if aspect is kept

    constructor(id, position, data = {}, mass = 1.0) {
        super(id, position, data, mass);
        this.nodeType = 'ImageNode';
        this.imageUrl = this.data.imageUrl || null;
        // data.size could be a number (max dimension) or {width, height}
        if (typeof this.data.size === 'number') {
            this.imageSize = { width: this.data.size, height: this.data.size }; // Placeholder, aspect will adjust
        } else if (typeof this.data.size === 'object' && this.data.size.width && this.data.size.height) {
            this.imageSize = { ...this.data.size };
        } else {
            this.imageSize = { width: 100, height: 100 }; // Default
        }

        this.mesh = this._createMesh(); // Initialize mesh (plane)
        this.mesh.userData = { nodeId: this.id, type: 'image-node' };

        if (this.imageUrl) {
            this._loadImageTexture();
        } else {
            console.warn(`ImageNode (${this.id}): No imageUrl provided.`);
            // Create a placeholder material/color if no image
            this.mesh.material = new THREE.MeshStandardMaterial({ color: 0x555555, side: THREE.DoubleSide });
        }

        if (this.data.label) {
            this.labelObject = this._createLabel(); // Inherited or custom label
        }
        this.update(); // Initial position update
        this.updateBoundingSphere();
    }

    getDefaultData() {
        return {
            label: '',
            imageUrl: null,
            size: 100, // Default can be a single number for max dimension
            type: 'image',
            color: 0xffffff, // Tint color for the material, or fallback if image fails
        };
    }

    _createMesh() {
        // PlaneGeometry will be 1x1, and then scaled by the mesh's scale property
        const geometry = new THREE.PlaneGeometry(1, 1);
        // Material will be set in _loadImageTexture or use placeholder
        const material = new THREE.MeshStandardMaterial({
            color: this.data.color || 0xffffff, // Tint
            side: THREE.DoubleSide,
            transparent: true, // In case image has alpha
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    _loadImageTexture() {
        if (!this.imageUrl || !this.mesh) return;

        loader.load(
            this.imageUrl,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                this.mesh.material.map = texture;
                this.mesh.material.needsUpdate = true;

                // Adjust mesh scale to match image aspect ratio
                const imgAspect = texture.image.width / texture.image.height;
                let planeWidth, planeHeight;

                if (typeof this.data.size === 'number') { // data.size is max dimension
                    const maxDim = this.data.size;
                    if (imgAspect >= 1) { // Wider or square
                        planeWidth = maxDim;
                        planeHeight = maxDim / imgAspect;
                    } else { // Taller
                        planeHeight = maxDim;
                        planeWidth = maxDim * imgAspect;
                    }
                } else { // data.size is {width, height}
                    planeWidth = this.imageSize.width;
                    planeHeight = this.imageSize.height;
                    // If one dimension of this.imageSize was based on a numeric this.data.size,
                    // it might need adjustment here based on aspect ratio.
                    // For now, assume if this.imageSize was set from object, it's explicit.
                    // If it was from number, we recalculate here.
                     if (imgAspect >=1 && this.imageSize.width === this.imageSize.height && this.imageSize.width === (this.data.size || 100) ) {
                         planeWidth = this.imageSize.width;
                         planeHeight = this.imageSize.width / imgAspect;
                     } else if (imgAspect < 1 && this.imageSize.width === this.imageSize.height && this.imageSize.width === (this.data.size || 100)) {
                         planeHeight = this.imageSize.height;
                         planeWidth = this.imageSize.height * imgAspect;
                     }
                }

                this.mesh.scale.set(planeWidth, planeHeight, 1);
                this.imageSize = { width: planeWidth, height: planeHeight }; // Store actual dimensions

                this.updateBoundingSphere();
                this.space?.emit('node:updated', { node: this, property: 'mesh' });
            },
            undefined, // onProgress callback
            (error) => {
                console.error(`ImageNode (${this.id}): Error loading image from ${this.imageUrl}:`, error);
                this.mesh.material.color.set(0xff0000); // Error indicator
            }
        );
    }

    // Override updateBoundingSphere for PlaneGeometry based on its scale
    updateBoundingSphere() {
        if (this.mesh) {
            if (!this._boundingSphere) this._boundingSphere = new THREE.Sphere();
            // PlaneGeometry is in XY plane, centered at origin.
            // Its size is determined by its scale.
            // The bounding sphere should encompass the scaled plane.
            const width = this.mesh.scale.x;
            const height = this.mesh.scale.y;
            this._boundingSphere.radius = Math.sqrt(width*width + height*height) / 2;
            this._boundingSphere.center.copy(this.position);
        }
    }

    _createLabel() {
        // Basic label, similar to ShapeNode or BaseNode if it had one
        const div = document.createElement('div');
        div.className = 'node-label-3d node-common'; // Use existing styles
        div.textContent = this.data.label;
        div.dataset.nodeId = this.id;
        // Optional: Style specifically for image node labels if needed
        return new CSS3DObject(div);
    }

    update(space) {
        super.update(space); // Handles mesh position and labelObject position/orientation
        // ImageNode specific updates can go here if any.
        // For example, if label needs to be positioned differently relative to image:
        if (this.labelObject && this.mesh) {
            const labelOffset = (this.mesh.scale.y / 2) + 20; // Position label above the image plane
            this.labelObject.position.copy(this.position);
            this.labelObject.position.y += labelOffset;
            if (space?.camera?._cam) {
                this.labelObject.quaternion.copy(space.camera._cam.quaternion);
            }
        }
    }

    // setSelectedStyle - can be inherited from BaseNode or customized
    // For ImageNode, emissive might not be ideal if there's a texture.
    // Could consider adding a border or overlay effect.
    setSelectedStyle(selected) {
        super.setSelectedStyle(selected); // Calls BaseNode's method which might toggle emissive
        // For ImageNode, an outline effect (if globally available) or changing border/tint might be better.
        // If using global OutlineEffect, that should handle it.
        // If we want to tint on select:
        // if (this.mesh?.material) {
        //    this.mesh.material.color.set(selected ? 0xaaaa00 : (this.data.color || 0xffffff));
        // }
        this.labelObject?.element?.classList.toggle('selected', selected);
    }

    // dispose is handled by BaseNode, which disposes mesh.geometry and mesh.material.
    // TextureLoader caches textures globally, so explicit texture disposal might be needed
    // if many unique images are loaded and unloaded to free GPU memory.
    // For now, rely on BaseNode's dispose. If texture.dispose() is needed, add it here.
    dispose() {
        if (this.mesh?.material?.map) {
            this.mesh.material.map.dispose();
        }
        super.dispose();
    }
}
