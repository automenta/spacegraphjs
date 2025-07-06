import * as S from '../../index.js';
// import * as THREE from 'three'; // Available via S.THREE

const demoMetadata = {
    id: 'experimental-node-types', // Changed ID
    title: 'Experimental Node Types (Stubs)', // Changed Title
    description: `<h3>Experimental Node Types (Stubs)</h3>
                  <p>This page demonstrates recently added specialized node types that are currently visual/functional stubs.</p>
                  <ul>
                    <li><b>AudioNode:</b> Represents an audio source. (Visual stub)</li>
                    <li><b>DocumentNode:</b> Represents a document or file. (Visual stub)</li>
                    <li><b>ChartNode:</b> Intended to display charts using HTML/JS. (Visual/HTML stub)</li>
                  </ul>`
};

function createGraph(space) {
    const commonProps = { mass: 1.0 };
    let xPos = -300;
    const xIncrement = 250;

    space.createNode({
        id: 'audioNode1', type: 'audio', position: { x: xPos, y: 0, z: 0 },
        data: { label: 'Audio Clip 🎵', audioUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3', color: 0x00ccff, size: 50 },
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
            width: 280, height: 180,
            content: '<div style="padding:10px; background:#2a2a2b; border-radius:5px; color:white;">Chart Placeholder: Sales Q1</div>',
        }, ...commonProps
    });

    setTimeout(() => space.plugins.getPlugin('LayoutPlugin')?.applyLayout('grid', {columns: 3, padding: {x:200, y:100}}), 100);
}

export { createGraph, demoMetadata };
