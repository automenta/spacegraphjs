import { Plugin } from '../core/Plugin.js';
import { UIManager } from '../ui/UIManager.js';

export class UIPlugin extends Plugin {
    uiManager = null;
    contextMenuElement = null;
    confirmDialogElement = null;

    selectedNodes = new Set();
    selectedEdges = new Set();

    isLinking = false;
    linkSourceNode = null;

    constructor(spaceGraph, pluginManager, contextMenuElement, confirmDialogElement) {
        super(spaceGraph, pluginManager);
        this.contextMenuElement = contextMenuElement;
        this.confirmDialogElement = confirmDialogElement;
    }

    getName() {
        return 'UIPlugin';
    }

    init() {
        super.init();
        if (!this.contextMenuElement || !this.confirmDialogElement) {
            console.error('UIPlugin: Missing contextMenuElement or confirmDialogElement for UIManager initialization.');
            return;
        }
        this.uiManager = new UIManager(this.space, this.contextMenuElement, this.confirmDialogElement);
        this._setupInternalListeners();
    }

    _setupInternalListeners() {
        this.space.on('ui:request:setSelectedNode', (node, isMultiSelect) => this.setSelectedNode(node, isMultiSelect));
        this.space.on('ui:request:setSelectedEdge', (edge, isMultiSelect) => this.setSelectedEdge(edge, isMultiSelect));
        this.space.on('ui:request:startLinking', (sourceNode) => this.startLinking(sourceNode));
        this.space.on('ui:request:cancelLinking', () => this.cancelLinking());
        this.space.on('ui:request:completeLinking', (screenX, screenY) => this.completeLinking(screenX, screenY));
    }

    setSelectedNode(targetNode, isShiftPressed = false) {
        const changedItemsPayload = { selected: [], deselected: [] };

        if (isShiftPressed) {
            if (!targetNode) return;

            if (this.selectedNodes.has(targetNode)) {
                this.selectedNodes.delete(targetNode);
                targetNode.setSelectedStyle(false);
                changedItemsPayload.deselected.push({ item: targetNode, type: 'node' });
            } else {
                this.selectedNodes.add(targetNode);
                targetNode.setSelectedStyle(true);
                changedItemsPayload.selected.push({ item: targetNode, type: 'node' });
            }

            if (this.selectedNodes.size > 0 && this.selectedEdges.size > 0) {
                this.selectedEdges.forEach((edge) => {
                    edge.setHighlight(false);
                    changedItemsPayload.deselected.push({ item: edge, type: 'edge' });
                });
                this.selectedEdges.clear();
            }
        } else {
            const previouslySelectedNodes = new Set(this.selectedNodes);
            const previouslySelectedEdges = new Set(this.selectedEdges);

            previouslySelectedNodes.forEach((node) => {
                if (node !== targetNode) {
                    node.setSelectedStyle(false);
                    changedItemsPayload.deselected.push({ item: node, type: 'node' });
                }
            });
            this.selectedNodes.clear();

            previouslySelectedEdges.forEach((edge) => {
                edge.setHighlight(false);
                changedItemsPayload.deselected.push({ item: edge, type: 'edge' });
            });
            this.selectedEdges.clear();

            if (targetNode) {
                this.selectedNodes.add(targetNode);
                if (!previouslySelectedNodes.has(targetNode) || !targetNode.isSelected) {
                    targetNode.setSelectedStyle(true);
                }
                changedItemsPayload.selected.push({ item: targetNode, type: 'node' });
            }
        }

        if (changedItemsPayload.selected.length > 0 || changedItemsPayload.deselected.length > 0) {
            this.space.emit('selection:changed', changedItemsPayload);
        }

        this.space.emit('node:selected', targetNode);
    }

    getSelectedNodes() {
        return this.selectedNodes;
    }

