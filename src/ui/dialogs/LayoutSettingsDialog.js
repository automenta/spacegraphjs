import { $ } from '../../utils.js';

export class LayoutSettingsDialog {
    constructor(space) {
        this.space = space;
        this.layoutSettingsDialogElement = null;
    }

    _createDialogElement() {
        if (this.layoutSettingsDialogElement) return;

        this.layoutSettingsDialogElement = document.createElement('div');
        this.layoutSettingsDialogElement.id = 'layout-settings-dialog';
        this.layoutSettingsDialogElement.className = 'dialog';
        this.layoutSettingsDialogElement.addEventListener('pointerdown', (e) => e.stopPropagation());
        document.body.appendChild(this.layoutSettingsDialogElement);

        // Initial structure, content will be updated dynamically
        this.layoutSettingsDialogElement.innerHTML = `
            <h2>Layout Settings</h2>
            <div class="layout-controls"></div>
            <button id="apply-layout-button" style="margin-right: 10px;">Apply Layout</button>
            <button id="close-layout-dialog">Close</button>
        `;

        $('#apply-layout-button', this.layoutSettingsDialogElement)?.addEventListener('click', this._onApplyLayout);
        $('#close-layout-dialog', this.layoutSettingsDialogElement)?.addEventListener('click', this.hide);
    }

    _onApplyLayout = () => {
        const selectedLayout = $('#layout-select', this.layoutSettingsDialogElement)?.value;
        if (selectedLayout) {
            this.space.emit('ui:request:applyLayout', selectedLayout);
            // Give a moment for layout to apply before updating content
            setTimeout(() => this._updateContent(), 100);
        }
    };

    _updateContent() {
        if (!this.layoutSettingsDialogElement || this.layoutSettingsDialogElement.style.display === 'none') return;

        const layoutPlugin = this.space.plugins.getPlugin('LayoutPlugin');
        if (!layoutPlugin?.layoutManager) {
            // console.warn('LayoutPlugin not available for layout settings update.');
            return;
        }

        const currentLayoutName = layoutPlugin.layoutManager.getActiveLayoutName();
        const availableLayouts = [...layoutPlugin.layoutManager.layouts.keys()];

        let controlsHTML = `
            <div>
                <label for="layout-select">Current Layout: </label>
                <select id="layout-select">
        `;
        availableLayouts.forEach((name) => {
            const displayName = name.charAt(0).toUpperCase() + name.slice(1);
            controlsHTML += `<option value="${name}" ${name === currentLayoutName ? 'selected' : ''}>${displayName}</option>`;
        });
        controlsHTML += `
                </select>
            </div>
            <div class="layout-options-container" style="margin-top: 15px; min-height: 50px;">
                <p><em>Layout-specific options will be available here in a future update.</em></p>
            </div>
        `;
        $('.layout-controls', this.layoutSettingsDialogElement).innerHTML = controlsHTML;

        // Re-select the current layout in case it changed externally
        const selectElement = $('#layout-select', this.layoutSettingsDialogElement);
        selectElement && (selectElement.value = currentLayoutName);
    }

    show() {
        this._createDialogElement();
        this._updateContent(); // Populate content when showing
        this.layoutSettingsDialogElement.style.display = 'block';
        this.space.emit('ui:layoutsettings:shown');
    }

    hide = () => {
        if (this.layoutSettingsDialogElement) {
            this.layoutSettingsDialogElement.style.display = 'none';
            this.space.emit('ui:layoutsettings:hidden');
        }
    };

    dispose() {
        if (this.layoutSettingsDialogElement) {
            $('#apply-layout-button', this.layoutSettingsDialogElement)?.removeEventListener(
                'click',
                this._onApplyLayout
            );
            $('#close-layout-dialog', this.layoutSettingsDialogElement)?.removeEventListener('click', this.hide);
            this.layoutSettingsDialogElement.remove();
            this.layoutSettingsDialogElement = null;
        }
        this.space = null;
    }
}
