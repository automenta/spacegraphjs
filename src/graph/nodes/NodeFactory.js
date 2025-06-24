/**
 * @file NodeFactory.js - Factory for creating different types of nodes.
 * @licence MIT
 */

import { HtmlNode } from './HtmlNode.js';
import { ShapeNode } from './ShapeNode.js';
import { ImageNode } from './ImageNode.js'; // Import ImageNode

export class NodeFactory {
    constructor(space) {
        this.space = space; // Pass SpaceGraph instance for node constructor if needed
        this.nodeTypes = new Map();
        this._registerDefaultNodeTypes();
    }

    _registerDefaultNodeTypes() {
        this.registerNodeType('html', HtmlNode);
        this.registerNodeType('shape', ShapeNode);
        this.registerNodeType('image', ImageNode); // Register ImageNode

        // Fallback/generic type if specific type is not found or not specified
        // For now, ShapeNode can be a reasonable default if no type is given.
        this.registerNodeType('default', ShapeNode);
    }

    /**
     * Registers a new node type.
     * @param {string} typeName - The unique key for the node type (e.g., 'html', 'image').
     * @param {typeof import('./BaseNode.js').BaseNode} nodeClass - The class constructor for this node type.
     */
    registerNodeType(typeName, nodeClass) {
        if (this.nodeTypes.has(typeName)) {
            console.warn(`NodeFactory: Node type "${typeName}" is already registered. Overwriting.`);
        }
        this.nodeTypes.set(typeName, nodeClass);
    }

    /**
     * Creates a node instance of a specified type.
     * @param {string} id - The unique ID for the new node.
     * @param {string} type - The type of node to create (must be registered).
     * @param {THREE.Vector3} position - The initial position of the node.
     * @param {object} data - The data object for the node.
     * @param {number} mass - The mass of the node.
     * @returns {import('./BaseNode.js').BaseNode | null} The created node instance, or null if type is invalid.
     */
    createNode(id, type, position, data = {}, mass = 1.0) {
        const NodeClass = this.nodeTypes.get(type) || this.nodeTypes.get(data.type) || this.nodeTypes.get('default');

        if (NodeClass) {
            // Some node constructors might need the SpaceGraph instance (this.space)
            // For now, assuming new NodeClass(id, position, data, mass) is the common signature.
            // If space is needed: return new NodeClass(this.space, id, position, data, mass);
            const nodeInstance = new NodeClass(id, position, data, mass);

            // It's crucial that the node's 'space' property is set if it needs to emit events
            // or access other parts of the graph system directly.
            // BaseNode constructor does not take 'space'. NodePlugin usually sets it.
            // If NodeFactory is used outside NodePlugin, this needs consideration.
            // For now, NodePlugin will set node.space after creation.

            return nodeInstance;
        } else {
            console.error(`NodeFactory: Unknown node type "${type}". Cannot create node.`);
            return null;
        }
    }
}
