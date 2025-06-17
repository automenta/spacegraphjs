import { RegisteredNode } from './RegisteredNode.js';
import { $ } from './utils.js'; // Import utility

/**
 * @class HtmlAppNode
 * @classdesc Base class for creating custom HTML-based application nodes in SpaceGraph.
 * It streamlines the development of complex nodes by automating common boilerplate,
 * such as creating the main HTML container, applying base styles, and providing
 * a structured lifecycle and helper methods for DOM manipulation and event handling.
 *
 * To create a new HTML-based node type, you extend this class and then register it
 * with SpaceGraph using a `TypeDefinition` that specifies your new class via the `nodeClass` property.
 *
 * **Declarative Event and Data Binding:**
 * `HtmlAppNode` supports declarative bindings directly in the HTML template defined in `onInit()`:
 *
 * - **Event Binding:** `data-event-<eventName>="methodName[:stop]"`
 *   - Attaches an event listener for `<eventName>` (e.g., 'click', 'input') to the element.
 *   - Calls `this.methodName(event)` on the `HtmlAppNode` instance when the event fires.
 *   - If `:stop` is appended (e.g., `data-event-click="myClickHandler:stop"`), `event.stopPropagation()` is automatically called.
 *   - Example: `<button data-event-click="handleButtonClick:stop">Click Me</button>`
 *
 * - **One-Way Data Binding to Element Properties:** `data-bind-prop="dataKey:elementProperty"`
 *   - Binds `this.data[dataKey]` to the specified `elementProperty` of the HTML element.
 *   - Updates whenever `this.data[dataKey]` changes via `this.onDataUpdate()`.
 *   - Supported `elementProperty` values:
 *     - `textContent`: Updates `element.textContent`.
 *     - `innerHTML`: Updates `element.innerHTML`.
 *     - `value`: Updates `element.value` (for inputs, textareas, selects).
 *     - `checked`: Updates `element.checked` (for checkboxes, radio buttons), expects boolean `this.data[dataKey]`.
 *   - Example: `<span data-bind-prop="userName:textContent"></span>` (updates text with `this.data.userName`)
 *   - Example: `<input type="checkbox" data-bind-prop="isActive:checked">`
 *
 * - **One-Way Data Binding to HTML Attributes:** `data-bind-attr="dataKey:attributeName"`
 *   - Binds `this.data[dataKey]` to the specified HTML `attributeName`.
 *   - Updates the attribute when `this.data[dataKey]` changes. If the value is `null` or `undefined`, the attribute is removed.
 *   - Example: `<img data-bind-attr="imageUrl:src" alt="User Image">` (sets `src` attribute from `this.data.imageUrl`)
 *
 * - **One-Way Data Binding to CSS Styles:** `data-bind-style="dataKey:styleProperty"`
 *   - Binds `this.data[dataKey]` to the specified CSS `styleProperty` (camelCased, e.g., `backgroundColor`).
 *   - Updates `element.style[styleProperty]` when `this.data[dataKey]` changes.
 *   - Example: `<div data-bind-style="highlightColor:backgroundColor"></div>` (sets style.backgroundColor from `this.data.highlightColor`)
 *
 * - **One-Way CSS Class Toggling:** `data-bind-class="dataKey:className"`
 *   - Toggles `className` on the element based on the truthiness of `this.data[dataKey]`.
 *   - If `this.data[dataKey]` is truthy, the class is added; otherwise, it's removed.
 *   - Example: `<div data-bind-class="isActive:highlight"></div>` (adds 'highlight' class if `this.data.isActive` is true)
 *
 * @extends RegisteredNode
 *
 * @example
 * ```javascript
 * // 1. Define Your Custom Node Class (MyWidgetNode.js)
 * class MyWidgetNode extends HtmlAppNode {
 *   onInit() {
 *     // Initial data can be accessed via this.data
 *     this.htmlElement.innerHTML = `
 *       <h3 data-bind-prop="label:textContent"></h3>
 *       <p>Current value: <span data-bind-prop="currentValue:textContent"></span></p>
 *       <input type="text" data-event-input="handleInputChange" data-bind-prop="currentValue:value">
 *       <button data-event-click="incrementValue">Increment</button>
 *       <div data-bind-class="isImportant:important-style">This is a message.</div>
 *       <img data-bind-attr="imageUrl:src" style="width:50px; height:50px;">
 *     `;
 *     // Automatically stop propagation for common interactive elements
 *     this.autoStopPropagation();
 *   }
 *
 *   handleInputChange(event) {
 *     const newValue = event.target.value;
 *     // Update data, which will trigger onDataUpdate and re-bind to UI
 *     this.spaceGraph.updateNodeData(this.id, { currentValue: newValue });
 *   }
 *
 *   incrementValue() {
 *     let val = parseFloat(this.data.currentValue) || 0;
 *     this.spaceGraph.updateNodeData(this.id, { currentValue: val + 1 });
 *   }
 *
 *   onDataUpdate(updatedData) {
 *     super.onDataUpdate(updatedData); // Handles declarative bindings
 *     if (updatedData.hasOwnProperty('isImportant')) {
 *       console.log('Importance changed to:', this.data.isImportant);
 *     }
 *   }
 * }
 *
 * // 2. Define its TypeDefinition (in your main graph setup script)
 * const myWidgetNodeDefinition = {
 *   nodeClass: MyWidgetNode,
 *   getDefaults: (node) => ({
 *     label: 'My Widget',
 *     width: 220, height: 200, currentValue: '0',
 *     isImportant: false, imageUrl: 'path/to/default/image.png',
 *     backgroundColor: 'lightsteelblue'
 *   })
 * };
 *
 * // 3. Register with SpaceGraph
 * // spaceGraph.registerNodeType('my-widget', myWidgetNodeDefinition);
 *
 * // 4. Add instances
 * // const widget1 = spaceGraph.addNode({ type: 'my-widget', id: 'widget1', label: 'Interactive Widget' });
 * // spaceGraph.updateNodeData('widget1', { currentValue: 10, isImportant: true, imageUrl: 'path/to/new/image.jpg' });
 * ```
 */
