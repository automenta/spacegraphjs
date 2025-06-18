# SpaceGraph.js Cookbook

This cookbook provides practical examples and recipes for achieving common tasks and advanced customizations with SpaceGraph.js.

## Advanced Styling of Nodes and Edges

This section covers various techniques for customizing the visual appearance of your nodes and edges, both statically and dynamically.

### 1. Styling HTML-based Nodes (`NoteNode`, `HtmlAppNode`)

HTML-based nodes are rendered as DOM elements within the SpaceGraph environment. You can style them using standard CSS techniques.

**a. Using CSS Classes:**

The most common way to style HTML nodes is by assigning CSS classes. You can define these classes in your main CSS file (e.g., `index.css` or a dedicated stylesheet).

*In your CSS (e.g., `index.css`):*
```css
.custom-html-node {
    background-color: #f0f8ff; /* AliceBlue */
    border: 2px solid #4682b4; /* SteelBlue */
    border-radius: 8px;
    padding: 15px;
    box-shadow: 5px 5px 10px rgba(0,0,0,0.2);
    font-family: 'Arial', sans-serif;
}

.custom-html-node h3 {
    margin-top: 0;
    color: #2a5282; /* Darker blue for heading */
}

.important-node {
    border-color: #ff4500; /* OrangeRed for important nodes */
    background-color: #fff0e6;
}
```

*When adding the node:*
```javascript
graph.addNode({
    type: 'note', // Or your custom HtmlAppNode type
    id: 'styled-node-1',
    content: '<h3>Styled Note</h3><p>This node uses CSS classes.</p>',
    className: 'custom-html-node', // Apply a base class
    x: 0, y: 0
});

graph.addNode({
    type: 'note',
    id: 'important-node-1',
    content: '<h3>Important!</h3><p>This node has an additional class.</p>',
    className: 'custom-html-node important-node', // Apply multiple classes
    x: 100, y: 100
});
```
For `HtmlAppNode` instances, you can set `this.element.className` or `this.contentElement.className` within your `render()` or other methods. The `element` is the main wrapper managed by `HtmlNode`, and `contentElement` is typically where your app node's specific HTML resides.

**b. Using Inline Styles:**

You can apply inline styles directly by manipulating `this.element.style` or `this.contentElement.style` in `HtmlAppNode`. For `NoteNode`, styles are best applied via `className` or by embedding styles directly in the `content` HTML string.

*In your `HtmlAppNode` subclass:*
```javascript
class MyStyledAppNode extends HtmlAppNode {
    // onInit() is called by HtmlAppNode's constructor after this.htmlElement is created
    // and basic styles (width, height, backgroundColor from this.data) are applied.
    onInit() {
        // this.htmlElement is the main DOM element for this node.
        this.htmlElement.innerHTML = 'Dynamic inline styles.';

        // Style the main HTML element
        this.htmlElement.style.backgroundColor = 'rgba(200, 255, 200, 0.9)';
        this.htmlElement.style.border = '1px dashed green';
        this.htmlElement.style.padding = '10px'; // Note: padding affects content area size.
                                               // Ensure width/height in getDefaults account for this,
                                               // or set box-sizing: border-box in CSS for this node type.

        // If padding/border dynamically changes the required overall size,
        // and the node's width/height data should reflect that, you might need
        // to adjust this.data.width/height and call this.spaceGraph.nodeNeedsUpdate(this).
        // However, fixed-size nodes with internal padding are common.
        // this.updateSize() was a method on older base classes, not standard in HtmlAppNode.
        // HtmlAppNode's size is driven by this.data.width/height.
    }
}
// Register and use this node type (ensure getDefaults provides width/height)
```

**c. Dynamically Changing HTML Node Styles:**

You can change styles based on data or application state.

*Using CSS Classes (recommended):*
```javascript
const myNode = graph.getNode('styled-node-1'); // Gets the BaseNode wrapper
if (myNode && myNode.htmlNode && myNode.htmlNode.element) {
    // myNode.htmlNode is the HtmlNode instance, .element is its root DOM element
    myNode.htmlNode.element.classList.add('highlighted');
    myNode.htmlNode.element.classList.remove('some-other-class');
}
```

*In your `HtmlAppNode` subclass (for internal state changes):*
```javascript
class DataDrivenNode extends HtmlAppNode {
    // dataValue is part of this.data, initialized by getDefaults or addNode data.
    // constructor(id, sg, config) { // Not typically needed if just using super
    //     super(id, sg, config);
    // }

    // onInit() is called by HtmlAppNode's constructor.
    // Used here to set up the initial HTML structure of the node.
    onInit() {
        // this.data.value should be initialized in getDefaults or when adding the node.
        // Example: this.data.value = this.data.initialValue || 0;
        this.htmlElement.innerHTML = `Value: <span class="data-value">${this.data.value || 0}</span>`;
        this.updateVisualsBasedOnData(); // Apply initial style based on current data
    }

    // updateVisualsBasedOnData is a helper method to apply styles based on current this.data.value.
    // It would typically be called from onDataUpdate when this.data.value changes,
    // or internally after some user interaction within the node modifies this.data.value.
    updateVisualsBasedOnData() {
        const valueDisplay = this.htmlElement.querySelector('.data-value');
        if (valueDisplay) {
            valueDisplay.textContent = this.data.value;
        }

        if (this.data.value > 10) {
            this.htmlElement.style.borderColor = 'red'; // Or manage via CSS classes
            this.htmlElement.classList.add('error-state');
            this.htmlElement.classList.remove('ok-state');
        } else {
            this.htmlElement.style.borderColor = 'green';
            this.htmlElement.classList.remove('error-state');
            this.htmlElement.classList.add('ok-state');
        }
        // this.updateSize() is not a standard HtmlAppNode method.
        // If content changes affect required size, and that size is dynamic,
        // the node might need to emit an event or the graph might need to poll.
        // Typically, HtmlAppNode instances have fixed width/height from this.data.
    }

    // onDataUpdate is called when graph.updateNodeData() changes this.data
    onDataUpdate(updatedData) {
        // super.onDataUpdate(updatedData); // For HtmlAppNode's base handling (e.g. width, height, backgroundColor)

        if (updatedData.hasOwnProperty('value')) {
            // this.data.value is already updated by the SpaceGraph core.
            this.updateVisualsBasedOnData();
        }
        // Add reactions to other data changes as needed
        // if (updatedData.hasOwnProperty('label')) { ... }
    }
}
// Example usage:
// graph.registerNodeType('data-driven', {
//   nodeClass: DataDrivenNode,
//   getDefaults: (node) => ({
//     width: 150, height: 80, label: 'Data Node', value: 0,
//     backgroundColor: 'var(--node-bg-alt)'
//   })
// });
// const myDataNode = graph.addNode({ type: 'data-driven', id: 'dd1', data: { value: 5 }});
// graph.updateNodeData('dd1', { value: 15 }); // This will trigger onDataUpdate
//
// Alternative to direct call from outside:
// const nodeInstance = graph.getNode('myDataNode'); // Get BaseNode
// if (nodeInstance && nodeInstance.appNode instanceof DataDrivenNode) { // appNode is your custom class instance
//    // To trigger update, modify data through graph method:
//    graph.updateNodeData(nodeInstance.id, { value: 15 });
// }
// To call it from outside:
const nodeInstance = graph.getNode('myDataNode'); // Get BaseNode
if (nodeInstance && nodeInstance.appNode instanceof DataDrivenNode) { // appNode is your custom class instance
    nodeInstance.appNode.updateVisuals(15);
}
```

