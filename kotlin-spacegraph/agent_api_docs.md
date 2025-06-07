# SpaceGraphKT - K2Script Agent API Documentation

This document provides documentation for the JavaScript API exposed by the SpaceGraphKT library, allowing K2Script agents (or other JavaScript environments) to interact with and control the graph visualization.

The API is typically available under the global namespace: `window.spaceGraphAgent`.

## General Notes

*   **IDs:** Node and Edge IDs are strings. If an `id` is not provided during creation, one will be generated.
*   **Data Objects:** Data for nodes and edges (e.g., `nodeConfig`, `edgeConfig`) are JavaScript objects. Their structure is detailed below.
*   **Return Values:** API methods generally return `null` or `false` on failure, and the requested data or `true` on success. Check console logs for detailed error messages from the API.
*   **Asynchronous Operations:** Some operations (like focusing view) might involve animations. The API calls themselves are synchronous unless otherwise noted. Event callbacks are asynchronous.

## API Methods

### Node Operations

---

#### `addNode(id, nodeConfig)`
Adds a new node to the graph.

*   **Signature:** `addNode(id: string | null, nodeConfig: object): object | null`
*   **Parameters:**
    *   `id` (String | Null): Unique ID for the node. If null or empty, an ID will be generated.
    *   `nodeConfig` (Object): Configuration object for the node.
        *   `type` (String): Type of node. Can be `'note'` (default), `'html'`, or `'shape'`.
        *   `position` (Object, optional): `{ x: number, y: number, z: number }`. Defaults to origin or layout-determined.
        *   `data` (Object, optional): Contains properties specific to the node's appearance and behavior.
            *   `label` (String, optional): Text label for the node. Defaults to node ID if not provided.
            *   *(HTML/NoteNode specific):*
                *   `content` (String, optional): HTML content (for 'html') or plain text (for 'note').
                *   `width` (Number, optional): Width of the HTML element.
                *   `height` (Number, optional): Height of the HTML element.
                *   `contentScale` (Number, optional): Scaling factor for content within HTML nodes (default: 1.0).
                *   `backgroundColor` (String, optional): CSS color string for HTML node background.
                *   `editable` (Boolean, optional): If the node's content is editable (default: true for 'note', false for others).
                *   `billboard` (Boolean, optional): If HTML node should always face the camera (default: true).
            *   *(ShapeNode specific):*
                *   `shapeType` (String, optional): E.g., `'sphere'`, `'box'` (default: 'sphere').
                *   `shapeSize` (Number, optional): Diameter or side length (default: 50).
                *   `shapeColor` (Number, optional): Hex color, e.g., `0xff0000` for red (default: 0xffffff).
            *   *(Common):*
                *   `mass` (Number, optional): Node mass for physics layout (default: 1.0).
                *   `custom` (Object, optional): Agent-specific or other arbitrary data.
*   **Returns:** (Object | Null) A JavaScript object representing the added node's data if successful, else `null`.
*   **Example:**
    ```javascript
    const newNode = window.spaceGraphAgent.addNode("myNode1", {
        type: 'note',
        position: { x: 50, y: 0, z: 0 },
        data: {
            label: 'My Note',
            content: 'This is a note added by an agent.',
            width: 200,
            height: 100,
            backgroundColor: 'rgba(255, 255, 200, 0.9)'
        }
    });
    if (newNode) {
        console.log('Node added:', newNode);
    }
    ```

---

#### `getNode(nodeId)`
Retrieves a node's data and properties by its ID.

*   **Signature:** `getNode(nodeId: string): object | null`
*   **Parameters:**
    *   `nodeId` (String): The ID of the node to retrieve.
*   **Returns:** (Object | Null) A JavaScript object representing the node's current state (similar to `nodeConfig` structure but with all fields populated), or `null` if not found.
*   **Example:**
    ```javascript
    const nodeData = window.spaceGraphAgent.getNode("myNode1");
    if (nodeData) {
        console.log('Node data:', nodeData);
    }
    ```

---

#### `updateNodeData(nodeId, newData)`
Updates data and properties for an existing node. Only provided fields are updated.

*   **Signature:** `updateNodeData(nodeId: string, newData: object): boolean`
*   **Parameters:**
    *   `nodeId` (String): The ID of the node to update.
    *   `newData` (Object): An object containing the properties to update. See `nodeConfig.data` structure in `addNode` for available fields. You can update `label`, `content`, `shapeType`, `custom` data, etc.
