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
        if (!this.line || !this.source || !this.target) return;

        const sourcePos = this.source.position;
        const targetPos = this.target.position;

        if (!isFinite(sourcePos.x) || !isFinite(sourcePos.y) || !isFinite(sourcePos.z) ||
            !isFinite(targetPos.x) || !isFinite(targetPos.y) || !isFinite(targetPos.z)) {
            return;
        }

        this.line.geometry.setPositions([
            sourcePos.x, sourcePos.y, sourcePos.z,
            targetPos.x, targetPos.y, targetPos.z,
        ]);

        if (this.line.geometry.attributes.position.count === 0) return;

        if (this.data.gradientColors?.length === 2) {
            this._setGradientColors();
        } else {
            this.line.material.vertexColors = false;
            this.line.material.needsUpdate = true;
            this.line.material.color.set(this.data.color);
        }

        if (this.line.material.dashed) this.line.computeLineDistances();
        this.line.geometry.computeBoundingSphere();

        this._updateArrowheads();

        if (this.labelObject) {
            this.labelObject.position.addVectors(sourcePos, targetPos).multiplyScalar(0.5);

            if (this.space?._cam) this.labelObject.quaternion.copy(this.space._cam.quaternion);
            this._applyLabelLOD();
        }
    }

    _setGradientColors() {
        if (!this.line || !this.data.gradientColors?.length === 2) {
            if (this.line?.material.vertexColors) {
                this.line.material.vertexColors = false;
                this.line.material.color.set(this.data.color || 0x00d0ff);
                this.line.material.needsUpdate = true;
            }
            return;
        }

        if (!this.line.material.vertexColors) {
            this.line.material.vertexColors = true;
            this.line.material.needsUpdate = true;
        }

        const colorStart = new THREE.Color(this.data.gradientColors[0]);
        const colorEnd = new THREE.Color(this.data.gradientColors[1]);

        const colors = [];
        colors.push(colorStart.r, colorStart.g, colorStart.b);
        colors.push(colorEnd.r, colorEnd.g, colorEnd.b);

        const posAttribute = this.line.geometry.attributes.position;
        if (posAttribute?.array?.length >= 6 && posAttribute.array.length === colors.length) {
            this.line.geometry.setColors(colors);
        }
    }

    _updateArrowheads() {
        const sourcePos = this.source.position;
        const targetPos = this.target.position;

        if (this.arrowheads.target) {
            this.arrowheads.target.position.copy(targetPos);
            const direction = new THREE.Vector3().subVectors(targetPos, sourcePos).normalize();
            this._orientArrowhead(this.arrowheads.target, direction);
        }

        if (this.arrowheads.source) {
            this.arrowheads.source.position.copy(sourcePos);
            const direction = new THREE.Vector3().subVectors(sourcePos, targetPos).normalize();
            this._orientArrowhead(this.arrowheads.source, direction);
        }
    }

    _createSingleArrowhead(_type) {
        const size = this.data.arrowheadSize || 10;
        // ConeGeometry is typically oriented along the Y-axis by default
        const geometry = new THREE.ConeGeometry(size / 2, size, 8);
        const material = new THREE.MeshBasicMaterial({
            color: this.data.arrowheadColor || this.data.color,
            opacity: Edge.DEFAULT_OPACITY,
            transparent: true,
            depthTest: false,
        });
        const arrowhead = new THREE.Mesh(geometry, material);
        arrowhead.renderOrder = this.line.renderOrder + 1;
        arrowhead.userData = { edgeId: this.id, type: 'edge-arrowhead' };
        return arrowhead;
    }

    _orientArrowhead(arrowhead, direction) {
        // Assuming the cone's default orientation is along its Y-axis (height)
        const coneUp = new THREE.Vector3(0, 1, 0);
        arrowhead.quaternion.setFromUnitVectors(coneUp, direction);
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