export class HtmlAppNode extends RegisteredNode {
    /**
     * Constructor for HtmlAppNode.
     * This is typically called by the `SpaceGraph.addNode` method when it instantiates
     * a node whose `typeDefinition` specifies this class (or a derivative) via `nodeClass`.
     *
     * The constructor handles:
     * - Calling the `RegisteredNode` super constructor.
     * - Initializing and styling the main `this.htmlElement` based on `this.data`
     *   (width, height, backgroundColor, etc., often sourced from `typeDefinition.getDefaults`).
     * - Adding CSS classes `html-app-node` and a type-specific class (e.g., `my-type-node`) to `this.htmlElement`.
     * - Creating the `this.cssObject` to render the `this.htmlElement` in 3D space.
     * - Invoking the `this.onInit()` lifecycle method for derived classes to perform their specific setup.
     * - Initializing declarative event and data bindings.
     *
     * @param {string} id - Unique ID for the node. See {@link RegisteredNode#constructor}.
     * @param {import('../spacegraph.js').NodeDataObject} initialUserData - Initial data object for the node, including `type`, position (`x`,`y`,`z`), and any custom data. See {@link RegisteredNode#constructor}.
     * @param {import('../spacegraph.js').TypeDefinition} typeDefinition - The type definition object for this node type. This must include `typeName` and `nodeClass` (pointing to the derived class).
     * @param {import('../spacegraph.js').SpaceGraph} spaceGraphRef - Reference to the parent SpaceGraph instance.
     */
    constructor(id, initialUserData, typeDefinition, spaceGraphRef) {
        if (!initialUserData.type && typeDefinition.typeName) {
            initialUserData.type = typeDefinition.typeName;
        }
        super(id, initialUserData, typeDefinition, spaceGraphRef);
        this._initializeHtmlElement();

        if (typeof this.onInit === 'function') {
            this.onInit();
        }
        this._initializeDeclarativeBindings(); // Setup declarative event listeners
        this._applyInitialDataBindings(); // Apply initial data bindings

        this.update();
    }

    /**
     * @override
     * Provides default data by calling the `getDefaults` method from the typeDefinition.
     */
    getDefaultData() {
        if (this.typeDefinition?.getDefaults) {
            return this.typeDefinition.getDefaults(this, this.spaceGraph);
        }
        return super.getDefaultData();
    }

