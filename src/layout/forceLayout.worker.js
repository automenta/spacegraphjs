// forceLayout.worker.js

// Worker state (simplified representation of graph and settings)
let nodes = []; // { id, x, y, z, vx, vy, vz, mass, isFixed, isPinned, radius }
let edges = []; // { sourceId, targetId, constraintType, constraintParams }
let settings = {};

let isRunning = false;
let animationFrameId = null; // Or use setInterval if RAF not ideal in worker for some browsers/scenarios
let totalEnergy = Infinity;
let lastKickTime = 0;

// Placeholder for the core calculation logic, to be moved from ForceLayout.js
function _calculateStepInWorker() {
    if (nodes.length < 2) return 0;
    // --- All the force calculation logic from ForceLayout.js _calculateStep ---
    // --- will go here, operating on the 'nodes' and 'edges' arrays.  ---
    // --- It will update node positions (x,y,z) and velocities (vx,vy,vz) ---
    // --- and return currentTotalEnergy.                                 ---

    // --- Start of actual _calculateStep logic, adapted for worker's data structures ---
    let currentTotalEnergy = 0;
    // `forces` will store {fx, fy, fz} for each node ID
    const nodeForces = new Map(nodes.map((n) => [n.id, { x: 0, y: 0, z: 0 }]));

    const { repulsion, centerStrength, zSpreadFactor, damping, nodePadding } = settings;
    const gravityCenter = settings.gravityCenter || { x: 0, y: 0, z: 0 }; // Ensure settings.gravityCenter is an object

    // Helper for vector operations on simple {x,y,z} objects
    const vecSub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
    const vecLengthSq = (a) => a.x * a.x + a.y * a.y + a.z * a.z;
    const vecNormalize = (a) => {
        const len = Math.sqrt(vecLengthSq(a));
        if (len === 0) return { x: 0, y: 0, z: 0 };
        return { x: a.x / len, y: a.y / len, z: a.z / len };
    };
    const vecScalarMult = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
    const vecAdd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });

    // 1. Repulsion Force (Node-Node)
    for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
            const nodeB = nodes[j];
            let delta = vecSub(nodeB, nodeA); // nodeB.position - nodeA.position
            let distSq = vecLengthSq(delta);

            if (distSq < 1e-3) {
                distSq = 1e-3;
                // Simplified random push for worker
                delta = { x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() - 0.5 };
                delta = vecScalarMult(vecNormalize(delta), 0.1);
            }
            const distance = Math.sqrt(distSq);

            const radiusA = nodeA.radius || 10; // Worker nodes need 'radius' property
            const radiusB = nodeB.radius || 10;
            const combinedRadius = (radiusA + radiusB) * (nodePadding || 1.2);

            let forceMag = -(repulsion || 3000) / distSq;
            const overlap = combinedRadius - distance;
            if (overlap > 0) {
                forceMag -= ((repulsion || 3000) * overlap ** 2 * 0.01) / distance;
            }

            let forceVec = vecScalarMult(vecNormalize(delta), forceMag);
            forceVec.z *= zSpreadFactor || 0.15;

            if (!nodeA.isFixed) {
                const currentForceA = nodeForces.get(nodeA.id);
                nodeForces.set(nodeA.id, vecAdd(currentForceA, forceVec));
            }
            if (!nodeB.isFixed) {
                const currentForceB = nodeForces.get(nodeB.id);
                // Subtract forceVec (equal and opposite)
                nodeForces.set(nodeB.id, vecSub(currentForceB, forceVec));
            }
        }
    }

    // Find node by ID helper
    const findNodeById = (id) => nodes.find((n) => n.id === id);

    // 2. Edge Constraints
    edges.forEach((edge) => {
        const sourceNode = findNodeById(edge.sourceId);
        const targetNode = findNodeById(edge.targetId);

        if (!sourceNode || !targetNode) return;

        let delta = vecSub(targetNode, sourceNode); // target.position - source.position
        const distance = Math.sqrt(vecLengthSq(delta)) + 1e-6;
        let forceMag = 0;
        const params = edge.constraintParams || {};
        const s = settings; // alias for shorter lines

        switch (edge.constraintType) {
            case 'rigid': {
                const targetDist = params.distance ?? (s.defaultElasticIdealLength || 200);
                const rStiffness = params.stiffness ?? (s.defaultRigidStiffness || 0.1);
                forceMag = rStiffness * (distance - targetDist);
                break;
            }
            case 'weld': {
                const weldDist = params.distance ?? (sourceNode.radius || 10) + (targetNode.radius || 10);
                const wStiffness = params.stiffness ?? (s.defaultWeldStiffness || 0.5);
                forceMag = wStiffness * (distance - weldDist);
                break;
            }
            case 'elastic':
            default: {
                const idealLen = params.idealLength ?? (s.defaultElasticIdealLength || 200);
                const eStiffness = params.stiffness ?? (s.defaultElasticStiffness || 0.001);
                forceMag = eStiffness * (distance - idealLen);
                break;
            }
        }
        let forceVec = vecScalarMult(vecNormalize(delta), forceMag);
        forceVec.z *= zSpreadFactor || 0.15;

        if (!sourceNode.isFixed) {
            const currentForceS = nodeForces.get(sourceNode.id);
            nodeForces.set(sourceNode.id, vecAdd(currentForceS, forceVec));
        }
        if (!targetNode.isFixed) {
            const currentForceT = nodeForces.get(targetNode.id);
            nodeForces.set(targetNode.id, vecSub(currentForceT, forceVec));
        }
    });

    // 3. Center Gravity Force
    if ((centerStrength || 0) > 0) {
        nodes.forEach((node) => {
            if (node.isFixed) return;
            // node.position (which is just node {x,y,z})
            let forceVec = vecScalarMult(vecSub(gravityCenter, node), centerStrength);
            forceVec.z *= (zSpreadFactor || 0.15) * 0.5;
            const currentForce = nodeForces.get(node.id);
            nodeForces.set(node.id, vecAdd(currentForce, forceVec));
        });
    }

    // 4. Clustering (Simplified for worker - assumes node.data.clusterId is available as node.clusterId)
    if (settings.enableClustering && (settings.clusterStrength || 0) > 0) {
        const clusters = new Map(); // { clusterId: { nodes: [], centerX:0, centerY:0, centerZ:0, count:0 }}
        nodes.forEach((node) => {
            const clusterId = node.clusterId; // Assuming clusterId is directly on the worker node data
            if (clusterId === undefined || clusterId === null) return;
            if (!clusters.has(clusterId)) {
                clusters.set(clusterId, { nodeIds: [], centerX: 0, centerY: 0, centerZ: 0, count: 0 });
            }
            const clusterData = clusters.get(clusterId);
            clusterData.nodeIds.push(node.id);
            clusterData.centerX += node.x;
            clusterData.centerY += node.y;
            clusterData.centerZ += node.z;
            clusterData.count++;
        });

        clusters.forEach((clusterData) => {
            if (clusterData.count > 0) {
                const clusterCenter = {
                    x: clusterData.centerX / clusterData.count,
                    y: clusterData.centerY / clusterData.count,
                    z: clusterData.centerZ / clusterData.count,
                };
                clusterData.nodeIds.forEach((nodeId) => {
                    const node = findNodeById(nodeId);
                    if (node && !node.isFixed) {
                        let forceVec = vecScalarMult(vecSub(clusterCenter, node), settings.clusterStrength);
                        forceVec.z *= zSpreadFactor || 0.15;
                        const currentForce = nodeForces.get(node.id);
                        nodeForces.set(node.id, vecAdd(currentForce, forceVec));
                    }
                });
            }
        });
    }

    // 5. Apply Forces and Update Velocities/Positions
    nodes.forEach((node) => {
        if (node.isFixed) return;
        const force = nodeForces.get(node.id);
        // Ensure node has velocity properties (vx, vy, vz)
        node.vx = node.vx || 0;
        node.vy = node.vy || 0;
        node.vz = node.vz || 0;

        const mass = node.mass || 1.0;
        const acceleration = vecScalarMult(force, 1.0 / mass);

        node.vx = (node.vx + acceleration.x) * (damping || 0.92);
        node.vy = (node.vy + acceleration.y) * (damping || 0.92);
        node.vz = (node.vz + acceleration.z) * (damping || 0.92);

        // Add guard for NaN/Infinite velocities
        if (!isFinite(node.vx) || !isFinite(node.vy) || !isFinite(node.vz)) {
            // console.warn(`Worker: Node ${node.id} has NaN/Infinite velocity. Resetting. V:(${node.vx}, ${node.vy}, ${node.vz})`);
            node.vx = 0;
            node.vy = 0;
            node.vz = 0;
        }

        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy + node.vz * node.vz);
        const maxSpeed = settings.maxSpeed || 100; // Add maxSpeed to settings if needed
        if (speed > maxSpeed) {
            const factor = maxSpeed / speed;
            node.vx *= factor;
            node.vy *= factor;
            node.vz *= factor;
        }

        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;

        // Add guard for NaN/Infinite positions
        if (!isFinite(node.x) || !isFinite(node.y) || !isFinite(node.z)) {
            // console.warn(`Worker: Node ${node.id} position became NaN/Infinite. Resetting. Pos:(${node.x}, ${node.y}, ${node.z}), Vel:(${node.vx}, ${node.vy}, ${node.vz})`);
            // Reset to origin and zero velocity to stabilize.
            // Consider if lastKnownGoodPosition would be better if stored.
            node.x = 0; node.y = 0; node.z = 0;
            node.vx = 0; node.vy = 0; node.vz = 0; // Also reset velocity to prevent re-occurrence if velocity was the cause
        }

        currentTotalEnergy += 0.5 * mass * (node.vx * node.vx + node.vy * node.vy + node.vz * node.vz);
    });
    // --- End of actual _calculateStep logic ---
    return currentTotalEnergy;
}

