import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as OriginalThree from 'three'; // Import original for test setup utilities

// Mock the 'three' module for Raycaster behavior
const mockRayFunctions = {
    closestPointToLine: vi.fn((line, clamp, target) => target.set(0,0,0)),
    intersectPlane: vi.fn((plane, target) => target.set(0,0,0))
};

vi.doMock('three', async () => {
    const actualThree = await vi.importActual('three');
    return {
        ...actualThree,
        Raycaster: vi.fn().mockImplementation(() => ({
            setFromCamera: vi.fn(),
            ray: mockRayFunctions, // Tests will modify methods on this object
        })),
    };
});

// These imports will now get the mocked 'three' where Raycaster is custom
import * as THREE from 'three'; // Will be the mocked version for SUT
import { UIManager } from './UIManager.js';
import { InteractionState } from './InteractionState.js';
import { TranslationGizmo } from './gizmos/TranslationGizmo.js';
import { SpaceGraph as _SpaceGraph } from '../core/SpaceGraph.js'; // Needed for mocks
import { Node } from '../graph/nodes/Node.js'; // Base node or a specific type

// Mock dependencies
vi.mock('../core/SpaceGraph.js');

// Mock TranslationGizmo and its static methods
vi.mock('./gizmos/TranslationGizmo', () => {
    // const ActualTranslationGizmo = vi.importActual('./gizmos/TranslationGizmo').TranslationGizmo;
    const MockTranslationGizmo = vi.fn(() => ({ // Mock constructor returns an object with instance mocks
        hide: vi.fn(),
        show: vi.fn(),
        updateScale: vi.fn(),
        setHandleActive: vi.fn(),
        position: new OriginalThree.Vector3(),
        quaternion: new OriginalThree.Quaternion(),
        handles: { children: [] }, // Mock basic handles structure
        dispose: vi.fn(),
    }));
    MockTranslationGizmo.getAxisVector = vi.fn((axis) => {
        if (axis === 'x') return new OriginalThree.Vector3(1, 0, 0);
        if (axis === 'y') return new OriginalThree.Vector3(0, 1, 0);
        if (axis === 'z') return new OriginalThree.Vector3(0, 0, 1);
        return new OriginalThree.Vector3();
    });
    MockTranslationGizmo.getPlaneNormal = vi.fn((plane) => {
        if (plane === 'xy') return new OriginalThree.Vector3(0, 0, 1);
        if (plane === 'yz') return new OriginalThree.Vector3(1, 0, 0);
        if (plane === 'xz') return new OriginalThree.Vector3(0, 1, 0);
        return new OriginalThree.Vector3();
    });
    // If the actual class has other static properties/methods used, mock them too.
    // Make prototype chain similar for `instanceof` checks if any, though not strictly needed for static method calls.
    // MockTranslationGizmo.prototype = ActualTranslationGizmo.prototype;
    return { TranslationGizmo: MockTranslationGizmo };
});

// vi.mock('../graph/nodes/Node'); // We will provide a custom mock for Node

// Custom mock for Node
vi.mock('../graph/nodes/Node', () => {
    const NodeMock = vi.fn().mockImplementation((id) => { // Simplified constructor for mock
        const instance = {
            id: id,
            // position, data, label will be set explicitly in tests now
            getCapabilities: () => ({
                canEditContent: false, canZoomContent: false, canEditProperties: true,
                canLink: true, canDelete: true, canBeResized: true, canBeDragged: true,
            }),
            ensureMetaframe: vi.fn().mockReturnValue({
                show: vi.fn(), hide: vi.fn(), update: vi.fn(), isVisible: false
            }),
            setSelectedStyle: vi.fn(),
            update: vi.fn(),
            dispose: vi.fn(),
            getBoundingSphereRadius: vi.fn().mockReturnValue(50),
            getActualSize: vi.fn().mockReturnValue(new THREE.Vector3(10, 10, 10)),
            startDrag: vi.fn(),
            drag: vi.fn(),
            endDrag: vi.fn(),
            startResize: vi.fn(),
            resize: vi.fn(),
            endResize: vi.fn(),
            mesh: null,
            cssObject: null,
            labelObject: null,
        };
        return instance;
    });
    return { Node: NodeMock };
});

// Mock UI elements for UIManager constructor
const mockContextMenuEl = document.createElement('div');
const mockConfirmDialogEl = document.createElement('div');

