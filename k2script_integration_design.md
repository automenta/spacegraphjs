# K2Script Agent Integration API for SpaceGraphKT

This document outlines the design for an API to allow K2Script agents (or any JavaScript environment) to programmatically interact with and control the Kotlin/JS SpaceGraph library.

## 1. Agent Interaction Goals

A K2Script agent should be able to perform the following actions and receive information from the SpaceGraph:

*   **Graph Element Manipulation:**
    *   Create new nodes (HtmlNode, ShapeNode, NoteNode) with specified IDs, data, and initial positions.
    *   Read data and properties of existing nodes.
    *   Update data, properties (e.g., content, color, size, style), and positions of nodes.
    *   Delete nodes.
    *   Create new edges between nodes with specified IDs and data.
    *   Read data and properties of existing edges.
    *   Update data and properties of edges.
    *   Delete edges.
*   **Graph State & View Control:**
    *   Retrieve a list of all nodes or all edges.
    *   Get the currently selected node or edge.
    *   Programmatically select a node or edge.
    *   Control the camera: focus on a specific node, center the view on all nodes or a specific position, pan, and zoom (though direct zoom/pan might be less common for agents than `focusOnNode` or `centerView`).
    *   Trigger layout actions: e.g., "kick" the layout engine to re-arrange nodes.
*   **Event Handling:**
    *   Subscribe to notifications about events occurring within the SpaceGraph. Examples:
        *   `nodeAdded`, `nodeRemoved`, `edgeAdded`, `edgeRemoved`
        *   `nodeSelected`, `edgeSelected`, `selectionCleared`
        *   `nodeDataChanged` (e.g., content of a NoteNode updated by user)
        *   `nodeDragStart`, `nodeDragEnd`
        *   `customEvent` (for application-specific events)
*   **Data Serialization:**
    *   Load a graph from a structured data format (e.g., JSON).
    *   Save the current graph state to a structured data format (e.g., JSON).
*   **Custom Operations:**
    *   Invoke custom actions defined within the SpaceGraph application (e.g., "execute special algorithm on node X").

## 2. JavaScript API Surface

The API will be exposed under a namespace, e.g., `window.spaceGraphAgent`.

