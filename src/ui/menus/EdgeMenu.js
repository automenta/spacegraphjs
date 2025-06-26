import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

export class EdgeMenu {
    constructor(space, uiPluginCallbacks) {
        this.space = space;
        this._uiPluginCallbacks = uiPluginCallbacks;
        this.edgeMenuObject = null;
    }

    show(edge) {
        if (!edge) return;
        this.hide();

        const menuElement = this._createEdgeMenuElement(edge);
        this.edgeMenuObject = new CSS3DObject(menuElement);
        this.space.plugins.getPlugin('RenderingPlugin')?.getCSS3DScene()?.add(this.edgeMenuObject);
        this.updatePosition(edge);
        this.space.emit('ui:edgemenu:shown', { edge });
    }

    _createEdgeMenuElement(edge) {
        const menu = document.createElement('div');
        menu.className = 'edge-menu-frame';
        menu.dataset.edgeId = edge.id;

        const edgeColorHex = `#${edge.data.color?.toString(16).padStart(6, '0') || 'ffffff'}`;

        menu.innerHTML = `
            <input type="color" value="${edgeColorHex}" title="Edge Color" data-property="color">
            <input type="range" min="0.5" max="10" step="0.1" value="${edge.data.thickness || 1}" title="Edge Thickness" data-property="thickness">
            <select title="Constraint Type" data-property="constraintType">
                ${['elastic', 'rigid', 'weld', 'none'].map(type =>
                    `<option value="${type}" ${edge.data.constraintType === type ? 'selected' : ''}>${type.charAt(0).toUpperCase() + type.slice(1)}</option>`
                ).join('')}
            </select>
            <button title="Delete Edge" class="delete-button" data-action="delete-edge">×</button>
        `;

        menu.addEventListener('input', (e) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
                const property = e.target.dataset.property;
                if (!property) return;

                let value = e.target.value;
                if (e.target.type === 'color') {
                    value = parseInt(value.substring(1), 16);
                } else if (e.target.type === 'range') {
                    value = parseFloat(value);
                }

                this.space.emit('ui:request:updateEdge', edge.id, property, value);
            }
        });

        menu.addEventListener('click', (e) => {
            if (e.target.closest('button[data-action="delete-edge"]')) {
                this.space.emit('ui:request:confirm', {
                    message: `Delete edge "${edge.id.substring(0, 10)}..."?`,
                    onConfirm: () => this.space.emit('ui:request:removeEdge', edge.id)
                });
            }
        });

        menu.addEventListener('pointerdown', (e) => e.stopPropagation());
        menu.addEventListener('wheel', (e) => e.stopPropagation());

        return menu;
    }

    hide = () => {
        if (this.edgeMenuObject) {
            this.edgeMenuObject.element?.remove();
            this.edgeMenuObject.parent?.remove(this.edgeMenuObject);
            this.edgeMenuObject = null;
            this.space.emit('ui:edgemenu:hidden');
        }
    };

    updatePosition = (edge) => {
        if (!this.edgeMenuObject || !this.edgeMenuObject.element?.parentNode || !edge) return;

        const midPoint = new THREE.Vector3().lerpVectors(edge.source.position, edge.target.position, 0.5);
        this.edgeMenuObject.position.copy(midPoint);

        const camInstance = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        camInstance && this.edgeMenuObject.lookAt(camInstance.position);
        this.edgeMenuObject.element.style.transform = `scale(${1 / this.space.plugins.getPlugin('RenderingPlugin').getCSS3DRenderer().getSize().width * 100000})`;
    };

    dispose() {
        this.hide();
        this.space = null;
        this._uiPluginCallbacks = null;
    }
}
