/**
 * @file UIPlugin.js - Manages the UIManager for SpaceGraph.
 * @licence MIT
 */

import { Plugin } from '../core/Plugin.js';
import { UIManager } from '../ui/UIManager.js';

export class UIPlugin extends Plugin {
    /** @type {UIManager | null} */
    uiManager = null;
    contextMenuElement = null;
    confirmDialogElement = null;

    constructor(spaceGraph, pluginManager, contextMenuElement, confirmDialogElement) {
        super(spaceGraph, pluginManager);
        this.contextMenuElement = contextMenuElement;
        this.confirmDialogElement = confirmDialogElement;
    }

    getName() {
        return 'UIPlugin';
    }

    init() {
        super.init();
        // UIManager constructor expects the SpaceGraph instance, contextMenuEl, confirmDialogEl.
        if (!this.contextMenuElement || !this.confirmDialogElement) {
            console.error("UIPlugin: Missing contextMenuElement or confirmDialogElement for UIManager initialization.");
            return;
        }
        this.uiManager = new UIManager(this.space, this.contextMenuElement, this.confirmDialogElement);

        // Initialize UI elements if UIManager has such a method,
        // or UIManager's constructor handles it.
        // For now, UIManager's constructor sets up its own event listeners.
    }

    /**
     * Provides the UIManager instance.
     * @returns {UIManager | null}
     */
    getUIManager() {
        return this.uiManager;
    }

    /**
     * The main update loop for UI-specific tasks, if any, that need per-frame updates.
     */
    update() {
        // Example: Delegate to UIManager's update method if it exists
        // This is where this.ui?.updateEdgeMenuPosition() from SpaceGraph would go.
        if (this.uiManager && typeof this.uiManager.updateEdgeMenuPosition === 'function') {
            this.uiManager.updateEdgeMenuPosition();
        }
    }

    dispose() {
        super.dispose();
        this.uiManager?.dispose();
        this.uiManager = null;
        // console.log('UIPlugin disposed.');
    }
}
