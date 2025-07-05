/**
 * LayoutWorker - Web Worker for heavy layout calculations
 * Handles force-directed layout, hierarchical layout, and other computationally intensive layouts
 */

// Worker state
let isRunning = false;
let layoutType = 'force';
let nodes = [];
let edges = [];
let config = {};
let animationId = null;

// Layout algorithms
const layouts = {
    force: forceDirectedLayout,
    hierarchical: hierarchicalLayout,
    circular: circularLayout,
    grid: gridLayout
};

/**
 * Message handler for worker communication
 */
self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'init':
            initLayout(data);
            break;
        case 'update':
            updateLayout(data);
            break;
        case 'step':
            stepLayout();
            break;
        case 'start':
            startLayout();
            break;
        case 'stop':
            stopLayout();
            break;
        case 'configure':
            configureLayout(data);
            break;
        default:
            console.error('Unknown message type:', type);
    }
};

/**
 * Initialize layout with nodes and edges
 */
function initLayout(data) {
    nodes = data.nodes || [];
    edges = data.edges || [];
    config = data.config || {};
    layoutType = data.layoutType || 'force';
    
    // Initialize node velocities and forces for physics-based layouts
    nodes.forEach(node => {
        node.vx = node.vx || 0;
        node.vy = node.vy || 0;
        node.vz = node.vz || 0;
        node.fx = 0;
        node.fy = 0;
        node.fz = 0;
    });
    
    self.postMessage({
        type: 'initialized',
        data: { nodeCount: nodes.length, edgeCount: edges.length }
    });
}

/**
 * Update layout data
 */
function updateLayout(data) {
    if (data.nodes) nodes = data.nodes;
    if (data.edges) edges = data.edges;
    if (data.config) config = { ...config, ...data.config };
    if (data.layoutType) layoutType = data.layoutType;
}

/**
 * Start continuous layout calculation
 */
function startLayout() {
    if (isRunning) return;
    
    isRunning = true;
    animationId = setInterval(() => {
        stepLayout();
    }, 16); // ~60 FPS
    
    self.postMessage({ type: 'started' });
}

/**
 * Stop layout calculation
 */
function stopLayout() {
    if (!isRunning) return;
    
    isRunning = false;
    if (animationId) {
        clearInterval(animationId);
        animationId = null;
    }
    
    self.postMessage({ type: 'stopped' });
}

/**
 * Perform one step of layout calculation
 */
function stepLayout() {
    if (nodes.length === 0) return;
    
    const layoutFunction = layouts[layoutType];
    if (!layoutFunction) {
        console.error('Unknown layout type:', layoutType);
        return;
    }
    
    const startTime = performance.now();
    
    // Calculate new positions
    const result = layoutFunction(nodes, edges, config);
    
    const endTime = performance.now();
    const computeTime = endTime - startTime;
    
    // Send results back to main thread
    self.postMessage({
        type: 'step',
        data: {
            nodes: result.nodes,
            converged: result.converged,
            iteration: result.iteration,
            energy: result.energy,
            computeTime: computeTime
        }
    });
}

/**
 * Configure layout parameters
 */
function configureLayout(newConfig) {
    config = { ...config, ...newConfig };
    self.postMessage({ type: 'configured', data: config });
}

/**
 * Force-directed layout algorithm (Fruchterman-Reingold)
 */