*   **Returns:** (Boolean) `true` if successful, `false` otherwise (e.g., node not found).
*   **Example:**
    ```javascript
    const success = window.spaceGraphAgent.updateNodeData("myNode1", {
        label: 'My Note (Updated)',
        content: 'Content has been updated by agent.',
        custom: { version: 2 }
    });
    console.log('Node update success:', success);
    ```

---

#### `updateNodePosition(nodeId, newPosition, triggerLayoutKick = true)`
Updates the position of an existing node.

*   **Signature:** `updateNodePosition(nodeId: string, newPosition: object, triggerLayoutKick?: boolean): boolean`
*   **Parameters:**
    *   `nodeId` (String): The ID of the node to move.
    *   `newPosition` (Object): `{ x: number, y: number, z: number }`.
    *   `triggerLayoutKick` (Boolean, optional): If `true` (default), the layout engine will be "kicked" to readjust other nodes. Set to `false` for manual positioning without affecting layout immediately.
*   **Returns:** (Boolean) `true` if successful, `false` otherwise.
*   **Example:**
    ```javascript
    window.spaceGraphAgent.updateNodePosition("myNode1", { x: 100, y: 50, z: 10 });
    ```

---

#### `removeNode(nodeId)`
Removes a node (and its connected edges) from the graph.

*   **Signature:** `removeNode(nodeId: string): boolean`
*   **Parameters:**
    *   `nodeId` (String): The ID of the node to remove.
*   **Returns:** (Boolean) `true` if successful, `false` otherwise.
*   **Example:**
    ```javascript
    window.spaceGraphAgent.removeNode("myNode1");
    ```

---

#### `getAllNodes()`
Retrieves data for all nodes currently in the graph.

*   **Signature:** `getAllNodes(): Array<object>`
*   **Returns:** (Array<Object>) An array of node data objects.
*   **Example:**
    ```javascript
    const nodes = window.spaceGraphAgent.getAllNodes();
    console.log(`Found ${nodes.length} nodes.`);
    ```

---

### Edge Operations

---

#### `addEdge(id, sourceNodeId, targetNodeId, edgeConfig)`
Adds a new edge connecting two nodes.

*   **Signature:** `addEdge(id: string | null, sourceNodeId: string, targetNodeId: string, edgeConfig?: object): object | null`
*   **Parameters:**
    *   `id` (String | Null): Unique ID for the edge. If null/empty, an ID will be generated.
    *   `sourceNodeId` (String): ID of the source node.
    *   `targetNodeId` (String): ID of the target node.
    *   `edgeConfig` (Object, optional): Configuration object for the edge.
        *   `data` (Object, optional): Contains properties for the edge.
            *   `label` (String, optional): Text label for the edge.
            *   `color` (Number, optional): Hex color (e.g., `0x00d0ff`).
            *   `thickness` (Number, optional): Line thickness.
            *   `style` (String, optional): E.g., `'solid'` (future: `'dashed'`).
            *   `constraintType` (String, optional): `'elastic'`, `'rigid'`, `'weld'`.
            *   `constraintParams` (Object, optional): Parameters for the chosen `constraintType`.
                *   For `'elastic'`: `{ stiffness?: number, idealLength?: number }`
                *   For `'rigid'`: `{ distance?: number, stiffness?: number }`
                *   For `'weld'`: `{ distance?: number, stiffness?: number }`
            *   `custom` (Object, optional): Agent-specific or other arbitrary data.
*   **Returns:** (Object | Null) A JavaScript object representing the added edge's data if successful, else `null`.
*   **Example:**
    ```javascript
    const newEdge = window.spaceGraphAgent.addEdge(null, "myNode1", "anotherNodeId", {
        data: {
            label: 'connects to',
            color: 0xff0000 // Red edge
        }
    });
    if (newEdge) {
        console.log('Edge added:', newEdge);
    }
    ```

---

#### `getEdge(edgeId)`
Retrieves an edge's data by its ID.

*   **Signature:** `getEdge(edgeId: string): object | null`
*   **Parameters:**
    *   `edgeId` (String): The ID of the edge to retrieve.
*   **Returns:** (Object | Null) A JavaScript object representing the edge's current state, or `null` if not found.
*   **Example:**
    ```javascript
    const edgeData = window.spaceGraphAgent.getEdge("myEdge1");
    if (edgeData) {
        console.log('Edge data:', edgeData);
    }
    ```

---

