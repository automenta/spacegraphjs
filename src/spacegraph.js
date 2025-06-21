import * as THREE from 'three';
import {CSS3DObject, CSS3DRenderer} from 'three/addons/renderers/CSS3DRenderer.js';
import {gsap} from "gsap";

export const $ = (selector, context) => (context || document).querySelector(selector);
export const $$ = (selector, context) => (context || document).querySelectorAll(selector);

const Utils = {
    clamp: (v, min, max) => Math.max(min, Math.min(v, max)),
    lerp: (a, b, t) => a + (b - a) * t,
    generateId: (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    DEG2RAD: Math.PI / 180,
    isObject: (item) => item && typeof item === 'object' && !Array.isArray(item),
    mergeDeep: (target, ...sources) => {
        sources.forEach(source => {
            Object.keys(source).forEach(key => {
                const targetValue = target[key];
                const sourceValue = source[key];
                if (Utils.isObject(targetValue) && Utils.isObject(sourceValue)) {
                    Utils.mergeDeep(targetValue, sourceValue);
                } else {
                    target[key] = sourceValue;
                }
            });
        });
        return target;
    }
};

export class SpaceGraph {
    nodes = new Map();
    edges = new Map();
    nodeSelected = null;
    edgeSelected = null;
    isLinking = false;
    linkSourceNode = null;
    tempLinkLine = null;
    ui = null;
    camera = null;
    _cam = null;
    layout = null;
    renderGL = null;
    renderCSS3D = null;
    // Removed renderCSS2D
    css3dContainer = null;
    // Removed css2dContainer
    webglCanvas = null;
    background = {color: 0x1a1a1d, alpha: 1.0};

    constructor(containerElement) {
        if (!containerElement) throw new Error("SpaceGraph requires a container element.");
        this.container = containerElement;
        this.scene = new THREE.Scene();
        this.cssScene = new THREE.Scene(); // Scene for HTML nodes AND 3D labels
        // Removed css2DScene

        this._cam = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 20000);
        this._cam.position.z = 700;
        this.camera = new Camera(this);

        this._setupRenderers();
        this._setupLighting();
        this.setBackground(this.background.color, this.background.alpha);

        this.centerView(null, 0);
        this.camera.setInitialState();

        window.addEventListener('resize', this._onWindowResize, false);
    }

    _setupRenderers() {
        this.webglCanvas = $('#webgl-canvas');
        if (!this.webglCanvas) throw new Error("#webgl-canvas not found.");
        this.renderGL = new THREE.WebGLRenderer({canvas: this.webglCanvas, antialias: true, alpha: true});
        this.renderGL.setSize(window.innerWidth, window.innerHeight);
        this.renderGL.setPixelRatio(window.devicePixelRatio);

        this.renderCSS3D = new CSS3DRenderer();
        this.renderCSS3D.setSize(window.innerWidth, window.innerHeight);
        this.css3dContainer = document.createElement('div');
        this.css3dContainer.id = 'css3d-container';
        Object.assign(this.css3dContainer.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
        });
        this.css3dContainer.appendChild(this.renderCSS3D.domElement);
        this.container.appendChild(this.css3dContainer);

        // Removed CSS2DRenderer setup
    }

    _setupLighting() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(0.5, 1, 0.75);
        this.scene.add(dirLight);
    }

    setBackground(color = 0x000000, alpha = 0) {
        this.background = {color, alpha};
        this.renderGL.setClearColor(color, alpha);
        // Update canvas style for visual consistency if not transparent
        this.webglCanvas.style.backgroundColor = alpha === 0 ? 'transparent' : `#${color.toString(16).padStart(6, '0')}`;
    }

    addNode(nodeInstance) {
        if (!nodeInstance.id) nodeInstance.id = Utils.generateId('node');
        if (this.nodes.has(nodeInstance.id)) return this.nodes.get(nodeInstance.id);

        this.nodes.set(nodeInstance.id, nodeInstance);
        nodeInstance.space = this;
        // Add CSSObject (HTML node or 3D Label) to cssScene
        if (nodeInstance.cssObject) this.cssScene.add(nodeInstance.cssObject);
        // Add Mesh (Shape node) to WebGL scene
        if (nodeInstance.mesh) this.scene.add(nodeInstance.mesh);
        // Add 3D Label (Shape node) to cssScene
        if (nodeInstance.labelObject) this.cssScene.add(nodeInstance.labelObject);
        this.layout?.addNode(nodeInstance);
        return nodeInstance;
    }

    removeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        if (this.nodeSelected === node) this.setSelectedNode(null);
        if (this.linkSourceNode === node) this.ui?.cancelLinking();

        [...this.edges.values()]
            .filter(edge => edge.source === node || edge.target === node)
            .forEach(edge => this.removeEdge(edge.id));

        this.layout?.removeNode(node);
        node.dispose(); // Node handles removal from scenes
        this.nodes.delete(nodeId);
    }

    addEdge(sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode || sourceNode === targetNode) return null;
        if ([...this.edges.values()].some(e =>
            (e.source === sourceNode && e.target === targetNode) ||
            (e.source === targetNode && e.target === sourceNode))) {
            console.warn("Duplicate edge ignored:", sourceNode.id, targetNode.id);
            return null;
        }

        const edge = new Edge(Utils.generateId('edge'), sourceNode, targetNode, data);
        this.edges.set(edge.id, edge);
        if (edge.line) this.scene.add(edge.line);
        this.layout?.addEdge(edge);
        return edge;
    }

    removeEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) return;
        if (this.edgeSelected === edge) this.setSelectedEdge(null);
        this.layout?.removeEdge(edge);
        edge.dispose();
        this.edges.delete(edgeId);
    }

    getNodeById = (id) => this.nodes.get(id);
    getEdgeById = (id) => this.edges.get(id);

    updateNodesAndEdges() {
        this.nodes.forEach(node => node.update(this));
        this.edges.forEach(edge => edge.update(this));
        this.ui?.updateEdgeMenuPosition();
    }

    render = () => {
        this.renderGL.render(this.scene, this._cam);
        this.renderCSS3D.render(this.cssScene, this._cam);
        // Removed renderCSS2D call
    }

    _onWindowResize = () => {
        const iw = window.innerWidth, ih = window.innerHeight;
        this._cam.aspect = iw / ih;
        this._cam.updateProjectionMatrix();
        this.renderGL.setSize(iw, ih);
        this.renderCSS3D.setSize(iw, ih);
        // Removed renderCSS2D resize
    }

    centerView(targetPosition = null, duration = 0.7) {
        let targetPos;
        if (targetPosition instanceof THREE.Vector3) {
            targetPos = targetPosition.clone();
        } else {
            targetPos = new THREE.Vector3();
            if (this.nodes.size > 0) {
                this.nodes.forEach(node => targetPos.add(node.position));
                targetPos.divideScalar(this.nodes.size);
            } else if (targetPosition && typeof targetPosition.x === 'number') {
                targetPos.set(targetPosition.x, targetPosition.y, targetPosition.z);
            }
        }
        const distance = this.nodes.size > 1 ? 700 : 400;
        this.camera.moveTo(targetPos.x, targetPos.y, targetPos.z + distance, duration, targetPos);
    }

    focusOnNode(node, duration = 0.6, pushHistory = false) {
        if (!node || !this._cam) return;
        const targetPos = node.position.clone();
        const fov = this._cam.fov * Utils.DEG2RAD;
        const aspect = this._cam.aspect;
        const nodeSize = node.getBoundingSphereRadius() * 2;
        const projectedSize = Math.max(nodeSize, nodeSize / aspect);
        const paddingFactor = 1.5;
        const minDistance = 50;
        const distance = Math.max(minDistance, (projectedSize * paddingFactor) / (2 * Math.tan(fov / 2)));

        if (pushHistory) this.camera.pushState();
        this.camera.moveTo(targetPos.x, targetPos.y, targetPos.z + distance, duration, targetPos);
    }

    autoZoom(node) {
        if (!node || !this.camera) return;
        const currentTargetNodeId = this.camera.getCurrentTargetNodeId();
        if (currentTargetNodeId === node.id) {
            this.camera.popState();
        } else {
            this.camera.pushState();
            this.camera.setCurrentTargetNodeId(node.id);
            this.focusOnNode(node, 0.6, false);
        }
    }

    screenToWorld(screenX, screenY, targetZ = 0) {
        this._cam.updateMatrixWorld();
        const raycaster = new THREE.Raycaster();
        const vec = new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(vec, this._cam);
        const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -targetZ);
        const intersectPoint = new THREE.Vector3();
        return raycaster.ray.intersectPlane(targetPlane, intersectPoint) ?? null;
    }

    setSelectedNode(node) {
        if (this.nodeSelected === node) return;
        this.nodeSelected?.setSelectedStyle(false);
        this.nodeSelected = node;
        this.nodeSelected?.setSelectedStyle(true);
        if (node) this.setSelectedEdge(null);
    }

    setSelectedEdge(edge) {
        if (this.edgeSelected === edge) return;
        if (this.edgeSelected) {
            this.edgeSelected.setHighlight(false);
            this.ui?.hideEdgeMenu();
        }
        this.edgeSelected = edge;
        if (this.edgeSelected) {
            this.edgeSelected.setHighlight(true);
            this.ui?.showEdgeMenu(this.edgeSelected);
            this.setSelectedNode(null);
        }
    }

    intersectedObjects(screenX, screenY) {
        const vec = new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, this._cam);
        raycaster.params.Line.threshold = 5;

        const nodeMeshes = [...this.nodes.values()].map(n => n.mesh).filter(Boolean);
        const nodeIntersects = nodeMeshes.length > 0 ? raycaster.intersectObjects(nodeMeshes, false) : [];
        if (nodeIntersects.length > 0) {
            const intersectedMesh = nodeIntersects[0].object;
            const node = this.getNodeById(intersectedMesh.userData?.nodeId);
            if (node) return {node, distance: nodeIntersects[0].distance};
        }

        const edgeLines = [...this.edges.values()].map(e => e.line).filter(Boolean);
        const edgeIntersects = edgeLines.length > 0 ? raycaster.intersectObjects(edgeLines, false) : [];
        if (edgeIntersects.length > 0) {
            const intersectedLine = edgeIntersects[0].object;
            const edge = this.getEdgeById(intersectedLine.userData?.edgeId);
            if (edge) return {edge, distance: edgeIntersects[0].distance};
        }

        return null;
    }

    animate() {
        const frame = () => {
            // Layout simulation runs independently via its own requestAnimationFrame loop
            this.updateNodesAndEdges(); // Update visuals based on current positions
            this.render();              // Render the scenes
            requestAnimationFrame(frame); // Continue the main render loop
        };
        frame();
    }

    dispose() {
        this.camera?.dispose();
        this.layout?.stop();
        this.nodes.forEach(node => node.dispose());
        this.edges.forEach(edge => edge.dispose());
        this.nodes.clear();
        this.edges.clear();
        this.scene?.clear();
        this.cssScene?.clear();
        // Removed css2DScene clear
        this.renderGL?.dispose();
        this.renderCSS3D?.domElement?.remove();
        // Removed renderCSS2D dispose/remove
        this.css3dContainer?.remove();
        // Removed css2dContainer remove
        window.removeEventListener('resize', this._onWindowResize);
        this.ui?.dispose();
        console.log("SpaceGraph disposed.");
    }
}

