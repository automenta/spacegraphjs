export class SphericalLayout {
    space = null;
    pluginManager = null;
    settings = {
        radius: 500,
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

    async init(nodes, edges, config = {}) {
        if (config) this.updateConfig(config);

        if (!nodes || nodes.length === 0) return;

        const count = nodes.length;
        const radius = this.settings.radius;

        const phi = Math.PI * (Math.sqrt(5) - 1);

        nodes.forEach((node, i) => {
            if (node.isPinned) return;

            const y = 1 - (i / (count - 1)) * 2;
            const sphereRadiusAtY = Math.sqrt(1 - y * y);

            const theta = phi * i;

            const x = Math.cos(theta) * sphereRadiusAtY;
            const z = Math.sin(theta) * sphereRadiusAtY;

            node.position.set(x * radius, y * radius, z * radius);
        });
    }

    updateConfig(config) {
        this.settings = { ...this.settings, ...config };
    }

    run() {}
    stop() {}
    kick() {}

    addNode(node) {}
    removeNode(node) {}
    addEdge(edge) {}
    removeEdge(edge) {}

    dispose() {
        this.space = null;
        this.pluginManager = null;
    }
}
