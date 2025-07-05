import {HtmlNode} from './HtmlNode.js';
import {$} from '../../utils.js';

export class CanvasNode extends HtmlNode {
    static typeName = 'canvas';
    canvas = null;
    ctx = null;
    isDrawing = false;
    lastDrawPoint = null;
    drawingMode = 'pen';
    tools = {
        pen: { color: '#ffffff', size: 2 },
        brush: { color: '#ffffff', size: 8 },
        eraser: { size: 10 },
        line: { color: '#ffffff', size: 2 },
        rectangle: { color: '#ffffff', size: 2, fill: false },
        circle: { color: '#ffffff', size: 2, fill: false }
    };

    constructor(id, position, data = {}, mass = 1.0) {
        const canvasData = {
            width: data.width ?? 400,
            height: data.height ?? 300,
            title: data.title ?? 'Canvas',
            backgroundColor: data.backgroundColor ?? 'rgba(20, 25, 40, 0.95)',
            canvasBackground: data.canvasBackground ?? '#1a1a2e',
            showToolbar: data.showToolbar ?? true,
            enableDrawing: data.enableDrawing ?? true,
            preserveContent: data.preserveContent ?? true,
            ...data,
        };

        super(id, position, canvasData, mass);
        this._setupCanvas();
        this._setupTools();
        this._bindCanvasEvents();
    }

    getDefaultData() {
        return {
            ...super.getDefaultData(),
            type: 'canvas',
            title: 'Canvas',
            backgroundColor: 'rgba(20, 25, 40, 0.95)',
            canvasBackground: '#1a1a2e',
            showToolbar: true,
            enableDrawing: true,
            preserveContent: true,
        };
    }

    _createElement() {
        const el = document.createElement('div');
        el.className = 'node-canvas node-common';
        el.id = `node-canvas-${this.id}`;
        el.dataset.nodeId = this.id;
        el.style.width = `${this.size.width}px`;
        el.style.height = `${this.size.height}px`;
        el.draggable = false;

        const toolbarHeight = this.data.showToolbar ? 40 : 0;
        const canvasHeight = this.size.height - 20 - toolbarHeight;

        el.innerHTML = `
            <div class="canvas-container">
                ${this.data.showToolbar ? this._generateToolbar() : ''}
                <div class="canvas-wrapper" style="height: ${canvasHeight}px;">
                    <canvas class="drawing-canvas" width="${this.size.width - 20}" height="${canvasHeight}"></canvas>
                </div>
            </div>
            <style>
                .node-canvas {
                    background: ${this.data.backgroundColor};
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    padding: 10px;
                    font-family: 'Segoe UI', sans-serif;
                    color: white;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    overflow: hidden;
                }
                .canvas-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .canvas-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    background: rgba(0,0,0,0.2);
                    border-radius: 4px;
                    margin-bottom: 8px;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .tool-group {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 0 8px;
                    border-right: 1px solid rgba(255,255,255,0.1);
                }
                .tool-group:last-child {
                    border-right: none;
                }
                .tool-button {
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    padding: 6px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                    min-width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .tool-button:hover {
                    background: rgba(255,255,255,0.2);
                }
                .tool-button.active {
                    background: #4a9eff;
                    color: white;
                }
                .tool-slider {
                    width: 60px;
                    height: 20px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 10px;
                    outline: none;
                    appearance: none;
                    cursor: pointer;
                }
                .tool-slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #4a9eff;
                    border-radius: 50%;
                    cursor: pointer;
                }
                .color-picker {
                    width: 24px;
                    height: 24px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    background: none;
                    padding: 0;
                }
                .canvas-wrapper {
                    flex: 1;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 4px;
                    overflow: hidden;
                    position: relative;
                }
                .drawing-canvas {
                    background: ${this.data.canvasBackground};
                    display: block;
                    cursor: crosshair;
                    width: 100%;
                    height: 100%;
                }
                .drawing-canvas.eraser {
                    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect x="2" y="2" width="16" height="16" fill="white" stroke="black" stroke-width="1" rx="2"/></svg>') 10 10, auto;
                }
                .tool-label {
                    font-size: 10px;
                    color: rgba(255,255,255,0.7);
                    margin-right: 4px;
                }
            </style>
        `;

        return el;
    }

