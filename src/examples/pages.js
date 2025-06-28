import * as S from '../index.js';
import * as THREE from 'three'; // Directly import THREE for use in this file

// --- Helper function for colors ---
const demoColors = ['#2a2a50', '#2a402a', '#402a2a', '#40402a', '#2a4040', '#402a40', '#503030', '#305030', '#303050'];
let demoColorIndex = 0;
const nextDemoColor = () => demoColors[demoColorIndex++ % demoColors.length];

// --- Page Generation Functions ---

function createWelcomeOverviewGraph(space) {
    space.createNode({
        id: 'welcome',
        type: 'note',
        position: { x: 0, y: 50, z: 0 },
        mass: 2.0,
        data: {
            content: '<h1>Welcome to SpaceGraphJS!</h1><p>Explore the demos to see various features.</p>',
            width: 320,
            height: 130,
            backgroundColor: nextDemoColor(),
        },
    });
    const shapeNode = space.createNode({
        id: 'shapeIntro',
        type: 'shape',
        position: { x: -250, y: -50, z: -20 },
        data: { label: '3D ShapeNode', shape: 'sphere', size: 60, color: 0x33aabb },
    });
    const htmlNode = space.createNode({
        id: 'htmlIntro',
        type: 'html',
        position: { x: 250, y: -70, z: 10 },
        data: {
            label: 'HTML Node',
            content: '<p>Rich HTML content inside nodes!</p>',
            width: 200,
            height: 100,
            backgroundColor: nextDemoColor(),
        },
    });
    if (shapeNode && htmlNode) {
        space.addEdge(shapeNode, htmlNode, { label: 'Linked', type: 'curved', curvature: 0.3 });
    }
}

function createBasicNodesGraph(space) {
    space.createNode({
        id: 'bn_sphere',
        type: 'shape',
        position: { x: -200, y: 0, z: 0 },
        data: { label: 'Sphere (ShapeNode)', shape: 'sphere', size: 70, color: 0x33aabb },
    });
    space.createNode({
        id: 'bn_box',
        type: 'shape',
        position: { x: 0, y: 0, z: 0 },
        data: { label: 'Box (ShapeNode)', shape: 'box', size: 60, color: 0xcc8833 },
    });
    // Assuming 'capsule' is a valid shape for ShapeNode
    space.createNode({
        id: 'bn_capsule',
        type: 'shape',
        position: { x: 200, y: 0, z: 0 },
        data: { label: 'Capsule (ShapeNode)', shape: 'capsule', size: { radius: 30, height: 70 }, color: 0x88cc44 },
    });
    space.createNode({
        id: 'bn_note',
        type: 'note',
        position: { x: 0, y: 150, z: 0 },
        data: {
            label: 'Simple Note',
            content: 'A basic NoteNode for text.',
            width: 200,
            height: 80,
            backgroundColor: nextDemoColor(),
        },
    });
    space.createNode({
        id: 'bn_datanode',
        type: 'data',
        position: { x: 0, y: -150, z: 0 },
        data: { label: 'Data Node', value: { info: 'Raw data container', count: 42 }, color: 0xaa00aa, size: 50 },
    });
}

