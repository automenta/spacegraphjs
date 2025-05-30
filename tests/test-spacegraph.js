// Simple Test Framework
const tests = [];
let currentDescribe = '';
let passedTests = 0;
let failedTests = 0;

function describe(name, fn) {
    currentDescribe = name;
    fn();
    currentDescribe = '';
}

function it(name, fn) {
    tests.push({ describe: currentDescribe, name, fn });
}

function runTests() {
    console.log("Running tests...");
    tests.forEach(test => {
        const testName = test.describe ? `${test.describe} - ${test.name}` : test.name;
        try {
            test.fn();
            console.log(`%cPASS: ${testName}`, 'color: green;');
            passedTests++;
        } catch (e) {
            console.error(`%cFAIL: ${testName}`, 'color: red;');
            console.error(e);
            failedTests++;
        }
    });
    console.log("\n--- Test Summary ---");
    console.log(`%cTotal Tests: ${tests.length}`, 'color: blue;');
    console.log(`%cPassed: ${passedTests}`, 'color: green;');
    console.log(`%cFailed: ${failedTests}`, 'color: red;');

    // For automated environments, you might want to throw an error if tests fail
    if (failedTests > 0) {
        // throw new Error(`${failedTests} test(s) failed.`);
        // In a browser, this might just log to console and not halt everything.
        console.error(`${failedTests} test(s) failed. Check console output.`);
    }
    return { total: tests.length, passed: passedTests, failed: failedTests };
}

// Assertion Functions
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

function assertEqual(actual, expected, message) {
    assert(actual === expected, `${message} (Expected: ${expected}, Got: ${actual})`);
}

function assertNotEqual(actual, expected, message) {
     assert(actual !== expected, `${message} (Expected not to be: ${expected}, Got: ${actual})`);
}

function assertTrue(value, message) {
    assertEqual(value, true, message);
}

function assertFalse(value, message) {
    assertEqual(value, false, message);
}

function assertNotNull(value, message) {
    assert(value !== null && value !== undefined, message);
}

function assertNull(value, message) {
    assert(value === null || value === undefined, message);
}

function assertThrows(fn, message) {
    let threw = false;
    try {
        fn();
    } catch (e) {
        threw = true;
    }
    assertTrue(threw, message);
}

// --- Test Implementation ---
// Mock DOM elements needed by SpaceGraph and its components
let mockContainer, mockContextMenu, mockConfirmDialog, mockStatusIndicator;

function setupMockDOM() {
    mockContainer = document.createElement('div');
    mockContainer.id = 'space'; // Matching the ID used in examples
    
    // SpaceGraph's _setupRenderers looks for these within the container
    const webglCanvas = document.createElement('canvas');
    webglCanvas.id = 'webgl-canvas';
    mockContainer.appendChild(webglCanvas);

    const css3dContainer = document.createElement('div');
    css3dContainer.id = 'css3d-container';
    mockContainer.appendChild(css3dContainer);
    
    // These are passed to SpaceGraph constructor or created by UIManager if not passed
    mockContextMenu = document.createElement('div');
    mockContextMenu.id = 'context-menu';
    
    mockConfirmDialog = document.createElement('div');
    mockConfirmDialog.id = 'confirm-dialog';
    mockConfirmDialog.innerHTML = '<p id="confirm-message"></p><button id="confirm-yes"></button><button id="confirm-no"></button>';

    // Status indicator is not strictly required by SpaceGraph but good for completeness if UIManager might use it
    mockStatusIndicator = document.createElement('div');
    mockStatusIndicator.id = 'status-indicator';

    // Append to body if running in a browser context for visibility during manual testing
    // For automated tests, this might not be necessary if DOM is simulated.
    if (typeof document !== 'undefined' && document.body) {
        document.body.appendChild(mockContainer);
        document.body.appendChild(mockContextMenu);
        document.body.appendChild(mockConfirmDialog);
        document.body.appendChild(mockStatusIndicator);
    }
}

function teardownMockDOM() {
    mockContainer?.remove();
    mockContextMenu?.remove();
    mockConfirmDialog?.remove();
    mockStatusIndicator?.remove();
    mockContainer = null;
    mockContextMenu = null;
    mockConfirmDialog = null;
    mockStatusIndicator = null;
}


