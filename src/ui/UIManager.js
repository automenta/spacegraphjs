import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { $, $$ } from '../utils.js';
import { HtmlNode } from '../graph/nodes/HtmlNode.js';
import { NoteNode } from '../graph/nodes/NoteNode.js';
import { ShapeNode } from '../graph/nodes/ShapeNode.js';
// import { Edge } from '../graph/Edge.js'; // Import Edge for type checking - not strictly needed if only for comments

export class UIManager {
    space = null;
    container = null;
    contextMenuElement = null;
    confirmDialogElement = null;
    edgeMenuObject = null;

    draggedNode = null;
    draggedNodeInitialZ = 0; // For Z-depth adjustment
    resizedNode = null;
    hoveredEdge = null;
    resizeStartPos = { x: 0, y: 0 };
    resizeStartSize = { width: 0, height: 0 };
    dragOffset = new THREE.Vector3();
    pointerState = {
        down: false,
        primary: false,
        secondary: false,
        middle: false,
        potentialClick: true,
        lastPos: { x: 0, y: 0 },
        startPos: { x: 0, y: 0 },
    };
    confirmCallback = null;
    tempLinkLine = null; // Added: Managed by UIManager now

    constructor(space, contextMenuEl, confirmDialogEl) {
        if (!space || !contextMenuEl || !confirmDialogEl)
            throw new Error('UIManager requires SpaceGraph instance and UI elements.');
        this.space = space;
        this.container = space.container;
        this.contextMenuElement = contextMenuEl;
        this.confirmDialogElement = confirmDialogEl;
        this._bindEvents();
        this._subscribeToSpaceGraphEvents();
    }

    _bindEvents() {
        const passiveOpts = { passive: false }; // Define once
        this.container.addEventListener('pointerdown', this._onPointerDown, passiveOpts);
        window.addEventListener('pointermove', this._onPointerMove, passiveOpts);
        window.addEventListener('pointerup', this._onPointerUp, passiveOpts);
        this.container.addEventListener('contextmenu', this._onContextMenu, passiveOpts);
        document.addEventListener('click', this._onDocumentClick, true); // Capture phase
        this.contextMenuElement.addEventListener('click', this._onContextMenuClick, false);
        $('#confirm-yes', this.confirmDialogElement)?.addEventListener('click', this._onConfirmYes, false);
        $('#confirm-no', this.confirmDialogElement)?.addEventListener('click', this._onConfirmNo, false);
        window.addEventListener('keydown', this._onKeyDown, false);
        this.container.addEventListener('wheel', this._onWheel, passiveOpts);
    }

    _subscribeToSpaceGraphEvents() {
        this.space.on('node:selected', this._onNodeSelected);
        this.space.on('edge:selected', this._onEdgeSelected);
        this.space.on('node:added', this._onNodeAdded);
        this.space.on('node:removed', this._onNodeRemoved);
        this.space.on('edge:added', this._onEdgeAdded);
        this.space.on('edge:removed', this._onEdgeRemoved);
        this.space.on('layout:started', this._onLayoutStarted);
        this.space.on('layout:stopped', this._onLayoutStopped);
        this.space.on('ui:linking:started', this._onLinkingStarted);
        this.space.on('ui:linking:cancelled', this._onLinkingCancelled);
        this.space.on('ui:linking:completed', this._onLinkingCompleted);
    }

    _updatePointerState(e, isDown) {
        this.pointerState.down = isDown;
        this.pointerState.primary = isDown && e.button === 0;
        this.pointerState.secondary = isDown && e.button === 2;
        this.pointerState.middle = isDown && e.button === 1;
        if (isDown) {
            this.pointerState.potentialClick = true;
            this.pointerState.startPos = { x: e.clientX, y: e.clientY };
            this.pointerState.lastPos = { x: e.clientX, y: e.clientY };
        }
    }

    _onPointerDown = (e) => {
        this._updatePointerState(e, true);

        if (this.pointerState.secondary) {
            e.preventDefault();
            return;
        }

        const targetInfo = this._getTargetInfo(e);

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
    };

