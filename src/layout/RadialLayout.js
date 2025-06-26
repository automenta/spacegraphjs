import * as THREE from 'three';

export class RadialLayout {
    static layoutName = 'radial';
    space = null;
    pluginManager = null;
    settings = {
        centerNodeId: null, // ID of the node to be the center, or null for geometric center
        radiusIncrement: 150, // Distance between concentric circles
        angularSeparationMin: Math.PI / 12, // Minimum angular separation for nodes on the same circle
        maxNodesPerCircle: null, // Optional: max nodes before starting a new ring, even if space
        plane: 'xy', // 'xy', 'xz', 'yz'
        startRadius: 0, // Radius of the first circle (if centerNodeId is null or center is geometric)
    };

    constructor(config = {}) {
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
        if (config) this.updateConfig(config);
        if (!nodes || nodes.length === 0) return;

        const { centerNodeId, radiusIncrement, plane, startRadius } = this.settings;
        const centerPos = new THREE.Vector3(0, 0, 0);

        let rootNode = null;
        if (centerNodeId) {
            rootNode = nodes.find(n => n.id === centerNodeId);
            if (rootNode) {
                if (!rootNode.isPinned) rootNode.position.copy(centerPos);
            } else {
                console.warn(`RadialLayout: Center node with ID "${centerNodeId}" not found.`);
            }
        }

        // For this stub, we'll do a simple circular arrangement of remaining nodes around the root/center.
        // A true radial layout involves BFS/DFS to determine levels.
        const nodesToArrange = rootNode ? nodes.filter(n => n.id !== rootNode.id && !n.isPinned) : nodes.filter(n => !n.isPinned);
        const numNodesToArrange = nodesToArrange.length;

        if (numNodesToArrange === 0) return;

        const currentRadius = (rootNode ? radiusIncrement : startRadius) + (numNodesToArrange > 0 ? radiusIncrement : 0);
        const angleStep = (2 * Math.PI) / numNodesToArrange;

        nodesToArrange.forEach((node, index) => {
            const angle = index * angleStep;
            const x = centerPos.x + currentRadius * Math.cos(angle);
            const y = centerPos.y + currentRadius * Math.sin(angle);
            const z = centerPos.z;

            if (plane === 'xy') node.position.set(x, y, z);
            else if (plane === 'xz') node.position.set(x, z, y); // y is depth
            else if (plane === 'yz') node.position.set(z, x, y); // x is depth
        });
    }

    run() { /* Not typically a continuous layout */ }
    stop() { /* Nothing to stop */ }
    update() { /* No per-frame updates needed usually */ }

    addNode(node) { /* Could re-trigger init */ }
    removeNode(node) { /* Could re-trigger init */ }
    addEdge(edge) {}
    removeEdge(edge) {}
    kick() {}

    dispose() {
        this.space = null;
        this.pluginManager = null;
    }
}
