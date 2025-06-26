import * as THREE from 'three';

export class RadialLayout {
    static layoutName = 'radial';
    space = null;
    pluginManager = null;
    settings = {
        centerNodeId: null, // ID of the node to be the center, or null for geometric center
        radiusIncrement: 150, // Distance between concentric circles
        angularSeparationMin: Math.PI / 12, // Minimum angular separation for nodes on the same circle
        plane: 'xy', // 'xy', 'xz', 'yz'
        startRadius: 100, // Radius of the first circle (if centerNodeId is null or center is geometric)
        levelSpacingFactor: 1.0, // Multiplier for radiusIncrement based on level
        animate: true,
        animationDuration: 0.7,
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

        const { centerNodeId, radiusIncrement, plane, startRadius, levelSpacingFactor } = this.settings;
        const centerPos = new THREE.Vector3(0, 0, 0);

        let rootNode = null;
        let nodesToArrange = nodes.filter(n => !n.isPinned);

        if (centerNodeId) {
            rootNode = nodes.find(n => n.id === centerNodeId);
            if (rootNode) {
                rootNode.position.copy(centerPos);
                nodesToArrange = nodesToArrange.filter(n => n.id !== rootNode.id);
            } else {
                console.warn(`RadialLayout: Center node with ID "${centerNodeId}" not found. Using geometric center.`);
            }
        }

        if (nodesToArrange.length === 0) return;

        // Determine levels using a BFS-like approach from the root, or simple index-based levels
        const nodeLevels = new Map(); // Map: nodeId -> level
        const adjacencyList = new Map(); // Map: nodeId -> Set<neighborId>

        nodes.forEach(n => {
            adjacencyList.set(n.id, new Set());
            nodeLevels.set(n.id, -1); // -1 means unvisited
        });
        edges.forEach(edge => {
            adjacencyList.get(edge.source.id)?.add(edge.target.id);
            adjacencyList.get(edge.target.id)?.add(edge.source.id); // Treat as undirected for levels
        });

        const queue = [];
        if (rootNode) {
            queue.push(rootNode.id);
            nodeLevels.set(rootNode.id, 0);
        } else {
            // If no specific root, pick the first unpinned node as a pseudo-root for level calculation
            const firstUnpinned = nodesToArrange[0];
            if (firstUnpinned) {
                queue.push(firstUnpinned.id);
                nodeLevels.set(firstUnpinned.id, 0);
            }
        }

        let head = 0;
        while (head < queue.length) {
            const currentId = queue[head++];
            const currentLevel = nodeLevels.get(currentId);
            adjacencyList.get(currentId)?.forEach(neighborId => {
                if (nodeLevels.get(neighborId) === -1) {
                    nodeLevels.set(neighborId, currentLevel + 1);
                    queue.push(neighborId);
                }
            });
        }

        // Group nodes by level
        const levels = new Map(); // Map: level -> Array<node>
        nodesToArrange.forEach(node => {
            const level = nodeLevels.get(node.id) || 0; // Default to level 0 if not reached by BFS
            if (!levels.has(level)) levels.set(level, []);
            levels.get(level).push(node);
        });

        // Sort levels to ensure correct order
        const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b);

        sortedLevels.forEach(level => {
            const nodesInLevel = levels.get(level);
            if (nodesInLevel.length === 0) return;

            const currentRadius = startRadius + (level * radiusIncrement * levelSpacingFactor);
            const angleStep = (2 * Math.PI) / nodesInLevel.length;

            nodesInLevel.forEach((node, index) => {
                const angle = index * angleStep;
                let x, y, z;

                if (plane === 'xy') {
                    x = centerPos.x + currentRadius * Math.cos(angle);
                    y = centerPos.y + currentRadius * Math.sin(angle);
                    z = centerPos.z;
                } else if (plane === 'xz') {
                    x = centerPos.x + currentRadius * Math.cos(angle);
                    y = centerPos.y; // Y is fixed for XZ plane
                    z = centerPos.z + currentRadius * Math.sin(angle);
                } else { // yz
                    x = centerPos.x; // X is fixed for YZ plane
                    y = centerPos.y + currentRadius * Math.cos(angle);
                    z = centerPos.z + currentRadius * Math.sin(angle);
                }
                node.position.set(x, y, z);
            });
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
