export class SphericalLayout {
    constructor(config?: {});
    space: any;
    pluginManager: any;
    settings: {
        radius: number;
        animate: boolean;
        animationDuration: number;
    };
    setContext(space: any, pluginManager: any): void;
    init(nodes: any, edges: any, config?: {}): Promise<void>;
    updateConfig(config: any): void;
    run(): void;
    stop(): void;
    kick(): void;
    addNode(node: any): void;
    removeNode(node: any): void;
    addEdge(edge: any): void;
    removeEdge(edge: any): void;
    dispose(): void;
}
