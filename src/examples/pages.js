import * as S from '../index.js';
import * as THREE from 'three'; // Directly import THREE for use in this file

// This is the original createExampleGraph function, now part of the first page.
function createFullExampleGraph(space) {
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
        type: 'html', // Changed from NoteNode for simplicity in this example
        position: { x: 200, y: 300, z: 0 }, // Adjusted position if it's a child
        data: { label: 'Child 1', content: '<p>Inside Group</p>', width: 120, height: 60, backgroundColor: '#445566' },
    });
    const gc2 = space.createNode({
        id: 'groupChild2',
        type: 'shape',
        position: { x: 300, y: 350, z: 10 }, // Adjusted position
        data: { label: 'Child 2 (Sphere)', shape: 'sphere', size: 40, color: 0x66ff99 },
    });

    // Declare n_group outside the if block to ensure its scope
    let n_group = null; // FIX: Declare groupNode outside the if block
    if (gc1 && gc2) {
        n_group = space.createNode({ // FIX: Assign to n_group
            id: 'groupNode1',
            type: 'group',
            position: { x: 250, y: 250, z: -10 }, // Group position
            data: {
                label: 'My Test Group',
                // width: 350, // Width/height can be auto-calculated or fixed
                // height: 250,
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
        // Add edge between children, if desired, after they are part of the group
        // space.addEdge(gc1, gc2, { label: 'intra-group', color: 0xdddddd, thickness: 1 });
    }
}


export const pages = [
    {
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
                      </ul>`,
        createGraph: createFullExampleGraph
    },
    {
        id: 'node-types',
        title: 'Node Types Showcase',
        description: `<h3>Node Types Showcase</h3>
                      <p>This page demonstrates the various types of nodes available in SpaceGraphJS.</p>
                      <ul>
                        <li><b>ShapeNode:</b> Displays 3D shapes like boxes, spheres, cylinders. (e.g., Box, Sphere, Capsule)</li>
                        <li><b>NoteNode/HtmlNode:</b> Renders HTML content, allowing for rich text, forms, and interactive elements.</li>
                        <li><b>ImageNode:</b> Displays images directly in the 3D space.</li>
                        <li><b>VideoNode:</b> Embeds and plays videos.</li>
                        <li><b>IFrameNode:</b> Embeds external web content using iframes.</li>
                        <li><b>GroupNode:</b> Allows grouping of other nodes, which can be collapsed or expanded.</li>
                      </ul>`,
        createGraph: function createNodeTypesGraph(space) {
            const commonProps = { mass: 1.0 };
            let yPos = -200;
            const yIncrement = 180;

            const shapeNodeBox = space.createNode({
                id: 'shapeBox', type: 'shape', position: { x: -300, y: yPos, z: 0 },
                data: { label: 'Box (ShapeNode)', shape: 'box', size: 80, color: 0xffaa00 }, ...commonProps
            });
            const shapeNodeSphere = space.createNode({
                id: 'shapeSphere', type: 'shape', position: { x: -100, y: yPos, z: 0 },
                data: { label: 'Sphere (ShapeNode)', shape: 'sphere', size: 50, color: 0x00aaff }, ...commonProps
            });
             const shapeNodeCapsule = space.createNode({
                id: 'shapeCapsule', type: 'shape', position: { x: 100, y: yPos, z: 0 },
                data: { label: 'Capsule (ShapeNode)', shape: 'capsule', size: {radius:30, height:80}, color: 0x00ffaa }, ...commonProps
            });

            yPos += yIncrement;
            const noteNode = space.createNode({
                id: 'noteNode', type: 'note', position: { x: -200, y: yPos, z: 0 },
                data: { label: 'NoteNode (HTML)', content: '<h3>HTML Content</h3><p>This is a <code>NoteNode</code>. It can render <b>rich HTML</b>.</p>', width: 250, height: 120, backgroundColor: '#334455' }, ...commonProps
            });

            yPos += yIncrement;
            const imageNode = space.createNode({
                id: 'imageNode', type: 'image', position: { x: -200, y: yPos, z: 0 },
                data: { label: 'ImageNode', imageUrl: 'https://placehold.co/200x150/FFAA00/000000?text=Image+Node', size: 150 }, ...commonProps
            });

            yPos += yIncrement + 50; // More space for video
            const videoNode = space.createNode({
                id: 'videoNode', type: 'video', position: { x: -200, y: yPos, z: 0 },
                data: {
                    label: 'VideoNode',
                    videoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
                    videoType: 'video/mp4', width: 240, height: 135, autoplay: true, muted: true, loop: true
                }, ...commonProps
            });

            yPos = -200; // Reset Y for the second column
            const xPosCol2 = 300;

            const iframeNode = space.createNode({
                id: 'iframeNode', type: 'iframe', position: { x: xPosCol2, y: yPos, z: 0 },
                data: { label: 'IFrameNode', iframeUrl: 'https://example.com', width: 300, height: 200 }, ...commonProps
            });

            yPos += yIncrement + 80;

            const groupChild1 = space.createNode({
                id: 'gc1', type: 'html', position: { x: xPosCol2 -50 , y: yPos + 50, z: 0 },
                data: { label: 'Child A', content: 'Child A', width:100, height:50, backgroundColor: '#556677'}, mass: 0.5
            });
            const groupChild2 = space.createNode({
                id: 'gc2', type: 'shape', position: { x: xPosCol2 + 50, y: yPos - 20, z: 10 },
                data: { label: 'Child B', shape:'sphere', size:30, color:0xcc66ff }, mass: 0.5
            });

            let groupNode = null; // FIX: Declare groupNode here
            if(groupChild1 && groupChild2) {
                groupNode = space.createNode({ // FIX: Assign to groupNode
                    id: 'groupNode', type: 'group', position: { x: xPosCol2, y: yPos, z: 0 },
                    data: {
                        label: 'GroupNode',
                        children: [groupChild1.id, groupChild2.id],
                        // width: 250, height: 180, // Optional: can be auto-calculated
                        backgroundColor: 'rgba(60,80,100,0.3)',
                        borderColor: 'rgba(150,180,220,0.7)',
                        headerColor: 'rgba(40,60,80,0.5)',
                    }, ...commonProps
                });
                space.addEdge(groupChild1, groupChild2, {label: "Internal", color: 0xaaaaaa, thickness:1});
            }

            // Connect some nodes for visual structure if desired, or leave them separate
            if (noteNode && imageNode) space.addEdge(noteNode, imageNode, {label: 'related'});
            if (shapeNodeBox && noteNode) space.addEdge(shapeNodeBox, noteNode);
            if (iframeNode && groupNode) space.addEdge(iframeNode, groupNode); // FIX: groupNode is now in scope

            // Add a central node to connect all demonstrated nodes for better initial layout
            const centralHub = space.createNode({
                id: 'hubNodeTypes', type: 'shape', position: { x: 0, y: 200, z: -50 },
                data: { label: 'Node Types Hub', shape: 'sphere', size: 20, color: 0xeeeeee, opacity: 0.5 }, mass: 0.1
            });

            [shapeNodeBox, shapeNodeSphere, shapeNodeCapsule, noteNode, imageNode, videoNode, iframeNode, groupNode].forEach(n => {
                if (n && centralHub) space.addEdge(centralHub, n, {type: 'dashed', color: 0x888888, thickness: 1});
            });
        }
    },
    {
        id: 'edge-types',
        title: 'Edge Types Showcase',
        description: `<h3>Edge Types Showcase</h3>
                      <p>This page illustrates the various ways edges (links between nodes) can be styled and configured.</p>
                      <ul>
                        <li><b>Basic Edge:</b> Default straight line.</li>
                        <li><b>Labeled Edge:</b> Edge with a text label.</li>
                        <li><b>Colored Edge:</b> Edge with a custom color.</li>
                        <li><b>Thick Edge:</b> Edge with increased thickness.</li>
                        <li><b>Dashed Edge:</b> Edge with a dashed line pattern.</li>
                        <li><b>Curved Edge:</b> Edge that curves between nodes (positive/negative curvature).</li>
                        <li><b>Arrowheads:</b> Edges with arrows at the source, target, or both ends.</li>
                        <li><b>Gradient Edge:</b> Edge with a color gradient.</li>
                      </ul>`,
        createGraph: function createEdgeTypesGraph(space) {
            const commonProps = { mass: 1.0, type: 'shape', data: { shape: 'sphere', size: 40 } };

            const n1 = space.createNode({ id: 'n1', position: { x: -200, y: 200, z: 0 }, data: { ...commonProps.data, label: 'N1', color: 0xff8888 }, ...commonProps });
            const n2 = space.createNode({ id: 'n2', position: { x: 200, y: 200, z: 0 }, data: { ...commonProps.data, label: 'N2', color: 0x88ff88 }, ...commonProps });
            const n3 = space.createNode({ id: 'n3', position: { x: -200, y: 0, z: 50 }, data: { ...commonProps.data, label: 'N3', color: 0x8888ff }, ...commonProps });
            const n4 = space.createNode({ id: 'n4', position: { x: 200, y: 0, z: 50 }, data: { ...commonProps.data, label: 'N4', color: 0xffcc00 }, ...commonProps });
            const n5 = space.createNode({ id: 'n5', position: { x: -200, y: -200, z: -30 }, data: { ...commonProps.data, label: 'N5', color: 0xcc88ff }, ...commonProps });
            const n6 = space.createNode({ id: 'n6', position: { x: 200, y: -200, z: -30 }, data: { ...commonProps.data, label: 'N6', color: 0x88ccff }, ...commonProps });
            const n7 = space.createNode({ // FIX: Moved type to top level and removed commonProps.data from data object
                id: 'n7',
                type: 'note',
                position: { x: 0, y: 100, z: 100 },
                data: {
                    label: 'N7 (HTML)',
                    content: 'Node for Edges',
                    width: 150,
                    height: 80,
                    backgroundColor: '#333'
                },
                mass: 1.2
            });
            const n8 = space.createNode({ id: 'n8', position: { x: 0, y: -100, z: -80 }, data: { ...commonProps.data, label: 'N8 (Box)', shape:'box', size:50, color: 0xffaabb }, ...commonProps });


            // Basic Edge (Implicit default type: 'straight')
            space.addEdge(n1, n2); // Will use default appearance

            // Labeled Edge
            space.addEdge(n1, n3, { label: 'Labeled Edge' });

            // Colored Edge
            space.addEdge(n2, n4, { label: 'Colored', color: 0xff00ff });

            // Thick Edge
            space.addEdge(n3, n4, { label: 'Thick', thickness: 5 });

            // Dashed Edge
            space.addEdge(n1, n7, { label: 'Dashed', dashed: true, dashSize: 8, gapSize: 4, color: 0x00ffff });

            // Curved Edge (Positive curvature)
            space.addEdge(n3, n5, { type: 'curved', label: 'Curved +0.5', curvature: 0.5, color: 0xffff00 });

            // Curved Edge (Negative curvature)
            space.addEdge(n4, n6, { type: 'curved', label: 'Curved -0.5', curvature: -0.5, color: 0x00ff00 });

            // Arrowheads: target
            space.addEdge(n5, n6, { label: 'Arrow: Target', arrowhead: 'target', thickness: 2, color: 0xffaaaa });

            // Arrowheads: source
            space.addEdge(n5, n7, { type: 'curved', curvature: 0.3, label: 'Arrow: Source', arrowhead: 'source', thickness: 2, color: 0xaa00aa });

            // Arrowheads: both
            space.addEdge(n6, n8, { type: 'curved', curvature: -0.2, label: 'Arrow: Both', arrowhead: 'both', thickness: 2, color: 0x00aa00 });

            // Gradient Edge (Straight)
            space.addEdge(n7, n8, { label: 'Gradient Straight', gradientColors: [0xff0000, 0x0000ff], thickness: 4 });

            // Gradient Edge (Curved)
            space.addEdge(n1, n8, { type: 'curved', curvature: 0.6, label: 'Gradient Curved', gradientColors: ['#00ffaa', '#ffaa00'], thickness: 3, arrowhead: 'target' });

            // Dashed and Arrow
            space.addEdge(n2, n7, { label: 'Dashed & Arrow', dashed: true, dashSize:5, gapSize:3, arrowhead: 'target', color: 0xcccccc, thickness: 1.5});
        }
    },
    // More pages will be added here
    {
        id: 'graph-generators',
        title: 'Graph Generators',
        description: `<h3>Graph Generators Showcase</h3>
                      <p>This page demonstrates generators that create graphs from data structures.</p>
                      <ul>
                        <li><b>FileSystemGenerator:</b> Creates a graph from a JSON object representing a file directory structure.</li>
                        <li><b>ObjectPropertyGenerator:</b> Visualizes a JavaScript object's properties as a graph.</li>
                      </ul>
                      <p>Each generator will create its graph below. They might be layered if generated simultaneously; consider refreshing or navigating to view them separately if needed, or if a UI to clear/regenerate is added.</p>`,
        createGraph: function createGeneratorDemos(space) {
            // 1. FileSystemGenerator Demo
            const fsData = {
                name: "ProjectRoot", type: "directory", children: [
                    { name: "src", type: "directory", children: [
                        { name: "index.js", type: "file", size: 1500 },
                        { name: "utils.js", type: "file", size: 800 },
                        { name: "components", type: "directory", children: [
                            { name: "Button.js", type: "file", size: 500 },
                            { name: "Card.js", type: "file", size: 700 }
                        ]}
                    ]},
                    { name: "docs", type: "directory", children: [
                        { name: "README.md", type: "file", size: 2000 }
                    ]},
                    { name: "package.json", type: "file", size: 600 }
                ]
            };
            const fsGenerator = new S.FileSystemGenerator();
            // Offset this graph slightly to avoid overlap with the next one initially
            fsGenerator.generate(fsData, space, { rootPosition: { x: -300, y: 200, z: 0 } });

            // 2. ObjectPropertyGenerator Demo
            const complexObject = {
                id: "user123",
                name: "Alice Wonderland",
                email: "alice@example.com",
                isActive: true,
                roles: ["admin", "editor", "viewer"],
                preferences: {
                    theme: "dark",
                    notifications: {
                        email: true,
                        sms: false,
                        push: { enabled: true, sound: "default" }
                    },
                    language: "en-US"
                },
                address: {
                    street: "123 Main St",
                    city: "Anytown",
                    zip: "12345",
                    countryDetails: { name: "Wonderland", code: "WL" }
                },
                metadata: null,
                lastLogin: new Date().toISOString(),
                friends: [ {id: "user456", name: "Bob"}, {id: "user789", name: "Charlie"} ]
            };
            const objGenerator = new S.ObjectPropertyGenerator();
            // Offset this graph
            objGenerator.generate(complexObject, space, { rootPosition: { x: 300, y: 200, z: -50 }, maxDepth: 4 });

            // Apply a layout after a short delay to allow nodes to be created
            setTimeout(() => {
                space.plugins.getPlugin('LayoutPlugin')?.applyLayout('force', { repulsion: 4000, centerStrength: 0.001 });
                const uiPlugin = space.plugins.getPlugin('UIPlugin');
                if (uiPlugin && uiPlugin.showNotification) {
                   uiPlugin.showNotification('FileSystem (left) and Object (right) graphs generated.', 'info', 6000);
                } else {
                   console.log("Demo: FileSystem and ObjectProperty graphs generated.");
                }
            }, 500);
        }
    },
    {
        id: 'camera-modes-info',
        title: 'Camera Modes Info',
        description: `<h3>New Camera Modes</h3>
                      <p>New camera modes have been added to enhance navigation:</p>
                      <ul>
                        <li><b>TopDownCamera:</b> Provides a 2D-like top-down view of the graph. Pan (drag or arrow keys if configured) moves across the XZ plane, and zoom (scroll) adjusts the height (Y-axis). Rotation may be restricted.</li>
                        <li><b>FirstPersonCamera:</b> A stub for a first-person perspective. Currently behaves like 'Free' camera mode (WASD for movement, mouse for looking, requires pointer lock). Future enhancements could include node attachment or physics-based movement.</li>
                      </ul>
                      <p>These modes can typically be selected from a camera controls UI element if available in the application.</p>
                      <p>This demo page itself doesn't activate a specific new camera mode by default, but loads a simple graph. Use your application's UI to switch camera modes.</p>`,
        createGraph: function createCameraModesInfoGraph(space) {
            // Create a simple graph for context
            const n1 = space.createNode({ id: 'cam_n1', type: 'shape', position: { x: 0, y: 0, z: 0 }, data: { label: 'Center', color: 0xcccccc } });
            const n2 = space.createNode({ id: 'cam_n2', type: 'shape', position: { x: 150, y: 0, z: 50 }, data: { label: 'Node A', shape: 'box', color: 0xcc6666 } });
            const n3 = space.createNode({ id: 'cam_n3', type: 'shape', position: { x: -100, y: 0, z: -80 }, data: { label: 'Node B', shape: 'sphere', color: 0x66cc66 } });
            space.addEdge(n1, n2);
            space.addEdge(n1, n3);

            setTimeout(() => {
                space.plugins.getPlugin('LayoutPlugin')?.applyLayout('force');
                const uiPlugin = space.plugins.getPlugin('UIPlugin');
                if (uiPlugin && uiPlugin.showNotification) {
                   uiPlugin.showNotification('Use UI to test TopDown or FirstPerson camera modes.', 'info', 5000);
                } else {
                   console.log("Demo: Use UI to test TopDown or FirstPerson camera modes.");
                }
           }, 100);
        }
    },
    {
        id: 'new-layouts',
        title: 'New Layouts',
        description: `<h3>New Layout Algorithms</h3>
                      <p>This page demonstrates new layout algorithms (currently stubs/basic implementations).</p>
                      <ul>
                        <li><b>TreeMapLayout:</b> Arranges nodes as nested rectangles (stub currently uses grid). Ideal for hierarchical data based on area.</li>
                        <li><b>RadialLayout:</b> Arranges nodes in concentric circles around a central point (stub uses simple circle).</li>
                      </ul>
                      <p>Select the desired layout from the UI dropdown to see its effect.</p>`,
        createGraph: function createNewLayoutsGraph(space) {
            const numNodes = 12;
            for (let i = 0; i < numNodes; i++) {
                space.createNode({
                    id: `n_layout_${i}`,
                    type: 'shape',
                    position: { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100, z: Math.random() * 50 - 25 },
                    data: {
                        label: `Node ${i}`,
                        shape: 'box',
                        size: Math.random() * 30 + 20, // For treemap areaProperty
                        color: new THREE.Color(Math.random() * 0xffffff).getHex(),
                        // For radial layout, could add parent/child relationships
                        // parentId: i > 0 ? `n_layout_${Math.floor(Math.random() * i)}` : null
                    }
                });
            }

            // Add some edges for radial layout if it were more sophisticated
            // for (let i = 1; i < numNodes; i++) {
            //     const sourceId = `n_layout_${i}`;
            //     const targetId = `n_layout_${Math.floor(Math.random() * i)}`;
            //     if (space.getNodeById(sourceId) && space.getNodeById(targetId)) {
            //         space.addEdgeById(S.Utils.generateId('edge'),sourceId, targetId);
            //     }
            // }

            // Initial layout can be anything, user will switch via UI
            setTimeout(() => {
                 space.plugins.getPlugin('LayoutPlugin')?.applyLayout('force');
                 // Instruct user to try new layouts from UI
                 const uiPlugin = space.plugins.getPlugin('UIPlugin');
                 if (uiPlugin && uiPlugin.showNotification) {
                    uiPlugin.showNotification('Try "treemap" or "radial" layouts from the UI dropdown!', 'info', 5000);
                 } else {
                    console.log("Demo: Try 'treemap' or 'radial' layouts from the UI dropdown!");
                 }
            }, 100);
        }
    },
    {
        id: 'new-edge-types',
        title: 'New Edge Types',
        description: `<h3>New Edge Types Showcase</h3>
                      <p>This page demonstrates recently added specialized edge types.</p>
                      <ul>
                        <li><b>DottedEdge:</b> An edge styled with a dotted pattern.</li>
                        <li><b>DynamicThicknessEdge:</b> An edge whose thickness can change based on a data value.</li>
                      </ul>`,
        createGraph: function createNewEdgeTypesGraph(space) {
            const commonProps = { mass: 1.0, type: 'shape', data: { shape: 'sphere', size: 40 } };

            const n1 = space.createNode({ id: 'n1e', position: { x: -250, y: 100, z: 0 }, data: { ...commonProps.data, label: 'N1', color: 0xff8888 }, ...commonProps });
            const n2 = space.createNode({ id: 'n2e', position: { x: 250, y: 100, z: 0 }, data: { ...commonProps.data, label: 'N2', color: 0x88ff88 }, ...commonProps });
            const n3 = space.createNode({ id: 'n3e', position: { x: -250, y: -100, z: 0 }, data: { ...commonProps.data, label: 'N3', color: 0x8888ff }, ...commonProps });
            const n4 = space.createNode({ id: 'n4e', position: { x: 250, y: -100, z: 0 }, data: { ...commonProps.data, label: 'N4 (Data Value: 75)', color: 0xffcc00, value: 75 }, ...commonProps }); // Added value for dynamic thickness

            // Dotted Edge
            space.addEdge(n1, n2, { type: 'dotted', label: 'Dotted Edge', color: 0x00ffff, thickness: 2, dashSize: 2, gapSize: 3 });

            // Dynamic Thickness Edge
            // Default range for thicknessDataKey 'value' is 0-100, mapping to visual thickness 1-10.
            // N4 has data.value = 75, so it should be 75% of the way from min to max thickness.
            // (75/100 * (10-1)) + 1 = 0.75 * 9 + 1 = 6.75 + 1 = 7.75 thickness
            const dynamicEdge = space.addEdge(n3, n4, {
                type: 'dynamicThickness',
                label: 'Dynamic Thickness (Value: 75)',
                color: 0xffaa00,
                thicknessDataKey: 'value', // Node N4 has 'value: 75' in its data
                // thicknessRange: { min: 0, max: 100 }, // Default
                // visualThicknessRange: { min: 1, max: 10 } // Default
            });

            // Example of how to update the dynamic edge's driving value (e.g., from UI or data change)
            // setTimeout(() => {
            //    if (dynamicEdge && typeof dynamicEdge.setValue === 'function') {
            //        const newValue = Math.random() * 100;
            //        n4.data.value = newValue; // Update node's data too if it's the source of truth
            //        dynamicEdge.setValue(newValue);
            //        dynamicEdge.data.label = `Dynamic Thickness (Value: ${newValue.toFixed(0)})`;
            //        // If label is handled by LabeledEdge/CurvedEdge, you might need to update labelObject directly
            //        if (dynamicEdge.labelObject?.element) dynamicEdge.labelObject.element.textContent = dynamicEdge.data.label;
            //        console.log(`Dynamic edge value set to ${newValue}`);
            //    }
            // }, 3000);
             setTimeout(() => space.plugins.getPlugin('LayoutPlugin')?.applyLayout('grid', {columns: 2, padding: {x:400, y:200}}), 100);
        }
    },
    {
        id: 'new-node-types',
        title: 'New Node Types',
        description: `<h3>New Node Types Showcase</h3>
                      <p>This page demonstrates recently added specialized node types.</p>
                      <ul>
                        <li><b>AudioNode:</b> Represents an audio source. (Visual stub)</li>
                        <li><b>DocumentNode:</b> Represents a document or file. (Visual stub)</li>
                        <li><b>ChartNode:</b> Intended to display charts using HTML/JS. (Visual/HTML stub)</li>
                      </ul>`,
        createGraph: function createNewNodeTypesGraph(space) {
            const commonProps = { mass: 1.0 };
            let xPos = -300;
            const xIncrement = 250;

            space.createNode({
                id: 'audioNode1', type: 'audio', position: { x: xPos, y: 0, z: 0 },
                data: { label: 'Audio Clip 🎵', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', color: 0x00ccff, size: 50 }, // FIX: Updated audioUrl
                ...commonProps
            });

            xPos += xIncrement;
            space.createNode({
                id: 'docNode1', type: 'document', position: { x: xPos, y: 0, z: 0 },
                data: { label: 'Report.pdf 📄', documentUrl: 'path/to/report.pdf', icon: '📄', color: 0xffaa00, size: 60 }, ...commonProps
            });

            xPos += xIncrement;
            space.createNode({
                id: 'chartNode1', type: 'chart', position: { x: xPos, y: 0, z: 0 },
                data: {
                    label: 'Sales Data 📊',
                    width: 280, height: 180, // For HtmlNode base
                    content: '<div style="padding:10px; background:#2a2a2b; border-radius:5px; color:white;">Chart Placeholder: Sales Q1</div>', // Simple HTML content for stub
                    // chartType: 'bar', chartData: { /* ... */ } // For actual chart rendering
                }, ...commonProps
            });

            // Example of a ChartNode based on BaseNode (3D mesh) if ChartNode was derived from BaseNode
            // xPos += xIncrement;
            // space.createNode({
            //     id: 'chartNode2', type: 'chart', position: { x: xPos, y: 0, z: 0 },
            //     data: { label: '3D Chart Stub', color: 0x33dd77, size: 70 }, ...commonProps
            // });

            // Apply a simple layout for visibility
            setTimeout(() => space.plugins.getPlugin('LayoutPlugin')?.applyLayout('grid', {columns: 3, padding: {x:200, y:100}}), 100);
        }
    },
];
