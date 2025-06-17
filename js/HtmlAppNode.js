import { RegisteredNode } from '../spacegraph.js'; // Assuming spacegraph.js is in the root
import { $ } from '../spacegraph.js'; // Import utility

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
 * @extends RegisteredNode
 *
 * @example
 * ```javascript
 * // 1. Define Your Custom Node Class
 * class MyWidgetNode extends HtmlAppNode {
 *   onInit() {
 *     this.htmlElement.innerHTML = `<h3>${this.data.label}</h3><p>Content goes here.</p>`;
 *     // Use this.getChild, this.stopEventPropagation, etc.
 *   }
 *   onDataUpdate(updatedData) {
 *     if (updatedData.label) {
 *       const h3 = this.getChild('h3');
 *       if (h3) h3.textContent = this.data.label;
 *     }
 *   }
 * }
 *
 * // 2. Define its TypeDefinition
 * const myWidgetNodeDefinition = {
 *   typeName: 'my-widget',
 *   nodeClass: MyWidgetNode, // Link to your class
 *   getDefaults: (nodeInst) => ({
 *     width: 200,
 *     height: 100,
 *     label: 'My Widget',
 *     backgroundColor: 'lightsteelblue'
 *   })
 * };
 *
 * // 3. Register with SpaceGraph
 * // spaceGraph.registerNodeType('my-widget', myWidgetNodeDefinition);
 *
 * // 4. Add instances
 * // spaceGraph.addNode({ type: 'my-widget', id: 'widget1' });
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
     *
     * @param {string} id - Unique ID for the node. See {@link RegisteredNode#constructor}.
     * @param {import('../spacegraph.js').NodeDataObject} initialUserData - Initial data object for the node, including `type`, position (`x`,`y`,`z`), and any custom data. See {@link RegisteredNode#constructor}.
     * @param {import('../spacegraph.js').TypeDefinition} typeDefinition - The type definition object for this node type. This must include `typeName` and `nodeClass` (pointing to the derived class).
     * @param {import('../spacegraph.js').SpaceGraph} spaceGraphRef - Reference to the parent SpaceGraph instance.
     */
    constructor(id, initialUserData, typeDefinition, spaceGraphRef) {
        // Ensure 'type' is part of initialUserData for super constructor if needed,
        // though typeName from typeDefinition is preferred for class-based nodes.
        if (!initialUserData.type && typeDefinition.typeName) {
            initialUserData.type = typeDefinition.typeName;
        }

        super(id, initialUserData, typeDefinition, spaceGraphRef);

        // Note: `this.data` is now populated by the `RegisteredNode` constructor,
        // which calls `this.getDefaults()` (which should be defined in the derived class's typeDefinition).

        this._initializeHtmlElement();

        // Call the user-defined initialization hook
        if (typeof this.onInit === 'function') {
            this.onInit();
        }
        // Ensure initial update of position and other visual aspects
        this.update();
    }

    /**
     * @override
     * Provides default data by calling the `getDefaults` method from the typeDefinition.
     * This is crucial for initializing `this.data` correctly before _initializeHtmlElement is called.
     */
    getDefaultData() {
        if (this.typeDefinition?.getDefaults) {
            // Pass `this.data` (which contains initialUserData) to getDefaults for context
            return this.typeDefinition.getDefaults(this, this.spaceGraph);
        }
        return super.getDefaultData(); // Fallback to RegisteredNode's (or BaseNode's) default
    }


    /**
     * Initializes the main HTML element for the node (`this.htmlElement`).
     * Applies default styling based on `this.data` (width, height, backgroundColor).
     * Adds a common CSS class `html-app-node` and a type-specific class.
     * @private
     */
    _initializeHtmlElement() {
        if (!this.htmlElement) { // It might have been partially set by RegisteredNode's constructor if typeDef.onCreate was used
            this.htmlElement = document.createElement('div');
        }

        // Add common and type-specific CSS classes
        this.htmlElement.classList.add('html-app-node');
        if (this.data.type) {
            // Sanitize type name to be a valid CSS class
            const typeClassName = this.data.type.toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
            this.htmlElement.classList.add(`${typeClassName}-node`);
        }

        // Apply basic styles from data (defaults should be handled by getDefaults)
        this.htmlElement.style.width = `${this.data.width || 200}px`;
        this.htmlElement.style.height = `${this.data.height || 150}px`;
        this.htmlElement.style.backgroundColor = this.data.backgroundColor || 'var(--node-bg-default, #333)';
        this.htmlElement.style.border = this.data.border || '1px solid var(--accent-color-darker, #555)';
        this.htmlElement.style.overflow = 'hidden'; // Default, can be overridden by user CSS
        this.htmlElement.style.display = 'flex'; // Default, makes it easier for internal layout
        this.htmlElement.style.flexDirection = 'column'; // Default

        // Ensure RegisteredNode's cssObject is created/updated if it wasn't already
        if (!this.cssObject && this.htmlElement && window.CSS3DObject) {
             this.cssObject = new window.CSS3DObject(this.htmlElement);
        } else if (this.cssObject && this.cssObject.element !== this.htmlElement) {
            // If RegisteredNode somehow created a cssObject with a different element,
            // we need to replace it or ensure our htmlElement is used.
            // This path should ideally not be hit if constructor logic is right.
            this.cssObject.element.remove(); // Remove the old element
            this.cssObject.element = this.htmlElement; // Assign the new one
        }
         if (this.cssObject) {
            this.cssObject.userData = { nodeId: this.id, type: this.data.type };
        }
        if (this.htmlElement && !this.htmlElement.dataset.nodeId) {
            this.htmlElement.dataset.nodeId = this.id;
        }
    }

    // --- Standard Lifecycle Methods (to be implemented or overridden by derived classes) ---

    /**
     * `onInit()`: Called after the base HTML element (`this.htmlElement`) is created and styled.
     * Derived classes should implement this method to:
     *  - Populate `this.htmlElement` with their specific internal DOM structure.
     *  - Attach event listeners to their internal elements.
     *  - Perform any other one-time setup.
     *
     * Example:
     * ```javascript
     * onInit() {
     *   this.htmlElement.innerHTML = '<input type="text" class="my-input"><div class="display"></div>';
     *   this.inputElement = this.getChild('.my-input');
     *   this.displayElement = this.getChild('.display');
     *   this.inputElement.addEventListener('input', () => {
     *     this.data.text = this.inputElement.value;
     *     this.displayElement.textContent = this.data.text;
     *   });
     *   this.stopEventPropagation(this.inputElement); // Allow text input without graph interaction
     * }
     * ```
     */
    onInit() {
        // To be implemented by derived node classes
        console.warn(`HtmlAppNode type "${this.data.type}" has not implemented onInit().`);
    }

    /**
     * @override
     * `onDataUpdate(updatedData)`: Handles updates to the node's data.
     * Called when `spaceGraph.updateNodeData()` is used or data arrives via an input port.
     * Derived classes should implement this to react to changes in `this.data`
     * and update their internal state or DOM accordingly.
     *
     * The base `HtmlAppNode` implementation also handles common style updates if `width`, `height`,
     * or `backgroundColor` are present in `updatedData`. Derived classes can call `super.onDataUpdate(updatedData)`
     * to leverage this base behavior or handle these properties themselves.
     *
     * @param {object} updatedData - An object containing only the data properties that were actually updated.
     *                               Note: `this.data` will have already been updated with these changes
     *                               by the time this method is called by the SpaceGraph system.
     * @example
     * ```javascript
     * onDataUpdate(updatedData) {
     *   // super.onDataUpdate(updatedData); // Call if you want base class to handle width/height/bgColor changes
     *   if (updatedData.title !== undefined) { // Check if 'title' was part of the update
     *     const titleEl = this.getChild('.my-node-title');
     *     if (titleEl) titleEl.textContent = this.data.title; // Use this.data for the new value
     *   }
     *   if (updatedData.value_in !== undefined) { // Assuming 'value_in' is a defined input port
     *     // Process this.data.value_in (which is the same as updatedData.value_in)
     *     this.updateDisplay(this.data.value_in);
     *   }
     * }
     * ```
     */
    onDataUpdate(updatedData) {
        // For compatibility with typeDefinition-based onDataUpdate (less common for class-based nodes)
        // This allows a TypeDefinition's onDataUpdate to be used if the class itself doesn't override this method.
        if (this.typeDefinition?.onDataUpdate && typeof this.typeDefinition.onDataUpdate === 'function') {
            // Check if this method in the class is the same as the one in the prototype (i.e., not overridden)
            const isBaseMethod = this.onDataUpdate === HtmlAppNode.prototype.onDataUpdate;
            if (isBaseMethod) { // Only call typeDef if class method is not an override
                this.typeDefinition.onDataUpdate(this, updatedData, this.spaceGraph);
                // If typeDef handled it, maybe return early or merge logic carefully
            }
        }
        // else {
        //    // Default behavior if no override and no typeDefinition.onDataUpdate
        //    console.log(`HtmlAppNode ${this.id} received data update:`, updatedData, 'Current data:', this.data);
        // }

        // HtmlAppNode itself can handle common style-related data updates.
        if (updatedData.width !== undefined && this.htmlElement) {
            this.htmlElement.style.width = `${this.data.width}px`;
        }
        if (updatedData.height !== undefined && this.htmlElement) {
            this.htmlElement.style.height = `${this.data.height}px`;
        }
        if (updatedData.backgroundColor !== undefined && this.htmlElement) {
            this.htmlElement.style.backgroundColor = this.data.backgroundColor;
        }
    }


    /**
     * @override
     * `onDispose()`: Called when the node is being removed from the graph.
     * Derived classes should implement this method to perform any specific cleanup beyond
     * what `RegisteredNode.dispose()` handles (which includes removing `this.htmlElement`,
     * cleaning up Three.js objects like `this.cssObject`, and managing event listeners
     * registered via `this.listenTo()` or on `this`).
     *
     * Typically, this is used for:
     *  - Removing event listeners attached to global objects (e.g., `window`, `document`).
     *  - Disposing of other complex non-DOM resources the node might have created (e.g., Web Workers, AudioContexts).
     *
     * **Note:** Listeners attached to children of `this.htmlElement` are usually cleaned up
     * automatically when `this.htmlElement` is removed from the DOM by `RegisteredNode.dispose()`.
     *
     * @example
     * ```javascript
     * onDispose() {
     *   // if (this.myCustomGlobalListener) {
     *   //   window.removeEventListener('resize', this.myCustomGlobalListener);
     *   //   this.myCustomGlobalListener = null;
     *   // }
     *   console.log(`Custom HTML node ${this.id} specific cleanup done.`);
     *   // It's good practice to call super.onDispose() if extending a class that might also have onDispose logic.
     *   // However, HtmlAppNode's own onDispose currently only calls the typeDefinition's onDispose.
     *   // super.onDispose(); // Call if RegisteredNode or another base might have its own onDispose.
     * }
     * ```
     */
    onDispose() {
        // For compatibility with typeDefinition-based onDispose
        // This allows a TypeDefinition's onDispose to be used if the class itself doesn't override this method.
        if (this.typeDefinition?.onDispose && typeof this.typeDefinition.onDispose === 'function') {
            const isBaseMethod = this.onDispose === HtmlAppNode.prototype.onDispose;
            if (isBaseMethod) { // Only call typeDef if class method is not an override
                this.typeDefinition.onDispose(this, this.spaceGraph);
            }
        }
        // Derived classes can add further cleanup here.
    }

    // --- Helper Methods ---

    /**
     * Queries for the first child element within this node's `this.htmlElement` that matches the CSS selector.
     *
     * @param {string} selector - A CSS selector string.
     * @returns {HTMLElement | null} The first matching HTMLElement, or `null` if not found or `this.htmlElement` is not set.
     * @example `this.inputElement = this.getChild('.my-custom-input');`
     */
    getChild(selector) {
        return this.htmlElement ? $(selector, this.htmlElement) : null;
    }

    /**
     * Queries for all child elements within this node's `this.htmlElement` that match the CSS selector.
     *
     * @param {string} selector - A CSS selector string.
     * @returns {HTMLElement[]} An array of matching HTMLElements. Returns an empty array if none found or `this.htmlElement` is not set.
     * @example `const buttons = this.getChildren('.control-button');`
     */
    getChildren(selector) {
        return this.htmlElement ? Array.from(this.htmlElement.querySelectorAll(selector)) : [];
    }

    /**
     * Helper method to stop event propagation for specified event types on an element.
     * This is crucial for UI elements within a node (like inputs, buttons, scrollable areas)
     * to prevent them from triggering graph-level interactions (node dragging, graph panning/zooming).
     *
     * @param {HTMLElement | string} elementOrSelector - The HTML element or a CSS selector string
     *                                                   to find the element within this node's `htmlElement`.
     * @param {string | string[]} [eventTypes=['pointerdown', 'wheel']] - A string or array of event types
     *                                                                    for which to stop propagation.
     *
     * Example:
     * ```javascript
     * const myInput = this.getChild('.my-input');
     * this.stopEventPropagation(myInput, ['pointerdown', 'click', 'wheel']);
     * // or directly with a selector:
     * this.stopEventPropagation('.my-scrollable-area', 'wheel');
     * ```
     */
    stopEventPropagation(elementOrSelector, eventTypes = ['pointerdown', 'wheel']) {
        let element = elementOrSelector;
        if (typeof elementOrSelector === 'string') {
            element = this.getChild(elementOrSelector);
        }

        if (!element) {
            console.warn(`stopEventPropagation: Element not found for selector "${elementOrSelector}" in node ${this.id}`);
            return;
        }

        const events = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
        events.forEach(eventType => {
            element.addEventListener(eventType, (e) => e.stopPropagation());
        });
    }

    /**
     * @override
     * Default update logic for HtmlAppNode. Ensures position and billboarding (if enabled).
     * Calls the `onUpdate` from the `typeDefinition` if it exists.
     * Derived classes can override this for custom per-frame updates, but should typically call `super.update(spaceGraphInstance)`.
     */
    update(spaceGraphInstance) {
        // Use the graph instance passed during update, or the one stored on the node
        const graph = spaceGraphInstance || this.spaceGraph;

        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            // Handle billboarding (node faces camera)
            if (this.data.billboard !== false && graph?._camera) { // Default to true if undefined
                this.cssObject.quaternion.copy(graph._camera.quaternion);
            }
        }

        // For compatibility, call typeDefinition's onUpdate
        if (this.typeDefinition?.onUpdate) {
            this.typeDefinition.onUpdate(this, graph);
        }
        // Derived classes can add specific update logic here if needed,
        // or preferably override the onUpdate method in their class.
    }

    /**
     * @override
     * Calculates the bounding sphere radius.
     * Uses `this.data.width` and `this.data.height`.
     * Can be overridden by `getBoundingSphereRadius` in `typeDefinition` for compatibility,
     * or by derived classes.
     */
    getBoundingSphereRadius() {
        if (this.typeDefinition?.getBoundingSphereRadius) {
            return this.typeDefinition.getBoundingSphereRadius(this, this.spaceGraph);
        }
        const width = this.data.width || parseFloat(this.htmlElement?.style.width) || 200;
        const height = this.data.height || parseFloat(this.htmlElement?.style.height) || 150;
        return Math.sqrt(width ** 2 + height ** 2) / 2;
    }

    /**
     * @override
     * Applies selection styling. Calls `onSetSelectedStyle` from `typeDefinition` or adds/removes 'selected' class.
     */
    setSelectedStyle(selected) {
        super.setSelectedStyle(selected); // Handles ports if any from RegisteredNode

        if (this.typeDefinition?.onSetSelectedStyle) {
            this.typeDefinition.onSetSelectedStyle(this, selected, this.spaceGraph);
        } else {
            this.htmlElement?.classList.toggle('selected', selected);
        }
    }
}

// To make this class usable, it needs to be registered with SpaceGraph
// typically by modifying the `SpaceGraph.addNode` logic or by creating
// a new registration mechanism for classes extending RegisteredNode.
// For now, we will assume that when a type is registered, if its definition
// points to a class (like HtmlAppNode or its derivatives), SpaceGraph will
// instantiate that class instead of the generic RegisteredNode.
// This might require a change in `SpaceGraph.addNode` or `SpaceGraph.registerNodeType`.

// Example of how a derived node's typeDefinition might look:
/*
const MySpecificAppNodeDefinition = {
    typeName: 'my-specific-app', // Used for CSS class and registration
    nodeClass: MySpecificAppNode, // The class itself
    getDefaults: (nodeInst, graphInst) => ({ // `this` context here is tricky, nodeInst is better
        ...HtmlAppNode.prototype.getDefaultData.call(nodeInst), // Or some base defaults
        width: 250,
        height: 120,
        customData: 'initial value',
        label: 'My Specific Node',
        // backgroundColor: 'lightcoral', // Optional: override default bg
    }),
    // onCreate, onUpdate, onDispose etc. might not be needed if handled by the class methods
};

// Then, a class MySpecificAppNode extends HtmlAppNode:
class MySpecificAppNode extends HtmlAppNode {
    onInit() {
        super.onInit(); // Good practice if base onInit does something
        this.htmlElement.innerHTML = `<h2>${this.data.label}</h2><p>${this.data.customData}</p>`;
        const p = this.getChild('p');
        this.stopEventPropagation(p, 'wheel'); // Example
    }

    onDataUpdate(updatedData) {
        super.onDataUpdate(updatedData); // Good practice
        if (updatedData.customData !== undefined || updatedData.label !== undefined) {
            const h2 = this.getChild('h2');
            const p = this.getChild('p');
            if (h2) h2.textContent = this.data.label;
            if (p) p.textContent = this.data.customData;
        }
    }
}
*/
