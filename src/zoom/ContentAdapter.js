/**
 * ContentAdapter provides a framework for creating content that changes based on zoom level.
 * This enables true fractal zooming where content reveals different levels of detail.
 */
export class ContentAdapter {
    constructor(nodeId, config = {}) {
        this.nodeId = nodeId;
        this.config = {
            // Default content for different zoom levels
            zoomContent: new Map(),
            // Animation settings
            transitionDuration: 0.3,
            fadeTransition: true,
            // Performance settings
            preloadContent: true,
            maxCachedLevels: 5,
            ...config
        };
        
        this.contentCache = new Map();
        this.currentContent = null;
        this.lastZoomLevel = 0;
    }

    /**
     * Define content for a specific zoom level range
     */
    defineContent(minZoom, maxZoom, contentGenerator) {
        const key = `${minZoom}-${maxZoom}`;
        this.config.zoomContent.set(key, {
            minZoom,
            maxZoom,
            generator: contentGenerator
        });
    }

    /**
     * Adapt content based on current zoom level and LOD configuration
     */
    adapt(node, lodConfig, zoomLevel) {
        // Check if zoom level change is significant enough to warrant content change
        if (Math.abs(zoomLevel - this.lastZoomLevel) < 0.5) return;
        
        this.lastZoomLevel = zoomLevel;
        
        // Find appropriate content for current zoom level
        const contentConfig = this._findContentForZoomLevel(zoomLevel);
        
        if (contentConfig) {
            this._applyContent(node, contentConfig, lodConfig, zoomLevel);
        }
    }

    /**
     * Find content configuration for the given zoom level
     */
    _findContentForZoomLevel(zoomLevel) {
        for (const [key, config] of this.config.zoomContent) {
            if (zoomLevel >= config.minZoom && zoomLevel <= config.maxZoom) {
                return config;
            }
        }
        return null;
    }

    /**
     * Apply content to the node
     */
    _applyContent(node, contentConfig, lodConfig, zoomLevel) {
        if (!contentConfig.generator) return;
        
        // Generate or retrieve cached content
        const content = this._getOrGenerateContent(contentConfig, lodConfig, zoomLevel);
        
        if (content && content !== this.currentContent) {
            this._transitionToContent(node, content);
            this.currentContent = content;
        }
    }

    /**
     * Get or generate content, using cache when possible
     */
    _getOrGenerateContent(contentConfig, lodConfig, zoomLevel) {
        const cacheKey = `${contentConfig.minZoom}-${contentConfig.maxZoom}-${zoomLevel.toFixed(1)}`;
        
        if (this.contentCache.has(cacheKey)) {
            return this.contentCache.get(cacheKey);
        }
        
        // Generate new content
        const content = contentConfig.generator(lodConfig, zoomLevel);
        
        // Cache the content
        this.contentCache.set(cacheKey, content);
        
        // Clean up cache if it gets too large
        if (this.contentCache.size > this.config.maxCachedLevels) {
            this._cleanupCache();
        }
        
        return content;
    }

    /**
     * Transition to new content with animation
     */
    _transitionToContent(node, content) {
        if (!node.htmlElement) return;
        
        const contentElement = node.htmlElement.querySelector('.node-content');
        if (!contentElement) return;
        
        if (this.config.fadeTransition) {
            // Fade out current content
            contentElement.style.transition = `opacity ${this.config.transitionDuration}s`;
            contentElement.style.opacity = '0';
            
            setTimeout(() => {
                // Update content
                if (typeof content === 'string') {
                    contentElement.innerHTML = content;
                } else if (content.innerHTML) {
                    contentElement.innerHTML = content.innerHTML;
                } else if (content.textContent) {
                    contentElement.textContent = content.textContent;
                }
                
                // Fade in new content
                contentElement.style.opacity = '1';
            }, this.config.transitionDuration * 1000);
        } else {
            // Direct content replacement
            if (typeof content === 'string') {
                contentElement.innerHTML = content;
            } else if (content.innerHTML) {
                contentElement.innerHTML = content.innerHTML;
            } else if (content.textContent) {
                contentElement.textContent = content.textContent;
            }
        }
    }

    /**
     * Clean up old cached content
     */
    _cleanupCache() {
        const entries = Array.from(this.contentCache.entries());
        // Remove oldest entries (simple FIFO)
        const toRemove = entries.slice(0, entries.length - this.config.maxCachedLevels);
        toRemove.forEach(([key]) => this.contentCache.delete(key));
    }

    /**
     * Clear all cached content
     */
    clearCache() {
        this.contentCache.clear();
    }

    /**
     * Dispose of the content adapter
     */
    dispose() {
        this.contentCache.clear();
        this.currentContent = null;
    }
}

/**
 * TextContentAdapter - Specialized adapter for text content that changes with zoom
 */
