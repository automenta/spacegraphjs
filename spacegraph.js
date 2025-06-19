/**
 * @license MIT
 * @module spacegraph
 * @description Minimal version for testing UIManager parsing.
 */
import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';

// UI Manager Imports (assuming these files are valid ES modules)
import { PointerInputHandler } from './js/ui/PointerInputHandler.js';
// import { HtmlAppNode } from './js/HtmlAppNode.js'; // UIManager uses HtmlNodeElement, not HtmlAppNode directly.
import { KeyboardInputHandler } from './js/ui/KeyboardInputHandler.js';
import { WheelInputHandler } from './js/ui/WheelInputHandler.js';
import { DragAndDropHandler } from './js/ui/DragAndDropHandler.js';
import { ContextMenuManager } from './js/ui/ContextMenuManager.js';
import { LinkingManager } from './js/ui/LinkingManager.js';
import { EdgeMenuManager } from './js/ui/EdgeMenuManager.js';
import { DialogManager } from './js/ui/DialogManager.js';

// Utility Functions
export const $ = (selector, context = document) => context.querySelector(selector);
export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
export const lerp = (a, b, t) => a + (b - a) * t;
export const generateId = (prefix = 'id') =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const DEG2RAD = Math.PI / 180;

// --- Minimal BaseNode (local definition, removed import) ---
export class BaseNode {
    id = null;
    spaceGraph = null;
    position = new THREE.Vector3();
    data = {};
    mass = 1.0;
    mesh = null;
    cssObject = null;
    htmlElement = null;
    labelObject = null;

    constructor(id, position = { x: 0, y: 0, z: 0 }, data = {}, mass = 1.0) {
        this.id = id ?? generateId('node');
        this.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
        this.data = { ...this.getDefaultData(), ...data };
        this.mass = Math.max(0.1, mass);
    }
    getDefaultData() { return { label: this.id }; }
    setPosition(x, y, z) { this.position.set(x, y, z); }
    update(spaceGraphInstance) { /* Minimal */ }
    dispose() { /* Minimal */ }
    getBoundingSphereRadius() { return 10; }
    setSelectedStyle(selected) { /* Minimal */ }
    startDrag() { this.spaceGraph?.layoutEngine?.fixNode(this); } // Relies on layoutEngine, but UIManager calls it.
    drag(newPosition) { this.setPosition(newPosition.x, newPosition.y, newPosition.z); }
    endDrag() { this.spaceGraph?.layoutEngine?.releaseNode(this); this.spaceGraph?.layoutEngine?.kick(); }
}

// --- Minimal HtmlNodeElement ---
export class HtmlNodeElement extends BaseNode {
    size = { width: 160, height: 70 };
    billboard = true;

