import * as THREE from 'three';

const demoMetadata = {
    id: 'advanced-layouts',
    title: 'Advanced Layout Systems',
    description: `<h3>Advanced Layout Systems</h3>
                  <p>Demonstrates next-generation layout capabilities including constraint-based positioning, 
                  nested container layouts, adaptive layout selection, and inter-layout connectivity.</p>
                  <ul>
                    <li>Constraint-based layouts with distance, position, and angle constraints</li>
                    <li>Nested container layouts with hierarchical arrangement</li>
                    <li>Adaptive layouts that automatically select optimal arrangements</li>
                    <li>Layout connectors for visualizing relationships between layout regions</li>
                    <li>Morphing transitions between different layout types</li>
                    <li>Hybrid layout modes combining multiple layout systems</li>
                    <li>Basic <b>TreeMapLayout</b> and <b>RadialLayout</b> (experimental stubs)</li>
                  </ul>`
};

function createGraph(space) {
    const demo = {
        title: 'Advanced Layout Systems',
        description: 'Constraint-based, nested, adaptive, and connected layouts with morphing transitions',
        
        init() {
            this.setupUI();
            this.createDemoGraph();
            this.setupAdvancedLayoutManager();
        },

        setupUI() {
            this.ui = document.createElement('div');
            this.ui.style.cssText = `
                position: absolute;
                top: 20px;
                left: 20px;
                background: rgba(20, 20, 30, 0.95);
                border: 1px solid rgba(100, 150, 255, 0.3);
                border-radius: 12px;
                padding: 20px;
                color: white;
                font-family: 'Monaco', 'Consolas', monospace;
                font-size: 12px;
                min-width: 300px;
                backdrop-filter: blur(10px);
                z-index: 1000;
            `;

            this.ui.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #64B5F6;">Advanced Layout Systems</h3>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; color: #B3E5FC;">Layout Type:</label>
                    <select id="layoutType" style="width: 100%; padding: 6px; background: #1a1a2e; color: white; border: 1px solid #444; border-radius: 4px;">
                        <option value="force">Force Layout</option>
                        <option value="hierarchical">Hierarchical</option>
                        <option value="circular">Circular</option>
                        <option value="grid">Grid</option>
                        <option value="spherical">Spherical</option> {/* Added from original list of layouts, good to have */}
                        <option value="radial">Radial (Experimental)</option>
                        <option value="treemap">TreeMap (Experimental)</option>
                        <option value="constraint">Constraint-Based</option>
                        <option value="nested">Nested Containers</option>
                        <option value="adaptive">Adaptive</option>
                        <option value="hybrid">Hybrid Mode</option>
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; color: #B3E5FC;">Layout Mode:</label>
                    <select id="layoutMode" style="width: 100%; padding: 6px; background: #1a1a2e; color: white; border: 1px solid #444; border-radius: 4px;">
                        <option value="standard">Standard</option>
                        <option value="constraint">Constraint</option>
                        <option value="nested">Nested</option>
                        <option value="adaptive">Adaptive</option>
                        <option value="hybrid">Hybrid</option>
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <button id="applyLayout" style="padding: 8px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Apply Layout</button>
                    <button id="morphLayouts" style="padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Morph Demo</button>
                </div>

                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0; color: #81C784;">Features:</h4>
                    <label style="display: block; margin-bottom: 5px;">
                        <input type="checkbox" id="enableConstraints" style="margin-right: 8px;"> Constraints
                    </label>
                    <label style="display: block; margin-bottom: 5px;">
                        <input type="checkbox" id="enableNesting" style="margin-right: 8px;"> Nesting
                    </label>
                    <label style="display: block; margin-bottom: 5px;">
                        <input type="checkbox" id="enableAdaptive" style="margin-right: 8px;"> Adaptive
                    </label>
                    <label style="display: block; margin-bottom: 5px;">
                        <input type="checkbox" id="enableConnections" checked style="margin-right: 8px;"> Connections
                    </label>
                </div>

                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0; color: #FFB74D;">Actions:</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button id="addConstraint" style="padding: 6px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Add Constraint</button>
                        <button id="addContainer" style="padding: 6px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Add Container</button>
                        <button id="forceAdapt" style="padding: 6px; background: #E91E63; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Force Adapt</button>
                        <button id="showConnections" style="padding: 6px; background: #00BCD4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Show Connections</button>
                    </div>
                </div>

                <div id="layoutInfo" style="background: rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 6px; font-size: 11px;">
                    <div id="currentLayout">Current: Standard</div>
                    <div id="nodeCount">Nodes: 0</div>
                    <div id="edgeCount">Edges: 0</div>
                    <div id="layoutMetrics">Density: 0.00</div>
                </div>
            `;

            document.body.appendChild(this.ui);
            this.setupEventListeners();
        },

        setupEventListeners() {
            const applyButton = document.getElementById('applyLayout');
            const morphButton = document.getElementById('morphLayouts');
            const constraintsCheck = document.getElementById('enableConstraints');
            const nestingCheck = document.getElementById('enableNesting');
            const adaptiveCheck = document.getElementById('enableAdaptive');
            const connectionsCheck = document.getElementById('enableConnections');

            applyButton.addEventListener('click', () => {
                const layoutType = document.getElementById('layoutType').value;
                const layoutMode = document.getElementById('layoutMode').value;
                this.applySelectedLayout(layoutType, layoutMode);
            });

            morphButton.addEventListener('click', () => {
                this.demonstrateMorphing();
            });

            constraintsCheck.addEventListener('change', (e) => {
                this.layoutManager.enableAdvancedFeatures({ constraints: e.target.checked });
            });

            nestingCheck.addEventListener('change', (e) => {
                this.layoutManager.enableAdvancedFeatures({ nesting: e.target.checked });
            });

            adaptiveCheck.addEventListener('change', (e) => {
                this.layoutManager.enableAdvancedFeatures({ adaptive: e.target.checked });
            });

            connectionsCheck.addEventListener('change', (e) => {
                this.layoutManager.enableAdvancedFeatures({ connections: e.target.checked });
                if (e.target.checked) {
                    this.layoutManager.activateConnections();
                } else {
                    this.layoutManager.deactivateConnections();
                }
            });

            document.getElementById('addConstraint').addEventListener('click', () => {
                this.addRandomConstraint();
            });

            document.getElementById('addContainer').addEventListener('click', () => {
                this.addContainerNode();
            });

            document.getElementById('forceAdapt').addEventListener('click', () => {
                this.forceAdaptation();
            });

            document.getElementById('showConnections').addEventListener('click', () => {
                this.showLayoutConnections();
            });

            // Layout type change handler
            document.getElementById('layoutType').addEventListener('change', (e) => {
                this.updateLayoutMode(e.target.value);
            });
        },

        updateLayoutMode(layoutType) {
            const modeSelect = document.getElementById('layoutMode');
            
            // Auto-select appropriate mode based on layout type
            switch (layoutType) {
                case 'constraint':
                    modeSelect.value = 'constraint';
                    break;
                case 'nested':
                    modeSelect.value = 'nested';
                    break;
                case 'adaptive':
                    modeSelect.value = 'adaptive';
                    break;
                case 'hybrid':
                    modeSelect.value = 'hybrid';
                    break;
                default:
                    modeSelect.value = 'standard';
            }
        },

        createDemoGraph() {
            this.nodes = [];
            this.edges = [];
            this.containers = [];

            // Create main cluster of nodes
            for (let i = 0; i < 20; i++) {
                const node = space.addNode({
                    id: `node_${i}`,
                    type: i % 4 === 0 ? 'ControlPanelNode' : (i % 4 === 1 ? 'ProgressNode' : 'ShapeNode'),
                    position: {
                        x: (Math.random() - 0.5) * 400,
                        y: (Math.random() - 0.5) * 400,
                        z: (Math.random() - 0.5) * 200
                    },
                    data: {
                        group: i < 10 ? 'A' : 'B',
                        mass: 1 + Math.random() * 2,
                        clusterId: Math.floor(i / 5)
                    }
                });
                this.nodes.push(node);
            }

            // Create hierarchical structure
            for (let i = 20; i < 30; i++) {
                const parentIndex = Math.floor((i - 20) / 3);
                const parent = this.nodes[parentIndex];
                
                const node = space.addNode({
                    id: `hierarchy_${i}`,
                    type: 'TextMeshNode',
                    position: {
                        x: parent.position.x + (Math.random() - 0.5) * 100,
                        y: parent.position.y - 100,
                        z: parent.position.z + (Math.random() - 0.5) * 50
                    },
                    data: {
                        group: 'hierarchy',
                        parent: parent.id
                    }
                });
                this.nodes.push(node);

                // Create edge to parent
                const edge = space.addEdge({
                    id: `hierarchy_edge_${i}`,
                    source: parent,
                    target: node,
                    type: 'SpringEdge',
                    data: {
                        constraintType: 'elastic',
                        constraintParams: {
                            idealLength: 120,
                            stiffness: 0.3
                        }
                    }
                });
                this.edges.push(edge);
            }

            // Create some random connections
            for (let i = 0; i < 25; i++) {
                const source = this.nodes[Math.floor(Math.random() * this.nodes.length)];
                const target = this.nodes[Math.floor(Math.random() * this.nodes.length)];
                
                if (source !== target && !this.hasEdge(source, target)) {
                    const edge = space.addEdge({
                        id: `edge_${i}`,
                        source,
                        target,
                        type: Math.random() > 0.7 ? 'FlowEdge' : 'BezierEdge',
                        data: {
                            constraintType: Math.random() > 0.5 ? 'elastic' : 'rigid',
                            constraintParams: {
                                idealLength: 150 + Math.random() * 100,
                                stiffness: 0.1 + Math.random() * 0.5
                            }
                        }
                    });
                    this.edges.push(edge);
                }
            }

            this.updateLayoutInfo();
        },

        hasEdge(source, target) {
            return this.edges.some(edge => 
                (edge.source === source && edge.target === target) ||
                (edge.source === target && edge.target === source)
            );
        },

        setupAdvancedLayoutManager() {
            // Get the layout manager from space and enhance it
            this.layoutManager = space.layoutManager;
            
            // Enable advanced features
            this.layoutManager.enableAdvancedFeatures({
                constraints: false,
                nesting: false,
                adaptive: false,
                connections: true,
                autoMode: false
            });

            // Register layout regions for connections
            this.registerLayoutRegions();

            // Listen for layout events
            space.on('layout:started', (event) => {
                this.updateLayoutInfo(event);
            });

            space.on('layout:adapted', (event) => {
                console.log(`Layout adapted from ${event.from} to ${event.to} (${event.reason})`);
                this.updateLayoutInfo();
            });
        },

        registerLayoutRegions() {
            // Create layout regions for connection system
            const groupANodes = this.nodes.filter(n => n.data.group === 'A');
            const groupBNodes = this.nodes.filter(n => n.data.group === 'B');
            const hierarchyNodes = this.nodes.filter(n => n.data.group === 'hierarchy');

            if (groupANodes.length > 0) {
                const boundsA = this.calculateNodeGroupBounds(groupANodes);
                this.layoutManager.registerLayoutRegion('groupA', boundsA, 'force', groupANodes);
            }

            if (groupBNodes.length > 0) {
                const boundsB = this.calculateNodeGroupBounds(groupBNodes);
                this.layoutManager.registerLayoutRegion('groupB', boundsB, 'circular', groupBNodes);
            }

            if (hierarchyNodes.length > 0) {
                const boundsH = this.calculateNodeGroupBounds(hierarchyNodes);
                this.layoutManager.registerLayoutRegion('hierarchy', boundsH, 'hierarchical', hierarchyNodes);
            }

            // Add some inter-group connections
            this.addLayoutConnections();
        },

        calculateNodeGroupBounds(nodes) {
            if (nodes.length === 0) return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };

            const positions = nodes.map(n => n.position);
            const min = {
                x: Math.min(...positions.map(p => p.x)) - 50,
                y: Math.min(...positions.map(p => p.y)) - 50,
                z: Math.min(...positions.map(p => p.z)) - 50
            };
            const max = {
                x: Math.max(...positions.map(p => p.x)) + 50,
                y: Math.max(...positions.map(p => p.y)) + 50,
                z: Math.max(...positions.map(p => p.z)) + 50
            };

            return {
                min: new THREE.Vector3(min.x, min.y, min.z),
                max: new THREE.Vector3(max.x, max.y, max.z),
                center: new THREE.Vector3((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2)
            };
        },

        addLayoutConnections() {
            // Add connections between different groups
            const groupANodes = this.nodes.filter(n => n.data.group === 'A');
            const groupBNodes = this.nodes.filter(n => n.data.group === 'B');

            if (groupANodes.length > 0 && groupBNodes.length > 0) {
                for (let i = 0; i < 3; i++) {
                    const sourceNode = groupANodes[Math.floor(Math.random() * groupANodes.length)];
                    const targetNode = groupBNodes[Math.floor(Math.random() * groupBNodes.length)];
                    
                    this.layoutManager.addLayoutConnection(sourceNode.id, targetNode.id, {
                        type: 'curved',
                        metadata: {
                            color: 0x00ff88,
                            width: 3,
                            opacity: 0.8
                        }
                    });
                }
            }
        },

        applySelectedLayout(layoutType, layoutMode) {
            const config = {
                mode: layoutMode,
                baseLayout: layoutType !== 'constraint' && layoutType !== 'nested' && layoutType !== 'adaptive' ? layoutType : 'force',
                animate: true,
                animationDuration: 0.8
            };

            // Add specific configurations based on layout type
            switch (layoutType) {
                case 'constraint':
                    config.enableCollisionAvoidance = true;
                    config.iterations = 100;
                    break;
                case 'nested':
                    config.containerPadding = 60;
                    config.autoResize = true;
                    break;
                case 'adaptive':
                    config.enableAutoAdaptation = true;
                    config.adaptationDelay = 3000;
                    break;
                case 'hybrid':
                    config.hybridPriority = ['adaptive', 'nested', 'constraint', 'standard'];
                    break;
            }

            this.layoutManager.setLayoutMode(layoutMode);
            this.layoutManager.applyLayout(layoutType, config);
        },

        async demonstrateMorphing() {
            const layouts = ['circular', 'grid', 'force', 'hierarchical', 'spherical', 'radial', 'treemap'];
            
            for (const layout of layouts) {
                // Add a check for experimental layouts if they might not be fully functional for morphing
                // For now, assume they can be called.
                await new Promise(resolve => {
                    this.applySelectedLayout(layout, 'standard');
                    setTimeout(resolve, 2000);
                });
            }
        },

        addRandomConstraint() {
            if (this.nodes.length < 2) return;

            const constraintTypes = ['distance', 'position', 'angle'];
            const type = constraintTypes[Math.floor(Math.random() * constraintTypes.length)];

            switch (type) {
                case 'distance':
                    const node1 = this.nodes[Math.floor(Math.random() * this.nodes.length)];
                    const node2 = this.nodes[Math.floor(Math.random() * this.nodes.length)];
                    if (node1 !== node2) {
                        this.layoutManager.addDistanceConstraint(node1.id, node2.id, {
                            distance: 200 + Math.random() * 100,
                            strength: 0.5 + Math.random() * 0.5
                        });
                    }
                    break;
                case 'position':
                    const node = this.nodes[Math.floor(Math.random() * this.nodes.length)];
                    const targetPos = new THREE.Vector3(
                        (Math.random() - 0.5) * 300,
                        (Math.random() - 0.5) * 300,
                        (Math.random() - 0.5) * 150
                    );
                    this.layoutManager.addPositionConstraint(node.id, targetPos, {
                        strength: 0.8
                    });
                    break;
                case 'angle':
                    if (this.nodes.length >= 3) {
                        const nodes = this.nodes.slice().sort(() => Math.random() - 0.5).slice(0, 3);
                        this.layoutManager.addAngleConstraint(nodes[0].id, nodes[1].id, nodes[2].id, {
                            angle: Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 2,
                            strength: 0.3
                        });
                    }
                    break;
            }

            console.log(`Added ${type} constraint`);
        },

        addContainerNode() {
            const containerNode = space.addNode({
                id: `container_${Date.now()}`,
                type: 'MetaWidgetNode',
                position: {
                    x: (Math.random() - 0.5) * 200,
                    y: (Math.random() - 0.5) * 200,
                    z: 0
                },
                data: {
                    isContainer: true,
                    childLayout: 'grid',
                    layoutConfig: {
                        columns: 3,
                        spacing: 40
                    },
                    autoResize: true
                }
            });

            // Add some existing nodes to the container
            const availableNodes = this.nodes.filter(n => !n.data.parentContainer);
            const nodesToAdd = availableNodes.slice(0, Math.min(6, availableNodes.length));
            
            nodesToAdd.forEach(node => {
                this.layoutManager.addNodeToContainer(node, containerNode.id);
            });

            this.containers.push(containerNode);
            this.nodes.push(containerNode);

            console.log(`Added container with ${nodesToAdd.length} child nodes`);
        },

        forceAdaptation() {
            const layouts = ['force', 'circular', 'grid', 'hierarchical'];
            const currentLayout = this.layoutManager.getCurrentLayout();
            const availableLayouts = layouts.filter(l => l !== currentLayout.name);
            const targetLayout = availableLayouts[Math.floor(Math.random() * availableLayouts.length)];
            
            this.layoutManager.forceAdaptation(targetLayout, 'manual_demo');
            console.log(`Forced adaptation to ${targetLayout}`);
        },

        showLayoutConnections() {
            const connections = this.layoutManager.connector.getAllConnections();
            console.log('Current layout connections:', connections);
            
            // Temporarily highlight connections
            connections.forEach(conn => {
                if (conn.visualElement && conn.visualElement.material) {
                    const material = conn.visualElement.material;
                    const originalOpacity = material.opacity;
                    
                    material.opacity = 1.0;
                    setTimeout(() => {
                        material.opacity = originalOpacity;
                    }, 2000);
                }
            });
        },

        updateLayoutInfo(event) {
            const nodeCount = this.nodes.length;
            const edgeCount = this.edges.length;
            const density = nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1) / 2) : 0;
            
            const capabilities = this.layoutManager?.getLayoutCapabilities();
            const currentLayout = capabilities?.currentMode || 'Unknown';

            document.getElementById('currentLayout').textContent = `Current: ${currentLayout}`;
            document.getElementById('nodeCount').textContent = `Nodes: ${nodeCount}`;
            document.getElementById('edgeCount').textContent = `Edges: ${edgeCount}`;
            document.getElementById('layoutMetrics').textContent = `Density: ${density.toFixed(2)}`;
        },

        dispose() {
            if (this.ui && this.ui.parentNode) {
                this.ui.parentNode.removeChild(this.ui);
            }
            
            // Clean up nodes and edges
            this.nodes.forEach(node => space.removeNode(node.id));
            this.edges.forEach(edge => space.removeEdge(edge.id));
        }
    };

    demo.init();
    return demo;
}

export { demoMetadata, createGraph };