export class ChartNode extends HtmlNode {
    getDefaultData(): {
        label: string;
        width: number;
        height: number;
        chartType: string;
        chartData: {};
        chartOptions: {};
        backgroundColor: string;
        content: string;
        contentScale: number;
        type: string;
        editable: boolean;
        labelLod: any[];
    };
    _renderChart(): void;
    _initializeChart(canvas: any): void;
    chartInstance: any;
    updateChartData(newChartData: any): void;
}
import { HtmlNode } from './HtmlNode.js';
