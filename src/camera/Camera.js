import * as THREE from 'three';
import {gsap} from 'gsap';
import {Utils} from '../utils.js';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';

export const CAMERA_MODES = { // Added export here
    ORBIT: 'orbit',
    FREE: 'free',
    TOP_DOWN: 'top_down',
    FIRST_PERSON: 'first_person',
    DRAG_ORBIT: 'drag_orbit',
};

export class Camera {
    space = null;
    _cam = null;
    domElement = null;

    targetPosition = new THREE.Vector3();
    targetLookAt = new THREE.Vector3();

    currentPosition = new THREE.Vector3();
    currentLookAt = new THREE.Vector3();

    isPanning = false;
    panStart = new THREE.Vector2();
    isOrbitDragging = false;
    orbitDragStart = new THREE.Vector2();
    prevPointerLockControlsEnabled = false; // Used to restore state after orbit drag

    viewHistory = [];
    maxHistory = 20;
    currentTargetNodeId = null;

    initialState = null;

    zoomSpeed = 1.0;
    panSpeed = 0.8;
    minZoomDistance = 10;
    maxZoomDistance = 15000;
    dampingFactor = 0.12;

    animationFrameId = null;

    namedViews = new Map();

    cameraMode = CAMERA_MODES.ORBIT;
    freeCameraSpeed = 250.0;
    freeCameraVerticalSpeed = 180.0;
    pointerLockControls = null;
    isPointerLocked = false;
    moveState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
    };
    prevTime = performance.now();

    followTargetObject = null;
    followOptions = {
        distance: 300,
        damping: 0.05,
        offset: new THREE.Vector3(0, 50, 0),
        autoEndOnManualControl: true,
    };
    isFollowing = false;
    _isManuallyControlled = false;

    constructor(space) {
        if (!space?._cam || !space.container) throw new Error('Camera requires SpaceGraph instance.');
        this.space = space;
        this._cam = space._cam;
        this.domElement = space.container;

        this.currentPosition.copy(this._cam.position);
        this.targetPosition.copy(this._cam.position);
        this.currentLookAt.set(this._cam.position.x, this._cam.position.y, 0);
        this.targetLookAt.copy(this.currentLookAt);

        this._initializePointerLockControls();
        this._loadNamedViewsFromStorage();
        this._startUpdateLoop();
    }

    _initializePointerLockControls() {
        this.pointerLockControls = new PointerLockControls(this._cam, this.domElement);
        this.pointerLockControls.minPolarAngle = 0;
        this.pointerLockControls.maxPolarAngle = Math.PI;

        this.pointerLockControls.addEventListener('lock', () => {
            this.isPointerLocked = true;
            Object.keys(this.moveState).forEach(key => this.moveState[key] = false);
            this.domElement.style.cursor = 'none';
            this.space.emit('camera:pointerLockChanged', { locked: true });
        });

        this.pointerLockControls.addEventListener('unlock', () => {
            this.isPointerLocked = false;
            this.domElement.style.cursor = this.cameraMode === CAMERA_MODES.FREE ? 'crosshair' : 'grab';
            this.space.emit('camera:pointerLockChanged', { locked: false });
        });
    }

    setFreeCameraMovement(direction, isActive) {
        if (this.cameraMode === CAMERA_MODES.FREE && direction in this.moveState) {
            this.moveState[direction] = isActive;
        }
    }

    setInitialState() {
        this.initialState ??= {
            position: this.targetPosition.clone(),
            lookAt: this.targetLookAt.clone(),
            mode: this.cameraMode
        };
    }

    startPan(startX, startY) {
        if (
            (this.cameraMode !== CAMERA_MODES.ORBIT && this.cameraMode !== CAMERA_MODES.TOP_DOWN && this.cameraMode !== CAMERA_MODES.DRAG_ORBIT) ||
            this.isPanning || this.isOrbitDragging
        ) return;
        this._isManuallyControlled = true;
        this.isPanning = true;
        this.panStart.set(startX, startY);
        this.domElement.classList.add('panning');
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        if (this.isFollowing && this.followOptions.autoEndOnManualControl) this.stopFollowing();
        this.currentTargetNodeId = null;
    }

    pan(deltaX, deltaY) {
        if (
            (this.cameraMode !== CAMERA_MODES.ORBIT && this.cameraMode !== CAMERA_MODES.TOP_DOWN && this.cameraMode !== CAMERA_MODES.DRAG_ORBIT) ||
            !this.isPanning
        ) return;

        const cameraDist = this.currentPosition.distanceTo(this.currentLookAt);
        const vFOV = this._cam.fov * Utils.DEG2RAD;
        const viewHeight = this.domElement.clientHeight || window.innerHeight;
        const visibleHeight = 2 * Math.tan(vFOV / 2) * Math.max(1, cameraDist);
        const worldUnitsPerPixel = visibleHeight / viewHeight;

        let panOffset;
        if (this.cameraMode === CAMERA_MODES.TOP_DOWN) {
            panOffset = new THREE.Vector3(-deltaX * worldUnitsPerPixel * this.panSpeed, 0, deltaY * worldUnitsPerPixel * this.panSpeed);
        } else {
            panOffset = new THREE.Vector3()
                .setFromMatrixColumn(this._cam.matrixWorld, 0)
                .multiplyScalar(-deltaX * worldUnitsPerPixel * this.panSpeed)
                .add(
                    new THREE.Vector3()
                        .setFromMatrixColumn(this._cam.matrixWorld, 1)
                        .multiplyScalar(deltaY * worldUnitsPerPixel * this.panSpeed)
                );
        }
        this.targetPosition.add(panOffset);
        this.targetLookAt.add(panOffset);
    }

    endPan = () => {
        if (this.isPanning) {
            this.isPanning = false;
            this.domElement.classList.remove('panning');
            this._isManuallyControlled = false;
        }
    };

    zoom(deltaY) {
        this._isManuallyControlled = true;
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        if (this.isFollowing && this.followOptions.autoEndOnManualControl) this.stopFollowing();
        this.currentTargetNodeId = null;

        const zoomFactor = Math.pow(0.95, deltaY * 0.025 * this.zoomSpeed);
        
        if (this.cameraMode === CAMERA_MODES.TOP_DOWN) {
            const currentY = this.targetPosition.y;
            let newY = currentY * zoomFactor;
            newY = Utils.clamp(newY, this.minZoomDistance, this.maxZoomDistance);
            this.targetPosition.y = newY;
            this.targetLookAt.x = this.targetPosition.x;
            this.targetLookAt.z = this.targetPosition.z;
            this.targetLookAt.y = 0;
        } else {
            const lookAtToCam = new THREE.Vector3().subVectors(this.targetPosition, this.targetLookAt);
            const currentDist = lookAtToCam.length();
            const newDist = Utils.clamp(currentDist * zoomFactor, this.minZoomDistance, this.maxZoomDistance);
            this.targetPosition.copy(this.targetLookAt).addScaledVector(lookAtToCam.normalize(), newDist);
        }
    }

    moveTo(x, y, z, duration = 0.7, lookAtTarget = null, newCameraMode = null) {
        this._isManuallyControlled = true;
        if (this.isFollowing && this.followOptions.autoEndOnManualControl) this.stopFollowing();
        this.setInitialState();

        const targetPos = new THREE.Vector3(x, y, z);
        const targetLook = lookAtTarget instanceof THREE.Vector3 ? lookAtTarget.clone() : new THREE.Vector3(x, y, 0);

        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);

        const onComplete = () => { this._isManuallyControlled = false; };

        gsap.to(this.targetPosition, { x: targetPos.x, y: targetPos.y, z: targetPos.z, duration, ease: 'power3.out', overwrite: true });
        gsap.to(this.targetLookAt, { x: targetLook.x, y: targetLook.y, z: targetLook.z, duration, ease: 'power3.out', overwrite: true, onComplete });

        if (newCameraMode && newCameraMode !== this.cameraMode) this.setCameraMode(newCameraMode, true);
    }

    resetView(duration = 0.7) {
        this.initialState
            ? this.moveTo(this.initialState.position.x, this.initialState.position.y, this.initialState.position.z, duration, this.initialState.lookAt, this.initialState.mode || CAMERA_MODES.ORBIT)
            : this.moveTo(0, 0, 700, duration, new THREE.Vector3(0, 0, 0), CAMERA_MODES.ORBIT);
        this.viewHistory = [];
        this.currentTargetNodeId = null;
    }

    pushState() {
        if (this.viewHistory.length >= this.maxHistory) this.viewHistory.shift();
        this.viewHistory.push({
            position: this.targetPosition.clone(),
            lookAt: this.targetLookAt.clone(),
            mode: this.cameraMode,
            targetNodeId: this.currentTargetNodeId,
        });
    }

    popState(duration = 0.6) {
        const prevState = this.viewHistory.pop();
        prevState
            ? this.moveTo(prevState.position.x, prevState.position.y, prevState.position.z, duration, prevState.lookAt, prevState.mode)
            : this.resetView(duration);
        this.currentTargetNodeId = prevState?.targetNodeId || null;
    }

    getCurrentTargetNodeId = () => this.currentTargetNodeId;
    setCurrentTargetNodeId = (nodeId) => { this.currentTargetNodeId = nodeId; };

    _startUpdateLoop = () => {
        this.animationFrameId = requestAnimationFrame(this._updateCameraLogic);
    };

    _updateCameraLogic = () => {
        const time = performance.now();
        const delta = (time - this.prevTime) / 1000;
        this.prevTime = time;

        let needsLerp = true;

        if ((this.cameraMode === CAMERA_MODES.FREE || this.cameraMode === CAMERA_MODES.FIRST_PERSON) && this.isPointerLocked) {
            const moveSpeed = this.freeCameraSpeed * delta;
            const verticalMoveSpeed = this.freeCameraVerticalSpeed * delta;
            let moved = false;

            if (this.moveState.forward) { this.pointerLockControls.moveForward(moveSpeed); moved = true; }
            if (this.moveState.backward) { this.pointerLockControls.moveForward(-moveSpeed); moved = true; }
            if (this.moveState.left) { this.pointerLockControls.moveRight(-moveSpeed); moved = true; }
            if (this.moveState.right) { this.pointerLockControls.moveRight(moveSpeed); moved = true; }

            if (this.cameraMode === CAMERA_MODES.FREE) {
                if (this.moveState.up) { this._cam.position.y += verticalMoveSpeed; moved = true; }
                if (this.moveState.down) { this._cam.position.y -= verticalMoveSpeed; moved = true; }
            }

            if (moved) {
                this.targetPosition.copy(this._cam.position);
                const lookDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
                this.targetLookAt.copy(this._cam.position).add(lookDirection);
                this.currentPosition.copy(this._cam.position);
                this.currentLookAt.copy(this.targetLookAt);
                needsLerp = false;
            }
        } else if (this.cameraMode === CAMERA_MODES.TOP_DOWN) {
            this.targetLookAt.x = this.targetPosition.x;
            this.targetLookAt.z = this.targetPosition.z;
            this.targetLookAt.y = 0;

            this.currentPosition.lerp(this.targetPosition, this.dampingFactor);
            this.currentLookAt.lerp(this.targetLookAt, this.dampingFactor);

            this._cam.position.copy(this.currentPosition);
            this._cam.lookAt(this.currentLookAt);

            const epsilon = 0.001;
            if (this.currentPosition.distanceTo(this.targetPosition) < epsilon &&
                this.currentLookAt.distanceTo(this.targetLookAt) < epsilon) {
                this.currentPosition.copy(this.targetPosition);
                this.currentLookAt.copy(this.targetLookAt);
            }
            needsLerp = false;
        }

        if (this.isFollowing && this.followTargetObject && !this._isManuallyControlled) {
            const targetActualPosition = this.followTargetObject.isVector3 ? this.followTargetObject : this.followTargetObject.position;
            if (targetActualPosition) {
                const desiredLookAt = targetActualPosition.clone().add(this.followOptions.offset);
                this.targetLookAt.lerp(desiredLookAt, this.followOptions.damping);

                const directionToTarget = new THREE.Vector3().subVectors(this.currentPosition, this.targetLookAt).normalize();
                const desiredCamPos = this.targetLookAt.clone().addScaledVector(directionToTarget, this.followOptions.distance);
                this.targetPosition.lerp(desiredCamPos, this.followOptions.damping);
                needsLerp = true;
            }
        }

        if (needsLerp) {
            const epsilon = 0.001;
            this.currentPosition.lerp(this.targetPosition, this.dampingFactor);
            this.currentLookAt.lerp(this.targetLookAt, this.dampingFactor);

            if (this.currentPosition.distanceTo(this.targetPosition) <= epsilon) this.currentPosition.copy(this.targetPosition);
            if (this.currentLookAt.distanceTo(this.targetLookAt) <= epsilon) this.currentLookAt.copy(this.targetLookAt);

            this._cam.position.copy(this.currentPosition);
            this._cam.lookAt(this.currentLookAt);
        }

        this.animationFrameId = requestAnimationFrame(this._updateCameraLogic);
    };

    startFollowing(target, options = {}) {
        if (!target) return;
        this.followTargetObject = target;
        this.followOptions = { ...this.followOptions, ...options };
        this.isFollowing = true;
        this._isManuallyControlled = false;
        this.currentTargetNodeId = target?.id || null;
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        this.space.emit('camera:followStarted', { target: this.followTargetObject, options: this.followOptions });
    }

    stopFollowing() {
        if (this.isFollowing) {
            const oldTarget = this.followTargetObject;
            this.isFollowing = false;
            this.followTargetObject = null;
            this.space.emit('camera:followStopped', { oldTarget });
        }
    }

    dispose() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.pointerLockControls?.dispose();
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);

        this.space = null;
        this._cam = null;
        this.domElement = null;
        this.viewHistory = [];
        this.namedViews.clear();
        this.followTargetObject = null;
    }

    _loadNamedViewsFromStorage() {
        try {
            const storedViews = localStorage.getItem('spacegraph_namedViews');
            if (storedViews) {
                const parsedViews = JSON.parse(storedViews);
                Object.entries(parsedViews).forEach(([name, viewData]) => {
                    this.namedViews.set(name, {
                        position: new THREE.Vector3(viewData.position.x, viewData.position.y, viewData.position.z),
                        lookAt: new THREE.Vector3(viewData.lookAt.x, viewData.lookAt.y, viewData.lookAt.z),
                        mode: viewData.mode || CAMERA_MODES.ORBIT,
                        targetNodeId: viewData.targetNodeId,
                    });
                });
            }
        } catch (e) { console.error('Camera: Error loading named views:', e); }
    }

    _saveNamedViewsToStorage() {
        try {
            const viewsToStore = {};
            this.namedViews.forEach((view, name) => {
                viewsToStore[name] = {
                    position: { x: view.position.x, y: view.position.y, z: view.position.z },
                    lookAt: { x: view.lookAt.x, y: view.lookAt.y, z: view.lookAt.z },
                    mode: view.mode,
                    targetNodeId: view.targetNodeId,
                };
            });
            localStorage.setItem('spacegraph_namedViews', JSON.stringify(viewsToStore));
        } catch (e) { console.error('Camera: Error saving named views:', e); }
    }

    saveNamedView(name) {
        if (!name || typeof name !== 'string') return false;
        this.namedViews.set(name, {
            position: this.targetPosition.clone(),
            lookAt: this.targetLookAt.clone(),
            mode: this.cameraMode,
            targetNodeId: this.currentTargetNodeId,
        });
        this._saveNamedViewsToStorage();
        this.space.emit('camera:namedViewSaved', { name, view: this.namedViews.get(name) });
        return true;
    }

    restoreNamedView(name, duration = 0.7) {
        const view = this.namedViews.get(name);
        if (!view) return false;
        this.moveTo(view.position.x, view.position.y, view.position.z, duration, view.lookAt, view.mode);
        this.setCurrentTargetNodeId(view.targetNodeId);
        this.space.emit('camera:namedViewRestored', { name, view });
        return true;
    }

    deleteNamedView(name) {
        if (!this.namedViews.has(name)) return false;
        this.namedViews.delete(name);
        this._saveNamedViewsToStorage();
        this.space.emit('camera:namedViewDeleted', { name });
        return true;
    }

    getNamedViews = () => Array.from(this.namedViews.keys());
    hasNamedView = (name) => this.namedViews.has(name);

    setCameraMode(mode, calledInternally = false) {
        if (!Object.values(CAMERA_MODES).includes(mode)) {
            console.warn(`Camera: Unknown mode "${mode}" requested.`);
            return;
        }
        if (this.cameraMode === mode && !calledInternally) return;

        const oldMode = this.cameraMode;
        this.cameraMode = mode;
        this._isManuallyControlled = true;

        if (oldMode === CAMERA_MODES.FREE || oldMode === CAMERA_MODES.FIRST_PERSON) {
            if (this.isPointerLocked) this.pointerLockControls.unlock();
        }

        this.domElement.style.cursor = 'default';

        switch (this.cameraMode) {
            case CAMERA_MODES.ORBIT:
                this.domElement.style.cursor = 'grab';
                break;
            case CAMERA_MODES.FREE:
                this.domElement.style.cursor = 'crosshair';
                this.targetPosition.copy(this.currentPosition);
                const lookDirectionFree = new THREE.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
                this.targetLookAt.copy(this.currentPosition).add(lookDirectionFree);
                break;
            case CAMERA_MODES.TOP_DOWN:
                this.domElement.style.cursor = 'move';
                const height = this.currentPosition.y > this.minZoomDistance ? this.currentPosition.y : Math.max(this.minZoomDistance, 500);
                this.targetPosition.set(this.currentLookAt.x, height, this.currentLookAt.z);
                this.targetLookAt.set(this.currentLookAt.x, 0, this.currentLookAt.z);
                break;
            case CAMERA_MODES.FIRST_PERSON:
                this.domElement.style.cursor = 'crosshair';
                this.targetPosition.copy(this.currentPosition);
                const lookDirectionFPS = new THREE.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
                this.targetLookAt.copy(this.currentPosition).add(lookDirectionFPS);
                break;
            case CAMERA_MODES.DRAG_ORBIT:
                this.domElement.style.cursor = 'grab';
                // Ensure camera orientation is maintained, similar to ORBIT mode initialization if needed
                // For DRAG_ORBIT, the initial state is typically derived from the current view or a reset.
                // If switching from a mode like TOP_DOWN, we might want to adjust the camera angle.
                // For now, we'll assume it keeps its current orientation or is set by moveTo.
                break;
        }
        this.space.emit('camera:modeChanged', { newMode: this.cameraMode, oldMode });
        setTimeout(() => this._isManuallyControlled = false, 50);
    }

    startOrbitDrag(startX, startY) {
        if (this.cameraMode !== CAMERA_MODES.DRAG_ORBIT || this.isOrbitDragging || this.isPanning) return;
        this._isManuallyControlled = true;
        this.isOrbitDragging = true;
        this.orbitDragStart.set(startX, startY);
        this.domElement.style.cursor = 'grabbing'; // Or 'move' or a custom orbit cursor
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        if (this.isFollowing && this.followOptions.autoEndOnManualControl) this.stopFollowing();
        this.currentTargetNodeId = null;

        // If pointer lock was active (e.g. from FREE mode), temporarily disable it
        if (this.pointerLockControls && this.pointerLockControls.isLocked) {
            this.prevPointerLockControlsEnabled = true;
            this.pointerLockControls.unlock(); // Unlock to allow mouse orbit
        } else {
            this.prevPointerLockControlsEnabled = false;
        }
    }

    orbitDrag(deltaX, deltaY) {
        if (this.cameraMode !== CAMERA_MODES.DRAG_ORBIT || !this.isOrbitDragging) return;

        const orbitSpeed = 0.005; // Adjust as needed
        const rotateSpeed = 0.5; // Adjust as needed

        const lookAtToCam = new THREE.Vector3().subVectors(this.currentPosition, this.currentLookAt);
        const radius = lookAtToCam.length();

        // Horizontal rotation (around world Y axis)
        const thetaDelta = -deltaX * rotateSpeed * orbitSpeed * Math.PI * 2;
        lookAtToCam.applyAxisAngle(new THREE.Vector3(0, 1, 0), thetaDelta);

        // Vertical rotation (around camera's local X axis)
        const phiDelta = -deltaY * rotateSpeed * orbitSpeed * Math.PI;
        const cameraX = new THREE.Vector3().setFromMatrixColumn(this._cam.matrixWorld, 0);
        lookAtToCam.applyAxisAngle(cameraX, phiDelta);

        // Ensure the camera doesn't flip over
        const newPosition = new THREE.Vector3().copy(this.currentLookAt).add(lookAtToCam);

        // Check polar angle constraints (simplified)
        const up = new THREE.Vector3(0, 1, 0);
        const angleToUp = lookAtToCam.angleTo(up);
        const minPolar = 0.01; // Avoid gimbal lock at poles
        const maxPolar = Math.PI - 0.01;

        if (angleToUp > minPolar && angleToUp < maxPolar) {
             this.targetPosition.copy(this.currentLookAt).add(lookAtToCam.setLength(radius));
        } else {
            // If constraint is violated, revert the vertical rotation part
            lookAtToCam.applyAxisAngle(cameraX, -phiDelta); // Revert vertical
            this.targetPosition.copy(this.currentLookAt).add(lookAtToCam.setLength(radius));
        }
    }

    endOrbitDrag() {
        if (this.cameraMode !== CAMERA_MODES.DRAG_ORBIT || !this.isOrbitDragging) return;
        this.isOrbitDragging = false;
        this._isManuallyControlled = false;
        this.domElement.style.cursor = this.cameraMode === CAMERA_MODES.DRAG_ORBIT ? 'grab' : 'default';

        // Re-enable pointer lock if it was active before orbit drag
        if (this.prevPointerLockControlsEnabled && this.pointerLockControls &&
            (this.cameraMode === CAMERA_MODES.FREE || this.cameraMode === CAMERA_MODES.FIRST_PERSON)) {
            // this.pointerLockControls.lock(); // Re-locking might be disruptive, depends on UX preference
        }
        this.prevPointerLockControlsEnabled = false;
    }
}
