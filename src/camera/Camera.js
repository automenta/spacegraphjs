import * as THREE from 'three';
import { gsap } from 'gsap';
import { Utils } from '../utils.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

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
    namedViews = new Map(); // For storing named views
    cameraMode = 'orbit'; // 'orbit' or 'free'
    freeCameraSpeed = 200.0; // Movement speed for free camera (world units per second)
    // freeCameraRotationSpeed is handled by PointerLockControls sensitivity

    // PointerLockControls related
    pointerLockControls = null;
    isPointerLocked = false;
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
    moveUp = false;
    moveDown = false;
    prevTime = performance.now(); // For PointerLockControls movement delta

    // AutoCamera (Follow Mode) related
    followTargetObject = null; // BaseNode or THREE.Vector3
    followOptions = {
        distance: 300, // Desired distance from target
        offset: null, // Optional THREE.Vector3 world-space offset from target before applying distance
        height: 50, // Height above target to look at and position relative to (if offset not given)
        damping: 0.05, // Damping factor for smooth follow
        autoEndOnManualControl: true, // Stop following if user pans/zooms
    };
    isFollowing = false;

    constructor(space) {
        if (!space?._cam || !space.container)
            throw new Error('Camera requires SpaceGraph instance with camera and container.');
        this.space = space; // Store SpaceGraph instance
        this._cam = space._cam;
        this.domElement = space.container;
        this.targetPosition.copy(this._cam.position);
        // Initial lookAt is projected onto Z=0 plane from initial camera position
        this.targetLookAt.set(this._cam.position.x, this._cam.position.y, 0);
        this.currentLookAt.copy(this.targetLookAt);
        this._prevPosition.copy(this._cam.position);
        this._prevLookAt.copy(this.targetLookAt);

        this._initializePointerLockControls();
        this._loadNamedViewsFromStorage(); // Load named views on init
        this._startUpdateLoop();
    }

    _initializePointerLockControls() {
        this.pointerLockControls = new PointerLockControls(this._cam, this.domElement);
        this.pointerLockControls.addEventListener('lock', () => {
            this.isPointerLocked = true;
            this.space.emit('camera:pointerLockChanged', { locked: true });
        });
        this.pointerLockControls.addEventListener('unlock', () => {
            this.isPointerLocked = false;
            // If unlocking, and mode is 'free', perhaps switch back to 'orbit' or notify UI
            if (this.cameraMode === 'free') {
                // this.setCameraMode('orbit'); // Optionally switch back
            }
            this.space.emit('camera:pointerLockChanged', { locked: false });
        });

        // Keydown/keyup listeners for movement will be added by UIPlugin or a similar input manager
        // that calls moveFreeCamera with directions.
        // For direct PointerLockControls movement:
        document.addEventListener('keydown', this._onKeyDown.bind(this));
        document.addEventListener('keyup', this._onKeyUp.bind(this));
    }

    // Basic key handlers for PointerLockControls movement flags
    _onKeyDown(event) {
        if (!this.isPointerLocked || this.cameraMode !== 'free') return;
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
            case 'Space':
                this.moveUp = true;
                break;
            case 'ShiftLeft':
            case 'ControlLeft':
                this.moveDown = true;
                break;
        }
    }
    _onKeyUp(event) {
        if (this.cameraMode !== 'free') return; // Allow key up even if not locked to reset flags
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
            case 'Space':
                this.moveUp = false;
                break;
            case 'ShiftLeft':
            case 'ControlLeft':
                this.moveDown = false;
                break;
        }
    }

    setInitialState() {
        if (!this.initialState) {
            // Capture the state *after* the first centerView/focus
            this.initialState = { position: this.targetPosition.clone(), lookAt: this.targetLookAt.clone() };
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
    };

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
        const targetLook =
            lookAtTarget instanceof THREE.Vector3 ? lookAtTarget.clone() : new THREE.Vector3(x, y, this.targetLookAt.z);
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        const ease = 'power3.out';
        gsap.to(this.targetPosition, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            duration,
            ease,
            overwrite: true,
        });
        gsap.to(this.targetLookAt, {
            x: targetLook.x,
            y: targetLook.y,
            z: targetLook.z,
            duration,
            ease,
            overwrite: true,
        });
    }

    resetView(duration = 0.7) {
        if (this.initialState)
            this.moveTo(
                this.initialState.position.x,
                this.initialState.position.y,
                this.initialState.position.z,
                duration,
                this.initialState.lookAt
            );
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
            targetNodeId: this.currentTargetNodeId,
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
        const needsUpdate =
            deltaPos > epsilon ||
            deltaLookAt > epsilon ||
            this.isPanning ||
            gsap.isTweening(this.targetPosition) ||
            gsap.isTweening(this.targetLookAt);

        if (needsUpdate) {
            this._cam.position.lerp(this.targetPosition, this.dampingFactor);
            this.currentLookAt.lerp(this.targetLookAt, this.dampingFactor);
            this._cam.lookAt(this.currentLookAt);
            // No need for updateProjectionMatrix unless FOV/aspect changes

            // Emit camera:moved event if position or lookAt has changed significantly
            const movementThreshold = 0.1; // World units
            if (
                this._cam.position.distanceTo(this._prevPosition) > movementThreshold ||
                this.currentLookAt.distanceTo(this._prevLookAt) > movementThreshold
            ) {
                this.space.emit('camera:moved', this._cam.position.clone(), this.currentLookAt.clone());
                this._prevPosition.copy(this._cam.position);
                this._prevLookAt.copy(this.currentLookAt);
            }
        } else if (deltaPos > 0 || deltaLookAt > 0) {
            // Snap to final position if close enough
            this._cam.position.copy(this.targetPosition);
            this.currentLookAt.copy(this.targetLookAt);
            this._cam.lookAt(this.currentLookAt);
            // Ensure one final emit after snapping
            this.space.emit('camera:moved', this._cam.position.clone(), this.currentLookAt.clone());
            this._prevPosition.copy(this._cam.position);
            this._prevLookAt.copy(this.currentLookAt);
        }

        // Handle PointerLockControls movement
        if (this.cameraMode === 'free' && this.isPointerLocked) {
            const time = performance.now();
            const delta = (time - this.prevTime) / 1000; // Delta time in seconds

            // Reset velocity before applying movement flags
            // PointerLockControls doesn't use velocity in the same way as physics simulation.
            // It directly moves the camera.

            const direction = new THREE.Vector3();
            if (this.moveForward) direction.z = -1;
            if (this.moveBackward) direction.z = 1;
            if (this.moveLeft) direction.x = -1;
            if (this.moveRight) direction.x = 1;
            if (this.moveUp) direction.y = 1;
            if (this.moveDown) direction.y = -1;

            direction.normalize(); // Ensure consistent speed in all directions

            if (direction.lengthSq() > 0) {
                // Only move if there's input
                // this.pointerLockControls.moveRight(direction.x * this.freeCameraSpeed * delta);
                // this.pointerLockControls.moveForward(direction.z * this.freeCameraSpeed * delta);
                // The above would move along world axes if camera is axis aligned.
                // For camera-relative movement:
                const actualMoveSpeed = this.freeCameraSpeed * delta;
                if (direction.x !== 0) this.pointerLockControls.moveRight(direction.x * actualMoveSpeed);
                if (direction.z !== 0) this.pointerLockControls.moveForward(direction.z * actualMoveSpeed);
                if (direction.y !== 0) {
                    // Vertical movement
                    this._cam.position.y += direction.y * actualMoveSpeed;
                }

                // Update targetPosition and targetLookAt to reflect PointerLockControls changes
                this.targetPosition.copy(this._cam.position);
                const lookDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
                this.targetLookAt.copy(this._cam.position).add(lookDirection);
            }
            this.prevTime = time;
        }

        // AutoCamera (Follow) Logic
        if (this.isFollowing && this.followTargetObject) {
            let targetActualPosition;
            if (this.followTargetObject.isVector3) {
                // Check if it's a THREE.Vector3
                targetActualPosition = this.followTargetObject;
            } else if (this.followTargetObject.position && this.followTargetObject.position.isVector3) {
                // Check if it's a node-like object
                targetActualPosition = this.followTargetObject.position;
            }

            if (targetActualPosition) {
                // Determine the point to look at
                let lookAtPoint = targetActualPosition.clone();
                if (this.followOptions.offset) {
                    lookAtPoint.add(this.followOptions.offset);
                } else {
                    lookAtPoint.y += this.followOptions.height; // Look slightly above the target's y
                }
                this.targetLookAt.copy(lookAtPoint);

                // Determine desired camera position
                // Simple approach: position behind and above the target along Z, or use offset
                let desiredCamPos = targetActualPosition.clone();
                if (this.followOptions.offset) {
                    desiredCamPos.add(this.followOptions.offset); // Start from offsetted point
                    // Then move back by distance. Need a direction.
                    // For now, let's assume offset includes the directionality.
                    // A more robust way: offset from target, then pull back along camera-to-target view.
                    // This simple version just puts camera at offset + distance along some axis.
                    // Let's refine: camera should be at target + offset, then pull back along view vector.
                    const viewDirection = new THREE.Vector3().subVectors(this._cam.position, lookAtPoint).normalize();
                    desiredCamPos = lookAtPoint.clone().addScaledVector(viewDirection, this.followOptions.distance);
                } else {
                    // Position camera behind the target (relative to world Z or a fixed orientation)
                    // This is a very basic follow-cam. A better one would maintain current camera yaw/pitch relative to target.
                    desiredCamPos.y += this.followOptions.height;
                    desiredCamPos.z += this.followOptions.distance;
                }

                // Lerp targetPosition towards desiredCamPos
                // This uses the main dampingFactor, or could use followOptions.damping
                this.targetPosition.lerp(desiredCamPos, this.followOptions.damping);

                // If user interacts, stop following (if option is set)
                // This check (gsap.isTweening or this.isPanning) needs to be robust
                if (
                    this.followOptions.autoEndOnManualControl &&
                    (this.isPanning || gsap.isTweening(this.targetPosition))
                ) {
                    // Check if the tween is NOT from the follow logic itself. This is tricky.
                    // A simpler way: if user calls pan(), zoom(), moveTo() explicitly, set a flag to break follow.
                    // For now, any active tween or pan will break it.
                    // this.stopFollowing(); // Potentially. Needs careful flag management to avoid self-cancellation.
                }
            }
        }

        this.animationFrameId = requestAnimationFrame(this._startUpdateLoop);
    };

    // --- AutoCamera (Follow Mode) Methods ---
    startFollowing(target, options = {}) {
        if (!target) {
            // console.warn('Camera: No target provided for startFollowing.');
            return;
        }
        this.followTargetObject = target; // BaseNode or THREE.Vector3
        this.followOptions = { ...this.followOptions, ...options }; // Merge new options
        this.isFollowing = true;
        this.currentTargetNodeId = target?.id || null; // If target is a node
        gsap.killTweensOf(this.targetPosition); // Stop other camera movements
        gsap.killTweensOf(this.targetLookAt);
        // console.log('Camera: Started following target.', this.followTargetObject);
        this.space.emit('camera:followStarted', { target: this.followTargetObject, options: this.followOptions });
    }

    stopFollowing() {
        if (this.isFollowing) {
            const oldTarget = this.followTargetObject;
            this.isFollowing = false;
            this.followTargetObject = null;
            // console.log('Camera: Stopped following target.', oldTarget);
            this.space.emit('camera:followStopped', { oldTarget });
        }
    }

    dispose() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        document.removeEventListener('keydown', this._onKeyDown.bind(this));
        document.removeEventListener('keyup', this._onKeyUp.bind(this));
        this.pointerLockControls?.dispose();
        gsap.killTweensOf(this.targetPosition);
        gsap.killTweensOf(this.targetLookAt);
        this.space = null;
        this._cam = null;
        this.domElement = null;
        this.viewHistory = [];
        this.namedViews.clear();
    }

    // --- Named Views Methods ---
    _loadNamedViewsFromStorage() {
        try {
            const storedViews = localStorage.getItem('spacegraph_namedViews');
            if (storedViews) {
                const parsedViews = JSON.parse(storedViews);
                // Need to re-hydrate THREE.Vector3 instances
                Object.entries(parsedViews).forEach(([name, viewData]) => {
                    this.namedViews.set(name, {
                        position: new THREE.Vector3(viewData.position.x, viewData.position.y, viewData.position.z),
                        lookAt: new THREE.Vector3(viewData.lookAt.x, viewData.lookAt.y, viewData.lookAt.z),
                        targetNodeId: viewData.targetNodeId,
                    });
                });
            }
        } catch (e) {
            console.error('Camera: Error loading named views from localStorage:', e);
        }
    }

    _saveNamedViewsToStorage() {
        try {
            // Convert Map to a plain object for JSON serialization, and Vector3 to plain objects
            const viewsToStore = {};
            this.namedViews.forEach((view, name) => {
                viewsToStore[name] = {
                    position: { x: view.position.x, y: view.position.y, z: view.position.z },
                    lookAt: { x: view.lookAt.x, y: view.lookAt.y, z: view.lookAt.z },
                    targetNodeId: view.targetNodeId,
                };
            });
            localStorage.setItem('spacegraph_namedViews', JSON.stringify(viewsToStore));
        } catch (e) {
            console.error('Camera: Error saving named views to localStorage:', e);
        }
    }

    saveNamedView(name) {
        if (!name || typeof name !== 'string') {
            console.error('Camera: Invalid name provided for saveNamedView.');
            return false;
        }
        this.namedViews.set(name, {
            position: this.targetPosition.clone(),
            lookAt: this.targetLookAt.clone(),
            targetNodeId: this.currentTargetNodeId,
        });
        this._saveNamedViewsToStorage(); // Persist
        this.space.emit('camera:namedViewSaved', { name, view: this.namedViews.get(name) });
        return true;
    }

    restoreNamedView(name, duration = 0.7) {
        const view = this.namedViews.get(name);
        if (view) {
            this.moveTo(view.position.x, view.position.y, view.position.z, duration, view.lookAt);
            this.setCurrentTargetNodeId(view.targetNodeId);
            this.space.emit('camera:namedViewRestored', { name, view });
            return true;
        }
        return false;
    }

    deleteNamedView(name) {
        if (this.namedViews.has(name)) {
            this.namedViews.delete(name);
            this._saveNamedViewsToStorage(); // Persist
            this.space.emit('camera:namedViewDeleted', { name });
            return true;
        }
        return false;
    }

    getNamedViews() {
        return Array.from(this.namedViews.keys());
    }

    hasNamedView(name) {
        return this.namedViews.has(name);
    }

    // --- Camera Mode Methods ---
    setCameraMode(mode) {
        if (mode === 'orbit' || mode === 'free') {
            if (this.cameraMode === mode) return; // No change

            this.cameraMode = mode;
            this.space.emit('camera:modeChanged', { mode: this.cameraMode });

            if (this.cameraMode === 'orbit') {
                if (this.isPointerLocked) this.pointerLockControls.unlock();
                this.domElement.style.cursor = 'grab'; // Or 'auto'
                // Ensure lookAt is reasonable when switching back to orbit
                const lookAtDistance = this.targetPosition.distanceTo(this.currentLookAt) || 300;
                const direction = new THREE.Vector3();
                this._cam.getWorldDirection(direction); // Get current camera direction
                this.targetLookAt.copy(this.targetPosition).addScaledVector(direction, lookAtDistance);
            } else if (this.cameraMode === 'free') {
                this.domElement.style.cursor = 'crosshair';
                // Attempt to lock pointer. User interaction (click) is usually required by browser.
                // UIManager should handle the click-to-lock.
                // this.pointerLockControls.lock(); // This might not work without user gesture.
                // For now, assume UI will trigger lock via a space.requestPointerLock() or similar
                this.targetPosition.copy(this._cam.position); // Sync targetPosition
                const lookDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
                this.targetLookAt.copy(this.targetPosition).add(lookDirection); // Sync targetLookAt
            }
        } else {
            // console.warn(`Camera: Unknown mode '${mode}'. Allowed modes: 'orbit', 'free'.`);
        }
    }

    getCameraMode() {
        return this.cameraMode;
    }

    // --- Free Camera Movement/Rotation Methods (to be called by input manager) ---
    // deltaTime is expected from the game loop, for frame-rate independent movement

    moveFreeCamera(direction, _deltaTime = 0.016) {
        // direction is a THREE.Vector3 like (0,0,-1) for forward
        if (this.cameraMode !== 'free' || !this._cam) return;

        gsap.killTweensOf(this.targetPosition); // Stop any ongoing tweens

        const moveVector = direction.clone();
        // Apply movement relative to camera's current orientation
        moveVector.applyQuaternion(this._cam.quaternion);
        moveVector.multiplyScalar(this.freeCameraSpeed * _deltaTime * 50); // Adjust multiplier as needed

        this.targetPosition.add(moveVector);
        // In free mode, the lookAt point also moves with the camera to maintain view direction.
        // However, explicit rotations will change lookAt more directly.
        // For pure translation, lookAt should translate identically.
        this.targetLookAt.add(moveVector);
    }

    rotateFreeCamera(deltaYaw, deltaPitch, _deltaTime = 0.016) {
        // deltaYaw, deltaPitch are changes in radians
        if (this.cameraMode !== 'free' || !this._cam) return;

        gsap.killTweensOf(this.targetLookAt); // Stop any ongoing lookAt tweens

        // Get current direction vector
        const currentDirection = new THREE.Vector3();
        this._cam.getWorldDirection(currentDirection);

        // Create a quaternion for yaw (around world UP or camera's local Y)
        const yawQuaternion = new THREE.Quaternion();
        // yawQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaYaw * this.freeCameraRotationSpeed); // World Y
        // For FPS style, yaw around camera's local Y:
        const cameraUp = new THREE.Vector3().setFromMatrixColumn(this._cam.matrixWorld, 1);
        yawQuaternion.setFromAxisAngle(cameraUp, deltaYaw * this.freeCameraRotationSpeed);

        // Create a quaternion for pitch (around camera's local X)
        const pitchQuaternion = new THREE.Quaternion();
        const cameraRight = new THREE.Vector3().setFromMatrixColumn(this._cam.matrixWorld, 0);
        pitchQuaternion.setFromAxisAngle(cameraRight, deltaPitch * this.freeCameraRotationSpeed);

        // Combine rotations: apply pitch then yaw to the current direction
        // Or, more directly, rotate the camera itself.
        // Let's rotate the camera's quaternion and then update targetLookAt from it.

        // Apply yaw to camera's quaternion
        this._cam.quaternion.premultiply(yawQuaternion);
        // Apply pitch to camera's quaternion
        this._cam.quaternion.multiply(pitchQuaternion); // Or premultiply, depending on desired order

        // Update targetPosition to camera's current position (as rotation is around camera's eye)
        this.targetPosition.copy(this._cam.position);

        // Update targetLookAt based on new camera orientation
        const newDirection = new THREE.Vector3(0, 0, -1); // Forward vector
        newDirection.applyQuaternion(this._cam.quaternion);
        this.targetLookAt.copy(this.targetPosition).add(newDirection);

        // Clamping pitch:
        // This is more complex as it involves extracting Euler angles, clamping, then converting back.
        // Or, limit the rotation based on the current view direction's angle with the world up vector.
        // For simplicity, initial version might not have strict pitch clamping.
    }
}
