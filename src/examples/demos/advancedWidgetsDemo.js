import * as S from '../../index.js';

export const demoMetadata = {
    id: 'interactive-procedural-nodes', // Changed ID
    title: 'Interactive & Procedural Nodes', // Changed Title
    description: `<h3>Interactive & Procedural Nodes Demo</h3>
                  <p>Showcasing nodes with interactive UI elements, dynamic content, and procedurally generated visuals.</p>
                  <ul>
                    <li><strong>Control Panel Node:</strong> Interactive sliders, buttons, and controls</li>
                    <li><strong>Progress Node:</strong> Various progress indicators (bars, circles, gauges, steps)</li>
                    <li><strong>Canvas Node:</strong> Drawing canvas with multiple tools</li>
                    <li><strong>Procedural Shape Node:</strong> Generated fractal and organic shapes</li>
                    <li><strong>Text Mesh Node:</strong> 3D text with advanced typography</li>
                    <li><strong>Flow Edge:</strong> Animated particle flows</li>
                    <li><strong>Spring Edge:</strong> Physics-based spring connections</li>
                    <li><strong>Bezier Edge:</strong> Curved connections with control points</li>
                  </ul>
                  <p><em>Interact with the control panels and try the different drawing tools!</em></p>`
};

export function createGraph(space) {
    // Clear any existing content
    space.importGraphFromJSON({ nodes: [], edges: [] });

    // Central hub node
    const hubNode = space.addNode(
        new S.TextMeshNode(
            'hub',
            { x: 0, y: 0, z: 0 },
            {
                text: 'Advanced\nWidgets',
                fontSize: 24,
                height: 8,
                color: 0x4a9eff,
                bevelEnabled: true,
                align: 'center',
                animated: true,
                animationType: 'pulse'
            },
            2.0
        )
    );

    // Control Panel Node with various controls
    const controlPanel = space.addNode(
        new S.ControlPanelNode(
            'control-panel',
            { x: -300, y: 150, z: 0 },
            {
                title: 'System Controls',
                width: 280,
                height: 250,
                controls: [
                    {
                        id: 'volume',
                        type: 'slider',
                        label: 'Volume',
                        min: 0,
                        max: 100,
                        value: 75,
                        step: 1
                    },
                    {
                        id: 'quality',
                        type: 'select',
                        label: 'Quality',
                        value: 'high',
                        options: [
                            { value: 'low', label: 'Low' },
                            { value: 'medium', label: 'Medium' },
                            { value: 'high', label: 'High' },
                            { value: 'ultra', label: 'Ultra' }
                        ]
                    },
                    {
                        id: 'enabled',
                        type: 'switch',
                        label: 'Enable Effects',
                        value: true
                    },
                    {
                        id: 'apply',
                        type: 'button',
                        label: 'Apply Settings',
                        text: 'Apply'
                    }
                ]
            },
            1.5
        )
    );

    // Progress indicators showcase
    const progressBar = space.addNode(
        new S.ProgressNode(
            'progress-bar',
            { x: 300, y: 150, z: 0 },
            {
                progressType: 'bar',
                label: 'Loading Progress',
                value: 65,
                max: 100,
                animated: true,
                color: '#00ff88'
            }
        )
    );

    const progressCircle = space.addNode(
        new S.ProgressNode(
            'progress-circle',
            { x: 450, y: 150, z: 0 },
            {
                progressType: 'circular',
                label: 'CPU Usage',
                value: 45,
                max: 100,
                width: 120,
                height: 120,
                color: '#ff6b35'
            }
        )
    );

    const progressGauge = space.addNode(
        new S.ProgressNode(
            'progress-gauge',
            { x: 600, y: 150, z: 0 },
            {
                progressType: 'gauge',
                label: 'Temperature',
                value: 72,
                max: 100,
                width: 140,
                height: 100,
                color: '#ff4757'
            }
        )
    );

    // Canvas drawing node
    const canvas = space.addNode(
        new S.CanvasNode(
            'canvas',
            { x: -400, y: -150, z: 0 },
            {
                title: 'Drawing Canvas',
                width: 350,
                height: 250,
                showToolbar: true,
                enableDrawing: true,
                canvasBackground: '#0f0f23'
            }
        )
    );

    // Procedural shape showcase
    const fractalShape = space.addNode(
        new S.ProceduralShapeNode(
            'fractal',
            { x: 200, y: -150, z: 0 },
            {
                shapeType: 'fractal',
                complexity: 3,
                size: 60,
                color: 0x8e44ad,
                parameters: { iterations: 3, scale: 0.6, offset: 1.2 },
                animated: true,
                wireframe: false
            },
            2.0
        )
    );

    const organicShape = space.addNode(
        new S.ProceduralShapeNode(
            'organic',
            { x: 350, y: -150, z: 0 },
            {
                shapeType: 'organic',
                size: 80,
                color: 0x27ae60,
                parameters: { segments: 32, rings: 16, noise: 0.4, bulges: 2 },
                animated: true,
                materialType: 'phong'
            },
            2.0
        )
    );

    const crystalShape = space.addNode(
        new S.ProceduralShapeNode(
            'crystal',
            { x: 500, y: -150, z: 0 },
            {
                shapeType: 'crystal',
                size: 70,
                color: 0x3498db,
                parameters: { faces: 8, height: 80, irregularity: 0.15 },
                animated: false,
                materialType: 'physical'
            },
            2.0
        )
    );

    // Text mesh nodes with different styles
    const titleText = space.addNode(
        new S.TextMeshNode(
            'title',
            { x: -150, y: 280, z: 0 },
            {
                text: 'Interactive\nWidgets',
                fontSize: 18,
                height: 6,
                color: 0xe74c3c,
                bevelEnabled: true,
                bevelThickness: 1,
                align: 'center',
                animated: true,
                animationType: 'float'
            }
        )
    );

    const subtitleText = space.addNode(
        new S.TextMeshNode(
            'subtitle',
            { x: 150, y: 280, z: 0 },
            {
                text: 'Procedural\nShapes',
                fontSize: 18,
                height: 6,
                color: 0xf39c12,
                bevelEnabled: true,
                bevelThickness: 1,
                align: 'center',
                animated: true,
                animationType: 'wave'
            }
        )
    );

    // Create advanced edge connections
    
    // Flow edge from hub to control panel
    const flowEdge1 = space.addEdge(hubNode, controlPanel, {
        type: 'flow',
        particleCount: 15,
        particleSpeed: 0.8,
        particleColor: 0x00ffff,
        flowDirection: 1,
        animated: true,
        glowEffect: true,
        thickness: 2,
        color: 0x4a9eff
    });

    // Spring edge from hub to canvas
    const springEdge1 = space.addEdge(hubNode, canvas, {
        type: 'spring',
        restLength: 350,
        stiffness: 0.005,
        springCoils: 6,
        springRadius: 8,
        springColor: 0x9b59b6,
        showTension: true,
        tensionColorMin: 0x00ff00,
        tensionColorMax: 0xff0000,
        enablePhysics: false // Disable for demo
    });

    // Bezier edges connecting shapes
    const bezierEdge1 = space.addEdge(fractalShape, organicShape, {
        type: 'bezier',
        curveTension: 0.4,
        curveType: 'cubic',
        autoControlPoints: true,
        color: 0x27ae60,
        thickness: 3,
        gradientColors: [0x8e44ad, 0x27ae60]
    });

    const bezierEdge2 = space.addEdge(organicShape, crystalShape, {
        type: 'bezier',
        curveTension: 0.3,
        curveType: 'cubic',
        autoControlPoints: true,
        color: 0x3498db,
        thickness: 3,
        gradientColors: [0x27ae60, 0x3498db]
    });

    // Flow edges connecting progress nodes
    const flowEdge2 = space.addEdge(progressBar, progressCircle, {
        type: 'flow',
        particleCount: 8,
        particleSpeed: 0.6,
        particleColor: 0x00ff88,
        flowDirection: 1,
        thickness: 2
    });

    const flowEdge3 = space.addEdge(progressCircle, progressGauge, {
        type: 'flow',
        particleCount: 8,
        particleSpeed: 0.6,
        particleColor: 0xff6b35,
        flowDirection: 1,
        thickness: 2
    });

    // Curved edges from text to main areas
    space.addEdge(titleText, controlPanel, {
        type: 'curved',
        curvature: 0.3,
        color: 0xe74c3c,
        thickness: 2,
        label: 'Controls'
    });

    space.addEdge(subtitleText, fractalShape, {
        type: 'curved',
        curvature: 0.3,
        color: 0xf39c12,
        thickness: 2,
        label: 'Shapes'
    });

    // Set up event listeners for interactive features
    space.on('graph:node:controlChanged', (event) => {
        const { node, controlId, value } = event;
        console.log(`Control "${controlId}" changed to:`, value);
        
        // Example: Update progress based on volume control
        if (controlId === 'volume') {
            progressBar.setValue(value);
        }
        
        // Example: Change shape complexity based on quality setting
        if (controlId === 'quality') {
            const complexityMap = { low: 2, medium: 3, high: 4, ultra: 5 };
            fractalShape.setComplexity(complexityMap[value] || 3);
        }
    });

    // Animate progress values
    let animationTime = 0;
    const animateProgress = () => {
        animationTime += 0.016; // ~60fps
        
        // Animate different progress indicators
        const waveValue = 50 + Math.sin(animationTime * 0.5) * 30;
        const pulseValue = 50 + Math.sin(animationTime * 0.8) * 40;
        const sawtoothValue = (animationTime * 10) % 100;
        
        progressCircle.setValue(Math.max(0, Math.min(100, waveValue)));
        progressGauge.setValue(Math.max(0, Math.min(100, pulseValue)));
        
        requestAnimationFrame(animateProgress);
    };
    animateProgress();

    // Center the view on the hub
    setTimeout(() => {
        space.centerView(hubNode, 1000);
    }, 100);

    return space;
}