// Import classes from spacegraph.js
// Assuming tests are run from `tests/` directory, and spacegraph.js is in root.
// This import path might need adjustment based on the test runner's CWD.
import * as S from '../spacegraph.js';

describe('SpaceGraph Core', () => {
    let space;

    // Setup before each test in this describe block
    const beforeEachTest = () => {
        setupMockDOM();
        space = new S.SpaceGraph(mockContainer, {
            contextMenuEl: mockContextMenu,
            confirmDialogEl: mockConfirmDialog
        });
    };

    // Teardown after each test
    const afterEachTest = () => {
        space?.dispose(); // Clean up SpaceGraph instance
        teardownMockDOM();
    };

    it('should instantiate SpaceGraph', () => {
        beforeEachTest();
        assertNotNull(space, 'SpaceGraph instance should be created.');
        assertTrue(space.nodes instanceof Map, 'space.nodes should be a Map.');
        assertTrue(space.edges instanceof Map, 'space.edges should be a Map.');
        assertNotNull(space.scene, 'THREE.Scene (scene) should exist.');
        assertNotNull(space.cssScene, 'THREE.Scene (cssScene) should exist.');
        assertNotNull(space.cameraController, 'CameraController should be initialized.');
        assertNotNull(space.layoutEngine, 'ForceLayout should be initialized.');
        assertNotNull(space.uiManager, 'UIManager should be initialized.');
        afterEachTest();
    });

    it('should add and retrieve a NoteNode', () => {
        beforeEachTest();
        const note = new S.NoteNode('note1', {x:10, y:20, z:0}, {content: 'Test Note'});
        space.addNode(note);
        assertEqual(space.nodes.size, 1, 'Node count should be 1 after adding.');
        assertEqual(space.getNodeById('note1'), note, 'getNodeById should return the added note.');
        assertTrue(note.spaceGraph === space, 'Node should have a reference to spaceGraph.');
        afterEachTest();
    });

    it('should add and retrieve a ShapeNode', () => {
        beforeEachTest();
        const shape = new S.ShapeNode('shape1', {x:30, y:40, z:0}, {label: 'Test Shape', shape: 'box', size: 50});
        space.addNode(shape);
        assertEqual(space.nodes.size, 1, 'Node count should be 1 after adding ShapeNode.');
        assertEqual(space.getNodeById('shape1'), shape, 'getNodeById should return the added shape node.');
        assertTrue(shape.spaceGraph === space, 'ShapeNode should have a reference to spaceGraph.');
        afterEachTest();
    });
    
    it('should remove a Node and its connected Edges', () => {
        beforeEachTest();
        const node1 = new S.NoteNode('n1');
        const node2 = new S.NoteNode('n2');
        const node3 = new S.NoteNode('n3');
        space.addNode(node1);
        space.addNode(node2);
        space.addNode(node3);
        const edge1 = space.addEdge(node1, node2);
        const edge2 = space.addEdge(node2, node3);
        assertEqual(space.nodes.size, 3, 'Initial node count should be 3.');
        assertEqual(space.edges.size, 2, 'Initial edge count should be 2.');

        space.removeNode('n2');
        assertEqual(space.nodes.size, 2, 'Node count should be 2 after removing n2.');
        assertNull(space.getNodeById('n2'), 'Removed node n2 should not be found.');
        assertEqual(space.edges.size, 0, 'Edges connected to n2 should be removed.');
        assertNull(space.getEdgeById(edge1.id), 'Edge1 should be removed.');
        assertNull(space.getEdgeById(edge2.id), 'Edge2 should be removed.');
        afterEachTest();
    });

    it('should add and retrieve an Edge', () => {
        beforeEachTest();
        const node1 = new S.NoteNode('n1');
        const node2 = new S.NoteNode('n2');
        space.addNode(node1);
        space.addNode(node2);
        const edge = space.addEdge(node1, node2, {color: 0xff0000});
        
        assertNotNull(edge, 'Edge should be created.');
        assertEqual(space.edges.size, 1, 'Edge count should be 1.');
        assertEqual(space.getEdgeById(edge.id), edge, 'getEdgeById should return the added edge.');
        assertTrue(edge.spaceGraph === space, 'Edge should have a reference to spaceGraph.');
        assertEqual(edge.data.color, 0xff0000, 'Edge data should be stored.');
        afterEachTest();
    });

    it('should remove an Edge', () => {
        beforeEachTest();
        const node1 = new S.NoteNode('n1');
        const node2 = new S.NoteNode('n2');
        space.addNode(node1);
        space.addNode(node2);
        const edge = space.addEdge(node1, node2);
        assertEqual(space.edges.size, 1, 'Initial edge count should be 1.');

        space.removeEdge(edge.id);
        assertEqual(space.edges.size, 0, 'Edge count should be 0 after removal.');
        assertNull(space.getEdgeById(edge.id), 'Removed edge should not be found.');
        afterEachTest();
    });
    
    it('should not add duplicate edges', () => {
        beforeEachTest();
        const node1 = new S.NoteNode('n10');
        const node2 = new S.NoteNode('n11');
        space.addNode(node1);
        space.addNode(node2);
        space.addEdge(node1, node2);
        const edge2 = space.addEdge(node1, node2); // Attempt to add duplicate
        const edge3 = space.addEdge(node2, node1); // Attempt to add reverse duplicate
        
        assertEqual(space.edges.size, 1, 'Should only allow one edge between two nodes.');
        assertNull(edge2, 'Adding duplicate edge should return null.');
        assertNull(edge3, 'Adding reverse duplicate edge should return null.');
        afterEachTest();
    });

    it('should handle setSelectedNode', () => {
        beforeEachTest();
        const node1 = new S.NoteNode('n1');
        space.addNode(node1);
        space.setSelectedNode(node1);
        assertEqual(space.selectedNode, node1, 'selectedNode should be node1.');
        assertTrue(node1.htmlElement.classList.contains('selected'), 'Selected node HTML element should have "selected" class.');
        
        space.setSelectedNode(null);
        assertNull(space.selectedNode, 'selectedNode should be null after deselecting.');
        assertFalse(node1.htmlElement.classList.contains('selected'), 'Deselected node HTML element should not have "selected" class.');
        afterEachTest();
    });

    it('should handle setSelectedEdge and deselect node', () => {
        beforeEachTest();
        const node1 = new S.NoteNode('n1');
        const node2 = new S.NoteNode('n2');
        space.addNode(node1);
        space.addNode(node2);
        const edge = space.addEdge(node1, node2);
        
        space.setSelectedNode(node1); // Select a node first
        space.setSelectedEdge(edge);  // Then select an edge
        
        assertEqual(space.selectedEdge, edge, 'selectedEdge should be the new edge.');
        assertTrue(edge.threeObject.material.opacity === 1.0, 'Selected edge material opacity should be 1.0.');
        assertNull(space.selectedNode, 'selectedNode should be null when an edge is selected.');
        afterEachTest();
    });
});

