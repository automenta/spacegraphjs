import * as THREE from 'three';
import {CSS3DObject, CSS3DRenderer} from 'three/addons/renderers/CSS3DRenderer.js';
import {gsap} from "gsap";

export const $ = (selector, context = document) => context.querySelector(selector);
export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
export const lerp = (a, b, t) => a + (b - a) * t;
export const generateId = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const DEG2RAD = Math.PI / 180;

export class SpaceGraph {
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
    background = {color: 0x000000, alpha: 0.0}; 

    constructor(containerElement, uiElements = {}) {
        if (!containerElement) throw new Error("SpaceGraph requires a container element.");
        this.container = containerElement;

        this.scene = new THREE.Scene(); 
        this.cssScene = new THREE.Scene(); 

        this._camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 20000);
        this._camera.position.z = 700;

        this._setupRenderers();
        this.setBackground(this.background.color, this.background.alpha);

        this.cameraController = new CameraController(this._camera, this.container); 
        this.layoutEngine = new ForceLayout(this); 

        this.uiManager = new UIManager(this, uiElements);

        this._setupLighting();

        this.centerView(null, 0);
        this.cameraController.setInitialState(); 

        window.addEventListener('resize', this._onWindowResize.bind(this), false);

        this._animate();
        this.layoutEngine.start(); 
    }

    _setupRenderers() {
        this.webglCanvas = $('#webgl-canvas', this.container);
        if (!this.webglCanvas) {
            this.webglCanvas = document.createElement('canvas');
            this.webglCanvas.id = 'webgl-canvas';
            this.container.appendChild(this.webglCanvas);
        }
        this.webglRenderer = new THREE.WebGLRenderer({
            canvas: this.webglCanvas,
            antialias: true,
            alpha: true
        });
        this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
        this.webglRenderer.setPixelRatio(window.devicePixelRatio);

        this.css3dContainer = $('#css3d-container', this.container);
        if(!this.css3dContainer) {
            this.css3dContainer = document.createElement('div');
            this.css3dContainer.id = 'css3d-container';
            this.container.appendChild(this.css3dContainer);
        }
        Object.assign(this.css3dContainer.style, {
            position: 'absolute', inset: '0', width: '100%',
            height: '100%', pointerEvents: 'none', zIndex: '2' 
        });

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
    
    setBackground(color = 0x000000, alpha = 0.0) {
        this.background = {color, alpha};
        this.webglRenderer.setClearColor(color, alpha);
        this.webglCanvas.style.backgroundColor = alpha === 0 ? 'transparent' : `#${color.toString(16).padStart(6, '0')}`;
    }

    addNode(nodeInstance) {
        if (!nodeInstance.id) nodeInstance.id = generateId('node');
        if (this.nodes.has(nodeInstance.id)) return this.nodes.get(nodeInstance.id);

        this.nodes.set(nodeInstance.id, nodeInstance);
        nodeInstance.spaceGraph = this; 

        if (nodeInstance.cssObject) this.cssScene.add(nodeInstance.cssObject);
        if (nodeInstance.mesh) this.scene.add(nodeInstance.mesh); 
        if (nodeInstance.labelObject) this.cssScene.add(nodeInstance.labelObject); 

        this.layoutEngine?.addNode(nodeInstance);
        return nodeInstance;
    }

    removeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        if (this.selectedNode === node) this.setSelectedNode(null);
        if (this.linkSourceNode === node) this.uiManager?.cancelLinking();

        const edgesToRemove = [...this.edges.values()].filter(edge => edge.source === node || edge.target === node);
        edgesToRemove.forEach(edge => this.removeEdge(edge.id));

        node.dispose(); 
        this.nodes.delete(nodeId);
        this.layoutEngine?.removeNode(node);
    }

    addEdge(sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode || sourceNode === targetNode) return null;
        if ([...this.edges.values()].some(e => (e.source === sourceNode && e.target === targetNode) || (e.source === targetNode && e.target === sourceNode))) {
             console.warn("Duplicate edge ignored:", sourceNode.id, targetNode.id);
            return null;
        }

        const edgeId = generateId('edge');
        const edge = new Edge(edgeId, sourceNode, targetNode, data);
        edge.spaceGraph = this; 
        this.edges.set(edgeId, edge);
        if (edge.threeObject) this.scene.add(edge.threeObject); 
        this.layoutEngine?.addEdge(edge);
        return edge;
    }

    removeEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) return;
        if (this.selectedEdge === edge) this.setSelectedEdge(null);
        edge.dispose();
        this.edges.delete(edgeId);
        this.layoutEngine?.removeEdge(edge);
    }

    getNodeById = (id) => this.nodes.get(id);
    getEdgeById = (id) => this.edges.get(id);

    _updateNodesAndEdges() { 
        this.nodes.forEach(node => node.update(this));
        this.edges.forEach(edge => edge.update(this));
        this.uiManager?.updateEdgeMenuPosition();
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
        let targetPos;
        if (targetPosition instanceof THREE.Vector3) {
            targetPos = targetPosition.clone();
        } else if (this.nodes.size > 0) {
            targetPos = new THREE.Vector3();
            this.nodes.forEach(node => targetPos.add(node.position));
            targetPos.divideScalar(this.nodes.size);
        } else {
             targetPos = new THREE.Vector3(0,0,0); 
        }
        const distance = this.nodes.size > 1 ? 700 : 400; 
        this.cameraController.moveTo(targetPos.x, targetPos.y, targetPos.z + distance, duration, targetPos);
    }

    focusOnNode(node, duration = 0.6, pushHistory = false) {
        if (!node || !this.cameraController || !this._camera) return;
        const targetPos = node.position.clone();

        const fov = this._camera.fov * DEG2RAD;
        const aspect = this._camera.aspect;
        let nodeSize = 100; 

        if (node.getBoundingSphereRadius) { 
             nodeSize = node.getBoundingSphereRadius() * 2;
        } else if (node.size) { 
             nodeSize = Math.max(node.size.width / aspect, node.size.height) * 1.2; 
        }
        
        const distance = (nodeSize / (2 * Math.tan(fov / 2))) + 50; 

        if (pushHistory) this.cameraController.pushState();
        this.cameraController.moveTo(targetPos.x, targetPos.y, targetPos.z + distance, duration, targetPos);
    }
    
    autoZoom(node) {
        if (!node || !this.cameraController) return;
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
        const vec = new THREE.Vector3((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1, 0.5);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, this._camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -targetZ);
        const intersectPoint = new THREE.Vector3();
        return raycaster.ray.intersectPlane(plane, intersectPoint) ? intersectPoint : null;
    }

    setSelectedNode(node) {
        if (this.selectedNode === node) return;
        this.selectedNode?.setSelectedStyle(false); 
        if(this.selectedNode?.htmlElement) this.selectedNode.htmlElement.classList.remove('selected');

        this.selectedNode = node;
        this.selectedNode?.setSelectedStyle(true); 
        if(this.selectedNode?.htmlElement) this.selectedNode.htmlElement.classList.add('selected');

        if (node) this.setSelectedEdge(null);
    }

    setSelectedEdge(edge) {
        if (this.selectedEdge === edge) return;
        this.selectedEdge?.setHighlight(false);
        this.uiManager?.hideEdgeMenu();

        this.selectedEdge = edge;
        this.selectedEdge?.setHighlight(true);

        if (edge) {
            this.setSelectedNode(null);
            this.uiManager?.showEdgeMenu(edge);
        }
    }

    intersectedObject(screenX, screenY) {
        const vec = new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, this._camera); 
        raycaster.params.Line.threshold = 5;

        const nodeMeshes = [...this.nodes.values()].map(n => n.mesh).filter(Boolean);
        if (nodeMeshes.length > 0) {
            const intersects = raycaster.intersectObjects(nodeMeshes);
            if (intersects.length > 0) {
                const intersectedMesh = intersects[0].object;
                return [...this.nodes.values()].find(n => n.mesh === intersectedMesh);
            }
        }

        const edgeObjects = [...this.edges.values()].map(e => e.threeObject).filter(Boolean);
        if (edgeObjects.length > 0) {
            const intersects = raycaster.intersectObjects(edgeObjects);
            if (intersects.length > 0) {
                const intersectedLine = intersects[0].object;
                return [...this.edges.values()].find(edge => edge.threeObject === intersectedLine);
            }
        }
        return null;
    }
    
    dispose() {
        this.cameraController?.dispose();
        this.layoutEngine?.stop();
        this.nodes.forEach(node => node.dispose());
        this.edges.forEach(edge => edge.dispose());
        this.nodes.clear();
        this.edges.clear();

        this.scene?.clear();
        this.cssScene?.clear();

        this.webglRenderer?.dispose();
        this.cssRenderer?.domElement?.remove();
        this.css3dContainer?.remove();
        this.webglCanvas?.remove();

        window.removeEventListener('resize', this._onWindowResize);
        this.uiManager?.dispose(); 
        console.log("SpaceGraph disposed.");
    }
}

