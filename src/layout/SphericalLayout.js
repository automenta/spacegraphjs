/**
 * @file SphericalLayout.js - Arranges nodes on the surface of a sphere.
 * @licence MIT
 */
import * as THREE from 'three';

export class SphericalLayout {
    space = null;
    pluginManager = null;
    settings = {
        radius: 500, // Radius of the sphere
        animate: true, // Whether to animate to new positions (handled by LayoutManager)
        animationDuration: 0.7, // Duration for animation (handled by LayoutManager)
    };

    constructor(space, config = {}) {
        this.space = space; // SpaceGraph instance, though not directly used for calculations here
        this.settings = { ...this.settings, ...config };
    }

    // Called by LayoutManager to provide context if needed
    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    /**
     * Initializes and applies the layout.
     * Node positions will be updated directly. LayoutManager handles animation.
     * @param {Array<import('../graph/nodes/BaseNode.js').BaseNode>} nodes
     * @param {Array<import('../graph/Edge.js').Edge>} edges (Not directly used by this layout)
     * @param {object} [config={}] Optional configuration.
     */
    async init(nodes, edges, config = {}) {
        if (config) this.updateConfig(config);

        if (!nodes || nodes.length === 0) return;

        const count = nodes.length;
        const radius = this.settings.radius;

        // Golden Spiral algorithm (Fibonacci Sphere) for distributing points evenly on a sphere
        // https://stackoverflow.com/questions/9600801/evenly-distributing-n-points-on-a-sphere
        const phi = Math.PI * (Math.sqrt(5.) - 1.); // Golden angle in radians

        nodes.forEach((node, i) => {
            if (node.isPinned) return; // Skip pinned nodes

            const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
            const sphereRadiusAtY = Math.sqrt(1 - y * y); // radius at y

            const theta = phi * i; // Golden angle increment

            const x = Math.cos(theta) * sphereRadiusAtY;
            const z = Math.sin(theta) * sphereRadiusAtY;

            // Set the node's target position directly
            // LayoutManager will handle animation from current to this target.
            node.position.set(
                x * radius,
                y * radius,
                z * radius
            );
        });
    }

    /**
     * Updates the layout configuration.
     * @param {object} config New configuration settings.
     */
    updateConfig(config) {
        this.settings = { ...this.settings, ...config };
    }

    // For static layouts like this, run, stop, kick, addNode, removeNode, addEdge, removeEdge
    // might not do much after initial `init` calculation.
    // LayoutManager handles animation to new positions set in `init`.

    run() { /* Static layout, positions set in init */ }
    stop() { /* No ongoing simulation to stop */ }
    kick() { /* No simulation to re-energize, layout is recalculated on applyLayout */ }

    addNode(node) { /* Could re-calculate, but typically full applyLayout is better for static */ }
    removeNode(node) { /* Could re-calculate, but typically full applyLayout is better for static */ }
    addEdge(edge) { /* Edges don't affect this layout */ }
    removeEdge(edge) { /* Edges don't affect this layout */ }

    dispose() {
        this.space = null;
        this.pluginManager = null;
    }
}