    /** @private */
    _initializeHtmlElement() {
        if (!this.htmlElement) {
            this.htmlElement = document.createElement('div');
        }
        this.htmlElement.classList.add('html-app-node');
        if (this.data.type) {
            const typeClassName = this.data.type.toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
            this.htmlElement.classList.add(`${typeClassName}-node`);
        }
        this.htmlElement.style.width = `${this.data.width || 200}px`;
        this.htmlElement.style.height = `${this.data.height || 150}px`;
        this.htmlElement.style.backgroundColor = this.data.backgroundColor || 'var(--node-bg-default, #333)';
        this.htmlElement.style.border = this.data.border || '1px solid var(--accent-color-darker, #555)';
        this.htmlElement.style.overflow = 'hidden';
        this.htmlElement.style.display = 'flex';
        this.htmlElement.style.flexDirection = 'column';

        if (!this.cssObject && this.htmlElement && window.CSS3DObject) {
             this.cssObject = new window.CSS3DObject(this.htmlElement);
        } else if (this.cssObject && this.cssObject.element !== this.htmlElement) {
            this.cssObject.element.remove();
            this.cssObject.element = this.htmlElement;
        }
         if (this.cssObject) {
            this.cssObject.userData = { nodeId: this.id, type: this.data.type };
        }
        if (this.htmlElement && !this.htmlElement.dataset.nodeId) {
            this.htmlElement.dataset.nodeId = this.id;
        }
    }

    /** @private */
    _initializeDeclarativeBindings() {
        if (!this.htmlElement) return;

        this.htmlElement.querySelectorAll('*').forEach(element => {
            Array.from(element.attributes).forEach(attr => {
                if (attr.name.startsWith('data-event-')) {
                    const eventType = attr.name.substring('data-event-'.length);
                    let [methodName, ...modifiers] = attr.value.split(':');
                    const stopPropagation = modifiers.includes('stop');

                    if (typeof this[methodName] === 'function') {
                        element.addEventListener(eventType, (event) => {
                            if (stopPropagation) {
                                event.stopPropagation();
                            }
                            this[methodName](event);
                        });
                    } else {
                        console.warn(`HtmlAppNode[${this.id}]: Method "${methodName}" not found for event binding on element:`, element);
                    }
                }
            });
        });
    }

    /** @private */
    _applyInitialDataBindings() {
        if (!this.htmlElement) return;
        // Create an object with all keys from this.data to trigger all bindings
        const allDataKeys = {};
        for (const key in this.data) {
            allDataKeys[key] = this.data[key];
        }
        this.onDataUpdate(allDataKeys);
    }


    /**
     * `onInit()`: Called once after the `HtmlAppNode`'s base HTML element (`this.htmlElement`) is created,
     * styled by the constructor, and ready for custom content.
     *
     * **Derived classes MUST implement this method** to:
     *  1. Populate `this.htmlElement` with their specific internal DOM structure (e.g., using `innerHTML` or DOM manipulation).
     *  2. Find and store references to key internal elements using `this.getChild()` or `this.getChildren()`.
     *  3. Attach any necessary event listeners to these internal elements, often using `this.stopEventPropagation()`
     *     or the declarative `autoStopPropagation()` method for interactive elements like inputs or buttons
     *     to prevent them from triggering graph interactions (drag, pan, zoom).
     *     Alternatively, use declarative `data-event-*` attributes in the HTML template.
     *  4. Perform any other one-time setup specific to the node type.
     *
     * The base `HtmlAppNode.onInit()` method, if not overridden by a subclass, will log a warning to the console
     * indicating that the subclass should provide an implementation.
     *
     * @example
     * ```javascript
     * class MyCustomAppNode extends HtmlAppNode {
     *   onInit() {
     *     // Populate the main HTML element
     *     this.htmlElement.innerHTML = `
     *       <h3 data-bind-prop="label:textContent">${this.data.label || 'My Node'}</h3>
     *       <input type="text" class="my-input" data-event-input="onMyInputChange" value="${this.data.initialText || ''}">
     *       <button data-event-click="onButtonClick">Click Me</button>
     *     `;
     *     // Automatically stop propagation for default interactive elements
     *     this.autoStopPropagation();
     *     // Or, for specific elements: this.stopEventPropagation(this.getChild('.my-input'));
     *   }
     *   onMyInputChange(event) {
     *     this.spaceGraph.updateNodeData(this.id, { initialText: event.target.value });
     *   }
     *   onButtonClick() { this.emit('buttonClicked', { nodeId: this.id }); }
     * }
     * ```
     */
    onInit() {
        if (this.constructor === HtmlAppNode) {
             console.warn(`HtmlAppNode type "${this.data.type}" has not implemented a custom onInit() method. Please override onInit in your subclass: ${this.constructor.name}`);
        }
    }

