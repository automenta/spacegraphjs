import * as THREE from 'three';
import {Node} from './Node.js';
import {CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';

const DEFAULT_NODE_SIZE = 100;
const DEFAULT_CHART_BG_COLOR = '#222227';
const DEFAULT_CHART_TEXT_COLOR = '#eeeeee';

export class DataNode extends Node {
    static typeName = 'data';
    canvas = null;
    ctx = null;
    texture = null;

    constructor(id, position, data = {}, mass = 1.2) {
        super(id, position, data, mass);
        this.size = this.data.size || DEFAULT_NODE_SIZE;

        this._setupCanvas();
        this._createChartMesh();

        if (this.data.label) this.labelObject = this._createLabel();
        this.update();
        this.updateBoundingSphere();
    }

    getDefaultData() {
        return {
            label: 'Data Node',
            type: 'data',
            size: DEFAULT_NODE_SIZE,
            chartType: 'bar',
            chartData: [
                { label: 'A', value: 10, color: '#ff6384' },
                { label: 'B', value: 20, color: '#36a2eb' },
                { label: 'C', value: 15, color: '#ffce56' },
            ],
            chartBackgroundColor: DEFAULT_CHART_BG_COLOR,
            chartTextColor: DEFAULT_CHART_TEXT_COLOR,
        };
    }

    _setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 256;
        this.canvas.height = 256;
        this.ctx = this.canvas.getContext('2d');
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.colorSpace = THREE.SRGBColorSpace;
    }

    _createChartMesh() {
        const geometry = new THREE.PlaneGeometry(this.size, this.size);
        const material = new THREE.MeshStandardMaterial({
            map: this.texture,
            side: THREE.DoubleSide,
            transparent: true,
            roughness: 0.8,
            metalness: 0.1,
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.userData = { nodeId: this.id, type: 'data-node-mesh' };
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this._drawChart();
    }

    _drawChart() {
        if (!this.ctx || !this.canvas) return;

        const { chartType, chartData, chartBackgroundColor, chartTextColor } = this.data;
        const { width, height } = this.canvas;

        this.ctx.fillStyle = chartBackgroundColor || DEFAULT_CHART_BG_COLOR;
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.fillStyle = chartTextColor || DEFAULT_CHART_TEXT_COLOR;
        this.ctx.strokeStyle = chartTextColor || DEFAULT_CHART_TEXT_COLOR;
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';

        if (!chartData?.length) {
            this.ctx.fillText('No Data', width / 2, height / 2);
            this.texture.needsUpdate = true;
            return;
        }

        switch (chartType) {
            case 'bar':
                this._drawBarChart(chartData, width, height);
                break;
            case 'line':
                this.ctx.fillText('Line chart NI', width / 2, height / 2);
                break;
            case 'pie':
                this.ctx.fillText('Pie chart NI', width / 2, height / 2);
                break;
            default:
                this.ctx.fillText(`Unknown: ${chartType}`, width / 2, height / 2);
        }
        this.texture.needsUpdate = true;
    }

    _drawBarChart(data, canvasWidth, canvasHeight) {
        const numBars = data.length;
        if (numBars === 0) return;

        const padding = 20;
        const chartWidth = canvasWidth - 2 * padding;
        const chartHeight = canvasHeight - 2 * padding - 20;
        const barWidth = chartWidth / numBars - 5;
        const maxValue = Math.max(...data.map((d) => d.value), 0);

        if (maxValue === 0) {
            this.ctx.fillText('All values are 0', canvasWidth / 2, canvasHeight / 2);
            return;
        }

        data.forEach((item, index) => {
            const barHeight = (item.value / maxValue) * chartHeight;
            const x = padding + index * (barWidth + 5);
            const y = canvasHeight - padding - barHeight - 20;

            this.ctx.fillStyle = item.color || '#cccccc';
            this.ctx.fillRect(x, y, barWidth, barHeight);

            this.ctx.fillStyle = this.data.chartTextColor || DEFAULT_CHART_TEXT_COLOR;
            this.ctx.fillText(item.label || '', x + barWidth / 2, canvasHeight - padding + 5);
        });
    }

    updateChartData(newData) {
        this.data.chartData = newData;
        this._drawChart();
    }

    _createLabel() {
        const div = document.createElement('div');
        div.className = 'node-label-3d node-common';
        div.textContent = this.data.label || '';
        div.dataset.nodeId = this.id;
        return new CSS3DObject(div);
    }

    update(space) {
        super.update(space);
        if (this.labelObject) {
            const offset = this.getBoundingSphereRadius() * 1.1 + 15;
            this.labelObject.position.copy(this.position).y += offset;
            if (space?._cam) this.labelObject.quaternion.copy(space._cam.quaternion);
        }
    }

    updateBoundingSphere() {
        if (!this.mesh) return;
        if (!this.mesh.geometry.boundingSphere) this.mesh.geometry.computeBoundingSphere();
        this._boundingSphere = this.mesh.geometry.boundingSphere.clone();
        this._boundingSphere.center.copy(this.position);
        this._boundingSphere.radius = (this.size / 2) * Math.sqrt(2);
    }

    setSelectedStyle(selected) {
        if (this.mesh?.material) this.mesh.material.emissive?.setHex(selected ? 0x333300 : 0x000000);
        this.labelObject?.element?.classList.toggle('selected', selected);
    }

    dispose() {
        super.dispose();
        this.texture?.dispose();
        this.canvas = null;
        this.ctx = null;
        this.texture = null;
    }
}
