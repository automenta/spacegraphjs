import * as S from '../../index.js';
// import * as THREE from 'three'; // Available via S.THREE

const demoMetadata = {
    id: 'graph-generators',
    title: 'Graph Generators',
    description: `<h3>Graph Generators Showcase</h3>
                  <p>This page demonstrates generators that create graphs from data structures.</p>
                  <ul>
                    <li><b>FileSystemGenerator:</b> Creates a graph from a JSON object representing a file directory structure.</li>
                    <li><b>ObjectPropertyGenerator:</b> Visualizes a JavaScript object's properties as a graph.</li>
                  </ul>
                  <p>Each generator will create its graph below. They might be layered if generated simultaneously; consider refreshing or navigating to view them separately if needed, or if a UI to clear/regenerate is added.</p>`
};

function createGraph(space) {
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
    objGenerator.generate(complexObject, space, { rootPosition: { x: 300, y: 200, z: -50 }, maxDepth: 4 });

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

export { createGraph, demoMetadata };
