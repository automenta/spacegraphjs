import * as THREE from 'three';
import { gsap } from 'gsap';

export class LayoutConnector {
    space = null;
    pluginManager = null;
    settings = {
        connectionTypes: ['direct', 'orthogonal', 'curved', 'bundled'],
        defaultConnectionType: 'curved',
        routingPadding: 30,
        bundlingThreshold: 3,
        bundlingRadius: 50,
        animate: true,
        animationDuration: 0.6,
        avoidOverlaps: true,
        maxDetourFactor: 2.0,
        connectionStrength: 0.5
    };

    connections = new Map();
    layoutRegions = new Map();
    routingGraph = new Map();
    connectionPaths = new Map();
    isActive = false;

    constructor(config = {}) {
        this.settings = { ...this.settings, ...config };
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    registerLayoutRegion(regionId, bounds, layoutType, nodes = []) {
        this.layoutRegions.set(regionId, {
            id: regionId,
            bounds,
            layoutType,
            nodes: new Set(nodes.map(n => n.id)),
            connectionPoints: this._calculateConnectionPoints(bounds),
            obstacles: this._createObstaclesFromNodes(nodes, bounds)
        });

        this._updateRoutingGraph();
    }

    unregisterLayoutRegion(regionId) {
        this.layoutRegions.delete(regionId);
        this._updateRoutingGraph();
        
        // Remove connections involving this region
        this.connections.forEach((connection, connectionId) => {
            if (connection.sourceRegion === regionId || connection.targetRegion === regionId) {
                this.removeConnection(connectionId);
            }
        });
    }

    addConnection(sourceNodeId, targetNodeId, options = {}) {
        const connectionId = `${sourceNodeId}-${targetNodeId}`;
        const sourceRegion = this._findNodeRegion(sourceNodeId);
        const targetRegion = this._findNodeRegion(targetNodeId);

        if (!sourceRegion || !targetRegion) {
            console.warn(`LayoutConnector: Could not find regions for nodes ${sourceNodeId} -> ${targetNodeId}`);
            return null;
        }

        const connection = {
            id: connectionId,
            sourceNodeId,
            targetNodeId,
            sourceRegion: sourceRegion.id,
            targetRegion: targetRegion.id,
            type: options.type || this.settings.defaultConnectionType,
            strength: options.strength || this.settings.connectionStrength,
            metadata: options.metadata || {},
            path: null,
            visualElement: null
        };

        this.connections.set(connectionId, connection);
        this._routeConnection(connection);
        
        return connectionId;
    }

    removeConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        if (connection.visualElement) {
            this._removeVisualElement(connection.visualElement);
        }

        this.connections.delete(connectionId);
        this.connectionPaths.delete(connectionId);
    }

    _findNodeRegion(nodeId) {
        for (const [regionId, region] of this.layoutRegions) {
            if (region.nodes.has(nodeId)) {
                return region;
            }
        }
        return null;
    }

    _calculateConnectionPoints(bounds) {
        const { min, max, center } = bounds;
        const points = [];

        // Edge midpoints
        points.push(
            new THREE.Vector3(center.x, max.y, center.z), // top
            new THREE.Vector3(max.x, center.y, center.z), // right
            new THREE.Vector3(center.x, min.y, center.z), // bottom
            new THREE.Vector3(min.x, center.y, center.z), // left
            new THREE.Vector3(center.x, center.y, max.z), // front
            new THREE.Vector3(center.x, center.y, min.z)  // back
        );

        // Corner points for more complex routing
        points.push(
            new THREE.Vector3(max.x, max.y, center.z), // top-right
            new THREE.Vector3(min.x, max.y, center.z), // top-left
            new THREE.Vector3(max.x, min.y, center.z), // bottom-right
            new THREE.Vector3(min.x, min.y, center.z)  // bottom-left
        );

        return points;
    }

    _createObstaclesFromNodes(nodes, bounds) {
        return nodes.map(node => ({
            center: node.position.clone(),
            radius: (node.getBoundingSphereRadius?.() || 25) + this.settings.routingPadding,
            type: 'circle'
        }));
    }

