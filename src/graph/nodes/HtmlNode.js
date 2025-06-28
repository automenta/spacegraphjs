import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { $, Utils } from '../../utils.js';
import { Node } from './Node.js';
import { applyLabelLOD } from '../../utils/labelUtils.js';

export class HtmlNode extends Node {
    static typeName = 'html';
    static MIN_SIZE = { width: 80, height: 40 };
    static CONTENT_SCALE_RANGE = { min: 0.3, max: 3.0 };
    htmlElement = null;
    size = { width: 160, height: 70 }; // Current pixel size
    baseSize = { width: 160, height: 70 }; // Base pixel size, scale is applied to this

    constructor(id, position, data = {}, mass = 1.0) {
        super(id, position, data, mass);
        const initialWidth = this.data.width ?? 160;
        const initialHeight = this.data.height ?? 70;
        this.baseSize = { width: initialWidth, height: initialHeight };
        // Initialize this.size based on initial scale if provided, otherwise same as baseSize
        const initialScaleX = this.data.scale?.x ?? 1.0;
        const initialScaleY = this.data.scale?.y ?? 1.0;
        this.size = {
            width: Math.max(HtmlNode.MIN_SIZE.width, this.baseSize.width * initialScaleX),
            height: Math.max(HtmlNode.MIN_SIZE.height, this.baseSize.height * initialScaleY),
        };

        // Ensure this.mesh is initialized for Node.resize() and Metaframe
        if (!this.mesh) {
            // Using a Group as a placeholder if no specific WebGL mesh is needed for HtmlNode itself
            this.mesh = new THREE.Group();
            this.mesh.userData = { nodeId: this.id, type: 'html-node-mesh-placeholder' };
        }
        this.mesh.scale.set(initialScaleX, initialScaleY, this.data.scale?.z ?? 1.0);


        this.htmlElement = this._createElement();
        this.cssObject = new CSS3DObject(this.htmlElement);
        this.cssObject.userData = { nodeId: this.id, type: 'html-node' };
        this.update();
        this.setContentScale(this.data.contentScale ?? 1.0);
        this.setBackgroundColor(this.data.backgroundColor ?? '#333344');
    }