```javascript
// Namespace: window.spaceGraphAgent

// --- Node Operations ---
/**
 * Adds a new node to the graph.
 * @param {string} id - Unique ID for the node. If null/empty, an ID will be generated.
 * @param {object} nodeConfig - Configuration object for the node.
 *   - type: 'note' (default), 'html', 'shape'
 *   - position: { x, y, z } (optional, defaults to origin or layout-determined)
 *   - data: { label, content, color, size, shapeType, editable, custom: {}, ... } (fields depend on 'type')
 * @returns {object|null} Node object if successful, else null.
 */
window.spaceGraphAgent.addNode(id, nodeConfig);

/**
 * Retrieves a node's data by its ID.
 * @param {string} nodeId
 * @returns {object|null} Node data object or null if not found.
 */
window.spaceGraphAgent.getNode(nodeId);

/**
 * Updates data for an existing node.
 * @param {string} nodeId
 * @param {object} newData - Object containing properties to update.
 * @returns {boolean} True if successful, false otherwise.
 */
window.spaceGraphAgent.updateNodeData(nodeId, newData);

/**
 * Updates the position of an existing node.
 * @param {string} nodeId
 * @param {object} newPosition - { x, y, z }
 * @param {boolean} [triggerLayoutKick=true] - Whether to kick the layout engine after position update.
 * @returns {boolean} True if successful, false otherwise.
 */
window.spaceGraphAgent.updateNodePosition(nodeId, newPosition, triggerLayoutKick = true);

/**
 * Removes a node by its ID.
 * @param {string} nodeId
 * @returns {boolean} True if successful, false otherwise.
 */
window.spaceGraphAgent.removeNode(nodeId);

/**
 * Retrieves all nodes.
 * @returns {Array<object>} Array of node data objects.
 */
window.spaceGraphAgent.getAllNodes();

// --- Edge Operations ---
/**
 * Adds a new edge to the graph.
 * @param {string} id - Unique ID for the edge. If null/empty, an ID will be generated.
 * @param {string} sourceNodeId
 * @param {string} targetNodeId
 * @param {object} [edgeConfig] - Configuration object for the edge.
 *   - data: { label, color, thickness, constraintType, constraintParams: {}, custom: {}, ... }
 * @returns {object|null} Edge object if successful, else null.
 */
window.spaceGraphAgent.addEdge(id, sourceNodeId, targetNodeId, edgeConfig);

/**
 * Retrieves an edge's data by its ID.
 * @param {string} edgeId
 * @returns {object|null} Edge data object or null if not found.
 */
window.spaceGraphAgent.getEdge(edgeId);

/**
 * Updates data for an existing edge.
 * @param {string} edgeId
 * @param {object} newData - Object containing properties to update.
 * @returns {boolean} True if successful, false otherwise.
 */
window.spaceGraphAgent.updateEdgeData(edgeId, newData);

/**
 * Removes an edge by its ID.
 * @param {string} edgeId
 * @returns {boolean} True if successful, false otherwise.
 */
window.spaceGraphAgent.removeEdge(edgeId);

/**
 * Retrieves all edges.
 * @returns {Array<object>} Array of edge data objects.
 */
window.spaceGraphAgent.getAllEdges();

// --- View & Layout Control ---
/**
 * Focuses the camera on a specific node.
 * @param {string} nodeId
 * @param {number} [duration=0.6] - Animation duration in seconds.
 * @returns {boolean} True if node exists, false otherwise.
 */
window.spaceGraphAgent.focusOnNode(nodeId, duration = 0.6);

/**
 * Centers the view on all nodes or a specific position.
 * @param {object} [targetPosition] - Optional { x, y, z }. If null, centers on average node position.
 * @param {number} [duration=0.7] - Animation duration in seconds.
 */
window.spaceGraphAgent.centerView(targetPosition = null, duration = 0.7);

/**
 * Triggers the force layout engine to re-calculate positions.
 * @param {number} [intensity=1.0]
 */
window.spaceGraphAgent.kickLayout(intensity = 1.0);

/**
 * Resets the camera to its initial state.
 * @param {number} [duration=0.7] - Animation duration in seconds.
 */
window.spaceGraphAgent.resetView(duration = 0.7);

// --- Selection ---
/**
 * Programmatically selects a node.
 * @param {string|null} nodeId - ID of the node to select, or null to clear selection.
 * @returns {boolean} True if node exists (or null for clearing), false otherwise.
 */
window.spaceGraphAgent.selectNode(nodeId);

/**
 * Programmatically selects an edge.
 * @param {string|null} edgeId - ID of the edge to select, or null to clear selection.
 * @returns {boolean} True if edge exists (or null for clearing), false otherwise.
 */
window.spaceGraphAgent.selectEdge(edgeId);

/**
 * Gets the currently selected node.
 * @returns {object|null} Selected node data object or null.
 */
window.spaceGraphAgent.getSelectedNode();

/**
 * Gets the currently selected edge.
 * @returns {object|null} Selected edge data object or null.
 */
window.spaceGraphAgent.getSelectedEdge();


// --- Event Handling ---
/**
 * Subscribes to a SpaceGraph event.
 * @param {string} eventType - Name of the event (e.g., 'nodeAdded', 'nodeSelected').
 * @param {function} callback - Function to call when the event occurs. Receives event payload.
 * @returns {string} Subscription ID (for unsubscribing).
 */
window.spaceGraphAgent.onGraphEvent(eventType, callback);

/**
 * Unsubscribes from a SpaceGraph event.
 * @param {string} subscriptionId - The ID returned by onGraphEvent.
 * @returns {boolean} True if successful.
 */
window.spaceGraphAgent.offGraphEvent(subscriptionId);

/**
 * Dispatches a custom event from an agent into the SpaceGraph event system (and potentially to other agents).
 * @param {string} eventType - Custom event name.
 * @param {object} payload - Data associated with the event.
 */
window.spaceGraphAgent.dispatchCustomEvent(eventType, payload);


// --- Data Serialization ---
/**
 * Retrieves the entire graph data as a JSON-compatible object.
 * @returns {object} Graph data (nodes and edges).
 */
window.spaceGraphAgent.getGraphData();

/**
 * Loads graph data from a JSON-compatible object.
 * This will typically clear the existing graph.
 * @param {object} graphData - Object containing nodes and edges.
 * @param {boolean} [autoLayout=true] - Whether to kick layout after loading.
 * @returns {boolean} True if successful.
 */
window.spaceGraphAgent.loadGraphData(graphData, autoLayout = true);

/**
 * Clears the entire graph (all nodes and edges).
 */
window.spaceGraphAgent.clearGraph();
```

## 3. Specify Data Formats

Data passed to and from the API should be simple JavaScript objects.

