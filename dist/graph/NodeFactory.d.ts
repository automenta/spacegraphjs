export class NodeFactory extends BaseFactory {
    constructor(space: any);
    space: any;
    registerCoreNodeTypes(): void;
    /**
     * Creates a new node instance of a given type.
     * @param {string} id - The unique ID for the node.
     * @param {string} type - The typeName of the node to create.
     * @param {object} position - An object with x, y, z coordinates.
     * @param {object} [data={}] - Custom data for the node.
     * @param {number} [mass=1.0] - The mass of the node.
     * @returns {Node|null} The created node instance, or null if the type is not found.
     */
    createNode(id: string, type: string, position: object, data?: object, mass?: number): Node | null;
}
import { BaseFactory } from '../core/BaseFactory.js';
