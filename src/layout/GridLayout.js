// src/layout/GridLayout.js

export class GridLayout {
    space = null;
    pluginManager = null;
    nodes = [];
    settings = {
        columns: 0, // 0 means calculate dynamically for a square-ish grid
        padding: { x: 150, y: 150, z: 150 }, // Spacing between nodes
        plane: 'xy', // 'xy', 'xz', 'yz' for 2D grids. Use 'xyz' for 3D.
        depthCount: 0, // Number of layers deep for 3D grid (if plane is 'xyz')
        centerOrigin: true, // Center the grid around (0,0,0)
        animate: true, // Whether LayoutManager should animate to these positions
    };

    constructor(space, config = {}) {
        // space and pluginManager will be set by LayoutManager via setContext
        this.settings = { ...this.settings, ...config };
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    updateConfig(newConfig) {
        this.settings = { ...this.settings, ...newConfig };
    }

    // init is called by LayoutManager when switching to this layout
    // It should calculate and set the final positions on the node objects.
    // LayoutManager will then handle animation using GSAP.
    init(nodes, edges, config = {}) {
        // edges are passed but not used by basic grid
        if (config) {
            this.updateConfig(config);
        }
        this.nodes = [...nodes]; // Operate on a copy or the direct list

        if (this.nodes.length === 0) return;

        const numNodes = this.nodes.length;
        let { columns, padding, plane, depthCount, centerOrigin } = this.settings;

        if (typeof padding === 'number') {
            padding = { x: padding, y: padding, z: padding };
        }

        let cols = columns;
        if (plane === 'xyz' && depthCount > 0) {
            // 3D Grid
            if (cols <= 0) {
                // Calculate cols and rows for each layer to be roughly square
                const nodesPerLayer = Math.ceil(numNodes / depthCount);
                cols = Math.ceil(Math.sqrt(nodesPerLayer));
            }
            const rows = Math.ceil(numNodes / (cols * depthCount));

            let nodeIndex = 0;
            for (let d = 0; d < depthCount; d++) {
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        if (nodeIndex >= numNodes) break;
                        const node = this.nodes[nodeIndex++];
                        node.position.set(c * padding.x, r * padding.y, d * padding.z);
                    }
                    if (nodeIndex >= numNodes) break;
                }
                if (nodeIndex >= numNodes) break;
            }

            if (centerOrigin) {
                const gridWidth = (cols - 1) * padding.x;
                const gridHeight = (rows - 1) * padding.y;
                const gridDepth = (depthCount - 1) * padding.z;
                this.nodes.forEach((node) => {
                    node.position.x -= gridWidth / 2;
                    node.position.y -= gridHeight / 2;
                    node.position.z -= gridDepth / 2;
                });
            }
        } else {
            // 2D Grid on a specified plane
            if (cols <= 0) {
                cols = Math.ceil(Math.sqrt(numNodes));
            }
            const rows = Math.ceil(numNodes / cols);

            let nodeIndex = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (nodeIndex >= numNodes) break;
                    const node = this.nodes[nodeIndex++];

                    if (plane === 'xy') {
                        node.position.set(c * padding.x, r * padding.y, 0);
                    } else if (plane === 'xz') {
                        node.position.set(c * padding.x, 0, r * padding.z);
                    } else {
                        // 'yz'
                        node.position.set(0, r * padding.y, c * padding.z);
                    }
                }
                if (nodeIndex >= numNodes) break;
            }

            if (centerOrigin) {
                let gridWidth = (cols - 1) * (plane === 'yz' ? padding.z : padding.x);
                let gridHeight = (rows - 1) * (plane === 'xz' ? padding.z : padding.y);

                this.nodes.forEach((node) => {
                    if (plane === 'xy') {
                        node.position.x -= gridWidth / 2;
                        node.position.y -= gridHeight / 2;
                    } else if (plane === 'xz') {
                        node.position.x -= gridWidth / 2;
                        node.position.z -= gridHeight / 2; // gridHeight here corresponds to Z extent
                    } else {
                        // 'yz'
                        node.position.y -= gridHeight / 2;
                        node.position.z -= gridWidth / 2; // gridWidth here corresponds to Z extent
                    }
                });
            }
        }
        // The LayoutManager will take these node.position values and animate to them.
    }

    run() {
        // Static layout, all work done in init() typically.
        // console.log('GridLayout: Run called (static, no continuous updates).');
    }

    stop() {
        // No simulation to stop for a static layout.
        // console.log('GridLayout: Stop called.');
    }

    // Optional methods for dynamic updates if the layout supports it
    addNode(node) {
        // For a static grid, adding a node might mean re-calculating the whole layout.
        // Or, for simplicity, it could be ignored until a full re-layout is triggered.
        // console.log('GridLayout: addNode called. Re-layout might be needed.');
        // this.nodes.push(node); // Add to internal list if used by a live update
        // this.init(this.nodes, []); // Re-run layout, though this might be disruptive if not animated
    }

    removeNode(node) {
        // Similar to addNode for static layouts.
        // console.log('GridLayout: removeNode called. Re-layout might be needed.');
        // this.nodes = this.nodes.filter(n => n.id !== node.id);
        // this.init(this.nodes, []);
    }

    // Edges are generally not used by simple grid layouts for positioning.
    addEdge(edge) {}
    removeEdge(edge) {}

    dispose() {
        this.nodes = [];
        this.space = null;
        this.pluginManager = null;
    }
}
