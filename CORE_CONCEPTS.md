# SpaceGraph Core Concepts

## 1. Introduction

SpaceGraph is a JavaScript library for creating interactive, zoomable user interfaces (ZUIs) built upon a graph-based data model. It allows developers to represent complex relationships as nodes and edges, and to visualize and interact with these elements in a 2D/3D space.

The core philosophy of SpaceGraph is to provide a robust foundation that is both **extensible** and focused on rich **visual interaction**. Developers can create custom node types with unique appearances and behaviors, and users can navigate the graph intuitively through mouse and keyboard controls.

## 2. Main Classes and Their Roles

Understanding these core classes is key to working with SpaceGraph:

*   **`SpaceGraph`**:
    *   The central orchestrator of the entire visualization.
    *   Manages collections of nodes (`SpaceGraph.nodes`) and edges (`SpaceGraph.edges`).
    *   Owns the THREE.js scenes (WebGL and CSS3D), the camera, and the renderers.
    *   Manages the active layout engine (e.g., `ForceLayout`).
    *   Provides the `registerNodeType()` method for defining custom node types.
    *   Handles global events and overall graph state.

*   **`BaseNode`**:
    *   The fundamental abstract class from which all graph elements (nodes) inherit.
    *   Key properties:
        *   `id`: A unique identifier for the node.
        *   `position`: A `THREE.Vector3` representing the node's current position in 3D space.
        *   `data`: An object to store arbitrary user-defined data associated with the node.
        *   `mass`: Influences behavior in the physics-based layout.
    *   Defines a common interface for lifecycle methods (`update`, `dispose`), drag handling, and selection styling.

*   **`RegisteredNode`**:
    *   A wrapper class that SpaceGraph uses internally when you create a node of a custom registered type.
    *   Developers typically do **not** interact with `RegisteredNode` instances directly. Instead, they define a `TypeDefinition` object which dictates the behavior and appearance of their custom node. `RegisteredNode` then uses this definition to manage the node's lifecycle and visuals.

*   **Legacy Node Types (`HtmlNodeElement`, `NoteNode`, `ShapeNode`)**:
    *   These are built-in node types provided by SpaceGraph.
    *   `HtmlNodeElement`: A versatile node that renders arbitrary HTML content in the 3D space using CSS3D.
    *   `NoteNode`: A specialized version of `HtmlNodeElement`, pre-configured for editable text notes.
    *   `ShapeNode`: Renders 3D shapes (like boxes or spheres) using WebGL.
    *   While useful as examples or for simple cases, new complex or highly custom node types should preferably be implemented using the node registration system (`SpaceGraph.registerNodeType()`) for better encapsulation and flexibility.

*   **`Edge`**:
    *   Represents a visual connection (link) between two nodes (a `source` and a `target`).
    *   Can be styled with properties like `color`, `thickness`, and visual styles (e.g., 'solid', 'dashed', animated - though full styling options are evolving).
    *   Edges also influence the layout engine.

*   **`UIManager`**:
    *   Handles all user interactions with the graph.
    *   Manages mouse events (click, drag, wheel), keyboard input, and touch events.
    *   Responsible for node selection, drag-and-drop operations (for creating and moving nodes), and displaying context menus.

*   **`CameraController`**:
    *   Manages the `THREE.PerspectiveCamera`.
    *   Controls camera positioning, zoom levels, panning, and animated focusing on specific nodes or points in the space.
    *   Maintains a view history for "back" functionality.

*   **`ForceLayout`**:
    *   The default physics-based layout engine.
    *   Arranges nodes in the 2D/3D space by applying forces: repulsion between nodes, attraction along edges, and a centering force.
    *   Its behavior can be tuned via settings like `repulsion`, `attraction`, `idealEdgeLength`, etc.

## 3. Creating Custom Nodes (The New System)

SpaceGraph allows developers to define their own node types with custom visuals and behaviors. This is achieved by registering a `TypeDefinition` object with the `SpaceGraph` instance.

