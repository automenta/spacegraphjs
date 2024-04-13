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
        const ul = $('<ul>');
        obj.forEach(item => ul.append($('<li>').append(renderObject(item))));
        return ul;
    }
}

class MapView extends View {
    match(obj) { return obj instanceof Map ? 1 : 0; }
    render(obj) {
        const table = $('<table>');
        obj.forEach((value, key) => table.append($('<tr>').append($('<td>').text(key), $('<td>').append(renderObject(value)))));
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
        console.log(obj, videoId);
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
        // No need to initialize the menuElement or set it as a member since it will be created and destroyed dynamically
    }

    show(node) {
        this.menuElement = this.createMenu(node);
        this.positionMenu(node);
        $('body').append(this.menuElement);
    }

    createMenu(node) {
        let menu = $('<div>', { class: 'context-menu', style: 'position: absolute; z-index: 100; padding: 10px; background: white; border: 1px solid #ccc;' });

        // Populate menu with dynamic items based on the node
        menu.append(this.createMenuItem('Edit', () => this.editAction(node)));
        menu.append(this.createMenuItem('Delete', () => this.deleteAction(node)));

        // Adding a global click listener to handle outside clicks to close the menu
        $(document).on('click', (e) => {
            if (!$(e.target).closest('.context-menu').length) {
                this.close();
            }
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
        this.menuElement.css({ top: offset.top + 30, left: offset.left });  // Adjust top as necessary
    }

    close() {
        if (this.menuElement) {
            this.menuElement.remove();  // Remove the menu from the DOM
            this.menuElement = null;    // Ensure reference is cleared
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
        const frame = $('<div>', { class: 'frame', style: 'border: 1px solid transparent; position: relative;' });
        const contentContainer = $('<div>', { class: 'content-container' }).append(this.currentView.render(this.obj));
        const menuButton = $('<button>', { class: 'menu-toggle-button'}).html('&#9776;');

        menuButton.on('click', (e) => {
            e.stopPropagation();
            if (this.contextMenu) {
                this.contextMenu.close();
                this.contextMenu = null;
            } else
                (this.contextMenu = new UnifiedContextMenu()).show(frame);
        });

        frame.append(menuButton, contentContainer);
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

function renderObject(obj) {
    if (obj instanceof HTMLElement) return obj;
    if (obj.jquery) return obj[0]; //unwrap jquery element

    const matched = Views.map(view => ({ view, match: view.match(obj) })).filter(vm => vm.match > 0);
    matched.sort((a, b) => b.match - a.match);
    //return matched.length > 1 ?
    return new Frame(obj, matched.map(vm => vm.view)).render();
        //matched[0].view.render(obj);
}
