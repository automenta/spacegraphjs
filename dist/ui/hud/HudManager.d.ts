/**
 * Manages Heads-Up Display (HUD) elements, including a main menu for settings and actions,
 * and selection information.
 */
export class HudManager {
    /**
     * Creates an instance of HudManager.
     * @param {SpaceGraph} space - The main SpaceGraph instance.
     * @param {HTMLElement} container - The main container element for the graph.
     * @param {object} uiPluginCallbacks - Callbacks provided by the UIPlugin.
     * @param {function} uiPluginCallbacks.getSelectedNodes - Function to get currently selected nodes.
     * @param {function} uiPluginCallbacks.getSelectedEdges - Function to get currently selected edges.
     */
    constructor(space: SpaceGraph, container: HTMLElement, uiPluginCallbacks: {
        getSelectedNodes: Function;
        getSelectedEdges: Function;
    });
    space: SpaceGraph;
    container: HTMLElement;
    _uiPluginCallbacks: {
        getSelectedNodes: Function;
        getSelectedEdges: Function;
    };
    hudLayer: any;
    hudMainMenuButton: HTMLDivElement;
    hudPopupMenu: HTMLDivElement;
    hudModeIndicator: HTMLSelectElement;
    hudSelectionInfo: any;
    hudKeyboardShortcutsButton: HTMLButtonElement;
    hudLayoutSettingsButton: HTMLButtonElement;
    isPopupMenuVisible: boolean;
    keyboardShortcutsDialog: KeyboardShortcutsDialog;
    layoutSettingsDialog: LayoutSettingsDialog;
    /**
     * Creates and appends all HUD elements to the DOM.
     * @private
     */
    private _createHudElements;
    /**
     * Helper method to create a group container for a HUD menu item.
     * @param {string|null} labelText - Text for the label. If null, no label is created.
     * @param {HTMLElement} controlElement - The control element (e.g., select, button) for the group.
     * @returns {HTMLDivElement} The created group element.
     * @private
     */
    private _createMenuGroup;
    /**
     * Toggles the visibility of the HUD popup menu.
     * Manages event listeners for closing the menu.
     * @param {Event} [event] - The click event that triggered the toggle.
     * @private
     */
    private _togglePopupMenu;
    _handleClickOutsideMenu: (event: any) => void;
    /**
     * Handles the Escape key press to close the popup menu.
     * @param {KeyboardEvent} event - The keydown event.
     * @private
     */
    private _handleEscKey;
    /**
     * Binds event listeners to HUD elements.
     * @private
     */
    private _bindEvents;
    _onModeIndicatorChange: (event: any) => void;
    /** @private */
    private _onKeyboardShortcutsButtonClick;
    /** @private */
    private _onLayoutSettingsButtonClick;
    /**
     * Updates the HUD camera mode selector with the current camera mode
     * and ensures the list of available modes is current.
     * @param {string} [mode] - The camera mode to set. Defaults to the current mode from CameraPlugin.
     */
    updateHudCameraMode(mode?: string): void;
    /**
     * Updates the HUD element that displays information about the current selection (nodes/edges).
     */
    updateHudSelectionInfo(): void;
    /**
     * Checks if the keyboard shortcuts dialog is currently visible.
     * @returns {boolean} True if visible, false otherwise.
     */
    isKeyboardShortcutsDialogVisible(): boolean;
    /**
     * Checks if the layout settings dialog is currently visible.
     * @returns {boolean} True if visible, false otherwise.
     */
    isLayoutSettingsDialogVisible(): boolean;
    /**
     * Hides all managed dialogs and the HUD popup menu.
     */
    hideAllDialogs(): void;
    /**
     * Cleans up all resources, removes elements, and detaches event listeners.
     */
    dispose(): void;
}
import { KeyboardShortcutsDialog } from '../dialogs/KeyboardShortcutsDialog.js';
import { LayoutSettingsDialog } from '../dialogs/LayoutSettingsDialog.js';
