import * as S from '../index.js';
import { EnhancedDemoRunner } from './EnhancedDemoRunner.js';

let space;
let demoRunner;

/**
 * Initialize the enhanced demo system
 */
async function init() {
    const container = S.$('#mindmap-container');
    const contextMenuEl = S.$('#context-menu');
    const confirmDialogEl = S.$('#confirm-dialog');

    if (!container || !contextMenuEl || !confirmDialogEl) {
        console.error('Init Failed: Missing DOM elements for graph.');
        if (container) container.innerHTML = "<p style='color:red; padding: 20px;'>Error: Critical HTML elements are missing.</p>";
        return;
    }

    try {
        // Initialize SpaceGraph
        space = new S.SpaceGraph(container, {
            ui: {
                contextMenuElement: contextMenuEl,
                confirmDialogElement: confirmDialogEl,
            },
        });
        
        await space.init();

        // Initialize Enhanced Demo Runner
        demoRunner = new EnhancedDemoRunner(space);
        
        // Expose to global scope for debugging and demo interactions
        window.space = space;
        window.demoRunner = demoRunner;

        // Start the animation loop
        space.animate();

        console.log('Enhanced demo system initialized successfully');

    } catch (error) {
        console.error('Init Failed:', error);
        container.innerHTML = `
            <div style="color: red; padding: 20px; font-family: Arial, sans-serif;">
                <h2>❌ Initialization Error</h2>
                <p><strong>Error:</strong> ${error.message}</p>
                <details style="margin-top: 10px;">
                    <summary>Technical Details</summary>
                    <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; font-size: 12px;">${error.stack}</pre>
                </details>
                <div style="margin-top: 15px;">
                    <button onclick="location.reload()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        🔄 Reload Page
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Cleanup function for page unload
 */
function cleanup() {
    if (demoRunner) {
        demoRunner.dispose();
        demoRunner = null;
    }
    
    if (space) {
        space.dispose?.();
        space = null;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Export for debugging
export { space, demoRunner };