function createHtmlNodesAdvancedGraph(space) {
    space.createNode({
        id: 'hn_interactive',
        type: 'html',
        position: { x: 0, y: 100, z: 0 },
        data: {
            label: 'Interactive HTML',
            content: `<h3>Interactive Controls</h3>
                      <p>Slider: <span class="slider-val">60</span></p>
                      <input type="range" min="0" max="100" value="60" style="width: 90%; pointer-events: auto; cursor: pointer;"
                             oninput="this.parentElement.querySelector('.slider-val').textContent = this.value; event.stopPropagation();"
                             onpointerdown="event.stopPropagation();">
                      <button onclick="alert('Button inside HTML node clicked!'); event.stopPropagation();" style="pointer-events: auto; cursor: pointer; margin-top: 10px;">Click Me</button>`,
            width: 250,
            height: 180,
            backgroundColor: nextDemoColor(),
        },
    });
    space.createNode({
        id: 'hn_editable',
        type: 'html',
        position: { x: -300, y: -50, z: 0 },
        data: {
            label: 'Editable HTML (Toggle via Metaframe)',
            content:
                '<p>Click the "Edit Content" button on the Metaframe to edit this text directly!</p><p>Supports <b>bold</b>, <i>italics</i>, etc.</p>',
            width: 280,
            height: 150,
            backgroundColor: nextDemoColor(),
            editable: false, // Initial state, can be toggled
        },
    });
    space.createNode({
        id: 'hn_styled',
        type: 'html',
        position: { x: 300, y: -50, z: 0 },
        data: {
            label: 'Styled HTML',
            content: `<div style="font-family: 'Courier New', Courier, monospace; padding: 10px; border: 2px dashed cyan; background: #222; color: lightgreen;">
                        <h3>Custom Styles</h3>
                        <p>This node's content has its own internal CSS styling.</p>
                      </div>`,
            width: 300,
            height: 160,
            backgroundColor: 'transparent', // Node bg transparent to show content bg
        },
    });
}

function createMediaNodesGraph(space) {
    space.createNode({
        id: 'mn_image',
        type: 'image',
        position: { x: -250, y: 0, z: 0 },
        data: { label: 'ImageNode', imageUrl: 'https://placehold.co/200x150/FFAA00/000000?text=Image+Node', size: 150 },
    });
    space.createNode({
        id: 'mn_video',
        type: 'video',
        position: { x: 100, y: 0, z: 0 },
        data: {
            label: 'VideoNode',
            videoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
            videoType: 'video/mp4',
            width: 320,
            height: 180,
            autoplay: true,
            muted: true,
            loop: true,
            controls: true,
            backgroundColor: nextDemoColor(),
        },
    });
    space.createNode({
        id: 'mn_audio',
        type: 'audio',
        position: { x: 450, y: 0, z: 0 },
        data: {
            label: 'AudioNode',
            audioUrl: 'https://www.w3schools.com/html/horse.mp3',
            color: 0x00ccff,
            size: 60,
            controls: true,
            autoplay: false,
            loop: true,
        },
    });
}

function createEmbeddingNodesGraph(space) {
    space.createNode({
        id: 'en_iframe',
        type: 'iframe',
        position: { x: -300, y: 0, z: 0 },
        data: {
            label: 'IFrameNode (Wikipedia)',
            iframeUrl: 'https://en.m.wikipedia.org/wiki/Special:Random',
            width: 400,
            height: 300,
        },
    });
    space.createNode({
        id: 'en_doc',
        type: 'document',
        position: { x: 150, y: 0, z: 0 },
        data: {
            label: 'DocumentNode (Stub)',
            documentUrl: 'path/to/your/document.pdf',
            icon: '📄',
            color: 0xffaa00,
            size: 70,
        },
    });
    space.createNode({
        id: 'en_chart',
        type: 'chart',
        position: { x: 450, y: 0, z: 0 },
        data: {
            label: 'ChartNode (Stub)',
            content:
                '<div style="padding:10px; background:#203040; border-radius:5px; color:white; text-align: center;"><h3>📊 Sales Q1</h3><p>(Chart Placeholder)</p></div>',
            width: 280,
            height: 180,
            // chartType: 'bar', chartData: { /* ... */ } // For actual chart rendering
        },
    });
}

function createGltfNodesGraph(space) {
    space.createNode({
        id: 'gltf_car',
        type: 'shape',
        position: { x: 0, y: 0, z: 0 },
        mass: 1.8,
        data: {
            label: 'Toy Car (GLTF)',
            shape: 'gltf',
            gltfUrl:
                'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb',
            gltfScale: 100,
            color: 0xeeeeee, // Base color if material doesn't specify
        },
    });
    space.createNode({
        id: 'gltf_lod',
        type: 'shape',
        position: { x: 250, y: 0, z: 50 },
        mass: 1.5,
        data: {
            label: 'GLTF with LODs',
            shape: 'gltf',
            gltfUrl:
                'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb', // Using a different model for variety
            gltfScale: 80,
            lodLevels: [
                {
                    distance: 0,
                    gltfUrl:
                        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
                    gltfScale: 80,
                },
                { distance: 500, shape: 'box', size: 40, color: 0xff8844 },
                { distance: 1000, shape: 'sphere', size: 20, color: 0x88ff44 },
            ],
            labelLod: [{ distance: 400, style: 'visibility:hidden;' }],
        },
    });
}

