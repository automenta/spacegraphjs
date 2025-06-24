// import * as THREE from 'three'; // THREE might not be needed directly in main thread class anymore for physics

export class ForceLayout {
    space = null; // SpaceGraph instance
    nodesMap = new Map(); // Main thread Node instances: Map<nodeId, BaseNode>
    edgesMap = new Map(); // Main thread Edge instances: Map<edgeId, Edge>

    worker = null;
    isRunning = false;
    totalEnergy = Infinity; // Last reported energy from worker

    // Settings are now primarily managed by the worker, but main thread can hold a copy.
    settings = {
        repulsion: 3000,
        centerStrength: 0.0005, // Gravity towards center
        damping: 0.92, // Velocity damping (0-1)
        minEnergyThreshold: 0.1, // Threshold to auto-stop
        gravityCenter: new THREE.Vector3(0, 0, 0),
        zSpreadFactor: 0.15, // Reduces Z-axis forces
        autoStopDelay: 4000, // ms of low energy before stopping
        nodePadding: 1.2, // Multiplier for node radius in repulsion
        // Default constraint params (can be overridden by edge.data.constraintParams)
        defaultElasticStiffness: 0.001,
        defaultElasticIdealLength: 200,
        defaultRigidStiffness: 0.1,
        defaultWeldStiffness: 0.5,
        // Clustering settings
        enableClustering: false, // Set to true to enable clustering
        clusterAttribute: 'clusterId', // Node data attribute to use for clustering
        clusterStrength: 0.005, // Attraction strength towards cluster center
        // interClusterRepulsion: 5000, // Repulsion between cluster centers (optional)
    };

