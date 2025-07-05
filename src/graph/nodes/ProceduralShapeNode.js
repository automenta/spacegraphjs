import * as THREE from 'three';
import {ShapeNode} from './ShapeNode.js';

export class ProceduralShapeNode extends ShapeNode {
    static typeName = 'procedural-shape';
    
    generatorFunction = null;
    animationFrame = null;
    geometryCache = new Map();
    
    constructor(id, position, data = {}, mass = 1.5) {
        const proceduralData = {
            shapeType: data.shapeType ?? 'fractal',
            complexity: data.complexity ?? 3,
            animated: data.animated ?? false,
            animationSpeed: data.animationSpeed ?? 1,
            parameters: data.parameters ?? {},
            wireframe: data.wireframe ?? false,
            materialType: data.materialType ?? 'standard',
            ...data,
        };

        super(id, position, proceduralData, mass);
        this._generateProcedural();
        
        if (proceduralData.animated) {
            this._startAnimation();
        }
    }

    getDefaultData() {
        return {
            ...super.getDefaultData(),
            type: 'procedural-shape',
            shapeType: 'fractal',
            complexity: 3,
            animated: false,
            animationSpeed: 1,
            parameters: {},
            wireframe: false,
            materialType: 'standard',
        };
    }

    _generateProcedural() {
        const cacheKey = this._getCacheKey();
        
        if (this.geometryCache.has(cacheKey)) {
            this._useCachedGeometry(cacheKey);
            return;
        }
        
        let geometry;
        
        switch (this.data.shapeType) {
            case 'fractal':
                geometry = this._generateFractal();
                break;
            case 'crystal':
                geometry = this._generateCrystal();
                break;
            case 'organic':
                geometry = this._generateOrganic();
                break;
            case 'spiral':
                geometry = this._generateSpiral();
                break;
            case 'flower':
                geometry = this._generateFlower();
                break;
            case 'tree':
                geometry = this._generateTree();
                break;
            case 'terrain':
                geometry = this._generateTerrain();
                break;
            case 'voronoi':
                geometry = this._generateVoronoi();
                break;
            case 'l-system':
                geometry = this._generateLSystem();
                break;
            default:
                geometry = new THREE.SphereGeometry(this.size / 2, 32, 16);
        }
        
        this.geometryCache.set(cacheKey, geometry);
        this._applyGeometry(geometry);
    }

    _getCacheKey() {
        return `${this.data.shapeType}_${this.data.complexity}_${JSON.stringify(this.data.parameters)}`;
    }

    _useCachedGeometry(cacheKey) {
        const geometry = this.geometryCache.get(cacheKey);
        if (geometry) {
            this._applyGeometry(geometry.clone());
        }
    }

    _applyGeometry(geometry) {
        if (!geometry) return;
        
        // Dispose old geometry
        if (this.mesh?.children?.[0]?.geometry) {
            this.mesh.children[0].geometry.dispose();
        }
        
        const material = this._createMaterial();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Clear existing mesh children and add new one
        if (this.mesh?.children) {
            this.mesh.children.forEach(child => this.mesh.remove(child));
        }
        
        if (this.mesh) {
            this.mesh.add(mesh);
        }
    }

    _createMaterial() {
        const materialProps = {
            color: this.color,
            wireframe: this.data.wireframe,
            transparent: this.data.wireframe,
            opacity: this.data.wireframe ? 0.8 : 1.0,
        };
        
        switch (this.data.materialType) {
            case 'basic':
                return new THREE.MeshBasicMaterial(materialProps);
            case 'lambert':
                return new THREE.MeshLambertMaterial(materialProps);
            case 'phong':
                return new THREE.MeshPhongMaterial({
                    ...materialProps,
                    shininess: 100,
                });
            case 'standard':
            default:
                return new THREE.MeshStandardMaterial({
                    ...materialProps,
                    roughness: 0.7,
                    metalness: 0.1,
                });
        }
    }

