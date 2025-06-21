import * as THREE from 'three';
import { Utils } from '../utils.js';

export class Edge {
    static HIGHLIGHT_COLOR = 0x00ffff;
    static DEFAULT_OPACITY = 0.6;
    static HIGHLIGHT_OPACITY = 1.0;
    line = null;
    // Default constraint: elastic spring
    data = {
        color: 0x00d0ff,
        thickness: 1.5,
        constraintType: 'elastic',
        constraintParams: {stiffness: 0.001, idealLength: 200}
    };

    constructor(id, sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode) throw new Error("Edge requires valid source and target nodes.");
        this.id = id;
        this.source = sourceNode;
        this.target = targetNode;
        const defaultData = {
            color: 0x00d0ff, thickness: 1.5, constraintType: 'elastic',
            constraintParams: {stiffness: 0.001, idealLength: 200}
        };
        this.data = Utils.mergeDeep({}, defaultData, data);
        this.line = this._createLine();
        this.update();
    }

    _createLine() {
        const material = new THREE.LineBasicMaterial({
            color: this.data.color,
            linewidth: this.data.thickness,
            transparent: true,
            opacity: Edge.DEFAULT_OPACITY,
            depthTest: false, // Render edges slightly "on top"
        });
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const line = new THREE.Line(geometry, material);
        line.renderOrder = -1;
        line.userData = {edgeId: this.id}; // Link back
        return line;
    }

    update() {
        if (!this.line || !this.source || !this.target) return;
        const positions = this.line.geometry.attributes.position;
        positions.setXYZ(0, this.source.position.x, this.source.position.y, this.source.position.z);
        positions.setXYZ(1, this.target.position.x, this.target.position.y, this.target.position.z);
        positions.needsUpdate = true;
        this.line.geometry.computeBoundingSphere();
    }

    setHighlight(highlight) {
        if (!this.line?.material) return;
        const mat = this.line.material;
        mat.opacity = highlight ? Edge.HIGHLIGHT_OPACITY : Edge.DEFAULT_OPACITY;
        mat.color.set(highlight ? Edge.HIGHLIGHT_COLOR : this.data.color);
        // Note: linewidth requires LineMaterial/LineGeometry/Line2 for runtime changes
        // mat.linewidth = highlight ? this.data.thickness * 1.5 : this.data.thickness;
        mat.needsUpdate = true;
    }

    dispose() {
        if (this.line) {
            this.line.geometry?.dispose();
            this.line.material?.dispose();
            this.line.parent?.remove(this.line);
            this.line = null;
        }
    }
}
