import { BaseFactory } from '../core/BaseFactory.js'; // Import BaseFactory
import {HtmlNode} from './nodes/HtmlNode.js';
import {ShapeNode} from './nodes/ShapeNode.js';
import {ImageNode} from './nodes/ImageNode.js';
import {VideoNode} from './nodes/VideoNode.js';
import {IFrameNode} from './nodes/IFrameNode.js';
import {GroupNode} from './nodes/GroupNode.js';
import {DataNode} from './nodes/DataNode.js';
import {NoteNode} from './nodes/NoteNode.js';
import {AudioNode} from './nodes/AudioNode.js';
import {DocumentNode} from './nodes/DocumentNode.js';
import {ChartNode} from './nodes/ChartNode.js';
import {ControlPanelNode} from './nodes/ControlPanelNode.js';
import {ProgressNode} from './nodes/ProgressNode.js';
import {CanvasNode} from './nodes/CanvasNode.js';
import {ProceduralShapeNode} from './nodes/ProceduralShapeNode.js';
import {TextMeshNode} from './nodes/TextMeshNode.js';
import {MetaWidgetNode} from './nodes/MetaWidgetNode.js';

export class NodeFactory extends BaseFactory { // Extend BaseFactory
    constructor(space) {
        super(); // Call BaseFactory constructor
        this.space = space;
    }

    registerCoreNodeTypes() {
        this.registerType(HtmlNode.typeName, HtmlNode);
        this.registerType(ShapeNode.typeName, ShapeNode);
        this.registerType(ImageNode.typeName, ImageNode);
        this.registerType(VideoNode.typeName, VideoNode);
        this.registerType(IFrameNode.typeName, IFrameNode);
        this.registerType(GroupNode.typeName, GroupNode);
        this.registerType(DataNode.typeName, DataNode);
        this.registerType(NoteNode.typeName, NoteNode);

        this.registerType(AudioNode.typeName, AudioNode);
        this.registerType(DocumentNode.typeName, DocumentNode);
        this.registerType(ChartNode.typeName, ChartNode);
        
        // Advanced widget nodes
        this.registerType(ControlPanelNode.typeName, ControlPanelNode);
        this.registerType(ProgressNode.typeName, ProgressNode);
        this.registerType(CanvasNode.typeName, CanvasNode);
        
        // Advanced shape nodes
        this.registerType(ProceduralShapeNode.typeName, ProceduralShapeNode);
        this.registerType(TextMeshNode.typeName, TextMeshNode);
        
        // MetaWidget system
        this.registerType(MetaWidgetNode.typeName, MetaWidgetNode);

        this.registerType('default', ShapeNode);
    }

    /**
     * Creates a new node instance of a given type.
     * @param {string} id - The unique ID for the node.
     * @param {string} type - The typeName of the node to create.
     * @param {object} position - An object with x, y, z coordinates.
     * @param {object} [data={}] - Custom data for the node.
     * @param {number} [mass=1.0] - The mass of the node.
     * @returns {Node|null} The created node instance, or null if the type is not found.
     */
    createNode(id, type, position, data = {}, mass = 1.0) {
        const effectiveType = data?.type || type;
        const nodeInstance = this.create(effectiveType, [id, position, data, mass], 'default');
        if (nodeInstance) {
            nodeInstance.space = this.space;
        }
        return nodeInstance;
    }
}
