import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * FractalZoomManager provides infinite zoom capabilities with level-of-detail management.
 * This is the core component for implementing a true ZUI (Zooming User Interface).
 */
export class FractalZoomManager {
    constructor(spaceGraph) {
        this.space = spaceGraph;
        this.cameraPlugin = null;
        
        // Zoom state management
        this.currentZoomLevel = 0; // 0 = default zoom, positive = zoom in, negative = zoom out
        this.targetZoomLevel = 0;
        this.zoomTransitionTween = null;
        
        // LOD configuration
        this.lodLevels = new Map(); // zoomLevel -> LODConfiguration
        this.zoomThresholds = [];   // Array of zoom thresholds for LOD switching
        this.contentAdapters = new Map(); // nodeId -> ContentAdapter
        
        // Fractal parameters
        this.zoomStep = 0.5;        // How much each zoom step changes the level
        this.maxZoomIn = 20;        // Maximum zoom in level
        this.maxZoomOut = -10;      // Maximum zoom out level
        this.transitionDuration = 0.8; // Smooth transition duration
        
        // Performance settings
        this.lodUpdateThreshold = 0.1; // Minimum zoom change to trigger LOD update
        this.memoryBudget = 100; // Maximum number of LOD variants to keep in memory
        
        // Event handling
        this.isTransitioning = false;
        
        this._initializeLODLevels();
        this._bindEvents();
    }

    /**
     * Unregister a content adapter for a specific node
     */
    unregisterContentAdapter(nodeId) {
        if (this.contentAdapters.has(nodeId)) {
            this.contentAdapters.delete(nodeId);
            // console.log(`FractalZoomManager: Content adapter for node ${nodeId} unregistered.`);
        }
    }

    /**
     * Initialize default LOD levels with different detail configurations
     */
    _initializeLODLevels() {
        // Define zoom thresholds and corresponding LOD configurations
        const lodConfigurations = [
            {
                zoomLevel: -5,
                name: 'overview',
                nodeDetailLevel: 'minimal',
                edgeDetailLevel: 'none',
                labelsVisible: false,
                textScale: 0.5,
                geometryQuality: 'low'
            },
            {
                zoomLevel: -2,
                name: 'distant',
                nodeDetailLevel: 'low',
                edgeDetailLevel: 'low',
                labelsVisible: false,
                textScale: 0.7,
                geometryQuality: 'low'
            },
            {
                zoomLevel: 0,
                name: 'normal',
                nodeDetailLevel: 'medium',
                edgeDetailLevel: 'medium',
                labelsVisible: true,
                textScale: 1.0,
                geometryQuality: 'medium'
            },
            {
                zoomLevel: 3,
                name: 'detailed',
                nodeDetailLevel: 'high',
                edgeDetailLevel: 'high',
                labelsVisible: true,
                textScale: 1.2,
                geometryQuality: 'high'
            },
            {
                zoomLevel: 6,
                name: 'micro',
                nodeDetailLevel: 'ultra',
                edgeDetailLevel: 'ultra',
                labelsVisible: true,
                textScale: 1.5,
                geometryQuality: 'ultra'
            }
        ];

        lodConfigurations.forEach(config => {
            this.lodLevels.set(config.zoomLevel, config);
            this.zoomThresholds.push(config.zoomLevel);
        });
        
        this.zoomThresholds.sort((a, b) => a - b);
    }

    /**
     * Bind event listeners for zoom interactions
     */
    _bindEvents() {
        this.space.on('ui:request:zoomCamera', this._onZoomRequest.bind(this));
        this.space.on('ui:request:setZoomLevel', this._onSetZoomLevel.bind(this));
        this.space.on('camera:changed', this._onCameraChanged.bind(this));
    }

    /**
     * Initialize with camera plugin reference
     */
    init(cameraPlugin) {
        this.cameraPlugin = cameraPlugin;
        this._updateLOD();
    }

    /**
     * Handle zoom requests from UI interactions
     */
    _onZoomRequest(deltaY) {
        const zoomDirection = deltaY > 0 ? -1 : 1;
        const newZoomLevel = Math.max(
            this.maxZoomOut,
            Math.min(this.maxZoomIn, this.currentZoomLevel + zoomDirection * this.zoomStep)
        );
        
        this.zoomToLevel(newZoomLevel);
    }

    /**
     * Handle direct zoom level setting
     */
    _onSetZoomLevel(zoomLevel) {
        this.zoomToLevel(zoomLevel);
    }

    /**
     * Handle camera changes that might affect zoom level
     */
    _onCameraChanged(data) {
        if (!this.isTransitioning && data.source !== 'fractal-zoom') {
            // Update zoom level based on camera distance
            this._calculateZoomLevelFromCamera();
        }
    }

