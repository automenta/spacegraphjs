import * as THREE from 'three'; // For THREE.Vector3 in emit example, not strictly needed by class itself.
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { BaseNode } from './BaseNode.js';

/**
 * @class RegisteredNode
 * @classdesc Represents a custom node whose behavior and appearance are defined by a {@link TypeDefinition}
 * object that was registered with the {@link SpaceGraph} instance via {@link SpaceGraph#registerNodeType}.
 * This class acts as a bridge between the generic node lifecycle and the custom logic provided in the `TypeDefinition`.
 *
 * It handles the instantiation of visual elements (mesh, HTML) based on the `onCreate` method of its `TypeDefinition`,
 * and delegates other lifecycle events (update, dispose, etc.) to the corresponding methods in the `TypeDefinition` if they exist.
 *
 * @extends BaseNode
 * @property {import('../spacegraph.js').TypeDefinition | null} typeDefinition - The {@link TypeDefinition} object that dictates this node's behavior and appearance.
 *                                                  This is provided during construction and is essential for the node's functionality.
 * @property {HTMLElement[]} portElements - Array of {@link HTMLElement}s representing input/output ports, if defined in the node's data
 *                                         (via `data.ports`) and an `htmlElement` is created by the `typeDefinition.onCreate` method
 *                                         to host these ports. See {@link RegisteredNode#_createAndRenderPorts}.
 */
export class RegisteredNode extends BaseNode {
    /** @type {import('../spacegraph.js').TypeDefinition | null} */
    typeDefinition = null;
    /** @type {HTMLElement[]} */
    portElements = [];
    /**
     * Stores listeners registered directly on this node instance when this node *is the emitter*.
     * Map structure: `Map<eventName, Set<callbackFunction>>`.
     * Callbacks are invoked by `this.emit()`.
     * @private
     * @type {Map<string, Set<Function>> | undefined}
     */
    _listeners; // Initialized in constructor
    /**
     * Tracks listeners that *this node* has registered on *other* nodes.
     * Used for cleanup in `dispose()` to remove this node's listeners from the emitters it was listening to.
     * Map structure: `Map<emitterNodeId, Map<eventName, Set<callbackFunction>>>`.
     * @private
     * @type {Map<string, Map<string, Set<Function>>> | undefined}
     */
    _listeningTo; // Initialized in constructor


    /**
     * Creates an instance of RegisteredNode.
     * This constructor is typically called internally by {@link SpaceGraph#addNode} when a node of a registered custom type is being added.
     * It sets up the node based on its `typeDefinition`, creates its visual elements via `typeDefinition.onCreate`,
     * and initializes internal structures for event handling.
     *
     * @constructor
     * @param {string} id - Unique ID for the node.
     * @param {import('../spacegraph.js').NodeDataObject} initialUserData - The initial data object for the node.
     * @param {import('../spacegraph.js').TypeDefinition} typeDefinition - The {@link TypeDefinition} object for this node type.
     * @param {import('../spacegraph.js').SpaceGraph} spaceGraphRef - Reference to the parent {@link SpaceGraph} instance.
     */
    constructor(id, initialUserData, typeDefinition, spaceGraphRef) {
        super(
            id,
            { x: initialUserData.x ?? 0, y: initialUserData.y ?? 0, z: initialUserData.z ?? 0 },
            initialUserData, // Pass all initialUserData to BaseNode, it will merge with defaults
            initialUserData.mass ?? typeDefinition.getDefaults?.(this, spaceGraphRef)?.mass ?? 1.0 // Pass nodeInst and graphInst to getDefaults
        );

        this.typeDefinition = typeDefinition;
        this.spaceGraph = spaceGraphRef; // Crucial for callbacks in typeDefinition

        // Initialize listener maps
        /**
         * @private
         * Stores listeners registered *on this node* (i.e., when this node is the Emitter).
         * Key: eventName (string), Value: Set of callback functions.
         */
        this._listeners = new Map();

        /**
         * @private
         * Stores listeners that *this node* has registered *on other nodes*.
         * Key: emitterNodeId (string), Value: Map<eventName, Set<callbackFunctions>>.
         * Used to clean up these listeners when this node is disposed.
         */
        this._listeningTo = new Map();

        // onCreate is mandatory and should return visual elements
        const visualOutputs = this.typeDefinition.onCreate(this, this.spaceGraph);
        if (visualOutputs) {
            this.mesh = visualOutputs.mesh;
            this.htmlElement = visualOutputs.htmlElement; // Could be the main element or a container for ports etc.
            this.cssObject = visualOutputs.cssObject || (this.htmlElement ? new CSS3DObject(this.htmlElement) : null);
            this.labelObject = visualOutputs.labelObject;

            // Assign userData for raycasting identification
            if (this.mesh) this.mesh.userData = { nodeId: this.id, type: this.data.type };
            if (this.cssObject) this.cssObject.userData = { nodeId: this.id, type: this.data.type };
            if (this.htmlElement && !this.htmlElement.dataset.nodeId) this.htmlElement.dataset.nodeId = this.id; // Ensure htmlElement has nodeId
            if (this.labelObject) this.labelObject.userData = { nodeId: this.id, type: `${this.data.type}-label` };
        }

        this.portElements = [];
        this._createAndRenderPorts(); // Create ports if defined in data.ports and htmlElement exists

        this.update(); // Initial update call
    }

