import * as S from '../../index.js';
// import * as THREE from 'three'; // Available via S.THREE

const demoMetadata = {
    id: 'camera-modes-info',
    title: 'Camera Modes Info',
    description: `<h3>New Camera Modes</h3>
                  <p>New camera modes have been added to enhance navigation:</p>
                  <ul>
                    <li><b>TopDownCamera:</b> Provides a 2D-like top-down view of the graph. Pan (drag or arrow keys if configured) moves across the XZ plane, and zoom (scroll) adjusts the height (Y-axis). Rotation may be restricted.</li>
                    <li><b>FirstPersonCamera:</b> A stub for a first-person perspective. Currently behaves like 'Free' camera mode (WASD for movement, mouse for looking, requires pointer lock). Future enhancements could include node attachment or physics-based movement.</li>
                  </ul>
                  <p>These modes can typically be selected from a camera controls UI element if available in the application.</p>
                  <p>This demo page itself doesn't activate a specific new camera mode by default, but loads a simple graph. Use your application's UI to switch camera modes.</p>`
};

function createGraph(space) {
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

export { createGraph, demoMetadata };
