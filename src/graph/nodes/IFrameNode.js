import {CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';
import {Node} from './Node.js';

export class IFrameNode extends Node {
    static typeName = 'iframe';
    static DEFAULT_WIDTH = 480;
    static DEFAULT_HEIGHT = 360;
    htmlElement = null;
    iframeElement = null;
    size = { width: IFrameNode.DEFAULT_WIDTH, height: IFrameNode.DEFAULT_HEIGHT };

    constructor(id, position, data = {}, mass = 1.3) {
        super(id, position, data, mass);
        this.size = {
            width: this.data.width ?? IFrameNode.DEFAULT_WIDTH,
            height: this.data.height ?? IFrameNode.DEFAULT_HEIGHT,
        };
        this.htmlElement = this._createElement();
        this.cssObject = new CSS3DObject(this.htmlElement);
        this.cssObject.userData = { nodeId: this.id, type: 'iframe-node' };
        this.update();
    }

    getDefaultData() {
        return {
            label: 'IFrame Node',
            iframeUrl: 'https://threejs.org',
            width: IFrameNode.DEFAULT_WIDTH,
            height: IFrameNode.DEFAULT_HEIGHT,
            type: 'iframe',
            backgroundColor: 'var(--sg-node-bg, #202025)',
            borderColor: 'var(--sg-node-border-focus, #557799)',
        };
    }

    _createElement() {
        const el = document.createElement('div');
        el.className = 'node-iframe node-common';
        el.id = `node-iframe-${this.id}`;
        el.dataset.nodeId = this.id;
        Object.assign(el.style, {
            width: `${this.size.width}px`,
            height: `${this.size.height}px`,
            backgroundColor: this.data.backgroundColor,
            border: `1px solid ${this.data.borderColor}`,
        });
        el.draggable = false;
        el.ondragstart = (e) => e.preventDefault();

        const titleDiv = document.createElement('div');
        titleDiv.className = 'node-title iframe-title-bar';
        titleDiv.textContent = this.data.label;
        Object.assign(titleDiv.style, {
            padding: '4px',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--sg-node-text-light, #eee)',
            backgroundColor: 'rgba(0,0,0,0.4)',
            position: 'absolute',
            top: '0',
            left: '0',
            width: 'calc(100% - 8px)',
            zIndex: '1',
            pointerEvents: 'none',
        });

        this.iframeElement = document.createElement('iframe');
        Object.assign(this.iframeElement.style, {
            width: '100%',
            height: '100%',
            border: 'none',
            pointerEvents: 'auto',
        });

        if (this.data.sandbox) this.iframeElement.sandbox = this.data.sandbox;
        this.iframeElement.src = this.data.iframeUrl;

        this.iframeElement.addEventListener('pointerdown', (e) => e.stopPropagation());
        this.iframeElement.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });

        el.appendChild(titleDiv);
        el.appendChild(this.iframeElement);
        return el;
    }

    setIframeUrl(url) {
        this.data.iframeUrl = url;
        if (this.iframeElement) this.iframeElement.src = url;
    }

    update(space) {
        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            if (this.data.billboard && space?._cam) {
                this.cssObject.quaternion.copy(space._cam.quaternion);
            }
        }
    }

    getBoundingSphereRadius() {
        return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2;
    }

    setSelectedStyle(selected) {
        this.htmlElement?.classList.toggle('selected', selected);
        this.htmlElement.style.borderColor = selected ? 'var(--sg-selected-color1, #00ffff)' : this.data.borderColor;
    }

    dispose() {
        if (this.iframeElement) this.iframeElement.src = 'about:blank';
        super.dispose();
    }
}
