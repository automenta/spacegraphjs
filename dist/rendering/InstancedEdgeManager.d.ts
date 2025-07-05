export class InstancedEdgeManager {
    constructor(scene: any);
    scene: any;
    edgeGroup: InstancedEdgeGroup;
    arrowheadGroup: InstancedArrowheadGroup;
    addEdge(edge: any): boolean;
    updateEdge(edge: any): void;
    removeEdge(edge: any): void;
    raycast(raycaster: any): any;
    dispose(): void;
}
declare class InstancedEdgeGroup {
    constructor(scene: any);
    geometry: any;
    material: any;
    instancedMesh: any;
    edgeIdToInstanceId: Map<any, any>;
    instanceIdToEdgeId: Map<any, any>;
    activeInstances: number;
    addEdge(edge: any): number;
    updateEdgeTransform(edge: any, instanceId?: any): void;
    updateEdgeColor(edge: any, instanceId?: any): void;
    removeEdge(edge: any): void;
    getRaycastIntersection(raycaster: any): any;
    dispose(): void;
}
declare class InstancedArrowheadGroup {
    constructor(scene: any);
    geometry: any;
    material: any;
    instancedMesh: any;
    arrowheadIdToInstanceId: Map<any, any>;
    instanceIdToArrowheadId: Map<any, any>;
    activeInstances: number;
    addArrowhead(edge: any, type: any): number;
    updateArrowheadTransform(edge: any, type: any, instanceId?: any): void;
    updateArrowheadColor(edge: any, instanceId: any): void;
    removeArrowhead(edge: any, type: any): void;
    dispose(): void;
}
export {};
