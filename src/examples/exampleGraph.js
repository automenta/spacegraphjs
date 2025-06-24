import * as S from '../index.js'; // Import the bundled library

export function createExampleGraph(space) {
    // console.log('Creating example graph...');
    const colors = ['#2a2a50', '#2a402a', '#402a2a', '#40402a', '#2a4040', '#402a40', '#503030'];
    let colorIndex = 0;
    const nextColor = () => colors[colorIndex++ % colors.length];

    // Core Node (Heavier)
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
    ); // Mass = 2.5

    // Features Branch
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
                // Label LOD for HtmlNode (hides entire node)
                labelLod: [{ distance: 1000, style: 'visibility:hidden;' }],
            },
            1.5
        )
    ); // Mass = 1.5
    space.addEdge(n1, n_features);

    // Shape Nodes (Different Masses)
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
    ); // Mass = 2.0
    // Rigid link example
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
    ); // Mass = 1.0
    // Elastic link example
    space.addEdge(n_box, n_sphere, {
        constraintType: 'elastic',
        constraintParams: { idealLength: 150, stiffness: 0.002 },
    });
    space.addEdge(n_features, n_sphere); // Cross link

    // Tech Branch
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

    // Style Branch
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
    // Weld constraint example (strong rigid link)
    space.addEdge(n1, n_style, { constraintType: 'weld' });

    // Interactive Node Example
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

    // Example of a curved edge with a gradient
    if (n_tech && n_style) {
        space.addEdge(n_tech, n_style, {
            type: 'curved', // Specify curved type
            label: 'Tech <-> Style (Gradient)',
            curvature: 0.4,
            gradientColors: [0xff00ff, 0x00ffff], // Magenta to Cyan
            // gradientColors: ['#ff00ff', '#00ffff'], // String format also works
            thickness: 4,
        });
    }

    // Example of a straight edge with a gradient
    if (n_tech && n_box) {
        space.addEdge(n_tech, n_box, {
            type: 'straight', // Default, but can be explicit
            label: 'Tech <-> Box (Gradient)',
            gradientColors: ['#ffaa00', '#00ffaa'], // Orange to Green
            thickness: 4,
            dashed: true,
            dashSize: 10,
            gapSize: 5,
        });
    }

    // Example of an ImageNode
    const n_image = space.createNode({
        id: 'imageNode1',
        type: 'image',
        position: { x: -350, y: -150, z: 40 },
        data: {
            label: 'Image Node 🖼️',
            // Using a placeholder image service URL
            imageUrl: 'https://placehold.co/200x150.png?text=SpaceGraph.js', // Changed placeholder service
            size: 150, // Max dimension for the image plane
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

    // Example of a ShapeNode with GLTF model
    const n_gltf = space.createNode({
        id: 'gltfNode1',
        type: 'shape', // Type is 'shape'
        position: { x: 0, y: 250, z: 50 },
        data: {
            label: 'GLTF Model 🚀',
            shape: 'gltf', // Specify shape as 'gltf'
            // Using a simple model from Khronos Group samples
            // https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/ToyCar
            gltfUrl:
                'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb',
            gltfScale: 80,
            color: 0xeeeeee,
            // Mesh LOD Example:
            lodLevels: [
                {
                    distance: 0,
                    gltfUrl:
                        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb',
                    gltfScale: 80,
                },
                { distance: 600, shape: 'box', size: 40, color: 0xff8844 }, // Simpler box at distance
                { distance: 1200, shape: 'sphere', size: 20, color: 0x88ff44 }, // Simplest sphere further away
            ],
            // Label LOD Example for ShapeNode:
            labelLod: [
                { distance: 500, style: 'visibility:hidden;' }, // Hide label if camera is > 500 units away
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

    // Arrowhead examples
    if (n_features && n_style) {
        space.addEdge(n_features, n_style, {
            label: 'Source Arrow',
            arrowhead: 'source', // Arrow only at source
            color: 0xff8800,
            thickness: 2,
        });
    }

    if (n_box && n_interactive) {
        space.addEdge(n_box, n_interactive, {
            label: 'Both Arrows',
            arrowhead: 'both', // Arrows at source and target
            color: 0x88ff00,
            thickness: 2.5,
            dashed: true,
            dashScale: 0.5,
            dashSize: 5,
            gapSize: 5,
        });
    }

    // Curved edge with target arrow and label
    if (n_sphere && n_gltf) {
        space.addEdge(n_sphere, n_gltf, {
            type: 'curved',
            label: 'Curved Arrow & Label',
            arrowhead: true, // Defaults to target
            curvature: -0.25,
            color: 0x0088ff,
            thickness: 3,
        });
    }

    // Curved edge with both arrows
    if (n_image && n_gltf) {
        space.addEdge(n_image, n_gltf, {
            type: 'curved',
            label: 'Curved Both Arrows',
            arrowhead: 'both',
            curvature: 0.35,
            gradientColors: [0xaa00ff, 0xffaa00],
            thickness: 3,
            // Label LOD for a CurvedEdge
            labelLod: [{ distance: 700, style: 'visibility:hidden;' }],
        });
    }

    // const nodePlugin = space.plugins?.getPlugin('NodePlugin');
    // const edgePlugin = space.plugins?.getPlugin('EdgePlugin');
    // const nodeCount = nodePlugin?.getNodes()?.size || 0;
    // const edgeCount = edgePlugin?.getEdges()?.size || 0;

    // console.log(`Example graph created: ${nodeCount} nodes, ${edgeCount} edges.`);

    // Video Node Example
    const n_video = space.createNode({
        id: 'videoNode1',
        type: 'video',
        position: { x: -600, y: 0, z: -50 },
        data: {
            label: 'Big Buck Bunny 🎬',
            // Sintel trailer (Creative Commons) - ensure this is a direct video link or CORS enabled
            // Using a common test video URL
            videoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
            videoType: 'video/mp4',
            width: 320,
            height: 180, // Adjust height for 16:9 aspect ratio
            autoplay: true,
            muted: true, // Important for autoplay
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

    // IFrame Node Example
    const n_iframe = space.createNode({
        id: 'iframeNode1',
        type: 'iframe',
        position: { x: -600, y: -250, z: 0 },
        data: {
            label: 'Embedded Content 🌐',
            iframeUrl: 'https://en.m.wikipedia.org/wiki/Special:Random', // Random Wikipedia page
            width: 400,
            height: 300,
            // Example sandbox policy - be careful with this for unknown URLs
            // sandbox: 'allow-scripts allow-same-origin allow-popups'
        },
        mass: 1.4,
    });

    if (n_iframe && n_video) {
        // Link it to the video node for variety
        space.addEdge(n_video, n_iframe, {
            type: 'curved',
            label: 'IFrame Link',
            curvature: -0.25,
            arrowhead: 'target',
            color: 0xcc44cc,
        });
    }

    // Group Node Example
    // First, create some nodes that will be children of the group
    const gc1 = space.createNode({
        id: 'groupChild1',
        type: 'html',
        position: { x: 200, y: 300, z: 0 },
        data: { label: 'Child 1', content: 'Inside Group', width: 100, height: 50, backgroundColor: '#445566' },
    });
    const gc2 = space.createNode({
        id: 'groupChild2',
        type: 'shape',
        position: { x: 300, y: 350, z: 10 },
        data: { label: 'Child 2 (Sphere)', shape: 'sphere', size: 40, color: 0x66ff99 },
    });

    if (gc1 && gc2) {
        // Ensure children are created before group references them
        const n_group = space.createNode({
            id: 'groupNode1',
            type: 'group',
            position: { x: 250, y: 250, z: -10 }, // Position the group itself
            data: {
                label: 'My Test Group',
                width: 350, // Initial visual size of the group box
                height: 250,
                children: [gc1.id, gc2.id], // Pass child IDs
                defaultCollapsed: false,
                // Custom group appearance
                backgroundColor: 'rgba(70, 70, 90, 0.2)',
                borderColor: 'rgba(200, 200, 220, 0.6)',
                headerColor: 'rgba(30, 30, 50, 0.4)',
            },
            mass: 2.0, // Group itself can have mass
        });

        if (n_group && n1) {
            // Link group to the main core node
            space.addEdge(n1, n_group, {
                type: 'curved',
                label: 'Group Link',
                arrowhead: 'target',
                color: 0xffdd88,
                thickness: 2.5,
            });
        }
        // Optionally, link children to each other (layout will handle them)
        space.addEdge(gc1, gc2, { label: 'intra-group', color: 0xdddddd, thickness: 1 });
    }
}