    /**
     * Retrieves default data for this node by invoking the `getDefaults` method from its {@link TypeDefinition}, if provided.
     * This allows custom node types to specify their own set of default properties.
     * The result is merged with {@link BaseNode}'s default data.
     * @override
     * @returns {object} Default data object for this registered node type.
     * @protected
     */
    getDefaultData() {
        // `this.data` is already partially populated by BaseNode's constructor using `initialUserData`.
        // The `typeDefinition.getDefaults` method is called here to fetch type-specific defaults.
        // These are then merged by the BaseNode constructor logic.

        // In RegisteredNode (and its derivatives like HtmlAppNode), `this.typeDefinition` is set
        // and `this.spaceGraph` is set before `super()` calls this method.
        // `initialUserData` is available as `this.data` at this point due to BaseNode's constructor.
        if (this.typeDefinition?.getDefaults) {
            // Pass `this` (the node instance, which has `this.data` populated with initialUserData)
            // and `this.spaceGraph` to getDefaults.
            return this.typeDefinition.getDefaults(this, this.spaceGraph);
        }
        // Fallback to BaseNode's default data if no getDefaults in typeDefinition.
        // This ensures 'label' is still defaulted from id if nothing else is provided.
        return super.getDefaultData();
    }

    /**
     * Creates and renders HTML elements for input/output ports if `this.data.ports` is defined
     * and an `this.htmlElement` (typically created by `typeDefinition.onCreate`) exists to append them to.
     * Ports are styled with CSS classes `node-port`, `port-input`, `port-output`.
     * Data attributes `data-port-name`, `data-port-type`, `data-port-data-type` are added for interaction.
     * @private
     */
    _createAndRenderPorts() {
        if (!this.data.ports || !this.htmlElement) {
            return;
        }

        // const portBaseSpacing = 20; // Example, can be styled via CSS
        const portSize = 12; // Example
        const nodeHeight = this.htmlElement.offsetHeight;
        // const nodeWidth = this.htmlElement.offsetWidth; // Needed if ports were top/bottom

        // Clear existing port elements from DOM if any (e.g. on a re-render call, though not typical now)
        this.portElements.forEach((pE) => pE.remove());
        this.portElements = [];

        if (this.data.ports.inputs) {
            const inputKeys = Object.keys(this.data.ports.inputs);
            inputKeys.forEach((portName, i) => {
                const portDef = this.data.ports.inputs[portName];
                const portEl = document.createElement('div');
                portEl.className = 'node-port port-input';
                portEl.dataset.portName = portName;
                portEl.dataset.portType = 'input';
                portEl.dataset.portDataType = portDef.type || 'any'; // For type checking during linking
                portEl.title = portDef.label || portName; // Tooltip

                // Position port on the left side, distributed vertically
                portEl.style.left = `-${portSize / 2}px`; // Half outside
                const yPos = (nodeHeight / (inputKeys.length + 1)) * (i + 1) - portSize / 2;
                portEl.style.top = `${Math.max(0, Math.min(nodeHeight - portSize, yPos))}px`;

                this.htmlElement.appendChild(portEl);
                this.portElements.push(portEl);
            });
        }

        if (this.data.ports.outputs) {
            const outputKeys = Object.keys(this.data.ports.outputs);
            outputKeys.forEach((portName, i) => {
                const portDef = this.data.ports.outputs[portName];
                const portEl = document.createElement('div');
                portEl.className = 'node-port port-output';
                portEl.dataset.portName = portName;
                portEl.dataset.portType = 'output';
                portEl.dataset.portDataType = portDef.type || 'any';
                portEl.title = portDef.label || portName;

                // Position port on the right side
                portEl.style.right = `-${portSize / 2}px`;
                const yPos = (nodeHeight / (outputKeys.length + 1)) * (i + 1) - portSize / 2;
                portEl.style.top = `${Math.max(0, Math.min(nodeHeight - portSize, yPos))}px`;

                this.htmlElement.appendChild(portEl);
                this.portElements.push(portEl);
            });
        }
    }

