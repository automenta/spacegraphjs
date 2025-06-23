import * as S from '../index.js'; // Import the bundled library

export function createExampleGraph(space) {
    console.log("Creating example graph...");
    const colors = ['#2a2a50', '#2a402a', '#402a2a', '#40402a', '#2a4040', '#402a40', '#503030'];
    let colorIndex = 0;
    const nextColor = () => colors[colorIndex++ % colors.length];

    // Core Node (Heavier)
    const n1 = space.addNode(new S.NoteNode('core', { x: 0, y: 0, z: 0 }, {
        content: "<h1>🚀 READY 🧠</h1><p>Enhanced Mind Map</p>",
        width: 300, height: 110, backgroundColor: nextColor()
    }, 2.5)); // Mass = 2.5

    // Features Branch
    const n_features = space.addNode(new S.NoteNode('features', { x: 350, y: 100, z: 20 }, {
        content: "<h2>Features ✨</h2><ul><li>HTML & 3D Nodes</li><li>Node Mass/Momentum</li><li>Edge Menu & Constraints</li><li>BG Toggle</li><li>3D Labels</li></ul>",
        width: 240, height: 190, backgroundColor: nextColor()
    }, 1.5)); // Mass = 1.5
    space.addEdge(n1, n_features);

    // Shape Nodes (Different Masses)
    const n_box = space.addNode(new S.ShapeNode('box1', { x: 600, y: 150, z: 30 }, {
        label: "Box Node 📦 (Mass 2.0)", shape: 'box', size: 70, color: 0xcc8833
    }, 2.0)); // Mass = 2.0
    // Rigid link example
    space.addEdge(n_features, n_box, { constraintType: 'rigid', constraintParams: { distance: 180, stiffness: 0.08 } });

    const n_sphere = space.addNode(new S.ShapeNode('sphere1', { x: 650, y: 0, z: -20 }, {
        label: "Sphere Node 🌐 (Mass 1.0)", shape: 'sphere', size: 80, color: 0x33aabb
    }, 1.0)); // Mass = 1.0
    // Elastic link example
    space.addEdge(n_box, n_sphere, { constraintType: 'elastic', constraintParams: { idealLength: 150, stiffness: 0.002 } });
    space.addEdge(n_features, n_sphere); // Cross link

    // Tech Branch
    const n_tech = space.addNode(new S.NoteNode('tech', { x: -350, y: 100, z: -10 }, {
        content: "<h2>Technology 💻</h2><p><code>Three.js</code> (WebGL, CSS3D)</p><p><code>GSAP</code>, <code>ES Modules</code></p>",
        width: 250, height: 120, backgroundColor: nextColor()
    }));
    space.addEdge(n1, n_tech);

    // Style Branch
    const n_style = space.addNode(new S.NoteNode('style', { x: 0, y: -250, z: 0 }, {
        content: "<h2>Style 🎨</h2><p>✨ Dark/Transparent BG</p><p>🎨 Node Colors</p><p>🕸️ Dot Grid BG</p>",
        width: 220, height: 110, backgroundColor: nextColor()
    }));
    // Weld constraint example (strong rigid link)
    space.addEdge(n1, n_style, { constraintType: 'weld' });

    // Interactive Node Example
    const n_interactive = space.addNode(new S.NoteNode('interactive', { x: 350, y: -150, z: -30 }, {
        content: `<h2>Interactive</h2><p>Slider: <span class="slider-val">50</span></p>
        <input type="range" min="0" max="100" value="50" style="width: 90%; pointer-events: auto; cursor: pointer;"
               oninput="this.previousElementSibling.textContent = this.value; event.stopPropagation();"
               onpointerdown="event.stopPropagation();">
        <button onclick="alert('Button clicked!'); event.stopPropagation();" style="pointer-events: auto; cursor: pointer; margin-top: 5px;">Click</button>`,
        width: 230, height: 170, backgroundColor: nextColor()
    }));
    space.addEdge(n_features, n_interactive);
    space.addEdge(n_style, n_interactive, { constraintType: 'elastic', constraintParams: { idealLength: 250 } });

    const nodePlugin = space.pluginManager?.getPlugin('NodePlugin');
    const edgePlugin = space.pluginManager?.getPlugin('EdgePlugin');
    const nodeCount = nodePlugin?.getNodes()?.size || 0;
    const edgeCount = edgePlugin?.getEdges()?.size || 0;

    console.log(`Example graph created: ${nodeCount} nodes, ${edgeCount} edges.`);
}
