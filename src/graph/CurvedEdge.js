/**
 * @file CurvedEdge.js - Represents a curved edge (Bezier) in SpaceGraph.
 * @licence MIT
 */

import * as THREE from 'three';
import { Edge } from './Edge.js';
// import { LineGeometry } from 'three/addons/lines/LineGeometry.js'; // Not needed, Edge uses LineGeometry from Line2
// import { LineMaterial } from 'three/addons/lines/LineMaterial.js'; // Not needed, Edge handles material
// import { Line2 } from 'three/addons/lines/Line2.js'; // Not needed, Edge handles line object
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

export class CurvedEdge extends Edge {
    labelObject = null; // For CSS3D label
    // Default number of points to define the curve smoothness
    numPoints = 20;
    // Controls the "bend" of the curve. Positive values bend one way, negative the other.
    // Can be a fixed value or calculated dynamically (e.g., based on distance or angle between nodes).
    curvature = 0.3; // Default curvature factor

    constructor(id, sourceNode, targetNode, data = {}) {
        super(id, sourceNode, targetNode, data);
        // Ensure numPoints is at least 1 to prevent issues with curve generation and color arrays.
        // 0 segments (1 point) would lead to t = 0/0 = NaN in color interpolation.
        // Negative segments would lead to errors in getPoints or empty point arrays.
        this.numPoints = Math.max(1, this.data.numCurvePoints ?? 20);
        this.curvature = this.data.curvature ?? 0.3;

        // The line object created by super() is a straight line.
        // We need to replace its geometry or re-create the line if Line2 geometry cannot be easily updated.
        // For LineGeometry, setPositions should work.
        if (this.data.label) {
            this.labelObject = this._createLabel();
            // Ensure label is added to the scene by EdgePlugin, similar to how arrowheads are handled.
            // This might require EdgePlugin to check for labelObject and add it.
            // For now, we assume it's added when the edge itself is added to the scene.
        }
        this.update(); // Call update to apply curve points and position label
    }

    _createLabel() {
        const div = document.createElement('div');
        div.className = 'edge-label node-common'; // Re-use some styling
        div.textContent = this.data.label;
        // Basic styling, can be enhanced with data properties
        Object.assign(div.style, {
            pointerEvents: 'none',
            color: this.data.labelColor || 'var(--sg-edge-label-text, white)',
            backgroundColor: this.data.labelBackgroundColor || 'var(--sg-edge-label-bg, rgba(0,0,0,0.6))',
            padding: '2px 5px',
            borderRadius: '3px',
            fontSize: this.data.labelFontSize || '12px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
        });
        const label = new CSS3DObject(div);
        label.userData = { edgeId: this.id, type: 'edge-label-curved' }; // Differentiate if needed
        return label;
    }

    // Override update to calculate and set points for a Bezier curve
    update() {
        if (!this.line || !this.source || !this.target) return;

        const sourcePos = this.source.position;
        const targetPos = this.target.position;

        // Fix A3: Check for NaN positions in source/target nodes
        if (!isFinite(sourcePos.x) || !isFinite(sourcePos.y) || !isFinite(sourcePos.z) ||
            !isFinite(targetPos.x) || !isFinite(targetPos.y) || !isFinite(targetPos.z)) {
            console.warn(`CurvedEdge ${this.id}: Source or target node has NaN position. Skipping update. Source: (${sourcePos.x},${sourcePos.y},${sourcePos.z}), Target: (${targetPos.x},${targetPos.y},${targetPos.z})`);
            // Optionally hide the edge:
            // if (this.line) this.line.visible = false;
            return;
        }
        // if (this.line) this.line.visible = true; // Ensure visible if previously hidden


        // Midpoint for control point calculation
        const midPoint = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);

        // Perpendicular direction for control point offset
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        let perpendicular = new THREE.Vector3(-dy, dx, 0);

        // Check if perpendicular is a zero vector (or very close to it)
        // or if it became NaN after normalization (if dx, dy were 0)
        if (perpendicular.lengthSq() < 1e-8) { // Check before normalize to avoid NaN with (0,0,0).normalize()
            // If source and target are at the same X,Y, or very close.
            // Try to use something perpendicular to the view direction projected on XY.
            const viewDirection = new THREE.Vector3();
            if (this.space?.camera?._cam) {
                this.space.camera._cam.getWorldDirection(viewDirection);
                perpendicular.set(-viewDirection.y, viewDirection.x, 0); // Perpendicular to camera's XY projection
            }
            // If still zero (e.g., camera looking straight down or up, or no camera info)
            if (perpendicular.lengthSq() < 1e-8) {
                perpendicular.set(1, 0, 0); // Default fallback to X-axis
            }
        }
        perpendicular.normalize(); // Normalize after ensuring it's not a zero vector

