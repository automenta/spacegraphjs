// tests/ui/KeyboardInputHandler.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeyboardInputHandler } from '../../js/ui/KeyboardInputHandler.js'; // Adjust if needed
import { SpaceGraph, HtmlNodeElement, NoteNode } from '../../spacegraph.js'; // For mocks and types
import * as THREE from 'three';

// Mock SpaceGraph and UIManager facade
// Similar mocking strategy as in PointerInputHandler.test.js
vi.mock('../../spacegraph.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        SpaceGraph: vi.fn().mockImplementation(() => ({
            container: document.createElement('div'), // Mock container
            nodes: new Map(),
            edges: new Map(),
            selectedNode: null,
            selectedEdge: null,
            cameraController: {
                resetView: vi.fn(),
                pushState: vi.fn(),
                moveTo: vi.fn(),
            },
            // Add other SpaceGraph methods/properties mocked as needed by KeyboardInputHandler
            removeNode: vi.fn(),
            removeEdge: vi.fn(),
            setSelectedNode: vi.fn(function(node) { this.selectedNode = node; }), // Allow selectedNode to be set on the mock
            focusOnNode: vi.fn(),
            centerView: vi.fn(),
            autoZoom: vi.fn(),
            _emit: vi.fn(),
        })),
        HtmlNodeElement: actual.HtmlNodeElement, // Use actual for instanceof
        NoteNode: actual.NoteNode, // Use actual for instanceof
    };
});

const mockUIManagerFacade = {
    showConfirmDialog: vi.fn(),
    handleEscape: vi.fn().mockReturnValue(false), // Default to not handled by other parts
    // Add other UIManager facade methods if KeyboardInputHandler calls them
};

let mockSpaceGraphInstance;
let keyboardInputHandler;

beforeEach(() => {
    // Access the class from the mocked module
    const MockedSpaceGraph = vi.mocked(SpaceGraph);
    mockSpaceGraphInstance = new MockedSpaceGraph();
    // It's important that setSelectedNode on the mock actually updates mockSpaceGraphInstance.selectedNode
    // This is achieved by using `function(node) { this.selectedNode = node; }` in the mock.

    keyboardInputHandler = new KeyboardInputHandler(mockSpaceGraphInstance, mockUIManagerFacade);
    keyboardInputHandler.bindEvents(); // Binds to window
});

afterEach(() => {
    keyboardInputHandler.dispose();
    vi.clearAllMocks();
});

describe('KeyboardInputHandler Initialization', () => {
    it('should instantiate correctly', () => {
        expect(keyboardInputHandler).toBeInstanceOf(KeyboardInputHandler);
        expect(keyboardInputHandler.spaceGraph).toBe(mockSpaceGraphInstance);
        expect(keyboardInputHandler.uiManager).toBe(mockUIManagerFacade);
    });

    it('should bind keydown event on bindEvents()', () => {
        const windowAddEventSpy = vi.spyOn(window, 'addEventListener');
        // keyboardInputHandler.bindEvents(); // Already called in beforeEach
        // We check if it was called during the setup.
        // To test idempotency or re-binding, it would be structured differently.
        expect(windowAddEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function), false);
        windowAddEventSpy.mockRestore();
    });
});

