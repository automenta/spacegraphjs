import {HtmlNode} from './HtmlNode.js';
import {$} from '../../utils.js';

export class ControlPanelNode extends HtmlNode {
    static typeName = 'control-panel';
    controls = new Map();
    values = new Map();

    constructor(id, position, data = {}, mass = 1.0) {
        const controlData = {
            width: data.width ?? 280,
            height: data.height ?? 200,
            title: data.title ?? 'Control Panel',
            controls: data.controls ?? [],
            theme: data.theme ?? 'dark',
            backgroundColor: data.backgroundColor ?? 'rgba(20, 25, 40, 0.95)',
            ...data,
        };

        super(id, position, controlData, mass);
        this._initializeControls();
        this._bindEvents();
    }

    getDefaultData() {
        return {
            ...super.getDefaultData(),
            type: 'control-panel',
            title: 'Control Panel',
            controls: [],
            theme: 'dark',
            backgroundColor: 'rgba(20, 25, 40, 0.95)',
        };
    }

    _createElement() {
        const el = document.createElement('div');
        el.className = `node-control-panel node-common theme-${this.data.theme}`;
        el.id = `node-control-panel-${this.id}`;
        el.dataset.nodeId = this.id;
        el.style.width = `${this.size.width}px`;
        el.style.height = `${this.size.height}px`;
        el.draggable = false;

        el.innerHTML = `
            <div class="control-panel-header">
                <h3 class="panel-title">${this.data.title}</h3>
                <div class="panel-actions">
                    <button class="panel-minimize" title="Minimize">−</button>
                    <button class="panel-close" title="Close">×</button>
                </div>
            </div>
            <div class="control-panel-body">
                <div class="controls-container"></div>
            </div>
            <style>
                .node-control-panel {
                    background: ${this.data.backgroundColor};
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    backdrop-filter: blur(10px);
                    font-family: 'Segoe UI', sans-serif;
                    color: white;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                }
                .control-panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: rgba(0,0,0,0.2);
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .panel-title {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: #fff;
                }
                .panel-actions {
                    display: flex;
                    gap: 4px;
                }
                .panel-actions button {
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    transition: background 0.2s;
                }
                .panel-actions button:hover {
                    background: rgba(255,255,255,0.2);
                }
                .control-panel-body {
                    padding: 12px;
                    height: calc(100% - 50px);
                    overflow-y: auto;
                }
                .control-group {
                    margin-bottom: 16px;
                }
                .control-label {
                    display: block;
                    font-size: 12px;
                    margin-bottom: 6px;
                    color: rgba(255,255,255,0.8);
                    font-weight: 500;
                }
                .control-input {
                    width: 100%;
                    padding: 6px 8px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 4px;
                    color: white;
                    font-size: 13px;
                }
                .control-input:focus {
                    outline: none;
                    border-color: #4a9eff;
                    box-shadow: 0 0 0 2px rgba(74,158,255,0.2);
                }
                .control-slider {
                    width: 100%;
                    height: 6px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 3px;
                    outline: none;
                    appearance: none;
                    cursor: pointer;
                }
                .control-slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    background: #4a9eff;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                }
                .control-button {
                    width: 100%;
                    padding: 8px 12px;
                    background: linear-gradient(135deg, #4a9eff, #357abd);
                    border: none;
                    border-radius: 4px;
                    color: white;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .control-button:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(74,158,255,0.3);
                }
                .control-button:active {
                    transform: translateY(0);
                }
                .control-value {
                    float: right;
                    font-size: 11px;
                    color: #4a9eff;
                    font-weight: 600;
                }
                .control-switch {
                    position: relative;
                    width: 44px;
                    height: 24px;
                    margin: 0;
                }
                .control-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .control-switch .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(255,255,255,0.2);
                    transition: 0.3s;
                    border-radius: 24px;
                }
                .control-switch .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }
                .control-switch input:checked + .slider {
                    background-color: #4a9eff;
                }
                .control-switch input:checked + .slider:before {
                    transform: translateX(20px);
                }
            </style>
        `;

        this._setupPanelInteractions(el);
        return el;
    }

