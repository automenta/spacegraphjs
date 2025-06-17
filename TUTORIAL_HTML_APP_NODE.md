# Tutorial: Creating Custom HTML Nodes with HtmlAppNode

## 1. Introduction

`HtmlAppNode` is a base class in SpaceGraph designed to simplify the creation of custom, HTML-based nodes. If your custom node needs to display rich HTML content, interactive elements (like forms, buttons), or any DOM structure within the 3D space, `HtmlAppNode` is the recommended starting point.

**Why use `HtmlAppNode`?**

-   **Reduces Boilerplate:** It automates the creation of the main HTML container for your node and applies common base styles (like width, height, background color, and basic flexbox layout).
-   **Provides Structure:** Offers a clear lifecycle (`onInit`, `onDataUpdate`, `onDispose`) for managing your node's HTML content and behavior.
-   **Helper Methods:** Includes convenient helpers for common tasks like accessing child DOM elements and managing event propagation.
-   **Consistency:** Promotes a consistent way of building complex HTML nodes within the SpaceGraph ecosystem.

This tutorial will guide you through the process of creating a new custom node by extending `HtmlAppNode`.

## 2. Prerequisites

Before you begin, you should have a basic understanding of:

-   The core `SpaceGraph` instance and how to initialize it.
-   The concept of nodes and edges in SpaceGraph.
-   How to register a new node type using `SpaceGraph.registerNodeType(typeName, typeDefinition)`.
-   Basic HTML, CSS, and JavaScript.

Familiarity with `CORE_CONCEPTS.md` is recommended.

## 3. Core Concepts of `HtmlAppNode`

### Extending `HtmlAppNode`

To create your custom HTML node, you'll define a JavaScript class that extends `HtmlAppNode`:

```javascript
import { HtmlAppNode } from './js/HtmlAppNode.js'; // Adjust path as needed

class MyCustomNode extends HtmlAppNode {
    // Your custom logic will go here
    constructor(id, initialUserData, typeDefinition, spaceGraphRef) {
        super(id, initialUserData, typeDefinition, spaceGraphRef);
        // HtmlAppNode's constructor handles basic setup.
        // Your onInit() method will be called after this.
    }

    // ... lifecycle methods like onInit, onDataUpdate ...
}
```

### `typeDefinition.typeName` and `typeDefinition.nodeClass`

When you register your new node type with SpaceGraph, your `typeDefinition` object needs two key properties related to `HtmlAppNode`:

1.  **`typeName` (string):** A unique string identifier for your node type (e.g., `'my-custom-node'`). `HtmlAppNode` uses this to automatically add a CSS class (`<typeName>-node`, e.g., `my-custom-node-node`) to your node's main HTML element, allowing for type-specific styling.
2.  **`nodeClass` (class reference):** This must be a reference to your custom class (e.g., `MyCustomNode`). SpaceGraph uses this to instantiate your class when a node of this type is added.

```javascript
const myCustomNodeDefinition = {
    typeName: 'my-custom-node',
    nodeClass: MyCustomNode, // Reference to your class
    getDefaults: (nodeInst) => { /* ... see below ... */ },
    // Other typeDefinition properties (like ports if needed for advanced nodes)
    // No need for onCreate, onUpdate, onDispose here if handled by your class methods
};

// In your main script:
// spaceGraph.registerNodeType('my-custom-node', myCustomNodeDefinition);
```

### `getDefaults` in `typeDefinition`

The `getDefaults` method in your `typeDefinition` is crucial. It provides the initial data for your node instance (`this.data`). `HtmlAppNode` relies on specific properties from `this.data` to set up the node:

-   `width` (number): The width of the node in pixels.
-   `height` (number): The height of the node in pixels.
-   `backgroundColor` (string, CSS color): The background color for the node.
-   `label` (string): A label for the node, often used as a title or fallback content.
-   Any other custom properties your node needs (e.g., `initialCounterValue: 0`, `apiEndpoint: '...'`).

Example `getDefaults`:

```javascript
const myCustomNodeDefinition = {
    typeName: 'my-custom-node',
    nodeClass: MyCustomNode,
    getDefaults: (nodeInst) => ({ // nodeInst is the node instance being created
        width: 250,
        height: 150,
        backgroundColor: 'lightblue',
        label: nodeInst?.id || 'My Custom Node', // Default label using the node's ID
        myCustomProperty: 'initialValue',
        // ... other defaults ...
    }),
};
```
When a node is created (e.g. `space.addNode({ type: 'my-custom-node', label: 'Specific Label' })`), this data is merged with the defaults, and `HtmlAppNode` uses it.

### Automatic `htmlElement` Creation and Base Styling

You **do not** need to create `this.htmlElement` yourself. `HtmlAppNode`'s constructor handles this:

-   It creates a `div` element and assigns it to `this.htmlElement`.
-   It applies `this.data.width`, `this.data.height`, and `this.data.backgroundColor` to this element's style.
-   It adds CSS classes:
    -   `html-app-node` (for general `HtmlAppNode` styling via `index.css`).
    -   `<typeName>-node` (e.g., `my-custom-node-node`) for your specific styles.
-   It sets up basic flexbox styling: `display: flex`, `flex-direction: column`, `overflow: hidden`. This makes it easy to add children that fill the node or stack vertically.

## 4. Key Methods to Implement in Your Subclass

Your custom class (e.g., `MyCustomNode`) will primarily implement these lifecycle methods:

### `onInit()`

-   **Purpose:** This is where you build the internal DOM structure of your node and attach event listeners to your custom elements. It's called by the `HtmlAppNode` constructor after `this.htmlElement` has been created and basic styles have been applied.
-   **Example:**

    ```javascript
    class MyInteractiveNode extends HtmlAppNode {
        myButton = null;
        displayArea = null;

        onInit() {
            // this.htmlElement is already created and styled by HtmlAppNode

            this.htmlElement.innerHTML = `
                <h3>${this.data.label}</h3>
                <div class="my-display">Click the button!</div>
                <button class="my-button">Click Me</button>
            `;

            // Use helpers to get child elements
            this.displayArea = this.getChild('.my-display');
            this.myButton = this.getChild('.my-button');

            // Attach listeners
            this.myButton.addEventListener('click', () => {
                this.displayArea.textContent = 'Button clicked!';
                this.data.clickCount = (this.data.clickCount || 0) + 1; // Update internal data
                this.emit('buttonClicked', { count: this.data.clickCount }); // Emit an event
            });

            // IMPORTANT: Prevent button click from dragging the node
            this.stopEventPropagation(this.myButton, ['pointerdown', 'wheel']);
        }
    }
    ```

### `onDataUpdate(updatedData)`

-   **Purpose:** Called when the node's data is updated externally (e.g., via `spaceGraph.updateNodeData(nodeId, newData)` or through automatic port propagation if you've set up ports). Use this to react to changes in `this.data` and update your node's DOM accordingly.
-   `updatedData` contains only the properties that were changed. `this.data` will have already been updated with these changes before `onDataUpdate` is called.
-   **Example:**

    ```javascript
    // Continuing MyInteractiveNode
    onDataUpdate(updatedData) {
        // HtmlAppNode's base onDataUpdate handles width/height/backgroundColor changes.
        // You can call super.onDataUpdate(updatedData) if you want that behavior,
        // or handle those properties specifically if needed.

        if (updatedData.label !== undefined) {
            const h3 = this.getChild('h3');
            if (h3) h3.textContent = this.data.label;
        }
        if (updatedData.statusMessage !== undefined) {
            this.displayArea.textContent = this.data.statusMessage;
        }
    }
    ```

### `onDispose()`

-   **Purpose:** Called when the node is being removed from the graph. Use this for any custom cleanup specific to your node, such as:
    -   Removing event listeners attached to global objects (e.g., `window`, `document`).
    -   Disposing of complex non-DOM resources your node might have created.
-   **Note:** You usually **don't** need to manually remove child elements from `this.htmlElement` or remove listeners attached to those children. `HtmlAppNode` (via `RegisteredNode`'s `dispose` method) handles removing `this.htmlElement` from the DOM, which typically cleans up its children and their listeners automatically.

    ```javascript
    // Continuing MyInteractiveNode
    onDispose() {
        // Example: If you had added a listener to 'window'
        // window.removeEventListener('my-custom-event', this.myCustomEventHandler);
        console.log(`Node ${this.id} is being disposed.`);
    }
    ```

## 5. Using Helper Methods

`HtmlAppNode` provides several helpful methods:

-   **`this.getChild(selector)`:** Returns the first child element within `this.htmlElement` that matches the CSS `selector`.
    ```javascript
    const myInput = this.getChild('input.my-class');
    ```

-   **`this.getChildren(selector)`:** Returns an array of all child elements within `this.htmlElement` that match the CSS `selector`.
    ```javascript
    const allButtons = this.getChildren('button');
    ```

-   **`this.stopEventPropagation(elementOrSelector, eventTypes = ['pointerdown', 'wheel'])`:**
    Prevents specified DOM events on an internal element from propagating to SpaceGraph's `UIManager`. This is crucial for allowing normal interaction with inputs, buttons, scrollable areas, etc., without accidentally dragging the node or zooming the graph.
    ```javascript
    const myTextArea = this.getChild('textarea');
    this.stopEventPropagation(myTextArea, ['pointerdown', 'wheel', 'keypress']);
    ```