### `SpaceGraph.registerNodeType(typeName, typeDefinition)`

*   `typeName` (string): A unique name for your custom node type (e.g., `'my-user-card'`, `'molecule-node'`).
*   `typeDefinition` (object): An object containing methods and properties that define how nodes of this type behave and render.

### The `TypeDefinition` Object Structure

This object tells SpaceGraph how to handle your custom nodes. Key methods include:

*   **`getDefaults(initialData)`**:
    *   Optional. Called when a new node of this type is being created.
    *   Receives `initialData` passed to `spaceGraph.addNode()`.
    *   Should return an object containing default properties for your node's `data` if not provided in `initialData`.
    *   Example: `getDefaults: (data) => ({ label: 'Untitled', color: '#FFFFFF', ...data })`

*   **`onCreate(nodeInstance, spaceGraph)`**:
    *   Required. Called when a new node of this type is instantiated.
    *   `nodeInstance`: The `RegisteredNode` instance being created. You can access its `id`, `position`, and merged `data` (initialData + defaults).
    *   `spaceGraph`: The main `SpaceGraph` instance.
    *   **Must return an object** specifying the visual components for this node. These can be:
        *   `mesh`: A `THREE.Mesh` object for WebGL rendering (e.g., custom 3D geometry).
        *   `cssObject`: A `CSS3DObject` for rendering HTML content.
        *   `htmlElement`: If you provide `htmlElement` directly (instead of `cssObject`), SpaceGraph will wrap it in a `CSS3DObject` for you. This is often simpler for basic HTML.
        *   `labelObject`: A `CSS3DObject` typically used for labels that should billboard with the camera.
    *   These returned objects will be added to the appropriate scenes by SpaceGraph.

*   **`onUpdate(nodeInstance, spaceGraph)`**:
    *   Optional. Called on every frame of the animation loop.
    *   Useful for animations, dynamic updates to visuals based on data changes, or billboarding behavior if not handled automatically.

