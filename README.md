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

    // You can now interact with the graph using your mouse:
    // - Click and drag to pan.
    // - Scroll to zoom.
    // - Click on nodes/edges to select them (if selectable).
}
```

This setup gives you a functioning SpaceGraph instance with two connected nodes. You can pan and zoom to explore the space.

### Dive Deeper

You've now created your first SpaceGraph scene! To unlock more powerful features, such as creating your own custom interactive HTML nodes or understanding the library's core mechanics, we recommend the following resources:

-   **[TUTORIAL_HTML_APP_NODE.md](TUTORIAL_HTML_APP_NODE.md)**: A step-by-step guide to building custom, interactive HTML-based nodes using the `HtmlAppNode` class. This is essential for creating rich user interfaces within your graph.
-   **[CORE_CONCEPTS.md](CORE_CONCEPTS.md)**: For a comprehensive understanding of SpaceGraph's architecture, including the node lifecycle, event system, layout engine, rendering pipeline, and configuration options.

Exploring these documents will help you leverage the full potential of SpaceGraph.js for your projects. Happy visualizing!

---

## Creating Custom Nodes

SpaceGraph.js allows you to define your own custom node types, enabling rich, interactive experiences tailored to your application's needs. This is particularly powerful when using HTML and JavaScript to create complex user interface elements within the graph.

The primary way to create custom HTML-based nodes is by extending the `HtmlAppNode` class (or a similar base class if you have specific needs not covered by `HtmlAppNode`). You define the structure, styling, and behavior of your node within its class methods.

A definition object is then used to register your custom node with SpaceGraph, specifying its `typeName`, the `nodeClass` to use, and default properties (`getDefaults`).

**Key Steps:**

1.  **Define your Node Class**: Create a JavaScript class that extends `HtmlAppNode` (or another suitable base).
    *   Implement `onInit()` to set up the initial HTML structure and event listeners.
    *   Optionally, implement `onDataUpdate()` to react to changes in the node's data.
2.  **Create a Node Definition**: Create an object that includes:
    *   `typeName`: A unique string identifier for your node type (e.g., 'my-special-node'). This is also used to derive CSS class names (e.g., `.my-special-node-node`).
    *   `nodeClass`: The class you defined in step 1.
    *   `getDefaults`: A function that returns an object with default data properties for new instances of your node (e.g., default size, label).
3.  **Register your Node Type**: Use `space.registerNodeType(definition.typeName, definition)` to make SpaceGraph aware of your custom node.
4.  **Add Nodes**: Use `space.addNode({ type: 'your-type-name', ... })` to create instances of your custom node.

For a practical example, see:
*   `example-custom-node.html`: Demonstrates how to set up a page to use a custom node.
*   `js/nodes/MyCustomNode.js`: Shows the implementation of a custom node class (`MyCustomNode`) and its definition object (`myCustomNodeDefinition`).

By following this pattern, you can create highly customized and reusable components within your SpaceGraph visualizations. Refer to the `TUTORIAL_HTML_APP_NODE.md` for a more in-depth guide on `HtmlAppNode`.

---

## Installation

While the Quick Start Tutorial shows direct file usage, for larger projects or when using a package manager:

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

- **Zooming User Interface (ZUI)**: Navigate seamlessly between different scales in a fractal-like manner.
- **2D & 3D Visualization**: Supports both 2D (top-down) and 3D (free-look, spherical) view modes.
- **Versatile Node System**:
    - **HTML Nodes**: Render DOM elements directly within the 3D space (e.g., `NoteNode`, or custom nodes extending `HtmlAppNode`).
    - **Shape Nodes**: Create basic geometric shapes (boxes, spheres) via WebGL.
    - **Registered Nodes**: Define and use custom node types with specific appearances and behaviors (e.g., using the `HtmlAppNode` base class for rich HTML content, or `RegisteredNode` for more generic custom nodes).
- **Edge System**: Connect nodes with customizable lines, supporting physics constraints.
- **Force-Directed Layout**: Automatic graph layout based on physics simulation to organize nodes and edges.
- **Event System**: Subscribe to events like `nodeAdded`, `nodeSelected`, etc., to integrate with your application logic. (See "Event System" section).
- **Configurable Defaults**: Customize many default aspects of the graph, nodes, and camera via a configuration object. (See "Configuration" section).
- **Heads-Up Display (HUD)**: Includes an interactive HUD for logs, alerts, and REPL commands (though this is more of a UIManager feature built on top).

---

## Configuration

You can customize many default behaviors and appearances by passing a configuration object as the _second_ argument to the `SpaceGraph` constructor.

```javascript
const myConfig = {
    rendering: {
        defaultBackgroundColor: 0x222222, // Dark gray background
        defaultBackgroundAlpha: 1.0, // Opaque background
    },
    camera: {
        initialPositionZ: 900, // Start camera a bit further out
        fov: 65, // Adjust field of view
    },
    defaults: {
        node: {
            html: { backgroundColor: 'rgba(255, 255, 200, 0.85)' }, // Light yellow HTML nodes
            shape: { color: 0x00aaee, size: 55 }, // Blueish, slightly larger shapes
        },
        edge: {
            color: 0xcccccc, // Light gray edges
            thickness: 1, // Thinner edges
        },
    },
};

