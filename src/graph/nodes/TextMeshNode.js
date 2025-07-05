import * as THREE from 'three';
import {ShapeNode} from './ShapeNode.js';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';

export class TextMeshNode extends ShapeNode {
    static typeName = 'text-mesh';
    static fontCache = new Map();
    static defaultFont = null;
    
    textMesh = null;
    font = null;
    isLoadingFont = false;
    
    constructor(id, position, data = {}, mass = 1.5) {
        const textData = {
            text: data.text ?? 'Text',
            fontSize: data.fontSize ?? 20,
            fontPath: data.fontPath ?? null,
            fontFamily: data.fontFamily ?? 'helvetiker',
            fontWeight: data.fontWeight ?? 'regular',
            height: data.height ?? 5,
            curveSegments: data.curveSegments ?? 12,
            bevelEnabled: data.bevelEnabled ?? true,
            bevelThickness: data.bevelThickness ?? 2,
            bevelSize: data.bevelSize ?? 1,
            bevelOffset: data.bevelOffset ?? 0,
            bevelSegments: data.bevelSegments ?? 5,
            align: data.align ?? 'center',
            materialType: data.materialType ?? 'standard',
            strokeWidth: data.strokeWidth ?? 0,
            strokeColor: data.strokeColor ?? 0x000000,
            gradientColors: data.gradientColors ?? null,
            animated: data.animated ?? false,
            animationType: data.animationType ?? 'rotate',
            ...data,
        };

        super(id, position, textData, mass);
        this._loadFont();
    }

    getDefaultData() {
        return {
            ...super.getDefaultData(),
            type: 'text-mesh',
            text: 'Text',
            fontSize: 20,
            fontPath: null,
            fontFamily: 'helvetiker',
            fontWeight: 'regular',
            height: 5,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 2,
            bevelSize: 1,
            bevelOffset: 0,
            bevelSegments: 5,
            align: 'center',
            materialType: 'standard',
            strokeWidth: 0,
            strokeColor: 0x000000,
            gradientColors: null,
            animated: false,
            animationType: 'rotate',
        };
    }

    async _loadFont() {
        if (this.isLoadingFont) return;
        this.isLoadingFont = true;
        
        try {
            let fontKey = this.data.fontPath || `${this.data.fontFamily}_${this.data.fontWeight}`;
            
            // Check cache first
            if (TextMeshNode.fontCache.has(fontKey)) {
                this.font = TextMeshNode.fontCache.get(fontKey);
                this._createTextMesh();
                this.isLoadingFont = false;
                return;
            }
            
            const loader = new FontLoader();
            
            // Determine font URL
            let fontUrl;
            if (this.data.fontPath) {
                fontUrl = this.data.fontPath;
            } else {
                // Use Three.js fonts from CDN
                const baseUrl = 'https://threejs.org/examples/fonts/';
                fontUrl = `${baseUrl}${this.data.fontFamily}_${this.data.fontWeight}.typeface.json`;
            }
            
            const font = await new Promise((resolve, reject) => {
                loader.load(
                    fontUrl,
                    resolve,
                    undefined,
                    (error) => {
                        console.warn(`Failed to load font ${fontUrl}, using fallback`);
                        // Try to use cached default font or create a simple fallback
                        if (TextMeshNode.defaultFont) {
                            resolve(TextMeshNode.defaultFont);
                        } else {
                            reject(error);
                        }
                    }
                );
            });
            
            this.font = font;
            TextMeshNode.fontCache.set(fontKey, font);
            
            if (!TextMeshNode.defaultFont) {
                TextMeshNode.defaultFont = font;
            }
            
            this._createTextMesh();
            
        } catch (error) {
            console.error('Font loading failed:', error);
            this._createFallbackMesh();
        } finally {
            this.isLoadingFont = false;
        }
    }

