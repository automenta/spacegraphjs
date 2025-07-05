/**
 * DocumentationGenerator automatically creates comprehensive documentation
 * for SpaceGraphJS demos and library features.
 */
export class DocumentationGenerator {
    constructor(space, demoRunner) {
        this.space = space;
        this.demoRunner = demoRunner;
        this.apiDocumentation = new Map();
        this.demoDocumentation = new Map();
        this.featureMatrix = new Map();
        
        this._analyzeAPI();
        this._analyzeDemos();
        this._buildFeatureMatrix();
    }

    /**
     * Analyze the SpaceGraphJS API and generate documentation
     */
    _analyzeAPI() {
        // Analyze core SpaceGraph class
        this._documentClass('SpaceGraph', this.space, {
            description: 'The main SpaceGraphJS class for creating and managing 3D graph visualizations',
            category: 'Core',
            examples: [
                {
                    title: 'Basic initialization',
                    code: `const space = new SpaceGraph(container, {
    ui: {
        contextMenuElement: contextMenu,
        confirmDialogElement: confirmDialog
    }
});
await space.init();`
                }
            ]
        });

        // Analyze plugins
        if (this.space.plugins) {
            const plugins = this.space.plugins.getPlugins();
            plugins.forEach(plugin => {
                this._documentPlugin(plugin);
            });
        }

        // Analyze performance API
        if (this.space.performance) {
            this._documentAPI('Performance API', this.space.performance, {
                description: 'Performance monitoring and optimization controls',
                category: 'Performance'
            });
        }

        // Analyze fractal zoom API
        if (this.space.fractalZoom) {
            this._documentAPI('Fractal Zoom API', this.space.fractalZoom, {
                description: 'Infinite zoom capabilities with level-of-detail management',
                category: 'Zooming'
            });
        }
    }

    /**
     * Document a class and its methods
     */
    _documentClass(name, instance, metadata = {}) {
        const documentation = {
            name: name,
            type: 'class',
            description: metadata.description || `${name} class`,
            category: metadata.category || 'General',
            methods: [],
            properties: [],
            events: [],
            examples: metadata.examples || []
        };

        // Analyze methods
        const prototype = Object.getPrototypeOf(instance);
        const methods = Object.getOwnPropertyNames(prototype)
            .filter(prop => typeof instance[prop] === 'function' && prop !== 'constructor');

        methods.forEach(methodName => {
            if (!methodName.startsWith('_')) { // Skip private methods
                documentation.methods.push({
                    name: methodName,
                    signature: this._getMethodSignature(instance[methodName]),
                    description: this._generateMethodDescription(methodName),
                    parameters: this._extractParameters(instance[methodName]),
                    returnType: this._inferReturnType(methodName)
                });
            }
        });

        // Analyze properties
        const properties = Object.getOwnPropertyNames(instance)
            .filter(prop => !prop.startsWith('_') && typeof instance[prop] !== 'function');

        properties.forEach(propName => {
            documentation.properties.push({
                name: propName,
                type: typeof instance[propName],
                description: this._generatePropertyDescription(propName),
                value: this._getPropertyValue(instance[propName])
            });
        });

        this.apiDocumentation.set(name, documentation);
    }

    /**
     * Document a plugin
     */
    _documentPlugin(plugin) {
        const name = plugin.getName();
        this._documentClass(name, plugin, {
            description: `${name} provides specialized functionality for SpaceGraphJS`,
            category: 'Plugins'
        });
    }

    /**
     * Document an API object
     */
    _documentAPI(name, api, metadata = {}) {
        const documentation = {
            name: name,
            type: 'api',
            description: metadata.description || `${name} interface`,
            category: metadata.category || 'API',
            methods: [],
            properties: []
        };

        Object.getOwnPropertyNames(api).forEach(prop => {
            if (typeof api[prop] === 'function') {
                documentation.methods.push({
                    name: prop,
                    signature: this._getMethodSignature(api[prop]),
                    description: this._generateMethodDescription(prop)
                });
            } else {
                documentation.properties.push({
                    name: prop,
                    type: typeof api[prop],
                    description: this._generatePropertyDescription(prop)
                });
            }
        });

        this.apiDocumentation.set(name, documentation);
    }

