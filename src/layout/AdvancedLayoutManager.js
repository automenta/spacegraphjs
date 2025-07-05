import { LayoutManager } from './LayoutManager.js';
import { ConstraintLayout } from './ConstraintLayout.js';
import { NestedLayout } from './NestedLayout.js';
import { LayoutConnector } from './LayoutConnector.js';
import { AdaptiveLayout } from './AdaptiveLayout.js';

export class AdvancedLayoutManager extends LayoutManager {
    constructor(space, pluginManager) {
        super(space, pluginManager);
        
        this.constraintSystem = new ConstraintLayout();
        this.nestedSystem = new NestedLayout();
        this.connector = new LayoutConnector();
        this.adaptiveSystem = new AdaptiveLayout();
        
        this.layoutModes = {
            STANDARD: 'standard',
            CONSTRAINT: 'constraint',
            NESTED: 'nested',
            ADAPTIVE: 'adaptive',
            HYBRID: 'hybrid'
        };
        
        this.currentMode = this.layoutModes.STANDARD;
        this.settings = {
            enableConnections: true,
            enableConstraints: false,
            enableNesting: false,
            enableAdaptive: false,
            hybridPriority: ['adaptive', 'nested', 'constraint', 'standard'],
            transitionDuration: 0.8,
            autoModeSelection: false
        };

        this._initializeAdvancedSystems();
        this._registerAdvancedLayouts();
    }

    _initializeAdvancedSystems() {
        this.constraintSystem.setContext(this.space, this.pluginManager);
        this.nestedSystem.setContext(this.space, this.pluginManager);
        this.connector.setContext(this.space, this.pluginManager);
        this.adaptiveSystem.setContext(this.space, this.pluginManager);
    }

    _registerAdvancedLayouts() {
        // Register constraint-based layout
        this.registerLayout('constraint', this.constraintSystem);
        
        // Register nested layout
        this.registerLayout('nested', this.nestedSystem);
        
        // Register adaptive layout
        this.registerLayout('adaptive', this.adaptiveSystem);

        // Register standard layouts with the adaptive system
        this.layouts.forEach((layout, name) => {
            if (name !== 'constraint' && name !== 'nested' && name !== 'adaptive') {
                this.adaptiveSystem.registerLayout(name, layout);
            }
        });
    }

    async applyLayout(name, config = {}) {
        // Determine layout mode
        const mode = this._determineLayoutMode(name, config);
        
        switch (mode) {
            case this.layoutModes.CONSTRAINT:
                return this._applyConstraintLayout(name, config);
            case this.layoutModes.NESTED:
                return this._applyNestedLayout(name, config);
            case this.layoutModes.ADAPTIVE:
                return this._applyAdaptiveLayout(name, config);
            case this.layoutModes.HYBRID:
                return this._applyHybridLayout(name, config);
            default:
                return this._applyStandardLayout(name, config);
        }
    }

    _determineLayoutMode(name, config) {
        if (config.mode) return config.mode;
        
        if (this.settings.autoModeSelection) {
            return this._autoSelectMode(name, config);
        }

        // Check individual system enables
        if (name === 'adaptive' || this.settings.enableAdaptive) {
            return this.layoutModes.ADAPTIVE;
        }
        if (name === 'constraint' || this.settings.enableConstraints) {
            return this.layoutModes.CONSTRAINT;
        }
        if (name === 'nested' || this.settings.enableNesting) {
            return this.layoutModes.NESTED;
        }
        
        return this.layoutModes.STANDARD;
    }

    _autoSelectMode(name, config) {
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
        
        if (!nodePlugin || !edgePlugin) return this.layoutModes.STANDARD;

        const nodes = Array.from(nodePlugin.getNodes().values());
        const edges = Array.from(edgePlugin.getEdges().values());

        // Check for container nodes (nested layout)
        const hasContainers = nodes.some(node => 
            node.data?.isContainer || node.data?.childLayout
        );
        
        // Check for constraint requirements
        const hasConstraints = edges.some(edge => 
            edge.data?.constraintType || edge.data?.constraintParams
        );
        
        // Check for complex structures (adaptive layout)
        const isComplex = nodes.length > 50 || edges.length > 100 || 
                         this._calculateGraphComplexity(nodes, edges) > 0.7;

        if (hasContainers && hasConstraints && isComplex) {
            return this.layoutModes.HYBRID;
        }
        if (isComplex) return this.layoutModes.ADAPTIVE;
        if (hasContainers) return this.layoutModes.NESTED;
        if (hasConstraints) return this.layoutModes.CONSTRAINT;
        
        return this.layoutModes.STANDARD;
    }

