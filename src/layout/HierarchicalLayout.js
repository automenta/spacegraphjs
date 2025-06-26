export class HierarchicalLayout {
    space = null;
    pluginManager = null;
    settings = {
        levelSeparation: 150,
        nodeSeparation: 100,
        orientation: 'top-down',
        animate: true,
        animationDuration: 0.7,
    };
    nodeMap = new Map();

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

        this.nodeMap.clear();
        nodes.forEach((node) => {
            this.nodeMap.set(node.id, {
                node, id: node.id, children: [], parent: null, level: -1, x: 0, y: 0,
                width: node.getBoundingSphereRadius?.() * 2 || 100,
                prelim: 0, modifier: 0,
            });
        });

        edges.forEach((edge) => {
            const sourceWrapper = this.nodeMap.get(edge.source.id);
            const targetWrapper = this.nodeMap.get(edge.target.id);
            if (sourceWrapper && targetWrapper) {
                sourceWrapper.children.push(targetWrapper);
                targetWrapper.parent = sourceWrapper;
            }
        });

        const roots = nodes.filter((n) => !this.nodeMap.get(n.id).parent && !n.isPinned);
        if (roots.length === 0 && nodes.length > 0) {
            const firstUnpinned = nodes.find(n => !n.isPinned);
            if (firstUnpinned) roots.push(firstUnpinned);
        }

        let currentX = 0;
        roots.forEach((root) => {
            this._firstPass(this.nodeMap.get(root.id), 0);
            this._secondPass(this.nodeMap.get(root.id), currentX, 0);
            const treeWidth = this._calculateTreeWidth(this.nodeMap.get(root.id));
            currentX += treeWidth + this.settings.nodeSeparation * 2;
        });

        this.nodeMap.forEach((wrapper) => {
            if (!wrapper.node.isPinned) wrapper.node.position.set(wrapper.x, wrapper.y, 0);
        });
    }

    _firstPass(nodeWrapper, level) {
        nodeWrapper.level = level;
        nodeWrapper.y = -level * this.settings.levelSeparation;

        if (nodeWrapper.children.length === 0) {
            nodeWrapper.prelim = 0;
            return;
        }

        let defaultAncestor = nodeWrapper.children[0];
        nodeWrapper.children.forEach((childWrapper) => {
            this._firstPass(childWrapper, level + 1);
            defaultAncestor = this._apportion(childWrapper, defaultAncestor);
        });

        const firstChild = nodeWrapper.children[0];
        const lastChild = nodeWrapper.children[nodeWrapper.children.length - 1];
        nodeWrapper.prelim = (firstChild.prelim + lastChild.prelim) / 2;
    }

    _apportion(nodeWrapper, defaultAncestor) {
        return defaultAncestor;
    }

    _secondPass(nodeWrapper, currentXOffset, modSum) {
        nodeWrapper.x = currentXOffset + nodeWrapper.prelim * this.settings.nodeSeparation;

        let childX = currentXOffset - ((nodeWrapper.children.length - 1) * this.settings.nodeSeparation) / 2;
        if (nodeWrapper.children.length === 1 && nodeWrapper.children[0].children.length === 0) {
            childX = nodeWrapper.x;
        }

        nodeWrapper.children.forEach((childWrapper, i) => {
            this._secondPass(childWrapper, childX + i * this.settings.nodeSeparation, 0);
        });
    }

    _calculateTreeWidth(nodeWrapper) {
        if (!nodeWrapper || nodeWrapper.children.length === 0) return nodeWrapper?.width || this.settings.nodeSeparation;
        let width = 0;
        nodeWrapper.children.forEach((child) => {
            width += this._calculateTreeWidth(child) + this.settings.nodeSeparation;
        });
        return Math.max(width, nodeWrapper.width);
    }

    updateConfig(newConfig) {
        this.settings = { ...this.settings, ...newConfig };
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
        this.nodeMap.clear();
    }
}
