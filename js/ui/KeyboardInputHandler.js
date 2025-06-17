// js/ui/KeyboardInputHandler.js
import * as THREE from 'three'; // For THREE.Vector3 if used in navigation, though not directly in current _navigateNodesWithArrows
import { BaseNode, HtmlNodeElement, NoteNode, Edge } from '../../spacegraph.js'; // Adjust path as necessary

export class KeyboardInputHandler {
    constructor(spaceGraph, uiManagerFacade) {
        this.spaceGraph = spaceGraph;
        this.uiManager = uiManagerFacade; // The main UIManager
    }

    bindEvents() {
        window.addEventListener('keydown', this.handleKeyDown.bind(this), false);
    }

    dispose() {
        window.removeEventListener('keydown', this.handleKeyDown.bind(this));
        // console.log("KeyboardInputHandler disposed.");
    }

    handleKeyDown(event) {
        // Logic from UIManager._onKeyDown
        const activeEl = document.activeElement;
        const isEditing =
            activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
        if (isEditing && event.key !== 'Escape') return;

        const { selectedNode, selectedEdge } = this.spaceGraph;
        let handled = false;

        switch (event.key) {
            case 'Delete':
            case 'Backspace':
                if (selectedNode) {
                    this.uiManager.showConfirmDialog(`Delete node "${selectedNode.id.substring(0, 10)}..."?`, () =>
                        this.spaceGraph.removeNode(selectedNode.id)
                    );
                    handled = true;
                } else if (selectedEdge) {
                    this.uiManager.showConfirmDialog(`Delete edge "${selectedEdge.id.substring(0, 10)}..."?`, () =>
                        this.spaceGraph.removeEdge(selectedEdge.id)
                    );
                    handled = true;
                }
                break;
            case 'Escape':
                // Escape logic will be coordinated by UIManager facade, checking various states
                if (this.uiManager.handleEscape()) {
                    // Delegate to a method on UIManager facade
                    handled = true;
                }
                break;
            case 'Enter':
                if (selectedNode instanceof NoteNode) {
                    // NoteNode specific
                    selectedNode.htmlElement?.querySelector('.node-content')?.focus();
                    handled = true;
                }
                break;
            case '+':
            case '=':
                if (selectedNode instanceof HtmlNodeElement) {
                    event.ctrlKey || event.metaKey
                        ? selectedNode.adjustNodeSize(1.2)
                        : selectedNode.adjustContentScale(1.15);
                    handled = true;
                }
                break;
            case '-':
            case '_':
                if (selectedNode instanceof HtmlNodeElement) {
                    event.ctrlKey || event.metaKey
                        ? selectedNode.adjustNodeSize(0.8)
                        : selectedNode.adjustContentScale(1 / 1.15);
                    handled = true;
                }
                break;
            case ' ': // Space bar
                if (selectedNode) {
                    this.spaceGraph.focusOnNode(selectedNode, 0.5, true);
                    handled = true;
                } else if (selectedEdge) {
                    const midPoint = new THREE.Vector3().lerpVectors(
                        selectedEdge.source.position,
                        selectedEdge.target.position,
                        0.5
                    );
                    const dist = selectedEdge.source.position.distanceTo(selectedEdge.target.position);
                    this.spaceGraph.cameraController?.pushState();
                    this.spaceGraph.cameraController?.moveTo(
                        midPoint.x,
                        midPoint.y,
                        midPoint.z + dist * 0.6 + 100,
                        0.5,
                        midPoint
                    );
                    handled = true;
                } else {
                    this.spaceGraph.centerView();
                    handled = true;
                }
                break;
            case 'Tab': {
                event.preventDefault();
                const nodes = Array.from(this.spaceGraph.nodes.values()).sort((a, b) => a.id.localeCompare(b.id));
                if (nodes.length === 0) break;
                let currentIndex = selectedNode ? nodes.findIndex((n) => n === selectedNode) : -1;
                let nextIndex = event.shiftKey
                    ? currentIndex > 0
                        ? currentIndex - 1
                        : nodes.length - 1
                    : currentIndex < nodes.length - 1
                      ? currentIndex + 1
                      : 0;
                if (nodes[nextIndex]) {
                    this.spaceGraph.setSelectedNode(nodes[nextIndex]);
                    this.spaceGraph.focusOnNode(nodes[nextIndex], 0.3, true);
                }
                handled = true;
                break;
            }
            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                event.preventDefault();
                this._navigateNodesWithArrows(event.key);
                handled = true;
                break;
        }
        if (handled) event.preventDefault();
    }

    _navigateNodesWithArrows(key) {
        // Logic from UIManager._navigateNodesWithArrows
        let currentNode = this.spaceGraph.selectedNode;
        const allGraphNodes = Array.from(this.spaceGraph.nodes.values());

        if (!currentNode) {
            if (allGraphNodes.length > 0) {
                allGraphNodes.sort((a, b) => a.id.localeCompare(b.id)); // Ensure consistent starting point
                currentNode = allGraphNodes[0];
                this.spaceGraph.setSelectedNode(currentNode);
                this.spaceGraph.focusOnNode(currentNode, 0.3, true);
                return;
            }
            return;
        }

        const directionVector = new THREE.Vector3();
        if (key === 'ArrowUp') directionVector.set(0, 1, 0);
        else if (key === 'ArrowDown') directionVector.set(0, -1, 0);
        else if (key === 'ArrowLeft') directionVector.set(-1, 0, 0);
        else if (key === 'ArrowRight') directionVector.set(1, 0, 0);

        let bestCandidateNode = null;
        let minScore = Infinity;
        const currentPosition = currentNode.position;
        const vectorToOther = new THREE.Vector3();

        for (const otherNode of allGraphNodes) {
            if (otherNode === currentNode) continue;

            vectorToOther.subVectors(otherNode.position, currentPosition);
            const distance = vectorToOther.length();
            if (distance === 0) continue;

            const normalizedVectorToOther = vectorToOther.clone().normalize();
            const dotProduct = normalizedVectorToOther.dot(directionVector);

            if (dotProduct > 0.3) {
                // Prefer nodes generally in the arrow key's direction
                const score = distance * (1.5 - dotProduct); // Prioritize alignment and proximity
                if (score < minScore) {
                    minScore = score;
                    bestCandidateNode = otherNode;
                }
            }
        }

        if (bestCandidateNode) {
            this.spaceGraph.setSelectedNode(bestCandidateNode);
            this.spaceGraph.focusOnNode(bestCandidateNode, 0.3, true);
        }
    }
}
