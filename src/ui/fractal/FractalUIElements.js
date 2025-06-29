import * as THREE from 'three';

const AGH_RADIUS = 5; // Arbitrary starting size
const AXIS_LENGTH = 30;
const AXIS_RADIUS = 1;

/**
 * Creates the Adaptive Geometric Hub (AGH) mesh.
 * @returns {THREE.Mesh} The AGH mesh.
 */
export function createAdaptiveGeometricHub() {
    const geometry = new THREE.IcosahedronGeometry(AGH_RADIUS, 0); // Simple icosahedron
    const material = new THREE.MeshStandardMaterial({
        color: 0x8888ff, // Light blue/purple
        transparent: true,
        opacity: 0.7,
        roughness: 0.3,
        metalness: 0.2,
    });
    const agh = new THREE.Mesh(geometry, material);
    agh.name = 'AdaptiveGeometricHub';
    agh.userData.isFractalUIElement = true;
    agh.visible = false; // Initially hidden
    return agh;
}

/**
 * Creates the fractal axis manipulator meshes (X, Y, Z).
 * @returns {THREE.Group} A group containing the X, Y, and Z axis meshes.
 */
export function createFractalAxisManipulators() {
    const axisGroup = new THREE.Group();
    axisGroup.name = 'FractalAxisManipulators';

    const axisMaterialX = new THREE.MeshStandardMaterial({
        color: 0xff0000, // Red
        roughness: 0.5,
        metalness: 0.1,
    });
    const axisMaterialY = new THREE.MeshStandardMaterial({
        color: 0x00ff00, // Green
        roughness: 0.5,
        metalness: 0.1,
    });
    const axisMaterialZ = new THREE.MeshStandardMaterial({
        color: 0x0000ff, // Blue
        roughness: 0.5,
        metalness: 0.1,
    });

    const axisGeometry = new THREE.CylinderGeometry(AXIS_RADIUS, AXIS_RADIUS, AXIS_LENGTH, 8);

    // X-axis
    const xAxisMesh = new THREE.Mesh(axisGeometry, axisMaterialX);
    xAxisMesh.name = 'FractalAxis_X';
    xAxisMesh.userData.isFractalUIElement = true;
    xAxisMesh.userData.axis = 'x';
    xAxisMesh.rotation.z = -Math.PI / 2; // Align cylinder along X
    xAxisMesh.position.x = AXIS_LENGTH / 2;
    axisGroup.add(xAxisMesh);

    // Y-axis
    const yAxisMesh = new THREE.Mesh(axisGeometry, axisMaterialY);
    yAxisMesh.name = 'FractalAxis_Y';
    yAxisMesh.userData.isFractalUIElement = true;
    yAxisMesh.userData.axis = 'y';
    yAxisMesh.position.y = AXIS_LENGTH / 2; // Align cylinder along Y (default)
    axisGroup.add(yAxisMesh);

    // Z-axis
    const zAxisMesh = new THREE.Mesh(axisGeometry, axisMaterialZ);
    zAxisMesh.name = 'FractalAxis_Z';
    zAxisMesh.userData.isFractalUIElement = true;
    zAxisMesh.userData.axis = 'z';
    zAxisMesh.rotation.x = Math.PI / 2; // Align cylinder along Z
    zAxisMesh.position.z = AXIS_LENGTH / 2;
    axisGroup.add(zAxisMesh);

    // Add cone heads for directionality
    const coneGeometry = new THREE.ConeGeometry(AXIS_RADIUS * 2, AXIS_RADIUS * 4, 8);

    const xCone = new THREE.Mesh(coneGeometry, axisMaterialX);
    xCone.name = 'FractalAxisHead_X';
    xCone.userData.isFractalUIElement = true;
    xCone.userData.axis = 'x';
    xCone.position.x = AXIS_LENGTH;
    xCone.rotation.z = -Math.PI / 2;
    axisGroup.add(xCone);

    const yCone = new THREE.Mesh(coneGeometry, axisMaterialY);
    yCone.name = 'FractalAxisHead_Y';
    yCone.userData.isFractalUIElement = true;
    yCone.userData.axis = 'y';
    yCone.position.y = AXIS_LENGTH;
    axisGroup.add(yCone);

    const zCone = new THREE.Mesh(coneGeometry, axisMaterialZ);
    zCone.name = 'FractalAxisHead_Z';
    zCone.userData.isFractalUIElement = true;
    zCone.userData.axis = 'z';
    zCone.position.z = AXIS_LENGTH;
    zCone.rotation.x = Math.PI / 2;
    axisGroup.add(zCone);

    axisGroup.visible = false; // Initially hidden
    return axisGroup;
}

// Future:
// export function createTransformModeBranch() { ... }
// export function createActionsModeBranch() { ... }
// export function createRotationToolFractal() { ... }
// export function createScaleToolFractal() { ... }

