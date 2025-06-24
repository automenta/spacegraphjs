import * as THREE from 'three';
import { BaseNode } from './BaseNode.js';

const loader = new THREE.TextureLoader();

export class ImageNode extends BaseNode {
    imageUrl = null;
    imageSize = { width: 100, height: 100 };

    constructor(id, position, data = {}, mass = 1.0) {
        super(id, position, data, mass);
        this.nodeType = 'ImageNode';
        this.imageUrl = this.data.imageUrl || null;
        this.imageSize = typeof this.data.size === 'number'
            ? { width: this.data.size, height: this.data.size }
            : (this.data.size?.width && this.data.size?.height ? { ...this.data.size } : { width: 100, height: 100 });

        this.mesh = this._createMesh();
        this.mesh.userData = { nodeId: this.id, type: 'image-node' };

        if (this.imageUrl) {
            this._loadImageTexture();
        } else {
            this.mesh.material = new THREE.MeshStandardMaterial({ color: 0x555555, side: THREE.DoubleSide });
        }

        if (this.data.label) this.labelObject = this._createLabel();
        this.update();
        this.updateBoundingSphere();
    }

    getDefaultData() {
        return {
            ...super.getDefaultData(),
            label: '',
            imageUrl: null,
            size: 100,
            type: 'image',
            color: 0xffffff,
        };
    }

    _createMesh() {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: this.data.color || 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
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

                const imgAspect = texture.image.width / texture.image.height;
                let planeWidth, planeHeight;

                if (typeof this.data.size === 'number') {
                    const maxDim = this.data.size;
                    planeWidth = imgAspect >= 1 ? maxDim : maxDim * imgAspect;
                    planeHeight = imgAspect >= 1 ? maxDim / imgAspect : maxDim;
                } else {
                    planeWidth = this.imageSize.width;
                    planeHeight = this.imageSize.height;
                    if (imgAspect >= 1 && this.imageSize.width === this.imageSize.height && this.imageSize.width === (this.data.size || 100)) {
                        planeHeight = this.imageSize.width / imgAspect;
                    } else if (imgAspect < 1 && this.imageSize.width === this.imageSize.height && this.imageSize.width === (this.data.size || 100)) {
                        planeWidth = this.imageSize.height * imgAspect;
                    }
                }

                this.mesh.scale.set(planeWidth, planeHeight, 1);
                this.imageSize = { width: planeWidth, height: planeHeight };

                this.updateBoundingSphere();
                this.space?.emit('node:updated', { node: this, property: 'mesh' });
            },
            undefined,
            (_error) => {
                this.mesh.material.color.set(0xff0000);
            }
        );
    }

    updateBoundingSphere() {
        if (!this.mesh) return;
        this._boundingSphere = new THREE.Sphere();
        const width = this.mesh.scale.x;
        const height = this.mesh.scale.y;
        this._boundingSphere.radius = Math.sqrt(width * width + height * height) / 2;
        this._boundingSphere.center.copy(this.position);
    }

    update(space) {
        super.update(space);
        if (this.labelObject && this.mesh) {
            const labelOffset = this.mesh.scale.y / 2 + 20;
            this.labelObject.position.copy(this.position).y += labelOffset;
        }
    }

    setSelectedStyle(selected) {
        super.setSelectedStyle(selected);
    }

    dispose() {
        this.mesh?.material?.map?.dispose();
        super.dispose();
    }
}
