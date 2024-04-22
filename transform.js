class TransformPlugin {
    constructor(name, transformFunction) {
        this.name = name;
        this.transformFunction = transformFunction;
    }

    async run(input) {
        return await this.transformFunction(input);
    }
}

class Plugins {
    constructor() {
        this.plugins = new Map();
    }

    add(plugin) {
        this.plugins.set(plugin.name, plugin);
    }

    getPluginByName(name) {
        return this.plugins.get(name);
    }

    getAllPlugins() {
        return Array.from(this.plugins.values());
    }

}

