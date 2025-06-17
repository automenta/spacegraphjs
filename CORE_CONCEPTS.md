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

    - A wrapper class that SpaceGraph uses internally when you create a node of a custom registered type.
    - Developers typically do **not** interact with `RegisteredNode` instances directly. Instead, they define a `TypeDefinition` object which dictates the behavior and appearance of their custom node. `RegisteredNode` then uses this definition to manage the node's lifecycle and visuals.

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

This object tells SpaceGraph how to handle your custom nodes. Key methods include:

- **`getDefaults(initialData)`**:

    - Optional. Called when a new node of this type is being created.
    - Receives `initialData` passed to `spaceGraph.addNode()`.
    - Should return an object containing default properties for your node's `data` if not provided in `initialData`.
    - Example: `getDefaults: (data) => ({ label: 'Untitled', color: '#FFFFFF', ...data })`

- **`onCreate(nodeInstance, spaceGraph)`**:

    - Required. Called when a new node of this type is instantiated.
    - `nodeInstance`: The `RegisteredNode` instance being created. You can access its `id`, `position`, and merged `data` (initialData + defaults).
    - `spaceGraph`: The main `SpaceGraph` instance.
    - **Must return an object** specifying the visual components for this node. These can be:
        - `mesh`: A `THREE.Mesh` object for WebGL rendering.
        - `htmlElement`: An `HTMLElement` for CSS3D rendering. SpaceGraph will wrap this in a `CSS3DObject`.
        - `cssObject`: Alternatively, a pre-constructed `CSS3DObject`.
        - `labelObject`: A `CSS3DObject` typically used for labels.
    - These returned objects will be added to the appropriate scenes by SpaceGraph.
    - It's a common pattern to store references to frequently accessed internal DOM elements or THREE.js objects (like materials) on `nodeInst.customElements = { ... }`. This makes them easily accessible in other lifecycle methods like `onDataUpdate` or `onDispose`.

- **`onUpdate(nodeInstance, spaceGraph)`**:

    - Optional. Called on every frame of the animation loop. Useful for animations or dynamic updates.

- **`onDispose(nodeInstance)`**:

    - Optional. Called when the node is removed. Should clean up custom resources.

- **`onSetPosition(nodeInstance, x, y, z)`**:

    - Optional. Called when the node's position is updated. `RegisteredNode` provides default handling.

- **`onSetSelectedStyle(nodeInstance, isSelected)`**:

    - Optional. Called on selection state change for custom visual feedback.

- **`onSetHoverStyle(nodeInstance, isHovered)`**:

    - Optional. Called on hover state change.

- **`getBoundingSphereRadius(nodeInstance)`**:

    - Optional, but **highly recommended** for layout and camera focusing. Returns the node's encompassing radius.

- **Drag Handlers (`onStartDrag`, `onDrag`, `onEndDrag`)**:

    - Optional. Override default drag behavior.

- **`onDataUpdate(nodeInstance, updatedData)`**:
    - Optional. Called when `spaceGraph.updateNodeData(nodeId, newData)` is used. Allows the node to react to specific data changes.
    - This method is key for making nodes dynamic. When `spaceGraph.updateNodeData(nodeId, newData)` is called, `onDataUpdate` receives the `newData` object. If `newData` contains keys corresponding to the node's defined input ports (e.g., `updatedData.my_input_port`), this method should handle that incoming data, update the node's internal state (`nodeInst.data`), and refresh its visual representation if necessary. Remember to update `nodeInst.data.propertyName = updatedData.propertyName` if the change should persist.

### Node Ports (for HTML-based RegisteredNodes)

