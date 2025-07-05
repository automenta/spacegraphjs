import * as THREE from 'three';
import {Edge} from './Edge.js';

export class BezierEdge extends Edge {
    static typeName = 'bezier';
    
    controlPoints = [];
    curve = null;
    controlPointMeshes = [];
    controlPointVisible = false;
    autoControlPoints = true;
    segments = 50;
    
    constructor(id, sourceNode, targetNode, data = {}) {
        const bezierData = {
            segments: data.segments ?? 50,
            autoControlPoints: data.autoControlPoints ?? true,
            controlPointsVisible: data.controlPointsVisible ?? false,
            controlPointSize: data.controlPointSize ?? 3,
            controlPointColor: data.controlPointColor ?? 0xffff00,
            curveTension: data.curveTension ?? 0.3,
            curveType: data.curveType ?? 'cubic', // 'cubic', 'quadratic'
            manualControlPoints: data.manualControlPoints ?? null,
            ...data
        };

        super(id, sourceNode, targetNode, bezierData);
        
        this.segments = bezierData.segments;
        this.autoControlPoints = bezierData.autoControlPoints;
        this.controlPointVisible = bezierData.controlPointsVisible;
        
        this._initializeControlPoints();
        this._createControlPointMeshes();
        this.update();
    }

    _initializeControlPoints() {
        if (!this.source || !this.target) return;
        
        if (this.data.manualControlPoints && this.data.manualControlPoints.length > 0) {
            // Use manually specified control points
            this.controlPoints = this.data.manualControlPoints.map(cp => 
                new THREE.Vector3(cp.x, cp.y, cp.z || 0)
            );
            this.autoControlPoints = false;
        } else if (this.autoControlPoints) {
            // Generate automatic control points
            this._generateAutoControlPoints();
        } else {
            // Default control points
            this.controlPoints = [
                this.source.position.clone(),
                new THREE.Vector3(),
                new THREE.Vector3(),
                this.target.position.clone()
            ];
        }
        
        this._updateCurve();
    }

