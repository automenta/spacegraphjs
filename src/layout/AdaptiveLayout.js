import * as THREE from 'three';
import { gsap } from 'gsap';

export class AdaptiveLayout {
    space = null;
    pluginManager = null;
    settings = {
        adaptationTriggers: ['nodeCount', 'density', 'connections', 'size', 'time'],
        morphDuration: 1.2,
        morphEasing: 'power2.inOut',
        enableAutoAdaptation: true,
        adaptationDelay: 2000,
        densityThresholds: {
            sparse: 0.1,
            normal: 0.4,
            dense: 0.8
        },
        sizeThresholds: {
            small: 50,
            medium: 200,
            large: 500
        },
        timeBasedAdaptation: {
            enabled: false,
            interval: 30000,
            patterns: ['circular', 'grid', 'force', 'hierarchical']
        }
    };

    currentLayout = null;
    currentLayoutName = '';
    availableLayouts = new Map();
    adaptationRules = [];
    layoutHistory = [];
    nodeMetrics = new Map();
    isAdapting = false;
    adaptationTimer = null;

    constructor(config = {}) {
        this.settings = { ...this.settings, ...config };
        this._initializeAdaptationRules();
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    registerLayout(name, layoutInstance) {
        this.availableLayouts.set(name, layoutInstance);
        layoutInstance.setContext?.(this.space, this.pluginManager);
    }

    _initializeAdaptationRules() {
        this.adaptationRules = [
            {
                name: 'SmallNodeCount',
                condition: (metrics) => metrics.nodeCount <= this.settings.sizeThresholds.small,
                targetLayout: 'circular',
                priority: 3,
                description: 'Use circular layout for small node counts'
            },
            {
                name: 'HighDensity',
                condition: (metrics) => metrics.density > this.settings.densityThresholds.dense,
                targetLayout: 'force',
                priority: 2,
                description: 'Use force layout for high density graphs'
            },
            {
                name: 'HierarchicalStructure',
                condition: (metrics) => metrics.hierarchyScore > 0.7,
                targetLayout: 'hierarchical',
                priority: 1,
                description: 'Use hierarchical layout for tree-like structures'
            },
            {
                name: 'GridSuitable',
                condition: (metrics) => metrics.connectionDensity < 0.3 && metrics.nodeCount > 16,
                targetLayout: 'grid',
                priority: 4,
                description: 'Use grid layout for sparse, medium-sized graphs'
            },
            {
                name: 'LargeGraph',
                condition: (metrics) => metrics.nodeCount > this.settings.sizeThresholds.large,
                targetLayout: 'force',
                priority: 2,
                description: 'Use force layout for large graphs'
            },
            {
                name: 'HighlyConnected',
                condition: (metrics) => metrics.avgDegree > 5,
                targetLayout: 'force',
                priority: 3,
                description: 'Use force layout for highly connected graphs'
            }
        ];
    }

    async init(nodes, edges, config = {}) {
        if (config) this.updateConfig(config);
        
        const metrics = this._calculateGraphMetrics(nodes, edges);
        const bestLayout = this._selectBestLayout(metrics);
        
        await this._applyLayout(bestLayout, nodes, edges, config);
        
        if (this.settings.enableAutoAdaptation) {
            this._startAdaptationMonitoring();
        }
    }

    _calculateGraphMetrics(nodes, edges) {
        const nodeCount = nodes.length;
        const edgeCount = edges.length;
        
        if (nodeCount === 0) {
            return {
                nodeCount: 0,
                edgeCount: 0,
                density: 0,
                avgDegree: 0,
                connectionDensity: 0,
                hierarchyScore: 0,
                clustering: 0,
                boundingVolume: 0
            };
        }

        // Basic metrics
        const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
        const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
        const avgDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;

        // Calculate bounding volume
        const positions = nodes.map(n => n.position);
        const boundingBox = this._calculateBoundingBox(positions);
        const boundingVolume = boundingBox.size.x * boundingBox.size.y * boundingBox.size.z;

        // Connection density (connections per unit volume)
        const connectionDensity = boundingVolume > 0 ? edgeCount / boundingVolume : 0;

        // Hierarchy score (how tree-like the graph is)
        const hierarchyScore = this._calculateHierarchyScore(nodes, edges);

        // Clustering coefficient
        const clustering = this._calculateClustering(nodes, edges);

        return {
            nodeCount,
            edgeCount,
            density,
            avgDegree,
            connectionDensity,
            hierarchyScore,
            clustering,
            boundingVolume,
            boundingBox
        };
    }

    _calculateBoundingBox(positions) {
        if (positions.length === 0) {
            return { min: new THREE.Vector3(), max: new THREE.Vector3(), size: new THREE.Vector3() };
        }

        const min = positions[0].clone();
        const max = positions[0].clone();

        positions.forEach(pos => {
            min.min(pos);
            max.max(pos);
        });

        return {
            min,
            max,
            size: max.clone().sub(min),
            center: min.clone().add(max).multiplyScalar(0.5)
        };
    }

    _calculateHierarchyScore(nodes, edges) {
        if (nodes.length <= 1) return 0;

        const adjacencyList = new Map();
        nodes.forEach(node => adjacencyList.set(node.id, []));

        edges.forEach(edge => {
            adjacencyList.get(edge.source.id)?.push(edge.target.id);
            adjacencyList.get(edge.target.id)?.push(edge.source.id);
        });

        // Count nodes with only one connection (leaves)
        let leaves = 0;
        let roots = 0;
        let maxDepth = 0;

        adjacencyList.forEach((neighbors, nodeId) => {
            if (neighbors.length === 1) leaves++;
            if (neighbors.length === 0) roots++;
        });

        // Simple hierarchy score based on leaf ratio and structure
        const leafRatio = leaves / nodes.length;
        const connectivityScore = 1 - (edges.length / (nodes.length * nodes.length));
        
        return Math.min(1, leafRatio + connectivityScore);
    }

    _calculateClustering(nodes, edges) {
        if (nodes.length < 3) return 0;

        const adjacencyList = new Map();
        nodes.forEach(node => adjacencyList.set(node.id, new Set()));

        edges.forEach(edge => {
            adjacencyList.get(edge.source.id)?.add(edge.target.id);
            adjacencyList.get(edge.target.id)?.add(edge.source.id);
        });

        let totalClustering = 0;
        let validNodes = 0;

        adjacencyList.forEach((neighbors, nodeId) => {
            if (neighbors.size < 2) return;

            const neighborsArray = Array.from(neighbors);
            let triangles = 0;
            let possibleTriangles = 0;

            for (let i = 0; i < neighborsArray.length; i++) {
                for (let j = i + 1; j < neighborsArray.length; j++) {
                    possibleTriangles++;
                    const neighbor1 = neighborsArray[i];
                    const neighbor2 = neighborsArray[j];
                    
                    if (adjacencyList.get(neighbor1)?.has(neighbor2)) {
                        triangles++;
                    }
                }
            }

            if (possibleTriangles > 0) {
                totalClustering += triangles / possibleTriangles;
                validNodes++;
            }
        });

        return validNodes > 0 ? totalClustering / validNodes : 0;
    }

    _selectBestLayout(metrics) {
        const applicableRules = this.adaptationRules
            .filter(rule => rule.condition(metrics))
            .sort((a, b) => a.priority - b.priority);

        if (applicableRules.length > 0) {
            const selectedRule = applicableRules[0];
            console.log(`AdaptiveLayout: Selected ${selectedRule.targetLayout} - ${selectedRule.description}`);
            return selectedRule.targetLayout;
        }

        // Default fallback
        if (metrics.nodeCount < 20) return 'circular';
        if (metrics.hierarchyScore > 0.5) return 'hierarchical';
        if (metrics.density > 0.5) return 'force';
        return 'grid';
    }

    async _applyLayout(layoutName, nodes, edges, config = {}) {
        const layout = this.availableLayouts.get(layoutName);
        if (!layout) {
            console.warn(`AdaptiveLayout: Layout ${layoutName} not found`);
            return;
        }

        const previousLayout = this.currentLayoutName;
        this.currentLayout = layout;
        this.currentLayoutName = layoutName;

        // Store current positions for morphing
        const oldPositions = new Map();
        nodes.forEach(node => {
            oldPositions.set(node.id, node.position.clone());
        });

        // Apply new layout
        if (layout.init) {
            await layout.init(nodes, edges, config);
        }

        // Create morphing animation if we had a previous layout
        if (previousLayout && previousLayout !== layoutName && this.settings.morphDuration > 0) {
            await this._morphBetweenLayouts(nodes, oldPositions);
        }

        // Update history
        this.layoutHistory.push({
            layout: layoutName,
            timestamp: Date.now(),
            nodeCount: nodes.length,
            edgeCount: edges.length
        });

        // Emit event
        this.space?.emit('layout:adapted', {
            from: previousLayout,
            to: layoutName,
            reason: 'adaptive_selection'
        });
    }

    async _morphBetweenLayouts(nodes, oldPositions) {
        return new Promise((resolve) => {
            const morphPromises = nodes.map(node => {
                const oldPos = oldPositions.get(node.id);
                const newPos = node.position.clone();
                
                if (!oldPos) return Promise.resolve();

                // Reset to old position
                node.position.copy(oldPos);

                // Animate to new position
                return new Promise((nodeResolve) => {
                    gsap.to(node.position, {
                        x: newPos.x,
                        y: newPos.y,
                        z: newPos.z,
                        duration: this.settings.morphDuration,
                        ease: this.settings.morphEasing,
                        onComplete: nodeResolve
                    });
                });
            });

            Promise.all(morphPromises).then(resolve);
        });
    }

    _startAdaptationMonitoring() {
        if (this.adaptationTimer) {
            clearInterval(this.adaptationTimer);
        }

        this.adaptationTimer = setInterval(() => {
            this._checkForAdaptation();
        }, this.settings.adaptationDelay);

        // Time-based adaptation
        if (this.settings.timeBasedAdaptation.enabled) {
            setInterval(() => {
                this._performTimeBasedAdaptation();
            }, this.settings.timeBasedAdaptation.interval);
        }
    }

    async _checkForAdaptation() {
        if (this.isAdapting) return;

        const nodePlugin = this.pluginManager?.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager?.getPlugin('EdgePlugin');

        if (!nodePlugin || !edgePlugin) return;

        const nodes = Array.from(nodePlugin.getNodes().values());
        const edges = Array.from(edgePlugin.getEdges().values());

        const currentMetrics = this._calculateGraphMetrics(nodes, edges);
        const bestLayout = this._selectBestLayout(currentMetrics);

        if (bestLayout !== this.currentLayoutName) {
            console.log(`AdaptiveLayout: Adapting from ${this.currentLayoutName} to ${bestLayout}`);
            
            this.isAdapting = true;
            await this._applyLayout(bestLayout, nodes, edges);
            this.isAdapting = false;
        }
    }

    async _performTimeBasedAdaptation() {
        if (this.isAdapting || !this.settings.timeBasedAdaptation.enabled) return;

        const patterns = this.settings.timeBasedAdaptation.patterns;
        const currentIndex = patterns.indexOf(this.currentLayoutName);
        const nextIndex = (currentIndex + 1) % patterns.length;
        const nextLayout = patterns[nextIndex];

        if (this.availableLayouts.has(nextLayout)) {
            const nodePlugin = this.pluginManager?.getPlugin('NodePlugin');
            const edgePlugin = this.pluginManager?.getPlugin('EdgePlugin');

            if (nodePlugin && edgePlugin) {
                const nodes = Array.from(nodePlugin.getNodes().values());
                const edges = Array.from(edgePlugin.getEdges().values());

                this.isAdapting = true;
                await this._applyLayout(nextLayout, nodes, edges);
                this.isAdapting = false;

                this.space?.emit('layout:adapted', {
                    from: this.currentLayoutName,
                    to: nextLayout,
                    reason: 'time_based'
                });
            }
        }
    }

    addAdaptationRule(rule) {
        this.adaptationRules.push({
            name: rule.name || 'CustomRule',
            condition: rule.condition,
            targetLayout: rule.targetLayout,
            priority: rule.priority || 5,
            description: rule.description || 'Custom adaptation rule'
        });

        // Re-sort by priority
        this.adaptationRules.sort((a, b) => a.priority - b.priority);
    }

    removeAdaptationRule(ruleName) {
        this.adaptationRules = this.adaptationRules.filter(rule => rule.name !== ruleName);
    }

    forceAdaptation(targetLayout, reason = 'manual') {
        if (!this.availableLayouts.has(targetLayout)) {
            console.warn(`AdaptiveLayout: Target layout ${targetLayout} not available`);
            return;
        }

        const nodePlugin = this.pluginManager?.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager?.getPlugin('EdgePlugin');

        if (nodePlugin && edgePlugin) {
            const nodes = Array.from(nodePlugin.getNodes().values());
            const edges = Array.from(edgePlugin.getEdges().values());

            this._applyLayout(targetLayout, nodes, edges).then(() => {
                this.space?.emit('layout:adapted', {
                    from: this.currentLayoutName,
                    to: targetLayout,
                    reason
                });
            });
        }
    }

    setAdaptationEnabled(enabled) {
        this.settings.enableAutoAdaptation = enabled;
        
        if (enabled) {
            this._startAdaptationMonitoring();
        } else if (this.adaptationTimer) {
            clearInterval(this.adaptationTimer);
            this.adaptationTimer = null;
        }
    }

    getLayoutHistory() {
        return [...this.layoutHistory];
    }

    getCurrentLayout() {
        return {
            name: this.currentLayoutName,
            instance: this.currentLayout
        };
    }

    getAdaptationRules() {
        return [...this.adaptationRules];
    }

    // Layout interface methods
    addNode(node) {
        this.currentLayout?.addNode?.(node);
        
        // Check if adaptation is needed due to new node
        if (this.settings.enableAutoAdaptation && !this.isAdapting) {
            setTimeout(() => this._checkForAdaptation(), 100);
        }
    }

    removeNode(node) {
        this.currentLayout?.removeNode?.(node);
        
        // Check if adaptation is needed due to removed node
        if (this.settings.enableAutoAdaptation && !this.isAdapting) {
            setTimeout(() => this._checkForAdaptation(), 100);
        }
    }

    addEdge(edge) {
        this.currentLayout?.addEdge?.(edge);
        
        // Check if adaptation is needed due to new edge
        if (this.settings.enableAutoAdaptation && !this.isAdapting) {
            setTimeout(() => this._checkForAdaptation(), 100);
        }
    }

    removeEdge(edge) {
        this.currentLayout?.removeEdge?.(edge);
        
        // Check if adaptation is needed due to removed edge
        if (this.settings.enableAutoAdaptation && !this.isAdapting) {
            setTimeout(() => this._checkForAdaptation(), 100);
        }
    }

    run() {
        this.currentLayout?.run?.();
    }

    stop() {
        this.currentLayout?.stop?.();
    }

    kick() {
        this.currentLayout?.kick?.();
    }

    updateConfig(newConfig) {
        this.settings = { ...this.settings, ...newConfig };
        
        if (newConfig.adaptationRules) {
            this._initializeAdaptationRules();
        }
    }

    dispose() {
        if (this.adaptationTimer) {
            clearInterval(this.adaptationTimer);
            this.adaptationTimer = null;
        }

        this.availableLayouts.forEach(layout => layout.dispose?.());
        this.availableLayouts.clear();
        this.adaptationRules = [];
        this.layoutHistory = [];
        this.nodeMetrics.clear();
        
        this.currentLayout = null;
        this.currentLayoutName = '';
        this.space = null;
        this.pluginManager = null;
        this.isAdapting = false;
    }
}