        const distance = sourcePos.distanceTo(targetPos);
        const controlPointOffset = perpendicular.multiplyScalar(distance * this.curvature);
        const controlPoint = new THREE.Vector3().addVectors(midPoint, controlPointOffset);

        // Ensure controlPoint is not NaN
        if (isNaN(controlPoint.x) || isNaN(controlPoint.y) || isNaN(controlPoint.z)) {
            console.warn(`CurvedEdge ${this.id}: Control point has NaN values. Defaulting to midpoint. CP:`, controlPoint, "Source:", sourcePos, "Target:", targetPos);
            controlPoint.copy(midPoint); // Fallback if control point calculation failed
        }

        const curve = new THREE.QuadraticBezierCurve3(sourcePos, controlPoint, targetPos);

        // Ensure numPoints is valid for getPoints
        const numSegments = Math.max(1, this.numPoints); // Ensure at least 1 segment (2 points)
        const points = curve.getPoints(numSegments);

        const positions = [];
        points.forEach((p) => {
            // Additional check for NaN within points from curve.getPoints, though less likely if inputs are sane
            if (isNaN(p.x) || isNaN(p.y) || isNaN(p.z)) {
                console.warn(`CurvedEdge ${this.id}: NaN coordinate in curve points. Point:`, p);
                // Skip this point or use a fallback? For now, let it pass to see if setPositions handles it.
                // Or, more drastically, positions.push(0,0,0) though that would distort the line.
            }
            positions.push(p.x, p.y, p.z);
        });

        // Logging added for debugging the main issue of point count mismatch
        // console.log(`CurvedEdge ${this.id}: numPoints: ${this.numPoints} (segments: ${numSegments}), expected points: ${numSegments + 1}, positions length: ${positions.length / 3}`);

        if (positions.length === 0 || positions.length / 3 !== numSegments + 1) {
            console.error(`CurvedEdge ${this.id}: Incorrect number of points generated. Expected ${numSegments + 1}, got ${positions.length/3}. NumPoints was ${this.numPoints}. Source:`, sourcePos, "Target:", targetPos, "Control:", controlPoint);
            // Fallback: create a straight line if curve generation failed catastrophically
            positions.length = 0; // Clear potentially bad positions
            positions.push(sourcePos.x, sourcePos.y, sourcePos.z);
            positions.push(targetPos.x, targetPos.y, targetPos.z);
             // If we fallback to 2 points, numSegments for color needs to be 1.
             // This part is tricky as color array expects numSegments+1 colors.
        }

        this.line.geometry.setPositions(positions);

        // Ensure the geometry is valid before proceeding
        const posAttribute = this.line.geometry.attributes.position;
        if (!posAttribute || posAttribute.count === 0) {
            console.warn(`CurvedEdge ${this.id}: Position attribute is empty after setPositions. Skipping further updates.`);
            return;
        }

        const actualNumPointsInGeometry = posAttribute.count; // This is the true number of points in the geometry

        // Handle gradient colors for curved lines
        if (this.data.gradientColors && this.data.gradientColors.length === 2) {
            if (!this.line.material.vertexColors) {
                this.line.material.vertexColors = true;
                this.line.material.needsUpdate = true;
            }
            const colorStart = new THREE.Color(this.data.gradientColors[0]);
            const colorEnd = new THREE.Color(this.data.gradientColors[1]);
            const curveColors = [];

            // The number of color entries must match the actual number of points in the geometry.
            // Interpolation should be over (actualNumPointsInGeometry - 1) segments.
            const effectiveNumSegmentsForColor = Math.max(1, actualNumPointsInGeometry - 1);

            for (let i = 0; i < actualNumPointsInGeometry; i++) {
                const t = (effectiveNumSegmentsForColor === 0) ? 0 : (i / effectiveNumSegmentsForColor); // Avoid division by zero if only 1 point (though unlikely)
                const interpolatedColor = new THREE.Color().lerpColors(colorStart, colorEnd, t);
                curveColors.push(interpolatedColor.r, interpolatedColor.g, interpolatedColor.b);
            }

            // Corrected guard for setColors:
            // The number of points in geometry (posAttribute.count) must be consistent with
            // the `numSegments` used for color generation (which is actualNumPointsInGeometry -1).
            // The `curveColors` array will have `actualNumPointsInGeometry * 3` elements.
            // `posAttribute.array.length` should be `actualNumPointsInGeometry * 3`.

            if (posAttribute.array && posAttribute.array.length > 0 && posAttribute.array.length === curveColors.length) {
                this.line.geometry.setColors(curveColors);
                // No need to check instanceColorStart/End here, this is for LineGeometry used by Line2
            } else {
                console.warn(`CurvedEdge ${this.id}: Skipping setColors in update() due to mismatch or invalid geometry positions.
                    Actual Points in Geometry: ${actualNumPointsInGeometry}, Colors Generated: ${curveColors.length/3}, Positions Array Length: ${posAttribute?.array?.length},
                    Original numPoints: ${this.numPoints}, Segments for Color: ${effectiveNumSegmentsForColor}`);
            }
        } else {
            // Ensure no gradient if not specified (similar to Edge.js update)
            if (this.line.material.vertexColors) {
                this.line.material.vertexColors = false;
                this.line.material.needsUpdate = true;
            }
            this.line.material.color.set(this.data.color || 0x00d0ff); // Fallback or defined solid color
        }