function startSimulation() {
    if (isRunning || nodes.length < 2) return;
    console.log('ForceLayout Worker: Starting simulation.');
    isRunning = true;
    lastKickTime = Date.now();

    const loop = () => {
        if (!isRunning) return;
        totalEnergy = _calculateStepInWorker();

        // Post updated positions back to the main thread
        const positionsUpdate = nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, z: n.z }));
        self.postMessage({ type: 'positionsUpdate', positions: positionsUpdate, energy: totalEnergy });

        const timeSinceKick = Date.now() - lastKickTime;
        if (
            settings.autoStopDelay &&
            totalEnergy < (settings.minEnergyThreshold || 0.1) &&
            timeSinceKick > settings.autoStopDelay
        ) {
            stopSimulation();
        } else {
            // Using setTimeout for a consistent loop, requestAnimationFrame might behave differently in workers.
            // A common practice is to use setInterval or a self-calling setTimeout.
            setTimeout(loop, 16); // Aim for ~60 FPS updates
        }
    };
    loop();
}

function stopSimulation() {
    if (!isRunning) return;
    isRunning = false;
    console.log('ForceLayout Worker: Simulation stopped. Energy:', totalEnergy.toFixed(4));
    self.postMessage({ type: 'stopped', energy: totalEnergy });
}