    /**
     * Updates the node's visual state. Called every frame by the {@link SpaceGraph} animation loop.
     * Delegates to the `onUpdate` method of its {@link TypeDefinition} if provided.
     * If `onUpdate` is not defined, it performs default updates:
     * - Syncs `cssObject` and `mesh` positions with `this.position`.
     * - Billboards and positions `labelObject` if it exists.
     * @override
     * @param {import('../spacegraph.js').SpaceGraph} spaceGraphInstance - The parent {@link SpaceGraph} instance.
     */
    update(spaceGraphInstance) {
        if (this.typeDefinition?.onUpdate) {
            this.typeDefinition.onUpdate(this, this.spaceGraph || spaceGraphInstance);
        } else {
            // Default update logic if onUpdate is not provided by the TypeDefinition
            if (this.cssObject) this.cssObject.position.copy(this.position);
            if (this.mesh) this.mesh.position.copy(this.position);

            if (this.labelObject && (this.spaceGraph?._camera || spaceGraphInstance?._camera)) {
                const camera = this.spaceGraph?._camera || spaceGraphInstance?._camera;
                // Position label above the node, adjusted by bounding sphere radius
                const offset = this.getBoundingSphereRadius() * 1.1 + 10;
                this.labelObject.position.copy(this.position).y += offset;
                this.labelObject.quaternion.copy(camera.quaternion); // Billboard
            }
        }
    }

    /**
     * Cleans up resources. Calls `onDispose` from the {@link TypeDefinition} if provided,
     * then removes port elements and calls `super.dispose()` to clean up common/Three.js resources.
     * @override
     */
    dispose() {
        if (this.typeDefinition?.onDispose) {
            this.typeDefinition.onDispose(this, this.spaceGraph);
        }

        this.portElements.forEach((portEl) => portEl.remove());
        this.portElements = [];

        // BaseNode.dispose() will handle mesh, cssObject, labelObject, and their elements.
        super.dispose();

        this.typeDefinition = null; // Release reference

        // Clean up listeners this node has registered on other nodes.
        // Iterate over a copy of keys if modification during iteration is an issue, though Set.delete should be fine.
        this._listeningTo.forEach((eventMap, emitterId) => {
            const emitterNode = this.spaceGraph?.getNodeById(emitterId);
            if (emitterNode && emitterNode instanceof RegisteredNode && emitterNode._listeners) {
                eventMap.forEach((callbacks, eventName) => {
                    callbacks.forEach(cb => {
                        emitterNode._listeners.get(eventName)?.delete(cb);
                        if (emitterNode._listeners.get(eventName)?.size === 0) {
                            emitterNode._listeners.delete(eventName);
                        }
                    });
                });
            }
        });
        this._listeningTo.clear();

        // Clean up listeners registered on this node by other nodes.
        // This tells any nodes that were listening to this node, that this node is gone.
        // (This part is more complex as it requires listeners to also de-register from their side,
        // or for this._listeners to store listenerNode references, which it does not in current design for emit.)
        // The current _listeners map (Map<eventName, Set<callback>>) does not know which node owns the callback.
        // The cleanup in _listeningTo handles the primary responsibility of a node cleaning up *its own* outgoing listeners.
        // For incoming listeners (this._listeners), clearing them here prevents further emits but doesn't inform the listening nodes.
        // A more robust system might involve a central event manager or more complex tracking.
        // For now, clearing this node's ability to emit to stale listeners is the main action.
        this._listeners.clear();
    }

