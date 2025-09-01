// src/examples/pages.js

// Dynamically import all demo modules from the demos/ directory
const demoModules = import.meta.glob('./demos/*.js', {eager: true});

const loadedPages = [];
for (const path in demoModules) {
    const module = demoModules[path];
    if (module.demoMetadata && module.createGraph) {
        loadedPages.push({
            id: module.demoMetadata.id,
            title: module.demoMetadata.title,
            description: module.demoMetadata.description,
            createGraph: module.createGraph,
        });
    } else {
        console.warn(`Demo module at ${path} is missing demoMetadata or createGraph export.`);
    }
}

// Sort pages by ID to ensure a consistent order,
// or implement a more sophisticated ordering system if needed.
loadedPages.sort((a, b) => {
    // Ensure 'all-features' comes first
    if (a.id === 'all-features') return -1;
    if (b.id === 'all-features') return 1;
    return a.id.localeCompare(b.id);
});

export const pages = loadedPages;
