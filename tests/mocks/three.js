import { vi } from 'vitest';

export const Vector3 = vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x,
    y,
    z,
    set: vi.fn(function (x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }),
    clone: vi.fn(function () {
        return new Vector3(this.x, this.y, this.z);
    }),
    add: vi.fn(function (v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }),
    sub: vi.fn(function (v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }),
    multiplyScalar: vi.fn(function (s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }),
    length: vi.fn(() => Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)),
    normalize: vi.fn(function () {
        const l = this.length();
        if (l > 0) this.multiplyScalar(1 / l);
        return this;
    }),
    copy: vi.fn(function (v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }),
    lerp: vi.fn(function (v, alpha) {
        this.x += (v.x - this.x) * alpha;
        this.y += (v.y - this.y) * alpha;
        this.z += (v.z - this.z) * alpha;
        return this;
    }),
    equals: vi.fn(function (v) {
        return v.x === this.x && v.y === this.y && v.z === this.z;
    }),
    applyMatrix4: vi.fn(function () {
        return this;
    }), // Mock, does nothing
    project: vi.fn(function () {
        return this;
    }), // Mock, does nothing
}));

export const PerspectiveCamera = vi.fn().mockImplementation(() => ({
    position: new Vector3(),
    lookAt: vi.fn(),
    updateProjectionMatrix: vi.fn(),
    fov: 70,
    aspect: 1,
    near: 0.1,
    far: 1000,
    matrixWorld: { elements: [] },
    getWorldDirection: vi.fn((vec) => vec.set(0, 0, -1)),
}));

export const Scene = vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    children: [],
    background: null,
    fog: null,
}));

export const WebGLRenderer = vi.fn().mockImplementation(() => ({
    domElement: document.createElement('canvas'),
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    info: {
        render: {
            calls: 0,
            triangles: 0,
        },
        memory: {
            geometries: 0,
            textures: 0,
        },
    },
}));

export const CSS3DRenderer = vi.fn().mockImplementation(() => ({
    domElement: document.createElement('div'),
    setSize: vi.fn(),
    render: vi.fn(),
}));

export const Raycaster = vi.fn().mockImplementation(() => ({
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn(() => []),
}));

export const BoxGeometry = vi.fn();
export const SphereGeometry = vi.fn();
export const BufferGeometry = vi.fn().mockImplementation(() => ({
    setAttribute: vi.fn(),
    setIndex: vi.fn(),
    computeBoundingSphere: vi.fn(),
    dispose: vi.fn(),
}));
export const LineBasicMaterial = vi.fn().mockImplementation(() => ({
    color: { set: vi.fn() },
    opacity: 1,
    transparent: false,
    dispose: vi.fn(),
}));
export const MeshBasicMaterial = vi.fn().mockImplementation(() => ({
    color: { set: vi.fn() },
    wireframe: false,
    opacity: 1,
    transparent: false,
    dispose: vi.fn(),
}));
export const MeshLambertMaterial = vi.fn().mockImplementation(() => ({
    color: { set: vi.fn() },
    emissive: { set: vi.fn() },
    wireframe: false,
    opacity: 1,
    transparent: false,
    dispose: vi.fn(),
}));
export const Mesh = vi.fn().mockImplementation(() => ({
    position: new Vector3(),
    rotation: new Vector3(), // Euler, actually
    scale: new Vector3(1, 1, 1),
    geometry: { dispose: vi.fn() },
    material: { dispose: vi.fn() },
    userData: {},
    add: vi.fn(),
    remove: vi.fn(),
    traverse: vi.fn(),
    visible: true,
}));

export const Line = vi.fn().mockImplementation(() => ({
    position: new Vector3(),
    geometry: { dispose: vi.fn(), setFromPoints: vi.fn() },
    material: { dispose: vi.fn(), color: { set: vi.fn() } },
    userData: {},
    visible: true,
}));

export const Group = vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    children: [],
    position: new Vector3(),
    rotation: new Vector3(),
    scale: new Vector3(1, 1, 1),
    visible: true,
}));

export const CSS3DObject = vi.fn().mockImplementation((element) => ({
    element,
    position: new Vector3(),
    rotation: new Vector3(),
    scale: new Vector3(1, 1, 1),
    userData: {},
    add: vi.fn(),
    remove: vi.fn(),
}));

export const Matrix4 = vi.fn().mockImplementation(() => ({
    elements: [],
    multiplyMatrices: vi.fn(),
    getInverse: vi.fn ? vi.fn() : vi.fn((m) => m), // Support older versions of three.js
}));

export const Euler = vi.fn().mockImplementation(() => ({
    x: 0,
    y: 0,
    z: 0,
    set: vi.fn(),
}));

export const Color = vi.fn().mockImplementation((r, g, b) => ({
    r,
    g,
    b,
    set: vi.fn(),
    getHexString: vi.fn(() => '000000'),
}));

export const Fog = vi.fn();
export const AmbientLight = vi.fn();
export const DirectionalLight = vi.fn();
export const PointsMaterial = vi.fn();
export const Points = vi.fn();
export const TextureLoader = vi.fn().mockImplementation(() => ({
    load: vi.fn(),
}));
export const SpriteMaterial = vi.fn();
export const Sprite = vi.fn();

// Add any other THREE exports your main code might use
// For example, constants:
export const FrontSide = 0;
export const DoubleSide = 2;
export const AdditiveBlending = 1;
// ... and so on