### 2. Styling ShapeNode Instances

`ShapeNode` instances are WebGL objects. Their appearance (color, opacity, size) is controlled by their material properties and geometry parameters.

**a. Initial Styling:**

Set properties when adding the node:
```javascript
graph.addNode({
    type: 'shape',
    id: 'shape-node-1',
    shape: 'box',        // 'sphere', 'cylinder', etc.
    label: 'My Box',
    x: -100, y: -100,
    color: 0xff0000,     // Red (hexadecimal color value)
    opacity: 0.75,       // Slightly transparent (0 to 1)
    size: 60             // Size (e.g., cube side length, sphere radius)
});
```

**b. Dynamically Changing ShapeNode Styles:**

You can access the `ShapeNode` instance and modify its underlying Three.js mesh material.

```javascript
const baseNode = graph.getNode('shape-node-1'); // This gets the BaseNode wrapper
if (baseNode && baseNode.shapeNode && baseNode.shapeNode.mesh) { // .shapeNode is the ShapeNode instance
    const material = baseNode.shapeNode.mesh.material;

    // Change color
    material.color.setHex(0x00ff00); // Green

    // Change opacity
    material.opacity = 0.5;
    material.transparent = true; // Must be true for opacity < 1 to take effect

    // Change size (by scaling the mesh)
    // baseNode.shapeNode.mesh.scale.set(1.2, 1.2, 1.2); // Scales the mesh by 20%
    // Note: For more complex size changes or if you need accurate physics/bounds,
    // it might be better to update the node's config and have SpaceGraph rebuild it,
    // or use a dedicated setSize method if available on ShapeNode.
    // For now, direct scale is shown.

    graph.requestRender(); // Ensure scene re-renders
}
```
**Important:**
- When changing `opacity` to a value less than 1, `material.transparent` must be `true`.
- If changing back to fully opaque, you might set `material.transparent = false` for performance, though not strictly necessary.
- `ShapeNode` might offer helper methods like `setColor(hexColor)` or `setOpacity(value)` which handle these details. Check its class definition. If such methods exist, prefer them.

### 3. Styling Edges

Edges are typically lines rendered with WebGL. Their style includes color, thickness, and opacity.

**a. Initial Styling:**

Set properties when adding an edge:
```javascript
graph.addEdge(nodeA, nodeB, { // nodeA and nodeB are BaseNode instances or their IDs
    id: 'edge-1',
    color: 0x00ffff,    // Cyan
    thickness: 3,       // Thickness of the line (see note below)
    opacity: 0.8        // Slightly transparent
});
```

**b. Dynamically Changing Edge Styles:**

Access the edge object and modify its properties. This usually means changing the material of the Three.js line object.

```javascript
const edge = graph.getEdge('edge-1');
if (edge && edge.line && edge.line.material) { // edge.line is the Three.js Line object
    const material = edge.line.material;

    // Change color
    material.color.setHex(0xff00ff); // Magenta

    // Change opacity
    material.opacity = 0.5;
    material.transparent = true; // For opacity < 1

    // Change thickness (see note below)
    // material.linewidth = 5; // If using THREE.LineMaterial
    // If using LineBasicMaterial, this has limitations.

    graph.requestRender(); // Request a scene re-render
}
```
**Note on Edge Thickness:**
- Standard `THREE.LineBasicMaterial` `linewidth` property is not guaranteed to work for values greater than 1 across all platforms/drivers due to WebGL limitations.
- If `spacegraph.js` uses `THREE.Line2` with `THREE.LineMaterial` (from Three.js examples/jsm/lines), then `material.linewidth` (in world units) can be effectively changed.
- If a method like `edge.setThickness(value)` exists, it would be the preferred way. If not, and `LineBasicMaterial` is used, dynamic thickness changes are tricky. Re-creating the edge or using custom shaders might be needed for robust dynamic thickness.

### 4. Custom Hover and Selected Visual Feedback

SpaceGraph.js has default hover and selection behaviors (e.g., an emissive color change for shapes, or specific CSS classes for HTML nodes). You can customize or augment this.

**a. For HTML Nodes (using CSS):**

SpaceGraph typically adds CSS classes like `sg-hovered` or `sg-selected` to the main element of an HTML node (`HtmlNode.element`). You can define styles for these.

*In your CSS:*
```css
.custom-html-node.sg-hovered { /* Assuming .custom-html-node is your node's class */
    box-shadow: 0 0 15px 5px yellow;
    transform: scale(1.02);
    transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}

.custom-html-node.sg-selected {
    border-color: #ff8c00; /* DarkOrange */
    outline: 3px solid rgba(255, 140, 0, 0.7); /* Pulsating or static outline */
}
```
Verify the exact classes used by SpaceGraph by inspecting elements or checking its documentation/source for `SelectionManager` or `HtmlNode`.

**b. For Shape Nodes & Edges (Programmatic Event Handling):**

Listen to selection/hover events and change properties. You'll need to manage the original state to revert changes.

