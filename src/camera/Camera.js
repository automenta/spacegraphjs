import * as THREE from 'three';
import { gsap } from 'gsap';
import { Utils } from '../utils.js';

export class Camera {
    space = null;
    _cam = null;
    domElement = null;
    isPanning = false;
    panStart = new THREE.Vector2(); // Screen coords where pan started
    targetPosition = new THREE.Vector3();
    targetLookAt = new THREE.Vector3();
    currentLookAt = new THREE.Vector3();
    _prevPosition = new THREE.Vector3(); // For movement detection
    _prevLookAt = new THREE.Vector3(); // For movement detection
    viewHistory = [];
    currentTargetNodeId = null;
    initialState = null;
    zoomSpeed = 1.0;
    panSpeed = 0.8;
    minZoomDistance = 20;
    maxZoomDistance = 15000;
    dampingFactor = 0.12;
    maxHistory = 20;
    animationFrameId = null;

    constructor(space) {
        if (!space?._cam || !space.container) throw new Error("Camera requires SpaceGraph instance with camera and container.");
        this.space = space; // Store SpaceGraph instance
        this._cam = space._cam;
        this.domElement = space.container;
        this.targetPosition.copy(this._cam.position);
        // Initial lookAt is projected onto Z=0 plane from initial camera position
        this.targetLookAt.set(this._cam.position.x, this._cam.position.y, 0);
        this.currentLookAt.copy(this.targetLookAt);
        this._prevPosition.copy(this._cam.position);
        this._prevLookAt.copy(this.targetLookAt);
        this._startUpdateLoop();
    }

    setInitialState() {
        if (!this.initialState) {
            // Capture the state *after* the first centerView/focus
            this.initialState = {position: this.targetPosition.clone(), lookAt: this.targetLookAt.clone()};
        }
    }

    startPan(startX, startY) {
        if (this.isPanning) return;
        this.isPanning = true;
        this.panStart.set(startX, startY);
        this.domElement.classList.add('panning');
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        this.currentTargetNodeId = null; // User interaction overrides autozoom target
    }

