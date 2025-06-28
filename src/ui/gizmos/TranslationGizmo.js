import * as THREE from 'three';

const AXIS_LENGTH = 100;
const AXIS_HEAD_LENGTH = 20;
const AXIS_HEAD_WIDTH = 10;
const PLANE_HANDLE_SIZE = 20; // Size of the square plane handles

/**
 * @class TranslationGizmo
 * @extends THREE.Object3D
 * Represents a 3D translation gizmo with handles for X, Y, Z axes and XY, YZ, XZ planes.
 * Manages its own visual appearance, including handle meshes and materials.
 */
export class TranslationGizmo extends THREE.Object3D {
    /**
     * Creates an instance of TranslationGizmo.
     */
    constructor() {
        super();
        this.name = 'TranslationGizmo';

        /**
         * @property {THREE.Object3D} handles - Group containing all interactive mesh parts of the gizmo.
         */
        this.handles = new THREE.Object3D();
        this.add(this.handles);

        /**
         * @private
         * @property {Object<string, THREE.MeshBasicMaterial>} _materials - Collection of materials used for gizmo parts.
         */
        this._materials = {
            x: new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false, transparent: true }),
            y: new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false, transparent: true }),
            z: new THREE.MeshBasicMaterial({ color: 0x0000ff, depthTest: false, transparent: true }),
            xy: new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
            yz: new THREE.MeshBasicMaterial({ color: 0x00ffff, depthTest: false, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
            xz: new THREE.MeshBasicMaterial({ color: 0xff00ff, depthTest: false, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
            hover: new THREE.MeshBasicMaterial({ depthTest: false, transparent: true }) // Color will be set on hover
        };
        /**
         * @private
         * @property {Object<string, THREE.Material>} _originalMaterials - Stores original materials of handles for hover reset.
         */
        this._originalMaterials = {};

        this._createAxisHandles();
        this._createPlaneHandles();

        this.visible = false; // Start hidden
        this.renderOrder = 1000; // Ensure gizmo renders on top
    }

    /**
     * @private
     * Creates the X, Y, and Z axis arrow handles (line + cone).
     */
    _createAxisHandles() {
        const lineRadius = 1.5;
        const headRadius = AXIS_HEAD_WIDTH / 2;

        // X Axis
        const xLineGeom = new THREE.CylinderGeometry(lineRadius, lineRadius, AXIS_LENGTH - AXIS_HEAD_LENGTH, 8);
        const xHeadGeom = new THREE.ConeGeometry(headRadius, AXIS_HEAD_LENGTH, 8);

        const xAxisLine = new THREE.Mesh(xLineGeom, this._materials.x);
        xAxisLine.position.x = (AXIS_LENGTH - AXIS_HEAD_LENGTH) / 2;
        xAxisLine.rotation.z = -Math.PI / 2;
        xAxisLine.userData = { type: 'gizmo', gizmoType: 'translate', axis: 'x', part: 'arrow', isGizmoHandle: true };
        this._originalMaterials.x_arrow = this._materials.x;

        const xAxisHead = new THREE.Mesh(xHeadGeom, this._materials.x);
        xAxisHead.position.x = AXIS_LENGTH - AXIS_HEAD_LENGTH / 2;
        xAxisHead.rotation.z = -Math.PI / 2;
        xAxisHead.userData = { type: 'gizmo', gizmoType: 'translate', axis: 'x', part: 'arrow', isGizmoHandle: true };
        this.handles.add(xAxisLine, xAxisHead);

        // Y Axis
        const yLineGeom = new THREE.CylinderGeometry(lineRadius, lineRadius, AXIS_LENGTH - AXIS_HEAD_LENGTH, 8);
        const yHeadGeom = new THREE.ConeGeometry(headRadius, AXIS_HEAD_LENGTH, 8);

        const yAxisLine = new THREE.Mesh(yLineGeom, this._materials.y);
        yAxisLine.position.y = (AXIS_LENGTH - AXIS_HEAD_LENGTH) / 2;
        yAxisLine.userData = { type: 'gizmo', gizmoType: 'translate', axis: 'y', part: 'arrow', isGizmoHandle: true };
        this._originalMaterials.y_arrow = this._materials.y;

        const yAxisHead = new THREE.Mesh(yHeadGeom, this._materials.y);
        yAxisHead.position.y = AXIS_LENGTH - AXIS_HEAD_LENGTH / 2;
        yAxisHead.userData = { type: 'gizmo', gizmoType: 'translate', axis: 'y', part: 'arrow', isGizmoHandle: true };
        this.handles.add(yAxisLine, yAxisHead);

        // Z Axis
        const zLineGeom = new THREE.CylinderGeometry(lineRadius, lineRadius, AXIS_LENGTH - AXIS_HEAD_LENGTH, 8);
        const zHeadGeom = new THREE.ConeGeometry(headRadius, AXIS_HEAD_LENGTH, 8);

        const zAxisLine = new THREE.Mesh(zLineGeom, this._materials.z);
        zAxisLine.position.z = (AXIS_LENGTH - AXIS_HEAD_LENGTH) / 2;
        zAxisLine.rotation.x = Math.PI / 2;
        zAxisLine.userData = { type: 'gizmo', gizmoType: 'translate', axis: 'z', part: 'arrow', isGizmoHandle: true };
        this._originalMaterials.z_arrow = this._materials.z;

        const zAxisHead = new THREE.Mesh(zHeadGeom, this._materials.z);
        zAxisHead.position.z = AXIS_LENGTH - AXIS_HEAD_LENGTH / 2;
        zAxisHead.rotation.x = Math.PI / 2;
        zAxisHead.userData = { type: 'gizmo', gizmoType: 'translate', axis: 'z', part: 'arrow', isGizmoHandle: true };
        this.handles.add(zAxisLine, zAxisHead);
    }

    /**
     * @private
     * Creates the XY, YZ, and XZ plane handles.
     */
    _createPlaneHandles() {
        const planeGeom = new THREE.PlaneGeometry(PLANE_HANDLE_SIZE, PLANE_HANDLE_SIZE);
        const planeOffset = AXIS_LENGTH * 0.25;

        const xyPlane = new THREE.Mesh(planeGeom, this._materials.xy);
        xyPlane.position.set(planeOffset, planeOffset, 0);
        xyPlane.userData = { type: 'gizmo', gizmoType: 'translate', axis: 'xy', part: 'plane', isGizmoHandle: true };
        this._originalMaterials.xy_plane = this._materials.xy;
        this.handles.add(xyPlane);

        const yzPlane = new THREE.Mesh(planeGeom, this._materials.yz);
        yzPlane.position.set(0, planeOffset, planeOffset);
        yzPlane.rotation.y = Math.PI / 2;
        yzPlane.userData = { type: 'gizmo', gizmoType: 'translate', axis: 'yz', part: 'plane', isGizmoHandle: true };
        this._originalMaterials.yz_plane = this._materials.yz;
        this.handles.add(yzPlane);

        const xzPlane = new THREE.Mesh(planeGeom, this._materials.xz);
        xzPlane.position.set(planeOffset, 0, planeOffset);
        xzPlane.rotation.x = -Math.PI / 2;
        xzPlane.userData = { type: 'gizmo', gizmoType: 'translate', axis: 'xz', part: 'plane', isGizmoHandle: true };
        this._originalMaterials.xz_plane = this._materials.xz;
        this.handles.add(xzPlane);
    }

    /**
     * Updates the gizmo's scale to maintain a consistent apparent size on screen
     * relative to the camera distance.
     * @param {THREE.Camera} camera - The current camera.
     */
    updateScale(camera) {
        const distance = this.position.distanceTo(camera.position);
        const scaleFactor = distance / 500; // Adjust 500 to a suitable reference distance for unit scale
        this.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

    /**
     * Shows the gizmo.
     */
    show() {
        this.visible = true;
    }

    /**
     * Hides the gizmo.
     */
    hide() {
        this.visible = false;
    }

    /**
     * Sets the visual state of a specific gizmo handle (e.g., on hover or during drag).
     * @param {THREE.Mesh} handleMesh - The mesh of the gizmo handle part.
     * @param {boolean} isActive - True to set active/hover state, false to reset to normal.
     */
    setHandleActive(handleMesh, isActive) {
        if (!handleMesh || !handleMesh.userData.isGizmoHandle) return;

        const partType = handleMesh.userData.part;
        const axis = handleMesh.userData.axis;
        const originalMatKey = `${axis}_${partType}`;

        const originalMaterial = this._originalMaterials[originalMatKey];

        if (isActive) {
            let hoverColor;
            if (originalMaterial && originalMaterial.color) { // Check originalMaterial.color exists
                hoverColor = originalMaterial.color.clone().multiplyScalar(1.5);
            } else {
                hoverColor = new THREE.Color(0xffffff); // Default white if original color somehow missing
            }
            this._materials.hover.color.set(hoverColor);
            this._materials.hover.opacity = originalMaterial ? (originalMaterial.opacity || 1.0) * 1.2 : 0.8; // Ensure opacity exists

            this.handles.children.forEach(child => {
                if (child.userData.axis === axis && child.userData.part === partType) {
                    child.material = this._materials.hover;
                }
            });
        } else {
             this.handles.children.forEach(child => {
                if (child.userData.axis === axis && child.userData.part === partType) {
                    const origMatKey = `${child.userData.axis}_${child.userData.part}`;
                    if (this._originalMaterials[origMatKey]) {
                         child.material = this._originalMaterials[origMatKey];
                    }
                }
            });
        }
    }

    /**
     * Resets all gizmo handles to their inactive visual state.
     */
    resetHandlesState() {
        this.handles.children.forEach(child => {
            if (child.userData.isGizmoHandle) {
                const originalMatKey = `${child.userData.axis}_${child.userData.part}`;
                const originalMaterial = this._originalMaterials[originalMatKey];
                if (originalMaterial) {
                    child.material = originalMaterial;
                }
            }
        });
    }

    /**
     * Disposes of the gizmo's materials and geometries.
     */
    dispose() {
        Object.values(this._materials).forEach(material => material.dispose());
        this.handles.children.forEach(handle => {
            handle.geometry?.dispose();
        });
        this.remove(this.handles); // Removes handles group from this gizmo object
    }
}

/**
 * Static helper to get a normalized world axis vector based on axis identifier.
 * @static
 * @param {string} axis - Axis identifier ('x', 'y', 'z').
 * @returns {THREE.Vector3} The normalized axis vector.
 */
TranslationGizmo.getAxisVector = function(axis) {
    switch (axis) {
        case 'x': return new THREE.Vector3(1, 0, 0);
        case 'y': return new THREE.Vector3(0, 1, 0);
        case 'z': return new THREE.Vector3(0, 0, 1);
        default: return new THREE.Vector3();
    }
};

/**
 * Static helper to get a normalized world plane normal vector based on plane axis identifier.
 * @static
 * @param {string} planeAxis - Plane identifier ('xy', 'yz', 'xz').
 * @returns {THREE.Vector3} The normalized plane normal vector.
 */
TranslationGizmo.getPlaneNormal = function(planeAxis) {
    switch (planeAxis) {
        case 'xy': return new THREE.Vector3(0, 0, 1); // Normal is Z
        case 'yz': return new THREE.Vector3(1, 0, 0); // Normal is X
        case 'xz': return new THREE.Vector3(0, 1, 0); // Normal is Y
        default: return new THREE.Vector3();
    }
};
