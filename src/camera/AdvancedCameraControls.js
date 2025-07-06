import * as THREE from 'three';
import { gsap } from 'gsap';
import { CAMERA_MODES } from './Camera.js';

export class AdvancedCameraControls {
    space = null;
    camera = null;
    cameraControls = null;
    settings = {
        autoZoom: {
            enabled: false,
            minDistance: 50,
            maxDistance: 2000,
            targetPadding: 1.5,
            transitionDuration: 1.0,
            nodeCountThreshold: 5,
            densityThreshold: 0.3
        },
        rotation: {
            enabled: true,
            speed: 0.005,
            autoRotate: false,
            autoRotateSpeed: 0.02,
            smoothDamping: 0.1,
            maxPolarAngle: Math.PI,
            minPolarAngle: 0
        },
        peekMode: {
            enabled: true,
            peekDistance: 100,
            peekSpeed: 0.8,
            returnDuration: 0.6,
            mouseThreshold: 50,
            cornerDetectionRadius: 150
        },
        cinematic: {
            enableCinematicMode: false,
            cinematicSpeed: 0.3,
            cinematicRadius: 500,
            cinematicHeight: 200,
            followPath: true
        }
    };

    // Auto-zoom state
    autoZoomEnabled = false;
    lastNodeCount = 0;
    lastBoundingBox = null;
    autoZoomTimer = null;

    // Rotation state
    rotationVelocity = new THREE.Vector2();
    targetRotation = new THREE.Vector2();
    currentRotation = new THREE.Vector2();
    autoRotateAngle = 0;

    // Peek mode state
    isPeeking = false;
    peekStartPosition = new THREE.Vector3();
    peekStartTarget = new THREE.Vector3();
    peekDirection = new THREE.Vector3();
    mousePosition = new THREE.Vector2();
    lastMousePosition = new THREE.Vector2();

    // Cinematic mode state
    cinematicMode = false;
    cinematicPath = [];
    cinematicProgress = 0;
    cinematicDirection = 1;

    constructor(space, cameraControls) {
        this.space = space;
        this.cameraControls = cameraControls;
        this.camera = space._cam; // Reverted to _cam
        
        this._initializeEventListeners();
        this._startUpdateLoop();
    }

    _initializeEventListeners() {
        // Mouse move for peek mode
        if (this.space.container) { // Guard against undefined container
            this.space.container.addEventListener('mousemove', this._handleMouseMove.bind(this));
            this.space.container.addEventListener('mouseenter', this._handleMouseEnter.bind(this));
            this.space.container.addEventListener('mouseleave', this._handleMouseLeave.bind(this));
        }

        // Key bindings for advanced controls
        document.addEventListener('keydown', this._handleKeyDown.bind(this));
        document.addEventListener('keyup', this._handleKeyUp.bind(this));

        // Listen for graph changes for auto-zoom
        this.space.on('node:added', this._onGraphChange.bind(this));
        this.space.on('node:removed', this._onGraphChange.bind(this));
        this.space.on('layout:started', this._onLayoutChange.bind(this));
    }

    _handleMouseMove(event) {
        const rect = this.space.container.getBoundingClientRect();
        this.mousePosition.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        if (this.settings.peekMode.enabled) {
            this._updatePeekMode();
        }
    }

    _handleMouseEnter() {
        this.lastMousePosition.copy(this.mousePosition);
    }

    _handleMouseLeave() {
        if (this.isPeeking) {
            this._exitPeekMode();
        }
    }

    _handleKeyDown(event) {
        switch (event.code) {
            case 'KeyR':
                if (event.ctrlKey) {
                    this.toggleAutoRotation();
                    event.preventDefault();
                }
                break;
            case 'KeyZ':
                if (event.ctrlKey) {
                    this.toggleAutoZoom();
                    event.preventDefault();
                }
                break;
            case 'KeyP':
                this.togglePeekMode();
                break;
            case 'KeyC':
                if (event.ctrlKey) {
                    this.toggleCinematicMode();
                    event.preventDefault();
                }
                break;
        }
    }

    _handleKeyUp(event) {
        // Handle key releases if needed
    }

    _onGraphChange() {
        if (this.autoZoomEnabled) {
            clearTimeout(this.autoZoomTimer);
            this.autoZoomTimer = setTimeout(() => {
                this._performAutoZoom();
            }, 1000); // Delay to avoid constant adjustments
        }
    }

    _onLayoutChange() {
        if (this.autoZoomEnabled) {
            setTimeout(() => {
                this._performAutoZoom();
            }, 1500); // Wait for layout to settle
        }
    }