```javascript
const originalVisuals = new Map(); // To store original properties

// Helper to apply/revert visuals
function setVisualState(graphObject, stateType) { // stateType: 'hover', 'selected', 'default'
    const threeJsObject = graphObject.shapeNode?.mesh || graphObject.line; // For Node or Edge
    if (!threeJsObject) return;

    const material = threeJsObject.material;
    const id = graphObject.id;

    if (stateType === 'default') {
        if (originalVisuals.has(id)) {
            const original = originalVisuals.get(id);
            material.color.setHex(original.color);
            material.opacity = original.opacity;
            // material.linewidth = original.thickness; // For edges with LineMaterial
            originalVisuals.delete(id);
        }
    } else {
        if (!originalVisuals.has(id)) { // Store if not already modified by another state
            originalVisuals.set(id, {
                color: material.color.getHex(),
                opacity: material.opacity,
                // thickness: material.linewidth // For edges with LineMaterial
            });
        }
        // Apply visual changes based on stateType
        if (stateType === 'hover') {
            material.color.setHex(0xffff00); // Yellow for hover
        } else if (stateType === 'selected') {
            material.color.setHex(0x00ff00); // Green for selected
            // For selected, you might also want to make it more opaque or larger
            // material.opacity = 1.0;
        }
    }
    graph.requestRender();
}

// Node Hover
graph.on('nodeHoverEnter', ({ node }) => setVisualState(node, 'hover'));
graph.on('nodeHoverLeave', ({ node }) => {
    // Only revert to default if not also selected
    if (!graph.getSelectionManager().isSelected(node)) {
        setVisualState(node, 'default');
    }
});

// Node Selection
graph.on('nodeSelected', ({ selectedNode, previouslySelectedNode }) => {
    if (previouslySelectedNode) {
        setVisualState(previouslySelectedNode, 'default'); // Revert previous
    }
    if (selectedNode) {
        setVisualState(selectedNode, 'selected'); // Apply selected to current
    }
});

// Similar event handlers for edges: 'edgeHoverEnter', 'edgeHoverLeave', 'edgeSelected'
// graph.on('edgeHoverEnter', ({ edge }) => setVisualState(edge, 'hover'));
// graph.on('edgeHoverLeave', ({ edge }) => { /* similar logic */ });
// graph.on('edgeSelected', ({ selectedEdge, previouslySelectedEdge }) => { /* similar logic */ });

```
**Important Considerations for Programmatic Styling:**
- **Default Behavior**: SpaceGraph's `SelectionManager` applies its own default styles for selection (often an emissive color boost). If you provide your own selection styling via events, you might want to disable or configure the default `SelectionManager` visuals to avoid conflicts. For example:
  ```javascript
  const graph = new SpaceGraph(container, {
      selection: {
          enablePrimaryHoverEffect: true, // Default hover effect on mesh
          enablePrimarySelectionEffect: false, // Disable default emissive effect for selection
          // selectedEmissiveColor: 0x00ff00, // Or change the default color
      }
  });
  ```
- **State Management**: Ensure that hover and selection states interact correctly. For instance, if a node is selected, hovering over it might show a combined effect or prioritize the "selected" look. The example above prioritizes "selected" over "hover" if implemented fully.
- **Reverting State**: Accurately reverting to the original state is crucial. The `originalVisuals` map helps, but complex scenarios (e.g., a node being hovered, then selected, then unhovered but still selected) require careful state logic.

### Summary of Styling Techniques

-   **HTML Nodes**:
    -   Use CSS classes for static and common dynamic styling (e.g., via `element.classList`).
    -   Use inline styles (`element.style`) for highly specific dynamic changes within `HtmlAppNode`.
    -   Remember `this.updateSize()` in `HtmlAppNode` if content changes affect dimensions.
-   **Shape Nodes & Edges (WebGL)**:
    -   Modify properties of their `THREE.Material` (e.g., `color`, `opacity`).
    -   Set `material.transparent = true` for `opacity < 1`.
    -   Dynamic thickness for edges can be tricky; check if `LineMaterial` is used or if helper methods exist.
    -   Always call `graph.requestRender()` after changing WebGL object properties.
-   **Interactions (Hover/Select)**:
    -   Leverage built-in CSS classes (e.g., `sg-hovered`, `sg-selected`) for HTML nodes.
    -   For WebGL objects, use the graph's event system (`nodeHoverEnter`, `nodeSelected`, etc.).
    -   Manage original visual states carefully when applying temporary styles like hover effects.
    -   Be mindful of and configure/disable default interaction visuals in `SelectionManager` if you implement custom ones to prevent conflicts.

This cookbook provides a starting point. The specifics can depend on the exact implementation details within `SpaceGraph.js` (e.g., material types used, specific helper methods on node/edge classes). Always refer to the library's source code or API documentation for precise details.

---
## Creating Complex Layouts

SpaceGraph.js provides a force-directed layout engine by default, which is excellent for many graph visualization tasks. For a conceptual overview of the layout system, see "[Layout](CORE_CONCEPTS.md#6-layout)" in `CORE_CONCEPTS.md`. This section focuses on how to work with and customize layouts.

### 1. Working with the Force-Directed Layout (FDL)

The built-in FDL simulates physical forces to arrange nodes. You can influence its behavior by adjusting parameters on nodes, edges, or the layout engine itself.

**a. Adjusting Parameters:**

Many parameters can be set via the `physics` property in the node or edge configuration, or directly on the layout engine if accessible.

-   **Node `mass`**:
    -   Higher mass makes a node less affected by forces from other nodes, making it move less.
    -   Set via `graph.addNode({ ..., physics: { mass: 2.5 } });`
    -   Or `graph.updateNodeConfig(nodeId, { physics: { mass: 2.5 } });`

-   **Edge `stiffness` (or `springiness`)**:
    -   Controls how strongly an edge tries to maintain its `idealLength`. Higher stiffness means a stronger pull/push.
    -   Set via `graph.addEdge(nodeA, nodeB, { physics: { stiffness: 0.05 } });`

-   **Edge `idealLength` (or `springLength`)**:
    -   The target length for the edge. The FDL will try to make edges reach this length.
    -   Set via `graph.addEdge(nodeA, nodeB, { physics: { idealLength: 150 } });`

