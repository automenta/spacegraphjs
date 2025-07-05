export class ConfirmDialog {
    constructor(space: any, confirmDialogElement: any);
    space: any;
    confirmDialogElement: any;
    confirmCallback: any;
    _bindEvents(): void;
    _onConfirmYes: () => void;
    _onConfirmNo: () => void;
    show(message: any, onConfirm: any): void;
    hide: () => void;
    dispose(): void;
}
