import * as S from '../../index.js';

export const demoMetadata = {
    id: 'all-edge-features', // New ID
    title: 'Comprehensive Edge Features', // New Title
    description: `<h3>Comprehensive Edge Features Demo</h3>
                  <p>Showcasing a wide variety of edge types, styles, and advanced functionalities.</p>
                  <h4>Sections:</h4>
                  <ol>
                    <li><b>Basic Styled Edges:</b> Demonstrates fundamental styling options like labels, colors, thickness, dashing, curvature, arrowheads, and gradients.</li>
                    <li><b>Specialized Static Edges:</b> Includes Dotted Edges and Dynamic Thickness Edges (thickness based on data).</li>
                    <li><b>Advanced Dynamic Edges:</b> Features interactive Flow Edges, physics-based Spring Edges, and controllable Bezier Edges.</li>
                  </ul>
                  <p><em>Interact with the control panel for dynamic edges and observe various styles.</em></p>`
};

function createAdvancedDynamicEdges(space, basePosition = { x: 0, y: 0, z: 0 }) {
    const centralNode = space.addNode(
        new S.ControlPanelNode(
            'adv-edge-controls',
            { x: basePosition.x, y: basePosition.y, z: basePosition.z },
            {
                title: 'Adv. Edge Controls',
                width: 300,
                height: 280,
                controls: [
                    { id: 'flowSpeed', type: 'slider', label: 'Flow Speed', min: 0.1, max: 2.0, value: 0.8, step: 0.1 },
                    { id: 'flowDirection', type: 'select', label: 'Flow Direction', value: '1', options: [ { value: '1', label: 'Forward' }, { value: '-1', label: 'Reverse' }, { value: '0', label: 'Bidirectional' } ] },
                    { id: 'springStiffness', type: 'slider', label: 'Spring Stiffness', min: 0.001, max: 0.02, value: 0.008, step: 0.001 },
                    { id: 'curveTension', type: 'slider', label: 'Curve Tension', min: 0.1, max: 1.0, value: 0.4, step: 0.1 },
                    { id: 'showControls', type: 'switch', label: 'Show Bezier Controls', value: false }
                ]
            }, 2.0
        )
    );

    const networkNodes = [];
    const positions = [
        { x: -400, y: 200, label: 'Source A' }, { x: 400, y: 200, label: 'Target A' },
        { x: -400, y: -200, label: 'Source B' }, { x: 400, y: -200, label: 'Target B' },
        { x: -600, y: 0, label: 'Hub L' }, { x: 600, y: 0, label: 'Hub R' },
        { x: 0, y: 300, label: 'Top' }, { x: 0, y: -300, label: 'Bottom' }
    ];

    positions.forEach((pos, index) => {
        const node = space.addNode(
            new S.TextMeshNode( `adv-node-${index}`,
                { x: basePosition.x + pos.x, y: basePosition.y + pos.y, z: basePosition.z + 0 },
                { text: pos.label, fontSize: 14, height: 4, color: 0x3498db, bevelEnabled: true, align: 'center' }, 1.5
            )
        );
        networkNodes.push(node);
    });

    const edges = { flows: [], springs: [], beziers: [] };

    edges.flows.push(space.addEdge(networkNodes[0], networkNodes[1], { type: 'flow', particleCount: 20, particleSpeed: 0.8, particleSize: 4, particleColor: 0x00ff88, flowDirection: 1, animated: true, glowEffect: true, thickness: 3, color: 0x00d4aa }));
    edges.flows.push(space.addEdge(networkNodes[2], networkNodes[3], { type: 'flow', particleCount: 15, particleSpeed: 0.6, particleSize: 3, particleColor: 0xff6b35, flowDirection: -1, animated: true, glowEffect: true, thickness: 3, color: 0xff8c42 }));
    edges.flows.push(space.addEdge(networkNodes[4], networkNodes[5], { type: 'flow', particleCount: 25, particleSpeed: 0.5, particleSize: 2, particleColor: 0x9b59b6, flowDirection: 0, animated: true, glowEffect: true, thickness: 2, color: 0xb084cc }));
    edges.springs.push(space.addEdge(centralNode, networkNodes[6], { type: 'spring', restLength: 300, stiffness: 0.008, springCoils: 8, springRadius: 6, springColor: 0xe74c3c, showTension: true, tensionColorMin: 0x00ff00, tensionColorMax: 0xff0000, enablePhysics: false }));
    edges.springs.push(space.addEdge(centralNode, networkNodes[7], { type: 'spring', restLength: 300, stiffness: 0.008, springCoils: 6, springRadius: 8, springColor: 0xf39c12, showTension: true, tensionColorMin: 0x00ff00, tensionColorMax: 0xff0000, enablePhysics: false }));
    edges.beziers.push(space.addEdge(networkNodes[0], centralNode, { type: 'bezier', curveTension: 0.4, curveType: 'cubic', autoControlPoints: true, controlPointsVisible: false, segments: 60, color: 0x8e44ad, thickness: 3, gradientColors: [0x3498db, 0x8e44ad] }));
    edges.beziers.push(space.addEdge(networkNodes[1], centralNode, { type: 'bezier', curveTension: 0.3, curveType: 'cubic', autoControlPoints: true, controlPointsVisible: false, segments: 60, color: 0x27ae60, thickness: 3, gradientColors: [0x3498db, 0x27ae60] }));
    edges.beziers.push(space.addEdge(networkNodes[2], centralNode, { type: 'bezier', curveTension: 0.5, curveType: 'cubic', autoControlPoints: true, controlPointsVisible: false, segments: 60, color: 0xe67e22, thickness: 3, gradientColors: [0x3498db, 0xe67e22] }));
    edges.beziers.push(space.addEdge(networkNodes[3], centralNode, { type: 'bezier', curveTension: 0.35, curveType: 'cubic', autoControlPoints: true, controlPointsVisible: false, segments: 60, color: 0x2ecc71, thickness: 3, gradientColors: [0x3498db, 0x2ecc71] }));
    edges.flows.push(space.addEdge(networkNodes[4], networkNodes[0], { type: 'flow', particleCount: 12, particleSpeed: 0.4, particleSize: 2, particleColor: 0x1abc9c, flowDirection: 1, animated: true, thickness: 2, color: 0x48c9b0 }));
    edges.flows.push(space.addEdge(networkNodes[5], networkNodes[1], { type: 'flow', particleCount: 12, particleSpeed: 0.4, particleSize: 2, particleColor: 0x1abc9c, flowDirection: 1, animated: true, thickness: 2, color: 0x48c9b0 }));

    space.on('graph:node:controlChanged', (event) => {
        const { controlId, value } = event;
        if (!event.node.id.startsWith('adv-edge-controls')) return; // Ensure correct control panel
        switch (controlId) {
            case 'flowSpeed': edges.flows.forEach(edge => edge.setParticleSpeed?.(parseFloat(value))); break;
            case 'flowDirection': edges.flows.forEach(edge => edge.setFlowDirection?.(parseInt(value))); break;
            case 'springStiffness': edges.springs.forEach(edge => edge.setStiffness?.(parseFloat(value))); break;
            case 'curveTension': edges.beziers.forEach(edge => edge.setCurveTension?.(parseFloat(value))); break;
            case 'showControls': edges.beziers.forEach(edge => edge.setControlPointsVisible?.(value)); break;
        }
    });

    const infoNodesData = [
        { id: 'adv-flow-info', position: { x: -400, y: 350, z: 0 }, text: 'Flow Edges\nAnimated particles', color: 0x00ff88 },
        { id: 'adv-spring-info', position: { x: 0, y: 450, z: 0 }, text: 'Spring Edges\nPhysics-based', color: 0xe74c3c },
        { id: 'adv-bezier-info', position: { x: 400, y: 350, z: 0 }, text: 'Bezier Edges\nSmooth curves', color: 0x8e44ad }
    ];
    infoNodesData.forEach(info => space.addNode(new S.TextMeshNode(info.id, {x: basePosition.x + info.position.x, y: basePosition.y + info.position.y, z: basePosition.z + info.position.z}, { text: info.text, fontSize: 11, height: 3, color: info.color, bevelEnabled: true, align: 'center', animated: true, animationType: 'float' })));

    let animationTime = 0;
    const animateAdvEdges = () => {
        animationTime += 0.016;
        edges.springs.forEach((edge, index) => edge.setRestLength?.(300 + Math.sin(animationTime * 0.5 + index) * 50));
        edges.beziers.forEach((edge, index) => edge.setCurveTension?.(Math.max(0.1, 0.4 + Math.sin(animationTime * 0.3 + index * 0.5) * 0.2)));
        if (document.getElementById(demoMetadata.id)) requestAnimationFrame(animateAdvEdges); // Continue if demo is active
    };
    animateAdvEdges();
    return centralNode;
}

