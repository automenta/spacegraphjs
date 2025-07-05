import * as THREE from 'three';

export class ForceLayout {
    space = null;
    nodesMap = new Map();
    edgesMap = new Map();

    worker = null;
    isRunning = false;
    totalEnergy = Infinity;

    settings = {
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
        clusterAttribute: 'clusterId',
        clusterStrength: 0.005,
    };

    constructor(config = {}) {
        this.settings = { ...this.settings, ...config };
        this.worker = new Worker(new URL('./forceLayout.worker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = this._handleWorkerMessage.bind(this);
        this.worker.onerror = (error) => {
            console.error('ForceLayout Worker Error:', error);
            this.isRunning = false;
            this.space.emit('layout:error', { error });
        };
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    _handleWorkerMessage(event) {
        const { type, positions, energy, error } = event.data;
        switch (type) {
            case 'positionsUpdate':
                this.totalEnergy = energy;
                positions.forEach((p) => {
                    const node = this.nodesMap.get(p.id);
                    node?.position.set(p.x, p.y, p.z);
                });
                break;
            case 'stopped':
                this.isRunning = false;
                this.totalEnergy = energy;
                this.space.emit('layout:stopped', { name: 'force (worker)' });
                break;
            case 'error':
                console.error('ForceLayout Worker error:', error);
                this.space.emit('layout:error', { error });
                break;
        }
    }

    init(initialNodes, initialEdges, config = {}) {
        this.nodesMap.clear();
        initialNodes.forEach((n) => this.nodesMap.set(n.id, n));

        this.edgesMap.clear();
        initialEdges.forEach((e) => this.edgesMap.set(e.id, e));

        this.settings = { ...this.settings, ...config };

        const workerNodes = initialNodes.map((n) => ({
            id: n.id,
            x: n.position.x,
            y: n.position.y,
            z: n.position.z,
            vx: 0, vy: 0, vz: 0,
            mass: n.mass || 1.0,
            isFixed: n.isPinned,
            isPinned: n.isPinned,
            radius: n.getBoundingSphereRadius(),
            clusterId: n.data?.clusterId,
        }));

        const workerEdges = initialEdges.map((e) => ({
            sourceId: e.source.id,
            targetId: e.target.id,
            constraintType: e.data.constraintType,
            constraintParams: e.data.constraintParams,
        }));

        const plainGravityCenter = this.settings.gravityCenter && typeof this.settings.gravityCenter.x === 'number'
            ? { x: this.settings.gravityCenter.x, y: this.settings.gravityCenter.y, z: this.settings.gravityCenter.z }
            : { x: 0, y: 0, z: 0 };

        this.worker.postMessage({
            type: 'init',
            payload: {
                nodes: workerNodes,
                edges: workerEdges,
                settings: { ...this.settings, gravityCenter: plainGravityCenter },
            },
        });
    }

    isRunningCheck() {
        return this.isRunning;
    }

    getConfig() {
        return { ...this.settings };
    }

    setPinState(node, isPinned) {
        if (!this.nodesMap.has(node.id)) return;
        node.isPinned = isPinned;
        this.worker.postMessage({
            type: 'updateNodeState',
            payload: { nodeId: node.id, isFixed: node.isPinned, isPinned: node.isPinned },
        });
        if (this.isRunning) this.kick();
    }

    fixNode(node) {
        if (!this.nodesMap.has(node.id)) return;
        this.worker.postMessage({
            type: 'updateNodeState',
            payload: {
                nodeId: node.id,
                isFixed: true,
                isPinned: node.isPinned,
                position: { x: node.position.x, y: node.position.y, z: node.position.z },
            },
        });
    }

    releaseNode(node) {
        if (!this.nodesMap.has(node.id)) return;
        if (!node.isPinned) {
            this.worker.postMessage({
                type: 'updateNodeState',
                payload: { nodeId: node.id, isFixed: false, isPinned: node.isPinned },
            });
        }
        this.kick();
    }

    addNode(node) {
        // Defensive checks
        if (typeof node !== 'object' || node === null) {
            console.warn('ForceLayout.addNode: Received non-object node:', node);
            return;
        }
        if (typeof node.id === 'undefined') { // Ensure node has an id for map keying
            console.warn('ForceLayout.addNode: Node has no id. Skipping.', node);
            return;
        }

        // Check if node already processed
        if (this.nodesMap.has(node.id)) return;

        // Ensure position is valid or provide a default
        let { x = 0, y = 0, z = 0 } = node.position || {};
        if (typeof node.position !== 'object' || node.position === null) {
            console.warn(`ForceLayout.addNode: Node ${node.id} is missing a valid position object. Defaulting to {x:0, y:0, z:0}. Node:`, node);
            // node.position will be used below, so ensure it's an object if we didn't default x,y,z from it
        }

        this.nodesMap.set(node.id, node);

        // Ensure default values for potentially missing properties before sending to worker
        const mass = node.mass || 1.0;
        const isPinned = node.isPinned || false;
        // Check if getBoundingSphereRadius is a function, otherwise use a default.
        const radius = typeof node.getBoundingSphereRadius === 'function' ? node.getBoundingSphereRadius() : 50;
        const clusterId = node.data?.clusterId; // data itself could be undefined

        this.worker.postMessage({
            type: 'addNode',
            payload: {
                node: {
                    id: node.id,
                    x: x,
                    y: y,
                    z: z,
                    vx: 0, vy: 0, vz: 0,
                    mass: mass,
                    isFixed: isPinned, // In ForceLayout worker, isFixed is the primary property for pinning behavior
                    isPinned: isPinned, // Keep isPinned for consistency if worker uses it or for future reference
                    radius: radius,
                    clusterId: clusterId,
                },
            },
        });
        if (this.isRunning || this.nodesMap.size > 1) this.kick();
    }

    removeNode(node) {
        if (!this.nodesMap.has(node.id)) return;
        this.nodesMap.delete(node.id);
        this.worker.postMessage({ type: 'removeNode', payload: { nodeId: node.id } });
        if (this.isRunning && this.nodesMap.size < 2) this.stop();
        else if (this.isRunning) this.kick();
    }

    addEdge(edge) {
        if (this.edgesMap.has(edge.id)) return;
        this.edgesMap.set(edge.id, edge);
        this.worker.postMessage({
            type: 'addEdge',
            payload: {
                edge: {
                    id: edge.id,
                    sourceId: edge.source.id,
                    targetId: edge.target.id,
                    constraintType: edge.data.constraintType,
                    constraintParams: edge.data.constraintParams,
                },
            },
        });
        if (this.isRunning) this.kick();
    }

    removeEdge(edge) {
        if (!this.edgesMap.has(edge.id)) return;
        this.edgesMap.delete(edge.id);
        this.worker.postMessage({
            type: 'removeEdge',
            payload: { sourceId: edge.source.id, targetId: edge.target.id },
        });
        if (this.isRunning) this.kick();
    }

    runOnce() {
        if (!this.isRunning) this.run();
    }

    run() {
        if (this.isRunning || this.nodesMap.size < 1) {
            if (this.isRunning) this.kick();
            return;
        }
        this.isRunning = true;
        this.worker.postMessage({ type: 'start' });
        this.space.emit('layout:started', { name: 'force (worker)' });
    }

    stop() {
        if (!this.worker) return;
        this.worker.postMessage({ type: 'stop' });
    }

    kick(intensity = 1) {
        if (this.nodesMap.size < 1 || !this.worker) return;
        this.worker.postMessage({ type: 'kick', payload: { intensity } });
        if (!this.isRunning) this.run();
    }

    setSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        const plainGravityCenter = this.settings.gravityCenter && typeof this.settings.gravityCenter.x === 'number'
            ? { x: this.settings.gravityCenter.x, y: this.settings.gravityCenter.y, z: this.settings.gravityCenter.z }
            : { x: 0, y: 0, z: 0 };

        this.worker.postMessage({
            type: 'updateSettings',
            payload: { settings: { ...this.settings, gravityCenter: plainGravityCenter } },
        });
    }

    dispose() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.nodesMap.clear();
        this.edgesMap.clear();
        this.isRunning = false;
        this.space = null;
    }
}
