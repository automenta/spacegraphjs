import {Node} from './Node.js';
import * as THREE from 'three';
import {createCSS3DLabelObject, applyLabelLOD} from '../../utils/labelUtils.js';

export class DocumentNode extends Node {
    static typeName = 'document';
    labelObject = null;

    constructor(id, position, data = {}, mass = 1.0) {
        super(id, position, data, mass);
        this.mesh = this.createMesh();
        this.mesh.userData = { nodeId: this.id, type: DocumentNode.typeName };

        if (this.data.label || this.data.icon) {
            this.labelObject = this._createLabel();
        }
        this.update();
    }

    getDefaultData() {
        return {
            ...super.getDefaultData(),
            label: 'Document Node',
            documentUrl: '',
            icon: '📄',
            color: 0xffcc00,
            size: 50,
            labelLod: [],
        };
    }

    createMesh() {
        if (this.mesh) return this.mesh;
        // A simple 3D "sheet" representation
        const geometry = new THREE.BoxGeometry(this.data.size, this.data.size * 1.2, 5);
        const material = new THREE.MeshStandardMaterial({ color: this.data.color, roughness: 0.7, metalness: 0.1 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        return this.mesh;
    }

    _createLabel() {
        const labelText = this.data.icon ? `${this.data.icon} ${this.data.label}` : this.data.label;
        const styleData = {
            color: 'var(--sg-node-text)',
            backgroundColor: 'var(--sg-label-bg, rgba(10, 10, 20, 0.75))',
            fontSize: '14px',
            padding: '5px 10px',
            borderRadius: '5px',
        };
        return createCSS3DLabelObject(labelText, this.id, 'node-label-3d', styleData, 'document-label');
    }

    update(space) {
        super.update(space);
        if (this.labelObject && this.mesh) {
            const offset = this.getBoundingSphereRadius() * 1.1 + 10;
            this.labelObject.position.copy(this.position).y += offset;
            if (space?._cam) this.labelObject.quaternion.copy(space._cam.quaternion);
            applyLabelLOD(this.labelObject, this.data.labelLod, space);
        }
    }

    getBoundingSphereRadius() {
        return Math.sqrt((this.data.size / 2) ** 2 + (this.data.size * 1.2 / 2) ** 2);
    }

    viewDocument() {
        if (this.data.documentUrl) {
            this.space?.emit('node:document:view', { node: this, url: this.data.documentUrl });
            console.log(`DocumentNode: Request to view document at ${this.data.documentUrl}`);
        } else {
            console.warn(`DocumentNode: No documentUrl specified for node ${this.id}`);
        }
    }

    setSelectedStyle(selected) {
        if (this.mesh?.material) this.mesh.material.emissive?.setHex(selected ? 0x333300 : 0x000000);
        this.labelObject?.element?.classList.toggle('selected', selected);
    }

    dispose() {
        this.labelObject?.element?.remove();
        this.labelObject?.parent?.remove(this.labelObject);
        this.labelObject = null;
        super.dispose();
    }
}
