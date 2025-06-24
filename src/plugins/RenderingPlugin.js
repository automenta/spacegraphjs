/**
 * @file RenderingPlugin.js - Manages all rendering aspects for SpaceGraph.
 * @licence MIT
 */

import * as THREE from 'three';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { Plugin } from '../core/Plugin.js';
import { $ } from '../utils.js'; // Assuming $ is a utility like querySelector
import { EffectComposer, RenderPass, EffectPass, BloomEffect, OutlineEffect, Selection, KernelSize, SSAOEffect, NormalPass } from 'postprocessing';

export class RenderingPlugin extends Plugin {
    scene = null;
    cssScene = null;
    renderGL = null;
    renderCSS3D = null;
    composer = null;
    clock = null;
    outlineEffect = null; // Added for OutlineEffect
    selection = null; // Added for OutlineEffect selection
    css3dContainer = null;
    webglCanvas = null;
    background = { color: 0x1a1a1d, alpha: 1.0 }; // Default background
    managedLights = new Map(); // To store and manage lights added via API

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.scene = new THREE.Scene();
        this.cssScene = new THREE.Scene();
        this.clock = new THREE.Clock(); // Initialize clock
    }

    getName() {
        return 'RenderingPlugin';
    }

    init() {
        super.init();
        this._setupRenderers(); // This now also sets up composer and effects
        this._setupLighting();
        this.setBackground(this.background.color, this.background.alpha);

        // The actual camera object is managed by SpaceGraph (or a CameraPlugin later)
        // but resize needs access to it.
        window.addEventListener('resize', this._onWindowResize, false);
        this._setupSelectionListener(); // Listen for selection changes
    }

    _setupSelectionListener() {
        this.space.on('selection:changed', this.handleSelectionChange.bind(this));
    }

    handleSelectionChange(payload) {
        if (!this.outlineEffect || !this.selection) return;

        // console.log('Handling selection change for outline:', payload);

        payload.deselected?.forEach(deselectedItem => {
            const object = deselectedItem.item?.mesh || deselectedItem.item?.line;
            if (object) {
                this.selection.delete(object); // Changed from remove to delete
            }
        });

        payload.selected?.forEach(selectedItem => {
            const object = selectedItem.item?.mesh || selectedItem.item?.line;
            if (object) {
                // Check if the object is part of the scene graph used by the OutlineEffect
                let current = object;
                let foundInScene = false;
                while(current) {
                    if(current === this.scene) {
                        foundInScene = true;
                        break;
                    }
                    current = current.parent;
                }

                if(foundInScene) {
                    this.selection.add(object);
                } else {
                    // console.warn("RenderingPlugin: Attempted to add object to OutlineEffect selection that is not in the main scene.", object);
                }
            }
        });
         // console.log('Outline selection after change:', this.selection. membros); // .members is internal, use get for public
    }


    // Method to be called by SpaceGraph's animation loop via pluginManager.updatePlugins()
    update() {
        const cameraPlugin = this.pluginManager?.getPlugin('CameraPlugin');
        const cam = cameraPlugin?.getCameraInstance();
        const deltaTime = this.clock.getDelta();

        if (cam && this.composer && this.renderCSS3D) {
            this.composer.render(deltaTime);
            this.renderCSS3D.render(this.cssScene, cam);
        } else if (cam && this.renderGL && this.renderCSS3D) {
            // Fallback if composer isn't ready (should not happen in normal operation)
            this.renderGL.render(this.scene, cam);
            this.renderCSS3D.render(this.cssScene, cam);
        } else if (!cam && this.space?._cam && this.renderGL && this.renderCSS3D) {
            // Fallback for initial frames if camera plugin isn't ready
            if (this.composer) {
                this.composer.render(deltaTime);
            } else {
                this.renderGL.render(this.scene, this.space._cam);
            }
            this.renderCSS3D.render(this.cssScene, this.space._cam);
        }
    }

    _setupRenderers() {
        if (!this.space || !this.space.container) {
            console.error('RenderingPlugin: SpaceGraph container not available for renderer setup.');
            return;
        }

        const cameraPlugin = this.pluginManager?.getPlugin('CameraPlugin');
        const cam = cameraPlugin?.getCameraInstance() || this.space?._cam; // Ensure cam is available

        if (!cam) {
            console.error('RenderingPlugin: Camera instance not available for renderer setup.');
            // Defer setup or handle error appropriately
            // For now, we might rely on a later call or ensure camera is ready before this.
            // This might happen if plugins init order is not guaranteeing camera before rendering.
            // However, SpaceGraph.js initPlugins() calls plugins in order of addition.
            // And CameraPlugin is added before RenderingPlugin usually.
            // Let's assume cam will be available or use space._cam as a fallback.
            // If space._cam is also not ready, this will fail.
        }

        this.webglCanvas = $('#webgl-canvas'); // Assumes your HTML has <canvas id="webgl-canvas">
        if (!this.webglCanvas) {
            console.error(
                "RenderingPlugin: #webgl-canvas not found. Make sure it's in your HTML structure passed to SpaceGraph."
            );
            this.webglCanvas = document.createElement('canvas');
            this.webglCanvas.id = 'webgl-canvas';
            this.space.container.appendChild(this.webglCanvas);
        }

        this.renderGL = new THREE.WebGLRenderer({
            canvas: this.webglCanvas,
            powerPreference: 'high-performance',
            antialias: false, // Antialiasing is handled by post-processing if SMAAEffect is used, else set to true.
            stencil: false, // Stencil buffer might be needed for some effects
            depth: true, // Depth buffer is usually needed
            alpha: true,
        });
        this.renderGL.setSize(window.innerWidth, window.innerHeight);
        this.renderGL.setPixelRatio(window.devicePixelRatio);
        // this.renderGL.outputColorSpace = THREE.SRGBColorSpace; // Recommended for color accuracy with postprocessing

        // Enable shadow mapping
        this.renderGL.shadowMap.enabled = true;
        this.renderGL.shadowMap.type = THREE.PCFSoftShadowMap; // Optional: for softer shadows

        // Setup Composer
        this.composer = new EffectComposer(this.renderGL);
        if (cam) { // cam should be available here due to plugin init order or fallback
            this.composer.addPass(new RenderPass(this.scene, cam));
        } else {
            // This case should ideally not be reached if CameraPlugin initializes before RenderingPlugin
            // and sets up the camera on space._cam or through getCameraInstance().
            // If it is reached, post-processing won't initialize correctly.
            console.error("RenderingPlugin: Camera not available for EffectComposer. Post-processing may fail.");
            // As a last resort, if space._cam is set later, composer might need re-init or pass update.
            // For now, we assume `cam` will be valid from CameraPlugin.
        }


        // Add initial effects (e.g., Bloom)
        // Note: Some effects might need specific configurations or might impact performance.
        // It's good to make effects configurable if possible.
        const bloomEffect = new BloomEffect({
            intensity: 1.0, // Lower intensity for subtlety with outline
            kernelSize: KernelSize.MEDIUM,
            luminanceThreshold: 0.75, // Higher threshold to bloom less
            luminanceSmoothing: 0.3,
        });

        // Setup OutlineEffect
        // The camera passed to OutlineEffect should be the one used for rendering the main scene.
        this.selection = new Selection();
        this.outlineEffect = new OutlineEffect(this.scene, cam, { // Pass scene and camera
            blendFunction: 21, // BlendFunction.SCREEN
            edgeStrength: 2.0, // Slightly reduced edgeStrength
            pulseSpeed: 0.0,
            visibleEdgeColor: 0xffff00, // Changed to yellow for contrast
            hiddenEdgeColor: 0x22090a,
            kernelSize: KernelSize.SMALL, // Smaller kernel for finer outlines
            blur: false,
            xRay: true,
        });
        this.outlineEffect.selection = this.selection; // Assign the selection manager

        // Add passes to composer
        // Order matters: RenderPass -> OutlineEffectPass -> BloomEffectPass (or other effects)
        // Some effects might interact, so testing different orders can be useful.
        // For OutlineEffect, it often works best if it's one of the earlier effect passes
        // after the main RenderPass, especially if other effects might obscure outlines.
        const effectPassOutline = new EffectPass(cam, this.outlineEffect);
        const effectPassBloom = new EffectPass(cam, bloomEffect);

        // Setup SSAOEffect
        // SSAOEffect needs a NormalPass to get screen-space normals.
        const normalPass = new NormalPass(this.scene, cam);
        const ssaoEffect = new SSAOEffect(cam, normalPass.texture, { // Pass camera, normal texture
            blendFunction: 21, // BlendFunction.MULTIPLY / BlendFunction.SCREEN (check what looks best)
            samples: 11, // Number of samples
            rings: 4, // Number of rings
            distanceThreshold: 0.02, // Distance threshold for occlusion
            distanceFalloff: 0.0025, // Falloff for distance
            rangeThreshold: 0.001, // Range threshold
            rangeFalloff: 0.001, // Range falloff
            luminanceInfluence: 0.7,
            radius: 10, // Radius of samples
            scale: 0.5, // Scale of the effect
            bias: 0.05, // Bias
            intensity: 1.0,
            color: 0x000000, // Color of the AO, usually black
        });
        const effectPassSSAO = new EffectPass(cam, ssaoEffect);

        // Add passes to composer in order
        this.composer.addPass(normalPass); // NormalPass first (or RenderPass if it provides normals)
        this.composer.addPass(effectPassSSAO);
        this.composer.addPass(effectPassOutline);
        this.composer.addPass(effectPassBloom);


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

    // --- Light Management API ---
    addLight(id, type, options = {}) {
        if (this.managedLights.has(id)) {
            console.warn(`RenderingPlugin: Light with id '${id}' already exists.`);
            return this.managedLights.get(id);
        }

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
                if (options.target) { // THREE.Object3D to point at
                    light.target = options.target;
                    this.scene.add(light.target); // Target needs to be in scene
                }
                if (options.castShadow) {
                    light.castShadow = true;
                    // Configure shadow properties
                    light.shadow.mapSize.width = options.shadowMapSizeWidth ?? 1024;
                    light.shadow.mapSize.height = options.shadowMapSizeHeight ?? 1024;
                    light.shadow.camera.near = options.shadowCameraNear ?? 0.5;
                    light.shadow.camera.far = options.shadowCameraFar ?? 500;
                    // Directional light shadow camera bounds (example values)
                    light.shadow.camera.left = options.shadowCameraLeft ?? -100;
                    light.shadow.camera.right = options.shadowCameraRight ?? 100;
                    light.shadow.camera.top = options.shadowCameraTop ?? 100;
                    light.shadow.camera.bottom = options.shadowCameraBottom ?? -100;
                }
                break;
            case 'point':
                light = new THREE.PointLight(color, intensity, options.distance ?? 0, options.decay ?? 2);
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
            light.userData.lightId = id; // Store id for later retrieval/removal
            this.managedLights.set(id, light);
            this.scene.add(light);
            this.space.emit('light:added', { id, type, light });
        }
        return light;
    }

    removeLight(id) {
        const light = this.managedLights.get(id);
        if (light) {
            if (light.target && light.target !== this.scene) this.scene.remove(light.target); // Remove target if it was added
            this.scene.remove(light);
            light.dispose?.(); // Some lights might have dispose methods
            this.managedLights.delete(id);
            this.space.emit('light:removed', { id });
            return true;
        }
        console.warn(`RenderingPlugin: Light with id '${id}' not found for removal.`);
        return false;
    }

    getLight(id) {
        return this.managedLights.get(id);
    }

    configureLight(id, options) {
        const light = this.managedLights.get(id);
        if (!light) {
            console.warn(`RenderingPlugin: Light with id '${id}' not found for configuration.`);
            return false;
        }

        if (options.color !== undefined) light.color.set(options.color);
        if (options.intensity !== undefined) light.intensity = options.intensity;
        if (options.position && light.position) light.position.set(options.position.x, options.position.y, options.position.z);
        if (options.castShadow !== undefined && light.castShadow !== undefined) light.castShadow = options.castShadow;
        // Add more configurable properties as needed (e.g., shadow map size, camera frustum for shadows)
        // For instance, if changing shadow parameters:
        // if (light.shadow) {
        //    if (options.shadowMapSizeWidth) light.shadow.mapSize.width = options.shadowMapSizeWidth;
        //    ... etc.
        //    light.shadow.needsUpdate = true; // Important for some shadow changes
        // }
        this.space.emit('light:configured', { id, light, options });
        return true;
    }
    // --- End Light Management API ---

    _setupLighting() {
        // Add default lights using the new API
        this.addLight('defaultAmbient', 'ambient', { intensity: 0.9 });
        this.addLight('defaultDirectional', 'directional', {
            intensity: 0.6,
            position: { x: 100, y: 150, z: 100 }, // Adjusted position for better shadow angles
            castShadow: true,
            // Example shadow parameters for directional light
            shadowMapSizeWidth: 2048,
            shadowMapSizeHeight: 2048,
            shadowCameraNear: 50,
            shadowCameraFar: 500,
            shadowCameraLeft: -200,
            shadowCameraRight: 200,
            shadowCameraTop: 200,
            shadowCameraBottom: -200,
        });
    }

    setBackground(color = 0x000000, alpha = 0) {
        this.background = { color, alpha };
        if (this.renderGL) {
            this.renderGL.setClearColor(color, alpha);
        }
        if (this.webglCanvas) {
            this.webglCanvas.style.backgroundColor =
                alpha === 0 ? 'transparent' : `#${color.toString(16).padStart(6, '0')}`;
        }
    }

    _onWindowResize = () => {
        // Arrow function to keep 'this' context
        const cameraPlugin = this.pluginManager?.getPlugin('CameraPlugin');
        const cam = cameraPlugin?.getCameraInstance() || this.space?._cam; // Fallback to space._cam if plugin not ready

        if (cam && this.renderGL && this.renderCSS3D) {
            const iw = window.innerWidth;
            const ih = window.innerHeight;

            cam.aspect = iw / ih;
            cam.updateProjectionMatrix();

            this.renderGL.setSize(iw, ih);
            this.composer.setSize(iw, ih); // Update composer size
            this.renderCSS3D.setSize(iw, ih);

            // Emit a resize event that other plugins can listen to
            this.space.emit('renderer:resize', { width: iw, height: ih });
        }
    };

    // Public accessors for scenes if other plugins need them
    getWebGLScene() {
        return this.scene;
    }

    getCSS3DScene() {
        return this.cssScene;
    }

    dispose() {
        super.dispose();
        window.removeEventListener('resize', this._onWindowResize);

        this.composer?.dispose(); // Dispose composer
        this.renderGL?.dispose();
        this.renderCSS3D?.domElement?.remove();
        this.css3dContainer?.remove();

        // Scenes are cleared by SpaceGraph or their respective content plugins (Node/Edge)
        // For now, let's clear them here if they were plugin-owned.
        // It's generally better if the plugin owning the content (NodePlugin, EdgePlugin)
        // is responsible for removing its objects from the scene upon their own disposal.
        // However, a final clear here can be a safeguard.
        this.scene?.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        this.scene?.clear();
        this.cssScene?.clear(); // CSS Scene objects are DOM elements, usually removed by their owners.

        this.composer = null;
        this.renderGL = null;
        this.renderCSS3D = null;
        this.css3dContainer = null;
        this.webglCanvas = null;
        this.scene = null;
        this.cssScene = null;
        this.clock = null;
        // console.log('RenderingPlugin disposed.');
    }
}
