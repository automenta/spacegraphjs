// Contents of js/example-bundled-usage.js
import { SpaceGraph } from 'spacegraph-zui'; // Will be mapped by importmap

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('graph-container-bundled');
    if (!container) {
        console.error('Graph container #graph-container-bundled not found!');
        return;
    }

    const graph = new SpaceGraph(container);
    console.log('SpaceGraph initialized in bundled demo!', graph);

    graph.addNode({
        type: 'note', // Built-in note type
        id: 'node-1-bundled',
        label: 'Note 1 (Bundled)',
        content: 'This node was added in the "bundled" usage example.',
        x: -100,
        y: 0,
        data: {
            backgroundColor: 'lightgreen'
        }
    });

    graph.addNode({
        type: 'shape',
        id: 'node-2-bundled',
        label: 'Shape 1 (Bundled)',
        shape: 'sphere',
        x: 100,
        y: 0,
        data: {
            color: 'skyblue'
        }
    });
    graph.addEdge('node-1-bundled', 'node-2-bundled', {label: 'connected'});

    graph.centerView();
});
