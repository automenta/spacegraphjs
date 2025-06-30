import * as THREE from 'three';
// Assuming NodePlugin is accessible via space.plugins.getPlugin
// Adjust paths as necessary for HtmlNode, TransformGizmo, etc.

export class UITargetIdentifier {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.space = uiManager.space;
    }

    /**
     * Determines what object or UI element is under the pointer.
     * Prioritizes HTML elements, then Gizmo handles, then other graph objects.
     * @param {MouseEvent|PointerEvent} event The pointer event.
     * @returns {object} Information about the target.
     */
    getTargetInfo(event) {
        const { uiManager, space } = this;
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const nodeElement = element?.closest('.node-common');
        const nodeControlsButton = element?.closest('.node-controls button');
        const contentEditableEl = element?.closest('[contenteditable="true"]');
        const interactiveEl = element?.closest('button, input, textarea, select, a, .clickable');

        let graphNode = nodeElement
            ? space.plugins.getPlugin('NodePlugin')?.getNodeById(nodeElement.dataset.nodeId)
            : null;
        let intersectedEdge = null;
        let metaframeHandleInfo = null;
        let gizmoHandleInfo = null;
        let fractalElementInfo = null;
        let selectionScaleHandleInfo = null;

        if (!nodeControlsButton && !contentEditableEl && !interactiveEl) {
            const camera = space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
            if (camera) {
                const raycaster = new THREE.Raycaster();
                const pointerNDC = space.getPointerNDC(event.clientX, event.clientY);
                raycaster.setFromCamera(pointerNDC, camera);
                let closestHit = null;

                // 1. Main Gizmo
                if (uiManager.gizmo && uiManager.gizmo.visible) {
                    const gizmoIntersects = raycaster.intersectObjects(uiManager.gizmo.handles.children, true);
                    if (gizmoIntersects.length > 0 && gizmoIntersects[0].object.userData?.isGizmoHandle) {
                        if (!closestHit || gizmoIntersects[0].distance < closestHit.distance) {
                            closestHit = {
                                type: 'gizmo',
                                info: {
                                    ...gizmoIntersects[0].object.userData,
                                    object: gizmoIntersects[0].object,
                                    distance: gizmoIntersects[0].distance,
                                },
                                distance: gizmoIntersects[0].distance,
                            };
                        }
                    }
                }

                // 2. Fractal UI
                const fractalChecks = [
                    { group: uiManager.adaptiveGeometricHub, typePrefix: 'agh', specificType: 'agh' }, // AGH itself
                    { group: uiManager.fractalAxisManipulators, typePrefix: 'translate_axis' },
                    { group: uiManager.fractalRotationManipulators, typePrefix: 'rotate_axis' },
                    { group: uiManager.fractalScaleManipulators, typePrefix: 'scale_' }, // Catches scale_axis and scale_uniform
                ];

                for (const check of fractalChecks) {
                    if (check.group && check.group.visible) {
                        const intersects = raycaster.intersectObjects(check.group.children, true);
                        const validIntersect = intersects.find(
                            (i) =>
                                i.object.userData.isFractalUIElement &&
                                (check.specificType
                                    ? i.object.userData.type === check.specificType
                                    : i.object.userData.type?.startsWith(check.typePrefix))
                        );
                        if (validIntersect && (!closestHit || validIntersect.distance < closestHit.distance)) {
                            closestHit = {
                                type: 'fractal',
                                info: {
                                    ...validIntersect.object.userData,
                                    object: validIntersect.object,
                                    distance: validIntersect.distance,
                                },
                                distance: validIntersect.distance,
                            };
                        }
                    }
                }
                // Check AGH separately if it's a single object and not a group
                if (
                    uiManager.adaptiveGeometricHub &&
                    uiManager.adaptiveGeometricHub.visible &&
                    uiManager.adaptiveGeometricHub.userData.isFractalUIElement
                ) {
                    const aghIntersect = raycaster.intersectObject(uiManager.adaptiveGeometricHub, false);
                    if (aghIntersect.length > 0) {
                        if (!closestHit || aghIntersect[0].distance < closestHit.distance) {
                            closestHit = {
                                type: 'fractal',
                                info: {
                                    ...aghIntersect[0].object.userData,
                                    object: aghIntersect[0].object,
                                    distance: aghIntersect[0].distance,
                                },
                                distance: aghIntersect[0].distance,
                            };
                        }
                    }
                }

                // 3. Selection Scale Handles
                if (uiManager.selectionScaleHandlesGroup && uiManager.selectionScaleHandlesGroup.visible) {
                    const handleIntersects = raycaster.intersectObjects(uiManager.selectionScaleHandles, false);
                    if (handleIntersects.length > 0 && handleIntersects[0].object.userData.isSelectionScaleHandle) {
                        if (!closestHit || handleIntersects[0].distance < closestHit.distance) {
                            closestHit = {
                                type: 'selectionScaleHandle',
                                info: {
                                    ...handleIntersects[0].object.userData,
                                    handle: handleIntersects[0].object,
                                    distance: handleIntersects[0].distance,
                                },
                                distance: handleIntersects[0].distance,
                            };
                        }
                    }
                }

                if (closestHit) {
                    if (closestHit.type === 'gizmo') gizmoHandleInfo = closestHit.info;
                    else if (closestHit.type === 'fractal') fractalElementInfo = closestHit.info;
                    else if (closestHit.type === 'selectionScaleHandle') selectionScaleHandleInfo = closestHit.info;
                }

                // 4. Graph Elements (if no UI controls hit closer)
                if (!gizmoHandleInfo && !fractalElementInfo && !selectionScaleHandleInfo) {
                    const generalIntersect = space.intersectedObjects(event.clientX, event.clientY);
                    if (generalIntersect) {
                        const { object, node: resolvedNode, edge: resolvedEdge } = generalIntersect;
                        if (resolvedNode) graphNode = resolvedNode;
                        if (resolvedEdge) intersectedEdge = resolvedEdge;

                        if (object?.name && graphNode && graphNode.metaframe?.isVisible) {
                            if (object.name.startsWith('resizeHandle-')) {
                                metaframeHandleInfo = {
                                    type: object.name.substring('resizeHandle-'.length),
                                    object,
                                    node: graphNode,
                                };
                            } else if (object.name === 'dragHandle') {
                                metaframeHandleInfo = { type: 'dragHandle', object, node: graphNode };
                            }
                        }
                    }
                }
            }
        }

        return {
            element,
            nodeElement,
            nodeControls: nodeControlsButton,
            contentEditable: contentEditableEl,
            interactiveElement: interactiveEl,
            node: graphNode,
            intersectedEdge,
            metaframeHandleInfo,
            gizmoHandleInfo,
            fractalElementInfo,
            selectionScaleHandleInfo,
        };
    }
}
