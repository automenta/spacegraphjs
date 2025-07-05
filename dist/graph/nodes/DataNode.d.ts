export class DataNode extends Node {
    static typeName: string;
    constructor(id: any, position: any, data?: {}, mass?: number);
    canvas: any;
    ctx: any;
    texture: any;
    size: any;
    getDefaultData(): {
        label: string;
        type: string;
        size: number;
        chartType: string;
        chartData: {
            label: string;
            value: number;
            color: string;
        }[];
        chartBackgroundColor: string;
        chartTextColor: string;
    };
    _setupCanvas(): void;
    _createChartMesh(): void;
    _drawChart(): void;
    _drawBarChart(data: any, canvasWidth: any, canvasHeight: any): void;
    updateChartData(newData: any): void;
    _createLabel(): any;
    updateBoundingSphere(): void;
    _boundingSphere: any;
}
import { Node } from './Node.js';
