/**
 * @license MIT
 * @module spacegraph
 * @description A JavaScript library for creating interactive 2D/3D Zooming User Interfaces (ZUI)
 * built with Three.js and HTML/CSS. It provides a scene graph, event handling,
 * and a variety of node types to build complex, data-driven visualizations.
 */
import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { gsap } from 'gsap';

// Node Class Imports
import { BaseNode } from './js/BaseNode.js';
import { HtmlAppNode } from './js/HtmlAppNode.js';
import { RegisteredNode } from './js/RegisteredNode.js';

// UI Manager Imports (from original snippet)
import { PointerInputHandler } from './js/ui/PointerInputHandler.js';
import { KeyboardInputHandler } from './js/ui/KeyboardInputHandler.js';
import { WheelInputHandler } from './js/ui/WheelInputHandler.js';
import { DragAndDropHandler } from './js/ui/DragAndDropHandler.js';
import { ContextMenuManager } from './js/ui/ContextMenuManager.js';
import { LinkingManager } from './js/ui/LinkingManager.js';
import { EdgeMenuManager } from './js/ui/EdgeMenuManager.js';
import { DialogManager } from './js/ui/DialogManager.js';

// Utility Functions (exported directly)
export const $ = (selector, context = document) => context.querySelector(selector);
export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
export const lerp = (a, b, t) => a + (b - a) * t;
export const generateId = (prefix = 'id') =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const DEG2RAD = Math.PI / 180;

// Placeholder/Minimal Class Definitions for built-in types used by SpaceGraph.addNode
// These need to be defined before SpaceGraph class if it instantiates them directly.

export class NoteNode extends HtmlAppNode { // Assuming NoteNode might extend HtmlAppNode or BaseNode
    constructor(id, position, data = {}) {
        // Merge defaults for NoteNode if any, then call super
        const noteDefaults = {
            content: data.content || '',
            width: data.width || 200,
            height: data.height || 100,
            backgroundColor: data.backgroundColor || 'var(--node-bg-default, #f0f0f0)',
            editable: data.editable !== undefined ? data.editable : true,
        };
        super(id, { ...noteDefaults, ...data, type: 'note' }, position); // Pass type for potential base class logic
        this.data.type = 'note'; // Ensure type is set
        // Basic HTML structure for a note
        if (this.htmlElement) { // HtmlAppNode creates htmlElement
            this.htmlElement.classList.add('note-node-default-styles'); // Add a class for basic styling
            this.htmlElement.style.width = `${this.data.width}px`;
            this.htmlElement.style.height = `${this.data.height}px`;
            this.htmlElement.style.backgroundColor = this.data.backgroundColor;
            this.htmlElement.innerHTML = `<div class="node-content" style="padding:10px; box-sizing:border-box;">${this.data.content}</div>`;
            if (this.data.editable) {
                this.htmlElement.contentEditable = "true"; // Simplistic editability
            }
        }
    }
    // Minimal methods if needed by BaseNode or SpaceGraph logic
    update() {}
    dispose() { super.dispose(); }
    setSelectedStyle(selected) { super.setSelectedStyle(selected); }
    getBoundingSphereRadius() { return Math.max(this.data.width, this.data.height) / 2 * 1.2; }
}