    _generateAutoControlPoints() {
        const sourcePos = this.source.position;
        const targetPos = this.target.position;
        const distance = sourcePos.distanceTo(targetPos);
        const tension = this.data.curveTension;
        
        // Calculate direction vector
        const direction = new THREE.Vector3().subVectors(targetPos, sourcePos);
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
        
        if (this.data.curveType === 'quadratic') {
            // Single control point for quadratic curve
            const midPoint = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);
            const offset = perpendicular.multiplyScalar(distance * tension);
            
            this.controlPoints = [
                sourcePos.clone(),
                midPoint.clone().add(offset),
                targetPos.clone()
            ];
        } else {
            // Two control points for cubic curve
            const controlDistance = distance * tension;
            
            // First control point
            const cp1Direction = direction.clone().normalize();
            const cp1Offset = perpendicular.clone().multiplyScalar(controlDistance * 0.5);
            const cp1 = sourcePos.clone()
                .add(cp1Direction.multiplyScalar(controlDistance))
                .add(cp1Offset);
            
            // Second control point
            const cp2Direction = direction.clone().normalize().negate();
            const cp2Offset = perpendicular.clone().multiplyScalar(-controlDistance * 0.5);
            const cp2 = targetPos.clone()
                .add(cp2Direction.multiplyScalar(controlDistance))
                .add(cp2Offset);
            
            this.controlPoints = [
                sourcePos.clone(),
                cp1,
                cp2,
                targetPos.clone()
            ];
        }
    }

    _updateCurve() {
        if (this.controlPoints.length < 3) return;
        
        if (this.data.curveType === 'quadratic' && this.controlPoints.length === 3) {
            this.curve = new THREE.QuadraticBezierCurve3(
                this.controlPoints[0],
                this.controlPoints[1],
                this.controlPoints[2]
            );
        } else if (this.controlPoints.length >= 4) {
            this.curve = new THREE.CubicBezierCurve3(
                this.controlPoints[0],
                this.controlPoints[1],
                this.controlPoints[2],
                this.controlPoints[3]
            );
        }
        
        this._updateLineGeometry();
    }

    _updateLineGeometry() {
        if (!this.curve || !this.line) return;
        
        const points = this.curve.getPoints(this.segments);
        const positions = [];
        
        points.forEach(point => {
            positions.push(point.x, point.y, point.z);
        });
        
        this.line.geometry.setPositions(positions);
        
        // Update gradient colors if applicable
        if (this.data.gradientColors?.length === 2) {
            const colors = [];
            const colorStart = new THREE.Color(this.data.gradientColors[0]);
            const colorEnd = new THREE.Color(this.data.gradientColors[1]);
            
            for (let i = 0; i < points.length; i++) {
                const t = i / (points.length - 1);
                const color = colorStart.clone().lerp(colorEnd, t);
                colors.push(color.r, color.g, color.b);
            }
            
            this.line.geometry.setColors(colors);
        }
        
        if (this.line.material.dashed) {
            this.line.computeLineDistances();
        }
        
        this.line.geometry.computeBoundingSphere();
    }

    _createControlPointMeshes() {
        this._disposeControlPointMeshes();
        
        if (!this.controlPointVisible) return;
        
        const geometry = new THREE.SphereGeometry(this.data.controlPointSize, 16, 8);
        
        this.controlPoints.forEach((point, index) => {
            // Skip source and target points (they're the nodes themselves)
            if (index === 0 || index === this.controlPoints.length - 1) return;
            
            const material = new THREE.MeshBasicMaterial({
                color: this.data.controlPointColor,
                transparent: true,
                opacity: 0.8
            });
            
            const mesh = new THREE.Mesh(geometry.clone(), material);
            mesh.position.copy(point);
            mesh.userData = { 
                edgeId: this.id, 
                type: 'control-point', 
                index: index 
            };
            
            this.controlPointMeshes.push(mesh);
        });
    }

    _disposeControlPointMeshes() {
        this.controlPointMeshes.forEach(mesh => {
            mesh.geometry?.dispose();
            mesh.material?.dispose();
            mesh.parent?.remove(mesh);
        });
        this.controlPointMeshes = [];
    }

    update() {
        if (!this.source || !this.target) return;
        
        // Update source and target positions
        if (this.controlPoints.length > 0) {
            this.controlPoints[0].copy(this.source.position);
            this.controlPoints[this.controlPoints.length - 1].copy(this.target.position);
            
            // Regenerate auto control points if enabled
            if (this.autoControlPoints) {
                this._generateAutoControlPoints();
            }
            
            this._updateCurve();
        }
        
        // Update control point mesh positions
        this.controlPointMeshes.forEach((mesh, index) => {
            const controlIndex = index + 1; // Skip source point
            if (this.controlPoints[controlIndex]) {
                mesh.position.copy(this.controlPoints[controlIndex]);
            }
        });
        
        super.update();
    }

    setControlPoint(index, position) {
        if (index >= 0 && index < this.controlPoints.length) {
            this.controlPoints[index].copy(position);
            this._updateCurve();
            
            // Update corresponding mesh
            const meshIndex = index - 1; // Adjust for skipped source point
            if (meshIndex >= 0 && meshIndex < this.controlPointMeshes.length) {
                this.controlPointMeshes[meshIndex].position.copy(position);
            }
            
            this.space?.emit('graph:edge:controlPointChanged', {
                edge: this,
                index,
                position: position.clone()
            });
        }
    }

    addControlPoint(position, index = null) {
        const insertIndex = index !== null ? index : Math.floor(this.controlPoints.length / 2);
        const newPoint = new THREE.Vector3().copy(position);
        
        this.controlPoints.splice(insertIndex, 0, newPoint);
        this.autoControlPoints = false; // Disable auto mode when manually adding points
        
        this._updateCurve();
        this._createControlPointMeshes();
        
        this.space?.emit('graph:edge:controlPointAdded', {
            edge: this,
            index: insertIndex,
            position: newPoint.clone()
        });
    }

    removeControlPoint(index) {
        if (index > 0 && index < this.controlPoints.length - 1) { // Can't remove source/target
            this.controlPoints.splice(index, 1);
            this._updateCurve();
            this._createControlPointMeshes();
            
            this.space?.emit('graph:edge:controlPointRemoved', {
                edge: this,
                index
            });
        }
    }

    setControlPointsVisible(visible) {
        this.controlPointVisible = visible;
        this.data.controlPointsVisible = visible;
        
        if (visible) {
            this._createControlPointMeshes();
        } else {
            this._disposeControlPointMeshes();
        }
    }

    setCurveTension(tension) {
        this.data.curveTension = tension;
        if (this.autoControlPoints) {
            this._generateAutoControlPoints();
            this._updateCurve();
        }
    }

    setCurveType(type) {
        if (type === 'quadratic' || type === 'cubic') {
            this.data.curveType = type;
            this._generateAutoControlPoints();
            this._updateCurve();
            this._createControlPointMeshes();
        }
    }

    setSegments(segments) {
        this.segments = Math.max(3, segments);
        this.data.segments = this.segments;
        this._updateLineGeometry();
    }

    setAutoControlPoints(auto) {
        this.autoControlPoints = auto;
        this.data.autoControlPoints = auto;
        
        if (auto) {
            this._generateAutoControlPoints();
            this._updateCurve();
            this._createControlPointMeshes();
        }
    }

    getPointOnCurve(t) {
        return this.curve ? this.curve.getPoint(t) : new THREE.Vector3();
    }

    getTangentOnCurve(t) {
        return this.curve ? this.curve.getTangent(t) : new THREE.Vector3();
    }

    getCurveLength() {
        return this.curve ? this.curve.getLength() : 0;
    }

    getControlPoints() {
        return this.controlPoints.map(p => p.clone());
    }

    // Animate control points
    animateControlPoints(amplitude = 20, frequency = 1) {
        if (!this.autoControlPoints || this.controlPoints.length < 3) return;
        
        const time = performance.now() * 0.001;
        
        // Animate middle control points with sine waves
        for (let i = 1; i < this.controlPoints.length - 1; i++) {
            const originalY = this.controlPoints[i].y;
            const offset = Math.sin(time * frequency + i) * amplitude;
            this.controlPoints[i].y = originalY + offset;
        }
        
        this._updateCurve();
    }

    dispose() {
        this._disposeControlPointMeshes();
        super.dispose();
    }

    // Methods to add/remove control point meshes from scene
    addToScene(scene) {
        this.controlPointMeshes.forEach(mesh => scene.add(mesh));
    }

    removeFromScene(scene) {
        this.controlPointMeshes.forEach(mesh => scene.remove(mesh));
    }
}