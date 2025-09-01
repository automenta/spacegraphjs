// Simplified utility functions
export const $ = (selector, context) =>
  (context || document).querySelector(selector);
export const $$ = (selector, context) =>
  (context || document).querySelectorAll(selector);

export const Utils = {
  clamp: (v, min, max) => Math.max(min, Math.min(v, max)),
  lerp: (a, b, t) => a + (b - a) * t,
  generateId: (prefix = "id") =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
  DEG2RAD: Math.PI / 180,
  isObject: (item) => item && typeof item === "object" && !Array.isArray(item),
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
    if (typeof numColor === "string" && numColor.startsWith("#")) {
      return numColor; // Already a hex string
    }
    if (typeof numColor !== "number" || isNaN(numColor)) {
      return "#ffffff"; // Default to white for invalid input
    }
    const hex = Math.floor(numColor).toString(16).padStart(6, "0");
    return `#${hex}`;
  },

  // New consolidated utility functions
  /**
   * Throttles a function to limit its execution rate
   * @param {Function} func - The function to throttle
   * @param {number} delay - The delay in milliseconds
   * @returns {Function} The throttled function
   */
  throttle: (func, delay) => {
    let timeoutId;
    let lastExecTime = 0;
    return function (...args) {
      const currentTime = Date.now();
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(
          () => {
            func.apply(this, args);
            lastExecTime = Date.now();
          },
          delay - (currentTime - lastExecTime),
        );
      }
    };
  },

  /**
   * Debounces a function to delay its execution
   * @param {Function} func - The function to debounce
   * @param {number} delay - The delay in milliseconds
   * @returns {Function} The debounced function
   */
  debounce: (func, delay) => {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },

  /**
   * Deep clones an object or array
   * @param {*} obj - The object to clone
   * @returns {*} The cloned object
   */
  deepClone: (obj) => {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map((item) => Utils.deepClone(item));
    if (obj instanceof Object) {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = Utils.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  },

  /**
   * Checks if a value is empty (null, undefined, empty string, empty array, or empty object)
   * @param {*} value - The value to check
   * @returns {boolean} True if the value is empty
   */
  isEmpty: (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === "string" || Array.isArray(value))
      return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
  },

  /**
   * Gets a nested property from an object using a path string
   * @param {Object} obj - The object to get the property from
   * @param {string} path - The path to the property (e.g., 'a.b.c')
   * @param {*} defaultValue - The default value to return if the property is not found
   * @returns {*} The property value or default value
   */
  get: (obj, path, defaultValue = undefined) => {
    const keys = path.split(".");
    let result = obj;
    for (const key of keys) {
      if (
        result === null ||
        result === undefined ||
        typeof result !== "object"
      ) {
        return defaultValue;
      }
      result = result[key];
    }
    return result !== undefined ? result : defaultValue;
  },

  /**
   * Sets a nested property on an object using a path string
   * @param {Object} obj - The object to set the property on
   * @param {string} path - The path to the property (e.g., 'a.b.c')
   * @param {*} value - The value to set
   * @returns {Object} The modified object
   */
  set: (obj, path, value) => {
    const keys = path.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return obj;
  },
};
