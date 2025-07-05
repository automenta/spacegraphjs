export class DocumentNode extends Node {
    static typeName: string;
    constructor(id: any, position: any, data?: {}, mass?: number);
    getDefaultData(): {
        label: string;
        documentUrl: string;
        icon: string;
        color: number;
        size: number;
        labelLod: any[];
    };
    createMesh(): any;
    _createLabel(): CSS3DObject;
    viewDocument(): void;
}
import { Node } from './Node.js';
