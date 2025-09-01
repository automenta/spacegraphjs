import { Plugin } from "./Plugin.js";

export class PluginManager {
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
   * Plugins are initialized in a specific order to ensure dependencies are met.
   */
  async initPlugins() {
    // Define initialization order to ensure dependencies are met
    const initOrder = [
      "CameraPlugin",     // Camera first as other plugins depend on it
      "RenderingPlugin",  // Rendering depends on Camera
      "NodePlugin",       // Node plugin
      "EdgePlugin",       // Edge plugin depends on Node
      "LayoutPlugin",     // Layout depends on Node/Edge
      "UIPlugin",         // UI depends on other components
      "MinimapPlugin",    // Minimap depends on Camera and Node
      "DataPlugin",       // Data plugin
      "FractalZoomPlugin", // Fractal zoom
      "PerformancePlugin" // Performance monitoring last
    ];

    // Initialize plugins in the defined order
    for (const pluginName of initOrder) {
      const plugin = this.plugins.get(pluginName);
      if (plugin) {
        await plugin.init?.();
      }
    }

    // Initialize any remaining plugins that weren't in the predefined order
    for (const [name, plugin] of this.plugins) {
      if (!initOrder.includes(name)) {
        await plugin.init?.();
      }
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
    // Iterate in insertion order to match test expectations
    for (const plugin of this.plugins.values()) {
      plugin.dispose?.();
    }
    this.plugins.clear();
  }
}
