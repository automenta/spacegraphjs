# spacegraph.js: Zooming User Interface Library

## Overview

Spacegraph.js is a general-purpose, extensible JavaScript library for creating interactive 2D and 3D Zooming User Interfaces (ZUIs). Built with Three.js for rendering and supporting HTML elements as nodes, it enables developers to build complex, data-driven visualizations with features like:

- Fractal-like zooming and panning.
- A comprehensive scene graph for managing 2D and 3D elements.
- Support for various node types: HTML content, geometric shapes, and custom user-defined nodes.
- Force-directed layout engine for automatic graph organization.
- A flexible event system for reacting to graph interactions.
- Centralized configuration for customizing default behaviors and appearances.

**Purpose**: To provide a versatile JavaScript library for developers to build visually rich and interactive applications with minimal setup.

---

## Live Demo & Documentation

[View Live Demo & Documentation](https://automenta.github.io/spacegraphjs/)

---

## Quick Start

Get started with SpaceGraph.js by following these simple steps to set up a basic scene.

### 1. HTML Setup

Create an `index.html` file with a container for the graph. You'll also need an `importmap` to handle dependencies like `three.js` and `gsap`, which SpaceGraph.js relies on.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>SpaceGraph Quick Start</title>
    <link href="./index.css" rel="stylesheet" /> <!-- Path to your SpaceGraph index.css -->
    <style>
        body { margin: 0; overflow: hidden; }
        #graph-container { width: 100vw; height: 100vh; }
    </style>
</head>
<body>
    <div id="graph-container"></div>

    <script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/",
            "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js"
        }
    }
    </script>
    <script type="module">
        // Your SpaceGraph code will go here
    </script>
</body>
</html>
```
Make sure `index.css` is accessible (e.g., copy it from the SpaceGraph.js root directory to your project).

### 2. Initialize SpaceGraph

In your `<script type="module">`, import `SpaceGraph` and create an instance, linking it to your container div.

```javascript
// Inside the <script type="module">

// Adjust the path to where you've placed spacegraph.esm.min.js
// For local development, after running 'npm run build', you can use:
import { SpaceGraph } from './dist/spacegraph.esm.min.js';

const container = document.getElementById('graph-container');
if (!container) {
    console.error('Graph container #graph-container not found!');
} else {
    const graph = new SpaceGraph(container);
    console.log('SpaceGraph initialized!');

    // Add some nodes
    const noteNode = graph.addNode({
        id: 'note-1',
        type: 'note', // A built-in type for displaying HTML content
        content: '<h3>Welcome to SpaceGraph!</h3><p>This is a basic HTML note node.</p>',
        x: -200,
        y: 0,
        data: { backgroundColor: 'lightgoldenrodyellow' }
    });

    const shapeNode = graph.addNode({
        id: 'shape-1',
        type: 'shape',    // A built-in type for WebGL geometric shapes
        shape: 'sphere',  // Try 'box' too!
        label: 'My First Shape',
        color: 0xff6347,  // Tomato color
        x: 200,
        y: 0
    });

    // Connect them with an edge
    if (noteNode && shapeNode) {
        graph.addEdge(noteNode, shapeNode, { label: 'connected' });
    }

    // Center the camera on the nodes
    graph.centerView();
}
```

This setup gives you a functioning SpaceGraph instance with two connected nodes.

### Dive Deeper
-   **[TUTORIAL_HTML_APP_NODE.md](TUTORIAL_HTML_APP_NODE.md)**: A step-by-step guide to building custom, interactive HTML-based nodes.
-   **[CORE_CONCEPTS.md](CORE_CONCEPTS.md)**: For a comprehensive understanding of SpaceGraph's architecture.

---

## Local Development

To set up the project for local development, testing, and building:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/automenta/spacegraphjs.git
    cd spacegraphjs
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Run Demo Launcher & Examples:**
    To explore the various examples and demos locally, run:
    ```bash
    npm run demos
    ```
    This will start a Vite development server and open `demos.html`, which provides an interactive way to navigate to all example pages.

4.  **Build the Library:**
    To produce the distributable library files (UMD, ESM, type declarations) in the `/dist` directory:
    ```bash
    npm run build
    ```

5.  **Build for GitHub Pages Deployment:**
    To populate the `/docs` directory with all content for the GitHub Pages site (including the library, demos, and API documentation):
    ```bash
    npm run build:gh-pages
    ```

6.  **Generate API Documentation:**
    To generate only the API documentation (output to `/docs/api`):
    ```bash
    npm run docs:build
    ```
    To view the locally generated API docs:
    ```bash
    npm run docs:view
    ```

7.  **Run Tests:**
    Execute the test suite using Vitest:
    ```bash
    npm test
    ```

8.  **Linting and Formatting:**
    To check for linting issues:
    ```bash
    npm run lint
    ```
    To automatically fix linting and formatting issues:
    ```bash
    npm run lint:fix
    npm run format
    ```

---

## Installation (for consuming the library)

While the Quick Start shows direct file usage, for larger projects or when using a package manager:

Once published to npm, you will be able to install it via:

```bash
npm install spacegraph-zui --save
```

`three.js` and `gsap` are peer dependencies. When you install `spacegraph-zui` from npm, you will also need to install `three` and `gsap` separately in your project:

```bash
npm install spacegraph-zui three gsap --save
```

And then import it:

```javascript
import { SpaceGraph, HtmlAppNode } // and other exports
    from 'spacegraph-zui';
