import { HtmlNode } from './HtmlNode.js';
import { ShapeNode } from './ShapeNode.js';
import { ImageNode } from './ImageNode.js';
import { VideoNode } from './VideoNode.js';
import { IFrameNode } from './IFrameNode.js';
import { GroupNode } from './GroupNode.js';
import { DataNode } from './DataNode.js';
import { NoteNode } from './NoteNode.js'; // Added NoteNode
import { AudioNode } from './AudioNode.js'; // Added AudioNode
import { DocumentNode } from './DocumentNode.js'; // Added DocumentNode
import { ChartNode } from './ChartNode.js'; // Added ChartNode

export class NodeFactory {
    constructor(space) {
        this.space = space;
        this.nodeTypes = new Map();
        // _registerDefaultNodeTypes will be called by NodePlugin now
    }

    // Renamed and made public, or NodePlugin will call registerNodeType directly
    registerCoreNodeTypes() {
        // Register existing types using static typeName
        this.registerNodeType(HtmlNode.typeName, HtmlNode);
        this.registerNodeType(ShapeNode.typeName, ShapeNode);
        this.registerNodeType(ImageNode.typeName, ImageNode);
        this.registerNodeType(VideoNode.typeName, VideoNode);
        this.registerNodeType(IFrameNode.typeName, IFrameNode);
        this.registerNodeType(GroupNode.typeName, GroupNode);
        this.registerNodeType(DataNode.typeName, DataNode);
        this.registerNodeType(NoteNode.typeName, NoteNode); // Register NoteNode

        // Register new types
        this.registerNodeType(AudioNode.typeName, AudioNode);
        this.registerNodeType(DocumentNode.typeName, DocumentNode);
        this.registerNodeType(ChartNode.typeName, ChartNode);

        // Set default node type
        this.registerNodeType('default', ShapeNode); // Or any other preferred default
    }

    registerNodeType(typeName, nodeClass) {
        if (!typeName) {
            console.warn('NodeFactory: Attempted to register a node class without a typeName.', nodeClass);
            return;
        }
        if (this.nodeTypes.has(typeName)) {
            // console.warn(`NodeFactory: Node type "${typeName}" already registered. Overwriting.`);
            // Allow overwriting for now, could be made stricter
        }
        this.nodeTypes.set(typeName, nodeClass);
    }

    /**
     * Creates a new node instance of a given type.
     * The actual registration of types is typically handled by the NodePlugin.
     * @param {string} id - The unique ID for the node.
     * @param {string} type - The typeName of the node to create.
     * @param {object} position - An object with x, y, z coordinates.
     * @param {object} [data={}] - Custom data for the node.
     * @param {number} [mass=1.0] - The mass of the node.
     * @returns {BaseNode|null} The created node instance, or null if the type is not found.
     */
    createNode(id, type, position, data = {}, mass = 1.0) {
        // Allow data.type to override the explicit type parameter for flexibility
        const effectiveType = data?.type || type;
        const NodeClass = this.nodeTypes.get(effectiveType) || this.nodeTypes.get('default');

        if (!NodeClass) {
            console.warn(`NodeFactory: Node type "${effectiveType}" not found and no default type available for ID "${id}".`);
            return null;
        }

        const nodeInstance = new NodeClass(id, position, data, mass);
        // Ensure the space property is set, BaseNode constructor doesn't do this.
        // It's typically set when the node is added to the space/plugin.
        // nodeInstance.space = this.space;
        return nodeInstance;
    }
}
