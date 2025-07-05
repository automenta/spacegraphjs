import {HtmlNode} from './HtmlNode.js';
import {$} from '../../utils.js';

export class MetaWidgetNode extends HtmlNode {
    static typeName = 'meta-widget';
    
    childWidgets = new Map();
    layout = 'grid';
    columns = 2;
    gap = 10;
    resizable = true;
    collapsible = true;
    isCollapsed = false;
    
    constructor(id, position, data = {}, mass = 1.0) {
        const metaData = {
            width: data.width ?? 400,
            height: data.height ?? 300,
            title: data.title ?? 'Widget Container',
            layout: data.layout ?? 'grid',
            columns: data.columns ?? 2,
            gap: data.gap ?? 10,
            resizable: data.resizable ?? true,
            collapsible: data.collapsible ?? true,
            backgroundColor: data.backgroundColor ?? 'rgba(25, 30, 45, 0.95)',
            widgets: data.widgets ?? [],
            padding: data.padding ?? 15,
            showHeader: data.showHeader ?? true,
            ...data,
        };

        super(id, position, metaData, mass);
        this.layout = metaData.layout;
        this.columns = metaData.columns;
        this.gap = metaData.gap;
        this.resizable = metaData.resizable;
        this.collapsible = metaData.collapsible;
        
        this._initializeWidgets();
        this._setupMetaWidgetEvents();
    }

    getDefaultData() {
        return {
            ...super.getDefaultData(),
            type: 'meta-widget',
            title: 'Widget Container',
            layout: 'grid',
            columns: 2,
            gap: 10,
            resizable: true,
            collapsible: true,
            backgroundColor: 'rgba(25, 30, 45, 0.95)',
            widgets: [],
            padding: 15,
            showHeader: true,
        };
    }

    _createElement() {
        const el = document.createElement('div');
        el.className = 'node-meta-widget node-common';
        el.id = `node-meta-widget-${this.id}`;
        el.dataset.nodeId = this.id;
        el.style.width = `${this.size.width}px`;
        el.style.height = `${this.size.height}px`;
        el.draggable = false;

        const headerHeight = this.data.showHeader ? 35 : 0;
        const contentHeight = this.size.height - headerHeight - (this.data.padding * 2);

        el.innerHTML = `
            <div class="meta-widget-container">
                ${this.data.showHeader ? this._generateHeader() : ''}
                <div class="meta-widget-content" style="height: ${contentHeight}px;">
                    <div class="widget-grid"></div>
                </div>
            </div>
            <style>
                .node-meta-widget {
                    background: ${this.data.backgroundColor};
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    padding: ${this.data.padding}px;
                    font-family: 'Segoe UI', sans-serif;
                    color: white;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    overflow: hidden;
                }
                .meta-widget-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .meta-widget-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: rgba(0,0,0,0.3);
                    border-radius: 6px;
                    margin-bottom: 10px;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .meta-widget-title {
                    font-size: 14px;
                    font-weight: 600;
                    margin: 0;
                    color: #fff;
                }
                .meta-widget-controls {
                    display: flex;
                    gap: 6px;
                }
                .meta-control-btn {
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
                    font-size: 12px;
                    transition: background 0.2s;
                }
                .meta-control-btn:hover {
                    background: rgba(255,255,255,0.2);
                }
                .meta-widget-content {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                }
                .meta-widget-content.collapsed {
                    display: none;
                }
                .widget-grid {
                    display: grid;
                    gap: ${this.gap}px;
                    width: 100%;
                    height: 100%;
                }
                .widget-grid.layout-grid {
                    grid-template-columns: repeat(${this.columns}, 1fr);
                    grid-auto-rows: minmax(100px, auto);
                }
                .widget-grid.layout-flex-row {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                }
                .widget-grid.layout-flex-column {
                    display: flex;
                    flex-direction: column;
                }
                .widget-grid.layout-masonry {
                    columns: ${this.columns};
                    column-gap: ${this.gap}px;
                }
                .widget-slot {
                    background: rgba(255,255,255,0.05);
                    border: 1px dashed rgba(255,255,255,0.2);
                    border-radius: 6px;
                    position: relative;
                    min-height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }
                .widget-slot:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.4);
                }
                .widget-slot.occupied {
                    background: transparent;
                    border: none;
                    padding: 0;
                }
                .widget-slot-placeholder {
                    color: rgba(255,255,255,0.5);
                    font-size: 12px;
                    text-align: center;
                    pointer-events: none;
                }
                .widget-wrapper {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    border-radius: 6px;
                    overflow: hidden;
                }
                .widget-controls {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    display: flex;
                    gap: 2px;
                    opacity: 0;
                    transition: opacity 0.2s;
                    z-index: 10;
                }
                .widget-wrapper:hover .widget-controls {
                    opacity: 1;
                }
                .widget-control-btn {
                    background: rgba(0,0,0,0.7);
                    border: none;
                    color: white;
                    width: 20px;
                    height: 20px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .widget-control-btn:hover {
                    background: rgba(0,0,0,0.9);
                }
                .layout-selector {
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    cursor: pointer;
                }
                .layout-selector:focus {
                    outline: none;
                    border-color: #4a9eff;
                }
            </style>
        `;

        this._setupDragAndDrop(el);
        return el;
    }

