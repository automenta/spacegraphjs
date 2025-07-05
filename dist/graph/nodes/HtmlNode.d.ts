export class HtmlNode extends Node {
    static typeName: string;
    static MIN_SIZE: {
        width: number;
        height: number;
    };
    static CONTENT_SCALE_RANGE: {
        min: number;
        max: number;
    };
    constructor(id: any, position: any, data?: {}, mass?: number);
    htmlElement: any;
    size: {
        width: number;
        height: number;
    };
    billboard: boolean;
    getDefaultData(): {
        label: string;
        content: string;
        width: number;
        height: number;
        contentScale: number;
        backgroundColor: string;
        type: string;
        editable: boolean;
        labelLod: any[];
    };
    _createElement(): HTMLDivElement;
    _initContentEditable(element: any): void;
    setSize(width: any, height: any, scaleContent?: boolean): void;
    setContentScale(scale: any): void;
    setBackgroundColor(color: any): void;
    adjustContentScale: (deltaFactor: any) => void;
    adjustNodeSize: (factor: any) => void;
    startResize(): void;
    resize(newWidth: any, newHeight: any): void;
    endResize(): void;
}
import { Node } from './Node.js';
