import * as THREE from 'three';
import { gsap } from 'gsap';
import { Utils } from '../utils.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const CAMERA_MODES = {
    ORBIT: 'orbit',
    FREE: 'free',
};

export class Camera {
    space = null;
    _cam = null; // The THREE.PerspectiveCamera instance
    domElement = null; // The canvas/container element for event listeners

    // Target state for smooth camera movement (lerping)
    targetPosition = new THREE.Vector3();
    targetLookAt = new THREE.Vector3();

    // Current interpolated state
    currentPosition = new THREE.Vector3(); // Actual _cam.position will lerp to this
    currentLookAt = new THREE.Vector3(); // Point _cam is actually looking at

    // Pan state (for orbit mode)
    isPanning = false;
    panStart = new THREE.Vector2(); // Screen coordinates where pan started

    // View history for undo/redo camera positions
    viewHistory = [];
    maxHistory = 20;
    currentTargetNodeId = null; // For context with history states

    // Initial state for resetView
    initialState = null;

    // Configurable parameters
    zoomSpeed = 1.0;
    panSpeed = 0.8; // Orbit mode pan speed
    minZoomDistance = 10;
    maxZoomDistance = 15000;
    dampingFactor = 0.12; // For lerping, higher is slower/smoother

    // Animation frame ID for the update loop
    animationFrameId = null;

    // Named views
    namedViews = new Map();