    pan(deltaX, deltaY) {
        if (!this.isPanning) return;
        // Calculate pan distance based on camera distance to lookAt point
        const cameraDist = this._cam.position.distanceTo(this.currentLookAt);
        const vFOV = this._cam.fov * Utils.DEG2RAD;
        const viewHeight = this.domElement.clientHeight || window.innerHeight;
        // Calculate world units per pixel at the lookAt distance
        const visibleHeight = 2 * Math.tan(vFOV / 2) * Math.max(1, cameraDist); // Avoid dist=0
        const worldUnitsPerPixel = visibleHeight / viewHeight;

        const panX = -deltaX * worldUnitsPerPixel * this.panSpeed;
        const panY = deltaY * worldUnitsPerPixel * this.panSpeed;

        // Get camera's local right and up vectors
        const right = new THREE.Vector3().setFromMatrixColumn(this._cam.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(this._cam.matrixWorld, 1);

        // Calculate pan offset in world space
        const panOffset = right.multiplyScalar(panX).add(up.multiplyScalar(panY));

        // Apply offset to both target position and lookAt point
        this.targetPosition.add(panOffset);
        this.targetLookAt.add(panOffset);

        // Update panStart for next delta calculation (handled in _onPointerMove)
    }

    endPan = () => {
        if (this.isPanning) {
            this.isPanning = false;
            this.domElement.classList.remove('panning');
        }
    }

    zoom(deltaY) {
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        this.currentTargetNodeId = null;
        const zoomFactor = Math.pow(0.95, deltaY * 0.05 * this.zoomSpeed);
        const lookAtToCam = new THREE.Vector3().subVectors(this.targetPosition, this.targetLookAt);
        let newDist = Utils.clamp(lookAtToCam.length() * zoomFactor, this.minZoomDistance, this.maxZoomDistance);
        this.targetPosition.copy(this.targetLookAt).addScaledVector(lookAtToCam.normalize(), newDist);
    }

    moveTo(x, y, z, duration = 0.7, lookAtTarget = null) {
        this.setInitialState(); // Ensure initial state exists
        const targetPos = new THREE.Vector3(x, y, z);
        // Default lookAt is XY of target, Z of current lookAt (avoids sudden Z jumps)
        const targetLook = lookAtTarget instanceof THREE.Vector3 ? lookAtTarget.clone() : new THREE.Vector3(x, y, this.targetLookAt.z);
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        const ease = "power3.out";
        gsap.to(this.targetPosition, {x: targetPos.x, y: targetPos.y, z: targetPos.z, duration, ease, overwrite: true});
        gsap.to(this.targetLookAt, {
            x: targetLook.x,
            y: targetLook.y,
            z: targetLook.z,
            duration,
            ease,
            overwrite: true
        });
    }

    resetView(duration = 0.7) {
        if (this.initialState) this.moveTo(this.initialState.position.x, this.initialState.position.y, this.initialState.position.z, duration, this.initialState.lookAt);
        else this.moveTo(0, 0, 700, duration, new THREE.Vector3(0, 0, 0)); // Fallback default
        this.viewHistory = [];
        this.currentTargetNodeId = null;
    }

    pushState() {
        if (this.viewHistory.length >= this.maxHistory) this.viewHistory.shift();
        // Store the *target* state, not the potentially lagging current state
        this.viewHistory.push({
            position: this.targetPosition.clone(),
            lookAt: this.targetLookAt.clone(),
            targetNodeId: this.currentTargetNodeId
        });
    }

    popState(duration = 0.6) {
        const prevState = this.viewHistory.pop();
        if (prevState) {
            this.moveTo(prevState.position.x, prevState.position.y, prevState.position.z, duration, prevState.lookAt);
            this.currentTargetNodeId = prevState.targetNodeId;
        } else {
            this.resetView(duration); // Go to initial state if history empty
        }
    }

    getCurrentTargetNodeId = () => this.currentTargetNodeId;
    setCurrentTargetNodeId = (nodeId) => {
        this.currentTargetNodeId = nodeId;
    };

    _startUpdateLoop = () => {
        const deltaPos = this.targetPosition.distanceTo(this._cam.position);
        const deltaLookAt = this.targetLookAt.distanceTo(this.currentLookAt);
        const epsilon = 0.01; // Threshold to stop lerping

        // Only update if moving, panning, or animating significantly
        const needsUpdate = deltaPos > epsilon || deltaLookAt > epsilon || this.isPanning || gsap.isTweening(this.targetPosition) || gsap.isTweening(this.targetLookAt);

        if (needsUpdate) {
            this._cam.position.lerp(this.targetPosition, this.dampingFactor);
            this.currentLookAt.lerp(this.targetLookAt, this.dampingFactor);
            this._cam.lookAt(this.currentLookAt);
            // No need for updateProjectionMatrix unless FOV/aspect changes

            // Emit camera:moved event if position or lookAt has changed significantly
            const movementThreshold = 0.1; // World units
            if (this._cam.position.distanceTo(this._prevPosition) > movementThreshold ||
                this.currentLookAt.distanceTo(this._prevLookAt) > movementThreshold) {
                this.space.emit('camera:moved', this._cam.position.clone(), this.currentLookAt.clone());
                this._prevPosition.copy(this._cam.position);
                this._prevLookAt.copy(this.currentLookAt);
            }
        } else if (deltaPos > 0 || deltaLookAt > 0) { // Snap to final position if close enough
            this._cam.position.copy(this.targetPosition);
            this.currentLookAt.copy(this.targetLookAt);
            this._cam.lookAt(this.currentLookAt);
            // Ensure one final emit after snapping
            this.space.emit('camera:moved', this._cam.position.clone(), this.currentLookAt.clone());
            this._prevPosition.copy(this._cam.position);
            this._prevLookAt.copy(this.currentLookAt);
        }
        this.animationFrameId = requestAnimationFrame(this._startUpdateLoop);
    }

    dispose() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        this.space = null;
        this._cam = null;
        this.domElement = null;
        this.viewHistory = [];
        console.log("Camera disposed.");
    }
}
