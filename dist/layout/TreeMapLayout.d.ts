export class TreeMapLayout {
    static layoutName: string;
    constructor(config?: {});
    space: any;
    pluginManager: any;
    settings: {
        padding: number;
        areaProperty: string;
        plane: string;
        depth: number;
        centerOrigin: boolean;
        width: number;
        height: number;
    };
    setContext(space: any, pluginManager: any): void;
    updateConfig(newConfig: any): void;
    init(nodes: any, edges: any, config?: {}): void;
    _squarify(nodes: any, rect: any, totalArea: any, padding: any): void;
    _calculateRowRatio(row: any, rowArea: any, rectWidth: any, rectHeight: any): number;
    _layoutRow(row: any, rect: any, rowArea: any, totalArea: any, padding: any): void;
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
