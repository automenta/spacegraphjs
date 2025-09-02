import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export class Edge {
    constructor(source, target, config = {}) {
        this.source = source;
        this.target = target;
        this.config = config;

        const material = new THREE.LineBasicMaterial({
            color: this.config.color || 0xffffff,
            linewidth: this.config.linewidth || 1,
        });

        const geometry = new THREE.BufferGeometry().setFromPoints([
            this.source.object.position,
            this.target.object.position,
        ]);

        this.object = new THREE.Line(geometry, material);
    }

    update() {
        const positions = this.object.geometry.attributes.position.array;
        positions[0] = this.source.object.position.x;
        positions[1] = this.source.object.position.y;
        positions[2] = this.source.object.position.z;
        positions[3] = this.target.object.position.x;
        positions[4] = this.target.object.position.y;
        positions[5] = this.target.object.position.z;
        this.object.geometry.attributes.position.needsUpdate = true;
    }
}