    /**
     * @override
     * `onDataUpdate(updatedData)`: Handles updates to the node's data when `spaceGraph.updateNodeData()` is called
     * for this node, or when data is propagated to one of its input ports from another node's output port.
     *
     * **Key Behavior:**
     * - `this.data`: This object already reflects the new, merged data state *before* `onDataUpdate` is called.
     *                You should typically read the new values from `this.data`.
     * - `updatedData`: This parameter is an object containing only the properties that were actually
     *                  changed in the `updateNodeData` call or port propagation. This allows you to specifically
     *                  check *what* changed, which is useful for targeted DOM updates.
     *
     * This base implementation handles:
     * 1. Updates to common style-related properties (`width`, `height`, `backgroundColor`).
     * 2. One-way declarative data bindings for elements with `data-bind-prop`, `data-bind-attr`,
     *    `data-bind-style`, and `data-bind-class` attributes.
     *
     * Derived classes can override this method for custom logic. If overriding, it's recommended to call
     * `super.onDataUpdate(updatedData)` to ensure base functionality (including declarative bindings) is executed.
     *
     * @param {object} updatedData - An object containing only the data properties that were part of the current update.
     * @example
     * ```javascript
     * // (See class JSDoc example for MyDataDrivenNode which uses onDataUpdate)
     * ```
     */
    onDataUpdate(updatedData) {
        // Handle base style properties if they are part of the update
        if (updatedData.hasOwnProperty('width') && this.data.width !== undefined && this.htmlElement) {
            this.htmlElement.style.width = `${this.data.width}px`;
        }
        if (updatedData.hasOwnProperty('height') && this.data.height !== undefined && this.htmlElement) {
            this.htmlElement.style.height = `${this.data.height}px`;
        }
        if (updatedData.hasOwnProperty('backgroundColor') && this.data.backgroundColor !== undefined && this.htmlElement) {
            this.htmlElement.style.backgroundColor = this.data.backgroundColor;
        }

        // Declarative One-Way Data Binding
        if (!this.htmlElement) return;

        Object.keys(updatedData).forEach(dataKey => {
            const newValue = this.data[dataKey];

            // data-bind-prop="dataKey:elementProperty"
            this.htmlElement.querySelectorAll(`[data-bind-prop^="${dataKey}:"]`).forEach(el => {
                const binding = el.getAttribute('data-bind-prop').split(':');
                if (binding.length === 2 && binding[0] === dataKey) {
                    const elementProperty = binding[1];
                    switch (elementProperty) {
                        case 'textContent': el.textContent = newValue; break;
                        case 'innerHTML': el.innerHTML = newValue; break;
                        case 'value': el.value = newValue; break;
                        case 'checked': el.checked = Boolean(newValue); break;
                        default: console.warn(`HtmlAppNode[${this.id}]: Unknown data-bind-prop target "${elementProperty}" for dataKey "${dataKey}"`);
                    }
                }
            });

            // data-bind-attr="dataKey:attributeName"
            this.htmlElement.querySelectorAll(`[data-bind-attr^="${dataKey}:"]`).forEach(el => {
                const binding = el.getAttribute('data-bind-attr').split(':');
                if (binding.length === 2 && binding[0] === dataKey) {
                    const attributeName = binding[1];
                    if (newValue === null || newValue === undefined) {
                        el.removeAttribute(attributeName);
                    } else {
                        el.setAttribute(attributeName, newValue);
                    }
                }
            });

            // data-bind-style="dataKey:styleProperty" (camelCased)
            this.htmlElement.querySelectorAll(`[data-bind-style^="${dataKey}:"]`).forEach(el => {
                const binding = el.getAttribute('data-bind-style').split(':');
                if (binding.length === 2 && binding[0] === dataKey) {
                    const styleProperty = binding[1];
                    el.style[styleProperty] = newValue;
                }
            });

            // data-bind-class="dataKey:className"
            this.htmlElement.querySelectorAll(`[data-bind-class^="${dataKey}:"]`).forEach(el => {
                const binding = el.getAttribute('data-bind-class').split(':');
                if (binding.length === 2 && binding[0] === dataKey) {
                    const className = binding[1];
                    el.classList.toggle(className, Boolean(newValue));
                }
            });
        });

        // Compatibility with TypeDefinition's onDataUpdate (if not overridden by subclass)
        if (this.typeDefinition?.onDataUpdate && typeof this.typeDefinition.onDataUpdate === 'function') {
            const isBaseMethod = this.onDataUpdate === HtmlAppNode.prototype.onDataUpdate;
            if (isBaseMethod) {
                this.typeDefinition.onDataUpdate(this, updatedData, this.spaceGraph);
            }
        }
    }

