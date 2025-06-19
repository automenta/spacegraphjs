// js/demo-launcher.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('demo-graph-container');
    const demoInfoPanel = document.getElementById('demo-info-panel');

    if (!container || !demoInfoPanel) {
        console.error('Demo graph container or info panel not found!');
        return;
    }

    // Ensure SpaceGraphZUI is available (from spacegraph.js UMD bundle)
    if (typeof SpaceGraphZUI === 'undefined') {
        console.error('SpaceGraphZUI is not loaded. Make sure spacegraph.js is included.');
        return;
    }

    const demos = [
        { id: "3d-scene", label: "3D Scene Demo", href: "example-3d-scene.html", description: "Demonstrates basic 3D scene setup and navigation." },
        { id: "app-nodes", label: "Application Nodes Demo", href: "example-app-nodes.html", description: "Showcases custom HTML-based application nodes and their interactions." },
        { id: "bundled-usage", label: "Bundled Usage Demo", href: "example-bundled-usage.html", description: "Illustrates using SpaceGraph via npm-style import with an import map." },
        { id: "central-config", label: "Centralized Configuration Demo", href: "example-centralized-config.html", description: "Illustrates how to use a central configuration object." },
        { id: "custom-node", label: "Custom Node Demo", href: "example-custom-node.html", description: "Basic example of creating a custom node type." },
        { id: "custom-webgl-node", label: "Custom Webgl Node Demo", href: "example-custom-webgl-node.html", description: "Demonstrates a custom node type with WebGL rendering." },
        { id: "dashboard", label: "Dashboard Demo", href: "example-dashboard.html", description: "A simple dashboard with interconnected data widgets." },
        { id: "dynamic-dashboard", label: "Dynamic Dashboard Demo", href: "example-dynamic-dashboard.html", description: "Dashboard that dynamically updates and includes Chart.js." },
        { id: "dynamic-updates", label: "Dynamic Updates Demo", href: "example-dynamic-updates.html", description: "Shows nodes dynamically updating their content and appearance." },
        { id: "event-emitter", label: "Event Emitter Demo", href: "example-event-emitter.html", description: "Demonstrates the graph's event system." },
        { id: "hierarchical-data", label: "Hierarchical Data Demo", href: "example-hierarchical-data.html", description: "Example of visualizing hierarchical data structures." },
        { id: "inter-node-communication", label: "Inter Node Communication Demo", href: "example-inter-node-communication.html", description: "Illustrates direct communication and data flow between nodes." },
        { id: "mindmap", label: "Mindmap Demo", href: "example-mindmap.html", description: "A mind map visualization example." },
        { id: "registered-node-html", label: "Registered Node Html Demo", href: "example-registered-node-html.html", description: "Shows registration and usage of custom HTML-based node types." },
        { id: "registered-node-webgl", label: "Registered Node Webgl Demo", href: "example-registered-node-webgl.html", description: "Shows registration and usage of custom WebGL-based node types." },
        { id: "shape-nodes", label: "Shape Nodes Demo", href: "example-shape-nodes.html", description: "Demonstrates various built-in shape nodes (spheres, boxes)." },
        { id: "simple-counter-app-node", label: "Simple Counter App Node Demo", href: "example-simple-counter-app-node.html", description: "A minimal example of creating a custom interactive HTML node." },
        { id: "text-nodes", label: "Text Nodes Demo", href: "example-text-nodes.html", description: "Showcases nodes primarily focused on displaying text." }
    ];

    const graph = new SpaceGraphZUI(container, {
        backgroundColor: '#f0f0f0',
        camera: {
            initialPosition: { x: 0, y: 0, z: 900 } // Zoom out a bit more
        },
        layout: {
            type: 'force-directed',
            options: {
                linkDistance: 200, // Increased link distance
                chargeStrength: -400, // Adjusted charge strength
                iterations: 200, // More iterations for stability
                repulsion: 1.5 // Standard repulsion
            }
        },
        node: {
            defaultType: 'shape', // Change default node type to shape
            defaultStyle: {
                shape: 'roundedRect', // Specify the shape
                color: '#333333',
                size: 15, // Default size for shapes
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
        // Simple category detection based on keywords in ID or label (can be improved)
        let category = 'general';
        if (demo.id.includes('app') || demo.label.toLowerCase().includes('application')) category = 'app';
        else if (demo.id.includes('dynamic')) category = 'dynamic';
        else if (demo.id.includes('reg') || demo.label.toLowerCase().includes('registered')) category = 'customization';
        else if (demo.id.includes('3d') || demo.label.toLowerCase().includes('webgl')) category = 'webgl';


        const node = graph.addNode(demo.id, {
            label: demo.label,
            // type: 'shape', // Now default, but can be explicit
            style: {
                // size: 20, // Larger for demo nodes, or adjust defaultStyle.size
                shape: 'roundedRect', // Ensure it's a shape
                label: {
                    color: '#000000', // Ensure label is readable
                    backgroundColor: `hsla(${demo.id.length * 20 % 360}, 70%, 80%, 0.7)` // Keep dynamic background for label
                },
                // Assign color based on category
                color: getCategoryColor(category)
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
            demoInfoPanel.innerHTML = node.sgNode.data.description;
            demoInfoPanel.style.display = 'block';
        }
    });

    graph.on('node:pointerout', (event) => {
        demoInfoPanel.innerHTML = '';
        demoInfoPanel.style.display = 'none';
    });

    // Function to get color based on category
    function getCategoryColor(category) {
        switch (category) {
            case 'app': return '#4CAF50'; // Green
            case 'dynamic': return '#FFC107'; // Amber
            case 'customization': return '#2196F3'; // Blue
            case 'webgl': return '#9C27B0'; // Purple
            default: return '#795548'; // Brown (General)
        }
    }

    // Initial layout rendering
    graph.render();
    console.log('Demo launcher graph initialized with SpaceGraphZUI.');
});
