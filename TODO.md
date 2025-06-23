## **SpaceGraph.js: A Development Plan**

### Vision
SpaceGraph.js aims to be the premier open-source library for interactive 3D graph visualization. It will provide a modular, well-documented API that enables developers to create, explore, and share complex knowledge graphs with ease, featuring a delightful user experience through intuitive interactions and visually appealing rendering.

### Guiding Principles
*   **Core Library Focus:** The library provides the tools for visualization and interaction. The application built with it handles state management (saving/loading) and data fetching logic.
*   **Developer-First:** A clean API, comprehensive documentation, and a robust plugin system are paramount.
*   **Predictable by Default, Powerful when Needed:** The API will offer sensible defaults that work out-of-the-box. Advanced features will be opt-in and explicitly configured, ensuring a smooth learning curve.
*   **Progressive Complexity:** The API should be simple for basic use cases but powerful enough for advanced customization.

---

### **Phase 1: Core Foundation & Architecture**

**Goal:** Establish a stable, modern, and extensible architecture. The output of this phase is a minimal but functional graph that can render basic nodes and edges, with a solid foundation for all future development.

1.  **Project & Tooling Setup**
    *   **Build System:** Configure Vite for fast development, Hot Module Replacement (HMR), and optimized production builds.
    *   **Code Quality:** Set up ESLint and Prettier for consistent code style and quality.
    *   **CI/CD:** Implement GitHub Actions for automated testing and builds on every commit.

2.  **Explicit Testing Strategy**
    *   **Unit Tests (Jest):** For pure functions, algorithms (e.g., layout physics), and individual class methods.
    *   **Component Tests (Storybook/Testing Library):** For UI components in isolation to verify rendering and interaction.
    *   **Integration Tests (Playwright):** To test core user workflows (e.g., "add node -> connect edge -> run layout").
    *   **Visual Regression Tests (e.g., with Percy):** To automatically catch unintended visual changes in nodes, edges, and UI.

3.  **Modular Architecture**
    *   **Core `SpaceGraph` Class:** A minimal class responsible for scene management, the render loop, and coordinating modules.
    *   **Event Bus:** A centralized event system for decoupled communication (e.g., `emit('node:select')`, `on('render:before')`).
    *   **Plugin System:** A `PluginManager` that allows plugins to register themselves and hook into the lifecycle. All core systems will be implemented as default plugins.
    *   **Internal Data Model:** Define a clear and efficient internal data structure for the graph, providing optimized methods for traversal and manipulation.

4.  **Basic Rendering Pipeline**
    *   **Renderer:** Integrate `THREE.WebGLRenderer` and `CSS3DRenderer` for hybrid rendering.
    *   **Scene Management:** Basic setup of `THREE.Scene`, `THREE.Camera`, and default lighting.
    *   **Render Loop:** A clean, efficient `requestAnimationFrame` loop.

5.  **Initial Systems (as Core Plugins)**
    *   **Node System (v1):** A simple `Node` class. Ability to add/remove basic 3D objects to the scene.
    *   **Edge System (v1):** A simple `Edge` class using `THREE.Line`. Ability to connect two nodes.
    *   **Camera System (v1):** Integrate `OrbitControls` for basic pan, zoom, and rotate functionality.

6.  **Documentation & API Foundation**
    *   **API Design:** Design the initial configuration object and fluent API structure.
    *   **Documentation Setup:** Configure TypeDoc to generate API docs from TSDoc comments and Storybook for interactive examples.

---

### **Phase 2: Interaction & Core Features**

**Goal:** Make the graph fully interactive and visually compelling. This phase focuses on implementing the primary features users and developers expect from a graph library.

1.  **Advanced Rendering & Visuals**
    *   **High-Quality Edges:** Replace `THREE.Line` with `Line2` (fat lines) for variable thickness and superior visual quality.
    *   **Post-Processing:** Integrate `Postprocessing` to add effects like Bloom, Screen Space Ambient Occlusion (SSAO), and an Outline effect on selection/hover.
    *   **Lighting Control:** Provide a developer API to configure scene lighting (Ambient, Directional, Point lights) and enable shadows for improved depth perception.

2.  **Mature Node & Edge Systems**
    *   **Node Factory:** Implement a `NodeFactory` to support registering and creating different node types.
    *   **Core Node Types:**
        *   **HtmlNode:** For displaying rich HTML/CSS content.
        *   **ShapeNode:** For basic 3D shapes (Sphere, Box), with support for GLTF model imports.
    *   **Edge System Enhancements:**
        *   **Edge Types:** Add `CurvedEdge` (Bezier/Spline) and `LabeledEdge`.
        *   **Styling:** Support for dashed lines, color gradients, and arrowheads.