#### `updateEdgeData(edgeId, newData)`
Updates data for an existing edge.

*   **Signature:** `updateEdgeData(edgeId: string, newData: object): boolean`
*   **Parameters:**
    *   `edgeId` (String): The ID of the edge to update.
    *   `newData` (Object): An object containing properties to update (within a `data` field, similar to `edgeConfig.data`).
*   **Returns:** (Boolean) `true` if successful, `false` otherwise.
*   **Example:**
    ```javascript
    window.spaceGraphAgent.updateEdgeData("myEdge1", {
        label: 'Link (Updated)',
        color: 0x00ff00 // Green
    });
    ```

---

#### `removeEdge(edgeId)`
Removes an edge from the graph.

*   **Signature:** `removeEdge(edgeId: string): boolean`
*   **Parameters:**
    *   `edgeId` (String): The ID of the edge to remove.
*   **Returns:** (Boolean) `true` if successful, `false` otherwise.
*   **Example:**
    ```javascript
    window.spaceGraphAgent.removeEdge("myEdge1");
    ```

---

#### `getAllEdges()`
Retrieves data for all edges currently in the graph.

*   **Signature:** `getAllEdges(): Array<object>`
*   **Returns:** (Array<Object>) An array of edge data objects.
*   **Example:**
    ```javascript
    const edges = window.spaceGraphAgent.getAllEdges();
    console.log(`Found ${edges.length} edges.`);
    ```

---

### View & Layout Control

---

#### `focusOnNode(nodeId, duration = 0.6)`
Focuses the camera on a specific node.

*   **Signature:** `focusOnNode(nodeId: string, duration?: number): boolean`
*   **Parameters:**
    *   `nodeId` (String): ID of the node to focus on.
    *   `duration` (Number, optional): Animation duration in seconds (default: 0.6).
*   **Returns:** (Boolean) `true` if node exists and focus initiated, `false` otherwise.
*   **Example:**
    ```javascript
    window.spaceGraphAgent.focusOnNode("myNode1");
    ```

---

#### `centerView(targetPosition = null, duration = 0.7)`
Centers the view on all nodes or a specific position.

*   **Signature:** `centerView(targetPosition?: object | null, duration?: number): void`
*   **Parameters:**
    *   `targetPosition` (Object | Null, optional): `{ x: number, y: number, z: number }`. If `null`, centers on the average position of all nodes.
    *   `duration` (Number, optional): Animation duration in seconds (default: 0.7).
*   **Example:**
    ```javascript
    window.spaceGraphAgent.centerView(); // Center on all nodes
    // window.spaceGraphAgent.centerView({ x: 0, y: 0, z: 0 }); // Center on origin
    ```

---

#### `kickLayout(intensity = 1.0)`
Triggers the force layout engine to re-calculate positions, applying a "kick" to nodes.

*   **Signature:** `kickLayout(intensity?: number): void`
*   **Parameters:**
    *   `intensity` (Number, optional): Multiplier for the kick strength (default: 1.0).
*   **Example:**
    ```javascript
    window.spaceGraphAgent.kickLayout(1.5);
    ```

---

#### `resetView(duration = 0.7)`
Resets the camera to its initial saved state.

*   **Signature:** `resetView(duration?: number): void`
*   **Parameters:**
    *   `duration` (Number, optional): Animation duration in seconds (default: 0.7).
*   **Example:**
    ```javascript
    window.spaceGraphAgent.resetView();
    ```

---

### Selection

---

#### `selectNode(nodeId)`
Programmatically selects a node or clears node selection.

*   **Signature:** `selectNode(nodeId: string | null): void`
*   **Parameters:**
    *   `nodeId` (String | Null): ID of the node to select, or `null` to clear the current node selection.
*   **Example:**
    ```javascript
    window.spaceGraphAgent.selectNode("myNode1"); // Selects myNode1
    // window.spaceGraphAgent.selectNode(null); // Clears node selection
    ```

---

#### `selectEdge(edgeId)`
Programmatically selects an edge or clears edge selection.

*   **Signature:** `selectEdge(edgeId: string | null): void`
*   **Parameters:**
    *   `edgeId` (String | Null): ID of the edge to select, or `null` to clear the current edge selection.
*   **Example:**
    ```javascript
    window.spaceGraphAgent.selectEdge("myEdge1");
    ```

---

#### `getSelectedNode()`
Gets the currently selected node.

