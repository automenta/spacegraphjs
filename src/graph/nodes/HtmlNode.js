import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { Utils, $ } from '../../utils.js'; // Added $ import
import { BaseNode } from './BaseNode.js';

export class HtmlNode extends BaseNode {
    static MIN_SIZE = { width: 80, height: 40 };
    static CONTENT_SCALE_RANGE = { min: 0.3, max: 3.0 };
    htmlElement = null; // Reference to the DOM element within cssObject
    size = { width: 160, height: 70 };
    billboard = false;

    constructor(id, position, data = {}, mass = 1.0) {
        super(id, position, data, mass);
        const initialWidth = this.data.width ?? 160;
        const initialHeight = this.data.height ?? 70;
        this.size = { width: initialWidth, height: initialHeight };
        this.htmlElement = this._createElement(); // Create the element first
        this.cssObject = new CSS3DObject(this.htmlElement); // Wrap it
        this.cssObject.userData = { nodeId: this.id, type: 'html-node' }; // Link back
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
            // Example: labelLod: [{distance: 500, style: 'visibility:hidden;'}, {distance: 200, scale: 0.7}]
            // 'style' will be applied directly. 'scale' will adjust transform:scale.
            // 'html' could provide simplified HTML content for a distance.
            labelLod: [],
        };
    }

    _createElement() {
        const el = document.createElement('div');
        el.className = 'node-html node-common'; // Add common class
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
                    <button class="node-quick-button node-content-zoom-in" title="Zoom In Content (+)">+</button>
                    <button class="node-quick-button node-content-zoom-out" title="Zoom Out Content (-)">-</button>
                    <button class="node-quick-button node-grow" title="Grow Node (Ctrl++)">➚</button>
                    <button class="node-quick-button node-shrink" title="Shrink Node (Ctrl+-)">➘</button>
                    <button class="node-quick-button delete-button node-delete" title="Delete Node (Del)">×</button>
                </div>
            </div>
            <div class="resize-handle" title="Resize Node"></div>
        `;
        this._initContentEditable(el); // Pass element to init
        return el;
    }

    _initContentEditable(element) {
        const contentDiv = $('.node-content', element); // Changed to use $ utility
        if (contentDiv && this.data.editable) {
            contentDiv.contentEditable = 'true';
            let debounceTimer;
            contentDiv.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.data.content = contentDiv.innerHTML;
                }, 300);
            });
            // Prevent interactions within content from triggering pan/drag
            contentDiv.addEventListener('pointerdown', (e) => e.stopPropagation());
            contentDiv.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
            contentDiv.addEventListener(
                'wheel',
                (e) => {
                    // Allow scrolling within the div if needed
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
                        e.stopPropagation(); // Stop propagation only if scrolling is possible
                    }
                },
                { passive: false }
            );
        }
    }

    setSize(width, height, scaleContent = false) {
        const oldArea = this.size.width * this.size.height;
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
        this.space?.layout?.kick();
    }

    setContentScale(scale) {
        this.data.contentScale = Utils.clamp(scale, HtmlNode.CONTENT_SCALE_RANGE.min, HtmlNode.CONTENT_SCALE_RANGE.max);
        const contentEl = $('.node-content', this.htmlElement); // Changed to use $ utility
        if (contentEl) contentEl.style.transform = `scale(${this.data.contentScale})`;
    }

    setBackgroundColor(color) {
        this.data.backgroundColor = color;
        this.htmlElement?.style.setProperty('--node-bg', this.data.backgroundColor);
    }

    adjustContentScale = (deltaFactor) => this.setContentScale(this.data.contentScale * deltaFactor);
    adjustNodeSize = (factor) => this.setSize(this.size.width * factor, this.size.height * factor, false);

    update(space) {
        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            if (this.billboard && space?.camera?._cam) {
                this.cssObject.quaternion.copy(space.camera._cam.quaternion);
            }
            this._applyLabelLOD(space);
        }
    }

    _applyLabelLOD(space) {
        if (!this.htmlElement || !this.data.labelLod || this.data.labelLod.length === 0) {
            // Ensure element is visible if no LOD rules or if it was hidden by a previous rule
            this.htmlElement.style.visibility = '';
            return;
        }

        const camera = space?.plugins?.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!camera) return;

        const distanceToCamera = this.position.distanceTo(camera.position);

        // Sort LOD levels by distance, descending, so closest matching rule is applied.
        const sortedLodLevels = [...this.data.labelLod].sort((a, b) => (b.distance || 0) - (a.distance || 0));

        let appliedRule = false;
        for (const level of sortedLodLevels) {
            if (distanceToCamera >= (level.distance || 0)) {
                if (level.style) {
                    // Potentially problematic to directly set style string like this,
                    // as it overwrites all inline styles. Better to apply specific properties.
                    // For now, 'visibility:hidden' is the primary use case.
                    if (level.style.includes('visibility:hidden')) {
                        this.htmlElement.style.visibility = 'hidden';
                    } else {
                        this.htmlElement.style.visibility = ''; // Or apply other styles from level.style
                        // Example: this.htmlElement.style.opacity = level.opacity ?? '1';
                    }
                } else {
                    this.htmlElement.style.visibility = ''; // Ensure visible if no style rule for this level
                }

                if (level.scale !== undefined) {
                    const contentEl = $('.node-content', this.htmlElement);
                    if (contentEl) {
                        // Combine with existing contentScale
                        const baseScale = this.data.contentScale ?? 1.0;
                        contentEl.style.transform = `scale(${baseScale * level.scale})`;
                    }
                } else {
                    // Reset to base scale if no LOD scale rule applies
                    const contentEl = $('.node-content', this.htmlElement);
                    if (contentEl) {
                        const baseScale = this.data.contentScale ?? 1.0;
                        contentEl.style.transform = `scale(${baseScale})`;
                    }
                }
                // TODO: Handle level.html for simplified content
                appliedRule = true;
                break;
            }
        }

        if (!appliedRule) {
            // If no rule matched (e.g., camera is closer than all defined LOD distances),
            // ensure element is visible and at base scale.
            this.htmlElement.style.visibility = '';
            const contentEl = $('.node-content', this.htmlElement);
            if (contentEl) {
                const baseScale = this.data.contentScale ?? 1.0;
                contentEl.style.transform = `scale(${baseScale})`;
            }
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
        this.space?.layout?.fixNode(this);
    }

    resize(newWidth, newHeight) {
        this.setSize(newWidth, newHeight);
    }

    endResize() {
        this.htmlElement?.classList.remove('resizing');
        this.space?.layout?.releaseNode(this);
    }
}
