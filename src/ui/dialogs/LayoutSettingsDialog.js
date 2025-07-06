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
            console.warn('LayoutPlugin not available for layout settings update.');
            return;
        }

        const currentLayoutName = layoutPlugin.layoutManager.getActiveLayoutName();
        const availableLayouts = [...layoutPlugin.layoutManager.layouts.keys()];

        let controlsHTML = `
            <div>
                <label for="layout-select">Current Layout: </label>
                <select id="layout-select">
        `;
        availableLayouts.forEach(name => {
            const displayName = name.charAt(0).toUpperCase() + name.slice(1);
            controlsHTML += `<option value="${name}" ${name === currentLayoutName ? 'selected' : ''}>${displayName}</option>`;
        });
        controlsHTML += `
                </select>
            </div>
            <div id="layout-description" style="margin-top: 10px; padding: 8px; background: #2c2c2c; border-radius: 4px; font-size: 0.9em; min-height: 40px;">
                Select a layout to see its description.
            </div>
            <div class="layout-options-container" style="margin-top: 15px; min-height: 50px;">
                <p><em>Layout-specific options will be available here in a future update.</em></p>
            </div>
        `;
        $('.layout-controls', this.layoutSettingsDialogElement).innerHTML = controlsHTML;

        // Add event listener for layout selection change
        const selectElement = $('#layout-select', this.layoutSettingsDialogElement);
        if (selectElement) {
            selectElement.value = currentLayoutName;
            selectElement.addEventListener('change', this._onLayoutSelectionChange);
            this._updateLayoutDescription(currentLayoutName); // Initial description
        }
    }

    _onLayoutSelectionChange = (event) => {
        this._updateLayoutDescription(event.target.value);
    }

    _getLayoutDescription(layoutName) {
        const descriptions = {
            force: "Simulates physical forces to arrange nodes. Good for organic networks and discovering structure.",
            circular: "Arranges nodes in a circle. Useful for highlighting a central node or showing cyclical relationships.",
            grid: "Aligns nodes in a regular grid pattern. Good for structured, uniform data.",
            hierarchical: "Organizes nodes in a tree-like structure. Ideal for parent-child relationships.",
            radial: "Positions nodes in concentric circles radiating from a central point. (Basic implementation)",
            treemap: "Displays hierarchical data as nested rectangles. (Basic implementation)",
            spherical: "Arranges nodes on the surface of a sphere. Useful for 3D overviews.",
            // For more complex/mode-based layouts, descriptions might be more general
            // or they might not appear in this primary list if managed differently by AdvancedLayoutManager
            constraint: "Positions nodes based on defined constraints (e.g., distance, alignment). Offers fine-grained control.",
            adaptive: "Automatically selects and applies an appropriate layout based on graph characteristics.",
            nested: "Handles layouts within container nodes. The specific layout used inside a container can vary."
        };
        return descriptions[layoutName.toLowerCase()] || "No description available for this layout.";
    }

    _updateLayoutDescription(layoutName) {
        const descriptionElement = $('#layout-description', this.layoutSettingsDialogElement);
        if (descriptionElement) {
            descriptionElement.textContent = this._getLayoutDescription(layoutName);
        }
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
            $('#apply-layout-button', this.layoutSettingsDialogElement)?.removeEventListener('click', this._onApplyLayout);
            $('#close-layout-dialog', this.layoutSettingsDialogElement)?.removeEventListener('click', this.hide);
            $('#layout-select', this.layoutSettingsDialogElement)?.removeEventListener('change', this._onLayoutSelectionChange);
            this.layoutSettingsDialogElement.remove();
            this.layoutSettingsDialogElement = null;
        }
        this.space = null;
    }
}