    constructor(id, position = { x: 0, y: 0, z: 0 }, data = {}) {
        super(id, position, data, data.mass ?? 1.0);
        const htmlDefaults = this.spaceGraph?.config?.defaults?.node?.html || {};
        this.size.width = this.data.width ?? htmlDefaults.width ?? 160;
        this.size.height = this.data.height ?? htmlDefaults.height ?? 70;
        this.billboard = this.data.billboard ?? htmlDefaults.billboard ?? true;
        this.data.contentScale = this.data.contentScale ?? htmlDefaults.contentScale ?? 1.0;
        this.data.backgroundColor = this.data.backgroundColor ?? htmlDefaults.backgroundColor ?? 'var(--node-bg-default)';
        this.htmlElement = document.createElement('div'); // Simplified
        this.htmlElement.className = 'node-html';
        this.htmlElement.style.width = `${this.size.width}px`;
        this.htmlElement.style.height = `${this.size.height}px`;
        this.cssObject = new CSS3DObject(this.htmlElement);
        this.cssObject.userData = { nodeId: this.id };
        this.setPosition(position.x, position.y, position.z);
    }
    getDefaultData() {
        const graphHtmlDefaults = this.spaceGraph?.config?.defaults?.node?.html || {};
        return { ...super.getDefaultData(), type: 'html', content: '', width: graphHtmlDefaults.width ?? 160, height: graphHtmlDefaults.height ?? 70, billboard: graphHtmlDefaults.billboard ?? true, editable: false };
    }
    setPosition(x, y, z) { super.setPosition(x, y, z); if (this.cssObject) this.cssObject.position.copy(this.position); }
    update(spaceGraphInstance) { if (this.cssObject) { this.cssObject.position.copy(this.position); if (this.billboard && spaceGraphInstance?._camera) { this.cssObject.quaternion.copy(spaceGraphInstance._camera.quaternion); } } }
    dispose() { if (this.cssObject) { this.cssObject.element?.remove(); this.cssObject = null; } this.htmlElement = null; super.dispose(); }
    getBoundingSphereRadius() { return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2 * (this.data.contentScale ?? 1.0); }
    setSelectedStyle(selected) { this.htmlElement?.classList.toggle('selected', selected); }
    setSize(width, height) { this.size.width = Math.max(80,width); this.size.height = Math.max(40,height); if(this.htmlElement){this.htmlElement.style.width = `${this.size.width}px`;this.htmlElement.style.height = `${this.size.height}px`;} this.data.width = this.size.width; this.data.height = this.size.height;}
    adjustContentScale(delta) { /*noop*/ }
    adjustNodeSize(delta) { /*noop*/ }
    startResize() { this.htmlElement?.classList.add('resizing'); }
    resize(newWidth, newHeight){ this.setSize(newWidth, newHeight); }
    endResize(){ this.htmlElement?.classList.remove('resizing'); }
}

// --- Minimal NoteNode (extends HtmlNodeElement) ---
export class NoteNode extends HtmlNodeElement {
    constructor(id, pos = { x: 0, y: 0, z: 0 }, data = { content: '' }) {
        const mergedData = { ...data, type: 'note', editable: true, label: data.content || data.label };
        super(id, pos, mergedData);
    }
    // NoteNode typically doesn't need to override methods from HtmlNodeElement for basic functionality
    // unless specific 'note' type behavior is desired beyond what HtmlNodeElement provides.
}

// --- Minimal ShapeNode (extends BaseNode) ---
export class ShapeNode extends BaseNode {
    shape = 'sphere';
    size = 50;
    color = 0xffffff;

    constructor(id, position, data = {}, mass = 1.5) {
        super(id, position, data, mass);
        const shapeDefaults = this.spaceGraph?.config?.defaults?.node?.shape || {};
        this.shape = this.data.shape ?? shapeDefaults.shape ?? 'sphere';
        this.size = this.data.size ?? shapeDefaults.size ?? 50;
        this.color = this.data.color ?? shapeDefaults.color ?? 0xffffff;
        this.data.shape = this.shape;
        this.data.size = this.size;
        this.data.color = this.color;
        // Simplified: No _createMesh or _createLabel as rendering is not the focus for this test
        // this.mesh = this._createMesh();
        // if (this.data.label) { this.labelObject = this._createLabel(); }
        this.setPosition(position.x,position.y,position.z);
    }

    getDefaultData() {
        const graphShapeDefaults = this.spaceGraph?.config?.defaults?.node?.shape || {};
        return { ...super.getDefaultData(), type: 'shape', shape: graphShapeDefaults.shape ?? 'sphere', size: graphShapeDefaults.size ?? 50, color: graphShapeDefaults.color ?? 0xffffff };
    }

    setPosition(x, y, z) { super.setPosition(x, y, z); if (this.mesh) this.mesh.position.copy(this.position); if (this.labelObject) { /* update label pos */ } }
    update(spaceGraphInstance) { if (this.mesh) this.mesh.position.copy(this.position); /* update label */ }
    dispose() { /* dispose mesh, labelObject */ super.dispose(); }
    getBoundingSphereRadius() { return (this.data.size ?? 50) / 2; }
    setSelectedStyle(selected) { /* change material */ if (this.labelObject?.element) this.labelObject.element.classList.toggle('selected', selected); }
}