    /**
     * @override
     * `onDispose()`: Called when the node is being removed from the graph.
     * Derived classes should implement this method to perform any specific cleanup beyond
     * what `RegisteredNode.dispose()` handles.
     */
    onDispose() {
        if (this.typeDefinition?.onDispose && typeof this.typeDefinition.onDispose === 'function') {
            const isBaseMethod = this.onDispose === HtmlAppNode.prototype.onDispose;
            if (isBaseMethod) {
                this.typeDefinition.onDispose(this, this.spaceGraph);
            }
        }
    }

    // --- Helper Methods ---
    /**
     * Queries for the first child element within `this.htmlElement`.
     * @param {string} selector - A CSS selector.
     * @returns {HTMLElement | null}
     */
    getChild(selector) {
        return this.htmlElement ? $(selector, this.htmlElement) : null;
    }

    /**
     * Queries for all child elements within `this.htmlElement`.
     * @param {string} selector - A CSS selector.
     * @returns {HTMLElement[]}
     */
    getChildren(selector) {
        return this.htmlElement ? Array.from(this.htmlElement.querySelectorAll(selector)) : [];
    }

    /**
     * Stops event propagation for specified event types on an element.
     * Crucial for interactive elements within the node to prevent graph interactions.
     * @param {HTMLElement | string} elementOrSelector - The element or a CSS selector for it.
     * @param {string | string[]} [eventTypes=['pointerdown', 'wheel']] - Events to stop.
     */
    stopEventPropagation(elementOrSelector, eventTypes = ['pointerdown', 'wheel']) {
        let element = elementOrSelector;
        if (typeof elementOrSelector === 'string') {
            element = this.getChild(elementOrSelector);
        }
        if (!element) {
            console.warn(`HtmlAppNode[${this.id}]: stopEventPropagation - Element not found for selector/object "${elementOrSelector}"`);
            return;
        }
        const events = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
        events.forEach(eventType => {
            element.addEventListener(eventType, (e) => e.stopPropagation());
        });
    }

    /**
     * Automatically stops event propagation for common interactive elements within this node.
     * This is a convenience method typically called in `onInit()` to prevent inputs, buttons, etc.,
     * from interfering with graph-level interactions like panning or zooming.
     *
     * @param {string[]} [selectors=['input', 'button', 'textarea', 'select', '[contenteditable="true"]']]
     *        An array of CSS selectors for elements that should have event propagation stopped.
     * @param {string[]} [eventTypes=['pointerdown', 'wheel']]
     *        An array of event types (e.g., 'pointerdown', 'wheel', 'click', 'input', 'keydown')
     *        for which propagation should be stopped on the selected elements.
     *
     * @example
     * class MyInteractiveNode extends HtmlAppNode {
     *   onInit() {
     *     this.htmlElement.innerHTML = `
     *       <input type="text" placeholder="Type here...">
     *       <button>Submit</button>
     *       <div contenteditable="true">Edit me</div>
     *     `;
     *     this.autoStopPropagation(); // Stops 'pointerdown' and 'wheel' for the input, button, and contenteditable div.
     *
     *     // To stop 'keydown' as well for inputs to allow typing without triggering graph shortcuts:
     *     // this.autoStopPropagation(['input', 'textarea'], ['pointerdown', 'wheel', 'keydown']);
     *   }
     * }
     */
    autoStopPropagation(
        selectors = ['input', 'button', 'textarea', 'select', '[contenteditable="true"]'],
        eventTypes = ['pointerdown', 'wheel']
    ) {
        if (!this.htmlElement) return;
        selectors.forEach(selector => {
            const elements = this.getChildren(selector);
            elements.forEach(element => {
                this.stopEventPropagation(element, eventTypes);
            });
        });
    }