// --- Base Node Class ---
class BaseNode {
    space = null;
    position = new THREE.Vector3();
    data = {};
    mass = 1.0;
    id = null;
    mesh = null; // For 3D object nodes
    cssObject = null; // For HTML nodes
    labelObject = null; // For 3D labels on ShapeNodes

    constructor(id, position = {x: 0, y: 0, z: 0}, data = {}, mass = 1.0) {
        this.id = id ?? Utils.generateId('node');
        this.position.set(position.x, position.y, position.z);
        this.data = Utils.mergeDeep({}, this.getDefaultData(), data);
        this.mass = Math.max(0.1, mass);
    }

    getDefaultData() {
        return {label: ''};
    }

    update(space) { /* Base update logic */
    }

    dispose() {
        this.mesh?.geometry?.dispose();
        this.mesh?.material?.dispose();
        this.mesh?.parent?.remove(this.mesh);
        this.cssObject?.element?.remove(); // Remove HTML element if it exists
        this.cssObject?.parent?.remove(this.cssObject);
        this.labelObject?.element?.remove(); // Remove label element if it exists
        this.labelObject?.parent?.remove(this.labelObject);
        this.space = null;
        this.mesh = null;
        this.cssObject = null;
        this.labelObject = null;
    }

    getBoundingSphereRadius() {
        return 50;
    }

    setSelectedStyle(selected) { /* Base selection style logic */
    }

    setPosition(x, y, z) {
        this.position.set(x, y, z);
    }

    startDrag() {
        this.space?.layout?.fixNode(this);
    }

    drag(newPosition) {
        this.setPosition(newPosition.x, newPosition.y, newPosition.z);
    }

    endDrag() {
        this.space?.layout?.releaseNode(this);
        this.space?.layout?.kick();
    }
}

// --- HTML Node (Notes, etc.) ---
class HtmlNode extends BaseNode {
    static MIN_SIZE = {width: 80, height: 40};
    static CONTENT_SCALE_RANGE = {min: 0.3, max: 3.0};
    htmlElement = null; // Reference to the DOM element within cssObject
    size = {width: 160, height: 70};
    billboard = false;

    constructor(id, position, data = {}, mass = 1.0) {
        super(id, position, data, mass);
        const initialWidth = this.data.width ?? 160;
        const initialHeight = this.data.height ?? 70;
        this.size = {width: initialWidth, height: initialHeight};
        this.htmlElement = this._createElement(); // Create the element first
        this.cssObject = new CSS3DObject(this.htmlElement); // Wrap it
        this.cssObject.userData = {nodeId: this.id, type: 'html-node'}; // Link back
        this.update();
        this.setContentScale(this.data.contentScale ?? 1.0);
        this.setBackgroundColor(this.data.backgroundColor ?? '#333344');
    }

    getDefaultData() {
        return {
            label: '', content: '', width: 160, height: 70,
            contentScale: 1.0, backgroundColor: '#333344', type: 'html', editable: false
        };
    }

    _createElement() {
        const el = document.createElement('div');
        el.className = 'node-html node-common'; // Add common class
        el.id = `node-html-${this.id}`;
        el.dataset.nodeId = this.id;
        el.style.width = `${this.size.width}px`;
        el.style.height = `${this.size.height}px`;
        el.draggable = false;
        el.ondragstart = (e) => e.preventDefault();

        el.innerHTML = `
            <div class="node-inner-wrapper">
                <div class="node-content" spellcheck="false" style="transform: scale(${this.data.contentScale});">
                    ${this.data.content || this.data.label || ''}
                </div>
                <div class="node-controls">
                    <button class="node-quick-button node-content-zoom-in" title="Zoom In Content (+)">+</button>
                    <button class="node-quick-button node-content-zoom-out" title="Zoom Out Content (-)">-</button>
                    <button class="node-quick-button node-grow" title="Grow Node (Ctrl++)">➚</button>
                    <button class="node-quick-button node-shrink" title="Shrink Node (Ctrl+-)">➘</button>
                    <button class="node-quick-button delete-button node-delete" title="Delete Node (Del)">×</button>
                </div>
            </div>
            <div class="resize-handle" title="Resize Node"></div>
        `;
        this._initContentEditable(el); // Pass element to init
        return el;
    }

    _initContentEditable(element) {
        const contentDiv = $('.node-content', element);
        if (contentDiv && this.data.editable) {
            contentDiv.contentEditable = "true";
            let debounceTimer;
            contentDiv.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.data.content = contentDiv.innerHTML;
                }, 300);
            });
            // Prevent interactions within content from triggering pan/drag
            contentDiv.addEventListener('pointerdown', e => e.stopPropagation());
            contentDiv.addEventListener('touchstart', e => e.stopPropagation(), {passive: true});
            contentDiv.addEventListener('wheel', e => {
                // Allow scrolling within the div if needed
                const isScrollable = contentDiv.scrollHeight > contentDiv.clientHeight || contentDiv.scrollWidth > contentDiv.clientWidth;
                const canScrollY = (e.deltaY < 0 && contentDiv.scrollTop > 0) || (e.deltaY > 0 && contentDiv.scrollTop < contentDiv.scrollHeight - contentDiv.clientHeight);
                const canScrollX = (e.deltaX < 0 && contentDiv.scrollLeft > 0) || (e.deltaX > 0 && contentDiv.scrollLeft < contentDiv.scrollWidth - contentDiv.clientWidth);
                if (isScrollable && (canScrollY || canScrollX)) {
                    e.stopPropagation(); // Stop propagation only if scrolling is possible
                }
            }, {passive: false});
        }
    }

    setSize(width, height, scaleContent = false) {
        const oldArea = this.size.width * this.size.height;
        this.size.width = Math.max(HtmlNode.MIN_SIZE.width, width);
        this.size.height = Math.max(HtmlNode.MIN_SIZE.height, height);
        if (this.htmlElement) {
            this.htmlElement.style.width = `${this.size.width}px`;
            this.htmlElement.style.height = `${this.size.height}px`;
        }
        if (scaleContent && oldArea > 0) {
            const scaleFactor = Math.sqrt((this.size.width * this.size.height) / oldArea);
            this.setContentScale(this.data.contentScale * scaleFactor);
        }
        this.space?.layout?.kick();
    }

    setContentScale(scale) {
        this.data.contentScale = Utils.clamp(scale, HtmlNode.CONTENT_SCALE_RANGE.min, HtmlNode.CONTENT_SCALE_RANGE.max);
        const contentEl = $('.node-content', this.htmlElement);
        if (contentEl) contentEl.style.transform = `scale(${this.data.contentScale})`;
    }

    setBackgroundColor(color) {
        this.data.backgroundColor = color;
        this.htmlElement?.style.setProperty('--node-bg', this.data.backgroundColor);
    }

    adjustContentScale = (deltaFactor) => this.setContentScale(this.data.contentScale * deltaFactor);
    adjustNodeSize = (factor) => this.setSize(this.size.width * factor, this.size.height * factor, false);

    update(space) {
        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            if (this.billboard && space?.camera?._cam) {
                // Use camera quaternion for smoother billboard rotation
                this.cssObject.quaternion.copy(space.camera._cam.quaternion);
            }
        }
    }

    // dispose() is handled by BaseNode

    getBoundingSphereRadius() {
        // Use diagonal for layout padding calculation
        return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2;
    }

    setSelectedStyle(selected) {
        this.htmlElement?.classList.toggle('selected', selected);
    }

    startResize() {
        this.htmlElement?.classList.add('resizing');
        this.space?.layout?.fixNode(this);
    }

    resize(newWidth, newHeight) {
        this.setSize(newWidth, newHeight);
    }

    endResize() {
        this.htmlElement?.classList.remove('resizing');
        this.space?.layout?.releaseNode(this);
    }
}

