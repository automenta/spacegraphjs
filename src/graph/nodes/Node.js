import * as THREE from 'three';
import { Utils } from '../../utils.js';

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
    /** @type {import('../../ui/Metaframe').Metaframe | null} */
    metaframe = null;

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

    getCapabilities() {
        return {
            canEditContent: false,      // e.g., for direct text editing or specific content UI
            canZoomContent: false,      // e.g., for scaling content within an HtmlNode
            canEditProperties: true,    // General properties panel
            canLink: true,              // Can be a source/target for links
            canDelete: true,            // Can be deleted
            canBeResized: true,         // If the node's bounding box/scale can be changed. Metaframe handles will honor this.
            canBeDragged: true,         // If the node can be moved. Metaframe drag handle will honor this.
        };
    }

    update(_space) {
        if (this.mesh) this.mesh.position.copy(this.position);
        if (this.cssObject) this.cssObject.position.copy(this.position);
        if (this.labelObject) this.labelObject.position.copy(this.position);
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
    }

    getBoundingSphereRadius() {
        // Fallback or for physics if needed.
        if (this.mesh && this.mesh.geometry) {
            if (!this.mesh.geometry.boundingSphere) {
                this.mesh.geometry.computeBoundingSphere();
            }
            if (this.mesh.geometry.boundingSphere) {
                 return this.mesh.geometry.boundingSphere.radius * Math.max(this.mesh.scale.x, this.mesh.scale.y, this.mesh.scale.z);
            }
        }
        return 50; // Default if no mesh or geometry
    }

    /**
     * Returns the node's actual size after scaling its geometry's bounding box.
     * @returns {THREE.Vector3 | null} A new Vector3 instance representing the (width, height, depth), or null.
     */
    getActualSize() {
        if (!this.mesh || !this.mesh.geometry) return null;

        if (!this.mesh.geometry.boundingBox) {
            this.mesh.geometry.computeBoundingBox();
        }

        // If boundingBox is still null (e.g. for an empty geometry), return null or a default.
        if (!this.mesh.geometry.boundingBox) {
            console.warn(`Node ${this.id}: Mesh geometry lacks a boundingBox.`);
            return new THREE.Vector3(1,1,1); // Or return null and handle upstream
        }

        const size = new THREE.Vector3();
        this.mesh.geometry.boundingBox.getSize(size); // Gets size of unscaled geometry
        size.multiply(this.mesh.scale); // Apply node's scale
        return size;
    }

    setSelectedStyle(_selected) {
        // This method is intended to be overridden by subclasses for custom selection styling.
    }

    setPosition(pos, y, z) {
        const { x, _y, _z } = typeof pos === 'object' && pos !== null ? pos : { x: pos, _y: y, _z: z };
        const finalY = _y ?? 0;
        const finalZ = _z ?? 0;

        if (!isFinite(x) || !isFinite(finalY) || !isFinite(finalZ)) {
            console.warn(`BaseNode.setPosition: Attempted to set invalid position for node ${this.id}:`, {
                x,
                y: finalY,
                z: finalZ,
            });
            return;
        }
        this.position.set(x, finalY, finalZ);
    }

    startDrag() {
        // Any setup needed when dragging begins
    }

    drag(newPosition) {
        this.setPosition(newPosition);
    }

    endDrag() {
        // Any cleanup needed when dragging ends
    }

    resize(newScale) {
        if (this.mesh) {
            this.mesh.scale.copy(newScale);
        }
        this.metaframe?.update();
    }
}
