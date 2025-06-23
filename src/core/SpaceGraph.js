import * as THREE from 'three';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { Utils, $ } from '../utils.js';
import { Camera } from '../camera/Camera.js';
import { UIManager } from '../ui/UIManager.js';
import { ForceLayout } from '../layout/ForceLayout.js';
import { Edge } from '../graph/Edge.js';
import { HtmlNode } from '../graph/nodes/HtmlNode.js';

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
    css3dContainer = null;
    webglCanvas = null;
    background = {color: 0x1a1a1d, alpha: 1.0};

    _listeners = new Map(); // Event bus listeners

    constructor(containerElement) {
        if (!containerElement) throw new Error("SpaceGraph requires a valid HTML container element.");
        this.container = containerElement;
        this.scene = new THREE.Scene();
        this.cssScene = new THREE.Scene();

        this._cam = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 20000);
        this._cam.position.z = 700;
        this.camera = new Camera(this);
        this.layout = new ForceLayout(this); // Pass SpaceGraph instance to layout

        this._setupRenderers();
        this._setupLighting();
        this.setBackground(this.background.color, this.background.alpha);

        this.centerView(null, 0);
        this.camera.setInitialState();

        window.addEventListener('resize', this._onWindowResize, false);

        this._setupEventListeners(); // Setup internal event listeners for UI requests
    }

    // --- Event Bus Methods ---
    on(eventName, callback) {
        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, new Set());
        }
        this._listeners.get(eventName).add(callback);
    }

    off(eventName, callback) {
        if (this._listeners.has(eventName)) {
            this._listeners.get(eventName).delete(callback);
        }
    }

    emit(eventName, ...args) {
        if (this._listeners.has(eventName)) {
            this._listeners.get(eventName).forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event listener for "${eventName}":`, error);
                }
            });
        }
    }

    // --- Internal Event Listeners for UI Requests ---
    _setupEventListeners() {
        this.on('ui:request:addNode', (nodeInstance) => {
            this.addNode(nodeInstance);
            this.layout?.kick();
            setTimeout(() => { // Allow node to be added to scene before focusing
                this.focusOnNode(nodeInstance, 0.6, true);
                this.setSelectedNode(nodeInstance);
                if (nodeInstance instanceof HtmlNode && nodeInstance.data.editable) {
                    nodeInstance.htmlElement?.querySelector('.node-content')?.focus();
                }
            }, 100);
        });
        this.on('ui:request:removeNode', (nodeId) => this.removeNode(nodeId));
        this.on('ui:request:addEdge', (sourceNode, targetNode, data) => this.addEdge(sourceNode, targetNode, data));
        this.on('ui:request:removeEdge', (edgeId) => this.removeEdge(edgeId));
        this.on('ui:request:setSelectedNode', (node) => this.setSelectedNode(node));
        this.on('ui:request:setSelectedEdge', (edge) => this.setSelectedEdge(edge));
        this.on('ui:request:autoZoomNode', (node) => this.autoZoom(node));
        this.on('ui:request:centerView', () => this.centerView());
        this.on('ui:request:resetView', () => this.camera?.resetView());
        this.on('ui:request:toggleBackground', (color, alpha) => this.setBackground(color, alpha));
        this.on('ui:request:startLinking', (sourceNode) => this._startLinking(sourceNode));
        this.on('ui:request:cancelLinking', () => this._cancelLinking());
        this.on('ui:request:completeLinking', (screenX, screenY) => this._completeLinking(screenX, screenY));
        this.on('ui:request:reverseEdge', (edgeId) => {
            const edge = this.getEdgeById(edgeId);
            if (edge) {
                [edge.source, edge.target] = [edge.target, edge.source];
                edge.update();
                this.layout?.kick();
            }
        });
        this.on('ui:request:adjustContentScale', (node, factor) => {
            if (node instanceof HtmlNode) node.adjustContentScale(factor);
        });
        this.on('ui:request:adjustNodeSize', (node, factor) => {
            if (node instanceof HtmlNode) node.adjustNodeSize(factor);
        });
        this.on('ui:request:zoomCamera', (deltaY) => this.camera?.zoom(deltaY));
        this.on('ui:request:focusOnNode', (node, duration, pushHistory) => this.focusOnNode(node, duration, pushHistory));
        this.on('ui:request:updateEdge', (edgeId, property, value) => {
            const edge = this.getEdgeById(edgeId);
            if (!edge) return;
            switch (property) {
                case 'color':
                    edge.data.color = value;
                    edge.setHighlight(this.edgeSelected === edge); // Re-apply highlight state
                    break;
                case 'thickness':
                    edge.data.thickness = value;
                    if (edge.line?.material) edge.line.material.linewidth = edge.data.thickness;
                    break;
                case 'constraintType':
                    edge.data.constraintType = value;
                    // Update default params if switching type
                    if (value === 'rigid' && !edge.data.constraintParams?.distance) {
                        edge.data.constraintParams = {
                            distance: edge.source.position.distanceTo(edge.target.position),
                            stiffness: 0.1
                        };
                    } else if (value === 'weld' && !edge.data.constraintParams?.distance) {
                        edge.data.constraintParams = {
                            distance: edge.source.getBoundingSphereRadius() + edge.target.getBoundingSphereRadius(),
                            stiffness: 0.5
                        };
                    } else if (value === 'elastic' && !edge.data.constraintParams?.stiffness) {
                        edge.data.constraintParams = {stiffness: 0.001, idealLength: 200};
                    }
                    this.layout?.kick();
                    break;
            }
        });
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
        this.webglCanvas.style.backgroundColor = alpha === 0 ? 'transparent' : `#${color.toString(16).padStart(6, '0')}`;
    }

    addNode(nodeInstance) {
        if (!nodeInstance.id) nodeInstance.id = Utils.generateId('node');
        if (this.nodes.has(nodeInstance.id)) return this.nodes.get(nodeInstance.id);

        this.nodes.set(nodeInstance.id, nodeInstance);
        nodeInstance.space = this;
        if (nodeInstance.cssObject) this.cssScene.add(nodeInstance.cssObject);
        if (nodeInstance.mesh) this.scene.add(nodeInstance.mesh);
        if (nodeInstance.labelObject) this.cssScene.add(nodeInstance.labelObject);
        this.layout?.addNode(nodeInstance);
        this.emit('node:added', nodeInstance); // Emit event
        return nodeInstance;
    }

    removeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        if (this.nodeSelected === node) this.setSelectedNode(null);
        if (this.linkSourceNode === node) this._cancelLinking();

        [...this.edges.values()]
            .filter(edge => edge.source === node || edge.target === node)
            .forEach(edge => this.removeEdge(edge.id));

        this.layout?.removeNode(node);
        node.dispose();
        this.nodes.delete(nodeId);
        this.emit('node:removed', nodeId, node); // Emit event
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
        this.emit('edge:added', edge); // Emit event
        return edge;
    }

    removeEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) return;
        if (this.edgeSelected === edge) this.setSelectedEdge(null);
        this.layout?.removeEdge(edge);
        edge.dispose();
        this.edges.delete(edgeId);
        this.emit('edge:removed', edgeId, edge); // Emit event
    }

    getNodeById = (id) => this.nodes.get(id);
    getEdgeById = (id) => this.edges.get(id);

    updateNodesAndEdges() {
        this.nodes.forEach(node => node.update(this));
        this.edges.forEach(edge => edge.update()); // Edge update doesn't need space
        this.ui?.updateEdgeMenuPosition();
    }

    render = () => {
        this.renderGL.render(this.scene, this._cam);
        this.renderCSS3D.render(this.cssScene, this._cam);
    }

    _onWindowResize = () => {
        const iw = window.innerWidth, ih = window.innerHeight;
        this._cam.aspect = iw / ih;
        this._cam.updateProjectionMatrix();
        this.renderGL.setSize(iw, ih);
        this.renderCSS3D.setSize(iw, ih);
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
        this.nodeSelected = node; // Update internal state first
        this.emit('node:selected', node); // Then emit event
    }

    setSelectedEdge(edge) {
        if (this.edgeSelected === edge) return;
        this.edgeSelected = edge; // Update internal state first
        this.emit('edge:selected', edge); // Then emit event
    }

    intersectedObjects(screenX, screenY) {
        this._cam.updateMatrixWorld();
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

    _startLinking(sourceNode) {
        if (!sourceNode || this.isLinking) return;
        this.isLinking = true;
        this.linkSourceNode = sourceNode;
        this.emit('ui:linking:started', sourceNode);
    }

    _completeLinking(screenX, screenY) {
        const targetInfo = this.ui?._getTargetInfo({clientX: screenX, clientY: screenY}); // Use UIManager's target info logic
        if (targetInfo?.node && targetInfo.node !== this.linkSourceNode) {
            this.addEdge(this.linkSourceNode, targetInfo.node);
        }
        this.isLinking = false;
        this.linkSourceNode = null;
        this.emit('ui:linking:completed');
    }

    _cancelLinking() {
        this.isLinking = false;
        this.linkSourceNode = null;
        this.emit('ui:linking:cancelled');
    }

    animate() {
        const frame = () => {
            this.updateNodesAndEdges();
            this.render();
            requestAnimationFrame(frame);
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
        this.renderGL?.dispose();
        this.renderCSS3D?.domElement?.remove();
        this.css3dContainer?.remove();
        window.removeEventListener('resize', this._onWindowResize);
        this.ui?.dispose(); // UIManager will unsubscribe from events
        this._listeners.clear(); // Clear all event listeners
        console.log("SpaceGraph disposed.");
    }
}
