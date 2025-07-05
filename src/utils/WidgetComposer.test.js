import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WidgetComposer } from './WidgetComposer.js';

// Mock node classes
class MockNode {
    constructor(id, position, options = {}) {
        this.id = id;
        this.position = position;
        this.options = options;
        this.children = [];
    }
    
    addChild(child) {
        this.children.push(child);
    }
    
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
        }
    }
}

describe('WidgetComposer', () => {
    let composer;
    let mockSpace;
    
    beforeEach(() => {
        mockSpace = {
            addNode: vi.fn((node) => node),
            removeNode: vi.fn(),
            getNode: vi.fn((id) => null),
            emit: vi.fn()
        };
        
        composer = new WidgetComposer(mockSpace);
    });

    it('should create a WidgetComposer instance', () => {
        expect(composer).toBeInstanceOf(WidgetComposer);
        expect(composer.space).toBe(mockSpace);
        expect(composer.compositions).toBeInstanceOf(Map);
    });

    it('should have composition management methods', () => {
        expect(typeof composer.createComposition).toBe('function');
        expect(typeof composer.getComposition).toBe('function');
        expect(typeof composer.deleteComposition).toBe('function');
        expect(typeof composer.listCompositions).toBe('function');
    });

    it('should create a basic composition', () => {
        const config = {
            id: 'test-dashboard',
            type: 'dashboard',
            layout: 'grid',
            widgets: [
                {
                    type: 'progress',
                    id: 'progress-1',
                    position: { x: 0, y: 0, z: 0 },
                    options: { value: 50 }
                },
                {
                    type: 'control',
                    id: 'control-1',
                    position: { x: 100, y: 0, z: 0 },
                    options: { title: 'Controls' }
                }
            ]
        };
        
        const composition = composer.createComposition(config);
        expect(composition).toBeDefined();
        expect(composition.id).toBe('test-dashboard');
        expect(composer.compositions.has('test-dashboard')).toBe(true);
    });

    it('should create a monitoring dashboard', () => {
        const dashboard = composer.createMonitoringDashboard('monitoring-1', {
            position: { x: 0, y: 0, z: 0 },
            metrics: ['cpu', 'memory', 'network'],
            updateInterval: 1000
        });
        
        expect(dashboard).toBeDefined();
        expect(dashboard.id).toBe('monitoring-1');
        expect(dashboard.type).toBe('monitoring');
    });

    it('should create an analytics dashboard', () => {
        const dashboard = composer.createAnalyticsDashboard('analytics-1', {
            position: { x: 0, y: 0, z: 0 },
            charts: ['line', 'bar', 'pie'],
            timeRange: '24h'
        });
        
        expect(dashboard).toBeDefined();
        expect(dashboard.id).toBe('analytics-1');
        expect(dashboard.type).toBe('analytics');
    });

    it('should create a control panel', () => {
        const panel = composer.createControlPanel('control-1', {
            position: { x: 0, y: 0, z: 0 },
            controls: [
                { type: 'slider', label: 'Volume', min: 0, max: 100 },
                { type: 'button', label: 'Play' },
                { type: 'toggle', label: 'Mute' }
            ]
        });
        
        expect(panel).toBeDefined();
        expect(panel.id).toBe('control-1');
        expect(panel.type).toBe('control-panel');
    });

    it('should create a game HUD', () => {
        const hud = composer.createGameHUD('game-hud-1', {
            position: { x: 0, y: 0, z: 0 },
            elements: ['health', 'energy', 'score', 'inventory']
        });
        
        expect(hud).toBeDefined();
        expect(hud.id).toBe('game-hud-1');
        expect(hud.type).toBe('game-hud');
    });

    it('should retrieve compositions by ID', () => {
        const config = {
            id: 'test-composition',
            type: 'custom',
            widgets: []
        };
        
        composer.createComposition(config);
        const retrieved = composer.getComposition('test-composition');
        
        expect(retrieved).toBeDefined();
        expect(retrieved.id).toBe('test-composition');
    });

    it('should delete compositions', () => {
        const config = {
            id: 'delete-test',
            type: 'custom',
            widgets: []
        };
        
        composer.createComposition(config);
        expect(composer.compositions.has('delete-test')).toBe(true);
        
        composer.deleteComposition('delete-test');
        expect(composer.compositions.has('delete-test')).toBe(false);
    });

    it('should list all compositions', () => {
        composer.createComposition({ id: 'comp-1', type: 'dashboard', widgets: [] });
        composer.createComposition({ id: 'comp-2', type: 'control', widgets: [] });
        
        const list = composer.listCompositions();
        expect(list).toHaveLength(2);
        expect(list.map(c => c.id)).toContain('comp-1');
        expect(list.map(c => c.id)).toContain('comp-2');
    });

    it('should have widget factory methods', () => {
        expect(typeof composer.createWidget).toBe('function');
        expect(typeof composer.createProgressWidget).toBe('function');
        expect(typeof composer.createControlWidget).toBe('function');
        expect(typeof composer.createChartWidget).toBe('function');
    });

    it('should create individual widgets', () => {
        const progressWidget = composer.createProgressWidget('progress-test', {
            position: { x: 0, y: 0, z: 0 },
            type: 'circle',
            value: 75
        });
        
        expect(progressWidget).toBeDefined();
        expect(progressWidget.id).toBe('progress-test');
    });

    it('should handle widget connections', () => {
        const widget1 = composer.createWidget('widget-1', 'progress', { x: 0, y: 0, z: 0 });
        const widget2 = composer.createWidget('widget-2', 'control', { x: 100, y: 0, z: 0 });
        
        composer.connectWidgets(widget1, widget2, 'data-flow');
        
        expect(widget1.connections).toBeDefined();
        expect(widget1.connections.some(c => c.target === widget2)).toBe(true);
    });

    it('should handle layout arrangement', () => {
        const composition = composer.createComposition({
            id: 'layout-test',
            type: 'dashboard',
            layout: 'grid',
            widgets: [
                { type: 'progress', id: 'p1', position: { x: 0, y: 0, z: 0 } },
                { type: 'control', id: 'c1', position: { x: 0, y: 0, z: 0 } }
            ]
        });
        
        composer.arrangeLayout(composition);
        
        // Widgets should have been repositioned based on layout
        expect(composition.widgets[0].position.x).toBeDefined();
        expect(composition.widgets[1].position.x).toBeDefined();
    });

    it('should support template-based composition', () => {
        const template = {
            name: 'monitoring-template',
            type: 'dashboard',
            layout: 'flex',
            widgets: [
                { type: 'progress', slot: 'cpu' },
                { type: 'progress', slot: 'memory' },
                { type: 'chart', slot: 'network' }
            ]
        };
        
        composer.registerTemplate(template);
        
        const composition = composer.createFromTemplate('monitoring-template', 'my-monitor', {
            position: { x: 0, y: 0, z: 0 }
        });
        
        expect(composition).toBeDefined();
        expect(composition.id).toBe('my-monitor');
        expect(composition.widgets).toHaveLength(3);
    });

    it('should handle widget data binding', () => {
        const widget = composer.createProgressWidget('bound-progress', {
            position: { x: 0, y: 0, z: 0 },
            dataSource: 'cpu-usage',
            binding: 'value'
        });
        
        composer.bindWidgetData(widget, 'cpu-usage', 'value');
        
        expect(widget.dataBinding).toBeDefined();
        expect(widget.dataBinding.source).toBe('cpu-usage');
        expect(widget.dataBinding.property).toBe('value');
    });

    it('should handle composition events', () => {
        const callback = vi.fn();
        composer.on('compositionCreated', callback);
        
        composer.createComposition({
            id: 'event-test',
            type: 'dashboard',
            widgets: []
        });
        
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({
            id: 'event-test'
        }));
    });
});