function createBasicStyledEdges(space, basePosition = { x: 0, y: -600, z: 0 }) {
    const commonProps = { mass: 1.0, type: 'shape', data: { shape: 'sphere', size: 30 } };
    const nodes = [];
    const nodePositions = [
        { x: -200, y: 200 }, { x: 200, y: 200 }, { x: -200, y: 0 }, { x: 200, y: 0 },
        { x: -200, y: -200 }, { x: 200, y: -200 }, { x: 0, y: 100 }, { x: 0, y: -100 }
    ];
    nodePositions.forEach((pos, i) => {
        nodes.push(space.createNode({ id: `bsn-${i}`, position: { x: basePosition.x + pos.x, y: basePosition.y + pos.y, z: basePosition.z }, data: { ...commonProps.data, label: `N${i+1}`, color: S.Utils.randomColor() }, ...commonProps }));
    });

    space.addNode(new S.TextMeshNode('bs-title', {x: basePosition.x, y: basePosition.y + 300, z: basePosition.z}, {text: "Basic Styled Edges", fontSize:18, color: 0xcccccc}));

    space.addEdge(nodes[0], nodes[1], {label: "Basic"});
    space.addEdge(nodes[0], nodes[2], { label: 'Labeled' });
    space.addEdge(nodes[1], nodes[3], { label: 'Colored', color: 0xff00ff });
    space.addEdge(nodes[2], nodes[3], { label: 'Thick', thickness: 5 });
    space.addEdge(nodes[0], nodes[6], { label: 'Dashed', dashed: true, dashSize: 8, gapSize: 4, color: 0x00ffff });
    space.addEdge(nodes[2], nodes[4], { type: 'curved', label: 'Curved +0.5', curvature: 0.5, color: 0xffff00 });
    space.addEdge(nodes[3], nodes[5], { type: 'curved', label: 'Curved -0.5', curvature: -0.5, color: 0x00ff00 });
    space.addEdge(nodes[4], nodes[5], { label: 'Arrow: Target', arrowhead: 'target', thickness: 2, color: 0xffaaaa });
    space.addEdge(nodes[4], nodes[6], { type: 'curved', curvature: 0.3, label: 'Arrow: Source', arrowhead: 'source', thickness: 2, color: 0xaa00aa });
    space.addEdge(nodes[5], nodes[7], { type: 'curved', curvature: -0.2, label: 'Arrow: Both', arrowhead: 'both', thickness: 2, color: 0x00aa00 });
    space.addEdge(nodes[6], nodes[7], { label: 'Gradient Straight', gradientColors: [0xff0000, 0x0000ff], thickness: 4 });
    space.addEdge(nodes[0], nodes[7], { type: 'curved', curvature: 0.6, label: 'Gradient Curved', gradientColors: ['#00ffaa', '#ffaa00'], thickness: 3, arrowhead: 'target' });
    space.addEdge(nodes[1], nodes[6], { label: 'Dashed & Arrow', dashed: true, dashSize:5, gapSize:3, arrowhead: 'target', color: 0xcccccc, thickness: 1.5});
}

