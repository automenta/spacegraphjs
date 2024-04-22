class View {
    match(obj) { return 0; }
    render(obj) { return $('<div>'); }
}

function isString(obj) {
    return typeof obj === 'string';
}

function isURL(obj) {
    return isString(obj) && (obj.startsWith('http://') || obj.startsWith('https://'));
}

function isURLImage(obj) {
    return obj.endsWith('.png') || obj.endsWith('.jpg') || obj.endsWith('.gif') || obj.endsWith(".webp");
}


class TextView extends View {
    match(obj) { return isString(obj) && !isURL(obj) ? 1 : 0; }
    render(obj) { return $('<div>').text(obj); }
}


class URLView extends View {
    match(obj) { return isURL(obj) && !isURLImage(obj) ? 1 : 0; }
    render(obj) { return $('<iframe>').attr({ src: obj, width: '300px', height: '200px' }); }
}

class ImageView extends View {
    match(obj) { return isURL(obj) && isURLImage(obj) ? 1 : 0; }
    render(obj) { return $('<img>').attr('src', obj).css({ width: '100%', minWidth: '300px', minHeight: '50px', height: 'auto' }); }
}

class JsonView extends View {
    match(obj) { return typeof obj === 'object' && !Array.isArray(obj) ? 1 : 0; }
    render(obj) { return $('<pre>').text(JSON.stringify(obj, null, 2)); }
}

class ArrayView extends View {
    match(obj) { return Array.isArray(obj) ? 1 : 0; }
    render(obj) {
        const container = $('<div>', { class: 'array-container' });
        const header = $('<div>', { class: 'array-header' }).text('Array');
        const itemList = $('<ul>', { class: 'array-item-list' });

        obj.forEach(item => {
            const listItem = $('<li>', { class: 'array-item' });
            listItem.append(render(item));
            itemList.append(listItem);
        });

        container.append(header, itemList);
        return container;
    }
}

class MapView extends View {
    match(obj) { return obj instanceof Map ? 1 : 0; }
    render(obj) {
        const table = $('<table>');
        obj.forEach((value, key) => table.append($('<tr>').append($('<td>').text(key), $('<td>').append(render(value)))));
        return table;
    }
}


class NumberView extends View {
    match(obj) { return typeof obj === 'number' ? 1 : 0; }
    render(obj) { return $('<div>').text(obj.toLocaleString()); }
}
class ExpressionView extends View {
    match(obj) { return isString(obj) && obj.trim().startsWith('function') ? 1 : 0; }
    render(obj) {
        const func = new Function('return (' + obj + ')();');
        return $('<div>').text(func());
    }
}
class YouTubeVideoView extends View {
    match(obj) { return isURL(obj) && (obj.includes('youtube.com') || obj.includes('youtu.be')) ? 2 : 0; }
    render(obj) {
        const videoId = obj.split(obj.includes('youtu.be') ? 'youtu.be/' : 'v=')[1].split('&')[0];
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        return $('<iframe>').attr({
            src: embedUrl,
            width: '560',
            height: '315',
            frameborder: '0',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
            allowfullscreen: true,
            referrerPolicy: '"strict-origin-when-cross-origin" allowFullScreen'
        });
        //TODO move this to a different view:
        //} else {
        //OTHER video files
        //   return $('<video controls>').attr({ src: obj, width: '100%' });
        //}
    }
}

class UnifiedContextMenu {
    constructor() {
        this.menuElement = null;
    }

    show(node) {
        this.close(); // Close any existing menu before showing a new one
        this.menuElement = this.createMenu(node);
        this.positionMenu(node);
        $('body').append(this.menuElement);
        //$(document).on('click', this.close);
    }

    createMenu(node) {
        let menu = $('<div>', { class: 'context-menu', style: 'position: absolute; z-index: 100; background: white; border: 1px solid #ccc; padding: 0.5em;' });

        menu.append($('<button>').html('x').click(()=>this.close()));

        // Populate menu with dynamic items based on the node
        menu.append(this.createMenuItem('Edit', () => this.editAction(node)));
        menu.append(this.createMenuItem('Delete', () => this.deleteAction(node)));

        // Adding a click listener to the menu to prevent it from closing when clicked inside
        menu.on('click', (e) => {
            e.stopPropagation();
        });

        return menu;
    }

