# SpaceGraph Core Concepts

## 1. Introduction

SpaceGraph is a JavaScript library for creating interactive, zoomable user interfaces (ZUIs) built upon a graph-based data model. It allows developers to represent complex relationships as nodes and edges, and to visualize and interact with these elements in a 2D/3D space.

The core philosophy of SpaceGraph is to provide a robust foundation that is both **extensible** and focused on rich **visual interaction**. Developers can create custom node types with unique appearances and behaviors, and users can navigate the graph intuitively through mouse and keyboard controls.

## 2. Main Classes and Their Roles

Understanding these core classes is key to working with SpaceGraph:

- **`SpaceGraph`**:

    - The central orchestrator of the entire visualization.
    - Manages collections of nodes (`SpaceGraph.nodes`) and edges (`SpaceGraph.edges`).
    - Owns the THREE.js scenes (WebGL and CSS3D), the camera, and the renderers.
    - Manages the active layout engine (e.g., `ForceLayout`).
    - Provides the `registerNodeType()` method for defining custom node types.
    - Manages global configuration defaults for various aspects of the graph.
    - Features a graph-wide event emitter (`on`, `_emit`) for key lifecycle and interaction events.
    - Handles global events and overall graph state.

- **`BaseNode`**:

    - The fundamental abstract class from which all graph elements (nodes) inherit.
    - Key properties:
        - `id`: A unique identifier for the node.
        - `position`: A `THREE.Vector3` representing the node's current position in 3D space.
        - `data`: An object to store arbitrary user-defined data associated with the node.
        - `mass`: Influences behavior in the physics-based layout.
    - Defines a common interface for lifecycle methods (`update`, `dispose`), drag handling, and selection styling.

- **`RegisteredNode`**:

    - A base class used by SpaceGraph when you create a node of a custom registered type using a `TypeDefinition` object.
    - If the `TypeDefinition` does not specify a `nodeClass`, an instance of `RegisteredNode` is created, and its behavior is dictated by the functions provided in the `TypeDefinition` (e.g., `onCreate`, `onUpdate`).
    - If the `TypeDefinition` *does* specify a `nodeClass` (e.g., a class extending {@link HtmlAppNode}), then an instance of that class is created instead.

- **`HtmlAppNode`**:
    - A specialized extension of `RegisteredNode` designed to simplify the development of rich, interactive HTML-based nodes.
    - It automates common setup (like creating the main HTML container and applying base styles) and provides convenient helper methods for DOM manipulation and event handling.
    - When to use: Choose `HtmlAppNode` (or a class derived from it) when your custom node requires a significant HTML structure, internal interactivity (buttons, forms, etc.), or complex styling that is best managed with HTML and CSS.
    - To use it, you specify your custom class (which extends `HtmlAppNode`) in your `TypeDefinition`'s `nodeClass` property. The core lifecycle logic (like `onInit` for DOM setup, `onDataUpdate` for reacting to data changes) is then implemented as methods within your custom class.
    - For a detailed guide on creating nodes with `HtmlAppNode`, see [TUTORIAL_HTML_APP_NODE.md](TUTORIAL_HTML_APP_NODE.md).

- **Legacy Node Types (`HtmlNodeElement`, `NoteNode`, `ShapeNode`)**:

    - These are built-in node types provided by SpaceGraph.
    - `HtmlNodeElement`: A versatile node that renders arbitrary HTML content in the 3D space using CSS3D.
    - `NoteNode`: A specialized version of `HtmlNodeElement`, pre-configured for editable text notes.
    - `ShapeNode`: Renders 3D shapes (like boxes or spheres) using WebGL.
    - While useful as examples or for simple cases, new complex or highly custom node types should preferably be implemented using the node registration system (`SpaceGraph.registerNodeType()`) for better encapsulation and flexibility.

- **`Edge`**:

    - Represents a visual connection (link) between two nodes (a `source` and a `target`).
    - Can be styled with properties like `color`, `thickness`.
    - If an edge is created by linking specific ports on nodes (see "Node Ports" and "Inter-Node Messaging System" below), its `edge.data` object will contain `sourcePort` and `targetPort` properties, storing the names of the connected ports.

