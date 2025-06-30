import * as THREE from 'three';
import { Utils } from '../../utils.js';
import { Metaframe } from '../../ui/Metaframe.js';

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
            canEditContent: false, // e.g., for direct text editing or specific content UI
            canZoomContent: false, // e.g., for scaling content within an HtmlNode
            canEditProperties: true, // General properties panel
            canLink: true, // Can be a source/target for links
            canDelete: true, // Can be deleted
            canBeResized: true, // If the node's bounding box/scale can be changed. Metaframe handles will honor this.
            canBeDragged: true, // If the node can be moved. Metaframe drag handle will honor this.
        };
    }

    setRotation(quaternion) {
        if (this.mesh) {
            this.mesh.quaternion.copy(quaternion);
        }
        // CSSObject rotation will be handled by subclass or by update method
    }

    update(_space) {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            // Ensure mesh quaternion is authoritative if it exists
        }
        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            if (this.mesh) {
                // If there's a mesh, sync cssObject's quaternion to it
                this.cssObject.quaternion.copy(this.mesh.quaternion);
            }
        }
        if (this.labelObject) {
            this.labelObject.position.copy(this.position);
            // Assuming labelObject doesn't need separate rotation from the node itself
            // or it's handled by its own update mechanism if it's a CSS2DObject/CSS3DObject
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
    }

    getBoundingSphereRadius() {
        // Fallback or for physics if needed.
        if (this.mesh && this.mesh.geometry) {
            if (!this.mesh.geometry.boundingSphere) {
                this.mesh.geometry.computeBoundingSphere();
            }
            if (this.mesh.geometry.boundingSphere) {
                return (
                    this.mesh.geometry.boundingSphere.radius *
                    Math.max(this.mesh.scale.x, this.mesh.scale.y, this.mesh.scale.z)
                );
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
            // console.warn(`Node ${this.id}: Mesh geometry lacks a boundingBox.`);
            return new THREE.Vector3(1, 1, 1); // Or return null and handle upstream
        }

        const size = new THREE.Vector3();
        this.mesh.geometry.boundingBox.getSize(size); // Gets size of unscaled geometry
        size.multiply(this.mesh.scale); // Apply node's scale
        return size;
    }

    setSelectedStyle(_selected) {
        // This method is intended to be overridden by subclasses for custom selection styling.
        // Basic implementation for nodes that might have a metaframe
        const metaframe = this.ensureMetaframe(); // Ensure it's created
        if (metaframe) {
            if (_selected) {
                metaframe.show();
            } else {
                // UIManager's hover logic will show it again if needed for hover.
                metaframe.hide();
            }
        }
    }

    ensureMetaframe() {
        if (!this.metaframe && this.space) {
            const renderingPlugin = this.space.plugins.getPlugin('RenderingPlugin');
            if (renderingPlugin) {
                const webglScene = renderingPlugin.getWebGLScene();
                const cssScene = renderingPlugin.getCSS3DScene();

                if (webglScene && cssScene) {
                    this.metaframe = new Metaframe(this, this.space, webglScene, cssScene);
                } else {
                    // console.error(`Node ${this.id}: Cannot create Metaframe, missing scenes. Ensure RenderingPlugin is loaded and provides scenes.`);
                }
            } else {
                // console.error(`Node ${this.id}: Cannot create Metaframe, missing RenderingPlugin.`);
            }
        }
        return this.metaframe;
    }

    setPosition(pos, y, z) {
        const { x, _y, _z } = typeof pos === 'object' && pos !== null ? pos : { x: pos, _y: y, _z: z };
        const finalY = _y ?? 0;
        const finalZ = _z ?? 0;

        if (!isFinite(x) || !isFinite(finalY) || !isFinite(finalZ)) {
            // console.warn(`BaseNode.setPosition: Attempted to set invalid position for node ${this.id}:`, {
            //     x,
            //     y: finalY,
            //     z: finalZ,
            // });
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

    // Default resize methods. Specific node types can override these.
    startResize() {
        // Default behavior: no specific action on resize start.
        // Node types like HtmlNode override this for custom visual feedback or state changes.
    }

    resize(newWorldDimensions) {
        if (this.mesh && this.mesh.geometry) {
            if (!this.mesh.geometry.boundingBox) {
                this.mesh.geometry.computeBoundingBox();
            }

            if (this.mesh.geometry.boundingBox) {
                const geometrySize = new THREE.Vector3();
                this.mesh.geometry.boundingBox.getSize(geometrySize);

                // Avoid division by zero if geometry has no size
                const newScale = new THREE.Vector3(
                    geometrySize.x > 0 ? newWorldDimensions.x / geometrySize.x : 1,
                    geometrySize.y > 0 ? newWorldDimensions.y / geometrySize.y : 1,
                    geometrySize.z > 0 ? newWorldDimensions.z / geometrySize.z : 1
                );
                this.mesh.scale.copy(newScale);
            } else {
                // Fallback if boundingBox is not available (e.g. empty geometry)
                // This might happen for nodes that are not supposed to be scaled or have no visual mesh
                // console.warn(`Node ${this.id}: Cannot compute scale factor due to missing boundingBox. Applying dimensions as scale.`);
                this.mesh.scale.copy(newWorldDimensions);
            }
        } else if (this.mesh) {
            // If there's a mesh but no geometry (less common, but possible for abstract meshes)
            // or if we want to treat the scale as direct world dimensions for some reason (like HtmlNode's 1x1 plane)
            // For generic nodes, this path is less likely if they have standard geometry.
            // This behavior is similar to HtmlNode's specific resize.
            // console.warn(`Node ${this.id}: Mesh geometry not available for precise scaling. Applying dimensions as scale.`);
            this.mesh.scale.copy(newWorldDimensions);
        }
        this.metaframe?.update();
    }

    endResize() {
        // Default behavior: no specific action on resize end.
        // Node types like HtmlNode override this for custom visual feedback or state changes.
    }
}
