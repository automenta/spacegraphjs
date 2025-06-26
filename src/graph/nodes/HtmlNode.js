import {CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';
import {$, Utils} from '../../utils.js';
import {Node} from './Node.js';
import {applyLabelLOD} from '../../utils/labelUtils.js';

export class HtmlNode extends Node {
    static typeName = 'html';
    static MIN_SIZE = { width: 80, height: 40 };
    static CONTENT_SCALE_RANGE = { min: 0.3, max: 3.0 };
    htmlElement = null;
    size = { width: 160, height: 70 };
    billboard = false;

    constructor(id, position, data = {}, mass = 1.0) {
        super(id, position, data, mass);
        const initialWidth = this.data.width ?? 160;
        const initialHeight = this.data.height ?? 70;
        this.size = { width: initialWidth, height: initialHeight };
        this.htmlElement = this._createElement();
        this.cssObject = new CSS3DObject(this.htmlElement);
        this.cssObject.userData = { nodeId: this.id, type: 'html-node' };
        this.update();
        this.setContentScale(this.data.contentScale ?? 1.0);
        this.setBackgroundColor(this.data.backgroundColor ?? '#333344');
    }

    getDefaultData() {
        return {
            label: '',
            content: '',
            width: 160,
            height: 70,
            contentScale: 1.0,
            backgroundColor: '#333344',
            type: 'html',
            editable: false,
            labelLod: [],
        };
    }

    _createElement() {
        const el = document.createElement('div');
        el.className = 'node-html node-common';
        el.id = `node-html-${this.id}`;
        el.dataset.nodeId = this.id;
        el.style.width = `${this.size.width}px`;
        el.style.height = `${this.size.height}px`;
        el.draggable = false;
        el.ondragstart = (e) => e.preventDefault();

        el.innerHTML = `
            <div class="node-inner-wrapper">
                <div class="node-content" spellcheck="false" style="transform: scale(${this.data.contentScale});">
                    ${this.data.content || this.data.label || ''}
                </div>
                <div class="node-controls">
                    <button class="node-quick-button node-content-zoom-in" title="Zoom In Content (+)">➕</button>
                    <button class="node-quick-button node-content-zoom-out" title="Zoom Out Content (-)">➖</button>
                    <button class="node-quick-button node-grow" title="Grow Node (Ctrl++)">↗️</button>
                    <button class="node-quick-button node-shrink" title="Shrink Node (Ctrl+-)">↙️</button>
                    <button class="node-quick-button delete-button node-delete" title="Delete Node (Del)">🗑️</button>
                </div>
            </div>
            <div class="resize-handle" title="Resize Node"></div>
        `;
        this._initContentEditable(el);
        return el;
    }

    _initContentEditable(element) {
        const contentDiv = $('.node-content', element);
        if (contentDiv && this.data.editable) {
            contentDiv.contentEditable = 'true';
            let debounceTimer;
            contentDiv.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.data.content = contentDiv.innerHTML;
                     this.space?.emit('graph:node:dataChanged', { node: this, property: 'content', value: this.data.content });
                }, 300);
            });
            contentDiv.addEventListener('pointerdown', (e) => e.stopPropagation());
            contentDiv.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
            contentDiv.addEventListener(
                'wheel',
                (e) => {
                    const isScrollable =
                        contentDiv.scrollHeight > contentDiv.clientHeight ||
                        contentDiv.scrollWidth > contentDiv.clientWidth;
                    const canScrollY =
                        (e.deltaY < 0 && contentDiv.scrollTop > 0) ||
                        (e.deltaY > 0 && contentDiv.scrollTop < contentDiv.scrollHeight - contentDiv.clientHeight);
                    const canScrollX =
                        (e.deltaX < 0 && contentDiv.scrollLeft > 0) ||
                        (e.deltaX > 0 && contentDiv.scrollLeft < contentDiv.scrollWidth - contentDiv.clientWidth);
                    if (isScrollable && (canScrollY || canScrollX)) {
                        e.stopPropagation();
                    }
                },
                { passive: false }
            );
        }
    }

    setSize(width, height, scaleContent = false) {
        const oldSize = { ...this.size };
        const oldArea = oldSize.width * oldSize.height;

        this.size.width = Math.max(HtmlNode.MIN_SIZE.width, width);
        this.size.height = Math.max(HtmlNode.MIN_SIZE.height, height);

        if (this.htmlElement) {
            this.htmlElement.style.width = `${this.size.width}px`;
            this.htmlElement.style.height = `${this.size.height}px`;
        }

        if (scaleContent && oldArea > 0) {
            const scaleFactor = Math.sqrt((this.size.width * this.size.height) / oldArea);
            this.setContentScale(this.data.contentScale * scaleFactor);
        }
    }

    setContentScale(scale) {
        this.data.contentScale = Utils.clamp(scale, HtmlNode.CONTENT_SCALE_RANGE.min, HtmlNode.CONTENT_SCALE_RANGE.max);
        const contentEl = $('.node-content', this.htmlElement);
        if (contentEl) contentEl.style.transform = `scale(${this.data.contentScale})`;
        this.space?.emit('graph:node:dataChanged', { node: this, property: 'contentScale', value: this.data.contentScale });
    }

    setBackgroundColor(color) {
        this.data.backgroundColor = color;
        this.htmlElement?.style.setProperty('--node-bg', this.data.backgroundColor);
        this.space?.emit('graph:node:dataChanged', { node: this, property: 'backgroundColor', value: this.data.backgroundColor });
    }

    adjustContentScale = (deltaFactor) => this.setContentScale(this.data.contentScale * deltaFactor);
    adjustNodeSize = (factor) => this.setSize(this.size.width * factor, this.size.height * factor, false);

    update(space) {
        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            if (this.billboard && space?._cam) {
                this.cssObject.quaternion.copy(space._cam.quaternion);
            }
            applyLabelLOD(this.cssObject, this.data.labelLod, space, this.data.contentScale ?? 1.0);
        }
    }

    getBoundingSphereRadius() {
        return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2;
    }

    setSelectedStyle(selected) {
        this.htmlElement?.classList.toggle('selected', selected);
    }

    startResize() {
        this.htmlElement?.classList.add('resizing');
        this.space?.plugins.getPlugin('LayoutPlugin')?.layoutManager?.getActiveLayout()?.fixNode(this);
        this.space?.emit('graph:node:resizestart', { node: this });
    }

    resize(newWidth, newHeight) {
        this.setSize(newWidth, newHeight);
    }

    endResize() {
        this.htmlElement?.classList.remove('resizing');
        try {
            this.space?.plugins?.getPlugin('LayoutPlugin')?.layoutManager?.getActiveLayout()?.releaseNode(this);
        } catch (error) {
            console.error("Error releasing node during resize:", error);
        }
        this.space?.emit('graph:node:resizeend', { node: this, finalSize: { ...this.size } });
    }
}
