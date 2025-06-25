let nodes = [];
let edges = [];
let settings = {};

let isRunning = false;
let totalEnergy = Infinity;
let lastKickTime = 0;

function _calculateStepInWorker() {
    if (nodes.length < 2) return 0;

    let currentTotalEnergy = 0;
    const nodeForces = new Map(nodes.map((n) => [n.id, { x: 0, y: 0, z: 0 }]));

    const { repulsion, centerStrength, zSpreadFactor, damping } = settings;
    const gravityCenter = settings.gravityCenter || { x: 0, y: 0, z: 0 };
    const nodePadding = settings.nodePadding || 1.2;

    const vecSub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
    const vecLengthSq = (a) => a.x * a.x + a.y * a.y + a.z * a.z;
    const vecNormalize = (a) => {
        const len = Math.sqrt(vecLengthSq(a));
        return len === 0 ? { x: 0, y: 0, z: 0 } : { x: a.x / len, y: a.y / len, z: a.z / len };
    };
    const vecScalarMult = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
    const vecAdd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });

    for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
            const nodeB = nodes[j];
            let delta = vecSub(nodeB, nodeA);
            let distSq = vecLengthSq(delta);

            if (distSq < 1e-3) {
                distSq = 1e-3;
                delta = vecScalarMult(vecNormalize({ x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() - 0.5 }), 0.1);
            }
            const distance = Math.sqrt(distSq);

            const radiusA = nodeA.radius || 10;
            const radiusB = nodeB.radius || 10;
            const combinedRadius = (radiusA + radiusB) * nodePadding;

            let forceMag = -repulsion / distSq;
            const overlap = combinedRadius - distance;
            if (overlap > 0) forceMag -= (repulsion * overlap ** 2 * 0.01) / distance;

            let forceVec = vecScalarMult(vecNormalize(delta), forceMag);
            forceVec.z *= zSpreadFactor;

            if (!nodeA.isFixed) nodeForces.set(nodeA.id, vecAdd(nodeForces.get(nodeA.id), forceVec));
            if (!nodeB.isFixed) nodeForces.set(nodeB.id, vecSub(nodeForces.get(nodeB.id), forceVec));
        }
    }

    const findNodeById = (id) => nodes.find((n) => n.id === id);

    edges.forEach((edge) => {
        const sourceNode = findNodeById(edge.sourceId);
        const targetNode = findNodeById(edge.targetId);

        if (!sourceNode || !targetNode) return;

        let delta = vecSub(targetNode, sourceNode);
        const distance = Math.sqrt(vecLengthSq(delta)) + 1e-6;
        let forceMag = 0;
        const params = edge.constraintParams || {};
        const s = settings;

        switch (edge.constraintType) {
            case 'rigid':
                forceMag = (params.stiffness ?? s.defaultRigidStiffness) * (distance - (params.distance ?? s.defaultElasticIdealLength));
                break;
            case 'weld':
                forceMag = (params.stiffness ?? s.defaultWeldStiffness) * (distance - (params.distance ?? (sourceNode.radius || 10) + (targetNode.radius || 10)));
                break;
            case 'elastic':
            default:
                forceMag = (params.stiffness ?? s.defaultElasticStiffness) * (distance - (params.idealLength ?? s.defaultElasticIdealLength));
                break;
        }
        let forceVec = vecScalarMult(vecNormalize(delta), forceMag);
        forceVec.z *= zSpreadFactor;

        if (!sourceNode.isFixed) nodeForces.set(sourceNode.id, vecAdd(nodeForces.get(sourceNode.id), forceVec));
        if (!targetNode.isFixed) nodeForces.set(targetNode.id, vecSub(nodeForces.get(targetNode.id), forceVec));
    });

    if (centerStrength > 0) {
        nodes.forEach((node) => {
            if (node.isFixed) return;
            let forceVec = vecScalarMult(vecSub(gravityCenter, node), centerStrength);
            forceVec.z *= zSpreadFactor * 0.5;
            nodeForces.set(node.id, vecAdd(nodeForces.get(node.id), forceVec));
        });
    }

    if (settings.enableClustering && settings.clusterStrength > 0) {
        const clusters = new Map();
        nodes.forEach((node) => {
            const clusterId = node.clusterId;
            if (clusterId === undefined || clusterId === null) return;
            clusters.has(clusterId) || clusters.set(clusterId, { nodeIds: [], centerX: 0, centerY: 0, centerZ: 0, count: 0 });
            const clusterData = clusters.get(clusterId);
            clusterData.nodeIds.push(node.id);
            clusterData.centerX += node.x;
            clusterData.centerY += node.y;
            clusterData.centerZ += node.z;
            clusterData.count++;
        });

        clusters.forEach((clusterData) => {
            if (clusterData.count === 0) return;
            const clusterCenter = {
                x: clusterData.centerX / clusterData.count,
                y: clusterData.centerY / clusterData.count,
                z: clusterData.centerZ / clusterData.count,
            };
            clusterData.nodeIds.forEach((nodeId) => {
                const node = findNodeById(nodeId);
                if (!node || node.isFixed) return;
                let forceVec = vecScalarMult(vecSub(clusterCenter, node), settings.clusterStrength);
                forceVec.z *= zSpreadFactor;
                nodeForces.set(node.id, vecAdd(nodeForces.get(node.id), forceVec));
            });
        });
    }

    nodes.forEach((node) => {
        if (node.isFixed) return;
        const force = nodeForces.get(node.id);
        node.vx = (node.vx || 0); node.vy = (node.vy || 0); node.vz = (node.vz || 0);

        const acceleration = vecScalarMult(force, 1.0 / (node.mass || 1.0));

        node.vx = (node.vx + acceleration.x) * damping;
        node.vy = (node.vy + acceleration.y) * damping;
        node.vz = (node.vz + acceleration.z) * damping;

        if (!isFinite(node.vx) || !isFinite(node.vy) || !isFinite(node.vz)) {
            node.vx = 0; node.vy = 0; node.vz = 0;
        }

        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy + node.vz * node.vz);
        const maxSpeed = settings.maxSpeed || 100;
        if (speed > maxSpeed) {
            const factor = maxSpeed / speed;
            node.vx *= factor; node.vy *= factor; node.vz *= factor;
        }

        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;

        if (!isFinite(node.x) || !isFinite(node.y) || !isFinite(node.z)) {
            node.x = 0; node.y = 0; node.z = 0;
            node.vx = 0; node.vy = 0; node.vz = 0;
        }

        currentTotalEnergy += 0.5 * (node.mass || 1.0) * (node.vx * node.vx + node.vy * node.vy + node.vz * node.vz);
    });
    return currentTotalEnergy;
}

