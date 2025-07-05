/**
 * Creates a DOM element for a 3D label.
 * @param {string} labelText - The text content of the label.
 * @param {string} id - The ID of the associated node/edge.
 * @param {string} className - Additional CSS class for the label element.
 * @param {object} styleData - Object containing CSS style properties.
 * @returns {HTMLElement} The created div element.
 */
export function createLabelElement(labelText: string, id: string, className: string, styleData?: object): HTMLElement;
/**
 * Creates a CSS3DObject for a label.
 * @param {string} labelText - The text content of the label.
 * @param {string} id - The ID of the associated node/edge.
 * @param {string} className - Additional CSS class for the label element.
 * @param {object} styleData - Object containing CSS style properties.
 * @param {string} type - User data type for the CSS3DObject (e.g., 'edge-label', 'shape-label').
 * @returns {CSS3DObject} The created CSS3DObject.
 */
export function createCSS3DLabelObject(labelText: string, id: string, className: string, styleData: object, type: string): CSS3DObject;
/**
 * Applies Level of Detail (LOD) visibility and scaling to a label based on camera distance.
 * @param {CSS3DObject} labelObject - The CSS3DObject representing the label.
 * @param {Array<object>} labelLodData - An array of LOD level configurations.
 * @param {object} space - The SpaceGraph instance, used to get camera.
 * @param {number} [baseScale=1.0] - The base content scale for HTML nodes.
 */
export function applyLabelLOD(labelObject: CSS3DObject, labelLodData: Array<object>, space: object, baseScale?: number): void;