*   **Signature:** `getSelectedNode(): object | null`
*   **Returns:** (Object | Null) The selected node's data object, or `null` if no node is selected.
*   **Example:**
    ```javascript
    const selected = window.spaceGraphAgent.getSelectedNode();
    if (selected) console.log('Selected node:', selected);
    ```

---

#### `getSelectedEdge()`
Gets the currently selected edge.

*   **Signature:** `getSelectedEdge(): object | null`
*   **Returns:** (Object | Null) The selected edge's data object, or `null` if no edge is selected.
*   **Example:**
    ```javascript
    const selected = window.spaceGraphAgent.getSelectedEdge();
    if (selected) console.log('Selected edge:', selected);
    ```

---

### Event Handling

The SpaceGraphKT library emits events that agents can subscribe to.

---

#### `onGraphEvent(eventType, callback)`
Subscribes to a SpaceGraph event.

*   **Signature:** `onGraphEvent(eventType: string, callback: function): string`
*   **Parameters:**
    *   `eventType` (String): Name of the event (see "Event Types" below). Use `"*"` to subscribe to all events.
    *   `callback` (Function): Function to call when the event occurs. It receives a single argument: an `eventPayload` object.
*   **Returns:** (String) A unique subscription ID, which can be used to unsubscribe later.
*   **Example:**
    ```javascript
    const subId = window.spaceGraphAgent.onGraphEvent('nodeAdded', (payload) => {
        console.log('Node was added:', payload.nodeId, payload.nodeData);
    });
    ```

---

#### `offGraphEvent(subscriptionId)`
Unsubscribes from a SpaceGraph event.

*   **Signature:** `offGraphEvent(subscriptionId: string): boolean`
*   **Parameters:**
    *   `subscriptionId` (String): The ID returned by `onGraphEvent`.
*   **Returns:** (Boolean) `true` if unsubscription was successful, `false` otherwise.
*   **Example:**
    ```javascript
    window.spaceGraphAgent.offGraphEvent(subId);
    ```

---

#### `dispatchCustomEvent(eventType, payload)`
Dispatches a custom event from an agent. Other agents subscribed to `agentCustom:<eventType>` will receive it.

*   **Signature:** `dispatchCustomEvent(eventType: string, payload: object): void`
*   **Parameters:**
    *   `eventType` (String): A custom name for the event. It will be prefixed with `agentCustom:` internally.
    *   `payload` (Object): Data associated with the event.
*   **Example:**
    ```javascript
    window.spaceGraphAgent.dispatchCustomEvent('myAgentAction', { detail: 'Agent X did something' });
    // Another agent might subscribe using:
    // window.spaceGraphAgent.onGraphEvent('agentCustom:myAgentAction', (data) => { ... });
    ```

---

#### Event Types and Payloads

Standard event types dispatched by SpaceGraph include:

*   **`nodeAdded`**: A node was added to the graph.
    *   Payload: `{ nodeId: string, nodeData: object }`
*   **`nodeRemoved`**: A node was removed from the graph.
    *   Payload: `{ nodeId: string }`
*   **`edgeAdded`**: An edge was added to the graph.
    *   Payload: `{ edgeId: string, edgeData: object }`
*   **`edgeRemoved`**: An edge was removed from the graph.
    *   Payload: `{ edgeId: string }`
*   **`nodeSelected`**: A node was selected, or selection was cleared.
    *   Payload: `{ nodeId: string | null, previousNodeId: string | null }`
*   **`edgeSelected`**: An edge was selected, or selection was cleared.
    *   Payload: `{ edgeId: string | null, previousEdgeId: string | null }`
*   **`nodeDataChanged`**: Data of a node was updated (e.g., via `updateNodeData` or UI interaction).
    *   Payload: `{ nodeId: string, changedData: object, fullNodeData: object }` (`changedData` is what the agent sent, `fullNodeData` is the complete node after update).
*   **`edgeDataChanged`**: Data of an edge was updated.
    *   Payload: `{ edgeId: string, changedData: object, fullEdgeData: object }`
*   **`nodePositionChanged`**: A node's position was updated programmatically via `updateNodePosition`.
    *   Payload: `{ nodeId: string, position: {x,y,z} }`
    *   *Note: Does not fire for every step of the force layout.*
*   **`backgroundChanged`**: The graph background was changed.
    *   Payload: `{ color: number, alpha: number }`
*   **`windowResized`**: The browser window was resized.
    *   Payload: `{ width: number, height: number }`