function createGroupNodesGraph(space) {
    const gc1 = space.createNode({
        id: 'groupChild1',
        type: 'note',
        position: { x: -80, y: 50, z: 0 }, // Relative to group if added as child
        data: { label: 'Child A', content: 'Grouped Note', width: 120, height: 60, backgroundColor: nextDemoColor() },
    });
    const gc2 = space.createNode({
        id: 'groupChild2',
        type: 'shape',
        position: { x: 80, y: -30, z: 10 },
        data: { label: 'Child B', shape: 'sphere', size: 40, color: 0x66ff99 },
    });
    const gc3 = space.createNode({
        id: 'groupChild3',
        type: 'image',
        position: { x: 0, y: -80, z: -10 },
        data: { label: 'Child C', imageUrl: 'https://placehold.co/100x80', size: 80 },
    });

    if (gc1 && gc2 && gc3) {
        space.createNode({
            id: 'groupNode1',
            type: 'group',
            position: { x: 0, y: 0, z: -50 },
            mass: 2.0,
            data: {
                label: 'My First Group (Expandable)',
                children: [gc1.id, gc2.id, gc3.id],
                defaultCollapsed: false,
                backgroundColor: 'rgba(70, 70, 90, 0.25)',
                borderColor: 'rgba(200, 200, 220, 0.7)',
                headerColor: 'rgba(40, 40, 60, 0.5)',
            },
        });
    }

    const gc_inner1 = space.createNode({
        id: 'gc_inner1',
        type: 'shape',
        position: { x: -50, y: 0, z: 0 },
        data: { label: 'Inner 1', shape: 'box', size: 30, color: 0xffddaa },
    });
    const gc_inner2 = space.createNode({
        id: 'gc_inner2',
        type: 'shape',
        position: { x: 50, y: 0, z: 0 },
        data: { label: 'Inner 2', shape: 'sphere', size: 20, color: 0xaaddff },
    });

    if (gc_inner1 && gc_inner2) {
        const subGroup = space.createNode({
            id: 'subGroup',
            type: 'group',
            position: { x: 300, y: 150, z: 0 },
            data: {
                label: 'Sub-Group (Collapsed)',
                children: [gc_inner1.id, gc_inner2.id],
                defaultCollapsed: true,
                backgroundColor: 'rgba(90,70,70,0.3)',
            },
        });
        if (subGroup && gc1) space.addEdge(gc1, subGroup, { label: 'to subgroup' });
    }
}

function createEdgeStylesBasicGraph(space) {
    const n1 = space.createNode({
        id: 'eb_n1',
        type: 'shape',
        position: { x: -200, y: 100, z: 0 },
        data: { label: 'N1', shape: 'sphere', size: 50, color: 0xff8888 },
    });
    const n2 = space.createNode({
        id: 'eb_n2',
        type: 'shape',
        position: { x: 200, y: 100, z: 0 },
        data: { label: 'N2', shape: 'sphere', size: 50, color: 0x88ff88 },
    });
    const n3_node = space.createNode({
        id: 'eb_n3',
        type: 'shape',
        position: { x: -200, y: -100, z: 0 },
        data: { label: 'N3', shape: 'box', size: 60, color: 0x8888ff },
    });
    const n4 = space.createNode({
        id: 'eb_n4',
        type: 'shape',
        position: { x: 200, y: -100, z: 0 },
        data: { label: 'N4', shape: 'box', size: 60, color: 0xffcc00 },
    });

    space.addEdge(n1, n2, { label: 'Default Edge' });
    space.addEdge(n1, n3_node, { label: 'Colored & Thick', color: 0xff00ff, thickness: 4 });
    space.addEdge(n2, n4, { label: 'Dashed Edge', dashed: true, dashSize: 8, gapSize: 4, color: 0x00ffff });
    space.addEdge(n3_node, n4, { label: 'Another Label', thickness: 2 });
}

