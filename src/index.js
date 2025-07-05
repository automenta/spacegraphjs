export * from './utils.js';

export * from './core/BaseFactory.js'; // Export BaseFactory
export * from './core/SpaceGraph.js';
export * from './core/Plugin.js';
export * from './core/PluginManager.js';

export * from './plugins/CameraPlugin.js';
export * from './plugins/DataPlugin.js';
export * from './plugins/EdgePlugin.js';
export * from './plugins/LayoutPlugin.js';
export * from './plugins/MinimapPlugin.js';
export * from './plugins/NodePlugin.js';
export * from './plugins/RenderingPlugin.js';
export * from './plugins/UIPlugin.js';

export * from './camera/Camera.js';
export * from './camera/AdvancedCameraControls.js';
export * from './ui/UIManager.js';

export * from './layout/CircularLayout.js';
export * from './layout/ForceLayout.js';
export * from './layout/GridLayout.js';
export * from './layout/HierarchicalLayout.js';
export * from './layout/SphericalLayout.js';
export * from './layout/RadialLayout.js';
export * from './layout/TreeMapLayout.js';
export * from './layout/LayoutManager.js';
export * from './layout/ConstraintLayout.js';
export * from './layout/NestedLayout.js';
export * from './layout/LayoutConnector.js';
export * from './layout/AdaptiveLayout.js';
export * from './layout/AdvancedLayoutManager.js';

export * from './graph/edges/CurvedEdge.js';
export * from './graph/edges/Edge.js';
export * from './graph/EdgeFactory.js';
export * from './graph/edges/LabeledEdge.js';
export * from './graph/edges/DynamicThicknessEdge.js';
export * from './graph/edges/DottedEdge.js';
export * from './graph/edges/FlowEdge.js';
export * from './graph/edges/SpringEdge.js';
export * from './graph/edges/BezierEdge.js';

export * from './graph/nodes/Node.js';
export * from './graph/nodes/DataNode.js';
export * from './graph/nodes/GroupNode.js';
export * from './graph/nodes/HtmlNode.js';
export * from './graph/nodes/IFrameNode.js';
export * from './graph/nodes/ImageNode.js';
export * from './graph/NodeFactory.js';
export * from './graph/nodes/NoteNode.js';
export * from './graph/nodes/ShapeNode.js';
export * from './graph/nodes/VideoNode.js';
export * from './graph/nodes/AudioNode.js';
export * from './graph/nodes/DocumentNode.js';
export * from './graph/nodes/ChartNode.js';
export * from './graph/nodes/ControlPanelNode.js';
export * from './graph/nodes/ProgressNode.js';
export * from './graph/nodes/CanvasNode.js';
export * from './graph/nodes/ProceduralShapeNode.js';
export * from './graph/nodes/TextMeshNode.js';
export * from './graph/nodes/MetaWidgetNode.js';

// Export Generators
export * from './generators/FileSystemGenerator.js';
export * from './generators/ObjectPropertyGenerator.js';

// Export Utilities
export * from './utils/WidgetComposer.js';

// Export Fractal Zoom Components
export * from './zoom/FractalZoomManager.js';
export * from './zoom/ContentAdapter.js';
export * from './plugins/FractalZoomPlugin.js';

// Export Performance Components
export * from './performance/PerformanceManager.js';
export * from './performance/WorkerManager.js';
export * from './plugins/PerformancePlugin.js';

// Export THREE.js for direct access via the S namespace
export * as THREE from 'three';
