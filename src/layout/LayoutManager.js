/**
 * @file LayoutManager.js - Manages different layout algorithms for SpaceGraph.
 * @licence MIT
 */

import { gsap } from 'gsap';

export class LayoutManager {
    constructor(space, pluginManager) {
        this.space = space; // SpaceGraph instance
        this.pluginManager = pluginManager; // To get nodes/edges if needed by layouts
        this.layouts = new Map(); // Stores registered layout algorithms { name: instance }
        this.activeLayout = null;
        this.activeLayoutName = null;
    }

    /**
     * Registers a layout algorithm.
     * @param {string} name - The unique name for the layout (e.g., 'force', 'grid').
     * @param {object} layoutInstance - An instance of the layout algorithm class.
     *                                   It should have methods like init(nodes, edges), run(), stop(), updateConfig().
     */
    registerLayout(name, layoutInstance) {
        if (this.layouts.has(name)) {
            console.warn(`LayoutManager: Layout "${name}" is already registered. Overwriting.`);
        }
        // Ensure layout has access to space/pluginManager if it needs to query graph state
        if (typeof layoutInstance.setContext === 'function') {
            layoutInstance.setContext(this.space, this.pluginManager);
        }
        this.layouts.set(name, layoutInstance);
        // console.log(`LayoutManager: Registered layout "${name}".`);
    }

    /**
     * Switches to and applies a registered layout.
     * @param {string} name - The name of the layout to switch to.
     * @param {object} [config={}] - Optional configuration for the new layout.
     * @returns {boolean} True if layout was switched successfully, false otherwise.
     */
    async applyLayout(name, config = {}) {
        const newLayout = this.layouts.get(name);
        if (!newLayout) {
            console.error(`LayoutManager: Layout "${name}" not found.`);
            return false;
        }

        if (this.activeLayout && typeof this.activeLayout.stop === 'function') {
            this.activeLayout.stop();
            this.space.emit('layout:stopped', { name: this.activeLayoutName, layout: this.activeLayout });
        }

        this.activeLayout = newLayout;
        this.activeLayoutName = name;

        if (typeof this.activeLayout.updateConfig === 'function') {
            this.activeLayout.updateConfig(config);
        }

        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');

        const nodes = nodePlugin ? [...nodePlugin.getNodes().values()] : [];
        const edges = edgePlugin ? [...edgePlugin.getEdges().values()] : [];

        if (typeof this.activeLayout.init === 'function') {
            // Layouts might be async if they do heavy pre-computation.
            // Crucially, layout.init() should calculate and store the target positions for each node.
            // For simplicity, we'll assume layout.init() directly sets node.position to the *target* position.
            // GSAP will then animate from the current node.position to this new target.

            // Store current positions before layout.init potentially changes them
            const oldPositions = new Map();
            nodes.forEach(node => oldPositions.set(node.id, node.position.clone()));

            await this.activeLayout.init(nodes, edges, config); // This should set final node.positions

            // Animate nodes from their old positions to the new ones set by layout.init()
            const animationPromises = [];
            nodes.forEach(node => {
                const currentPos = oldPositions.get(node.id); // The position *before* layout.init
                const targetPos = node.position; // The position *after* layout.init (the target)

                // If layout.init didn't change the position object instance but mutated it,
                // we need to tween from 'currentPos' (cloned old) to 'node.position' (mutated new).
                // To make GSAP work correctly when node.position is the object being changed by the layout,
                // we temporarily set node.position back to old, then tween to target.

                const tempOldPos = currentPos.clone(); // GSAP will animate from this
                node.position.copy(tempOldPos); // Set visual to old position before animation starts

                const promise = new Promise(resolve => {
                    gsap.to(node.position, {
                        x: targetPos.x,
                        y: targetPos.y,
                        z: targetPos.z,
                        duration: 0.7, // Configurable?
                        ease: 'power2.inOut', // Configurable?
                        onUpdate: () => {
                            // For continuous layouts like force-directed, this onUpdate might not be strictly needed
                            // if node.position is the source of truth.
                            // However, if any other system relies on events for position changes:
                            // this.space.emit('node:position:updated', { node });
                        },
                        onComplete: resolve
                    });
                });
                animationPromises.push(promise);
            });

            await Promise.all(animationPromises); // Wait for all animations to complete
        }

        if (typeof this.activeLayout.run === 'function') {
            // For continuous layouts (like ForceLayout), run() starts its own simulation.
            // For static layouts (like Grid), run() might do nothing if init() did all the work.
            this.space.emit('layout:started', { name: this.activeLayoutName, layout: this.activeLayout });
            await this.activeLayout.run(); // run might be async (e.g. ForceLayout.start() is not, but its loop is)
        }
        return true;
    }

