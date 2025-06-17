// js/ui/PointerInputHandler.js
import * as THREE from 'three'; // Assuming THREE might be needed for Vector3 etc.
import { BaseNode, HtmlNodeElement, Edge } from '../../spacegraph.js'; // Adjust path as necessary

export class PointerInputHandler {
    constructor(spaceGraph, uiManagerFacade) {
        this.spaceGraph = spaceGraph;
        this.uiManager = uiManagerFacade; // The main UIManager, for callbacks or accessing other managers
        this.container = spaceGraph.container;

        this.draggedNode = null;
        this.resizedNode = null;
        this.dragOffset = new THREE.Vector3();
        this.resizeStartPos = { x: 0, y: 0 };
        this.resizeStartSize = { width: 0, height: 0 };

        this.pointerState = {
            down: false,
            primary: false,
            secondary: false,
            middle: false,
            potentialClick: true,
            lastPos: { x: 0, y: 0 },
            startPos: { x: 0, y: 0 },
        };

        // Methods to be moved/adapted from UIManager
        // _updatePointerState
        // _getTargetInfo
        // _onPointerDown (will become handlePointerDown)
        // _onPointerMove (will become handlePointerMove)
        // _onPointerUp (will become handlePointerUp)
    }

    // Method to bind events, called by UIManager facade
    bindEvents() {
        this.container.addEventListener('pointerdown', this.handlePointerDown.bind(this), false);
        // Move/Up listeners on window to capture events outside container during drag/resize
        window.addEventListener('pointermove', this.handlePointerMove.bind(this), false);
        window.addEventListener('pointerup', this.handlePointerUp.bind(this), false);
    }

    // Method to unbind events, called by UIManager facade's dispose
    dispose() {
        this.container.removeEventListener('pointerdown', this.handlePointerDown.bind(this));
        window.removeEventListener('pointermove', this.handlePointerMove.bind(this));
        window.removeEventListener('pointerup', this.handlePointerUp.bind(this));
        this.draggedNode = null;
        this.resizedNode = null;
        // console.log("PointerInputHandler disposed.");
    }

    _updatePointerState(event, isDown) {
        // Logic from UIManager._updatePointerState
        this.pointerState.down = isDown;
        this.pointerState.primary = isDown && event.button === 0;
        this.pointerState.secondary = isDown && event.button === 2;
        this.pointerState.middle = isDown && event.button === 1;
        if (isDown) {
            this.pointerState.potentialClick = true;
            this.pointerState.startPos = { x: event.clientX, y: event.clientY };
        }
        this.pointerState.lastPos = { x: event.clientX, y: event.clientY };
    }

    _getTargetInfo(event) {
        // Logic from UIManager._getTargetInfo
        // Note: This method uses `document.elementFromPoint` and `this.spaceGraph.intersectedObject`
        // It will also need access to `Edge` and `BaseNode` for `instanceof` checks.
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const nodeHtmlElement = element?.closest('.node-html');
        const resizeHandle = element?.closest('.resize-handle');
        const nodeControlsButton = element?.closest('.node-controls button');
        const contentEditable = element?.closest('[contenteditable="true"]');
        const interactiveInNode = element?.closest('.node-content button, .node-content input, .node-content a');
        const portElement = element?.closest('.node-port'); // Added for completeness

        let node = null;
        if (nodeHtmlElement?.dataset.nodeId) {
            node = this.spaceGraph.getNodeById(nodeHtmlElement.dataset.nodeId);
        }

        let intersectedEdge = null;
        const isDirectHtmlNodePartInteraction =
            nodeHtmlElement &&
            (resizeHandle || nodeControlsButton || contentEditable || interactiveInNode || portElement);

        if (!isDirectHtmlNodePartInteraction) {
            const intersectedObject = this.spaceGraph.intersectedObject(event.clientX, event.clientY);
            if (intersectedObject) {
                if (intersectedObject instanceof Edge) {
                    intersectedEdge = intersectedObject;
                } else if (intersectedObject instanceof BaseNode) {
                    if (!node) {
                        // If DOM didn't find an HTML node, use the raycasted one
                        node = intersectedObject;
                    }
                    // If DOM found an HTML node, and raycast found a different one (e.g. ShapeNode behind),
                    // generally prefer the DOM one for direct HTML interactions.
                    // This logic might need refinement based on desired interaction priorities.
                }
            }
        }

        return {
            element,
            nodeHtmlElement,
            resizeHandle,
            nodeControlsButton,
            contentEditable,
            interactiveInNode,
            portElement,
            node: node,
            intersectedEdge,
        };
    }

