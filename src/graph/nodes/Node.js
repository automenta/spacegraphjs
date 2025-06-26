import * as THREE from 'three';
import {Utils} from '../../utils.js';

export class Node {
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
        this.setPosition(position);
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

    setPosition(pos, y, z) {
        const { x, _y, _z } = typeof pos === 'object' && pos !== null ? pos : { x: pos, _y: y, _z: z };
        const finalY = _y ?? 0;
        const finalZ = _z ?? 0;

        if (!isFinite(x) || !isFinite(finalY) || !isFinite(finalZ)) {
            console.warn(`BaseNode.setPosition: Attempted to set invalid position for node ${this.id}:`, { x, y: finalY, z: finalZ });
            return;
        }
        this.position.set(x, finalY, finalZ);
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
