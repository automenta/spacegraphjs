import * as THREE from 'three';
import {Plugin} from '../core/Plugin.js';
import {Camera as CameraControls, CAMERA_MODES} from '../camera/Camera.js'; // Import CAMERA_MODES
import {AdvancedCameraControls} from '../camera/AdvancedCameraControls.js';
import {Utils} from '../utils.js';

export class CameraPlugin extends Plugin {
    perspectiveCamera = null;
    cameraControls = null;
    advancedControls = null;

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
            this.space._cam = this.perspectiveCamera;
        }

        // The CameraControls class (imported as Camera) handles different camera modes (orbit, free, top_down, etc.)
        // and their specific interaction logic. This plugin primarily acts as a wrapper and interface.
        this.cameraControls = new CameraControls(this.space);
        this.advancedControls = new AdvancedCameraControls(this.space, this.cameraControls);
        this._subscribeToEvents();
    }

    _subscribeToEvents() {
        this.space.on('ui:request:setCameraMode', (mode) => {
            this.setCameraMode(mode);
        });
        this.space.on('ui:request:toggleAutoZoom', () => {
            this.toggleAutoZoom();
        });
        this.space.on('ui:request:toggleAutoRotation', () => {
            this.toggleAutoRotation();
        });
        this.space.on('ui:request:togglePeekMode', () => {
            this.togglePeekMode();
        });
        this.space.on('ui:request:toggleCinematicMode', () => {
            this.toggleCinematicMode();
        });
        this.space.on('ui:request:smartFocus', (node, options) => {
            this.smartFocusOnNode(node, options);
        });
    }

    getCameraInstance() {
        return this.perspectiveCamera;
    }

    getControls() {
        return this.cameraControls;
    }

    moveTo(x, y, z, duration = 0.7, lookAtTarget = null) {
        this.cameraControls?.moveTo(x, y, z, duration, lookAtTarget);
    }

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
        if (!node || !this.perspectiveCamera) return 50;

        const fov = this.perspectiveCamera.fov * Utils.DEG2RAD;
        const aspect = this.perspectiveCamera.aspect;
        const nodeSize = typeof node.getBoundingSphereRadius === 'function' ? node.getBoundingSphereRadius() * 2 : 100;
        const projectedSize = Math.max(nodeSize, nodeSize / aspect);
        const paddingFactor = 1.5;
        const minDistance = 50;

        return Math.max(minDistance, (projectedSize * paddingFactor) / (2 * Math.tan(fov / 2)));
    }

    focusOnNode(node, duration = 0.6, pushHistory = false) {
        if (!node || !this.perspectiveCamera || !this.cameraControls) return;

        const targetPos = node.position.clone();
        const distance = this._determineFocusNodeDistance(node);

        if (pushHistory) this.pushState();
        this.moveTo(targetPos.x, targetPos.y, targetPos.z + distance, duration, targetPos);
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
    setInitialState() {
        this.cameraControls?.setInitialState();
    }

    saveNamedView(name) {
        return this.cameraControls?.saveNamedView(name);
    }

    restoreNamedView(name, duration = 0.7) {
        return this.cameraControls?.restoreNamedView(name, duration);
    }

    deleteNamedView(name) {
        return this.cameraControls?.deleteNamedView(name);
    }

    getNamedViews() {
        return this.cameraControls?.getNamedViews() || [];
    }

    hasNamedView(name) {
        return this.cameraControls?.hasNamedView(name) || false;
    }

    setCameraMode(mode) {
        this.cameraControls?.setCameraMode(mode);
    }

    getCameraMode() {
        return this.cameraControls?.cameraMode; // Corrected: Access property directly
    }

    getAvailableCameraModes() {
        return {
            [CAMERA_MODES.ORBIT]: 'Orbit Control',
            [CAMERA_MODES.DRAG_ORBIT]: 'Drag Orbit',
            [CAMERA_MODES.FREE]: 'Free Look',
            [CAMERA_MODES.TOP_DOWN]: 'Top Down',
            [CAMERA_MODES.FIRST_PERSON]: 'First Person'
        };
    }

    startFollowing(target, options = {}) {
        this.cameraControls?.startFollowing(target, options);
    }

    stopFollowing() {
        this.cameraControls?.stopFollowing();
    }

    isFollowing() {
        return this.cameraControls?.isFollowing || false;
    }

    requestPointerLock() {
        this.cameraControls?.pointerLockControls?.lock();
    }

    exitPointerLock() {
        this.cameraControls?.pointerLockControls?.unlock();
    }

    // Advanced camera control methods
    toggleAutoZoom(enabled = null) {
        return this.advancedControls?.toggleAutoZoom(enabled);
    }

    toggleAutoRotation(enabled = null) {
        return this.advancedControls?.toggleAutoRotation(enabled);
    }

    setRotationSpeed(speed) {
        this.advancedControls?.setRotationSpeed(speed);
    }

    togglePeekMode(enabled = null) {
        return this.advancedControls?.togglePeekMode(enabled);
    }

    toggleCinematicMode(enabled = null) {
        return this.advancedControls?.toggleCinematicMode(enabled);
    }

    smartFocusOnNode(node, options = {}) {
        this.advancedControls?.smartFocusOnNode(node, options);
    }

    createViewSequence(nodes, options = {}) {
        return this.advancedControls?.createViewSequence(nodes, options);
    }

    updateAdvancedSettings(settings) {
        this.advancedControls?.updateSettings(settings);
    }

    getAdvancedSettings() {
        return this.advancedControls?.getSettings();
    }

    getAdvancedControlsStatus() {
        return {
            autoZoom: this.advancedControls?.isAutoZoomEnabled() || false,
            autoRotation: this.advancedControls?.isAutoRotating() || false,
            peekMode: this.advancedControls?.isPeekModeEnabled() || false,
            cinematicMode: this.advancedControls?.isCinematicModeActive() || false
        };
    }

    dispose() {
        super.dispose();
        this.advancedControls?.dispose();
        this.cameraControls?.dispose();
        if (this.space && this.space._cam === this.perspectiveCamera) {
            this.space._cam = null;
        }
        this.perspectiveCamera = null;
        this.advancedControls = null;
        this.cameraControls = null;
    }
}
