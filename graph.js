"use strict";

const editorShow = (callback, initialText = '') => {
    const editorHide = () => $('#editor-popup, #editor-overlay').hide();

    $('#editor').val(initialText);
    $('#editor-popup, #editor-overlay').show();

    $('#save-button').off('click').on('click', () => {
        callback($('#editor').val());
        editorHide();
    });

    $('#cancel-button').off('click').on('click', editorHide);
};


class WindowNode {
    constructor(content) {
        this.inner = typeof content === 'string' ?
            $('<div class="node-content-inner" contenteditable="true">').append(content) :
            $(content);

        this.menuFrame = $('<div class="node-menu-frame">');

        this.dom = $('<div class="node-content">').append(
            this.inner, this.menuFrame, newResizeGrip());

    }

    /** TODO make MenuFrame singleton/shared, or lazily constructed */
    start(node, nodeManager) {

        function dummyContent() {
            const dummyPhrases = [
                'Lorem ipsum dolor sit amet',
                'Consectetur adipiscing elit'
            ];
            return dummyPhrases[Math.floor(Math.random() * dummyPhrases.length)];
        }

        const editButton = $('<button id="edit-button">&#128394;</button>')
            .on('click', () => editorShow(x => this.inner.text(x), this.inner.text()));

        const removeButton = $('<button id="remove-button">&#128465;</button>')
            .on('click', () => nodeManager.removeNodeConfirm(node));

        const transformButton = $('<button id="transform-button">&#9881;</button>')
            .on('click', () => nodeManager.openTransformer(node));

        this.menuFrame.append(transformButton, editButton, removeButton);
    }
}


function startResize(event) {
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

function newResizeGrip() {
    function gCls(x) {
        return '<div class="resize-grip resize-grip-' + x + '"></div>';
    }

    return $('<div class="resize-grips">').append(
        gCls('top-left'),    gCls('top-right'),
        gCls('bottom-left'), gCls('bottom-right'),
    ).on('mousedown', startResize);
}


const p = new Plugins();
p.add(new TransformPlugin('uppercase', async x => x.toUpperCase()));
p.add(new TransformPlugin('lowercase', async x => x.toLowerCase()));
//p.add(new TransformPlugin('reverse',   async TODO));

let transformUI;
document.addEventListener('DOMContentLoaded', () => {
    transformUI = new TransformUI(p);
});


class SpaceGraph {
    constructor(target) {
        const cy = cytoscape({
            container: target[0],
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': 'white',
                        'padding': '4px',
                        'shape': 'rectangle'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'curve-style': 'bezier',
                        'target-arrow-shape': 'triangle',
                        'label': 'data(content)',
                        'text-wrap': 'wrap',
                        'text-max-width': '200px',
                        'font-size': '12px',
                        'text-margin-x': '10px', 'text-margin-y': '10px',
                        'text-rotation': 'autorotate'
                    }
                }
            ]
        });
        cy.domNode();
        cy.on('tap', 'node', this.onNodeTap.bind(this));
        cy.on('tap', this.onCanvasTap.bind(this));
        cy.on('dragfreeon', 'node', this.menuHide.bind(this));
        cy.on('dbltap', this.addNodeAtCursor.bind(this));
        cy.on('mouseover', 'node', this.onNodeMouseOver.bind(this));
        cy.on('mouseout', 'node', this.onNodeMouseOut.bind(this));
        cy.on('cxttap', 'node', this.onNodeRightClick.bind(this));

        this.cy = cy;
    }

    addNode(content) {
        const node = new WindowNode(content);
        const dom = node.dom[0];

        const cyNode = this.cy.add({
            group: 'nodes',
            data: { id: uuid(), dom: dom, domNode: node }
        });

        node.start(cyNode, this);

        return cyNode;
    }

    removeNode(node) {
        this.cy.remove(node);
    }

    removeNodeConfirm(node) {
        if (confirm('Are you sure you want to remove this node?'))
            removeNode(node);
    }

    spawnLinkedNode(parentNode, content, edgeLabel) {
        const newNode = this.addNode(content);
        newNode.position({
            x: parentNode.position('x') + parentNode.outerWidth() + 100,
            y: parentNode.position('y')
        });

        this.cy.add({
            group: 'edges',
            data: {
                id: 'e' + uuid(),
                source: parentNode.id(),
                target: newNode.id(),
                content: edgeLabel
            }
        });
    }

    onNodeTap(evt) {
        const n = evt.target;
        const f = n.data('domNode').menuFrame;

        const nw = n.outerWidth(), nh = n.outerHeight();
        const np = n.renderedPosition();
        f.css({
            display: 'block',
            left: np.x + nw / 2,
            top:  np.y - nh / 2 - f.outerHeight()
        });
    }


    onCanvasTap(evt) {
        if (evt.target === this.cy) {
            this.menuHide();
        }
    }

    menuHide() {
        $('#menu-frame').hide();
    }

    addNodeAtCursor(evt) {
        if (evt.target === this.cy) {
            editorShow((txt) => {
                const newNode = this.addNode(txt);
                newNode.position(evt.position);
            });
        }
    }

    onNodeMouseOver(evt) {
        evt.target.style('border-width', '3px');
    }

    onNodeMouseOut(evt) {
        evt.target.style('border-width', '1px');
    }

    onNodeRightClick(evt) {
        //TODO fix, not zooming to target correctly.
        const node = evt.target;
        const zoom = this.cy.zoom();
        const scale = 1.2;
        const diffScale = scale - zoom;
        const pos = node.position();
        const offsetX = (node.width() * diffScale) / 2;
        const offsetY = (node.height() * diffScale) / 2;

        this.cy.animate({
            zoom: scale,
            center: {
                x: pos.x - offsetX,
                y: pos.y - offsetY
            }
        }, {
            duration: 200
        });
    }

    openTransformer(node) {
        const nodeContent = node.data('domNode').inner.text();
        transformUI.input = nodeContent;
        transformUI.onOutput = (y, outputMode) => {
            if (outputMode === 'new-node')
                this.spawnLinkedNode(node, y, '');
            else if (outputMode === 'replace-content')
                node.data('domNode').inner.text(y);
            else
                console.error('todo outputMode', outputMode);
        };
        $('#transformer-ui').show();
    }
}

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});

