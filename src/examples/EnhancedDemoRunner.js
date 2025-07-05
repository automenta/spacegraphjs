import { pages } from './pages.js';

/**
 * EnhancedDemoRunner provides an interactive demo system with documentation,
 * code viewing, performance monitoring, and advanced demo management features.
 */
export class EnhancedDemoRunner {
    constructor(space) {
        this.space = space;
        this.currentDemo = null;
        this.demoCategories = new Map();
        this.performanceMonitor = null;
        this.codeViewer = null;
        this.demoHistory = [];
        
        // UI Elements
        this.mainContainer = null;
        this.sidebar = null;
        this.contentArea = null;
        this.toolbar = null;
        
        // Demo metadata
        this.enhancedPages = this._enhancePageMetadata(pages);
        this._categorizePages();
        
        this._initializeUI();
        this._bindEvents();
        
        console.log('EnhancedDemoRunner initialized');
    }

    /**
     * Enhance page metadata with additional information
     */
    _enhancePageMetadata(pages) {
        return pages.map(page => ({
            ...page,
            category: this._determineCategory(page),
            complexity: this._determineComplexity(page),
            features: this._extractFeatures(page),
            estimatedLoadTime: this._estimateLoadTime(page),
            prerequisites: this._determinePrerequisites(page),
            tags: this._generateTags(page)
        }));
    }

    /**
     * Determine demo category
     */
    _determineCategory(page) {
        const id = page.id.toLowerCase();
        const title = page.title.toLowerCase();
        
        if (id.includes('performance') || title.includes('performance')) return 'Performance';
        if (id.includes('fractal') || id.includes('zoom')) return 'Zooming';
        if (id.includes('layout') || title.includes('layout')) return 'Layouts';
        if (id.includes('widget') || id.includes('node') || id.includes('edge')) return 'Widgets';
        if (id.includes('camera') || title.includes('camera')) return 'Camera';
        if (id.includes('hud') || title.includes('hud')) return 'Interface';
        if (id.includes('all-features') || title.includes('comprehensive')) return 'Showcase';
        
        return 'General';
    }

    /**
     * Determine demo complexity
     */
    _determineComplexity(page) {
        const id = page.id.toLowerCase();
        const title = page.title.toLowerCase();
        
        if (id.includes('performance') || id.includes('fractal') || id.includes('advanced')) return 'Advanced';
        if (id.includes('meta') || id.includes('layout') || id.includes('camera')) return 'Intermediate';
        
        return 'Basic';
    }

    /**
     * Extract demo features
     */
    _extractFeatures(page) {
        const features = [];
        const searchText = (page.id + ' ' + page.title + ' ' + page.description).toLowerCase();
        
        const featureMap = {
            'Widgets': ['widget', 'node', 'control', 'progress', 'canvas'],
            'Layouts': ['layout', 'force', 'hierarchical', 'grid', 'circular'],
            'Camera': ['camera', 'zoom', 'rotation', 'pan', 'view'],
            'Performance': ['performance', 'instancing', 'culling', 'worker', 'optimization'],
            'Fractal Zoom': ['fractal', 'zoom', 'lod', 'level-of-detail'],
            'HUD': ['hud', 'overlay', 'menu', 'interface', 'ui'],
            'Edges': ['edge', 'connection', 'link', 'flow', 'curved'],
            '3D': ['3d', 'three', 'mesh', 'geometry', 'material'],
            'Animation': ['animation', 'transition', 'tween', 'gsap'],
            'Interaction': ['interaction', 'click', 'drag', 'hover', 'select']
        };
        
        Object.entries(featureMap).forEach(([feature, keywords]) => {
            if (keywords.some(keyword => searchText.includes(keyword))) {
                features.push(feature);
            }
        });
        
        return features;
    }

    /**
     * Estimate demo load time
     */
    _estimateLoadTime(page) {
        const complexity = this._determineComplexity(page);
        switch (complexity) {
            case 'Advanced': return '3-5 seconds';
            case 'Intermediate': return '1-3 seconds';
            default: return '< 1 second';
        }
    }

