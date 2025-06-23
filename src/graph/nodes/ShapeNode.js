import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { Utils } from '../../utils.js';
import { BaseNode } from './BaseNode.js';

export class ShapeNode extends BaseNode {
    shape = 'sphere';
    size = 50;
    color = 0xffffff;

    constructor(id, position, data = {}, mass = 1.5) {
        super(id, position, data, mass);
        this.shape = this.data.shape ?? 'sphere';
        this.size = this.data.size ?? 50;
        this.color = this.data.color ?? 0xffffff;
        this.mesh = this._createMesh();
        this.mesh.userData = { nodeId: this.id, type: 'shape-node' }; // Link back
        if (this.data.label) {
            this.labelObject = this._createLabel(); // Create 3D label
            this.labelObject.userData = { nodeId: this.id, type: 'shape-label' }; // Link back
        }
        this.update();
    }

    getDefaultData() {
        return { label: '', shape: 'sphere', size: 50, color: 0xffffff, type: 'shape' };
    }

    _createMesh() {
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
        }
        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.6,
            metalness: 0.2,
        });
        return new THREE.Mesh(geometry, material);
    }

    _createLabel() {
        const div = document.createElement('div');
        // Use a different class for 3D labels
        div.className = 'node-label-3d node-common';
        div.textContent = this.data.label;
        div.dataset.nodeId = this.id; // Link back
        // Style to prevent interaction and ensure visibility
        Object.assign(div.style, {
            pointerEvents: 'none', // Don't block mesh picking
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '2px 5px',
            borderRadius: '3px',
            fontSize: '14px', // Adjust as needed
            textAlign: 'center',
            whiteSpace: 'nowrap',
        });
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
        switch (this.shape) {
            case 'box':
                return Math.sqrt(3 * (this.size / 2) ** 2);
            case 'sphere':
            default:
                return this.size / 2;
        }
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
