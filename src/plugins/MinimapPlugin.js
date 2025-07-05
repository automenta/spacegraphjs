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
        this._setupMinimapCamera();
        this._setupFrustumHelper();

        this.space.on('node:added', this._addNodeProxy.bind(this));
        this.space.on('node:removed', this._removeNodeProxy.bind(this));

        this.pluginManager.getPlugin('NodePlugin')?.getNodes().forEach((node) => this._addNodeProxy(node));
    }

    _setupMinimapCamera() {
        const aspect = 1;
        const viewSize = 2000;
        this.minimapCamera = new THREE.OrthographicCamera(
            (-viewSize * aspect) / 2,
            (viewSize * aspect) / 2,
            viewSize / 2,
            -viewSize / 2,
            1,
            10000
        );
        this.minimapCamera.position.set(0, 0, 1000);
        this.minimapCamera.lookAt(0, 0, 0);
        this.minimapScene.add(this.minimapCamera);
    }

    _setupFrustumHelper() {
        const mainCamera = this.pluginManager.getPlugin('CameraPlugin')?.getCameraInstance();
        if (mainCamera) {
            const frustumGeometry = new THREE.BufferGeometry();
            const frustumMaterial = new THREE.LineBasicMaterial({ color: FRUSTUM_COLOR, linewidth: 2 });
            this.frustumHelper = new THREE.LineSegments(frustumGeometry, frustumMaterial);
            this.frustumHelper.frustumCulled = false;
            this.minimapScene.add(this.frustumHelper);
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
        const mainCamera = this.pluginManager.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!this.frustumHelper || !mainCamera) return;

        mainCamera.updateMatrixWorld();
        mainCamera.updateProjectionMatrix();

        const cameraPosition = new THREE.Vector3();
        mainCamera.getWorldPosition(cameraPosition);

        const viewTarget = new THREE.Vector3();
        mainCamera.getWorldDirection(viewTarget);
        viewTarget.multiplyScalar(-cameraPosition.z / viewTarget.z).add(cameraPosition);

        const aspect = mainCamera.aspect;
        const fov = mainCamera.fov * THREE.MathUtils.DEG2RAD;
        const heightAtTarget = 2 * Math.tan(fov / 2) * Math.abs(cameraPosition.z - viewTarget.z);
        const widthAtTarget = heightAtTarget * aspect;

        const halfWidth = widthAtTarget / 2;
        const halfHeight = heightAtTarget / 2;

        const p = [
            viewTarget.x - halfWidth,
            viewTarget.y + halfHeight,
            0,
            viewTarget.x + halfWidth,
            viewTarget.y + halfHeight,
            0,
            viewTarget.x + halfWidth,
            viewTarget.y - halfHeight,
            0,
            viewTarget.x - halfWidth,
            viewTarget.y - halfHeight,
            0,
        ];

        const vertices = new Float32Array([
            p[0], p[1], p[2], p[3], p[4], p[5],
            p[3], p[4], p[5], p[6], p[7], p[8],
            p[6], p[7], p[8], p[9], p[10], p[11],
            p[9], p[10], p[11], p[0], p[1], p[2],
        ]);

        this.frustumHelper.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        this.frustumHelper.geometry.attributes.position.needsUpdate = true;
        this.frustumHelper.geometry.computeBoundingSphere();
    }

    render(renderer) {
        if (!this.minimapCamera) return;

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
