import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three'; // Import from 'three' not the mock path
import { gsap } from 'gsap'; // Import from 'gsap'

// Mock THREE.js and GSAP
// The path to the mock files is relative to the root of the project,
// or how Vitest resolves it based on its config.
// If tests/ is the root for tests, then './mocks/three.js' might be correct.
// Let's assume Vitest config handles the aliasing or path resolution correctly if needed.
vi.mock('three', async (importOriginal) => {
    const actualThree = await importOriginal(); // Import actual three for constants etc.
    const mockThree = await import('./mocks/three.js'); // Path to your mock file
    return {
        ...actualThree, // Spread actual three to keep constants, etc.
        ...mockThree, // Override with mocks
    };
});

vi.mock('gsap', async () => {
    const mockGsap = await import('./mocks/gsap.js'); // Path to your mock file
    return mockGsap; // GSAP mock exports `gsap` as a named export and default
});

// Import classes from spacegraph.js
// Assuming tests are run from `tests/` directory, and spacegraph.js is in root.
import * as S from '../spacegraph.js';

// Mock DOM elements needed by SpaceGraph and its components
let mockContainer, mockContextMenu, mockConfirmDialog, mockStatusIndicator;

function setupMockDOM() {
    mockContainer = document.createElement('div');
    mockContainer.id = 'space'; // Matching the ID used in examples

    // SpaceGraph's _setupRenderers looks for these within the container
    const webglCanvas = document.createElement('canvas');
    webglCanvas.id = 'webgl-canvas'; // Ensure this ID matches what SpaceGraph expects
    mockContainer.appendChild(webglCanvas);

    const css3dContainer = document.createElement('div');
    css3dContainer.id = 'css3d-container'; // Ensure this ID matches
    mockContainer.appendChild(css3dContainer);

    mockContextMenu = document.createElement('div');
    mockContextMenu.id = 'context-menu';

    mockConfirmDialog = document.createElement('div');
    mockConfirmDialog.id = 'confirm-dialog';
    mockConfirmDialog.innerHTML =
        '<p id="confirm-message"></p><button id="confirm-yes"></button><button id="confirm-no"></button>';

    mockStatusIndicator = document.createElement('div');
    mockStatusIndicator.id = 'status-indicator';

    document.body.appendChild(mockContainer);
    document.body.appendChild(mockContextMenu);
    document.body.appendChild(mockConfirmDialog);
    document.body.appendChild(mockStatusIndicator);
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

describe('SpaceGraph Core', () => {
    let space;

    beforeEach(() => {
        setupMockDOM();
        // Pass the mock elements to SpaceGraph.
        // Ensure the config structure matches what SpaceGraph expects for UI elements.
        space = new S.SpaceGraph(
            mockContainer,
            {},
            {
                // config is second, uiElements is third
                contextMenuEl: mockContextMenu,
                confirmDialogEl: mockConfirmDialog,
                statusIndicatorEl: mockStatusIndicator, // Assuming UIManager might use this
            }
        );
    });

    afterEach(() => {
        space?.dispose();
        teardownMockDOM();
    });

    it('should instantiate SpaceGraph', () => {
        expect(space).not.toBeNull();
        expect(space.nodes).toBeInstanceOf(Map);
        expect(space.edges).toBeInstanceOf(Map);
        expect(space.scene).toBeDefined(); // Relies on THREE.Scene mock
        expect(space.cssScene).toBeDefined(); // Relies on THREE.Scene mock for CSS3D
        expect(space.cameraController).toBeInstanceOf(S.CameraController);
        expect(space.layoutEngine).toBeInstanceOf(S.ForceLayout);
        expect(space.uiManager).toBeInstanceOf(S.UIManager);
    });

    it('should add and retrieve a NoteNode', () => {
        const note = new S.NoteNode('note1', { x: 10, y: 20, z: 0 }, { content: 'Test Note' });
        space.addNode(note);
        expect(space.nodes.size).toBe(1);
        expect(space.getNodeById('note1')).toBe(note);
        expect(note.spaceGraph).toBe(space);
    });

    it('should add and retrieve a ShapeNode', () => {
        const shape = new S.ShapeNode(
            'shape1',
            { x: 30, y: 40, z: 0 },
            { label: 'Test Shape', shape: 'box', size: 50 }
        );
        space.addNode(shape);
        expect(space.nodes.size).toBe(1);
        expect(space.getNodeById('shape1')).toBe(shape);
        expect(shape.spaceGraph).toBe(space);
    });

    it('should remove a Node and its connected Edges', () => {
        const node1 = new S.NoteNode('n1');
        const node2 = new S.NoteNode('n2');
        const node3 = new S.NoteNode('n3');
        space.addNode(node1);
        space.addNode(node2);
        space.addNode(node3);
        const edge1 = space.addEdge(node1, node2);
        const edge2 = space.addEdge(node2, node3);
        expect(space.nodes.size).toBe(3);
        expect(space.edges.size).toBe(2);

        space.removeNode('n2'); // Triggers removal of node and connected edges
        expect(space.nodes.size).toBe(2);
        expect(space.getNodeById('n2')).toBeNull();
        expect(space.edges.size).toBe(0);
        expect(space.getEdgeById(edge1.id)).toBeNull();
        expect(space.getEdgeById(edge2.id)).toBeNull();
    });

    it('should add and retrieve an Edge', () => {
        const node1 = new S.NoteNode('n1');
        const node2 = new S.NoteNode('n2');
        space.addNode(node1);
        space.addNode(node2);
        const edge = space.addEdge(node1, node2, { color: 0xff0000 });

        expect(edge).not.toBeNull();
        expect(space.edges.size).toBe(1);
        expect(space.getEdgeById(edge.id)).toBe(edge);
        expect(edge.spaceGraph).toBe(space);
        expect(edge.data.color).toBe(0xff0000);
    });

    it('should remove an Edge', () => {
        const node1 = new S.NoteNode('n1');
        const node2 = new S.NoteNode('n2');
        space.addNode(node1);
        space.addNode(node2);
        const edge = space.addEdge(node1, node2);
        expect(space.edges.size).toBe(1);

        space.removeEdge(edge.id);
        expect(space.edges.size).toBe(0);
        expect(space.getEdgeById(edge.id)).toBeNull();
    });

    it('should not add duplicate edges', () => {
        const node1 = new S.NoteNode('n10');
        const node2 = new S.NoteNode('n11');
        space.addNode(node1);
        space.addNode(node2);
        space.addEdge(node1, node2);
        const edge2 = space.addEdge(node1, node2); // Attempt to add duplicate
        const edge3 = space.addEdge(node2, node1); // Attempt to add reverse duplicate

        expect(space.edges.size).toBe(1);
        expect(edge2).toBeNull();
        expect(edge3).toBeNull();
    });

    it('should handle setSelectedNode', () => {
        const node1 = new S.NoteNode('n1');
        space.addNode(node1);
        space.setSelectedNode(node1); // This calls node.setSelected(true)
        expect(space.selectedNode).toBe(node1);
        // NoteNode htmlElement is created on demand by cssObject getter.
        // Ensure cssObject is accessed to trigger htmlElement creation before checking classList.
        expect(node1.cssObject).toBeDefined(); // Trigger htmlElement creation
        expect(node1.htmlElement.classList.contains('selected')).toBe(true);

        space.setSelectedNode(null); // This calls node.setSelected(false)
        expect(space.selectedNode).toBeNull();
        expect(node1.htmlElement.classList.contains('selected')).toBe(false);
    });

    it('should handle setSelectedEdge and deselect node', () => {
        const node1 = new S.NoteNode('n1');
        const node2 = new S.NoteNode('n2');
        space.addNode(node1);
        space.addNode(node2);
        const edge = space.addEdge(node1, node2);

        space.setSelectedNode(node1);
        space.setSelectedEdge(edge);

        expect(space.selectedEdge).toBe(edge);
        // The mock LineBasicMaterial needs to support opacity for this check
        expect(edge.threeObject.material.opacity).toBe(1.0);
        expect(space.selectedNode).toBeNull();
    });
});

describe('Node Classes', () => {
    let space;

    beforeEach(() => {
        setupMockDOM();
        space = new S.SpaceGraph(
            mockContainer,
            {},
            {
                contextMenuEl: mockContextMenu,
                confirmDialogEl: mockConfirmDialog,
            }
        );
    });
    afterEach(() => {
        space?.dispose();
        teardownMockDOM();
    });

    it('BaseNode should instantiate with ID, position, data, mass', () => {
        const pos = { x: 1, y: 2, z: 3 };
        const data = { custom: 'value' };
        const node = new S.BaseNode('base1', pos, data, 2.5);
        expect(node.id).toBe('base1');
        expect(node.position.x).toBe(1);
        expect(node.data.custom).toBe('value');
        expect(node.mass).toBe(2.5);
    });

    it('HtmlNodeElement should instantiate and create HTML element', () => {
        const node = new S.HtmlNodeElement(
            'html1',
            { x: 0, y: 0, z: 0 },
            { label: 'HTML Test', width: 200, height: 100 }
        );
        // Access cssObject to trigger htmlElement creation
        expect(node.cssObject).toBeDefined();
        expect(node.htmlElement).toBeDefined();
        expect(node.htmlElement.style.width).toBe('200px');
        expect(node.size.width).toBe(200);
        expect(node.htmlElement.classList.contains('node-html')).toBe(true);
    });

    it('NoteNode should instantiate as editable HtmlNodeElement', () => {
        const nodeData = { type: 'note', id: 'note-edit', x: 0, y: 0, z: 0, content: 'Editable' };
        // NoteNode type is typically registered by SpaceGraph itself if using built-in types,
        // but explicit registration is fine for testing.
        // If 'note' is a built-in type that auto-registers NoteNode, this might not be strictly needed
        // but doesn't harm. The main point is using addNode.
        space.registerNodeType('note', S.NoteNode);
        const actualNode = space.addNode(nodeData);

        expect(actualNode).toBeInstanceOf(S.NoteNode); // Check for NoteNode instance
        expect(actualNode).toBeInstanceOf(S.HtmlNodeElement); // NoteNode extends HtmlNodeElement
        expect(actualNode.data.editable).toBe(true);
        // Access cssObject to trigger htmlElement creation
        expect(actualNode.cssObject).toBeDefined();
        expect(actualNode.htmlElement.querySelector('.node-content[contenteditable="true"]')).not.toBeNull();
    });

    it('HtmlNodeElement setSize and setContentScale should update properties', () => {
        const node = new S.HtmlNodeElement('html-resize', { x: 0, y: 0, z: 0 }, { width: 100, height: 50 });
        node.spaceGraph = space;

        // Access cssObject to trigger htmlElement creation
        expect(node.cssObject).toBeDefined();

        node.setSize(150, 75);
        expect(node.size.width).toBe(150);
        expect(node.htmlElement.style.width).toBe('150px');

        node.setContentScale(1.5);
        expect(node.data.contentScale).toBe(1.5);
        const contentEl = node.htmlElement.querySelector('.node-content');
        expect(contentEl.style.transform).toBe('scale(1.5)');
    });

    it('ShapeNode should instantiate with shape, size, color, label, and mesh', () => {
        const nodeData = { type: 'shape', id: 'shape-box1', x: 0, y: 0, z: 0, label: 'MyBox', shape: 'box', size: 60, color: 0xabcdef, mass: 1.8 };
        // Similar to NoteNode, 'shape' might be auto-registered. Explicit registration for test is okay.
        space.registerNodeType('shape', S.ShapeNode);
        const node = space.addNode(nodeData);

        expect(node.data.shape).toBe('box');
        expect(node.data.size).toBe(60);
        expect(node.data.color).toBe(0xabcdef);
        expect(node.mass).toBe(1.8); // Mass is passed as 4th arg to createNodeInstance if needed
        expect(node.mesh).toBeDefined();
        expect(node.mesh).toBeInstanceOf(THREE.Mesh); // Check against mocked THREE.Mesh
        expect(node.mesh.userData.nodeId).toBe('shape-box1');
        expect(node.labelObject).toBeDefined();
        expect(node.labelObject.element.textContent).toBe('MyBox');
    });
});

describe('Edge Class', () => {
    let node1, node2;
    beforeEach(() => {
        // Use BaseNode for simplicity as Edge doesn't require specific node types unless data implies it
        node1 = new S.BaseNode('n1');
        node2 = new S.BaseNode('n2');
    });

    it('should instantiate with ID, source, target, and data', () => {
        const data = { color: 0x123456, thickness: 2.0, constraintType: 'rigid' };
        const edge = new S.Edge('edge1', node1, node2, data);

        expect(edge.id).toBe('edge1');
        expect(edge.source).toBe(node1);
        expect(edge.target).toBe(node2);
        expect(edge.data.color).toBe(0x123456);
        expect(edge.data.thickness).toBe(2.0);
        expect(edge.data.constraintType).toBe('rigid');
        expect(edge.threeObject).toBeDefined(); // Relies on THREE.Line mock
    });

    it('should update data properties', () => {
        const edge = new S.Edge('edge2', node1, node2);
        edge.data.color = 0xabcdef;
        edge.data.thickness = 3.0;
        edge.data.constraintParams.idealLength = 250;

        expect(edge.data.color).toBe(0xabcdef);
        expect(edge.data.thickness).toBe(3.0);
        expect(edge.data.constraintParams.idealLength).toBe(250);
    });
});

describe('ForceLayout Class (Basic Interactions)', () => {
    let spaceInstance, layout, node1, node2, edge;

    beforeEach(() => {
        setupMockDOM();
        spaceInstance = new S.SpaceGraph(
            mockContainer,
            {},
            { contextMenuEl: mockContextMenu, confirmDialogEl: mockConfirmDialog }
        );
        layout = spaceInstance.layoutEngine;

        spaceInstance.registerNodeType('note', S.NoteNode); // Ensure 'note' type is registered
        node1 = spaceInstance.addNode({ id: 'ln1', type: 'note' });
        node2 = spaceInstance.addNode({ id: 'ln2', type: 'note' });
        edge = spaceInstance.addEdge(node1, node2);
    });
    afterEach(() => {
        spaceInstance?.dispose();
        teardownMockDOM();
    });

    it('should have nodes and edges added via SpaceGraph', () => {
        expect(layout.nodes.map((n) => n.id)).toContain(node1.id);
        expect(layout.nodes.map((n) => n.id)).toContain(node2.id);
        expect(layout.edges.map((e) => e.id)).toContain(edge.id);
    });

    it('should remove nodes and edges when removed from SpaceGraph', () => {
        spaceInstance.removeEdge(edge.id);
        expect(layout.edges.map((e) => e.id)).not.toContain(edge.id);
        spaceInstance.removeNode(node1.id);
        expect(layout.nodes.map((n) => n.id)).not.toContain(node1.id);
    });

    it('kick() should run and potentially change energy, and move non-fixed nodes', () => {
        node1.position.set(0, 0, 0);
        node1.velocity.set(0, 0, 0);
        node2.position.set(1, 0, 0); // Ensure not at the same spot
        node2.velocity.set(0, 0, 0);

        layout.releaseNode(node1); // Ensure node1 is not fixed
        layout.releaseNode(node2); // Ensure node2 is not fixed

        // const initialEnergy = layout.energy; // Energy calculation might be complex with mocks
        layout.kick(5);
        expect(layout.isRunning || layout.nodes.length < 2).toBe(true);
        // Hard to assert energy change with mocks, focus on no errors

        // After a kick, non-fixed nodes should have some velocity if layout is running
        // This assumes the kick imparts some motion.
        if (layout.nodes.length >= 2 && layout.isRunning) {
            // If nodes are not fixed and layout is running, they should have some velocity after kick
            // unless they are perfectly balanced, which is unlikely with a generic kick.
            // Check node1 as it's explicitly not fixed.
            // The velocity might be very small, so check for non-zero.
            const v1 = layout.velocities.get(node1.id);
            expect(v1.x !== 0 || v1.y !== 0 || v1.z !== 0).toBe(true);
        }
    });

    it('should move nodes apart with repulsion', () => {
        node1.position.set(0, 0, 0);
        node2.position.set(0.1, 0, 0); // Very close
        const initialDistance = node1.position.distanceTo(node2.position);

        layout.runOnce(10); // Run for a few iterations

        const finalDistance = node1.position.distanceTo(node2.position);
        expect(finalDistance).toBeGreaterThan(initialDistance);
    });

    it('should pull nodes together with edge attraction (elastic constraint)', () => {
        // Ensure the edge is 'elastic' or has attractive properties
        edge.data.constraintType = 'elastic';
        edge.data.constraintParams = { idealLength: 50, stiffness: 0.1 }; // springConstant is usually stiffness
        // layout.updateEdgeConstraint(edge); // This method does not exist; properties are read directly.

        node1.position.set(0, 0, 0);
        node2.position.set(200, 0, 0); // Far apart
        const initialDistance = node1.position.distanceTo(node2.position);

        layout.runOnce(10); // Run for a few iterations

        const finalDistance = node1.position.distanceTo(node2.position);
        // If idealLength is 50 and they start at 200, they should move closer.
        expect(finalDistance).toBeLessThan(initialDistance);
    });

    it('fixNode() and releaseNode() should manage fixedNodes set', () => {
        layout.fixNode(node1);
        expect(layout.fixedNodes.has(node1.id)).toBe(true); // ForceLayout stores by ID
        layout.releaseNode(node1);
        expect(layout.fixedNodes.has(node1.id)).toBe(false);
    });
});

describe('CameraController Class (Basic Interactions)', () => {
    let cameraCtrl;
    let mockThreeCamera; // To hold the mocked THREE.PerspectiveCamera instance
    let mockDomEl;

    beforeEach(() => {
        // Create an instance of the mocked PerspectiveCamera
        mockThreeCamera = new THREE.PerspectiveCamera(); // Uses mock from vi.mock
        mockDomEl = document.createElement('div');
        // Pass the instance, not the mock constructor
        cameraCtrl = new S.CameraController(mockThreeCamera, mockDomEl, {});
        // Reset GSAP mocks for call counts if needed, though typically vi.clearAllMocks() in global afterEach is better
        gsap.to.mockClear();
    });

    afterEach(() => {
        cameraCtrl?.dispose();
        mockDomEl = null;
    });

    it('moveTo() should update targetPosition and targetLookAt, and camera directly if duration is 0', () => {
        const lookAtVec = new THREE.Vector3(50, 50, 0);
        cameraCtrl.moveTo(100, 200, 300, 0, lookAtVec);

        expect(gsap.to).toHaveBeenCalled();
        // Check the state that GSAP would animate to (target values)
        expect(cameraCtrl.targetPosition.x).toBe(100);
        expect(cameraCtrl.targetPosition.y).toBe(200);
        expect(cameraCtrl.targetPosition.z).toBe(300);
        expect(cameraCtrl.targetLookAt.x).toBe(50);
        expect(cameraCtrl.targetLookAt.y).toBe(50);
        expect(cameraCtrl.targetLookAt.z).toBe(0);

        // Check actual camera position and lookAt (via currentLookAt)
        // The mock GSAP should apply these immediately if duration is 0
        expect(cameraCtrl.camera.position.x).toBe(100);
        expect(cameraCtrl.camera.position.y).toBe(200);
        expect(cameraCtrl.camera.position.z).toBe(300);

        // lookAt is tricky as it's a method. CameraController uses currentLookAt internally
        // to store the vector passed to camera.lookAt().
        expect(cameraCtrl.currentLookAt.x).toBe(50);
        expect(cameraCtrl.currentLookAt.y).toBe(50);
        expect(cameraCtrl.currentLookAt.z).toBe(0);
        // Check if the camera's lookAt method was called with the correct vector
        expect(cameraCtrl.camera.lookAt).toHaveBeenCalledWith(lookAtVec);
    });

    it('pan() should change targetPosition and targetLookAt', () => {
        const initialPos = cameraCtrl.targetPosition.clone();
        const initialLookAt = cameraCtrl.targetLookAt.clone();

        cameraCtrl.startPan(); // Stores current mouse, not essential for this test logic but part of usage
        // Simulate a mouse drag: dx=10, dy=5.
        // The actual change depends on camera orientation and zoom level, so we just check for *a* change.
        cameraCtrl.pan(10, 5);

        expect(cameraCtrl.targetPosition.equals(initialPos)).toBe(false);
        expect(cameraCtrl.targetLookAt.equals(initialLookAt)).toBe(false);
    });

    it('resetView() should revert to initial state after setting it', () => {
        // Set an initial state
        cameraCtrl.moveTo(1, 2, 3, 0, new THREE.Vector3(0.1, 0.2, 0.3));
        cameraCtrl.setInitialState(); // This captures the current targetPosition and targetLookAt

        // Move to a different state
        cameraCtrl.moveTo(10, 20, 30, 0, new THREE.Vector3(1, 2, 3));

        // Reset the view with duration 0
        cameraCtrl.resetView(0);

        expect(gsap.to).toHaveBeenCalledTimes(3); // moveTo, moveTo, resetView

        // Check if targetPosition and targetLookAt are back to the initial state
        expect(cameraCtrl.targetPosition.x).toBe(1);
        expect(cameraCtrl.targetPosition.y).toBe(2);
        expect(cameraCtrl.targetPosition.z).toBe(3);
        expect(cameraCtrl.targetLookAt.x).toBe(0.1);
        expect(cameraCtrl.targetLookAt.y).toBe(0.2);
        expect(cameraCtrl.targetLookAt.z).toBe(0.3);
    });

    it('zoom() should change targetPosition based on zoom direction via GSAP', () => {
        const initialZ = cameraCtrl.targetPosition.z;
        cameraCtrl.zoom({ clientX: 0, clientY: 0, deltaY: -100, preventDefault: () => {} });

        expect(gsap.to).toHaveBeenCalled();
        // Check the state that GSAP would animate to
        // Zooming "in" (deltaY < 0) should move camera closer to target.
        // If looking along -Z, targetPosition.z would decrease.
        expect(cameraCtrl.targetPosition.z).not.toBe(initialZ);
        // This assertion depends on the mock's behavior for getWorldDirection and zoom calculation.
        // Let's assume zoom implementation correctly calculates a new Z.
    });

    it('pushState() and popState() should manage viewHistory', () => {
        cameraCtrl.moveTo(10, 20, 30, 0);
        cameraCtrl.pushState();
        expect(cameraCtrl.viewHistory.length).toBe(1);
        expect(cameraCtrl.viewHistory[0].position.x).toBe(10);

        cameraCtrl.moveTo(50, 60, 70, 0);
        cameraCtrl.pushState();
        expect(cameraCtrl.viewHistory.length).toBe(2);

        cameraCtrl.popState(0); // Pop with 0 duration for GSAP to apply immediately
        expect(cameraCtrl.viewHistory.length).toBe(1);
        expect(gsap.to).toHaveBeenCalledTimes(3); // 2 moveTo, 1 popState

        // Check if targetPosition reflects the popped state
        expect(cameraCtrl.targetPosition.x).toBe(10);
        expect(cameraCtrl.targetPosition.y).toBe(20);
        expect(cameraCtrl.targetPosition.z).toBe(30);
    });
});

describe('SpaceGraph Event Emitter', () => {
    let space;
    let mockListener;

    beforeEach(() => {
        setupMockDOM();
        space = new S.SpaceGraph(
            mockContainer,
            {},
            {
                contextMenuEl: mockContextMenu,
                confirmDialogEl: mockConfirmDialog,
                statusIndicatorEl: mockStatusIndicator,
            }
        );
        mockListener = vi.fn();
    });

    afterEach(() => {
        space?.dispose();
        teardownMockDOM();
        mockListener.mockClear();
    });

    it('should emit "nodeAdded" when a node is added', () => {
        space.on('nodeAdded', mockListener);
        const node = new S.NoteNode('n1');
        space.addNode(node);
        expect(mockListener).toHaveBeenCalledTimes(1);
        expect(mockListener).toHaveBeenCalledWith({ node });
    });

    it('should emit "nodeRemoved" when a node is removed', () => {
        const node = new S.NoteNode('n1');
        space.addNode(node); // Add first so it can be removed
        space.on('nodeRemoved', mockListener);
        space.removeNode('n1');
        expect(mockListener).toHaveBeenCalledTimes(1);
        expect(mockListener).toHaveBeenCalledWith({ nodeId: 'n1', node });
    });

    it('should emit "edgeAdded" when an edge is added', () => {
        const node1 = new S.NoteNode('n1');
        const node2 = new S.NoteNode('n2');
        space.addNode(node1);
        space.addNode(node2);
        space.on('edgeAdded', mockListener);
        const edge = space.addEdge(node1, node2);
        expect(mockListener).toHaveBeenCalledTimes(1);
        expect(mockListener).toHaveBeenCalledWith({ edge });
    });

    it('should emit "edgeRemoved" when an edge is removed', () => {
        const node1 = new S.NoteNode('n1');
        const node2 = new S.NoteNode('n2');
        space.addNode(node1);
        space.addNode(node2);
        const edge = space.addEdge(node1, node2); // Add first
        space.on('edgeRemoved', mockListener);
        space.removeEdge(edge.id);
        expect(mockListener).toHaveBeenCalledTimes(1);
        expect(mockListener).toHaveBeenCalledWith({ edgeId: edge.id, edge });
    });

    it('should emit "nodeSelected" when setSelectedNode is called', () => {
        const node1 = new S.NoteNode('n1');
        const node2 = new S.NoteNode('n2');
        space.addNode(node1);
        space.addNode(node2);
        space.on('nodeSelected', mockListener);

        // Select node1
        space.setSelectedNode(node1);
        expect(mockListener).toHaveBeenCalledTimes(1);
        expect(mockListener).toHaveBeenCalledWith({ selectedNode: node1, previouslySelectedNode: null });
        mockListener.mockClear();

        // Select node2 (node1 becomes previouslySelectedNode)
        space.setSelectedNode(node2);
        expect(mockListener).toHaveBeenCalledTimes(1);
        expect(mockListener).toHaveBeenCalledWith({ selectedNode: node2, previouslySelectedNode: node1 });
        mockListener.mockClear();

        // Deselect (select null)
        space.setSelectedNode(null);
        expect(mockListener).toHaveBeenCalledTimes(1);
        expect(mockListener).toHaveBeenCalledWith({ selectedNode: null, previouslySelectedNode: node2 });
    });

    it('should emit "edgeSelected" when setSelectedEdge is called', () => {
        const n1 = new S.NoteNode('e_n1');
        const n2 = new S.NoteNode('e_n2');
        const n3 = new S.NoteNode('e_n3');
        space.addNode(n1);
        space.addNode(n2);
        space.addNode(n3);
        const edge1 = space.addEdge(n1, n2);
        const edge2 = space.addEdge(n2, n3);
        space.on('edgeSelected', mockListener);

        // Select edge1
        space.setSelectedEdge(edge1);
        expect(mockListener).toHaveBeenCalledTimes(1);
        expect(mockListener).toHaveBeenCalledWith({ selectedEdge: edge1, previouslySelectedEdge: null });
        mockListener.mockClear();

        // Select edge2
        space.setSelectedEdge(edge2);
        expect(mockListener).toHaveBeenCalledTimes(1);
        expect(mockListener).toHaveBeenCalledWith({ selectedEdge: edge2, previouslySelectedEdge: edge1 });
        mockListener.mockClear();

        // Deselect (select null)
        space.setSelectedEdge(null);
        expect(mockListener).toHaveBeenCalledTimes(1);
        expect(mockListener).toHaveBeenCalledWith({ selectedEdge: null, previouslySelectedEdge: edge2 });
    });

    it('off() should remove an event listener', () => {
        space.on('nodeAdded', mockListener);
        space.off('nodeAdded', mockListener); // Remove the listener

        const node = new S.NoteNode('n-off-test');
        space.addNode(node); // Trigger the event

        expect(mockListener).not.toHaveBeenCalled();
    });
});

describe('UIManager Class (Basic Instantiation)', () => {
    it('should instantiate with SpaceGraph and DOM elements', () => {
        setupMockDOM();
        const spaceInstance = new S.SpaceGraph(
            mockContainer,
            {},
            {
                contextMenuEl: mockContextMenu,
                confirmDialogEl: mockConfirmDialog,
            }
        );
        expect(spaceInstance.uiManager).not.toBeNull();
        expect(spaceInstance.uiManager).toBeInstanceOf(S.UIManager);
        spaceInstance.dispose();
        teardownMockDOM();
    });
});

describe('RegisteredNode Lifecycle and Custom Types', () => {
    let space;
    let mockOnCreate, mockGetDefaults, mockOnDispose, mockOnUpdate, mockTypeDef;

    beforeEach(() => {
        setupMockDOM();
        space = new S.SpaceGraph(
            mockContainer,
            {},
            {
                contextMenuEl: mockContextMenu,
                confirmDialogEl: mockConfirmDialog,
            }
        );

        // Reset mocks for each test
        mockOnCreate = vi.fn().mockImplementation((nodeInst, sg) => {
            const el = document.createElement('div');
            el.id = `custom-html-${nodeInst.id}`;
            el.className = 'custom-node-element';
            return { htmlElement: el, cssObject: new THREE.CSS3DObject(el) }; // Ensure cssObject is also created
        });
        mockGetDefaults = vi.fn().mockImplementation((initialData) => ({
            customDefaultValue: 'defaulted',
            ...initialData, // User-provided data should override these defaults if names clash
        }));
        mockOnDispose = vi.fn();
        mockOnUpdate = vi.fn(); // Mock for onUpdate if needed

        mockTypeDef = {
            onCreate: mockOnCreate,
            getDefaults: mockGetDefaults,
            onDispose: mockOnDispose,
            onUpdate: mockOnUpdate, // Add other lifecycle methods as vi.fn() if testing them
        };
    });

    afterEach(() => {
        space?.dispose();
        teardownMockDOM();
        // Reset mocks to clear call counts etc.
        vi.resetAllMocks();
    });

    it('should register a new node type successfully', () => {
        space.registerNodeType('my-custom-type', mockTypeDef);
        expect(space.nodeTypes.has('my-custom-type')).toBe(true);
        expect(space.nodeTypes.get('my-custom-type')).toBe(mockTypeDef);
    });

    it('should throw an error if registering a duplicate type name', () => {
        space.registerNodeType('my-custom-type', mockTypeDef);
        expect(() => {
            space.registerNodeType('my-custom-type', { ...mockTypeDef, onCreate: vi.fn() }); // Different definition object
        }).toThrowError('Node type "my-custom-type" is already registered.');
    });

    it('should throw an error for invalid type definition (missing onCreate)', () => {
        const invalidTypeDef = { getDefaults: vi.fn() }; // Missing onCreate
        expect(() => {
            space.registerNodeType('invalid-type', invalidTypeDef);
        }).toThrowError('Invalid typeDefinition for "invalid-type": onCreate method is required.');
    });

    it('should instantiate a registered node type via addNode', () => {
        space.registerNodeType('my-custom-type', mockTypeDef);
        const customNode = space.addNode({ type: 'my-custom-type', id: 'custom1', x: 10, y: 10, initialData: 'test' });

        expect(customNode).toBeInstanceOf(S.RegisteredNode);
        expect(customNode.id).toBe('custom1');
        expect(customNode.typeDefinition).toBe(mockTypeDef);
        expect(customNode.data.type).toBe('my-custom-type'); // Type should be part of data
        expect(customNode.data.initialData).toBe('test');
    });

    it('should call getDefaults during custom node instantiation and merge data', () => {
        space.registerNodeType('my-custom-type', mockTypeDef);
        const initialNodeData = { type: 'my-custom-type', id: 'custom-defaults', specificValue: 123 };
        const customNode = space.addNode(initialNodeData);

        expect(mockGetDefaults).toHaveBeenCalledTimes(1);
        // Note: BaseNode constructor calls getDefaultData (which in RegisteredNode calls typeDefinition.getDefaults)
        // The argument to typeDefinition.getDefaults is the RegisteredNode instance and SpaceGraph instance.
        // We check if the *result* of getDefaults (customDefaultValue) is present in the node's data.
        expect(customNode.data.customDefaultValue).toBe('defaulted');
        expect(customNode.data.specificValue).toBe(123); // Ensure original data is preserved
        expect(customNode.data.type).toBe('my-custom-type');
    });

    it('should call onCreate during custom node instantiation and attach visuals', () => {
        space.registerNodeType('my-custom-type', mockTypeDef);
        const customNode = space.addNode({ type: 'my-custom-type', id: 'custom-oncreate' });

        expect(mockOnCreate).toHaveBeenCalledTimes(1);
        expect(mockOnCreate).toHaveBeenCalledWith(customNode, space); // Check arguments

        expect(customNode.htmlElement).toBeDefined();
        expect(customNode.htmlElement.id).toBe(`custom-html-${customNode.id}`);
        expect(customNode.cssObject).toBeDefined(); // Ensure cssObject was created/assigned
        expect(customNode.cssObject.element).toBe(customNode.htmlElement);
        // Check if it was added to the scene (assuming cssScene is the target for htmlElement-based nodes)
        expect(space.cssScene.add).toHaveBeenCalledWith(customNode.cssObject);
    });

    it('should call onUpdate for custom nodes during graph update cycle', () => {
        space.registerNodeType('my-custom-type', mockTypeDef);
        const customNode = space.addNode({ type: 'my-custom-type', id: 'custom-onupdate' });

        // Trigger an update cycle (normally done by _animate)
        space._updateNodesAndEdges(); // This will call node.update() for all nodes

        expect(mockOnUpdate).toHaveBeenCalledTimes(1);
        expect(mockOnUpdate).toHaveBeenCalledWith(customNode, space);
    });

    it('should call onDispose when a custom node is removed', () => {
        space.registerNodeType('my-custom-type', mockTypeDef);
        const customNode = space.addNode({ type: 'my-custom-type', id: 'custom-ondispose' });

        expect(customNode).toBeDefined(); // Ensure node was added

        space.removeNode('custom-ondispose');

        expect(mockOnDispose).toHaveBeenCalledTimes(1);
        expect(mockOnDispose).toHaveBeenCalledWith(customNode, space);
    });
});

// No need for manual runTests() call; Vitest handles test execution.
// No need for DOMContentLoaded listener; JSDOM is typically ready.
