export class ProgressNode extends HtmlNode {
    _animationFrame: number;
    getDefaultData(): {
        type: string;
        progressType: string;
        value: number;
        max: number;
        min: number;
        label: string;
        showValue: boolean;
        showPercent: boolean;
        animated: boolean;
        color: string;
        backgroundColor: string;
        content: string;
        width: number;
        height: number;
        contentScale: number;
        editable: boolean;
        labelLod: any[];
    };
    _generateProgressContent(): string;
    _generateBarProgress(percent: any): string;
    _generateCircularProgress(percent: any): string;
    _generateGaugeProgress(percent: any): string;
    _generateStepsProgress(): string;
    _generateValueText(): string;
    _getPercent(): number;
    _lightenColor(color: any, percent: any): string;
    _updateProgress(contextElement: any): void;
    setValue(value: any): void;
    setMax(max: any): void;
    setMin(min: any): void;
    increment(amount?: number): void;
    decrement(amount?: number): void;
    animateToValue(targetValue: any, duration?: number): void;
}
import { HtmlNode } from './HtmlNode.js';
