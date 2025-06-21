import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { Utils, $, $$ } from '../utils.js';
import { HtmlNode } from '../graph/nodes/HtmlNode.js';
import { NoteNode } from '../graph/nodes/NoteNode.js';
import { ShapeNode } from '../graph/nodes/ShapeNode.js';
import { Edge } from '../graph/Edge.js'; // Import Edge for type checking

export class UIManager {
    space = null;
    container = null;
    contextMenuElement = null;
    confirmDialogElement = null;
    edgeMenuObject = null;

    draggedNode = null;
    resizedNode = null;
    hoveredEdge = null;
    resizeStartPos = {x: 0, y: 0};
    resizeStartSize = {width: 0, height: 0};
    dragOffset = new THREE.Vector3();
    pointerState = {
        down: false,
        primary: false,
        secondary: false,
        middle: false,
        potentialClick: true,
        lastPos: {x: 0, y: 0},
        startPos: {x: 0, y: 0}
    };
    confirmCallback = null;

    constructor(space, contextMenuEl, confirmDialogEl) {
        if (!space || !contextMenuEl || !confirmDialogEl) throw new Error("UIManager requires SpaceGraph instance and UI elements.");
        this.space = space;
        this.container = space.container;
        this.contextMenuElement = contextMenuEl;
        this.confirmDialogElement = confirmDialogEl;
        this._bindEvents();
    }

    _bindEvents() {
        const opts = {passive: false};
        this.container.addEventListener('pointerdown', this._onPointerDown, false);
        window.addEventListener('pointermove', this._onPointerMove, false);
        window.addEventListener('pointerup', this._onPointerUp, false);
        this.container.addEventListener('contextmenu', this._onContextMenu, opts);
        document.addEventListener('click', this._onDocumentClick, true); // Capture phase
        this.contextMenuElement.addEventListener('click', this._onContextMenuClick, false);
        $('#confirm-yes', this.confirmDialogElement)?.addEventListener('click', this._onConfirmYes, false);
        $('#confirm-no', this.confirmDialogElement)?.addEventListener('click', this._onConfirmNo, false);
        window.addEventListener('keydown', this._onKeyDown, false);
        this.container.addEventListener('wheel', this._onWheel, opts);
    }

    _updatePointerState(e, isDown) {
        this.pointerState.down = isDown;
        this.pointerState.primary = isDown && e.button === 0;
        this.pointerState.secondary = isDown && e.button === 2;
        this.pointerState.middle = isDown && e.button === 1;
        if (isDown) {
            this.pointerState.potentialClick = true;
            this.pointerState.startPos = {x: e.clientX, y: e.clientY};
            this.pointerState.lastPos = {x: e.clientX, y: e.clientY};
        }
    }

    _onPointerDown = (e) => {
        this._updatePointerState(e, true);
        const targetInfo = this._getTargetInfo(e);

        if (this.pointerState.secondary) {
            e.preventDefault();
            return;
        }

        if (this.pointerState.primary) {
            if (this._handlePointerDownControls(e, targetInfo)) return;
            if (this._handlePointerDownResize(e, targetInfo)) return;
            if (this._handlePointerDownNode(e, targetInfo)) return;
            if (this._handlePointerDownEdge(e, targetInfo)) return;
            if (this._handlePointerDownBackground(e, targetInfo)) return;
        }

        if (this.pointerState.middle) {
            e.preventDefault();
        }
    }

    _onPointerMove = (e) => {
        if (!this.pointerState.down) {
            this._handleHover(e);
            return;
        }

        const dx = e.clientX - this.pointerState.lastPos.x;
        const dy = e.clientY - this.pointerState.lastPos.y;
        const totalDx = e.clientX - this.pointerState.startPos.x;
        const totalDy = e.clientY - this.pointerState.startPos.y;

        if (Math.sqrt(totalDx ** 2 + totalDy ** 2) > 3) this.pointerState.potentialClick = false;
        this.pointerState.lastPos = {x: e.clientX, y: e.clientY};

        if (this.resizedNode) {
            e.preventDefault();
            // Use total delta from start for smoother resize
            const newWidth = this.resizeStartSize.width + totalDx;
            const newHeight = this.resizeStartSize.height + totalDy;
            this.resizedNode.resize(newWidth, newHeight);
            // No need to call updateNodesAndEdges here, happens in main loop
            return;
        }

        if (this.draggedNode) {
            e.preventDefault();
            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, this.draggedNode.position.z);
            if (worldPos) {
                this.draggedNode.drag(worldPos.sub(this.dragOffset));
                // No need to call updateNodesAndEdges here, happens in main loop
            }
            return;
        }

