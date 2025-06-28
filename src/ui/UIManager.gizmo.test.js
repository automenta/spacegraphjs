import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { UIManager } from './UIManager';
import { InteractionState } from './InteractionState';
import { TranslationGizmo } from './gizmos/TranslationGizmo';
import { SpaceGraph } from '../core/SpaceGraph'; // Needed for mocks
import { Node } from '../graph/nodes/Node'; // Base node or a specific type

// Mock dependencies
vi.mock('../core/SpaceGraph');
vi.mock('./gizmos/TranslationGizmo');
vi.mock('../graph/nodes/Node');

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


        mockNode1 = new Node('n1', { x: 100, y: 0, z: 0 }, {});
        mockNode1.position = new THREE.Vector3(100, 0, 0);
        mockNode1.id = 'n1';

        mockNode2 = new Node('n2', { x: -100, y: 0, z: 0 }, {});
        mockNode2.position = new THREE.Vector3(-100, 0, 0);
        mockNode2.id = 'n2';

        mockSelectedNodesSet = new Set();

        mockCamera = new THREE.PerspectiveCamera();
        mockCamera.position.set(0,0,500);
        mockCamera.lookAt(0,0,0);
        mockCamera.updateMatrixWorld();


        mockWebGLScene = { add: vi.fn(), remove: vi.fn() };
        mockRenderingPlugin = { getWebGLScene: () => mockWebGLScene };

        spaceGraphMock = {
            container: document.createElement('div'),
            plugins: {
                getPlugin: vi.fn(pluginName => {
                    if (pluginName === 'CameraPlugin') return { getCameraInstance: () => mockCamera };
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
            getPointerNDC: vi.fn().mockReturnValue(new THREE.Vector2(0,0)), // Default NDC
            screenToWorld: vi.fn().mockImplementation((x,y,z) => new THREE.Vector3(x,y,z)), // Simplistic mock
            resolveIntersectedObject: vi.fn(obj => ({object: obj, node: null, edge: null})) // Simplistic mock
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
        uiManager.translationGizmo = TranslationGizmo.mock.instances[0];

        // Mock methods on the gizmo instance that UIManager calls
        uiManager.translationGizmo.show = vi.fn();
        uiManager.translationGizmo.hide = vi.fn();
        uiManager.translationGizmo.updateScale = vi.fn();
        uiManager.translationGizmo.position = new THREE.Vector3(); // Mock position
        uiManager.translationGizmo.handles = { children: [] }; // Mock handles for raycasting checks
        uiManager.translationGizmo.setHandleActive = vi.fn();
        uiManager.translationGizmo.resetHandlesState = vi.fn();


    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('_onSelectionChanged with Nodes', () => {
        test('should show and position gizmo for single node selection', () => {
            mockSelectedNodesSet.add(mockNode1);
            uiManager._onSelectionChanged({ selected: mockSelectedNodesSet, type: 'node' });

            expect(uiManager.translationGizmo.show).toHaveBeenCalled();
            expect(uiManager.translationGizmo.position.x).toBe(100);
            expect(uiManager.translationGizmo.updateScale).toHaveBeenCalledWith(mockCamera);
            expect(uiManager.activeGizmo).toBe('translate');
        });

        test('should show and position gizmo at average for multi-node selection', () => {
            mockSelectedNodesSet.add(mockNode1); // Pos X = 100
            mockSelectedNodesSet.add(mockNode2); // Pos X = -100
            uiManager._onSelectionChanged({ selected: mockSelectedNodesSet, type: 'node' });

            expect(uiManager.translationGizmo.show).toHaveBeenCalled();
            expect(uiManager.translationGizmo.position.x).toBe(0); // Average of 100 and -100
            expect(uiManager.translationGizmo.updateScale).toHaveBeenCalledWith(mockCamera);
            expect(uiManager.activeGizmo).toBe('translate');
        });

        test('should hide gizmo when selection is cleared', () => {
            // First select a node to show it
            mockSelectedNodesSet.add(mockNode1);
            uiManager._onSelectionChanged({ selected: mockSelectedNodesSet, type: 'node' });
            expect(uiManager.translationGizmo.show).toHaveBeenCalledTimes(1);

            mockSelectedNodesSet.clear(); // Then clear selection
            uiManager._onSelectionChanged({ selected: mockSelectedNodesSet, type: 'node' });

            expect(uiManager.translationGizmo.hide).toHaveBeenCalled();
            expect(uiManager.activeGizmo).toBeNull();
        });
    });

    describe('Gizmo Interaction State Transitions', () => {
        beforeEach(() => {
            // Simulate a node is selected, so gizmo would be active
            mockSelectedNodesSet.add(mockNode1);
            uiManager._onSelectionChanged({ selected: mockSelectedNodesSet, type: 'node' }); // This shows gizmo
            uiManager.translationGizmo.show.mockClear(); // Clear show call from selection
        });

        test('_onPointerDown with gizmo handle should transition to GIZMO_DRAGGING', () => {
            const mockGizmoHandleObject = {
                userData: { isGizmoHandle: true, axis: 'x', gizmoType: 'translate', part: 'arrow' },
                parent: uiManager.translationGizmo.handles // Simulate it's a child of gizmo.handles
            };
            // Setup _getTargetInfo to return this gizmo handle
            uiManager._getTargetInfo = vi.fn().mockReturnValue({ gizmoHandleInfo: {
                axis: 'x', type: 'translate', part: 'arrow', object: mockGizmoHandleObject
            }});

            // Simulate raycaster intersecting the handle mesh directly for initialPointerWorldPos
            spaceGraphMock.raycast.mockReturnValueOnce([{ object: mockGizmoHandleObject, point: new THREE.Vector3(10,0,0), distance: 1 }]);


            const mockEvent = { clientX: 0, clientY: 0, button: 0, pointerId: 1, preventDefault: vi.fn(), stopPropagation: vi.fn() };
            uiManager._onPointerDown(mockEvent);

            expect(uiManager.currentState).toBe(InteractionState.GIZMO_DRAGGING);
            expect(uiManager.draggedGizmoHandleInfo.axis).toBe('x');
            expect(uiManager.gizmoDragStartPointerWorldPos.x).toBeCloseTo(10); // From mocked intersect
            expect(uiManager.selectedNodesInitialPositions.get('n1').x).toBe(100);
            expect(uiManager.translationGizmo.setHandleActive).toHaveBeenCalledWith(mockGizmoHandleObject, true);
        });

        test('_onPointerUp from GIZMO_DRAGGING should transition to IDLE', () => {
            // Manually set state for test
            uiManager.currentState = InteractionState.GIZMO_DRAGGING;
            const mockGizmoHandleObject = { userData: { axis: 'x', part: 'arrow' }}; // simplified
            uiManager.draggedGizmoHandleInfo = { axis: 'x', part: 'arrow', object: mockGizmoHandleObject };

            const mockEvent = { clientX: 0, clientY: 0, button: 0, pointerId: 1 };
            uiManager._onPointerUp(mockEvent);

            expect(uiManager.currentState).toBe(InteractionState.IDLE);
            expect(uiManager.translationGizmo.setHandleActive).toHaveBeenCalledWith(mockGizmoHandleObject, false);
            expect(uiManager.draggedGizmoHandleInfo).toBeNull();
        });
    });

    describe('_handleHover for Gizmo', () => {
        test('should call setHandleActive(true) on gizmo handle hover', () => {
            const mockGizmoHandleObject = { userData: { isGizmoHandle: true, axis: 'x' } };
            uiManager._getTargetInfo = vi.fn().mockReturnValue({ gizmoHandleInfo: { object: mockGizmoHandleObject } });
            uiManager.currentState = InteractionState.IDLE; // Ensure hover logic runs

            const mockEvent = { clientX: 0, clientY: 0 };
            uiManager._handleHover(mockEvent);

            expect(uiManager.translationGizmo.setHandleActive).toHaveBeenCalledWith(mockGizmoHandleObject, true);
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

            expect(uiManager.translationGizmo.setHandleActive).toHaveBeenCalledWith(mockGizmoHandleObject, false);
            expect(uiManager.hoveredGizmoHandle).toBeNull();
        });
    });

    describe('_handleGizmoDrag', () => {
        // These tests are more complex as they involve 3D math.
        // Focus on ensuring the correct node positions are calculated and events emitted.
        beforeEach(() => {
            mockSelectedNodesSet.add(mockNode1); // Node at (100,0,0)
            uiManager.selectedNodesInitialPositions.set('n1', new THREE.Vector3(100,0,0));
            uiManager.currentState = InteractionState.GIZMO_DRAGGING;
            uiManager.space.isDragging = true;

            // Mock camera to be looking along -Z axis, Y up.
            mockCamera.position.set(0,0,500);
            mockCamera.lookAt(0,0,0);
            mockCamera.up.set(0,1,0);
            mockCamera.updateMatrixWorld(true);

            // Gizmo is at node's position, world orientation (default)
            uiManager.translationGizmo.position.copy(mockNode1.position); // (100,0,0)
            uiManager.translationGizmo.quaternion.identity(); // World aligned
        });

        test('dragging X-axis arrow should move node along world X', () => {
            uiManager.draggedGizmoHandleInfo = { axis: 'x', type: 'translate', part: 'arrow', object: {} };
            uiManager.gizmoDragStartPointerWorldPos.set(100, 0, 0); // Initial click on the gizmo's X arrow tip (relative to gizmo origin)

            // Simulate mouse moving right on screen, which should translate to positive X world movement
            // Mock raycaster.ray.closestPointToLine to return a point further along X
            const expectedNewPosOnLine = new THREE.Vector3(120, 0, 0);
            // Note: closestPointToLine calculation is complex. Here we directly mock its *output*.
            const mockRay = { closestPointToLine: vi.fn((line, clamp, target) => target.copy(expectedNewPosOnLine)) };
            spaceGraphMock.raycast.mockImplementationOnce(() => ({ // This is for _getTargetInfo, not relevant here
                intersectObject: () => []
            }));
            // We need to mock the raycaster used *inside* _handleGizmoDrag
            const tempRaycaster = new THREE.Raycaster();
            tempRaycaster.ray = mockRay; // Override the ray property
            vi.spyOn(THREE, 'Raycaster').mockImplementation(() => tempRaycaster);


            const mockEvent = { clientX: 10, clientY: 0 }; // Screen movement doesn't directly map here, result of projection is key
            uiManager._handleGizmoDrag(mockEvent);

            expect(mockNode1.position.x).toBeCloseTo(120); // 100 (initial) + (120-100 from delta)
            expect(mockNode1.position.y).toBeCloseTo(0);
            expect(mockNode1.position.z).toBeCloseTo(0);
            expect(spaceGraphMock.emit).toHaveBeenCalledWith('graph:nodes:transformed',
                { nodes: [mockNode1], transformationType: 'translate' }
            );
            // Gizmo should follow the node
            expect(uiManager.translationGizmo.position.x).toBeCloseTo(120);

            // Restore Raycaster mock
            vi.spyOn(THREE, 'Raycaster').mockRestore();
        });

        test('dragging XY-plane handle should move node on world XY plane', () => {
            uiManager.draggedGizmoHandleInfo = { axis: 'xy', type: 'translate', part: 'plane', object: {} };
            uiManager.gizmoDragStartPointerWorldPos.set(100 + 10, 10, 0); // Click on XY plane handle part

            // Simulate mouse moving to a new point on the XY plane
            const expectedNewPosOnPlane = new THREE.Vector3(100 + 20, 25, 0);
            const mockRay = { intersectPlane: vi.fn((plane, target) => target.copy(expectedNewPosOnPlane)) };
            const tempRaycaster = new THREE.Raycaster();
            tempRaycaster.ray = mockRay;
            vi.spyOn(THREE, 'Raycaster').mockImplementation(() => tempRaycaster);

            const mockEvent = { clientX: 20, clientY: -10 };
            uiManager._handleGizmoDrag(mockEvent);

            // Initial node pos: (100,0,0)
            // Drag delta: (20-10, 25-10, 0-0) = (10, 15, 0)
            // New node pos: (100+10, 0+15, 0+0) = (110, 15, 0)
            expect(mockNode1.position.x).toBeCloseTo(110);
            expect(mockNode1.position.y).toBeCloseTo(15);
            expect(mockNode1.position.z).toBeCloseTo(0); // Z should be unchanged
            expect(spaceGraphMock.emit).toHaveBeenCalledWith('graph:nodes:transformed',
                { nodes: [mockNode1], transformationType: 'translate' }
            );
            expect(uiManager.translationGizmo.position.x).toBeCloseTo(110);
            expect(uiManager.translationGizmo.position.y).toBeCloseTo(15);

            vi.spyOn(THREE, 'Raycaster').mockRestore();
        });
    });
});
