import * as THREE from 'three';
import {Edge} from './Edge.js';

export class FlowEdge extends Edge {
    static typeName = 'flow';
    particles = [];
    particleCount = 10;
    particleSpeed = 0.5;
    particleSystem = null;
    animationFrame = null;
    flowDirection = 1; // 1 for source->target, -1 for target->source, 0 for bidirectional

    constructor(id, sourceNode, targetNode, data = {}) {
        const flowData = {
            particleCount: data.particleCount ?? 10,
            particleSpeed: data.particleSpeed ?? 0.5,
            particleSize: data.particleSize ?? 3,
            particleColor: data.particleColor ?? 0x00ffff,
            flowDirection: data.flowDirection ?? 1,
            animated: data.animated ?? true,
            glowEffect: data.glowEffect ?? true,
            ...data
        };

        super(id, sourceNode, targetNode, flowData);
        
        this.particleCount = flowData.particleCount;
        this.particleSpeed = flowData.particleSpeed;
        this.flowDirection = flowData.flowDirection;
        
        this._createParticleSystem();
        if (flowData.animated) {
            this._startAnimation();
        }
    }

    _createParticleSystem() {
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);
        const velocities = new Float32Array(this.particleCount);

        // Initialize particles
        for (let i = 0; i < this.particleCount; i++) {
            const t = i / this.particleCount;
            const position = this._getPositionOnCurve(t);
            
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            const color = new THREE.Color(this.data.particleColor);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            sizes[i] = this.data.particleSize;
            velocities[i] = Math.random() * 0.5 + 0.5; // Random velocity multiplier

            this.particles.push({
                progress: t,
                velocity: velocities[i],
                originalSize: this.data.particleSize,
                life: 1.0
            });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                glowIntensity: { value: this.data.glowEffect ? 1.0 : 0.0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                varying float vSize;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vSize = size;
                    
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vec4 mvPosition = viewMatrix * worldPosition;
                    
                    gl_Position = projectionMatrix * mvPosition;
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vSize;
                uniform float time;
                uniform float glowIntensity;
                
                void main() {
                    vec2 center = gl_PointCoord - 0.5;
                    float dist = length(center);
                    
                    if (dist > 0.5) discard;
                    
                    float alpha = 1.0 - (dist * 2.0);
                    alpha = pow(alpha, 2.0);
                    
                    vec3 color = vColor;
                    if (glowIntensity > 0.0) {
                        float glow = sin(time * 3.0 + dist * 10.0) * 0.3 + 0.7;
                        color *= glow * glowIntensity + (1.0 - glowIntensity);
                    }
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.particleSystem.userData = { edgeId: this.id, type: 'flow-particles' };
        this.particleSystem.renderOrder = 1;
    }

    _getPositionOnCurve(t) {
        if (!this.source || !this.target) {
            return new THREE.Vector3();
        }

        // Simple linear interpolation for now, can be enhanced with curves
        const sourcePos = this.source.position;
        const targetPos = this.target.position;
        
        return new THREE.Vector3().lerpVectors(sourcePos, targetPos, t);
    }

    _startAnimation() {
        if (this.animationFrame) return;

        const animate = () => {
            this._updateParticles();
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

    _updateParticles() {
        if (!this.particleSystem || !this.source || !this.target) return;

        const positions = this.particleSystem.geometry.attributes.position.array;
        const sizes = this.particleSystem.geometry.attributes.size.array;
        const time = performance.now() * 0.001;

        // Update shader time uniform
        if (this.particleSystem.material.uniforms) {
            this.particleSystem.material.uniforms.time.value = time;
        }

        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            
            // Update progress based on flow direction
            if (this.flowDirection !== 0) {
                particle.progress += this.particleSpeed * particle.velocity * this.flowDirection * 0.01;
                
                // Wrap around
                if (this.flowDirection > 0 && particle.progress > 1) {
                    particle.progress = 0;
                    particle.life = 1.0;
                } else if (this.flowDirection < 0 && particle.progress < 0) {
                    particle.progress = 1;
                    particle.life = 1.0;
                }
            } else {
                // Bidirectional flow
                particle.progress += this.particleSpeed * particle.velocity * 0.01 * Math.sin(time + i);
                particle.progress = Math.max(0, Math.min(1, particle.progress));
            }

            // Update position
            const position = this._getPositionOnCurve(particle.progress);
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            // Update size with life and pulsing effect
            const pulseEffect = Math.sin(time * 4 + i * 0.1) * 0.3 + 0.7;
            sizes[i] = particle.originalSize * particle.life * pulseEffect;

            // Update life (fade effect)
            particle.life = Math.max(0.1, Math.sin(particle.progress * Math.PI));
        }

        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.size.needsUpdate = true;
    }

    update() {
        super.update();
        
        if (this.particleSystem && this.source && this.target) {
            // Update particle positions based on new node positions
            this._updateParticles();
        }
    }

    setFlowDirection(direction) {
        this.flowDirection = direction;
        this.data.flowDirection = direction;
    }

    setParticleSpeed(speed) {
        this.particleSpeed = speed;
        this.data.particleSpeed = speed;
    }

    setParticleCount(count) {
        this.particleCount = count;
        this.data.particleCount = count;
        
        // Recreate particle system with new count
        this.disposeParticleSystem();
        this._createParticleSystem();
        
        if (this.data.animated) {
            this._startAnimation();
        }
    }

    setParticleColor(color) {
        this.data.particleColor = color;
        
        if (this.particleSystem) {
            const colors = this.particleSystem.geometry.attributes.color.array;
            const colorObj = new THREE.Color(color);
            
            for (let i = 0; i < this.particleCount; i++) {
                colors[i * 3] = colorObj.r;
                colors[i * 3 + 1] = colorObj.g;
                colors[i * 3 + 2] = colorObj.b;
            }
            
            this.particleSystem.geometry.attributes.color.needsUpdate = true;
        }
    }

    setAnimated(animated) {
        this.data.animated = animated;
        
        if (animated) {
            this._startAnimation();
        } else {
            this._stopAnimation();
        }
    }

    setGlowEffect(enabled) {
        this.data.glowEffect = enabled;
        
        if (this.particleSystem && this.particleSystem.material.uniforms) {
            this.particleSystem.material.uniforms.glowIntensity.value = enabled ? 1.0 : 0.0;
        }
    }

    disposeParticleSystem() {
        if (this.particleSystem) {
            this.particleSystem.geometry?.dispose();
            this.particleSystem.material?.dispose();
            this.particleSystem.parent?.remove(this.particleSystem);
            this.particleSystem = null;
        }
        this.particles = [];
    }

    dispose() {
        this._stopAnimation();
        this.disposeParticleSystem();
        super.dispose();
    }

    // Method to add particle system to scene
    addToScene(scene) {
        if (this.particleSystem) {
            scene.add(this.particleSystem);
        }
    }

    // Method to remove particle system from scene
    removeFromScene(scene) {
        if (this.particleSystem) {
            scene.remove(this.particleSystem);
        }
    }
}