    /**
     * Calculate current zoom level based on camera distance
     */
    _calculateZoomLevelFromCamera() {
        if (!this.cameraPlugin) return;
        
        const camera = this.cameraPlugin.getCameraInstance();
        if (!camera) return;
        
        // Calculate zoom level based on camera distance to origin
        const distance = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
        const baseDistance = 1000; // Reference distance for zoom level 0
        
        const calculatedZoomLevel = -Math.log2(distance / baseDistance);
        
        // Only update if the change is significant
        if (Math.abs(calculatedZoomLevel - this.currentZoomLevel) > this.lodUpdateThreshold) {
            this.currentZoomLevel = calculatedZoomLevel;
            this._updateLOD();
        }
    }

    /**
     * Zoom to a specific level with smooth transition
     */
    zoomToLevel(targetLevel, duration = this.transitionDuration) {
        targetLevel = Math.max(this.maxZoomOut, Math.min(this.maxZoomIn, targetLevel));
        
        if (Math.abs(targetLevel - this.currentZoomLevel) < 0.01) return;
        
        const oldLevelForEvent = this.currentZoomLevel; // Capture old level before tween starts
        this.targetZoomLevel = targetLevel;
        this.isTransitioning = true;
        
        // Cancel any existing transition
        if (this.zoomTransitionTween) {
            this.zoomTransitionTween.kill();
        }
        
        // Create smooth zoom transition
        this.zoomTransitionTween = gsap.to(this, {
            currentZoomLevel: targetLevel,
            duration: duration,
            ease: "power2.inOut",
            onUpdate: () => {
                this._updateCameraForZoomLevel();
                this._updateLOD();
            },
            onComplete: () => {
                this.isTransitioning = false;
                this.space.emit('fractal-zoom:levelChanged', {
                    oldLevel: oldLevelForEvent, // Use the captured old level
                    newLevel: targetLevel,
                    lodConfig: this.getCurrentLODConfig()
                });
            }
        });
    }

    /**
     * Update camera position based on current zoom level
     */
    _updateCameraForZoomLevel() {
        if (!this.cameraPlugin) return;
        
        const camera = this.cameraPlugin.getCameraInstance();
        if (!camera) return;
        
        // Calculate target distance based on zoom level
        const baseDistance = 1000;
        const targetDistance = baseDistance / Math.pow(2, this.currentZoomLevel);
        
        // Maintain camera direction while adjusting distance
        const direction = camera.position.clone().normalize();
        const newPosition = direction.multiplyScalar(targetDistance);
        
        camera.position.copy(newPosition);
        this.space.emit('camera:changed', { source: 'fractal-zoom' });
    }

    /**
     * Update level-of-detail for all graph elements
     */
    _updateLOD() {
        const lodConfig = this.getCurrentLODConfig();
        
        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
        const nodes = nodePlugin?.getNodes();
        if (nodes) {
            nodes.forEach(node => {
                if (node && node.position) {
                    this._updateNodeLOD(node, lodConfig);
                } else {
                    // console.warn('FractalZoomManager: Attempted to update LOD for a node without a position or undefined node:', node);
                }
            });
        }
        
        const edgePlugin = this.space.plugins.getPlugin('EdgePlugin');
        const edges = edgePlugin?.getEdges();
        if (edges) {
            edges.forEach(edge => {
                if (edge && edge.source && edge.source.position && edge.target && edge.target.position) {
                    this._updateEdgeLOD(edge, lodConfig);
                } else {
                    // console.warn('FractalZoomManager: Attempted to update LOD for an edge with missing source/target or positions:', edge);
                }
            });
        }
        
        this.space.emit('fractal-zoom:lodUpdated', { lodConfig, zoomLevel: this.currentZoomLevel });
    }

    /**
     * Get current LOD configuration based on zoom level
     */
    getCurrentLODConfig() {
        // Find the appropriate LOD configuration for current zoom level
        let activeConfig = this.lodLevels.get(0); // Default to normal level
        
        for (let i = this.zoomThresholds.length - 1; i >= 0; i--) {
            const threshold = this.zoomThresholds[i];
            if (this.currentZoomLevel >= threshold) {
                activeConfig = this.lodLevels.get(threshold);
                break;
            }
        }
        
        return activeConfig;
    }

    /**
     * Update LOD for a specific node
     */
    _updateNodeLOD(node, lodConfig) {
        if (!node || !lodConfig) return;
        
        // Update node visibility and detail level
        if (node.object3d) {
            // Scale node based on zoom level and LOD
            const scaleMultiplier = this._calculateScaleMultiplier(lodConfig);
            node.object3d.scale.setScalar(scaleMultiplier);
            
            // Update node detail level
            if (node.setDetailLevel) {
                node.setDetailLevel(lodConfig.nodeDetailLevel);
            }
        }
        
        // Update HTML node content scale
        if (node.htmlElement && lodConfig.textScale !== undefined) {
            const content = node.htmlElement.querySelector('.node-content');
            if (content) {
                content.style.transform = `scale(${lodConfig.textScale})`;
                content.style.transformOrigin = 'top left';
            }
        }
        
        // Update label visibility
        if (node.labelObject) {
            node.labelObject.visible = lodConfig.labelsVisible;
        }
    }