-   **Global Layout Parameters (Conceptual - depends on FDL implementation):**
    -   `gravity`: A force pulling nodes towards a central point (e.g., `0,0,0`).
    -   `repulsion` or `chargeStrength`: How strongly nodes repel each other.
    -   `damping`: Reduces oscillation and helps the layout stabilize faster.
    -   These are typically configured when initializing `SpaceGraph` or by accessing the layout engine:
    ```javascript
    const graph = new SpaceGraph(container, {
        layout: {
            type: 'forceDirected', // Ensure FDL is active
            settings: { // These are conceptual names, actual properties may vary
                gravity: -1.0,     // e.g., a weak pull towards center
                repulsionStrength: 100, // How much nodes push each other away (often positive for repulsion)
                defaultSpringStiffness: 0.05,
                defaultSpringLength: 150,
                dampingFactor: 0.75,     // Factor to reduce energy each step
                // ... other FDL specific settings
            }
        }
    });
    ```
    **Note:** The exact names and structure for `layout.settings` will depend on the specific force-directed layout library integrated into SpaceGraph.js (e.g., D3-force, ForceGraphVR, or a custom implementation). Check the `SpaceGraphConfig` options or layout engine documentation.

**b. Controlling the Layout Engine:**

The layout engine usually runs in iterations or "ticks."

-   **Running the Layout:**
    -   The FDL might start automatically when nodes are added or when `layout.autoStart` is true.
    -   `graph.getLayoutEngine().tick()`: (Or `runOnce()`, `step()`) Runs a single iteration (or a few iterations) of the layout. Useful for step-by-step refinement.
    -   `graph.getLayoutEngine().start()`: Starts or resumes continuous layout updates (often by setting an internal "active" state and using `requestAnimationFrame`).
    -   `graph.getLayoutEngine().stop()`: Pauses the continuous layout.
    -   `graph.getLayoutEngine().alpha(0.1)`: (If using a D3-like engine) Sets the simulation's "alpha" or "heat," influencing how much change occurs per tick. `reheat()` might also be a method.

    ```javascript
    // Example: Add nodes, then manually step the layout
    nodes.forEach(nodeData => graph.addNode(nodeData));
    edges.forEach(edgeData => graph.addEdge(edgeData.source, edgeData.target, edgeData));

    const layoutEngine = graph.getLayoutEngine(); // Assuming such a getter exists
    if (layoutEngine && layoutEngine.settings.type === 'forceDirected') { // Check type from settings
        layoutEngine.stop(); // Ensure it's not running continuously if you want to control steps
        for (let i = 0; i < 100; i++) { // Run 100 iterations
            layoutEngine.tick();
        }
        console.log("Layout iterations complete.");
        graph.requestRender(); // Ensure final positions are rendered
    }
    ```
-   **Pinning Nodes:**
    -   You can "pin" nodes to fixed positions, excluding them from FDL calculations.
    -   When adding a node: `graph.addNode({ id: 'pinned-node', x: 0, y: 0, z: 0, fixed: true });`
    -   Dynamically: `graph.pinNode('pinned-node', true, { x: 10, y: 20, z: 30 });` or by setting `node.isFixed = true` (or `node.fixed = true`) and `node.setPosition(x,y,z)`. The FDL should then respect this. Check the specific property (`fixed` or `isFixed`) used by the layout engine.

### 2. Implementing Custom Layouts

For full control or specific visual patterns, you can implement your own layout algorithms.

**a. Disabling Force-Directed Layout:**

First, ensure the default FDL is not interfering.

-   **Option 1: Configure at Initialization:**
    ```javascript
    const graph = new SpaceGraph(container, {
        layout: {
            type: 'manual' // Or 'none', 'predefined' - check SpaceGraph options
                           // Or simply omit the layout config if 'manual' is the default
                           // when no explicit layout type is specified.
        }
    });
    ```
-   **Option 2: Stop the Engine (if already initialized with FDL):**
    ```javascript
    const layoutEngine = graph.getLayoutEngine();
    if (layoutEngine && layoutEngine.settings.type === 'forceDirected') {
        layoutEngine.stop();
        // You might also want to set layoutEngine.settings.type = 'manual';
    }
    ```

**b. Applying Node Positions:**

Once you calculate `x, y, z` coordinates for your nodes, apply them.

```javascript
function applyCustomLayout(graph, nodePositions) {
    // nodePositions is an object like: { nodeId1: {x, y, z}, nodeId2: {x, y, z}, ... }
    Object.keys(nodePositions).forEach(nodeId => {
        const pos = nodePositions[nodeId];
        const node = graph.getNode(nodeId); // Gets the BaseNode
        if (node) {
            // Update the node's target position. The graph rendering loop should pick this up.
            // Or, if direct manipulation is needed:
            // node.object3D.position.set(pos.x, pos.y, pos.z);
            // A more common way if nodes have their own position properties:
            // node.x = pos.x; node.y = pos.y; node.z = pos.z;
            // Best practice is often to use a graph method that handles updates:
            graph.updateNodeConfig(nodeId, { x: pos.x, y: pos.y, z: pos.z, fixed: true });
            // Setting fixed:true can be important if an FDL is technically still present but idle,
            // to prevent it from trying to move the node later.
        }
    });
    graph.requestRender(); // Ensure changes are drawn
    // graph.centerView();   // Optionally, adjust camera after layout
}
```
**Note:** The exact method to update a node's position (`node.object3D.position.set`, direct property assignment `node.x=...`, or `graph.updateNodeConfig`) depends on SpaceGraph's API and its internal update mechanisms. `updateNodeConfig` or a dedicated `node.setPosition(x,y,z)` is generally safer.

**c. Custom Layout Examples (Conceptual Functions):**

These are simplified examples. Real implementations would need more robust handling of node sizes, graph structures, existing node positions for smooth transitions, etc.

**i. Grid Layout:**

Arranges nodes in a grid.
```javascript
function calculateGridLayout(nodeIds, columns, cellWidth, cellHeight, cellDepth = 0) {
    const positions = {};
    nodeIds.forEach((nodeId, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        positions[nodeId] = {
            x: col * cellWidth + (cellWidth / 2), // Centering in cell
            y: row * cellHeight + (cellHeight / 2),
            z: 0 // Or (row * cellDepth) for a 3D grid tilted in Z
        };
    });
    return positions;
}

// Usage:
// const allNodeIds = graph.getAllNodes().map(n => n.id);
// const gridPositions = calculateGridLayout(allNodeIds, 5, 200, 150); // 5 columns
// applyCustomLayout(graph, gridPositions);
```

**ii. Basic Tree Layout (Hierarchical):**

