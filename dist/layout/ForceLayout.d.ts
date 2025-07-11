export class ForceLayout {
    constructor(config?: {});
    space: any;
    nodesMap: Map<any, any>;
    edgesMap: Map<any, any>;
    worker: any;
    isRunning: boolean;
    totalEnergy: number;
    settings: {
        repulsion: number;
        centerStrength: number;
        damping: number;
        minEnergyThreshold: number;
        gravityCenter: any;
        zSpreadFactor: number;
        autoStopDelay: number;
        nodePadding: number;
        defaultElasticStiffness: number;
        defaultElasticIdealLength: number;
        defaultRigidStiffness: number;
        defaultWeldStiffness: number;
        enableClustering: boolean;
        clusterAttribute: string;
        clusterStrength: number;
    };
    setContext(space: any, pluginManager: any): void;
    pluginManager: any;
    _handleWorkerMessage(event: any): void;
    init(initialNodes: any, initialEdges: any, config?: {}): void;
    isRunningCheck(): boolean;
    getConfig(): {
        repulsion: number;
        centerStrength: number;
        damping: number;
        minEnergyThreshold: number;
        gravityCenter: any;
        zSpreadFactor: number;
        autoStopDelay: number;
        nodePadding: number;
        defaultElasticStiffness: number;
        defaultElasticIdealLength: number;
        defaultRigidStiffness: number;
        defaultWeldStiffness: number;
        enableClustering: boolean;
        clusterAttribute: string;
        clusterStrength: number;
    };
    setPinState(node: any, isPinned: any): void;
    fixNode(node: any): void;
    releaseNode(node: any): void;
    addNode(node: any): void;
    removeNode(node: any): void;
    addEdge(edge: any): void;
    removeEdge(edge: any): void;
    runOnce(): void;
    run(): void;
    stop(): void;
    kick(intensity?: number): void;
    setSettings(newSettings: any): void;
    dispose(): void;
}