    _onPointerMove = (e) => {
        if (!this.pointerState.down) {
            this._handleHover(e);
            return;
        }

        const totalDx = e.clientX - this.pointerState.startPos.x;
        const totalDy = e.clientY - this.pointerState.startPos.y;

        if (Math.sqrt(totalDx ** 2 + totalDy ** 2) > 3) this.pointerState.potentialClick = false;
        this.pointerState.lastPos = { x: e.clientX, y: e.clientY };

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
            let targetZ = this.draggedNodeInitialZ; // Start with the Z-plane established at pointer down

            if (e.altKey) {
                const dy = e.clientY - this.pointerState.lastPos.y; // Delta Y since last frame
                const zSensitivity = 1.0; // Adjust sensitivity as needed
                // Modify the targetZ for dragging based on vertical mouse movement
                // Subtracting dy: moving mouse up (negative dy) increases targetZ (moves further away if camera setup is typical)
                // Or, if positive Z is "up" in your world, and mouse up should move node "up", then it's targetZ += dy * zSensitivity
                // Let's assume standard screen coords: mouse_y_up = smaller clientY.
                // If world +Z is further from camera: mouse_y_up (smaller clientY, negative dy) should mean larger Z.
                // So, targetZ -= dy * zSensitivity; (if dy is positive for mouse down)
                // If dy is (newY - oldY): mouse down = larger clientY = positive dy.
                // targetZ should decrease if mouse moves down (closer to user).
                // Let's verify: clientY increases downwards.
                // dy = e.clientY - this.pointerState.lastPos.y:
                // Mouse moves down: e.clientY > lastPos.y -> dy is positive.
                // Mouse moves up: e.clientY < lastPos.y -> dy is negative.
                // If positive Z is away from camera:
                // Mouse moves down (positive dy) -> targetZ should decrease (closer).
                // Mouse moves up (negative dy) -> targetZ should increase (further).
                // So: targetZ -= dy * zSensitivity; is correct for "mouse Y controls depth on screen"
                targetZ -= dy * zSensitivity;
                this.draggedNodeInitialZ = targetZ; // Update the reference Z plane for next Alt-drag frame
            }

            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, targetZ);

