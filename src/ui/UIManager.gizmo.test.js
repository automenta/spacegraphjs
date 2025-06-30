import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { UIManager } from '../UIManager.js';
// eslint-disable-next-line import/no-unresolved
import { SpaceGraph } from '../../core/SpaceGraph.js';
// eslint-disable-next-line import/no-unresolved
import { Node } from '../../graph/nodes/Node.js';
import { TranslationGizmo } from './gizmos/TranslationGizmo.js';
import { InteractionState } from './InteractionState.js';

// Mock dependencies

vi.mock('../../core/SpaceGraph.js');
vi.mock('../InteractionState.js'); // Assuming this is a simple enum or constants object
vi.mock('./gizmos/TranslationGizmo.js');

vi.mock('../../graph/nodes/Node.js');

describe('UIManager - Gizmo Interactions', () => {
    let spaceGraph;
    let uiManager;
    let mockCamera;
    let mockWebGLScene;
    let mockSelectedNodesSet;

    beforeEach(() => {
        // Reset mocks for each test
        vi.clearAllMocks();

        mockCamera = new THREE.PerspectiveCamera();
        mockWebGLScene = {
            add: vi.fn(),
            remove: vi.fn(),
        };
        mockSelectedNodesSet = new Set();

        // Mock SpaceGraph instance and its methods
        SpaceGraph.mockImplementation(() => ({
            container: document.createElement('div'),
            plugins: {
                getPlugin: vi.fn((pluginName) => {
                    if (pluginName === 'RenderingPlugin') {
                        return { getWebGLScene: () => mockWebGLScene };
                    }
                    if (pluginName === 'CameraPlugin') {
                        return {
                            getCameraInstance: () => mockCamera,
                            getCameraMode: () => 'orbit',
                            getControls: () => ({ isPointerLocked: false }),
                        };
                    }
                    return null;
                }),
            },
            on: vi.fn(),
            off: vi.fn(),
            emit: vi.fn(),
            getPointerNDC: vi.fn().mockReturnValue(new THREE.Vector2(0, 0)), // Default NDC
            intersectedObjects: vi.fn(), // For general intersections
        }));

        spaceGraph = new SpaceGraph(); // Create a mocked instance

        // Mock UIPlugin callbacks
        const mockUiPluginCallbacks = {
            setSelectedNode: vi.fn(),
            setSelectedEdge: vi.fn(),
            cancelLinking: vi.fn(),
            getIsLinking: vi.fn().mockReturnValue(false),
            getLinkSourceNode: vi.fn().mockReturnValue(null),
            getSelectedNodes: vi.fn().mockReturnValue(mockSelectedNodesSet),
            getSelectedEdges: vi.fn().mockReturnValue(new Set()),
            completeLinking: vi.fn(),
        };

        const mockContextMenuEl = document.createElement('div');
        const mockConfirmDialogEl = document.createElement('div');

        uiManager = new UIManager(spaceGraph, mockContextMenuEl, mockConfirmDialogEl, mockUiPluginCallbacks);

        // Ensure TranslationGizmo is mocked and its instance is accessible
        // The constructor of UIManager creates a TranslationGizmo instance
        expect(TranslationGizmo).toHaveBeenCalledTimes(1);
        uiManager.gizmo = TranslationGizmo.mock.instances[0]; // Get the mocked instance

        // Mock default behavior for gizmo methods that might be called internally
        uiManager.gizmo.hide = vi.fn();
        uiManager.gizmo.showOnly = vi.fn();
        uiManager.gizmo.updateScale = vi.fn();
        uiManager.gizmo.setHandleActive = vi.fn();
        uiManager.gizmo.position = new THREE.Vector3();
        uiManager.gizmo.quaternion = new THREE.Quaternion();
        uiManager.gizmo.visible = false;
        uiManager.gizmo.handles = { children: [] }; // Mock handles for raycasting checks if any

        // Mock multiSelectionHelper
        uiManager.multiSelectionHelper = {
            position: new THREE.Vector3(),
            quaternion: new THREE.Quaternion(),
            scale: new THREE.Vector3(1, 1, 1),
            updateMatrixWorld: vi.fn(),
            worldToLocal: vi.fn((v) => v.clone()), // Simple pass-through for testing
            localToWorld: vi.fn((v) => v.clone()), // Simple pass-through
        };

        // Mock a node for selection
        const mockNode = new Node('testNode');
        mockNode.position = new THREE.Vector3(10, 0, 0);
        mockNode.mesh = {
            // Mock a basic mesh structure
            getWorldPosition: vi.fn(() => new THREE.Vector3(10, 0, 0)),
            getWorldQuaternion: vi.fn(() => new THREE.Quaternion()),
            getWorldScale: vi.fn(() => new THREE.Vector3(1, 1, 1)),
            updateWorldMatrix: vi.fn(),
            parent: mockWebGLScene, // Mock parent for some three.js operations
        };
        mockNode.userData = {}; // Ensure userData exists
        mockSelectedNodesSet.add(mockNode);
    });

    it('should transition to GIZMO_DRAGGING state when a gizmo handle is clicked', () => {
        // Simulate a gizmo handle being the target
        const mockGizmoHandleInfo = {
            axis: 'x',
            type: 'translate',
            part: 'arrow',
            object: new THREE.Mesh(), // Mock a THREE.Mesh for the handle
            distance: 10,
        };
        mockGizmoHandleInfo.object.userData = { isGizmoHandle: true, axis: 'x', gizmoType: 'translate', part: 'arrow' };

        // Make the gizmo visible for the test
        uiManager.gizmo.visible = true;
        uiManager.gizmo.handles.children.push(mockGizmoHandleInfo.object); // Add to raycastable children

        // Mock _getTargetInfo to return our gizmo handle
        uiManager._getTargetInfo = vi.fn().mockReturnValue({ gizmoHandleInfo: mockGizmoHandleInfo });

        // Mock raycaster intersection for GIZMO_DRAGGING transition
        const mockIntersectionPoint = new THREE.Vector3(1, 2, 3);
        const mockRaycaster = {
            intersectObject: vi
                .fn()
                .mockReturnValue([{ point: mockIntersectionPoint, object: mockGizmoHandleInfo.object }]),
            setFromCamera: vi.fn(),
            ray: {
                intersectPlane: vi.fn().mockReturnValue(mockIntersectionPoint), // For fallback in _onPointerDown
            },
        };
        // THREE.Raycaster = vi.fn(() => mockRaycaster); // Incorrect way to mock
        vi.spyOn(THREE, 'Raycaster').mockImplementation(() => mockRaycaster);

        // Simulate pointer down event
        const pointerDownEvent = {
            clientX: 0,
            clientY: 0,
            button: 0,
            pointerId: 1,
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        };
        uiManager._onPointerDown(pointerDownEvent);

        expect(uiManager.currentState).toBe(InteractionState.GIZMO_DRAGGING);
        expect(uiManager.draggedGizmoHandleInfo).toBe(mockGizmoHandleInfo);
        expect(uiManager.gizmo.setHandleActive).toHaveBeenCalledWith(mockGizmoHandleInfo.object, true);
    });

    it('should apply translation when dragging a gizmo translate handle', () => {
        // Setup initial state for dragging
        uiManager.currentState = InteractionState.GIZMO_DRAGGING;
        const mockNode = uiManager._uiPluginCallbacks.getSelectedNodes().values().next().value;
        uiManager.selectedNodesInitialPositions.set(mockNode.id, mockNode.position.clone());

        uiManager.draggedGizmoHandleInfo = {
            axis: 'x',
            type: 'translate',
            part: 'arrow',
            object: new THREE.Mesh(),
        };
        uiManager.gizmoDragStartPointerWorldPos.set(1, 0, 0); // Initial click point on gizmo

        // Mock raycaster for _handleGizmoDrag
        const mockCurrentPointerWorldPos = new THREE.Vector3(6, 0, 0); // Pointer moved 5 units in X
        const mockRaycaster = {
            setFromCamera: vi.fn(),
            ray: {
                closestPointToLine: vi.fn((line, clamp, target) => target.copy(mockCurrentPointerWorldPos)),
                intersectPlane: vi.fn((plane, target) => target.copy(mockCurrentPointerWorldPos)), // For plane drag
            },
        };
        // THREE.Raycaster = vi.fn(() => mockRaycaster); // Incorrect way to mock
        vi.spyOn(THREE, 'Raycaster').mockImplementation(() => mockRaycaster);

        // Mock gizmo orientation (world aligned)
        uiManager.gizmo.quaternion.identity();
        uiManager.gizmo.position.copy(mockNode.position); // Gizmo at node's initial position

        // Simulate pointer move
        const pointerMoveEvent = { clientX: 100, clientY: 0, pointerId: 1, preventDefault: vi.fn() };
        uiManager._handleGizmoDrag(pointerMoveEvent);

        const expectedPosition = new THREE.Vector3(10, 0, 0).add(new THREE.Vector3(5, 0, 0)); // Initial + Delta
        expect(mockNode.setPosition).toHaveBeenCalledWith(expectedPosition.x, expectedPosition.y, expectedPosition.z);
    });

    it('should apply rotation when dragging a gizmo rotate handle', () => {
        uiManager.currentState = InteractionState.GIZMO_DRAGGING;
        const mockNode = uiManager._uiPluginCallbacks.getSelectedNodes().values().next().value;

        uiManager.selectedNodesInitialPositions.set(mockNode.id, mockNode.position.clone());
        uiManager.selectedNodesInitialQuaternions.set(
            mockNode.id,
            mockNode.mesh.getWorldQuaternion(new THREE.Quaternion())
        );
        mockNode.userData.initialOffsetFromPivot = new THREE.Vector3(0, 0, 0); // Assume rotation around node center for simplicity

        const gizmoCenter = mockNode.position.clone();
        uiManager.draggedGizmoHandleInfo = {
            axis: 'y', // Rotate around Y
            type: 'rotate',
            object: new THREE.Mesh(),
            rotationPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -gizmoCenter.y), // Plane perpendicular to Y, through gizmoCenter
            initialAngle: 0,
            cumulativeDeltaQuaternion: new THREE.Quaternion(),
            gizmoCenter: gizmoCenter,
        };
        uiManager.gizmo.position.copy(gizmoCenter);
        uiManager.gizmo.quaternion.identity(); // Gizmo world aligned for this test

        // Simulate pointer move for rotation
        // Initial point on plane (e.g. along X axis from center)
        // const initialPointerOnPlane = gizmoCenter.clone().add(new THREE.Vector3(1,0,0)); // Unused variable
        // Current point on plane (e.g. rotated 90deg around Y, now along Z axis)
        const currentPointerOnPlane = gizmoCenter.clone().add(new THREE.Vector3(0, 0, 1));

        const mockRaycaster = {
            setFromCamera: vi.fn(),
            ray: {
                intersectPlane: vi.fn((plane, target) => target.copy(currentPointerOnPlane)),
            },
        };
        // THREE.Raycaster = vi.fn(() => mockRaycaster); // Incorrect way to mock
        vi.spyOn(THREE, 'Raycaster').mockImplementation(() => mockRaycaster);

        const pointerMoveEvent = { clientX: 100, clientY: 0, pointerId: 1, preventDefault: vi.fn() };
        uiManager._handleGizmoDrag(pointerMoveEvent);

        // Node itself doesn't move if rotated around its own center
        expect(mockNode.setPosition).toHaveBeenCalledWith(
            mockNode.position.x,
            mockNode.position.y,
            mockNode.position.z
        );

        // Check node's mesh quaternion
        const expectedQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); // 90 deg around Y
        expect(mockNode.mesh.quaternion.x).toBeCloseTo(expectedQuaternion.x);
        expect(mockNode.mesh.quaternion.y).toBeCloseTo(expectedQuaternion.y);
        expect(mockNode.mesh.quaternion.z).toBeCloseTo(expectedQuaternion.z);
        expect(mockNode.mesh.quaternion.w).toBeCloseTo(expectedQuaternion.w);
    });

    it('should transition to IDLE state and clean up when gizmo drag ends', () => {
        uiManager.currentState = InteractionState.GIZMO_DRAGGING;
        const mockDraggedHandleObject = new THREE.Mesh();
        uiManager.draggedGizmoHandleInfo = { object: mockDraggedHandleObject };

        const pointerUpEvent = { clientX: 0, clientY: 0, button: 0, pointerId: 1 };
        uiManager._onPointerUp(pointerUpEvent);

        expect(uiManager.currentState).toBe(InteractionState.IDLE);
        expect(uiManager.gizmo.setHandleActive).toHaveBeenCalledWith(mockDraggedHandleObject, false);
        expect(uiManager.draggedGizmoHandleInfo).toBeNull();
        expect(uiManager.selectedNodesInitialPositions.size).toBe(0);
    });
});