*   **`onDispose(nodeInstance)`**:
    *   Optional. Called when the node is removed from the graph.
    *   Should perform cleanup of any custom resources created in `onCreate` (e.g., dispose THREE.js geometries/materials, remove event listeners not handled by the inter-node messaging system's auto-cleanup).

*   **`onSetPosition(nodeInstance, x, y, z)`**:
    *   Optional. Called when the node's position is updated by the layout engine or direct manipulation.
    *   If not provided, `RegisteredNode` will update the position of the `mesh` and/or `cssObject` automatically.
    *   Implement this if you need custom logic for how position changes affect your node's visuals (e.g., complex multi-part objects).

*   **`onSetSelectedStyle(nodeInstance, isSelected)`**:
    *   Optional. Called when the node's selection state changes.
    *   `isSelected` (boolean): True if the node is now selected, false otherwise.
    *   Implement this to apply custom visual feedback for selection (e.g., change color, add an outline).

*   **`onSetHoverStyle(nodeInstance, isHovered)`**:
    *   Optional. Called when the mouse hovers over or leaves the node.
    *   `isHovered` (boolean): True if the mouse is now hovering, false otherwise.
    *   Implement this for custom hover effects.

*   **`getBoundingSphereRadius(nodeInstance)`**:
    *   Optional, but **highly recommended** for layout and camera focusing.
    *   Should return a number representing the radius of a sphere that encompasses your node's visual representation. This helps the layout engine prevent overlaps and allows the camera to focus correctly.

*   **Drag Handlers (`onStartDrag`, `onDrag`, `onEndDrag`)**:
    *   Optional. If your `typeDefinition` includes these methods, they will be called during node dragging operations, overriding the default behavior managed by `BaseNode` and `UIManager`.
    *   `onStartDrag(nodeInstance)`
    *   `onDrag(nodeInstance, newPosition)`
    *   `onEndDrag(nodeInstance)`

### Instantiating a Custom Node

Once registered, create an instance using `SpaceGraph.addNode()`:

```javascript
// Assuming 'my-custom-type' has been registered
const myNode = spaceGraph.addNode({
  type: 'my-custom-type', // The registered typeName
  id: 'custom-node-1',   // Optional, will be auto-generated if omitted
  x: 100, y: 50, z: 0,   // Initial position
  label: 'My Custom Node', // Custom data, will be merged with getDefaults
  customProperty: 'someValue'
});
```

### Conceptual `typeDefinition` Example

```javascript
const myBoxNodeType = {
  typeName: 'simple-box', // For clarity, not used by registerNodeType directly

  getDefaults: (initialData) => ({
    label: initialData.label || 'Unnamed Box',
    color: initialData.color || 0xff0000,
    size: initialData.size || 50,
  }),

  onCreate: (node, sg) => {
    const geometry = new THREE.BoxGeometry(node.data.size, node.data.size, node.data.size);
    const material = new THREE.MeshStandardMaterial({ color: node.data.color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { nodeId: node.id }; // Important for UIManager raycasting

    // Create a simple label if specified
    let labelObject;
    if (node.data.label) {
        const labelDiv = document.createElement('div');
        labelDiv.className = 'node-label-3d'; // Use existing CSS if suitable
        labelDiv.textContent = node.data.label;
        labelObject = new CSS3DObject(labelDiv);
    }

    return { mesh, labelObject }; // Return the visual components
  },

  onSetSelectedStyle: (node, isSelected) => {
    if (node.mesh && node.mesh.material) {
      node.mesh.material.emissive.setHex(isSelected ? 0x888800 : 0x000000);
    }
    if (node.labelObject) {
        node.labelObject.element.style.backgroundColor = isSelected ? 'rgba(0, 208, 255, 0.3)' : 'rgba(0,0,0,0.6)';
    }
  },

  onDispose: (node) => {
    node.mesh?.geometry?.dispose();
    node.mesh?.material?.dispose();
    node.labelObject?.element?.remove();
  },

  getBoundingSphereRadius: (node) => {
    return (node.data.size || 50) * Math.sqrt(3) / 2; // Radius for a box
  }
};

// Registration:
// spaceGraph.registerNodeType('simple-box', myBoxNodeType);
```

## 4. Event Systems

### UI Event Handling

The `UIManager` class is responsible for capturing raw browser events (mouse clicks, moves, keyboard presses, etc.) within the SpaceGraph container. It then interprets these events in the context of the graph's state (e.g., which node is under the cursor, is a drag operation in progress?) and translates them into higher-level actions like selecting a node, initiating a drag, or opening a context menu.

Developers typically do not need to interact with this system directly unless they are customizing the `UIManager` itself or adding entirely new types of interactions.

### Inter-Node Messaging System

SpaceGraph provides a simple publish/subscribe system for communication directly between nodes. This is useful for creating dynamic interactions where one node's state change can trigger actions in another.

*   **`node.emit(eventName, payload)`**:
    *   A node can emit a named event with an optional payload (any data type).
    *   Example: `currentNode.emit('dataUpdated', { value: 42 });`

*   **`node.listenTo(targetNodeOrId, eventName, callback)`**:
    *   A node can listen to events emitted by another node.
    *   `targetNodeOrId`: Can be the ID of the target node or the target node instance itself.
    *   `eventName`: The name of the event to listen for.
    *   `callback`: A function that will be executed when the event is received. The callback receives `(payload, senderNodeInstance)`.
    *   Example:
        ```javascript
        sourceNode.listenTo(targetNode.id, 'targetEvent', (data, sender) => {
          console.log(`Received '${data.message}' from ${sender.id}`);
          this.data.status = data.message; // 'this' refers to sourceNode's data context if bound correctly
        });
        ```

*   **`node.stopListening(targetNodeOrId, eventName, callback)`**:
    *   Removes a previously established listener. All parameters must match those used in `listenTo`.

*   **Automatic Cleanup**:
    *   When a node calls `node.dispose()`, all event listeners it established using `listenTo()` are automatically removed. This prevents memory leaks from dangling listeners.

*   **Global Graph Events**:
    *   The `SpaceGraph` instance itself also acts as an event emitter for graph-wide events (though specific global events are not heavily predefined yet).
    *   `spaceGraph.on(eventName, callback)`
    *   `spaceGraph.emit(eventName, payload)`

## 5. Rendering Concepts

SpaceGraph uses a hybrid rendering approach with two superimposed THREE.js scenes:

*   **WebGL Scene (`SpaceGraph.scene`)**:
    *   Used for rendering traditional 3D objects.
    *   This includes the meshes of `ShapeNode`s (like spheres and boxes) and the lines representing `Edge`s.
    *   Benefits from GPU acceleration for complex geometries and large numbers of elements.

*   **CSS3D Scene (`SpaceGraph.cssScene`)**:
    *   Used for rendering HTML elements as if they exist in the 3D space.
    *   Each HTML element (e.g., the content of an `HtmlNodeElement` or a `ShapeNode`'s label) is wrapped in a `CSS3DObject`.
    *   This allows for rich text formatting, standard HTML/CSS styling, and direct DOM interaction for elements like input fields or buttons within nodes.
    *   The `CSS3DRenderer` synchronizes the positions of these HTML elements with the 3D camera.

*   **`CSS3DObject`**:
    *   A THREE.js object that wraps a standard DOM `HTMLElement`. It allows the element to be positioned, rotated, and scaled within the 3D scene, rendered by the `CSS3DRenderer`.

*   **Billboard Effect**:
    *   Many HTML-based elements, such as the content of `HtmlNodeElement`s (by default) and labels for `ShapeNode`s, are configured to "billboard." This means they automatically rotate to always face the camera, ensuring readability regardless of the camera's orientation. This behavior can typically be configured per node.

## 6. Styling and Appearance

*   **HTML-based Nodes (`HtmlNodeElement`, `NoteNode`, custom types returning HTML)**:
    *   Primarily styled using standard CSS. Classes can be added to the node's HTML structure, and styles can be defined in your project's CSS files (like `index.css`).
    *   Dynamic styles can be applied via JavaScript by manipulating the `style` property of the HTML elements.
    *   The `backgroundColor` and `contentScale` are common properties managed by `HtmlNodeElement`.

*   **Shape-based Nodes (`ShapeNode`, custom types returning `THREE.Mesh`)**:
    *   Appearance is defined by THREE.js `Material` properties (e.g., `color`, `roughness`, `metalness`).
    *   These are typically set during the `onCreate` phase of a custom node or within the `ShapeNode` constructor.

*   **Custom Registered Types**:
    *   The `onCreate` method in the `TypeDefinition` has full control over creating and styling the visual elements (both `THREE.Mesh` and HTML).

*   **Edges (`Edge`)**:
    *   Styled via properties in their `data` object, such as `color`, `thickness`.
    *   More advanced styles like 'dashed', 'dotted', or animated effects might be available or can be implemented by extending the `Edge` class or its rendering mechanism.

## 7. Layout

*   **`ForceLayout`**:
    *   The default engine responsible for arranging nodes in the space.
    *   It simulates a physical system where nodes exert repulsive forces on each other, and edges act like springs pulling connected nodes together.
    *   A centering force can also be applied to keep the graph generally in the middle of the view.

*   **Key Properties Influencing Layout**:
    *   `node.mass`: Heavier nodes are less affected by forces.
    *   `edge.data.constraintParams.stiffness` (or `attraction` in global settings): How strongly an edge pulls its nodes together.
    *   `edge.data.constraintParams.idealLength` (or `idealEdgeLength` in global settings): The target length for an edge.
    *   `node.getBoundingSphereRadius()`: Used by the layout to estimate node sizes and reduce overlaps.

The layout engine runs iteratively, seeking a stable state where forces are balanced. Users can also temporarily "fix" nodes in place while dragging them.
