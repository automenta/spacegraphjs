# SpaceGraph Zooming UI Engine

[![npm version](https://badge.fury.io/js/spacegraph-zui.svg)](https://badge.fury.io/js/spacegraph-zui)
[![Build Status](https://github.com/TTime/spacegraphjs/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/TTime/spacegraphjs/actions/workflows/gh-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**SpaceGraph ZUI** (Zoomable User Interface) is a general-purpose, extensible JavaScript library for creating
interactive 2D and 3D graph visualizations. It leverages Three.js for WebGL rendering and offers rich HTML content
embedding within graph nodes. The library is designed to be modular, performant, and highly customizable through a
plugin architecture.

## Features

- **2D/3D Graph Visualization**: Renders nodes and edges in a 2D or 3D space.
- **Versatile Node Types**:
  - **HTML Nodes**: Embed complex HTML content as node visuals, enabling rich UIs within the graph.
  - **Shape Nodes**: Supports basic 3D shapes (e.g., spheres, boxes) with 3D text labels.
  - **Image, Video, IFrame Nodes**, and more. Easily extensible for custom node types.
- **Dynamic Layouts**:
  - Built-in force-directed layout.
  - Support for various layout algorithms (Circular, Grid, Hierarchical, Radial, Spherical, TreeMap) via plugins.
  - Pin nodes to fix their positions.
- **Interactive UI & Camera**:
  - Drag & drop nodes.
  - Smooth camera controls (pan, zoom, focus on node) powered by GSAP.
  - Camera movement history (back/forward).
  - Context menus for nodes and edges.
- **Extensible Plugin System**: Customize or extend nearly any aspect of the library by creating or modifying plugins
  for rendering, camera behavior, UI interactions, data handling, and more.
- **Multiple Module Formats**: Supports ES Modules (ESM), CommonJS (CJS), and UMD, compatible with Node.js and modern
  browsers.
- **TypeScript Definitions**: Includes type definitions for a better development experience with TypeScript.

## Development

Set up the development environment:

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Run the development server (for the demo page `index.html`): `npm start`.
4. To build the library: `npm run build`.
