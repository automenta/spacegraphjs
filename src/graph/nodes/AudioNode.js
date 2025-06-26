import {Node} from './Node.js';
import * as THREE from 'three';

export class AudioNode extends Node {
    static typeName = 'audio';
    audioContext = null;
    audioBuffer = null;
    sourceNode = null;
    gainNode = null;
    isPlaying = false;

    constructor(id, position, data = {}, mass = 1.0) {
        super(id, position, data, mass);
        this.mesh = this.createMesh();
        this.mesh.userData = { nodeId: this.id, type: AudioNode.typeName };
        this.update();

        if (this.data.audioUrl) {
            this._loadAudio(this.data.audioUrl);
        }
    }

    getDefaultData() {
        return {
            ...super.getDefaultData(),
            label: 'Audio Node',
            audioUrl: '',
            autoplay: false,
            loop: false,
            volume: 0.8,
            color: 0x00ccff,
            size: 40,
        };
    }

    createMesh() {
        if (this.mesh) return this.mesh;
        const geometry = new THREE.SphereGeometry(this.data.size * 0.5, 16, 12);
        const material = new THREE.MeshBasicMaterial({ color: this.data.color, wireframe: true });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.userData = { nodeId: this.id, type: AudioNode.typeName };
        return this.mesh;
    }

    _loadAudio(url) {
        if (!url) return;
        this.audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                this.audioBuffer = audioBuffer;
                if (this.data.autoplay) {
                    this.play();
                }
            })
            .catch(e => console.error('Error loading audio:', e));
    }

    play() {
        if (this.isPlaying || !this.audioBuffer || !this.audioContext) return;

        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        this.sourceNode.loop = this.data.loop;

        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = this.data.volume;

        this.sourceNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);

        this.sourceNode.start(0);
        this.isPlaying = true;
        this.sourceNode.onended = () => {
            this.isPlaying = false;
            this.sourceNode = null;
            this.gainNode = null;
            if (!this.data.loop) this.space?.emit('node:audio:ended', { node: this });
        };
        this.space?.emit('node:audio:played', { node: this });
    }

    pause() {
        if (!this.isPlaying || !this.sourceNode) return;
        this.sourceNode.stop();
        this.isPlaying = false;
        this.space?.emit('node:audio:paused', { node: this });
    }

    setVolume(volume) {
        this.data.volume = volume;
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }

    setAudioUrl(url) {
        if (this.data.audioUrl === url) return;
        this.pause();
        this.data.audioUrl = url;
        this._loadAudio(url);
    }

    dispose() {
        this.pause();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.audioBuffer = null;
        super.dispose();
    }
}
