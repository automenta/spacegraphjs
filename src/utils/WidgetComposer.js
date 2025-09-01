export class WidgetComposer {
    static presets = new Map();
    static templates = new Map();

    static registerPreset(name, config) {
        this.presets.set(name, config);
    }

    static registerTemplate(name, template) {
        this.templates.set(name, template);
    }

    static createDashboard(space, position, config) {
        const {
            title = 'Dashboard',
            width = 600,
            height = 400,
            layout = 'grid',
            columns = 3,
            widgets = []
        } = config;

        const dashboardConfig = this._createWidget('meta-widget', config.id || `dashboard-${Date.now()}`, {
            title,
            width,
            height,
            layout,
            columns,
            widgets: widgets.map((widget, index) => ({
                id: widget.id || `widget-${index}`,
                ...widget
            }))
        });

        const dashboard = space.addNode({
            type: dashboardConfig.type,
            id: dashboardConfig.id,
            position,
            data: dashboardConfig.data
        });

        return dashboard;
    }

    static createControlCenter(space, position, systems = []) {
        const library = this.createWidgetLibrary();
        const controlWidgets = systems.map((system, index) =>
            library.slider(`control-${system.name}`, system.title || system.name, system.level || 50, 0, 100) // Using slider as a generic control panel example
        );

        return this.createDashboard(space, position, {
            title: 'Control Center',
            width: 800,
            height: 500,
            layout: 'grid',
            columns: 2,
            widgets: controlWidgets
        });
    }

    static createMonitoringDashboard(space, position, metrics = []) {
        const library = this.createWidgetLibrary();
        const monitorWidgets = metrics.map((metric) => {
            const id = `${metric.type}-${metric.name}`;
            const title = metric.title || metric.name;
            switch (metric.type) {
                case 'gauge':
                    return library.gauge(id, title, metric.value, metric.max);
                case 'progress':
                    return library.progressBar(id, title, metric.value, metric.max);
                case 'status':
                    return library.infoPanel(id, title, metric.status === 'ok' ? '✅' : metric.status === 'warning' ? '⚠️' : '❌');
                case 'chart':
                    return library.chart(id, title, metric.chartType);
                default:
                    return library.infoPanel(id, `Unknown Widget Type: ${metric.type}`);
            }
        });

        return this.createDashboard(space, position, {
            title: 'System Monitor',
            width: 900,
            height: 600,
            layout: 'grid',
            columns: 3,
            widgets: monitorWidgets
        });
    }

    static createWorkflowBuilder(space, position, steps = []) {
        const library = this.createWidgetLibrary();
        const workflowWidgets = steps.map((step, index) =>
            library.infoPanel(`step-${index}`, step.title || `Step ${index + 1}`, step.completed ? '✅' : step.active ? '⚡' : '⏳')
        );

        workflowWidgets.push(this._createWidget('control-panel', 'workflow-controls', {
            title: 'Workflow Controls',
            controls: [
                library.button('start', 'Start Workflow', 'Start').data.controls[0],
                library.button('pause', 'Pause', 'Pause').data.controls[0],
                library.button('reset', 'Reset', 'Reset').data.controls[0],
                { id: 'auto', type: 'switch', label: 'Auto Mode', value: false }
            ]
        }));

        return this.createDashboard(space, position, {
            title: 'Workflow Builder',
            width: 700,
            height: 450,
            layout: 'flex-column',
            widgets: workflowWidgets
        });
    }

    static createAnalyticsDashboard(space, position, analytics = {}) {
        const library = this.createWidgetLibrary();
        const widgets = [];

        if (analytics.keyMetrics) {
            analytics.keyMetrics.forEach((metric, index) => {
                widgets.push(this._createWidget('progress', `metric-${index}`, {
                    label: metric.name,
                    progressType: 'circular',
                    value: metric.value,
                    max: metric.max || 100,
                    color: metric.color || '#3498db'
                }));
            });
        }

        if (analytics.charts) {
            analytics.charts.forEach((chart, index) => {
                widgets.push(library.chart(`chart-${index}`, chart.title, chart.type));
            });
        }

        widgets.push(this._createWidget('control-panel', 'analytics-controls', {
            title: 'Analytics Controls',
            controls: [
                { id: 'timeRange', type: 'select', label: 'Time Range', value: '7d', options: [
                    {value: '1d', label: 'Last 24 Hours'},
                    {value: '7d', label: 'Last 7 Days'},
                    {value: '30d', label: 'Last 30 Days'},
                    {value: '90d', label: 'Last 90 Days'}
                ]},
                library.button('refresh', 'Refresh Data', 'Refresh').data.controls[0],
                { id: 'autoRefresh', type: 'switch', label: 'Auto Refresh', value: true }
            ]
        }));

        return this.createDashboard(space, position, {
            title: 'Analytics Dashboard',
            width: 1000,
            height: 700,
            layout: 'grid',
            columns: 3,
            widgets
        });
    }

    static createFormBuilder(space, position, formConfig = {}) {
        const library = this.createWidgetLibrary();
        const formWidgets = [];

        if (formConfig.fields) {
            formConfig.fields.forEach((field, index) => {
                formWidgets.push(this._createWidget('control-panel', `field-${index}`, {
                    title: field.label || `Field ${index + 1}`,
                    controls: [{
                        id: field.name || `field${index}`,
                        type: field.type || 'text',
                        label: field.label || '',
                        value: field.defaultValue || '',
                        required: field.required || false,
                        placeholder: field.placeholder || '',
                        options: field.options || []
                    }]
                }));
            });
        }

        formWidgets.push(this._createWidget('control-panel', 'form-actions', {
            title: 'Form Actions',
            controls: [
                library.button('submit', 'Submit Form', 'Submit').data.controls[0],
                library.button('clear', 'Clear Form', 'Clear').data.controls[0],
                library.button('save', 'Save Draft', 'Save Draft').data.controls[0]
            ]
        }));

        return this.createDashboard(space, position, {
            title: formConfig.title || 'Form Builder',
            width: 600,
            height: 500,
            layout: 'flex-column',
            widgets: formWidgets
        });
    }

    static createDataVisualization(space, position, datasets = []) {
        const library = this.createWidgetLibrary();
        const widgets = [];

        datasets.forEach((dataset, index) => {
            widgets.push(library.chart(`chart-${index}`, dataset.name, dataset.chartType));

            if (dataset.stats) {
                widgets.push(library.infoPanel(`stats-${index}`, `Records: ${dataset.stats.count || 0}\nAvg: ${dataset.stats.average || 0}`, '📊'));
            }
        });

        widgets.push(this._createWidget('control-panel', 'viz-controls', {
            title: 'Visualization Controls',
            controls: [
                { id: 'chartType', type: 'select', label: 'Chart Type', value: 'line', options: [
                    {value: 'line', label: 'Line Chart'},
                    {value: 'bar', label: 'Bar Chart'},
                    {value: 'pie', label: 'Pie Chart'},
                    {value: 'scatter', label: 'Scatter Plot'}
                ]},
                { id: 'showGrid', type: 'switch', label: 'Show Grid', value: true },
                { id: 'animate', type: 'switch', label: 'Animate', value: true }
            ]
        }));

        return this.createDashboard(space, position, {
            title: 'Data Visualization',
            width: 900,
            height: 600,
            layout: 'grid',
            columns: 2,
            widgets
        });
    }

    static createGameHUD(space, position, gameConfig = {}) {
        const library = this.createWidgetLibrary();
        const hudWidgets = [];

        if (gameConfig.playerStats) {
            hudWidgets.push(this._createWidget('control-panel', 'player-stats', {
                title: 'Player Stats',
                controls: Object.keys(gameConfig.playerStats).map(stat =>
                    this._createWidget('progress', stat, {
                        label: stat.charAt(0).toUpperCase() + stat.slice(1),
                        value: gameConfig.playerStats[stat],
                        max: 100
                    }).data // Directly use the data of the progress widget
                )
            }));
        }

        hudWidgets.push(library.progressBar('health', 'Health', gameConfig.health || 100, 100));
        hudWidgets.push(library.progressBar('energy', 'Energy', gameConfig.energy || 100, 100));
        hudWidgets.push(library.infoPanel('minimap', 'Mini Map', '🗺️'));
        hudWidgets.push(library.infoPanel('inventory', `Items: ${gameConfig.inventoryCount || 0}`, '🎒'));

        hudWidgets.push(this._createWidget('control-panel', 'game-controls', {
            title: 'Game Controls',
            controls: [
                library.button('pause', 'Pause', '⏸️').data.controls[0],
                library.button('settings', 'Settings', '⚙️').data.controls[0],
                library.button('menu', 'Menu', '📋').data.controls[0]
            ]
        }));

        return this.createDashboard(space, position, {
            title: 'Game HUD',
            width: 800,
            height: 200,
            layout: 'flex-row',
            widgets: hudWidgets
        });
    }

    static connectWidgets(space, sourceWidget, targetWidget, connectionType = 'data') {
        // Create a connection between two metawidgets
        const connection = space.addEdge(sourceWidget, targetWidget, {
            type: 'flow',
            particleCount: 5,
            particleSpeed: 0.3,
            particleColor: connectionType === 'data' ? 0x00ff88 :
                connectionType === 'control' ? 0xff6b35 : 0x4a9eff,
            flowDirection: 1,
            thickness: 2,
            label: connectionType
        });

        // Set up data flow between widgets
        space.on('meta-widget:control-changed', (event) => {
            if (event.metaWidget === sourceWidget) {
                this.propagateData(event, targetWidget, connectionType);
            }
        });

        return connection;
    }

    static propagateData(event, targetWidget, connectionType) {
        const {controlId, value} = event;

        // Find matching controls in target widget
        targetWidget.getAllWidgets().forEach(widget => {
            if (widget.data.controls) {
                const matchingControl = widget.data.controls.find(c => c.id === controlId);
                if (matchingControl) {
                    // Update the control value
                    matchingControl.value = value;
                    targetWidget.updateWidget(widget.id, widget.data);
                }
            }
        });
    }

    static exportConfiguration(metaWidget) {
        return {
            type: 'meta-widget',
            layout: metaWidget.getLayoutData(),
            position: {
                x: metaWidget.position.x,
                y: metaWidget.position.y,
                z: metaWidget.position.z
            },
            data: metaWidget.data
        };
    }

    static importConfiguration(space, config) {
        return space.addNode({
            type: 'meta-widget',
            position: config.position,
            data: config.data
        });
    }

    static _createWidget(type, id, data = {}) {
        const widgetConfig = { id: id || `${type}-${Date.now()}`, type, data };
        switch (type) {
            case 'control-panel':
                widgetConfig.data = { title: 'Control Panel', controls: [], ...data };
                break;
            case 'progress':
                widgetConfig.data = { label: 'Progress', progressType: 'bar', value: 0, max: 100, ...data };
                break;
            case 'info':
                widgetConfig.data = { text: 'Information', icon: 'ℹ', ...data };
                break;
            case 'chart':
                widgetConfig.data = { title: 'Chart', chartType: 'line', ...data };
                break;
            case 'meta-widget':
                widgetConfig.data = { title: 'Dashboard', ...data };
                break;
        }
        return widgetConfig;
    }

    static createWidgetLibrary() {
        return {
            slider: (id, label, value = 50, min = 0, max = 100) =>
                this._createWidget('control-panel', id, {
                    title: 'Slider Control',
                    controls: [{ id, type: 'slider', label, value, min, max }]
                }),

            button: (id, label, text) =>
                this._createWidget('control-panel', id, {
                    title: 'Button Control',
                    controls: [{ id, type: 'button', label: label || text, text: text || label }]
                }),

            progressBar: (id, label, value = 0, max = 100) =>
                this._createWidget('progress', id, { label, progressType: 'bar', value, max }),

            gauge: (id, label, value = 0, max = 100) =>
                this._createWidget('progress', id, { label, progressType: 'gauge', value, max }),

            infoPanel: (id, text, icon = 'ℹ') =>
                this._createWidget('info', id, { text, icon }),

            chart: (id, title, chartType = 'line') =>
                this._createWidget('chart', id, { title, chartType })
        };
    }
}

// Initialize with common presets
WidgetComposer.registerPreset('monitoring', {
    title: 'System Monitoring',
    layout: 'grid',
    columns: 2,
    widgets: ['cpu-gauge', 'memory-gauge', 'disk-progress', 'network-chart']
});

WidgetComposer.registerPreset('control-panel', {
    title: 'Control Panel',
    layout: 'flex-column',
    widgets: ['power-switch', 'volume-slider', 'brightness-slider', 'mode-select']
});

WidgetComposer.registerPreset('analytics', {
    title: 'Analytics Dashboard',
    layout: 'grid',
    columns: 3,
    widgets: ['visitors-chart', 'revenue-gauge', 'conversion-progress', 'goals-info']
});

export default WidgetComposer;