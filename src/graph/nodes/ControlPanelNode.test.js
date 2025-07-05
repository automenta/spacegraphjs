import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ControlPanelNode } from './ControlPanelNode.js';

// Mock HTML and Three.js dependencies
global.document = {
    createElement: vi.fn(() => ({
        style: {},
        classList: { add: vi.fn() },
        addEventListener: vi.fn(),
        appendChild: vi.fn(),
        innerHTML: '',
        setAttribute: vi.fn()
    }))
};

describe('ControlPanelNode', () => {
    let node;
    
    beforeEach(() => {
        node = new ControlPanelNode(
            'control-panel-1',
            { x: 0, y: 0, z: 0 },
            {
                title: 'Test Control Panel',
                width: 300,
                height: 200,
                controls: [
                    { type: 'slider', label: 'Volume', min: 0, max: 100, value: 50, id: 'volume' },
                    { type: 'button', label: 'Start', action: 'start' },
                    { type: 'toggle', label: 'Auto Mode', id: 'autoMode', value: false }
                ]
            }
        );
    });

    it('should create a ControlPanelNode with correct properties', () => {
        expect(node.id).toBe('control-panel-1');
        expect(node.position).toEqual({ x: 0, y: 0, z: 0 });
        expect(node.options.title).toBe('Test Control Panel');
        expect(node.options.width).toBe(300);
        expect(node.options.height).toBe(200);
    });

    it('should initialize with correct number of controls', () => {
        expect(node.options.controls).toHaveLength(3);
        expect(node.options.controls[0].type).toBe('slider');
        expect(node.options.controls[1].type).toBe('button');
        expect(node.options.controls[2].type).toBe('toggle');
    });

    it('should have a getControlValue method', () => {
        expect(typeof node.getControlValue).toBe('function');
    });

    it('should have a setControlValue method', () => {
        expect(typeof node.setControlValue).toBe('function');
    });

    it('should have an onControlChange method', () => {
        expect(typeof node.onControlChange).toBe('function');
    });

    it('should set and get control values correctly', () => {
        node.setControlValue('volume', 75);
        expect(node.getControlValue('volume')).toBe(75);
        
        node.setControlValue('autoMode', true);
        expect(node.getControlValue('autoMode')).toBe(true);
    });

    it('should handle invalid control IDs gracefully', () => {
        node.setControlValue('nonexistent', 100);
        expect(node.getControlValue('nonexistent')).toBeUndefined();
    });

    it('should trigger control change callbacks', () => {
        const callback = vi.fn();
        node.onControlChange('volume', callback);
        
        node.setControlValue('volume', 80);
        expect(callback).toHaveBeenCalledWith(80, 'volume');
    });
});