    _generateFractal() {
        const { iterations = 3, scale = 0.5, offset = 1.0 } = this.data.parameters;
        const baseGeometry = new THREE.TetrahedronGeometry(this.size / 2);
        
        if (iterations <= 1) return baseGeometry;
        
        const group = new THREE.Group();
        
        // Recursive fractal generation
        const addFractalLevel = (geo, level, currentScale, position) => {
            if (level <= 0) return;
            
            const mesh = new THREE.Mesh(geo.clone());
            mesh.scale.setScalar(currentScale);
            mesh.position.copy(position);
            group.add(mesh);
            
            if (level > 1) {
                const nextScale = currentScale * scale;
                const positions = [
                    new THREE.Vector3(offset * currentScale, offset * currentScale, 0),
                    new THREE.Vector3(-offset * currentScale, offset * currentScale, 0),
                    new THREE.Vector3(0, -offset * currentScale, offset * currentScale),
                    new THREE.Vector3(0, -offset * currentScale, -offset * currentScale),
                ];
                
                positions.forEach(pos => {
                    addFractalLevel(geo, level - 1, nextScale, position.clone().add(pos));
                });
            }
        };
        
        addFractalLevel(baseGeometry, iterations, 1.0, new THREE.Vector3());
        
        // Merge geometries for performance
        return this._mergeGroupGeometries(group);
    }

    _generateCrystal() {
        const { faces = 8, height = this.size, irregularity = 0.1 } = this.data.parameters;
        
        const vertices = [];
        const indices = [];
        const radius = this.size / 3;
        
        // Create crystal vertices
        for (let i = 0; i < faces; i++) {
            const angle = (i / faces) * Math.PI * 2;
            const irregularOffset = (Math.random() - 0.5) * irregularity * radius;
            const x = Math.cos(angle) * (radius + irregularOffset);
            const z = Math.sin(angle) * (radius + irregularOffset);
            
            // Bottom vertex
            vertices.push(x, -height / 2, z);
            // Top vertex
            vertices.push(x * 0.3, height / 2, z * 0.3);
        }
        
        // Add tip vertices
        vertices.push(0, -height / 2 - radius * 0.5, 0); // Bottom tip
        vertices.push(0, height / 2 + radius * 0.3, 0);  // Top tip
        
        const bottomTipIndex = faces * 2;
        const topTipIndex = faces * 2 + 1;
        
        // Create faces
        for (let i = 0; i < faces; i++) {
            const next = (i + 1) % faces;
            const bottomCurrent = i * 2;
            const topCurrent = i * 2 + 1;
            const bottomNext = next * 2;
            const topNext = next * 2 + 1;
            
            // Side faces
            indices.push(bottomCurrent, topCurrent, topNext);
            indices.push(bottomCurrent, topNext, bottomNext);
            
            // Bottom faces to tip
            indices.push(bottomCurrent, bottomNext, bottomTipIndex);
            
            // Top faces to tip
            indices.push(topCurrent, topTipIndex, topNext);
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        return geometry;
    }

    _generateOrganic() {
        const { segments = 32, rings = 16, noise = 0.3, bulges = 3 } = this.data.parameters;
        
        const geometry = new THREE.SphereGeometry(this.size / 2, segments, rings);
        const positions = geometry.attributes.position.array;
        
        // Apply organic deformation
        for (let i = 0; i < positions.length; i += 3) {
            const vertex = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
            const distance = vertex.length();
            
            // Add noise
            const noiseValue = this._noise3D(vertex.x * 0.1, vertex.y * 0.1, vertex.z * 0.1) * noise;
            
            // Add bulges
            const bulgeNoise = Math.sin(vertex.x * bulges) * Math.sin(vertex.y * bulges) * Math.sin(vertex.z * bulges);
            
            const deformation = 1 + noiseValue + bulgeNoise * 0.2;
            vertex.multiplyScalar(deformation);
            
            positions[i] = vertex.x;
            positions[i + 1] = vertex.y;
            positions[i + 2] = vertex.z;
        }
        
        geometry.computeVertexNormals();
        return geometry;
    }

    _generateSpiral() {
        const { turns = 5, height = this.size, radius = this.size / 3, thickness = 5 } = this.data.parameters;
        
        const points = [];
        const segments = turns * 50;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = t * turns * Math.PI * 2;
            const y = (t - 0.5) * height;
            const r = radius * (1 - t * 0.3); // Taper the spiral
            
            points.push(new THREE.Vector3(
                Math.cos(angle) * r,
                y,
                Math.sin(angle) * r
            ));
        }
        
        const curve = new THREE.CatmullRomCurve3(points);
        return new THREE.TubeGeometry(curve, segments, thickness, 8, false);
    }