    getCapabilities() {
        const capabilities = super.getCapabilities(); // Get base capabilities
        capabilities.canEditContent = this.data.editable === true; // Can toggle contentEditable
        capabilities.canZoomContent = true;    // HtmlNode content can be zoomed
        // canBeResized is true by default from Node.js, which is correct for HtmlNode via Metaframe
        // canEditProperties is true by default (for general props like color, label etc.)
        return capabilities;
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
                    ${/* Zoom In/Out buttons removed, will be handled by Metaframe */''}
                    ${/* Other quick buttons like Delete were already removed or will be part of Metaframe */''}
                </div>
            </div>
        `;
        this._initContentEditable(el); // Attaches general interaction listeners
        this.updateEditableState(); // Sets initial contentEditable state and input listener
        return el;
    }

    // Debounced input handler
    _onContentInput = Utils.debounce(() => {
        const contentDiv = $('.node-content', this.htmlElement);
        if (contentDiv && this.data.editable) { // Check data.editable for safety
            this.data.content = contentDiv.innerHTML;
            this.space?.emit('graph:node:dataChanged', {
                node: this,
                property: 'content',
                value: this.data.content,
            });
        }
    }, 300);

    updateEditableState() {
        const contentDiv = $('.node-content', this.htmlElement);
        if (!contentDiv) return;

        contentDiv.contentEditable = this.data.editable.toString();

        // Remove existing listener to avoid duplicates
        contentDiv.removeEventListener('input', this._onContentInput);

        if (this.data.editable) {
            contentDiv.addEventListener('input', this._onContentInput);
            // Optionally focus when made editable, but not on initial load.
            // This might be better handled in toggleContentEditable.
        }
    }

    _initContentEditable(element) {
        const contentDiv = $('.node-content', element);
        if (!contentDiv) return;

        // These listeners are always attached.
        contentDiv.addEventListener('pointerdown', (e) => {
            if (this.data.editable || e.target.closest('button, input, textarea, select, a')) {
                e.stopPropagation();
            }
        });
        contentDiv.addEventListener('touchstart', (e) => {
             if (this.data.editable || e.target.closest('button, input, textarea, select, a')) {
                e.stopPropagation();
            }
        }, { passive: true });

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
        this.space?.emit('graph:node:dataChanged', {
            node: this,
            property: 'contentScale',
            value: this.data.contentScale,
        });
    }

    setBackgroundColor(color) {
        this.data.backgroundColor = color;
        this.htmlElement?.style.setProperty('--node-bg', this.data.backgroundColor);
        this.space?.emit('graph:node:dataChanged', {
            node: this,
            property: 'backgroundColor',
            value: this.data.backgroundColor,
        });
    }

    adjustContentScale = (deltaFactor) => this.setContentScale(this.data.contentScale * deltaFactor);
    adjustNodeSize = (factor) => {
        if (!this.mesh) return; // Should be initialized by constructor
        const newScale = this.mesh.scale.clone();
        newScale.x *= factor;
        newScale.y *= factor;
        // Z scale is typically 1 for HtmlNodes, but preserve it if it was set otherwise
        // newScale.z *= factor; // Uncomment if 3D scaling of HtmlNode plane is intended
        this.resize(newScale); // Calls the overridden resize(newScale)
    };

    update(space) {
        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            applyLabelLOD(this.cssObject, this.data.labelLod, space, this.data.contentScale ?? 1.0);
        }
    }

    // Overridden resize method to work with scale from Metaframe
    resize(newScale) {
        if (this.mesh) { // Ensure mesh exists, as base Node.resize expects
            this.mesh.scale.copy(newScale);
        }

        // Calculate new pixel dimensions based on baseSize and newScale
        this.size.width = Math.max(HtmlNode.MIN_SIZE.width, this.baseSize.width * newScale.x);
        this.size.height = Math.max(HtmlNode.MIN_SIZE.height, this.baseSize.height * newScale.y);

        if (this.htmlElement) {
            this.htmlElement.style.width = `${this.size.width}px`;
            this.htmlElement.style.height = `${this.size.height}px`;
        }

        // Important: Metaframe relies on getBoundingSphereRadius *not* returning a pre-scaled radius.
        // The Node.resize() method calls this.metaframe?.update() which will handle scaling the metaframe itself.
        super.resize(newScale); // Call super to ensure metaframe updates if logic is there
    }


    getBoundingSphereRadius() {
        // Return radius based on unscaled baseSize, as Metaframe applies node.mesh.scale separately.
        return Math.sqrt(this.baseSize.width ** 2 + this.baseSize.height ** 2) / 2;
    }

    setSelectedStyle(selected) {
        this.htmlElement?.classList.toggle('selected', selected);
    }

    startResize() {
        this.htmlElement?.classList.add('resizing');
        this.space?.plugins.getPlugin('LayoutPlugin')?.layoutManager?.getActiveLayout()?.fixNode(this);
        this.space?.emit('graph:node:resizestart', { node: this });
    }

    // Old resize(newWidth, newHeight) is replaced by resize(newScale)
    // setSize is still used internally if needed, or by other methods like adjustNodeSize

    endResize() {
        this.htmlElement?.classList.remove('resizing');
        try {
            this.space?.plugins?.getPlugin('LayoutPlugin')?.layoutManager?.getActiveLayout()?.releaseNode(this);
        } catch (error) {
            console.error('Error releasing node during resize:', error);
        }
        this.space?.emit('graph:node:resizeend', { node: this, finalSize: { ...this.size } });
    }

    toggleContentEditable() {
        this.setContentEditableState(!this.data.editable);
        // Focus when toggling to editable state
        if (this.data.editable) {
            const contentDiv = $('.node-content', this.htmlElement);
            contentDiv?.focus();
        }
    }

    setContentEditableState(isEditable) {
        if (this.data.editable === isEditable) return; // No change

        this.data.editable = isEditable;
        this.updateEditableState(); // This will set contentEditable attr and manage input listener

        this.space?.emit('graph:node:dataChanged', {
            node: this,
            property: 'editable',
            value: this.data.editable,
        });

        // If metaframe button text needs to change (e.g. "Edit Content" vs "Stop Edit"),
        // or if button presence depends on this state (which it does via getCapabilities),
        // we need to refresh the metaframe's buttons.
        this.metaframe?.refreshButtons();
    }
}
