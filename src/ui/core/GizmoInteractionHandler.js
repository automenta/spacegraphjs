import * as THREE from 'three';
import { TransformGizmo } from '../gizmos/TransformGizmo.js'; // Adjust path as needed
import { HtmlNode } from '../../graph/nodes/HtmlNode.js'; // Adjust path as needed

export class GizmoInteractionHandler {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.space = uiManager.space;
    }

    handleGizmoDrag(event) {
        const { uiManager, space } = this; // Destructure for convenience

        if (!uiManager.draggedGizmoHandleInfo || !uiManager.gizmo || !space.isDragging) return;
        const camera = space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!camera) return;
        const selectedNodes = uiManager._uiPluginCallbacks.getSelectedNodes();
        if (!selectedNodes || selectedNodes.size === 0) return;

        const raycaster = new THREE.Raycaster();
        const pointerNDC = space.getPointerNDC(event.clientX, event.clientY);
        raycaster.setFromCamera(pointerNDC, camera);

        const gizmoInfo = uiManager.draggedGizmoHandleInfo;
        const currentPointerWorldPos = new THREE.Vector3();

        // --- Translation ---
        if (gizmoInfo.type === 'translate') {
            let dragDelta = new THREE.Vector3();
            if (gizmoInfo.part === 'arrow') {
                const axisVectorWorld = TransformGizmo.getAxisVector(gizmoInfo.axis)
                    .clone()
                    .applyQuaternion(uiManager.gizmo.quaternion);
                const dragLine = new THREE.Line3(
                    uiManager.gizmo.position.clone().sub(axisVectorWorld.clone().multiplyScalar(10000)),
                    uiManager.gizmo.position.clone().add(axisVectorWorld.clone().multiplyScalar(10000))
                );
                raycaster.ray.closestPointToLine(dragLine, false, currentPointerWorldPos);
            } else if (gizmoInfo.part === 'plane') {
                const planeNormalWorld = TransformGizmo.getPlaneNormal(gizmoInfo.axis)
                    .clone()
                    .applyQuaternion(uiManager.gizmo.quaternion);
                const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
                    planeNormalWorld,
                    uiManager.gizmoDragStartPointerWorldPos
                );
                if (!raycaster.ray.intersectPlane(dragPlane, currentPointerWorldPos)) return;
            }
            if (uiManager.gizmoDragStartPointerWorldPos.lengthSq() > 0) {
                dragDelta.subVectors(currentPointerWorldPos, uiManager.gizmoDragStartPointerWorldPos);
            } else return;

            selectedNodes.forEach((node) => {
                const initialPos = uiManager.selectedNodesInitialPositions.get(node.id);
                if (initialPos) {
                    const newPos = initialPos.clone().add(dragDelta);
                    node.setPosition(newPos.x, newPos.y, newPos.z);
                }
            });
            space.emit('graph:nodes:transformed', {
                nodes: Array.from(selectedNodes),
                transformationType: 'translate',
            });
        }
        // --- Rotation ---
        else if (gizmoInfo.type === 'rotate') {
            if (
                !gizmoInfo.rotationPlane ||
                gizmoInfo.initialAngle === undefined ||
                !gizmoInfo.cumulativeDeltaQuaternion ||
                !gizmoInfo.gizmoCenter
            ) {
                return;
            }
            const currentPointerOnPlane = new THREE.Vector3();
            if (!raycaster.ray.intersectPlane(gizmoInfo.rotationPlane, currentPointerOnPlane)) return;

            const currentVectorOnPlane = new THREE.Vector3().subVectors(currentPointerOnPlane, gizmoInfo.gizmoCenter);
            let currentAngle = 0;
            if (gizmoInfo.axis === 'y') currentAngle = Math.atan2(currentVectorOnPlane.z, currentVectorOnPlane.x);
            else if (gizmoInfo.axis === 'x') currentAngle = Math.atan2(currentVectorOnPlane.z, currentVectorOnPlane.y);
            else currentAngle = Math.atan2(currentVectorOnPlane.y, currentVectorOnPlane.x);

            let angleDelta = currentAngle - gizmoInfo.initialAngle;
            angleDelta = ((angleDelta + Math.PI) % (2 * Math.PI)) - Math.PI;

            const rotationAxisWorld = TransformGizmo.getAxisVector(gizmoInfo.axis)
                .clone()
                .applyQuaternion(uiManager.gizmo.quaternion);
            const frameDeltaQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxisWorld, angleDelta);
            gizmoInfo.cumulativeDeltaQuaternion.premultiply(frameDeltaQuaternion);
            gizmoInfo.initialAngle = currentAngle;

            const pivotPoint = gizmoInfo.gizmoCenter;

            if (selectedNodes.size > 1 && uiManager.multiSelectionHelper) {
                uiManager.multiSelectionHelper.quaternion.copy(gizmoInfo.cumulativeDeltaQuaternion);
                uiManager.multiSelectionHelper.position.copy(pivotPoint);
                uiManager.multiSelectionHelper.updateMatrixWorld(true);

                selectedNodes.forEach((node) => {
                    const initialLocalOffset = node.userData.initialOffsetFromMultiSelectCenter;
                    const initialNodeWorldQuaternion = uiManager.selectedNodesInitialQuaternions.get(node.id);
                    if (initialLocalOffset && initialNodeWorldQuaternion) {
                        const newWorldPos = uiManager.multiSelectionHelper.localToWorld(initialLocalOffset.clone());
                        node.setPosition(newWorldPos.x, newWorldPos.y, newWorldPos.z);
                        if (node.mesh) {
                            const newQuaternion = gizmoInfo.cumulativeDeltaQuaternion
                                .clone()
                                .multiply(initialNodeWorldQuaternion);
                            node.mesh.quaternion.copy(newQuaternion);
                        }
                    }
                });
            } else {
                selectedNodes.forEach((node) => {
                    const initialPos = uiManager.selectedNodesInitialPositions.get(node.id);
                    const initialQuaternion = uiManager.selectedNodesInitialQuaternions.get(node.id);
                    if (initialPos && initialQuaternion) {
                        const offset = initialPos.clone().sub(pivotPoint);
                        offset.applyQuaternion(gizmoInfo.cumulativeDeltaQuaternion);
                        const newPos = pivotPoint.clone().add(offset);
                        node.setPosition(newPos.x, newPos.y, newPos.z);
                        if (node.mesh) {
                            const newRotationQuaternion = gizmoInfo.cumulativeDeltaQuaternion
                                .clone()
                                .multiply(initialQuaternion);
                            node.setRotation(newRotationQuaternion);
                        }
                    }
                });
            }
            space.emit('graph:nodes:transformed', {
                nodes: Array.from(selectedNodes),
                transformationType: 'rotate',
            });
        }
        // --- Scaling ---
        else if (gizmoInfo.type === 'scale') {
            const scaleSpeed = 0.005;
            let scaleFactorDelta =
                Math.abs(event.movementX) > Math.abs(event.movementY)
                    ? event.movementX * scaleSpeed
                    : event.movementY * scaleSpeed;

            // This is a per-frame multiplier
            let perFrameScaleMultiplier = new THREE.Vector3(1, 1, 1);
            if (gizmoInfo.axis === 'xyz') {
                // Uniform scale
                const val = 1 + scaleFactorDelta;
                perFrameScaleMultiplier.set(val, val, val);
            } else {
                // Axis-specific scale
                if (gizmoInfo.axis === 'x') perFrameScaleMultiplier.x += scaleFactorDelta;
                else if (gizmoInfo.axis === 'y') perFrameScaleMultiplier.y += scaleFactorDelta;
                else if (gizmoInfo.axis === 'z') perFrameScaleMultiplier.z += scaleFactorDelta;
            }

            // Ensure per-frame multiplier isn't zero or negative, but allow it to be < 1 for shrinking
            perFrameScaleMultiplier.x = Math.max(0.001, perFrameScaleMultiplier.x);
            perFrameScaleMultiplier.y = Math.max(0.001, perFrameScaleMultiplier.y);
            perFrameScaleMultiplier.z = Math.max(0.001, perFrameScaleMultiplier.z);

            // Initialize or update cumulative scale multiplier
            if (!gizmoInfo.cumulativeScaleMultiplier) {
                gizmoInfo.cumulativeScaleMultiplier = new THREE.Vector3(1, 1, 1);
            }
            gizmoInfo.cumulativeScaleMultiplier.multiply(perFrameScaleMultiplier);

            // Ensure cumulative scale doesn't go to zero or negative. Min practical scale might be 0.01.
            gizmoInfo.cumulativeScaleMultiplier.x = Math.max(0.01, gizmoInfo.cumulativeScaleMultiplier.x);
            gizmoInfo.cumulativeScaleMultiplier.y = Math.max(0.01, gizmoInfo.cumulativeScaleMultiplier.y);
            gizmoInfo.cumulativeScaleMultiplier.z = Math.max(0.01, gizmoInfo.cumulativeScaleMultiplier.z);

            const cumulativeScaleToApply = gizmoInfo.cumulativeScaleMultiplier;

            if (selectedNodes.size === 1 && !uiManager.isGizmoInWorldSpace) {
                // LOCAL SCALING for single node
                const node = selectedNodes.values().next().value;
                if (node.mesh) {
                    // Apply the per-frame multiplier to the current local scale
                    node.mesh.scale.multiply(perFrameScaleMultiplier);
                    // Ensure minimum local scale components (e.g., if base geometry is 1x1x1, scale shouldn't be ~0)
                    node.mesh.scale.x = Math.max(0.01, node.mesh.scale.x);
                    node.mesh.scale.y = Math.max(0.01, node.mesh.scale.y);
                    node.mesh.scale.z = Math.max(0.01, node.mesh.scale.z);
                    node.mesh.updateMatrixWorld(true);
                    if (node instanceof HtmlNode) {
                        // HtmlNode's resize expects world dimensions.
                        // If its mesh is 1x1x1, its world dimensions are effectively its local scale
                        // (assuming no other parent transforms between node and its mesh).
                        // This needs to be robust if HtmlNode's internal mesh isn't 1x1x1.
                        // For now, assuming mesh.scale directly maps to desired dimensions.
                        node.resize(node.mesh.scale.clone());
                    }
                }
            } else {
                // WORLD SCALING or MULTI-NODE scaling (relative to selection center)
                let pivotPoint;
                if (selectedNodes.size > 1) {
                    pivotPoint = new THREE.Vector3();
                    let count = 0;
                    uiManager.selectedNodesInitialPositions.forEach((pos) => {
                        pivotPoint.add(pos);
                        count++;
                    });
                    if (count > 0) pivotPoint.divideScalar(count);
                    else pivotPoint.copy(uiManager.gizmo.position); // Fallback, though count should be > 0
                } else if (selectedNodes.size === 1) {
                    const node = selectedNodes.values().next().value;
                    pivotPoint = uiManager.selectedNodesInitialPositions.get(node.id).clone();
                }

                selectedNodes.forEach((node) => {
                    const initialPos = uiManager.selectedNodesInitialPositions.get(node.id);
                    const initialWorldDimensions = uiManager.selectedNodesInitialScales.get(node.id); // Absolute dimensions at drag start

                    if (initialPos && initialWorldDimensions) {
                        const newWorldDimensions = initialWorldDimensions.clone().multiply(cumulativeScaleToApply);
                        newWorldDimensions.x = Math.max(1, newWorldDimensions.x); // Min dimension
                        newWorldDimensions.y = Math.max(1, newWorldDimensions.y);
                        newWorldDimensions.z = Math.max(1, newWorldDimensions.z);

                        const offset = initialPos.clone().sub(pivotPoint);
                        offset.multiply(cumulativeScaleToApply);
                        const newPos = pivotPoint.clone().add(offset);
                        node.setPosition(newPos);

                        if (typeof node.resize === 'function') {
                            node.resize(newWorldDimensions);
                        } else if (node.mesh) {
                            const geom = node.mesh.geometry;
                            if (geom && geom.boundingBox) {
                                const geomSize = new THREE.Vector3();
                                geom.boundingBox.getSize(geomSize);
                                // Avoid division by zero if geomSize components are zero
                                node.mesh.scale.set(
                                    geomSize.x > 0.0001 ? newWorldDimensions.x / geomSize.x : 1,
                                    geomSize.y > 0.0001 ? newWorldDimensions.y / geomSize.y : 1,
                                    geomSize.z > 0.0001 ? newWorldDimensions.z / geomSize.z : 1
                                );
                            } else {
                                node.mesh.scale.copy(newWorldDimensions); // Fallback
                            }
                            node.mesh.updateMatrixWorld(true);
                        }
                    }
                });
            }
            space.emit('graph:nodes:transformed', { nodes: Array.from(selectedNodes), transformationType: 'scale' });
        }

        // Update Gizmo Position & Orientation
        if (selectedNodes.size > 0) {
            const center = new THREE.Vector3();
            selectedNodes.forEach((n) => center.add(n.position));
            center.divideScalar(selectedNodes.size);
            uiManager.gizmo.position.copy(center);

            if (selectedNodes.size === 1) {
                const node = selectedNodes.values().next().value;
                if (node.mesh) uiManager.gizmo.quaternion.copy(node.mesh.getWorldQuaternion(new THREE.Quaternion()));
                else uiManager.gizmo.quaternion.identity();
            } else {
                if (gizmoInfo.type === 'rotate' || gizmoInfo.type === 'scale') {
                    if (uiManager.multiSelectionHelper)
                        uiManager.gizmo.quaternion.copy(uiManager.multiSelectionHelper.quaternion);
                } else {
                    uiManager.gizmo.quaternion.identity();
                }
            }
        }
        if (camera) uiManager.gizmo.updateScale(camera);
    }
}
