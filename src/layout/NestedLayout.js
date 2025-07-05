import * as THREE from 'three';

export class NestedLayout {
    space = null;
    pluginManager = null;
    settings = {
        containerPadding: 50,
        childSpacing: 25,
        autoResize: true,
        animate: true,
        animationDuration: 0.8,
        recursionDepth: 10,
        defaultChildLayout: 'grid'
    };

    rootContainers = new Map();
    layoutInstances = new Map();
    containerHierarchy = new Map();
    isRunning = false;

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

        this.rootContainers.clear();
        this.layoutInstances.clear();
        this.containerHierarchy.clear();

        this._buildHierarchy(nodes, edges);
        await this._applyNestedLayouts();
    }

    _buildHierarchy(nodes, edges) {
        const containers = nodes.filter(node => node.data?.isContainer || node.data?.childLayout);
        const childrenMap = new Map();

        containers.forEach(container => {
            childrenMap.set(container.id, []);
            this.containerHierarchy.set(container.id, {
                container,
                children: [],
                childNodes: [],
                layout: container.data?.childLayout || this.settings.defaultChildLayout,
                layoutConfig: container.data?.layoutConfig || {},
                bounds: this._calculateContainerBounds(container)
            });
        });

        edges.forEach(edge => {
            const sourceContainer = this.containerHierarchy.get(edge.source.id);
            const targetContainer = this.containerHierarchy.get(edge.target.id);

            if (sourceContainer && edge.data?.relationship === 'contains') {
                sourceContainer.childNodes.push(edge.target);
                const targetMeta = this.containerHierarchy.get(edge.target.id);
                if (targetMeta) {
                    sourceContainer.children.push(targetMeta);
                }
            }
        });

        nodes.forEach(node => {
            const containerId = node.data?.parentContainer;
            if (containerId && this.containerHierarchy.has(containerId)) {
                this.containerHierarchy.get(containerId).childNodes.push(node);
            }
        });

        this.containerHierarchy.forEach((containerData, containerId) => {
            if (!this._hasParentContainer(containerId)) {
                this.rootContainers.set(containerId, containerData);
            }
        });
    }

    _hasParentContainer(containerId) {
        for (const [, containerData] of this.containerHierarchy) {
            if (containerData.children.some(child => child.container.id === containerId)) {
                return true;
            }
        }
        return false;
    }

    _calculateContainerBounds(container) {
        const radius = container.getBoundingSphereRadius?.() || 100;
        const center = container.position.clone();
        
        return {
            min: center.clone().sub(new THREE.Vector3(radius, radius, radius)),
            max: center.clone().add(new THREE.Vector3(radius, radius, radius)),
            center: center,
            size: new THREE.Vector3(radius * 2, radius * 2, radius * 2)
        };
    }

    async _applyNestedLayouts(depth = 0) {
        if (depth > this.settings.recursionDepth) return;

        const layoutPromises = [];

        for (const [containerId, containerData] of this.containerHierarchy) {
            if (containerData.childNodes.length > 0) {
                const layoutPromise = this._applyContainerLayout(containerData, depth);
                layoutPromises.push(layoutPromise);
            }
        }

        await Promise.all(layoutPromises);

        if (this.settings.autoResize) {
            this._resizeContainers();
        }
    }

    async _applyContainerLayout(containerData, depth) {
        const { container, childNodes, layout, layoutConfig } = containerData;
        const layoutKey = `${container.id}_${layout}`;

        let layoutInstance = this.layoutInstances.get(layoutKey);
        if (!layoutInstance) {
            layoutInstance = this._createLayoutInstance(layout, layoutConfig);
            layoutInstance.setContext?.(this.space, this.pluginManager);
            this.layoutInstances.set(layoutKey, layoutInstance);
        }

        const containerBounds = this._calculateContainerBounds(container);
        const availableSpace = this._calculateAvailableSpace(containerBounds);

        const layoutNodes = childNodes.map(node => ({
            ...node,
            position: this._normalizePositionToContainer(node.position, containerBounds)
        }));

        const constrainedConfig = {
            ...layoutConfig,
            bounds: availableSpace,
            containerCenter: containerBounds.center,
            maxWidth: availableSpace.size.x,
            maxHeight: availableSpace.size.y,
            maxDepth: availableSpace.size.z,
            spacing: this.settings.childSpacing
        };

        if (layoutInstance.init) {
            await layoutInstance.init(layoutNodes, [], constrainedConfig);
        }

        layoutNodes.forEach(node => {
            const worldPosition = this._denormalizePositionFromContainer(node.position, containerBounds);
            const originalNode = childNodes.find(n => n.id === node.id);
            if (originalNode && !originalNode.isPinned) {
                originalNode.position.copy(worldPosition);
            }
        });

        containerData.appliedLayout = layoutInstance;
        containerData.bounds = this._recalculateContainerBounds(containerData);
    }

    _createLayoutInstance(layoutType, config) {
        switch (layoutType) {
            case 'grid':
                return new GridLayoutNested(config);
            case 'circular':
                return new CircularLayoutNested(config);
            case 'force':
                return new ForceLayoutNested(config);
            case 'hierarchical':
                return new HierarchicalLayoutNested(config);
            case 'flow':
                return new FlowLayoutNested(config);
            default:
                return new GridLayoutNested(config);
        }
    }

    _calculateAvailableSpace(containerBounds) {
        const padding = this.settings.containerPadding;
        return {
            min: containerBounds.min.clone().add(new THREE.Vector3(padding, padding, padding)),
            max: containerBounds.max.clone().sub(new THREE.Vector3(padding, padding, padding)),
            center: containerBounds.center.clone(),
            size: containerBounds.size.clone().sub(new THREE.Vector3(padding * 2, padding * 2, padding * 2))
        };
    }

    _normalizePositionToContainer(position, containerBounds) {
        const normalizedPos = position.clone().sub(containerBounds.center);
        normalizedPos.divide(containerBounds.size).multiplyScalar(2);
        return normalizedPos;
    }

    _denormalizePositionFromContainer(normalizedPosition, containerBounds) {
        const worldPos = normalizedPosition.clone().multiplyScalar(0.5);
        worldPos.multiply(containerBounds.size).add(containerBounds.center);
        return worldPos;
    }

    _recalculateContainerBounds(containerData) {
        const { childNodes } = containerData;
        if (childNodes.length === 0) return containerData.bounds;

        const positions = childNodes.map(node => node.position);
        const min = new THREE.Vector3(
            Math.min(...positions.map(p => p.x)),
            Math.min(...positions.map(p => p.y)),
            Math.min(...positions.map(p => p.z))
        );
        const max = new THREE.Vector3(
            Math.max(...positions.map(p => p.x)),
            Math.max(...positions.map(p => p.y)),
            Math.max(...positions.map(p => p.z))
        );

        const padding = this.settings.containerPadding;
        min.sub(new THREE.Vector3(padding, padding, padding));
        max.add(new THREE.Vector3(padding, padding, padding));

        return {
            min,
            max,
            center: min.clone().add(max).multiplyScalar(0.5),
            size: max.clone().sub(min)
        };
    }

    _resizeContainers() {
        this.containerHierarchy.forEach((containerData, containerId) => {
            const { container, bounds } = containerData;
            
            if (container.data?.autoResize !== false) {
                const scale = bounds.size.clone().multiplyScalar(0.5);
                if (container.scale) {
                    container.scale.copy(scale);
                }
                container.position.copy(bounds.center);
            }
        });
    }

    addContainer(container, parentId = null) {
        const containerData = {
            container,
            children: [],
            childNodes: [],
            layout: container.data?.childLayout || this.settings.defaultChildLayout,
            layoutConfig: container.data?.layoutConfig || {},
            bounds: this._calculateContainerBounds(container)
        };

        this.containerHierarchy.set(container.id, containerData);

        if (parentId && this.containerHierarchy.has(parentId)) {
            this.containerHierarchy.get(parentId).children.push(containerData);
        } else {
            this.rootContainers.set(container.id, containerData);
        }
    }

    removeContainer(containerId) {
        const containerData = this.containerHierarchy.get(containerId);
        if (!containerData) return;

        this.containerHierarchy.delete(containerId);
        this.rootContainers.delete(containerId);

        this.containerHierarchy.forEach((data) => {
            data.children = data.children.filter(child => child.container.id !== containerId);
        });

        this.layoutInstances.forEach((instance, key) => {
            if (key.startsWith(`${containerId}_`)) {
                instance.dispose?.();
                this.layoutInstances.delete(key);
            }
        });
    }

    addNodeToContainer(node, containerId) {
        const containerData = this.containerHierarchy.get(containerId);
        if (!containerData) return;

        if (!containerData.childNodes.some(n => n.id === node.id)) {
            containerData.childNodes.push(node);
            node.data = node.data || {};
            node.data.parentContainer = containerId;
        }
    }

    removeNodeFromContainer(node, containerId) {
        const containerData = this.containerHierarchy.get(containerId);
        if (!containerData) return;

        containerData.childNodes = containerData.childNodes.filter(n => n.id !== node.id);
        if (node.data) {
            delete node.data.parentContainer;
        }
    }

    setContainerLayout(containerId, layoutType, config = {}) {
        const containerData = this.containerHierarchy.get(containerId);
        if (!containerData) return;

        containerData.layout = layoutType;
        containerData.layoutConfig = config;

        const oldLayoutKey = `${containerId}_${containerData.layout}`;
        const layoutInstance = this.layoutInstances.get(oldLayoutKey);
        if (layoutInstance) {
            layoutInstance.dispose?.();
            this.layoutInstances.delete(oldLayoutKey);
        }
    }

    updateConfig(newConfig) {
        this.settings = { ...this.settings, ...newConfig };
    }

    run() {
        if (this.isRunning) return;
        this.isRunning = true;
        this._applyNestedLayouts();
    }

    stop() {
        this.isRunning = false;
    }

    kick() {
        if (this.containerHierarchy.size > 0) {
            this._applyNestedLayouts();
        }
    }

    addNode(node) {
        const containerId = node.data?.parentContainer;
        if (containerId) {
            this.addNodeToContainer(node, containerId);
        }
    }

    removeNode(node) {
        const containerId = node.data?.parentContainer;
        if (containerId) {
            this.removeNodeFromContainer(node, containerId);
        }
    }

    addEdge(edge) {
        // Handle containment relationships
        if (edge.data?.relationship === 'contains') {
            this.addNodeToContainer(edge.target, edge.source.id);
        }
    }

    removeEdge(edge) {
        if (edge.data?.relationship === 'contains') {
            this.removeNodeFromContainer(edge.target, edge.source.id);
        }
    }

    dispose() {
        this.layoutInstances.forEach(instance => instance.dispose?.());
        this.layoutInstances.clear();
        this.containerHierarchy.clear();
        this.rootContainers.clear();
        this.space = null;
        this.pluginManager = null;
        this.isRunning = false;
    }
}

