export class MinimapPlugin extends Plugin {
    minimapCamera: any;
    nodeProxies: Map<any, any>;
    frustumHelper: any;
    minimapScene: any;
    currentViewport: any;
    currentScissor: any;
    _setupMinimapCamera(): void;
    _setupFrustumHelper(): void;
    _addNodeProxy(node: any): void;
    _removeNodeProxy(nodeId: any): void;
    _updateNodeProxies(): void;
    _updateFrustumHelper(): void;
    render(renderer: any): void;
}
import { Plugin } from '../core/Plugin.js';
