import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

export class Metaframe {
    node = null;
    space = null;
    webglScene = null;
    cssScene = null;
    cameraPlugin = null; // To get camera for billboarding

    // Group to hold all WebGL elements of the metaframe for easier manipulation (e.g., billboarding)
    metaframeGroup = null;

    // Three.js objects for the metaframe border and handles (now children of metaframeGroup)
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
        this.cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');

        this.metaframeGroup = new THREE.Object3D();
        this.metaframeGroup.name = `metaframeGroup-${this.node.id}`;
        this.webglScene.add(this.metaframeGroup);

        this._createVisualElements();
        this._createControlButtons(); // CSS3D objects are added to cssScene, not metaframeGroup
        this.hide(); // Start hidden
    }

    _createVisualElements() {
        // Create a simple wireframe box for the border
        const geometry = new THREE.BoxGeometry(1, 1, 1); // Unit size, will be scaled
        const edges = new THREE.EdgesGeometry(geometry);
        this.borderMesh = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x00ffff, depthTest: false, transparent: true }) // Added transparent for consistency
        );
        this.borderMesh.renderOrder = 999; // Render on top
        this.metaframeGroup.add(this.borderMesh); // Add to group

        // Create resize handles
        const handleGeometry = new THREE.SphereGeometry(1, 16, 16); // Unit size, will be scaled by parent group and then individually
        const handleMaterialTemplate = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: this._handleDefaultOpacity,
            depthTest: false,
        });

        // Local positions for handles, assuming parent group scale handles overall size
        const handleLocalPositions = {
            topLeft: new THREE.Vector3(-0.5, 0.5, 0),
            topRight: new THREE.Vector3(0.5, 0.5, 0),
            bottomLeft: new THREE.Vector3(-0.5, -0.5, 0),
            bottomRight: new THREE.Vector3(0.5, -0.5, 0),
        };

        for (const key in handleLocalPositions) {
            const handleMaterial = handleMaterialTemplate.clone();
            const handle = new THREE.Mesh(handleGeometry, handleMaterial);
            handle.name = `resizeHandle-${key}`;
            handle.userData.handleType = key;
            handle.userData.ownerNode = this.node;
            handle.renderOrder = 1000;
            // Set local position, actual world position will be determined by metaframeGroup's transform
            handle.position.copy(handleLocalPositions[key]);
            this.resizeHandles[key] = handle;
            this._originalHandleMaterials.set(handle, {
                color: handleMaterial.color.clone(),
                opacity: handleMaterial.opacity,
                scale: handle.scale.clone(), // Store initial local scale (which will be 1,1,1 or based on geometry)
            });
            this.metaframeGroup.add(handle); // Add to group

            // Tooltips are CSS3DObjects, added to cssScene directly
            this.handleTooltips[key] = this._createTooltipElement();
            this.cssScene.add(this.handleTooltips[key]);
        }

        // Create a drag handle
        const dragHandleGeometry = new THREE.PlaneGeometry(12, 2.4); // Smaller, relative to typical handle size
        const dragHandleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00cc00,
            transparent: true,
            opacity: this._handleDefaultOpacity,
            side: THREE.DoubleSide,
            depthTest: false,
        });
        this.dragHandle = new THREE.Mesh(dragHandleGeometry, dragHandleMaterial);
        this.dragHandle.name = 'dragHandle';
        this.dragHandle.userData.handleType = 'drag';
        this.dragHandle.userData.ownerNode = this.node;
        this.dragHandle.renderOrder = 1000;
        // Local position for drag handle (e.g., top-center)
        // this.dragHandle.position.set(0, 0.5, 0); // Will be adjusted in update()
        this._originalHandleMaterials.set(this.dragHandle, {
            color: dragHandleMaterial.color.clone(),
            opacity: dragHandleMaterial.opacity,
            scale: this.dragHandle.scale.clone(),
        });
        this.metaframeGroup.add(this.dragHandle); // Add to group

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
            container.appendChild(
                createButton(editText, 'edit-properties', () =>
                    this.space.emit('metaframe:editNode', { node: this.node })
                )
            );
        }

        if (capabilities.canEditContent) {
            container.appendChild(
                createButton('Edit Content', 'toggle-content-edit', () =>
                    this.space.emit('metaframe:toggleNodeContentEditable', { node: this.node })
                )
            );
        }

        if (capabilities.canZoomContent) {
            container.appendChild(
                createButton('Zoom In', 'content-zoom-in', () =>
                    this.space.emit('ui:request:adjustContentScale', { node: this.node, factor: 1.15 })
                )
            );
            container.appendChild(
                createButton('Zoom Out', 'content-zoom-out', () =>
                    this.space.emit('ui:request:adjustContentScale', { node: this.node, factor: 1 / 1.15 })
                )
            );
        }

        if (capabilities.canLink) {
            container.appendChild(
                createButton('Link', 'link', () => this.space.emit('metaframe:linkNode', { node: this.node }))
            );
        }

        if (capabilities.canDelete) {
            container.appendChild(
                createButton('Delete', 'delete', () => this.space.emit('metaframe:deleteNode', { node: this.node }))
            );
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
            this.controlButtons = null; // Clear reference
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
        const actualSize = this.node.getActualSize();

        if (!actualSize || actualSize.x === 0 || actualSize.y === 0) {
            // Node might not have a mesh or valid size yet
            this.hide(); // Hide metaframe if node size can't be determined
            return;
        }

        // 1. Position the metaframeGroup at the node's world position
        this.metaframeGroup.position.copy(this.node.position);

        // 2. Orient the metaframeGroup (billboarding or node's orientation)
        const camera = this.cameraPlugin?.getCameraInstance();
        if (this.node.cssObject && camera) {
            // Billboarding for nodes with CSS content (e.g., HtmlNode).
            // The metaframeGroup's orientation matches the camera's orientation,
            // making its local XY plane parallel to the screen.
            this.metaframeGroup.quaternion.copy(camera.quaternion);
        } else if (this.node.mesh) {
            // For nodes with WebGL mesh content (e.g., ShapeNode),
            // align the metaframeGroup with the node's mesh orientation.
            this.node.mesh.getWorldQuaternion(this.metaframeGroup.quaternion);
        } else {
            // Default: No specific orientation, align with world axes.
            this.metaframeGroup.quaternion.identity();
        }

        // 3. Scale the border to match the node's actual size (local to metaframeGroup)
        this.borderMesh.scale.copy(actualSize);
        this.borderMesh.position.set(0, 0, 0); // Border is centered within the group

        // 4. Position and scale resize handles locally within the metaframeGroup
        const handleDesiredWorldSize = 10; // Target visual size for handles in world units
        const halfSizeX = actualSize.x / 2;
        const halfSizeY = actualSize.y / 2;

        // Set local scale of handles to achieve desired world size (since their geometry is unit size)
        // Their local position is at the corners of the 'actualSize' box.
        this.resizeHandles.topLeft.scale.set(handleDesiredWorldSize, handleDesiredWorldSize, handleDesiredWorldSize);
        this.resizeHandles.topLeft.position.set(-halfSizeX, halfSizeY, 0);

        this.resizeHandles.topRight.scale.set(handleDesiredWorldSize, handleDesiredWorldSize, handleDesiredWorldSize);
        this.resizeHandles.topRight.position.set(halfSizeX, halfSizeY, 0);

        this.resizeHandles.bottomLeft.scale.set(handleDesiredWorldSize, handleDesiredWorldSize, handleDesiredWorldSize);
        this.resizeHandles.bottomLeft.position.set(-halfSizeX, -halfSizeY, 0);

        this.resizeHandles.bottomRight.scale.set(
            handleDesiredWorldSize,
            handleDesiredWorldSize,
            handleDesiredWorldSize
        );
        this.resizeHandles.bottomRight.position.set(halfSizeX, -halfSizeY, 0);

        // 5. Position and scale drag handle locally
        if (this.dragHandle) {
            const dragHandleWorldWidth = 60;
            const dragHandleWorldHeight = 12;
            this.dragHandle.scale.set(dragHandleWorldWidth, dragHandleWorldHeight, 1); // Set to desired world size
            this.dragHandle.position.set(
                0, // Centered X locally
                halfSizeY + dragHandleWorldHeight / 2 + 5, // Positioned above the top edge, in local units
                0
            );
            this.dragHandle.visible = this.isVisible && (this.node.getCapabilities().canBeDragged ?? true);
        }

        // 6. Update visibility of resize handles based on node capabilities
        const canBeResized = this.node.getCapabilities().canBeResized ?? true;
        for (const key in this.resizeHandles) {
            if (this.resizeHandles[key]) {
                this.resizeHandles[key].visible = this.isVisible && canBeResized;
            }
        }

        // 7. Ensure the entire metaframeGroup is visible if the metaframe is intended to be shown
        this.metaframeGroup.visible = this.isVisible;

        // 8. Update world positions of CSS3DObjects (Control Buttons and Tooltips)

        // Control Buttons: Positioned above the node, oriented with the metaframeGroup.
        const controlsLocalOffset = new THREE.Vector3(0, halfSizeY + 40, 0); // Local offset from group center
        const controlsWorldPosition = controlsLocalOffset.clone().applyMatrix4(this.metaframeGroup.matrixWorld);
        this.controlButtons.position.copy(controlsWorldPosition);
        // Note: CSS3DRenderer handles billboarding of the controlButtons element itself if it's a CSS3DObject.
        // The positioning here ensures it follows the group's transform.

        // Tooltips: Positioned relative to their corresponding WebGL handles.
        const tooltipOffsetDistance = 15; // Desired screen-aligned offset above the handle
        const tempWorldPos = new THREE.Vector3(); // Reusable vector for world position calculations

        for (const key in this.resizeHandles) {
            const handleMesh = this.resizeHandles[key];
            const tooltip = this.handleTooltips[key];
            if (tooltip && handleMesh && handleMesh.visible && this.isVisible) {
                handleMesh.getWorldPosition(tempWorldPos); // Get world position of the WebGL handle

                // Create an offset vector that is screen-aligned (Y-up relative to camera)
                const screenUpOffset = new THREE.Vector3(0, tooltipOffsetDistance, 0);
                if (camera) {
                    // Apply camera's orientation to make offset screen-aligned
                    screenUpOffset.applyQuaternion(camera.quaternion);
                }
                tempWorldPos.add(screenUpOffset); // Add screen-aligned offset
                tooltip.position.copy(tempWorldPos);
                tooltip.visible = true; // Ensure CSS3DObject itself is marked visible for rendering
            } else if (tooltip) {
                tooltip.visible = false;
                if (tooltip.element) tooltip.element.style.visibility = 'hidden'; // Also hide HTML element
            }
        }

        const dragHandleMesh = this.dragHandle;
        const dragHandleTooltip = this.handleTooltips.dragHandle;
        if (dragHandleTooltip && dragHandleMesh && dragHandleMesh.visible && this.isVisible) {
            dragHandleMesh.getWorldPosition(tempWorldPos);
            const screenUpOffset = new THREE.Vector3(0, tooltipOffsetDistance, 0);
            if (camera) {
                screenUpOffset.applyQuaternion(camera.quaternion);
            }
            tempWorldPos.add(screenUpOffset);
            dragHandleTooltip.position.copy(tempWorldPos);
            dragHandleTooltip.visible = true;
        } else if (dragHandleTooltip) {
            dragHandleTooltip.visible = false;
            if (dragHandleTooltip.element) dragHandleTooltip.element.style.visibility = 'hidden';
        }
    }

    show() {
        if (this.isVisible) return;
        this.isVisible = true; // Set state first
        this.metaframeGroup.visible = true;
        this.controlButtons.visible = true;
        // Individual handle visibility and tooltip visibility will be set by update()
        this.update();
    }

    hide() {
        if (!this.isVisible) return;
        this.isVisible = false; // Set state first
        this.metaframeGroup.visible = false;
        this.controlButtons.visible = false;

        // Hide all tooltips explicitly by their CSS3DObject visibility and style
        for (const key in this.handleTooltips) {
            const tooltip = this.handleTooltips[key];
            if (tooltip) {
                tooltip.visible = false;
                if (tooltip.element) {
                    tooltip.element.style.visibility = 'hidden';
                    tooltip.element.style.opacity = '0';
                }
            }
        }
        // No need to call update() when hiding, as elements are made invisible.
    }

    setHandleTooltip(handleType, text, visible) {
        const tooltip = this.handleTooltips[handleType];
        if (tooltip && tooltip.element) {
            tooltip.element.textContent = text;
            // Manage CSS style visibility
            tooltip.element.style.visibility = visible ? 'visible' : 'hidden';
            tooltip.element.style.opacity = visible ? '1' : '0';
            // Manage CSS3DObject visibility (important for renderer culling)
            tooltip.visible = visible;

            if (visible) {
                // If making visible, ensure its position is correct based on the current state of the handle.
                // This relies on the handle already being correctly positioned by the main update() loop.
                const camera = this.cameraPlugin?.getCameraInstance();
                const handleMesh = handleType === 'dragHandle' ? this.dragHandle : this.resizeHandles[handleType];

                // Only position if the metaframe itself and the specific handle are supposed to be visible.
                if (this.isVisible && handleMesh && handleMesh.visible) {
                    const tempWorldPos = new THREE.Vector3();
                    handleMesh.getWorldPosition(tempWorldPos);

                    const tooltipOffsetDistance = 15;
                    const screenUpOffset = new THREE.Vector3(0, tooltipOffsetDistance, 0);
                    if (camera) {
                        screenUpOffset.applyQuaternion(camera.quaternion);
                    }
                    tempWorldPos.add(screenUpOffset);
                    tooltip.position.copy(tempWorldPos);
                } else {
                    // If conditions aren't met for visibility, force hide it
                    tooltip.element.style.visibility = 'hidden';
                    tooltip.element.style.opacity = '0';
                    tooltip.visible = false;
                }
            }
        }
    }

    dispose() {
        // Remove metaframeGroup from webglScene, which also removes all its children (border, handles)
        if (this.metaframeGroup) {
            this.webglScene.remove(this.metaframeGroup);
        }

        // Dispose geometries and materials of children of metaframeGroup
        this.borderMesh?.geometry?.dispose();
        this.borderMesh?.material?.dispose();
        this.dragHandle?.geometry?.dispose();
        this.dragHandle?.material?.dispose();
        for (const key in this.resizeHandles) {
            this.resizeHandles[key]?.geometry?.dispose();
            this.resizeHandles[key]?.material?.dispose();
        }

        this.borderMesh = null;
        this.dragHandle = null;
        this.resizeHandles = {};
        this.metaframeGroup = null; // Clear reference to the group

        // Dispose CSS3DObjects
        if (this.controlButtons) {
            this.cssScene.remove(this.controlButtons);
            this.controlButtons.element?.remove();
            this.controlButtons = null;
        }

        for (const key in this.handleTooltips) {
            const tooltip = this.handleTooltips[key];
            if (tooltip) {
                this.cssScene.remove(tooltip);
                tooltip.element?.remove();
            }
        }
        this.handleTooltips = {};
        this._originalHandleMaterials.clear();

        this.node = null;
        this.space = null;
        this.webglScene = null;
        this.cssScene = null;
        this.cameraPlugin = null;
    }
}
