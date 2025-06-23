/**
 * @file Defines the base Plugin class for SpaceGraph.
 * @licence MIT
 */

/**
 * Represents a base class for all plugins in SpaceGraph.
 * Plugins are modules that extend the core functionality of SpaceGraph.
 */
export class Plugin {
    /**
     * The SpaceGraph instance this plugin is registered with.
     * @type {import('./SpaceGraph.js').SpaceGraph | null}
     */
    space = null;

    /**
     * The PluginManager instance managing this plugin.
     * @type {import('./PluginManager.js').PluginManager | null}
     */
    pluginManager = null;

    /**
     * Creates an instance of a Plugin.
     * @param {import('./SpaceGraph.js').SpaceGraph} spaceGraphInstance - The main SpaceGraph application instance.
     * @param {import('./PluginManager.js').PluginManager} pluginManagerInstance - The plugin manager for this SpaceGraph instance.
     */
    constructor(spaceGraphInstance, pluginManagerInstance) {
        this.space = spaceGraphInstance;
        this.pluginManager = pluginManagerInstance;
    }

    /**
     * Initializes the plugin. This method is called after all plugins
     * have been registered and basic systems are available.
     * Subclasses should override this method to perform their specific setup.
     * @abstract
     */
    init() {
        // console.log(`Initializing plugin: ${this.constructor.name}`);
    }

    /**
     * Called when the plugin needs to perform updates, typically on each animation frame.
     * Subclasses can override this if they need frequent updates.
     */
    update() {
        // Override in subclasses if needed
    }

    /**
     * Disposes of the plugin, cleaning up any resources it holds.
     * Subclasses should override this method to perform their specific cleanup.
     * @abstract
     */
    dispose() {
        // console.log(`Disposing plugin: ${this.constructor.name}`);
        this.space = null;
        this.pluginManager = null;
    }

    /**
     * A unique name for the plugin. Primarily for debugging or retrieval.
     * Subclasses should override this.
     * @returns {string} The name of the plugin.
     */
    getName() {
        return this.constructor.name;
    }
}
