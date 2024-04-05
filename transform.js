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

    commit() {
        //TODO only if any TransformPlugin's have changed
        new TransformUI(this);
    }
}

class TransformUI {
    constructor(pluginRegistry) {
        this.pluginRegistry = pluginRegistry;
        this.initUI();
    }

    initUI() {
        $('#transformer-ui').empty().append(`
            <h2>Data Transform</h2>
            <select id="data-processing-options"></select>
            <button id="run-button">Run</button>
            <button id="save-transform-button" style="display:none;">Save</button>
            <h3>Preview:</h3>
            <div id="preview"></div>
        `);
        this.populateDataProcessingOptions();
        this.setupEventListeners();
    }

    populateDataProcessingOptions() {
        const options = this.pluginRegistry.getAllPlugins().map(plugin =>
            `<option value="${plugin.name}">${plugin.name}</option>`
        ).join('');
        $('#data-processing-options').html(options);
    }

    setupEventListeners() {
        $('#run-button').click(() => this.runTransform());
        // Additional listeners as needed
    }

    async runTransform() {
        const pluginName = $('#data-processing-options').val();
        const plugin = this.pluginRegistry.getPluginByName(pluginName);

        if (!plugin) return this.showFeedback('Plugin not found', 'error');

        $('#run-button').prop('disabled', true);
        try {
            const content = await plugin.run($('#editor').val());
            $('#preview').text(content);
            $('#save-transform-button').show();
            this.showFeedback('Transformation complete', 'success');
        } catch (error) {
            this.showFeedback('Error during transformation', 'error');
        } finally {
            $('#run-button').prop('disabled', false);
        }
    }

    showFeedback(message, type) {
        // Implement as needed; for now, simple console log
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}