/**
 * Scales the fractal UI elements to maintain a consistent apparent size on screen.
 * @param {THREE.Object3D} fractalElement - The fractal UI element to scale.
 * @param {THREE.Camera} camera - The current camera.
 * @param {number} referenceDistance - A reference distance at which the element has scale 1.
 * @param {THREE.Vector3} worldPosition - The world position of the fractal element.
 */
export function updateFractalUIScale(fractalElement, camera, referenceDistance = 500, worldPosition) {
    if (!fractalElement || !camera || !worldPosition) return;
    const distance = worldPosition.distanceTo(camera.position);
    const scaleFactor = distance / referenceDistance;
    fractalElement.scale.set(scaleFactor, scaleFactor, scaleFactor);
}

/**
 * Highlights or de-highlights a fractal UI element.
 * @param {THREE.Mesh} fractalMesh - The mesh of the fractal element.
 * @param {boolean} isActive - True to highlight, false to reset.
 * @param {THREE.Color} [originalColor] - Optional original color to restore. If not provided and not already in userData, current material color is used as base.
 * @param {boolean} [isGrabbed=false] - Optional flag for a more distinct "grabbed" state (takes precedence over general active/hover).
 */
export function setFractalElementActive(fractalMesh, isActive, originalColor, isGrabbed = false) {
    if (!fractalMesh || !fractalMesh.material) return;

    // Ensure original properties are stored in userData for restoration
    if (originalColor && !fractalMesh.userData.originalColor) {
        fractalMesh.userData.originalColor = originalColor.clone();
    }
    if (fractalMesh.material.opacity && fractalMesh.userData.originalOpacity === undefined) {
        fractalMesh.userData.originalOpacity = fractalMesh.material.opacity;
    }
    if (fractalMesh.material.emissive && fractalMesh.userData.originalEmissive === undefined) {
        fractalMesh.userData.originalEmissive = fractalMesh.material.emissive.getHex();
    }

    const baseColor = fractalMesh.userData.originalColor || (fractalMesh.material.color ? fractalMesh.material.color.clone() : new THREE.Color(0xffffff));
    const baseOpacity = fractalMesh.userData.originalOpacity !== undefined ? fractalMesh.userData.originalOpacity : 0.7;
    const baseEmissive = fractalMesh.userData.originalEmissive !== undefined ? fractalMesh.userData.originalEmissive : 0x000000;


    if (isActive) {
        let activeColor;
        let activeOpacity;
        // Default emissive intensity for grab. For hover, it's smaller.
        let emissiveIntensity = isGrabbed ? 0.5 : 0.2;

        if (isGrabbed) {
            // Grabbed state: significantly brighter, more opaque, and stronger emissive effect.
            activeColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.5); // Lerp towards white.
            activeOpacity = Math.min(1, baseOpacity * 1.3); // Increase opacity.
            if (fractalMesh.material.emissive) {
                // Use the brightened color as the emissive base, then scale by intensity.
                fractalMesh.material.emissive.copy(activeColor).multiplyScalar(emissiveIntensity);
            }
        } else {
            // Hovered state (active but not grabbed): moderately brighter, slightly more opaque, slight emissive.
            activeColor = baseColor.clone().multiplyScalar(1.5); // Standard hover brighten.
            activeColor.r = Math.max(0, Math.min(1, activeColor.r));
            activeColor.g = Math.max(0, Math.min(1, activeColor.g));
            activeColor.b = Math.max(0, Math.min(1, activeColor.b));
            activeOpacity = Math.min(1, baseOpacity * 1.1);
            if (fractalMesh.material.emissive) {
                 // Slight emissive for hover
                fractalMesh.material.emissive.copy(activeColor).multiplyScalar(0.2);
            }
        }
        fractalMesh.material.color.set(activeColor);
        fractalMesh.material.opacity = activeOpacity;

    } else { // Not active (neither hovered nor grabbed)
        fractalMesh.material.color.set(baseColor);
        fractalMesh.material.opacity = baseOpacity;
        if (fractalMesh.material.emissive) {
            fractalMesh.material.emissive.setHex(baseEmissive);
        }
    }
    fractalMesh.material.needsUpdate = true;
}

/**
 * Applies a visual change to an axis manipulator for semantic zoom.
 * This typically involves scaling the manipulator's thickness and potentially other visual cues.
 * @param {THREE.Group} manipulatorGroup - The THREE.Group containing all axis manipulator parts (cylinders and cones).
 * @param {'x' | 'y' | 'z'} axisType - The specific axis ('x', 'y', or 'z') to apply the zoom effect to.
 * @param {number} zoomLevel - An integer representing the zoom level (e.g., 0 for normal, positive for zoom-in, negative for zoom-out).
 */
