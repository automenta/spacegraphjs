// js/ui/ContextMenuManager.js
import { BaseNode, HtmlNodeElement, NoteNode, ShapeNode, Edge } from '../../spacegraph.js'; // Adjust path
import * as THREE from 'three'; // For THREE.Vector3 if used by menu actions

export class ContextMenuManager {
    constructor(spaceGraph, uiManagerFacade) {
        this.spaceGraph = spaceGraph;
        this.uiManager = uiManagerFacade; // The main UIManager facade
        this.container = spaceGraph.container;

        // Initialize or find contextMenuElement via UIManager facade
        this.contextMenuElement = this.uiManager.getDomElement('contextMenu');
        // Assumes UIManager facade has a way to provide this,
        // or it's passed if UIManager itself doesn't own its creation.
        // For now, assume UIManager facade gives it.
    }

    bindEvents() {
        this.container.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), { passive: false });
        // The UIManager facade will handle _onDocumentClick and call this.hideContextMenuIfNeeded()
        if (this.contextMenuElement) {
            this.contextMenuElement.addEventListener('click', this.handleMenuClick.bind(this), false);
        }
    }

    dispose() {
        this.container.removeEventListener('contextmenu', this.handleContextMenuEvent.bind(this));
        if (this.contextMenuElement) {
            this.contextMenuElement.removeEventListener('click', this.handleMenuClick.bind(this));
            // Consider if this module should remove the element if it created it.
            // For now, assume UIManager facade handles element lifecycle.
        }
        // console.log("ContextMenuManager disposed.");
    }

    handleContextMenuEvent(event) {
        // Logic from UIManager._onContextMenu
        event.preventDefault();
        this.hideContextMenu(); // Hide any currently visible context menu

        // Get target info via UIManager facade (which uses PointerInputHandler)
        const targetInfo = this.uiManager.getTargetInfoForMenu(event);
        let menuItems = [];

        if (targetInfo.node) {
            if (this.spaceGraph.selectedNode !== targetInfo.node) this.spaceGraph.setSelectedNode(targetInfo.node);
            menuItems = this._getContextMenuItemsNode(targetInfo.node);
        } else if (targetInfo.intersectedEdge) {
            if (this.spaceGraph.selectedEdge !== targetInfo.intersectedEdge)
                this.spaceGraph.setSelectedEdge(targetInfo.intersectedEdge);
            menuItems = this._getContextMenuItemsEdge(targetInfo.intersectedEdge);
        } else {
            this.spaceGraph.setSelectedNode(null);
            this.spaceGraph.setSelectedEdge(null);
            const worldPos = this.spaceGraph.screenToWorld(event.clientX, event.clientY, 0);
            menuItems = this._getContextMenuItemsBackground(worldPos);
        }
        if (menuItems.length > 0) this._showContextMenu(event.clientX, event.clientY, menuItems);
    }

    _getContextMenuItemsNode(node) {
        // Logic from UIManager._getContextMenuItemsNode
        const items = [];
        if (node instanceof HtmlNodeElement && node.data.editable) {
            items.push({ label: 'Edit Content 📝', action: 'edit-node', nodeId: node.id });
        }
        items.push({ label: 'Start Link (Node) ✨', action: 'start-link-node', nodeId: node.id });
        items.push({ label: 'Auto Zoom / Back 🖱️', action: 'autozoom-node', nodeId: node.id });
        items.push({ type: 'separator' });
        items.push({ label: 'Delete Node 🗑️', action: 'delete-node', nodeId: node.id, class: 'delete-action' });
        return items;
    }

    _getContextMenuItemsEdge(edge) {
        // Logic from UIManager._getContextMenuItemsEdge
        return [
            { label: 'Edit Edge Style...', action: 'edit-edge', edgeId: edge.id },
            { label: 'Reverse Edge Direction', action: 'reverse-edge', edgeId: edge.id },
            { type: 'separator' },
            { label: 'Delete Edge 🗑️', action: 'delete-edge', edgeId: edge.id, class: 'delete-action' },
        ];
    }

    _getContextMenuItemsBackground(worldPos) {
        // Logic from UIManager._getContextMenuItemsBackground
        const items = [];
        if (worldPos) {
            const posStr = JSON.stringify({
                x: Math.round(worldPos.x),
                y: Math.round(worldPos.y),
                z: Math.round(worldPos.z),
            });
            items.push({ label: 'Create Note Here 📝', action: 'create-note', position: posStr });
            items.push({ label: 'Create Box Here 📦', action: 'create-box', position: posStr });
            items.push({ label: 'Create Sphere Here 🌐', action: 'create-sphere', position: posStr });
        }
        items.push({ type: 'separator' });
        items.push({ label: 'Center View 🧭', action: 'center-view' });
        items.push({ label: 'Reset Zoom & Pan', action: 'reset-view' });
        items.push({
            label: this.spaceGraph.background.alpha === 0 ? 'Set Dark Background' : 'Set Transparent BG',
            action: 'toggle-background',
        });
        return items;
    }

    handleMenuClick(event) {
        // Logic from UIManager._onContextMenuClick
        const listItem = event.target.closest('li');
        if (!listItem || !listItem.dataset.action) return;

        const action = listItem.dataset.action;
        const nodeId = listItem.dataset.nodeId;
        const edgeId = listItem.dataset.edgeId;
        const position = listItem.dataset.position;
        this.hideContextMenu();

        const actions = {
            'edit-node': () => {
                const node = this.spaceGraph.getNodeById(nodeId);
                if (node instanceof HtmlNodeElement && node.data.editable) {
                    node.htmlElement?.querySelector('.node-content')?.focus();
                }
            },
            'delete-node': () =>
                this.uiManager.showConfirmDialog(`Delete node "${nodeId?.substring(0, 10)}..."?`, () =>
                    this.spaceGraph.removeNode(nodeId)
                ),
            'delete-edge': () =>
                this.uiManager.showConfirmDialog(`Delete edge "${edgeId?.substring(0, 10)}..."?`, () =>
                    this.spaceGraph.removeEdge(edgeId)
                ),
            'autozoom-node': () => {
                const node = this.spaceGraph.getNodeById(nodeId);
                if (node) this.spaceGraph.autoZoom(node);
            },
            'create-note': () => this._createNodeFromMenu(position, NoteNode, { content: 'New Note ✨' }),
            'create-box': () =>
                this._createNodeFromMenu(position, ShapeNode, {
                    label: 'Box',
                    shape: 'box',
                    color: Math.random() * 0xffffff,
                }),
            'create-sphere': () =>
                this._createNodeFromMenu(position, ShapeNode, {
                    label: 'Sphere',
                    shape: 'sphere',
                    color: Math.random() * 0xffffff,
                }),
            'center-view': () => this.spaceGraph.centerView(),
            'reset-view': () => this.spaceGraph.cameraController?.resetView(),
            'start-link-node': () => {
                const node = this.spaceGraph.getNodeById(nodeId);
                // Delegate to LinkingManager via UIManager facade
                if (node) this.uiManager.linkingManager.startLinking(node);
            },
            'reverse-edge': () => {
                const edge = this.spaceGraph.getEdgeById(edgeId);
                if (edge && edge.source && edge.target) {
                    [edge.source, edge.target] = [edge.target, edge.source];
                    edge.update();
                    this.spaceGraph.layoutEngine?.kick();
                    this.spaceGraph._emit('edgeReversed', { edge });
                }
            },
            'edit-edge': () => {
                const edge = this.spaceGraph.getEdgeById(edgeId);
                if (edge) this.spaceGraph.setSelectedEdge(edge); // This will trigger EdgeMenuManager via UIManager
            },
            'toggle-background': () =>
                this.spaceGraph.setBackground(
                    this.spaceGraph.background.alpha === 0 ? 0x101018 : 0x000000,
                    this.spaceGraph.background.alpha === 0 ? 1.0 : 0.0
                ),
        };
        if (actions[action]) {
            actions[action]();
        } else {
            console.warn('Unknown context menu action:', action);
        }
    }

    _createNodeFromMenu(positionDataJson, NodeTypeClass, nodeDataParams) {
        // Logic from UIManager._createNodeFromMenu
        if (!positionDataJson) {
            console.error('Position data missing for node creation from menu.');
            return;
        }
        try {
            const pos = JSON.parse(positionDataJson);
            const newNode = this.spaceGraph.addNode(new NodeTypeClass(null, pos, nodeDataParams));
            if (newNode) {
                this.spaceGraph.layoutEngine?.kick();
                setTimeout(() => {
                    this.spaceGraph.focusOnNode(newNode, 0.6, true);
                    this.spaceGraph.setSelectedNode(newNode);
                    if (newNode instanceof NoteNode && newNode.htmlElement) {
                        newNode.htmlElement.querySelector('.node-content')?.focus();
                    }
                }, 100);
            }
        } catch (err) {
            console.error('Failed to create node from menu:', err, 'Position data:', positionDataJson);
        }
    }

    _showContextMenu(x, y, items) {
        // Logic from UIManager._showContextMenu
        if (!this.contextMenuElement) return;
        this.contextMenuElement.innerHTML = '';
        const ul = document.createElement('ul');
        items.forEach((item) => {
            const li = document.createElement('li');
            if (item.type === 'separator') {
                li.className = 'separator';
            } else {
                li.textContent = item.label;
                if (item.class) li.classList.add(item.class);
                if (item.disabled) li.classList.add('disabled');
                Object.entries(item).forEach(([key, value]) => {
                    if (
                        value !== undefined &&
                        value !== null &&
                        !['type', 'label', 'class', 'disabled'].includes(key)
                    ) {
                        li.dataset[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    }
                });
            }
            ul.appendChild(li);
        });
        this.contextMenuElement.appendChild(ul);

        const menuWidth = this.contextMenuElement.offsetWidth;
        const menuHeight = this.contextMenuElement.offsetHeight;
        let finalX = x + 5;
        let finalY = y + 5;
        if (finalX + menuWidth > window.innerWidth) finalX = x - menuWidth - 5;
        if (finalY + menuHeight > window.innerHeight) finalY = y - menuHeight - 5;
        finalX = Math.max(5, finalX);
        finalY = Math.max(5, finalY);

        this.contextMenuElement.style.left = `${finalX}px`;
        this.contextMenuElement.style.top = `${finalY}px`;
        this.contextMenuElement.style.display = 'block';
    }

    hideContextMenu() {
        // Logic from UIManager._hideContextMenu
        if (this.contextMenuElement) this.contextMenuElement.style.display = 'none';
    }

    // Called by UIManager facade's _onDocumentClick
    hideContextMenuIfNeeded(event) {
        if (this.contextMenuElement && !this.contextMenuElement.contains(event.target)) {
            this.hideContextMenu();
        }
    }
}
