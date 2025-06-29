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
 * @param {THREE.Group} manipulatorGroup - The THREE.Group containing the manipulator parts.
 * @param {'x' | 'y' | 'z'} axisType - The specific axis ('x', 'y', or 'z').
 * @param {number} zoomLevel - An integer representing the zoom level.
 * @param {'translate' | 'rotate'} [manipulatorType='translate'] - The type of manipulator.
 */
export function applySemanticZoomToAxis(manipulatorGroup, axisType, zoomLevel, manipulatorType = 'translate') {
    if (!manipulatorGroup) return;

    let radialScaleFactor = 1.0;
    // Define radial scale factor based on zoom level, affecting thickness
    // More pronounced changes for L1 and L2
    if (zoomLevel === 1) radialScaleFactor = 1.3;
    else if (zoomLevel === 2) radialScaleFactor = 1.6;
    else if (zoomLevel > 2) radialScaleFactor = 1.6 + (zoomLevel - 2) * 0.1; // Diminishing returns beyond L2
    else if (zoomLevel === -1) radialScaleFactor = 0.7;
    else if (zoomLevel < -1) radialScaleFactor = Math.max(0.5, 0.7 + (zoomLevel + 1) * 0.1); // Cap at 0.5

    const manageEmissiveForZoom = (element, targetAxisType, currentZoomLevel) => {
        if (!element || !element.material || !element.material.emissive) return;
        if (element.userData.originalEmissive === undefined) {
            element.userData.originalEmissive = element.material.emissive.getHex();
        }
        const baseEmissiveHex = element.userData.originalEmissive;

        if (currentZoomLevel !== 0) {
            let intensityFactor = 0.6;
            if (currentZoomLevel === 2) intensityFactor = 1.1;
            else if (currentZoomLevel > 2) intensityFactor = 1.1 + (currentZoomLevel - 2) * 0.1;
            else if (currentZoomLevel < 0) intensityFactor = 0.4;
            const baseColor = element.userData.originalColor || element.material.color;
            let emissiveHex = baseColor.clone().multiplyScalar(currentZoomLevel > 0 ? intensityFactor : intensityFactor * 0.5).getHex();
            element.material.emissive.setHex(emissiveHex);
        } else {
            element.material.emissive.setHex(baseEmissiveHex);
        }
        element.material.needsUpdate = true;
    };

    if (manipulatorType === 'translate') {
        const axisCylinderName = `FractalAxis_${axisType.toUpperCase()}`;
        let axisStandardConeName = `FractalAxisHead_${axisType.toUpperCase()}`;
        if (axisType === 'x') axisStandardConeName = `FractalAxisHead_X_Standard`;

        const axisCylinder = manipulatorGroup.getObjectByName(axisCylinderName);
        const standardCone = manipulatorGroup.getObjectByName(axisStandardConeName);

        if (!axisCylinder || !standardCone) {
            console.warn(`Translation axis parts not found for ${axisType}`);
            return;
        }
        if (axisCylinder.userData.originalScale === undefined) axisCylinder.userData.originalScale = axisCylinder.scale.clone();
        if (standardCone.userData.originalScale === undefined) standardCone.userData.originalScale = standardCone.scale.clone();
        const baseScaleCylinder = axisCylinder.userData.originalScale;
        const baseScaleCone = standardCone.userData.originalScale;

        if (axisType === 'x') {
            axisCylinder.scale.set(baseScaleCylinder.x, baseScaleCylinder.y * radialScaleFactor, baseScaleCylinder.z * radialScaleFactor);
            if (zoomLevel === -1) standardCone.scale.set(baseScaleCone.x * 0.8, baseScaleCone.y * 0.8, baseScaleCone.z * 0.8);
            else if (zoomLevel < -1) standardCone.scale.set(baseScaleCone.x * 0.7, baseScaleCone.y * 0.7, baseScaleCone.z * 0.7);
            else if (zoomLevel !== 2) standardCone.scale.set(baseScaleCone.x * Math.min(1.2, radialScaleFactor), baseScaleCone.y * Math.min(1.2, radialScaleFactor), baseScaleCone.z * Math.min(1.2, radialScaleFactor));
            manageEmissiveForZoom(axisCylinder, 'x', zoomLevel);
        } else if (axisType === 'y' || axisType === 'z') {
            if (axisType === 'y') axisCylinder.scale.set(baseScaleCylinder.x * radialScaleFactor, baseScaleCylinder.y, baseScaleCylinder.z * radialScaleFactor);
            else axisCylinder.scale.set(baseScaleCylinder.x * radialScaleFactor, baseScaleCylinder.y * radialScaleFactor, baseScaleCylinder.z);
            if (zoomLevel < 0) standardCone.scale.set(baseScaleCone.x * 0.8, baseScaleCone.y * 0.8, baseScaleCone.z * 0.8);
            else standardCone.scale.set(baseScaleCone.x * Math.min(1.2, radialScaleFactor), baseScaleCone.y * Math.min(1.2, radialScaleFactor), baseScaleCone.z * Math.min(1.2, radialScaleFactor));
            manageEmissiveForZoom(axisCylinder, axisType, zoomLevel);
            manageEmissiveForZoom(standardCone, axisType, zoomLevel);
        }

        if (axisType === 'x') {
            const elaborateCone = manipulatorGroup.getObjectByName('FractalAxisHead_X_Elaborate');
            const tickMarks = axisCylinder.userData.tickMarks || [];
            if (zoomLevel === 2) {
                standardCone.visible = false;
                if (elaborateCone) {
                    elaborateCone.visible = true;
                    if (elaborateCone.userData.originalScale === undefined) elaborateCone.userData.originalScale = elaborateCone.scale.clone();
                    elaborateCone.scale.copy(elaborateCone.userData.originalScale).multiplyScalar(1.25);
                    if (elaborateCone.material.opacity !== undefined) elaborateCone.material.opacity = Math.min(1, (elaborateCone.userData.originalOpacity || 0.7) * 1.2);
                    manageEmissiveForZoom(elaborateCone, 'x', zoomLevel);
                }
                tickMarks.forEach(tick => {
                    tick.visible = true;
                    if (tick.userData.originalScale === undefined) tick.userData.originalScale = tick.scale.clone();
                    tick.scale.copy(tick.userData.originalScale).multiplyScalar(radialScaleFactor * 1.1);
                    if (tick.material.opacity !== undefined) tick.material.opacity = Math.min(1, (tick.userData.originalOpacity || 0.7) * 1.3);
                    manageEmissiveForZoom(tick, 'x', zoomLevel);
                });
            } else {
                standardCone.visible = true;
                manageEmissiveForZoom(standardCone, 'x', zoomLevel);
                if (elaborateCone) elaborateCone.visible = false;
                tickMarks.forEach(tick => {
                    tick.visible = false;
                    if (tick.material.opacity !== undefined && tick.userData.originalOpacity !== undefined) tick.material.opacity = tick.userData.originalOpacity;
                });
            }
        }
        if (axisCylinder && !axisCylinder.material.needsUpdate) axisCylinder.material.needsUpdate = true;
        if (standardCone && !standardCone.material.needsUpdate) standardCone.material.needsUpdate = true;
        if (axisType === 'x') {
            const elaborateCone = manipulatorGroup.getObjectByName('FractalAxisHead_X_Elaborate');
            if (elaborateCone && elaborateCone.visible && !elaborateCone.material.needsUpdate) elaborateCone.material.needsUpdate = true;
            (axisCylinder.userData.tickMarks || []).forEach(tick => {
                if (tick.visible && !tick.material.needsUpdate) tick.material.needsUpdate = true;
            });
        }
    } else if (manipulatorType === 'rotate') {
        // Handle rotation manipulator (e.g., a ring)
        const ringName = `FractalRing_${axisType.toUpperCase()}`;
        const ringMesh = manipulatorGroup.getObjectByName(ringName);

        if (!ringMesh) {
            console.warn(`Rotation ring not found for ${axisType}`);
            return;
        }

        if (ringMesh.userData.originalScale === undefined) {
            ringMesh.userData.originalScale = ringMesh.scale.clone(); // Store original scale of the ring itself
        }
        // Placeholder: Change thickness (scale y for torus based on its orientation) or opacity
        // Torus tube radius is affected by scale. If ring is XZ plane (rotates around Y), scale.y affects thickness.
        // If ring is YZ plane (rotates around X), scale.y might affect thickness if geometry is aligned that way.
        // If ring is XY plane (rotates around Z), scale.z might affect thickness.
        // This depends on how createFractalRingManipulator aligns the TorusGeometry before adding to group.
        // Assuming for Y-axis ring (rotated PI/2 on X), its local Y becomes world Y, local Z becomes world X.
        // So, scaling its local X and Z would change its radius, scaling its local Y would change tube thickness.
        const baseRingScale = ringMesh.userData.originalScale;

        if (axisType === 'y') { // Y-axis ring is rotated on X by PI/2. Its local Y is tube thickness.
            ringMesh.scale.set(baseRingScale.x, baseRingScale.y * radialScaleFactor, baseRingScale.z);
        } else if (axisType === 'x') { // X-axis ring is rotated on Y by PI/2. Its local Y is tube thickness.
             ringMesh.scale.set(baseRingScale.x * radialScaleFactor, baseRingScale.y, baseRingScale.z);
        } else { // Z-axis ring is not rotated initially. Its local X/Y are main radius, local Z is thickness.
            // This part is tricky: TorusGeometry's tube parameter affects thickness.
            // Scaling the mesh might not be the best way.
            // For now, let's apply a uniform scale to the ring as a simple placeholder.
            ringMesh.scale.set(baseRingScale.x * radialScaleFactor, baseRingScale.y * radialScaleFactor, baseRingScale.z * radialScaleFactor);
        }


        const markers = ringMesh.userData.degreeMarkers || [];
        let numMarkersToShow = 0;
        if (zoomLevel === 1) numMarkersToShow = 4; // 90 deg
        else if (zoomLevel === 2) numMarkersToShow = 8; // 45 deg
        else if (zoomLevel >= 3) numMarkersToShow = 12; // 30 deg

        markers.forEach((marker, index) => {
            // The markers are already positioned for 12 segments (30 deg).
            // We control visibility based on how many segments are needed.
            // e.g., for 4 markers (90 deg), we show markers 0, 3, 6, 9.
            // e.g., for 8 markers (45 deg), we show markers 0, 1, 2, 3, ... (no, this is wrong)
            // We need to show markers at appropriate intervals.
            // If maxMarkers is 12:
            // numMarkersToShow = 4 (90 deg): show index 0, 3, 6, 9 (12/4 = 3, so every 3rd marker)
            // numMarkersToShow = 8 (45 deg): show index 0, 1*1.5 (skip), 3, 4.5 (skip)... (12/8 = 1.5, so every 1.5th marker - tricky)
            // A simpler way: just show the first `numMarkersToShow` and their positions are already spread out.
            // No, that's not right. The markers are created for 30-degree increments.
            // If we want 90-degree increments (4 markers), we show marker 0, marker 3, marker 6, marker 9. (index % (12/4) === 0)
            // If we want 45-degree increments (8 markers), we show marker 0, (skip 1), marker (12/8 = 1.5) -> index % 1.5 === 0 doesn't work for integers.
            // Let's rethink. Markers are at 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330 degrees.
            let showThisMarker = false;
            if (numMarkersToShow === 4) { // 0, 90, 180, 270
                if (index % 3 === 0) showThisMarker = true;
            } else if (numMarkersToShow === 8) { // 0, 45, 90, 135 ...
                 // index 0 (0), 1.5 (45), 3 (90), 4.5 (135), 6 (180), 7.5 (225), 9 (270), 10.5 (315)
                 // This means we have 12 markers. For 8 markers, we need to enable markers that are multiples of 45 degrees.
                 // 360/45 = 8. So we need 8 markers.
                 // Our 12 markers are at 30 deg intervals.
                 // 0 deg (idx 0), 30 deg (idx 1), 60 deg (idx 2), 90 deg (idx 3), ...
                 // To show 45 deg:
                 // idx 0 (0 deg)
                 // idx between 1 and 2 (45 deg) -> we can show idx 1 (30) or idx 2 (60) or average.
                 // For simplicity, let's just show a subset of the 12 markers.
                 // If numMarkersToShow is 8, we want roughly every 360/8 = 45 degrees.
                 // Our markers are at 30 deg. So, we can't hit 45 perfectly with a subset of 12.
                 // Let's make it simple:
                 // zoom 1 (4 markers): 0, 90, 180, 270 (index 0, 3, 6, 9)
                 // zoom 2 (8 markers): 0, 45 (approx index 1 or 2), 90, 135 ... -> Use 12 markers for zoom >=2 for simplicity for now.
                if (index % (12 / 8) === 0) { // This will not be integer.
                    // If zoomLevel 2, let's show all 12 for now, or choose 8 of them.
                    // Showing all 12 (30 deg increments) is fine for zoomLevel 2 or higher.
                     showThisMarker = true; // Show all for zoom 2+
                }

            }
             if (zoomLevel === 1 && index % 3 === 0) showThisMarker = true; // 4 markers
             else if (zoomLevel >= 2) showThisMarker = true; // 12 markers for zoom 2+

            marker.visible = showThisMarker;

            if (showThisMarker) {
                // Optionally, scale markers or change opacity with zoom level too
                marker.scale.setScalar(radialScaleFactor * 0.5); // Make markers scale with ring thickness a bit
                if (marker.material.opacity !== undefined && ringMesh.userData.originalOpacity !== undefined) {
                     marker.material.opacity = ringMesh.userData.originalOpacity * (0.8 + zoomLevel * 0.1); // slightly more opaque at higher zoom
                }
            }
        });

        manageEmissiveForZoom(ringMesh, axisType, zoomLevel);
        if (ringMesh && !ringMesh.material.needsUpdate) ringMesh.material.needsUpdate = true;
    } else if (manipulatorType === 'scale_axis' || manipulatorType === 'scale_uniform') {
        // Handle scale manipulator (e.g., a cube)
        // The `axisType` here will be 'x', 'y', 'z', or 'xyz'
        const scaleCubeName = manipulatorType === 'scale_uniform' ? 'FractalScaleCube_XYZ' : `FractalScaleCube_${axisType.toUpperCase()}`;
        const scaleCube = manipulatorGroup.getObjectByName(scaleCubeName);

        if (!scaleCube) {
            console.warn(`Scale cube not found for ${axisType} (type: ${manipulatorType})`);
            return;
        }

        if (scaleCube.userData.originalScaleLocal === undefined) { // Using originalScaleLocal to avoid conflict with world scale factor
            scaleCube.userData.originalScaleLocal = scaleCube.scale.clone();
        }
        const baseLocalScale = scaleCube.userData.originalScaleLocal;

        // Basic semantic zoom: make the cube slightly larger or smaller, or change emissiveness
        let localScaleMultiplier = 1.0;
        if (zoomLevel === 1) localScaleMultiplier = 1.15;
        else if (zoomLevel === 2) localScaleMultiplier = 1.3;
        else if (zoomLevel > 2) localScaleMultiplier = 1.3 + (zoomLevel - 2) * 0.05;
        else if (zoomLevel === -1) localScaleMultiplier = 0.85;
        else if (zoomLevel < -1) localScaleMultiplier = Math.max(0.7, 0.85 + (zoomLevel + 1) * 0.05);

        scaleCube.scale.copy(baseLocalScale).multiplyScalar(localScaleMultiplier);

        manageEmissiveForZoom(scaleCube, axisType, zoomLevel);
        if (scaleCube && !scaleCube.material.needsUpdate) scaleCube.material.needsUpdate = true;
    }
}