// --- Minimal Edge ---
export class Edge {
    static DEFAULT_EDGE_DATA = { color: 0x00d0ff, thickness: 1.5, opacity: 0.6, style: 'solid', constraintType: 'elastic', constraintParams: { stiffness: 0.001, idealLength: 200 } };
    id; source; target; spaceGraph = null; threeObject = null; data = {};
    constructor(id, sourceNode, targetNode, data = {}) {
        this.id = id; this.source = sourceNode; this.target = targetNode; this.spaceGraph = sourceNode.spaceGraph;
        const globalEdgeDefaults = this.spaceGraph?.config?.defaults?.edge || {};
        this.data = { ...Edge.DEFAULT_EDGE_DATA, ...globalEdgeDefaults, ...data, constraintParams: { ...Edge.DEFAULT_EDGE_DATA.constraintParams, ...(globalEdgeDefaults.constraintParams || {}), ...(data.constraintParams || {}) } };
        // Simplified: No _createThreeObject or update, as rendering is not the focus.
    }
    update() { /* Minimal */ }
    setHighlight(highlight) { /* Minimal */ }
    dispose() { /* Minimal */ }
}

// --- UIManager (Full definition from previous file, assuming it's what we want to test) ---
export class UIManager {
    spaceGraph = null; container = null;
    contextMenuEl = null; confirmDialogEl = null; statusIndicatorEl = null;
    pointerInputHandler = null; keyboardInputHandler = null; wheelInputHandler = null;
    dragAndDropHandler = null; contextMenuManager = null; linkingManager = null;
    edgeMenuManager = null; dialogManager = null;
    _hoveredEdge = null;