describe('Node Classes', () => {
    let space; // A minimal space for node context if needed by methods like setSize

    const beforeEachNodeTest = () => {
        setupMockDOM(); // Nodes might create DOM elements
        space = new S.SpaceGraph(mockContainer, {
            contextMenuEl: mockContextMenu,
            confirmDialogEl: mockConfirmDialog
        });
    };
    const afterEachNodeTest = () => {
        space?.dispose();
        teardownMockDOM();
    };

    it('BaseNode should instantiate with ID, position, data, mass', () => {
        beforeEachNodeTest();
        const pos = {x:1, y:2, z:3};
        const data = {custom: 'value'};
        const node = new S.BaseNode('base1', pos, data, 2.5);
        assertEqual(node.id, 'base1', 'BaseNode ID should be set.');
        assertEqual(node.position.x, 1, 'BaseNode position x should be set.');
        assertEqual(node.data.custom, 'value', 'BaseNode data should be set.');
        assertEqual(node.mass, 2.5, 'BaseNode mass should be set.');
        afterEachNodeTest();
    });
    
    it('HtmlNodeElement should instantiate and create HTML element', () => {
        beforeEachNodeTest();
        const node = new S.HtmlNodeElement('html1', {x:0,y:0,z:0}, {label: 'HTML Test', width: 200, height: 100});
        assertNotNull(node.htmlElement, 'HtmlNodeElement should create an htmlElement.');
        assertEqual(node.htmlElement.style.width, '200px', 'HtmlNodeElement width should be set on style.');
        assertEqual(node.size.width, 200, 'HtmlNodeElement size.width should be set.');
        assertNotNull(node.cssObject, 'HtmlNodeElement should create a cssObject.');
        assertTrue(node.htmlElement.classList.contains('node-html'), 'HtmlNodeElement should have "node-html" class.');
        afterEachNodeTest();
    });

    it('NoteNode should instantiate as editable HtmlNodeElement', () => {
        beforeEachNodeTest();
        const note = new S.NoteNode('note-edit', {x:0,y:0,z:0}, {content: 'Editable'});
        assertTrue(note instanceof S.HtmlNodeElement, 'NoteNode should be an instance of HtmlNodeElement.');
        assertTrue(note.data.editable, 'NoteNode data.editable should be true by default.');
        assertNotNull(note.htmlElement.querySelector('.node-content[contenteditable="true"]'), 'NoteNode content div should be contentEditable.');
        afterEachNodeTest();
    });
    
    it('HtmlNodeElement setSize and setContentScale should update properties', () => {
        beforeEachNodeTest();
        const node = new S.HtmlNodeElement('html-resize', {x:0,y:0,z:0}, {width:100, height:50});
        node.spaceGraph = space; // Assign space for layout kick
        
        node.setSize(150, 75);
        assertEqual(node.size.width, 150, 'setSize should update width.');
        assertEqual(node.htmlElement.style.width, '150px', 'setSize should update style.width.');
        
        node.setContentScale(1.5);
        assertEqual(node.data.contentScale, 1.5, 'setContentScale should update data.contentScale.');
        const contentEl = node.htmlElement.querySelector('.node-content');
        assertEqual(contentEl.style.transform, 'scale(1.5)', 'setContentScale should update style.transform.');
        afterEachNodeTest();
    });

    it('ShapeNode should instantiate with shape, size, color, label, and mesh', () => {
        beforeEachNodeTest();
        const data = {label: 'MyBox', shape: 'box', size: 60, color: 0xabcdef};
        const node = new S.ShapeNode('shape-box1', {x:0,y:0,z:0}, data, 1.8);
        
        assertEqual(node.data.shape, 'box', 'ShapeNode shape data should be set.');
        assertEqual(node.data.size, 60, 'ShapeNode size data should be set.');
        assertEqual(node.data.color, 0xabcdef, 'ShapeNode color data should be set.');
        assertEqual(node.mass, 1.8, 'ShapeNode mass should be set.');
        assertNotNull(node.mesh, 'ShapeNode mesh should be created.');
        assertTrue(node.mesh instanceof THREE.Mesh, 'ShapeNode mesh should be a THREE.Mesh.');
        assertEqual(node.mesh.userData.nodeId, 'shape-box1', 'ShapeNode mesh userData should link to node ID.');
        assertNotNull(node.labelObject, 'ShapeNode labelObject should be created for a label.');
        assertEqual(node.labelObject.element.textContent, 'MyBox', 'ShapeNode label text should be set.');
        afterEachNodeTest();
    });
});