        if (this.space.isLinking) {
            e.preventDefault();
            this._updateTempLinkLine(e.clientX, e.clientY);
            const targetInfo = this._getTargetInfo(e);
            // Use common class for highlighting potential targets
            $$('.node-common.linking-target').forEach(el => el.classList.remove('linking-target'));
            const targetElement = targetInfo.node?.htmlElement ?? targetInfo.node?.labelObject?.element;
            if (targetInfo.node && targetInfo.node !== this.space.linkSourceNode && targetElement) {
                targetElement.classList.add('linking-target');
            }
            return;
        }

        if (this.pointerState.primary) {
            this.space.camera?.pan(dx, dy);
        }
    }

    _onPointerUp = (e) => {
        this.container.style.cursor = this.space.isLinking ? 'crosshair' : 'grab';

        if (this.resizedNode) {
            this.resizedNode.endResize();
            this.resizedNode = null;
        } else if (this.draggedNode) {
            this.draggedNode.endDrag();
            this.draggedNode = null;
        } else if (this.space.isLinking && e.button === 0) {
            this._completeLinking(e);
        } else if (e.button === 1 && this.pointerState.potentialClick) {
            const {node} = this._getTargetInfo(e);
            if (node) {
                this.space.autoZoom(node);
                e.preventDefault();
            }
        }

        this.space.camera?.endPan();
        this._updatePointerState(e, false);
        $$('.node-common.linking-target').forEach(el => el.classList.remove('linking-target'));
    }

    _onContextMenu = (e) => {
        e.preventDefault();
        this._hideContextMenu();
        const targetInfo = this._getTargetInfo(e);
        let menuItems = [];
        let target = null;

        // Prioritize node hit from raycast or element check
        if (targetInfo.node) {
            target = targetInfo.node;
            if (this.space.nodeSelected !== target) this.space.setSelectedNode(target);
            menuItems = this._getContextMenuItemsNode(target);
        } else if (targetInfo.intersectedEdge) { // Check edge only if no node hit
            target = targetInfo.intersectedEdge;
            if (this.space.edgeSelected !== target) this.space.setSelectedEdge(target);
            menuItems = this._getContextMenuItemsEdge(target);
        } else { // Background
            this.space.setSelectedNode(null);
            this.space.setSelectedEdge(null);
            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, 0);
            menuItems = this._getContextMenuItemsBackground(worldPos);
        }
        if (menuItems.length > 0) this._showContextMenu(e.clientX, e.clientY, menuItems);
    }

    _onDocumentClick = (e) => {
        const clickedContextMenu = this.contextMenuElement.contains(e.target);
        const clickedEdgeMenu = this.edgeMenuObject?.element?.contains(e.target);
        const clickedConfirmDialog = this.confirmDialogElement.contains(e.target);

        if (!clickedContextMenu) {
            this._hideContextMenu();
        }

        if (!clickedEdgeMenu && this.edgeMenuObject) {
            const targetInfo = this._getTargetInfo(e);
            // Hide edge menu unless clicking the selected edge itself again
            if (this.space.edgeSelected !== targetInfo.intersectedEdge) {
                this.space.setSelectedEdge(null);
            }
        }

        // Deselect node/edge if clicking background and not dragging/panning/linking
        // and not clicking on any graph element (node HTML, node mesh, edge line)
        if (!clickedContextMenu && !clickedEdgeMenu && !clickedConfirmDialog &&
            this.pointerState.potentialClick && !this.space.camera?.isPanning && !this.space.isLinking) {
            const targetInfo = this._getTargetInfo(e);
            const clickedOnGraphElement = targetInfo.nodeElement || targetInfo.intersectedObjectResult?.node || targetInfo.intersectedObjectResult?.edge;
            if (!clickedOnGraphElement) {
                this.space.setSelectedNode(null);
                this.space.setSelectedEdge(null);
            }
        }
    }

    _onContextMenuClick = (e) => {
        const li = e.target.closest('li[data-action]');
        if (!li) return;
        const {action, nodeId, edgeId, position: positionData} = li.dataset;
        this._hideContextMenu();

        const actions = {
            'edit-node': () => {
                const node = this.space.getNodeById(nodeId);
                // Only focus editable HTML nodes
                if (node instanceof HtmlNode && node.data.editable) {
                    node.htmlElement?.querySelector('.node-content')?.focus();
                }
            },
            'delete-node': () => this._showConfirm(`Delete node "${nodeId?.substring(0, 10)}..."?`, () => this.space.removeNode(nodeId)),
            'delete-edge': () => this._showConfirm(`Delete edge "${edgeId?.substring(0, 10)}..."?`, () => this.space.removeEdge(edgeId)),
            'autozoom-node': () => this.space.autoZoom(this.space.getNodeById(nodeId)),
            'create-note': () => this._createHtmlNode(positionData),
            'create-box': () => this._createShapeNode(positionData, 'box'),
            'create-sphere': () => this._createShapeNode(positionData, 'sphere'),
            'center-view': () => this.space.centerView(),
            'reset-view': () => this.space.camera?.resetView(),
            'start-link': () => this._startLinking(this.space.getNodeById(nodeId)),
            'reverse-edge': () => {
                const edge = this.space.getEdgeById(edgeId);
                if (edge) {
                    [edge.source, edge.target] = [edge.target, edge.source];
                    edge.update();
                    this.space.layout?.kick();
                }
            },
            'edit-edge': () => this.space.setSelectedEdge(this.space.getEdgeById(edgeId)),
            'toggle-background': () => this.space.setBackground(
                this.space.background.alpha === 0 ? 0x1a1a1d : 0x000000,
                this.space.background.alpha === 0 ? 1.0 : 0
            ),
        };

        actions[action]?.() ?? console.warn("Unknown context menu action:", action);
    }

    _createHtmlNode(positionData, initialContent = 'New Note ✨') {
        try {
            const pos = JSON.parse(positionData);
            const newNode = this.space.addNode(new NoteNode(null, pos, {content: initialContent}));
            this.space.layout?.kick();
            setTimeout(() => {
                this.space.focusOnNode(newNode, 0.6, true);
                this.space.setSelectedNode(newNode);
                newNode.htmlElement?.querySelector('.node-content')?.focus();
            }, 100);
        } catch (err) {
            console.error("Failed to parse position for new note:", err);
        }
    }

    _createShapeNode(positionData, shapeType) {
        try {
            const pos = JSON.parse(positionData);
            const label = `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)} Node`;
            const newNode = this.space.addNode(new ShapeNode(null, pos, {
                label,
                shape: shapeType,
                size: 60,
                color: Math.random() * 0xffffff
            }));
            this.space.layout?.kick();
            setTimeout(() => {
                this.space.focusOnNode(newNode, 0.6, true);
                this.space.setSelectedNode(newNode);
            }, 100);
        } catch (err) {
            console.error(`Failed to parse position for new ${shapeType} node:`, err);
        }
    }

    _onConfirmYes = () => {
        this.confirmCallback?.();
        this._hideConfirm();
    }
    _onConfirmNo = () => this._hideConfirm();

    _onKeyDown = (e) => {
        const activeEl = document.activeElement;
        const isEditing = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
        if (isEditing && e.key !== 'Escape') return;

        const selectedNode = this.space.nodeSelected;
        const selectedEdge = this.space.edgeSelected;
        let handled = true;

        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                if (selectedNode) {
                    const nodeIdPreview = selectedNode.id.substring(0, 10);
                    this._showConfirm(`Delete node "${nodeIdPreview}..."?`, () => this.space.removeNode(selectedNode.id));
                } else if (selectedEdge) {
                    const edgeIdPreview = selectedEdge.id.substring(0, 10);
                    this._showConfirm(`Delete edge "${edgeIdPreview}..."?`, () => this.space.removeEdge(selectedEdge.id));
                } else {
                    handled = false;
                }
                break;
            case 'Escape':
                if (this.space.isLinking) this.cancelLinking();
                else if (this.contextMenuElement.style.display === 'block') this._hideContextMenu();
                else if (this.confirmDialogElement.style.display === 'block') this._hideConfirm();
                else if (this.edgeMenuObject) this.space.setSelectedEdge(null);
                else if (selectedNode || selectedEdge) {
                    this.space.setSelectedNode(null);
                    this.space.setSelectedEdge(null);
                } else handled = false;
                break;
            case 'Enter':
                if (selectedNode instanceof HtmlNode && selectedNode.data.editable) selectedNode.htmlElement?.querySelector('.node-content')?.focus();
                else handled = false;
                break;
            case '+':
            case '=':
                if (selectedNode instanceof HtmlNode) (e.ctrlKey || e.metaKey) ? selectedNode.adjustNodeSize(1.2) : selectedNode.adjustContentScale(1.15);
                else handled = false;
                break;
            case '-':
            case '_':
                if (selectedNode instanceof HtmlNode) (e.ctrlKey || e.metaKey) ? selectedNode.adjustNodeSize(1 / 1.2) : selectedNode.adjustContentScale(1 / 1.15);
                else handled = false;
                break;
            case ' ':
                if (selectedNode) this.space.focusOnNode(selectedNode, 0.5, true);
                else if (selectedEdge) {
                    const midPoint = new THREE.Vector3().lerpVectors(selectedEdge.source.position, selectedEdge.target.position, 0.5);
                    const dist = selectedEdge.source.position.distanceTo(selectedEdge.target.position);
                    this.space.camera?.pushState();
                    this.space.camera?.moveTo(midPoint.x, midPoint.y, midPoint.z + dist * 0.6 + 100, 0.5, midPoint);
                } else this.space.centerView();
                break;
            default:
                handled = false;
        }
        if (handled) e.preventDefault();
    }

    _onWheel = (e) => {
        const targetInfo = this._getTargetInfo(e);
        // Allow scroll in specific UI elements or editable content
        if (e.target.closest('.node-controls, .edge-menu-frame') || targetInfo.contentEditable) return;

        if (e.ctrlKey || e.metaKey) {
            if (targetInfo.node instanceof HtmlNode) {
                e.preventDefault();
                e.stopPropagation();
                targetInfo.node.adjustContentScale(e.deltaY < 0 ? 1.1 : (1 / 1.1));
            } // Allow browser zoom otherwise
        } else {
            e.preventDefault();
            this.space.camera?.zoom(e.deltaY);
        }
    }

    _getTargetInfo(event) {
        const element = document.elementFromPoint(event.clientX, event.clientY);
        // Check for specific UI elements first
        const nodeElement = element?.closest('.node-common'); // Catches .node-html and .node-label-3d
        const resizeHandle = element?.closest('.resize-handle');
        const nodeControls = element?.closest('.node-controls button');
        const contentEditable = element?.closest('[contenteditable="true"]');
        const interactiveElement = element?.closest('button, input, textarea, select, a'); // Inside node content

        let node = nodeElement ? this.space.getNodeById(nodeElement.dataset.nodeId) : null;
        let intersectedObjectResult = null;

        // Raycast if not interacting with specific HTML node parts or if clicking background/label
        const needsRaycast = !element || !resizeHandle && !nodeControls && !contentEditable && !interactiveElement;
        if (needsRaycast) {
            intersectedObjectResult = this.space.intersectedObjects(event.clientX, event.clientY);
            // Prioritize raycast result for node if no element-based node found or if raycast hit mesh
            if (intersectedObjectResult?.node && (!node || nodeElement?.classList.contains('node-label-3d'))) {
                node = intersectedObjectResult.node;
            }
        }

        return {
            element, nodeElement, resizeHandle, nodeControls, contentEditable, interactiveElement,
            node, // The determined node (from element or raycast)
            intersectedEdge: intersectedObjectResult?.edge ?? null,
            intersectedObjectResult // Full raycast result
        };
    }


    _handleHover(e) {
        if (this.pointerState.down || this.draggedNode || this.resizedNode || this.space.isLinking) {
            if (this.hoveredEdge && this.hoveredEdge !== this.space.edgeSelected) {
                this.hoveredEdge.setHighlight(false);
                this.hoveredEdge = null;
            }
            return;
        }

        // Raycast to find hovered edge, ignoring nodes for hover effect
        const vec = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, this.space._cam);
        raycaster.params.Line.threshold = 5;
        const edgeLines = [...this.space.edges.values()].map(edge => edge.line).filter(Boolean);
        const intersects = edgeLines.length > 0 ? raycaster.intersectObjects(edgeLines, false) : [];
        const intersectedEdge = intersects.length > 0 ? this.space.getEdgeById(intersects[0].object.userData.edgeId) : null;


        if (this.hoveredEdge !== intersectedEdge) {
            if (this.hoveredEdge && this.hoveredEdge !== this.space.edgeSelected) this.hoveredEdge.setHighlight(false);
            this.hoveredEdge = intersectedEdge;
            if (this.hoveredEdge && this.hoveredEdge !== this.space.edgeSelected) this.hoveredEdge.setHighlight(true);
        }
    }

    _handlePointerDownControls(e, targetInfo) {
        if (targetInfo.nodeControls && targetInfo.node instanceof HtmlNode) {
            e.preventDefault();
            e.stopPropagation();
            const button = targetInfo.nodeControls;
            // Extract action from class list more robustly
            const actionClass = [...button.classList].find(cls => cls.startsWith('node-') && !cls.includes('button'));
            const action = actionClass?.substring('node-'.length);

            const actions = {
                'delete': () => this._showConfirm(`Delete node "${targetInfo.node.id.substring(0, 10)}..."?`, () => this.space.removeNode(targetInfo.node.id)),
                'content-zoom-in': () => targetInfo.node.adjustContentScale(1.15),
                'content-zoom-out': () => targetInfo.node.adjustContentScale(1 / 1.15),
                'grow': () => targetInfo.node.adjustNodeSize(1.2),
                'shrink': () => targetInfo.node.adjustNodeSize(1 / 1.2),
            };
            if (action && actions[action]) actions[action]();
            this._hideContextMenu();
            return true;
        }
        return false;
    }

    _handlePointerDownResize(e, targetInfo) {
        if (targetInfo.resizeHandle && targetInfo.node instanceof HtmlNode) {
            e.preventDefault();
            e.stopPropagation();
            this.resizedNode = targetInfo.node;
            this.resizedNode.startResize();
            this.resizeStartPos = {x: e.clientX, y: e.clientY}; // Store initial mouse pos
            this.resizeStartSize = {...this.resizedNode.size}; // Store initial node size
            this.container.style.cursor = 'nwse-resize';
            this._hideContextMenu();
            return true;
        }
        return false;
    }

    _handlePointerDownNode(e, targetInfo) {
        // Can drag if node exists and not clicking specific interactive sub-elements
        const canDrag = targetInfo.node && !targetInfo.nodeControls && !targetInfo.resizeHandle && !targetInfo.interactiveElement && !targetInfo.contentEditable;

        if (canDrag) {
            e.preventDefault();
            this.draggedNode = targetInfo.node;
            this.draggedNode.startDrag();
            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, this.draggedNode.position.z);
            this.dragOffset = worldPos ? worldPos.sub(this.draggedNode.position) : new THREE.Vector3();
            this.container.style.cursor = 'grabbing';
            if (this.space.nodeSelected !== targetInfo.node) this.space.setSelectedNode(targetInfo.node);
            this._hideContextMenu();
            return true;
        }

        // If clicking interactive/editable content, select node but allow default interaction
        if (targetInfo.node && (targetInfo.interactiveElement || targetInfo.contentEditable)) {
            e.stopPropagation(); // Prevent background panning
            if (this.space.nodeSelected !== targetInfo.node) this.space.setSelectedNode(targetInfo.node);
            this._hideContextMenu();
            // Return false to allow default browser behavior (e.g., focus input, select text)
        }
        return false;
    }

    _handlePointerDownEdge(e, targetInfo) {
        // Select edge only if raycast hit edge AND didn't hit a node mesh closer
        if (targetInfo.intersectedEdge && !targetInfo.node) {
            e.preventDefault();
            if (this.space.edgeSelected !== targetInfo.intersectedEdge) this.space.setSelectedEdge(targetInfo.intersectedEdge);
            this._hideContextMenu();
            return true;
        }
        return false;
    }

    _handlePointerDownBackground(e, targetInfo) {
        // Start panning if click is on background (no node, no edge from raycast)
        if (!targetInfo.node && !targetInfo.intersectedEdge) {
            this._hideContextMenu();
            this.space.camera?.startPan(e.clientX, e.clientY);
            // Deselection happens on click up / document click
        }
        return false;
    }

    _getContextMenuItemsNode(node) {
        const items = [];
        if (node instanceof HtmlNode && node.data.editable) items.push({
            label: "Edit Content 📝",
            action: "edit-node",
            nodeId: node.id
        });
        items.push({label: "Start Link ✨", action: "start-link", nodeId: node.id});
        items.push({label: "Auto Zoom / Back 🖱️", action: "autozoom-node", nodeId: node.id});
        items.push({type: 'separator'});
        items.push({label: "Delete Node 🗑️", action: "delete-node", nodeId: node.id});
        return items;
    }

    _getContextMenuItemsEdge(edge) {
        return [
            {label: "Edit Style...", action: "edit-edge", edgeId: edge.id},
            {label: "Reverse Direction", action: "reverse-edge", edgeId: edge.id},
            {type: 'separator'},
            {label: "Delete Edge 🗑️", action: "delete-edge", edgeId: edge.id},
        ];
    }

    _getContextMenuItemsBackground(worldPos) {
        const items = [];
        if (worldPos) {
            const posStr = JSON.stringify({x: worldPos.x, y: worldPos.y, z: worldPos.z});
            items.push({label: "Create Note Here 📝", action: "create-note", position: posStr});
            items.push({label: "Create Box Here 📦", action: "create-box", position: posStr});
            items.push({label: "Create Sphere Here 🌐", action: "create-sphere", position: posStr});
        }
        items.push({type: 'separator'});
        items.push({label: "Center View 🧭", action: "center-view"});
        items.push({label: "Reset Zoom & Pan", action: "reset-view"});
        items.push({
            label: this.space.background.alpha === 0 ? "Set Dark Background" : "Set Transparent BG",
            action: "toggle-background"
        });
        return items;
    }

    _showContextMenu(x, y, items) {
        const cm = this.contextMenuElement;
        cm.innerHTML = '';
        const ul = document.createElement('ul');
        items.forEach(itemData => {
            const li = document.createElement('li');
            if (itemData.type === 'separator') {
                li.className = 'separator';
            } else {
                li.textContent = itemData.label;
                Object.entries(itemData).forEach(([k, v]) => {
                    if (k !== 'label' && k !== 'type' && v != null) li.dataset[k] = String(v);
                });
                if (itemData.disabled) li.classList.add('disabled');
            }
            ul.appendChild(li);
        });
        cm.appendChild(ul);

        const {offsetWidth: menuWidth, offsetHeight: menuHeight} = cm;
        const margin = 5;
        let finalX = (x + margin + menuWidth > window.innerWidth - margin) ? x - menuWidth - margin : x + margin;
        let finalY = (y + margin + menuHeight > window.innerHeight - margin) ? y - menuHeight - margin : y + margin;
        cm.style.left = `${Math.max(margin, finalX)}px`;
        cm.style.top = `${Math.max(margin, finalY)}px`;
        cm.style.display = 'block';
    }

    _hideContextMenu = () => {
        this.contextMenuElement.style.display = 'none';
        this.contextMenuElement.innerHTML = '';
    }

    _showConfirm(message, onConfirm) {
        const messageEl = $('#confirm-message', this.confirmDialogElement);
        if (messageEl) messageEl.textContent = message;
        this.confirmCallback = onConfirm;
        this.confirmDialogElement.style.display = 'block';
    }

    _hideConfirm = () => {
        this.confirmDialogElement.style.display = 'none';
        this.confirmCallback = null;
    }

    _startLinking(sourceNode) {
        if (!sourceNode || this.space.isLinking) return;
        this.space.isLinking = true;
        this.space.linkSourceNode = sourceNode;
        this.container.style.cursor = 'crosshair';
        this._createTempLinkLine(sourceNode);
        this._hideContextMenu();
    }

    _createTempLinkLine(sourceNode) {
        this._removeTempLinkLine();
        const material = new THREE.LineDashedMaterial({
            color: 0xffaa00,
            linewidth: 2,
            dashSize: 8,
            gapSize: 4,
            transparent: true,
            opacity: 0.9,
            depthTest: false
        });
        const points = [sourceNode.position.clone(), sourceNode.position.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.space.tempLinkLine = new THREE.Line(geometry, material);
        this.space.tempLinkLine.computeLineDistances();
        this.space.tempLinkLine.renderOrder = 1;
        this.space.scene.add(this.space.tempLinkLine);
    }

    _updateTempLinkLine(screenX, screenY) {
        if (!this.space.tempLinkLine || !this.space.linkSourceNode) return;
        const targetPos = this.space.screenToWorld(screenX, screenY, this.space.linkSourceNode.position.z);
        if (targetPos) {
            const positions = this.space.tempLinkLine.geometry.attributes.position;
            positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z);
            positions.needsUpdate = true;
            this.space.tempLinkLine.geometry.computeBoundingSphere();
            this.space.tempLinkLine.computeLineDistances();
        }
    }

    _removeTempLinkLine() {
        if (this.space.tempLinkLine) {
            this.space.tempLinkLine.geometry?.dispose();
            this.space.tempLinkLine.material?.dispose();
            this.space.scene.remove(this.space.tempLinkLine);
            this.space.tempLinkLine = null;
        }
    }

    _completeLinking(event) {
        this._removeTempLinkLine();
        const targetInfo = this._getTargetInfo(event);
        if (targetInfo.node && targetInfo.node !== this.space.linkSourceNode) {
            this.space.addEdge(this.space.linkSourceNode, targetInfo.node);
        }
        this.cancelLinking();
    }

    cancelLinking = () => {
        this._removeTempLinkLine();
        this.space.isLinking = false;
        this.space.linkSourceNode = null;
        this.container.style.cursor = 'grab';
        $$('.node-common.linking-target').forEach(el => el.classList.remove('linking-target'));
    }

    showEdgeMenu(edge) {
        if (!edge) return;
        this.hideEdgeMenu();

        const menuElement = this._createEdgeMenuElement(edge);
        this.edgeMenuObject = new CSS3DObject(menuElement);
        this.space.cssScene.add(this.edgeMenuObject); // Add to CSS scene
        this.updateEdgeMenuPosition();
    }

    _createEdgeMenuElement(edge) {
        const menu = document.createElement('div');
        menu.className = 'edge-menu-frame';
        menu.dataset.edgeId = edge.id;
        menu.innerHTML = `
            <input type="color" value="#${edge.data.color.toString(16).padStart(6, '0')}" title="Color" data-action="color">
            <input type="range" min="0.5" max="5" step="0.1" value="${edge.data.thickness}" title="Thickness" data-action="thickness">
            <select title="Constraint Type" data-action="constraintType">
                <option value="elastic" ${edge.data.constraintType === 'elastic' ? 'selected' : ''}>Elastic</option>
                <option value="rigid" ${edge.data.constraintType === 'rigid' ? 'selected' : ''}>Rigid</option>
                <option value="weld" ${edge.data.constraintType === 'weld' ? 'selected' : ''}>Weld</option>
            </select>
            <button title="Delete Edge" class="delete" data-action="delete">×</button>
        `;

        // Use pointerdown to stop propagation early and prevent pan/drag
        menu.addEventListener('pointerdown', e => e.stopPropagation());
        menu.addEventListener('wheel', e => e.stopPropagation()); // Prevent zoom

        menu.addEventListener('input', (e) => {
            const target = e.target;
            const action = target.dataset.action;
            const edgeId = menu.dataset.edgeId;
            const currentEdge = this.space.getEdgeById(edgeId);
            if (!currentEdge) return;

            switch (action) {
                case 'color':
                    currentEdge.data.color = parseInt(target.value.substring(1), 16);
                    currentEdge.setHighlight(this.space.edgeSelected === currentEdge); // Re-apply highlight state
                    break;
                case 'thickness':
                    currentEdge.data.thickness = parseFloat(target.value);
                    if (currentEdge.line?.material) currentEdge.line.material.linewidth = currentEdge.data.thickness;
                    break;
                case 'constraintType':
                    currentEdge.data.constraintType = target.value;
                    // Update default params if switching type
                    if (target.value === 'rigid' && !currentEdge.data.constraintParams?.distance) {
                        currentEdge.data.constraintParams = {
                            distance: currentEdge.source.position.distanceTo(currentEdge.target.position),
                            stiffness: 0.1
                        };
                    } else if (target.value === 'weld' && !currentEdge.data.constraintParams?.distance) {
                        currentEdge.data.constraintParams = {
                            distance: currentEdge.source.getBoundingSphereRadius() + currentEdge.target.getBoundingSphereRadius(),
                            stiffness: 0.5
                        };
                    } else if (target.value === 'elastic' && !currentEdge.data.constraintParams?.stiffness) {
                        currentEdge.data.constraintParams = {stiffness: 0.001, idealLength: 200};
                    }
                    this.space.layout?.kick();
                    break;
            }
        });

        menu.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button || button.dataset.action !== 'delete') return;
            const edgeId = menu.dataset.edgeId;
            this._showConfirm(`Delete edge "${edgeId?.substring(0, 10)}..."?`, () => this.space.removeEdge(edgeId));
        });

        return menu;
    }

    hideEdgeMenu = () => {
        if (this.edgeMenuObject) {
            this.edgeMenuObject.element?.remove();
            this.edgeMenuObject.parent?.remove(this.edgeMenuObject);
            this.edgeMenuObject = null;
        }
    }

    updateEdgeMenuPosition = () => {
        if (!this.edgeMenuObject || !this.space.edgeSelected) return;
        const edge = this.space.edgeSelected;
        const midPoint = new THREE.Vector3().lerpVectors(edge.source.position, edge.target.position, 0.5);
        this.edgeMenuObject.position.copy(midPoint);
        if (this.space.camera?._cam) { // Billboard effect
            this.edgeMenuObject.quaternion.copy(this.space.camera._cam.quaternion);
        }
    }

    dispose() {
        // Remove event listeners (ensure correct options if used)
        const opts = {passive: false};
        this.container.removeEventListener('pointerdown', this._onPointerDown);
        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
        this.container.removeEventListener('contextmenu', this._onContextMenu, opts);
        document.removeEventListener('click', this._onDocumentClick, true);
        this.contextMenuElement.removeEventListener('click', this._onContextMenuClick);
        $('#confirm-yes', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmYes);
        $('#confirm-no', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmNo);
        window.removeEventListener('keydown', this._onKeyDown);
        this.container.removeEventListener('wheel', this._onWheel, opts);

        this.hideEdgeMenu(); // Clean up edge menu object
        // Clear references
        this.space = null;
        this.container = null;
        this.contextMenuElement = null;
        this.confirmDialogElement = null;
        this.draggedNode = null;
        this.resizedNode = null;
        this.hoveredEdge = null;
        this.confirmCallback = null;
        console.log("UIManager disposed.");
    }
}
