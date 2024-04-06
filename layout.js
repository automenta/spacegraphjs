// Manages the graph and interfaces with the LayoutWorker for dynamic layout updates.
class Layout {
    constructor(cy) {
        this.cy = cy;
        this.worker = new Worker('layoutWorker.js');
        this.layoutModel = 'forceDirected'; // Default layout model
        this.worker.onmessage = e => this.applyLayout(e);

        //setTimeout(this.updateGraph(), 1000);
        setInterval(()=>this.updateGraph(), 50);
    }

    updateGraph() {

        function nodes(nodes) {
            return nodes.map(node => {
                const N = node._private;
                return [N.data.id, N.position.x, N.position.y];
            });
        }
        function edges(edges) {
            return edges.map(edge => {
                const data = edge._private.data;
                return [data.id, data.source, data.target];
            });
        }

        this.worker.postMessage({
            action: 'updateLayout',
            nodes: nodes(this.cy.nodes()),
            edges: edges(this.cy.edges()),
            layoutModel: this.layoutModel
        });
    }

    applyLayout(e) {
        const positions = e.data.positions;
        this.cy.batch(() => {
            for (let x = 0; x < positions.length; x++) {
                const p = positions[x];
                this.cy.getElementById(p[0]).position({x: p[1], y: p[2]});
            }
        });
    }

    setLayoutModel(model) {
        this.layoutModel = model;
    }
}
