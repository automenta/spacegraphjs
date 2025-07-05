// Demo metadata for automatic loading
export const demoMetadata = {
    id: 'performance-optimization',
    title: '⚡ Performance Optimization',
    description: 'Large-scale graph with instancing, culling, LOD, and web workers'
};

/**
 * Performance Optimization Demo - Demonstrates performance features with large datasets
 */
export function createGraph(space) {
    return createPerformanceDemo(space);
}

function createPerformanceDemo(space) {
    console.log('Creating Performance Optimization Demo...');

    // Clear existing graph
    space.clear();

    // Get performance plugin
    const performancePlugin = space.plugins.getPlugin('PerformancePlugin');
    if (!performancePlugin) {
        console.warn('PerformancePlugin not found - performance features will not be available');
    }

    // Configure performance settings for this demo
    if (space.performance) {
        space.performance.updateConfig({
            enableInstancing: true,
            enableCulling: true,
            enableLOD: true,
            enableWorkers: true,
            autoOptimize: true,
            instanceThreshold: 5,
            maxRenderDistance: 2000
        });
    }

    // Create performance monitoring display
    createPerformanceMonitor(space);

    // Create large-scale graph structures
    createLargeNodeClusters(space);
    createRepeatingPatterns(space);
    createDistanceBasedLOD(space);
    createControlPanel(space);

    // Start performance monitoring
    if (space.performance) {
        space.performance.startMonitoring();
    }

    console.log('Performance Optimization Demo created successfully');
    
    return {
        name: 'Performance Optimization Demo',
        description: 'Large-scale graph demonstrating instancing, culling, LOD, and web workers',
        instructions: [
            'Zoom out to see massive object culling in action',
            'Zoom in to see level-of-detail (LOD) adaptation',
            'Move camera to test frustum culling',
            'Watch performance metrics in real-time',
            'Notice instanced objects (similar geometries)',
            'Use controls to toggle performance features'
        ]
    };
}

/**
 * Create performance monitoring display
 */
