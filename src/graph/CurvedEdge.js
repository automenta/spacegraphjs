/**
 * @file CurvedEdge.js - Represents a curved edge (Bezier) in SpaceGraph.
 * @licence MIT
 */

import * as THREE from 'three';
import { Edge } from './Edge.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'; // Re-import if Edge doesn't export it
import { Line2 } from 'three/addons/lines/Line2.js';

export class CurvedEdge extends Edge {
    // Default number of points to define the curve smoothness
    numPoints = 20;
    // Controls the "bend" of the curve. Positive values bend one way, negative the other.
    // Can be a fixed value or calculated dynamically (e.g., based on distance or angle between nodes).
    curvature = 0.3; // Default curvature factor

    constructor(id, sourceNode, targetNode, data = {}) {
        super(id, sourceNode, targetNode, data);
        this.numPoints = this.data.numCurvePoints ?? 20;
        this.curvature = this.data.curvature ?? 0.3;

        // The line object created by super() is a straight line.
        // We need to replace its geometry or re-create the line if Line2 geometry cannot be easily updated.
        // For LineGeometry, setPositions should work.
        this.update(); // Call update to apply curve points
    }

    // Override update to calculate and set points for a Bezier curve
    update() {
        if (!this.line || !this.source || !this.target) return;

        const sourcePos = this.source.position;
        const targetPos = this.target.position;

        // Midpoint for control point calculation
        const midPoint = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);

        // Perpendicular direction for control point offset
        // For 2D graphs on XY plane, this is simpler. For 3D, need a consistent perpendicular.
        // Let's use a simple perpendicular in the XY plane for now, or a fixed offset.
        // A more robust method might involve cross products with a camera up vector or similar.
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        // const dz = targetPos.z - sourcePos.z; // if needed for 3D curvature

        // Simple perpendicular in XY plane
        let perpendicular = new THREE.Vector3(-dy, dx, 0).normalize();

        // If dx and dy are zero (nodes are vertically aligned in XY), perpendicular will be (0,0,0).
        // Fallback for co-linear points or pure Z offset.
        if (perpendicular.lengthSq() === 0) {
            // If source and target are at the same X,Y, bend along X-axis or view plane normal
            const viewDirection = new THREE.Vector3();
            this.space?.camera?._cam?.getWorldDirection(viewDirection); // Get camera view direction
            if (viewDirection && (Math.abs(viewDirection.x) > 0.1 || Math.abs(viewDirection.y) > 0.1 )) {
                 // Try to use something perpendicular to the view direction projected on XY
                 perpendicular.set(-viewDirection.y, viewDirection.x, 0).normalize();
                 if (perpendicular.lengthSq() === 0) perpendicular.set(1,0,0); // Absolute fallback
            } else {
                perpendicular.set(1, 0, 0); // Default fallback if camera info is not helpful
            }
        }


        const distance = sourcePos.distanceTo(targetPos);
        const controlPointOffset = perpendicular.multiplyScalar(distance * this.curvature);
        const controlPoint = new THREE.Vector3().addVectors(midPoint, controlPointOffset);

        const curve = new THREE.QuadraticBezierCurve3(sourcePos, controlPoint, targetPos);
        const points = curve.getPoints(this.numPoints);

        const positions = [];
        points.forEach(p => positions.push(p.x, p.y, p.z));

        this.line.geometry.setPositions(positions);
        if (this.line.material.dashed) {
            this.line.computeLineDistances(); // Required for dashed lines
        }
        this.line.geometry.attributes.position.needsUpdate = true;
        this.line.geometry.computeBoundingSphere(); // Important for raycasting and culling
    }
}
