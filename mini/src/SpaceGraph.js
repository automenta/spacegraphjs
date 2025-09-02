import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { CSS3DRenderer, CSS3DObject } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from './Node.js';
import { Edge } from './Edge.js';
import { ForceLayout } from './ForceLayout.js';

export class SpaceGraph {
    constructor(container) {
        this.container = container;
        this.nodes = [];
        this.edges = [];
        this._events = {};

        // Auto-import the default stylesheet if not already present
        if (!document.querySelector('link[href="style.css"]')) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'style.css';
            document.head.appendChild(cssLink);
        }

        this.initThree();
        this.initControls();
    }

    on(eventName, listener) {
        if (!this._events[eventName]) {
            this._events[eventName] = [];
        }
        this._events[eventName].push(listener);
    }

    emit(eventName, ...args) {
        if (this._events[eventName]) {
            this._events[eventName].forEach(listener => {
                try {
                    listener(...args);
                } catch (e) {
                    console.error(`Error in event listener for ${eventName}:`, e);
                }
            });
        }
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
        let clickedNode = null;
        let isResizing = false;
        let resizingNode = null;
        let dragStart = { x: 0, y: 0 };
        let previousMousePosition = { x: 0, y: 0 };

        const onMouseDown = (e) => {
            dragStart = { x: e.clientX, y: e.clientY };
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };

            this.mouse.x = (e.clientX / this.container.clientWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / this.container.clientHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.nodes.map(n => n.object), true);

            if (e.button === 0) { // Left mouse button
                if (intersects.length > 0) {
                    const intersectedObj = intersects[0].object;
                    if (intersectedObj.name === 'resizeHandle') {
                        isResizing = true;
                        resizingNode = this.nodes.find(n => n.resizeHandle === intersectedObj);
                        if (resizingNode) {
                            this.emit('node:resizestart', resizingNode);
                        }
                        return; // Don't process as a normal node click
                    }

                    clickedNode = this.nodes.find(n => n.object.children.includes(intersectedObj));
                    if (clickedNode) {
                        this.emit('node:mousedown', clickedNode);
                    }
                } else {
                    this.emit('background:mousedown');
                }
            } else if (e.button === 1) { // Middle mouse button
                e.preventDefault();
                if (intersects.length > 0) {
                    const targetNode = this.nodes.find(n => n.object === intersects[0].object.parent);
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
            if (isResizing && resizingNode) {
                const deltaX = e.clientX - previousMousePosition.x;
                const currentScale = resizingNode.data.scale || 1;
                // Adjust sensitivity; 0.01 feels about right
                const newScale = Math.max(0.1, currentScale + deltaX * 0.01);
                resizingNode.setScale(newScale);
                this.emit('node:resize', resizingNode);
            }
            else if (isDragging) {
                // If we didn't click on a node, pan the camera
                if (!clickedNode) {
                    const deltaX = e.clientX - previousMousePosition.x;
                    const deltaY = e.clientY - previousMousePosition.y;

                    this.camera.position.x -= deltaX * 0.5;
                    this.camera.position.y += deltaY * 0.5;
                }
            }
            previousMousePosition = { x: e.clientX, y: e.clientY };
        };

        const onMouseUp = (e) => {
            if (isResizing) {
                if(resizingNode) {
                    this.emit('node:resizeend', resizingNode);
                }
                isResizing = false;
                resizingNode = null;
            }
            else { // It wasn't a resize, so it was a click or pan
                const dragEnd = { x: e.clientX, y: e.clientY };
                const distance = Math.sqrt(
                    Math.pow(dragEnd.x - dragStart.x, 2) +
                    Math.pow(dragEnd.y - dragStart.y, 2)
                );

                if (distance < 5) { // It's a click, not a drag
                    if (clickedNode) {
                        this.emit('node:click', clickedNode);
                    } else {
                        this.emit('background:click');
                    }
                }

                if (clickedNode) {
                    this.emit('node:mouseup', clickedNode);
                } else {
                    this.emit('background:mouseup');
                }
            }

            isDragging = false;
            clickedNode = null;
        };

        const onWheel = (e) => {
            this.camera.position.z += e.deltaY * 0.1;
        };

        this.renderer.domElement.addEventListener('mousedown', onMouseDown, false);
        this.renderer.domElement.addEventListener('mousemove', onMouseMove, false);
        this.renderer.domElement.addEventListener('mouseup', onMouseUp, false);
        this.renderer.domElement.addEventListener('wheel', onWheel, false);

        // This listener checks if the mouse is over an HTML node and toggles interactivity
        this.container.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / this.container.clientWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / this.container.clientHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);

            const intersects = this.raycaster.intersectObjects(this.nodes.map(n => n.object), true);

            let hoveredHtmlNode = false;
            if (intersects.length > 0) {
                // The intersected object could be a child of the node's object3d
                const intersectedNode = this.nodes.find(n => n.object.children.includes(intersects[0].object));
                if (intersectedNode && intersectedNode.type === 'html') {
                    hoveredHtmlNode = true;
                }
            }

            if (hoveredHtmlNode) {
                this.renderer.domElement.style.pointerEvents = 'none';
                this.cssRenderer.domElement.style.pointerEvents = 'auto';
            } else {
                this.renderer.domElement.style.pointerEvents = 'auto';
                this.cssRenderer.domElement.style.pointerEvents = 'none';
            }
        }, false);
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
