export const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
export const lerp = (a, b, t) => a + (b - a) * t;
export const generateId = (prefix = 'id') => 
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const DEG2RAD = Math.PI / 180;
export const toHexColor = (numColor) => {
    if (typeof numColor === 'string' && numColor.startsWith('#')) {
        return numColor;
    }
    if (typeof numColor !== 'number' || isNaN(numColor)) {
        return '#ffffff';
    }
    return '#' + Math.floor(numColor).toString(16).padStart(6, '0');
};

export const isObject = (item) => item && typeof item === 'object' && !Array.isArray(item);

export const mergeDeep = (target, ...sources) => {
    sources.forEach((source) => {
        if (source && typeof source === 'object') {
            Object.keys(source).forEach(key => {
                const targetValue = target[key];
                const sourceValue = source[key];
                if (isObject(targetValue) && isObject(sourceValue)) {
                    mergeDeep(targetValue, sourceValue);
                } else {
                    target[key] = sourceValue;
                }
            });
        }
    });
    return target;
};
