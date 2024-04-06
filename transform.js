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

class TransformUI {
    constructor(pluginRegistry) {
        this.pluginRegistry = pluginRegistry;
        $('#transformer-ui').empty().append(`
            <h2>Data Transform</h2>
            <select id="data-processing-options"></select>
            <button id="run-button">Run</button>
            <div id="output-options-section" style="display:none;">
                <label for="output-options">Output Options:</label>
                <select id="output-options">
                    <option value="new-node">Create New Node</option>
                    <option value="replace-content">Replace Current Node Content</option>
                </select>
            </div>
            <h3>Preview:</h3>
            <div id="preview" style="display:none;"></div>
            <button id="save-transform-button">Save</button>
            <button id="close-transform-button" style="position:absolute; right:0; top:0;">X</button>
        `);
        this.populateDataProcessingOptions();
        this.setupEventListeners();
    }

    populateDataProcessingOptions() {
        const options = this.pluginRegistry.getAllPlugins().map(plugin =>
            `<option value="${plugin.name}">${plugin.name}</option>`
        ).join('');
        $('#data-processing-options').html(options);
        // Re-bind the change event to hide Output Options and Preview on option change
        $('#data-processing-options').change(() => {
            $('#output-options-section').hide();
            $('#preview').hide();
            // Reset Save button visibility
            $('#save-transform-button').hide();
        });
    }

    saveTransform() {
        const outputMode = $('#output-options').val();
        this.onOutput(this.output, outputMode)
        this.closeTransform();
    }

    closeTransform() {
        $('#transformer-ui').hide();
        this.input = null;
        this.output = null;
        this.onOutput = null;
    }

    setupEventListeners() {
        $('#run-button').click(this.runTransform.bind(this));
        $('#save-transform-button').click(this.saveTransform.bind(this));
        $('#close-transform-button').click(this.closeTransform.bind(this));
        $('#data-processing-options').change(() => {
            this.resetUI(); // Additional method to reset UI elements
        });
    }
    resetUI() {
        // Hide Output Options and Preview initially or on options change
        $('#preview').hide();
        $('#output-options-section').hide();
        $('#save-transform-button').hide(); // Ensure this is also hidden if needed
    }
    async runTransform() {
        const pluginName = $('#data-processing-options').val();
        const plugin = this.pluginRegistry.getPluginByName(pluginName);

        if (!plugin) return this.showFeedback('Plugin not found', 'error');

        $('#run-button').prop('disabled', true);
        try {
            const content = await plugin.run(this.input);
            if (content) {
                this.output = content;
                $('#preview').text(content).show();
                $('#output-options-section').show(); // Only show after successful transform
                $('#save-transform-button').show();
                this.showFeedback('Transformation complete', 'success');
            }
        } catch (error) {
            this.showFeedback('Error during transformation:' + error, 'error');
        } finally {
            $('#run-button').prop('disabled', false);
        }
    }

    showFeedback(message, type) {
        const feedbackDiv = $('<div>').addClass('feedback-message').text(message);
        if (type === 'error') {
            feedbackDiv.css('background', '#dc3545'); // Red for errors
        }
        $('body').append(feedbackDiv);
        setTimeout(() => feedbackDiv.remove(), 3000); // Remove after 3 seconds
    }
}
