# spacegraph.js: Zooming User Interface Library

## 1. Overview
The Zooming User Interface Library is a general-purpose, extensible JavaScript library built with HTML, JavaScript, and three.js. It provides a fractal-like zooming interface that supports both 2D and 3D visualizations, enabling developers to create a wide variety of applications. The library is designed to be highly abstract, customizable, and easy to use, with a focus on a comprehensive scene graph, flexible event handling, and an interactive heads-up display (HUD).

**Purpose**: To serve as a ubiquitous JavaScript library that developers can include to build complex, interactive, and visually rich applications with minimal setup.

**Scope**: The library supports fractal scaling, multiple view modes, interactive widgets, a robust event handling system, and a HUD with system controls and a REPL for dynamic interaction.

---

## Getting Started / Manual Setup

Since the library is not yet available as an npm package, you can use it by directly including `spacegraph.js` in your project.

1.  **Get the Code:** Clone this repository or download the `spacegraph.js` file and `index.css` (and any other necessary assets like images if your nodes use them).
2.  **Include in HTML:** Create an HTML file and include `spacegraph.js` as a module. You'll also need to include `three.js` and `gsap`. The recommended way to handle these external dependencies is via CDNs and an import map, as demonstrated in the example files (e.g., `index.html`, `example-app-nodes.html`).

    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>My SpaceGraph App</title>
        <link href="path/to/your/index.css" rel="stylesheet"/> <!-- Link to where you put index.css -->
        <style>
            body { margin: 0; overflow: hidden; }
            #my-spacegraph-container { width: 100vw; height: 100vh; }
        </style>
    </head>
    <body>
        <div id="my-spacegraph-container">
            <!-- Canvas and CSS3D container will be added here by SpaceGraph -->
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
        <script type="module">
            import { SpaceGraph } from './path/to/your/spacegraph.js'; // Adjust path as needed

            const container = document.getElementById('my-spacegraph-container');
            if (container) {
                const space = new SpaceGraph(container);
                // ... your application logic ...

                // Example: Add a simple node
                space.addNode({
                    type: 'note', // Built-in NoteNode
                    id: 'welcome-note',
                    x: 0, y: 0, z: 0,
                    content: 'Hello SpaceGraph!',
                    width: 200, height: 80
                });
                space.centerView();
            } else {
                console.error("Container element not found!");
            }
        </script>
    </body>
    </html>
    ```
3.  **Explore Examples:** Check out the `example-*.html` files in the repository to see various features and custom node implementations.

---

## 2. Functional Requirements

### 2.1 Core Features

#### 2.1.1 Fractal Zooming Interface
- **Description**: The interface supports infinite zooming, where elements can be composed at different scales, resembling a fractal structure.
- **Behavior**:
    - Zooming allows seamless navigation between scales, with elements maintaining their functionality and appearance.
    - Auto-zoom feature highlights zoomable elements with a visible frame on hover.
    - Repeated auto-zoom on the same element reverts to the previous view, implementing an undo stack for zoom navigation.

#### 2.1.2 Scene Graph
- **Description**: A comprehensive scene graph manages all elements in the interface, including shapes, text, and widgets.
- **Features**:
    - Supports a hierarchical structure for organizing elements.
    - Includes primitives for shapes (e.g., rectangles, circles), text, and configuration options.
    - Allows easy manipulation and traversal for developers.
    - Supports HTML fragments as nodes, rendered using CSS 3D transforms for integration with the visualizer.

#### 2.1.3 View Modes
- **Description**: The library supports multiple visualization modes to cater to different use cases.
- **Modes**:
    - **2D Locked View**: A top-down projection, restricting navigation to 2D.
    - **3D Free Look View**: Allows free navigation in 3D space, with an auto-snap-back to a default forward view to maintain a primarily 2D focus.
    - **Spherical View**: Arranges elements on a sphere around the user for an immersive layout.
- **Implementation**:
    - All view modes are unified in a single model, allowing seamless switching.
    - Uses three.js for 3D rendering, with a focus on maintaining a mostly 2D experience.

#### 2.1.4 Event Handling System
- **Description**: An abstract, reconfigurable event handling system for user interactions.
- **Features**:
    - Maps inputs (keyboard, mouse, etc.) to outcomes (e.g., dragging, resizing, zooming).
    - Provides reasonable default mappings, hard-coded but editable.
    - Supports runtime reconfiguration, similar to video game control customization.
    - Handles interactions like moving elements with the mouse, resizing widgets, and organizing elements like a mind map.
    - Defines a comprehensive API for generic reactions to events.

#### 2.1.5 Widgets
- **Description**: Reusable components built from primitives and event handlers.
- **Examples**:
    - Buttons, sliders, and display components.
    - Sliders can be moved in 3D space, mimicking physical controls.
    - Components for wiring data flow systems, enabling complex workflows.
- **Behavior**:
    - Widgets are fully interactive and customizable.
    - Support drag-and-drop, resizing, and other mind-map-like organization.

#### 2.1.6 Heads-Up Display (HUD)
- **Description**: An overlay layer for system interaction and feedback.
- **Features**:
    - Displays logs, alerts, and other system messages in a scrolling HTML overlay.
    - Semi-translucent to blend with the main interface.
    - Includes interactive widgets for user responses.
    - Provides controls for:
        - Inspecting and manipulating the scene graph.
        - Accessing system-level settings and options.
    - Integrates a REPL (Read-Eval-Print Loop) for:
        - Executing commands (e.g., search, collect, probe system).
        - Supporting toy use and experimentation.

---

## 3. Technical Requirements

### 3.1 Platform and Technologies
- **Frontend**: HTML, JavaScript.
- **3D Rendering**: three.js for 3D visualization and CSS 3D transforms for HTML nodes.
- **Environment**: Browser-based, compatible with modern browsers (Chrome, Firefox, Safari, Edge).
- **Library Structure**: Modular, with a public API for easy integration into projects.

### 3.2 Performance
- **Target Capacity**: Must handle at least a few dozen to a hundred widgets without optimization concerns, based on prior prototypes.
- **Scalability**: Designed to support fractal scaling without predefined performance limits.

### 3.3 General-Purpose Design
- **Abstraction**: All components (event handling, scene graph, widgets) are abstract and generalized to support diverse applications.
- **Ease of Use**: Minimal setup required; developers can include the library and start building immediately.
- **Extensibility**: API and scene graph allow custom shapes, widgets, and interactions.

---

## 4. Non-Functional Requirements

### 4.1 Usability
- The library must be intuitive, with a clear API and documentation.
- Default event mappings should be familiar to users (e.g., click to select, drag to move).
- The HUD and REPL should provide immediate feedback for user actions.

### 4.2 Customizability
- Event mappings, widget behaviors, and view modes can be reconfigured at runtime.
- Developers can extend the library with custom primitives and workflows.

### 4.3 Maintainability
- Codebase should be modular, with clear separation of concerns (e.g., scene graph, event handling, rendering).
- Comprehensive API documentation for developers.

---

## 5. Implementation Notes
- **Scene Graph**: Use a tree-based data structure to manage elements, with nodes for shapes, text, and HTML fragments.
- **Event Handling**: Implement a pub-sub or observer pattern for abstract input-to-action mappings, with a configuration layer for defaults and runtime changes.
- **Zooming**: Leverage three.js camera controls for smooth zooming, with a stack to track zoom history.
- **View Modes**: Use three.js to toggle between 2D, 3D, and spherical projections, ensuring a unified model.
- **HUD**: Build as a separate HTML overlay with CSS for translucency, integrating WebGL for 3D interactions if needed.
- **REPL**: Implement a command parser with a set of predefined actions (search, collect, probe), extensible for custom commands.

---

## API Documentation

The API documentation is embedded as JSDoc comments directly within the `spacegraph.js` source code. Developers can refer to the source code for detailed explanations of classes, methods, properties, and parameters.

Generating browsable HTML documentation from these comments (e.g., using JSDoc tooling) would require a working Node.js/npm environment to install JSDoc and its dependencies. Due to current environmental constraints preventing reliable `npm install` operations, pre-built HTML documentation is not available at this time.

To view the documentation:
1.  Open the `spacegraph.js` file.
2.  Read the JSDoc blocks (formatted as `/** ... */`) preceding class and method definitions.

---

## 6. Future Considerations
- **Data Flow Paradigms**: Support for complex workflows and data flow systems can be added as an extension.
- **Performance Optimization**: If needed, optimize for larger widget counts or complex scenes in later iterations.
- **Additional Widgets**: Expand the widget library based on developer feedback.

---

## 7. Summary
This specification outlines a powerful, general-purpose JavaScript library for a zooming user interface. Key features include fractal scaling, a robust scene graph, abstract event handling, multiple view modes, interactive widgets, and a HUD with a REPL. Built with three.js, HTML, and JavaScript, it aims to be a ubiquitous tool for developers to create diverse, visually engaging applications.