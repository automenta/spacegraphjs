import * as THREE from 'three';
import {Edge} from './Edge.js';

export class SpringEdge extends Edge {
    static typeName = 'spring';
    
    springForce = null;
    restLength = 200;
    stiffness = 0.01;
    damping = 0.95;
    tension = 0;
    isCompressed = false;
    maxCompression = 0.3;
    springCoils = 8;
    springMesh = null;
    
    constructor(id, sourceNode, targetNode, data = {}) {
        const springData = {
            restLength: data.restLength ?? 200,
            stiffness: data.stiffness ?? 0.01,
            damping: data.damping ?? 0.95,
            maxCompression: data.maxCompression ?? 0.3,
            springCoils: data.springCoils ?? 8,
            springRadius: data.springRadius ?? 5,
            springColor: data.springColor ?? 0x888888,
            showTension: data.showTension ?? true,
            tensionColorMin: data.tensionColorMin ?? 0x00ff00,
            tensionColorMax: data.tensionColorMax ?? 0xff0000,
            enablePhysics: data.enablePhysics ?? true,
            ...data
        };

        super(id, sourceNode, targetNode, springData);
        
        this.restLength = springData.restLength;
        this.stiffness = springData.stiffness;
        this.damping = springData.damping;
        this.maxCompression = springData.maxCompression;
        this.springCoils = springData.springCoils;
        
        this._createSpringMesh();
        this.update();
    }