    /**
     * Analyze demos and generate documentation
     */
    _analyzeDemos() {
        if (!this.demoRunner?.enhancedPages) return;

        this.demoRunner.enhancedPages.forEach(demo => {
            const documentation = {
                ...demo,
                codeAnalysis: this._analyzeCodePattern(demo),
                apiUsage: this._extractAPIUsage(demo),
                bestPractices: this._identifyBestPractices(demo),
                relatedConcepts: this._findRelatedConcepts(demo)
            };

            this.demoDocumentation.set(demo.id, documentation);
        });
    }

    /**
     * Analyze code patterns in a demo
     */
    _analyzeCodePattern(demo) {
        // This would analyze the actual demo code
        return {
            patterns: this._identifyPatterns(demo),
            complexity: demo.complexity,
            techniques: this._extractTechniques(demo)
        };
    }

    /**
     * Extract API usage from a demo
     */
    _extractAPIUsage(demo) {
        const usage = [];
        
        // Analyze which APIs the demo likely uses based on features
        if (demo.features.includes('Performance')) {
            usage.push('space.performance');
        }
        if (demo.features.includes('Fractal Zoom')) {
            usage.push('space.fractalZoom');
        }
        if (demo.features.includes('Layouts')) {
            usage.push('space.plugins.getPlugin("LayoutPlugin")');
        }
        if (demo.features.includes('Camera')) {
            usage.push('space.plugins.getPlugin("CameraPlugin")');
        }

        return usage;
    }

    /**
     * Identify best practices demonstrated in a demo
     */
    _identifyBestPractices(demo) {
        const practices = [];

        if (demo.complexity === 'Advanced') {
            practices.push('Error handling and cleanup');
            practices.push('Performance optimization');
        }

        if (demo.features.includes('Performance')) {
            practices.push('Memory management');
            practices.push('Efficient rendering techniques');
        }

        if (demo.features.includes('Widgets')) {
            practices.push('Component composition');
            practices.push('Event handling patterns');
        }

        return practices;
    }

    /**
     * Find related concepts for cross-referencing
     */
    _findRelatedConcepts(demo) {
        const related = [];

        // Find other demos with similar features
        this.demoRunner.enhancedPages.forEach(otherDemo => {
            if (otherDemo.id !== demo.id) {
                const commonFeatures = demo.features.filter(f => otherDemo.features.includes(f));
                if (commonFeatures.length > 0) {
                    related.push({
                        demo: otherDemo.id,
                        title: otherDemo.title,
                        commonFeatures: commonFeatures,
                        relationship: this._determineRelationship(demo, otherDemo)
                    });
                }
            }
        });

        return related.slice(0, 5); // Limit to 5 most related
    }

    /**
     * Build feature compatibility matrix
     */
    _buildFeatureMatrix() {
        const features = new Set();
        const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
        
        // Collect all features
        this.demoRunner?.enhancedPages?.forEach(demo => {
            demo.features.forEach(feature => features.add(feature));
        });

        // Build compatibility matrix
        features.forEach(feature => {
            this.featureMatrix.set(feature, {
                description: this._getFeatureDescription(feature),
                browserSupport: this._getBrowserSupport(feature),
                requirements: this._getFeatureRequirements(feature),
                alternatives: this._getFeatureAlternatives(feature)
            });
        });
    }

    /**
     * Generate comprehensive documentation
     */
    generateDocumentation() {
        return {
            overview: this._generateOverview(),
            quickStart: this._generateQuickStart(),
            apiReference: this._generateAPIReference(),
            demoGuide: this._generateDemoGuide(),
            featureMatrix: this._generateFeatureMatrix(),
            troubleshooting: this._generateTroubleshooting(),
            migration: this._generateMigrationGuide(),
            contributing: this._generateContributingGuide()
        };
    }

    /**
     * Generate overview documentation
     */
    _generateOverview() {
        return {
            title: 'SpaceGraphJS Documentation',
            description: 'A comprehensive 3D graph visualization library with fractal zooming capabilities',
            architecture: this._describeArchitecture(),
            keyFeatures: this._listKeyFeatures(),
            useCases: this._describeUseCases(),
            performance: this._describePerformance()
        };
    }

