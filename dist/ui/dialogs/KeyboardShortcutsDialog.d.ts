export class KeyboardShortcutsDialog {
    constructor(space: any);
    space: any;
    keyboardShortcutsDialogElement: HTMLDivElement;
    keyboardShortcuts: {
        keys: string[];
        description: string;
    }[];
    _createDialogElement(): void;
    show(): void;
    hide: () => void;
    dispose(): void;
}
