/**
 * @file LabeledEdge.js - Represents an edge with a text label.
 * @licence MIT
 */

import * as THREE from 'three';
import {
    Edge
} from './Edge.js';
import {
    CSS3DObject
} from 'three/addons/renderers/CSS3DRenderer.js';

export class LabeledEdge extends Edge {
    labelObject = null;
    labelText = '';

    constructor(id, sourceNode, targetNode, data = {}) {
        super(id, sourceNode, targetNode, data);
        this.labelText = this.data.label || '';
        if (this.labelText) {
            this.labelObject = this._createLabel();
        }
        this.update(); // Call update to position label
    }

    _createLabel() {
        const div = document.createElement('div');
        div.className = 'edge-label node-common'; // Re-use some styling if appropriate
        div.textContent = this.labelText;
        // Style for the label
        Object.assign(div.style, {
            pointerEvents: 'none', // Don't block interaction with edge line or other objects
            color: this.data.labelColor || 'white',
            backgroundColor: this.data.labelBackgroundColor || 'rgba(0,0,0,0.6)',
            padding: '2px 5px',
            borderRadius: '3px',
            fontSize: this.data.labelFontSize || '12px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            position: 'absolute', // Necessary for CSS3DObject positioning
        });
        const label = new CSS3DObject(div);
        label.userData = { edgeId: this.id, type: 'edge-label' };
        return label;
    }

    update() {
        super.update(); // Update line geometry first

        if (this.labelObject) {
            const sourcePos = this.source.position;
            const targetPos = this.target.position;

            // Position label at the midpoint of the edge
            this.labelObject.position.addVectors(sourcePos, targetPos).multiplyScalar(0.5);

            // Orient label (billboard towards camera)
            if (this.space?.camera?._cam) {
                this.labelObject.quaternion.copy(this.space.camera._cam.quaternion);

                // Optional: Offset slightly towards camera to avoid z-fighting with edge line if very close
                // const offsetVector = new THREE.Vector3(0,0,1); // Small offset along camera's local Z
                // offsetVector.applyQuaternion(this.space.camera._cam.quaternion);
                // this.labelObject.position.add(offsetVector.multiplyScalar(0.1));
            }
        }
    }

    // Override setHighlight to also highlight label if desired
    setHighlight(highlight) {
        super.setHighlight(highlight);
        if (this.labelObject?.element) {
            this.labelObject.element.classList.toggle('selected', highlight);
            // Example: change background or border on highlight
            // this.labelObject.element.style.backgroundColor = highlight ? 'rgba(255,255,0,0.7)' : (this.data.labelBackgroundColor || 'rgba(0,0,0,0.6)');
        }
    }


    dispose() {
        if (this.labelObject) {
            this.labelObject.element?.remove();
            this.labelObject.parent?.remove(this.labelObject); // Remove from scene if added
            this.labelObject = null;
        }
        super.dispose();
    }
}