    _createSpringMesh() {
        this._disposeSpringMesh();
        
        const geometry = this._createSpringGeometry();
        const material = new THREE.MeshBasicMaterial({
            color: this.data.springColor,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        this.springMesh = new THREE.Mesh(geometry, material);
        this.springMesh.userData = { edgeId: this.id, type: 'spring-mesh' };
    }

    _createSpringGeometry() {
        const points = [];
        const totalCoils = this.springCoils;
        const pointsPerCoil = 20;
        const totalPoints = totalCoils * pointsPerCoil;
        
        for (let i = 0; i <= totalPoints; i++) {
            const t = i / totalPoints;
            const angle = t * totalCoils * Math.PI * 2;
            const radius = this.data.springRadius * (1 - Math.abs(t - 0.5) * 0.3); // Taper ends
            
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const z = t; // Will be scaled to actual length
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(curve, totalPoints, this.data.springRadius * 0.2, 8, false);
        
        return geometry;
    }

    _updateSpringGeometry() {
        if (!this.springMesh || !this.source || !this.target) return;
        
        const sourcePos = this.source.position;
        const targetPos = this.target.position;
        const currentLength = sourcePos.distanceTo(targetPos);
        
        // Calculate compression/extension ratio
        const lengthRatio = currentLength / this.restLength;
        this.isCompressed = lengthRatio < 1;
        
        // Calculate spring direction
        const direction = new THREE.Vector3().subVectors(targetPos, sourcePos).normalize();
        const perpendicular = new THREE.Vector3();
        
        if (Math.abs(direction.y) < 0.9) {
            perpendicular.crossVectors(direction, new THREE.Vector3(0, 1, 0));
        } else {
            perpendicular.crossVectors(direction, new THREE.Vector3(1, 0, 0));
        }
        perpendicular.normalize();
        
        const binormal = new THREE.Vector3().crossVectors(direction, perpendicular);
        
        // Update spring mesh position and rotation
        const center = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);
        this.springMesh.position.copy(center);
        
        // Create rotation matrix
        const matrix = new THREE.Matrix4();
        matrix.makeBasis(perpendicular, binormal, direction);
        this.springMesh.setRotationFromMatrix(matrix);
        
        // Scale spring mesh
        const compressionFactor = this.isCompressed ? 
            Math.max(this.maxCompression, lengthRatio) : lengthRatio;
        
        this.springMesh.scale.set(
            this.isCompressed ? (2 - compressionFactor) : 1, // Increase radius when compressed
            this.isCompressed ? (2 - compressionFactor) : 1,
            compressionFactor
        );
        
        // Update color based on tension
        if (this.data.showTension) {
            this._updateTensionColor(lengthRatio);
        }
        
        // Calculate spring force
        this._calculateSpringForce();
    }

    _updateTensionColor(lengthRatio) {
        if (!this.springMesh || !this.springMesh.material) return;
        
        const tensionFactor = Math.abs(lengthRatio - 1); // 0 = no tension, higher = more tension
        const normalizedTension = Math.min(tensionFactor * 2, 1); // Scale for visibility
        
        const minColor = new THREE.Color(this.data.tensionColorMin);
        const maxColor = new THREE.Color(this.data.tensionColorMax);
        const currentColor = minColor.clone().lerp(maxColor, normalizedTension);
        
        this.springMesh.material.color.copy(currentColor);
        
        // Update opacity based on tension
        this.springMesh.material.opacity = 0.6 + normalizedTension * 0.4;
    }

    _calculateSpringForce() {
        if (!this.source || !this.target || !this.data.enablePhysics) return;
        
        const sourcePos = this.source.position;
        const targetPos = this.target.position;
        const currentLength = sourcePos.distanceTo(targetPos);
        
        // Hooke's law: F = -k * (x - x0)
        const displacement = currentLength - this.restLength;
        const forceMagnitude = -this.stiffness * displacement;
        
        // Force direction (from source to target)
        const forceDirection = new THREE.Vector3().subVectors(targetPos, sourcePos).normalize();
        this.springForce = forceDirection.multiplyScalar(forceMagnitude);
        
        // Store tension for visual feedback
        this.tension = Math.abs(displacement / this.restLength);
        
        // Emit physics event for layout systems to use
        this.space?.emit('physics:spring:force', {
            edge: this,
            force: this.springForce.clone(),
            tension: this.tension,
            displacement,
            isCompressed: this.isCompressed
        });
    }

    update() {
        super.update();
        this._updateSpringGeometry();
    }

    getSpringForce() {
        return this.springForce ? this.springForce.clone() : new THREE.Vector3();
    }

    getTension() {
        return this.tension;
    }

    setRestLength(length) {
        this.restLength = length;
        this.data.restLength = length;
        this.update();
    }

    setStiffness(stiffness) {
        this.stiffness = stiffness;
        this.data.stiffness = stiffness;
    }

    setDamping(damping) {
        this.damping = damping;
        this.data.damping = damping;
    }

    setSpringCoils(coils) {
        this.springCoils = coils;
        this.data.springCoils = coils;
        this._createSpringMesh();
        this.update();
    }

    setSpringRadius(radius) {
        this.data.springRadius = radius;
        this._createSpringMesh();
        this.update();
    }

    setTensionColors(minColor, maxColor) {
        this.data.tensionColorMin = minColor;
        this.data.tensionColorMax = maxColor;
        this.update();
    }

    setPhysicsEnabled(enabled) {
        this.data.enablePhysics = enabled;
        
        if (!enabled) {
            this.springForce = null;
            this.tension = 0;
        }
    }

    // Apply spring force to connected nodes
    applyForceToNodes() {
        if (!this.springForce || !this.data.enablePhysics) return;
        
        const force = this.springForce.clone();
        const dampingForce = force.clone().multiplyScalar(this.damping - 1);
        
        // Apply force to source node (towards target)
        if (this.source.velocity) {
            this.source.velocity.add(force.clone().divideScalar(this.source.mass || 1));
            this.source.velocity.add(dampingForce.clone().divideScalar(this.source.mass || 1));
        }
        
        // Apply opposite force to target node (towards source)
        if (this.target.velocity) {
            this.target.velocity.sub(force.clone().divideScalar(this.target.mass || 1));
            this.target.velocity.sub(dampingForce.clone().divideScalar(this.target.mass || 1));
        }
    }

    // Animate spring oscillation
    animateOscillation(amplitude = 20, frequency = 2) {
        if (!this.source || !this.target) return;
        
        const time = performance.now() * 0.001;
        const oscillation = Math.sin(time * frequency) * amplitude;
        
        // Apply oscillation perpendicular to spring direction
        const springDirection = new THREE.Vector3()
            .subVectors(this.target.position, this.source.position)
            .normalize();
        
        const perpendicular = new THREE.Vector3();
        if (Math.abs(springDirection.y) < 0.9) {
            perpendicular.crossVectors(springDirection, new THREE.Vector3(0, 1, 0));
        } else {
            perpendicular.crossVectors(springDirection, new THREE.Vector3(1, 0, 0));
        }
        
        const oscillationVector = perpendicular.multiplyScalar(oscillation);
        
        // Apply to spring mesh position
        if (this.springMesh) {
            const center = new THREE.Vector3()
                .addVectors(this.source.position, this.target.position)
                .multiplyScalar(0.5);
            
            this.springMesh.position.copy(center.add(oscillationVector));
        }
    }

    _disposeSpringMesh() {
        if (this.springMesh) {
            this.springMesh.geometry?.dispose();
            this.springMesh.material?.dispose();
            this.springMesh.parent?.remove(this.springMesh);
            this.springMesh = null;
        }
    }

    dispose() {
        this._disposeSpringMesh();
        super.dispose();
    }

    // Method to add spring mesh to scene
    addToScene(scene) {
        if (this.springMesh) {
            scene.add(this.springMesh);
        }
    }

    // Method to remove spring mesh from scene
    removeFromScene(scene) {
        if (this.springMesh) {
            scene.remove(this.springMesh);
        }
    }
}