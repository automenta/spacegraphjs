import * as THREE from 'three';
import {CSS3DRenderer} from 'three/addons/renderers/CSS3DRenderer.js';
import {Plugin} from '../core/Plugin.js';
import {$} from '../utils.js';
import {
    BlendFunction,
    BloomEffect,
    EffectComposer,
    EffectPass,
    KernelSize,
    NormalPass,
    OutlineEffect,
    RenderPass,
    Selection,
    SSAOEffect,
} from 'postprocessing';
import {InstancedMeshManager} from '../rendering/InstancedMeshManager.js';
import {Line2} from 'three/addons/lines/Line2.js'; // Import Line2 for instanceof check

export class RenderingPlugin extends Plugin {
    scene = null;
    cssScene = null;
    renderGL = null;
    renderCSS3D = null;
    composer = null;
    clock = null;

    bloomEffect = null;
    ssaoEffect = null;
    outlineEffect = null;
    normalPass = null;
    selection = null;

    renderPass = null;
    normalPassInstance = null;
    effectPassBloom = null;
    effectPassSSAO = null;
    effectPassOutline = null;

    effectsConfig = {
        bloom: {
            enabled: true, intensity: 0.5, kernelSize: KernelSize.MEDIUM, luminanceThreshold: 0.85, luminanceSmoothing: 0.4,
        },
        ssao: {
            enabled: true, blendFunction: BlendFunction.MULTIPLY, samples: 16, rings: 4, distanceThreshold: 0.05,
            distanceFalloff: 0.01, rangeThreshold: 0.005, rangeFalloff: 0.001, luminanceInfluence: 0.6,
            radius: 15, scale: 0.6, bias: 0.03, intensity: 1.5, color: 0x000000,
        },
        outline: {
            enabled: true, blendFunction: BlendFunction.SCREEN, edgeStrength: 2.5, pulseSpeed: 0.0,
            visibleEdgeColor: 0xffaa00, hiddenEdgeColor: 0x22090a, kernelSize: KernelSize.VERY_SMALL,
            blur: false, xRay: true,
        },
    };

