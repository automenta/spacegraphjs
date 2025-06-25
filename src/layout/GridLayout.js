export class GridLayout {
    space = null;
    pluginManager = null;
    nodes = [];
    settings = {
        columns: 0,
        padding: { x: 150, y: 150, z: 150 },
        plane: 'xy',
        depthCount: 0,
        centerOrigin: true,
        animate: true,
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
        this.nodes = [...nodes];

        if (this.nodes.length === 0) return;

        const numNodes = this.nodes.length;
        let { columns, padding, plane, depthCount, centerOrigin } = this.settings;

        padding = typeof padding === 'number' ? { x: padding, y: padding, z: padding } : padding;

        let cols = columns;
        if (plane === 'xyz' && depthCount > 0) {
            if (cols <= 0) cols = Math.ceil(Math.sqrt(numNodes / depthCount));
            const rows = Math.ceil(numNodes / (cols * depthCount));

            let nodeIndex = 0;
            for (let d = 0; d < depthCount && nodeIndex < numNodes; d++) {
                for (let r = 0; r < rows && nodeIndex < numNodes; r++) {
                    for (let c = 0; c < cols && nodeIndex < numNodes; c++) {
                        this.nodes[nodeIndex++].position.set(c * padding.x, r * padding.y, d * padding.z);
                    }
                }
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
            if (cols <= 0) cols = Math.ceil(Math.sqrt(numNodes));
            const rows = Math.ceil(numNodes / cols);

            let nodeIndex = 0;
            for (let r = 0; r < rows && nodeIndex < numNodes; r++) {
                for (let c = 0; c < cols && nodeIndex < numNodes; c++) {
                    const node = this.nodes[nodeIndex++];
                    if (plane === 'xy') node.position.set(c * padding.x, r * padding.y, 0);
                    else if (plane === 'xz') node.position.set(c * padding.x, 0, r * padding.z);
                    else node.position.set(0, r * padding.y, c * padding.z);
                }
            }

            if (centerOrigin) {
                const gridWidth = (cols - 1) * (plane === 'yz' ? padding.z : padding.x);
                const gridHeight = (rows - 1) * (plane === 'xz' ? padding.z : padding.y);

                this.nodes.forEach((node) => {
                    if (plane === 'xy') {
                        node.position.x -= gridWidth / 2;
                        node.position.y -= gridHeight / 2;
                    } else if (plane === 'xz') {
                        node.position.x -= gridWidth / 2;
                        node.position.z -= gridHeight / 2;
                    } else {
                        node.position.y -= gridHeight / 2;
                        node.position.z -= gridWidth / 2;
                    }
                });
            }
        }
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