- A `TypeDefinition` can optionally include a `ports` property in its `getDefaults` method or as part of the initial data when adding a node. This defines connection points on the node.
- **Structure**:
    ```javascript
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
    - `portName`: A programmatic identifier for the port (e.g., `data_in`, `trigger_out`).
    - `label`: A user-friendly string for tooltips or UI display.
    - `type`: A user-defined string indicating the expected data type (e.g., `'string'`, `'number'`, `'signal'`, `'any'`). This is for user/developer reference and can be used for validation during linking.
- **Rendering**: For `RegisteredNode`s that create an `htmlElement` in their `onCreate` method, these defined ports will be automatically rendered as small `div` elements (styled with CSS classes `.node-port`, `.port-input`, `.port-output`) on the periphery of the `htmlElement`. For `RegisteredNode`s that define a `mesh` (WebGL) instead of an `htmlElement` in `onCreate`, these port definitions are primarily for data modeling and semantic purposes. Visual rendering of ports on WebGL nodes would require custom logic within `onCreate` (e.g., creating small indicator meshes at port locations) and is not automatic.
- **Interaction**: These visual ports can be clicked to initiate edge linking (see "Inter-Node Messaging System / Edge Linking" below).

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

### Conceptual `typeDefinition` Example (Mesh-based)

```javascript
const myBoxNodeType = {
    getDefaults: (initialData) => ({
        label: initialData.label || 'Unnamed Box',
        color: initialData.color || 0xff0000,
        size: initialData.size || 50,
        ports: { inputs: { color_in: { label: 'Color', type: 'hex' } } }, // Example port
    }),
    onCreate: (node, sg) => {
        const three = sg.constructor.THREE;
        const geometry = new three.BoxGeometry(node.data.size, node.data.size, node.data.size);
        const material = new three.MeshStandardMaterial({ color: node.data.color });
        const mesh = new three.Mesh(geometry, material);
        // ... (labelObject creation if needed) ...
        return { mesh /*, labelObject */ };
    },
    // ... other lifecycle methods ...
};
// spaceGraph.registerNodeType('simple-box', myBoxNodeType);
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

## 6. Creating Complex Nodes (App Nodes)

The custom node registration system, combined with the ability to embed rich HTML and JavaScript logic, allows for the creation of "App Nodes"—nodes that function as mini-applications or complex, interactive widgets within the SpaceGraph environment.

### Key Principles for App Nodes

- **Internal HTML Structure (`onCreate`)**:

    - The `typeDefinition.onCreate` method is where you define the internal DOM structure of your app node. This typically involves creating a main `div` for `nodeInst.htmlElement` and then populating it with various HTML elements like input fields, buttons, display areas, etc.
    - This structure is then rendered in the 3D space using `CSS3DObject`.

- **Data Management (`nodeInst.data` & `onDataUpdate`)**:

    - The primary state of your app node should be stored within `nodeInst.data`. This object is initially populated by `getDefaults` and any data passed during `spaceGraph.addNode()`.
    - Internal UI interactions (e.g., typing in a textarea, clicking a button) should update properties within `nodeInst.data`.
    - The `typeDefinition.onDataUpdate(nodeInst, updatedData)` method can be implemented to react if the node's data is changed externally (e.g., via `spaceGraph.updateNodeData(nodeId, newData)` or through an input port mechanism). This method can then update the node's internal UI to reflect the new data.

- **Internal Event Handling**:

    - Standard JavaScript event listeners (`addEventListener`) should be attached to the HTML elements created in `onCreate`.
    - Callbacks for these listeners will contain the core logic of your app node. For example, a button click might modify `nodeInst.data.someProperty`, then trigger a re-render of a part of the node's UI, and potentially emit an event through an output port.

- **Emitting Data via Output Ports**:

    - After processing an internal event or a data update, if the node needs to send data to other nodes, it uses `nodeInst.emit(outputPortName, payload)`.
    - The `outputPortName` should match one of the keys defined in `nodeInst.data.ports.outputs`.

