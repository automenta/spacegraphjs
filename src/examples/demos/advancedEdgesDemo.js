import * as S from '../../index.js';

export const demoMetadata = {
    id: 'advanced-edges',
    title: 'Advanced Edge Types',
    description: `<h3>Advanced Edge Types Demo</h3>
                  <p>Demonstrating the enhanced edge system with animated flows, physics-based springs, and bezier curves.</p>
                  <ul>
                    <li><strong>Flow Edges:</strong> Animated particle flows with direction control</li>
                    <li><strong>Spring Edges:</strong> Physics-based spring connections with tension visualization</li>
                    <li><strong>Bezier Edges:</strong> Smooth curves with automatic and manual control points</li>
                    <li><strong>Dynamic Properties:</strong> Real-time control over flow direction, spring tension, and curve parameters</li>
                  </ul>
                  <p><em>Watch the particles flow and springs react to node movement!</em></p>`
};

export function createGraph(space) {
    // Clear any existing content
    space.importGraphFromJSON({ nodes: [], edges: [] });

    // Create a central control node
    const centralNode = space.addNode(
        new S.ControlPanelNode(
            'edge-controls',
            { x: 0, y: 0, z: 0 },
            {
                title: 'Edge Controls',
                width: 300,
                height: 280,
                controls: [
                    {
                        id: 'flowSpeed',
                        type: 'slider',
                        label: 'Flow Speed',
                        min: 0.1,
                        max: 2.0,
                        value: 0.8,
                        step: 0.1
                    },
                    {
                        id: 'flowDirection',
                        type: 'select',
                        label: 'Flow Direction',
                        value: '1',
                        options: [
                            { value: '1', label: 'Forward' },
                            { value: '-1', label: 'Reverse' },
                            { value: '0', label: 'Bidirectional' }
                        ]
                    },
                    {
                        id: 'springStiffness',
                        type: 'slider',
                        label: 'Spring Stiffness',
                        min: 0.001,
                        max: 0.02,
                        value: 0.008,
                        step: 0.001
                    },
                    {
                        id: 'curveTension',
                        type: 'slider',
                        label: 'Curve Tension',
                        min: 0.1,
                        max: 1.0,
                        value: 0.4,
                        step: 0.1
                    },
                    {
                        id: 'showControls',
                        type: 'switch',
                        label: 'Show Control Points',
                        value: false
                    }
                ]
            },
            2.0
        )
    );

    // Create nodes in a network pattern
    const networkNodes = [];
    const positions = [
        { x: -400, y: 200, label: 'Source A' },
        { x: 400, y: 200, label: 'Target A' },
        { x: -400, y: -200, label: 'Source B' },
        { x: 400, y: -200, label: 'Target B' },
        { x: -600, y: 0, label: 'Hub L' },
        { x: 600, y: 0, label: 'Hub R' },
        { x: 0, y: 300, label: 'Top' },
        { x: 0, y: -300, label: 'Bottom' }
    ];

    positions.forEach((pos, index) => {
        const node = space.addNode(
            new S.TextMeshNode(
                `node-${index}`,
                { x: pos.x, y: pos.y, z: 0 },
                {
                    text: pos.label,
                    fontSize: 14,
                    height: 4,
                    color: 0x3498db,
                    bevelEnabled: true,
                    align: 'center'
                },
                1.5
            )
        );
        networkNodes.push(node);
    });

    // Create different edge types with references for control
    const edges = {
        flows: [],
        springs: [],
        beziers: []
    };

    // Flow edges - horizontal connections
    edges.flows.push(space.addEdge(networkNodes[0], networkNodes[1], {
        type: 'flow',
        particleCount: 20,
        particleSpeed: 0.8,
        particleSize: 4,
        particleColor: 0x00ff88,
        flowDirection: 1,
        animated: true,
        glowEffect: true,
        thickness: 3,
        color: 0x00d4aa
    }));

    edges.flows.push(space.addEdge(networkNodes[2], networkNodes[3], {
        type: 'flow',
        particleCount: 15,
        particleSpeed: 0.6,
        particleSize: 3,
        particleColor: 0xff6b35,
        flowDirection: -1,
        animated: true,
        glowEffect: true,
        thickness: 3,
        color: 0xff8c42
    }));

    // Bidirectional flow
    edges.flows.push(space.addEdge(networkNodes[4], networkNodes[5], {
        type: 'flow',
        particleCount: 25,
        particleSpeed: 0.5,
        particleSize: 2,
        particleColor: 0x9b59b6,
        flowDirection: 0,
        animated: true,
        glowEffect: true,
        thickness: 2,
        color: 0xb084cc
    }));

    // Spring edges - vertical connections
    edges.springs.push(space.addEdge(centralNode, networkNodes[6], {
        type: 'spring',
        restLength: 300,
        stiffness: 0.008,
        springCoils: 8,
        springRadius: 6,
        springColor: 0xe74c3c,
        showTension: true,
        tensionColorMin: 0x00ff00,
        tensionColorMax: 0xff0000,
        enablePhysics: false
    }));

    edges.springs.push(space.addEdge(centralNode, networkNodes[7], {
        type: 'spring',
        restLength: 300,
        stiffness: 0.008,
        springCoils: 6,
        springRadius: 8,
        springColor: 0xf39c12,
        showTension: true,
        tensionColorMin: 0x00ff00,
        tensionColorMax: 0xff0000,
        enablePhysics: false
    }));

    // Bezier edges - curved connections
    edges.beziers.push(space.addEdge(networkNodes[0], centralNode, {
        type: 'bezier',
        curveTension: 0.4,
        curveType: 'cubic',
        autoControlPoints: true,
        controlPointsVisible: false,
        segments: 60,
        color: 0x8e44ad,
        thickness: 3,
        gradientColors: [0x3498db, 0x8e44ad]
    }));

    edges.beziers.push(space.addEdge(networkNodes[1], centralNode, {
        type: 'bezier',
        curveTension: 0.3,
        curveType: 'cubic',
        autoControlPoints: true,
        controlPointsVisible: false,
        segments: 60,
        color: 0x27ae60,
        thickness: 3,
        gradientColors: [0x3498db, 0x27ae60]
    }));

    edges.beziers.push(space.addEdge(networkNodes[2], centralNode, {
        type: 'bezier',
        curveTension: 0.5,
        curveType: 'cubic',
        autoControlPoints: true,
        controlPointsVisible: false,
        segments: 60,
        color: 0xe67e22,
        thickness: 3,
        gradientColors: [0x3498db, 0xe67e22]
    }));

    edges.beziers.push(space.addEdge(networkNodes[3], centralNode, {
        type: 'bezier',
        curveTension: 0.35,
        curveType: 'cubic',
        autoControlPoints: true,
        controlPointsVisible: false,
        segments: 60,
        color: 0x2ecc71,
        thickness: 3,
        gradientColors: [0x3498db, 0x2ecc71]
    }));

    // Create additional decorative flow edges
    edges.flows.push(space.addEdge(networkNodes[4], networkNodes[0], {
        type: 'flow',
        particleCount: 12,
        particleSpeed: 0.4,
        particleSize: 2,
        particleColor: 0x1abc9c,
        flowDirection: 1,
        animated: true,
        thickness: 2,
        color: 0x48c9b0
    }));

    edges.flows.push(space.addEdge(networkNodes[5], networkNodes[1], {
        type: 'flow',
        particleCount: 12,
        particleSpeed: 0.4,
        particleSize: 2,
        particleColor: 0x1abc9c,
        flowDirection: 1,
        animated: true,
        thickness: 2,
        color: 0x48c9b0
    }));

    // Set up control event listeners
    space.on('graph:node:controlChanged', (event) => {
        const { controlId, value } = event;
        
        switch (controlId) {
            case 'flowSpeed':
                edges.flows.forEach(edge => {
                    if (edge.setParticleSpeed) {
                        edge.setParticleSpeed(parseFloat(value));
                    }
                });
                break;
                
            case 'flowDirection':
                const direction = parseInt(value);
                edges.flows.forEach(edge => {
                    if (edge.setFlowDirection) {
                        edge.setFlowDirection(direction);
                    }
                });
                break;
                
            case 'springStiffness':
                edges.springs.forEach(edge => {
                    if (edge.setStiffness) {
                        edge.setStiffness(parseFloat(value));
                    }
                });
                break;
                
            case 'curveTension':
                edges.beziers.forEach(edge => {
                    if (edge.setCurveTension) {
                        edge.setCurveTension(parseFloat(value));
                    }
                });
                break;
                
            case 'showControls':
                edges.beziers.forEach(edge => {
                    if (edge.setControlPointsVisible) {
                        edge.setControlPointsVisible(value);
                    }
                });
                break;
        }
    });

    // Add info nodes explaining each edge type
    const infoNodes = [
        {
            id: 'flow-info',
            position: { x: -400, y: 350, z: 0 },
            text: 'Flow Edges\nAnimated particles\nshow data flow',
            color: 0x00ff88
        },
        {
            id: 'spring-info',
            position: { x: 0, y: 450, z: 0 },
            text: 'Spring Edges\nPhysics-based\nconnections',
            color: 0xe74c3c
        },
        {
            id: 'bezier-info',
            position: { x: 400, y: 350, z: 0 },
            text: 'Bezier Edges\nSmooth curves\nwith gradients',
            color: 0x8e44ad
        }
    ];

    infoNodes.forEach(info => {
        space.addNode(
            new S.TextMeshNode(
                info.id,
                info.position,
                {
                    text: info.text,
                    fontSize: 12,
                    height: 3,
                    color: info.color,
                    bevelEnabled: true,
                    align: 'center',
                    animated: true,
                    animationType: 'float'
                }
            )
        );
    });

    // Add animated effects
    let animationTime = 0;
    const animateEdges = () => {
        animationTime += 0.016;
        
        // Animate spring rest lengths
        edges.springs.forEach((edge, index) => {
            if (edge.setRestLength) {
                const baseLength = 300;
                const variation = Math.sin(animationTime * 0.5 + index) * 50;
                edge.setRestLength(baseLength + variation);
            }
        });
        
        // Animate bezier curve tension
        edges.beziers.forEach((edge, index) => {
            if (edge.setCurveTension) {
                const baseTension = 0.4;
                const variation = Math.sin(animationTime * 0.3 + index * 0.5) * 0.2;
                edge.setCurveTension(Math.max(0.1, baseTension + variation));
            }
        });
        
        requestAnimationFrame(animateEdges);
    };
    animateEdges();

    // Center the view
    setTimeout(() => {
        space.centerView(centralNode, 1000);
    }, 100);

    return space;
}