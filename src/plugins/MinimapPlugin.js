import * as THREE from 'three';
import { Plugin } from '../core/Plugin.js';

const MINIMAP_SIZE = 200; // Size of the minimap viewport in pixels
const MINIMAP_MARGIN = 10; // Margin from the corner
const MINIMAP_BG_COLOR = 0x222233;
const MINIMAP_BG_OPACITY = 0.7;
const NODE_PROXY_COLOR = 0x00aaff;
const FRUSTUM_COLOR = 0xffaa00;

export class MinimapPlugin extends Plugin {
    minimapCamera = null;
    nodeProxies = new Map(); // Map<nodeId, THREE.Mesh>
    frustumHelper = null;
    minimapScene = null; // Separate scene for minimap objects if needed, or use main scene with layers

    // Viewport and scissor parameters
    currentViewport = new THREE.Vector4();
    currentScissor = new THREE.Vector4();

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.minimapScene = new THREE.Scene(); // Use a dedicated scene for minimap proxies
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
        // No need to listen to node:updated for position for this PoC,
        // as proxies will read directly from nodes in the render loop.
        // A more optimized version might update proxies on 'node:position:updated'.

        // Initial population of node proxies
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        if (nodePlugin) {
            nodePlugin.getNodes().forEach(node => this._addNodeProxy(node));
        }
    }

    _setupMinimapCamera() {
        // The camera's view should encompass the entire graph.
        // This requires knowing graph bounds, which can be dynamic.
        // For now, use a fixed large area. A better way is to compute bounds.
        const aspect = 1; // Minimap is square
        const viewSize = 2000; // Fixed orthographic view size, adjust as needed
        this.minimapCamera = new THREE.OrthographicCamera(
            -viewSize * aspect / 2, viewSize * aspect / 2,
            viewSize / 2, -viewSize / 2,
            1, 10000 // Near and far clipping planes
        );
        this.minimapCamera.position.set(0, 0, 1000); // Positioned above the scene, looking down
        this.minimapCamera.lookAt(0, 0, 0);
        this.minimapScene.add(this.minimapCamera); // Add to its own scene for clarity
    }

    _setupFrustumHelper() {
        const mainCameraPlugin = this.pluginManager.getPlugin('CameraPlugin');
        const mainCamera = mainCameraPlugin?.getCameraInstance();
        if (mainCamera) {
            // CameraHelper is too complex for minimap. We need a simple PlaneGeometry outline.
            // Create a simple representation of the frustum.
            // This can be a wireframe box or lines representing the view cone.
            // For an orthographic top-down minimap, we'd project the main camera's frustum
            // onto the Z=0 plane.
            // For PoC, we'll use a simple box geometry that we update.
            const frustumGeometry = new THREE.BufferGeometry();
            const frustumMaterial = new THREE.LineBasicMaterial({ color: FRUSTUM_COLOR, linewidth: 2 });
            this.frustumHelper = new THREE.LineSegments(frustumGeometry, frustumMaterial);
            this.frustumHelper.frustumCulled = false; // Ensure it's always rendered
            this.minimapScene.add(this.frustumHelper);
        }
    }

    _addNodeProxy(node) {
        if (this.nodeProxies.has(node.id)) return;

        // Simple square proxy for each node
        const proxyGeometry = new THREE.PlaneGeometry(1, 1); // Will be scaled
        const proxyMaterial = new THREE.MeshBasicMaterial({
            color: node.data.color || NODE_PROXY_COLOR, // Use node color or default
            side: THREE.DoubleSide,
        });
        const proxyMesh = new THREE.Mesh(proxyGeometry, proxyMaterial);
        proxyMesh.userData.nodeId = node.id; // Link back
        this.nodeProxies.set(node.id, proxyMesh);
        this.minimapScene.add(proxyMesh);
    }

    _removeNodeProxy(nodeId) { // NodeId can be string or the node object itself
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

        nodePlugin.getNodes().forEach(node => {
            const proxy = this.nodeProxies.get(node.id);
            if (proxy) {
                proxy.position.copy(node.position);
                // Scale proxy based on node size (e.g., bounding sphere radius)
                const proxySize = Math.max(20, node.getBoundingSphereRadius() * 0.5); // Adjust factor as needed
                proxy.scale.set(proxySize, proxySize, 1);
                // Update color if dynamic
                if (proxy.material.color.getHex() !== (node.data.color || NODE_PROXY_COLOR)) {
                    proxy.material.color.set(node.data.color || NODE_PROXY_COLOR);
                }
            }
        });
    }

    _updateFrustumHelper() {
        const mainCameraPlugin = this.pluginManager.getPlugin('CameraPlugin');
        const mainCamera = mainCameraPlugin?.getCameraInstance();
        if (!this.frustumHelper || !mainCamera) return;

        // Project main camera frustum corners onto Z=0 plane for orthographic minimap
        mainCamera.updateMatrixWorld();
        mainCamera.updateProjectionMatrix();

        const frustum = new THREE.Frustum();
        frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(mainCamera.projectionMatrix, mainCamera.matrixWorldInverse));

        const points = [];
        const near = frustum.planes[4]; // Near plane
        const far = frustum.planes[5];  // Far plane - for perspective this defines the base on Z=0 if camera looks down.
                                        // For general camera, need to intersect frustum lines with Z=0 plane.

        // Simplified: Get the 4 corners of the near plane and 4 corners of the far plane in world space.
        // This is complex to project onto a 2D minimap plane accurately without knowing camera orientation.
        // For a simple PoC, let's draw a rectangle based on camera's view at Z=0.

        // Get camera's view rect at Z=0. This is a simplification.
        // A more accurate way is to project the 8 frustum corners.
        const cameraPosition = new THREE.Vector3();
        mainCamera.getWorldPosition(cameraPosition);

        const viewTarget = new THREE.Vector3();
        mainCamera.getWorldDirection(viewTarget);
        viewTarget.multiplyScalar(-cameraPosition.z / viewTarget.z).add(cameraPosition); // Intersection with Z=0 plane

        const aspect = mainCamera.aspect;
        const fov = mainCamera.fov * THREE.MathUtils.DEG2RAD;
        const heightAtTarget = 2 * Math.tan(fov / 2) * Math.abs(cameraPosition.z - viewTarget.z); // Approximate height of view at target Z
        const widthAtTarget = heightAtTarget * aspect;

        const halfWidth = widthAtTarget / 2;
        const halfHeight = heightAtTarget / 2;

        // Define corners of the rectangle around viewTarget on Z=0 plane
        // This assumes camera is somewhat looking down. A proper projection is more robust.
        const p = [
            viewTarget.x - halfWidth, viewTarget.y + halfHeight, 0,
            viewTarget.x + halfWidth, viewTarget.y + halfHeight, 0,
            viewTarget.x + halfWidth, viewTarget.y - halfHeight, 0,
            viewTarget.x - halfWidth, viewTarget.y - halfHeight, 0,
        ];

        const vertices = new Float32Array([
            p[0], p[1], p[2],  p[3], p[4], p[5],  // Line 1
            p[3], p[4], p[5],  p[6], p[7], p[8],  // Line 2
            p[6], p[7], p[8],  p[9], p[10], p[11], // Line 3
            p[9], p[10], p[11], p[0], p[1], p[2],  // Line 4
        ]);

        this.frustumHelper.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        this.frustumHelper.geometry.attributes.position.needsUpdate = true;
        this.frustumHelper.geometry.computeBoundingSphere();
    }


    // This method will be called by RenderingPlugin's update loop, after main scene render
    render(renderer) {
        if (!this.minimapCamera) return;

        this._updateNodeProxies(); // Update positions/scales of proxies
        this._updateFrustumHelper(); // Update main camera frustum visualization

        // Store current renderer state
        renderer.getSize(this.currentViewport); // Get main viewport size
        const currentClearColor = renderer.getClearColor(new THREE.Color());
        const currentClearAlpha = renderer.getClearAlpha();
        const currentRenderTarget = renderer.getRenderTarget();

        // Set viewport for minimap (e.g., bottom-right corner)
        const viewportWidth = MINIMAP_SIZE;
        const viewportHeight = MINIMAP_SIZE;
        const viewportX = this.currentViewport.x - viewportWidth - MINIMAP_MARGIN;
        const viewportY = MINIMAP_MARGIN;

        renderer.setViewport(viewportX, viewportY, viewportWidth, viewportHeight);
        renderer.setScissor(viewportX, viewportY, viewportWidth, viewportHeight);
        renderer.setScissorTest(true);

        // Set minimap background color and render
        renderer.setClearColor(MINIMAP_BG_COLOR, MINIMAP_BG_OPACITY);
        renderer.clearDepth(); // Clear depth buffer for minimap portion
        renderer.render(this.minimapScene, this.minimapCamera);

        // Restore renderer state
        renderer.setViewport(0, 0, this.currentViewport.x, this.currentViewport.y); // Restore full viewport
        renderer.setScissor(0, 0, this.currentViewport.x, this.currentViewport.y); // Restore full scissor
        renderer.setScissorTest(false);
        renderer.setClearColor(currentClearColor, currentClearAlpha); // Restore original clear color
        if(currentRenderTarget) renderer.setRenderTarget(currentRenderTarget); // Restore if main scene used render target (composer)
    }

    dispose() {
        super.dispose();
        this.space.off('node:added', this._addNodeProxy.bind(this));
        this.space.off('node:removed', this._removeNodeProxy.bind(this));

        this.nodeProxies.forEach(proxy => {
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
        // console.log('MinimapPlugin disposed.');
    }
}
