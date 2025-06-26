import {Node} from './Node.js';
import * as THREE from 'three';

export class DocumentNode extends Node {
    static typeName = 'document';

    constructor(id, position, data = {}, mass = 1.0) {
        super(id, position, data, mass);
        // Future: Initialize document specific properties, e.g., preview, icon
    }

    getDefaultData() {
        return {
            ...super.getDefaultData(),
            label: 'Document Node',
            documentUrl: '', // URL to the document
            icon: '📄', // Simple text icon for now
            color: 0xffcc00,
            size: 50,
        };
    }

    // Future: Could render as a plane with a document icon or a simple HTML representation
    createMesh() {
        if (this.mesh) return this.mesh;
        const geometry = new THREE.BoxGeometry(this.data.size, this.data.size * 1.2, 5);
        const material = new THREE.MeshBasicMaterial({ color: this.data.color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.userData = { nodeId: this.id, type: DocumentNode.typeName };
        return this.mesh;
    }

    // createCSSObject() {
    //     // Example: Show a simple HTML representation or icon
    //     if (this.cssObject) return this.cssObject;
    //     const element = document.createElement('div');
    //     element.style.width = `${this.data.size}px`;
    //     element.style.height = `${this.data.size * 1.2}px`;
    //     element.style.backgroundColor = 'rgba(255, 204, 0, 0.1)';
    //     element.style.border = '1px solid #ffcc00';
    //     element.style.textAlign = 'center';
    //     element.style.fontSize = `${this.data.size * 0.6}px`;
    //     element.innerHTML = `<span title="${this.data.documentUrl || ''}">${this.data.icon}</span>`;
    //     this.cssObject = new CSS3DObject(element);
    //     this.cssObject.userData = { nodeId: this.id, type: DocumentNode.typeName };
    //     return this.cssObject;
    // }


    dispose() {
        super.dispose();
    }
}