    /**
     * Sets the node's 3D position. Delegates to `onSetPosition` from the {@link TypeDefinition} if provided,
     * otherwise updates visual components' positions directly.
     * @override
     * @param {number} x - The new x-coordinate.
     * @param {number} y - The new y-coordinate.
     * @param {number} z - The new z-coordinate.
     */
    setPosition(x, y, z) {
        super.setPosition(x, y, z); // Updates this.position
        if (this.typeDefinition?.onSetPosition) {
            this.typeDefinition.onSetPosition(this, x, y, z, this.spaceGraph);
        } else {
            // Default position update for visuals if not handled by TypeDefinition's onSetPosition
            if (this.mesh) this.mesh.position.copy(this.position);
            if (this.cssObject) this.cssObject.position.copy(this.position);
            // Note: Label position is often handled during the `update` phase for billboarding.
        }
    }

    /**
     * Applies or removes selection styling. Delegates to `onSetSelectedStyle` from the {@link TypeDefinition} if provided.
     * Manages visibility of port elements (shows on select, hides on deselect).
     * If no custom `onSetSelectedStyle` is defined, it applies a default style (e.g., adds 'selected' class to `htmlElement` or changes mesh emissive color).
     * @override
     * @param {boolean} selected - `true` if the node is selected, `false` otherwise.
     */
    setSelectedStyle(selected) {
        if (this.portElements && this.portElements.length > 0) {
            this.portElements.forEach((portEl) => {
                portEl.style.display = selected ? 'block' : 'none'; // Show ports when selected
            });
        }

        if (this.typeDefinition?.onSetSelectedStyle) {
            this.typeDefinition.onSetSelectedStyle(this, selected, this.spaceGraph);
        } else {
            // Default selection behavior if not overridden by TypeDefinition
            if (this.htmlElement) {
                this.htmlElement.classList.toggle('selected', selected);
            } else if (this.mesh?.material?.emissive) {
                // Basic emissive highlight for mesh-based nodes
                this.mesh.material.emissive.setHex(selected ? 0x888800 : 0x000000);
            }
            // Default for label object as well
            if (this.labelObject?.element) {
                this.labelObject.element.classList.toggle('selected', selected);
            }
        }
    }

    /**
     * Applies or removes hover styling. Delegates to `onSetHoverStyle` from the {@link TypeDefinition} if available.
     * @param {boolean} hovered - `true` if the node is being hovered over, `false` otherwise.
     */
    setHoverStyle(hovered) {
        if (this.typeDefinition?.onSetHoverStyle) {
            this.typeDefinition.onSetHoverStyle(this, hovered, this.spaceGraph);
        }
        // Default CSS :hover effects on htmlElement or ports are often sufficient.
        // No complex default WebGL hover effect is provided here out-of-the-box.
    }

    /**
     * Calculates the bounding sphere radius. Delegates to `getBoundingSphereRadius` from the {@link TypeDefinition} if provided.
     * Otherwise, it attempts to calculate based on the dimensions of `htmlElement` or `mesh.geometry.boundingSphere`.
     * Falls back to `super.getBoundingSphereRadius()` if no other calculation is possible.
     * @override
     * @returns {number} The node's bounding sphere radius.
     */
    getBoundingSphereRadius() {
        if (this.typeDefinition?.getBoundingSphereRadius) {
            return this.typeDefinition.getBoundingSphereRadius(this, this.spaceGraph);
        }
        // Fallback calculations if not provided by TypeDefinition
        if (this.htmlElement) {
            // Consider content scale for HTML elements
            const scale = this.data.contentScale ?? 1.0;
            return Math.max(this.htmlElement.offsetWidth * scale, this.htmlElement.offsetHeight * scale) / 2;
        }
        if (this.mesh?.geometry) {
            if (!this.mesh.geometry.boundingSphere) {
                this.mesh.geometry.computeBoundingSphere();
            }
            return this.mesh.geometry.boundingSphere.radius;
        }
        return super.getBoundingSphereRadius(); // BaseNode's default (small value)
    }

