import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpaceGraph } from '../../spacegraph.js';
import { UIManager } from '../../js/ui/UIManager.js'; // Adjusted path

// Mock problematic parts of Three.js and GSAP for a Node.js test environment if not using browser mode
// If Vitest is configured for browser/JSDOM, these might not be strictly necessary
// but can prevent issues with WebGL or complex animations in a basic JSDOM.
vi.mock('three', async () => {
  const actualThree = await vi.importActual('three');
  return {
    ...actualThree,
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      setClearColor: vi.fn(),
      render: vi.fn(),
      domElement: document.createElement('canvas'), // Basic mock for domElement
    })),
    PerspectiveCamera: vi.fn().mockImplementation(() => ({
      aspect: 1,
      updateProjectionMatrix: vi.fn(),
      position: { z: 0, set: vi.fn(), copy: vi.fn() },
      quaternion: { copy: vi.fn() },
      fov: 70,
      lookAt: vi.fn(),
    })),
    Scene: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      children: [],
      background: null,
    })),
    AmbientLight: vi.fn(),
    DirectionalLight: vi.fn(),
    // Mock other Three.js components if they cause issues during SpaceGraph construction
  };
});

vi.mock('three/addons/renderers/CSS3DRenderer.js', () => ({
  CSS3DRenderer: vi.fn().mockImplementation(() => ({
    setSize: vi.fn(),
    render: vi.fn(),
    domElement: document.createElement('div'),
  })),
  CSS3DObject: vi.fn().mockImplementation(element => ({
    element,
    position: { copy: vi.fn() },
    quaternion: { copy: vi.fn() },
  })),
}));

vi.mock('gsap', () => ({
  gsap: {
    to: vi.fn(),
    killTweensOf: vi.fn(),
  },
}));


describe('SpaceGraph Initialization - Integration Test', () => {
  let container;

  beforeEach(() => {
    // Create a mock container element for SpaceGraph before each test
    container = document.createElement('div');
    container.id = 'test-graph-container';
    // Mock getBoundingClientRect for layout calculations if necessary for constructor
    container.getBoundingClientRect = vi.fn(() => ({
        width: 800, height: 600, top: 0, left: 0, bottom: 0, right: 0, x:0, y:0, toJSON: () => {}
    }));
    document.body.appendChild(container);

    // Mock window.innerWidth/Height as SpaceGraph constructor uses them for camera aspect
    global.innerWidth = 800;
    global.innerHeight = 600;
    global.devicePixelRatio = 1;

    // Mock requestAnimationFrame as it's called in _animate
    global.requestAnimationFrame = vi.fn((cb) => {
      // In a real scenario, you might want to control invocation for animation tests
      // For initialization, just mocking it to prevent errors is often enough.
      return 0; // return a mock ID
    });
    global.cancelAnimationFrame = vi.fn();


  });

  it('should instantiate SpaceGraph without throwing errors', () => {
    let graphInstance;
    expect(() => {
      graphInstance = new SpaceGraph(container);
    }).not.toThrow();
    expect(graphInstance).toBeInstanceOf(SpaceGraph);
  });

  it('should have a UIManager instance after initialization', () => {
    const graph = new SpaceGraph(container);
    expect(graph.uiManager).toBeDefined();
    expect(graph.uiManager).toBeInstanceOf(UIManager);
  });

  it('UIManager should have essential handlers defined', () => {
    const graph = new SpaceGraph(container);
    expect(graph.uiManager.pointerInputHandler).toBeDefined();
    expect(graph.uiManager.keyboardInputHandler).toBeDefined();
    expect(graph.uiManager.wheelInputHandler).toBeDefined();
    expect(graph.uiManager.dragAndDropHandler).toBeDefined();
    expect(graph.uiManager.contextMenuManager).toBeDefined();
    expect(graph.uiManager.linkingManager).toBeDefined();
    expect(graph.uiManager.edgeMenuManager).toBeDefined();
    expect(graph.uiManager.dialogManager).toBeDefined();
  });

  // Teardown after each test if necessary (e.g., removing container)
  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.restoreAllMocks(); // Restore any mocks that were spied on or changed
    // Clean up global mocks
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
    delete global.innerWidth;
    delete global.innerHeight;
  });
});