            if (worldPos) {
                let primaryNodeNewCalculatedPos = worldPos.clone().sub(this.dragOffset);
                primaryNodeNewCalculatedPos.z = targetZ; // Ensure the Z is exactly the targetZ for the primary node

                // Calculate the delta of movement for the primary dragged node based on its current position
                const dragDelta = primaryNodeNewCalculatedPos.clone().sub(this.draggedNode.position);

                const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
                const selectedNodes = uiPlugin?.getSelectedNodes();

                if (selectedNodes && selectedNodes.size > 0) {
                    // Apply the drag to all selected nodes
                    selectedNodes.forEach(sNode => {
                        if (sNode === this.draggedNode) {
                            // The primary dragged node moves to the calculated position
                            sNode.drag(primaryNodeNewCalculatedPos);
                        } else {
                            // Other selected nodes move by the same delta
                            const sNodeTargetPos = sNode.position.clone().add(dragDelta);
                            sNode.drag(sNodeTargetPos);
                        }
                    });
                } else if (this.draggedNode) {
                    // Fallback if somehow selectedNodes is empty but we are dragging (should not happen with proper selection updates)
                    this.draggedNode.drag(primaryNodeNewCalculatedPos);
                }
            }
            return;
        }

        if (this.space.isLinking) {
            e.preventDefault();
            this._updateTempLinkLine(e.clientX, e.clientY);
            const targetInfo = this._getTargetInfo(e);
            // Use common class for highlighting potential targets
            $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
            const targetElement = targetInfo.node?.htmlElement ?? targetInfo.node?.labelObject?.element;
            if (targetInfo.node && targetInfo.node !== this.space.linkSourceNode && targetElement) {
                targetElement.classList.add('linking-target');
            }
            return;
        }

        if (this.pointerState.primary) {
            const dx = e.clientX - this.pointerState.lastPos.x; // Recalculate dx, dy for pan
            const dy = e.clientY - this.pointerState.lastPos.y;
            // MODIFIED: Use CameraPlugin
            this.space.plugins.getPlugin('CameraPlugin')?.pan(dx, dy);
        }
    };

    _onPointerUp = (e) => {
        if (this.resizedNode) {
            this.resizedNode.endResize();
            this.resizedNode = null;
        } else if (this.draggedNode) {
            this.draggedNode.endDrag();
            this.draggedNode = null;
        } else if (this.space.isLinking && e.button === 0) {
            this.space.emit('ui:request:completeLinking', e.clientX, e.clientY);
        } else if (e.button === 1 && this.pointerState.potentialClick) {
            const { node } = this._getTargetInfo(e);
            if (node) {
                this.space.emit('ui:request:autoZoomNode', node);
                e.preventDefault();
            }
        }

        // MODIFIED: Use CameraPlugin
        this.space.plugins.getPlugin('CameraPlugin')?.endPan();
        this._updatePointerState(e, false);
        $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
    };

    _onContextMenu = (e) => {
        e.preventDefault();
        this._hideContextMenu();
        const targetInfo = this._getTargetInfo(e);
        let menuItems = [];
        let target = null;

        // Prioritize node hit from raycast or element check
        if (targetInfo.node) {
            target = targetInfo.node;
            // Context menu click implies single selection of the target
            this.space.emit('ui:request:setSelectedNode', target, false);
            menuItems = this._getContextMenuItemsNode(target);
        } else if (targetInfo.intersectedEdge) {
            // Check edge only if no node hit
            target = targetInfo.intersectedEdge;
            this.space.emit('ui:request:setSelectedEdge', target, false);
            menuItems = this._getContextMenuItemsEdge(target);
        } else {
            // Background
            this.space.emit('ui:request:setSelectedNode', null, false);
            // Selecting null node also clears edges in UIPlugin's setSelectedNode
            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, 0);
            menuItems = this._getContextMenuItemsBackground(worldPos);
        }
        if (menuItems.length > 0) this._showContextMenu(e.clientX, e.clientY, menuItems);
    };

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
            // Check against selectedEdges set from UIPlugin
            const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
            if (uiPlugin && !uiPlugin.getSelectedEdges().has(targetInfo.intersectedEdge)) {
                this.space.emit('ui:request:setSelectedEdge', null, false);
            }
        }

        // Deselect node/edge if clicking background and not dragging/panning/linking
        // and not clicking on any graph element (node HTML, node mesh, edge line)
        // and not holding shift (to allow for starting a selection marquee in the future)
        const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
        const cameraControls = cameraPlugin?.getControls(); // CameraControls instance
        if (
            !e.shiftKey && // Don't deselect if shift is held (for future marquee select)
            !clickedContextMenu &&
            !clickedEdgeMenu &&
            !clickedConfirmDialog &&
            this.pointerState.potentialClick &&
            !cameraControls?.isPanning &&
            !this.space.isLinking
        ) {
            const targetInfo = this._getTargetInfo(e);
            const clickedOnGraphElement =
                targetInfo.nodeElement ||
                targetInfo.intersectedObjectResult?.node ||
                targetInfo.intersectedObjectResult?.edge;
            if (!clickedOnGraphElement) {
                this.space.emit('ui:request:setSelectedNode', null, false);
                // setSelectedNode(null, false) in UIPlugin will also clear edge selections.
            }
        }
    };

    _onContextMenuClick = (e) => {
        const li = e.target.closest('li[data-action]');
        if (!li) return;
        const { action, nodeId, edgeId, position: positionData } = li.dataset;
        this._hideContextMenu();

        const actions = {
            'edit-node': () => {
                // MODIFIED: Use NodePlugin
                const node = this.space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeId);
                if (node instanceof HtmlNode && node.data.editable) {
                    node.htmlElement?.querySelector('.node-content')?.focus();
                }
            },
            'delete-node': () =>
                this._showConfirm(`Delete node "${nodeId?.substring(0, 10)}..."?`, () =>
                    this.space.emit('ui:request:removeNode', nodeId)
                ),
            'delete-edge': () =>
                this._showConfirm(`Delete edge "${edgeId?.substring(0, 10)}..."?`, () =>
                    this.space.emit('ui:request:removeEdge', edgeId)
                ),
            // MODIFIED: Use NodePlugin
            'autozoom-node': () =>
                this.space.emit(
                    'ui:request:autoZoomNode',
                    this.space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeId)
                ),
            'create-note': () =>
                this.space.emit(
                    'ui:request:addNode',
                    new NoteNode(null, JSON.parse(positionData), { content: 'New Note ✨' })
                ),
            'create-box': () =>
                this.space.emit(
                    'ui:request:addNode',
                    new ShapeNode(null, JSON.parse(positionData), {
                        label: 'Box Node 📦',
                        shape: 'box',
                        size: 60,
                        color: Math.random() * 0xffffff,
                    })
                ),
            'create-sphere': () =>
                this.space.emit(
                    'ui:request:addNode',
                    new ShapeNode(null, JSON.parse(positionData), {
                        label: 'Sphere Node 🌐',
                        shape: 'sphere',
                        size: 60,
                        color: Math.random() * 0xffffff,
                    })
                ),
            'center-view': () => this.space.emit('ui:request:centerView'),
            'reset-view': () => this.space.emit('ui:request:resetView'),
            // MODIFIED: Use NodePlugin
            'start-link': () =>
                this.space.emit(
                    'ui:request:startLinking',
                    this.space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeId)
                ),
            'reverse-edge': () => this.space.emit('ui:request:reverseEdge', edgeId),
            // MODIFIED: Use EdgePlugin
            'edit-edge': () =>
                this.space.emit(
                    'ui:request:setSelectedEdge',
                    this.space.plugins.getPlugin('EdgePlugin')?.getEdgeById(edgeId)
                ),
            // MODIFIED: Use RenderingPlugin for background info
            'toggle-background': () => {
                const renderingPlugin = this.space.plugins.getPlugin('RenderingPlugin');
                if (renderingPlugin) {
                    this.space.emit(
                        'ui:request:toggleBackground',
                        renderingPlugin.background.alpha === 0 ? 0x1a1a1d : 0x000000,
                        renderingPlugin.background.alpha === 0 ? 1.0 : 0
                    );
                }
            },
        };

        actions[action]?.() ?? console.warn('Unknown context menu action:', action);
    };

    _onConfirmYes = () => {
        this.confirmCallback?.();
        this._hideConfirm();
    };
    _onConfirmNo = () => this._hideConfirm();

    _onKeyDown = (e) => {
        const activeEl = document.activeElement;
        const isEditing =
            activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
        if (isEditing && e.key !== 'Escape') return;

        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
        const selectedNodes = uiPlugin?.getSelectedNodes();
        const selectedEdges = uiPlugin?.getSelectedEdges();

        // For now, shortcuts primarily act on a single "primary" selected item.
        // Group actions (e.g., deleting all selected) can be a future enhancement.
        const primarySelectedNode = selectedNodes && selectedNodes.size > 0 ? selectedNodes.values().next().value : null;
        const primarySelectedEdge = selectedEdges && selectedEdges.size > 0 ? selectedEdges.values().next().value : null;

        let handled = true;

        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                // If multiple nodes are selected, this will currently only prompt for the "primary" one.
                // A fuller implementation might delete all or prompt differently.
                if (primarySelectedNode) {
                    const nodeIdPreview = primarySelectedNode.id.substring(0, 10);
                    const message = selectedNodes.size > 1 ? `Delete ${selectedNodes.size} selected nodes?` : `Delete node "${nodeIdPreview}..."?`;
                    this._showConfirm(message, () => {
                        selectedNodes.forEach(node => this.space.emit('ui:request:removeNode', node.id));
                    });
                } else if (primarySelectedEdge) {
                    const edgeIdPreview = primarySelectedEdge.id.substring(0, 10);
                     const message = selectedEdges.size > 1 ? `Delete ${selectedEdges.size} selected edges?` : `Delete edge "${edgeIdPreview}..."?`;
                    this._showConfirm(message, () => {
                        selectedEdges.forEach(edge => this.space.emit('ui:request:removeEdge', edge.id));
                    });
                } else {
                    handled = false;
                }
                break;
            case 'Escape':
                if (this.space.isLinking) this.space.emit('ui:request:cancelLinking');
                else if (this.contextMenuElement.style.display === 'block') this._hideContextMenu();
                else if (this.confirmDialogElement.style.display === 'block') this._hideConfirm();
                else if (this.edgeMenuObject) this.space.emit('ui:request:setSelectedEdge', null, false); // Deselects edge for menu
                else if ((selectedNodes && selectedNodes.size > 0) || (selectedEdges && selectedEdges.size > 0)) {
                    // Deselect all by emitting null with non-multi-select
                    this.space.emit('ui:request:setSelectedNode', null, false);
                } else handled = false;
                break;
            case 'Enter':
                if (primarySelectedNode instanceof HtmlNode && primarySelectedNode.data.editable)
                    primarySelectedNode.htmlElement?.querySelector('.node-content')?.focus();
                else handled = false;
                break;
            case '+':
            case '=':
                if (primarySelectedNode instanceof HtmlNode) {
                    e.ctrlKey || e.metaKey
                        ? this.space.emit('ui:request:adjustNodeSize', primarySelectedNode, 1.2)
                        : this.space.emit('ui:request:adjustContentScale', primarySelectedNode, 1.15);
                } else handled = false;
                break;
            case '-':
            case '_':
                if (primarySelectedNode instanceof HtmlNode) {
                    e.ctrlKey || e.metaKey
                        ? this.space.emit('ui:request:adjustNodeSize', primarySelectedNode, 1 / 1.2)
                        : this.space.emit('ui:request:adjustContentScale', primarySelectedNode, 1 / 1.15);
                } else handled = false;
                break;
            case ' ': // Spacebar focuses on the primary selected node/edge or centers view
                if (primarySelectedNode) this.space.emit('ui:request:focusOnNode', primarySelectedNode, 0.5, true);
                else if (primarySelectedEdge) {
                    const midPoint = new THREE.Vector3().lerpVectors(
                        primarySelectedEdge.source.position,
                        primarySelectedEdge.target.position,
                        0.5
                    );
                    const dist = primarySelectedEdge.source.position.distanceTo(primarySelectedEdge.target.position);
                    const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
                    cameraPlugin?.pushState();
                    cameraPlugin?.moveTo(midPoint.x, midPoint.y, midPoint.z + dist * 0.6 + 100, 0.5, midPoint);
                } else this.space.emit('ui:request:centerView');
                break;
            default:
                handled = false;
        }
        if (handled) e.preventDefault();
    };

    _onWheel = (e) => {
        const targetInfo = this._getTargetInfo(e);
        // Allow scroll in specific UI elements or editable content
        if (e.target.closest('.node-controls, .edge-menu-frame') || targetInfo.contentEditable) return;

        if (e.ctrlKey || e.metaKey) {
            if (targetInfo.node instanceof HtmlNode) {
                e.preventDefault();
                e.stopPropagation();
                this.space.emit('ui:request:adjustContentScale', targetInfo.node, e.deltaY < 0 ? 1.1 : 1 / 1.1);
            } // Allow browser zoom otherwise
        } else {
            e.preventDefault();
            this.space.emit('ui:request:zoomCamera', e.deltaY);
        }
    };

    _getTargetInfo(event) {
        const element = document.elementFromPoint(event.clientX, event.clientY);
        // Check for specific UI elements first
        const nodeElement = element?.closest('.node-common'); // Catches .node-html and .node-label-3d
        const resizeHandle = element?.closest('.resize-handle');
        const nodeControls = element?.closest('.node-controls button');
        const contentEditable = element?.closest('[contenteditable="true"]');
        const interactiveElement = element?.closest('button, input, textarea, select, a'); // Inside node content

        // MODIFIED: Use NodePlugin
        let node = nodeElement
            ? this.space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeElement.dataset.nodeId)
            : null;
        let intersectedObjectResult = null;

        // Raycast if not interacting with specific HTML node parts or if clicking background/label
        const needsRaycast = !element || (!resizeHandle && !nodeControls && !contentEditable && !interactiveElement);
        if (needsRaycast) {
            intersectedObjectResult = this.space.intersectedObjects(event.clientX, event.clientY);
            // Prioritize raycast result for node if no element-based node found or if raycast hit mesh
            if (intersectedObjectResult?.node && (!node || nodeElement?.classList.contains('node-label-3d'))) {
                node = intersectedObjectResult.node;
            }
        }

        return {
            element,
            nodeElement,
            resizeHandle,
            nodeControls,
            contentEditable,
            interactiveElement,
            node, // The determined node (from element or raycast)
            intersectedEdge: intersectedObjectResult?.edge ?? null,
            intersectedObjectResult, // Full raycast result
        };
    }

    _handleHover(e) {
        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
        const selectedEdges = uiPlugin?.getSelectedEdges();

        if (this.pointerState.down || this.draggedNode || this.resizedNode || this.space.isLinking) {
            // If currently interacting, ensure any non-selected hovered edge is un-highlighted
            if (this.hoveredEdge && !selectedEdges?.has(this.hoveredEdge)) {
                this.hoveredEdge.setHighlight(false);
            }
            this.hoveredEdge = null; // Clear current hover regardless
            return;
        }

        const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');
        const edgePlugin = this.space.plugins.getPlugin('EdgePlugin');
        const camInstance = cameraPlugin?.getCameraInstance();

        if (!camInstance || !edgePlugin) { // Should not happen if plugins are initialized
            if (this.hoveredEdge && !selectedEdges?.has(this.hoveredEdge)) {
                this.hoveredEdge.setHighlight(false);
            }
            this.hoveredEdge = null;
            return;
        }

        const vec = new THREE.Vector2(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, camInstance);
        raycaster.params.Line.threshold = 5; // Adjust sensitivity for line intersection

        const currentEdgesMap = edgePlugin.getEdges();
        const edgeLines = [...currentEdgesMap.values()].map((edge) => edge.line).filter(Boolean);

        const intersects = edgeLines.length > 0 ? raycaster.intersectObjects(edgeLines, false) : [];
        const intersectedEdgeInstance =
            intersects.length > 0 ? edgePlugin.getEdgeById(intersects[0].object.userData.edgeId) : null;

        if (this.hoveredEdge !== intersectedEdgeInstance) {
            // If there was a previously hovered edge, and it's not part of current selection, un-highlight it
            if (this.hoveredEdge && !selectedEdges?.has(this.hoveredEdge)) {
                this.hoveredEdge.setHighlight(false);
            }

            this.hoveredEdge = intersectedEdgeInstance; // Update to the new hovered edge (or null)

            // If the new hovered edge exists and is not part of current selection, highlight it
            if (this.hoveredEdge && !selectedEdges?.has(this.hoveredEdge)) {
                this.hoveredEdge.setHighlight(true);
            }
        }
    }

    _handlePointerDownControls(e, targetInfo) {
        if (targetInfo.nodeControls && targetInfo.node instanceof HtmlNode) {
            e.preventDefault();
            e.stopPropagation();
            const button = targetInfo.nodeControls;
            // Extract action from class list more robustly
            const actionClass = [...button.classList].find((cls) => cls.startsWith('node-') && !cls.includes('button'));
            const action = actionClass?.substring('node-'.length);

            const actions = {
                delete: () =>
                    this._showConfirm(`Delete node "${targetInfo.node.id.substring(0, 10)}..."?`, () =>
                        this.space.emit('ui:request:removeNode', targetInfo.node.id)
                    ),
                'content-zoom-in': () => this.space.emit('ui:request:adjustContentScale', targetInfo.node, 1.15),
                'content-zoom-out': () => this.space.emit('ui:request:adjustContentScale', targetInfo.node, 1 / 1.15),
                grow: () => this.space.emit('ui:request:adjustNodeSize', targetInfo.node, 1.2),
                shrink: () => this.space.emit('ui:request:adjustNodeSize', targetInfo.node, 1 / 1.2),
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
            this.resizeStartPos = { x: e.clientX, y: e.clientY }; // Store initial mouse pos
            this.resizeStartSize = { ...this.resizedNode.size }; // Store initial node size
            this.container.style.cursor = 'nwse-resize';
            this._hideContextMenu();
            return true;
        }
        return false;
    }

    _handlePointerDownNode(e, targetInfo) {
        // Can drag if node exists and not clicking specific interactive sub-elements
        const canDrag =
            targetInfo.node &&
            !targetInfo.nodeControls &&
            !targetInfo.resizeHandle &&
            !targetInfo.interactiveElement &&
            !targetInfo.contentEditable;

        if (canDrag) {
            e.preventDefault();
            this.draggedNode = targetInfo.node;
            this.draggedNode.startDrag();
            this.draggedNodeInitialZ = this.draggedNode.position.z; // Store initial Z for planar dragging / Z adjustment
            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, this.draggedNodeInitialZ);
            this.dragOffset = worldPos ? worldPos.sub(this.draggedNode.position) : new THREE.Vector3();
            this.container.style.cursor = 'grabbing';
            this.space.emit('ui:request:setSelectedNode', targetInfo.node, e.shiftKey); // Pass shiftKey status
            this._hideContextMenu();
            return true;
        }

        // If clicking interactive/editable content, select node but allow default interaction
        if (targetInfo.node && (targetInfo.interactiveElement || targetInfo.contentEditable)) {
            e.stopPropagation(); // Prevent background panning
            // Single selection for interactive elements, not multi-select
            this.space.emit('ui:request:setSelectedNode', targetInfo.node, false);
            this._hideContextMenu();
            // Return false to allow default browser behavior (e.g., focus input, select text)
        }
        return false;
    }

    _handlePointerDownEdge(e, targetInfo) {
        // Select edge only if raycast hit edge AND didn't hit a node mesh closer
        if (targetInfo.intersectedEdge && !targetInfo.node) {
            e.preventDefault();
            this.space.emit('ui:request:setSelectedEdge', targetInfo.intersectedEdge, e.shiftKey); // Pass shiftKey status
            this._hideContextMenu();
            return true;
        }
        return false;
    }

    _handlePointerDownBackground(e, targetInfo) {
        // Start panning if click is on background (no node, no edge from raycast)
        if (!targetInfo.node && !targetInfo.intersectedEdge) {
            this._hideContextMenu();
            // MODIFIED: Use CameraPlugin
            this.space.plugins.getPlugin('CameraPlugin')?.startPan(e.clientX, e.clientY);
            // Deselection happens on click up / document click
        }
        return false;
    }

    _getContextMenuItemsNode(node) {
        const items = [];
        if (node instanceof HtmlNode && node.data.editable)
            items.push({
                label: 'Edit Content 📝',
                action: 'edit-node',
                nodeId: node.id,
            });
        items.push({ label: 'Start Link ✨', action: 'start-link', nodeId: node.id });
        items.push({ label: 'Auto Zoom / Back 🖱️', action: 'autozoom-node', nodeId: node.id });
        items.push({ type: 'separator' });
        items.push({ label: 'Delete Node 🗑️', action: 'delete-node', nodeId: node.id });
        return items;
    }

    _getContextMenuItemsEdge(edge) {
        return [
            { label: 'Edit Style...', action: 'edit-edge', edgeId: edge.id },
            { label: 'Reverse Direction', action: 'reverse-edge', edgeId: edge.id },
            { type: 'separator' },
            { label: 'Delete Edge 🗑️', action: 'delete-edge', edgeId: edge.id },
        ];
    }

    _getContextMenuItemsBackground(worldPos) {
        const items = [];
        if (worldPos) {
            const posStr = JSON.stringify({ x: worldPos.x, y: worldPos.y, z: worldPos.z });
            items.push({ label: 'Create Note Here 📝', action: 'create-note', position: posStr });
            items.push({ label: 'Create Box Here 📦', action: 'create-box', position: posStr });
            items.push({ label: 'Create Sphere Here 🌐', action: 'create-sphere', position: posStr });
        }
        items.push({ type: 'separator' });
        items.push({ label: 'Center View 🧭', action: 'center-view' });
        items.push({ label: 'Reset Zoom & Pan', action: 'reset-view' });
        // MODIFIED: Use RenderingPlugin for background info
        const renderingPlugin = this.space.plugins.getPlugin('RenderingPlugin');
        if (renderingPlugin) {
            items.push({
                label: renderingPlugin.background.alpha === 0 ? 'Set Dark Background' : 'Set Transparent BG',
                action: 'toggle-background',
            });
        }
        return items;
    }

    _showContextMenu(x, y, items) {
        const cm = this.contextMenuElement;
        cm.innerHTML = '';
        const ul = document.createElement('ul');
        items.forEach((itemData) => {
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

        const { offsetWidth: menuWidth, offsetHeight: menuHeight } = cm;
        const margin = 5;
        let finalX = x + margin + menuWidth > window.innerWidth - margin ? x - menuWidth - margin : x + margin;
        let finalY = y + margin + menuHeight > window.innerHeight - margin ? y - menuHeight - margin : y + margin;
        cm.style.left = `${Math.max(margin, finalX)}px`;
        cm.style.top = `${Math.max(margin, finalY)}px`;
        cm.style.display = 'block';
    }

    _hideContextMenu = () => {
        this.contextMenuElement.style.display = 'none';
        this.contextMenuElement.innerHTML = '';
    };

    _showConfirm(message, onConfirm) {
        const messageEl = $('#confirm-message', this.confirmDialogElement);
        if (messageEl) messageEl.textContent = message;
        this.confirmCallback = onConfirm;
        this.confirmDialogElement.style.display = 'block';
    }

    _hideConfirm = () => {
        this.confirmDialogElement.style.display = 'none';
        this.confirmCallback = null;
    };

    _createTempLinkLine(sourceNode) {
        this._removeTempLinkLine();
        const material = new THREE.LineDashedMaterial({
            color: 0xffaa00,
            linewidth: 2,
            dashSize: 8,
            gapSize: 4,
            transparent: true,
            opacity: 0.9,
            depthTest: false,
        });
        const points = [sourceNode.position.clone(), sourceNode.position.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.tempLinkLine = new THREE.Line(geometry, material); // MODIFIED: Use this.tempLinkLine
        this.tempLinkLine.computeLineDistances();
        this.tempLinkLine.renderOrder = 1;
        // MODIFIED: Use RenderingPlugin
        this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.add(this.tempLinkLine);
    }

    _updateTempLinkLine(screenX, screenY) {
        if (!this.tempLinkLine || !this.space.linkSourceNode) return; // MODIFIED: Use this.tempLinkLine
        const targetPos = this.space.screenToWorld(screenX, screenY, this.space.linkSourceNode.position.z);
        if (targetPos) {
            const positions = this.tempLinkLine.geometry.attributes.position; // MODIFIED: Use this.tempLinkLine
            positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z);
            positions.needsUpdate = true;
            this.tempLinkLine.geometry.computeBoundingSphere(); // MODIFIED: Use this.tempLinkLine
            this.tempLinkLine.computeLineDistances(); // MODIFIED: Use this.tempLinkLine
        }
    }

    _removeTempLinkLine() {
        if (this.tempLinkLine) {
            // MODIFIED: Use this.tempLinkLine
            this.tempLinkLine.geometry?.dispose();
            this.tempLinkLine.material?.dispose();
            // MODIFIED: Use RenderingPlugin
            this.space.plugins.getPlugin('RenderingPlugin')?.getWebGLScene()?.remove(this.tempLinkLine);
            this.tempLinkLine = null; // MODIFIED: Use this.tempLinkLine
        }
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
                ${['elastic', 'rigid', 'weld'].map((n) => `<option value="${n}" ${edge.data.constraintType === n ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
            <button title="Delete Edge" class="delete" data-action="delete">×</button>
        `;

        // Use pointerdown to stop propagation early and prevent pan/drag
        menu.addEventListener('pointerdown', (e) => e.stopPropagation());
        menu.addEventListener('wheel', (e) => e.stopPropagation()); // Prevent zoom

        menu.addEventListener('input', (e) => {
            const target = e.target;
            const action = target.dataset.action;
            const edgeId = menu.dataset.edgeId;
            // MODIFIED: Use EdgePlugin
            const edgePlugin = this.space.plugins.getPlugin('EdgePlugin');
            const currentEdge = edgePlugin?.getEdgeById(edgeId);
            if (!currentEdge) return;

            let value;
            switch (action) {
                case 'color':
                    value = parseInt(target.value.substring(1), 16);
                    break;
                case 'thickness':
                    value = parseFloat(target.value);
                    break;
                case 'constraintType':
                    value = target.value;
                    break;
            }
            this.space.emit('ui:request:updateEdge', edgeId, action, value);
        });

        menu.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button || button.dataset.action !== 'delete') return;
            const edgeId = menu.dataset.edgeId;
            this._showConfirm(`Delete edge "${edgeId?.substring(0, 10)}..."?`, () =>
                this.space.emit('ui:request:removeEdge', edgeId)
            );
        });

        return menu;
    }

    hideEdgeMenu = () => {
        if (this.edgeMenuObject) {
            this.edgeMenuObject.element?.remove();
            this.edgeMenuObject.parent?.remove(this.edgeMenuObject);
            this.edgeMenuObject = null;
        }
    };

    updateEdgeMenuPosition = () => {
        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
        const selectedEdges = uiPlugin?.getSelectedEdges();

        if (!this.edgeMenuObject || !this.edgeMenuObject.element?.parentNode) return; // Not visible or not in DOM

        if (!selectedEdges || selectedEdges.size !== 1) {
            // This case should ideally be handled by _onEdgeSelected causing hideEdgeMenu.
            // If somehow it's visible when it shouldn't be, hide it.
            this.hideEdgeMenu();
            return;
        }

        const edge = selectedEdges.values().next().value; // Get the single selected edge
        const midPoint = new THREE.Vector3().lerpVectors(edge.source.position, edge.target.position, 0.5);
        this.edgeMenuObject.position.copy(midPoint);
        const camInstance = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        if (camInstance) {
            // Billboard effect
            this.edgeMenuObject.quaternion.copy(camInstance.quaternion);
        }
    };

    // --- Event Handlers for SpaceGraph Events ---
    // Note: 'node:selected' event now passes the node that was the target of the interaction.
    // UIPlugin is responsible for managing the selected set and applying styles.
    // This handler is for UIManager specific reactions to a primary selection event.
    _onNodeSelected = (targetNode) => {
        // console.log('UIManager._onNodeSelected, target:', targetNode?.id);
        // Styling is handled by UIPlugin.setSelectedNode.
        // This callback can be used for other UI updates, like focusing a properties panel,
        // but for now, it does not need to do anything regarding visual selection state.
    };

    // Note: 'edge:selected' event now passes the edge that was the target of the interaction.
    _onEdgeSelected = (targetEdge) => {
        // console.log('UIManager._onEdgeSelected, target:', targetEdge?.id);
        // Styling is handled by UIPlugin.setSelectedEdge.
        // This callback primarily manages the edge context menu.

        // The edge menu should be shown if the targetEdge is non-null AND it's the only selected edge.
        // If multiple edges are selected, the simple context menu might not be appropriate,
        // or it should adapt. For now, show menu only for a single selected edge.
        const uiPlugin = this.space.plugins.getPlugin('UIPlugin');
        const selectedEdges = uiPlugin?.getSelectedEdges();

        if (targetEdge && selectedEdges && selectedEdges.size === 1 && selectedEdges.has(targetEdge)) {
            this.showEdgeMenu(targetEdge);
        } else {
            this.hideEdgeMenu();
        }
    };

    _onNodeAdded = (node) => {
        // Potentially update UI lists, etc.
        // For now, just log or react if needed
        // console.log("UI: Node added:", node.id);
    };

    _onNodeRemoved = (nodeId, node) => {
        // Potentially update UI lists, etc.
        // console.log("UI: Node removed:", nodeId);
    };

    _onEdgeAdded = (edge) => {
        // console.log("UI: Edge added:", edge.id);
    };

    _onEdgeRemoved = (edgeId, edge) => {
        // console.log("UI: Edge removed:", edgeId);
    };

    _onLayoutStarted = () => {
        // console.log("UI: Layout started");
        // Potentially show a "layout running" indicator
    };

    _onLayoutStopped = () => {
        // console.log("UI: Layout stopped");
        // Potentially hide the indicator
    };

    _onLinkingStarted = (sourceNode) => {
        this.container.style.cursor = 'crosshair';
        this._createTempLinkLine(sourceNode);
        this._hideContextMenu();
    };

    _onLinkingCancelled = () => {
        this._removeTempLinkLine();
        this.container.style.cursor = 'grab';
        $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
    };

    _onLinkingCompleted = () => {
        this._removeTempLinkLine();
        this.container.style.cursor = 'grab';
        $$('.node-common.linking-target').forEach((el) => el.classList.remove('linking-target'));
    };

    dispose() {
        // Remove event listeners (ensure correct options if used)
        const passiveOpts = { passive: false }; // Define once
        this.container.removeEventListener('pointerdown', this._onPointerDown);
        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
        this.container.removeEventListener('contextmenu', this._onContextMenu, passiveOpts);
        document.removeEventListener('click', this._onDocumentClick, true);
        this.contextMenuElement.removeEventListener('click', this._onContextMenuClick);
        $('#confirm-yes', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmYes);
        $('#confirm-no', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmNo);
        window.removeEventListener('keydown', this._onKeyDown);
        this.container.removeEventListener('wheel', this._onWheel, passiveOpts);

        // Unsubscribe from SpaceGraph events
        this.space.off('node:selected', this._onNodeSelected);
        this.space.off('edge:selected', this._onEdgeSelected);
        this.space.off('node:added', this._onNodeAdded);
        this.space.off('node:removed', this._onNodeRemoved);
        this.space.off('edge:added', this._onEdgeAdded);
        this.space.off('edge:removed', this._onEdgeRemoved);
        this.space.off('layout:started', this._onLayoutStarted);
        this.space.off('layout:stopped', this._onLayoutStopped);
        this.space.off('ui:linking:started', this._onLinkingStarted);
        this.space.off('ui:linking:cancelled', this._onLinkingCancelled);
        this.space.off('ui:linking:completed', this._onLinkingCompleted);

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
        console.log('UIManager disposed.');
    }
}