    _setupPanelInteractions(el) {
        const minimizeBtn = $('.panel-minimize', el);
        const closeBtn = $('.panel-close', el);
        const body = $('.control-panel-body', el);

        minimizeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isMinimized = body.style.display === 'none';
            body.style.display = isMinimized ? 'block' : 'none';
            minimizeBtn.textContent = isMinimized ? '−' : '+';
            this.setSize(this.size.width, isMinimized ? this.size.height : 50);
        });

        closeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.space?.emit('graph:node:delete', { node: this });
        });
    }

    _initializeControls() {
        const container = $('.controls-container', this.htmlElement);
        if (!container) return;

        this.data.controls.forEach(control => {
            const controlEl = this._createControl(control);
            if (controlEl) {
                container.appendChild(controlEl);
                this.controls.set(control.id, controlEl);
                this.values.set(control.id, control.value ?? control.defaultValue ?? 0);
            }
        });
    }

    _createControl(control) {
        const group = document.createElement('div');
        group.className = 'control-group';

        const label = document.createElement('label');
        label.className = 'control-label';
        label.textContent = control.label;

        if (control.showValue !== false && (control.type === 'slider' || control.type === 'number')) {
            const valueSpan = document.createElement('span');
            valueSpan.className = 'control-value';
            valueSpan.textContent = control.value ?? control.defaultValue ?? 0;
            label.appendChild(valueSpan);
        }

        group.appendChild(label);

        let input;
        switch (control.type) {
            case 'slider':
                input = this._createSlider(control);
                break;
            case 'button':
                input = this._createButton(control);
                break;
            case 'switch':
                input = this._createSwitch(control);
                break;
            case 'text':
                input = this._createTextInput(control);
                break;
            case 'number':
                input = this._createNumberInput(control);
                break;
            case 'select':
                input = this._createSelect(control);
                break;
            default:
                return null;
        }

        if (input) {
            group.appendChild(input);
            return group;
        }
        return null;
    }

    _createSlider(control) {
        const input = document.createElement('input');
        input.type = 'range';
        input.className = 'control-slider';
        input.min = control.min ?? 0;
        input.max = control.max ?? 100;
        input.step = control.step ?? 1;
        input.value = control.value ?? control.defaultValue ?? 0;

        input.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.values.set(control.id, value);
            
            const valueSpan = e.target.parentNode.querySelector('.control-value');
            if (valueSpan) valueSpan.textContent = value;

            this._emitControlChange(control.id, value, control);
        });

        return input;
    }

    _createButton(control) {
        const button = document.createElement('button');
        button.className = 'control-button';
        button.textContent = control.text ?? control.label;
        
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this._emitControlChange(control.id, true, control);
        });

        return button;
    }

    _createSwitch(control) {
        const wrapper = document.createElement('label');
        wrapper.className = 'control-switch';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = control.value ?? control.defaultValue ?? false;

        const slider = document.createElement('span');
        slider.className = 'slider';

        wrapper.appendChild(input);
        wrapper.appendChild(slider);

        input.addEventListener('change', (e) => {
            const value = e.target.checked;
            this.values.set(control.id, value);
            this._emitControlChange(control.id, value, control);
        });

        return wrapper;
    }

    _createTextInput(control) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'control-input';
        input.value = control.value ?? control.defaultValue ?? '';
        input.placeholder = control.placeholder ?? '';

        input.addEventListener('input', (e) => {
            const value = e.target.value;
            this.values.set(control.id, value);
            this._emitControlChange(control.id, value, control);
        });

        input.addEventListener('pointerdown', (e) => e.stopPropagation());

        return input;
    }

    _createNumberInput(control) {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'control-input';
        input.value = control.value ?? control.defaultValue ?? 0;
        input.min = control.min ?? '';
        input.max = control.max ?? '';
        input.step = control.step ?? 'any';

        input.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) || 0;
            this.values.set(control.id, value);
            
            const valueSpan = e.target.parentNode.querySelector('.control-value');
            if (valueSpan) valueSpan.textContent = value;

            this._emitControlChange(control.id, value, control);
        });

        input.addEventListener('pointerdown', (e) => e.stopPropagation());

        return input;
    }

    _createSelect(control) {
        const select = document.createElement('select');
        select.className = 'control-input';

        (control.options ?? []).forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value ?? option;
            optionEl.textContent = option.label ?? option;
            select.appendChild(optionEl);
        });

        select.value = control.value ?? control.defaultValue ?? '';

        select.addEventListener('change', (e) => {
            const value = e.target.value;
            this.values.set(control.id, value);
            this._emitControlChange(control.id, value, control);
        });

        select.addEventListener('pointerdown', (e) => e.stopPropagation());

        return select;
    }

    _emitControlChange(controlId, value, control) {
        this.space?.emit('graph:node:controlChanged', {
            node: this,
            controlId,
            value,
            control,
            allValues: Object.fromEntries(this.values)
        });
    }

    _bindEvents() {
        this.htmlElement.addEventListener('pointerdown', (e) => {
            if (!e.target.closest('.control-input, .control-slider, .control-button, .control-switch')) {
                e.stopPropagation();
            }
        });
    }

    setValue(controlId, value) {
        if (!this.controls.has(controlId)) { // Only set if control is known
            return;
        }
        this.values.set(controlId, value);
        const controlEl = this.controls.get(controlId);
        if (!controlEl) return; // Should not happen if this.controls.has(controlId) is true

        const input = controlEl.querySelector('input, select, button');
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = value;
            } else if (input.type === 'range' || input.type === 'number') {
                input.value = value;
                const valueSpan = controlEl.querySelector('.control-value');
                if (valueSpan) valueSpan.textContent = value;
            } else {
                input.value = value;
            }
        }
    }

    getValue(controlId) {
        return this.values.get(controlId);
    }

    getAllValues() {
        return Object.fromEntries(this.values);
    }

    addControl(control) {
        this.data.controls.push(control);
        const container = $('.controls-container', this.htmlElement);
        if (container) {
            const controlEl = this._createControl(control);
            if (controlEl) {
                container.appendChild(controlEl);
                this.controls.set(control.id, controlEl);
                this.values.set(control.id, control.value ?? control.defaultValue ?? 0);
            }
        }
    }

    removeControl(controlId) {
        const controlEl = this.controls.get(controlId);
        if (controlEl) {
            controlEl.remove();
            this.controls.delete(controlId);
            this.values.delete(controlId);
        }
        this.data.controls = this.data.controls.filter(c => c.id !== controlId);
    }
}