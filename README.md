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

## Quick Start Tutorial

This tutorial will guide you through setting up a basic SpaceGraph application, adding different types of nodes, connecting them, and creating your own custom interactive nodes.

### 1. Setup

First, you'll need to get the SpaceGraph.js library and include it in your HTML file.

**a. Get the Code:**

You can clone the repository or download the necessary files (primarily `dist/spacegraph.esm.min.js` and `index.css`).

```bash
git clone https://github.com/automenta/spacegraphjs.git
cd spacegraphjs
```
The library files (builds) are located in the `dist/` folder. You'll also need `index.css` from the root directory.

**b. HTML Structure:**

Create an HTML file. You'll need a container element for the graph and an `importmap` to manage dependencies like `three.js` and `gsap`, which are required by SpaceGraph.js when using its ES Module version.

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>SpaceGraph Quick Start</title>
        <link href="./index.css" rel="stylesheet" />
        <!-- Adjust path to your index.css -->
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
            // Main script will go here
        </script>
    </body>
</html>
```

**Note on Builds:** The `dist/` folder contains different builds:
- `dist/spacegraph.esm.js` / `dist/spacegraph.esm.min.js`: ES Module (use with `importmap` or bundlers). `three` and `gsap` are external.
- `dist/spacegraph.umd.js` / `dist/spacegraph.umd.min.js`: UMD (for direct `<script>` tags without modules). `THREE` and `gsap` are expected to be global if not using a module system.

This tutorial uses the ES Module version.

### 2. Initializing SpaceGraph

Inside the `<script type="module">` tag, import `SpaceGraph` and initialize it with your container element:

```javascript
// Continuing in <script type="module">

// Adjust path if you copied dist files elsewhere.
import { SpaceGraph, HtmlAppNode } from './dist/spacegraph.esm.min.js';

const container = document.getElementById('graph-container');
if (!container) {
    console.error('Graph container not found!');
} else {
    const graph = new SpaceGraph(container);
    console.log('SpaceGraph initialized!');

    // More steps will follow here...
}
```

### 3. Adding Nodes

**a. Add an HTML Node:**

HTML nodes can render arbitrary DOM content.

```javascript
// Inside the else block where 'graph' is defined:
const htmlNode = graph.addNode({
    id: 'my-html-node',
    type: 'note', // 'note' is a pre-configured HTML node type
    content: '<h3>Hello from HTML!</h3><p>This is a note node.</p>',
    x: -150,
    y: 50
});
```

**b. Add a Shape Node:**

Shape nodes are simple geometric primitives rendered with WebGL.

```javascript
// Inside the else block:
const shapeNode = graph.addNode({
    id: 'my-shape-node',
    type: 'shape',
    shape: 'sphere', // or 'box'
    label: 'Sphere Node',
    color: 0x00ccff, // Light blue
    x: 150,
    y: -50
});
```

### 4. Connecting Nodes

Use `addEdge()` to create a visual link between nodes.

```javascript
// Inside the else block, after adding nodes:
if (htmlNode && shapeNode) {
    graph.addEdge(htmlNode, shapeNode, { label: 'Connected To' });
}
```

### 5. Basic Interaction

-   **Camera Controls**: Use your mouse (click-drag to pan, scroll to zoom) or touch gestures to navigate the space.
-   **Centering View**: To programmatically focus on the current nodes:

```javascript
// Inside the else block:
graph.centerView(); // Or graph.centerView([htmlNode, shapeNode])
```

### 6. Creating a Custom HTML Node (`HtmlAppNode`)

You can define your own interactive HTML nodes by extending `HtmlAppNode`. `HtmlAppNode` provides the base functionality for HTML-based nodes that can have their own application logic.

**a. Simple Example Class (Counter Node):**

Let's create a node with a button that increments a counter.

```javascript
// Place this class definition within your <script type="module">,
// or in a separate JS file and import it.
// Ensure HtmlAppNode is imported as shown in step 2.

class CounterNode extends HtmlAppNode {
    constructor(id, sg, config) {
        super(id, sg, config); // Pass all args to super constructor
        // initialUserData (config) is available in this.data after super() call if getDefaults is set up correctly
        this.count = this.data.initialCount || 0;
    }

