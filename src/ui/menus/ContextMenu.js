import { $ } from '../../utils.js';
import * as THREE from 'three';
import { HtmlNode } from '../../graph/nodes/HtmlNode.js';

export class ContextMenu {
    constructor(space, contextMenuElement, uiPluginCallbacks) {
        this.space = space;
        this.contextMenuElement = contextMenuElement;
        this._uiPluginCallbacks = uiPluginCallbacks;

        this._bindEvents();
    }

    _bindEvents() {
        this.contextMenuElement.addEventListener('click', this._onContextMenuClick);
    }

    _onContextMenuClick = (e) => {
        const li = e.target.closest('li[data-action]');
        if (!li || li.classList.contains('disabled')) return;

        const { action, nodeId, edgeId, positionX, positionY, positionZ } = li.dataset;
        const worldPos = positionX ? { x: parseFloat(positionX), y: parseFloat(positionY), z: parseFloat(positionZ) } : null;

        this.hide();

        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
        const edgePlugin = this.space.plugins.getPlugin('EdgePlugin');
        const renderingPlugin = this.space.plugins.getPlugin('RenderingPlugin');

        const targetNode = nodeId ? nodePlugin?.getNodeById(nodeId) : null;
        const targetEdge = edgeId ? edgePlugin?.getEdgeById(edgeId) : null;

        switch (action) {
            case 'edit-node-content':
                if (targetNode instanceof HtmlNode && targetNode.data.editable) {
                    targetNode.htmlElement?.querySelector('.node-content')?.focus();
                }
                break;
            case 'delete-node':
                if (targetNode) {
                    this.space.emit('ui:request:confirm', {
                        message: `Delete node "${targetNode.id.substring(0, 10)}..."?`,
                        onConfirm: () => this.space.emit('ui:request:removeNode', targetNode.id)
                    });
                }
                break;
            case 'start-linking-node':
                if (targetNode) {
                    this.space.emit('ui:request:startLinking', targetNode);
                }
                break;
            case 'autozoom-node':
                if (targetNode) {
                    this.space.emit('ui:request:autoZoomNode', targetNode);
                }
                break;
            case 'toggle-pin-node':
                if (targetNode) {
                    this.space.togglePinNode(targetNode.id);
                }
                break;

            case 'edit-edge-style':
                if (targetEdge) {
                    this._uiPluginCallbacks.setSelectedEdge(targetEdge, false);
                }
                break;
            case 'reverse-edge-direction':
                if (targetEdge) {
                    this.space.emit('ui:request:reverseEdge', targetEdge.id);
                }
                break;
            case 'delete-edge':
                if (targetEdge) {
                    this.space.emit('ui:request:confirm', {
                        message: `Delete edge "${targetEdge.id.substring(0, 10)}..."?`,
                        onConfirm: () => this.space.emit('ui:request:removeEdge', targetEdge.id)
                    });
                }
                break;

            case 'create-html-node':
                worldPos && this.space.emit('ui:request:createNode', { type: 'html', position: worldPos, data: { label: 'New Node', content: 'Edit me!' } });
                break;
            case 'create-note-node':
                 worldPos && this.space.emit('ui:request:createNode', { type: 'note', position: worldPos, data: { content: 'New Note ✨' } });
                break;
            case 'create-shape-node-box':
                 worldPos && this.space.emit('ui:request:createNode', { type: 'shape', position: worldPos, data: { label: 'Box Node 📦', shape: 'box', size: 60, color: Math.random() * 0xffffff } });
                break;
           case 'create-shape-node-sphere':
                 worldPos && this.space.emit('ui:request:createNode', { type: 'shape', position: worldPos, data: { label: 'Sphere Node 🌐', shape: 'sphere', size: 60, color: Math.random() * 0xffffff } });
                break;

            case 'center-camera-view':
                this.space.emit('ui:request:centerView');
                break;
            case 'reset-camera-view':
                this.space.emit('ui:request:resetView');
                break;
            case 'toggle-background-visibility': {
                if (renderingPlugin) {
                    const newAlpha = renderingPlugin.background.alpha === 0 ? 1.0 : 0;
                    const newColor = newAlpha === 0 ? 0x000000 : (document.body.classList.contains('theme-light') ? 0xf4f4f4 : 0x1a1a1d) ;
                    this.space.emit('ui:request:toggleBackground', newColor, newAlpha);
                }
                break;
            }
            default:
                console.warn('ContextMenu: Unknown action:', action);
        }
    };