    _updateRoutingGraph() {
        this.routingGraph.clear();

        // Create routing nodes from connection points
        this.layoutRegions.forEach((region, regionId) => {
            region.connectionPoints.forEach((point, index) => {
                const nodeId = `${regionId}_cp_${index}`;
                this.routingGraph.set(nodeId, {
                    position: point.clone(),
                    regionId,
                    type: 'connection_point',
                    connections: new Set()
                });
            });
        });

        // Add intermediate routing nodes for complex paths
        this._addIntermediateRoutingNodes();

        // Connect routing nodes
        this._connectRoutingNodes();
    }

    _addIntermediateRoutingNodes() {
        const regions = Array.from(this.layoutRegions.values());
        
        for (let i = 0; i < regions.length; i++) {
            for (let j = i + 1; j < regions.length; j++) {
                const region1 = regions[i];
                const region2 = regions[j];
                
                // Add intermediate nodes between regions
                const midpoint = region1.bounds.center.clone()
                    .add(region2.bounds.center)
                    .multiplyScalar(0.5);
                
                const intermediateId = `intermediate_${region1.id}_${region2.id}`;
                this.routingGraph.set(intermediateId, {
                    position: midpoint,
                    regionId: null,
                    type: 'intermediate',
                    connections: new Set()
                });
            }
        }
    }

    _connectRoutingNodes() {
        const routingNodes = Array.from(this.routingGraph.values());

        routingNodes.forEach((node1, i) => {
            routingNodes.forEach((node2, j) => {
                if (i >= j) return;

                const distance = node1.position.distanceTo(node2.position);
                const hasObstacle = this._pathHasObstacle(node1.position, node2.position);

                if (!hasObstacle && distance < 500) { // Reasonable connection distance
                    node1.connections.add(routingNodes[j]);
                    node2.connections.add(routingNodes[i]);
                }
            });
        });
    }

    _pathHasObstacle(start, end) {
        const direction = end.clone().sub(start);
        const distance = direction.length();
        direction.normalize();

        // Check against all region obstacles
        for (const region of this.layoutRegions.values()) {
            for (const obstacle of region.obstacles) {
                if (this._lineIntersectsCircle(start, end, obstacle.center, obstacle.radius)) {
                    return true;
                }
            }
        }

        return false;
    }

    _lineIntersectsCircle(start, end, circleCenter, radius) {
        const lineVec = end.clone().sub(start);
        const circleVec = circleCenter.clone().sub(start);
        
        const projection = circleVec.dot(lineVec) / lineVec.lengthSq();
        const clampedProjection = Math.max(0, Math.min(1, projection));
        
        const closestPoint = start.clone().add(lineVec.multiplyScalar(clampedProjection));
        const distance = closestPoint.distanceTo(circleCenter);
        
        return distance < radius;
    }

    _routeConnection(connection) {
        const sourceNode = this._getNodeById(connection.sourceNodeId);
        const targetNode = this._getNodeById(connection.targetNodeId);
        
        if (!sourceNode || !targetNode) return;

        let path;
        
        switch (connection.type) {
            case 'direct':
                path = this._routeDirect(sourceNode.position, targetNode.position);
                break;
            case 'orthogonal':
                path = this._routeOrthogonal(sourceNode.position, targetNode.position, connection);
                break;
            case 'curved':
                path = this._routeCurved(sourceNode.position, targetNode.position, connection);
                break;
            case 'bundled':
                path = this._routeBundled(sourceNode.position, targetNode.position, connection);
                break;
            default:
                path = this._routeCurved(sourceNode.position, targetNode.position, connection);
        }

        connection.path = path;
        this.connectionPaths.set(connection.id, path);
        
        if (this.settings.animate) {
            this._animateConnection(connection);
        } else {
            this._createVisualConnection(connection);
        }
    }

    _routeDirect(start, end) {
        return [start.clone(), end.clone()];
    }

