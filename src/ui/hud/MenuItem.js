// src/ui/hud/MenuItem.js
export class MenuItem {
    constructor(parentMenuOrSection, itemId, label, callback, options = {}) {
        this.parentMenuOrSection = parentMenuOrSection;
        this.hudManager = parentMenuOrSection.hudManager;
        this.id = itemId;
        this.label = label;
        this.callback = callback;
        this.options = options; // e.g., { type: 'checkbox', checked: false, disabled: false, hotkey: 'Ctrl+O' }

        this.container = document.createElement('div');
        this.container.className = 'menu-item';
        if (options.disabled) {
            this.container.classList.add('disabled');
        }

        this.labelElement = document.createElement('span');
        this.labelElement.className = 'menu-item-label';
        this.labelElement.textContent = label;
        this.container.appendChild(this.labelElement);

        if (options.hotkey) {
            this.hotkeyElement = document.createElement('span');
            this.hotkeyElement.className = 'menu-item-hotkey';
            this.hotkeyElement.textContent = options.hotkey;
            this.container.appendChild(this.hotkeyElement);
        }

        if (options.type === 'checkbox') {
            this.checkboxElement = document.createElement('input');
            this.checkboxElement.type = 'checkbox';
            this.checkboxElement.checked = !!options.checked;
            this.checkboxElement.className = 'menu-item-checkbox';
            this.container.insertBefore(this.checkboxElement, this.labelElement); // Checkbox before label
        }

        // Basic submenu indicator (can be enhanced with proper submenu class)
        if (options.submenu) { // options.submenu would be a Menu instance or an array of items to create a submenu
            this.container.classList.add('has-submenu');
            // Logic to handle submenu display would go here or in the Menu class
        }


        this._bindEvents();
    }

    _bindEvents() {
        this.container.addEventListener('click', (event) => {
            event.stopPropagation();
            if (this.options.disabled) return;

            if (this.options.type === 'checkbox') {
                this.checkboxElement.checked = !this.checkboxElement.checked;
                if (this.callback) {
                    this.callback(this.checkboxElement.checked, this);
                }
            } else {
                if (this.callback) {
                    this.callback(this);
                }
            }
            // For items that are not checkboxes or submenus, close the main menu
            if (this.parentMenuOrSection.close && !this.options.submenu && this.options.type !== 'checkbox') {
                 // Close all levels of menus
                let parent = this.parentMenuOrSection;
                while(parent && parent.close) {
                    parent.close();
                    parent = parent.parentMenuOrSection || parent.menu; // Navigate up
                }
            }
        });

        this.container.addEventListener('mouseenter', () => {
            if (this.options.disabled) return;
            this.container.classList.add('hover');
            // Handle submenu opening on hover if applicable
        });

        this.container.addEventListener('mouseleave', () => {
            this.container.classList.remove('hover');
            // Handle submenu closing on hover if applicable
        });
    }

    setLabel(newLabel) {
        this.label = newLabel;
        this.labelElement.textContent = newLabel;
    }

    setChecked(checked) {
        if (this.options.type === 'checkbox' && this.checkboxElement) {
            this.checkboxElement.checked = !!checked;
        }
    }

    isChecked() {
        if (this.options.type === 'checkbox' && this.checkboxElement) {
            return this.checkboxElement.checked;
        }
        return false;
    }

    setDisabled(disabled) {
        this.options.disabled = !!disabled;
        if (this.options.disabled) {
            this.container.classList.add('disabled');
        } else {
            this.container.classList.remove('disabled');
        }
        if (this.checkboxElement) {
            this.checkboxElement.disabled = !!disabled;
        }
    }

    update() {
        // For dynamic updates, e.g., based on application state
        if (this.options.updateHandler) {
            this.options.updateHandler(this);
        }
    }

    dispose() {
        // Remove event listeners if any were added directly to global objects (e.g., document)
        // For this simple component, removing from DOM is usually enough
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
