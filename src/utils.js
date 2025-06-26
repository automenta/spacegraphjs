export const $ = (selector, context) => (context || document).querySelector(selector);
export const $$ = (selector, context) => (context || document).querySelectorAll(selector);

export const Utils = {
    clamp: (v, min, max) => Math.max(min, Math.min(v, max)),
    lerp: (a, b, t) => a + (b - a) * t,
    generateId: (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    DEG2RAD: Math.PI / 180,
    isObject: (item) => item && typeof item === 'object' && !Array.isArray(item),
    mergeDeep: (target, ...sources) => {
        sources.forEach((source) => {
            for (const key in source) {
                const targetValue = target[key];
                const sourceValue = source[key];
                if (Utils.isObject(targetValue) && Utils.isObject(sourceValue)) {
                    Utils.mergeDeep(targetValue, sourceValue);
                } else {
                    target[key] = sourceValue;
                }
            }
        });
        return target;
    },
    toHexColor: (numColor) => {
        if (typeof numColor === 'string' && numColor.startsWith('#')) {
            return numColor; // Already a hex string
        }
        if (typeof numColor !== 'number' || isNaN(numColor)) {
            return '#ffffff'; // Default to white for invalid input
        }
        const hex = Math.floor(numColor).toString(16).padStart(6, '0');
        return `#${hex}`;
    },
};
