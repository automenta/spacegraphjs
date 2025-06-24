export class PluginManager {
    space = null;
    plugins = [];
    pluginMap = new Map();

    constructor(spaceGraphInstance) {
        this.space = spaceGraphInstance;
    }

    add(pluginInstance) {
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
    }

    async initPlugins() {
        for (const plugin of this.plugins) {
            try {
                if (typeof plugin.init === 'function') {
                    await plugin.init();
                }
            } catch (error) {
                console.error(`PluginManager: Error initializing plugin "${plugin.getName()}":`, error);
            }
        }
    }

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

    disposePlugins() {
        for (let i = this.plugins.length - 1; i >= 0; i--) {
            const plugin = this.plugins[i];
            try {
                plugin.dispose();
            } catch (error) {
                console.error(`PluginManager: Error disposing plugin "${plugin.getName()}":`, error);
            }
        }
        this.plugins = [];
        this.pluginMap.clear();
        this.space = null;
    }

    getPlugin(name) {
        return this.pluginMap.get(name);
    }

    getAllPlugins() {
        return [...this.plugins];
    }
}