// Initialize with the custom configuration
// The SpaceGraph constructor is: new SpaceGraph(containerElement, config = {}, uiElements = {})
const graph = new SpaceGraph(container, myConfig, {}); // Pass config as second arg
```

Refer to the API documentation (JSDoc for `SpaceGraphConfig` in `spacegraph.js`) for the full structure and all available options. For a conceptual overview, see [Configuration in Core Concepts](CORE_CONCEPTS.md#5-customizing-defaults-via-configuration).

---

## Event System

SpaceGraph uses an event emitter to announce significant actions within the graph. You can listen for these events using the `on()` method and stop listening with `off()`.

```javascript
// Listen for when a node is selected
graph.on('nodeSelected', (eventData) => {
    if (eventData.selectedNode) {
        console.log('Node selected:', eventData.selectedNode.id);
        console.log('Previously selected node:', eventData.previouslySelectedNode?.id);
    } else {
        console.log('Node deselected. Previously selected:', eventData.previouslySelectedNode?.id);
    }
});

// Listen for when a new node is added
graph.on('nodeAdded', (eventData) => {
    console.log('New node added to the graph:', eventData.node);
});

// To remove a listener:
// const myCallback = (data) => { /* ... */ };
// graph.on('someEvent', myCallback);
// graph.off('someEvent', myCallback);
```

**Key Events:**

- `nodeAdded`: When a node is added. (Data: `{ node: BaseNode }`)
- `nodeRemoved`: When a node is removed. (Data: `{ nodeId: string, node: BaseNode }`)
- `edgeAdded`: When an edge is added. (Data: `{ edge: Edge }`)
- `edgeRemoved`: When an edge is removed. (Data: `{ edgeId: string, edge: Edge }`)
- `nodeSelected`: When a node is selected or deselected. (Data: `{ selectedNode: BaseNode | null, previouslySelectedNode: BaseNode | null }`)
- `edgeSelected`: When an edge is selected or deselected. (Data: `{ selectedEdge: Edge | null, previouslySelectedEdge: Edge | null }`)

See the API documentation (JSDoc in `spacegraph.js`) for more details on events and their data. For a more detailed explanation of the event system and its role in edge linking and inter-node communication, see the [Event System in Core Concepts](CORE_CONCEPTS.md#4-event-systems-and-edge-linking).

---

## API Documentation

The API documentation is embedded as JSDoc comments directly within the `spacegraph.js` source code.

To generate and view browsable HTML documentation:

1.  **Build the documentation:**
    Run the following command in your terminal at the root of the project:

    ```bash
    npm run docs:build
    ```

    This will generate the documentation in the `./docs/api/` directory.

2.  **View the documentation:**
    You can then view the generated documentation by running:
    ```bash
    npm run docs:view
    ```
    This script will output a message suggesting you open `./docs/api/index.html` in your browser. Alternatively, you can directly open the `./docs/api/index.html` file in your preferred web browser.

If you prefer to read the JSDoc comments directly in the source code, open the `spacegraph.js` file and read the JSDoc blocks (formatted as `/** ... */`) preceding class and method definitions.

---

## TypeScript Support

SpaceGraph.js now includes TypeScript declaration files (`.d.ts`) as part of its distribution in the `dist` directory. These files provide type information for the library's API, enabling several benefits for developers using TypeScript in their projects:

*   **Autocompletion**: Get intelligent autocompletion for SpaceGraph classes, methods, and properties directly in your code editor.
*   **Type Checking**: Catch type-related errors at compile time, leading to more robust code.
*   **Improved Readability**: Type annotations make it easier to understand the expected data types for functions and properties.

When you install `spacegraph-zui` from npm (once available) and import it into a TypeScript project, the TypeScript compiler should automatically pick up these declaration files.

For example:
```typescript
import { SpaceGraph, HtmlAppNode, SpaceGraphConfig } from 'spacegraph-zui'; // Or from './dist/spacegraph.esm.min.js' if using local files

const container = document.getElementById('graph-container') as HTMLElement;