    handlePointerDown(event) {
        // Adapted logic from UIManager._onPointerDown
        // This will call uiManager methods for context menu, linking, dialogs etc.
        // Or directly call methods on SpaceGraph or CameraController.

        this._updatePointerState(event, true);
        const targetInfo = this._getTargetInfo(event);

        // Delegate to UIManager facade or other specific managers for actions like:
        // - _handleNodeControlButtonClick -> this.uiManager.nodeControls.handleClick(...)
        // - _startLinking -> this.uiManager.linkingManager.startLinking(...)
        // - showContextMenu -> this.uiManager.contextMenuManager.show(...)
        // - setSelectedNode/Edge -> this.spaceGraph.setSelectedNode/Edge(...)
        // - cameraController.startPan -> this.spaceGraph.cameraController.startPan(...)

        // Example of direct management within PointerInputHandler for drag/resize:
        if (targetInfo.nodeControlsButton && targetInfo.node instanceof HtmlNodeElement) {
            event.preventDefault();
            event.stopPropagation();
            this.uiManager.handleNodeControlButtonClick(targetInfo.nodeControlsButton, targetInfo.node); // Facade method
            this.uiManager.hideContextMenu();
            return;
        }

        if (targetInfo.portElement && targetInfo.node) {
            event.preventDefault();
            event.stopPropagation();
            this.uiManager.linkingManager.startLinking(targetInfo.node, targetInfo.portElement);
            this.uiManager.hideContextMenu();
            return;
        }

        if (targetInfo.resizeHandle && targetInfo.node instanceof HtmlNodeElement) {
            event.preventDefault();
            event.stopPropagation();
            this.resizedNode = targetInfo.node;
            this.resizedNode.startResize();
            this.resizeStartPos = { x: event.clientX, y: event.clientY };
            this.resizeStartSize = { ...this.resizedNode.size };
            this.container.style.cursor = 'nwse-resize';
            this.uiManager.hideContextMenu();
            return;
        }

        if (targetInfo.node) {
            if (targetInfo.interactiveInNode || targetInfo.contentEditable) {
                event.stopPropagation();
                if (this.spaceGraph.selectedNode !== targetInfo.node) this.spaceGraph.setSelectedNode(targetInfo.node);
                this.uiManager.hideContextMenu();
            } else {
                event.preventDefault();
                this.draggedNode = targetInfo.node;
                this.draggedNode.startDrag();
                if (this.draggedNode instanceof HtmlNodeElement && this.draggedNode.htmlElement) {
                    this.draggedNode.htmlElement.classList.add('node-dragging-html');
                }
                const worldPos = this.spaceGraph.screenToWorld(
                    event.clientX,
                    event.clientY,
                    this.draggedNode.position.z
                );
                this.dragOffset = worldPos ? worldPos.sub(this.draggedNode.position) : new THREE.Vector3();
                this.container.style.cursor = 'grabbing';
                if (this.spaceGraph.selectedNode !== targetInfo.node) this.spaceGraph.setSelectedNode(targetInfo.node);
                this.uiManager.hideContextMenu();
                return;
            }
        } else if (targetInfo.intersectedEdge) {
            event.preventDefault();
            this.spaceGraph.setSelectedEdge(targetInfo.intersectedEdge);
            this.uiManager.hideContextMenu();
            return;
        } else {
            // Background click
            this.uiManager.hideContextMenu();
            if (this.pointerState.primary && !this.spaceGraph.selectedNode && !this.spaceGraph.selectedEdge) {
                this.spaceGraph.cameraController?.startPan(event);
            }
        }
    }

