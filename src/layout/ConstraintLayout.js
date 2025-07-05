import * as THREE from 'three';

export class ConstraintLayout {
    space = null;
    pluginManager = null;
    settings = {
        iterations: 100,
        convergenceThreshold: 0.1,
        dampingFactor: 0.8,
        maxForce: 1000,
        enableCollisionAvoidance: true,
        collisionPadding: 50,
        animate: true,
        animationDuration: 0.8,
    };

    nodeMap = new Map();
    constraints = [];
    isRunning = false;

    constructor(config = {}) {
        this.settings = { ...this.settings, ...config };
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    async init(nodes, edges, config = {}) {
        if (config) this.updateConfig(config);
        if (!nodes || nodes.length === 0) return;

        this.nodeMap.clear();
        this.constraints = [];

        nodes.forEach(node => {
            this.nodeMap.set(node.id, {
                node,
                currentPos: node.position.clone(),
                targetPos: node.position.clone(),
                force: new THREE.Vector3(),
                mass: node.mass || 1.0,
                radius: node.getBoundingSphereRadius?.() * 2 || 50,
                isFixed: node.isPinned || false
            });
        });

        this._createDefaultConstraints(nodes, edges);
        await this._solveConstraints();
    }

    _createDefaultConstraints(nodes, edges) {
        edges.forEach(edge => {
            this.addDistanceConstraint(edge.source.id, edge.target.id, {
                distance: edge.data?.constraintParams?.idealLength || 200,
                strength: edge.data?.constraintParams?.stiffness || 0.5
            });
        });

        const groups = this._detectGroups(nodes);
        groups.forEach(group => {
            if (group.length > 1) {
                this.addClusterConstraint(group.map(n => n.id), {
                    centerStrength: 0.3,
                    internalSeparation: 100
                });
            }
        });
    }

    _detectGroups(nodes) {
        const groups = [];
        const visited = new Set();

        nodes.forEach(node => {
            if (!visited.has(node.id) && node.data?.group) {
                const group = nodes.filter(n => n.data?.group === node.data.group);
                group.forEach(n => visited.add(n.id));
                groups.push(group);
            }
        });

        return groups;
    }

    addDistanceConstraint(nodeId1, nodeId2, options = {}) {
        const { distance = 200, strength = 0.5, minDistance = 50, maxDistance = 500 } = options;
        
        this.constraints.push({
            type: 'distance',
            nodeIds: [nodeId1, nodeId2],
            distance,
            strength,
            minDistance,
            maxDistance,
            solve: this._solveDistanceConstraint.bind(this)
        });
    }

    addPositionConstraint(nodeId, targetPosition, options = {}) {
        const { strength = 1.0, tolerance = 10 } = options;
        
        this.constraints.push({
            type: 'position',
            nodeIds: [nodeId],
            targetPosition: targetPosition.clone(),
            strength,
            tolerance,
            solve: this._solvePositionConstraint.bind(this)
        });
    }

    addAngleConstraint(nodeId1, nodeId2, nodeId3, options = {}) {
        const { angle = Math.PI / 2, strength = 0.3 } = options;
        
        this.constraints.push({
            type: 'angle',
            nodeIds: [nodeId1, nodeId2, nodeId3],
            angle,
            strength,
            solve: this._solveAngleConstraint.bind(this)
        });
    }

    addClusterConstraint(nodeIds, options = {}) {
        const { centerStrength = 0.5, internalSeparation = 100 } = options;
        
        this.constraints.push({
            type: 'cluster',
            nodeIds,
            centerStrength,
            internalSeparation,
            solve: this._solveClusterConstraint.bind(this)
        });
    }

    addBoundaryConstraint(nodeIds, boundary, options = {}) {
        const { strength = 0.8, padding = 20 } = options;
        
        this.constraints.push({
            type: 'boundary',
            nodeIds,
            boundary,
            strength,
            padding,
            solve: this._solveBoundaryConstraint.bind(this)
        });
    }

    _solveDistanceConstraint(constraint) {
        const [nodeId1, nodeId2] = constraint.nodeIds;
        const wrapper1 = this.nodeMap.get(nodeId1);
        const wrapper2 = this.nodeMap.get(nodeId2);
        
        if (!wrapper1 || !wrapper2) return;

        const diff = wrapper2.currentPos.clone().sub(wrapper1.currentPos);
        const currentDistance = diff.length();
        
        if (currentDistance === 0) return;

        const targetDistance = Math.max(constraint.minDistance, 
            Math.min(constraint.maxDistance, constraint.distance));
        const error = currentDistance - targetDistance;
        
        const correction = diff.normalize().multiplyScalar(error * constraint.strength * 0.5);
        
        if (!wrapper1.isFixed) {
            wrapper1.force.add(correction.clone().multiplyScalar(wrapper2.mass / (wrapper1.mass + wrapper2.mass)));
        }
        if (!wrapper2.isFixed) {
            wrapper2.force.sub(correction.clone().multiplyScalar(wrapper1.mass / (wrapper1.mass + wrapper2.mass)));
        }
    }

    _solvePositionConstraint(constraint) {
        const wrapper = this.nodeMap.get(constraint.nodeIds[0]);
        if (!wrapper || wrapper.isFixed) return;

        const diff = constraint.targetPosition.clone().sub(wrapper.currentPos);
        const distance = diff.length();
        
        if (distance > constraint.tolerance) {
            wrapper.force.add(diff.multiplyScalar(constraint.strength));
        }
    }

    _solveAngleConstraint(constraint) {
        const [nodeId1, nodeId2, nodeId3] = constraint.nodeIds;
        const wrapper1 = this.nodeMap.get(nodeId1);
        const wrapper2 = this.nodeMap.get(nodeId2);
        const wrapper3 = this.nodeMap.get(nodeId3);
        
        if (!wrapper1 || !wrapper2 || !wrapper3) return;

        const v1 = wrapper1.currentPos.clone().sub(wrapper2.currentPos);
        const v2 = wrapper3.currentPos.clone().sub(wrapper2.currentPos);
        
        if (v1.length() === 0 || v2.length() === 0) return;

        const currentAngle = v1.angleTo(v2);
        const angleError = constraint.angle - currentAngle;
        
        const correction = angleError * constraint.strength * 0.1;
        const axis = v1.cross(v2).normalize();
        
        if (!wrapper1.isFixed) {
            const rotatedV1 = v1.clone().applyAxisAngle(axis, correction);
            wrapper1.force.add(rotatedV1.sub(v1).multiplyScalar(0.5));
        }
        if (!wrapper3.isFixed) {
            const rotatedV2 = v2.clone().applyAxisAngle(axis, -correction);
            wrapper3.force.add(rotatedV2.sub(v2).multiplyScalar(0.5));
        }
    }

    _solveClusterConstraint(constraint) {
        const wrappers = constraint.nodeIds.map(id => this.nodeMap.get(id)).filter(Boolean);
        if (wrappers.length < 2) return;

        const center = new THREE.Vector3();
        wrappers.forEach(wrapper => center.add(wrapper.currentPos));
        center.divideScalar(wrappers.length);

        wrappers.forEach(wrapper => {
            if (wrapper.isFixed) return;

            const toCenter = center.clone().sub(wrapper.currentPos);
            wrapper.force.add(toCenter.multiplyScalar(constraint.centerStrength));

            wrappers.forEach(other => {
                if (other === wrapper) return;
                
                const diff = wrapper.currentPos.clone().sub(other.currentPos);
                const distance = diff.length();
                
                if (distance < constraint.internalSeparation && distance > 0) {
                    const repulsion = diff.normalize().multiplyScalar(
                        (constraint.internalSeparation - distance) * 0.1
                    );
                    wrapper.force.add(repulsion);
                }
            });
        });
    }

    _solveBoundaryConstraint(constraint) {
        constraint.nodeIds.forEach(nodeId => {
            const wrapper = this.nodeMap.get(nodeId);
            if (!wrapper || wrapper.isFixed) return;

            const { boundary, strength, padding } = constraint;
            const pos = wrapper.currentPos;
            let correction = new THREE.Vector3();

            if (boundary.type === 'box') {
                const { min, max } = boundary;
                if (pos.x < min.x + padding) correction.x = (min.x + padding - pos.x) * strength;
                if (pos.x > max.x - padding) correction.x = (max.x - padding - pos.x) * strength;
                if (pos.y < min.y + padding) correction.y = (min.y + padding - pos.y) * strength;
                if (pos.y > max.y - padding) correction.y = (max.y - padding - pos.y) * strength;
                if (pos.z < min.z + padding) correction.z = (min.z + padding - pos.z) * strength;
                if (pos.z > max.z - padding) correction.z = (max.z - padding - pos.z) * strength;
            } else if (boundary.type === 'sphere') {
                const { center, radius } = boundary;
                const diff = pos.clone().sub(center);
                const distance = diff.length();
                
                if (distance > radius - padding) {
                    correction = diff.normalize().multiplyScalar((radius - padding - distance) * strength);
                }
            }

            wrapper.force.add(correction);
        });
    }

    async _solveConstraints() {
        for (let iteration = 0; iteration < this.settings.iterations; iteration++) {
            this.nodeMap.forEach(wrapper => wrapper.force.set(0, 0, 0));

            this.constraints.forEach(constraint => constraint.solve(constraint));

            if (this.settings.enableCollisionAvoidance) {
                this._resolveCollisions();
            }

            let maxForce = 0;
            this.nodeMap.forEach(wrapper => {
                if (wrapper.isFixed) return;

                const force = wrapper.force.clone().multiplyScalar(this.settings.dampingFactor);
                if (force.length() > this.settings.maxForce) {
                    force.normalize().multiplyScalar(this.settings.maxForce);
                }

                wrapper.currentPos.add(force.divideScalar(wrapper.mass));
                maxForce = Math.max(maxForce, force.length());
            });

            if (maxForce < this.settings.convergenceThreshold) {
                break;
            }
        }

        this.nodeMap.forEach(wrapper => {
            if (!wrapper.isFixed) {
                wrapper.node.position.copy(wrapper.currentPos);
            }
        });
    }

    _resolveCollisions() {
        const wrappers = Array.from(this.nodeMap.values());
        
        for (let i = 0; i < wrappers.length; i++) {
            for (let j = i + 1; j < wrappers.length; j++) {
                const wrapper1 = wrappers[i];
                const wrapper2 = wrappers[j];
                
                const diff = wrapper1.currentPos.clone().sub(wrapper2.currentPos);
                const distance = diff.length();
                const minDistance = wrapper1.radius + wrapper2.radius + this.settings.collisionPadding;
                
                if (distance < minDistance && distance > 0) {
                    const overlap = minDistance - distance;
                    const correction = diff.normalize().multiplyScalar(overlap * 0.5);
                    
                    if (!wrapper1.isFixed) wrapper1.force.add(correction);
                    if (!wrapper2.isFixed) wrapper2.force.sub(correction);
                }
            }
        }
    }

    addNode(node) {
        if (this.nodeMap.has(node.id)) return;
        
        this.nodeMap.set(node.id, {
            node,
            currentPos: node.position.clone(),
            targetPos: node.position.clone(),
            force: new THREE.Vector3(),
            mass: node.mass || 1.0,
            radius: node.getBoundingSphereRadius?.() * 2 || 50,
            isFixed: node.isPinned || false
        });
    }

    removeNode(node) {
        this.nodeMap.delete(node.id);
        this.constraints = this.constraints.filter(constraint => 
            !constraint.nodeIds.includes(node.id)
        );
    }

    addEdge(edge) {
        this.addDistanceConstraint(edge.source.id, edge.target.id, {
            distance: edge.data?.constraintParams?.idealLength || 200,
            strength: edge.data?.constraintParams?.stiffness || 0.5
        });
    }

    removeEdge(edge) {
        this.constraints = this.constraints.filter(constraint => 
            !(constraint.type === 'distance' && 
              constraint.nodeIds.includes(edge.source.id) && 
              constraint.nodeIds.includes(edge.target.id))
        );
    }

    updateConfig(newConfig) {
        this.settings = { ...this.settings, ...newConfig };
    }

    run() {
        if (this.isRunning) return;
        this.isRunning = true;
    }

    stop() {
        this.isRunning = false;
    }

    kick() {
        if (this.nodeMap.size > 0) {
            this._solveConstraints();
        }
    }

    dispose() {
        this.space = null;
        this.pluginManager = null;
        this.nodeMap.clear();
        this.constraints = [];
        this.isRunning = false;
    }
}