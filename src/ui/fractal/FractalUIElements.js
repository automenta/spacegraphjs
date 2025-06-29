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
 * @param {THREE.Color} [originalColor] - Optional original color to restore.
 * @param {THREE.Color} [highlightColor] - Optional highlight color.
 */
export function setFractalElementActive(fractalMesh, isActive, originalColor, highlightColor) {
    if (!fractalMesh || !fractalMesh.material) return;

    if (!fractalMesh.userData.originalColor && originalColor) {
        fractalMesh.userData.originalColor = originalColor.clone();
    }

    const baseColor = fractalMesh.userData.originalColor || (fractalMesh.material.color ? fractalMesh.material.color.clone() : new THREE.Color(0xffffff));

    if (isActive) {
        const activeColor = highlightColor || baseColor.clone().multiplyScalar(1.5); // Brighten
        fractalMesh.material.color.set(activeColor);
        fractalMesh.material.opacity = Math.min(1, (fractalMesh.material.opacity || 0.7) * 1.2);
         if (fractalMesh.material.emissive) {
            fractalMesh.userData.originalEmissive = fractalMesh.material.emissive.getHex();
            fractalMesh.material.emissive.setHex(activeColor.getHex());
        }
    } else {
        fractalMesh.material.color.set(baseColor);
        fractalMesh.material.opacity = fractalMesh.userData.originalOpacity !== undefined ? fractalMesh.userData.originalOpacity : 0.7; // Restore or default
        if (fractalMesh.material.emissive && fractalMesh.userData.originalEmissive !== undefined) {
            fractalMesh.material.emissive.setHex(fractalMesh.userData.originalEmissive);
        }
    }
    fractalMesh.material.needsUpdate = true;
}
