export class LayoutManager {
    constructor(space: any, pluginManager: any);
    space: any;
    pluginManager: any;
    layouts: Map<any, any>;
    activeLayout: any;
    activeLayoutName: any;
    registerLayout(name: any, layoutInstance: any): void;
    applyLayout(name: any, config?: {}): Promise<boolean>;
    stopLayout(): void;
    update(): void;
    addNodeToLayout(node: any): void;
    removeNodeFromLayout(node: any): void;
    addEdgeToLayout(edge: any): void;
    removeEdgeFromLayout(edge: any): void;
    kick(): void;
    getActiveLayout(): any;
    getActiveLayoutName(): any;
    dispose(): void;
}