class GridLayoutNested {
    constructor(config = {}) {
        this.settings = {
            columns: config.columns || 'auto',
            rows: config.rows || 'auto',
            spacing: config.spacing || 50,
            alignment: config.alignment || 'center',
            ...config
        };
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    async init(nodes, edges, config = {}) {
        const settings = { ...this.settings, ...config };
        const nodeCount = nodes.length;
        if (nodeCount === 0) return;

        let columns = settings.columns;
        let rows = settings.rows;

        if (columns === 'auto' && rows === 'auto') {
            columns = Math.ceil(Math.sqrt(nodeCount));
            rows = Math.ceil(nodeCount / columns);
        } else if (columns === 'auto') {
            columns = Math.ceil(nodeCount / rows);
        } else if (rows === 'auto') {
            rows = Math.ceil(nodeCount / columns);
        }

        const bounds = config.bounds || { size: new THREE.Vector3(500, 500, 0) };
        const cellWidth = bounds.size.x / columns;
        const cellHeight = bounds.size.y / rows;
        const startX = -(bounds.size.x / 2) + (cellWidth / 2);
        const startY = (bounds.size.y / 2) - (cellHeight / 2);

        nodes.forEach((node, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);
            
            const x = startX + col * cellWidth;
            const y = startY - row * cellHeight;
            const z = 0;

            if (!node.isPinned) {
                node.position.set(x, y, z);
            }
        });
    }