/**
 * Creates a fractal ring manipulator for a given axis.
 * Currently only Y-axis is distinct, X and Z would need rotation.
 * @param {'x' | 'y' | 'z'} axis - The axis of rotation.
 * @returns {THREE.Mesh} The ring manipulator mesh.
 */
export function createFractalRingManipulator(axis = 'y') {
    const ringRadius = AXIS_LENGTH * 0.8; // Slightly smaller than axis length
    const tubeRadius = AXIS_RADIUS * 1.5;
    const radialSegments = 8;
    const tubularSegments = 32;

    const geometry = new THREE.TorusGeometry(ringRadius, tubeRadius, radialSegments, tubularSegments);
    let color;
    let name;

    switch (axis) {
        case 'x':
            color = 0xff0000; // Red
            name = 'FractalRing_X';
            break;
        case 'y':
            color = 0x00ff00; // Green
            name = 'FractalRing_Y';
            break;
        case 'z':
            color = 0x0000ff; // Blue
            name = 'FractalRing_Z';
            break;
        default:
            color = 0x888888; // Grey for unknown
            name = 'FractalRing_Unknown';
    }

    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.4,
        metalness: 0.2,
        transparent: true,
        opacity: 0.65,
        emissive: color, // Make it glow slightly with its own color
        emissiveIntensity: 0.2,
    });

    const ringMesh = new THREE.Mesh(geometry, material);
    ringMesh.name = name;
    ringMesh.userData.isFractalUIElement = true;
    ringMesh.userData.type = 'rotate_axis'; // Consistent with TODO for TF type
    ringMesh.userData.axis = axis;
    ringMesh.userData.zoomLevel = 0; // Initialize zoom level

    // Set orientation for the rings
    // A torus default geometry lies in the XY plane.
    if (axis === 'x') {
        // For X-axis rotation, the ring should be in the YZ plane.
        // Rotate the default XY torus around Y-axis by PI/2.
        ringMesh.rotation.y = Math.PI / 2;
    } else if (axis === 'y') {
        // For Y-axis rotation, the ring should be in the XZ plane.
        // Rotate the default XY torus around X-axis by PI/2.
        ringMesh.rotation.x = Math.PI / 2;
    }
    // For Z-axis rotation, the ring should be in the XY plane.
    // Default TorusGeometry is already in XY plane, so no rotation needed for Z-axis.


    // Store original properties for hover/active states
    ringMesh.userData.originalColor = material.color.clone();
    ringMesh.userData.originalOpacity = material.opacity;
    if (material.emissive) {
        ringMesh.userData.originalEmissive = material.emissive.getHex();
        ringMesh.userData.originalEmissiveIntensity = material.emissiveIntensity;
    }


    // Ring should not be initially visible, UIManager will handle this.
    // ringMesh.visible = false; // This will be handled by its parent group's visibility

    // Create degree markers (initially hidden)
    ringMesh.userData.degreeMarkers = [];
    const markerGeometry = new THREE.SphereGeometry(AXIS_RADIUS * 0.4, 6, 6); // Smaller markers
    const markerMaterial = material.clone(); // Share material properties initially
    markerMaterial.color = new THREE.Color(0xffffff); // White markers for contrast
    markerMaterial.emissive = new THREE.Color(0x999999);
    markerMaterial.opacity = (material.opacity || 0.65) * 0.8;


    const maxMarkers = 12; // Max markers for highest zoom level (e.g., 30 deg increments)
    for (let i = 0; i < maxMarkers; i++) {
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.visible = false; // Initially hidden
        // Position them in the ring's local XY plane
        const angle = (i / maxMarkers) * Math.PI * 2;
        marker.position.x = ringRadius * Math.cos(angle);
        marker.position.y = ringRadius * Math.sin(angle);
        marker.position.z = 0; // In the plane of the ring
        ringMesh.add(marker); // Add as child of the ring
        ringMesh.userData.degreeMarkers.push(marker);
    }

    return ringMesh;
}