    // Camera mode and free camera specifics
    cameraMode = CAMERA_MODES.ORBIT;
    freeCameraSpeed = 250.0; // World units per second
    freeCameraVerticalSpeed = 180.0; // Separate speed for up/down
    pointerLockControls = null;
    isPointerLocked = false;
    // Movement flags for free camera, controlled by keydown/keyup
    moveState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
    };
    prevTime = performance.now(); // For calculating delta time in free cam movement

    // AutoCamera (Follow Mode)
    followTargetObject = null; // Can be a BaseNode or a THREE.Vector3
    followOptions = {
        distance: 300,
        damping: 0.05,
        offset: new THREE.Vector3(0, 50, 0), // Default offset: look slightly above and from a distance
        autoEndOnManualControl: true, // Stop following if user pans/zooms/moves manually
    };
    isFollowing = false;
    _isManuallyControlled = false; // Flag to detect user interruption of follow mode

    constructor(space) {
        if (!space?._cam || !space.container) {
            throw new Error('Camera requires SpaceGraph instance with initialized _cam and container.');
        }
        this.space = space;
        this._cam = space._cam;
        this.domElement = space.container;

        this.currentPosition.copy(this._cam.position);
        this.targetPosition.copy(this._cam.position);
        // Sensible initial lookAt: project camera's initial Z onto XY plane, or a bit in front
        this.currentLookAt.set(this._cam.position.x, this._cam.position.y, 0);
        this.targetLookAt.copy(this.currentLookAt);

        this._initializePointerLockControls();
        this._loadNamedViewsFromStorage();
        this._startUpdateLoop(); // Starts the continuous camera update
    }

    _initializePointerLockControls() {
        this.pointerLockControls = new PointerLockControls(this._cam, this.domElement);
        this.pointerLockControls.minPolarAngle = 0; // radians
        this.pointerLockControls.maxPolarAngle = Math.PI; // radians

        this.pointerLockControls.addEventListener('lock', () => {
            this.isPointerLocked = true;
            // Reset movement state when lock is acquired
            Object.keys(this.moveState).forEach(key => this.moveState[key] = false);
            this.domElement.style.cursor = 'none'; // Hide cursor when locked
            this.space.emit('camera:pointerLockChanged', { locked: true });
        });

        this.pointerLockControls.addEventListener('unlock', () => {
            this.isPointerLocked = false;
            this.domElement.style.cursor = this.cameraMode === CAMERA_MODES.FREE ? 'crosshair' : 'grab';
            // If pointer lock is lost and we are in free mode, consider switching back to orbit or notifying.
            if (this.cameraMode === CAMERA_MODES.FREE) {
                 // this.setCameraMode(CAMERA_MODES.ORBIT); // Example: switch back to orbit
            }
            this.space.emit('camera:pointerLockChanged', { locked: false });
        });

        // Key listeners are now managed by UIManager and will call public methods like setFreeCameraMovement.
    }

    // Called by UIManager or similar input handler
    setFreeCameraMovement(direction, isActive) {
        if (this.cameraMode !== CAMERA_MODES.FREE) return;
        if (direction in this.moveState) {
            this.moveState[direction] = isActive;
        }
    }


    setInitialState() {
        // Capture the state *after* the first centerView/focus, or a default good view
        if (!this.initialState) {
            this.initialState = {
                position: this.targetPosition.clone(),
                lookAt: this.targetLookAt.clone(),
                mode: this.cameraMode // Store mode as well if it can be part of initial state
            };
        }
    }

    startPan(startX, startY) {
        if (this.cameraMode !== CAMERA_MODES.ORBIT || this.isPanning) return;
        this._isManuallyControlled = true; // User is interacting
        this.isPanning = true;
        this.panStart.set(startX, startY);
        this.domElement.classList.add('panning'); // For cursor style
        gsap.killTweensOf(this.targetPosition); // Stop any ongoing animations
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

        const panX = -deltaX * worldUnitsPerPixel * this.panSpeed;
        const panY = deltaY * worldUnitsPerPixel * this.panSpeed;

        // Get camera's local right and up vectors directly from its world matrix
        const right = new THREE.Vector3().setFromMatrixColumn(this._cam.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(this._cam.matrixWorld, 1);

        const panOffset = right.multiplyScalar(panX).add(up.multiplyScalar(panY));
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

        const zoomFactor = Math.pow(0.95, deltaY * 0.025 * this.zoomSpeed); // Adjusted sensitivity
        const lookAtToCam = new THREE.Vector3().subVectors(this.targetPosition, this.targetLookAt);
        let currentDist = lookAtToCam.length();
        let newDist = Utils.clamp(currentDist * zoomFactor, this.minZoomDistance, this.maxZoomDistance);

        // If already at min/max, allow zooming away from it
        if ((deltaY > 0 && currentDist <= this.minZoomDistance + 0.1) || (deltaY < 0 && currentDist >= this.maxZoomDistance - 0.1)) {
             if ( (deltaY < 0 && currentDist * zoomFactor > currentDist) || (deltaY > 0 && currentDist * zoomFactor < currentDist) ) {
                 // Allow zoom out if at min, or zoom in if at max
             } else {
                 newDist = currentDist; // Prevent further zooming in the clamped direction
             }
        }

        this.targetPosition.copy(this.targetLookAt).addScaledVector(lookAtToCam.normalize(), newDist);
    }

    moveTo(x, y, z, duration = 0.7, lookAtTarget = null, newCameraMode = null) {
        this._isManuallyControlled = true;
        if (this.isFollowing && this.followOptions.autoEndOnManualControl) this.stopFollowing();
        this.setInitialState(); // Ensure initial state exists before first programmatic move

        const targetPos = new THREE.Vector3(x, y, z);
        const targetLook = lookAtTarget instanceof THREE.Vector3 ? lookAtTarget.clone() : new THREE.Vector3(x, y, 0); // Default lookAt XY of target, Z=0

        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);

        const ease = 'power3.out';
        const onComplete = () => { this._isManuallyControlled = false; };

        gsap.to(this.targetPosition, { x: targetPos.x, y: targetPos.y, z: targetPos.z, duration, ease, overwrite: true });
        gsap.to(this.targetLookAt, { x: targetLook.x, y: targetLook.y, z: targetLook.z, duration, ease, overwrite: true, onComplete });

        if (newCameraMode && newCameraMode !== this.cameraMode) {
            this.setCameraMode(newCameraMode, true); // Set mode without unlocking if it's 'free'
        }
    }

    resetView(duration = 0.7) {
        if (this.initialState) {
            this.moveTo(
                this.initialState.position.x, this.initialState.position.y, this.initialState.position.z,
                duration, this.initialState.lookAt, this.initialState.mode || CAMERA_MODES.ORBIT
            );
        } else {
            // Fallback to a sensible default if initial state was never set
            this.moveTo(0, 0, 700, duration, new THREE.Vector3(0, 0, 0), CAMERA_MODES.ORBIT);
        }
        this.viewHistory = []; // Clear history on reset
        this.currentTargetNodeId = null;
    }

    pushState() {
        if (this.viewHistory.length >= this.maxHistory) {
            this.viewHistory.shift(); // Remove oldest state
        }
        this.viewHistory.push({
            position: this.targetPosition.clone(), // Store target, not current lerped, for accuracy
            lookAt: this.targetLookAt.clone(),
            mode: this.cameraMode,
            targetNodeId: this.currentTargetNodeId,
        });
    }

    popState(duration = 0.6) {
        const prevState = this.viewHistory.pop();
        if (prevState) {
            this.moveTo(prevState.position.x, prevState.position.y, prevState.position.z, duration, prevState.lookAt, prevState.mode);
            this.currentTargetNodeId = prevState.targetNodeId;
        } else {
            this.resetView(duration); // If history is empty, reset to initial
        }
    }

    getCurrentTargetNodeId = () => this.currentTargetNodeId;
    setCurrentTargetNodeId = (nodeId) => { this.currentTargetNodeId = nodeId; };

    _startUpdateLoop = () => {
        this.animationFrameId = requestAnimationFrame(this._updateCameraLogic);
    };

    _updateCameraLogic = () => {
        const time = performance.now();
        const delta = (time - this.prevTime) / 1000; // Delta time in seconds
        this.prevTime = time;

        let needsLerp = false;

        // Free Camera Mode Logic
        if (this.cameraMode === CAMERA_MODES.FREE && this.isPointerLocked) {
            const moveSpeed = this.freeCameraSpeed * delta;
            const verticalMoveSpeed = this.freeCameraVerticalSpeed * delta;
            let moved = false;

            if (this.moveState.forward) { this.pointerLockControls.moveForward(moveSpeed); moved = true; }
            if (this.moveState.backward) { this.pointerLockControls.moveForward(-moveSpeed); moved = true; }
            if (this.moveState.left) { this.pointerLockControls.moveRight(-moveSpeed); moved = true; }
            if (this.moveState.right) { this.pointerLockControls.moveRight(moveSpeed); moved = true; }
            if (this.moveState.up) { this._cam.position.y += verticalMoveSpeed; moved = true; }
            if (this.moveState.down) { this._cam.position.y -= verticalMoveSpeed; moved = true; }

            if (moved) {
                this.targetPosition.copy(this._cam.position);
                // In free cam, lookAt is implicitly handled by PointerLockControls rotation.
                // We update targetLookAt to be in front of the camera.
                const lookDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
                this.targetLookAt.copy(this._cam.position).add(lookDirection);
                // Since we directly manipulated _cam.position, copy it to currentPosition as well
                this.currentPosition.copy(this._cam.position);
                this.currentLookAt.copy(this.targetLookAt); // And currentLookAt
            }
             needsLerp = false; // No lerping needed as we directly control _cam
        } else {
             needsLerp = true; // Orbit, follow, or non-locked free mode will lerp
        }


        // AutoCamera (Follow Mode) Logic - applied before manual controls potentially override
        if (this.isFollowing && this.followTargetObject && !this._isManuallyControlled) {
            let targetActualPosition;
            if (this.followTargetObject.isVector3) { // Is it a raw THREE.Vector3?
                targetActualPosition = this.followTargetObject;
            } else if (this.followTargetObject.position?.isVector3) { // Is it a node-like object?
                targetActualPosition = this.followTargetObject.position;
            }

            if (targetActualPosition) {
                // Desired camera position relative to target: target + offset, then pull back by distance.
                const desiredLookAt = targetActualPosition.clone().add(this.followOptions.offset);
                this.targetLookAt.lerp(desiredLookAt, this.followOptions.damping); // Smoothly update lookAt target

                // Calculate camera position based on distance from the (already smoothed) targetLookAt
                // This makes the camera follow the lookAt point smoothly.
                const directionToTarget = new THREE.Vector3().subVectors(this.currentPosition, this.targetLookAt).normalize();
                const desiredCamPos = this.targetLookAt.clone().addScaledVector(directionToTarget, this.followOptions.distance);
                this.targetPosition.lerp(desiredCamPos, this.followOptions.damping);
                needsLerp = true;
            }
        }

        // Lerp current camera position and lookAt towards their targets
        // This applies to orbit mode, moveTo animations, and follow mode.
        // Not applied if in free cam and pointer is locked (direct manipulation).
        if (needsLerp) {
            const posDelta = this.currentPosition.distanceTo(this.targetPosition);
            const lookAtDelta = this.currentLookAt.distanceTo(this.targetLookAt);
            const epsilon = 0.001; // Threshold for "close enough"

            if (posDelta > epsilon) {
                this.currentPosition.lerp(this.targetPosition, this.dampingFactor);
            } else {
                this.currentPosition.copy(this.targetPosition); // Snap if very close
            }

            if (lookAtDelta > epsilon) {
                this.currentLookAt.lerp(this.targetLookAt, this.dampingFactor);
            } else {
                this.currentLookAt.copy(this.targetLookAt); // Snap
            }

            this._cam.position.copy(this.currentPosition);
            this._cam.lookAt(this.currentLookAt);
        }


        // Emit camera:moved event (consider debouncing or thresholding if too frequent)
        // For now, emitting on significant changes in the actual camera state.
        // This part might need refinement based on how frequently updates are desired.
        // if (this._cam.position.distanceTo(this._prevPosition) > 0.01 || this.currentLookAt.distanceTo(this._prevLookAt) > 0.01) {
        //    this.space.emit('camera:moved', this._cam.position.clone(), this.currentLookAt.clone());
        //    this._prevPosition.copy(this._cam.position);
        //    this._prevLookAt.copy(this.currentLookAt);
        // }

        this.animationFrameId = requestAnimationFrame(this._updateCameraLogic);
    };


    // --- AutoCamera (Follow Mode) Methods ---
    startFollowing(target, options = {}) {
        if (!target) return;
        this.followTargetObject = target; // BaseNode or THREE.Vector3
        this.followOptions = { ...this.followOptions, ...this.defaultFollowOptions, ...options };
        this.isFollowing = true;
        this._isManuallyControlled = false; // Reset manual control flag
        this.currentTargetNodeId = target?.id || null;
        gsap.killTweensOf(this.targetPosition); // Stop other tweens that might conflict
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
        this.pointerLockControls?.dispose(); // PointerLockControls adds its own listeners
        gsap.killTweensOf(this.targetPosition); // Kill any ongoing GSAP animations
        gsap.killTweensOf(this.targetLookAt);

        // Nullify references to break cycles and help GC
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
                        mode: viewData.mode || CAMERA_MODES.ORBIT, // Load mode, default to orbit
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
        if (view) {
            this.moveTo(view.position.x, view.position.y, view.position.z, duration, view.lookAt, view.mode);
            this.setCurrentTargetNodeId(view.targetNodeId); // For context
            this.space.emit('camera:namedViewRestored', { name, view });
            return true;
        }
        return false;
    }

    deleteNamedView(name) {
        if (this.namedViews.has(name)) {
            this.namedViews.delete(name);
            this._saveNamedViewsToStorage();
            this.space.emit('camera:namedViewDeleted', { name });
            return true;
        }
        return false;
    }

    getNamedViews = () => Array.from(this.namedViews.keys());
    hasNamedView = (name) => this.namedViews.has(name);


    // --- Camera Mode Methods ---
    setCameraMode(mode, calledInternally = false) {
        if (mode !== CAMERA_MODES.ORBIT && mode !== CAMERA_MODES.FREE) {
            console.warn(`Camera: Unknown mode '${mode}'.`);
            return;
        }
        if (this.cameraMode === mode && !calledInternally) return; // No change unless forced by internal logic

        const oldMode = this.cameraMode;
        this.cameraMode = mode;
        this._isManuallyControlled = true; // Indicate potential mode switch interruption

        if (this.cameraMode === CAMERA_MODES.ORBIT) {
            if (this.isPointerLocked) this.pointerLockControls.unlock(); // Unlock if was locked
            this.domElement.style.cursor = 'grab';
            // When switching from free to orbit, ensure targetLookAt is sensible.
            // It might have been just in front of the camera.
            // A simple heuristic: keep current camera position, look at a point on Z=0 plane below it.
            if (oldMode === CAMERA_MODES.FREE) {
                 this.targetLookAt.set(this.currentPosition.x, this.currentPosition.y, 0);
            }
        } else if (this.cameraMode === CAMERA_MODES.FREE) {
            this.domElement.style.cursor = 'crosshair';
            // Pointer lock is typically requested by UIManager on user click when in free mode.
            // Here we just set the mode. If calledInternally is true, it means moveTo might be
            // transitioning to free mode and might want to lock immediately if possible.
            // For now, don't auto-lock here; let UI trigger it.
            this.targetPosition.copy(this.currentPosition); // Sync target with current actual position
            const lookDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
            this.targetLookAt.copy(this.currentPosition).add(lookDirection); // Look where camera is pointing
        }
        this.space.emit('camera:modeChanged', { newMode: this.cameraMode, oldMode });
        setTimeout(() => this._isManuallyControlled = false, 50); // Briefly allow transition
    }

    getCameraMode = () => this.cameraMode;

    // Public methods for UIManager to request pointer lock/unlock
    requestPointerLock() {
        if (this.cameraMode === CAMERA_MODES.FREE && !this.isPointerLocked) {
            this.pointerLockControls.lock();
        }
    }

    exitPointerLock() {
        if (this.isPointerLocked) {
            this.pointerLockControls.unlock();
        }
    }

    // These are no longer needed as UIManager calls setFreeCameraMovement
    // moveFreeCamera(...)
    // rotateFreeCamera(...)
}