    constructor(spaceGraph, uiElements = {}) {
        if (!spaceGraph) throw new Error('UIManager requires a SpaceGraph instance.');
        this.spaceGraph = spaceGraph; this.container = spaceGraph.container;

        this.contextMenuEl = uiElements.contextMenuEl || document.querySelector('#context-menu');
        if (!this.contextMenuEl || !document.body.contains(this.contextMenuEl)) { this.contextMenuEl = document.createElement('div'); this.contextMenuEl.id = 'context-menu'; this.contextMenuEl.className = 'context-menu'; document.body.appendChild(this.contextMenuEl); }
        this.confirmDialogEl = uiElements.confirmDialogEl || document.querySelector('#confirm-dialog');
        if (!this.confirmDialogEl || !document.body.contains(this.confirmDialogEl)) { this.confirmDialogEl = document.createElement('div'); this.confirmDialogEl.id = 'confirm-dialog'; this.confirmDialogEl.className = 'dialog'; this.confirmDialogEl.innerHTML = '<p id="confirm-message">Are you sure?</p><button id="confirm-yes">Yes</button><button id="confirm-no">No</button>'; document.body.appendChild(this.confirmDialogEl); }
        this.statusIndicatorEl = uiElements.statusIndicatorEl || document.querySelector('#status-indicator');
        if (!this.statusIndicatorEl || !document.body.contains(this.statusIndicatorEl)) { this.statusIndicatorEl = document.createElement('div'); this.statusIndicatorEl.id = 'status-indicator'; document.body.appendChild(this.statusIndicatorEl); }

        this.pointerInputHandler = new PointerInputHandler(this.spaceGraph, this);
        this.keyboardInputHandler = new KeyboardInputHandler(this.spaceGraph, this);
        this.wheelInputHandler = new WheelInputHandler(this.spaceGraph, this);
        this.dragAndDropHandler = new DragAndDropHandler(this.spaceGraph, this);
        this.contextMenuManager = new ContextMenuManager(this.spaceGraph, this);
        this.linkingManager = new LinkingManager(this.spaceGraph, this);
        this.edgeMenuManager = new EdgeMenuManager(this.spaceGraph, this);
        this.dialogManager = new DialogManager(this.spaceGraph, this);
        this._bindEvents();
    }
    _bindEvents() {
        this.pointerInputHandler.bindEvents(); this.keyboardInputHandler.bindEvents();
        this.wheelInputHandler.bindEvents(); this.dragAndDropHandler.bindEvents();
        this.contextMenuManager.bindEvents();
        document.addEventListener('click', this._onDocumentClick.bind(this), true);
    }
    _onDocumentClick(event) { this.contextMenuManager.hideContextMenuIfNeeded(event); this.edgeMenuManager.hideEdgeMenuIfNeeded(event); }
    getDomElement(name) { if (name === 'contextMenu') return this.contextMenuEl; if (name === 'confirmDialog') return this.confirmDialogEl; if (name === 'statusIndicator') return this.statusIndicatorEl; return null; }
    getTargetInfoForWheel(event) { return this.pointerInputHandler._getTargetInfo(event); }
    getTargetInfoForMenu(event) { return this.pointerInputHandler._getTargetInfo(event); }
    getTargetInfoForLink(event) { return this.pointerInputHandler._getTargetInfo(event); }
    showConfirmDialog(message, onConfirm) { this.dialogManager.showConfirm(message, onConfirm); }
    showStatus(message, type, duration) { this.dialogManager.showStatus(message, type, duration); }
    hideContextMenu() { this.contextMenuManager.hideContextMenu(); }
    handleNodeControlButtonClick(buttonElement, node) {
        if (!(node instanceof HtmlNodeElement)) return;
        const actionMap = {
            'node-delete': () => this.showConfirmDialog(`Delete node "${node.id.substring(0, 10)}..."?`, () => this.spaceGraph.removeNode(node.id)),
            'node-content-zoom-in': () => node.adjustContentScale(1.15), 'node-content-zoom-out': () => node.adjustContentScale(1 / 1.15),
            'node-grow': () => node.adjustNodeSize(1.2), 'node-shrink': () => node.adjustNodeSize(0.8),
        };
        for (const cls of buttonElement.classList) { if (actionMap[cls]) { actionMap[cls](); break; } }
    }
    handleEdgeHover(event) {
        const { intersectedEdge } = this.pointerInputHandler._getTargetInfo(event);
        if (this._hoveredEdge !== intersectedEdge) { if (this._hoveredEdge && this._hoveredEdge !== this.spaceGraph.selectedEdge) { this._hoveredEdge.setHighlight(false); } this._hoveredEdge = intersectedEdge; if (this._hoveredEdge && this._hoveredEdge !== this.spaceGraph.selectedEdge) { this._hoveredEdge.setHighlight(true); } }
    }
    handleEscape() {
        if (this.linkingManager.isLinking()) { this.linkingManager.cancelLinking(); return true; }
        if (this.contextMenuEl && this.contextMenuEl.style.display === 'block') { this.contextMenuManager.hideContextMenu(); return true; }
        if (this.confirmDialogEl && this.confirmDialogEl.style.display === 'block') { this.dialogManager._hideConfirm(); return true; }
        if (this.edgeMenuManager._edgeMenuObject) { this.spaceGraph.setSelectedEdge(null); return true; }
        if (this.spaceGraph.selectedNode || this.spaceGraph.selectedEdge) { this.spaceGraph.setSelectedNode(null); this.spaceGraph.setSelectedEdge(null); return true; }
        return false;
    }
    showEdgeMenu(edge) { this.edgeMenuManager.showEdgeMenu(edge); }
    hideEdgeMenu() { this.edgeMenuManager.hideEdgeMenu(); }
    updateEdgeMenuPosition() { this.edgeMenuManager.update(); }
    cancelLinking() { this.linkingManager.cancelLinking(); }
    dispose() {
        this.pointerInputHandler.dispose(); this.keyboardInputHandler.dispose(); this.wheelInputHandler.dispose(); this.dragAndDropHandler.dispose(); this.contextMenuManager.dispose(); this.linkingManager.dispose(); this.edgeMenuManager.dispose(); this.dialogManager.dispose();
        document.removeEventListener('click', this._onDocumentClick.bind(this), true);
        if (this.contextMenuEl && this.contextMenuEl.id === 'context-menu' && this.contextMenuEl.parentElement === document.body) { this.contextMenuEl.remove(); }
        if (this.confirmDialogEl && this.confirmDialogEl.id === 'confirm-dialog' && this.confirmDialogEl.parentElement === document.body) { this.confirmDialogEl.remove(); }
        if (this.statusIndicatorEl && this.statusIndicatorEl.id === 'status-indicator' && this.statusIndicatorEl.parentElement === document.body) { this.statusIndicatorEl.remove(); }
        this.spaceGraph = null; this.container = null; this.contextMenuEl = null; this.confirmDialogEl = null; this.statusIndicatorEl = null; this._hoveredEdge = null;
    }
}


