import * as THREE from 'three';

const AXIS_LENGTH = 100;
const AXIS_HEAD_LENGTH = 20;
const AXIS_HEAD_WIDTH = 10;
const PLANE_HANDLE_SIZE = 20; // Size of the square plane handles
const ROTATION_RING_RADIUS = AXIS_LENGTH * 0.75;
const ROTATION_RING_THICKNESS = 5;
const ROTATION_RING_SEGMENTS = 32;
const SCALE_HANDLE_SIZE = 15;
const SCALE_HANDLE_OFFSET = AXIS_LENGTH + SCALE_HANDLE_SIZE / 2; // Position at the end of axis lines
const UNIFORM_SCALE_HANDLE_SIZE = 20;

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
            xy: new THREE.MeshBasicMaterial({
                color: 0xffff00,
                depthTest: false,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide,
            }),
            yz: new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                depthTest: false,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide,
            }),
            xz: new THREE.MeshBasicMaterial({
                color: 0xff00ff,
                depthTest: false,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide,
            }),
            rotX: new THREE.MeshBasicMaterial({
                color: 0xff0000,
                depthTest: false,
                transparent: true,
                side: THREE.DoubleSide,
                opacity: 0.7,
            }),
            rotY: new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                depthTest: false,
                transparent: true,
                side: THREE.DoubleSide,
                opacity: 0.7,
            }),
            rotZ: new THREE.MeshBasicMaterial({
                color: 0x0000ff,
                depthTest: false,
                transparent: true,
                side: THREE.DoubleSide,
                opacity: 0.7,
            }),
            scaleX: new THREE.MeshBasicMaterial({ color: 0xff3333, depthTest: false, transparent: true }), // Lighter Red
            scaleY: new THREE.MeshBasicMaterial({ color: 0x33ff33, depthTest: false, transparent: true }), // Lighter Green
            scaleZ: new THREE.MeshBasicMaterial({ color: 0x3333ff, depthTest: false, transparent: true }), // Lighter Blue
            scaleUniform: new THREE.MeshBasicMaterial({ color: 0xaaaaaa, depthTest: false, transparent: true }), // Grey
            hover: new THREE.MeshBasicMaterial({ depthTest: false, transparent: true }), // Color will be set on hover
        };
        /**
         * @private
         * @property {Object<string, THREE.Material>} _originalMaterials - Stores original materials of handles for hover reset.
         */
        this._originalMaterials = {};

        this._createAxisHandles();
        this._createPlaneHandles();
        this._createRotationHandles();
        this._createScaleHandles();

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
     * @private
     * Creates the X, Y, and Z rotation ring handles.
     */
    _createRotationHandles() {
        const ringGeometry = new THREE.TorusGeometry(
            ROTATION_RING_RADIUS,
            ROTATION_RING_THICKNESS,
            8,
            ROTATION_RING_SEGMENTS
        );

        // Rotate X (around X axis, so ring is in YZ plane)
        const rotXRing = new THREE.Mesh(ringGeometry, this._materials.rotX);
        rotXRing.rotation.y = Math.PI / 2;
        rotXRing.userData = { type: 'gizmo', gizmoType: 'rotate', axis: 'x', part: 'ring', isGizmoHandle: true };
        this._originalMaterials.x_ring = this._materials.rotX;
        this.handles.add(rotXRing);

        // Rotate Y (around Y axis, so ring is in XZ plane)
        const rotYRing = new THREE.Mesh(ringGeometry, this._materials.rotY);
        rotYRing.rotation.x = Math.PI / 2;
        rotYRing.userData = { type: 'gizmo', gizmoType: 'rotate', axis: 'y', part: 'ring', isGizmoHandle: true };
        this._originalMaterials.y_ring = this._materials.rotY;
        this.handles.add(rotYRing);

        // Rotate Z (around Z axis, so ring is in XY plane)
        const rotZRing = new THREE.Mesh(ringGeometry, this._materials.rotZ);
        // No rotation needed as TorusGeometry defaults to XY plane
        rotZRing.userData = { type: 'gizmo', gizmoType: 'rotate', axis: 'z', part: 'ring', isGizmoHandle: true };
        this._originalMaterials.z_ring = this._materials.rotZ;
        this.handles.add(rotZRing);
    }

    /**
     * @private
     * Creates the X, Y, Z, and uniform scale handles (cubes).
     */
    _createScaleHandles() {
        const scaleHandleGeom = new THREE.BoxGeometry(SCALE_HANDLE_SIZE, SCALE_HANDLE_SIZE, SCALE_HANDLE_SIZE);

        // X Scale Handle
        const scaleXHandle = new THREE.Mesh(scaleHandleGeom, this._materials.scaleX);
        scaleXHandle.position.x = SCALE_HANDLE_OFFSET;
        scaleXHandle.userData = { type: 'gizmo', gizmoType: 'scale', axis: 'x', part: 'cube', isGizmoHandle: true };
        this._originalMaterials.x_cube = this._materials.scaleX;
        this.handles.add(scaleXHandle);

        // Y Scale Handle
        const scaleYHandle = new THREE.Mesh(scaleHandleGeom, this._materials.scaleY);
        scaleYHandle.position.y = SCALE_HANDLE_OFFSET;
        scaleYHandle.userData = { type: 'gizmo', gizmoType: 'scale', axis: 'y', part: 'cube', isGizmoHandle: true };
        this._originalMaterials.y_cube = this._materials.scaleY;
        this.handles.add(scaleYHandle);

        // Z Scale Handle
        const scaleZHandle = new THREE.Mesh(scaleHandleGeom, this._materials.scaleZ);
        scaleZHandle.position.z = SCALE_HANDLE_OFFSET;
        scaleZHandle.userData = { type: 'gizmo', gizmoType: 'scale', axis: 'z', part: 'cube', isGizmoHandle: true };
        this._originalMaterials.z_cube = this._materials.scaleZ;
        this.handles.add(scaleZHandle);

        // Uniform Scale Handle (center)
        const uniformScaleHandleGeom = new THREE.BoxGeometry(
            UNIFORM_SCALE_HANDLE_SIZE,
            UNIFORM_SCALE_HANDLE_SIZE,
            UNIFORM_SCALE_HANDLE_SIZE
        );
        const uniformScaleHandle = new THREE.Mesh(uniformScaleHandleGeom, this._materials.scaleUniform);
        uniformScaleHandle.position.set(0, 0, 0); // Positioned at the gizmo's origin
        uniformScaleHandle.userData = {
            type: 'gizmo',
            gizmoType: 'scale',
            axis: 'xyz',
            part: 'cube',
            isGizmoHandle: true,
        };
        this._originalMaterials.xyz_cube = this._materials.scaleUniform;
        this.handles.add(uniformScaleHandle);
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
        const gizmoType = handleMesh.userData.gizmoType; // Added to distinguish between translate, rotate, scale parts for same axis
        const originalMatKey = `${axis}_${partType}`; // This key might need adjustment if colors are shared e.g. x_arrow and x_ring

        // Find the correct original material. This logic assumes that arrow, plane, ring, cube for a given axis might have distinct base colors
        // or we might want to fetch specifically e.g. this._materials.x for x-arrow, this._materials.rotX for x-ring
        let originalMaterial = this._originalMaterials[originalMatKey];
        if (!originalMaterial) {
            // Fallback for more complex keys or if a specific part type isn't in _originalMaterials with that exact key
            switch (gizmoType) {
                case 'translate':
                    if (partType === 'arrow')
                        originalMaterial = this._materials[axis]; // e.g., this._materials.x
                    else if (partType === 'plane') originalMaterial = this._materials[axis]; // e.g., this._materials.xy
                    break;
                case 'rotate':
                    originalMaterial = this._materials['rot' + axis.toUpperCase()]; // e.g., this._materials.rotX
                    break;
                case 'scale':
                    if (axis === 'xyz') originalMaterial = this._materials.scaleUniform;
                    else originalMaterial = this._materials['scale' + axis.toUpperCase()]; // e.g., this._materials.scaleX
                    break;
            }
        }

        if (isActive) {
            let hoverColor;
            if (originalMaterial && originalMaterial.color) {
                hoverColor = originalMaterial.color.clone().multiplyScalar(1.3);
                hoverColor.r = Math.max(0, Math.min(1, hoverColor.r));
                hoverColor.g = Math.max(0, Math.min(1, hoverColor.g));
                hoverColor.b = Math.max(0, Math.min(1, hoverColor.b));
            } else {
                hoverColor = new THREE.Color(0xffffff);
            }
            this._materials.hover.color.set(hoverColor);
            this._materials.hover.opacity = originalMaterial ? (originalMaterial.opacity || 1.0) * 1.1 : 0.8;
            // Ensure opacity doesn't exceed 1
            if (this._materials.hover.opacity > 1.0) this._materials.hover.opacity = 1.0;

            // Apply hover to all components of the same logical handle
            // (e.g., both line and head of an arrow)
            this.handles.children.forEach((child) => {
                if (
                    child.userData.isGizmoHandle &&
                    child.userData.gizmoType === gizmoType &&
                    child.userData.axis === axis &&
                    child.userData.part === partType
                ) {
                    child.material = this._materials.hover;
                }
            });
        } else {
            this.handles.children.forEach((child) => {
                if (
                    child.userData.isGizmoHandle &&
                    child.userData.gizmoType === gizmoType &&
                    child.userData.axis === axis &&
                    child.userData.part === partType
                ) {
                    let originalMatToRestore = this._originalMaterials[`${child.userData.axis}_${child.userData.part}`];
                    if (!originalMatToRestore) {
                        switch (child.userData.gizmoType) {
                            case 'translate':
                                if (child.userData.part === 'arrow')
                                    originalMatToRestore = this._materials[child.userData.axis];
                                else if (child.userData.part === 'plane')
                                    originalMatToRestore = this._materials[child.userData.axis];
                                break;
                            case 'rotate':
                                originalMatToRestore = this._materials['rot' + child.userData.axis.toUpperCase()];
                                break;
                            case 'scale':
                                if (child.userData.axis === 'xyz') originalMatToRestore = this._materials.scaleUniform;
                                else
                                    originalMatToRestore = this._materials['scale' + child.userData.axis.toUpperCase()];
                                break;
                        }
                    }
                    if (originalMatToRestore) {
                        child.material = originalMatToRestore;
                    }
                }
            });
        }
    }

    /**
     * Resets all gizmo handles to their inactive visual state.
     */
    resetHandlesState() {
        this.handles.children.forEach((child) => {
            if (child.userData.isGizmoHandle) {
                const originalMatKey = `${child.userData.axis}_${child.userData.part}`;
                let originalMaterial = this._originalMaterials[originalMatKey];

                if (!originalMaterial) {
                    // Fallback logic similar to setHandleActive
                    switch (child.userData.gizmoType) {
                        case 'translate':
                            if (child.userData.part === 'arrow')
                                originalMaterial = this._materials[child.userData.axis];
                            else if (child.userData.part === 'plane')
                                originalMaterial = this._materials[child.userData.axis];
                            break;
                        case 'rotate':
                            originalMaterial = this._materials['rot' + child.userData.axis.toUpperCase()];
                            break;
                        case 'scale':
                            if (child.userData.axis === 'xyz') originalMaterial = this._materials.scaleUniform;
                            else originalMaterial = this._materials['scale' + child.userData.axis.toUpperCase()];
                            break;
                    }
                }

                if (originalMaterial) {
                    child.material = originalMaterial;
                } else {
                    // Fallback if somehow a material is still not found, though this should not happen with proper _originalMaterials setup
                    // console.warn('Original material not found for gizmo handle:', child.userData);
                }
            }
        });
    }

    /**
     * Disposes of the gizmo's materials and geometries.
     */
    dispose() {
        Object.values(this._materials).forEach((material) => material.dispose());
        this.handles.children.forEach((handle) => {
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
TranslationGizmo.getAxisVector = function (axis) {
    switch (axis) {
        case 'x':
            return new THREE.Vector3(1, 0, 0);
        case 'y':
            return new THREE.Vector3(0, 1, 0);
        case 'z':
            return new THREE.Vector3(0, 0, 1);
        default:
            return new THREE.Vector3();
    }
};

/**
 * Static helper to get a normalized world plane normal vector based on plane axis identifier.
 * @static
 * @param {string} planeAxis - Plane identifier ('xy', 'yz', 'xz').
 * @returns {THREE.Vector3} The normalized plane normal vector.
 */
TranslationGizmo.getPlaneNormal = function (planeAxis) {
    switch (planeAxis) {
        case 'xy':
            return new THREE.Vector3(0, 0, 1); // Normal is Z
        case 'yz':
            return new THREE.Vector3(1, 0, 0); // Normal is X
        case 'xz':
            return new THREE.Vector3(0, 1, 0); // Normal is Y
        default:
            return new THREE.Vector3();
    }
};