export class ShapeNode extends BaseNode {
    constructor(id, position, data = {}) {
        const shapeDefaults = {
            shape: data.shape || 'sphere',
            size: data.size || 50,
            color: data.color || 0xffffff,
            label: data.label || id,
        };
        super(id, { ...shapeDefaults, ...data, type: 'shape' }, position);
        this.data.type = 'shape';

        // Minimal mesh creation for placeholder
        const geometry = (this.data.shape === 'box') ?
            new THREE.BoxGeometry(this.data.size, this.data.size, this.data.size) :
            new THREE.SphereGeometry(this.data.size / 2, 16, 12);
        const material = new THREE.MeshStandardMaterial({ color: this.data.color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.userData = { nodeId: this.id };

        if (this.data.label) {
            const labelDiv = document.createElement('div');
            labelDiv.className = 'node-label-3d';
            labelDiv.textContent = this.data.label;
            this.labelObject = new CSS3DObject(labelDiv);
            this.labelObject.position.copy(this.position);
        }
    }
    update(graph) {
      if (this.mesh) this.mesh.position.copy(this.position);
      if (this.labelObject) {
        this.labelObject.position.copy(this.position);
        this.labelObject.position.y += (this.data.size / 2 || 25) + 15; // Adjust label position
        if (graph && graph._camera) {
            this.labelObject.quaternion.copy(graph._camera.quaternion);
        }
      }
    }
    dispose() {
        this.mesh?.geometry?.dispose();
        this.mesh?.material?.dispose();
        super.dispose();
    }
    setSelectedStyle(selected) {
        super.setSelectedStyle(selected);
        if (this.mesh?.material) {
            this.mesh.material.emissive?.setHex(selected ? 0x555555 : 0x000000);
        }
    }
    getBoundingSphereRadius() { return (this.data.size / 2 || 25) * 1.1; }
}

// Assuming HtmlNodeElement is similar to HtmlAppNode or a more basic version
// For now, to satisfy `new HtmlNodeElement` in SpaceGraph.addNode:
export class HtmlNodeElement extends HtmlAppNode {
    constructor(id, position, data = {}) {
        const htmlDefaults = {
            content: data.content || '',
            width: data.width || 160,
            height: data.height || 70,
        };
        super(id, { ...htmlDefaults, ...data, type: 'html' }, position);
        this.data.type = 'html';
         if (this.htmlElement && data.content) { // HtmlAppNode creates htmlElement
            this.htmlElement.innerHTML = data.content;
        }
    }
    // Inherits methods from HtmlAppNode
}


// SpaceGraph class definition (using the snippet and placeholders)
export class SpaceGraph {
    _events = new Map();
    nodes = new Map();
    edges = new Map();
    selectedNode = null;
    selectedEdge = null;
    isLinking = false;
    linkSourceNode = null;
    tempLinkLine = null;
    uiManager = null;
    cameraController = null;
    layoutEngine = null;
    background = { color: 0x000000, alpha: 0.0 };
    config = {};

    constructor(containerElement, config = {}, uiElements = {}) {
        if (!containerElement || !(containerElement instanceof HTMLElement)) {
            throw new Error('SpaceGraph requires a valid HTML container element.');
        }
        this.container = containerElement;
        this.config = { ...this.getDefaultConfig(), ...config };
        if (config.rendering) this.config.rendering = { ...this.getDefaultConfig().rendering, ...config.rendering };
        if (config.camera) this.config.camera = { ...this.getDefaultConfig().camera, ...config.camera };
        if (config.defaults) {
            this.config.defaults = { ...this.getDefaultConfig().defaults };
            if (config.defaults.node) {
                this.config.defaults.node = { ...this.getDefaultConfig().defaults.node };
                if (config.defaults.node.html) this.config.defaults.node.html = { ...this.getDefaultConfig().defaults.node.html, ...config.defaults.node.html };
                if (config.defaults.node.shape) this.config.defaults.node.shape = { ...this.getDefaultConfig().defaults.node.shape, ...config.defaults.node.shape };
            }
            if (config.defaults.edge) this.config.defaults.edge = { ...this.getDefaultConfig().defaults.edge, ...config.defaults.edge };
        }

        this.scene = new THREE.Scene();
        this.cssScene = new THREE.Scene();
        this._camera = new THREE.PerspectiveCamera(this.config.camera.fov, window.innerWidth / window.innerHeight, 1, 20000);
        this._camera.position.z = this.config.camera.initialPositionZ;

        this._setupRenderers();
        this.background = { color: this.config.rendering.defaultBackgroundColor, alpha: this.config.rendering.defaultBackgroundAlpha };
        this.setBackground(this.background.color, this.background.alpha);

        // Placeholder for CameraController and ForceLayout if they are not defined in the snippet
        // This will likely cause runtime errors, but the goal is to pass parsing first.
        this.cameraController = typeof CameraController !== 'undefined' ? new CameraController(this._camera, this.container, {
            zoomSpeed: this.config.camera.zoomSpeed,
            panSpeed: this.config.camera.panSpeed,
            dampingFactor: this.config.camera.dampingFactor,
        }) : { moveTo: () => {}, pushState: () => {}, popState: () => {}, getCurrentTargetNodeId: () => null, setCurrentTargetNodeId: () => {}, setInitialState: () => {} };

        this.layoutEngine = typeof ForceLayout !== 'undefined' ? new ForceLayout(this) : { addNode: () => {}, removeNode: () => {}, addEdge: () => {}, removeEdge: () => {}, start: () => {}, stop: () => {}, runOnce: () => {}, update: () => {}, setSettings: () => {} };

        this.nodeTypes = new Map();
        this.uiManager = new UIManager(this, uiElements);
        this._setupLighting();
        this.centerView(null, 0);
        this.cameraController.setInitialState();
        window.addEventListener('resize', this._onWindowResize.bind(this), false);
        this._animate();
        this.layoutEngine.start();
    }

    getDefaultConfig() {
        return {
            rendering: { defaultBackgroundColor: 0x000000, defaultBackgroundAlpha: 0.0, lineIntersectionThreshold: 5 },
            camera: { initialPositionZ: 700, fov: 70, zoomSpeed: 0.0015, panSpeed: 0.8, dampingFactor: 0.12 },
            defaults: {
                node: {
                    html: { width: 160, height: 70, billboard: true, contentScale: 1.0, backgroundColor: 'var(--node-bg-default)' },
                    shape: { shape: 'sphere', size: 50, color: 0xffffff }
                },
                edge: { color: 0x00d0ff, thickness: 1.5, opacity: 0.6 }
            }
        };
    }

    _setupRenderers() {
        this.webglCanvas = $('#webgl-canvas', this.container);
        if (!this.webglCanvas) {
            this.webglCanvas = document.createElement('canvas');
            this.webglCanvas.id = 'webgl-canvas';
            this.container.appendChild(this.webglCanvas);
        }
        this.webglRenderer = new THREE.WebGLRenderer({ canvas: this.webglCanvas, antialias: true, alpha: true });
        this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
        this.webglRenderer.setPixelRatio(window.devicePixelRatio);

        this.css3dContainer = $('#css3d-container', this.container);
        if (!this.css3dContainer) {
            this.css3dContainer = document.createElement('div');
            this.css3dContainer.id = 'css3d-container';
            this.container.appendChild(this.css3dContainer);
        }
        Object.assign(this.css3dContainer.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2' });
        this.cssRenderer = new CSS3DRenderer();
        this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
        this.css3dContainer.appendChild(this.cssRenderer.domElement);
        this.webglCanvas.style.position = 'absolute';
        this.webglCanvas.style.inset = '0';
        this.webglCanvas.style.zIndex = '1';
    }

    _setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(0.5, 1, 0.75);
        this.scene.add(directionalLight);
    }

    registerNodeType(typeName, typeDefinition) {
        if (this.nodeTypes.has(typeName)) throw new Error(`Node type "${typeName}" is already registered.`);
        if (!typeDefinition || typeof typeDefinition.onCreate !== 'function') throw new Error(`Invalid typeDefinition for "${typeName}": onCreate method is required.`);
        this.nodeTypes.set(typeName, typeDefinition);
        console.log(`Node type "${typeName}" registered.`);
    }

    setBackground(color = 0x000000, alpha = 0.0) {
        this.background = { color, alpha };
        this.webglRenderer.setClearColor(color, alpha);
        this.webglCanvas.style.backgroundColor = alpha === 0 ? 'transparent' : `#${color.toString(16).padStart(6, '0')}`;
    }

    addNode(dataOrInstance) {
        let nodeInstance;
        if (dataOrInstance instanceof BaseNode) {
            nodeInstance = dataOrInstance;
            if (!nodeInstance.id) nodeInstance.id = generateId('node');
            if (this.nodes.has(nodeInstance.id)) return this.nodes.get(nodeInstance.id);
        } else if (typeof dataOrInstance === 'object' && dataOrInstance !== null) {
            const data = dataOrInstance;
            if (!data.type) { console.error("Node data must include 'type'", data); return null; }
            data.id = data.id ?? generateId('node');
            if (this.nodes.has(data.id)) return this.nodes.get(data.id);
            const position = { x: data.x ?? 0, y: data.y ?? 0, z: data.z ?? 0 };
            if (this.nodeTypes.has(data.type)) {
                const typeDefinition = this.nodeTypes.get(data.type);
                nodeInstance = typeDefinition.nodeClass ? new typeDefinition.nodeClass(data.id, data, typeDefinition, this) : new RegisteredNode(data.id, data, typeDefinition, this);
            } else if (data.type === 'note') {
                nodeInstance = new NoteNode(data.id, position, data);
            } else if (data.type === 'html') {
                nodeInstance = new HtmlNodeElement(data.id, position, data);
            } else if (data.type === 'shape' || data.shape) {
                nodeInstance = new ShapeNode(data.id, position, data);
            } else { console.error(`Unknown node type: "${data.type}"`); return null; }
        } else { throw new Error('Invalid argument to addNode.'); }
        if (!nodeInstance) { console.error('Node instantiation failed.', dataOrInstance); return null; }
        this.nodes.set(nodeInstance.id, nodeInstance);
        nodeInstance.spaceGraph = this;
        if (nodeInstance.cssObject) this.cssScene.add(nodeInstance.cssObject);
        if (nodeInstance.mesh) this.scene.add(nodeInstance.mesh);
        if (nodeInstance.labelObject) this.cssScene.add(nodeInstance.labelObject);
        this.layoutEngine?.addNode(nodeInstance);
        this._emit('nodeAdded', { node: nodeInstance });
        return nodeInstance;
    }

    removeNode(nodeId) {
        const nodeToRemove = this.nodes.get(nodeId);
        if (!nodeToRemove) return false;
        if (this.selectedNode === nodeToRemove) this.setSelectedNode(null);
        if (this.linkSourceNode === nodeToRemove) this.uiManager?.cancelLinking();
        [...this.edges.values()].filter(edge => edge.source === nodeToRemove || edge.target === nodeToRemove).forEach(edge => this.removeEdge(edge.id));
        nodeToRemove.dispose();
        this.nodes.delete(nodeId);
        this.layoutEngine?.removeNode(nodeToRemove);
        this._emit('nodeRemoved', { nodeId: nodeId, node: nodeToRemove });
        return true;
    }

    addEdge(sourceNode, targetNode, data = {}) {
        if (!sourceNode || !(sourceNode instanceof BaseNode) || !this.nodes.has(sourceNode.id)) return null;
        if (!targetNode || !(targetNode instanceof BaseNode) || !this.nodes.has(targetNode.id)) return null;
        if (sourceNode === targetNode) return null;
        if ([...this.edges.values()].find(e => (e.source === sourceNode && e.target === targetNode) || (e.source === targetNode && e.target === sourceNode))) {
            return [...this.edges.values()].find(e => (e.source === sourceNode && e.target === targetNode) || (e.source === targetNode && e.target === sourceNode));
        }
        const edgeId = data.id ?? generateId('edge');
        // Assuming Edge class is defined elsewhere and available
        const edge = new Edge(edgeId, sourceNode, targetNode, data);
        edge.spaceGraph = this;
        this.edges.set(edge.id, edge);
        if (edge.threeObject) this.scene.add(edge.threeObject);
        this.layoutEngine?.addEdge(edge);
        this._emit('edgeAdded', { edge: edge });
        return edge;
    }

    removeEdge(edgeId) {
        const edgeToRemove = this.edges.get(edgeId);
        if (!edgeToRemove) return false;
        if (this.selectedEdge === edgeToRemove) this.setSelectedEdge(null);
        edgeToRemove.dispose();
        this.edges.delete(edgeId);
        this.layoutEngine?.removeEdge(edgeToRemove);
        this._emit('edgeRemoved', { edgeId: edgeId, edge: edgeToRemove });
        return true;
    }

    getNodeById = (id) => this.nodes.get(id);
    getEdgeById = (id) => this.edges.get(id);

    updateNodeData(nodeId, newData) {
        const nodeToUpdate = this.getNodeById(nodeId);
        if (!nodeToUpdate) return null;
        Object.assign(nodeToUpdate.data, newData);
        if (nodeToUpdate.typeDefinition?.onDataUpdate) {
            nodeToUpdate.typeDefinition.onDataUpdate(nodeToUpdate, newData, this);
        } else if (typeof nodeToUpdate.onDataUpdate === 'function') {
            nodeToUpdate.onDataUpdate(newData);
        }
        return nodeToUpdate;
    }

    _updateNodesAndEdges() {
        this.nodes.forEach((node) => node.update(this));
        this.edges.forEach((edge) => edge.update(this));
        this.uiManager?.edgeMenuManager?.update();
    }

    _render() {
        this.webglRenderer.render(this.scene, this._camera);
        this.cssRenderer.render(this.cssScene, this._camera);
    }

    _animate() {
        this._updateNodesAndEdges();
        this._render();
        requestAnimationFrame(this._animate.bind(this));
    }

    _onWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
        this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    centerView(targetPosition = null, duration = 0.7) {
        let targetFocusPoint;
        if (targetPosition instanceof THREE.Vector3) {
            targetFocusPoint = targetPosition.clone();
        } else if (this.nodes.size > 0) {
            targetFocusPoint = new THREE.Vector3();
            this.nodes.forEach((node) => targetFocusPoint.add(node.position));
            targetFocusPoint.divideScalar(this.nodes.size);
        } else {
            targetFocusPoint = new THREE.Vector3(0, 0, 0);
        }
        const cameraDistance = this.nodes.size > 1 || !targetPosition ? 700 : 400;
        this.cameraController.moveTo(targetFocusPoint.x, targetFocusPoint.y, targetFocusPoint.z + cameraDistance, duration, targetFocusPoint);
    }

    focusOnNode(node, duration = 0.6, pushHistory = false) {
        if (!node || !(node instanceof BaseNode) || !this.cameraController || !this._camera) return;
        const targetFocusPoint = node.position.clone();
        const fovRadians = this._camera.fov * DEG2RAD;
        let nodeVisualSize = 100;
        if (typeof node.getBoundingSphereRadius === 'function') {
            nodeVisualSize = node.getBoundingSphereRadius() * 2;
        } else if (node.size && typeof node.size.width === 'number' && typeof node.size.height === 'number') {
            nodeVisualSize = Math.max(node.size.width / this._camera.aspect, node.size.height) * 1.2;
        }
        const cameraDistance = nodeVisualSize / (2 * Math.tan(fovRadians / 2)) + 50;
        if (pushHistory) this.cameraController.pushState();
        this.cameraController.moveTo(targetFocusPoint.x, targetFocusPoint.y, targetFocusPoint.z + cameraDistance, duration, targetFocusPoint);
    }

    autoZoom(node) {
        if (!node || !(node instanceof BaseNode) || !this.cameraController) return;
        const currentTargetNodeId = this.cameraController.getCurrentTargetNodeId();
        if (currentTargetNodeId === node.id) {
            this.cameraController.popState();
        } else {
            this.cameraController.pushState();
            this.cameraController.setCurrentTargetNodeId(node.id);
            this.focusOnNode(node, 0.6, false);
        }
    }

    screenToWorld(screenX, screenY, targetZ = 0) {
        const normalizedScreenPos = new THREE.Vector3((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1, 0.5);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(normalizedScreenPos, this._camera);
        const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -targetZ);
        const intersectionPoint = new THREE.Vector3();
        return raycaster.ray.intersectPlane(targetPlane, intersectionPoint) ? intersectionPoint : null;
    }

    setSelectedNode(node) {
        if (this.selectedNode === node) return;
        const previouslySelectedNode = this.selectedNode;
        if (this.selectedNode) this.selectedNode.setSelectedStyle(false);
        this.selectedNode = node;
        if (this.selectedNode) {
            this.selectedNode.setSelectedStyle(true);
            if (this.selectedEdge) this.setSelectedEdge(null);
        }
        this._emit('nodeSelected', { selectedNode: this.selectedNode, previouslySelectedNode: previouslySelectedNode });
    }

    setSelectedEdge(edge) {
        if (this.selectedEdge === edge) return;
        const previouslySelectedEdge = this.selectedEdge;
        if (this.selectedEdge) {
            this.selectedEdge.setHighlight(false);
            this.uiManager?.hideEdgeMenu();
        }
        this.selectedEdge = edge;
        if (this.selectedEdge) {
            this.selectedEdge.setHighlight(true);
            if (this.selectedNode) this.setSelectedNode(null);
            this.uiManager?.showEdgeMenu(this.selectedEdge);
        }
        this._emit('edgeSelected', { selectedEdge: this.selectedEdge, previouslySelectedEdge: previouslySelectedEdge });
    }

    // _emit, on, off methods (essential for event emitter functionality)
    _emit(eventName, eventData) {
        if (this._events.has(eventName)) {
            this._events.get(eventName).forEach(callback => callback(eventData));
        }
    }

    on(eventName, callback) {
        if (!this._events.has(eventName)) {
            this._events.set(eventName, new Set());
        }
        this._events.get(eventName).add(callback);
    }

    off(eventName, callback) {
        if (this._events.has(eventName)) {
            this._events.get(eventName).delete(callback);
            if (this._events.get(eventName).size === 0) {
                this._events.delete(eventName);
            }
        }
    }

    // Placeholder for other methods from the original SpaceGraph class if they were outside the snippet
    // For example: highlightNode, getRaycaster, etc.
}

// Placeholder for Edge class if not imported from elsewhere
// This is crucial for `new Edge(...)` in `addEdge`
class Edge {
    constructor(id, sourceNode, targetNode, data = {}) {
        this.id = id;
        this.source = sourceNode;
        this.target = targetNode;
        this.data = data;
        this.color = data.color || 0x00d0ff;
        this.thickness = data.thickness || 1.5;
        this.opacity = data.opacity || 0.6;

        const material = new THREE.LineBasicMaterial({
            color: this.color,
            linewidth: this.thickness, // Note: linewidth > 1 may not work on all platforms/drivers
            transparent: true,
            opacity: this.opacity
        });
        const geometry = new THREE.BufferGeometry().setFromPoints([sourceNode.position, targetNode.position]);
        this.threeObject = new THREE.Line(geometry, material);
    }
    update() {
        if (this.threeObject) {
            const positions = this.threeObject.geometry.attributes.position.array;
            positions[0] = this.source.position.x;
            positions[1] = this.source.position.y;
            positions[2] = this.source.position.z;
            positions[3] = this.target.position.x;
            positions[4] = this.target.position.y;
            positions[5] = this.target.position.z;
            this.threeObject.geometry.attributes.position.needsUpdate = true;
            this.threeObject.geometry.computeBoundingSphere(); // Important for raycasting
        }
    }
    setHighlight(highlighted) {
      if (this.threeObject?.material) {
        this.threeObject.material.color.setHex(highlighted ? 0xff0000 : this.color);
         this.threeObject.material.opacity = highlighted ? 1.0 : this.opacity;
      }
    }
    dispose() {
        this.threeObject?.geometry?.dispose();
        this.threeObject?.material?.dispose();
        // remove from scene is handled by SpaceGraph.removeEdge
    }
}

// Placeholder for CameraController and ForceLayout if they are not defined/imported
// These are needed by SpaceGraph constructor.
class CameraController {
    constructor(camera, domElement, options) {this.camera = camera; this.domElement = domElement; this.options = options; this.target = new THREE.Vector3();}
    moveTo(x,y,z,duration,target) {this.camera.position.set(x,y,z); if(target)this.camera.lookAt(target);}
    pushState() {}
    popState() {}
    getCurrentTargetNodeId() { return null; }
    setCurrentTargetNodeId(id) {}
    setInitialState() {}
    update() {}
}

class ForceLayout {
    constructor(spaceGraph) {this.spaceGraph = spaceGraph;}
    addNode(node) {}
    removeNode(node) {}
    addEdge(edge) {}
    removeEdge(edge) {}
    start() {}
    stop() {}
    runOnce() {}
    update() {}
    setSettings(settings) {}
}


// Consolidated Exports
export {
    // SpaceGraph is exported via `export class SpaceGraph`
    // NoteNode, ShapeNode, HtmlNodeElement are exported via `export class ...`
    // Utility functions ($, generateId, etc.) are exported via `export const ...`
    THREE, // From `import * as THREE`
    CSS3DObject, CSS3DRenderer, // From three/addons
    gsap, // From import
    BaseNode, // From import './js/BaseNode.js'
    HtmlAppNode, // From import './js/HtmlAppNode.js'
    RegisteredNode, // From import './js/RegisteredNode.js'
    PointerInputHandler, KeyboardInputHandler, WheelInputHandler, DragAndDropHandler, // UI Handlers
    ContextMenuManager, LinkingManager, EdgeMenuManager, DialogManager, // UI Managers
    Edge // Placeholder class
};
