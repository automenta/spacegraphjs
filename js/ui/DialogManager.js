// js/ui/DialogManager.js

export class DialogManager {
    constructor(spaceGraph, uiManagerFacade) {
        this.spaceGraph = spaceGraph; // May not be strictly needed if elements are passed or found globally
        this.uiManager = uiManagerFacade; // The main UIManager facade, if needed for complex interactions (unlikely for dialogs)

        // Elements are obtained via UIManager facade, which handles their creation/retrieval
        this.confirmDialogElement = this.uiManager.getDomElement('confirmDialog');
        this.statusIndicatorElement = this.uiManager.getDomElement('statusIndicator');

        this._confirmCallback = null;

        this._bindDialogEvents();
    }

    _bindDialogEvents() {
        const confirmYesButton = this.confirmDialogElement?.querySelector('#confirm-yes');
        const confirmNoButton = this.confirmDialogElement?.querySelector('#confirm-no');

        if (confirmYesButton) {
            confirmYesButton.addEventListener('click', this._handleConfirmYes.bind(this));
        }
        if (confirmNoButton) {
            confirmNoButton.addEventListener('click', this._handleConfirmNo.bind(this));
        }
    }

    dispose() {
        // Remove event listeners from confirm dialog buttons
        const confirmYesButton = this.confirmDialogElement?.querySelector('#confirm-yes');
        const confirmNoButton = this.confirmDialogElement?.querySelector('#confirm-no');
        if (confirmYesButton) {
            confirmYesButton.removeEventListener('click', this._handleConfirmYes.bind(this));
        }
        if (confirmNoButton) {
            confirmNoButton.removeEventListener('click', this._handleConfirmNo.bind(this));
        }

        // UIManager facade will be responsible for removing the DOM elements if it created them.
        this.confirmDialogElement = null;
        this.statusIndicatorElement = null;
        this._confirmCallback = null;
        // console.log("DialogManager disposed.");
    }

    showConfirm(message, onConfirm) {
        // Logic from UIManager._showConfirm
        const msgEl = this.confirmDialogElement?.querySelector('#confirm-message');
        if (msgEl) msgEl.textContent = message;
        this._confirmCallback = onConfirm;
        if (this.confirmDialogElement) this.confirmDialogElement.style.display = 'block';
    }

    _hideConfirm() {
        // Logic from UIManager._hideConfirm
        if (this.confirmDialogElement) this.confirmDialogElement.style.display = 'none';
        this._confirmCallback = null;
    }

    _handleConfirmYes() {
        // Logic from UIManager._onConfirmYes
        this._confirmCallback?.();
        this._hideConfirm();
    }

    _handleConfirmNo() {
        // Logic from UIManager._onConfirmNo
        this._hideConfirm();
    }

    showStatus(message, type = 'info', duration = 3000) {
        // Logic from UIManager.showStatus
        if (!this.statusIndicatorElement) return;
        this.statusIndicatorElement.textContent = message;
        this.statusIndicatorElement.className = `status-indicator status-${type}`;
        this.statusIndicatorElement.style.opacity = '1';
        this.statusIndicatorElement.style.display = 'block';

        // Clear any existing timeout for this element to prevent premature hiding if called rapidly
        if (this.statusIndicatorElement._fadeTimeout) {
            clearTimeout(this.statusIndicatorElement._fadeTimeout);
        }
        if (this.statusIndicatorElement._hideTimeout) {
            clearTimeout(this.statusIndicatorElement._hideTimeout);
        }

        this.statusIndicatorElement._fadeTimeout = setTimeout(() => {
            this.statusIndicatorElement.style.opacity = '0';
            // Set display to none after transition, only if opacity is still 0 (not re-shown)
            this.statusIndicatorElement._hideTimeout = setTimeout(() => {
                if(this.statusIndicatorElement.style.opacity === '0') {
                    this.statusIndicatorElement.style.display = 'none';
                }
            }, 500); // Duration of typical CSS opacity transition
        }, duration);
    }
}