export class NoteNode extends HtmlNode {
    constructor(id, pos, data = {content: ''}) {
        // Ensure 'editable' is true for NoteNodes
        super(id, pos, Utils.mergeDeep({type: 'note', editable: true}, data));
    }
}

export class ShapeNode extends BaseNode {
    shape = 'sphere';
    size = 50;
    color = 0xffffff;

    constructor(id, position, data = {}, mass = 1.5) {
        super(id, position, data, mass);
        this.shape = this.data.shape ?? 'sphere';
        this.size = this.data.size ?? 50;
        this.color = this.data.color ?? 0xffffff;
        this.mesh = this._createMesh();
        this.mesh.userData = {nodeId: this.id, type: 'shape-node'}; // Link back
        if (this.data.label) {
            this.labelObject = this._createLabel(); // Create 3D label
            this.labelObject.userData = {nodeId: this.id, type: 'shape-label'}; // Link back
        }
        this.update();
    }

    getDefaultData() {
        return {label: '', shape: 'sphere', size: 50, color: 0xffffff, type: 'shape'};
    }

    _createMesh() {
        let geometry;
        const effectiveSize = Math.max(10, this.size);
        switch (this.shape) {
            case 'box':
                geometry = new THREE.BoxGeometry(effectiveSize, effectiveSize, effectiveSize);
                break;
            case 'sphere':
            default:
                geometry = new THREE.SphereGeometry(effectiveSize / 2, 16, 12);
                break;
            // TODO: Add more shapes (Cone, Cylinder, Torus...)
        }
        const material = new THREE.MeshStandardMaterial({
            color: this.color, roughness: 0.6, metalness: 0.2,
        });
        return new THREE.Mesh(geometry, material);
    }

    _createLabel() {
        const div = document.createElement('div');
        // Use a different class for 3D labels
        div.className = 'node-label-3d node-common';
        div.textContent = this.data.label;
        div.dataset.nodeId = this.id; // Link back
        // Style to prevent interaction and ensure visibility
        Object.assign(div.style, {
            pointerEvents: 'none', // Don't block mesh picking
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '2px 5px',
            borderRadius: '3px',
            fontSize: '14px', // Adjust as needed
            textAlign: 'center',
            whiteSpace: 'nowrap',
        });
        return new CSS3DObject(div);
    }

    update(space) {
        if (this.mesh) this.mesh.position.copy(this.position);
        if (this.labelObject) {
            // Position label slightly above the node's bounding sphere top
            const offset = this.getBoundingSphereRadius() * 1.1 + 10; // 10px padding
            this.labelObject.position.copy(this.position).y += offset;
            if (space?.camera?._cam) { // Billboard effect for label
                this.labelObject.quaternion.copy(space.camera._cam.quaternion);
            }
        }
    }

    // dispose() is handled by BaseNode

    getBoundingSphereRadius() {
        switch (this.shape) {
            case 'box':
                return Math.sqrt(3 * (this.size / 2) ** 2);
            case 'sphere':
            default:
                return this.size / 2;
        }
    }

    setSelectedStyle(selected) {
        // Visual feedback on the 3D mesh
        if (this.mesh?.material) {
            this.mesh.material.emissive?.setHex(selected ? 0x555500 : 0x000000);
        }
        // Visual feedback on the label
        this.labelObject?.element?.classList.toggle('selected', selected);
        // Add CSS rule for .node-label-3d.selected { /* styles */ } if needed
    }
}

// --- Edge Class ---
class Edge {
    static HIGHLIGHT_COLOR = 0x00ffff;
    static DEFAULT_OPACITY = 0.6;
    static HIGHLIGHT_OPACITY = 1.0;
    line = null;
    // Default constraint: elastic spring
    data = {
        color: 0x00d0ff,
        thickness: 1.5,
        constraintType: 'elastic',
        constraintParams: {stiffness: 0.001, idealLength: 200}
    };

    constructor(id, sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode) throw new Error("Edge requires valid source and target nodes.");
        this.id = id;
        this.source = sourceNode;
        this.target = targetNode;
        const defaultData = {
            color: 0x00d0ff, thickness: 1.5, constraintType: 'elastic',
            constraintParams: {stiffness: 0.001, idealLength: 200}
        };
        this.data = Utils.mergeDeep({}, defaultData, data);
        this.line = this._createLine();
        this.update();
    }

    _createLine() {
        const material = new THREE.LineBasicMaterial({
            color: this.data.color,
            linewidth: this.data.thickness,
            transparent: true,
            opacity: Edge.DEFAULT_OPACITY,
            depthTest: false, // Render edges slightly "on top"
        });
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const line = new THREE.Line(geometry, material);
        line.renderOrder = -1;
        line.userData = {edgeId: this.id}; // Link back
        return line;
    }

    update() {
        if (!this.line || !this.source || !this.target) return;
        const positions = this.line.geometry.attributes.position;
        positions.setXYZ(0, this.source.position.x, this.source.position.y, this.source.position.z);
        positions.setXYZ(1, this.target.position.x, this.target.position.y, this.target.position.z);
        positions.needsUpdate = true;
        this.line.geometry.computeBoundingSphere();
    }

    setHighlight(highlight) {
        if (!this.line?.material) return;
        const mat = this.line.material;
        mat.opacity = highlight ? Edge.HIGHLIGHT_OPACITY : Edge.DEFAULT_OPACITY;
        mat.color.set(highlight ? Edge.HIGHLIGHT_COLOR : this.data.color);
        // Note: linewidth requires LineMaterial/LineGeometry/Line2 for runtime changes
        // mat.linewidth = highlight ? this.data.thickness * 1.5 : this.data.thickness;
        mat.needsUpdate = true;
    }

    dispose() {
        if (this.line) {
            this.line.geometry?.dispose();
            this.line.material?.dispose();
            this.line.parent?.remove(this.line);
            this.line = null;
        }
    }
}

// --- UI Manager ---
export class UIManager {
    space = null;
    container = null;
    contextMenuElement = null;
    confirmDialogElement = null;
    edgeMenuObject = null;

    draggedNode = null;
    resizedNode = null;
    hoveredEdge = null;
    resizeStartPos = {x: 0, y: 0};
    resizeStartSize = {width: 0, height: 0};
    dragOffset = new THREE.Vector3();
    pointerState = {
        down: false,
        primary: false,
        secondary: false,
        middle: false,
        potentialClick: true,
        lastPos: {x: 0, y: 0},
        startPos: {x: 0, y: 0}
    };
    confirmCallback = null;

    constructor(space, contextMenuEl, confirmDialogEl) {
        if (!space || !contextMenuEl || !confirmDialogEl) throw new Error("UIManager requires SpaceGraph instance and UI elements.");
        this.space = space;
        this.container = space.container;
        this.contextMenuElement = contextMenuEl;
        this.confirmDialogElement = confirmDialogEl;
        this._bindEvents();
    }

    _bindEvents() {
        const opts = {passive: false};
        this.container.addEventListener('pointerdown', this._onPointerDown, false);
        window.addEventListener('pointermove', this._onPointerMove, false);
        window.addEventListener('pointerup', this._onPointerUp, false);
        this.container.addEventListener('contextmenu', this._onContextMenu, opts);
        document.addEventListener('click', this._onDocumentClick, true); // Capture phase
        this.contextMenuElement.addEventListener('click', this._onContextMenuClick, false);
        $('#confirm-yes', this.confirmDialogElement)?.addEventListener('click', this._onConfirmYes, false);
        $('#confirm-no', this.confirmDialogElement)?.addEventListener('click', this._onConfirmNo, false);
        window.addEventListener('keydown', this._onKeyDown, false);
        this.container.addEventListener('wheel', this._onWheel, opts);
    }

    _updatePointerState(e, isDown) {
        this.pointerState.down = isDown;
        this.pointerState.primary = isDown && e.button === 0;
        this.pointerState.secondary = isDown && e.button === 2;
        this.pointerState.middle = isDown && e.button === 1;
        if (isDown) {
            this.pointerState.potentialClick = true;
            this.pointerState.startPos = {x: e.clientX, y: e.clientY};
            this.pointerState.lastPos = {x: e.clientX, y: e.clientY};
        }
    }

