import {$} from '../../utils.js';

export class ConfirmDialog {
    constructor(space, confirmDialogElement) {
        this.space = space;
        this.confirmDialogElement = confirmDialogElement;
        this.confirmCallback = null;

        this._bindEvents();
    }

    _bindEvents() {
        $('#confirm-yes', this.confirmDialogElement)?.addEventListener('click', this._onConfirmYes);
        $('#confirm-no', this.confirmDialogElement)?.addEventListener('click', this._onConfirmNo);
    }

    _onConfirmYes = () => {
        this.confirmCallback?.();
        this.hide();
    };

    _onConfirmNo = () => {
        this.hide();
    };

    show(message, onConfirm) {
        const messageEl = $('#confirm-message', this.confirmDialogElement);
        messageEl && (messageEl.textContent = message);
        this.confirmCallback = onConfirm;
        this.confirmDialogElement.style.display = 'block';
        this.space.emit('ui:confirmdialog:shown', {message});
    }

    hide = () => {
        if (this.confirmDialogElement.style.display === 'block') {
            this.confirmDialogElement.style.display = 'none';
            this.confirmCallback = null;
            this.space.emit('ui:confirmdialog:hidden');
        }
    };

    dispose() {
        $('#confirm-yes', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmYes);
        $('#confirm-no', this.confirmDialogElement)?.removeEventListener('click', this._onConfirmNo);
        this.confirmDialogElement = null;
        this.space = null;
    }
}