class BaseNode {
    id = null;
    spaceGraph = null; 
    position = new THREE.Vector3();
    data = {}; 
    mass = 1.0; 

    mesh = null; 
    cssObject = null; 
    htmlElement = null; 
    labelObject = null; 

    constructor(id, position = {x: 0, y: 0, z: 0}, data = {}, mass = 1.0) {
        this.id = id ?? generateId('node');
        this.position.set(position.x, position.y, position.z);
        this.data = { ...this.getDefaultData(), ...data };
        this.mass = Math.max(0.1, mass);
    }

    getDefaultData() { return { label: this.id }; }

    setPosition(x, y, z) { this.position.set(x, y, z); }

    update(spaceGraphInstance) {  }
    dispose() {  }
    
    getBoundingSphereRadius() { return 10; } 
    setSelectedStyle(selected) {  }

    startDrag() {
        this.htmlElement?.classList.add('dragging');
        this.spaceGraph?.layoutEngine?.fixNode(this);
    }

    drag(newPosition) {
        this.setPosition(newPosition.x, newPosition.y, newPosition.z);
    }

    endDrag() {
        this.htmlElement?.classList.remove('dragging');
        this.spaceGraph?.layoutEngine?.releaseNode(this);
        this.spaceGraph?.layoutEngine?.kick(); 
    }
}

export class HtmlNodeElement extends BaseNode {
    size = {width: 160, height: 70};
    billboard = true; 

    constructor(id, position = {x: 0, y: 0, z: 0}, data = {}) {
        super(id, position, data, data.mass ?? 1.0); 
        this.size.width = data.width ?? this.size.width;
        this.size.height = data.height ?? this.size.height;
        this.billboard = data.billboard ?? this.billboard;

        this.htmlElement = this._createHtmlElement();
        this.cssObject = new CSS3DObject(this.htmlElement);
        this.cssObject.userData = { nodeId: this.id, type: 'html-node' };
        
        this.update(); 
        this.setContentScale(this.data.contentScale ?? 1.0);
        if (this.data.backgroundColor) {
            this.setBackgroundColor(this.data.backgroundColor);
        }
    }

    getDefaultData() {
        return {
            label: '', content: '', type: 'html', 
            width: 160, height: 70, contentScale: 1.0,
            backgroundColor: 'var(--node-bg-default)', 
            editable: false 
        };
    }

