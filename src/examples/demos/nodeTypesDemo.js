import * as S from '../../index.js';
// import * as THREE from 'three'; // Available via S.THREE

const demoMetadata = {
    id: 'core-node-types', // Changed ID
    title: 'Core Node Types Demo', // Changed Title
    description: `<h3>Core Node Types Demo</h3>
                  <p>This page demonstrates the fundamental and most commonly used node types in SpaceGraphJS.</p>
                  <ul>
                    <li><b>ShapeNode:</b> Displays 3D shapes like boxes, spheres, cylinders. (e.g., Box, Sphere, Capsule)</li>
                    <li><b>NoteNode/HtmlNode:</b> Renders HTML content, allowing for rich text, forms, and interactive elements.</li>
                    <li><b>ImageNode:</b> Displays images directly in the 3D space.</li>
                    <li><b>VideoNode:</b> Embeds and plays videos.</li>
                    <li><b>IFrameNode:</b> Embeds external web content using iframes.</li>
                    <li><b>GroupNode:</b> Allows grouping of other nodes, which can be collapsed or expanded.</li>
                  </ul>`
};

function createGraph(space) {
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

    let groupNode = null;
    if(groupChild1 && groupChild2) {
        groupNode = space.createNode({
            id: 'groupNode', type: 'group', position: { x: xPosCol2, y: yPos, z: 0 },
            data: {
                label: 'GroupNode',
                children: [groupChild1.id, groupChild2.id],
                backgroundColor: 'rgba(60,80,100,0.3)',
                borderColor: 'rgba(150,180,220,0.7)',
                headerColor: 'rgba(40,60,80,0.5)',
            }, ...commonProps
        });
        space.addEdge(groupChild1, groupChild2, {label: "Internal", color: 0xaaaaaa, thickness:1});
    }

    if (noteNode && imageNode) space.addEdge(noteNode, imageNode, {label: 'related'});
    if (shapeNodeBox && noteNode) space.addEdge(shapeNodeBox, noteNode);
    if (iframeNode && groupNode) space.addEdge(iframeNode, groupNode);

    const centralHub = space.createNode({
        id: 'hubNodeTypes', type: 'shape', position: { x: 0, y: 200, z: -50 },
        data: { label: 'Node Types Hub', shape: 'sphere', size: 20, color: 0xeeeeee, opacity: 0.5 }, mass: 0.1
    });

    [shapeNodeBox, shapeNodeSphere, shapeNodeCapsule, noteNode, imageNode, videoNode, iframeNode, groupNode].forEach(n => {
        if (n && centralHub) space.addEdge(centralHub, n, {type: 'dashed', color: 0x888888, thickness: 1});
    });
}

export { createGraph, demoMetadata };
