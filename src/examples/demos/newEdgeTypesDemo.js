import * as S from '../../index.js';
// import * as THREE from 'three'; // Available via S.THREE

const demoMetadata = {
    id: 'new-edge-types',
    title: 'New Edge Types',
    description: `<h3>New Edge Types Showcase</h3>
                  <p>This page demonstrates recently added specialized edge types.</p>
                  <ul>
                    <li><b>DottedEdge:</b> An edge styled with a dotted pattern.</li>
                    <li><b>DynamicThicknessEdge:</b> An edge whose thickness can change based on a data value.</li>
                  </ul>`
};

function createGraph(space) {
    const commonProps = { mass: 1.0, type: 'shape', data: { shape: 'sphere', size: 40 } };

    const n1 = space.createNode({ id: 'n1e', position: { x: -250, y: 100, z: 0 }, data: { ...commonProps.data, label: 'N1', color: 0xff8888 }, ...commonProps });
    const n2 = space.createNode({ id: 'n2e', position: { x: 250, y: 100, z: 0 }, data: { ...commonProps.data, label: 'N2', color: 0x88ff88 }, ...commonProps });
    const n3 = space.createNode({ id: 'n3e', position: { x: -250, y: -100, z: 0 }, data: { ...commonProps.data, label: 'N3', color: 0x8888ff }, ...commonProps });
    const n4 = space.createNode({ id: 'n4e', position: { x: 250, y: -100, z: 0 }, data: { ...commonProps.data, label: 'N4 (Data Value: 75)', color: 0xffcc00, value: 75 }, ...commonProps });

    space.addEdge(n1, n2, { type: 'dotted', label: 'Dotted Edge', color: 0x00ffff, thickness: 2, dashSize: 2, gapSize: 3 });

    space.addEdge(n3, n4, {
        type: 'dynamicThickness',
        label: 'Dynamic Thickness (Value: 75)',
        color: 0xffaa00,
        thicknessDataKey: 'value',
    });

     setTimeout(() => space.plugins.getPlugin('LayoutPlugin')?.applyLayout('grid', {columns: 2, padding: {x:400, y:200}}), 100);
}

export { createGraph, demoMetadata };
