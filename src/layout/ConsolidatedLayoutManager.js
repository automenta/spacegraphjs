import * as THREE from "three";

// Consolidated layout manager that handles multiple layout types
export class ConsolidatedLayoutManager {
  constructor(space, pluginManager) {
    this.space = space;
    this.pluginManager = pluginManager;
    this.nodesMap = new Map();
    this.edgesMap = new Map();
    this.settings = {
      repulsion: 3000,
      centerStrength: 0.0005,
      damping: 0.92,
      minEnergyThreshold: 0.1,
      gravityCenter: new THREE.Vector3(0, 0, 0),
      zSpreadFactor: 0.15,
      autoStopDelay: 4000,
      nodePadding: 1.2,
      defaultElasticStiffness: 0.001,
      defaultElasticIdealLength: 200,
      defaultRigidStiffness: 0.1,
      defaultWeldStiffness: 0.5,
      enableClustering: false,
      clusterAttribute: "clusterId",
      clusterStrength: 0.005,
    };
    this.isRunning = false;
    this.currentLayoutType = "force";
  }

  // Layout algorithms
  static LAYOUT_TYPES = {
    FORCE: "force",
    GRID: "grid",
    CIRCULAR: "circular",
    SPHERICAL: "spherical",
    HIERARCHICAL: "hierarchical",
    TREEMAP: "treemap",
    RADIAL: "radial",
  };

  setContext(space, pluginManager) {
    this.space = space;
    this.pluginManager = pluginManager;
  }

  updateConfig(newConfig) {
    this.settings = { ...this.settings, ...newConfig };
  }

  init(nodes, edges, config = {}) {
    if (config) this.updateConfig(config);

    this.nodesMap.clear();
    nodes.forEach((n) => this.nodesMap.set(n.id, n));

    this.edgesMap.clear();
    edges.forEach((e) => this.edgesMap.set(e.id, e));

    // Apply initial layout based on type
    this.applyLayout(this.currentLayoutType);
  }

  applyLayout(layoutType, config = {}) {
    this.currentLayoutType = layoutType;
    this.updateConfig(config);

    switch (layoutType) {
      case ConsolidatedLayoutManager.LAYOUT_TYPES.FORCE:
        this._applyForceLayout();
        break;
      case ConsolidatedLayoutManager.LAYOUT_TYPES.GRID:
        this._applyGridLayout();
        break;
      case ConsolidatedLayoutManager.LAYOUT_TYPES.CIRCULAR:
        this._applyCircularLayout();
        break;
      case ConsolidatedLayoutManager.LAYOUT_TYPES.SPHERICAL:
        this._applySphericalLayout();
        break;
      case ConsolidatedLayoutManager.LAYOUT_TYPES.HIERARCHICAL:
        this._applyHierarchicalLayout();
        break;
      case ConsolidatedLayoutManager.LAYOUT_TYPES.TREEMAP:
        this._applyTreeMapLayout();
        break;
      case ConsolidatedLayoutManager.LAYOUT_TYPES.RADIAL:
        this._applyRadialLayout();
        break;
      default:
        this._applyForceLayout();
    }
  }

  _applyForceLayout() {
    if (this.nodesMap.size === 0) return;

    // Simple force-directed layout implementation
    const nodes = Array.from(this.nodesMap.values());
    const centerX = this.settings.gravityCenter.x;
    const centerY = this.settings.gravityCenter.y;
    const centerZ = this.settings.gravityCenter.z;

    // Apply basic positioning
    nodes.forEach((node, index) => {
      if (!node.isPinned) {
        const angle = (index / nodes.length) * Math.PI * 2;
        const distance = 200;
        node.position.set(
          centerX + Math.cos(angle) * distance,
          centerY + Math.sin(angle) * distance,
          centerZ,
        );
      }
    });
  }

  _applyGridLayout() {
    if (this.nodesMap.size === 0) return;

    const nodes = Array.from(this.nodesMap.values());
    const gridSize = Math.ceil(Math.sqrt(nodes.length));
    const spacing = 150;
    const startX = -(gridSize * spacing) / 2;
    const startY = -(gridSize * spacing) / 2;

    nodes.forEach((node, index) => {
      if (!node.isPinned) {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        node.position.set(startX + col * spacing, startY + row * spacing, 0);
      }
    });
  }