    createMenuItem(text, action) {
        return $('<button>').text(text).on('click', (e) => {
            e.stopPropagation();
            action();
            this.close();
        });
    }

    positionMenu(node) {
        const offset = $(node).offset();
        const menuWidth = this.menuElement.outerWidth();
        const menuHeight = this.menuElement.outerHeight();
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();

        let left = offset.left + 10;
        let top = offset.top + 10;

        // Adjust the position if the menu would overflow the window
        if (left + menuWidth > windowWidth) {
            left = windowWidth - menuWidth - 10;
        }
        if (top + menuHeight > windowHeight) {
            top = windowHeight - menuHeight - 10;
        }

        this.menuElement.css({ top: top, left: left });
    }

    close() {
        if (this.menuElement) {
            this.menuElement.remove();
            this.menuElement = null;
            //$(document).off('click', this.close); // Unbind when the menu is closed
        }
    }

    editAction(node) {
        console.log('Editing:', node);
        // Implement edit logic
    }

    deleteAction(node) {
        console.log('Deleting:', node);
        // Implement delete logic
    }
}

class Frame {
    constructor(obj, views) {
        this.obj = obj;
        this.views = views;
        this.currentView = views[0];
        this.contextMenu = null;
    }

    render() {
        const frame = $('<div>', { class: 'frame' });
        const contentContainer = $('<div>', { class: 'content-container' }).append(this.currentView.render(this.obj));

        frame.on('contextmenu', (e) => {
            e.preventDefault();
            if (this.contextMenu) {
                this.contextMenu.close();
                this.contextMenu = null;
            } else {
                this.contextMenu = new UnifiedContextMenu();
                this.contextMenu.show(frame);
            }
        });

        frame.append(contentContainer);
        return frame;
    }
    createSelectElement() {
        const select = $('<select>');
        this.views.forEach((view, index) => select.append($('<option>', { value: index, text: view.constructor.name })));
        select.on('change', () => {
            this.currentView = this.views[select.val()];
            this.contentContainer.empty().append(this.currentView.render(this.obj));
        });
        return select;
    }

    createScaleSlider() {
        const cc = this.contentContainer;
        const originalSize = this.originalSize;
        const scaleSlider = $('<input type="range" min="0.5" max="2" step="0.05" value="1" style="width:100%;">').on('input', function(){
            const scale = parseFloat(this.value);

            /* Alternative Scaling Methods
                Instead of using CSS transform, consider directly manipulating the relevant styling properties like width, height, and font-size. This approach will cause reflow and adjustments in the document's layout, effectively resizing the content as if it were naturally that size.

                3. JavaScript-driven Layout Adjustments
                A more complex, but flexible solution involves using JavaScript to dynamically calculate and adjust the spacing around the transformed element based on its visual size. This can be done by listening to size changes and adjusting the margins or positioning accordingly.

                4. Use CSS Grid or Flexbox
                For layouts that might benefit from dynamic resizing, using a layout system like CSS Grid or Flexbox can help by allowing elements to grow and shrink within the confines of a more flexible container. This doesn't solve the transform issue directly but can make the surrounding layout more adaptive.

                Each of these solutions has its trade-offs between simplicity, performance, and flexibility. You'll need to choose based on the specific needs and constraints of your project. */
            cc.css({
                'transform': `scale(${scale})`,
                'width': originalSize.width * scale,
                'height': originalSize.height * scale
            });
        });
        return scaleSlider;
    }
}


const Views = [
    new TextView(), new URLView(), new ImageView(), new JsonView(), new ArrayView(), new MapView(), new NumberView(),
    new ExpressionView(), new YouTubeVideoView()
];

function render(obj) {
    if (obj instanceof HTMLElement) return obj;
    if (obj.jquery) return obj[0]; //unwrap jquery element

    const matched = Views.map(view => ({ view, match: view.match(obj) })).filter(vm => vm.match > 0);
    matched.sort((a, b) => b.match - a.match);
    //return matched.length > 1 ?
    return new Frame(obj, matched.map(vm => vm.view)).render();
        //matched[0].view.render(obj);
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
