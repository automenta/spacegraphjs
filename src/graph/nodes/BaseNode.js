import * as THREE from 'three';
import { Utils } from '../../utils.js';

export class BaseNode {
    space = null;
    position = new THREE.Vector3();
    data = {};
    mass = 1.0;
    id = null;
    mesh = null; // For 3D object nodes
    cssObject = null; // For HTML nodes
    labelObject = null; // For 3D labels on ShapeNodes
    isPinned = false;

    constructor(id, position = { x: 0, y: 0, z: 0 }, data = {}, mass = 1.0) {
        this.id = id ?? Utils.generateId('node');
        this.position.set(position.x, position.y, position.z);
        this.data = Utils.mergeDeep({}, this.getDefaultData(), data);
        this.mass = Math.max(0.1, mass);
        this.isPinned = this.data.isPinned ?? false;
    }

    getDefaultData() {
        return { label: '' };
    }

    update(_space) {
        /* Base update logic */
    }

    dispose() {
        this.mesh?.geometry?.dispose();
        this.mesh?.material?.dispose();
        this.mesh?.parent?.remove(this.mesh);
        this.cssObject?.element?.remove(); // Remove HTML element if it exists
        this.cssObject?.parent?.remove(this.cssObject);
        this.labelObject?.element?.remove(); // Remove label element if it exists
        this.labelObject?.parent?.remove(this.labelObject);
        this.space = null;
        this.mesh = null;
        this.cssObject = null;
        this.labelObject = null;
    }

    getBoundingSphereRadius() {
        return 50;
    }

    setSelectedStyle(_selected) {
        /* Base selection style logic */
    }

    setPosition(x, y, z) {
        this.position.set(x, y, z);
    }

    startDrag() {
        // Emits an event that LayoutPlugin (or InteractionPlugin) will listen to.
        this.space?.emit('node:dragstart', this);
    }

    drag(newPosition) {
        const oldPosition = this.position.clone();
        this.setPosition(newPosition.x, newPosition.y, newPosition.z);
        // Emits an event with the node and its new/old positions.
        this.space?.emit('node:drag', { node: this, newPosition: this.position, oldPosition });
    }

    endDrag() {
        // Emits an event that LayoutPlugin (or InteractionPlugin) will listen to.
        this.space?.emit('node:dragend', this);
    }
}
