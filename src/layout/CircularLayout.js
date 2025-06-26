export class CircularLayout {
    space = null;
    pluginManager = null;
    nodes = [];
    settings = {
        radius: 200,
        plane: 'xy',
        startAngle: 0,
        angularSpacing: 0,
        center: { x: 0, y: 0, z: 0 },
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
        const { radius, plane, startAngle, center } = this.settings;
        const angularSpacing = this.settings.angularSpacing <= 0 ? (2 * Math.PI) / numNodes : this.settings.angularSpacing;

        let dynamicRadius = radius;
        if (radius <= 0) {
            let totalCircumference = 0;
            this.nodes.forEach((node) => {
                const nodeRadius = node.getBoundingSphereRadius?.() || 25;
                totalCircumference += nodeRadius * 2 * 1.5;
            });
            dynamicRadius = Math.max(100, totalCircumference / (2 * Math.PI));
        }

        this.nodes.forEach((node, index) => {
            const angle = startAngle + index * angularSpacing;
            const x = center.x + dynamicRadius * Math.cos(angle);
            const y = center.y + dynamicRadius * Math.sin(angle);

            if (plane === 'xy') node.position.set(x, y, center.z);
            else if (plane === 'xz') node.position.set(x, center.y, y);
            else node.position.set(center.x, x, y);
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
