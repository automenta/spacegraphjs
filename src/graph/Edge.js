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
    arrowheadMesh = null; // For arrowhead
    // Default constraint: elastic spring
    data = {
        color: 0x00d0ff,
        thickness: 3, // Adjusted for Line2, which uses pixel units
        constraintType: 'elastic',
        constraintParams: { stiffness: 0.001, idealLength: 200 },
        arrowhead: false, // Can be true, 'source', 'target', or 'both'
        arrowheadSize: 10,
        arrowheadColor: null, // null means use edge color
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
            // Dashed properties are now controlled by data
            dashed: this.data.dashed || false,
            dashScale: this.data.dashScale ?? 1,
            dashSize: this.data.dashSize ?? 3,
            gapSize: this.data.gapSize ?? 1,
        });

        const line = new Line2(geometry, material);
        if (line.material.dashed) {
            line.computeLineDistances(); // Required for dashed lines
        }
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

        if (this.arrowheadMesh) {
            const targetPos = this.target.position;
            const sourcePos = this.source.position; // Needed for direction

            // Position arrowhead at the target node's position, or slightly offset along the edge
            // For now, placing it directly at target. Offset might be needed if target node has a large radius.
            this.arrowheadMesh.position.copy(targetPos);

            // Orient arrowhead
            const direction = new THREE.Vector3().subVectors(targetPos, sourcePos).normalize();
            if (direction.lengthSq() > 0.0001) { // Ensure not zero vector
                 // Point the arrowhead along the Z-axis of its local space, then align this Z-axis with the direction vector.
                 // Default cone geometry points along its Y axis. We'll rotate it to point along Z.
                const quaternion = new THREE.Quaternion();
                // Arrowheads are typically modeled pointing along an axis (e.g. +Z or +Y).
                // Let's assume our cone points along its local +Y axis.
                // We want to align this +Y axis with 'direction'.
                // The default THREE.ConeGeometry is oriented along the Y axis.
                // We need to align the arrowhead's local Y-axis to the edge's direction.
                const up = new THREE.Vector3(0, 1, 0); // Default orientation of ConeGeometry
                quaternion.setFromUnitVectors(up, direction);
                this.arrowheadMesh.quaternion.copy(quaternion);
            }
        }
    }

    _createArrowhead() {
        const size = this.data.arrowheadSize || 10;
        // A cone is a common choice for an arrowhead
        // ConeGeometry(radius, height, radialSegments)
        const geometry = new THREE.ConeGeometry(size / 2, size, 8);
        // Rotate the cone so its tip points along the positive Y axis if default is different,
        // or adjust quaternion logic in update(). Default Cone points along +Y.

        const material = new THREE.MeshBasicMaterial({
            color: this.data.arrowheadColor || this.data.color,
            opacity: Edge.DEFAULT_OPACITY, // Match line opacity
            transparent: true,
            depthTest: false, // Render slightly "on top"
        });
        const arrowhead = new THREE.Mesh(geometry, material);
        arrowhead.renderOrder = this.line.renderOrder + 1; // Render after the line
        arrowhead.userData = { edgeId: this.id, type: 'edge-arrowhead' };
        return arrowhead;
    }


    setHighlight(highlight) {
        if (!this.line?.material) return;
        const mat = this.line.material;
        mat.opacity = highlight ? Edge.HIGHLIGHT_OPACITY : Edge.DEFAULT_OPACITY;
        mat.color.set(highlight ? Edge.HIGHLIGHT_COLOR : this.data.color);
        mat.linewidth = highlight ? this.data.thickness * 1.5 : this.data.thickness; // Adjust thickness on highlight
        mat.needsUpdate = true;

        if (this.arrowheadMesh?.material) {
            this.arrowheadMesh.material.color.set(highlight ? Edge.HIGHLIGHT_COLOR : (this.data.arrowheadColor || this.data.color) );
            this.arrowheadMesh.material.opacity = highlight ? Edge.HIGHLIGHT_OPACITY : Edge.DEFAULT_OPACITY;
            // Optionally scale arrowhead on highlight
            // const scale = highlight ? 1.2 : 1;
            // this.arrowheadMesh.scale.set(scale, scale, scale);
        }
    }

    // Call this if the window resizes, or ensure RenderingPlugin does.
    // For now, RenderingPlugin's resize handling should propagate to LineMaterial via renderer updates if it's automatic.
    // If not, EdgePlugin might need to call this on its edges.
    // For simplicity, direct call if needed, or rely on three.js internals.
    updateResolution(width, height) {
        if (this.line?.material) {
            this.line.material.resolution.set(width, height);
        }
    }

    dispose() {
        if (this.line) {
            this.line.geometry?.dispose();
            this.line.material?.dispose();
            this.line.parent?.remove(this.line);
            this.line = null;
        }
        if (this.arrowheadMesh) {
            this.arrowheadMesh.geometry?.dispose();
            this.arrowheadMesh.material?.dispose();
            this.arrowheadMesh.parent?.remove(this.arrowheadMesh);
            this.arrowheadMesh = null;
        }
    }
}