    _routeOrthogonal(start, end, connection) {
        const sourceRegion = this.layoutRegions.get(connection.sourceRegion);
        const targetRegion = this.layoutRegions.get(connection.targetRegion);

        if (!sourceRegion || !targetRegion) {
            return this._routeDirect(start, end);
        }

        // Choose exit and entry points based on region positions
        const sourceBounds = sourceRegion.bounds;
        const targetBounds = targetRegion.bounds;
        
        let exitPoint, entryPoint;
        
        if (targetBounds.center.x > sourceBounds.center.x) {
            // Target is to the right
            exitPoint = new THREE.Vector3(sourceBounds.max.x, start.y, start.z);
            entryPoint = new THREE.Vector3(targetBounds.min.x, end.y, end.z);
        } else {
            // Target is to the left
            exitPoint = new THREE.Vector3(sourceBounds.min.x, start.y, start.z);
            entryPoint = new THREE.Vector3(targetBounds.max.x, end.y, end.z);
        }

        // Create L-shaped path
        const midX = (exitPoint.x + entryPoint.x) / 2;
        const path = [
            start.clone(),
            exitPoint.clone(),
            new THREE.Vector3(midX, exitPoint.y, exitPoint.z),
            new THREE.Vector3(midX, entryPoint.y, entryPoint.z),
            entryPoint.clone(),
            end.clone()
        ];

        return path;
    }

    _routeCurved(start, end, connection) {
        const sourceRegion = this.layoutRegions.get(connection.sourceRegion);
        const targetRegion = this.layoutRegions.get(connection.targetRegion);

        if (!sourceRegion || !targetRegion) {
            return this._routeDirect(start, end);
        }

        // Use A* pathfinding through routing graph if obstacles exist
        if (this._pathHasObstacle(start, end)) {
            return this._findPath(start, end, connection);
        }

        // Simple curved path
        const controlPoint1 = start.clone().add(end.clone().sub(start).multiplyScalar(0.33));
        const controlPoint2 = start.clone().add(end.clone().sub(start).multiplyScalar(0.66));
        
        // Add some curve offset
        const perpendicular = new THREE.Vector3(-(end.y - start.y), end.x - start.x, 0).normalize();
        const offset = Math.min(100, start.distanceTo(end) * 0.2);
        
        controlPoint1.add(perpendicular.clone().multiplyScalar(offset));
        controlPoint2.add(perpendicular.clone().multiplyScalar(-offset));

        return this._generateBezierPath(start, controlPoint1, controlPoint2, end, 20);
    }

    _routeBundled(start, end, connection) {
        // Find other connections that could be bundled together
        const bundleCandidates = [];
        
        this.connections.forEach((otherConnection, otherId) => {
            if (otherId === connection.id) return;
            
            const sourceRegion1 = connection.sourceRegion;
            const targetRegion1 = connection.targetRegion;
            const sourceRegion2 = otherConnection.sourceRegion;
            const targetRegion2 = otherConnection.targetRegion;
            
            // Same source and target regions
            if ((sourceRegion1 === sourceRegion2 && targetRegion1 === targetRegion2) ||
                (sourceRegion1 === targetRegion2 && targetRegion1 === sourceRegion2)) {
                bundleCandidates.push(otherConnection);
            }
        });

        if (bundleCandidates.length >= this.settings.bundlingThreshold) {
            return this._createBundledPath(start, end, bundleCandidates);
        }

        // Fall back to curved routing
        return this._routeCurved(start, end, connection);
    }

    _createBundledPath(start, end, bundleCandidates) {
        // Calculate bundle center point
        const midpoint = start.clone().add(end).multiplyScalar(0.5);
        const bundleCenter = midpoint.clone();
        
        // Offset bundle center slightly to create bundle effect
        const perpendicular = new THREE.Vector3(-(end.y - start.y), end.x - start.x, 0).normalize();
        bundleCenter.add(perpendicular.multiplyScalar(this.settings.bundlingRadius));

        return [
            start.clone(),
            start.clone().lerp(bundleCenter, 0.5),
            bundleCenter.clone(),
            end.clone().lerp(bundleCenter, 0.5),
            end.clone()
        ];
    }

