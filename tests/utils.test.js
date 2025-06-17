import { describe, it, expect } from 'vitest';
import { generateId, clamp, lerp } from '../spacegraph.js';

describe('Utility Functions', () => {
    describe('generateId', () => {
        it('should return a string', () => {
            expect(typeof generateId()).toBe('string');
        });
        it('should include the prefix', () => {
            expect(generateId('test')).toMatch(/^test-/);
        });
        it('should generate unique IDs', () => {
            const id1 = generateId();
            const id2 = generateId();
            expect(id1).not.toBe(id2);
        });
        it('should generate unique IDs even with the same prefix', () => {
            const id1 = generateId('prefix');
            const id2 = generateId('prefix');
            expect(id1).not.toBe(id2);
        });
    });

    describe('clamp', () => {
        it('should clamp to min when value is less than min', () => {
            expect(clamp(5, 10, 20)).toBe(10);
        });
        it('should clamp to max when value is greater than max', () => {
            expect(clamp(25, 10, 20)).toBe(20);
        });
        it('should not clamp when value is within range', () => {
            expect(clamp(15, 10, 20)).toBe(15);
        });
        it('should work with min boundary', () => {
            expect(clamp(10, 10, 20)).toBe(10);
        });
        it('should work with max boundary', () => {
            expect(clamp(20, 10, 20)).toBe(20);
        });
    });

    describe('lerp', () => {
        it('should return start value when t=0', () => {
            expect(lerp(10, 20, 0)).toBe(10);
        });
        it('should return end value when t=1', () => {
            expect(lerp(10, 20, 1)).toBe(20);
        });
        it('should return midpoint when t=0.5', () => {
            expect(lerp(10, 20, 0.5)).toBe(15);
        });
        it('should interpolate correctly for other t values', () => {
            expect(lerp(0, 100, 0.25)).toBe(25);
            expect(lerp(0, 100, 0.75)).toBe(75);
        });
        it('should handle negative numbers', () => {
            expect(lerp(-10, 10, 0.5)).toBe(0);
            expect(lerp(-20, -10, 0.5)).toBe(-15);
        });
    });
});
