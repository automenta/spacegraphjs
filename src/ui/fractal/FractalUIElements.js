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
    const xAxisMesh = new THREE.Mesh(axisGeometry, axisMaterialX.clone()); // Use cloned material for potential individual changes
    xAxisMesh.name = 'FractalAxis_X';
    xAxisMesh.userData.isFractalUIElement = true;
    xAxisMesh.userData.axis = 'x';
    xAxisMesh.rotation.z = -Math.PI / 2; // Align cylinder along X
    xAxisMesh.position.x = AXIS_LENGTH / 2;
    axisGroup.add(xAxisMesh);

    // X-axis Tick Marks (for semantic zoom L2)
    // These are small cylinders perpendicular to the X-axis.
    const perpendicularTickGeom = new THREE.CylinderGeometry(AXIS_RADIUS * 1.2, AXIS_RADIUS * 1.2, AXIS_RADIUS * 0.5, 8);
    for (let i = 0; i < 3; i++) {
        const tickMesh = new THREE.Mesh(perpendicularTickGeom, axisMaterialX.clone());
        tickMesh.name = `FractalAxisTick_X_${i}`;
        tickMesh.userData.isFractalUIElement = true;
        tickMesh.userData.axis = 'x';
        tickMesh.userData.isDetail = true; // Mark as a detail element for semantic zoom
        // Position along X axis, at 1/4, 1/2, 3/4 of its length relative to the manipulator group's origin
        // Assuming the main axis cylinder starts at 0 and extends to AXIS_LENGTH along X.
        // The current xAxisMesh is positioned at AXIS_LENGTH / 2.
        // To place ticks along the bar from one end to the other, relative to axisGroup:
        // If xAxisMesh itself runs from 0 to AXIS_LENGTH, ticks would be at AXIS_LENGTH * (i+1)/4
        // Given current xAxisMesh.position.x = AXIS_LENGTH / 2, its ends are at 0 and AXIS_LENGTH.
        // So, ticks at AXIS_LENGTH * 1/4, AXIS_LENGTH * 1/2, AXIS_LENGTH * 3/4 is fine.
        tickMesh.position.x = (AXIS_LENGTH / (3 + 1)) * (i + 1);
        tickMesh.visible = false; // Initially hidden, shown at specific zoom levels
        axisGroup.add(tickMesh);
    }

    // Y-axis
    const yAxisMesh = new THREE.Mesh(axisGeometry, axisMaterialY.clone());
    yAxisMesh.name = 'FractalAxis_Y';
    yAxisMesh.userData.isFractalUIElement = true;
    yAxisMesh.userData.axis = 'y';
    yAxisMesh.position.y = AXIS_LENGTH / 2; // Align cylinder along Y (default)
    axisGroup.add(yAxisMesh);

    // Z-axis
    const zAxisMesh = new THREE.Mesh(axisGeometry, axisMaterialZ.clone());
    zAxisMesh.name = 'FractalAxis_Z';
    zAxisMesh.userData.isFractalUIElement = true;
    zAxisMesh.userData.axis = 'z';
    zAxisMesh.rotation.x = Math.PI / 2; // Align cylinder along Z
    zAxisMesh.position.z = AXIS_LENGTH / 2;
    axisGroup.add(zAxisMesh);

    // Add cone heads for directionality
    const coneGeometry = new THREE.ConeGeometry(AXIS_RADIUS * 2, AXIS_RADIUS * 4, 8);

    // Standard X Cone
    const xCone = new THREE.Mesh(coneGeometry, axisMaterialX.clone());
    xCone.name = 'FractalAxisHead_X_Standard'; // Renamed for clarity
    xCone.userData.isFractalUIElement = true;
    xCone.userData.axis = 'x';
    xCone.userData.isDetail = false; // Standard part
    xCone.position.x = AXIS_LENGTH;
    xCone.rotation.z = -Math.PI / 2;
    axisGroup.add(xCone);

    // Elaborate X Cone (for semantic zoom L2)
    const elaborateConeGeometry = new THREE.ConeGeometry(AXIS_RADIUS * 2.5, AXIS_RADIUS * 5, 10); // Slightly larger, more segments
    // Could also add a small torus: new THREE.TorusGeometry(AXIS_RADIUS * 1.8, AXIS_RADIUS * 0.3, 8, 12);
    const xConeElaborate = new THREE.Mesh(elaborateConeGeometry, axisMaterialX.clone());
    xConeElaborate.name = 'FractalAxisHead_X_Elaborate';
    xConeElaborate.userData.isFractalUIElement = true;
    xConeElaborate.userData.axis = 'x';
    xConeElaborate.userData.isDetail = true; // Zoom-specific detail
    xConeElaborate.position.x = AXIS_LENGTH; // Position same as standard, will be toggled
    xConeElaborate.rotation.z = -Math.PI / 2;
    xConeElaborate.visible = false; // Initially hidden
    axisGroup.add(xConeElaborate);


    const yCone = new THREE.Mesh(coneGeometry, axisMaterialY.clone());
    yCone.name = 'FractalAxisHead_Y'; // Standard Y cone, no elaborate version for now
    yCone.userData.isFractalUIElement = true;
    yCone.userData.axis = 'y';
    yCone.userData.isDetail = false;
    yCone.position.y = AXIS_LENGTH;
    axisGroup.add(yCone);

    const zCone = new THREE.Mesh(coneGeometry, axisMaterialZ.clone());
    zCone.name = 'FractalAxisHead_Z'; // Standard Z cone
    zCone.userData.isFractalUIElement = true;
    zCone.userData.axis = 'z';
    zCone.userData.isDetail = false;
    zCone.position.z = AXIS_LENGTH;
    zCone.rotation.x = Math.PI / 2;
    axisGroup.add(zCone);

    // Store references to these new detail elements for easy access in applySemanticZoomToAxis
    xAxisMesh.userData.tickMarks = [];
    for (let i = 0; i < 3; i++) {
        const tick = axisGroup.getObjectByName(`FractalAxisTick_X_${i}`);
        if (tick) xAxisMesh.userData.tickMarks.push(tick);
    }
    xAxisMesh.userData.standardCone = xCone;
    xAxisMesh.userData.elaborateCone = xConeElaborate;


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
    // Store original scale for grab effect, if not already present
    // Ensure original visual properties are stored in userData for restoration
    if (originalColor && !fractalMesh.userData.originalColor) {
        fractalMesh.userData.originalColor = originalColor.clone();
    }
    if (fractalMesh.material.opacity !== undefined && fractalMesh.userData.originalOpacity === undefined) {
        fractalMesh.userData.originalOpacity = fractalMesh.material.opacity;
    }
    if (fractalMesh.material.emissive && fractalMesh.userData.originalEmissive === undefined) {
        fractalMesh.userData.originalEmissive = fractalMesh.material.emissive.getHex();
    }
    // Note: originalScaleForTransform is not used here anymore, using preGrabScale for temporary grab scaling

    const baseColor = fractalMesh.userData.originalColor || (fractalMesh.material.color ? fractalMesh.material.color.clone() : new THREE.Color(0xffffff));
    const baseOpacity = fractalMesh.userData.originalOpacity !== undefined ? fractalMesh.userData.originalOpacity : 0.7;
    const baseEmissiveHex = fractalMesh.userData.originalEmissive !== undefined ? fractalMesh.userData.originalEmissive : 0x000000;

    // Store the true original emissive (pre-any-effect)
    if (fractalMesh.material.emissive && fractalMesh.userData.originalEmissive === undefined) {
        fractalMesh.userData.originalEmissive = fractalMesh.material.emissive.getHex();
    }

    const baseColor = fractalMesh.userData.originalColor || (fractalMesh.material.color ? fractalMesh.material.color.clone() : new THREE.Color(0xffffff));
    const baseOpacity = fractalMesh.userData.originalOpacity !== undefined ? fractalMesh.userData.originalOpacity : 0.7;
    // originalEmissive is the true base, before any zoom or hover/grab effect.
    const baseEmissiveHex = fractalMesh.userData.originalEmissive !== undefined ? fractalMesh.userData.originalEmissive : 0x000000;

    // Handle SCALING for grab effect
    if (isGrabbed && isActive) { // Apply scale effect only when grab starts
        if (fractalMesh.userData.preGrabScale === undefined) {
            fractalMesh.userData.preGrabScale = fractalMesh.scale.clone();
        }
        fractalMesh.scale.copy(fractalMesh.userData.preGrabScale).multiplyScalar(1.10); // 10% increase for grab
    } else if (!isActive || !isGrabbed) { // Restore scale if not grabbed or if deactivating
        if (fractalMesh.userData.preGrabScale !== undefined) {
            fractalMesh.scale.copy(fractalMesh.userData.preGrabScale);
            delete fractalMesh.userData.preGrabScale;
        }
    }

    if (isActive) {
        const activeColorMod = new THREE.Color(0xffffff); // Color to lerp towards for highlight

        if (isGrabbed) {
            fractalMesh.material.color.copy(baseColor).lerp(activeColorMod, 0.55); // Brighter color
            fractalMesh.material.opacity = Math.min(1, baseOpacity * 1.35); // More opaque
            if (fractalMesh.material.emissive) {
                fractalMesh.material.emissive.setHex(0xFFFF77); // Distinct bright yellow emissive for grab
            }
        } else { // Hovered (isActive = true, but not grabbed)
            fractalMesh.material.color.copy(baseColor).lerp(activeColorMod, 0.25);
            fractalMesh.material.opacity = Math.min(1, baseOpacity * 1.2);
            if (fractalMesh.material.emissive) {
                // For hover, make its current color (which might be from zoom) a bit emissive
                const currentEmissiveVal = fractalMesh.material.color.clone().multiplyScalar(0.35);
                fractalMesh.material.emissive.copy(currentEmissiveVal);
            }
        }
    } else { // Not active (isActive = false), restore to appropriate state
        fractalMesh.material.color.copy(baseColor);
        fractalMesh.material.opacity = baseOpacity;

        const currentZoomLevel = fractalMesh.userData.zoomLevel;
        const isZoomed = currentZoomLevel !== undefined && currentZoomLevel !== 0;

        if (fractalMesh.material.emissive) {
            if (isZoomed) {
                // If it's zoomed, its appearance (including emissive) should be dictated by applySemanticZoomToAxis.
                // This re-applies the zoom visuals, including emissive, for the current zoom level.
                if (fractalMesh.parent && fractalMesh.userData.axis && typeof applySemanticZoomToAxis === 'function') {
                    applySemanticZoomToAxis(fractalMesh.parent, fractalMesh.userData.axis, currentZoomLevel);
                } else {
                    // Fallback if proper re-application of zoom visuals isn't possible here
                    fractalMesh.material.emissive.setHex(baseEmissiveHex);
                }
            } else {
                // Not zoomed, restore to the true original base emissive
                fractalMesh.material.emissive.setHex(baseEmissiveHex);
            }
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

    // Determine main cylinder and standard cone names
    const axisCylinderName = `FractalAxis_${axisType.toUpperCase()}`;
    let axisStandardConeName = `FractalAxisHead_${axisType.toUpperCase()}`;
    if (axisType === 'x') { // X-axis has renamed standard cone
        axisStandardConeName = `FractalAxisHead_X_Standard`;
    }

    const axisCylinder = manipulatorGroup.getObjectByName(axisCylinderName);
    const standardCone = manipulatorGroup.getObjectByName(axisStandardConeName);

    if (!axisCylinder || !standardCone) {
        console.warn(`Axis parts (cylinder or standard cone) not found for ${axisType}`);
        return;
    }

    // Store original scales if not already present
    if (axisCylinder.userData.originalScale === undefined) {
        axisCylinder.userData.originalScale = axisCylinder.scale.clone();
    }
    if (standardCone.userData.originalScale === undefined) {
        standardCone.userData.originalScale = standardCone.scale.clone();
    }
    // For X-axis elaborate cone and ticks, original scale is implicitly (1,1,1) as they are created with base size
    // or should be stored if their creation size is not their 'base' for zoom level 0.
    // They are initially hidden, so their scale when first shown can be considered their 'zoomed' scale.

    const baseScaleCylinder = axisCylinder.userData.originalScale;
    const baseScaleCone = standardCone.userData.originalScale;

    let radialScaleFactor = 1.0; // Factor to scale the thickness/radius
    // Define radial scale factor based on zoom level, affecting thickness
    // More pronounced changes for L1 and L2
    if (zoomLevel === 1) radialScaleFactor = 1.3;
    else if (zoomLevel === 2) radialScaleFactor = 1.6;
    else if (zoomLevel > 2) radialScaleFactor = 1.6 + (zoomLevel - 2) * 0.1; // Diminishing returns beyond L2
    else if (zoomLevel === -1) radialScaleFactor = 0.7;
    else if (zoomLevel < -1) radialScaleFactor = Math.max(0.5, 0.7 + (zoomLevel + 1) * 0.1); // Cap at 0.5
    // else zoomLevel === 0, radialScaleFactor = 1.0;

    // Helper function to manage emissive color for zoom (remains mostly the same)
    const manageEmissiveForZoom = (element, targetAxisType, currentZoomLevel) => {
        if (!element || !element.material || !element.material.emissive) return;
        if (element.userData.originalEmissive === undefined && element.userData.originalEmissiveForZoom === undefined) {
            element.userData.originalEmissiveForZoom = element.material.emissive.getHex();
        }
        const resetEmissiveHex = element.userData.originalEmissive !== undefined
            ? element.userData.originalEmissive
            : (element.userData.originalEmissiveForZoom !== undefined ? element.userData.originalEmissiveForZoom : 0x000000);

        if (currentZoomLevel !== 0) {
            let emissiveHex = 0x000000;
            // Stronger emissive for higher zoom
            const intensityFactor = Math.abs(currentZoomLevel) === 1 ? 0.6 : 0.9; // L1 vs L2+
            const darkIntensityFactor = Math.abs(currentZoomLevel) === 1 ? 0.3 : 0.5;

            switch (targetAxisType) {
                case 'x': emissiveHex = currentZoomLevel > 0 ? new THREE.Color(0xff0000).multiplyScalar(intensityFactor).getHex() : new THREE.Color(0xff0000).multiplyScalar(darkIntensityFactor).getHex(); break;
                case 'y': emissiveHex = currentZoomLevel > 0 ? new THREE.Color(0x00ff00).multiplyScalar(intensityFactor).getHex() : new THREE.Color(0x00ff00).multiplyScalar(darkIntensityFactor).getHex(); break;
                case 'z': emissiveHex = currentZoomLevel > 0 ? new THREE.Color(0x0000ff).multiplyScalar(intensityFactor).getHex() : new THREE.Color(0x0000ff).multiplyScalar(darkIntensityFactor).getHex(); break;
            }
            element.material.emissive.setHex(emissiveHex);
        } else {
            element.material.emissive.setHex(resetEmissiveHex);
        }
        element.material.needsUpdate = true;
    };

    // Apply scaling and emissive changes to the main cylinder and standard cone
    if (axisType === 'x') {
        axisCylinder.scale.set(baseScaleCylinder.x, baseScaleCylinder.y * radialScaleFactor, baseScaleCylinder.z * radialScaleFactor);
        // Cone scaling for zoom out, specific handling for zoom in L2
        if (zoomLevel === -1) {
            standardCone.scale.set(baseScaleCone.x * 0.8, baseScaleCone.y * 0.8, baseScaleCone.z * 0.8);
        } else if (zoomLevel < -1) {
            standardCone.scale.set(baseScaleCone.x * 0.7, baseScaleCone.y * 0.7, baseScaleCone.z * 0.7);
        } else if (zoomLevel !== 2) { // For L0, L1, and L > 2 (not L2)
            standardCone.scale.copy(baseScaleCone); // Reset to base or use radial if desired
        }
        // If zoomLevel is 2, standardCone will be hidden, elaborateCone shown.
        // For other positive levels, standardCone remains at baseScaleCone.

        manageEmissiveForZoom(axisCylinder, 'x', zoomLevel);
        manageEmissiveForZoom(standardCone, 'x', zoomLevel);
    } else if (axisType === 'y' || axisType === 'z') { // Y and Z axes (no special details for now)
        if (axisType === 'y') {
            axisCylinder.scale.set(baseScaleCylinder.x * radialScaleFactor, baseScaleCylinder.y, baseScaleCylinder.z * radialScaleFactor);
            if (zoomLevel < 0) standardCone.scale.set(baseScaleCone.x * 0.8, baseScaleCone.y * 0.8, baseScaleCone.z * 0.8); else standardCone.scale.copy(baseScaleCone);
        } else { // Z-axis
            axisCylinder.scale.set(baseScaleCylinder.x * radialScaleFactor, baseScaleCylinder.y * radialScaleFactor, baseScaleCylinder.z);
            if (zoomLevel < 0) standardCone.scale.set(baseScaleCone.x * 0.8, baseScaleCone.y * 0.8, baseScaleCone.z * 0.8); else standardCone.scale.copy(baseScaleCone);
        }
        manageEmissiveForZoom(axisCylinder, axisType, zoomLevel);
        manageEmissiveForZoom(standardCone, axisType, zoomLevel);
    }

    // X-axis specific details (tick marks, elaborate cone)
    if (axisType === 'x') {
        const elaborateCone = manipulatorGroup.getObjectByName('FractalAxisHead_X_Elaborate');
        const tickMarks = axisCylinder.userData.tickMarks || [];

        if (zoomLevel === 2) {
            standardCone.visible = false;
            if (elaborateCone) {
                elaborateCone.visible = true;
                // Ensure original scale for elaborate cone is set if not done at creation
                if (elaborateCone.userData.originalScale === undefined) elaborateCone.userData.originalScale = elaborateCone.scale.clone();
                elaborateCone.scale.copy(elaborateCone.userData.originalScale); // Use its own base scale
                manageEmissiveForZoom(elaborateCone, 'x', zoomLevel); // Apply emissive
            }
            tickMarks.forEach(tick => {
                tick.visible = true;
                // Define tick scale, e.g., make them more prominent
                if (tick.userData.originalScale === undefined) tick.userData.originalScale = tick.scale.clone();
                tick.scale.copy(tick.userData.originalScale).multiplyScalar(radialScaleFactor * 0.8); // Scale with radial factor but smaller
                manageEmissiveForZoom(tick, 'x', zoomLevel);
            });
        } else { // For any other zoom level (0, 1, -1, etc.)
            standardCone.visible = true;
            if (elaborateCone) elaborateCone.visible = false;
            tickMarks.forEach(tick => tick.visible = false);
        }
    }


    // Ensure materials update if not handled by manageEmissiveForZoom (e.g. if only scale changed)
    if (axisCylinder && !axisCylinder.material.needsUpdate) axisCylinder.material.needsUpdate = true;
    if (standardCone && !standardCone.material.needsUpdate) standardCone.material.needsUpdate = true;
    // Also for X-axis details
    if (axisType === 'x') {
        const elaborateCone = manipulatorGroup.getObjectByName('FractalAxisHead_X_Elaborate');
        if (elaborateCone && elaborateCone.visible && !elaborateCone.material.needsUpdate) elaborateCone.material.needsUpdate = true;
        (axisCylinder.userData.tickMarks || []).forEach(tick => {
            if (tick.visible && !tick.material.needsUpdate) tick.material.needsUpdate = true;
        });
    }
}