    /** @override */
    update(spaceGraphInstance) {
        const graph = spaceGraphInstance || this.spaceGraph;
        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            if (this.data.billboard !== false && graph?._camera) {
                this.cssObject.quaternion.copy(graph._camera.quaternion);
            }
        }
        if (this.typeDefinition?.onUpdate) {
            this.typeDefinition.onUpdate(this, graph);
        }
    }

    /** @override */
    getBoundingSphereRadius() {
        if (this.typeDefinition?.getBoundingSphereRadius) {
            return this.typeDefinition.getBoundingSphereRadius(this, this.spaceGraph);
        }
        const width = this.data.width || parseFloat(this.htmlElement?.style.width) || 200;
        const height = this.data.height || parseFloat(this.htmlElement?.style.height) || 150;
        return Math.sqrt(width ** 2 + height ** 2) / 2;
    }

    /** @override */
    setSelectedStyle(selected) {
        super.setSelectedStyle(selected);
        if (this.typeDefinition?.onSetSelectedStyle) {
            this.typeDefinition.onSetSelectedStyle(this, selected, this.spaceGraph);
        } else {
            this.htmlElement?.classList.toggle('selected', selected);
        }
    }
}

//
// **Relationship between HtmlAppNode class methods and TypeDefinition:**
// When you use a class that extends `HtmlAppNode` (e.g., `class MyNode extends HtmlAppNode`)
// and register it with SpaceGraph using a `TypeDefinition`'s `nodeClass` property:
// - The lifecycle methods like `onInit`, `onDataUpdate`, `onDispose` should ideally be
//   implemented as methods directly within your `MyNode` class.
// - The `TypeDefinition` object passed during registration still needs to provide `typeName`
//   (used as the key for registration) and `nodeClass` (pointing to `MyNode`).
// - The `getDefaults` method should also be part of the `TypeDefinition` as it's used early
//   in the node instantiation process.
// - Other `TypeDefinition` methods (like `onCreate`, `onUpdate` from the TypeDefinition object itself)
//   are generally *not* needed or used if `nodeClass` is specified and the class implements
//   the corresponding lifecycle methods. `HtmlAppNode` provides its own internal `onCreate` equivalent
//   (which calls `onInit` and sets up declarative bindings) and `onUpdate` (which handles declarative data binding).
//   It's cleaner to put all custom logic in the class methods of your `HtmlAppNode` subclass.
//
/*
// Example:
// In your main graph setup script:
const myFancyNodeType = {
  // typeName is the key for registration: spaceGraph.registerNodeType('my-fancy-node', myFancyNodeType);
  nodeClass: MyFancyNode, // Your class extending HtmlAppNode
  getDefaults: (node) => ({ // node is the instance being created
    width: 300,
    height: 200,
    label: node.data.id || 'Fancy Node', // Access initial data if needed
    initialCounter: 5,
    backgroundColor: 'cornflowerblue' // This will be handled by HtmlAppNode's onDataUpdate
  })
};
// spaceGraph.registerNodeType('my-fancy-node', myFancyNodeType);

// In MyFancyNode.js (or same file, after HtmlAppNode definition):
class MyFancyNode extends HtmlAppNode {
  onInit() {
    // this.data is populated with defaults and initialUserData by now
    this.counter = this.data.initialCounter; // Local state, if needed beyond this.data

    this.htmlElement.innerHTML = `
      <h3 data-bind-prop="label:textContent"></h3>
      <p>Counter: <span class="count" data-bind-prop="initialCounter:textContent"></span></p>
      <button data-event-click="incrementCounter:stop">Increment</button>
      <div data-bind-class="isImportant:important-status-style">Status Message</div>
    `;
    // Note: data-bind-prop for label and initialCounter will make them display initial values.
    //       No need to manually set them here if they are in this.data.
    this.autoStopPropagation(); // Setup default event stopping for button, etc.
  }

  incrementCounter() {
    this.counter++;
    // To make the counter display update via data-binding, update this.data:
    this.spaceGraph.updateNodeData(this.id, { initialCounter: this.counter });
    // This will trigger onDataUpdate, which handles the data-bind-prop.
    this.emit('counterChanged', { count: this.counter });
  }

  onDataUpdate(updatedData) {
    super.onDataUpdate(updatedData); // IMPORTANT: This handles all declarative bindings

    // Custom logic if needed, for changes not covered by declarative bindings
    if (updatedData.hasOwnProperty('isImportant')) {
        console.log('isImportant flag changed to:', this.data.isImportant);
    }
    // If initialCounter was updated, this.counter (local state) might need sync if used elsewhere.
    if (updatedData.hasOwnProperty('initialCounter')) {
        this.counter = this.data.initialCounter;
    }
  }

  onDispose() {
    console.log(`MyFancyNode ${this.id} disposed.`);
  }
}
*/
