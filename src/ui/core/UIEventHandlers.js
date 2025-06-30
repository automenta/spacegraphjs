import * as THREE from 'three';
import { InteractionState } from '../InteractionState.js';
import { HtmlNode } from '../../graph/nodes/HtmlNode.js'; // Adjust path as needed
import { ALT_Z_DRAG_SENSITIVITY, SHIFT_Y_DRAG_SENSITIVITY, REFERENCE_DISTANCE_FRACTAL_UI } from '../UIManager.js'; // Or move to constants
import { applySemanticZoomToAxis, setFractalElementActive, updateFractalUIScale } from '../fractal/FractalUIElements.js'; // If needed by wheel

export class UIEventHandlers {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.space = uiManager.space;
        // Shortcut to access other decomposed managers if needed, though direct calls are preferred
        this.stateManager = uiManager.stateManager;
        this.targetIdentifier = uiManager.targetIdentifier;
        this.hoverLogic = uiManager.hoverLogic;
    }

    onPointerDown = (e) => {
        const { uiManager, space, stateManager, targetIdentifier } = this; // Destructure for convenience

        if (uiManager.activePointerId !== null && uiManager.activePointerId !== e.pointerId) return;
        uiManager.activePointerId = e.pointerId;
        uiManager._updateNormalizedPointerState(e, true); // UIManager's method for pointerState
        const targetInfo = targetIdentifier.getTargetInfo(e);

        const cameraPlugin = space.plugins.getPlugin('CameraPlugin');
        if (
            cameraPlugin?.getCameraMode() === 'free' &&
            cameraPlugin.getControls()?.isPointerLocked &&
            uiManager.pointerState.button === 0
        )
            return;

        // 1. Gizmo Interaction
        if (uiManager.pointerState.button === 0 && targetInfo.gizmoHandleInfo) {
            e.preventDefault();
            e.stopPropagation();
            const selectedNodes = uiManager._uiPluginCallbacks.getSelectedNodes();
            if (selectedNodes && selectedNodes.size > 0 && uiManager.gizmo) {
                const camera = space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                const raycaster = new THREE.Raycaster();
                const pointerNDC = space.getPointerNDC(uiManager.pointerState.clientX, uiManager.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera);
                let initialPointerWorldPosOnGizmo = new THREE.Vector3();
                const intersects = raycaster.intersectObject(targetInfo.gizmoHandleInfo.object, false);
                if (intersects.length > 0) {
                    initialPointerWorldPosOnGizmo.copy(intersects[0].point);
                } else {
                    const gizmoPlaneNormal = new THREE.Vector3();
                    camera.getWorldDirection(gizmoPlaneNormal);
                    const interactionPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
                        gizmoPlaneNormal.negate(),
                        uiManager.gizmo.position
                    );
                    if (!raycaster.ray.intersectPlane(interactionPlane, initialPointerWorldPosOnGizmo)) {
                        initialPointerWorldPosOnGizmo.copy(uiManager.gizmo.position);
                    }
                }
                stateManager.transitionToState(InteractionState.GIZMO_DRAGGING, {
                    gizmoHandleInfo: targetInfo.gizmoHandleInfo,
                    initialPointerWorldPos: initialPointerWorldPosOnGizmo,
                    selectedNodes: selectedNodes,
                });
            }
            uiManager.contextMenu.hide();
            return;
        }

        // 2. Fractal UI Interaction
        if (uiManager.pointerState.button === 0 && targetInfo.fractalElementInfo) {
            e.preventDefault();
            e.stopPropagation();
            const { object: fractalObject, type: fractalType, axis: fractalAxis } = targetInfo.fractalElementInfo;
            const selectedNodes = uiManager._uiPluginCallbacks.getSelectedNodes();

            if (fractalType === 'agh' && selectedNodes.size > 0 && uiManager.adaptiveGeometricHub) {
                if (uiManager.activeGizmoMode === 'rotate') {
                    // UIManager property
                    uiManager.contextMenu.hide();
                    return;
                }
                uiManager.aghCurrentModeCycle = (uiManager.aghCurrentModeCycle + 1) % 4; // UIManager property
                const manipulatorPosition = uiManager.adaptiveGeometricHub.position.clone();
                const camera = space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                uiManager.fractalAxisManipulators.visible = false;
                uiManager.fractalRotationManipulators.visible = false;
                uiManager.fractalScaleManipulators.visible = false;

                const resetZoomAndUnhighlight = (group) => {
                    if (!group) return;
                    group.children.forEach((child) => {
                        if (child.userData.isFractalUIElement) {
                            child.userData.zoomLevel = 0;
                            if (uiManager.hoveredFractalElement === child) {
                                const originalColor = child.userData.originalColor || new THREE.Color(0xffffff);
                                setFractalElementActive(child, false, originalColor, false); // Direct import
                                uiManager.hoveredFractalElement = null;
                            }
                            if (child.userData.axis && typeof applySemanticZoomToAxis === 'function') {
                                const elementType = child.userData.type;
                                let manipulatorType = 'translate';
                                if (elementType === 'rotate_axis') manipulatorType = 'rotate';
                                else if (elementType === 'scale_axis' || elementType === 'scale_uniform')
                                    manipulatorType = elementType;
                                applySemanticZoomToAxis(group, child.userData.axis, 0, manipulatorType); // Direct import
                            }
                        }
                    });
                };
                resetZoomAndUnhighlight(uiManager.fractalAxisManipulators);
                resetZoomAndUnhighlight(uiManager.fractalRotationManipulators);
                resetZoomAndUnhighlight(uiManager.fractalScaleManipulators);

                let activeManipulatorGroup = null;
                switch (uiManager.aghCurrentModeCycle) {
                    case 1:
                        activeManipulatorGroup = uiManager.fractalAxisManipulators;
                        break;
                    case 2:
                        activeManipulatorGroup = uiManager.fractalRotationManipulators;
                        break;
                    case 3:
                        activeManipulatorGroup = uiManager.fractalScaleManipulators;
                        break;
                }
                if (activeManipulatorGroup) {
                    activeManipulatorGroup.position.copy(manipulatorPosition);
                    activeManipulatorGroup.quaternion.identity();
                    activeManipulatorGroup.children.forEach((child) => {
                        if (child.userData.isFractalUIElement && child.userData.axis) {
                            child.userData.zoomLevel = 0;
                            const elementType = child.userData.type;
                            let manipulatorType = 'translate';
                            if (elementType === 'rotate_axis') manipulatorType = 'rotate';
                            else if (elementType === 'scale_axis' || elementType === 'scale_uniform')
                                manipulatorType = elementType;
                            applySemanticZoomToAxis(activeManipulatorGroup, child.userData.axis, 0, manipulatorType); // Direct import
                        }
                    });
                    if (camera)
                        updateFractalUIScale(
                            activeManipulatorGroup,
                            camera,
                            REFERENCE_DISTANCE_FRACTAL_UI,
                            manipulatorPosition
                        ); // Direct import
                    activeManipulatorGroup.visible = true;
                }
                stateManager.transitionToState(InteractionState.FRACTAL_HUB_ACTIVE);
                uiManager.hudManager.updateAGHModeIndicator(uiManager.aghCurrentModeCycle);
            } else if (fractalType === 'translate_axis' && selectedNodes.size > 0) {
                const camera = space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (!camera) return;
                const raycaster = new THREE.Raycaster();
                const pointerNDC = space.getPointerNDC(uiManager.pointerState.clientX, uiManager.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera);
                const intersects = raycaster.intersectObject(fractalObject, false);
                let initialPointerWorldPos = new THREE.Vector3();
                if (intersects.length > 0) initialPointerWorldPos.copy(intersects[0].point);
                else {
                    /* Fallback ... */
                } // Simplified for brevity

                uiManager.draggedFractalElementInfo = {
                    element: fractalObject,
                    type: fractalType,
                    axis: fractalAxis,
                    initialPointerWorldPos: initialPointerWorldPos.clone(),
                };
                // ... rest of translate_axis setup from UIManager ...
                uiManager.selectedNodesInitialPositions.clear();
                selectedNodes.forEach((node) => {
                    uiManager.selectedNodesInitialPositions.set(node.id, node.position.clone());
                });
                setFractalElementActive(
                    fractalObject,
                    true,
                    fractalObject.userData.originalColor || new THREE.Color(0xffffff),
                    true
                ); // Direct import
                stateManager.transitionToState(InteractionState.FRACTAL_DRAGGING, {
                    draggedFractalInfo: uiManager.draggedFractalElementInfo,
                    selectedNodes,
                });
            } else if (fractalType === 'rotate_axis' && selectedNodes.size > 0) {
                // ... similar adaptation for rotate_axis ...
                stateManager.transitionToState(InteractionState.FRACTAL_ROTATING, {
                    /* ... */
                });
            } else if ((fractalType === 'scale_axis' || fractalType === 'scale_uniform') && selectedNodes.size > 0) {
                // ... similar adaptation for scale_axis/uniform ...
                stateManager.transitionToState(InteractionState.FRACTAL_SCALING, {
                    /* ... */
                });
            }
            uiManager.contextMenu.hide();
            uiManager.hudManager.hideFractalTooltip();
            return;
        }

        // 3. Selection Scale Handle Interaction
        if (uiManager.pointerState.button === 0 && targetInfo.selectionScaleHandleInfo) {
            e.preventDefault();
            e.stopPropagation();
            const selectedNodes = uiManager._uiPluginCallbacks.getSelectedNodes();
            if (selectedNodes && selectedNodes.size > 0) {
                stateManager.transitionToState(InteractionState.SCALING_SELECTION, {
                    handleInfo: targetInfo.selectionScaleHandleInfo,
                    selectedNodes: selectedNodes,
                });
            }
            uiManager.contextMenu.hide();
            return;
        }

        // Button 1 (middle mouse) for auto-zoom
        if (uiManager.pointerState.button === 1) {
            e.preventDefault();
            if (targetInfo.node) space.emit('ui:request:autoZoomNode', targetInfo.node);
            return;
        }

        if (uiManager.pointerState.button === 0) {
            if (targetInfo.nodeControls) {
                // Click on a node's own control button
                e.preventDefault();
                e.stopPropagation();
                uiManager._handleNodeControlButtonClick(targetInfo.nodeControls, targetInfo.node); // UIManager method
                return;
            }
            if (targetInfo.metaframeHandleInfo && targetInfo.metaframeHandleInfo.node) {
                // Click on a metaframe handle
                e.preventDefault();
                e.stopPropagation();
                const { node: handleNode, type: handleType } = targetInfo.metaframeHandleInfo;
                uiManager._uiPluginCallbacks.setSelectedNode(handleNode, e.shiftKey || handleType !== 'dragHandle');
                uiManager.contextMenu.hide();
                return;
            }
            if (targetInfo.node) {
                // Direct click on a node
                e.preventDefault();
                uiManager._uiPluginCallbacks.setSelectedNode(targetInfo.node, e.shiftKey);
                uiManager.contextMenu.hide();
                stateManager.transitionToState(InteractionState.DRAGGING_NODE, { node: targetInfo.node });
                return;
            }
            if (targetInfo.intersectedEdge) {
                // Click on an edge
                e.preventDefault();
                uiManager._uiPluginCallbacks.setSelectedEdge(targetInfo.intersectedEdge, e.shiftKey);
                uiManager.contextMenu.hide();
                return;
            }
            // Click on empty space
            stateManager.transitionToState(InteractionState.PANNING);
            uiManager.contextMenu.hide();
            if (!e.shiftKey) uiManager._uiPluginCallbacks.setSelectedNode(null, false); // Deselect nodes
        }
    };

    onPointerMove = (e) => {
        const { uiManager, space, stateManager, hoverLogic, targetIdentifier } = this;

        if (e.pointerId !== uiManager.activePointerId && uiManager.activePointerId !== null) return;
        const prevX = uiManager.pointerState.clientX;
        const prevY = uiManager.pointerState.clientY;
        uiManager._updateNormalizedPointerState(e); // UIManager method
        const dx = uiManager.pointerState.clientX - prevX;
        const dy = uiManager.pointerState.clientY - prevY;

        switch (uiManager.currentState) {
            case InteractionState.IDLE:
                hoverLogic.handleHover(e);
                break;
            case InteractionState.SCALING_SELECTION:
                e.preventDefault();
                uiManager.selectionScaleHandler.handleScaling(e);
                break;
            case InteractionState.GIZMO_DRAGGING:
                e.preventDefault();
                uiManager.gizmoInteractionHandler.handleGizmoDrag(e);
                break;
            case InteractionState.DRAGGING_NODE:
                e.preventDefault();
                if (uiManager.draggedNode) {
                    // ... (Full dragging logic from UIManager._onPointerMove)
                    // Example: uiManager.draggedNode, uiManager.dragInteractionPlane, etc.
                    const camera = space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                    if (!camera) break;

                    const selectedNodes = uiManager._uiPluginCallbacks.getSelectedNodes();
                    const nodesToMove =
                        selectedNodes?.size > 0 && selectedNodes.has(uiManager.draggedNode)
                            ? selectedNodes
                            : new Set([uiManager.draggedNode]);

                    if (e.altKey) {
                        const zDelta = -dy * ALT_Z_DRAG_SENSITIVITY;
                        nodesToMove.forEach((node) => {
                            const newPos = node.position.clone();
                            newPos.z += zDelta;
                            node.drag(newPos);
                        });
                        uiManager.draggedNodeInitialWorldPos.z += zDelta;
                    } else if (e.shiftKey) {
                        const yDelta = -dy * SHIFT_Y_DRAG_SENSITIVITY;
                        nodesToMove.forEach((node) => {
                            const newPos = node.position.clone();
                            newPos.y += yDelta;
                            node.drag(newPos);
                        });
                        uiManager.draggedNodeInitialWorldPos.y += yDelta;
                    } else {
                        const raycaster = new THREE.Raycaster();
                        const pointerNDC = space.getPointerNDC(
                            uiManager.pointerState.clientX,
                            uiManager.pointerState.clientY
                        );
                        raycaster.setFromCamera(pointerNDC, camera);
                        uiManager.dragInteractionPlane.setFromNormalAndCoplanarPoint(
                            new THREE.Vector3(0, 0, 1),
                            uiManager.draggedNodeInitialWorldPos
                        );
                        const intersectionPoint = new THREE.Vector3();
                        if (raycaster.ray.intersectPlane(uiManager.dragInteractionPlane, intersectionPoint)) {
                            const newPrimaryNodePos = intersectionPoint.clone().sub(uiManager.dragOffset);
                            const currentPrimaryNodePos = uiManager.draggedNode.position.clone();
                            const xyDragDelta = newPrimaryNodePos.clone().sub(currentPrimaryNodePos);
                            xyDragDelta.z = 0;
                            nodesToMove.forEach((sNode) => {
                                const newPos = sNode.position.clone().add(xyDragDelta);
                                sNode.drag(newPos);
                                if (sNode.mesh) sNode.mesh.quaternion.copy(uiManager.draggedNodeInitialQuaternion);
                            });
                        }
                    }
                    space.emit('graph:node:dragged', {
                        node: uiManager.draggedNode,
                        position: uiManager.draggedNode.position.clone(),
                    });
                }
                break;
            case InteractionState.PANNING:
                e.preventDefault();
                space.plugins.getPlugin('CameraPlugin')?.pan(dx, dy);
                break;
            case InteractionState.LINKING_NODE:
                e.preventDefault();
                uiManager._updateTempLinkLine(uiManager.pointerState.clientX, uiManager.pointerState.clientY); // UIManager method
                const targetInfo = targetIdentifier.getTargetInfo(e);
                document
                    .querySelectorAll('.node-common.linking-target')
                    .forEach((el) => el.classList.remove('linking-target')); // DOM manipulation
                const targetElement = targetInfo.node?.htmlElement ?? targetInfo.node?.labelObject?.element;
                if (
                    targetInfo.node &&
                    targetInfo.node !== uiManager._uiPluginCallbacks.getLinkSourceNode() &&
                    targetElement
                ) {
                    targetElement.classList.add('linking-target');
                }
                break;
        }
    };

    onPointerUp = (e) => {
        const { uiManager, space, stateManager, targetIdentifier } = this;

        if (e.pointerId !== uiManager.activePointerId) return;
        uiManager._updateNormalizedPointerState(e, false); // UIManager method
        const currentInteractionState = uiManager.currentState;

        if (!uiManager.pointerState.isDraggingThresholdMet && e.button === 0) {
            const targetInfo = targetIdentifier.getTargetInfo(e);
            // Logic for editable HTML node click (currently no specific action)
        }

        if (currentInteractionState === InteractionState.LINKING_NODE && e.button === 0) {
            uiManager._uiPluginCallbacks.completeLinking(
                uiManager.pointerState.clientX,
                uiManager.pointerState.clientY
            );
        }

        // const targetInfo = targetIdentifier.getTargetInfo(e); // Already got targetInfo if needed for specific up actions

        if (uiManager.currentState !== InteractionState.IDLE) {
            stateManager.transitionToState(InteractionState.IDLE);
        }
        uiManager.activePointerId = null;
    };

    onContextMenu = (e) => {
        const { uiManager, targetIdentifier } = this;
        e.preventDefault();
        uiManager._updateNormalizedPointerState(e); // UIManager method
        uiManager.contextMenu.hide();
        const targetInfo = targetIdentifier.getTargetInfo(e);
        if (targetInfo.gizmoHandleInfo) return; // Don't show context menu over gizmo
        uiManager.contextMenu.show(e.clientX, e.clientY, {
            node: targetInfo.node,
            intersectedEdge: targetInfo.intersectedEdge,
            shiftKey: e.shiftKey,
        });
    };

    onDocumentClick = (e) => {
        const { uiManager, targetIdentifier } = this;
        // Hide menus if click is outside
        if (
            uiManager.contextMenu.contextMenuElement.contains(e.target) ||
            uiManager.contextMenu.contextMenuElement.style.display === 'none'
        )
            return;
        if (uiManager.edgeMenu.edgeMenuObject?.element?.contains(e.target)) return;
        if (uiManager.confirmDialog.confirmDialogElement.contains(e.target)) return;
        // ... check other dialogs from HudManager ...

        uiManager.contextMenu.hide();
        if (uiManager.edgeMenu.edgeMenuObject) {
            const targetInfo = targetIdentifier.getTargetInfo(e);
            const selectedEdges = uiManager._uiPluginCallbacks.getSelectedEdges();
            const clickedSelectedEdge = targetInfo.intersectedEdge && selectedEdges?.has(targetInfo.intersectedEdge);
            if (!clickedSelectedEdge) uiManager._uiPluginCallbacks.setSelectedEdge(null, false);
        }
    };

    onKeyDown = (e) => {
        const { uiManager, space } = this;
        const activeEl = document.activeElement;
        const isEditingText =
            activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
        if (isEditingText && e.key !== 'Escape') return;

        const selectedNodes = uiManager._uiPluginCallbacks.getSelectedNodes();
        const selectedEdges = uiManager._uiPluginCallbacks.getSelectedEdges();
        const primarySelectedNode = selectedNodes.size > 0 ? selectedNodes.values().next().value : null;
        const primarySelectedEdge = selectedEdges.size > 0 ? selectedEdges.values().next().value : null;
        let handled = false;

        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                // ... (delete logic from UIManager) ...
                handled = true;
                break;
            case 'Escape':
                // ... (escape logic from UIManager, including dialogs and linking) ...
                handled = true;
                break;
            // ... other key handlers like Enter, +, -, Space, l ...
        }
        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    onWheel = (e) => {
        const { uiManager, space, targetIdentifier } = this; // Added targetIdentifier
        const targetInfo = targetIdentifier.getTargetInfo(e); // Use targetIdentifier here

        if (targetInfo.element?.closest('.node-content')?.scrollHeight > targetInfo.element?.clientHeight) return;
        if (targetInfo.element?.closest('.edge-menu-frame input[type="range"]')) return;

        if ((e.ctrlKey || e.metaKey) && targetInfo.node instanceof HtmlNode) {
            e.preventDefault();
            e.stopPropagation();
            const scaleFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            space.emit('ui:request:adjustContentScale', { node: targetInfo.node, factor: scaleFactor });
        } else {
            // Fractal UI Semantic Zoom
            if (
                uiManager.hoveredFractalElement &&
                uiManager.hoveredFractalElement.userData.isFractalUIElement &&
                uiManager.hoveredFractalElement.userData.axis &&
                (uiManager.currentState === InteractionState.FRACTAL_HUB_ACTIVE ||
                    (uiManager.currentState === InteractionState.IDLE && uiManager.adaptiveGeometricHub?.visible))
            ) {
                e.preventDefault();
                e.stopPropagation();
                // ... (fractal zoom logic from UIManager) ...
                // Example: uiManager.hoveredFractalElement.userData.zoomLevel
                // applySemanticZoomToAxis(uiManager.fractalAxisManipulators, ...)
                return;
            }
            // Default camera zoom
            e.preventDefault();
            space.emit('ui:request:zoomCamera', e.deltaY);
        }
    };
}
