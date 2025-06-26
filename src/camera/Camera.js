import * as THREE from 'three';
import {gsap} from 'gsap';
import {Utils} from '../utils.js';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';

const CAMERA_MODES = {
    ORBIT: 'orbit',
    FREE: 'free',
    TOP_DOWN: 'top_down',
    FIRST_PERSON: 'first_person',
};

/**
 * Manages camera controls, movement, and different interaction modes.
 * Available modes:
 * - ORBIT: Standard orbit controls (pan, zoom, rotate around a target).
 * - FREE: First-person like movement with pointer lock (WASD + mouse look).
 * - TOP_DOWN: Fixed top-down view, pans on XZ plane, zooms along Y.
 * - FIRST_PERSON: Similar to FREE, intended for potential node attachment or specific FPS interactions.
 *
 * Mode switching is handled by `setCameraMode(modeName)`.
 * The actual control logic and state for each mode are managed within this class.
 */
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
        if (this.cameraMode !== CAMERA_MODES.ORBIT || this.isPanning) return;
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
        if (this.cameraMode !== CAMERA_MODES.ORBIT || !this.isPanning) return;

        const cameraDist = this.currentPosition.distanceTo(this.currentLookAt);
        const vFOV = this._cam.fov * Utils.DEG2RAD;
        const viewHeight = this.domElement.clientHeight || window.innerHeight;
        const visibleHeight = 2 * Math.tan(vFOV / 2) * Math.max(1, cameraDist);
        const worldUnitsPerPixel = visibleHeight / viewHeight;

        const panOffset = new THREE.Vector3()
            .setFromMatrixColumn(this._cam.matrixWorld, 0)
            .multiplyScalar(-deltaX * worldUnitsPerPixel * this.panSpeed)
            .add(
                new THREE.Vector3()
                    .setFromMatrixColumn(this._cam.matrixWorld, 1)
                    .multiplyScalar(deltaY * worldUnitsPerPixel * this.panSpeed)
            );
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
        const lookAtToCam = new THREE.Vector3().subVectors(this.targetPosition, this.targetLookAt);
        const currentDist = lookAtToCam.length();
        const newDist = Utils.clamp(currentDist * zoomFactor, this.minZoomDistance, this.maxZoomDistance);

        this.targetPosition.copy(this.targetLookAt).addScaledVector(lookAtToCam.normalize(), newDist);
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

            // For FIRST_PERSON, up/down movement might be locked or handled by jumping/crouching mechanics later.
            // For FREE mode, it's allowed.
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
            // Ensure camera always looks straight down
            // targetPosition.y is controlled by zoom
            // targetPosition.x and .z are controlled by pan
            // targetLookAt.x and .z should follow targetPosition
            // targetLookAt.y should be on the ground (e.g., 0)
            this.targetLookAt.x = this.targetPosition.x;
            this.targetLookAt.z = this.targetPosition.z;
            this.targetLookAt.y = 0; // Or a configurable ground plane setting

            // Force current camera to align if not already lerping there
            // This is more of a hard lock for TOP_DOWN's orientation
            this.currentPosition.lerp(this.targetPosition, this.dampingFactor);
            this.currentLookAt.lerp(this.targetLookAt, this.dampingFactor); // LookAt will also lerp to its XZ target

            this._cam.position.copy(this.currentPosition);
            this._cam.lookAt(this.currentLookAt); // This enforces the downward look

            // If we are close enough, snap to prevent jitter
            const epsilon = 0.001;
            if (this.currentPosition.distanceTo(this.targetPosition) < epsilon &&
                this.currentLookAt.distanceTo(this.targetLookAt) < epsilon) {
                this.currentPosition.copy(this.targetPosition);
                this.currentLookAt.copy(this.targetLookAt);
            }
            needsLerp = false; // Lerping is handled above for position, lookAt is forced
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
        if (mode !== CAMERA_MODES.ORBIT && mode !== CAMERA_MODES.FREE) return;
        if (this.cameraMode === mode && !calledInternally) return;

        const oldMode = this.cameraMode;
        this.cameraMode = mode;
        this._isManuallyControlled = true;

        if (this.cameraMode === CAMERA_MODES.ORBIT) {
            if (this.isPointerLocked) this.pointerLockControls.unlock();
            this.domElement.style.cursor = 'grab';
            if (oldMode === CAMERA_MODES.FREE) this.targetLookAt.set(this.currentPosition.x, this.currentPosition.y, 0);
        } else {
            this.domElement.style.cursor = 'crosshair';
            this.targetPosition.copy(this.currentPosition);
            const lookDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
            this.targetLookAt.copy(this.currentPosition).add(lookDirection);
        }
        this.space.emit('camera:modeChanged', { newMode: this.cameraMode, oldMode });
        setTimeout(() => this._isManuallyControlled = false, 50);
    }

    getCameraMode = () => this.cameraMode;

    requestPointerLock() {
        if (this.cameraMode === CAMERA_MODES.FREE && !this.isPointerLocked) this.pointerLockControls.lock();
        // Could potentially enable pointer lock for FIRST_PERSON as well if it uses similar controls
        else if (this.cameraMode === CAMERA_MODES.FIRST_PERSON && !this.isPointerLocked) this.pointerLockControls.lock();
    }

    exitPointerLock() {
        if (this.isPointerLocked) this.pointerLockControls.unlock();
    }

    // Modify pan and zoom to respect TopDown constraints
    pan(deltaX, deltaY) {
        if (this.cameraMode === CAMERA_MODES.ORBIT || this.cameraMode === CAMERA_MODES.TOP_DOWN) {
            if (!this.isPanning) return; // Should be called after startPan

            const cameraDist = this.currentPosition.distanceTo(this.currentLookAt);
            const vFOV = this._cam.fov * Utils.DEG2RAD;
            const viewHeight = this.domElement.clientHeight || window.innerHeight;
            const visibleHeight = 2 * Math.tan(vFOV / 2) * Math.max(1, cameraDist);
            const worldUnitsPerPixel = visibleHeight / viewHeight;

            let panOffset;
            if (this.cameraMode === CAMERA_MODES.TOP_DOWN) {
                // In top-down view, pan moves along X and Z axes relative to world
                // Assuming default camera up is Y, right is X, forward is -Z
                // We need to adjust based on current camera's orientation if it can rotate
                // For a fixed top-down (no rotation), this is simpler:
                panOffset = new THREE.Vector3(-deltaX * worldUnitsPerPixel * this.panSpeed, 0, deltaY * worldUnitsPerPixel * this.panSpeed);
                // If top-down allows Y-axis rotation, need to use camera's matrix for X direction
            } else { // ORBIT mode
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
        // For FREE and FIRST_PERSON, pan might be disabled or handled differently (e.g., only if not pointer locked)
    }

    zoom(deltaY) {
        this._isManuallyControlled = true;
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        if (this.isFollowing && this.followOptions.autoEndOnManualControl) this.stopFollowing();
        this.currentTargetNodeId = null;

        const zoomFactor = Math.pow(0.95, deltaY * 0.025 * this.zoomSpeed);

        if (this.cameraMode === CAMERA_MODES.TOP_DOWN) {
            // Zoom changes Y position, lookAt.y stays the same (or follows targetPosition.y)
            const currentY = this.targetPosition.y;
            let newY = currentY * zoomFactor;
            newY = Utils.clamp(newY, this.minZoomDistance, this.maxZoomDistance); // Use zoom distance for Y height
            this.targetPosition.y = newY;
            // targetLookAt.y should remain on the ground plane (e.g. 0) or follow targetPosition.y - newY
            this.targetLookAt.x = this.targetPosition.x; // Keep XZ aligned
            this.targetLookAt.z = this.targetPosition.z;
            this.targetLookAt.y = 0; // Assuming looking at ground plane
        } else {
            const lookAtToCam = new THREE.Vector3().subVectors(this.targetPosition, this.targetLookAt);
            const currentDist = lookAtToCam.length();
            const newDist = Utils.clamp(currentDist * zoomFactor, this.minZoomDistance, this.maxZoomDistance);
            this.targetPosition.copy(this.targetLookAt).addScaledVector(lookAtToCam.normalize(), newDist);
        }
    }


    setCameraMode(mode, calledInternally = false) {
        if (!Object.values(CAMERA_MODES).includes(mode)) {
            console.warn(`Camera: Unknown mode "${mode}" requested.`);
            return;
        }
        if (this.cameraMode === mode && !calledInternally) return;

        const oldMode = this.cameraMode;
        this.cameraMode = mode;
        this._isManuallyControlled = true; // Prevent lerping issues during transition

        // Common cleanup for modes that use pointer lock
        if (oldMode === CAMERA_MODES.FREE || oldMode === CAMERA_MODES.FIRST_PERSON) {
            if (this.isPointerLocked) this.pointerLockControls.unlock();
        }

        this.domElement.style.cursor = 'default'; // Reset cursor first

        switch (this.cameraMode) {
            case CAMERA_MODES.ORBIT:
                this.domElement.style.cursor = 'grab';
                // If coming from a mode that doesn't use targetLookAt in the same way (e.g. FREE, FPS)
                // we might need to re-evaluate targetLookAt based on current camera orientation.
                // For now, assume it's reasonable or handled by moveTo if called.
                if (oldMode === CAMERA_MODES.FREE || oldMode === CAMERA_MODES.FIRST_PERSON || oldMode === CAMERA_MODES.TOP_DOWN) {
                    // A sensible default if switching from non-orbit modes
                    // this.targetLookAt.set(this.currentPosition.x, this.currentPosition.y, 0); // Look towards scene center along Z=0
                }
                break;
            case CAMERA_MODES.FREE:
                this.domElement.style.cursor = 'crosshair';
                // Ensure targetPosition and targetLookAt are consistent with camera's current state
                this.targetPosition.copy(this.currentPosition);
                const lookDirectionFree = new THREE.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
                this.targetLookAt.copy(this.currentPosition).add(lookDirectionFree);
                break;
            case CAMERA_MODES.TOP_DOWN:
                this.domElement.style.cursor = 'move'; // Or 'grab'
                // Position camera directly above current targetLookAt.x, targetLookAt.z, at a certain height
                const height = this.currentPosition.y > this.minZoomDistance ? this.currentPosition.y : Math.max(this.minZoomDistance, 500);
                this.targetPosition.set(this.currentLookAt.x, height, this.currentLookAt.z);
                // Look straight down at the same XZ coordinates
                this.targetLookAt.set(this.currentLookAt.x, 0, this.currentLookAt.z); // Look at y=0 plane
                break;
            case CAMERA_MODES.FIRST_PERSON:
                this.domElement.style.cursor = 'crosshair';
                // Similar to FREE, but might have different movement constraints or interactions
                this.targetPosition.copy(this.currentPosition);
                const lookDirectionFPS = new THREE.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
                this.targetLookAt.copy(this.currentPosition).add(lookDirectionFPS);
                // Could attach to a node, set specific height, etc.
                // For now, it's like FREE mode.
                break;
        }
        this.space.emit('camera:modeChanged', { newMode: this.cameraMode, oldMode });
        // Short delay to allow any transition animations to start before re-enabling smooth lerping
        setTimeout(() => this._isManuallyControlled = false, 50);
    }
}
