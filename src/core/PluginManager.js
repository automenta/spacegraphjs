import { Plugin } from './Plugin.js';

export class PluginManager {
    space = null;
    plugins = new Map(); // This map stores the plugin instances

    constructor(space) {
        this.space = space;
    }

    /**
     * Adds a plugin to the manager.
     * @param {Plugin} plugin The plugin instance to add.
     */
    add(plugin) {
        if (!(plugin instanceof Plugin)) {
            // Throw an error instead of just warning and returning.
            throw new Error('PluginManager: Attempted to add an object that is not an instance of Plugin.');
        }
        if (this.plugins.has(plugin.getName())) {
            console.warn(`PluginManager: Plugin "${plugin.getName()}" already registered. Overwriting.`);
        }
        this.plugins.set(plugin.getName(), plugin);
    }

    /**
     * Retrieves a plugin by its name.
     * @param {string} name The name of the plugin.
     * @returns {Plugin|undefined} The plugin instance, or undefined if not found.
     */
    getPlugin(name) {
        // Corrected: The comment was about 'pluginMap' which doesn't exist, 'plugins' is the correct map.
        return this.plugins.get(name);
    }

    /**
     * Retrieves all registered plugins as an array.
     * @returns {Plugin[]} An array of all plugin instances.
     */
    getAllPlugins() {
        return Array.from(this.plugins.values());
    }

    /**
     * Initializes all registered plugins by calling their init() method.
     * Plugins are initialized in the order they were added.
     */
    async initPlugins() {
        for (const plugin of this.plugins.values()) {
            await plugin.init?.(); // Call init if it exists
        }
    }

    /**
     * Updates all registered plugins by calling their update() method.
     * This is typically called once per animation frame.
     */
    updatePlugins() {
        for (const plugin of this.plugins.values()) {
            plugin.update?.(); // Call update if it exists
        }
    }

    /**
     * Disposes of all registered plugins by calling their dispose() method
     * and clears the plugin map.
     */
    disposePlugins() {
        // Iterate in reverse order for disposal if dependencies are a concern,
        // but current implementation iterates in insertion order.
        // For now, matching the current iteration order of Map.values()
        // which is insertion order.
        for (const plugin of this.plugins.values()) {
            plugin.dispose?.(); // Call dispose if it exists
        }
        this.plugins.clear();
    }
}
