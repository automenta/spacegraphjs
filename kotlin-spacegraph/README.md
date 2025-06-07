# SpaceGraphKT - Kotlin/JS 3D Graph Visualization Library

SpaceGraphKT is a library written in Kotlin/JS for creating interactive 3D graph visualizations in the browser. It uses Three.js for WebGL rendering of 3D shapes and CSS3DRenderer for displaying HTML-based nodes, allowing rich content within the graph structure. The library includes features like force-directed layout, camera controls, user interactions (drag, zoom, pan, selection), and an agent API for programmatic control.

This project is a Kotlin/JS port and adaptation of concepts from an original JavaScript SpaceGraph implementation.

## Features

*   **Hybrid Rendering:** Combines WebGL (for 3D shapes, lines) and CSS3D (for HTML nodes, labels) rendering.
*   **Node Types:**
    *   **HtmlNodeElement:** Nodes rendered as HTML elements, allowing complex content using standard web technologies.
    *   **NoteNode:** A specialized HTML node for editable text notes.
    *   **ShapeNode:** Nodes rendered as 3D shapes (e.g., spheres, boxes) with optional 3D labels.
*   **Edges:** Visual connections between nodes, rendered as lines.
*   **Force-Directed Layout:** Automatic positioning of nodes based on simulated physical forces (repulsion between nodes, spring-like attraction along edges).
*   **Camera Controls:**
    *   Panning, zooming (mouse-wheel based).
    *   Smooth animated focusing on nodes or specific points.
    *   View history for "back" navigation.
    *   Reset view.
*   **User Interactions:**
    *   Node dragging.
    *   Resizing of HTML nodes.
    *   Selection of nodes and edges with visual feedback.
    *   Context menus for nodes, edges, and the graph background.
    *   Interactive creation of edges between nodes ("linking mode").
    *   Keyboard shortcuts for common actions.
*   **K2Script Agent API:** A JavaScript API (`window.spaceGraphAgent`) for programmatic control and interaction with the graph, allowing external scripts or agents to:
    *   Perform CRUD operations on nodes and edges.
    *   Modify node/edge properties.
    *   Control camera and layout.
    *   Subscribe to graph events (e.g., node added, selected).
    *   Load/save graph data.

## Build and Run the POC Example

The project includes a Proof-of-Concept (POC) example that demonstrates basic functionalities, including usage of the Agent API.

### Prerequisites

*   **Java Development Kit (JDK):** Version 11 or higher (for running Gradle).
*   **Node.js and npm:** Optional, but may be needed by Gradle for JavaScript dependencies or if you manage JS libraries directly. The Kotlin/JS Gradle plugin often handles its own Node.js/npm/yarn setup for building.

### Building and Running

1.  **Clone the Repository:**
    ```bash
    # git clone <repository_url>
    cd kotlin-spacegraph
    ```

2.  **Run the Development Server:**
    The most common way to run the POC is using the Gradle `jsBrowserDevelopmentRun` task. This task compiles the Kotlin/JS code, bundles it using webpack, starts a development server, and often opens the application in your default web browser.
    ```bash
    ./gradlew jsBrowserDevelopmentRun --continuous
    ```
    *   `--continuous` enables continuous build, automatically recompiling when you save changes to Kotlin files.
    *   If you don't have a Gradle wrapper (`gradlew`) in the project root, you might need to use your system's Gradle installation: `gradle jsBrowserDevelopmentRun --continuous`.

3.  **Access the POC:**
    *   If the browser doesn't open automatically, the Gradle console output will usually provide a URL where the development server is running (typically `http://localhost:8080` or a similar port). Open this URL in your web browser.
    *   You should see the `index.html` page with the SpaceGraph visualization and the example nodes/edges.
    *   Open your browser's developer console to see log messages from the library and the `agent_example.js` script.

4.  **Production Build (Optional):**
    To create an optimized production build:
    ```bash
    ./gradlew jsBrowserDistribution
    ```
    This will typically create bundled and minified JavaScript files along with resources in a directory like `build/dist/js/productionExecutable/` or `build/distributions/`. You would then need to serve these files using your own HTTP server.

## K2Script Agent API

SpaceGraphKT exposes a JavaScript API for programmatic interaction, suitable for K2Script agents or other JavaScript environments.

*   **API Object:** `window.spaceGraphAgent`
*   **Documentation:** Detailed API documentation can be found in [`agent_api_docs.md`](agent_api_docs.md).
*   **Example Usage:** See the [`agent_example.js`](src/jsMain/resources/agent_example.js) file (loaded by `index.html` in the POC) for practical examples of how to use the API.

**Brief Example (JavaScript):**
```javascript
if (window.spaceGraphAgent) {
    // Add a node
    const newNode = window.spaceGraphAgent.addNode(null, {
        type: 'note',
        position: { x: 0, y: 0, z: 0 },
        data: { label: 'Agent Node', content: 'Hello from Agent!' }
    });
    console.log('Agent added node:', newNode.id);

    // Subscribe to node selection events
    window.spaceGraphAgent.onGraphEvent('nodeSelected', (payload) => {
        if (payload.nodeId) {
            console.log('Agent: Node selected ->', payload.nodeId);
        } else {
            console.log('Agent: Selection cleared.');
        }
    });
}
```

## Project Structure Overview

*   `build.gradle.kts`: Main Gradle build script for the Kotlin/JS project.
*   `gradlew`, `gradlew.bat`, `gradle/`: Gradle wrapper files.
*   `settings.gradle.kts`: Gradle settings.
*   `src/`:
    *   `jsMain/`: (Often used in newer Kotlin Multiplatform, or could be `main/` for older single-target JS)
        *   `kotlin/com/example/spacegraphkt/`: Kotlin source code.
            *   `core/`: Core classes of the SpaceGraph library (`SpaceGraph.kt`, `BaseNode.kt`, `UIManager.kt`, etc.).
            *   `data/`: Kotlin data classes (`NodeData.kt`, `Vector3D.kt`, etc.).
            *   `api/`: Code related to the K2Script Agent API (`AgentAPI.kt`).
            *   `external/`: Kotlin `external` declarations for JavaScript libraries (e.g., `threejs_interop.kt`).
            *   `main/`: Entry point for the POC example (`Main.kt`).
        *   `resources/`: Static resources for the web application.
            *   `index.html`: The main HTML page for the POC.
            *   `style.css`: CSS styles for the POC.
            *   `agent_example.js`: Example JavaScript agent using the API.
    *   `commonMain/`, `jvmMain/` etc.: Would be present in a Kotlin Multiplatform project. For a JS-only project, `jsMain` is primary. (Note: current structure is `src/main/kotlin` for library code and `src/jsMain/kotlin` for the POC main and `src/jsMain/resources` for web resources, which is a common way to structure mixed library/app projects with Kotlin/JS).

## Contributing

(Placeholder for contribution guidelines if this were an open project)

---
This README provides a starting point. Further details on specific classes and functionalities can be found in KDoc comments within the source code and the dedicated Agent API documentation.
