import { createContentAdapter } from '../../zoom/ContentAdapter.js';

// Demo metadata for automatic loading
export const demoMetadata = {
    id: 'fractal-zoom',
    title: '🌀 Fractal Zoom',
    description: 'Infinite zoom with level-of-detail management and content adaptation'
};

/**
 * Fractal Zoom Demo - Demonstrates infinite zoom capabilities with level-of-detail management
 */
export function createGraph(space) {
    return createFractalZoomDemo(space);
}

function createFractalZoomDemo(space) {
    console.log('Creating Fractal Zoom Demo...');

    // Ensure FractalZoomPlugin is enabled
    const fractalZoomPlugin = space.plugins.getPlugin('FractalZoomPlugin');
    if (!fractalZoomPlugin) {
        console.warn('FractalZoomPlugin not found - fractal zoom features will not be available');
    }

    // Clear existing graph
    space.clear();

    // Create demonstration nodes with different content types
    createOverviewNodes(space);
    createDetailNodes(space);
    createDataNodes(space);
    createTextNodes(space);
    
    // Setup custom LOD levels for this demo
    if (fractalZoomPlugin) {
        setupCustomLODLevels(space, fractalZoomPlugin);
    }

    // Setup content adapters
    setupContentAdapters(space);

    // Add zoom control instructions
    addZoomInstructions(space);

    console.log('Fractal Zoom Demo created successfully');
    
    return {
        name: 'Fractal Zoom Demo',
        description: 'Infinite zoom with level-of-detail management and content adaptation',
        instructions: [
            'Use mouse wheel to zoom in/out with fractal detail levels',
            'Notice how content changes at different zoom levels',
            'Observe node and edge detail adaptation',
            'Try zooming far in or out to see extreme detail changes'
        ]
    };
}

/**
 * Create overview-level nodes (visible at far zoom levels)
 */
function createOverviewNodes(space) {
    const overviewData = [
        { 
            id: 'overview-science', 
            position: { x: 0, y: 200, z: 0 },
            title: 'Science',
            summary: 'Scientific Domains',
            detail: 'Physics, Chemistry, Biology, Computer Science',
            full: `
                <h3>Scientific Domains</h3>
                <ul>
                    <li><strong>Physics</strong> - Study of matter and energy</li>
                    <li><strong>Chemistry</strong> - Study of atoms and molecules</li>
                    <li><strong>Biology</strong> - Study of living organisms</li>
                    <li><strong>Computer Science</strong> - Study of computation and information</li>
                </ul>
            `
        },
        { 
            id: 'overview-arts', 
            position: { x: 300, y: 200, z: 0 },
            title: 'Arts',
            summary: 'Creative Arts',
            detail: 'Visual Arts, Music, Literature, Theater',
            full: `
                <h3>Creative Arts</h3>
                <ul>
                    <li><strong>Visual Arts</strong> - Painting, sculpture, photography</li>
                    <li><strong>Music</strong> - Composition and performance</li>
                    <li><strong>Literature</strong> - Writing and storytelling</li>
                    <li><strong>Theater</strong> - Live performance and drama</li>
                </ul>
            `
        },
        { 
            id: 'overview-tech', 
            position: { x: -300, y: 200, z: 0 },
            title: 'Technology',
            summary: 'Tech Fields',
            detail: 'AI, Robotics, Web Development, Mobile Apps',
            full: `
                <h3>Technology Fields</h3>
                <ul>
                    <li><strong>Artificial Intelligence</strong> - Machine learning and neural networks</li>
                    <li><strong>Robotics</strong> - Automated systems and machines</li>
                    <li><strong>Web Development</strong> - Frontend and backend technologies</li>
                    <li><strong>Mobile Apps</strong> - iOS and Android development</li>
                </ul>
            `
        }
    ];

    overviewData.forEach(data => {
        const node = space.addNode(data.id, 'html', {
            position: data.position,
            content: data.summary,
            size: { width: 150, height: 100 }
        });
        
        // Store full content data for later use
        node.fractalData = data;
    });
}

/**
 * Create detail-level nodes (visible at medium zoom levels)
 */
