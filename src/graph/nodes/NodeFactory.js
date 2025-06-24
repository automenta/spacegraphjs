import { HtmlNode } from './HtmlNode.js';
import { ShapeNode } from './ShapeNode.js';
import { ImageNode } from './ImageNode.js';
import { VideoNode } from './VideoNode.js';
import { IFrameNode } from './IFrameNode.js';
import { GroupNode } from './GroupNode.js';
import { DataNode } from './DataNode.js';

export class NodeFactory {
    constructor(space) {
        this.space = space;
        this.nodeTypes = new Map();
        this._registerDefaultNodeTypes();
    }

    _registerDefaultNodeTypes() {
        this.registerNodeType('html', HtmlNode);
        this.registerNodeType('shape', ShapeNode);
        this.registerNodeType('image', ImageNode);
        this.registerNodeType('video', VideoNode);
        this.registerNodeType('iframe', IFrameNode);
        this.registerNodeType('group', GroupNode);
        this.registerNodeType('data', DataNode);
        this.registerNodeType('default', ShapeNode);
    }

    registerNodeType(typeName, nodeClass) {
        if (this.nodeTypes.has(typeName)) {
            return;
        }
        this.nodeTypes.set(typeName, nodeClass);
    }

    createNode(id, type, position, data = {}, mass = 1.0) {
        const NodeClass = this.nodeTypes.get(type) || this.nodeTypes.get(data.type) || this.nodeTypes.get('default');

        if (NodeClass) {
            const nodeInstance = new NodeClass(id, position, data, mass);
            return nodeInstance;
        }
        return null;
    }
}
