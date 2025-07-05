import * as S from '../../index.js';
import * as THREE from 'three'; // Used for THREE.Color

const demoMetadata = {
    id: 'new-layouts',
    title: 'New Layouts',
    description: `<h3>New Layout Algorithms</h3>
                  <p>This page demonstrates new layout algorithms (currently stubs/basic implementations).</p>
                  <ul>
                    <li><b>TreeMapLayout:</b> Arranges nodes as nested rectangles (stub currently uses grid). Ideal for hierarchical data based on area.</li>
                    <li><b>RadialLayout:</b> Arranges nodes in concentric circles around a central point (stub uses simple circle).</li>
                  </ul>
                  <p>Select the desired layout from the UI dropdown to see its effect.</p>`
};

function createGraph(space) {
    const numNodes = 12;
    for (let i = 0; i < numNodes; i++) {
        space.createNode({
            id: `n_layout_${i}`,
            type: 'shape',
            position: { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100, z: Math.random() * 50 - 25 },
            data: {
                label: `Node ${i}`,
                shape: 'box',
                size: Math.random() * 30 + 20,
                color: new THREE.Color(Math.random() * 0xffffff).getHex(),
            }
        });
    }

    setTimeout(() => {
         space.plugins.getPlugin('LayoutPlugin')?.applyLayout('force');
         const uiPlugin = space.plugins.getPlugin('UIPlugin');
         if (uiPlugin && uiPlugin.showNotification) {
            uiPlugin.showNotification('Try "treemap" or "radial" layouts from the UI dropdown!', 'info', 5000);
         } else {
            console.log("Demo: Try 'treemap' or 'radial' layouts from the UI dropdown!");
         }
    }, 100);
}

export { createGraph, demoMetadata };