// or for UMD/CommonJS if applicable and bundler supports it:
// const { SpaceGraph } = require('spacegraph-zui');
```

---

## Key Features

- **Zooming User Interface (ZUI)**: Navigate seamlessly between different scales.
- **2D & 3D Visualization**: Supports both 2D and 3D view modes.
- **Versatile Node System**: HTML Nodes, Shape Nodes, Registered/Custom Nodes.
- **Edge System**: Connect nodes with customizable lines.
- **Force-Directed Layout**: Automatic graph organization.
- **Event System**: Subscribe to graph events.
- **Configurable Defaults**: Customize graph, nodes, and camera.

---

## Creating Custom Nodes
SpaceGraph.js allows you to define your own custom node types. The primary way to create custom HTML-based nodes is by extending the `HtmlAppNode` class.
Refer to `TUTORIAL_HTML_APP_NODE.md` for a detailed guide.

---

## Configuration
Customize default behaviors by passing a configuration object to the `SpaceGraph` constructor.
Refer to `CORE_CONCEPTS.md#5-customizing-defaults-via-configuration` for details.

---

## Event System
SpaceGraph uses an event emitter for graph actions. Use `graph.on()` to listen and `graph.off()` to stop.
Key events include `nodeAdded`, `nodeRemoved`, `edgeAdded`, `edgeRemoved`, `nodeSelected`, `edgeSelected`.
Refer to `CORE_CONCEPTS.md#4-event-systems-and-edge-linking` for details.

---

## TypeScript Support
SpaceGraph.js includes TypeScript declaration files (`.d.ts`) in its `dist` directory, providing autocompletion and type checking for TypeScript projects.

```typescript
import { SpaceGraph, HtmlAppNode, SpaceGraphConfig } from 'spacegraph-zui'; // Or from './dist/spacegraph.esm.min.js'

const container = document.getElementById('graph-container') as HTMLElement;
const config: SpaceGraphConfig = { /* ... */ };
const space = new SpaceGraph(container, config);
// ...
```

---

## Further Guides and Examples

-   **[Core Concepts Document](CORE_CONCEPTS.md)**
-   **[SpaceGraph.js Cookbook](COOKBOOK.md)**
-   **[HtmlAppNode Tutorial](TUTORIAL_HTML_APP_NODE.md)**
-   Individual example HTML files in the root directory and the interactive [Demos Page](demos.html) (view locally with `npm run demos`).

---

## Contributing

We welcome contributions! Please see `CORE_CONCEPTS.md` for an overview of the library's architecture and consider opening an issue to discuss potential changes or features.

---

## License

This project is licensed under the MIT License.
