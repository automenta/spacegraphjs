export class LayoutPlugin extends Plugin {
    layoutManager: any;
    init(): Promise<void>;
    _setupEventListeners(): void;
    addNodeToLayout(node: any): void;
    removeNodeFromLayout(node: any): void;
    addEdgeToLayout(edge: any): void;
    removeEdgeFromLayout(edge: any): void;
    kick(): void;
    stop(): void;
    applyLayout(name: any, config?: {}): Promise<any>;
    togglePinNode(nodeId: any): void;
}
import { Plugin } from '../core/Plugin.js';
