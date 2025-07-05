export class NestedLayout {
    constructor(config?: {});
    space: any;
    pluginManager: any;
    settings: {
        containerPadding: number;
        childSpacing: number;
        autoResize: boolean;
        animate: boolean;
        animationDuration: number;
        recursionDepth: number;
        defaultChildLayout: string;
    };
    rootContainers: Map<any, any>;
    layoutInstances: Map<any, any>;
    containerHierarchy: Map<any, any>;
    isRunning: boolean;
    setContext(space: any, pluginManager: any): void;
    init(nodes: any, edges: any, config?: {}): Promise<void>;
    _buildHierarchy(nodes: any, edges: any): void;
    _hasParentContainer(containerId: any): boolean;
    _calculateContainerBounds(container: any): {
        min: any;
        max: any;
        center: any;
        size: any;
    };
    _applyNestedLayouts(depth?: number): Promise<void>;
    _applyContainerLayout(containerData: any, depth: any): Promise<void>;
    _createLayoutInstance(layoutType: any, config: any): GridLayoutNested | CircularLayoutNested | ForceLayoutNested | HierarchicalLayoutNested | FlowLayoutNested;
    _calculateAvailableSpace(containerBounds: any): {
        min: any;
        max: any;
        center: any;
        size: any;
    };
    _normalizePositionToContainer(position: any, containerBounds: any): any;
    _denormalizePositionFromContainer(normalizedPosition: any, containerBounds: any): any;
    _recalculateContainerBounds(containerData: any): any;
    _resizeContainers(): void;
    addContainer(container: any, parentId?: any): void;
    removeContainer(containerId: any): void;
    addNodeToContainer(node: any, containerId: any): void;
    removeNodeFromContainer(node: any, containerId: any): void;
    setContainerLayout(containerId: any, layoutType: any, config?: {}): void;
    updateConfig(newConfig: any): void;
    run(): void;
    stop(): void;
    kick(): void;
    addNode(node: any): void;
    removeNode(node: any): void;
    addEdge(edge: any): void;
    removeEdge(edge: any): void;
    dispose(): void;
}
declare class GridLayoutNested {
    constructor(config?: {});
    settings: {
        columns: any;
        rows: any;
        spacing: any;
        alignment: any;
    };
    setContext(space: any, pluginManager: any): void;
    space: any;
    pluginManager: any;
    init(nodes: any, edges: any, config?: {}): Promise<void>;
    dispose(): void;
}
declare class CircularLayoutNested {
    constructor(config?: {});
    settings: {
        radius: any;
        startAngle: any;
    };
    setContext(space: any, pluginManager: any): void;
    space: any;
    pluginManager: any;
    init(nodes: any, edges: any, config?: {}): Promise<void>;
    dispose(): void;
}
declare class ForceLayoutNested {
    constructor(config?: {});
    settings: {
        iterations: any;
        repulsion: any;
        attraction: any;
    };
    setContext(space: any, pluginManager: any): void;
    space: any;
    pluginManager: any;
    init(nodes: any, edges: any, config?: {}): Promise<void>;
    dispose(): void;
}
declare class HierarchicalLayoutNested {
    constructor(config?: {});
    settings: {
        levelSeparation: any;
        nodeSeparation: any;
    };
    setContext(space: any, pluginManager: any): void;
    space: any;
    pluginManager: any;
    init(nodes: any, edges: any, config?: {}): Promise<void>;
    dispose(): void;
}
declare class FlowLayoutNested {
    constructor(config?: {});
    settings: {
        direction: any;
        spacing: any;
        wrap: any;
    };
    setContext(space: any, pluginManager: any): void;
    space: any;
    pluginManager: any;
    init(nodes: any, edges: any, config?: {}): Promise<void>;
    dispose(): void;
}
export {};
