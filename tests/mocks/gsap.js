import { vi } from 'vitest';

const mockTween = {
  kill: vi.fn(),
  then: vi.fn(cb => Promise.resolve(cb())), // For promise-like behavior
  duration: vi.fn(() => 0),
  pause: vi.fn(),
  paused: vi.fn(() => false),
  play: vi.fn(),
  progress: vi.fn(() => 0).mockImplementation(function(value) { if(value === undefined) return 0; return this; }),
  resume: vi.fn(),
  reverse: vi.fn(),
  reversed: vi.fn(() => false),
  seek: vi.fn(),
  time: vi.fn(() => 0),
  timeScale: vi.fn(() => 1),
};

const gsapMock = {
  to: vi.fn((targets, vars) => {
    // If duration is 0, apply end state immediately for testing synchronous changes
    if (vars.duration === 0) {
      Object.keys(vars).forEach(key => {
        if (typeof targets[key] === 'function') {
          // Allow mocking functions like set on Vector3
          if(vars[key] && typeof vars[key] === 'object'){
             targets[key](...Object.values(vars[key]));
          } else {
             targets[key](vars[key]);
          }
        } else if (targets[key] !== undefined) {
          if (typeof vars[key] === 'object' && vars[key] !== null && targets[key] && typeof targets[key].set === 'function') {
            // Handle objects with a 'set' method, e.g., THREE.Vector3
             targets[key].set(...Object.values(vars[key]));
          } else if (typeof vars[key] === 'object' && vars[key] !== null && targets[key] && typeof targets[key].copy === 'function') {
            // Handle objects with a 'copy' method
            targets[key].copy(vars[key]);
          }
          else if (typeof targets[key] === 'object' && targets[key] !== null) {
             Object.assign(targets[key], vars[key]);
          }
          else {
            targets[key] = vars[key];
          }
        }
      });
    }
    if (vars.onComplete) {
      vars.onComplete.apply(vars.onCompleteScope || null, vars.onCompleteParams || []);
    }
    return mockTween;
  }),
  set: vi.fn((targets, vars) => {
     Object.keys(vars).forEach(key => {
        if (typeof targets[key] === 'function') {
            if(vars[key] && typeof vars[key] === 'object'){
                targets[key](...Object.values(vars[key]));
            } else {
                targets[key](vars[key]);
            }
        } else if (targets[key] !== undefined) {
          if (typeof vars[key] === 'object' && vars[key] !== null && targets[key] && typeof targets[key].set === 'function') {
             targets[key].set(...Object.values(vars[key]));
          } else if (typeof vars[key] === 'object' && vars[key] !== null && targets[key] && typeof targets[key].copy === 'function') {
            targets[key].copy(vars[key]);
          } else if (typeof targets[key] === 'object' && targets[key] !== null) {
             Object.assign(targets[key], vars[key]);
          } else {
            targets[key] = vars[key];
          }
        }
      });
    return mockTween;
  }),
  timeline: vi.fn(() => ({
    ...mockTween, // Spread basic tween methods
    to: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    fromTo: vi.fn().mockReturnThis(),
    add: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    seek: vi.fn().mockReturnThis(),
    kill: vi.fn().mockReturnThis(),
  })),
  killTweensOf: vi.fn(),
  getProperty: vi.fn(),
  utils: {
    checkPrefix: vi.fn(),
    clamp: vi.fn((min, max, value) => Math.max(min, Math.min(max, value))),
    distribute: vi.fn(),
    getUnit: vi.fn(),
    interpolate: vi.fn(),
    mapRange: vi.fn(),
    normalize: vi.fn(),
    pipe: vi.fn(),
    random: vi.fn(),
    snap: vi.fn(),
    splitColor: vi.fn(),
    toArray: vi.fn(value => Array.isArray(value) ? value : [value]),
    unitize: vi.fn(),
    wrap: vi.fn(),
    wrapYoyo: vi.fn()
  },
  // Add other GSAP properties/methods if your code uses them
  // e.g. Power1, Expo, etc. if you use eases directly like gsap.Power1.easeIn
  Power0: { easeNone: vi.fn(t => t) },
  Power1: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Power2: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Power3: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Power4: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Linear: { easeNone: vi.fn(t => t) },
  Quad: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Cubic: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Quart: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Quint: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Strong: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Expo: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Sine: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Circ: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Elastic: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Back: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  Bounce: { easeIn: vi.fn(), easeOut: vi.fn(), easeInOut: vi.fn() },
  SteppedEase: { config: vi.fn() },
  config: vi.fn(),
  registerPlugin: vi.fn(),
  effects: {},
};

export { gsapMock as gsap };
export default gsapMock;
