# SpaceGraphJS

SpaceGraphJS is a JavaScript library for creating interactive 3D force-directed graphs in the browser. It leverages Three.js for WebGL rendering of 3D elements and CSS3DRenderer for embedding rich HTML content within graph nodes. The library is designed to be modular, performant, and extensible.

## Features

- **3D Graph Visualization**: Renders nodes and edges in a 3D space.
- **HTML Nodes**: Allows complex HTML content to be used as node visuals, enabling rich UIs within the graph.
- **Shape Nodes**: Supports basic 3D shapes (spheres, boxes) for simpler node representations, with 3D text labels.
- **Force-Directed Layout**: Implements a force simulation to automatically arrange nodes and edges.
    - Customizable forces (repulsion, spring-like edges with configurable stiffness and length).
    - Support for different edge constraint types (elastic, rigid, weld).
- **Interactive UI**:
    - Drag & drop nodes.
    - Resize HTML nodes.
    - Context menus for creating nodes, linking, deleting, etc.
    - Interactive edge menu for adjusting properties like color and thickness.
    - Smooth camera controls (pan, zoom, focus on node) with GSAP animations.
    - History for camera movements (back/forward).
- **Modular Design**: Core components like `SpaceGraph`, `UIManager`, `ForceLayout`, `Camera`, and Node types are organized into classes.
- **ES Module Support**: Can be easily integrated into modern JavaScript projects.

## Live Demo

A live demo is available on GitHub Pages: [https://TTime.github.io/spacegraphjs/](https://TTime.github.io/spacegraphjs/)

## Getting Started

### Prerequisites

SpaceGraphJS relies on ES modules and modern browser features. You'll need to import `three.js` and `gsap`. The demo uses CDN links via an import map.

### Basic Usage

1.  **HTML Setup**:
    Create an HTML file with a container for the graph and the necessary UI elements for context menus and dialogs.

    ```html
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <title>My SpaceGraph App</title>
            <link rel="stylesheet" href="path/to/your/spacegraph.css" />
            <style>
                body {
                    margin: 0;
                    overflow: hidden;
                }
                #graph-container {
                    width: 100vw;
                    height: 100vh;
                    position: relative;
                }
                .context-menu {
                    display: none;
                }
                .dialog {
                    display: none;
                }
            </style>
        </head>
        <body>
            <div id="graph-container">
                <canvas id="webgl-canvas"></canvas>
                <div class="context-menu" id="context-menu"></div>
                <div class="dialog" id="confirm-dialog">
                    <p id="confirm-message">Are you sure?</p>
                    <button id="confirm-yes">Yes</button>
                    <button id="confirm-no">No</button>
                </div>
            </div>

            <script type="importmap">
                {
                    "imports": {
                        "three": "https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js",
                        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/",
                        "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js"
                    }
                }
            </script>
            <script type="module" src="my-app.js"></script>
        </body>
    </html>
    ```

2.  **JavaScript (`my-app.js`)**:
    Import the necessary classes from `spacegraph.js` and initialize your graph.

    ```javascript
    import {
        SpaceGraph,
        NoteNode,
        ShapeNode,
        $,
    } from './path/to/src/index.js';

    document.addEventListener('DOMContentLoaded', async () => {
        const graphContainer = $('#graph-container');
        const contextMenuEl = $('#context-menu');
        const confirmDialogEl = $('#confirm-dialog');

        if (!graphContainer || !contextMenuEl || !confirmDialogEl) {
            console.error('Missing required DOM elements for SpaceGraphJS UI.');
            return;
        }

        const space = new SpaceGraph(graphContainer, {
            ui: {
                contextMenuElement: contextMenuEl,
                confirmDialogElement: confirmDialogEl,
            },
        });

        await space.init();

        const node1 = space.createNode({
            id: 'node1',
            type: 'note',
            position: { x: 0, y: 0, z: 0 },
            data: {
                content: 'Hello World!',
                width: 150,
                height: 50,
            }
        });

        const node2 = space.createNode({
            id: 'node2',
            type: 'shape',
            position: { x: 100, y: 50, z: 10 },
            data: {
                label: '3D Sphere',
                shape: 'sphere',
                size: 40,
                color: 0xff00ff,
            }
        });

        if (node1 && node2) {
            space.addEdge(node1, node2);
        }

        space.centerView();
        space.animate();

        window.mySpaceGraph = space;
    });
    ```

### CSS

You'll need CSS to style the HTML nodes, context menus, dialogs, and other UI elements. You can use `src/spacegraph.css` as a starting point or write your own.

## Development

To run the demo locally, simply open `index.html` in a modern web browser that supports ES modules.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