    _generateFlower() {
        const { petals = 8, layers = 3, petalSize = this.size / 2 } = this.data.parameters;
        
        const group = new THREE.Group();
        
        for (let layer = 0; layer < layers; layer++) {
            const layerRadius = petalSize * (1 - layer * 0.2);
            const layerHeight = layer * petalSize * 0.1;
            
            for (let i = 0; i < petals; i++) {
                const angle = (i / petals) * Math.PI * 2 + (layer * Math.PI / petals);
                
                const petalGeometry = new THREE.ConeGeometry(
                    layerRadius * 0.3,
                    layerRadius,
                    8
                );
                
                const mesh = new THREE.Mesh(petalGeometry);
                mesh.position.set(
                    Math.cos(angle) * layerRadius * 0.5,
                    layerHeight,
                    Math.sin(angle) * layerRadius * 0.5
                );
                mesh.rotation.z = angle + Math.PI / 2;
                mesh.rotation.x = Math.PI / 6;
                
                group.add(mesh);
            }
        }
        
        // Add center
        const centerGeometry = new THREE.SphereGeometry(petalSize * 0.2, 16, 8);
        const centerMesh = new THREE.Mesh(centerGeometry);
        group.add(centerMesh);
        
        return this._mergeGroupGeometries(group);
    }

    _generateTree() {
        const { depth = 4, branches = 3, trunkHeight = this.size, branchAngle = Math.PI / 4 } = this.data.parameters;
        
        const group = new THREE.Group();
        
        const createBranch = (startPos, direction, length, currentDepth) => {
            if (currentDepth <= 0 || length < this.size * 0.05) return;
            
            const endPos = startPos.clone().add(direction.clone().multiplyScalar(length));
            const thickness = length * 0.1 * (currentDepth / depth);
            
            // Create branch cylinder
            const branchGeometry = new THREE.CylinderGeometry(
                thickness * 0.5, thickness, length, 8
            );
            const mesh = new THREE.Mesh(branchGeometry);
            
            mesh.position.copy(startPos.clone().add(direction.clone().multiplyScalar(length / 2)));
            mesh.lookAt(endPos);
            mesh.rotateX(Math.PI / 2);
            
            group.add(mesh);
            
            // Create child branches
            if (currentDepth > 1) {
                for (let i = 0; i < branches; i++) {
                    const angle = (i / branches) * Math.PI * 2;
                    const newDirection = direction.clone();
                    
                    // Apply branch angle
                    const perpendicular = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
                    const rotationAxis = new THREE.Vector3().crossVectors(direction, perpendicular);
                    
                    newDirection.applyAxisAngle(rotationAxis, branchAngle);
                    newDirection.applyAxisAngle(direction, angle);
                    
                    createBranch(endPos, newDirection, length * 0.7, currentDepth - 1);
                }
            }
        };
        
        // Create trunk
        createBranch(
            new THREE.Vector3(0, -trunkHeight / 2, 0),
            new THREE.Vector3(0, 1, 0),
            trunkHeight,
            depth
        );
        
        return this._mergeGroupGeometries(group);
    }