/**
 * Creates the fractal scale manipulator meshes (X, Y, Z cubes and a central uniform scale cube).
 * @returns {THREE.Group} A group containing the scale manipulator meshes.
 */
export function createFractalScaleManipulators() {
    const scaleGroup = new THREE.Group();
    scaleGroup.name = 'FractalScaleManipulators';

    const CUBE_SIZE = AXIS_RADIUS * 3; // Make cubes noticeable
    const AXIAL_OFFSET = AXIS_LENGTH * 0.8; // Position axial cubes at the end of a shorter conceptual axis

    const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

    // Material function to easily create slightly different colored materials
    const createScaleMaterial = (baseColorHex) => {
        const baseColor = new THREE.Color(baseColorHex);
        return new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.6,
            metalness: 0.1,
            transparent: true,
            opacity: 0.75,
            emissive: baseColor.clone().multiplyScalar(0.2), // Slight emissive glow
            emissiveIntensity: 0.2,
        });
    };

    // X-axis scale cube
    const scaleMaterialX = createScaleMaterial(0xff3333); // Lighter red
    const xScaleCube = new THREE.Mesh(cubeGeometry, scaleMaterialX);
    xScaleCube.name = 'FractalScaleCube_X';
    xScaleCube.userData = { isFractalUIElement: true, type: 'scale_axis', axis: 'x', zoomLevel: 0 };
    xScaleCube.position.x = AXIAL_OFFSET;
    scaleGroup.add(xScaleCube);

    // Y-axis scale cube
    const scaleMaterialY = createScaleMaterial(0x33ff33); // Lighter green
    const yScaleCube = new THREE.Mesh(cubeGeometry, scaleMaterialY);
    yScaleCube.name = 'FractalScaleCube_Y';
    yScaleCube.userData = { isFractalUIElement: true, type: 'scale_axis', axis: 'y', zoomLevel: 0 };
    yScaleCube.position.y = AXIAL_OFFSET;
    scaleGroup.add(yScaleCube);

    // Z-axis scale cube
    const scaleMaterialZ = createScaleMaterial(0x3333ff); // Lighter blue
    const zScaleCube = new THREE.Mesh(cubeGeometry, scaleMaterialZ);
    zScaleCube.name = 'FractalScaleCube_Z';
    zScaleCube.userData = { isFractalUIElement: true, type: 'scale_axis', axis: 'z', zoomLevel: 0 };
    zScaleCube.position.z = AXIAL_OFFSET;
    scaleGroup.add(zScaleCube);

    // Uniform scale cube (central)
    const uniformScaleMaterial = createScaleMaterial(0xaaaaaa); // Grey
    const uniformScaleCube = new THREE.Mesh(cubeGeometry, uniformScaleMaterial);
    uniformScaleCube.name = 'FractalScaleCube_XYZ';
    uniformScaleCube.userData = { isFractalUIElement: true, type: 'scale_uniform', axis: 'xyz', zoomLevel: 0 };
    uniformScaleCube.position.set(0, 0, 0); // At the origin of the manipulator group
    // Optionally make it slightly larger or different shape
    uniformScaleCube.scale.setScalar(1.2); // Make central cube a bit bigger
    scaleGroup.add(uniformScaleCube);

    // Store original properties for hover/active states and zoom
    scaleGroup.children.forEach(cube => {
        if (cube.material) {
            cube.userData.originalColor = cube.material.color.clone();
            cube.userData.originalOpacity = cube.material.opacity;
            if (cube.material.emissive) {
                cube.userData.originalEmissive = cube.material.emissive.getHex();
                cube.userData.originalEmissiveIntensity = cube.material.emissiveIntensity;
            }
            cube.userData.originalScale = cube.scale.clone();
        }
    });

    scaleGroup.visible = false; // Initially hidden
    return scaleGroup;
}
