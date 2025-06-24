import { Edge } from './Edge.js';

export class LabeledEdge extends Edge {
    labelText = '';

    constructor(id, sourceNode, targetNode, data = {}) {
        super(id, sourceNode, targetNode, data);
        this.labelText = this.data.label || '';
        if (this.labelText) this.labelObject = this._createLabel(this.labelText, 'edge-label node-common');
        this.update();
    }

    update() {
        super.update();
        if (!this.labelObject) return;

        const sourcePos = this.source.position;
        const targetPos = this.target.position;

        this.labelObject.position.addVectors(sourcePos, targetPos).multiplyScalar(0.5);
        super.update(this.space);
    }

    setHighlight(highlight) {
        super.setHighlight(highlight);
        this.labelObject?.element?.classList.toggle('selected', highlight);
    }

    dispose() {
        super.dispose();
    }
}
