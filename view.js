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

class Frame {
    constructor(obj, views) {
        this.obj = obj;
        this.views = views;
        this.currentView = views[0];
        this.frameMenu = null;
        this.contentContainer = null;
    }

    render() {
        const frame = $('<div class="frame" style="border: 1px solid transparent; transition: border-color 0.3s; position: relative;">');
        const contentContainer = this.contentContainer =
            $('<div class="content-container">')
                .append(this.currentView.render(this.obj));


        const menuButton = $('<button class="frameMenuButton" style="position: absolute; top: 5px; left: 5px; z-index: 50;">&#9776;</button>').on('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling to frame hover out
            if (this.frameMenu) {
                this.frameMenu.remove();
                this.frameMenu = null;
            } else {
                this.originalSize = { width: contentContainer.width(), height: contentContainer.height() };
                frame.append(this.frameMenu = this.createMenu(frame, contentContainer));
            }
        });

        frame.append(menuButton, contentContainer);

        // Toggle visibility of menu button on hover
        frame.hover(
            function(e) {
                e.stopPropagation();
                menuButton.show();
                frame.css('border-color', '#ccc'); // Show border on hover
            },
            function() {
                menuButton.hide();
                frame.css('border-color', 'transparent'); // Hide border when not hovering
                if (this.frameMenu) {
                    this.frameMenu.remove();
                    this.frameMenu = null;
                }
            }
        );

        return frame;
    }

    createMenu(frame, contentContainer) {
        const menu = $('<div class="frameMenu" style="position: absolute; top: 10px; left: 10px; background: white; border: 1px solid #ccc; padding: 10px; z-index: 100;">');
        if (this.views.length > 1)
            menu.append(this.createSelectElement());

        menu.append(this.createScaleSlider());
        return menu;
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