    _createTextMesh() {
        if (!this.font) return;
        
        this._disposeTextMesh();
        
        try {
            const textGeometry = new TextGeometry(this.data.text, {
                font: this.font,
                size: this.data.fontSize,
                height: this.data.height,
                curveSegments: this.data.curveSegments,
                bevelEnabled: this.data.bevelEnabled,
                bevelThickness: this.data.bevelThickness,
                bevelSize: this.data.bevelSize,
                bevelOffset: this.data.bevelOffset,
                bevelSegments: this.data.bevelSegments,
            });
            
            textGeometry.computeBoundingBox();
            this._alignText(textGeometry);
            
            const materials = this._createTextMaterials();
            this.textMesh = new THREE.Mesh(textGeometry, materials);
            this.textMesh.castShadow = true;
            this.textMesh.receiveShadow = true;
            this.textMesh.userData = { nodeId: this.id, type: 'text-mesh' };
            
            // Add stroke if enabled
            if (this.data.strokeWidth > 0) {
                this._addStroke();
            }
            
            // Clear existing mesh children and add text mesh
            if (this.mesh?.children) {
                this.mesh.children.forEach(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                    this.mesh.remove(child);
                });
            }
            
            if (this.mesh) {
                this.mesh.add(this.textMesh);
            }
            
            // Start animation if enabled
            if (this.data.animated) {
                this._startTextAnimation();
            }
            
        } catch (error) {
            console.error('Text geometry creation failed:', error);
            this._createFallbackMesh();
        }
    }

    _alignText(geometry) {
        const boundingBox = geometry.boundingBox;
        
        switch (this.data.align) {
            case 'center':
                geometry.translate(
                    -(boundingBox.max.x - boundingBox.min.x) / 2,
                    -(boundingBox.max.y - boundingBox.min.y) / 2,
                    -(boundingBox.max.z - boundingBox.min.z) / 2
                );
                break;
            case 'left':
                geometry.translate(
                    -boundingBox.min.x,
                    -(boundingBox.max.y - boundingBox.min.y) / 2,
                    -(boundingBox.max.z - boundingBox.min.z) / 2
                );
                break;
            case 'right':
                geometry.translate(
                    -boundingBox.max.x,
                    -(boundingBox.max.y - boundingBox.min.y) / 2,
                    -(boundingBox.max.z - boundingBox.min.z) / 2
                );
                break;
        }
    }

    _createTextMaterials() {
        const materialProps = {
            color: this.color,
            transparent: true,
            opacity: 1.0,
        };
        
        // Handle gradient colors
        if (this.data.gradientColors && this.data.gradientColors.length >= 2) {
            // Create gradient shader material
            return new THREE.ShaderMaterial({
                uniforms: {
                    color1: { value: new THREE.Color(this.data.gradientColors[0]) },
                    color2: { value: new THREE.Color(this.data.gradientColors[1]) },
                    time: { value: 0 }
                },
                vertexShader: `
                    varying vec3 vPosition;
                    varying vec3 vNormal;
                    void main() {
                        vPosition = position;
                        vNormal = normal;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 color1;
                    uniform vec3 color2;
                    uniform float time;
                    varying vec3 vPosition;
                    varying vec3 vNormal;
                    
                    void main() {
                        float mixFactor = (vPosition.y + 1.0) * 0.5;
                        vec3 color = mix(color1, color2, mixFactor);
                        
                        // Add some lighting
                        float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))) * 0.5 + 0.5;
                        color *= light;
                        
                        gl_FragColor = vec4(color, 1.0);
                    }
                `,
                transparent: materialProps.transparent,
            });
        }
        
        // Standard material types
        switch (this.data.materialType) {
            case 'basic':
                return new THREE.MeshBasicMaterial(materialProps);
            case 'lambert':
                return new THREE.MeshLambertMaterial(materialProps);
            case 'phong':
                return new THREE.MeshPhongMaterial({
                    ...materialProps,
                    shininess: 100,
                    specular: 0x222222,
                });
            case 'physical':
                return new THREE.MeshPhysicalMaterial({
                    ...materialProps,
                    roughness: 0.4,
                    metalness: 0.1,
                    clearcoat: 0.5,
                    clearcoatRoughness: 0.1,
                });
            case 'standard':
            default:
                return new THREE.MeshStandardMaterial({
                    ...materialProps,
                    roughness: 0.5,
                    metalness: 0.1,
                });
        }
    }

    _addStroke() {
        if (!this.textMesh || this.data.strokeWidth <= 0) return;
        
        // Create stroke geometry by scaling the original
        const strokeGeometry = this.textMesh.geometry.clone();
        const strokeMaterial = new THREE.MeshBasicMaterial({
            color: this.data.strokeColor,
            transparent: true,
            opacity: 0.8,
        });
        
        const strokeMesh = new THREE.Mesh(strokeGeometry, strokeMaterial);
        const scale = 1 + (this.data.strokeWidth / this.data.fontSize) * 2;
        strokeMesh.scale.setScalar(scale);
        strokeMesh.position.z = -this.data.strokeWidth / 2;
        strokeMesh.renderOrder = -1;
        
        this.textMesh.add(strokeMesh);
    }

    _createFallbackMesh() {
        // Create a simple box with text texture as fallback
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        ctx.fillStyle = '#' + this.color.toString(16).padStart(6, '0');
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = `${Math.min(canvas.height * 0.6, 48)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.data.text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const geometry = new THREE.BoxGeometry(this.size, this.size * 0.5, this.size * 0.1);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        
        this.textMesh = new THREE.Mesh(geometry, material);
        this.textMesh.userData = { nodeId: this.id, type: 'text-mesh-fallback' };
        
        if (this.mesh) {
            this.mesh.add(this.textMesh);
        }
    }

    _startTextAnimation() {
        if (this.animationFrame) return;
        
        const animate = () => {
            this._updateTextAnimation();
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }

    _stopTextAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    _updateTextAnimation() {
        if (!this.textMesh) return;
        
        const time = performance.now() * 0.001;
        
        switch (this.data.animationType) {
            case 'rotate':
                this.textMesh.rotation.y = time * 0.5;
                break;
            case 'float':
                this.textMesh.position.y = Math.sin(time * 2) * 10;
                break;
            case 'pulse':
                const scale = 1 + Math.sin(time * 3) * 0.1;
                this.textMesh.scale.setScalar(scale);
                break;
            case 'wave':
                this.textMesh.rotation.z = Math.sin(time * 2) * 0.1;
                break;
            case 'glow':
                if (this.textMesh.material && this.textMesh.material.uniforms?.time) {
                    this.textMesh.material.uniforms.time.value = time;
                }
                break;
        }
    }

    _disposeTextMesh() {
        if (this.textMesh) {
            if (this.textMesh.geometry) this.textMesh.geometry.dispose();
            if (this.textMesh.material) {
                if (Array.isArray(this.textMesh.material)) {
                    this.textMesh.material.forEach(mat => mat.dispose());
                } else {
                    this.textMesh.material.dispose();
                }
            }
            this.textMesh.parent?.remove(this.textMesh);
            this.textMesh = null;
        }
    }

    setText(text) {
        this.data.text = text;
        if (this.font && !this.isLoadingFont) {
            this._createTextMesh();
        }
        this.space?.emit('graph:node:dataChanged', { 
            node: this, 
            property: 'text', 
            value: text 
        });
    }

    setFontSize(size) {
        this.data.fontSize = size;
        if (this.font && !this.isLoadingFont) {
            this._createTextMesh();
        }
    }

    setColor(color) {
        super.setColor(color);
        if (this.textMesh && this.textMesh.material && !this.data.gradientColors) {
            this.textMesh.material.color.set(color);
        }
    }

    setHeight(height) {
        this.data.height = height;
        if (this.font && !this.isLoadingFont) {
            this._createTextMesh();
        }
    }

    setBevel(enabled, thickness = 2, size = 1) {
        this.data.bevelEnabled = enabled;
        this.data.bevelThickness = thickness;
        this.data.bevelSize = size;
        if (this.font && !this.isLoadingFont) {
            this._createTextMesh();
        }
    }

    setAlign(align) {
        if (['left', 'center', 'right'].includes(align)) {
            this.data.align = align;
            if (this.font && !this.isLoadingFont) {
                this._createTextMesh();
            }
        }
    }

    setStroke(width, color = 0x000000) {
        this.data.strokeWidth = width;
        this.data.strokeColor = color;
        if (this.font && !this.isLoadingFont) {
            this._createTextMesh();
        }
    }

    setGradient(colors) {
        this.data.gradientColors = colors;
        if (this.font && !this.isLoadingFont) {
            this._createTextMesh();
        }
    }

    setAnimated(animated, type = 'rotate') {
        this.data.animated = animated;
        this.data.animationType = type;
        
        if (animated) {
            this._startTextAnimation();
        } else {
            this._stopTextAnimation();
        }
    }

    setFont(fontFamily, fontWeight = 'regular') {
        this.data.fontFamily = fontFamily;
        this.data.fontWeight = fontWeight;
        this.font = null; // Force reload
        this._loadFont();
    }

    setCustomFont(fontPath) {
        this.data.fontPath = fontPath;
        this.font = null; // Force reload
        this._loadFont();
    }

    getTextBounds() {
        if (this.textMesh && this.textMesh.geometry.boundingBox) {
            return this.textMesh.geometry.boundingBox.clone();
        }
        return new THREE.Box3();
    }

    dispose() {
        this._stopTextAnimation();
        this._disposeTextMesh();
        super.dispose();
    }

    update(space) {
        super.update(space);
        
        // Update shader uniforms if using gradient material
        if (this.textMesh?.material?.uniforms?.time) {
            this.textMesh.material.uniforms.time.value = performance.now() * 0.001;
        }
    }
}