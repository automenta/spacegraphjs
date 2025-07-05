export class SpaceGraph {
    constructor(containerElement: any, options?: {});
    _cam: any;
    _listeners: Map<any, any>;
    plugins: any;
    options: {};
    container: any;
    init(): Promise<void>;
    on(eventName: any, callback: any): void;
    off(eventName: any, callback: any): void;
    emit(eventName: any, ...args: any[]): void;
    _setupEventListeners(): void;
    addNode(nodeInstance: any): any;
    addEdge(sourceNode: any, targetNode: any, data?: {}): any;
    createNode(nodeConfig: any): any;
    togglePinNode(nodeId: any): void;
    centerView(targetPosition?: any, duration?: number): void;
    focusOnNode(node: any, duration?: number, pushHistory?: boolean): void;
    autoZoom(node: any): void;
    screenToWorld(screenX: any, screenY: any, targetZ?: number): any;
    intersectedObjects(screenX: any, screenY: any): {
        node: any;
        distance: any;
        edge?: undefined;
    } | {
        edge: any;
        distance: any;
        node?: undefined;
    };
    animate(): void;
    get layoutManager(): any;
    dispose(): void;
    exportGraphToJSON(options: any): any;
    importGraphFromJSON(jsonData: any, options: any): Promise<any>;
}
