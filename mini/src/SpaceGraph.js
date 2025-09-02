import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { Node } from './Node.js';
import { Edge } from './Edge.js';
import { ForceLayout } from './ForceLayout.js';

export class SpaceGraph {
    constructor(container) {
        this.container = container;
        this.nodes = [];
        this.edges = [];

        this.initThree();
        this.initControls();
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.z = 500;

        // WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = 0;
        this.renderer.domElement.style.left = 0;
        this.renderer.domElement.style.zIndex = 1;
        this.container.appendChild(this.renderer.domElement);

        // CSS3D Renderer for HTML nodes
        this.cssRenderer = new CSS3DRenderer();
        this.cssRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.cssRenderer.domElement.style.position = 'absolute';
        this.cssRenderer.domElement.style.top = 0;
        this.cssRenderer.domElement.style.left = 0;
        // Important: Make the CSS3D renderer container non-interactive
        // so that mouse events can pass through to the WebGL canvas.
        this.cssRenderer.domElement.style.pointerEvents = 'none';
        this.container.appendChild(this.cssRenderer.domElement);

        // Resize listener
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    initControls() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.focusedNode = null;
        this.previousCameraState = null;

        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        const onMouseDown = (e) => {
            // Left mouse button for panning
            if (e.button === 0) {
                isDragging = true;
                previousMousePosition = { x: e.clientX, y: e.clientY };
            }
            // Middle mouse button for auto-zoom
            else if (e.button === 1) {
                e.preventDefault();
                this.mouse.x = (e.clientX / this.container.clientWidth) * 2 - 1;
                this.mouse.y = -(e.clientY / this.container.clientHeight) * 2 + 1;
                this.raycaster.setFromCamera(this.mouse, this.camera);

                const intersects = this.raycaster.intersectObjects(this.nodes.map(n => n.object));

                if (intersects.length > 0) {
                    const intersectedNodeObject = intersects[0].object;
                    const targetNode = this.nodes.find(n => n.object === intersectedNodeObject);
                    if (targetNode) {
                        if (this.focusedNode === targetNode) {
                            this.resetFocus();
                        } else {
                            this.focusOnNode(targetNode);
                        }
                    }
                } else {
                    this.resetFocus();
                }
            }
        };

        const onMouseMove = (e) => {
            if (isDragging) {
                const deltaX = e.clientX - previousMousePosition.x;
                const deltaY = e.clientY - previousMousePosition.y;

                this.camera.position.x -= deltaX * 0.5;
                this.camera.position.y += deltaY * 0.5;

                previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        };

        const onMouseUp = () => {
            isDragging = false;
        };

        const onWheel = (e) => {
            this.camera.position.z += e.deltaY * 0.1;
        };

        this.renderer.domElement.addEventListener('mousedown', onMouseDown, false);
        this.renderer.domElement.addEventListener('mousemove', onMouseMove, false);
        this.renderer.domElement.addEventListener('mouseup', onMouseUp, false);
        this.renderer.domElement.addEventListener('wheel', onWheel, false);
    }

    focusOnNode(node) {
        if (!this.focusedNode) {
            this.previousCameraState = this.camera.position.clone();
        }
        this.focusedNode = node;
        // A simple "teleport" for now. A tweening library like GSAP would be better.
        this.camera.position.set(node.object.position.x, node.object.position.y, this.camera.position.z);
    }

    resetFocus() {
        if (this.previousCameraState) {
            this.camera.position.copy(this.previousCameraState);
            this.previousCameraState = null;
        }
        this.focusedNode = null;
    }

    createNode(config) {
        const node = new Node(config, this);
        this.nodes.push(node);
        // Add both Mesh and CSS3DObject to the same scene
        this.scene.add(node.object);
        return node;
    }

    addEdge(source, target, config = {}) {
        const edge = new Edge(source, target, config);
        this.edges.push(edge);
        this.scene.add(edge.object);
        return edge;
    }

    applyLayout() {
        this.layout = new ForceLayout(this.nodes, this.edges);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.layout) {
            this.layout.update();
            this.edges.forEach(edge => edge.update());
        }

        this.renderer.render(this.scene, this.camera);
        this.cssRenderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.cssRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
}
