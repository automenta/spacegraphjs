import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

export class Metaframe {
    node = null;
    space = null;
    webglScene = null;
    cssScene = null;

    // Three.js objects for the metaframe border and handles
    borderMesh = null;
    resizeHandles = {}; // e.g., { 'topLeft': Mesh, 'bottomRight': Mesh }
    dragHandle = null;
    _originalHandleMaterials = new Map(); // To store original material properties for hover reset
    _handleDefaultOpacity = 0.7; // Default opacity for handles
    _handleHoverOpacity = 1.0;
    _handleHoverScale = 1.2;


    // CSS3DObject for control buttons
    controlButtons = null; // This will be a CSS3DObject containing a div with buttons
    handleTooltips = {}; // Stores CSS3DObjects for handle tooltips: { 'topLeft': CSS3DObject, ... }

    isVisible = false;

    constructor(node, space, webglScene, cssScene) {
        this.node = node;
        this.space = space;
        this.webglScene = webglScene;
        this.cssScene = cssScene;

        this._createVisualElements();
        this._createControlButtons();
        this.hide(); // Start hidden
    }

    _createVisualElements() {
        // Create a simple wireframe box for the border
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const edges = new THREE.EdgesGeometry(geometry);
        this.borderMesh = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00ffff, depthTest: false }));
        this.borderMesh.renderOrder = 999; // Render on top
        this.webglScene.add(this.borderMesh);

        // Create resize handles
        const handleGeometry = new THREE.SphereGeometry(5, 16, 16); // Increased segments for smoother sphere
        const handleMaterialTemplate = new THREE.MeshBasicMaterial({
            color: 0xff00ff, // Changed color for better visibility
            transparent: true,
            opacity: this._handleDefaultOpacity,
            depthTest: false
        });

        const handlePositions = {
            topLeft: new THREE.Vector3(-0.5, 0.5, 0),
            topRight: new THREE.Vector3(0.5, 0.5, 0),
            bottomLeft: new THREE.Vector3(-0.5, -0.5, 0),
            bottomRight: new THREE.Vector3(0.5, -0.5, 0),
        };

        for (const key in handlePositions) {
            const handleMaterial = handleMaterialTemplate.clone();
            const handle = new THREE.Mesh(handleGeometry, handleMaterial);
            handle.name = `resizeHandle-${key}`;
            handle.userData.handleType = key;
            handle.renderOrder = 1000; // Ensure handles render on top of border
            this.resizeHandles[key] = handle;
            this._originalHandleMaterials.set(handle, {
                color: handleMaterial.color.clone(),
                opacity: handleMaterial.opacity,
                scale: handle.scale.clone()
            });
            this.webglScene.add(handle);
            this.handleTooltips[key] = this._createTooltipElement();
            this.cssScene.add(this.handleTooltips[key]);
        }

        // Create a drag handle (e.g., a small rectangle at the top center)
        const dragHandleGeometry = new THREE.PlaneGeometry(60, 12); // Slightly larger
        const dragHandleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00cc00, // Darker green
            transparent: true,
            opacity: this._handleDefaultOpacity,
            side: THREE.DoubleSide,
            depthTest: false
        });
        this.dragHandle = new THREE.Mesh(dragHandleGeometry, dragHandleMaterial);
        this.dragHandle.name = 'dragHandle';
        this.dragHandle.userData.handleType = 'drag';
        this.dragHandle.renderOrder = 1000; // Ensure drag handle renders on top
        this._originalHandleMaterials.set(this.dragHandle, {
            color: dragHandleMaterial.color.clone(),
            opacity: dragHandleMaterial.opacity,
            scale: this.dragHandle.scale.clone()
        });
        this.webglScene.add(this.dragHandle);
        this.handleTooltips['dragHandle'] = this._createTooltipElement();
        this.cssScene.add(this.handleTooltips['dragHandle']);
    }

    _createTooltipElement() {
        const div = document.createElement('div');
        div.className = 'metaframe-handle-tooltip';
        div.style.cssText = `
            position: absolute;
            background-color: rgba(0,0,0,0.8);
            color: white;
            padding: 3px 7px;
            border-radius: 3px;
            font-size: 11px;
            white-space: nowrap;
            pointer-events: none; /* Tooltip should not intercept pointer events */
            visibility: hidden; /* Start hidden */
            transition: opacity 0.1s;
            opacity: 0;
        `;
        // div.textContent will be set dynamically
        const tooltipObject = new CSS3DObject(div);
        tooltipObject.userData.isTooltip = true; // For easier identification if needed
        return tooltipObject;
    }

    highlightHandle(handleOrType, highlightState) {
        let handleInstance = null;
        if (typeof handleOrType === 'string') {
            if (handleOrType === 'dragHandle') {
                handleInstance = this.dragHandle;
            } else {
                handleInstance = this.resizeHandles[handleOrType];
            }
        } else {
            handleInstance = handleOrType; // Assuming it's a direct mesh instance
        }

        if (!handleInstance || !handleInstance.material) return;

        const originalProps = this._originalHandleMaterials.get(handleInstance);
        if (!originalProps) return;

        if (highlightState) {
            // handleInstance.material.color.setHex(0xffff00); // Example: Yellow highlight color
            handleInstance.material.opacity = this._handleHoverOpacity;
            handleInstance.scale.copy(originalProps.scale).multiplyScalar(this._handleHoverScale);
        } else {
            // handleInstance.material.color.copy(originalProps.color);
            handleInstance.material.opacity = originalProps.opacity;
            handleInstance.scale.copy(originalProps.scale);
        }
    }

    _createControlButtons() {
        const container = document.createElement('div');
        container.className = 'metaframe-controls';
        container.style.cssText = `
            position: absolute;
            top: -30px; /* Position above the node */
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 5px;
            background: rgba(0,0,0,0.7);
            padding: 5px;
            border-radius: 5px;
            pointer-events: auto; /* Allow interaction */
        `;

        const createButton = (text, action, onClick) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.classList.add('metaframe-button', `metaframe-button-${action}`);
            // Styles will be primarily from src/index.css via .metaframe-controls button
            // and .metaframe-button class.
            button.onclick = onClick;

            // Add title attribute for tooltip
            switch (action) {
                case 'edit-properties': // Changed from 'edit' to be more specific
                    button.title = 'Edit node properties';
                    break;
                case 'link':
                    button.title = 'Create a link from this node';
                    break;
                case 'delete':
                    button.title = 'Delete this node';
                    break;
                case 'content-zoom-in':
                    button.title = 'Zoom in content';
                    break;
                case 'content-zoom-out':
                    button.title = 'Zoom out content';
                    break;
                case 'toggle-content-edit':
                    button.title = 'Toggle content edit mode';
                    break;
            }
            return button;
        };

        // Clear existing buttons
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        const capabilities = this.node.getCapabilities();

        if (capabilities.canEditProperties) {
            let editText = 'Edit';
            container.appendChild(createButton(editText, 'edit-properties', () => this.space.emit('metaframe:editNode', { node: this.node })));
        }

        if (capabilities.canEditContent) {
            container.appendChild(createButton('Edit Content', 'toggle-content-edit', () => this.space.emit('metaframe:toggleNodeContentEditable', { node: this.node })));
        }

        if (capabilities.canZoomContent) {
            container.appendChild(createButton('Zoom In', 'content-zoom-in', () => this.space.emit('ui:request:adjustContentScale', { node: this.node, factor: 1.15 })));
            container.appendChild(createButton('Zoom Out', 'content-zoom-out', () => this.space.emit('ui:request:adjustContentScale', { node: this.node, factor: 1 / 1.15 })));
        }

        if (capabilities.canLink) {
            container.appendChild(createButton('Link', 'link', () => this.space.emit('metaframe:linkNode', { node: this.node })));
        }

        if (capabilities.canDelete) {
            container.appendChild(createButton('Delete', 'delete', () => this.space.emit('metaframe:deleteNode', { node: this.node })));
        }

        this.controlButtons = new CSS3DObject(container);
        this.cssScene.add(this.controlButtons);
    }

    refreshButtons() {
        if (this.controlButtons && this.controlButtons.element) {
             // Check if parentElement exists before trying to remove from cssScene
            if (this.controlButtons.element.parentElement) {
                 this.cssScene.remove(this.controlButtons);
            }
            this.controlButtons.element.remove(); // Remove old HTML element from wherever it was attached
            this.controlButtons = null;           // Clear reference
        }
        this._createControlButtons(); // This creates a new this.controlButtons and adds it to cssScene

        // If the metaframe is currently visible, we might need to ensure its position is updated.
        // The update() method handles positioning of controlButtons.
        // However, _createControlButtons itself adds to cssScene.
        // If the metaframe is visible, calling update() ensures correct placement.
        if (this.isVisible) {
            this.update();
        }
    }

    update() {
        if (!this.isVisible) return;

        // Update position and scale of border mesh
        const nodeScale = this.node.mesh?.scale || new THREE.Vector3(1, 1, 1);
        const nodeRadius = this.node.getBoundingSphereRadius(); // Assuming this gives a reasonable size
        const size = nodeRadius * 2; // Approximate size based on radius

        this.borderMesh.position.copy(this.node.position);
        this.borderMesh.scale.set(size * nodeScale.x, size * nodeScale.y, size * nodeScale.z);

        // Update position of resize handles
        const halfSizeX = (size * nodeScale.x) / 2;
        const halfSizeY = (size * nodeScale.y) / 2;

        this.resizeHandles.topLeft.position.set(
            this.node.position.x - halfSizeX,
            this.node.position.y + halfSizeY,
            this.node.position.z
        );
        this.resizeHandles.topRight.position.set(
            this.node.position.x + halfSizeX,
            this.node.position.y + halfSizeY,
            this.node.position.z
        );
        this.resizeHandles.bottomLeft.position.set(
            this.node.position.x - halfSizeX,
            this.node.position.y - halfSizeY,
            this.node.position.z
        );
        this.resizeHandles.bottomRight.position.set(
            this.node.position.x + halfSizeX,
            this.node.position.y - halfSizeY,
            this.node.position.z
        );

        // Update position of drag handle
        this.dragHandle.position.set(this.node.position.x, this.node.position.y + halfSizeY + 15, this.node.position.z); // 15 units above the top edge

        // Update position of control buttons
        this.controlButtons.position.copy(this.node.position);
        // Adjust Y position to be above the node
        this.controlButtons.position.y += halfSizeY + 40; // Position relative to actual top edge + offset

        // Update position of tooltips
        const tooltipOffset = new THREE.Vector3(0, 15, 0); // Offset tooltips above handles
        for (const key in this.resizeHandles) {
            if (this.handleTooltips[key] && this.resizeHandles[key]) {
                this.handleTooltips[key].position.copy(this.resizeHandles[key].position).add(tooltipOffset);
            }
        }
        if (this.handleTooltips.dragHandle && this.dragHandle) {
            this.handleTooltips.dragHandle.position.copy(this.dragHandle.position).add(tooltipOffset);
        }
    }

    show() {
        if (this.isVisible) return;
        this.borderMesh.visible = true;
        this.controlButtons.visible = true;
        this.dragHandle.visible = true;
        for (const key in this.resizeHandles) {
            this.resizeHandles[key].visible = true;
        }
        this.isVisible = true;
        this.update(); // Ensure it's positioned correctly on show
        // Tooltip visibility is primarily controlled by UIManager on hover
    }

    hide() {
        if (!this.isVisible) return;
        this.borderMesh.visible = false;
        this.controlButtons.visible = false;
        this.dragHandle.visible = false;
        for (const key in this.resizeHandles) {
            this.resizeHandles[key].visible = false;
        }
        // Hide all tooltips when metaframe is hidden
        for (const key in this.handleTooltips) {
            this.setHandleTooltip(key, '', false);
        }
        this.isVisible = false;
    }

    setHandleTooltip(handleType, text, visible) {
        const tooltip = this.handleTooltips[handleType];
        if (tooltip && tooltip.element) {
            tooltip.element.textContent = text;
            tooltip.element.style.visibility = visible ? 'visible' : 'hidden';
            tooltip.element.style.opacity = visible ? '1' : '0';
            if (visible) { // Ensure position is updated when shown
                const handleMesh = handleType === 'dragHandle' ? this.dragHandle : this.resizeHandles[handleType];
                if (handleMesh) {
                    const tooltipOffset = new THREE.Vector3(0, 15, 0); // Consistent with update()
                    tooltip.position.copy(handleMesh.position).add(tooltipOffset);
                }
            }
        }
    }

    dispose() {
        this.webglScene.remove(this.borderMesh);
        this.borderMesh.geometry.dispose();
        this.borderMesh.material.dispose();
        this.borderMesh = null;

        this.cssScene.remove(this.controlButtons);
        this.controlButtons.element.remove();
        this.controlButtons = null;

        this.webglScene.remove(this.dragHandle);
        this.dragHandle.geometry.dispose();
        this.dragHandle.material.dispose();
        this.dragHandle = null;

        for (const key in this.resizeHandles) {
            const handle = this.resizeHandles[key];
            this.webglScene.remove(handle);
            handle.geometry.dispose();
            handle.material.dispose();
        }
        this.resizeHandles = {};

        for (const key in this.handleTooltips) {
            const tooltip = this.handleTooltips[key];
            this.cssScene.remove(tooltip);
            tooltip.element.remove();
        }
        this.handleTooltips = {};
        this._originalHandleMaterials.clear();

        this.node = null;
        this.space = null;
        this.webglScene = null;
        this.cssScene = null;
    }
}
