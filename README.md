# spacegraph.js: Zooming User Interface Library

## Overview
spacegraph.js is a JavaScript library for creating interactive, zooming user interfaces. Built with HTML, JavaScript, and three.js, it supports 2D/3D visualizations, a scene graph, event handling, and a HUD.

## Getting Started
Include `spacegraph.js` and `three.js`. Create an HTML container and initialize `SpaceGraph`.

```html
<!DOCTYPE html>
<html>
<head>
    <title>SpaceGraph.js Demo</title>
    <link rel="stylesheet" href="index.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="spacegraph.js"></script>
</head>
<body>
    <div id="graph-container" style="width: 100vw; height: 100vh;"></div>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const graph = new SpaceGraph(document.getElementById('graph-container'));
            const node1 = graph.createNode('NoteNode', { id: 'n1', text: 'Node 1', x: -100 });
            const node2 = graph.createNode('NoteNode', { id: 'n2', text: 'Node 2', x: 100 });
            if (node1 && node2) {
                graph.createEdge(node1, node2, { label: 'Edge' });
            }
            graph.zoomToFit(); // Or similar method
        });
    </script>
</body>
</html>
```

## API Reference

### `SpaceGraph`
Manages the graph, nodes, and edges.
*   **`constructor(container, config?)`**: Initializes in `container`.
*   **`createNode(type, options)`**: Creates and adds a node.
*   **`addNode(node)`**: Adds a node.
*   **`removeNode(nodeOrId)`**: Removes a node.
*   **`createEdge(source, target, options?)`**: Creates and adds an edge.
*   **`addEdge(edge)`**: Adds an edge.
*   **`removeEdge(edgeOrId)`**: Removes an edge.
*   **`getNodeById(id)`**: Gets a node.
*   **`zoomToFit()`**: Adjusts zoom to show all elements.
*   **`on(event, handler)`**: Listens to graph events.

### `HtmlNodeElement`
Node with HTML content.
*   **`constructor(id, html, options?)`**: Creates node with `id`, `html` content. `options` include `{x,y,z,scale}`.
*   **`position`**: `{x,y,z}` of the node.
*   **`scale`**: Scale of the node.
*   **`setContent(html)`**: Updates HTML.

### `NoteNode`
Text-based node.
*   **`constructor(id, text, options?)`**: Creates node with `id`, `text`. `options` include `{x,y,z,color}`.
*   **`text`**: Get/set text.
*   **`position`**: `{x,y,z}` of the node.

### `ShapeNode`
Geometric shape node.
*   **`constructor(id, shape, options?)`**: Creates node with `id`, `shape` type. `options` include `{x,y,z,size,color}`.
*   **`shapeType`**: Type of shape.
*   **`position`**: `{x,y,z}` of the node.
*   **`setColor(color)`**: Sets shape color.

### `Edge`
Connects two nodes.
*   **`constructor(id, source, target, options?)`**: Creates edge with `id` from `source` to `target`. `options` include `{label,color}`.
*   **`label`**: Get/set label.
*   **`setColor(color)`**: Sets edge color.

## Examples
Open these HTML files in your browser:
*   **`example-dynamic-updates.html`**: Shows dynamic add/remove of graph elements.
*   **`example-shape-nodes.html`**: Demonstrates creating various shape nodes.
*   **`example-text-nodes.html`**: Provides examples of text-based nodes.

(Content significantly condensed from the original specification document.)