function createEdgeStylesAdvancedGraph(space) {
    const n1 = space.createNode({
        id: 'ea_n1',
        type: 'shape',
        position: { x: -250, y: 150, z: 0 },
        data: { label: 'N1', shape: 'sphere', size: 50, color: 0xff8888 },
    });
    const n2 = space.createNode({
        id: 'ea_n2',
        type: 'shape',
        position: { x: 250, y: 150, z: 0 },
        data: { label: 'N2', shape: 'sphere', size: 50, color: 0x88ff88 },
    });
    const n3 = space.createNode({
        id: 'ea_n3',
        type: 'shape',
        position: { x: -250, y: -150, z: 0 },
        data: { label: 'N3', shape: 'box', size: 60, color: 0x8888ff },
    });
    const n4 = space.createNode({
        id: 'ea_n4',
        type: 'shape',
        position: { x: 250, y: -150, z: 0 },
        data: { label: 'N4', shape: 'box', size: 60, color: 0xffcc00 },
    });
    const n5 = space.createNode({
        id: 'ea_n5',
        type: 'note',
        position: { x: 0, y: 0, z: 50 },
        data: { label: 'N5', content: 'Central Node', width: 150, height: 70, backgroundColor: nextDemoColor() },
    });

    space.addEdge(n1, n5, {
        type: 'curved',
        label: 'Curved (+0.5)',
        curvature: 0.5,
        color: 0xffff00,
        arrowhead: 'target',
    });
    space.addEdge(n2, n5, {
        type: 'curved',
        label: 'Curved (-0.4)',
        curvature: -0.4,
        color: 0x00ff00,
        arrowhead: 'source',
    });
    space.addEdge(n3, n5, { label: 'Arrow: Both Ends', arrowhead: 'both', thickness: 2.5, color: 0xffaaaa });
    space.addEdge(n4, n5, {
        label: 'Gradient Edge',
        gradientColors: [0xff0000, 0x0000ff],
        thickness: 4,
        type: 'curved',
        curvature: 0.2,
    });
    space.addEdge(n1, n2, {
        label: 'Curved, Dashed, Arrows',
        type: 'curved',
        curvature: 0.3,
        dashed: true,
        dashSize: 4,
        gapSize: 4,
        arrowhead: 'both',
        color: 0xcccccc,
    });
}

function createEdgeTypesSpecialGraph(space) {
    const n1 = space.createNode({
        id: 'es_n1',
        type: 'shape',
        position: { x: -200, y: 0, z: 0 },
        data: { label: 'N1', color: 0xff8888 },
    });
    const n2 = space.createNode({
        id: 'es_n2',
        type: 'shape',
        position: { x: 200, y: 0, z: 0 },
        data: { label: 'N2', color: 0x88ff88 },
    });
    const n3 = space.createNode({
        id: 'es_n3',
        type: 'shape',
        position: { x: -200, y: -150, z: 0 },
        data: { label: 'N3', color: 0x8888ff },
    });
    const n4 = space.createNode({
        id: 'es_n4',
        type: 'shape',
        position: { x: 200, y: -150, z: 0 },
        data: { label: 'N4 (Value: 75)', color: 0xffcc00, value: 75 },
    });

    space.addEdge(n1, n2, {
        type: 'dotted',
        label: 'Dotted Edge',
        color: 0x00ffff,
        thickness: 2.5,
        dashSize: 2,
        gapSize: 5,
    });
    space.addEdge(n3, n4, {
        type: 'dynamicThickness',
        label: 'Dynamic Thickness (Value: 75)',
        color: 0xffaa00,
        thicknessDataKey: 'value', // Node N4 has data.value = 75
        // thicknessRange: { min: 0, max: 100 }, // Default
        // visualThicknessRange: { min: 1, max: 10 } // Default
    });
}