    _findPath(start, end, connection) {
        // Simplified A* pathfinding using routing graph
        const startNodeId = this._findClosestRoutingNode(start, connection.sourceRegion);
        const endNodeId = this._findClosestRoutingNode(end, connection.targetRegion);
        
        if (!startNodeId || !endNodeId) {
            return this._routeDirect(start, end);
        }

        const path = this._aStar(startNodeId, endNodeId);
        
        if (path.length === 0) {
            return this._routeDirect(start, end);
        }

        // Convert routing node path to position path
        const fullPath = [start.clone()];
        path.forEach(nodeId => {
            const node = this.routingGraph.get(nodeId);
            if (node) {
                fullPath.push(node.position.clone());
            }
        });
        fullPath.push(end.clone());

        return fullPath;
    }

    _findClosestRoutingNode(position, regionId) {
        let closestNodeId = null;
        let closestDistance = Infinity;

        this.routingGraph.forEach((node, nodeId) => {
            if (node.regionId === regionId || node.type === 'intermediate') {
                const distance = node.position.distanceTo(position);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestNodeId = nodeId;
                }
            }
        });

        return closestNodeId;
    }

    _aStar(startNodeId, endNodeId) {
        const openSet = new Set([startNodeId]);
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        this.routingGraph.forEach((_, nodeId) => {
            gScore.set(nodeId, Infinity);
            fScore.set(nodeId, Infinity);
        });

        gScore.set(startNodeId, 0);
        const startNode = this.routingGraph.get(startNodeId);
        const endNode = this.routingGraph.get(endNodeId);
        fScore.set(startNodeId, startNode.position.distanceTo(endNode.position));

        while (openSet.size > 0) {
            // Find node with lowest fScore
            let current = null;
            let lowestFScore = Infinity;
            
            openSet.forEach(nodeId => {
                const score = fScore.get(nodeId);
                if (score < lowestFScore) {
                    lowestFScore = score;
                    current = nodeId;
                }
            });

            if (current === endNodeId) {
                // Reconstruct path
                const path = [];
                let currentNode = current;
                
                while (cameFrom.has(currentNode)) {
                    path.unshift(currentNode);
                    currentNode = cameFrom.get(currentNode);
                }
                
                return path;
            }

            openSet.delete(current);
            const currentNodeData = this.routingGraph.get(current);

            currentNodeData.connections.forEach(neighbor => {
                const neighborId = this._getRoutingNodeId(neighbor);
                const tentativeGScore = gScore.get(current) + 
                    currentNodeData.position.distanceTo(neighbor.position);

                if (tentativeGScore < gScore.get(neighborId)) {
                    cameFrom.set(neighborId, current);
                    gScore.set(neighborId, tentativeGScore);
                    fScore.set(neighborId, tentativeGScore + 
                        neighbor.position.distanceTo(endNode.position));
                    
                    openSet.add(neighborId);
                }
            });
        }

        return []; // No path found
    }

    _getRoutingNodeId(nodeData) {
        for (const [nodeId, data] of this.routingGraph) {
            if (data === nodeData) return nodeId;
        }
        return null;
    }

    _generateBezierPath(p0, p1, p2, p3, segments) {
        const path = [];
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = this._bezierPoint(p0, p1, p2, p3, t);
            path.push(point);
        }
        
        return path;
    }

    _bezierPoint(p0, p1, p2, p3, t) {
        const oneMinusT = 1 - t;
        const oneMinusTSq = oneMinusT * oneMinusT;
        const oneMinusTCubed = oneMinusTSq * oneMinusT;
        const tSq = t * t;
        const tCubed = tSq * t;

        return new THREE.Vector3(
            oneMinusTCubed * p0.x + 3 * oneMinusTSq * t * p1.x + 3 * oneMinusT * tSq * p2.x + tCubed * p3.x,
            oneMinusTCubed * p0.y + 3 * oneMinusTSq * t * p1.y + 3 * oneMinusT * tSq * p2.y + tCubed * p3.y,
            oneMinusTCubed * p0.z + 3 * oneMinusTSq * t * p1.z + 3 * oneMinusT * tSq * p2.z + tCubed * p3.z
        );
    }

    _animateConnection(connection) {
        // Create visual element first
        this._createVisualConnection(connection);
        
        if (connection.visualElement && connection.path) {
            // Animate the path drawing
            const geometry = connection.visualElement.geometry;
            if (geometry && geometry.attributes.position) {
                const positions = geometry.attributes.position.array;
                const originalPositions = [...positions];
                
                // Start with all points at the source
                const sourcePos = connection.path[0];
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] = sourcePos.x;
                    positions[i + 1] = sourcePos.y;
                    positions[i + 2] = sourcePos.z;
                }
                
                geometry.attributes.position.needsUpdate = true;
                
                // Animate to final positions
                gsap.to(positions, {
                    duration: this.settings.animationDuration,
                    ease: 'power2.inOut',
                    onUpdate: () => {
                        // Interpolate positions
                        const progress = gsap.getProperty(positions, 'progress') || 0;
                        for (let i = 0; i < originalPositions.length; i++) {
                            positions[i] = THREE.MathUtils.lerp(sourcePos.x, originalPositions[i], progress);
                        }
                        geometry.attributes.position.needsUpdate = true;
                    }
                });
            }
        }
    }

    _createVisualConnection(connection) {
        if (!connection.path || connection.path.length < 2) return;

        // Create line geometry from path
        const points = connection.path;
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const material = new THREE.LineBasicMaterial({
            color: connection.metadata.color || 0x00ff00,
            linewidth: connection.metadata.width || 2,
            transparent: true,
            opacity: connection.metadata.opacity || 0.8
        });

        const line = new THREE.Line(geometry, material);
        connection.visualElement = line;

        // Add to scene
        if (this.space && this.space.scene) {
            this.space.scene.add(line);
        }
    }

    _removeVisualElement(element) {
        if (this.space && this.space.scene && element) {
            this.space.scene.remove(element);
            if (element.geometry) element.geometry.dispose();
            if (element.material) element.material.dispose();
        }
    }

    _getNodeById(nodeId) {
        const nodePlugin = this.pluginManager?.getPlugin('NodePlugin');
        return nodePlugin?.getNodes().get(nodeId);
    }

    updateConnection(connectionId, options = {}) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        // Update connection properties
        Object.assign(connection, options);
        
        // Re-route if type changed
        if (options.type && options.type !== connection.type) {
            this._routeConnection(connection);
        }
        
        // Update visual element
        if (connection.visualElement && options.metadata) {
            const material = connection.visualElement.material;
            if (options.metadata.color) material.color.setHex(options.metadata.color);
            if (options.metadata.opacity !== undefined) material.opacity = options.metadata.opacity;
        }
    }

    getAllConnections() {
        return Array.from(this.connections.values());
    }

    getConnectionsForRegion(regionId) {
        return Array.from(this.connections.values()).filter(
            conn => conn.sourceRegion === regionId || conn.targetRegion === regionId
        );
    }

    activate() {
        this.isActive = true;
        this._updateAllConnections();
    }

    deactivate() {
        this.isActive = false;
        this.connections.forEach(connection => {
            if (connection.visualElement) {
                this._removeVisualElement(connection.visualElement);
            }
        });
    }

    _updateAllConnections() {
        this.connections.forEach(connection => {
            this._routeConnection(connection);
        });
    }

    updateConfig(newConfig) {
        this.settings = { ...this.settings, ...newConfig };
    }

    dispose() {
        this.connections.forEach(connection => {
            if (connection.visualElement) {
                this._removeVisualElement(connection.visualElement);
            }
        });
        
        this.connections.clear();
        this.layoutRegions.clear();
        this.routingGraph.clear();
        this.connectionPaths.clear();
        this.space = null;
        this.pluginManager = null;
        this.isActive = false;
    }
}