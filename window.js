class WindowNode {
    constructor(id, content, s,  cfg = {}) {
        this.id = id;
        this.cfg = cfg;
        this.ports = cfg.ports;

        this.content = //typeof content === 'string' ?
            //$('<div class="node-content-inner" contenteditable="true">').text(content) :
            $(content);

        this.menuFrame = $('<div class="node-menu-frame">');
        this.menuFrame.hide();

        this.dom = $('<div class="node-content">').append(this.content, this.menuFrame, newResizeGrip());

        const editButton = $('<button id="edit-button">&#128394;</button>')
            .on('click', () => editorShow(x => this.content.text(x), this.content.text()));

        const removeButton = $('<button id="remove-button">&#128465;</button>')
            .on('click', () => s.removeNodeConfirm(id));

        const transformButton = $('<button id="transform-button">&#9881;</button>')
            .on('click', () => s.openTransformer(id));

        const contextMenuButton = $('<button id="context-menu-button">&#9776;</button>')
            .on('click', (e) => {
                e.stopPropagation(); // Prevent the canvas click handler from firing
                this.openContextMenu();
            });
        this.menuFrame.append(transformButton, editButton, removeButton, contextMenuButton);

        let compound = this.ports && this.ports.length > 0;
        if (compound) {
            compound = s.cy.add({
                group: 'nodes',
                classes: compound ? 'compound' : '',
                grabbable: false,
                selectable: false
            });
        }

        this.node = s.cy.add({
            group: 'nodes',
            data: { id: this.id, dom: this.dom[0], domNode: this, parent: (compound ? compound.id() : undefined) },
        });

        this.ports = compound ? this.ports.map(port => {
            return s.cy.add({
                group: 'nodes',
                classes: 'port',
                grabbable: false,
                data: {
                    id: `${this.id}-${port.id || uuid()}`,
                    parent: compound.id(),
                    label: port.label || '',
                    relativePosition: port.relativePosition
                }
            });
        }) : undefined;

        this.node.data('ports', this.ports);
    }

    openContextMenu() {
        new UnifiedContextMenu().show(this.menuFrame);
    }

}




function newResizeGrip() {
    function gCls(x) {
        return '<div class="resize-grip resize-grip-' + x + '"></div>';
    }

    function startResize(event) {
        if(event.button !== 0) return; // Ignore right-clicks

        const DOM = $(event.target.parentNode.parentNode);
        const gripClass = event.target.classList[1];

        const startWidth = DOM.width(), startHeight = DOM.height();
        const startX = event.clientX,   startY = event.clientY;

        const L = gripClass.includes('left'), T = gripClass.includes('top');

        function resize(event) {
            const dx = event.clientX - startX, dy = event.clientY - startY;

            let newWidth, newHeight;

            if (L) {
                newWidth = startWidth - dx;
                //DOM.css('left', `+=${deltaX}`/*px*/); //?
            } else {
                newWidth = startWidth + dx;
            }

            if (T) {
                newHeight = startHeight - dy;
                //DOM.css('top', `+=${deltaY}`/*px*/); //?
            } else {
                newHeight = startHeight + dy;
            }

            DOM.css({
                width: newWidth, // + 'px',
                height: newHeight// + 'px'
            });
        }

        const BODY = $('body'), DOC = $(document);
        BODY.addClass('no-select');

        function stopResize() {
            DOC.off('mousemove', resize).off('mouseup', stopResize);
            BODY.removeClass('no-select');
        }

        DOC.on('mousemove', resize).on('mouseup', stopResize);
    }

    return $('<div class="resize-grips">').append(
        gCls('top-left'),    gCls('top-right'),
        gCls('bottom-left'), gCls('bottom-right'),
    ).on('mousedown', startResize);
}