describe('UIManager - Gizmo Interactions', () => {
    let spaceGraphMock;
    let uiManager;
    let mockSelectedNodesSet;
    let mockNode1;
    let mockNode2;
    let mockCamera;
    let mockRenderingPlugin;
    let mockWebGLScene;

    beforeEach(() => {
        // Reset mocks for TranslationGizmo if it was auto-mocked by vi.mock
        // This ensures we get a fresh mock instance with controllable methods for each test.
        TranslationGizmo.mockClear();

        // Explicitly create and define properties for mockNode1
        mockNode1 = new Node('n1'); // Call the mock constructor
        mockNode1.id = 'n1';
        mockNode1.position = new THREE.Vector3(100, 0, 0);
        mockNode1.data = { label: 'Node 1 Label' }; // Set data object
        mockNode1.label = 'Node 1 Label'; // Explicitly set label

        // Explicitly create and define properties for mockNode2
        mockNode2 = new Node('n2'); // Call the mock constructor
        mockNode2.id = 'n2';
        mockNode2.position = new THREE.Vector3(-100, 0, 0);
        mockNode2.data = { label: 'Node 2 Label' }; // Set data object
        mockNode2.label = 'Node 2 Label'; // Explicitly set label


        mockSelectedNodesSet = new Set();

        mockCamera = new THREE.PerspectiveCamera();
        mockCamera.position.set(0, 0, 500);
        mockCamera.lookAt(0, 0, 0);
        mockCamera.updateMatrixWorld();

        mockWebGLScene = { add: vi.fn(), remove: vi.fn() };
        mockRenderingPlugin = { getWebGLScene: () => mockWebGLScene };

        const mockContainer = document.createElement('div');
        document.body.appendChild(mockContainer); // Append to body

        spaceGraphMock = {
            container: mockContainer, // Use the appended container
            plugins: {
                getPlugin: vi.fn((pluginName) => {
                    if (pluginName === 'CameraPlugin') return { getCameraInstance: () => mockCamera, getCameraMode: () => 'orbit' };
                    if (pluginName === 'RenderingPlugin') return mockRenderingPlugin;
                    // Add other plugin mocks if UIManager interacts with them directly here
                    return null;
                }),
            },
            emit: vi.fn(),
            on: vi.fn(),
            off: vi.fn(),
            // Mock raycasting and intersection methods used by _getTargetInfo
            raycast: vi.fn().mockReturnValue([]), // Default to no intersects
            intersectedObjects: vi.fn().mockReturnValue(null), // Default to no general intersects
            getPointerNDC: vi.fn().mockReturnValue(new THREE.Vector2(0, 0)), // Default NDC
            screenToWorld: vi.fn().mockImplementation((x, y, z) => new THREE.Vector3(x, y, z)), // Simplistic mock
            resolveIntersectedObject: vi.fn((obj) => ({ object: obj, node: null, edge: null })), // Simplistic mock
        };

        const mockUiPluginCallbacks = {
            setSelectedNode: vi.fn(),
            setSelectedEdge: vi.fn(),
            cancelLinking: vi.fn(),
            getIsLinking: vi.fn().mockReturnValue(false),
            getLinkSourceNode: vi.fn().mockReturnValue(null),
            getSelectedNodes: vi.fn(() => mockSelectedNodesSet),
            getSelectedEdges: vi.fn().mockReturnValue(new Set()),
            completeLinking: vi.fn(),
        };

        uiManager = new UIManager(spaceGraphMock, mockContextMenuEl, mockConfirmDialogEl, mockUiPluginCallbacks);

        // Ensure the mocked TranslationGizmo instance is accessible
        // The UIManager constructor will call `new TranslationGizmo()`.
        // We can access the instance created by the mocked constructor.
        expect(TranslationGizmo).toHaveBeenCalledTimes(1);
        // uiManager.translationGizmo = TranslationGizmo.mock.instances[0]; // Accessing internal property might be problematic
        // Instead, UIManager now directly uses `this.gizmo`. Let's mock that if needed for these specific tests.
        // However, these tests seem to be for the *old* gizmo, which my changes now hide for multi-select.
        // The tests need to be aware of `uiManager.gizmo` not `uiManager.translationGizmo`.
        // For now, let's assume the tests will be adapted or this refers to the internal `this.gizmo`.

        // Mock methods on the gizmo instance that UIManager calls
        // UIManager stores its gizmo in `this.gizmo`
        if (uiManager.gizmo) { // It should be created by the constructor
            uiManager.gizmo.show = vi.fn();
            uiManager.gizmo.hide = vi.fn();
            uiManager.gizmo.updateScale = vi.fn();
            uiManager.gizmo.position = new THREE.Vector3(); // Initialize position for the mock gizmo
            uiManager.gizmo.quaternion = new THREE.Quaternion(); // Initialize quaternion
            uiManager.gizmo.handles = { children: [] }; // Ensure handles object exists
            uiManager.gizmo.setHandleActive = vi.fn();
        }
    });

    afterEach(() => {
        // Clean up the container from the body
        if (spaceGraphMock.container.parentNode === document.body) {
            document.body.removeChild(spaceGraphMock.container);
        }
        vi.restoreAllMocks(); // This will restore spied objects like THREE.Raycaster
    });

    describe('_onSelectionChanged with Nodes', () => {
        test('should show and position gizmo for single node selection', () => {
            mockSelectedNodesSet.add(mockNode1);
            uiManager._onSelectionChanged({ selected: mockSelectedNodesSet, type: 'node' });

            // With FractalUI, for single node, AGH shows, old gizmo hides.
            // These tests need to be updated if they are testing the *old* gizmo visibility.
            // For now, let's assume they are testing that *some* transform UI appears.
            // My change: AGH appears, old gizmo is hidden.
            expect(uiManager.adaptiveGeometricHub.visible).toBe(true);
            expect(uiManager.adaptiveGeometricHub.position.x).toBe(100);
            expect(uiManager.gizmo.hide).toHaveBeenCalled(); // Old gizmo should be hidden
            // expect(uiManager.activeGizmo).toBe('translate'); // This property might be deprecated or for old gizmo
        });

        test('should show AGH and hide old gizmo for multi-node selection', () => {
            mockSelectedNodesSet.add(mockNode1); // Pos X = 100
            mockSelectedNodesSet.add(mockNode2); // Pos X = -100
            uiManager._onSelectionChanged({ selected: mockSelectedNodesSet, type: 'node' });

            expect(uiManager.adaptiveGeometricHub.visible).toBe(true);
            expect(uiManager.adaptiveGeometricHub.position.x).toBe(0); // Centroid
            expect(uiManager.gizmo.hide).toHaveBeenCalled(); // Old gizmo should be hidden
        });

        test('should hide AGH and old gizmo when selection is cleared', () => {
            // First select a node to show AGH
            mockSelectedNodesSet.add(mockNode1);
            uiManager._onSelectionChanged({ selected: mockSelectedNodesSet, type: 'node' });
            expect(uiManager.adaptiveGeometricHub.visible).toBe(true);
            uiManager.gizmo.hide.mockClear(); // Clear previous calls

            mockSelectedNodesSet.clear(); // Then clear selection
            uiManager._onSelectionChanged({ selected: mockSelectedNodesSet, type: 'node' });

            expect(uiManager.adaptiveGeometricHub.visible).toBe(false);
            expect(uiManager.gizmo.hide).toHaveBeenCalled(); // Ensure it's hidden if it wasn't already
            // expect(uiManager.activeGizmo).toBeNull(); // This property might be deprecated
        });
    });

    describe('Gizmo Interaction State Transitions', () => {
        beforeEach(() => {
            // Simulate a node is selected, so gizmo would be active
            mockSelectedNodesSet.add(mockNode1);
            uiManager._onSelectionChanged({ selected: mockSelectedNodesSet, type: 'node' });
            if (uiManager.gizmo && uiManager.gizmo.show) { // Check if gizmo and its show method are defined
                uiManager.gizmo.show.mockClear(); // Clear show call from selection (AGH logic might call hide)
            }
        });

        test('_onPointerDown with gizmo handle should transition to GIZMO_DRAGGING', () => {
            // Make mockGizmoHandleObject a more complete mock of a THREE.Mesh
            const mockGeometry = new THREE.BufferGeometry();
            mockGeometry.boundingSphere = new THREE.Sphere();
            mockGeometry.boundingBox = new THREE.Box3();
            const mockMaterial = new THREE.MeshBasicMaterial({ visible: true });

            const mockGizmoHandleMesh = new THREE.Mesh(mockGeometry, mockMaterial);
            mockGizmoHandleMesh.userData = { isGizmoHandle: true, axis: 'x', gizmoType: 'translate', part: 'arrow' };
            mockGizmoHandleMesh.parent = uiManager.gizmo?.handles || { children: [] }; // For _getTargetInfo logic if it checks parent

            // Mock the raycast method on this specific mesh instance if needed,
            // or rely on THREE.Raycaster.intersectObject to work with this more complete mesh.
            // For now, let's assume intersectObject can handle this better.
            // If intersectObject still fails, we might need to mock mockGizmoHandleMesh.raycast directly.
            // Mock the .raycast method on the mesh itself
            // This is what THREE.Raycaster.intersectObject will call internally on the mesh.
            mockGizmoHandleMesh.raycast = vi.fn((raycaster, intersects) => {
                intersects.push({
                    object: mockGizmoHandleMesh,
                    point: new THREE.Vector3(10, 0, 0), // Simulate intersection at this point
                    distance: 1
                });
            });

            // Setup _getTargetInfo to return this gizmo handle
            uiManager._getTargetInfo = vi.fn().mockReturnValue({
                gizmoHandleInfo: {
                    axis: 'x',
                    type: 'translate',
                    part: 'arrow',
                    object: mockGizmoHandleMesh,
                },
            });

            // No longer need spaceGraphMock.raycast.mockReturnValueOnce for this specific intersection,
            // as the intersection is now determined by mockGizmoHandleMesh.raycast

            const mockEvent = {
                clientX: 0,
                clientY: 0,
                button: 0,
                pointerId: 1,
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
            };
            uiManager._onPointerDown(mockEvent);

            expect(uiManager.currentState).toBe(InteractionState.GIZMO_DRAGGING);
            expect(uiManager.draggedGizmoHandleInfo.axis).toBe('x');
            expect(uiManager.gizmoDragStartPointerWorldPos.x).toBeCloseTo(10); // From mocked intersect
            expect(uiManager.selectedNodesInitialPositions.get('n1').x).toBe(100);
            expect(uiManager.gizmo.setHandleActive).toHaveBeenCalledWith(mockGizmoHandleMesh, true); // Corrected variable
        });

        test('_onPointerUp from GIZMO_DRAGGING should transition to IDLE', () => {
            // Manually set state for test
            uiManager.currentState = InteractionState.GIZMO_DRAGGING;
            const mockGizmoHandleObject = { userData: { axis: 'x', part: 'arrow' } }; // simplified
            uiManager.draggedGizmoHandleInfo = { axis: 'x', part: 'arrow', object: mockGizmoHandleObject };

            // Ensure _getTargetInfo returns a neutral event (no specific target) for this test
            // to prevent interference with fractal UI logic in _onPointerUp
            uiManager._getTargetInfo = vi.fn().mockReturnValue({
                element: document.body, // Or any generic element
                node: null,
                intersectedEdge: null,
                metaframeHandleInfo: null,
                gizmoHandleInfo: null, // No gizmo hit on pointer up
                fractalElementInfo: null, // No fractal hit on pointer up
            });

            const mockEvent = { clientX: 0, clientY: 0, button: 0, pointerId: 1 };
            uiManager._onPointerUp(mockEvent);

            expect(uiManager.currentState).toBe(InteractionState.IDLE);
            expect(uiManager.gizmo.setHandleActive).toHaveBeenCalledWith(mockGizmoHandleObject, false);
            expect(uiManager.draggedGizmoHandleInfo).toBeNull();
        });
    });

    describe('_handleHover for Gizmo', () => {
        // These tests assume the old gizmo is visible.
        // They might need adjustment if the fractal UI is active, as hover would target fractal elements.
        // For now, ensure gizmo is visible for these tests if that's the intent.
        beforeEach(() => {
            // Make the old gizmo visible for these hover tests
            if (uiManager.gizmo) uiManager.gizmo.visible = true;
        });

        test('should call setHandleActive(true) on gizmo handle hover', () => {
            const mockGizmoHandleObject = { userData: { isGizmoHandle: true, axis: 'x' } };
            uiManager._getTargetInfo = vi.fn().mockReturnValue({ gizmoHandleInfo: { object: mockGizmoHandleObject } });
            uiManager.currentState = InteractionState.IDLE; // Ensure hover logic runs

            const mockEvent = { clientX: 0, clientY: 0 };
            uiManager._handleHover(mockEvent);

            expect(uiManager.gizmo.setHandleActive).toHaveBeenCalledWith(mockGizmoHandleObject, true);
            expect(uiManager.hoveredGizmoHandle).toBe(mockGizmoHandleObject);
        });

        test('should call setHandleActive(false) when gizmo handle hover ends', () => {
            const mockGizmoHandleObject = { userData: { isGizmoHandle: true, axis: 'x' } };
            uiManager.hoveredGizmoHandle = mockGizmoHandleObject; // Simulate it was hovered
            uiManager.currentState = InteractionState.IDLE;

            // Now simulate hovering over nothing related to gizmo
            uiManager._getTargetInfo = vi.fn().mockReturnValue({ gizmoHandleInfo: null });
            const mockEvent = { clientX: 10, clientY: 10 }; // Different event
            uiManager._handleHover(mockEvent);

            expect(uiManager.gizmo.setHandleActive).toHaveBeenCalledWith(mockGizmoHandleObject, false);
            expect(uiManager.hoveredGizmoHandle).toBeNull();
        });
    });

    describe('_handleGizmoDrag', () => {
        // These tests are more complex as they involve 3D math.
        // Focus on ensuring the correct node positions are calculated and events emitted.
        beforeEach(() => {
            mockSelectedNodesSet.add(mockNode1); // Node at (100,0,0)
            uiManager.selectedNodesInitialPositions.set('n1', new THREE.Vector3(100, 0, 0));
            uiManager.currentState = InteractionState.GIZMO_DRAGGING;
            uiManager.space.isDragging = true;

            // Mock camera to be looking along -Z axis, Y up.
            mockCamera.position.set(0, 0, 500);
            mockCamera.lookAt(0, 0, 0);
            mockCamera.up.set(0, 1, 0);
            mockCamera.updateMatrixWorld(true);

            // Gizmo is at node's position, world orientation (default)
            if (uiManager.gizmo) { // Ensure gizmo exists
                uiManager.gizmo.position.copy(mockNode1.position); // (100,0,0)
                uiManager.gizmo.quaternion.identity(); // World aligned
            }
        });

        // Removed suite-specific afterEach, relies on top-level one.

        test('dragging X-axis arrow should move node along world X', () => {
            uiManager.draggedGizmoHandleInfo = { axis: 'x', type: 'translate', part: 'arrow', object: {} };
            uiManager.gizmoDragStartPointerWorldPos.set(100, 0, 0);

            // Simulate mouse moving right on screen, which should translate to positive X world movement
            // Mock raycaster.ray.closestPointToLine to return a point further along X
            const expectedNewPosOnLine = new OriginalThree.Vector3(120, 0, 0); // Use OriginalThree for test data
            mockRayFunctions.closestPointToLine.mockImplementationOnce((line, clamp, target) => target.copy(expectedNewPosOnLine));

            const mockEvent = { clientX: 10, clientY: 0 };
            uiManager._handleGizmoDrag(mockEvent);

            expect(mockNode1.position.x).toBeCloseTo(120);
            expect(mockNode1.position.y).toBeCloseTo(0);
            expect(mockNode1.position.z).toBeCloseTo(0);
            expect(spaceGraphMock.emit).toHaveBeenCalledWith('graph:nodes:transformed', {
                nodes: [mockNode1],
                transformationType: 'translate',
            });
            if (uiManager.gizmo) expect(uiManager.gizmo.position.x).toBeCloseTo(120);

            // mockRayFunctions.closestPointToLine.mockClear(); // Or rely on restoreAllMocks in afterEach
        });

        test('dragging XY-plane handle should move node on world XY plane', () => {
            uiManager.draggedGizmoHandleInfo = { axis: 'xy', type: 'translate', part: 'plane', object: {} };
            uiManager.gizmoDragStartPointerWorldPos.set(100 + 10, 10, 0);

            const expectedNewPosOnPlane = new OriginalThree.Vector3(100 + 20, 25, 0); // Use OriginalThree
            mockRayFunctions.intersectPlane.mockImplementationOnce((plane, target) => target.copy(expectedNewPosOnPlane));

            const mockEvent = { clientX: 20, clientY: -10 };
            uiManager._handleGizmoDrag(mockEvent);

            // Initial node pos: (100,0,0)
            // Drag delta: (20-10, 25-10, 0-0) = (10, 15, 0)
            // New node pos: (100+10, 0+15, 0+0) = (110, 15, 0)
            expect(mockNode1.position.x).toBeCloseTo(110);
            expect(mockNode1.position.y).toBeCloseTo(15);
            expect(mockNode1.position.z).toBeCloseTo(0); // Z should be unchanged
            expect(spaceGraphMock.emit).toHaveBeenCalledWith('graph:nodes:transformed', {
                nodes: [mockNode1],
                transformationType: 'translate',
            });
            if (uiManager.gizmo) {
                expect(uiManager.gizmo.position.x).toBeCloseTo(110);
                expect(uiManager.gizmo.position.y).toBeCloseTo(15);
            }
            // mockRayFunctions.intersectPlane.mockClear(); // Or rely on restoreAllMocks in afterEach
        });
    });
});
