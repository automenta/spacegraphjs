import * as THREE from 'three';

export class ForceLayout {
    space = null;
    nodes = [];
    edges = [];
    velocities = new Map(); // Map<nodeId, THREE.Vector3>
    fixedNodes = new Set(); // Set<Node>
    isRunning = false;
    animationFrameId = null;
    totalEnergy = Infinity;
    lastKickTime = 0;
    autoStopTimeout = null;

    settings = {
        repulsion: 3000, // Base repulsion strength
        centerStrength: 0.0005, // Gravity towards center
        damping: 0.92, // Velocity damping (0-1)
        minEnergyThreshold: 0.1, // Threshold to auto-stop
        gravityCenter: new THREE.Vector3(0, 0, 0),
        zSpreadFactor: 0.15, // Reduces Z-axis forces
        autoStopDelay: 4000, // ms of low energy before stopping
        nodePadding: 1.2, // Multiplier for node radius in repulsion
        // Default constraint params (can be overridden by edge.data.constraintParams)
        defaultElasticStiffness: 0.001,
        defaultElasticIdealLength: 200,
        defaultRigidStiffness: 0.1,
        defaultWeldStiffness: 0.5,
    };

    constructor(space, config = {}) {
        if (!space) throw new Error('ForceLayout requires a SpaceGraph instance.');
        this.space = space;
        this.settings = { ...this.settings, ...config };
    }

    addNode(node) {
        if (!this.nodes.some((n) => n.id === node.id)) {
            this.nodes.push(node);
            this.velocities.set(node.id, new THREE.Vector3());
            this.kick();
        }
    }

    removeNode(node) {
        this.nodes = this.nodes.filter((n) => n !== node);
        this.velocities.delete(node.id);
        this.fixedNodes.delete(node);
        if (this.nodes.length < 2) this.stop();
        else this.kick();
    }

    addEdge(edge) {
        if (!this.edges.includes(edge)) {
            this.edges.push(edge);
            this.kick();
        }
    }

    removeEdge(edge) {
        this.edges = this.edges.filter((e) => e !== edge);
        this.kick();
    }

    fixNode(node) {
        if (this.nodes.includes(node)) {
            this.fixedNodes.add(node);
            this.velocities.get(node.id)?.set(0, 0, 0);
        }
    }

    releaseNode(node) {
        this.fixedNodes.delete(node); /* Kick happens on drag/resize end */
    }

    runOnce(steps = 100) {
        console.log(`ForceLayout: Running ${steps} initial steps...`);
        let i = 0;
        for (; i < steps; i++) {
            if (this._calculateStep() < this.settings.minEnergyThreshold) break;
        }
        console.log(`ForceLayout: Initial steps completed after ${i} iterations.`);
        this.space.updateNodesAndEdges(); // Update visuals once after settling
    }

    start() {
        if (this.isRunning || this.nodes.length < 2) return;
        console.log('ForceLayout: Starting simulation.');
        this.isRunning = true;
        this.lastKickTime = Date.now();
        this.space.emit('layout:started'); // Emit event
        const loop = () => {
            if (!this.isRunning) return;
            this.totalEnergy = this._calculateStep();
            // Visual updates happen in SpaceGraph.animate loop
            const timeSinceKick = Date.now() - this.lastKickTime;
            if (this.totalEnergy < this.settings.minEnergyThreshold && timeSinceKick > this.settings.autoStopDelay) {
                this.stop();
            } else {
                this.animationFrameId = requestAnimationFrame(loop);
            }
        };
        this.animationFrameId = requestAnimationFrame(loop);
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        clearTimeout(this.autoStopTimeout);
        this.animationFrameId = null;
        this.autoStopTimeout = null;
        console.log('ForceLayout: Simulation stopped. Energy:', this.totalEnergy.toFixed(4));
        this.space.emit('layout:stopped'); // Emit event
    }

    kick(intensity = 1) {
        if (this.nodes.length < 1) return;
        this.lastKickTime = Date.now();
        this.totalEnergy = Infinity;
        const impulse = new THREE.Vector3();
        this.nodes.forEach((node) => {
            if (!this.fixedNodes.has(node)) {
                impulse
                    .set(Math.random() - 0.5, Math.random() - 0.5, (Math.random() - 0.5) * this.settings.zSpreadFactor)
                    .normalize()
                    .multiplyScalar(intensity * (0.5 + Math.random())); // Slightly randomized intensity
                this.velocities.get(node.id)?.add(impulse);
            }
        });
        if (!this.isRunning) this.start();
        // Reset auto-stop timer
        clearTimeout(this.autoStopTimeout);
        this.autoStopTimeout = setTimeout(() => {
            if (this.isRunning && this.totalEnergy < this.settings.minEnergyThreshold) this.stop();
        }, this.settings.autoStopDelay);
    }

    setSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('ForceLayout settings updated:', this.settings);
        this.kick();
    }

    _calculateStep() {
        if (this.nodes.length < 2) return 0;
        let currentTotalEnergy = 0;
        const forces = new Map(this.nodes.map((node) => [node.id, new THREE.Vector3()]));
        const { repulsion, centerStrength, gravityCenter, zSpreadFactor, damping, nodePadding } = this.settings;
        const tempDelta = new THREE.Vector3(); // Reusable vector

        // 1. Repulsion Force (Node-Node)
        for (let i = 0; i < this.nodes.length; i++) {
            const nodeA = this.nodes[i];
            for (let j = i + 1; j < this.nodes.length; j++) {
                const nodeB = this.nodes[j];
                tempDelta.subVectors(nodeB.position, nodeA.position);
                let distSq = tempDelta.lengthSq();
                if (distSq < 1e-3) {
                    // Avoid singularity
                    distSq = 1e-3;
                    tempDelta.randomDirection().multiplyScalar(0.1); // Apply tiny random push
                }
                const distance = Math.sqrt(distSq);
                // Use node's bounding sphere for consistent padding calculation
                const radiusA = nodeA.getBoundingSphereRadius();
                const radiusB = nodeB.getBoundingSphereRadius();
                const combinedRadius = (radiusA + radiusB) * nodePadding;
                // Repulsion = base inverse square + extra force if overlapping
                let forceMag = -repulsion / distSq;
                const overlap = combinedRadius - distance;
                if (overlap > 0) {
                    // Stronger pushback when overlapping, proportional to overlap squared
                    forceMag -= (repulsion * overlap ** 2 * 0.01) / distance; // Tunable factor
                }

                const forceVec = tempDelta.normalize().multiplyScalar(forceMag);
                forceVec.z *= zSpreadFactor; // Reduce Z component
                if (!this.fixedNodes.has(nodeA)) forces.get(nodeA.id)?.add(forceVec);
                if (!this.fixedNodes.has(nodeB)) forces.get(nodeB.id)?.sub(forceVec); // Equal and opposite
            }
        }

        // 2. Edge Constraints
        this.edges.forEach((edge) => {
            const { source, target, data } = edge;
            if (!source || !target || !this.velocities.has(source.id) || !this.velocities.has(target.id)) return; // Skip if nodes removed
            tempDelta.subVectors(target.position, source.position);
            const distance = tempDelta.length() + 1e-6; // Add epsilon
            let forceMag = 0;
            const params = data.constraintParams ?? {};

            switch (data.constraintType) {
                case 'rigid': {
                    const targetDist = params.distance ?? this.settings.defaultElasticIdealLength; // Fallback to elastic length if no distance set
                    const rStiffness = params.stiffness ?? this.settings.defaultRigidStiffness;
                    forceMag = rStiffness * (distance - targetDist);
                    break;
                }
                case 'weld': {
                    // Target distance is sum of radii, strong stiffness
                    const weldDist =
                        params.distance ?? source.getBoundingSphereRadius() + target.getBoundingSphereRadius();
                    const wStiffness = params.stiffness ?? this.settings.defaultWeldStiffness;
                    forceMag = wStiffness * (distance - weldDist);
                    break;
                }
                case 'elastic':
                default: {
                    const idealLen = params.idealLength ?? this.settings.defaultElasticIdealLength;
                    const eStiffness = params.stiffness ?? this.settings.defaultElasticStiffness;
                    forceMag = eStiffness * (distance - idealLen); // Hooke's Law
                    break;
                }
            }

            const forceVec = tempDelta.normalize().multiplyScalar(forceMag);
            forceVec.z *= zSpreadFactor; // Reduce Z component
            if (!this.fixedNodes.has(source)) forces.get(source.id)?.add(forceVec);
            if (!this.fixedNodes.has(target)) forces.get(target.id)?.sub(forceVec);
        });

        // 3. Center Gravity Force
        if (centerStrength > 0) {
            this.nodes.forEach((node) => {
                if (this.fixedNodes.has(node)) return;
                const forceVec = tempDelta.subVectors(gravityCenter, node.position).multiplyScalar(centerStrength);
                forceVec.z *= zSpreadFactor * 0.5; // Weaker Z gravity
                forces.get(node.id)?.add(forceVec);
            });
        }

        // 4. Apply Forces and Update Velocities/Positions
        this.nodes.forEach((node) => {
            if (this.fixedNodes.has(node)) return;
            const force = forces.get(node.id);
            const velocity = this.velocities.get(node.id);
            if (!force || !velocity) return; // Should not happen

            const mass = node.mass || 1.0; // Use node's mass
            // a = F / m
            const acceleration = tempDelta.copy(force).divideScalar(mass); // Reuse tempDelta
            // v = (v + a) * damping
            velocity.add(acceleration).multiplyScalar(damping);

            // Limit velocity to prevent nodes escaping to infinity
            const speed = velocity.length();
            const maxSpeed = 100; // Tunable max speed per step
            if (speed > maxSpeed) {
                velocity.multiplyScalar(maxSpeed / speed);
            }

            // p = p + v
            node.position.add(velocity);

            // Accumulate kinetic energy (using mass)
            currentTotalEnergy += 0.5 * mass * velocity.lengthSq();
        });

        return currentTotalEnergy;
    }

    dispose() {
        this.stop();
        this.nodes = [];
        this.edges = [];
        this.velocities.clear();
        this.fixedNodes.clear();
        this.space = null;
        console.log('ForceLayout disposed.');
    }
}
