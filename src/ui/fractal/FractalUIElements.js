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
    const coneGeometry = new THREE.ConeGeometry(AXIS_RADIUS * 2, AXIS_RADIUS * 4, 8);
    const elaborateConeGeometry = new THREE.ConeGeometry(AXIS_RADIUS * 2.5, AXIS_RADIUS * 5, 10);
    const perpendicularTickGeom = new THREE.CylinderGeometry(AXIS_RADIUS * 1.2, AXIS_RADIUS * 1.2, AXIS_RADIUS * 0.5, 8);

    ['x', 'y', 'z'].forEach(axis => {
        let axisMesh, standardCone, elaborateCone;
        let material;
        const tickMarks = [];

        switch (axis) {
            case 'x': material = axisMaterialX; break;
            case 'y': material = axisMaterialY; break;
            case 'z': material = axisMaterialZ; break;
        }

        // Axis Cylinder
        axisMesh = new THREE.Mesh(axisGeometry, material.clone());
        axisMesh.name = `FractalAxis_${axis.toUpperCase()}`;
        axisMesh.userData = { isFractalUIElement: true, axis: axis, type: 'translate_axis' };
        if (axis === 'x') { axisMesh.rotation.z = -Math.PI / 2; axisMesh.position.x = AXIS_LENGTH / 2; }
        else if (axis === 'y') { axisMesh.position.y = AXIS_LENGTH / 2; }
        else if (axis === 'z') { axisMesh.rotation.x = Math.PI / 2; axisMesh.position.z = AXIS_LENGTH / 2; }
        axisGroup.add(axisMesh);

        // Standard Cone
        standardCone = new THREE.Mesh(coneGeometry, material.clone());
        standardCone.name = `FractalAxisHead_${axis.toUpperCase()}_Standard`;
        standardCone.userData = { isFractalUIElement: true, axis: axis, type: 'translate_axis', isDetail: false };
        if (axis === 'x') { standardCone.position.x = AXIS_LENGTH; standardCone.rotation.z = -Math.PI / 2; }
        else if (axis === 'y') { standardCone.position.y = AXIS_LENGTH; }
        else if (axis === 'z') { standardCone.position.z = AXIS_LENGTH; standardCone.rotation.x = Math.PI / 2; }
        axisGroup.add(standardCone);

        // Elaborate Cone
        elaborateCone = new THREE.Mesh(elaborateConeGeometry, material.clone());
        elaborateCone.name = `FractalAxisHead_${axis.toUpperCase()}_Elaborate`;
        elaborateCone.userData = { isFractalUIElement: true, axis: axis, type: 'translate_axis', isDetail: true };
        if (axis === 'x') { elaborateCone.position.x = AXIS_LENGTH; elaborateCone.rotation.z = -Math.PI / 2; }
        else if (axis === 'y') { elaborateCone.position.y = AXIS_LENGTH; }
        else if (axis === 'z') { elaborateCone.position.z = AXIS_LENGTH; elaborateCone.rotation.x = Math.PI / 2; }
        elaborateCone.visible = false;
        axisGroup.add(elaborateCone);

        // Tick Marks
        for (let i = 0; i < 3; i++) {
            const tickMesh = new THREE.Mesh(perpendicularTickGeom, material.clone());
            tickMesh.name = `FractalAxisTick_${axis.toUpperCase()}_${i}`;
            tickMesh.userData = { isFractalUIElement: true, axis: axis, type: 'translate_axis', isDetail: true };
            const pos = (AXIS_LENGTH / 4) * (i + 1);
            if (axis === 'x') { tickMesh.position.x = pos; }
            else if (axis === 'y') { tickMesh.position.y = pos; tickMesh.rotation.x = Math.PI / 2; } // Rotate ticks to be perpendicular to Y
            else if (axis === 'z') { tickMesh.position.z = pos; tickMesh.rotation.z = Math.PI / 2; } // Rotate ticks to be perpendicular to Z
            tickMesh.visible = false;
            axisGroup.add(tickMesh);
            tickMarks.push(tickMesh);
        }

        axisMesh.userData.standardCone = standardCone;
        axisMesh.userData.elaborateCone = elaborateCone;
        axisMesh.userData.tickMarks = tickMarks;
    });

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
                    // Get the manipulator type from userData
                    const manipulatorType = fractalMesh.userData.type;
                    if (manipulatorType === 'translate_axis' || manipulatorType === 'rotate_axis' ||
                        manipulatorType === 'scale_axis' || manipulatorType === 'scale_uniform') {
                        applySemanticZoomToAxis(fractalMesh.parent, fractalMesh.userData.axis, currentZoomLevel, manipulatorType);
                    } else {
                         // Fallback if type is unknown for semantic zoom restoration
                        fractalMesh.material.emissive.setHex(baseEmissiveHex);
                    }
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
        const axisCylinder = manipulatorGroup.getObjectByName(axisCylinderName);

        if (!axisCylinder || !axisCylinder.userData || !axisCylinder.userData.standardCone || !axisCylinder.userData.elaborateCone) {
            console.warn(`Translation axis parts (cylinder, cones, or userData) not found for ${axisType}`);
            return;
        }

        const standardCone = axisCylinder.userData.standardCone;
        const elaborateCone = axisCylinder.userData.elaborateCone;
        const tickMarks = axisCylinder.userData.tickMarks || [];

        // Ensure original scales are stored
        if (axisCylinder.userData.originalScale === undefined) axisCylinder.userData.originalScale = axisCylinder.scale.clone();
        if (standardCone.userData.originalScale === undefined) standardCone.userData.originalScale = standardCone.scale.clone();
        if (elaborateCone.userData.originalScale === undefined) elaborateCone.userData.originalScale = elaborateCone.scale.clone();
        tickMarks.forEach(tick => {
            if (tick.userData.originalScale === undefined) tick.userData.originalScale = tick.scale.clone();
        });

        const baseScaleCylinder = axisCylinder.userData.originalScale;
        const baseScaleConeStd = standardCone.userData.originalScale;
        const baseScaleConeElab = elaborateCone.userData.originalScale;

        // Apply radial scale to cylinder thickness
        // Cylinder's length is along its local Y if not rotated (Y-axis), or along X/Z if rotated.
        // Radial scale affects the other two dimensions.
        if (axisType === 'x') { // Rotated on Z by -PI/2. Length is local Y, radius is local X and Z.
            axisCylinder.scale.set(baseScaleCylinder.x * radialScaleFactor, baseScaleCylinder.y, baseScaleCylinder.z * radialScaleFactor);
        } else if (axisType === 'y') { // No rotation. Length is local Y, radius is local X and Z.
            axisCylinder.scale.set(baseScaleCylinder.x * radialScaleFactor, baseScaleCylinder.y, baseScaleCylinder.z * radialScaleFactor);
        } else { // axisType === 'z'. Rotated on X by PI/2. Length is local Y, radius is local X and Z.
             axisCylinder.scale.set(baseScaleCylinder.x * radialScaleFactor, baseScaleCylinder.y, baseScaleCylinder.z * radialScaleFactor);
        }
        manageEmissiveForZoom(axisCylinder, axisType, zoomLevel);


        // Manage cone visibility and scale
        const showElaborate = zoomLevel >= 2;
        standardCone.visible = !showElaborate;
        elaborateCone.visible = showElaborate;

        if (showElaborate) {
            elaborateCone.scale.copy(baseScaleConeElab).multiplyScalar(1.1 + Math.max(0, zoomLevel - 2) * 0.05); // Slightly grow more at L3+
            manageEmissiveForZoom(elaborateCone, axisType, zoomLevel);
        } else { // Standard cone is visible
            let coneScaleFactor = 1.0;
            if (zoomLevel === 1) coneScaleFactor = 1.2;
            else if (zoomLevel === 0) coneScaleFactor = 1.0;
            else if (zoomLevel === -1) coneScaleFactor = 0.8;
            else if (zoomLevel <= -2) coneScaleFactor = 0.7;
            standardCone.scale.copy(baseScaleConeStd).multiplyScalar(coneScaleFactor);
            manageEmissiveForZoom(standardCone, axisType, zoomLevel);
        }

        // Manage tick marks
        const showTicks = zoomLevel >= 1; // Show ticks from L1 upwards
        tickMarks.forEach((tick, index) => {
            tick.visible = showTicks;
            if (showTicks) {
                let tickScaleFactor = 1.0;
                if (zoomLevel === 1) tickScaleFactor = 1.0;
                else if (zoomLevel === 2) tickScaleFactor = 1.15;
                else if (zoomLevel > 2) tickScaleFactor = 1.15 + (zoomLevel - 2) * 0.05;

                // Make ticks slightly thinner at L1, normal at L2+
                const tickRadialScale = zoomLevel === 1 ? 0.8 : 1.0;

                tick.scale.set(
                    tick.userData.originalScale.x * tickRadialScale,
                    tick.userData.originalScale.y * tickScaleFactor, // Length scale
                    tick.userData.originalScale.z * tickRadialScale
                );
                manageEmissiveForZoom(tick, axisType, zoomLevel);
            }
        });

        // Ensure materials are updated
        axisCylinder.material.needsUpdate = true;
        standardCone.material.needsUpdate = true;
        elaborateCone.material.needsUpdate = true;
        tickMarks.forEach(tick => { if (tick.visible) tick.material.needsUpdate = true; });

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

        // Apply a uniform scale based on radialScaleFactor. This will make the ring (tube and overall radius) thicker/thinner.
        ringMesh.scale.copy(baseRingScale).multiplyScalar(radialScaleFactor);

        const markers = ringMesh.userData.degreeMarkers || [];
        let showMarkersLevel = 0; // 0: none, 1: 90deg (4 markers), 2: 45deg (8 markers), 3: 30deg (12 markers)

        if (zoomLevel === 1) showMarkersLevel = 1;       // L1: 90-degree markers
        else if (zoomLevel === 2) showMarkersLevel = 2;  // L2: 45-degree markers
        else if (zoomLevel >= 3) showMarkersLevel = 3; // L3+: 30-degree markers
        // For zoomLevel <= 0, showMarkersLevel remains 0 (no markers)

        markers.forEach((marker, index) => {
            let showThisMarker = false;
            if (showMarkersLevel === 1) { // Show 4 markers (0, 90, 180, 270 deg)
                if (index % 3 === 0) showThisMarker = true;
            } else if (showMarkersLevel === 2) { // Show 8 markers (0, 45, 90 ... deg)
                // Markers are at 30 deg intervals. For 45 deg, we want indices that are multiples of 1.5 (30 * 1.5 = 45)
                // So, index 0, (skip 1), index 3 (90), (skip 4), index 6 (180), etc.
                // A simpler way: if index * 30 is a multiple of 45.
                if ((index * 30) % 45 === 0) showThisMarker = true;
            } else if (showMarkersLevel === 3) { // Show all 12 markers (30 deg increments)
                showThisMarker = true;
            }
            marker.visible = showThisMarker;

            if (showThisMarker) {
                // Markers are children of the ring, so their world scale is affected by ringMesh.scale
                // We want them to maintain a fairly consistent apparent size relative to the ring's new thickness.
                // If ringMesh is scaled by radialScaleFactor, markers are already scaled by that.
                // We might want to scale them down further if the ring becomes very thick, or up if it's thin.
                // For now, let's set a base local scale for markers and let them inherit ring's scale.
                // The original marker creation uses AXIS_RADIUS * 0.4.
                // Let's make their local scale constant for now, or slightly adjust.
                const markerBaseLocalScale = 0.5 / radialScaleFactor; // Counter-scale to maintain visual size relative to world, then scale with ring.
                                                                    // This will make markers appear roughly constant size despite ring scaling.
                                                                    // Or, more simply:
                marker.scale.setScalar(0.5 + zoomLevel * 0.1); // Make markers slightly larger at higher zoom, relative to their parent ring.

                if (marker.material.opacity !== undefined && ringMesh.userData.originalOpacity !== undefined) {
                     marker.material.opacity = Math.min(1, ringMesh.userData.originalOpacity * (0.9 + zoomLevel * 0.05));
                }
                 manageEmissiveForZoom(marker, axisType, zoomLevel > 0 ? zoomLevel -1 : 0); // Slightly less emissive than ring
            }
        });

        manageEmissiveForZoom(ringMesh, axisType, zoomLevel);
        if (ringMesh && !ringMesh.material.needsUpdate) ringMesh.material.needsUpdate = true;
        markers.forEach(m => { if(m.visible && m.material) m.material.needsUpdate = true; });

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
    // A torus default geometry lies in the XY plane (its "hole" is along the Z-axis).
    if (axis === 'x') {
        // For X-axis rotation, the ring itself should be in the YZ plane.
        // To transform the default XY plane torus to the YZ plane, rotate it PI/2 around the X-axis.
        ringMesh.rotation.x = Math.PI / 2;
    } else if (axis === 'y') {
        // For Y-axis rotation, the ring itself should be in the XZ plane.
        // To transform the default XY plane torus to the XZ plane, rotate it PI/2 around the Y-axis.
        ringMesh.rotation.y = Math.PI / 2;
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
