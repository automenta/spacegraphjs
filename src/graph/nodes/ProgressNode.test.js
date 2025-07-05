import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProgressNode } from './ProgressNode.js';

// Mock HTML and Three.js dependencies
global.document = {
    createElement: vi.fn((tagName) => {
        const el = {
            tagName: tagName.toLowerCase(),
            style: { setProperty: vi.fn() },
            classList: { add: vi.fn(), toggle: vi.fn(), remove: vi.fn(), contains: vi.fn() },
            dataset: {},
            addEventListener: vi.fn(),
            appendChild: vi.fn(),
            insertBefore: vi.fn(),
            removeChild: vi.fn(),
            setAttribute: vi.fn(),
            removeAttribute: vi.fn(),
            // This querySelector on 'el' will be context.querySelector
            querySelector: vi.fn(function(selector) { // Use function to access this.tagName if needed
                if (selector === '.progress-container') return { innerHTML: '' };
                // Add more specific mocks if other selectors are used on the element itself
                return null;
            }),
            querySelectorAll: vi.fn(() => []),
            innerHTML: '',
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

describe('ProgressNode', () => {
    let node;
    let mockSpace;
    
    beforeEach(() => {
        mockSpace = { emit: vi.fn() };
        const initialData = {
            label: 'Test Progress', // Changed from title to label to match ProgressNode data
            progressType: 'bar',    // Changed from type to progressType
            value: 50,
            min: 0,
            max: 100,
            color: '#4CAF50',
            showLabel: true // This is not directly used by ProgressNode, but by HtmlNode's label
        };
        node = new ProgressNode(
            'progress-1',
            { x: 0, y: 0, z: 0 },
            initialData
        );
        node.space = mockSpace; // Inject mock space
    });

    it('should create a ProgressNode with correct properties', () => {
        expect(node.id).toBe('progress-1');
        expect(node.position).toEqual({ x: 0, y: 0, z: 0 });
        expect(node.data.label).toBe('Test Progress');
        expect(node.data.progressType).toBe('bar');
        expect(node.data.value).toBe(50);
    });

    it('should have progress-specific methods', () => {
        expect(typeof node.setValue).toBe('function');
        expect(typeof node.setMin).toBe('function');
        expect(typeof node.setMax).toBe('function');
        expect(typeof node.increment).toBe('function');
        expect(typeof node.decrement).toBe('function');
        expect(typeof node.animateToValue).toBe('function');
        // getValue and getPercentage are not direct public methods.
        // Value is in node.data.value, percentage is node._getPercent()
    });

    it('should set and get values correctly', () => {
        node.setValue(75);
        expect(node.data.value).toBe(75);
        expect(node._getPercent()).toBe(75); // Test internal _getPercent
    });

    it('should handle value range correctly with setMin/setMax', () => {
        node.setMin(0);
        node.setMax(200);
        node.setValue(150);
        expect(node.data.value).toBe(150);
        expect(node._getPercent()).toBe(75); // (150-0) / (200-0) * 100
    });

    it('should clamp values to min/max range on setValue', () => {
        node.setValue(-10);
        expect(node.data.value).toBe(node.data.min); // Clamped to min (0 by default)
        
        node.setValue(150);
        expect(node.data.value).toBe(node.data.max); // Clamped to max (100 by default)
    });

    it('should support different progress types via data.progressType', () => {
        const circleNode = new ProgressNode('circle', { x: 0, y: 0, z: 0 }, { progressType: 'circular' });
        expect(circleNode.data.progressType).toBe('circular');
        
        const gaugeNode = new ProgressNode('gauge', { x: 0, y: 0, z: 0 }, { progressType: 'gauge' });
        expect(gaugeNode.data.progressType).toBe('gauge');
    });

    it('should store color in data (no direct setColor method)', () => {
        // Color is set at construction via data.color
        expect(node.data.color).toBe('#4CAF50');
        // To change color, one would typically modify data and re-render or have a specific method.
        // For now, we confirm it's stored.
    });

    it('should emit dataChanged event when value changes', () => {
        node.setValue(80);
        expect(mockSpace.emit).toHaveBeenCalledWith('graph:node:dataChanged', {
            node: node,
            property: 'value',
            value: 80
        });
    });
});

// Mock requestAnimationFrame and cancelAnimationFrame for animateToValue
beforeEach(() => {
    vi.useFakeTimers();
    global.requestAnimationFrame = vi.fn((cb) => { cb(performance.now()); return Date.now(); });
    global.cancelAnimationFrame = vi.fn();
    let currentTime = Date.now();
    global.performance = {
        now: vi.fn(() => {
            currentTime += 16; // Simulate time passing for each frame
            return currentTime;
        })
    };
});

afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
    delete global.performance;
});