export function applySemanticZoomToAxis(manipulatorGroup, axisType, zoomLevel) {
    if (!manipulatorGroup) return;

    const axisCylinderName = `FractalAxis_${axisType.toUpperCase()}`;
    const axisConeName = `FractalAxisHead_${axisType.toUpperCase()}`;

    const axisCylinder = manipulatorGroup.getObjectByName(axisCylinderName);
    const axisCone = manipulatorGroup.getObjectByName(axisConeName);

    if (!axisCylinder || !axisCone) {
        console.warn(`Axis parts not found for ${axisType}`);
        return;
    }

    // Store original scales if not already present
    if (axisCylinder.userData.originalScale === undefined) {
        axisCylinder.userData.originalScale = axisCylinder.scale.clone();
    }
    if (axisCone.userData.originalScale === undefined) {
        axisCone.userData.originalScale = axisCone.scale.clone();
    }

    const baseScaleCylinder = axisCylinder.userData.originalScale;
    const baseScaleCylinder = axisCylinder.userData.originalScale;
    const baseScaleCone = axisCone.userData.originalScale;

    let radialScaleFactor = 1.0; // Factor to scale the thickness/radius
    if (zoomLevel > 0) { // Zoom in
        radialScaleFactor = 1.0 + zoomLevel * 0.2; // Increase thickness by 20% per zoom level
    } else if (zoomLevel < 0) { // Zoom out
        radialScaleFactor = Math.max(0.5, 1.0 + zoomLevel * 0.2); // Decrease thickness, min 50%
    }
    // Note: Length of the axis manipulators is not changed by semantic zoom here, only thickness.

    // Apply non-uniform scale: keep length axis at 1 (relative to base), scale other two for thickness.
    // The specific axes to scale for thickness depend on the initial orientation of the geometry
    // and the rotations applied to align them with world X, Y, Z.
    if (axisType === 'x') {
        // X-axis manipulator (cylinder/cone) is typically rotated -90deg around Z.
        // Its original geometry's height (length) is along its local Y.
        // Its radius is defined by its local X and Z.
        // So, to change thickness, scale local Y and Z of the mesh. Length is local X.
        axisCylinder.scale.set(baseScaleCylinder.x, baseScaleCylinder.y * radialScaleFactor, baseScaleCylinder.z * radialScaleFactor);
        axisCone.scale.set(baseScaleCone.x, baseScaleCone.y * radialScaleFactor, baseScaleCone.z * radialScaleFactor);

        // Visual cue for X-axis zoom: temporary emissive change (as per plan for Iteration 1).
        if (zoomLevel !== 0) {
            if (axisCylinder.material.emissive && axisCylinder.userData.originalEmissive === undefined) {
                // Store original emissive only if not already stored by setFractalElementActive
                axisCylinder.userData.originalEmissiveForZoom = axisCylinder.material.emissive.getHex();
            }
            if (axisCylinder.material.emissive) {
                axisCylinder.material.emissive.setHex(zoomLevel > 0 ? 0x550000 : 0x220000); // Dark red emissive, slightly brighter for zoom in
            }
        } else {
            // Reset emissive if it was changed by zoom
            if (axisCylinder.material.emissive && axisCylinder.userData.originalEmissiveForZoom !== undefined) {
                axisCylinder.material.emissive.setHex(axisCylinder.userData.originalEmissiveForZoom);
            } else if (axisCylinder.material.emissive && axisCylinder.userData.originalEmissive !== undefined) {
                // Fallback to the general original emissive if one for zoom wasn't specifically set
                 axisCylinder.material.emissive.setHex(axisCylinder.userData.originalEmissive);
            } else if (axisCylinder.material.emissive) {
                axisCylinder.material.emissive.setHex(0x000000); // Default to no emissive
            }
        }
        if (axisCylinder.material.needsUpdate) axisCylinder.material.needsUpdate = true;

    } else if (axisType === 'y') {
        // Y-axis manipulator is typically not rotated.
        // Its original geometry's height (length) is along its local Y.
        // Its radius is defined by its local X and Z.
        // To change thickness, scale local X and Z of the mesh. Length is local Y.
        axisCylinder.scale.set(baseScaleCylinder.x * radialScaleFactor, baseScaleCylinder.y, baseScaleCylinder.z * radialScaleFactor);
        axisCone.scale.set(baseScaleCone.x * radialScaleFactor, baseScaleCone.y, baseScaleCone.z * radialScaleFactor);
    } else if (axisType === 'z') {
        // Z-axis manipulator is typically rotated 90deg around X.
        // Its original geometry's height (length) is along its local Y.
        // Its radius is defined by its local X and Z.
        // After rotation, to change thickness, scale local X and Y of the mesh. Length is local Z.
        axisCylinder.scale.set(baseScaleCylinder.x * radialScaleFactor, baseScaleCylinder.y * radialScaleFactor, baseScaleCylinder.z);
        axisCone.scale.set(baseScaleCone.x * radialScaleFactor, baseScaleCone.y * radialScaleFactor, baseScaleCone.z);
    }
    // For this iteration, only X-axis gets the special emissive visual cue as per plan.
    // Other axes just get scaling. The main material's needsUpdate is handled by UIManager when resetting hover.
}
