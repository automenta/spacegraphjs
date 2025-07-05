export class FlowEdge extends Edge {
    particles: any[];
    particleCount: number;
    particleSpeed: number;
    particleSystem: any;
    animationFrame: any;
    flowDirection: number;
    _createParticleSystem(): void;
    _getPositionOnCurve(t: any): any;
    _startAnimation(): void;
    _stopAnimation(): void;
    _updateParticles(): void;
    setFlowDirection(direction: any): void;
    setParticleSpeed(speed: any): void;
    setParticleCount(count: any): void;
    setParticleColor(color: any): void;
    setAnimated(animated: any): void;
    setGlowEffect(enabled: any): void;
    disposeParticleSystem(): void;
    addToScene(scene: any): void;
    removeFromScene(scene: any): void;
}
import { Edge } from './Edge.js';
