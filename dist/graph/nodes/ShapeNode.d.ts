export class ShapeNode extends Node {
    static typeName: string;
    constructor(id: any, position: any, data?: {}, mass?: number);
    shape: string;
    size: number;
    color: number;
    gltfUrl: any;
    lodData: any[];
    isSelected: boolean;
    isHovered: boolean;
    getDefaultData(): {
        label: string;
        shape: string;
        size: number;
        color: number;
        type: string;
        lodLevels: any[];
        labelLod: any[];
    };
    _setupLODLevels(): void;
    _createRepresentationForLevel(levelConfig: any): any;
    _createMeshForLevel(levelConfig: any): any;
    _loadGltfModelForLevel(levelConfig: any, targetGroup: any): void;
    updateBoundingSphere(): void;
    _boundingSphere: any;
    _createLabel(): CSS3DObject;
    getBoundingSphereRadius(): any;
    setHoverStyle(hovered: any, force?: boolean): void;
}
import { Node } from './Node.js';