A very simple top-down tree. Assumes you can determine parent-child relationships.
```javascript
function calculateTreeLayout(rootNodeId, graphInstance, xSpacing = 200, ySpacing = 150, zSpacing = 50) {
    const positions = {};
    const visited = new Set();

    function layoutNode(nodeId, x, y, depth) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        positions[nodeId] = { x, y, z: depth * zSpacing };

        const childrenIds = graphInstance.getEdges(nodeId)
            .filter(edge => edge.source.id === nodeId || edge.source === nodeId) // Edge source can be ID or object
            .map(edge => edge.target.id || edge.target); // Edge target can be ID or object
            // Alternative: if your graph structure is predefined (e.g. node.children array)

        let currentX = x - ((childrenIds.length - 1) * xSpacing) / 2;
        childrenIds.forEach(childId => {
            if (!visited.has(childId)) {
                layoutNode(childId, currentX, y + ySpacing, depth + 1);
                currentX += xSpacing;
            }
        });
    }

    const rootNode = graphInstance.getNode(rootNodeId);
    if (rootNode) {
        layoutNode(rootNodeId, 0, 0, 0); // Start layout from the root
    }
    return positions;
}

// Usage:
// const rootId = 'root-node'; // Determine your root node
// const treePositions = calculateTreeLayout(rootId, graph);
// applyCustomLayout(graph, treePositions);
```
**Note:** This is a naive tree layout. Libraries like D3-Hierarchy offer much more sophisticated tree/hierarchy layout algorithms (e.g., Reingold-Tilford) that handle varying subtree sizes and produce more aesthetically pleasing results.

**iii. Circular Layout:**

Arranges nodes in a circle.
```javascript
function calculateCircularLayout(nodeIds, centerX, centerY, centerZ, radius) {
    const positions = {};
    const angleStep = (2 * Math.PI) / nodeIds.length;

    nodeIds.forEach((nodeId, index) => {
        const angle = index * angleStep;
        positions[nodeId] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
            z: centerZ
        };
    });
    return positions;
}

// Usage:
// const allNodeIds = graph.getAllNodes().map(n => n.id);
// const circularPositions = calculateCircularLayout(allNodeIds, 0, 0, 0, 400); // Centered at (0,0,0) with radius 400
// applyCustomLayout(graph, circularPositions);
```

**d. Considerations for Custom Layouts:**

-   **Node Sizes**: Your layout logic might need to account for the actual dimensions of nodes to prevent overlaps, especially for HTML nodes. You might fetch node sizes (`node.getWidth()`, `node.getHeight()`, `node.getDepth()`) before or during layout.
-   **2D vs. 3D**: Adapt calculations for the Z-axis if creating 3D layouts. The examples above are mostly 2.5D (layout in XY, Z by depth or fixed).
-   **Performance**: For large graphs, layout calculations can be slow. Consider optimizing your algorithms or using Web Workers for complex computations if the UI thread is blocked for too long.
-   **Transitions**: To make layout changes smooth, you could animate nodes from their old positions to new positions. This involves:
    1.  Getting current positions.
    2.  Calculating target positions.
    3.  Using an animation library (like GSAP, if integrated or available globally) or a custom animation loop to interpolate positions over time, calling `graph.updateNodeConfig()` or `node.setPosition()` and `graph.requestRender()` on each frame of the animation.
    ```javascript
    // Conceptual animation snippet with GSAP (if available)
    // Object.keys(newPositions).forEach(nodeId => {
    //     const node = graph.getNode(nodeId);
    //     const targetPos = newPositions[nodeId];
    //     if (node && node.object3D) { // Assuming node.object3D is the Three.js object
    //         gsap.to(node.object3D.position, {
    //             x: targetPos.x,
    //             y: targetPos.y,
    //             z: targetPos.z,
    //             duration: 0.8, // Animation duration in seconds
    //             onUpdate: () => graph.requestRender() // Keep rendering during animation
    //         });
    //     }
    // });
    ```

By disabling or carefully managing the default FDL and applying calculated positions, you gain complete control over the spatial arrangement of your graph elements. This allows for domain-specific visualizations and highly structured diagrams.

---
## Integrating with External Data Sources

Visualizing data often means loading it from external APIs, local files, or databases. SpaceGraph.js can be populated dynamically from such sources. JSON is a common format for this data.

### 1. Fetching Data

JavaScript's `fetch` API is standard for retrieving data.

**a. Fetching from a Remote API (JSON):**

```javascript
async function fetchDataFromAPI(apiUrl) {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); // Assumes the API returns JSON
        return data;
    } catch (error) {
        console.error("Could not fetch data from API:", error);
        // Consider displaying an error message to the user in the HUD or a modal
        // if (graph && graph.getHUD) graph.getHUD().addMessage(`Error fetching data: ${error.message}`, 'error');
        return null; // Or rethrow, or return a default structure
    }
}

// Example Usage:
// const API_URL = 'https://jsonplaceholder.typicode.com/users'; // Example public API
// fetchDataFromAPI(API_URL).then(apiData => {
//     if (apiData) {
//         // Assuming apiData is an array of user objects, adapt to your graph structure
//         // For example, if we want to create a node for each user:
//         const graphData = {
//             nodes: apiData.map(user => ({ id: `user-${user.id}`, label: user.name, type: 'note', content: `Email: ${user.email}` })),
//             edges: [] // No edges in this specific example, but you might derive them
//         };
//         populateGraphFromData(graph, graphData);
//     }
// });
```

**b. Loading from a Local JSON File:**

Place your JSON file (e.g., `data.json`) in a location accessible by your web server (e.g., in the same directory as your HTML or a `./data/` subdirectory).

```javascript
async function loadLocalData(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Could not load local file! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Could not load local data:", error);
        return null;
    }
}

// Example Usage:
// loadLocalData('./data/my-graph-data.json').then(localData => {
//     if (localData) {
//         populateGraphFromData(graph, localData);
//     }
// });
```

**c. Common Data Formats (JSON):**

A typical JSON structure for graph data might look like:

```json
{
    "nodes": [
        { "id": "node1", "label": "Node 1", "type": "note", "content": "Info for node 1", "x": 0, "y": 0 },
        { "id": "node2", "label": "Node 2", "type": "shape", "shape": "sphere", "color": "blue", "size": 30 },
        { "id": "node3", "label": "Node 3", "appData": { "value": 123, "category": "A" } }
    ],
    "edges": [
        { "id": "edge1", "source": "node1", "target": "node2", "label": "Connects to" },
        { "id": "edge2", "source": "node2", "target": "node3", "physics": { "stiffness": 0.1 } }
    ]
}
```
Adapt this structure based on your needs. Ensure `id` fields are unique for nodes and edges respectively. `appData` is a good place to store arbitrary data associated with nodes/edges that your application logic might use.

### 2. Populating the Graph from Data

Once data is fetched, iterate through it to create nodes and edges.

```javascript
function populateGraphFromData(graph, data) {
    if (!data || !data.nodes || !data.edges) {
        console.error("Invalid data structure for graph population. Expected { nodes: [], edges: [] }.");
        return;
    }

    // graph.clearAll(); // Optional: Clear existing graph elements if this is a full refresh

    // Add nodes
    data.nodes.forEach(nodeData => {
        const config = {
            id: nodeData.id,
            label: nodeData.label,
            type: nodeData.type || 'shape', // Default type if not specified
            x: nodeData.x, y: nodeData.y, z: nodeData.z, // Initial positions (optional)
            content: nodeData.content,   // For 'note' type
            shape: nodeData.shape,       // For 'shape' type
            color: nodeData.color,       // For 'shape' type
            size: nodeData.size,         // For 'shape' type
            className: nodeData.className, // For HTML-based nodes
            physics: nodeData.physics,   // e.g., { mass: 2 }
            appData: nodeData.appData || {} // Store any other arbitrary data
        };
        // Remove undefined properties to avoid overriding SpaceGraph defaults unintentionally
        Object.keys(config).forEach(key => config[key] === undefined && delete config[key]);
        graph.addNode(config);
    });

    // Add edges
    data.edges.forEach(edgeData => {
        const sourceNode = graph.getNode(edgeData.source); // Source node ID
        const targetNode = graph.getNode(edgeData.target); // Target node ID

        if (sourceNode && targetNode) {
            const config = {
                id: edgeData.id,
                label: edgeData.label,
                color: edgeData.color,
                thickness: edgeData.thickness,
                physics: edgeData.physics, // e.g., { stiffness: 0.05, idealLength: 100 }
                appData: edgeData.appData || {}
            };
            Object.keys(config).forEach(key => config[key] === undefined && delete config[key]);
            graph.addEdge(sourceNode, targetNode, config);
        } else {
            console.warn(`Could not create edge "${edgeData.id || ''}": source "${edgeData.source}" or target "${edgeData.target}" node not found.`);
        }
    });

    // graph.getLayoutEngine()?.start(); // Or .tick() if you manage layout steps
    graph.centerView(); // Adjust camera to see the newly populated graph
    graph.requestRender();
}
```

### 3. Handling Data Updates

Data can change over time. You might need to update the graph.

**a. Full Graph Refresh:**

The simplest strategy: clear the graph and repopulate it. Best for small datasets or infrequent updates.

```javascript
async function refreshGraphWithNewData(graph, dataProviderFn) { // dataProviderFn is e.g., fetchDataFromAPI
    const newData = await dataProviderFn();
    if (newData) {
        graph.clearAll(); // Clears all nodes and edges
        populateGraphFromData(graph, newData);
    }
}

// Example: Periodically fetch and refresh:
// setInterval(() => refreshGraphWithNewData(graph, () => fetchDataFromAPI(API_URL)), 30000);
```
This is straightforward but can be disruptive as the entire graph rebuilds, losing current layout and selection states.

**b. Differential/Incremental Updates:**

A more sophisticated approach is to update only what has changed. This preserves graph state and is more performant for large, dynamic datasets.

```javascript
async function performIncrementalUpdate(graph, newData) {
    if (!newData || !newData.nodes || !newData.edges) {
        console.error("Invalid data for incremental update.");
        return;
    }

    const currentNodes = new Map(graph.getAllNodes().map(n => [n.id, n]));
    const currentEdges = new Map(graph.getAllEdges().map(e => [e.id, e])); // Assumes edges have unique IDs

    const dataNodes = new Map(newData.nodes.map(n => [n.id, n]));
    const dataEdges = new Map(newData.edges.map(e => [e.id, e])); // Assumes edges have unique IDs

    // 1. Remove nodes that are no longer in the new data
    currentNodes.forEach((node, id) => {
        if (!dataNodes.has(id)) {
            graph.removeNode(id);
        }
    });

    // 2. Remove edges that are no longer in the new data
    // (Do this after node removal to handle edges connected to removed nodes, or before node additions if IDs clash)
    currentEdges.forEach((edge, id) => {
        if (!dataEdges.has(id)) {
            graph.removeEdge(id); // Or graph.removeEdge(edge) if the API expects the object
        }
    });

    // 3. Add new nodes and update existing ones
    newData.nodes.forEach(nodeData => {
        const nodeConfig = { /* ... map nodeData to config as in populateGraphFromData ... */
            id: nodeData.id, label: nodeData.label, type: nodeData.type,
            x: nodeData.x, y: nodeData.y, z: nodeData.z,
            content: nodeData.content, shape: nodeData.shape, color: nodeData.color,
            size: nodeData.size, className: nodeData.className, physics: nodeData.physics,
            appData: nodeData.appData || {}
        };
        Object.keys(nodeConfig).forEach(key => nodeConfig[key] === undefined && delete nodeConfig[key]);

        if (currentNodes.has(nodeData.id)) {
            // Node exists, update it
            graph.updateNodeConfig(nodeData.id, nodeConfig);
            // Or, if only appData changed and your HtmlAppNode handles it:
            // graph.updateNodeData(nodeData.id, nodeConfig.appData);
        } else {
            // New node, add it
            graph.addNode(nodeConfig);
        }
    });

    // 4. Add new edges and update existing ones
    newData.edges.forEach(edgeData => {
        const edgeConfig = { /* ... map edgeData to config ... */
            id: edgeData.id, label: edgeData.label, color: edgeData.color,
            thickness: edgeData.thickness, physics: edgeData.physics,
            appData: edgeData.appData || {}
        };
        Object.keys(edgeConfig).forEach(key => edgeConfig[key] === undefined && delete edgeConfig[key]);

        if (currentEdges.has(edgeData.id)) {
            // Edge exists, update it
            graph.updateEdgeConfig(edgeData.id, edgeConfig);
        } else {
            // New edge, add it
            const sourceNode = graph.getNode(edgeData.source);
            const targetNode = graph.getNode(edgeData.target);
            if (sourceNode && targetNode) {
                graph.addEdge(sourceNode, targetNode, edgeConfig);
            } else {
                console.warn(`Skipping new edge: source or target not found for edge data:`, edgeData);
            }
        }
    });

    graph.requestRender();
    // Consider if layout needs a nudge after updates
    // graph.getLayoutEngine()?.kick?.(0.1); // Example: slightly "heat" the layout
}
```
**Note on `updateNodeData` vs `updateNodeConfig`:**
-   `graph.updateNodeData(nodeId, data)`: Primarily for updating custom data within `node.data` (often referred to as `appData` in examples). If your `HtmlAppNode`'s `onDataUpdate` method (see [HtmlAppNode Tutorial](TUTORIAL_HTML_APP_NODE.md)) reacts to these changes, this can trigger a visual update.
-   `graph.updateNodeConfig(nodeId, config)`: More comprehensive. Use this if core visual properties (label, color, size), position, or physics properties change. This method will typically ensure the node is correctly re-rendered with all changes.
-   Similar considerations apply to `graph.updateEdgeData()` vs `graph.updateEdgeConfig()`.