**Node Configuration/Data (`nodeConfig` for `addNode`, `newData` for `updateNodeData`, return for `getNode`):**
```json
{
  "id": "string (optional for add, present in get/update)",
  "type": "string ('note', 'html', 'shape')", // Required for addNode
  "position": { "x": "number", "y": "number", "z": "number" }, // Optional for addNode
  "data": { // Content and behavior properties
    "label": "string (optional)",
    // HTML/NoteNode specific
    "content": "string (optional, HTML content for html, text for note)",
    "width": "number (optional, for HtmlNodeElement)",
    "height": "number (optional, for HtmlNodeElement)",
    "contentScale": "number (optional, for HtmlNodeElement)",
    "backgroundColor": "string (optional, CSS color for HtmlNodeElement)",
    "editable": "boolean (optional, for NoteNode/HtmlNodeElement)",
    "billboard": "boolean (optional, for HtmlNodeElement)",
    // ShapeNode specific
    "shapeType": "string (optional, e.g., 'sphere', 'box')",
    "shapeSize": "number (optional)",
    "shapeColor": "number (optional, hex color like 0xff0000)",
    // Common
    "mass": "number (optional)",
    "custom": {} // Agent-specific or other arbitrary data
  }
}
```
*When reading a node, the structure will be similar, reflecting its current state.*

**Edge Configuration/Data (`edgeConfig` for `addEdge`, `newData` for `updateEdgeData`, return for `getEdge`):**
```json
{
  "id": "string (optional for add, present in get/update)",
  "source": "string (nodeId, present in get/update)", // Not needed for addEdge (passed as param)
  "target": "string (nodeId, present in get/update)", // Not needed for addEdge (passed as param)
  "data": {
    "label": "string (optional)",
    "color": "number (hex color, e.g., 0x00d0ff)",
    "thickness": "number",
    "style": "string ('solid', 'dashed' - future)", // Future support
    "constraintType": "string ('elastic', 'rigid', 'weld')",
    "constraintParams": {
      // Structure depends on constraintType, e.g., for 'elastic':
      // "stiffness": "number", "idealLength": "number"
    },
    "custom": {} // Agent-specific or other arbitrary data
  }
}
```

**Graph Data (for `getGraphData`, `loadGraphData`):**
```json
{
  "nodes": [ /* Array of Node data objects (see Node Configuration/Data) */ ],
  "edges": [ /* Array of Edge data objects (see Edge Configuration/Data, source/target IDs included) */ ]
  // Potentially metadata like camera position, zoom, etc. in the future
}
```

**Event Payload:**
The payload structure will depend on the `eventType`.
*   `nodeAdded`: `{ "nodeId": "string", "nodeData": { ... } }`
*   `nodeRemoved`: `{ "nodeId": "string" }`
*   `edgeAdded`: `{ "edgeId": "string", "edgeData": { ... } }`
*   `edgeRemoved`: `{ "edgeId": "string" }`
*   `nodeSelected`: `{ "nodeId": "string|null", "previousNodeId": "string|null" }`
*   `edgeSelected`: `{ "edgeId": "string|null", "previousEdgeId": "string|null" }`
*   `nodeDataChanged`: `{ "nodeId": "string", "changedData": { ... }, "fullNodeData": { ... } }`
*   `nodeDragEnd`: `{ "nodeId": "string", "position": { "x", "y", "z" } }`
*   `customEvent`: `{ "name": "string", "detail": { ... } }` (mirrors CustomEvent detail)

## 4. Event Mechanism

A publish/subscribe model will be used.

1.  **Subscription:**
    *   K2Script agents use `window.spaceGraphAgent.onGraphEvent(eventType, callback)` to subscribe.
    *   `eventType` is a string like `'nodeAdded'`. A special `'*'` could signify all events.
    *   The Kotlin/JS side will maintain a list of (eventType, callback, subscriptionId) tuples.
    *   A unique `subscriptionId` (e.g., UUID string) is returned to the agent.

2.  **Event Dispatching (Kotlin/JS internal):**
    *   When an relevant action occurs in `SpaceGraph` (e.g., a node is added via internal methods or UI), an internal event dispatcher is triggered.
    *   This dispatcher iterates through subscribed callbacks matching the `eventType`.
    *   It constructs the appropriate payload and invokes the JavaScript callback function with the payload.
    *   Care must be taken to handle potential errors in JavaScript callbacks gracefully to prevent breaking the Kotlin/JS event loop.

