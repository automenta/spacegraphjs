// js/ui/UIManager.js
import { PointerInputHandler } from './PointerInputHandler.js';
import { KeyboardInputHandler } from './KeyboardInputHandler.js';
import { WheelInputHandler } from './WheelInputHandler.js';
import { DragAndDropHandler } from './DragAndDropHandler.js';
import { ContextMenuManager } from './ContextMenuManager.js';
import { LinkingManager } from './LinkingManager.js';
import { EdgeMenuManager } from './EdgeMenuManager.js';
import { DialogManager } from './DialogManager.js';
// Note: UIManagerUtils is currently empty, so not imported.

export class UIManager {
    constructor(spaceGraph, uiElements = {}) {
        this.spaceGraph = spaceGraph;
        this.uiElements = uiElements; // Might be used by specific managers

        if (this.uiElements.contextMenuContainer instanceof HTMLElement) {
            this.uiElements.contextMenu = this.uiElements.contextMenuContainer;
        } else {
            const contextMenuEl = document.createElement('div');
            contextMenuEl.id = 'spacegraph-context-menu';
            contextMenuEl.className = 'spacegraph-context-menu';
            contextMenuEl.style.display = 'none';
            contextMenuEl.style.position = 'absolute';
            contextMenuEl.style.zIndex = '1000';
            contextMenuEl.style.background = 'white';
            contextMenuEl.style.border = '1px solid #ccc';
            // Optionally, add more default styling or classes as needed
            this.spaceGraph.container.appendChild(contextMenuEl);
            this.uiElements.contextMenu = contextMenuEl;
        }

        // Instantiate all UI handlers and managers
        this.pointerInputHandler = new PointerInputHandler(spaceGraph, this);
        this.keyboardInputHandler = new KeyboardInputHandler(spaceGraph, this);
        this.wheelInputHandler = new WheelInputHandler(spaceGraph, this);
        this.dragAndDropHandler = new DragAndDropHandler(spaceGraph, this, uiElements.dropZoneElement || spaceGraph.container);
        this.contextMenuManager = new ContextMenuManager(spaceGraph, this);
        this.linkingManager = new LinkingManager(spaceGraph, this);
        this.edgeMenuManager = new EdgeMenuManager(spaceGraph, this, uiElements.edgeMenuContainer);
        this.dialogManager = new DialogManager(spaceGraph, this, uiElements.dialogContainer);

        this.bindEvents();
        console.log("UIManager initialized and events bound.");
    }

    bindEvents() {
        // Bind events for handlers that require it
        this.pointerInputHandler.bindEvents();
        this.keyboardInputHandler.bindEvents();
        this.wheelInputHandler.bindEvents();
        this.dragAndDropHandler.bindEvents();
        // Managers like ContextMenuManager, LinkingManager, EdgeMenuManager, DialogManager
        // typically manage their own events internally or are triggered by other handlers/graph events.
    }

    dispose() {
        console.log("Disposing UIManager and its components...");
        this.pointerInputHandler.dispose();
        this.keyboardInputHandler.dispose();
        this.wheelInputHandler.dispose();
        this.dragAndDropHandler.dispose();
        this.contextMenuManager.dispose();
        this.linkingManager.dispose();
        this.edgeMenuManager.dispose();
        this.dialogManager.dispose();
        console.log("UIManager disposed.");
    }

    // --- Facade methods ---
    // These methods are called by handlers (like PointerInputHandler)
    // and delegate to the appropriate manager.

    // Context Menu
    showContextMenu(type, event, target) {
        this.contextMenuManager.show(type, event, target);
    }

    hideContextMenu() {
        this.contextMenuManager.hide();
    }

    // Linking
    startLinking(sourceNode, sourcePortElement = null) {
        this.linkingManager.startLinking(sourceNode, sourcePortElement);
    }

    completeLinking(event) {
        this.linkingManager.completeLinking(event);
    }

    cancelLinking() {
        this.linkingManager.cancelLinking();
    }

    isLinking() {
        return this.linkingManager.isLinking();
    }

    updateTempLinkLine(clientX, clientY) {
        if (this.isLinking()) {
            this.linkingManager.updateTempLinkLine(clientX, clientY);
        }
    }

    // Edge Menu
    showEdgeMenu(edge, event) {
        this.edgeMenuManager.show(edge, event);
    }

    hideEdgeMenu() {
        this.edgeMenuManager.hide();
    }

    // Edge Hovering (called by PointerInputHandler)
    handleEdgeHover(event) {
        // This logic might be simple enough to live here or be in PointerInputHandler.
        // For now, let's assume it might involve showing some temporary UI or highlighting.
        // If it becomes complex, it could be a separate HoverManager.
        const { intersectedEdge } = this.pointerInputHandler._getTargetInfo(event); // Use existing method in pointer handler
        if (intersectedEdge && !this.spaceGraph.selectedEdge && !this.isLinking()) {
            // TODO: Implement visual feedback for edge hover if desired
            // For example: intersectedEdge.setTemporaryHighlight(true);
            // this.spaceGraph.container.style.cursor = 'pointer';
        } else {
            // TODO: Clear visual feedback for edge hover
            // For example: if (this._lastHoveredEdge) this._lastHoveredEdge.setTemporaryHighlight(false);
            // this.spaceGraph.container.style.cursor = this.isLinking() ? 'crosshair' : 'grab';
        }
        // this._lastHoveredEdge = intersectedEdge;
    }

    // Node Control Button Click (called by PointerInputHandler)
    handleNodeControlButtonClick(buttonElement, node) {
        // Example:
        // const action = buttonElement.dataset.action;
        // console.log(`Node control button clicked: ${action} on node ${node.id}`);
        // if (action === 'delete') {
        //     this.showDialog('confirmDeleteNode', { nodeId: node.id, nodeLabel: node.label || node.id });
        // } else if (action === 'edit') {
        //    // ...
        // }
        // This should be fleshed out based on actual controls.
    }

    // Dialogs
    showDialog(dialogType, options) {
        this.dialogManager.show(dialogType, options);
    }

    hideDialog() {
        this.dialogManager.hide();
    }

    getDomElement(name) {
        return this.uiElements[name];
    }
}