    _generateToolbar() {
        return `
            <div class="canvas-toolbar">
                <div class="tool-group">
                    <button class="tool-button active" data-tool="pen" title="Pen">✏️</button>
                    <button class="tool-button" data-tool="brush" title="Brush">🖌️</button>
                    <button class="tool-button" data-tool="eraser" title="Eraser">🧹</button>
                </div>
                <div class="tool-group">
                    <button class="tool-button" data-tool="line" title="Line">📏</button>
                    <button class="tool-button" data-tool="rectangle" title="Rectangle">⬜</button>
                    <button class="tool-button" data-tool="circle" title="Circle">⭕</button>
                </div>
                <div class="tool-group">
                    <span class="tool-label">Size:</span>
                    <input type="range" class="tool-slider" id="size-slider" min="1" max="20" value="2">
                </div>
                <div class="tool-group">
                    <span class="tool-label">Color:</span>
                    <input type="color" class="color-picker" id="color-picker" value="#ffffff">
                </div>
                <div class="tool-group">
                    <button class="tool-button" id="clear-canvas" title="Clear">🗑️</button>
                    <button class="tool-button" id="save-canvas" title="Save">💾</button>
                </div>
            </div>
        `;
    }

    _setupCanvas() {
        this.canvas = $('.drawing-canvas', this.htmlElement);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Load saved content if available
        if (this.data.preserveContent && this.data.canvasData) {
            this._loadCanvasData(this.data.canvasData);
        }
    }

