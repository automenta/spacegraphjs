import { Edge } from './Edge.js';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

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
        const div = document.createElement('div');
        div.className = 'edge-label node-common';
        div.textContent = this.labelText;
        Object.assign(div.style, {
            pointerEvents: 'none',
            color: this.data.labelColor || 'white',
            backgroundColor: this.data.labelBackgroundColor || 'rgba(0,0,0,0.6)',
            padding: '2px 5px',
            borderRadius: '3px',
            fontSize: this.data.labelFontSize || '12px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            position: 'absolute',
        });
        const label = new CSS3DObject(div);
        label.userData = { edgeId: this.id, type: 'edge-label' };
        return label;
    }

    update() {
        super.update();

        if (this.labelObject) {
            const sourcePos = this.source.position;
            const targetPos = this.target.position;

            this.labelObject.position.addVectors(sourcePos, targetPos).multiplyScalar(0.5);

            if (this.space?.camera?._cam) this.labelObject.quaternion.copy(this.space.camera._cam.quaternion);
            this._applyLabelLOD();
        }
    }

    _applyLabelLOD() {
        if (!this.labelObject?.element || !this.data.labelLod?.length) {
            if (this.labelObject?.element) this.labelObject.element.style.visibility = '';
            return;
        }

        const camera = this.space?.plugins?.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!camera) return;

        const distanceToCamera = this.labelObject.position.distanceTo(camera.position);
        const sortedLodLevels = [...this.data.labelLod].sort((a, b) => (b.distance || 0) - (a.distance || 0));

        let visibilityApplied = false;
        for (const level of sortedLodLevels) {
            if (distanceToCamera >= (level.distance || 0)) {
                this.labelObject.element.style.visibility = level.style?.includes('visibility:hidden') ? 'hidden' : '';
                visibilityApplied = true;
                break;
            }
        }
        if (!visibilityApplied) this.labelObject.element.style.visibility = '';
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
