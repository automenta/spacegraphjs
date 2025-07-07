import * as S from '../../index.js';
// three.js is implicitly available via S.THREE, but direct import can be clearer if used extensively.
// import * // As THREE from 'three';

// Helper function to setup demo-specific menu items
function setupDemoMenu(space) {
    const uiPlugin = space.plugins.getPlugin('UIPlugin');
    if (uiPlugin && uiPlugin.uiManager && uiPlugin.uiManager.hudManager && uiPlugin.uiManager.hudManager.menuBar) {
        const menuBar = uiPlugin.uiManager.hudManager.menuBar;
        const demoMenu = menuBar.addMenu('demoMenu', 'Demo');

        if (demoMenu) {
            const actionsSection = demoMenu.addSection('demoActions', 'Demo Actions');
            actionsSection.addMenuItem('addRandomNode', 'Add Random Node', () => {
                const pos = { x: (Math.random() - 0.5) * 500, y: (Math.random() - 0.5) * 500, z: (Math.random() - 0.5) * 100 };
                const types = ['html', 'shape', 'image', 'video'];
                const type = types[Math.floor(Math.random() * types.length)];
                let data = { label: `Rnd ${type}` };
                if (type === 'html') data.content = 'Random HTML Node';
                if (type === 'shape') { data.shape = 'box'; data.color = Math.random() * 0xffffff; }
                if (type === 'image') data.imageUrl = 'https://placehold.co/100x50.png?text=Rnd';
                if (type === 'video') data.videoUrl = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';

                space.createNode({ type, position: pos, data });
                uiPlugin.uiManager.hudManager.showNotification('Added Random Node', 'success');
            });

            actionsSection.addMenuItem('toggleLayout', 'Toggle Layout (Kick)', () => {
                 const layoutPlugin = space.plugins.getPlugin('LayoutPlugin');
                 if(layoutPlugin && layoutPlugin.layoutManager) {
                    layoutPlugin.layoutManager.kick(); // Example: kick layout
                    uiPlugin.uiManager.hudManager.showNotification('Layout Kicked', 'info');
                 }
            });

            const infoSection = demoMenu.addSection('demoInfo', 'Demo Info', false); // Not pinnable
            const nodeCountElement = document.createElement('div');
            nodeCountElement.className = 'menu-item-like-text'; // Style like a menu item but not interactive
            infoSection.addElement(nodeCountElement);

            // Update node count dynamically
            const updateNodeCount = () => {
                const nodePlugin = space.plugins.getPlugin('NodePlugin');
                const count = nodePlugin && typeof nodePlugin.getNodes === 'function' ? nodePlugin.getNodes().size : 0;
                nodeCountElement.textContent = `Node Count: ${count}`;
            };
            space.on('node:added', updateNodeCount);
            space.on('node:removed', updateNodeCount);
            updateNodeCount(); // Initial count

        } else {
            console.warn("Demo Menu could not be added. MenuBar not available as expected.");
        }
    } else {
        console.warn("AdvancedHudManager or MenuBar not found, skipping demo menu setup.");
    }
}


const demoMetadata = {
    id: 'all-features',
    title: 'Full Demo',
    description: `<h3>Full Demo</h3>
                  <p>This is the original demonstration graph showcasing a variety of node types, edge styles, and interactions available in SpaceGraphJS.</p>
                  <ul>
                    <li>HTML Content Nodes (NoteNode)</li>
                    <li>3D Shape Nodes (Box, Sphere)</li>
                    <li>GLTF Model Loading</li>
                    <li>Image & Video Nodes</li>
                    <li>IFrame Embedding</li>
                    <li>Grouped Nodes</li>
                    <li>Various edge styles (curved, straight, dashed, gradient, arrows)</li>
                    <li>Node interactivity (sliders, buttons within HTML nodes)</li>
                  </ul>`
};

