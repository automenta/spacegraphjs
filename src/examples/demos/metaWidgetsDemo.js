import * as S from '../../index.js';
import WidgetComposer from '../../utils/WidgetComposer.js';

export const demoMetadata = {
    id: 'meta-widgets',
    title: 'MetaWidgets & Composition',
    description: `<h3>MetaWidgets & Widget Composition Demo</h3>
                  <p>Demonstrating the metawidget system for creating composite interfaces and dashboards.</p>
                  <ul>
                    <li><strong>MetaWidget Containers:</strong> Widgets that contain and manage other widgets</li>
                    <li><strong>Multiple Layout Types:</strong> Grid, row, column, and masonry layouts</li>
                    <li><strong>Widget Composition:</strong> Pre-built dashboard templates and custom compositions</li>
                    <li><strong>Data Flow:</strong> Connections between metawidgets for data propagation</li>
                    <li><strong>Interactive Management:</strong> Add, remove, and rearrange widgets dynamically</li>
                  </ul>
                  <p><em>Try adding widgets to the containers and changing their layouts!</em></p>`
};

export function createGraph(space) {
    // Clear any existing content
    space.importGraphFromJSON({ nodes: [], edges: [] });

    // Central title
    const titleNode = space.addNode(
        new S.TextMeshNode(
            'title',
            { x: 0, y: 350, z: 0 },
            {
                text: 'MetaWidget\nSystem',
                fontSize: 28,
                height: 10,
                color: 0x9b59b6,
                bevelEnabled: true,
                align: 'center',
                animated: true,
                animationType: 'glow'
            },
            2.0
        )
    );

    // Control Center Dashboard
    const controlCenter = WidgetComposer.createControlCenter(space, 
        { x: -600, y: 150, z: 0 },
        [
            {
                name: 'power',
                title: 'Power System',
                enabled: true,
                level: 85,
                controls: [
                    { id: 'main-power', type: 'switch', label: 'Main Power', value: true },
                    { id: 'backup-power', type: 'switch', label: 'Backup Power', value: false },
                    { id: 'power-level', type: 'slider', label: 'Power Level', value: 85, min: 0, max: 100 }
                ]
            },
            {
                name: 'cooling',
                title: 'Cooling System',
                enabled: true,
                level: 62,
                controls: [
                    { id: 'cooling-enabled', type: 'switch', label: 'Cooling Enabled', value: true },
                    { id: 'fan-speed', type: 'slider', label: 'Fan Speed', value: 62, min: 0, max: 100 },
                    { id: 'temp-target', type: 'slider', label: 'Target Temp', value: 22, min: 15, max: 30 }
                ]
            },
            {
                name: 'security',
                title: 'Security System',
                enabled: false,
                level: 100,
                controls: [
                    { id: 'security-armed', type: 'switch', label: 'Armed', value: false },
                    { id: 'alert-level', type: 'select', label: 'Alert Level', value: 'low', 
                      options: [
                          { value: 'low', label: 'Low' },
                          { value: 'medium', label: 'Medium' },
                          { value: 'high', label: 'High' }
                      ]
                    }
                ]
            },
            {
                name: 'network',
                title: 'Network System',
                enabled: true,
                level: 78,
                controls: [
                    { id: 'wifi-enabled', type: 'switch', label: 'WiFi', value: true },
                    { id: 'bandwidth', type: 'slider', label: 'Bandwidth Limit', value: 78, min: 0, max: 100 },
                    { id: 'vpn-enabled', type: 'switch', label: 'VPN', value: true }
                ]
            }
        ]
    );

    // Monitoring Dashboard
    const monitorDash = WidgetComposer.createMonitoringDashboard(space,
        { x: 600, y: 150, z: 0 },
        [
            { name: 'cpu', title: 'CPU Usage', type: 'gauge', value: 45, max: 100, color: '#e74c3c' },
            { name: 'memory', title: 'Memory Usage', type: 'gauge', value: 67, max: 100, color: '#f39c12' },
            { name: 'disk', title: 'Disk Usage', type: 'progress', value: 23, max: 100, color: '#27ae60' },
            { name: 'network-in', title: 'Network In', type: 'progress', value: 78, max: 100, color: '#3498db' },
            { name: 'network-out', title: 'Network Out', type: 'progress', value: 34, max: 100, color: '#9b59b6' },
            { name: 'temperature', title: 'Temperature', type: 'gauge', value: 62, max: 100, color: '#e67e22' },
            { name: 'power-status', title: 'Power', type: 'status', status: 'ok' },
            { name: 'backup-status', title: 'Backup', type: 'status', status: 'warning' },
            { name: 'security-status', title: 'Security', type: 'status', status: 'warning' }
        ]
    );

    // Analytics Dashboard
    const analyticsDash = WidgetComposer.createAnalyticsDashboard(space,
        { x: -300, y: -200, z: 0 },
        {
            keyMetrics: [
                { name: 'Conversion Rate', value: 3.2, max: 10, color: '#2ecc71' },
                { name: 'User Engagement', value: 78, max: 100, color: '#3498db' },
                { name: 'Performance Score', value: 92, max: 100, color: '#9b59b6' }
            ],
            charts: [
                { title: 'Traffic Over Time', type: 'line' },
                { title: 'User Demographics', type: 'pie' },
                { title: 'Page Performance', type: 'bar' }
            ]
        }
    );

    // Workflow Builder
    const workflowBuilder = WidgetComposer.createWorkflowBuilder(space,
        { x: 300, y: -200, z: 0 },
        [
            { title: 'Data Collection', completed: true, active: false },
            { title: 'Data Processing', completed: true, active: false },
            { title: 'Analysis', completed: false, active: true },
            { title: 'Report Generation', completed: false, active: false },
            { title: 'Distribution', completed: false, active: false }
        ]
    );

    // Game HUD example
    const gameHUD = WidgetComposer.createGameHUD(space,
        { x: 0, y: -350, z: 0 },
        {
            health: 87,
            energy: 45,
            inventoryCount: 12,
            playerStats: {
                strength: 78,
                agility: 65,
                intelligence: 92,
                luck: 34
            }
        }
    );

    // Custom MetaWidget with mixed content
    const customWidget = space.addNode(
        new S.MetaWidgetNode(
            'custom-meta',
            { x: 0, y: 0, z: 0 },
            {
                title: 'Custom Mixed Dashboard',
                width: 350,
                height: 280,
                layout: 'grid',
                columns: 2,
                gap: 8,
                widgets: [
                    {
                        id: 'status-panel',
                        type: 'info',
                        data: {
                            text: 'System Status\nAll systems operational',
                            icon: '✅'
                        }
                    },
                    {
                        id: 'quick-actions',
                        type: 'control-panel',
                        data: {
                            title: 'Quick Actions',
                            controls: [
                                { id: 'restart', type: 'button', label: 'Restart System', text: 'Restart' },
                                { id: 'maintenance', type: 'switch', label: 'Maintenance Mode', value: false }
                            ]
                        }
                    },
                    {
                        id: 'system-load',
                        type: 'progress',
                        data: {
                            label: 'System Load',
                            progressType: 'circular',
                            value: 34,
                            max: 100,
                            color: '#1abc9c'
                        }
                    },
                    {
                        id: 'alerts',
                        type: 'info',
                        data: {
                            text: 'Alerts\n2 warnings\n0 errors',
                            icon: '⚠️'
                        }
                    }
                ]
            }
        )
    );

    // Create data flow connections between dashboards
    const flowConnection1 = WidgetComposer.connectWidgets(space, controlCenter, monitorDash, 'data');
    const flowConnection2 = WidgetComposer.connectWidgets(space, monitorDash, analyticsDash, 'data');
    const flowConnection3 = WidgetComposer.connectWidgets(space, analyticsDash, workflowBuilder, 'control');

    // Connect custom widget to other dashboards
    space.addEdge(customWidget, controlCenter, {
        type: 'bezier',
        curveTension: 0.3,
        autoControlPoints: true,
        color: 0x8e44ad,
        thickness: 2,
        gradientColors: [0x9b59b6, 0x3498db]
    });

    space.addEdge(customWidget, monitorDash, {
        type: 'bezier',
        curveTension: 0.3,
        autoControlPoints: true,
        color: 0x27ae60,
        thickness: 2,
        gradientColors: [0x9b59b6, 0x27ae60]
    });

    // Set up event listeners for inter-widget communication
    space.on('meta-widget:control-changed', (event) => {
        const { metaWidget, widget, controlId, value } = event;
        console.log(`MetaWidget "${metaWidget.data.title}" control "${controlId}" changed to:`, value);
        
        // Example: Power system affects monitoring
        if (controlId === 'main-power') {
            // Update system status indicators
            updateSystemStatus(space, value);
        }
        
        // Example: Cooling system affects temperature readings
        if (controlId === 'fan-speed') {
            updateTemperatureReadings(space, value);
        }
        
        // Example: Analytics time range affects all charts
        if (controlId === 'timeRange') {
            updateAnalyticsTimeRange(space, value);
        }
    });

    space.on('meta-widget:control-clicked', (event) => {
        const { metaWidget, widget, controlId } = event;
        console.log(`MetaWidget "${metaWidget.data.title}" button "${controlId}" clicked`);
        
        // Handle button clicks
        if (controlId === 'restart') {
            simulateSystemRestart(space);
        } else if (controlId === 'refresh') {
            refreshDashboardData(space);
        }
    });

    // Animate dashboard data
    let animationTime = 0;
    const animateDashboards = () => {
        animationTime += 0.016;
        
        // Update monitoring values with realistic variations
        updateMonitoringValues(monitorDash, animationTime);
        updateAnalyticsValues(analyticsDash, animationTime);
        updateGameHUDValues(gameHUD, animationTime);
        updateCustomWidgetValues(customWidget, animationTime);
        
        requestAnimationFrame(animateDashboards);
    };
    animateDashboards();

    // Create info nodes explaining different dashboard types
    const infoNodes = [
        {
            id: 'control-info',
            position: { x: -600, y: 300, z: 0 },
            text: 'Control Center\nSystem controls\nand settings',
            color: 0x3498db
        },
        {
            id: 'monitor-info',
            position: { x: 600, y: 300, z: 0 },
            text: 'Monitoring\nReal-time system\nmetrics & status',
            color: 0xe74c3c
        },
        {
            id: 'analytics-info',
            position: { x: -300, y: -350, z: 0 },
            text: 'Analytics\nData insights\nand reporting',
            color: 0x27ae60
        },
        {
            id: 'workflow-info',
            position: { x: 300, y: -350, z: 0 },
            text: 'Workflow\nProcess automation\nand tracking',
            color: 0xf39c12
        }
    ];

    infoNodes.forEach(info => {
        space.addNode(
            new S.TextMeshNode(
                info.id,
                info.position,
                {
                    text: info.text,
                    fontSize: 11,
                    height: 3,
                    color: info.color,
                    bevelEnabled: true,
                    align: 'center',
                    animated: true,
                    animationType: 'float'
                }
            )
        );
    });

    // Center the view on the custom widget
    setTimeout(() => {
        space.centerView(customWidget, 1000);
    }, 100);

    return space;
}

