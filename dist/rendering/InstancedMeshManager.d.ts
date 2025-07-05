export class InstancedMeshManager {
    constructor(scene: any);
    scene: any;
    meshGroups: Map<any, any>;
    gltfLoader: any;
    loadedGltfGeometries: Map<any, any>;
    _loadGltfModel(url: any): Promise<any>;
    _initDefaultGeometries(): void;
    getNodeGroup(node: any): Promise<any>;
    addNode(node: any): Promise<boolean>;
    updateNode(node: any): Promise<void>;
    removeNode(node: any): Promise<void>;
    raycast(raycaster: any): any;
    dispose(): void;
}
