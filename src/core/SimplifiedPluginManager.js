import { Plugin } from "./Plugin.js";

export class SimplifiedPluginManager {
  space = null;
  plugins = new Map();

  constructor(space) {
    this.space = space;
  }

  /**
   * Adds a plugin to the manager.
   * @param {Plugin} plugin The plugin instance to add.
   */
  add(plugin) {
    if (!(plugin instanceof Plugin)) {
      throw new Error(
        "PluginManager: Attempted to add an object that is not an instance of Plugin.",
      );
    }
    if (this.plugins.has(plugin.getName())) {
      console.warn(
        `PluginManager: Plugin "${plugin.getName()}" already registered. Overwriting.`,
      );
    }
    this.plugins.set(plugin.getName(), plugin);
  }

  /**
   * Retrieves a plugin by its name.
   * @param {string} name The name of the plugin.
   * @returns {Plugin|undefined} The plugin instance, or undefined if not found.
   */
  getPlugin(name) {
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
    // Group plugins by type for more efficient initialization
    const renderingPlugins = [];
    const logicPlugins = [];

    for (const plugin of this.plugins.values()) {
      if (plugin.getName().includes("Rendering")) {
        renderingPlugins.push(plugin);
      } else {
        logicPlugins.push(plugin);
      }
    }

    // Initialize rendering plugins first
    for (const plugin of renderingPlugins) {
      await plugin.init?.();
    }

    // Then initialize logic plugins
    for (const plugin of logicPlugins) {
      await plugin.init?.();
    }
  }

  /**
   * Updates all registered plugins by calling their update() method.
   * This is typically called once per animation frame.
   */
  updatePlugins() {
    // Update plugins in batches to improve performance
    const batchSize = 5;
    const pluginArray = Array.from(this.plugins.values());

    for (let i = 0; i < pluginArray.length; i += batchSize) {
      const batch = pluginArray.slice(i, i + batchSize);
      batch.forEach((plugin) => {
        plugin.update?.();
      });
    }
  }

  /**
   * Disposes of all registered plugins by calling their dispose() method
   * and clears the plugin map.
   */
  disposePlugins() {
    // Dispose in reverse order
    const pluginsArray = Array.from(this.plugins.values()).reverse();
    for (const plugin of pluginsArray) {
      plugin.dispose?.();
    }
    this.plugins.clear();
  }
}