function createLayoutsShowcaseGraph(space) {
    const numNodes = 15;
    const center = space.createNode({
        id: 'layout_center',
        type: 'shape',
        position: { x: 0, y: 0, z: 0 },
        data: { label: 'Center', size: 30, color: 0xcccccc },
    });
    for (let i = 0; i < numNodes; i++) {
        const node = space.createNode({
            id: `layout_n${i}`,
            type: 'shape',
            position: { x: Math.random() * 400 - 200, y: Math.random() * 400 - 200, z: Math.random() * 100 - 50 },
            data: {
                label: `LNode ${i}`,
                shape: i % 2 === 0 ? 'box' : 'sphere',
                size: Math.random() * 40 + 20,
                color: new THREE.Color(Math.random() * 0xffffff).getHex(),
            },
        });
        if (node && center && Math.random() > 0.3) {
            space.addEdge(center, node, { type: i % 3 === 0 ? 'curved' : 'straight', curvature: 0.3 });
        }
        if (node && i > 0 && Math.random() > 0.5) {
            const targetNode = space.plugins
                .getPlugin('NodePlugin')
                .getNodeById(`layout_n${Math.floor(Math.random() * i)}`);
            if (targetNode) space.addEdge(node, targetNode);
        }
    }
    // Inform user to use UI for layouts
    setTimeout(() => {
        const uiPlugin = space.plugins.getPlugin('UIPlugin');
        if (uiPlugin?.uiManager?.hudManager?.showNotification) {
            uiPlugin.uiManager.hudManager.showNotification(
                'Use the "Layouts" dropdown in the toolbar to apply different algorithms!',
                'info',
                8000
            );
        }
    }, 500);
}

function createInteractionControlsGraph(space) {
    const n1 = space.createNode({
        id: 'ic_n1',
        type: 'note',
        position: { x: -150, y: 50, z: 0 },
        data: {
            label: 'Interact!',
            content: 'Try dragging me!',
            width: 180,
            height: 80,
            backgroundColor: nextDemoColor(),
        },
    });
    const n2 = space.createNode({
        id: 'ic_n2',
        type: 'shape',
        position: { x: 150, y: -50, z: 0 },
        data: { label: 'Resize Me!', shape: 'box', size: 70, color: 0xcc8833 },
    });
    space.createNode({
        id: 'ic_n3',
        type: 'html',
        position: { x: 0, y: -150, z: 20 },
        data: {
            label: 'Link from me',
            content: 'Right-click or use Metaframe "Link"',
            width: 200,
            height: 100,
            backgroundColor: nextDemoColor(),
        },
    });

    if (n1 && n2) space.addEdge(n1, n2, { label: 'Connection' });

    setTimeout(() => {
        const uiPlugin = space.plugins.getPlugin('UIPlugin');
        if (uiPlugin?.uiManager?.hudManager?.showNotification) {
            uiPlugin.uiManager.hudManager.showNotification(
                'Click nodes to select & show Metaframe. Drag handles to move/resize. Right-click for context menu.',
                'info',
                10000
            );
        }
    }, 500);
}

function createCameraControlsGraph(space) {
    space.createNode({
        id: 'cam_center',
        type: 'shape',
        position: { x: 0, y: 0, z: 0 },
        data: { label: 'World Center', color: 0xffffff, size: 20 },
    });
    for (let i = 0; i < 5; i++) {
        space.createNode({
            id: `cam_node_${i}`,
            type: 'shape',
            position: {
                x: (Math.random() - 0.5) * 600,
                y: (Math.random() - 0.5) * 100,
                z: (Math.random() - 0.5) * 600,
            },
            data: {
                label: `Point ${i + 1}`,
                shape: 'sphere',
                color: new THREE.Color(Math.random() * 0xffffff).getHex(),
                size: 40 + Math.random() * 40,
            },
        });
    }
    setTimeout(() => {
        const uiPlugin = space.plugins.getPlugin('UIPlugin');
        if (uiPlugin?.uiManager?.hudManager?.showNotification) {
            uiPlugin.uiManager.hudManager.showNotification(
                'Use toolbar (if available) or keyboard shortcuts to change camera modes (Orbit, Free, TopDown).',
                'info',
                8000
            );
        }
    }, 500);
}