3.  **Layout System**
    *   **Layout Manager:** Create a system to register and switch between different layout algorithms.
    *   **Force-Directed Layout:** Implement a robust force-directed layout with collision detection and clustering.
    *   **Layout Transitions:** Use a library like GSAP to ensure smooth, animated transitions when layouts change or the graph is modified.

4.  **Interaction Model**
    *   **3D Dragging:** Implement node dragging in 3D space, with modifier keys for depth adjustment.
    *   **Selection Model:** Support single-select, multi-select (e.g., with `Shift+Click`), and group dragging.
    *   **Node Pinning:** Allow users to pin nodes to fix their position during layout calculations.

5.  **UI Framework & Theming**
    *   **UI Integration:** Integrate React for building UI components.
    *   **Core UI Elements:** A `Toolbar` for common actions and `Context Menus` for node, edge, and canvas interactions.
    *   **Advanced Theming System:** Implement a theming system based on CSS Custom Properties for deep, non-intrusive customization (e.g., `--spacegraph-node-bg`, `--spacegraph-accent-color`).

---

### **Phase 3: Extensibility & Advanced Capabilities**

**Goal:** Expand the library's capabilities to handle more complex use cases and empower developers to extend it easily.

1.  **Performance Optimization**
    *   **Instanced Rendering:** Implement for nodes and edges to efficiently render thousands of objects.
    *   **Level of Detail (LOD):** Use LODs for complex node geometries and text labels to maintain high frame rates.
    *   **Parallelization:** Offload heavy layout calculations to Web Workers.

2.  **Expanded Content & Layouts (as Plugins)**
    *   **Advanced Node Types:** `ImageNode`, `VideoNode`, `GroupNode` (collapsible container), `DataNode` (for charts), and `IFrameNode` (for embedding web content).
    *   **Additional Layouts:** `GridLayout` (2D/3D), `CircularLayout`/`SphericalLayout`, and `HierarchicalLayout` (for tree-like structures).

3.  **Advanced Camera & View Management**
    *   **Camera Modes:** Add `FreeCamera` (FPS-style) and `AutoCamera` (auto-frame/follow).
    *   **View Management:** API to save and restore camera states ("Named Views").
    *   **Minimap:** Implement an optional minimap for navigating large graphs.

4.  **Data Management API**
    *   **Serialization:** Implement `export/import` functionality for common graph formats (JSON, GraphML, GEXF).
    *   **Data Binding API:** Provide a clear API for applications to bind node/edge properties to external data sources and push updates efficiently.
    *   **API for Real-Time:** Ensure the API is robust enough to handle rapid, programmatic changes, enabling applications to build collaborative features on top.

---

### **Phase 4: Polish, Accessibility & Ecosystem**

**Goal:** Refine the user and developer experience, ensure the library is accessible to all, and provide resources to foster a thriving community.

1.  **User Experience Polish**
    *   **Advanced Interactions:** A `Command Palette` for power users and `Lasso/Marquee Select` for easier group selection.
    *   **Touch Support:** Implement robust touch controls (pinch-to-zoom, two-finger pan, tap-to-select, long-press).
    *   **Feedback:** Add subtle animations, tooltips, and optional, toggleable sound effects.
    *   **Onboarding Plugin:** Create a built-in, optional tutorial plugin to provide an interactive tour of core features for new users.

2.  **Accessibility (A11y)**
    *   **Screen Reader Support:** Add ARIA labels and roles to all nodes, edges, and UI controls.
    *   **Keyboard Navigation:** Ensure the entire graph and UI can be navigated and operated via keyboard alone.
    *   **High-Contrast Mode:** Implement a theme that meets WCAG contrast requirements.

3.  **Advanced Visualization & Diagnostics**
    *   **Edge Bundling:** Offer an optional edge bundling feature to reduce visual clutter in dense graphs.
    *   **Error Handling:** Implement a formal diagnostic system with custom error types and a configurable logger to improve developer debugging.

4.  **Developer Ecosystem**
    *   **Complete Documentation:** Finalize API documentation, create tutorials for common use cases (e.g., "Creating a Custom Node Type"), and write migration guides.
    *   **Live Playground:** Host an interactive playground (e.g., on CodeSandbox or StackBlitz) embedded in the documentation site.
    *   **Plugin Infrastructure:** Create a `create-spacegraph-plugin` template and establish clear contribution guidelines to encourage community involvement.