    /**
     * Update LOD for a specific edge
     */
    _updateEdgeLOD(edge, lodConfig) {
        if (!edge || !lodConfig) return;
        
        // Update edge visibility and detail level
        if (edge.line) {
            const material = edge.line.material;
            
            // Adjust line width based on detail level
            const lineWidthMultiplier = this._getLineWidthMultiplier(lodConfig.edgeDetailLevel);
            if (material.linewidth !== undefined) {
                material.linewidth = lineWidthMultiplier;
            }
            
            // Adjust opacity based on detail level
            const opacityMultiplier = this._getOpacityMultiplier(lodConfig.edgeDetailLevel);
            material.opacity = Math.min(1.0, material.opacity * opacityMultiplier);
            
            // Show/hide edge based on detail level
            edge.line.visible = lodConfig.edgeDetailLevel !== 'none';
        }
        
        // Update edge labels
        if (edge.labelObject) {
            edge.labelObject.visible = lodConfig.labelsVisible && lodConfig.edgeDetailLevel !== 'none';
        }
    }

    /**
     * Calculate scale multiplier for current LOD
     */
    _calculateScaleMultiplier(lodConfig) {
        const baseScale = 1.0;
        const zoomScale = Math.pow(1.1, this.currentZoomLevel * 0.5);
        
        let detailMultiplier = 1.0;
        switch (lodConfig.nodeDetailLevel) {
            case 'minimal': detailMultiplier = 0.5; break;
            case 'low': detailMultiplier = 0.7; break;
            case 'medium': detailMultiplier = 1.0; break;
            case 'high': detailMultiplier = 1.3; break;
            case 'ultra': detailMultiplier = 1.6; break;
        }
        
        return baseScale * zoomScale * detailMultiplier;
    }

    /**
     * Get line width multiplier for edge detail level
     */
    _getLineWidthMultiplier(detailLevel) {
        switch (detailLevel) {
            case 'none': return 0;
            case 'low': return 0.5;
            case 'medium': return 1.0;
            case 'high': return 1.5;
            case 'ultra': return 2.0;
            default: return 1.0;
        }
    }

    /**
     * Get opacity multiplier for edge detail level
     */
    _getOpacityMultiplier(detailLevel) {
        switch (detailLevel) {
            case 'none': return 0;
            case 'low': return 0.3;
            case 'medium': return 0.7;
            case 'high': return 1.0;
            case 'ultra': return 1.0;
            default: return 0.7;
        }
    }

    /**
     * Add custom LOD configuration
     */
    addLODLevel(zoomLevel, config) {
        this.lodLevels.set(zoomLevel, config);
        
        // Update thresholds array
        if (!this.zoomThresholds.includes(zoomLevel)) {
            this.zoomThresholds.push(zoomLevel);
            this.zoomThresholds.sort((a, b) => a - b);
        }
    }

    /**
     * Register a content adapter for a specific node
     */
    registerContentAdapter(nodeId, adapter) {
        this.contentAdapters.set(nodeId, adapter);
    }

    /**
     * Apply content adapters for current zoom level
     */
    _applyContentAdapters() {
        const lodConfig = this.getCurrentLODConfig();
        
        this.contentAdapters.forEach((adapter, nodeId) => {
            const node = this.space.getNodeById(nodeId);
            if (node && adapter.adapt) {
                adapter.adapt(node, lodConfig, this.currentZoomLevel);
            }
        });
    }

    /**
     * Get current zoom level
     */
    getZoomLevel() {
        return this.currentZoomLevel;
    }

    /**
     * Get zoom range
     */
    getZoomRange() {
        return {
            min: this.maxZoomOut,
            max: this.maxZoomIn,
            current: this.currentZoomLevel,
            target: this.targetZoomLevel
        };
    }

    /**
     * Reset zoom to default level
     */
    resetZoom(duration = this.transitionDuration) {
        this.zoomToLevel(0, duration);
    }

    /**
     * Zoom in by one step
     */
    zoomIn() {
        this.zoomToLevel(this.currentZoomLevel + this.zoomStep);
    }

    /**
     * Zoom out by one step
     */
    zoomOut() {
        this.zoomToLevel(this.currentZoomLevel - this.zoomStep);
    }

    /**
     * Check if currently transitioning
     */
    isTransitioningZoom() {
        return this.isTransitioning;
    }

    /**
     * Dispose of the fractal zoom manager
     */
    dispose() {
        if (this.zoomTransitionTween) {
            this.zoomTransitionTween.kill();
        }
        
        this.space.off('ui:request:zoomCamera', this._onZoomRequest.bind(this));
        this.space.off('ui:request:setZoomLevel', this._onSetZoomLevel.bind(this));
        this.space.off('camera:changed', this._onCameraChanged.bind(this));
        
        this.lodLevels.clear();
        this.contentAdapters.clear();
        this.space = null;
        this.cameraPlugin = null;
    }
}