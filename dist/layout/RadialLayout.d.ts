export class RadialLayout {
    static layoutName: string;
    constructor(config?: {});
    space: any;
    pluginManager: any;
    settings: {
        centerNodeId: any;
        radiusIncrement: number;
        angularSeparationMin: number;
        plane: string;
        startRadius: number;
        levelSpacingFactor: number;
        animate: boolean;
        animationDuration: number;
    };
    setContext(space: any, pluginManager: any): void;
    updateConfig(newConfig: any): void;
    init(nodes: any, edges: any, config?: {}): void;
    run(): void;
    stop(): void;
    update(): void;
    addNode(node: any): void;
    removeNode(node: any): void;
    addEdge(edge: any): void;
    removeEdge(edge: any): void;
    kick(): void;
    dispose(): void;
}
