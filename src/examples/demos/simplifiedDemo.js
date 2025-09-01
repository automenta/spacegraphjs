import {
  SpaceGraph,
  ConsolidatedNode,
  ConsolidatedEdge,
  ConsolidatedPlugin,
  NodeFactory,
  EdgeFactory,
  ConsolidatedFactory,
  PluginManager,
  ConsolidatedLayoutManager,
  UIManager,
  Camera,
  AdvancedCameraControls,
} from "../../index.js";
import * as THREE from "three";

// Simplified demo that showcases the consolidated approach
const demoMetadata = {
  id: "simplified-demo",
  title: "Simplified Demo",
  description: `<h3>Simplified Demo</h3>
                  <p>This demo showcases the simplified, consolidated approach of SpaceGraphJS.</p>
                  <ul>
                    <li>Reduced codebase size through consolidation</li>
                    <li>Improved performance with streamlined architecture</li>
                    <li>Maintained functionality with less complexity</li>
                  </ul>`,
};

function createGraph(space) {
  // Create a few nodes using the simplified approach
  const n1 = space.createNode({
    id: "node1",
    type: "shape",
    position: { x: 0, y: 0, z: 0 },
    data: {
      label: "Core Node",
      shape: "sphere",
      size: 60,
      color: 0x33aabb,
    },
    mass: 1.0,
  });

  const n2 = space.createNode({
    id: "node2",
    type: "html",
    position: { x: 200, y: 100, z: 0 },
    data: {
      label: "HTML Node",
      content: "<h2>HTML Content</h2><p>This is an HTML node</p>",
      width: 200,
      height: 120,
      backgroundColor: "#445566",
      editable: true,
    },
    mass: 1.2,
  });

  const n3 = space.createNode({
    id: "node3",
    type: "image",
    position: { x: -200, y: -100, z: 0 },
    data: {
      label: "Image Node",
      imageUrl: "https://placehold.co/100x100.png?text=IMG",
      size: 100,
    },
    mass: 1.0,
  });

  // Add edges between nodes
  if (n1 && n2) {
    space.addEdge(n1, n2, {
      type: "curved",
      label: "Curved Edge",
      color: 0x0088ff,
      thickness: 2,
    });
  }

  if (n1 && n3) {
    space.addEdge(n1, n3, {
      type: "straight",
      label: "Straight Edge",
      color: 0xff8800,
      thickness: 3,
    });
  }

  // Apply a layout
  space.applyLayout("force");
}

export { createGraph, demoMetadata };
