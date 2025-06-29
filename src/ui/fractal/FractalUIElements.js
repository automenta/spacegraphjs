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

    // Check current zoom level. If zoomed, zoom's emissive takes precedence.
    const currentZoomLevel = fractalMesh.userData.zoomLevel;
    const isZoomed = currentZoomLevel !== undefined && currentZoomLevel !== 0;

    if (isActive) {
        let activeColorValue;
        let activeOpacityValue;
        let emissiveIntensity = isGrabbed ? 0.5 : 0.2;

        if (isGrabbed) {
            activeColorValue = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.5);
            activeOpacityValue = Math.min(1, baseOpacity * 1.3);
            if (fractalMesh.material.emissive && !isZoomed) { // Only set grab emissive if not actively zoomed
                fractalMesh.material.emissive.copy(activeColorValue).multiplyScalar(emissiveIntensity);
            }
        } else { // Hovered state (active but not grabbed)
            activeColorValue = baseColor.clone().multiplyScalar(1.5); // Standard hover brighten
            activeColorValue.r = Math.max(0, Math.min(1, activeColorValue.r));
            activeColorValue.g = Math.max(0, Math.min(1, activeColorValue.g));
            activeColorValue.b = Math.max(0, Math.min(1, activeColorValue.b));
            activeOpacityValue = Math.min(1, baseOpacity * 1.1);
            if (fractalMesh.material.emissive && !isZoomed) { // Only set hover emissive if not actively zoomed
                fractalMesh.material.emissive.copy(activeColorValue).multiplyScalar(0.2);
            }
        }
        fractalMesh.material.color.set(activeColorValue);
        fractalMesh.material.opacity = activeOpacityValue;
    } else { // Not active (neither hovered nor grabbed)
        fractalMesh.material.color.set(baseColor);
        fractalMesh.material.opacity = baseOpacity;
        if (fractalMesh.material.emissive && !isZoomed) { // Only reset to base emissive if not actively zoomed
            fractalMesh.material.emissive.setHex(baseEmissive);
        }
    }

    // If the element is zoomed, its emissive color is managed by applySemanticZoomToAxis.
    // If it's NOT zoomed, and it became inactive, ensure its emissive is reset to base.
    // If it IS zoomed, and it became inactive, its emissive should remain the zoom emissive.
    // The logic above handles not touching emissive if isZoomed.
    // If !isActive && isZoomed, emissive is already what it should be (zoom emissive).
    // If !isActive && !isZoomed, emissive is reset to baseEmissive.

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
    // const baseScaleCylinder = axisCylinder.userData.originalScale; // Duplicate line removed
    const baseScaleCone = axisCone.userData.originalScale;

    let radialScaleFactor = 1.0; // Factor to scale the thickness/radius
    if (zoomLevel > 0) { // Zoom in
        radialScaleFactor = 1.0 + zoomLevel * 0.2; // Increase thickness by 20% per zoom level
    } else if (zoomLevel < 0) { // Zoom out
        radialScaleFactor = Math.max(0.5, 1.0 + zoomLevel * 0.2); // Decrease thickness, min 50%
    }

    // Helper function to manage emissive color for zoom
    const manageEmissiveForZoom = (element, targetAxisType, currentZoomLevel) => {
        if (!element.material || !element.material.emissive) return;

        // Store original emissive if not already stored by setFractalElementActive or a previous zoom
        if (element.userData.originalEmissive === undefined && element.userData.originalEmissiveForZoom === undefined) {
            element.userData.originalEmissiveForZoom = element.material.emissive.getHex();
        }
        // If originalEmissive was set by setFractalElementActive, prioritize that for reset,
        // unless originalEmissiveForZoom was specifically set (e.g. if element wasn't 'active' but got zoomed)
        const resetEmissiveHex = element.userData.originalEmissive !== undefined
            ? element.userData.originalEmissive
            : (element.userData.originalEmissiveForZoom !== undefined ? element.userData.originalEmissiveForZoom : 0x000000);


        if (currentZoomLevel !== 0) {
            let emissiveHex = 0x000000;
            switch (targetAxisType) {
                case 'x':
                    emissiveHex = currentZoomLevel > 0 ? 0x550000 : 0x220000; // Dark red
                    break;
                case 'y':
                    emissiveHex = currentZoomLevel > 0 ? 0x005500 : 0x002200; // Dark green
                    break;
                case 'z':
                    emissiveHex = currentZoomLevel > 0 ? 0x000055 : 0x000022; // Dark blue
                    break;
            }
            element.material.emissive.setHex(emissiveHex);
        } else {
            // Reset emissive to its original state before zoom
            element.material.emissive.setHex(resetEmissiveHex);
        }
        element.material.needsUpdate = true;
    };

    // Apply scaling and emissive changes
    if (axisType === 'x') {
        axisCylinder.scale.set(baseScaleCylinder.x, baseScaleCylinder.y * radialScaleFactor, baseScaleCylinder.z * radialScaleFactor);
        axisCone.scale.set(baseScaleCone.x, baseScaleCone.y * radialScaleFactor, baseScaleCone.z * radialScaleFactor);
        manageEmissiveForZoom(axisCylinder, 'x', zoomLevel);
        manageEmissiveForZoom(axisCone, 'x', zoomLevel); // Also apply to cone head
    } else if (axisType === 'y') {
        axisCylinder.scale.set(baseScaleCylinder.x * radialScaleFactor, baseScaleCylinder.y, baseScaleCylinder.z * radialScaleFactor);
        axisCone.scale.set(baseScaleCone.x * radialScaleFactor, baseScaleCone.y, baseScaleCone.z * radialScaleFactor);
        manageEmissiveForZoom(axisCylinder, 'y', zoomLevel);
        manageEmissiveForZoom(axisCone, 'y', zoomLevel);
    } else if (axisType === 'z') {
        axisCylinder.scale.set(baseScaleCylinder.x * radialScaleFactor, baseScaleCylinder.y * radialScaleFactor, baseScaleCylinder.z);
        axisCone.scale.set(baseScaleCone.x * radialScaleFactor, baseScaleCone.y * radialScaleFactor, baseScaleCone.z);
        manageEmissiveForZoom(axisCylinder, 'z', zoomLevel);
        manageEmissiveForZoom(axisCone, 'z', zoomLevel);
    }

    // Ensure materials update if not handled by manageEmissiveForZoom (e.g. if only scale changed)
    if (!axisCylinder.material.needsUpdate) axisCylinder.material.needsUpdate = true;
    if (!axisCone.material.needsUpdate) axisCone.material.needsUpdate = true;
}
