/**
 * @file CameraPlugin.js - Manages camera setup and controls for SpaceGraph.
 * @licence MIT
 */

import * as THREE from 'three';
import { Plugin } from '../core/Plugin.js';
import { Camera as CameraControls } from '../camera/Camera.js'; // Renaming to avoid class name collision

export class CameraPlugin extends Plugin {
    /** @type {THREE.PerspectiveCamera | null} */
    perspectiveCamera = null;
    /** @type {CameraControls | null} */
    cameraControls = null;

    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);
    }

    getName() {
        return 'CameraPlugin';
    }

    init() {
        super.init();
        // Create the main perspective camera
        this.perspectiveCamera = new THREE.PerspectiveCamera(
            70, // fov
            window.innerWidth / window.innerHeight, // aspect
            0.1, // near
            20000 // far
        );
        this.perspectiveCamera.position.z = 700; // Default position, matches old SpaceGraph

        // A bit of a hack: assign to space._cam for now if other parts expect it directly.
        // This should be phased out by getting camera via plugin.
        if (this.space) {
            this.space._cam = this.perspectiveCamera;
        }

        // Initialize camera controls (from src/camera/Camera.js)
        // The CameraControls class needs the space instance, which has _cam set by now.
        this.cameraControls = new CameraControls(this.space);

        // Initial camera setup that was in SpaceGraph constructor after plugin init
        // This needs to happen after cameraControls is initialized.
        if (this.space && typeof this.space.centerView === 'function') { // centerView is still on SpaceGraph
             // Defer this call slightly to ensure rendering plugin might have set up initial scene dimensions
             // or if centerView relies on nodes which are added later.
             // For now, direct call. This might need adjustment if there are ordering issues.
            this.space.centerView(null, 0); // Calls this.camera.moveTo -> this.cameraControls.moveTo
            this.cameraControls.setInitialState();
        }
    }

    /**
     * Provides the main THREE.PerspectiveCamera instance.
     * @returns {THREE.PerspectiveCamera | null}
     */
    getCameraInstance() {
        return this.perspectiveCamera;
    }

    /**
     * Provides the camera controls instance.
     * @returns {CameraControls | null}
     */
    getControls() {
        return this.cameraControls;
    }

    // --- Delegated Camera Control Methods ---
    // These methods will be called by SpaceGraph or other plugins
    moveTo(x, y, z, duration = 0.7, lookAtTarget = null) {
        this.cameraControls?.moveTo(x, y, z, duration, lookAtTarget);
    }

    pan(deltaX, deltaY) {
        this.cameraControls?.pan(deltaX, deltaY);
    }

    startPan(startX, startY) {
        this.cameraControls?.startPan(startX, startY);
    }

    endPan() {
        this.cameraControls?.endPan();
    }

    zoom(deltaY) {
        this.cameraControls?.zoom(deltaY);
    }

    resetView(duration = 0.7) {
        this.cameraControls?.resetView(duration);
    }

    pushState() {
        this.cameraControls?.pushState();
    }

    popState(duration = 0.6) {
        this.cameraControls?.popState(duration);
    }

    getCurrentTargetNodeId() {
        return this.cameraControls?.getCurrentTargetNodeId();
    }

    setCurrentTargetNodeId(nodeId) {
        this.cameraControls?.setCurrentTargetNodeId(nodeId);
    }

    setInitialState(){
        this.cameraControls?.setInitialState();
    }

    // The update loop for camera (e.g., smooth damping) is handled within CameraControls.js
    // So, this plugin's update() method might not be strictly needed unless it has other tasks.

    dispose() {
        super.dispose();
        this.cameraControls?.dispose();
        if (this.space && this.space._cam === this.perspectiveCamera) {
            this.space._cam = null; // Clear the reference on space
        }
        this.perspectiveCamera = null;
        this.cameraControls = null;
        // console.log('CameraPlugin disposed.');
    }
}
