/**
 * HudOverlayPanel.js - Helper class for creating draggable, closable overlay panels.
 */
export class HudOverlayPanel {
    constructor(id, title, options = {}) {
        this.id = id;
        this.titleText = title;
        this.options = {
            parentElement: document.body, // Default to body, can be hudLayer
            initialPosition: { x: 100, y: 100 },
            initialSize: { width: 'auto', height: 'auto' },
            className: '',
            canClose: true,
            canDrag: true,
            onClose: () => {},
            ...options,
        };

        this.panelElement = null;
        this.headerElement = null;
        this.titleElement = null;
        this.contentElement = null;
        this.closeButton = null;

        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.panelStartX = 0;
        this.panelStartY = 0;

        this._createPanel();
        if (this.options.canDrag) {
            this._makeDraggable();
        }
    }

    _createPanel() {
        this.panelElement = document.createElement('div');
        this.panelElement.id = this.id;
        this.panelElement.className = `hud-overlay-panel ${this.options.className}`;
        this.panelElement.style.position = 'absolute';
        this.panelElement.style.left = `${this.options.initialPosition.x}px`;
        this.panelElement.style.top = `${this.options.initialPosition.y}px`;
        this.panelElement.style.width = this.options.initialSize.width;
        this.panelElement.style.height = this.options.initialSize.height;
        this.panelElement.style.display = 'none'; // Initially hidden
        this.panelElement.style.zIndex = '1001'; // Above HUD layer but below main menu

        // Header
        this.headerElement = document.createElement('div');
        this.headerElement.className = 'hud-overlay-panel-header';

        this.titleElement = document.createElement('span');
        this.titleElement.className = 'hud-overlay-panel-title';
        this.titleElement.textContent = this.titleText;
        this.headerElement.appendChild(this.titleElement);

        if (this.options.canClose) {
            this.closeButton = document.createElement('button');
            this.closeButton.className = 'hud-overlay-panel-close';
            this.closeButton.innerHTML = '&times;';
            this.closeButton.title = 'Close';
            this.closeButton.addEventListener('click', () => {
                this.hide();
                if (this.options.onClose) {
                    this.options.onClose();
                }
            });
            this.headerElement.appendChild(this.closeButton);
        }
        this.panelElement.appendChild(this.headerElement);

        // Content
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'hud-overlay-panel-content';
        this.panelElement.appendChild(this.contentElement);

        this.options.parentElement.appendChild(this.panelElement);
    }

    _makeDraggable() {
        if (!this.headerElement) return;

        this.headerElement.style.cursor = 'move';
        this.headerElement.addEventListener('mousedown', (e) => {
            // Prevent drag if clicking on the close button itself
            if (this.closeButton && e.target === this.closeButton) {
                return;
            }
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.panelStartX = this.panelElement.offsetLeft;
            this.panelStartY = this.panelElement.offsetTop;

            document.addEventListener('mousemove', this._onDrag);
            document.addEventListener('mouseup', this._onDragEnd);
            e.preventDefault(); // Prevent text selection
        });
    }

    _onDrag = (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        this.panelElement.style.left = `${this.panelStartX + dx}px`;
        this.panelElement.style.top = `${this.panelStartY + dy}px`;
    };

    _onDragEnd = () => {
        if (!this.isDragging) return;
        this.isDragging = false;
        document.removeEventListener('mousemove', this._onDrag);
        document.removeEventListener('mouseup', this._onDragEnd);
    };

    show() {
        this.panelElement.style.display = 'flex'; // Use flex for internal layout
    }

    hide() {
        this.panelElement.style.display = 'none';
    }

    toggle() {
        if (this.panelElement.style.display === 'none') {
            this.show();
        } else {
            this.hide();
        }
    }

    isVisible() {
        return this.panelElement.style.display !== 'none';
    }

    setContent(elementOrHtml) {
        if (typeof elementOrHtml === 'string') {
            this.contentElement.innerHTML = elementOrHtml;
        } else if (elementOrHtml instanceof HTMLElement) {
            this.contentElement.innerHTML = ''; // Clear previous content
            this.contentElement.appendChild(elementOrHtml);
        }
    }

    setTitle(title) {
        this.titleText = title;
        if (this.titleElement) {
            this.titleElement.textContent = this.titleText;
        }
    }

    dispose() {
        if (this.headerElement) {
            this.headerElement.removeEventListener('mousedown', this._onDrag); // Might need more specific removal if not arrow func
        }
        document.removeEventListener('mousemove', this._onDrag);
        document.removeEventListener('mouseup', this._onDragEnd);

        this.panelElement?.remove();
        this.panelElement = null;
        this.headerElement = null;
        this.contentElement = null;
        this.closeButton = null;
    }
}