    _generateTerrain() {
        const { 
            size = this.size,
            segments = 32,
            height = this.size * 0.3,
            octaves = 4,
            persistence = 0.5 
        } = this.data.parameters;
        
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
        const positions = geometry.attributes.position.array;
        
        // Generate height map using Perlin noise
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            
            let elevation = 0;
            let amplitude = height;
            let frequency = 1 / size;
            
            // Multi-octave noise
            for (let octave = 0; octave < octaves; octave++) {
                elevation += this._noise2D(x * frequency, z * frequency) * amplitude;
                amplitude *= persistence;
                frequency *= 2;
            }
            
            positions[i + 1] = elevation;
        }
        
        geometry.computeVertexNormals();
        return geometry;
    }

    _generateVoronoi() {
        const { points = 8, size = this.size } = this.data.parameters;
        
        // Generate random seed points
        const seeds = [];
        for (let i = 0; i < points; i++) {
            seeds.push(new THREE.Vector3(
                (Math.random() - 0.5) * size,
                (Math.random() - 0.5) * size,
                (Math.random() - 0.5) * size
            ));
        }
        
        const geometry = new THREE.BoxGeometry(size, size, size, 20, 20, 20);
        const positions = geometry.attributes.position.array;
        
        // Apply Voronoi displacement
        for (let i = 0; i < positions.length; i += 3) {
            const vertex = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
            
            // Find closest seed point
            let minDistance = Infinity;
            let closestSeed = null;
            
            seeds.forEach(seed => {
                const distance = vertex.distanceTo(seed);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestSeed = seed;
                }
            });
            
            // Displace vertex towards closest seed
            if (closestSeed) {
                const direction = closestSeed.clone().sub(vertex).normalize();
                const displacement = (1 - minDistance / size) * size * 0.2;
                vertex.add(direction.multiplyScalar(displacement));
            }
            
            positions[i] = vertex.x;
            positions[i + 1] = vertex.y;
            positions[i + 2] = vertex.z;
        }
        
        geometry.computeVertexNormals();
        return geometry;
    }

    _generateLSystem() {
        const { 
            axiom = 'F',
            rules = { 'F': 'F+F-F-F+F' },
            iterations = 3,
            angle = Math.PI / 2,
            length = this.size / 10 
        } = this.data.parameters;
        
        // Generate L-System string
        let current = axiom;
        for (let i = 0; i < iterations; i++) {
            let next = '';
            for (const char of current) {
                next += rules[char] || char;
            }
            current = next;
        }
        
        // Interpret L-System string as geometry
        const group = new THREE.Group();
        const stack = [];
        let position = new THREE.Vector3();
        let direction = new THREE.Vector3(0, 1, 0);
        
        for (const char of current) {
            switch (char) {
                case 'F':
                    const newPos = position.clone().add(direction.clone().multiplyScalar(length));
                    const lineGeometry = new THREE.CylinderGeometry(length * 0.05, length * 0.05, length, 4);
                    const lineMesh = new THREE.Mesh(lineGeometry);
                    lineMesh.position.copy(position.clone().add(direction.clone().multiplyScalar(length / 2)));
                    lineMesh.lookAt(newPos);
                    lineMesh.rotateX(Math.PI / 2);
                    group.add(lineMesh);
                    position = newPos;
                    break;
                case '+':
                    direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
                    break;
                case '-':
                    direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), -angle);
                    break;
                case '[':
                    stack.push({ position: position.clone(), direction: direction.clone() });
                    break;
                case ']':
                    if (stack.length > 0) {
                        const state = stack.pop();
                        position = state.position;
                        direction = state.direction;
                    }
                    break;
            }
        }
        
        return this._mergeGroupGeometries(group);
    }

    _mergeGroupGeometries(group) {
        const geometries = [];
        
        group.traverse(child => {
            if (child.isMesh && child.geometry) {
                const clonedGeometry = child.geometry.clone();
                clonedGeometry.applyMatrix4(child.matrixWorld);
                geometries.push(clonedGeometry);
            }
        });
        
        if (geometries.length === 0) {
            return new THREE.SphereGeometry(this.size / 2, 32, 16);
        }
        
        // Use BufferGeometryUtils if available, otherwise return first geometry
        if (geometries.length === 1) {
            return geometries[0];
        }
        
        // Simple merge for multiple geometries
        const mergedGeometry = new THREE.BufferGeometry();
        let totalVertices = 0;
        let totalIndices = 0;
        
        geometries.forEach(geo => {
            totalVertices += geo.attributes.position.count;
            if (geo.index) totalIndices += geo.index.count;
        });
        
        const mergedPositions = new Float32Array(totalVertices * 3);
        const mergedNormals = new Float32Array(totalVertices * 3);
        let positionOffset = 0;
        
        geometries.forEach(geo => {
            const positions = geo.attributes.position.array;
            const normals = geo.attributes.normal ? geo.attributes.normal.array : null;
            
            mergedPositions.set(positions, positionOffset);
            if (normals) {
                mergedNormals.set(normals, positionOffset);
            }
            positionOffset += positions.length;
        });
        
        mergedGeometry.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3));
        mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(mergedNormals, 3));
        
        return mergedGeometry;
    }

    _noise2D(x, y) {
        // Simple 2D noise function (can be replaced with proper Perlin noise)
        return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
    }

    _noise3D(x, y, z) {
        // Simple 3D noise function
        return Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453 % 1;
    }

    _startAnimation() {
        if (this.animationFrame) return;
        
        const animate = () => {
            this._updateAnimation();
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }

    _stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    _updateAnimation() {
        if (!this.mesh?.children?.[0]) return;
        
        const time = performance.now() * 0.001 * this.data.animationSpeed;
        const mesh = this.mesh.children[0];
        
        // Different animation types based on shape
        switch (this.data.shapeType) {
            case 'fractal':
            case 'crystal':
                mesh.rotation.y = time * 0.5;
                mesh.rotation.x = Math.sin(time) * 0.2;
                break;
            case 'organic':
                mesh.rotation.y = time * 0.3;
                // Pulsing effect
                const scale = 1 + Math.sin(time * 2) * 0.1;
                mesh.scale.setScalar(scale);
                break;
            case 'spiral':
                mesh.rotation.y = time;
                break;
            case 'flower':
                mesh.rotation.y = time * 0.2;
                // Gentle swaying
                mesh.rotation.z = Math.sin(time * 0.5) * 0.1;
                break;
            case 'tree':
                // Tree swaying
                mesh.rotation.z = Math.sin(time * 0.3) * 0.05;
                mesh.rotation.x = Math.cos(time * 0.2) * 0.03;
                break;
        }
    }

    setShapeType(type) {
        this.data.shapeType = type;
        this._generateProcedural();
    }

    setComplexity(complexity) {
        this.data.complexity = Math.max(1, Math.min(10, complexity));
        this._generateProcedural();
    }

    setParameters(parameters) {
        this.data.parameters = { ...this.data.parameters, ...parameters };
        this._generateProcedural();
    }

    setAnimated(animated) {
        this.data.animated = animated;
        if (animated) {
            this._startAnimation();
        } else {
            this._stopAnimation();
        }
    }

    setWireframe(wireframe) {
        this.data.wireframe = wireframe;
        if (this.mesh?.children?.[0]?.material) {
            this.mesh.children[0].material.wireframe = wireframe;
            this.mesh.children[0].material.transparent = wireframe;
            this.mesh.children[0].material.opacity = wireframe ? 0.8 : 1.0;
        }
    }

    dispose() {
        this._stopAnimation();
        
        // Clear geometry cache for this node's geometries
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.geometryCache.clear();
        
        super.dispose();
    }
}