    /**
     * Determine prerequisites
     */
    _determinePrerequisites(page) {
        const prereqs = [];
        
        if (page.features?.includes('Performance')) {
            prereqs.push('Modern browser with WebGL support');
        }
        if (page.features?.includes('Fractal Zoom')) {
            prereqs.push('Hardware acceleration recommended');
        }
        if (page.id.includes('performance')) {
            prereqs.push('4GB+ RAM recommended');
        }
        
        return prereqs;
    }

    /**
     * Generate searchable tags
     */
    _generateTags(page) {
        const tags = [...page.features];
        tags.push(page.category, page.complexity);
        
        // Add specific tags based on content
        if (page.id.includes('3d')) tags.push('Three.js', 'WebGL');
        if (page.id.includes('worker')) tags.push('Web Workers', 'Multithreading');
        if (page.id.includes('graph')) tags.push('Graph Theory', 'Network');
        
        return [...new Set(tags)]; // Remove duplicates
    }

    /**
     * Categorize pages for organized display
     */
    _categorizePages() {
        this.enhancedPages.forEach(page => {
            const category = page.category;
            if (!this.demoCategories.has(category)) {
                this.demoCategories.set(category, []);
            }
            this.demoCategories.get(category).push(page);
        });
        
        // Sort categories and pages within categories
        this.demoCategories.forEach(pages => {
            pages.sort((a, b) => {
                // Showcase category first, then by complexity, then alphabetically
                if (a.category === 'Showcase') return -1;
                if (b.category === 'Showcase') return 1;
                
                const complexityOrder = { 'Basic': 0, 'Intermediate': 1, 'Advanced': 2 };
                const complexityDiff = complexityOrder[a.complexity] - complexityOrder[b.complexity];
                if (complexityDiff !== 0) return complexityDiff;
                
                return a.title.localeCompare(b.title);
            });
        });
    }

    /**
     * Initialize the enhanced UI
     */
    _initializeUI() {
        this._createEnhancedLayout();
        this._createSidebar();
        this._createToolbar();
        this._createContentArea();
        this._createPerformanceMonitor();
        this._createCodeViewer();
        this._applyEnhancedStyles();
    }

    /**
     * Create enhanced layout structure
     */
    _createEnhancedLayout() {
        // Find existing containers
        const pageSelectorEl = document.getElementById('page-selector');
        const hudEl = document.getElementById('hud');
        
        // Hide original elements
        if (pageSelectorEl) pageSelectorEl.style.display = 'none';
        if (hudEl) hudEl.style.display = 'none';
        
        // Create main container
        this.mainContainer = document.createElement('div');
        this.mainContainer.id = 'enhanced-demo-runner';
        this.mainContainer.className = 'enhanced-demo-runner';
        
        // Create layout sections
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'demo-toolbar';
        
        this.sidebar = document.createElement('div');
        this.sidebar.className = 'demo-sidebar';
        
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'demo-content';
        
        // Assemble layout
        this.mainContainer.appendChild(this.toolbar);
        this.mainContainer.appendChild(this.sidebar);
        this.mainContainer.appendChild(this.contentArea);
        
        // Add to page
        document.body.appendChild(this.mainContainer);
    }

    /**
     * Create enhanced sidebar with categorized demos
     */
    _createSidebar() {
        this.sidebar.innerHTML = `
            <div class="sidebar-header">
                <h3>🎮 SpaceGraphJS Demos</h3>
                <div class="search-container">
                    <input type="text" id="demo-search" placeholder="Search demos..." />
                    <button id="search-clear">×</button>
                </div>
                <div class="filter-container">
                    <select id="category-filter">
                        <option value="">All Categories</option>
                        ${Array.from(this.demoCategories.keys()).map(cat => 
                            `<option value="${cat}">${cat}</option>`
                        ).join('')}
                    </select>
                    <select id="complexity-filter">
                        <option value="">All Levels</option>
                        <option value="Basic">Basic</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                    </select>
                </div>
            </div>
            <div class="demo-categories" id="demo-categories">
                ${this._generateCategoryHTML()}
            </div>
        `;
    }