describe('handleKeyDown', () => {
    it('should not handle key events if an input field is active (except Escape)', () => {
        const mockEvent = { key: 'Delete', preventDefault: vi.fn() };
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus(); // Active element is an input

        keyboardInputHandler.handleKeyDown(mockEvent);
        expect(mockEvent.preventDefault).not.toHaveBeenCalled();
        expect(mockUIManagerFacade.showConfirmDialog).not.toHaveBeenCalled();

        document.body.removeChild(input);
    });

    it('should call showConfirmDialog for Delete key when a node is selected', () => {
        const mockNode = new NoteNode('n1', {}, {}); // Using actual NoteNode for instanceof checks
        mockSpaceGraphInstance.selectedNode = mockNode; // Set selected node on the mock

        const mockEvent = { key: 'Delete', preventDefault: vi.fn() };
        keyboardInputHandler.handleKeyDown(mockEvent);

        expect(mockUIManagerFacade.showConfirmDialog).toHaveBeenCalledWith(
            expect.stringContaining('Delete node "n1"...?'), // Check if message contains node id part
            expect.any(Function)
        );
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should call uiManager.handleEscape for Escape key', () => {
        const mockEvent = { key: 'Escape', preventDefault: vi.fn() };
        keyboardInputHandler.handleKeyDown(mockEvent);
        expect(mockUIManagerFacade.handleEscape).toHaveBeenCalled();
        // No preventDefault if handleEscape returns false
        expect(mockEvent.preventDefault).not.toHaveBeenCalled();

        mockUIManagerFacade.handleEscape.mockReturnValueOnce(true); // Simulate escape was handled
        keyboardInputHandler.handleKeyDown(mockEvent);
        expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1); // Now it should be called
    });

    it('should focus NoteNode content on Enter key if selected', () => {
        const mockNoteNode = new NoteNode('note1', {}, { content: 'test' });
        mockNoteNode.htmlElement = document.createElement('div'); // Mock htmlElement
        const mockContentElement = { focus: vi.fn() };
        vi.spyOn(mockNoteNode.htmlElement, 'querySelector').mockReturnValue(mockContentElement);

        mockSpaceGraphInstance.selectedNode = mockNoteNode;
        const mockEvent = { key: 'Enter', preventDefault: vi.fn() };
        keyboardInputHandler.handleKeyDown(mockEvent);

        expect(mockContentElement.focus).toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should call adjustContentScale with + on HtmlNodeElement', () => {
        const mockHtmlNode = new HtmlNodeElement('html1', {}, {});
        vi.spyOn(mockHtmlNode, 'adjustContentScale');
        mockSpaceGraphInstance.selectedNode = mockHtmlNode;
        const mockEvent = { key: '+', ctrlKey: false, metaKey: false, preventDefault: vi.fn() };

        keyboardInputHandler.handleKeyDown(mockEvent);

        expect(mockHtmlNode.adjustContentScale).toHaveBeenCalledWith(1.15);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should call adjustContentScale with - on HtmlNodeElement', () => {
        const mockHtmlNode = new HtmlNodeElement('html1', {}, {});
        vi.spyOn(mockHtmlNode, 'adjustContentScale');
        mockSpaceGraphInstance.selectedNode = mockHtmlNode;
        const mockEvent = { key: '-', ctrlKey: false, metaKey: false, preventDefault: vi.fn() };

        keyboardInputHandler.handleKeyDown(mockEvent);

        expect(mockHtmlNode.adjustContentScale).toHaveBeenCalledWith(1/1.15);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should call adjustNodeSize with Ctrl + on HtmlNodeElement', () => {
        const mockHtmlNode = new HtmlNodeElement('html1', {}, {});
        vi.spyOn(mockHtmlNode, 'adjustNodeSize');
        mockSpaceGraphInstance.selectedNode = mockHtmlNode;
        const mockEvent = { key: '+', ctrlKey: true, metaKey: false, preventDefault: vi.fn() };

        keyboardInputHandler.handleKeyDown(mockEvent);

        expect(mockHtmlNode.adjustNodeSize).toHaveBeenCalledWith(1.2);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should call adjustNodeSize with Meta + on HtmlNodeElement', () => {
        const mockHtmlNode = new HtmlNodeElement('html1', {}, {});
        vi.spyOn(mockHtmlNode, 'adjustNodeSize');
        mockSpaceGraphInstance.selectedNode = mockHtmlNode;
        const mockEvent = { key: '+', ctrlKey: false, metaKey: true, preventDefault: vi.fn() };

        keyboardInputHandler.handleKeyDown(mockEvent);

        expect(mockHtmlNode.adjustNodeSize).toHaveBeenCalledWith(1.2);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should call adjustNodeSize with Ctrl - on HtmlNodeElement', () => {
        const mockHtmlNode = new HtmlNodeElement('html1', {}, {});
        vi.spyOn(mockHtmlNode, 'adjustNodeSize');
        mockSpaceGraphInstance.selectedNode = mockHtmlNode;
        const mockEvent = { key: '-', ctrlKey: true, metaKey: false, preventDefault: vi.fn() };

        keyboardInputHandler.handleKeyDown(mockEvent);

        expect(mockHtmlNode.adjustNodeSize).toHaveBeenCalledWith(0.8);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should call focusOnNode with Space key when a node is selected', () => {
        const mockNode = new NoteNode('n1', {}, {});
        mockSpaceGraphInstance.selectedNode = mockNode;
        const mockEvent = { key: ' ', preventDefault: vi.fn() };

        keyboardInputHandler.handleKeyDown(mockEvent);

        expect(mockSpaceGraphInstance.focusOnNode).toHaveBeenCalledWith(mockNode, 0.5, true);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should call cameraController.moveTo with Space key when an edge is selected', () => {
        // Mock an edge and its nodes
        const sourceNode = new NoteNode('s1', { x: 0, y: 0, z: 0 });
        const targetNode = new NoteNode('t1', { x: 100, y: 0, z: 0 });
        const mockEdge = { id: 'e1', source: sourceNode, target: targetNode }; // Simple mock
        mockSpaceGraphInstance.selectedEdge = mockEdge;
        const mockEvent = { key: ' ', preventDefault: vi.fn() };

        keyboardInputHandler.handleKeyDown(mockEvent);

        expect(mockSpaceGraphInstance.cameraController.pushState).toHaveBeenCalled();
        const midPoint = new THREE.Vector3(50, 0, 0); // Expected midpoint
        const distance = 100; // Expected distance
        const expectedZ = midPoint.z + distance * 0.6 + 100;
        expect(mockSpaceGraphInstance.cameraController.moveTo).toHaveBeenCalledWith(midPoint.x, midPoint.y, expectedZ, 0.5, midPoint);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should call centerView with Space key when nothing is selected', () => {
        mockSpaceGraphInstance.selectedNode = null;
        mockSpaceGraphInstance.selectedEdge = null;
        const mockEvent = { key: ' ', preventDefault: vi.fn() };

        keyboardInputHandler.handleKeyDown(mockEvent);

        expect(mockSpaceGraphInstance.centerView).toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should handle Tab key for node navigation', () => {
        const nodeA = new NoteNode('nodeA', {x:0,y:0});
        const nodeB = new NoteNode('nodeB', {x:100,y:0});
        const nodeC = new NoteNode('nodeC', {x:200,y:0});
        mockSpaceGraphInstance.nodes.set(nodeA.id, nodeA);
        mockSpaceGraphInstance.nodes.set(nodeB.id, nodeB);
        mockSpaceGraphInstance.nodes.set(nodeC.id, nodeC);

        const mockEvent = { key: 'Tab', shiftKey: false, preventDefault: vi.fn() };

        // 1. No node selected -> selects first (nodeA by ID sort)
        mockSpaceGraphInstance.selectedNode = null;
        keyboardInputHandler.handleKeyDown(mockEvent);
        expect(mockSpaceGraphInstance.setSelectedNode).toHaveBeenCalledWith(nodeA);
        expect(mockSpaceGraphInstance.focusOnNode).toHaveBeenCalledWith(nodeA, 0.3, true);

        // 2. nodeA selected -> selects nodeB
        mockSpaceGraphInstance.selectedNode = nodeA; // Set by previous call's mock
        keyboardInputHandler.handleKeyDown(mockEvent);
        expect(mockSpaceGraphInstance.setSelectedNode).toHaveBeenCalledWith(nodeB);
        expect(mockSpaceGraphInstance.focusOnNode).toHaveBeenCalledWith(nodeB, 0.3, true);

        // 3. nodeC selected (last) -> wraps to nodeA
        mockSpaceGraphInstance.selectedNode = nodeC;
        keyboardInputHandler.handleKeyDown(mockEvent);
        expect(mockSpaceGraphInstance.setSelectedNode).toHaveBeenCalledWith(nodeA);
        expect(mockSpaceGraphInstance.focusOnNode).toHaveBeenCalledWith(nodeA, 0.3, true);

        expect(mockEvent.preventDefault).toHaveBeenCalledTimes(3);
    });

    it('should handle Shift+Tab key for reverse node navigation', () => {
        const nodeA = new NoteNode('nodeA', {x:0,y:0});
        const nodeB = new NoteNode('nodeB', {x:100,y:0});
        const nodeC = new NoteNode('nodeC', {x:200,y:0});
        mockSpaceGraphInstance.nodes.set(nodeA.id, nodeA);
        mockSpaceGraphInstance.nodes.set(nodeB.id, nodeB);
        mockSpaceGraphInstance.nodes.set(nodeC.id, nodeC);

        const mockEvent = { key: 'Tab', shiftKey: true, preventDefault: vi.fn() };

        // 1. No node selected -> selects last (nodeC by ID sort)
        mockSpaceGraphInstance.selectedNode = null;
        keyboardInputHandler.handleKeyDown(mockEvent);
        expect(mockSpaceGraphInstance.setSelectedNode).toHaveBeenCalledWith(nodeC);
        expect(mockSpaceGraphInstance.focusOnNode).toHaveBeenCalledWith(nodeC, 0.3, true);

        // 2. nodeC selected -> selects nodeB
        mockSpaceGraphInstance.selectedNode = nodeC;
        keyboardInputHandler.handleKeyDown(mockEvent);
        expect(mockSpaceGraphInstance.setSelectedNode).toHaveBeenCalledWith(nodeB);
        expect(mockSpaceGraphInstance.focusOnNode).toHaveBeenCalledWith(nodeB, 0.3, true);

        // 3. nodeA selected (first) -> wraps to nodeC
        mockSpaceGraphInstance.selectedNode = nodeA;
        keyboardInputHandler.handleKeyDown(mockEvent);
        expect(mockSpaceGraphInstance.setSelectedNode).toHaveBeenCalledWith(nodeC);
        expect(mockSpaceGraphInstance.focusOnNode).toHaveBeenCalledWith(nodeC, 0.3, true);

        expect(mockEvent.preventDefault).toHaveBeenCalledTimes(3);
    });

    it('should call _navigateNodesWithArrows for ArrowUp', () => {
        const spy = vi.spyOn(keyboardInputHandler, '_navigateNodesWithArrows');
        const mockEvent = { key: 'ArrowUp', preventDefault: vi.fn() };
        keyboardInputHandler.handleKeyDown(mockEvent);
        expect(spy).toHaveBeenCalledWith('ArrowUp');
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
     it('should call _navigateNodesWithArrows for ArrowDown', () => {
        const spy = vi.spyOn(keyboardInputHandler, '_navigateNodesWithArrows');
        const mockEvent = { key: 'ArrowDown', preventDefault: vi.fn() };
        keyboardInputHandler.handleKeyDown(mockEvent);
        expect(spy).toHaveBeenCalledWith('ArrowDown');
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
     it('should call _navigateNodesWithArrows for ArrowLeft', () => {
        const spy = vi.spyOn(keyboardInputHandler, '_navigateNodesWithArrows');
        const mockEvent = { key: 'ArrowLeft', preventDefault: vi.fn() };
        keyboardInputHandler.handleKeyDown(mockEvent);
        expect(spy).toHaveBeenCalledWith('ArrowLeft');
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
     it('should call _navigateNodesWithArrows for ArrowRight', () => {
        const spy = vi.spyOn(keyboardInputHandler, '_navigateNodesWithArrows');
        const mockEvent = { key: 'ArrowRight', preventDefault: vi.fn() };
        keyboardInputHandler.handleKeyDown(mockEvent);
        expect(spy).toHaveBeenCalledWith('ArrowRight');
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

});

describe('_navigateNodesWithArrows', () => {
    let nodeCenter, nodeRight, nodeLeft, nodeUp, nodeDown, nodeFarRight;

    beforeEach(() => {
        // Using BaseNode for simplicity as specific node type features are not tested here, only positions.
        nodeCenter = new BaseNode('center', { x: 0, y: 0, z: 0 });
        nodeRight = new BaseNode('right', { x: 100, y: 0, z: 0 });
        nodeLeft = new BaseNode('left', { x: -100, y: 0, z: 0 });
        nodeUp = new BaseNode('up', { x: 0, y: 100, z: 0 });
        nodeDown = new BaseNode('down', { x: 0, y: -100, z: 0 });
        nodeFarRight = new BaseNode('farRight', { x: 200, y: 10, z: 0 }); // Slightly off-axis

        mockSpaceGraphInstance.nodes.clear(); // Clear from previous tests if any
        mockSpaceGraphInstance.nodes.set(nodeCenter.id, nodeCenter);
        mockSpaceGraphInstance.nodes.set(nodeRight.id, nodeRight);
        mockSpaceGraphInstance.nodes.set(nodeLeft.id, nodeLeft);
        mockSpaceGraphInstance.nodes.set(nodeUp.id, nodeUp);
        mockSpaceGraphInstance.nodes.set(nodeDown.id, nodeDown);
        mockSpaceGraphInstance.nodes.set(nodeFarRight.id, nodeFarRight);

        mockSpaceGraphInstance.selectedNode = nodeCenter; // Start with center node selected
    });

    it('should select the first node (sorted by ID) if none is selected and nodes exist', () => {
        mockSpaceGraphInstance.selectedNode = null;
        // Create a temporary sorted list to find the expected first node
        const sortedNodes = [...mockSpaceGraphInstance.nodes.values()].sort((a,b) => a.id.localeCompare(b.id));
        const firstNode = sortedNodes[0];

        keyboardInputHandler._navigateNodesWithArrows('ArrowRight');

        expect(mockSpaceGraphInstance.setSelectedNode).toHaveBeenCalledWith(firstNode);
        expect(mockSpaceGraphInstance.focusOnNode).toHaveBeenCalledWith(firstNode, 0.3, true);
    });

    it('should navigate to the closest node in ArrowRight direction', () => {
        keyboardInputHandler._navigateNodesWithArrows('ArrowRight');
        expect(mockSpaceGraphInstance.setSelectedNode).toHaveBeenCalledWith(nodeRight);
        expect(mockSpaceGraphInstance.focusOnNode).toHaveBeenCalledWith(nodeRight, 0.3, true);
    });

    it('should navigate to the closest node in ArrowLeft direction', () => {
        keyboardInputHandler._navigateNodesWithArrows('ArrowLeft');
        expect(mockSpaceGraphInstance.setSelectedNode).toHaveBeenCalledWith(nodeLeft);
        expect(mockSpaceGraphInstance.focusOnNode).toHaveBeenCalledWith(nodeLeft, 0.3, true);
    });

    it('should navigate to the closest node in ArrowUp direction', () => {
        keyboardInputHandler._navigateNodesWithArrows('ArrowUp');
        expect(mockSpaceGraphInstance.setSelectedNode).toHaveBeenCalledWith(nodeUp);
        expect(mockSpaceGraphInstance.focusOnNode).toHaveBeenCalledWith(nodeUp, 0.3, true);
    });

    it('should navigate to the closest node in ArrowDown direction', () => {
        keyboardInputHandler._navigateNodesWithArrows('ArrowDown');
        expect(mockSpaceGraphInstance.setSelectedNode).toHaveBeenCalledWith(nodeDown);
        expect(mockSpaceGraphInstance.focusOnNode).toHaveBeenCalledWith(nodeDown, 0.3, true);
    });

    it('should navigate to a node slightly off-axis if it is the best candidate', () => {
        mockSpaceGraphInstance.selectedNode = nodeRight; // Start from 'right' node
        keyboardInputHandler._navigateNodesWithArrows('ArrowRight'); // Look further right
        expect(mockSpaceGraphInstance.setSelectedNode).toHaveBeenCalledWith(nodeFarRight);
        expect(mockSpaceGraphInstance.focusOnNode).toHaveBeenCalledWith(nodeFarRight, 0.3, true);
    });

    it('should not change selection if no suitable node is found in a direction', () => {
        mockSpaceGraphInstance.selectedNode = nodeFarRight; // Select the rightmost node
        mockSpaceGraphInstance.setSelectedNode.mockClear(); // Clear previous calls
        mockSpaceGraphInstance.focusOnNode.mockClear();

        keyboardInputHandler._navigateNodesWithArrows('ArrowRight'); // Try to go further right

        expect(mockSpaceGraphInstance.setSelectedNode).not.toHaveBeenCalled();
        expect(mockSpaceGraphInstance.focusOnNode).not.toHaveBeenCalled();
    });
});