    _calculateGraphComplexity(nodes, edges) {
        if (nodes.length === 0) return 0;
        
        const density = edges.length / (nodes.length * (nodes.length - 1) / 2);
        const avgDegree = (2 * edges.length) / nodes.length;
        const sizeComplexity = Math.min(1, nodes.length / 100);
        
        return (density + avgDegree / 10 + sizeComplexity) / 3;
    }

    async _applyStandardLayout(name, config) {
        return super.applyLayout(name, config);
    }

    async _applyConstraintLayout(name, config) {
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');

        if (!nodePlugin || !edgePlugin) return false;

        const nodes = Array.from(nodePlugin.getNodes().values());
        const edges = Array.from(edgePlugin.getEdges().values());

        // Apply base layout first if specified
        if (config.baseLayout && config.baseLayout !== 'constraint') {
            await super.applyLayout(config.baseLayout, config);
        }

        // Apply constraints
        await this.constraintSystem.init(nodes, edges, config);
        
        this.activeLayout = this.constraintSystem;
        this.activeLayoutName = 'constraint';
        this.currentMode = this.layoutModes.CONSTRAINT;

        this.space.emit('layout:started', { 
            name: 'constraint', 
            layout: this.constraintSystem,
            mode: this.currentMode
        });

        return true;
    }

    async _applyNestedLayout(name, config) {
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');

        if (!nodePlugin || !edgePlugin) return false;

        const nodes = Array.from(nodePlugin.getNodes().values());
        const edges = Array.from(edgePlugin.getEdges().values());

        await this.nestedSystem.init(nodes, edges, config);
        
        this.activeLayout = this.nestedSystem;
        this.activeLayoutName = 'nested';
        this.currentMode = this.layoutModes.NESTED;

        this.space.emit('layout:started', { 
            name: 'nested', 
            layout: this.nestedSystem,
            mode: this.currentMode
        });

        return true;
    }

    async _applyAdaptiveLayout(name, config) {
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');

        if (!nodePlugin || !edgePlugin) return false;

        const nodes = Array.from(nodePlugin.getNodes().values());
        const edges = Array.from(edgePlugin.getEdges().values());

        await this.adaptiveSystem.init(nodes, edges, config);
        
        this.activeLayout = this.adaptiveSystem;
        this.activeLayoutName = 'adaptive';
        this.currentMode = this.layoutModes.ADAPTIVE;

        this.space.emit('layout:started', { 
            name: 'adaptive', 
            layout: this.adaptiveSystem,
            mode: this.currentMode
        });

        return true;
    }

    async _applyHybridLayout(name, config) {
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');

        if (!nodePlugin || !edgePlugin) return false;

        const nodes = Array.from(nodePlugin.getNodes().values());
        const edges = Array.from(edgePlugin.getEdges().values());

        // Apply systems in priority order
        for (const systemName of this.settings.hybridPriority) {
            switch (systemName) {
                case 'adaptive':
                    if (this.settings.enableAdaptive) {
                        await this.adaptiveSystem.init(nodes, edges, config);
                    }
                    break;
                case 'nested':
                    if (this.settings.enableNesting) {
                        await this.nestedSystem.init(nodes, edges, config);
                    }
                    break;
                case 'constraint':
                    if (this.settings.enableConstraints) {
                        await this.constraintSystem.init(nodes, edges, config);
                    }
                    break;
                case 'standard':
                    if (config.baseLayout) {
                        await super.applyLayout(config.baseLayout, config);
                    }
                    break;
            }
        }

        this.activeLayout = this._createHybridLayoutProxy();
        this.activeLayoutName = 'hybrid';
        this.currentMode = this.layoutModes.HYBRID;

        this.space.emit('layout:started', { 
            name: 'hybrid', 
            layout: this.activeLayout,
            mode: this.currentMode
        });

        return true;
    }

