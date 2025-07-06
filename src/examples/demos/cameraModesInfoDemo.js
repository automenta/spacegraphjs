import * as S from '../../index.js';
// import * as THREE from 'three'; // Available via S.THREE

const demoMetadata = {
    id: 'camera-modes-info',
    title: 'Camera Modes Info',
    description: `<h3>Camera Navigation Modes</h3>
                  <p>SpaceGraph offers various camera modes to enhance navigation and interaction within the 3D space. These modes can typically be selected from a camera controls UI element if available in your application.</p>
                  <h4>Available Modes:</h4>
                  <ul>
                    <li><b>Orbit:</b> The default mode. Left-click and drag to orbit around the scene's focal point. Scroll to zoom.</li>
                    <li><b>Drag Orbit (New):</b> Combines 2D panning with temporary 3D orbit.
                        <ul>
                            <li><b>Left-click and drag:</b> Pans the camera in a 2D plane (similar to moving a map).</li>
                            <li><b>Middle-click (or Right-click) and drag:</b> Temporarily activates a 3D orbit around the current focal point. Release to return to pan-style movement.</li>
                            <li>Scroll to zoom.</li>
                        </ul>
                    </li>
                    <li><b>Top Down:</b> Provides a 2D-like top-down view of the graph. Pan (drag) moves across the XZ plane, and zoom (scroll) adjusts the height (Y-axis).</li>
                    <li><b>Free Look:</b> Allows free movement and looking. Typically uses WASD for movement and mouse (with pointer lock) for looking around. Q/E or Shift/Ctrl might be used for vertical movement.</li>
                    <li><b>First Person:</b> Similar to Free Look, often used for a character-centric view. Requires pointer lock. (WASD for movement, mouse for looking).</li>
                  </ul>
                  <p>This demo page loads a simple graph. Use your application's UI to switch between and test these camera modes.</p>`
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
