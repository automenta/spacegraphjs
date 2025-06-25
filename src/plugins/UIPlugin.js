import { Plugin } from '../core/Plugin.js';
import { UIManager } from '../ui/UIManager.js'; // Import the actual UIManager

export class UIPlugin extends Plugin {
    uiManager = null;
    selectedNodes = new Set();
    selectedEdges = new Set();
    linkSourceNode = null;
    isLinking = false;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
    }

    getName() {
        return 'UIPlugin';
    }

    init() {
        super.init();

        // Get UI elements from SpaceGraph options
        const contextMenuEl = this.space.options.ui?.contextMenuElement;
        const confirmDialogEl = this.space.options.ui?.confirmDialogElement;

        if (!contextMenuEl || !confirmDialogEl) {
            console.error('UIPlugin: Missing required UI elements in SpaceGraph options.');
            return;
        }

        // Instantiate the UIManager, passing necessary dependencies and callbacks
        this.uiManager = new UIManager(
            this.space,
            contextMenuEl,
            confirmDialogEl,
            // Pass callbacks for UIManager to update UIPlugin's state or query it
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

        // The UIManager constructor already handles its own event binding and initial setup.
        // No need to call them here explicitly after UIManager is instantiated.
    }

    // Public methods for other plugins/SpaceGraph to interact with UI state
    getSelectedNodes() {
        return this.selectedNodes;
    }

    getSelectedEdges() {
        return this.selectedEdges;
    }

    getSelectedNode() {
        return this.selectedNodes.values().next().value || null;
    }

    setSelectedNode(node, multiSelect = false) {
        const oldSelection = new Set(this.selectedNodes);
        if (!multiSelect) this.selectedNodes.clear();

        if (node) {
            if (this.selectedNodes.has(node) && multiSelect) {
                this.selectedNodes.delete(node);
            } else {
                this.selectedNodes.add(node);
            }
        }

        this.selectedEdges.clear(); // Clear edge selection when node is selected

        this._updateSelectionHighlights(oldSelection, this.selectedNodes, this.space.plugins.getPlugin('NodePlugin')?.getNodes());
        this._updateSelectionHighlights(new Set(), this.selectedEdges, this.space.plugins.getPlugin('EdgePlugin')?.getEdges());

        this.space.emit('selection:changed', {
            selected: this.selectedNodes,
            deselected: oldSelection,
            type: 'node',
        });
    }

    setSelectedEdge(edge, multiSelect = false) {
        const oldSelection = new Set(this.selectedEdges);
        if (!multiSelect) this.selectedEdges.clear();

        if (edge) {
            if (this.selectedEdges.has(edge) && multiSelect) {
                this.selectedEdges.delete(edge);
            } else {
                this.selectedEdges.add(edge);
            }
        }

        this.selectedNodes.clear(); // Clear node selection when edge is selected

        this._updateSelectionHighlights(oldSelection, this.selectedEdges, this.space.plugins.getPlugin('EdgePlugin')?.getEdges());
        this._updateSelectionHighlights(new Set(), this.selectedNodes, this.space.plugins.getPlugin('NodePlugin')?.getNodes());

        this.space.emit('selection:changed', {
            selected: this.selectedEdges,
            deselected: oldSelection,
            type: 'edge',
        });
    }

    _updateSelectionHighlights(oldSelection, newSelection, allItemsMap) {
        allItemsMap?.forEach((item) => {
            const isSelected = newSelection.has(item);
            const wasSelected = oldSelection.has(item);
            if (isSelected && !wasSelected) {
                item.setSelected?.(true);
            } else if (!isSelected && wasSelected) {
                item.setSelected?.(false);
            }
        });
    }

    startLinking(sourceNode) {
        if (this.isLinking) this.cancelLinking();
        this.linkSourceNode = sourceNode;
        this.isLinking = true;
        this.space.emit('linking:started', { sourceNode });
    }

    cancelLinking() {
        if (!this.isLinking) return;
        this.linkSourceNode = null;
        this.isLinking = false;
        this.space.emit('linking:cancelled');
    }

    getIsLinking() {
        return this.isLinking;
    }

    getLinkSourceNode() {
        return this.linkSourceNode;
    }

    async completeLinking(screenX, screenY) {
        if (!this.isLinking || !this.linkSourceNode) return;

        const targetInfo = this.uiManager._getTargetInfo({ clientX: screenX, clientY: screenY });
        const targetNode = targetInfo.node;

        if (targetNode && targetNode !== this.linkSourceNode) {
            const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
            const newEdge = edgePlugin?.addEdge(this.linkSourceNode, targetNode);
            if (newEdge) {
                this.space.emit('linking:succeeded', { source: this.linkSourceNode, target: targetNode, edge: newEdge });
            } else {
                this.space.emit('linking:failed', { source: this.linkSourceNode, target: targetNode, reason: 'Edge creation failed' });
            }
        } else {
            this.space.emit('linking:failed', { source: this.linkSourceNode, target: targetNode, reason: 'Invalid target node' });
        }
        this.cancelLinking();
    }

    dispose() {
        super.dispose();
        this.uiManager?.dispose();
        this.uiManager = null;
        this.selectedNodes.clear();
        this.selectedEdges.clear();
        this.linkSourceNode = null;
    }
}