*   **`viewCentered`**: The `centerView` method was called.
    *   Payload: `{ target: {x,y,z} | null, duration: number }`
*   **`nodeFocused`**: The `focusOnNode` method was called.
    *   Payload: `{ nodeId: string, duration: number }`
*   **`layoutStarted`**: The force layout simulation started.
    *   Payload: `{}`
*   **`layoutStopped`**: The force layout simulation stopped.
    *   Payload: `{ reason: string ('autoStopLowEnergy', 'manualStop', etc.), energy?: number }`
*   **`layoutKicked`**: The layout was "kicked".
    *   Payload: `{ intensity: number }`
*   **`layoutSettingsChanged`**: Layout settings were updated.
    *   Payload: (Object representing the new settings)
*   **`graphCleared`**: All nodes and edges were removed via `clearGraph`.
    *   Payload: `{}`
*   **`graphLoaded`**: A new graph was loaded via `loadGraphData`. (Consider adding this event)
    *   Payload: `{}`
*   **`linkStarted`**: User started interactively creating an edge.
    *   Payload: `{ sourceNodeId: string }`
*   **`linkCompletedViaUI`**: User finished creating an edge via UI.
    *   Payload: `{ edgeId: string, sourceNodeId: string, targetNodeId: string }`
*   **`linkCancelled`**: User cancelled interactive edge creation.
    *   Payload: `{ sourceNodeId: string | null, reason: string }`
*   **`graphDisposed`**: The SpaceGraph instance was disposed.
    *   Payload: `{}`
*   **`agentCustom:<yourEventType>`**: Custom event dispatched by an agent.
    *   Payload: (As provided by the dispatching agent)

---

### Data Serialization

---

#### `getGraphData()`
Retrieves the entire current graph data (nodes and edges) as a JSON-compatible object.

*   **Signature:** `getGraphData(): object`
*   **Returns:** (Object) An object with two properties:
    *   `nodes`: An array of node data objects (see `addNode`'s `nodeConfig` for structure, but `id`, `type`, `position`, and `data` will be top-level fields in each node object).
    *   `edges`: An array of edge data objects (see `addEdge`'s `edgeConfig` for structure, but `id`, `source`, `target`, and `data` will be top-level fields in each edge object).
*   **Example:**
    ```javascript
    const graphSnapshot = window.spaceGraphAgent.getGraphData();
    // console.log(JSON.stringify(graphSnapshot));
    // You can save this snapshot to a file or send it over a network.
    ```
    *Example node structure in output:*
    ```json
    {
      "id": "node1",
      "type": "note",
      "position": { "x": 10, "y": 20, "z": 0 },
      "data": { "label": "My Label", "content": "...", /* other data fields */ }
    }
    ```
    *Example edge structure in output:*
    ```json
    {
      "id": "edge1",
      "source": "node1", // Source node ID
      "target": "node2", // Target node ID
      "data": { "label": "Connects", "color": 0xff0000, /* other data fields */ }
    }
    ```

---

#### `loadGraphData(graphData, autoLayout = true)`
Loads a graph from a JSON-compatible object structure. This typically clears the existing graph before loading.

*   **Signature:** `loadGraphData(graphData: object, autoLayout?: boolean): boolean`
*   **Parameters:**
    *   `graphData` (Object): An object with `nodes` and `edges` arrays, matching the format produced by `getGraphData()`.
    *   `autoLayout` (Boolean, optional): If `true` (default), kicks the layout engine and centers the view after loading.
*   **Returns:** (Boolean) `true` if data parsing and loading initiated successfully, `false` otherwise.
*   **Example:**
    ```javascript
    const graphToLoad = {
        nodes: [
            { id: "n1", type: "note", position: {x:0,y:0,z:0}, data: { label: "Node A" } },
            { id: "n2", type: "shape", position: {x:100,y:0,z:0}, data: { label: "Node B", shapeType: "sphere" } }
        ],
        edges: [
            { id: "e1", source: "n1", target: "n2", data: { label: "Link A-B" } }
        ]
    };
    const success = window.spaceGraphAgent.loadGraphData(graphToLoad);
    console.log('Graph load success:', success);
    ```

---

#### `clearGraph()`
Removes all nodes and edges from the graph.

*   **Signature:** `clearGraph(): void`
*   **Example:**
    ```javascript
    window.spaceGraphAgent.clearGraph();
    ```

---
This concludes the K2Script Agent API documentation. For detailed examples of usage, refer to `agent_example.js`.
