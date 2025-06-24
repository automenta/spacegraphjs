/**
 * @file CurvedEdge.js - Represents a curved edge (Bezier) in SpaceGraph.
 * @licence MIT
 */

import * as THREE from 'three';
import { Edge } from './Edge.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
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
        this.numPoints = this.data.numCurvePoints ?? 20;
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
        const points = curve.getPoints(this.numPoints); // this.numPoints is N segments, so N+1 points

        const positions = [];
        points.forEach(p => positions.push(p.x, p.y, p.z));
        this.line.geometry.setPositions(positions);

        // Handle gradient colors for curved lines
        if (this.data.gradientColors && this.data.gradientColors.length === 2) {
            if (!this.line.material.vertexColors) {
                this.line.material.vertexColors = true;
                this.line.material.needsUpdate = true;
            }
            const colorStart = new THREE.Color(this.data.gradientColors[0]);
            const colorEnd = new THREE.Color(this.data.gradientColors[1]);
            const curveColors = [];
            for (let i = 0; i <= this.numPoints; i++) { // numPoints is number of segments, so numPoints+1 actual points
                const t = i / this.numPoints;
                const interpolatedColor = new THREE.Color().lerpColors(colorStart, colorEnd, t);
                curveColors.push(interpolatedColor.r, interpolatedColor.g, interpolatedColor.b);
            }
            this.line.geometry.setColors(curveColors);
            if (this.line.geometry.attributes.instanceColorStart) this.line.geometry.attributes.instanceColorStart.needsUpdate = true;
            if (this.line.geometry.attributes.instanceColorEnd) this.line.geometry.attributes.instanceColorEnd.needsUpdate = true;

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

            if (this.space?.camera?._cam) { // Ensure this.space is set by EdgeFactory
                this.labelObject.quaternion.copy(this.space.camera._cam.quaternion);
            }
            this._applyLabelLOD(); // Apply LOD to the label
        }
    }

    _applyLabelLOD() { // Adapted from LabeledEdge
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
