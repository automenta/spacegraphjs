import * as THREE from 'three';
import {CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';

/**
 * Creates a DOM element for a 3D label.
 * @param {string} labelText - The text content of the label.
 * @param {string} id - The ID of the associated node/edge.
 * @param {string} className - Additional CSS class for the label element.
 * @param {object} styleData - Object containing CSS style properties.
 * @returns {HTMLElement} The created div element.
 */
export function createLabelElement(labelText, id, className, styleData = {}) {
    const div = document.createElement('div');
    div.className = `${className} node-common`;
    div.textContent = labelText;
    div.dataset.id = id; // Use generic 'id' for both node and edge labels
    Object.assign(div.style, {
        pointerEvents: 'none',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(4px)',
        border: '1px solid var(--sg-accent-secondary)',
        ...styleData,
    });
    return div;
}

/**
 * Creates a CSS3DObject for a label.
 * @param {string} labelText - The text content of the label.
 * @param {string} id - The ID of the associated node/edge.
 * @param {string} className - Additional CSS class for the label element.
 * @param {object} styleData - Object containing CSS style properties.
 * @param {string} type - User data type for the CSS3DObject (e.g., 'edge-label', 'shape-label').
 * @returns {CSS3DObject} The created CSS3DObject.
 */
export function createCSS3DLabelObject(labelText, id, className, styleData, type) {
    const div = createLabelElement(labelText, id, className, styleData);
    const label = new CSS3DObject(div);
    label.userData = { id: id, type: type };
    return label;
}

/**
 * Applies Level of Detail (LOD) visibility and scaling to a label based on camera distance.
 * @param {CSS3DObject} labelObject - The CSS3DObject representing the label.
 * @param {Array<object>} labelLodData - An array of LOD level configurations.
 * @param {object} space - The SpaceGraph instance, used to get camera.
 * @param {number} [baseScale=1.0] - The base content scale for HTML nodes.
 */
export function applyLabelLOD(labelObject, labelLodData, space, baseScale = 1.0) {
    if (!labelObject?.element || !labelLodData?.length) {
        if (labelObject?.element) {
            labelObject.element.style.visibility = '';
            if (labelObject.element.classList.contains('node-html')) { // For HtmlNode content
                const contentEl = labelObject.element.querySelector('.node-content');
                if (contentEl) contentEl.style.transform = `scale(${baseScale})`;
            }
        }
        return;
    }

    const camera = space?.plugins?.getPlugin('CameraPlugin')?.getCameraInstance();
    if (!camera) return;

    const distanceToCamera = labelObject.position.distanceTo(camera.position);
    const sortedLodLevels = [...labelLodData].sort((a, b) => (b.distance || 0) - (a.distance || 0));

    let ruleApplied = false;
    for (const level of sortedLodLevels) {
        if (distanceToCamera >= (level.distance || 0)) {
            labelObject.element.style.visibility = level.style?.includes('visibility:hidden') ? 'hidden' : '';
            if (labelObject.element.classList.contains('node-html')) {
                const contentEl = labelObject.element.querySelector('.node-content');
                if (contentEl) contentEl.style.transform = `scale(${baseScale * (level.scale ?? 1.0)})`;
            }
            ruleApplied = true;
            break;
        }
    }

    if (!ruleApplied) {
        labelObject.element.style.visibility = '';
        if (labelObject.element.classList.contains('node-html')) {
            const contentEl = labelObject.element.querySelector('.node-content');
            if (contentEl) contentEl.style.transform = `scale(${baseScale})`;
        }
    }
}
