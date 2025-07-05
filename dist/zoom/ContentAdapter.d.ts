/**
 * Factory function to create appropriate content adapter
 */
export function createContentAdapter(nodeId: any, type: any, config?: {}): ContentAdapter;
/**
 * ContentAdapter provides a framework for creating content that changes based on zoom level.
 * This enables true fractal zooming where content reveals different levels of detail.
 */
export class ContentAdapter {
    constructor(nodeId: any, config?: {});
    nodeId: any;
    config: {
        zoomContent: Map<any, any>;
        transitionDuration: number;
        fadeTransition: boolean;
        preloadContent: boolean;
        maxCachedLevels: number;
    };
    contentCache: Map<any, any>;
    currentContent: any;
    lastZoomLevel: number;
    /**
     * Define content for a specific zoom level range
     */
    defineContent(minZoom: any, maxZoom: any, contentGenerator: any): void;
    /**
     * Adapt content based on current zoom level and LOD configuration
     */
    adapt(node: any, lodConfig: any, zoomLevel: any): void;
    /**
     * Find content configuration for the given zoom level
     */
    _findContentForZoomLevel(zoomLevel: any): any;
    /**
     * Apply content to the node
     */
    _applyContent(node: any, contentConfig: any, lodConfig: any, zoomLevel: any): void;
    /**
     * Get or generate content, using cache when possible
     */
    _getOrGenerateContent(contentConfig: any, lodConfig: any, zoomLevel: any): any;
    /**
     * Transition to new content with animation
     */
    _transitionToContent(node: any, content: any): void;
    /**
     * Clean up old cached content
     */
    _cleanupCache(): void;
    /**
     * Clear all cached content
     */
    clearCache(): void;
    /**
     * Dispose of the content adapter
     */
    dispose(): void;
}
/**
 * TextContentAdapter - Specialized adapter for text content that changes with zoom
 */
export class TextContentAdapter extends ContentAdapter {
    textLevels: Map<any, any>;
    /**
     * Define text content for different zoom levels
     */
    defineTextLevel(minZoom: any, maxZoom: any, text: any): void;
    /**
     * Define progressive text reveal (summary -> detail -> full)
     */
    defineProgressiveText(summary: any, detail: any, full: any): void;
}
/**
 * HTMLContentAdapter - Specialized adapter for HTML content
 */
export class HTMLContentAdapter extends ContentAdapter {
    /**
     * Define HTML content for different zoom levels
     */
    defineHTMLLevel(minZoom: any, maxZoom: any, htmlGenerator: any): void;
    /**
     * Define progressive HTML reveal with different complexity levels
     */
    defineProgressiveHTML(simple: any, medium: any, complex: any): void;
}
/**
 * DataContentAdapter - Specialized adapter for data visualization content
 */
export class DataContentAdapter extends ContentAdapter {
    constructor(nodeId: any, data: any, config?: {});
    data: any;
    /**
     * Define data visualization levels
     */
    defineDataLevels(levels: any): void;
    /**
     * Generate data visualization based on configuration
     */
    _generateDataVisualization(config: any, lodConfig: any, zoomLevel: any): string;
    /**
     * Generate summary view
     */
    _generateSummary(config: any): string;
    /**
     * Generate chart view
     */
    _generateChart(config: any, zoomLevel: any): string;
    /**
     * Generate table view
     */
    _generateTable(config: any, zoomLevel: any): string;
    /**
     * Generate raw data view
     */
    _generateRawData(config: any): string;
}