    _generateHeader() {
        return `
            <div class="meta-widget-header">
                <h3 class="meta-widget-title">${this.data.title}</h3>
                <div class="meta-widget-controls">
                    <select class="layout-selector">
                        <option value="grid" ${this.layout === 'grid' ? 'selected' : ''}>Grid</option>
                        <option value="flex-row" ${this.layout === 'flex-row' ? 'selected' : ''}>Row</option>
                        <option value="flex-column" ${this.layout === 'flex-column' ? 'selected' : ''}>Column</option>
                        <option value="masonry" ${this.layout === 'masonry' ? 'selected' : ''}>Masonry</option>
                    </select>
                    <button class="meta-control-btn add-widget" title="Add Widget">+</button>
                    ${this.collapsible ? `<button class="meta-control-btn collapse-btn" title="Collapse">−</button>` : ''}
                    <button class="meta-control-btn settings-btn" title="Settings">⚙</button>
                </div>
            </div>
        `;
    }

    _initializeWidgets() {
        if (this.data.widgets && this.data.widgets.length > 0) {
            this.data.widgets.forEach((widgetData, index) => {
                this.addWidget(widgetData, index);
            });
        }
        this._updateLayout();
    }

    _setupMetaWidgetEvents() {
        const header = $('.meta-widget-header', this.htmlElement);
        if (!header) return;

        // Layout selector
        const layoutSelector = $('.layout-selector', header);
        if (layoutSelector) {
            layoutSelector.addEventListener('change', (e) => {
                e.stopPropagation();
                this.setLayout(e.target.value);
            });
        }

        // Add widget button
        const addBtn = $('.add-widget', header);
        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showAddWidgetDialog();
            });
        }

        // Collapse button
        const collapseBtn = $('.collapse-btn', header);
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCollapsed();
            });
        }

        // Settings button
        const settingsBtn = $('.settings-btn', header);
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showSettingsDialog();
            });
        }
    }

    _setupDragAndDrop(element) {
        // Enable drag and drop for widget reordering
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            const widgetId = e.dataTransfer.getData('text/widget-id');
            const targetSlot = e.target.closest('.widget-slot');
            
            if (widgetId && targetSlot) {
                this._handleWidgetDrop(widgetId, targetSlot);
            }
        });
    }

    addWidget(widgetData, position = null) {
        const widgetId = widgetData.id || this._generateWidgetId();
        const widget = {
            id: widgetId,
            type: widgetData.type || 'control-panel',
            data: widgetData.data || {},
            position: position !== null ? position : this.childWidgets.size,
            ...widgetData
        };

        this.childWidgets.set(widgetId, widget);
        this._renderWidget(widget);
        this._updateLayout();

        this.space?.emit('meta-widget:widget-added', {
            metaWidget: this,
            widget,
            position: widget.position
        });

        return widgetId;
    }

    removeWidget(widgetId) {
        if (!this.childWidgets.has(widgetId)) return false;

        const widget = this.childWidgets.get(widgetId);
        this.childWidgets.delete(widgetId);

        const widgetElement = $(`[data-widget-id="${widgetId}"]`, this.htmlElement);
        if (widgetElement) {
            widgetElement.remove();
        }

        this._updateLayout();

        this.space?.emit('meta-widget:widget-removed', {
            metaWidget: this,
            widget,
            widgetId
        });

        return true;
    }

    _renderWidget(widget) {
        const grid = $('.widget-grid', this.htmlElement);
        if (!grid) return;

        const slot = document.createElement('div');
        slot.className = 'widget-slot occupied';
        slot.dataset.widgetId = widget.id;
        slot.dataset.position = widget.position;

        const wrapper = document.createElement('div');
        wrapper.className = 'widget-wrapper';
        wrapper.draggable = true;

        // Widget controls
        const controls = document.createElement('div');
        controls.className = 'widget-controls';
        controls.innerHTML = `
            <button class="widget-control-btn move-btn" title="Move">↕</button>
            <button class="widget-control-btn edit-btn" title="Edit">✎</button>
            <button class="widget-control-btn remove-btn" title="Remove">×</button>
        `;

        // Widget content based on type
        const content = this._createWidgetContent(widget);
        
        wrapper.appendChild(content);
        wrapper.appendChild(controls);
        slot.appendChild(wrapper);

        // Event listeners
        this._setupWidgetEvents(wrapper, widget);

        grid.appendChild(slot);
    }

    _createWidgetContent(widget) {
        const content = document.createElement('div');
        content.className = 'widget-content';
        content.style.width = '100%';
        content.style.height = '100%';

        switch (widget.type) {
            case 'control-panel':
                content.innerHTML = this._createControlPanelContent(widget);
                this._setupControlPanelEvents(content, widget);
                break;
            case 'progress':
                content.innerHTML = this._createProgressContent(widget);
                break;
            case 'chart':
                content.innerHTML = this._createChartContent(widget);
                break;
            case 'info':
                content.innerHTML = this._createInfoContent(widget);
                break;
            case 'custom':
                content.innerHTML = widget.data.html || '<div>Custom Widget</div>';
                break;
            default:
                content.innerHTML = `<div>Widget: ${widget.type}</div>`;
        }

        return content;
    }

    _createControlPanelContent(widget) {
        const controls = widget.data.controls || [];
        let html = `<div class="mini-control-panel">`;
        
        controls.forEach(control => {
            html += `<div class="mini-control">`;
            html += `<label class="mini-control-label">${control.label}</label>`;
            
            switch (control.type) {
                case 'slider':
                    html += `<input type="range" class="mini-slider" 
                             data-control-id="${control.id}"
                             min="${control.min || 0}" max="${control.max || 100}" 
                             value="${control.value || 0}" step="${control.step || 1}">`;
                    html += `<span class="mini-value">${control.value || 0}</span>`;
                    break;
                case 'switch':
                    html += `<label class="mini-switch">
                        <input type="checkbox" data-control-id="${control.id}" 
                               ${control.value ? 'checked' : ''}>
                        <span class="mini-switch-slider"></span>
                    </label>`;
                    break;
                case 'button':
                    html += `<button class="mini-button" data-control-id="${control.id}">
                        ${control.text || control.label}
                    </button>`;
                    break;
            }
            html += `</div>`;
        });
        
        html += `</div>`;
        html += `<style>
            .mini-control-panel { padding: 8px; font-size: 11px; }
            .mini-control { margin-bottom: 8px; }
            .mini-control-label { display: block; color: rgba(255,255,255,0.8); margin-bottom: 3px; }
            .mini-slider { width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; }
            .mini-value { float: right; color: #4a9eff; font-weight: 600; }
            .mini-switch { position: relative; display: inline-block; width: 30px; height: 16px; }
            .mini-switch input { opacity: 0; width: 0; height: 0; }
            .mini-switch-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; 
                                 background-color: rgba(255,255,255,0.2); transition: 0.3s; border-radius: 16px; }
            .mini-switch-slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 2px; bottom: 2px; 
                                       background-color: white; transition: 0.3s; border-radius: 50%; }
            .mini-switch input:checked + .mini-switch-slider { background-color: #4a9eff; }
            .mini-switch input:checked + .mini-switch-slider:before { transform: translateX(14px); }
            .mini-button { width: 100%; padding: 4px 8px; background: #4a9eff; border: none; border-radius: 3px; 
                          color: white; font-size: 10px; cursor: pointer; }
        </style>`;
        
        return html;
    }

    _createProgressContent(widget) {
        const value = widget.data.value || 0;
        const max = widget.data.max || 100;
        const percent = (value / max) * 100;
        
        return `
            <div class="mini-progress">
                <div class="mini-progress-label">${widget.data.label || 'Progress'}</div>
                <div class="mini-progress-bar">
                    <div class="mini-progress-fill" style="width: ${percent}%"></div>
                </div>
                <div class="mini-progress-value">${value}%</div>
            </div>
            <style>
                .mini-progress { padding: 8px; text-align: center; }
                .mini-progress-label { font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 4px; }
                .mini-progress-bar { width: 100%; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; }
                .mini-progress-fill { height: 100%; background: linear-gradient(90deg, #4a9eff, #64b5f6); transition: width 0.3s; }
                .mini-progress-value { font-size: 10px; color: #4a9eff; margin-top: 4px; }
            </style>
        `;
    }

    _createChartContent(widget) {
        return `
            <div class="mini-chart">
                <div class="chart-title">${widget.data.title || 'Chart'}</div>
                <div class="chart-placeholder">📊</div>
            </div>
            <style>
                .mini-chart { padding: 8px; text-align: center; display: flex; flex-direction: column; justify-content: center; height: 100%; }
                .chart-title { font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 8px; }
                .chart-placeholder { font-size: 24px; opacity: 0.6; }
            </style>
        `;
    }

    _createInfoContent(widget) {
        return `
            <div class="mini-info">
                <div class="info-icon">${widget.data.icon || 'ℹ'}</div>
                <div class="info-text">${widget.data.text || 'Information'}</div>
            </div>
            <style>
                .mini-info { padding: 8px; text-align: center; display: flex; flex-direction: column; justify-content: center; height: 100%; }
                .info-icon { font-size: 20px; margin-bottom: 4px; }
                .info-text { font-size: 10px; color: rgba(255,255,255,0.8); line-height: 1.3; }
            </style>
        `;
    }

    _setupControlPanelEvents(content, widget) {
        content.querySelectorAll('[data-control-id]').forEach(control => {
            const controlId = control.dataset.controlId;
            
            control.addEventListener('input', (e) => {
                e.stopPropagation();
                let value = e.target.value;
                
                if (e.target.type === 'checkbox') {
                    value = e.target.checked;
                } else if (e.target.type === 'range') {
                    value = parseFloat(value);
                    const valueSpan = e.target.parentNode.querySelector('.mini-value');
                    if (valueSpan) valueSpan.textContent = value;
                }
                
                this.space?.emit('meta-widget:control-changed', {
                    metaWidget: this,
                    widget,
                    controlId,
                    value
                });
            });
            
            if (control.type === 'button' || control.tagName === 'BUTTON') {
                control.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.space?.emit('meta-widget:control-clicked', {
                        metaWidget: this,
                        widget,
                        controlId
                    });
                });
            }
        });
    }

    _setupWidgetEvents(wrapper, widget) {
        // Drag events
        wrapper.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/widget-id', widget.id);
            e.dataTransfer.effectAllowed = 'move';
        });

        // Widget control events
        const removeBtn = $('.remove-btn', wrapper);
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeWidget(widget.id);
            });
        }

        const editBtn = $('.edit-btn', wrapper);
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._editWidget(widget);
            });
        }
    }

    _updateLayout() {
        const grid = $('.widget-grid', this.htmlElement);
        if (!grid) return;

        // Clear existing layout classes
        grid.className = 'widget-grid';
        
        // Add layout-specific class
        grid.classList.add(`layout-${this.layout}`);

        // Update CSS custom properties for dynamic layouts
        if (this.layout === 'grid') {
            grid.style.gridTemplateColumns = `repeat(${this.columns}, 1fr)`;
        } else if (this.layout === 'masonry') {
            grid.style.columns = this.columns;
            grid.style.columnGap = `${this.gap}px`;
        }

        grid.style.gap = `${this.gap}px`;
    }

    _showAddWidgetDialog() {
        // Create a simple modal for adding widgets
        const dialog = document.createElement('div');
        dialog.className = 'add-widget-dialog';
        dialog.innerHTML = `
            <div class="dialog-backdrop">
                <div class="dialog-content">
                    <h3>Add Widget</h3>
                    <select class="widget-type-select">
                        <option value="control-panel">Control Panel</option>
                        <option value="progress">Progress Bar</option>
                        <option value="chart">Chart</option>
                        <option value="info">Info Panel</option>
                        <option value="custom">Custom</option>
                    </select>
                    <input type="text" class="widget-title-input" placeholder="Widget Title">
                    <div class="dialog-buttons">
                        <button class="dialog-btn cancel">Cancel</button>
                        <button class="dialog-btn confirm">Add</button>
                    </div>
                </div>
            </div>
            <style>
                .add-widget-dialog .dialog-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }
                .add-widget-dialog .dialog-content {
                    background: #2c3e50;
                    padding: 20px;
                    border-radius: 8px;
                    min-width: 300px;
                    color: white;
                }
                .add-widget-dialog h3 {
                    margin-top: 0;
                    color: #ecf0f1;
                }
                .add-widget-dialog select, .add-widget-dialog input {
                    width: 100%;
                    padding: 8px;
                    margin: 8px 0;
                    background: #34495e;
                    border: 1px solid #7f8c8d;
                    border-radius: 4px;
                    color: white;
                }
                .add-widget-dialog .dialog-buttons {
                    text-align: right;
                    margin-top: 16px;
                }
                .add-widget-dialog .dialog-btn {
                    padding: 6px 12px;
                    margin-left: 8px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .add-widget-dialog .dialog-btn.cancel {
                    background: #95a5a6;
                    color: white;
                }
                .add-widget-dialog .dialog-btn.confirm {
                    background: #3498db;
                    color: white;
                }
            </style>
        `;

        document.body.appendChild(dialog);

        const cancelBtn = $('.cancel', dialog);
        const confirmBtn = $('.confirm', dialog);
        const typeSelect = $('.widget-type-select', dialog);
        const titleInput = $('.widget-title-input', dialog);

        const closeDialog = () => {
            document.body.removeChild(dialog);
        };

        cancelBtn.addEventListener('click', closeDialog);
        
        confirmBtn.addEventListener('click', () => {
            const type = typeSelect.value;
            const title = titleInput.value || `New ${type}`;
            
            const widgetData = {
                type,
                data: { title, label: title }
            };

            // Add type-specific default data
            if (type === 'control-panel') {
                widgetData.data.controls = [
                    { id: 'sample', type: 'slider', label: 'Sample', value: 50, min: 0, max: 100 }
                ];
            } else if (type === 'progress') {
                widgetData.data.value = 25;
                widgetData.data.max = 100;
            }

            this.addWidget(widgetData);
            closeDialog();
        });

        // Close on backdrop click
        $('.dialog-backdrop', dialog).addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeDialog();
        });
    }

    _editWidget(widget) {
        // Emit event for external handling
        this.space?.emit('meta-widget:widget-edit-requested', {
            metaWidget: this,
            widget
        });
    }

    _generateWidgetId() {
        return `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    _handleWidgetDrop(widgetId, targetSlot) {
        // Implement widget reordering logic
        const sourceWidget = this.childWidgets.get(widgetId);
        if (!sourceWidget) return;

        const targetPosition = parseInt(targetSlot.dataset.position);
        if (!isNaN(targetPosition)) {
            sourceWidget.position = targetPosition;
            this._updateLayout();
        }
    }

    setLayout(layout) {
        if (['grid', 'flex-row', 'flex-column', 'masonry'].includes(layout)) {
            this.layout = layout;
            this.data.layout = layout;
            this._updateLayout();
            
            this.space?.emit('meta-widget:layout-changed', {
                metaWidget: this,
                layout
            });
        }
    }

    setColumns(columns) {
        this.columns = Math.max(1, columns);
        this.data.columns = this.columns;
        this._updateLayout();
    }

    setGap(gap) {
        this.gap = Math.max(0, gap);
        this.data.gap = this.gap;
        this._updateLayout();
    }

    toggleCollapsed() {
        this.isCollapsed = !this.isCollapsed;
        const content = $('.meta-widget-content', this.htmlElement);
        const collapseBtn = $('.collapse-btn', this.htmlElement);
        
        if (content) {
            content.classList.toggle('collapsed', this.isCollapsed);
        }
        
        if (collapseBtn) {
            collapseBtn.textContent = this.isCollapsed ? '+' : '−';
        }
        
        // Adjust height
        const newHeight = this.isCollapsed ? 60 : this.data.height;
        this.setSize(this.size.width, newHeight);
        
        this.space?.emit('meta-widget:collapsed-changed', {
            metaWidget: this,
            isCollapsed: this.isCollapsed
        });
    }

    getWidget(widgetId) {
        return this.childWidgets.get(widgetId);
    }

    getAllWidgets() {
        return Array.from(this.childWidgets.values());
    }

    updateWidget(widgetId, newData) {
        const widget = this.childWidgets.get(widgetId);
        if (!widget) return false;

        Object.assign(widget.data, newData);
        
        // Re-render the widget
        const widgetElement = $(`[data-widget-id="${widgetId}"]`, this.htmlElement);
        if (widgetElement) {
            const content = $('.widget-content', widgetElement);
            if (content) {
                content.innerHTML = '';
                content.appendChild(this._createWidgetContent(widget));
            }
        }

        this.space?.emit('meta-widget:widget-updated', {
            metaWidget: this,
            widget,
            widgetId
        });

        return true;
    }

    getLayoutData() {
        return {
            layout: this.layout,
            columns: this.columns,
            gap: this.gap,
            widgets: Array.from(this.childWidgets.values())
        };
    }

    dispose() {
        // Clean up child widgets
        this.childWidgets.clear();
        super.dispose();
    }
}