    _onPointerDown = (e) => {
        this._updatePointerState(e, true);
        const targetInfo = this._getTargetInfo(e);

        if (this.pointerState.secondary) {
            e.preventDefault();
            return;
        }

        if (this.pointerState.primary) {
            if (this._handlePointerDownControls(e, targetInfo)) return;
            if (this._handlePointerDownResize(e, targetInfo)) return;
            if (this._handlePointerDownNode(e, targetInfo)) return;
            if (this._handlePointerDownEdge(e, targetInfo)) return;
            if (this._handlePointerDownBackground(e, targetInfo)) return;
        }

        if (this.pointerState.middle) {
            e.preventDefault();
        }
    }

    _onPointerMove = (e) => {
        if (!this.pointerState.down) {
            this._handleHover(e);
            return;
        }

        const dx = e.clientX - this.pointerState.lastPos.x;
        const dy = e.clientY - this.pointerState.lastPos.y;
        const totalDx = e.clientX - this.pointerState.startPos.x;
        const totalDy = e.clientY - this.pointerState.startPos.y;

        if (Math.sqrt(totalDx ** 2 + totalDy ** 2) > 3) this.pointerState.potentialClick = false;
        this.pointerState.lastPos = {x: e.clientX, y: e.clientY};

        if (this.resizedNode) {
            e.preventDefault();
            // Use total delta from start for smoother resize
            const newWidth = this.resizeStartSize.width + totalDx;
            const newHeight = this.resizeStartSize.height + totalDy;
            this.resizedNode.resize(newWidth, newHeight);
            // No need to call updateNodesAndEdges here, happens in main loop
            return;
        }

        if (this.draggedNode) {
            e.preventDefault();
            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, this.draggedNode.position.z);
            if (worldPos) {
                this.draggedNode.drag(worldPos.sub(this.dragOffset));
                // No need to call updateNodesAndEdges here, happens in main loop
            }
            return;
        }

        if (this.space.isLinking) {
            e.preventDefault();
            this._updateTempLinkLine(e.clientX, e.clientY);
            const targetInfo = this._getTargetInfo(e);
            // Use common class for highlighting potential targets
            $$('.node-common.linking-target').forEach(el => el.classList.remove('linking-target'));
            const targetElement = targetInfo.node?.htmlElement ?? targetInfo.node?.labelObject?.element;
            if (targetInfo.node && targetInfo.node !== this.space.linkSourceNode && targetElement) {
                targetElement.classList.add('linking-target');
            }
            return;
        }