    /**
     * Generate quick start guide
     */
    _generateQuickStart() {
        return {
            title: 'Quick Start Guide',
            installation: this._getInstallationInstructions(),
            basicUsage: this._getBasicUsageExample(),
            firstDemo: this._getFirstDemoInstructions(),
            nextSteps: this._getNextStepsGuidance()
        };
    }

    /**
     * Generate API reference
     */
    _generateAPIReference() {
        const reference = {
            title: 'API Reference',
            categories: new Map()
        };

        this.apiDocumentation.forEach((doc, name) => {
            const category = doc.category;
            if (!reference.categories.has(category)) {
                reference.categories.set(category, []);
            }
            reference.categories.get(category).push(doc);
        });

        return reference;
    }

    /**
     * Generate demo guide
     */
    _generateDemoGuide() {
        const guide = {
            title: 'Demo Guide',
            introduction: 'Comprehensive examples showcasing SpaceGraphJS capabilities',
            categories: new Map(),
            learningPath: this._generateLearningPath()
        };

        // Group demos by category
        this.demoDocumentation.forEach((doc, id) => {
            const category = doc.category;
            if (!guide.categories.has(category)) {
                guide.categories.set(category, []);
            }
            guide.categories.get(category).push(doc);
        });

        return guide;
    }

    /**
     * Generate learning path
     */
    _generateLearningPath() {
        const path = [
            {
                level: 'Beginner',
                description: 'Start with basic concepts and simple demos',
                demos: this._getDemosByComplexity('Basic'),
                concepts: ['Graph basics', 'Node creation', 'Edge connections', 'Basic layouts']
            },
            {
                level: 'Intermediate',
                description: 'Explore advanced features and interactions',
                demos: this._getDemosByComplexity('Intermediate'),
                concepts: ['Camera controls', 'Custom widgets', 'Layout algorithms', 'User interactions']
            },
            {
                level: 'Advanced',
                description: 'Master performance optimization and complex scenarios',
                demos: this._getDemosByComplexity('Advanced'),
                concepts: ['Performance optimization', 'Fractal zooming', 'Web workers', 'Memory management']
            }
        ];

        return path;
    }

    /**
     * Generate feature compatibility matrix
     */
    _generateFeatureMatrix() {
        return {
            title: 'Feature Compatibility Matrix',
            description: 'Browser and device compatibility for SpaceGraphJS features',
            matrix: this.featureMatrix,
            recommendations: this._getCompatibilityRecommendations()
        };
    }

    /**
     * Export documentation as HTML
     */
    exportAsHTML() {
        const docs = this.generateDocumentation();
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SpaceGraphJS Documentation</title>
    <style>
        ${this._getDocumentationCSS()}
    </style>
</head>
<body>
    <nav class="docs-nav">
        <div class="nav-header">
            <h1>🧠 SpaceGraphJS</h1>
            <p>Interactive 3D Graph Visualization</p>
        </div>
        <ul class="nav-menu">
            <li><a href="#overview">Overview</a></li>
            <li><a href="#quick-start">Quick Start</a></li>
            <li><a href="#api-reference">API Reference</a></li>
            <li><a href="#demo-guide">Demo Guide</a></li>
            <li><a href="#feature-matrix">Feature Matrix</a></li>
            <li><a href="#troubleshooting">Troubleshooting</a></li>
        </ul>
    </nav>
    <main class="docs-content">
        ${this._renderOverview(docs.overview)}
        ${this._renderQuickStart(docs.quickStart)}
        ${this._renderAPIReference(docs.apiReference)}
        ${this._renderDemoGuide(docs.demoGuide)}
        ${this._renderFeatureMatrix(docs.featureMatrix)}
        ${this._renderTroubleshooting(docs.troubleshooting)}
    </main>
    <script>
        ${this._getDocumentationJS()}
    </script>
</body>
</html>
        `;
    }

    /**
     * Export documentation as JSON
     */
    exportAsJSON() {
        return JSON.stringify(this.generateDocumentation(), null, 2);
    }

    /**
     * Export documentation as Markdown
     */
    exportAsMarkdown() {
        const docs = this.generateDocumentation();
        
        let markdown = `# SpaceGraphJS Documentation\n\n`;
        markdown += `${docs.overview.description}\n\n`;
        
        // Table of Contents
        markdown += `## Table of Contents\n\n`;
        markdown += `- [Overview](#overview)\n`;
        markdown += `- [Quick Start](#quick-start)\n`;
        markdown += `- [API Reference](#api-reference)\n`;
        markdown += `- [Demo Guide](#demo-guide)\n`;
        markdown += `- [Feature Matrix](#feature-matrix)\n`;
        markdown += `- [Troubleshooting](#troubleshooting)\n\n`;
        
        // Overview
        markdown += `## Overview\n\n`;
        markdown += `${docs.overview.description}\n\n`;
        
        // Quick Start
        markdown += `## Quick Start\n\n`;
        markdown += this._renderQuickStartMarkdown(docs.quickStart);
        
        // API Reference
        markdown += `## API Reference\n\n`;
        markdown += this._renderAPIReferenceMarkdown(docs.apiReference);
        
        // Demo Guide
        markdown += `## Demo Guide\n\n`;
        markdown += this._renderDemoGuideMarkdown(docs.demoGuide);
        
        return markdown;
    }

