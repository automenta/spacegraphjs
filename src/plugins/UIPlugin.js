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
    nodeSelected = null;
    edgeSelected = null;

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
        this.space.on('ui:request:setSelectedNode', (node) => this.setSelectedNode(node));
        this.space.on('ui:request:setSelectedEdge', (edge) => this.setSelectedEdge(edge));
        this.space.on('ui:request:startLinking', (sourceNode) => this.startLinking(sourceNode));
        this.space.on('ui:request:cancelLinking', () => this.cancelLinking());
        this.space.on('ui:request:completeLinking', (screenX, screenY) => this.completeLinking(screenX, screenY));
    }

    // --- Selection Methods ---
    setSelectedNode(node) {
        if (this.nodeSelected === node) return;
        const oldSelection = this.nodeSelected;
        this.nodeSelected = node;
        if (this.edgeSelected && node) {
            // Clear edge selection if node is selected
            this.setSelectedEdge(null);
        }
        this.space.emit('selection:changed', { type: 'node', selected: this.nodeSelected, deselected: oldSelection });
        this.space.emit('node:selected', this.nodeSelected); // Keep specific event for now
    }

    getSelectedNode() {
        return this.nodeSelected;
    }

    setSelectedEdge(edge) {
        if (this.edgeSelected === edge) return;
        const oldSelection = this.edgeSelected;
        this.edgeSelected = edge;
        if (this.nodeSelected && edge) {
            // Clear node selection if edge is selected
            this.setSelectedNode(null);
        }
        this.space.emit('selection:changed', { type: 'edge', selected: this.edgeSelected, deselected: oldSelection });
        this.space.emit('edge:selected', this.edgeSelected); // Keep specific event for now
    }

    getSelectedEdge() {
        return this.edgeSelected;
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
