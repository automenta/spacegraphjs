import { Plugin } from '../core/Plugin.js';
import { UIManager } from '../ui/UIManager.js';
// import { InteractionState } from '../ui/InteractionState.js'; // Unused
// import * as THREE from 'three'; // Unused
import { HtmlNode } from '../graph/nodes/HtmlNode.js'; // Import HtmlNode

// const raycaster = new THREE.Raycaster(); // Managed by UIManager or SpaceGraph
// const dragPlane = new THREE.Plane(); // Managed by UIManager

export class UIPlugin extends Plugin {
    uiManager = null;
    selectedNodes = new Set();
    selectedEdges = new Set();
    linkSourceNode = null;
    isLinking = false;
    // hoveredNode = null; // Track the currently hovered node - REMOVED, UIManager handles this
    renderingPlugin = null; // Reference to the RenderingPlugin

    // Removed interaction state for drag/resize, as UIManager will handle it
    // activeInteraction = InteractionState.IDLE;
    // draggedNode = null;
    // resizedNode = null;
    // initialPointerPosition = new THREE.Vector2();
    // initialNodePosition = new THREE.Vector3();
    // initialNodeScale = new THREE.Vector3();
    // activeResizeHandle = null;

    constructor(spaceGraph, pluginManager, contextMenuElement, confirmDialogElement) {
        super(spaceGraph, pluginManager);
        this.uiManager = new UIManager(spaceGraph, contextMenuElement, confirmDialogElement, {
            setSelectedNode: this.setSelectedNode.bind(this),
            setSelectedEdge: this.setSelectedEdge.bind(this),
            cancelLinking: this.cancelLinking.bind(this),
            getIsLinking: this.getIsLinking.bind(this),
            getLinkSourceNode: this.getLinkSourceNode.bind(this),
            getSelectedNodes: this.getSelectedNodes.bind(this),
            getSelectedEdges: this.getSelectedEdges.bind(this),
            completeLinking: this.completeLinking.bind(this),
        });
    }

    getName() {
        return 'UIPlugin';
    }

    init() {
        super.init();
        this.renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        this._subscribeToEvents();
        this._addEventListeners();
    }

    _subscribeToEvents() {
        this.space.on('node:removed', this._onNodeRemoved);
        this.space.on('edge:removed', this._onEdgeRemoved);
        this.space.on('ui:request:startLinking', this.startLinking);
        this.space.on('metaframe:editNode', this._onMetaframeEditNode);
        this.space.on('metaframe:linkNode', this._onMetaframeLinkNode);
        this.space.on('metaframe:deleteNode', this._onMetaframeDeleteNode);
        this.space.on('metaframe:toggleNodeContentEditable', this._onToggleNodeContentEditable);

        this.space.on('ui:request:adjustContentScale', this._onAdjustContentScale);
        this.space.on('ui:request:adjustNodeSize', this._onAdjustNodeSize);
    }

    _onToggleNodeContentEditable = ({ node }) => {
        if (node instanceof HtmlNode && typeof node.toggleContentEditable === 'function') {
            node.toggleContentEditable();
        }
    };

    _onAdjustContentScale = (payload) => {
        // Ensure node is an HtmlNode and has the method, and factor is present
        if (
            payload &&
            payload.node instanceof HtmlNode &&
            typeof payload.node.adjustContentScale === 'function' &&
            payload.factor !== undefined
        ) {
            payload.node.adjustContentScale(payload.factor);
        }
    };

    _onAdjustNodeSize = (payload) => {
        if (
            payload &&
            payload.node &&
            typeof payload.node.adjustNodeSize === 'function' &&
            payload.factor !== undefined
        ) {
            payload.node.adjustNodeSize(payload.factor);
        }
    };

    _addEventListeners() {
        const domElement = this.renderingPlugin?.renderGL?.domElement;
        if (domElement) {
            // UIManager now handles all hover effects via its _onPointerMove and _handleHover.
            // No listeners needed here specifically for hover.
            // domElement.addEventListener('pointermove', this._onPointerMoveGeneral); // REMOVED
        }
    }

    _removeEventListeners() {
        const domElement = this.renderingPlugin?.renderGL?.domElement;
        if (domElement) {
            // domElement.removeEventListener('pointermove', this._onPointerMoveGeneral); // REMOVED
        }
    }

    // _onPointerMoveGeneral has been removed. UIManager._handleHover now manages all hover effects.

    _onNodeRemoved = (nodeId, node) => {
        if (node) {
            this.selectedNodes.delete(node);
            // UIManager's hoveredNodeForMetaframe will handle its own state if the removed node was hovered.
            // if (this.hoveredNode === node) { // REMOVED
            //     this.hoveredNode.metaframe?.hide(); // This would be redundant or conflicting
            //     this.hoveredNode = null;
            // }
        }
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
        const type = this.selectedNodes.size > 0 ? 'node' : this.selectedEdges.size > 0 ? 'edge' : 'none';
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

    // _onPointerUp is removed as UIManager._onPointerUp handles the state transitions
    // and emitting relevant events like 'node:dragged' or 'node:resized' via UIManager's logic.
    // UIManager will also manage space.isDragging.

    // Metaframe event handlers, originally from _subscribeToEvents
    // These are fine here as they are reactions to events, not direct pointer handling.
    _onMetaframeEditNode = ({ node }) => {
        this.space.emit('ui:node:editRequested', { node });
    };

    _onMetaframeLinkNode = ({ node }) => {
        this.startLinking(node);
    };

    _onMetaframeDeleteNode = ({ node }) => {
        this.space.emit('ui:request:confirm', {
            message: `Delete node "${node.id.substring(0, 10)}..."?`,
            onConfirm: () => this.space.emit('ui:request:removeNode', node.id),
        });
    };

    update() {
        // If there's exactly one edge selected, update its menu position
        if (this.selectedEdges.size === 1) {
            const selectedEdge = this.selectedEdges.values().next().value;
            this.uiManager?.edgeMenu?.updatePosition(selectedEdge);
        }
    }

    dispose() {
        super.dispose();
        this._removeEventListeners();
        this.space.off('node:removed', this._onNodeRemoved);
        this.space.off('edge:removed', this._onEdgeRemoved);
        this.space.off('ui:request:startLinking', this.startLinking);
        this.space.off('metaframe:editNode', this._onMetaframeEditNode);
        this.space.off('metaframe:linkNode', this._onMetaframeLinkNode);
        this.space.off('metaframe:deleteNode', this._onMetaframeDeleteNode);
        this.space.off('metaframe:toggleNodeContentEditable', this._onToggleNodeContentEditable);
        this.space.off('ui:request:adjustContentScale', this._onAdjustContentScale);
        this.space.off('ui:request:adjustNodeSize', this._onAdjustNodeSize);

        this.uiManager?.dispose();
        this.uiManager = null;
        this.selectedNodes.clear();
        this.selectedEdges.clear();
        this.linkSourceNode = null;
        this.hoveredNode = null;
        this.renderingPlugin = null;
    }
}
