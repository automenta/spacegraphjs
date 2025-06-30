import * as THREE from 'three';
import { InteractionState } from '../InteractionState.js';
import { TransformGizmo } from '../gizmos/TransformGizmo.js'; // Assuming TransformGizmo is in gizmos
import { HtmlNode } from '../../graph/nodes/HtmlNode.js'; // Adjust path as needed
import { REFERENCE_DISTANCE_FRACTAL_UI, SELECTION_HANDLE_HOVER_COLOR } from '../UIManager.js'; // Assuming UIManager exports these, or move them
import { updateFractalUIScale, setFractalElementActive } from '../fractal/FractalUIElements.js';

export class UIStateManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.space = uiManager.space;
    }

    /**
     * Transitions the UI to a new interaction state, performing cleanup for the old state
     * and setup for the new state.
     * @param {InteractionState} newState - The state to transition to.
     * @param {object} [data={}] - Optional data for the new state's setup.
     */
    transitionToState(newState, data = {}) {
        const { uiManager, space } = this; // Destructure for easier access
        const oldState = uiManager.currentState;

        if (oldState === newState && newState !== InteractionState.GIZMO_DRAGGING) return;

        // --- Cleanup for the Current State ---
        switch (oldState) {
            case InteractionState.DRAGGING_NODE:
                uiManager.draggedNode?.endDrag();
                document.body.style.cursor = 'grab';
                uiManager.draggedNode = null;
                space.isDragging = false;
                break;
            case InteractionState.GIZMO_DRAGGING:
                if (uiManager.gizmo && uiManager.draggedGizmoHandleInfo?.object) {
                    uiManager.gizmo.setHandleActive(uiManager.draggedGizmoHandleInfo.object, false);
                }
                uiManager.draggedGizmoHandleInfo = null;
                uiManager.selectedNodesInitialPositions.clear();
                uiManager.selectedNodesInitialQuaternions.clear();
                uiManager.selectedNodesInitialScales.clear();
                if (uiManager.multiSelectionHelper) {
                    uiManager.multiSelectionHelper.position.set(0, 0, 0);
                    uiManager.multiSelectionHelper.quaternion.identity();
                    uiManager.multiSelectionHelper.scale.set(1, 1, 1);
                }
                document.body.style.cursor = uiManager.gizmo?.visible ? 'default' : 'grab';
                space.isDragging = false;
                break;
            case InteractionState.PANNING:
                space.plugins.getPlugin('CameraPlugin')?.endPan();
                document.body.style.cursor = 'grab';
                break;
            case InteractionState.LINKING_NODE:
                document.body.style.cursor = 'grab';
                // Consider moving DOM manipulations to UIManager or a dedicated DOM utility
                document
                    .querySelectorAll('.node-common.linking-target')
                    .forEach((el) => el.classList.remove('linking-target'));
                break;
            case InteractionState.FRACTAL_DRAGGING:
            case InteractionState.FRACTAL_ROTATING:
            case InteractionState.FRACTAL_SCALING:
                if (uiManager.draggedFractalElementInfo?.element) {
                    const originalColor =
                        uiManager.draggedFractalElementInfo.element.userData.originalColor ||
                        (uiManager.draggedFractalElementInfo.element.material.color
                            ? uiManager.draggedFractalElementInfo.element.material.color.clone()
                            : new THREE.Color(0xffffff));
                    setFractalElementActive(uiManager.draggedFractalElementInfo.element, false, originalColor, false);
                }
                uiManager.draggedFractalElementInfo = null;
                uiManager.selectedNodesInitialPositions.clear();
                uiManager.selectedNodesInitialQuaternions.clear();
                uiManager.selectedNodesInitialScales.clear();
                space.isDragging = false;
                break;
            case InteractionState.SCALING_SELECTION:
                if (uiManager.draggedSelectionScaleHandleInfo?.handle) {
                    uiManager.draggedSelectionScaleHandleInfo.handle.material.color.copy(
                        uiManager.draggedSelectionScaleHandleInfo.handle.userData.originalColor
                    );
                }
                uiManager.draggedSelectionScaleHandleInfo = null;
                uiManager.selectedNodesInitialPositions.clear();
                uiManager.selectedNodesInitialScales.clear();
                if (uiManager.selectionScaleHandlesGroup?.userData) {
                    delete uiManager.selectionScaleHandlesGroup.userData.originalBoundingBox;
                    delete uiManager.selectionScaleHandlesGroup.userData.initialCentroid;
                }
                document.body.style.cursor = 'default';
                space.isDragging = false;
                break;
            // No default needed if all states are handled
        }

        uiManager.currentState = newState;

        // --- Setup for the New State ---
        switch (newState) {
            case InteractionState.DRAGGING_NODE: {
                uiManager.draggedNode = data.node;
                uiManager.draggedNodeInitialWorldPos.copy(uiManager.draggedNode.position);
                if (uiManager.draggedNode.mesh)
                    uiManager.draggedNodeInitialQuaternion.copy(uiManager.draggedNode.mesh.quaternion);
                uiManager.draggedNode.startDrag();
                const camera = space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (!camera) {
                    this.transitionToState(InteractionState.IDLE); // Recursive call, ensure no infinite loop
                    return;
                }

                uiManager.dragInteractionPlane.setFromNormalAndCoplanarPoint(
                    new THREE.Vector3(0, 0, 1),
                    uiManager.draggedNodeInitialWorldPos
                );

                const raycaster = new THREE.Raycaster();
                const pointerNDC = space.getPointerNDC(uiManager.pointerState.clientX, uiManager.pointerState.clientY);
                raycaster.setFromCamera(pointerNDC, camera);
                const initialIntersectionPoint = new THREE.Vector3();

                if (raycaster.ray.intersectPlane(uiManager.dragInteractionPlane, initialIntersectionPoint)) {
                    uiManager.dragOffset.subVectors(initialIntersectionPoint, uiManager.draggedNodeInitialWorldPos);
                } else {
                    const cameraForward = new THREE.Vector3();
                    camera.getWorldDirection(cameraForward);
                    const fallbackPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
                        cameraForward,
                        uiManager.draggedNodeInitialWorldPos
                    );
                    if (raycaster.ray.intersectPlane(fallbackPlane, initialIntersectionPoint)) {
                        uiManager.dragOffset.subVectors(initialIntersectionPoint, uiManager.draggedNodeInitialWorldPos);
                    } else {
                        const fallbackWorldPos = space.screenToWorld(
                            uiManager.pointerState.clientX,
                            uiManager.pointerState.clientY,
                            uiManager.draggedNodeInitialWorldPos.z
                        );
                        uiManager.dragOffset = fallbackWorldPos
                            ? fallbackWorldPos.sub(uiManager.draggedNode.position)
                            : new THREE.Vector3();
                    }
                }
                document.body.style.cursor = 'grabbing';
                space.isDragging = true;
                break;
            }
            case InteractionState.SCALING_SELECTION: {
                uiManager.draggedSelectionScaleHandleInfo = data.handleInfo;
                const selectedNodes = data.selectedNodes;

                if (
                    !uiManager.selectionScaleHandlesGroup ||
                    !uiManager.selectionScaleHandlesGroup.userData.currentBoundingBox ||
                    selectedNodes.size === 0
                ) {
                    this.transitionToState(InteractionState.IDLE);
                    return;
                }

                uiManager.selectionScaleHandlesGroup.userData.originalBoundingBox =
                    uiManager.selectionScaleHandlesGroup.userData.currentBoundingBox.clone();
                uiManager.selectionScaleHandlesGroup.userData.initialCentroid =
                    uiManager.selectionScaleHandlesGroup.position.clone();

                uiManager.selectedNodesInitialPositions.clear();
                uiManager.selectedNodesInitialScales.clear();

                selectedNodes.forEach((node) => {
                    uiManager.selectedNodesInitialPositions.set(node.id, node.position.clone());
                    let size = node.getActualSize
                        ? node.getActualSize()
                        : node.mesh
                          ? node.mesh.getWorldScale(new THREE.Vector3())
                          : new THREE.Vector3(1, 1, 1);
                    uiManager.selectedNodesInitialScales.set(node.id, size.clone());
                    const initialOffset = node.position
                        .clone()
                        .sub(uiManager.selectionScaleHandlesGroup.userData.initialCentroid);
                    node.userData.initialOffsetFromSelectionCentroid = initialOffset;
                    if (node.mesh && typeof node.resize !== 'function') {
                        // Store initial local scale if no custom resize
                        node.userData.initialLocalScaleForScalingDrag = node.mesh.scale.clone();
                    }
                });

                if (uiManager.draggedSelectionScaleHandleInfo.handle) {
                    uiManager.draggedSelectionScaleHandleInfo.handle.material.color.setHex(
                        SELECTION_HANDLE_HOVER_COLOR
                    );
                }
                document.body.style.cursor = 'nwse-resize';
                space.isDragging = true;
                break;
            }
            case InteractionState.GIZMO_DRAGGING: {
                uiManager.draggedGizmoHandleInfo = data.gizmoHandleInfo;
                uiManager.gizmoDragStartPointerWorldPos.copy(data.initialPointerWorldPos);

                uiManager.selectedNodesInitialPositions.clear();
                uiManager.selectedNodesInitialQuaternions.clear();
                uiManager.selectedNodesInitialScales.clear();

                data.selectedNodes.forEach((node) => {
                    uiManager.selectedNodesInitialPositions.set(node.id, node.position.clone());
                    const worldQuaternion = node.mesh
                        ? node.mesh.getWorldQuaternion(new THREE.Quaternion())
                        : new THREE.Quaternion();
                    uiManager.selectedNodesInitialQuaternions.set(node.id, worldQuaternion);

                    let initialWorldDimensions = typeof node.getActualSize === 'function' ? node.getActualSize() : null;
                    if (!initialWorldDimensions && node.mesh?.geometry) {
                        if (!node.mesh.geometry.boundingBox) node.mesh.geometry.computeBoundingBox();
                        if (node.mesh.geometry.boundingBox) {
                            initialWorldDimensions = new THREE.Vector3();
                            node.mesh.geometry.boundingBox.getSize(initialWorldDimensions).multiply(node.mesh.scale);
                        }
                    }
                    if (!initialWorldDimensions)
                        initialWorldDimensions = node.mesh ? node.mesh.scale.clone() : new THREE.Vector3(50, 50, 10);
                    uiManager.selectedNodesInitialScales.set(node.id, initialWorldDimensions);
                });

                if (data.selectedNodes.size > 1 && uiManager.multiSelectionHelper && uiManager.gizmo) {
                    uiManager.multiSelectionHelper.position.copy(uiManager.gizmo.position);
                    uiManager.multiSelectionHelper.quaternion.copy(uiManager.gizmo.quaternion);
                    uiManager.multiSelectionHelper.scale.set(1, 1, 1);
                    uiManager.multiSelectionHelper.updateMatrixWorld(true);

                    data.selectedNodes.forEach((node) => {
                        const initialPos = uiManager.selectedNodesInitialPositions.get(node.id);
                        if (initialPos) {
                            node.userData.initialOffsetFromMultiSelectCenter =
                                uiManager.multiSelectionHelper.worldToLocal(initialPos.clone());
                        }
                    });
                }

                if (uiManager.gizmo && uiManager.draggedGizmoHandleInfo.object) {
                    uiManager.gizmo.setHandleActive(uiManager.draggedGizmoHandleInfo.object, true);
                }

                if (uiManager.draggedGizmoHandleInfo.type === 'rotate') {
                    const camera = space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                    if (camera) {
                        const { axis } = uiManager.draggedGizmoHandleInfo;
                        const gizmoWorldPosition = uiManager.gizmo.position.clone();
                        const rotationAxisWorld = TransformGizmo.getAxisVector(axis)
                            .clone()
                            .applyQuaternion(uiManager.gizmo.quaternion);
                        uiManager.draggedGizmoHandleInfo.rotationPlane =
                            new THREE.Plane().setFromNormalAndCoplanarPoint(rotationAxisWorld, gizmoWorldPosition);

                        const initialPointerOnPlane = new THREE.Vector3();
                        const rayToStartHandle = new THREE.Ray(
                            camera.position,
                            uiManager.gizmoDragStartPointerWorldPos.clone().sub(camera.position).normalize()
                        );
                        if (
                            !rayToStartHandle.intersectPlane(
                                uiManager.draggedGizmoHandleInfo.rotationPlane,
                                initialPointerOnPlane
                            )
                        ) {
                            uiManager.draggedGizmoHandleInfo.rotationPlane.projectPoint(
                                uiManager.gizmoDragStartPointerWorldPos,
                                initialPointerOnPlane
                            );
                        }
                        uiManager.draggedGizmoHandleInfo.initialPointerOnPlane = initialPointerOnPlane.clone();
                        const initialVectorOnPlane = new THREE.Vector3().subVectors(
                            initialPointerOnPlane,
                            gizmoWorldPosition
                        );
                        let initialAngle = 0;
                        if (axis === 'y') initialAngle = Math.atan2(initialVectorOnPlane.z, initialVectorOnPlane.x);
                        else if (axis === 'x')
                            initialAngle = Math.atan2(initialVectorOnPlane.z, initialVectorOnPlane.y);
                        else initialAngle = Math.atan2(initialVectorOnPlane.y, initialVectorOnPlane.x);
                        uiManager.draggedGizmoHandleInfo.initialAngle = initialAngle;
                        uiManager.draggedGizmoHandleInfo.cumulativeDeltaQuaternion = new THREE.Quaternion();
                        uiManager.draggedGizmoHandleInfo.gizmoCenter = gizmoWorldPosition.clone();
                    }
                } else if (uiManager.draggedGizmoHandleInfo.type === 'scale') {
                    // Initialize cumulative scale for the drag operation
                    uiManager.draggedGizmoHandleInfo.cumulativeScaleMultiplier = new THREE.Vector3(1, 1, 1);
                }
                document.body.style.cursor = 'grabbing';
                space.isDragging = true;
                break;
            }
            case InteractionState.PANNING: {
                space.plugins
                    .getPlugin('CameraPlugin')
                    ?.startPan(uiManager.pointerState.clientX, uiManager.pointerState.clientY);
                document.body.style.cursor = 'grabbing';
                break;
            }
            case InteractionState.LINKING_NODE: {
                document.body.style.cursor = 'crosshair';
                uiManager._createTempLinkLine(data.sourceNode); // UIManager method
                break;
            }
            case InteractionState.FRACTAL_HUB_ACTIVE: {
                document.body.style.cursor = 'default';
                const camera = space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
                if (camera && uiManager.adaptiveGeometricHub?.visible) {
                    const aghWorldPos = uiManager.adaptiveGeometricHub.getWorldPosition(new THREE.Vector3());
                    updateFractalUIScale(
                        uiManager.adaptiveGeometricHub,
                        camera,
                        REFERENCE_DISTANCE_FRACTAL_UI,
                        aghWorldPos
                    );
                    if (uiManager.fractalAxisManipulators?.visible) {
                        const transAxesWorldPos = uiManager.fractalAxisManipulators.getWorldPosition(
                            new THREE.Vector3()
                        );
                        updateFractalUIScale(
                            uiManager.fractalAxisManipulators,
                            camera,
                            REFERENCE_DISTANCE_FRACTAL_UI,
                            transAxesWorldPos
                        );
                    }
                    // Similar updates for rotation and scale manipulators if they exist and are visible
                    if (uiManager.fractalRotationManipulators?.visible) {
                        const rotAxesWorldPos = uiManager.fractalRotationManipulators.getWorldPosition(
                            new THREE.Vector3()
                        );
                        updateFractalUIScale(
                            uiManager.fractalRotationManipulators,
                            camera,
                            REFERENCE_DISTANCE_FRACTAL_UI,
                            rotAxesWorldPos
                        );
                    }
                    if (uiManager.fractalScaleManipulators?.visible) {
                        const scaleAxesWorldPos = uiManager.fractalScaleManipulators.getWorldPosition(
                            new THREE.Vector3()
                        );
                        updateFractalUIScale(
                            uiManager.fractalScaleManipulators,
                            camera,
                            REFERENCE_DISTANCE_FRACTAL_UI,
                            scaleAxesWorldPos
                        );
                    }
                }
                break;
            }
            case InteractionState.FRACTAL_DRAGGING:
            case InteractionState.FRACTAL_ROTATING:
            case InteractionState.FRACTAL_SCALING: {
                document.body.style.cursor = 'grabbing';
                space.isDragging = true;
                // draggedFractalElementInfo and selectedNodes initial states are set in _onPointerDown
                // or directly before calling transitionToState for these fractal interactions.
                break;
            }
            case InteractionState.IDLE: {
                const selectedNodesCount = uiManager._uiPluginCallbacks.getSelectedNodes()?.size || 0;
                if (selectedNodesCount === 0) {
                    uiManager.adaptiveGeometricHub?.hide?.(); // Use optional chaining if hide method might not exist
                    uiManager.fractalAxisManipulators?.hide?.();
                    uiManager.fractalRotationManipulators?.hide?.();
                    uiManager.fractalScaleManipulators?.hide?.();
                } else if (
                    uiManager.adaptiveGeometricHub?.visible &&
                    !uiManager.fractalAxisManipulators?.visible &&
                    !uiManager.fractalRotationManipulators?.visible &&
                    !uiManager.fractalScaleManipulators?.visible
                ) {
                    document.body.style.cursor = 'default';
                } else {
                    document.body.style.cursor = uiManager.gizmo?.visible ? 'default' : 'grab';
                }
                break;
            }
        }
        space.emit('interaction:stateChanged', { newState, oldState, data });
    }
}
