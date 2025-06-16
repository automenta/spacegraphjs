// tests/ui/PointerInputHandler.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PointerInputHandler } from '../../js/ui/PointerInputHandler.js'; // Adjust path if needed
import { SpaceGraph, BaseNode, HtmlNodeElement, Edge } from '../../spacegraph.js'; // For mocks and types
import * as THREE from 'three'; // For THREE.Vector3 etc.

// Mock SpaceGraph and UIManager facade
vi.mock('../../spacegraph.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        SpaceGraph: vi.fn().mockImplementation(() => ({
            container: document.createElement('div'),
            nodes: new Map(),
            edges: new Map(),
            selectedNode: null,
            selectedEdge: null,
            isLinking: false, // This state will be managed by LinkingManager via UIManager
            linkSourceNode: null, // Managed by LinkingManager
            cameraController: {
                startPan: vi.fn(),
                endPan: vi.fn(),
                isPanning: false,
            },
            intersectedObject: vi.fn().mockReturnValue(null),
            screenToWorld: vi.fn().mockImplementation((x, y, z) => new THREE.Vector3(x, y, z)),
            addNode: vi.fn(),
            removeNode: vi.fn(),
            addEdge: vi.fn(),
            removeEdge: vi.fn(),
            setSelectedNode: vi.fn((node) => {
                mockSpaceGraphInstance.selectedNode = node;
            }),
            setSelectedEdge: vi.fn((edge) => {
                mockSpaceGraphInstance.selectedEdge = edge;
            }),
            _emit: vi.fn(), // For events if PointerInputHandler emits them directly (unlikely)
        })),
        // Mock node types as needed for _getTargetInfo
        BaseNode: actual.BaseNode, // Use actual for instanceof
        HtmlNodeElement: actual.HtmlNodeElement, // Use actual for instanceof
        Edge: actual.Edge, // Use actual for instanceof
    };
});

const mockUIManagerFacade = {
    getDomElement: vi.fn(),
    getTargetInfoForWheel: vi.fn(),
    getTargetInfoForMenu: vi.fn(),
    getTargetInfoForLink: vi.fn(),
    showConfirmDialog: vi.fn(),
    showStatus: vi.fn(),
    hideContextMenu: vi.fn(),
    handleNodeControlButtonClick: vi.fn(),
    handleEdgeHover: vi.fn(),
    handleEscape: vi.fn(),
    linkingManager: { // Mock linking manager interactions
        startLinking: vi.fn(),
        updateTempLinkLine: vi.fn(),
        updateLinkingTargetHighlight: vi.fn(),
        completeLinking: vi.fn(),
        cancelLinking: vi.fn(),
        isLinking: vi.fn().mockReturnValue(false),
        clearLinkingTargetHighlight: vi.fn(),
    },
    // Add other managers if PointerInputHandler interacts with them
};

let mockSpaceGraphInstance;
let pointerInputHandler;
let mockContainerElement;

beforeEach(() => {
    // Create a fresh mock SpaceGraph for each test to avoid state leakage
    // Access the class from the mocked module
    const MockedSpaceGraph = vi.mocked(SpaceGraph);
    mockSpaceGraphInstance = new MockedSpaceGraph();

    mockContainerElement = mockSpaceGraphInstance.container; // Use the one from mock
    document.body.appendChild(mockContainerElement);

    pointerInputHandler = new PointerInputHandler(mockSpaceGraphInstance, mockUIManagerFacade);
    pointerInputHandler.bindEvents(); // Bind events to the mock container
});

afterEach(() => {
    pointerInputHandler.dispose();
    mockContainerElement.remove();
    vi.clearAllMocks(); // Clear mocks history
});

describe('PointerInputHandler Initialization', () => {
    it('should instantiate correctly', () => {
        expect(pointerInputHandler).toBeInstanceOf(PointerInputHandler);
        expect(pointerInputHandler.spaceGraph).toBe(mockSpaceGraphInstance);
        expect(pointerInputHandler.uiManager).toBe(mockUIManagerFacade);
    });

    it('should bind pointer events on bindEvents()', () => {
        const addEventSpy = vi.spyOn(mockContainerElement, 'addEventListener');
        const windowAddEventSpy = vi.spyOn(window, 'addEventListener');

        // Events are bound in beforeEach, so we check spies after that.
        // Re-calling bindEvents() is not necessary unless testing re-binding logic.

        expect(addEventSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), false);
        // Check window listeners by accessing the spies created by vi.spyOn
        // Need to ensure these spies are active when bindEvents was called (i.e. in beforeEach)
        // For this test, it's simpler to check after construction as in the plan.
        // The current setup in beforeEach already calls bindEvents.

        // To check window listeners specifically for THIS instance, it's tricky as they are global.
        // The check here verifies that addEventListener on window was called with correct args during setup.
        expect(windowAddEventSpy).toHaveBeenCalledWith('pointermove', expect.any(Function), false);
        expect(windowAddEventSpy).toHaveBeenCalledWith('pointerup', expect.any(Function), false);

        addEventSpy.mockRestore();
        windowAddEventSpy.mockRestore();
    });
});

