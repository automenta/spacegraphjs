// Export utilities
export * from './utils.js';

// Export core SpaceGraph class and plugin infrastructure
export * from './core/SpaceGraph.js';
export * from './core/Plugin.js';
export * from './core/PluginManager.js';

// Export default plugins (users might want to extend or replace them)
export * from './plugins/RenderingPlugin.js';
export * from './plugins/CameraPlugin.js';
export * from './plugins/NodePlugin.js';
export * from './plugins/EdgePlugin.js';
export * from './plugins/LayoutPlugin.js';
export * from './plugins/UIPlugin.js';

// Export core components that plugins manage (advanced users might interact with these)
export * from './camera/Camera.js'; // This is CameraControls
export * from './ui/UIManager.js';
export * from './layout/ForceLayout.js';
export * from './graph/Edge.js'; // Edge class

// Export node types (essential for users)
export * from './graph/nodes/BaseNode.js';
export * from './graph/nodes/HtmlNode.js';
export * from './graph/nodes/NoteNode.js';
export * from './graph/nodes/ShapeNode.js';
