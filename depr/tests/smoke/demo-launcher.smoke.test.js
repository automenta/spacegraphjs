import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// --- Mocks for external dependencies ---
// These mocks are crucial because JSDOM cannot easily execute scripts that fetch external resources
// like those from unpkg.com specified in the importmap of index.html.
// They also prevent errors from Three.js trying to access WebGL in a non-browser env.

vi.mock('three', async () => {
  const actualThree = await vi.importActual('three'); // Keep other Three exports if needed
  return {
    ...actualThree,
    WebGLRenderer: vi.fn(() => ({
      setSize: vi.fn(), setPixelRatio: vi.fn(), setClearColor: vi.fn(), render: vi.fn(), domElement: document.createElement('canvas'),
    })),
    PerspectiveCamera: vi.fn(() => ({
      aspect: 1, updateProjectionMatrix: vi.fn(), position: { z: 0, set: vi.fn(), copy: vi.fn() }, quaternion: {copy: vi.fn()}, fov: 70, lookAt: vi.fn(),
    })),
    Scene: vi.fn(() => ({ add: vi.fn(), remove: vi.fn(), children: [], background: null })),
    AmbientLight: vi.fn(),
    DirectionalLight: vi.fn(),
    Vector3: actualThree.Vector3, // Use actual Vector3 if SpaceGraph or demo launcher uses it directly
    Plane: actualThree.Plane,
    Raycaster: vi.fn(() => ({ setFromCamera: vi.fn(), ray: { intersectPlane: vi.fn(() => null) } })), // Mock raycaster
    BufferGeometry: vi.fn(() => ({ setFromPoints: vi.fn(() => ({ attributes: { position: { needsUpdate: false } }, computeBoundingSphere: vi.fn() })) })),
    LineBasicMaterial: vi.fn(),
    Line: vi.fn(),
    BoxGeometry: vi.fn(),
    SphereGeometry: vi.fn(),
    MeshStandardMaterial: vi.fn(),
    Mesh: vi.fn(),
    // Add any other specific Three.js components that might be directly used by SpaceGraph constructor or demo launcher
  };
});

vi.mock('three/addons/renderers/CSS3DRenderer.js', () => ({
  CSS3DRenderer: vi.fn(() => ({
    setSize: vi.fn(), render: vi.fn(), domElement: document.createElement('div'),
  })),
  CSS3DObject: vi.fn(element => ({
    element, position: { copy: vi.fn() }, quaternion: { copy: vi.fn() },
  })),
}));

vi.mock('gsap', () => ({
  gsap: { to: vi.fn(), killTweensOf: vi.fn(), ticker: { add: vi.fn(), remove: vi.fn() } },
}));

// --- Mock SpaceGraph.js dependencies that might not be well-handled by JSDOM if they are complex ---
// Since demo-launcher.js imports from '../dist/spacegraph.esm.js', we need to ensure that
// the actual SpaceGraph code runs as much as possible. The mocks above for three/gsap help that.

describe('Demo Launcher Smoke Test', () => {
  let dom;
  let virtualConsole;
  let consoleErrorSpy;

  beforeEach(async () => {
    const htmlPath = path.resolve(__dirname, '../../index.html'); // Adjust path to index.html
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    // Spy on console.error before creating JSDOM
    consoleErrorSpy = vi.spyOn(console, 'error');

    virtualConsole = new jsdom.VirtualConsole();
    // Capture errors from the JSDOM environment
    virtualConsole.on('jsdomError', (error) => {
      console.error('JSDOM Error:', error);
    });
    // Optionally, pipe other console messages from JSDOM to Jest/Vitest console
    // virtualConsole.on("error", (error) => { console.error("VC Error:", error); });
    // virtualConsole.on("warn", (warn) => { console.warn("VC Warn:", warn); });
    // virtualConsole.on("info", (info) => { console.info("VC Info:", info); });
    // virtualConsole.on("log", (log) => { console.log("VC Log:", log);});


    dom = new JSDOM(htmlContent, {
      runScripts: 'dangerously', // Necessary to execute scripts in index.html
      resources: 'usable',      // Try to load sub-resources (though importmap makes this tricky)
      pretendToBeVisual: true,  // Helps with layout-dependent APIs
      url: `file://${htmlPath}`, // Set a base URL for resolving relative paths
      virtualConsole,
    });

    // JSDOM doesn't automatically execute scripts loaded via <script type="module"> with complex import maps
    // that point to external URLs without further setup. The mocks for 'three' and 'gsap'
    // are intended to satisfy these imports if they are resolved by Vitest's module system.

    // Add a way to wait for DOMContentLoaded or for scripts to finish
    // For module scripts, JSDOM dispatches DOMContentLoaded before script execution.
    // We need to wait for the script to actually run. A common way is to wait for a specific event
    // or a timeout if the script doesn't provide a clear signal of completion.
    // Given demo-launcher.js initializes SpaceGraph on DOMContentLoaded and then
    // dispatches 'spaceGraphInitialized' event, we wait for that.
    await new Promise(resolve => {
      dom.window.addEventListener('spaceGraphInitialized', () => {
        resolve();
      });
      // Fallback timeout in case the event is never dispatched, to prevent test hanging indefinitely
      setTimeout(() => {
        console.error('Timeout waiting for spaceGraphInitialized event');
        resolve(); // Resolve to let the test fail with assertions rather than timeout
      }, 5000); // Increased timeout to 5 seconds for safety
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    dom.window.close(); // Clean up JSDOM window
  });

  it('should load index.html and execute demo-launcher.js without critical console errors', () => {
    // Check if any errors were logged to the JSDOM virtual console that were interpreted as jsdomErrors
    // or if our direct console.error spy caught anything from the script execution context.
    const jsdomErrors = virtualConsole.errors || []; // Assuming 'errors' is where jsdomError logs are collected

    // Filter out known, less critical JSDOM errors if necessary
    // For example, errors about CSS parsing are common and often not critical for script execution.
    const criticalErrors = jsdomErrors.filter(err =>
        !(err.message && err.message.includes("Could not parse CSS stylesheet")) &&
        !(err.type && err.type.includes("CSS Parsing"))
    );

    // Check our direct spy on console.error
    const directConsoleErrors = consoleErrorSpy.mock.calls.filter(call => {
        // Ignore specific benign errors if necessary
        // e.g., if (call[0].includes('some known benign error')) return false;
        return true;
    });


    expect(criticalErrors.length).toBe(0);
    expect(directConsoleErrors.length).toBe(0);

    // Also, specifically check that the UIManager error is not present
    const uimanagerErrorFound = directConsoleErrors.some(call =>
      typeof call[0] === 'string' && call[0].includes('UIManager is not defined')
    );
    expect(uimanagerErrorFound).toBe(false);

    // Verify SpaceGraph was likely initialized (e.g., container has child elements)
    // This is a basic check. More specific checks would require demo-launcher.js to expose signals.
    const graphContainer = dom.window.document.getElementById('demo-graph-container');
    expect(graphContainer).not.toBeNull();
    // SpaceGraph creates canvas and div elements inside the container.
    // Check for the presence of a canvas (WebGL) or the css3d-container div.
    const canvasElement = graphContainer.querySelector('canvas#webgl-canvas');
    const css3dContainer = graphContainer.querySelector('div#css3d-container');
    expect(canvasElement || css3dContainer).not.toBeNull();
  });
});