function createDetailNodes(space) {
    const detailData = [
        {
            id: 'detail-physics',
            position: { x: -100, y: 50, z: 0 },
            parent: 'overview-science',
            title: 'Physics',
            data: {
                summary: 'Physics',
                detail: 'Quantum mechanics, thermodynamics, relativity',
                full: `
                    <h4>Physics Subfields</h4>
                    <div class="physics-content">
                        <p><strong>Quantum Mechanics:</strong> Study of particles at atomic scale</p>
                        <p><strong>Thermodynamics:</strong> Energy and heat transfer</p>
                        <p><strong>Relativity:</strong> Space, time, and gravity</p>
                        <p><strong>Electromagnetism:</strong> Electric and magnetic phenomena</p>
                    </div>
                `
            }
        },
        {
            id: 'detail-cs',
            position: { x: 100, y: 50, z: 0 },
            parent: 'overview-science',
            title: 'Computer Science',
            data: {
                summary: 'CS',
                detail: 'Algorithms, data structures, programming',
                full: `
                    <h4>Computer Science Areas</h4>
                    <div class="cs-content">
                        <p><strong>Algorithms:</strong> Problem-solving procedures</p>
                        <p><strong>Data Structures:</strong> Organization of data</p>
                        <p><strong>Programming:</strong> Writing computer instructions</p>
                        <p><strong>Software Engineering:</strong> Building large systems</p>
                    </div>
                `
            }
        }
    ];

    detailData.forEach(data => {
        const node = space.addNode(data.id, 'html', {
            position: data.position,
            content: data.data.summary,
            size: { width: 120, height: 80 }
        });
        
        node.fractalData = data.data;
        
        // Connect to parent
        if (data.parent) {
            space.addEdge(`${data.parent}-${data.id}`, data.parent, data.id, 'curved');
        }
    });
}

/**
 * Create data visualization nodes
 */
function createDataNodes(space) {
    const datasets = [
        {
            id: 'data-performance',
            position: { x: 200, y: -100, z: 0 },
            title: 'Performance Data',
            data: [
                { year: 2020, value: 85 },
                { year: 2021, value: 92 },
                { year: 2022, value: 88 },
                { year: 2023, value: 95 }
            ]
        },
        {
            id: 'data-usage',
            position: { x: -200, y: -100, z: 0 },
            title: 'Usage Statistics',
            data: {
                users: 1250000,
                sessions: 4500000,
                pageviews: 18000000,
                countries: 45
            }
        }
    ];

    datasets.forEach(dataset => {
        const node = space.addNode(dataset.id, 'html', {
            position: dataset.position,
            content: `<div class="data-summary">${dataset.title}</div>`,
            size: { width: 140, height: 90 }
        });
        
        node.fractalData = { type: 'data', ...dataset };
    });
}

/**
 * Create text-heavy nodes for progressive revelation
 */
function createTextNodes(space) {
    const textData = [
        {
            id: 'text-ai',
            position: { x: 0, y: -250, z: 0 },
            title: 'Artificial Intelligence',
            summary: 'AI Overview',
            detail: 'Machine learning, neural networks, and intelligent systems for automation and decision making.',
            full: `
                <h3>Artificial Intelligence</h3>
                <p>Artificial Intelligence (AI) represents one of the most transformative technologies of our time. It encompasses a broad range of techniques and approaches designed to create systems that can perform tasks typically requiring human intelligence.</p>
                
                <h4>Key Areas:</h4>
                <ul>
                    <li><strong>Machine Learning:</strong> Algorithms that learn from data without explicit programming</li>
                    <li><strong>Deep Learning:</strong> Neural networks with multiple layers for complex pattern recognition</li>
                    <li><strong>Natural Language Processing:</strong> Understanding and generating human language</li>
                    <li><strong>Computer Vision:</strong> Interpreting and analyzing visual information</li>
                    <li><strong>Robotics:</strong> Integrating AI with physical systems</li>
                </ul>
                
                <h4>Applications:</h4>
                <p>AI is revolutionizing industries from healthcare and finance to transportation and entertainment. Self-driving cars, medical diagnosis systems, recommendation engines, and virtual assistants are just a few examples of AI in action.</p>
                
                <h4>Future Prospects:</h4>
                <p>As AI continues to advance, we can expect to see even more sophisticated applications, including artificial general intelligence (AGI) that could match or exceed human cognitive abilities across all domains.</p>
            `
        }
    ];

    textData.forEach(data => {
        const node = space.addNode(data.id, 'html', {
            position: data.position,
            content: data.summary,
            size: { width: 160, height: 100 }
        });
        
        node.fractalData = data;
    });
}

