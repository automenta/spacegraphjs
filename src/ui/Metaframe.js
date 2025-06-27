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

    // CSS3DObject for control buttons
    controlButtons = null; // This will be a CSS3DObject containing a div with buttons

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
        this.borderMesh = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
        this.borderMesh.renderOrder = 999; // Render on top
        this.webglScene.add(this.borderMesh);

        // Create resize handles
        const handleGeometry = new THREE.SphereGeometry(5, 8, 8); // Small spheres
        const handleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });

        const handlePositions = {
            topLeft: new THREE.Vector3(-0.5, 0.5, 0),
            topRight: new THREE.Vector3(0.5, 0.5, 0),
            bottomLeft: new THREE.Vector3(-0.5, -0.5, 0),
            bottomRight: new THREE.Vector3(0.5, -0.5, 0),
        };

        for (const key in handlePositions) {
            const handle = new THREE.Mesh(handleGeometry, handleMaterial);
            handle.name = `resizeHandle-${key}`;
            handle.userData.handleType = key;
            this.resizeHandles[key] = handle;
            this.webglScene.add(handle);
        }

        // Create a drag handle (e.g., a small rectangle at the top center)
        const dragHandleGeometry = new THREE.PlaneGeometry(50, 10); // Width, Height
        const dragHandleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
        });
        this.dragHandle = new THREE.Mesh(dragHandleGeometry, dragHandleMaterial);
        this.dragHandle.name = 'dragHandle';
        this.dragHandle.userData.handleType = 'drag';
        this.webglScene.add(this.dragHandle);
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

        const createButton = (text, onClick) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.style.cssText = `
                background: #333;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
            `;
            button.onclick = onClick;
            return button;
        };

        container.appendChild(createButton('Edit', () => this.space.emit('metaframe:editNode', { node: this.node })));
        container.appendChild(createButton('Link', () => this.space.emit('metaframe:linkNode', { node: this.node })));
        container.appendChild(
            createButton('Delete', () => this.space.emit('metaframe:deleteNode', { node: this.node }))
        );

        this.controlButtons = new CSS3DObject(container);
        this.cssScene.add(this.controlButtons);
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
        this.controlButtons.position.y += size / 2 + 40; // 40 units above the node's top edge, to clear drag handle
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
    }

    hide() {
        if (!this.isVisible) return;
        this.borderMesh.visible = false;
        this.controlButtons.visible = false;
        this.dragHandle.visible = false;
        for (const key in this.resizeHandles) {
            this.resizeHandles[key].visible = false;
        }
        this.isVisible = false;
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

        this.node = null;
        this.space = null;
        this.webglScene = null;
        this.cssScene = null;
    }
}