    /**
     * Generate HTML for demo categories
     */
    _generateCategoryHTML() {
        let html = '';
        
        this.demoCategories.forEach((pages, category) => {
            html += `
                <div class="category-section" data-category="${category}">
                    <div class="category-header">
                        <h4>${category} <span class="demo-count">(${pages.length})</span></h4>
                        <button class="category-toggle">−</button>
                    </div>
                    <div class="category-demos">
                        ${pages.map(page => this._generateDemoItemHTML(page)).join('')}
                    </div>
                </div>
            `;
        });
        
        return html;
    }

    /**
     * Generate HTML for individual demo item
     */
    _generateDemoItemHTML(page) {
        const complexityIcon = {
            'Basic': '🟢',
            'Intermediate': '🟡', 
            'Advanced': '🔴'
        }[page.complexity] || '⚪';
        
        return `
            <div class="demo-item" data-demo-id="${page.id}" data-category="${page.category}" data-complexity="${page.complexity}">
                <div class="demo-header">
                    <span class="complexity-icon" title="${page.complexity}">${complexityIcon}</span>
                    <span class="demo-title">${page.title}</span>
                </div>
                <div class="demo-description">${page.description}</div>
                <div class="demo-features">
                    ${page.features.slice(0, 3).map(feature => 
                        `<span class="feature-tag">${feature}</span>`
                    ).join('')}
                    ${page.features.length > 3 ? `<span class="more-features">+${page.features.length - 3}</span>` : ''}
                </div>
                <div class="demo-metadata">
                    <span class="load-time">⏱️ ${page.estimatedLoadTime}</span>
                </div>
            </div>
        `;
    }

    /**
     * Create toolbar with demo controls
     */
    _createToolbar() {
        this.toolbar.innerHTML = `
            <div class="toolbar-section toolbar-left">
                <button id="demo-home" class="toolbar-btn" title="Home">🏠</button>
                <button id="demo-back" class="toolbar-btn" title="Previous Demo">←</button>
                <button id="demo-forward" class="toolbar-btn" title="Next Demo">→</button>
                <span class="toolbar-separator">|</span>
                <button id="demo-reload" class="toolbar-btn" title="Reload Demo">🔄</button>
                <button id="demo-fullscreen" class="toolbar-btn" title="Toggle Fullscreen">⛶</button>
            </div>
            <div class="toolbar-section toolbar-center">
                <span id="current-demo-title">Select a demo to begin</span>
            </div>
            <div class="toolbar-section toolbar-right">
                <button id="show-code" class="toolbar-btn" title="View Source Code">💻</button>
                <button id="show-performance" class="toolbar-btn" title="Performance Monitor">📊</button>
                <button id="demo-settings" class="toolbar-btn" title="Settings">⚙️</button>
                <button id="toggle-sidebar" class="toolbar-btn" title="Toggle Sidebar">📁</button>
            </div>
        `;
    }

    /**
     * Create main content area
     */
    _createContentArea() {
        this.contentArea.innerHTML = `
            <div class="demo-info-panel" id="demo-info-panel">
                <div class="welcome-content">
                    <h2>Welcome to SpaceGraphJS Enhanced Demos</h2>
                    <p>Explore comprehensive examples of the SpaceGraphJS library's capabilities.</p>
                    <div class="quick-stats">
                        <div class="stat-item">
                            <span class="stat-number">${this.enhancedPages.length}</span>
                            <span class="stat-label">Demos</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${this.demoCategories.size}</span>
                            <span class="stat-label">Categories</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${this._countUniqueFeatures()}</span>
                            <span class="stat-label">Features</span>
                        </div>
                    </div>
                    <div class="getting-started">
                        <h3>Getting Started</h3>
                        <ol>
                            <li>Browse demos by category in the sidebar</li>
                            <li>Use search to find specific features</li>
                            <li>Click on any demo to load it</li>
                            <li>Use toolbar buttons for additional options</li>
                        </ol>
                    </div>
                </div>
            </div>
            <div class="demo-details-panel" id="demo-details-panel" style="display: none;">
                <!-- Demo details will be populated here -->
            </div>
        `;
    }