    setSelectedEdge(targetEdge, isShiftPressed = false) {
        const changedItemsPayload = { selected: [], deselected: [] };

        if (isShiftPressed) {
            if (!targetEdge) return;

            if (this.selectedEdges.has(targetEdge)) {
                this.selectedEdges.delete(targetEdge);
                targetEdge.setHighlight(false);
                changedItemsPayload.deselected.push({ item: targetEdge, type: 'edge' });
            } else {
                this.selectedEdges.add(targetEdge);
                targetEdge.setHighlight(true);
                changedItemsPayload.selected.push({ item: targetEdge, type: 'edge' });
            }

            if (this.selectedEdges.size > 0 && this.selectedNodes.size > 0) {
                this.selectedNodes.forEach((node) => {
                    node.setSelectedStyle(false);
                    changedItemsPayload.deselected.push({ item: node, type: 'node' });
                });
                this.selectedNodes.clear();
            }
        } else {
            const previouslySelectedEdges = new Set(this.selectedEdges);
            const previouslySelectedNodes = new Set(this.selectedNodes);

            previouslySelectedEdges.forEach((edge) => {
                if (edge !== targetEdge) {
                    edge.setHighlight(false);
                    changedItemsPayload.deselected.push({ item: edge, type: 'edge' });
                }
            });
            this.selectedEdges.clear();

            previouslySelectedNodes.forEach((node) => {
                node.setSelectedStyle(false);
                changedItemsPayload.deselected.push({ item: node, type: 'node' });
            });
            this.selectedNodes.clear();

            if (targetEdge) {
                this.selectedEdges.add(targetEdge);
                if (!previouslySelectedEdges.has(targetEdge) || !targetEdge.isHighlighted) {
                    targetEdge.setHighlight(true);
                }
                changedItemsPayload.selected.push({ item: targetEdge, type: 'edge' });
            }
        }

        if (changedItemsPayload.selected.length > 0 || changedItemsPayload.deselected.length > 0) {
            this.space.emit('selection:changed', changedItemsPayload);
        }

        this.space.emit('edge:selected', targetEdge);
    }

    getSelectedEdges() {
        return this.selectedEdges;
    }

    startLinking(sourceNode) {
        if (!sourceNode || this.isLinking) return;
        this.isLinking = true;
        this.linkSourceNode = sourceNode;
        this.space.emit('linking:started', sourceNode);
    }

    completeLinking(screenX, screenY) {
        if (!this.isLinking || !this.linkSourceNode) return;

        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
        const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');

        const targetInfo = this.uiManager?._getTargetInfo({ clientX: screenX, clientY: screenY });

        let targetNodeInstance = null;
        if (targetInfo?.node) {
            targetNodeInstance =
                typeof targetInfo.node === 'string' ? nodePlugin?.getNodeById(targetInfo.node) : targetInfo.node;
        }

        if (targetNodeInstance && targetNodeInstance !== this.linkSourceNode) {
            edgePlugin?.addEdge(this.linkSourceNode, targetNodeInstance);
            layoutPlugin?.kick();
            this.space.emit('linking:succeeded', { source: this.linkSourceNode, target: targetNodeInstance });
        } else {
            this.space.emit('linking:failed', { source: this.linkSourceNode, targetAttempt: targetNodeInstance });
        }

        this.isLinking = false;
        this.linkSourceNode = null;
        this.space.emit('linking:completed');
    }

    cancelLinking() {
        if (!this.isLinking) return;
        const source = this.linkSourceNode;
        this.isLinking = false;
        this.linkSourceNode = null;
        this.space.emit('linking:cancelled', { sourceNode: source });
    }

    getIsLinking() {
        return this.isLinking;
    }

    getLinkSourceNode() {
        return this.linkSourceNode;
    }

    getUIManager() {
        return this.uiManager;
    }

    update() {
        if (this.uiManager && typeof this.uiManager.updateEdgeMenuPosition === 'function') {
            this.uiManager.updateEdgeMenuPosition();
        }
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
