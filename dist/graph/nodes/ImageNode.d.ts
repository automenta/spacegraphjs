export class ImageNode extends Node {
    static typeName: string;
    constructor(id: any, position: any, data?: {}, mass?: number);
    imageUrl: any;
    imageSize: {
        width: number;
        height: number;
    };
    nodeType: string;
    getDefaultData(): {
        label: string;
        imageUrl: any;
        size: number;
        type: string;
        color: number;
    };
    _createMesh(): any;
    _loadImageTexture(): void;
    updateBoundingSphere(): void;
    _boundingSphere: any;
    _createLabel(): CSS3DObject;
}
import { Node } from './Node.js';