    /**
     * Count unique features across all demos
     */
    _countUniqueFeatures() {
        const allFeatures = new Set();
        this.enhancedPages.forEach(page => {
            page.features.forEach(feature => allFeatures.add(feature));
        });
        return allFeatures.size;
    }

    /**
     * Create performance monitor overlay
     */
    _createPerformanceMonitor() {
        this.performanceMonitor = document.createElement('div');
        this.performanceMonitor.id = 'performance-monitor-overlay';
        this.performanceMonitor.className = 'overlay-panel performance-monitor';
        this.performanceMonitor.style.display = 'none';
        
        this.performanceMonitor.innerHTML = `
            <div class="overlay-header">
                <h3>📊 Performance Monitor</h3>
                <button class="close-overlay">×</button>
            </div>
            <div class="performance-metrics">
                <div class="metric-row">
                    <span class="metric-label">FPS:</span>
                    <span class="metric-value" id="perf-fps">--</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Frame Time:</span>
                    <span class="metric-value" id="perf-frametime">--</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Objects:</span>
                    <span class="metric-value" id="perf-objects">--</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Memory:</span>
                    <span class="metric-value" id="perf-memory">--</span>
                </div>
            </div>
            <div class="performance-chart">
                <canvas id="performance-chart" width="300" height="150"></canvas>
            </div>
        `;
        
        this.mainContainer.appendChild(this.performanceMonitor);
    }

    /**
     * Create code viewer overlay
     */
    _createCodeViewer() {
        this.codeViewer = document.createElement('div');
        this.codeViewer.id = 'code-viewer-overlay';
        this.codeViewer.className = 'overlay-panel code-viewer';
        this.codeViewer.style.display = 'none';
        
        this.codeViewer.innerHTML = `
            <div class="overlay-header">
                <h3>💻 Source Code</h3>
                <div class="code-controls">
                    <button id="copy-code">Copy</button>
                    <button id="download-code">Download</button>
                    <button class="close-overlay">×</button>
                </div>
            </div>
            <div class="code-content">
                <pre><code id="demo-source-code">// Select a demo to view its source code</code></pre>
            </div>
        `;
        
        this.mainContainer.appendChild(this.codeViewer);
    }