-   **`this.emit(eventName, payload, propagateViaPorts = true)`:**
    Used to emit events from your node. If `eventName` matches a defined output port in `this.data.ports.outputs` and `propagateViaPorts` is true, data is automatically sent to connected input ports on other nodes (triggering their `onDataUpdate`). It also calls any direct listeners (from `listenTo`). See `CORE_CONCEPTS.md` for details on inter-node communication.

## 6. Simple Complete Example: Counter Node

Let's create a basic "Counter" node that displays a number and has "Increment" and "Decrement" buttons.

**a. The `CounterNode` Class (e.g., in `example-app-nodes.html` or its own JS file):**

```javascript
// Ensure HtmlAppNode is imported if in a separate file
// import { HtmlAppNode } from './js/HtmlAppNode.js';

class CounterNode extends HtmlAppNode {
    countDisplay = null;

    onInit() {
        this.data.count = this.data.initialCount || 0; // Initialize count from data or default to 0

        this.htmlElement.innerHTML = `
            <h4>${this.data.label}</h4>
            <div class="count-display" style="font-size: 20px; margin: 10px 0; text-align: center;">
                ${this.data.count}
            </div>
            <div style="display: flex; justify-content: space-around;">
                <button class="increment-btn">Increment</button>
                <button class="decrement-btn">Decrement</button>
            </div>
        `;

        this.countDisplay = this.getChild('.count-display');
        const incrementBtn = this.getChild('.increment-btn');
        const decrementBtn = this.getChild('.decrement-btn');

        incrementBtn.addEventListener('click', () => {
            this.data.count++;
            this.updateDisplay();
            this.emit('countChanged', { nodeId: this.id, newCount: this.data.count });
        });

        decrementBtn.addEventListener('click', () => {
            this.data.count--;
            this.updateDisplay();
            this.emit('countChanged', { nodeId: this.id, newCount: this.data.count });
        });

        // Prevent button clicks from dragging the node
        this.stopEventPropagation(incrementBtn);
        this.stopEventPropagation(decrementBtn);
    }

    updateDisplay() {
        if (this.countDisplay) {
            this.countDisplay.textContent = this.data.count;
        }
    }

    onDataUpdate(updatedData) {
        // super.onDataUpdate(updatedData); // For base class handling like width/height

        if (updatedData.count !== undefined) {
            this.updateDisplay();
        }
        if (updatedData.label !== undefined) {
            const h4 = this.getChild('h4');
            if (h4) h4.textContent = this.data.label;
        }
    }
}
```

**b. The `typeDefinition`:**

```javascript
const counterNodeDefinition = {
    typeName: 'counter', // Will generate 'counter-node' CSS class
    nodeClass: CounterNode,
    getDefaults: (nodeInst) => ({
        width: 200,
        height: 150,
        label: nodeInst?.id || 'Counter',
        initialCount: 0,
        backgroundColor: 'var(--node-bg-default)', // Use global default
        ports: { // Optional: if this counter should output its value
            outputs: { countChanged: { label: 'Count Changed', type: 'object' } }
        }
    }),
};
```

**c. Registering and Adding to Graph:**

```javascript
// Assuming 'space' is your SpaceGraph instance
// Make sure CounterNode class is defined before this line if in the same file.
space.registerNodeType('counter', counterNodeDefinition);

const counter1 = space.addNode({
    type: 'counter',
    id: 'myCounter1',
    label: 'My First Counter',
    data: { initialCount: 10 } // Override default initialCount
});
```

## 7. Styling

-   Your node's root element (`this.htmlElement`) automatically gets the classes `html-app-node` and `<typeName>-node` (e.g., `counter-node`).
-   Use the type-specific class for your primary styling:
    ```css
    /* In a <style> block or your main CSS file */
    .html-app-node.counter-node {
        /* Specific styles for the counter node's root element */
        border: 2px solid purple;
    }
    .counter-node .count-display {
        color: purple;
        font-weight: bold;
    }
    .counter-node button {
        background-color: purple;
        color: white;
        padding: 8px;
        border: none;
        border-radius: 4px;
    }
    .counter-node button:hover {
        background-color: darkorchid;
    }
    ```
-   Refer to global CSS variables in `index.css` for theme consistency.
-   `HtmlAppNode` sets basic properties like `width`, `height`, `backgroundColor` (from `this.data`) and `display: flex`, `flex-direction: column`, `overflow: hidden` on the root element.

## 8. Next Steps / Further Reading

-   **Complex Examples:** Explore `example-app-nodes.html` to see how `MarkdownEditorNode` and `TaskListNode` are built using `HtmlAppNode`.
-   **Core Concepts:** For a deeper understanding of event handling, ports, and inter-node communication, refer to `CORE_CONCEPTS.md`.
-   **Styling:** Consult `index.css` for global styling patterns and CSS variables.

By using `HtmlAppNode`, you can create sophisticated, interactive HTML-based nodes more efficiently and with a more organized structure.
```