function createGraph(space) {
    const colors = ['#2a2a50', '#2a402a', '#402a2a', '#40402a', '#2a4040', '#402a40', '#503030'];
    let colorIndex = 0;
    const nextColor = () => colors[colorIndex++ % colors.length];

    const n1 = space.addNode(
        new S.NoteNode(
            'core',
            { x: 0, y: 0, z: 0 },
            {
                content: '<h1>🚀 READY 🧠</h1><p>Enhanced Mind Map</p>',
                width: 300,
                height: 110,
                backgroundColor: nextColor(),
            },
            2.5
        )
    );

    const n_features = space.addNode(
        new S.NoteNode(
            'features',
            { x: 350, y: 100, z: 20 },
            {
                content:
                    '<h2>Features ✨</h2><ul><li>HTML & 3D Nodes</li><li>Node Mass/Momentum</li><li>Edge Menu & Constraints</li><li>BG Toggle</li><li>3D Labels</li></ul>',
                width: 240,
                height: 190,
                backgroundColor: nextColor(),
                labelLod: [{ distance: 1000, style: 'visibility:hidden;' }],
            },
            1.5
        )
    );
    space.addEdge(n1, n_features);

    const n_box = space.addNode(
        new S.ShapeNode(
            'box1',
            { x: 600, y: 150, z: 30 },
            {
                label: 'Box Node 📦 (Mass 2.0)',
                shape: 'box',
                size: 70,
                color: 0xcc8833,
            },
            2.0
        )
    );
    space.addEdge(n_features, n_box, { constraintType: 'rigid', constraintParams: { distance: 180, stiffness: 0.08 } });

    const n_sphere = space.addNode(
        new S.ShapeNode(
            'sphere1',
            { x: 650, y: 0, z: -20 },
            {
                label: 'Sphere Node 🌐 (Mass 1.0)',
                shape: 'sphere',
                size: 80,
                color: 0x33aabb,
            },
            1.0
        )
    );
    space.addEdge(n_box, n_sphere, {
        constraintType: 'elastic',
        constraintParams: { idealLength: 150, stiffness: 0.002 },
    });
    space.addEdge(n_features, n_sphere);

    const n_tech = space.addNode(
        new S.NoteNode(
            'tech',
            { x: -350, y: 100, z: -10 },
            {
                content:
                    '<h2>Technology 💻</h2><p><code>Three.js</code> (WebGL, CSS3D)</p><p><code>GSAP</code>, <code>ES Modules</code></p>',
                width: 250,
                height: 120,
                backgroundColor: nextColor(),
            }
        )
    );
    space.addEdge(n1, n_tech);

    const n_style = space.addNode(
        new S.NoteNode(
            'style',
            { x: 0, y: -250, z: 0 },
            {
                content: '<h2>Style 🎨</h2><p>✨ Dark/Transparent BG</p><p>🎨 Node Colors</p><p>🕸️ Dot Grid BG</p>',
                width: 220,
                height: 110,
                backgroundColor: nextColor(),
            }
        )
    );
    space.addEdge(n1, n_style, { constraintType: 'weld' });

    const n_interactive = space.addNode(
        new S.NoteNode(
            'interactive',
            { x: 350, y: -150, z: -30 },
            {
                content: `<h2>Interactive</h2><p>Slider: <span class="slider-val">50</span></p>
        <input type="range" min="0" max="100" value="50" style="width: 90%; pointer-events: auto; cursor: pointer;"
               oninput="this.previousElementSibling.textContent = this.value; event.stopPropagation();"
               onpointerdown="event.stopPropagation();">
        <button onclick="alert('Button clicked!'); event.stopPropagation();" style="pointer-events: auto; cursor: pointer; margin-top: 5px;">Click</button>`,
                width: 230,
                height: 170,
                backgroundColor: nextColor(),
            }
        )
    );
    space.addEdge(n_features, n_interactive);
    space.addEdge(n_style, n_interactive, { constraintType: 'elastic', constraintParams: { idealLength: 250 } });

    if (n_tech && n_style) {
        space.addEdge(n_tech, n_style, {
            type: 'curved',
            label: 'Tech <-> Style (Gradient)',
            curvature: 0.4,
            gradientColors: [0xff00ff, 0x00ffff],
            thickness: 4,
        });
    }

    if (n_tech && n_box) {
        space.addEdge(n_tech, n_box, {
            type: 'straight',
            label: 'Tech <-> Box (Gradient)',
            gradientColors: ['#ffaa00', '#00ffaa'],
            thickness: 4,
            dashed: true,
            dashSize: 10,
            gapSize: 5,
        });
    }

    const n_image = space.createNode({
        id: 'imageNode1',
        type: 'image',
        position: { x: -350, y: -150, z: 40 },
        data: {
            label: 'Image Node 🖼️',
            imageUrl: 'https://placehold.co/200x150.png?text=SpaceGraph.js',
            size: 150,
        },
        mass: 1.2,
    });
    if (n_image && n_tech) {
        space.addEdge(n_tech, n_image, {
            type: 'curved',
            curvature: -0.3,
            label: 'Image Link',
        });
    }

    const n_gltf = space.createNode({
        id: 'gltfNode1',
        type: 'shape',
        position: { x: 0, y: 250, z: 50 },
        data: {
            label: 'GLTF Model 🚀',
            shape: 'gltf',
            gltfUrl:
                'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb',
            gltfScale: 80,
            color: 0xeeeeee,
            lodLevels: [
                {
                    distance: 0,
                    gltfUrl:
                        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb',
                    gltfScale: 80,
                },
                { distance: 600, shape: 'box', size: 40, color: 0xff8844 },
                { distance: 1200, shape: 'sphere', size: 20, color: 0x88ff44 },
            ],
            labelLod: [
                { distance: 500, style: 'visibility:hidden;' },
            ],
        },
        mass: 1.8,
    });

    if (n_gltf && n1) {
        space.addEdge(n1, n_gltf, {
            type: 'curved',
            curvature: 0.2,
            label: 'GLTF Link',
            thickness: 2,
        });
    }

    if (n_features && n_style) {
        space.addEdge(n_features, n_style, {
            label: 'Source Arrow',
            arrowhead: 'source',
            color: 0xff8800,
            thickness: 2,
        });
    }

    if (n_box && n_interactive) {
        space.addEdge(n_box, n_interactive, {
            label: 'Both Arrows',
            arrowhead: 'both',
            color: 0x88ff00,
            thickness: 2.5,
            dashed: true,
            dashScale: 0.5,
            dashSize: 5,
            gapSize: 5,
        });
    }

    if (n_sphere && n_gltf) {
        space.addEdge(n_sphere, n_gltf, {
            type: 'curved',
            label: 'Curved Arrow & Label',
            arrowhead: true,
            curvature: -0.25,
            color: 0x0088ff,
            thickness: 3,
        });
    }

    if (n_image && n_gltf) {
        space.addEdge(n_image, n_gltf, {
            type: 'curved',
            label: 'Curved Both Arrows',
            arrowhead: 'both',
            curvature: 0.35,
            gradientColors: [0xaa00ff, 0xffaa00],
            thickness: 3,
            labelLod: [{ distance: 700, style: 'visibility:hidden;' }],
        });
    }

    const n_video = space.createNode({
        id: 'videoNode1',
        type: 'video',
        position: { x: -600, y: 0, z: -50 },
        data: {
            label: 'Big Buck Bunny 🎬',
            videoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
            videoType: 'video/mp4',
            width: 320,
            height: 180,
            autoplay: true,
            muted: true,
            loop: true,
            controls: true,
        },
        mass: 1.5,
    });

    if (n_video && n_tech) {
        space.addEdge(n_tech, n_video, {
            type: 'curved',
            label: 'Video Link',
            curvature: 0.2,
            arrowhead: 'target',
        });
    }

    const n_iframe = space.createNode({
        id: 'iframeNode1',
        type: 'iframe',
        position: { x: -600, y: -250, z: 0 },
        data: {
            label: 'Embedded Content 🌐',
            iframeUrl: 'https://en.m.wikipedia.org/wiki/Special:Random',
            width: 400,
            height: 300,
        },
        mass: 1.4,
    });

    if (n_iframe && n_video) {
        space.addEdge(n_video, n_iframe, {
            type: 'curved',
            label: 'IFrame Link',
            curvature: -0.25,
            arrowhead: 'target',
            color: 0xcc44cc,
        });
    }

    const gc1 = space.createNode({
        id: 'groupChild1',
        type: 'html',
        position: { x: 200, y: 300, z: 0 },
        data: { label: 'Child 1', content: '<p>Inside Group</p>', width: 120, height: 60, backgroundColor: '#445566' },
    });
    const gc2 = space.createNode({
        id: 'groupChild2',
        type: 'shape',
        position: { x: 300, y: 350, z: 10 },
        data: { label: 'Child 2 (Sphere)', shape: 'sphere', size: 40, color: 0x66ff99 },
    });

    let n_group = null;
    if (gc1 && gc2) {
        n_group = space.createNode({
            id: 'groupNode1',
            type: 'group',
            position: { x: 250, y: 250, z: -10 },
            data: {
                label: 'My Test Group',
                children: [gc1.id, gc2.id],
                defaultCollapsed: false,
                backgroundColor: 'rgba(70, 70, 90, 0.2)',
                borderColor: 'rgba(200, 200, 220, 0.6)',
                headerColor: 'rgba(30, 30, 50, 0.4)',
            },
            mass: 2.0,
        });

        if (n_group && n1) {
            space.addEdge(n1, n_group, {
                type: 'curved',
                label: 'Group Link',
                arrowhead: 'target',
                color: 0xffdd88,
                thickness: 2.5,
            });
        }
    }
}

export { createGraph, demoMetadata, setupDemoMenu };
