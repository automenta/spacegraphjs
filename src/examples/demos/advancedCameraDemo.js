import * as THREE from 'three';

const demoMetadata = {
    id: 'advanced-camera',
    title: 'Advanced Camera Controls',
    description: `<h3>Advanced Camera Controls</h3>
                  <p>Experience next-generation camera capabilities including intelligent auto-zoom, 
                  smooth rotation controls, peek-around-corners functionality, and cinematic camera modes.</p>
                  <ul>
                    <li>Auto-zoom that adapts to graph density and node count</li>
                    <li>Auto-rotation with configurable speed and smooth damping</li>
                    <li>Peek mode - move mouse to screen edges to peek around</li>
                    <li>Cinematic mode with smooth orbital paths</li>
                    <li>Smart focus with neighbor-aware context</li>
                    <li>View sequences for automated tours</li>
                  </ul>
                  <p><strong>Controls:</strong> Ctrl+Z (Auto-zoom), Ctrl+R (Auto-rotation), P (Peek mode), Ctrl+C (Cinematic)</p>`
};

function createGraph(space) {
    const demo = {
        title: 'Advanced Camera Controls',
        description: 'Auto-zoom, rotation, peek mode, and cinematic camera movements',
        
        init() {
            this.setupUI();
            this.createDemoGraph();
            this.setupCameraEnhancements();
        },

        setupUI() {
            this.ui = document.createElement('div');
            this.ui.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(20, 20, 30, 0.95);
                border: 1px solid rgba(100, 255, 150, 0.3);
                border-radius: 12px;
                padding: 20px;
                color: white;
                font-family: 'Monaco', 'Consolas', monospace;
                font-size: 12px;
                min-width: 320px;
                backdrop-filter: blur(10px);
                z-index: 1000;
            `;

            this.ui.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #64FFB5;">Advanced Camera Controls</h3>
                
                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0; color: #B3FFE5;">Auto Features:</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button id="toggleAutoZoom" style="padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Auto-Zoom OFF</button>
                        <button id="toggleAutoRotation" style="padding: 8px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Auto-Rotate OFF</button>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; color: #B3FFE5;">Rotation Speed:</label>
                    <input type="range" id="rotationSpeed" min="0.005" max="0.05" step="0.005" value="0.02" style="width: 100%;">
                    <span id="rotationSpeedValue" style="color: #81C784; font-size: 11px;">0.02</span>
                </div>

                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0; color: #FFD54F;">Interactive Modes:</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button id="togglePeekMode" style="padding: 8px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;">Peek Mode OFF</button>
                        <button id="toggleCinematicMode" style="padding: 8px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer;">Cinematic OFF</button>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0; color: #FF8A65;">Smart Navigation:</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button id="smartFocusRandom" style="padding: 6px; background: #E91E63; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Smart Focus</button>
                        <button id="viewSequence" style="padding: 6px; background: #00BCD4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">View Tour</button>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0; color: #B39DDB;">Graph Actions:</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button id="addNodes" style="padding: 6px; background: #673AB7; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Add Nodes</button>
                        <button id="removeNodes" style="padding: 6px; background: #795548; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Remove Nodes</button>
                        <button id="changeLayout" style="padding: 6px; background: #607D8B; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Change Layout</button>
                        <button id="resetCamera" style="padding: 6px; background: #424242; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Reset Camera</button>
                    </div>
                </div>

                <div id="cameraStatus" style="background: rgba(255, 255, 255, 0.1); padding: 12px; border-radius: 6px; font-size: 11px;">
                    <div id="currentMode">Mode: Orbit</div>
                    <div id="nodeCount">Nodes: 0</div>
                    <div id="autoZoomStatus">Auto-Zoom: OFF</div>
                    <div id="autoRotateStatus">Auto-Rotate: OFF</div>
                    <div id="peekStatus">Peek Mode: OFF</div>
                    <div id="cinematicStatus">Cinematic: OFF</div>
                </div>

                <div style="margin-top: 15px; padding: 10px; background: rgba(100, 255, 150, 0.1); border-radius: 6px; font-size: 10px;">
                    <strong>Keyboard Controls:</strong><br>
                    • Ctrl+Z: Toggle Auto-Zoom<br>
                    • Ctrl+R: Toggle Auto-Rotation<br>
                    • P: Toggle Peek Mode<br>
                    • Ctrl+C: Toggle Cinematic Mode<br>
                    <strong>Peek Mode:</strong> Move mouse to screen edges
                </div>
            `;

            document.body.appendChild(this.ui);
            this.setupEventListeners();
        },

        setupEventListeners() {
            const autoZoomBtn = document.getElementById('toggleAutoZoom');
            const autoRotationBtn = document.getElementById('toggleAutoRotation');
            const rotationSpeedSlider = document.getElementById('rotationSpeed');
            const peekModeBtn = document.getElementById('togglePeekMode');
            const cinematicModeBtn = document.getElementById('toggleCinematicMode');

            autoZoomBtn.addEventListener('click', () => {
                const enabled = space.plugins.getPlugin('CameraPlugin').toggleAutoZoom();
                autoZoomBtn.textContent = `Auto-Zoom ${enabled ? 'ON' : 'OFF'}`;
                autoZoomBtn.style.background = enabled ? '#4CAF50' : '#757575';
                this.updateStatus();
            });

            autoRotationBtn.addEventListener('click', () => {
                const enabled = space.plugins.getPlugin('CameraPlugin').toggleAutoRotation();
                autoRotationBtn.textContent = `Auto-Rotate ${enabled ? 'ON' : 'OFF'}`;
                autoRotationBtn.style.background = enabled ? '#2196F3' : '#757575';
                this.updateStatus();
            });

            rotationSpeedSlider.addEventListener('input', (e) => {
                const speed = parseFloat(e.target.value);
                space.plugins.getPlugin('CameraPlugin').setRotationSpeed(speed);
                document.getElementById('rotationSpeedValue').textContent = speed.toFixed(3);
            });

            peekModeBtn.addEventListener('click', () => {
                const enabled = space.plugins.getPlugin('CameraPlugin').togglePeekMode();
                peekModeBtn.textContent = `Peek Mode ${enabled ? 'ON' : 'OFF'}`;
                peekModeBtn.style.background = enabled ? '#FF9800' : '#757575';
                this.updateStatus();
            });

            cinematicModeBtn.addEventListener('click', () => {
                const enabled = space.plugins.getPlugin('CameraPlugin').toggleCinematicMode();
                cinematicModeBtn.textContent = `Cinematic ${enabled ? 'ON' : 'OFF'}`;
                cinematicModeBtn.style.background = enabled ? '#9C27B0' : '#757575';
                this.updateStatus();
            });

            document.getElementById('smartFocusRandom').addEventListener('click', () => {
                this.performSmartFocus();
            });

            document.getElementById('viewSequence').addEventListener('click', () => {
                this.startViewSequence();
            });

            document.getElementById('addNodes').addEventListener('click', () => {
                this.addRandomNodes(5);
            });

            document.getElementById('removeNodes').addEventListener('click', () => {
                this.removeRandomNodes(3);
            });

            document.getElementById('changeLayout').addEventListener('click', () => {
                this.randomizeLayout();
            });

            document.getElementById('resetCamera').addEventListener('click', () => {
                space.plugins.getPlugin('CameraPlugin').resetView();
            });

            // Listen for camera events
            space.on('camera:autoZoomToggled', () => this.updateStatus());
            space.on('camera:autoRotationToggled', () => this.updateStatus());
            space.on('camera:peekModeToggled', () => this.updateStatus());
            space.on('camera:cinematicModeToggled', () => this.updateStatus());
            space.on('camera:peekModeEntered', () => {
                console.log('Peek mode entered - camera peeking around');
            });
            space.on('camera:peekModeExited', () => {
                console.log('Peek mode exited - camera returned to normal');
            });
        },

        createDemoGraph() {
            this.nodes = [];
            this.edges = [];
            this.layouts = ['force', 'circular', 'grid', 'hierarchical'];

            // Create initial graph with varying densities
            this.createCluster('center', { x: 0, y: 0, z: 0 }, 8, 150);
            this.createCluster('left', { x: -300, y: 100, z: 50 }, 6, 100);
            this.createCluster('right', { x: 300, y: -100, z: -50 }, 7, 120);
            this.createCluster('top', { x: 0, y: 300, z: 80 }, 5, 80);

            // Create some inter-cluster connections
            this.connectClusters();

            this.updateStatus();
        },

        createCluster(name, center, count, radius) {
            const clusterNodes = [];
            
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const distance = radius * (0.3 + Math.random() * 0.7);
                const height = (Math.random() - 0.5) * radius * 0.5;

                const position = {
                    x: center.x + Math.cos(angle) * distance,
                    y: center.y + Math.sin(angle) * distance + height,
                    z: center.z + (Math.random() - 0.5) * 100
                };

                const nodeTypes = ['ControlPanelNode', 'ProgressNode', 'TextMeshNode', 'ProceduralShapeNode'];
                const node = space.addNode({
                    id: `${name}_node_${i}`,
                    type: nodeTypes[i % nodeTypes.length],
                    position,
                    data: {
                        cluster: name,
                        mass: 1 + Math.random(),
                        content: `Node ${name}-${i}`
                    }
                });

                this.nodes.push(node);
                clusterNodes.push(node);
            }

            // Connect nodes within cluster
            for (let i = 0; i < clusterNodes.length; i++) {
                const connections = Math.min(3, clusterNodes.length - 1);
                for (let j = 0; j < connections; j++) {
                    const targetIndex = (i + j + 1) % clusterNodes.length;
                    if (i !== targetIndex && !this.hasEdge(clusterNodes[i], clusterNodes[targetIndex])) {
                        const edge = space.addEdge({
                            id: `${name}_edge_${i}_${targetIndex}`,
                            source: clusterNodes[i],
                            target: clusterNodes[targetIndex],
                            type: Math.random() > 0.5 ? 'SpringEdge' : 'BezierEdge'
                        });
                        this.edges.push(edge);
                    }
                }
            }
        },

        connectClusters() {
            const clusters = ['center', 'left', 'right', 'top'];
            
            clusters.forEach((cluster1, i) => {
                clusters.forEach((cluster2, j) => {
                    if (i < j) {
                        const nodes1 = this.nodes.filter(n => n.data.cluster === cluster1);
                        const nodes2 = this.nodes.filter(n => n.data.cluster === cluster2);
                        
                        if (nodes1.length > 0 && nodes2.length > 0) {
                            const source = nodes1[Math.floor(Math.random() * nodes1.length)];
                            const target = nodes2[Math.floor(Math.random() * nodes2.length)];
                            
                            const edge = space.addEdge({
                                id: `inter_${cluster1}_${cluster2}`,
                                source,
                                target,
                                type: 'FlowEdge',
                                data: { isInterCluster: true }
                            });
                            this.edges.push(edge);
                        }
                    }
                });
            });
        },

        hasEdge(source, target) {
            return this.edges.some(edge => 
                (edge.source === source && edge.target === target) ||
                (edge.source === target && edge.target === source)
            );
        },

        setupCameraEnhancements() {
            const cameraPlugin = space.plugins.getPlugin('CameraPlugin');
            
            // Configure advanced camera settings
            cameraPlugin.updateAdvancedSettings({
                autoZoom: {
                    enabled: false,
                    transitionDuration: 1.5,
                    targetPadding: 2.0,
                    nodeCountThreshold: 8
                },
                rotation: {
                    autoRotateSpeed: 0.02,
                    smoothDamping: 0.15
                },
                peekMode: {
                    peekDistance: 120,
                    peekSpeed: 0.6,
                    returnDuration: 0.8
                },
                cinematic: {
                    cinematicSpeed: 0.4,
                    cinematicRadius: 600,
                    cinematicHeight: 300
                }
            });
        },

        performSmartFocus() {
            if (this.nodes.length === 0) return;
            
            const randomNode = this.nodes[Math.floor(Math.random() * this.nodes.length)];
            const cameraPlugin = space.plugins.getPlugin('CameraPlugin');
            
            cameraPlugin.smartFocusOnNode(randomNode, {
                considerNeighbors: true,
                includeEdges: true,
                transitionDuration: 1.2,
                contextRadius: 250
            });

            console.log(`Smart focus on node: ${randomNode.id} (cluster: ${randomNode.data.cluster})`);
        },

        async startViewSequence() {
            if (this.nodes.length < 4) return;
            
            // Select interesting nodes from different clusters
            const clusters = ['center', 'left', 'right', 'top'];
            const tourNodes = [];
            
            clusters.forEach(cluster => {
                const clusterNodes = this.nodes.filter(n => n.data.cluster === cluster);
                if (clusterNodes.length > 0) {
                    tourNodes.push(clusterNodes[Math.floor(Math.random() * clusterNodes.length)]);
                }
            });

            const cameraPlugin = space.plugins.getPlugin('CameraPlugin');
            
            console.log('Starting view sequence tour...');
            await cameraPlugin.createViewSequence(tourNodes, {
                duration: 1.5,
                pause: 2.0,
                includeOverview: true,
                smoothTransitions: true
            });
            console.log('View sequence tour completed');
        },

        addRandomNodes(count) {
            const clusters = ['center', 'left', 'right', 'top'];
            
            for (let i = 0; i < count; i++) {
                const cluster = clusters[Math.floor(Math.random() * clusters.length)];
                const existingClusterNodes = this.nodes.filter(n => n.data.cluster === cluster);
                
                if (existingClusterNodes.length > 0) {
                    const centerNode = existingClusterNodes[0];
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 80 + Math.random() * 120;
                    
                    const position = {
                        x: centerNode.position.x + Math.cos(angle) * distance,
                        y: centerNode.position.y + Math.sin(angle) * distance,
                        z: centerNode.position.z + (Math.random() - 0.5) * 100
                    };

                    const nodeTypes = ['ControlPanelNode', 'ProgressNode', 'TextMeshNode', 'ProceduralShapeNode'];
                    const node = space.addNode({
                        id: `${cluster}_added_${Date.now()}_${i}`,
                        type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
                        position,
                        data: {
                            cluster: cluster,
                            mass: 1 + Math.random(),
                            content: `Added Node ${i}`
                        }
                    });

                    this.nodes.push(node);

                    // Connect to random existing node in cluster
                    if (Math.random() > 0.3) {
                        const targetNode = existingClusterNodes[Math.floor(Math.random() * existingClusterNodes.length)];
                        const edge = space.addEdge({
                            id: `added_edge_${Date.now()}_${i}`,
                            source: node,
                            target: targetNode,
                            type: 'BezierEdge'
                        });
                        this.edges.push(edge);
                    }
                }
            }

            this.updateStatus();
            console.log(`Added ${count} nodes to the graph`);
        },

        removeRandomNodes(count) {
            if (this.nodes.length <= 10) return; // Keep minimum nodes

            for (let i = 0; i < count && this.nodes.length > 10; i++) {
                const nodeToRemove = this.nodes[Math.floor(Math.random() * this.nodes.length)];
                
                // Remove associated edges
                this.edges = this.edges.filter(edge => {
                    if (edge.source === nodeToRemove || edge.target === nodeToRemove) {
                        space.removeEdge(edge.id);
                        return false;
                    }
                    return true;
                });

                // Remove node
                space.removeNode(nodeToRemove.id);
                this.nodes = this.nodes.filter(n => n !== nodeToRemove);
            }

            this.updateStatus();
            console.log(`Removed ${count} nodes from the graph`);
        },

        randomizeLayout() {
            const currentLayoutIndex = this.layouts.indexOf(space.layoutManager?.getActiveLayoutName() || 'force');
            const nextLayoutIndex = (currentLayoutIndex + 1) % this.layouts.length;
            const nextLayout = this.layouts[nextLayoutIndex];

            space.layoutManager?.applyLayout(nextLayout);
            console.log(`Applied layout: ${nextLayout}`);
        },

        updateStatus() {
            const cameraPlugin = space.plugins.getPlugin('CameraPlugin');
            const status = cameraPlugin.getAdvancedControlsStatus();
            const cameraMode = cameraPlugin.getCameraMode();

            document.getElementById('currentMode').textContent = `Mode: ${cameraMode}`;
            document.getElementById('nodeCount').textContent = `Nodes: ${this.nodes.length}`;
            document.getElementById('autoZoomStatus').textContent = `Auto-Zoom: ${status.autoZoom ? 'ON' : 'OFF'}`;
            document.getElementById('autoRotateStatus').textContent = `Auto-Rotate: ${status.autoRotation ? 'ON' : 'OFF'}`;
            document.getElementById('peekStatus').textContent = `Peek Mode: ${status.peekMode ? 'ON' : 'OFF'}`;
            document.getElementById('cinematicStatus').textContent = `Cinematic: ${status.cinematicMode ? 'ON' : 'OFF'}`;
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