import {Plugin} from '../core/Plugin.js';
import {UIManager} from '../ui/UIManager.js';

export class UIPlugin extends Plugin {
    uiManager = null;
    selectedNodes = new Set();
    selectedEdges = new Set();
    linkSourceNode = null;
    isLinking = false;

    constructor(spaceGraph, pluginManager, contextMenuElement, confirmDialogElement) {
        super(spaceGraph, pluginManager);
        this.uiManager = new UIManager(
            spaceGraph,
            contextMenuElement,
            confirmDialogElement,
            {
                setSelectedNode: this.setSelectedNode.bind(this),
                setSelectedEdge: this.setSelectedEdge.bind(this),
                cancelLinking: this.cancelLinking.bind(this),
                getIsLinking: this.getIsLinking.bind(this),
                getLinkSourceNode: this.getLinkSourceNode.bind(this),
                getSelectedNodes: this.getSelectedNodes.bind(this),
                getSelectedEdges: this.getSelectedEdges.bind(this),
                completeLinking: this.completeLinking.bind(this),
            }
        );
    }

    getName() {
        return 'UIPlugin';
    }

    init() {
        super.init();
        // The UIManager constructor already handles its own initialization.
        // Calling init() here is redundant and causes a TypeError as UIManager has no such method.
        // this.uiManager.init(); // REMOVED THIS LINE
        this._subscribeToEvents();
    }

    _subscribeToEvents() {
        this.space.on('node:removed', this._onNodeRemoved);
        this.space.on('edge:removed', this._onEdgeRemoved);
        this.space.on('ui:request:startLinking', this.startLinking);
    }

    _onNodeRemoved = (nodeId, node) => {
        if (node) this.selectedNodes.delete(node);
        if (this.linkSourceNode?.id === nodeId) this.cancelLinking();
        this._emitSelectionChange();
    };

    _onEdgeRemoved = (_edgeId, edge) => {
        if (edge) this.selectedEdges.delete(edge);
        this._emitSelectionChange();
    };

    setSelectedNode(node, multiSelect = false) {
        if (!multiSelect) {
            this.selectedNodes.forEach((n) => n.setSelectedStyle(false));
            this.selectedNodes.clear();
            this.selectedEdges.forEach((e) => e.setHighlight(false));
            this.selectedEdges.clear();
        }

        if (node) {
            if (this.selectedNodes.has(node)) {
                this.selectedNodes.delete(node);
                node.setSelectedStyle(false);
            } else {
                this.selectedNodes.add(node);
                node.setSelectedStyle(true);
            }
        } else if (!multiSelect) {
            this.selectedNodes.forEach((n) => n.setSelectedStyle(false));
            this.selectedNodes.clear();
        }
        this._emitSelectionChange();
    }

    setSelectedEdge(edge, multiSelect = false) {
        if (!multiSelect) {
            this.selectedEdges.forEach((e) => e.setHighlight(false));
            this.selectedEdges.clear();
            this.selectedNodes.forEach((n) => n.setSelectedStyle(false));
            this.selectedNodes.clear();
        }

        if (edge) {
            if (this.selectedEdges.has(edge)) {
                this.selectedEdges.delete(edge);
                edge.setHighlight(false);
            } else {
                this.selectedEdges.add(edge);
                edge.setHighlight(true);
            }
        } else if (!multiSelect) {
            this.selectedEdges.forEach((e) => e.setHighlight(false));
            this.selectedEdges.clear();
        }
        this._emitSelectionChange();
    }

    _emitSelectionChange() {
        const selectedItems = new Set([...this.selectedNodes, ...this.selectedEdges]);
        const type = this.selectedNodes.size > 0 ? 'node' : (this.selectedEdges.size > 0 ? 'edge' : 'none');
        this.space.emit('selection:changed', { selected: selectedItems, type });
    }

    getSelectedNode() {
        return this.selectedNodes.values().next().value || null;
    }

    getSelectedNodes() {
        return this.selectedNodes;
    }

    getSelectedEdge() {
        return this.selectedEdges.values().next().value || null;
    }

    getSelectedEdges() {
        return this.selectedEdges;
    }

    startLinking = (sourceNode) => {
        if (!sourceNode) return;
        this.linkSourceNode = sourceNode;
        this.isLinking = true;
        this.space.emit('linking:started', { sourceNode });
    };

    cancelLinking = () => {
        this.linkSourceNode = null;
        this.isLinking = false;
        this.space.emit('linking:cancelled');
    };

    completeLinking = (screenX, screenY) => {
        if (!this.isLinking || !this.linkSourceNode) return;

        const targetInfo = this.space.intersectedObjects(screenX, screenY);
        const targetNode = targetInfo?.node;

        if (targetNode && targetNode !== this.linkSourceNode) {
            this.space.emit('ui:request:addEdge', this.linkSourceNode, targetNode);
            this.space.emit('linking:succeeded', { source: this.linkSourceNode, target: targetNode });
        } else {
            this.space.emit('linking:failed');
        }
        this.cancelLinking();
    };

    getIsLinking = () => this.isLinking;
    getLinkSourceNode = () => this.linkSourceNode;

    update() {
        // If there's exactly one edge selected, update its menu position
        if (this.selectedEdges.size === 1) {
            const selectedEdge = this.selectedEdges.values().next().value;
            this.uiManager?.edgeMenu?.updatePosition(selectedEdge);
        }
    }

    dispose() {
        super.dispose();
        this.space.off('node:removed', this._onNodeRemoved);
        this.space.off('edge:removed', this._onEdgeRemoved);
        this.space.off('ui:request:startLinking', this.startLinking);

        this.uiManager?.dispose();
        this.uiManager = null;
        this.selectedNodes.clear();
        this.selectedEdges.clear();
        this.linkSourceNode = null;
    }
}