    _setupTools() {
        if (!this.data.showToolbar) return;

        // Tool buttons
        const toolButtons = this.htmlElement.querySelectorAll('[data-tool]');
        toolButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this._setTool(button.dataset.tool);
                toolButtons.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
            });
        });

        // Size slider
        const sizeSlider = $('#size-slider', this.htmlElement);
        if (sizeSlider) {
            sizeSlider.addEventListener('input', (e) => {
                e.stopPropagation();
                const size = parseInt(e.target.value);
                this.tools[this.drawingMode].size = size;
            });
        }

        // Color picker
        const colorPicker = $('#color-picker', this.htmlElement);
        if (colorPicker) {
            colorPicker.addEventListener('change', (e) => {
                e.stopPropagation();
                const color = e.target.value;
                if (this.tools[this.drawingMode] && this.drawingMode !== 'eraser') {
                    this.tools[this.drawingMode].color = color;
                }
            });
        }

        // Clear button
        const clearButton = $('#clear-canvas', this.htmlElement);
        if (clearButton) {
            clearButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearCanvas();
            });
        }

        // Save button
        const saveButton = $('#save-canvas', this.htmlElement);
        if (saveButton) {
            saveButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.saveCanvas();
            });
        }
    }

    _bindCanvasEvents() {
        if (!this.canvas || !this.data.enableDrawing) return;

        this.canvas.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            this.isDrawing = true;
            const rect = this.canvas.getBoundingClientRect();
            const point = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            if (this.drawingMode === 'pen' || this.drawingMode === 'brush' || this.drawingMode === 'eraser') {
                this.lastDrawPoint = point;
                this._drawDot(point);
            } else {
                this.startPoint = point;
            }
        });

        this.canvas.addEventListener('pointermove', (e) => {
            if (!this.isDrawing) return;
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const point = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };

            if (this.drawingMode === 'pen' || this.drawingMode === 'brush' || this.drawingMode === 'eraser') {
                this._drawLine(this.lastDrawPoint, point);
                this.lastDrawPoint = point;
            }
        });

        this.canvas.addEventListener('pointerup', (e) => {
            if (!this.isDrawing) return;
            
            this.isDrawing = false;
            
            if (this.drawingMode === 'line' || this.drawingMode === 'rectangle' || this.drawingMode === 'circle') {
                const rect = this.canvas.getBoundingClientRect();
                const endPoint = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                this._drawShape(this.startPoint, endPoint);
            }

            this._saveCanvasState();
        });

        this.canvas.addEventListener('pointerleave', () => {
            this.isDrawing = false;
        });

        // Prevent default touch behaviors
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault());
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault());
        this.canvas.addEventListener('touchend', (e) => e.preventDefault());
    }

    _setTool(tool) {
        this.drawingMode = tool;
        this.canvas.className = `drawing-canvas ${tool === 'eraser' ? 'eraser' : ''}`;
        
        // Update UI
        const sizeSlider = $('#size-slider', this.htmlElement);
        const colorPicker = $('#color-picker', this.htmlElement);
        
        if (sizeSlider && this.tools[tool]) {
            sizeSlider.value = this.tools[tool].size || 2;
        }
        
        if (colorPicker && this.tools[tool] && tool !== 'eraser') {
            colorPicker.value = this.tools[tool].color || '#ffffff';
        }
    }

    _drawDot(point) {
        this.ctx.beginPath();
        
        if (this.drawingMode === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.arc(point.x, point.y, this.tools.eraser.size / 2, 0, Math.PI * 2);
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.fillStyle = this.tools[this.drawingMode].color;
            this.ctx.arc(point.x, point.y, this.tools[this.drawingMode].size / 2, 0, Math.PI * 2);
        }
        
        this.ctx.fill();
    }

    _drawLine(from, to) {
        this.ctx.beginPath();
        
        if (this.drawingMode === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.lineWidth = this.tools.eraser.size;
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.tools[this.drawingMode].color;
            this.ctx.lineWidth = this.tools[this.drawingMode].size;
        }
        
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
    }

    _drawShape(start, end) {
        const tool = this.tools[this.drawingMode];
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = tool.color;
        this.ctx.lineWidth = tool.size;
        
        this.ctx.beginPath();
        
        switch (this.drawingMode) {
            case 'line':
                this.ctx.moveTo(start.x, start.y);
                this.ctx.lineTo(end.x, end.y);
                this.ctx.stroke();
                break;
                
            case 'rectangle':
                const width = end.x - start.x;
                const height = end.y - start.y;
                if (tool.fill) {
                    this.ctx.fillStyle = tool.color;
                    this.ctx.fillRect(start.x, start.y, width, height);
                } else {
                    this.ctx.strokeRect(start.x, start.y, width, height);
                }
                break;
                
            case 'circle':
                const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
                this.ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
                if (tool.fill) {
                    this.ctx.fillStyle = tool.color;
                    this.ctx.fill();
                } else {
                    this.ctx.stroke();
                }
                break;
        }
    }

    _saveCanvasState() {
        if (this.data.preserveContent) {
            this.data.canvasData = this.canvas.toDataURL();
            this.space?.emit('graph:node:dataChanged', {
                node: this,
                property: 'canvasData',
                value: this.data.canvasData
            });
        }
    }

    _loadCanvasData(dataUrl) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this._saveCanvasState();
        this.space?.emit('graph:node:canvasCleared', { node: this });
    }

    saveCanvas() {
        const dataUrl = this.canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `canvas-${this.id}.png`;
        link.href = dataUrl;
        link.click();
        
        this.space?.emit('graph:node:canvasSaved', { 
            node: this, 
            dataUrl,
            filename: `canvas-${this.id}.png`
        });
    }

    drawImage(image, x = 0, y = 0, width = null, height = null) {
        if (width && height) {
            this.ctx.drawImage(image, x, y, width, height);
        } else {
            this.ctx.drawImage(image, x, y);
        }
        this._saveCanvasState();
    }

    drawText(text, x, y, options = {}) {
        const {
            color = '#ffffff',
            font = '16px Arial',
            align = 'left',
            baseline = 'top'
        } = options;

        this.ctx.fillStyle = color;
        this.ctx.font = font;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillText(text, x, y);
        
        this._saveCanvasState();
    }

    getCanvasData() {
        return this.canvas.toDataURL();
    }

    setCanvasData(dataUrl) {
        this._loadCanvasData(dataUrl);
    }
}