export class TextContentAdapter extends ContentAdapter {
    constructor(nodeId, config = {}) {
        super(nodeId, config);
        this.textLevels = new Map();
    }

    /**
     * Define text content for different zoom levels
     */
    defineTextLevel(minZoom, maxZoom, text) {
        this.defineContent(minZoom, maxZoom, () => text);
    }

    /**
     * Define progressive text reveal (summary -> detail -> full)
     */
    defineProgressiveText(summary, detail, full) {
        this.defineTextLevel(-10, -2, summary);
        this.defineTextLevel(-2, 2, detail);
        this.defineTextLevel(2, 10, full);
    }
}

/**
 * HTMLContentAdapter - Specialized adapter for HTML content
 */
export class HTMLContentAdapter extends ContentAdapter {
    constructor(nodeId, config = {}) {
        super(nodeId, config);
    }

    /**
     * Define HTML content for different zoom levels
     */
    defineHTMLLevel(minZoom, maxZoom, htmlGenerator) {
        this.defineContent(minZoom, maxZoom, (lodConfig, zoomLevel) => {
            if (typeof htmlGenerator === 'function') {
                return htmlGenerator(lodConfig, zoomLevel);
            }
            return htmlGenerator;
        });
    }

    /**
     * Define progressive HTML reveal with different complexity levels
     */
    defineProgressiveHTML(simple, medium, complex) {
        this.defineHTMLLevel(-10, -1, simple);
        this.defineHTMLLevel(-1, 3, medium);
        this.defineHTMLLevel(3, 10, complex);
    }
}

/**
 * DataContentAdapter - Specialized adapter for data visualization content
 */
export class DataContentAdapter extends ContentAdapter {
    constructor(nodeId, data, config = {}) {
        super(nodeId, config);
        this.data = data;
    }

    /**
     * Define data visualization levels
     */
    defineDataLevels(levels) {
        Object.entries(levels).forEach(([levelName, config]) => {
            this.defineContent(config.minZoom, config.maxZoom, (lodConfig, zoomLevel) => {
                return this._generateDataVisualization(config, lodConfig, zoomLevel);
            });
        });
    }

    /**
     * Generate data visualization based on configuration
     */
    _generateDataVisualization(config, lodConfig, zoomLevel) {
        if (!this.data) return '<div>No data available</div>';
        
        switch (config.type) {
            case 'summary':
                return this._generateSummary(config);
            case 'chart':
                return this._generateChart(config, zoomLevel);
            case 'table':
                return this._generateTable(config, zoomLevel);
            case 'raw':
                return this._generateRawData(config);
            default:
                return '<div>Unknown visualization type</div>';
        }
    }

    /**
     * Generate summary view
     */
    _generateSummary(config) {
        const summary = config.summaryFunction ? config.summaryFunction(this.data) : 'Data Summary';
        return `<div class="data-summary">${summary}</div>`;
    }

    /**
     * Generate chart view
     */
    _generateChart(config, zoomLevel) {
        // Simplified chart generation - in real implementation, this would use a charting library
        const chartType = config.chartType || 'bar';
        const dataPoints = Array.isArray(this.data) ? this.data.length : Object.keys(this.data).length;
        
        return `
            <div class="data-chart">
                <h4>${config.title || 'Chart'}</h4>
                <div class="chart-placeholder">
                    ${chartType.toUpperCase()} chart with ${dataPoints} data points
                    <br>Zoom level: ${zoomLevel.toFixed(1)}
                </div>
            </div>
        `;
    }

    /**
     * Generate table view
     */
    _generateTable(config, zoomLevel) {
        if (!Array.isArray(this.data)) return '<div>Data not suitable for table</div>';
        
        const maxRows = Math.min(config.maxRows || 10, this.data.length);
        const rows = this.data.slice(0, maxRows);
        
        let html = '<table class="data-table"><thead><tr>';
        
        // Generate headers
        if (rows.length > 0) {
            const headers = Object.keys(rows[0]);
            headers.forEach(header => {
                html += `<th>${header}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            // Generate rows
            rows.forEach(row => {
                html += '<tr>';
                headers.forEach(header => {
                    html += `<td>${row[header] || ''}</td>`;
                });
                html += '</tr>';
            });
        }
        
        html += '</tbody></table>';
        return html;
    }

    /**
     * Generate raw data view
     */
    _generateRawData(config) {
        return `<pre class="raw-data">${JSON.stringify(this.data, null, 2)}</pre>`;
    }
}

/**
 * Factory function to create appropriate content adapter
 */
export function createContentAdapter(nodeId, type, config = {}) {
    switch (type) {
        case 'text':
            return new TextContentAdapter(nodeId, config);
        case 'html':
            return new HTMLContentAdapter(nodeId, config);
        case 'data':
            return new DataContentAdapter(nodeId, config.data, config);
        default:
            return new ContentAdapter(nodeId, config);
    }
}