  _applyCircularLayout() {
    if (this.nodesMap.size === 0) return;

    const nodes = Array.from(this.nodesMap.values());
    const radius = 200;
    const centerX = this.settings.gravityCenter.x;
    const centerY = this.settings.gravityCenter.y;
    const centerZ = this.settings.gravityCenter.z;

    nodes.forEach((node, index) => {
      if (!node.isPinned) {
        const angle = (index / nodes.length) * Math.PI * 2;
        node.position.set(
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius,
          centerZ,
        );
      }
    });
  }

  _applySphericalLayout() {
    if (this.nodesMap.size === 0) return;

    const nodes = Array.from(this.nodesMap.values());
    const radius = 200;
    const centerX = this.settings.gravityCenter.x;
    const centerY = this.settings.gravityCenter.y;
    const centerZ = this.settings.gravityCenter.z;

    nodes.forEach((node, index) => {
      if (!node.isPinned) {
        const phi = Math.acos(-1 + (2 * index) / nodes.length);
        const theta = Math.sqrt(nodes.length * Math.PI) * phi;

        node.position.set(
          centerX + radius * Math.cos(theta) * Math.sin(phi),
          centerY + radius * Math.sin(theta) * Math.sin(phi),
          centerZ + radius * Math.cos(phi),
        );
      }
    });
  }

  _applyHierarchicalLayout() {
    // Simplified hierarchical layout
    this._applyForceLayout();
  }

  _applyTreeMapLayout() {
    // Simplified treemap layout
    this._applyGridLayout();
  }

  _applyRadialLayout() {
    // Simplified radial layout
    this._applyCircularLayout();
  }

  addNode(node) {
    if (!this.nodesMap.has(node.id)) {
      this.nodesMap.set(node.id, node);
      this.kick();
    }
  }

  removeNode(node) {
    if (this.nodesMap.has(node.id)) {
      this.nodesMap.delete(node.id);
      this.kick();
    }
  }

  addEdge(edge) {
    if (!this.edgesMap.has(edge.id)) {
      this.edgesMap.set(edge.id, edge);
      this.kick();
    }
  }

  removeEdge(edge) {
    if (this.edgesMap.has(edge.id)) {
      this.edgesMap.delete(edge.id);
      this.kick();
    }
  }

  run() {
    if (!this.isRunning && this.nodesMap.size > 0) {
      this.isRunning = true;
      // For force layout, we would run the simulation
      // For static layouts, we just apply once
      if (
        this.currentLayoutType === ConsolidatedLayoutManager.LAYOUT_TYPES.FORCE
      ) {
        this._runForceSimulation();
      }
    }
  }

  _runForceSimulation() {
    // Simplified force simulation
    let iterations = 0;
    const maxIterations = 100;

    const simulate = () => {
      if (iterations++ < maxIterations && this.isRunning) {
        // Apply basic force simulation
        this._applyForceLayout();
        requestAnimationFrame(simulate);
      } else {
        this.isRunning = false;
      }
    };

    simulate();
  }

  stop() {
    this.isRunning = false;
  }

  kick() {
    if (this.nodesMap.size > 0) {
      this.applyLayout(this.currentLayoutType);
      if (
        this.currentLayoutType === ConsolidatedLayoutManager.LAYOUT_TYPES.FORCE
      ) {
        this.run();
      }
    }
  }

  setPinState(node, isPinned) {
    if (this.nodesMap.has(node.id)) {
      node.isPinned = isPinned;
      this.kick();
    }
  }

  fixNode(node) {
    if (this.nodesMap.has(node.id)) {
      node.isPinned = true;
    }
  }

  releaseNode(node) {
    if (this.nodesMap.has(node.id)) {
      if (!node.isPinned) {
        node.isPinned = false;
      }
      this.kick();
    }
  }

  dispose() {
    this.stop();
    this.nodesMap.clear();
    this.edgesMap.clear();
    this.space = null;
    this.pluginManager = null;
  }
}