/**
 * Setup custom LOD levels for this demo
 */
function setupCustomLODLevels(space, fractalZoomPlugin) {
    // Add extreme zoom out level
    fractalZoomPlugin.addLODLevel(-8, {
        name: 'satellite',
        nodeDetailLevel: 'none',
        edgeDetailLevel: 'none',
        labelsVisible: false,
        textScale: 0.3,
        geometryQuality: 'minimal'
    });

    // Add extreme zoom in level
    fractalZoomPlugin.addLODLevel(8, {
        name: 'microscopic',
        nodeDetailLevel: 'ultra-high',
        edgeDetailLevel: 'ultra-high',
        labelsVisible: true,
        textScale: 2.0,
        geometryQuality: 'ultra'
    });

    // Add intermediate levels
    fractalZoomPlugin.addLODLevel(1, {
        name: 'focused',
        nodeDetailLevel: 'medium-high',
        edgeDetailLevel: 'medium-high',
        labelsVisible: true,
        textScale: 1.1,
        geometryQuality: 'medium-high'
    });
}

/**
 * Setup content adapters for all nodes
 */
function setupContentAdapters(space) {
    const fractalZoomPlugin = space.plugins.getPlugin('FractalZoomPlugin');
    if (!fractalZoomPlugin) return;

    space.getNodes().forEach(node => {
        if (!node.fractalData) return;

        let adapter;

        if (node.fractalData.type === 'data') {
            // Data visualization adapter
            adapter = createContentAdapter(node.id, 'data', { data: node.fractalData.data });
            
            adapter.defineDataLevels({
                summary: {
                    minZoom: -10,
                    maxZoom: -1,
                    type: 'summary',
                    summaryFunction: (data) => {
                        if (Array.isArray(data)) {
                            return `Dataset (${data.length} items)`;
                        } else {
                            return `Data Object (${Object.keys(data).length} fields)`;
                        }
                    }
                },
                chart: {
                    minZoom: -1,
                    maxZoom: 4,
                    type: 'chart',
                    chartType: 'bar',
                    title: node.fractalData.title
                },
                table: {
                    minZoom: 4,
                    maxZoom: 8,
                    type: 'table',
                    maxRows: 10
                },
                raw: {
                    minZoom: 8,
                    maxZoom: 20,
                    type: 'raw'
                }
            });

        } else if (node.fractalData.summary && node.fractalData.detail && node.fractalData.full) {
            // Progressive text adapter
            adapter = createContentAdapter(node.id, 'text');
            adapter.defineProgressiveText(
                node.fractalData.summary,
                node.fractalData.detail,
                node.fractalData.full
            );

        } else {
            // Simple HTML adapter
            adapter = createContentAdapter(node.id, 'html');
            adapter.defineHTMLLevel(-10, 10, node.fractalData.content || node.fractalData.summary);
        }

        if (adapter) {
            fractalZoomPlugin.addContentAdapter(node.id, adapter);
        }
    });
}

/**
 * Add zoom instruction panel
 */
function addZoomInstructions(space) {
    const instructionsNode = space.addNode('zoom-instructions', 'html', {
        position: { x: 400, y: -200, z: 0 },
        content: `
            <div class="zoom-instructions">
                <h4>🌀 Fractal Zoom Controls</h4>
                <p><strong>Mouse Wheel:</strong> Zoom in/out</p>
                <p><strong>Zoom Levels:</strong></p>
                <ul>
                    <li>-8 to -5: Satellite view</li>
                    <li>-2 to 0: Overview</li>
                    <li>0 to 3: Normal detail</li>
                    <li>3 to 6: High detail</li>
                    <li>6+: Microscopic view</li>
                </ul>
                <p><em>Content adapts automatically!</em></p>
            </div>
        `,
        size: { width: 200, height: 160 }
    });

    // Create a simple content adapter for instructions
    const fractalZoomPlugin = space.plugins.getPlugin('FractalZoomPlugin');
    if (fractalZoomPlugin) {
        const adapter = createContentAdapter('zoom-instructions', 'html');
        
        adapter.defineHTMLLevel(-10, -2, '<div class="zoom-help">🌀 Zoom Controls</div>');
        adapter.defineHTMLLevel(-2, 10, instructionsNode.htmlElement.innerHTML);
        
        fractalZoomPlugin.addContentAdapter('zoom-instructions', adapter);
    }
}