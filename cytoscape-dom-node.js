"use strict";

/** adapted from: https://github.com/mwri/cytoscape-dom-node/blob/master/src/index.js */
class CytoscapeDomNode {
    constructor(cy, params = {}) {
        this.nodeDom = new Map();

        if (params.dom_container) {
            this.nodesContainer = params.dom_container;
        } else {
            const nodeContainerDiv = document.createElement("div");
            nodeContainerDiv.classList.add('domNodeContainer')
            nodeContainerDiv.style.position = 'fixed'; //'absolute';
            nodeContainerDiv.style.zIndex = '10';

            const cy_canvas = cy.container().querySelector("canvas");

            cy_canvas.parentNode.parentNode.parentNode.firstChild.before(nodeContainerDiv);

            this.nodesContainer = nodeContainerDiv;
        }

        this.resizeObserver = new ResizeObserver((entries) => {
            for (let e of entries) {
                const node_div = e.target;
                cy.getElementById(node_div.__cy_id).style({
                    'width': node_div.offsetWidth,
                    'height': node_div.offsetHeight
                });
            }
        });

        function transformStyle(style, transform) {
            style.webkitTransform = style.msTransform = style.transform = transform;
        }

        cy.on('add', 'node', (ev) => {
            this._add_node(ev.target);
        });
        cy.on('remove', 'node', (ev) => {
            //const dom = ev.target.data().dom;
            let id = ev.target.id();
            const element = this.nodeDom.get(id);
            element.remove();
            this.nodeDom.delete(id);
        });

        const updateContainerTransform = () => {
            const pan = cy.pan();
            transformStyle(this.nodesContainer.style,
                "translate(" + pan.x + "px," + pan.y + "px) scale(" + cy.zoom() + ")");
        };

        cy.on("pan zoom", updateContainerTransform);

        function numString(cy_node, index) {
            return cy_node.position(index).toFixed(2);
        }

        cy.on('position bounds', 'node', (ev) => {
            const cy_node = ev.target;
            const id = cy_node.id();
            const dom = this.dom(id);
            if (!dom)
                return;

            const style = dom.style;

            transformStyle(style,
                `translate(-50%, -50%) translate(${numString(cy_node, 'x')}px, ${numString(cy_node, 'y')}px)`);

            style.display = 'inline';
            style.position = 'absolute';

        });

        //READY
        updateContainerTransform(); //needs explicitly invoked the first time

        //register existing nodes
        for (let n of cy.nodes())
            this._add_node(n);

    }

    _add_node(n) {
        const data = n.data();
        const dom = data.dom;
        if (!dom)
            return;

        this.nodesContainer.appendChild(dom);

        this.nodeDom.set((dom.__cy_id = n.id()), dom);

        this.resizeObserver.observe(dom);
    }

    dom(nodeID) {
        return this.nodeDom.get(nodeID);
    }
}


cytoscape('core', 'domNode', function (params, opts) {
    new CytoscapeDomNode(this, params, opts)
});