function createGraphGeneratorsGraph(space) {
    const fsData = {
        name: 'ProjectRoot',
        type: 'directory',
        children: [
            {
                name: 'src',
                type: 'directory',
                children: [
                    { name: 'index.js', type: 'file', size: 1500 },
                    { name: 'utils.js', type: 'file', size: 800 },
                ],
            },
            { name: 'package.json', type: 'file', size: 600 },
        ],
    };
    const fsGenerator = new S.FileSystemGenerator();
    fsGenerator.generate(fsData, space, { rootPosition: { x: -250, y: 100, z: 0 } });

    const complexObject = { id: 'user123', name: 'Alice', details: { age: 30, city: 'Wonderland' } };
    const objGenerator = new S.ObjectPropertyGenerator();
    objGenerator.generate(complexObject, space, { rootPosition: { x: 200, y: 100, z: -30 }, maxDepth: 3 });

    setTimeout(() => {
        space.plugins.getPlugin('LayoutPlugin')?.applyLayout('force', { repulsion: 3000 });
        const uiPlugin = space.plugins.getPlugin('UIPlugin');
        if (uiPlugin?.uiManager?.hudManager?.showNotification) {
            uiPlugin.uiManager.hudManager.showNotification(
                'FileSystem (left) and Object (right) graphs generated.',
                'info',
                6000
            );
        }
    }, 500);
}

function createMinimapFeatureGraph(space) {
    // Create a moderately complex graph
    const center = space.createNode({
        id: 'minimap_center',
        type: 'shape',
        position: { x: 0, y: 0, z: 0 },
        data: { label: 'Central Hub', size: 40, color: 0xeeeeee },
    });
    for (let i = 0; i < 10; i++) {
        const majorNode = space.createNode({
            id: `mm_major_${i}`,
            type: 'shape',
            position: { x: Math.cos((i * Math.PI * 2) / 10) * 300, y: 0, z: Math.sin((i * Math.PI * 2) / 10) * 300 },
            data: { label: `Major ${i}`, shape: 'box', size: 50, color: nextDemoColor() },
        });
        if (center) space.addEdge(center, majorNode);
        for (let j = 0; j < 2; j++) {
            const minorNode = space.createNode({
                id: `mm_minor_${i}_${j}`,
                type: 'shape',
                position: {
                    x: majorNode.position.x + (Math.random() - 0.5) * 150,
                    y: (Math.random() - 0.5) * 50,
                    z: majorNode.position.z + (Math.random() - 0.5) * 150,
                },
                data: {
                    label: `Minor ${i}.${j}`,
                    shape: 'sphere',
                    size: 25,
                    color: S.Utils.adjustColorLightness(majorNode.data.color, 0.3),
                },
            });
            if (majorNode && minorNode) space.addEdge(majorNode, minorNode, { type: 'dashed', thickness: 1 });
        }
    }
    setTimeout(() => {
        const uiPlugin = space.plugins.getPlugin('UIPlugin');
        if (uiPlugin?.uiManager?.hudManager?.showNotification) {
            uiPlugin.uiManager.hudManager.showNotification(
                'Minimap is active in the bottom-right corner (if enabled).',
                'info',
                7000
            );
        }
    }, 500);
}

