// src/layout/CircularLayout.js
import * as THREE from 'three'; // For Vector3 math if needed, though positions are set directly

export class CircularLayout {
    space = null;
    pluginManager = null;
    nodes = [];
    settings = {
        radius: 200, // Default radius
        plane: 'xy', // 'xy', 'xz', 'yz'
        startAngle: 0, // In radians
        angularSpacing: 0, // If > 0, overrides automatic even spacing. In radians.
        center: { x: 0, y: 0, z: 0 },
        animate: true,
    };

    constructor(space, config = {}) {
        // space and pluginManager are set by LayoutManager via setContext
        this.settings = { ...this.settings, ...config };
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    updateConfig(newConfig) {
        this.settings = { ...this.settings, ...newConfig };
    }

    init(nodes, edges, config = {}) {
        if (config) {
            this.updateConfig(config);
        }
        this.nodes = [...nodes];

        if (this.nodes.length === 0) return;

        const numNodes = this.nodes.length;
        const { radius, plane, startAngle, center } = this.settings;
        let angularSpacing = this.settings.angularSpacing;

        if (numNodes === 0) return;

        if (angularSpacing <= 0) {
            angularSpacing = (2 * Math.PI) / numNodes;
        }

        let dynamicRadius = radius;
        if (radius <= 0) {
            // Auto-calculate radius based on node sizes and count
            let totalCircumference = 0;
            this.nodes.forEach((node) => {
                // Approximate node size for circumference calculation
                const nodeRadius = node.getBoundingSphereRadius ? node.getBoundingSphereRadius() : 25;
                totalCircumference += nodeRadius * 2 * 1.5; // Diameter + 50% padding
            });
            dynamicRadius = Math.max(100, totalCircumference / (2 * Math.PI));
        }

        this.nodes.forEach((node, index) => {
            const angle = startAngle + index * angularSpacing;
            let x = center.x + dynamicRadius * Math.cos(angle);
            let y = center.y + dynamicRadius * Math.sin(angle);
            let z = center.z;

            if (plane === 'xy') {
                node.position.set(x, y, center.z);
            } else if (plane === 'xz') {
                node.position.set(x, center.y, y); // y from calculation becomes z
            } else {
                // 'yz'
                node.position.set(center.x, x, y); // x from calculation becomes y, y becomes z
            }
        });
    }

    run() {}
    stop() {}
    addNode(node) {}
    removeNode(node) {}
    addEdge(edge) {}
    removeEdge(edge) {}

    dispose() {
        this.nodes = [];
        this.space = null;
        this.pluginManager = null;
    }
}
