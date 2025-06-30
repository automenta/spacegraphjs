import * as THREE from 'three';
// Potentially import InteractionState if needed, though likely not for this specific handler's core logic
// import { InteractionState } from '../InteractionState.js';

export class SelectionScaleHandler {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.space = uiManager.space;
    }

    handleScaling(event) {
        const { uiManager, space } = this; // Destructure for convenience

        // This is the logic from the SCALING_SELECTION case in UIEventHandlers.onPointerMove
        // Ensure all 'this.' from the original UIManager context are changed to 'uiManager.'
        // and direct space/camera/plugin accesses are through 'space' or 'uiManager.space'

        if (!uiManager.draggedSelectionScaleHandleInfo || !space.isDragging) return;

        const camera = space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!camera || !uiManager.selectionScaleHandlesGroup?.userData?.originalBoundingBox) return;

        const selectedNodes = uiManager._uiPluginCallbacks.getSelectedNodes();
        if (!selectedNodes || selectedNodes.size === 0) return;

        const initialBBox = uiManager.selectionScaleHandlesGroup.userData.originalBoundingBox;
        const initialCentroid = uiManager.selectionScaleHandlesGroup.userData.initialCentroid.clone();
        // const _handleName = uiManager.draggedSelectionScaleHandleInfo.handle.name; // Not currently used but good to keep track

        const handleInitialWorldPos = uiManager.draggedSelectionScaleHandleInfo.handle.getWorldPosition(
            new THREE.Vector3()
        );
        const planeNormal = camera.getWorldDirection(new THREE.Vector3()).negate();
        const interactionPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, handleInitialWorldPos);

        const raycaster = new THREE.Raycaster();
        const pointerNDC = space.getPointerNDC(uiManager.pointerState.clientX, uiManager.pointerState.clientY);
        raycaster.setFromCamera(pointerNDC, camera);

        const currentPointerOnPlane = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(interactionPlane, currentPointerOnPlane)) return;

        const dragDisplacement = currentPointerOnPlane.clone().sub(handleInitialWorldPos);
        const initialSize = initialBBox.getSize(new THREE.Vector3());
        const initialHandleRelPos = uiManager.draggedSelectionScaleHandleInfo.handle.userData.relativePosition.clone();

        const centroidToHandleInitial = new THREE.Vector3(
            initialHandleRelPos.x * initialSize.x,
            initialHandleRelPos.y * initialSize.y,
            initialHandleRelPos.z * initialSize.z
        );
        if (centroidToHandleInitial.lengthSq() === 0) return;

        const displacementAlongHandleAxis = dragDisplacement.dot(centroidToHandleInitial.clone().normalize());
        const initialDistToHandle = centroidToHandleInitial.length();
        let scaleFactor = (initialDistToHandle + displacementAlongHandleAxis) / initialDistToHandle;
        scaleFactor = Math.max(0.01, scaleFactor);

        const newBoxSize = initialSize.clone().multiplyScalar(scaleFactor);

        selectedNodes.forEach((node) => {
            const initialNodeSize = uiManager.selectedNodesInitialScales.get(node.id);
            const initialOffset = node.userData.initialOffsetFromSelectionCentroid;

            if (initialNodeSize && initialOffset) {
                const newNodeSize = initialNodeSize.clone().multiplyScalar(scaleFactor);
                newNodeSize.x = Math.max(1, newNodeSize.x);
                newNodeSize.y = Math.max(1, newNodeSize.y);
                newNodeSize.z = Math.max(1, newNodeSize.z);

                if (typeof node.resize === 'function') {
                    node.resize(newNodeSize);
                } else if (node.mesh) {
                    const initialNodeWorldSize = uiManager.selectedNodesInitialScales.get(node.id);
                    const initialLocalScale = node.userData.initialLocalScaleForScalingDrag;

                    if (
                        initialNodeWorldSize &&
                        initialLocalScale &&
                        initialNodeWorldSize.x !== 0 &&
                        initialNodeWorldSize.y !== 0 &&
                        initialNodeWorldSize.z !== 0
                    ) {
                        // Calculate overall scale ratio for each axis based on world dimensions
                        const scaleRatio = new THREE.Vector3(
                            initialNodeWorldSize.x === 0 ? 1 : newNodeSize.x / initialNodeWorldSize.x,
                            initialNodeWorldSize.y === 0 ? 1 : newNodeSize.y / initialNodeWorldSize.y,
                            initialNodeWorldSize.z === 0 ? 1 : newNodeSize.z / initialNodeWorldSize.z
                        );
                        node.mesh.scale.copy(initialLocalScale).multiply(scaleRatio);
                    } else if (node.baseSize && node.baseSize.width && node.baseSize.height) {
                        // Fallback for HtmlNode-like with baseSize
                        node.mesh.scale.set(
                            newNodeSize.x / (node.baseSize.width || 1),
                            newNodeSize.y / (node.baseSize.height || 1),
                            newNodeSize.z / (node.baseSize.depth || 1)
                        );
                    }
                    // Ensure minimum scale after applying, to prevent inversion or zero scale issues with mesh.scale
                    node.mesh.scale.x = Math.max(0.01, node.mesh.scale.x);
                    node.mesh.scale.y = Math.max(0.01, node.mesh.scale.y);
                    node.mesh.scale.z = Math.max(0.01, node.mesh.scale.z);
                    node.mesh.updateMatrixWorld(true);
                }

                const newOffset = initialOffset.clone().multiplyScalar(scaleFactor);
                const newPos = initialCentroid.clone().add(newOffset);
                node.setPosition(newPos.x, newPos.y, newPos.z);
            }
        });

        const newSelectionBBox = new THREE.Box3();
        selectedNodes.forEach((node) => {
            if (node.mesh) {
                node.mesh.updateWorldMatrix(true, false);
                newSelectionBBox.union(new THREE.Box3().setFromObject(node.mesh, true));
            } else {
                newSelectionBBox.expandByPoint(node.position);
            }
        });
        if (newSelectionBBox.isEmpty() || newSelectionBBox.min.equals(newSelectionBBox.max)) {
            newSelectionBBox.setFromCenterAndSize(initialCentroid, newBoxSize);
        }

        uiManager.selectionScaleHandlesGroup.position.copy(newSelectionBBox.getCenter(new THREE.Vector3()));
        const currentGroupSize = newSelectionBBox.getSize(new THREE.Vector3());
        const minDim = 0.1;
        currentGroupSize.x = Math.max(minDim, currentGroupSize.x);
        currentGroupSize.y = Math.max(minDim, currentGroupSize.y);
        currentGroupSize.z = Math.max(minDim, currentGroupSize.z);

        uiManager.selectionScaleHandles.forEach((h) => {
            const relPos = h.userData.relativePosition;
            h.position.set(relPos.x * currentGroupSize.x, relPos.y * currentGroupSize.y, relPos.z * currentGroupSize.z);
        });
        uiManager.selectionScaleHandlesGroup.userData.currentBoundingBox = newSelectionBBox.clone();

        space.emit('graph:nodes:transformed', {
            nodes: Array.from(selectedNodes),
            transformationType: 'scale',
        });
    }
}
