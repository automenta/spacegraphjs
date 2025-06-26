import { $ } from '../../utils.js';

export class KeyboardShortcutsDialog {
    constructor(space) {
        this.space = space;
        this.keyboardShortcutsDialogElement = null;
        this.keyboardShortcuts = [
            { keys: ['Delete', 'Backspace'], description: 'Delete selected node(s) or edge(s)' },
            { keys: ['Escape'], description: 'Close menus, cancel linking, deselect all, or exit pointer lock' },
            { keys: ['Enter'], description: 'Focus content of selected HTML node (if editable)' },
            { keys: ['+', '='], description: 'Zoom in content of selected HTML node' },
            { keys: ['Ctrl/Meta + +', 'Ctrl/Meta + ='], description: 'Increase size of selected HTML node' },
            { keys: ['-'], description: 'Zoom out content of selected HTML node' },
            { keys: ['Ctrl/Meta + -'], description: 'Decrease size of selected HTML node' },
            { keys: ['Spacebar'], description: 'Focus on selected item or center view' },
            { keys: ['Scroll Wheel'], description: 'Zoom camera' },
            { keys: ['Ctrl/Meta + Scroll Wheel'], description: 'Adjust content scale of hovered HTML node' },
            { keys: ['Middle Mouse Button (on node)'], description: 'Auto-zoom to node' },
            { keys: ['Alt + Drag Node (vertical)'], description: 'Adjust node Z-depth' },
        ];
    }

    _createDialogElement() {
        if (this.keyboardShortcutsDialogElement) return;

        this.keyboardShortcutsDialogElement = document.createElement('div');
        this.keyboardShortcutsDialogElement.id = 'keyboard-shortcuts-dialog';
        this.keyboardShortcutsDialogElement.className = 'dialog';
        this.keyboardShortcutsDialogElement.addEventListener('pointerdown', (e) => e.stopPropagation());

        let tableHTML = `
            <h2>Keyboard Shortcuts</h2>
            <table class="shortcuts-table">
                <thead>
                    <tr>
                        <th>Key(s)</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;
        this.keyboardShortcuts.forEach(shortcut => {
            tableHTML += `
                <tr>
                    <td>${shortcut.keys.map(key => `<kbd>${key}</kbd>`).join(' / ')}</td>
                    <td>${shortcut.description}</td>
                </tr>
            `;
        });
        tableHTML += `
                </tbody>
            </table>
            <button id="close-shortcuts-dialog">Close</button>
        `;
        this.keyboardShortcutsDialogElement.innerHTML = tableHTML;
        document.body.appendChild(this.keyboardShortcutsDialogElement);

        $('#close-shortcuts-dialog', this.keyboardShortcutsDialogElement)?.addEventListener('click', this.hide);
    }

    show() {
        this._createDialogElement();
        this.keyboardShortcutsDialogElement.style.display = 'block';
        this.space.emit('ui:keyboardshortcuts:shown');
    }

    hide = () => {
        if (this.keyboardShortcutsDialogElement) {
            this.keyboardShortcutsDialogElement.style.display = 'none';
            this.space.emit('ui:keyboardshortcuts:hidden');
        }
    };

    dispose() {
        if (this.keyboardShortcutsDialogElement) {
            $('#close-shortcuts-dialog', this.keyboardShortcutsDialogElement)?.removeEventListener('click', this.hide);
            this.keyboardShortcutsDialogElement.remove();
            this.keyboardShortcutsDialogElement = null;
        }
        this.space = null;
    }
}