function createSpecializedStaticEdges(space, basePosition = { x: 800, y: -600, z: 0 }) {
    const commonProps = { mass: 1.0, type: 'shape', data: { shape: 'sphere', size: 30 } };
    const n1 = space.createNode({ id: 'ssen1', position: { x: basePosition.x - 150, y: basePosition.y + 50, z: basePosition.z }, data: { ...commonProps.data, label: 'SSE1', color: 0xff8888 }, ...commonProps });
    const n2 = space.createNode({ id: 'ssen2', position: { x: basePosition.x + 150, y: basePosition.y + 50, z: basePosition.z }, data: { ...commonProps.data, label: 'SSE2', color: 0x88ff88 }, ...commonProps });
    const n3 = space.createNode({ id: 'ssen3', position: { x: basePosition.x - 150, y: basePosition.y - 50, z: basePosition.z }, data: { ...commonProps.data, label: 'SSE3', color: 0x8888ff }, ...commonProps });
    const n4 = space.createNode({ id: 'ssen4', position: { x: basePosition.x + 150, y: basePosition.y - 50, z: basePosition.z }, data: { ...commonProps.data, label: 'SSE4 (Val:75)', value: 75, color: 0xffcc00 }, ...commonProps });

    space.addNode(new S.TextMeshNode('sse-title', {x: basePosition.x, y: basePosition.y + 150, z: basePosition.z}, {text: "Special Static Edges", fontSize:18, color: 0xcccccc}));

    space.addEdge(n1, n2, { type: 'dotted', label: 'Dotted Edge', color: 0x00ffff, thickness: 2, dashSize: 2, gapSize: 3 });
    space.addEdge(n3, n4, { type: 'dynamicThickness', label: 'Dynamic Thickness (Val:75)', color: 0xffaa00, thicknessDataKey: 'value' });
}


export function createGraph(space) {
    space.importGraphFromJSON({ nodes: [], edges: [] }); // Clear any existing content

    const advEdgesHub = createAdvancedDynamicEdges(space, { x: 0, y: 0, z: 0 });
    createBasicStyledEdges(space, { x: 0, y: -700, z: 0 });
    createSpecializedStaticEdges(space, { x: 600, y: -300, z: 50 });

    setTimeout(() => {
        space.centerView(advEdgesHub, 1200);
        const layoutPlugin = space.plugins.getPlugin('LayoutPlugin');
        if(layoutPlugin) {
            // Apply a broad layout initially, specific groups might have their own internal logic or could be fixed.
            layoutPlugin.applyLayout('force', { repulsion: 8000, stiffness: 0.005, friction: 0.3, centerStrength: 0.001 });
        }
    }, 200);

    return space; // Or an object with dispose, etc.
}