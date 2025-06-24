import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { BaseNode } from './BaseNode.js';
import { Utils, $ } from '../../utils.js';

/**
 * Represents a node that displays HTML5 video content.
 * The video is rendered as a `CSS3DObject`.
 */
export class VideoNode extends BaseNode {
    static DEFAULT_WIDTH = 320;
    static DEFAULT_HEIGHT = 240;
    /** @type {HTMLElement | null} The main HTML element for this node. */
    htmlElement = null;
    /** @type {HTMLVideoElement | null} The HTML video element. */
    videoElement = null;
    /** @type {{width: number, height: number}} The size of the video player. */
    size = { width: VideoNode.DEFAULT_WIDTH, height: VideoNode.DEFAULT_HEIGHT };

    /**
     * Creates an instance of VideoNode.
     * @param {string} id Unique ID for the node.
     * @param {{x: number, y: number, z: number}} position Initial position.
     * @param {Object} [data={}] Node data, including `videoUrl`, `videoType`, `width`, `height`, `autoplay`, `loop`, `controls`, `muted`, `label`.
     * @param {number} [mass=1.2] Mass for physics calculations.
     */
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
            videoUrl: '', // URL of the video
            videoType: 'video/mp4', // e.g., video/mp4, video/webm
            autoplay: false,
            loop: false,
            controls: true,
            muted: false, // Good practice for autoplay
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
        el.style.width = `${this.size.width}px`;
        el.style.height = `${this.size.height}px`;
        el.style.backgroundColor = this.data.backgroundColor;
        // Prevent dragging the element itself, interaction is via SpaceGraph
        el.draggable = false;
        el.ondragstart = (e) => e.preventDefault();

        this.videoElement = document.createElement('video');
        this.videoElement.style.width = '100%';
        this.videoElement.style.height = '100%';
        this.videoElement.src = this.data.videoUrl;
        this.videoElement.type = this.data.videoType;

        if (this.data.autoplay) this.videoElement.autoplay = true;
        if (this.data.loop) this.videoElement.loop = true;
        if (this.data.controls) this.videoElement.controls = true;
        if (this.data.muted) this.videoElement.muted = true;

        // Stop propagation for video controls to prevent graph interactions
        this.videoElement.addEventListener('pointerdown', (e) => e.stopPropagation());
        this.videoElement.addEventListener('click', (e) => e.stopPropagation());
        this.videoElement.addEventListener('dblclick', (e) => e.stopPropagation());

        const titleDiv = document.createElement('div');
        titleDiv.className = 'node-title';
        titleDiv.textContent = this.data.label;
        titleDiv.style.textAlign = 'center';
        titleDiv.style.padding = '2px';
        titleDiv.style.fontSize = '12px';
        titleDiv.style.color = 'var(--sg-node-text-light, #eee)';
        titleDiv.style.backgroundColor = 'rgba(0,0,0,0.3)';

        el.appendChild(titleDiv);
        el.appendChild(this.videoElement);

        // Example of adding custom overlay controls if this.data.controls is false
        // if (!this.data.controls) {
        //     const customControls = document.createElement('div');
        //     customControls.className = 'video-custom-controls';
        //     // Add play/pause, volume buttons here
        //     // customControls.innerHTML = `<button class="play-pause">Play</button>`;
        //     // el.appendChild(customControls);
        //     // Add event listeners for these custom controls
        // }

        return el;
    }

    /**
     * Sets or updates the video source URL and optionally its type.
     * @param {string} url The new URL for the video source.
     * @param {string} [type] The MIME type of the video (e.g., 'video/mp4').
     */
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
            // Video nodes typically don't billboard unless specified
            if (this.data.billboard && space?.camera?._cam) {
                this.cssObject.quaternion.copy(space.camera._cam.quaternion);
            }
        }
        // Apply label LOD if VideoNode has labels and labelLod data (similar to HtmlNode/ShapeNode)
        // For now, VideoNode itself is the content, label is a small title bar.
        // If the whole node needs to hide, use data.lodLevels or similar on BaseNode if implemented generally.
    }

    getBoundingSphereRadius() {
        // Approximate based on width/height for layout purposes
        return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2;
    }

    setSelectedStyle(selected) {
        this.htmlElement?.classList.toggle('selected', selected);
        // .node-common.selected might provide border or outline via CSS
    }

    dispose() {
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.src = ''; // Release video resource
            this.videoElement.load(); // Abort loading
        }
        super.dispose(); // Handles cssObject and htmlElement removal
    }
}
