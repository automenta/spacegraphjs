// js/demo-launcher.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('demo-graph-container');
    const demoInfoPanel = document.getElementById('demo-info-panel');

    if (!container || !demoInfoPanel) {
        console.error('Demo graph container or info panel not found!');
        return;
    }

    if (typeof SpaceGraphZUI === 'undefined' || typeof SpaceGraphZUI.SpaceGraph === 'undefined') {
        console.error('SpaceGraphZUI or SpaceGraphZUI.SpaceGraph is not loaded. Make sure spacegraph.umd.js is included and built correctly.');
        return;
    }

    const demos = [
        { id: "keystone-showcase", label: "Keystone Showcase ✨", href: "example-keystone.html", description: "A comprehensive demonstration of SpaceGraph's features, including various node types, interactive elements, and dynamic updates.", category: "featured" },
        { id: "3d-scene", label: "3D Scene Demo", href: "example-3d-scene.html", description: "Demonstrates basic 3D scene setup and navigation.", category: "webgl" },
        { id: "app-nodes", label: "Application Nodes Demo", href: "example-app-nodes.html", description: "Showcases custom HTML-based application nodes.", category: "app" },
        { id: "simple-counter", label: "Simple Counter App Node", href: "example-simple-counter-app-node.html", description: "A minimal example of creating a custom interactive HTML node.", category: "app" },
        { id: "central-config", label: "Centralized Configuration", href: "example-centralized-config.html", description: "Illustrates how to use a central configuration object.", category: "core" },
        { id: "dashboard", label: "Dashboard Demo", href: "example-dashboard.html", description: "A simple dashboard with interconnected data widgets.", category: "dynamic" },
        { id: "dynamic-dashboard", label: "Dynamic Dashboard with Charts", href: "example-dynamic-dashboard.html", description: "Dashboard that dynamically updates and includes Chart.js.", category: "dynamic" },
        { id: "dynamic-updates", label: "Dynamic Updates Demo", href: "example-dynamic-updates.html", description: "Shows nodes dynamically updating their content and appearance.", category: "dynamic" },
        { id: "event-emitter", label: "Event Emitter Demo", href: "example-event-emitter.html", description: "Demonstrates the graph's event system.", category: "core" },
        { id: "hierarchical-data", label: "Hierarchical Data Demo", href: "example-hierarchical-data.html", description: "Example of visualizing hierarchical data structures.", category: "visualizations" },
        { id: "inter-node-comm", label: "Inter-Node Communication", href: "example-inter-node-communication.html", description: "Illustrates direct communication and data flow between nodes.", category: "core" },
        { id: "mindmap", label: "Mind Map Demo", href: "example-mindmap.html", description: "A mind map visualization example.", category: "visualizations" },
        { id: "reg-html-node", label: "Registered HTML Node", href: "example-registered-node-html.html", description: "Shows registration and usage of custom HTML-based node types.", category: "customization" },
        { id: "reg-webgl-node", label: "Registered WebGL Node", href: "example-registered-node-webgl.html", description: "Shows registration and usage of custom WebGL-based node types.", category: "customization" },
        { id: "shape-nodes", label: "Shape Nodes Demo", href: "example-shape-nodes.html", description: "Demonstrates various built-in shape nodes (spheres, boxes).", category: "webgl" },
        { id: "text-nodes", label: "Text Nodes Demo", href: "example-text-nodes.html", description: "Showcases nodes primarily focused on displaying text.", category: "core" },
        { id: "bundled-usage", label: "Bundled Usage Demo", href: "example-bundled-usage.html", description: "Illustrates using SpaceGraph via npm-style import with an import map.", category: "utils" }
    ];

    const graphConfig = {
        backgroundColor: '#282c34',
        camera: {
            initialPosition: { x: 0, y: 0, z: 1200 }
        },
        layout: {
            type: 'force-directed',
            options: {
                linkDistance: 180,
                chargeStrength: -600,
                iterations: 300,
                repulsion: 1.5,
                centerStrength: 0.1
            }
        },
        node: {
            defaultType: 'shape',
            defaultStyle: {
                shape: 'roundedRect',
                color: '#61AFEF',
                size: 18,
                label: {
                    font: 'Arial',
                    size: 11,
                    color: '#E0E0E0',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    padding: 5,
                    show: true
                }
            }
        }
    };

    const graph = new SpaceGraphZUI.SpaceGraph(container, graphConfig);

    const categories = {
        "featured": { label: "🌟 Keystone Showcase", style: { color: '#FFD700', size: 35, shape: 'diamond' }, id: 'category-featured' },
        "core": { label: "Core Concepts", style: { color: '#4CAF50', size: 28, shape: 'sphere' }, id: 'category-core' },
        "customization": { label: "Customization", style: { color: '#2196F3', size: 28, shape: 'sphere' }, id: 'category-customization'},
        "app": { label: "App Nodes", style: { color: '#FF9800', size: 28, shape: 'sphere' }, id: 'category-app'},
        "dynamic": { label: "Dynamic Examples", style: { color: '#E91E63', size: 28, shape: 'sphere' }, id: 'category-dynamic'},
        "webgl": { label: "WebGL Nodes", style: { color: '#9C27B0', size: 28, shape: 'sphere' }, id: 'category-webgl'},
        "visualizations": { label: "Visualizations", style: { color: '#00BCD4', size: 28, shape: 'sphere' }, id: 'category-visualizations'},
        "utils": { label: "Utilities", style: { color: '#795548', size: 28, shape: 'sphere' }, id: 'category-utils'}
    };

    const welcomeNode = graph.addNode('welcome-hub', {
        label: 'SpaceGraph.js Demos',
        style: {
            shape: 'rect',
            color: '#ABB2BF',
            size: 45,
            label: { size: 20, color: '#1c1e22' }
        }
    });

    Object.values(categories).forEach(catData => {
        if (catData.id === 'category-featured') return; // Featured is not a typical category hub

        const categoryNode = graph.addNode(catData.id, {
            label: catData.label,
            style: {
                ...graph.config.node.defaultStyle,
                ...catData.style,
                label: {
                    ...graph.config.node.defaultStyle.label,
                    ...(catData.style.label || {}),
                     color: catData.style.color // Make label same color as node for category hubs
                }
            }
        });
        graph.addEdge(welcomeNode.id, categoryNode.id, {
            length: 300,
            stiffness: 0.01,
            style: { color: catData.style.color, thickness: 2.5 }
        });
    });

    demos.forEach(demo => {
        const isFeatured = demo.category === 'featured';
        const demoNodeSize = isFeatured ? 28 : 16;
        const demoNodeShape = isFeatured ? 'diamond' : 'roundedRect';

        let categoryObject = categories[demo.category];
        if (!categoryObject && !isFeatured) {
            console.warn(`Demo "${demo.label}" has unknown category "${demo.category}". Falling back to default.`);
            categoryObject = { style: { color: graph.config.node.defaultStyle.color }}; // Basic fallback
        }

        const demoNodeColor = isFeatured
            ? categories.featured.style.color
            : categoryObject?.style?.color || graph.config.node.defaultStyle.color;

        // Create a slightly varied background for demo node labels for better visual separation
        const hslaColor = `hsla(${(demo.id.length * 20 + demo.label.length * 5) % 360}, 50%, 30%, 0.7)`;

        const node = graph.addNode(demo.id, {
            label: demo.label,
            style: {
                ...graph.config.node.defaultStyle,
                shape: demoNodeShape,
                color: demoNodeColor,
                size: demoNodeSize,
                label: {
                    ...graph.config.node.defaultStyle.label,
                    backgroundColor: hslaColor
                }
            }
        });
        node.data.href = demo.href;
        node.data.description = demo.description;

        if (isFeatured) {
            graph.addEdge(welcomeNode.id, node.id, {
                length: 150,
                stiffness: 0.02,
                style: { color: categories.featured.style.color, thickness: 3 }
            });
        } else if (categoryObject && categoryObject.id) {
             graph.addEdge(categoryObject.id, node.id, {
                length: 120 + Math.random() * 60,
                stiffness: 0.025
            });
        } else {
            // Fallback for demos with no valid category, link to welcome node
            graph.addEdge(welcomeNode.id, node.id, {
                length: 200 + Math.random() * 50,
                stiffness: 0.03
            });
        }
    });

    graph.on('node:click', (event) => {
        const node = event.detail.node;
        if (node && node.data.href) {
            window.location.href = node.data.href;
        }
    });

    graph.on('node:pointerover', (event) => {
        const node = event.detail.node;
        if (node && node.data.description) {
            demoInfoPanel.innerHTML = `<strong>${node.data.label || node.id}</strong><hr style="margin: 4px 0;"/>${node.data.description}`;
            demoInfoPanel.style.display = 'block';
            // Highlight node and its direct connections
            graph.highlightNode(node.id, true);
        } else if (node) { // For category nodes or welcome node that might not have a description
             demoInfoPanel.innerHTML = `<strong>${node.data.label || node.id}</strong>`;
             demoInfoPanel.style.display = 'block';
             graph.highlightNode(node.id, true);
        }
    });

    graph.on('node:pointerout', (event) => {
        demoInfoPanel.innerHTML = '';
        demoInfoPanel.style.display = 'none';
        graph.highlightNode(null); // Clear highlights
    });

console.log('Graph object before render call:', graph);
    if (typeof graph.render !== 'function') {
        console.error('graph.render is not a function. SpaceGraph instance is missing the render method.');
    }
    graph.render();
    graph.zoomToFit(null, 0.9, 800); // Zoom to fit after layout
    console.log('Enhanced demo launcher graph initialized with SpaceGraphZUI.');
});

