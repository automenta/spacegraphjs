export class AdvancedLayoutManager extends LayoutManager {
    constraintSystem: ConstraintLayout;
    nestedSystem: NestedLayout;
    connector: LayoutConnector;
    adaptiveSystem: AdaptiveLayout;
    layoutModes: {
        STANDARD: string;
        CONSTRAINT: string;
        NESTED: string;
        ADAPTIVE: string;
        HYBRID: string;
    };
    currentMode: string;
    settings: {
        enableConnections: boolean;
        enableConstraints: boolean;
        enableNesting: boolean;
        enableAdaptive: boolean;
        hybridPriority: string[];
        transitionDuration: number;
        autoModeSelection: boolean;
    };
    _initializeAdvancedSystems(): void;
    _registerAdvancedLayouts(): void;
    _determineLayoutMode(name: any, config: any): any;
    _autoSelectMode(name: any, config: any): string;
    _calculateGraphComplexity(nodes: any, edges: any): number;
    _applyStandardLayout(name: any, config: any): Promise<boolean>;
    _applyConstraintLayout(name: any, config: any): Promise<boolean>;
    _applyNestedLayout(name: any, config: any): Promise<boolean>;
    _applyAdaptiveLayout(name: any, config: any): Promise<boolean>;
    _applyHybridLayout(name: any, config: any): Promise<boolean>;
    _createHybridLayoutProxy(): {
        run: () => void;
        stop: () => void;
        kick: () => void;
        addNode: (node: any) => void;
        removeNode: (node: any) => void;
        addEdge: (edge: any) => void;
        removeEdge: (edge: any) => void;
        dispose: () => void;
    };
    registerLayoutRegion(regionId: any, bounds: any, layoutType: any, nodes?: any[]): void;
    unregisterLayoutRegion(regionId: any): void;
    addLayoutConnection(sourceNodeId: any, targetNodeId: any, options?: {}): string;
    removeLayoutConnection(connectionId: any): void;
    activateConnections(): void;
    deactivateConnections(): void;
    addPositionConstraint(nodeId: any, targetPosition: any, options?: {}): void;
    addDistanceConstraint(nodeId1: any, nodeId2: any, options?: {}): void;
    addAngleConstraint(nodeId1: any, nodeId2: any, nodeId3: any, options?: {}): void;
    addBoundaryConstraint(nodeIds: any, boundary: any, options?: {}): void;
    addContainer(container: any, parentId?: any): void;
    removeContainer(containerId: any): void;
    addNodeToContainer(node: any, containerId: any): void;
    removeNodeFromContainer(node: any, containerId: any): void;
    setContainerLayout(containerId: any, layoutType: any, config?: {}): void;
    addAdaptationRule(rule: any): void;
    removeAdaptationRule(ruleName: any): void;
    forceAdaptation(targetLayout: any, reason?: string): void;
    setAdaptationEnabled(enabled: any): void;
    getLayoutHistory(): any[];
    setLayoutMode(mode: any): void;
    enableAdvancedFeatures(features?: {}): void;
    getLayoutCapabilities(): {
        modes: string[];
        currentMode: string;
        availableLayouts: any[];
        features: {
            constraints: boolean;
            nesting: boolean;
            adaptive: boolean;
            connections: boolean;
            autoMode: boolean;
        };
        systems: {
            constraint: ConstraintLayout;
            nested: NestedLayout;
            connector: LayoutConnector;
            adaptive: AdaptiveLayout;
        };
    };
}
import { LayoutManager } from './LayoutManager.js';
import { ConstraintLayout } from './ConstraintLayout.js';
import { NestedLayout } from './NestedLayout.js';
import { LayoutConnector } from './LayoutConnector.js';
import { AdaptiveLayout } from './AdaptiveLayout.js';
