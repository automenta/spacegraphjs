import * as THREE from 'three';
import {Utils} from '../utils.js';
import {applyLabelLOD, createCSS3DLabelObject} from '../rendering/LabelManager.js';

/**
 * Base class for all node types, providing common functionality
 */
export class BaseNode {
    id = null;
    position = new THREE.Vector3();
    data = {};
    mass = 1.0;
    space = null;
    mesh = null;
    cssObject = null;
    labelObject = null;
    isPinned = false;
    isSelected = false;
    isHovered = false;
    _boundingSphere = null;

    constructor(id, position = {x: 0, y: 0, z: 0}, data = {}, mass = 1.0) {
        this.id = id ?? Utils.generateId('node');
        this.setPosition(position);
        this.data = Utils.mergeDeep({}, this.getDefaultData(), data);
        this.mass = Math.max(0.1, mass);
        this.isPinned = this.data.isPinned ?? false;
    }

    /**
     * Returns the default data for this node type
     * @returns {Object} Default data object
     */
    getDefaultData() {
        return {label: ''};
    }

    /**
     * Sets the position of the node
     * @param {Object|number} pos - Position object or x coordinate
     * @param {number} [y] - Y coordinate (if pos is x)
     * @param {number} [z] - Z coordinate (if pos is x)
     */
    setPosition(pos, y, z) {
        const {x, _y, _z} = typeof pos === 'object' && pos !== null ? pos : {x: pos, _y: y, _z: z};
        const finalY = _y ?? 0;
        const finalZ = _z ?? 0;

        if (!isFinite(x) || !isFinite(finalY) || !isFinite(finalZ)) {
            console.warn(`BaseNode.setPosition: Attempted to set invalid position for node ${this.id}:`, {
                x,
                y: finalY,
                z: finalZ
            });
            return;
        }
        this.position.set(x, finalY, finalZ);
    }

    /**
     * Updates the node's visual representation
     * @param {SpaceGraph} space - The space graph instance
     */
    update(space) {
        // Update mesh position if it exists
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }

        // Update CSS object position if it exists
        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            if (this.data.billboard && space?._cam) {
                this.cssObject.quaternion.copy(space._cam.quaternion);
            }
        }

        // Update label position if it exists
        if (this.labelObject) {
            this._updateLabelPosition(space);
        }
    }

    /**
     * Updates the label position - can be overridden by subclasses
     * @param {SpaceGraph} space - The space graph instance
     * @protected
     */
    _updateLabelPosition(space) {
        const offset = this.getBoundingSphereRadius() * 1.1 + 10;
        this.labelObject.position.copy(this.position).y += offset;
        if (space?._cam) this.labelObject.quaternion.copy(space._cam.quaternion);
        applyLabelLOD(this.labelObject, this.data.labelLod, space);
    }

    /**
     * Creates a label object for the node
     * @param {Object} styleData - Style data for the label
     * @returns {CSS3DObject} The created label object
     * @protected
     */
    _createLabel(styleData = {}) {
        const defaultStyle = {
            color: 'var(--sg-node-text)',
            backgroundColor: 'var(--sg-label-bg, rgba(10, 10, 20, 0.75))',
            fontSize: '14px',
        };
        const mergedStyle = {...defaultStyle, ...styleData};
        return createCSS3DLabelObject(this.data.label, this.id, 'node-label-3d', mergedStyle, 'node-label');
    }

    /**
     * Sets the selected style for the node
     * @param {boolean} selected - Whether the node is selected
     */
    setSelectedStyle(selected) {
        this.isSelected = selected;
        
        // Toggle CSS class on HTML elements
        this.cssObject?.element?.classList.toggle('selected', selected);
        this.labelObject?.element?.classList.toggle('selected', selected);
        
        // Handle mesh highlighting if not overridden by subclass
        if (this.mesh && !this._customMeshHighlighting) {
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.emissive?.setHex(selected ? 0xFFFF00 : 0x000000);
                    child.material.emissiveIntensity = (selected && child.material.emissive?.getHex() !== 0x000000) ? 1.0 : 0.0;
                }
            });
        }
        
        if (selected && this.isHovered) this.setHoverStyle(false, true);
    }

    /**
     * Sets the hover style for the node
     * @param {boolean} hovered - Whether the node is hovered
     * @param {boolean} force - Whether to force the hover state
     */
    setHoverStyle(hovered, force = false) {
        if (!force && this.isSelected) return;

        this.isHovered = hovered;

        // Handle CSS class toggling
        if (!this.isSelected) {
            this.cssObject?.element?.classList.toggle('hovered', hovered);
            this.labelObject?.element?.classList.toggle('hovered', hovered);
        }

        // Handle mesh hover effect if not overridden by subclass
        if (this.mesh && !this._customMeshHighlighting) {
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    const targetEmissive = hovered && !this.isSelected ? 0x222200 : 0x000000;
                    const targetIntensity = hovered && !this.isSelected ? 0.4 : 0.0;
                    child.material.emissive?.setHex(targetEmissive);
                    child.material.emissiveIntensity = (targetEmissive !== 0x000000) ? targetIntensity : 0.0;
                }
            });
        }
    }

    /**
     * Gets the bounding sphere radius for the node
     * @returns {number} The bounding sphere radius
     */
    getBoundingSphereRadius() {
        if (this._boundingSphere?.radius) {
            return this._boundingSphere.radius;
        }
        return 50; // Default fallback
    }

    /**
     * Updates the bounding sphere for the node
     * @protected
     */
    updateBoundingSphere() {
        if (!this._boundingSphere) {
            this._boundingSphere = new THREE.Sphere();
        }
        this._boundingSphere.radius = this.getBoundingSphereRadius();
        this._boundingSphere.center.copy(this.position);
    }

    /**
     * Called when dragging starts
     */
    startDrag() {
        this.space?.emit('graph:node:dragstart', {node: this});
    }

    /**
     * Called when dragging occurs
     * @param {THREE.Vector3} newPosition - The new position
     */
    drag(newPosition) {
        this.setPosition(newPosition.x, newPosition.y, newPosition.z);
    }

    /**
     * Called when dragging ends
     */
    endDrag() {
        this.space?.emit('graph:node:dragend', {node: this});
    }

    /**
     * Disposes of the node's resources
     */
    dispose() {
        // Dispose of mesh and its materials
        if (this.mesh) {
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.geometry?.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material?.dispose();
                    }
                }
            });
            this.mesh.parent?.remove(this.mesh);
            this.mesh = null;
        }

        // Remove CSS objects
        this.cssObject?.element?.remove();
        this.cssObject?.parent?.remove(this.cssObject);
        this.cssObject = null;

        // Remove label objects
        this.labelObject?.element?.remove();
        this.labelObject?.parent?.remove(this.labelObject);
        this.labelObject = null;

        // Clear references
        this.space = null;
    }
}