    css3dContainer = null;
    webglCanvas = null;
    background = { color: 0x1a1a1d, alpha: 1.0 };
    managedLights = new Map();
    instancedMeshManager = null;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.scene = new THREE.Scene();
        this.cssScene = new THREE.Scene();
        this.clock = new THREE.Clock();
    }

    getName() {
        return 'RenderingPlugin';
    }

    init() {
        super.init();
        this._setupRenderersAndComposer();
        this._setupLighting();
        this.setBackground(this.background.color, this.background.alpha);
        this.instancedMeshManager = new InstancedMeshManager(this.scene);
        window.addEventListener('resize', this._onWindowResize, false);
        this._setupSelectionListener();
        this._rebuildEffectPasses();
    }

    _setupSelectionListener() {
        this.space.on('selection:changed', this.handleSelectionChange.bind(this));
    }

    handleSelectionChange(payload) {
        if (!this.outlineEffect || !this.selection || !this.effectsConfig.outline.enabled) return;

        this.selection.clear();
        payload.selected?.forEach((selectedItem) => {
            // Corrected: selectedItem is the node or edge instance directly
            const object = selectedItem.mesh || selectedItem.line;
            if (object && this._isObjectInMainScene(object)) {
                // Ensure the object is a WebGL renderable type that OutlineEffect can process
                if (object instanceof THREE.Mesh || object instanceof Line2 || object instanceof THREE.Line) {
                    this.selection.add(object);
                }
            }
        });
    }

    _isObjectInMainScene(object) {
        let current = object;
        while (current) {
            if (current === this.scene) return true;
            current = current.parent;
        }
        return false;
    }

    update() {
        const cam = this.pluginManager?.getPlugin('CameraPlugin')?.getCameraInstance();
        const deltaTime = this.clock.getDelta();

        // Defensive check for composer and its renderer
        if (cam && this.composer && this.composer.renderer) {
            this.composer.render(deltaTime);
            this.renderCSS3D?.render(this.cssScene, cam);
        } else if (cam && this.renderGL) {
            this.renderGL.render(this.scene, cam);
            this.renderCSS3D?.render(this.cssScene, cam);
        }

        this.pluginManager?.getPlugin('MinimapPlugin')?.render?.(this.renderGL);
    }

    _setupRenderersAndComposer() {
        if (!this.space?.container) {
            console.error('RenderingPlugin: SpaceGraph container not available.');
            return;
        }

        const cam = this.pluginManager?.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!cam) {
            console.error('RenderingPlugin: Camera instance not available.');
            return;
        }

        this.webglCanvas = $('#webgl-canvas') || document.createElement('canvas');
        this.webglCanvas.id = 'webgl-canvas';
        if (!this.webglCanvas.parentNode) {
            this.space.container.appendChild(this.webglCanvas);
        }


        this.renderGL = new THREE.WebGLRenderer({
            canvas: this.webglCanvas, powerPreference: 'high-performance', antialias: false, stencil: true, depth: true, alpha: true,
        });
        this.renderGL.setSize(window.innerWidth, window.innerHeight);
        this.renderGL.setPixelRatio(window.devicePixelRatio);
        this.renderGL.outputColorSpace = THREE.SRGBColorSpace;
        this.renderGL.shadowMap.enabled = true;
        this.renderGL.shadowMap.type = THREE.PCFSoftShadowMap;

        this.composer = new EffectComposer(this.renderGL);
        this.renderPass = new RenderPass(this.scene, cam);
        this.composer.addPass(this.renderPass);

        this.renderCSS3D = new CSS3DRenderer();
        this.renderCSS3D.setSize(window.innerWidth, window.innerHeight);

        this.css3dContainer = $('#css3d-container');
        if (!this.css3dContainer) {
            this.css3dContainer = document.createElement('div');
            this.css3dContainer.id = 'css3d-container';
            this.space.container.appendChild(this.css3dContainer);
        }
        this.css3dContainer.appendChild(this.renderCSS3D.domElement);

        Object.assign(this.renderCSS3D.domElement.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none',
        });
    }

    _rebuildEffectPasses() {
        if (!this.composer || !this.renderPass || !this.composer.renderer) return; // Added defensive check for composer.renderer

        const cam = this.pluginManager?.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!cam) return;

        this.normalPassInstance?.dispose(); this.composer.removePass(this.normalPassInstance); this.normalPassInstance = null;
        this.effectPassSSAO?.dispose(); this.composer.removePass(this.effectPassSSAO); this.effectPassSSAO = null;
        this.effectPassOutline?.dispose(); this.composer.removePass(this.effectPassOutline); this.effectPassOutline = null;
        this.effectPassBloom?.dispose(); this.composer.removePass(this.effectPassBloom); this.effectPassBloom = null;

        this.ssaoEffect?.dispose(); this.ssaoEffect = null;
        this.outlineEffect?.dispose(); this.outlineEffect = null;
        this.bloomEffect?.dispose(); this.bloomEffect = null;

        if (this.effectsConfig.ssao.enabled) {
            this.normalPassInstance = new NormalPass(this.scene, cam, { renderTarget: new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }) });
            this.composer.addPass(this.normalPassInstance);
            this.ssaoEffect = new SSAOEffect(cam, this.normalPassInstance.texture, this.effectsConfig.ssao);
            this.effectPassSSAO = new EffectPass(cam, this.ssaoEffect);
            this.composer.addPass(this.effectPassSSAO);
        }

        if (this.effectsConfig.outline.enabled) {
            this.selection ??= new Selection();
            this.outlineEffect = new OutlineEffect(this.scene, cam, this.effectsConfig.outline);
            this.outlineEffect.selection = this.selection;
            this.effectPassOutline = new EffectPass(cam, this.outlineEffect);
            this.composer.addPass(this.effectPassOutline);
        }

        if (this.effectsConfig.bloom.enabled) {
            this.bloomEffect = new BloomEffect(this.effectsConfig.bloom);
            this.effectPassBloom = new EffectPass(cam, this.bloomEffect);
            this.composer.addPass(this.effectPassBloom);
        }
    }

    setEffectEnabled(effectName, enabled) {
        if (!this.effectsConfig[effectName]) return console.warn(`RenderingPlugin: Effect "${effectName}" not found.`);
        this.effectsConfig[effectName].enabled = enabled;
        this._rebuildEffectPasses();
        this.space.emit('effect:enabled:changed', { effectName, enabled });
    }

    configureEffect(effectName, settings) {
        if (!this.effectsConfig[effectName]) return console.warn(`RenderingPlugin: Effect "${effectName}" not found.`);
        Object.assign(this.effectsConfig[effectName], settings);
        this._rebuildEffectPasses();
        this.space.emit('effect:settings:changed', { effectName, settings });
    }

    getEffectConfiguration(effectName) {
        return this.effectsConfig[effectName] ? { ...this.effectsConfig[effectName] } : null;
    }

    addLight(id, type, options = {}) {
        if (this.managedLights.has(id)) return this.managedLights.get(id);
        let light;
        const color = options.color ?? 0xffffff;
        const intensity = options.intensity ?? 1.0;

        switch (type.toLowerCase()) {
            case 'ambient': light = new THREE.AmbientLight(color, intensity); break;
            case 'directional':
                light = new THREE.DirectionalLight(color, intensity);
                light.position.set(options.position?.x ?? 50, options.position?.y ?? 100, options.position?.z ?? 75);
                // Corrected: Ensure light.target is an Object3D and its position is set correctly
                if (options.target instanceof THREE.Object3D) {
                    light.target = options.target;
                } else if (options.target instanceof THREE.Vector3) {
                    light.target.position.copy(options.target);
                } else {
                    // Default target position is (0,0,0), no change needed unless specified
                    light.target.position.set(0, 0, 0);
                }
                this.scene.add(light.target); // Add the target object to the scene
                if (options.castShadow !== false) {
                    light.castShadow = true;
                    light.shadow.mapSize.width = options.shadowMapSizeWidth ?? 2048;
                    light.shadow.mapSize.height = options.shadowMapSizeHeight ?? 2048;
                    light.shadow.camera.near = options.shadowCameraNear ?? 0.5;
                    light.shadow.camera.far = options.shadowCameraFar ?? 500;
                    const d = options.shadowCameraSize ?? 100;
                    light.shadow.camera.left = -d; light.shadow.camera.right = d;
                    light.shadow.camera.top = d; light.shadow.camera.bottom = -d;
                }
                break;
            case 'point':
                light = new THREE.PointLight(color, intensity, options.distance ?? 1000, options.decay ?? 2);
                light.position.set(options.position?.x ?? 0, options.position?.y ?? 0, options.position?.z ?? 0);
                if (options.castShadow) {
                    light.castShadow = true;
                    light.shadow.mapSize.width = options.shadowMapSizeWidth ?? 1024;
                    light.shadow.mapSize.height = options.shadowMapSizeHeight ?? 1024;
                    light.shadow.camera.near = options.shadowCameraNear ?? 0.5;
                    light.shadow.camera.far = options.shadowCameraFar ?? 500;
                }
                break;
            default: console.error(`RenderingPlugin: Unknown light type '${type}'`); return null;
        }

        if (!light) return null;
        light.userData.lightId = id;
        this.managedLights.set(id, light);
        this.scene.add(light);
        this.space.emit('light:added', { id, type, light });
        return light;
    }

    removeLight(id) {
        const light = this.managedLights.get(id);
        if (!light) return console.warn(`RenderingPlugin: Light '${id}' not found.`) || false;
        if (light.target?.parent === this.scene) this.scene.remove(light.target);
        this.scene.remove(light);
        light.dispose?.();
        this.managedLights.delete(id);
        this.space.emit('light:removed', { id });
        return true;
    }

    getLight(id) {
        return this.managedLights.get(id);
    }

    configureLight(id, options) {
        const light = this.managedLights.get(id);
        if (!light) return false;
        options.color !== undefined && light.color.set(options.color);
        options.intensity !== undefined && (light.intensity = options.intensity);
        options.position && light.position?.set(options.position.x, options.position.y, options.position.z);
        options.castShadow !== undefined && light.castShadow !== undefined && (light.castShadow = options.castShadow);

        if (light.shadow) {
            options.shadowMapSizeWidth !== undefined && (light.shadow.mapSize.width = options.shadowMapSizeWidth);
            options.shadowMapSizeHeight !== undefined && (light.shadow.mapSize.height = options.shadowMapSizeHeight);
            options.shadowCameraNear !== undefined && (light.shadow.camera.near = options.shadowCameraNear);
            options.shadowCameraFar !== undefined && (light.shadow.camera.far = options.shadowCameraFar);
            if (light.shadow.camera instanceof THREE.OrthographicCamera && options.shadowCameraSize !== undefined) {
                const d = options.shadowCameraSize;
                light.shadow.camera.left = -d; light.shadow.camera.right = d;
                light.shadow.camera.top = d; light.shadow.camera.bottom = -d;
            }
            light.shadow.camera.updateProjectionMatrix();
        }
        this.space.emit('light:configured', { id, light, options });
        return true;
    }

    _setupLighting() {
        this.addLight('defaultAmbient', 'ambient', { intensity: 0.8 });
        this.addLight('defaultDirectional', 'directional', {
            intensity: 1.2, position: { x: 150, y: 200, z: 100 }, castShadow: true,
            shadowMapSizeWidth: 2048, shadowMapSizeHeight: 2048, shadowCameraNear: 10, shadowCameraFar: 600, shadowCameraSize: 150,
        });
    }

    setBackground(color = 0x000000, alpha = 0) {
        this.background = { color, alpha };
        this.renderGL?.setClearColor(color, alpha);
        if (this.webglCanvas) this.webglCanvas.style.backgroundColor = alpha === 0 ? 'transparent' : `#${new THREE.Color(color).getHexString()}`;
    }

    _onWindowResize = () => {
        const cam = this.pluginManager?.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!cam || !this.renderGL || !this.renderCSS3D || !this.composer) return;

        const { innerWidth: iw, innerHeight: ih } = window;
        cam.aspect = iw / ih;
        cam.updateProjectionMatrix();

        this.renderGL.setSize(iw, ih);
        this.composer.setSize(iw, ih);
        this.renderCSS3D.setSize(iw, ih);
        this.space.emit('renderer:resize', { width: iw, height: ih });
    };

    _updateFrustumHelper() {
        const mainCamera = this.pluginManager.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!this.frustumHelper || !mainCamera) {
            if (this.frustumHelper) this.frustumHelper.visible = false;
            return;
        }

        mainCamera.updateMatrixWorld();
        mainCamera.updateProjectionMatrix();

        const corners = [];
        // NDC coordinates for near and far planes
        const ndcCorners = [
            new THREE.Vector3(-1, -1, -1), // Near bottom left
            new THREE.Vector3( 1, -1, -1), // Near bottom right
            new THREE.Vector3( 1,  1, -1), // Near top right
            new THREE.Vector3(-1,  1, -1), // Near top left
            new THREE.Vector3(-1, -1,  1), // Far bottom left
            new THREE.Vector3( 1, -1,  1), // Far bottom right
            new THREE.Vector3( 1,  1,  1), // Far top right
            new THREE.Vector3(-1,  1,  1)  // Far top left
        ];

        for (let i = 0; i < 8; i++) {
            corners.push(ndcCorners[i].clone().unproject(mainCamera));
        }

        // Project these corners onto the XY plane (Z=0)
        const projectedCorners = corners.map(p => new THREE.Vector3(p.x, p.y, 0));

        // Determine the bounding box of the projected corners
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        projectedCorners.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        // Define the rectangle vertices for the frustum helper
        const p = [
            minX, minY, 0,
            maxX, minY, 0,
            maxX, maxY, 0,
            minX, maxY, 0
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
        this.frustumHelper.visible = true; // Ensure it's visible
    }

    getWebGLScene() { return this.scene; }
    getCSS3DScene() { return this.cssScene; }
    getInstancedMeshManager() { return this.instancedMeshManager; }
    getCSS3DRenderer() { return this.renderCSS3D; }

    dispose() {
        super.dispose();
        window.removeEventListener('resize', this._onWindowResize);
        this.space.off('selection:changed', this.handleSelectionChange);

        this.instancedMeshManager?.dispose(); this.instancedMeshManager = null;

        this.effectPassBloom?.dispose();
        this.effectPassSSAO?.dispose();
        this.effectPassOutline?.dispose();
        this.normalPassInstance?.dispose();
        this.bloomEffect?.dispose();
        this.ssaoEffect?.dispose();
        this.outlineEffect?.dispose();
        this.selection?.dispose();

        this.composer?.dispose();
        this.renderPass?.dispose();
        this.renderGL?.dispose();

        this.renderCSS3D?.domElement?.remove();
        this.css3dContainer?.remove();

        this.scene?.traverse((object) => {
            object.geometry?.dispose();
            if (object.material) Array.isArray(object.material) ? object.material.forEach((m) => m.dispose()) : object.material.dispose();
        });
        this.scene?.clear();
        this.cssScene?.clear();

        this.scene = null; this.cssScene = null; this.renderGL = null;
    }
}