    _createHybridLayoutProxy() {
        return {
            run: () => {
                if (this.settings.enableAdaptive) this.adaptiveSystem.run();
                if (this.settings.enableNesting) this.nestedSystem.run();
                if (this.settings.enableConstraints) this.constraintSystem.run();
            },
            stop: () => {
                if (this.settings.enableAdaptive) this.adaptiveSystem.stop();
                if (this.settings.enableNesting) this.nestedSystem.stop();
                if (this.settings.enableConstraints) this.constraintSystem.stop();
            },
            kick: () => {
                if (this.settings.enableAdaptive) this.adaptiveSystem.kick();
                if (this.settings.enableNesting) this.nestedSystem.kick();
                if (this.settings.enableConstraints) this.constraintSystem.kick();
            },
            addNode: (node) => {
                if (this.settings.enableAdaptive) this.adaptiveSystem.addNode(node);
                if (this.settings.enableNesting) this.nestedSystem.addNode(node);
                if (this.settings.enableConstraints) this.constraintSystem.addNode(node);
            },
            removeNode: (node) => {
                if (this.settings.enableAdaptive) this.adaptiveSystem.removeNode(node);
                if (this.settings.enableNesting) this.nestedSystem.removeNode(node);
                if (this.settings.enableConstraints) this.constraintSystem.removeNode(node);
            },
            addEdge: (edge) => {
                if (this.settings.enableAdaptive) this.adaptiveSystem.addEdge(edge);
                if (this.settings.enableNesting) this.nestedSystem.addEdge(edge);
                if (this.settings.enableConstraints) this.constraintSystem.addEdge(edge);
            },
            removeEdge: (edge) => {
                if (this.settings.enableAdaptive) this.adaptiveSystem.removeEdge(edge);
                if (this.settings.enableNesting) this.nestedSystem.removeEdge(edge);
                if (this.settings.enableConstraints) this.constraintSystem.removeEdge(edge);
            },
            dispose: () => {
                // Handled by main dispose method
            }
        };
    }

    // Layout Connector Integration
    registerLayoutRegion(regionId, bounds, layoutType, nodes = []) {
        if (this.settings.enableConnections) {
            this.connector.registerLayoutRegion(regionId, bounds, layoutType, nodes);
        }
    }

    unregisterLayoutRegion(regionId) {
        if (this.settings.enableConnections) {
            this.connector.unregisterLayoutRegion(regionId);
        }
    }

    addLayoutConnection(sourceNodeId, targetNodeId, options = {}) {
        if (this.settings.enableConnections) {
            return this.connector.addConnection(sourceNodeId, targetNodeId, options);
        }
        return null;
    }

    removeLayoutConnection(connectionId) {
        if (this.settings.enableConnections) {
            this.connector.removeConnection(connectionId);
        }
    }

    activateConnections() {
        this.settings.enableConnections = true;
        this.connector.activate();
    }

    deactivateConnections() {
        this.settings.enableConnections = false;
        this.connector.deactivate();
    }

    // Constraint System Integration
    addPositionConstraint(nodeId, targetPosition, options = {}) {
        this.constraintSystem.addPositionConstraint(nodeId, targetPosition, options);
    }

    addDistanceConstraint(nodeId1, nodeId2, options = {}) {
        this.constraintSystem.addDistanceConstraint(nodeId1, nodeId2, options);
    }

    addAngleConstraint(nodeId1, nodeId2, nodeId3, options = {}) {
        this.constraintSystem.addAngleConstraint(nodeId1, nodeId2, nodeId3, options);
    }

    addBoundaryConstraint(nodeIds, boundary, options = {}) {
        this.constraintSystem.addBoundaryConstraint(nodeIds, boundary, options);
    }

    // Nested Layout Integration
    addContainer(container, parentId = null) {
        this.nestedSystem.addContainer(container, parentId);
    }

    removeContainer(containerId) {
        this.nestedSystem.removeContainer(containerId);
    }

    addNodeToContainer(node, containerId) {
        this.nestedSystem.addNodeToContainer(node, containerId);
    }

    removeNodeFromContainer(node, containerId) {
        this.nestedSystem.removeNodeFromContainer(node, containerId);
    }

    setContainerLayout(containerId, layoutType, config = {}) {
        this.nestedSystem.setContainerLayout(containerId, layoutType, config);
    }