// --- Minimal SpaceGraph ---
export class SpaceGraph {
    nodes = new Map();
    edges = new Map();
    selectedNode = null;
    selectedEdge = null;
    _events = new Map();
    config = {}; // UIManager might read this.spaceGraph.config.rendering.lineIntersectionThreshold
    _camera = null; // UIManager and its handlers need this
    uiManager = null;
    container = null; // Needed by UIManager and its handlers

    // Mock necessary properties/methods for UIManager and its children
    layoutEngine = { fixNode: () => {}, releaseNode: () => {}, kick: () => {} }; // Mock layoutEngine

    constructor(containerElement, config = {}, uiElements = {}) {
        this.container = containerElement || document.createElement('div'); // Ensure container exists

        // Initialize a minimal config that UIManager and its handlers might need
        this.config = { ...this.getDefaultConfig(), ...config };
        if (config.rendering) this.config.rendering = { ...this.getDefaultConfig().rendering, ...config.rendering };
        if (config.camera) this.config.camera = { ...this.getDefaultConfig().camera, ...config.camera };


        // Initialize a camera for UIManager (PointerInputHandler uses it for raycasting)
        this._camera = new THREE.PerspectiveCamera(70, (this.container.clientWidth || window.innerWidth) / (this.container.clientHeight || window.innerHeight) , 1, 10000);
        this._camera.position.z = 700;

        // UIManager expects some DOM elements to exist or be findable by querySelector
        // Ensure these are either passed in uiElements or mock them if UIManager tries to create them
        // For this test, UIManager's constructor will try to create them if not found or passed.

        this.uiManager = new UIManager(this, uiElements);
    }

    getDefaultConfig() {
        return {
            rendering: { defaultBackgroundColor: 0x000000, defaultBackgroundAlpha: 0.0, lineIntersectionThreshold: 5, },
            camera: { initialPositionZ: 700, fov: 70, zoomSpeed: 0.0015, panSpeed: 0.8, dampingFactor: 0.12, },
            defaults: { node: { html: {}, shape: {} }, edge: {} }
        };
    }

    // Methods UIManager or its handlers might call
    getNodeById = (id) => this.nodes.get(id);
    getEdgeById = (id) => this.edges.get(id);
    removeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node) { this.nodes.delete(nodeId); this._emit('nodeRemoved', { nodeId }); console.log("Mock removeNode:", nodeId); return true;}
        return false;
    }
    removeEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (edge) { this.edges.delete(edgeId); this._emit('edgeRemoved', { edgeId }); console.log("Mock removeEdge:", edgeId); return true;}
        return false;
    }
    setSelectedNode(node) { this.selectedNode = node; this._emit('nodeSelected', {selectedNode: node}); }
    setSelectedEdge(edge) { this.selectedEdge = edge; this._emit('edgeSelected', {selectedEdge: edge}); }

    on(eventName, callback) { if (!this._events.has(eventName)) { this._events.set(eventName, new Set()); } this._events.get(eventName).add(callback); }
    off(eventName, callback) { if (this._events.has(eventName)) { this._events.get(eventName).delete(callback); } }
    _emit(eventName, data = {}) { if (this._events.has(eventName)) { this._events.get(eventName).forEach(cb => cb(data)); } }

    // Add dummy intersectedObject if PointerInputHandler calls it directly
    intersectedObject(screenX, screenY) { return null; }
}

// Export THREE for UIManager or other classes if they expect it to be available from this module
export { THREE };
// HtmlAppNode is imported but not used by UIManager directly, so no need to export it from here for this specific test.
// export { HtmlAppNode };
