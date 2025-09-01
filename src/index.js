export * from "./utils.js";

// Core components
export * from "./core/BaseFactory.js";
export * from "./core/ConsolidatedFactory.js";
export * from "./core/SpaceGraph.js";
export * from "./core/Plugin.js";
export * from "./core/PluginManager.js";

// Consolidated plugins
export * from "./plugins/ConsolidatedPlugin.js";

// Camera components
export * from "./camera/Camera.js";
export * from "./camera/AdvancedCameraControls.js";

// UI components
export * from "./ui/UIManager.js";

// Consolidated layout system
export * from "./layout/ConsolidatedLayoutManager.js";

// Graph components - keeping essential base classes and consolidated implementations
export * from "./graph/BaseEdge.js";
export * from "./graph/ConsolidatedEdge.js";
export * from "./graph/EdgeFactory.js";

export * from "./graph/BaseNode.js";
export * from "./graph/ConsolidatedNode.js";
export * from "./graph/NodeFactory.js";

// Export THREE.js for direct access via the S namespace
export * as THREE from "three";
