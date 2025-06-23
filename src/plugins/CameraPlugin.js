/**
 * @file CameraPlugin.js - Manages camera setup and controls for SpaceGraph.
 * @licence MIT
 */

import * as THREE from 'three';
import { Plugin } from '../core/Plugin.js';
import { Camera as CameraControls } from '../camera/Camera.js'; // Renaming to avoid class name collision
import { Utils } from '../utils.js'; // For DEG2RAD

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
        this.perspectiveCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 20000);
        this.perspectiveCamera.position.z = 700;

        if (this.space) {
            this.space._cam = this.perspectiveCamera; // TODO: Phase out direct _cam access
        }

        this.cameraControls = new CameraControls(this.space);

        // Initial camera centering is now done more explicitly.
        // Call this.centerView() after all plugins are initialized if needed,
        // or let the application decide the initial view.
        // For now, we'll make it available for SpaceGraph to call post-init.
        // However, the original SpaceGraph called these *after* all plugins were inited.
        // To replicate, we can defer or SpaceGraph calls them explicitly post-init.
        // For now, let's assume SpaceGraph will call them.
        // If this plugin should do it itself, it needs to be after NodePlugin might have nodes.
        // A simple way is to do it at the end of this init, assuming NodePlugin runs before CameraPlugin,
        // or use a 'ready' event system.
        // For now, let SpaceGraph call these on the plugin instance after all plugins are ready.
        // this.centerView(null, 0);
        // this.setInitialState();
    }

    /** @returns {THREE.PerspectiveCamera | null} */
    getCameraInstance() {
        return this.perspectiveCamera;
    }

    /** @returns {CameraControls | null} */
    getControls() {
        return this.cameraControls;
    }

    // --- Core Camera Movement ---
    moveTo(x, y, z, duration = 0.7, lookAtTarget = null) {
        this.cameraControls?.moveTo(x, y, z, duration, lookAtTarget);
    }

    // --- Higher-Level Camera Actions ---
    _determineCenterViewTarget(targetPosition = null) {
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const currentNodes = nodePlugin?.getNodes();
        let finalTargetPos = new THREE.Vector3();

        if (targetPosition instanceof THREE.Vector3) {
            finalTargetPos = targetPosition.clone();
        } else if (targetPosition && typeof targetPosition.x === 'number') {
            finalTargetPos.set(targetPosition.x, targetPosition.y, targetPosition.z);
        } else if (currentNodes && currentNodes.size > 0) {
            currentNodes.forEach((node) => finalTargetPos.add(node.position));
            finalTargetPos.divideScalar(currentNodes.size);
        }
        return finalTargetPos;
    }

    _determineOptimalDistance(baseDistance = 400, farDistance = 700, nodeCount = 0) {
        return nodeCount > 1 ? farDistance : baseDistance;
    }

    centerView(targetPosition = null, duration = 0.7) {
        if (!this.perspectiveCamera || !this.cameraControls) return;

        const lookAtTarget = this._determineCenterViewTarget(targetPosition);
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const nodeCount = nodePlugin?.getNodes()?.size || 0;
        const distance = this._determineOptimalDistance(400, 700, nodeCount);

        this.moveTo(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z + distance, duration, lookAtTarget);
    }

    _determineFocusNodeDistance(node) {
        if (!node || !this.perspectiveCamera) return 50; // Default small distance

        const fov = this.perspectiveCamera.fov * Utils.DEG2RAD;
        const aspect = this.perspectiveCamera.aspect;
        // Ensure getBoundingSphereRadius is a method on the node object
        const nodeSize = typeof node.getBoundingSphereRadius === 'function' ? node.getBoundingSphereRadius() * 2 : 100;
        const projectedSize = Math.max(nodeSize, nodeSize / aspect); // Consider aspect ratio for flatness
        const paddingFactor = 1.5; // How much padding around the node
        const minDistance = 50; // Minimum distance to prevent camera clipping or being too close

        return Math.max(minDistance, (projectedSize * paddingFactor) / (2 * Math.tan(fov / 2)));
    }

    focusOnNode(node, duration = 0.6, pushHistory = false) {
        if (!node || !this.perspectiveCamera || !this.cameraControls) return;

        const targetPos = node.position.clone();
        const distance = this._determineFocusNodeDistance(node);

        if (pushHistory) this.pushState();
        this.moveTo(targetPos.x, targetPos.y, targetPos.z + distance, duration, targetPos);
    }

    // --- Delegated Camera Control Methods from CameraControls ---
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
    setInitialState() {
        this.cameraControls?.setInitialState();
    }

    dispose() {
        super.dispose();
        this.cameraControls?.dispose();
        if (this.space && this.space._cam === this.perspectiveCamera) {
            this.space._cam = null;
        }
        this.perspectiveCamera = null;
        this.cameraControls = null;
    }
}