### 4. Basic Error Handling in Fetch

The `fetch` API uses Promises, making error handling straightforward with `.then().catch()`.

```javascript
fetch('https://api.example.com/faulty-endpoint') // Or a local file path
    .then(response => {
        if (!response.ok) {
            // For HTTP errors (like 404, 500), response.ok is false
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }
        return response.json(); // Attempt to parse response as JSON
    })
    .then(data => {
        console.log("Data fetched successfully:", data);
        // populateGraphFromData(graph, data);
    })
    .catch(error => {
        console.error('Fetch operation failed:', error.message);

        // Display a user-friendly error message in the application
        const hud = graph.getHUD ? graph.getHUD() : null; // Check if HUD is available
        if (hud && hud.addMessage) {
             hud.addMessage(`Error loading data: ${error.message}`, 'error', 5000); // Show for 5 seconds
        } else {
            alert(`Error loading data: ${error.message}`); // Fallback to simple alert
        }

        // Specific error types:
        // - Network errors (e.g., DNS failure, server unreachable): Usually a TypeError with 'Failed to fetch'.
        // - HTTP errors (4xx, 5xx status codes): Caught by `!response.ok`.
        // - JSON parsing errors: If `response.json()` fails because the body isn't valid JSON.
    });
```
Robust error handling might also involve:
-   **Retrying failed requests**: Implement a retry mechanism, possibly with exponential backoff, for transient network issues.
-   **User feedback**: Clearly indicate to the user that data loading failed and why, if possible.
-   **Graceful degradation**: If some data fails to load, perhaps the application can still function in a limited capacity.
-   **Input validation**: After fetching, validate the structure of the received data before trying to populate the graph to prevent errors during rendering.

By implementing these strategies, you can build robust SpaceGraph.js applications that effectively integrate with various external data sources.

---
## Performance Optimization Tips

As your SpaceGraph.js visualizations grow in complexity and scale, performance can become a critical concern. Here are some tips to help you optimize your application.

### a. General Considerations

-   **Node and Edge Count:**
    -   The sheer number of nodes and edges is often the biggest factor. More elements mean more objects to manage, render, and include in layout calculations.
    -   Strive to display only essential information. Consider aggregation or summarization techniques for very large datasets, allowing users to drill down into details on demand.