    /**
     * Handles the start of a drag operation. Delegates to `onStartDrag` from the {@link TypeDefinition} if provided,
     * otherwise calls `super.startDrag()`.
     * @override
     */
    startDrag() {
        if (this.typeDefinition?.onStartDrag) this.typeDefinition.onStartDrag(this, this.spaceGraph);
        else super.startDrag();
    }
    /**
     * Handles a drag operation. Delegates to `onDrag` from the {@link TypeDefinition} if provided,
     * otherwise calls `super.drag()`.
     * @override
     * @param {THREE.Vector3} newPosition - The new target position.
     */
    drag(newPosition) {
        if (this.typeDefinition?.onDrag) this.typeDefinition.onDrag(this, newPosition, this.spaceGraph);
        else super.drag(newPosition);
    }
    /**
     * Handles the end of a drag operation. Delegates to `onEndDrag` from the {@link TypeDefinition} if provided,
     * otherwise calls `super.endDrag()`.
     * @override
     */
    endDrag() {
        if (this.typeDefinition?.onEndDrag) this.typeDefinition.onEndDrag(this, this.spaceGraph);
        else super.endDrag();
    }

    /**
     * Emits an event from this node.
     * If the `eventName` matches a defined output port of this node (from `this.data.ports.outputs`),
     * and `propagateViaPorts` is true, the `payload` is automatically sent to any input ports
     * on other nodes that are connected to this output port by an edge. This is achieved by calling
     * `spaceGraph.updateNodeData()` on the target node, with the target port's name as the key and `payload` as the value.
     *
     * Additionally, this method invokes any callback functions that were directly registered on this node
     * for the given `eventName` using `someOtherNode.listenTo(thisNode, eventName, callback)`.
     *
     * @param {string} eventName - The name of the event to emit. If this matches an output port name defined in `this.data.ports.outputs`,
     *                             and `propagateViaPorts` is true, the data will be propagated through connected edges.
     * @param {*} payload - The data to send with the event. This will be passed to connected input ports and direct listeners.
     * @param {boolean} [propagateViaPorts=true] - If `true` (default) and `eventName` is a defined output port,
     *                                            the data is propagated to connected input ports on other nodes.
     *                                            Set to `false` to only trigger direct listeners registered via `listenTo` for this `eventName`,
     *                                            without port-based propagation.
     * @example
     * // In a node's method (e.g., part of an HtmlAppNode subclass or a TypeDefinition method for a RegisteredNode):
     * // this.emit('dataProcessed', { result: 42 }); // Assuming 'dataProcessed' is an output port
     * // this.emit('stateChanged', { newState: 'active' }, false); // Only for direct listeners
     */
    emit(eventName, payload, propagateViaPorts = true) {
        // 1. Automatic Port-Based Data Propagation
        if (propagateViaPorts && this.data.ports?.outputs?.[eventName] && this.spaceGraph) {
            this.spaceGraph.edges.forEach(edge => {
                if (edge.source === this && edge.data.sourcePort === eventName) {
                    const targetNode = edge.target;
                    const targetPortName = edge.data.targetPort;
                    if (targetNode && targetPortName && targetNode instanceof RegisteredNode) {
                        if (targetNode.data.ports?.inputs?.[targetPortName]) {
                            // console.log(`Propagating data from ${this.id}:${eventName} to ${targetNode.id}:${targetPortName}`, payload);
                            this.spaceGraph.updateNodeData(targetNode.id, { [targetPortName]: payload });
                        } else {
                            console.warn(`Output port ${this.id}:${eventName} connected to undefined input port ${targetNode.id}:${targetPortName}`);
                        }
                    }
                }
            });
        }

        // 2. Direct `listenTo` Listeners
        // Callbacks stored in `this._listeners` (Map<eventName, Set<callback>>) are executed.
        if (this._listeners.has(eventName)) {
            // Iterate over a copy in case a callback modifies the listeners Set (e.g., calls stopListening)
            [...this._listeners.get(eventName)].forEach(callback => {
                try {
                    callback(payload, this); // Pass payload and this node as the sender
                } catch (error) {
                    console.error(`Error in direct listener for event "${eventName}" on node ${this.id}:`, error);
                }
            });
        }
    }