function startSimulation() {
    if (isRunning || nodes.length < 2) return;
    isRunning = true;
    lastKickTime = Date.now();

    const loop = () => {
        if (!isRunning) return;
        totalEnergy = _calculateStepInWorker();

        self.postMessage({ type: 'positionsUpdate', positions: nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, z: n.z })), energy: totalEnergy });

        const timeSinceKick = Date.now() - lastKickTime;
        if (settings.autoStopDelay && totalEnergy < settings.minEnergyThreshold && timeSinceKick > settings.autoStopDelay) {
            stopSimulation();
        } else {
            setTimeout(loop, 16);
        }
    };
    loop();
}

function stopSimulation() {
    if (!isRunning) return;
    isRunning = false;
    self.postMessage({ type: 'stopped', energy: totalEnergy });
}

self.onmessage = function (event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'init':
            nodes = payload.nodes;
            edges = payload.edges;
            settings = payload.settings;
            nodes.forEach((n) => { n.vx = n.vx || 0; n.vy = n.vy || 0; n.vz = n.vz || 0; });
            break;
        case 'start':
            startSimulation();
            break;
        case 'stop':
            stopSimulation();
            break;
        case 'updateSettings':
            settings = { ...settings, ...payload.settings };
            if (isRunning) lastKickTime = Date.now();
            else if (nodes.length > 0) startSimulation();
            break;
        case 'kick':
            if (nodes.length === 0) break;
            lastKickTime = Date.now();
            totalEnergy = Infinity;
            nodes.forEach((node) => {
                if (!node.isFixed) {
                    node.vx += (Math.random() - 0.5) * (payload.intensity || 1);
                    node.vy += (Math.random() - 0.5) * (payload.intensity || 1);
                    node.vz += (Math.random() - 0.5) * (payload.intensity || 1) * settings.zSpreadFactor;
                }
            });
            if (!isRunning) startSimulation();
            break;
        case 'addNode': {
            const newNode = payload.node;
            newNode.vx = 0; newNode.vy = 0; newNode.vz = 0;
            nodes.push(newNode);
            if (!isRunning && nodes.length > 0) startSimulation();
            else if (isRunning) lastKickTime = Date.now();
            break;
        }
        case 'removeNode': {
            nodes = nodes.filter((n) => n.id !== payload.nodeId);
            if (nodes.length < 2 && isRunning) stopSimulation();
            else if (isRunning) lastKickTime = Date.now();
            break;
        }
        case 'addEdge':
            edges.push(payload.edge);
            if (isRunning) lastKickTime = Date.now();
            break;
        case 'removeEdge':
            edges = edges.filter((e) => !(e.sourceId === payload.sourceId && e.targetId === payload.targetId));
            if (isRunning) lastKickTime = Date.now();
            break;
        case 'updateNodeState': {
            const { nodeId, isFixed, isPinned, position } = payload;
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) break;
            node.isFixed = isFixed;
            node.isPinned = isPinned;
            if (isFixed) node.vx = node.vy = node.vz = 0;
            if (position) { node.x = position.x; node.y = position.y; node.z = position.z; }
            if (isRunning) lastKickTime = Date.now();
            break;
        }
        default:
            console.warn('ForceLayout Worker: Unknown message type:', type);
    }
};