    handlePointerMove(event) {
        // Adapted logic from UIManager._onPointerMove
        const dx = event.clientX - this.pointerState.lastPos.x;
        const dy = event.clientY - this.pointerState.lastPos.y;
        if (dx !== 0 || dy !== 0) this.pointerState.potentialClick = false;
        this.pointerState.lastPos = { x: event.clientX, y: event.clientY };

        if (this.resizedNode) {
            event.preventDefault();
            const newWidth = this.resizeStartSize.width + (event.clientX - this.resizeStartPos.x);
            const newHeight = this.resizeStartSize.height + (event.clientY - this.resizeStartPos.y);
            this.resizedNode.resize(newWidth, newHeight);
            return;
        }
        if (this.draggedNode) {
            event.preventDefault();
            const worldPos = this.spaceGraph.screenToWorld(event.clientX, event.clientY, this.draggedNode.position.z);
            if (worldPos) this.draggedNode.drag(worldPos.sub(this.dragOffset));
            return;
        }
        if (this.uiManager.linkingManager.isLinking()) {
            // isLinking is managed by LinkingManager now, accessed via uiManager
            event.preventDefault();
            // Delegate to LinkingManager
            this.uiManager.linkingManager.updateTempLinkLine(event.clientX, event.clientY);
            this.uiManager.linkingManager.updateLinkingTargetHighlight(event); // New method in LinkingManager
            return;
        }

        if (this.pointerState.primary && this.spaceGraph.cameraController?.isPanning) {
            this.spaceGraph.cameraController.pan(event);
        }

        // Edge hovering logic will be moved to UIManager facade or a dedicated HoverManager
        // For now, keep it out of PointerInputHandler's direct responsibility during move
        if (
            !this.pointerState.down &&
            !this.resizedNode &&
            !this.draggedNode &&
            !this.uiManager.linkingManager.isLinking()
        ) {
            this.uiManager.handleEdgeHover(event); // Delegate to UIManager facade
        }
    }

    handlePointerUp(event) {
        // Adapted logic from UIManager._onPointerUp
        this.container.style.cursor = this.uiManager.linkingManager.isLinking() ? 'crosshair' : 'grab'; // Check LinkingManager state

        if (this.resizedNode) {
            this.resizedNode.endResize();
            this.resizedNode = null;
        } else if (this.draggedNode) {
            if (this.draggedNode instanceof HtmlNodeElement && this.draggedNode.htmlElement) {
                this.draggedNode.htmlElement.classList.remove('node-dragging-html');
            }
            this.draggedNode.endDrag();
            this.draggedNode = null;
        } else if (this.uiManager.linkingManager.isLinking() && event.button === 0) {
            // Check linkingManager state
            this.uiManager.linkingManager.completeLinking(event);
        } else if (event.button === 1 && this.pointerState.potentialClick) {
            // Middle mouse click
            const { node } = this._getTargetInfo(event);
            if (node) {
                this.spaceGraph.autoZoom(node);
                event.preventDefault();
            }
        } else if (event.button === 0 && this.pointerState.potentialClick) {
            // Primary click
            const targetInfo = this._getTargetInfo(event);
            if (!targetInfo.node && !targetInfo.intersectedEdge && !this.spaceGraph.cameraController?.isPanning) {
                this.spaceGraph.setSelectedNode(null);
                this.spaceGraph.setSelectedEdge(null);
            }
        }

        this.spaceGraph.cameraController?.endPan();
        this._updatePointerState(event, false);
        if (this.uiManager.linkingManager.isLinking()) {
            // Ensure linking target highlights are cleared
            this.uiManager.linkingManager.clearLinkingTargetHighlight();
        }
    }
}
