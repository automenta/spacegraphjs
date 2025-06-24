import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { Utils } from '../../utils.js';

export class BaseNode {
    space = null;
    position = new THREE.Vector3();
    data = {};
    mass = 1.0;
    id = null;
    mesh = null;
    cssObject = null;
    htmlElement = null;
    labelObject = null;
    isPinned = false;
    billboard = false;
    _boundingSphere = null;

    constructor(id, position = { x: 0, y: 0, z: 0 }, data = {}, mass = 1.0) {
        this.id = id ?? Utils.generateId('node');
        if (!isFinite(position.x) || !isFinite(position.y) || !isFinite(position.z)) {
            console.warn(`BaseNode ${this.id}: Initial position is invalid (${position.x}, ${position.y}, ${position.z}). Defaulting to (0,0,0).`);
            this.position.set(0, 0, 0);
        } else {
            this.position.set(position.x, position.y, position.z);
        }
        this.data = Utils.mergeDeep({}, this.getDefaultData(), data);
        this.mass = Math.max(0.1, mass);
        this.isPinned = this.data.isPinned ?? false;
        this.billboard = this.data.billboard ?? false;
    }

    getDefaultData() {
        return { label: '' };
    }

    _createLabel(text = this.data.label, className = 'node-label-3d node-common') {
        const div = document.createElement('div');
        div.className = className;
        div.textContent = text;
        div.dataset.nodeId = this.id;
        return new CSS3DObject(div);
    }

    _applyLabelLOD(space) {
        if (!this.labelObject?.element || !this.data.labelLod?.length) {
            this.labelObject?.element && (this.labelObject.element.style.visibility = '');
            return;
        }

        const camera = space?.plugins?.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!camera) return;

        const distanceToCamera = this.labelObject.position.distanceTo(camera.position);
        const sortedLodLevels = [...this.data.labelLod].sort((a, b) => (b.distance || 0) - (a.distance || 0));

        let appliedRule = false;
        for (const level of sortedLodLevels) {
            if (distanceToCamera >= (level.distance || 0)) {
                this.labelObject.element.style.visibility = level.style?.includes('visibility:hidden') ? 'hidden' : '';
                appliedRule = true;
                break;
            }
        }
        if (!appliedRule) this.labelObject.element.style.visibility = '';
    }

    update(space) {
        this.mesh?.position.copy(this.position);

        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            if (this.billboard && space?.camera?._cam) {
                this.cssObject.quaternion.copy(space.camera._cam.quaternion);
            }
        }

        if (this.labelObject) {
            if (this.labelObject.position.equals(this.position)) {
                if (space?.camera?._cam) this.labelObject.quaternion.copy(space.camera._cam.quaternion);
            }
            this._applyLabelLOD(space);
        }
    }

    dispose() {
        this.mesh?.geometry?.dispose();
        this.mesh?.material?.dispose();
        this.mesh?.parent?.remove(this.mesh);
        this.cssObject?.element?.remove();
        this.cssObject?.parent?.remove(this.cssObject);
        this.labelObject?.element?.remove();
        this.labelObject?.parent?.remove(this.labelObject);
        this.space = null;
        this.mesh = null;
        this.cssObject = null;
        this.labelObject = null;
        this.htmlElement = null;
        this._boundingSphere = null;
    }

    getBoundingSphereRadius() {
        if (!this._boundingSphere) this.updateBoundingSphere();
        return this._boundingSphere?.radius ?? 50;
    }

    updateBoundingSphere() {
        this._boundingSphere = new THREE.Sphere(this.position, 50);
    }

    setSelectedStyle(selected) {
        this.htmlElement?.classList.toggle('selected', selected);
        this.labelObject?.element?.classList.toggle('selected', selected);
    }

    startDrag() {
        this.space?.emit('graph:node:dragstart', { node: this });
    }

    drag(newPosition) {
        if (!isFinite(newPosition.x) || !isFinite(newPosition.y) || !isFinite(newPosition.z)) {
            console.warn(`BaseNode ${this.id}: Attempted to set invalid position (${newPosition.x}, ${newPosition.y}, ${newPosition.z}). Keeping previous position: (${this.position.x}, ${this.position.y}, ${this.position.z}).`);
            return;
        }
        this.position.copy(newPosition);
    }

    endDrag() {
        this.space?.emit('graph:node:dragend', { node: this });
    }
}
