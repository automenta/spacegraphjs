// js/ui/EdgeMenuManager.js
import * as THREE from 'three'; // For CSS3DObject, Vector3
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'; // Explicit import
import { Edge } from '../../spacegraph.js'; // Adjust path as necessary

export class EdgeMenuManager {
    constructor(spaceGraph, uiManagerFacade) {
        this.spaceGraph = spaceGraph;
        this.uiManager = uiManagerFacade; // The main UIManager facade
        this._edgeMenuObject = null; // The CSS3DObject for the menu
    }

    bindEvents() {
        // No direct DOM events bound here; operations are triggered by UIManager facade
        // (e.g., when an edge is selected/deselected).
        // The UIManager facade's _onDocumentClick will also call this.hideEdgeMenuIfNeeded().
    }

    dispose() {
        this.hideEdgeMenu(); // Ensure menu is removed
        // console.log("EdgeMenuManager disposed.");
    }

    showEdgeMenu(edge) {
        // Logic from UIManager.showEdgeMenu
        if (!edge || !(edge instanceof Edge)) {
            console.warn("EdgeMenuManager.showEdgeMenu: Invalid edge provided.", edge);
            return;
        }
        if (this._edgeMenuObject) this.hideEdgeMenu(); // Hide any existing menu

        const menuElement = document.createElement('div');
        menuElement.className = 'edge-menu-frame'; // For CSS styling
        menuElement.dataset.edgeId = edge.id;
        menuElement.innerHTML = `
          <button title="Change Color (NYI)" data-action="color">🎨</button>
          <button title="Adjust Thickness (NYI)" data-action="thickness">➖</button>
          <button title="Change Style (NYI)" data-action="style">〰️</button>
          <button title="Edit Constraint (NYI)" data-action="constraint">🔗</button>
          <button title="Delete Edge" class="delete" data-action="delete">×</button>
        `;

        menuElement.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            e.stopPropagation();
            const action = button.dataset.action;
            switch (action) {
                case 'delete':
                    // Delegate to UIManager facade for confirm dialog
                    this.uiManager.showConfirmDialog(`Delete edge "${edge.id.substring(0,10)}..."?`, () => this.spaceGraph.removeEdge(edge.id));
                    break;
                case 'color': case 'thickness': case 'style': case 'constraint':
                    // Delegate to UIManager facade for status message
                    this.uiManager.showStatus(`Action '${action}' for edge ${edge.id} is not yet implemented.`, 'info');
                    break;
                default: console.warn("Unknown edge menu action:", action);
            }
        });

        // Prevent graph interactions when interacting with the menu
        menuElement.addEventListener('pointerdown', e => e.stopPropagation());
        menuElement.addEventListener('wheel', e => e.stopPropagation());

        this._edgeMenuObject = new CSS3DObject(menuElement);
        this.spaceGraph.cssScene.add(this._edgeMenuObject);
        this.updateEdgeMenuPosition();
    }

    hideEdgeMenu() {
        // Logic from UIManager.hideEdgeMenu
        if (this._edgeMenuObject) {
            this._edgeMenuObject.element?.remove(); // Remove HTML element from DOM
            this._edgeMenuObject.parent?.remove(this._edgeMenuObject); // Remove CSS3DObject from scene
            this._edgeMenuObject = null;
        }
    }

    // Called by UIManager facade's _onDocumentClick or when edge selection changes
    hideEdgeMenuIfNeeded(event) {
        if (this._edgeMenuObject && this._edgeMenuObject.element && event && !this._edgeMenuObject.element.contains(event.target)) {
            // Check if the click was outside the menu AND not on the currently selected edge itself
            const targetInfo = this.uiManager.getTargetInfoForMenu(event); // Re-evaluate target
            if (this.spaceGraph.selectedEdge && this.spaceGraph.selectedEdge !== targetInfo.intersectedEdge) {
                this.spaceGraph.setSelectedEdge(null); // This will trigger hideEdgeMenu via selection change logic
            } else if (!this.spaceGraph.selectedEdge) { // If no edge is selected anymore for other reasons
                 this.hideEdgeMenu();
            }
        } else if (!event && this._edgeMenuObject) { // Called without event, e.g. direct deselection
            this.hideEdgeMenu();
        }
    }


    updateEdgeMenuPosition() {
        // Logic from UIManager.updateEdgeMenuPosition
        if (!this._edgeMenuObject || !this.spaceGraph.selectedEdge) {
            // If called when selectedEdge is null (e.g. during deselection), ensure menu is hidden
            if (!this.spaceGraph.selectedEdge) this.hideEdgeMenu();
            return;
        }
        const edge = this.spaceGraph.selectedEdge;
        const midPoint = new THREE.Vector3().lerpVectors(edge.source.position, edge.target.position, 0.5);
        this._edgeMenuObject.position.copy(midPoint);
        if (this.spaceGraph._camera) {
             this._edgeMenuObject.quaternion.copy(this.spaceGraph._camera.quaternion); // Billboard
        }
    }

    // To be called by SpaceGraph's main animation loop if the menu is active
    // This ensures its position is updated if nodes are moving.
    update() {
        if (this._edgeMenuObject && this.spaceGraph.selectedEdge) {
            this.updateEdgeMenuPosition();
        }
    }
}