function forceDirectedLayout(nodes, edges, config) {
    const {
        width = 1000,
        height = 1000,
        depth = 1000,
        iterations = 1,
        temperature = 100,
        cooling = 0.99,
        repulsionStrength = 1000,
        attractionStrength = 1,
        minDistance = 10,
        maxDistance = 200,
        damping = 0.9
    } = config;
    
    let currentTemp = temperature;
    let totalEnergy = 0;
    
    for (let iter = 0; iter < iterations; iter++) {
        // Reset forces
        nodes.forEach(node => {
            node.fx = 0;
            node.fy = 0;
            node.fz = 0;
        });
        
        // Repulsion forces (all pairs)
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeA = nodes[i];
                const nodeB = nodes[j];
                
                const dx = nodeB.x - nodeA.x || 0.1; // Avoid division by zero
                const dy = nodeB.y - nodeA.y || 0.1;
                const dz = nodeB.z - nodeA.z || 0.1;
                
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                if (distance > 0 && distance < maxDistance) {
                    const force = repulsionStrength / (distance * distance);
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;
                    const fz = (dz / distance) * force;
                    
                    nodeA.fx -= fx;
                    nodeA.fy -= fy;
                    nodeA.fz -= fz;
                    nodeB.fx += fx;
                    nodeB.fy += fy;
                    nodeB.fz += fz;
                }
            }
        }
        
        // Attraction forces (connected nodes)
        edges.forEach(edge => {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);
            
            if (!source || !target) return;
            
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dz = target.z - source.z;
            
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (distance > minDistance) {
                const force = attractionStrength * distance;
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;
                const fz = (dz / distance) * force;
                
                source.fx += fx;
                source.fy += fy;
                source.fz += fz;
                target.fx -= fx;
                target.fy -= fy;
                target.fz -= fz;
            }
        });
        
        // Apply forces and update positions
        nodes.forEach(node => {
            // Update velocity with damping
            node.vx = (node.vx + node.fx) * damping;
            node.vy = (node.vy + node.fy) * damping;
            node.vz = (node.vz + node.fz) * damping;
            
            // Limit velocity by temperature
            const velocity = Math.sqrt(node.vx * node.vx + node.vy * node.vy + node.vz * node.vz);
            if (velocity > currentTemp) {
                const scale = currentTemp / velocity;
                node.vx *= scale;
                node.vy *= scale;
                node.vz *= scale;
            }
            
            // Update position
            node.x += node.vx;
            node.y += node.vy;
            node.z += node.vz;
            
            // Calculate energy for convergence detection
            totalEnergy += velocity * velocity;
        });
        
        // Cool down
        currentTemp *= cooling;
    }
    
    // Check convergence
    const avgEnergy = totalEnergy / nodes.length;
    const converged = avgEnergy < 0.1;
    
    return {
        nodes: nodes,
        converged: converged,
        iteration: iterations,
        energy: avgEnergy
    };
}

/**
 * Hierarchical layout algorithm
 */
function hierarchicalLayout(nodes, edges, config) {
    const {
        levelSeparation = 200,
        nodeSeparation = 100,
        direction = 'vertical'
    } = config;
    
    // Build hierarchy
    const levels = new Map();
    const visited = new Set();
    const roots = nodes.filter(node => 
        !edges.some(edge => edge.target === node.id)
    );
    
    if (roots.length === 0 && nodes.length > 0) {
        roots.push(nodes[0]); // Fallback root
    }
    
    // BFS to assign levels
    const queue = roots.map(root => ({ node: root, level: 0 }));
    
    while (queue.length > 0) {
        const { node, level } = queue.shift();
        
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        
        if (!levels.has(level)) {
            levels.set(level, []);
        }
        levels.get(level).push(node);
        
        // Add children to queue
        edges.forEach(edge => {
            if (edge.source === node.id) {
                const childNode = nodes.find(n => n.id === edge.target);
                if (childNode && !visited.has(childNode.id)) {
                    queue.push({ node: childNode, level: level + 1 });
                }
            }
        });
    }
    
    // Position nodes
    levels.forEach((levelNodes, level) => {
        levelNodes.forEach((node, index) => {
            if (direction === 'vertical') {
                node.x = (index - levelNodes.length / 2) * nodeSeparation;
                node.y = -level * levelSeparation;
                node.z = 0;
            } else {
                node.x = level * levelSeparation;
                node.y = (index - levelNodes.length / 2) * nodeSeparation;
                node.z = 0;
            }
        });
    });
    
    return {
        nodes: nodes,
        converged: true,
        iteration: 1,
        energy: 0
    };
}

/**
 * Circular layout algorithm
 */
function circularLayout(nodes, edges, config) {
    const {
        radius = 300,
        startAngle = 0
    } = config;
    
    const angleStep = (2 * Math.PI) / nodes.length;
    
    nodes.forEach((node, index) => {
        const angle = startAngle + index * angleStep;
        node.x = Math.cos(angle) * radius;
        node.y = Math.sin(angle) * radius;
        node.z = 0;
    });
    
    return {
        nodes: nodes,
        converged: true,
        iteration: 1,
        energy: 0
    };
}

/**
 * Grid layout algorithm
 */
function gridLayout(nodes, edges, config) {
    const {
        spacing = 100,
        columns = Math.ceil(Math.sqrt(nodes.length))
    } = config;
    
    nodes.forEach((node, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        
        node.x = col * spacing - (columns * spacing) / 2;
        node.y = row * spacing - (Math.ceil(nodes.length / columns) * spacing) / 2;
        node.z = 0;
    });
    
    return {
        nodes: nodes,
        converged: true,
        iteration: 1,
        energy: 0
    };
}

// Send ready signal
self.postMessage({ type: 'ready' });