    // Adaptive Layout Integration
    addAdaptationRule(rule) {
        this.adaptiveSystem.addAdaptationRule(rule);
    }

    removeAdaptationRule(ruleName) {
        this.adaptiveSystem.removeAdaptationRule(ruleName);
    }

    forceAdaptation(targetLayout, reason = 'manual') {
        this.adaptiveSystem.forceAdaptation(targetLayout, reason);
    }

    setAdaptationEnabled(enabled) {
        this.settings.enableAdaptive = enabled;
        this.adaptiveSystem.setAdaptationEnabled(enabled);
    }

    getLayoutHistory() {
        return this.adaptiveSystem.getLayoutHistory();
    }

    // Advanced configuration
    setLayoutMode(mode) {
        this.currentMode = mode;
        
        // Enable/disable systems based on mode
        this.settings.enableConstraints = mode === this.layoutModes.CONSTRAINT || mode === this.layoutModes.HYBRID;
        this.settings.enableNesting = mode === this.layoutModes.NESTED || mode === this.layoutModes.HYBRID;
        this.settings.enableAdaptive = mode === this.layoutModes.ADAPTIVE || mode === this.layoutModes.HYBRID;
    }

    enableAdvancedFeatures(features = {}) {
        if (features.constraints !== undefined) {
            this.settings.enableConstraints = features.constraints;
        }
        if (features.nesting !== undefined) {
            this.settings.enableNesting = features.nesting;
        }
        if (features.adaptive !== undefined) {
            this.settings.enableAdaptive = features.adaptive;
        }
        if (features.connections !== undefined) {
            this.settings.enableConnections = features.connections;
        }
        if (features.autoMode !== undefined) {
            this.settings.autoModeSelection = features.autoMode;
        }
    }

    getLayoutCapabilities() {
        return {
            modes: Object.values(this.layoutModes),
            currentMode: this.currentMode,
            availableLayouts: Array.from(this.layouts.keys()),
            features: {
                constraints: this.settings.enableConstraints,
                nesting: this.settings.enableNesting,
                adaptive: this.settings.enableAdaptive,
                connections: this.settings.enableConnections,
                autoMode: this.settings.autoModeSelection
            },
            systems: {
                constraint: this.constraintSystem,
                nested: this.nestedSystem,
                connector: this.connector,
                adaptive: this.adaptiveSystem
            }
        };
    }

    // Override parent methods to integrate advanced systems
    addNodeToLayout(node) {
        super.addNodeToLayout(node);
        
        if (this.settings.enableConstraints) {
            this.constraintSystem.addNode(node);
        }
        if (this.settings.enableNesting) {
            this.nestedSystem.addNode(node);
        }
        if (this.settings.enableAdaptive) {
            this.adaptiveSystem.addNode(node);
        }
    }

    removeNodeFromLayout(node) {
        super.removeNodeFromLayout(node);
        
        if (this.settings.enableConstraints) {
            this.constraintSystem.removeNode(node);
        }
        if (this.settings.enableNesting) {
            this.nestedSystem.removeNode(node);
        }
        if (this.settings.enableAdaptive) {
            this.adaptiveSystem.removeNode(node);
        }
    }

    addEdgeToLayout(edge) {
        super.addEdgeToLayout(edge);
        
        if (this.settings.enableConstraints) {
            this.constraintSystem.addEdge(edge);
        }
        if (this.settings.enableNesting) {
            this.nestedSystem.addEdge(edge);
        }
        if (this.settings.enableAdaptive) {
            this.adaptiveSystem.addEdge(edge);
        }
    }

    removeEdgeFromLayout(edge) {
        super.removeEdgeFromLayout(edge);
        
        if (this.settings.enableConstraints) {
            this.constraintSystem.removeEdge(edge);
        }
        if (this.settings.enableNesting) {
            this.nestedSystem.removeEdge(edge);
        }
        if (this.settings.enableAdaptive) {
            this.adaptiveSystem.removeEdge(edge);
        }
    }

    dispose() {
        super.dispose();
        
        this.constraintSystem.dispose();
        this.nestedSystem.dispose();
        this.connector.dispose();
        this.adaptiveSystem.dispose();
    }
}