    _startUpdateLoop() {
        const update = () => {
            this._updateRotation();
            this._updateCinematicMode();
            requestAnimationFrame(update);
        };
        update();
    }

    // Auto-zoom functionality
    toggleAutoZoom(enabled = null) {
        this.autoZoomEnabled = enabled !== null ? enabled : !this.autoZoomEnabled;
        
        if (this.autoZoomEnabled) {
            this._performAutoZoom();
        }

        this.space.emit('camera:autoZoomToggled', { enabled: this.autoZoomEnabled });
        return this.autoZoomEnabled;
    }

    _performAutoZoom() {
        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
        const nodes = Array.from(nodePlugin?.getNodes()?.values() || []);
        
        if (nodes.length === 0) return;

        const boundingBox = this._calculateSceneBoundingBox(nodes);
        const optimalDistance = this._calculateOptimalZoomDistance(boundingBox, nodes.length);
        const centerPoint = boundingBox.getCenter(new THREE.Vector3());

        // Smooth transition to optimal view
        this.cameraControls.moveTo(
            centerPoint.x,
            centerPoint.y,
            centerPoint.z + optimalDistance,
            this.settings.autoZoom.transitionDuration,
            centerPoint
        );

        this.lastNodeCount = nodes.length;
        this.lastBoundingBox = boundingBox;
    }

    _calculateSceneBoundingBox(nodes) {
        const box = new THREE.Box3();
        
        nodes.forEach(node => {
            const nodeBox = new THREE.Box3();
            const radius = node.getBoundingSphereRadius?.() || 50;
            const pos = node.position;
            
            nodeBox.setFromCenterAndSize(
                pos,
                new THREE.Vector3(radius * 2, radius * 2, radius * 2)
            );
            
            box.union(nodeBox);
        });

        return box;
    }

    _calculateOptimalZoomDistance(boundingBox, nodeCount) {
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);
        
        // Calculate distance based on camera FOV
        const fov = this.camera.fov * Math.PI / 180;
        const distance = (maxDimension * this.settings.autoZoom.targetPadding) / (2 * Math.tan(fov / 2));
        
        // Adjust based on node count and density
        const densityFactor = Math.min(1.5, nodeCount / 20);
        const adjustedDistance = distance * (1 + densityFactor * 0.3);
        
