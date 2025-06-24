import * as THREE from 'three';
import { Edge } from './Edge.js';

export class CurvedEdge extends Edge {
    numPoints = 20;
    curvature = 0.3;

    constructor(id, sourceNode, targetNode, data = {}) {
        super(id, sourceNode, targetNode, data);

        let requestedNumPoints = this.data.numCurvePoints;
        this.numPoints = Math.max(1, Math.floor(requestedNumPoints || 20));

        this.curvature = (typeof this.data.curvature === 'number' && isFinite(this.data.curvature))
            ? this.data.curvature
            : 0.3;

        if (this.data.label) this.labelObject = this._createLabel(this.data.label, 'edge-label node-common');
        this.update();
    }

    update() {
        super.update();
        if (!this.line || !this.source || !this.target) return;

        if (typeof this.numPoints !== 'number' || isNaN(this.numPoints) || this.numPoints <= 0) {
            this.numPoints = 20;
        }

        const sourcePos = this.source.position;
        const targetPos = this.target.position;

        if (!isFinite(sourcePos.x) || !isFinite(sourcePos.y) || !isFinite(sourcePos.z) ||
            !isFinite(targetPos.x) || !isFinite(targetPos.y) || !isFinite(targetPos.z)) {
            return;
        }

        const midPoint = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);

        let dx = targetPos.x - sourcePos.x;
        let dy = targetPos.y - sourcePos.y;
        let perpendicular = new THREE.Vector3(-dy, dx, 0);

        if (perpendicular.lengthSq() < 1e-8) {
            const viewDirection = new THREE.Vector3();
            if (this.space?.camera?._cam) {
                this.space.camera._cam.getWorldDirection(viewDirection);
                perpendicular.set(-viewDirection.y, viewDirection.x, 0);
            }
            if (perpendicular.lengthSq() < 1e-8) perpendicular.set(1, 0, 0);
        }
        perpendicular.normalize();

        const distance = sourcePos.distanceTo(targetPos);
        const controlPointOffset = perpendicular.multiplyScalar(distance * this.curvature);
        const controlPoint = new THREE.Vector3().addVectors(midPoint, controlPointOffset);

        if (isNaN(controlPoint.x) || isNaN(controlPoint.y) || isNaN(controlPoint.z)) {
            controlPoint.copy(midPoint);
        }

        const curve = new THREE.QuadraticBezierCurve3(sourcePos, controlPoint, targetPos);
        const curveSegments = this.numPoints;
        const points = curve.getPoints(curveSegments);

        const positions = [];
        points.forEach((p) => positions.push(p.x, p.y, p.z));

        if (positions.length === 0 || positions.length / 3 !== curveSegments + 1) {
            positions.length = 0;
            positions.push(sourcePos.x, sourcePos.y, sourcePos.z);
            positions.push(targetPos.x, targetPos.y, targetPos.z);
        }

        this.line.geometry.setPositions(positions);

        const posAttribute = this.line.geometry.attributes.position;
        if (!posAttribute || posAttribute.count === 0) return;

        const actualNumPointsInGeometry = posAttribute.count;

        if (this.data.gradientColors?.length === 2) {
            if (!this.line.material.vertexColors) {
                this.line.material.vertexColors = true;
                this.line.material.needsUpdate = true;
            }
            const colorStart = new THREE.Color(this.data.gradientColors[0]);
            const colorEnd = new THREE.Color(this.data.gradientColors[1]);
            const curveColors = [];

            const effectiveNumSegmentsForColor = Math.max(1, actualNumPointsInGeometry - 1);

            for (let i = 0; i < actualNumPointsInGeometry; i++) {
                const t = (effectiveNumSegmentsForColor === 0) ? 0 : (i / effectiveNumSegmentsForColor);
                const interpolatedColor = new THREE.Color().lerpColors(colorStart, colorEnd, t);
                curveColors.push(interpolatedColor.r, interpolatedColor.g, interpolatedColor.b);
            }

            if (posAttribute.array?.length === curveColors.length) {
                this.line.geometry.setColors(curveColors);
            }
        } else {
            if (this.line.material.vertexColors) {
                this.line.material.vertexColors = false;
                this.line.material.needsUpdate = true;
            }
            this.line.material.color.set(this.data.color || 0x00d0ff);
        }

        if (this.line.material.dashed) this.line.computeLineDistances();
        this.line.geometry.computeBoundingSphere();

        this._updateArrowheadsAlongCurve(points);
        this._updateLabelAlongCurve(points);
    }

    _updateArrowheadsAlongCurve(points) {
        if (!points || points.length < 2) return;

        const numSegments = points.length - 1;

        if (this.arrowheads.target) {
            const targetPos = points[numSegments];
            const prevPos = points[numSegments - 1];
            this.arrowheads.target.position.copy(targetPos);
            const direction = new THREE.Vector3().subVectors(targetPos, prevPos).normalize();
            this._orientArrowhead(this.arrowheads.target, direction);
        }

        if (this.arrowheads.source) {
            const sourcePos = points[0];
            const nextPos = points[1];
            this.arrowheads.source.position.copy(sourcePos);
            const direction = new THREE.Vector3().subVectors(sourcePos, nextPos).normalize();
            this._orientArrowhead(this.arrowheads.source, direction);
        }
    }

    _updateLabelAlongCurve(points) {
        if (!this.labelObject || !points?.length) return;
        const midPointIndex = Math.floor(points.length / 2);
        this.labelObject.position.copy(points[midPointIndex]);
        super.update(this.space);
    }

    setHighlight(highlight) {
        super.setHighlight(highlight);
        this.labelObject?.element?.classList.toggle('selected', highlight);
    }

    dispose() {
        super.dispose();
    }
}
