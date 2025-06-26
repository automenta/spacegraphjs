import {CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';
import {Node} from './Node.js';

export class VideoNode extends Node {
    static typeName = 'video';
    static DEFAULT_WIDTH = 320;
    static DEFAULT_HEIGHT = 240;
    htmlElement = null;
    videoElement = null;
    size = { width: VideoNode.DEFAULT_WIDTH, height: VideoNode.DEFAULT_HEIGHT };

    constructor(id, position, data = {}, mass = 1.2) {
        super(id, position, data, mass);
        this.size = {
            width: this.data.width ?? VideoNode.DEFAULT_WIDTH,
            height: this.data.height ?? VideoNode.DEFAULT_HEIGHT,
        };
        this.htmlElement = this._createElement();
        this.cssObject = new CSS3DObject(this.htmlElement);
        this.cssObject.userData = { nodeId: this.id, type: 'video-node' };
        this.update();
    }

    getDefaultData() {
        return {
            label: 'Video Node',
            videoUrl: '',
            videoType: 'video/mp4',
            autoplay: false,
            loop: false,
            controls: true,
            muted: false,
            width: VideoNode.DEFAULT_WIDTH,
            height: VideoNode.DEFAULT_HEIGHT,
            type: 'video',
            backgroundColor: 'var(--sg-node-bg, #111)',
        };
    }

    _createElement() {
        const el = document.createElement('div');
        el.className = 'node-video node-common';
        el.id = `node-video-${this.id}`;
        el.dataset.nodeId = this.id;
        Object.assign(el.style, {
            width: `${this.size.width}px`,
            height: `${this.size.height}px`,
            backgroundColor: this.data.backgroundColor,
        });
        el.draggable = false;
        el.ondragstart = (e) => e.preventDefault();

        this.videoElement = document.createElement('video');
        Object.assign(this.videoElement.style, {
            width: '100%',
            height: '100%',
        });
        this.videoElement.src = this.data.videoUrl;
        this.videoElement.type = this.data.videoType;

        if (this.data.autoplay) this.videoElement.autoplay = true;
        if (this.data.loop) this.videoElement.loop = true;
        if (this.data.controls) this.videoElement.controls = true;
        if (this.data.muted) this.videoElement.muted = true;

        this.videoElement.addEventListener('pointerdown', (e) => e.stopPropagation());
        this.videoElement.addEventListener('click', (e) => e.stopPropagation());
        this.videoElement.addEventListener('dblclick', (e) => e.stopPropagation());

        const titleDiv = document.createElement('div');
        titleDiv.className = 'node-title';
        titleDiv.textContent = this.data.label;
        Object.assign(titleDiv.style, {
            textAlign: 'center',
            padding: '2px',
            fontSize: '12px',
            color: 'var(--sg-node-text-light, #eee)',
            backgroundColor: 'rgba(0,0,0,0.3)',
        });

        el.appendChild(titleDiv);
        el.appendChild(this.videoElement);

        return el;
    }

    setVideoUrl(url, type) {
        this.data.videoUrl = url;
        if (type) this.data.videoType = type;
        if (this.videoElement) {
            this.videoElement.src = url;
            if (type) this.videoElement.type = type;
        }
    }

    update(space) {
        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            if (this.data.billboard && space?.camera?._cam) {
                this.cssObject.quaternion.copy(space.camera._cam.quaternion);
            }
        }
    }

    getBoundingSphereRadius() {
        return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2;
    }

    setSelectedStyle(selected) {
        this.htmlElement?.classList.toggle('selected', selected);
    }

    dispose() {
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.src = '';
            this.videoElement.load();
        }
        super.dispose();
    }
}