    // Helper methods for generating specific documentation sections
    _getMethodSignature(func) {
        const funcStr = func.toString();
        const match = funcStr.match(/^(?:async\s+)?(?:function\s+)?(?:\w+\s*)?\(([^)]*)\)/);
        return match ? match[1] : '';
    }

    _generateMethodDescription(methodName) {
        const descriptions = {
            'init': 'Initialize the instance with default settings',
            'dispose': 'Clean up resources and remove event listeners',
            'update': 'Update the instance state',
            'render': 'Render the current state',
            'add': 'Add a new item',
            'remove': 'Remove an existing item',
            'get': 'Retrieve an item',
            'set': 'Set a property value',
            'on': 'Register an event listener',
            'off': 'Remove an event listener',
            'emit': 'Emit an event'
        };

        for (const [key, desc] of Object.entries(descriptions)) {
            if (methodName.toLowerCase().includes(key)) {
                return desc;
            }
        }

        return `${methodName} method`;
    }

    _generatePropertyDescription(propName) {
        const descriptions = {
            'id': 'Unique identifier',
            'name': 'Display name',
            'type': 'Type classification',
            'config': 'Configuration settings',
            'options': 'Available options',
            'enabled': 'Whether the feature is enabled',
            'visible': 'Whether the item is visible',
            'position': 'Spatial coordinates',
            'size': 'Dimensions',
            'color': 'Color value',
            'data': 'Associated data'
        };

        for (const [key, desc] of Object.entries(descriptions)) {
            if (propName.toLowerCase().includes(key)) {
                return desc;
            }
        }

        return `${propName} property`;
    }

    _getDemosByComplexity(complexity) {
        return Array.from(this.demoDocumentation.values())
            .filter(demo => demo.complexity === complexity)
            .map(demo => ({ id: demo.id, title: demo.title }));
    }

    _getDocumentationCSS() {
        return `
            * { box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 0;
                background: #f8f9fa;
                display: flex;
            }
            .docs-nav {
                width: 250px;
                background: white;
                height: 100vh;
                overflow-y: auto;
                border-right: 1px solid #e0e0e0;
                position: fixed;
                top: 0;
                left: 0;
            }
            .nav-header {
                padding: 20px;
                border-bottom: 1px solid #e0e0e0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .nav-header h1 { margin: 0 0 5px 0; font-size: 20px; }
            .nav-header p { margin: 0; opacity: 0.9; font-size: 12px; }
            .nav-menu {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .nav-menu li a {
                display: block;
                padding: 12px 20px;
                text-decoration: none;
                color: #333;
                border-bottom: 1px solid #f0f0f0;
                transition: background 0.2s;
            }
            .nav-menu li a:hover {
                background: #f8f9fa;
            }
            .docs-content {
                margin-left: 250px;
                padding: 30px;
                max-width: 800px;
            }
            .section {
                background: white;
                border-radius: 8px;
                padding: 30px;
                margin-bottom: 30px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            .section h2 {
                color: #333;
                border-bottom: 2px solid #667eea;
                padding-bottom: 10px;
                margin-top: 0;
            }
            .code-block {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                padding: 15px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                overflow-x: auto;
                margin: 15px 0;
            }
            .feature-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }
            .feature-card {
                background: #f8f9fa;
                border-radius: 6px;
                padding: 15px;
                border-left: 4px solid #667eea;
            }
            .feature-card h4 {
                margin: 0 0 10px 0;
                color: #333;
            }
            .api-method {
                background: #f8f9fa;
                border-radius: 4px;
                padding: 10px 15px;
                margin: 10px 0;
                border-left: 3px solid #28a745;
            }
            .demo-item {
                background: #f8f9fa;
                border-radius: 6px;
                padding: 15px;
                margin: 10px 0;
                border-left: 4px solid #007bff;
            }
        `;
    }

    _getDocumentationJS() {
        return `
            // Smooth scrolling for navigation links
            document.querySelectorAll('.nav-menu a').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });

            // Copy code blocks
            document.querySelectorAll('.code-block').forEach(block => {
                block.addEventListener('click', () => {
                    navigator.clipboard.writeText(block.textContent);
                    // Visual feedback
                    const original = block.style.background;
                    block.style.background = '#d4edda';
                    setTimeout(() => block.style.background = original, 200);
                });
            });
        `;
    }

    // Additional helper methods would be implemented here...
    _renderOverview(overview) { return `<section class="section" id="overview"><h2>Overview</h2><p>${overview.description}</p></section>`; }
    _renderQuickStart(quickStart) { return `<section class="section" id="quick-start"><h2>Quick Start</h2></section>`; }
    _renderAPIReference(apiRef) { return `<section class="section" id="api-reference"><h2>API Reference</h2></section>`; }
    _renderDemoGuide(demoGuide) { return `<section class="section" id="demo-guide"><h2>Demo Guide</h2></section>`; }
    _renderFeatureMatrix(matrix) { return `<section class="section" id="feature-matrix"><h2>Feature Matrix</h2></section>`; }
    _renderTroubleshooting(troubleshooting) { return `<section class="section" id="troubleshooting"><h2>Troubleshooting</h2></section>`; }

    // Placeholder implementations for other helper methods
    _extractParameters(func) { return []; }
    _inferReturnType(methodName) { return 'unknown'; }
    _getPropertyValue(value) { return typeof value === 'object' ? '[Object]' : String(value); }
    _identifyPatterns(demo) { return []; }
    _extractTechniques(demo) { return []; }
    _determineRelationship(demo1, demo2) { return 'similar'; }
    _getFeatureDescription(feature) { return `${feature} functionality`; }
    _getBrowserSupport(feature) { return { chrome: true, firefox: true, safari: true, edge: true }; }
    _getFeatureRequirements(feature) { return []; }
    _getFeatureAlternatives(feature) { return []; }
    _describeArchitecture() { return 'Plugin-based architecture with modular components'; }
    _listKeyFeatures() { return ['3D Visualization', 'Fractal Zooming', 'Performance Optimization']; }
    _describeUseCases() { return ['Data visualization', 'Network analysis', 'Interactive presentations']; }
    _describePerformance() { return 'Optimized for handling large datasets with smooth interactions'; }
    _getInstallationInstructions() { return 'npm install spacegraphjs'; }
    _getBasicUsageExample() { return 'const space = new SpaceGraph(container);'; }
    _getFirstDemoInstructions() { return 'Try the basic widgets demo first'; }
    _getNextStepsGuidance() { return 'Explore advanced features like fractal zooming'; }
    _getCompatibilityRecommendations() { return ['Use modern browsers', 'Enable hardware acceleration']; }
    _generateTroubleshooting() { return { title: 'Troubleshooting', common: [] }; }
    _generateMigrationGuide() { return { title: 'Migration Guide' }; }
    _generateContributingGuide() { return { title: 'Contributing Guide' }; }
    _renderQuickStartMarkdown(quickStart) { return '### Installation\n\n```bash\nnpm install spacegraphjs\n```\n\n'; }
    _renderAPIReferenceMarkdown(apiRef) { return '### API Methods\n\n'; }
    _renderDemoGuideMarkdown(demoGuide) { return '### Available Demos\n\n'; }
}