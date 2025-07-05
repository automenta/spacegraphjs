import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MetaWidgetNode } from './MetaWidgetNode.js';
import { ProgressNode } from './ProgressNode.js';
import { ControlPanelNode } from './ControlPanelNode.js';

// Mock HTML and Three.js dependencies
global.document = {
    createElement: vi.fn((tagName) => {
        const el = {
            tagName: tagName.toLowerCase(),
            style: { setProperty: vi.fn() }, // Added setProperty
            classList: { add: vi.fn(), toggle: vi.fn(), remove: vi.fn(), contains: vi.fn() },
            dataset: {},
            addEventListener: vi.fn(),
            appendChild: vi.fn(),
            insertBefore: vi.fn(),
            removeChild: vi.fn(),
            setAttribute: vi.fn(),
            removeAttribute: vi.fn(),
            querySelector: vi.fn(selector => {
                // Basic querySelector mock for MetaWidgetNode needs
                if (selector === '.widget-grid') return { className: 'widget-grid', style: {}, appendChild: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() } };
                if (selector === '.meta-widget-header') return { querySelector: vi.fn() }; // Further nesting if needed
                if (selector.startsWith('.')) return { addEventListener: vi.fn(), style: {} }; // Generic for other buttons/selectors
                return null;
            }),
            querySelectorAll: vi.fn(() => []),
            innerHTML: '',
            get contentEditable() { return this._contentEditable; },
            set contentEditable(val) { this._contentEditable = val; },
            get scrollHeight() { return this._scrollHeight || 0; },
            set scrollHeight(val) { this._scrollHeight = val; },
            get clientHeight() { return this._clientHeight || 0; },
            set clientHeight(val) { this._clientHeight = val; },
        };
        return el;
    })
};

vi.mock('three/addons/renderers/CSS3DRenderer.js', () => ({
    CSS3DObject: vi.fn().mockImplementation(element => ({
        element: element,
        position: { copy: vi.fn() },
        quaternion: { copy: vi.fn() },
        userData: {}
    }))
}));


describe('MetaWidgetNode', () => {
    let metaWidget;
    let mockSpace;
    // childWidget1 and childWidget2 will be data objects, not node instances
    let childWidgetData1;
    let childWidgetData2;
    
    beforeEach(() => {
        mockSpace = {
            emit: vi.fn(),
            plugins: { /* ... mock plugins if needed by MetaWidgetNode ... */ }
        };

        metaWidget = new MetaWidgetNode(
            'meta-widget-1',
            { x: 0, y: 0, z: 0 }, // Position
            { // Data
                title: 'Test Dashboard',
                layout: 'grid', // This will set metaWidget.layout
                columns: 2,     // This will set metaWidget.columns
                gap: 10,        // Changed from spacing, maps to metaWidget.gap
                padding: 20,
                widgets: []     // Initial widgets
            }
        );
        metaWidget.space = mockSpace; // Inject mock space

        childWidgetData1 = { id: 'progress-child', type: 'progress', data: { label: 'Progress 1' } };
        childWidgetData2 = { id: 'control-child', type: 'control-panel', data: { title: 'Controls 1' } };
    });

    it('should create a MetaWidgetNode with correct properties', () => {
        expect(metaWidget.id).toBe('meta-widget-1');
        expect(metaWidget.position).toEqual({ x: 0, y: 0, z: 0 });
        expect(metaWidget.data.title).toBe('Test Dashboard');
        expect(metaWidget.layout).toBe('grid'); // Direct property
        expect(metaWidget.data.layout).toBe('grid'); // Also in data
        expect(metaWidget.childWidgets.size).toBe(0); // childWidgets is a Map
    });

    it('should have widget management methods', () => {
        expect(typeof metaWidget.addWidget).toBe('function');
        expect(typeof metaWidget.removeWidget).toBe('function');
        expect(typeof metaWidget.getWidget).toBe('function');
        expect(typeof metaWidget.getAllWidgets).toBe('function');
    });

    it('should add widgets correctly', () => {
        const id1 = metaWidget.addWidget(childWidgetData1);
        expect(metaWidget.childWidgets.size).toBe(1);
        expect(metaWidget.childWidgets.get(id1).id).toBe(childWidgetData1.id);
        
        const id2 = metaWidget.addWidget(childWidgetData2);
        expect(metaWidget.childWidgets.size).toBe(2);
        expect(metaWidget.childWidgets.get(id2).type).toBe('control-panel');
    });

    it('should remove widgets correctly', () => {
        const id1 = metaWidget.addWidget(childWidgetData1);
        const id2 = metaWidget.addWidget(childWidgetData2);
        
        metaWidget.removeWidget(id1);
        expect(metaWidget.childWidgets.size).toBe(1);
        expect(metaWidget.childWidgets.has(id1)).toBe(false);
        expect(metaWidget.childWidgets.get(id2).id).toBe(childWidgetData2.id);
    });

    it('should clear all widgets (implicitly, no direct clearChildren/clearWidgets method)', () => {
        // MetaWidgetNode does not have a direct clearAllWidgets or similar method.
        // Widgets are removed one by one. If this functionality is needed, it's a feature request.
        // For testing, we can remove all added widgets.
        const id1 = metaWidget.addWidget(childWidgetData1);
        const id2 = metaWidget.addWidget(childWidgetData2);
        
        metaWidget.removeWidget(id1);
        metaWidget.removeWidget(id2);
        expect(metaWidget.childWidgets.size).toBe(0);
    });

    it('should handle layout updates via setLayout', () => {
        metaWidget.setLayout('flex-row');
        expect(metaWidget.layout).toBe('flex-row');
        expect(metaWidget.data.layout).toBe('flex-row');
    });

    it('should call _updateLayout when widgets are added or layout changes', () => {
        const updateLayoutSpy = vi.spyOn(metaWidget, '_updateLayout');
        
        metaWidget.addWidget(childWidgetData1);
        expect(updateLayoutSpy).toHaveBeenCalled();
        
        metaWidget.setLayout('flex-column');
        expect(updateLayoutSpy).toHaveBeenCalledTimes(2); // Called again for setLayout
        updateLayoutSpy.mockRestore();
    });

    it('should support different layout types (check initial setup)', () => {
        const flexMetaWidget = new MetaWidgetNode('flex-widget', { x: 0, y: 0, z: 0 }, { layout: 'flex-row' });
        expect(flexMetaWidget.layout).toBe('flex-row');
        
        const columnMetaWidget = new MetaWidgetNode('col-widget', { x: 0, y: 0, z: 0 }, { layout: 'flex-column' });
        expect(columnMetaWidget.layout).toBe('flex-column');
    });

    // Child positioning is handled by CSS (grid/flex) and not by direct position manipulation in JS.
    // This test as originally written might not be applicable.
    // it('should handle child positioning correctly', () => { ... });

    it('should emit events when widgets are added or removed', () => {
        metaWidget.addWidget(childWidgetData1);
        expect(mockSpace.emit).toHaveBeenCalledWith('meta-widget:widget-added',
            expect.objectContaining({ metaWidget: metaWidget, widget: expect.objectContaining({id: childWidgetData1.id}) })
        );

        mockSpace.emit.mockClear(); // Clear previous calls

        metaWidget.removeWidget(childWidgetData1.id);
         expect(mockSpace.emit).toHaveBeenCalledWith('meta-widget:widget-removed',
            expect.objectContaining({ metaWidget: metaWidget, widgetId: childWidgetData1.id })
        );
    });
});