// Helper functions for dynamic data updates
function updateSystemStatus(space, powerOn) {
    // Update status indicators based on power state
    console.log(`System power: ${powerOn ? 'ON' : 'OFF'}`);
}

function updateTemperatureReadings(space, fanSpeed) {
    // Simulate temperature changes based on fan speed
    const temperature = Math.max(20, 80 - fanSpeed);
    console.log(`Temperature updated: ${temperature}°C`);
}

function updateAnalyticsTimeRange(space, timeRange) {
    console.log(`Analytics time range changed to: ${timeRange}`);
}

function simulateSystemRestart(space) {
    console.log('System restart initiated...');
    // Could trigger animations, reset values, etc.
}

function refreshDashboardData(space) {
    console.log('Refreshing dashboard data...');
    // Could update all dashboard values
}

function updateMonitoringValues(dashboard, time) {
    // Simulate realistic system monitoring data
    // This would typically update the progress/gauge widgets
}

function updateAnalyticsValues(dashboard, time) {
    // Simulate analytics data changes
    // This would typically update chart data and metrics
}

function updateGameHUDValues(gameHUD, time) {
    // Simulate game state changes
    // Health, energy, stats could change based on game events
}

function updateCustomWidgetValues(customWidget, time) {
    // Update custom widget values
    const systemLoad = 30 + Math.sin(time * 0.3) * 20;
    // Would update the system load progress widget
}