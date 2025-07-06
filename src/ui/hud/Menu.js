// src/ui/hud/Menu.js
import { MenuItem } from './MenuItem.js';
import { MenuSection } from './MenuSection.js';

export class Menu {
    constructor(menuBar, menuId, label) {
        this.menuBar = menuBar;
        this.hudManager = menuBar.hudManager;
        this.id = menuId;
        this.label = label;
        this.container = document.createElement('div');
        this.container.className = 'menu';
        this.button = document.createElement('button');
        this.button.className = 'menu-button';
        this.button.textContent = label;
        this.container.appendChild(this.button);

        this.popup = document.createElement('div');
        this.popup.className = 'menu-popup';
        this.popup.style.display = 'none';
        this.container.appendChild(this.popup);

        this.items = []; // Can be MenuItem or MenuSection instances
        this.isOpen = false;

        this._bindEvents();
    }

    _bindEvents() {
        this.button.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggle();
        });

        document.addEventListener('click', (event) => {
            if (this.isOpen && !this.container.contains(event.target)) {
                this.close();
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (this.isOpen) return;
        // Close other menus
        this.menuBar.menus.forEach(menu => {
            if (menu !== this) menu.close();
        });
        this.popup.style.display = 'block';
        this.isOpen = true;
        this.hudManager.space.emit('ui:menu:opened', this);
    }

    close() {
        if (!this.isOpen) return;
        this.popup.style.display = 'none';
        this.isOpen = false;
        this.hudManager.space.emit('ui:menu:closed', this);
    }

    addMenuItem(itemId, label, callback, options = {}) {
        const menuItem = new MenuItem(this, itemId, label, callback, options);
        this.items.push(menuItem);
        this.popup.appendChild(menuItem.container);
        return menuItem;
    }

    addSeparator() {
        const separator = document.createElement('hr');
        separator.className = 'menu-separator';
        this.popup.appendChild(separator);
        // We don't add separators to this.items as they are not interactive
    }

    addSection(sectionId, title, isPinnable = true) {
        const section = new MenuSection(this, sectionId, title, isPinnable);
        this.items.push(section);
        this.popup.appendChild(section.container);
        return section;
    }

    getItem(itemId) {
        return this.items.find(item => item.id === itemId);
    }

    getSection(sectionId) {
        return this.items.find(item => item instanceof MenuSection && item.id === sectionId);
    }

    findItemRecursive(itemId) {
        for (const item of this.items) {
            if (item.id === itemId) {
                return item;
            }
            if (item instanceof MenuSection) {
                const foundInSection = item.getItem(itemId); // MenuSection.getItem searches its own items
                if (foundInSection) {
                    return foundInSection;
                }
            }
        }
        return null; // Not found
    }

    update() {
        this.items.forEach(item => {
            if (item.update) item.update();
        });
    }

    dispose() {
        this.items.forEach(item => item.dispose());
        this.items = [];
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
