import * as THREE from 'three';
import { Utils } from '../../utils.js';

export class BaseNode {
    space = null;
    position = new THREE.Vector3();
    data = {};
    mass = 1.0;
    id = null;
    mesh = null;
    cssObject = null;
    labelObject = null;
    isPinned = false;

    constructor(id, position = { x: 0, y: 0, z: 0 }, data = {}, mass = 1.0) {
        this.id = id ?? Utils.generateId('node');
        if (!isFinite(position.x) || !isFinite(position.y) || !isFinite(position.z)) {
            this.position.set(0, 0, 0);
        } else {
            this.position.set(position.x, position.y, position.z);
        }
        this.data = Utils.mergeDeep({}, this.getDefaultData(), data);
        this.mass = Math.max(0.1, mass);
        this.isPinned = this.data.isPinned ?? false;
    }

    getDefaultData() {
        return { label: '' };
    }

    update(_space) {}

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
    }

    getBoundingSphereRadius() {
        return 50;
    }

    setSelectedStyle(_selected) {}

    setPosition(x, y, z) {
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
            return;
        }
        this.position.set(x, y, z);
    }

    startDrag() {
        this.space?.emit('graph:node:dragstart', { node: this });
    }

    drag(newPosition) {
        this.setPosition(newPosition.x, newPosition.y, newPosition.z);
    }

    endDrag() {
        this.space?.emit('graph:node:dragend', { node: this });
    }
}
