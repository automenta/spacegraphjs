import { SpaceGraph } from './src/SpaceGraph.js';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('graph-container');
    if (!container) {
        console.error('Container element #graph-container not found.');
        return;
    }

    const space = new SpaceGraph(container);

    const node1 = space.createNode({
        id: 'n1',
        type: 'shape',
        data: { label: 'Hello', color: 0xff0000, size: 20 },
        position: { x: 0, y: 0, z: 0 }
    });

    const node2 = space.createNode({
        id: 'n2',
        type: 'html',
        data: {
            content: '<div>This is an HTML node.</div>',
        },
        position: { x: 100, y: 50, z: 0 }
    });

    const node3 = space.createNode({
        id: 'n3',
        type: 'shape',
        data: { label: 'World', color: 0x00ff00, size: 20 },
        position: { x: -100, y: -50, z: 0 }
    });

    space.addEdge(node1, node2);
    space.addEdge(node1, node3);

    space.applyLayout();

    space.animate();
});
