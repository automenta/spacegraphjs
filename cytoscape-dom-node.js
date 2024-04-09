"use strict";

class CytoscapeDomNode {
    constructor(cy) {
        this.nodeDom = new Map();

        const containerDiv = document.createElement("div");
        containerDiv.classList.add('domNodeContainer');
        containerDiv.style.position = 'fixed';
        containerDiv.style.zIndex = '10';
        cy.container().querySelector("canvas").parentNode.parentNode.parentNode.firstChild.before(containerDiv);
        this.containerDiv = containerDiv;

        this.resizeObserver = new ResizeObserver(entries => {
            for (let e of entries) {
                const div = e.target;
                cy.getElementById(div.__cy_id).style({
                    'width': div.offsetWidth,
                    'height': div.offsetHeight
                });
            }
        });

        cy.on('add', 'node', ev => this._add_node(ev.target));
        cy.on('remove', 'node', ev => {
            const id = ev.target.id();
            const element = this.dom(id);
            if (element) {
                element.remove();
                this.nodeDom.delete(id);
            }
        });

        const styleUpdates = new Map();

        const styleSetter = (transform, ele) => {
            ele.style.transform = transform;
            //style.webkitTransform = style.msTransform = style.transform = update.transform;
        };

        function applyUpdates() {
            styleUpdates.forEach(styleSetter);
            styleUpdates.clear();
            requestAnimationFrame(applyUpdates);
        }

        const ns = (v) => {
            //return Math.round(v * 10)/10; //nearest 0.1
            return Math.round(v * 2)/2; //nearest 0.5
            //return Math.round(v);  //nearest pixel
            //return v.toFixed(1);
        };

        const updateContainer = () => {
            const pan = cy.pan();
            styleUpdates.set(this.containerDiv, `translate(${ns(pan.x)}px, ${ns(pan.y)}px) scale(${cy.zoom()})`);
        };

        const updateDOM = (dom, cyNode) => {
            const cyNodePos = cyNode.position();
            styleUpdates.set(dom, `translate(-50%, -50%) translate(${ns(cyNodePos.x)}px, ${ns(cyNodePos.y)}px)`);
        };

        cy.on("pan zoom", updateContainer);
        cy.on('position bounds', 'node', ev => {
            const cy_node = ev.target;
            const id = cy_node.id();
            const dom = this.dom(id);
            if (dom) updateDOM(dom, cy_node);
        });

        updateContainer();
        cy.nodes().forEach(n => this._add_node(n));
        requestAnimationFrame(applyUpdates);
    }

    _add_node(n) {
        const data = n.data();
        const dom = data.dom;
        if (!dom) return;

        this.containerDiv.appendChild(dom);
        this.nodeDom.set((dom.__cy_id = n.id()), dom);
        this.resizeObserver.observe(dom);
    }

    dom(nodeID) {
        return this.nodeDom.get(nodeID);
    }
}

cytoscape('core', 'domNode', function () {
    new CytoscapeDomNode(this)
});
