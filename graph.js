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
    constructor(id, content, s, ports = []) {
        this.id = id;
        this.ports = ports;
        //this.spaceGraph = s;

        this.inner = typeof content === 'string' ?
            $('<div class="node-content-inner" contenteditable="true">').text(content) :
            $(content);

        this.menuFrame = $('<div class="node-menu-frame">');
        this.menuFrame.hide();

        this.dom = $('<div class="node-content">').append(this.inner, this.menuFrame, newResizeGrip());

        /*if (ports.length > 0) {
            this.dom.addClass('compound');
            ports.forEach((port) => {
                const portNode = $('<div>').addClass('port').text(port.label);
                this.dom.append(portNode);
            });
        }*/

        const editButton = $('<button id="edit-button">&#128394;</button>')
            .on('click', () => editorShow(x => this.inner.text(x), this.inner.text()));

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
                grabbable: false
            });
        }

        this.node = s.cy.add({
            group: 'nodes',
            data: { id: this.id, dom: this.dom[0], domNode: this, parent: (compound ? compound.id() : undefined) },
        });

        this.ports = compound ? this.ports.map(port => {
            let p = {
                group: 'nodes',
                data: port.data,
                classes: 'port',
                grabbable: false
            };
            p.data.id = `${this.id}-${port.id}`;
            p.data.parent = compound.id();
            //p.data.label = '~';
            return s.cy.add(p);
        }) : undefined;
        this.node.data('ports', this.ports);
    }

    openContextMenu() {
        new UnifiedContextMenu().show(this.menuFrame);
    }

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
            wheelSensitivity: 0.25,
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
                        width: 6,
                        //'curve-style': 'bezier',
                        //'curve-style': 'unbundled-bezier',
                        "curve-style": "unbundled-bezier",
                        "control-point-distances": [40, -40],
                        "control-point-weights": [0.250, 0.75],
                        'line-color': 'green',
                        'target-arrow-color': 'blue',
                        'source-arrow-color': 'red',
                        'target-arrow-shape': 'triangle',
                        //'label': 'data(content)',
                        'text-wrap': 'wrap',
                        'text-max-width': '200px',
                        //'font-size': '12px',
                        'text-margin-x': '10px', 'text-margin-y': '10px',
                        'text-rotation': 'autorotate'
                    }
                }
            ]
        });
        cy.domNode();
        // const eh = cy.edgehandles({
        //     handleNodes: 'port',  // Only nodes with class 'port' will have handles
        //     canConnect: function(sourceNode, targetNode) {
        //         // Allow edge creation only between ports
        //         if (sourceNode == targetNode)  return null;
        //         if (sourceNode.hasClass('port') && targetNode.hasClass('port')) {
        //             return 'flat';  // Returns the type of edges to create between ports
        //         }
        //         return null;  // Prevents edge creation for non-port connections
        //     },
        //     handlePosition: 'middle', // Positions the handle at the middle of the nodes
        //     handleInDrawMode: false,  // Determines if handles should appear in draw mode
        //     complete: function(sourceNode, targetNode, addedEles) {
        //         // Optional: handle completion of edge creation
        //         if (sourceNode.hasClass('port') && targetNode.hasClass('port')) {
        //             addedEles.data('label', 'Connection');
        //         }
        //     },
        //     // Defines the edge type for the newly created edges
        //     edgeParams: function(sourceNode, targetNode, i){
        //         // Optional function to define edge parameters
        //         return {
        //             data: { label: 'New Edge', source: sourceNode.id(), target: targetNode.id() }
        //         };
        //     }
        // });
        // eh.enableDrawMode();
        cy.style()
            .selector('.compound')
            .style({
                'background-opacity': '0',
                'border-color': 'blue','border-opacity': 0.25
            })
            // .selector('.eh-handle')
            // .style({
            //     'background-color': 'red',
            //     'width': 12,
            //     'height': 12,
            //     'shape': 'ellipse',
            //     'overlay-opacity': 0,
            //     'border-width': 12, // Makes the handle larger for easier grabbing
            //     'border-opacity': 0
            // })
            // .selector('.eh-hover')
            // .style({
            //     'background-color': 'blue'
            // })
            // .selector('.eh-source')
            // .style({
            //     'border-width': 2,
            //     'border-color': 'red'
            // })
            // .selector('.eh-target')
            // .style({
            //     'border-width': 2,
            //     'border-color': 'green'
            // })
            // .selector('.eh-preview, .eh-ghost-edge')
            // .style({
            //     'background-color': 'red',
            //     'line-color': 'red',
            //     'target-arrow-color': 'red',
            //     'source-arrow-color': 'red'
            //})
            .update();

        /*var cee = new CytoscapeEdgeEditation;  //https://github.com/sitnarf/fork-cytoscape.js-edge-editation?tab=readme-ov-file#how-to-use
        cee.init(cy);
        cee.registerHandle({
            positionX: "center",          //horizontal position of the handle  (left | center | right)
            positionY: "center",        //vertical position of the handle  (top | center | bottom)
            color: "#48FF00",           //color of the handle
            type: "port",          //stored as data() attribute, can be used for styling
            nodeTypeNames: ["port"],    //which types of nodes will contain this handle
            single: true,               //wheter only one edge of this type can start from same node (default false)
            noMultigraph: false         //whereter two nodes can't be connected with multiple edges (does not consider orientation)
        });*/

        this.initEdgeHandling(cy);

        function updatePortPositions(node) {
             //TODO select only 'port' children
            let nodeWidth = node.outerWidth();
            let nodeHeight = node.outerHeight();
            let nodePos = node.position();

            node.data('ports').forEach(port => {
                const relativePos = port.data('relativePosition'); // Assuming this data attribute exists
                let nx = nodePos.x + relativePos.x * nodeWidth/2;
                let ny = nodePos.y + relativePos.y * nodeHeight/2;
                //const pp = port.position();
                port.position({
                    x: nx,
                    y: ny
                });
            });
        }

        const updateIfHasPorts = function(evt) {
            let node = evt.target;
            if (node.data('ports'))
                updatePortPositions(node);
        };
        cy.on('position bounds add'/*'position bounds add', 'node'*/, updateIfHasPorts);

        cy.on('tap', 'node', this.onNodeTap.bind(this));
        cy.on('tap', this.onCanvasTap.bind(this));
        cy.on('dragfreeon', 'node', this.menuHide.bind(this));
        cy.on('dbltap', this.addNodeAtCursor.bind(this));
        cy.on('mouseover', 'node', this.onNodeMouseOver.bind(this));
        cy.on('mouseout', 'node', this.onNodeMouseOut.bind(this));
        cy.on('cxttap', 'node', this.onNodeRightClick.bind(this));


        this.cy = cy;
    }

    initEdgeHandling(cy) {

        const overlay = $('<svg style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:50000;"></svg>');
        $(cy.container()).parent().prepend(overlay);
        this.overlayLine = $(document.createElementNS('http://www.w3.org/2000/svg', 'line'))
            .attr('stroke', 'orange')
            .attr('stroke-width', 2)
            .hide();
        overlay.append(this.overlayLine);

        let sourceNode = null;

        cy.on('mousedown', 'node.port', (event) => {
            sourceNode = event.target;
            const sourcePos = sourceNode.renderedPosition();
            this.overlayLine.attr({
                'x1': sourcePos.x,
                'y1': sourcePos.y,
                'x2': sourcePos.x,
                'y2': sourcePos.y
            }).show();
        });

        cy.on('mousemove', (event) => {
            if (!sourceNode) return;
            this.overlayLine.attr('x2', event.renderedPosition.x).attr('y2', event.renderedPosition.y);
        });

        cy.on('mouseup', 'node.port', (event) => {
            if (sourceNode && sourceNode !== event.target) {
                cy.add({
                    group: 'edges',
                    data: {
                        id: `e${uuid()}`,
                        source: sourceNode.id(),
                        target: event.target.id(),
                    },
                    classes: 'edge'
                });
            }
            sourceNode = null;
            this.overlayLine.hide();
        });

        cy.on('mouseup', (event) => {
            if (sourceNode) {
                sourceNode = null;
                this.overlayLine.hide();
            }
        });

        cy.on('tap', 'edge', (event) => {
            const edge = event.target;
            if (window.confirm('Are you sure you want to delete this edge?')) {
                edge.remove();
            }
        });
    }

    addNode(content, ports = []) {
        return new WindowNode(uuid(), render(content), this, ports).node;
    }

    removeNode(node) {
        this.cy.remove(node);
    }

    removeNodeConfirm(node) {
        if (confirm('Are you sure you want to remove this node?'))
            this.removeNode(node);
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
        this.menuShow(evt.target);
    }

    menuShow(n) {
        const dom = n.data('domNode');
        if (dom) {
            const f = dom.menuFrame;

            const nw = n.outerWidth(), nh = n.outerHeight();
            const np = n.renderedPosition();
            f.css({display: 'flex',});
        }
    }

    onCanvasTap(evt) {
        if (evt.target === this.cy) {
            this.menuHide();
        }
    }

    menuHide() {
        $('.node-menu-frame').hide();
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
        evt.target.style('border-width', '5px');
        this.menuShow(evt.target);
    }

    onNodeMouseOut(evt) {
        evt.target.style('border-width', '1px');
        this.menuHide();
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
        transformUI.input = node.data('domNode').inner.text();
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