        return THREE.MathUtils.clamp(
            adjustedDistance,
            this.settings.autoZoom.minDistance,
            this.settings.autoZoom.maxDistance
        );
    }

    // Rotation controls
    toggleAutoRotation(enabled = null) {
        this.settings.rotation.autoRotate = enabled !== null ? enabled : !this.settings.rotation.autoRotate;
        
        if (!this.settings.rotation.autoRotate) {
            this.autoRotateAngle = 0;
        }

        this.space.emit('camera:autoRotationToggled', { enabled: this.settings.rotation.autoRotate });
        return this.settings.rotation.autoRotate;
    }

    setRotationSpeed(speed) {
        this.settings.rotation.autoRotateSpeed = speed;
    }

    _updateRotation() {
        if (this.settings.rotation.autoRotate && this.cameraControls.cameraMode === CAMERA_MODES.ORBIT) {
            this.autoRotateAngle += this.settings.rotation.autoRotateSpeed;
            
            // Apply smooth orbital rotation around the current lookAt target
            const lookAt = this.cameraControls.targetLookAt.clone();
            const currentPos = this.camera.position.clone();
            const radius = currentPos.distanceTo(lookAt);
            
            const newX = lookAt.x + Math.cos(this.autoRotateAngle) * radius;
            const newZ = lookAt.z + Math.sin(this.autoRotateAngle) * radius;
            
            this.cameraControls.targetPosition.set(newX, currentPos.y, newZ);
        }

        // Apply smooth rotation damping
        this.currentRotation.lerp(this.targetRotation, this.settings.rotation.smoothDamping);
    }

    // Peek around corners functionality
    togglePeekMode(enabled = null) {
        this.settings.peekMode.enabled = enabled !== null ? enabled : !this.settings.peekMode.enabled;
        
        if (!this.settings.peekMode.enabled && this.isPeeking) {
            this._exitPeekMode();
        }

        this.space.emit('camera:peekModeToggled', { enabled: this.settings.peekMode.enabled });
        return this.settings.peekMode.enabled;
    }

    _updatePeekMode() {
        if (!this.settings.peekMode.enabled) return;

        const mouseMovement = this.mousePosition.clone().sub(this.lastMousePosition);
        const movementMagnitude = mouseMovement.length();

        // Check if mouse is near screen edges (corners)
        const nearEdge = Math.abs(this.mousePosition.x) > 0.7 || Math.abs(this.mousePosition.y) > 0.7;
        
        if (nearEdge && movementMagnitude > 0.01) {
            if (!this.isPeeking) {
                this._enterPeekMode();
            }
            this._updatePeekDirection();
        } else if (this.isPeeking && !nearEdge) {
            this._exitPeekMode();
        }

        this.lastMousePosition.copy(this.mousePosition);
    }

    _enterPeekMode() {
        this.isPeeking = true;
        if (!this.camera) {
            console.warn('AdvancedCameraControls: Camera not available for peek mode.');
            return;
        }
        this.peekStartPosition.copy(this.camera.position);
        this.peekStartTarget.copy(this.cameraControls.targetLookAt);
        
        this.space.emit('camera:peekModeEntered');
    }

    _exitPeekMode() {
        if (!this.isPeeking) return;
        
        this.isPeeking = false;
        
        // Smooth return to original position
        gsap.to(this.cameraControls.targetPosition, {
            x: this.peekStartPosition.x,
            y: this.peekStartPosition.y,
            z: this.peekStartPosition.z,
            duration: this.settings.peekMode.returnDuration,
            ease: 'power2.out'
        });

        gsap.to(this.cameraControls.targetLookAt, {
            x: this.peekStartTarget.x,
            y: this.peekStartTarget.y,
            z: this.peekStartTarget.z,
            duration: this.settings.peekMode.returnDuration,
            ease: 'power2.out'
        });

        this.space.emit('camera:peekModeExited');
    }

    _updatePeekDirection() {
        if (!this.isPeeking) return;

        if (!this.camera) {
            console.warn('AdvancedCameraControls: Camera not available for peek direction update.');
            return;
        }

        // Calculate peek direction based on mouse position
        const peekVector = new THREE.Vector3(
            this.mousePosition.x * this.settings.peekMode.peekDistance,
            this.mousePosition.y * this.settings.peekMode.peekDistance * 0.5, // Reduce vertical peek
            0
        );

        // Apply camera rotation to peek vector
        const cameraQuaternion = this.camera.quaternion.clone();
        peekVector.applyQuaternion(cameraQuaternion);

        // Update target positions
        gsap.to(this.cameraControls.targetPosition, {
            x: this.peekStartPosition.x + peekVector.x,
            y: this.peekStartPosition.y + peekVector.y,
            z: this.peekStartPosition.z + peekVector.z,
            duration: this.settings.peekMode.peekSpeed,
            ease: 'power2.out'
        });
    }

    // Cinematic mode
    toggleCinematicMode(enabled = null) {
        this.cinematicMode = enabled !== null ? enabled : !this.cinematicMode;
        
        if (this.cinematicMode) {
            this._startCinematicMode();
        } else {
            this._stopCinematicMode();
        }

        this.space.emit('camera:cinematicModeToggled', { enabled: this.cinematicMode });
        return this.cinematicMode;
    }

    _startCinematicMode() {
        this._generateCinematicPath();
        this.cinematicProgress = 0;
        this.cinematicDirection = 1;
    }

    _stopCinematicMode() {
        this.cinematicPath = [];
        this.cinematicProgress = 0;
    }

    _generateCinematicPath() {
        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
        const nodes = Array.from(nodePlugin?.getNodes()?.values() || []);
        
        if (nodes.length === 0) return;

        const center = new THREE.Vector3();
        nodes.forEach(node => center.add(node.position));
        center.divideScalar(nodes.length);

        const radius = this.settings.cinematic.cinematicRadius;
        const height = this.settings.cinematic.cinematicHeight;
        const points = 32;

        this.cinematicPath = [];
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const x = center.x + Math.cos(angle) * radius;
            const z = center.z + Math.sin(angle) * radius;
            const y = center.y + height + Math.sin(angle * 2) * 50; // Wave motion
            
            this.cinematicPath.push({
                position: new THREE.Vector3(x, y, z),
                lookAt: center.clone()
            });
        }
    }

    _updateCinematicMode() {
        if (!this.cinematicMode || this.cinematicPath.length === 0) return;

        this.cinematicProgress += this.settings.cinematic.cinematicSpeed * this.cinematicDirection * 0.01;
        
        // Ping-pong motion
        if (this.cinematicProgress >= 1) {
            this.cinematicProgress = 1;
            this.cinematicDirection = -1;
        } else if (this.cinematicProgress <= 0) {
            this.cinematicProgress = 0;
            this.cinematicDirection = 1;
        }

        // Interpolate along the path
        const pathIndex = this.cinematicProgress * (this.cinematicPath.length - 1);
        const index1 = Math.floor(pathIndex);
        const index2 = Math.min(index1 + 1, this.cinematicPath.length - 1);
        const t = pathIndex - index1;

        const point1 = this.cinematicPath[index1];
        const point2 = this.cinematicPath[index2];

        if (point1 && point2) {
            const currentPos = point1.position.clone().lerp(point2.position, t);
            const currentLookAt = point1.lookAt.clone().lerp(point2.lookAt, t);

            this.cameraControls.targetPosition.copy(currentPos);
            this.cameraControls.targetLookAt.copy(currentLookAt);
        }
    }

    // Smart focus with context awareness
    smartFocusOnNode(node, options = {}) {
        const {
            considerNeighbors = true,
            includeEdges = true,
            transitionDuration = 1.0,
            contextRadius = 200
        } = options;

        if (!node) return;
        if (!node.position) {
            console.warn('AdvancedCameraControls.smartFocusOnNode: node.position is undefined for the primary node.');
            return;
        }

        let focusArea = new THREE.Box3();
        focusArea.setFromCenterAndSize(node.position, new THREE.Vector3(100, 100, 100));

        if (considerNeighbors) {
            // Find connected nodes
            const edgePlugin = this.space.plugins.getPlugin('EdgePlugin');
            const edges = Array.from(edgePlugin?.getEdges()?.values() || []);
            
            const connectedNodes = new Set([node]);
            edges.forEach(edge => {
                if (edge.source === node && edge.target.position.distanceTo(node.position) < contextRadius) {
                    connectedNodes.add(edge.target);
                }
                if (edge.target === node && edge.source.position.distanceTo(node.position) < contextRadius) {
                    connectedNodes.add(edge.source);
                }
            });

            // Expand focus area to include connected nodes
            connectedNodes.forEach(connectedNode => {
                if (!connectedNode.position) {
                    console.warn('AdvancedCameraControls.smartFocusOnNode: connectedNode.position is undefined for a connected node.');
                    return; // Changed from continue to return to match typical forEach behavior expectation, though 'continue' is more accurate for loop context
                }
                const nodeBox = new THREE.Box3();
                const radius = connectedNode.getBoundingSphereRadius?.() || 50;
                nodeBox.setFromCenterAndSize(connectedNode.position, new THREE.Vector3(radius * 2, radius * 2, radius * 2));
                focusArea.union(nodeBox);
            });
        }

        const center = focusArea.getCenter(new THREE.Vector3());
        const size = focusArea.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);
        
        const fov = this.camera.fov * Math.PI / 180;
        const distance = (maxDimension * 1.5) / (2 * Math.tan(fov / 2));

        this.cameraControls.moveTo(
            center.x,
            center.y,
            center.z + Math.max(distance, 150),
            transitionDuration,
            center
        );
    }

    // Advanced view management
    createViewSequence(nodes, options = {}) {
        const {
            duration = 2.0,
            pause = 1.0,
            includeOverview = true,
            smoothTransitions = true
        } = options;

        const sequence = [];

        if (includeOverview) {
            sequence.push(() => this._performAutoZoom());
        }

        nodes.forEach((node, index) => {
            sequence.push(() => {
                this.smartFocusOnNode(node, {
                    transitionDuration: smoothTransitions ? duration : 0,
                    considerNeighbors: true
                });
            });
        });

        return this._executeViewSequence(sequence, pause);
    }

    async _executeViewSequence(sequence, pause) {
        for (let i = 0; i < sequence.length; i++) {
            await sequence[i]();
            if (i < sequence.length - 1) {
                await new Promise(resolve => setTimeout(resolve, pause * 1000));
            }
        }
    }

    // Configuration
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    getSettings() {
        return { ...this.settings };
    }

    // Status getters
    isAutoZoomEnabled() {
        return this.autoZoomEnabled;
    }

    isAutoRotating() {
        return this.settings.rotation.autoRotate;
    }

    isPeekModeEnabled() {
        return this.settings.peekMode.enabled;
    }

    isCinematicModeActive() {
        return this.cinematicMode;
    }

    dispose() {
        clearTimeout(this.autoZoomTimer);
        
        // Remove event listeners
        this.space.container.removeEventListener('mousemove', this._handleMouseMove.bind(this));
        this.space.container.removeEventListener('mouseenter', this._handleMouseEnter.bind(this));
        this.space.container.removeEventListener('mouseleave', this._handleMouseLeave.bind(this));
        document.removeEventListener('keydown', this._handleKeyDown.bind(this));
        document.removeEventListener('keyup', this._handleKeyUp.bind(this));

        // Clean up state
        this.space = null;
        this.camera = null;
        this.cameraControls = null;
    }
}