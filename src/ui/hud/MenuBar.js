// src/ui/hud/MenuBar.js
import { Menu } from './Menu.js';

export class MenuBar {
    constructor(hudManager) {
        this.hudManager = hudManager;
        this.container = document.createElement('div');
        this.container.id = 'spacegraph-menu-bar';
        this.leftContainer = document.createElement('div');
        this.leftContainer.className = 'menu-bar-left';
        this.rightContainer = document.createElement('div');
        this.rightContainer.className = 'menu-bar-right';
        this.container.appendChild(this.leftContainer);
        this.container.appendChild(this.rightContainer);
        this.menus = new Map();
        this.statusElements = new Map();
    }

    addMenu(menuId, label) {
        if (this.menus.has(menuId)) {
            console.warn(`Menu with id ${menuId} already exists.`);
            return this.menus.get(menuId);
        }
        const menu = new Menu(this, menuId, label);
        this.menus.set(menuId, menu);
        this.leftContainer.appendChild(menu.container);
        return menu;
    }

    getMenu(menuId) {
        return this.menus.get(menuId);
    }

    addStatusElement(elementId, element) {
        if (this.statusElements.has(elementId)) {
            console.warn(`Status element with id ${elementId} already exists.`);
            this.removeStatusElement(elementId);
        }
        this.statusElements.set(elementId, element);
        this.rightContainer.appendChild(element);
    }

    removeStatusElement(elementId) {
        const element = this.statusElements.get(elementId);
        if (element && element.parentNode === this.rightContainer) {
            this.rightContainer.removeChild(element);
        }
        this.statusElements.delete(elementId);
    }

    update() {
        this.menus.forEach(menu => menu.update());
        // Update status elements if needed
    }

    updateMenuItemState(itemId, checked) {
        for (const menu of this.menus.values()) {
            const item = menu.findItemRecursive(itemId); // Helper to be added to Menu.js
            if (item && typeof item.setChecked === 'function') {
                item.setChecked(checked);
                return true; // Item found and updated
            }
        }
        // console.warn(`MenuBar: MenuItem with id '${itemId}' not found.`);
        return false; // Item not found
    }

    dispose() {
        this.menus.forEach(menu => menu.dispose());
        this.menus.clear();
        this.statusElements.forEach(element => {
            if (element.parentNode === this.rightContainer) {
                this.rightContainer.removeChild(element);
            }
        });
        this.statusElements.clear();
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