        if (this.pointerState.primary) {
            this.space.camera?.pan(dx, dy);
        }
    }

    _onPointerUp = (e) => {
        this.container.style.cursor = this.space.isLinking ? 'crosshair' : 'grab';

        if (this.resizedNode) {
            this.resizedNode.endResize();
            this.resizedNode = null;
        } else if (this.draggedNode) {
            this.draggedNode.endDrag();
            this.draggedNode = null;
        } else if (this.space.isLinking && e.button === 0) {
            this._completeLinking(e);
        } else if (e.button === 1 && this.pointerState.potentialClick) {
            const {node} = this._getTargetInfo(e);
            if (node) {
                this.space.autoZoom(node);
                e.preventDefault();
            }
        }

        this.space.camera?.endPan();
        this._updatePointerState(e, false);
        $$('.node-common.linking-target').forEach(el => el.classList.remove('linking-target'));
    }

    _onContextMenu = (e) => {
        e.preventDefault();
        this._hideContextMenu();
        const targetInfo = this._getTargetInfo(e);
        let menuItems = [];
        let target = null;

        // Prioritize node hit from raycast or element check
        if (targetInfo.node) {
            target = targetInfo.node;
            if (this.space.nodeSelected !== target) this.space.setSelectedNode(target);
            menuItems = this._getContextMenuItemsNode(target);
        } else if (targetInfo.intersectedEdge) { // Check edge only if no node hit
            target = targetInfo.intersectedEdge;
            if (this.space.edgeSelected !== target) this.space.setSelectedEdge(target);
            menuItems = this._getContextMenuItemsEdge(target);
        } else { // Background
            this.space.setSelectedNode(null);
            this.space.setSelectedEdge(null);
            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, 0);
            menuItems = this._getContextMenuItemsBackground(worldPos);
        }
        if (menuItems.length > 0) this._showContextMenu(e.clientX, e.clientY, menuItems);
    }

    _onDocumentClick = (e) => {
        // Use capture phase, check if click is outside relevant UI elements
        const clickedContextMenu = this.contextMenuElement.contains(e.target);
        const clickedEdgeMenu = this.edgeMenuObject?.element?.contains(e.target);
        const clickedConfirmDialog = this.confirmDialogElement.contains(e.target);

        if (!clickedContextMenu) this._hideContextMenu();

        if (!clickedEdgeMenu && this.edgeMenuObject) {
            const targetInfo = this._getTargetInfo(e);
            // Hide edge menu unless clicking the selected edge itself again
            if (this.space.edgeSelected !== targetInfo.intersectedEdge) {
                this.space.setSelectedEdge(null);
            }
        }

        // Deselect if clicking background (and not dragging/panning)
        if (!clickedContextMenu && !clickedEdgeMenu && !clickedConfirmDialog) {
            const targetInfo = this._getTargetInfo(e);
            // Check if click was on node element, node mesh, or edge line
            const clickedOnGraphElement = targetInfo.nodeElement || targetInfo.intersectedObjectResult?.node || targetInfo.intersectedObjectResult?.edge;
            if (!clickedOnGraphElement && this.pointerState.potentialClick && !this.space.camera?.isPanning) {
                this.space.setSelectedNode(null);
                this.space.setSelectedEdge(null);
            }
        }
    }

    _onContextMenuClick = (e) => {
        const li = e.target.closest('li[data-action]');
        if (!li) return;
        const {action, nodeId, edgeId, position: positionData} = li.dataset;
        this._hideContextMenu();

        const actions = {
            'edit-node': () => {
                const node = this.space.getNodeById(nodeId);
                // Only focus editable HTML nodes
                if (node instanceof HtmlNode && node.data.editable) {
                    node.htmlElement?.querySelector('.node-content')?.focus();
                }
            },
            'delete-node': () => this._showConfirm(`Delete node "${nodeId?.substring(0, 10)}..."?`, () => this.space.removeNode(nodeId)),
            'delete-edge': () => this._showConfirm(`Delete edge "${edgeId?.substring(0, 10)}..."?`, () => this.space.removeEdge(edgeId)),
            'autozoom-node': () => this.space.autoZoom(this.space.getNodeById(nodeId)),
            'create-note': () => this._createHtmlNode(positionData),
            'create-box': () => this._createShapeNode(positionData, 'box'),
            'create-sphere': () => this._createShapeNode(positionData, 'sphere'),
            'center-view': () => this.space.centerView(),
            'reset-view': () => this.space.camera?.resetView(),
            'start-link': () => this._startLinking(this.space.getNodeById(nodeId)),
            'reverse-edge': () => {
                const edge = this.space.getEdgeById(edgeId);
                if (edge) {
                    [edge.source, edge.target] = [edge.target, edge.source];
                    edge.update();
                    this.space.layout?.kick();
                }
            },
            'edit-edge': () => this.space.setSelectedEdge(this.space.getEdgeById(edgeId)),
            'toggle-background': () => this.space.setBackground(
                this.space.background.alpha === 0 ? 0x1a1a1d : 0x000000,
                this.space.background.alpha === 0 ? 1.0 : 0
            ),
        };

        actions[action]?.() ?? console.warn("Unknown context menu action:", action);
    }

    _createHtmlNode(positionData, initialContent = 'New Note ✨') {
        try {
            const pos = JSON.parse(positionData);
            const newNode = this.space.addNode(new NoteNode(null, pos, {content: initialContent}));
            this.space.layout?.kick();
            setTimeout(() => {
                this.space.focusOnNode(newNode, 0.6, true);
                this.space.setSelectedNode(newNode);
                newNode.htmlElement?.querySelector('.node-content')?.focus();
            }, 100);
        } catch (err) {
            console.error("Failed to parse position for new note:", err);
        }
    }

    _createShapeNode(positionData, shapeType) {
        try {
            const pos = JSON.parse(positionData);
            const label = `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)} Node`;
            const newNode = this.space.addNode(new ShapeNode(null, pos, {
                label,
                shape: shapeType,
                size: 60,
                color: Math.random() * 0xffffff
            }));
            this.space.layout?.kick();
            setTimeout(() => {
                this.space.focusOnNode(newNode, 0.6, true);
                this.space.setSelectedNode(newNode);
            }, 100);
        } catch (err) {
            console.error(`Failed to parse position for new ${shapeType} node:`, err);
        }
    }

    _onConfirmYes = () => {
        this.confirmCallback?.();
        this._hideConfirm();
    }
    _onConfirmNo = () => this._hideConfirm();

    _onKeyDown = (e) => {
        const activeEl = document.activeElement;
        const isEditing = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
        if (isEditing && e.key !== 'Escape') return;

        const selectedNode = this.space.nodeSelected;
        const selectedEdge = this.space.edgeSelected;
        let handled = true;

        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                if (selectedNode) this._showConfirm(`Delete node "${selectedNode.id.substring(0, 10)}..."?`, () => this.space.removeNode(selectedNode.id));
                else if (selectedEdge) this._showConfirm(`Delete edge "${selectedEdge.id.substring(0, 10)}..."?`, () => this.space.removeEdge(selectedEdge.id));
                else handled = false;
                break;
            case 'Escape':
                if (this.space.isLinking) this.cancelLinking();
                else if (this.contextMenuElement.style.display === 'block') this._hideContextMenu();
                else if (this.confirmDialogElement.style.display === 'block') this._hideConfirm();
                else if (this.edgeMenuObject) this.space.setSelectedEdge(null);
                else if (selectedNode || selectedEdge) {
                    this.space.setSelectedNode(null);
                    this.space.setSelectedEdge(null);
                } else handled = false;
                break;
            case 'Enter':
                if (selectedNode instanceof HtmlNode && selectedNode.data.editable) selectedNode.htmlElement?.querySelector('.node-content')?.focus();
                else handled = false;
                break;
            case '+':
            case '=':
                if (selectedNode instanceof HtmlNode) (e.ctrlKey || e.metaKey) ? selectedNode.adjustNodeSize(1.2) : selectedNode.adjustContentScale(1.15);
                else handled = false;
                break;
            case '-':
            case '_':
                if (selectedNode instanceof HtmlNode) (e.ctrlKey || e.metaKey) ? selectedNode.adjustNodeSize(1 / 1.2) : selectedNode.adjustContentScale(1 / 1.15);
                else handled = false;
                break;
            case ' ':
                if (selectedNode) this.space.focusOnNode(selectedNode, 0.5, true);
                else if (selectedEdge) {
                    const midPoint = new THREE.Vector3().lerpVectors(selectedEdge.source.position, selectedEdge.target.position, 0.5);
                    const dist = selectedEdge.source.position.distanceTo(selectedEdge.target.position);
                    this.space.camera?.pushState();
                    this.space.camera?.moveTo(midPoint.x, midPoint.y, midPoint.z + dist * 0.6 + 100, 0.5, midPoint);
                } else this.space.centerView();
                break;
            default:
                handled = false;
        }
        if (handled) e.preventDefault();
    }

    _onWheel = (e) => {
        const targetInfo = this._getTargetInfo(e);
        // Allow scroll in specific UI elements or editable content
        if (e.target.closest('.node-controls, .edge-menu-frame') || targetInfo.contentEditable) return;

        if (e.ctrlKey || e.metaKey) {
            if (targetInfo.node instanceof HtmlNode) {
                e.preventDefault();
                e.stopPropagation();
                targetInfo.node.adjustContentScale(e.deltaY < 0 ? 1.1 : (1 / 1.1));
            } // Allow browser zoom otherwise
        } else {
            e.preventDefault();
            this.space.camera?.zoom(e.deltaY);
        }
    }

    _getTargetInfo(event) {
        const element = document.elementFromPoint(event.clientX, event.clientY);
        // Check for specific UI elements first
        const nodeElement = element?.closest('.node-common'); // Catches .node-html and .node-label-3d
        const resizeHandle = element?.closest('.resize-handle');
        const nodeControls = element?.closest('.node-controls button');
        const contentEditable = element?.closest('[contenteditable="true"]');
        const interactiveElement = element?.closest('button, input, textarea, select, a'); // Inside node content

        let node = nodeElement ? this.space.getNodeById(nodeElement.dataset.nodeId) : null;
        let intersectedObjectResult = null;

        // Raycast if not interacting with specific HTML node parts or if clicking background/label
        const needsRaycast = !element || !resizeHandle && !nodeControls && !contentEditable && !interactiveElement;
        if (needsRaycast) {
            intersectedObjectResult = this.space.intersectedObjects(event.clientX, event.clientY);
            // Prioritize raycast result for node if no element-based node found or if raycast hit mesh
            if (intersectedObjectResult?.node && (!node || nodeElement?.classList.contains('node-label-3d'))) {
                node = intersectedObjectResult.node;
            }
        }

        return {
            element, nodeElement, resizeHandle, nodeControls, contentEditable, interactiveElement,
            node, // The determined node (from element or raycast)
            intersectedEdge: intersectedObjectResult?.edge ?? null,
            intersectedObjectResult // Full raycast result
        };
    }


    _handleHover(e) {
        if (this.pointerState.down || this.draggedNode || this.resizedNode || this.space.isLinking) {
            if (this.hoveredEdge && this.hoveredEdge !== this.space.edgeSelected) {
                this.hoveredEdge.setHighlight(false);
                this.hoveredEdge = null;
            }
            return;
        }

        // Raycast to find hovered edge, ignoring nodes for hover effect
        const vec = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, this.space._cam);
        raycaster.params.Line.threshold = 5;
        const edgeLines = [...this.space.edges.values()].map(edge => edge.line).filter(Boolean);
        const intersects = edgeLines.length > 0 ? raycaster.intersectObjects(edgeLines, false) : [];
        const intersectedEdge = intersects.length > 0 ? this.space.getEdgeById(intersects[0].object.userData.edgeId) : null;


        if (this.hoveredEdge !== intersectedEdge) {
            if (this.hoveredEdge && this.hoveredEdge !== this.space.edgeSelected) this.hoveredEdge.setHighlight(false);
            this.hoveredEdge = intersectedEdge;
            if (this.hoveredEdge && this.hoveredEdge !== this.space.edgeSelected) this.hoveredEdge.setHighlight(true);
        }
    }

    _handlePointerDownControls(e, targetInfo) {
        if (targetInfo.nodeControls && targetInfo.node instanceof HtmlNode) {
            e.preventDefault();
            e.stopPropagation();
            const button = targetInfo.nodeControls;
            // Extract action from class list more robustly
            const actionClass = [...button.classList].find(cls => cls.startsWith('node-') && !cls.includes('button'));
            const action = actionClass?.substring('node-'.length);

            const actions = {
                'delete': () => this._showConfirm(`Delete node "${targetInfo.node.id.substring(0, 10)}..."?`, () => this.space.removeNode(targetInfo.node.id)),
                'content-zoom-in': () => targetInfo.node.adjustContentScale(1.15),
                'content-zoom-out': () => targetInfo.node.adjustContentScale(1 / 1.15),
                'grow': () => targetInfo.node.adjustNodeSize(1.2),
                'shrink': () => targetInfo.node.adjustNodeSize(1 / 1.2),
            };
            if (action && actions[action]) actions[action]();
            this._hideContextMenu();
            return true;
        }
        return false;
    }

    _handlePointerDownResize(e, targetInfo) {
        if (targetInfo.resizeHandle && targetInfo.node instanceof HtmlNode) {
            e.preventDefault();
            e.stopPropagation();
            this.resizedNode = targetInfo.node;
            this.resizedNode.startResize();
            this.resizeStartPos = {x: e.clientX, y: e.clientY}; // Store initial mouse pos
            this.resizeStartSize = {...this.resizedNode.size}; // Store initial node size
            this.container.style.cursor = 'nwse-resize';
            this._hideContextMenu();
            return true;
        }
        return false;
    }

    _handlePointerDownNode(e, targetInfo) {
        // Can drag if node exists and not clicking specific interactive sub-elements
        const canDrag = targetInfo.node && !targetInfo.nodeControls && !targetInfo.resizeHandle && !targetInfo.interactiveElement && !targetInfo.contentEditable;

        if (canDrag) {
            e.preventDefault();
            this.draggedNode = targetInfo.node;
            this.draggedNode.startDrag();
            const worldPos = this.space.screenToWorld(e.clientX, e.clientY, this.draggedNode.position.z);
            this.dragOffset = worldPos ? worldPos.sub(this.draggedNode.position) : new THREE.Vector3();
            this.container.style.cursor = 'grabbing';
            if (this.space.nodeSelected !== targetInfo.node) this.space.setSelectedNode(targetInfo.node);
            this._hideContextMenu();
            return true;
        }

        // If clicking interactive/editable content, select node but allow default interaction
        if (targetInfo.node && (targetInfo.interactiveElement || targetInfo.contentEditable)) {
            e.stopPropagation(); // Prevent background panning
            if (this.space.nodeSelected !== targetInfo.node) this.space.setSelectedNode(targetInfo.node);
            this._hideContextMenu();
            // Return false to allow default browser behavior (e.g., focus input, select text)
        }
        return false;
    }

    _handlePointerDownEdge(e, targetInfo) {
        // Select edge only if raycast hit edge AND didn't hit a node mesh closer
        if (targetInfo.intersectedEdge && !targetInfo.node) {
            e.preventDefault();
            if (this.space.edgeSelected !== targetInfo.intersectedEdge) this.space.setSelectedEdge(targetInfo.intersectedEdge);
            this._hideContextMenu();
            return true;
        }
        return false;
    }

    _handlePointerDownBackground(e, targetInfo) {
        // Start panning if click is on background (no node, no edge from raycast)
        if (!targetInfo.node && !targetInfo.intersectedEdge) {
            this._hideContextMenu();
            this.space.camera?.startPan(e.clientX, e.clientY);
            // Deselection happens on click up / document click
        }
        return false;
    }

    _getContextMenuItemsNode(node) {
        const items = [];
        if (node instanceof HtmlNode && node.data.editable) items.push({
            label: "Edit Content 📝",
            action: "edit-node",
            nodeId: node.id
        });
        items.push({label: "Start Link ✨", action: "start-link", nodeId: node.id});
        items.push({label: "Auto Zoom / Back 🖱️", action: "autozoom-node", nodeId: node.id});
        items.push({type: 'separator'});
        items.push({label: "Delete Node 🗑️", action: "delete-node", nodeId: node.id});
        return items;
    }

    _getContextMenuItemsEdge(edge) {
        return [
            {label: "Edit Style...", action: "edit-edge", edgeId: edge.id},
            {label: "Reverse Direction", action: "reverse-edge", edgeId: edge.id},
            {type: 'separator'},
            {label: "Delete Edge 🗑️", action: "delete-edge", edgeId: edge.id},
        ];
    }

    _getContextMenuItemsBackground(worldPos) {
        const items = [];
        if (worldPos) {
            const posStr = JSON.stringify({x: worldPos.x, y: worldPos.y, z: worldPos.z});
            items.push({label: "Create Note Here 📝", action: "create-note", position: posStr});
            items.push({label: "Create Box Here 📦", action: "create-box", position: posStr});
            items.push({label: "Create Sphere Here 🌐", action: "create-sphere", position: posStr});
        }
        items.push({type: 'separator'});
        items.push({label: "Center View 🧭", action: "center-view"});
        items.push({label: "Reset Zoom & Pan", action: "reset-view"});
        items.push({
            label: this.space.background.alpha === 0 ? "Set Dark Background" : "Set Transparent BG",
            action: "toggle-background"
        });
        return items;
    }

    _showContextMenu(x, y, items) {
        const cm = this.contextMenuElement;
        cm.innerHTML = '';
        const ul = document.createElement('ul');
        items.forEach(itemData => {
            const li = document.createElement('li');
            if (itemData.type === 'separator') {
                li.className = 'separator';
            } else {
                li.textContent = itemData.label;
                Object.entries(itemData).forEach(([k, v]) => {
                    if (k !== 'label' && k !== 'type' && v != null) li.dataset[k] = String(v);
                });
                if (itemData.disabled) li.classList.add('disabled');
            }
            ul.appendChild(li);
        });
        cm.appendChild(ul);

        const {offsetWidth: menuWidth, offsetHeight: menuHeight} = cm;
        const margin = 5;
        let finalX = (x + margin + menuWidth > window.innerWidth - margin) ? x - menuWidth - margin : x + margin;
        let finalY = (y + margin + menuHeight > window.innerHeight - margin) ? y - menuHeight - margin : y + margin;
        cm.style.left = `${Math.max(margin, finalX)}px`;
        cm.style.top = `${Math.max(margin, finalY)}px`;
        cm.style.display = 'block';
    }

    _hideContextMenu = () => {
        this.contextMenuElement.style.display = 'none';
        this.contextMenuElement.innerHTML = '';
    }

    _showConfirm(message, onConfirm) {
        const messageEl = $('#confirm-message', this.confirmDialogElement);
        if (messageEl) messageEl.textContent = message;
        this.confirmCallback = onConfirm;
        this.confirmDialogElement.style.display = 'block';
    }

    _hideConfirm = () => {
        this.confirmDialogElement.style.display = 'none';
        this.confirmCallback = null;
    }

    _startLinking(sourceNode) {
        if (!sourceNode || this.space.isLinking) return;
        this.space.isLinking = true;
        this.space.linkSourceNode = sourceNode;
        this.container.style.cursor = 'crosshair';
        this._createTempLinkLine(sourceNode);
        this._hideContextMenu();
    }

    _createTempLinkLine(sourceNode) {
        this._removeTempLinkLine();
        const material = new THREE.LineDashedMaterial({
            color: 0xffaa00,
            linewidth: 2,
            dashSize: 8,
            gapSize: 4,
            transparent: true,
            opacity: 0.9,
            depthTest: false
        });
        const points = [sourceNode.position.clone(), sourceNode.position.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.space.tempLinkLine = new THREE.Line(geometry, material);
        this.space.tempLinkLine.computeLineDistances();
        this.space.tempLinkLine.renderOrder = 1;
        this.space.scene.add(this.space.tempLinkLine);
    }

    _updateTempLinkLine(screenX, screenY) {
        if (!this.space.tempLinkLine || !this.space.linkSourceNode) return;
        const targetPos = this.space.screenToWorld(screenX, screenY, this.space.linkSourceNode.position.z);
        if (targetPos) {
            const positions = this.space.tempLinkLine.geometry.attributes.position;
            positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z);
            positions.needsUpdate = true;
            this.space.tempLinkLine.geometry.computeBoundingSphere();
            this.space.tempLinkLine.computeLineDistances();
        }
    }

    _removeTempLinkLine() {
        if (this.space.tempLinkLine) {
            this.space.tempLinkLine.geometry?.dispose();
            this.space.tempLinkLine.material?.dispose();
            this.space.scene.remove(this.space.tempLinkLine);
            this.space.tempLinkLine = null;
        }
    }

    _completeLinking(event) {
        this._removeTempLinkLine();
        const targetInfo = this._getTargetInfo(event);
        if (targetInfo.node && targetInfo.node !== this.space.linkSourceNode) {
            this.space.addEdge(this.space.linkSourceNode, targetInfo.node);
        }
        this.cancelLinking();
    }

    cancelLinking = () => {
        this._removeTempLinkLine();
        this.space.isLinking = false;
        this.space.linkSourceNode = null;
        this.container.style.cursor = 'grab';
        $$('.node-common.linking-target').forEach(el => el.classList.remove('linking-target'));
    }

    showEdgeMenu(edge) {
        if (!edge) return;
        this.hideEdgeMenu();

        const menuElement = this._createEdgeMenuElement(edge);
        this.edgeMenuObject = new CSS3DObject(menuElement);
        this.space.cssScene.add(this.edgeMenuObject); // Add to CSS scene
        this.updateEdgeMenuPosition();
    }

    _createEdgeMenuElement(edge) {
        const menu = document.createElement('div');
        menu.className = 'edge-menu-frame';
        menu.dataset.edgeId = edge.id;
        menu.innerHTML = `
            <input type="color" value="#${edge.data.color.toString(16).padStart(6, '0')}" title="Color" data-action="color">
            <input type="range" min="0.5" max="5" step="0.1" value="${edge.data.thickness}" title="Thickness" data-action="thickness">
            <select title="Constraint Type" data-action="constraintType">
                <option value="elastic" ${edge.data.constraintType === 'elastic' ? 'selected' : ''}>Elastic</option>
                <option value="rigid" ${edge.data.constraintType === 'rigid' ? 'selected' : ''}>Rigid</option>
                <option value="weld" ${edge.data.constraintType === 'weld' ? 'selected' : ''}>Weld</option>
            </select>
            <button title="Delete Edge" class="delete" data-action="delete">×</button>
        `;

        // Use pointerdown to stop propagation early and prevent pan/drag
        menu.addEventListener('pointerdown', e => e.stopPropagation());
        menu.addEventListener('wheel', e => e.stopPropagation()); // Prevent zoom

        menu.addEventListener('input', (e) => {
            const target = e.target;
            const action = target.dataset.action;
            const edgeId = menu.dataset.edgeId;
            const currentEdge = this.space.getEdgeById(edgeId);
            if (!currentEdge) return;

            switch (action) {
                case 'color':
                    currentEdge.data.color = parseInt(target.value.substring(1), 16);
                    currentEdge.setHighlight(this.space.edgeSelected === currentEdge); // Re-apply highlight state
                    break;
                case 'thickness':
                    currentEdge.data.thickness = parseFloat(target.value);
                    if (currentEdge.line?.material) currentEdge.line.material.linewidth = currentEdge.data.thickness;
                    break;
                case 'constraintType':
                    currentEdge.data.constraintType = target.value;
                    // Update default params if switching type
                    if (target.value === 'rigid' && !currentEdge.data.constraintParams?.distance) {
                        currentEdge.data.constraintParams = {
                            distance: currentEdge.source.position.distanceTo(currentEdge.target.position),
                            stiffness: 0.1
                        };
                    } else if (target.value === 'weld' && !currentEdge.data.constraintParams?.distance) {
                        currentEdge.data.constraintParams = {
                            distance: currentEdge.source.getBoundingSphereRadius() + currentEdge.target.getBoundingSphereRadius(),
                            stiffness: 0.5
                        };
                    } else if (target.value === 'elastic' && !currentEdge.data.constraintParams?.stiffness) {
                        currentEdge.data.constraintParams = {stiffness: 0.001, idealLength: 200};
                    }
                    this.space.layout?.kick();
                    break;
            }
        });

        menu.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button || button.dataset.action !== 'delete') return;
            const edgeId = menu.dataset.edgeId;
            this._showConfirm(`Delete edge "${edgeId?.substring(0, 10)}..."?`, () => this.space.removeEdge(edgeId));
        });

        return menu;
    }

    hideEdgeMenu = () => {
        if (this.edgeMenuObject) {
            this.edgeMenuObject.element?.remove();
            this.edgeMenuObject.parent?.remove(this.edgeMenuObject);
            this.edgeMenuObject = null;
        }
    }

    updateEdgeMenuPosition = () => {
        if (!this.edgeMenuObject || !this.space.edgeSelected) return;
        const edge = this.space.edgeSelected;
        const midPoint = new THREE.Vector3().lerpVectors(edge.source.position, edge.target.position, 0.5);
        this.edgeMenuObject.position.copy(midPoint);
        if (this.space.camera?._cam) { // Billboard effect
            this.edgeMenuObject.quaternion.copy(this.space.camera._cam.quaternion);
        }
    }

    dispose() {
        // Remove event listeners (ensure correct options if used)
        const opts = {passive: false};
        this.container.removeEventListener('pointerdown', this._onPointerDown);
        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
        this.container.removeEventListener('contextmenu', this._onContextMenu, opts);
        document.removeEventListener('click', this._onDocumentClick, true);
        this.contextMenuElement.removeEventListener('click', this._onContextMenuClick);
        $('#confirm-yes', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmYes);
        $('#confirm-no', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmNo);
        window.removeEventListener('keydown', this._onKeyDown);
        this.container.removeEventListener('wheel', this._onWheel, opts);

        this.hideEdgeMenu(); // Clean up edge menu object
        // Clear references
        this.space = null;
        this.container = null;
        this.contextMenuElement = null;
        this.confirmDialogElement = null;
        this.draggedNode = null;
        this.resizedNode = null;
        this.hoveredEdge = null;
        this.confirmCallback = null;
        console.log("UIManager disposed.");
    }
}

