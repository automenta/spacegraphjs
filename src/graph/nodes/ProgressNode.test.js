import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProgressNode } from './ProgressNode.js';

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

describe('ProgressNode', () => {
    let node;
    
    beforeEach(() => {
        node = new ProgressNode(
            'progress-1',
            { x: 0, y: 0, z: 0 },
            {
                title: 'Test Progress',
                type: 'bar',
                value: 50,
                min: 0,
                max: 100,
                color: '#4CAF50',
                showLabel: true
            }
        );
    });

    it('should create a ProgressNode with correct properties', () => {
        expect(node.id).toBe('progress-1');
        expect(node.position).toEqual({ x: 0, y: 0, z: 0 });
        expect(node.options.title).toBe('Test Progress');
        expect(node.options.type).toBe('bar');
        expect(node.options.value).toBe(50);
    });

    it('should have progress-specific methods', () => {
        expect(typeof node.setValue).toBe('function');
        expect(typeof node.getValue).toBe('function');
        expect(typeof node.getPercentage).toBe('function');
        expect(typeof node.setRange).toBe('function');
    });

    it('should set and get values correctly', () => {
        node.setValue(75);
        expect(node.getValue()).toBe(75);
        expect(node.getPercentage()).toBe(75);
    });

    it('should handle value range correctly', () => {
        node.setRange(0, 200);
        node.setValue(150);
        expect(node.getValue()).toBe(150);
        expect(node.getPercentage()).toBe(75);
    });

    it('should clamp values to min/max range', () => {
        node.setValue(-10);
        expect(node.getValue()).toBe(0);
        
        node.setValue(150);
        expect(node.getValue()).toBe(100);
    });

    it('should support different progress types', () => {
        const circleNode = new ProgressNode('circle', { x: 0, y: 0, z: 0 }, { type: 'circle' });
        expect(circleNode.options.type).toBe('circle');
        
        const gaugeNode = new ProgressNode('gauge', { x: 0, y: 0, z: 0 }, { type: 'gauge' });
        expect(gaugeNode.options.type).toBe('gauge');
    });

    it('should handle color updates', () => {
        node.setColor('#FF5722');
        expect(node.options.color).toBe('#FF5722');
    });

    it('should trigger value change callbacks', () => {
        const callback = vi.fn();
        node.onValueChange(callback);
        
        node.setValue(80);
        expect(callback).toHaveBeenCalledWith(80, 80);
    });
});