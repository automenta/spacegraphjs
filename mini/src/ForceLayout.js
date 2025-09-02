import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export class ForceLayout {
    constructor(nodes, edges) {
        this.nodes = nodes;
        this.edges = edges;
        this.repulsion = 10000;
        this.stiffness = 0.05;
        this.damping = 0.85;
        this.idealLength = 150;

        // Initialize velocities
        this.nodes.forEach(node => {
            node.velocity = new THREE.Vector3();
        });
    }

    update() {
        // Calculate repulsive forces
        for (let i = 0; i < this.nodes.length; i++) {
            const nodeA = this.nodes[i];
            for (let j = i + 1; j < this.nodes.length; j++) {
                const nodeB = this.nodes[j];
                const delta = new THREE.Vector3().subVectors(nodeA.object.position, nodeB.object.position);
                const distance = delta.length() + 0.1; // avoid division by zero
                const force = this.repulsion / (distance * distance);

                const direction = delta.normalize();
                nodeA.velocity.add(direction.clone().multiplyScalar(force));
                nodeB.velocity.sub(direction.clone().multiplyScalar(force));
            }
        }

        // Calculate attractive forces (springs)
        for (const edge of this.edges) {
            const delta = new THREE.Vector3().subVectors(edge.target.object.position, edge.source.object.position);
            const distance = delta.length() + 0.1;
            const displacement = distance - this.idealLength;
            const force = this.stiffness * displacement;

            const direction = delta.normalize();
            edge.source.velocity.add(direction.clone().multiplyScalar(force));
            edge.target.velocity.sub(direction.clone().multiplyScalar(force));
        }

        // Apply velocities and damping
        for (const node of this.nodes) {
            node.velocity.multiplyScalar(this.damping);
            node.object.position.add(node.velocity);
        }
    }
}
