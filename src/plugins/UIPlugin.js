import { Plugin } from '../core/Plugin.js';
import { UIManager } from '../ui/UIManager.js';
import { InteractionState } from '../ui/InteractionState.js';
import * as THREE from 'three';

const raycaster = new THREE.Raycaster();
const dragPlane = new THREE.Plane();

export class UIPlugin extends Plugin {
    uiManager = null;
    selectedNodes = new Set();
    selectedEdges = new Set();
    linkSourceNode = null;
    isLinking = false;
    hoveredNode = null; // Track the currently hovered node
    renderingPlugin = null; // Reference to the RenderingPlugin

    // Interaction state for drag/resize
    activeInteraction = InteractionState.IDLE;
    draggedNode = null;
    resizedNode = null;
    initialPointerPosition = new THREE.Vector2();
    initialNodePosition = new THREE.Vector3();
    initialNodeScale = new THREE.Vector3();
    activeResizeHandle = null;

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
    }

    _addEventListeners() {
        const domElement = this.renderingPlugin?.renderGL?.domElement;
        if (domElement) {
            domElement.addEventListener('pointermove', this._onPointerMove);
            domElement.addEventListener('pointerdown', this._onPointerDown);
            domElement.addEventListener('pointerup', this._onPointerUp);
        }
    }

    _removeEventListeners() {
        const domElement = this.renderingPlugin?.renderGL?.domElement;
        if (domElement) {
            domElement.removeEventListener('pointermove', this._onPointerMove);
            domElement.removeEventListener('pointerdown', this._onPointerDown);
            domElement.removeEventListener('pointerup', this._onPointerUp);
        }
    }

    _onPointerDown = (event) => {
        if (event.button !== 0) return; // Only left mouse button or touch

        const intersected = this.space.intersectedObjects(event.clientX, event.clientY);
        const intersectedObject = intersected?.object;
        const intersectedNode = intersected?.node;

        if (intersectedObject?.userData?.handleType === 'drag' && intersectedNode) {
            this.activeInteraction = InteractionState.DRAGGING_NODE;
            this.draggedNode = intersectedNode;
            this.initialPointerPosition.set(event.clientX, event.clientY);
            this.initialNodePosition.copy(intersectedNode.position);

            // Set up the drag plane at the node's current Z position, facing the camera
            dragPlane.setFromNormalAndCoplanarPoint(
                this.space._cam.getWorldDirection(new THREE.Vector3()).negate(),
                intersectedNode.position
            );

            this.space.isDragging = true; // Indicate that a drag operation is active
            this.draggedNode.startDrag();
            event.preventDefault();
        } else if (intersectedObject?.userData?.handleType?.startsWith('resize') && intersectedNode) {
            this.activeInteraction = InteractionState.RESIZING_NODE;
            this.resizedNode = intersectedNode;
            this.initialPointerPosition.set(event.clientX, event.clientY);
            this.initialNodeScale.copy(intersectedNode.mesh.scale);
            this.activeResizeHandle = intersectedObject.userData.handleType;

            // Set up the resize plane at the node's current Z position, facing the camera
            // This plane will be used to project the 2D pointer movement into 3D space consistently
            dragPlane.setFromNormalAndCoplanarPoint(
                this.space._cam.getWorldDirection(new THREE.Vector3()).negate(),
                intersectedNode.position
            );

            // Store the initial intersection point on the dragPlane for resizing calculations
            raycaster.setFromCamera(this.space.getPointerNDC(event.clientX, event.clientY), this.space._cam);
            const initialIntersection = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(dragPlane, initialIntersection)) {
                this.initialIntersectionPoint = initialIntersection.clone();
            } else {
                // Fallback if intersection fails (e.g., camera perfectly aligned with plane)
                this.initialIntersectionPoint = intersectedNode.position.clone();
            }

            this.space.isDragging = true; // Use isDragging to prevent camera pan
            event.preventDefault();
        } else if (intersectedNode) {
            this.setSelectedNode(intersectedNode);
        }
    };

    _onPointerMove = (event) => {
        const pointerNDC = this.space.getPointerNDC(event.clientX, event.clientY);
        raycaster.setFromCamera(pointerNDC, this.space._cam);

        if (this.activeInteraction === InteractionState.DRAGGING_NODE && this.draggedNode) {
            const intersection = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
                const newPosition = intersection.clone();
                this.draggedNode.drag(newPosition);
            }
            return; // Do not process hover while dragging
        } else if (
            this.activeInteraction === InteractionState.RESIZING_NODE &&
            this.resizedNode &&
            this.initialIntersectionPoint
        ) {
            const currentIntersection = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(dragPlane, currentIntersection)) {
                const delta = currentIntersection.clone().sub(this.initialIntersectionPoint);

                const newScale = this.initialNodeScale.clone();
                const scaleFactor = 0.02; // Adjust sensitivity as needed

                // Determine the direction of scaling based on the handle
                // and apply the delta to the appropriate scale components
                switch (this.activeResizeHandle) {
                    case 'topLeft':
                        newScale.x -= delta.x * scaleFactor;
                        newScale.y += delta.y * scaleFactor;
                        break;
                    case 'topRight':
                        newScale.x += delta.x * scaleFactor;
                        newScale.y += delta.y * scaleFactor;
                        break;
                    case 'bottomLeft':
                        newScale.x -= delta.x * scaleFactor;
                        newScale.y -= delta.y * scaleFactor;
                        break;
                    case 'bottomRight':
                        newScale.x += delta.x * scaleFactor;
                        newScale.y -= delta.y * scaleFactor;
                        break;
                }

                // Ensure scale doesn't go below a minimum
                newScale.x = Math.max(0.1, newScale.x);
                newScale.y = Math.max(0.1, newScale.y);
                newScale.z = Math.max(0.1, newScale.z); // Maintain Z scale or adjust as needed

                this.resizedNode.resize(newScale);
            }
            return; // Do not process hover while resizing
        }

        // Original hover logic
        if (this.isLinking || this.space.isDragging) return; // Don't show metaframe during linking or dragging

        const intersected = this.space.intersectedObjects(event.clientX, event.clientY);
        const newHoveredNode = intersected?.node || null;

        if (this.hoveredNode && this.hoveredNode !== newHoveredNode) {
            this.hoveredNode.metaframe?.hide();
        }

        if (newHoveredNode && newHoveredNode !== this.hoveredNode) {
            newHoveredNode.metaframe?.show();
        }
        this.hoveredNode = newHoveredNode;
    };

    _onNodeRemoved = (nodeId, node) => {
        if (node) {
            this.selectedNodes.delete(node);
            if (this.hoveredNode === node) {
                this.hoveredNode.metaframe?.hide();
                this.hoveredNode = null;
            }
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

    _onPointerUp = () => {
        if (this.activeInteraction === InteractionState.DRAGGING_NODE && this.draggedNode) {
            this.draggedNode.endDrag();
            this.space.emit('node:dragged', { node: this.draggedNode });
        } else if (this.activeInteraction === InteractionState.RESIZING_NODE && this.resizedNode) {
            this.space.emit('node:resized', { node: this.resizedNode });
        }

        this.activeInteraction = InteractionState.IDLE;
        this.draggedNode = null;
        this.resizedNode = null;
        this.activeResizeHandle = null;
        this.space.isDragging = false; // Reset dragging flag
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

        this.uiManager?.dispose();
        this.uiManager = null;
        this.selectedNodes.clear();
        this.selectedEdges.clear();
        this.linkSourceNode = null;
        this.hoveredNode = null;
        this.renderingPlugin = null;
    }
}
