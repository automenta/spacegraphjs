import * as THREE from 'three';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { Plugin } from '../core/Plugin.js';
import { $ } from '../utils.js';
import {
    EffectComposer,
    RenderPass,
    EffectPass,
    BloomEffect,
    OutlineEffect,
    Selection,
    KernelSize,
    SSAOEffect,
    NormalPass,
    BlendFunction,
} from 'postprocessing';
import { InstancedMeshManager } from '../rendering/InstancedMeshManager.js';

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
            enabled: true,
            intensity: 0.5,
            kernelSize: KernelSize.MEDIUM,
            luminanceThreshold: 0.85,
            luminanceSmoothing: 0.4,
        },
        ssao: {
            enabled: true,
            blendFunction: BlendFunction.MULTIPLY,
            samples: 16,
            rings: 4,
            distanceThreshold: 0.05,
            distanceFalloff: 0.01,
            rangeThreshold: 0.005,
            rangeFalloff: 0.001,
            luminanceInfluence: 0.6,
            radius: 15,
            scale: 0.6,
            bias: 0.03,
            intensity: 1.5,
            color: 0x000000,
        },
        outline: {
            enabled: true,
            blendFunction: BlendFunction.SCREEN,
            edgeStrength: 2.5,
            pulseSpeed: 0.0,
            visibleEdgeColor: 0xffaa00,
            hiddenEdgeColor: 0x22090a,
            kernelSize: KernelSize.VERY_SMALL,
            blur: false,
            xRay: true,
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
            const object = selectedItem.item?.mesh || selectedItem.item?.line;
            if (object && this._isObjectInMainScene(object)) {
                this.selection.add(object);
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
        const cameraPlugin = this.pluginManager?.getPlugin('CameraPlugin');
        const cam = cameraPlugin?.getCameraInstance();
        const deltaTime = this.clock.getDelta();

        if (cam && this.composer) {
            this.composer.render(deltaTime);
            if (this.renderCSS3D) this.renderCSS3D.render(this.cssScene, cam);
        } else if (cam && this.renderGL) {
            this.renderGL.render(this.scene, cam);
            if (this.renderCSS3D) this.renderCSS3D.render(this.cssScene, cam);
        }

        const minimapPlugin = this.pluginManager?.getPlugin('MinimapPlugin');
        if (minimapPlugin?.render && this.renderGL) {
            minimapPlugin.render(this.renderGL);
        }
    }

    _setupRenderersAndComposer() {
        if (!this.space?.container) {
            console.error('RenderingPlugin: SpaceGraph container not available.');
            return;
        }

        const cameraPlugin = this.pluginManager?.getPlugin('CameraPlugin');
        const cam = cameraPlugin?.getCameraInstance();
        if (!cam) {
            console.error('RenderingPlugin: Camera instance not available for setup.');
            return;
        }

        this.webglCanvas = $('#webgl-canvas');
        if (!this.webglCanvas) {
            this.webglCanvas = document.createElement('canvas');
            this.webglCanvas.id = 'webgl-canvas';
            this.space.container.appendChild(this.webglCanvas);
        }

        this.renderGL = new THREE.WebGLRenderer({
            canvas: this.webglCanvas,
            powerPreference: 'high-performance',
            antialias: false,
            stencil: true,
            depth: true,
            alpha: true,
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
        this.css3dContainer = document.createElement('div');
        this.css3dContainer.id = 'css3d-container';
        Object.assign(this.css3dContainer.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
        });
        this.css3dContainer.appendChild(this.renderCSS3D.domElement);
        this.space.container.appendChild(this.css3dContainer);
    }

    _rebuildEffectPasses() {
        if (!this.composer || !this.renderPass) return;

        const cameraPlugin = this.pluginManager?.getPlugin('CameraPlugin');
        const cam = cameraPlugin?.getCameraInstance();
        if (!cam) return;

        if (this.normalPassInstance) {
            this.composer.removePass(this.normalPassInstance);
            this.normalPassInstance.dispose();
            this.normalPassInstance = null;
        }
        if (this.effectPassSSAO) {
            this.composer.removePass(this.effectPassSSAO);
            this.effectPassSSAO.dispose();
            this.effectPassSSAO = null;
        }
        if (this.effectPassOutline) {
            this.composer.removePass(this.effectPassOutline);
            this.effectPassOutline.dispose();
            this.effectPassOutline = null;
        }
        if (this.effectPassBloom) {
            this.composer.removePass(this.effectPassBloom);
            this.effectPassBloom.dispose();
            this.effectPassBloom = null;
        }

        this.ssaoEffect?.dispose();
        this.ssaoEffect = null;
        this.outlineEffect?.dispose();
        this.outlineEffect = null;
        this.bloomEffect?.dispose();
        this.bloomEffect = null;

        if (this.effectsConfig.ssao.enabled) {
            if (!this.normalPassInstance) {
                this.normalPassInstance = new NormalPass(this.scene, cam, {
                    renderTarget: new THREE.WebGLRenderTarget(1, 1, {
                        minFilter: THREE.LinearFilter,
                        magFilter: THREE.LinearFilter,
                        format: THREE.RGBAFormat,
                    }),
                });
                this.composer.addPass(this.normalPassInstance);
            }
            this.ssaoEffect = new SSAOEffect(cam, this.normalPassInstance.texture, this.effectsConfig.ssao);
            this.effectPassSSAO = new EffectPass(cam, this.ssaoEffect);
            this.composer.addPass(this.effectPassSSAO);
        } else if (this.normalPassInstance) {
            this.composer.removePass(this.normalPassInstance);
            this.normalPassInstance.dispose();
            this.normalPassInstance = null;
        }

        if (this.effectsConfig.outline.enabled) {
            if (!this.selection) this.selection = new Selection();
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
        if (this.effectsConfig[effectName]) {
            this.effectsConfig[effectName].enabled = enabled;
            this._rebuildEffectPasses();
            this.space.emit('effect:enabled:changed', { effectName, enabled });
        } else {
            console.warn(`RenderingPlugin: Effect "${effectName}" not found for enabling/disabling.`);
        }
    }

    configureEffect(effectName, settings) {
        if (this.effectsConfig[effectName]) {
            Object.assign(this.effectsConfig[effectName], settings);
            this._rebuildEffectPasses();
            this.space.emit('effect:settings:changed', { effectName, settings });
        } else {
            console.warn(`RenderingPlugin: Effect "${effectName}" not found for configuration.`);
        }
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
            case 'ambient':
                light = new THREE.AmbientLight(color, intensity);
                break;
            case 'directional':
                light = new THREE.DirectionalLight(color, intensity);
                if (options.position) light.position.set(options.position.x, options.position.y, options.position.z);
                else light.position.set(50, 100, 75);
                if (options.target instanceof THREE.Object3D) {
                    light.target = options.target;
                } else {
                    light.target = new THREE.Object3D();
                    light.target.position.set(0, 0, 0);
                }
                this.scene.add(light.target);

                if (options.castShadow !== false) {
                    light.castShadow = true;
                    light.shadow.mapSize.width = options.shadowMapSizeWidth ?? 2048;
                    light.shadow.mapSize.height = options.shadowMapSizeHeight ?? 2048;
                    light.shadow.camera.near = options.shadowCameraNear ?? 0.5;
                    light.shadow.camera.far = options.shadowCameraFar ?? 500;
                    const d = options.shadowCameraSize ?? 100;
                    light.shadow.camera.left = -d;
                    light.shadow.camera.right = d;
                    light.shadow.camera.top = d;
                    light.shadow.camera.bottom = -d;
                }
                break;
            case 'point':
                light = new THREE.PointLight(color, intensity, options.distance ?? 1000, options.decay ?? 2);
                if (options.position) light.position.set(options.position.x, options.position.y, options.position.z);
                if (options.castShadow) {
                    light.castShadow = true;
                    light.shadow.mapSize.width = options.shadowMapSizeWidth ?? 1024;
                    light.shadow.mapSize.height = options.shadowMapSizeHeight ?? 1024;
                    light.shadow.camera.near = options.shadowCameraNear ?? 0.5;
                    light.shadow.camera.far = options.shadowCameraFar ?? 500;
                }
                break;
            default:
                console.error(`RenderingPlugin: Unknown light type '${type}'`);
                return null;
        }

        if (light) {
            light.userData.lightId = id;
            this.managedLights.set(id, light);
            this.scene.add(light);
            this.space.emit('light:added', { id, type, light });
        }
        return light;
    }

    removeLight(id) {
        const light = this.managedLights.get(id);
        if (light) {
            if (light.target && light.target.parent === this.scene) this.scene.remove(light.target);
            this.scene.remove(light);
            if (typeof light.dispose === 'function') light.dispose();
            this.managedLights.delete(id);
            this.space.emit('light:removed', { id });
            return true;
        }
        console.warn(`RenderingPlugin: Light with id '${id}' not found.`);
        return false;
    }

    getLight(id) {
        return this.managedLights.get(id);
    }

    configureLight(id, options) {
        const light = this.managedLights.get(id);
        if (!light) return false;
        if (options.color !== undefined) light.color.set(options.color);
        if (options.intensity !== undefined) light.intensity = options.intensity;
        if (options.position && light.position)
            light.position.set(options.position.x, options.position.y, options.position.z);
        if (options.castShadow !== undefined && light.castShadow !== undefined) light.castShadow = options.castShadow;

        if (light.shadow) {
            if (options.shadowMapSizeWidth !== undefined) light.shadow.mapSize.width = options.shadowMapSizeWidth;
            if (options.shadowMapSizeHeight !== undefined) light.shadow.mapSize.height = options.shadowMapSizeHeight;
            if (options.shadowCameraNear !== undefined) light.shadow.camera.near = options.shadowCameraNear;
            if (options.shadowCameraFar !== undefined) light.shadow.camera.far = options.shadowCameraFar;
            if (light.shadow.camera instanceof THREE.OrthographicCamera) {
                const d = options.shadowCameraSize;
                if (d !== undefined) {
                    light.shadow.camera.left = -d;
                    light.shadow.camera.right = d;
                    light.shadow.camera.top = d;
                    light.shadow.camera.bottom = -d;
                }
            }
            light.shadow.camera.updateProjectionMatrix();
        }
        this.space.emit('light:configured', { id, light, options });
        return true;
    }

    _setupLighting() {
        this.addLight('defaultAmbient', 'ambient', { intensity: 0.8 });
        this.addLight('defaultDirectional', 'directional', {
            intensity: 1.2,
            position: { x: 150, y: 200, z: 100 },
            castShadow: true,
            shadowMapSizeWidth: 2048,
            shadowMapSizeHeight: 2048,
            shadowCameraNear: 10,
            shadowCameraFar: 600,
            shadowCameraSize: 150,
        });
    }

    setBackground(color = 0x000000, alpha = 0) {
        this.background = { color, alpha };
        if (this.renderGL) this.renderGL.setClearColor(color, alpha);
        if (this.webglCanvas) {
            this.webglCanvas.style.backgroundColor =
                alpha === 0 ? 'transparent' : `#${new THREE.Color(color).getHexString()}`;
        }
    }

    _onWindowResize = () => {
        const cameraPlugin = this.pluginManager?.getPlugin('CameraPlugin');
        const cam = cameraPlugin?.getCameraInstance();
        if (!cam || !this.renderGL || !this.renderCSS3D || !this.composer) return;

        const iw = window.innerWidth;
        const ih = window.innerHeight;

        cam.aspect = iw / ih;
        cam.updateProjectionMatrix();

        this.renderGL.setSize(iw, ih);
        this.composer.setSize(iw, ih);
        this.renderCSS3D.setSize(iw, ih);
        this.space.emit('renderer:resize', { width: iw, height: ih });
    };

    getWebGLScene() {
        return this.scene;
    }
    getCSS3DScene() {
        return this.cssScene;
    }
    getInstancedMeshManager() {
        return this.instancedMeshManager;
    }

    getCSS3DRenderer() {
        return this.renderCSS3D;
    }

    dispose() {
        super.dispose();
        window.removeEventListener('resize', this._onWindowResize);
        this.space.off('selection:changed', this.handleSelectionChange);

        this.instancedMeshManager?.dispose();
        this.instancedMeshManager = null;

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
            if (object.material) {
                if (Array.isArray(object.material)) object.material.forEach((m) => m.dispose());
                else object.material.dispose();
            }
        });
        this.scene?.clear();
        this.cssScene?.clear();

        this.scene = null;
        this.cssScene = null;
        this.renderGL = null;
        this.renderCSS3D = null;
        this.composer = null;
        this.clock = null;
        this.effectsConfig = null;
        this.webglCanvas = null;
        this.css3dContainer = null;
    }
}
