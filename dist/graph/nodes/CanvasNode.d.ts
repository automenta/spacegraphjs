export class CanvasNode extends HtmlNode {
    canvas: any;
    ctx: any;
    isDrawing: boolean;
    lastDrawPoint: any;
    drawingMode: string;
    tools: {
        pen: {
            color: string;
            size: number;
        };
        brush: {
            color: string;
            size: number;
        };
        eraser: {
            size: number;
        };
        line: {
            color: string;
            size: number;
        };
        rectangle: {
            color: string;
            size: number;
            fill: boolean;
        };
        circle: {
            color: string;
            size: number;
            fill: boolean;
        };
    };
    getDefaultData(): {
        type: string;
        title: string;
        backgroundColor: string;
        canvasBackground: string;
        showToolbar: boolean;
        enableDrawing: boolean;
        preserveContent: boolean;
        label: string;
        content: string;
        width: number;
        height: number;
        contentScale: number;
        editable: boolean;
        labelLod: any[];
    };
    _generateToolbar(): string;
    _setupCanvas(): void;
    _setupTools(): void;
    _bindCanvasEvents(): void;
    startPoint: {
        x: number;
        y: number;
    };
    _setTool(tool: any): void;
    _drawDot(point: any): void;
    _drawLine(from: any, to: any): void;
    _drawShape(start: any, end: any): void;
    _saveCanvasState(): void;
    _loadCanvasData(dataUrl: any): void;
    clearCanvas(): void;
    saveCanvas(): void;
    drawImage(image: any, x?: number, y?: number, width?: any, height?: any): void;
    drawText(text: any, x: any, y: any, options?: {}): void;
    getCanvasData(): any;
    setCanvasData(dataUrl: any): void;
}
import { HtmlNode } from './HtmlNode.js';