// --- Camera Class ---
class Camera {
    space = null;
    _cam = null;
    domElement = null;
    isPanning = false;
    panStart = new THREE.Vector2(); // Screen coords where pan started
    targetPosition = new THREE.Vector3();
    targetLookAt = new THREE.Vector3();
    currentLookAt = new THREE.Vector3();
    viewHistory = [];
    currentTargetNodeId = null;
    initialState = null;
    zoomSpeed = 1.0;
    panSpeed = 0.8;
    minZoomDistance = 20;
    maxZoomDistance = 15000;
    dampingFactor = 0.12;
    maxHistory = 20;
    animationFrameId = null;

    constructor(space) {
        if (!space?._cam || !space.container) throw new Error("Camera requires SpaceGraph instance with camera and container.");
        this.space = space;
        this._cam = space._cam;
        this.domElement = space.container;
        this.targetPosition.copy(this._cam.position);
        // Initial lookAt is projected onto Z=0 plane from initial camera position
        this.targetLookAt.set(this._cam.position.x, this._cam.position.y, 0);
        this.currentLookAt.copy(this.targetLookAt);
        this._startUpdateLoop();
    }

    setInitialState() {
        if (!this.initialState) {
            // Capture the state *after* the first centerView/focus
            this.initialState = {position: this.targetPosition.clone(), lookAt: this.targetLookAt.clone()};
        }
    }

