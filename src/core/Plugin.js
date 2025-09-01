export class Plugin {
    space = null;
    pluginManager = null;

    constructor(spaceGraphInstance, pluginManagerInstance) {
        this.space = spaceGraphInstance;
        this.pluginManager = pluginManagerInstance;
    }

    init() {
    }

    update() {
    }

    dispose() {
        this.space = null;
        this.pluginManager = null;
    }

    getName() {
        return this.constructor.name;
    }
}
