export class UIPlugin extends Plugin {
    constructor(spaceGraph: any, pluginManager: any, contextMenuElement: any, confirmDialogElement: any);
    uiManager: any;
    selectedNodes: Set<any>;
    selectedEdges: Set<any>;
    linkSourceNode: any;
    isLinking: boolean;
    _subscribeToEvents(): void;
    _onNodeRemoved: (nodeId: any, node: any) => void;
    _onEdgeRemoved: (_edgeId: any, edge: any) => void;
    setSelectedNode(node: any, multiSelect?: boolean): void;
    setSelectedEdge(edge: any, multiSelect?: boolean): void;
    _emitSelectionChange(): void;
    getSelectedNode(): any;
    getSelectedNodes(): Set<any>;
    getSelectedEdge(): any;
    getSelectedEdges(): Set<any>;
    startLinking: (sourceNode: any) => void;
    cancelLinking: () => void;
    completeLinking: (screenX: any, screenY: any) => void;
    getIsLinking: () => boolean;
    getLinkSourceNode: () => any;
}
import { Plugin } from '../core/Plugin.js';
