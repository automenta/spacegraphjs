import { BaseNode } from './BaseNode.js';
import * as THREE from 'three';

export class AudioNode extends BaseNode {
    static typeName = 'audio';

    constructor(id, position, data = {}, mass = 1.0) {
        super(id, position, data, mass);
        // Future: Initialize audio specific properties, e.g., load audio, create visual representation
    }

    getDefaultData() {
        return {
            ...super.getDefaultData(),
            label: 'Audio Node',
            audioUrl: '',
            autoplay: false,
            controls: true,
            color: 0x00ccff, // Default color for visual representation
            size: 40,
        };
    }

    // Future: Override update, dispose, createMesh/createCSSObject as needed
    // For now, it might just be a simple shape
    createMesh() {
        if (this.mesh) return this.mesh;
        const geometry = new THREE.SphereGeometry(this.data.size * 0.5, 16, 12);
        const material = new THREE.MeshBasicMaterial({ color: this.data.color, wireframe: true });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.userData = { nodeId: this.id, type: AudioNode.typeName };
        return this.mesh;
    }

    dispose() {
        // Future: stop audio, release audio resources
        super.dispose();
    }
}