    _getContextMenuItemsForNode(node) {
        const items = [];
        if (node instanceof HtmlNode && node.data.editable) {
            items.push({ label: '📝 Edit Content', action: 'edit-node-content', nodeId: node.id });
        }
        items.push({ label: '🔗 Start Link', action: 'start-linking-node', nodeId: node.id });
        items.push({ label: '🔎 Auto Zoom', action: 'autozoom-node', nodeId: node.id });

        const isPinned = node.isPinned || false;
        items.push({ label: isPinned ? '📌 Unpin' : '📌 Pin', action: 'toggle-pin-node', nodeId: node.id });

        items.push({ type: 'separator' });
        items.push({ label: '🗑️ Delete Node', action: 'delete-node', nodeId: node.id, isDestructive: true });
        return items;
    }

    _getContextMenuItemsForEdge(edge) {
        return [
            { label: '🎨 Edit Style', action: 'edit-edge-style', edgeId: edge.id },
            { label: '↔️ Reverse Direction', action: 'reverse-edge-direction', edgeId: edge.id },
            { type: 'separator' },
            { label: '🗑️ Delete Edge', action: 'delete-edge', edgeId: edge.id, isDestructive: true },
        ];
    }

    _getContextMenuItemsForBackground(worldPos) {
        const items = [];
        if (worldPos) {
            const posData = { positionX: worldPos.x, positionY: worldPos.y, positionZ: worldPos.z };
            items.push({ label: '📄 Add HTML Node', action: 'create-html-node', ...posData });
            items.push({ label: '📝 Add Note', action: 'create-note-node', ...posData });
            items.push({ label: '📦 Add Box', action: 'create-shape-node-box', ...posData });
            items.push({ label: '🌐 Add Sphere', action: 'create-shape-node-sphere', ...posData });
        }
        items.push({ type: 'separator' });
        items.push({ label: '🎯 Center View', action: 'center-camera-view' });
        items.push({ label: '🔄 Reset View', action: 'reset-camera-view' });

        const renderingPlugin = this.space.plugins.getPlugin('RenderingPlugin');
        if (renderingPlugin) {
            const isTransparent = renderingPlugin.background.alpha === 0;
            items.push({
                label: isTransparent ? '🖼️ Opaque BG' : '💨 Transparent BG',
                action: 'toggle-background-visibility',
            });
        }
        return items;
    }

    show(x, y, targetInfo) {
        let menuItems = [];
        if (targetInfo.node) {
            if (!targetInfo.shiftKey) {
                this._uiPluginCallbacks.setSelectedNode(targetInfo.node, false);
            }
            menuItems = this._getContextMenuItemsForNode(targetInfo.node);
        } else if (targetInfo.intersectedEdge) {
            if (!targetInfo.shiftKey) {
                this._uiPluginCallbacks.setSelectedEdge(targetInfo.intersectedEdge, false);
            }
            menuItems = this._getContextMenuItemsForEdge(targetInfo.intersectedEdge);
        } else {
            if (!targetInfo.shiftKey) {
                 this._uiPluginCallbacks.setSelectedNode(null, false);
            }
            const worldPos = this.space.screenToWorld(x, y, 0);
            menuItems = this._getContextMenuItemsForBackground(worldPos);
        }

        if (menuItems.length === 0) return;

        const cm = this.contextMenuElement;
        cm.innerHTML = '';
        const ul = document.createElement('ul');

        menuItems.forEach(itemData => {
            const li = document.createElement('li');
            if (itemData.type === 'separator') {
                li.className = 'separator';
            } else {
                li.textContent = itemData.label;
                Object.keys(itemData).forEach(key => {
                    if (key !== 'label' && key !== 'type' && key !== 'isDestructive' && itemData[key] !== undefined && itemData[key] !== null) {
                        li.dataset[key] = String(itemData[key]);
                    }
                });
                itemData.disabled && li.classList.add('disabled');
                itemData.isDestructive && li.classList.add('destructive');
            }
            ul.appendChild(li);
        });
        cm.appendChild(ul);

        const { offsetWidth: menuWidth, offsetHeight: menuHeight } = cm;
        const margin = 5;
        let finalX = x + margin;
        if (finalX + menuWidth > window.innerWidth - margin) {
            finalX = x - menuWidth - margin;
        }
        let finalY = y + margin;
        if (finalY + menuHeight > window.innerHeight - margin) {
            finalY = y - menuHeight - margin;
        }
        cm.style.left = `${Math.max(margin, finalX)}px`;
        cm.style.top = `${Math.max(margin, finalY)}px`;
        cm.style.display = 'block';

        this.space.emit('ui:contextmenu:shown', { x, y, items: menuItems });
    }

    hide = () => {
        if (this.contextMenuElement.style.display === 'block') {
            this.contextMenuElement.style.display = 'none';
            this.contextMenuElement.innerHTML = '';
            this.space.emit('ui:contextmenu:hidden');
        }
    };

    dispose() {
        this.contextMenuElement.removeEventListener('click', this._onContextMenuClick);
        this.contextMenuElement = null;
        this.space = null;
        this._uiPluginCallbacks = null;
    }
}
