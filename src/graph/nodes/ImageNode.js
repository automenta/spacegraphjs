import * as THREE from 'three';
import {Node} from './Node.js';
import {createCSS3DLabelObject, applyLabelLOD} from '../../utils/labelUtils.js';

const loader = new THREE.TextureLoader();

export class ImageNode extends Node {
    static typeName = 'image';
    imageUrl = null;
    imageSize = { width: 100, height: 100 };

    constructor(id, position, data = {}, mass = 1.0) {
        super(id, position, data, mass);
        this.nodeType = 'ImageNode';
        this.imageUrl = this.data.imageUrl || null;
        if (typeof this.data.size === 'number') {
            this.imageSize = { width: this.data.size, height: this.data.size };
        } else if (typeof this.data.size === 'object' && this.data.size.width && this.data.size.height) {
            this.imageSize = { ...this.data.size };
        } else {
            this.imageSize = { width: 100, height: 100 };
        }

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
                    [planeWidth, planeHeight] = imgAspect >= 1 ? [maxDim, maxDim / imgAspect] : [maxDim * imgAspect, maxDim];
                } else {
                    planeWidth = this.imageSize.width;
                    planeHeight = this.imageSize.height;
                    const defaultSize = this.data.size || 100;
                    if (this.imageSize.width === this.imageSize.height && this.imageSize.width === defaultSize) {
                        [planeWidth, planeHeight] = imgAspect >= 1 ? [defaultSize, defaultSize / imgAspect] : [defaultSize * imgAspect, defaultSize];
                    }
                }

                this.mesh.scale.set(planeWidth, planeHeight, 1);
                this.imageSize = { width: planeWidth, height: planeHeight };

                this.updateBoundingSphere();
                this.space?.emit('node:updated', { node: this, property: 'mesh' });
            },
            undefined,
            () => {
                this.mesh.material.color.set(0xff0000);
            }
        );
    }

    updateBoundingSphere() {
        if (this.mesh) {
            if (!this._boundingSphere) this._boundingSphere = new THREE.Sphere();
            const { x: width, y: height } = this.mesh.scale;
            this._boundingSphere.radius = Math.sqrt(width * width + height * height) / 2;
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
        super.update(space);
        if (this.labelObject && this.mesh) {
            const labelOffset = this.mesh.scale.y / 2 + 20;
            this.labelObject.position.copy(this.position);
            this.labelObject.position.y += labelOffset;
            if (space?._cam) this.labelObject.quaternion.copy(space._cam.quaternion);
            applyLabelLOD(this.labelObject, this.data.labelLod, space);
        }
    }

    setSelectedStyle(selected) {
        super.setSelectedStyle(selected);
        this.labelObject?.element?.classList.toggle('selected', selected);
    }

    dispose() {
        this.mesh?.material?.map?.dispose();
        super.dispose();
    }
}
