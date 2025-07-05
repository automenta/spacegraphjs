# SpaceGraph ZUI Library

[![npm version](https://badge.fury.io/js/spacegraph-zui.svg)](https://badge.fury.io/js/spacegraph-zui)
[![Build Status](https://github.com/TTime/spacegraphjs/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/TTime/spacegraphjs/actions/workflows/gh-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**SpaceGraph ZUI** (Zoomable User Interface) is a general-purpose, extensible JavaScript library for creating interactive 2D and 3D graph visualizations. It leverages Three.js for WebGL rendering and offers rich HTML content embedding within graph nodes. The library is designed to be modular, performant, and highly customizable through a plugin architecture.

## Features

- **2D/3D Graph Visualization**: Renders nodes and edges in a 2D or 3D space.
- **Versatile Node Types**:
    - **HTML Nodes**: Embed complex HTML content as node visuals, enabling rich UIs within the graph.
    - **Shape Nodes**: Supports basic 3D shapes (e.g., spheres, boxes) with 3D text labels.
    - **Image, Video, IFrame Nodes**, and more. Easily extensible for custom node types.
- **Dynamic Layouts**:
    - Built-in force-directed layout.
    - Support for various layout algorithms (Circular, Grid, Hierarchical, Radial, Spherical, TreeMap) via plugins.
    - Pin nodes to fix their positions.
- **Interactive UI & Camera**:
    - Drag & drop nodes.
    - Smooth camera controls (pan, zoom, focus on node) powered by GSAP.
    - Camera movement history (back/forward).
    - Context menus for nodes and edges.
- **Extensible Plugin System**: Customize or extend nearly any aspect of the library by creating or modifying plugins for rendering, camera behavior, UI interactions, data handling, and more.
- **Multiple Module Formats**: Supports ES Modules (ESM), CommonJS (CJS), and UMD, compatible with Node.js and modern browsers.
- **TypeScript Definitions**: Includes type definitions for a better development experience with TypeScript.

## Live Demo

A live demo showcasing various features is available on GitHub Pages: [https://TTime.github.io/spacegraphjs/](https://TTime.github.io/spacegraphjs/)

## Installation

```bash
npm install spacegraph-zui
# or
yarn add spacegraph-zui
```

You will also need to install its peer dependencies if you haven't already:

```bash
npm install three gsap postprocessing
# or
yarn add three gsap postprocessing
```

## Quick Start

1.  **HTML Setup**:
    You need a container element in your HTML for the graph.

    ```html
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <title>My SpaceGraph App</title>
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
            </style>
        </head>
        <body>
            <div id="graph-container"></div>
            <script type="module" src="my-app.js"></script>
        </body>
    </html>
    ```

    _Note: For HTML nodes and default UI elements like context menus, you might need additional CSS. Refer to the library's CSS or provide your own._

2.  **JavaScript (`my-app.js`)**:

    ```javascript
    import { SpaceGraph } from 'spacegraph-zui';
    // For CommonJS: const { SpaceGraph } = require('spacegraph-zui');

    document.addEventListener('DOMContentLoaded', async () => {
        const container = document.getElementById('graph-container');

        if (!container) {
            console.error('Graph container not found!');
            return;
        }

        // Basic options (see documentation for more)
        const options = {
            // Example: configure default layout
            layout: {
                type: 'ForceLayout', // Default, can be omitted
                settings: {
                    // Force layout specific settings
                },
            },
            // Example: UI plugin options (if using default UI elements)
            // ui: {
            //   contextMenuElement: document.getElementById('my-custom-context-menu'),
            //   confirmDialogElement: document.getElementById('my-custom-confirm-dialog')
            // }
        };

        const sg = new SpaceGraph(container, options);

        try {
            await sg.init(); // Initialize plugins and renderer

            // Add some nodes
            const node1 = sg.createNode({
                id: 'node-1',
                type: 'ShapeNode', // Default node type, can be 'HtmlNode', 'ImageNode' etc.
                data: { label: 'Hello' },
                position: { x: -50, y: 0, z: 0 }, // Optional initial position
            });

            const node2 = sg.createNode({
                id: 'node-2',
                type: 'ShapeNode',
                data: { label: 'World' },
                position: { x: 50, y: 0, z: 0 },
            });

            // Add an edge between them
            if (node1 && node2) {
                sg.addEdge(node1, node2, { label: 'connects to' });
            }

            // If your layout requires manual starting or if you want to ensure rendering loop
            sg.animate(); // Starts the rendering loop if not auto-started by plugins

            // Center view on content or specific node
            sg.centerView();
        } catch (error) {
            console.error('Failed to initialize SpaceGraph:', error);
        }

        // Make it accessible for debugging
        window.mySpaceGraph = sg;
    });
    ```

## API Documentation

For detailed API documentation, including all classes, methods, options, and plugin development, please visit [our documentation site](PLACEHOLDER_API_DOCS_LINK). (Link to be updated once JSDoc/TypeDoc is hosted).

## Development

To set up the development environment:

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Run the development server (for the demo page `index.html`): `npm start`.
4. To build the library: `npm run build`.

## Contributing

Contributions are welcome! Please read our `CONTRIBUTING.md` (to be created) for guidelines on how to contribute, report issues, and submit pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