const config: SpaceGraphConfig = { // Type checking for configuration
    camera: {
        initialPositionZ: 1000,
    }
};

const space = new SpaceGraph(container, config);

const node = space.addNode({ // Autocompletion for node properties
    type: 'note',
    id: 'ts-node',
    x: 0, y: 0,
    content: 'Hello from TypeScript!'
});
```

The inclusion of type declarations aims to make integrating SpaceGraph.js into TypeScript projects smoother and more type-safe. The type generation is done using `tsc` based on JSDoc annotations in the JavaScript source code.

---

## Running Examples

For a convenient overview and access to all live examples, open the **[Demos Page](demos.html)** in your browser.

While `demos.html` provides a good overview, you can also explore individual examples directly. Here’s a categorized guide to some key examples that showcase different aspects of SpaceGraph.js:

*   **Core Concepts & Basic Usage:**
    *   `index.html`: A minimal starting point.
    *   `example-3d-scene.html`: Demonstrates basic 3D scene setup.
    *   `example-shape-nodes.html`: Focuses on using built-in 3D shapes.
    *   `example-text-nodes.html`: Shows simple text rendering in the graph.

*   **Custom HTML Nodes (using `HtmlAppNode`):**
    *   `TUTORIAL_HTML_APP_NODE.md`: The primary tutorial for `HtmlAppNode`.
    *   `example-simple-counter-app-node.html`: A beginner-friendly custom HTML node.
    *   `example-custom-node.html` (uses `js/nodes/MyCustomNode.js`): A straightforward custom `HtmlAppNode` example.
    *   `example-app-nodes.html`: Features more complex `HtmlAppNode` examples like a Markdown Editor and a Task List.
    *   `example-dashboard.html`: Illustrates building a dashboard with HTML-based nodes.

*   **Custom WebGL Nodes (using `RegisteredNode`):**
    *   `example-custom-webgl-node.html`: Shows creating a custom WebGL node by extending `RegisteredNode` with a class, including custom geometry and `emit`/`listenTo` usage. (Recommended for class-based approach)
    *   `example-registered-node-webgl.html`: Demonstrates defining a custom WebGL node using functional callbacks directly within the `TypeDefinition` object. (Alternative approach)

*   **Custom HTML Nodes (using `RegisteredNode` with functional `TypeDefinition`):**
    *   `example-registered-node-html.html`: Illustrates creating custom HTML nodes via functional callbacks in the `TypeDefinition`, without a dedicated `HtmlAppNode` subclass.

*   **Inter-Node Communication & Events:**
    *   `example-event-emitter.html`: Focuses on global graph events (e.g., `nodeAdded`, `nodeSelected`).
    *   `example-inter-node-communication.html`: Details node-to-node communication using `emit`/`listenTo` and data propagation through ports.

*   **Dynamic Graph Operations & Configuration:**
    *   `example-dynamic-updates.html`: Shows how to add, remove, and update nodes and edges dynamically.
    *   `example-dynamic-dashboard.html`: Expands on the dashboard concept with dynamic elements.
    *   `example-centralized-config.html`: Explains how to use the global configuration object to customize SpaceGraph.

*   **Specific Layouts & Use Cases:**
    *   `example-hierarchical-data.html`: Example of displaying hierarchical structures.
    *   `example-mindmap.html`: A mind-mapping application example.

*   **Bundled Usage:**
    *   `example-bundled-usage.html`: Demonstrates how to use the pre-bundled `spacegraph.umd.js` or `spacegraph.esm.js` files.

To run any of these, ensure you have the project files (especially `dist/spacegraph.esm.min.js` or other builds, and `index.css`), and then open the respective `example-*.html` file in your web browser.

---

## Further Guides and Examples

For more in-depth guides and practical examples, refer to:

-   **[Core Concepts Document](CORE_CONCEPTS.md)**: Delves into the architecture, node lifecycle, rendering pipeline, and advanced topics.
-   **[SpaceGraph.js Cookbook](COOKBOOK.md)**: Contains recipes for advanced styling, custom interactions, performance tips, and more.
-   **[HtmlAppNode Tutorial](TUTORIAL_HTML_APP_NODE.md)**: A detailed guide to creating custom interactive HTML nodes.
-   The example HTML files in the root directory also showcase various features.

---

## Testing

A basic testing infrastructure is set up using Vitest.
To run the tests:

```bash
npm test
```

The current test suite primarily covers utility functions and is a work in progress. Contributions to expand test coverage are welcome!

---

## Contributing

We welcome contributions! Please see `CORE_CONCEPTS.md` for an overview of the library's architecture and consider opening an issue to discuss potential changes or features.

---

## License

This project is licensed under the MIT License.
