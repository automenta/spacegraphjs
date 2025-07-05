export class CircularLayout {
    constructor(config?: {});
    space: any;
    pluginManager: any;
    nodes: any[];
    settings: {
        radius: number;
        plane: string;
        startAngle: number;
        angularSpacing: number;
        center: {
            x: number;
            y: number;
            z: number;
        };
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
