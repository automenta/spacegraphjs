// js/ui/LinkingManager.js
import * as THREE from 'three';
import { BaseNode, Edge } from '../../spacegraph.js'; // Adjust path as necessary

export class LinkingManager {
    constructor(spaceGraph, uiManagerFacade) {
        this.spaceGraph = spaceGraph;
        this.uiManager = uiManagerFacade; // The main UIManager facade
        this.container = spaceGraph.container; // For classList additions if needed

        this._isLinking = false;
        this._linkSourceNode = null;
        this._linkSourcePortInfo = null; // { name, type ('input'/'output'), element }
        this._tempLinkLine = null;
        this._linkingTargetPortElement = null; // Store the currently highlighted target port element
    }

    bindEvents() {
        // No direct DOM events bound here; operations are triggered by other managers (PointerInputHandler, ContextMenuManager)
    }

    dispose() {
        this._removeTempLinkLine();
        this._linkSourceNode = null;
        this._linkSourcePortInfo = null;
        this._linkingTargetPortElement = null;
        // console.log("LinkingManager disposed.");
    }

    isLinking() {
        return this._isLinking;
    }

    startLinking(sourceNode, sourcePortElement = null) {
        // Logic from UIManager._startLinking
        if (!sourceNode) return;
        this._isLinking = true;
        this._linkSourceNode = sourceNode;

        if (sourcePortElement) {
            this._linkSourcePortInfo = {
                name: sourcePortElement.dataset.portName,
                type: sourcePortElement.dataset.portType,
                element: sourcePortElement,
            };
            // Optional: Add class to source port for visual feedback
            // sourcePortElement.classList.add('linking-source-port-active');
        } else {
            this._linkSourcePortInfo = null;
        }
        this.container.style.cursor = 'crosshair';
        this._createTempLinkLine(sourceNode);
    }

    _createTempLinkLine(sourceNode) {
        // Logic from UIManager._createTempLinkLine
        this._removeTempLinkLine();

        const startPos = sourceNode.position.clone();
        // TODO: If this._linkSourcePortInfo.element is available, adjust startPos to the port's actual 3D position.
        // This would require getting the port's world position, which might be complex for CSS3D elements.
        // For now, starts from node center.

        const material = new THREE.LineDashedMaterial({
            color: 0xffaa00,
            linewidth: 2,
            dashSize: 8,
            gapSize: 4,
            transparent: true,
            opacity: 0.9,
            depthTest: false,
        });
        const points = [startPos.clone(), startPos.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        this._tempLinkLine = new THREE.Line(geometry, material);
        this._tempLinkLine.computeLineDistances();
        this._tempLinkLine.renderOrder = 1;
        this.spaceGraph.scene.add(this._tempLinkLine);
    }

    updateTempLinkLine(screenX, screenY) {
        // Logic from UIManager._updateTempLinkLine
        if (!this._tempLinkLine || !this._linkSourceNode) return;

        const targetPos = this.spaceGraph.screenToWorld(screenX, screenY, this._linkSourceNode.position.z);
        if (targetPos) {
            const positions = this._tempLinkLine.geometry.attributes.position;
            positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z);
            positions.needsUpdate = true;
            this._tempLinkLine.geometry.computeBoundingSphere();
            this._tempLinkLine.computeLineDistances();
        }
    }

    _removeTempLinkLine() {
        // Logic from UIManager._removeTempLinkLine
        if (this._tempLinkLine) {
            this._tempLinkLine.geometry?.dispose();
            this._tempLinkLine.material?.dispose();
            this.spaceGraph.scene.remove(this._tempLinkLine);
            this._tempLinkLine = null;
        }
    }

    updateLinkingTargetHighlight(event) {
        // New method to handle highlighting potential targets during linking (called by PointerInputHandler on pointermove)
        if (!this.isLinking()) return;

        this.clearLinkingTargetHighlight(); // Clear previous highlights

        // Get target info via UIManager facade (which uses PointerInputHandler)
        const targetInfo = this.uiManager.getTargetInfoForLink(event);
        const targetNode = targetInfo.node;
        const targetPortElement = targetInfo.portElement; // `portElement` was added to `_getTargetInfo` result

        if (targetPortElement && targetNode && targetNode !== this._linkSourceNode) {
            const sourcePortType = this._linkSourcePortInfo?.type;
            const targetPortType = targetPortElement.dataset.portType;
            // Basic validation: output to input or vice-versa
            if (sourcePortType && targetPortType && sourcePortType !== targetPortType) {
                targetPortElement.classList.add('linking-target-port');
                this._linkingTargetPortElement = targetPortElement; // Store for cleanup
                if (targetNode.htmlElement) targetNode.htmlElement.classList.add('linking-target');
            }
        } else if (
            targetNode &&
            targetNode !== this._linkSourceNode &&
            targetNode.htmlElement &&
            !this._linkSourcePortInfo
        ) {
            // Highlight node if it's a valid target for node-to-node linking (no source port)
            targetNode.htmlElement.classList.add('linking-target');
        }
    }

    clearLinkingTargetHighlight() {
        if (this._linkingTargetPortElement) {
            this._linkingTargetPortElement.classList.remove('linking-target-port');
            this._linkingTargetPortElement = null;
        }
        // Use querySelectorAll from spaceGraph's utils or a local helper if needed
        this.spaceGraph.container
            .querySelectorAll('.node-html.linking-target')
            .forEach((el) => el.classList.remove('linking-target'));
    }

    completeLinking(event) {
        // Logic from UIManager._completeLinking
        this._removeTempLinkLine();
        // Get target info via UIManager facade
        const targetInfo = this.uiManager.getTargetInfoForLink(event);
        const sourceNode = this._linkSourceNode;
        const targetNode = targetInfo.node;
        const sourcePortInfo = this._linkSourcePortInfo;
        // `targetInfo.portElement` is the specific HTML element for the port, if any
        const targetPortElement = targetInfo.portElement;
        let edgeData = {};

        if (sourceNode && targetNode && targetNode !== sourceNode) {
            if (sourcePortInfo && targetPortElement) {
                const targetPortType = targetPortElement.dataset.portType;
                if (sourcePortInfo.type && targetPortType && sourcePortInfo.type !== targetPortType) {
                    edgeData = {
                        sourcePort: sourcePortInfo.name,
                        targetPort: targetPortElement.dataset.portName,
                    };
                    this.spaceGraph.addEdge(sourceNode, targetNode, edgeData);
                } else {
                    console.warn(
                        'Link rejected: Cannot connect port of type',
                        sourcePortInfo.type,
                        'to port of type',
                        targetPortType
                    );
                }
            } else if (!sourcePortInfo && !targetPortElement) {
                // Node-to-node
                this.spaceGraph.addEdge(sourceNode, targetNode, {});
            } else {
                console.warn('Link rejected: Mixed port/node connection not directly handled by default.');
            }
        }
        this.cancelLinking();
    }

    cancelLinking() {
        // Logic from UIManager.cancelLinking
        this._removeTempLinkLine();
        this.clearLinkingTargetHighlight();

        // Optional: remove class from source port if one was added
        // if (this._linkSourcePortInfo?.element) {
        //    this._linkSourcePortInfo.element.classList.remove('linking-source-port-active');
        // }

        this._isLinking = false;
        this._linkSourceNode = null;
        this._linkSourcePortInfo = null;
        this.container.style.cursor = 'grab';
    }
}