describe('Edge Class', () => {
    let node1, node2;
    const beforeEachEdgeTest = () => {
        node1 = new S.BaseNode('n1'); // Use BaseNode for simplicity if specific type not needed
        node2 = new S.BaseNode('n2');
    };

    it('should instantiate with ID, source, target, and data', () => {
        beforeEachEdgeTest();
        const data = {color: 0x123456, thickness: 2.0, constraintType: 'rigid'};
        const edge = new S.Edge('edge1', node1, node2, data);
        
        assertEqual(edge.id, 'edge1', 'Edge ID should be set.');
        assertEqual(edge.source, node1, 'Edge source should be set.');
        assertEqual(edge.target, node2, 'Edge target should be set.');
        assertEqual(edge.data.color, 0x123456, 'Edge data.color should be set.');
        assertEqual(edge.data.thickness, 2.0, 'Edge data.thickness should be set.');
        assertEqual(edge.data.constraintType, 'rigid', 'Edge data.constraintType should be set.');
        assertNotNull(edge.threeObject, 'Edge threeObject (line) should be created.');
    });

    it('should update data properties', () => {
        beforeEachEdgeTest();
        const edge = new S.Edge('edge2', node1, node2);
        edge.data.color = 0xabcdef;
        edge.data.thickness = 3.0;
        edge.data.constraintParams.idealLength = 250;
        
        assertEqual(edge.data.color, 0xabcdef, 'Edge data.color should be updatable.');
        assertEqual(edge.data.thickness, 3.0, 'Edge data.thickness should be updatable.');
        assertEqual(edge.data.constraintParams.idealLength, 250, 'Edge constraintParams should be updatable.');
    });
});

