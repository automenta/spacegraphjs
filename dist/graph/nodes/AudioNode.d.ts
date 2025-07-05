export class AudioNode extends Node {
    static typeName: string;
    constructor(id: any, position: any, data?: {}, mass?: number);
    audioContext: any;
    audioBuffer: any;
    sourceNode: any;
    gainNode: any;
    isPlaying: boolean;
    getDefaultData(): {
        label: string;
        audioUrl: string;
        autoplay: boolean;
        loop: boolean;
        volume: number;
        color: number;
        size: number;
    };
    createMesh(): any;
    _loadAudio(url: any): void;
    play(): void;
    pause(): void;
    setVolume(volume: any): void;
    setAudioUrl(url: any): void;
}
import { Node } from './Node.js';
