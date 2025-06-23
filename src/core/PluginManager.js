/**
 * @file Defines the PluginManager class for SpaceGraph.
 * @licence MIT
 */

/**
 * Manages the lifecycle of plugins within a SpaceGraph instance.
 * It handles registration, initialization, and disposal of plugins.
 */
export class PluginManager {
    /**
     * The SpaceGraph instance this plugin manager is associated with.
     * @type {import('./SpaceGraph.js').SpaceGraph | null}
     */
    space = null;

    /**
     * A list of registered plugin instances.
     * @type {import('./Plugin.js').Plugin[]}
     */
    plugins = [];

    /**
     * A map of registered plugin instances by their name for quick retrieval.
     * @type {Map<string, import('./Plugin.js').Plugin>}
     */
    pluginMap = new Map();

    /**
     * Creates an instance of PluginManager.
     * @param {import('./SpaceGraph.js').SpaceGraph} spaceGraphInstance - The main SpaceGraph application instance.
     */
    constructor(spaceGraphInstance) {
        this.space = spaceGraphInstance;
    }

    /**
     * Registers a plugin.
     * The plugin should be an instance of a class that extends `Plugin`.
     * @param {import('./Plugin.js').Plugin} pluginInstance - The plugin instance to register.
     */
    registerPlugin(pluginInstance) {
        if (!pluginInstance || typeof pluginInstance.getName !== 'function') {
            console.error('PluginManager: Attempted to register an invalid plugin.', pluginInstance);
            return;
        }

        const name = pluginInstance.getName();
        if (this.pluginMap.has(name)) {
            console.warn(`PluginManager: Plugin with name "${name}" is already registered. Skipping.`);
            return;
        }

        this.plugins.push(pluginInstance);
        this.pluginMap.set(name, pluginInstance);
        // console.log(`PluginManager: Registered plugin "${name}".`);
    }

    /**
     * Initializes all registered plugins.
     * This is typically called by SpaceGraph after its own core setup is complete.
     */
    initPlugins() {
        // console.log('PluginManager: Initializing all plugins...');
        for (const plugin of this.plugins) {
            try {
                plugin.init();
            } catch (error) {
                console.error(`PluginManager: Error initializing plugin "${plugin.getName()}":`, error);
            }
        }
        // console.log('PluginManager: All plugins initialized.');
    }

    /**
     * Calls the update method on all registered plugins.
     * This is typically called within the main render/animation loop.
     */
    updatePlugins() {
        for (const plugin of this.plugins) {
            try {
                if (typeof plugin.update === 'function') {
                    plugin.update();
                }
            } catch (error) {
                console.error(`PluginManager: Error updating plugin "${plugin.getName()}":`, error);
            }
        }
    }

    /**
     * Disposes all registered plugins, allowing them to clean up resources.
     * This is typically called when the SpaceGraph instance is being destroyed.
     */
    disposePlugins() {
        // console.log('PluginManager: Disposing all plugins...');
        // Dispose in reverse order of registration
        for (let i = this.plugins.length - 1; i >= 0; i--) {
            const plugin = this.plugins[i];
            try {
                plugin.dispose();
            } catch (error)
                {
                console.error(`PluginManager: Error disposing plugin "${plugin.getName()}":`, error);
            }
        }
        this.plugins = [];
        this.pluginMap.clear();
        this.space = null;
        // console.log('PluginManager: All plugins disposed.');
    }

    /**
     * Retrieves a plugin instance by its name.
     * @param {string} name - The name of the plugin to retrieve.
     * @returns {import('./Plugin.js').Plugin | undefined} The plugin instance, or undefined if not found.
     */
    getPlugin(name) {
        return this.pluginMap.get(name);
    }

    /**
     * Retrieves all registered plugin instances.
     * @returns {import('./Plugin.js').Plugin[]} An array of plugin instances.
     */
    getAllPlugins() {
        return [...this.plugins];
    }
}
