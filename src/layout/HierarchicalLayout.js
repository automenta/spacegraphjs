/**
 * @file HierarchicalLayout.js - Arranges nodes in a hierarchical (tree-like) structure.
 * @licence MIT
 */
import * as THREE from 'three';

export class HierarchicalLayout {
    space = null;
    pluginManager = null;
    settings = {
        levelSeparation: 150, // Vertical distance between levels
        nodeSeparation: 100, // Horizontal distance between nodes at the same level
        orientation: 'top-down', // 'top-down', 'left-right' (left-right NI)
        animate: true,
        animationDuration: 0.7,
    };
    nodeMap = new Map(); // To store node wrappers with layout-specific data

    constructor(space, config = {}) {
        this.space = space;
        this.settings = { ...this.settings, ...config };
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    async init(nodes, edges, config = {}) {
        if (config) this.updateConfig(config);
        if (!nodes || nodes.length === 0) return;

        this.nodeMap.clear();
        nodes.forEach((node) => {
            this.nodeMap.set(node.id, {
                node,
                id: node.id,
                children: [],
                parent: null,
                level: -1,
                x: 0,
                y: 0, // Relative x,y within the layout, z is often 0 for 2D hierarchy
                width: node.getBoundingSphereRadius() * 2, // Approximate width
                prelim: 0, // Preliminary x-coordinate
                modifier: 0, // Modifier for final x-coordinate
            });
        });

        // Build adjacency list (children for each node)
        edges.forEach((edge) => {
            const sourceWrapper = this.nodeMap.get(edge.source.id);
            const targetWrapper = this.nodeMap.get(edge.target.id);
            if (sourceWrapper && targetWrapper) {
                sourceWrapper.children.push(targetWrapper);
                targetWrapper.parent = sourceWrapper; // Simple parent assignment (assumes tree, not general DAG)
            }
        });

        const roots = nodes.filter((n) => !this.nodeMap.get(n.id).parent && !n.isPinned);
        if (roots.length === 0 && nodes.length > 0) {
            // Fallback if no clear roots (e.g. cycle or all connected)
            // Pick a node with fewest incoming edges, or just the first one as a naive root.
            // This basic hierarchical layout works best with actual tree structures.
            // For a general graph, a more sophisticated root selection or DAG->tree conversion might be needed.
            if (!nodes[0].isPinned) roots.push(nodes[0]);
        }

        // Pinned nodes are ignored by the layout algorithm for positioning
        const layoutNodes = nodes.filter((n) => !n.isPinned);

        // Simplified Buchheim-Walker style approach (conceptual)
        // First pass: assign initial positions (bottom-up for x, top-down for y/level)
        roots.forEach((root) => this._firstPass(this.nodeMap.get(root.id), 0));

        // Second pass: apply modifiers for final positions (top-down)
        // This step is more complex in full Reingold-Tilford.
        // For a simpler version, we'll use level for Y and prelim for X.
        // The actual X calculation needs to consider subtree widths and avoid overlaps.
        // This is a VERY simplified placeholder for X calculation.
        // A proper implementation would involve calculating subtree contours.

        let currentX = 0;
        roots.forEach((root) => {
            this._secondPass(this.nodeMap.get(root.id), currentX, 0);
            // Estimate width of this tree for next root's starting X (very rough)
            // This needs a proper way to get subtree width.
            const treeWidth = this._calculateTreeWidth(this.nodeMap.get(root.id));
            currentX += treeWidth + this.settings.nodeSeparation * 2;
        });

        // Apply calculated positions
        this.nodeMap.forEach((wrapper) => {
            if (!wrapper.node.isPinned) {
                // LayoutManager will animate from current to this target.
                wrapper.node.position.set(wrapper.x, wrapper.y, 0); // Z is 0 for this simple version
            }
        });
    }

    _firstPass(nodeWrapper, level) {
        nodeWrapper.level = level;
        nodeWrapper.y = -level * this.settings.levelSeparation; // Y grows downwards

        if (nodeWrapper.children.length === 0) {
            // Leaf node
            nodeWrapper.prelim = 0; // Relative to parent
            return;
        }

        let defaultAncestor = nodeWrapper.children[0]; // Leftmost child
        nodeWrapper.children.forEach((childWrapper) => {
            this._firstPass(childWrapper, level + 1);
            // Apportionment logic would go here in a full algorithm
            defaultAncestor = this._apportion(childWrapper, defaultAncestor);
        });

        // Execute shifts: This is complex and involves tracking thread/contour.
        // Skipping for this simplified version.

        // Center parent over children (midpoint of leftmost and rightmost child's prelim)
        const firstChild = nodeWrapper.children[0];
        const lastChild = nodeWrapper.children[nodeWrapper.children.length - 1];
        const midpoint = (firstChild.prelim + lastChild.prelim) / 2;

        // If it's a lone child, parent is above it.
        // If multiple, parent is centered.
        // This is part of the Reingold-Tilford algorithm.
        // The 'prelim' is relative to the parent's origin at this stage.

        nodeWrapper.prelim = midpoint;
        // This is simplified. Actual prelim depends on whether node is left/right sibling or parent positioning.
        // For a basic version, we might just sum children widths.
    }

    _apportion(nodeWrapper, defaultAncestor) {
        // This is a key part of Reingold-Tilford to ensure proper spacing and avoid crossovers.
        // It's quite complex. Involves comparing contours of subtrees.
        // For this simplified version, we are not implementing the full apportion.
        // We'll rely on a simpler second pass to spread nodes.
        return defaultAncestor; // Placeholder
    }

    _secondPass(nodeWrapper, currentXOffset, modSum) {
        // This is a placeholder for a proper second pass.
        // A real second pass uses `modifier` calculated during `_firstPass`
        // and applies it to `prelim` to get the final X.
        // nodeWrapper.x = nodeWrapper.prelim + modSum;
        // nodeWrapper.modifier is used to shift subtrees.

        // Simplified X positioning:
        // Spread children of the current node.
        // This will not prevent all overlaps between sibling subtrees without proper contour checks.

        nodeWrapper.x = currentXOffset + nodeWrapper.prelim * this.settings.nodeSeparation;
        // `prelim` here is treated as an index or relative position.

        let childX = currentXOffset - ((nodeWrapper.children.length - 1) * this.settings.nodeSeparation) / 2;
        if (nodeWrapper.children.length === 1 && nodeWrapper.children[0].children.length === 0) {
            // Single leaf child directly under parent
            childX = nodeWrapper.x;
        }

        nodeWrapper.children.forEach((childWrapper, i) => {
            // A very naive way to position children:
            // This doesn't account for subtree widths and will cause overlaps for non-trivial trees.
            // The x for child should be relative to parent's final x.
            // For a simple stack, each child might get an X based on an increment.
            // this._secondPass(childWrapper, nodeWrapper.x + (i - (nodeWrapper.children.length - 1) / 2) * this.settings.nodeSeparation, newModSum);

            // Even simpler: just process, x will be set based on its own prelim.
            // This is not a correct tree drawing algorithm but a starting point.
            this._secondPass(childWrapper, childX + i * this.settings.nodeSeparation, 0);
        });
    }

    _calculateTreeWidth(nodeWrapper) {
        // Very naive width calculation - only considers one level of children
        if (!nodeWrapper || nodeWrapper.children.length === 0) {
            return nodeWrapper ? nodeWrapper.width : this.settings.nodeSeparation;
        }
        let width = 0;
        nodeWrapper.children.forEach((child) => {
            width += this._calculateTreeWidth(child) + this.settings.nodeSeparation;
        });
        return Math.max(width, nodeWrapper.width); // Ensure parent node's own width is considered
    }

    updateConfig(config) {
        this.settings = { ...this.settings, ...config };
    }

    run() {
        /* Static layout */
    }
    stop() {
        /* Static layout */
    }
    kick() {
        /* Static layout */
    }
    addNode(node) {
        /* Requires full recalculation */
    }
    removeNode(node) {
        /* Requires full recalculation */
    }
    addEdge(edge) {
        /* Requires full recalculation if it changes hierarchy */
    }
    removeEdge(edge) {
        /* Requires full recalculation if it changes hierarchy */
    }

    dispose() {
        this.space = null;
        this.pluginManager = null;
        this.nodeMap.clear();
    }
}