    /**
     * Registers a listener on an `emitterNode` for a specific event.
     * When `emitterNode` calls its `emit(eventName, payload)` method, the provided `callback`
     * function will be executed if the `eventName` matches.
     * This node (the instance on which `listenTo` is called) keeps track of this subscription internally
     * so that the listener can be automatically removed when this listening node is disposed via {@link RegisteredNode#dispose},
     * preventing memory leaks or errors from stale callbacks.
     *
     * @param {RegisteredNode} emitterNode - The node instance to listen to. This node must be an instance of
     *                                     `RegisteredNode` or its subclasses (like {@link HtmlAppNode}) as they possess the `emit` mechanism.
     * @param {string} eventName - The name of the event to listen for on the `emitterNode`.
     * @param {function(any, RegisteredNode): void} callback - The function to execute when the event is emitted.
     *                                                        The callback receives two arguments:
     *                                                        1. `payload`: The data payload of the event, as passed to `emitterNode.emit()`.
     *                                                        2. `senderNodeInstance`: The `emitterNode` instance that emitted the event (i.e., `emitterNode` itself).
     * @example
     * // In an HtmlAppNode subclass (this is nodeB, the listener):
     * // onInit() { // Or any other appropriate place
     * //   const nodeA = this.spaceGraph.getNodeById('nodeA'); // Assume nodeA is a RegisteredNode
     * //   if (nodeA instanceof RegisteredNode) { // Type check for safety
     * //     this.listenTo(nodeA, 'dataReady', (data, sender) => {
     * //       console.log(`Node ${this.id} received data from ${sender.id}:`, data);
     * //       this.processIncomingData(data); // Example method in nodeB's class
     * //     });
     * //   }
     * // }
     *
     * // Elsewhere, nodeA (an instance of RegisteredNode or HtmlAppNode) might do:
     * // nodeA.emit('dataReady', { value: 123 });
     * // This would trigger the callback registered by nodeB.
     */
    listenTo(emitterNode, eventName, callback) {
        if (!(emitterNode instanceof RegisteredNode)) {
            console.error(`Cannot listenTo: emitterNode with id '${emitterNode?.id}' is not a RegisteredNode.`);
            return;
        }
        if (typeof callback !== 'function') {
            console.error('Cannot listenTo: provided callback is not a function.');
            return;
        }

        // Register the callback on the emitterNode's internal _listeners map.
        if (!emitterNode._listeners.has(eventName)) {
            emitterNode._listeners.set(eventName, new Set());
        }
        emitterNode._listeners.get(eventName).add(callback);

        // This listening node (this) also needs to track this subscription for its own disposal.
        if (!this._listeningTo.has(emitterNode.id)) {
            this._listeningTo.set(emitterNode.id, new Map());
        }
        const eventMapForEmitter = this._listeningTo.get(emitterNode.id);
        if (!eventMapForEmitter.has(eventName)) {
            eventMapForEmitter.set(eventName, new Set());
        }
        eventMapForEmitter.get(eventName).add(callback);
    }

    /**
     * Removes a listener that this node previously registered on an `emitterNode` for a specific event and callback.
     *
     * @param {RegisteredNode} emitterNode - The node instance from which to stop listening.
     * @param {string} eventName - The name of the event.
     * @param {Function} callback - The specific callback function instance that was originally registered.
     *                              This must be the same function reference.
     */
    stopListening(emitterNode, eventName, callback) {
        if (!(emitterNode instanceof RegisteredNode) || !emitterNode._listeners?.has(eventName) || typeof callback !== 'function') {
            return;
        }
        emitterNode._listeners.get(eventName).delete(callback);
        if (emitterNode._listeners.get(eventName).size === 0) {
            emitterNode._listeners.delete(eventName);
        }

        if (this._listeningTo.has(emitterNode.id) && this._listeningTo.get(emitterNode.id).has(eventName)) {
            this._listeningTo.get(emitterNode.id).get(eventName).delete(callback);
            if (this._listeningTo.get(emitterNode.id).get(eventName).size === 0) {
                this._listeningTo.get(emitterNode.id).delete(eventName);
            }
            if (this._listeningTo.get(emitterNode.id).size === 0) {
                this._listeningTo.delete(emitterNode.id);
            }
        }
    }
}
