import { Edge } from './Edge.js';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

export class LabeledEdge extends Edge {
    labelText = '';

    constructor(id, sourceNode, targetNode, data = {}) {
        super(id, sourceNode, targetNode, data);
        this.labelText = this.data.label || '';
        if (this.labelText) this.labelObject = this._createLabel(this.labelText, 'edge-label'); // Removed 'node-common' as it might not be appropriate for edges
        this.update();
    }

    _createLabel(text, className) {
        const element = document.createElement('div');
        element.className = className;
        element.textContent = text;
        // Styling is handled by src/index.css via the 'edge-label' class

        const label = new CSS3DObject(element);
        // Position the label above the line, offset slightly.
        // This might need adjustment depending on the desired visual effect.
        label.position.set(0, 5, 0); // Small offset on Y axis
        label.userData = { edgeId: this.id, type: 'edge-label' };
        return label;
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
        // Remove labelObject from its parent (the CSS3DScene)
        if (this.labelObject && this.labelObject.parent) {
            this.labelObject.parent.remove(this.labelObject);
        }
        // It's also good practice to nullify the reference after removing and before calling super.dispose()
        // or after, though super.dispose() in Edge.js already does this.
        // For explicit clarity:
        this.labelObject = null;

        super.dispose(); // Calls Edge.dispose() which also nulls out this.labelObject if not already
    }
}