// --- Main Pages Array ---
export const pages = [
    {
        id: 'welcome-overview',
        title: 'Overview',
        description: `<h3>Welcome to SpaceGraphJS!</h3>
                      <p>This is a quick overview. Explore other demos from the dropdown for specific features.</p>
                      <ul><li>Interactive 3D/2D graphing</li><li>Various node & edge types</li><li>Layout algorithms</li></ul>`,
        createGraph: createWelcomeOverviewGraph,
    },
    {
        id: 'basic-nodes',
        title: 'Basic Node Types',
        description: `<h3>Basic Node Types</h3>
                      <p>Demonstrates fundamental node representations:</p>
                      <ul>
                        <li><b>ShapeNode:</b> Sphere, Box, Capsule (if supported). Basic 3D geometric forms.</li>
                        <li><b>NoteNode/HtmlNode (simple):</b> For displaying simple text or HTML content.</li>
                        <li><b>DataNode:</b> Visual representation for raw data objects (appearance may vary).</li>
                      </ul>`,
        createGraph: createBasicNodesGraph,
    },
    {
        id: 'html-nodes-advanced',
        title: 'Advanced HTML Nodes',
        description: `<h3>Advanced HTML Nodes & Interactivity</h3>
                      <p>Showcases the power of HTML content within nodes:</p>
                      <ul>
                        <li>Interactive elements like sliders and buttons.</li>
                        <li>ContentEditable text directly within the node (toggle via Metaframe).</li>
                        <li>Custom CSS styling applied to node content.</li>
                      </ul>`,
        createGraph: createHtmlNodesAdvancedGraph,
    },
    {
        id: 'media-nodes',
        title: 'Media Nodes',
        description: `<h3>Media Nodes</h3>
                      <p>Demonstrates embedding various media types:</p>
                      <ul>
                        <li><b>ImageNode:</b> Displays raster images.</li>
                        <li><b>VideoNode:</b> Embeds and plays video content.</li>
                        <li><b>AudioNode:</b> Represents and plays audio content.</li>
                      </ul>`,
        createGraph: createMediaNodesGraph,
    },
    {
        id: 'embedding-nodes',
        title: 'Embedding & Specialized Content',
        description: `<h3>Embedding & Specialized Content Nodes</h3>
                      <p>Nodes for integrating external or specialized content:</p>
                      <ul>
                        <li><b>IFrameNode:</b> Embeds external web pages.</li>
                        <li><b>DocumentNode:</b> Represents files/documents (visual stub).</li>
                        <li><b>ChartNode:</b> For displaying charts (visual/HTML stub).</li>
                      </ul>`,
        createGraph: createEmbeddingNodesGraph,
    },
    {
        id: 'gltf-nodes',
        title: 'GLTF Model Nodes',
        description: `<h3>GLTF Model Nodes</h3>
                      <p>Focuses on <code>ShapeNode</code> for loading 3D GLTF models:</p>
                      <ul>
                        <li>Loading standard GLTF models.</li>
                        <li>Example of Level of Detail (LOD) if applicable to the model/node.</li>
                      </ul>`,
        createGraph: createGltfNodesGraph,
    },
    {
        id: 'group-nodes',
        title: 'Group Nodes',
        description: `<h3>Group Nodes</h3>
                      <p>Demonstrates <code>GroupNode</code> for hierarchical organization:</p>
                      <ul>
                        <li>Grouping multiple nodes together.</li>
                        <li>Collapsing and expanding groups.</li>
                        <li>Nesting groups (if supported).</li>
                      </ul>`,
        createGraph: createGroupNodesGraph,
    },
    {
        id: 'edge-styles-basic',
        title: 'Edge Styles: Basic',
        description: `<h3>Edge Styles: Basic Appearance</h3>
                      <p>Illustrates fundamental edge styling options:</p>
                      <ul>
                        <li>Default straight edge.</li>
                        <li>Custom color and thickness.</li>
                        <li>Dashed line patterns.</li>
                        <li>Text labels on edges.</li>
                      </ul>`,
        createGraph: createEdgeStylesBasicGraph,
    },
    {
        id: 'edge-styles-advanced',
        title: 'Edge Styles: Advanced',
        description: `<h3>Edge Styles: Advanced Features</h3>
                      <p>Showcases more complex edge visualizations:</p>
                      <ul>
                        <li>Curved edges (positive and negative curvature).</li>
                        <li>Arrowheads (source, target, or both ends).</li>
                        <li>Gradient color transitions along edges.</li>
                      </ul>`,
        createGraph: createEdgeStylesAdvancedGraph,
    },
    {
        id: 'edge-types-special',
        title: 'Specialized Edge Types',
        description: `<h3>Specialized Edge Types</h3>
                      <p>Demonstrates edges with unique behaviors or appearances:</p>
                      <ul>
                        <li><b>DottedEdge:</b> Styled with a dotted pattern (distinct from dashed).</li>
                        <li><b>DynamicThicknessEdge:</b> Thickness changes based on a data value.</li>
                      </ul>`,
        createGraph: createEdgeTypesSpecialGraph, // Reuses function from existing "new-edge-types"
    },
    {
        id: 'layouts-showcase',
        title: 'Layout Algorithms',
        description: `<h3>Layout Algorithms</h3>
                      <p>A showcase of different automated layout algorithms. Use the UI to switch between them.</p>
                      <ul>
                        <li>Force-Directed, Grid, Circular, Hierarchical, Spherical.</li>
                        <li>Potentially Radial, TreeMap (if implementations are mature).</li>
                      </ul>
                      <p>A moderately complex graph is provided to see the effects of different layouts.</p>`,
        createGraph: createLayoutsShowcaseGraph, // Combines/replaces "new-layouts"
    },
    {
        id: 'interaction-controls',
        title: 'Node Interaction & Controls',
        description: `<h3>Node Interaction & Controls</h3>
                      <p>Focuses on how users can interact with nodes:</p>
                      <ul>
                        <li><b>Metaframe:</b> Dragging to move, resizing handles.</li>
                        <li>Node selection and multi-selection (if applicable).</li>
                        <li>Context menu (right-click) for node actions.</li>
                        <li>Creating links between nodes.</li>
                      </ul>`,
        createGraph: createInteractionControlsGraph,
    },
    {
        id: 'camera-controls',
        title: 'Camera Modes & Navigation',
        description: `<h3>Camera Modes & Navigation</h3>
                      <p>Explains different camera perspectives and navigation controls:</p>
                      <ul>
                        <li><b>Orbit/Turntable:</b> Rotating around a focal point.</li>
                        <li><b>Free Camera:</b> Fly-through navigation (e.g., WASD + mouse).</li>
                        <li><b>TopDown Camera:</b> 2D-like overhead view.</li>
                        <li><b>FirstPerson Camera:</b> (If distinct from Free Camera).</li>
                      </ul>
                      <p>Use toolbar options or keyboard shortcuts to switch modes.</p>`,
        createGraph: createCameraControlsGraph, // Reuses function from "camera-modes-info"
    },
    {
        id: 'graph-generators',
        title: 'Graph Generators',
        description: `<h3>Graph Generators</h3>
                      <p>Demonstrates programmatic creation of graphs from data structures:</p>
                      <ul>
                        <li><b>FileSystemGenerator:</b> From a JSON directory structure.</li>
                        <li><b>ObjectPropertyGenerator:</b> Visualizing a JavaScript object's properties.</li>
                      </ul>`,
        createGraph: createGraphGeneratorsGraph, // Reuses function from existing "graph-generators"
    },
    {
        id: 'minimap-feature',
        title: 'Minimap',
        description: `<h3>Minimap Feature</h3>
                      <p>Illustrates the minimap for graph overview and navigation.</p>
                      <p>The minimap (if enabled) typically appears in a corner, providing a scaled-down view of the entire graph.</p>`,
        createGraph: createMinimapFeatureGraph,
    },
    // Remove or comment out old pages that are now covered or deprecated
    // For example, the original 'all-features' is replaced by 'welcome-overview' and specific pages.
    // The original 'node-types', 'edge-types', 'new-layouts', 'new-edge-types', 'new-node-types', 'camera-modes-info'
    // have their content merged into the new structure.
];
