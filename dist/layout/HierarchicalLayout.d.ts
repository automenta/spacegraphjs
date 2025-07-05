export class HierarchicalLayout {
    constructor(config?: {});
    space: any;
    pluginManager: any;
    settings: {
        levelSeparation: number;
        nodeSeparation: number;
        orientation: string;
        animate: boolean;
        animationDuration: number;
    };
    nodeMap: Map<any, any>;
    setContext(space: any, pluginManager: any): void;
    init(nodes: any, edges: any, config?: {}): Promise<void>;
    _firstPass(nodeWrapper: any, level: any): void;
    _apportion(nodeWrapper: any, defaultAncestor: any): any;
    _secondPass(nodeWrapper: any, currentXOffset: any, modSum: any): void;
    _calculateTreeWidth(nodeWrapper: any): any;
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