    constructor(space, config = {}) {
        if (!space) throw new Error('ForceLayout requires a SpaceGraph instance.');
        this.space = space;
        this.settings = { ...this.settings, ...config }; // Initial settings

        // Initialize the worker
        this.worker = new Worker(new URL('./forceLayout.worker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = this._handleWorkerMessage.bind(this);
        this.worker.onerror = (error) => {
            console.error('ForceLayout Worker Error:', error);
            // Potentially try to stop or recover
            this.isRunning = false;
            this.space.emit('layout:error', { error });
        };
    }

    _handleWorkerMessage(event) {
        const { type, positions, energy, error } = event.data;
        switch (type) {
            case 'positionsUpdate':
                this.totalEnergy = energy;
                positions.forEach(p => {
                    const node = this.nodesMap.get(p.id);
                    if (node) {
                        node.position.set(p.x, p.y, p.z);
                        // No direct velocity update needed on main thread BaseNode unless other systems use it.
                        // The worker manages velocities.
                    }
                });
                // SpaceGraph's main animation loop will handle rendering.
                // We might emit a 'layout:tick' if other systems need to react to sub-frame updates.
                // For now, relying on the RAF loop of SpaceGraph.
                break;
            case 'stopped':
                this.isRunning = false;
                this.totalEnergy = energy;
                console.log('ForceLayout (Main): Worker reported stop. Energy:', energy);
                this.space.emit('layout:stopped', { name: 'force (worker)'});
                break;
            case 'error': // Worker can post custom error messages
                console.error('ForceLayout Worker reported error:', error);
                this.space.emit('layout:error', { error });
                break;
        }
    }

    /**
     * Initializes the layout with a set of nodes and edges.
     * @param {Array<import('../graph/nodes/BaseNode.js').BaseNode>} initialNodes
     * @param {Array<import('../graph/Edge.js').Edge>} initialEdges
     * @param {object} [config={}] Optional configuration to apply.
     */
    init(initialNodes, initialEdges, config = {}) {
        this.nodesMap.clear();
        initialNodes.forEach(n => this.nodesMap.set(n.id, n));

        this.edgesMap.clear();
        initialEdges.forEach(e => this.edgesMap.set(e.id, e));

        if (config) {
            this.settings = { ...this.settings, ...config };
        }

        const workerNodes = initialNodes.map(n => ({
            id: n.id,
            x: n.position.x, y: n.position.y, z: n.position.z,
            vx: 0, vy: 0, vz: 0, // Initial velocities
            mass: n.mass || 1.0,
            isFixed: n.isPinned, // Assuming isPinned implies fixed for the worker initially
            isPinned: n.isPinned,
            radius: n.getBoundingSphereRadius(), // Send radius for collision/weld
            clusterId: n.data?.clusterId // Send clusterId if present
        }));

        const workerEdges = initialEdges.map(e => ({
            sourceId: e.source.id,
            targetId: e.target.id,
            constraintType: e.data.constraintType,
            constraintParams: e.data.constraintParams,
        }));

        const gravityCenter = this.settings.gravityCenter; // Could be THREE.Vector3 or plain object
        const plainGravityCenter = (gravityCenter && typeof gravityCenter.x === 'number')
            ? { x: gravityCenter.x, y: gravityCenter.y, z: gravityCenter.z }
            : { x: 0, y: 0, z: 0 };

        this.worker.postMessage({
            type: 'init',
            payload: {
                nodes: workerNodes,
                edges: workerEdges,
                settings: { ...this.settings, gravityCenter: plainGravityCenter }
            }
        });
        // Don't start automatically, wait for run() or kick()
    }

    // Optional: For LayoutManager to query if layout is continuous
    isRunningCheck() {
        return this.isRunning;
    }

    // Optional: For LayoutManager to get current config if needed
    getConfig() {
        return { ...this.settings };
    }

    // Method expected by LayoutManager. Called by LayoutPlugin when a node is pinned/unpinned by UI.
    togglePinNode(nodeId) {
        const node = this.nodesMap.get(nodeId);
        if (node) {
            node.isPinned = !node.isPinned; // Toggle on main thread instance
            // Inform worker about the change. isFixed state in worker is tied to isPinned.
            this.worker.postMessage({
                type: 'updateNodeState',
                payload: { nodeId: node.id, isFixed: node.isPinned, isPinned: node.isPinned }
            });
            if (this.isRunning) this.kick(); // Re-energize simulation
        }
    }

    // Called by LayoutPlugin when dragging starts
    fixNode(node) {
        if (this.nodesMap.has(node.id)) {
            // node.isFixed is a transient state for dragging, separate from isPinned.
            // The worker uses 'isFixed' for its simulation.
             this.worker.postMessage({
                type: 'updateNodeState',
                payload: { nodeId: node.id, isFixed: true, isPinned: node.isPinned,
                           position: {x: node.position.x, y: node.position.y, z: node.position.z }}
            });
        }
    }

    // Called by LayoutPlugin when dragging ends
    releaseNode(node) {
        if (this.nodesMap.has(node.id)) {
            // Release only if not permanently pinned
            if (!node.isPinned) {
                 this.worker.postMessage({
                    type: 'updateNodeState',
                    payload: { nodeId: node.id, isFixed: false, isPinned: node.isPinned }
                });
            }
            // If it was pinned, it remains fixed in the worker.
            // A kick might be good if the node was moved significantly during drag.
            this.kick();
        }
    }


    addNode(node) {
        if (!this.nodesMap.has(node.id)) {
            this.nodesMap.set(node.id, node);
            this.worker.postMessage({
                type: 'addNode',
                payload: {
                    node: {
                        id: node.id,
                        x: node.position.x, y: node.position.y, z: node.position.z,
                        vx: 0, vy: 0, vz: 0,
                        mass: node.mass || 1.0,
                        isFixed: node.isPinned,
                        isPinned: node.isPinned,
                        radius: node.getBoundingSphereRadius(),
                        clusterId: node.data?.clusterId
                    }
                }
            });
            if (this.isRunning || this.nodesMap.size > 1) this.kick();
        }
    }

    removeNode(node) { // Parameter is the actual node object from main thread
        if (this.nodesMap.has(node.id)) {
            this.nodesMap.delete(node.id);
            this.worker.postMessage({ type: 'removeNode', payload: { nodeId: node.id } });
            if (this.isRunning && this.nodesMap.size < 2) this.stop();
            else if (this.isRunning) this.kick();
        }
    }

    addEdge(edge) {
        if (!this.edgesMap.has(edge.id)) {
            this.edgesMap.set(edge.id, edge);
            this.worker.postMessage({
                type: 'addEdge',
                payload: {
                    edge: {
                        id: edge.id, // Worker might not need edge ID, but good for consistency
                        sourceId: edge.source.id,
                        targetId: edge.target.id,
                        constraintType: edge.data.constraintType,
                        constraintParams: edge.data.constraintParams,
                    }
                }
            });
            if (this.isRunning) this.kick();
        }
    }

    removeEdge(edge) { // Parameter is the actual edge object
        if (this.edgesMap.has(edge.id)) {
            this.edgesMap.delete(edge.id);
            // Worker edge removal might be by source/target ID if IDs aren't stored for edges
            this.worker.postMessage({
                type: 'removeEdge',
                payload: {
                    edge: { // Send enough info for worker to identify the edge
                        sourceId: edge.source.id,
                        targetId: edge.target.id
                    }
                }
            });
            if (this.isRunning) this.kick();
        }
    }

    runOnce() {
        // This was for synchronous layout. For worker, it's less direct.
        // We could send a message to worker to run N steps then stop and report.
        // For now, this will just start the continuous layout if not running.
        console.warn("ForceLayout.runOnce() with worker: Starts continuous layout. For fixed steps, implement specific worker command.");
        if (!this.isRunning) this.run();
    }

    // run() is the method LayoutManager calls
    run() {
        if (this.isRunning || this.nodesMap.size < 1) { // Allow starting with 1 node, worker handles <2 check
             // If already running or no nodes, do nothing or re-kick if desired
            if(this.isRunning) this.kick();
            return;
        }
        console.log('ForceLayout (Main): Sending start to worker.');
        this.isRunning = true; // Assume it will start successfully
        this.worker.postMessage({ type: 'start' });
        this.space.emit('layout:started', { name: 'force (worker)' });
    }

    stop() {
        if (!this.isRunning && this.worker) { // Check worker exists in case it's called before full init
             // If worker exists but not running, ensure it's told to stop if it was somehow orphaned.
             this.worker.postMessage({ type: 'stop' });
             return;
        }
        if (!this.worker) return;

        console.log('ForceLayout (Main): Sending stop to worker.');
        this.worker.postMessage({ type: 'stop' });
        // isRunning will be set to false when worker confirms 'stopped' message.
        // Emitting layout:stopped is also handled by worker confirmation.
    }

    kick(intensity = 1) {
        if (this.nodesMap.size < 1 || !this.worker) return;
        console.log('ForceLayout (Main): Sending kick to worker.');
        this.worker.postMessage({ type: 'kick', payload: { intensity } });
        if (!this.isRunning) {
            this.run(); // Start if not already running
        }
    }

    setSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        const gravityCenter = this.settings.gravityCenter;
        const plainGravityCenter = (gravityCenter && typeof gravityCenter.x === 'number')
            ? { x: gravityCenter.x, y: gravityCenter.y, z: gravityCenter.z }
            : { x: 0, y: 0, z: 0 };

        console.log('ForceLayout (Main): Sending settings update to worker.');
        this.worker.postMessage({
            type: 'updateSettings',
            payload: { settings: { ...this.settings, gravityCenter: plainGravityCenter } }
        });
        // Worker will implicitly kick or start if needed upon settings update.
    }

    // _calculateStep is removed, worker handles calculations.
    // Animation loop in main thread is removed.

    dispose() {
        console.log('ForceLayout (Main): Disposing worker.');
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.nodesMap.clear();
        this.edgesMap.clear();
        this.isRunning = false;
        this.space = null; // Release reference to SpaceGraph
        // console.log('ForceLayout (Main) disposed.'); // Already logged by worker indirectly
    }
}
