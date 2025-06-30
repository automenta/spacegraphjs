import * as THREE from 'three';
import { InteractionState } from '../InteractionState.js';
// Assuming these are exported from UIManager or moved to a constants file
import { REFERENCE_DISTANCE_FRACTAL_UI, SELECTION_HANDLE_HOVER_COLOR } from '../UIManager.js';
import { updateFractalUIScale, setFractalElementActive } from '../fractal/FractalUIElements.js';

export class UIHoverLogic {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.space = uiManager.space;
    }

    handleHover(e) {
        const { uiManager, space } = this;
        const selectedNodes = uiManager._uiPluginCallbacks.getSelectedNodes() || new Set();

        if (uiManager.pointerState.down || uiManager.currentState !== InteractionState.IDLE) {
            if (uiManager.hoveredNodeForMetaframe && !selectedNodes.has(uiManager.hoveredNodeForMetaframe)) {
                uiManager.hoveredNodeForMetaframe.metaframe?.hide();
            }
            uiManager.hoveredNodeForMetaframe = null;

            if (uiManager.currentHoveredGLHandle && uiManager.currentHoveredGLHandle.node?.metaframe) {
                uiManager.currentHoveredGLHandle.node.metaframe.highlightHandle(
                    uiManager.currentHoveredGLHandle.handleMesh,
                    false
                );
                uiManager.currentHoveredGLHandle.node.metaframe.setHandleTooltip(
                    uiManager.hoveredHandleType,
                    '',
                    false
                );
            }
            uiManager.currentHoveredGLHandle = null;
            uiManager.hoveredHandleType = null;

            if (uiManager.hoveredGizmoHandle && uiManager.gizmo) {
                uiManager.gizmo.setHandleActive(uiManager.hoveredGizmoHandle, false);
            }
            uiManager.hoveredGizmoHandle = null;

            if (uiManager.hoveredFractalElement) {
                uiManager.hudManager.hideFractalTooltip();
                // The actual un-highlighting of fractal element will be handled below if it's no longer hovered.
            }
            // uiManager.hoveredFractalElement will be updated/nulled below.

            if (uiManager.hoveredEdge) {
                const selectedEdges = uiManager._uiPluginCallbacks.getSelectedEdges() || new Set();
                if (!selectedEdges.has(uiManager.hoveredEdge)) {
                    uiManager.hoveredEdge.setHoverStyle(false);
                }
            }
            uiManager.hoveredEdge = null;

            if (uiManager.hoveredSelectionScaleHandle) {
                uiManager.hoveredSelectionScaleHandle.material.color.copy(
                    uiManager.hoveredSelectionScaleHandle.userData.originalColor
                );
                uiManager.hoveredSelectionScaleHandle = null;
            }
        }

        // Ensure targetIdentifier is used if this method is called from UIManager instance context
        const targetInfo = uiManager.targetIdentifier.getTargetInfo(e);
        const {
            node: newlyHoveredNode,
            intersectedEdge: newHoveredEdge,
            metaframeHandleInfo: newMFHInfo,
            gizmoHandleInfo: newGizmoHInfo,
            fractalElementInfo: newFractalElInfo,
            selectionScaleHandleInfo: newScaleHandleInfo,
        } = targetInfo;

        // --- Priority Hover Handling ---

        // 1. Selection Scale Handles
        if (uiManager.hoveredSelectionScaleHandle !== newScaleHandleInfo?.handle) {
            if (uiManager.hoveredSelectionScaleHandle) {
                uiManager.hoveredSelectionScaleHandle.material.color.copy(
                    uiManager.hoveredSelectionScaleHandle.userData.originalColor
                );
            }
            uiManager.hoveredSelectionScaleHandle = newScaleHandleInfo?.handle || null;
            if (uiManager.hoveredSelectionScaleHandle) {
                uiManager.hoveredSelectionScaleHandle.material.color.setHex(SELECTION_HANDLE_HOVER_COLOR);
            }
        }

        // 2. Fractal UI Hover (only if no scale handle is hovered)
        if (!uiManager.hoveredSelectionScaleHandle) {
            if (uiManager.hoveredFractalElement !== newFractalElInfo?.object) {
                if (uiManager.hoveredFractalElement) {
                    const oldHoveredElement = uiManager.hoveredFractalElement;
                    const originalColor =
                        oldHoveredElement.userData.originalColor ||
                        (oldHoveredElement.material.color
                            ? oldHoveredElement.material.color.clone()
                            : new THREE.Color(0xffffff));
                    setFractalElementActive(oldHoveredElement, false, originalColor, false);
                    uiManager.hudManager.hideFractalTooltip();
                }
                uiManager.hoveredFractalElement = newFractalElInfo?.object || null;
                if (uiManager.hoveredFractalElement) {
                    const newHoveredElement = uiManager.hoveredFractalElement;
                    const originalColor =
                        newHoveredElement.userData.originalColor ||
                        (newHoveredElement.material.color
                            ? newHoveredElement.material.color.clone()
                            : new THREE.Color(0xffffff));
                    setFractalElementActive(newHoveredElement, true, originalColor, false);
                    if (newHoveredElement.userData.tooltipText) {
                        uiManager.hudManager.showFractalTooltip(
                            newHoveredElement.userData.tooltipText,
                            e.clientX,
                            e.clientY
                        );
                    }
                }
            } else if (
                uiManager.hoveredFractalElement &&
                newFractalElInfo?.object === uiManager.hoveredFractalElement
            ) {
                // If still hovering the same fractal element, ensure tooltip is shown (e.g. if mouse moved slightly but still on it)
                if (uiManager.hoveredFractalElement.userData.tooltipText) {
                    uiManager.hudManager.showFractalTooltip(
                        uiManager.hoveredFractalElement.userData.tooltipText,
                        e.clientX,
                        e.clientY
                    );
                }
            }
        } else {
            // If a scale handle IS hovered, ensure any previously hovered fractal element is unhovered.
            if (uiManager.hoveredFractalElement) {
                const oldHoveredElement = uiManager.hoveredFractalElement;
                const originalColor = oldHoveredElement.userData.originalColor || new THREE.Color(0xffffff);
                setFractalElementActive(oldHoveredElement, false, originalColor, false);
                uiManager.hudManager.hideFractalTooltip();
                uiManager.hoveredFractalElement = null;
            }
        }

        // 3. Gizmo Hover (only if no scale handle or fractal element is hovered)
        if (!uiManager.hoveredSelectionScaleHandle && !uiManager.hoveredFractalElement) {
            if (uiManager.hoveredGizmoHandle !== newGizmoHInfo?.object) {
                if (uiManager.hoveredGizmoHandle && uiManager.gizmo) {
                    uiManager.gizmo.setHandleActive(uiManager.hoveredGizmoHandle, false);
                }
                uiManager.hoveredGizmoHandle = newGizmoHInfo?.object || null;
                if (uiManager.hoveredGizmoHandle && uiManager.gizmo) {
                    uiManager.gizmo.setHandleActive(uiManager.hoveredGizmoHandle, true);
                }
            }
        } else {
            // If scale handle or fractal IS hovered, ensure gizmo is not highlighted
            if (uiManager.hoveredGizmoHandle && uiManager.gizmo) {
                uiManager.gizmo.setHandleActive(uiManager.hoveredGizmoHandle, false);
                uiManager.hoveredGizmoHandle = null;
            }
        }

        // 4. Metaframe Hover (lowest priority among 3D handles)
        if (
            !uiManager.hoveredSelectionScaleHandle &&
            !uiManager.hoveredFractalElement &&
            !uiManager.hoveredGizmoHandle
        ) {
            if (uiManager.hoveredNodeForMetaframe !== newlyHoveredNode) {
                if (uiManager.hoveredNodeForMetaframe && !selectedNodes.has(uiManager.hoveredNodeForMetaframe)) {
                    uiManager.hoveredNodeForMetaframe.ensureMetaframe()?.hide();
                }
                if (newlyHoveredNode && !selectedNodes.has(newlyHoveredNode) && newlyHoveredNode.metaframe) {
                    const mf = newlyHoveredNode.ensureMetaframe();
                    if (mf) {
                        mf.show();
                        Object.values(mf.resizeHandles).forEach((h) => mf.highlightHandle(h, false));
                        if (mf.dragHandle) mf.highlightHandle(mf.dragHandle, false);
                    }
                }
                uiManager.hoveredNodeForMetaframe = newlyHoveredNode;
            }

            if (
                uiManager.hoveredHandleType !== newMFHInfo?.type ||
                uiManager.currentHoveredGLHandle?.handleMesh !== newMFHInfo?.object
            ) {
                if (uiManager.currentHoveredGLHandle) {
                    const oldMf = uiManager.currentHoveredGLHandle.node?.ensureMetaframe();
                    if (oldMf) {
                        oldMf.highlightHandle(uiManager.currentHoveredGLHandle.handleMesh, false);
                        oldMf.setHandleTooltip(uiManager.hoveredHandleType, '', false);
                    }
                }
                if (newMFHInfo) {
                    const curMf = newMFHInfo.node?.ensureMetaframe();
                    if (curMf?.isVisible) {
                        document.body.style.cursor = uiManager._getCursorForHandle(newMFHInfo.type); // UIManager method
                        curMf.highlightHandle(newMFHInfo.object, true);
                        curMf.setHandleTooltip(
                            newMFHInfo.type,
                            uiManager._getTooltipTextForHandle(newMFHInfo.type),
                            true
                        ); // UIManager method
                    }
                    uiManager.currentHoveredGLHandle = { node: newMFHInfo.node, handleMesh: newMFHInfo.object };
                } else {
                    uiManager.currentHoveredGLHandle = null;
                }
                uiManager.hoveredHandleType = newMFHInfo?.type || null;
            }
        } else {
            // If any higher priority handle is hovered, ensure metaframe is not active
            if (uiManager.currentHoveredGLHandle) {
                const oldMf = uiManager.currentHoveredGLHandle.node?.ensureMetaframe();
                if (oldMf) {
                    oldMf.highlightHandle(uiManager.currentHoveredGLHandle.handleMesh, false);
                    oldMf.setHandleTooltip(uiManager.hoveredHandleType, '', false);
                }
                uiManager.currentHoveredGLHandle = null;
            }
            uiManager.hoveredHandleType = null;
            if (uiManager.hoveredNodeForMetaframe && !selectedNodes.has(uiManager.hoveredNodeForMetaframe)) {
                uiManager.hoveredNodeForMetaframe.ensureMetaframe()?.hide();
                uiManager.hoveredNodeForMetaframe = null;
            }
        }

        // 5. Edge Hover
        const currentlySelectedEdges = uiManager._uiPluginCallbacks.getSelectedEdges() || new Set();
        if (uiManager.hoveredEdge !== newHoveredEdge) {
            if (uiManager.hoveredEdge && !currentlySelectedEdges.has(uiManager.hoveredEdge)) {
                uiManager.hoveredEdge.setHoverStyle(false);
            }
            uiManager.hoveredEdge = newHoveredEdge;
            if (uiManager.hoveredEdge && !currentlySelectedEdges.has(uiManager.hoveredEdge)) {
                uiManager.hoveredEdge.setHoverStyle(true);
            }
        }

        // Cursor logic based on hover priority
        if (uiManager.hoveredSelectionScaleHandle) {
            document.body.style.cursor = 'nwse-resize';
        } else if (uiManager.hoveredFractalElement) {
            document.body.style.cursor = 'pointer';
        } else if (uiManager.hoveredGizmoHandle) {
            document.body.style.cursor = 'pointer';
        } else if (uiManager.currentHoveredGLHandle) {
            // Cursor already set by metaframe logic if newMFHInfo was processed
        } else if (uiManager.hoveredEdge) {
            document.body.style.cursor = 'pointer';
        } else if (
            uiManager.adaptiveGeometricHub?.visible ||
            uiManager.gizmo?.visible ||
            uiManager.selectionScaleHandlesGroup?.visible ||
            uiManager.hoveredNodeForMetaframe || // Metaframe itself is visible for a node
            (newlyHoveredNode && selectedNodes.has(newlyHoveredNode)) // Hovering a selected node
        ) {
            document.body.style.cursor = 'default'; // Default if any major UI (AGH, Gizmo, SelHandles) is active, or over a metaframe/selected node
        } else {
            document.body.style.cursor = 'grab'; // Default grab for empty space
        }

        // Update scaling for visible UI elements
        const camera = space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        if (camera) {
            if (uiManager.adaptiveGeometricHub?.visible && uiManager.adaptiveGeometricHub.parent) {
                const aghWorldPos = uiManager.adaptiveGeometricHub.getWorldPosition(new THREE.Vector3());
                updateFractalUIScale(
                    uiManager.adaptiveGeometricHub,
                    camera,
                    REFERENCE_DISTANCE_FRACTAL_UI,
                    aghWorldPos
                );
            }
            if (uiManager.fractalAxisManipulators?.visible && uiManager.fractalAxisManipulators.parent) {
                const transAxesWorldPos = uiManager.fractalAxisManipulators.getWorldPosition(new THREE.Vector3());
                updateFractalUIScale(
                    uiManager.fractalAxisManipulators,
                    camera,
                    REFERENCE_DISTANCE_FRACTAL_UI,
                    transAxesWorldPos
                );
            }
            if (uiManager.fractalRotationManipulators?.visible && uiManager.fractalRotationManipulators.parent) {
                const rotAxesWorldPos = uiManager.fractalRotationManipulators.getWorldPosition(new THREE.Vector3());
                updateFractalUIScale(
                    uiManager.fractalRotationManipulators,
                    camera,
                    REFERENCE_DISTANCE_FRACTAL_UI,
                    rotAxesWorldPos
                );
            }
            if (uiManager.fractalScaleManipulators?.visible && uiManager.fractalScaleManipulators.parent) {
                const scaleAxesWorldPos = uiManager.fractalScaleManipulators.getWorldPosition(new THREE.Vector3());
                updateFractalUIScale(
                    uiManager.fractalScaleManipulators,
                    camera,
                    REFERENCE_DISTANCE_FRACTAL_UI,
                    scaleAxesWorldPos
                );
            }
            if (uiManager.gizmo?.visible && uiManager.gizmo.parent) {
                uiManager.gizmo.updateScale(camera);
            }
            if (uiManager.selectionScaleHandlesGroup?.visible && uiManager.selectionScaleHandlesGroup.parent) {
                const groupWorldPos = uiManager.selectionScaleHandlesGroup.getWorldPosition(new THREE.Vector3());
                const dist = Math.max(1, groupWorldPos.distanceTo(camera.position));
                const scaleFactor = Math.max(0.01, dist / REFERENCE_DISTANCE_FRACTAL_UI);
                uiManager.selectionScaleHandlesGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
            }
        }
    }
}
