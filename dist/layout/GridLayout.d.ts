export class GridLayout {
    constructor(config?: {});
    space: any;
    pluginManager: any;
    nodes: any[];
    settings: {
        columns: number;
        padding: {
            x: number;
            y: number;
            z: number;
        };
        plane: string;
        depthCount: number;
        centerOrigin: boolean;
        animate: boolean;
    };
    setContext(space: any, pluginManager: any): void;
    updateConfig(newConfig: any): void;
    init(nodes: any, edges: any, config?: {}): void;
    run(): void;
    stop(): void;
    addNode(node: any): void;
    removeNode(node: any): void;
    addEdge(edge: any): void;
    removeEdge(edge: any): void;
    dispose(): void;
}