    _createHtmlElement() {
        const el = document.createElement('div');
        el.className = 'node-html'; 
        if (this.data.type === 'note') el.classList.add('note-node'); 
        el.id = `node-html-${this.id}`;
        el.dataset.nodeId = this.id;
        el.style.width = `${this.size.width}px`;
        el.style.height = `${this.size.height}px`;

        el.innerHTML = `
          <div class="node-inner-wrapper">
              <div class="node-content" spellcheck="false" style="transform: scale(${this.data.contentScale});">${this.data.label || this.data.content || ''}</div>
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
        if(this.data.editable) this._initContentEditable(el);
        return el;
    }
    
    _initContentEditable(element) {
        const contentDiv = $('.node-content', element);
        if (contentDiv) { 
            contentDiv.contentEditable = "true";
            let debounceTimer;
            contentDiv.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.data.content = contentDiv.innerHTML; 
                    this.data.label = contentDiv.textContent || ''; 
                }, 300);
            });
            contentDiv.addEventListener('pointerdown', e => e.stopPropagation());
            contentDiv.addEventListener('touchstart', e => e.stopPropagation(), {passive: true});
            contentDiv.addEventListener('wheel', e => {
                if (contentDiv.scrollHeight > contentDiv.clientHeight || contentDiv.scrollWidth > contentDiv.clientWidth) {
                    e.stopPropagation();
                }
            }, {passive: false});
        }
    }

    setPosition(x, y, z) {
        super.setPosition(x,y,z);
        if (this.cssObject) this.cssObject.position.copy(this.position);
    }

    setSize(width, height, scaleContent = false) {
        const oldWidth = this.size.width;
        const oldHeight = this.size.height;
        this.size.width = Math.max(80, width); 
        this.size.height = Math.max(40, height); 
        if (this.htmlElement) {
            this.htmlElement.style.width = `${this.size.width}px`;
            this.htmlElement.style.height = `${this.size.height}px`;
        }
        if (scaleContent && oldWidth > 0 && oldHeight > 0) {
            const scaleFactor = Math.sqrt((this.size.width * this.size.height) / (oldWidth * oldHeight));
            this.setContentScale(this.data.contentScale * scaleFactor);
        }
        this.data.width = this.size.width; 
        this.data.height = this.size.height; 
        this.spaceGraph?.layoutEngine?.kick();
    }

    setContentScale(scale) {
        this.data.contentScale = clamp(scale, 0.3, 3.0);
        const contentEl = this.htmlElement?.querySelector('.node-content');
        if (contentEl) contentEl.style.transform = `scale(${this.data.contentScale})`;
    }
    
    setBackgroundColor(color) {
        this.data.backgroundColor = color;
        this.htmlElement?.style.setProperty('--node-bg', this.data.backgroundColor);
    }

    adjustContentScale(deltaFactor) { 
        this.setContentScale(this.data.contentScale * deltaFactor);
    }
    adjustNodeSize(factor) {
        this.setSize(this.size.width * factor, this.size.height * factor, false);
    }

    update(spaceGraphInstance) { 
        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            if (this.billboard && spaceGraphInstance?._camera) {
                 this.cssObject.quaternion.copy(spaceGraphInstance._camera.quaternion);
            }
        }
    }

    dispose() {
        super.dispose();
        this.htmlElement?.remove();
        this.cssObject?.parent?.remove(this.cssObject);
        this.htmlElement = null;
        this.cssObject = null;
    }
    
    getBoundingSphereRadius() {
        return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2 * (this.data.contentScale ?? 1.0);
    }

    setSelectedStyle(selected) {
        this.htmlElement?.classList.toggle('selected', selected);
    }

    startResize() {
        this.htmlElement?.classList.add('resizing');
        this.spaceGraph?.layoutEngine?.fixNode(this);
    }
    resize(newWidth, newHeight) { this.setSize(newWidth, newHeight); }
    endResize() {
        this.htmlElement?.classList.remove('resizing');
        this.spaceGraph?.layoutEngine?.releaseNode(this);
    }
}

export class NoteNode extends HtmlNodeElement {
    constructor(id, pos = {x: 0, y: 0, z: 0}, data = {content: ''}) {
        const mergedData = { ...data, type: 'note', editable: true, label: data.content || data.label };
        super(id, pos, mergedData);
    }
}

export class ShapeNode extends BaseNode {
    shape = 'sphere'; 
    size = 50;    
    color = 0xffffff; 

    constructor(id, position, data = {}, mass = 1.5) {
        super(id, position, data, mass); 
        this.shape = this.data.shape ?? this.shape;
        this.size = this.data.size ?? this.size;
        this.color = this.data.color ?? this.color;

        this.mesh = this._createMesh();
        this.mesh.userData = { nodeId: this.id, type: 'shape-node' };

        if (this.data.label) {
            this.labelObject = this._createLabel();
            this.labelObject.userData = { nodeId: this.id, type: 'shape-label' };
        }
        this.update(); 
    }

    getDefaultData() {
        return { label: '', shape: 'sphere', size: 50, color: 0xffffff, type: 'shape' };
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
        }
        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.6,
            metalness: 0.2,
        });
        return new THREE.Mesh(geometry, material);
    }

    _createLabel() {
        const div = document.createElement('div');
        div.className = 'node-label-3d'; 
        div.textContent = this.data.label;
        div.dataset.nodeId = this.id;
        Object.assign(div.style, {
            color: 'white', backgroundColor: 'rgba(0,0,0,0.6)', padding: '3px 6px',
            borderRadius: '4px', fontSize: '14px', pointerEvents: 'none',
            textAlign: 'center',
        });
        return new CSS3DObject(div);
    }

    update(spaceGraphInstance) { 
        if (this.mesh) this.mesh.position.copy(this.position);
        if (this.labelObject) {
            const offset = this.getBoundingSphereRadius() * 1.1 + 10; 
            this.labelObject.position.copy(this.position).y += offset;
            if (spaceGraphInstance?._camera) { 
                this.labelObject.quaternion.copy(spaceGraphInstance._camera.quaternion);
            }
        }
    }
    
    dispose() {
        super.dispose();
        this.mesh?.geometry?.dispose();
        this.mesh?.material?.dispose();
        this.mesh?.parent?.remove(this.mesh);
        this.mesh = null;

        this.labelObject?.element?.remove();
        this.labelObject?.parent?.remove(this.labelObject);
        this.labelObject = null;
    }

    getBoundingSphereRadius() {
        switch (this.shape) {
            case 'box': return Math.sqrt(3 * (this.size / 2) ** 2); 
            case 'sphere':
            default: return this.size / 2;
        }
    }

    setSelectedStyle(selected) {
        if (this.mesh?.material) {
            this.mesh.material.emissive?.setHex(selected ? 0x888800 : 0x000000); 
        }
        this.labelObject?.element?.classList.toggle('selected', selected);
    }
}

export class Edge {
    spaceGraph = null; 
    threeObject = null; 
    data = {
        color: 0x00d0ff,
        thickness: 1.5,
        style: 'solid', 
        constraintType: 'elastic', 
        constraintParams: { stiffness: 0.001, idealLength: 200 } 
    };

    constructor(id, sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode) throw new Error("Edge requires valid source and target nodes.");
        this.id = id;
        this.source = sourceNode;
        this.target = targetNode;
        const defaultConstraintParams = {
            ...(this.data.constraintType === 'elastic' ? { stiffness: 0.001, idealLength: 200 } :
                this.data.constraintType === 'rigid' ? { distance: sourceNode.position.distanceTo(targetNode.position), stiffness: 0.1 } :
                this.data.constraintType === 'weld' ? { distance: sourceNode.getBoundingSphereRadius() + targetNode.getBoundingSphereRadius(), stiffness: 0.5 } :
                {})
        };
        this.data = {
            ...this.data, 
            ...data,      
            constraintParams: { 
                ...defaultConstraintParams,
                ...(data.constraintParams || {})
            }
        };
        this.threeObject = this._createThreeObject();
        this.update();
    }

    _createThreeObject() {
        const material = new THREE.LineBasicMaterial({
            color: this.data.color,
            linewidth: this.data.thickness, 
            transparent: true,
            opacity: 0.6,
            depthTest: false, 
        });
        const points = [this.source.position.clone(), this.target.position.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.renderOrder = -1; 
        line.userData.edgeId = this.id; 
        return line;
    }

    update() { 
        if (!this.threeObject || !this.source || !this.target) return;
        const positions = this.threeObject.geometry.attributes.position;
        positions.setXYZ(0, this.source.position.x, this.source.position.y, this.source.position.z);
        positions.setXYZ(1, this.target.position.x, this.target.position.y, this.target.position.z);
        positions.needsUpdate = true;
        this.threeObject.geometry.computeBoundingSphere(); 
    }

    setHighlight(highlight) {
        if (!this.threeObject?.material) return;
        this.threeObject.material.opacity = highlight ? 1.0 : 0.6;
        this.threeObject.material.color.set(highlight ? 0x00ffff : this.data.color);
        this.threeObject.material.needsUpdate = true;
    }

    dispose() {
        if (this.threeObject) {
            this.threeObject.geometry?.dispose();
            this.threeObject.material?.dispose();
            this.threeObject.parent?.remove(this.threeObject);
            this.threeObject = null;
        }
        this.source = null;
        this.target = null;
        this.spaceGraph = null;
    }
}

export class UIManager {
    spaceGraph = null; 
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
        down: false, primary: false, secondary: false, middle: false,
        potentialClick: true, lastPos: {x: 0, y: 0}, startPos: {x: 0, y: 0}
    };
    confirmCallback = null;
    statusIndicatorElement = null;

    constructor(spaceGraph, uiElements = {}) {
        if (!spaceGraph) {
            throw new Error("UIManager requires a SpaceGraph instance.");
        }
        this.spaceGraph = spaceGraph;
        this.container = spaceGraph.container;

        this.contextMenuElement = uiElements.contextMenuEl || S.$('#context-menu');
        if (!this.contextMenuElement || !document.body.contains(this.contextMenuElement)) {
            this.contextMenuElement = document.createElement('div');
            this.contextMenuElement.id = 'context-menu';
            this.contextMenuElement.className = 'context-menu';
            document.body.appendChild(this.contextMenuElement);
        }

        this.confirmDialogElement = uiElements.confirmDialogEl || S.$('#confirm-dialog');
        if (!this.confirmDialogElement || !document.body.contains(this.confirmDialogElement)) {
            this.confirmDialogElement = document.createElement('div');
            this.confirmDialogElement.id = 'confirm-dialog';
            this.confirmDialogElement.className = 'dialog';
            this.confirmDialogElement.innerHTML = '<p id="confirm-message">Are you sure?</p><button id="confirm-yes">Yes</button><button id="confirm-no">No</button>';
            document.body.appendChild(this.confirmDialogElement);
        }
        
        this.statusIndicatorElement = uiElements.statusIndicatorEl || S.$('#status-indicator');
        if (!this.statusIndicatorElement || !document.body.contains(this.statusIndicatorElement)) {
            this.statusIndicatorElement = document.createElement('div');
            this.statusIndicatorElement.id = 'status-indicator';
            // CSS typically handles initial visibility/fade-in, so no 'hidden' class added by default.
            document.body.appendChild(this.statusIndicatorElement);
        }
        
        this._bindEvents();
    }

    _bindEvents() {
        const opts = { passive: false }; 
        this.container.addEventListener('pointerdown', this._onPointerDown.bind(this), false);
        window.addEventListener('pointermove', this._onPointerMove.bind(this), false); 
        window.addEventListener('pointerup', this._onPointerUp.bind(this), false); 
        this.container.addEventListener('contextmenu', this._onContextMenu.bind(this), opts);
        
        document.addEventListener('click', this._onDocumentClick.bind(this), true);
        
        this.contextMenuElement.addEventListener('click', this._onContextMenuClick.bind(this), false);
        $('#confirm-yes', this.confirmDialogElement)?.addEventListener('click', this._onConfirmYes.bind(this), false);
        $('#confirm-no', this.confirmDialogElement)?.addEventListener('click', this._onConfirmNo.bind(this), false);
        window.addEventListener('keydown', this._onKeyDown.bind(this), false);
        this.container.addEventListener('wheel', this._onWheel.bind(this), opts);
    }

    _updatePointerState(e, isDown) { 
        this.pointerState.down = isDown;
        this.pointerState.primary = isDown && e.button === 0;
        this.pointerState.secondary = isDown && e.button === 2;
        this.pointerState.middle = isDown && e.button === 1;
        if (isDown) {
            this.pointerState.potentialClick = true;
            this.pointerState.startPos = {x: e.clientX, y: e.clientY};
        }
        this.pointerState.lastPos = {x: e.clientX, y: e.clientY};
    }
    
    _getTargetInfo(event) {
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const nodeHtmlElement = element?.closest('.node-html'); 
        const resizeHandle = element?.closest('.resize-handle');
        const nodeControlsButton = element?.closest('.node-controls button');
        const contentEditable = element?.closest('[contenteditable="true"]');
        const interactiveInNode = element?.closest('.node-content button, .node-content input, .node-content a');

        let node = null;
        if (nodeHtmlElement) {
            node = this.spaceGraph.getNodeById(nodeHtmlElement.dataset.nodeId);
        }

        let intersectedEdge = null;
        let intersectedShapeNode = null;

        const isDirectHtmlInteraction = nodeHtmlElement && (resizeHandle || nodeControlsButton || contentEditable || interactiveInNode);

        if (!isDirectHtmlInteraction) {
            const intersected = this.spaceGraph.intersectedObject(event.clientX, event.clientY);
            if (intersected) {
                if (intersected instanceof Edge) {
                    intersectedEdge = intersected;
                } else if (intersected instanceof ShapeNode) { 
                    intersectedShapeNode = intersected;
                    if (!node) node = intersectedShapeNode; 
                }
            }
        }
        
        return {
            element, nodeHtmlElement, resizeHandle, nodeControlsButton, contentEditable, interactiveInNode,
            node: node || intersectedShapeNode, 
            intersectedEdge
        };
    }

    _onPointerDown(e) {
        this._updatePointerState(e, true);
        const targetInfo = this._getTargetInfo(e);
        
        if (targetInfo.nodeControlsButton && targetInfo.node instanceof HtmlNodeElement) {
            e.preventDefault(); e.stopPropagation();
            this._handleNodeControlButtonClick(targetInfo.nodeControlsButton, targetInfo.node);
            this._hideContextMenu(); return;
        }
        if (targetInfo.resizeHandle && targetInfo.node instanceof HtmlNodeElement) {
            e.preventDefault(); e.stopPropagation();
            this.resizedNode = targetInfo.node;
            this.resizedNode.startResize(); 
            this.resizeStartPos = {x: e.clientX, y: e.clientY};
            this.resizeStartSize = {...this.resizedNode.size};
            this.container.style.cursor = 'nwse-resize';
            this._hideContextMenu(); return;
        }

        if (targetInfo.node) { 
            if (targetInfo.interactiveInNode || targetInfo.contentEditable) {
                 e.stopPropagation(); 
                 if(this.spaceGraph.selectedNode !== targetInfo.node) this.spaceGraph.setSelectedNode(targetInfo.node);
                 this._hideContextMenu();
            } else { 
                e.preventDefault();
                this.draggedNode = targetInfo.node;
                this.draggedNode.startDrag();
                const worldPos = this.spaceGraph.screenToWorld(e.clientX, e.clientY, this.draggedNode.position.z);
                this.dragOffset = worldPos ? worldPos.sub(this.draggedNode.position) : new THREE.Vector3();
                this.container.style.cursor = 'grabbing';
                if(this.spaceGraph.selectedNode !== targetInfo.node) this.spaceGraph.setSelectedNode(targetInfo.node);
                this._hideContextMenu(); return;
            }
        } else if (targetInfo.intersectedEdge) { 
            e.preventDefault();
            this.spaceGraph.setSelectedEdge(targetInfo.intersectedEdge);
            this._hideContextMenu(); return;
        } else { 
            this._hideContextMenu();
            if (this.spaceGraph.selectedNode || this.spaceGraph.selectedEdge) {
            } else if (this.pointerState.primary) { 
                this.spaceGraph.cameraController?.startPan(e); 
            }
        }
    }
    
    _handleNodeControlButtonClick(button, node) {
        if (!(node instanceof HtmlNodeElement)) return; 

        const actionMap = {
            'node-delete': () => this._showConfirm(`Delete node "${node.id.substring(0,10)}..."?`, () => this.spaceGraph.removeNode(node.id)),
            'node-content-zoom-in': () => node.adjustContentScale(1.15),
            'node-content-zoom-out': () => node.adjustContentScale(1/1.15),
            'node-grow': () => node.adjustNodeSize(1.2),
            'node-shrink': () => node.adjustNodeSize(0.8)
        };
        for (const cls of button.classList) {
            if (actionMap[cls]) {
                actionMap[cls]();
                break;
            }
        }
    }

    _onPointerMove(e) {
        const dx = e.clientX - this.pointerState.lastPos.x;
        const dy = e.clientY - this.pointerState.lastPos.y;
        if (dx !== 0 || dy !== 0) this.pointerState.potentialClick = false;
        this.pointerState.lastPos = {x: e.clientX, y: e.clientY};

        if (this.resizedNode) {
            e.preventDefault();
            const newWidth = this.resizeStartSize.width + (e.clientX - this.resizeStartPos.x);
            const newHeight = this.resizeStartSize.height + (e.clientY - this.resizeStartPos.y);
            this.resizedNode.resize(newWidth, newHeight); return;
        }
        if (this.draggedNode) {
            e.preventDefault();
            const worldPos = this.spaceGraph.screenToWorld(e.clientX, e.clientY, this.draggedNode.position.z);
            if (worldPos) this.draggedNode.drag(worldPos.sub(this.dragOffset)); return;
        }
        if (this.spaceGraph.isLinking) {
            e.preventDefault();
            this._updateTempLinkLine(e.clientX, e.clientY);
            const {node} = this._getTargetInfo(e); 
            $$('.node-html.linking-target', this.container).forEach(el => el.classList.remove('linking-target'));
            if (node && node !== this.spaceGraph.linkSourceNode && node.htmlElement) {
                node.htmlElement.classList.add('linking-target');
            }
            return;
        }
        
        if (this.pointerState.primary && this.spaceGraph.cameraController?.isPanning) {
             this.spaceGraph.cameraController.pan(e); 
        }

        if (!this.pointerState.down && !this.resizedNode && !this.draggedNode && !this.spaceGraph.isLinking) {
            const { intersectedEdge } = this._getTargetInfo(e); 
            if (this.hoveredEdge !== intersectedEdge) {
                if (this.hoveredEdge && this.hoveredEdge !== this.spaceGraph.selectedEdge) {
                    this.hoveredEdge.setHighlight(false);
                }
                this.hoveredEdge = intersectedEdge;
                if (this.hoveredEdge && this.hoveredEdge !== this.spaceGraph.selectedEdge) {
                    this.hoveredEdge.setHighlight(true);
                }
            }
        }
    }

    _onPointerUp(e) {
        this.container.style.cursor = this.spaceGraph.isLinking ? 'crosshair' : 'grab';

        if (this.resizedNode) {
            this.resizedNode.endResize(); this.resizedNode = null;
        } else if (this.draggedNode) {
            this.draggedNode.endDrag(); this.draggedNode = null;
        } else if (this.spaceGraph.isLinking && e.button === 0) { 
            this._completeLinking(e);
        } else if (e.button === 1 && this.pointerState.potentialClick) { 
            const {node} = this._getTargetInfo(e);
            if (node) { this.spaceGraph.autoZoom(node); e.preventDefault(); }
        } else if (e.button === 0 && this.pointerState.potentialClick) { 
             const targetInfo = this._getTargetInfo(e);
             if (!targetInfo.node && !targetInfo.intersectedEdge && !this.spaceGraph.cameraController?.isPanning) {
                this.spaceGraph.setSelectedNode(null);
                this.spaceGraph.setSelectedEdge(null);
            }
        }
        
        this.spaceGraph.cameraController?.endPan();
        this._updatePointerState(e, false); 
        $$('.node-html.linking-target', this.container).forEach(el => el.classList.remove('linking-target'));
    }

    _onContextMenu(e) {
        e.preventDefault();
        this._hideContextMenu();
        const targetInfo = this._getTargetInfo(e);
        let items = [];

        if (targetInfo.node) {
            if (this.spaceGraph.selectedNode !== targetInfo.node) this.spaceGraph.setSelectedNode(targetInfo.node);
            items = this._getContextMenuItemsNode(targetInfo.node);
        } else if (targetInfo.intersectedEdge) {
            if (this.spaceGraph.selectedEdge !== targetInfo.intersectedEdge) this.spaceGraph.setSelectedEdge(targetInfo.intersectedEdge);
            items = this._getContextMenuItemsEdge(targetInfo.intersectedEdge);
        } else { 
            this.spaceGraph.setSelectedNode(null); this.spaceGraph.setSelectedEdge(null);
            const worldPos = this.spaceGraph.screenToWorld(e.clientX, e.clientY, 0);
            items = this._getContextMenuItemsBackground(worldPos);
        }
        if (items.length > 0) this._showContextMenu(e.clientX, e.clientY, items);
    }
    
    _onDocumentClick(e) { 
        const clickedContextMenu = this.contextMenuElement.contains(e.target);
        const clickedEdgeMenu = this.edgeMenuObject?.element?.contains(e.target);
        const clickedConfirmDialog = this.confirmDialogElement.contains(e.target);

        if (!clickedContextMenu) this._hideContextMenu();
        if (!clickedEdgeMenu && this.edgeMenuObject) {
            const targetInfo = this._getTargetInfo(e);
            if (this.spaceGraph.selectedEdge !== targetInfo.intersectedEdge) {
                 this.spaceGraph.setSelectedEdge(null); 
            }
        }
    }

    _getContextMenuItemsNode(node) {
        const items = [];
        if (node instanceof HtmlNodeElement && node.data.editable) {
            items.push({ label: "Edit Content 📝", action: "edit-node", nodeId: node.id });
        }
        else if (node instanceof ShapeNode && node.labelObject) {
        }
        items.push({label: "Start Link ✨", action: "start-link", nodeId: node.id});
        items.push({label: "Auto Zoom / Back 🖱️", action: "autozoom-node", nodeId: node.id});
        items.push({type: 'separator'});
        items.push({label: "Delete Node 🗑️", action: "delete-node", nodeId: node.id, class: 'delete-action'});
        return items;
    }

    _getContextMenuItemsEdge(edge) {
        return [
            {label: "Edit Edge Style...", action: "edit-edge", edgeId: edge.id}, 
            {label: "Reverse Edge Direction", action: "reverse-edge", edgeId: edge.id},
            {type: 'separator'},
            {label: "Delete Edge 🗑️", action: "delete-edge", edgeId: edge.id, class: 'delete-action'},
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
            label: this.spaceGraph.background.alpha === 0 ? "Set Dark Background" : "Set Transparent BG",
            action: "toggle-background"
        });
        return items;
    }

    _onContextMenuClick(event) {
        const li = event.target.closest('li');
        if (!li || !li.dataset.action) return;
        const data = li.dataset; const action = data.action;
        this._hideContextMenu();

        const actions = {
            'edit-node': () => {
                const node = this.spaceGraph.getNodeById(data.nodeId);
                if (node instanceof HtmlNodeElement && node.data.editable) {
                    node.htmlElement?.querySelector('.node-content')?.focus();
                }
            },
            'delete-node': () => this._showConfirm(`Delete node "${data.nodeId.substring(0,10)}..."?`, () => this.spaceGraph.removeNode(data.nodeId)),
            'delete-edge': () => this._showConfirm(`Delete edge "${data.edgeId.substring(0,10)}..."?`, () => this.spaceGraph.removeEdge(data.edgeId)),
            'autozoom-node': () => { const n = this.spaceGraph.getNodeById(data.nodeId); if(n) this.spaceGraph.autoZoom(n); },
            'create-note': () => this._createNodeFromMenu(data.position, NoteNode, {content: 'New Note ✨'}),
            'create-box': () => this._createNodeFromMenu(data.position, ShapeNode, {label: 'Box', shape: 'box', color: Math.random() * 0xffffff}),
            'create-sphere': () => this._createNodeFromMenu(data.position, ShapeNode, {label: 'Sphere', shape: 'sphere', color: Math.random() * 0xffffff}),
            'center-view': () => this.spaceGraph.centerView(),
            'reset-view': () => this.spaceGraph.cameraController?.resetView(),
            'start-link': () => { const n = this.spaceGraph.getNodeById(data.nodeId); if(n) this._startLinking(n); },
            'reverse-edge': () => {
                const edge = this.spaceGraph.getEdgeById(data.edgeId);
                if (edge) { [edge.source, edge.target] = [edge.target, edge.source]; edge.update(); this.spaceGraph.layoutEngine?.kick(); }
            },
            'edit-edge': () => { const e = this.spaceGraph.getEdgeById(data.edgeId); if(e) this.spaceGraph.setSelectedEdge(e);  },
            'toggle-background': () => this.spaceGraph.setBackground(
                this.spaceGraph.background.alpha === 0 ? 0x101018 : 0x000000, 
                this.spaceGraph.background.alpha === 0 ? 1.0 : 0.0
            ),
        };
        actions[action]?.() ?? console.warn("Unknown context menu action:", action);
    }
    
    _createNodeFromMenu(positionData, NodeTypeClass, nodeDataParams) {
        if (!positionData) { console.error("Position data missing for node creation"); return; }
        try {
            const pos = JSON.parse(positionData);
            const newNode = this.spaceGraph.addNode(new NodeTypeClass(null, pos, nodeDataParams));
            this.spaceGraph.layoutEngine?.kick();
            setTimeout(() => { 
                this.spaceGraph.focusOnNode(newNode, 0.6, true);
                this.spaceGraph.setSelectedNode(newNode);
                if (newNode instanceof NoteNode) { 
                    newNode.htmlElement?.querySelector('.node-content')?.focus();
                }
            }, 100);
        } catch (err) { console.error("Failed to create node from menu:", err); }
    }

    _showContextMenu(x, y, items) {
        this.contextMenuElement.innerHTML = ''; 
        const ul = document.createElement('ul');
        items.forEach(item => {
            if (item.type === 'separator') {
                const li = document.createElement('li'); li.className = 'separator';
                ul.appendChild(li); return;
            }
            if (item.disabled) return; 
            const li = document.createElement('li');
            li.textContent = item.label;
            if(item.class) li.classList.add(item.class);
            Object.entries(item).forEach(([key, value]) => { 
                if (value !== undefined && value !== null && key !== 'type' && key !== 'label' && key !== 'class') {
                    li.dataset[key] = typeof value === 'object' ? JSON.stringify(value) : value;
                }
            });
            ul.appendChild(li);
        });
        this.contextMenuElement.appendChild(ul);

        const menuWidth = this.contextMenuElement.offsetWidth;
        const menuHeight = this.contextMenuElement.offsetHeight;
        let finalX = x + 5; let finalY = y + 5;
        if (finalX + menuWidth > window.innerWidth) finalX = x - menuWidth - 5;
        if (finalY + menuHeight > window.innerHeight) finalY = y - menuHeight - 5;
        finalX = Math.max(5, finalX); finalY = Math.max(5, finalY);

        this.contextMenuElement.style.left = `${finalX}px`;
        this.contextMenuElement.style.top = `${finalY}px`;
        this.contextMenuElement.style.display = 'block';
    }
    _hideContextMenu = () => { if (this.contextMenuElement) this.contextMenuElement.style.display = 'none'; }

    _showConfirm(message, onConfirm) {
        $('#confirm-message', this.confirmDialogElement).textContent = message;
        this.confirmCallback = onConfirm;
        this.confirmDialogElement.style.display = 'block';
    }
    _hideConfirm = () => { this.confirmDialogElement.style.display = 'none'; this.confirmCallback = null; }
    _onConfirmYes = () => { this.confirmCallback?.(); this._hideConfirm(); }
    _onConfirmNo = () => { this._hideConfirm(); }

    _startLinking(sourceNode) {
        if (!sourceNode) return;
        this.spaceGraph.isLinking = true;
        this.spaceGraph.linkSourceNode = sourceNode;
        this.container.style.cursor = 'crosshair';
        this._createTempLinkLine(sourceNode);
    }

    _createTempLinkLine(sourceNode) {
        this._removeTempLinkLine(); 
        const material = new THREE.LineDashedMaterial({
            color: 0xffaa00, linewidth: 2, dashSize: 8, gapSize: 4,
            transparent: true, opacity: 0.9, depthTest: false
        });
        const points = [sourceNode.position.clone(), sourceNode.position.clone()]; 
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.spaceGraph.tempLinkLine = new THREE.Line(geometry, material);
        this.spaceGraph.tempLinkLine.computeLineDistances(); 
        this.spaceGraph.tempLinkLine.renderOrder = 1; 
        this.spaceGraph.scene.add(this.spaceGraph.tempLinkLine);
    }
    
    _updateTempLinkLine(screenX, screenY) {
        if (!this.spaceGraph.tempLinkLine || !this.spaceGraph.linkSourceNode) return;
        const targetPos = this.spaceGraph.screenToWorld(screenX, screenY, this.spaceGraph.linkSourceNode.position.z);
        if (targetPos) {
            const positions = this.spaceGraph.tempLinkLine.geometry.attributes.position;
            positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z); 
            positions.needsUpdate = true;
            this.spaceGraph.tempLinkLine.geometry.computeBoundingSphere();
            this.spaceGraph.tempLinkLine.computeLineDistances(); 
        }
    }
    _removeTempLinkLine() {
        if (this.spaceGraph.tempLinkLine) {
            this.spaceGraph.tempLinkLine.geometry?.dispose();
            this.spaceGraph.tempLinkLine.material?.dispose();
            this.spaceGraph.scene.remove(this.spaceGraph.tempLinkLine);
            this.spaceGraph.tempLinkLine = null;
        }
    }
    _completeLinking(event) {
        this._removeTempLinkLine();
        const {node: targetNode} = this._getTargetInfo(event); 
        if (targetNode && targetNode !== this.spaceGraph.linkSourceNode) {
            this.spaceGraph.addEdge(this.spaceGraph.linkSourceNode, targetNode);
        }
        this.cancelLinking(); 
    }

    cancelLinking() {
        this._removeTempLinkLine();
        this.spaceGraph.isLinking = false;
        this.spaceGraph.linkSourceNode = null;
        this.container.style.cursor = 'grab';
        $$('.node-html.linking-target', this.container).forEach(el => el.classList.remove('linking-target'));
    }

    _onKeyDown(event) {
        const activeEl = document.activeElement;
        const isEditing = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
        if (isEditing && event.key !== 'Escape') return; 

        const selectedNode = this.spaceGraph.selectedNode;
        const selectedEdge = this.spaceGraph.selectedEdge;
        let handled = false;

        switch (event.key) {
            case 'Delete': case 'Backspace':
                if (selectedNode) { this._showConfirm(`Delete node "${selectedNode.id.substring(0,10)}..."?`, () => this.spaceGraph.removeNode(selectedNode.id)); handled = true; }
                else if (selectedEdge) { this._showConfirm(`Delete edge "${selectedEdge.id.substring(0,10)}..."?`, () => this.spaceGraph.removeEdge(selectedEdge.id)); handled = true; }
                break;
            case 'Escape':
                if (this.spaceGraph.isLinking) { this.cancelLinking(); handled = true; }
                else if (this.contextMenuElement.style.display === 'block') { this._hideContextMenu(); handled = true; }
                else if (this.confirmDialogElement.style.display === 'block') { this._hideConfirm(); handled = true; }
                else if (this.edgeMenuObject) { this.spaceGraph.setSelectedEdge(null); handled = true; } 
                else if (selectedNode || selectedEdge) { this.spaceGraph.setSelectedNode(null); this.spaceGraph.setSelectedEdge(null); handled = true; }
                break;
            case 'Enter':
                if (selectedNode instanceof NoteNode) { 
                    selectedNode.htmlElement?.querySelector('.node-content')?.focus(); handled = true;
                }
                break;
            case '+': case '=':
                if (selectedNode instanceof HtmlNodeElement) {
                    event.ctrlKey || event.metaKey ? selectedNode.adjustNodeSize(1.2) : selectedNode.adjustContentScale(1.15);
                    handled = true;
                }
                break;
            case '-': case '_':
                if (selectedNode instanceof HtmlNodeElement) {
                     event.ctrlKey || event.metaKey ? selectedNode.adjustNodeSize(0.8) : selectedNode.adjustContentScale(0.85);
                     handled = true;
                }
                break;
            case ' ': 
                if (selectedNode) { this.spaceGraph.focusOnNode(selectedNode, 0.5, true); handled = true; }
                else if (selectedEdge) {
                    const midPoint = new THREE.Vector3().lerpVectors(selectedEdge.source.position, selectedEdge.target.position, 0.5);
                    const dist = selectedEdge.source.position.distanceTo(selectedEdge.target.position);
                    this.spaceGraph.cameraController?.pushState();
                    this.spaceGraph.cameraController?.moveTo(midPoint.x, midPoint.y, midPoint.z + dist * 0.6 + 100, 0.5, midPoint);
                    handled = true;
                } else { this.spaceGraph.centerView(); handled = true; }
                break;
        }
        if (handled) event.preventDefault();
    }
    
    _onWheel = (e) => { 
        const targetInfo = this._getTargetInfo(e);
        if (e.target.closest('.node-controls, .edge-menu-frame') || targetInfo.contentEditable) return;

        if (e.ctrlKey || e.metaKey) { 
            if (targetInfo.node instanceof HtmlNodeElement) {
                e.preventDefault(); e.stopPropagation();
                targetInfo.node.adjustContentScale(e.deltaY < 0 ? 1.1 : (1 / 1.1));
            } 
        } else { 
            e.preventDefault();
            this.spaceGraph.cameraController?.zoom(e); 
        }
    }

    showEdgeMenu(edge) {
        if (!edge || this.edgeMenuObject) return; 
        this.hideEdgeMenu(); 

        const menuElement = document.createElement('div');
        menuElement.className = 'edge-menu-frame'; 
        menuElement.dataset.edgeId = edge.id;
        menuElement.innerHTML = `
          <button title="Color (NYI)" data-action="color">🎨</button>
          <button title="Thickness (NYI)" data-action="thickness">➖</button>
          <button title="Style (NYI)" data-action="style">〰️</button>
          <button title="Constraint (NYI)" data-action="constraint">🔗</button>
          <button title="Delete Edge" class="delete" data-action="delete">×</button>
      `;

        menuElement.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const action = button.dataset.action;
            e.stopPropagation(); 

            switch (action) {
                case 'delete':
                    this._showConfirm(`Delete edge "${edge.id.substring(0,10)}..."?`, () => this.spaceGraph.removeEdge(edge.id));
                    break;
                case 'color': case 'thickness': case 'style': case 'constraint':
                    console.warn(`Edge menu action '${action}' not fully implemented.`);
                    break;
            }
        });
        
        menuElement.addEventListener('pointerdown', e => e.stopPropagation());
        menuElement.addEventListener('wheel', e => e.stopPropagation());

        this.edgeMenuObject = new CSS3DObject(menuElement);
        this.spaceGraph.cssScene.add(this.edgeMenuObject);
        this.updateEdgeMenuPosition();
    }

    hideEdgeMenu() {
        if (this.edgeMenuObject) {
            this.edgeMenuObject.element?.remove();
            this.edgeMenuObject.parent?.remove(this.edgeMenuObject);
            this.edgeMenuObject = null;
        }
    }

    updateEdgeMenuPosition() {
        if (!this.edgeMenuObject || !this.spaceGraph.selectedEdge) return;
        const edge = this.spaceGraph.selectedEdge;
        const midPoint = new THREE.Vector3().lerpVectors(edge.source.position, edge.target.position, 0.5);
        this.edgeMenuObject.position.copy(midPoint);
        if (this.spaceGraph._camera) { 
             this.edgeMenuObject.quaternion.copy(this.spaceGraph._camera.quaternion);
        }
    }
    
    dispose() {
        this.container.removeEventListener('pointerdown', this._onPointerDown);
        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
        this.container.removeEventListener('contextmenu', this._onContextMenu);
        document.removeEventListener('click', this._onDocumentClick, true);
        this.contextMenuElement?.removeEventListener('click', this._onContextMenuClick);
        $('#confirm-yes', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmYes);
        $('#confirm-no', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmNo);
        window.removeEventListener('keydown', this._onKeyDown);
        this.container.removeEventListener('wheel', this._onWheel);

        this.hideEdgeMenu(); 
        this.contextMenuElement?.remove(); 
        this.confirmDialogElement?.remove(); 
        this.statusIndicatorElement?.remove();

        this.spaceGraph = null; this.container = null;
        this.contextMenuElement = null; this.confirmDialogElement = null; this.statusIndicatorElement = null;
        this.draggedNode = null; this.resizedNode = null; this.hoveredEdge = null;
        this.confirmCallback = null;
        console.log("UIManager disposed.");
    }
}

export class CameraController {
    camera = null; 
    domElement = null; 
    isPanning = false;
    panStart = new THREE.Vector2();
    targetPosition = new THREE.Vector3();
    targetLookAt = new THREE.Vector3();
    currentLookAt = new THREE.Vector3(); 
    zoomSpeed = 0.0015; 
    panSpeed = 0.8;     
    minZoom = 20;       
    maxZoom = 15000;    
    dampingFactor = 0.12; 
    animationFrameId = null;
    viewHistory = [];
    maxHistory = 20;
    currentTargetNodeId = null; 
    initialState = null; 

    constructor(threeCamera, domElement) {
        this.camera = threeCamera;
        this.domElement = domElement; 
        this.targetPosition.copy(this.camera.position);
        this.targetLookAt.copy(new THREE.Vector3(0,0,0)); 
        this.currentLookAt.copy(this.targetLookAt);
        this._updateLoop(); 
    }

    setInitialState() { 
        if (!this.initialState) {
            this.initialState = {
                position: this.targetPosition.clone(), 
                lookAt: this.targetLookAt.clone()
            };
        }
    }

    startPan(event) { 
        if (event.button !== 0 || this.isPanning) return;
        this.isPanning = true;
        this.panStart.set(event.clientX, event.clientY);
        this.domElement.classList.add('panning');
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        this.currentTargetNodeId = null; 
    }

    pan(event) { 
        if (!this.isPanning) return;
        const deltaX = event.clientX - this.panStart.x;
        const deltaY = event.clientY - this.panStart.y;

        const cameraDist = this.camera.position.distanceTo(this.currentLookAt);
        const vFOV = this.camera.fov * DEG2RAD;
        const viewHeight = this.domElement.clientHeight || window.innerHeight;
        const height = 2 * Math.tan(vFOV / 2) * Math.max(1, cameraDist); 

        const panXAmount = -(deltaX / viewHeight) * height * this.panSpeed;
        const panYAmount = (deltaY / viewHeight) * height * this.panSpeed;

        const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
        const panOffset = right.multiplyScalar(panXAmount).add(up.multiplyScalar(panYAmount));

        this.targetPosition.add(panOffset);
        this.targetLookAt.add(panOffset);
        this.panStart.set(event.clientX, event.clientY);
    }

    endPan() {
        if (this.isPanning) {
            this.isPanning = false;
            this.domElement.classList.remove('panning');
        }
    }

    zoom(event) { 
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        this.currentTargetNodeId = null;

        const delta = -event.deltaY * this.zoomSpeed;
        const currentDist = this.targetPosition.distanceTo(this.targetLookAt);
        let newDist = currentDist * Math.pow(0.95, delta * 12); 
        newDist = clamp(newDist, this.minZoom, this.maxZoom);
        const zoomFactorAmount = (newDist - currentDist);

        const mouseWorldPos = this._getLookAtPlaneIntersection(event.clientX, event.clientY);
        const direction = new THREE.Vector3();
        if (mouseWorldPos) {
            direction.copy(mouseWorldPos).sub(this.targetPosition).normalize();
        } else { 
            this.camera.getWorldDirection(direction);
        }
        this.targetPosition.addScaledVector(direction, zoomFactorAmount);
    }
    
    _getLookAtPlaneIntersection(screenX, screenY) { 
        const vec = new THREE.Vector3((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1, 0.5);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vec, this.camera);
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir.negate(), this.targetLookAt);
        const intersectPoint = new THREE.Vector3();
        return raycaster.ray.intersectPlane(plane, intersectPoint) ? intersectPoint : null;
    }

    moveTo(x, y, z, duration = 0.7, lookAtTarget = null) {
        this.setInitialState(); 
        const targetPosVec = new THREE.Vector3(x, y, z);
        const targetLookVec = lookAtTarget ? lookAtTarget.clone() : new THREE.Vector3(x, y, 0); 

        gsap.killTweensOf(this.targetPosition); gsap.killTweensOf(this.targetLookAt);
        gsap.to(this.targetPosition, { x: targetPosVec.x, y: targetPosVec.y, z: targetPosVec.z, duration, ease: "power3.out", overwrite: true });
        gsap.to(this.targetLookAt, { x: targetLookVec.x, y: targetLookVec.y, z: targetLookVec.z, duration, ease: "power3.out", overwrite: true });
    }

    resetView(duration = 0.7) {
        if (this.initialState) {
            this.moveTo(this.initialState.position.x, this.initialState.position.y, this.initialState.position.z, duration, this.initialState.lookAt);
        } else { 
            this.moveTo(0, 0, 700, duration, new THREE.Vector3(0,0,0));
        }
        this.viewHistory = []; this.currentTargetNodeId = null; 
    }

    pushState() {
        if (this.viewHistory.length >= this.maxHistory) this.viewHistory.shift();
        this.viewHistory.push({
            position: this.targetPosition.clone(),
            lookAt: this.targetLookAt.clone(),
            targetNodeId: this.currentTargetNodeId
        });
    }

    popState(duration = 0.6) {
        if (this.viewHistory.length > 0) {
            const prevState = this.viewHistory.pop();
            this.moveTo(prevState.position.x, prevState.position.y, prevState.position.z, duration, prevState.lookAt);
            this.currentTargetNodeId = prevState.targetNodeId;
        } else {
            this.resetView(duration); 
        }
    }

    getCurrentTargetNodeId = () => this.currentTargetNodeId;
    setCurrentTargetNodeId = (nodeId) => { this.currentTargetNodeId = nodeId; };

    _updateLoop = () => { 
        const deltaPos = this.targetPosition.distanceTo(this.camera.position);
        const deltaLookAt = this.targetLookAt.distanceTo(this.currentLookAt);

        if (deltaPos > 0.01 || deltaLookAt > 0.01 || this.isPanning) {
            this.camera.position.lerp(this.targetPosition, this.dampingFactor);
            this.currentLookAt.lerp(this.targetLookAt, this.dampingFactor);
            this.camera.lookAt(this.currentLookAt);
        } else if (!gsap.isTweening(this.targetPosition) && !gsap.isTweening(this.targetLookAt)) {
            if (deltaPos > 0 || deltaLookAt > 0) {
                this.camera.position.copy(this.targetPosition);
                this.currentLookAt.copy(this.targetLookAt);
                this.camera.lookAt(this.currentLookAt);
            }
        }
        this.animationFrameId = requestAnimationFrame(this._updateLoop);
    }

    dispose() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        gsap.killTweensOf(this.targetPosition); gsap.killTweensOf(this.targetLookAt);
        this.camera = null; this.domElement = null; this.viewHistory = [];
        console.log("CameraController disposed.");
    }
}

export class ForceLayout {
    spaceGraph = null; 
    nodes = []; 
    edges = []; 
    velocities = new Map(); 
    fixedNodes = new Set(); 
    isRunning = false;
    animationFrameId = null;
    energy = Infinity;
    lastKickTime = 0;
    autoStopTimeout = null;

    settings = { 
        repulsion: 3000,
        attraction: 0.001, 
        idealEdgeLength: 200, 
        centerStrength: 0.0005,
        damping: 0.92,
        minEnergyThreshold: 0.1,
        gravityCenter: new THREE.Vector3(0, 0, 0),
        zSpreadFactor: 0.15,
        autoStopDelay: 4000,
        nodePadding: 1.2, 
        defaultElasticStiffness: 0.001, 
        defaultElasticIdealLength: 200, 
        defaultRigidStiffness: 0.1,
        defaultWeldStiffness: 0.5,
    };

    constructor(spaceGraphInstance, config = {}) {
        this.spaceGraph = spaceGraphInstance;
        this.settings = {...this.settings, ...config};
        this.settings.defaultElasticStiffness = this.settings.attraction;
        this.settings.defaultElasticIdealLength = this.settings.idealEdgeLength;
    }

    addNode(node) {
        if (!this.velocities.has(node.id)) {
            this.nodes.push(node);
            this.velocities.set(node.id, new THREE.Vector3());
            this.kick();
        }
    }
    removeNode(node) {
        this.nodes = this.nodes.filter(n => n !== node);
        this.velocities.delete(node.id);
        this.fixedNodes.delete(node);
        if (this.nodes.length < 2 && this.isRunning) this.stop(); else this.kick();
    }
    addEdge(edge) { if (!this.edges.includes(edge)) { this.edges.push(edge); this.kick(); } }
    removeEdge(edge) { this.edges = this.edges.filter(e => e !== edge); this.kick(); }
    fixNode(node) { this.fixedNodes.add(node); this.velocities.get(node.id)?.set(0,0,0); }
    releaseNode(node) { this.fixedNodes.delete(node);  }

    runOnce(steps = 100) { 
        console.log(`ForceLayout: Running ${steps} initial steps...`);
        let i = 0;
        for (; i < steps; i++) {
            if (this._calculateStep() < this.settings.minEnergyThreshold) break;
        }
        console.log(`ForceLayout: Initial steps completed after ${i} iterations.`);
        this.spaceGraph._updateNodesAndEdges(); 
    }

    start() {
        if (this.isRunning || this.nodes.length < 2) return;
        console.log("ForceLayout: Starting simulation.");
        this.isRunning = true; this.lastKickTime = Date.now();
        const loop = () => {
            if (!this.isRunning) return;
            this.energy = this._calculateStep();
            if (this.energy < this.settings.minEnergyThreshold && Date.now() - this.lastKickTime > this.settings.autoStopDelay) {
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
        this.animationFrameId = null; this.autoStopTimeout = null;
        console.log("ForceLayout: Simulation stopped. Energy:", this.energy?.toFixed(4));
    }

    kick(intensity = 1) {
        if (this.nodes.length === 0) return;
        this.lastKickTime = Date.now(); this.energy = Infinity; 
        this.nodes.forEach(node => {
            if (!this.fixedNodes.has(node)) {
                this.velocities.get(node.id)?.add(
                    new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, (Math.random()-0.5)*this.settings.zSpreadFactor)
                    .normalize().multiplyScalar(intensity * (1 + Math.random()*2)) 
                );
            }
        });
        if (!this.isRunning) this.start();
        clearTimeout(this.autoStopTimeout); 
        this.autoStopTimeout = setTimeout(() => {
            if (this.isRunning && this.energy < this.settings.minEnergyThreshold) this.stop();
        }, this.settings.autoStopDelay);
    }
    
    setSettings(newSettings) { 
        this.settings = {...this.settings, ...newSettings};
        this.settings.defaultElasticStiffness = this.settings.attraction;
        this.settings.defaultElasticIdealLength = this.settings.idealEdgeLength;
        console.log("ForceLayout settings updated:", this.settings);
        this.kick();
    }

    _calculateStep() {
        if (this.nodes.length < 2 && this.edges.length === 0) return 0; 
        let totalSystemEnergy = 0;
        const forces = new Map(this.nodes.map(node => [node.id, new THREE.Vector3()]));
        const { repulsion, centerStrength, gravityCenter, zSpreadFactor, damping, nodePadding } = this.settings;
        const tempDelta = new THREE.Vector3(); 

        for (let i = 0; i < this.nodes.length; i++) {
            const nodeA = this.nodes[i];
            for (let j = i + 1; j < this.nodes.length; j++) {
                const nodeB = this.nodes[j];
                tempDelta.subVectors(nodeB.position, nodeA.position);
                let distSq = tempDelta.lengthSq();
                if (distSq < 1e-4) { 
                    distSq = 1e-4;
                    tempDelta.randomDirection().multiplyScalar(0.01); 
                }
                const dist = Math.sqrt(distSq);
                const radiusA = nodeA.getBoundingSphereRadius() * nodePadding; 
                const radiusB = nodeB.getBoundingSphereRadius() * nodePadding;
                const combinedRadius = radiusA + radiusB;
                const overlap = combinedRadius - dist;
                let forceMag = -repulsion / distSq; 
                if (overlap > 0) { 
                    forceMag -= (repulsion * Math.pow(overlap, 2) * 0.01) / dist; 
                }
                const forceVec = tempDelta.normalize().multiplyScalar(forceMag);
                forceVec.z *= zSpreadFactor;
                if (!this.fixedNodes.has(nodeA)) forces.get(nodeA.id)?.add(forceVec);
                if (!this.fixedNodes.has(nodeB)) forces.get(nodeB.id)?.sub(forceVec);
            }
        }

        this.edges.forEach(edge => {
            const {source, target, data: edgeData} = edge;
            if (!source || !target || !this.velocities.has(source.id) || !this.velocities.has(target.id)) return;
            tempDelta.subVectors(target.position, source.position);
            const distance = tempDelta.length() + 1e-6; 
            let forceMag = 0;
            const params = edgeData.constraintParams || {};
            const type = edgeData.constraintType || 'elastic';

            switch (type) {
                case 'rigid':
                    const targetDist = params.distance ?? source.position.distanceTo(target.position); 
                    const rStiffness = params.stiffness ?? this.settings.defaultRigidStiffness;
                    forceMag = rStiffness * (distance - targetDist);
                    break;
                case 'weld':
                    const weldDist = params.distance ?? (source.getBoundingSphereRadius() + target.getBoundingSphereRadius());
                    const wStiffness = params.stiffness ?? this.settings.defaultWeldStiffness;
                    forceMag = wStiffness * (distance - weldDist);
                    break;
                case 'elastic':
                default:
                    const idealLen = params.idealLength ?? this.settings.defaultElasticIdealLength;
                    const eStiffness = params.stiffness ?? this.settings.defaultElasticStiffness;
                    forceMag = eStiffness * (distance - idealLen);
                    break;
            }
            const forceVec = tempDelta.normalize().multiplyScalar(forceMag);
            forceVec.z *= zSpreadFactor;
            if (!this.fixedNodes.has(source)) forces.get(source.id)?.add(forceVec);
            if (!this.fixedNodes.has(target)) forces.get(target.id)?.sub(forceVec);
        });

        if (centerStrength > 0) {
            this.nodes.forEach(node => {
                if (this.fixedNodes.has(node)) return;
                const forceVec = tempDelta.subVectors(gravityCenter, node.position).multiplyScalar(centerStrength);
                forceVec.z *= zSpreadFactor * 0.5; 
                forces.get(node.id)?.add(forceVec);
            });
        }

        this.nodes.forEach(node => {
            if (this.fixedNodes.has(node)) return;
            const force = forces.get(node.id);
            const velocity = this.velocities.get(node.id);
            if (!force || !velocity) return;

            const mass = node.mass || 1.0; 
            const acceleration = tempDelta.copy(force).divideScalar(mass); 
            velocity.add(acceleration).multiplyScalar(damping); 

            const speed = velocity.length();
            if (speed > 50) velocity.multiplyScalar(50 / speed); 

            node.position.add(velocity); 
            totalSystemEnergy += 0.5 * mass * velocity.lengthSq(); 
        });
        return totalSystemEnergy;
    }
    
    dispose() {
        this.stop();
        this.nodes = []; this.edges = [];
        this.velocities.clear(); this.fixedNodes.clear();
        this.spaceGraph = null;
        console.log("ForceLayout disposed.");
    }
}