    startPan(startX, startY) {
        if (this.isPanning) return;
        this.isPanning = true;
        this.panStart.set(startX, startY);
        this.domElement.classList.add('panning');
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        this.currentTargetNodeId = null; // User interaction overrides autozoom target
    }

    pan(deltaX, deltaY) {
        if (!this.isPanning) return;
        // Calculate pan distance based on camera distance to lookAt point
        const cameraDist = this._cam.position.distanceTo(this.currentLookAt);
        const vFOV = this._cam.fov * Utils.DEG2RAD;
        const viewHeight = this.domElement.clientHeight || window.innerHeight;
        // Calculate world units per pixel at the lookAt distance
        const visibleHeight = 2 * Math.tan(vFOV / 2) * Math.max(1, cameraDist); // Avoid dist=0
        const worldUnitsPerPixel = visibleHeight / viewHeight;

        const panX = -deltaX * worldUnitsPerPixel * this.panSpeed;
        const panY = deltaY * worldUnitsPerPixel * this.panSpeed;

        // Get camera's local right and up vectors
        const right = new THREE.Vector3().setFromMatrixColumn(this._cam.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(this._cam.matrixWorld, 1);

        // Calculate pan offset in world space
        const panOffset = right.multiplyScalar(panX).add(up.multiplyScalar(panY));

        // Apply offset to both target position and lookAt point
        this.targetPosition.add(panOffset);
        this.targetLookAt.add(panOffset);

        // Update panStart for next delta calculation (handled in _onPointerMove)
    }

    endPan = () => {
        if (this.isPanning) {
            this.isPanning = false;
            this.domElement.classList.remove('panning');
        }
    }

    zoom(deltaY) {
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        this.currentTargetNodeId = null;
        const zoomFactor = Math.pow(0.95, deltaY * 0.05 * this.zoomSpeed);
        const lookAtToCam = new THREE.Vector3().subVectors(this.targetPosition, this.targetLookAt);
        let newDist = Utils.clamp(lookAtToCam.length() * zoomFactor, this.minZoomDistance, this.maxZoomDistance);
        this.targetPosition.copy(this.targetLookAt).addScaledVector(lookAtToCam.normalize(), newDist);
    }

    moveTo(x, y, z, duration = 0.7, lookAtTarget = null) {
        this.setInitialState(); // Ensure initial state exists
        const targetPos = new THREE.Vector3(x, y, z);
        // Default lookAt is XY of target, Z of current lookAt (avoids sudden Z jumps)
        const targetLook = lookAtTarget instanceof THREE.Vector3 ? lookAtTarget.clone() : new THREE.Vector3(x, y, this.targetLookAt.z);
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        const ease = "power3.out";
        gsap.to(this.targetPosition, {x: targetPos.x, y: targetPos.y, z: targetPos.z, duration, ease, overwrite: true});
        gsap.to(this.targetLookAt, {
            x: targetLook.x,
            y: targetLook.y,
            z: targetLook.z,
            duration,
            ease,
            overwrite: true
        });
    }

    resetView(duration = 0.7) {
        if (this.initialState) this.moveTo(this.initialState.position.x, this.initialState.position.y, this.initialState.position.z, duration, this.initialState.lookAt);
        else this.moveTo(0, 0, 700, duration, new THREE.Vector3(0, 0, 0)); // Fallback default
        this.viewHistory = [];
        this.currentTargetNodeId = null;
    }

    pushState() {
        if (this.viewHistory.length >= this.maxHistory) this.viewHistory.shift();
        // Store the *target* state, not the potentially lagging current state
        this.viewHistory.push({
            position: this.targetPosition.clone(),
            lookAt: this.targetLookAt.clone(),
            targetNodeId: this.currentTargetNodeId
        });
    }

    popState(duration = 0.6) {
        const prevState = this.viewHistory.pop();
        if (prevState) {
            this.moveTo(prevState.position.x, prevState.position.y, prevState.position.z, duration, prevState.lookAt);
            this.currentTargetNodeId = prevState.targetNodeId;
        } else {
            this.resetView(duration); // Go to initial state if history empty
        }
    }

    getCurrentTargetNodeId = () => this.currentTargetNodeId;
    setCurrentTargetNodeId = (nodeId) => {
        this.currentTargetNodeId = nodeId;
    };

    _startUpdateLoop = () => {
        const deltaPos = this.targetPosition.distanceTo(this._cam.position);
        const deltaLookAt = this.targetLookAt.distanceTo(this.currentLookAt);
        const epsilon = 0.01; // Threshold to stop lerping

        // Only update if moving, panning, or animating significantly
        const needsUpdate = deltaPos > epsilon || deltaLookAt > epsilon || this.isPanning || gsap.isTweening(this.targetPosition) || gsap.isTweening(this.targetLookAt);

        if (needsUpdate) {
            this._cam.position.lerp(this.targetPosition, this.dampingFactor);
            this.currentLookAt.lerp(this.targetLookAt, this.dampingFactor);
            this._cam.lookAt(this.currentLookAt);
            // No need for updateProjectionMatrix unless FOV/aspect changes
        } else if (deltaPos > 0 || deltaLookAt > 0) { // Snap to final position if close enough
            this._cam.position.copy(this.targetPosition);
            this.currentLookAt.copy(this.targetLookAt);
            this._cam.lookAt(this.currentLookAt);
        }
        this.animationFrameId = requestAnimationFrame(this._startUpdateLoop);
    }

    dispose() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        this.space = null;
        this._cam = null;
        this.domElement = null;
        this.viewHistory = [];
        console.log("Camera disposed.");
    }
}

export class ForceLayout {
    space = null;
    nodes = [];
    edges = [];
    velocities = new Map(); // Map<nodeId, THREE.Vector3>
    fixedNodes = new Set(); // Set<Node>
    isRunning = false;
    animationFrameId = null;
    totalEnergy = Infinity;
    lastKickTime = 0;
    autoStopTimeout = null;

    settings = {
        repulsion: 3000,        // Base repulsion strength
        centerStrength: 0.0005,  // Gravity towards center
        damping: 0.92,          // Velocity damping (0-1)
        minEnergyThreshold: 0.1,// Threshold to auto-stop
        gravityCenter: new THREE.Vector3(0, 0, 0),
        zSpreadFactor: 0.15,     // Reduces Z-axis forces
        autoStopDelay: 4000,    // ms of low energy before stopping
        nodePadding: 1.2,       // Multiplier for node radius in repulsion
        // Default constraint params (can be overridden by edge.data.constraintParams)
        defaultElasticStiffness: 0.001,
        defaultElasticIdealLength: 200,
        defaultRigidStiffness: 0.1,
        defaultWeldStiffness: 0.5,
    };

