import * as THREE from 'three';
import { gsap } from 'gsap';
import { Utils } from '../utils.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const DEFAULT_CAMERA_DAMPING_FACTOR = 0.12;
const DEFAULT_FREE_CAMERA_SPEED = 250.0;
const DEFAULT_FREE_CAMERA_VERTICAL_SPEED = 180.0;
const ZOOM_BASE_FACTOR = 0.95;
const WHEEL_DELTA_SENSITIVITY = 0.025;

const CAMERA_MODES = {
    ORBIT: 'orbit',
    FREE: 'free',
    TOP_DOWN: 'top_down',
    FIRST_PERSON: 'first_person',
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

    viewHistory = [];
    maxHistory = 20;
    currentTargetNodeId = null;

    initialState = null;

    zoomSpeed = 1.0;
    panSpeed = 0.8;
    minZoomDistance = 10;
    maxZoomDistance = 15000;
    dampingFactor = DEFAULT_CAMERA_DAMPING_FACTOR;

    animationFrameId = null;

    namedViews = new Map();

    cameraMode = CAMERA_MODES.ORBIT;
    freeCameraSpeed = DEFAULT_FREE_CAMERA_SPEED;
    freeCameraVerticalSpeed = DEFAULT_FREE_CAMERA_VERTICAL_SPEED;
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
            Object.keys(this.moveState).forEach((key) => (this.moveState[key] = false));
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
            mode: this.cameraMode,
        };
    }

    startPan(startX, startY) {
        if ((this.cameraMode !== CAMERA_MODES.ORBIT && this.cameraMode !== CAMERA_MODES.TOP_DOWN) || this.isPanning)
            return;
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
        if ((this.cameraMode !== CAMERA_MODES.ORBIT && this.cameraMode !== CAMERA_MODES.TOP_DOWN) || !this.isPanning)
            return;

        const cameraDist = this.currentPosition.distanceTo(this.currentLookAt);
        const vFOV = this._cam.fov * Utils.DEG2RAD;
        const viewHeight = this.domElement.clientHeight || window.innerHeight;
        const visibleHeight = 2 * Math.tan(vFOV / 2) * Math.max(1, cameraDist);
        const worldUnitsPerPixel = visibleHeight / viewHeight;

        let panOffset;
        if (this.cameraMode === CAMERA_MODES.TOP_DOWN) {
            panOffset = new THREE.Vector3(
                -deltaX * worldUnitsPerPixel * this.panSpeed,
                0,
                deltaY * worldUnitsPerPixel * this.panSpeed
            );
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

        const zoomFactor = Math.pow(ZOOM_BASE_FACTOR, deltaY * WHEEL_DELTA_SENSITIVITY * this.zoomSpeed);

        // Access pointer state from UIManager for zoom-to-cursor
        const pointerX = this.space.uiManager?.pointerState?.clientX;
        const pointerY = this.space.uiManager?.pointerState?.clientY;

        if (this.cameraMode === CAMERA_MODES.TOP_DOWN) {
            const currentY = this.targetPosition.y;
            let newY = currentY * zoomFactor;
            newY = Utils.clamp(newY, this.minZoomDistance, this.maxZoomDistance);
            const actualZoomRatio = newY / (currentY || 1); // Avoid division by zero if currentY is 0

            if (
                pointerX !== undefined &&
                pointerY !== undefined &&
                this.space.getPointerNDC &&
                this.space.screenToWorld
            ) {
                const pWorldPlane = this.space.screenToWorld(pointerX, pointerY, 0); // Project to Y=0 plane

                if (pWorldPlane) {
                    this.targetPosition.x = pWorldPlane.x - (pWorldPlane.x - this.targetPosition.x) * actualZoomRatio;
                    this.targetPosition.z = pWorldPlane.z - (pWorldPlane.z - this.targetPosition.z) * actualZoomRatio;
                }
            }
            this.targetPosition.y = newY;
            // targetLookAt is derived from targetPosition in the update loop for TOP_DOWN
        } else if (this.cameraMode === CAMERA_MODES.ORBIT) {
            let pWorld = null;
            if (pointerX !== undefined && pointerY !== undefined && this.space.getPointerNDC) {
                const pointerNDC = this.space.getPointerNDC(pointerX, pointerY); // Mouse NDCs
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(pointerNDC, this._cam); // Ray from camera through mouse

                // Define a plane through targetLookAt, facing the camera. This is our "focal plane".
                const viewDirection = new THREE.Vector3()
                    .subVectors(this.targetPosition, this.targetLookAt)
                    .normalize();
                const planeAtLookAt = new THREE.Plane().setFromNormalAndCoplanarPoint(viewDirection, this.targetLookAt);

                pWorld = new THREE.Vector3(); // This will be the world point under the cursor on the focal plane
                if (!raycaster.ray.intersectPlane(planeAtLookAt, pWorld)) {
                    // Fallback if ray doesn't hit focal plane (e.g., if plane is behind camera or parallel).
                    // Using targetLookAt itself means zooming towards the current look-at point (center zoom).
                    pWorld.copy(this.targetLookAt);
                }
            } else {
                // Fallback to center zoom if pointer info (mouse coords) is not available.
                pWorld = this.targetLookAt.clone();
            }

            // Zoom-to-cursor math:
            // The goal is to move the camera and its look-at point such that `pWorld` (the point under the cursor)
            // effectively stays under the cursor after zoom.
            // C_new = C_old + (P_world - C_old) * (1 - zoomFactor)
            // L_new = L_old + (P_world - L_old) * (1 - zoomFactor)
            // Where zoomFactor < 1 means zooming in, > 1 means zooming out.

            // Adjust camera's target position
            const offsetFromCamToPWorld = new THREE.Vector3().subVectors(pWorld, this.targetPosition);
            this.targetPosition.addScaledVector(offsetFromCamToPWorld, 1 - zoomFactor);

            // Adjust camera's look-at point
            const offsetFromLookAtToPWorld = new THREE.Vector3().subVectors(pWorld, this.targetLookAt);
            this.targetLookAt.addScaledVector(offsetFromLookAtToPWorld, 1 - zoomFactor);

            // After adjusting, ensure the distance constraints (min/max zoom) are still met.
            // This recalculates the camera position based on the (potentially new) lookAt and clamped distance.
            const finalOffset = new THREE.Vector3().subVectors(this.targetPosition, this.targetLookAt);
            let finalDist = finalOffset.length();
            finalDist = Utils.clamp(finalDist, this.minZoomDistance, this.maxZoomDistance);
            this.targetPosition.copy(this.targetLookAt).addScaledVector(finalOffset.normalize(), finalDist);
        } else {
            // Fallback for other modes or if conditions not met
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

        const onComplete = () => {
            this._isManuallyControlled = false;
        };

        gsap.to(this.targetPosition, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            duration,
            ease: 'power3.out',
            overwrite: true,
        });
        gsap.to(this.targetLookAt, {
            x: targetLook.x,
            y: targetLook.y,
            z: targetLook.z,
            duration,
            ease: 'power3.out',
            overwrite: true,
            onComplete,
        });

        if (newCameraMode && newCameraMode !== this.cameraMode) this.setCameraMode(newCameraMode, true);
    }

    resetView(duration = 0.7) {
        this.initialState
            ? this.moveTo(
                  this.initialState.position.x,
                  this.initialState.position.y,
                  this.initialState.position.z,
                  duration,
                  this.initialState.lookAt,
                  this.initialState.mode || CAMERA_MODES.ORBIT
              )
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
            ? this.moveTo(
                  prevState.position.x,
                  prevState.position.y,
                  prevState.position.z,
                  duration,
                  prevState.lookAt,
                  prevState.mode
              )
            : this.resetView(duration);
        this.currentTargetNodeId = prevState?.targetNodeId || null;
    }

    getCurrentTargetNodeId = () => this.currentTargetNodeId;
    setCurrentTargetNodeId = (nodeId) => {
        this.currentTargetNodeId = nodeId;
    };

    _startUpdateLoop = () => {
        this.animationFrameId = requestAnimationFrame(this._updateCameraLogic);
    };

    _updateCameraLogic = () => {
        const time = performance.now();
        const delta = (time - this.prevTime) / 1000;
        this.prevTime = time;

        let needsLerp = true;

        if (
            (this.cameraMode === CAMERA_MODES.FREE || this.cameraMode === CAMERA_MODES.FIRST_PERSON) &&
            this.isPointerLocked
        ) {
            const moveSpeed = this.freeCameraSpeed * delta;
            const verticalMoveSpeed = this.freeCameraVerticalSpeed * delta;
            let moved = false;

            if (this.moveState.forward) {
                this.pointerLockControls.moveForward(moveSpeed);
                moved = true;
            }
            if (this.moveState.backward) {
                this.pointerLockControls.moveForward(-moveSpeed);
                moved = true;
            }
            if (this.moveState.left) {
                this.pointerLockControls.moveRight(-moveSpeed);
                moved = true;
            }
            if (this.moveState.right) {
                this.pointerLockControls.moveRight(moveSpeed);
                moved = true;
            }

            if (this.cameraMode === CAMERA_MODES.FREE) {
                if (this.moveState.up) {
                    this._cam.position.y += verticalMoveSpeed;
                    moved = true;
                }
                if (this.moveState.down) {
                    this._cam.position.y -= verticalMoveSpeed;
                    moved = true;
                }
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
            if (
                this.currentPosition.distanceTo(this.targetPosition) < epsilon &&
                this.currentLookAt.distanceTo(this.targetLookAt) < epsilon
            ) {
                this.currentPosition.copy(this.targetPosition);
                this.currentLookAt.copy(this.targetLookAt);
            }
            needsLerp = false;
        }

        if (this.isFollowing && this.followTargetObject && !this._isManuallyControlled) {
            const targetActualPosition = this.followTargetObject.isVector3
                ? this.followTargetObject
                : this.followTargetObject.position;
            if (targetActualPosition) {
                const desiredLookAt = targetActualPosition.clone().add(this.followOptions.offset);
                this.targetLookAt.lerp(desiredLookAt, this.followOptions.damping);

                const directionToTarget = new THREE.Vector3()
                    .subVectors(this.currentPosition, this.targetLookAt)
                    .normalize();
                const desiredCamPos = this.targetLookAt
                    .clone()
                    .addScaledVector(directionToTarget, this.followOptions.distance);
                this.targetPosition.lerp(desiredCamPos, this.followOptions.damping);
                needsLerp = true;
            }
        }

        if (needsLerp) {
            const epsilon = 0.001;
            this.currentPosition.lerp(this.targetPosition, this.dampingFactor);
            this.currentLookAt.lerp(this.targetLookAt, this.dampingFactor);

            if (this.currentPosition.distanceTo(this.targetPosition) <= epsilon)
                this.currentPosition.copy(this.targetPosition);
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
        } catch {
            // console.error('Camera: Error loading named views:');
        }
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
        } catch {
            // console.error('Camera: Error saving named views:');
        }
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
            // console.warn(`Camera: Unknown mode "${mode}" requested.`);
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
            case CAMERA_MODES.ORBIT: {
                this.domElement.style.cursor = 'grab';
                break;
            }
            case CAMERA_MODES.FREE: {
                this.domElement.style.cursor = 'crosshair';
                this.targetPosition.copy(this.currentPosition);
                const lookDirectionFree = new THREE.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
                this.targetLookAt.copy(this.currentPosition).add(lookDirectionFree);
                break;
            }
            case CAMERA_MODES.TOP_DOWN: {
                this.domElement.style.cursor = 'move';
                const height =
                    this.currentPosition.y > this.minZoomDistance
                        ? this.currentPosition.y
                        : Math.max(this.minZoomDistance, 500);
                this.targetPosition.set(this.currentLookAt.x, height, this.currentLookAt.z);
                this.targetLookAt.set(this.currentLookAt.x, 0, this.currentLookAt.z);
                break;
            }
            case CAMERA_MODES.FIRST_PERSON: {
                this.domElement.style.cursor = 'crosshair';
                this.targetPosition.copy(this.currentPosition);
                const lookDirectionFPS = new THREE.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
                this.targetLookAt.copy(this.currentPosition).add(lookDirectionFPS);
                break;
            }
        }
        this.space.emit('camera:modeChanged', { newMode: this.cameraMode, oldMode });
        setTimeout(() => (this._isManuallyControlled = false), 50);
    }
}
