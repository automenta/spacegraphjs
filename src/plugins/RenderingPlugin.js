/**
 * @file RenderingPlugin.js - Manages all rendering aspects for SpaceGraph.
 * @licence MIT
 */

import *TTHREE from 'three';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { Plugin } from '../core/Plugin.js';
import { $ } from '../utils.js'; // Assuming $ is a utility like querySelector

export class RenderingPlugin extends Plugin {
    scene = null;
    cssScene = null;
    renderGL = null;
    renderCSS3D = null;
    css3dContainer = null;
    webglCanvas = null;
    background = { color: 0x1a1a1d, alpha: 1.0 }; // Default background

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
        this.scene = new THREE.Scene();
        this.cssScene = new THREE.Scene();
    }

    getName() {
        return 'RenderingPlugin';
    }

    init() {
        super.init();
        this._setupRenderers();
        this._setupLighting();
        this.setBackground(this.background.color, this.background.alpha);

        // The actual camera object is managed by SpaceGraph (or a CameraPlugin later)
        // but resize needs access to it.
        window.addEventListener('resize', this._onWindowResize, false);
    }

    // Method to be called by SpaceGraph's animation loop via pluginManager.updatePlugins()
    update() {
        const cameraPlugin = this.pluginManager?.getPlugin('CameraPlugin');
        const cam = cameraPlugin?.getCameraInstance();

        if (cam && this.renderGL && this.renderCSS3D) {
            this.renderGL.render(this.scene, cam);
            this.renderCSS3D.render(this.cssScene, cam);
        } else if (!cam && this.space) { // Fallback for initial frames if camera plugin isn't ready
            // This fallback should ideally not be needed if init order is correct.
            if (this.space._cam) {
                 this.renderGL.render(this.scene, this.space._cam);
                 this.renderCSS3D.render(this.cssScene, this.space._cam);
            }
        }
    }

    _setupRenderers() {
        if (!this.space || !this.space.container) {
            console.error("RenderingPlugin: SpaceGraph container not available for renderer setup.");
            return;
        }

        this.webglCanvas = $('#webgl-canvas'); // Assumes your HTML has <canvas id="webgl-canvas">
        if (!this.webglCanvas) {
            console.error("RenderingPlugin: #webgl-canvas not found. Make sure it's in your HTML structure passed to SpaceGraph.");
            // Optionally, create and append canvas if not found
            this.webglCanvas = document.createElement('canvas');
            this.webglCanvas.id = 'webgl-canvas';
            this.space.container.appendChild(this.webglCanvas);
        }

        this.renderGL = new THREE.WebGLRenderer({ canvas: this.webglCanvas, antialias: true, alpha: true });
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
        this.space.container.appendChild(this.css3dContainer);
    }

    _setupLighting() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(0.5, 1, 0.75);
        this.scene.add(dirLight);
    }

    setBackground(color = 0x000000, alpha = 0) {
        this.background = { color, alpha };
        if (this.renderGL) {
            this.renderGL.setClearColor(color, alpha);
        }
        if (this.webglCanvas) {
            this.webglCanvas.style.backgroundColor = alpha === 0 ? 'transparent' : `#${color.toString(16).padStart(6, '0')}`;
        }
    }

    _onWindowResize = () => { // Arrow function to keep 'this' context
        const cameraPlugin = this.pluginManager?.getPlugin('CameraPlugin');
        const cam = cameraPlugin?.getCameraInstance() || this.space?._cam; // Fallback to space._cam if plugin not ready

        if (cam && this.renderGL && this.renderCSS3D) {
            const iw = window.innerWidth;
            const ih = window.innerHeight;

            cam.aspect = iw / ih;
            cam.updateProjectionMatrix();

            this.renderGL.setSize(iw, ih);
            this.renderCSS3D.setSize(iw, ih);
        }
    }

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

        this.renderGL?.dispose();
        this.renderCSS3D?.domElement?.remove();
        this.css3dContainer?.remove();
        // Scenes are cleared by SpaceGraph or their respective content plugins (Node/Edge)
        // For now, let's clear them here if they were plugin-owned.
        this.scene?.clear();
        this.cssScene?.clear();

        this.renderGL = null;
        this.renderCSS3D = null;
        this.css3dContainer = null;
        this.webglCanvas = null;
        this.scene = null;
        this.cssScene = null;
        // console.log('RenderingPlugin disposed.');
    }
}