    constructor(space, config = {}) {
        if (!space) throw new Error("ForceLayout requires a SpaceGraph instance.");
        this.space = space;
        this.settings = {...this.settings, ...config};
    }

    addNode(node) {
        if (!this.nodes.some(n => n.id === node.id)) {
            this.nodes.push(node);
            this.velocities.set(node.id, new THREE.Vector3());
            this.kick();
        }
    }

    removeNode(node) {
        this.nodes = this.nodes.filter(n => n !== node);
        this.velocities.delete(node.id);
        this.fixedNodes.delete(node);
        if (this.nodes.length < 2) this.stop(); else this.kick();
    }

    addEdge(edge) {
        if (!this.edges.includes(edge)) {
            this.edges.push(edge);
            this.kick();
        }
    }

    removeEdge(edge) {
        this.edges = this.edges.filter(e => e !== edge);
        this.kick();
    }

    fixNode(node) {
        if (this.nodes.includes(node)) {
            this.fixedNodes.add(node);
            this.velocities.get(node.id)?.set(0, 0, 0);
        }
    }

    releaseNode(node) {
        this.fixedNodes.delete(node); /* Kick happens on drag/resize end */
    }

    runOnce(steps = 100) {
        console.log(`ForceLayout: Running ${steps} initial steps...`);
        let i = 0;
        for (; i < steps; i++) {
            if (this._calculateStep() < this.settings.minEnergyThreshold) break;
        }
        console.log(`ForceLayout: Initial steps completed after ${i} iterations.`);
        this.space.updateNodesAndEdges(); // Update visuals once after settling
    }

    start() {
        if (this.isRunning || this.nodes.length < 2) return;
        console.log("ForceLayout: Starting simulation.");
        this.isRunning = true;
        this.lastKickTime = Date.now();
        const loop = () => {
            if (!this.isRunning) return;
            this.totalEnergy = this._calculateStep();
            // Visual updates happen in SpaceGraph.animate loop
            const timeSinceKick = Date.now() - this.lastKickTime;
            if (this.totalEnergy < this.settings.minEnergyThreshold && timeSinceKick > this.settings.autoStopDelay) {
                this.stop();
            } else {
                this.animationFrameId = requestAnimationFrame(loop);
            }
        };
        this.animationFrameId = requestAnimationFrame(loop);
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        clearTimeout(this.autoStopTimeout);
        this.animationFrameId = null;
        this.autoStopTimeout = null;
        console.log("ForceLayout: Simulation stopped. Energy:", this.totalEnergy.toFixed(4));
    }

    kick(intensity = 1) {
        if (this.nodes.length < 1) return;
        this.lastKickTime = Date.now();
        this.totalEnergy = Infinity;
        const impulse = new THREE.Vector3();
        this.nodes.forEach(node => {
            if (!this.fixedNodes.has(node)) {
                impulse.set(Math.random() - 0.5, Math.random() - 0.5, (Math.random() - 0.5) * this.settings.zSpreadFactor)
                    .normalize().multiplyScalar(intensity * (0.5 + Math.random())); // Slightly randomized intensity
                this.velocities.get(node.id)?.add(impulse);
            }
        });
        if (!this.isRunning) this.start();
        // Reset auto-stop timer
        clearTimeout(this.autoStopTimeout);
        this.autoStopTimeout = setTimeout(() => {
            if (this.isRunning && this.totalEnergy < this.settings.minEnergyThreshold) this.stop();
        }, this.settings.autoStopDelay);
    }

    setSettings(newSettings) {
        this.settings = {...this.settings, ...newSettings};
        console.log("ForceLayout settings updated:", this.settings);
        this.kick();
    }

    _calculateStep() {
        if (this.nodes.length < 2) return 0;
        let currentTotalEnergy = 0;
        const forces = new Map(this.nodes.map(node => [node.id, new THREE.Vector3()]));
        const {repulsion, centerStrength, gravityCenter, zSpreadFactor, damping, nodePadding} = this.settings;
        const tempDelta = new THREE.Vector3(); // Reusable vector

        // 1. Repulsion Force (Node-Node)
        for (let i = 0; i < this.nodes.length; i++) {
            const nodeA = this.nodes[i];
            for (let j = i + 1; j < this.nodes.length; j++) {
                const nodeB = this.nodes[j];
                tempDelta.subVectors(nodeB.position, nodeA.position);
                let distSq = tempDelta.lengthSq();
                if (distSq < 1e-3) { // Avoid singularity
                    distSq = 1e-3;
                    tempDelta.randomDirection().multiplyScalar(0.1); // Apply tiny random push
                }
                const distance = Math.sqrt(distSq);
                // Use node's bounding sphere for consistent padding calculation
                const radiusA = nodeA.getBoundingSphereRadius();
                const radiusB = nodeB.getBoundingSphereRadius();
                const combinedRadius = (radiusA + radiusB) * nodePadding;
                // Repulsion = base inverse square + extra force if overlapping
                let forceMag = -repulsion / distSq;
                const overlap = combinedRadius - distance;
                if (overlap > 0) {
                    // Stronger pushback when overlapping, proportional to overlap squared
                    forceMag -= (repulsion * overlap ** 2 * 0.01) / distance; // Tunable factor
                }

                const forceVec = tempDelta.normalize().multiplyScalar(forceMag);
                forceVec.z *= zSpreadFactor; // Reduce Z component
                if (!this.fixedNodes.has(nodeA)) forces.get(nodeA.id)?.add(forceVec);
                if (!this.fixedNodes.has(nodeB)) forces.get(nodeB.id)?.sub(forceVec); // Equal and opposite
            }
        }

        // 2. Edge Constraints
        this.edges.forEach(edge => {
            const {source, target, data} = edge;
            if (!source || !target || !this.velocities.has(source.id) || !this.velocities.has(target.id)) return; // Skip if nodes removed
            tempDelta.subVectors(target.position, source.position);
            const distance = tempDelta.length() + 1e-6; // Add epsilon
            let forceMag = 0;
            const params = data.constraintParams ?? {};

            switch (data.constraintType) {
                case 'rigid':
                    const targetDist = params.distance ?? this.settings.defaultElasticIdealLength; // Fallback to elastic length if no distance set
                    const rStiffness = params.stiffness ?? this.settings.defaultRigidStiffness;
                    forceMag = rStiffness * (distance - targetDist);
                    break;
                case 'weld':
                    // Target distance is sum of radii, strong stiffness
                    const weldDist = params.distance ?? (source.getBoundingSphereRadius() + target.getBoundingSphereRadius());
                    const wStiffness = params.stiffness ?? this.settings.defaultWeldStiffness;
                    forceMag = wStiffness * (distance - weldDist);
                    break;
                case 'elastic':
                default:
                    const idealLen = params.idealLength ?? this.settings.defaultElasticIdealLength;
                    const eStiffness = params.stiffness ?? this.settings.defaultElasticStiffness;
                    forceMag = eStiffness * (distance - idealLen); // Hooke's Law
                    break;
            }

            const forceVec = tempDelta.normalize().multiplyScalar(forceMag);
            forceVec.z *= zSpreadFactor; // Reduce Z component
            if (!this.fixedNodes.has(source)) forces.get(source.id)?.add(forceVec);
            if (!this.fixedNodes.has(target)) forces.get(target.id)?.sub(forceVec);
        });

        // 3. Center Gravity Force
        if (centerStrength > 0) {
            this.nodes.forEach(node => {
                if (this.fixedNodes.has(node)) return;
                const forceVec = tempDelta.subVectors(gravityCenter, node.position).multiplyScalar(centerStrength);
                forceVec.z *= zSpreadFactor * 0.5; // Weaker Z gravity
                forces.get(node.id)?.add(forceVec);
            });
        }

        // 4. Apply Forces and Update Velocities/Positions
        this.nodes.forEach(node => {
            if (this.fixedNodes.has(node)) return;
            const force = forces.get(node.id);
            const velocity = this.velocities.get(node.id);
            if (!force || !velocity) return; // Should not happen

            const mass = node.mass || 1.0; // Use node's mass
            // a = F / m
            const acceleration = tempDelta.copy(force).divideScalar(mass); // Reuse tempDelta
            // v = (v + a) * damping
            velocity.add(acceleration).multiplyScalar(damping);

            // Limit velocity to prevent nodes escaping to infinity
            const speed = velocity.length();
            const maxSpeed = 100; // Tunable max speed per step
            if (speed > maxSpeed) {
                velocity.multiplyScalar(maxSpeed / speed);
            }

            // p = p + v
            node.position.add(velocity);

            // Accumulate kinetic energy (using mass)
            currentTotalEnergy += 0.5 * mass * velocity.lengthSq();
        });

        return currentTotalEnergy;
    }

    dispose() {
        this.stop();
        this.nodes = [];
        this.edges = [];
        this.velocities.clear();
        this.fixedNodes.clear();
        this.space = null;
        console.log("ForceLayout disposed.");
    }
}

