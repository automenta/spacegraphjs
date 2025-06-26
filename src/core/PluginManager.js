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
            console.warn('PluginManager: Attempted to add a non-Plugin object.');
            return;
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
        // FIX: Corrected the map name from 'pluginMap' to 'plugins'
        return this.plugins.get(name);
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
        for (const plugin of this.plugins.values()) {
            plugin.dispose?.(); // Call dispose if it exists
        }
        this.plugins.clear();
    }
}
