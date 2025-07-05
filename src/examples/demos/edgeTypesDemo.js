import * as S from '../../index.js';
// import * as THREE from 'three'; // Available via S.THREE

const demoMetadata = {
    id: 'edge-types',
    title: 'Edge Types Showcase',
    description: `<h3>Edge Types Showcase</h3>
                  <p>This page illustrates the various ways edges (links between nodes) can be styled and configured.</p>
                  <ul>
                    <li><b>Basic Edge:</b> Default straight line.</li>
                    <li><b>Labeled Edge:</b> Edge with a text label.</li>
                    <li><b>Colored Edge:</b> Edge with a custom color.</li>
                    <li><b>Thick Edge:</b> Edge with increased thickness.</li>
                    <li><b>Dashed Edge:</b> Edge with a dashed line pattern.</li>
                    <li><b>Curved Edge:</b> Edge that curves between nodes (positive/negative curvature).</li>
                    <li><b>Arrowheads:</b> Edges with arrows at the source, target, or both ends.</li>
                    <li><b>Gradient Edge:</b> Edge with a color gradient.</li>
                  </ul>`
};

function createGraph(space) {
    const commonProps = { mass: 1.0, type: 'shape', data: { shape: 'sphere', size: 40 } };

    const n1 = space.createNode({ id: 'n1', position: { x: -200, y: 200, z: 0 }, data: { ...commonProps.data, label: 'N1', color: 0xff8888 }, ...commonProps });
    const n2 = space.createNode({ id: 'n2', position: { x: 200, y: 200, z: 0 }, data: { ...commonProps.data, label: 'N2', color: 0x88ff88 }, ...commonProps });
    const n3 = space.createNode({ id: 'n3', position: { x: -200, y: 0, z: 50 }, data: { ...commonProps.data, label: 'N3', color: 0x8888ff }, ...commonProps });
    const n4 = space.createNode({ id: 'n4', position: { x: 200, y: 0, z: 50 }, data: { ...commonProps.data, label: 'N4', color: 0xffcc00 }, ...commonProps });
    const n5 = space.createNode({ id: 'n5', position: { x: -200, y: -200, z: -30 }, data: { ...commonProps.data, label: 'N5', color: 0xcc88ff }, ...commonProps });
    const n6 = space.createNode({ id: 'n6', position: { x: 200, y: -200, z: -30 }, data: { ...commonProps.data, label: 'N6', color: 0x88ccff }, ...commonProps });
    const n7 = space.createNode({
        id: 'n7',
        type: 'note', // This type overrides commonProps.type if it were spread at top level.
        position: { x: 0, y: 100, z: 100 },
        data: { // commonProps.data is not spread here, this is intentional for specific content.
            label: 'N7 (HTML)',
            content: 'Node for Edges',
            width: 150,
            height: 80,
            backgroundColor: '#333'
        },
        mass: 1.2 // Overrides commonProps.mass if it were spread at top level.
    });
    const n8 = space.createNode({ id: 'n8', position: { x: 0, y: -100, z: -80 }, data: { ...commonProps.data, label: 'N8 (Box)', shape:'box', size:50, color: 0xffaabb }, ...commonProps });


    // Basic Edge (Implicit default type: 'straight')
    space.addEdge(n1, n2);

    // Labeled Edge
    space.addEdge(n1, n3, { label: 'Labeled Edge' });

    // Colored Edge
    space.addEdge(n2, n4, { label: 'Colored', color: 0xff00ff });

    // Thick Edge
    space.addEdge(n3, n4, { label: 'Thick', thickness: 5 });

    // Dashed Edge
    space.addEdge(n1, n7, { label: 'Dashed', dashed: true, dashSize: 8, gapSize: 4, color: 0x00ffff });

    // Curved Edge (Positive curvature)
    space.addEdge(n3, n5, { type: 'curved', label: 'Curved +0.5', curvature: 0.5, color: 0xffff00 });

    // Curved Edge (Negative curvature)
    space.addEdge(n4, n6, { type: 'curved', label: 'Curved -0.5', curvature: -0.5, color: 0x00ff00 });

    // Arrowheads: target
    space.addEdge(n5, n6, { label: 'Arrow: Target', arrowhead: 'target', thickness: 2, color: 0xffaaaa });

    // Arrowheads: source
    space.addEdge(n5, n7, { type: 'curved', curvature: 0.3, label: 'Arrow: Source', arrowhead: 'source', thickness: 2, color: 0xaa00aa });

    // Arrowheads: both
    space.addEdge(n6, n8, { type: 'curved', curvature: -0.2, label: 'Arrow: Both', arrowhead: 'both', thickness: 2, color: 0x00aa00 });

    // Gradient Edge (Straight)
    space.addEdge(n7, n8, { label: 'Gradient Straight', gradientColors: [0xff0000, 0x0000ff], thickness: 4 });

    // Gradient Edge (Curved)
    space.addEdge(n1, n8, { type: 'curved', curvature: 0.6, label: 'Gradient Curved', gradientColors: ['#00ffaa', '#ffaa00'], thickness: 3, arrowhead: 'target' });

    // Dashed and Arrow
    space.addEdge(n2, n7, { label: 'Dashed & Arrow', dashed: true, dashSize:5, gapSize:3, arrowhead: 'target', color: 0xcccccc, thickness: 1.5});
}

export { createGraph, demoMetadata };