describe('_updatePointerState', () => {
    it('should update pointerState on pointer down', () => {
        const mockEvent = { button: 0, clientX: 10, clientY: 20 };
        pointerInputHandler._updatePointerState(mockEvent, true);
        expect(pointerInputHandler.pointerState.down).toBe(true);
        expect(pointerInputHandler.pointerState.primary).toBe(true);
        expect(pointerInputHandler.pointerState.potentialClick).toBe(true);
        expect(pointerInputHandler.pointerState.startPos).toEqual({ x: 10, y: 20 });
        expect(pointerInputHandler.pointerState.lastPos).toEqual({ x: 10, y: 20 });
    });

    it('should update pointerState on pointer up', () => {
        const mockEvent = { button: 0, clientX: 10, clientY: 20 };
        pointerInputHandler._updatePointerState(mockEvent, false); // isDown = false
        expect(pointerInputHandler.pointerState.down).toBe(false);
        expect(pointerInputHandler.pointerState.primary).toBe(false);
    });
});

describe('handlePointerDown', () => {
    it('should start camera pan on background primary click', () => {
        const mockEvent = { button: 0, clientX: 50, clientY: 50, preventDefault: vi.fn(), stopPropagation: vi.fn() };
        // Ensure _getTargetInfo (called by handlePointerDown) returns no node/edge
        vi.spyOn(pointerInputHandler, '_getTargetInfo').mockReturnValue({
            node: null, intersectedEdge: null,
            element: mockContainerElement, // Simulate click on container itself
        });

        pointerInputHandler.handlePointerDown(mockEvent);

        expect(mockSpaceGraphInstance.cameraController.startPan).toHaveBeenCalledWith(mockEvent);
        expect(mockUIManagerFacade.hideContextMenu).toHaveBeenCalled();
    });

    // Add more tests for handlePointerDown:
    // - Clicking on a node to start drag
    // - Clicking on a port to start linking (verify linkingManager.startLinking is called)
    // - Clicking on resize handle
    // - Clicking on node control button (verify uiManager.handleNodeControlButtonClick)
    // - Clicking on an edge
});

describe('handlePointerMove', () => {
    it('should pan camera if panning state is active', () => {
        pointerInputHandler.pointerState.primary = true; // Simulate primary button down
        mockSpaceGraphInstance.cameraController.isPanning = true; // Simulate panning active
        const mockEvent = { clientX: 60, clientY: 70, preventDefault: vi.fn() };

        // Simulate lastPos for delta calculation
        pointerInputHandler.pointerState.lastPos = { x: 50, y: 50 };

        pointerInputHandler.handlePointerMove(mockEvent);

        expect(mockSpaceGraphInstance.cameraController.pan).toHaveBeenCalledWith(mockEvent);
    });

    // Add more tests for handlePointerMove:
    // - Dragging a node
    // - Resizing a node
    // - Updating temp link line during linking (verify linkingManager.updateTempLinkLine)
    // - Edge hover (verify uiManager.handleEdgeHover)
});

describe('handlePointerUp', () => {
    it('should end camera pan on pointer up if panning', () => {
        mockSpaceGraphInstance.cameraController.isPanning = true; // Simulate panning was active
        const mockEvent = { button: 0 }; // Mock a primary button up event

        pointerInputHandler.handlePointerUp(mockEvent);

        expect(mockSpaceGraphInstance.cameraController.endPan).toHaveBeenCalled();
    });

    // Add more tests for handlePointerUp:
    // - Ending node drag
    // - Ending node resize
    // - Completing a link (verify linkingManager.completeLinking)
    // - Handling simple clicks for selection/deselection
});

// More tests for _getTargetInfo would be good, but it's complex due to DOM interactions.
// Focus on testing its effects through the handlePointerDown/Move/Up methods.
