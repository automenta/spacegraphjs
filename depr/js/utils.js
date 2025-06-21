export const $ = (selector, context = document) => context.querySelector(selector);
export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
export const lerp = (a, b, t) => a + (b - a) * t;
export const generateId = (prefix = 'id') =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const DEG2RAD = Math.PI / 180;