    dispose() {
        this.space = null;
        this.pluginManager = null;
    }
}

class CircularLayoutNested {
    constructor(config = {}) {
        this.settings = {
            radius: config.radius || 200,
            startAngle: config.startAngle || 0,
            ...config
        };
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    async init(nodes, edges, config = {}) {
        const settings = { ...this.settings, ...config };
        const nodeCount = nodes.length;
        if (nodeCount === 0) return;

        const bounds = config.bounds || { size: new THREE.Vector3(400, 400, 0) };
        const radius = Math.min(bounds.size.x, bounds.size.y) * 0.4;
        const angleStep = (2 * Math.PI) / nodeCount;

        nodes.forEach((node, index) => {
            const angle = settings.startAngle + index * angleStep;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const z = 0;

            if (!node.isPinned) {
                node.position.set(x, y, z);
            }
        });
    }

    dispose() {
        this.space = null;
        this.pluginManager = null;
    }
}

class ForceLayoutNested {
    constructor(config = {}) {
        this.settings = {
            iterations: config.iterations || 50,
            repulsion: config.repulsion || 1000,
            attraction: config.attraction || 0.01,
            ...config
        };
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    async init(nodes, edges, config = {}) {
        // Simplified force layout for nested containers
        const bounds = config.bounds || { size: new THREE.Vector3(400, 400, 0) };
        
        for (let i = 0; i < this.settings.iterations; i++) {
            nodes.forEach((node, index) => {
                if (node.isPinned) return;

                let force = new THREE.Vector3();

                // Repulsion from other nodes
                nodes.forEach((otherNode, otherIndex) => {
                    if (index === otherIndex) return;
                    
                    const diff = node.position.clone().sub(otherNode.position);
                    const distance = diff.length();
                    
                    if (distance > 0) {
                        force.add(diff.normalize().multiplyScalar(this.settings.repulsion / (distance * distance)));
                    }
                });

                // Boundary constraints
                const maxDistance = Math.min(bounds.size.x, bounds.size.y) * 0.4;
                const distanceFromCenter = node.position.length();
                if (distanceFromCenter > maxDistance) {
                    const centerForce = node.position.clone().normalize().multiplyScalar(-this.settings.attraction * distanceFromCenter);
                    force.add(centerForce);
                }

                node.position.add(force.multiplyScalar(0.01));
            });
        }
    }

    dispose() {
        this.space = null;
        this.pluginManager = null;
    }
}

class HierarchicalLayoutNested {
    constructor(config = {}) {
        this.settings = {
            levelSeparation: config.levelSeparation || 100,
            nodeSeparation: config.nodeSeparation || 80,
            ...config
        };
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    async init(nodes, edges, config = {}) {
        // Simplified hierarchical layout
        const bounds = config.bounds || { size: new THREE.Vector3(400, 400, 0) };
        const levels = Math.ceil(Math.sqrt(nodes.length));
        const nodesPerLevel = Math.ceil(nodes.length / levels);

        nodes.forEach((node, index) => {
            if (node.isPinned) return;

            const level = Math.floor(index / nodesPerLevel);
            const positionInLevel = index % nodesPerLevel;

            const x = (positionInLevel - (nodesPerLevel - 1) / 2) * this.settings.nodeSeparation;
            const y = (level - (levels - 1) / 2) * this.settings.levelSeparation;
            const z = 0;

            node.position.set(x, y, z);
        });
    }

    dispose() {
        this.space = null;
        this.pluginManager = null;
    }
}

class FlowLayoutNested {
    constructor(config = {}) {
        this.settings = {
            direction: config.direction || 'horizontal',
            spacing: config.spacing || 50,
            wrap: config.wrap || true,
            ...config
        };
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    async init(nodes, edges, config = {}) {
        const settings = { ...this.settings, ...config };
        const bounds = config.bounds || { size: new THREE.Vector3(400, 400, 0) };
        
        let currentX = -bounds.size.x / 2;
        let currentY = bounds.size.y / 2;
        let maxHeightInRow = 0;

        nodes.forEach((node, index) => {
            if (node.isPinned) return;

            const nodeSize = node.getBoundingSphereRadius?.() * 2 || 50;

            if (settings.direction === 'horizontal') {
                if (settings.wrap && currentX + nodeSize > bounds.size.x / 2) {
                    currentX = -bounds.size.x / 2;
                    currentY -= maxHeightInRow + settings.spacing;
                    maxHeightInRow = 0;
                }

                node.position.set(currentX + nodeSize / 2, currentY - nodeSize / 2, 0);
                currentX += nodeSize + settings.spacing;
                maxHeightInRow = Math.max(maxHeightInRow, nodeSize);
            } else {
                node.position.set(0, currentY - nodeSize / 2, 0);
                currentY -= nodeSize + settings.spacing;
            }
        });
    }

    dispose() {
        this.space = null;
        this.pluginManager = null;
    }
}