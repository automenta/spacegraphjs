export class AdvancedCameraControls {
    constructor(space: any, cameraControls: any);
    space: any;
    camera: any;
    cameraControls: any;
    settings: {
        autoZoom: {
            enabled: boolean;
            minDistance: number;
            maxDistance: number;
            targetPadding: number;
            transitionDuration: number;
            nodeCountThreshold: number;
            densityThreshold: number;
        };
        rotation: {
            enabled: boolean;
            speed: number;
            autoRotate: boolean;
            autoRotateSpeed: number;
            smoothDamping: number;
            maxPolarAngle: number;
            minPolarAngle: number;
        };
        peekMode: {
            enabled: boolean;
            peekDistance: number;
            peekSpeed: number;
            returnDuration: number;
            mouseThreshold: number;
            cornerDetectionRadius: number;
        };
        cinematic: {
            enableCinematicMode: boolean;
            cinematicSpeed: number;
            cinematicRadius: number;
            cinematicHeight: number;
            followPath: boolean;
        };
    };
    autoZoomEnabled: boolean;
    lastNodeCount: number;
    lastBoundingBox: any;
    autoZoomTimer: any;
    rotationVelocity: any;
    targetRotation: any;
    currentRotation: any;
    autoRotateAngle: number;
    isPeeking: boolean;
    peekStartPosition: any;
    peekStartTarget: any;
    peekDirection: any;
    mousePosition: any;
    lastMousePosition: any;
    cinematicMode: boolean;
    cinematicPath: any[];
    cinematicProgress: number;
    cinematicDirection: number;
    _initializeEventListeners(): void;
    _handleMouseMove(event: any): void;
    _handleMouseEnter(): void;
    _handleMouseLeave(): void;
    _handleKeyDown(event: any): void;
    _handleKeyUp(event: any): void;
    _onGraphChange(): void;
    _onLayoutChange(): void;
    _startUpdateLoop(): void;
    toggleAutoZoom(enabled?: any): boolean;
    _performAutoZoom(): void;
    _calculateSceneBoundingBox(nodes: any): any;
    _calculateOptimalZoomDistance(boundingBox: any, nodeCount: any): any;
    toggleAutoRotation(enabled?: any): boolean;
    setRotationSpeed(speed: any): void;
    _updateRotation(): void;
    togglePeekMode(enabled?: any): boolean;
    _updatePeekMode(): void;
    _enterPeekMode(): void;
    _exitPeekMode(): void;
    _updatePeekDirection(): void;
    toggleCinematicMode(enabled?: any): boolean;
    _startCinematicMode(): void;
    _stopCinematicMode(): void;
    _generateCinematicPath(): void;
    _updateCinematicMode(): void;
    smartFocusOnNode(node: any, options?: {}): void;
    createViewSequence(nodes: any, options?: {}): Promise<void>;
    _executeViewSequence(sequence: any, pause: any): Promise<void>;
    updateSettings(newSettings: any): void;
    getSettings(): {
        autoZoom: {
            enabled: boolean;
            minDistance: number;
            maxDistance: number;
            targetPadding: number;
            transitionDuration: number;
            nodeCountThreshold: number;
            densityThreshold: number;
        };
        rotation: {
            enabled: boolean;
            speed: number;
            autoRotate: boolean;
            autoRotateSpeed: number;
            smoothDamping: number;
            maxPolarAngle: number;
            minPolarAngle: number;
        };
        peekMode: {
            enabled: boolean;
            peekDistance: number;
            peekSpeed: number;
            returnDuration: number;
            mouseThreshold: number;
            cornerDetectionRadius: number;
        };
        cinematic: {
            enableCinematicMode: boolean;
            cinematicSpeed: number;
            cinematicRadius: number;
            cinematicHeight: number;
            followPath: boolean;
        };
    };
    isAutoZoomEnabled(): boolean;
    isAutoRotating(): boolean;
    isPeekModeEnabled(): boolean;
    isCinematicModeActive(): boolean;
    dispose(): void;
}