        if (this.line.material.dashed) {
            this.line.computeLineDistances(); // Required for dashed lines
        }
        // setPositions and setColors should mark relevant attributes for update.
        // this.line.geometry.attributes.position.needsUpdate = true; // Already handled by setPositions
        this.line.geometry.computeBoundingSphere(); // Important for raycasting and culling

        this._updateArrowheadsAlongCurve(points);
        this._updateLabelAlongCurve(points);
    }

    _updateArrowheadsAlongCurve(points) {
        if (!points || points.length < 2) return;

        const numSegments = points.length - 1;

        if (this.arrowheads.target) {
            const targetPos = points[numSegments]; // Last point
            const prevPos = points[numSegments - 1]; // Second to last point
            this.arrowheads.target.position.copy(targetPos);
            const direction = new THREE.Vector3().subVectors(targetPos, prevPos).normalize();
            this._orientArrowhead(this.arrowheads.target, direction);
        }

        if (this.arrowheads.source) {
            const sourcePos = points[0]; // First point
            const nextPos = points[1]; // Second point
            this.arrowheads.source.position.copy(sourcePos);
            const direction = new THREE.Vector3().subVectors(sourcePos, nextPos).normalize(); // Direction from tip to tail for orientation
            this._orientArrowhead(this.arrowheads.source, direction);
        }
    }

    _updateLabelAlongCurve(points) {
        if (this.labelObject && points && points.length > 0) {
            const midPointIndex = Math.floor(points.length / 2);
            this.labelObject.position.copy(points[midPointIndex]);

            if (this.space?.camera?._cam) {
                // Ensure this.space is set by EdgeFactory
                this.labelObject.quaternion.copy(this.space.camera._cam.quaternion);
            }
            this._applyLabelLOD(); // Apply LOD to the label
        }
    }

    _applyLabelLOD() {
        // Adapted from LabeledEdge
        if (!this.labelObject?.element || !this.data.labelLod || this.data.labelLod.length === 0) {
            if (this.labelObject?.element) this.labelObject.element.style.visibility = '';
            return;
        }

        const camera = this.space?.plugins?.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!camera || !this.space) return;

        const distanceToCamera = this.labelObject.position.distanceTo(camera.position);
        const sortedLodLevels = [...this.data.labelLod].sort((a, b) => (b.distance || 0) - (a.distance || 0));

        let appliedRule = false;
        for (const level of sortedLodLevels) {
            if (distanceToCamera >= (level.distance || 0)) {
                if (level.style && level.style.includes('visibility:hidden')) {
                    this.labelObject.element.style.visibility = 'hidden';
                } else {
                    this.labelObject.element.style.visibility = '';
                    // TODO: apply other styles
                }
                appliedRule = true;
                break;
            }
        }
        if (!appliedRule) {
            this.labelObject.element.style.visibility = '';
        }
    }

    setHighlight(highlight) {
        super.setHighlight(highlight);
        if (this.labelObject?.element) {
            this.labelObject.element.classList.toggle('selected', highlight);
            // Potentially update style for label background/color on highlight via CSS or directly
        }
    }

    dispose() {
        if (this.labelObject) {
            this.labelObject.element?.remove();
            // Ensure it's removed from parent if added directly to scene (CSS3DScene)
            this.labelObject.parent?.remove(this.labelObject);
            this.labelObject = null;
        }
        super.dispose();
    }
}