self.onmessage = function (event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'init':
            console.log('ForceLayout Worker: Initializing...', payload);
            nodes = payload.nodes; // Expecting simplified node data
            edges = payload.edges; // Expecting simplified edge data
            settings = payload.settings;
            nodes.forEach((n) => {
                // Ensure velocities exist
                n.vx = n.vx || 0;
                n.vy = n.vy || 0;
                n.vz = n.vz || 0;
            });
            break;
        case 'start':
            startSimulation();
            break;
        case 'stop':
            stopSimulation();
            break;
        case 'updateSettings':
            settings = { ...settings, ...payload.settings };
            console.log('ForceLayout Worker: Settings updated.', settings);
            if (isRunning)
                lastKickTime = Date.now(); // Re-kick implicitly if running
            else if (nodes.length > 0) startSimulation(); // Start if not running but has nodes
            break;
        case 'kick':
            console.log('ForceLayout Worker: Kick received.');
            if (nodes.length > 0) {
                lastKickTime = Date.now();
                totalEnergy = Infinity; // Reset energy
                // Simplified kick: just randomize velocities slightly
                nodes.forEach((node) => {
                    if (!node.isFixed) {
                        node.vx += (Math.random() - 0.5) * (payload.intensity || 1);
                        node.vy += (Math.random() - 0.5) * (payload.intensity || 1);
                        node.vz += (Math.random() - 0.5) * (payload.intensity || 1) * (settings.zSpreadFactor || 0.1);
                    }
                });
                if (!isRunning) startSimulation();
            }
            break;
        case 'addNode': {
            const newNode = payload.node;
            newNode.vx = 0;
            newNode.vy = 0;
            newNode.vz = 0;
            nodes.push(newNode);
            if (!isRunning && nodes.length > 0) startSimulation();
            else if (isRunning) lastKickTime = Date.now();
            break;
        }
        case 'removeNode': {
            const nodeId = payload.nodeId;
            nodes = nodes.filter((n) => n.id !== nodeId);
            if (nodes.length < 2 && isRunning) stopSimulation();
            else if (isRunning) lastKickTime = Date.now();
            break;
        }
        case 'addEdge':
            edges.push(payload.edge);
            if (isRunning) lastKickTime = Date.now();
            break;
        case 'removeEdge':
            edges = edges.filter(
                (e) => !(e.sourceId === payload.edge.sourceId && e.targetId === payload.edge.targetId)
            ); // Simple removal
            if (isRunning) lastKickTime = Date.now();
            break;
        case 'updateNodeState': {
            // For isPinned, isFixed changes
            const { nodeId, isFixed, isPinned, position } = payload;
            const node = nodes.find((n) => n.id === nodeId);
            if (node) {
                node.isFixed = isFixed;
                node.isPinned = isPinned;
                if (isFixed) {
                    node.vx = 0;
                    node.vy = 0;
                    node.vz = 0;
                }
                if (position) {
                    // If position is also updated (e.g. during drag)
                    node.x = position.x;
                    node.y = position.y;
                    node.z = position.z;
                }
            }
            if (isRunning) lastKickTime = Date.now();
            break;
        }
        default:
            console.warn('ForceLayout Worker: Unknown message type:', type);
    }
};

console.log('ForceLayout Worker: Initialized and ready.');