- **`UIManager`**:

    - Handles all user interactions with the graph.
    - Manages mouse events (click, drag, wheel), keyboard input, and touch events.
    - Responsible for node selection, drag-and-drop operations (for creating and moving nodes), displaying context menus, and initiating node/port linking.

- **`CameraController`**:

    - Manages the `THREE.PerspectiveCamera`.
    - Controls camera positioning, zoom levels, panning, and animated focusing on specific nodes or points in the space.
    - Maintains a view history for "back" functionality.

- **`ForceLayout`**:
    - The default physics-based layout engine.
    - Arranges nodes in the 2D/3D space by applying forces: repulsion between nodes, attraction along edges, and a centering force.

## 3. Creating Custom Nodes (The New System)

SpaceGraph allows developers to define their own node types with custom visuals and behaviors. This is achieved by registering a `TypeDefinition` object with the `SpaceGraph` instance.

### `SpaceGraph.registerNodeType(typeName, typeDefinition)`

- `typeName` (string): A unique name for your custom node type (e.g., `'my-user-card'`, `'molecule-node'`).
- `typeDefinition` (object): An object containing methods and properties that define how nodes of this type behave and render.

### The `TypeDefinition` Object Structure

This object tells SpaceGraph how to handle your custom nodes.

- **`typeName` (string, required in practice though part of TypeDefinition object key)**: The unique name for your custom node type (e.g., `'my-user-card'`, `'molecule-node'`). This is the key used when calling `spaceGraph.registerNodeType(typeName, typeDefinition)`.
- **`nodeClass` (class, optional)**:
    - If you are creating a node with complex internal logic and HTML structure, this property should point to your custom class that extends {@link HtmlAppNode} (or {@link RegisteredNode} for non-HTML focused custom nodes).
    - When `nodeClass` is provided, SpaceGraph will instantiate your class. Lifecycle logic (like creating visuals, handling updates) is then primarily managed by methods within your class (e.g., `onInit`, `onDataUpdate` in an `HtmlAppNode` subclass).
    - If `nodeClass` is *not* provided, SpaceGraph instantiates a generic `RegisteredNode`, and its behavior is driven by the functional callbacks (like `onCreate`, `onUpdate`, etc.) defined directly in this `TypeDefinition` object.
- **`getDefaults(nodeInstance, graphInstance)` (function, optional)**:
    - Called when a new node of this type is being created.
    - `nodeInstance`: The node instance being created. Its `data` property will contain any initial data passed to `addNode`.
    - `graphInstance`: The SpaceGraph instance.
    - Should return an object containing default properties for the node's `data` object. These defaults are merged with (and can be overridden by) data provided in `spaceGraph.addNode()`.
    - Example: `getDefaults: (node) => ({ label: node.data.id || 'Untitled', color: '#FFFFFF', customSetting: true })`