function createPerformanceMonitor(space) {
    const monitor = space.addNode('performance-monitor', 'html', {
        position: { x: -400, y: 300, z: 0 },
        content: `
            <div id="performance-metrics" class="performance-monitor">
                <h4>⚡ Performance Metrics</h4>
                <div class="metrics-grid">
                    <div class="metric">
                        <span class="label">FPS:</span>
                        <span id="fps-value">60</span>
                    </div>
                    <div class="metric">
                        <span class="label">Frame Time:</span>
                        <span id="frametime-value">16ms</span>
                    </div>
                    <div class="metric">
                        <span class="label">Objects:</span>
                        <span id="objects-value">0</span>
                    </div>
                    <div class="metric">
                        <span class="label">Visible:</span>
                        <span id="visible-value">0</span>
                    </div>
                    <div class="metric">
                        <span class="label">Instanced:</span>
                        <span id="instanced-value">0</span>
                    </div>
                    <div class="metric">
                        <span class="label">Memory:</span>
                        <span id="memory-value">0MB</span>
                    </div>
                </div>
                <div class="optimization-status">
                    <div id="optimizations-active">Optimizations: Active</div>
                </div>
            </div>
        `,
        size: { width: 250, height: 200 }
    });

    // Update performance metrics in real-time
    if (space.performance) {
        space.on('performance:update', (metrics) => {
            updatePerformanceDisplay(metrics);
        });
    }

    // Add CSS for performance monitor
    const style = document.createElement('style');
    style.textContent = `
        .performance-monitor {
            font-family: monospace;
            font-size: 12px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 10px;
            border-radius: 5px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
            margin-bottom: 10px;
        }
        .metric {
            display: flex;
            justify-content: space-between;
        }
        .label {
            color: #cccccc;
        }
        .optimization-status {
            text-align: center;
            color: #00ff00;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Update performance display
 */
function updatePerformanceDisplay(metrics) {
    const updates = {
        'fps-value': Math.round(metrics.frameRate || 60),
        'frametime-value': `${(metrics.frameTime || 16.67).toFixed(1)}ms`,
        'objects-value': metrics.objectCount || 0,
        'visible-value': metrics.visibleObjects || 0,
        'instanced-value': metrics.instancedObjects || 0,
        'memory-value': `${((metrics.memoryUsage || 0) / (1024 * 1024)).toFixed(1)}MB`
    };

    Object.entries(updates).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });

    // Update optimization status color based on performance
    const statusElement = document.getElementById('optimizations-active');
    if (statusElement && metrics.frameRate) {
        if (metrics.frameRate >= 55) {
            statusElement.style.color = '#00ff00'; // Green
            statusElement.textContent = 'Optimizations: Excellent';
        } else if (metrics.frameRate >= 45) {
            statusElement.style.color = '#ffff00'; // Yellow
            statusElement.textContent = 'Optimizations: Good';
        } else {
            statusElement.style.color = '#ff0000'; // Red
            statusElement.textContent = 'Optimizations: Active';
        }
    }
}

/**
 * Create large node clusters to test instancing and culling
 */
function createLargeNodeClusters(space) {
    const clusterCount = 5;
    const nodesPerCluster = 50;
    const clusterRadius = 200;
    const clusterDistance = 800;

    for (let cluster = 0; cluster < clusterCount; cluster++) {
        const clusterAngle = (cluster / clusterCount) * Math.PI * 2;
        const clusterX = Math.cos(clusterAngle) * clusterDistance;
        const clusterY = Math.sin(clusterAngle) * clusterDistance;
        const clusterZ = (cluster - clusterCount / 2) * 100;

        // Create cluster center node
        const centerNode = space.addNode(`cluster-${cluster}-center`, 'shape', {
            position: { x: clusterX, y: clusterY, z: clusterZ },
            shape: 'sphere',
            color: `hsl(${cluster * 72}, 80%, 60%)`,
            size: 20
        });

        // Create surrounding nodes (these will be instanced due to similarity)
        for (let i = 0; i < nodesPerCluster; i++) {
            const nodeAngle = (i / nodesPerCluster) * Math.PI * 2;
            const nodeRadius = Math.random() * clusterRadius + 50;
            
            const nodeX = clusterX + Math.cos(nodeAngle) * nodeRadius;
            const nodeY = clusterY + Math.sin(nodeAngle) * nodeRadius;
            const nodeZ = clusterZ + (Math.random() - 0.5) * 100;

            const node = space.addNode(`cluster-${cluster}-node-${i}`, 'shape', {
                position: { x: nodeX, y: nodeY, z: nodeZ },
                shape: 'box',
                color: `hsl(${cluster * 72}, 60%, 40%)`,
                size: 8 + Math.random() * 4
            });

            // Connect some nodes to center (test edge instancing)
            if (i % 3 === 0) {
                space.addEdge(`cluster-${cluster}-edge-${i}`, centerNode.id, node.id, 'straight');
            }

            // Connect to nearby nodes occasionally
            if (i > 0 && Math.random() < 0.3) {
                const targetIndex = Math.max(0, i - 1 - Math.floor(Math.random() * 3));
                space.addEdge(
                    `cluster-${cluster}-internal-${i}-${targetIndex}`, 
                    node.id, 
                    `cluster-${cluster}-node-${targetIndex}`, 
                    'curved'
                );
            }
        }
    }

    console.log(`Created ${clusterCount} clusters with ${nodesPerCluster} nodes each`);
}

/**
 * Create repeating patterns to maximize instancing benefits
 */
function createRepeatingPatterns(space) {
    const patternTypes = [
        { shape: 'sphere', color: '#ff6b6b', size: 6 },
        { shape: 'box', color: '#4ecdc4', size: 8 },
        { shape: 'cylinder', color: '#45b7d1', size: 7 },
        { shape: 'cone', color: '#f9ca24', size: 9 }
    ];

    const gridSize = 20;
    const spacing = 100;
    const startX = -gridSize * spacing / 2;
    const startY = -gridSize * spacing / 2;

    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            const patternIndex = (x + y) % patternTypes.length;
            const pattern = patternTypes[patternIndex];

            const nodeX = startX + x * spacing;
            const nodeY = startY + y * spacing;
            const nodeZ = -500 + Math.sin(x * 0.5) * Math.cos(y * 0.5) * 100;

            space.addNode(`pattern-${x}-${y}`, 'shape', {
                position: { x: nodeX, y: nodeY, z: nodeZ },
                shape: pattern.shape,
                color: pattern.color,
                size: pattern.size
            });

            // Add some connecting edges
            if (x > 0 && Math.random() < 0.2) {
                space.addEdge(
                    `pattern-edge-h-${x}-${y}`,
                    `pattern-${x}-${y}`,
                    `pattern-${x-1}-${y}`,
                    'straight'
                );
            }
            
            if (y > 0 && Math.random() < 0.2) {
                space.addEdge(
                    `pattern-edge-v-${x}-${y}`,
                    `pattern-${x}-${y}`,
                    `pattern-${x}-${y-1}`,
                    'straight'
                );
            }
        }
    }

    console.log(`Created ${gridSize}x${gridSize} repeating pattern grid`);
}

/**
 * Create distance-based LOD demonstration
 */
function createDistanceBasedLOD(space) {
    const distances = [500, 1000, 1500, 2000, 3000];
    const detailLevels = ['ultra-high', 'high', 'medium', 'low', 'minimal'];

    distances.forEach((distance, index) => {
        const angle = (index / distances.length) * Math.PI * 2;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        // Create nodes with different detail levels
        const detailNode = space.addNode(`lod-demo-${index}`, 'html', {
            position: { x: x, y: y, z: 0 },
            content: `
                <div class="lod-demo-node">
                    <h3>LOD Level: ${detailLevels[index]}</h3>
                    <p>Distance: ${distance}px</p>
                    <div class="detail-content">
                        ${index === 0 ? `
                            <ul>
                                <li>Ultra-high detail content</li>
                                <li>All features visible</li>
                                <li>High quality rendering</li>
                                <li>Complex interactions</li>
                            </ul>
                        ` : index === 1 ? `
                            <ul>
                                <li>High detail content</li>
                                <li>Most features visible</li>
                                <li>Good quality rendering</li>
                            </ul>
                        ` : index === 2 ? `
                            <p>Medium detail content with basic information</p>
                        ` : index === 3 ? `
                            <p>Low detail - essential info only</p>
                        ` : `
                            <p>Minimal</p>
                        `}
                    </div>
                </div>
            `,
            size: { 
                width: Math.max(100, 200 - index * 30), 
                height: Math.max(80, 150 - index * 20) 
            }
        });

        // Add surrounding detail nodes
        for (let i = 0; i < Math.max(1, 6 - index); i++) {
            const detailAngle = (i / Math.max(1, 6 - index)) * Math.PI * 2;
            const detailRadius = 50 + index * 10;
            
            const detailX = x + Math.cos(detailAngle) * detailRadius;
            const detailY = y + Math.sin(detailAngle) * detailRadius;

            space.addNode(`lod-detail-${index}-${i}`, 'shape', {
                position: { x: detailX, y: detailY, z: 0 },
                shape: 'sphere',
                color: `hsl(${index * 60}, 70%, 50%)`,
                size: Math.max(3, 8 - index)
            });

            space.addEdge(
                `lod-edge-${index}-${i}`,
                detailNode.id,
                `lod-detail-${index}-${i}`,
                'straight'
            );
        }
    });

    console.log('Created LOD demonstration nodes at various distances');
}

/**
 * Create control panel for performance features
 */
function createControlPanel(space) {
    const controlPanel = space.addNode('performance-controls', 'html', {
        position: { x: 400, y: 300, z: 0 },
        content: `
            <div class="performance-controls">
                <h4>⚡ Performance Controls</h4>
                <div class="control-group">
                    <label>
                        <input type="checkbox" id="instancing-toggle" checked>
                        Enable Instancing
                    </label>
                </div>
                <div class="control-group">
                    <label>
                        <input type="checkbox" id="culling-toggle" checked>
                        Enable Culling
                    </label>
                </div>
                <div class="control-group">
                    <label>
                        <input type="checkbox" id="lod-toggle" checked>
                        Enable LOD
                    </label>
                </div>
                <div class="control-group">
                    <label>
                        <input type="checkbox" id="workers-toggle" checked>
                        Enable Workers
                    </label>
                </div>
                <div class="control-group">
                    <button id="optimize-button">Optimize Now</button>
                </div>
                <div class="control-group">
                    <button id="cleanup-button">Cleanup Memory</button>
                </div>
                <div class="control-group">
                    <button id="stress-test-button">Add Stress Test</button>
                </div>
                <div class="stats-section">
                    <h5>Worker Stats</h5>
                    <div id="worker-stats">Checking...</div>
                </div>
            </div>
        `,
        size: { width: 220, height: 300 }
    });

    // Add event listeners for controls
    setTimeout(() => {
        const panel = controlPanel.htmlElement;
        if (!panel) return;

        // Feature toggles
        panel.querySelector('#instancing-toggle')?.addEventListener('change', (e) => {
            if (space.performance) {
                space.performance.setInstancingEnabled(e.target.checked);
            }
        });

        panel.querySelector('#culling-toggle')?.addEventListener('change', (e) => {
            if (space.performance) {
                space.performance.setCullingEnabled(e.target.checked);
            }
        });

        panel.querySelector('#lod-toggle')?.addEventListener('change', (e) => {
            if (space.performance) {
                space.performance.setLODEnabled(e.target.checked);
            }
        });

        panel.querySelector('#workers-toggle')?.addEventListener('change', (e) => {
            if (space.performance) {
                space.performance.setWorkersEnabled(e.target.checked);
            }
        });

        // Action buttons
        panel.querySelector('#optimize-button')?.addEventListener('click', () => {
            if (space.performance) {
                space.performance.optimize();
                console.log('Manual optimization triggered');
            }
        });

        panel.querySelector('#cleanup-button')?.addEventListener('click', () => {
            if (space.performance) {
                space.performance.cleanup();
                console.log('Memory cleanup triggered');
            }
        });

        panel.querySelector('#stress-test-button')?.addEventListener('click', () => {
            addStressTestNodes(space);
        });

        // Update worker stats periodically
        setInterval(() => {
            updateWorkerStats(panel);
        }, 2000);

    }, 100);

    // Add CSS for controls
    const style = document.createElement('style');
    style.textContent = `
        .performance-controls {
            font-family: Arial, sans-serif;
            font-size: 12px;
            padding: 10px;
        }
        .control-group {
            margin-bottom: 8px;
        }
        .control-group label {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .control-group button {
            width: 100%;
            padding: 5px;
            margin: 2px 0;
            border: 1px solid #ccc;
            border-radius: 3px;
            background: #f0f0f0;
            cursor: pointer;
        }
        .control-group button:hover {
            background: #e0e0e0;
        }
        .stats-section {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #ccc;
        }
        .stats-section h5 {
            margin: 0 0 5px 0;
        }
        #worker-stats {
            font-size: 10px;
            color: #666;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Update worker statistics display
 */
function updateWorkerStats(panel) {
    const statsElement = panel.querySelector('#worker-stats');
    if (!statsElement || !space.performance) return;

    const workerStats = space.performance.getWorkerStats();
    
    let statsText = 'No worker data';
    if (workerStats.workerManager) {
        const wm = workerStats.workerManager;
        statsText = `Workers: ${wm.totalWorkers}\nActive: ${wm.activeJobs}\nQueue: ${wm.queuedJobs}`;
    }
    
    statsElement.textContent = statsText;
}

/**
 * Add stress test nodes to test performance limits
 */
function addStressTestNodes(space) {
    const stressNodeCount = 100;
    const range = 1000;

    for (let i = 0; i < stressNodeCount; i++) {
        const x = (Math.random() - 0.5) * range;
        const y = (Math.random() - 0.5) * range;
        const z = (Math.random() - 0.5) * range;

        space.addNode(`stress-${Date.now()}-${i}`, 'shape', {
            position: { x, y, z },
            shape: Math.random() > 0.5 ? 'sphere' : 'box',
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            size: 3 + Math.random() * 5
        });
    }

    console.log(`Added ${stressNodeCount} stress test nodes`);
}