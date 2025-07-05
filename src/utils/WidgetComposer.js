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

        const dashboard = space.addNode({
            type: 'meta-widget',
            id: config.id || `dashboard-${Date.now()}`,
            position,
            data: {
                title,
                width,
                height,
                layout,
                columns,
                widgets: widgets.map((widget, index) => ({
                    id: widget.id || `widget-${index}`,
                    ...widget
                }))
            }
        });

        return dashboard;
    }

    static createControlCenter(space, position, systems = []) {
        const controlWidgets = systems.map((system, index) => ({
            id: `control-${system.name}`,
            type: 'control-panel',
            data: {
                title: system.title || system.name,
                controls: system.controls || [
                    {
                        id: 'power',
                        type: 'switch',
                        label: 'Power',
                        value: system.enabled || false
                    },
                    {
                        id: 'level',
                        type: 'slider',
                        label: 'Level',
                        value: system.level || 50,
                        min: 0,
                        max: 100
                    }
                ]
            }
        }));

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
        const monitorWidgets = [];

        metrics.forEach((metric, index) => {
            switch (metric.type) {
                case 'gauge':
                    monitorWidgets.push({
                        id: `gauge-${metric.name}`,
                        type: 'progress',
                        data: {
                            label: metric.title || metric.name,
                            progressType: 'gauge',
                            value: metric.value || 0,
                            max: metric.max || 100,
                            color: metric.color || '#4a9eff'
                        }
                    });
                    break;
                case 'progress':
                    monitorWidgets.push({
                        id: `progress-${metric.name}`,
                        type: 'progress',
                        data: {
                            label: metric.title || metric.name,
                            progressType: 'bar',
                            value: metric.value || 0,
                            max: metric.max || 100,
                            color: metric.color || '#00ff88'
                        }
                    });
                    break;
                case 'status':
                    monitorWidgets.push({
                        id: `status-${metric.name}`,
                        type: 'info',
                        data: {
                            text: metric.title || metric.name,
                            icon: metric.status === 'ok' ? '✅' : metric.status === 'warning' ? '⚠️' : '❌'
                        }
                    });
                    break;
                case 'chart':
                    monitorWidgets.push({
                        id: `chart-${metric.name}`,
                        type: 'chart',
                        data: {
                            title: metric.title || metric.name,
                            chartType: metric.chartType || 'line'
                        }
                    });
                    break;
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
        const workflowWidgets = steps.map((step, index) => ({
            id: `step-${index}`,
            type: 'info',
            data: {
                text: step.title || `Step ${index + 1}`,
                icon: step.completed ? '✅' : step.active ? '⚡' : '⏳'
            }
        }));

        // Add workflow controls
        workflowWidgets.push({
            id: 'workflow-controls',
            type: 'control-panel',
            data: {
                title: 'Workflow Controls',
                controls: [
                    {
                        id: 'start',
                        type: 'button',
                        label: 'Start Workflow',
                        text: 'Start'
                    },
                    {
                        id: 'pause',
                        type: 'button',
                        label: 'Pause',
                        text: 'Pause'
                    },
                    {
                        id: 'reset',
                        type: 'button',
                        label: 'Reset',
                        text: 'Reset'
                    },
                    {
                        id: 'auto',
                        type: 'switch',
                        label: 'Auto Mode',
                        value: false
                    }
                ]
            }
        });

        return this.createDashboard(space, position, {
            title: 'Workflow Builder',
            width: 700,
            height: 450,
            layout: 'flex-column',
            widgets: workflowWidgets
        });
    }

    static createAnalyticsDashboard(space, position, analytics = {}) {
        const widgets = [];

        // Key metrics
        if (analytics.keyMetrics) {
            analytics.keyMetrics.forEach((metric, index) => {
                widgets.push({
                    id: `metric-${index}`,
                    type: 'progress',
                    data: {
                        label: metric.name,
                        progressType: 'circular',
                        value: metric.value,
                        max: metric.max || 100,
                        color: metric.color || '#3498db'
                    }
                });
            });
        }

        // Charts
        if (analytics.charts) {
            analytics.charts.forEach((chart, index) => {
                widgets.push({
                    id: `chart-${index}`,
                    type: 'chart',
                    data: {
                        title: chart.title,
                        chartType: chart.type || 'line'
                    }
                });
            });
        }

        // Controls
        widgets.push({
            id: 'analytics-controls',
            type: 'control-panel',
            data: {
                title: 'Analytics Controls',
                controls: [
                    {
                        id: 'timeRange',
                        type: 'select',
                        label: 'Time Range',
                        value: '7d',
                        options: [
                            { value: '1d', label: 'Last 24 Hours' },
                            { value: '7d', label: 'Last 7 Days' },
                            { value: '30d', label: 'Last 30 Days' },
                            { value: '90d', label: 'Last 90 Days' }
                        ]
                    },
                    {
                        id: 'refresh',
                        type: 'button',
                        label: 'Refresh Data',
                        text: 'Refresh'
                    },
                    {
                        id: 'autoRefresh',
                        type: 'switch',
                        label: 'Auto Refresh',
                        value: true
                    }
                ]
            }
        });

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
        const formWidgets = [];

        // Form fields
        if (formConfig.fields) {
            formConfig.fields.forEach((field, index) => {
                formWidgets.push({
                    id: `field-${index}`,
                    type: 'control-panel',
                    data: {
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
                    }
                });
            });
        }

        // Form actions
        formWidgets.push({
            id: 'form-actions',
            type: 'control-panel',
            data: {
                title: 'Form Actions',
                controls: [
                    {
                        id: 'submit',
                        type: 'button',
                        label: 'Submit Form',
                        text: 'Submit'
                    },
                    {
                        id: 'clear',
                        type: 'button',
                        label: 'Clear Form',
                        text: 'Clear'
                    },
                    {
                        id: 'save',
                        type: 'button',
                        label: 'Save Draft',
                        text: 'Save Draft'
                    }
                ]
            }
        });

        return this.createDashboard(space, position, {
            title: formConfig.title || 'Form Builder',
            width: 600,
            height: 500,
            layout: 'flex-column',
            widgets: formWidgets
        });
    }

    static createDataVisualization(space, position, datasets = []) {
        const widgets = [];

        datasets.forEach((dataset, index) => {
            // Chart widget for each dataset
            widgets.push({
                id: `chart-${index}`,
                type: 'chart',
                data: {
                    title: dataset.name || `Dataset ${index + 1}`,
                    chartType: dataset.chartType || 'line'
                }
            });

            // Summary stats
            if (dataset.stats) {
                widgets.push({
                    id: `stats-${index}`,
                    type: 'info',
                    data: {
                        text: `Records: ${dataset.stats.count || 0}\nAvg: ${dataset.stats.average || 0}`,
                        icon: '📊'
                    }
                });
            }
        });

        // Visualization controls
        widgets.push({
            id: 'viz-controls',
            type: 'control-panel',
            data: {
                title: 'Visualization Controls',
                controls: [
                    {
                        id: 'chartType',
                        type: 'select',
                        label: 'Chart Type',
                        value: 'line',
                        options: [
                            { value: 'line', label: 'Line Chart' },
                            { value: 'bar', label: 'Bar Chart' },
                            { value: 'pie', label: 'Pie Chart' },
                            { value: 'scatter', label: 'Scatter Plot' }
                        ]
                    },
                    {
                        id: 'showGrid',
                        type: 'switch',
                        label: 'Show Grid',
                        value: true
                    },
                    {
                        id: 'animate',
                        type: 'switch',
                        label: 'Animate',
                        value: true
                    }
                ]
            }
        });

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
        const hudWidgets = [];

        // Player stats
        if (gameConfig.playerStats) {
            hudWidgets.push({
                id: 'player-stats',
                type: 'control-panel',
                data: {
                    title: 'Player Stats',
                    controls: Object.keys(gameConfig.playerStats).map(stat => ({
                        id: stat,
                        type: 'progress',
                        label: stat.charAt(0).toUpperCase() + stat.slice(1),
                        value: gameConfig.playerStats[stat],
                        max: 100
                    }))
                }
            });
        }

        // Health bar
        hudWidgets.push({
            id: 'health',
            type: 'progress',
            data: {
                label: 'Health',
                progressType: 'bar',
                value: gameConfig.health || 100,
                max: 100,
                color: '#e74c3c',
                animated: true
            }
        });

        // Mana/Energy bar
        hudWidgets.push({
            id: 'energy',
            type: 'progress',
            data: {
                label: 'Energy',
                progressType: 'bar',
                value: gameConfig.energy || 100,
                max: 100,
                color: '#3498db',
                animated: true
            }
        });

        // Mini map placeholder
        hudWidgets.push({
            id: 'minimap',
            type: 'info',
            data: {
                text: 'Mini Map',
                icon: '🗺️'
            }
        });

        // Inventory
        hudWidgets.push({
            id: 'inventory',
            type: 'info',
            data: {
                text: `Items: ${gameConfig.inventoryCount || 0}`,
                icon: '🎒'
            }
        });

        // Game controls
        hudWidgets.push({
            id: 'game-controls',
            type: 'control-panel',
            data: {
                title: 'Game Controls',
                controls: [
                    {
                        id: 'pause',
                        type: 'button',
                        label: 'Pause',
                        text: '⏸️'
                    },
                    {
                        id: 'settings',
                        type: 'button',
                        label: 'Settings',
                        text: '⚙️'
                    },
                    {
                        id: 'menu',
                        type: 'button',
                        label: 'Menu',
                        text: '📋'
                    }
                ]
            }
        });

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
        const { controlId, value } = event;
        
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

    static createWidgetLibrary() {
        return {
            // Basic widgets
            slider: (id, label, value = 50, min = 0, max = 100) => ({
                id: id || 'slider',
                type: 'control-panel',
                data: {
                    title: 'Slider Control',
                    controls: [{
                        id,
                        type: 'slider',
                        label,
                        value,
                        min,
                        max
                    }]
                }
            }),

            button: (id, label, text) => ({
                id: id || 'button',
                type: 'control-panel',
                data: {
                    title: 'Button Control',
                    controls: [{
                        id,
                        type: 'button',
                        label: label || text,
                        text: text || label
                    }]
                }
            }),

            progressBar: (id, label, value = 0, max = 100) => ({
                id: id || 'progress',
                type: 'progress',
                data: {
                    label,
                    progressType: 'bar',
                    value,
                    max
                }
            }),

            gauge: (id, label, value = 0, max = 100) => ({
                id: id || 'gauge',
                type: 'progress',
                data: {
                    label,
                    progressType: 'gauge',
                    value,
                    max
                }
            }),

            infoPanel: (id, text, icon = 'ℹ') => ({
                id: id || 'info',
                type: 'info',
                data: {
                    text,
                    icon
                }
            }),

            chart: (id, title, chartType = 'line') => ({
                id: id || 'chart',
                type: 'chart',
                data: {
                    title,
                    chartType
                }
            })
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