describe('ForceLayout Class (Basic Interactions)', () => {
    let space, layout, node1, node2, edge;

    const beforeEachLayoutTest = () => {
        setupMockDOM();
        space = new S.SpaceGraph(mockContainer, { contextMenuEl: mockContextMenu, confirmDialogEl: mockConfirmDialog });
        layout = space.layoutEngine; // Get layout from SpaceGraph
        node1 = new S.NoteNode('ln1');
        node2 = new S.NoteNode('ln2');
        space.addNode(node1); // Layout's addNode is called by space.addNode
        space.addNode(node2);
        edge = space.addEdge(node1, node2); // Layout's addEdge is called by space.addEdge
    };
    const afterEachLayoutTest = () => {
        space?.dispose();
        teardownMockDOM();
    };

    it('should have nodes and edges added via SpaceGraph', () => {
        beforeEachLayoutTest();
        assertTrue(layout.nodes.includes(node1) && layout.nodes.includes(node2), 'Layout should contain added nodes.');
        assertTrue(layout.edges.includes(edge), 'Layout should contain added edge.');
        afterEachLayoutTest();
    });
    
    it('should remove nodes and edges when removed from SpaceGraph', () => {
        beforeEachLayoutTest();
        space.removeEdge(edge.id);
        assertFalse(layout.edges.includes(edge), 'Layout should not contain removed edge.');
        space.removeNode(node1.id);
        assertFalse(layout.nodes.includes(node1), 'Layout should not contain removed node.');
        afterEachLayoutTest();
    });

    it('kick() should run and potentially change energy', () => {
        beforeEachLayoutTest();
        const initialEnergy = layout.energy;
        layout.kick(5); // Apply a stronger kick
        // Energy might not change if already at minimum or if autoStop is very quick
        // So, main test is that it runs without error and starts simulation if not running
        assertTrue(layout.isRunning || layout.nodes.length < 2, 'Layout should be running or have too few nodes.');
        // It's hard to assert a specific energy change, so we check it doesn't throw.
        afterEachLayoutTest();
    });

    it('fixNode() and releaseNode() should manage fixedNodes set', () => {
        beforeEachLayoutTest();
        layout.fixNode(node1);
        assertTrue(layout.fixedNodes.has(node1), 'fixedNodes should contain node1 after fixNode.');
        layout.releaseNode(node1);
        assertFalse(layout.fixedNodes.has(node1), 'fixedNodes should not contain node1 after releaseNode.');
        afterEachLayoutTest();
    });
});