- **Receiving Data via Input Ports (Conceptual)**:
    - **Method 1 (Direct Event Listening - Less Common for "Input Port" Semantics):** While a node can technically `listenTo` any event from another node, for true "input port" behavior, it's often about reacting to data _sent to it_. This method is viable but less direct for port semantics compared to `onDataUpdate`.
    - **Method 2 (`onDataUpdate`):** This is the most common and recommended pattern for `RegisteredNode` types to handle data arriving at their conceptual input ports. If your `TypeDefinition` defines an input port (e.g., in `getDefaults` or initial data as `ports: { inputs: { config_in: ... } }`), external logic (another node's action, or application code) would typically call `spaceGraph.updateNodeData(appNodeId, { config_in: newConfigData })`. The `onDataUpdate(nodeInst, updatedData)` method within your `TypeDefinition` for the `appNodeId` node is then responsible for checking if `updatedData.config_in` exists and processing this `newConfigData`. This usually involves updating `nodeInst.data.config_in` and then refreshing the node's internal HTML or WebGL visuals to reflect the new configuration.
    - **Method 3 (Dedicated Listener in `onCreate` - Advanced):** An App Node could, in its `onCreate`, set up listeners for specific events targeted at itself, perhaps using a global event bus or directly if another node `emit`s an event _with the App Node's ID as part of the event name or payload_. This is more complex and less conventional than using `onDataUpdate` for port-like inputs.

### Example App Node Walkthroughs

- **Markdown Editor Node (`markdown-editor`)**:

    - **Structure**: Consists of a `<textarea>` for raw Markdown input and a `<div>` for the rendered HTML preview.
    - **External Library**: Uses `Marked.js` (loaded via CDN) to convert Markdown to HTML.
    - **Logic**:
        - Text input in the `textarea` updates `nodeInst.data.markdownContent`.
        - This triggers an internal `renderPreview()` function.
        - `renderPreview()` uses `marked.parse()` to generate HTML and updates the preview `div`.
        - It then emits the generated HTML string through its `html_out` output port: `nodeInst.emit('html_out', previewDiv.innerHTML);`.
    - An input port `md_in` is defined, allowing external updates to its Markdown content via `onDataUpdate`.

- **Task List Node (`task-list`)**:
    - **Structure**: An `<h3>` for the title, an `<input type="text">` and "Add" button for new tasks, and a `<ul>` to display the list of tasks.
    - **Data Management**: Manages an array of task objects (e.g., `{id, text, completed}`) in `nodeInst.data.tasks`.
    - **Logic**:
        - Internal UI events (adding a new task, checking/unchecking a task's checkbox, deleting a task) directly modify the `nodeInst.data.tasks` array.
        - After any modification, an internal `renderTasks()` function is called to update the `<ul>` by regenerating the `<li>` elements.
        - It emits events like `task_completed` (with the specific task object) or `tasks_updated` (with the full tasks array) via its output ports.
    - An input port `add_task` allows new tasks to be added externally by updating `nodeInst.data.add_task`, which is then processed in `onDataUpdate`.

### Styling App Nodes

- Complex nodes often require their own specific CSS rules for their internal HTML structure.
- These styles can be included within a `<style>` tag in the example HTML file (as seen in `example-app-nodes.html`) or linked from an external CSS file.
- It's good practice to scope these styles using a class specific to the node type (e.g., `.markdown-editor-node .editor-area {}`) to avoid conflicts with global styles or other node types.

### Event Propagation

- When creating interactive HTML elements (buttons, inputs, etc.) inside an App Node's `htmlElement`, remember that these elements are part of the larger SpaceGraph DOM structure.
- Pointer events (like `pointerdown`, `click`) or `wheel` events on these internal elements might propagate up to the `UIManager` and interfere with graph interactions (like node dragging or camera zooming).
- To prevent this, call `event.stopPropagation()` within the event listeners for your internal interactive elements.
    - Example: `myButton.addEventListener('pointerdown', (e) => e.stopPropagation());`

## 6. Rendering Concepts

SpaceGraph uses a hybrid rendering approach:

- **WebGL Scene (`SpaceGraph.scene`)**: For `ShapeNode` meshes, `Edge` lines. Benefits from GPU acceleration.
- **CSS3D Scene (`SpaceGraph.cssScene`)**: For HTML elements (`HtmlNodeElement`, `RegisteredNode`s with `htmlElement`), rendered as `CSS3DObject`s. Allows rich text, standard CSS, and DOM interaction.
- **`CSS3DObject`**: Wraps an `HTMLElement`, allowing it to be part of the 3D scene.
- **Billboard Effect**: HTML nodes and labels often billboard (face the camera) for readability.

## 7. Styling and Appearance

- **HTML-based Nodes**: Styled with standard CSS.
- **Shape-based Nodes**: Appearance via THREE.js `Material` properties.
- **Custom Registered Types**: `onCreate` has full control.
- **Edges**: Styled via `data` object properties (e.g., `color`, `thickness`).

## 8. Layout

- **`ForceLayout`**: Default physics-based engine.
- Nodes have `mass`; edges have `stiffness`, `idealLength`.
- `node.getBoundingSphereRadius()` is important for overlap prevention.

## 9. Testing

The library includes a testing setup using Vitest. Tests can be run with `npm test`. This helps ensure stability and correctness of core functionalities.
