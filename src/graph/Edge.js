import * as THREE from 'three';
import { Utils } from '../utils.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

export class Edge {
    static HIGHLIGHT_COLOR = 0x00ffff;
    static DEFAULT_OPACITY = 0.8; // Adjusted for potentially thicker lines
    static HIGHLIGHT_OPACITY = 1.0;
    line = null;
    // Default constraint: elastic spring
    data = {
        color: 0x00d0ff,
        thickness: 3, // Adjusted for Line2, which uses pixel units
        constraintType: 'elastic',
        constraintParams: { stiffness: 0.001, idealLength: 200 },
    };

    constructor(id, sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode) throw new Error('Edge requires valid source and target nodes.');
        this.id = id;
        this.source = sourceNode;
        this.target = targetNode;
        const defaultData = {
            color: 0x00d0ff,
            thickness: 3, // Default thickness for Line2
            constraintType: 'elastic',
            constraintParams: { stiffness: 0.001, idealLength: 200 },
        };
        this.data = Utils.mergeDeep({}, defaultData, data);
        this.line = this._createLine();
        this.update();
    }

    _createLine() {
        const geometry = new LineGeometry();
        // Positions will be set in update()

        const material = new LineMaterial({
            color: this.data.color,
            linewidth: this.data.thickness, // in pixels
            transparent: true,
            opacity: Edge.DEFAULT_OPACITY,
            depthTest: false, // Render edges slightly "on top"
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight), // for correct thickness
            dashed: false, // Example: can be true if you want dashed lines
            // dashScale: 1,
            // dashSize: 3,
            // gapSize: 1,
        });

        const line = new Line2(geometry, material);
        line.renderOrder = -1; // Render after nodes if nodes are at 0 or positive
        line.userData = { edgeId: this.id }; // Link back
        // line.computeLineDistances(); // Important for dashed lines, but also good practice
        return line;
    }

    update() {
        if (!this.line || !this.source || !this.target) return;

        const positions = [
            this.source.position.x,
            this.source.position.y,
            this.source.position.z,
            this.target.position.x,
            this.target.position.y,
            this.target.position.z,
        ];
        this.line.geometry.setPositions(positions);
        // this.line.computeLineDistances(); // Recalculate for dashed lines if parameters change or on initial setup
        this.line.geometry.attributes.position.needsUpdate = true; // May not be strictly necessary with setPositions
        this.line.geometry.computeBoundingSphere(); // Important for raycasting and culling
    }

    setHighlight(highlight) {
        if (!this.line?.material) return;
        const mat = this.line.material;
        mat.opacity = highlight ? Edge.HIGHLIGHT_OPACITY : Edge.DEFAULT_OPACITY;
        mat.color.set(highlight ? Edge.HIGHLIGHT_COLOR : this.data.color);
        mat.linewidth = highlight ? this.data.thickness * 1.5 : this.data.thickness; // Adjust thickness on highlight
        mat.needsUpdate = true;
    }

    // Call this if the window resizes, or ensure RenderingPlugin does.
    // For now, RenderingPlugin's resize handling should propagate to LineMaterial via renderer updates if it's automatic.
    // If not, EdgePlugin might need to call this on its edges.
    // For simplicity, direct call if needed, or rely on three.js internals.
    // updateResolution(width, height) {
    //     if (this.line?.material) {
    //         this.line.material.resolution.set(width, height);
    //     }
    // }

    dispose() {
        if (this.line) {
            this.line.geometry?.dispose();
            this.line.material?.dispose();
            this.line.parent?.remove(this.line);
            this.line = null;
        }
    }
}
