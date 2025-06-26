import {Edge} from './Edge.js';
import {Utils} from '../../utils.js';
import * as THREE from 'three';

export class DynamicThicknessEdge extends Edge {
    static typeName = 'dynamicThickness';
    static MIN_THICKNESS = 1;
    static MAX_THICKNESS = 10;

    constructor(id, sourceNode, targetNode, data = {}) {
        const dynamicData = Utils.mergeDeep({
            // Default base thickness if not driven by value
            thickness: data.thickness ?? 3,
            // Property in 'data' that drives thickness, e.g., data: { value: 5 }
            thicknessDataKey: data.thicknessDataKey ?? 'value',
            // Range for mapping the data value to thickness
            thicknessRange: data.thicknessRange ?? { min: 0, max: 100 }, // Expected input data range
            // Actual visual thickness range
            visualThicknessRange: data.visualThicknessRange ?? { min: DynamicThicknessEdge.MIN_THICKNESS, max: DynamicThicknessEdge.MAX_THICKNESS },
        }, data);

        super(id, sourceNode, targetNode, dynamicData);
        this.updateThicknessFromData();
    }

    update() {
        this.updateThicknessFromData(); // Ensure thickness is updated before regular update
        super.update();
    }

    updateThicknessFromData() {
        if (!this.line || !this.line.material) return;

        const value = this.data[this.data.thicknessDataKey] ?? null;

        if (typeof value === 'number' && isFinite(value)) {
            const { thicknessRange, visualThicknessRange } = this.data;

            // Normalize value from data range to 0-1
            let normalizedValue = 0;
            if (thicknessRange.max > thicknessRange.min) {
                 normalizedValue = (value - thicknessRange.min) / (thicknessRange.max - thicknessRange.min);
            } else if (thicknessRange.max === thicknessRange.min && value >= thicknessRange.min) {
                normalizedValue = 1; // if data value matches the single point in range
            }

            normalizedValue = Utils.clamp(normalizedValue, 0, 1); // Clamp to 0-1

            // Lerp to visual thickness
            const newThickness = THREE.MathUtils.lerp(
                visualThicknessRange.min,
                visualThicknessRange.max,
                normalizedValue
            );
            this.line.material.linewidth = Math.max(0.1, newThickness); // Ensure linewidth is positive
        } else {
            // Fallback to default thickness if value is not valid
            this.line.material.linewidth = this.data.thickness;
        }
        this.line.material.needsUpdate = true;
    }

    // Optionally, provide a method to update the value and refresh thickness
    setValue(newValue) {
        this.data[this.data.thicknessDataKey] = newValue;
        this.updateThicknessFromData();
        // Could also trigger a general update if needed, e.g., for instanced rendering manager
        this.space?.emit('edge:updated', { edge: this, property: 'data', value: this.data });
    }
}
