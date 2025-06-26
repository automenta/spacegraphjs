import {HtmlNode} from './HtmlNode.js';

export class ChartNode extends HtmlNode {
    static typeName = 'chart';

    constructor(id, position, data = {}, mass = 1.0) {
        const defaultChartData = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
            datasets: [{
                label: 'Sales',
                data: [65, 59, 80, 81, 56],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        };

        const defaultChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                    labels: {
                        color: 'white' // Default for dark theme
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        };

        const mergedData = {
            ...data,
            label: data.label ?? 'Chart Node',
            width: data.width ?? 300,
            height: data.height ?? 200,
            chartType: data.chartType ?? 'bar',
            chartData: data.chartData ? { ...defaultChartData, ...data.chartData } : defaultChartData,
            chartOptions: data.chartOptions ? { ...defaultChartOptions, ...data.chartOptions } : defaultChartOptions,
            editable: false, // Charts are not directly editable content
            backgroundColor: data.backgroundColor ?? '#2a2a2b',
            type: ChartNode.typeName,
        };

        super(id, position, mergedData, mass);
        this.htmlElement.classList.add('node-chart'); // Add a specific class for styling

        // Initial render of the chart
        this._renderChart();
    }

    getDefaultData() {
        return {
            ...super.getDefaultData(),
            label: 'Chart Node',
            width: 300,
            height: 200,
            chartType: 'bar',
            chartData: {},
            chartOptions: {},
            backgroundColor: '#2a2a2b',
        };
    }

    _renderChart() {
        const chartId = `chart-canvas-${this.id}`;
        const contentDiv = this.htmlElement.querySelector('.node-content');
        if (!contentDiv) return;

        // Clear existing content and add canvas
        contentDiv.innerHTML = `<canvas id="${chartId}" style="width:100%; height:100%;"></canvas>`;
        const canvas = contentDiv.querySelector(`#${chartId}`);

        // Inject Chart.js script if not already present (simplified for demo)
        // In a real app, Chart.js would be bundled or loaded globally.
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js';
            script.onload = () => this._initializeChart(canvas);
            document.head.appendChild(script);
        } else {
            this._initializeChart(canvas);
        }
    }

    _initializeChart(canvas) {
        if (!canvas || typeof Chart === 'undefined') return;

        // Destroy existing chart instance if any
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        // Adjust chart options for light theme if active
        const isLightTheme = document.body.classList.contains('theme-light');
        const chartOptions = JSON.parse(JSON.stringify(this.data.chartOptions)); // Deep copy
        if (isLightTheme) {
            chartOptions.plugins.legend.labels.color = 'black';
            chartOptions.scales.x.ticks.color = 'black';
            chartOptions.scales.x.grid.color = 'rgba(0,0,0,0.1)';
            chartOptions.scales.y.ticks.color = 'black';
            chartOptions.scales.y.grid.color = 'rgba(0,0,0,0.1)';
        }

        this.chartInstance = new Chart(canvas, {
            type: this.data.chartType,
            data: this.data.chartData,
            options: chartOptions,
        });
    }

    // Override setBackgroundColor to also update chart colors
    setBackgroundColor(color) {
        super.setBackgroundColor(color);
        // Update chart background if needed, or rely on Chart.js defaults
        // For now, just re-render to pick up theme changes
        this._renderChart();
    }

    // Method to update chart data dynamically
    updateChartData(newChartData) {
        this.data.chartData = { ...this.data.chartData, ...newChartData };
        if (this.chartInstance) {
            this.chartInstance.data = this.data.chartData;
            this.chartInstance.update();
        } else {
            this._renderChart(); // Re-render if chart not initialized
        }
        this.space?.emit('graph:node:dataChanged', { node: this, property: 'chartData', value: this.data.chartData });
    }

    dispose() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        super.dispose();
    }
}
