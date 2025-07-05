export class CurvedEdge extends Edge {
    labelObject: any;
    numPoints: number;
    curvature: number;
    _createLabel(): CSS3DObject;
    _updateArrowheadsAlongCurve(points: any): void;
    _updateLabelAlongCurve(points: any): void;
}
import { Edge } from './Edge.js';
