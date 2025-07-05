export class DynamicThicknessEdge extends Edge {
    static MIN_THICKNESS: number;
    static MAX_THICKNESS: number;
    updateThicknessFromData(): void;
    setValue(newValue: any): void;
}
import { Edge } from './Edge.js';
