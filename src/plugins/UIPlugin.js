/**
 * @file UIPlugin.js - Manages the UIManager for SpaceGraph.
 * @licence MIT
 */

import { Plugin } from '../core/Plugin.js';
import { UIManager } from '../ui/UIManager.js';

export class UIPlugin extends Plugin {
    /** @type {UIManager | null} */
    uiManager = null;
    contextMenuElement = null;
    confirmDialogElement = null;

    // Selection state
    selectedNodes = new Set(); // Stores selected BaseNode instances
    selectedEdges = new Set(); // Stores selected Edge instances

    // Linking state
    isLinking = false;
    linkSourceNode = null;
    // tempLinkLine related visuals would be managed here or by a dedicated visual handler.

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
        // UIManager constructor expects the SpaceGraph instance, contextMenuEl, confirmDialogEl.
        if (!this.contextMenuElement || !this.confirmDialogElement) {
            console.error('UIPlugin: Missing contextMenuElement or confirmDialogElement for UIManager initialization.');
            return;
        }
        this.uiManager = new UIManager(this.space, this.contextMenuElement, this.confirmDialogElement);

        // Initialize UI elements if UIManager has such a method,
        // or UIManager's constructor handles it.
        // For now, UIManager's constructor sets up its own event listeners.

        this._setupInternalListeners();
    }

    _setupInternalListeners() {
        this.space.on('ui:request:setSelectedNode', (node, isMultiSelect) => this.setSelectedNode(node, isMultiSelect));
        this.space.on('ui:request:setSelectedEdge', (edge, isMultiSelect) => this.setSelectedEdge(edge, isMultiSelect));
        this.space.on('ui:request:startLinking', (sourceNode) => this.startLinking(sourceNode));
        this.space.on('ui:request:cancelLinking', () => this.cancelLinking());
        this.space.on('ui:request:completeLinking', (screenX, screenY) => this.completeLinking(screenX, screenY));
    }

    // --- Selection Methods ---
    setSelectedNode(targetNode, isShiftPressed = false) {
        const changedItemsPayload = { selected: [], deselected: [] }; // For the 'selection:changed' event

        if (isShiftPressed) {
            if (!targetNode) return; // Shift-clicking background doesn't change node selection

            if (this.selectedNodes.has(targetNode)) {
                this.selectedNodes.delete(targetNode);
                targetNode.setSelectedStyle(false);
                changedItemsPayload.deselected.push({ item: targetNode, type: 'node' });
            } else {
                this.selectedNodes.add(targetNode);
                targetNode.setSelectedStyle(true);
                changedItemsPayload.selected.push({ item: targetNode, type: 'node' });
            }

            // If nodes are being selected, ensure edges are cleared (maintaining mutual exclusivity for now)
            if (this.selectedNodes.size > 0 && this.selectedEdges.size > 0) {
                this.selectedEdges.forEach(edge => {
                    edge.setHighlight(false);
                    changedItemsPayload.deselected.push({ item: edge, type: 'edge' });
                });
                this.selectedEdges.clear();
            }
        } else { // Single selection logic
            const previouslySelectedNodes = new Set(this.selectedNodes);
            const previouslySelectedEdges = new Set(this.selectedEdges);

            // Clear all current selections from their respective sets and update styles
            previouslySelectedNodes.forEach(node => {
                if (node !== targetNode) { // Don't deselect if it's the target of the single select
                    node.setSelectedStyle(false);
                    changedItemsPayload.deselected.push({ item: node, type: 'node' });
                }
            });
            this.selectedNodes.clear();

            previouslySelectedEdges.forEach(edge => {
                edge.setHighlight(false);
                changedItemsPayload.deselected.push({ item: edge, type: 'edge' });
            });
            this.selectedEdges.clear();

            if (targetNode) {
                this.selectedNodes.add(targetNode);
                if (!previouslySelectedNodes.has(targetNode) || !targetNode.isSelected) { // isSelected might be a direct prop or inferred
                    targetNode.setSelectedStyle(true); // Ensure style is applied if it wasn't already
                }
                changedItemsPayload.selected.push({ item: targetNode, type: 'node' });
            }
        }

        if (changedItemsPayload.selected.length > 0 || changedItemsPayload.deselected.length > 0) {
            this.space.emit('selection:changed', changedItemsPayload);
        }

        // Emit specific event for the primary node interacted with.
        // UIManager might rely on this for context menus or quick actions.
        // If targetNode was just deselected via shift-click, it's still the "target" of the action.
        this.space.emit('node:selected', targetNode);
    }

    getSelectedNodes() {
        return this.selectedNodes; // Returns the Set
    }

    setSelectedEdge(targetEdge, isShiftPressed = false) {
        const changedItemsPayload = { selected: [], deselected: [] }; // For the 'selection:changed' event

        if (isShiftPressed) {
            if (!targetEdge) return; // Shift-clicking background doesn't change edge selection

            if (this.selectedEdges.has(targetEdge)) {
                this.selectedEdges.delete(targetEdge);
                targetEdge.setHighlight(false);
                changedItemsPayload.deselected.push({ item: targetEdge, type: 'edge' });
            } else {
                this.selectedEdges.add(targetEdge);
                targetEdge.setHighlight(true);
                changedItemsPayload.selected.push({ item: targetEdge, type: 'edge' });
            }

            // If edges are being selected, ensure nodes are cleared (maintaining mutual exclusivity for now)
            if (this.selectedEdges.size > 0 && this.selectedNodes.size > 0) {
                this.selectedNodes.forEach(node => {
                    node.setSelectedStyle(false);
                    changedItemsPayload.deselected.push({ item: node, type: 'node' });
                });
                this.selectedNodes.clear();
            }
        } else { // Single selection logic
            const previouslySelectedEdges = new Set(this.selectedEdges);
            const previouslySelectedNodes = new Set(this.selectedNodes);

            // Clear all current selections from their respective sets and update styles
            previouslySelectedEdges.forEach(edge => {
                if (edge !== targetEdge) {
                    edge.setHighlight(false);
                    changedItemsPayload.deselected.push({ item: edge, type: 'edge' });
                }
            });
            this.selectedEdges.clear();

            previouslySelectedNodes.forEach(node => {
                node.setSelectedStyle(false);
                changedItemsPayload.deselected.push({ item: node, type: 'node' });
            });
            this.selectedNodes.clear();

            if (targetEdge) {
                this.selectedEdges.add(targetEdge);
                 if (!previouslySelectedEdges.has(targetEdge) || !targetEdge.isHighlighted) { // isHighlighted might be a direct prop or inferred
                    targetEdge.setHighlight(true); // Ensure style is applied
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

    // --- Linking Methods ---
    startLinking(sourceNode) {
        if (!sourceNode || this.isLinking) return;
        this.isLinking = true;
        this.linkSourceNode = sourceNode;
        // TODO: Initialize tempLinkLine visuals if any
        this.space.emit('linking:started', sourceNode);
    }

    completeLinking(screenX, screenY) {
        if (!this.isLinking || !this.linkSourceNode) return;

        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
        const layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');

        // The logic to find target node from screenX, screenY might use space.intersectedObjects
        // or a similar method on RenderingPlugin/InteractionPlugin.
        // For now, assuming UIManager might still have _getTargetInfo or space.intersectedObjects is used by UIManager.
        const targetInfo = this.uiManager?._getTargetInfo({ clientX: screenX, clientY: screenY }); // Risky direct call, ideally UIManager handles this and calls back or emits event

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
        // TODO: Dispose tempLinkLine visuals
        this.space.emit('linking:completed'); // General completion event
    }

    cancelLinking() {
        if (!this.isLinking) return;
        const source = this.linkSourceNode;
        this.isLinking = false;
        this.linkSourceNode = null;
        // TODO: Dispose tempLinkLine visuals
        this.space.emit('linking:cancelled', { sourceNode: source });
    }

    getIsLinking() {
        return this.isLinking;
    }

    getLinkSourceNode() {
        return this.linkSourceNode;
    }

    /**
     * Provides the UIManager instance.
     * @returns {UIManager | null}
     */
    getUIManager() {
        return this.uiManager;
    }

    /**
     * The main update loop for UI-specific tasks, if any, that need per-frame updates.
     */
    update() {
        // Example: Delegate to UIManager's update method if it exists
        // This is where this.ui?.updateEdgeMenuPosition() from SpaceGraph would go.
        if (this.uiManager && typeof this.uiManager.updateEdgeMenuPosition === 'function') {
            this.uiManager.updateEdgeMenuPosition();
        }
        // TODO: Update tempLinkLine visual if isLinking is true
    }

    dispose() {
        super.dispose();
        this.uiManager?.dispose();
        this.uiManager = null;
        this.nodeSelected = null;
        this.edgeSelected = null;
        this.linkSourceNode = null;
        // console.log('UIPlugin disposed.');
    }
}
