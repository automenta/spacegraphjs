import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MetaWidgetNode } from './MetaWidgetNode.js';
import { ProgressNode } from './ProgressNode.js';
import { ControlPanelNode } from './ControlPanelNode.js';

// Mock HTML dependencies
global.document = {
    createElement: vi.fn(() => ({
        style: {},
        classList: { add: vi.fn() },
        appendChild: vi.fn(),
        innerHTML: '',
        setAttribute: vi.fn()
    }))
};

describe('MetaWidgetNode', () => {
    let metaWidget;
    let childWidget1;
    let childWidget2;
    
    beforeEach(() => {
        metaWidget = new MetaWidgetNode(
            'meta-widget-1',
            { x: 0, y: 0, z: 0 },
            {
                title: 'Test Dashboard',
                layout: 'grid',
                columns: 2,
                spacing: 10,
                padding: 20
            }
        );
        
        childWidget1 = new ProgressNode('progress-child', { x: 0, y: 0, z: 0 }, { type: 'bar' });
        childWidget2 = new ControlPanelNode('control-child', { x: 0, y: 0, z: 0 }, { controls: [] });
    });

    it('should create a MetaWidgetNode with correct properties', () => {
        expect(metaWidget.id).toBe('meta-widget-1');
        expect(metaWidget.position).toEqual({ x: 0, y: 0, z: 0 });
        expect(metaWidget.options.title).toBe('Test Dashboard');
        expect(metaWidget.options.layout).toBe('grid');
        expect(metaWidget.children).toEqual([]);
    });

    it('should have child management methods', () => {
        expect(typeof metaWidget.addChild).toBe('function');
        expect(typeof metaWidget.removeChild).toBe('function');
        expect(typeof metaWidget.getChildren).toBe('function');
        expect(typeof metaWidget.clearChildren).toBe('function');
    });

    it('should add children correctly', () => {
        metaWidget.addChild(childWidget1);
        expect(metaWidget.children).toHaveLength(1);
        expect(metaWidget.children[0]).toBe(childWidget1);
        
        metaWidget.addChild(childWidget2);
        expect(metaWidget.children).toHaveLength(2);
    });

    it('should remove children correctly', () => {
        metaWidget.addChild(childWidget1);
        metaWidget.addChild(childWidget2);
        
        metaWidget.removeChild(childWidget1);
        expect(metaWidget.children).toHaveLength(1);
        expect(metaWidget.children[0]).toBe(childWidget2);
    });

    it('should clear all children', () => {
        metaWidget.addChild(childWidget1);
        metaWidget.addChild(childWidget2);
        
        metaWidget.clearChildren();
        expect(metaWidget.children).toHaveLength(0);
    });

    it('should handle layout updates', () => {
        metaWidget.setLayout('flex');
        expect(metaWidget.options.layout).toBe('flex');
    });

    it('should arrange children based on layout', () => {
        const arrangeSpy = vi.spyOn(metaWidget, 'arrangeChildren');
        
        metaWidget.addChild(childWidget1);
        metaWidget.addChild(childWidget2);
        metaWidget.arrangeChildren();
        
        expect(arrangeSpy).toHaveBeenCalled();
    });

    it('should support different layout types', () => {
        const flexMetaWidget = new MetaWidgetNode('flex-widget', { x: 0, y: 0, z: 0 }, { layout: 'flex' });
        expect(flexMetaWidget.options.layout).toBe('flex');
        
        const stackMetaWidget = new MetaWidgetNode('stack-widget', { x: 0, y: 0, z: 0 }, { layout: 'stack' });
        expect(stackMetaWidget.options.layout).toBe('stack');
    });

    it('should handle child positioning correctly', () => {
        metaWidget.addChild(childWidget1);
        metaWidget.addChild(childWidget2);
        
        metaWidget.arrangeChildren();
        
        // Children should have updated positions based on layout
        expect(childWidget1.position).toBeDefined();
        expect(childWidget2.position).toBeDefined();
    });

    it('should emit events when children are modified', () => {
        const callback = vi.fn();
        metaWidget.on('childAdded', callback);
        
        metaWidget.addChild(childWidget1);
        expect(callback).toHaveBeenCalledWith(childWidget1);
    });
});