    /**
     * Apply enhanced styles
     */
    _applyEnhancedStyles() {
        const styles = `
            .enhanced-demo-runner {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000;
                display: grid;
                grid-template-areas: 
                    "toolbar toolbar"
                    "sidebar content";
                grid-template-rows: 50px 1fr;
                grid-template-columns: 320px 1fr;
                background: rgba(0, 0, 0, 0.1);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .demo-toolbar {
                grid-area: toolbar;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 15px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }

            .toolbar-section {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .toolbar-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .toolbar-btn:hover {
                background: rgba(255,255,255,0.3);
            }

            .toolbar-separator {
                margin: 0 5px;
                opacity: 0.5;
            }

            #current-demo-title {
                font-weight: 500;
                font-size: 14px;
            }

            .demo-sidebar {
                grid-area: sidebar;
                background: white;
                border-right: 1px solid #e0e0e0;
                overflow-y: auto;
                box-shadow: 2px 0 10px rgba(0,0,0,0.1);
            }

            .sidebar-header {
                padding: 20px;
                border-bottom: 1px solid #e0e0e0;
                background: #f8f9fa;
            }

            .sidebar-header h3 {
                margin: 0 0 15px 0;
                color: #333;
            }

            .search-container {
                display: flex;
                margin-bottom: 10px;
            }

            #demo-search {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px 0 0 4px;
                outline: none;
            }

            #search-clear {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-left: none;
                border-radius: 0 4px 4px 0;
                background: #f5f5f5;
                cursor: pointer;
            }

            .filter-container {
                display: flex;
                gap: 10px;
            }

            .filter-container select {
                flex: 1;
                padding: 6px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
            }

            .category-section {
                border-bottom: 1px solid #f0f0f0;
            }

            .category-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background: #f8f9fa;
                cursor: pointer;
                border-bottom: 1px solid #e9ecef;
            }

            .category-header:hover {
                background: #e9ecef;
            }

            .category-header h4 {
                margin: 0;
                color: #495057;
                font-size: 14px;
                font-weight: 600;
            }

            .demo-count {
                color: #6c757d;
                font-weight: normal;
                font-size: 12px;
            }

            .category-toggle {
                background: none;
                border: none;
                font-size: 18px;
                color: #6c757d;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .category-demos {
                background: white;
            }

            .demo-item {
                padding: 15px 20px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                transition: background 0.2s;
            }

            .demo-item:hover {
                background: #f8f9fa;
            }

            .demo-item.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .demo-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }

            .complexity-icon {
                font-size: 12px;
            }

            .demo-title {
                font-weight: 500;
                font-size: 14px;
            }

            .demo-description {
                font-size: 12px;
                color: #6c757d;
                margin-bottom: 8px;
                line-height: 1.4;
            }

            .demo-item.active .demo-description {
                color: rgba(255,255,255,0.8);
            }

            .demo-features {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                margin-bottom: 8px;
            }

            .feature-tag {
                background: #e9ecef;
                color: #495057;
                padding: 2px 6px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 500;
            }

            .demo-item.active .feature-tag {
                background: rgba(255,255,255,0.2);
                color: white;
            }

            .more-features {
                background: #6c757d;
                color: white;
                padding: 2px 6px;
                border-radius: 12px;
                font-size: 10px;
            }

            .demo-metadata {
                font-size: 11px;
                color: #6c757d;
            }

            .demo-item.active .demo-metadata {
                color: rgba(255,255,255,0.7);
            }

            .demo-content {
                grid-area: content;
                background: white;
                overflow: auto;
                position: relative;
            }

            .demo-info-panel, .demo-details-panel {
                padding: 30px;
                max-width: 800px;
                margin: 0 auto;
            }

            .welcome-content h2 {
                color: #333;
                margin-bottom: 15px;
            }

            .quick-stats {
                display: flex;
                gap: 30px;
                margin: 20px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #667eea;
            }

            .stat-item {
                text-align: center;
            }

            .stat-number {
                display: block;
                font-size: 24px;
                font-weight: bold;
                color: #667eea;
            }

            .stat-label {
                display: block;
                font-size: 12px;
                color: #6c757d;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .overlay-panel {
                position: absolute;
                top: 20px;
                right: 20px;
                width: 400px;
                max-height: 600px;
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                z-index: 1001;
            }

            .overlay-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid #e0e0e0;
                background: #f8f9fa;
                border-radius: 8px 8px 0 0;
            }

            .overlay-header h3 {
                margin: 0;
                font-size: 16px;
                color: #333;
            }

            .close-overlay {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #6c757d;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            }

            .close-overlay:hover {
                background: #e9ecef;
            }

            .performance-metrics {
                padding: 20px;
            }

            .metric-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                font-family: monospace;
            }

            .metric-label {
                color: #6c757d;
            }

            .metric-value {
                font-weight: bold;
                color: #333;
            }

            .code-viewer {
                width: 600px;
                max-height: 80vh;
            }

            .code-controls {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .code-controls button {
                padding: 6px 12px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }

            .code-content {
                max-height: 500px;
                overflow: auto;
                background: #f8f9fa;
            }

            .code-content pre {
                margin: 0;
                padding: 20px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.5;
                color: #333;
            }

            .sidebar-collapsed {
                grid-template-columns: 0 1fr;
            }

            .sidebar-collapsed .demo-sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s ease;
            }

            @media (max-width: 768px) {
                .enhanced-demo-runner {
                    grid-template-columns: 1fr;
                    grid-template-areas: 
                        "toolbar"
                        "content";
                }
                
                .demo-sidebar {
                    position: absolute;
                    left: -320px;
                    top: 50px;
                    height: calc(100% - 50px);
                    width: 320px;
                    z-index: 1002;
                    transition: left 0.3s ease;
                }
                
                .demo-sidebar.mobile-open {
                    left: 0;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    /**
     * Bind event listeners
     */
    _bindEvents() {
        // Demo selection
        this.sidebar.addEventListener('click', (e) => {
            const demoItem = e.target.closest('.demo-item');
            if (demoItem) {
                const demoId = demoItem.dataset.demoId;
                this.loadDemo(demoId);
            }
            
            const categoryHeader = e.target.closest('.category-header');
            if (categoryHeader) {
                this._toggleCategory(categoryHeader);
            }
        });
        
        // Search functionality
        const searchInput = document.getElementById('demo-search');
        const searchClear = document.getElementById('search-clear');
        const categoryFilter = document.getElementById('category-filter');
        const complexityFilter = document.getElementById('complexity-filter');
        
        searchInput?.addEventListener('input', (e) => this._filterDemos(e.target.value));
        searchClear?.addEventListener('click', () => {
            searchInput.value = '';
            this._filterDemos('');
        });
        
        categoryFilter?.addEventListener('change', (e) => this._filterByCategory(e.target.value));
        complexityFilter?.addEventListener('change', (e) => this._filterByComplexity(e.target.value));
        
        // Toolbar controls
        document.getElementById('demo-home')?.addEventListener('click', () => this._showHome());
        document.getElementById('demo-back')?.addEventListener('click', () => this._navigateDemo(-1));
        document.getElementById('demo-forward')?.addEventListener('click', () => this._navigateDemo(1));
        document.getElementById('demo-reload')?.addEventListener('click', () => this._reloadCurrentDemo());
        document.getElementById('demo-fullscreen')?.addEventListener('click', () => this._toggleFullscreen());
        document.getElementById('show-code')?.addEventListener('click', () => this._toggleCodeViewer());
        document.getElementById('show-performance')?.addEventListener('click', () => this._togglePerformanceMonitor());
        document.getElementById('toggle-sidebar')?.addEventListener('click', () => this._toggleSidebar());
        
        // Overlay controls
        this.mainContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-overlay')) {
                e.target.closest('.overlay-panel').style.display = 'none';
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this._handleKeyboardShortcuts(e));
    }

    /**
     * Load a specific demo
     */
    async loadDemo(demoId) {
        const page = this.enhancedPages.find(p => p.id === demoId);
        if (!page) {
            console.error(`Demo ${demoId} not found`);
            return;
        }
        
        try {
            // Update UI
            this._updateActiveDemoItem(demoId);
            this._updateToolbarTitle(page.title);
            this._showDemoDetails(page);
            
            // Add to history
            this.demoHistory.push(demoId);
            if (this.demoHistory.length > 10) {
                this.demoHistory.shift();
            }
            
            // Load the demo
            await this.space.importGraphFromJSON({ nodes: [], edges: [] });
            
            if (typeof page.createGraph === 'function') {
                const result = page.createGraph(this.space);
                console.log(`Loaded demo: ${page.title}`, result);
            }
            
            // Re-initialize layout
            const layoutPlugin = this.space.plugins.getPlugin('LayoutPlugin');
            layoutPlugin?.layoutManager?.kick?.();
            
            this.space.centerView(null, 0.8);
            this.currentDemo = page;
            
        } catch (error) {
            console.error(`Failed to load demo ${demoId}:`, error);
        }
    }

    /**
     * Update active demo item in sidebar
     */
    _updateActiveDemoItem(demoId) {
        this.sidebar.querySelectorAll('.demo-item').forEach(item => {
            item.classList.toggle('active', item.dataset.demoId === demoId);
        });
    }

    /**
     * Update toolbar title
     */
    _updateToolbarTitle(title) {
        const titleElement = document.getElementById('current-demo-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Show demo details in content area
     */
    _showDemoDetails(page) {
        const infoPanel = document.getElementById('demo-info-panel');
        const detailsPanel = document.getElementById('demo-details-panel');
        
        if (infoPanel) infoPanel.style.display = 'none';
        if (detailsPanel) {
            detailsPanel.style.display = 'block';
            detailsPanel.innerHTML = this._generateDemoDetailsHTML(page);
        }
    }

    /**
     * Generate detailed demo information HTML
     */
    _generateDemoDetailsHTML(page) {
        return `
            <div class="demo-details">
                <div class="demo-header-detailed">
                    <h2>${page.title}</h2>
                    <div class="demo-badges">
                        <span class="complexity-badge complexity-${page.complexity.toLowerCase()}">${page.complexity}</span>
                        <span class="category-badge">${page.category}</span>
                        <span class="load-time-badge">⏱️ ${page.estimatedLoadTime}</span>
                    </div>
                </div>
                
                <div class="demo-description-detailed">
                    <p>${page.description}</p>
                </div>
                
                <div class="demo-features-detailed">
                    <h3>Features Demonstrated</h3>
                    <div class="features-grid">
                        ${page.features.map(feature => 
                            `<span class="feature-badge">${feature}</span>`
                        ).join('')}
                    </div>
                </div>
                
                ${page.prerequisites.length > 0 ? `
                    <div class="demo-prerequisites">
                        <h3>Prerequisites</h3>
                        <ul>
                            ${page.prerequisites.map(prereq => `<li>${prereq}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="demo-instructions">
                    <h3>Instructions</h3>
                    <div id="demo-instructions-content">
                        <!-- Instructions will be populated after demo loads -->
                    </div>
                </div>
                
                <div class="demo-actions">
                    <button class="action-btn primary" onclick="window.demoRunner?.space?.centerView()">
                        🎯 Center View
                    </button>
                    <button class="action-btn" onclick="window.demoRunner?._toggleCodeViewer()">
                        💻 View Code
                    </button>
                    <button class="action-btn" onclick="window.demoRunner?._togglePerformanceMonitor()">
                        📊 Performance
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Toggle category collapse/expand
     */
    _toggleCategory(categoryHeader) {
        const categorySection = categoryHeader.closest('.category-section');
        const toggle = categoryHeader.querySelector('.category-toggle');
        const demos = categorySection.querySelector('.category-demos');
        
        const isCollapsed = demos.style.display === 'none';
        demos.style.display = isCollapsed ? 'block' : 'none';
        toggle.textContent = isCollapsed ? '−' : '+';
    }

    /**
     * Filter demos by search term
     */
    _filterDemos(searchTerm) {
        const term = searchTerm.toLowerCase();
        const demoItems = this.sidebar.querySelectorAll('.demo-item');
        
        demoItems.forEach(item => {
            const title = item.querySelector('.demo-title').textContent.toLowerCase();
            const description = item.querySelector('.demo-description').textContent.toLowerCase();
            const features = Array.from(item.querySelectorAll('.feature-tag'))
                .map(tag => tag.textContent.toLowerCase()).join(' ');
            
            const matches = title.includes(term) || description.includes(term) || features.includes(term);
            item.style.display = matches ? 'block' : 'none';
        });
        
        // Show/hide category sections based on visible demos
        this._updateCategoryVisibility();
    }

    /**
     * Filter demos by category
     */
    _filterByCategory(category) {
        const demoItems = this.sidebar.querySelectorAll('.demo-item');
        
        demoItems.forEach(item => {
            const itemCategory = item.dataset.category;
            const matches = !category || itemCategory === category;
            item.style.display = matches ? 'block' : 'none';
        });
        
        this._updateCategoryVisibility();
    }

    /**
     * Filter demos by complexity
     */
    _filterByComplexity(complexity) {
        const demoItems = this.sidebar.querySelectorAll('.demo-item');
        
        demoItems.forEach(item => {
            const itemComplexity = item.dataset.complexity;
            const matches = !complexity || itemComplexity === complexity;
            item.style.display = matches ? 'block' : 'none';
        });
        
        this._updateCategoryVisibility();
    }

    /**
     * Update category section visibility based on visible demos
     */
    _updateCategoryVisibility() {
        const categorySections = this.sidebar.querySelectorAll('.category-section');
        
        categorySections.forEach(section => {
            const visibleDemos = section.querySelectorAll('.demo-item[style*="block"], .demo-item:not([style])');
            section.style.display = visibleDemos.length > 0 ? 'block' : 'none';
        });
    }

    /**
     * Show home screen
     */
    _showHome() {
        const infoPanel = document.getElementById('demo-info-panel');
        const detailsPanel = document.getElementById('demo-details-panel');
        
        if (infoPanel) infoPanel.style.display = 'block';
        if (detailsPanel) detailsPanel.style.display = 'none';
        
        this._updateToolbarTitle('Select a demo to begin');
        this._updateActiveDemoItem(null);
        this.currentDemo = null;
    }

    /**
     * Navigate between demos
     */
    _navigateDemo(direction) {
        if (!this.currentDemo) return;
        
        const currentIndex = this.enhancedPages.findIndex(p => p.id === this.currentDemo.id);
        const newIndex = currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.enhancedPages.length) {
            this.loadDemo(this.enhancedPages[newIndex].id);
        }
    }

    /**
     * Reload current demo
     */
    _reloadCurrentDemo() {
        if (this.currentDemo) {
            this.loadDemo(this.currentDemo.id);
        }
    }

    /**
     * Toggle fullscreen mode
     */
    _toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }

    /**
     * Toggle code viewer
     */
    _toggleCodeViewer() {
        const isVisible = this.codeViewer.style.display !== 'none';
        this.codeViewer.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible && this.currentDemo) {
            this._loadDemoSourceCode(this.currentDemo);
        }
    }

    /**
     * Load demo source code
     */
    async _loadDemoSourceCode(demo) {
        try {
            // In a real implementation, this would fetch the actual source file
            const sourceCode = `// Source code for ${demo.title}\n// This would be loaded from the actual demo file\n\n// Demo metadata:\nexport const demoMetadata = ${JSON.stringify(demo, null, 2)};\n\n// Demo implementation would be here...`;
            
            const codeElement = document.getElementById('demo-source-code');
            if (codeElement) {
                codeElement.textContent = sourceCode;
            }
        } catch (error) {
            console.error('Failed to load source code:', error);
        }
    }

    /**
     * Toggle performance monitor
     */
    _togglePerformanceMonitor() {
        const isVisible = this.performanceMonitor.style.display !== 'none';
        this.performanceMonitor.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            this._startPerformanceMonitoring();
        } else {
            this._stopPerformanceMonitoring();
        }
    }

    /**
     * Start performance monitoring
     */
    _startPerformanceMonitoring() {
        if (this.space.performance) {
            this.space.on('performance:update', this._updatePerformanceDisplay.bind(this));
        }
    }

    /**
     * Stop performance monitoring
     */
    _stopPerformanceMonitoring() {
        if (this.space.performance) {
            this.space.off('performance:update', this._updatePerformanceDisplay.bind(this));
        }
    }

    /**
     * Update performance display
     */
    _updatePerformanceDisplay(metrics) {
        const updates = {
            'perf-fps': Math.round(metrics.frameRate || 60),
            'perf-frametime': `${(metrics.frameTime || 16.67).toFixed(1)}ms`,
            'perf-objects': metrics.objectCount || 0,
            'perf-memory': `${((metrics.memoryUsage || 0) / (1024 * 1024)).toFixed(1)}MB`
        };
        
        Object.entries(updates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    /**
     * Toggle sidebar visibility
     */
    _toggleSidebar() {
        this.mainContainer.classList.toggle('sidebar-collapsed');
    }

    /**
     * Handle keyboard shortcuts
     */
    _handleKeyboardShortcuts(e) {
        if (e.target.tagName === 'INPUT') return; // Don't handle shortcuts in input fields
        
        switch (e.key) {
            case 'h':
                e.preventDefault();
                this._showHome();
                break;
            case 'ArrowLeft':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this._navigateDemo(-1);
                }
                break;
            case 'ArrowRight':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this._navigateDemo(1);
                }
                break;
            case 'r':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this._reloadCurrentDemo();
                }
                break;
            case 'f':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this._toggleFullscreen();
                }
                break;
            case '/':
                e.preventDefault();
                document.getElementById('demo-search')?.focus();
                break;
        }
    }

    /**
     * Dispose of the demo runner
     */
    dispose() {
        if (this.mainContainer && this.mainContainer.parentNode) {
            this.mainContainer.parentNode.removeChild(this.mainContainer);
        }
        
        this._stopPerformanceMonitoring();
        console.log('EnhancedDemoRunner disposed');
    }
}