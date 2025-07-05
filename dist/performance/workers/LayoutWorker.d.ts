/**
 * Initialize layout with nodes and edges
 */
declare function initLayout(data: any): void;
/**
 * Update layout data
 */
declare function updateLayout(data: any): void;
/**
 * Start continuous layout calculation
 */
declare function startLayout(): void;
/**
 * Stop layout calculation
 */
declare function stopLayout(): void;
/**
 * Perform one step of layout calculation
 */
declare function stepLayout(): void;
/**
 * Configure layout parameters
 */
declare function configureLayout(newConfig: any): void;
/**
 * Force-directed layout algorithm (Fruchterman-Reingold)
 */
declare function forceDirectedLayout(nodes: any, edges: any, config: any): {
    nodes: any;
    converged: boolean;
    iteration: any;
    energy: number;
};
/**
 * Hierarchical layout algorithm
 */
declare function hierarchicalLayout(nodes: any, edges: any, config: any): {
    nodes: any;
    converged: boolean;
    iteration: number;
    energy: number;
};
/**
 * Circular layout algorithm
 */
declare function circularLayout(nodes: any, edges: any, config: any): {
    nodes: any;
    converged: boolean;
    iteration: number;
    energy: number;
};
/**
 * Grid layout algorithm
 */
declare function gridLayout(nodes: any, edges: any, config: any): {
    nodes: any;
    converged: boolean;
    iteration: number;
    energy: number;
};
/**
 * LayoutWorker - Web Worker for heavy layout calculations
 * Handles force-directed layout, hierarchical layout, and other computationally intensive layouts
 */
declare let isRunning: boolean;
declare let layoutType: string;
declare let nodes: any[];
declare let edges: any[];
declare let config: {};
declare let animationId: any;
declare namespace layouts {
    export { forceDirectedLayout as force };
    export { hierarchicalLayout as hierarchical };
    export { circularLayout as circular };
    export { gridLayout as grid };
}