- **`onCreate(nodeInstance, graphInstance)` (function, required if `nodeClass` is not used or doesn't handle its own creation)**:
    - If `nodeClass` is not specified, this function is **required**. It's called when a new node is instantiated.
    - `nodeInstance`: The `RegisteredNode` instance. You can access its `id`, `position`, and merged `data`.
    - `graphInstance`: The main `SpaceGraph` instance.
    - **Must return a {@link VisualOutputs} object** specifying the visual components (e.g., `htmlElement`, `mesh`).
    - If `nodeClass` (e.g., an `HtmlAppNode` subclass) is used, that class's constructor and `onInit` method typically handle the creation of visuals, and this `onCreate` in the `TypeDefinition` might not be needed or used.
- **Lifecycle Callbacks (optional if using `nodeClass` and implementing methods there)**:
    - `onUpdate(nodeInstance, graphInstance)`: Called every frame.
    - `onDispose(nodeInstance, graphInstance)`: Called when the node is removed.
    - `onSetPosition(nodeInstance, x, y, z, graphInstance)`: Custom position handling.
    - `onSetSelectedStyle(nodeInstance, isSelected, graphInstance)`: Custom selection visuals.
    - `onSetHoverStyle(nodeInstance, isHovered, graphInstance)`: Custom hover visuals.
    - `getBoundingSphereRadius(nodeInstance, graphInstance)`: **Recommended.** For layout and camera.
    - Drag Handlers (`onStartDrag`, `onDrag`, `onEndDrag`): Override default drag.
    - `onDataUpdate(nodeInstance, updatedData, graphInstance)`: React to `spaceGraph.updateNodeData()`. `updatedData` contains only the changed properties. `nodeInstance.data` is already updated.
        - This is key for dynamic nodes and handling data from input ports.

**Using `HtmlAppNode` (Recommended for HTML-based nodes):**

When creating interactive HTML-based nodes, it's highly recommended to extend {@link HtmlAppNode}.
1.  Define your custom class: `class MyCustomHTMLNode extends HtmlAppNode { ... }`
2.  Implement lifecycle methods like `onInit()` (for DOM setup), `onDataUpdate(updatedData)` (to react to data changes), and `onDispose()` (for cleanup) as methods within your class.
3.  Your `TypeDefinition` then primarily specifies the `typeName`, `nodeClass`, and `getDefaults`:

    ```javascript
    // typeDefinition when using an HtmlAppNode subclass
    const myAppNodeDefinition = {
      // typeName is the key for registration: spaceGraph.registerNodeType('my-app-node', myAppNodeDefinition)
      nodeClass: MyCustomHTMLNode, // Your class extending HtmlAppNode
      getDefaults: (node) => ({    // node is your MyCustomHTMLNode instance
        label: node.data.id || 'My App Node',
        width: 250, // Default width for the node's htmlElement
        height: 150, // Default height
        // ... other custom default data for your node
      })
      // onCreate, onUpdate, etc., are typically NOT needed here,
      // as their logic is handled by MyCustomHTMLNode's class methods.
    };
    ```
    For a comprehensive guide on building custom nodes with `HtmlAppNode`, including detailed explanations of `onInit`, `onDataUpdate`, `onDispose`, helper methods, and styling, please refer to **[TUTORIAL_HTML_APP_NODE.md](TUTORIAL_HTML_APP_NODE.md)**. The remainder of this section provides a high-level overview of `TypeDefinition` properties that are also relevant to `HtmlAppNode`.

### Node Ports (for HTML-based Nodes like `HtmlAppNode` or `RegisteredNode` with HTML)

- A `TypeDefinition` (typically via its `getDefaults` method) or the initial node data can include a `ports` property. This defines connection points on the node, crucial for the "Inter-Node Messaging System".
- **Structure**:
    ```javascript
    // Inside getDefaults or initial node data:
    ports: {
      inputs: {
        portName1: { label: 'User-Friendly Label 1', type: 'dataTypeString1' },
        // ... more input ports
      },
      outputs: {
        portName2: { label: 'User-Friendly Label 2', type: 'dataTypeString2' },
        // ... more output ports
      }
    }
    ```
    - `portName`: A programmatic identifier (e.g., `data_in`, `trigger_out`).
    - `label`: A user-friendly string for UI display.
    - `type`: A user-defined string for the expected data type (e.g., `'string'`, `'number'`).
- **Rendering**: For `HtmlAppNode` (and other HTML-based registered nodes), these ports are automatically rendered as small `div` elements on the node's periphery, allowing user interaction.
- **Interaction**: Clicking these visual ports initiates edge linking. See "Inter-Node Messaging System / Edge Linking".

### Instantiating a Custom Node

Once registered, create an instance using `SpaceGraph.addNode()`:

```javascript
const myNode = spaceGraph.addNode({
    type: 'my-custom-type',
    id: 'custom-node-1',
    x: 100,
    y: 50,
    z: 0,
    label: 'My Custom Node',
    // Custom data, including optional ports definition:
    ports: { inputs: { myInput: { label: 'My Data In', type: 'data' } } },
    customProperty: 'someValue',
});
```

### Conceptual `typeDefinition` Example (Functional, for a simple mesh-based node)

This example shows a `TypeDefinition` where lifecycle logic is defined by functions directly within the definition object, suitable if not using a custom `nodeClass`.

```javascript
const simpleBoxType = {
  // getDefaults is called with the node instance, allowing access to initial data if needed.
  getDefaults: (node) => ({
    label: node.data.label || 'Unnamed Box', // Use initial label or default
    color: node.data.color || 0xff0000,     // Use initial color or default
    size: node.data.size || 50,
    ports: { inputs: { color_in: { label: 'Color', type: 'hex' } } },
  }),
  onCreate: (node, sg) => { // node is a RegisteredNode instance
    const three = sg.constructor.THREE; // Access THREE from SpaceGraph constructor
    const geometry = new three.BoxGeometry(node.data.size, node.data.size, node.data.size);
    const material = new three.MeshStandardMaterial({ color: node.data.color });
    const mesh = new three.Mesh(geometry, material);
    // Optionally, create a label object if needed
    // const labelDiv = document.createElement('div'); ... labelDiv.textContent = node.data.label;
    // const labelObject = new sg.constructor.CSS3DObject(labelDiv);
    return { mesh /*, labelObject */ }; // Return the visual components
  },
  onDataUpdate: (node, updatedData, sg) => {
    if (updatedData.hasOwnProperty('color_in')) { // Check if 'color_in' port received data
      if (node.mesh && node.mesh.material) {
        node.mesh.material.color.setHex(updatedData.color_in);
        node.data.color = updatedData.color_in; // Update persistent data
      }
    }
    if (updatedData.hasOwnProperty('size')) {
      // More complex: would need to dispose old geometry and create new one
      // For simplicity, often handled by removing and re-adding the node with new config.
    }
  },
  // ... other lifecycle methods like onDispose, getBoundingSphereRadius ...
};
// spaceGraph.registerNodeType('simple-box', simpleBoxType);
```

## 4. Event Systems and Edge Linking

### UI Event Handling

The `UIManager` class captures raw browser events and translates them into graph actions (selection, drag, context menus, link initiation). Developers typically don't interact with this directly unless modifying `UIManager`.

### Inter-Node Messaging System & Edge Linking

Nodes can communicate directly using a publish/subscribe system. This is also tied to how edges can represent data flow if ports are used.

- **`node.emit(eventName, payload, propagateViaPorts = true)`**:

    - A `RegisteredNode` can emit a named event.
    - **Automatic Port-Based Data Propagation**: If `eventName` matches a defined output port in the node's `data.ports.outputs` and `propagateViaPorts` is `true` (the default):
        - The `emit` method will iterate through all graph edges.
        - For each edge originating from this node's `eventName` output port and connected to an input port of another `RegisteredNode`, it automatically calls `spaceGraph.updateNodeData(targetNode.id, { [targetPortName]: payload })`.
        - This seamlessly triggers the `onDataUpdate` method on the target node(s) with the `payload` assigned to the corresponding input port key.
    - **Direct Listeners**: The `emit` method will also invoke any callbacks registered directly on this emitting node for the given `eventName` via `listenTo()`.
    - Example: `sourceNode.emit('data_out', { value: 42 });` // This will propagate to connected ports and call direct listeners.
    - Example (no port propagation): `sourceNode.emit('internal_update', { status: 'complete' }, false);`

- **`node.listenTo(emitterNode, eventName, callback)`**:

    - A node can register a callback to listen for a specific named event emitted by another `emitterNode`.
    - This is for direct, targeted event handling between specific node instances and is independent of the port-based automatic data propagation.
    - It's useful when a node needs to react to another node's specific event without necessarily having a formal port connection, or when the event isn't primarily about data flow into an input port.
    - Callback signature: `(payload, senderNodeInstance)`.
    - Example: `dashboardNode.listenTo(sensorNode, 'threshold_exceeded', (eventData, sensor) => { dashboardNode.displayAlert(sensor.id, eventData); });`

- **`node.stopListening(emitterNode, eventName, callback)`**: Removes a specific listener.
- **Automatic Cleanup**: `RegisteredNode.dispose()` automatically cleans up listeners this node registered on other nodes, and listeners other nodes registered on it.

- **Edge Linking with Ports**:

    - The `UIManager` allows users to create edges by clicking on a source port and dragging to a target port.
    - If a link is successfully created between an output port of one node and an input port of another:
        - The resulting `Edge` object will have `edge.data.sourcePort` (name of the output port on the source node) and `edge.data.targetPort` (name of the input port on the target node).
        - Example: `edge.data = { sourcePort: 'html_out', targetPort: 'md_in' }`.
    - **Automatic Data Flow**: With the enhanced `emit` method, drawing an edge between a compatible output port and an input port makes the connection "live". When the source node emits an event on that output port, the data is automatically sent to the target node's input port, triggering its `onDataUpdate` method.
    - This simplifies creating reactive data flows within the graph: define ports, connect them with edges, and `emit` data from output ports.

- **`onDataUpdate(nodeInstance, updatedData)` in `TypeDefinition` / Class Methods**:
    - This method remains the key way for a `RegisteredNode` (or `HtmlAppNode` derivative) to process data arriving at its defined input ports.
    - It's now automatically triggered by the enhanced `emit` system when data is propagated through a connected port.
    - Inside `onDataUpdate`, check for `updatedData[portName]` to access the payload.

- **Global Graph Events**:
    - `spaceGraph.on(eventName, callback)`: Allows subscription to graph-wide events.
    - `spaceGraph._emit(eventName, payload)`: Used internally to emit these events.
    - Key built-in events include:
        - `nodeAdded`: When a node is added. Data: `{ node: BaseNode }`.
        - `nodeRemoved`: When a node is removed. Data: `{ nodeId: string, node: BaseNode }`.
        - `edgeAdded`: When an edge is added. Data: `{ edge: Edge }`.
        - `edgeRemoved`: When an edge is removed. Data: `{ edgeId: string, edge: Edge }`.
        - `nodeSelected`: When node selection changes. Data: `{ selectedNode: BaseNode | null, previouslySelectedNode: BaseNode | null }`.
        - `edgeSelected`: When edge selection changes. Data: `{ selectedEdge: Edge | null, previouslySelectedEdge: Edge | null }`.
    - These provide hooks into the graph's lifecycle and user interactions, complementing the direct node-to-node eventing.

## 5. Customizing Defaults via Configuration

SpaceGraph allows for global customization of many default behaviors and visual properties through a configuration object passed to its constructor. This makes it easier to theme a graph or set project-wide standards without altering individual node/edge creation calls.

- **Passing Configuration**:
    ```javascript
    const myConfig = {
        rendering: { defaultBackgroundColor: 0x112233 },
        defaults: { node: { shape: { color: 0xff00ff } } },
    };
    const graph = new SpaceGraph(container, myConfig, {}); // config is the second argument
    ```
- **Scope**: The configuration can affect:
    - **Rendering**: Background color, alpha, line intersection thresholds.
    - **Camera**: Initial position, FOV, zoom/pan speeds, damping.
    - **Node Defaults**: Default properties for `html` nodes (width, height, background) and `shape` nodes (shape type, size, color).
    - **Edge Defaults**: Default color, thickness, opacity for edges.
- **Precedence**:
    1.  Data provided directly when adding a node or edge (e.g., `graph.addNode({ type: 'shape', color: 0x00ff00 })`).
    2.  Global defaults set via the `SpaceGraph` configuration object.
    3.  Internal hardcoded defaults within node/edge classes (these are minimal now).
- **Structure**: For the detailed structure of the configuration object (`SpaceGraphConfig`), refer to the JSDoc in `spacegraph.js` or the main `README.md`.

## 6. Rendering Concepts

SpaceGraph uses a hybrid rendering approach:

- **WebGL Scene (`SpaceGraph.scene`)**: For `ShapeNode` meshes, `Edge` lines. Benefits from GPU acceleration.
- **CSS3D Scene (`SpaceGraph.cssScene`)**: For HTML elements (`HtmlNodeElement`, `RegisteredNode`s with `htmlElement`), rendered as `CSS3DObject`s. Allows rich text, standard CSS, and DOM interaction.
- **`CSS3DObject`**: Wraps an `HTMLElement`, allowing it to be part of the 3D scene.
- **Billboard Effect**: HTML nodes and labels often billboard (face the camera) for readability.

## 5. Styling and Appearance (Adjusted Heading Number)

- **HTML-based Nodes**: Styled with standard CSS.
- **Shape-based Nodes**: Appearance via THREE.js `Material` properties.
- **Custom Registered Types**: `onCreate` has full control.
- **Edges**: Styled via `data` object properties (e.g., `color`, `thickness`).

## 6. Layout (Adjusted Heading Number)

- **`ForceLayout`**: Default physics-based engine.
- Nodes have `mass`; edges have `stiffness`, `idealLength`.
- `node.getBoundingSphereRadius()` is important for overlap prevention.

## 7. Testing (Adjusted Heading Number)

The library includes a testing setup using Vitest. Tests can be run with `npm test`. This helps ensure stability and correctness of core functionalities.
