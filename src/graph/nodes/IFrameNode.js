import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { BaseNode } from './BaseNode.js';
import { Utils } from '../../utils.js';

/**
 * Represents a node that displays web content within an iframe.
 * The iframe is rendered as a `CSS3DObject`.
 */
export class IFrameNode extends BaseNode {
    static DEFAULT_WIDTH = 480;
    static DEFAULT_HEIGHT = 360;
    /** @type {HTMLElement | null} The main HTML element (wrapper div) for this node. */
    htmlElement = null;
    /** @type {HTMLIFrameElement | null} The HTML iframe element. */
    iframeElement = null;
    /** @type {{width: number, height: number}} The size of the iframe container. */
    size = { width: IFrameNode.DEFAULT_WIDTH, height: IFrameNode.DEFAULT_HEIGHT };

    /**
     * Creates an instance of IFrameNode.
     * @param {string} id Unique ID for the node.
     * @param {{x: number, y: number, z: number}} position Initial position.
     * @param {Object} [data={}] Node data, including `iframeUrl`, `width`, `height`, `label`, `sandbox` policy.
     * @param {number} [mass=1.3] Mass for physics calculations.
     */
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
            iframeUrl: 'https://threejs.org', // Default URL
            width: IFrameNode.DEFAULT_WIDTH,
            height: IFrameNode.DEFAULT_HEIGHT,
            type: 'iframe',
            backgroundColor: 'var(--sg-node-bg, #202025)',
            borderColor: 'var(--sg-node-border-focus, #557799)', // For a visible frame
        };
    }

    _createElement() {
        const el = document.createElement('div');
        el.className = 'node-iframe node-common';
        el.id = `node-iframe-${this.id}`;
        el.dataset.nodeId = this.id;
        el.style.width = `${this.size.width}px`;
        el.style.height = `${this.size.height}px`;
        el.style.backgroundColor = this.data.backgroundColor;
        el.style.border = `1px solid ${this.data.borderColor}`; // Visible border
        el.draggable = false;
        el.ondragstart = (e) => e.preventDefault();

        // Title bar (optional, but good for context and if iframe content is fully interactive)
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
            width: 'calc(100% - 8px)', // Account for padding
            zIndex: '1', // Above iframe if it misbehaves
            pointerEvents: 'none', // Title bar itself is not interactive for dragging
        });

        this.iframeElement = document.createElement('iframe');
        this.iframeElement.style.width = '100%';
        this.iframeElement.style.height = '100%';
        this.iframeElement.style.border = 'none';
        // Ensure iframe content doesn't block main page scrolling if embedded iframe itself scrolls.
        // this.iframeElement.style.overflow = 'auto'; // Default browser behavior

        // Security attribute: sandbox (optional, but recommended for untrusted content)
        // Example: this.iframeElement.sandbox = 'allow-scripts allow-same-origin';
        if (this.data.sandbox) {
            this.iframeElement.sandbox = this.data.sandbox;
        }

        this.iframeElement.src = this.data.iframeUrl;

        // Allow iframe to capture pointer events for its content interaction.
        // This means the node cannot be dragged by clicking inside the iframe.
        // Users would need to drag by the border if one is styled, or by a drag handle if implemented.
        this.iframeElement.style.pointerEvents = 'auto';

        // Stop graph interactions when interacting with iframe scrollbars or content
        this.iframeElement.addEventListener('pointerdown', (e) => e.stopPropagation());
        this.iframeElement.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });

        el.appendChild(titleDiv);
        el.appendChild(this.iframeElement);
        return el;
    }

    /**
     * Sets or updates the URL for the iframe source.
     * @param {string} url The new URL to load in the iframe.
     */
    setIframeUrl(url) {
        this.data.iframeUrl = url;
        if (this.iframeElement) {
            this.iframeElement.src = url;
        }
    }

    update(space) {
        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            if (this.data.billboard && space?.camera?._cam) {
                this.cssObject.quaternion.copy(space.camera._cam.quaternion);
            }
        }
        // Label LOD could be applied to the titleDiv if needed, or the whole node
    }

    getBoundingSphereRadius() {
        return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2;
    }

    setSelectedStyle(selected) {
        this.htmlElement?.classList.toggle('selected', selected);
        if (selected) {
            this.htmlElement.style.borderColor = 'var(--sg-selected-color1, #00ffff)';
        } else {
            this.htmlElement.style.borderColor = this.data.borderColor;
        }
    }

    dispose() {
        if (this.iframeElement) {
            this.iframeElement.src = 'about:blank'; // Clear content
        }
        super.dispose(); // Handles cssObject and htmlElement removal
    }
}
