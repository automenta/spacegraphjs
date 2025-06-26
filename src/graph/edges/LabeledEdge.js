import {Edge} from './Edge.js';
import {createCSS3DLabelObject, applyLabelLOD} from '../../utils/labelUtils.js';

export class LabeledEdge extends Edge {
    static typeName = 'labeled';
    labelObject = null;
    labelText = '';

    constructor(id, sourceNode, targetNode, data = {}) {
        super(id, sourceNode, targetNode, data);
        this.labelText = this.data.label || '';
        if (this.labelText) this.labelObject = this._createLabel();
        this.update();
    }

    _createLabel() {
        const styleData = {
            color: this.data.labelColor || 'var(--sg-edge-label-text, white)',
            backgroundColor: this.data.labelBackgroundColor || 'var(--sg-edge-label-bg, rgba(0,0,0,0.6))',
            padding: '2px 5px',
            borderRadius: '3px',
            fontSize: this.data.labelFontSize || '12px',
        };
        return createCSS3DLabelObject(this.labelText, this.id, 'edge-label', styleData, 'edge-label');
    }

    update() {
        super.update(); // Call base Edge update for line and arrowheads

        if (this.labelObject) {
            const sourcePos = this.source.position;
            const targetPos = this.target.position;
            this.labelObject.position.addVectors(sourcePos, targetPos).multiplyScalar(0.5);

            if (this.space?._cam) this.labelObject.quaternion.copy(this.space._cam.quaternion);
            applyLabelLOD(this.labelObject, this.data.labelLod, this.space);
        }
    }

    setHighlight(highlight) {
        super.setHighlight(highlight);
        this.labelObject?.element?.classList.toggle('selected', highlight);
    }

    dispose() {
        this.labelObject?.element?.remove();
        this.labelObject?.parent?.remove(this.labelObject);
        this.labelObject = null;
        super.dispose();
    }
}