    /**
     * Stops the currently active layout.
     */
    stopLayout() {
        if (this.activeLayout && typeof this.activeLayout.stop === 'function') {
            this.activeLayout.stop();
            this.space.emit('layout:stopped', { name: this.activeLayoutName, layout: this.activeLayout });
            // console.log(`LayoutManager: Stopped layout "${this.activeLayoutName}".`);
        }
        // this.activeLayout = null; // Keep activeLayout for potential resume or info, applyLayout will overwrite
    }

    /**
     * Called by LayoutPlugin in its update loop. Delegates to active layout's update method if it exists.
     * This is for layouts that need continuous updates (e.g., physics steps).
     */
    update() {
        if (this.activeLayout && typeof this.activeLayout.update === 'function') {
            this.activeLayout.update(); // Should trigger 'node:position:updated' events or similar
        }
    }

    /**
     * Adds a node to the currently active layout.
     * @param {import('../graph/nodes/BaseNode.js').BaseNode} node
     */
    addNodeToLayout(node) {
        if (this.activeLayout && typeof this.activeLayout.addNode === 'function') {
            this.activeLayout.addNode(node);
        }
    }

    /**
     * Removes a node from the currently active layout.
     * @param {import('../graph/nodes/BaseNode.js').BaseNode} node
     */
    removeNodeFromLayout(node) {
         if (this.activeLayout && typeof this.activeLayout.removeNode === 'function') {
            this.activeLayout.removeNode(node);
        }
    }

    /**
     * Adds an edge to the currently active layout.
     * @param {import('../graph/Edge.js').Edge} edge
     */
    addEdgeToLayout(edge) {
        if (this.activeLayout && typeof this.activeLayout.addEdge === 'function') {
            this.activeLayout.addEdge(edge);
        }
    }

    /**
     * Removes an edge from the currently active layout.
     * @param {import('../graph/Edge.js').Edge} edge
     */
    removeEdgeFromLayout(edge) {
        if (this.activeLayout && typeof this.activeLayout.removeEdge === 'function') {
            this.activeLayout.removeEdge(edge);
        }
    }

    /**
     * "Kicks" or re-heats the layout, e.g., after a structural change.
     */
    kick() {
        if (this.activeLayout && typeof this.activeLayout.kick === 'function') {
            this.activeLayout.kick();
        } else if (this.activeLayout && typeof this.activeLayout.run === 'function' && !this.activeLayout.isRunning?.()) {
            // If layout is not continuous and has a run method, re-run it.
            // This assumes layout.isRunning() method exists or similar check.
            // For simplicity, this might need more robust state checking on the layout itself.
            // console.log(`LayoutManager: Kicking layout ${this.activeLayoutName} by re-running.`);
            // this.applyLayout(this.activeLayoutName, this.activeLayout.getConfig?.());
        }
    }

    /**
     * Gets the currently active layout instance.
     * @returns {object|null}
     */
    getActiveLayout() {
        return this.activeLayout;
    }

    /**
     * Gets the name of the currently active layout.
     * @returns {string|null}
     */
    getActiveLayoutName() {
        return this.activeLayoutName;
    }

    dispose() {
        this.stopLayout();
        this.layouts.forEach(layout => {
            if (typeof layout.dispose === 'function') {
                layout.dispose();
            }
        });
        this.layouts.clear();
        this.activeLayout = null;
        this.activeLayoutName = null;
        this.space = null;
        this.pluginManager = null;
    }
}