-   **Complexity of Node Content:**
    -   **HTML Nodes (`HtmlNodeElement`, `HtmlAppNode`):** Rich HTML content with many DOM elements, complex CSS, or frequent updates can be costly as they involve browser rendering overhead for each node (CSS calculations, layout, painting). For creating custom HTML nodes, refer to the "[Creating Custom Nodes](CORE_CONCEPTS.md#3-creating-custom-nodes-the-new-system)" section in `CORE_CONCEPTS.md` and the detailed [HtmlAppNode Tutorial](TUTORIAL_HTML_APP_NODE.md).
    -   **Shape Nodes (`ShapeNode`):** These are generally more performant for large numbers of simple visual markers as they are rendered directly by WebGL. `ShapeNode` is one of the [legacy built-in types](CORE_CONCEPTS.md#2-main-classes-and-their-roles).
    -   Choose the node type that balances visual richness with performance needs. For thousands of elements, prefer `ShapeNode`s or very simple HTML nodes.

### b. Rendering Performance

-   **Choose Efficient Node Types:**
    -   For simple representations (dots, boxes, spheres with basic labels), `ShapeNode` (see [Core Concepts](CORE_CONCEPTS.md#2-main-classes-and-their-roles)) is usually faster than HTML-based nodes.
    -   If using HTML nodes (like custom `HtmlAppNode` subclasses, see [tutorial](TUTORIAL_HTML_APP_NODE.md)), keep their DOM structure as simple as possible. Minimize nested elements and complex CSS selectors. Each HTML node is essentially a separate "web page" managed by the browser, positioned in 3D space.
-   **Simplify HTML Structure:**
    -   For `HtmlAppNode` or the built-in `NoteNode`, use minimal HTML. Avoid deeply nested structures or overly complex CSS (e.g., multiple layers of transparency, complex box shadows on many nodes).
    -   Use efficient CSS properties. `transform` and `opacity` are generally well-optimized by browsers. Heavy CSS like `filter: blur()` can be slow if applied to many nodes.
-   **Manage Billboarding:**
    -   Billboarding (where nodes always face the camera) is useful for readability of HTML content but adds computational overhead as node orientations must be updated each frame relative to the camera.
    -   If billboarding is not essential for certain nodes (e.g., 3D shape nodes that should have a fixed orientation in the scene, or HTML nodes that are part of a larger, fixed structure), you can disable it.
    -   This is typically a property of the node or its view component:
        ```javascript
        // Example: Disabling billboarding for an HTML node
        // This depends on the specific API of HtmlNode or its base classes.
        // graph.updateNodeConfig('my-node-id', { billboard: false });
        // Or, if accessible on the node's view object:
        // const node = graph.getNode('my-node-id');
        // if (node && node.htmlNode) node.htmlNode.billboard = false; // Hypothetical direct access
        ```
    -   Consult the API documentation for `HtmlNode` and `ShapeNode` for the correct way to control billboarding if it's a configurable option. If not directly configurable, it might be a default behavior you can't easily change without modifying the library.
-   **Virtualizing Off-Screen Elements (Conceptual):**
    -   For extremely large graphs, a common technique is to only render/process elements currently in or near the viewport (virtualization or culling).
    -   Three.js (used by SpaceGraph for WebGL rendering) has **frustum culling** built-in for WebGL objects like `ShapeNode`s. This means objects outside the camera's view cone are not rendered by the GPU, which is a major performance save.
    -   However, for **HTML nodes**, their DOM elements still exist in the page and consume browser resources (memory, layout calculations) even if they are positioned "off-screen" in the 3D view.
    -   Implementing true virtualization for HTML nodes (e.g., detaching their DOM elements when far off-screen and re-attaching when they come into view) is an advanced optimization and not typically a built-in feature of libraries that mix WebGL and HTML like this. It would require custom logic.

### c. Layout Performance

The principles of the Force-Directed Layout (FDL) are described in `CORE_CONCEPTS.md` under "[Layout](CORE_CONCEPTS.md#6-layout)". Here's how to optimize its performance:

-   **Adjust Force-Directed Layout (FDL) Parameters:**
    -   A "stiffer" graph (higher edge `stiffness`, appropriate `idealLength`) might stabilize faster but can be computationally more intensive per tick and may oscillate more.
    -   Lowering the number of `iterations` (if the FDL runs for a fixed number) or increasing `dampingFactor` can help the layout settle sooner, consuming less CPU over time.
    -   Some FDLs allow adjusting a `quality` setting (e.g., 'draft' vs. 'production') which might use simpler (faster) or more complex (slower) physics calculations.
    -   `graph.getLayoutEngine().settings.quality = 'draft'` (if available).
-   **Stop the Layout Engine:**
    -   Once the graph has reached a visually stable or desired state, explicitly stop the FDL to prevent further calculations:
        ```javascript
        const layoutEngine = graph.getLayoutEngine();
        if (layoutEngine && layoutEngine.stop) { // Ensure method exists
            layoutEngine.stop();
            console.log("Layout engine stopped to conserve resources.");
        }
        ```
    -   This is crucial for conserving CPU and battery, especially when no new nodes are being added or user interaction isn't expected to change the layout.
-   **Simpler Layouts for Large Graphs:**
    -   FDLs can become very slow with thousands of nodes and edges due to their O(N^2) or O(N log N) complexity for repulsion forces.
    -   For very large graphs, consider:
        -   Using pre-calculated layouts (positions computed offline).
        -   Implementing simpler, faster algorithms (e.g., grid, circular, basic tree, or spatial partitioning layouts described in "Creating Complex Layouts").
        -   Running the FDL initially for a short period to get a reasonable arrangement, then stopping it and using the resulting positions as fixed.

### d. Data Handling Performance

-   **Differential Updates:**
    -   As emphasized in "Integrating with External Data Sources," always prefer incremental/differential updates over full graph refreshes when the underlying data changes. Rebuilding the entire graph is expensive.
-   **Debounce or Throttle Frequent Updates:**
    -   If your application receives data updates at a very high frequency (e.g., from real-time WebSocket streams), avoid updating the graph on every single message.
    -   **Debouncing:** Update the graph only after a certain period of inactivity. (e.g., user stops typing, or a burst of messages ends).
    -   **Throttling:** Update the graph at most once per specified interval (e.g., every 200-500ms), batching intermediate changes.
    ```javascript
    // Conceptual debounce for processing a batch of updates
    let updateBatch = [];
    let debounceTimeout;
    function handleIncomingData(newItem) {
        updateBatch.push(newItem);
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            // Assuming performIncrementalUpdate can handle a batch or you adapt it
            performIncrementalUpdate(graph, convertBatchToGraphData(updateBatch));
            updateBatch = [];
        }, 500); // Process if no new data for 500ms
    }
    function convertBatchToGraphData(batch) { /* ... process batch into nodes/edges structure ... */ return { nodes:[], edges:[]}; }
    ```

### e. Memory Management

-   **Proper Cleanup of Elements:**
    -   When removing elements, always use `graph.removeNode(nodeId)` and `graph.removeEdge(edgeId_or_edgeObject)`. These methods are responsible for cleaning up associated WebGL objects (geometries, materials, textures), DOM elements (for HTML nodes), and internal data structures, preventing memory leaks.
    -   If you've attached custom event listeners directly to node elements or are managing external resources tied to a node/edge (outside of `appData`), ensure you clean them up manually when the node/edge is removed (e.g., by subscribing to `nodeRemoved` or `edgeRemoved` events).
-   **`appData` / `node.data` Usage:**
    -   Be mindful of storing very large objects or deeply nested data directly in `node.appData` (or `node.data` if the library uses that term). While flexible, this data is held in JavaScript memory for each node/edge.
    -   If nodes need access to large, shared datasets, consider storing that data in a separate data store and providing nodes only with IDs or references to query the data when needed (e.g., upon selection or for display in a detail panel). Avoid duplicating large amounts of data across many nodes if it can be referenced.

### f. Interaction Performance

-   **Simplify Hover/Selection Effects:**
    -   Complex visual changes on hover (e.g., intricate animations, adding/removing many DOM elements for HTML nodes) can be slow if many nodes are hovered over rapidly. This is especially true for HTML nodes due to browser reflows/repaints.
    -   Prefer lightweight effects:
        -   For HTML nodes: CSS class toggles for simple style changes (color, border, minimal box-shadow).
        -   For Shape nodes: Modifying material properties like `color`, `emissive`, or `opacity` is generally efficient. Simple scaling transforms are also usually okay.
-   **Efficient Event Handling:**
    -   If you attach many custom event listeners, especially for frequent events like `mousemove` (which might be used for custom hover logic or continuous raycasting outside of the library's built-in picking), ensure your handler functions are highly optimized.
    -   Avoid complex computations or synchronous DOM manipulations directly within high-frequency event handlers. If necessary, debounce or throttle the actions resulting from these events.
    -   Remove event listeners when they are no longer needed, for example, when a custom UI component that listens to graph events is destroyed.

By profiling your application using browser developer tools (Performance and Memory tabs) and selectively applying these tips, you can significantly improve the responsiveness and resource efficiency of your SpaceGraph.js visualizations.
```
