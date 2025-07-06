import * as S from '../index.js'; // Adjusted path
import { pages } from './pages.js';
// Import setupDemoMenu specifically for the allFeaturesDemo
import { setupDemoMenu as allFeaturesSetupDemoMenu } from './demos/allFeaturesDemo.js';

let space; // Make space globally accessible within this script
const pageSelectorEl = S.$('#page-selector');
const hudEl = S.$('#hud');

function populatePageSelector() {
    if (!pageSelectorEl) return;
    pageSelectorEl.innerHTML = ''; // Clear existing buttons

    pages.forEach(page => {
        const button = document.createElement('button');
        button.textContent = page.title;
        button.dataset.pageId = page.id;
        button.addEventListener('click', () => loadPage(page.id));
        pageSelectorEl.appendChild(button);
    });
}

function updateActiveButton(pageId) {
    if (!pageSelectorEl) return;
    const buttons = pageSelectorEl.querySelectorAll('button');
    buttons.forEach(button => {
        if (button.dataset.pageId === pageId) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

async function loadPage(pageId) {
    if (!space) {
        console.error('SpaceGraph not initialized yet.');
        return;
    }

    const page = pages.find(p => p.id === pageId);
    if (!page) {
        console.error(`Page with id "${pageId}" not found.`);
        return;
    }

    // Clear previous graph content
    await space.importGraphFromJSON({ nodes: [], edges: [] });

    if (hudEl) {
        hudEl.innerHTML = page.description;
    }

    // Create the new graph
    if (typeof page.createGraph === 'function') {
        page.createGraph(space);
        // If the loaded page is the allFeaturesDemo, set up its specific menu
        if (page.id === 'all-features') {
            allFeaturesSetupDemoMenu(space); // Call the imported function
        }
    } else {
        console.error(`createGraph function missing for page "${pageId}"`);
    }

    // Re-initialize layout and view
    const layoutPlugin = space.plugins.getPlugin('LayoutPlugin');
    const layoutManager = layoutPlugin?.layoutManager;
    if (layoutManager) {
        layoutManager.kick?.(); // Re-run layout physics
    } else {
        console.warn('LayoutPlugin or LayoutManager not available for kicking layout.');
    }

    space.centerView(null, 0.8);
    updateActiveButton(pageId);
    console.log(`Loaded page: ${page.title}`);
}

async function init() {
    const container = S.$('#mindmap-container');
    const contextMenuEl = S.$('#context-menu');
    const confirmDialogEl = S.$('#confirm-dialog');

    if (!container || !contextMenuEl || !confirmDialogEl || !pageSelectorEl || !hudEl) {
        console.error('Init Failed: Missing DOM elements for graph, page selector, or HUD.');
        if (container) container.innerHTML = "<p style='color:red; padding: 20px;'>Error: Critical HTML elements are missing.</p>";
        return;
    }

    try {
        space = new S.SpaceGraph(container, {
            ui: {
                contextMenuElement: contextMenuEl,
                confirmDialogElement: confirmDialogEl,
            },
            // Add any default options if needed
        });
        await space.init();

        populatePageSelector();

        if (pages.length > 0) {
            await loadPage(pages[0].id); // Load the first page by default
        } else {
            console.warn('No pages defined in pages.js');
            if (hudEl) hudEl.innerHTML = "<p>No pages available to display.</p>";
        }

        space.animate(); // Start animation loop

        window.space = space; // Expose space to global for debugging
    } catch (error) {
        console.error('Init Failed:', error);
        container.innerHTML = `<div style="color: red; padding: 20px;">Error initializing: ${error.message}<br><pre>${error.stack}</pre></div>`;
    }
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
