export class IFrameNode extends Node {
    static typeName: string;
    static DEFAULT_WIDTH: number;
    static DEFAULT_HEIGHT: number;
    constructor(id: any, position: any, data?: {}, mass?: number);
    htmlElement: any;
    iframeElement: any;
    size: {
        width: number;
        height: number;
    };
    getDefaultData(): {
        label: string;
        iframeUrl: string;
        width: number;
        height: number;
        type: string;
        backgroundColor: string;
        borderColor: string;
    };
    _createElement(): HTMLDivElement;
    setIframeUrl(url: any): void;
}
import { Node } from './Node.js';
