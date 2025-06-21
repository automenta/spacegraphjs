import * as THREE from 'three';
import { BaseNode } from './BaseNode.js'; // Assuming BaseNode is needed for instanceof checks

export class Edge {
    constructor(id, sourceNode, targetNode, data = {}) {
        this.id = id;
        this.source = sourceNode;
        this.target = targetNode;
        this.data = data;
        this.color = (typeof data.color === 'string') ? new THREE.Color(data.color).getHex() : (data.color || 0x00d0ff);
        this.thickness = data.thickness || 1.5;
        this.opacity = data.opacity || 0.6;

        const material = new THREE.LineBasicMaterial({
            color: this.color,
            linewidth: this.thickness, // Note: linewidth > 1 may not work on all platforms/drivers
            transparent: true,
            opacity: this.opacity
        });
        const geometry = new THREE.BufferGeometry().setFromPoints([sourceNode.position, targetNode.position]);
        this.threeObject = new THREE.Line(geometry, material);
    }
    update() {
        if (this.threeObject) {
            const positions = this.threeObject.geometry.attributes.position.array;
            positions[0] = this.source.position.x;
            positions[1] = this.source.position.y;
            positions[2] = this.source.position.z;
            positions[3] = this.target.position.x;
            positions[4] = this.target.position.y;
            positions[5] = this.target.position.z;
            this.threeObject.geometry.attributes.position.needsUpdate = true;
            this.threeObject.geometry.computeBoundingSphere(); // Important for raycasting
        }
    }
    setHighlight(highlighted) {
      if (this.threeObject?.material) {
        this.threeObject.material.color.setHex(highlighted ? 0xff0000 : this.color);
         this.threeObject.material.opacity = highlighted ? 1.0 : this.opacity;
      }
    }
    dispose() {
        this.threeObject?.geometry?.dispose();
        this.threeObject?.material?.dispose();
        // remove from scene is handled by SpaceGraph.removeEdge
    }
}