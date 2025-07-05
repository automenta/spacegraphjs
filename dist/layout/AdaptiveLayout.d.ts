export class AdaptiveLayout {
    constructor(config?: {});
    space: any;
    pluginManager: any;
    settings: {
        adaptationTriggers: string[];
        morphDuration: number;
        morphEasing: string;
        enableAutoAdaptation: boolean;
        adaptationDelay: number;
        densityThresholds: {
            sparse: number;
            normal: number;
            dense: number;
        };
        sizeThresholds: {
            small: number;
            medium: number;
            large: number;
        };
        timeBasedAdaptation: {
            enabled: boolean;
            interval: number;
            patterns: string[];
        };
    };
    currentLayout: any;
    currentLayoutName: string;
    availableLayouts: Map<any, any>;
    adaptationRules: any[];
    layoutHistory: any[];
    nodeMetrics: Map<any, any>;
    isAdapting: boolean;
    adaptationTimer: any;
    setContext(space: any, pluginManager: any): void;
    registerLayout(name: any, layoutInstance: any): void;
    _initializeAdaptationRules(): void;
    init(nodes: any, edges: any, config?: {}): Promise<void>;
    _calculateGraphMetrics(nodes: any, edges: any): {
        nodeCount: number;
        edgeCount: number;
        density: number;
        avgDegree: number;
        connectionDensity: number;
        hierarchyScore: number;
        clustering: number;
        boundingVolume: number;
        boundingBox?: undefined;
    } | {
        nodeCount: any;
        edgeCount: any;
        density: number;
        avgDegree: number;
        connectionDensity: number;
        hierarchyScore: number;
        clustering: number;
        boundingVolume: number;
        boundingBox: {
            min: any;
            max: any;
            size: any;
            center?: undefined;
        } | {
            min: any;
            max: any;
            size: any;
            center: any;
        };
    };
    _calculateBoundingBox(positions: any): {
        min: any;
        max: any;
        size: any;
        center?: undefined;
    } | {
        min: any;
        max: any;
        size: any;
        center: any;
    };
    _calculateHierarchyScore(nodes: any, edges: any): number;
    _calculateClustering(nodes: any, edges: any): number;
    _selectBestLayout(metrics: any): any;
    _applyLayout(layoutName: any, nodes: any, edges: any, config?: {}): Promise<void>;
    _morphBetweenLayouts(nodes: any, oldPositions: any): Promise<any>;
    _startAdaptationMonitoring(): void;
    _checkForAdaptation(): Promise<void>;
    _performTimeBasedAdaptation(): Promise<void>;
    addAdaptationRule(rule: any): void;
    removeAdaptationRule(ruleName: any): void;
    forceAdaptation(targetLayout: any, reason?: string): void;
    setAdaptationEnabled(enabled: any): void;
    getLayoutHistory(): any[];
    getCurrentLayout(): {
        name: string;
        instance: any;
    };
    getAdaptationRules(): any[];
    addNode(node: any): void;
    removeNode(node: any): void;
    addEdge(edge: any): void;
    removeEdge(edge: any): void;
    run(): void;
    stop(): void;
    kick(): void;
    updateConfig(newConfig: any): void;
    dispose(): void;
}