3.  **Unsubscription:**
    *   Agents use `window.spaceGraphAgent.offGraphEvent(subscriptionId)` to remove their callback.

4.  **Custom Events via API:**
    *   `window.spaceGraphAgent.dispatchCustomEvent(eventType, payload)` allows an agent to inject an event into the system. The SpaceGraph's event mechanism would then propagate this to any JS callbacks subscribed to that custom event type. This is useful for agent-to-agent communication mediated by the graph or for an agent to trigger its own event-driven logic through the graph's event system.

## 5. Kotlin/JS Implementation Strategy (High-Level)

1.  **Create an `AgentAPI` Kotlin Class:**
    *   This class will reside in Kotlin/JS (e.g., `com.example.spacegraphkt.api.AgentAPI`).
    *   It will take the `SpaceGraph` instance as a constructor parameter.
    *   Each API function (e.g., `addNode`, `getNode`) will be a method in this class.
    *   These methods will perform necessary data conversion (JS dynamic objects to Kotlin data classes and vice-versa) and then call the appropriate methods on the `spaceGraph` instance.

2.  **Expose `AgentAPI` to JavaScript:**
    *   Use `@JsExport` on the `AgentAPI` class and its methods.
    *   In the `main` function of `Main.kt` (or a dedicated initialization block), create an instance of `AgentAPI` and attach it to the `window` object under the desired namespace:
        ```kotlin
        // In Main.kt or similar init file
        val spaceGraphInstance = SpaceGraph(container, null) // Existing SpaceGraph instance
        val agentApi = AgentAPI(spaceGraphInstance)
        window.asDynamic().spaceGraphAgent = agentApi
        ```
        If more complex namespacing is needed (`window.myApp.spaceGraphAgent`), it can be done by creating intermediate JS objects on `window`.

3.  **Data Conversion:**
    *   For input: JS `dynamic` objects will be mapped to Kotlin data classes. This might involve manual mapping or using a serialization library if complex (though for this API, manual mapping is likely sufficient and gives more control). Helper functions can be created for these conversions.
    *   For output: Kotlin data classes will be converted to plain JS objects. `@JsExport` handles basic cases, but complex nested structures or specific formatting might need manual construction of `js("({})")` objects.

4.  **Event Handling Implementation:**
    *   The `AgentAPI` class will manage a `MutableMap<String, MutableList<JsEventCallbackInfo>>` where `String` is `eventType` and `JsEventCallbackInfo` is a data class holding the JS `Function` callback and its `subscriptionId`.
    *   `onGraphEvent` adds to this map. `offGraphEvent` removes.
    *   The `SpaceGraph` class (or a dedicated internal event bus it uses) needs to be modified to call a method on `AgentAPI` (e.g., `AgentAPI.fireEvent(eventType: String, payload: dynamic)`) when internal events occur.
    *   `AgentAPI.fireEvent` will then look up and execute the registered JS callbacks.
    *   Payloads will be constructed as `dynamic` JS objects.

5.  **Error Handling:**
    *   API methods should include `try-catch` blocks to handle potential issues (e.g., node not found, invalid data) and return appropriate values (e.g., `null`, `false`, or error objects if the API design evolves to include them).
    *   JS callback invocations should also be wrapped in `try-catch` to prevent agent errors from crashing the Kotlin application.

## 6. Security/Namespace Considerations

*   **Namespace:** Using `window.spaceGraphAgent` (or a more specific `window.myCompany.spaceGraphAgent`) is crucial to avoid polluting the global namespace and potential conflicts.
*   **Security:**
    *   For the current design, the K2Script environment is assumed to be trusted.
    *   If agents were untrusted, the API would need significant hardening:
        *   Input validation for all parameters.
        *   Rate limiting or API call quotas.
        *   Permissions model (e.g., agent X can only read, agent Y can read/write specific node types).
        *   Sandboxing callbacks (though this is very complex in a shared JS environment).
    *   Exposing raw node/edge objects directly should be avoided; instead, expose data representations (as designed). This limits an agent's ability to call arbitrary methods on internal Kotlin objects.
    *   The use of `@JsExport` makes Kotlin code callable. If granular control is needed over what is exported vs. what is callable via the agent API, the `AgentAPI` class acts as that explicit facade. Internal `SpaceGraph` methods not meant for agents would not be part of `AgentAPI` or `@JsExport`-ed.

This design provides a comprehensive API for K2Script agents to interact with the SpaceGraphKT library, enabling programmatic control and event-driven automation.