    // onInit() is called by HtmlAppNode's constructor after the main element is ready
    onInit() {
        // this.htmlElement is the main DOM element for this node, created by HtmlAppNode.
        // this.contentElement is often the same as this.htmlElement unless customized further.
        // For simplicity, we'll populate this.htmlElement directly.
        this.htmlElement.innerHTML = `
            <div style="padding: 10px; text-align: center; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <h4>Counter</h4>
                <p>Count: <span class="count-display">${this.count}</span></p>
                <button class="increment-button" style="padding: 5px 10px;">Increment</button>
            </div>
        `;

        // Query for elements within this.htmlElement
        const incrementButton = this.htmlElement.querySelector('.increment-button');
        const countDisplay = this.htmlElement.querySelector('.count-display');

        // Add event listener to the button
        if (incrementButton && countDisplay) {
            incrementButton.addEventListener('click', () => {
                this.count++;
                countDisplay.textContent = this.count;
                // If the node's size needs to change dynamically based on content,
                // you might call this.updateSize() if available and needed,
                // or manage size via CSS and ensure graph updates if bounds change.
                // For this simple counter, size is static.
            });
            // Important: Stop pointer events on interactive elements to prevent graph dragging/panning
            this.stopEventPropagation(incrementButton);
        }
    }

    // Optional: onDataUpdate can be used to react to external data changes
    // onDataUpdate(updatedData) {
    //   if (updatedData.hasOwnProperty('initialCount')) {
    //     this.count = this.data.initialCount; // this.data already has the new value
    //     const countDisplay = this.htmlElement.querySelector('.count-display');
    //     if (countDisplay) countDisplay.textContent = this.count;
    //   }
    // }
}
```

**b. Corresponding `typeDefinition`:**

This tells SpaceGraph how to handle your custom node type. It includes the class itself and default properties.

```javascript
// Inside the else block in your main script, before adding the custom node instance:
const counterNodeTypeDefinition = {
    name: 'counter', // The 'type' string you'll use when adding nodes
    appNodeClass: CounterNode, // The class for this node type
    defaultWidth: 180,         // Optional: default width in pixels
    defaultHeight: 120,        // Optional: default height in pixels
    // You can add other default properties specific to 'counter' nodes here
    // e.g., defaultColor: 0xffcc00,
};
```

**c. Registering the Custom Node Type:**

Make SpaceGraph aware of your new node type.

```javascript
// Inside the else block:
graph.getNodeTypeRegistry().registerNodeType(counterNodeTypeDefinition);
```

**d. Adding an Instance of the Custom Node:**

Now you can add nodes of type `'counter'`. You can also pass initial configuration to your custom node.

```javascript
// Inside the else block:
const customCounterNode = graph.addNode({
    id: 'my-counter-node',
    type: 'counter', // Matches 'name' in typeDefinition
    x: 0,
    y: 200,
    initialCount: 5 // Custom property passed to CounterNode constructor via config
});

// Connect it to another node if you like
if (shapeNode && customCounterNode) {
    graph.addEdge(shapeNode, customCounterNode, { label: 'Triggers' });
}

graph.centerView(); // Recenter to see all nodes
```

### 7. Next Steps

You've now seen the basics of SpaceGraph.js! From here, you can explore:

-   **More Node Types**: Experiment with different shapes, styles, and more complex HTML content.
-   **Force-Directed Layouts**: Let SpaceGraph automatically arrange your nodes.
-   **Event System**: React to user interactions and graph changes.
-   **Configuration**: Customize default behaviors for camera, nodes, and edges.
-   **Advanced Custom Nodes**: Create sophisticated nodes with unique behaviors and appearances by extending `HtmlAppNode` or even `BaseNode` for fully custom WebGL rendering.
-   **Cookbook for Advanced Styling and More**: Check out the [SpaceGraph.js Cookbook](COOKBOOK.md) for practical recipes on advanced styling, custom interactions, and other common tasks.

Refer to the "Key Features", "Configuration", "Event System", and "API Documentation" sections in this README for more details.

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

Refer to the API documentation (JSDoc for `SpaceGraphConfig` in `spacegraph.js`) for the full structure and all available options.

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

See the API documentation (JSDoc in `spacegraph.js`) for more details on events and their data.

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

## Running Examples

The repository includes several HTML files in the root directory (e.g., `example-app-nodes.html`, `example-event-emitter.html`, `example-centralized-config.html`) that demonstrate various features and usage patterns.

To run these examples:

1.  Ensure you have the project files (especially `spacegraph.js` or its builds in `dist/`, and `index.css`).
2.  Open any of the `example-*.html` files directly in your web browser (e.g., by double-clicking them or using a simple HTTP server like `npx serve .` from the project root).

These examples are a great way to see SpaceGraph.js in action and to get started with your own projects.

---

## Further Guides and Examples

For more in-depth guides and practical examples, refer to:

-   **[SpaceGraph.js Cookbook](COOKBOOK.md)**: Contains recipes for advanced styling, custom interactions, performance tips, and more.
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
