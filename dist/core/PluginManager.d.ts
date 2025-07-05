export class PluginManager {
    constructor(space: any);
    space: any;
    plugins: Map<any, any>;
    /**
     * Adds a plugin to the manager.
     * @param {Plugin} plugin The plugin instance to add.
     */
    add(plugin: Plugin): void;
    /**
     * Retrieves a plugin by its name.
     * @param {string} name The name of the plugin.
     * @returns {Plugin|undefined} The plugin instance, or undefined if not found.
     */
    getPlugin(name: string): Plugin | undefined;
    /**
     * Retrieves all registered plugins as an array.
     * @returns {Plugin[]} An array of all plugin instances.
     */
    getAllPlugins(): Plugin[];
    /**
     * Initializes all registered plugins by calling their init() method.
     * Plugins are initialized in the order they were added.
     */
    initPlugins(): Promise<void>;
    /**
     * Updates all registered plugins by calling their update() method.
     * This is typically called once per animation frame.
     */
    updatePlugins(): void;
    /**
     * Disposes of all registered plugins by calling their dispose() method
     * and clears the plugin map.
     */
    disposePlugins(): void;
}
import { Plugin } from './Plugin.js';
