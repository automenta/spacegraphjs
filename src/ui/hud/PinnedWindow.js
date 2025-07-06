// src/ui/hud/PinnedWindow.js
export class PinnedWindow {
    constructor(hudManager, section) {
        this.hudManager = hudManager;
        this.section = section; // The MenuSection this window represents
        this.id = `pinned-${section.id}`;

        this.container = document.createElement('div');
        this.container.id = this.id;
        this.container.className = 'pinned-window';
        // Set initial position and size - can be made smarter
        this.container.style.position = 'absolute';
        this.container.style.left = '100px';
        this.container.style.top = '100px';
        this.container.style.width = '300px'; // Default width
        this.container.style.minHeight = '50px'; // Default min height
        this.container.style.backgroundColor = 'var(--graph-background-color-secondary, #282c34)';
        this.container.style.border = '1px solid var(--graph-accent-color, #61dafb)';
        this.container.style.borderRadius = '5px';
        this.container.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        this.container.style.zIndex = '1001'; // Above menu bar
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.resize = 'both'; // Allow resizing
        this.container.style.overflow = 'auto'; // Scroll if content overflows

        this.header = document.createElement('div');
        this.header.className = 'pinned-window-header';
        this.header.style.padding = '5px 10px';
        this.header.style.backgroundColor = 'var(--graph-accent-color-muted, #4a5260)';
        this.header.style.cursor = 'move';
        this.header.style.display = 'flex';
        this.header.style.justifyContent = 'space-between';
        this.header.style.alignItems = 'center';

        this.titleElement = document.createElement('span');
        this.titleElement.className = 'pinned-window-title';
        this.titleElement.textContent = section.title;
        this.titleElement.style.color = 'var(--graph-text-color-primary, #ffffff)';
        this.header.appendChild(this.titleElement);

        this.closeButton = document.createElement('button');
        this.closeButton.className = 'pinned-window-close-button';
        this.closeButton.innerHTML = '&#x2715;'; // '✖' (multiplication x)
        this.closeButton.title = 'Close';
        this.closeButton.style.background = 'none';
        this.closeButton.style.border = 'none';
        this.closeButton.style.color = 'var(--graph-text-color-primary, #ffffff)';
        this.closeButton.style.fontSize = '16px';
        this.closeButton.style.cursor = 'pointer';
        this.header.appendChild(this.closeButton);

        this.container.appendChild(this.header);

        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'pinned-window-content';
        this.contentContainer.style.padding = '10px';
        this.contentContainer.style.flexGrow = '1'; // Allow content to take available space
        this.contentContainer.appendChild(section.getContentForPinning());
        this.container.appendChild(this.contentContainer);

        this.hudManager.hudLayer.appendChild(this.container);

        this._makeDraggable();
        this._bindCloseEvent();
    }

    _bindCloseEvent() {
        this.closeButton.addEventListener('click', () => {
            this.close();
        });
    }

    _makeDraggable() {
        let isDragging = false;
        let offsetX, offsetY;

        this.header.addEventListener('mousedown', (e) => {
            // Prevent dragging if target is the close button itself
            if (e.target === this.closeButton) return;

            isDragging = true;
            offsetX = e.clientX - this.container.offsetLeft;
            offsetY = e.clientY - this.container.offsetTop;
            this.container.style.userSelect = 'none'; // Prevent text selection while dragging
            // e.preventDefault(); // Prevent text selection issues
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            // Ensure movement is within reasonable bounds of the HUD layer or viewport
            const parentRect = this.hudManager.hudLayer.getBoundingClientRect();
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            // Basic boundary collision
            newX = Math.max(0, Math.min(newX, parentRect.width - this.container.offsetWidth));
            newY = Math.max(0, Math.min(newY, parentRect.height - this.container.offsetHeight));

            this.container.style.left = `${newX}px`;
            this.container.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.container.style.userSelect = ''; // Re-enable text selection
            }
        });
    }

    updateContent() {
        // If the original section's content can change dynamically,
        // this method could be called to refresh the pinned window's content.
        this.contentContainer.innerHTML = ''; // Clear old content
        this.contentContainer.appendChild(this.section.getContentForPinning());
    }

    close() {
        this.hudManager.unpinSection(this.section.id);
    }

    dispose() {
        // Remove event listeners from document for dragging
        // For simplicity, this example assumes they are managed or this is the only draggable type.
        // Proper cleanup would involve removing specific listeners attached in _makeDraggable.
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
