import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConstraintLayout } from './ConstraintLayout.js';

describe('ConstraintLayout', () => {
    let layout;
    let nodes;
    let edges;
    
    beforeEach(() => {
        layout = new ConstraintLayout({
            constraintStrength: 0.8,
            iterations: 50,
            damping: 0.9
        });
        
        nodes = [
            { 
                id: 'node1', 
                position: { x: 0, y: 0, z: 0 },
                constraints: []
            },
            { 
                id: 'node2', 
                position: { x: 5, y: 0, z: 0 },
                constraints: []
            },
            { 
                id: 'node3', 
                position: { x: 0, y: 5, z: 0 },
                constraints: []
            }
        ];
        
        edges = [
            { source: nodes[0], target: nodes[1] },
            { source: nodes[1], target: nodes[2] }
        ];
    });

    it('should create a ConstraintLayout with correct options', () => {
        expect(layout.options.constraintStrength).toBe(0.8);
        expect(layout.options.iterations).toBe(50);
        expect(layout.options.damping).toBe(0.9);
    });

    it('should have constraint management methods', () => {
        expect(typeof layout.addConstraint).toBe('function');
        expect(typeof layout.removeConstraint).toBe('function');
        expect(typeof layout.clearConstraints).toBe('function');
        expect(typeof layout.validateConstraints).toBe('function');
    });

    it('should add distance constraints', () => {
        layout.addConstraint('distance', {
            nodeA: nodes[0],
            nodeB: nodes[1],
            distance: 10,
            strength: 1.0
        });
        
        expect(layout.constraints.distance).toHaveLength(1);
        expect(layout.constraints.distance[0].distance).toBe(10);
    });

    it('should add position constraints', () => {
        layout.addConstraint('position', {
            node: nodes[0],
            position: { x: 0, y: 0, z: 0 },
            strength: 0.8
        });
        
        expect(layout.constraints.position).toHaveLength(1);
        expect(layout.constraints.position[0].node).toBe(nodes[0]);
    });

    it('should add alignment constraints', () => {
        layout.addConstraint('alignment', {
            nodes: [nodes[0], nodes[1], nodes[2]],
            axis: 'x',
            strength: 0.6
        });
        
        expect(layout.constraints.alignment).toHaveLength(1);
        expect(layout.constraints.alignment[0].axis).toBe('x');
    });

    it('should remove constraints correctly', () => {
        const constraintId = layout.addConstraint('distance', {
            nodeA: nodes[0],
            nodeB: nodes[1],
            distance: 5
        });
        
        expect(layout.constraints.distance).toHaveLength(1);
        
        layout.removeConstraint('distance', constraintId);
        expect(layout.constraints.distance).toHaveLength(0);
    });

    it('should clear all constraints', () => {
        layout.addConstraint('distance', { nodeA: nodes[0], nodeB: nodes[1], distance: 5 });
        layout.addConstraint('position', { node: nodes[0], position: { x: 0, y: 0, z: 0 } });
        
        layout.clearConstraints();
        expect(layout.constraints.distance).toHaveLength(0);
        expect(layout.constraints.position).toHaveLength(0);
    });

    it('should validate constraint configurations', () => {
        const validDistance = layout.validateConstraints('distance', {
            nodeA: nodes[0],
            nodeB: nodes[1],
            distance: 10
        });
        expect(validDistance).toBe(true);
        
        const invalidDistance = layout.validateConstraints('distance', {
            nodeA: nodes[0],
            // Missing nodeB
            distance: 10
        });
        expect(invalidDistance).toBe(false);
    });

    it('should apply constraints during layout', () => {
        layout.addConstraint('distance', {
            nodeA: nodes[0],
            nodeB: nodes[1],
            distance: 10,
            strength: 1.0
        });
        
        const applySpy = vi.spyOn(layout, 'applyConstraints');
        layout.apply(nodes, edges);
        
        expect(applySpy).toHaveBeenCalled();
    });

    it('should handle constraint strength correctly', () => {
        const constraint = {
            nodeA: nodes[0],
            nodeB: nodes[1],
            distance: 10,
            strength: 0.5
        };
        
        layout.addConstraint('distance', constraint);
        const addedConstraint = layout.constraints.distance[0];
        expect(addedConstraint.strength).toBe(0.5);
    });

    it('should support different constraint types', () => {
        expect(layout.constraintTypes).toContain('distance');
        expect(layout.constraintTypes).toContain('position');
        expect(layout.constraintTypes).toContain('alignment');
        expect(layout.constraintTypes).toContain('separation');
    });
});