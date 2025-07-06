import * as THREE from 'three';
import {Plugin} from '../core/Plugin.js';

const MINIMAP_SIZE = 200;
const MINIMAP_MARGIN = 10;
const MINIMAP_BG_COLOR = 0x222233;
const MINIMAP_BG_OPACITY = 0.7;
const NODE_PROXY_COLOR = 0x00aaff;
const FRUSTUM_COLOR = 0xffaa00;

export class MinimapPlugin extends Plugin {
    minimapCamera = null;
    nodeProxies = new Map();
    frustumHelper = null;
    minimapScene = null;

    currentViewport = new THREE.Vector4();
    currentScissor = new THREE.Vector4();

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.minimapScene = new THREE.Scene();
    }

    getName() {
        return 'MinimapPlugin';
    }

    init() {
        super.init();
        this._setupMinimapCamera(); // Initial setup
        this._setupFrustumHelper();

        this.space.on('node:added', this._addNodeProxy.bind(this));
        this.space.on('node:removed', this._removeNodeProxy.bind(this));

        this.pluginManager.getPlugin('NodePlugin')?.getNodes().forEach((node) => this._addNodeProxy(node));
    }

    _setupMinimapCamera() {
        // Initial setup, will be dynamically adjusted
        this.minimapCamera = new THREE.OrthographicCamera(-100, 100, 100, -100, 1, 10000);
        this.minimapCamera.position.set(0, 0, 1000); // Positioned above the scene, looking down
        this.minimapCamera.lookAt(0, 0, 0);
        this.minimapScene.add(this.minimapCamera);
    }

    _updateMinimapCameraView() {
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        if (!nodePlugin || !this.minimapCamera) return;

        const nodes = Array.from(nodePlugin.getNodes().values());
        if (nodes.length === 0) {
            // Default view if no nodes
            this.minimapCamera.left = -MINIMAP_SIZE / 2;
            this.minimapCamera.right = MINIMAP_SIZE / 2;
            this.minimapCamera.top = MINIMAP_SIZE / 2;
            this.minimapCamera.bottom = -MINIMAP_SIZE / 2;
            this.minimapCamera.position.set(0, 0, 1000);
            this.minimapCamera.lookAt(0,0,0);
            this.minimapCamera.updateProjectionMatrix();
            return;
        }

        const boundingBox = new THREE.Box3();
        nodes.forEach(node => {
            // Consider a small area around each node for the bounding box
            const nodeSphere = new THREE.Sphere(node.position, node.getBoundingSphereRadius() * 1.5 || 10);
            const nodeBox = nodeSphere.getBoundingBox(new THREE.Box3());
            boundingBox.union(nodeBox);
        });

        if (boundingBox.isEmpty()) {
             // Default view if bounding box is empty (e.g. nodes at same point with zero radius)
            this.minimapCamera.left = -MINIMAP_SIZE / 2;
            this.minimapCamera.right = MINIMAP_SIZE / 2;
            this.minimapCamera.top = MINIMAP_SIZE / 2;
            this.minimapCamera.bottom = -MINIMAP_SIZE / 2;
        } else {
            const center = boundingBox.getCenter(new THREE.Vector3());
            const size = boundingBox.getSize(new THREE.Vector3());

            const padding = Math.max(size.x, size.y) * 0.1 + 50; // 10% padding + base padding

            const halfWidth = Math.max(size.x / 2 + padding, MINIMAP_SIZE / 4); // Ensure a minimum visible area
            const halfHeight = Math.max(size.y / 2 + padding, MINIMAP_SIZE / 4);

            this.minimapCamera.left = center.x - halfWidth;
            this.minimapCamera.right = center.x + halfWidth;
            this.minimapCamera.top = center.y + halfHeight;
            this.minimapCamera.bottom = center.y - halfHeight;

            this.minimapCamera.position.set(center.x, center.y, 1000); // Keep Z fixed or adjust based on Z bounds if needed
            this.minimapCamera.lookAt(center.x, center.y, 0);
        }

        this.minimapCamera.updateProjectionMatrix();
    }

    _setupFrustumHelper() {
        const mainCamera = this.pluginManager.getPlugin('CameraPlugin')?.getCameraInstance();
        if (mainCamera) {
            this.frustumHelper = new THREE.CameraHelper(mainCamera);
            this.frustumHelper.visible = true; // Make sure it's visible
            this.minimapScene.add(this.frustumHelper);
        } else {
            console.warn("MinimapPlugin: Main camera not found for FrustumHelper setup.");
        }
    }

    _addNodeProxy(node) {
        if (this.nodeProxies.has(node.id)) return;

        const proxyGeometry = new THREE.PlaneGeometry(1, 1);
        // Robustly access node color, falling back to default if not defined
        const nodeColor = (node.data && node.data.color) ? node.data.color : NODE_PROXY_COLOR;
        const proxyMaterial = new THREE.MeshBasicMaterial({
            color: nodeColor,
            side: THREE.DoubleSide,
        });
        const proxyMesh = new THREE.Mesh(proxyGeometry, proxyMaterial);
        proxyMesh.userData.nodeId = node.id;
        this.nodeProxies.set(node.id, proxyMesh);
        this.minimapScene.add(proxyMesh);
    }

    _removeNodeProxy(nodeId) {
        const actualNodeId = typeof nodeId === 'string' ? nodeId : nodeId.id;
        const proxyMesh = this.nodeProxies.get(actualNodeId);
        if (proxyMesh) {
            this.minimapScene.remove(proxyMesh);
            proxyMesh.geometry.dispose();
            proxyMesh.material.dispose();
            this.nodeProxies.delete(actualNodeId);
        }
    }

    _updateNodeProxies() {
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        if (!nodePlugin) return;

        nodePlugin.getNodes().forEach((node) => {
            const proxy = this.nodeProxies.get(node.id);
            if (proxy) {
                proxy.position.copy(node.position);
                const proxySize = Math.max(20, node.getBoundingSphereRadius() * 0.5);
                proxy.scale.set(proxySize, proxySize, 1);
                // Robustly access node color, falling back to default if not defined
                const nodeColor = (node.data && node.data.color) ? node.data.color : NODE_PROXY_COLOR;
                if (proxy.material.color.getHex() !== nodeColor) {
                    proxy.material.color.set(nodeColor);
                }
            }
        });
    }

    _updateFrustumHelper() {
        // The CameraHelper updates itself based on the camera it's helping.
        // We might need to ensure the main camera's matrices are up-to-date before this render pass,
        // but typically that's handled by the main render loop.
        // If the helper is not updating, explicitly call:
        if (this.frustumHelper) {
             // this.frustumHelper.update(); // Often not needed if main camera updates its matrixWorld
             // Ensure the helper itself is visible if it was ever turned off
             this.frustumHelper.visible = true;

             // CameraHelper's default colors might not match FRUSTUM_COLOR.
             // To customize CameraHelper appearance, one might need to access its internal lines/materials
             // or use a more manual approach if specific styling is critical.
             // For now, default CameraHelper appearance is accepted.
             if (this.frustumHelper.material) {
                // Attempt to set color, though CameraHelper uses specific point/line materials
                if (this.frustumHelper.material.color) {
                    this.frustumHelper.material.color.setHex(FRUSTUM_COLOR);
                }
             }
             // For more detailed styling, one might iterate over frustumHelper.children if it's a Group
        }
    }

    render(renderer) {
        if (!this.minimapCamera) return;

        this._updateMinimapCameraView(); // Adjust camera before rendering
        this._updateNodeProxies();
        this._updateFrustumHelper();

        renderer.getSize(this.currentViewport);
        const currentClearColor = renderer.getClearColor(new THREE.Color());
        const currentClearAlpha = renderer.getClearAlpha();
        const currentRenderTarget = renderer.getRenderTarget();

        const viewportWidth = MINIMAP_SIZE;
        const viewportHeight = MINIMAP_SIZE;
        const viewportX = this.currentViewport.x - viewportWidth - MINIMAP_MARGIN;
        const viewportY = MINIMAP_MARGIN;

        renderer.setViewport(viewportX, viewportY, viewportWidth, viewportHeight);
        renderer.setScissor(viewportX, viewportY, viewportWidth, viewportHeight);
        renderer.setScissorTest(true);

        renderer.setClearColor(MINIMAP_BG_COLOR, MINIMAP_BG_OPACITY);
        renderer.clearDepth();
        renderer.render(this.minimapScene, this.minimapCamera);

        renderer.setViewport(0, 0, this.currentViewport.x, this.currentViewport.y);
        renderer.setScissor(0, 0, this.currentViewport.x, this.currentViewport.y);
        renderer.setScissorTest(false);
        renderer.setClearColor(currentClearColor, currentClearAlpha);
        if (currentRenderTarget) renderer.setRenderTarget(currentRenderTarget);
    }

    dispose() {
        super.dispose();
        this.space.off('node:added', this._addNodeProxy.bind(this));
        this.space.off('node:removed', this._removeNodeProxy.bind(this));

        this.nodeProxies.forEach((proxy) => {
            this.minimapScene.remove(proxy);
            proxy.geometry.dispose();
            proxy.material.dispose();
        });
        this.nodeProxies.clear();

        if (this.frustumHelper) {
            this.minimapScene.remove(this.frustumHelper);
            this.frustumHelper.geometry.dispose();
            this.frustumHelper.material.dispose();
        }
        this.minimapScene.clear();
    }
}