describe('CameraController Class (Basic Interactions)', () => {
    let cameraCtrl, mockThreeCamera;

    const beforeEachCameraTest = () => {
        // Mock a THREE.PerspectiveCamera
        mockThreeCamera = { 
            position: new THREE.Vector3(0,0,700), 
            lookAt: () => {}, // Mock method
            fov: 70, 
            aspect: window.innerWidth / window.innerHeight,
            matrixWorld: new THREE.Matrix4(), // Mock matrixWorld for pan calculations
            getWorldDirection: (vec) => vec.set(0,0,-1) // Mock method
        };
        // Mock a DOM element for CameraController
        const mockDomEl = document.createElement('div');
        cameraCtrl = new S.CameraController(mockThreeCamera, mockDomEl);
    };
    
    const afterEachCameraTest = () => {
        cameraCtrl?.dispose();
    };

    it('moveTo() should update targetPosition and targetLookAt', () => {
        beforeEachCameraTest();
        cameraCtrl.moveTo(100, 200, 300, 0, new THREE.Vector3(50,50,0)); // 0 duration for immediate change
        // Due to GSAP animation, targetPosition might not update instantly without advancing time.
        // However, GSAP should set the target values immediately for its animation.
        assertEqual(cameraCtrl.targetPosition.x, 100, 'targetPosition.x should be updated by moveTo.');
        assertEqual(cameraCtrl.targetPosition.y, 200, 'targetPosition.y should be updated by moveTo.');
        assertEqual(cameraCtrl.targetPosition.z, 300, 'targetPosition.z should be updated by moveTo.');
        assertEqual(cameraCtrl.targetLookAt.x, 50, 'targetLookAt.x should be updated by moveTo.');
        afterEachCameraTest();
    });

    it('zoom() should change targetPosition based on zoom direction', () => {
        beforeEachCameraTest();
        const initialZ = cameraCtrl.targetPosition.z;
        // Mock a wheel event for zooming in (deltaY < 0)
        cameraCtrl.zoom({ clientX:0, clientY:0, deltaY: -100, preventDefault: () => {} });
        assertNotEqual(cameraCtrl.targetPosition.z, initialZ, 'targetPosition.z should change after zoom.');
        assertTrue(cameraCtrl.targetPosition.z < initialZ, 'Zooming in should decrease z distance (if looking along -z).');
        afterEachCameraTest();
    });

    it('pushState() and popState() should manage viewHistory', () => {
        beforeEachCameraTest();
        cameraCtrl.moveTo(10,20,30,0); // Set an initial state
        cameraCtrl.pushState();
        assertEqual(cameraCtrl.viewHistory.length, 1, 'viewHistory should have 1 state after pushState.');
        assertEqual(cameraCtrl.viewHistory[0].position.x, 10, 'Stored state position x should match.');

        cameraCtrl.moveTo(50,60,70,0);
        cameraCtrl.pushState();
        assertEqual(cameraCtrl.viewHistory.length, 2, 'viewHistory should have 2 states.');

        cameraCtrl.popState(0); // Pop with 0 duration
        assertEqual(cameraCtrl.viewHistory.length, 1, 'viewHistory should have 1 state after popState.');
        // Check if targetPosition reflects the popped state (check GSAP targets)
        assertEqual(cameraCtrl.targetPosition.x, 10, 'targetPosition should revert to popped state x.');
        afterEachCameraTest();
    });
});

describe('UIManager Class (Basic Instantiation)', () => {
    // Full UIManager testing is complex due to DOM event reliance.
    // Basic instantiation test.
    it('should instantiate with SpaceGraph and DOM elements', () => {
        setupMockDOM();
        const space = new S.SpaceGraph(mockContainer, { 
            contextMenuEl: mockContextMenu, 
            confirmDialogEl: mockConfirmDialog 
        });
        // UIManager is created inside SpaceGraph constructor
        assertNotNull(space.uiManager, 'UIManager instance should be created within SpaceGraph.');
        assertTrue(space.uiManager instanceof S.UIManager, 'uiManager should be an instance of UIManager.');
        space.dispose();
        teardownMockDOM();
    });
});


// Run all defined tests
// This should be the last call in the file.
// Ensure DOM is ready if running in browser.
if (typeof window !== 'undefined') { // Running in a browser-like environment
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            runTests();
        });
    } else {
        runTests();
    }
} else { // Running in Node.js or other non-browser environment
    // For Node.js, a JSDOM setup would be needed here for DOM-dependent parts.
    // For this exercise, we assume browser or browser-like (e.g. Vitest with JSDOM).
    console.warn("Tests are designed for a browser-like environment with DOM access.");
    // Attempt to run anyway, some tests might pass if they don't hit DOM specifics hard.
    // runTests(); 
}

// If you want to run tests from an HTML file:
// 1. Create an HTML file (e.g., test-runner.html)
// 2. Include this script: <script type="module" src="test-spacegraph.js"></script>
// 3. Open test-runner.html in a browser and check the console.
