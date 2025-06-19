// js/demo-launcher.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('demo-graph-container');
    if (!container) {
        console.error('Demo graph container not found!');
        return;
    }

    // Ensure SpaceGraphZUI is available (from spacegraph.js UMD bundle)
    if (typeof SpaceGraphZUI === 'undefined') {
        console.error('SpaceGraphZUI is not loaded. Make sure spacegraph.js is included.');
        return;
    }

    const demos = [
        { id: "3d-scene", label: "3D Scene Demo", href: "example-3d-scene.html", description: "Demonstrates basic 3D scene setup and navigation." },
        { id: "app-nodes", label: "Application Nodes Demo", href: "example-app-nodes.html", description: "Showcases custom HTML-based application nodes." },
        { id: "simple-counter", label: "Simple Counter App Node", href: "example-simple-counter-app-node.html", description: "A minimal example of creating a custom interactive HTML node." },
        { id: "central-config", label: "Centralized Configuration", href: "example-centralized-config.html", description: "Illustrates how to use a central configuration object." },
        { id: "dashboard", label: "Dashboard Demo", href: "example-dashboard.html", description: "A simple dashboard with interconnected data widgets." },
        { id: "dynamic-dashboard", label: "Dynamic Dashboard with Charts", href: "example-dynamic-dashboard.html", description: "Dashboard that dynamically updates and includes Chart.js." },
        { id: "dynamic-updates", label: "Dynamic Updates Demo", href: "example-dynamic-updates.html", description: "Shows nodes dynamically updating their content and appearance." },
        { id: "event-emitter", label: "Event Emitter Demo", href: "example-event-emitter.html", description: "Demonstrates the graph's event system." },
        { id: "hierarchical-data", label: "Hierarchical Data Demo", href: "example-hierarchical-data.html", description: "Example of visualizing hierarchical data structures." },
        { id: "inter-node-comm", label: "Inter-Node Communication", href: "example-inter-node-communication.html", description: "Illustrates direct communication and data flow between nodes." },
        { id: "mindmap", label: "Mind Map Demo", href: "example-mindmap.html", description: "A mind map visualization example." },
        { id: "reg-html-node", label: "Registered HTML Node", href: "example-registered-node-html.html", description: "Shows registration and usage of custom HTML-based node types." },
        { id: "reg-webgl-node", label: "Registered WebGL Node", href: "example-registered-node-webgl.html", description: "Shows registration and usage of custom WebGL-based node types." },
        { id: "shape-nodes", label: "Shape Nodes Demo", href: "example-shape-nodes.html", description: "Demonstrates various built-in shape nodes (spheres, boxes)." },
        { id: "text-nodes", label: "Text Nodes Demo", href: "example-text-nodes.html", description: "Showcases nodes primarily focused on displaying text." },
        { id: "bundled-usage", label: "Bundled Usage Demo", href: "example-bundled-usage.html", description: "Illustrates using SpaceGraph via npm-style import with an import map." }
    ];

    const graph = new SpaceGraphZUI(container, {
        backgroundColor: '#f0f0f0',
        camera: {
            initialPosition: { x: 0, y: 0, z: 700 } // Zoom out a bit to see nodes
        },
        layout: {
            type: 'force-directed', // or 'circular', 'grid'
            options: {
                linkDistance: 150,
                chargeStrength: -300,
            }
        },
        node: {
            defaultType: 'text', // Use text nodes by default
            defaultStyle: {
                color: '#333333',
                size: 10, // Default size, can be overridden
                label: {
                    font: 'Arial',
                    size: 12,
                    color: '#000000',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    padding: 5,
                    show: true
                }
            }
        }
    });

    demos.forEach(demo => {
        const node = graph.addNode(demo.id, {
            label: demo.label,
            type: 'text', // Explicitly text node
            style: {
                size: 15, // Slightly larger for demo nodes
                label: {
                    // color based on some hash of id or fixed
                    backgroundColor: `hsl(${demo.id.length * 20 % 360}, 70%, 80%)`
                }
            }
        });
        // Store href and description in node's custom data
        node.sgNode.data.href = demo.href;
        node.sgNode.data.description = demo.description;
    });

    graph.on('node:click', (event) => {
        const node = event.detail.node;
        if (node && node.sgNode.data.href) {
            window.location.href = node.sgNode.data.href;
        }
    });

    graph.on('node:pointerover', (event) => {
        const node = event.detail.node;
        if (node && node.sgNode.data.description) {
            // Basic hover effect: change cursor and maybe show a tooltip (browser default for now)
            container.title = node.sgNode.data.description;
        }
    });

    graph.on('node:pointerout', (event) => {
        container.title = ''; // Clear title on pointer out
    });


    // Initial layout rendering
    graph.render();
    console.log('Demo launcher graph initialized with SpaceGraphZUI.');
});
