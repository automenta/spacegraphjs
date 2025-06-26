import * as THREE from 'three';

export class TreeMapLayout {
    static layoutName = 'treemap';
    space = null;
    pluginManager = null;
    settings = {
        padding: 10, // Padding between treemap cells
        areaProperty: 'size', // Property of node.data to determine area
        plane: 'xy', // 'xy', 'xz', 'yz'
        depth: 0, // Fixed depth for all items if not using 3D treemap
        centerOrigin: true, // Center the entire treemap around (0,0,0)
        width: 1000, // Total width of the treemap area
        height: 800, // Total height of the treemap area
    };

    constructor(config = {}) {
        this.settings = { ...this.settings, ...config };
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    updateConfig(newConfig) {
        this.settings = { ...this.settings, ...newConfig };
    }

    init(nodes, edges, config = {}) {
        if (config) this.updateConfig(config);
        if (!nodes || nodes.length === 0) return;

        const nodesToArrange = nodes.filter(n => !n.isPinned);
        if (nodesToArrange.length === 0) return;

        const { padding, plane, depth, centerOrigin, width, height } = this.settings;

        // Calculate total area and assign areas to nodes
        let totalArea = 0;
        nodesToArrange.forEach(node => {
            const area = node.data[this.settings.areaProperty] || 1;
            node._treemapArea = area;
            totalArea += area;
        });

        // Sort nodes by area (descending) for better squarified results
        nodesToArrange.sort((a, b) => b._treemapArea - a._treemapArea);

        // Perform the squarified treemap layout
        const rect = { x: 0, y: 0, width, height };
        this._squarify(nodesToArrange, rect, totalArea, padding);

        // Apply positions and potentially resize nodes
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        nodesToArrange.forEach(node => {
            const { x, y, width: nodeW, height: nodeH } = node._treemapRect;
            let finalX, finalY, finalZ;

            if (plane === 'xy') {
                finalX = x + nodeW / 2;
                finalY = y + nodeH / 2;
                finalZ = depth;
            } else if (plane === 'xz') {
                finalX = x + nodeW / 2;
                finalY = depth;
                finalZ = y + nodeH / 2;
            } else { // yz
                finalX = depth;
                finalY = x + nodeW / 2;
                finalZ = y + nodeH / 2;
            }
            node.position.set(finalX, finalY, finalZ);

            // Update node's visual size if it's a ShapeNode or HtmlNode
            if (node.setSize) {
                node.setSize(nodeW - padding, nodeH - padding, false);
            } else if (node.mesh?.scale) {
                node.mesh.scale.set(nodeW - padding, nodeH - padding, node.mesh.scale.z || 1);
            }

            minX = Math.min(minX, finalX - nodeW / 2);
            minY = Math.min(minY, finalY - nodeH / 2);
            minZ = Math.min(minZ, finalZ - (node.mesh?.scale.z || 1) / 2);
            maxX = Math.max(maxX, finalX + nodeW / 2);
            maxY = Math.max(maxY, finalY + nodeH / 2);
            maxZ = Math.max(maxZ, finalZ + (node.mesh?.scale.z || 1) / 2);
        });

        if (centerOrigin && nodesToArrange.length > 0) {
            const layoutCenterX = (minX + maxX) / 2;
            const layoutCenterY = (minY + maxY) / 2;
            const layoutCenterZ = (minZ + maxZ) / 2;

            nodesToArrange.forEach(node => {
                node.position.x -= layoutCenterX;
                node.position.y -= layoutCenterY;
                node.position.z -= layoutCenterZ;
            });
        }
    }

    // Squarified Treemap Algorithm (simplified for demonstration)
    // This is a recursive function that attempts to make rectangles as square as possible.
    _squarify(nodes, rect, totalArea, padding) {
        if (nodes.length === 0) return;

        if (nodes.length === 1) {
            nodes[0]._treemapRect = {
                x: rect.x + padding / 2,
                y: rect.y + padding / 2,
                width: rect.width - padding,
                height: rect.height - padding,
            };
            return;
        }

        let row = [];
        let rowArea = 0;
        let bestRatio = Infinity;
        let bestRowIndex = 0;

        for (let i = 0; i < nodes.length; i++) {
            row.push(nodes[i]);
            rowArea += nodes[i]._treemapArea;

            const currentRatio = this._calculateRowRatio(row, rowArea, rect.width, rect.height);

            if (currentRatio < bestRatio) {
                bestRatio = currentRatio;
                bestRowIndex = i + 1;
            } else {
                // Adding more nodes made it worse, so the previous set was the best row
                row.pop();
                rowArea -= nodes[i]._treemapArea;
                break;
            }
        }

        const currentRow = nodes.slice(0, bestRowIndex);
        const remainingNodes = nodes.slice(bestRowIndex);

        this._layoutRow(currentRow, rect, rowArea, totalArea, padding);

        const newRect = { ...rect };
        if (rect.width > rect.height) { // Layouted horizontally
            newRect.x += currentRow[0]._treemapRect.width + padding;
            newRect.width -= (currentRow[0]._treemapRect.width + padding);
        } else { // Layouted vertically
            newRect.y += currentRow[0]._treemapRect.height + padding;
            newRect.height -= (currentRow[0]._treemapRect.height + padding);
        }

        this._squarify(remainingNodes, newRect, totalArea - rowArea, padding);
    }

    _calculateRowRatio(row, rowArea, rectWidth, rectHeight) {
        if (row.length === 0 || rowArea === 0) return Infinity;

        const minArea = Math.min(...row.map(n => n._treemapArea));
        const maxArea = Math.max(...row.map(n => n._treemapArea));

        const side = Math.min(rectWidth, rectHeight);
        const ratio = (side * rowArea) / (minArea * totalArea);
        const inverseRatio = (maxArea * totalArea) / (side * rowArea);

        return Math.max(ratio, inverseRatio);
    }

    _layoutRow(row, rect, rowArea, totalArea, padding) {
        const isHorizontal = rect.width > rect.height;
        const rowLength = isHorizontal ? rect.width : rect.height;
        const rowBreadth = isHorizontal ? rect.height : rect.width;

        let currentOffset = 0;
        row.forEach(node => {
            const nodeLength = (node._treemapArea / rowArea) * rowLength;
            const nodeBreadth = rowBreadth;

            if (isHorizontal) {
                node._treemapRect = {
                    x: rect.x + currentOffset,
                    y: rect.y,
                    width: nodeLength,
                    height: nodeBreadth,
                };
            } else {
                node._treemapRect = {
                    x: rect.x,
                    y: rect.y + currentOffset,
                    width: nodeBreadth,
                    height: nodeLength,
                };
            }
            currentOffset += nodeLength;
        });
    }

    run() { /* Not typically a continuous layout */ }
    stop() { /* Nothing to stop */ }
    update() { /* No per-frame updates needed usually */ }

    addNode(node) { /* Could re-trigger init or add incrementally (complex) */ }
    removeNode(node) { /* Could re-trigger init or remove incrementally (complex) */ }
    addEdge(edge) {}
    removeEdge(edge) {}
    kick() {}

    dispose() {
        this.space = null;
        this.pluginManager = null;
    }
}
