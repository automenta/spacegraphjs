export class LabeledEdge extends Edge {
    labelObject: any;
    labelText: string;
    _createLabel(): CSS3DObject;
}
import { Edge } from './Edge.js';
