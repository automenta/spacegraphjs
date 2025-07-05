var Ps = Object.defineProperty;
var ks = (m, t, e) => t in m ? Ps(m, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : m[t] = e;
var g = (m, t, e) => ks(m, typeof t != "symbol" ? t + "" : t, e);
import * as u from "three";
import { Matrix4 as de, Vector3 as R, Quaternion as Et, Object3D as _t, TrianglesDrawMode as Ts, TriangleFanDrawMode as ht, TriangleStripDrawMode as gs, Loader as ps, LoaderUtils as Se, FileLoader as Lt, MeshPhysicalMaterial as J, Vector2 as Pt, Color as he, LinearSRGBColorSpace as te, SRGBColorSpace as _e, SpotLight as Ns, PointLight as Ds, DirectionalLight as zs, InstancedMesh as Rs, InstancedBufferAttribute as Os, TextureLoader as Gs, ImageBitmapLoader as Fs, BufferAttribute as Qe, InterleavedBuffer as Bs, InterleavedBufferAttribute as le, LinearMipmapLinearFilter as ms, NearestMipmapLinearFilter as Vs, LinearMipmapNearestFilter as Zs, NearestMipmapNearestFilter as Hs, LinearFilter as ut, NearestFilter as fs, RepeatWrapping as gt, MirroredRepeatWrapping as js, ClampToEdgeWrapping as Ws, PointsMaterial as Us, Material as et, LineBasicMaterial as Ks, MeshStandardMaterial as ys, DoubleSide as $s, MeshBasicMaterial as Ae, PropertyBinding as Xs, BufferGeometry as Ys, SkinnedMesh as qs, Mesh as bs, LineSegments as Js, Line as Qs, LineLoop as ei, Points as ti, Group as tt, PerspectiveCamera as si, MathUtils as Cs, OrthographicCamera as ii, Skeleton as ni, AnimationClip as oi, Bone as ai, InterpolateDiscrete as ri, InterpolateLinear as vs, Texture as Dt, VectorKeyframeTrack as zt, NumberKeyframeTrack as Rt, QuaternionKeyframeTrack as Ot, ColorManagement as Gt, FrontSide as li, Interpolant as ci, Box3 as qe, Sphere as kt, InstancedBufferGeometry as di, Float32BufferAttribute as Ft, InstancedInterleavedBuffer as pt, WireframeGeometry as hi, ShaderMaterial as ui, ShaderLib as Ze, UniformsUtils as ws, UniformsLib as He, Vector4 as Re, Line3 as gi, Controls as pi, Euler as mi, ShapePath as fi, ExtrudeGeometry as yi } from "three";
import { KernelSize as Bt, BlendFunction as Vt, EffectComposer as bi, RenderPass as Ci, NormalPass as vi, SSAOEffect as wi, EffectPass as st, Selection as Ii, OutlineEffect as Mi, BloomEffect as xi } from "postprocessing";
import { gsap as z } from "gsap";
const M = (m, t) => (t || document).querySelector(m), Zt = (m, t) => (t || document).querySelectorAll(m), T = {
  clamp: (m, t, e) => Math.max(t, Math.min(m, e)),
  lerp: (m, t, e) => m + (t - m) * e,
  generateId: (m = "id") => `${m}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
  DEG2RAD: Math.PI / 180,
  isObject: (m) => m && typeof m == "object" && !Array.isArray(m),
  mergeDeep: (m, ...t) => (t.forEach((e) => {
    for (const s in e) {
      const i = m[s], n = e[s];
      T.isObject(i) && T.isObject(n) ? T.mergeDeep(i, n) : m[s] = n;
    }
  }), m),
  toHexColor: (m) => typeof m == "string" && m.startsWith("#") ? m : typeof m != "number" || isNaN(m) ? "#ffffff" : `#${Math.floor(m).toString(16).padStart(6, "0")}`
};
class Is {
  constructor() {
    this.types = /* @__PURE__ */ new Map();
  }
  /**
   * Registers a new type with the factory.
   * @param {string} typeName - The unique name for the type.
   * @param {class} typeClass - The class constructor for the type.
   */
  registerType(t, e) {
    if (!t) {
      console.warn(`${this.constructor.name}: Attempted to register a class without a typeName.`, e);
      return;
    }
    this.types.has(t), this.types.set(t, e);
  }
  /**
   * Creates a new instance of a registered type.
   * @param {string} type - The typeName of the class to create.
   * @param {Array<any>} args - Arguments to pass to the class constructor.
   * @param {string} [defaultType] - The typeName to use if the requested type is not found.
   * @returns {object|null} The created instance, or null if the type is not found.
   */
  create(t, e, s = null) {
    const i = this.types.get(t) || (s ? this.types.get(s) : null);
    return i ? new i(...e) : (console.warn(`${this.constructor.name}: Type "${t}" not found and no default type available.`), null);
  }
}
const Ht = new R(), Ai = new Et(), jt = new R();
class Ie extends _t {
  /**
   * Constructs a new CSS3D object.
   *
   * @param {DOMElement} [element] - The DOM element.
   */
  constructor(t = document.createElement("div")) {
    super(), this.isCSS3DObject = !0, this.element = t, this.element.style.position = "absolute", this.element.style.pointerEvents = "auto", this.element.style.userSelect = "none", this.element.setAttribute("draggable", !1), this.addEventListener("removed", function() {
      this.traverse(function(e) {
        e.element instanceof e.element.ownerDocument.defaultView.Element && e.element.parentNode !== null && e.element.remove();
      });
    });
  }
  copy(t, e) {
    return super.copy(t, e), this.element = t.element.cloneNode(!0), this;
  }
}
const K = new de(), Si = new de();
class Ei {
  /**
   * Constructs a new CSS3D renderer.
   *
   * @param {CSS3DRenderer~Parameters} [parameters] - The parameters.
   */
  constructor(t = {}) {
    const e = this;
    let s, i, n, o;
    const a = {
      camera: { style: "" },
      objects: /* @__PURE__ */ new WeakMap()
    }, r = t.element !== void 0 ? t.element : document.createElement("div");
    r.style.overflow = "hidden", this.domElement = r;
    const l = document.createElement("div");
    l.style.transformOrigin = "0 0", l.style.pointerEvents = "none", r.appendChild(l);
    const c = document.createElement("div");
    c.style.transformStyle = "preserve-3d", l.appendChild(c), this.getSize = function() {
      return {
        width: s,
        height: i
      };
    }, this.render = function(b, y) {
      const w = y.projectionMatrix.elements[5] * o;
      y.view && y.view.enabled ? (l.style.transform = `translate( ${-y.view.offsetX * (s / y.view.width)}px, ${-y.view.offsetY * (i / y.view.height)}px )`, l.style.transform += `scale( ${y.view.fullWidth / y.view.width}, ${y.view.fullHeight / y.view.height} )`) : l.style.transform = "", b.matrixWorldAutoUpdate === !0 && b.updateMatrixWorld(), y.parent === null && y.matrixWorldAutoUpdate === !0 && y.updateMatrixWorld();
      let v, I;
      y.isOrthographicCamera && (v = -(y.right + y.left) / 2, I = (y.top + y.bottom) / 2);
      const x = y.view && y.view.enabled ? y.view.height / y.view.fullHeight : 1, A = y.isOrthographicCamera ? `scale( ${x} )scale(` + w + ")translate(" + d(v) + "px," + d(I) + "px)" + h(y.matrixWorldInverse) : `scale( ${x} )translateZ(` + w + "px)" + h(y.matrixWorldInverse), N = (y.isPerspectiveCamera ? "perspective(" + w + "px) " : "") + A + "translate(" + n + "px," + o + "px)";
      a.camera.style !== N && (c.style.transform = N, a.camera.style = N), C(b, b, y);
    }, this.setSize = function(b, y) {
      s = b, i = y, n = s / 2, o = i / 2, r.style.width = b + "px", r.style.height = y + "px", l.style.width = b + "px", l.style.height = y + "px", c.style.width = b + "px", c.style.height = y + "px";
    };
    function d(b) {
      return Math.abs(b) < 1e-10 ? 0 : b;
    }
    function h(b) {
      const y = b.elements;
      return "matrix3d(" + d(y[0]) + "," + d(-y[1]) + "," + d(y[2]) + "," + d(y[3]) + "," + d(y[4]) + "," + d(-y[5]) + "," + d(y[6]) + "," + d(y[7]) + "," + d(y[8]) + "," + d(-y[9]) + "," + d(y[10]) + "," + d(y[11]) + "," + d(y[12]) + "," + d(-y[13]) + "," + d(y[14]) + "," + d(y[15]) + ")";
    }
    function p(b) {
      const y = b.elements;
      return "translate(-50%,-50%)" + ("matrix3d(" + d(y[0]) + "," + d(y[1]) + "," + d(y[2]) + "," + d(y[3]) + "," + d(-y[4]) + "," + d(-y[5]) + "," + d(-y[6]) + "," + d(-y[7]) + "," + d(y[8]) + "," + d(y[9]) + "," + d(y[10]) + "," + d(y[11]) + "," + d(y[12]) + "," + d(y[13]) + "," + d(y[14]) + "," + d(y[15]) + ")");
    }
    function f(b) {
      b.isCSS3DObject && (b.element.style.display = "none");
      for (let y = 0, w = b.children.length; y < w; y++)
        f(b.children[y]);
    }
    function C(b, y, w, v) {
      if (b.visible === !1) {
        f(b);
        return;
      }
      if (b.isCSS3DObject) {
        const I = b.layers.test(w.layers) === !0, x = b.element;
        if (x.style.display = I === !0 ? "" : "none", I === !0) {
          b.onBeforeRender(e, y, w);
          let A;
          b.isCSS3DSprite ? (K.copy(w.matrixWorldInverse), K.transpose(), b.rotation2D !== 0 && K.multiply(Si.makeRotationZ(b.rotation2D)), b.matrixWorld.decompose(Ht, Ai, jt), K.setPosition(Ht), K.scale(jt), K.elements[3] = 0, K.elements[7] = 0, K.elements[11] = 0, K.elements[15] = 1, A = p(K)) : A = p(b.matrixWorld);
          const E = a.objects.get(b);
          if (E === void 0 || E.style !== A) {
            x.style.transform = A;
            const N = { style: A };
            a.objects.set(b, N);
          }
          x.parentNode !== c && c.appendChild(x), b.onAfterRender(e, y, w);
        }
      }
      for (let I = 0, x = b.children.length; I < x; I++)
        C(b.children[I], y, w);
    }
  }
}
class ie {
  constructor(t, e = { x: 0, y: 0, z: 0 }, s = {}, i = 1) {
    g(this, "space", null);
    g(this, "position", new u.Vector3());
    g(this, "data", {});
    g(this, "mass", 1);
    g(this, "id", null);
    g(this, "mesh", null);
    g(this, "cssObject", null);
    g(this, "labelObject", null);
    g(this, "isPinned", !1);
    this.id = t ?? T.generateId("node"), this.setPosition(e), this.data = T.mergeDeep({}, this.getDefaultData(), s), this.mass = Math.max(0.1, i), this.isPinned = this.data.isPinned ?? !1;
  }
  getDefaultData() {
    return { label: "" };
  }
  update(t) {
  }
  dispose() {
    var t, e, s, i, n, o, a, r, l, c, d, h, p, f;
    (e = (t = this.mesh) == null ? void 0 : t.geometry) == null || e.dispose(), (i = (s = this.mesh) == null ? void 0 : s.material) == null || i.dispose(), (o = (n = this.mesh) == null ? void 0 : n.parent) == null || o.remove(this.mesh), (r = (a = this.cssObject) == null ? void 0 : a.element) == null || r.remove(), (c = (l = this.cssObject) == null ? void 0 : l.parent) == null || c.remove(this.cssObject), (h = (d = this.labelObject) == null ? void 0 : d.element) == null || h.remove(), (f = (p = this.labelObject) == null ? void 0 : p.parent) == null || f.remove(this.labelObject), this.space = null, this.mesh = null, this.cssObject = null, this.labelObject = null;
  }
  getBoundingSphereRadius() {
    return 50;
  }
  setSelectedStyle(t) {
  }
  setPosition(t, e, s) {
    const { x: i, _y: n, _z: o } = typeof t == "object" && t !== null ? t : { x: t, _y: e, _z: s }, a = n ?? 0, r = o ?? 0;
    if (!isFinite(i) || !isFinite(a) || !isFinite(r)) {
      console.warn(`BaseNode.setPosition: Attempted to set invalid position for node ${this.id}:`, { x: i, y: a, z: r });
      return;
    }
    this.position.set(i, a, r);
  }
  startDrag() {
    var t;
    (t = this.space) == null || t.emit("graph:node:dragstart", { node: this });
  }
  drag(t) {
    this.setPosition(t.x, t.y, t.z);
  }
  endDrag() {
    var t;
    (t = this.space) == null || t.emit("graph:node:dragend", { node: this });
  }
}
function _i(m, t, e, s = {}) {
  const i = document.createElement("div");
  return i.className = `${e} node-common`, i.textContent = m, i.dataset.id = t, Object.assign(i.style, {
    pointerEvents: "none",
    textAlign: "center",
    whiteSpace: "nowrap",
    backdropFilter: "blur(4px)",
    border: "1px solid var(--sg-accent-secondary)",
    ...s
  }), i;
}
function Oe(m, t, e, s, i) {
  const n = _i(m, t, e, s), o = new Ie(n);
  return o.userData = { id: t, type: i }, o;
}
function Me(m, t, e, s = 1) {
  var r, l, c;
  if (!(m != null && m.element) || !(t != null && t.length)) {
    if (m != null && m.element && (m.element.style.visibility = "", m.element.classList.contains("node-html"))) {
      const d = m.element.querySelector(".node-content");
      d && (d.style.transform = `scale(${s})`);
    }
    return;
  }
  const i = (l = (r = e == null ? void 0 : e.plugins) == null ? void 0 : r.getPlugin("CameraPlugin")) == null ? void 0 : l.getCameraInstance();
  if (!i) return;
  const n = m.position.distanceTo(i.position), o = [...t].sort((d, h) => (h.distance || 0) - (d.distance || 0));
  let a = !1;
  for (const d of o)
    if (n >= (d.distance || 0)) {
      if (m.element.style.visibility = (c = d.style) != null && c.includes("visibility:hidden") ? "hidden" : "", m.element.classList.contains("node-html")) {
        const h = m.element.querySelector(".node-content");
        h && (h.style.transform = `scale(${s * (d.scale ?? 1)})`);
      }
      a = !0;
      break;
    }
  if (!a && (m.element.style.visibility = "", m.element.classList.contains("node-html"))) {
    const d = m.element.querySelector(".node-content");
    d && (d.style.transform = `scale(${s})`);
  }
}
const ee = class ee extends ie {
  constructor(e, s, i = {}, n = 1) {
    super(e, s, i, n);
    g(this, "htmlElement", null);
    g(this, "size", { width: 160, height: 70 });
    g(this, "billboard", !1);
    g(this, "adjustContentScale", (e) => this.setContentScale(this.data.contentScale * e));
    g(this, "adjustNodeSize", (e) => this.setSize(this.size.width * e, this.size.height * e, !1));
    const o = this.data.width ?? 160, a = this.data.height ?? 70;
    this.size = { width: o, height: a }, this.htmlElement = this._createElement(), this.cssObject = new Ie(this.htmlElement), this.cssObject.userData = { nodeId: this.id, type: "html-node" }, this.update(), this.setContentScale(this.data.contentScale ?? 1), this.setBackgroundColor(this.data.backgroundColor ?? "#333344");
  }
  getDefaultData() {
    return {
      label: "",
      content: "",
      width: 160,
      height: 70,
      contentScale: 1,
      backgroundColor: "#333344",
      type: "html",
      editable: !1,
      labelLod: []
    };
  }
  _createElement() {
    const e = document.createElement("div");
    return e.className = "node-html node-common", e.id = `node-html-${this.id}`, e.dataset.nodeId = this.id, e.style.width = `${this.size.width}px`, e.style.height = `${this.size.height}px`, e.draggable = !1, e.ondragstart = (s) => s.preventDefault(), e.innerHTML = `
            <div class="node-inner-wrapper">
                <div class="node-content" spellcheck="false" style="transform: scale(${this.data.contentScale});">
                    ${this.data.content || this.data.label || ""}
                </div>
                <div class="node-controls">
                    <button class="node-quick-button node-content-zoom-in" title="Zoom In Content (+)">➕</button>
                    <button class="node-quick-button node-content-zoom-out" title="Zoom Out Content (-)">➖</button>
                    <button class="node-quick-button node-grow" title="Grow Node (Ctrl++)">↗️</button>
                    <button class="node-quick-button node-shrink" title="Shrink Node (Ctrl+-)">↙️</button>
                    <button class="node-quick-button delete-button node-delete" title="Delete Node (Del)">🗑️</button>
                </div>
            </div>
            <div class="resize-handle" title="Resize Node"></div>
        `, this._initContentEditable(e), e;
  }
  _initContentEditable(e) {
    const s = M(".node-content", e);
    if (s && this.data.editable) {
      s.contentEditable = "true";
      let i;
      s.addEventListener("input", () => {
        clearTimeout(i), i = setTimeout(() => {
          var n;
          this.data.content = s.innerHTML, (n = this.space) == null || n.emit("graph:node:dataChanged", { node: this, property: "content", value: this.data.content });
        }, 300);
      }), s.addEventListener("pointerdown", (n) => n.stopPropagation()), s.addEventListener("touchstart", (n) => n.stopPropagation(), { passive: !0 }), s.addEventListener(
        "wheel",
        (n) => {
          const o = s.scrollHeight > s.clientHeight || s.scrollWidth > s.clientWidth, a = n.deltaY < 0 && s.scrollTop > 0 || n.deltaY > 0 && s.scrollTop < s.scrollHeight - s.clientHeight, r = n.deltaX < 0 && s.scrollLeft > 0 || n.deltaX > 0 && s.scrollLeft < s.scrollWidth - s.clientWidth;
          o && (a || r) && n.stopPropagation();
        },
        { passive: !1 }
      );
    }
  }
  setSize(e, s, i = !1) {
    const n = { ...this.size }, o = n.width * n.height;
    if (this.size.width = Math.max(ee.MIN_SIZE.width, e), this.size.height = Math.max(ee.MIN_SIZE.height, s), this.htmlElement && (this.htmlElement.style.width = `${this.size.width}px`, this.htmlElement.style.height = `${this.size.height}px`), i && o > 0) {
      const a = Math.sqrt(this.size.width * this.size.height / o);
      this.setContentScale(this.data.contentScale * a);
    }
  }
  setContentScale(e) {
    var i;
    this.data.contentScale = T.clamp(e, ee.CONTENT_SCALE_RANGE.min, ee.CONTENT_SCALE_RANGE.max);
    const s = M(".node-content", this.htmlElement);
    s && (s.style.transform = `scale(${this.data.contentScale})`), (i = this.space) == null || i.emit("graph:node:dataChanged", { node: this, property: "contentScale", value: this.data.contentScale });
  }
  setBackgroundColor(e) {
    var s, i;
    this.data.backgroundColor = e, (s = this.htmlElement) == null || s.style.setProperty("--node-bg", this.data.backgroundColor), (i = this.space) == null || i.emit("graph:node:dataChanged", { node: this, property: "backgroundColor", value: this.data.backgroundColor });
  }
  update(e) {
    this.cssObject && (this.cssObject.position.copy(this.position), this.billboard && (e != null && e._cam) && this.cssObject.quaternion.copy(e._cam.quaternion), Me(this.cssObject, this.data.labelLod, e, this.data.contentScale ?? 1));
  }
  getBoundingSphereRadius() {
    return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2;
  }
  setSelectedStyle(e) {
    var s;
    (s = this.htmlElement) == null || s.classList.toggle("selected", e);
  }
  startResize() {
    var e, s, i, n, o, a;
    (e = this.htmlElement) == null || e.classList.add("resizing"), (o = (n = (i = (s = this.space) == null ? void 0 : s.plugins.getPlugin("LayoutPlugin")) == null ? void 0 : i.layoutManager) == null ? void 0 : n.getActiveLayout()) == null || o.fixNode(this), (a = this.space) == null || a.emit("graph:node:resizestart", { node: this });
  }
  resize(e, s) {
    this.setSize(e, s);
  }
  endResize() {
    var e, s, i, n, o, a, r;
    (e = this.htmlElement) == null || e.classList.remove("resizing");
    try {
      (a = (o = (n = (i = (s = this.space) == null ? void 0 : s.plugins) == null ? void 0 : i.getPlugin("LayoutPlugin")) == null ? void 0 : n.layoutManager) == null ? void 0 : o.getActiveLayout()) == null || a.releaseNode(this);
    } catch (l) {
      console.error("Error releasing node during resize:", l);
    }
    (r = this.space) == null || r.emit("graph:node:resizeend", { node: this, finalSize: { ...this.size } });
  }
};
g(ee, "typeName", "html"), g(ee, "MIN_SIZE", { width: 80, height: 40 }), g(ee, "CONTENT_SCALE_RANGE", { min: 0.3, max: 3 });
let L = ee;
class U {
  constructor(t, e) {
    g(this, "space", null);
    g(this, "pluginManager", null);
    this.space = t, this.pluginManager = e;
  }
  init() {
  }
  update() {
  }
  dispose() {
    this.space = null, this.pluginManager = null;
  }
  getName() {
    return this.constructor.name;
  }
}
class Li {
  // This map stores the plugin instances
  constructor(t) {
    g(this, "space", null);
    g(this, "plugins", /* @__PURE__ */ new Map());
    this.space = t;
  }
  /**
   * Adds a plugin to the manager.
   * @param {Plugin} plugin The plugin instance to add.
   */
  add(t) {
    if (!(t instanceof U)) {
      console.warn("PluginManager: Attempted to add a non-Plugin object.");
      return;
    }
    this.plugins.has(t.getName()) && console.warn(`PluginManager: Plugin "${t.getName()}" already registered. Overwriting.`), this.plugins.set(t.getName(), t);
  }
  /**
   * Retrieves a plugin by its name.
   * @param {string} name The name of the plugin.
   * @returns {Plugin|undefined} The plugin instance, or undefined if not found.
   */
  getPlugin(t) {
    return this.plugins.get(t);
  }
  /**
   * Retrieves all registered plugins as an array.
   * @returns {Plugin[]} An array of all plugin instances.
   */
  getAllPlugins() {
    return Array.from(this.plugins.values());
  }
  /**
   * Initializes all registered plugins by calling their init() method.
   * Plugins are initialized in the order they were added.
   */
  async initPlugins() {
    var t;
    for (const e of this.plugins.values())
      await ((t = e.init) == null ? void 0 : t.call(e));
  }
  /**
   * Updates all registered plugins by calling their update() method.
   * This is typically called once per animation frame.
   */
  updatePlugins() {
    var t;
    for (const e of this.plugins.values())
      (t = e.update) == null || t.call(e);
  }
  /**
   * Disposes of all registered plugins by calling their dispose() method
   * and clears the plugin map.
   */
  disposePlugins() {
    var t;
    for (const e of this.plugins.values())
      (t = e.dispose) == null || t.call(e);
    this.plugins.clear();
  }
}
function Wt(m, t) {
  if (t === Ts)
    return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."), m;
  if (t === ht || t === gs) {
    let e = m.getIndex();
    if (e === null) {
      const o = [], a = m.getAttribute("position");
      if (a !== void 0) {
        for (let r = 0; r < a.count; r++)
          o.push(r);
        m.setIndex(o), e = m.getIndex();
      } else
        return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."), m;
    }
    const s = e.count - 2, i = [];
    if (t === ht)
      for (let o = 1; o <= s; o++)
        i.push(e.getX(0)), i.push(e.getX(o)), i.push(e.getX(o + 1));
    else
      for (let o = 0; o < s; o++)
        o % 2 === 0 ? (i.push(e.getX(o)), i.push(e.getX(o + 1)), i.push(e.getX(o + 2))) : (i.push(e.getX(o + 2)), i.push(e.getX(o + 1)), i.push(e.getX(o)));
    i.length / 3 !== s && console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");
    const n = m.clone();
    return n.setIndex(i), n.clearGroups(), n;
  } else
    return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:", t), m;
}
class Ms extends ps {
  /**
   * Constructs a new glTF loader.
   *
   * @param {LoadingManager} [manager] - The loading manager.
   */
  constructor(t) {
    super(t), this.dracoLoader = null, this.ktx2Loader = null, this.meshoptDecoder = null, this.pluginCallbacks = [], this.register(function(e) {
      return new Di(e);
    }), this.register(function(e) {
      return new zi(e);
    }), this.register(function(e) {
      return new ji(e);
    }), this.register(function(e) {
      return new Wi(e);
    }), this.register(function(e) {
      return new Ui(e);
    }), this.register(function(e) {
      return new Oi(e);
    }), this.register(function(e) {
      return new Gi(e);
    }), this.register(function(e) {
      return new Fi(e);
    }), this.register(function(e) {
      return new Bi(e);
    }), this.register(function(e) {
      return new Ni(e);
    }), this.register(function(e) {
      return new Vi(e);
    }), this.register(function(e) {
      return new Ri(e);
    }), this.register(function(e) {
      return new Hi(e);
    }), this.register(function(e) {
      return new Zi(e);
    }), this.register(function(e) {
      return new ki(e);
    }), this.register(function(e) {
      return new Ki(e);
    }), this.register(function(e) {
      return new $i(e);
    });
  }
  /**
   * Starts loading from the given URL and passes the loaded glTF asset
   * to the `onLoad()` callback.
   *
   * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(GLTFLoader~LoadObject)} onLoad - Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
   * @param {onErrorCallback} onError - Executed when errors occur.
   */
  load(t, e, s, i) {
    const n = this;
    let o;
    if (this.resourcePath !== "")
      o = this.resourcePath;
    else if (this.path !== "") {
      const l = Se.extractUrlBase(t);
      o = Se.resolveURL(l, this.path);
    } else
      o = Se.extractUrlBase(t);
    this.manager.itemStart(t);
    const a = function(l) {
      i ? i(l) : console.error(l), n.manager.itemError(t), n.manager.itemEnd(t);
    }, r = new Lt(this.manager);
    r.setPath(this.path), r.setResponseType("arraybuffer"), r.setRequestHeader(this.requestHeader), r.setWithCredentials(this.withCredentials), r.load(t, function(l) {
      try {
        n.parse(l, o, function(c) {
          e(c), n.manager.itemEnd(t);
        }, a);
      } catch (c) {
        a(c);
      }
    }, s, a);
  }
  /**
   * Sets the given Draco loader to this loader. Required for decoding assets
   * compressed with the `KHR_draco_mesh_compression` extension.
   *
   * @param {DRACOLoader} dracoLoader - The Draco loader to set.
   * @return {GLTFLoader} A reference to this loader.
   */
  setDRACOLoader(t) {
    return this.dracoLoader = t, this;
  }
  /**
   * Sets the given KTX2 loader to this loader. Required for loading KTX2
   * compressed textures.
   *
   * @param {KTX2Loader} ktx2Loader - The KTX2 loader to set.
   * @return {GLTFLoader} A reference to this loader.
   */
  setKTX2Loader(t) {
    return this.ktx2Loader = t, this;
  }
  /**
   * Sets the given meshopt decoder. Required for decoding assets
   * compressed with the `EXT_meshopt_compression` extension.
   *
   * @param {Object} meshoptDecoder - The meshopt decoder to set.
   * @return {GLTFLoader} A reference to this loader.
   */
  setMeshoptDecoder(t) {
    return this.meshoptDecoder = t, this;
  }
  /**
   * Registers a plugin callback. This API is internally used to implement the various
   * glTF extensions but can also used by third-party code to add additional logic
   * to the loader.
   *
   * @param {function(parser:GLTFParser)} callback - The callback function to register.
   * @return {GLTFLoader} A reference to this loader.
   */
  register(t) {
    return this.pluginCallbacks.indexOf(t) === -1 && this.pluginCallbacks.push(t), this;
  }
  /**
   * Unregisters a plugin callback.
   *
   * @param {Function} callback - The callback function to unregister.
   * @return {GLTFLoader} A reference to this loader.
   */
  unregister(t) {
    return this.pluginCallbacks.indexOf(t) !== -1 && this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(t), 1), this;
  }
  /**
   * Parses the given FBX data and returns the resulting group.
   *
   * @param {string|ArrayBuffer} data - The raw glTF data.
   * @param {string} path - The URL base path.
   * @param {function(GLTFLoader~LoadObject)} onLoad - Executed when the loading process has been finished.
   * @param {onErrorCallback} onError - Executed when errors occur.
   */
  parse(t, e, s, i) {
    let n;
    const o = {}, a = {}, r = new TextDecoder();
    if (typeof t == "string")
      n = JSON.parse(t);
    else if (t instanceof ArrayBuffer)
      if (r.decode(new Uint8Array(t, 0, 4)) === xs) {
        try {
          o[S.KHR_BINARY_GLTF] = new Xi(t);
        } catch (d) {
          i && i(d);
          return;
        }
        n = JSON.parse(o[S.KHR_BINARY_GLTF].content);
      } else
        n = JSON.parse(r.decode(t));
    else
      n = t;
    if (n.asset === void 0 || n.asset.version[0] < 2) {
      i && i(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));
      return;
    }
    const l = new cn(n, {
      path: e || this.resourcePath || "",
      crossOrigin: this.crossOrigin,
      requestHeader: this.requestHeader,
      manager: this.manager,
      ktx2Loader: this.ktx2Loader,
      meshoptDecoder: this.meshoptDecoder
    });
    l.fileLoader.setRequestHeader(this.requestHeader);
    for (let c = 0; c < this.pluginCallbacks.length; c++) {
      const d = this.pluginCallbacks[c](l);
      d.name || console.error("THREE.GLTFLoader: Invalid plugin found: missing name"), a[d.name] = d, o[d.name] = !0;
    }
    if (n.extensionsUsed)
      for (let c = 0; c < n.extensionsUsed.length; ++c) {
        const d = n.extensionsUsed[c], h = n.extensionsRequired || [];
        switch (d) {
          case S.KHR_MATERIALS_UNLIT:
            o[d] = new Ti();
            break;
          case S.KHR_DRACO_MESH_COMPRESSION:
            o[d] = new Yi(n, this.dracoLoader);
            break;
          case S.KHR_TEXTURE_TRANSFORM:
            o[d] = new qi();
            break;
          case S.KHR_MESH_QUANTIZATION:
            o[d] = new Ji();
            break;
          default:
            h.indexOf(d) >= 0 && a[d] === void 0 && console.warn('THREE.GLTFLoader: Unknown extension "' + d + '".');
        }
      }
    l.setExtensions(o), l.setPlugins(a), l.parse(s, i);
  }
  /**
   * Async version of {@link GLTFLoader#parse}.
   *
   * @async
   * @param {string|ArrayBuffer} data - The raw glTF data.
   * @param {string} path - The URL base path.
   * @return {Promise<GLTFLoader~LoadObject>} A Promise that resolves with the loaded glTF when the parsing has been finished.
   */
  parseAsync(t, e) {
    const s = this;
    return new Promise(function(i, n) {
      s.parse(t, e, i, n);
    });
  }
}
function Pi() {
  let m = {};
  return {
    get: function(t) {
      return m[t];
    },
    add: function(t, e) {
      m[t] = e;
    },
    remove: function(t) {
      delete m[t];
    },
    removeAll: function() {
      m = {};
    }
  };
}
const S = {
  KHR_BINARY_GLTF: "KHR_binary_glTF",
  KHR_DRACO_MESH_COMPRESSION: "KHR_draco_mesh_compression",
  KHR_LIGHTS_PUNCTUAL: "KHR_lights_punctual",
  KHR_MATERIALS_CLEARCOAT: "KHR_materials_clearcoat",
  KHR_MATERIALS_DISPERSION: "KHR_materials_dispersion",
  KHR_MATERIALS_IOR: "KHR_materials_ior",
  KHR_MATERIALS_SHEEN: "KHR_materials_sheen",
  KHR_MATERIALS_SPECULAR: "KHR_materials_specular",
  KHR_MATERIALS_TRANSMISSION: "KHR_materials_transmission",
  KHR_MATERIALS_IRIDESCENCE: "KHR_materials_iridescence",
  KHR_MATERIALS_ANISOTROPY: "KHR_materials_anisotropy",
  KHR_MATERIALS_UNLIT: "KHR_materials_unlit",
  KHR_MATERIALS_VOLUME: "KHR_materials_volume",
  KHR_TEXTURE_BASISU: "KHR_texture_basisu",
  KHR_TEXTURE_TRANSFORM: "KHR_texture_transform",
  KHR_MESH_QUANTIZATION: "KHR_mesh_quantization",
  KHR_MATERIALS_EMISSIVE_STRENGTH: "KHR_materials_emissive_strength",
  EXT_MATERIALS_BUMP: "EXT_materials_bump",
  EXT_TEXTURE_WEBP: "EXT_texture_webp",
  EXT_TEXTURE_AVIF: "EXT_texture_avif",
  EXT_MESHOPT_COMPRESSION: "EXT_meshopt_compression",
  EXT_MESH_GPU_INSTANCING: "EXT_mesh_gpu_instancing"
};
class ki {
  constructor(t) {
    this.parser = t, this.name = S.KHR_LIGHTS_PUNCTUAL, this.cache = { refs: {}, uses: {} };
  }
  _markDefs() {
    const t = this.parser, e = this.parser.json.nodes || [];
    for (let s = 0, i = e.length; s < i; s++) {
      const n = e[s];
      n.extensions && n.extensions[this.name] && n.extensions[this.name].light !== void 0 && t._addNodeRef(this.cache, n.extensions[this.name].light);
    }
  }
  _loadLight(t) {
    const e = this.parser, s = "light:" + t;
    let i = e.cache.get(s);
    if (i) return i;
    const n = e.json, r = ((n.extensions && n.extensions[this.name] || {}).lights || [])[t];
    let l;
    const c = new he(16777215);
    r.color !== void 0 && c.setRGB(r.color[0], r.color[1], r.color[2], te);
    const d = r.range !== void 0 ? r.range : 0;
    switch (r.type) {
      case "directional":
        l = new zs(c), l.target.position.set(0, 0, -1), l.add(l.target);
        break;
      case "point":
        l = new Ds(c), l.distance = d;
        break;
      case "spot":
        l = new Ns(c), l.distance = d, r.spot = r.spot || {}, r.spot.innerConeAngle = r.spot.innerConeAngle !== void 0 ? r.spot.innerConeAngle : 0, r.spot.outerConeAngle = r.spot.outerConeAngle !== void 0 ? r.spot.outerConeAngle : Math.PI / 4, l.angle = r.spot.outerConeAngle, l.penumbra = 1 - r.spot.innerConeAngle / r.spot.outerConeAngle, l.target.position.set(0, 0, -1), l.add(l.target);
        break;
      default:
        throw new Error("THREE.GLTFLoader: Unexpected light type: " + r.type);
    }
    return l.position.set(0, 0, 0), Q(l, r), r.intensity !== void 0 && (l.intensity = r.intensity), l.name = e.createUniqueName(r.name || "light_" + t), i = Promise.resolve(l), e.cache.add(s, i), i;
  }
  getDependency(t, e) {
    if (t === "light")
      return this._loadLight(e);
  }
  createNodeAttachment(t) {
    const e = this, s = this.parser, n = s.json.nodes[t], a = (n.extensions && n.extensions[this.name] || {}).light;
    return a === void 0 ? null : this._loadLight(a).then(function(r) {
      return s._getNodeRef(e.cache, a, r);
    });
  }
}
class Ti {
  constructor() {
    this.name = S.KHR_MATERIALS_UNLIT;
  }
  getMaterialType() {
    return Ae;
  }
  extendParams(t, e, s) {
    const i = [];
    t.color = new he(1, 1, 1), t.opacity = 1;
    const n = e.pbrMetallicRoughness;
    if (n) {
      if (Array.isArray(n.baseColorFactor)) {
        const o = n.baseColorFactor;
        t.color.setRGB(o[0], o[1], o[2], te), t.opacity = o[3];
      }
      n.baseColorTexture !== void 0 && i.push(s.assignTexture(t, "map", n.baseColorTexture, _e));
    }
    return Promise.all(i);
  }
}
class Ni {
  constructor(t) {
    this.parser = t, this.name = S.KHR_MATERIALS_EMISSIVE_STRENGTH;
  }
  extendMaterialParams(t, e) {
    const i = this.parser.json.materials[t];
    if (!i.extensions || !i.extensions[this.name])
      return Promise.resolve();
    const n = i.extensions[this.name].emissiveStrength;
    return n !== void 0 && (e.emissiveIntensity = n), Promise.resolve();
  }
}
class Di {
  constructor(t) {
    this.parser = t, this.name = S.KHR_MATERIALS_CLEARCOAT;
  }
  getMaterialType(t) {
    const s = this.parser.json.materials[t];
    return !s.extensions || !s.extensions[this.name] ? null : J;
  }
  extendMaterialParams(t, e) {
    const s = this.parser, i = s.json.materials[t];
    if (!i.extensions || !i.extensions[this.name])
      return Promise.resolve();
    const n = [], o = i.extensions[this.name];
    if (o.clearcoatFactor !== void 0 && (e.clearcoat = o.clearcoatFactor), o.clearcoatTexture !== void 0 && n.push(s.assignTexture(e, "clearcoatMap", o.clearcoatTexture)), o.clearcoatRoughnessFactor !== void 0 && (e.clearcoatRoughness = o.clearcoatRoughnessFactor), o.clearcoatRoughnessTexture !== void 0 && n.push(s.assignTexture(e, "clearcoatRoughnessMap", o.clearcoatRoughnessTexture)), o.clearcoatNormalTexture !== void 0 && (n.push(s.assignTexture(e, "clearcoatNormalMap", o.clearcoatNormalTexture)), o.clearcoatNormalTexture.scale !== void 0)) {
      const a = o.clearcoatNormalTexture.scale;
      e.clearcoatNormalScale = new Pt(a, a);
    }
    return Promise.all(n);
  }
}
class zi {
  constructor(t) {
    this.parser = t, this.name = S.KHR_MATERIALS_DISPERSION;
  }
  getMaterialType(t) {
    const s = this.parser.json.materials[t];
    return !s.extensions || !s.extensions[this.name] ? null : J;
  }
  extendMaterialParams(t, e) {
    const i = this.parser.json.materials[t];
    if (!i.extensions || !i.extensions[this.name])
      return Promise.resolve();
    const n = i.extensions[this.name];
    return e.dispersion = n.dispersion !== void 0 ? n.dispersion : 0, Promise.resolve();
  }
}
class Ri {
  constructor(t) {
    this.parser = t, this.name = S.KHR_MATERIALS_IRIDESCENCE;
  }
  getMaterialType(t) {
    const s = this.parser.json.materials[t];
    return !s.extensions || !s.extensions[this.name] ? null : J;
  }
  extendMaterialParams(t, e) {
    const s = this.parser, i = s.json.materials[t];
    if (!i.extensions || !i.extensions[this.name])
      return Promise.resolve();
    const n = [], o = i.extensions[this.name];
    return o.iridescenceFactor !== void 0 && (e.iridescence = o.iridescenceFactor), o.iridescenceTexture !== void 0 && n.push(s.assignTexture(e, "iridescenceMap", o.iridescenceTexture)), o.iridescenceIor !== void 0 && (e.iridescenceIOR = o.iridescenceIor), e.iridescenceThicknessRange === void 0 && (e.iridescenceThicknessRange = [100, 400]), o.iridescenceThicknessMinimum !== void 0 && (e.iridescenceThicknessRange[0] = o.iridescenceThicknessMinimum), o.iridescenceThicknessMaximum !== void 0 && (e.iridescenceThicknessRange[1] = o.iridescenceThicknessMaximum), o.iridescenceThicknessTexture !== void 0 && n.push(s.assignTexture(e, "iridescenceThicknessMap", o.iridescenceThicknessTexture)), Promise.all(n);
  }
}
class Oi {
  constructor(t) {
    this.parser = t, this.name = S.KHR_MATERIALS_SHEEN;
  }
  getMaterialType(t) {
    const s = this.parser.json.materials[t];
    return !s.extensions || !s.extensions[this.name] ? null : J;
  }
  extendMaterialParams(t, e) {
    const s = this.parser, i = s.json.materials[t];
    if (!i.extensions || !i.extensions[this.name])
      return Promise.resolve();
    const n = [];
    e.sheenColor = new he(0, 0, 0), e.sheenRoughness = 0, e.sheen = 1;
    const o = i.extensions[this.name];
    if (o.sheenColorFactor !== void 0) {
      const a = o.sheenColorFactor;
      e.sheenColor.setRGB(a[0], a[1], a[2], te);
    }
    return o.sheenRoughnessFactor !== void 0 && (e.sheenRoughness = o.sheenRoughnessFactor), o.sheenColorTexture !== void 0 && n.push(s.assignTexture(e, "sheenColorMap", o.sheenColorTexture, _e)), o.sheenRoughnessTexture !== void 0 && n.push(s.assignTexture(e, "sheenRoughnessMap", o.sheenRoughnessTexture)), Promise.all(n);
  }
}
class Gi {
  constructor(t) {
    this.parser = t, this.name = S.KHR_MATERIALS_TRANSMISSION;
  }
  getMaterialType(t) {
    const s = this.parser.json.materials[t];
    return !s.extensions || !s.extensions[this.name] ? null : J;
  }
  extendMaterialParams(t, e) {
    const s = this.parser, i = s.json.materials[t];
    if (!i.extensions || !i.extensions[this.name])
      return Promise.resolve();
    const n = [], o = i.extensions[this.name];
    return o.transmissionFactor !== void 0 && (e.transmission = o.transmissionFactor), o.transmissionTexture !== void 0 && n.push(s.assignTexture(e, "transmissionMap", o.transmissionTexture)), Promise.all(n);
  }
}
class Fi {
  constructor(t) {
    this.parser = t, this.name = S.KHR_MATERIALS_VOLUME;
  }
  getMaterialType(t) {
    const s = this.parser.json.materials[t];
    return !s.extensions || !s.extensions[this.name] ? null : J;
  }
  extendMaterialParams(t, e) {
    const s = this.parser, i = s.json.materials[t];
    if (!i.extensions || !i.extensions[this.name])
      return Promise.resolve();
    const n = [], o = i.extensions[this.name];
    e.thickness = o.thicknessFactor !== void 0 ? o.thicknessFactor : 0, o.thicknessTexture !== void 0 && n.push(s.assignTexture(e, "thicknessMap", o.thicknessTexture)), e.attenuationDistance = o.attenuationDistance || 1 / 0;
    const a = o.attenuationColor || [1, 1, 1];
    return e.attenuationColor = new he().setRGB(a[0], a[1], a[2], te), Promise.all(n);
  }
}
class Bi {
  constructor(t) {
    this.parser = t, this.name = S.KHR_MATERIALS_IOR;
  }
  getMaterialType(t) {
    const s = this.parser.json.materials[t];
    return !s.extensions || !s.extensions[this.name] ? null : J;
  }
  extendMaterialParams(t, e) {
    const i = this.parser.json.materials[t];
    if (!i.extensions || !i.extensions[this.name])
      return Promise.resolve();
    const n = i.extensions[this.name];
    return e.ior = n.ior !== void 0 ? n.ior : 1.5, Promise.resolve();
  }
}
class Vi {
  constructor(t) {
    this.parser = t, this.name = S.KHR_MATERIALS_SPECULAR;
  }
  getMaterialType(t) {
    const s = this.parser.json.materials[t];
    return !s.extensions || !s.extensions[this.name] ? null : J;
  }
  extendMaterialParams(t, e) {
    const s = this.parser, i = s.json.materials[t];
    if (!i.extensions || !i.extensions[this.name])
      return Promise.resolve();
    const n = [], o = i.extensions[this.name];
    e.specularIntensity = o.specularFactor !== void 0 ? o.specularFactor : 1, o.specularTexture !== void 0 && n.push(s.assignTexture(e, "specularIntensityMap", o.specularTexture));
    const a = o.specularColorFactor || [1, 1, 1];
    return e.specularColor = new he().setRGB(a[0], a[1], a[2], te), o.specularColorTexture !== void 0 && n.push(s.assignTexture(e, "specularColorMap", o.specularColorTexture, _e)), Promise.all(n);
  }
}
class Zi {
  constructor(t) {
    this.parser = t, this.name = S.EXT_MATERIALS_BUMP;
  }
  getMaterialType(t) {
    const s = this.parser.json.materials[t];
    return !s.extensions || !s.extensions[this.name] ? null : J;
  }
  extendMaterialParams(t, e) {
    const s = this.parser, i = s.json.materials[t];
    if (!i.extensions || !i.extensions[this.name])
      return Promise.resolve();
    const n = [], o = i.extensions[this.name];
    return e.bumpScale = o.bumpFactor !== void 0 ? o.bumpFactor : 1, o.bumpTexture !== void 0 && n.push(s.assignTexture(e, "bumpMap", o.bumpTexture)), Promise.all(n);
  }
}
class Hi {
  constructor(t) {
    this.parser = t, this.name = S.KHR_MATERIALS_ANISOTROPY;
  }
  getMaterialType(t) {
    const s = this.parser.json.materials[t];
    return !s.extensions || !s.extensions[this.name] ? null : J;
  }
  extendMaterialParams(t, e) {
    const s = this.parser, i = s.json.materials[t];
    if (!i.extensions || !i.extensions[this.name])
      return Promise.resolve();
    const n = [], o = i.extensions[this.name];
    return o.anisotropyStrength !== void 0 && (e.anisotropy = o.anisotropyStrength), o.anisotropyRotation !== void 0 && (e.anisotropyRotation = o.anisotropyRotation), o.anisotropyTexture !== void 0 && n.push(s.assignTexture(e, "anisotropyMap", o.anisotropyTexture)), Promise.all(n);
  }
}
class ji {
  constructor(t) {
    this.parser = t, this.name = S.KHR_TEXTURE_BASISU;
  }
  loadTexture(t) {
    const e = this.parser, s = e.json, i = s.textures[t];
    if (!i.extensions || !i.extensions[this.name])
      return null;
    const n = i.extensions[this.name], o = e.options.ktx2Loader;
    if (!o) {
      if (s.extensionsRequired && s.extensionsRequired.indexOf(this.name) >= 0)
        throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");
      return null;
    }
    return e.loadTextureImage(t, n.source, o);
  }
}
class Wi {
  constructor(t) {
    this.parser = t, this.name = S.EXT_TEXTURE_WEBP;
  }
  loadTexture(t) {
    const e = this.name, s = this.parser, i = s.json, n = i.textures[t];
    if (!n.extensions || !n.extensions[e])
      return null;
    const o = n.extensions[e], a = i.images[o.source];
    let r = s.textureLoader;
    if (a.uri) {
      const l = s.options.manager.getHandler(a.uri);
      l !== null && (r = l);
    }
    return s.loadTextureImage(t, o.source, r);
  }
}
class Ui {
  constructor(t) {
    this.parser = t, this.name = S.EXT_TEXTURE_AVIF;
  }
  loadTexture(t) {
    const e = this.name, s = this.parser, i = s.json, n = i.textures[t];
    if (!n.extensions || !n.extensions[e])
      return null;
    const o = n.extensions[e], a = i.images[o.source];
    let r = s.textureLoader;
    if (a.uri) {
      const l = s.options.manager.getHandler(a.uri);
      l !== null && (r = l);
    }
    return s.loadTextureImage(t, o.source, r);
  }
}
class Ki {
  constructor(t) {
    this.name = S.EXT_MESHOPT_COMPRESSION, this.parser = t;
  }
  loadBufferView(t) {
    const e = this.parser.json, s = e.bufferViews[t];
    if (s.extensions && s.extensions[this.name]) {
      const i = s.extensions[this.name], n = this.parser.getDependency("buffer", i.buffer), o = this.parser.options.meshoptDecoder;
      if (!o || !o.supported) {
        if (e.extensionsRequired && e.extensionsRequired.indexOf(this.name) >= 0)
          throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");
        return null;
      }
      return n.then(function(a) {
        const r = i.byteOffset || 0, l = i.byteLength || 0, c = i.count, d = i.byteStride, h = new Uint8Array(a, r, l);
        return o.decodeGltfBufferAsync ? o.decodeGltfBufferAsync(c, d, h, i.mode, i.filter).then(function(p) {
          return p.buffer;
        }) : o.ready.then(function() {
          const p = new ArrayBuffer(c * d);
          return o.decodeGltfBuffer(new Uint8Array(p), c, d, h, i.mode, i.filter), p;
        });
      });
    } else
      return null;
  }
}
class $i {
  constructor(t) {
    this.name = S.EXT_MESH_GPU_INSTANCING, this.parser = t;
  }
  createNodeMesh(t) {
    const e = this.parser.json, s = e.nodes[t];
    if (!s.extensions || !s.extensions[this.name] || s.mesh === void 0)
      return null;
    const i = e.meshes[s.mesh];
    for (const l of i.primitives)
      if (l.mode !== H.TRIANGLES && l.mode !== H.TRIANGLE_STRIP && l.mode !== H.TRIANGLE_FAN && l.mode !== void 0)
        return null;
    const o = s.extensions[this.name].attributes, a = [], r = {};
    for (const l in o)
      a.push(this.parser.getDependency("accessor", o[l]).then((c) => (r[l] = c, r[l])));
    return a.length < 1 ? null : (a.push(this.parser.createNodeMesh(t)), Promise.all(a).then((l) => {
      const c = l.pop(), d = c.isGroup ? c.children : [c], h = l[0].count, p = [];
      for (const f of d) {
        const C = new de(), b = new R(), y = new Et(), w = new R(1, 1, 1), v = new Rs(f.geometry, f.material, h);
        for (let I = 0; I < h; I++)
          r.TRANSLATION && b.fromBufferAttribute(r.TRANSLATION, I), r.ROTATION && y.fromBufferAttribute(r.ROTATION, I), r.SCALE && w.fromBufferAttribute(r.SCALE, I), v.setMatrixAt(I, C.compose(b, y, w));
        for (const I in r)
          if (I === "_COLOR_0") {
            const x = r[I];
            v.instanceColor = new Os(x.array, x.itemSize, x.normalized);
          } else I !== "TRANSLATION" && I !== "ROTATION" && I !== "SCALE" && f.geometry.setAttribute(I, r[I]);
        _t.prototype.copy.call(v, f), this.parser.assignFinalMaterial(v), p.push(v);
      }
      return c.isGroup ? (c.clear(), c.add(...p), c) : p[0];
    }));
  }
}
const xs = "glTF", xe = 12, Ut = { JSON: 1313821514, BIN: 5130562 };
class Xi {
  constructor(t) {
    this.name = S.KHR_BINARY_GLTF, this.content = null, this.body = null;
    const e = new DataView(t, 0, xe), s = new TextDecoder();
    if (this.header = {
      magic: s.decode(new Uint8Array(t.slice(0, 4))),
      version: e.getUint32(4, !0),
      length: e.getUint32(8, !0)
    }, this.header.magic !== xs)
      throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");
    if (this.header.version < 2)
      throw new Error("THREE.GLTFLoader: Legacy binary file detected.");
    const i = this.header.length - xe, n = new DataView(t, xe);
    let o = 0;
    for (; o < i; ) {
      const a = n.getUint32(o, !0);
      o += 4;
      const r = n.getUint32(o, !0);
      if (o += 4, r === Ut.JSON) {
        const l = new Uint8Array(t, xe + o, a);
        this.content = s.decode(l);
      } else if (r === Ut.BIN) {
        const l = xe + o;
        this.body = t.slice(l, l + a);
      }
      o += a;
    }
    if (this.content === null)
      throw new Error("THREE.GLTFLoader: JSON content not found.");
  }
}
class Yi {
  constructor(t, e) {
    if (!e)
      throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");
    this.name = S.KHR_DRACO_MESH_COMPRESSION, this.json = t, this.dracoLoader = e, this.dracoLoader.preload();
  }
  decodePrimitive(t, e) {
    const s = this.json, i = this.dracoLoader, n = t.extensions[this.name].bufferView, o = t.extensions[this.name].attributes, a = {}, r = {}, l = {};
    for (const c in o) {
      const d = mt[c] || c.toLowerCase();
      a[d] = o[c];
    }
    for (const c in t.attributes) {
      const d = mt[c] || c.toLowerCase();
      if (o[c] !== void 0) {
        const h = s.accessors[t.attributes[c]], p = pe[h.componentType];
        l[d] = p.name, r[d] = h.normalized === !0;
      }
    }
    return e.getDependency("bufferView", n).then(function(c) {
      return new Promise(function(d, h) {
        i.decodeDracoFile(c, function(p) {
          for (const f in p.attributes) {
            const C = p.attributes[f], b = r[f];
            b !== void 0 && (C.normalized = b);
          }
          d(p);
        }, a, l, te, h);
      });
    });
  }
}
class qi {
  constructor() {
    this.name = S.KHR_TEXTURE_TRANSFORM;
  }
  extendTexture(t, e) {
    return (e.texCoord === void 0 || e.texCoord === t.channel) && e.offset === void 0 && e.rotation === void 0 && e.scale === void 0 || (t = t.clone(), e.texCoord !== void 0 && (t.channel = e.texCoord), e.offset !== void 0 && t.offset.fromArray(e.offset), e.rotation !== void 0 && (t.rotation = e.rotation), e.scale !== void 0 && t.repeat.fromArray(e.scale), t.needsUpdate = !0), t;
  }
}
class Ji {
  constructor() {
    this.name = S.KHR_MESH_QUANTIZATION;
  }
}
class As extends ci {
  constructor(t, e, s, i) {
    super(t, e, s, i);
  }
  copySampleValue_(t) {
    const e = this.resultBuffer, s = this.sampleValues, i = this.valueSize, n = t * i * 3 + i;
    for (let o = 0; o !== i; o++)
      e[o] = s[n + o];
    return e;
  }
  interpolate_(t, e, s, i) {
    const n = this.resultBuffer, o = this.sampleValues, a = this.valueSize, r = a * 2, l = a * 3, c = i - e, d = (s - e) / c, h = d * d, p = h * d, f = t * l, C = f - l, b = -2 * p + 3 * h, y = p - h, w = 1 - b, v = y - h + d;
    for (let I = 0; I !== a; I++) {
      const x = o[C + I + a], A = o[C + I + r] * c, E = o[f + I + a], N = o[f + I] * c;
      n[I] = w * x + v * A + b * E + y * N;
    }
    return n;
  }
}
const Qi = new Et();
class en extends As {
  interpolate_(t, e, s, i) {
    const n = super.interpolate_(t, e, s, i);
    return Qi.fromArray(n).normalize().toArray(n), n;
  }
}
const H = {
  POINTS: 0,
  LINES: 1,
  LINE_LOOP: 2,
  LINE_STRIP: 3,
  TRIANGLES: 4,
  TRIANGLE_STRIP: 5,
  TRIANGLE_FAN: 6
}, pe = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array
}, Kt = {
  9728: fs,
  9729: ut,
  9984: Hs,
  9985: Zs,
  9986: Vs,
  9987: ms
}, $t = {
  33071: Ws,
  33648: js,
  10497: gt
}, it = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16
}, mt = {
  POSITION: "position",
  NORMAL: "normal",
  TANGENT: "tangent",
  TEXCOORD_0: "uv",
  TEXCOORD_1: "uv1",
  TEXCOORD_2: "uv2",
  TEXCOORD_3: "uv3",
  COLOR_0: "color",
  WEIGHTS_0: "skinWeight",
  JOINTS_0: "skinIndex"
}, se = {
  scale: "scale",
  translation: "position",
  rotation: "quaternion",
  weights: "morphTargetInfluences"
}, tn = {
  CUBICSPLINE: void 0,
  // We use a custom interpolant (GLTFCubicSplineInterpolation) for CUBICSPLINE tracks. Each
  // keyframe track will be initialized with a default interpolation type, then modified.
  LINEAR: vs,
  STEP: ri
}, nt = {
  OPAQUE: "OPAQUE",
  MASK: "MASK",
  BLEND: "BLEND"
};
function sn(m) {
  return m.DefaultMaterial === void 0 && (m.DefaultMaterial = new ys({
    color: 16777215,
    emissive: 0,
    metalness: 1,
    roughness: 1,
    transparent: !1,
    depthTest: !0,
    side: li
  })), m.DefaultMaterial;
}
function ae(m, t, e) {
  for (const s in e.extensions)
    m[s] === void 0 && (t.userData.gltfExtensions = t.userData.gltfExtensions || {}, t.userData.gltfExtensions[s] = e.extensions[s]);
}
function Q(m, t) {
  t.extras !== void 0 && (typeof t.extras == "object" ? Object.assign(m.userData, t.extras) : console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, " + t.extras));
}
function nn(m, t, e) {
  let s = !1, i = !1, n = !1;
  for (let l = 0, c = t.length; l < c; l++) {
    const d = t[l];
    if (d.POSITION !== void 0 && (s = !0), d.NORMAL !== void 0 && (i = !0), d.COLOR_0 !== void 0 && (n = !0), s && i && n) break;
  }
  if (!s && !i && !n) return Promise.resolve(m);
  const o = [], a = [], r = [];
  for (let l = 0, c = t.length; l < c; l++) {
    const d = t[l];
    if (s) {
      const h = d.POSITION !== void 0 ? e.getDependency("accessor", d.POSITION) : m.attributes.position;
      o.push(h);
    }
    if (i) {
      const h = d.NORMAL !== void 0 ? e.getDependency("accessor", d.NORMAL) : m.attributes.normal;
      a.push(h);
    }
    if (n) {
      const h = d.COLOR_0 !== void 0 ? e.getDependency("accessor", d.COLOR_0) : m.attributes.color;
      r.push(h);
    }
  }
  return Promise.all([
    Promise.all(o),
    Promise.all(a),
    Promise.all(r)
  ]).then(function(l) {
    const c = l[0], d = l[1], h = l[2];
    return s && (m.morphAttributes.position = c), i && (m.morphAttributes.normal = d), n && (m.morphAttributes.color = h), m.morphTargetsRelative = !0, m;
  });
}
function on(m, t) {
  if (m.updateMorphTargets(), t.weights !== void 0)
    for (let e = 0, s = t.weights.length; e < s; e++)
      m.morphTargetInfluences[e] = t.weights[e];
  if (t.extras && Array.isArray(t.extras.targetNames)) {
    const e = t.extras.targetNames;
    if (m.morphTargetInfluences.length === e.length) {
      m.morphTargetDictionary = {};
      for (let s = 0, i = e.length; s < i; s++)
        m.morphTargetDictionary[e[s]] = s;
    } else
      console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.");
  }
}
function an(m) {
  let t;
  const e = m.extensions && m.extensions[S.KHR_DRACO_MESH_COMPRESSION];
  if (e ? t = "draco:" + e.bufferView + ":" + e.indices + ":" + ot(e.attributes) : t = m.indices + ":" + ot(m.attributes) + ":" + m.mode, m.targets !== void 0)
    for (let s = 0, i = m.targets.length; s < i; s++)
      t += ":" + ot(m.targets[s]);
  return t;
}
function ot(m) {
  let t = "";
  const e = Object.keys(m).sort();
  for (let s = 0, i = e.length; s < i; s++)
    t += e[s] + ":" + m[e[s]] + ";";
  return t;
}
function ft(m) {
  switch (m) {
    case Int8Array:
      return 1 / 127;
    case Uint8Array:
      return 1 / 255;
    case Int16Array:
      return 1 / 32767;
    case Uint16Array:
      return 1 / 65535;
    default:
      throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.");
  }
}
function rn(m) {
  return m.search(/\.jpe?g($|\?)/i) > 0 || m.search(/^data\:image\/jpeg/) === 0 ? "image/jpeg" : m.search(/\.webp($|\?)/i) > 0 || m.search(/^data\:image\/webp/) === 0 ? "image/webp" : m.search(/\.ktx2($|\?)/i) > 0 || m.search(/^data\:image\/ktx2/) === 0 ? "image/ktx2" : "image/png";
}
const ln = new de();
class cn {
  constructor(t = {}, e = {}) {
    this.json = t, this.extensions = {}, this.plugins = {}, this.options = e, this.cache = new Pi(), this.associations = /* @__PURE__ */ new Map(), this.primitiveCache = {}, this.nodeCache = {}, this.meshCache = { refs: {}, uses: {} }, this.cameraCache = { refs: {}, uses: {} }, this.lightCache = { refs: {}, uses: {} }, this.sourceCache = {}, this.textureCache = {}, this.nodeNamesUsed = {};
    let s = !1, i = -1, n = !1, o = -1;
    if (typeof navigator < "u") {
      const a = navigator.userAgent;
      s = /^((?!chrome|android).)*safari/i.test(a) === !0;
      const r = a.match(/Version\/(\d+)/);
      i = s && r ? parseInt(r[1], 10) : -1, n = a.indexOf("Firefox") > -1, o = n ? a.match(/Firefox\/([0-9]+)\./)[1] : -1;
    }
    typeof createImageBitmap > "u" || s && i < 17 || n && o < 98 ? this.textureLoader = new Gs(this.options.manager) : this.textureLoader = new Fs(this.options.manager), this.textureLoader.setCrossOrigin(this.options.crossOrigin), this.textureLoader.setRequestHeader(this.options.requestHeader), this.fileLoader = new Lt(this.options.manager), this.fileLoader.setResponseType("arraybuffer"), this.options.crossOrigin === "use-credentials" && this.fileLoader.setWithCredentials(!0);
  }
  setExtensions(t) {
    this.extensions = t;
  }
  setPlugins(t) {
    this.plugins = t;
  }
  parse(t, e) {
    const s = this, i = this.json, n = this.extensions;
    this.cache.removeAll(), this.nodeCache = {}, this._invokeAll(function(o) {
      return o._markDefs && o._markDefs();
    }), Promise.all(this._invokeAll(function(o) {
      return o.beforeRoot && o.beforeRoot();
    })).then(function() {
      return Promise.all([
        s.getDependencies("scene"),
        s.getDependencies("animation"),
        s.getDependencies("camera")
      ]);
    }).then(function(o) {
      const a = {
        scene: o[0][i.scene || 0],
        scenes: o[0],
        animations: o[1],
        cameras: o[2],
        asset: i.asset,
        parser: s,
        userData: {}
      };
      return ae(n, a, i), Q(a, i), Promise.all(s._invokeAll(function(r) {
        return r.afterRoot && r.afterRoot(a);
      })).then(function() {
        for (const r of a.scenes)
          r.updateMatrixWorld();
        t(a);
      });
    }).catch(e);
  }
  /**
   * Marks the special nodes/meshes in json for efficient parse.
   *
   * @private
   */
  _markDefs() {
    const t = this.json.nodes || [], e = this.json.skins || [], s = this.json.meshes || [];
    for (let i = 0, n = e.length; i < n; i++) {
      const o = e[i].joints;
      for (let a = 0, r = o.length; a < r; a++)
        t[o[a]].isBone = !0;
    }
    for (let i = 0, n = t.length; i < n; i++) {
      const o = t[i];
      o.mesh !== void 0 && (this._addNodeRef(this.meshCache, o.mesh), o.skin !== void 0 && (s[o.mesh].isSkinnedMesh = !0)), o.camera !== void 0 && this._addNodeRef(this.cameraCache, o.camera);
    }
  }
  /**
   * Counts references to shared node / Object3D resources. These resources
   * can be reused, or "instantiated", at multiple nodes in the scene
   * hierarchy. Mesh, Camera, and Light instances are instantiated and must
   * be marked. Non-scenegraph resources (like Materials, Geometries, and
   * Textures) can be reused directly and are not marked here.
   *
   * Example: CesiumMilkTruck sample model reuses "Wheel" meshes.
   *
   * @private
   * @param {Object} cache
   * @param {Object3D} index
   */
  _addNodeRef(t, e) {
    e !== void 0 && (t.refs[e] === void 0 && (t.refs[e] = t.uses[e] = 0), t.refs[e]++);
  }
  /**
   * Returns a reference to a shared resource, cloning it if necessary.
   *
   * @private
   * @param {Object} cache
   * @param {number} index
   * @param {Object} object
   * @return {Object}
   */
  _getNodeRef(t, e, s) {
    if (t.refs[e] <= 1) return s;
    const i = s.clone(), n = (o, a) => {
      const r = this.associations.get(o);
      r != null && this.associations.set(a, r);
      for (const [l, c] of o.children.entries())
        n(c, a.children[l]);
    };
    return n(s, i), i.name += "_instance_" + t.uses[e]++, i;
  }
  _invokeOne(t) {
    const e = Object.values(this.plugins);
    e.push(this);
    for (let s = 0; s < e.length; s++) {
      const i = t(e[s]);
      if (i) return i;
    }
    return null;
  }
  _invokeAll(t) {
    const e = Object.values(this.plugins);
    e.unshift(this);
    const s = [];
    for (let i = 0; i < e.length; i++) {
      const n = t(e[i]);
      n && s.push(n);
    }
    return s;
  }
  /**
   * Requests the specified dependency asynchronously, with caching.
   *
   * @private
   * @param {string} type
   * @param {number} index
   * @return {Promise<Object3D|Material|THREE.Texture|AnimationClip|ArrayBuffer|Object>}
   */
  getDependency(t, e) {
    const s = t + ":" + e;
    let i = this.cache.get(s);
    if (!i) {
      switch (t) {
        case "scene":
          i = this.loadScene(e);
          break;
        case "node":
          i = this._invokeOne(function(n) {
            return n.loadNode && n.loadNode(e);
          });
          break;
        case "mesh":
          i = this._invokeOne(function(n) {
            return n.loadMesh && n.loadMesh(e);
          });
          break;
        case "accessor":
          i = this.loadAccessor(e);
          break;
        case "bufferView":
          i = this._invokeOne(function(n) {
            return n.loadBufferView && n.loadBufferView(e);
          });
          break;
        case "buffer":
          i = this.loadBuffer(e);
          break;
        case "material":
          i = this._invokeOne(function(n) {
            return n.loadMaterial && n.loadMaterial(e);
          });
          break;
        case "texture":
          i = this._invokeOne(function(n) {
            return n.loadTexture && n.loadTexture(e);
          });
          break;
        case "skin":
          i = this.loadSkin(e);
          break;
        case "animation":
          i = this._invokeOne(function(n) {
            return n.loadAnimation && n.loadAnimation(e);
          });
          break;
        case "camera":
          i = this.loadCamera(e);
          break;
        default:
          if (i = this._invokeOne(function(n) {
            return n != this && n.getDependency && n.getDependency(t, e);
          }), !i)
            throw new Error("Unknown type: " + t);
          break;
      }
      this.cache.add(s, i);
    }
    return i;
  }
  /**
   * Requests all dependencies of the specified type asynchronously, with caching.
   *
   * @private
   * @param {string} type
   * @return {Promise<Array<Object>>}
   */
  getDependencies(t) {
    let e = this.cache.get(t);
    if (!e) {
      const s = this, i = this.json[t + (t === "mesh" ? "es" : "s")] || [];
      e = Promise.all(i.map(function(n, o) {
        return s.getDependency(t, o);
      })), this.cache.add(t, e);
    }
    return e;
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
   *
   * @private
   * @param {number} bufferIndex
   * @return {Promise<ArrayBuffer>}
   */
  loadBuffer(t) {
    const e = this.json.buffers[t], s = this.fileLoader;
    if (e.type && e.type !== "arraybuffer")
      throw new Error("THREE.GLTFLoader: " + e.type + " buffer type is not supported.");
    if (e.uri === void 0 && t === 0)
      return Promise.resolve(this.extensions[S.KHR_BINARY_GLTF].body);
    const i = this.options;
    return new Promise(function(n, o) {
      s.load(Se.resolveURL(e.uri, i.path), n, void 0, function() {
        o(new Error('THREE.GLTFLoader: Failed to load buffer "' + e.uri + '".'));
      });
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
   *
   * @private
   * @param {number} bufferViewIndex
   * @return {Promise<ArrayBuffer>}
   */
  loadBufferView(t) {
    const e = this.json.bufferViews[t];
    return this.getDependency("buffer", e.buffer).then(function(s) {
      const i = e.byteLength || 0, n = e.byteOffset || 0;
      return s.slice(n, n + i);
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#accessors
   *
   * @private
   * @param {number} accessorIndex
   * @return {Promise<BufferAttribute|InterleavedBufferAttribute>}
   */
  loadAccessor(t) {
    const e = this, s = this.json, i = this.json.accessors[t];
    if (i.bufferView === void 0 && i.sparse === void 0) {
      const o = it[i.type], a = pe[i.componentType], r = i.normalized === !0, l = new a(i.count * o);
      return Promise.resolve(new Qe(l, o, r));
    }
    const n = [];
    return i.bufferView !== void 0 ? n.push(this.getDependency("bufferView", i.bufferView)) : n.push(null), i.sparse !== void 0 && (n.push(this.getDependency("bufferView", i.sparse.indices.bufferView)), n.push(this.getDependency("bufferView", i.sparse.values.bufferView))), Promise.all(n).then(function(o) {
      const a = o[0], r = it[i.type], l = pe[i.componentType], c = l.BYTES_PER_ELEMENT, d = c * r, h = i.byteOffset || 0, p = i.bufferView !== void 0 ? s.bufferViews[i.bufferView].byteStride : void 0, f = i.normalized === !0;
      let C, b;
      if (p && p !== d) {
        const y = Math.floor(h / p), w = "InterleavedBuffer:" + i.bufferView + ":" + i.componentType + ":" + y + ":" + i.count;
        let v = e.cache.get(w);
        v || (C = new l(a, y * p, i.count * p / c), v = new Bs(C, p / c), e.cache.add(w, v)), b = new le(v, r, h % p / c, f);
      } else
        a === null ? C = new l(i.count * r) : C = new l(a, h, i.count * r), b = new Qe(C, r, f);
      if (i.sparse !== void 0) {
        const y = it.SCALAR, w = pe[i.sparse.indices.componentType], v = i.sparse.indices.byteOffset || 0, I = i.sparse.values.byteOffset || 0, x = new w(o[1], v, i.sparse.count * y), A = new l(o[2], I, i.sparse.count * r);
        a !== null && (b = new Qe(b.array.slice(), b.itemSize, b.normalized)), b.normalized = !1;
        for (let E = 0, N = x.length; E < N; E++) {
          const P = x[E];
          if (b.setX(P, A[E * r]), r >= 2 && b.setY(P, A[E * r + 1]), r >= 3 && b.setZ(P, A[E * r + 2]), r >= 4 && b.setW(P, A[E * r + 3]), r >= 5) throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.");
        }
        b.normalized = f;
      }
      return b;
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#textures
   *
   * @private
   * @param {number} textureIndex
   * @return {Promise<THREE.Texture|null>}
   */
  loadTexture(t) {
    const e = this.json, s = this.options, n = e.textures[t].source, o = e.images[n];
    let a = this.textureLoader;
    if (o.uri) {
      const r = s.manager.getHandler(o.uri);
      r !== null && (a = r);
    }
    return this.loadTextureImage(t, n, a);
  }
  loadTextureImage(t, e, s) {
    const i = this, n = this.json, o = n.textures[t], a = n.images[e], r = (a.uri || a.bufferView) + ":" + o.sampler;
    if (this.textureCache[r])
      return this.textureCache[r];
    const l = this.loadImageSource(e, s).then(function(c) {
      c.flipY = !1, c.name = o.name || a.name || "", c.name === "" && typeof a.uri == "string" && a.uri.startsWith("data:image/") === !1 && (c.name = a.uri);
      const h = (n.samplers || {})[o.sampler] || {};
      return c.magFilter = Kt[h.magFilter] || ut, c.minFilter = Kt[h.minFilter] || ms, c.wrapS = $t[h.wrapS] || gt, c.wrapT = $t[h.wrapT] || gt, c.generateMipmaps = !c.isCompressedTexture && c.minFilter !== fs && c.minFilter !== ut, i.associations.set(c, { textures: t }), c;
    }).catch(function() {
      return null;
    });
    return this.textureCache[r] = l, l;
  }
  loadImageSource(t, e) {
    const s = this, i = this.json, n = this.options;
    if (this.sourceCache[t] !== void 0)
      return this.sourceCache[t].then((d) => d.clone());
    const o = i.images[t], a = self.URL || self.webkitURL;
    let r = o.uri || "", l = !1;
    if (o.bufferView !== void 0)
      r = s.getDependency("bufferView", o.bufferView).then(function(d) {
        l = !0;
        const h = new Blob([d], { type: o.mimeType });
        return r = a.createObjectURL(h), r;
      });
    else if (o.uri === void 0)
      throw new Error("THREE.GLTFLoader: Image " + t + " is missing URI and bufferView");
    const c = Promise.resolve(r).then(function(d) {
      return new Promise(function(h, p) {
        let f = h;
        e.isImageBitmapLoader === !0 && (f = function(C) {
          const b = new Dt(C);
          b.needsUpdate = !0, h(b);
        }), e.load(Se.resolveURL(d, n.path), f, void 0, p);
      });
    }).then(function(d) {
      return l === !0 && a.revokeObjectURL(r), Q(d, o), d.userData.mimeType = o.mimeType || rn(o.uri), d;
    }).catch(function(d) {
      throw console.error("THREE.GLTFLoader: Couldn't load texture", r), d;
    });
    return this.sourceCache[t] = c, c;
  }
  /**
   * Asynchronously assigns a texture to the given material parameters.
   *
   * @private
   * @param {Object} materialParams
   * @param {string} mapName
   * @param {Object} mapDef
   * @param {string} [colorSpace]
   * @return {Promise<Texture>}
   */
  assignTexture(t, e, s, i) {
    const n = this;
    return this.getDependency("texture", s.index).then(function(o) {
      if (!o) return null;
      if (s.texCoord !== void 0 && s.texCoord > 0 && (o = o.clone(), o.channel = s.texCoord), n.extensions[S.KHR_TEXTURE_TRANSFORM]) {
        const a = s.extensions !== void 0 ? s.extensions[S.KHR_TEXTURE_TRANSFORM] : void 0;
        if (a) {
          const r = n.associations.get(o);
          o = n.extensions[S.KHR_TEXTURE_TRANSFORM].extendTexture(o, a), n.associations.set(o, r);
        }
      }
      return i !== void 0 && (o.colorSpace = i), t[e] = o, o;
    });
  }
  /**
   * Assigns final material to a Mesh, Line, or Points instance. The instance
   * already has a material (generated from the glTF material options alone)
   * but reuse of the same glTF material may require multiple threejs materials
   * to accommodate different primitive types, defines, etc. New materials will
   * be created if necessary, and reused from a cache.
   *
   * @private
   * @param {Object3D} mesh Mesh, Line, or Points instance.
   */
  assignFinalMaterial(t) {
    const e = t.geometry;
    let s = t.material;
    const i = e.attributes.tangent === void 0, n = e.attributes.color !== void 0, o = e.attributes.normal === void 0;
    if (t.isPoints) {
      const a = "PointsMaterial:" + s.uuid;
      let r = this.cache.get(a);
      r || (r = new Us(), et.prototype.copy.call(r, s), r.color.copy(s.color), r.map = s.map, r.sizeAttenuation = !1, this.cache.add(a, r)), s = r;
    } else if (t.isLine) {
      const a = "LineBasicMaterial:" + s.uuid;
      let r = this.cache.get(a);
      r || (r = new Ks(), et.prototype.copy.call(r, s), r.color.copy(s.color), r.map = s.map, this.cache.add(a, r)), s = r;
    }
    if (i || n || o) {
      let a = "ClonedMaterial:" + s.uuid + ":";
      i && (a += "derivative-tangents:"), n && (a += "vertex-colors:"), o && (a += "flat-shading:");
      let r = this.cache.get(a);
      r || (r = s.clone(), n && (r.vertexColors = !0), o && (r.flatShading = !0), i && (r.normalScale && (r.normalScale.y *= -1), r.clearcoatNormalScale && (r.clearcoatNormalScale.y *= -1)), this.cache.add(a, r), this.associations.set(r, this.associations.get(s))), s = r;
    }
    t.material = s;
  }
  getMaterialType() {
    return ys;
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materials
   *
   * @private
   * @param {number} materialIndex
   * @return {Promise<Material>}
   */
  loadMaterial(t) {
    const e = this, s = this.json, i = this.extensions, n = s.materials[t];
    let o;
    const a = {}, r = n.extensions || {}, l = [];
    if (r[S.KHR_MATERIALS_UNLIT]) {
      const d = i[S.KHR_MATERIALS_UNLIT];
      o = d.getMaterialType(), l.push(d.extendParams(a, n, e));
    } else {
      const d = n.pbrMetallicRoughness || {};
      if (a.color = new he(1, 1, 1), a.opacity = 1, Array.isArray(d.baseColorFactor)) {
        const h = d.baseColorFactor;
        a.color.setRGB(h[0], h[1], h[2], te), a.opacity = h[3];
      }
      d.baseColorTexture !== void 0 && l.push(e.assignTexture(a, "map", d.baseColorTexture, _e)), a.metalness = d.metallicFactor !== void 0 ? d.metallicFactor : 1, a.roughness = d.roughnessFactor !== void 0 ? d.roughnessFactor : 1, d.metallicRoughnessTexture !== void 0 && (l.push(e.assignTexture(a, "metalnessMap", d.metallicRoughnessTexture)), l.push(e.assignTexture(a, "roughnessMap", d.metallicRoughnessTexture))), o = this._invokeOne(function(h) {
        return h.getMaterialType && h.getMaterialType(t);
      }), l.push(Promise.all(this._invokeAll(function(h) {
        return h.extendMaterialParams && h.extendMaterialParams(t, a);
      })));
    }
    n.doubleSided === !0 && (a.side = $s);
    const c = n.alphaMode || nt.OPAQUE;
    if (c === nt.BLEND ? (a.transparent = !0, a.depthWrite = !1) : (a.transparent = !1, c === nt.MASK && (a.alphaTest = n.alphaCutoff !== void 0 ? n.alphaCutoff : 0.5)), n.normalTexture !== void 0 && o !== Ae && (l.push(e.assignTexture(a, "normalMap", n.normalTexture)), a.normalScale = new Pt(1, 1), n.normalTexture.scale !== void 0)) {
      const d = n.normalTexture.scale;
      a.normalScale.set(d, d);
    }
    if (n.occlusionTexture !== void 0 && o !== Ae && (l.push(e.assignTexture(a, "aoMap", n.occlusionTexture)), n.occlusionTexture.strength !== void 0 && (a.aoMapIntensity = n.occlusionTexture.strength)), n.emissiveFactor !== void 0 && o !== Ae) {
      const d = n.emissiveFactor;
      a.emissive = new he().setRGB(d[0], d[1], d[2], te);
    }
    return n.emissiveTexture !== void 0 && o !== Ae && l.push(e.assignTexture(a, "emissiveMap", n.emissiveTexture, _e)), Promise.all(l).then(function() {
      const d = new o(a);
      return n.name && (d.name = n.name), Q(d, n), e.associations.set(d, { materials: t }), n.extensions && ae(i, d, n), d;
    });
  }
  /**
   * When Object3D instances are targeted by animation, they need unique names.
   *
   * @private
   * @param {string} originalName
   * @return {string}
   */
  createUniqueName(t) {
    const e = Xs.sanitizeNodeName(t || "");
    return e in this.nodeNamesUsed ? e + "_" + ++this.nodeNamesUsed[e] : (this.nodeNamesUsed[e] = 0, e);
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#geometry
   *
   * Creates BufferGeometries from primitives.
   *
   * @private
   * @param {Array<GLTF.Primitive>} primitives
   * @return {Promise<Array<BufferGeometry>>}
   */
  loadGeometries(t) {
    const e = this, s = this.extensions, i = this.primitiveCache;
    function n(a) {
      return s[S.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(a, e).then(function(r) {
        return Xt(r, a, e);
      });
    }
    const o = [];
    for (let a = 0, r = t.length; a < r; a++) {
      const l = t[a], c = an(l), d = i[c];
      if (d)
        o.push(d.promise);
      else {
        let h;
        l.extensions && l.extensions[S.KHR_DRACO_MESH_COMPRESSION] ? h = n(l) : h = Xt(new Ys(), l, e), i[c] = { primitive: l, promise: h }, o.push(h);
      }
    }
    return Promise.all(o);
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes
   *
   * @private
   * @param {number} meshIndex
   * @return {Promise<Group|Mesh|SkinnedMesh|Line|Points>}
   */
  loadMesh(t) {
    const e = this, s = this.json, i = this.extensions, n = s.meshes[t], o = n.primitives, a = [];
    for (let r = 0, l = o.length; r < l; r++) {
      const c = o[r].material === void 0 ? sn(this.cache) : this.getDependency("material", o[r].material);
      a.push(c);
    }
    return a.push(e.loadGeometries(o)), Promise.all(a).then(function(r) {
      const l = r.slice(0, r.length - 1), c = r[r.length - 1], d = [];
      for (let p = 0, f = c.length; p < f; p++) {
        const C = c[p], b = o[p];
        let y;
        const w = l[p];
        if (b.mode === H.TRIANGLES || b.mode === H.TRIANGLE_STRIP || b.mode === H.TRIANGLE_FAN || b.mode === void 0)
          y = n.isSkinnedMesh === !0 ? new qs(C, w) : new bs(C, w), y.isSkinnedMesh === !0 && y.normalizeSkinWeights(), b.mode === H.TRIANGLE_STRIP ? y.geometry = Wt(y.geometry, gs) : b.mode === H.TRIANGLE_FAN && (y.geometry = Wt(y.geometry, ht));
        else if (b.mode === H.LINES)
          y = new Js(C, w);
        else if (b.mode === H.LINE_STRIP)
          y = new Qs(C, w);
        else if (b.mode === H.LINE_LOOP)
          y = new ei(C, w);
        else if (b.mode === H.POINTS)
          y = new ti(C, w);
        else
          throw new Error("THREE.GLTFLoader: Primitive mode unsupported: " + b.mode);
        Object.keys(y.geometry.morphAttributes).length > 0 && on(y, n), y.name = e.createUniqueName(n.name || "mesh_" + t), Q(y, n), b.extensions && ae(i, y, b), e.assignFinalMaterial(y), d.push(y);
      }
      for (let p = 0, f = d.length; p < f; p++)
        e.associations.set(d[p], {
          meshes: t,
          primitives: p
        });
      if (d.length === 1)
        return n.extensions && ae(i, d[0], n), d[0];
      const h = new tt();
      n.extensions && ae(i, h, n), e.associations.set(h, { meshes: t });
      for (let p = 0, f = d.length; p < f; p++)
        h.add(d[p]);
      return h;
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#cameras
   *
   * @private
   * @param {number} cameraIndex
   * @return {Promise<THREE.Camera>}
   */
  loadCamera(t) {
    let e;
    const s = this.json.cameras[t], i = s[s.type];
    if (!i) {
      console.warn("THREE.GLTFLoader: Missing camera parameters.");
      return;
    }
    return s.type === "perspective" ? e = new si(Cs.radToDeg(i.yfov), i.aspectRatio || 1, i.znear || 1, i.zfar || 2e6) : s.type === "orthographic" && (e = new ii(-i.xmag, i.xmag, i.ymag, -i.ymag, i.znear, i.zfar)), s.name && (e.name = this.createUniqueName(s.name)), Q(e, s), Promise.resolve(e);
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins
   *
   * @private
   * @param {number} skinIndex
   * @return {Promise<Skeleton>}
   */
  loadSkin(t) {
    const e = this.json.skins[t], s = [];
    for (let i = 0, n = e.joints.length; i < n; i++)
      s.push(this._loadNodeShallow(e.joints[i]));
    return e.inverseBindMatrices !== void 0 ? s.push(this.getDependency("accessor", e.inverseBindMatrices)) : s.push(null), Promise.all(s).then(function(i) {
      const n = i.pop(), o = i, a = [], r = [];
      for (let l = 0, c = o.length; l < c; l++) {
        const d = o[l];
        if (d) {
          a.push(d);
          const h = new de();
          n !== null && h.fromArray(n.array, l * 16), r.push(h);
        } else
          console.warn('THREE.GLTFLoader: Joint "%s" could not be found.', e.joints[l]);
      }
      return new ni(a, r);
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#animations
   *
   * @private
   * @param {number} animationIndex
   * @return {Promise<AnimationClip>}
   */
  loadAnimation(t) {
    const e = this.json, s = this, i = e.animations[t], n = i.name ? i.name : "animation_" + t, o = [], a = [], r = [], l = [], c = [];
    for (let d = 0, h = i.channels.length; d < h; d++) {
      const p = i.channels[d], f = i.samplers[p.sampler], C = p.target, b = C.node, y = i.parameters !== void 0 ? i.parameters[f.input] : f.input, w = i.parameters !== void 0 ? i.parameters[f.output] : f.output;
      C.node !== void 0 && (o.push(this.getDependency("node", b)), a.push(this.getDependency("accessor", y)), r.push(this.getDependency("accessor", w)), l.push(f), c.push(C));
    }
    return Promise.all([
      Promise.all(o),
      Promise.all(a),
      Promise.all(r),
      Promise.all(l),
      Promise.all(c)
    ]).then(function(d) {
      const h = d[0], p = d[1], f = d[2], C = d[3], b = d[4], y = [];
      for (let w = 0, v = h.length; w < v; w++) {
        const I = h[w], x = p[w], A = f[w], E = C[w], N = b[w];
        if (I === void 0) continue;
        I.updateMatrix && I.updateMatrix();
        const P = s._createAnimationTracks(I, x, A, E, N);
        if (P)
          for (let B = 0; B < P.length; B++)
            y.push(P[B]);
      }
      return new oi(n, void 0, y);
    });
  }
  createNodeMesh(t) {
    const e = this.json, s = this, i = e.nodes[t];
    return i.mesh === void 0 ? null : s.getDependency("mesh", i.mesh).then(function(n) {
      const o = s._getNodeRef(s.meshCache, i.mesh, n);
      return i.weights !== void 0 && o.traverse(function(a) {
        if (a.isMesh)
          for (let r = 0, l = i.weights.length; r < l; r++)
            a.morphTargetInfluences[r] = i.weights[r];
      }), o;
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#nodes-and-hierarchy
   *
   * @private
   * @param {number} nodeIndex
   * @return {Promise<Object3D>}
   */
  loadNode(t) {
    const e = this.json, s = this, i = e.nodes[t], n = s._loadNodeShallow(t), o = [], a = i.children || [];
    for (let l = 0, c = a.length; l < c; l++)
      o.push(s.getDependency("node", a[l]));
    const r = i.skin === void 0 ? Promise.resolve(null) : s.getDependency("skin", i.skin);
    return Promise.all([
      n,
      Promise.all(o),
      r
    ]).then(function(l) {
      const c = l[0], d = l[1], h = l[2];
      h !== null && c.traverse(function(p) {
        p.isSkinnedMesh && p.bind(h, ln);
      });
      for (let p = 0, f = d.length; p < f; p++)
        c.add(d[p]);
      return c;
    });
  }
  // ._loadNodeShallow() parses a single node.
  // skin and child nodes are created and added in .loadNode() (no '_' prefix).
  _loadNodeShallow(t) {
    const e = this.json, s = this.extensions, i = this;
    if (this.nodeCache[t] !== void 0)
      return this.nodeCache[t];
    const n = e.nodes[t], o = n.name ? i.createUniqueName(n.name) : "", a = [], r = i._invokeOne(function(l) {
      return l.createNodeMesh && l.createNodeMesh(t);
    });
    return r && a.push(r), n.camera !== void 0 && a.push(i.getDependency("camera", n.camera).then(function(l) {
      return i._getNodeRef(i.cameraCache, n.camera, l);
    })), i._invokeAll(function(l) {
      return l.createNodeAttachment && l.createNodeAttachment(t);
    }).forEach(function(l) {
      a.push(l);
    }), this.nodeCache[t] = Promise.all(a).then(function(l) {
      let c;
      if (n.isBone === !0 ? c = new ai() : l.length > 1 ? c = new tt() : l.length === 1 ? c = l[0] : c = new _t(), c !== l[0])
        for (let d = 0, h = l.length; d < h; d++)
          c.add(l[d]);
      if (n.name && (c.userData.name = n.name, c.name = o), Q(c, n), n.extensions && ae(s, c, n), n.matrix !== void 0) {
        const d = new de();
        d.fromArray(n.matrix), c.applyMatrix4(d);
      } else
        n.translation !== void 0 && c.position.fromArray(n.translation), n.rotation !== void 0 && c.quaternion.fromArray(n.rotation), n.scale !== void 0 && c.scale.fromArray(n.scale);
      if (!i.associations.has(c))
        i.associations.set(c, {});
      else if (n.mesh !== void 0 && i.meshCache.refs[n.mesh] > 1) {
        const d = i.associations.get(c);
        i.associations.set(c, { ...d });
      }
      return i.associations.get(c).nodes = t, c;
    }), this.nodeCache[t];
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#scenes
   *
   * @private
   * @param {number} sceneIndex
   * @return {Promise<Group>}
   */
  loadScene(t) {
    const e = this.extensions, s = this.json.scenes[t], i = this, n = new tt();
    s.name && (n.name = i.createUniqueName(s.name)), Q(n, s), s.extensions && ae(e, n, s);
    const o = s.nodes || [], a = [];
    for (let r = 0, l = o.length; r < l; r++)
      a.push(i.getDependency("node", o[r]));
    return Promise.all(a).then(function(r) {
      for (let c = 0, d = r.length; c < d; c++)
        n.add(r[c]);
      const l = (c) => {
        const d = /* @__PURE__ */ new Map();
        for (const [h, p] of i.associations)
          (h instanceof et || h instanceof Dt) && d.set(h, p);
        return c.traverse((h) => {
          const p = i.associations.get(h);
          p != null && d.set(h, p);
        }), d;
      };
      return i.associations = l(n), n;
    });
  }
  _createAnimationTracks(t, e, s, i, n) {
    const o = [], a = t.name ? t.name : t.uuid, r = [];
    se[n.path] === se.weights ? t.traverse(function(h) {
      h.morphTargetInfluences && r.push(h.name ? h.name : h.uuid);
    }) : r.push(a);
    let l;
    switch (se[n.path]) {
      case se.weights:
        l = Rt;
        break;
      case se.rotation:
        l = Ot;
        break;
      case se.translation:
      case se.scale:
        l = zt;
        break;
      default:
        switch (s.itemSize) {
          case 1:
            l = Rt;
            break;
          case 2:
          case 3:
          default:
            l = zt;
            break;
        }
        break;
    }
    const c = i.interpolation !== void 0 ? tn[i.interpolation] : vs, d = this._getArrayFromAccessor(s);
    for (let h = 0, p = r.length; h < p; h++) {
      const f = new l(
        r[h] + "." + se[n.path],
        e.array,
        d,
        c
      );
      i.interpolation === "CUBICSPLINE" && this._createCubicSplineTrackInterpolant(f), o.push(f);
    }
    return o;
  }
  _getArrayFromAccessor(t) {
    let e = t.array;
    if (t.normalized) {
      const s = ft(e.constructor), i = new Float32Array(e.length);
      for (let n = 0, o = e.length; n < o; n++)
        i[n] = e[n] * s;
      e = i;
    }
    return e;
  }
  _createCubicSplineTrackInterpolant(t) {
    t.createInterpolant = function(s) {
      const i = this instanceof Ot ? en : As;
      return new i(this.times, this.values, this.getValueSize() / 3, s);
    }, t.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline = !0;
  }
}
function dn(m, t, e) {
  const s = t.attributes, i = new qe();
  if (s.POSITION !== void 0) {
    const a = e.json.accessors[s.POSITION], r = a.min, l = a.max;
    if (r !== void 0 && l !== void 0) {
      if (i.set(
        new R(r[0], r[1], r[2]),
        new R(l[0], l[1], l[2])
      ), a.normalized) {
        const c = ft(pe[a.componentType]);
        i.min.multiplyScalar(c), i.max.multiplyScalar(c);
      }
    } else {
      console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");
      return;
    }
  } else
    return;
  const n = t.targets;
  if (n !== void 0) {
    const a = new R(), r = new R();
    for (let l = 0, c = n.length; l < c; l++) {
      const d = n[l];
      if (d.POSITION !== void 0) {
        const h = e.json.accessors[d.POSITION], p = h.min, f = h.max;
        if (p !== void 0 && f !== void 0) {
          if (r.setX(Math.max(Math.abs(p[0]), Math.abs(f[0]))), r.setY(Math.max(Math.abs(p[1]), Math.abs(f[1]))), r.setZ(Math.max(Math.abs(p[2]), Math.abs(f[2]))), h.normalized) {
            const C = ft(pe[h.componentType]);
            r.multiplyScalar(C);
          }
          a.max(r);
        } else
          console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");
      }
    }
    i.expandByVector(a);
  }
  m.boundingBox = i;
  const o = new kt();
  i.getCenter(o.center), o.radius = i.min.distanceTo(i.max) / 2, m.boundingSphere = o;
}
function Xt(m, t, e) {
  const s = t.attributes, i = [];
  function n(o, a) {
    return e.getDependency("accessor", o).then(function(r) {
      m.setAttribute(a, r);
    });
  }
  for (const o in s) {
    const a = mt[o] || o.toLowerCase();
    a in m.attributes || i.push(n(s[o], a));
  }
  if (t.indices !== void 0 && !m.index) {
    const o = e.getDependency("accessor", t.indices).then(function(a) {
      m.setIndex(a);
    });
    i.push(o);
  }
  return Gt.workingColorSpace !== te && "COLOR_0" in s && console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${Gt.workingColorSpace}" not supported.`), Q(m, t), dn(m, t, e), Promise.all(i).then(function() {
    return t.targets !== void 0 ? nn(m, t.targets, e) : m;
  });
}
const Yt = 1e3;
class qt {
  constructor(t, e, s) {
    var i;
    this.geometry = t, this.material = e.clone(), this.material.vertexColors = !0, this.instancedMesh = new u.InstancedMesh(this.geometry, this.material, Yt), this.instancedMesh.instanceMatrix.setUsage(u.DynamicDrawUsage), (i = this.instancedMesh.instanceColor) == null || i.setUsage(u.DynamicDrawUsage), s.add(this.instancedMesh), this.nodeIdToInstanceId = /* @__PURE__ */ new Map(), this.instanceIdToNodeId = /* @__PURE__ */ new Map(), this.activeInstances = 0;
  }
  addNode(t) {
    if (this.activeInstances >= Yt)
      return console.warn("InstancedMeshManager: Max instances reached."), null;
    const e = this.activeInstances++;
    return this.nodeIdToInstanceId.set(t.id, e), this.instanceIdToNodeId.set(e, t.id), this.updateNodeTransform(t, e), this.updateNodeColor(t, e), e;
  }
  updateNodeTransform(t, e = this.nodeIdToInstanceId.get(t.id)) {
    var a;
    if (e === void 0) return;
    const s = new u.Matrix4(), i = t.position, n = ((a = t.mesh) == null ? void 0 : a.quaternion) || new u.Quaternion(), o = new u.Vector3(t.size, t.size, t.size);
    s.compose(i, n, o), this.instancedMesh.setMatrixAt(e, s), this.instancedMesh.instanceMatrix.needsUpdate = !0;
  }
  updateNodeColor(t, e = this.nodeIdToInstanceId.get(t.id)) {
    if (e === void 0 || !this.instancedMesh.instanceColor) return;
    const s = new u.Color(t.data.color || 16777215);
    this.instancedMesh.setColorAt(e, s), this.instancedMesh.instanceColor.needsUpdate = !0;
  }
  removeNode(t) {
    const e = this.nodeIdToInstanceId.get(t.id);
    e !== void 0 && (this.instancedMesh.setMatrixAt(e, new u.Matrix4().makeScale(0, 0, 0)), this.instancedMesh.instanceMatrix.needsUpdate = !0, this.nodeIdToInstanceId.delete(t.id), this.instanceIdToNodeId.delete(e));
  }
  getRaycastIntersection(t) {
    if (!this.instancedMesh || this.activeInstances === 0) return null;
    const e = t.intersectObject(this.instancedMesh);
    if (e.length === 0) return null;
    const s = e[0].instanceId, i = this.instanceIdToNodeId.get(s);
    return i ? { ...e[0], nodeId: i } : null;
  }
  dispose() {
    var t;
    (t = this.instancedMesh.parent) == null || t.remove(this.instancedMesh), this.instancedMesh.geometry.dispose(), this.instancedMesh.material.dispose(), this.nodeIdToInstanceId.clear(), this.instanceIdToNodeId.clear();
  }
}
class hn {
  constructor(t) {
    this.scene = t, this.meshGroups = /* @__PURE__ */ new Map(), this.gltfLoader = new Ms(), this.loadedGltfGeometries = /* @__PURE__ */ new Map(), this._initDefaultGeometries();
  }
  async _loadGltfModel(t) {
    if (this.loadedGltfGeometries.has(t))
      return this.loadedGltfGeometries.get(t);
    try {
      const e = await this.gltfLoader.loadAsync(t);
      let s = null;
      return e.scene.traverse((i) => {
        i.isMesh && (s = i.geometry);
      }), s ? (this.loadedGltfGeometries.set(t, s), s) : (console.warn(`GLTF model at ${t} contains no mesh geometry.`), null);
    } catch (e) {
      return console.error(`Error loading GLTF model from ${t}:`, e), null;
    }
  }
  _initDefaultGeometries() {
    const t = new u.SphereGeometry(0.5, 16, 12), e = new u.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.2
    });
    this.meshGroups.set("sphere", new qt(t, e, this.scene));
  }
  async getNodeGroup(t) {
    if (t.data.shape === "sphere")
      return this.meshGroups.get("sphere");
    if (t.data.gltfUrl) {
      let e = this.meshGroups.get(t.data.gltfUrl);
      if (!e) {
        const s = await this._loadGltfModel(t.data.gltfUrl);
        if (s) {
          const i = new u.MeshStandardMaterial({
            roughness: 0.6,
            metalness: 0.2
          });
          e = new qt(s, i, this.scene), this.meshGroups.set(t.data.gltfUrl, e);
        }
      }
      return e;
    }
    return null;
  }
  async addNode(t) {
    const e = await this.getNodeGroup(t);
    if (!e)
      return t.isInstanced = !1, !1;
    const s = e.addNode(t);
    return s === null ? (t.isInstanced = !1, !1) : (t.isInstanced = !0, t.instanceId = s, t.mesh && (t.mesh.visible = !1), !0);
  }
  async updateNode(t) {
    if (!t.isInstanced) return;
    const e = await this.getNodeGroup(t);
    e && (e.updateNodeTransform(t), e.updateNodeColor(t));
  }
  async removeNode(t) {
    if (!t.isInstanced) return;
    const e = await this.getNodeGroup(t);
    e && (e.removeNode(t), t.isInstanced = !1);
  }
  raycast(t) {
    let e = null;
    for (const s of this.meshGroups.values()) {
      const i = s.getRaycastIntersection(t);
      i && (!e || i.distance < e.distance) && (e = i);
    }
    return e;
  }
  dispose() {
    this.meshGroups.forEach((t) => t.dispose()), this.meshGroups.clear();
  }
}
const Jt = new qe(), Ge = new R();
class Ss extends di {
  /**
   * Constructs a new line segments geometry.
   */
  constructor() {
    super(), this.isLineSegmentsGeometry = !0, this.type = "LineSegmentsGeometry";
    const t = [-1, 2, 0, 1, 2, 0, -1, 1, 0, 1, 1, 0, -1, 0, 0, 1, 0, 0, -1, -1, 0, 1, -1, 0], e = [-1, 2, 1, 2, -1, 1, 1, 1, -1, -1, 1, -1, -1, -2, 1, -2], s = [0, 2, 1, 2, 3, 1, 2, 4, 3, 4, 5, 3, 4, 6, 5, 6, 7, 5];
    this.setIndex(s), this.setAttribute("position", new Ft(t, 3)), this.setAttribute("uv", new Ft(e, 2));
  }
  /**
   * Applies the given 4x4 transformation matrix to the geometry.
   *
   * @param {Matrix4} matrix - The matrix to apply.
   * @return {LineSegmentsGeometry} A reference to this instance.
   */
  applyMatrix4(t) {
    const e = this.attributes.instanceStart, s = this.attributes.instanceEnd;
    return e !== void 0 && (e.applyMatrix4(t), s.applyMatrix4(t), e.needsUpdate = !0), this.boundingBox !== null && this.computeBoundingBox(), this.boundingSphere !== null && this.computeBoundingSphere(), this;
  }
  /**
   * Sets the given line positions for this geometry. The length must be a multiple of six since
   * each line segment is defined by a start end vertex in the pattern `(xyz xyz)`.
   *
   * @param {Float32Array|Array<number>} array - The position data to set.
   * @return {LineSegmentsGeometry} A reference to this geometry.
   */
  setPositions(t) {
    let e;
    t instanceof Float32Array ? e = t : Array.isArray(t) && (e = new Float32Array(t));
    const s = new pt(e, 6, 1);
    return this.setAttribute("instanceStart", new le(s, 3, 0)), this.setAttribute("instanceEnd", new le(s, 3, 3)), this.instanceCount = this.attributes.instanceStart.count, this.computeBoundingBox(), this.computeBoundingSphere(), this;
  }
  /**
   * Sets the given line colors for this geometry. The length must be a multiple of six since
   * each line segment is defined by a start end color in the pattern `(rgb rgb)`.
   *
   * @param {Float32Array|Array<number>} array - The position data to set.
   * @return {LineSegmentsGeometry} A reference to this geometry.
   */
  setColors(t) {
    let e;
    t instanceof Float32Array ? e = t : Array.isArray(t) && (e = new Float32Array(t));
    const s = new pt(e, 6, 1);
    return this.setAttribute("instanceColorStart", new le(s, 3, 0)), this.setAttribute("instanceColorEnd", new le(s, 3, 3)), this;
  }
  /**
   * Setups this line segments geometry from the given wireframe geometry.
   *
   * @param {WireframeGeometry} geometry - The geometry that should be used as a data source for this geometry.
   * @return {LineSegmentsGeometry} A reference to this geometry.
   */
  fromWireframeGeometry(t) {
    return this.setPositions(t.attributes.position.array), this;
  }
  /**
   * Setups this line segments geometry from the given edges geometry.
   *
   * @param {EdgesGeometry} geometry - The geometry that should be used as a data source for this geometry.
   * @return {LineSegmentsGeometry} A reference to this geometry.
   */
  fromEdgesGeometry(t) {
    return this.setPositions(t.attributes.position.array), this;
  }
  /**
   * Setups this line segments geometry from the given mesh.
   *
   * @param {Mesh} mesh - The mesh geometry that should be used as a data source for this geometry.
   * @return {LineSegmentsGeometry} A reference to this geometry.
   */
  fromMesh(t) {
    return this.fromWireframeGeometry(new hi(t.geometry)), this;
  }
  /**
   * Setups this line segments geometry from the given line segments.
   *
   * @param {LineSegments} lineSegments - The line segments that should be used as a data source for this geometry.
   * Assumes the source geometry is not using indices.
   * @return {LineSegmentsGeometry} A reference to this geometry.
   */
  fromLineSegments(t) {
    const e = t.geometry;
    return this.setPositions(e.attributes.position.array), this;
  }
  computeBoundingBox() {
    this.boundingBox === null && (this.boundingBox = new qe());
    const t = this.attributes.instanceStart, e = this.attributes.instanceEnd;
    t !== void 0 && e !== void 0 && (this.boundingBox.setFromBufferAttribute(t), Jt.setFromBufferAttribute(e), this.boundingBox.union(Jt));
  }
  computeBoundingSphere() {
    this.boundingSphere === null && (this.boundingSphere = new kt()), this.boundingBox === null && this.computeBoundingBox();
    const t = this.attributes.instanceStart, e = this.attributes.instanceEnd;
    if (t !== void 0 && e !== void 0) {
      const s = this.boundingSphere.center;
      this.boundingBox.getCenter(s);
      let i = 0;
      for (let n = 0, o = t.count; n < o; n++)
        Ge.fromBufferAttribute(t, n), i = Math.max(i, s.distanceToSquared(Ge)), Ge.fromBufferAttribute(e, n), i = Math.max(i, s.distanceToSquared(Ge));
      this.boundingSphere.radius = Math.sqrt(i), isNaN(this.boundingSphere.radius) && console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.", this);
    }
  }
  toJSON() {
  }
}
He.line = {
  worldUnits: { value: 1 },
  linewidth: { value: 1 },
  resolution: { value: new Pt(1, 1) },
  dashOffset: { value: 0 },
  dashScale: { value: 1 },
  dashSize: { value: 1 },
  gapSize: { value: 1 }
  // todo FIX - maybe change to totalSize
};
Ze.line = {
  uniforms: ws.merge([
    He.common,
    He.fog,
    He.line
  ]),
  vertexShader: (
    /* glsl */
    `
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
				vUv = uv;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`
  ),
  fragmentShader: (
    /* glsl */
    `
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			float alpha = opacity;
			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`
  )
};
class Tt extends ui {
  /**
   * Constructs a new line segments geometry.
   *
   * @param {Object} [parameters] - An object with one or more properties
   * defining the material's appearance. Any property of the material
   * (including any property from inherited materials) can be passed
   * in here. Color values can be passed any type of value accepted
   * by {@link Color#set}.
   */
  constructor(t) {
    super({
      type: "LineMaterial",
      uniforms: ws.clone(Ze.line.uniforms),
      vertexShader: Ze.line.vertexShader,
      fragmentShader: Ze.line.fragmentShader,
      clipping: !0
      // required for clipping support
    }), this.isLineMaterial = !0, this.setValues(t);
  }
  /**
   * The material's color.
   *
   * @type {Color}
   * @default (1,1,1)
   */
  get color() {
    return this.uniforms.diffuse.value;
  }
  set color(t) {
    this.uniforms.diffuse.value = t;
  }
  /**
   * Whether the material's sizes (width, dash gaps) are in world units.
   *
   * @type {boolean}
   * @default false
   */
  get worldUnits() {
    return "WORLD_UNITS" in this.defines;
  }
  set worldUnits(t) {
    t === !0 ? this.defines.WORLD_UNITS = "" : delete this.defines.WORLD_UNITS;
  }
  /**
   * Controls line thickness in CSS pixel units when `worldUnits` is `false` (default),
   * or in world units when `worldUnits` is `true`.
   *
   * @type {number}
   * @default 1
   */
  get linewidth() {
    return this.uniforms.linewidth.value;
  }
  set linewidth(t) {
    this.uniforms.linewidth && (this.uniforms.linewidth.value = t);
  }
  /**
   * Whether the line is dashed, or solid.
   *
   * @type {boolean}
   * @default false
   */
  get dashed() {
    return "USE_DASH" in this.defines;
  }
  set dashed(t) {
    t === !0 !== this.dashed && (this.needsUpdate = !0), t === !0 ? this.defines.USE_DASH = "" : delete this.defines.USE_DASH;
  }
  /**
   * The scale of the dashes and gaps.
   *
   * @type {number}
   * @default 1
   */
  get dashScale() {
    return this.uniforms.dashScale.value;
  }
  set dashScale(t) {
    this.uniforms.dashScale.value = t;
  }
  /**
   * The size of the dash.
   *
   * @type {number}
   * @default 1
   */
  get dashSize() {
    return this.uniforms.dashSize.value;
  }
  set dashSize(t) {
    this.uniforms.dashSize.value = t;
  }
  /**
   * Where in the dash cycle the dash starts.
   *
   * @type {number}
   * @default 0
   */
  get dashOffset() {
    return this.uniforms.dashOffset.value;
  }
  set dashOffset(t) {
    this.uniforms.dashOffset.value = t;
  }
  /**
   * The size of the gap.
   *
   * @type {number}
   * @default 0
   */
  get gapSize() {
    return this.uniforms.gapSize.value;
  }
  set gapSize(t) {
    this.uniforms.gapSize.value = t;
  }
  /**
   * The opacity.
   *
   * @type {number}
   * @default 1
   */
  get opacity() {
    return this.uniforms.opacity.value;
  }
  set opacity(t) {
    this.uniforms && (this.uniforms.opacity.value = t);
  }
  /**
   * The size of the viewport, in screen pixels. This must be kept updated to make
   * screen-space rendering accurate.The `LineSegments2.onBeforeRender` callback
   * performs the update for visible objects.
   *
   * @type {Vector2}
   */
  get resolution() {
    return this.uniforms.resolution.value;
  }
  set resolution(t) {
    this.uniforms.resolution.value.copy(t);
  }
  /**
   * Whether to use alphaToCoverage or not. When enabled, this can improve the
   * anti-aliasing of line edges when using MSAA.
   *
   * @type {boolean}
   */
  get alphaToCoverage() {
    return "USE_ALPHA_TO_COVERAGE" in this.defines;
  }
  set alphaToCoverage(t) {
    this.defines && (t === !0 !== this.alphaToCoverage && (this.needsUpdate = !0), t === !0 ? this.defines.USE_ALPHA_TO_COVERAGE = "" : delete this.defines.USE_ALPHA_TO_COVERAGE);
  }
}
const at = new Re(), Qt = new R(), es = new R(), O = new Re(), G = new Re(), $ = new Re(), rt = new R(), lt = new de(), F = new gi(), ts = new R(), Fe = new qe(), Be = new kt(), X = new Re();
let Y, ce;
function ss(m, t, e) {
  return X.set(0, 0, -t, 1).applyMatrix4(m.projectionMatrix), X.multiplyScalar(1 / X.w), X.x = ce / e.width, X.y = ce / e.height, X.applyMatrix4(m.projectionMatrixInverse), X.multiplyScalar(1 / X.w), Math.abs(Math.max(X.x, X.y));
}
function un(m, t) {
  const e = m.matrixWorld, s = m.geometry, i = s.attributes.instanceStart, n = s.attributes.instanceEnd, o = Math.min(s.instanceCount, i.count);
  for (let a = 0, r = o; a < r; a++) {
    F.start.fromBufferAttribute(i, a), F.end.fromBufferAttribute(n, a), F.applyMatrix4(e);
    const l = new R(), c = new R();
    Y.distanceSqToSegment(F.start, F.end, c, l), c.distanceTo(l) < ce * 0.5 && t.push({
      point: c,
      pointOnLine: l,
      distance: Y.origin.distanceTo(c),
      object: m,
      face: null,
      faceIndex: a,
      uv: null,
      uv1: null
    });
  }
}
function gn(m, t, e) {
  const s = t.projectionMatrix, n = m.material.resolution, o = m.matrixWorld, a = m.geometry, r = a.attributes.instanceStart, l = a.attributes.instanceEnd, c = Math.min(a.instanceCount, r.count), d = -t.near;
  Y.at(1, $), $.w = 1, $.applyMatrix4(t.matrixWorldInverse), $.applyMatrix4(s), $.multiplyScalar(1 / $.w), $.x *= n.x / 2, $.y *= n.y / 2, $.z = 0, rt.copy($), lt.multiplyMatrices(t.matrixWorldInverse, o);
  for (let h = 0, p = c; h < p; h++) {
    if (O.fromBufferAttribute(r, h), G.fromBufferAttribute(l, h), O.w = 1, G.w = 1, O.applyMatrix4(lt), G.applyMatrix4(lt), O.z > d && G.z > d)
      continue;
    if (O.z > d) {
      const v = O.z - G.z, I = (O.z - d) / v;
      O.lerp(G, I);
    } else if (G.z > d) {
      const v = G.z - O.z, I = (G.z - d) / v;
      G.lerp(O, I);
    }
    O.applyMatrix4(s), G.applyMatrix4(s), O.multiplyScalar(1 / O.w), G.multiplyScalar(1 / G.w), O.x *= n.x / 2, O.y *= n.y / 2, G.x *= n.x / 2, G.y *= n.y / 2, F.start.copy(O), F.start.z = 0, F.end.copy(G), F.end.z = 0;
    const C = F.closestPointToPointParameter(rt, !0);
    F.at(C, ts);
    const b = Cs.lerp(O.z, G.z, C), y = b >= -1 && b <= 1, w = rt.distanceTo(ts) < ce * 0.5;
    if (y && w) {
      F.start.fromBufferAttribute(r, h), F.end.fromBufferAttribute(l, h), F.start.applyMatrix4(o), F.end.applyMatrix4(o);
      const v = new R(), I = new R();
      Y.distanceSqToSegment(F.start, F.end, I, v), e.push({
        point: I,
        pointOnLine: v,
        distance: Y.origin.distanceTo(I),
        object: m,
        face: null,
        faceIndex: h,
        uv: null,
        uv1: null
      });
    }
  }
}
class pn extends bs {
  /**
   * Constructs a new wide line.
   *
   * @param {LineSegmentsGeometry} [geometry] - The line geometry.
   * @param {LineMaterial} [material] - The line material.
   */
  constructor(t = new Ss(), e = new Tt({ color: Math.random() * 16777215 })) {
    super(t, e), this.isLineSegments2 = !0, this.type = "LineSegments2";
  }
  /**
   * Computes an array of distance values which are necessary for rendering dashed lines.
   * For each vertex in the geometry, the method calculates the cumulative length from the
   * current point to the very beginning of the line.
   *
   * @return {LineSegments2} A reference to this instance.
   */
  computeLineDistances() {
    const t = this.geometry, e = t.attributes.instanceStart, s = t.attributes.instanceEnd, i = new Float32Array(2 * e.count);
    for (let o = 0, a = 0, r = e.count; o < r; o++, a += 2)
      Qt.fromBufferAttribute(e, o), es.fromBufferAttribute(s, o), i[a] = a === 0 ? 0 : i[a - 1], i[a + 1] = i[a] + Qt.distanceTo(es);
    const n = new pt(i, 2, 1);
    return t.setAttribute("instanceDistanceStart", new le(n, 1, 0)), t.setAttribute("instanceDistanceEnd", new le(n, 1, 1)), this;
  }
  /**
   * Computes intersection points between a casted ray and this instance.
   *
   * @param {Raycaster} raycaster - The raycaster.
   * @param {Array<Object>} intersects - The target array that holds the intersection points.
   */
  raycast(t, e) {
    const s = this.material.worldUnits, i = t.camera;
    i === null && !s && console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');
    const n = t.params.Line2 !== void 0 && t.params.Line2.threshold || 0;
    Y = t.ray;
    const o = this.matrixWorld, a = this.geometry, r = this.material;
    ce = r.linewidth + n, a.boundingSphere === null && a.computeBoundingSphere(), Be.copy(a.boundingSphere).applyMatrix4(o);
    let l;
    if (s)
      l = ce * 0.5;
    else {
      const d = Math.max(i.near, Be.distanceToPoint(Y.origin));
      l = ss(i, d, r.resolution);
    }
    if (Be.radius += l, Y.intersectsSphere(Be) === !1)
      return;
    a.boundingBox === null && a.computeBoundingBox(), Fe.copy(a.boundingBox).applyMatrix4(o);
    let c;
    if (s)
      c = ce * 0.5;
    else {
      const d = Math.max(i.near, Fe.distanceToPoint(Y.origin));
      c = ss(i, d, r.resolution);
    }
    Fe.expandByScalar(c), Y.intersectsBox(Fe) !== !1 && (s ? un(this, e) : gn(this, i, e));
  }
  onBeforeRender(t) {
    const e = this.material.uniforms;
    e && e.resolution && (t.getViewport(at), this.material.uniforms.resolution.value.set(at.z, at.w));
  }
}
class Es extends Ss {
  /**
   * Constructs a new line geometry.
   */
  constructor() {
    super(), this.isLineGeometry = !0, this.type = "LineGeometry";
  }
  /**
   * Sets the given line positions for this geometry.
   *
   * @param {Float32Array|Array<number>} array - The position data to set.
   * @return {LineGeometry} A reference to this geometry.
   */
  setPositions(t) {
    const e = t.length - 3, s = new Float32Array(2 * e);
    for (let i = 0; i < e; i += 3)
      s[2 * i] = t[i], s[2 * i + 1] = t[i + 1], s[2 * i + 2] = t[i + 2], s[2 * i + 3] = t[i + 3], s[2 * i + 4] = t[i + 4], s[2 * i + 5] = t[i + 5];
    return super.setPositions(s), this;
  }
  /**
   * Sets the given line colors for this geometry.
   *
   * @param {Float32Array|Array<number>} array - The position data to set.
   * @return {LineGeometry} A reference to this geometry.
   */
  setColors(t) {
    const e = t.length - 3, s = new Float32Array(2 * e);
    for (let i = 0; i < e; i += 3)
      s[2 * i] = t[i], s[2 * i + 1] = t[i + 1], s[2 * i + 2] = t[i + 2], s[2 * i + 3] = t[i + 3], s[2 * i + 4] = t[i + 4], s[2 * i + 5] = t[i + 5];
    return super.setColors(s), this;
  }
  /**
   * Setups this line segments geometry from the given sequence of points.
   *
   * @param {Array<Vector3|Vector2>} points - An array of points in 2D or 3D space.
   * @return {LineGeometry} A reference to this geometry.
   */
  setFromPoints(t) {
    const e = t.length - 1, s = new Float32Array(6 * e);
    for (let i = 0; i < e; i++)
      s[6 * i] = t[i].x, s[6 * i + 1] = t[i].y, s[6 * i + 2] = t[i].z || 0, s[6 * i + 3] = t[i + 1].x, s[6 * i + 4] = t[i + 1].y, s[6 * i + 5] = t[i + 1].z || 0;
    return super.setPositions(s), this;
  }
  /**
   * Setups this line segments geometry from the given line.
   *
   * @param {Line} line - The line that should be used as a data source for this geometry.
   * @return {LineGeometry} A reference to this geometry.
   */
  fromLine(t) {
    const e = t.geometry;
    return this.setPositions(e.attributes.position.array), this;
  }
}
class _s extends pn {
  /**
   * Constructs a new wide line.
   *
   * @param {LineGeometry} [geometry] - The line geometry.
   * @param {LineMaterial} [material] - The line material.
   */
  constructor(t = new Es(), e = new Tt({ color: Math.random() * 16777215 })) {
    super(t, e), this.isLine2 = !0, this.type = "Line2";
  }
}
class mn extends U {
  constructor(e, s) {
    super(e, s);
    g(this, "scene", null);
    g(this, "cssScene", null);
    g(this, "renderGL", null);
    g(this, "renderCSS3D", null);
    g(this, "composer", null);
    g(this, "clock", null);
    g(this, "bloomEffect", null);
    g(this, "ssaoEffect", null);
    g(this, "outlineEffect", null);
    g(this, "normalPass", null);
    g(this, "selection", null);
    g(this, "renderPass", null);
    g(this, "normalPassInstance", null);
    g(this, "effectPassBloom", null);
    g(this, "effectPassSSAO", null);
    g(this, "effectPassOutline", null);
    g(this, "effectsConfig", {
      bloom: {
        enabled: !0,
        intensity: 0.5,
        kernelSize: Bt.MEDIUM,
        luminanceThreshold: 0.85,
        luminanceSmoothing: 0.4
      },
      ssao: {
        enabled: !0,
        blendFunction: Vt.MULTIPLY,
        samples: 16,
        rings: 4,
        distanceThreshold: 0.05,
        distanceFalloff: 0.01,
        rangeThreshold: 5e-3,
        rangeFalloff: 1e-3,
        luminanceInfluence: 0.6,
        radius: 15,
        scale: 0.6,
        bias: 0.03,
        intensity: 1.5,
        color: 0
      },
      outline: {
        enabled: !0,
        blendFunction: Vt.SCREEN,
        edgeStrength: 2.5,
        pulseSpeed: 0,
        visibleEdgeColor: 16755200,
        hiddenEdgeColor: 2230538,
        kernelSize: Bt.VERY_SMALL,
        blur: !1,
        xRay: !0
      }
    });
    g(this, "css3dContainer", null);
    g(this, "webglCanvas", null);
    g(this, "background", { color: 1710621, alpha: 1 });
    g(this, "managedLights", /* @__PURE__ */ new Map());
    g(this, "instancedMeshManager", null);
    g(this, "_onWindowResize", () => {
      var n, o;
      const e = (o = (n = this.pluginManager) == null ? void 0 : n.getPlugin("CameraPlugin")) == null ? void 0 : o.getCameraInstance();
      if (!e || !this.renderGL || !this.renderCSS3D || !this.composer) return;
      const { innerWidth: s, innerHeight: i } = window;
      e.aspect = s / i, e.updateProjectionMatrix(), this.renderGL.setSize(s, i), this.composer.setSize(s, i), this.renderCSS3D.setSize(s, i), this.space.emit("renderer:resize", { width: s, height: i });
    });
    this.scene = new u.Scene(), this.cssScene = new u.Scene(), this.clock = new u.Clock();
  }
  getName() {
    return "RenderingPlugin";
  }
  init() {
    super.init(), this._setupRenderersAndComposer(), this._setupLighting(), this.setBackground(this.background.color, this.background.alpha), this.instancedMeshManager = new hn(this.scene), window.addEventListener("resize", this._onWindowResize, !1), this._setupSelectionListener(), this._rebuildEffectPasses();
  }
  _setupSelectionListener() {
    this.space.on("selection:changed", this.handleSelectionChange.bind(this));
  }
  handleSelectionChange(e) {
    var s;
    !this.outlineEffect || !this.selection || !this.effectsConfig.outline.enabled || (this.selection.clear(), (s = e.selected) == null || s.forEach((i) => {
      const n = i.mesh || i.line;
      n && this._isObjectInMainScene(n) && (n instanceof u.Mesh || n instanceof _s || n instanceof u.Line) && this.selection.add(n);
    }));
  }
  _isObjectInMainScene(e) {
    let s = e;
    for (; s; ) {
      if (s === this.scene) return !0;
      s = s.parent;
    }
    return !1;
  }
  update() {
    var i, n, o, a, r, l, c;
    const e = (n = (i = this.pluginManager) == null ? void 0 : i.getPlugin("CameraPlugin")) == null ? void 0 : n.getCameraInstance(), s = this.clock.getDelta();
    e && this.composer && this.composer.renderer ? (this.composer.render(s), (o = this.renderCSS3D) == null || o.render(this.cssScene, e)) : e && this.renderGL && (this.renderGL.render(this.scene, e), (a = this.renderCSS3D) == null || a.render(this.cssScene, e)), (c = (l = (r = this.pluginManager) == null ? void 0 : r.getPlugin("MinimapPlugin")) == null ? void 0 : l.render) == null || c.call(l, this.renderGL);
  }
  _setupRenderersAndComposer() {
    var s, i, n;
    if (!((s = this.space) != null && s.container)) {
      console.error("RenderingPlugin: SpaceGraph container not available.");
      return;
    }
    const e = (n = (i = this.pluginManager) == null ? void 0 : i.getPlugin("CameraPlugin")) == null ? void 0 : n.getCameraInstance();
    if (!e) {
      console.error("RenderingPlugin: Camera instance not available.");
      return;
    }
    this.webglCanvas = M("#webgl-canvas") || document.createElement("canvas"), this.webglCanvas.id = "webgl-canvas", this.webglCanvas.parentNode || this.space.container.appendChild(this.webglCanvas), this.renderGL = new u.WebGLRenderer({
      canvas: this.webglCanvas,
      powerPreference: "high-performance",
      antialias: !1,
      stencil: !0,
      depth: !0,
      alpha: !0
    }), this.renderGL.setSize(window.innerWidth, window.innerHeight), this.renderGL.setPixelRatio(window.devicePixelRatio), this.renderGL.outputColorSpace = u.SRGBColorSpace, this.renderGL.shadowMap.enabled = !0, this.renderGL.shadowMap.type = u.PCFSoftShadowMap, this.composer = new bi(this.renderGL), this.renderPass = new Ci(this.scene, e), this.composer.addPass(this.renderPass), this.renderCSS3D = new Ei(), this.renderCSS3D.setSize(window.innerWidth, window.innerHeight), this.css3dContainer = M("#css3d-container"), this.css3dContainer || (this.css3dContainer = document.createElement("div"), this.css3dContainer.id = "css3d-container", this.space.container.appendChild(this.css3dContainer)), this.css3dContainer.appendChild(this.renderCSS3D.domElement), Object.assign(this.renderCSS3D.domElement.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none"
    });
  }
  _rebuildEffectPasses() {
    var s, i, n, o, a, r, l, c, d;
    if (!this.composer || !this.renderPass || !this.composer.renderer) return;
    const e = (i = (s = this.pluginManager) == null ? void 0 : s.getPlugin("CameraPlugin")) == null ? void 0 : i.getCameraInstance();
    e && ((n = this.normalPassInstance) == null || n.dispose(), this.composer.removePass(this.normalPassInstance), this.normalPassInstance = null, (o = this.effectPassSSAO) == null || o.dispose(), this.composer.removePass(this.effectPassSSAO), this.effectPassSSAO = null, (a = this.effectPassOutline) == null || a.dispose(), this.composer.removePass(this.effectPassOutline), this.effectPassOutline = null, (r = this.effectPassBloom) == null || r.dispose(), this.composer.removePass(this.effectPassBloom), this.effectPassBloom = null, (l = this.ssaoEffect) == null || l.dispose(), this.ssaoEffect = null, (c = this.outlineEffect) == null || c.dispose(), this.outlineEffect = null, (d = this.bloomEffect) == null || d.dispose(), this.bloomEffect = null, this.effectsConfig.ssao.enabled && (this.normalPassInstance = new vi(this.scene, e, { renderTarget: new u.WebGLRenderTarget(1, 1, { minFilter: u.LinearFilter, magFilter: u.LinearFilter, format: u.RGBAFormat }) }), this.composer.addPass(this.normalPassInstance), this.ssaoEffect = new wi(e, this.normalPassInstance.texture, this.effectsConfig.ssao), this.effectPassSSAO = new st(e, this.ssaoEffect), this.composer.addPass(this.effectPassSSAO)), this.effectsConfig.outline.enabled && (this.selection ?? (this.selection = new Ii()), this.outlineEffect = new Mi(this.scene, e, this.effectsConfig.outline), this.outlineEffect.selection = this.selection, this.effectPassOutline = new st(e, this.outlineEffect), this.composer.addPass(this.effectPassOutline)), this.effectsConfig.bloom.enabled && (this.bloomEffect = new xi(this.effectsConfig.bloom), this.effectPassBloom = new st(e, this.bloomEffect), this.composer.addPass(this.effectPassBloom)));
  }
  setEffectEnabled(e, s) {
    if (!this.effectsConfig[e]) return console.warn(`RenderingPlugin: Effect "${e}" not found.`);
    this.effectsConfig[e].enabled = s, this._rebuildEffectPasses(), this.space.emit("effect:enabled:changed", { effectName: e, enabled: s });
  }
  configureEffect(e, s) {
    if (!this.effectsConfig[e]) return console.warn(`RenderingPlugin: Effect "${e}" not found.`);
    Object.assign(this.effectsConfig[e], s), this._rebuildEffectPasses(), this.space.emit("effect:settings:changed", { effectName: e, settings: s });
  }
  getEffectConfiguration(e) {
    return this.effectsConfig[e] ? { ...this.effectsConfig[e] } : null;
  }
  addLight(e, s, i = {}) {
    var r, l, c, d, h, p;
    if (this.managedLights.has(e)) return this.managedLights.get(e);
    let n;
    const o = i.color ?? 16777215, a = i.intensity ?? 1;
    switch (s.toLowerCase()) {
      case "ambient":
        n = new u.AmbientLight(o, a);
        break;
      case "directional":
        if (n = new u.DirectionalLight(o, a), n.position.set(((r = i.position) == null ? void 0 : r.x) ?? 50, ((l = i.position) == null ? void 0 : l.y) ?? 100, ((c = i.position) == null ? void 0 : c.z) ?? 75), i.target instanceof u.Object3D ? n.target = i.target : i.target instanceof u.Vector3 ? n.target.position.copy(i.target) : n.target.position.set(0, 0, 0), this.scene.add(n.target), i.castShadow !== !1) {
          n.castShadow = !0, n.shadow.mapSize.width = i.shadowMapSizeWidth ?? 2048, n.shadow.mapSize.height = i.shadowMapSizeHeight ?? 2048, n.shadow.camera.near = i.shadowCameraNear ?? 0.5, n.shadow.camera.far = i.shadowCameraFar ?? 500;
          const f = i.shadowCameraSize ?? 100;
          n.shadow.camera.left = -f, n.shadow.camera.right = f, n.shadow.camera.top = f, n.shadow.camera.bottom = -f;
        }
        break;
      case "point":
        n = new u.PointLight(o, a, i.distance ?? 1e3, i.decay ?? 2), n.position.set(((d = i.position) == null ? void 0 : d.x) ?? 0, ((h = i.position) == null ? void 0 : h.y) ?? 0, ((p = i.position) == null ? void 0 : p.z) ?? 0), i.castShadow && (n.castShadow = !0, n.shadow.mapSize.width = i.shadowMapSizeWidth ?? 1024, n.shadow.mapSize.height = i.shadowMapSizeHeight ?? 1024, n.shadow.camera.near = i.shadowCameraNear ?? 0.5, n.shadow.camera.far = i.shadowCameraFar ?? 500);
        break;
      default:
        return console.error(`RenderingPlugin: Unknown light type '${s}'`), null;
    }
    return n ? (n.userData.lightId = e, this.managedLights.set(e, n), this.scene.add(n), this.space.emit("light:added", { id: e, type: s, light: n }), n) : null;
  }
  removeLight(e) {
    var i, n;
    const s = this.managedLights.get(e);
    return s ? (((i = s.target) == null ? void 0 : i.parent) === this.scene && this.scene.remove(s.target), this.scene.remove(s), (n = s.dispose) == null || n.call(s), this.managedLights.delete(e), this.space.emit("light:removed", { id: e }), !0) : console.warn(`RenderingPlugin: Light '${e}' not found.`) || !1;
  }
  getLight(e) {
    return this.managedLights.get(e);
  }
  configureLight(e, s) {
    var n;
    const i = this.managedLights.get(e);
    if (!i) return !1;
    if (s.color !== void 0 && i.color.set(s.color), s.intensity !== void 0 && (i.intensity = s.intensity), s.position && ((n = i.position) == null || n.set(s.position.x, s.position.y, s.position.z)), s.castShadow !== void 0 && i.castShadow !== void 0 && (i.castShadow = s.castShadow), i.shadow) {
      if (s.shadowMapSizeWidth !== void 0 && (i.shadow.mapSize.width = s.shadowMapSizeWidth), s.shadowMapSizeHeight !== void 0 && (i.shadow.mapSize.height = s.shadowMapSizeHeight), s.shadowCameraNear !== void 0 && (i.shadow.camera.near = s.shadowCameraNear), s.shadowCameraFar !== void 0 && (i.shadow.camera.far = s.shadowCameraFar), i.shadow.camera instanceof u.OrthographicCamera && s.shadowCameraSize !== void 0) {
        const o = s.shadowCameraSize;
        i.shadow.camera.left = -o, i.shadow.camera.right = o, i.shadow.camera.top = o, i.shadow.camera.bottom = -o;
      }
      i.shadow.camera.updateProjectionMatrix();
    }
    return this.space.emit("light:configured", { id: e, light: i, options: s }), !0;
  }
  _setupLighting() {
    this.addLight("defaultAmbient", "ambient", { intensity: 0.8 }), this.addLight("defaultDirectional", "directional", {
      intensity: 1.2,
      position: { x: 150, y: 200, z: 100 },
      castShadow: !0,
      shadowMapSizeWidth: 2048,
      shadowMapSizeHeight: 2048,
      shadowCameraNear: 10,
      shadowCameraFar: 600,
      shadowCameraSize: 150
    });
  }
  setBackground(e = 0, s = 0) {
    var i;
    this.background = { color: e, alpha: s }, (i = this.renderGL) == null || i.setClearColor(e, s), this.webglCanvas && (this.webglCanvas.style.backgroundColor = s === 0 ? "transparent" : `#${new u.Color(e).getHexString()}`);
  }
  _updateFrustumHelper() {
    var h;
    const e = (h = this.pluginManager.getPlugin("CameraPlugin")) == null ? void 0 : h.getCameraInstance();
    if (!this.frustumHelper || !e) {
      this.frustumHelper && (this.frustumHelper.visible = !1);
      return;
    }
    e.updateMatrixWorld(), e.updateProjectionMatrix();
    const s = [], i = [
      new u.Vector3(-1, -1, -1),
      // Near bottom left
      new u.Vector3(1, -1, -1),
      // Near bottom right
      new u.Vector3(1, 1, -1),
      // Near top right
      new u.Vector3(-1, 1, -1),
      // Near top left
      new u.Vector3(-1, -1, 1),
      // Far bottom left
      new u.Vector3(1, -1, 1),
      // Far bottom right
      new u.Vector3(1, 1, 1),
      // Far top right
      new u.Vector3(-1, 1, 1)
      // Far top left
    ];
    for (let p = 0; p < 8; p++)
      s.push(i[p].clone().unproject(e));
    const n = s.map((p) => new u.Vector3(p.x, p.y, 0));
    let o = 1 / 0, a = -1 / 0, r = 1 / 0, l = -1 / 0;
    n.forEach((p) => {
      o = Math.min(o, p.x), a = Math.max(a, p.x), r = Math.min(r, p.y), l = Math.max(l, p.y);
    });
    const c = [
      o,
      r,
      0,
      a,
      r,
      0,
      a,
      l,
      0,
      o,
      l,
      0
    ], d = new Float32Array([
      c[0],
      c[1],
      c[2],
      c[3],
      c[4],
      c[5],
      c[3],
      c[4],
      c[5],
      c[6],
      c[7],
      c[8],
      c[6],
      c[7],
      c[8],
      c[9],
      c[10],
      c[11],
      c[9],
      c[10],
      c[11],
      c[0],
      c[1],
      c[2]
    ]);
    this.frustumHelper.geometry.setAttribute("position", new u.BufferAttribute(d, 3)), this.frustumHelper.geometry.attributes.position.needsUpdate = !0, this.frustumHelper.geometry.computeBoundingSphere(), this.frustumHelper.visible = !0;
  }
  getWebGLScene() {
    return this.scene;
  }
  getCSS3DScene() {
    return this.cssScene;
  }
  getInstancedMeshManager() {
    return this.instancedMeshManager;
  }
  getCSS3DRenderer() {
    return this.renderCSS3D;
  }
  dispose() {
    var e, s, i, n, o, a, r, l, c, d, h, p, f, C, b, y, w, v;
    super.dispose(), window.removeEventListener("resize", this._onWindowResize), this.space.off("selection:changed", this.handleSelectionChange), (e = this.instancedMeshManager) == null || e.dispose(), this.instancedMeshManager = null, (s = this.effectPassBloom) == null || s.dispose(), (i = this.effectPassSSAO) == null || i.dispose(), (n = this.effectPassOutline) == null || n.dispose(), (o = this.normalPassInstance) == null || o.dispose(), (a = this.bloomEffect) == null || a.dispose(), (r = this.ssaoEffect) == null || r.dispose(), (l = this.outlineEffect) == null || l.dispose(), (c = this.selection) == null || c.dispose(), (d = this.composer) == null || d.dispose(), (h = this.renderPass) == null || h.dispose(), (p = this.renderGL) == null || p.dispose(), (C = (f = this.renderCSS3D) == null ? void 0 : f.domElement) == null || C.remove(), (b = this.css3dContainer) == null || b.remove(), (y = this.scene) == null || y.traverse((I) => {
      var x;
      (x = I.geometry) == null || x.dispose(), I.material && (Array.isArray(I.material) ? I.material.forEach((A) => A.dispose()) : I.material.dispose());
    }), (w = this.scene) == null || w.clear(), (v = this.cssScene) == null || v.clear(), this.scene = null, this.cssScene = null, this.renderGL = null;
  }
}
const ue = new mi(0, 0, 0, "YXZ"), ge = new R(), fn = { type: "change" }, yn = { type: "lock" }, bn = { type: "unlock" }, is = 2e-3, ns = Math.PI / 2;
class Cn extends pi {
  /**
   * Constructs a new controls instance.
   *
   * @param {Camera} camera - The camera that is managed by the controls.
   * @param {?HTMLDOMElement} domElement - The HTML element used for event listeners.
   */
  constructor(t, e = null) {
    super(t, e), this.isLocked = !1, this.minPolarAngle = 0, this.maxPolarAngle = Math.PI, this.pointerSpeed = 1, this._onMouseMove = vn.bind(this), this._onPointerlockChange = wn.bind(this), this._onPointerlockError = In.bind(this), this.domElement !== null && this.connect(this.domElement);
  }
  connect(t) {
    super.connect(t), this.domElement.ownerDocument.addEventListener("mousemove", this._onMouseMove), this.domElement.ownerDocument.addEventListener("pointerlockchange", this._onPointerlockChange), this.domElement.ownerDocument.addEventListener("pointerlockerror", this._onPointerlockError);
  }
  disconnect() {
    this.domElement.ownerDocument.removeEventListener("mousemove", this._onMouseMove), this.domElement.ownerDocument.removeEventListener("pointerlockchange", this._onPointerlockChange), this.domElement.ownerDocument.removeEventListener("pointerlockerror", this._onPointerlockError);
  }
  dispose() {
    this.disconnect();
  }
  getObject() {
    return console.warn("THREE.PointerLockControls: getObject() has been deprecated. Use controls.object instead."), this.object;
  }
  /**
   * Returns the look direction of the camera.
   *
   * @param {Vector3} v - The target vector that is used to store the method's result.
   * @return {Vector3} The normalized direction vector.
   */
  getDirection(t) {
    return t.set(0, 0, -1).applyQuaternion(this.object.quaternion);
  }
  /**
   * Moves the camera forward parallel to the xz-plane. Assumes camera.up is y-up.
   *
   * @param {number} distance - The signed distance.
   */
  moveForward(t) {
    if (this.enabled === !1) return;
    const e = this.object;
    ge.setFromMatrixColumn(e.matrix, 0), ge.crossVectors(e.up, ge), e.position.addScaledVector(ge, t);
  }
  /**
   * Moves the camera sidewards parallel to the xz-plane.
   *
   * @param {number} distance - The signed distance.
   */
  moveRight(t) {
    if (this.enabled === !1) return;
    const e = this.object;
    ge.setFromMatrixColumn(e.matrix, 0), e.position.addScaledVector(ge, t);
  }
  /**
   * Activates the pointer lock.
   *
   * @param {boolean} [unadjustedMovement=false] - Disables OS-level adjustment for mouse acceleration, and accesses raw mouse input instead.
   * Setting it to true will disable mouse acceleration.
   */
  lock(t = !1) {
    this.domElement.requestPointerLock({
      unadjustedMovement: t
    });
  }
  /**
   * Exits the pointer lock.
   */
  unlock() {
    this.domElement.ownerDocument.exitPointerLock();
  }
}
function vn(m) {
  if (this.enabled === !1 || this.isLocked === !1) return;
  const t = this.object;
  ue.setFromQuaternion(t.quaternion), ue.y -= m.movementX * is * this.pointerSpeed, ue.x -= m.movementY * is * this.pointerSpeed, ue.x = Math.max(ns - this.maxPolarAngle, Math.min(ns - this.minPolarAngle, ue.x)), t.quaternion.setFromEuler(ue), this.dispatchEvent(fn);
}
function wn() {
  this.domElement.ownerDocument.pointerLockElement === this.domElement ? (this.dispatchEvent(yn), this.isLocked = !0) : (this.dispatchEvent(bn), this.isLocked = !1);
}
function In() {
  console.error("THREE.PointerLockControls: Unable to use Pointer Lock API");
}
const _ = {
  // Added export here
  ORBIT: "orbit",
  FREE: "free",
  TOP_DOWN: "top_down",
  FIRST_PERSON: "first_person"
};
class Mn {
  constructor(t) {
    g(this, "space", null);
    g(this, "_cam", null);
    g(this, "domElement", null);
    g(this, "targetPosition", new u.Vector3());
    g(this, "targetLookAt", new u.Vector3());
    g(this, "currentPosition", new u.Vector3());
    g(this, "currentLookAt", new u.Vector3());
    g(this, "isPanning", !1);
    g(this, "panStart", new u.Vector2());
    g(this, "viewHistory", []);
    g(this, "maxHistory", 20);
    g(this, "currentTargetNodeId", null);
    g(this, "initialState", null);
    g(this, "zoomSpeed", 1);
    g(this, "panSpeed", 0.8);
    g(this, "minZoomDistance", 10);
    g(this, "maxZoomDistance", 15e3);
    g(this, "dampingFactor", 0.12);
    g(this, "animationFrameId", null);
    g(this, "namedViews", /* @__PURE__ */ new Map());
    g(this, "cameraMode", _.ORBIT);
    g(this, "freeCameraSpeed", 250);
    g(this, "freeCameraVerticalSpeed", 180);
    g(this, "pointerLockControls", null);
    g(this, "isPointerLocked", !1);
    g(this, "moveState", {
      forward: !1,
      backward: !1,
      left: !1,
      right: !1,
      up: !1,
      down: !1
    });
    g(this, "prevTime", performance.now());
    g(this, "followTargetObject", null);
    g(this, "followOptions", {
      distance: 300,
      damping: 0.05,
      offset: new u.Vector3(0, 50, 0),
      autoEndOnManualControl: !0
    });
    g(this, "isFollowing", !1);
    g(this, "_isManuallyControlled", !1);
    g(this, "endPan", () => {
      this.isPanning && (this.isPanning = !1, this.domElement.classList.remove("panning"), this._isManuallyControlled = !1);
    });
    g(this, "getCurrentTargetNodeId", () => this.currentTargetNodeId);
    g(this, "setCurrentTargetNodeId", (t) => {
      this.currentTargetNodeId = t;
    });
    g(this, "_startUpdateLoop", () => {
      this.animationFrameId = requestAnimationFrame(this._updateCameraLogic);
    });
    g(this, "_updateCameraLogic", () => {
      const t = performance.now(), e = (t - this.prevTime) / 1e3;
      this.prevTime = t;
      let s = !0;
      if ((this.cameraMode === _.FREE || this.cameraMode === _.FIRST_PERSON) && this.isPointerLocked) {
        const i = this.freeCameraSpeed * e, n = this.freeCameraVerticalSpeed * e;
        let o = !1;
        if (this.moveState.forward && (this.pointerLockControls.moveForward(i), o = !0), this.moveState.backward && (this.pointerLockControls.moveForward(-i), o = !0), this.moveState.left && (this.pointerLockControls.moveRight(-i), o = !0), this.moveState.right && (this.pointerLockControls.moveRight(i), o = !0), this.cameraMode === _.FREE && (this.moveState.up && (this._cam.position.y += n, o = !0), this.moveState.down && (this._cam.position.y -= n, o = !0)), o) {
          this.targetPosition.copy(this._cam.position);
          const a = new u.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
          this.targetLookAt.copy(this._cam.position).add(a), this.currentPosition.copy(this._cam.position), this.currentLookAt.copy(this.targetLookAt), s = !1;
        }
      } else if (this.cameraMode === _.TOP_DOWN) {
        this.targetLookAt.x = this.targetPosition.x, this.targetLookAt.z = this.targetPosition.z, this.targetLookAt.y = 0, this.currentPosition.lerp(this.targetPosition, this.dampingFactor), this.currentLookAt.lerp(this.targetLookAt, this.dampingFactor), this._cam.position.copy(this.currentPosition), this._cam.lookAt(this.currentLookAt);
        const i = 1e-3;
        this.currentPosition.distanceTo(this.targetPosition) < i && this.currentLookAt.distanceTo(this.targetLookAt) < i && (this.currentPosition.copy(this.targetPosition), this.currentLookAt.copy(this.targetLookAt)), s = !1;
      }
      if (this.isFollowing && this.followTargetObject && !this._isManuallyControlled) {
        const i = this.followTargetObject.isVector3 ? this.followTargetObject : this.followTargetObject.position;
        if (i) {
          const n = i.clone().add(this.followOptions.offset);
          this.targetLookAt.lerp(n, this.followOptions.damping);
          const o = new u.Vector3().subVectors(this.currentPosition, this.targetLookAt).normalize(), a = this.targetLookAt.clone().addScaledVector(o, this.followOptions.distance);
          this.targetPosition.lerp(a, this.followOptions.damping), s = !0;
        }
      }
      s && (this.currentPosition.lerp(this.targetPosition, this.dampingFactor), this.currentLookAt.lerp(this.targetLookAt, this.dampingFactor), this.currentPosition.distanceTo(this.targetPosition) <= 1e-3 && this.currentPosition.copy(this.targetPosition), this.currentLookAt.distanceTo(this.targetLookAt) <= 1e-3 && this.currentLookAt.copy(this.targetLookAt), this._cam.position.copy(this.currentPosition), this._cam.lookAt(this.currentLookAt)), this.animationFrameId = requestAnimationFrame(this._updateCameraLogic);
    });
    g(this, "getNamedViews", () => Array.from(this.namedViews.keys()));
    g(this, "hasNamedView", (t) => this.namedViews.has(t));
    if (!(t != null && t._cam) || !t.container) throw new Error("Camera requires SpaceGraph instance.");
    this.space = t, this._cam = t._cam, this.domElement = t.container, this.currentPosition.copy(this._cam.position), this.targetPosition.copy(this._cam.position), this.currentLookAt.set(this._cam.position.x, this._cam.position.y, 0), this.targetLookAt.copy(this.currentLookAt), this._initializePointerLockControls(), this._loadNamedViewsFromStorage(), this._startUpdateLoop();
  }
  _initializePointerLockControls() {
    this.pointerLockControls = new Cn(this._cam, this.domElement), this.pointerLockControls.minPolarAngle = 0, this.pointerLockControls.maxPolarAngle = Math.PI, this.pointerLockControls.addEventListener("lock", () => {
      this.isPointerLocked = !0, Object.keys(this.moveState).forEach((t) => this.moveState[t] = !1), this.domElement.style.cursor = "none", this.space.emit("camera:pointerLockChanged", { locked: !0 });
    }), this.pointerLockControls.addEventListener("unlock", () => {
      this.isPointerLocked = !1, this.domElement.style.cursor = this.cameraMode === _.FREE ? "crosshair" : "grab", this.space.emit("camera:pointerLockChanged", { locked: !1 });
    });
  }
  setFreeCameraMovement(t, e) {
    this.cameraMode === _.FREE && t in this.moveState && (this.moveState[t] = e);
  }
  setInitialState() {
    this.initialState ?? (this.initialState = {
      position: this.targetPosition.clone(),
      lookAt: this.targetLookAt.clone(),
      mode: this.cameraMode
    });
  }
  startPan(t, e) {
    this.cameraMode !== _.ORBIT && this.cameraMode !== _.TOP_DOWN || this.isPanning || (this._isManuallyControlled = !0, this.isPanning = !0, this.panStart.set(t, e), this.domElement.classList.add("panning"), z.killTweensOf(this.targetPosition), z.killTweensOf(this.targetLookAt), this.isFollowing && this.followOptions.autoEndOnManualControl && this.stopFollowing(), this.currentTargetNodeId = null);
  }
  pan(t, e) {
    if (this.cameraMode !== _.ORBIT && this.cameraMode !== _.TOP_DOWN || !this.isPanning) return;
    const s = this.currentPosition.distanceTo(this.currentLookAt), i = this._cam.fov * T.DEG2RAD, n = this.domElement.clientHeight || window.innerHeight, a = 2 * Math.tan(i / 2) * Math.max(1, s) / n;
    let r;
    this.cameraMode === _.TOP_DOWN ? r = new u.Vector3(-t * a * this.panSpeed, 0, e * a * this.panSpeed) : r = new u.Vector3().setFromMatrixColumn(this._cam.matrixWorld, 0).multiplyScalar(-t * a * this.panSpeed).add(
      new u.Vector3().setFromMatrixColumn(this._cam.matrixWorld, 1).multiplyScalar(e * a * this.panSpeed)
    ), this.targetPosition.add(r), this.targetLookAt.add(r);
  }
  zoom(t) {
    this._isManuallyControlled = !0, z.killTweensOf(this.targetPosition), z.killTweensOf(this.targetLookAt), this.isFollowing && this.followOptions.autoEndOnManualControl && this.stopFollowing(), this.currentTargetNodeId = null;
    const e = Math.pow(0.95, t * 0.025 * this.zoomSpeed);
    if (this.cameraMode === _.TOP_DOWN) {
      let i = this.targetPosition.y * e;
      i = T.clamp(i, this.minZoomDistance, this.maxZoomDistance), this.targetPosition.y = i, this.targetLookAt.x = this.targetPosition.x, this.targetLookAt.z = this.targetPosition.z, this.targetLookAt.y = 0;
    } else {
      const s = new u.Vector3().subVectors(this.targetPosition, this.targetLookAt), i = s.length(), n = T.clamp(i * e, this.minZoomDistance, this.maxZoomDistance);
      this.targetPosition.copy(this.targetLookAt).addScaledVector(s.normalize(), n);
    }
  }
  moveTo(t, e, s, i = 0.7, n = null, o = null) {
    this._isManuallyControlled = !0, this.isFollowing && this.followOptions.autoEndOnManualControl && this.stopFollowing(), this.setInitialState();
    const a = new u.Vector3(t, e, s), r = n instanceof u.Vector3 ? n.clone() : new u.Vector3(t, e, 0);
    z.killTweensOf(this.targetPosition), z.killTweensOf(this.targetLookAt);
    const l = () => {
      this._isManuallyControlled = !1;
    };
    z.to(this.targetPosition, { x: a.x, y: a.y, z: a.z, duration: i, ease: "power3.out", overwrite: !0 }), z.to(this.targetLookAt, { x: r.x, y: r.y, z: r.z, duration: i, ease: "power3.out", overwrite: !0, onComplete: l }), o && o !== this.cameraMode && this.setCameraMode(o, !0);
  }
  resetView(t = 0.7) {
    this.initialState ? this.moveTo(this.initialState.position.x, this.initialState.position.y, this.initialState.position.z, t, this.initialState.lookAt, this.initialState.mode || _.ORBIT) : this.moveTo(0, 0, 700, t, new u.Vector3(0, 0, 0), _.ORBIT), this.viewHistory = [], this.currentTargetNodeId = null;
  }
  pushState() {
    this.viewHistory.length >= this.maxHistory && this.viewHistory.shift(), this.viewHistory.push({
      position: this.targetPosition.clone(),
      lookAt: this.targetLookAt.clone(),
      mode: this.cameraMode,
      targetNodeId: this.currentTargetNodeId
    });
  }
  popState(t = 0.6) {
    const e = this.viewHistory.pop();
    e ? this.moveTo(e.position.x, e.position.y, e.position.z, t, e.lookAt, e.mode) : this.resetView(t), this.currentTargetNodeId = (e == null ? void 0 : e.targetNodeId) || null;
  }
  startFollowing(t, e = {}) {
    t && (this.followTargetObject = t, this.followOptions = { ...this.followOptions, ...e }, this.isFollowing = !0, this._isManuallyControlled = !1, this.currentTargetNodeId = (t == null ? void 0 : t.id) || null, z.killTweensOf(this.targetPosition), z.killTweensOf(this.targetLookAt), this.space.emit("camera:followStarted", { target: this.followTargetObject, options: this.followOptions }));
  }
  stopFollowing() {
    if (this.isFollowing) {
      const t = this.followTargetObject;
      this.isFollowing = !1, this.followTargetObject = null, this.space.emit("camera:followStopped", { oldTarget: t });
    }
  }
  dispose() {
    var t;
    this.animationFrameId && cancelAnimationFrame(this.animationFrameId), (t = this.pointerLockControls) == null || t.dispose(), z.killTweensOf(this.targetPosition), z.killTweensOf(this.targetLookAt), this.space = null, this._cam = null, this.domElement = null, this.viewHistory = [], this.namedViews.clear(), this.followTargetObject = null;
  }
  _loadNamedViewsFromStorage() {
    try {
      const t = localStorage.getItem("spacegraph_namedViews");
      if (t) {
        const e = JSON.parse(t);
        Object.entries(e).forEach(([s, i]) => {
          this.namedViews.set(s, {
            position: new u.Vector3(i.position.x, i.position.y, i.position.z),
            lookAt: new u.Vector3(i.lookAt.x, i.lookAt.y, i.lookAt.z),
            mode: i.mode || _.ORBIT,
            targetNodeId: i.targetNodeId
          });
        });
      }
    } catch (t) {
      console.error("Camera: Error loading named views:", t);
    }
  }
  _saveNamedViewsToStorage() {
    try {
      const t = {};
      this.namedViews.forEach((e, s) => {
        t[s] = {
          position: { x: e.position.x, y: e.position.y, z: e.position.z },
          lookAt: { x: e.lookAt.x, y: e.lookAt.y, z: e.lookAt.z },
          mode: e.mode,
          targetNodeId: e.targetNodeId
        };
      }), localStorage.setItem("spacegraph_namedViews", JSON.stringify(t));
    } catch (t) {
      console.error("Camera: Error saving named views:", t);
    }
  }
  saveNamedView(t) {
    return !t || typeof t != "string" ? !1 : (this.namedViews.set(t, {
      position: this.targetPosition.clone(),
      lookAt: this.targetLookAt.clone(),
      mode: this.cameraMode,
      targetNodeId: this.currentTargetNodeId
    }), this._saveNamedViewsToStorage(), this.space.emit("camera:namedViewSaved", { name: t, view: this.namedViews.get(t) }), !0);
  }
  restoreNamedView(t, e = 0.7) {
    const s = this.namedViews.get(t);
    return s ? (this.moveTo(s.position.x, s.position.y, s.position.z, e, s.lookAt, s.mode), this.setCurrentTargetNodeId(s.targetNodeId), this.space.emit("camera:namedViewRestored", { name: t, view: s }), !0) : !1;
  }
  deleteNamedView(t) {
    return this.namedViews.has(t) ? (this.namedViews.delete(t), this._saveNamedViewsToStorage(), this.space.emit("camera:namedViewDeleted", { name: t }), !0) : !1;
  }
  setCameraMode(t, e = !1) {
    if (!Object.values(_).includes(t)) {
      console.warn(`Camera: Unknown mode "${t}" requested.`);
      return;
    }
    if (this.cameraMode === t && !e) return;
    const s = this.cameraMode;
    switch (this.cameraMode = t, this._isManuallyControlled = !0, (s === _.FREE || s === _.FIRST_PERSON) && this.isPointerLocked && this.pointerLockControls.unlock(), this.domElement.style.cursor = "default", this.cameraMode) {
      case _.ORBIT:
        this.domElement.style.cursor = "grab";
        break;
      case _.FREE:
        this.domElement.style.cursor = "crosshair", this.targetPosition.copy(this.currentPosition);
        const i = new u.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
        this.targetLookAt.copy(this.currentPosition).add(i);
        break;
      case _.TOP_DOWN:
        this.domElement.style.cursor = "move";
        const n = this.currentPosition.y > this.minZoomDistance ? this.currentPosition.y : Math.max(this.minZoomDistance, 500);
        this.targetPosition.set(this.currentLookAt.x, n, this.currentLookAt.z), this.targetLookAt.set(this.currentLookAt.x, 0, this.currentLookAt.z);
        break;
      case _.FIRST_PERSON:
        this.domElement.style.cursor = "crosshair", this.targetPosition.copy(this.currentPosition);
        const o = new u.Vector3(0, 0, -1).applyQuaternion(this._cam.quaternion);
        this.targetLookAt.copy(this.currentPosition).add(o);
        break;
    }
    this.space.emit("camera:modeChanged", { newMode: this.cameraMode, oldMode: s }), setTimeout(() => this._isManuallyControlled = !1, 50);
  }
}
class xn {
  constructor(t, e) {
    g(this, "space", null);
    g(this, "camera", null);
    g(this, "cameraControls", null);
    g(this, "settings", {
      autoZoom: {
        enabled: !1,
        minDistance: 50,
        maxDistance: 2e3,
        targetPadding: 1.5,
        transitionDuration: 1,
        nodeCountThreshold: 5,
        densityThreshold: 0.3
      },
      rotation: {
        enabled: !0,
        speed: 5e-3,
        autoRotate: !1,
        autoRotateSpeed: 0.02,
        smoothDamping: 0.1,
        maxPolarAngle: Math.PI,
        minPolarAngle: 0
      },
      peekMode: {
        enabled: !0,
        peekDistance: 100,
        peekSpeed: 0.8,
        returnDuration: 0.6,
        mouseThreshold: 50,
        cornerDetectionRadius: 150
      },
      cinematic: {
        enableCinematicMode: !1,
        cinematicSpeed: 0.3,
        cinematicRadius: 500,
        cinematicHeight: 200,
        followPath: !0
      }
    });
    // Auto-zoom state
    g(this, "autoZoomEnabled", !1);
    g(this, "lastNodeCount", 0);
    g(this, "lastBoundingBox", null);
    g(this, "autoZoomTimer", null);
    // Rotation state
    g(this, "rotationVelocity", new u.Vector2());
    g(this, "targetRotation", new u.Vector2());
    g(this, "currentRotation", new u.Vector2());
    g(this, "autoRotateAngle", 0);
    // Peek mode state
    g(this, "isPeeking", !1);
    g(this, "peekStartPosition", new u.Vector3());
    g(this, "peekStartTarget", new u.Vector3());
    g(this, "peekDirection", new u.Vector3());
    g(this, "mousePosition", new u.Vector2());
    g(this, "lastMousePosition", new u.Vector2());
    // Cinematic mode state
    g(this, "cinematicMode", !1);
    g(this, "cinematicPath", []);
    g(this, "cinematicProgress", 0);
    g(this, "cinematicDirection", 1);
    this.space = t, this.cameraControls = e, this.camera = t.camera, this._initializeEventListeners(), this._startUpdateLoop();
  }
  _initializeEventListeners() {
    this.space.container && (this.space.container.addEventListener("mousemove", this._handleMouseMove.bind(this)), this.space.container.addEventListener("mouseenter", this._handleMouseEnter.bind(this)), this.space.container.addEventListener("mouseleave", this._handleMouseLeave.bind(this))), document.addEventListener("keydown", this._handleKeyDown.bind(this)), document.addEventListener("keyup", this._handleKeyUp.bind(this)), this.space.on("node:added", this._onGraphChange.bind(this)), this.space.on("node:removed", this._onGraphChange.bind(this)), this.space.on("layout:started", this._onLayoutChange.bind(this));
  }
  _handleMouseMove(t) {
    const e = this.space.container.getBoundingClientRect();
    this.mousePosition.set(
      (t.clientX - e.left) / e.width * 2 - 1,
      -((t.clientY - e.top) / e.height) * 2 + 1
    ), this.settings.peekMode.enabled && this._updatePeekMode();
  }
  _handleMouseEnter() {
    this.lastMousePosition.copy(this.mousePosition);
  }
  _handleMouseLeave() {
    this.isPeeking && this._exitPeekMode();
  }
  _handleKeyDown(t) {
    switch (t.code) {
      case "KeyR":
        t.ctrlKey && (this.toggleAutoRotation(), t.preventDefault());
        break;
      case "KeyZ":
        t.ctrlKey && (this.toggleAutoZoom(), t.preventDefault());
        break;
      case "KeyP":
        this.togglePeekMode();
        break;
      case "KeyC":
        t.ctrlKey && (this.toggleCinematicMode(), t.preventDefault());
        break;
    }
  }
  _handleKeyUp(t) {
  }
  _onGraphChange() {
    this.autoZoomEnabled && (clearTimeout(this.autoZoomTimer), this.autoZoomTimer = setTimeout(() => {
      this._performAutoZoom();
    }, 1e3));
  }
  _onLayoutChange() {
    this.autoZoomEnabled && setTimeout(() => {
      this._performAutoZoom();
    }, 1500);
  }
  _startUpdateLoop() {
    const t = () => {
      this._updateRotation(), this._updateCinematicMode(), requestAnimationFrame(t);
    };
    t();
  }
  // Auto-zoom functionality
  toggleAutoZoom(t = null) {
    return this.autoZoomEnabled = t !== null ? t : !this.autoZoomEnabled, this.autoZoomEnabled && this._performAutoZoom(), this.space.emit("camera:autoZoomToggled", { enabled: this.autoZoomEnabled }), this.autoZoomEnabled;
  }
  _performAutoZoom() {
    var o;
    const t = this.space.plugins.getPlugin("NodePlugin"), e = Array.from(((o = t == null ? void 0 : t.getNodes()) == null ? void 0 : o.values()) || []);
    if (e.length === 0) return;
    const s = this._calculateSceneBoundingBox(e), i = this._calculateOptimalZoomDistance(s, e.length), n = s.getCenter(new u.Vector3());
    this.cameraControls.moveTo(
      n.x,
      n.y,
      n.z + i,
      this.settings.autoZoom.transitionDuration,
      n
    ), this.lastNodeCount = e.length, this.lastBoundingBox = s;
  }
  _calculateSceneBoundingBox(t) {
    const e = new u.Box3();
    return t.forEach((s) => {
      var a;
      const i = new u.Box3(), n = ((a = s.getBoundingSphereRadius) == null ? void 0 : a.call(s)) || 50, o = s.position;
      i.setFromCenterAndSize(
        o,
        new u.Vector3(n * 2, n * 2, n * 2)
      ), e.union(i);
    }), e;
  }
  _calculateOptimalZoomDistance(t, e) {
    const s = t.getSize(new u.Vector3()), i = Math.max(s.x, s.y, s.z), n = this.camera.fov * Math.PI / 180, o = i * this.settings.autoZoom.targetPadding / (2 * Math.tan(n / 2)), a = Math.min(1.5, e / 20), r = o * (1 + a * 0.3);
    return u.MathUtils.clamp(
      r,
      this.settings.autoZoom.minDistance,
      this.settings.autoZoom.maxDistance
    );
  }
  // Rotation controls
  toggleAutoRotation(t = null) {
    return this.settings.rotation.autoRotate = t !== null ? t : !this.settings.rotation.autoRotate, this.settings.rotation.autoRotate || (this.autoRotateAngle = 0), this.space.emit("camera:autoRotationToggled", { enabled: this.settings.rotation.autoRotate }), this.settings.rotation.autoRotate;
  }
  setRotationSpeed(t) {
    this.settings.rotation.autoRotateSpeed = t;
  }
  _updateRotation() {
    if (this.settings.rotation.autoRotate && this.cameraControls.cameraMode === _.ORBIT) {
      this.autoRotateAngle += this.settings.rotation.autoRotateSpeed;
      const t = this.cameraControls.targetLookAt.clone(), e = this.camera.position.clone(), s = e.distanceTo(t), i = t.x + Math.cos(this.autoRotateAngle) * s, n = t.z + Math.sin(this.autoRotateAngle) * s;
      this.cameraControls.targetPosition.set(i, e.y, n);
    }
    this.currentRotation.lerp(this.targetRotation, this.settings.rotation.smoothDamping);
  }
  // Peek around corners functionality
  togglePeekMode(t = null) {
    return this.settings.peekMode.enabled = t !== null ? t : !this.settings.peekMode.enabled, !this.settings.peekMode.enabled && this.isPeeking && this._exitPeekMode(), this.space.emit("camera:peekModeToggled", { enabled: this.settings.peekMode.enabled }), this.settings.peekMode.enabled;
  }
  _updatePeekMode() {
    if (!this.settings.peekMode.enabled) return;
    const e = this.mousePosition.clone().sub(this.lastMousePosition).length(), s = Math.abs(this.mousePosition.x) > 0.7 || Math.abs(this.mousePosition.y) > 0.7;
    s && e > 0.01 ? (this.isPeeking || this._enterPeekMode(), this._updatePeekDirection()) : this.isPeeking && !s && this._exitPeekMode(), this.lastMousePosition.copy(this.mousePosition);
  }
  _enterPeekMode() {
    this.isPeeking = !0, this.peekStartPosition.copy(this.camera.position), this.peekStartTarget.copy(this.cameraControls.targetLookAt), this.space.emit("camera:peekModeEntered");
  }
  _exitPeekMode() {
    this.isPeeking && (this.isPeeking = !1, z.to(this.cameraControls.targetPosition, {
      x: this.peekStartPosition.x,
      y: this.peekStartPosition.y,
      z: this.peekStartPosition.z,
      duration: this.settings.peekMode.returnDuration,
      ease: "power2.out"
    }), z.to(this.cameraControls.targetLookAt, {
      x: this.peekStartTarget.x,
      y: this.peekStartTarget.y,
      z: this.peekStartTarget.z,
      duration: this.settings.peekMode.returnDuration,
      ease: "power2.out"
    }), this.space.emit("camera:peekModeExited"));
  }
  _updatePeekDirection() {
    if (!this.isPeeking) return;
    const t = new u.Vector3(
      this.mousePosition.x * this.settings.peekMode.peekDistance,
      this.mousePosition.y * this.settings.peekMode.peekDistance * 0.5,
      // Reduce vertical peek
      0
    ), e = this.camera.quaternion.clone();
    t.applyQuaternion(e), z.to(this.cameraControls.targetPosition, {
      x: this.peekStartPosition.x + t.x,
      y: this.peekStartPosition.y + t.y,
      z: this.peekStartPosition.z + t.z,
      duration: this.settings.peekMode.peekSpeed,
      ease: "power2.out"
    });
  }
  // Cinematic mode
  toggleCinematicMode(t = null) {
    return this.cinematicMode = t !== null ? t : !this.cinematicMode, this.cinematicMode ? this._startCinematicMode() : this._stopCinematicMode(), this.space.emit("camera:cinematicModeToggled", { enabled: this.cinematicMode }), this.cinematicMode;
  }
  _startCinematicMode() {
    this._generateCinematicPath(), this.cinematicProgress = 0, this.cinematicDirection = 1;
  }
  _stopCinematicMode() {
    this.cinematicPath = [], this.cinematicProgress = 0;
  }
  _generateCinematicPath() {
    var a;
    const t = this.space.plugins.getPlugin("NodePlugin"), e = Array.from(((a = t == null ? void 0 : t.getNodes()) == null ? void 0 : a.values()) || []);
    if (e.length === 0) return;
    const s = new u.Vector3();
    e.forEach((r) => s.add(r.position)), s.divideScalar(e.length);
    const i = this.settings.cinematic.cinematicRadius, n = this.settings.cinematic.cinematicHeight, o = 32;
    this.cinematicPath = [];
    for (let r = 0; r < o; r++) {
      const l = r / o * Math.PI * 2, c = s.x + Math.cos(l) * i, d = s.z + Math.sin(l) * i, h = s.y + n + Math.sin(l * 2) * 50;
      this.cinematicPath.push({
        position: new u.Vector3(c, h, d),
        lookAt: s.clone()
      });
    }
  }
  _updateCinematicMode() {
    if (!this.cinematicMode || this.cinematicPath.length === 0) return;
    this.cinematicProgress += this.settings.cinematic.cinematicSpeed * this.cinematicDirection * 0.01, this.cinematicProgress >= 1 ? (this.cinematicProgress = 1, this.cinematicDirection = -1) : this.cinematicProgress <= 0 && (this.cinematicProgress = 0, this.cinematicDirection = 1);
    const t = this.cinematicProgress * (this.cinematicPath.length - 1), e = Math.floor(t), s = Math.min(e + 1, this.cinematicPath.length - 1), i = t - e, n = this.cinematicPath[e], o = this.cinematicPath[s];
    if (n && o) {
      const a = n.position.clone().lerp(o.position, i), r = n.lookAt.clone().lerp(o.lookAt, i);
      this.cameraControls.targetPosition.copy(a), this.cameraControls.targetLookAt.copy(r);
    }
  }
  // Smart focus with context awareness
  smartFocusOnNode(t, e = {}) {
    var p;
    const {
      considerNeighbors: s = !0,
      includeEdges: i = !0,
      transitionDuration: n = 1,
      contextRadius: o = 200
    } = e;
    if (!t) return;
    let a = new u.Box3();
    if (a.setFromCenterAndSize(t.position, new u.Vector3(100, 100, 100)), s) {
      const f = this.space.plugins.getPlugin("EdgePlugin"), C = Array.from(((p = f == null ? void 0 : f.getEdges()) == null ? void 0 : p.values()) || []), b = /* @__PURE__ */ new Set([t]);
      C.forEach((y) => {
        y.source === t && y.target.position.distanceTo(t.position) < o && b.add(y.target), y.target === t && y.source.position.distanceTo(t.position) < o && b.add(y.source);
      }), b.forEach((y) => {
        var I;
        const w = new u.Box3(), v = ((I = y.getBoundingSphereRadius) == null ? void 0 : I.call(y)) || 50;
        w.setFromCenterAndSize(y.position, new u.Vector3(v * 2, v * 2, v * 2)), a.union(w);
      });
    }
    const r = a.getCenter(new u.Vector3()), l = a.getSize(new u.Vector3()), c = Math.max(l.x, l.y, l.z), d = this.camera.fov * Math.PI / 180, h = c * 1.5 / (2 * Math.tan(d / 2));
    this.cameraControls.moveTo(
      r.x,
      r.y,
      r.z + Math.max(h, 150),
      n,
      r
    );
  }
  // Advanced view management
  createViewSequence(t, e = {}) {
    const {
      duration: s = 2,
      pause: i = 1,
      includeOverview: n = !0,
      smoothTransitions: o = !0
    } = e, a = [];
    return n && a.push(() => this._performAutoZoom()), t.forEach((r, l) => {
      a.push(() => {
        this.smartFocusOnNode(r, {
          transitionDuration: o ? s : 0,
          considerNeighbors: !0
        });
      });
    }), this._executeViewSequence(a, i);
  }
  async _executeViewSequence(t, e) {
    for (let s = 0; s < t.length; s++)
      await t[s](), s < t.length - 1 && await new Promise((i) => setTimeout(i, e * 1e3));
  }
  // Configuration
  updateSettings(t) {
    this.settings = { ...this.settings, ...t };
  }
  getSettings() {
    return { ...this.settings };
  }
  // Status getters
  isAutoZoomEnabled() {
    return this.autoZoomEnabled;
  }
  isAutoRotating() {
    return this.settings.rotation.autoRotate;
  }
  isPeekModeEnabled() {
    return this.settings.peekMode.enabled;
  }
  isCinematicModeActive() {
    return this.cinematicMode;
  }
  dispose() {
    clearTimeout(this.autoZoomTimer), this.space.container.removeEventListener("mousemove", this._handleMouseMove.bind(this)), this.space.container.removeEventListener("mouseenter", this._handleMouseEnter.bind(this)), this.space.container.removeEventListener("mouseleave", this._handleMouseLeave.bind(this)), document.removeEventListener("keydown", this._handleKeyDown.bind(this)), document.removeEventListener("keyup", this._handleKeyUp.bind(this)), this.space = null, this.camera = null, this.cameraControls = null;
  }
}
class An extends U {
  constructor(e, s) {
    super(e, s);
    g(this, "perspectiveCamera", null);
    g(this, "cameraControls", null);
    g(this, "advancedControls", null);
  }
  getName() {
    return "CameraPlugin";
  }
  init() {
    super.init(), this.perspectiveCamera = new u.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2e4), this.perspectiveCamera.position.z = 700, this.space && (this.space._cam = this.perspectiveCamera), this.cameraControls = new Mn(this.space), this.advancedControls = new xn(this.space, this.cameraControls), this._subscribeToEvents();
  }
  _subscribeToEvents() {
    this.space.on("ui:request:setCameraMode", (e) => {
      this.setCameraMode(e);
    }), this.space.on("ui:request:toggleAutoZoom", () => {
      this.toggleAutoZoom();
    }), this.space.on("ui:request:toggleAutoRotation", () => {
      this.toggleAutoRotation();
    }), this.space.on("ui:request:togglePeekMode", () => {
      this.togglePeekMode();
    }), this.space.on("ui:request:toggleCinematicMode", () => {
      this.toggleCinematicMode();
    }), this.space.on("ui:request:smartFocus", (e, s) => {
      this.smartFocusOnNode(e, s);
    });
  }
  getCameraInstance() {
    return this.perspectiveCamera;
  }
  getControls() {
    return this.cameraControls;
  }
  moveTo(e, s, i, n = 0.7, o = null) {
    var a;
    (a = this.cameraControls) == null || a.moveTo(e, s, i, n, o);
  }
  _determineCenterViewTarget(e = null) {
    const s = this.pluginManager.getPlugin("NodePlugin"), i = s == null ? void 0 : s.getNodes();
    let n = new u.Vector3();
    return e instanceof u.Vector3 ? n = e.clone() : e && typeof e.x == "number" ? n.set(e.x, e.y, e.z) : i && i.size > 0 && (i.forEach((o) => n.add(o.position)), n.divideScalar(i.size)), n;
  }
  _determineOptimalDistance(e = 400, s = 700, i = 0) {
    return i > 1 ? s : e;
  }
  centerView(e = null, s = 0.7) {
    var r;
    if (!this.perspectiveCamera || !this.cameraControls) return;
    const i = this._determineCenterViewTarget(e), n = this.pluginManager.getPlugin("NodePlugin"), o = ((r = n == null ? void 0 : n.getNodes()) == null ? void 0 : r.size) || 0, a = this._determineOptimalDistance(400, 700, o);
    this.moveTo(i.x, i.y, i.z + a, s, i);
  }
  _determineFocusNodeDistance(e) {
    if (!e || !this.perspectiveCamera) return 50;
    const s = this.perspectiveCamera.fov * T.DEG2RAD, i = this.perspectiveCamera.aspect, n = typeof e.getBoundingSphereRadius == "function" ? e.getBoundingSphereRadius() * 2 : 100, o = Math.max(n, n / i);
    return Math.max(50, o * 1.5 / (2 * Math.tan(s / 2)));
  }
  focusOnNode(e, s = 0.6, i = !1) {
    if (!e || !this.perspectiveCamera || !this.cameraControls) return;
    const n = e.position.clone(), o = this._determineFocusNodeDistance(e);
    i && this.pushState(), this.moveTo(n.x, n.y, n.z + o, s, n);
  }
  pan(e, s) {
    var i;
    (i = this.cameraControls) == null || i.pan(e, s);
  }
  startPan(e, s) {
    var i;
    (i = this.cameraControls) == null || i.startPan(e, s);
  }
  endPan() {
    var e;
    (e = this.cameraControls) == null || e.endPan();
  }
  zoom(e) {
    var s;
    (s = this.cameraControls) == null || s.zoom(e);
  }
  resetView(e = 0.7) {
    var s;
    (s = this.cameraControls) == null || s.resetView(e);
  }
  pushState() {
    var e;
    (e = this.cameraControls) == null || e.pushState();
  }
  popState(e = 0.6) {
    var s;
    (s = this.cameraControls) == null || s.popState(e);
  }
  getCurrentTargetNodeId() {
    var e;
    return (e = this.cameraControls) == null ? void 0 : e.getCurrentTargetNodeId();
  }
  setCurrentTargetNodeId(e) {
    var s;
    (s = this.cameraControls) == null || s.setCurrentTargetNodeId(e);
  }
  setInitialState() {
    var e;
    (e = this.cameraControls) == null || e.setInitialState();
  }
  saveNamedView(e) {
    var s;
    return (s = this.cameraControls) == null ? void 0 : s.saveNamedView(e);
  }
  restoreNamedView(e, s = 0.7) {
    var i;
    return (i = this.cameraControls) == null ? void 0 : i.restoreNamedView(e, s);
  }
  deleteNamedView(e) {
    var s;
    return (s = this.cameraControls) == null ? void 0 : s.deleteNamedView(e);
  }
  getNamedViews() {
    var e;
    return ((e = this.cameraControls) == null ? void 0 : e.getNamedViews()) || [];
  }
  hasNamedView(e) {
    var s;
    return ((s = this.cameraControls) == null ? void 0 : s.hasNamedView(e)) || !1;
  }
  setCameraMode(e) {
    var s;
    (s = this.cameraControls) == null || s.setCameraMode(e);
  }
  getCameraMode() {
    var e;
    return (e = this.cameraControls) == null ? void 0 : e.cameraMode;
  }
  getAvailableCameraModes() {
    return {
      [_.ORBIT]: "Orbit Control",
      [_.FREE]: "Free Look",
      [_.TOP_DOWN]: "Top Down",
      [_.FIRST_PERSON]: "First Person"
    };
  }
  startFollowing(e, s = {}) {
    var i;
    (i = this.cameraControls) == null || i.startFollowing(e, s);
  }
  stopFollowing() {
    var e;
    (e = this.cameraControls) == null || e.stopFollowing();
  }
  isFollowing() {
    var e;
    return ((e = this.cameraControls) == null ? void 0 : e.isFollowing) || !1;
  }
  requestPointerLock() {
    var e, s;
    (s = (e = this.cameraControls) == null ? void 0 : e.pointerLockControls) == null || s.lock();
  }
  exitPointerLock() {
    var e, s;
    (s = (e = this.cameraControls) == null ? void 0 : e.pointerLockControls) == null || s.unlock();
  }
  // Advanced camera control methods
  toggleAutoZoom(e = null) {
    var s;
    return (s = this.advancedControls) == null ? void 0 : s.toggleAutoZoom(e);
  }
  toggleAutoRotation(e = null) {
    var s;
    return (s = this.advancedControls) == null ? void 0 : s.toggleAutoRotation(e);
  }
  setRotationSpeed(e) {
    var s;
    (s = this.advancedControls) == null || s.setRotationSpeed(e);
  }
  togglePeekMode(e = null) {
    var s;
    return (s = this.advancedControls) == null ? void 0 : s.togglePeekMode(e);
  }
  toggleCinematicMode(e = null) {
    var s;
    return (s = this.advancedControls) == null ? void 0 : s.toggleCinematicMode(e);
  }
  smartFocusOnNode(e, s = {}) {
    var i;
    (i = this.advancedControls) == null || i.smartFocusOnNode(e, s);
  }
  createViewSequence(e, s = {}) {
    var i;
    return (i = this.advancedControls) == null ? void 0 : i.createViewSequence(e, s);
  }
  updateAdvancedSettings(e) {
    var s;
    (s = this.advancedControls) == null || s.updateSettings(e);
  }
  getAdvancedSettings() {
    var e;
    return (e = this.advancedControls) == null ? void 0 : e.getSettings();
  }
  getAdvancedControlsStatus() {
    var e, s, i, n;
    return {
      autoZoom: ((e = this.advancedControls) == null ? void 0 : e.isAutoZoomEnabled()) || !1,
      autoRotation: ((s = this.advancedControls) == null ? void 0 : s.isAutoRotating()) || !1,
      peekMode: ((i = this.advancedControls) == null ? void 0 : i.isPeekModeEnabled()) || !1,
      cinematicMode: ((n = this.advancedControls) == null ? void 0 : n.isCinematicModeActive()) || !1
    };
  }
  dispose() {
    var e, s;
    super.dispose(), (e = this.advancedControls) == null || e.dispose(), (s = this.cameraControls) == null || s.dispose(), this.space && this.space._cam === this.perspectiveCamera && (this.space._cam = null), this.perspectiveCamera = null, this.advancedControls = null, this.cameraControls = null;
  }
}
class q extends ie {
  constructor(e, s, i = {}, n = 1.5) {
    super(e, s, i, n);
    g(this, "shape", "sphere");
    g(this, "size", 50);
    g(this, "color", 16777215);
    g(this, "gltfUrl", null);
    g(this, "lodData", []);
    g(this, "isSelected", !1);
    g(this, "isHovered", !1);
    this.shape = this.data.shape ?? "sphere", this.size = Number.isFinite(this.data.size) ? this.data.size : 50, this.color = this.data.color ?? 16777215, this.gltfUrl = this.data.gltfUrl ?? null, this.lodData = this.data.lodLevels ?? [], this.mesh = new u.LOD(), this.mesh.userData = { nodeId: this.id, type: "shape-node-lod" }, this._setupLODLevels(), this.data.label && (this.labelObject = this._createLabel(), this.labelObject.userData = { nodeId: this.id, type: "shape-label" }), this.update(), this.updateBoundingSphere();
  }
  getDefaultData() {
    return {
      label: "",
      shape: "sphere",
      size: 50,
      color: 16777215,
      type: "shape",
      lodLevels: [],
      labelLod: []
    };
  }
  _setupLODLevels() {
    var e;
    if ((e = this.lodData) != null && e.length)
      this.lodData.forEach((s) => {
        const i = this._createRepresentationForLevel(s);
        i && this.mesh.addLevel(i, s.distance);
      });
    else {
      const s = this._createRepresentationForLevel({
        shape: this.shape,
        gltfUrl: this.gltfUrl,
        gltfScale: this.data.gltfScale,
        size: this.size,
        color: this.color
      });
      s && this.mesh.addLevel(s, 0);
      const i = Math.max(10, (this.size || 50) / 3), n = this._createMeshForLevel({
        shape: "box",
        size: i,
        color: this.color
      });
      n && this.mesh.addLevel(n, this.data.lodDistanceSimple ?? 700), this.mesh.addLevel(new u.Object3D(), this.data.lodDistanceHide ?? 1500);
    }
  }
  _createRepresentationForLevel(e) {
    return e.shape === "gltf" && e.gltfUrl ? (() => {
      const s = new u.Group();
      return s.castShadow = !0, s.receiveShadow = !0, this._loadGltfModelForLevel(e, s), s;
    })() : e.shape ? this._createMeshForLevel(e) : null;
  }
  _createMeshForLevel(e) {
    let s;
    const i = Number.isFinite(e.size) ? e.size : this.size, n = Math.max(5, i), o = e.shape || "sphere", a = e.color || this.color;
    switch (o) {
      case "box":
        s = new u.BoxGeometry(n, n, n);
        break;
      case "sphere":
      default:
        s = new u.SphereGeometry(n / 2, 32, 16);
        break;
    }
    const r = new u.MeshStandardMaterial({
      color: a,
      roughness: 0.7,
      metalness: 0.1
    }), l = new u.Mesh(s, r);
    return l.castShadow = !0, l.receiveShadow = !0, l;
  }
  _loadGltfModelForLevel(e, s) {
    if (!e.gltfUrl || !s) return;
    new Ms().load(
      e.gltfUrl,
      (n) => {
        var p;
        const o = n.scene;
        o.traverse((f) => {
          f.isMesh && (f.castShadow = !0, f.receiveShadow = !0, e.color && f.material && (Array.isArray(f.material) ? f.material.forEach((C) => {
            (C.isMeshStandardMaterial || C.isMeshBasicMaterial) && C.color.set(e.color);
          }) : (f.material.isMeshStandardMaterial || f.material.isMeshBasicMaterial) && f.material.color.set(e.color)));
        });
        const a = new u.Box3().setFromObject(o), r = new u.Vector3();
        a.getSize(r);
        const l = Math.max(r.x, r.y, r.z);
        let c = 1;
        if (l > 0) {
          let f = e.gltfScale ?? this.data.gltfScale ?? e.size ?? this.size;
          (!Number.isFinite(f) || f <= 0) && (f = 50), c = f / l;
        }
        o.scale.set(c, c, c);
        const d = new u.Vector3();
        for (a.getCenter(d), o.position.sub(d.multiplyScalar(c)); s.children.length > 0; ) s.remove(s.children[0]);
        s.add(o);
        const h = this.mesh.levels.find((f) => f.object === s);
        (h == null ? void 0 : h.distance) === 0 && this.updateBoundingSphere(), (p = this.space) == null || p.emit("node:updated", {
          node: this,
          property: "mesh_lod_level_loaded",
          levelDetail: e
        });
      },
      void 0,
      (n) => {
        console.error(`ShapeNode: Failed to load GLTF model from ${e.gltfUrl}. Falling back to primitive shape.`, n);
        const o = e.size || this.size || 20, a = e.color || this.color || 16711680, r = this._createMeshForLevel({
          shape: "box",
          size: o,
          color: a
        });
        for (; s.children.length > 0; ) s.remove(s.children[0]);
        s.add(r);
        const l = this.mesh.levels.find((c) => c.object === s);
        (l == null ? void 0 : l.distance) === 0 && this.updateBoundingSphere();
      }
    );
  }
  updateBoundingSphere() {
    this._boundingSphere || (this._boundingSphere = new u.Sphere());
    let e = null;
    if (this.mesh.levels.length > 0 && (e = this.mesh.levels[0].object), e) {
      const s = new u.Box3();
      if (s.setFromObject(e, !0), !s.isEmpty() && isFinite(s.min.x) && isFinite(s.max.x)) {
        const i = new u.Vector3();
        s.getSize(i), this._boundingSphere.radius = i.length() / 2, this._boundingSphere.center.copy(this.position);
      } else
        console.warn(`ShapeNode ${this.id}: Bounding box computation failed for object. Using fallback radius.`), this._boundingSphere.radius = (this.size || 50) / 2, this._boundingSphere.center.copy(this.position);
    } else
      this._boundingSphere.radius = (this.size || 50) / 2, this._boundingSphere.center.copy(this.position);
  }
  _createLabel() {
    const e = {
      color: "var(--sg-node-text)",
      backgroundColor: "var(--sg-label-bg, rgba(10, 10, 20, 0.75))",
      fontSize: "14px"
    };
    return Oe(this.data.label, this.id, "node-label-3d", e, "shape-label");
  }
  update(e) {
    if (this.mesh && this.mesh.position.copy(this.position), this.labelObject) {
      const s = this.getBoundingSphereRadius() * 1.1 + 10;
      this.labelObject.position.copy(this.position).y += s, e != null && e._cam && this.labelObject.quaternion.copy(e._cam.quaternion), Me(this.labelObject, this.data.labelLod, e);
    }
  }
  getBoundingSphereRadius() {
    var e, s;
    return (!this._boundingSphere || this.shape === "gltf" && ((e = this.mesh) == null ? void 0 : e.children.length) === 0 && this._boundingSphere.radius === 0) && this.updateBoundingSphere(), ((s = this._boundingSphere) == null ? void 0 : s.radius) ?? this.size / 2;
  }
  setSelectedStyle(e) {
    var s, i;
    this.isSelected = e, this.mesh instanceof u.LOD && this.mesh.levels.forEach((n) => {
      var o;
      (o = n.object) == null || o.traverse((a) => {
        var r, l;
        a.isMesh && a.material && ((r = a.material.emissive) == null || r.setHex(e ? 16776960 : 0), a.material.emissiveIntensity = e && ((l = a.material.emissive) == null ? void 0 : l.getHex()) !== 0 ? 1 : 0);
      });
    }), (i = (s = this.labelObject) == null ? void 0 : s.element) == null || i.classList.toggle("selected", e), e && this.isHovered && this.setHoverStyle(!1, !0);
  }
  setHoverStyle(e, s = !1) {
    var i, n;
    !s && this.isSelected || (this.isHovered = e, this.mesh instanceof u.LOD && this.mesh.levels.forEach((o) => {
      var a;
      (a = o.object) == null || a.traverse((r) => {
        var l;
        if (r.isMesh && r.material) {
          const c = e && !this.isSelected ? 2236928 : 0, d = e && !this.isSelected ? 0.4 : 0;
          (l = r.material.emissive) == null || l.setHex(c), r.material.emissiveIntensity = c !== 0 ? d : 0;
        }
      });
    }), this.isSelected || (n = (i = this.labelObject) == null ? void 0 : i.element) == null || n.classList.toggle("hovered", e));
  }
  dispose() {
    var e, s, i, n, o;
    this.mesh && (this.mesh instanceof u.LOD ? this.mesh.levels.forEach((a) => {
      var r;
      (r = a.object) == null || r.traverse((l) => {
        var c, d;
        l.isMesh && ((c = l.geometry) == null || c.dispose(), Array.isArray(l.material) ? l.material.forEach((h) => h.dispose()) : (d = l.material) == null || d.dispose());
      });
    }) : ((e = this.mesh.geometry) == null || e.dispose(), Array.isArray(this.mesh.material) ? this.mesh.material.forEach((a) => a.dispose()) : (s = this.mesh.material) == null || s.dispose()), (i = this.mesh.parent) == null || i.remove(this.mesh), this.mesh = null), (o = (n = this.labelObject) == null ? void 0 : n.element) == null || o.remove(), this.labelObject = null, super.dispose();
  }
}
g(q, "typeName", "shape");
const Sn = new u.TextureLoader();
class Le extends ie {
  constructor(e, s, i = {}, n = 1) {
    super(e, s, i, n);
    g(this, "imageUrl", null);
    g(this, "imageSize", { width: 100, height: 100 });
    this.nodeType = "ImageNode", this.imageUrl = this.data.imageUrl || null, typeof this.data.size == "number" ? this.imageSize = { width: this.data.size, height: this.data.size } : typeof this.data.size == "object" && this.data.size.width && this.data.size.height ? this.imageSize = { ...this.data.size } : this.imageSize = { width: 100, height: 100 }, this.mesh = this._createMesh(), this.mesh.userData = { nodeId: this.id, type: "image-node" }, this.imageUrl ? this._loadImageTexture() : this.mesh.material = new u.MeshStandardMaterial({ color: 5592405, side: u.DoubleSide }), this.data.label && (this.labelObject = this._createLabel()), this.update(), this.updateBoundingSphere();
  }
  getDefaultData() {
    return {
      label: "",
      imageUrl: null,
      size: 100,
      type: "image",
      color: 16777215
    };
  }
  _createMesh() {
    const e = new u.PlaneGeometry(1, 1), s = new u.MeshStandardMaterial({
      color: this.data.color || 16777215,
      side: u.DoubleSide,
      transparent: !0
    }), i = new u.Mesh(e, s);
    return i.castShadow = !0, i.receiveShadow = !0, i;
  }
  _loadImageTexture() {
    !this.imageUrl || !this.mesh || Sn.load(
      this.imageUrl,
      (e) => {
        var o;
        e.colorSpace = u.SRGBColorSpace, this.mesh.material.map = e, this.mesh.material.needsUpdate = !0;
        const s = e.image.width / e.image.height;
        let i, n;
        if (typeof this.data.size == "number") {
          const a = this.data.size;
          [i, n] = s >= 1 ? [a, a / s] : [a * s, a];
        } else {
          i = this.imageSize.width, n = this.imageSize.height;
          const a = this.data.size || 100;
          this.imageSize.width === this.imageSize.height && this.imageSize.width === a && ([i, n] = s >= 1 ? [a, a / s] : [a * s, a]);
        }
        this.mesh.scale.set(i, n, 1), this.imageSize = { width: i, height: n }, this.updateBoundingSphere(), (o = this.space) == null || o.emit("node:updated", { node: this, property: "mesh" });
      },
      void 0,
      () => {
        this.mesh.material.color.set(16711680);
      }
    );
  }
  updateBoundingSphere() {
    if (this.mesh) {
      this._boundingSphere || (this._boundingSphere = new u.Sphere());
      const { x: e, y: s } = this.mesh.scale;
      this._boundingSphere.radius = Math.sqrt(e * e + s * s) / 2, this._boundingSphere.center.copy(this.position);
    }
  }
  _createLabel() {
    const e = {
      color: "var(--sg-node-text)",
      backgroundColor: "var(--sg-label-bg, rgba(10, 10, 20, 0.75))",
      fontSize: "14px"
    };
    return Oe(this.data.label, this.id, "node-label-3d", e, "shape-label");
  }
  update(e) {
    if (super.update(e), this.labelObject && this.mesh) {
      const s = this.mesh.scale.y / 2 + 20;
      this.labelObject.position.copy(this.position), this.labelObject.position.y += s, e != null && e._cam && this.labelObject.quaternion.copy(e._cam.quaternion), Me(this.labelObject, this.data.labelLod, e);
    }
  }
  setSelectedStyle(e) {
    var s, i;
    super.setSelectedStyle(e), (i = (s = this.labelObject) == null ? void 0 : s.element) == null || i.classList.toggle("selected", e);
  }
  dispose() {
    var e, s, i;
    (i = (s = (e = this.mesh) == null ? void 0 : e.material) == null ? void 0 : s.map) == null || i.dispose(), super.dispose();
  }
}
g(Le, "typeName", "image");
const j = class j extends ie {
  constructor(e, s, i = {}, n = 1.2) {
    super(e, s, i, n);
    g(this, "htmlElement", null);
    g(this, "videoElement", null);
    g(this, "size", { width: j.DEFAULT_WIDTH, height: j.DEFAULT_HEIGHT });
    this.size = {
      width: this.data.width ?? j.DEFAULT_WIDTH,
      height: this.data.height ?? j.DEFAULT_HEIGHT
    }, this.htmlElement = this._createElement(), this.cssObject = new Ie(this.htmlElement), this.cssObject.userData = { nodeId: this.id, type: "video-node" }, this.update();
  }
  getDefaultData() {
    return {
      label: "Video Node",
      videoUrl: "",
      videoType: "video/mp4",
      autoplay: !1,
      loop: !1,
      controls: !0,
      muted: !1,
      width: j.DEFAULT_WIDTH,
      height: j.DEFAULT_HEIGHT,
      type: "video",
      backgroundColor: "var(--sg-node-bg, #111)"
    };
  }
  _createElement() {
    const e = document.createElement("div");
    e.className = "node-video node-common", e.id = `node-video-${this.id}`, e.dataset.nodeId = this.id, Object.assign(e.style, {
      width: `${this.size.width}px`,
      height: `${this.size.height}px`,
      backgroundColor: this.data.backgroundColor
    }), e.draggable = !1, e.ondragstart = (i) => i.preventDefault(), this.videoElement = document.createElement("video"), Object.assign(this.videoElement.style, {
      width: "100%",
      height: "100%"
    }), this.videoElement.src = this.data.videoUrl, this.videoElement.type = this.data.videoType, this.data.autoplay && (this.videoElement.autoplay = !0), this.data.loop && (this.videoElement.loop = !0), this.data.controls && (this.videoElement.controls = !0), this.data.muted && (this.videoElement.muted = !0), this.videoElement.addEventListener("pointerdown", (i) => i.stopPropagation()), this.videoElement.addEventListener("click", (i) => i.stopPropagation()), this.videoElement.addEventListener("dblclick", (i) => i.stopPropagation());
    const s = document.createElement("div");
    return s.className = "node-title", s.textContent = this.data.label, Object.assign(s.style, {
      textAlign: "center",
      padding: "2px",
      fontSize: "12px",
      color: "var(--sg-node-text-light, #eee)",
      backgroundColor: "rgba(0,0,0,0.3)"
    }), e.appendChild(s), e.appendChild(this.videoElement), e;
  }
  setVideoUrl(e, s) {
    this.data.videoUrl = e, s && (this.data.videoType = s), this.videoElement && (this.videoElement.src = e, s && (this.videoElement.type = s));
  }
  update(e) {
    var s;
    this.cssObject && (this.cssObject.position.copy(this.position), this.data.billboard && ((s = e == null ? void 0 : e.camera) != null && s._cam) && this.cssObject.quaternion.copy(e.camera._cam.quaternion));
  }
  getBoundingSphereRadius() {
    return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2;
  }
  setSelectedStyle(e) {
    var s;
    (s = this.htmlElement) == null || s.classList.toggle("selected", e);
  }
  dispose() {
    this.videoElement && (this.videoElement.pause(), this.videoElement.src = "", this.videoElement.load()), super.dispose();
  }
};
g(j, "typeName", "video"), g(j, "DEFAULT_WIDTH", 320), g(j, "DEFAULT_HEIGHT", 240);
let me = j;
const W = class W extends ie {
  constructor(e, s, i = {}, n = 1.3) {
    super(e, s, i, n);
    g(this, "htmlElement", null);
    g(this, "iframeElement", null);
    g(this, "size", { width: W.DEFAULT_WIDTH, height: W.DEFAULT_HEIGHT });
    this.size = {
      width: this.data.width ?? W.DEFAULT_WIDTH,
      height: this.data.height ?? W.DEFAULT_HEIGHT
    }, this.htmlElement = this._createElement(), this.cssObject = new Ie(this.htmlElement), this.cssObject.userData = { nodeId: this.id, type: "iframe-node" }, this.update();
  }
  getDefaultData() {
    return {
      label: "IFrame Node",
      iframeUrl: "https://threejs.org",
      width: W.DEFAULT_WIDTH,
      height: W.DEFAULT_HEIGHT,
      type: "iframe",
      backgroundColor: "var(--sg-node-bg, #202025)",
      borderColor: "var(--sg-node-border-focus, #557799)"
    };
  }
  _createElement() {
    const e = document.createElement("div");
    e.className = "node-iframe node-common", e.id = `node-iframe-${this.id}`, e.dataset.nodeId = this.id, Object.assign(e.style, {
      width: `${this.size.width}px`,
      height: `${this.size.height}px`,
      backgroundColor: this.data.backgroundColor,
      border: `1px solid ${this.data.borderColor}`
    }), e.draggable = !1, e.ondragstart = (i) => i.preventDefault();
    const s = document.createElement("div");
    return s.className = "node-title iframe-title-bar", s.textContent = this.data.label, Object.assign(s.style, {
      padding: "4px",
      textAlign: "center",
      fontSize: "12px",
      color: "var(--sg-node-text-light, #eee)",
      backgroundColor: "rgba(0,0,0,0.4)",
      position: "absolute",
      top: "0",
      left: "0",
      width: "calc(100% - 8px)",
      zIndex: "1",
      pointerEvents: "none"
    }), this.iframeElement = document.createElement("iframe"), Object.assign(this.iframeElement.style, {
      width: "100%",
      height: "100%",
      border: "none",
      pointerEvents: "auto"
    }), this.data.sandbox && (this.iframeElement.sandbox = this.data.sandbox), this.iframeElement.src = this.data.iframeUrl, this.iframeElement.addEventListener("pointerdown", (i) => i.stopPropagation()), this.iframeElement.addEventListener("wheel", (i) => i.stopPropagation(), { passive: !1 }), e.appendChild(s), e.appendChild(this.iframeElement), e;
  }
  setIframeUrl(e) {
    this.data.iframeUrl = e, this.iframeElement && (this.iframeElement.src = e);
  }
  update(e) {
    this.cssObject && (this.cssObject.position.copy(this.position), this.data.billboard && (e != null && e._cam) && this.cssObject.quaternion.copy(e._cam.quaternion));
  }
  getBoundingSphereRadius() {
    return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2;
  }
  setSelectedStyle(e) {
    var s;
    (s = this.htmlElement) == null || s.classList.toggle("selected", e), this.htmlElement.style.borderColor = e ? "var(--sg-selected-color1, #00ffff)" : this.data.borderColor;
  }
  dispose() {
    this.iframeElement && (this.iframeElement.src = "about:blank"), super.dispose();
  }
};
g(W, "typeName", "iframe"), g(W, "DEFAULT_WIDTH", 480), g(W, "DEFAULT_HEIGHT", 360);
let fe = W;
class Pe extends L {
  constructor(e, s, i = {}, n = 1.5) {
    const o = {
      width: i.width ?? 300,
      height: i.height ?? 200,
      label: i.label ?? "Group",
      content: "",
      type: "group",
      backgroundColor: i.backgroundColor ?? "rgba(50, 50, 70, 0.3)",
      borderColor: i.borderColor ?? "rgba(150, 150, 180, 0.5)",
      collapsible: i.collapsible ?? !0,
      defaultCollapsed: i.defaultCollapsed ?? !1,
      headerColor: i.headerColor ?? "rgba(0,0,0,0.2)",
      children: i.children || [],
      ...i
    };
    super(e, s, o, n);
    g(this, "isCollapsed", !1);
    g(this, "childNodeIds", /* @__PURE__ */ new Set());
    this.isCollapsed = o.defaultCollapsed, o.children.forEach((a) => this.childNodeIds.add(a)), this._setupGroupElement(), this.updateGroupAppearance();
  }
  getDefaultData() {
    return {
      ...super.getDefaultData(),
      label: "Group",
      type: "group",
      width: 300,
      height: 200,
      content: "",
      backgroundColor: "rgba(50, 50, 70, 0.3)",
      borderColor: "rgba(150, 150, 180, 0.5)",
      collapsible: !0,
      defaultCollapsed: !1,
      headerColor: "rgba(0,0,0,0.2)",
      children: [],
      padding: this.data.padding ?? 15
    };
  }
  _setupGroupElement() {
    var o;
    (o = M(".node-controls", this.htmlElement)) == null || o.remove();
    const e = M(".node-content", this.htmlElement);
    e && (e.innerHTML = "", e.style.overflow = "hidden"), this.htmlElement.style.setProperty("--node-bg", this.data.backgroundColor), this.htmlElement.style.border = `1px dashed ${this.data.borderColor}`, this.htmlElement.style.boxSizing = "border-box";
    const s = document.createElement("div");
    s.className = "group-node-header", Object.assign(s.style, {
      padding: "5px",
      backgroundColor: this.data.headerColor,
      cursor: this.data.collapsible ? "pointer" : "default",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: `1px solid ${this.data.borderColor}`
    });
    const i = document.createElement("span");
    if (i.className = "group-node-title", i.textContent = this.data.label, i.style.fontWeight = "bold", s.appendChild(i), this.data.collapsible) {
      const a = document.createElement("button");
      a.className = "group-node-collapse-button", Object.assign(a.style, {
        background: "transparent",
        border: "1px solid #fff",
        color: "#fff",
        borderRadius: "3px",
        cursor: "pointer",
        padding: "2px 5px"
      }), a.textContent = this.isCollapsed ? "⊕" : "⊖", a.title = this.isCollapsed ? "Expand" : "Collapse", a.addEventListener("click", (r) => {
        r.stopPropagation(), this.toggleCollapse();
      }), s.appendChild(a);
    }
    const n = M(".node-inner-wrapper", this.htmlElement);
    n ? n.insertBefore(s, n.firstChild) : this.htmlElement.insertBefore(s, this.htmlElement.firstChild);
  }
  toggleCollapse() {
    var e, s, i;
    this.data.collapsible && (this.isCollapsed = !this.isCollapsed, this.updateGroupAppearance(), this._updateChildNodeVisibility(), (e = this.space) == null || e.emit("node:group:stateChanged", { groupNode: this, isCollapsed: this.isCollapsed }), (i = (s = this.space) == null ? void 0 : s.plugins.getPlugin("LayoutPlugin")) == null || i.kick());
  }
  updateGroupAppearance() {
    const e = M(".group-node-collapse-button", this.htmlElement);
    e && (e.textContent = this.isCollapsed ? "⊕" : "⊖", e.title = this.isCollapsed ? "Expand" : "Collapse");
  }
  _updateChildNodeVisibility() {
    var s;
    const e = (s = this.space) == null ? void 0 : s.plugins.getPlugin("NodePlugin");
    e && this.childNodeIds.forEach((i) => {
      const n = e.getNodeById(i);
      if (n) {
        const o = !this.isCollapsed;
        n.mesh && (n.mesh.visible = o), n.cssObject && (n.cssObject.visible = o), n.labelObject && (n.labelObject.visible = o);
      }
    });
  }
  addChild(e) {
    this.childNodeIds.has(e) || e === this.id || (this.childNodeIds.add(e), this._updateChildNodeVisibility());
  }
  removeChild(e) {
    var n;
    if (!this.childNodeIds.has(e)) return;
    const s = (n = this.space) == null ? void 0 : n.plugins.getPlugin("NodePlugin"), i = s == null ? void 0 : s.getNodeById(e);
    i && (i.mesh && (i.mesh.visible = !0), i.cssObject && (i.cssObject.visible = !0), i.labelObject && (i.labelObject.visible = !0)), this.childNodeIds.delete(e);
  }
  getChildNodes() {
    var s;
    const e = (s = this.space) == null ? void 0 : s.plugins.getPlugin("NodePlugin");
    return e ? Array.from(this.childNodeIds).map((i) => e.getNodeById(i)).filter((i) => i != null) : [];
  }
  update(e) {
    super.update(e);
  }
  getBoundingSphereRadius() {
    return super.getBoundingSphereRadius();
  }
  dispose() {
    this.childNodeIds.clear(), super.dispose();
  }
}
g(Pe, "typeName", "group");
const os = 100, as = "#222227", Ve = "#eeeeee";
class ke extends ie {
  constructor(e, s, i = {}, n = 1.2) {
    super(e, s, i, n);
    g(this, "canvas", null);
    g(this, "ctx", null);
    g(this, "texture", null);
    this.size = this.data.size || os, this._setupCanvas(), this._createChartMesh(), this.data.label && (this.labelObject = this._createLabel()), this.update(), this.updateBoundingSphere();
  }
  getDefaultData() {
    return {
      label: "Data Node",
      type: "data",
      size: os,
      chartType: "bar",
      chartData: [
        { label: "A", value: 10, color: "#ff6384" },
        { label: "B", value: 20, color: "#36a2eb" },
        { label: "C", value: 15, color: "#ffce56" }
      ],
      chartBackgroundColor: as,
      chartTextColor: Ve
    };
  }
  _setupCanvas() {
    this.canvas = document.createElement("canvas"), this.canvas.width = 256, this.canvas.height = 256, this.ctx = this.canvas.getContext("2d"), this.texture = new u.CanvasTexture(this.canvas), this.texture.colorSpace = u.SRGBColorSpace;
  }
  _createChartMesh() {
    const e = new u.PlaneGeometry(this.size, this.size), s = new u.MeshStandardMaterial({
      map: this.texture,
      side: u.DoubleSide,
      transparent: !0,
      roughness: 0.8,
      metalness: 0.1
    });
    this.mesh = new u.Mesh(e, s), this.mesh.userData = { nodeId: this.id, type: "data-node-mesh" }, this.mesh.castShadow = !0, this.mesh.receiveShadow = !0, this._drawChart();
  }
  _drawChart() {
    if (!this.ctx || !this.canvas) return;
    const { chartType: e, chartData: s, chartBackgroundColor: i, chartTextColor: n } = this.data, { width: o, height: a } = this.canvas;
    if (this.ctx.fillStyle = i || as, this.ctx.fillRect(0, 0, o, a), this.ctx.fillStyle = n || Ve, this.ctx.strokeStyle = n || Ve, this.ctx.font = "16px Arial", this.ctx.textAlign = "center", !(s != null && s.length)) {
      this.ctx.fillText("No Data", o / 2, a / 2), this.texture.needsUpdate = !0;
      return;
    }
    switch (e) {
      case "bar":
        this._drawBarChart(s, o, a);
        break;
      case "line":
        this.ctx.fillText("Line chart NI", o / 2, a / 2);
        break;
      case "pie":
        this.ctx.fillText("Pie chart NI", o / 2, a / 2);
        break;
      default:
        this.ctx.fillText(`Unknown: ${e}`, o / 2, a / 2);
    }
    this.texture.needsUpdate = !0;
  }
  _drawBarChart(e, s, i) {
    const n = e.length;
    if (n === 0) return;
    const o = 20, a = s - 2 * o, r = i - 2 * o - 20, l = a / n - 5, c = Math.max(...e.map((d) => d.value), 0);
    if (c === 0) {
      this.ctx.fillText("All values are 0", s / 2, i / 2);
      return;
    }
    e.forEach((d, h) => {
      const p = d.value / c * r, f = o + h * (l + 5), C = i - o - p - 20;
      this.ctx.fillStyle = d.color || "#cccccc", this.ctx.fillRect(f, C, l, p), this.ctx.fillStyle = this.data.chartTextColor || Ve, this.ctx.fillText(d.label || "", f + l / 2, i - o + 5);
    });
  }
  updateChartData(e) {
    this.data.chartData = e, this._drawChart();
  }
  _createLabel() {
    const e = document.createElement("div");
    return e.className = "node-label-3d node-common", e.textContent = this.data.label || "", e.dataset.nodeId = this.id, new Ie(e);
  }
  update(e) {
    if (super.update(e), this.labelObject) {
      const s = this.getBoundingSphereRadius() * 1.1 + 15;
      this.labelObject.position.copy(this.position).y += s, e != null && e._cam && this.labelObject.quaternion.copy(e._cam.quaternion);
    }
  }
  updateBoundingSphere() {
    this.mesh && (this.mesh.geometry.boundingSphere || this.mesh.geometry.computeBoundingSphere(), this._boundingSphere = this.mesh.geometry.boundingSphere.clone(), this._boundingSphere.center.copy(this.position), this._boundingSphere.radius = this.size / 2 * Math.sqrt(2));
  }
  setSelectedStyle(e) {
    var s, i, n, o;
    (s = this.mesh) != null && s.material && ((i = this.mesh.material.emissive) == null || i.setHex(e ? 3355392 : 0)), (o = (n = this.labelObject) == null ? void 0 : n.element) == null || o.classList.toggle("selected", e);
  }
  dispose() {
    var e;
    super.dispose(), (e = this.texture) == null || e.dispose(), this.canvas = null, this.ctx = null, this.texture = null;
  }
}
g(ke, "typeName", "data");
const Ue = class Ue extends L {
  constructor(t, e, s = { content: "" }) {
    super(t, e, T.mergeDeep({ type: Ue.typeName, editable: !0 }, s));
  }
};
g(Ue, "typeName", "note");
let ye = Ue;
const Ee = class Ee extends ie {
  constructor(e, s, i = {}, n = 1) {
    super(e, s, i, n);
    g(this, "audioContext", null);
    g(this, "audioBuffer", null);
    g(this, "sourceNode", null);
    g(this, "gainNode", null);
    g(this, "isPlaying", !1);
    this.mesh = this.createMesh(), this.mesh.userData = { nodeId: this.id, type: Ee.typeName }, this.update(), this.data.audioUrl && this._loadAudio(this.data.audioUrl);
  }
  getDefaultData() {
    return {
      ...super.getDefaultData(),
      label: "Audio Node",
      audioUrl: "",
      autoplay: !1,
      loop: !1,
      volume: 0.8,
      color: 52479,
      size: 40
    };
  }
  createMesh() {
    if (this.mesh) return this.mesh;
    const e = new u.SphereGeometry(this.data.size * 0.5, 16, 12), s = new u.MeshBasicMaterial({ color: this.data.color, wireframe: !0 });
    return this.mesh = new u.Mesh(e, s), this.mesh.userData = { nodeId: this.id, type: Ee.typeName }, this.mesh;
  }
  _loadAudio(e) {
    e && (this.audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)(), fetch(e).then((s) => s.arrayBuffer()).then((s) => this.audioContext.decodeAudioData(s)).then((s) => {
      this.audioBuffer = s, this.data.autoplay && this.play();
    }).catch((s) => console.error("Error loading audio:", s)));
  }
  play() {
    var e;
    this.isPlaying || !this.audioBuffer || !this.audioContext || (this.sourceNode = this.audioContext.createBufferSource(), this.sourceNode.buffer = this.audioBuffer, this.sourceNode.loop = this.data.loop, this.gainNode = this.audioContext.createGain(), this.gainNode.gain.value = this.data.volume, this.sourceNode.connect(this.gainNode), this.gainNode.connect(this.audioContext.destination), this.sourceNode.start(0), this.isPlaying = !0, this.sourceNode.onended = () => {
      var s;
      this.isPlaying = !1, this.sourceNode = null, this.gainNode = null, this.data.loop || (s = this.space) == null || s.emit("node:audio:ended", { node: this });
    }, (e = this.space) == null || e.emit("node:audio:played", { node: this }));
  }
  pause() {
    var e;
    !this.isPlaying || !this.sourceNode || (this.sourceNode.stop(), this.isPlaying = !1, (e = this.space) == null || e.emit("node:audio:paused", { node: this }));
  }
  setVolume(e) {
    this.data.volume = e, this.gainNode && (this.gainNode.gain.value = e);
  }
  setAudioUrl(e) {
    this.data.audioUrl !== e && (this.pause(), this.data.audioUrl = e, this._loadAudio(e));
  }
  dispose() {
    this.pause(), this.audioContext && (this.audioContext.close(), this.audioContext = null), this.audioBuffer = null, super.dispose();
  }
};
g(Ee, "typeName", "audio");
let be = Ee;
const Ke = class Ke extends ie {
  constructor(e, s, i = {}, n = 1) {
    super(e, s, i, n);
    g(this, "labelObject", null);
    this.mesh = this.createMesh(), this.mesh.userData = { nodeId: this.id, type: Ke.typeName }, (this.data.label || this.data.icon) && (this.labelObject = this._createLabel()), this.update();
  }
  getDefaultData() {
    return {
      ...super.getDefaultData(),
      label: "Document Node",
      documentUrl: "",
      icon: "📄",
      color: 16763904,
      size: 50,
      labelLod: []
    };
  }
  createMesh() {
    if (this.mesh) return this.mesh;
    const e = new u.BoxGeometry(this.data.size, this.data.size * 1.2, 5), s = new u.MeshStandardMaterial({ color: this.data.color, roughness: 0.7, metalness: 0.1 });
    return this.mesh = new u.Mesh(e, s), this.mesh.castShadow = !0, this.mesh.receiveShadow = !0, this.mesh;
  }
  _createLabel() {
    const e = this.data.icon ? `${this.data.icon} ${this.data.label}` : this.data.label, s = {
      color: "var(--sg-node-text)",
      backgroundColor: "var(--sg-label-bg, rgba(10, 10, 20, 0.75))",
      fontSize: "14px",
      padding: "5px 10px",
      borderRadius: "5px"
    };
    return Oe(e, this.id, "node-label-3d", s, "document-label");
  }
  update(e) {
    if (super.update(e), this.labelObject && this.mesh) {
      const s = this.getBoundingSphereRadius() * 1.1 + 10;
      this.labelObject.position.copy(this.position).y += s, e != null && e._cam && this.labelObject.quaternion.copy(e._cam.quaternion), Me(this.labelObject, this.data.labelLod, e);
    }
  }
  getBoundingSphereRadius() {
    return Math.sqrt((this.data.size / 2) ** 2 + (this.data.size * 1.2 / 2) ** 2);
  }
  viewDocument() {
    var e;
    this.data.documentUrl ? ((e = this.space) == null || e.emit("node:document:view", { node: this, url: this.data.documentUrl }), console.log(`DocumentNode: Request to view document at ${this.data.documentUrl}`)) : console.warn(`DocumentNode: No documentUrl specified for node ${this.id}`);
  }
  setSelectedStyle(e) {
    var s, i, n, o;
    (s = this.mesh) != null && s.material && ((i = this.mesh.material.emissive) == null || i.setHex(e ? 3355392 : 0)), (o = (n = this.labelObject) == null ? void 0 : n.element) == null || o.classList.toggle("selected", e);
  }
  dispose() {
    var e, s, i, n;
    (s = (e = this.labelObject) == null ? void 0 : e.element) == null || s.remove(), (n = (i = this.labelObject) == null ? void 0 : i.parent) == null || n.remove(this.labelObject), this.labelObject = null, super.dispose();
  }
};
g(Ke, "typeName", "document");
let Ce = Ke;
const $e = class $e extends L {
  constructor(t, e, s = {}, i = 1) {
    const n = {
      labels: ["Jan", "Feb", "Mar", "Apr", "May"],
      datasets: [{
        label: "Sales",
        data: [65, 59, 80, 81, 56],
        backgroundColor: [
          "rgba(255, 99, 132, 0.7)",
          "rgba(54, 162, 235, 0.7)",
          "rgba(255, 206, 86, 0.7)",
          "rgba(75, 192, 192, 0.7)",
          "rgba(153, 102, 255, 0.7)"
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)"
        ],
        borderWidth: 1
      }]
    }, o = {
      responsive: !0,
      maintainAspectRatio: !1,
      plugins: {
        legend: {
          display: !1,
          labels: {
            color: "white"
            // Default for dark theme
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "white" },
          grid: { color: "rgba(255,255,255,0.1)" }
        },
        y: {
          ticks: { color: "white" },
          grid: { color: "rgba(255,255,255,0.1)" }
        }
      }
    }, a = {
      ...s,
      label: s.label ?? "Chart Node",
      width: s.width ?? 300,
      height: s.height ?? 200,
      chartType: s.chartType ?? "bar",
      chartData: s.chartData ? { ...n, ...s.chartData } : n,
      chartOptions: s.chartOptions ? { ...o, ...s.chartOptions } : o,
      editable: !1,
      // Charts are not directly editable content
      backgroundColor: s.backgroundColor ?? "#2a2a2b",
      type: $e.typeName
    };
    super(t, e, a, i), this.htmlElement.classList.add("node-chart"), this._renderChart();
  }
  getDefaultData() {
    return {
      ...super.getDefaultData(),
      label: "Chart Node",
      width: 300,
      height: 200,
      chartType: "bar",
      chartData: {},
      chartOptions: {},
      backgroundColor: "#2a2a2b"
    };
  }
  _renderChart() {
    const t = `chart-canvas-${this.id}`, e = this.htmlElement.querySelector(".node-content");
    if (!e) return;
    e.innerHTML = `<canvas id="${t}" style="width:100%; height:100%;"></canvas>`;
    const s = e.querySelector(`#${t}`);
    if (typeof Chart > "u") {
      const i = document.createElement("script");
      i.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js", i.onload = () => this._initializeChart(s), document.head.appendChild(i);
    } else
      this._initializeChart(s);
  }
  _initializeChart(t) {
    if (!t || typeof Chart > "u") return;
    this.chartInstance && this.chartInstance.destroy();
    const e = document.body.classList.contains("theme-light"), s = JSON.parse(JSON.stringify(this.data.chartOptions));
    e && (s.plugins.legend.labels.color = "black", s.scales.x.ticks.color = "black", s.scales.x.grid.color = "rgba(0,0,0,0.1)", s.scales.y.ticks.color = "black", s.scales.y.grid.color = "rgba(0,0,0,0.1)"), this.chartInstance = new Chart(t, {
      type: this.data.chartType,
      data: this.data.chartData,
      options: s
    });
  }
  // Override setBackgroundColor to also update chart colors
  setBackgroundColor(t) {
    super.setBackgroundColor(t), this._renderChart();
  }
  // Method to update chart data dynamically
  updateChartData(t) {
    var e;
    this.data.chartData = { ...this.data.chartData, ...t }, this.chartInstance ? (this.chartInstance.data = this.data.chartData, this.chartInstance.update()) : this._renderChart(), (e = this.space) == null || e.emit("graph:node:dataChanged", { node: this, property: "chartData", value: this.data.chartData });
  }
  dispose() {
    this.chartInstance && (this.chartInstance.destroy(), this.chartInstance = null), super.dispose();
  }
};
g($e, "typeName", "chart");
let ve = $e;
class yt extends L {
  constructor(e, s, i = {}, n = 1) {
    const o = {
      width: i.width ?? 280,
      height: i.height ?? 200,
      title: i.title ?? "Control Panel",
      controls: i.controls ?? [],
      theme: i.theme ?? "dark",
      backgroundColor: i.backgroundColor ?? "rgba(20, 25, 40, 0.95)",
      ...i
    };
    super(e, s, o, n);
    g(this, "controls", /* @__PURE__ */ new Map());
    g(this, "values", /* @__PURE__ */ new Map());
    this._initializeControls(), this._bindEvents();
  }
  getDefaultData() {
    return {
      ...super.getDefaultData(),
      type: "control-panel",
      title: "Control Panel",
      controls: [],
      theme: "dark",
      backgroundColor: "rgba(20, 25, 40, 0.95)"
    };
  }
  _createElement() {
    const e = document.createElement("div");
    return e.className = `node-control-panel node-common theme-${this.data.theme}`, e.id = `node-control-panel-${this.id}`, e.dataset.nodeId = this.id, e.style.width = `${this.size.width}px`, e.style.height = `${this.size.height}px`, e.draggable = !1, e.innerHTML = `
            <div class="control-panel-header">
                <h3 class="panel-title">${this.data.title}</h3>
                <div class="panel-actions">
                    <button class="panel-minimize" title="Minimize">−</button>
                    <button class="panel-close" title="Close">×</button>
                </div>
            </div>
            <div class="control-panel-body">
                <div class="controls-container"></div>
            </div>
            <style>
                .node-control-panel {
                    background: ${this.data.backgroundColor};
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    backdrop-filter: blur(10px);
                    font-family: 'Segoe UI', sans-serif;
                    color: white;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                }
                .control-panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: rgba(0,0,0,0.2);
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .panel-title {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: #fff;
                }
                .panel-actions {
                    display: flex;
                    gap: 4px;
                }
                .panel-actions button {
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    transition: background 0.2s;
                }
                .panel-actions button:hover {
                    background: rgba(255,255,255,0.2);
                }
                .control-panel-body {
                    padding: 12px;
                    height: calc(100% - 50px);
                    overflow-y: auto;
                }
                .control-group {
                    margin-bottom: 16px;
                }
                .control-label {
                    display: block;
                    font-size: 12px;
                    margin-bottom: 6px;
                    color: rgba(255,255,255,0.8);
                    font-weight: 500;
                }
                .control-input {
                    width: 100%;
                    padding: 6px 8px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 4px;
                    color: white;
                    font-size: 13px;
                }
                .control-input:focus {
                    outline: none;
                    border-color: #4a9eff;
                    box-shadow: 0 0 0 2px rgba(74,158,255,0.2);
                }
                .control-slider {
                    width: 100%;
                    height: 6px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 3px;
                    outline: none;
                    appearance: none;
                    cursor: pointer;
                }
                .control-slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    background: #4a9eff;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                }
                .control-button {
                    width: 100%;
                    padding: 8px 12px;
                    background: linear-gradient(135deg, #4a9eff, #357abd);
                    border: none;
                    border-radius: 4px;
                    color: white;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .control-button:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(74,158,255,0.3);
                }
                .control-button:active {
                    transform: translateY(0);
                }
                .control-value {
                    float: right;
                    font-size: 11px;
                    color: #4a9eff;
                    font-weight: 600;
                }
                .control-switch {
                    position: relative;
                    width: 44px;
                    height: 24px;
                    margin: 0;
                }
                .control-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .control-switch .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(255,255,255,0.2);
                    transition: 0.3s;
                    border-radius: 24px;
                }
                .control-switch .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }
                .control-switch input:checked + .slider {
                    background-color: #4a9eff;
                }
                .control-switch input:checked + .slider:before {
                    transform: translateX(20px);
                }
            </style>
        `, this._setupPanelInteractions(e), e;
  }
  _setupPanelInteractions(e) {
    const s = M(".panel-minimize", e), i = M(".panel-close", e), n = M(".control-panel-body", e);
    s == null || s.addEventListener("click", (o) => {
      o.stopPropagation();
      const a = n.style.display === "none";
      n.style.display = a ? "block" : "none", s.textContent = a ? "−" : "+", this.setSize(this.size.width, a ? this.size.height : 50);
    }), i == null || i.addEventListener("click", (o) => {
      var a;
      o.stopPropagation(), (a = this.space) == null || a.emit("graph:node:delete", { node: this });
    });
  }
  _initializeControls() {
    const e = M(".controls-container", this.htmlElement);
    e && this.data.controls.forEach((s) => {
      const i = this._createControl(s);
      i && (e.appendChild(i), this.controls.set(s.id, i), this.values.set(s.id, s.value ?? s.defaultValue ?? 0));
    });
  }
  _createControl(e) {
    const s = document.createElement("div");
    s.className = "control-group";
    const i = document.createElement("label");
    if (i.className = "control-label", i.textContent = e.label, e.showValue !== !1 && (e.type === "slider" || e.type === "number")) {
      const o = document.createElement("span");
      o.className = "control-value", o.textContent = e.value ?? e.defaultValue ?? 0, i.appendChild(o);
    }
    s.appendChild(i);
    let n;
    switch (e.type) {
      case "slider":
        n = this._createSlider(e);
        break;
      case "button":
        n = this._createButton(e);
        break;
      case "switch":
        n = this._createSwitch(e);
        break;
      case "text":
        n = this._createTextInput(e);
        break;
      case "number":
        n = this._createNumberInput(e);
        break;
      case "select":
        n = this._createSelect(e);
        break;
      default:
        return null;
    }
    return n ? (s.appendChild(n), s) : null;
  }
  _createSlider(e) {
    const s = document.createElement("input");
    return s.type = "range", s.className = "control-slider", s.min = e.min ?? 0, s.max = e.max ?? 100, s.step = e.step ?? 1, s.value = e.value ?? e.defaultValue ?? 0, s.addEventListener("input", (i) => {
      const n = parseFloat(i.target.value);
      this.values.set(e.id, n);
      const o = i.target.parentNode.querySelector(".control-value");
      o && (o.textContent = n), this._emitControlChange(e.id, n, e);
    }), s;
  }
  _createButton(e) {
    const s = document.createElement("button");
    return s.className = "control-button", s.textContent = e.text ?? e.label, s.addEventListener("click", (i) => {
      i.stopPropagation(), this._emitControlChange(e.id, !0, e);
    }), s;
  }
  _createSwitch(e) {
    const s = document.createElement("label");
    s.className = "control-switch";
    const i = document.createElement("input");
    i.type = "checkbox", i.checked = e.value ?? e.defaultValue ?? !1;
    const n = document.createElement("span");
    return n.className = "slider", s.appendChild(i), s.appendChild(n), i.addEventListener("change", (o) => {
      const a = o.target.checked;
      this.values.set(e.id, a), this._emitControlChange(e.id, a, e);
    }), s;
  }
  _createTextInput(e) {
    const s = document.createElement("input");
    return s.type = "text", s.className = "control-input", s.value = e.value ?? e.defaultValue ?? "", s.placeholder = e.placeholder ?? "", s.addEventListener("input", (i) => {
      const n = i.target.value;
      this.values.set(e.id, n), this._emitControlChange(e.id, n, e);
    }), s.addEventListener("pointerdown", (i) => i.stopPropagation()), s;
  }
  _createNumberInput(e) {
    const s = document.createElement("input");
    return s.type = "number", s.className = "control-input", s.value = e.value ?? e.defaultValue ?? 0, s.min = e.min ?? "", s.max = e.max ?? "", s.step = e.step ?? "any", s.addEventListener("input", (i) => {
      const n = parseFloat(i.target.value) || 0;
      this.values.set(e.id, n);
      const o = i.target.parentNode.querySelector(".control-value");
      o && (o.textContent = n), this._emitControlChange(e.id, n, e);
    }), s.addEventListener("pointerdown", (i) => i.stopPropagation()), s;
  }
  _createSelect(e) {
    const s = document.createElement("select");
    return s.className = "control-input", (e.options ?? []).forEach((i) => {
      const n = document.createElement("option");
      n.value = i.value ?? i, n.textContent = i.label ?? i, s.appendChild(n);
    }), s.value = e.value ?? e.defaultValue ?? "", s.addEventListener("change", (i) => {
      const n = i.target.value;
      this.values.set(e.id, n), this._emitControlChange(e.id, n, e);
    }), s.addEventListener("pointerdown", (i) => i.stopPropagation()), s;
  }
  _emitControlChange(e, s, i) {
    var n;
    (n = this.space) == null || n.emit("graph:node:controlChanged", {
      node: this,
      controlId: e,
      value: s,
      control: i,
      allValues: Object.fromEntries(this.values)
    });
  }
  _bindEvents() {
    this.htmlElement.addEventListener("pointerdown", (e) => {
      e.target.closest(".control-input, .control-slider, .control-button, .control-switch") || e.stopPropagation();
    });
  }
  setValue(e, s) {
    if (!this.controls.has(e))
      return;
    this.values.set(e, s);
    const i = this.controls.get(e);
    if (!i) return;
    const n = i.querySelector("input, select, button");
    if (n)
      if (n.type === "checkbox")
        n.checked = s;
      else if (n.type === "range" || n.type === "number") {
        n.value = s;
        const o = i.querySelector(".control-value");
        o && (o.textContent = s);
      } else
        n.value = s;
  }
  getValue(e) {
    return this.values.get(e);
  }
  getAllValues() {
    return Object.fromEntries(this.values);
  }
  addControl(e) {
    this.data.controls.push(e);
    const s = M(".controls-container", this.htmlElement);
    if (s) {
      const i = this._createControl(e);
      i && (s.appendChild(i), this.controls.set(e.id, i), this.values.set(e.id, e.value ?? e.defaultValue ?? 0));
    }
  }
  removeControl(e) {
    const s = this.controls.get(e);
    s && (s.remove(), this.controls.delete(e), this.values.delete(e)), this.data.controls = this.data.controls.filter((i) => i.id !== e);
  }
}
g(yt, "typeName", "control-panel");
class bt extends L {
  constructor(t, e, s = {}, i = 1) {
    const n = {
      width: s.width ?? 200,
      height: s.height ?? 80,
      type: s.progressType ?? "bar",
      value: s.value ?? 0,
      max: s.max ?? 100,
      min: s.min ?? 0,
      label: s.label ?? "",
      showValue: s.showValue ?? !0,
      showPercent: s.showPercent ?? !0,
      animated: s.animated ?? !0,
      color: s.color ?? "#4a9eff",
      backgroundColor: s.backgroundColor ?? "rgba(30, 35, 50, 0.95)",
      ...s
    };
    super(t, e, n, i), this._animationFrame = null;
  }
  getDefaultData() {
    return {
      ...super.getDefaultData(),
      type: "progress",
      progressType: "bar",
      value: 0,
      max: 100,
      min: 0,
      label: "",
      showValue: !0,
      showPercent: !0,
      animated: !0,
      color: "#4a9eff",
      backgroundColor: "rgba(30, 35, 50, 0.95)"
    };
  }
  _createElement() {
    const t = document.createElement("div");
    return t.className = "node-progress node-common", t.id = `node-progress-${this.id}`, t.dataset.nodeId = this.id, t.style.width = `${this.size.width}px`, t.style.height = `${this.size.height}px`, t.draggable = !1, t.innerHTML = `
            <div class="progress-container">
                <!-- Content will be populated by _updateProgress -->
            </div>
            <style>
                .node-progress {
                    background: ${this.data.backgroundColor};
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    padding: 12px;
                    font-family: 'Segoe UI', sans-serif;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                }
                .progress-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .progress-label {
                    font-size: 14px;
                    font-weight: 600;
                    color: rgba(255,255,255,0.9);
                    margin-bottom: 4px;
                }
                .progress-bar-wrapper {
                    width: 100%;
                    height: 20px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                    overflow: hidden;
                    position: relative;
                }
                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, ${this.data.color}, ${this._lightenColor(this.data.color, 20)});
                    border-radius: 10px;
                    transition: width 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                .progress-bar-fill.animated::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    animation: shimmer 1.5s infinite;
                }
                @keyframes shimmer {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }
                .progress-value {
                    font-size: 12px;
                    color: rgba(255,255,255,0.8);
                    margin-top: 4px;
                }
                .progress-circular {
                    position: relative;
                    width: 80px;
                    height: 80px;
                }
                .progress-circular svg {
                    width: 100%;
                    height: 100%;
                    transform: rotate(-90deg);
                }
                .progress-circular-bg {
                    fill: none;
                    stroke: rgba(255,255,255,0.1);
                    stroke-width: 6;
                }
                .progress-circular-fill {
                    fill: none;
                    stroke: ${this.data.color};
                    stroke-width: 6;
                    stroke-linecap: round;
                    transition: stroke-dashoffset 0.3s ease;
                }
                .progress-circular-text {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 14px;
                    font-weight: 600;
                    color: white;
                }
                .progress-gauge {
                    position: relative;
                    width: 100px;
                    height: 60px;
                }
                .progress-gauge svg {
                    width: 100%;
                    height: 100%;
                }
                .progress-gauge-bg {
                    fill: none;
                    stroke: rgba(255,255,255,0.1);
                    stroke-width: 8;
                }
                .progress-gauge-fill {
                    fill: none;
                    stroke: ${this.data.color};
                    stroke-width: 8;
                    stroke-linecap: round;
                    transition: stroke-dashoffset 0.3s ease;
                }
                .progress-gauge-needle {
                    stroke: white;
                    stroke-width: 2;
                    transition: transform 0.3s ease;
                    transform-origin: 50px 50px;
                }
                .progress-gauge-text {
                    position: absolute;
                    bottom: 5px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 12px;
                    color: white;
                }
                .progress-steps {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                }
                .progress-step {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }
                .progress-step.completed {
                    background: ${this.data.color};
                    color: white;
                }
                .progress-step.current {
                    background: ${this.data.color};
                    color: white;
                    transform: scale(1.2);
                    box-shadow: 0 0 10px ${this.data.color}50;
                }
                .progress-step-line {
                    height: 2px;
                    background: rgba(255,255,255,0.1);
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                }
                .progress-step-line.completed {
                    background: ${this.data.color};
                }
            </style>
        `, this._updateProgress(t), t;
  }
  _generateProgressContent() {
    const t = this._getPercent();
    switch (this.data.progressType) {
      case "circular":
        return this._generateCircularProgress(t);
      case "gauge":
        return this._generateGaugeProgress(t);
      case "steps":
        return this._generateStepsProgress();
      case "bar":
      default:
        return this._generateBarProgress(t);
    }
  }
  _generateBarProgress(t) {
    return `
            ${this.data.label ? `<div class="progress-label">${this.data.label}</div>` : ""}
            <div class="progress-bar-wrapper">
                <div class="progress-bar-fill ${this.data.animated ? "animated" : ""}" style="width: ${t}%"></div>
            </div>
            ${this._generateValueText()}
        `;
  }
  _generateCircularProgress(t) {
    const s = 2 * Math.PI * 32, i = s - t / 100 * s;
    return `
            ${this.data.label ? `<div class="progress-label">${this.data.label}</div>` : ""}
            <div class="progress-circular">
                <svg>
                    <circle class="progress-circular-bg" cx="40" cy="40" r="32"></circle>
                    <circle class="progress-circular-fill" cx="40" cy="40" r="32"
                            style="stroke-dasharray: ${s}; stroke-dashoffset: ${i};"></circle>
                </svg>
                <div class="progress-circular-text">${Math.round(t)}%</div>
            </div>
            ${this.data.showValue ? `<div class="progress-value">${this.data.value} / ${this.data.max}</div>` : ""}
        `;
  }
  _generateGaugeProgress(t) {
    const n = -135 + t / 100 * 270, o = 35, a = 50, r = 45, l = a + o * Math.cos(-135 * Math.PI / 180), c = r + o * Math.sin(-135 * Math.PI / 180), d = a + o * Math.cos(135 * Math.PI / 180), h = r + o * Math.sin(135 * Math.PI / 180), p = a + 30 * Math.cos(n * Math.PI / 180), f = r + 30 * Math.sin(n * Math.PI / 180);
    return `
            ${this.data.label ? `<div class="progress-label">${this.data.label}</div>` : ""}
            <div class="progress-gauge">
                <svg viewBox="0 0 100 60">
                    <path class="progress-gauge-bg"
                          d="M ${l} ${c} A ${o} ${o} 0 1 1 ${d} ${h}"></path>
                    <path class="progress-gauge-fill"
                          d="M ${l} ${c} A ${o} ${o} 0 ${t > 50 ? 1 : 0} 1 ${p} ${f}"
                          style="stroke-dasharray: ${t / 100 * Math.PI * o * 1.5}; stroke-dashoffset: 0;"></path>
                    <line class="progress-gauge-needle" x1="${a}" y1="${r}" x2="${p}" y2="${f}"></line>
                    <circle cx="${a}" cy="${r}" r="3" fill="white"></circle>
                </svg>
                <div class="progress-gauge-text">${Math.round(t)}%</div>
            </div>
        `;
  }
  _generateStepsProgress() {
    const t = this.data.steps ?? 5, e = Math.floor(this.data.value / this.data.max * t);
    let s = "";
    for (let i = 0; i < t; i++) {
      const n = i < e ? "completed" : i === e ? "current" : "";
      if (s += `<div class="progress-step ${n}">${i + 1}</div>`, i < t - 1) {
        const o = i < e ? "completed" : "";
        s += `<div class="progress-step-line ${o}"></div>`;
      }
    }
    return `
            ${this.data.label ? `<div class="progress-label">${this.data.label}</div>` : ""}
            <div class="progress-steps">
                ${s}
            </div>
            ${this._generateValueText()}
        `;
  }
  _generateValueText() {
    if (!this.data.showValue && !this.data.showPercent) return "";
    let t = "";
    return this.data.showValue && (t += `${this.data.value} / ${this.data.max}`), this.data.showValue && this.data.showPercent && (t += " • "), this.data.showPercent && (t += `${Math.round(this._getPercent())}%`), `<div class="progress-value">${t}</div>`;
  }
  _getPercent() {
    const t = this.data.max - this.data.min, e = Math.max(this.data.min, Math.min(this.data.max, this.data.value));
    return t > 0 ? (e - this.data.min) / t * 100 : 0;
  }
  _lightenColor(t, e) {
    const s = parseInt(t.replace("#", ""), 16), i = Math.round(2.55 * e), n = (s >> 16) + i, o = (s >> 8 & 255) + i, a = (s & 255) + i;
    return "#" + (16777216 + (n < 255 ? n < 1 ? 0 : n : 255) * 65536 + (o < 255 ? o < 1 ? 0 : o : 255) * 256 + (a < 255 ? a < 1 ? 0 : a : 255)).toString(16).slice(1);
  }
  _updateProgress(t) {
    const e = t || this.htmlElement;
    if (!e) return;
    const s = M(".progress-container", e);
    s && (s.innerHTML = this._generateProgressContent());
  }
  setValue(t) {
    var e;
    this.data.value = Math.max(this.data.min, Math.min(this.data.max, t)), this._updateProgress(), (e = this.space) == null || e.emit("graph:node:dataChanged", {
      node: this,
      property: "value",
      value: this.data.value
    });
  }
  setMax(t) {
    this.data.max = t, this._updateProgress();
  }
  setMin(t) {
    this.data.min = t, this._updateProgress();
  }
  increment(t = 1) {
    this.setValue(this.data.value + t);
  }
  decrement(t = 1) {
    this.setValue(this.data.value - t);
  }
  animateToValue(t, e = 1e3) {
    const s = this.data.value, i = performance.now(), n = (o) => {
      const a = o - i, r = Math.min(a / e, 1), l = 1 - Math.pow(1 - r, 3), c = s + (t - s) * l;
      this.setValue(c), r < 1 ? this._animationFrame = requestAnimationFrame(n) : this._animationFrame = null;
    };
    this._animationFrame && cancelAnimationFrame(this._animationFrame), this._animationFrame = requestAnimationFrame(n);
  }
  dispose() {
    this._animationFrame && (cancelAnimationFrame(this._animationFrame), this._animationFrame = null), super.dispose();
  }
}
g(bt, "typeName", "progress");
class Ct extends L {
  constructor(e, s, i = {}, n = 1) {
    const o = {
      width: i.width ?? 400,
      height: i.height ?? 300,
      title: i.title ?? "Canvas",
      backgroundColor: i.backgroundColor ?? "rgba(20, 25, 40, 0.95)",
      canvasBackground: i.canvasBackground ?? "#1a1a2e",
      showToolbar: i.showToolbar ?? !0,
      enableDrawing: i.enableDrawing ?? !0,
      preserveContent: i.preserveContent ?? !0,
      ...i
    };
    super(e, s, o, n);
    g(this, "canvas", null);
    g(this, "ctx", null);
    g(this, "isDrawing", !1);
    g(this, "lastDrawPoint", null);
    g(this, "drawingMode", "pen");
    g(this, "tools", {
      pen: { color: "#ffffff", size: 2 },
      brush: { color: "#ffffff", size: 8 },
      eraser: { size: 10 },
      line: { color: "#ffffff", size: 2 },
      rectangle: { color: "#ffffff", size: 2, fill: !1 },
      circle: { color: "#ffffff", size: 2, fill: !1 }
    });
    this._setupCanvas(), this._setupTools(), this._bindCanvasEvents();
  }
  getDefaultData() {
    return {
      ...super.getDefaultData(),
      type: "canvas",
      title: "Canvas",
      backgroundColor: "rgba(20, 25, 40, 0.95)",
      canvasBackground: "#1a1a2e",
      showToolbar: !0,
      enableDrawing: !0,
      preserveContent: !0
    };
  }
  _createElement() {
    const e = document.createElement("div");
    e.className = "node-canvas node-common", e.id = `node-canvas-${this.id}`, e.dataset.nodeId = this.id, e.style.width = `${this.size.width}px`, e.style.height = `${this.size.height}px`, e.draggable = !1;
    const s = this.data.showToolbar ? 40 : 0, i = this.size.height - 20 - s;
    return e.innerHTML = `
            <div class="canvas-container">
                ${this.data.showToolbar ? this._generateToolbar() : ""}
                <div class="canvas-wrapper" style="height: ${i}px;">
                    <canvas class="drawing-canvas" width="${this.size.width - 20}" height="${i}"></canvas>
                </div>
            </div>
            <style>
                .node-canvas {
                    background: ${this.data.backgroundColor};
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    padding: 10px;
                    font-family: 'Segoe UI', sans-serif;
                    color: white;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    overflow: hidden;
                }
                .canvas-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .canvas-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    background: rgba(0,0,0,0.2);
                    border-radius: 4px;
                    margin-bottom: 8px;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .tool-group {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 0 8px;
                    border-right: 1px solid rgba(255,255,255,0.1);
                }
                .tool-group:last-child {
                    border-right: none;
                }
                .tool-button {
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    padding: 6px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                    min-width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .tool-button:hover {
                    background: rgba(255,255,255,0.2);
                }
                .tool-button.active {
                    background: #4a9eff;
                    color: white;
                }
                .tool-slider {
                    width: 60px;
                    height: 20px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 10px;
                    outline: none;
                    appearance: none;
                    cursor: pointer;
                }
                .tool-slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #4a9eff;
                    border-radius: 50%;
                    cursor: pointer;
                }
                .color-picker {
                    width: 24px;
                    height: 24px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    background: none;
                    padding: 0;
                }
                .canvas-wrapper {
                    flex: 1;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 4px;
                    overflow: hidden;
                    position: relative;
                }
                .drawing-canvas {
                    background: ${this.data.canvasBackground};
                    display: block;
                    cursor: crosshair;
                    width: 100%;
                    height: 100%;
                }
                .drawing-canvas.eraser {
                    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect x="2" y="2" width="16" height="16" fill="white" stroke="black" stroke-width="1" rx="2"/></svg>') 10 10, auto;
                }
                .tool-label {
                    font-size: 10px;
                    color: rgba(255,255,255,0.7);
                    margin-right: 4px;
                }
            </style>
        `, e;
  }
  _generateToolbar() {
    return `
            <div class="canvas-toolbar">
                <div class="tool-group">
                    <button class="tool-button active" data-tool="pen" title="Pen">✏️</button>
                    <button class="tool-button" data-tool="brush" title="Brush">🖌️</button>
                    <button class="tool-button" data-tool="eraser" title="Eraser">🧹</button>
                </div>
                <div class="tool-group">
                    <button class="tool-button" data-tool="line" title="Line">📏</button>
                    <button class="tool-button" data-tool="rectangle" title="Rectangle">⬜</button>
                    <button class="tool-button" data-tool="circle" title="Circle">⭕</button>
                </div>
                <div class="tool-group">
                    <span class="tool-label">Size:</span>
                    <input type="range" class="tool-slider" id="size-slider" min="1" max="20" value="2">
                </div>
                <div class="tool-group">
                    <span class="tool-label">Color:</span>
                    <input type="color" class="color-picker" id="color-picker" value="#ffffff">
                </div>
                <div class="tool-group">
                    <button class="tool-button" id="clear-canvas" title="Clear">🗑️</button>
                    <button class="tool-button" id="save-canvas" title="Save">💾</button>
                </div>
            </div>
        `;
  }
  _setupCanvas() {
    this.canvas = M(".drawing-canvas", this.htmlElement), this.canvas && (this.ctx = this.canvas.getContext("2d"), this.ctx.lineCap = "round", this.ctx.lineJoin = "round", this.data.preserveContent && this.data.canvasData && this._loadCanvasData(this.data.canvasData));
  }
  _setupTools() {
    if (!this.data.showToolbar) return;
    const e = this.htmlElement.querySelectorAll("[data-tool]");
    e.forEach((a) => {
      a.addEventListener("click", (r) => {
        r.stopPropagation(), this._setTool(a.dataset.tool), e.forEach((l) => l.classList.remove("active")), a.classList.add("active");
      });
    });
    const s = M("#size-slider", this.htmlElement);
    s && s.addEventListener("input", (a) => {
      a.stopPropagation();
      const r = parseInt(a.target.value);
      this.tools[this.drawingMode].size = r;
    });
    const i = M("#color-picker", this.htmlElement);
    i && i.addEventListener("change", (a) => {
      a.stopPropagation();
      const r = a.target.value;
      this.tools[this.drawingMode] && this.drawingMode !== "eraser" && (this.tools[this.drawingMode].color = r);
    });
    const n = M("#clear-canvas", this.htmlElement);
    n && n.addEventListener("click", (a) => {
      a.stopPropagation(), this.clearCanvas();
    });
    const o = M("#save-canvas", this.htmlElement);
    o && o.addEventListener("click", (a) => {
      a.stopPropagation(), this.saveCanvas();
    });
  }
  _bindCanvasEvents() {
    !this.canvas || !this.data.enableDrawing || (this.canvas.addEventListener("pointerdown", (e) => {
      e.stopPropagation(), this.isDrawing = !0;
      const s = this.canvas.getBoundingClientRect(), i = {
        x: e.clientX - s.left,
        y: e.clientY - s.top
      };
      this.drawingMode === "pen" || this.drawingMode === "brush" || this.drawingMode === "eraser" ? (this.lastDrawPoint = i, this._drawDot(i)) : this.startPoint = i;
    }), this.canvas.addEventListener("pointermove", (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const s = this.canvas.getBoundingClientRect(), i = {
        x: e.clientX - s.left,
        y: e.clientY - s.top
      };
      (this.drawingMode === "pen" || this.drawingMode === "brush" || this.drawingMode === "eraser") && (this._drawLine(this.lastDrawPoint, i), this.lastDrawPoint = i);
    }), this.canvas.addEventListener("pointerup", (e) => {
      if (this.isDrawing) {
        if (this.isDrawing = !1, this.drawingMode === "line" || this.drawingMode === "rectangle" || this.drawingMode === "circle") {
          const s = this.canvas.getBoundingClientRect(), i = {
            x: e.clientX - s.left,
            y: e.clientY - s.top
          };
          this._drawShape(this.startPoint, i);
        }
        this._saveCanvasState();
      }
    }), this.canvas.addEventListener("pointerleave", () => {
      this.isDrawing = !1;
    }), this.canvas.addEventListener("touchstart", (e) => e.preventDefault()), this.canvas.addEventListener("touchmove", (e) => e.preventDefault()), this.canvas.addEventListener("touchend", (e) => e.preventDefault()));
  }
  _setTool(e) {
    this.drawingMode = e, this.canvas.className = `drawing-canvas ${e === "eraser" ? "eraser" : ""}`;
    const s = M("#size-slider", this.htmlElement), i = M("#color-picker", this.htmlElement);
    s && this.tools[e] && (s.value = this.tools[e].size || 2), i && this.tools[e] && e !== "eraser" && (i.value = this.tools[e].color || "#ffffff");
  }
  _drawDot(e) {
    this.ctx.beginPath(), this.drawingMode === "eraser" ? (this.ctx.globalCompositeOperation = "destination-out", this.ctx.arc(e.x, e.y, this.tools.eraser.size / 2, 0, Math.PI * 2)) : (this.ctx.globalCompositeOperation = "source-over", this.ctx.fillStyle = this.tools[this.drawingMode].color, this.ctx.arc(e.x, e.y, this.tools[this.drawingMode].size / 2, 0, Math.PI * 2)), this.ctx.fill();
  }
  _drawLine(e, s) {
    this.ctx.beginPath(), this.drawingMode === "eraser" ? (this.ctx.globalCompositeOperation = "destination-out", this.ctx.lineWidth = this.tools.eraser.size) : (this.ctx.globalCompositeOperation = "source-over", this.ctx.strokeStyle = this.tools[this.drawingMode].color, this.ctx.lineWidth = this.tools[this.drawingMode].size), this.ctx.moveTo(e.x, e.y), this.ctx.lineTo(s.x, s.y), this.ctx.stroke();
  }
  _drawShape(e, s) {
    const i = this.tools[this.drawingMode];
    switch (this.ctx.globalCompositeOperation = "source-over", this.ctx.strokeStyle = i.color, this.ctx.lineWidth = i.size, this.ctx.beginPath(), this.drawingMode) {
      case "line":
        this.ctx.moveTo(e.x, e.y), this.ctx.lineTo(s.x, s.y), this.ctx.stroke();
        break;
      case "rectangle":
        const n = s.x - e.x, o = s.y - e.y;
        i.fill ? (this.ctx.fillStyle = i.color, this.ctx.fillRect(e.x, e.y, n, o)) : this.ctx.strokeRect(e.x, e.y, n, o);
        break;
      case "circle":
        const a = Math.sqrt(Math.pow(s.x - e.x, 2) + Math.pow(s.y - e.y, 2));
        this.ctx.arc(e.x, e.y, a, 0, Math.PI * 2), i.fill ? (this.ctx.fillStyle = i.color, this.ctx.fill()) : this.ctx.stroke();
        break;
    }
  }
  _saveCanvasState() {
    var e;
    this.data.preserveContent && (this.data.canvasData = this.canvas.toDataURL(), (e = this.space) == null || e.emit("graph:node:dataChanged", {
      node: this,
      property: "canvasData",
      value: this.data.canvasData
    }));
  }
  _loadCanvasData(e) {
    const s = new Image();
    s.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height), this.ctx.drawImage(s, 0, 0);
    }, s.src = e;
  }
  clearCanvas() {
    var e;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height), this._saveCanvasState(), (e = this.space) == null || e.emit("graph:node:canvasCleared", { node: this });
  }
  saveCanvas() {
    var i;
    const e = this.canvas.toDataURL("image/png"), s = document.createElement("a");
    s.download = `canvas-${this.id}.png`, s.href = e, s.click(), (i = this.space) == null || i.emit("graph:node:canvasSaved", {
      node: this,
      dataUrl: e,
      filename: `canvas-${this.id}.png`
    });
  }
  drawImage(e, s = 0, i = 0, n = null, o = null) {
    n && o ? this.ctx.drawImage(e, s, i, n, o) : this.ctx.drawImage(e, s, i), this._saveCanvasState();
  }
  drawText(e, s, i, n = {}) {
    const {
      color: o = "#ffffff",
      font: a = "16px Arial",
      align: r = "left",
      baseline: l = "top"
    } = n;
    this.ctx.fillStyle = o, this.ctx.font = a, this.ctx.textAlign = r, this.ctx.textBaseline = l, this.ctx.fillText(e, s, i), this._saveCanvasState();
  }
  getCanvasData() {
    return this.canvas.toDataURL();
  }
  setCanvasData(e) {
    this._loadCanvasData(e);
  }
}
g(Ct, "typeName", "canvas");
class vt extends q {
  constructor(e, s, i = {}, n = 1.5) {
    const o = {
      shapeType: i.shapeType ?? "fractal",
      complexity: i.complexity ?? 3,
      animated: i.animated ?? !1,
      animationSpeed: i.animationSpeed ?? 1,
      parameters: i.parameters ?? {},
      wireframe: i.wireframe ?? !1,
      materialType: i.materialType ?? "standard",
      ...i
    };
    super(e, s, o, n);
    g(this, "generatorFunction", null);
    g(this, "animationFrame", null);
    g(this, "geometryCache", /* @__PURE__ */ new Map());
    this._generateProcedural(), o.animated && this._startAnimation();
  }
  getDefaultData() {
    return {
      ...super.getDefaultData(),
      type: "procedural-shape",
      shapeType: "fractal",
      complexity: 3,
      animated: !1,
      animationSpeed: 1,
      parameters: {},
      wireframe: !1,
      materialType: "standard"
    };
  }
  _generateProcedural() {
    const e = this._getCacheKey();
    if (this.geometryCache.has(e)) {
      this._useCachedGeometry(e);
      return;
    }
    let s;
    switch (this.data.shapeType) {
      case "fractal":
        s = this._generateFractal();
        break;
      case "crystal":
        s = this._generateCrystal();
        break;
      case "organic":
        s = this._generateOrganic();
        break;
      case "spiral":
        s = this._generateSpiral();
        break;
      case "flower":
        s = this._generateFlower();
        break;
      case "tree":
        s = this._generateTree();
        break;
      case "terrain":
        s = this._generateTerrain();
        break;
      case "voronoi":
        s = this._generateVoronoi();
        break;
      case "l-system":
        s = this._generateLSystem();
        break;
      default:
        s = new u.SphereGeometry(this.size / 2, 32, 16);
    }
    this.geometryCache.set(e, s), this._applyGeometry(s);
  }
  _getCacheKey() {
    return `${this.data.shapeType}_${this.data.complexity}_${JSON.stringify(this.data.parameters)}`;
  }
  _useCachedGeometry(e) {
    const s = this.geometryCache.get(e);
    s && this._applyGeometry(s.clone());
  }
  _applyGeometry(e) {
    var n, o, a, r;
    if (!e) return;
    (a = (o = (n = this.mesh) == null ? void 0 : n.children) == null ? void 0 : o[0]) != null && a.geometry && this.mesh.children[0].geometry.dispose();
    const s = this._createMaterial(), i = new u.Mesh(e, s);
    i.castShadow = !0, i.receiveShadow = !0, (r = this.mesh) != null && r.children && this.mesh.children.forEach((l) => this.mesh.remove(l)), this.mesh && this.mesh.add(i);
  }
  _createMaterial() {
    const e = {
      color: this.color,
      wireframe: this.data.wireframe,
      transparent: this.data.wireframe,
      opacity: this.data.wireframe ? 0.8 : 1
    };
    switch (this.data.materialType) {
      case "basic":
        return new u.MeshBasicMaterial(e);
      case "lambert":
        return new u.MeshLambertMaterial(e);
      case "phong":
        return new u.MeshPhongMaterial({
          ...e,
          shininess: 100
        });
      case "standard":
      default:
        return new u.MeshStandardMaterial({
          ...e,
          roughness: 0.7,
          metalness: 0.1
        });
    }
  }
  _generateFractal() {
    const { iterations: e = 3, scale: s = 0.5, offset: i = 1 } = this.data.parameters, n = new u.TetrahedronGeometry(this.size / 2);
    if (e <= 1) return n;
    const o = new u.Group(), a = (r, l, c, d) => {
      if (l <= 0) return;
      const h = new u.Mesh(r.clone());
      if (h.scale.setScalar(c), h.position.copy(d), o.add(h), l > 1) {
        const p = c * s;
        [
          new u.Vector3(i * c, i * c, 0),
          new u.Vector3(-i * c, i * c, 0),
          new u.Vector3(0, -i * c, i * c),
          new u.Vector3(0, -i * c, -i * c)
        ].forEach((C) => {
          a(r, l - 1, p, d.clone().add(C));
        });
      }
    };
    return a(n, e, 1, new u.Vector3()), this._mergeGroupGeometries(o);
  }
  _generateCrystal() {
    const { faces: e = 8, height: s = this.size, irregularity: i = 0.1 } = this.data.parameters, n = [], o = [], a = this.size / 3;
    for (let d = 0; d < e; d++) {
      const h = d / e * Math.PI * 2, p = (Math.random() - 0.5) * i * a, f = Math.cos(h) * (a + p), C = Math.sin(h) * (a + p);
      n.push(f, -s / 2, C), n.push(f * 0.3, s / 2, C * 0.3);
    }
    n.push(0, -s / 2 - a * 0.5, 0), n.push(0, s / 2 + a * 0.3, 0);
    const r = e * 2, l = e * 2 + 1;
    for (let d = 0; d < e; d++) {
      const h = (d + 1) % e, p = d * 2, f = d * 2 + 1, C = h * 2, b = h * 2 + 1;
      o.push(p, f, b), o.push(p, b, C), o.push(p, C, r), o.push(f, l, b);
    }
    const c = new u.BufferGeometry();
    return c.setAttribute("position", new u.Float32BufferAttribute(n, 3)), c.setIndex(o), c.computeVertexNormals(), c;
  }
  _generateOrganic() {
    const { segments: e = 32, rings: s = 16, noise: i = 0.3, bulges: n = 3 } = this.data.parameters, o = new u.SphereGeometry(this.size / 2, e, s), a = o.attributes.position.array;
    for (let r = 0; r < a.length; r += 3) {
      const l = new u.Vector3(a[r], a[r + 1], a[r + 2]);
      l.length();
      const c = this._noise3D(l.x * 0.1, l.y * 0.1, l.z * 0.1) * i, d = Math.sin(l.x * n) * Math.sin(l.y * n) * Math.sin(l.z * n), h = 1 + c + d * 0.2;
      l.multiplyScalar(h), a[r] = l.x, a[r + 1] = l.y, a[r + 2] = l.z;
    }
    return o.computeVertexNormals(), o;
  }
  _generateSpiral() {
    const { turns: e = 5, height: s = this.size, radius: i = this.size / 3, thickness: n = 5 } = this.data.parameters, o = [], a = e * 50;
    for (let l = 0; l <= a; l++) {
      const c = l / a, d = c * e * Math.PI * 2, h = (c - 0.5) * s, p = i * (1 - c * 0.3);
      o.push(new u.Vector3(
        Math.cos(d) * p,
        h,
        Math.sin(d) * p
      ));
    }
    const r = new u.CatmullRomCurve3(o);
    return new u.TubeGeometry(r, a, n, 8, !1);
  }
  _generateFlower() {
    const { petals: e = 8, layers: s = 3, petalSize: i = this.size / 2 } = this.data.parameters, n = new u.Group();
    for (let r = 0; r < s; r++) {
      const l = i * (1 - r * 0.2), c = r * i * 0.1;
      for (let d = 0; d < e; d++) {
        const h = d / e * Math.PI * 2 + r * Math.PI / e, p = new u.ConeGeometry(
          l * 0.3,
          l,
          8
        ), f = new u.Mesh(p);
        f.position.set(
          Math.cos(h) * l * 0.5,
          c,
          Math.sin(h) * l * 0.5
        ), f.rotation.z = h + Math.PI / 2, f.rotation.x = Math.PI / 6, n.add(f);
      }
    }
    const o = new u.SphereGeometry(i * 0.2, 16, 8), a = new u.Mesh(o);
    return n.add(a), this._mergeGroupGeometries(n);
  }
  _generateTree() {
    const { depth: e = 4, branches: s = 3, trunkHeight: i = this.size, branchAngle: n = Math.PI / 4 } = this.data.parameters, o = new u.Group(), a = (r, l, c, d) => {
      if (d <= 0 || c < this.size * 0.05) return;
      const h = r.clone().add(l.clone().multiplyScalar(c)), p = c * 0.1 * (d / e), f = new u.CylinderGeometry(
        p * 0.5,
        p,
        c,
        8
      ), C = new u.Mesh(f);
      if (C.position.copy(r.clone().add(l.clone().multiplyScalar(c / 2))), C.lookAt(h), C.rotateX(Math.PI / 2), o.add(C), d > 1)
        for (let b = 0; b < s; b++) {
          const y = b / s * Math.PI * 2, w = l.clone(), v = new u.Vector3().crossVectors(l, new u.Vector3(0, 1, 0)).normalize(), I = new u.Vector3().crossVectors(l, v);
          w.applyAxisAngle(I, n), w.applyAxisAngle(l, y), a(h, w, c * 0.7, d - 1);
        }
    };
    return a(
      new u.Vector3(0, -i / 2, 0),
      new u.Vector3(0, 1, 0),
      i,
      e
    ), this._mergeGroupGeometries(o);
  }
  _generateTerrain() {
    const {
      size: e = this.size,
      segments: s = 32,
      height: i = this.size * 0.3,
      octaves: n = 4,
      persistence: o = 0.5
    } = this.data.parameters, a = new u.PlaneGeometry(e, e, s, s), r = a.attributes.position.array;
    for (let l = 0; l < r.length; l += 3) {
      const c = r[l], d = r[l + 2];
      let h = 0, p = i, f = 1 / e;
      for (let C = 0; C < n; C++)
        h += this._noise2D(c * f, d * f) * p, p *= o, f *= 2;
      r[l + 1] = h;
    }
    return a.computeVertexNormals(), a;
  }
  _generateVoronoi() {
    const { points: e = 8, size: s = this.size } = this.data.parameters, i = [];
    for (let a = 0; a < e; a++)
      i.push(new u.Vector3(
        (Math.random() - 0.5) * s,
        (Math.random() - 0.5) * s,
        (Math.random() - 0.5) * s
      ));
    const n = new u.BoxGeometry(s, s, s, 20, 20, 20), o = n.attributes.position.array;
    for (let a = 0; a < o.length; a += 3) {
      const r = new u.Vector3(o[a], o[a + 1], o[a + 2]);
      let l = 1 / 0, c = null;
      if (i.forEach((d) => {
        const h = r.distanceTo(d);
        h < l && (l = h, c = d);
      }), c) {
        const d = c.clone().sub(r).normalize(), h = (1 - l / s) * s * 0.2;
        r.add(d.multiplyScalar(h));
      }
      o[a] = r.x, o[a + 1] = r.y, o[a + 2] = r.z;
    }
    return n.computeVertexNormals(), n;
  }
  _generateLSystem() {
    const {
      axiom: e = "F",
      rules: s = { F: "F+F-F-F+F" },
      iterations: i = 3,
      angle: n = Math.PI / 2,
      length: o = this.size / 10
    } = this.data.parameters;
    let a = e;
    for (let h = 0; h < i; h++) {
      let p = "";
      for (const f of a)
        p += s[f] || f;
      a = p;
    }
    const r = new u.Group(), l = [];
    let c = new u.Vector3(), d = new u.Vector3(0, 1, 0);
    for (const h of a)
      switch (h) {
        case "F":
          const p = c.clone().add(d.clone().multiplyScalar(o)), f = new u.CylinderGeometry(o * 0.05, o * 0.05, o, 4), C = new u.Mesh(f);
          C.position.copy(c.clone().add(d.clone().multiplyScalar(o / 2))), C.lookAt(p), C.rotateX(Math.PI / 2), r.add(C), c = p;
          break;
        case "+":
          d.applyAxisAngle(new u.Vector3(0, 0, 1), n);
          break;
        case "-":
          d.applyAxisAngle(new u.Vector3(0, 0, 1), -n);
          break;
        case "[":
          l.push({ position: c.clone(), direction: d.clone() });
          break;
        case "]":
          if (l.length > 0) {
            const b = l.pop();
            c = b.position, d = b.direction;
          }
          break;
      }
    return this._mergeGroupGeometries(r);
  }
  _mergeGroupGeometries(e) {
    const s = [];
    if (e.traverse((c) => {
      if (c.isMesh && c.geometry) {
        const d = c.geometry.clone();
        d.applyMatrix4(c.matrixWorld), s.push(d);
      }
    }), s.length === 0)
      return new u.SphereGeometry(this.size / 2, 32, 16);
    if (s.length === 1)
      return s[0];
    const i = new u.BufferGeometry();
    let n = 0, o = 0;
    s.forEach((c) => {
      n += c.attributes.position.count, c.index && (o += c.index.count);
    });
    const a = new Float32Array(n * 3), r = new Float32Array(n * 3);
    let l = 0;
    return s.forEach((c) => {
      const d = c.attributes.position.array, h = c.attributes.normal ? c.attributes.normal.array : null;
      a.set(d, l), h && r.set(h, l), l += d.length;
    }), i.setAttribute("position", new u.BufferAttribute(a, 3)), i.setAttribute("normal", new u.BufferAttribute(r, 3)), i;
  }
  _noise2D(e, s) {
    return Math.sin(e * 12.9898 + s * 78.233) * 43758.5453 % 1;
  }
  _noise3D(e, s, i) {
    return Math.sin(e * 12.9898 + s * 78.233 + i * 37.719) * 43758.5453 % 1;
  }
  _startAnimation() {
    if (this.animationFrame) return;
    const e = () => {
      this._updateAnimation(), this.animationFrame = requestAnimationFrame(e);
    };
    this.animationFrame = requestAnimationFrame(e);
  }
  _stopAnimation() {
    this.animationFrame && (cancelAnimationFrame(this.animationFrame), this.animationFrame = null);
  }
  _updateAnimation() {
    var i, n;
    if (!((n = (i = this.mesh) == null ? void 0 : i.children) != null && n[0])) return;
    const e = performance.now() * 1e-3 * this.data.animationSpeed, s = this.mesh.children[0];
    switch (this.data.shapeType) {
      case "fractal":
      case "crystal":
        s.rotation.y = e * 0.5, s.rotation.x = Math.sin(e) * 0.2;
        break;
      case "organic":
        s.rotation.y = e * 0.3;
        const o = 1 + Math.sin(e * 2) * 0.1;
        s.scale.setScalar(o);
        break;
      case "spiral":
        s.rotation.y = e;
        break;
      case "flower":
        s.rotation.y = e * 0.2, s.rotation.z = Math.sin(e * 0.5) * 0.1;
        break;
      case "tree":
        s.rotation.z = Math.sin(e * 0.3) * 0.05, s.rotation.x = Math.cos(e * 0.2) * 0.03;
        break;
    }
  }
  setShapeType(e) {
    this.data.shapeType = e, this._generateProcedural();
  }
  setComplexity(e) {
    this.data.complexity = Math.max(1, Math.min(10, e)), this._generateProcedural();
  }
  setParameters(e) {
    this.data.parameters = { ...this.data.parameters, ...e }, this._generateProcedural();
  }
  setAnimated(e) {
    this.data.animated = e, e ? this._startAnimation() : this._stopAnimation();
  }
  setWireframe(e) {
    var s, i, n;
    this.data.wireframe = e, (n = (i = (s = this.mesh) == null ? void 0 : s.children) == null ? void 0 : i[0]) != null && n.material && (this.mesh.children[0].material.wireframe = e, this.mesh.children[0].material.transparent = e, this.mesh.children[0].material.opacity = e ? 0.8 : 1);
  }
  dispose() {
    this._stopAnimation(), this.geometryCache.forEach((e) => e.dispose()), this.geometryCache.clear(), super.dispose();
  }
}
g(vt, "typeName", "procedural-shape");
class En extends ps {
  /**
   * Constructs a new font loader.
   *
   * @param {LoadingManager} [manager] - The loading manager.
   */
  constructor(t) {
    super(t);
  }
  /**
   * Starts loading from the given URL and passes the loaded font
   * to the `onLoad()` callback.
   *
   * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(Font)} onLoad - Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
   * @param {onErrorCallback} onError - Executed when errors occur.
   */
  load(t, e, s, i) {
    const n = this, o = new Lt(this.manager);
    o.setPath(this.path), o.setRequestHeader(this.requestHeader), o.setWithCredentials(this.withCredentials), o.load(t, function(a) {
      const r = n.parse(JSON.parse(a));
      e && e(r);
    }, s, i);
  }
  /**
   * Parses the given font data and returns the resulting font.
   *
   * @param {Object} json - The raw font data as a JSON object.
   * @return {Font} The font.
   */
  parse(t) {
    return new _n(t);
  }
}
class _n {
  /**
   * Constructs a new font.
   *
   * @param {Object} data - The font data as JSON.
   */
  constructor(t) {
    this.isFont = !0, this.type = "Font", this.data = t;
  }
  /**
   * Generates geometry shapes from the given text and size. The result of this method
   * should be used with {@link ShapeGeometry} to generate the actual geometry data.
   *
   * @param {string} text - The text.
   * @param {number} [size=100] - The text size.
   * @return {Array<Shape>} An array of shapes representing the text.
   */
  generateShapes(t, e = 100) {
    const s = [], i = Ln(t, e, this.data);
    for (let n = 0, o = i.length; n < o; n++)
      s.push(...i[n].toShapes());
    return s;
  }
}
function Ln(m, t, e) {
  const s = Array.from(m), i = t / e.resolution, n = (e.boundingBox.yMax - e.boundingBox.yMin + e.underlineThickness) * i, o = [];
  let a = 0, r = 0;
  for (let l = 0; l < s.length; l++) {
    const c = s[l];
    if (c === `
`)
      a = 0, r -= n;
    else {
      const d = Pn(c, i, a, r, e);
      a += d.offsetX, o.push(d.path);
    }
  }
  return o;
}
function Pn(m, t, e, s, i) {
  const n = i.glyphs[m] || i.glyphs["?"];
  if (!n) {
    console.error('THREE.Font: character "' + m + '" does not exists in font family ' + i.familyName + ".");
    return;
  }
  const o = new fi();
  let a, r, l, c, d, h, p, f;
  if (n.o) {
    const C = n._cachedOutline || (n._cachedOutline = n.o.split(" "));
    for (let b = 0, y = C.length; b < y; )
      switch (C[b++]) {
        case "m":
          a = C[b++] * t + e, r = C[b++] * t + s, o.moveTo(a, r);
          break;
        case "l":
          a = C[b++] * t + e, r = C[b++] * t + s, o.lineTo(a, r);
          break;
        case "q":
          l = C[b++] * t + e, c = C[b++] * t + s, d = C[b++] * t + e, h = C[b++] * t + s, o.quadraticCurveTo(d, h, l, c);
          break;
        case "b":
          l = C[b++] * t + e, c = C[b++] * t + s, d = C[b++] * t + e, h = C[b++] * t + s, p = C[b++] * t + e, f = C[b++] * t + s, o.bezierCurveTo(d, h, p, f, l, c);
          break;
      }
  }
  return { offsetX: n.ha * t, path: o };
}
class kn extends yi {
  /**
   * Constructs a new text geometry.
   *
   * @param {string} text - The text that should be transformed into a geometry.
   * @param {TextGeometry~Options} [parameters] - The text settings.
   */
  constructor(t, e = {}) {
    const s = e.font;
    if (s === void 0)
      super();
    else {
      const i = s.generateShapes(t, e.size);
      e.depth === void 0 && (e.depth = 50), e.bevelThickness === void 0 && (e.bevelThickness = 10), e.bevelSize === void 0 && (e.bevelSize = 8), e.bevelEnabled === void 0 && (e.bevelEnabled = !1), super(i, e);
    }
    this.type = "TextGeometry";
  }
}
const Z = class Z extends q {
  constructor(e, s, i = {}, n = 1.5) {
    const o = {
      text: i.text ?? "Text",
      fontSize: i.fontSize ?? 20,
      fontPath: i.fontPath ?? null,
      fontFamily: i.fontFamily ?? "helvetiker",
      fontWeight: i.fontWeight ?? "regular",
      height: i.height ?? 5,
      curveSegments: i.curveSegments ?? 12,
      bevelEnabled: i.bevelEnabled ?? !0,
      bevelThickness: i.bevelThickness ?? 2,
      bevelSize: i.bevelSize ?? 1,
      bevelOffset: i.bevelOffset ?? 0,
      bevelSegments: i.bevelSegments ?? 5,
      align: i.align ?? "center",
      materialType: i.materialType ?? "standard",
      strokeWidth: i.strokeWidth ?? 0,
      strokeColor: i.strokeColor ?? 0,
      gradientColors: i.gradientColors ?? null,
      animated: i.animated ?? !1,
      animationType: i.animationType ?? "rotate",
      ...i
    };
    super(e, s, o, n);
    g(this, "textMesh", null);
    g(this, "font", null);
    g(this, "isLoadingFont", !1);
    this._loadFont();
  }
  getDefaultData() {
    return {
      ...super.getDefaultData(),
      type: "text-mesh",
      text: "Text",
      fontSize: 20,
      fontPath: null,
      fontFamily: "helvetiker",
      fontWeight: "regular",
      height: 5,
      curveSegments: 12,
      bevelEnabled: !0,
      bevelThickness: 2,
      bevelSize: 1,
      bevelOffset: 0,
      bevelSegments: 5,
      align: "center",
      materialType: "standard",
      strokeWidth: 0,
      strokeColor: 0,
      gradientColors: null,
      animated: !1,
      animationType: "rotate"
    };
  }
  async _loadFont() {
    if (!this.isLoadingFont) {
      this.isLoadingFont = !0;
      try {
        let e = this.data.fontPath || `${this.data.fontFamily}_${this.data.fontWeight}`;
        if (Z.fontCache.has(e)) {
          this.font = Z.fontCache.get(e), this._createTextMesh(), this.isLoadingFont = !1;
          return;
        }
        const s = new En();
        let i;
        this.data.fontPath ? i = this.data.fontPath : i = `https://threejs.org/examples/fonts/${this.data.fontFamily}_${this.data.fontWeight}.typeface.json`;
        const n = await new Promise((o, a) => {
          s.load(
            i,
            o,
            void 0,
            (r) => {
              console.warn(`Failed to load font ${i}, using fallback`), Z.defaultFont ? o(Z.defaultFont) : a(r);
            }
          );
        });
        this.font = n, Z.fontCache.set(e, n), Z.defaultFont || (Z.defaultFont = n), this._createTextMesh();
      } catch (e) {
        console.error("Font loading failed:", e), this._createFallbackMesh();
      } finally {
        this.isLoadingFont = !1;
      }
    }
  }
  _createTextMesh() {
    var e;
    if (this.font) {
      this._disposeTextMesh();
      try {
        const s = new kn(this.data.text, {
          font: this.font,
          size: this.data.fontSize,
          height: this.data.height,
          curveSegments: this.data.curveSegments,
          bevelEnabled: this.data.bevelEnabled,
          bevelThickness: this.data.bevelThickness,
          bevelSize: this.data.bevelSize,
          bevelOffset: this.data.bevelOffset,
          bevelSegments: this.data.bevelSegments
        });
        s.computeBoundingBox(), this._alignText(s);
        const i = this._createTextMaterials();
        this.textMesh = new u.Mesh(s, i), this.textMesh.castShadow = !0, this.textMesh.receiveShadow = !0, this.textMesh.userData = { nodeId: this.id, type: "text-mesh" }, this.data.strokeWidth > 0 && this._addStroke(), (e = this.mesh) != null && e.children && this.mesh.children.forEach((n) => {
          n.geometry && n.geometry.dispose(), n.material && n.material.dispose(), this.mesh.remove(n);
        }), this.mesh && this.mesh.add(this.textMesh), this.data.animated && this._startTextAnimation();
      } catch (s) {
        console.error("Text geometry creation failed:", s), this._createFallbackMesh();
      }
    }
  }
  _alignText(e) {
    const s = e.boundingBox;
    switch (this.data.align) {
      case "center":
        e.translate(
          -(s.max.x - s.min.x) / 2,
          -(s.max.y - s.min.y) / 2,
          -(s.max.z - s.min.z) / 2
        );
        break;
      case "left":
        e.translate(
          -s.min.x,
          -(s.max.y - s.min.y) / 2,
          -(s.max.z - s.min.z) / 2
        );
        break;
      case "right":
        e.translate(
          -s.max.x,
          -(s.max.y - s.min.y) / 2,
          -(s.max.z - s.min.z) / 2
        );
        break;
    }
  }
  _createTextMaterials() {
    const e = {
      color: this.color,
      transparent: !0,
      opacity: 1
    };
    if (this.data.gradientColors && this.data.gradientColors.length >= 2)
      return new u.ShaderMaterial({
        uniforms: {
          color1: { value: new u.Color(this.data.gradientColors[0]) },
          color2: { value: new u.Color(this.data.gradientColors[1]) },
          time: { value: 0 }
        },
        vertexShader: `
                    varying vec3 vPosition;
                    varying vec3 vNormal;
                    void main() {
                        vPosition = position;
                        vNormal = normal;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
        fragmentShader: `
                    uniform vec3 color1;
                    uniform vec3 color2;
                    uniform float time;
                    varying vec3 vPosition;
                    varying vec3 vNormal;

                    void main() {
                        float mixFactor = (vPosition.y + 1.0) * 0.5;
                        vec3 color = mix(color1, color2, mixFactor);

                        // Add some lighting
                        float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))) * 0.5 + 0.5;
                        color *= light;

                        gl_FragColor = vec4(color, 1.0);
                    }
                `,
        transparent: e.transparent
      });
    switch (this.data.materialType) {
      case "basic":
        return new u.MeshBasicMaterial(e);
      case "lambert":
        return new u.MeshLambertMaterial(e);
      case "phong":
        return new u.MeshPhongMaterial({
          ...e,
          shininess: 100,
          specular: 2236962
        });
      case "physical":
        return new u.MeshPhysicalMaterial({
          ...e,
          roughness: 0.4,
          metalness: 0.1,
          clearcoat: 0.5,
          clearcoatRoughness: 0.1
        });
      case "standard":
      default:
        return new u.MeshStandardMaterial({
          ...e,
          roughness: 0.5,
          metalness: 0.1
        });
    }
  }
  _addStroke() {
    if (!this.textMesh || this.data.strokeWidth <= 0) return;
    const e = this.textMesh.geometry.clone(), s = new u.MeshBasicMaterial({
      color: this.data.strokeColor,
      transparent: !0,
      opacity: 0.8
    }), i = new u.Mesh(e, s), n = 1 + this.data.strokeWidth / this.data.fontSize * 2;
    i.scale.setScalar(n), i.position.z = -this.data.strokeWidth / 2, i.renderOrder = -1, this.textMesh.add(i);
  }
  _createFallbackMesh() {
    const e = document.createElement("canvas"), s = e.getContext("2d");
    e.width = 256, e.height = 128, s.fillStyle = "#" + this.color.toString(16).padStart(6, "0"), s.fillRect(0, 0, e.width, e.height), s.fillStyle = "white", s.font = `${Math.min(e.height * 0.6, 48)}px Arial`, s.textAlign = "center", s.textBaseline = "middle", s.fillText(this.data.text, e.width / 2, e.height / 2);
    const i = new u.CanvasTexture(e), n = new u.BoxGeometry(this.size, this.size * 0.5, this.size * 0.1), o = new u.MeshBasicMaterial({ map: i });
    this.textMesh = new u.Mesh(n, o), this.textMesh.userData = { nodeId: this.id, type: "text-mesh-fallback" }, this.mesh && this.mesh.add(this.textMesh);
  }
  _startTextAnimation() {
    if (this.animationFrame) return;
    const e = () => {
      this._updateTextAnimation(), this.animationFrame = requestAnimationFrame(e);
    };
    this.animationFrame = requestAnimationFrame(e);
  }
  _stopTextAnimation() {
    this.animationFrame && (cancelAnimationFrame(this.animationFrame), this.animationFrame = null);
  }
  _updateTextAnimation() {
    var s;
    if (!this.textMesh) return;
    const e = performance.now() * 1e-3;
    switch (this.data.animationType) {
      case "rotate":
        this.textMesh.rotation.y = e * 0.5;
        break;
      case "float":
        this.textMesh.position.y = Math.sin(e * 2) * 10;
        break;
      case "pulse":
        const i = 1 + Math.sin(e * 3) * 0.1;
        this.textMesh.scale.setScalar(i);
        break;
      case "wave":
        this.textMesh.rotation.z = Math.sin(e * 2) * 0.1;
        break;
      case "glow":
        this.textMesh.material && ((s = this.textMesh.material.uniforms) != null && s.time) && (this.textMesh.material.uniforms.time.value = e);
        break;
    }
  }
  _disposeTextMesh() {
    var e;
    this.textMesh && (this.textMesh.geometry && this.textMesh.geometry.dispose(), this.textMesh.material && (Array.isArray(this.textMesh.material) ? this.textMesh.material.forEach((s) => s.dispose()) : this.textMesh.material.dispose()), (e = this.textMesh.parent) == null || e.remove(this.textMesh), this.textMesh = null);
  }
  setText(e) {
    var s;
    this.data.text = e, this.font && !this.isLoadingFont && this._createTextMesh(), (s = this.space) == null || s.emit("graph:node:dataChanged", {
      node: this,
      property: "text",
      value: e
    });
  }
  setFontSize(e) {
    this.data.fontSize = e, this.font && !this.isLoadingFont && this._createTextMesh();
  }
  setColor(e) {
    super.setColor(e), this.textMesh && this.textMesh.material && !this.data.gradientColors && this.textMesh.material.color.set(e);
  }
  setHeight(e) {
    this.data.height = e, this.font && !this.isLoadingFont && this._createTextMesh();
  }
  setBevel(e, s = 2, i = 1) {
    this.data.bevelEnabled = e, this.data.bevelThickness = s, this.data.bevelSize = i, this.font && !this.isLoadingFont && this._createTextMesh();
  }
  setAlign(e) {
    ["left", "center", "right"].includes(e) && (this.data.align = e, this.font && !this.isLoadingFont && this._createTextMesh());
  }
  setStroke(e, s = 0) {
    this.data.strokeWidth = e, this.data.strokeColor = s, this.font && !this.isLoadingFont && this._createTextMesh();
  }
  setGradient(e) {
    this.data.gradientColors = e, this.font && !this.isLoadingFont && this._createTextMesh();
  }
  setAnimated(e, s = "rotate") {
    this.data.animated = e, this.data.animationType = s, e ? this._startTextAnimation() : this._stopTextAnimation();
  }
  setFont(e, s = "regular") {
    this.data.fontFamily = e, this.data.fontWeight = s, this.font = null, this._loadFont();
  }
  setCustomFont(e) {
    this.data.fontPath = e, this.font = null, this._loadFont();
  }
  getTextBounds() {
    return this.textMesh && this.textMesh.geometry.boundingBox ? this.textMesh.geometry.boundingBox.clone() : new u.Box3();
  }
  dispose() {
    this._stopTextAnimation(), this._disposeTextMesh(), super.dispose();
  }
  update(e) {
    var s, i, n;
    super.update(e), (n = (i = (s = this.textMesh) == null ? void 0 : s.material) == null ? void 0 : i.uniforms) != null && n.time && (this.textMesh.material.uniforms.time.value = performance.now() * 1e-3);
  }
};
g(Z, "typeName", "text-mesh"), g(Z, "fontCache", /* @__PURE__ */ new Map()), g(Z, "defaultFont", null);
let je = Z;
class wt extends L {
  constructor(e, s, i = {}, n = 1) {
    const o = {
      width: i.width ?? 400,
      height: i.height ?? 300,
      title: i.title ?? "Widget Container",
      layout: i.layout ?? "grid",
      columns: i.columns ?? 2,
      gap: i.gap ?? 10,
      resizable: i.resizable ?? !0,
      collapsible: i.collapsible ?? !0,
      backgroundColor: i.backgroundColor ?? "rgba(25, 30, 45, 0.95)",
      widgets: i.widgets ?? [],
      padding: i.padding ?? 15,
      showHeader: i.showHeader ?? !0,
      ...i
    };
    super(e, s, o, n);
    g(this, "childWidgets", /* @__PURE__ */ new Map());
    g(this, "layout", "grid");
    g(this, "columns", 2);
    g(this, "gap", 10);
    g(this, "resizable", !0);
    g(this, "collapsible", !0);
    g(this, "isCollapsed", !1);
    this.layout = o.layout, this.columns = o.columns, this.gap = o.gap, this.resizable = o.resizable, this.collapsible = o.collapsible, this._initializeWidgets(), this._setupMetaWidgetEvents();
  }
  getDefaultData() {
    return {
      ...super.getDefaultData(),
      type: "meta-widget",
      title: "Widget Container",
      layout: "grid",
      columns: 2,
      gap: 10,
      resizable: !0,
      collapsible: !0,
      backgroundColor: "rgba(25, 30, 45, 0.95)",
      widgets: [],
      padding: 15,
      showHeader: !0
    };
  }
  _createElement() {
    const e = document.createElement("div");
    e.className = "node-meta-widget node-common", e.id = `node-meta-widget-${this.id}`, e.dataset.nodeId = this.id, e.style.width = `${this.size.width}px`, e.style.height = `${this.size.height}px`, e.draggable = !1;
    const s = this.data.showHeader ? 35 : 0, i = this.size.height - s - this.data.padding * 2;
    return e.innerHTML = `
            <div class="meta-widget-container">
                ${this.data.showHeader ? this._generateHeader() : ""}
                <div class="meta-widget-content" style="height: ${i}px;">
                    <div class="widget-grid"></div>
                </div>
            </div>
            <style>
                .node-meta-widget {
                    background: ${this.data.backgroundColor};
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    padding: ${this.data.padding}px;
                    font-family: 'Segoe UI', sans-serif;
                    color: white;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    overflow: hidden;
                }
                .meta-widget-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .meta-widget-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: rgba(0,0,0,0.3);
                    border-radius: 6px;
                    margin-bottom: 10px;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .meta-widget-title {
                    font-size: 14px;
                    font-weight: 600;
                    margin: 0;
                    color: #fff;
                }
                .meta-widget-controls {
                    display: flex;
                    gap: 6px;
                }
                .meta-control-btn {
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    transition: background 0.2s;
                }
                .meta-control-btn:hover {
                    background: rgba(255,255,255,0.2);
                }
                .meta-widget-content {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                }
                .meta-widget-content.collapsed {
                    display: none;
                }
                .widget-grid {
                    display: grid;
                    gap: ${this.gap}px;
                    width: 100%;
                    height: 100%;
                }
                .widget-grid.layout-grid {
                    grid-template-columns: repeat(${this.columns}, 1fr);
                    grid-auto-rows: minmax(100px, auto);
                }
                .widget-grid.layout-flex-row {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                }
                .widget-grid.layout-flex-column {
                    display: flex;
                    flex-direction: column;
                }
                .widget-grid.layout-masonry {
                    columns: ${this.columns};
                    column-gap: ${this.gap}px;
                }
                .widget-slot {
                    background: rgba(255,255,255,0.05);
                    border: 1px dashed rgba(255,255,255,0.2);
                    border-radius: 6px;
                    position: relative;
                    min-height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }
                .widget-slot:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.4);
                }
                .widget-slot.occupied {
                    background: transparent;
                    border: none;
                    padding: 0;
                }
                .widget-slot-placeholder {
                    color: rgba(255,255,255,0.5);
                    font-size: 12px;
                    text-align: center;
                    pointer-events: none;
                }
                .widget-wrapper {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    border-radius: 6px;
                    overflow: hidden;
                }
                .widget-controls {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    display: flex;
                    gap: 2px;
                    opacity: 0;
                    transition: opacity 0.2s;
                    z-index: 10;
                }
                .widget-wrapper:hover .widget-controls {
                    opacity: 1;
                }
                .widget-control-btn {
                    background: rgba(0,0,0,0.7);
                    border: none;
                    color: white;
                    width: 20px;
                    height: 20px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .widget-control-btn:hover {
                    background: rgba(0,0,0,0.9);
                }
                .layout-selector {
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    cursor: pointer;
                }
                .layout-selector:focus {
                    outline: none;
                    border-color: #4a9eff;
                }
            </style>
        `, this._setupDragAndDrop(e), e;
  }
  _generateHeader() {
    return `
            <div class="meta-widget-header">
                <h3 class="meta-widget-title">${this.data.title}</h3>
                <div class="meta-widget-controls">
                    <select class="layout-selector">
                        <option value="grid" ${this.layout === "grid" ? "selected" : ""}>Grid</option>
                        <option value="flex-row" ${this.layout === "flex-row" ? "selected" : ""}>Row</option>
                        <option value="flex-column" ${this.layout === "flex-column" ? "selected" : ""}>Column</option>
                        <option value="masonry" ${this.layout === "masonry" ? "selected" : ""}>Masonry</option>
                    </select>
                    <button class="meta-control-btn add-widget" title="Add Widget">+</button>
                    ${this.collapsible ? '<button class="meta-control-btn collapse-btn" title="Collapse">−</button>' : ""}
                    <button class="meta-control-btn settings-btn" title="Settings">⚙</button>
                </div>
            </div>
        `;
  }
  _initializeWidgets() {
    this.data.widgets && this.data.widgets.length > 0 && this.data.widgets.forEach((e, s) => {
      this.addWidget(e, s);
    }), this._updateLayout();
  }
  _setupMetaWidgetEvents() {
    const e = M(".meta-widget-header", this.htmlElement);
    if (!e) return;
    const s = M(".layout-selector", e);
    s && s.addEventListener("change", (a) => {
      a.stopPropagation(), this.setLayout(a.target.value);
    });
    const i = M(".add-widget", e);
    i && i.addEventListener("click", (a) => {
      a.stopPropagation(), this._showAddWidgetDialog();
    });
    const n = M(".collapse-btn", e);
    n && n.addEventListener("click", (a) => {
      a.stopPropagation(), this.toggleCollapsed();
    });
    const o = M(".settings-btn", e);
    o && o.addEventListener("click", (a) => {
      a.stopPropagation(), this._showSettingsDialog();
    });
  }
  _setupDragAndDrop(e) {
    e.addEventListener("dragover", (s) => {
      s.preventDefault(), s.dataTransfer.dropEffect = "move";
    }), e.addEventListener("drop", (s) => {
      s.preventDefault();
      const i = s.dataTransfer.getData("text/widget-id"), n = s.target.closest(".widget-slot");
      i && n && this._handleWidgetDrop(i, n);
    });
  }
  addWidget(e, s = null) {
    var o;
    const i = e.id || this._generateWidgetId(), n = {
      id: i,
      type: e.type || "control-panel",
      data: e.data || {},
      position: s !== null ? s : this.childWidgets.size,
      ...e
    };
    return this.childWidgets.set(i, n), this._renderWidget(n), this._updateLayout(), (o = this.space) == null || o.emit("meta-widget:widget-added", {
      metaWidget: this,
      widget: n,
      position: n.position
    }), i;
  }
  removeWidget(e) {
    var n;
    if (!this.childWidgets.has(e)) return !1;
    const s = this.childWidgets.get(e);
    this.childWidgets.delete(e);
    const i = M(`[data-widget-id="${e}"]`, this.htmlElement);
    return i && i.remove(), this._updateLayout(), (n = this.space) == null || n.emit("meta-widget:widget-removed", {
      metaWidget: this,
      widget: s,
      widgetId: e
    }), !0;
  }
  _renderWidget(e) {
    const s = M(".widget-grid", this.htmlElement);
    if (!s) return;
    const i = document.createElement("div");
    i.className = "widget-slot occupied", i.dataset.widgetId = e.id, i.dataset.position = e.position;
    const n = document.createElement("div");
    n.className = "widget-wrapper", n.draggable = !0;
    const o = document.createElement("div");
    o.className = "widget-controls", o.innerHTML = `
            <button class="widget-control-btn move-btn" title="Move">↕</button>
            <button class="widget-control-btn edit-btn" title="Edit">✎</button>
            <button class="widget-control-btn remove-btn" title="Remove">×</button>
        `;
    const a = this._createWidgetContent(e);
    n.appendChild(a), n.appendChild(o), i.appendChild(n), this._setupWidgetEvents(n, e), s.appendChild(i);
  }
  _createWidgetContent(e) {
    const s = document.createElement("div");
    switch (s.className = "widget-content", s.style.width = "100%", s.style.height = "100%", e.type) {
      case "control-panel":
        s.innerHTML = this._createControlPanelContent(e), this._setupControlPanelEvents(s, e);
        break;
      case "progress":
        s.innerHTML = this._createProgressContent(e);
        break;
      case "chart":
        s.innerHTML = this._createChartContent(e);
        break;
      case "info":
        s.innerHTML = this._createInfoContent(e);
        break;
      case "custom":
        s.innerHTML = e.data.html || "<div>Custom Widget</div>";
        break;
      default:
        s.innerHTML = `<div>Widget: ${e.type}</div>`;
    }
    return s;
  }
  _createControlPanelContent(e) {
    const s = e.data.controls || [];
    let i = '<div class="mini-control-panel">';
    return s.forEach((n) => {
      switch (i += '<div class="mini-control">', i += `<label class="mini-control-label">${n.label}</label>`, n.type) {
        case "slider":
          i += `<input type="range" class="mini-slider"
                             data-control-id="${n.id}"
                             min="${n.min || 0}" max="${n.max || 100}"
                             value="${n.value || 0}" step="${n.step || 1}">`, i += `<span class="mini-value">${n.value || 0}</span>`;
          break;
        case "switch":
          i += `<label class="mini-switch">
                        <input type="checkbox" data-control-id="${n.id}"
                               ${n.value ? "checked" : ""}>
                        <span class="mini-switch-slider"></span>
                    </label>`;
          break;
        case "button":
          i += `<button class="mini-button" data-control-id="${n.id}">
                        ${n.text || n.label}
                    </button>`;
          break;
      }
      i += "</div>";
    }), i += "</div>", i += `<style>
            .mini-control-panel { padding: 8px; font-size: 11px; }
            .mini-control { margin-bottom: 8px; }
            .mini-control-label { display: block; color: rgba(255,255,255,0.8); margin-bottom: 3px; }
            .mini-slider { width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; }
            .mini-value { float: right; color: #4a9eff; font-weight: 600; }
            .mini-switch { position: relative; display: inline-block; width: 30px; height: 16px; }
            .mini-switch input { opacity: 0; width: 0; height: 0; }
            .mini-switch-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                                 background-color: rgba(255,255,255,0.2); transition: 0.3s; border-radius: 16px; }
            .mini-switch-slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 2px; bottom: 2px;
                                       background-color: white; transition: 0.3s; border-radius: 50%; }
            .mini-switch input:checked + .mini-switch-slider { background-color: #4a9eff; }
            .mini-switch input:checked + .mini-switch-slider:before { transform: translateX(14px); }
            .mini-button { width: 100%; padding: 4px 8px; background: #4a9eff; border: none; border-radius: 3px;
                          color: white; font-size: 10px; cursor: pointer; }
        </style>`, i;
  }
  _createProgressContent(e) {
    const s = e.data.value || 0, i = e.data.max || 100, n = s / i * 100;
    return `
            <div class="mini-progress">
                <div class="mini-progress-label">${e.data.label || "Progress"}</div>
                <div class="mini-progress-bar">
                    <div class="mini-progress-fill" style="width: ${n}%"></div>
                </div>
                <div class="mini-progress-value">${s}%</div>
            </div>
            <style>
                .mini-progress { padding: 8px; text-align: center; }
                .mini-progress-label { font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 4px; }
                .mini-progress-bar { width: 100%; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; }
                .mini-progress-fill { height: 100%; background: linear-gradient(90deg, #4a9eff, #64b5f6); transition: width 0.3s; }
                .mini-progress-value { font-size: 10px; color: #4a9eff; margin-top: 4px; }
            </style>
        `;
  }
  _createChartContent(e) {
    return `
            <div class="mini-chart">
                <div class="chart-title">${e.data.title || "Chart"}</div>
                <div class="chart-placeholder">📊</div>
            </div>
            <style>
                .mini-chart { padding: 8px; text-align: center; display: flex; flex-direction: column; justify-content: center; height: 100%; }
                .chart-title { font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 8px; }
                .chart-placeholder { font-size: 24px; opacity: 0.6; }
            </style>
        `;
  }
  _createInfoContent(e) {
    return `
            <div class="mini-info">
                <div class="info-icon">${e.data.icon || "ℹ"}</div>
                <div class="info-text">${e.data.text || "Information"}</div>
            </div>
            <style>
                .mini-info { padding: 8px; text-align: center; display: flex; flex-direction: column; justify-content: center; height: 100%; }
                .info-icon { font-size: 20px; margin-bottom: 4px; }
                .info-text { font-size: 10px; color: rgba(255,255,255,0.8); line-height: 1.3; }
            </style>
        `;
  }
  _setupControlPanelEvents(e, s) {
    e.querySelectorAll("[data-control-id]").forEach((i) => {
      const n = i.dataset.controlId;
      i.addEventListener("input", (o) => {
        var r;
        o.stopPropagation();
        let a = o.target.value;
        if (o.target.type === "checkbox")
          a = o.target.checked;
        else if (o.target.type === "range") {
          a = parseFloat(a);
          const l = o.target.parentNode.querySelector(".mini-value");
          l && (l.textContent = a);
        }
        (r = this.space) == null || r.emit("meta-widget:control-changed", {
          metaWidget: this,
          widget: s,
          controlId: n,
          value: a
        });
      }), (i.type === "button" || i.tagName === "BUTTON") && i.addEventListener("click", (o) => {
        var a;
        o.stopPropagation(), (a = this.space) == null || a.emit("meta-widget:control-clicked", {
          metaWidget: this,
          widget: s,
          controlId: n
        });
      });
    });
  }
  _setupWidgetEvents(e, s) {
    e.addEventListener("dragstart", (o) => {
      o.dataTransfer.setData("text/widget-id", s.id), o.dataTransfer.effectAllowed = "move";
    });
    const i = M(".remove-btn", e);
    i && i.addEventListener("click", (o) => {
      o.stopPropagation(), this.removeWidget(s.id);
    });
    const n = M(".edit-btn", e);
    n && n.addEventListener("click", (o) => {
      o.stopPropagation(), this._editWidget(s);
    });
  }
  _updateLayout() {
    const e = M(".widget-grid", this.htmlElement);
    e && (e.className = "widget-grid", e.classList.add(`layout-${this.layout}`), this.layout === "grid" ? e.style.gridTemplateColumns = `repeat(${this.columns}, 1fr)` : this.layout === "masonry" && (e.style.columns = this.columns, e.style.columnGap = `${this.gap}px`), e.style.gap = `${this.gap}px`);
  }
  _showAddWidgetDialog() {
    const e = document.createElement("div");
    e.className = "add-widget-dialog", e.innerHTML = `
            <div class="dialog-backdrop">
                <div class="dialog-content">
                    <h3>Add Widget</h3>
                    <select class="widget-type-select">
                        <option value="control-panel">Control Panel</option>
                        <option value="progress">Progress Bar</option>
                        <option value="chart">Chart</option>
                        <option value="info">Info Panel</option>
                        <option value="custom">Custom</option>
                    </select>
                    <input type="text" class="widget-title-input" placeholder="Widget Title">
                    <div class="dialog-buttons">
                        <button class="dialog-btn cancel">Cancel</button>
                        <button class="dialog-btn confirm">Add</button>
                    </div>
                </div>
            </div>
            <style>
                .add-widget-dialog .dialog-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }
                .add-widget-dialog .dialog-content {
                    background: #2c3e50;
                    padding: 20px;
                    border-radius: 8px;
                    min-width: 300px;
                    color: white;
                }
                .add-widget-dialog h3 {
                    margin-top: 0;
                    color: #ecf0f1;
                }
                .add-widget-dialog select, .add-widget-dialog input {
                    width: 100%;
                    padding: 8px;
                    margin: 8px 0;
                    background: #34495e;
                    border: 1px solid #7f8c8d;
                    border-radius: 4px;
                    color: white;
                }
                .add-widget-dialog .dialog-buttons {
                    text-align: right;
                    margin-top: 16px;
                }
                .add-widget-dialog .dialog-btn {
                    padding: 6px 12px;
                    margin-left: 8px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .add-widget-dialog .dialog-btn.cancel {
                    background: #95a5a6;
                    color: white;
                }
                .add-widget-dialog .dialog-btn.confirm {
                    background: #3498db;
                    color: white;
                }
            </style>
        `, document.body.appendChild(e);
    const s = M(".cancel", e), i = M(".confirm", e), n = M(".widget-type-select", e), o = M(".widget-title-input", e), a = () => {
      document.body.removeChild(e);
    };
    s.addEventListener("click", a), i.addEventListener("click", () => {
      const r = n.value, l = o.value || `New ${r}`, c = {
        type: r,
        data: { title: l, label: l }
      };
      r === "control-panel" ? c.data.controls = [
        { id: "sample", type: "slider", label: "Sample", value: 50, min: 0, max: 100 }
      ] : r === "progress" && (c.data.value = 25, c.data.max = 100), this.addWidget(c), a();
    }), M(".dialog-backdrop", e).addEventListener("click", (r) => {
      r.target === r.currentTarget && a();
    });
  }
  _editWidget(e) {
    var s;
    (s = this.space) == null || s.emit("meta-widget:widget-edit-requested", {
      metaWidget: this,
      widget: e
    });
  }
  _generateWidgetId() {
    return `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  _handleWidgetDrop(e, s) {
    const i = this.childWidgets.get(e);
    if (!i) return;
    const n = parseInt(s.dataset.position);
    isNaN(n) || (i.position = n, this._updateLayout());
  }
  setLayout(e) {
    var s;
    ["grid", "flex-row", "flex-column", "masonry"].includes(e) && (this.layout = e, this.data.layout = e, this._updateLayout(), (s = this.space) == null || s.emit("meta-widget:layout-changed", {
      metaWidget: this,
      layout: e
    }));
  }
  setColumns(e) {
    this.columns = Math.max(1, e), this.data.columns = this.columns, this._updateLayout();
  }
  setGap(e) {
    this.gap = Math.max(0, e), this.data.gap = this.gap, this._updateLayout();
  }
  toggleCollapsed() {
    var n;
    this.isCollapsed = !this.isCollapsed;
    const e = M(".meta-widget-content", this.htmlElement), s = M(".collapse-btn", this.htmlElement);
    e && e.classList.toggle("collapsed", this.isCollapsed), s && (s.textContent = this.isCollapsed ? "+" : "−");
    const i = this.isCollapsed ? 60 : this.data.height;
    this.setSize(this.size.width, i), (n = this.space) == null || n.emit("meta-widget:collapsed-changed", {
      metaWidget: this,
      isCollapsed: this.isCollapsed
    });
  }
  getWidget(e) {
    return this.childWidgets.get(e);
  }
  getAllWidgets() {
    return Array.from(this.childWidgets.values());
  }
  updateWidget(e, s) {
    var o;
    const i = this.childWidgets.get(e);
    if (!i) return !1;
    Object.assign(i.data, s);
    const n = M(`[data-widget-id="${e}"]`, this.htmlElement);
    if (n) {
      const a = M(".widget-content", n);
      a && (a.innerHTML = "", a.appendChild(this._createWidgetContent(i)));
    }
    return (o = this.space) == null || o.emit("meta-widget:widget-updated", {
      metaWidget: this,
      widget: i,
      widgetId: e
    }), !0;
  }
  getLayoutData() {
    return {
      layout: this.layout,
      columns: this.columns,
      gap: this.gap,
      widgets: Array.from(this.childWidgets.values())
    };
  }
  dispose() {
    this.childWidgets.clear(), super.dispose();
  }
}
g(wt, "typeName", "meta-widget");
class Tn extends Is {
  // Extend BaseFactory
  constructor(t) {
    super(), this.space = t;
  }
  registerCoreNodeTypes() {
    this.registerType(L.typeName, L), this.registerType(q.typeName, q), this.registerType(Le.typeName, Le), this.registerType(me.typeName, me), this.registerType(fe.typeName, fe), this.registerType(Pe.typeName, Pe), this.registerType(ke.typeName, ke), this.registerType(ye.typeName, ye), this.registerType(be.typeName, be), this.registerType(Ce.typeName, Ce), this.registerType(ve.typeName, ve), this.registerType(yt.typeName, yt), this.registerType(bt.typeName, bt), this.registerType(Ct.typeName, Ct), this.registerType(vt.typeName, vt), this.registerType(je.typeName, je), this.registerType(wt.typeName, wt), this.registerType("default", q);
  }
  /**
   * Creates a new node instance of a given type.
   * @param {string} id - The unique ID for the node.
   * @param {string} type - The typeName of the node to create.
   * @param {object} position - An object with x, y, z coordinates.
   * @param {object} [data={}] - Custom data for the node.
   * @param {number} [mass=1.0] - The mass of the node.
   * @returns {Node|null} The created node instance, or null if the type is not found.
   */
  createNode(t, e, s, i = {}, n = 1) {
    const o = (i == null ? void 0 : i.type) || e, a = this.create(o, [t, s, i, n], "default");
    return a && (a.space = this.space), a;
  }
}
class Nn extends U {
  constructor(e, s) {
    super(e, s);
    g(this, "nodes", /* @__PURE__ */ new Map());
    g(this, "nodeFactory", null);
    g(this, "instancedMeshManager", null);
    this.nodeFactory = new Tn(e), this._registerNodeTypes();
  }
  /**
   * Registers all known node types with the NodeFactory.
   * This method is called during plugin construction to ensure all types
   * are available before any nodes are created.
   * To add a new node type:
   * 1. Create your node class (e.g., MyCustomNode extends BaseNode).
   * 2. Ensure it has a static `typeName` property (e.g., static typeName = 'myCustom').
   * 3. Import it into this file (NodePlugin.js).
   * 4. Add a line here: `this.nodeFactory.registerType(MyCustomNode.typeName, MyCustomNode);`
   */
  _registerNodeTypes() {
    this.nodeFactory.registerType(L.typeName, L), this.nodeFactory.registerType(q.typeName, q), this.nodeFactory.registerType(Le.typeName, Le), this.nodeFactory.registerType(me.typeName, me), this.nodeFactory.registerType(fe.typeName, fe), this.nodeFactory.registerType(Pe.typeName, Pe), this.nodeFactory.registerType(ke.typeName, ke), this.nodeFactory.registerType(ye.typeName, ye), this.nodeFactory.registerType(be.typeName, be), this.nodeFactory.registerType(Ce.typeName, Ce), this.nodeFactory.registerType(ve.typeName, ve), this.nodeFactory.registerType("default", q);
  }
  getName() {
    return "NodePlugin";
  }
  init() {
    var e;
    super.init(), this.instancedMeshManager = (e = this.pluginManager.getPlugin("RenderingPlugin")) == null ? void 0 : e.getInstancedMeshManager();
  }
  addNode(e) {
    if (e.id ?? (e.id = T.generateId("node")), this.nodes.has(e.id))
      return console.warn(`NodePlugin: Node ${e.id} already exists.`), this.nodes.get(e.id);
    this.nodes.set(e.id, e), e.space = this.space;
    const s = this.pluginManager.getPlugin("RenderingPlugin"), i = s == null ? void 0 : s.getCSS3DScene(), n = s == null ? void 0 : s.getWebGLScene();
    let o = !1;
    return this.instancedMeshManager && e instanceof q && e.data.shape === "sphere" && (o = this.instancedMeshManager.addNode(e)), e.cssObject && i && i.add(e.cssObject), e.labelObject && i && i.add(e.labelObject), !o && e.mesh && n && n.add(e.mesh), this.space.emit("node:added", e), e;
  }
  createAndAddNode({ id: e, type: s, position: i, data: n = {}, mass: o = 1 }) {
    const a = e || T.generateId("node");
    if (!s || !i) {
      console.error("NodePlugin: Type and position required.");
      return;
    }
    const r = this.nodeFactory.createNode(a, s, i, n, o);
    return r ? this.addNode(r) : void 0;
  }
  removeNode(e) {
    var n, o;
    const s = this.nodes.get(e);
    if (!s) return console.warn(`NodePlugin: Node ${e} not found.`);
    const i = this.pluginManager.getPlugin("UIPlugin");
    (i == null ? void 0 : i.getSelectedNode()) === s && i.setSelectedNode(null), (i == null ? void 0 : i.getLinkSourceNode()) === s && i.cancelLinking(), (n = this.pluginManager.getPlugin("EdgePlugin")) == null || n.getEdgesForNode(s).forEach(
      (a) => {
        var r;
        return (r = this.pluginManager.getPlugin("EdgePlugin")) == null ? void 0 : r.removeEdge(a.id);
      }
    ), (o = this.pluginManager.getPlugin("LayoutPlugin")) == null || o.removeNodeFromLayout(s), s.isInstanced && this.instancedMeshManager && this.instancedMeshManager.removeNode(s), s.dispose(), this.nodes.delete(e), this.space.emit("node:removed", e, s);
  }
  getNodeById(e) {
    return this.nodes.get(e);
  }
  getNodes() {
    return this.nodes;
  }
  update() {
    this.nodes.forEach((e) => {
      var s;
      e.isInstanced && this.instancedMeshManager && this.instancedMeshManager.updateNode(e), (s = e.update) == null || s.call(e, this.space);
    });
  }
  dispose() {
    super.dispose(), this.nodes.forEach((e) => e.dispose()), this.nodes.clear();
  }
}
const D = class D {
  constructor(t, e, s, i = {}) {
    g(this, "line", null);
    g(this, "arrowheads", { source: null, target: null });
    g(this, "isInstanced", !1);
    g(this, "instanceId", null);
    g(this, "isHighlighted", !1);
    g(this, "isHovered", !1);
    // Pre-allocate THREE.Color instances for performance
    g(this, "_colorStart", new u.Color());
    g(this, "_colorEnd", new u.Color());
    g(this, "data", {
      color: 53503,
      gradientColors: null,
      thickness: 3,
      thicknessInstanced: 0.5,
      constraintType: "elastic",
      constraintParams: { stiffness: 1e-3, idealLength: 200 },
      arrowhead: !1,
      arrowheadSize: 10,
      arrowheadColor: null
    });
    var o;
    if (!e || !s) throw new Error("Edge requires valid source and target nodes.");
    this.id = t, this.source = e, this.target = s;
    const n = {
      color: 53503,
      gradientColors: null,
      thickness: 3,
      thicknessInstanced: 0.5,
      constraintType: "elastic",
      constraintParams: { stiffness: 1e-3, idealLength: 200 },
      arrowhead: !1,
      arrowheadSize: 10,
      arrowheadColor: null
    };
    this.data = T.mergeDeep({}, n, i), this.isInstanced = !1, this.instanceId = null, ((o = this.data.gradientColors) == null ? void 0 : o.length) === 2 ? this.data.color = null : this.data.color === null && (this.data.color = n.color), this.line = this._createLine(), this._createArrowheads(), this.update();
  }
  _createArrowheads() {
    const t = this.data.arrowhead;
    (t === !0 || t === "target" || t === "both") && (this.arrowheads.target = this._createSingleArrowhead("target")), (t === "source" || t === "both") && (this.arrowheads.source = this._createSingleArrowhead("source"));
  }
  _createLine() {
    var n;
    const t = new Es();
    t.setPositions([0, 0, 0, 0, 0, 1e-3]);
    const e = {
      linewidth: this.data.thickness,
      transparent: !0,
      opacity: D.DEFAULT_OPACITY,
      depthTest: !1,
      resolution: new u.Vector2(window.innerWidth, window.innerHeight),
      dashed: this.data.dashed || !1,
      dashScale: this.data.dashScale ?? 1,
      dashSize: this.data.dashSize ?? 3,
      gapSize: this.data.gapSize ?? 1
    };
    ((n = this.data.gradientColors) == null ? void 0 : n.length) === 2 ? (e.vertexColors = !0, this._colorStart.set(this.data.gradientColors[0]), this._colorEnd.set(this.data.gradientColors[1]), t.setColors([this._colorStart.r, this._colorStart.g, this._colorStart.b, this._colorEnd.r, this._colorEnd.g, this._colorEnd.b])) : (e.vertexColors = !1, e.color = this.data.color || 53503);
    const s = new Tt(e), i = new _s(t, s);
    return s.dashed && i.computeLineDistances(), i.renderOrder = -1, i.userData = { edgeId: this.id }, i;
  }
  _setGradientColors() {
    var t, e;
    if (!(!this.line || !this.line.material))
      if (((t = this.data.gradientColors) == null ? void 0 : t.length) === 2) {
        this.line.material.vertexColors || (this.line.material.vertexColors = !0, this.line.material.needsUpdate = !0), this._colorStart.set(this.data.gradientColors[0]), this._colorEnd.set(this.data.gradientColors[1]);
        const s = ((e = this.line.geometry.attributes.color) == null ? void 0 : e.array) || [];
        if (s.length >= 6)
          s[0] = this._colorStart.r, s[1] = this._colorStart.g, s[2] = this._colorStart.b, s[3] = this._colorEnd.r, s[4] = this._colorEnd.g, s[5] = this._colorEnd.b, this.line.geometry.attributes.color.needsUpdate = !0;
        else {
          const i = this.line.geometry.attributes.position;
          if (i) {
            const n = i.count, o = new Float32Array(n * 3);
            for (let a = 0; a < n; a++) {
              const r = n > 1 ? a / (n - 1) : 0, l = this._colorStart.clone().lerp(this._colorEnd, r);
              o[a * 3] = l.r, o[a * 3 + 1] = l.g, o[a * 3 + 2] = l.b;
            }
            this.line.geometry.setColors(o);
          }
        }
      } else
        this.line.material.vertexColors && (this.line.material.vertexColors = !1, this.line.material.needsUpdate = !0), this.line.material.color.set(this.data.color || 53503);
  }
  update() {
    if (!this.line || !this.source || !this.target) return;
    const t = this.source.position, e = this.target.position;
    !isFinite(t.x) || !isFinite(t.y) || !isFinite(t.z) || !isFinite(e.x) || !isFinite(e.y) || !isFinite(e.z) || (this.line.geometry.setPositions([
      t.x,
      t.y,
      t.z,
      e.x,
      e.y,
      e.z
    ]), this.line.geometry.attributes.position.count !== 0 && (this._setGradientColors(), this.line.material.dashed && this.line.computeLineDistances(), this.line.geometry.computeBoundingSphere(), this._updateArrowheads()));
  }
  _updateArrowheads() {
    const t = this.source.position, e = this.target.position;
    if (this.arrowheads.target) {
      this.arrowheads.target.position.copy(e);
      const s = new u.Vector3().subVectors(e, t).normalize();
      this._orientArrowhead(this.arrowheads.target, s);
    }
    if (this.arrowheads.source) {
      this.arrowheads.source.position.copy(t);
      const s = new u.Vector3().subVectors(t, e).normalize();
      this._orientArrowhead(this.arrowheads.source, s);
    }
  }
  _createSingleArrowhead(t) {
    const e = this.data.arrowheadSize || 10, s = new u.ConeGeometry(e / 2, e, 8), i = new u.MeshBasicMaterial({
      color: this.data.arrowheadColor || this.data.color,
      opacity: D.DEFAULT_OPACITY,
      transparent: !0,
      depthTest: !1
    }), n = new u.Mesh(s, i);
    return n.renderOrder = this.line.renderOrder + 1, n.userData = { edgeId: this.id, type: "edge-arrowhead" }, n;
  }
  _orientArrowhead(t, e) {
    const s = new u.Vector3(0, 1, 0);
    t.quaternion.setFromUnitVectors(s, e);
  }
  setHighlight(t) {
    var n, o;
    if (this.isHighlighted = t, !((n = this.line) != null && n.material)) return;
    const e = this.line.material;
    e.opacity = t ? D.HIGHLIGHT_OPACITY : D.DEFAULT_OPACITY;
    const s = ((o = this.data.gradientColors) == null ? void 0 : o.length) === 2 && e.vertexColors ? 2 : 1.5;
    e.linewidth = t ? this.data.thickness * s : this.data.thickness, e.vertexColors || e.color.set(t ? D.HIGHLIGHT_COLOR : this.data.color), e.needsUpdate = !0;
    const i = (a) => {
      a != null && a.material && (a.material.color.set(t ? D.HIGHLIGHT_COLOR : this.data.arrowheadColor || this.data.color), a.material.opacity = t ? D.HIGHLIGHT_OPACITY : D.DEFAULT_OPACITY);
    };
    i(this.arrowheads.source), i(this.arrowheads.target), t && this.isHovered && this.setHoverStyle(!1, !0);
  }
  setHoverStyle(t, e = !1) {
    var a;
    if (!e && this.isHighlighted || !((a = this.line) != null && a.material)) return;
    this.isHovered = t;
    const s = this.line.material, i = D.DEFAULT_OPACITY, n = this.data.thickness;
    s.opacity = t ? Math.min(1, i + D.DEFAULT_HOVER_OPACITY_BOOST) : i, s.linewidth = t ? n * D.DEFAULT_HOVER_THICKNESS_MULTIPLIER : n, s.needsUpdate = !0;
    const o = (r) => {
      if (r != null && r.material) {
        const l = D.DEFAULT_OPACITY;
        r.material.opacity = t ? Math.min(1, l + D.DEFAULT_HOVER_OPACITY_BOOST) : l;
      }
    };
    this.isHighlighted || (o(this.arrowheads.source), o(this.arrowheads.target));
  }
  updateResolution(t, e) {
    var s;
    (s = this.line) != null && s.material && this.line.material.resolution.set(t, e);
  }
  dispose() {
    var e, s, i, n, o, a;
    (s = (e = this.line) == null ? void 0 : e.geometry) == null || s.dispose(), (n = (i = this.line) == null ? void 0 : i.material) == null || n.dispose(), (a = (o = this.line) == null ? void 0 : o.parent) == null || a.remove(this.line), this.line = null;
    const t = (r) => {
      var l, c, d;
      (l = r == null ? void 0 : r.geometry) == null || l.dispose(), (c = r == null ? void 0 : r.material) == null || c.dispose(), (d = r == null ? void 0 : r.parent) == null || d.remove(r);
    };
    t(this.arrowheads.source), this.arrowheads.source = null, t(this.arrowheads.target), this.arrowheads.target = null;
  }
};
g(D, "typeName", "straight"), // Default base edge type
g(D, "HIGHLIGHT_COLOR", 65535), g(D, "DEFAULT_OPACITY", 0.8), g(D, "HIGHLIGHT_OPACITY", 1), g(D, "DEFAULT_HOVER_OPACITY_BOOST", 0.1), g(D, "DEFAULT_HOVER_THICKNESS_MULTIPLIER", 1.1);
let V = D;
class Te extends V {
  constructor(e, s, i, n = {}) {
    super(e, s, i, n);
    g(this, "labelObject", null);
    g(this, "numPoints", 20);
    g(this, "curvature", 0.3);
    this.numPoints = Math.max(1, Math.floor(this.data.numCurvePoints || 20)), this.curvature = typeof this.data.curvature == "number" && isFinite(this.data.curvature) ? this.data.curvature : 0.3, this.data.label && (this.labelObject = this._createLabel()), this.update();
  }
  _createLabel() {
    const e = {
      color: this.data.labelColor || "var(--sg-edge-label-text, white)",
      backgroundColor: this.data.labelBackgroundColor || "var(--sg-edge-label-bg, rgba(0,0,0,0.6))",
      padding: "2px 5px",
      borderRadius: "3px",
      fontSize: this.data.labelFontSize || "12px"
    };
    return Oe(this.data.label, this.id, "edge-label", e, "edge-label-curved");
  }
  update() {
    var b, y, w;
    if (!this.line || !this.source || !this.target) return;
    this.numPoints = Math.max(1, Math.floor(this.numPoints));
    const e = this.source.position, s = this.target.position;
    if (!isFinite(e.x) || !isFinite(e.y) || !isFinite(e.z) || !isFinite(s.x) || !isFinite(s.y) || !isFinite(s.z))
      return;
    const i = new u.Vector3().addVectors(e, s).multiplyScalar(0.5), n = s.x - e.x, o = s.y - e.y;
    let a = new u.Vector3(-o, n, 0);
    if (a.lengthSq() < 1e-8) {
      const v = new u.Vector3();
      (y = (b = this.space) == null ? void 0 : b._cam) == null || y.getWorldDirection(v), a.set(-v.y, v.x, 0), a.lengthSq() < 1e-8 && a.set(1, 0, 0);
    }
    a.normalize();
    const r = e.distanceTo(s), l = a.multiplyScalar(r * this.curvature), c = new u.Vector3().addVectors(i, l);
    (isNaN(c.x) || isNaN(c.y) || isNaN(c.z)) && c.copy(i);
    const d = new u.QuadraticBezierCurve3(e, c, s), h = this.numPoints, p = d.getPoints(h), f = [];
    p.forEach((v) => {
      f.push(v.x, v.y, v.z);
    }), (f.length === 0 || f.length / 3 !== h + 1) && (f.length = 0, f.push(e.x, e.y, e.z), f.push(s.x, s.y, s.z)), this.line.geometry.setPositions(f);
    const C = this.line.geometry.attributes.position;
    if (!(!C || C.count === 0)) {
      if (((w = this.data.gradientColors) == null ? void 0 : w.length) === 2) {
        this.line.material.vertexColors = !0, this.line.material.needsUpdate = !0;
        const v = new u.Color(this.data.gradientColors[0]), I = new u.Color(this.data.gradientColors[1]), x = [], A = Math.max(1, C.count - 1);
        for (let E = 0; E < C.count; E++) {
          const N = A === 0 ? 0 : E / A, P = new u.Color().lerpColors(v, I, N);
          x.push(P.r, P.g, P.b);
        }
        C.array.length === x.length && this.line.geometry.setColors(x);
      } else
        this.line.material.vertexColors = !1, this.line.material.needsUpdate = !0, this.line.material.color.set(this.data.color || 53503);
      this.line.material.dashed && this.line.computeLineDistances(), this.line.geometry.computeBoundingSphere(), this._updateArrowheadsAlongCurve(p), this._updateLabelAlongCurve(p);
    }
  }
  _updateArrowheadsAlongCurve(e) {
    if (!e || e.length < 2) return;
    const s = e.length - 1;
    if (this.arrowheads.target) {
      const i = e[s], n = e[s - 1];
      this.arrowheads.target.position.copy(i);
      const o = new u.Vector3().subVectors(i, n).normalize();
      this._orientArrowhead(this.arrowheads.target, o);
    }
    if (this.arrowheads.source) {
      const i = e[0], n = e[1];
      this.arrowheads.source.position.copy(i);
      const o = new u.Vector3().subVectors(i, n).normalize();
      this._orientArrowhead(this.arrowheads.source, o);
    }
  }
  _updateLabelAlongCurve(e) {
    var s;
    if (this.labelObject && (e == null ? void 0 : e.length) > 0) {
      const i = Math.floor(e.length / 2);
      this.labelObject.position.copy(e[i]), (s = this.space) != null && s._cam && this.labelObject.quaternion.copy(this.space._cam.quaternion), Me(this.labelObject, this.data.labelLod, this.space);
    }
  }
  setHighlight(e) {
    var s, i;
    super.setHighlight(e), (i = (s = this.labelObject) == null ? void 0 : s.element) == null || i.classList.toggle("selected", e);
  }
  dispose() {
    var e, s, i, n;
    (s = (e = this.labelObject) == null ? void 0 : e.element) == null || s.remove(), (n = (i = this.labelObject) == null ? void 0 : i.parent) == null || n.remove(this.labelObject), this.labelObject = null, super.dispose();
  }
}
g(Te, "typeName", "curved");
class Ne extends V {
  constructor(e, s, i, n = {}) {
    super(e, s, i, n);
    g(this, "labelObject", null);
    g(this, "labelText", "");
    this.labelText = this.data.label || "", this.labelText && (this.labelObject = this._createLabel()), this.update();
  }
  _createLabel() {
    const e = {
      color: this.data.labelColor || "var(--sg-edge-label-text, white)",
      backgroundColor: this.data.labelBackgroundColor || "var(--sg-edge-label-bg, rgba(0,0,0,0.6))",
      padding: "2px 5px",
      borderRadius: "3px",
      fontSize: this.data.labelFontSize || "12px"
    };
    return Oe(this.labelText, this.id, "edge-label", e, "edge-label");
  }
  update() {
    var e;
    if (super.update(), this.labelObject) {
      const s = this.source.position, i = this.target.position;
      this.labelObject.position.addVectors(s, i).multiplyScalar(0.5), (e = this.space) != null && e._cam && this.labelObject.quaternion.copy(this.space._cam.quaternion), Me(this.labelObject, this.data.labelLod, this.space);
    }
  }
  setHighlight(e) {
    var s, i;
    super.setHighlight(e), (i = (s = this.labelObject) == null ? void 0 : s.element) == null || i.classList.toggle("selected", e);
  }
  dispose() {
    var e, s, i, n;
    (s = (e = this.labelObject) == null ? void 0 : e.element) == null || s.remove(), (n = (i = this.labelObject) == null ? void 0 : i.parent) == null || n.remove(this.labelObject), this.labelObject = null, super.dispose();
  }
}
g(Ne, "typeName", "labeled");
class De extends V {
  constructor(t, e, s, i = {}) {
    const n = T.mergeDeep({
      dashed: !0,
      dashScale: i.dashScale ?? 1,
      // User can still override
      dashSize: i.dashSize ?? 1,
      // Small dash for dot appearance
      gapSize: i.gapSize ?? 2,
      // Larger gap for dot appearance
      thickness: i.thickness ?? 2
      // Dotted lines often look better a bit thinner
    }, i);
    super(t, e, s, n);
  }
  // Most functionality is inherited from Edge.js
  // Update will correctly use the dashed properties.
}
g(De, "typeName", "dotted");
const re = class re extends V {
  constructor(t, e, s, i = {}) {
    const n = T.mergeDeep({
      // Default base thickness if not driven by value
      thickness: i.thickness ?? 3,
      // Property in 'data' that drives thickness, e.g., data: { value: 5 }
      thicknessDataKey: i.thicknessDataKey ?? "value",
      // Range for mapping the data value to thickness
      thicknessRange: i.thicknessRange ?? { min: 0, max: 100 },
      // Expected input data range
      // Actual visual thickness range
      visualThicknessRange: i.visualThicknessRange ?? { min: re.MIN_THICKNESS, max: re.MAX_THICKNESS }
    }, i);
    super(t, e, s, n), this.updateThicknessFromData();
  }
  update() {
    this.updateThicknessFromData(), super.update();
  }
  updateThicknessFromData() {
    if (!this.line || !this.line.material) return;
    const t = this.data[this.data.thicknessDataKey] ?? null;
    if (typeof t == "number" && isFinite(t)) {
      const { thicknessRange: e, visualThicknessRange: s } = this.data;
      let i = 0;
      e.max > e.min ? i = (t - e.min) / (e.max - e.min) : e.max === e.min && t >= e.min && (i = 1), i = T.clamp(i, 0, 1);
      const n = u.MathUtils.lerp(
        s.min,
        s.max,
        i
      );
      this.line.material.linewidth = Math.max(0.1, n);
    } else
      this.line.material.linewidth = this.data.thickness;
    this.line.material.needsUpdate = !0;
  }
  // Optionally, provide a method to update the value and refresh thickness
  setValue(t) {
    var e;
    this.data[this.data.thicknessDataKey] = t, this.updateThicknessFromData(), (e = this.space) == null || e.emit("edge:updated", { edge: this, property: "data", value: this.data });
  }
};
g(re, "typeName", "dynamicThickness"), g(re, "MIN_THICKNESS", 1), g(re, "MAX_THICKNESS", 10);
let we = re;
class It extends V {
  // 1 for source->target, -1 for target->source, 0 for bidirectional
  constructor(e, s, i, n = {}) {
    const o = {
      particleCount: n.particleCount ?? 10,
      particleSpeed: n.particleSpeed ?? 0.5,
      particleSize: n.particleSize ?? 3,
      particleColor: n.particleColor ?? 65535,
      flowDirection: n.flowDirection ?? 1,
      animated: n.animated ?? !0,
      glowEffect: n.glowEffect ?? !0,
      ...n
    };
    super(e, s, i, o);
    g(this, "particles", []);
    g(this, "particleCount", 10);
    g(this, "particleSpeed", 0.5);
    g(this, "particleSystem", null);
    g(this, "animationFrame", null);
    g(this, "flowDirection", 1);
    this.particleCount = o.particleCount, this.particleSpeed = o.particleSpeed, this.flowDirection = o.flowDirection, this._createParticleSystem(), o.animated && this._startAnimation();
  }
  _createParticleSystem() {
    const e = new Float32Array(this.particleCount * 3), s = new Float32Array(this.particleCount * 3), i = new Float32Array(this.particleCount), n = new Float32Array(this.particleCount);
    for (let r = 0; r < this.particleCount; r++) {
      const l = r / this.particleCount, c = this._getPositionOnCurve(l);
      e[r * 3] = c.x, e[r * 3 + 1] = c.y, e[r * 3 + 2] = c.z;
      const d = new u.Color(this.data.particleColor);
      s[r * 3] = d.r, s[r * 3 + 1] = d.g, s[r * 3 + 2] = d.b, i[r] = this.data.particleSize, n[r] = Math.random() * 0.5 + 0.5, this.particles.push({
        progress: l,
        velocity: n[r],
        originalSize: this.data.particleSize,
        life: 1
      });
    }
    const o = new u.BufferGeometry();
    o.setAttribute("position", new u.BufferAttribute(e, 3)), o.setAttribute("color", new u.BufferAttribute(s, 3)), o.setAttribute("size", new u.BufferAttribute(i, 1));
    const a = new u.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        glowIntensity: { value: this.data.glowEffect ? 1 : 0 }
      },
      vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                varying float vSize;
                uniform float time;

                void main() {
                    vColor = color;
                    vSize = size;

                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vec4 mvPosition = viewMatrix * worldPosition;

                    gl_Position = projectionMatrix * mvPosition;
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                }
            `,
      fragmentShader: `
                varying vec3 vColor;
                varying float vSize;
                uniform float time;
                uniform float glowIntensity;

                void main() {
                    vec2 center = gl_PointCoord - 0.5;
                    float dist = length(center);

                    if (dist > 0.5) discard;

                    float alpha = 1.0 - (dist * 2.0);
                    alpha = pow(alpha, 2.0);

                    vec3 color = vColor;
                    if (glowIntensity > 0.0) {
                        float glow = sin(time * 3.0 + dist * 10.0) * 0.3 + 0.7;
                        color *= glow * glowIntensity + (1.0 - glowIntensity);
                    }

                    gl_FragColor = vec4(color, alpha);
                }
            `,
      transparent: !0,
      depthTest: !1,
      blending: u.AdditiveBlending,
      vertexColors: !0
    });
    this.particleSystem = new u.Points(o, a), this.particleSystem.userData = { edgeId: this.id, type: "flow-particles" }, this.particleSystem.renderOrder = 1;
  }
  _getPositionOnCurve(e) {
    if (!this.source || !this.target)
      return new u.Vector3();
    const s = this.source.position, i = this.target.position;
    return new u.Vector3().lerpVectors(s, i, e);
  }
  _startAnimation() {
    if (this.animationFrame) return;
    const e = () => {
      this._updateParticles(), this.animationFrame = requestAnimationFrame(e);
    };
    this.animationFrame = requestAnimationFrame(e);
  }
  _stopAnimation() {
    this.animationFrame && (cancelAnimationFrame(this.animationFrame), this.animationFrame = null);
  }
  _updateParticles() {
    if (!this.particleSystem || !this.source || !this.target) return;
    const e = this.particleSystem.geometry.attributes.position.array, s = this.particleSystem.geometry.attributes.size.array, i = performance.now() * 1e-3;
    this.particleSystem.material.uniforms && (this.particleSystem.material.uniforms.time.value = i);
    for (let n = 0; n < this.particles.length; n++) {
      const o = this.particles[n];
      this.flowDirection !== 0 ? (o.progress += this.particleSpeed * o.velocity * this.flowDirection * 0.01, this.flowDirection > 0 && o.progress > 1 ? (o.progress = 0, o.life = 1) : this.flowDirection < 0 && o.progress < 0 && (o.progress = 1, o.life = 1)) : (o.progress += this.particleSpeed * o.velocity * 0.01 * Math.sin(i + n), o.progress = Math.max(0, Math.min(1, o.progress)));
      const a = this._getPositionOnCurve(o.progress);
      e[n * 3] = a.x, e[n * 3 + 1] = a.y, e[n * 3 + 2] = a.z;
      const r = Math.sin(i * 4 + n * 0.1) * 0.3 + 0.7;
      s[n] = o.originalSize * o.life * r, o.life = Math.max(0.1, Math.sin(o.progress * Math.PI));
    }
    this.particleSystem.geometry.attributes.position.needsUpdate = !0, this.particleSystem.geometry.attributes.size.needsUpdate = !0;
  }
  update() {
    super.update(), this.particleSystem && this.source && this.target && this._updateParticles();
  }
  setFlowDirection(e) {
    this.flowDirection = e, this.data.flowDirection = e;
  }
  setParticleSpeed(e) {
    this.particleSpeed = e, this.data.particleSpeed = e;
  }
  setParticleCount(e) {
    this.particleCount = e, this.data.particleCount = e, this.disposeParticleSystem(), this._createParticleSystem(), this.data.animated && this._startAnimation();
  }
  setParticleColor(e) {
    if (this.data.particleColor = e, this.particleSystem) {
      const s = this.particleSystem.geometry.attributes.color.array, i = new u.Color(e);
      for (let n = 0; n < this.particleCount; n++)
        s[n * 3] = i.r, s[n * 3 + 1] = i.g, s[n * 3 + 2] = i.b;
      this.particleSystem.geometry.attributes.color.needsUpdate = !0;
    }
  }
  setAnimated(e) {
    this.data.animated = e, e ? this._startAnimation() : this._stopAnimation();
  }
  setGlowEffect(e) {
    this.data.glowEffect = e, this.particleSystem && this.particleSystem.material.uniforms && (this.particleSystem.material.uniforms.glowIntensity.value = e ? 1 : 0);
  }
  disposeParticleSystem() {
    var e, s, i;
    this.particleSystem && ((e = this.particleSystem.geometry) == null || e.dispose(), (s = this.particleSystem.material) == null || s.dispose(), (i = this.particleSystem.parent) == null || i.remove(this.particleSystem), this.particleSystem = null), this.particles = [];
  }
  dispose() {
    this._stopAnimation(), this.disposeParticleSystem(), super.dispose();
  }
  // Method to add particle system to scene
  addToScene(e) {
    this.particleSystem && e.add(this.particleSystem);
  }
  // Method to remove particle system from scene
  removeFromScene(e) {
    this.particleSystem && e.remove(this.particleSystem);
  }
}
g(It, "typeName", "flow");
class Mt extends V {
  constructor(e, s, i, n = {}) {
    const o = {
      restLength: n.restLength ?? 200,
      stiffness: n.stiffness ?? 0.01,
      damping: n.damping ?? 0.95,
      maxCompression: n.maxCompression ?? 0.3,
      springCoils: n.springCoils ?? 8,
      springRadius: n.springRadius ?? 5,
      springColor: n.springColor ?? 8947848,
      showTension: n.showTension ?? !0,
      tensionColorMin: n.tensionColorMin ?? 65280,
      tensionColorMax: n.tensionColorMax ?? 16711680,
      enablePhysics: n.enablePhysics ?? !0,
      ...n
    };
    super(e, s, i, o);
    g(this, "springForce", null);
    g(this, "restLength", 200);
    g(this, "stiffness", 0.01);
    g(this, "damping", 0.95);
    g(this, "tension", 0);
    g(this, "isCompressed", !1);
    g(this, "maxCompression", 0.3);
    g(this, "springCoils", 8);
    g(this, "springMesh", null);
    this.restLength = o.restLength, this.stiffness = o.stiffness, this.damping = o.damping, this.maxCompression = o.maxCompression, this.springCoils = o.springCoils, this._createSpringMesh(), this.update();
  }
  _createSpringMesh() {
    this._disposeSpringMesh();
    const e = this._createSpringGeometry(), s = new u.MeshBasicMaterial({
      color: this.data.springColor,
      transparent: !0,
      opacity: 0.8,
      side: u.DoubleSide
    });
    this.springMesh = new u.Mesh(e, s), this.springMesh.userData = { edgeId: this.id, type: "spring-mesh" };
  }
  _createSpringGeometry() {
    const e = [], s = this.springCoils, n = s * 20;
    for (let r = 0; r <= n; r++) {
      const l = r / n, c = l * s * Math.PI * 2, d = this.data.springRadius * (1 - Math.abs(l - 0.5) * 0.3), h = Math.cos(c) * d, p = Math.sin(c) * d, f = l;
      e.push(new u.Vector3(h, p, f));
    }
    const o = new u.CatmullRomCurve3(e);
    return new u.TubeGeometry(o, n, this.data.springRadius * 0.2, 8, !1);
  }
  _updateSpringGeometry() {
    if (!this.springMesh || !this.source || !this.target) return;
    const e = this.source.position, s = this.target.position, n = e.distanceTo(s) / this.restLength;
    this.isCompressed = n < 1;
    const o = new u.Vector3().subVectors(s, e).normalize(), a = new u.Vector3();
    Math.abs(o.y) < 0.9 ? a.crossVectors(o, new u.Vector3(0, 1, 0)) : a.crossVectors(o, new u.Vector3(1, 0, 0)), a.normalize();
    const r = new u.Vector3().crossVectors(o, a), l = new u.Vector3().addVectors(e, s).multiplyScalar(0.5);
    this.springMesh.position.copy(l);
    const c = new u.Matrix4();
    c.makeBasis(a, r, o), this.springMesh.setRotationFromMatrix(c);
    const d = this.isCompressed ? Math.max(this.maxCompression, n) : n;
    this.springMesh.scale.set(
      this.isCompressed ? 2 - d : 1,
      // Increase radius when compressed
      this.isCompressed ? 2 - d : 1,
      d
    ), this.data.showTension && this._updateTensionColor(n), this._calculateSpringForce();
  }
  _updateTensionColor(e) {
    if (!this.springMesh || !this.springMesh.material) return;
    const s = Math.abs(e - 1), i = Math.min(s * 2, 1), n = new u.Color(this.data.tensionColorMin), o = new u.Color(this.data.tensionColorMax), a = n.clone().lerp(o, i);
    this.springMesh.material.color.copy(a), this.springMesh.material.opacity = 0.6 + i * 0.4;
  }
  _calculateSpringForce() {
    var r;
    if (!this.source || !this.target || !this.data.enablePhysics) return;
    const e = this.source.position, s = this.target.position, n = e.distanceTo(s) - this.restLength, o = -this.stiffness * n, a = new u.Vector3().subVectors(s, e).normalize();
    this.springForce = a.multiplyScalar(o), this.tension = Math.abs(n / this.restLength), (r = this.space) == null || r.emit("physics:spring:force", {
      edge: this,
      force: this.springForce.clone(),
      tension: this.tension,
      displacement: n,
      isCompressed: this.isCompressed
    });
  }
  update() {
    super.update(), this._updateSpringGeometry();
  }
  getSpringForce() {
    return this.springForce ? this.springForce.clone() : new u.Vector3();
  }
  getTension() {
    return this.tension;
  }
  setRestLength(e) {
    this.restLength = e, this.data.restLength = e, this.update();
  }
  setStiffness(e) {
    this.stiffness = e, this.data.stiffness = e;
  }
  setDamping(e) {
    this.damping = e, this.data.damping = e;
  }
  setSpringCoils(e) {
    this.springCoils = e, this.data.springCoils = e, this._createSpringMesh(), this.update();
  }
  setSpringRadius(e) {
    this.data.springRadius = e, this._createSpringMesh(), this.update();
  }
  setTensionColors(e, s) {
    this.data.tensionColorMin = e, this.data.tensionColorMax = s, this.update();
  }
  setPhysicsEnabled(e) {
    this.data.enablePhysics = e, e || (this.springForce = null, this.tension = 0);
  }
  // Apply spring force to connected nodes
  applyForceToNodes() {
    if (!this.springForce || !this.data.enablePhysics) return;
    const e = this.springForce.clone(), s = e.clone().multiplyScalar(this.damping - 1);
    this.source.velocity && (this.source.velocity.add(e.clone().divideScalar(this.source.mass || 1)), this.source.velocity.add(s.clone().divideScalar(this.source.mass || 1))), this.target.velocity && (this.target.velocity.sub(e.clone().divideScalar(this.target.mass || 1)), this.target.velocity.sub(s.clone().divideScalar(this.target.mass || 1)));
  }
  // Animate spring oscillation
  animateOscillation(e = 20, s = 2) {
    if (!this.source || !this.target) return;
    const i = performance.now() * 1e-3, n = Math.sin(i * s) * e, o = new u.Vector3().subVectors(this.target.position, this.source.position).normalize(), a = new u.Vector3();
    Math.abs(o.y) < 0.9 ? a.crossVectors(o, new u.Vector3(0, 1, 0)) : a.crossVectors(o, new u.Vector3(1, 0, 0));
    const r = a.multiplyScalar(n);
    if (this.springMesh) {
      const l = new u.Vector3().addVectors(this.source.position, this.target.position).multiplyScalar(0.5);
      this.springMesh.position.copy(l.add(r));
    }
  }
  _disposeSpringMesh() {
    var e, s, i;
    this.springMesh && ((e = this.springMesh.geometry) == null || e.dispose(), (s = this.springMesh.material) == null || s.dispose(), (i = this.springMesh.parent) == null || i.remove(this.springMesh), this.springMesh = null);
  }
  dispose() {
    this._disposeSpringMesh(), super.dispose();
  }
  // Method to add spring mesh to scene
  addToScene(e) {
    this.springMesh && e.add(this.springMesh);
  }
  // Method to remove spring mesh from scene
  removeFromScene(e) {
    this.springMesh && e.remove(this.springMesh);
  }
}
g(Mt, "typeName", "spring");
class xt extends V {
  constructor(e, s, i, n = {}) {
    const o = {
      segments: n.segments ?? 50,
      autoControlPoints: n.autoControlPoints ?? !0,
      controlPointsVisible: n.controlPointsVisible ?? !1,
      controlPointSize: n.controlPointSize ?? 3,
      controlPointColor: n.controlPointColor ?? 16776960,
      curveTension: n.curveTension ?? 0.3,
      curveType: n.curveType ?? "cubic",
      // 'cubic', 'quadratic'
      manualControlPoints: n.manualControlPoints ?? null,
      ...n
    };
    super(e, s, i, o);
    g(this, "controlPoints", []);
    g(this, "curve", null);
    g(this, "controlPointMeshes", []);
    g(this, "controlPointVisible", !1);
    g(this, "autoControlPoints", !0);
    g(this, "segments", 50);
    this.segments = o.segments, this.autoControlPoints = o.autoControlPoints, this.controlPointVisible = o.controlPointsVisible, this._initializeControlPoints(), this._createControlPointMeshes(), this.update();
  }
  _initializeControlPoints() {
    !this.source || !this.target || (this.data.manualControlPoints && this.data.manualControlPoints.length > 0 ? (this.controlPoints = this.data.manualControlPoints.map(
      (e) => new u.Vector3(e.x, e.y, e.z || 0)
    ), this.autoControlPoints = !1) : this.autoControlPoints ? this._generateAutoControlPoints() : this.controlPoints = [
      this.source.position.clone(),
      new u.Vector3(),
      new u.Vector3(),
      this.target.position.clone()
    ], this._updateCurve());
  }
  _generateAutoControlPoints() {
    const e = this.source.position, s = this.target.position, i = e.distanceTo(s), n = this.data.curveTension, o = new u.Vector3().subVectors(s, e), a = new u.Vector3(-o.z, 0, o.x).normalize();
    if (this.data.curveType === "quadratic") {
      const r = new u.Vector3().addVectors(e, s).multiplyScalar(0.5), l = a.multiplyScalar(i * n);
      this.controlPoints = [
        e.clone(),
        r.clone().add(l),
        s.clone()
      ];
    } else {
      const r = i * n, l = o.clone().normalize(), c = a.clone().multiplyScalar(r * 0.5), d = e.clone().add(l.multiplyScalar(r)).add(c), h = o.clone().normalize().negate(), p = a.clone().multiplyScalar(-r * 0.5), f = s.clone().add(h.multiplyScalar(r)).add(p);
      this.controlPoints = [
        e.clone(),
        d,
        f,
        s.clone()
      ];
    }
  }
  _updateCurve() {
    this.controlPoints.length < 3 || (this.data.curveType === "quadratic" && this.controlPoints.length === 3 ? this.curve = new u.QuadraticBezierCurve3(
      this.controlPoints[0],
      this.controlPoints[1],
      this.controlPoints[2]
    ) : this.controlPoints.length >= 4 && (this.curve = new u.CubicBezierCurve3(
      this.controlPoints[0],
      this.controlPoints[1],
      this.controlPoints[2],
      this.controlPoints[3]
    )), this._updateLineGeometry());
  }
  _updateLineGeometry() {
    var i;
    if (!this.curve || !this.line) return;
    const e = this.curve.getPoints(this.segments), s = [];
    if (e.forEach((n) => {
      s.push(n.x, n.y, n.z);
    }), this.line.geometry.setPositions(s), ((i = this.data.gradientColors) == null ? void 0 : i.length) === 2) {
      const n = [], o = new u.Color(this.data.gradientColors[0]), a = new u.Color(this.data.gradientColors[1]);
      for (let r = 0; r < e.length; r++) {
        const l = r / (e.length - 1), c = o.clone().lerp(a, l);
        n.push(c.r, c.g, c.b);
      }
      this.line.geometry.setColors(n);
    }
    this.line.material.dashed && this.line.computeLineDistances(), this.line.geometry.computeBoundingSphere();
  }
  _createControlPointMeshes() {
    if (this._disposeControlPointMeshes(), !this.controlPointVisible) return;
    const e = new u.SphereGeometry(this.data.controlPointSize, 16, 8);
    this.controlPoints.forEach((s, i) => {
      if (i === 0 || i === this.controlPoints.length - 1) return;
      const n = new u.MeshBasicMaterial({
        color: this.data.controlPointColor,
        transparent: !0,
        opacity: 0.8
      }), o = new u.Mesh(e.clone(), n);
      o.position.copy(s), o.userData = {
        edgeId: this.id,
        type: "control-point",
        index: i
      }, this.controlPointMeshes.push(o);
    });
  }
  _disposeControlPointMeshes() {
    this.controlPointMeshes.forEach((e) => {
      var s, i, n;
      (s = e.geometry) == null || s.dispose(), (i = e.material) == null || i.dispose(), (n = e.parent) == null || n.remove(e);
    }), this.controlPointMeshes = [];
  }
  update() {
    !this.source || !this.target || (this.controlPoints.length > 0 && (this.controlPoints[0].copy(this.source.position), this.controlPoints[this.controlPoints.length - 1].copy(this.target.position), this.autoControlPoints && this._generateAutoControlPoints(), this._updateCurve()), this.controlPointMeshes.forEach((e, s) => {
      const i = s + 1;
      this.controlPoints[i] && e.position.copy(this.controlPoints[i]);
    }), super.update());
  }
  setControlPoint(e, s) {
    var i;
    if (e >= 0 && e < this.controlPoints.length) {
      this.controlPoints[e].copy(s), this._updateCurve();
      const n = e - 1;
      n >= 0 && n < this.controlPointMeshes.length && this.controlPointMeshes[n].position.copy(s), (i = this.space) == null || i.emit("graph:edge:controlPointChanged", {
        edge: this,
        index: e,
        position: s.clone()
      });
    }
  }
  addControlPoint(e, s = null) {
    var o;
    const i = s !== null ? s : Math.floor(this.controlPoints.length / 2), n = new u.Vector3().copy(e);
    this.controlPoints.splice(i, 0, n), this.autoControlPoints = !1, this._updateCurve(), this._createControlPointMeshes(), (o = this.space) == null || o.emit("graph:edge:controlPointAdded", {
      edge: this,
      index: i,
      position: n.clone()
    });
  }
  removeControlPoint(e) {
    var s;
    e > 0 && e < this.controlPoints.length - 1 && (this.controlPoints.splice(e, 1), this._updateCurve(), this._createControlPointMeshes(), (s = this.space) == null || s.emit("graph:edge:controlPointRemoved", {
      edge: this,
      index: e
    }));
  }
  setControlPointsVisible(e) {
    this.controlPointVisible = e, this.data.controlPointsVisible = e, e ? this._createControlPointMeshes() : this._disposeControlPointMeshes();
  }
  setCurveTension(e) {
    this.data.curveTension = e, this.autoControlPoints && (this._generateAutoControlPoints(), this._updateCurve());
  }
  setCurveType(e) {
    (e === "quadratic" || e === "cubic") && (this.data.curveType = e, this._generateAutoControlPoints(), this._updateCurve(), this._createControlPointMeshes());
  }
  setSegments(e) {
    this.segments = Math.max(3, e), this.data.segments = this.segments, this._updateLineGeometry();
  }
  setAutoControlPoints(e) {
    this.autoControlPoints = e, this.data.autoControlPoints = e, e && (this._generateAutoControlPoints(), this._updateCurve(), this._createControlPointMeshes());
  }
  getPointOnCurve(e) {
    return this.curve ? this.curve.getPoint(e) : new u.Vector3();
  }
  getTangentOnCurve(e) {
    return this.curve ? this.curve.getTangent(e) : new u.Vector3();
  }
  getCurveLength() {
    return this.curve ? this.curve.getLength() : 0;
  }
  getControlPoints() {
    return this.controlPoints.map((e) => e.clone());
  }
  // Animate control points
  animateControlPoints(e = 20, s = 1) {
    if (!this.autoControlPoints || this.controlPoints.length < 3) return;
    const i = performance.now() * 1e-3;
    for (let n = 1; n < this.controlPoints.length - 1; n++) {
      const o = this.controlPoints[n].y, a = Math.sin(i * s + n) * e;
      this.controlPoints[n].y = o + a;
    }
    this._updateCurve();
  }
  dispose() {
    this._disposeControlPointMeshes(), super.dispose();
  }
  // Methods to add/remove control point meshes from scene
  addToScene(e) {
    this.controlPointMeshes.forEach((s) => e.add(s));
  }
  removeFromScene(e) {
    this.controlPointMeshes.forEach((s) => e.remove(s));
  }
}
g(xt, "typeName", "bezier");
class Dn extends Is {
  // Extend BaseFactory
  constructor(t) {
    super(), this.space = t;
  }
  registerCoreEdgeTypes() {
    this.registerType(V.typeName, V), this.registerType(Te.typeName, Te), this.registerType(Ne.typeName, Ne), this.registerType(De.typeName, De), this.registerType(we.typeName, we), this.registerType(It.typeName, It), this.registerType(Mt.typeName, Mt), this.registerType(xt.typeName, xt), this.registerType("default", V);
  }
  /**
   * Creates a new edge instance of a given type.
   * @param {string} id - The unique ID for the edge.
   * @param {string} type - The typeName of the edge to create.
   * @param {Node} sourceNode - The source node instance.
   * @param {Node} targetNode - The target node instance.
   * @param {object} [data={}] - Custom data for the edge.
   * @returns {Edge|null} The created edge instance, or null if the type is not found.
   */
  createEdge(t, e, s, i, n = {}) {
    const o = (n == null ? void 0 : n.type) || e, a = this.create(o, [t, s, i, n], "default");
    return a && (a.space = this.space), a;
  }
}
const We = 5e3, zn = 0.5, Rn = 1.5;
class On {
  constructor(t) {
    var e;
    this.geometry = new u.ConeGeometry(0.5, 1, 8), this.material = new u.MeshStandardMaterial({
      roughness: 0.8,
      metalness: 0.2,
      vertexColors: !0
    }), this.instancedMesh = new u.InstancedMesh(this.geometry, this.material, We * 2), this.instancedMesh.instanceMatrix.setUsage(u.DynamicDrawUsage), (e = this.instancedMesh.instanceColor) == null || e.setUsage(u.DynamicDrawUsage), this.instancedMesh.castShadow = !1, this.instancedMesh.receiveShadow = !0, t.add(this.instancedMesh), this.arrowheadIdToInstanceId = /* @__PURE__ */ new Map(), this.instanceIdToArrowheadId = /* @__PURE__ */ new Map(), this.activeInstances = 0;
  }
  addArrowhead(t, e) {
    if (this.activeInstances >= We * 2)
      return console.warn("InstancedEdgeManager: Max arrowhead instances reached."), null;
    const s = this.activeInstances++, i = `${t.id}_${e}`;
    return this.arrowheadIdToInstanceId.set(i, s), this.instanceIdToArrowheadId.set(s, i), this.updateArrowheadTransform(t, e, s), this.updateArrowheadColor(t, s), s;
  }
  updateArrowheadTransform(t, e, s = this.arrowheadIdToInstanceId.get(`${t.id}_${e}`)) {
    var p;
    if (s === void 0) return;
    const i = t.source.position, n = t.target.position, o = new u.Matrix4(), a = new u.Vector3(), r = new u.Vector3().subVectors(n, i).normalize(), l = ((p = t.data) == null ? void 0 : p.arrowheadSize) ?? Rn;
    e === "target" ? a.copy(n).sub(r.clone().multiplyScalar(l * 0.5)) : a.copy(i).add(r.clone().multiplyScalar(l * 0.5));
    const c = new u.Quaternion(), d = new u.Vector3(0, 1, 0);
    r.equals(new u.Vector3(0, 0, 0)) || (d.dot(r) > 0.9999 || d.dot(r) < -0.9999 ? d.dot(r) < -0.9999 && c.setFromAxisAngle(new u.Vector3(1, 0, 0), Math.PI) : c.setFromUnitVectors(d, r));
    const h = new u.Vector3(l, l, l);
    o.compose(a, c, h), this.instancedMesh.setMatrixAt(s, o), this.instancedMesh.instanceMatrix.needsUpdate = !0;
  }
  updateArrowheadColor(t, e) {
    var i;
    if (e === void 0 || !this.instancedMesh.instanceColor) return;
    const s = new u.Color(((i = t.data) == null ? void 0 : i.color) ?? 8947848);
    this.instancedMesh.setColorAt(e, s), this.instancedMesh.instanceColor.needsUpdate = !0;
  }
  removeArrowhead(t, e) {
    const s = `${t.id}_${e}`, i = this.arrowheadIdToInstanceId.get(s);
    i !== void 0 && (this.instancedMesh.setMatrixAt(i, new u.Matrix4().makeScale(0, 0, 0)), this.instancedMesh.instanceMatrix.needsUpdate = !0, this.arrowheadIdToInstanceId.delete(s), this.instanceIdToArrowheadId.delete(i));
  }
  dispose() {
    var t;
    (t = this.instancedMesh.parent) == null || t.remove(this.instancedMesh), this.instancedMesh.geometry.dispose(), this.instancedMesh.material.dispose(), this.arrowheadIdToInstanceId.clear(), this.instanceIdToArrowheadId.clear();
  }
}
class Gn {
  constructor(t) {
    var e;
    this.geometry = new u.CylinderGeometry(0.5, 0.5, 1, 8, 1), this.material = new u.MeshStandardMaterial({
      roughness: 0.8,
      metalness: 0.2,
      vertexColors: !0
    }), this.instancedMesh = new u.InstancedMesh(this.geometry, this.material, We), this.instancedMesh.instanceMatrix.setUsage(u.DynamicDrawUsage), (e = this.instancedMesh.instanceColor) == null || e.setUsage(u.DynamicDrawUsage), this.instancedMesh.castShadow = !1, this.instancedMesh.receiveShadow = !0, t.add(this.instancedMesh), this.edgeIdToInstanceId = /* @__PURE__ */ new Map(), this.instanceIdToEdgeId = /* @__PURE__ */ new Map(), this.activeInstances = 0;
  }
  addEdge(t) {
    if (this.activeInstances >= We)
      return console.warn("InstancedEdgeManager: Max instances reached."), null;
    const e = this.activeInstances++;
    return this.edgeIdToInstanceId.set(t.id, e), this.instanceIdToEdgeId.set(e, t.id), this.updateEdgeTransform(t, e), this.updateEdgeColor(t, e), e;
  }
  updateEdgeTransform(t, e = this.edgeIdToInstanceId.get(t.id)) {
    var p;
    if (e === void 0) return;
    const s = t.source.position, i = t.target.position, n = new u.Matrix4(), o = new u.Vector3().addVectors(s, i).multiplyScalar(0.5), a = new u.Vector3().subVectors(i, s), r = a.length();
    a.normalize();
    const l = new u.Quaternion(), c = new u.Vector3(0, 1, 0);
    a.equals(new u.Vector3(0, 0, 0)) || (c.dot(a) > 0.9999 || c.dot(a) < -0.9999 ? c.dot(a) < -0.9999 && l.setFromAxisAngle(new u.Vector3(1, 0, 0), Math.PI) : l.setFromUnitVectors(c, a));
    const d = ((p = t.data) == null ? void 0 : p.thicknessInstanced) ?? zn, h = new u.Vector3(d * 2, r, d * 2);
    n.compose(o, l, h), this.instancedMesh.setMatrixAt(e, n), this.instancedMesh.instanceMatrix.needsUpdate = !0;
  }
  updateEdgeColor(t, e = this.edgeIdToInstanceId.get(t.id)) {
    var i;
    if (e === void 0 || !this.instancedMesh.instanceColor) return;
    const s = new u.Color(((i = t.data) == null ? void 0 : i.color) ?? 8947848);
    this.instancedMesh.setColorAt(e, s), this.instancedMesh.instanceColor.needsUpdate = !0;
  }
  removeEdge(t) {
    const e = this.edgeIdToInstanceId.get(t.id);
    e !== void 0 && (this.instancedMesh.setMatrixAt(e, new u.Matrix4().makeScale(0, 0, 0)), this.instancedMesh.instanceMatrix.needsUpdate = !0, this.edgeIdToInstanceId.delete(t.id), this.instanceIdToEdgeId.delete(e));
  }
  getRaycastIntersection(t) {
    if (!this.instancedMesh || this.activeInstances === 0) return null;
    const e = t.intersectObject(this.instancedMesh);
    if (e.length === 0) return null;
    const s = e[0].instanceId, i = this.instanceIdToEdgeId.get(s);
    return i ? { ...e[0], edgeId: i } : null;
  }
  dispose() {
    var t;
    (t = this.instancedMesh.parent) == null || t.remove(this.instancedMesh), this.instancedMesh.geometry.dispose(), this.instancedMesh.material.dispose(), this.edgeIdToInstanceId.clear(), this.instanceIdToEdgeId.clear();
  }
}
class Fn {
  constructor(t) {
    this.scene = t, this.edgeGroup = new Gn(this.scene), this.arrowheadGroup = new On(this.scene);
  }
  addEdge(t) {
    var s, i, n, o, a;
    const e = (s = this.edgeGroup) == null ? void 0 : s.addEdge(t);
    return e === null ? (t.isInstanced = !1, !1) : (t.isInstanced = !0, t.instanceId = e, t.line && (t.line.visible = !1), (i = t.data.arrowheads) != null && i.source && ((n = this.arrowheadGroup) == null || n.addArrowhead(t, "source")), (o = t.data.arrowheads) != null && o.target && ((a = this.arrowheadGroup) == null || a.addArrowhead(t, "target")), !0);
  }
  updateEdge(t) {
    var e, s, i, n, o, a, r;
    t.isInstanced && ((e = this.edgeGroup) == null || e.updateEdgeTransform(t), (s = this.edgeGroup) == null || s.updateEdgeColor(t), (i = t.data.arrowheads) != null && i.source && ((n = this.arrowheadGroup) == null || n.updateArrowheadTransform(t, "source")), (o = t.data.arrowheads) != null && o.target && ((a = this.arrowheadGroup) == null || a.updateArrowheadTransform(t, "target")), (r = this.arrowheadGroup) == null || r.updateArrowheadColor(t));
  }
  removeEdge(t) {
    var e, s, i, n, o;
    t.isInstanced && ((e = this.edgeGroup) == null || e.removeEdge(t), (s = t.data.arrowheads) != null && s.source && ((i = this.arrowheadGroup) == null || i.removeArrowhead(t, "source")), (n = t.data.arrowheads) != null && n.target && ((o = this.arrowheadGroup) == null || o.removeArrowhead(t, "target")), t.isInstanced = !1);
  }
  raycast(t) {
    var e;
    return (e = this.edgeGroup) == null ? void 0 : e.getRaycastIntersection(t);
  }
  dispose() {
    var t;
    (t = this.edgeGroup) == null || t.dispose(), this.edgeGroup = null;
  }
}
const rs = 50;
class Bn extends U {
  constructor(e, s) {
    super(e, s);
    g(this, "edges", /* @__PURE__ */ new Map());
    g(this, "edgeFactory", null);
    g(this, "instancedEdgeManager", null);
    g(this, "useInstancedEdges", !1);
    this.edgeFactory = new Dn(e), this._registerEdgeTypes();
  }
  /**
   * Registers all known edge types with the EdgeFactory.
   * This method is called during plugin construction.
   * To add a new edge type:
   * 1. Create your edge class (e.g., MyCustomEdge extends Edge).
   * 2. Ensure it has a static `typeName` property (e.g., static typeName = 'myCustomEdge').
   * 3. Import it into this file (EdgePlugin.js).
   * 4. Add a line here: `this.edgeFactory.registerType(MyCustomEdge.typeName, MyCustomEdge);`
   */
  _registerEdgeTypes() {
    this.edgeFactory.registerType(V.typeName, V), this.edgeFactory.registerType(Te.typeName, Te), this.edgeFactory.registerType(Ne.typeName, Ne), this.edgeFactory.registerType(De.typeName, De), this.edgeFactory.registerType(we.typeName, we), this.edgeFactory.registerType("default", V);
  }
  getName() {
    return "EdgePlugin";
  }
  init() {
    super.init(), this.space.on("renderer:resize", this.handleRendererResize.bind(this));
    const e = this.pluginManager.getPlugin("RenderingPlugin");
    if (!(e != null && e.getWebGLScene())) {
      console.error("EdgePlugin: RenderingPlugin or scene not available.");
      return;
    }
    this.instancedEdgeManager = new Fn(e.getWebGLScene());
  }
  handleRendererResize({ width: e, height: s }) {
    this.edges.forEach((i) => {
      !i.isInstanced && i.updateResolution && i.updateResolution(e, s);
    });
  }
  _checkAndSwitchInstancingMode() {
    const e = this.edges.size >= rs;
    if (this.useInstancedEdges === e) return;
    this.useInstancedEdges = e;
    const s = this.pluginManager.getPlugin("RenderingPlugin");
    if (!s || !this.instancedEdgeManager) return;
    const i = s.getWebGLScene(), n = s.getCSS3DScene();
    this.edges.forEach((o) => {
      var a, r, l, c;
      this.useInstancedEdges ? o.isInstanced || (i == null || i.remove(o.line), (a = o.arrowheads) != null && a.source && (i == null || i.remove(o.arrowheads.source)), (r = o.arrowheads) != null && r.target && (i == null || i.remove(o.arrowheads.target)), this.instancedEdgeManager.addEdge(o)) : (o.isInstanced && this.instancedEdgeManager.removeEdge(o), o.line && (i == null || i.add(o.line)), (l = o.arrowheads) != null && l.source && (i == null || i.add(o.arrowheads.source)), (c = o.arrowheads) != null && c.target && (i == null || i.add(o.arrowheads.target))), o.labelObject && (this.useInstancedEdges, n == null || n.add(o.labelObject));
    });
  }
  addEdge(e, s, i = {}) {
    var l, c;
    if (!e || !s || e === s)
      return console.warn("EdgePlugin: Invalid source or target."), null;
    for (const d of this.edges.values())
      if (d.source === e && d.target === s || d.source === s && d.target === e)
        return console.warn(`EdgePlugin: Duplicate edge ignored between ${e.id} and ${s.id}.`), d;
    const n = this.edgeFactory.createEdge(T.generateId("edge"), i.type || "default", e, s, i);
    if (!n)
      return console.error(`EdgePlugin: Failed to create edge type "${i.type || "default"}".`), null;
    this.edges.set(n.id, n);
    const o = this.pluginManager.getPlugin("RenderingPlugin"), a = o == null ? void 0 : o.getWebGLScene(), r = o == null ? void 0 : o.getCSS3DScene();
    return this.edges.size >= rs ? this.instancedEdgeManager.addEdge(n) : (n.line && (a == null || a.add(n.line)), (l = n.arrowheads) != null && l.source && (a == null || a.add(n.arrowheads.source)), (c = n.arrowheads) != null && c.target && (a == null || a.add(n.arrowheads.target))), n.labelObject && (r == null || r.add(n.labelObject)), this._checkAndSwitchInstancingMode(), this.space.emit("edge:added", n), n;
  }
  removeEdge(e) {
    var i, n, o, a, r, l, c, d;
    const s = this.edges.get(e);
    if (!s) return console.warn(`EdgePlugin: Edge ${e} not found.`);
    if (((i = this.pluginManager.getPlugin("UIPlugin")) == null ? void 0 : i.getSelectedEdge()) === s && this.pluginManager.getPlugin("UIPlugin").setSelectedEdge(null), (n = this.pluginManager.getPlugin("LayoutPlugin")) == null || n.removeEdgeFromLayout(s), s.isInstanced && this.instancedEdgeManager) this.instancedEdgeManager.removeEdge(s);
    else {
      const h = this.pluginManager.getPlugin("RenderingPlugin");
      (o = h == null ? void 0 : h.getWebGLScene()) == null || o.remove(s.line), (a = s.arrowheads) != null && a.source && ((r = h == null ? void 0 : h.getWebGLScene()) == null || r.remove(s.arrowheads.source)), (l = s.arrowheads) != null && l.target && ((c = h == null ? void 0 : h.getWebGLScene()) == null || c.remove(s.arrowheads.target)), s.labelObject && ((d = h == null ? void 0 : h.getCSS3DScene()) == null || d.remove(s.labelObject));
    }
    s.dispose(), this.edges.delete(e), this._checkAndSwitchInstancingMode(), this.space.emit("edge:removed", e, s);
  }
  getEdgeById(e) {
    return this.edges.get(e);
  }
  getEdges() {
    return this.edges;
  }
  getEdgesForNode(e) {
    const s = [];
    for (const i of this.edges.values())
      (i.source === e || i.target === e) && s.push(i);
    return s;
  }
  update() {
    this.edges.forEach((e) => {
      var s, i;
      e.isInstanced && this.instancedEdgeManager ? this.instancedEdgeManager.updateEdge(e) : (s = e.update) == null || s.call(e), (i = e.updateLabelPosition) == null || i.call(e);
    });
  }
  dispose() {
    var e;
    super.dispose(), (e = this.instancedEdgeManager) == null || e.dispose(), this.instancedEdgeManager = null, this.edges.forEach((s) => s.dispose()), this.edges.clear();
  }
}
class Vn {
  constructor(t = {}) {
    g(this, "space", null);
    g(this, "nodesMap", /* @__PURE__ */ new Map());
    g(this, "edgesMap", /* @__PURE__ */ new Map());
    g(this, "worker", null);
    g(this, "isRunning", !1);
    g(this, "totalEnergy", 1 / 0);
    g(this, "settings", {
      repulsion: 3e3,
      centerStrength: 5e-4,
      damping: 0.92,
      minEnergyThreshold: 0.1,
      gravityCenter: new u.Vector3(0, 0, 0),
      zSpreadFactor: 0.15,
      autoStopDelay: 4e3,
      nodePadding: 1.2,
      defaultElasticStiffness: 1e-3,
      defaultElasticIdealLength: 200,
      defaultRigidStiffness: 0.1,
      defaultWeldStiffness: 0.5,
      enableClustering: !1,
      clusterAttribute: "clusterId",
      clusterStrength: 5e-3
    });
    this.settings = { ...this.settings, ...t }, this.worker = new Worker(new URL(
      /* @vite-ignore */
      "/assets/forceLayout.worker-BugFg3fl.js",
      import.meta.url
    ), { type: "module" }), this.worker.onmessage = this._handleWorkerMessage.bind(this), this.worker.onerror = (e) => {
      console.error("ForceLayout Worker Error:", e), this.isRunning = !1, this.space.emit("layout:error", { error: e });
    };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  _handleWorkerMessage(t) {
    const { type: e, positions: s, energy: i, error: n } = t.data;
    switch (e) {
      case "positionsUpdate":
        this.totalEnergy = i, s.forEach((o) => {
          const a = this.nodesMap.get(o.id);
          a == null || a.position.set(o.x, o.y, o.z);
        });
        break;
      case "stopped":
        this.isRunning = !1, this.totalEnergy = i, this.space.emit("layout:stopped", { name: "force (worker)" });
        break;
      case "error":
        console.error("ForceLayout Worker error:", n), this.space.emit("layout:error", { error: n });
        break;
    }
  }
  init(t, e, s = {}) {
    this.nodesMap.clear(), t.forEach((a) => this.nodesMap.set(a.id, a)), this.edgesMap.clear(), e.forEach((a) => this.edgesMap.set(a.id, a)), this.settings = { ...this.settings, ...s };
    const i = t.map((a) => {
      var r;
      return {
        id: a.id,
        x: a.position.x,
        y: a.position.y,
        z: a.position.z,
        vx: 0,
        vy: 0,
        vz: 0,
        mass: a.mass || 1,
        isFixed: a.isPinned,
        isPinned: a.isPinned,
        radius: a.getBoundingSphereRadius(),
        clusterId: (r = a.data) == null ? void 0 : r.clusterId
      };
    }), n = e.map((a) => ({
      sourceId: a.source.id,
      targetId: a.target.id,
      constraintType: a.data.constraintType,
      constraintParams: a.data.constraintParams
    })), o = this.settings.gravityCenter && typeof this.settings.gravityCenter.x == "number" ? { x: this.settings.gravityCenter.x, y: this.settings.gravityCenter.y, z: this.settings.gravityCenter.z } : { x: 0, y: 0, z: 0 };
    this.worker.postMessage({
      type: "init",
      payload: {
        nodes: i,
        edges: n,
        settings: { ...this.settings, gravityCenter: o }
      }
    });
  }
  isRunningCheck() {
    return this.isRunning;
  }
  getConfig() {
    return { ...this.settings };
  }
  setPinState(t, e) {
    this.nodesMap.has(t.id) && (t.isPinned = e, this.worker.postMessage({
      type: "updateNodeState",
      payload: { nodeId: t.id, isFixed: t.isPinned, isPinned: t.isPinned }
    }), this.isRunning && this.kick());
  }
  fixNode(t) {
    this.nodesMap.has(t.id) && this.worker.postMessage({
      type: "updateNodeState",
      payload: {
        nodeId: t.id,
        isFixed: !0,
        isPinned: t.isPinned,
        position: { x: t.position.x, y: t.position.y, z: t.position.z }
      }
    });
  }
  releaseNode(t) {
    this.nodesMap.has(t.id) && (t.isPinned || this.worker.postMessage({
      type: "updateNodeState",
      payload: { nodeId: t.id, isFixed: !1, isPinned: t.isPinned }
    }), this.kick());
  }
  addNode(t) {
    var e;
    this.nodesMap.has(t.id) || (this.nodesMap.set(t.id, t), this.worker.postMessage({
      type: "addNode",
      payload: {
        node: {
          id: t.id,
          x: t.position.x,
          y: t.position.y,
          z: t.position.z,
          vx: 0,
          vy: 0,
          vz: 0,
          mass: t.mass || 1,
          isFixed: t.isPinned,
          isPinned: t.isPinned,
          radius: t.getBoundingSphereRadius(),
          clusterId: (e = t.data) == null ? void 0 : e.clusterId
        }
      }
    }), (this.isRunning || this.nodesMap.size > 1) && this.kick());
  }
  removeNode(t) {
    this.nodesMap.has(t.id) && (this.nodesMap.delete(t.id), this.worker.postMessage({ type: "removeNode", payload: { nodeId: t.id } }), this.isRunning && this.nodesMap.size < 2 ? this.stop() : this.isRunning && this.kick());
  }
  addEdge(t) {
    this.edgesMap.has(t.id) || (this.edgesMap.set(t.id, t), this.worker.postMessage({
      type: "addEdge",
      payload: {
        edge: {
          id: t.id,
          sourceId: t.source.id,
          targetId: t.target.id,
          constraintType: t.data.constraintType,
          constraintParams: t.data.constraintParams
        }
      }
    }), this.isRunning && this.kick());
  }
  removeEdge(t) {
    this.edgesMap.has(t.id) && (this.edgesMap.delete(t.id), this.worker.postMessage({
      type: "removeEdge",
      payload: { sourceId: t.source.id, targetId: t.target.id }
    }), this.isRunning && this.kick());
  }
  runOnce() {
    this.isRunning || this.run();
  }
  run() {
    if (this.isRunning || this.nodesMap.size < 1) {
      this.isRunning && this.kick();
      return;
    }
    this.isRunning = !0, this.worker.postMessage({ type: "start" }), this.space.emit("layout:started", { name: "force (worker)" });
  }
  stop() {
    this.worker && this.worker.postMessage({ type: "stop" });
  }
  kick(t = 1) {
    this.nodesMap.size < 1 || !this.worker || (this.worker.postMessage({ type: "kick", payload: { intensity: t } }), this.isRunning || this.run());
  }
  setSettings(t) {
    this.settings = { ...this.settings, ...t };
    const e = this.settings.gravityCenter && typeof this.settings.gravityCenter.x == "number" ? { x: this.settings.gravityCenter.x, y: this.settings.gravityCenter.y, z: this.settings.gravityCenter.z } : { x: 0, y: 0, z: 0 };
    this.worker.postMessage({
      type: "updateSettings",
      payload: { settings: { ...this.settings, gravityCenter: e } }
    });
  }
  dispose() {
    this.worker && (this.worker.terminate(), this.worker = null), this.nodesMap.clear(), this.edgesMap.clear(), this.isRunning = !1, this.space = null;
  }
}
class Zn {
  constructor(t = {}) {
    g(this, "space", null);
    g(this, "pluginManager", null);
    g(this, "nodes", []);
    g(this, "settings", {
      columns: 0,
      padding: { x: 150, y: 150, z: 150 },
      plane: "xy",
      depthCount: 0,
      centerOrigin: !0,
      animate: !0
    });
    this.settings = { ...this.settings, ...t };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  updateConfig(t) {
    this.settings = { ...this.settings, ...t };
  }
  init(t, e, s = {}) {
    if (s && this.updateConfig(s), this.nodes = [...t], this.nodes.length === 0) return;
    const i = this.nodes.length;
    let { columns: n, padding: o, plane: a, depthCount: r, centerOrigin: l } = this.settings;
    o = typeof o == "number" ? { x: o, y: o, z: o } : o;
    let c = n;
    if (a === "xyz" && r > 0) {
      c <= 0 && (c = Math.ceil(Math.sqrt(i / r)));
      const d = Math.ceil(i / (c * r));
      let h = 0;
      for (let p = 0; p < r && h < i; p++)
        for (let f = 0; f < d && h < i; f++)
          for (let C = 0; C < c && h < i; C++)
            this.nodes[h++].position.set(C * o.x, f * o.y, p * o.z);
      if (l) {
        const p = (c - 1) * o.x, f = (d - 1) * o.y, C = (r - 1) * o.z;
        this.nodes.forEach((b) => {
          b.position.x -= p / 2, b.position.y -= f / 2, b.position.z -= C / 2;
        });
      }
    } else {
      c <= 0 && (c = Math.ceil(Math.sqrt(i)));
      const d = Math.ceil(i / c);
      let h = 0;
      for (let p = 0; p < d && h < i; p++)
        for (let f = 0; f < c && h < i; f++) {
          const C = this.nodes[h++];
          a === "xy" ? C.position.set(f * o.x, p * o.y, 0) : a === "xz" ? C.position.set(f * o.x, 0, p * o.z) : C.position.set(0, p * o.y, f * o.z);
        }
      if (l) {
        const p = (c - 1) * (a === "yz" ? o.z : o.x), f = (d - 1) * (a === "xz" ? o.z : o.y);
        this.nodes.forEach((C) => {
          a === "xy" ? (C.position.x -= p / 2, C.position.y -= f / 2) : a === "xz" ? (C.position.x -= p / 2, C.position.z -= f / 2) : (C.position.y -= f / 2, C.position.z -= p / 2);
        });
      }
    }
  }
  run() {
  }
  stop() {
  }
  addNode(t) {
  }
  removeNode(t) {
  }
  addEdge(t) {
  }
  removeEdge(t) {
  }
  dispose() {
    this.nodes = [], this.space = null, this.pluginManager = null;
  }
}
class Hn {
  constructor(t = {}) {
    g(this, "space", null);
    g(this, "pluginManager", null);
    g(this, "nodes", []);
    g(this, "settings", {
      radius: 200,
      plane: "xy",
      startAngle: 0,
      angularSpacing: 0,
      center: { x: 0, y: 0, z: 0 },
      animate: !0
    });
    this.settings = { ...this.settings, ...t };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  updateConfig(t) {
    this.settings = { ...this.settings, ...t };
  }
  init(t, e, s = {}) {
    if (s && this.updateConfig(s), this.nodes = [...t], this.nodes.length === 0) return;
    const i = this.nodes.length, { radius: n, plane: o, startAngle: a, center: r } = this.settings, l = this.settings.angularSpacing <= 0 ? 2 * Math.PI / i : this.settings.angularSpacing;
    let c = n;
    if (n <= 0) {
      let d = 0;
      this.nodes.forEach((h) => {
        var f;
        const p = ((f = h.getBoundingSphereRadius) == null ? void 0 : f.call(h)) || 25;
        d += p * 2 * 1.5;
      }), c = Math.max(100, d / (2 * Math.PI));
    }
    this.nodes.forEach((d, h) => {
      const p = a + h * l, f = r.x + c * Math.cos(p), C = r.y + c * Math.sin(p);
      o === "xy" ? d.position.set(f, C, r.z) : o === "xz" ? d.position.set(f, r.y, C) : d.position.set(r.x, f, C);
    });
  }
  run() {
  }
  stop() {
  }
  addNode(t) {
  }
  removeNode(t) {
  }
  addEdge(t) {
  }
  removeEdge(t) {
  }
  dispose() {
    this.nodes = [], this.space = null, this.pluginManager = null;
  }
}
class jn {
  constructor(t = {}) {
    g(this, "space", null);
    g(this, "pluginManager", null);
    g(this, "settings", {
      radius: 500,
      animate: !0,
      animationDuration: 0.7
    });
    this.settings = { ...this.settings, ...t };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  async init(t, e, s = {}) {
    if (s && this.updateConfig(s), !t || t.length === 0) return;
    const i = t.length, n = this.settings.radius, o = Math.PI * (Math.sqrt(5) - 1);
    t.forEach((a, r) => {
      if (a.isPinned) return;
      const l = 1 - r / (i - 1) * 2, c = Math.sqrt(1 - l * l), d = o * r, h = Math.cos(d) * c, p = Math.sin(d) * c;
      a.position.set(h * n, l * n, p * n);
    });
  }
  updateConfig(t) {
    this.settings = { ...this.settings, ...t };
  }
  run() {
  }
  stop() {
  }
  kick() {
  }
  addNode(t) {
  }
  removeNode(t) {
  }
  addEdge(t) {
  }
  removeEdge(t) {
  }
  dispose() {
    this.space = null, this.pluginManager = null;
  }
}
class Wn {
  constructor(t = {}) {
    g(this, "space", null);
    g(this, "pluginManager", null);
    g(this, "settings", {
      levelSeparation: 150,
      nodeSeparation: 100,
      orientation: "top-down",
      animate: !0,
      animationDuration: 0.7
    });
    g(this, "nodeMap", /* @__PURE__ */ new Map());
    this.settings = { ...this.settings, ...t };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  async init(t, e, s = {}) {
    if (s && this.updateConfig(s), !t || t.length === 0) return;
    this.nodeMap.clear(), t.forEach((o) => {
      var a;
      this.nodeMap.set(o.id, {
        node: o,
        id: o.id,
        children: [],
        parent: null,
        level: -1,
        x: 0,
        y: 0,
        width: ((a = o.getBoundingSphereRadius) == null ? void 0 : a.call(o)) * 2 || 100,
        prelim: 0,
        modifier: 0
      });
    }), e.forEach((o) => {
      const a = this.nodeMap.get(o.source.id), r = this.nodeMap.get(o.target.id);
      a && r && (a.children.push(r), r.parent = a);
    });
    const i = t.filter((o) => !this.nodeMap.get(o.id).parent && !o.isPinned);
    if (i.length === 0 && t.length > 0) {
      const o = t.find((a) => !a.isPinned);
      o && i.push(o);
    }
    let n = 0;
    i.forEach((o) => {
      this._firstPass(this.nodeMap.get(o.id), 0), this._secondPass(this.nodeMap.get(o.id), n, 0);
      const a = this._calculateTreeWidth(this.nodeMap.get(o.id));
      n += a + this.settings.nodeSeparation * 2;
    }), this.nodeMap.forEach((o) => {
      o.node.isPinned || o.node.position.set(o.x, o.y, 0);
    });
  }
  _firstPass(t, e) {
    if (t.level = e, t.y = -e * this.settings.levelSeparation, t.children.length === 0) {
      t.prelim = 0;
      return;
    }
    let s = t.children[0];
    t.children.forEach((o) => {
      this._firstPass(o, e + 1), s = this._apportion(o, s);
    });
    const i = t.children[0], n = t.children[t.children.length - 1];
    t.prelim = (i.prelim + n.prelim) / 2;
  }
  _apportion(t, e) {
    return e;
  }
  _secondPass(t, e, s) {
    t.x = e + t.prelim * this.settings.nodeSeparation;
    let i = e - (t.children.length - 1) * this.settings.nodeSeparation / 2;
    t.children.length === 1 && t.children[0].children.length === 0 && (i = t.x), t.children.forEach((n, o) => {
      this._secondPass(n, i + o * this.settings.nodeSeparation, 0);
    });
  }
  _calculateTreeWidth(t) {
    if (!t || t.children.length === 0) return (t == null ? void 0 : t.width) || this.settings.nodeSeparation;
    let e = 0;
    return t.children.forEach((s) => {
      e += this._calculateTreeWidth(s) + this.settings.nodeSeparation;
    }), Math.max(e, t.width);
  }
  updateConfig(t) {
    this.settings = { ...this.settings, ...t };
  }
  run() {
  }
  stop() {
  }
  kick() {
  }
  addNode(t) {
  }
  removeNode(t) {
  }
  addEdge(t) {
  }
  removeEdge(t) {
  }
  dispose() {
    this.space = null, this.pluginManager = null, this.nodeMap.clear();
  }
}
class At {
  constructor(t = {}) {
    g(this, "space", null);
    g(this, "pluginManager", null);
    g(this, "settings", {
      padding: 10,
      // Padding between treemap cells
      areaProperty: "size",
      // Property of node.data to determine area
      plane: "xy",
      // 'xy', 'xz', 'yz'
      depth: 0,
      // Fixed depth for all items if not using 3D treemap
      centerOrigin: !0,
      // Center the entire treemap around (0,0,0)
      width: 1e3,
      // Total width of the treemap area
      height: 800
      // Total height of the treemap area
    });
    this.settings = { ...this.settings, ...t };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  updateConfig(t) {
    this.settings = { ...this.settings, ...t };
  }
  init(t, e, s = {}) {
    if (s && this.updateConfig(s), !t || t.length === 0) return;
    const i = t.filter((v) => !v.isPinned);
    if (i.length === 0) return;
    const { padding: n, plane: o, depth: a, centerOrigin: r, width: l, height: c } = this.settings;
    let d = 0;
    i.forEach((v) => {
      const I = v.data[this.settings.areaProperty] || 1;
      v._treemapArea = I, d += I;
    }), i.sort((v, I) => I._treemapArea - v._treemapArea);
    const h = { x: 0, y: 0, width: l, height: c };
    this._squarify(i, h, d, n);
    let p = 1 / 0, f = 1 / 0, C = 1 / 0, b = -1 / 0, y = -1 / 0, w = -1 / 0;
    if (i.forEach((v) => {
      var ne, oe, Nt;
      const { x: I, y: x, width: A, height: E } = v._treemapRect;
      let N, P, B;
      o === "xy" ? (N = I + A / 2, P = x + E / 2, B = a) : o === "xz" ? (N = I + A / 2, P = a, B = x + E / 2) : (N = a, P = I + A / 2, B = x + E / 2), v.position.set(N, P, B), v.setSize ? v.setSize(A - n, E - n, !1) : (ne = v.mesh) != null && ne.scale && v.mesh.scale.set(A - n, E - n, v.mesh.scale.z || 1), p = Math.min(p, N - A / 2), f = Math.min(f, P - E / 2), C = Math.min(C, B - (((oe = v.mesh) == null ? void 0 : oe.scale.z) || 1) / 2), b = Math.max(b, N + A / 2), y = Math.max(y, P + E / 2), w = Math.max(w, B + (((Nt = v.mesh) == null ? void 0 : Nt.scale.z) || 1) / 2);
    }), r && i.length > 0) {
      const v = (p + b) / 2, I = (f + y) / 2, x = (C + w) / 2;
      i.forEach((A) => {
        A.position.x -= v, A.position.y -= I, A.position.z -= x;
      });
    }
  }
  // Squarified Treemap Algorithm (simplified for demonstration)
  // This is a recursive function that attempts to make rectangles as square as possible.
  _squarify(t, e, s, i) {
    if (t.length === 0) return;
    if (t.length === 1) {
      t[0]._treemapRect = {
        x: e.x + i / 2,
        y: e.y + i / 2,
        width: e.width - i,
        height: e.height - i
      };
      return;
    }
    let n = [], o = 0, a = 1 / 0, r = 0;
    for (let h = 0; h < t.length; h++) {
      n.push(t[h]), o += t[h]._treemapArea;
      const p = this._calculateRowRatio(n, o, e.width, e.height);
      if (p < a)
        a = p, r = h + 1;
      else {
        n.pop(), o -= t[h]._treemapArea;
        break;
      }
    }
    const l = t.slice(0, r), c = t.slice(r);
    this._layoutRow(l, e, o, s, i);
    const d = { ...e };
    e.width > e.height ? (d.x += l[0]._treemapRect.width + i, d.width -= l[0]._treemapRect.width + i) : (d.y += l[0]._treemapRect.height + i, d.height -= l[0]._treemapRect.height + i), this._squarify(c, d, s - o, i);
  }
  _calculateRowRatio(t, e, s, i) {
    if (t.length === 0 || e === 0) return 1 / 0;
    const n = Math.min(...t.map((c) => c._treemapArea)), o = Math.max(...t.map((c) => c._treemapArea)), a = Math.min(s, i), r = a * e / (n * totalArea), l = o * totalArea / (a * e);
    return Math.max(r, l);
  }
  _layoutRow(t, e, s, i, n) {
    const o = e.width > e.height, a = o ? e.width : e.height, r = o ? e.height : e.width;
    let l = 0;
    t.forEach((c) => {
      const d = c._treemapArea / s * a, h = r;
      o ? c._treemapRect = {
        x: e.x + l,
        y: e.y,
        width: d,
        height: h
      } : c._treemapRect = {
        x: e.x,
        y: e.y + l,
        width: h,
        height: d
      }, l += d;
    });
  }
  run() {
  }
  stop() {
  }
  update() {
  }
  addNode(t) {
  }
  removeNode(t) {
  }
  addEdge(t) {
  }
  removeEdge(t) {
  }
  kick() {
  }
  dispose() {
    this.space = null, this.pluginManager = null;
  }
}
g(At, "layoutName", "treemap");
class St {
  constructor(t = {}) {
    g(this, "space", null);
    g(this, "pluginManager", null);
    g(this, "settings", {
      centerNodeId: null,
      // ID of the node to be the center, or null for geometric center
      radiusIncrement: 150,
      // Distance between concentric circles
      angularSeparationMin: Math.PI / 12,
      // Minimum angular separation for nodes on the same circle
      plane: "xy",
      // 'xy', 'xz', 'yz'
      startRadius: 100,
      // Radius of the first circle (if centerNodeId is null or center is geometric)
      levelSpacingFactor: 1,
      // Multiplier for radiusIncrement based on level
      animate: !0,
      animationDuration: 0.7
    });
    this.settings = { ...this.settings, ...t };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  updateConfig(t) {
    this.settings = { ...this.settings, ...t };
  }
  init(t, e, s = {}) {
    var w;
    if (s && this.updateConfig(s), !t || t.length === 0) return;
    const { centerNodeId: i, radiusIncrement: n, plane: o, startRadius: a, levelSpacingFactor: r } = this.settings, l = new u.Vector3(0, 0, 0);
    let c = null, d = t.filter((v) => !v.isPinned);
    if (i && (c = t.find((v) => v.id === i), c ? (c.position.copy(l), d = d.filter((v) => v.id !== c.id)) : console.warn(`RadialLayout: Center node with ID "${i}" not found. Using geometric center.`)), d.length === 0) return;
    const h = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Map();
    t.forEach((v) => {
      p.set(v.id, /* @__PURE__ */ new Set()), h.set(v.id, -1);
    }), e.forEach((v) => {
      var I, x;
      (I = p.get(v.source.id)) == null || I.add(v.target.id), (x = p.get(v.target.id)) == null || x.add(v.source.id);
    });
    const f = [];
    if (c)
      f.push(c.id), h.set(c.id, 0);
    else {
      const v = d[0];
      v && (f.push(v.id), h.set(v.id, 0));
    }
    let C = 0;
    for (; C < f.length; ) {
      const v = f[C++], I = h.get(v);
      (w = p.get(v)) == null || w.forEach((x) => {
        h.get(x) === -1 && (h.set(x, I + 1), f.push(x));
      });
    }
    const b = /* @__PURE__ */ new Map();
    d.forEach((v) => {
      const I = h.get(v.id) || 0;
      b.has(I) || b.set(I, []), b.get(I).push(v);
    }), Array.from(b.keys()).sort((v, I) => v - I).forEach((v) => {
      const I = b.get(v);
      if (I.length === 0) return;
      const x = a + v * n * r, A = 2 * Math.PI / I.length;
      I.forEach((E, N) => {
        const P = N * A;
        let B, ne, oe;
        o === "xy" ? (B = l.x + x * Math.cos(P), ne = l.y + x * Math.sin(P), oe = l.z) : o === "xz" ? (B = l.x + x * Math.cos(P), ne = l.y, oe = l.z + x * Math.sin(P)) : (B = l.x, ne = l.y + x * Math.cos(P), oe = l.z + x * Math.sin(P)), E.position.set(B, ne, oe);
      });
    });
  }
  run() {
  }
  stop() {
  }
  update() {
  }
  addNode(t) {
  }
  removeNode(t) {
  }
  addEdge(t) {
  }
  removeEdge(t) {
  }
  kick() {
  }
  dispose() {
    this.space = null, this.pluginManager = null;
  }
}
g(St, "layoutName", "radial");
class Un {
  constructor(t, e) {
    this.space = t, this.pluginManager = e, this.layouts = /* @__PURE__ */ new Map(), this.activeLayout = null, this.activeLayoutName = null;
  }
  registerLayout(t, e) {
    var s;
    this.layouts.has(t) && console.warn(`LayoutManager: Layout "${t}" already registered. Overwriting.`), (s = e.setContext) == null || s.call(e, this.space, this.pluginManager), this.layouts.set(t, e);
  }
  async applyLayout(t, e = {}) {
    var r, l, c, d;
    const s = this.layouts.get(t);
    if (!s)
      return console.error(`LayoutManager: Layout "${t}" not found.`), !1;
    (l = (r = this.activeLayout) == null ? void 0 : r.stop) == null || l.call(r), this.activeLayout && this.space.emit("layout:stopped", { name: this.activeLayoutName, layout: this.activeLayout }), this.activeLayout = s, this.activeLayoutName = t, (d = (c = this.activeLayout).updateConfig) == null || d.call(c, e);
    const i = this.pluginManager.getPlugin("NodePlugin"), n = this.pluginManager.getPlugin("EdgePlugin"), o = i ? [...i.getNodes().values()] : [], a = n ? [...n.getEdges().values()] : [];
    if (this.activeLayout.init) {
      const h = new Map(o.map((p) => [p.id, p.position.clone()]));
      await this.activeLayout.init(o, a, e), await Promise.all(o.map((p) => {
        const f = h.get(p.id), C = p.position;
        return p.position.copy(f), new Promise((b) => {
          z.to(p.position, {
            x: C.x,
            y: C.y,
            z: C.z,
            duration: 0.7,
            ease: "power2.inOut",
            overwrite: !0,
            onComplete: b
          });
        });
      }));
    }
    return this.activeLayout.run && (this.space.emit("layout:started", { name: this.activeLayoutName, layout: this.activeLayout }), await this.activeLayout.run()), !0;
  }
  stopLayout() {
    var t, e;
    (e = (t = this.activeLayout) == null ? void 0 : t.stop) == null || e.call(t), this.activeLayout && this.space.emit("layout:stopped", { name: this.activeLayoutName, layout: this.activeLayout });
  }
  update() {
    var t, e;
    (e = (t = this.activeLayout) == null ? void 0 : t.update) == null || e.call(t);
  }
  addNodeToLayout(t) {
    var e, s;
    (s = (e = this.activeLayout) == null ? void 0 : e.addNode) == null || s.call(e, t);
  }
  removeNodeFromLayout(t) {
    var e, s;
    (s = (e = this.activeLayout) == null ? void 0 : e.removeNode) == null || s.call(e, t);
  }
  addEdgeToLayout(t) {
    var e, s;
    (s = (e = this.activeLayout) == null ? void 0 : e.addEdge) == null || s.call(e, t);
  }
  removeEdgeFromLayout(t) {
    var e, s;
    (s = (e = this.activeLayout) == null ? void 0 : e.removeEdge) == null || s.call(e, t);
  }
  kick() {
    var t, e;
    (e = (t = this.activeLayout) == null ? void 0 : t.kick) == null || e.call(t);
  }
  getActiveLayout() {
    return this.activeLayout;
  }
  getActiveLayoutName() {
    return this.activeLayoutName;
  }
  dispose() {
    this.stopLayout(), this.layouts.forEach((t) => {
      var e;
      return (e = t.dispose) == null ? void 0 : e.call(t);
    }), this.layouts.clear(), this.activeLayout = null, this.activeLayoutName = null, this.space = null, this.pluginManager = null;
  }
}
class Kn {
  constructor(t = {}) {
    g(this, "space", null);
    g(this, "pluginManager", null);
    g(this, "settings", {
      iterations: 100,
      convergenceThreshold: 0.1,
      dampingFactor: 0.8,
      maxForce: 1e3,
      enableCollisionAvoidance: !0,
      collisionPadding: 50,
      animate: !0,
      animationDuration: 0.8
    });
    g(this, "nodeMap", /* @__PURE__ */ new Map());
    g(this, "constraints", []);
    g(this, "isRunning", !1);
    this.settings = { ...this.settings, ...t };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  async init(t, e, s = {}) {
    s && this.updateConfig(s), !(!t || t.length === 0) && (this.nodeMap.clear(), this.constraints = [], t.forEach((i) => {
      var n;
      this.nodeMap.set(i.id, {
        node: i,
        currentPos: i.position.clone(),
        targetPos: i.position.clone(),
        force: new u.Vector3(),
        mass: i.mass || 1,
        radius: ((n = i.getBoundingSphereRadius) == null ? void 0 : n.call(i)) * 2 || 50,
        isFixed: i.isPinned || !1
      });
    }), this._createDefaultConstraints(t, e), await this._solveConstraints());
  }
  _createDefaultConstraints(t, e) {
    e.forEach((i) => {
      var n, o, a, r;
      this.addDistanceConstraint(i.source.id, i.target.id, {
        distance: ((o = (n = i.data) == null ? void 0 : n.constraintParams) == null ? void 0 : o.idealLength) || 200,
        strength: ((r = (a = i.data) == null ? void 0 : a.constraintParams) == null ? void 0 : r.stiffness) || 0.5
      });
    }), this._detectGroups(t).forEach((i) => {
      i.length > 1 && this.addClusterConstraint(i.map((n) => n.id), {
        centerStrength: 0.3,
        internalSeparation: 100
      });
    });
  }
  _detectGroups(t) {
    const e = [], s = /* @__PURE__ */ new Set();
    return t.forEach((i) => {
      var n;
      if (!s.has(i.id) && ((n = i.data) != null && n.group)) {
        const o = t.filter((a) => {
          var r;
          return ((r = a.data) == null ? void 0 : r.group) === i.data.group;
        });
        o.forEach((a) => s.add(a.id)), e.push(o);
      }
    }), e;
  }
  addDistanceConstraint(t, e, s = {}) {
    const { distance: i = 200, strength: n = 0.5, minDistance: o = 50, maxDistance: a = 500 } = s;
    this.constraints.push({
      type: "distance",
      nodeIds: [t, e],
      distance: i,
      strength: n,
      minDistance: o,
      maxDistance: a,
      solve: this._solveDistanceConstraint.bind(this)
    });
  }
  addPositionConstraint(t, e, s = {}) {
    const { strength: i = 1, tolerance: n = 10 } = s;
    this.constraints.push({
      type: "position",
      nodeIds: [t],
      targetPosition: e.clone(),
      strength: i,
      tolerance: n,
      solve: this._solvePositionConstraint.bind(this)
    });
  }
  addAngleConstraint(t, e, s, i = {}) {
    const { angle: n = Math.PI / 2, strength: o = 0.3 } = i;
    this.constraints.push({
      type: "angle",
      nodeIds: [t, e, s],
      angle: n,
      strength: o,
      solve: this._solveAngleConstraint.bind(this)
    });
  }
  addClusterConstraint(t, e = {}) {
    const { centerStrength: s = 0.5, internalSeparation: i = 100 } = e;
    this.constraints.push({
      type: "cluster",
      nodeIds: t,
      centerStrength: s,
      internalSeparation: i,
      solve: this._solveClusterConstraint.bind(this)
    });
  }
  addBoundaryConstraint(t, e, s = {}) {
    const { strength: i = 0.8, padding: n = 20 } = s;
    this.constraints.push({
      type: "boundary",
      nodeIds: t,
      boundary: e,
      strength: i,
      padding: n,
      solve: this._solveBoundaryConstraint.bind(this)
    });
  }
  _solveDistanceConstraint(t) {
    const [e, s] = t.nodeIds, i = this.nodeMap.get(e), n = this.nodeMap.get(s);
    if (!i || !n) return;
    const o = n.currentPos.clone().sub(i.currentPos), a = o.length();
    if (a === 0) return;
    const r = Math.max(
      t.minDistance,
      Math.min(t.maxDistance, t.distance)
    ), l = a - r, c = o.normalize().multiplyScalar(l * t.strength * 0.5);
    i.isFixed || i.force.add(c.clone().multiplyScalar(n.mass / (i.mass + n.mass))), n.isFixed || n.force.sub(c.clone().multiplyScalar(i.mass / (i.mass + n.mass)));
  }
  _solvePositionConstraint(t) {
    const e = this.nodeMap.get(t.nodeIds[0]);
    if (!e || e.isFixed) return;
    const s = t.targetPosition.clone().sub(e.currentPos);
    s.length() > t.tolerance && e.force.add(s.multiplyScalar(t.strength));
  }
  _solveAngleConstraint(t) {
    const [e, s, i] = t.nodeIds, n = this.nodeMap.get(e), o = this.nodeMap.get(s), a = this.nodeMap.get(i);
    if (!n || !o || !a) return;
    const r = n.currentPos.clone().sub(o.currentPos), l = a.currentPos.clone().sub(o.currentPos);
    if (r.length() === 0 || l.length() === 0) return;
    const c = r.angleTo(l), h = (t.angle - c) * t.strength * 0.1, p = r.cross(l).normalize();
    if (!n.isFixed) {
      const f = r.clone().applyAxisAngle(p, h);
      n.force.add(f.sub(r).multiplyScalar(0.5));
    }
    if (!a.isFixed) {
      const f = l.clone().applyAxisAngle(p, -h);
      a.force.add(f.sub(l).multiplyScalar(0.5));
    }
  }
  _solveClusterConstraint(t) {
    const e = t.nodeIds.map((i) => this.nodeMap.get(i)).filter(Boolean);
    if (e.length < 2) return;
    const s = new u.Vector3();
    e.forEach((i) => s.add(i.currentPos)), s.divideScalar(e.length), e.forEach((i) => {
      if (i.isFixed) return;
      const n = s.clone().sub(i.currentPos);
      i.force.add(n.multiplyScalar(t.centerStrength)), e.forEach((o) => {
        if (o === i) return;
        const a = i.currentPos.clone().sub(o.currentPos), r = a.length();
        if (r < t.internalSeparation && r > 0) {
          const l = a.normalize().multiplyScalar(
            (t.internalSeparation - r) * 0.1
          );
          i.force.add(l);
        }
      });
    });
  }
  _solveBoundaryConstraint(t) {
    t.nodeIds.forEach((e) => {
      const s = this.nodeMap.get(e);
      if (!s || s.isFixed) return;
      const { boundary: i, strength: n, padding: o } = t, a = s.currentPos;
      let r = new u.Vector3();
      if (i.type === "box") {
        const { min: l, max: c } = i;
        a.x < l.x + o && (r.x = (l.x + o - a.x) * n), a.x > c.x - o && (r.x = (c.x - o - a.x) * n), a.y < l.y + o && (r.y = (l.y + o - a.y) * n), a.y > c.y - o && (r.y = (c.y - o - a.y) * n), a.z < l.z + o && (r.z = (l.z + o - a.z) * n), a.z > c.z - o && (r.z = (c.z - o - a.z) * n);
      } else if (i.type === "sphere") {
        const { center: l, radius: c } = i, d = a.clone().sub(l), h = d.length();
        h > c - o && (r = d.normalize().multiplyScalar((c - o - h) * n));
      }
      s.force.add(r);
    });
  }
  async _solveConstraints() {
    for (let t = 0; t < this.settings.iterations; t++) {
      this.nodeMap.forEach((s) => s.force.set(0, 0, 0)), this.constraints.forEach((s) => s.solve(s)), this.settings.enableCollisionAvoidance && this._resolveCollisions();
      let e = 0;
      if (this.nodeMap.forEach((s) => {
        if (s.isFixed) return;
        const i = s.force.clone().multiplyScalar(this.settings.dampingFactor);
        i.length() > this.settings.maxForce && i.normalize().multiplyScalar(this.settings.maxForce), s.currentPos.add(i.divideScalar(s.mass)), e = Math.max(e, i.length());
      }), e < this.settings.convergenceThreshold)
        break;
    }
    this.nodeMap.forEach((t) => {
      t.isFixed || t.node.position.copy(t.currentPos);
    });
  }
  _resolveCollisions() {
    const t = Array.from(this.nodeMap.values());
    for (let e = 0; e < t.length; e++)
      for (let s = e + 1; s < t.length; s++) {
        const i = t[e], n = t[s], o = i.currentPos.clone().sub(n.currentPos), a = o.length(), r = i.radius + n.radius + this.settings.collisionPadding;
        if (a < r && a > 0) {
          const l = r - a, c = o.normalize().multiplyScalar(l * 0.5);
          i.isFixed || i.force.add(c), n.isFixed || n.force.sub(c);
        }
      }
  }
  addNode(t) {
    var e;
    this.nodeMap.has(t.id) || this.nodeMap.set(t.id, {
      node: t,
      currentPos: t.position.clone(),
      targetPos: t.position.clone(),
      force: new u.Vector3(),
      mass: t.mass || 1,
      radius: ((e = t.getBoundingSphereRadius) == null ? void 0 : e.call(t)) * 2 || 50,
      isFixed: t.isPinned || !1
    });
  }
  removeNode(t) {
    this.nodeMap.delete(t.id), this.constraints = this.constraints.filter(
      (e) => !e.nodeIds.includes(t.id)
    );
  }
  addEdge(t) {
    var e, s, i, n;
    this.addDistanceConstraint(t.source.id, t.target.id, {
      distance: ((s = (e = t.data) == null ? void 0 : e.constraintParams) == null ? void 0 : s.idealLength) || 200,
      strength: ((n = (i = t.data) == null ? void 0 : i.constraintParams) == null ? void 0 : n.stiffness) || 0.5
    });
  }
  removeEdge(t) {
    this.constraints = this.constraints.filter(
      (e) => !(e.type === "distance" && e.nodeIds.includes(t.source.id) && e.nodeIds.includes(t.target.id))
    );
  }
  updateConfig(t) {
    this.settings = { ...this.settings, ...t };
  }
  run() {
    this.isRunning || (this.isRunning = !0);
  }
  stop() {
    this.isRunning = !1;
  }
  kick() {
    this.nodeMap.size > 0 && this._solveConstraints();
  }
  dispose() {
    this.space = null, this.pluginManager = null, this.nodeMap.clear(), this.constraints = [], this.isRunning = !1;
  }
}
class $n {
  constructor(t = {}) {
    g(this, "space", null);
    g(this, "pluginManager", null);
    g(this, "settings", {
      containerPadding: 50,
      childSpacing: 25,
      autoResize: !0,
      animate: !0,
      animationDuration: 0.8,
      recursionDepth: 10,
      defaultChildLayout: "grid"
    });
    g(this, "rootContainers", /* @__PURE__ */ new Map());
    g(this, "layoutInstances", /* @__PURE__ */ new Map());
    g(this, "containerHierarchy", /* @__PURE__ */ new Map());
    g(this, "isRunning", !1);
    this.settings = { ...this.settings, ...t };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  async init(t, e, s = {}) {
    s && this.updateConfig(s), !(!t || t.length === 0) && (this.rootContainers.clear(), this.layoutInstances.clear(), this.containerHierarchy.clear(), this._buildHierarchy(t, e), await this._applyNestedLayouts());
  }
  _buildHierarchy(t, e) {
    const s = t.filter((n) => {
      var o, a;
      return ((o = n.data) == null ? void 0 : o.isContainer) || ((a = n.data) == null ? void 0 : a.childLayout);
    }), i = /* @__PURE__ */ new Map();
    s.forEach((n) => {
      var o, a;
      i.set(n.id, []), this.containerHierarchy.set(n.id, {
        container: n,
        children: [],
        childNodes: [],
        layout: ((o = n.data) == null ? void 0 : o.childLayout) || this.settings.defaultChildLayout,
        layoutConfig: ((a = n.data) == null ? void 0 : a.layoutConfig) || {},
        bounds: this._calculateContainerBounds(n)
      });
    }), e.forEach((n) => {
      var a;
      const o = this.containerHierarchy.get(n.source.id);
      if (this.containerHierarchy.get(n.target.id), o && ((a = n.data) == null ? void 0 : a.relationship) === "contains") {
        o.childNodes.push(n.target);
        const r = this.containerHierarchy.get(n.target.id);
        r && o.children.push(r);
      }
    }), t.forEach((n) => {
      var a;
      const o = (a = n.data) == null ? void 0 : a.parentContainer;
      o && this.containerHierarchy.has(o) && this.containerHierarchy.get(o).childNodes.push(n);
    }), this.containerHierarchy.forEach((n, o) => {
      this._hasParentContainer(o) || this.rootContainers.set(o, n);
    });
  }
  _hasParentContainer(t) {
    for (const [, e] of this.containerHierarchy)
      if (e.children.some((s) => s.container.id === t))
        return !0;
    return !1;
  }
  _calculateContainerBounds(t) {
    var i;
    const e = ((i = t.getBoundingSphereRadius) == null ? void 0 : i.call(t)) || 100, s = t.position.clone();
    return {
      min: s.clone().sub(new u.Vector3(e, e, e)),
      max: s.clone().add(new u.Vector3(e, e, e)),
      center: s,
      size: new u.Vector3(e * 2, e * 2, e * 2)
    };
  }
  async _applyNestedLayouts(t = 0) {
    if (t > this.settings.recursionDepth) return;
    const e = [];
    for (const [s, i] of this.containerHierarchy)
      if (i.childNodes.length > 0) {
        const n = this._applyContainerLayout(i, t);
        e.push(n);
      }
    await Promise.all(e), this.settings.autoResize && this._resizeContainers();
  }
  async _applyContainerLayout(t, e) {
    var p;
    const { container: s, childNodes: i, layout: n, layoutConfig: o } = t, a = `${s.id}_${n}`;
    let r = this.layoutInstances.get(a);
    r || (r = this._createLayoutInstance(n, o), (p = r.setContext) == null || p.call(r, this.space, this.pluginManager), this.layoutInstances.set(a, r));
    const l = this._calculateContainerBounds(s), c = this._calculateAvailableSpace(l), d = i.map((f) => ({
      ...f,
      position: this._normalizePositionToContainer(f.position, l)
    })), h = {
      ...o,
      bounds: c,
      containerCenter: l.center,
      maxWidth: c.size.x,
      maxHeight: c.size.y,
      maxDepth: c.size.z,
      spacing: this.settings.childSpacing
    };
    r.init && await r.init(d, [], h), d.forEach((f) => {
      const C = this._denormalizePositionFromContainer(f.position, l), b = i.find((y) => y.id === f.id);
      b && !b.isPinned && b.position.copy(C);
    }), t.appliedLayout = r, t.bounds = this._recalculateContainerBounds(t);
  }
  _createLayoutInstance(t, e) {
    switch (t) {
      case "grid":
        return new ls(e);
      case "circular":
        return new Xn(e);
      case "force":
        return new Yn(e);
      case "hierarchical":
        return new qn(e);
      case "flow":
        return new Jn(e);
      default:
        return new ls(e);
    }
  }
  _calculateAvailableSpace(t) {
    const e = this.settings.containerPadding;
    return {
      min: t.min.clone().add(new u.Vector3(e, e, e)),
      max: t.max.clone().sub(new u.Vector3(e, e, e)),
      center: t.center.clone(),
      size: t.size.clone().sub(new u.Vector3(e * 2, e * 2, e * 2))
    };
  }
  _normalizePositionToContainer(t, e) {
    const s = t.clone().sub(e.center);
    return s.divide(e.size).multiplyScalar(2), s;
  }
  _denormalizePositionFromContainer(t, e) {
    const s = t.clone().multiplyScalar(0.5);
    return s.multiply(e.size).add(e.center), s;
  }
  _recalculateContainerBounds(t) {
    const { childNodes: e } = t;
    if (e.length === 0) return t.bounds;
    const s = e.map((a) => a.position), i = new u.Vector3(
      Math.min(...s.map((a) => a.x)),
      Math.min(...s.map((a) => a.y)),
      Math.min(...s.map((a) => a.z))
    ), n = new u.Vector3(
      Math.max(...s.map((a) => a.x)),
      Math.max(...s.map((a) => a.y)),
      Math.max(...s.map((a) => a.z))
    ), o = this.settings.containerPadding;
    return i.sub(new u.Vector3(o, o, o)), n.add(new u.Vector3(o, o, o)), {
      min: i,
      max: n,
      center: i.clone().add(n).multiplyScalar(0.5),
      size: n.clone().sub(i)
    };
  }
  _resizeContainers() {
    this.containerHierarchy.forEach((t, e) => {
      var n;
      const { container: s, bounds: i } = t;
      if (((n = s.data) == null ? void 0 : n.autoResize) !== !1) {
        const o = i.size.clone().multiplyScalar(0.5);
        s.scale && s.scale.copy(o), s.position.copy(i.center);
      }
    });
  }
  addContainer(t, e = null) {
    var i, n;
    const s = {
      container: t,
      children: [],
      childNodes: [],
      layout: ((i = t.data) == null ? void 0 : i.childLayout) || this.settings.defaultChildLayout,
      layoutConfig: ((n = t.data) == null ? void 0 : n.layoutConfig) || {},
      bounds: this._calculateContainerBounds(t)
    };
    this.containerHierarchy.set(t.id, s), e && this.containerHierarchy.has(e) ? this.containerHierarchy.get(e).children.push(s) : this.rootContainers.set(t.id, s);
  }
  removeContainer(t) {
    this.containerHierarchy.get(t) && (this.containerHierarchy.delete(t), this.rootContainers.delete(t), this.containerHierarchy.forEach((s) => {
      s.children = s.children.filter((i) => i.container.id !== t);
    }), this.layoutInstances.forEach((s, i) => {
      var n;
      i.startsWith(`${t}_`) && ((n = s.dispose) == null || n.call(s), this.layoutInstances.delete(i));
    }));
  }
  addNodeToContainer(t, e) {
    const s = this.containerHierarchy.get(e);
    s && (s.childNodes.some((i) => i.id === t.id) || (s.childNodes.push(t), t.data = t.data || {}, t.data.parentContainer = e));
  }
  removeNodeFromContainer(t, e) {
    const s = this.containerHierarchy.get(e);
    s && (s.childNodes = s.childNodes.filter((i) => i.id !== t.id), t.data && delete t.data.parentContainer);
  }
  setContainerLayout(t, e, s = {}) {
    var a;
    const i = this.containerHierarchy.get(t);
    if (!i) return;
    i.layout = e, i.layoutConfig = s;
    const n = `${t}_${i.layout}`, o = this.layoutInstances.get(n);
    o && ((a = o.dispose) == null || a.call(o), this.layoutInstances.delete(n));
  }
  updateConfig(t) {
    this.settings = { ...this.settings, ...t };
  }
  run() {
    this.isRunning || (this.isRunning = !0, this._applyNestedLayouts());
  }
  stop() {
    this.isRunning = !1;
  }
  kick() {
    this.containerHierarchy.size > 0 && this._applyNestedLayouts();
  }
  addNode(t) {
    var s;
    const e = (s = t.data) == null ? void 0 : s.parentContainer;
    e && this.addNodeToContainer(t, e);
  }
  removeNode(t) {
    var s;
    const e = (s = t.data) == null ? void 0 : s.parentContainer;
    e && this.removeNodeFromContainer(t, e);
  }
  addEdge(t) {
    var e;
    ((e = t.data) == null ? void 0 : e.relationship) === "contains" && this.addNodeToContainer(t.target, t.source.id);
  }
  removeEdge(t) {
    var e;
    ((e = t.data) == null ? void 0 : e.relationship) === "contains" && this.removeNodeFromContainer(t.target, t.source.id);
  }
  dispose() {
    this.layoutInstances.forEach((t) => {
      var e;
      return (e = t.dispose) == null ? void 0 : e.call(t);
    }), this.layoutInstances.clear(), this.containerHierarchy.clear(), this.rootContainers.clear(), this.space = null, this.pluginManager = null, this.isRunning = !1;
  }
}
class ls {
  constructor(t = {}) {
    this.settings = {
      columns: t.columns || "auto",
      rows: t.rows || "auto",
      spacing: t.spacing || 50,
      alignment: t.alignment || "center",
      ...t
    };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  async init(t, e, s = {}) {
    const i = { ...this.settings, ...s }, n = t.length;
    if (n === 0) return;
    let o = i.columns, a = i.rows;
    o === "auto" && a === "auto" ? (o = Math.ceil(Math.sqrt(n)), a = Math.ceil(n / o)) : o === "auto" ? o = Math.ceil(n / a) : a === "auto" && (a = Math.ceil(n / o));
    const r = s.bounds || { size: new u.Vector3(500, 500, 0) }, l = r.size.x / o, c = r.size.y / a, d = -(r.size.x / 2) + l / 2, h = r.size.y / 2 - c / 2;
    t.forEach((p, f) => {
      const C = f % o, b = Math.floor(f / o), y = d + C * l, w = h - b * c;
      p.isPinned || p.position.set(y, w, 0);
    });
  }
  dispose() {
    this.space = null, this.pluginManager = null;
  }
}
class Xn {
  constructor(t = {}) {
    this.settings = {
      radius: t.radius || 200,
      startAngle: t.startAngle || 0,
      ...t
    };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  async init(t, e, s = {}) {
    const i = { ...this.settings, ...s }, n = t.length;
    if (n === 0) return;
    const o = s.bounds || { size: new u.Vector3(400, 400, 0) }, a = Math.min(o.size.x, o.size.y) * 0.4, r = 2 * Math.PI / n;
    t.forEach((l, c) => {
      const d = i.startAngle + c * r, h = Math.cos(d) * a, p = Math.sin(d) * a;
      l.isPinned || l.position.set(h, p, 0);
    });
  }
  dispose() {
    this.space = null, this.pluginManager = null;
  }
}
class Yn {
  constructor(t = {}) {
    this.settings = {
      iterations: t.iterations || 50,
      repulsion: t.repulsion || 1e3,
      attraction: t.attraction || 0.01,
      ...t
    };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  async init(t, e, s = {}) {
    const i = s.bounds || { size: new u.Vector3(400, 400, 0) };
    for (let n = 0; n < this.settings.iterations; n++)
      t.forEach((o, a) => {
        if (o.isPinned) return;
        let r = new u.Vector3();
        t.forEach((d, h) => {
          if (a === h) return;
          const p = o.position.clone().sub(d.position), f = p.length();
          f > 0 && r.add(p.normalize().multiplyScalar(this.settings.repulsion / (f * f)));
        });
        const l = Math.min(i.size.x, i.size.y) * 0.4, c = o.position.length();
        if (c > l) {
          const d = o.position.clone().normalize().multiplyScalar(-this.settings.attraction * c);
          r.add(d);
        }
        o.position.add(r.multiplyScalar(0.01));
      });
  }
  dispose() {
    this.space = null, this.pluginManager = null;
  }
}
class qn {
  constructor(t = {}) {
    this.settings = {
      levelSeparation: t.levelSeparation || 100,
      nodeSeparation: t.nodeSeparation || 80,
      ...t
    };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  async init(t, e, s = {}) {
    s.bounds || new u.Vector3(400, 400, 0);
    const i = Math.ceil(Math.sqrt(t.length)), n = Math.ceil(t.length / i);
    t.forEach((o, a) => {
      if (o.isPinned) return;
      const r = Math.floor(a / n), c = (a % n - (n - 1) / 2) * this.settings.nodeSeparation, d = (r - (i - 1) / 2) * this.settings.levelSeparation;
      o.position.set(c, d, 0);
    });
  }
  dispose() {
    this.space = null, this.pluginManager = null;
  }
}
class Jn {
  constructor(t = {}) {
    this.settings = {
      direction: t.direction || "horizontal",
      spacing: t.spacing || 50,
      wrap: t.wrap || !0,
      ...t
    };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  async init(t, e, s = {}) {
    const i = { ...this.settings, ...s }, n = s.bounds || { size: new u.Vector3(400, 400, 0) };
    let o = -n.size.x / 2, a = n.size.y / 2, r = 0;
    t.forEach((l, c) => {
      var h;
      if (l.isPinned) return;
      const d = ((h = l.getBoundingSphereRadius) == null ? void 0 : h.call(l)) * 2 || 50;
      i.direction === "horizontal" ? (i.wrap && o + d > n.size.x / 2 && (o = -n.size.x / 2, a -= r + i.spacing, r = 0), l.position.set(o + d / 2, a - d / 2, 0), o += d + i.spacing, r = Math.max(r, d)) : (l.position.set(0, a - d / 2, 0), a -= d + i.spacing);
    });
  }
  dispose() {
    this.space = null, this.pluginManager = null;
  }
}
class Qn {
  constructor(t = {}) {
    g(this, "space", null);
    g(this, "pluginManager", null);
    g(this, "settings", {
      connectionTypes: ["direct", "orthogonal", "curved", "bundled"],
      defaultConnectionType: "curved",
      routingPadding: 30,
      bundlingThreshold: 3,
      bundlingRadius: 50,
      animate: !0,
      animationDuration: 0.6,
      avoidOverlaps: !0,
      maxDetourFactor: 2,
      connectionStrength: 0.5
    });
    g(this, "connections", /* @__PURE__ */ new Map());
    g(this, "layoutRegions", /* @__PURE__ */ new Map());
    g(this, "routingGraph", /* @__PURE__ */ new Map());
    g(this, "connectionPaths", /* @__PURE__ */ new Map());
    g(this, "isActive", !1);
    this.settings = { ...this.settings, ...t };
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  registerLayoutRegion(t, e, s, i = []) {
    this.layoutRegions.set(t, {
      id: t,
      bounds: e,
      layoutType: s,
      nodes: new Set(i.map((n) => n.id)),
      connectionPoints: this._calculateConnectionPoints(e),
      obstacles: this._createObstaclesFromNodes(i, e)
    }), this._updateRoutingGraph();
  }
  unregisterLayoutRegion(t) {
    this.layoutRegions.delete(t), this._updateRoutingGraph(), this.connections.forEach((e, s) => {
      (e.sourceRegion === t || e.targetRegion === t) && this.removeConnection(s);
    });
  }
  addConnection(t, e, s = {}) {
    const i = `${t}-${e}`, n = this._findNodeRegion(t), o = this._findNodeRegion(e);
    if (!n || !o)
      return console.warn(`LayoutConnector: Could not find regions for nodes ${t} -> ${e}`), null;
    const a = {
      id: i,
      sourceNodeId: t,
      targetNodeId: e,
      sourceRegion: n.id,
      targetRegion: o.id,
      type: s.type || this.settings.defaultConnectionType,
      strength: s.strength || this.settings.connectionStrength,
      metadata: s.metadata || {},
      path: null,
      visualElement: null
    };
    return this.connections.set(i, a), this._routeConnection(a), i;
  }
  removeConnection(t) {
    const e = this.connections.get(t);
    e && (e.visualElement && this._removeVisualElement(e.visualElement), this.connections.delete(t), this.connectionPaths.delete(t));
  }
  _findNodeRegion(t) {
    for (const [e, s] of this.layoutRegions)
      if (s.nodes.has(t))
        return s;
    return null;
  }
  _calculateConnectionPoints(t) {
    const { min: e, max: s, center: i } = t, n = [];
    return n.push(
      new u.Vector3(i.x, s.y, i.z),
      // top
      new u.Vector3(s.x, i.y, i.z),
      // right
      new u.Vector3(i.x, e.y, i.z),
      // bottom
      new u.Vector3(e.x, i.y, i.z),
      // left
      new u.Vector3(i.x, i.y, s.z),
      // front
      new u.Vector3(i.x, i.y, e.z)
      // back
    ), n.push(
      new u.Vector3(s.x, s.y, i.z),
      // top-right
      new u.Vector3(e.x, s.y, i.z),
      // top-left
      new u.Vector3(s.x, e.y, i.z),
      // bottom-right
      new u.Vector3(e.x, e.y, i.z)
      // bottom-left
    ), n;
  }
  _createObstaclesFromNodes(t, e) {
    return t.map((s) => {
      var i;
      return {
        center: s.position.clone(),
        radius: (((i = s.getBoundingSphereRadius) == null ? void 0 : i.call(s)) || 25) + this.settings.routingPadding,
        type: "circle"
      };
    });
  }
  _updateRoutingGraph() {
    this.routingGraph.clear(), this.layoutRegions.forEach((t, e) => {
      t.connectionPoints.forEach((s, i) => {
        const n = `${e}_cp_${i}`;
        this.routingGraph.set(n, {
          position: s.clone(),
          regionId: e,
          type: "connection_point",
          connections: /* @__PURE__ */ new Set()
        });
      });
    }), this._addIntermediateRoutingNodes(), this._connectRoutingNodes();
  }
  _addIntermediateRoutingNodes() {
    const t = Array.from(this.layoutRegions.values());
    for (let e = 0; e < t.length; e++)
      for (let s = e + 1; s < t.length; s++) {
        const i = t[e], n = t[s], o = i.bounds.center.clone().add(n.bounds.center).multiplyScalar(0.5), a = `intermediate_${i.id}_${n.id}`;
        this.routingGraph.set(a, {
          position: o,
          regionId: null,
          type: "intermediate",
          connections: /* @__PURE__ */ new Set()
        });
      }
  }
  _connectRoutingNodes() {
    const t = Array.from(this.routingGraph.values());
    t.forEach((e, s) => {
      t.forEach((i, n) => {
        if (s >= n) return;
        const o = e.position.distanceTo(i.position);
        !this._pathHasObstacle(e.position, i.position) && o < 500 && (e.connections.add(t[n]), i.connections.add(t[s]));
      });
    });
  }
  _pathHasObstacle(t, e) {
    const s = e.clone().sub(t);
    s.length(), s.normalize();
    for (const i of this.layoutRegions.values())
      for (const n of i.obstacles)
        if (this._lineIntersectsCircle(t, e, n.center, n.radius))
          return !0;
    return !1;
  }
  _lineIntersectsCircle(t, e, s, i) {
    const n = e.clone().sub(t), a = s.clone().sub(t).dot(n) / n.lengthSq(), r = Math.max(0, Math.min(1, a));
    return t.clone().add(n.multiplyScalar(r)).distanceTo(s) < i;
  }
  _routeConnection(t) {
    const e = this._getNodeById(t.sourceNodeId), s = this._getNodeById(t.targetNodeId);
    if (!e || !s) return;
    let i;
    switch (t.type) {
      case "direct":
        i = this._routeDirect(e.position, s.position);
        break;
      case "orthogonal":
        i = this._routeOrthogonal(e.position, s.position, t);
        break;
      case "curved":
        i = this._routeCurved(e.position, s.position, t);
        break;
      case "bundled":
        i = this._routeBundled(e.position, s.position, t);
        break;
      default:
        i = this._routeCurved(e.position, s.position, t);
    }
    t.path = i, this.connectionPaths.set(t.id, i), this.settings.animate ? this._animateConnection(t) : this._createVisualConnection(t);
  }
  _routeDirect(t, e) {
    return [t.clone(), e.clone()];
  }
  _routeOrthogonal(t, e, s) {
    const i = this.layoutRegions.get(s.sourceRegion), n = this.layoutRegions.get(s.targetRegion);
    if (!i || !n)
      return this._routeDirect(t, e);
    const o = i.bounds, a = n.bounds;
    let r, l;
    a.center.x > o.center.x ? (r = new u.Vector3(o.max.x, t.y, t.z), l = new u.Vector3(a.min.x, e.y, e.z)) : (r = new u.Vector3(o.min.x, t.y, t.z), l = new u.Vector3(a.max.x, e.y, e.z));
    const c = (r.x + l.x) / 2;
    return [
      t.clone(),
      r.clone(),
      new u.Vector3(c, r.y, r.z),
      new u.Vector3(c, l.y, l.z),
      l.clone(),
      e.clone()
    ];
  }
  _routeCurved(t, e, s) {
    const i = this.layoutRegions.get(s.sourceRegion), n = this.layoutRegions.get(s.targetRegion);
    if (!i || !n)
      return this._routeDirect(t, e);
    if (this._pathHasObstacle(t, e))
      return this._findPath(t, e, s);
    const o = t.clone().add(e.clone().sub(t).multiplyScalar(0.33)), a = t.clone().add(e.clone().sub(t).multiplyScalar(0.66)), r = new u.Vector3(-(e.y - t.y), e.x - t.x, 0).normalize(), l = Math.min(100, t.distanceTo(e) * 0.2);
    return o.add(r.clone().multiplyScalar(l)), a.add(r.clone().multiplyScalar(-l)), this._generateBezierPath(t, o, a, e, 20);
  }
  _routeBundled(t, e, s) {
    const i = [];
    return this.connections.forEach((n, o) => {
      if (o === s.id) return;
      const a = s.sourceRegion, r = s.targetRegion, l = n.sourceRegion, c = n.targetRegion;
      (a === l && r === c || a === c && r === l) && i.push(n);
    }), i.length >= this.settings.bundlingThreshold ? this._createBundledPath(t, e, i) : this._routeCurved(t, e, s);
  }
  _createBundledPath(t, e, s) {
    const n = t.clone().add(e).multiplyScalar(0.5).clone(), o = new u.Vector3(-(e.y - t.y), e.x - t.x, 0).normalize();
    return n.add(o.multiplyScalar(this.settings.bundlingRadius)), [
      t.clone(),
      t.clone().lerp(n, 0.5),
      n.clone(),
      e.clone().lerp(n, 0.5),
      e.clone()
    ];
  }
  _findPath(t, e, s) {
    const i = this._findClosestRoutingNode(t, s.sourceRegion), n = this._findClosestRoutingNode(e, s.targetRegion);
    if (!i || !n)
      return this._routeDirect(t, e);
    const o = this._aStar(i, n);
    if (o.length === 0)
      return this._routeDirect(t, e);
    const a = [t.clone()];
    return o.forEach((r) => {
      const l = this.routingGraph.get(r);
      l && a.push(l.position.clone());
    }), a.push(e.clone()), a;
  }
  _findClosestRoutingNode(t, e) {
    let s = null, i = 1 / 0;
    return this.routingGraph.forEach((n, o) => {
      if (n.regionId === e || n.type === "intermediate") {
        const a = n.position.distanceTo(t);
        a < i && (i = a, s = o);
      }
    }), s;
  }
  _aStar(t, e) {
    const s = /* @__PURE__ */ new Set([t]), i = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map();
    this.routingGraph.forEach((l, c) => {
      n.set(c, 1 / 0), o.set(c, 1 / 0);
    }), n.set(t, 0);
    const a = this.routingGraph.get(t), r = this.routingGraph.get(e);
    for (o.set(t, a.position.distanceTo(r.position)); s.size > 0; ) {
      let l = null, c = 1 / 0;
      if (s.forEach((h) => {
        const p = o.get(h);
        p < c && (c = p, l = h);
      }), l === e) {
        const h = [];
        let p = l;
        for (; i.has(p); )
          h.unshift(p), p = i.get(p);
        return h;
      }
      s.delete(l);
      const d = this.routingGraph.get(l);
      d.connections.forEach((h) => {
        const p = this._getRoutingNodeId(h), f = n.get(l) + d.position.distanceTo(h.position);
        f < n.get(p) && (i.set(p, l), n.set(p, f), o.set(p, f + h.position.distanceTo(r.position)), s.add(p));
      });
    }
    return [];
  }
  _getRoutingNodeId(t) {
    for (const [e, s] of this.routingGraph)
      if (s === t) return e;
    return null;
  }
  _generateBezierPath(t, e, s, i, n) {
    const o = [];
    for (let a = 0; a <= n; a++) {
      const r = a / n, l = this._bezierPoint(t, e, s, i, r);
      o.push(l);
    }
    return o;
  }
  _bezierPoint(t, e, s, i, n) {
    const o = 1 - n, a = o * o, r = a * o, l = n * n, c = l * n;
    return new u.Vector3(
      r * t.x + 3 * a * n * e.x + 3 * o * l * s.x + c * i.x,
      r * t.y + 3 * a * n * e.y + 3 * o * l * s.y + c * i.y,
      r * t.z + 3 * a * n * e.z + 3 * o * l * s.z + c * i.z
    );
  }
  _animateConnection(t) {
    if (this._createVisualConnection(t), t.visualElement && t.path) {
      const e = t.visualElement.geometry;
      if (e && e.attributes.position) {
        const s = e.attributes.position.array, i = [...s], n = t.path[0];
        for (let o = 0; o < s.length; o += 3)
          s[o] = n.x, s[o + 1] = n.y, s[o + 2] = n.z;
        e.attributes.position.needsUpdate = !0, z.to(s, {
          duration: this.settings.animationDuration,
          ease: "power2.inOut",
          onUpdate: () => {
            const o = z.getProperty(s, "progress") || 0;
            for (let a = 0; a < i.length; a++)
              s[a] = u.MathUtils.lerp(n.x, i[a], o);
            e.attributes.position.needsUpdate = !0;
          }
        });
      }
    }
  }
  _createVisualConnection(t) {
    if (!t.path || t.path.length < 2) return;
    const e = t.path, s = new u.BufferGeometry().setFromPoints(e), i = new u.LineBasicMaterial({
      color: t.metadata.color || 65280,
      linewidth: t.metadata.width || 2,
      transparent: !0,
      opacity: t.metadata.opacity || 0.8
    }), n = new u.Line(s, i);
    t.visualElement = n, this.space && this.space.scene && this.space.scene.add(n);
  }
  _removeVisualElement(t) {
    this.space && this.space.scene && t && (this.space.scene.remove(t), t.geometry && t.geometry.dispose(), t.material && t.material.dispose());
  }
  _getNodeById(t) {
    var s;
    const e = (s = this.pluginManager) == null ? void 0 : s.getPlugin("NodePlugin");
    return e == null ? void 0 : e.getNodes().get(t);
  }
  updateConnection(t, e = {}) {
    const s = this.connections.get(t);
    if (s && (Object.assign(s, e), e.type && e.type !== s.type && this._routeConnection(s), s.visualElement && e.metadata)) {
      const i = s.visualElement.material;
      e.metadata.color && i.color.setHex(e.metadata.color), e.metadata.opacity !== void 0 && (i.opacity = e.metadata.opacity);
    }
  }
  getAllConnections() {
    return Array.from(this.connections.values());
  }
  getConnectionsForRegion(t) {
    return Array.from(this.connections.values()).filter(
      (e) => e.sourceRegion === t || e.targetRegion === t
    );
  }
  activate() {
    this.isActive = !0, this._updateAllConnections();
  }
  deactivate() {
    this.isActive = !1, this.connections.forEach((t) => {
      t.visualElement && this._removeVisualElement(t.visualElement);
    });
  }
  _updateAllConnections() {
    this.connections.forEach((t) => {
      this._routeConnection(t);
    });
  }
  updateConfig(t) {
    this.settings = { ...this.settings, ...t };
  }
  dispose() {
    this.connections.forEach((t) => {
      t.visualElement && this._removeVisualElement(t.visualElement);
    }), this.connections.clear(), this.layoutRegions.clear(), this.routingGraph.clear(), this.connectionPaths.clear(), this.space = null, this.pluginManager = null, this.isActive = !1;
  }
}
class eo {
  constructor(t = {}) {
    g(this, "space", null);
    g(this, "pluginManager", null);
    g(this, "settings", {
      adaptationTriggers: ["nodeCount", "density", "connections", "size", "time"],
      morphDuration: 1.2,
      morphEasing: "power2.inOut",
      enableAutoAdaptation: !0,
      adaptationDelay: 2e3,
      densityThresholds: {
        sparse: 0.1,
        normal: 0.4,
        dense: 0.8
      },
      sizeThresholds: {
        small: 50,
        medium: 200,
        large: 500
      },
      timeBasedAdaptation: {
        enabled: !1,
        interval: 3e4,
        patterns: ["circular", "grid", "force", "hierarchical"]
      }
    });
    g(this, "currentLayout", null);
    g(this, "currentLayoutName", "");
    g(this, "availableLayouts", /* @__PURE__ */ new Map());
    g(this, "adaptationRules", []);
    g(this, "layoutHistory", []);
    g(this, "nodeMetrics", /* @__PURE__ */ new Map());
    g(this, "isAdapting", !1);
    g(this, "adaptationTimer", null);
    this.settings = { ...this.settings, ...t }, this._initializeAdaptationRules();
  }
  setContext(t, e) {
    this.space = t, this.pluginManager = e;
  }
  registerLayout(t, e) {
    var s;
    this.availableLayouts.set(t, e), (s = e.setContext) == null || s.call(e, this.space, this.pluginManager);
  }
  _initializeAdaptationRules() {
    this.adaptationRules = [
      {
        name: "SmallNodeCount",
        condition: (t) => t.nodeCount <= this.settings.sizeThresholds.small,
        targetLayout: "circular",
        priority: 3,
        description: "Use circular layout for small node counts"
      },
      {
        name: "HighDensity",
        condition: (t) => t.density > this.settings.densityThresholds.dense,
        targetLayout: "force",
        priority: 2,
        description: "Use force layout for high density graphs"
      },
      {
        name: "HierarchicalStructure",
        condition: (t) => t.hierarchyScore > 0.7,
        targetLayout: "hierarchical",
        priority: 1,
        description: "Use hierarchical layout for tree-like structures"
      },
      {
        name: "GridSuitable",
        condition: (t) => t.connectionDensity < 0.3 && t.nodeCount > 16,
        targetLayout: "grid",
        priority: 4,
        description: "Use grid layout for sparse, medium-sized graphs"
      },
      {
        name: "LargeGraph",
        condition: (t) => t.nodeCount > this.settings.sizeThresholds.large,
        targetLayout: "force",
        priority: 2,
        description: "Use force layout for large graphs"
      },
      {
        name: "HighlyConnected",
        condition: (t) => t.avgDegree > 5,
        targetLayout: "force",
        priority: 3,
        description: "Use force layout for highly connected graphs"
      }
    ];
  }
  async init(t, e, s = {}) {
    s && this.updateConfig(s);
    const i = this._calculateGraphMetrics(t, e), n = this._selectBestLayout(i);
    await this._applyLayout(n, t, e, s), this.settings.enableAutoAdaptation && this._startAdaptationMonitoring();
  }
  _calculateGraphMetrics(t, e) {
    const s = t.length, i = e.length;
    if (s === 0)
      return {
        nodeCount: 0,
        edgeCount: 0,
        density: 0,
        avgDegree: 0,
        connectionDensity: 0,
        hierarchyScore: 0,
        clustering: 0,
        boundingVolume: 0
      };
    const n = s * (s - 1) / 2, o = n > 0 ? i / n : 0, a = s > 0 ? 2 * i / s : 0, r = t.map((f) => f.position), l = this._calculateBoundingBox(r), c = l.size.x * l.size.y * l.size.z, d = c > 0 ? i / c : 0, h = this._calculateHierarchyScore(t, e), p = this._calculateClustering(t, e);
    return {
      nodeCount: s,
      edgeCount: i,
      density: o,
      avgDegree: a,
      connectionDensity: d,
      hierarchyScore: h,
      clustering: p,
      boundingVolume: c,
      boundingBox: l
    };
  }
  _calculateBoundingBox(t) {
    if (t.length === 0)
      return { min: new u.Vector3(), max: new u.Vector3(), size: new u.Vector3() };
    const e = t[0].clone(), s = t[0].clone();
    return t.forEach((i) => {
      e.min(i), s.max(i);
    }), {
      min: e,
      max: s,
      size: s.clone().sub(e),
      center: e.clone().add(s).multiplyScalar(0.5)
    };
  }
  _calculateHierarchyScore(t, e) {
    if (t.length <= 1) return 0;
    const s = /* @__PURE__ */ new Map();
    t.forEach((a) => s.set(a.id, [])), e.forEach((a) => {
      var r, l;
      (r = s.get(a.source.id)) == null || r.push(a.target.id), (l = s.get(a.target.id)) == null || l.push(a.source.id);
    });
    let i = 0;
    s.forEach((a, r) => {
      a.length === 1 && i++, a.length;
    });
    const n = i / t.length, o = 1 - e.length / (t.length * t.length);
    return Math.min(1, n + o);
  }
  _calculateClustering(t, e) {
    if (t.length < 3) return 0;
    const s = /* @__PURE__ */ new Map();
    t.forEach((o) => s.set(o.id, /* @__PURE__ */ new Set())), e.forEach((o) => {
      var a, r;
      (a = s.get(o.source.id)) == null || a.add(o.target.id), (r = s.get(o.target.id)) == null || r.add(o.source.id);
    });
    let i = 0, n = 0;
    return s.forEach((o, a) => {
      var d;
      if (o.size < 2) return;
      const r = Array.from(o);
      let l = 0, c = 0;
      for (let h = 0; h < r.length; h++)
        for (let p = h + 1; p < r.length; p++) {
          c++;
          const f = r[h], C = r[p];
          (d = s.get(f)) != null && d.has(C) && l++;
        }
      c > 0 && (i += l / c, n++);
    }), n > 0 ? i / n : 0;
  }
  _selectBestLayout(t) {
    const e = this.adaptationRules.filter((s) => s.condition(t)).sort((s, i) => s.priority - i.priority);
    if (e.length > 0) {
      const s = e[0];
      return console.log(`AdaptiveLayout: Selected ${s.targetLayout} - ${s.description}`), s.targetLayout;
    }
    return t.nodeCount < 20 ? "circular" : t.hierarchyScore > 0.5 ? "hierarchical" : t.density > 0.5 ? "force" : "grid";
  }
  async _applyLayout(t, e, s, i = {}) {
    var r;
    const n = this.availableLayouts.get(t);
    if (!n) {
      console.warn(`AdaptiveLayout: Layout ${t} not found`);
      return;
    }
    const o = this.currentLayoutName;
    this.currentLayout = n, this.currentLayoutName = t;
    const a = /* @__PURE__ */ new Map();
    e.forEach((l) => {
      a.set(l.id, l.position.clone());
    }), n.init && await n.init(e, s, i), o && o !== t && this.settings.morphDuration > 0 && await this._morphBetweenLayouts(e, a), this.layoutHistory.push({
      layout: t,
      timestamp: Date.now(),
      nodeCount: e.length,
      edgeCount: s.length
    }), (r = this.space) == null || r.emit("layout:adapted", {
      from: o,
      to: t,
      reason: "adaptive_selection"
    });
  }
  async _morphBetweenLayouts(t, e) {
    return new Promise((s) => {
      const i = t.map((n) => {
        const o = e.get(n.id), a = n.position.clone();
        return o ? (n.position.copy(o), new Promise((r) => {
          z.to(n.position, {
            x: a.x,
            y: a.y,
            z: a.z,
            duration: this.settings.morphDuration,
            ease: this.settings.morphEasing,
            onComplete: r
          });
        })) : Promise.resolve();
      });
      Promise.all(i).then(s);
    });
  }
  _startAdaptationMonitoring() {
    this.adaptationTimer && clearInterval(this.adaptationTimer), this.adaptationTimer = setInterval(() => {
      this._checkForAdaptation();
    }, this.settings.adaptationDelay), this.settings.timeBasedAdaptation.enabled && setInterval(() => {
      this._performTimeBasedAdaptation();
    }, this.settings.timeBasedAdaptation.interval);
  }
  async _checkForAdaptation() {
    var a, r;
    if (this.isAdapting) return;
    const t = (a = this.pluginManager) == null ? void 0 : a.getPlugin("NodePlugin"), e = (r = this.pluginManager) == null ? void 0 : r.getPlugin("EdgePlugin");
    if (!t || !e) return;
    const s = Array.from(t.getNodes().values()), i = Array.from(e.getEdges().values()), n = this._calculateGraphMetrics(s, i), o = this._selectBestLayout(n);
    o !== this.currentLayoutName && (console.log(`AdaptiveLayout: Adapting from ${this.currentLayoutName} to ${o}`), this.isAdapting = !0, await this._applyLayout(o, s, i), this.isAdapting = !1);
  }
  async _performTimeBasedAdaptation() {
    var n, o, a;
    if (this.isAdapting || !this.settings.timeBasedAdaptation.enabled) return;
    const t = this.settings.timeBasedAdaptation.patterns, s = (t.indexOf(this.currentLayoutName) + 1) % t.length, i = t[s];
    if (this.availableLayouts.has(i)) {
      const r = (n = this.pluginManager) == null ? void 0 : n.getPlugin("NodePlugin"), l = (o = this.pluginManager) == null ? void 0 : o.getPlugin("EdgePlugin");
      if (r && l) {
        const c = Array.from(r.getNodes().values()), d = Array.from(l.getEdges().values());
        this.isAdapting = !0, await this._applyLayout(i, c, d), this.isAdapting = !1, (a = this.space) == null || a.emit("layout:adapted", {
          from: this.currentLayoutName,
          to: i,
          reason: "time_based"
        });
      }
    }
  }
  addAdaptationRule(t) {
    this.adaptationRules.push({
      name: t.name || "CustomRule",
      condition: t.condition,
      targetLayout: t.targetLayout,
      priority: t.priority || 5,
      description: t.description || "Custom adaptation rule"
    }), this.adaptationRules.sort((e, s) => e.priority - s.priority);
  }
  removeAdaptationRule(t) {
    this.adaptationRules = this.adaptationRules.filter((e) => e.name !== t);
  }
  forceAdaptation(t, e = "manual") {
    var n, o;
    if (!this.availableLayouts.has(t)) {
      console.warn(`AdaptiveLayout: Target layout ${t} not available`);
      return;
    }
    const s = (n = this.pluginManager) == null ? void 0 : n.getPlugin("NodePlugin"), i = (o = this.pluginManager) == null ? void 0 : o.getPlugin("EdgePlugin");
    if (s && i) {
      const a = Array.from(s.getNodes().values()), r = Array.from(i.getEdges().values());
      this._applyLayout(t, a, r).then(() => {
        var l;
        (l = this.space) == null || l.emit("layout:adapted", {
          from: this.currentLayoutName,
          to: t,
          reason: e
        });
      });
    }
  }
  setAdaptationEnabled(t) {
    this.settings.enableAutoAdaptation = t, t ? this._startAdaptationMonitoring() : this.adaptationTimer && (clearInterval(this.adaptationTimer), this.adaptationTimer = null);
  }
  getLayoutHistory() {
    return [...this.layoutHistory];
  }
  getCurrentLayout() {
    return {
      name: this.currentLayoutName,
      instance: this.currentLayout
    };
  }
  getAdaptationRules() {
    return [...this.adaptationRules];
  }
  // Layout interface methods
  addNode(t) {
    var e, s;
    (s = (e = this.currentLayout) == null ? void 0 : e.addNode) == null || s.call(e, t), this.settings.enableAutoAdaptation && !this.isAdapting && setTimeout(() => this._checkForAdaptation(), 100);
  }
  removeNode(t) {
    var e, s;
    (s = (e = this.currentLayout) == null ? void 0 : e.removeNode) == null || s.call(e, t), this.settings.enableAutoAdaptation && !this.isAdapting && setTimeout(() => this._checkForAdaptation(), 100);
  }
  addEdge(t) {
    var e, s;
    (s = (e = this.currentLayout) == null ? void 0 : e.addEdge) == null || s.call(e, t), this.settings.enableAutoAdaptation && !this.isAdapting && setTimeout(() => this._checkForAdaptation(), 100);
  }
  removeEdge(t) {
    var e, s;
    (s = (e = this.currentLayout) == null ? void 0 : e.removeEdge) == null || s.call(e, t), this.settings.enableAutoAdaptation && !this.isAdapting && setTimeout(() => this._checkForAdaptation(), 100);
  }
  run() {
    var t, e;
    (e = (t = this.currentLayout) == null ? void 0 : t.run) == null || e.call(t);
  }
  stop() {
    var t, e;
    (e = (t = this.currentLayout) == null ? void 0 : t.stop) == null || e.call(t);
  }
  kick() {
    var t, e;
    (e = (t = this.currentLayout) == null ? void 0 : t.kick) == null || e.call(t);
  }
  updateConfig(t) {
    this.settings = { ...this.settings, ...t }, t.adaptationRules && this._initializeAdaptationRules();
  }
  dispose() {
    this.adaptationTimer && (clearInterval(this.adaptationTimer), this.adaptationTimer = null), this.availableLayouts.forEach((t) => {
      var e;
      return (e = t.dispose) == null ? void 0 : e.call(t);
    }), this.availableLayouts.clear(), this.adaptationRules = [], this.layoutHistory = [], this.nodeMetrics.clear(), this.currentLayout = null, this.currentLayoutName = "", this.space = null, this.pluginManager = null, this.isAdapting = !1;
  }
}
class to extends Un {
  constructor(t, e) {
    super(t, e), this.constraintSystem = new Kn(), this.nestedSystem = new $n(), this.connector = new Qn(), this.adaptiveSystem = new eo(), this.layoutModes = {
      STANDARD: "standard",
      CONSTRAINT: "constraint",
      NESTED: "nested",
      ADAPTIVE: "adaptive",
      HYBRID: "hybrid"
    }, this.currentMode = this.layoutModes.STANDARD, this.settings = {
      enableConnections: !0,
      enableConstraints: !1,
      enableNesting: !1,
      enableAdaptive: !1,
      hybridPriority: ["adaptive", "nested", "constraint", "standard"],
      transitionDuration: 0.8,
      autoModeSelection: !1
    }, this._initializeAdvancedSystems(), this._registerAdvancedLayouts();
  }
  _initializeAdvancedSystems() {
    this.constraintSystem.setContext(this.space, this.pluginManager), this.nestedSystem.setContext(this.space, this.pluginManager), this.connector.setContext(this.space, this.pluginManager), this.adaptiveSystem.setContext(this.space, this.pluginManager);
  }
  _registerAdvancedLayouts() {
    this.registerLayout("constraint", this.constraintSystem), this.registerLayout("nested", this.nestedSystem), this.registerLayout("adaptive", this.adaptiveSystem), this.layouts.forEach((t, e) => {
      e !== "constraint" && e !== "nested" && e !== "adaptive" && this.adaptiveSystem.registerLayout(e, t);
    });
  }
  async applyLayout(t, e = {}) {
    switch (this._determineLayoutMode(t, e)) {
      case this.layoutModes.CONSTRAINT:
        return this._applyConstraintLayout(t, e);
      case this.layoutModes.NESTED:
        return this._applyNestedLayout(t, e);
      case this.layoutModes.ADAPTIVE:
        return this._applyAdaptiveLayout(t, e);
      case this.layoutModes.HYBRID:
        return this._applyHybridLayout(t, e);
      default:
        return this._applyStandardLayout(t, e);
    }
  }
  _determineLayoutMode(t, e) {
    return e.mode ? e.mode : this.settings.autoModeSelection ? this._autoSelectMode(t, e) : t === "adaptive" || this.settings.enableAdaptive ? this.layoutModes.ADAPTIVE : t === "constraint" || this.settings.enableConstraints ? this.layoutModes.CONSTRAINT : t === "nested" || this.settings.enableNesting ? this.layoutModes.NESTED : this.layoutModes.STANDARD;
  }
  _autoSelectMode(t, e) {
    const s = this.pluginManager.getPlugin("NodePlugin"), i = this.pluginManager.getPlugin("EdgePlugin");
    if (!s || !i) return this.layoutModes.STANDARD;
    const n = Array.from(s.getNodes().values()), o = Array.from(i.getEdges().values()), a = n.some(
      (c) => {
        var d, h;
        return ((d = c.data) == null ? void 0 : d.isContainer) || ((h = c.data) == null ? void 0 : h.childLayout);
      }
    ), r = o.some(
      (c) => {
        var d, h;
        return ((d = c.data) == null ? void 0 : d.constraintType) || ((h = c.data) == null ? void 0 : h.constraintParams);
      }
    ), l = n.length > 50 || o.length > 100 || this._calculateGraphComplexity(n, o) > 0.7;
    return a && r && l ? this.layoutModes.HYBRID : l ? this.layoutModes.ADAPTIVE : a ? this.layoutModes.NESTED : r ? this.layoutModes.CONSTRAINT : this.layoutModes.STANDARD;
  }
  _calculateGraphComplexity(t, e) {
    if (t.length === 0) return 0;
    const s = e.length / (t.length * (t.length - 1) / 2), i = 2 * e.length / t.length, n = Math.min(1, t.length / 100);
    return (s + i / 10 + n) / 3;
  }
  async _applyStandardLayout(t, e) {
    return super.applyLayout(t, e);
  }
  async _applyConstraintLayout(t, e) {
    const s = this.pluginManager.getPlugin("NodePlugin"), i = this.pluginManager.getPlugin("EdgePlugin");
    if (!s || !i) return !1;
    const n = Array.from(s.getNodes().values()), o = Array.from(i.getEdges().values());
    return e.baseLayout && e.baseLayout !== "constraint" && await super.applyLayout(e.baseLayout, e), await this.constraintSystem.init(n, o, e), this.activeLayout = this.constraintSystem, this.activeLayoutName = "constraint", this.currentMode = this.layoutModes.CONSTRAINT, this.space.emit("layout:started", {
      name: "constraint",
      layout: this.constraintSystem,
      mode: this.currentMode
    }), !0;
  }
  async _applyNestedLayout(t, e) {
    const s = this.pluginManager.getPlugin("NodePlugin"), i = this.pluginManager.getPlugin("EdgePlugin");
    if (!s || !i) return !1;
    const n = Array.from(s.getNodes().values()), o = Array.from(i.getEdges().values());
    return await this.nestedSystem.init(n, o, e), this.activeLayout = this.nestedSystem, this.activeLayoutName = "nested", this.currentMode = this.layoutModes.NESTED, this.space.emit("layout:started", {
      name: "nested",
      layout: this.nestedSystem,
      mode: this.currentMode
    }), !0;
  }
  async _applyAdaptiveLayout(t, e) {
    const s = this.pluginManager.getPlugin("NodePlugin"), i = this.pluginManager.getPlugin("EdgePlugin");
    if (!s || !i) return !1;
    const n = Array.from(s.getNodes().values()), o = Array.from(i.getEdges().values());
    return await this.adaptiveSystem.init(n, o, e), this.activeLayout = this.adaptiveSystem, this.activeLayoutName = "adaptive", this.currentMode = this.layoutModes.ADAPTIVE, this.space.emit("layout:started", {
      name: "adaptive",
      layout: this.adaptiveSystem,
      mode: this.currentMode
    }), !0;
  }
  async _applyHybridLayout(t, e) {
    const s = this.pluginManager.getPlugin("NodePlugin"), i = this.pluginManager.getPlugin("EdgePlugin");
    if (!s || !i) return !1;
    const n = Array.from(s.getNodes().values()), o = Array.from(i.getEdges().values());
    for (const a of this.settings.hybridPriority)
      switch (a) {
        case "adaptive":
          this.settings.enableAdaptive && await this.adaptiveSystem.init(n, o, e);
          break;
        case "nested":
          this.settings.enableNesting && await this.nestedSystem.init(n, o, e);
          break;
        case "constraint":
          this.settings.enableConstraints && await this.constraintSystem.init(n, o, e);
          break;
        case "standard":
          e.baseLayout && await super.applyLayout(e.baseLayout, e);
          break;
      }
    return this.activeLayout = this._createHybridLayoutProxy(), this.activeLayoutName = "hybrid", this.currentMode = this.layoutModes.HYBRID, this.space.emit("layout:started", {
      name: "hybrid",
      layout: this.activeLayout,
      mode: this.currentMode
    }), !0;
  }
  _createHybridLayoutProxy() {
    return {
      run: () => {
        this.settings.enableAdaptive && this.adaptiveSystem.run(), this.settings.enableNesting && this.nestedSystem.run(), this.settings.enableConstraints && this.constraintSystem.run();
      },
      stop: () => {
        this.settings.enableAdaptive && this.adaptiveSystem.stop(), this.settings.enableNesting && this.nestedSystem.stop(), this.settings.enableConstraints && this.constraintSystem.stop();
      },
      kick: () => {
        this.settings.enableAdaptive && this.adaptiveSystem.kick(), this.settings.enableNesting && this.nestedSystem.kick(), this.settings.enableConstraints && this.constraintSystem.kick();
      },
      addNode: (t) => {
        this.settings.enableAdaptive && this.adaptiveSystem.addNode(t), this.settings.enableNesting && this.nestedSystem.addNode(t), this.settings.enableConstraints && this.constraintSystem.addNode(t);
      },
      removeNode: (t) => {
        this.settings.enableAdaptive && this.adaptiveSystem.removeNode(t), this.settings.enableNesting && this.nestedSystem.removeNode(t), this.settings.enableConstraints && this.constraintSystem.removeNode(t);
      },
      addEdge: (t) => {
        this.settings.enableAdaptive && this.adaptiveSystem.addEdge(t), this.settings.enableNesting && this.nestedSystem.addEdge(t), this.settings.enableConstraints && this.constraintSystem.addEdge(t);
      },
      removeEdge: (t) => {
        this.settings.enableAdaptive && this.adaptiveSystem.removeEdge(t), this.settings.enableNesting && this.nestedSystem.removeEdge(t), this.settings.enableConstraints && this.constraintSystem.removeEdge(t);
      },
      dispose: () => {
      }
    };
  }
  // Layout Connector Integration
  registerLayoutRegion(t, e, s, i = []) {
    this.settings.enableConnections && this.connector.registerLayoutRegion(t, e, s, i);
  }
  unregisterLayoutRegion(t) {
    this.settings.enableConnections && this.connector.unregisterLayoutRegion(t);
  }
  addLayoutConnection(t, e, s = {}) {
    return this.settings.enableConnections ? this.connector.addConnection(t, e, s) : null;
  }
  removeLayoutConnection(t) {
    this.settings.enableConnections && this.connector.removeConnection(t);
  }
  activateConnections() {
    this.settings.enableConnections = !0, this.connector.activate();
  }
  deactivateConnections() {
    this.settings.enableConnections = !1, this.connector.deactivate();
  }
  // Constraint System Integration
  addPositionConstraint(t, e, s = {}) {
    this.constraintSystem.addPositionConstraint(t, e, s);
  }
  addDistanceConstraint(t, e, s = {}) {
    this.constraintSystem.addDistanceConstraint(t, e, s);
  }
  addAngleConstraint(t, e, s, i = {}) {
    this.constraintSystem.addAngleConstraint(t, e, s, i);
  }
  addBoundaryConstraint(t, e, s = {}) {
    this.constraintSystem.addBoundaryConstraint(t, e, s);
  }
  // Nested Layout Integration
  addContainer(t, e = null) {
    this.nestedSystem.addContainer(t, e);
  }
  removeContainer(t) {
    this.nestedSystem.removeContainer(t);
  }
  addNodeToContainer(t, e) {
    this.nestedSystem.addNodeToContainer(t, e);
  }
  removeNodeFromContainer(t, e) {
    this.nestedSystem.removeNodeFromContainer(t, e);
  }
  setContainerLayout(t, e, s = {}) {
    this.nestedSystem.setContainerLayout(t, e, s);
  }
  // Adaptive Layout Integration
  addAdaptationRule(t) {
    this.adaptiveSystem.addAdaptationRule(t);
  }
  removeAdaptationRule(t) {
    this.adaptiveSystem.removeAdaptationRule(t);
  }
  forceAdaptation(t, e = "manual") {
    this.adaptiveSystem.forceAdaptation(t, e);
  }
  setAdaptationEnabled(t) {
    this.settings.enableAdaptive = t, this.adaptiveSystem.setAdaptationEnabled(t);
  }
  getLayoutHistory() {
    return this.adaptiveSystem.getLayoutHistory();
  }
  // Advanced configuration
  setLayoutMode(t) {
    this.currentMode = t, this.settings.enableConstraints = t === this.layoutModes.CONSTRAINT || t === this.layoutModes.HYBRID, this.settings.enableNesting = t === this.layoutModes.NESTED || t === this.layoutModes.HYBRID, this.settings.enableAdaptive = t === this.layoutModes.ADAPTIVE || t === this.layoutModes.HYBRID;
  }
  enableAdvancedFeatures(t = {}) {
    t.constraints !== void 0 && (this.settings.enableConstraints = t.constraints), t.nesting !== void 0 && (this.settings.enableNesting = t.nesting), t.adaptive !== void 0 && (this.settings.enableAdaptive = t.adaptive), t.connections !== void 0 && (this.settings.enableConnections = t.connections), t.autoMode !== void 0 && (this.settings.autoModeSelection = t.autoMode);
  }
  getLayoutCapabilities() {
    return {
      modes: Object.values(this.layoutModes),
      currentMode: this.currentMode,
      availableLayouts: Array.from(this.layouts.keys()),
      features: {
        constraints: this.settings.enableConstraints,
        nesting: this.settings.enableNesting,
        adaptive: this.settings.enableAdaptive,
        connections: this.settings.enableConnections,
        autoMode: this.settings.autoModeSelection
      },
      systems: {
        constraint: this.constraintSystem,
        nested: this.nestedSystem,
        connector: this.connector,
        adaptive: this.adaptiveSystem
      }
    };
  }
  // Override parent methods to integrate advanced systems
  addNodeToLayout(t) {
    super.addNodeToLayout(t), this.settings.enableConstraints && this.constraintSystem.addNode(t), this.settings.enableNesting && this.nestedSystem.addNode(t), this.settings.enableAdaptive && this.adaptiveSystem.addNode(t);
  }
  removeNodeFromLayout(t) {
    super.removeNodeFromLayout(t), this.settings.enableConstraints && this.constraintSystem.removeNode(t), this.settings.enableNesting && this.nestedSystem.removeNode(t), this.settings.enableAdaptive && this.adaptiveSystem.removeNode(t);
  }
  addEdgeToLayout(t) {
    super.addEdgeToLayout(t), this.settings.enableConstraints && this.constraintSystem.addEdge(t), this.settings.enableNesting && this.nestedSystem.addEdge(t), this.settings.enableAdaptive && this.adaptiveSystem.addEdge(t);
  }
  removeEdgeFromLayout(t) {
    super.removeEdgeFromLayout(t), this.settings.enableConstraints && this.constraintSystem.removeEdge(t), this.settings.enableNesting && this.nestedSystem.removeEdge(t), this.settings.enableAdaptive && this.adaptiveSystem.removeEdge(t);
  }
  dispose() {
    super.dispose(), this.constraintSystem.dispose(), this.nestedSystem.dispose(), this.connector.dispose(), this.adaptiveSystem.dispose();
  }
}
class so extends U {
  constructor(e, s) {
    super(e, s);
    g(this, "layoutManager", null);
    this.layoutManager = new to(e, s);
  }
  getName() {
    return "LayoutPlugin";
  }
  async init() {
    super.init(), this.layoutManager.registerLayout("force", new Vn()), this.layoutManager.registerLayout("grid", new Zn()), this.layoutManager.registerLayout("circular", new Hn()), this.layoutManager.registerLayout("spherical", new jn()), this.layoutManager.registerLayout("hierarchical", new Wn()), this.layoutManager.registerLayout(At.layoutName, new At()), this.layoutManager.registerLayout(St.layoutName, new St()), this.layoutManager.enableAdvancedFeatures({
      connections: !0,
      constraints: !1,
      nesting: !1,
      adaptive: !1,
      autoMode: !1
    }), await this.layoutManager.applyLayout("force"), this._setupEventListeners();
  }
  _setupEventListeners() {
    if (!this.space || !this.layoutManager) return;
    const e = this.pluginManager.getPlugin("UIPlugin");
    this.space.on("ui:request:applyLayout", (s) => this.applyLayout(s)), this.space.on("node:dragstart", (s) => {
      const i = this.layoutManager.getActiveLayout();
      if (!i || typeof i.fixNode != "function") return;
      const n = e == null ? void 0 : e.getSelectedNodes();
      n != null && n.has(s) ? n.forEach((o) => i.fixNode(o)) : i.fixNode(s);
    }), this.space.on("node:dragend", (s) => {
      const i = this.layoutManager.getActiveLayout();
      if (!i || typeof i.releaseNode != "function") return;
      const n = e == null ? void 0 : e.getSelectedNodes();
      n != null && n.has(s) ? n.forEach((o) => i.releaseNode(o)) : i.releaseNode(s), this.kick();
    }), this.space.on("node:added", (s) => {
      this.addNodeToLayout(s), this.kick();
    }), this.space.on("node:removed", (s, i) => {
      i && this.removeNodeFromLayout(i), this.kick();
    }), this.space.on("edge:added", (s) => {
      this.addEdgeToLayout(s), this.kick();
    }), this.space.on("edge:removed", (s, i) => {
      i && this.removeEdgeFromLayout(i), this.kick();
    });
  }
  addNodeToLayout(e) {
    var s;
    (s = this.layoutManager) == null || s.addNodeToLayout(e);
  }
  removeNodeFromLayout(e) {
    var s;
    (s = this.layoutManager) == null || s.removeNodeFromLayout(e);
  }
  addEdgeToLayout(e) {
    var s;
    (s = this.layoutManager) == null || s.addEdgeToLayout(e);
  }
  removeEdgeFromLayout(e) {
    var s;
    (s = this.layoutManager) == null || s.removeEdgeFromLayout(e);
  }
  kick() {
    var e;
    (e = this.layoutManager) == null || e.kick();
  }
  stop() {
    var e;
    (e = this.layoutManager) == null || e.stopLayout();
  }
  async applyLayout(e, s = {}) {
    var i;
    return ((i = this.layoutManager) == null ? void 0 : i.applyLayout(e, s)) || !1;
  }
  togglePinNode(e) {
    var n, o;
    const s = (n = this.pluginManager.getPlugin("NodePlugin")) == null ? void 0 : n.getNodeById(e);
    if (!s) return console.warn(`LayoutPlugin: Node ${e} not found.`);
    const i = (o = this.layoutManager) == null ? void 0 : o.getActiveLayout();
    i && typeof i.setPinState == "function" ? (i.setPinState(s, !s.isPinned), this.space.emit("node:pinned", { node: s, isPinned: s.isPinned })) : console.warn("LayoutPlugin: Active layout does not support pinning.");
  }
  update() {
    var e;
    (e = this.layoutManager) == null || e.update();
  }
  dispose() {
    var e;
    super.dispose(), (e = this.layoutManager) == null || e.dispose(), this.layoutManager = null;
  }
}
const k = {
  IDLE: "IDLE",
  PANNING: "PANNING",
  DRAGGING_NODE: "DRAGGING_NODE",
  RESIZING_NODE: "RESIZING_NODE",
  LINKING_NODE: "LINKING_NODE"
};
class io {
  constructor(t, e) {
    g(this, "_onConfirmYes", () => {
      var t;
      (t = this.confirmCallback) == null || t.call(this), this.hide();
    });
    g(this, "_onConfirmNo", () => {
      this.hide();
    });
    g(this, "hide", () => {
      this.confirmDialogElement.style.display === "block" && (this.confirmDialogElement.style.display = "none", this.confirmCallback = null, this.space.emit("ui:confirmdialog:hidden"));
    });
    this.space = t, this.confirmDialogElement = e, this.confirmCallback = null, this._bindEvents();
  }
  _bindEvents() {
    var t, e;
    (t = M("#confirm-yes", this.confirmDialogElement)) == null || t.addEventListener("click", this._onConfirmYes), (e = M("#confirm-no", this.confirmDialogElement)) == null || e.addEventListener("click", this._onConfirmNo);
  }
  show(t, e) {
    const s = M("#confirm-message", this.confirmDialogElement);
    s && (s.textContent = t), this.confirmCallback = e, this.confirmDialogElement.style.display = "block", this.space.emit("ui:confirmdialog:shown", { message: t });
  }
  dispose() {
    var t, e;
    (t = M("#confirm-yes", this.confirmDialogElement)) == null || t.removeEventListener("click", this._onConfirmYes), (e = M("#confirm-no", this.confirmDialogElement)) == null || e.removeEventListener("click", this._onConfirmNo), this.confirmDialogElement = null, this.space = null;
  }
}
class no {
  constructor(t, e, s) {
    g(this, "_onContextMenuClick", (t) => {
      var C, b;
      const e = t.target.closest("li[data-action]");
      if (!e || e.classList.contains("disabled")) return;
      const { action: s, nodeId: i, edgeId: n, positionX: o, positionY: a, positionZ: r } = e.dataset, l = o ? { x: parseFloat(o), y: parseFloat(a), z: parseFloat(r) } : null;
      this.hide();
      const c = this.space.plugins.getPlugin("NodePlugin"), d = this.space.plugins.getPlugin("EdgePlugin"), h = this.space.plugins.getPlugin("RenderingPlugin"), p = i ? c == null ? void 0 : c.getNodeById(i) : null, f = n ? d == null ? void 0 : d.getEdgeById(n) : null;
      switch (s) {
        case "edit-node-content":
          p instanceof L && p.data.editable && ((b = (C = p.htmlElement) == null ? void 0 : C.querySelector(".node-content")) == null || b.focus());
          break;
        case "delete-node":
          p && this.space.emit("ui:request:confirm", {
            message: `Delete node "${p.id.substring(0, 10)}..."?`,
            onConfirm: () => this.space.emit("ui:request:removeNode", p.id)
          });
          break;
        case "start-linking-node":
          p && this.space.emit("ui:request:startLinking", p);
          break;
        case "autozoom-node":
          p && this.space.emit("ui:request:autoZoomNode", p);
          break;
        case "toggle-pin-node":
          p && this.space.togglePinNode(p.id);
          break;
        case "edit-edge-style":
          f && this._uiPluginCallbacks.setSelectedEdge(f, !1);
          break;
        case "reverse-edge-direction":
          f && this.space.emit("ui:request:reverseEdge", f.id);
          break;
        case "delete-edge":
          f && this.space.emit("ui:request:confirm", {
            message: `Delete edge "${f.id.substring(0, 10)}..."?`,
            onConfirm: () => this.space.emit("ui:request:removeEdge", f.id)
          });
          break;
        case "create-html-node":
          l && this.space.emit("ui:request:createNode", { type: "html", position: l, data: { label: "New Node", content: "Edit me!" } });
          break;
        case "create-note-node":
          l && this.space.emit("ui:request:createNode", { type: "note", position: l, data: { content: "New Note ✨" } });
          break;
        case "create-shape-node-box":
          l && this.space.emit("ui:request:createNode", { type: "shape", position: l, data: { label: "Box Node 📦", shape: "box", size: 60, color: Math.random() * 16777215 } });
          break;
        case "create-shape-node-sphere":
          l && this.space.emit("ui:request:createNode", { type: "shape", position: l, data: { label: "Sphere Node 🌐", shape: "sphere", size: 60, color: Math.random() * 16777215 } });
          break;
        case "center-camera-view":
          this.space.emit("ui:request:centerView");
          break;
        case "reset-camera-view":
          this.space.emit("ui:request:resetView");
          break;
        case "toggle-background-visibility": {
          if (h) {
            const y = h.background.alpha === 0 ? 1 : 0, w = y === 0 ? 0 : document.body.classList.contains("theme-light") ? 16053492 : 1710621;
            this.space.emit("ui:request:toggleBackground", w, y);
          }
          break;
        }
        default:
          console.warn("ContextMenu: Unknown action:", s);
      }
    });
    g(this, "hide", () => {
      this.contextMenuElement.style.display === "block" && (this.contextMenuElement.style.display = "none", this.contextMenuElement.innerHTML = "", this.space.emit("ui:contextmenu:hidden"));
    });
    this.space = t, this.contextMenuElement = e, this._uiPluginCallbacks = s, this._bindEvents();
  }
  _bindEvents() {
    this.contextMenuElement.addEventListener("click", this._onContextMenuClick);
  }
  _getContextMenuItemsForNode(t) {
    const e = [];
    t instanceof L && t.data.editable && e.push({ label: "📝 Edit Content", action: "edit-node-content", nodeId: t.id }), e.push({ label: "🔗 Start Link", action: "start-linking-node", nodeId: t.id }), e.push({ label: "🔎 Auto Zoom", action: "autozoom-node", nodeId: t.id });
    const s = t.isPinned || !1;
    return e.push({ label: s ? "📌 Unpin" : "📌 Pin", action: "toggle-pin-node", nodeId: t.id }), e.push({ type: "separator" }), e.push({ label: "🗑️ Delete Node", action: "delete-node", nodeId: t.id, isDestructive: !0 }), e;
  }
  _getContextMenuItemsForEdge(t) {
    return [
      { label: "🎨 Edit Style", action: "edit-edge-style", edgeId: t.id },
      { label: "↔️ Reverse Direction", action: "reverse-edge-direction", edgeId: t.id },
      { type: "separator" },
      { label: "🗑️ Delete Edge", action: "delete-edge", edgeId: t.id, isDestructive: !0 }
    ];
  }
  _getContextMenuItemsForBackground(t) {
    const e = [];
    if (t) {
      const i = { positionX: t.x, positionY: t.y, positionZ: t.z };
      e.push({ label: "📄 Add HTML Node", action: "create-html-node", ...i }), e.push({ label: "📝 Add Note", action: "create-note-node", ...i }), e.push({ label: "📦 Add Box", action: "create-shape-node-box", ...i }), e.push({ label: "🌐 Add Sphere", action: "create-shape-node-sphere", ...i });
    }
    e.push({ type: "separator" }), e.push({ label: "🎯 Center View", action: "center-camera-view" }), e.push({ label: "🔄 Reset View", action: "reset-camera-view" });
    const s = this.space.plugins.getPlugin("RenderingPlugin");
    if (s) {
      const i = s.background.alpha === 0;
      e.push({
        label: i ? "🖼️ Opaque BG" : "💨 Transparent BG",
        action: "toggle-background-visibility"
      });
    }
    return e;
  }
  show(t, e, s) {
    let i = [];
    if (s.node)
      s.shiftKey || this._uiPluginCallbacks.setSelectedNode(s.node, !1), i = this._getContextMenuItemsForNode(s.node);
    else if (s.intersectedEdge)
      s.shiftKey || this._uiPluginCallbacks.setSelectedEdge(s.intersectedEdge, !1), i = this._getContextMenuItemsForEdge(s.intersectedEdge);
    else {
      s.shiftKey || this._uiPluginCallbacks.setSelectedNode(null, !1);
      const h = this.space.screenToWorld(t, e, 0);
      i = this._getContextMenuItemsForBackground(h);
    }
    if (i.length === 0) return;
    const n = this.contextMenuElement;
    n.innerHTML = "";
    const o = document.createElement("ul");
    i.forEach((h) => {
      const p = document.createElement("li");
      h.type === "separator" ? p.className = "separator" : (p.textContent = h.label, Object.keys(h).forEach((f) => {
        f !== "label" && f !== "type" && f !== "isDestructive" && h[f] !== void 0 && h[f] !== null && (p.dataset[f] = String(h[f]));
      }), h.disabled && p.classList.add("disabled"), h.isDestructive && p.classList.add("destructive")), o.appendChild(p);
    }), n.appendChild(o);
    const { offsetWidth: a, offsetHeight: r } = n, l = 5;
    let c = t + l;
    c + a > window.innerWidth - l && (c = t - a - l);
    let d = e + l;
    d + r > window.innerHeight - l && (d = e - r - l), n.style.left = `${Math.max(l, c)}px`, n.style.top = `${Math.max(l, d)}px`, n.style.display = "block", this.space.emit("ui:contextmenu:shown", { x: t, y: e, items: i });
  }
  dispose() {
    this.contextMenuElement.removeEventListener("click", this._onContextMenuClick), this.contextMenuElement = null, this.space = null, this._uiPluginCallbacks = null;
  }
}
class oo {
  constructor(t, e) {
    g(this, "hide", () => {
      var t, e;
      this.edgeMenuObject && ((t = this.edgeMenuObject.element) == null || t.remove(), (e = this.edgeMenuObject.parent) == null || e.remove(this.edgeMenuObject), this.edgeMenuObject = null, this.space.emit("ui:edgemenu:hidden"));
    });
    g(this, "updatePosition", (t) => {
      var i, n;
      if (!this.edgeMenuObject || !((i = this.edgeMenuObject.element) != null && i.parentNode) || !t) return;
      const e = new u.Vector3().lerpVectors(t.source.position, t.target.position, 0.5);
      this.edgeMenuObject.position.copy(e);
      const s = (n = this.space.plugins.getPlugin("CameraPlugin")) == null ? void 0 : n.getCameraInstance();
      s && this.edgeMenuObject.lookAt(s.position), this.edgeMenuObject.element.style.transform = `scale(${1 / this.space.plugins.getPlugin("RenderingPlugin").getCSS3DRenderer().getSize().width * 1e5})`;
    });
    this.space = t, this._uiPluginCallbacks = e, this.edgeMenuObject = null;
  }
  show(t) {
    var s, i;
    if (!t) return;
    this.hide();
    const e = this._createEdgeMenuElement(t);
    this.edgeMenuObject = new Ie(e), (i = (s = this.space.plugins.getPlugin("RenderingPlugin")) == null ? void 0 : s.getCSS3DScene()) == null || i.add(this.edgeMenuObject), this.updatePosition(t), this.space.emit("ui:edgemenu:shown", { edge: t });
  }
  _createEdgeMenuElement(t) {
    var i;
    const e = document.createElement("div");
    e.className = "edge-menu-frame", e.dataset.edgeId = t.id;
    const s = `#${((i = t.data.color) == null ? void 0 : i.toString(16).padStart(6, "0")) || "ffffff"}`;
    return e.innerHTML = `
            <input type="color" value="${s}" title="Edge Color" data-property="color">
            <input type="range" min="0.5" max="10" step="0.1" value="${t.data.thickness || 1}" title="Edge Thickness" data-property="thickness">
            <select title="Constraint Type" data-property="constraintType">
                ${["elastic", "rigid", "weld", "none"].map(
      (n) => `<option value="${n}" ${t.data.constraintType === n ? "selected" : ""}>${n.charAt(0).toUpperCase() + n.slice(1)}</option>`
    ).join("")}
            </select>
            <button title="Delete Edge" class="delete-button" data-action="delete-edge">×</button>
        `, e.addEventListener("input", (n) => {
      if (n.target instanceof HTMLInputElement || n.target instanceof HTMLSelectElement) {
        const o = n.target.dataset.property;
        if (!o) return;
        let a = n.target.value;
        n.target.type === "color" ? a = parseInt(a.substring(1), 16) : n.target.type === "range" && (a = parseFloat(a)), this.space.emit("ui:request:updateEdge", t.id, o, a);
      }
    }), e.addEventListener("click", (n) => {
      n.target.closest('button[data-action="delete-edge"]') && this.space.emit("ui:request:confirm", {
        message: `Delete edge "${t.id.substring(0, 10)}..."?`,
        onConfirm: () => this.space.emit("ui:request:removeEdge", t.id)
      });
    }), e.addEventListener("pointerdown", (n) => n.stopPropagation()), e.addEventListener("wheel", (n) => n.stopPropagation()), e;
  }
  dispose() {
    this.hide(), this.space = null, this._uiPluginCallbacks = null;
  }
}
class ao {
  constructor(t) {
    g(this, "hide", () => {
      this.keyboardShortcutsDialogElement && (this.keyboardShortcutsDialogElement.style.display = "none", this.space.emit("ui:keyboardshortcuts:hidden"));
    });
    this.space = t, this.keyboardShortcutsDialogElement = null, this.keyboardShortcuts = [
      { keys: ["Delete", "Backspace"], description: "Delete selected node(s) or edge(s)" },
      { keys: ["Escape"], description: "Close menus, cancel linking, deselect all, or exit pointer lock" },
      { keys: ["Enter"], description: "Focus content of selected HTML node (if editable)" },
      { keys: ["+", "="], description: "Zoom in content of selected HTML node" },
      { keys: ["Ctrl/Meta + +", "Ctrl/Meta + ="], description: "Increase size of selected HTML node" },
      { keys: ["-"], description: "Zoom out content of selected HTML node" },
      { keys: ["Ctrl/Meta + -"], description: "Decrease size of selected HTML node" },
      { keys: ["Spacebar"], description: "Focus on selected item or center view" },
      { keys: ["Scroll Wheel"], description: "Zoom camera" },
      { keys: ["Ctrl/Meta + Scroll Wheel"], description: "Adjust content scale of hovered HTML node" },
      { keys: ["Middle Mouse Button (on node)"], description: "Auto-zoom to node" },
      { keys: ["Alt + Drag Node (vertical)"], description: "Adjust node Z-depth" }
    ];
  }
  _createDialogElement() {
    var e;
    if (this.keyboardShortcutsDialogElement) return;
    this.keyboardShortcutsDialogElement = document.createElement("div"), this.keyboardShortcutsDialogElement.id = "keyboard-shortcuts-dialog", this.keyboardShortcutsDialogElement.className = "dialog", this.keyboardShortcutsDialogElement.addEventListener("pointerdown", (s) => s.stopPropagation());
    let t = `
            <h2>Keyboard Shortcuts</h2>
            <table class="shortcuts-table">
                <thead>
                    <tr>
                        <th>Key(s)</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;
    this.keyboardShortcuts.forEach((s) => {
      t += `
                <tr>
                    <td>${s.keys.map((i) => `<kbd>${i}</kbd>`).join(" / ")}</td>
                    <td>${s.description}</td>
                </tr>
            `;
    }), t += `
                </tbody>
            </table>
            <button id="close-shortcuts-dialog">Close</button>
        `, this.keyboardShortcutsDialogElement.innerHTML = t, document.body.appendChild(this.keyboardShortcutsDialogElement), (e = M("#close-shortcuts-dialog", this.keyboardShortcutsDialogElement)) == null || e.addEventListener("click", this.hide);
  }
  show() {
    this._createDialogElement(), this.keyboardShortcutsDialogElement.style.display = "block", this.space.emit("ui:keyboardshortcuts:shown");
  }
  dispose() {
    var t;
    this.keyboardShortcutsDialogElement && ((t = M("#close-shortcuts-dialog", this.keyboardShortcutsDialogElement)) == null || t.removeEventListener("click", this.hide), this.keyboardShortcutsDialogElement.remove(), this.keyboardShortcutsDialogElement = null), this.space = null;
  }
}
class ro {
  constructor(t) {
    g(this, "_onApplyLayout", () => {
      var e;
      const t = (e = M("#layout-select", this.layoutSettingsDialogElement)) == null ? void 0 : e.value;
      t && (this.space.emit("ui:request:applyLayout", t), setTimeout(() => this._updateContent(), 100));
    });
    g(this, "hide", () => {
      this.layoutSettingsDialogElement && (this.layoutSettingsDialogElement.style.display = "none", this.space.emit("ui:layoutsettings:hidden"));
    });
    this.space = t, this.layoutSettingsDialogElement = null;
  }
  _createDialogElement() {
    var t, e;
    this.layoutSettingsDialogElement || (this.layoutSettingsDialogElement = document.createElement("div"), this.layoutSettingsDialogElement.id = "layout-settings-dialog", this.layoutSettingsDialogElement.className = "dialog", this.layoutSettingsDialogElement.addEventListener("pointerdown", (s) => s.stopPropagation()), document.body.appendChild(this.layoutSettingsDialogElement), this.layoutSettingsDialogElement.innerHTML = `
            <h2>Layout Settings</h2>
            <div class="layout-controls"></div>
            <button id="apply-layout-button" style="margin-right: 10px;">Apply Layout</button>
            <button id="close-layout-dialog">Close</button>
        `, (t = M("#apply-layout-button", this.layoutSettingsDialogElement)) == null || t.addEventListener("click", this._onApplyLayout), (e = M("#close-layout-dialog", this.layoutSettingsDialogElement)) == null || e.addEventListener("click", this.hide));
  }
  _updateContent() {
    if (!this.layoutSettingsDialogElement || this.layoutSettingsDialogElement.style.display === "none") return;
    const t = this.space.plugins.getPlugin("LayoutPlugin");
    if (!(t != null && t.layoutManager)) {
      console.warn("LayoutPlugin not available for layout settings update.");
      return;
    }
    const e = t.layoutManager.getActiveLayoutName(), s = [...t.layoutManager.layouts.keys()];
    let i = `
            <div>
                <label for="layout-select">Current Layout: </label>
                <select id="layout-select">
        `;
    s.forEach((o) => {
      const a = o.charAt(0).toUpperCase() + o.slice(1);
      i += `<option value="${o}" ${o === e ? "selected" : ""}>${a}</option>`;
    }), i += `
                </select>
            </div>
            <div class="layout-options-container" style="margin-top: 15px; min-height: 50px;">
                <p><em>Layout-specific options will be available here in a future update.</em></p>
            </div>
        `, M(".layout-controls", this.layoutSettingsDialogElement).innerHTML = i;
    const n = M("#layout-select", this.layoutSettingsDialogElement);
    n && (n.value = e);
  }
  show() {
    this._createDialogElement(), this._updateContent(), this.layoutSettingsDialogElement.style.display = "block", this.space.emit("ui:layoutsettings:shown");
  }
  dispose() {
    var t, e;
    this.layoutSettingsDialogElement && ((t = M("#apply-layout-button", this.layoutSettingsDialogElement)) == null || t.removeEventListener("click", this._onApplyLayout), (e = M("#close-layout-dialog", this.layoutSettingsDialogElement)) == null || e.removeEventListener("click", this.hide), this.layoutSettingsDialogElement.remove(), this.layoutSettingsDialogElement = null), this.space = null;
  }
}
class lo {
  /**
   * Creates an instance of HudManager.
   * @param {SpaceGraph} space - The main SpaceGraph instance.
   * @param {HTMLElement} container - The main container element for the graph.
   * @param {object} uiPluginCallbacks - Callbacks provided by the UIPlugin.
   * @param {function} uiPluginCallbacks.getSelectedNodes - Function to get currently selected nodes.
   * @param {function} uiPluginCallbacks.getSelectedEdges - Function to get currently selected edges.
   */
  constructor(t, e, s) {
    /**
     * Toggles the visibility of the HUD popup menu.
     * Manages event listeners for closing the menu.
     * @param {Event} [event] - The click event that triggered the toggle.
     * @private
     */
    g(this, "_togglePopupMenu", (t) => {
      t == null || t.stopPropagation(), this.isPopupMenuVisible = !this.isPopupMenuVisible, this.isPopupMenuVisible ? (this.hudPopupMenu.classList.remove("hidden"), this.hudMainMenuButton.classList.add("active"), document.addEventListener("click", this._handleClickOutsideMenu, { capture: !0, once: !0 }), document.addEventListener("keydown", this._handleEscKey, { capture: !0, once: !0 })) : (this.hudPopupMenu.classList.add("hidden"), this.hudMainMenuButton.classList.remove("active"), document.removeEventListener("click", this._handleClickOutsideMenu, { capture: !0 }), document.removeEventListener("keydown", this._handleEscKey, { capture: !0 }));
    });
    g(this, "_handleClickOutsideMenu", (t) => {
      !this.hudPopupMenu.contains(t.target) && t.target !== this.hudMainMenuButton ? this.isPopupMenuVisible && this._togglePopupMenu() : this.isPopupMenuVisible && document.addEventListener("click", this._handleClickOutsideMenu, { capture: !0, once: !0 }), document.removeEventListener("keydown", this._handleEscKey, { capture: !0 });
    });
    /**
     * Handles the Escape key press to close the popup menu.
     * @param {KeyboardEvent} event - The keydown event.
     * @private
     */
    g(this, "_handleEscKey", (t) => {
      t.key === "Escape" && this.isPopupMenuVisible ? this._togglePopupMenu() : this.isPopupMenuVisible && document.addEventListener("keydown", this._handleEscKey, { capture: !0, once: !0 }), document.removeEventListener("click", this._handleClickOutsideMenu, { capture: !0 });
    });
    g(this, "_onModeIndicatorChange", (t) => {
      const e = t.target.value;
      this.space.emit("ui:request:setCameraMode", e);
    });
    /** @private */
    g(this, "_onKeyboardShortcutsButtonClick", () => {
      this.keyboardShortcutsDialog.show(), this.isPopupMenuVisible && this._togglePopupMenu();
    });
    /** @private */
    g(this, "_onLayoutSettingsButtonClick", () => {
      this.layoutSettingsDialog.show(), this.isPopupMenuVisible && this._togglePopupMenu();
    });
    this.space = t, this.container = e, this._uiPluginCallbacks = s, this.hudLayer = null, this.hudMainMenuButton = null, this.hudPopupMenu = null, this.hudModeIndicator = null, this.hudSelectionInfo = null, this.hudKeyboardShortcutsButton = null, this.hudLayoutSettingsButton = null, this.isPopupMenuVisible = !1, this.keyboardShortcutsDialog = new ao(t), this.layoutSettingsDialog = new ro(t), this._createHudElements(), this._bindEvents(), this.updateHudSelectionInfo(), this.updateHudCameraMode();
  }
  /**
   * Creates and appends all HUD elements to the DOM.
   * @private
   */
  _createHudElements() {
    var n;
    this.hudLayer = M("#hud-layer"), this.hudLayer || (this.hudLayer = document.createElement("div"), this.hudLayer.id = "hud-layer", this.container.parentNode.appendChild(this.hudLayer)), this.hudMainMenuButton = document.createElement("div"), this.hudMainMenuButton.id = "hud-main-menu-button", this.hudMainMenuButton.textContent = "☰", this.hudMainMenuButton.title = "Open Menu", this.hudLayer.appendChild(this.hudMainMenuButton), this.hudPopupMenu = document.createElement("div"), this.hudPopupMenu.id = "hud-popup-menu", this.hudPopupMenu.classList.add("hidden"), this.hudModeIndicator = document.createElement("select"), this.hudModeIndicator.id = "hud-mode-indicator";
    const t = ((n = this.space.plugins.getPlugin("CameraPlugin")) == null ? void 0 : n.getAvailableCameraModes()) || {
      orbit: "Orbit Control",
      free: "Free Look"
    };
    for (const o in t) {
      const a = document.createElement("option");
      a.value = o, a.textContent = t[o], this.hudModeIndicator.appendChild(a);
    }
    const e = this._createMenuGroup("Camera Mode:", this.hudModeIndicator);
    this.hudPopupMenu.appendChild(e), this.hudKeyboardShortcutsButton = document.createElement("button"), this.hudKeyboardShortcutsButton.id = "hud-keyboard-shortcuts-button", this.hudKeyboardShortcutsButton.innerHTML = '⌨️ <span class="label">Shortcuts</span>', this.hudKeyboardShortcutsButton.title = "View Keyboard Shortcuts";
    const s = this._createMenuGroup(null, this.hudKeyboardShortcutsButton);
    this.hudPopupMenu.appendChild(s), this.hudLayoutSettingsButton = document.createElement("button"), this.hudLayoutSettingsButton.id = "hud-layout-settings-button", this.hudLayoutSettingsButton.innerHTML = '📐 <span class="label">Layout</span>', this.hudLayoutSettingsButton.title = "Layout Settings";
    const i = this._createMenuGroup(null, this.hudLayoutSettingsButton);
    this.hudPopupMenu.appendChild(i), this.hudLayer.appendChild(this.hudPopupMenu), this.hudSelectionInfo = M("#hud-selection-info"), this.hudSelectionInfo || (this.hudSelectionInfo = document.createElement("div"), this.hudSelectionInfo.id = "hud-selection-info", this.hudLayer.appendChild(this.hudSelectionInfo));
  }
  /**
   * Helper method to create a group container for a HUD menu item.
   * @param {string|null} labelText - Text for the label. If null, no label is created.
   * @param {HTMLElement} controlElement - The control element (e.g., select, button) for the group.
   * @returns {HTMLDivElement} The created group element.
   * @private
   */
  _createMenuGroup(t, e) {
    const s = document.createElement("div");
    if (s.className = "hud-menu-group", t) {
      const i = document.createElement("label");
      i.textContent = t, e.id && (i.htmlFor = e.id), s.appendChild(i);
    }
    return s.appendChild(e), s;
  }
  /**
   * Binds event listeners to HUD elements.
   * @private
   */
  _bindEvents() {
    this.hudMainMenuButton.addEventListener("click", this._togglePopupMenu), this.hudModeIndicator.addEventListener("change", this._onModeIndicatorChange), this.hudKeyboardShortcutsButton.addEventListener("click", this._onKeyboardShortcutsButtonClick), this.hudLayoutSettingsButton.addEventListener("click", this._onLayoutSettingsButtonClick);
  }
  /**
   * Updates the HUD camera mode selector with the current camera mode
   * and ensures the list of available modes is current.
   * @param {string} [mode] - The camera mode to set. Defaults to the current mode from CameraPlugin.
   */
  updateHudCameraMode(t) {
    if (this.hudModeIndicator) {
      const e = this.space.plugins.getPlugin("CameraPlugin"), s = t || (e == null ? void 0 : e.getCameraMode()), i = e == null ? void 0 : e.getAvailableCameraModes();
      if (i) {
        const n = Array.from(this.hudModeIndicator.options).map((a) => a.value), o = Object.keys(i);
        if (n.length !== o.length || !o.every((a) => n.includes(a))) {
          this.hudModeIndicator.innerHTML = "";
          for (const a in i) {
            const r = document.createElement("option");
            r.value = a, r.textContent = i[a], this.hudModeIndicator.appendChild(r);
          }
        }
      }
      s && (this.hudModeIndicator.value = s);
    }
  }
  /**
   * Updates the HUD element that displays information about the current selection (nodes/edges).
   */
  updateHudSelectionInfo() {
    if (!this.hudSelectionInfo) return;
    const t = this._uiPluginCallbacks.getSelectedNodes(), e = this._uiPluginCallbacks.getSelectedEdges();
    if (t.size === 1) {
      const s = t.values().next().value;
      this.hudSelectionInfo.textContent = `Selected: Node ${s.data.label || s.id.substring(0, 8)}`;
    } else if (t.size > 1)
      this.hudSelectionInfo.textContent = `Selected: ${t.size} Nodes`;
    else if (e.size === 1) {
      const s = e.values().next().value;
      this.hudSelectionInfo.textContent = `Selected: Edge ${s.id.substring(0, 8)}`;
    } else e.size > 1 ? this.hudSelectionInfo.textContent = `Selected: ${e.size} Edges` : this.hudSelectionInfo.textContent = "Selected: None";
  }
  /**
   * Checks if the keyboard shortcuts dialog is currently visible.
   * @returns {boolean} True if visible, false otherwise.
   */
  isKeyboardShortcutsDialogVisible() {
    var t;
    return ((t = this.keyboardShortcutsDialog.keyboardShortcutsDialogElement) == null ? void 0 : t.style.display) === "block";
  }
  /**
   * Checks if the layout settings dialog is currently visible.
   * @returns {boolean} True if visible, false otherwise.
   */
  isLayoutSettingsDialogVisible() {
    var t;
    return ((t = this.layoutSettingsDialog.layoutSettingsDialogElement) == null ? void 0 : t.style.display) === "block";
  }
  /**
   * Hides all managed dialogs and the HUD popup menu.
   */
  hideAllDialogs() {
    this.keyboardShortcutsDialog.hide(), this.layoutSettingsDialog.hide(), this.isPopupMenuVisible && this._togglePopupMenu();
  }
  /**
   * Cleans up all resources, removes elements, and detaches event listeners.
   */
  dispose() {
    var t, e, s, i, n;
    (t = this.hudMainMenuButton) == null || t.removeEventListener("click", this._togglePopupMenu), (e = this.hudModeIndicator) == null || e.removeEventListener("change", this._onModeIndicatorChange), (s = this.hudKeyboardShortcutsButton) == null || s.removeEventListener("click", this._onKeyboardShortcutsButtonClick), (i = this.hudLayoutSettingsButton) == null || i.removeEventListener("click", this._onLayoutSettingsButtonClick), document.removeEventListener("click", this._handleClickOutsideMenu, { capture: !0 }), document.removeEventListener("keydown", this._handleEscKey, { capture: !0 }), (n = this.hudLayer) == null || n.remove(), this.hudLayer = null, this.hudMainMenuButton = null, this.hudPopupMenu = null, this.hudModeIndicator = null, this.hudSelectionInfo = null, this.hudKeyboardShortcutsButton = null, this.hudLayoutSettingsButton = null, this.keyboardShortcutsDialog.dispose(), this.layoutSettingsDialog.dispose(), this.space = null, this.container = null, this._uiPluginCallbacks = null;
  }
}
class co extends lo {
  constructor(t, e, s) {
    super(t, e, s), this.settings = {
      showPerformanceMetrics: !0,
      showMinimap: !1,
      showStatusBar: !0,
      showNotifications: !0,
      showProgressIndicators: !0,
      autoHideDelay: 3e3,
      hudOpacity: 0.9
    }, this.performanceMetrics = {
      fps: 0,
      frameTime: 0,
      nodeCount: 0,
      edgeCount: 0,
      lastUpdateTime: 0
    }, this.notifications = [], this.progressIndicators = /* @__PURE__ */ new Map(), this.statusItems = /* @__PURE__ */ new Map(), this._createAdvancedHudElements(), this._startPerformanceMonitoring(), this._subscribeToAdvancedEvents();
  }
  _createAdvancedHudElements() {
    this.performancePanel = this._createPerformancePanel(), this.minimapPanel = this._createMinimapPanel(), this.statusBar = this._createStatusBar(), this.notificationContainer = this._createNotificationContainer(), this.progressContainer = this._createProgressContainer(), this.cameraStatusIndicator = this._createCameraStatusIndicator(), this.layoutStatusIndicator = this._createLayoutStatusIndicator(), this.navigationControls = this._createNavigationControls(), this.viewModeControls = this._createViewModeControls(), this.quickActionsPanel = this._createQuickActionsPanel();
  }
  _createPerformancePanel() {
    const t = document.createElement("div");
    return t.id = "hud-performance-panel", t.className = "hud-panel hud-top-left", t.innerHTML = `
            <div class="hud-panel-header">
                <span class="hud-panel-title">Performance</span>
                <button class="hud-panel-toggle" title="Toggle Performance Monitor">📊</button>
            </div>
            <div class="hud-panel-content">
                <div class="performance-metric">
                    <span class="metric-label">FPS:</span>
                    <span class="metric-value" id="fps-value">60</span>
                </div>
                <div class="performance-metric">
                    <span class="metric-label">Frame Time:</span>
                    <span class="metric-value" id="frametime-value">16ms</span>
                </div>
                <div class="performance-metric">
                    <span class="metric-label">Nodes:</span>
                    <span class="metric-value" id="nodes-count">0</span>
                </div>
                <div class="performance-metric">
                    <span class="metric-label">Edges:</span>
                    <span class="metric-value" id="edges-count">0</span>
                </div>
                <div class="performance-metric">
                    <span class="metric-label">Memory:</span>
                    <span class="metric-value" id="memory-usage">0MB</span>
                </div>
            </div>
        `, this.hudLayer.appendChild(t), this._bindPanelToggle(t), t;
  }
  _createMinimapPanel() {
    const t = document.createElement("div");
    return t.id = "hud-minimap-panel", t.className = "hud-panel hud-top-right", t.innerHTML = `
            <div class="hud-panel-header">
                <span class="hud-panel-title">Minimap</span>
                <button class="hud-panel-toggle" title="Toggle Minimap">🗺️</button>
            </div>
            <div class="hud-panel-content">
                <canvas id="minimap-canvas" width="150" height="150"></canvas>
                <div class="minimap-controls">
                    <button id="minimap-zoom-in" title="Zoom In">+</button>
                    <button id="minimap-zoom-out" title="Zoom Out">-</button>
                    <button id="minimap-center" title="Center View">⌖</button>
                </div>
            </div>
        `, this.hudLayer.appendChild(t), this._bindPanelToggle(t), this._initMinimap(t.querySelector("#minimap-canvas")), t;
  }
  _createStatusBar() {
    const t = document.createElement("div");
    return t.id = "hud-status-bar", t.className = "hud-status-bar hud-bottom-full", t.innerHTML = `
            <div class="status-section status-left">
                <span class="status-item" id="layout-status">Layout: Force</span>
                <span class="status-item" id="camera-mode-status">Camera: Orbit</span>
                <span class="status-item" id="selection-count-status">Selected: 0</span>
            </div>
            <div class="status-section status-center">
                <span class="status-item" id="current-action-status">Ready</span>
            </div>
            <div class="status-section status-right">
                <span class="status-item" id="zoom-level-status">Zoom: 100%</span>
                <span class="status-item" id="coordinates-status">0, 0, 0</span>
                <span class="status-item" id="time-status"></span>
            </div>
        `, this.hudLayer.appendChild(t), this._startTimeUpdater(t.querySelector("#time-status")), t;
  }
  _createNotificationContainer() {
    const t = document.createElement("div");
    return t.id = "hud-notifications", t.className = "hud-notifications hud-top-center", this.hudLayer.appendChild(t), t;
  }
  _createProgressContainer() {
    const t = document.createElement("div");
    return t.id = "hud-progress-indicators", t.className = "hud-progress-container hud-bottom-center", this.hudLayer.appendChild(t), t;
  }
  _createCameraStatusIndicator() {
    const t = document.createElement("div");
    return t.id = "hud-camera-status", t.className = "hud-indicator hud-right-center", t.innerHTML = `
            <div class="indicator-icon" id="camera-mode-icon">📹</div>
            <div class="indicator-details">
                <div class="indicator-line" id="camera-position">Pos: 0, 0, 0</div>
                <div class="indicator-line" id="camera-target">Target: 0, 0, 0</div>
                <div class="indicator-line" id="camera-distance">Distance: 0</div>
            </div>
        `, this.hudLayer.appendChild(t), t;
  }
  _createLayoutStatusIndicator() {
    const t = document.createElement("div");
    return t.id = "hud-layout-status", t.className = "hud-indicator hud-left-center", t.innerHTML = `
            <div class="indicator-icon" id="layout-mode-icon">🔗</div>
            <div class="indicator-details">
                <div class="indicator-line" id="layout-type">Type: Force</div>
                <div class="indicator-line" id="layout-running">Status: Running</div>
                <div class="indicator-line" id="layout-energy">Energy: 0</div>
            </div>
        `, this.hudLayer.appendChild(t), t;
  }
  _createNavigationControls() {
    const t = document.createElement("div");
    return t.id = "hud-navigation-controls", t.className = "hud-controls hud-bottom-right", t.innerHTML = `
            <div class="control-group">
                <button class="nav-button" id="nav-zoom-in" title="Zoom In">🔍+</button>
                <button class="nav-button" id="nav-zoom-out" title="Zoom Out">🔍-</button>
            </div>
            <div class="control-group">
                <button class="nav-button" id="nav-center" title="Center View">⌖</button>
                <button class="nav-button" id="nav-reset" title="Reset View">🏠</button>
            </div>
            <div class="control-group">
                <button class="nav-button" id="nav-fullscreen" title="Toggle Fullscreen">⛶</button>
                <button class="nav-button" id="nav-screenshot" title="Take Screenshot">📸</button>
            </div>
        `, this.hudLayer.appendChild(t), this._bindNavigationControls(t), t;
  }
  _createViewModeControls() {
    const t = document.createElement("div");
    return t.id = "hud-view-mode-controls", t.className = "hud-controls hud-top-center-right", t.innerHTML = `
            <div class="view-mode-toggle">
                <button class="mode-button active" id="mode-3d" title="3D View">3D</button>
                <button class="mode-button" id="mode-2d" title="2D View">2D</button>
            </div>
            <div class="view-options">
                <button class="option-button" id="toggle-grid" title="Toggle Grid">⊞</button>
                <button class="option-button" id="toggle-axes" title="Toggle Axes">⊥</button>
                <button class="option-button" id="toggle-labels" title="Toggle Labels">🏷️</button>
                <button class="option-button" id="toggle-shadows" title="Toggle Shadows">☀️</button>
            </div>
        `, this.hudLayer.appendChild(t), this._bindViewModeControls(t), t;
  }
  _createQuickActionsPanel() {
    const t = document.createElement("div");
    return t.id = "hud-quick-actions", t.className = "hud-panel hud-bottom-left", t.innerHTML = `
            <div class="hud-panel-header">
                <span class="hud-panel-title">Quick Actions</span>
                <button class="hud-panel-toggle" title="Toggle Quick Actions">⚡</button>
            </div>
            <div class="hud-panel-content">
                <div class="action-group">
                    <button class="action-button" id="action-add-node" title="Add Node">➕ Node</button>
                    <button class="action-button" id="action-add-edge" title="Add Edge">🔗 Edge</button>
                </div>
                <div class="action-group">
                    <button class="action-button" id="action-select-all" title="Select All">◉ All</button>
                    <button class="action-button" id="action-clear-selection" title="Clear Selection">◯ Clear</button>
                </div>
                <div class="action-group">
                    <button class="action-button" id="action-auto-layout" title="Auto Layout">🎯 Auto</button>
                    <button class="action-button" id="action-export" title="Export Graph">💾 Export</button>
                </div>
            </div>
        `, this.hudLayer.appendChild(t), this._bindPanelToggle(t), this._bindQuickActions(t), t;
  }
  _bindPanelToggle(t) {
    const e = t.querySelector(".hud-panel-toggle"), s = t.querySelector(".hud-panel-content");
    e && s && e.addEventListener("click", () => {
      const i = !s.classList.contains("collapsed");
      s.classList.toggle("collapsed", i), e.classList.toggle("collapsed", i);
    });
  }
  _bindNavigationControls(t) {
    const e = this.space.plugins.getPlugin("CameraPlugin");
    t.querySelector("#nav-zoom-in").addEventListener("click", () => {
      e == null || e.zoom(-5);
    }), t.querySelector("#nav-zoom-out").addEventListener("click", () => {
      e == null || e.zoom(5);
    }), t.querySelector("#nav-center").addEventListener("click", () => {
      e == null || e.centerView();
    }), t.querySelector("#nav-reset").addEventListener("click", () => {
      e == null || e.resetView();
    }), t.querySelector("#nav-fullscreen").addEventListener("click", () => {
      this._toggleFullscreen();
    }), t.querySelector("#nav-screenshot").addEventListener("click", () => {
      this._takeScreenshot();
    });
  }
  _bindViewModeControls(t) {
    const e = t.querySelector("#mode-3d"), s = t.querySelector("#mode-2d");
    e.addEventListener("click", () => {
      e.classList.add("active"), s.classList.remove("active"), this._setViewMode("3d");
    }), s.addEventListener("click", () => {
      s.classList.add("active"), e.classList.remove("active"), this._setViewMode("2d");
    }), t.querySelector("#toggle-grid").addEventListener("click", () => {
      this._toggleGrid();
    }), t.querySelector("#toggle-axes").addEventListener("click", () => {
      this._toggleAxes();
    }), t.querySelector("#toggle-labels").addEventListener("click", () => {
      this._toggleLabels();
    }), t.querySelector("#toggle-shadows").addEventListener("click", () => {
      this._toggleShadows();
    });
  }
  _bindQuickActions(t) {
    t.querySelector("#action-add-node").addEventListener("click", () => {
      this._addRandomNode();
    }), t.querySelector("#action-add-edge").addEventListener("click", () => {
      this.space.emit("ui:request:startLinking");
    }), t.querySelector("#action-select-all").addEventListener("click", () => {
      this._selectAllNodes();
    }), t.querySelector("#action-clear-selection").addEventListener("click", () => {
      this._clearSelection();
    }), t.querySelector("#action-auto-layout").addEventListener("click", () => {
      this._applyAutoLayout();
    }), t.querySelector("#action-export").addEventListener("click", () => {
      this._exportGraph();
    });
  }
  _initMinimap(t) {
    if (!t) return;
    this.minimapCanvas = t, this.minimapCtx = t.getContext("2d");
    const e = t.parentElement.querySelector("#minimap-zoom-in"), s = t.parentElement.querySelector("#minimap-zoom-out"), i = t.parentElement.querySelector("#minimap-center");
    e == null || e.addEventListener("click", () => this._minimapZoom(1.2)), s == null || s.addEventListener("click", () => this._minimapZoom(0.8)), i == null || i.addEventListener("click", () => this._minimapCenter()), t.addEventListener("click", (n) => this._minimapClick(n)), this._updateMinimap();
  }
  _startPerformanceMonitoring() {
    let t = 0, e = performance.now();
    const s = () => {
      var n, o;
      t++;
      const i = performance.now();
      if (i - e >= 1e3) {
        this.performanceMetrics.fps = t, this.performanceMetrics.frameTime = (i - e) / t;
        const a = this.space.plugins.getPlugin("NodePlugin"), r = this.space.plugins.getPlugin("EdgePlugin");
        this.performanceMetrics.nodeCount = ((n = a == null ? void 0 : a.getNodes()) == null ? void 0 : n.size) || 0, this.performanceMetrics.edgeCount = ((o = r == null ? void 0 : r.getEdges()) == null ? void 0 : o.size) || 0, this._updatePerformanceDisplay(), t = 0, e = i;
      }
      requestAnimationFrame(s);
    };
    s();
  }
  _startTimeUpdater(t) {
    if (!t) return;
    const e = () => {
      const s = /* @__PURE__ */ new Date();
      t.textContent = s.toLocaleTimeString();
    };
    e(), setInterval(e, 1e3);
  }
  _subscribeToAdvancedEvents() {
    this.space.on("camera:moved", () => this._updateCameraStatus()), this.space.on("camera:modeChanged", () => this._updateCameraStatus()), this.space.on("camera:autoZoomToggled", () => this._updateCameraStatus()), this.space.on("camera:autoRotationToggled", () => this._updateCameraStatus()), this.space.on("layout:started", (t) => this._updateLayoutStatus(t)), this.space.on("layout:stopped", (t) => this._updateLayoutStatus(t)), this.space.on("layout:adapted", (t) => this._updateLayoutStatus(t)), this.space.on("selection:changed", () => this._updateSelectionStatus()), this.space.on("node:added", () => this._updateGraphStatus()), this.space.on("node:removed", () => this._updateGraphStatus()), this.space.on("edge:added", () => this._updateGraphStatus()), this.space.on("edge:removed", () => this._updateGraphStatus());
  }
  _updatePerformanceDisplay() {
    const t = M("#fps-value"), e = M("#frametime-value"), s = M("#nodes-count"), i = M("#edges-count"), n = M("#memory-usage");
    if (t && (t.textContent = Math.round(this.performanceMetrics.fps)), e && (e.textContent = `${this.performanceMetrics.frameTime.toFixed(1)}ms`), s && (s.textContent = this.performanceMetrics.nodeCount), i && (i.textContent = this.performanceMetrics.edgeCount), n && performance.memory) {
      const o = performance.memory.usedJSHeapSize / 1048576;
      n.textContent = `${o.toFixed(1)}MB`;
    }
  }
  _updateCameraStatus() {
    var a;
    const t = this.space.plugins.getPlugin("CameraPlugin");
    if (!t) return;
    const e = t.getCameraInstance(), s = t.getCameraMode(), i = ((a = t.getAdvancedControlsStatus) == null ? void 0 : a.call(t)) || {}, n = M("#camera-position");
    if (M("#camera-target"), M("#camera-distance"), n && e) {
      const r = e.position;
      n.textContent = `Pos: ${r.x.toFixed(1)}, ${r.y.toFixed(1)}, ${r.z.toFixed(1)}`;
    }
    const o = M("#camera-mode-status");
    if (o) {
      let r = `Camera: ${s}`;
      i.autoZoom && (r += " [AutoZoom]"), i.autoRotation && (r += " [AutoRotate]"), i.peekMode && (r += " [Peek]"), i.cinematicMode && (r += " [Cinematic]"), o.textContent = r;
    }
  }
  _updateLayoutStatus(t) {
    const e = M("#layout-type"), s = M("#layout-running");
    M("#layout-energy");
    const i = M("#layout-status");
    e && t && (e.textContent = `Type: ${t.name || "Unknown"}`), s && (s.textContent = (t == null ? void 0 : t.type) === "started" ? "Status: Running" : "Status: Stopped"), i && t && (i.textContent = `Layout: ${t.name || "Unknown"}`);
  }
  _updateSelectionStatus() {
    const t = this._uiPluginCallbacks.getSelectedNodes(), e = this._uiPluginCallbacks.getSelectedEdges(), s = t.size + e.size, i = M("#selection-count-status");
    i && (i.textContent = `Selected: ${s}`);
  }
  _updateGraphStatus() {
    this._updateMinimap();
  }
  _updateMinimap() {
    var d, h;
    if (!this.minimapCanvas || !this.minimapCtx) return;
    const t = this.minimapCtx, e = this.minimapCanvas;
    t.clearRect(0, 0, e.width, e.height), t.fillStyle = "rgba(20, 20, 30, 0.8)", t.fillRect(0, 0, e.width, e.height);
    const s = this.space.plugins.getPlugin("NodePlugin"), i = this.space.plugins.getPlugin("EdgePlugin"), n = Array.from(((d = s == null ? void 0 : s.getNodes()) == null ? void 0 : d.values()) || []), o = Array.from(((h = i == null ? void 0 : i.getEdges()) == null ? void 0 : h.values()) || []);
    if (n.length === 0) return;
    const a = this._calculateMinimapBounds(n), r = Math.min(e.width / a.width, e.height / a.height) * 0.8, l = (e.width - a.width * r) / 2, c = (e.height - a.height * r) / 2;
    t.strokeStyle = "rgba(100, 150, 255, 0.5)", t.lineWidth = 1, o.forEach((p) => {
      const f = this._worldToMinimap(p.source.position, a, r, l, c), C = this._worldToMinimap(p.target.position, a, r, l, c);
      t.beginPath(), t.moveTo(f.x, f.y), t.lineTo(C.x, C.y), t.stroke();
    }), n.forEach((p) => {
      const f = this._worldToMinimap(p.position, a, r, l, c), C = this._uiPluginCallbacks.getSelectedNodes().has(p);
      t.fillStyle = C ? "#ffff00" : "#64B5F6", t.beginPath(), t.arc(f.x, f.y, C ? 3 : 2, 0, Math.PI * 2), t.fill();
    }), this._drawCameraIndicator(t, a, r, l, c);
  }
  _calculateMinimapBounds(t) {
    let e = 1 / 0, s = 1 / 0, i = -1 / 0, n = -1 / 0;
    t.forEach((a) => {
      e = Math.min(e, a.position.x), s = Math.min(s, a.position.y), i = Math.max(i, a.position.x), n = Math.max(n, a.position.y);
    });
    const o = 50;
    return {
      minX: e - o,
      minY: s - o,
      maxX: i + o,
      maxY: n + o,
      width: i - e + 2 * o,
      height: n - s + 2 * o
    };
  }
  _worldToMinimap(t, e, s, i, n) {
    return {
      x: (t.x - e.minX) * s + i,
      y: (t.y - e.minY) * s + n
    };
  }
  _drawCameraIndicator(t, e, s, i, n) {
    const o = this.space.plugins.getPlugin("CameraPlugin");
    if (!o) return;
    const a = o.getCameraInstance();
    if (!a) return;
    const r = this._worldToMinimap(a.position, e, s, i, n);
    t.strokeStyle = "#ff6b6b", t.lineWidth = 2, t.beginPath(), t.arc(r.x, r.y, 8, 0, Math.PI * 2), t.stroke(), t.beginPath(), t.moveTo(r.x, r.y), t.lineTo(r.x, r.y - 12), t.stroke();
  }
  // Notification System
  showNotification(t, e = "info", s = 3e3) {
    const i = document.createElement("div");
    return i.className = `hud-notification hud-notification-${e}`, i.innerHTML = `
            <div class="notification-icon">${this._getNotificationIcon(e)}</div>
            <div class="notification-content">${t}</div>
            <button class="notification-close" title="Close">×</button>
        `, i.querySelector(".notification-close").addEventListener("click", () => this._removeNotification(i)), this.notificationContainer.appendChild(i), this.notifications.push(i), s > 0 && setTimeout(() => this._removeNotification(i), s), requestAnimationFrame(() => {
      i.classList.add("notification-visible");
    }), i;
  }
  _getNotificationIcon(t) {
    const e = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌"
    };
    return e[t] || e.info;
  }
  _removeNotification(t) {
    t.classList.remove("notification-visible"), setTimeout(() => {
      t.parentNode && t.parentNode.removeChild(t), this.notifications = this.notifications.filter((e) => e !== t);
    }, 300);
  }
  // Progress Indicators
  showProgress(t, e, s = 0) {
    let i = this.progressIndicators.get(t);
    i || (i = document.createElement("div"), i.className = "hud-progress-indicator", i.innerHTML = `
                <div class="progress-label">${e}</div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-percent">0%</div>
            `, this.progressContainer.appendChild(i), this.progressIndicators.set(t, i));
    const n = i.querySelector(".progress-fill"), o = i.querySelector(".progress-percent");
    n.style.width = `${Math.max(0, Math.min(100, s))}%`, o.textContent = `${Math.round(s)}%`, s >= 100 && setTimeout(() => this.hideProgress(t), 1e3);
  }
  hideProgress(t) {
    const e = this.progressIndicators.get(t);
    e && e.parentNode && (e.parentNode.removeChild(e), this.progressIndicators.delete(t));
  }
  // Utility methods for quick actions
  _addRandomNode() {
    const t = {
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400,
      z: (Math.random() - 0.5) * 200
    }, e = ["ControlPanelNode", "ProgressNode", "TextMeshNode", "ShapeNode"], s = e[Math.floor(Math.random() * e.length)], i = this.space.addNode({
      id: `quick_node_${Date.now()}`,
      type: s,
      position: t,
      data: { content: "Quick Node" }
    });
    return this.showNotification(`Added ${s}`, "success", 2e3), i;
  }
  _selectAllNodes() {
    var s;
    const t = this.space.plugins.getPlugin("NodePlugin"), e = Array.from(((s = t == null ? void 0 : t.getNodes()) == null ? void 0 : s.values()) || []);
    e.forEach((i) => {
      this._uiPluginCallbacks.setSelectedNode(i, !0);
    }), this.showNotification(`Selected ${e.length} nodes`, "info", 2e3);
  }
  _clearSelection() {
    this._uiPluginCallbacks.setSelectedNode(null, !1), this._uiPluginCallbacks.setSelectedEdge(null, !1), this.showNotification("Selection cleared", "info", 2e3);
  }
  _applyAutoLayout() {
    var e;
    const t = this.space.plugins.getPlugin("LayoutPlugin");
    if ((e = t == null ? void 0 : t.layoutManager) != null && e.toggleAutoZoom) {
      const s = t.layoutManager.toggleAutoZoom();
      this.showNotification(`Auto-zoom ${s ? "enabled" : "disabled"}`, "info", 2e3);
    }
  }
  _exportGraph() {
    const t = this.space.exportGraphToJSON();
    if (t) {
      const e = new Blob([JSON.stringify(t, null, 2)], { type: "application/json" }), s = URL.createObjectURL(e), i = document.createElement("a");
      i.href = s, i.download = `spacegraph_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`, i.click(), URL.revokeObjectURL(s), this.showNotification("Graph exported successfully", "success", 2e3);
    }
  }
  _toggleFullscreen() {
    var t, e, s;
    document.fullscreenElement ? (s = document.exitFullscreen) == null || s.call(document) : (e = (t = this.container).requestFullscreen) == null || e.call(t);
  }
  _takeScreenshot() {
    this.space.plugins.getPlugin("RenderingPlugin") && this.showNotification("Screenshot feature not yet implemented", "warning", 2e3);
  }
  _setViewMode(t) {
    this.space.emit("ui:request:setViewMode", t), this.showNotification(`Switched to ${t.toUpperCase()} view`, "info", 2e3);
  }
  _toggleGrid() {
    this.space.emit("ui:request:toggleGrid"), this.showNotification("Grid toggled", "info", 1500);
  }
  _toggleAxes() {
    this.space.emit("ui:request:toggleAxes"), this.showNotification("Axes toggled", "info", 1500);
  }
  _toggleLabels() {
    this.space.emit("ui:request:toggleLabels"), this.showNotification("Labels toggled", "info", 1500);
  }
  _toggleShadows() {
    this.space.emit("ui:request:toggleShadows"), this.showNotification("Shadows toggled", "info", 1500);
  }
  // Minimap interaction
  _minimapZoom(t) {
    const e = this.space.plugins.getPlugin("CameraPlugin");
    e == null || e.zoom(t > 1 ? -5 : 5);
  }
  _minimapCenter() {
    const t = this.space.plugins.getPlugin("CameraPlugin");
    t == null || t.centerView();
  }
  _minimapClick(t) {
    const e = this.minimapCanvas.getBoundingClientRect();
    t.clientX - e.left, t.clientY - e.top, this.showNotification("Minimap navigation coming soon", "info", 1500);
  }
  // Override parent methods to include advanced features
  updateHudSelectionInfo() {
    super.updateHudSelectionInfo(), this._updateSelectionStatus();
  }
  updateHudCameraMode(t) {
    super.updateHudCameraMode(t), this._updateCameraStatus();
  }
  // Configuration
  updateHudSettings(t) {
    this.settings = { ...this.settings, ...t }, this.hudLayer && (this.hudLayer.style.opacity = this.settings.hudOpacity), this.performancePanel && (this.performancePanel.style.display = this.settings.showPerformanceMetrics ? "block" : "none"), this.minimapPanel && (this.minimapPanel.style.display = this.settings.showMinimap ? "block" : "none"), this.statusBar && (this.statusBar.style.display = this.settings.showStatusBar ? "block" : "none");
  }
  getHudSettings() {
    return { ...this.settings };
  }
  dispose() {
    this.notifications.forEach((t) => this._removeNotification(t)), this.progressIndicators.forEach((t, e) => this.hideProgress(e)), super.dispose();
  }
}
class ho {
  constructor(t, e) {
    this.space = t, this.toolbarElement = e, this._setupToolbar();
  }
  _setupToolbar() {
    if (!this.toolbarElement) return;
    this.toolbarElement.innerHTML = "", [
      { id: "tb-add-node", text: "➕", title: "Add Default Node", action: "addNode" },
      { id: "tb-center-view", text: "🎯", title: "Center View", action: "centerView" },
      { id: "tb-reset-view", text: "🔄", title: "Reset View", action: "resetView" },
      { id: "tb-toggle-theme", text: "🎨", title: "Toggle Light/Dark Theme", action: "toggleTheme" }
    ].forEach((e) => {
      const s = document.createElement("button");
      s.id = e.id, s.textContent = e.text, s.title = e.title, s.addEventListener("click", () => this._handleToolbarAction(e.action)), this.toolbarElement.appendChild(s);
    });
  }
  _handleToolbarAction(t) {
    switch (t) {
      case "addNode": {
        const e = this.space.plugins.getPlugin("CameraPlugin"), s = e == null ? void 0 : e.getCameraInstance();
        let i = { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100, z: 0 };
        if (s) {
          const n = new u.Vector3(), o = new u.Vector3();
          s.getWorldPosition(n), s.getWorldDirection(o);
          const r = n.add(o.multiplyScalar(300));
          i = { x: r.x, y: r.y, z: 0 };
        }
        this.space.emit("ui:request:createNode", {
          type: "html",
          position: i,
          data: { label: "New Node", content: "Edit me!" }
        });
        break;
      }
      case "centerView":
        this.space.emit("ui:request:centerView");
        break;
      case "resetView":
        this.space.emit("ui:request:resetView");
        break;
      case "toggleTheme": {
        document.body.classList.toggle("theme-light");
        const e = document.body.classList.contains("theme-light") ? "light" : "dark";
        localStorage.setItem("spacegraph-theme", e), this.space.emit("theme:changed", { theme: e });
        break;
      }
      default:
        console.warn("Toolbar: Unknown action:", t);
    }
  }
  dispose() {
    this.toolbarElement && (this.toolbarElement.innerHTML = "", this.toolbarElement = null), this.space = null;
  }
}
class uo {
  constructor(t, e, s, i) {
    g(this, "space", null);
    g(this, "container", null);
    // Decomposed components
    g(this, "confirmDialog", null);
    g(this, "contextMenu", null);
    g(this, "edgeMenu", null);
    g(this, "hudManager", null);
    g(this, "toolbar", null);
    g(this, "currentState", k.IDLE);
    g(this, "activePointerId", null);
    g(this, "draggedNode", null);
    g(this, "draggedNodeInitialZ", 0);
    g(this, "dragOffset", new u.Vector3());
    g(this, "resizedNode", null);
    g(this, "resizeStartPointerPos", { x: 0, y: 0 });
    g(this, "resizeStartNodeSize", { width: 0, height: 0 });
    g(this, "resizeNodeScreenScaleX", 1);
    g(this, "resizeNodeScreenScaleY", 1);
    g(this, "hoveredEdge", null);
    g(this, "pointerState", {
      down: !1,
      button: -1,
      clientX: 0,
      clientY: 0,
      startClientX: 0,
      startClientY: 0,
      isDraggingThresholdMet: !1,
      DRAG_THRESHOLD: 5
    });
    g(this, "tempLinkLine", null);
    // Callbacks provided by the UIPlugin
    g(this, "_uiPluginCallbacks", {
      setSelectedNode: () => {
      },
      setSelectedEdge: () => {
      },
      cancelLinking: () => {
      },
      getIsLinking: () => !1,
      getLinkSourceNode: () => null,
      getSelectedNodes: () => /* @__PURE__ */ new Set(),
      getSelectedEdges: () => /* @__PURE__ */ new Set(),
      completeLinking: () => {
      }
    });
    g(this, "_onRequestConfirm", (t) => {
      this.confirmDialog.show(t.message, t.onConfirm);
    });
    g(this, "_onCameraModeChanged", (t) => {
      this.hudManager.updateHudCameraMode(t.newMode);
    });
    g(this, "_onSelectionChanged", (t) => {
      const e = t.selected.size > 0 && t.type === "edge" ? t.selected : /* @__PURE__ */ new Set();
      if (e.size === 1) {
        const s = e.values().next().value;
        !this.edgeMenu.edgeMenuObject || this.edgeMenu.edgeMenuObject.element.dataset.edgeId !== s.id ? this.edgeMenu.show(s) : this.edgeMenu.updatePosition(s);
      } else
        this.edgeMenu.hide();
      this.hudManager.updateHudSelectionInfo();
    });
    g(this, "_onPointerDown", (t) => {
      var i;
      if (this.activePointerId !== null && this.activePointerId !== t.pointerId) return;
      this.activePointerId = t.pointerId, this._updateNormalizedPointerState(t, !0);
      const e = this._getTargetInfo(t), s = this.space.plugins.getPlugin("CameraPlugin");
      if (!((s == null ? void 0 : s.getCameraMode()) === "free" && ((i = s.getControls()) != null && i.isPointerLocked) && this.pointerState.button === 0)) {
        if (this.pointerState.button === 1) {
          t.preventDefault(), e.node && this.space.emit("ui:request:autoZoomNode", e.node);
          return;
        }
        if (this.pointerState.button === 0) {
          if (e.nodeControls) {
            t.preventDefault(), t.stopPropagation(), this._handleNodeControlButtonClick(e.nodeControls, e.node);
            return;
          }
          if (e.resizeHandle && e.node instanceof L) {
            t.preventDefault(), t.stopPropagation(), this._transitionToState(k.RESIZING_NODE, { node: e.node }), this._uiPluginCallbacks.setSelectedNode(e.node, !1), this.contextMenu.hide();
            return;
          }
          if (e.node) {
            if (t.preventDefault(), e.contentEditable || e.interactiveElement) {
              t.stopPropagation(), this._uiPluginCallbacks.setSelectedNode(e.node, t.shiftKey), this.contextMenu.hide();
              return;
            }
            this._transitionToState(k.DRAGGING_NODE, { node: e.node }), this._uiPluginCallbacks.setSelectedNode(e.node, t.shiftKey), this.contextMenu.hide();
            return;
          }
          if (e.intersectedEdge) {
            t.preventDefault(), this._uiPluginCallbacks.setSelectedEdge(e.intersectedEdge, t.shiftKey), this.contextMenu.hide();
            return;
          }
          this._transitionToState(k.PANNING), this.contextMenu.hide(), t.shiftKey || this._uiPluginCallbacks.setSelectedNode(null, !1);
        }
      }
    });
    g(this, "_onPointerMove", (t) => {
      var o, a, r, l;
      if (t.pointerId !== this.activePointerId && this.activePointerId !== null) return;
      const e = this.pointerState.clientX, s = this.pointerState.clientY;
      this._updateNormalizedPointerState(t);
      const i = this.pointerState.clientX - e, n = this.pointerState.clientY - s;
      switch (this.currentState) {
        case k.IDLE:
          this._handleHover(t);
          break;
        case k.DRAGGING_NODE:
          if (t.preventDefault(), this.draggedNode) {
            let h = this.draggedNodeInitialZ;
            t.altKey && (h -= n * 1, this.draggedNodeInitialZ = h);
            const p = this.space.screenToWorld(this.pointerState.clientX, this.pointerState.clientY, h);
            if (p) {
              const f = p.clone().sub(this.dragOffset);
              f.z = h;
              const C = f.clone().sub(this.draggedNode.position), b = this._uiPluginCallbacks.getSelectedNodes();
              (b == null ? void 0 : b.size) > 0 && b.has(this.draggedNode) ? b.forEach((y) => {
                if (y === this.draggedNode)
                  y.drag(f);
                else {
                  const w = y.position.clone().add(C);
                  y.drag(w);
                }
              }) : this.draggedNode.drag(f), this.space.emit("graph:node:dragged", { node: this.draggedNode, position: f });
            }
          }
          break;
        case k.RESIZING_NODE:
          if (t.preventDefault(), this.resizedNode) {
            const h = this.pointerState.clientX - this.resizeStartPointerPos.x, p = this.pointerState.clientY - this.resizeStartPointerPos.y, f = h / (this.resizeNodeScreenScaleX || 1), C = p / (this.resizeNodeScreenScaleY || 1), b = this.resizeStartNodeSize.width + f, y = this.resizeStartNodeSize.height + C;
            this.resizedNode.resize(
              Math.max(L.MIN_SIZE.width, b),
              Math.max(L.MIN_SIZE.height, y)
            ), this.space.emit("graph:node:resized", { node: this.resizedNode, size: { ...this.resizedNode.size } });
          }
          break;
        case k.PANNING:
          t.preventDefault(), (o = this.space.plugins.getPlugin("CameraPlugin")) == null || o.pan(i, n);
          break;
        case k.LINKING_NODE:
          t.preventDefault(), this._updateTempLinkLine(this.pointerState.clientX, this.pointerState.clientY);
          const c = this._getTargetInfo(t);
          Zt(".node-common.linking-target").forEach((h) => h.classList.remove("linking-target"));
          const d = ((a = c.node) == null ? void 0 : a.htmlElement) ?? ((l = (r = c.node) == null ? void 0 : r.labelObject) == null ? void 0 : l.element);
          c.node && c.node !== this._uiPluginCallbacks.getLinkSourceNode() && d && d.classList.add("linking-target");
          break;
      }
    });
    g(this, "_onPointerUp", (t) => {
      var s;
      if (t.pointerId !== this.activePointerId) return;
      this._updateNormalizedPointerState(t, !1);
      const e = this.currentState;
      if (!this.pointerState.isDraggingThresholdMet && t.button === 0) {
        const i = this._getTargetInfo(t);
        i.node instanceof L && i.node.data.editable && ((s = i.element) == null || s.closest(".node-content"), i.node.htmlElement.querySelector(".node-content"));
      }
      e === k.LINKING_NODE && t.button === 0 && this._uiPluginCallbacks.completeLinking(this.pointerState.clientX, this.pointerState.clientY), this._transitionToState(k.IDLE), this.activePointerId = null;
    });
    g(this, "_onContextMenu", (t) => {
      t.preventDefault(), this._updateNormalizedPointerState(t), this.contextMenu.hide();
      const e = this._getTargetInfo(t);
      this.contextMenu.show(t.clientX, t.clientY, {
        node: e.node,
        intersectedEdge: e.intersectedEdge,
        shiftKey: t.shiftKey
      });
    });
    g(this, "_onDocumentClick", (t) => {
      var e, s, i, n;
      if (!(this.contextMenu.contextMenuElement.contains(t.target) || this.contextMenu.contextMenuElement.style.display === "none") && !((s = (e = this.edgeMenu.edgeMenuObject) == null ? void 0 : e.element) != null && s.contains(t.target)) && !this.confirmDialog.confirmDialogElement.contains(t.target) && !((i = this.hudManager.keyboardShortcutsDialog.keyboardShortcutsDialogElement) != null && i.contains(t.target)) && !((n = this.hudManager.layoutSettingsDialog.layoutSettingsDialogElement) != null && n.contains(t.target)) && (this.contextMenu.hide(), this.edgeMenu.edgeMenuObject)) {
        const o = this._getTargetInfo(t), a = this._uiPluginCallbacks.getSelectedEdges();
        o.intersectedEdge && (a == null ? void 0 : a.has(o.intersectedEdge)) || this._uiPluginCallbacks.setSelectedEdge(null, !1);
      }
    });
    g(this, "_onKeyDown", (t) => {
      var l, c, d;
      const e = document.activeElement, s = e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.isContentEditable);
      if (s && t.key !== "Escape") return;
      const i = this._uiPluginCallbacks.getSelectedNodes(), n = this._uiPluginCallbacks.getSelectedEdges(), o = i.size > 0 ? i.values().next().value : null, a = n.size > 0 ? n.values().next().value : null;
      let r = !1;
      switch (t.key) {
        case "Delete":
        case "Backspace":
          if (o) {
            const p = i.size > 1 ? `Delete ${i.size} selected nodes?` : `Delete node "${o.id.substring(0, 10)}..."?`;
            this.space.emit("ui:request:confirm", {
              message: p,
              onConfirm: () => i.forEach((f) => this.space.emit("ui:request:removeNode", f.id))
            }), r = !0;
          } else if (a) {
            const p = n.size > 1 ? `Delete ${n.size} selected edges?` : `Delete edge "${a.id.substring(0, 10)}..."?`;
            this.space.emit("ui:request:confirm", {
              message: p,
              onConfirm: () => n.forEach((f) => this.space.emit("ui:request:removeEdge", f.id))
            }), r = !0;
          }
          break;
        case "Escape":
          this._uiPluginCallbacks.getIsLinking() ? (this._uiPluginCallbacks.cancelLinking(), r = !0) : this.hudManager.isLayoutSettingsDialogVisible() ? (this.hudManager.layoutSettingsDialog.hide(), r = !0) : this.hudManager.isKeyboardShortcutsDialogVisible() ? (this.hudManager.keyboardShortcutsDialog.hide(), r = !0) : this.contextMenu.contextMenuElement.style.display === "block" ? (this.contextMenu.hide(), r = !0) : this.confirmDialog.confirmDialogElement.style.display === "block" ? (this.confirmDialog.hide(), r = !0) : this.edgeMenu.edgeMenuObject ? (this._uiPluginCallbacks.setSelectedEdge(null, !1), r = !0) : (i.size > 0 || n.size > 0) && (this._uiPluginCallbacks.setSelectedNode(null, !1), r = !0);
          const h = this.space.plugins.getPlugin("CameraPlugin");
          (h == null ? void 0 : h.getCameraMode()) === "free" && ((l = h.getControls()) != null && l.isPointerLocked) && (h.exitPointerLock(), r = !0);
          break;
        case "Enter":
          o instanceof L && o.data.editable && !s && ((d = (c = o.htmlElement) == null ? void 0 : c.querySelector(".node-content")) == null || d.focus(), r = !0);
          break;
        case "+":
        case "=":
          if (o instanceof L) {
            const p = t.key === "+" || t.key === "=" ? 1.15 : 1.2;
            t.ctrlKey || t.metaKey ? this.space.emit("ui:request:adjustNodeSize", o, p) : this.space.emit("ui:request:adjustContentScale", o, p), r = !0;
          }
          break;
        case "-":
        case "_":
          if (o instanceof L) {
            const p = t.key === "-" || t.key === "_" ? 0.8695652173913044 : 0.8333333333333334;
            t.ctrlKey || t.metaKey ? this.space.emit("ui:request:adjustNodeSize", o, p) : this.space.emit("ui:request:adjustContentScale", o, p), r = !0;
          }
          break;
        case " ":
          if (o)
            this.space.emit("ui:request:focusOnNode", o, 0.5, !0), r = !0;
          else if (a) {
            const p = new u.Vector3().lerpVectors(a.source.position, a.target.position, 0.5), f = a.source.position.distanceTo(a.target.position), C = this.space.plugins.getPlugin("CameraPlugin");
            C == null || C.pushState(), C == null || C.moveTo(p.x, p.y, p.z + f * 0.6 + 100, 0.5, p), r = !0;
          } else
            this.space.emit("ui:request:centerView"), r = !0;
          break;
      }
      r && (t.preventDefault(), t.stopPropagation());
    });
    g(this, "_onWheel", (t) => {
      var s, i;
      const e = this._getTargetInfo(t);
      if (!((s = e.element) != null && s.closest(".node-content") && e.element.scrollHeight > e.element.clientHeight) && !((i = e.element) != null && i.closest('.edge-menu-frame input[type="range"]')))
        if ((t.ctrlKey || t.metaKey) && e.node instanceof L) {
          t.preventDefault(), t.stopPropagation();
          const n = t.deltaY < 0 ? 1.1 : 1 / 1.1;
          this.space.emit("ui:request:adjustContentScale", e.node, n);
        } else
          t.preventDefault(), this.space.emit("ui:request:zoomCamera", t.deltaY);
    });
    g(this, "_onLinkingStarted", (t) => {
      this._transitionToState(k.LINKING_NODE, { sourceNode: t.sourceNode });
    });
    g(this, "_onLinkingCancelled", (t) => {
      this._removeTempLinkLine(), this.currentState === k.LINKING_NODE && this._transitionToState(k.IDLE);
    });
    g(this, "_onLinkingCompleted", (t) => {
      this._removeTempLinkLine(), this.currentState === k.LINKING_NODE && this._transitionToState(k.IDLE);
    });
    if (!t || !e || !s)
      throw new Error("UIManager requires SpaceGraph instance and UI elements.");
    this.space = t, this.container = t.container, this._uiPluginCallbacks = { ...this._uiPluginCallbacks, ...i }, this.confirmDialog = new io(this.space, s), this.contextMenu = new no(this.space, e, this._uiPluginCallbacks), this.edgeMenu = new oo(this.space, this._uiPluginCallbacks), this.hudManager = new co(this.space, this.container, this._uiPluginCallbacks), this.toolbar = new ho(this.space, M("#toolbar")), this._applySavedTheme(), this._bindEvents(), this._subscribeToSpaceGraphEvents();
  }
  _applySavedTheme() {
    localStorage.getItem("spacegraph-theme") === "light" ? document.body.classList.add("theme-light") : document.body.classList.remove("theme-light");
  }
  _bindEvents() {
    const t = { passive: !1 };
    this.container.addEventListener("pointerdown", this._onPointerDown, t), window.addEventListener("pointermove", this._onPointerMove, t), window.addEventListener("pointerup", this._onPointerUp, t), this.container.addEventListener("contextmenu", this._onContextMenu, t), document.addEventListener("click", this._onDocumentClick, !0), window.addEventListener("keydown", this._onKeyDown), this.container.addEventListener("wheel", this._onWheel, t), this.space.on("ui:request:confirm", this._onRequestConfirm);
  }
  _subscribeToSpaceGraphEvents() {
    this.space.on("selection:changed", this._onSelectionChanged), this.space.on("linking:started", this._onLinkingStarted), this.space.on("linking:cancelled", this._onLinkingCancelled), this.space.on("linking:succeeded", this._onLinkingCompleted), this.space.on("linking:failed", this._onLinkingCompleted), this.space.on("camera:modeChanged", this._onCameraModeChanged);
  }
  _updateNormalizedPointerState(t, e = void 0) {
    if (this.pointerState.clientX = t.clientX, this.pointerState.clientY = t.clientY, e !== void 0 && (this.pointerState.down = e, e ? (this.pointerState.button = t.button, this.pointerState.startClientX = t.clientX, this.pointerState.startClientY = t.clientY, this.pointerState.isDraggingThresholdMet = !1) : this.pointerState.button = -1), this.pointerState.down && !this.pointerState.isDraggingThresholdMet) {
      const s = this.pointerState.clientX - this.pointerState.startClientX, i = this.pointerState.clientY - this.pointerState.startClientY;
      Math.sqrt(s * s + i * i) > this.pointerState.DRAG_THRESHOLD && (this.pointerState.isDraggingThresholdMet = !0);
    }
  }
  _transitionToState(t, e = {}) {
    var s, i, n, o;
    if (this.currentState !== t) {
      switch (console.log(`UIManager: Exiting state: ${this.currentState}, transitioning to ${t}`), this.currentState) {
        case k.DRAGGING_NODE:
          (s = this.draggedNode) == null || s.endDrag(), this.container.style.cursor = "grab", this.draggedNode = null;
          break;
        case k.RESIZING_NODE:
          (i = this.resizedNode) == null || i.endResize(), this.container.style.cursor = "grab", this.resizedNode = null;
          break;
        case k.PANNING:
          (n = this.space.plugins.getPlugin("CameraPlugin")) == null || n.endPan(), this.container.style.cursor = "grab";
          break;
        case k.LINKING_NODE:
          this.container.style.cursor = "grab", Zt(".node-common.linking-target").forEach((a) => a.classList.remove("linking-target"));
          break;
      }
      switch (this.currentState = t, t) {
        case k.DRAGGING_NODE:
          this.draggedNode = e.node, this.draggedNodeInitialZ = this.draggedNode.position.z, this.draggedNode.startDrag();
          const a = this.space.screenToWorld(
            this.pointerState.clientX,
            this.pointerState.clientY,
            this.draggedNodeInitialZ
          );
          this.dragOffset = a ? a.sub(this.draggedNode.position) : new u.Vector3(), this.container.style.cursor = "grabbing";
          break;
        case k.RESIZING_NODE:
          this.resizedNode = e.node, this.resizedNode.startResize(), this.resizeStartNodeSize = { ...this.resizedNode.size }, this.resizeStartPointerPos = { x: this.pointerState.clientX, y: this.pointerState.clientY }, this.container.style.cursor = "nwse-resize";
          const r = this.resizedNode, l = this.space.plugins.getPlugin("CameraPlugin"), c = l == null ? void 0 : l.getCameraInstance();
          if (r && c && r.cssObject) {
            const d = new u.Vector3(0, 0, 0), h = new u.Vector3(1, 0, 0), p = new u.Vector3(0, 1, 0), f = d.clone().applyMatrix4(r.cssObject.matrixWorld), C = h.clone().applyMatrix4(r.cssObject.matrixWorld), b = p.clone().applyMatrix4(r.cssObject.matrixWorld), y = f.clone().project(c), w = C.clone().project(c), v = b.clone().project(c), I = window.innerWidth / 2, x = window.innerHeight / 2, A = {
              x: y.x * I + I,
              y: -y.y * x + x
            }, E = {
              x: w.x * I + I,
              y: -w.y * x + x
            }, N = {
              x: v.x * I + x,
              y: -v.y * x + x
            };
            this.resizeNodeScreenScaleX = Math.abs(E.x - A.x), this.resizeNodeScreenScaleY = Math.abs(N.y - A.y), this.resizeNodeScreenScaleX < 1e-3 && (this.resizeNodeScreenScaleX = 1e-3), this.resizeNodeScreenScaleY < 1e-3 && (this.resizeNodeScreenScaleY = 1e-3);
          } else
            this.resizeNodeScreenScaleX = 1, this.resizeNodeScreenScaleY = 1;
          break;
        case k.PANNING:
          (o = this.space.plugins.getPlugin("CameraPlugin")) == null || o.startPan(this.pointerState.clientX, this.pointerState.clientY), this.container.style.cursor = "grabbing";
          break;
        case k.LINKING_NODE:
          this.container.style.cursor = "crosshair", this._createTempLinkLine(e.sourceNode);
          break;
        case k.IDLE:
          this.container.style.cursor = "grab";
          break;
      }
      this.space.emit("interaction:stateChanged", { newState: t, oldState: this.currentState, data: e });
    }
  }
  _handleNodeControlButtonClick(t, e) {
    if (!(e instanceof L)) return;
    const s = [...t.classList].find((n) => n.startsWith("node-") && !n.includes("button")), i = s == null ? void 0 : s.substring(5);
    switch (i) {
      case "delete":
        this.space.emit("ui:request:confirm", {
          message: `Delete node "${e.id.substring(0, 10)}..."?`,
          onConfirm: () => this.space.emit("ui:request:removeNode", e.id)
        });
        break;
      case "content-zoom-in":
        this.space.emit("ui:request:adjustContentScale", e, 1.15);
        break;
      case "content-zoom-out":
        this.space.emit("ui:request:adjustContentScale", e, 1 / 1.15);
        break;
      case "grow":
        this.space.emit("ui:request:adjustNodeSize", e, 1.2);
        break;
      case "shrink":
        this.space.emit("ui:request:adjustNodeSize", e, 1 / 1.2);
        break;
      default:
        console.warn("UIManager: Unknown node control action:", i);
    }
  }
  _getTargetInfo(t) {
    var d;
    const e = document.elementFromPoint(t.clientX, t.clientY), s = e == null ? void 0 : e.closest(".node-common"), i = e == null ? void 0 : e.closest(".resize-handle"), n = e == null ? void 0 : e.closest(".node-controls button"), o = e == null ? void 0 : e.closest('[contenteditable="true"]'), a = e == null ? void 0 : e.closest("button, input, textarea, select, a, .clickable");
    let r = s ? (d = this.space.plugins.getPlugin("NodePlugin")) == null ? void 0 : d.getNodeById(s.dataset.nodeId) : null, l = null;
    if (!i && !n && !o && !a) {
      const h = this.space.intersectedObjects(t.clientX, t.clientY);
      h && (h.node && !r && (r = h.node), l = h.edge || null);
    }
    return {
      element: e,
      nodeElement: s,
      resizeHandle: i,
      nodeControls: n,
      contentEditable: o,
      interactiveElement: a,
      node: r,
      intersectedEdge: l
    };
  }
  _handleHover(t) {
    if (this.pointerState.down || this.currentState !== k.IDLE) {
      this.hoveredEdge && (this._uiPluginCallbacks.getSelectedEdges().has(this.hoveredEdge) || this.hoveredEdge.setHighlight(!1), this.hoveredEdge = null);
      return;
    }
    const s = this._getTargetInfo(t).intersectedEdge;
    if (this.hoveredEdge !== s) {
      const i = this._uiPluginCallbacks.getSelectedEdges();
      this.hoveredEdge && !i.has(this.hoveredEdge) && this.hoveredEdge.setHighlight(!1), this.hoveredEdge = s, this.hoveredEdge && !i.has(this.hoveredEdge) && this.hoveredEdge.setHighlight(!0);
    }
  }
  _createTempLinkLine(t) {
    var n, o;
    this._removeTempLinkLine();
    const e = new u.LineDashedMaterial({
      color: 16755200,
      linewidth: 2,
      dashSize: 8,
      gapSize: 4,
      transparent: !0,
      opacity: 0.9,
      depthTest: !1
    }), s = [t.position.clone(), t.position.clone()], i = new u.BufferGeometry().setFromPoints(s);
    this.tempLinkLine = new u.Line(i, e), this.tempLinkLine.computeLineDistances(), this.tempLinkLine.renderOrder = 1, (o = (n = this.space.plugins.getPlugin("RenderingPlugin")) == null ? void 0 : n.getWebGLScene()) == null || o.add(this.tempLinkLine);
  }
  _updateTempLinkLine(t, e) {
    if (!this.tempLinkLine || !this._uiPluginCallbacks.getIsLinking() || !this._uiPluginCallbacks.getLinkSourceNode()) return;
    const s = this._uiPluginCallbacks.getLinkSourceNode(), i = this.space.screenToWorld(t, e, s.position.z);
    if (i) {
      const n = this.tempLinkLine.geometry.attributes.position;
      n.setXYZ(1, i.x, i.y, i.z), n.needsUpdate = !0, this.tempLinkLine.geometry.computeBoundingSphere(), this.tempLinkLine.computeLineDistances();
    }
  }
  _removeTempLinkLine() {
    var t, e, s, i;
    this.tempLinkLine && ((t = this.tempLinkLine.geometry) == null || t.dispose(), (e = this.tempLinkLine.material) == null || e.dispose(), (i = (s = this.space.plugins.getPlugin("RenderingPlugin")) == null ? void 0 : s.getWebGLScene()) == null || i.remove(this.tempLinkLine), this.tempLinkLine = null);
  }
  dispose() {
    const t = { passive: !1 };
    this.container.removeEventListener("pointerdown", this._onPointerDown, t), window.removeEventListener("pointermove", this._onPointerMove, t), window.removeEventListener("pointerup", this._onPointerUp, t), this.container.removeEventListener("contextmenu", this._onContextMenu, t), document.removeEventListener("click", this._onDocumentClick, !0), window.removeEventListener("keydown", this._onKeyDown), this.container.removeEventListener("wheel", this._onWheel, t), this.space.off("ui:request:confirm", this._onRequestConfirm), this.space.off("selection:changed", this._onSelectionChanged), this.space.off("linking:started", this._onLinkingStarted), this.space.off("linking:cancelled", this._onLinkingCancelled), this.space.off("linking:succeeded", this._onLinkingCompleted), this.space.off("linking:failed", this._onLinkingCompleted), this.space.off("camera:modeChanged", this._onCameraModeChanged), this._removeTempLinkLine(), this.confirmDialog.dispose(), this.contextMenu.dispose(), this.edgeMenu.dispose(), this.hudManager.dispose(), this.toolbar.dispose(), this.space = null, this.container = null, this.draggedNode = null, this.resizedNode = null, this.hoveredEdge = null, this._uiPluginCallbacks = null, console.log("UIManager disposed.");
  }
}
class go extends U {
  constructor(e, s, i, n) {
    super(e, s);
    g(this, "uiManager", null);
    g(this, "selectedNodes", /* @__PURE__ */ new Set());
    g(this, "selectedEdges", /* @__PURE__ */ new Set());
    g(this, "linkSourceNode", null);
    g(this, "isLinking", !1);
    g(this, "_onNodeRemoved", (e, s) => {
      var i;
      s && this.selectedNodes.delete(s), ((i = this.linkSourceNode) == null ? void 0 : i.id) === e && this.cancelLinking(), this._emitSelectionChange();
    });
    g(this, "_onEdgeRemoved", (e, s) => {
      s && this.selectedEdges.delete(s), this._emitSelectionChange();
    });
    g(this, "startLinking", (e) => {
      e && (this.linkSourceNode = e, this.isLinking = !0, this.space.emit("linking:started", { sourceNode: e }));
    });
    g(this, "cancelLinking", () => {
      this.linkSourceNode = null, this.isLinking = !1, this.space.emit("linking:cancelled");
    });
    g(this, "completeLinking", (e, s) => {
      if (!this.isLinking || !this.linkSourceNode) return;
      const i = this.space.intersectedObjects(e, s), n = i == null ? void 0 : i.node;
      n && n !== this.linkSourceNode ? (this.space.emit("ui:request:addEdge", this.linkSourceNode, n), this.space.emit("linking:succeeded", { source: this.linkSourceNode, target: n })) : this.space.emit("linking:failed"), this.cancelLinking();
    });
    g(this, "getIsLinking", () => this.isLinking);
    g(this, "getLinkSourceNode", () => this.linkSourceNode);
    this.uiManager = new uo(
      e,
      i,
      n,
      {
        setSelectedNode: this.setSelectedNode.bind(this),
        setSelectedEdge: this.setSelectedEdge.bind(this),
        cancelLinking: this.cancelLinking.bind(this),
        getIsLinking: this.getIsLinking.bind(this),
        getLinkSourceNode: this.getLinkSourceNode.bind(this),
        getSelectedNodes: this.getSelectedNodes.bind(this),
        getSelectedEdges: this.getSelectedEdges.bind(this),
        completeLinking: this.completeLinking.bind(this)
      }
    );
  }
  getName() {
    return "UIPlugin";
  }
  init() {
    super.init(), this._subscribeToEvents();
  }
  _subscribeToEvents() {
    this.space.on("node:removed", this._onNodeRemoved), this.space.on("edge:removed", this._onEdgeRemoved), this.space.on("ui:request:startLinking", this.startLinking);
  }
  setSelectedNode(e, s = !1) {
    s || (this.selectedNodes.forEach((i) => i.setSelectedStyle(!1)), this.selectedNodes.clear(), this.selectedEdges.forEach((i) => i.setHighlight(!1)), this.selectedEdges.clear()), e ? this.selectedNodes.has(e) ? (this.selectedNodes.delete(e), e.setSelectedStyle(!1)) : (this.selectedNodes.add(e), e.setSelectedStyle(!0)) : s || (this.selectedNodes.forEach((i) => i.setSelectedStyle(!1)), this.selectedNodes.clear()), this._emitSelectionChange();
  }
  setSelectedEdge(e, s = !1) {
    s || (this.selectedEdges.forEach((i) => i.setHighlight(!1)), this.selectedEdges.clear(), this.selectedNodes.forEach((i) => i.setSelectedStyle(!1)), this.selectedNodes.clear()), e ? this.selectedEdges.has(e) ? (this.selectedEdges.delete(e), e.setHighlight(!1)) : (this.selectedEdges.add(e), e.setHighlight(!0)) : s || (this.selectedEdges.forEach((i) => i.setHighlight(!1)), this.selectedEdges.clear()), this._emitSelectionChange();
  }
  _emitSelectionChange() {
    const e = /* @__PURE__ */ new Set([...this.selectedNodes, ...this.selectedEdges]), s = this.selectedNodes.size > 0 ? "node" : this.selectedEdges.size > 0 ? "edge" : "none";
    this.space.emit("selection:changed", { selected: e, type: s });
  }
  getSelectedNode() {
    return this.selectedNodes.values().next().value || null;
  }
  getSelectedNodes() {
    return this.selectedNodes;
  }
  getSelectedEdge() {
    return this.selectedEdges.values().next().value || null;
  }
  getSelectedEdges() {
    return this.selectedEdges;
  }
  update() {
    var e, s;
    if (this.selectedEdges.size === 1) {
      const i = this.selectedEdges.values().next().value;
      (s = (e = this.uiManager) == null ? void 0 : e.edgeMenu) == null || s.updatePosition(i);
    }
  }
  dispose() {
    var e;
    super.dispose(), this.space.off("node:removed", this._onNodeRemoved), this.space.off("edge:removed", this._onEdgeRemoved), this.space.off("ui:request:startLinking", this.startLinking), (e = this.uiManager) == null || e.dispose(), this.uiManager = null, this.selectedNodes.clear(), this.selectedEdges.clear(), this.linkSourceNode = null;
  }
}
const cs = 200, ds = 10, po = 2236979, mo = 0.7, ct = 43775, fo = 16755200;
class yo extends U {
  constructor(e, s) {
    super(e, s);
    g(this, "minimapCamera", null);
    g(this, "nodeProxies", /* @__PURE__ */ new Map());
    g(this, "frustumHelper", null);
    g(this, "minimapScene", null);
    g(this, "currentViewport", new u.Vector4());
    g(this, "currentScissor", new u.Vector4());
    this.minimapScene = new u.Scene();
  }
  getName() {
    return "MinimapPlugin";
  }
  init() {
    var e;
    super.init(), this._setupMinimapCamera(), this._setupFrustumHelper(), this.space.on("node:added", this._addNodeProxy.bind(this)), this.space.on("node:removed", this._removeNodeProxy.bind(this)), (e = this.pluginManager.getPlugin("NodePlugin")) == null || e.getNodes().forEach((s) => this._addNodeProxy(s));
  }
  _setupMinimapCamera() {
    this.minimapCamera = new u.OrthographicCamera(
      -2e3 * 1 / 2,
      2e3 * 1 / 2,
      2e3 / 2,
      -2e3 / 2,
      1,
      1e4
    ), this.minimapCamera.position.set(0, 0, 1e3), this.minimapCamera.lookAt(0, 0, 0), this.minimapScene.add(this.minimapCamera);
  }
  _setupFrustumHelper() {
    var s;
    if ((s = this.pluginManager.getPlugin("CameraPlugin")) == null ? void 0 : s.getCameraInstance()) {
      const i = new u.BufferGeometry(), n = new u.LineBasicMaterial({ color: fo, linewidth: 2 });
      this.frustumHelper = new u.LineSegments(i, n), this.frustumHelper.frustumCulled = !1, this.minimapScene.add(this.frustumHelper);
    }
  }
  _addNodeProxy(e) {
    if (this.nodeProxies.has(e.id)) return;
    const s = new u.PlaneGeometry(1, 1), i = new u.MeshBasicMaterial({
      color: e.data.color || ct,
      side: u.DoubleSide
    }), n = new u.Mesh(s, i);
    n.userData.nodeId = e.id, this.nodeProxies.set(e.id, n), this.minimapScene.add(n);
  }
  _removeNodeProxy(e) {
    const s = typeof e == "string" ? e : e.id, i = this.nodeProxies.get(s);
    i && (this.minimapScene.remove(i), i.geometry.dispose(), i.material.dispose(), this.nodeProxies.delete(s));
  }
  _updateNodeProxies() {
    const e = this.pluginManager.getPlugin("NodePlugin");
    e && e.getNodes().forEach((s) => {
      const i = this.nodeProxies.get(s.id);
      if (i) {
        i.position.copy(s.position);
        const n = Math.max(20, s.getBoundingSphereRadius() * 0.5);
        i.scale.set(n, n, 1), i.material.color.getHex() !== (s.data.color || ct) && i.material.color.set(s.data.color || ct);
      }
    });
  }
  _updateFrustumHelper() {
    var p;
    const e = (p = this.pluginManager.getPlugin("CameraPlugin")) == null ? void 0 : p.getCameraInstance();
    if (!this.frustumHelper || !e) return;
    e.updateMatrixWorld(), e.updateProjectionMatrix();
    const s = new u.Vector3();
    e.getWorldPosition(s);
    const i = new u.Vector3();
    e.getWorldDirection(i), i.multiplyScalar(-s.z / i.z).add(s);
    const n = e.aspect, o = e.fov * u.MathUtils.DEG2RAD, a = 2 * Math.tan(o / 2) * Math.abs(s.z - i.z), l = a * n / 2, c = a / 2, d = [
      i.x - l,
      i.y + c,
      0,
      i.x + l,
      i.y + c,
      0,
      i.x + l,
      i.y - c,
      0,
      i.x - l,
      i.y - c,
      0
    ], h = new Float32Array([
      d[0],
      d[1],
      d[2],
      d[3],
      d[4],
      d[5],
      d[3],
      d[4],
      d[5],
      d[6],
      d[7],
      d[8],
      d[6],
      d[7],
      d[8],
      d[9],
      d[10],
      d[11],
      d[9],
      d[10],
      d[11],
      d[0],
      d[1],
      d[2]
    ]);
    this.frustumHelper.geometry.setAttribute("position", new u.BufferAttribute(h, 3)), this.frustumHelper.geometry.attributes.position.needsUpdate = !0, this.frustumHelper.geometry.computeBoundingSphere();
  }
  render(e) {
    if (!this.minimapCamera) return;
    this._updateNodeProxies(), this._updateFrustumHelper(), e.getSize(this.currentViewport);
    const s = e.getClearColor(new u.Color()), i = e.getClearAlpha(), n = e.getRenderTarget(), o = cs, a = cs, r = this.currentViewport.x - o - ds, l = ds;
    e.setViewport(r, l, o, a), e.setScissor(r, l, o, a), e.setScissorTest(!0), e.setClearColor(po, mo), e.clearDepth(), e.render(this.minimapScene, this.minimapCamera), e.setViewport(0, 0, this.currentViewport.x, this.currentViewport.y), e.setScissor(0, 0, this.currentViewport.x, this.currentViewport.y), e.setScissorTest(!1), e.setClearColor(s, i), n && e.setRenderTarget(n);
  }
  dispose() {
    super.dispose(), this.space.off("node:added", this._addNodeProxy.bind(this)), this.space.off("node:removed", this._removeNodeProxy.bind(this)), this.nodeProxies.forEach((e) => {
      this.minimapScene.remove(e), e.geometry.dispose(), e.material.dispose();
    }), this.nodeProxies.clear(), this.frustumHelper && (this.minimapScene.remove(this.frustumHelper), this.frustumHelper.geometry.dispose(), this.frustumHelper.material.dispose()), this.minimapScene.clear();
  }
}
class bo extends U {
  constructor(t, e) {
    super(t, e);
  }
  getName() {
    return "DataPlugin";
  }
  init() {
    super.init();
  }
  exportGraphToJSON(t = { prettyPrint: !1, includeCamera: !1 }) {
    var o;
    const e = this.pluginManager.getPlugin("NodePlugin"), s = this.pluginManager.getPlugin("EdgePlugin"), i = this.pluginManager.getPlugin("CameraPlugin");
    if (!e || !s)
      return console.error("DataPlugin: Node/Edge Plugin not available."), null;
    const n = {
      nodes: [...e.getNodes().values()].map((a) => ({
        id: a.id,
        type: a.data.type || "unknown",
        position: { x: a.position.x, y: a.position.y, z: a.position.z },
        mass: a.mass,
        isPinned: a.isPinned || !1,
        data: { ...a.data }
      })),
      edges: [...s.getEdges().values()].map((a) => ({
        sourceId: a.source.id,
        targetId: a.target.id,
        data: { ...a.data }
      }))
    };
    if (t.includeCamera && i) {
      const a = i.getControls();
      a && (n.camera = {
        position: { x: a.targetPosition.x, y: a.targetPosition.y, z: a.targetPosition.z },
        lookAt: { x: a.targetLookAt.x, y: a.targetLookAt.y, z: a.targetLookAt.z },
        mode: ((o = a.getCameraMode) == null ? void 0 : o.call(a)) || "orbit"
      });
    }
    try {
      return JSON.stringify(n, null, t.prettyPrint ? 2 : void 0);
    } catch (a) {
      return console.error("DataPlugin: Error serializing graph:", a), null;
    }
  }
  async importGraphFromJSON(t, e = { clearExistingGraph: !0 }) {
    var c, d;
    const s = this.pluginManager.getPlugin("NodePlugin"), i = this.pluginManager.getPlugin("EdgePlugin"), n = this.pluginManager.getPlugin("LayoutPlugin"), o = this.pluginManager.getPlugin("CameraPlugin");
    if (!s || !i || !n)
      return console.error("DataPlugin: Required plugins (Node, Edge, Layout) not available."), !1;
    let a;
    try {
      if (a = typeof t == "string" ? JSON.parse(t) : t, !(a != null && a.nodes) || !Array.isArray(a.nodes) || !a.edges || !Array.isArray(a.edges))
        throw new Error("Invalid graph data structure.");
    } catch (h) {
      return console.error("DataPlugin: Error parsing JSON:", h), !1;
    }
    e.clearExistingGraph && [...s.getNodes().keys()].forEach((h) => s.removeNode(h));
    const r = /* @__PURE__ */ new Map();
    for (const h of a.nodes) {
      const p = s.createAndAddNode({
        id: h.id,
        type: h.type,
        position: h.position,
        data: h.data,
        mass: h.mass
      });
      p ? (h.isPinned && (p.isPinned = !0), r.set(p.id, p)) : console.warn("DataPlugin: Failed to create node:", h);
    }
    const l = (c = n.layoutManager) == null ? void 0 : c.getActiveLayout();
    l != null && l.setPinState && a.nodes.forEach((h) => {
      if (h.isPinned) {
        const p = r.get(h.id);
        p && l.setPinState(p, !0);
      }
    });
    for (const h of a.edges) {
      const p = r.get(h.sourceId), f = r.get(h.targetId);
      p && f ? i.addEdge(p, f, h.data) : console.warn("DataPlugin: Missing source/target node for edge:", h);
    }
    if (a.camera && o) {
      const h = o.getControls(), p = a.camera;
      h && p.position && p.lookAt && (h.moveTo(p.position.x, p.position.y, p.position.z, 0.5, p.lookAt), (d = h.setCameraMode) == null || d.call(h, p.mode));
    }
    return n.kick(), this.space.emit("data:imported"), !0;
  }
  dispose() {
    super.dispose();
  }
}
class Co {
  constructor(t) {
    this.space = t, this.cameraPlugin = null, this.currentZoomLevel = 0, this.targetZoomLevel = 0, this.zoomTransitionTween = null, this.lodLevels = /* @__PURE__ */ new Map(), this.zoomThresholds = [], this.contentAdapters = /* @__PURE__ */ new Map(), this.zoomStep = 0.5, this.maxZoomIn = 20, this.maxZoomOut = -10, this.transitionDuration = 0.8, this.lodUpdateThreshold = 0.1, this.memoryBudget = 100, this.isTransitioning = !1, this._initializeLODLevels(), this._bindEvents();
  }
  /**
   * Initialize default LOD levels with different detail configurations
   */
  _initializeLODLevels() {
    [
      {
        zoomLevel: -5,
        name: "overview",
        nodeDetailLevel: "minimal",
        edgeDetailLevel: "none",
        labelsVisible: !1,
        textScale: 0.5,
        geometryQuality: "low"
      },
      {
        zoomLevel: -2,
        name: "distant",
        nodeDetailLevel: "low",
        edgeDetailLevel: "low",
        labelsVisible: !1,
        textScale: 0.7,
        geometryQuality: "low"
      },
      {
        zoomLevel: 0,
        name: "normal",
        nodeDetailLevel: "medium",
        edgeDetailLevel: "medium",
        labelsVisible: !0,
        textScale: 1,
        geometryQuality: "medium"
      },
      {
        zoomLevel: 3,
        name: "detailed",
        nodeDetailLevel: "high",
        edgeDetailLevel: "high",
        labelsVisible: !0,
        textScale: 1.2,
        geometryQuality: "high"
      },
      {
        zoomLevel: 6,
        name: "micro",
        nodeDetailLevel: "ultra",
        edgeDetailLevel: "ultra",
        labelsVisible: !0,
        textScale: 1.5,
        geometryQuality: "ultra"
      }
    ].forEach((e) => {
      this.lodLevels.set(e.zoomLevel, e), this.zoomThresholds.push(e.zoomLevel);
    }), this.zoomThresholds.sort((e, s) => e - s);
  }
  /**
   * Bind event listeners for zoom interactions
   */
  _bindEvents() {
    this.space.on("ui:request:zoomCamera", this._onZoomRequest.bind(this)), this.space.on("ui:request:setZoomLevel", this._onSetZoomLevel.bind(this)), this.space.on("camera:changed", this._onCameraChanged.bind(this));
  }
  /**
   * Initialize with camera plugin reference
   */
  init(t) {
    this.cameraPlugin = t, this._updateLOD();
  }
  /**
   * Handle zoom requests from UI interactions
   */
  _onZoomRequest(t) {
    const e = t > 0 ? -1 : 1, s = Math.max(
      this.maxZoomOut,
      Math.min(this.maxZoomIn, this.currentZoomLevel + e * this.zoomStep)
    );
    this.zoomToLevel(s);
  }
  /**
   * Handle direct zoom level setting
   */
  _onSetZoomLevel(t) {
    this.zoomToLevel(t);
  }
  /**
   * Handle camera changes that might affect zoom level
   */
  _onCameraChanged(t) {
    !this.isTransitioning && t.source !== "fractal-zoom" && this._calculateZoomLevelFromCamera();
  }
  /**
   * Calculate current zoom level based on camera distance
   */
  _calculateZoomLevelFromCamera() {
    if (!this.cameraPlugin) return;
    const t = this.cameraPlugin.getCameraInstance();
    if (!t) return;
    const e = t.position.distanceTo(new u.Vector3(0, 0, 0)), i = -Math.log2(e / 1e3);
    Math.abs(i - this.currentZoomLevel) > this.lodUpdateThreshold && (this.currentZoomLevel = i, this._updateLOD());
  }
  /**
   * Zoom to a specific level with smooth transition
   */
  zoomToLevel(t, e = this.transitionDuration) {
    if (t = Math.max(this.maxZoomOut, Math.min(this.maxZoomIn, t)), Math.abs(t - this.currentZoomLevel) < 0.01) return;
    const s = this.currentZoomLevel;
    this.targetZoomLevel = t, this.isTransitioning = !0, this.zoomTransitionTween && this.zoomTransitionTween.kill(), this.zoomTransitionTween = z.to(this, {
      currentZoomLevel: t,
      duration: e,
      ease: "power2.inOut",
      onUpdate: () => {
        this._updateCameraForZoomLevel(), this._updateLOD();
      },
      onComplete: () => {
        this.isTransitioning = !1, this.space.emit("fractal-zoom:levelChanged", {
          oldLevel: s,
          // Use the captured old level
          newLevel: t,
          lodConfig: this.getCurrentLODConfig()
        });
      }
    });
  }
  /**
   * Update camera position based on current zoom level
   */
  _updateCameraForZoomLevel() {
    if (!this.cameraPlugin) return;
    const t = this.cameraPlugin.getCameraInstance();
    if (!t) return;
    const s = 1e3 / Math.pow(2, this.currentZoomLevel), n = t.position.clone().normalize().multiplyScalar(s);
    t.position.copy(n), this.space.emit("camera:changed", { source: "fractal-zoom" });
  }
  /**
   * Update level-of-detail for all graph elements
   */
  _updateLOD() {
    const t = this.getCurrentLODConfig();
    this.space.getNodes().forEach((e) => {
      this._updateNodeLOD(e, t);
    }), this.space.getEdges().forEach((e) => {
      this._updateEdgeLOD(e, t);
    }), this.space.emit("fractal-zoom:lodUpdated", { lodConfig: t, zoomLevel: this.currentZoomLevel });
  }
  /**
   * Get current LOD configuration based on zoom level
   */
  getCurrentLODConfig() {
    let t = this.lodLevels.get(0);
    for (let e = this.zoomThresholds.length - 1; e >= 0; e--) {
      const s = this.zoomThresholds[e];
      if (this.currentZoomLevel >= s) {
        t = this.lodLevels.get(s);
        break;
      }
    }
    return t;
  }
  /**
   * Update LOD for a specific node
   */
  _updateNodeLOD(t, e) {
    if (!(!t || !e)) {
      if (t.object3d) {
        const s = this._calculateScaleMultiplier(e);
        t.object3d.scale.setScalar(s), t.setDetailLevel && t.setDetailLevel(e.nodeDetailLevel);
      }
      if (t.htmlElement && e.textScale !== void 0) {
        const s = t.htmlElement.querySelector(".node-content");
        s && (s.style.transform = `scale(${e.textScale})`, s.style.transformOrigin = "top left");
      }
      t.labelObject && (t.labelObject.visible = e.labelsVisible);
    }
  }
  /**
   * Update LOD for a specific edge
   */
  _updateEdgeLOD(t, e) {
    if (!(!t || !e)) {
      if (t.line) {
        const s = t.line.material, i = this._getLineWidthMultiplier(e.edgeDetailLevel);
        s.linewidth !== void 0 && (s.linewidth = i);
        const n = this._getOpacityMultiplier(e.edgeDetailLevel);
        s.opacity = Math.min(1, s.opacity * n), t.line.visible = e.edgeDetailLevel !== "none";
      }
      t.labelObject && (t.labelObject.visible = e.labelsVisible && e.edgeDetailLevel !== "none");
    }
  }
  /**
   * Calculate scale multiplier for current LOD
   */
  _calculateScaleMultiplier(t) {
    const s = Math.pow(1.1, this.currentZoomLevel * 0.5);
    let i = 1;
    switch (t.nodeDetailLevel) {
      case "minimal":
        i = 0.5;
        break;
      case "low":
        i = 0.7;
        break;
      case "medium":
        i = 1;
        break;
      case "high":
        i = 1.3;
        break;
      case "ultra":
        i = 1.6;
        break;
    }
    return 1 * s * i;
  }
  /**
   * Get line width multiplier for edge detail level
   */
  _getLineWidthMultiplier(t) {
    switch (t) {
      case "none":
        return 0;
      case "low":
        return 0.5;
      case "medium":
        return 1;
      case "high":
        return 1.5;
      case "ultra":
        return 2;
      default:
        return 1;
    }
  }
  /**
   * Get opacity multiplier for edge detail level
   */
  _getOpacityMultiplier(t) {
    switch (t) {
      case "none":
        return 0;
      case "low":
        return 0.3;
      case "medium":
        return 0.7;
      case "high":
        return 1;
      case "ultra":
        return 1;
      default:
        return 0.7;
    }
  }
  /**
   * Add custom LOD configuration
   */
  addLODLevel(t, e) {
    this.lodLevels.set(t, e), this.zoomThresholds.includes(t) || (this.zoomThresholds.push(t), this.zoomThresholds.sort((s, i) => s - i));
  }
  /**
   * Register a content adapter for a specific node
   */
  registerContentAdapter(t, e) {
    this.contentAdapters.set(t, e);
  }
  /**
   * Apply content adapters for current zoom level
   */
  _applyContentAdapters() {
    const t = this.getCurrentLODConfig();
    this.contentAdapters.forEach((e, s) => {
      const i = this.space.getNodeById(s);
      i && e.adapt && e.adapt(i, t, this.currentZoomLevel);
    });
  }
  /**
   * Get current zoom level
   */
  getZoomLevel() {
    return this.currentZoomLevel;
  }
  /**
   * Get zoom range
   */
  getZoomRange() {
    return {
      min: this.maxZoomOut,
      max: this.maxZoomIn,
      current: this.currentZoomLevel,
      target: this.targetZoomLevel
    };
  }
  /**
   * Reset zoom to default level
   */
  resetZoom(t = this.transitionDuration) {
    this.zoomToLevel(0, t);
  }
  /**
   * Zoom in by one step
   */
  zoomIn() {
    this.zoomToLevel(this.currentZoomLevel + this.zoomStep);
  }
  /**
   * Zoom out by one step
   */
  zoomOut() {
    this.zoomToLevel(this.currentZoomLevel - this.zoomStep);
  }
  /**
   * Check if currently transitioning
   */
  isTransitioningZoom() {
    return this.isTransitioning;
  }
  /**
   * Dispose of the fractal zoom manager
   */
  dispose() {
    this.zoomTransitionTween && this.zoomTransitionTween.kill(), this.space.off("ui:request:zoomCamera", this._onZoomRequest.bind(this)), this.space.off("ui:request:setZoomLevel", this._onSetZoomLevel.bind(this)), this.space.off("camera:changed", this._onCameraChanged.bind(this)), this.lodLevels.clear(), this.contentAdapters.clear(), this.space = null, this.cameraPlugin = null;
  }
}
class Je {
  constructor(t, e = {}) {
    this.nodeId = t, this.config = {
      // Default content for different zoom levels
      zoomContent: /* @__PURE__ */ new Map(),
      // Animation settings
      transitionDuration: 0.3,
      fadeTransition: !0,
      // Performance settings
      preloadContent: !0,
      maxCachedLevels: 5,
      ...e
    }, this.contentCache = /* @__PURE__ */ new Map(), this.currentContent = null, this.lastZoomLevel = 0;
  }
  /**
   * Define content for a specific zoom level range
   */
  defineContent(t, e, s) {
    const i = `${t}-${e}`;
    this.config.zoomContent.set(i, {
      minZoom: t,
      maxZoom: e,
      generator: s
    });
  }
  /**
   * Adapt content based on current zoom level and LOD configuration
   */
  adapt(t, e, s) {
    if (Math.abs(s - this.lastZoomLevel) < 0.5) return;
    this.lastZoomLevel = s;
    const i = this._findContentForZoomLevel(s);
    i && this._applyContent(t, i, e, s);
  }
  /**
   * Find content configuration for the given zoom level
   */
  _findContentForZoomLevel(t) {
    for (const [e, s] of this.config.zoomContent)
      if (t >= s.minZoom && t <= s.maxZoom)
        return s;
    return null;
  }
  /**
   * Apply content to the node
   */
  _applyContent(t, e, s, i) {
    if (!e.generator) return;
    const n = this._getOrGenerateContent(e, s, i);
    n && n !== this.currentContent && (this._transitionToContent(t, n), this.currentContent = n);
  }
  /**
   * Get or generate content, using cache when possible
   */
  _getOrGenerateContent(t, e, s) {
    const i = `${t.minZoom}-${t.maxZoom}-${s.toFixed(1)}`;
    if (this.contentCache.has(i))
      return this.contentCache.get(i);
    const n = t.generator(e, s);
    return this.contentCache.set(i, n), this.contentCache.size > this.config.maxCachedLevels && this._cleanupCache(), n;
  }
  /**
   * Transition to new content with animation
   */
  _transitionToContent(t, e) {
    if (!t.htmlElement) return;
    const s = t.htmlElement.querySelector(".node-content");
    s && (this.config.fadeTransition ? (s.style.transition = `opacity ${this.config.transitionDuration}s`, s.style.opacity = "0", setTimeout(() => {
      typeof e == "string" ? s.innerHTML = e : e.innerHTML ? s.innerHTML = e.innerHTML : e.textContent && (s.textContent = e.textContent), s.style.opacity = "1";
    }, this.config.transitionDuration * 1e3)) : typeof e == "string" ? s.innerHTML = e : e.innerHTML ? s.innerHTML = e.innerHTML : e.textContent && (s.textContent = e.textContent));
  }
  /**
   * Clean up old cached content
   */
  _cleanupCache() {
    const t = Array.from(this.contentCache.entries());
    t.slice(0, t.length - this.config.maxCachedLevels).forEach(([s]) => this.contentCache.delete(s));
  }
  /**
   * Clear all cached content
   */
  clearCache() {
    this.contentCache.clear();
  }
  /**
   * Dispose of the content adapter
   */
  dispose() {
    this.contentCache.clear(), this.currentContent = null;
  }
}
class vo extends Je {
  constructor(t, e = {}) {
    super(t, e), this.textLevels = /* @__PURE__ */ new Map();
  }
  /**
   * Define text content for different zoom levels
   */
  defineTextLevel(t, e, s) {
    this.defineContent(t, e, () => s);
  }
  /**
   * Define progressive text reveal (summary -> detail -> full)
   */
  defineProgressiveText(t, e, s) {
    this.defineTextLevel(-10, -2, t), this.defineTextLevel(-2, 2, e), this.defineTextLevel(2, 10, s);
  }
}
class wo extends Je {
  constructor(t, e = {}) {
    super(t, e);
  }
  /**
   * Define HTML content for different zoom levels
   */
  defineHTMLLevel(t, e, s) {
    this.defineContent(t, e, (i, n) => typeof s == "function" ? s(i, n) : s);
  }
  /**
   * Define progressive HTML reveal with different complexity levels
   */
  defineProgressiveHTML(t, e, s) {
    this.defineHTMLLevel(-10, -1, t), this.defineHTMLLevel(-1, 3, e), this.defineHTMLLevel(3, 10, s);
  }
}
class Io extends Je {
  constructor(t, e, s = {}) {
    super(t, s), this.data = e;
  }
  /**
   * Define data visualization levels
   */
  defineDataLevels(t) {
    Object.entries(t).forEach(([e, s]) => {
      this.defineContent(s.minZoom, s.maxZoom, (i, n) => this._generateDataVisualization(s, i, n));
    });
  }
  /**
   * Generate data visualization based on configuration
   */
  _generateDataVisualization(t, e, s) {
    if (!this.data) return "<div>No data available</div>";
    switch (t.type) {
      case "summary":
        return this._generateSummary(t);
      case "chart":
        return this._generateChart(t, s);
      case "table":
        return this._generateTable(t, s);
      case "raw":
        return this._generateRawData(t);
      default:
        return "<div>Unknown visualization type</div>";
    }
  }
  /**
   * Generate summary view
   */
  _generateSummary(t) {
    return `<div class="data-summary">${t.summaryFunction ? t.summaryFunction(this.data) : "Data Summary"}</div>`;
  }
  /**
   * Generate chart view
   */
  _generateChart(t, e) {
    const s = t.chartType || "bar", i = Array.isArray(this.data) ? this.data.length : Object.keys(this.data).length;
    return `
            <div class="data-chart">
                <h4>${t.title || "Chart"}</h4>
                <div class="chart-placeholder">
                    ${s.toUpperCase()} chart with ${i} data points
                    <br>Zoom level: ${e.toFixed(1)}
                </div>
            </div>
        `;
  }
  /**
   * Generate table view
   */
  _generateTable(t, e) {
    if (!Array.isArray(this.data)) return "<div>Data not suitable for table</div>";
    const s = Math.min(t.maxRows || 10, this.data.length), i = this.data.slice(0, s);
    let n = '<table class="data-table"><thead><tr>';
    if (i.length > 0) {
      const o = Object.keys(i[0]);
      o.forEach((a) => {
        n += `<th>${a}</th>`;
      }), n += "</tr></thead><tbody>", i.forEach((a) => {
        n += "<tr>", o.forEach((r) => {
          n += `<td>${a[r] || ""}</td>`;
        }), n += "</tr>";
      });
    }
    return n += "</tbody></table>", n;
  }
  /**
   * Generate raw data view
   */
  _generateRawData(t) {
    return `<pre class="raw-data">${JSON.stringify(this.data, null, 2)}</pre>`;
  }
}
function dt(m, t, e = {}) {
  switch (t) {
    case "text":
      return new vo(m, e);
    case "html":
      return new wo(m, e);
    case "data":
      return new Io(m, e.data, e);
    default:
      return new Je(m, e);
  }
}
class Mo extends U {
  constructor(t, e, s = {}) {
    super(t, e), this.config = {
      enabled: !0,
      autoLOD: !0,
      zoomStep: 0.5,
      maxZoomIn: 20,
      maxZoomOut: -10,
      transitionDuration: 0.8,
      ...s
    }, this.fractalZoomManager = null, this.contentAdapters = /* @__PURE__ */ new Map(), this.zoomListeners = /* @__PURE__ */ new Set();
  }
  getName() {
    return "FractalZoomPlugin";
  }
  init() {
    if (super.init(), !this.config.enabled) return;
    this.fractalZoomManager = new Co(this.space), this.fractalZoomManager.zoomStep = this.config.zoomStep, this.fractalZoomManager.maxZoomIn = this.config.maxZoomIn, this.fractalZoomManager.maxZoomOut = this.config.maxZoomOut, this.fractalZoomManager.transitionDuration = this.config.transitionDuration;
    const t = this.pluginManager.getPlugin("CameraPlugin");
    t && this.fractalZoomManager.init(t), this._subscribeToEvents(), this._setupDefaultContentAdapters(), this.space.fractalZoom = {
      zoomToLevel: this.zoomToLevel.bind(this),
      zoomIn: this.zoomIn.bind(this),
      zoomOut: this.zoomOut.bind(this),
      resetZoom: this.resetZoom.bind(this),
      getZoomLevel: this.getZoomLevel.bind(this),
      getZoomRange: this.getZoomRange.bind(this),
      addContentAdapter: this.addContentAdapter.bind(this),
      addLODLevel: this.addLODLevel.bind(this),
      isTransitioning: this.isTransitioning.bind(this)
    }, console.log("FractalZoomPlugin initialized");
  }
  /**
   * Subscribe to relevant events
   */
  _subscribeToEvents() {
    this.space.on("node:added", this._onNodeAdded.bind(this)), this.space.on("node:removed", this._onNodeRemoved.bind(this)), this.space.on("fractal-zoom:levelChanged", this._onZoomLevelChanged.bind(this)), this.space.on("fractal-zoom:lodUpdated", this._onLODUpdated.bind(this));
  }
  /**
   * Setup default content adapters for different node types
   */
  _setupDefaultContentAdapters() {
  }
  /**
   * Handle node addition
   */
  _onNodeAdded(t, e) {
    this.fractalZoomManager && this._createDefaultContentAdapter(t, e);
  }
  /**
   * Handle node removal
   */
  _onNodeRemoved(t, e) {
    this.contentAdapters.has(t) && (this.contentAdapters.get(t).dispose(), this.contentAdapters.delete(t));
  }
  /**
   * Handle zoom level changes
   */
  _onZoomLevelChanged(t) {
    this.space.emit("ui:fractalZoom:levelChanged", t), this.zoomListeners.forEach((e) => {
      typeof e == "function" && e(t);
    });
  }
  /**
   * Handle LOD updates
   */
  _onLODUpdated(t) {
    this.space.emit("ui:fractalZoom:lodUpdated", t);
  }
  /**
   * Create default content adapter for a node
   */
  _createDefaultContentAdapter(t, e) {
    if (!e.htmlElement) return;
    const s = e.htmlElement.querySelector(".node-content");
    if (!s) return;
    const i = s.textContent || s.innerHTML;
    let n;
    if (i.length > 200) {
      n = dt(t, "text");
      const o = this._extractSummary(i), a = this._extractDetail(i);
      n.defineProgressiveText(o, a, i);
    } else s.querySelector("table, chart, canvas") ? n = dt(t, "data") : (n = dt(t, "html"), n.defineHTMLLevel(-10, 10, i));
    n && this.addContentAdapter(t, n);
  }
  /**
   * Extract summary from text content
   */
  _extractSummary(t) {
    const e = t.match(/[^\.!?]*[\.!?]/);
    return e ? e[0].trim() : t.substring(0, 50) + (t.length > 50 ? "..." : "");
  }
  /**
   * Extract detail from text content
   */
  _extractDetail(t) {
    const e = t.split(`
`)[0];
    return e.length > 20 ? e : t.substring(0, 150) + (t.length > 150 ? "..." : "");
  }
  /**
   * Zoom to a specific level
   */
  zoomToLevel(t, e) {
    this.fractalZoomManager && this.fractalZoomManager.zoomToLevel(t, e);
  }
  /**
   * Zoom in by one step
   */
  zoomIn() {
    this.fractalZoomManager && this.fractalZoomManager.zoomIn();
  }
  /**
   * Zoom out by one step
   */
  zoomOut() {
    this.fractalZoomManager && this.fractalZoomManager.zoomOut();
  }
  /**
   * Reset zoom to default level
   */
  resetZoom(t) {
    this.fractalZoomManager && this.fractalZoomManager.resetZoom(t);
  }
  /**
   * Get current zoom level
   */
  getZoomLevel() {
    return this.fractalZoomManager ? this.fractalZoomManager.getZoomLevel() : 0;
  }
  /**
   * Get zoom range information
   */
  getZoomRange() {
    return this.fractalZoomManager ? this.fractalZoomManager.getZoomRange() : {
      min: -10,
      max: 20,
      current: 0,
      target: 0
    };
  }
  /**
   * Check if currently transitioning
   */
  isTransitioning() {
    return this.fractalZoomManager ? this.fractalZoomManager.isTransitioningZoom() : !1;
  }
  /**
   * Add a content adapter for a specific node
   */
  addContentAdapter(t, e) {
    this.contentAdapters.has(t) && this.contentAdapters.get(t).dispose(), this.contentAdapters.set(t, e), this.fractalZoomManager && this.fractalZoomManager.registerContentAdapter(t, e);
  }
  /**
   * Remove content adapter for a node
   */
  removeContentAdapter(t) {
    this.contentAdapters.has(t) && (this.contentAdapters.get(t).dispose(), this.contentAdapters.delete(t));
  }
  /**
   * Add custom LOD level
   */
  addLODLevel(t, e) {
    this.fractalZoomManager && this.fractalZoomManager.addLODLevel(t, e);
  }
  /**
   * Add zoom level change listener
   */
  addZoomListener(t) {
    this.zoomListeners.add(t);
  }
  /**
   * Remove zoom level change listener
   */
  removeZoomListener(t) {
    this.zoomListeners.delete(t);
  }
  /**
   * Enable/disable fractal zoom
   */
  setEnabled(t) {
    this.config.enabled = t, !t && this.fractalZoomManager && this.fractalZoomManager.resetZoom(0.5);
  }
  /**
   * Update plugin configuration
   */
  updateConfig(t) {
    this.config = { ...this.config, ...t }, this.fractalZoomManager && (this.fractalZoomManager.zoomStep = this.config.zoomStep, this.fractalZoomManager.maxZoomIn = this.config.maxZoomIn, this.fractalZoomManager.maxZoomOut = this.config.maxZoomOut, this.fractalZoomManager.transitionDuration = this.config.transitionDuration);
  }
  /**
   * Get current LOD configuration
   */
  getCurrentLODConfig() {
    return this.fractalZoomManager ? this.fractalZoomManager.getCurrentLODConfig() : null;
  }
  /**
   * Force LOD update
   */
  updateLOD() {
    this.fractalZoomManager && this.fractalZoomManager._updateLOD();
  }
  dispose() {
    super.dispose(), this.contentAdapters.forEach((t) => t.dispose()), this.contentAdapters.clear(), this.zoomListeners.clear(), this.fractalZoomManager && (this.fractalZoomManager.dispose(), this.fractalZoomManager = null), this.space.fractalZoom && delete this.space.fractalZoom, console.log("FractalZoomPlugin disposed");
  }
}
class xo {
  constructor(t) {
    this.space = t, this.renderingPlugin = null, this.config = {
      enableInstancing: !0,
      enableCulling: !0,
      enableLOD: !0,
      enableMemoryManagement: !0,
      // Instancing thresholds
      instanceThreshold: 10,
      // Minimum objects to enable instancing
      maxInstances: 1e3,
      // Maximum instances per batch
      // Culling configuration
      frustumCulling: !0,
      distanceCulling: !0,
      maxRenderDistance: 1e4,
      // LOD configuration
      lodLevels: [
        { distance: 100, quality: "high" },
        { distance: 500, quality: "medium" },
        { distance: 1500, quality: "low" },
        { distance: 5e3, quality: "minimal" }
      ],
      // Memory management
      memoryBudget: 512 * 1024 * 1024,
      // 512MB
      garbageCollectionThreshold: 0.8,
      // Trigger GC at 80% memory
      maxCachedObjects: 1e3
    }, this.stats = {
      totalObjects: 0,
      visibleObjects: 0,
      instancedObjects: 0,
      culledObjects: 0,
      memoryUsage: 0,
      frameTime: 0,
      avgFrameTime: 0
    }, this.instanceManager = new Ao(this), this.cullingManager = new So(this), this.lodManager = new Eo(this), this.memoryManager = new _o(this), this.frameTimeHistory = [], this.maxFrameHistory = 60, this.lastFrameTime = performance.now(), this._bindEvents();
  }
  /**
   * Initialize performance manager with rendering plugin
   */
  init(t) {
    this.renderingPlugin = t, this.instanceManager.init(t), this.cullingManager.init(t), this.lodManager.init(t), this.memoryManager.init(), console.log("PerformanceManager initialized");
  }
  /**
   * Bind to relevant events
   */
  _bindEvents() {
    this.space.on("node:added", this._onNodeAdded.bind(this)), this.space.on("node:removed", this._onNodeRemoved.bind(this)), this.space.on("edge:added", this._onEdgeAdded.bind(this)), this.space.on("edge:removed", this._onEdgeRemoved.bind(this)), this.space.on("camera:changed", this._onCameraChanged.bind(this));
  }
  /**
   * Handle node addition
   */
  _onNodeAdded(t, e) {
    this.stats.totalObjects++, this.config.enableInstancing && this.instanceManager.registerObject(e), this.config.enableLOD && this.lodManager.registerObject(e);
  }
  /**
   * Handle node removal
   */
  _onNodeRemoved(t, e) {
    this.stats.totalObjects--, this.config.enableInstancing && this.instanceManager.unregisterObject(e), this.config.enableLOD && this.lodManager.unregisterObject(e);
  }
  /**
   * Handle edge addition
   */
  _onEdgeAdded(t, e) {
    this.stats.totalObjects++, this.config.enableInstancing && this.instanceManager.registerObject(e), this.config.enableLOD && this.lodManager.registerObject(e);
  }
  /**
   * Handle edge removal
   */
  _onEdgeRemoved(t, e) {
    this.stats.totalObjects--, this.config.enableInstancing && this.instanceManager.unregisterObject(e), this.config.enableLOD && this.lodManager.unregisterObject(e);
  }
  /**
   * Handle camera changes for culling and LOD updates
   */
  _onCameraChanged(t) {
    this.config.enableCulling && this.cullingManager.updateCulling(), this.config.enableLOD && this.lodManager.updateLOD();
  }
  /**
   * Main update loop - should be called every frame
   */
  update() {
    const t = performance.now(), e = t - this.lastFrameTime;
    this.lastFrameTime = t, this._updateFrameStats(e), this.config.enableCulling && this.cullingManager.update(), this.config.enableLOD && this.lodManager.update(), this.config.enableMemoryManagement && this.memoryManager.update(), this._updateStats();
  }
  /**
   * Update frame time statistics
   */
  _updateFrameStats(t) {
    this.stats.frameTime = t, this.frameTimeHistory.push(t), this.frameTimeHistory.length > this.maxFrameHistory && this.frameTimeHistory.shift();
    const e = this.frameTimeHistory.reduce((s, i) => s + i, 0);
    this.stats.avgFrameTime = e / this.frameTimeHistory.length;
  }
  /**
   * Update performance statistics
   */
  _updateStats() {
    this.stats.visibleObjects = this.cullingManager.getVisibleCount(), this.stats.instancedObjects = this.instanceManager.getInstancedCount(), this.stats.culledObjects = this.stats.totalObjects - this.stats.visibleObjects, this.stats.memoryUsage = this.memoryManager.getMemoryUsage();
  }
  /**
   * Get current performance statistics
   */
  getStats() {
    return { ...this.stats };
  }
  /**
   * Get detailed performance report
   */
  getPerformanceReport() {
    return {
      stats: this.getStats(),
      config: { ...this.config },
      instancing: this.instanceManager.getReport(),
      culling: this.cullingManager.getReport(),
      lod: this.lodManager.getReport(),
      memory: this.memoryManager.getReport()
    };
  }
  /**
   * Update performance configuration
   */
  updateConfig(t) {
    const e = { ...this.config };
    this.config = { ...this.config, ...t }, e.enableInstancing !== this.config.enableInstancing && this.instanceManager.setEnabled(this.config.enableInstancing), e.enableCulling !== this.config.enableCulling && this.cullingManager.setEnabled(this.config.enableCulling), e.enableLOD !== this.config.enableLOD && this.lodManager.setEnabled(this.config.enableLOD);
  }
  /**
   * Optimize performance based on current conditions
   */
  optimizePerformance() {
    const e = this.getStats().avgFrameTime, s = 16.67;
    e > s * 1.5 ? (console.log("Performance degraded, enabling aggressive optimizations"), this.updateConfig({
      enableInstancing: !0,
      enableCulling: !0,
      maxRenderDistance: Math.max(1e3, this.config.maxRenderDistance * 0.8),
      instanceThreshold: Math.max(5, this.config.instanceThreshold - 2)
    }), this.lodManager.setAggressiveMode(!0)) : e < s * 0.8 && (this.updateConfig({
      maxRenderDistance: Math.min(1e4, this.config.maxRenderDistance * 1.1),
      instanceThreshold: Math.min(20, this.config.instanceThreshold + 1)
    }), this.lodManager.setAggressiveMode(!1));
  }
  /**
   * Force garbage collection and cleanup
   */
  cleanup() {
    this.memoryManager.forceCleanup(), this.instanceManager.cleanup(), this.cullingManager.cleanup(), this.lodManager.cleanup();
  }
  /**
   * Dispose of the performance manager
   */
  dispose() {
    this.space.off("node:added", this._onNodeAdded.bind(this)), this.space.off("node:removed", this._onNodeRemoved.bind(this)), this.space.off("edge:added", this._onEdgeAdded.bind(this)), this.space.off("edge:removed", this._onEdgeRemoved.bind(this)), this.space.off("camera:changed", this._onCameraChanged.bind(this)), this.instanceManager.dispose(), this.cullingManager.dispose(), this.lodManager.dispose(), this.memoryManager.dispose(), console.log("PerformanceManager disposed");
  }
}
class Ao {
  constructor(t) {
    this.perfManager = t, this.enabled = !0, this.instanceGroups = /* @__PURE__ */ new Map(), this.registeredObjects = /* @__PURE__ */ new Map(), this.instancedCount = 0;
  }
  init(t) {
    this.renderingPlugin = t;
  }
  registerObject(t) {
    if (!this.enabled || !t.object3d) return;
    const e = this._getGeometryKey(t);
    if (!e) return;
    this.instanceGroups.has(e) || this.instanceGroups.set(e, {
      objects: [],
      instancedMesh: null,
      needsUpdate: !0
    });
    const s = this.instanceGroups.get(e);
    s.objects.push(t), s.needsUpdate = !0, this.registeredObjects.set(t.id, e), s.objects.length >= this.perfManager.config.instanceThreshold && this._createInstancedMesh(e);
  }
  unregisterObject(t) {
    const e = this.registeredObjects.get(t.id);
    if (!e) return;
    const s = this.instanceGroups.get(e);
    if (s) {
      const i = s.objects.indexOf(t);
      i !== -1 && (s.objects.splice(i, 1), s.needsUpdate = !0), s.objects.length < this.perfManager.config.instanceThreshold && s.instancedMesh && this._destroyInstancedMesh(e);
    }
    this.registeredObjects.delete(t.id);
  }
  _getGeometryKey(t) {
    if (t.object3d && t.object3d.children.length > 0) {
      const e = t.object3d.children[0];
      if (e.geometry && e.material)
        return `${e.geometry.type}_${e.material.type}`;
    }
    return null;
  }
  _createInstancedMesh(t) {
    const e = this.instanceGroups.get(t);
    if (!e || e.objects.length === 0) return;
    const s = e.objects[0].object3d.children[0], i = s.geometry, n = s.material.clone(), o = Math.min(e.objects.length, this.perfManager.config.maxInstances), a = new u.InstancedMesh(i, n, o), r = new u.Matrix4();
    e.objects.forEach((l, c) => {
      c >= o || (r.setPosition(l.position.x, l.position.y, l.position.z), a.setMatrixAt(c, r), l.object3d.visible = !1);
    }), a.instanceMatrix.needsUpdate = !0, e.instancedMesh = a, this.renderingPlugin && this.renderingPlugin.getWebGLScene().add(a), this.instancedCount += e.objects.length, console.log(`Created instanced mesh for ${t} with ${e.objects.length} instances`);
  }
  _destroyInstancedMesh(t) {
    const e = this.instanceGroups.get(t);
    !e || !e.instancedMesh || (this.renderingPlugin && this.renderingPlugin.getWebGLScene().remove(e.instancedMesh), e.objects.forEach((s) => {
      s.object3d.visible = !0;
    }), this.instancedCount -= e.objects.length, e.instancedMesh.dispose(), e.instancedMesh = null);
  }
  getInstancedCount() {
    return this.instancedCount;
  }
  setEnabled(t) {
    this.enabled = t, t || this.instanceGroups.forEach((e, s) => {
      e.instancedMesh && this._destroyInstancedMesh(s);
    });
  }
  getReport() {
    return {
      enabled: this.enabled,
      groupCount: this.instanceGroups.size,
      instancedCount: this.instancedCount,
      registeredCount: this.registeredObjects.size
    };
  }
  cleanup() {
    this.instanceGroups.forEach((t, e) => {
      t.objects.length === 0 && (t.instancedMesh && this._destroyInstancedMesh(e), this.instanceGroups.delete(e));
    });
  }
  dispose() {
    this.instanceGroups.forEach((t, e) => {
      t.instancedMesh && this._destroyInstancedMesh(e);
    }), this.instanceGroups.clear(), this.registeredObjects.clear();
  }
}
class So {
  constructor(t) {
    this.perfManager = t, this.enabled = !0, this.camera = null, this.frustum = new u.Frustum(), this.cameraMatrix = new u.Matrix4(), this.visibleObjects = /* @__PURE__ */ new Set(), this.culledObjects = /* @__PURE__ */ new Set(), this.lastCameraPosition = new u.Vector3(), this.cameraMovedThreshold = 10;
  }
  init(t) {
    this.renderingPlugin = t;
    const e = this.perfManager.space.plugins.getPlugin("CameraPlugin");
    e && (this.camera = e.getCameraInstance());
  }
  updateCulling() {
    if (!this.enabled || !this.camera) return;
    const t = this.camera.position;
    if (t.distanceTo(this.lastCameraPosition) < this.cameraMovedThreshold)
      return;
    this.lastCameraPosition.copy(t), this.cameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse), this.frustum.setFromProjectionMatrix(this.cameraMatrix);
    const e = this.perfManager.space.getNodes(), s = this.perfManager.space.getEdges();
    [...e, ...s].forEach((i) => {
      this._testObjectCulling(i);
    });
  }
  _testObjectCulling(t) {
    if (!t.object3d) return;
    let e = !1;
    this.perfManager.config.distanceCulling && this.camera && t.position.distanceTo(this.camera.position) > this.perfManager.config.maxRenderDistance && (e = !0), !e && this.perfManager.config.frustumCulling && (this.frustum.intersectsObject(t.object3d) || (e = !0)), e ? this.visibleObjects.has(t) && (this.visibleObjects.delete(t), this.culledObjects.add(t), t.object3d.visible = !1) : this.culledObjects.has(t) && (this.culledObjects.delete(t), this.visibleObjects.add(t), t.object3d.visible = !0);
  }
  update() {
    this.updateCulling();
  }
  getVisibleCount() {
    return this.visibleObjects.size;
  }
  setEnabled(t) {
    this.enabled = t, t || (this.culledObjects.forEach((e) => {
      e.object3d.visible = !0;
    }), this.culledObjects.clear());
  }
  getReport() {
    return {
      enabled: this.enabled,
      visibleCount: this.visibleObjects.size,
      culledCount: this.culledObjects.size
    };
  }
  cleanup() {
  }
  dispose() {
    this.visibleObjects.clear(), this.culledObjects.clear();
  }
}
class Eo {
  constructor(t) {
    this.perfManager = t, this.enabled = !0, this.aggressiveMode = !1, this.camera = null, this.lodObjects = /* @__PURE__ */ new Map();
  }
  init(t) {
    this.renderingPlugin = t;
    const e = this.perfManager.space.plugins.getPlugin("CameraPlugin");
    e && (this.camera = e.getCameraInstance());
  }
  registerObject(t) {
    this.enabled && this.lodObjects.set(t, "high");
  }
  unregisterObject(t) {
    this.lodObjects.delete(t);
  }
  updateLOD() {
    !this.enabled || !this.camera || this.lodObjects.forEach((t, e) => {
      const s = e.position.distanceTo(this.camera.position), i = this._calculateLOD(s);
      i !== t && (this._applyLOD(e, i), this.lodObjects.set(e, i));
    });
  }
  _calculateLOD(t) {
    const e = this.perfManager.config.lodLevels;
    for (let s = 0; s < e.length; s++)
      if (t <= e[s].distance)
        return e[s].quality;
    return "minimal";
  }
  _applyLOD(t, e) {
    if (t.object3d)
      switch (e) {
        case "high":
          this._applyHighLOD(t);
          break;
        case "medium":
          this._applyMediumLOD(t);
          break;
        case "low":
          this._applyLowLOD(t);
          break;
        case "minimal":
          this._applyMinimalLOD(t);
          break;
      }
  }
  _applyHighLOD(t) {
    t.object3d.material && (t.object3d.material.wireframe = !1), t.labelObject && (t.labelObject.visible = !0);
  }
  _applyMediumLOD(t) {
    t.labelObject && (t.labelObject.visible = !0);
  }
  _applyLowLOD(t) {
    t.labelObject && (t.labelObject.visible = !1);
  }
  _applyMinimalLOD(t) {
    t.object3d.material && (t.object3d.material.wireframe = this.aggressiveMode), t.labelObject && (t.labelObject.visible = !1);
  }
  update() {
    this.updateLOD();
  }
  setEnabled(t) {
    this.enabled = t, t || this.lodObjects.forEach((e, s) => {
      this._applyLOD(s, "high");
    });
  }
  setAggressiveMode(t) {
    this.aggressiveMode = t, this.updateLOD();
  }
  getReport() {
    const t = {};
    return this.lodObjects.forEach((e) => {
      t[e] = (t[e] || 0) + 1;
    }), {
      enabled: this.enabled,
      aggressiveMode: this.aggressiveMode,
      objectCount: this.lodObjects.size,
      lodDistribution: t
    };
  }
  cleanup() {
  }
  dispose() {
    this.lodObjects.clear();
  }
}
class _o {
  constructor(t) {
    this.perfManager = t, this.enabled = !0, this.memoryUsage = 0, this.cachedObjects = /* @__PURE__ */ new Map(), this.lastCleanup = performance.now(), this.cleanupInterval = 3e4;
  }
  init() {
    performance.memory && setInterval(() => {
      this.memoryUsage = performance.memory.usedJSHeapSize;
    }, 1e3);
  }
  update() {
    if (!this.enabled) return;
    const t = performance.now();
    t - this.lastCleanup > this.cleanupInterval && (this._performCleanup(), this.lastCleanup = t), this._isMemoryPressureHigh() && this.forceCleanup();
  }
  _isMemoryPressureHigh() {
    return performance.memory ? this.memoryUsage / this.perfManager.config.memoryBudget > this.perfManager.config.garbageCollectionThreshold : !1;
  }
  _performCleanup() {
    if (this.cachedObjects.size > this.perfManager.config.maxCachedObjects) {
      const t = this.cachedObjects.size - this.perfManager.config.maxCachedObjects;
      Array.from(this.cachedObjects.keys()).slice(0, t).forEach((s) => {
        const i = this.cachedObjects.get(s);
        i && i.dispose && i.dispose(), this.cachedObjects.delete(s);
      });
    }
    window.gc && typeof window.gc == "function" && window.gc();
  }
  forceCleanup() {
    console.log("Performing force cleanup due to memory pressure"), this.cachedObjects.clear(), window.gc && typeof window.gc == "function" && window.gc(), this.lastCleanup = performance.now();
  }
  getMemoryUsage() {
    return this.memoryUsage;
  }
  setEnabled(t) {
    this.enabled = t;
  }
  getReport() {
    return {
      enabled: this.enabled,
      memoryUsage: this.memoryUsage,
      cachedObjectCount: this.cachedObjects.size,
      lastCleanup: this.lastCleanup
    };
  }
  cleanup() {
    this._performCleanup();
  }
  dispose() {
    this.cachedObjects.clear();
  }
}
class Ls {
  constructor() {
    this.workers = /* @__PURE__ */ new Map(), this.workerPools = /* @__PURE__ */ new Map(), this.taskQueue = [], this.activeJobs = /* @__PURE__ */ new Map(), this.jobIdCounter = 0, this.config = {
      maxWorkers: navigator.hardwareConcurrency || 4,
      workerTimeout: 3e4,
      // 30 seconds
      enableWorkers: this._checkWorkerSupport()
    }, console.log(`WorkerManager initialized with ${this.config.maxWorkers} max workers`);
  }
  /**
   * Check if web workers are supported
   */
  _checkWorkerSupport() {
    return typeof Worker < "u";
  }
  /**
   * Create a new worker for a specific task type
   */
  createWorker(t, e) {
    if (!this.config.enableWorkers)
      return console.warn("Web Workers not supported, falling back to main thread"), null;
    try {
      let s;
      if (e instanceof URL)
        s = new Worker(e);
      else if (typeof e == "string") {
        const n = new Blob([e], { type: "application/javascript" }), o = URL.createObjectURL(n);
        s = new Worker(o);
      } else
        throw new Error("Invalid worker script type");
      const i = {
        worker: s,
        type: t,
        busy: !1,
        created: Date.now(),
        lastUsed: Date.now(),
        jobsCompleted: 0
      };
      return s.onmessage = (n) => this._handleWorkerMessage(t, n), s.onerror = (n) => this._handleWorkerError(t, n), this.workers.set(t, i), console.log(`Created worker for ${t}`), s;
    } catch (s) {
      return console.error(`Failed to create worker for ${t}:`, s), null;
    }
  }
  /**
   * Create a pool of workers for a specific task type
   */
  createWorkerPool(t, e, s = 2) {
    if (!this.config.enableWorkers)
      return !1;
    s = Math.min(s, this.config.maxWorkers);
    const i = [];
    for (let n = 0; n < s; n++) {
      const o = this.createWorker(`${t}_${n}`, e);
      o && i.push({
        worker: o,
        busy: !1,
        workerId: `${t}_${n}`
      });
    }
    return i.length > 0 ? (this.workerPools.set(t, i), console.log(`Created worker pool for ${t} with ${i.length} workers`), !0) : !1;
  }
  /**
   * Get an available worker from a pool
   */
  _getAvailableWorker(t) {
    if (this.workerPools.has(t)) {
      const s = this.workerPools.get(t).find((i) => !i.busy);
      return s ? (s.busy = !0, s) : null;
    }
    if (this.workers.has(t)) {
      const e = this.workers.get(t);
      if (!e.busy)
        return e.busy = !0, e;
    }
    return null;
  }
  /**
   * Release a worker back to the available pool
   */
  _releaseWorker(t) {
    for (const [e, s] of this.workerPools) {
      const i = s.find((n) => n.workerId === t);
      if (i) {
        i.busy = !1, this.workers.get(t).lastUsed = Date.now(), this.workers.get(t).jobsCompleted++;
        return;
      }
    }
    if (this.workers.has(t)) {
      const e = this.workers.get(t);
      e.busy = !1, e.lastUsed = Date.now(), e.jobsCompleted++;
    }
  }
  /**
   * Execute a task on a worker
   */
  executeTask(t, e, s = this.config.workerTimeout) {
    return new Promise((i, n) => {
      if (!this.config.enableWorkers) {
        n(new Error("Web Workers not available"));
        return;
      }
      const o = this._generateJobId(), a = {
        id: o,
        workerType: t,
        taskData: e,
        resolve: i,
        reject: n,
        timeout: s,
        startTime: Date.now()
      }, r = this._getAvailableWorker(t);
      r ? this._executeJob(a, r) : (this.taskQueue.push(a), console.log(`Queued job ${o} for ${t} (queue length: ${this.taskQueue.length})`));
    });
  }
  /**
   * Execute a job on a worker
   */
  _executeJob(t, e) {
    this.activeJobs.set(t.id, {
      ...t,
      workerId: e.workerId || e.type,
      worker: e.worker
    });
    const s = setTimeout(() => {
      this._handleJobTimeout(t.id);
    }, t.timeout), i = this.activeJobs.get(t.id);
    i.timeoutId = s;
    try {
      e.worker.postMessage({
        jobId: t.id,
        type: "task",
        data: t.taskData
      }), console.log(`Executing job ${t.id} on worker ${i.workerId}`);
    } catch (n) {
      this._handleJobError(t.id, n);
    }
  }
  /**
   * Handle worker messages
   */
  _handleWorkerMessage(t, e) {
    const { jobId: s, type: i, data: n, error: o } = e.data;
    if (!s) {
      console.log(`Worker ${t} message:`, i, n);
      return;
    }
    if (!this.activeJobs.get(s)) {
      console.warn(`Received message for unknown job ${s}`);
      return;
    }
    o ? this._handleJobError(s, new Error(o)) : this._handleJobSuccess(s, n);
  }
  /**
   * Handle worker errors
   */
  _handleWorkerError(t, e) {
    console.error(`Worker ${t} error:`, e), this.activeJobs.forEach((s, i) => {
      s.workerId === t && this._handleJobError(i, e);
    });
  }
  /**
   * Handle job success
   */
  _handleJobSuccess(t, e) {
    const s = this.activeJobs.get(t);
    s && (s.timeoutId && clearTimeout(s.timeoutId), this._releaseWorker(s.workerId), this.activeJobs.delete(t), s.resolve(e), this._processQueue(), console.log(`Job ${t} completed successfully`));
  }
  /**
   * Handle job error
   */
  _handleJobError(t, e) {
    const s = this.activeJobs.get(t);
    s && (s.timeoutId && clearTimeout(s.timeoutId), this._releaseWorker(s.workerId), this.activeJobs.delete(t), s.reject(e), this._processQueue(), console.error(`Job ${t} failed:`, e));
  }
  /**
   * Handle job timeout
   */
  _handleJobTimeout(t) {
    const e = this.activeJobs.get(t);
    e && (console.warn(`Job ${t} timed out after ${e.timeout}ms`), this._handleJobError(t, new Error(`Job ${t} timed out`)));
  }
  /**
   * Process queued jobs
   */
  _processQueue() {
    if (this.taskQueue.length === 0) return;
    const t = this.taskQueue.shift(), e = this._getAvailableWorker(t.workerType);
    e ? this._executeJob(t, e) : this.taskQueue.unshift(t);
  }
  /**
   * Generate unique job ID
   */
  _generateJobId() {
    return `job_${++this.jobIdCounter}_${Date.now()}`;
  }
  /**
   * Get worker statistics
   */
  getStats() {
    const t = {
      enableWorkers: this.config.enableWorkers,
      totalWorkers: this.workers.size,
      workerPools: this.workerPools.size,
      activeJobs: this.activeJobs.size,
      queuedJobs: this.taskQueue.length,
      workers: {}
    };
    return this.workers.forEach((e, s) => {
      t.workers[s] = {
        busy: e.busy,
        jobsCompleted: e.jobsCompleted,
        uptime: Date.now() - e.created,
        lastUsed: Date.now() - e.lastUsed
      };
    }), t;
  }
  /**
   * Terminate a specific worker
   */
  terminateWorker(t) {
    const e = this.workers.get(t);
    e && (e.worker.terminate(), this.workers.delete(t), console.log(`Terminated worker ${t}`)), this.workerPools.has(t) && (this.workerPools.get(t).forEach((i) => {
      i.worker.terminate(), this.workers.delete(i.workerId);
    }), this.workerPools.delete(t), console.log(`Terminated worker pool ${t}`));
  }
  /**
   * Terminate all workers
   */
  terminateAll() {
    this.workers.forEach((t, e) => {
      t.worker.terminate();
    }), this.activeJobs.forEach((t, e) => {
      t.reject(new Error("Worker manager shutting down"));
    }), this.workers.clear(), this.workerPools.clear(), this.activeJobs.clear(), this.taskQueue = [], console.log("All workers terminated");
  }
  /**
   * Clean up idle workers
   */
  cleanupIdleWorkers(t = 3e5) {
    const e = Date.now(), s = [];
    this.workers.forEach((i, n) => {
      !i.busy && e - i.lastUsed > t && s.push(n);
    }), s.forEach((i) => {
      this.terminateWorker(i);
    }), s.length > 0 && console.log(`Cleaned up ${s.length} idle workers`);
  }
  /**
   * Check if workers are supported and enabled
   */
  isEnabled() {
    return this.config.enableWorkers;
  }
  /**
   * Enable or disable workers
   */
  setEnabled(t) {
    this.config.enableWorkers = t && this._checkWorkerSupport(), this.config.enableWorkers || this.terminateAll();
  }
  /**
   * Update configuration
   */
  updateConfig(t) {
    this.config = { ...this.config, ...t };
  }
  /**
   * Dispose of the worker manager
   */
  dispose() {
    this.terminateAll(), console.log("WorkerManager disposed");
  }
}
class Lo extends Ls {
  constructor() {
    super(), this.layoutWorkerScript = null, this.initialized = !1;
  }
  /**
   * Initialize layout workers
   */
  async init() {
    if (!this.config.enableWorkers)
      return console.log("Layout workers disabled - using main thread calculations"), !1;
    try {
      const t = new URL("data:text/javascript;base64,LyoqCiAqIExheW91dFdvcmtlciAtIFdlYiBXb3JrZXIgZm9yIGhlYXZ5IGxheW91dCBjYWxjdWxhdGlvbnMKICogSGFuZGxlcyBmb3JjZS1kaXJlY3RlZCBsYXlvdXQsIGhpZXJhcmNoaWNhbCBsYXlvdXQsIGFuZCBvdGhlciBjb21wdXRhdGlvbmFsbHkgaW50ZW5zaXZlIGxheW91dHMKICovCgovLyBXb3JrZXIgc3RhdGUKbGV0IGlzUnVubmluZyA9IGZhbHNlOwpsZXQgbGF5b3V0VHlwZSA9ICdmb3JjZSc7CmxldCBub2RlcyA9IFtdOwpsZXQgZWRnZXMgPSBbXTsKbGV0IGNvbmZpZyA9IHt9OwpsZXQgYW5pbWF0aW9uSWQgPSBudWxsOwoKLy8gTGF5b3V0IGFsZ29yaXRobXMKY29uc3QgbGF5b3V0cyA9IHsKICAgIGZvcmNlOiBmb3JjZURpcmVjdGVkTGF5b3V0LAogICAgaGllcmFyY2hpY2FsOiBoaWVyYXJjaGljYWxMYXlvdXQsCiAgICBjaXJjdWxhcjogY2lyY3VsYXJMYXlvdXQsCiAgICBncmlkOiBncmlkTGF5b3V0Cn07CgovKioKICogTWVzc2FnZSBoYW5kbGVyIGZvciB3b3JrZXIgY29tbXVuaWNhdGlvbgogKi8Kc2VsZi5vbm1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7CiAgICBjb25zdCB7IHR5cGUsIGRhdGEgfSA9IGUuZGF0YTsKICAgIAogICAgc3dpdGNoICh0eXBlKSB7CiAgICAgICAgY2FzZSAnaW5pdCc6CiAgICAgICAgICAgIGluaXRMYXlvdXQoZGF0YSk7CiAgICAgICAgICAgIGJyZWFrOwogICAgICAgIGNhc2UgJ3VwZGF0ZSc6CiAgICAgICAgICAgIHVwZGF0ZUxheW91dChkYXRhKTsKICAgICAgICAgICAgYnJlYWs7CiAgICAgICAgY2FzZSAnc3RlcCc6CiAgICAgICAgICAgIHN0ZXBMYXlvdXQoKTsKICAgICAgICAgICAgYnJlYWs7CiAgICAgICAgY2FzZSAnc3RhcnQnOgogICAgICAgICAgICBzdGFydExheW91dCgpOwogICAgICAgICAgICBicmVhazsKICAgICAgICBjYXNlICdzdG9wJzoKICAgICAgICAgICAgc3RvcExheW91dCgpOwogICAgICAgICAgICBicmVhazsKICAgICAgICBjYXNlICdjb25maWd1cmUnOgogICAgICAgICAgICBjb25maWd1cmVMYXlvdXQoZGF0YSk7CiAgICAgICAgICAgIGJyZWFrOwogICAgICAgIGRlZmF1bHQ6CiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gbWVzc2FnZSB0eXBlOicsIHR5cGUpOwogICAgfQp9OwoKLyoqCiAqIEluaXRpYWxpemUgbGF5b3V0IHdpdGggbm9kZXMgYW5kIGVkZ2VzCiAqLwpmdW5jdGlvbiBpbml0TGF5b3V0KGRhdGEpIHsKICAgIG5vZGVzID0gZGF0YS5ub2RlcyB8fCBbXTsKICAgIGVkZ2VzID0gZGF0YS5lZGdlcyB8fCBbXTsKICAgIGNvbmZpZyA9IGRhdGEuY29uZmlnIHx8IHt9OwogICAgbGF5b3V0VHlwZSA9IGRhdGEubGF5b3V0VHlwZSB8fCAnZm9yY2UnOwogICAgCiAgICAvLyBJbml0aWFsaXplIG5vZGUgdmVsb2NpdGllcyBhbmQgZm9yY2VzIGZvciBwaHlzaWNzLWJhc2VkIGxheW91dHMKICAgIG5vZGVzLmZvckVhY2gobm9kZSA9PiB7CiAgICAgICAgbm9kZS52eCA9IG5vZGUudnggfHwgMDsKICAgICAgICBub2RlLnZ5ID0gbm9kZS52eSB8fCAwOwogICAgICAgIG5vZGUudnogPSBub2RlLnZ6IHx8IDA7CiAgICAgICAgbm9kZS5meCA9IDA7CiAgICAgICAgbm9kZS5meSA9IDA7CiAgICAgICAgbm9kZS5meiA9IDA7CiAgICB9KTsKICAgIAogICAgc2VsZi5wb3N0TWVzc2FnZSh7CiAgICAgICAgdHlwZTogJ2luaXRpYWxpemVkJywKICAgICAgICBkYXRhOiB7IG5vZGVDb3VudDogbm9kZXMubGVuZ3RoLCBlZGdlQ291bnQ6IGVkZ2VzLmxlbmd0aCB9CiAgICB9KTsKfQoKLyoqCiAqIFVwZGF0ZSBsYXlvdXQgZGF0YQogKi8KZnVuY3Rpb24gdXBkYXRlTGF5b3V0KGRhdGEpIHsKICAgIGlmIChkYXRhLm5vZGVzKSBub2RlcyA9IGRhdGEubm9kZXM7CiAgICBpZiAoZGF0YS5lZGdlcykgZWRnZXMgPSBkYXRhLmVkZ2VzOwogICAgaWYgKGRhdGEuY29uZmlnKSBjb25maWcgPSB7IC4uLmNvbmZpZywgLi4uZGF0YS5jb25maWcgfTsKICAgIGlmIChkYXRhLmxheW91dFR5cGUpIGxheW91dFR5cGUgPSBkYXRhLmxheW91dFR5cGU7Cn0KCi8qKgogKiBTdGFydCBjb250aW51b3VzIGxheW91dCBjYWxjdWxhdGlvbgogKi8KZnVuY3Rpb24gc3RhcnRMYXlvdXQoKSB7CiAgICBpZiAoaXNSdW5uaW5nKSByZXR1cm47CiAgICAKICAgIGlzUnVubmluZyA9IHRydWU7CiAgICBhbmltYXRpb25JZCA9IHNldEludGVydmFsKCgpID0+IHsKICAgICAgICBzdGVwTGF5b3V0KCk7CiAgICB9LCAxNik7IC8vIH42MCBGUFMKICAgIAogICAgc2VsZi5wb3N0TWVzc2FnZSh7IHR5cGU6ICdzdGFydGVkJyB9KTsKfQoKLyoqCiAqIFN0b3AgbGF5b3V0IGNhbGN1bGF0aW9uCiAqLwpmdW5jdGlvbiBzdG9wTGF5b3V0KCkgewogICAgaWYgKCFpc1J1bm5pbmcpIHJldHVybjsKICAgIAogICAgaXNSdW5uaW5nID0gZmFsc2U7CiAgICBpZiAoYW5pbWF0aW9uSWQpIHsKICAgICAgICBjbGVhckludGVydmFsKGFuaW1hdGlvbklkKTsKICAgICAgICBhbmltYXRpb25JZCA9IG51bGw7CiAgICB9CiAgICAKICAgIHNlbGYucG9zdE1lc3NhZ2UoeyB0eXBlOiAnc3RvcHBlZCcgfSk7Cn0KCi8qKgogKiBQZXJmb3JtIG9uZSBzdGVwIG9mIGxheW91dCBjYWxjdWxhdGlvbgogKi8KZnVuY3Rpb24gc3RlcExheW91dCgpIHsKICAgIGlmIChub2Rlcy5sZW5ndGggPT09IDApIHJldHVybjsKICAgIAogICAgY29uc3QgbGF5b3V0RnVuY3Rpb24gPSBsYXlvdXRzW2xheW91dFR5cGVdOwogICAgaWYgKCFsYXlvdXRGdW5jdGlvbikgewogICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gbGF5b3V0IHR5cGU6JywgbGF5b3V0VHlwZSk7CiAgICAgICAgcmV0dXJuOwogICAgfQogICAgCiAgICBjb25zdCBzdGFydFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTsKICAgIAogICAgLy8gQ2FsY3VsYXRlIG5ldyBwb3NpdGlvbnMKICAgIGNvbnN0IHJlc3VsdCA9IGxheW91dEZ1bmN0aW9uKG5vZGVzLCBlZGdlcywgY29uZmlnKTsKICAgIAogICAgY29uc3QgZW5kVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpOwogICAgY29uc3QgY29tcHV0ZVRpbWUgPSBlbmRUaW1lIC0gc3RhcnRUaW1lOwogICAgCiAgICAvLyBTZW5kIHJlc3VsdHMgYmFjayB0byBtYWluIHRocmVhZAogICAgc2VsZi5wb3N0TWVzc2FnZSh7CiAgICAgICAgdHlwZTogJ3N0ZXAnLAogICAgICAgIGRhdGE6IHsKICAgICAgICAgICAgbm9kZXM6IHJlc3VsdC5ub2RlcywKICAgICAgICAgICAgY29udmVyZ2VkOiByZXN1bHQuY29udmVyZ2VkLAogICAgICAgICAgICBpdGVyYXRpb246IHJlc3VsdC5pdGVyYXRpb24sCiAgICAgICAgICAgIGVuZXJneTogcmVzdWx0LmVuZXJneSwKICAgICAgICAgICAgY29tcHV0ZVRpbWU6IGNvbXB1dGVUaW1lCiAgICAgICAgfQogICAgfSk7Cn0KCi8qKgogKiBDb25maWd1cmUgbGF5b3V0IHBhcmFtZXRlcnMKICovCmZ1bmN0aW9uIGNvbmZpZ3VyZUxheW91dChuZXdDb25maWcpIHsKICAgIGNvbmZpZyA9IHsgLi4uY29uZmlnLCAuLi5uZXdDb25maWcgfTsKICAgIHNlbGYucG9zdE1lc3NhZ2UoeyB0eXBlOiAnY29uZmlndXJlZCcsIGRhdGE6IGNvbmZpZyB9KTsKfQoKLyoqCiAqIEZvcmNlLWRpcmVjdGVkIGxheW91dCBhbGdvcml0aG0gKEZydWNodGVybWFuLVJlaW5nb2xkKQogKi8KZnVuY3Rpb24gZm9yY2VEaXJlY3RlZExheW91dChub2RlcywgZWRnZXMsIGNvbmZpZykgewogICAgY29uc3QgewogICAgICAgIHdpZHRoID0gMTAwMCwKICAgICAgICBoZWlnaHQgPSAxMDAwLAogICAgICAgIGRlcHRoID0gMTAwMCwKICAgICAgICBpdGVyYXRpb25zID0gMSwKICAgICAgICB0ZW1wZXJhdHVyZSA9IDEwMCwKICAgICAgICBjb29saW5nID0gMC45OSwKICAgICAgICByZXB1bHNpb25TdHJlbmd0aCA9IDEwMDAsCiAgICAgICAgYXR0cmFjdGlvblN0cmVuZ3RoID0gMSwKICAgICAgICBtaW5EaXN0YW5jZSA9IDEwLAogICAgICAgIG1heERpc3RhbmNlID0gMjAwLAogICAgICAgIGRhbXBpbmcgPSAwLjkKICAgIH0gPSBjb25maWc7CiAgICAKICAgIGxldCBjdXJyZW50VGVtcCA9IHRlbXBlcmF0dXJlOwogICAgbGV0IHRvdGFsRW5lcmd5ID0gMDsKICAgIAogICAgZm9yIChsZXQgaXRlciA9IDA7IGl0ZXIgPCBpdGVyYXRpb25zOyBpdGVyKyspIHsKICAgICAgICAvLyBSZXNldCBmb3JjZXMKICAgICAgICBub2Rlcy5mb3JFYWNoKG5vZGUgPT4gewogICAgICAgICAgICBub2RlLmZ4ID0gMDsKICAgICAgICAgICAgbm9kZS5meSA9IDA7CiAgICAgICAgICAgIG5vZGUuZnogPSAwOwogICAgICAgIH0pOwogICAgICAgIAogICAgICAgIC8vIFJlcHVsc2lvbiBmb3JjZXMgKGFsbCBwYWlycykKICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7CiAgICAgICAgICAgIGZvciAobGV0IGogPSBpICsgMTsgaiA8IG5vZGVzLmxlbmd0aDsgaisrKSB7CiAgICAgICAgICAgICAgICBjb25zdCBub2RlQSA9IG5vZGVzW2ldOwogICAgICAgICAgICAgICAgY29uc3Qgbm9kZUIgPSBub2Rlc1tqXTsKICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgY29uc3QgZHggPSBub2RlQi54IC0gbm9kZUEueCB8fCAwLjE7IC8vIEF2b2lkIGRpdmlzaW9uIGJ5IHplcm8KICAgICAgICAgICAgICAgIGNvbnN0IGR5ID0gbm9kZUIueSAtIG5vZGVBLnkgfHwgMC4xOwogICAgICAgICAgICAgICAgY29uc3QgZHogPSBub2RlQi56IC0gbm9kZUEueiB8fCAwLjE7CiAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlID0gTWF0aC5zcXJ0KGR4ICogZHggKyBkeSAqIGR5ICsgZHogKiBkeik7CiAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgIGlmIChkaXN0YW5jZSA+IDAgJiYgZGlzdGFuY2UgPCBtYXhEaXN0YW5jZSkgewogICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcmNlID0gcmVwdWxzaW9uU3RyZW5ndGggLyAoZGlzdGFuY2UgKiBkaXN0YW5jZSk7CiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnggPSAoZHggLyBkaXN0YW5jZSkgKiBmb3JjZTsKICAgICAgICAgICAgICAgICAgICBjb25zdCBmeSA9IChkeSAvIGRpc3RhbmNlKSAqIGZvcmNlOwogICAgICAgICAgICAgICAgICAgIGNvbnN0IGZ6ID0gKGR6IC8gZGlzdGFuY2UpICogZm9yY2U7CiAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgbm9kZUEuZnggLT0gZng7CiAgICAgICAgICAgICAgICAgICAgbm9kZUEuZnkgLT0gZnk7CiAgICAgICAgICAgICAgICAgICAgbm9kZUEuZnogLT0gZno7CiAgICAgICAgICAgICAgICAgICAgbm9kZUIuZnggKz0gZng7CiAgICAgICAgICAgICAgICAgICAgbm9kZUIuZnkgKz0gZnk7CiAgICAgICAgICAgICAgICAgICAgbm9kZUIuZnogKz0gZno7CiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH0KICAgICAgICB9CiAgICAgICAgCiAgICAgICAgLy8gQXR0cmFjdGlvbiBmb3JjZXMgKGNvbm5lY3RlZCBub2RlcykKICAgICAgICBlZGdlcy5mb3JFYWNoKGVkZ2UgPT4gewogICAgICAgICAgICBjb25zdCBzb3VyY2UgPSBub2Rlcy5maW5kKG4gPT4gbi5pZCA9PT0gZWRnZS5zb3VyY2UpOwogICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBub2Rlcy5maW5kKG4gPT4gbi5pZCA9PT0gZWRnZS50YXJnZXQpOwogICAgICAgICAgICAKICAgICAgICAgICAgaWYgKCFzb3VyY2UgfHwgIXRhcmdldCkgcmV0dXJuOwogICAgICAgICAgICAKICAgICAgICAgICAgY29uc3QgZHggPSB0YXJnZXQueCAtIHNvdXJjZS54OwogICAgICAgICAgICBjb25zdCBkeSA9IHRhcmdldC55IC0gc291cmNlLnk7CiAgICAgICAgICAgIGNvbnN0IGR6ID0gdGFyZ2V0LnogLSBzb3VyY2UuejsKICAgICAgICAgICAgCiAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlID0gTWF0aC5zcXJ0KGR4ICogZHggKyBkeSAqIGR5ICsgZHogKiBkeik7CiAgICAgICAgICAgIAogICAgICAgICAgICBpZiAoZGlzdGFuY2UgPiBtaW5EaXN0YW5jZSkgewogICAgICAgICAgICAgICAgY29uc3QgZm9yY2UgPSBhdHRyYWN0aW9uU3RyZW5ndGggKiBkaXN0YW5jZTsKICAgICAgICAgICAgICAgIGNvbnN0IGZ4ID0gKGR4IC8gZGlzdGFuY2UpICogZm9yY2U7CiAgICAgICAgICAgICAgICBjb25zdCBmeSA9IChkeSAvIGRpc3RhbmNlKSAqIGZvcmNlOwogICAgICAgICAgICAgICAgY29uc3QgZnogPSAoZHogLyBkaXN0YW5jZSkgKiBmb3JjZTsKICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgc291cmNlLmZ4ICs9IGZ4OwogICAgICAgICAgICAgICAgc291cmNlLmZ5ICs9IGZ5OwogICAgICAgICAgICAgICAgc291cmNlLmZ6ICs9IGZ6OwogICAgICAgICAgICAgICAgdGFyZ2V0LmZ4IC09IGZ4OwogICAgICAgICAgICAgICAgdGFyZ2V0LmZ5IC09IGZ5OwogICAgICAgICAgICAgICAgdGFyZ2V0LmZ6IC09IGZ6OwogICAgICAgICAgICB9CiAgICAgICAgfSk7CiAgICAgICAgCiAgICAgICAgLy8gQXBwbHkgZm9yY2VzIGFuZCB1cGRhdGUgcG9zaXRpb25zCiAgICAgICAgbm9kZXMuZm9yRWFjaChub2RlID0+IHsKICAgICAgICAgICAgLy8gVXBkYXRlIHZlbG9jaXR5IHdpdGggZGFtcGluZwogICAgICAgICAgICBub2RlLnZ4ID0gKG5vZGUudnggKyBub2RlLmZ4KSAqIGRhbXBpbmc7CiAgICAgICAgICAgIG5vZGUudnkgPSAobm9kZS52eSArIG5vZGUuZnkpICogZGFtcGluZzsKICAgICAgICAgICAgbm9kZS52eiA9IChub2RlLnZ6ICsgbm9kZS5meikgKiBkYW1waW5nOwogICAgICAgICAgICAKICAgICAgICAgICAgLy8gTGltaXQgdmVsb2NpdHkgYnkgdGVtcGVyYXR1cmUKICAgICAgICAgICAgY29uc3QgdmVsb2NpdHkgPSBNYXRoLnNxcnQobm9kZS52eCAqIG5vZGUudnggKyBub2RlLnZ5ICogbm9kZS52eSArIG5vZGUudnogKiBub2RlLnZ6KTsKICAgICAgICAgICAgaWYgKHZlbG9jaXR5ID4gY3VycmVudFRlbXApIHsKICAgICAgICAgICAgICAgIGNvbnN0IHNjYWxlID0gY3VycmVudFRlbXAgLyB2ZWxvY2l0eTsKICAgICAgICAgICAgICAgIG5vZGUudnggKj0gc2NhbGU7CiAgICAgICAgICAgICAgICBub2RlLnZ5ICo9IHNjYWxlOwogICAgICAgICAgICAgICAgbm9kZS52eiAqPSBzY2FsZTsKICAgICAgICAgICAgfQogICAgICAgICAgICAKICAgICAgICAgICAgLy8gVXBkYXRlIHBvc2l0aW9uCiAgICAgICAgICAgIG5vZGUueCArPSBub2RlLnZ4OwogICAgICAgICAgICBub2RlLnkgKz0gbm9kZS52eTsKICAgICAgICAgICAgbm9kZS56ICs9IG5vZGUudno7CiAgICAgICAgICAgIAogICAgICAgICAgICAvLyBDYWxjdWxhdGUgZW5lcmd5IGZvciBjb252ZXJnZW5jZSBkZXRlY3Rpb24KICAgICAgICAgICAgdG90YWxFbmVyZ3kgKz0gdmVsb2NpdHkgKiB2ZWxvY2l0eTsKICAgICAgICB9KTsKICAgICAgICAKICAgICAgICAvLyBDb29sIGRvd24KICAgICAgICBjdXJyZW50VGVtcCAqPSBjb29saW5nOwogICAgfQogICAgCiAgICAvLyBDaGVjayBjb252ZXJnZW5jZQogICAgY29uc3QgYXZnRW5lcmd5ID0gdG90YWxFbmVyZ3kgLyBub2Rlcy5sZW5ndGg7CiAgICBjb25zdCBjb252ZXJnZWQgPSBhdmdFbmVyZ3kgPCAwLjE7CiAgICAKICAgIHJldHVybiB7CiAgICAgICAgbm9kZXM6IG5vZGVzLAogICAgICAgIGNvbnZlcmdlZDogY29udmVyZ2VkLAogICAgICAgIGl0ZXJhdGlvbjogaXRlcmF0aW9ucywKICAgICAgICBlbmVyZ3k6IGF2Z0VuZXJneQogICAgfTsKfQoKLyoqCiAqIEhpZXJhcmNoaWNhbCBsYXlvdXQgYWxnb3JpdGhtCiAqLwpmdW5jdGlvbiBoaWVyYXJjaGljYWxMYXlvdXQobm9kZXMsIGVkZ2VzLCBjb25maWcpIHsKICAgIGNvbnN0IHsKICAgICAgICBsZXZlbFNlcGFyYXRpb24gPSAyMDAsCiAgICAgICAgbm9kZVNlcGFyYXRpb24gPSAxMDAsCiAgICAgICAgZGlyZWN0aW9uID0gJ3ZlcnRpY2FsJwogICAgfSA9IGNvbmZpZzsKICAgIAogICAgLy8gQnVpbGQgaGllcmFyY2h5CiAgICBjb25zdCBsZXZlbHMgPSBuZXcgTWFwKCk7CiAgICBjb25zdCB2aXNpdGVkID0gbmV3IFNldCgpOwogICAgY29uc3Qgcm9vdHMgPSBub2Rlcy5maWx0ZXIobm9kZSA9PiAKICAgICAgICAhZWRnZXMuc29tZShlZGdlID0+IGVkZ2UudGFyZ2V0ID09PSBub2RlLmlkKQogICAgKTsKICAgIAogICAgaWYgKHJvb3RzLmxlbmd0aCA9PT0gMCAmJiBub2Rlcy5sZW5ndGggPiAwKSB7CiAgICAgICAgcm9vdHMucHVzaChub2Rlc1swXSk7IC8vIEZhbGxiYWNrIHJvb3QKICAgIH0KICAgIAogICAgLy8gQkZTIHRvIGFzc2lnbiBsZXZlbHMKICAgIGNvbnN0IHF1ZXVlID0gcm9vdHMubWFwKHJvb3QgPT4gKHsgbm9kZTogcm9vdCwgbGV2ZWw6IDAgfSkpOwogICAgCiAgICB3aGlsZSAocXVldWUubGVuZ3RoID4gMCkgewogICAgICAgIGNvbnN0IHsgbm9kZSwgbGV2ZWwgfSA9IHF1ZXVlLnNoaWZ0KCk7CiAgICAgICAgCiAgICAgICAgaWYgKHZpc2l0ZWQuaGFzKG5vZGUuaWQpKSBjb250aW51ZTsKICAgICAgICB2aXNpdGVkLmFkZChub2RlLmlkKTsKICAgICAgICAKICAgICAgICBpZiAoIWxldmVscy5oYXMobGV2ZWwpKSB7CiAgICAgICAgICAgIGxldmVscy5zZXQobGV2ZWwsIFtdKTsKICAgICAgICB9CiAgICAgICAgbGV2ZWxzLmdldChsZXZlbCkucHVzaChub2RlKTsKICAgICAgICAKICAgICAgICAvLyBBZGQgY2hpbGRyZW4gdG8gcXVldWUKICAgICAgICBlZGdlcy5mb3JFYWNoKGVkZ2UgPT4gewogICAgICAgICAgICBpZiAoZWRnZS5zb3VyY2UgPT09IG5vZGUuaWQpIHsKICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkTm9kZSA9IG5vZGVzLmZpbmQobiA9PiBuLmlkID09PSBlZGdlLnRhcmdldCk7CiAgICAgICAgICAgICAgICBpZiAoY2hpbGROb2RlICYmICF2aXNpdGVkLmhhcyhjaGlsZE5vZGUuaWQpKSB7CiAgICAgICAgICAgICAgICAgICAgcXVldWUucHVzaCh7IG5vZGU6IGNoaWxkTm9kZSwgbGV2ZWw6IGxldmVsICsgMSB9KTsKICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgfQogICAgICAgIH0pOwogICAgfQogICAgCiAgICAvLyBQb3NpdGlvbiBub2RlcwogICAgbGV2ZWxzLmZvckVhY2goKGxldmVsTm9kZXMsIGxldmVsKSA9PiB7CiAgICAgICAgbGV2ZWxOb2Rlcy5mb3JFYWNoKChub2RlLCBpbmRleCkgPT4gewogICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSAndmVydGljYWwnKSB7CiAgICAgICAgICAgICAgICBub2RlLnggPSAoaW5kZXggLSBsZXZlbE5vZGVzLmxlbmd0aCAvIDIpICogbm9kZVNlcGFyYXRpb247CiAgICAgICAgICAgICAgICBub2RlLnkgPSAtbGV2ZWwgKiBsZXZlbFNlcGFyYXRpb247CiAgICAgICAgICAgICAgICBub2RlLnogPSAwOwogICAgICAgICAgICB9IGVsc2UgewogICAgICAgICAgICAgICAgbm9kZS54ID0gbGV2ZWwgKiBsZXZlbFNlcGFyYXRpb247CiAgICAgICAgICAgICAgICBub2RlLnkgPSAoaW5kZXggLSBsZXZlbE5vZGVzLmxlbmd0aCAvIDIpICogbm9kZVNlcGFyYXRpb247CiAgICAgICAgICAgICAgICBub2RlLnogPSAwOwogICAgICAgICAgICB9CiAgICAgICAgfSk7CiAgICB9KTsKICAgIAogICAgcmV0dXJuIHsKICAgICAgICBub2Rlczogbm9kZXMsCiAgICAgICAgY29udmVyZ2VkOiB0cnVlLAogICAgICAgIGl0ZXJhdGlvbjogMSwKICAgICAgICBlbmVyZ3k6IDAKICAgIH07Cn0KCi8qKgogKiBDaXJjdWxhciBsYXlvdXQgYWxnb3JpdGhtCiAqLwpmdW5jdGlvbiBjaXJjdWxhckxheW91dChub2RlcywgZWRnZXMsIGNvbmZpZykgewogICAgY29uc3QgewogICAgICAgIHJhZGl1cyA9IDMwMCwKICAgICAgICBzdGFydEFuZ2xlID0gMAogICAgfSA9IGNvbmZpZzsKICAgIAogICAgY29uc3QgYW5nbGVTdGVwID0gKDIgKiBNYXRoLlBJKSAvIG5vZGVzLmxlbmd0aDsKICAgIAogICAgbm9kZXMuZm9yRWFjaCgobm9kZSwgaW5kZXgpID0+IHsKICAgICAgICBjb25zdCBhbmdsZSA9IHN0YXJ0QW5nbGUgKyBpbmRleCAqIGFuZ2xlU3RlcDsKICAgICAgICBub2RlLnggPSBNYXRoLmNvcyhhbmdsZSkgKiByYWRpdXM7CiAgICAgICAgbm9kZS55ID0gTWF0aC5zaW4oYW5nbGUpICogcmFkaXVzOwogICAgICAgIG5vZGUueiA9IDA7CiAgICB9KTsKICAgIAogICAgcmV0dXJuIHsKICAgICAgICBub2Rlczogbm9kZXMsCiAgICAgICAgY29udmVyZ2VkOiB0cnVlLAogICAgICAgIGl0ZXJhdGlvbjogMSwKICAgICAgICBlbmVyZ3k6IDAKICAgIH07Cn0KCi8qKgogKiBHcmlkIGxheW91dCBhbGdvcml0aG0KICovCmZ1bmN0aW9uIGdyaWRMYXlvdXQobm9kZXMsIGVkZ2VzLCBjb25maWcpIHsKICAgIGNvbnN0IHsKICAgICAgICBzcGFjaW5nID0gMTAwLAogICAgICAgIGNvbHVtbnMgPSBNYXRoLmNlaWwoTWF0aC5zcXJ0KG5vZGVzLmxlbmd0aCkpCiAgICB9ID0gY29uZmlnOwogICAgCiAgICBub2Rlcy5mb3JFYWNoKChub2RlLCBpbmRleCkgPT4gewogICAgICAgIGNvbnN0IHJvdyA9IE1hdGguZmxvb3IoaW5kZXggLyBjb2x1bW5zKTsKICAgICAgICBjb25zdCBjb2wgPSBpbmRleCAlIGNvbHVtbnM7CiAgICAgICAgCiAgICAgICAgbm9kZS54ID0gY29sICogc3BhY2luZyAtIChjb2x1bW5zICogc3BhY2luZykgLyAyOwogICAgICAgIG5vZGUueSA9IHJvdyAqIHNwYWNpbmcgLSAoTWF0aC5jZWlsKG5vZGVzLmxlbmd0aCAvIGNvbHVtbnMpICogc3BhY2luZykgLyAyOwogICAgICAgIG5vZGUueiA9IDA7CiAgICB9KTsKICAgIAogICAgcmV0dXJuIHsKICAgICAgICBub2Rlczogbm9kZXMsCiAgICAgICAgY29udmVyZ2VkOiB0cnVlLAogICAgICAgIGl0ZXJhdGlvbjogMSwKICAgICAgICBlbmVyZ3k6IDAKICAgIH07Cn0KCi8vIFNlbmQgcmVhZHkgc2lnbmFsCnNlbGYucG9zdE1lc3NhZ2UoeyB0eXBlOiAncmVhZHknIH0pOw==", import.meta.url), e = this.createWorkerPool("layout", t, Math.min(2, this.config.maxWorkers));
      return this.initialized = e, console.log(`Layout worker manager initialized: ${e}`), e;
    } catch (t) {
      return console.error("Failed to initialize layout workers:", t), this.initialized = !1, !1;
    }
  }
  /**
   * Calculate layout using workers
   */
  async calculateLayout(t, e, s, i = {}) {
    if (!this.initialized)
      throw new Error("Layout worker manager not initialized");
    const n = {
      type: "calculate",
      layoutType: t,
      nodes: e.map((o) => ({
        id: o.id,
        x: o.position.x,
        y: o.position.y,
        z: o.position.z
      })),
      edges: s.map((o) => ({
        id: o.id,
        source: o.source.id,
        target: o.target.id
      })),
      config: i
    };
    return this.executeTask("layout", n);
  }
  /**
   * Start continuous layout calculation
   */
  async startContinuousLayout(t, e, s, i = {}) {
    if (!this.initialized)
      throw new Error("Layout worker manager not initialized");
    const n = {
      type: "start_continuous",
      layoutType: t,
      nodes: e,
      edges: s,
      config: i
    };
    return this.executeTask("layout", n);
  }
  /**
   * Stop continuous layout calculation
   */
  async stopContinuousLayout() {
    if (!this.initialized) return;
    const t = { type: "stop_continuous" };
    return this.executeTask("layout", t);
  }
}
class Po extends U {
  constructor(t, e, s = {}) {
    super(t, e), this.config = {
      enabled: !0,
      // Performance features
      enableInstancing: !0,
      enableCulling: !0,
      enableLOD: !0,
      enableMemoryManagement: !0,
      enableWorkers: !0,
      // Auto-optimization
      autoOptimize: !0,
      optimizationInterval: 5e3,
      // 5 seconds
      // Performance thresholds
      targetFrameRate: 60,
      performanceThreshold: 0.8,
      // Optimize when performance drops below 80%
      ...s
    }, this.performanceManager = null, this.workerManager = null, this.layoutWorkerManager = null, this.optimizationTimer = null, this.performanceMetrics = {
      frameRate: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      objectCount: 0
    }, this.isMonitoring = !1;
  }
  getName() {
    return "PerformancePlugin";
  }
  init() {
    if (super.init(), !this.config.enabled) {
      console.log("PerformancePlugin disabled");
      return;
    }
    this.performanceManager = new xo(this.space), this.workerManager = new Ls(), this.layoutWorkerManager = new Lo();
    const t = this.pluginManager.getPlugin("RenderingPlugin");
    t && this.performanceManager.init(t), this.config.enableWorkers && this._initializeWorkers(), this.config.autoOptimize && this._startPerformanceMonitoring(), this._exposePerformanceAPI(), this._subscribeToEvents(), console.log("PerformancePlugin initialized");
  }
  /**
   * Initialize web workers
   */
  async _initializeWorkers() {
    try {
      await this.layoutWorkerManager.init(), console.log("Performance workers initialized");
    } catch (t) {
      console.error("Failed to initialize performance workers:", t);
    }
  }
  /**
   * Subscribe to relevant events
   */
  _subscribeToEvents() {
    this.space.on("render:beforeRender", () => {
      this.performanceManager && this.performanceManager.update();
    }), this.space.on("graph:changed", this._onGraphChanged.bind(this)), this.space.on("layout:calculate", this._onLayoutCalculate.bind(this));
  }
  /**
   * Start performance monitoring
   */
  _startPerformanceMonitoring() {
    this.isMonitoring || (this.isMonitoring = !0, this.optimizationTimer = setInterval(() => {
      this._updatePerformanceMetrics(), this._checkPerformanceThresholds();
    }, this.config.optimizationInterval), console.log("Performance monitoring started"));
  }
  /**
   * Stop performance monitoring
   */
  _stopPerformanceMonitoring() {
    this.isMonitoring && (this.isMonitoring = !1, this.optimizationTimer && (clearInterval(this.optimizationTimer), this.optimizationTimer = null), console.log("Performance monitoring stopped"));
  }
  /**
   * Update performance metrics
   */
  _updatePerformanceMetrics() {
    if (!this.performanceManager) return;
    const t = this.performanceManager.getStats();
    this.performanceMetrics = {
      frameRate: 1e3 / t.avgFrameTime,
      frameTime: t.avgFrameTime,
      memoryUsage: t.memoryUsage,
      objectCount: t.totalObjects,
      visibleObjects: t.visibleObjects,
      instancedObjects: t.instancedObjects
    }, this.space.emit("performance:update", this.performanceMetrics);
  }
  /**
   * Check performance thresholds and trigger optimizations
   */
  _checkPerformanceThresholds() {
    const e = 1e3 / this.config.targetFrameRate / this.performanceMetrics.frameTime;
    e < this.config.performanceThreshold && (console.log(`Performance below threshold (${(e * 100).toFixed(1)}%), triggering optimizations`), this._triggerOptimizations());
  }
  /**
   * Trigger performance optimizations
   */
  _triggerOptimizations() {
    this.performanceManager && (this.performanceManager.optimizePerformance(), this.space.emit("performance:optimized", {
      reason: "automatic",
      metrics: this.performanceMetrics
    }));
  }
  /**
   * Handle graph changes
   */
  _onGraphChanged(t) {
    (t.changeType === "major" || t.objectsChanged > 10) && this._updatePerformanceMetrics();
  }
  /**
   * Handle layout calculation requests
   */
  async _onLayoutCalculate(t) {
    if (!(!this.config.enableWorkers || !this.layoutWorkerManager.initialized))
      try {
        const { layoutType: e, nodes: s, edges: i, config: n } = t, o = await this.layoutWorkerManager.calculateLayout(
          e,
          s,
          i,
          n
        );
        this.space.emit("layout:result", o);
      } catch (e) {
        console.error("Worker layout calculation failed:", e), this.space.emit("layout:error", e);
      }
  }
  /**
   * Expose performance API to SpaceGraph
   */
  _exposePerformanceAPI() {
    this.space.performance = {
      // Performance monitoring
      getMetrics: () => this.getPerformanceMetrics(),
      getDetailedReport: () => this.getDetailedPerformanceReport(),
      // Configuration
      updateConfig: (t) => this.updatePerformanceConfig(t),
      getConfig: () => ({ ...this.config }),
      // Manual optimization
      optimize: () => this.optimizePerformance(),
      cleanup: () => this.cleanupPerformance(),
      // Feature controls
      setInstancingEnabled: (t) => this.setInstancingEnabled(t),
      setCullingEnabled: (t) => this.setCullingEnabled(t),
      setLODEnabled: (t) => this.setLODEnabled(t),
      setWorkersEnabled: (t) => this.setWorkersEnabled(t),
      // Worker controls
      getWorkerStats: () => this.getWorkerStats(),
      terminateWorkers: () => this.terminateWorkers(),
      // Monitoring controls
      startMonitoring: () => this._startPerformanceMonitoring(),
      stopMonitoring: () => this._stopPerformanceMonitoring(),
      isMonitoring: () => this.isMonitoring
    };
  }
  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }
  /**
   * Get detailed performance report
   */
  getDetailedPerformanceReport() {
    return this.performanceManager ? {
      metrics: this.getPerformanceMetrics(),
      manager: this.performanceManager.getPerformanceReport(),
      workers: this.workerManager ? this.workerManager.getStats() : null,
      config: { ...this.config }
    } : { error: "Performance manager not initialized" };
  }
  /**
   * Update performance configuration
   */
  updatePerformanceConfig(t) {
    const e = { ...this.config };
    this.config = { ...this.config, ...t }, this.performanceManager && this.performanceManager.updateConfig(this.config), this.workerManager && this.workerManager.updateConfig(this.config), e.autoOptimize !== this.config.autoOptimize && (this.config.autoOptimize ? this._startPerformanceMonitoring() : this._stopPerformanceMonitoring()), this.space.emit("performance:configChanged", { oldConfig: e, newConfig: this.config });
  }
  /**
   * Manually trigger performance optimization
   */
  optimizePerformance() {
    this.performanceManager && (this.performanceManager.optimizePerformance(), this.space.emit("performance:optimized", { reason: "manual" }));
  }
  /**
   * Cleanup performance resources
   */
  cleanupPerformance() {
    this.performanceManager && this.performanceManager.cleanup(), this.workerManager && this.workerManager.cleanupIdleWorkers(), this.space.emit("performance:cleanup");
  }
  /**
   * Enable/disable instancing
   */
  setInstancingEnabled(t) {
    this.config.enableInstancing = t, this.performanceManager && this.performanceManager.updateConfig({ enableInstancing: t });
  }
  /**
   * Enable/disable culling
   */
  setCullingEnabled(t) {
    this.config.enableCulling = t, this.performanceManager && this.performanceManager.updateConfig({ enableCulling: t });
  }
  /**
   * Enable/disable LOD
   */
  setLODEnabled(t) {
    this.config.enableLOD = t, this.performanceManager && this.performanceManager.updateConfig({ enableLOD: t });
  }
  /**
   * Enable/disable workers
   */
  setWorkersEnabled(t) {
    this.config.enableWorkers = t, this.workerManager && this.workerManager.setEnabled(t), this.layoutWorkerManager && this.layoutWorkerManager.setEnabled(t);
  }
  /**
   * Get worker statistics
   */
  getWorkerStats() {
    return {
      workerManager: this.workerManager ? this.workerManager.getStats() : null,
      layoutWorkerManager: this.layoutWorkerManager ? this.layoutWorkerManager.getStats() : null
    };
  }
  /**
   * Terminate all workers
   */
  terminateWorkers() {
    this.workerManager && this.workerManager.terminateAll(), this.layoutWorkerManager && this.layoutWorkerManager.terminateAll();
  }
  /**
   * Check if performance features are enabled
   */
  isEnabled() {
    return this.config.enabled;
  }
  /**
   * Enable/disable the entire performance plugin
   */
  setEnabled(t) {
    this.config.enabled = t, t ? this.config.autoOptimize && this._startPerformanceMonitoring() : (this._stopPerformanceMonitoring(), this.terminateWorkers());
  }
  /**
   * Get performance status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      monitoring: this.isMonitoring,
      instancing: this.config.enableInstancing,
      culling: this.config.enableCulling,
      lod: this.config.enableLOD,
      workers: this.config.enableWorkers,
      workerStats: this.getWorkerStats()
    };
  }
  dispose() {
    super.dispose(), this._stopPerformanceMonitoring(), this.performanceManager && (this.performanceManager.dispose(), this.performanceManager = null), this.workerManager && (this.workerManager.dispose(), this.workerManager = null), this.layoutWorkerManager && (this.layoutWorkerManager.dispose(), this.layoutWorkerManager = null), this.space.performance && delete this.space.performance, console.log("PerformancePlugin disposed");
  }
}
class zo {
  constructor(t, e = {}) {
    g(this, "_cam", null);
    g(this, "_listeners", /* @__PURE__ */ new Map());
    g(this, "plugins", null);
    g(this, "options", {});
    if (!t) throw new Error("SpaceGraph requires a valid HTML container element.");
    this.container = t, this.options = e, this.plugins = new Li(this);
    const s = e.ui || {}, { contextMenuElement: i, confirmDialogElement: n } = s;
    this.plugins.add(new An(this, this.plugins)), this.plugins.add(new mn(this, this.plugins)), this.plugins.add(new Nn(this, this.plugins)), this.plugins.add(new Bn(this, this.plugins)), this.plugins.add(new so(this, this.plugins)), this.plugins.add(new go(this, this.plugins, i, n)), this.plugins.add(new yo(this, this.plugins)), this.plugins.add(new bo(this, this.plugins)), this.plugins.add(new Mo(this, this.plugins)), this.plugins.add(new Po(this, this.plugins));
  }
  async init() {
    await this.plugins.initPlugins();
    const t = this.plugins.getPlugin("CameraPlugin");
    t == null || t.centerView(null, 0), t == null || t.setInitialState(), this._setupEventListeners();
  }
  on(t, e) {
    this._listeners.has(t) || this._listeners.set(t, /* @__PURE__ */ new Set()), this._listeners.get(t).add(e);
  }
  off(t, e) {
    var s;
    (s = this._listeners.get(t)) == null || s.delete(e);
  }
  emit(t, ...e) {
    var s;
    (s = this._listeners.get(t)) == null || s.forEach((i) => {
      i(...e);
    });
  }
  _setupEventListeners() {
    this.on("ui:request:addNode", (t) => {
      var e;
      (e = this.plugins.getPlugin("NodePlugin")) == null || e.addNode(t);
    }), this.on("ui:request:createNode", (t) => {
      var e;
      (e = this.plugins.getPlugin("NodePlugin")) == null || e.createAndAddNode(t);
    }), this.on("node:added", (t) => {
      t && setTimeout(() => {
        var e, s, i;
        this.focusOnNode(t, 0.6, !0), (e = this.plugins.getPlugin("UIPlugin")) == null || e.setSelectedNode(t), t instanceof L && t.data.editable && ((i = (s = t.htmlElement) == null ? void 0 : s.querySelector(".node-content")) == null || i.focus());
      }, 100);
    }), this.on("ui:request:removeNode", (t) => {
      var e;
      (e = this.plugins.getPlugin("NodePlugin")) == null || e.removeNode(t);
    }), this.on("ui:request:addEdge", (t, e, s) => {
      var i;
      (i = this.plugins.getPlugin("EdgePlugin")) == null || i.addEdge(t, e, s);
    }), this.on("edge:added", () => {
    }), this.on("ui:request:removeEdge", (t) => {
      var e;
      (e = this.plugins.getPlugin("EdgePlugin")) == null || e.removeEdge(t);
    }), this.on("ui:request:autoZoomNode", (t) => this.autoZoom(t)), this.on("ui:request:centerView", () => this.centerView()), this.on("ui:request:resetView", () => {
      var t;
      (t = this.plugins.getPlugin("CameraPlugin")) == null || t.resetView();
    }), this.on("ui:request:toggleBackground", (t, e) => {
      var s;
      (s = this.plugins.getPlugin("RenderingPlugin")) == null || s.setBackground(t, e);
    }), this.on("ui:request:reverseEdge", (t) => {
      var i;
      const e = this.plugins.getPlugin("EdgePlugin"), s = e == null ? void 0 : e.getEdgeById(t);
      s && ([s.source, s.target] = [s.target, s.source], s.update(), (i = this.plugins.getPlugin("LayoutPlugin")) == null || i.kick());
    }), this.on("ui:request:adjustContentScale", (t, e) => {
      t instanceof L && t.adjustContentScale(e);
    }), this.on("ui:request:adjustNodeSize", (t, e) => {
      t instanceof L && t.adjustNodeSize(e);
    }), this.on("ui:request:zoomCamera", (t) => {
      var e;
      (e = this.plugins.getPlugin("CameraPlugin")) == null || e.zoom(t);
    }), this.on(
      "ui:request:focusOnNode",
      (t, e, s) => this.focusOnNode(t, e, s)
    ), this.on("ui:request:updateEdge", (t, e, s) => {
      var o, a, r, l, c, d;
      const i = this.plugins.getPlugin("EdgePlugin"), n = i == null ? void 0 : i.getEdgeById(t);
      if (n)
        switch (e) {
          case "color":
            n.data.color = s, n.setHighlight((o = this.plugins.getPlugin("UIPlugin")) == null ? void 0 : o.getSelectedEdges().has(n));
            break;
          case "thickness":
            n.data.thickness = s, (a = n.line) != null && a.material && (n.line.material.linewidth = n.data.thickness);
            break;
          case "constraintType":
            n.data.constraintType = s, s === "rigid" && !((r = n.data.constraintParams) != null && r.distance) ? n.data.constraintParams = {
              distance: n.source.position.distanceTo(n.target.position),
              stiffness: 0.1
            } : s === "weld" && !((l = n.data.constraintParams) != null && l.distance) ? n.data.constraintParams = {
              distance: n.source.getBoundingSphereRadius() + n.target.getBoundingSphereRadius(),
              stiffness: 0.5
            } : s === "elastic" && !((c = n.data.constraintParams) != null && c.stiffness) && (n.data.constraintParams = { stiffness: 1e-3, idealLength: 200 }), (d = this.plugins.getPlugin("LayoutPlugin")) == null || d.kick();
            break;
        }
    });
  }
  addNode(t) {
    const e = this.plugins.getPlugin("NodePlugin"), s = this.plugins.getPlugin("LayoutPlugin"), i = e == null ? void 0 : e.addNode(t);
    return i && s && s.kick(), i;
  }
  addEdge(t, e, s = {}) {
    const i = this.plugins.getPlugin("EdgePlugin"), n = this.plugins.getPlugin("LayoutPlugin"), o = i == null ? void 0 : i.addEdge(t, e, s);
    return o && n && n.kick(), o;
  }
  createNode(t) {
    var e;
    return (e = this.plugins.getPlugin("NodePlugin")) == null ? void 0 : e.createAndAddNode(t);
  }
  togglePinNode(t) {
    var e, s;
    (s = (e = this.plugins.getPlugin("LayoutPlugin")) == null ? void 0 : e.layoutManager) == null || s.togglePinNode(t);
  }
  centerView(t = null, e = 0.7) {
    var s;
    (s = this.plugins.getPlugin("CameraPlugin")) == null || s.centerView(t, e);
  }
  focusOnNode(t, e = 0.6, s = !1) {
    var i;
    (i = this.plugins.getPlugin("CameraPlugin")) == null || i.focusOnNode(t, e, s);
  }
  autoZoom(t) {
    const e = this.plugins.getPlugin("CameraPlugin");
    !t || !e || (e.getCurrentTargetNodeId() === t.id ? (e.popState(), e.setCurrentTargetNodeId(null)) : (e.pushState(), e.setCurrentTargetNodeId(t.id), e.focusOnNode(t, 0.6, !1)));
  }
  screenToWorld(t, e, s = 0) {
    const i = this.plugins.getPlugin("CameraPlugin"), n = i == null ? void 0 : i.getCameraInstance();
    if (!n) return null;
    n.updateMatrixWorld();
    const o = new u.Raycaster(), a = new u.Vector2(t / window.innerWidth * 2 - 1, -(e / window.innerHeight) * 2 + 1);
    o.setFromCamera(a, n);
    const r = new u.Plane(new u.Vector3(0, 0, 1), -s), l = new u.Vector3();
    return o.ray.intersectPlane(r, l) ?? null;
  }
  intersectedObjects(t, e) {
    var C, b;
    const s = this.plugins.getPlugin("CameraPlugin"), i = s == null ? void 0 : s.getCameraInstance();
    if (!i) return null;
    i.updateMatrixWorld();
    const n = new u.Vector2(t / window.innerWidth * 2 - 1, -(e / window.innerHeight) * 2 + 1), o = new u.Raycaster();
    o.setFromCamera(n, i), o.params.Line.threshold = 5;
    const a = this.plugins.getPlugin("NodePlugin"), r = this.plugins.getPlugin("EdgePlugin"), l = this.plugins.getPlugin("RenderingPlugin"), c = l == null ? void 0 : l.getInstancedMeshManager(), d = r == null ? void 0 : r.instancedEdgeManager;
    let h = null;
    if (c) {
      const y = c.raycast(o);
      if (y) {
        const w = a == null ? void 0 : a.getNodeById(y.nodeId);
        w && (h = { node: w, distance: y.distance, type: "node" });
      }
    }
    const p = a == null ? void 0 : a.getNodes();
    if (p) {
      const y = [...p.values()].filter((w) => !w.isInstanced && w.mesh && w.mesh.visible).map((w) => w.mesh);
      if (y.length > 0) {
        const w = o.intersectObjects(y, !1);
        if (w.length > 0 && (!h || w[0].distance < h.distance)) {
          const v = w[0].object, I = a.getNodeById((C = v.userData) == null ? void 0 : C.nodeId);
          I && (h = { node: I, distance: w[0].distance, type: "node" });
        }
      }
    }
    if (d) {
      const y = d.raycast(o);
      if (y && (!h || y.distance < h.distance)) {
        const w = r == null ? void 0 : r.getEdgeById(y.edgeId);
        w && (h = { edge: w, distance: y.distance, type: "edge" });
      }
    }
    const f = r == null ? void 0 : r.getEdges();
    if (f) {
      const y = [...f.values()].filter((w) => !w.isInstanced && w.line && w.line.visible).map((w) => w.line);
      if (y.length > 0) {
        const w = o.intersectObjects(y, !1);
        if (w.length > 0 && (!h || w[0].distance < h.distance)) {
          const v = w[0].object, I = r.getEdgeById((b = v.userData) == null ? void 0 : b.edgeId);
          I && (h = { edge: I, distance: w[0].distance, type: "edge" });
        }
      }
    }
    return (h == null ? void 0 : h.type) === "node" ? { node: h.node, distance: h.distance } : (h == null ? void 0 : h.type) === "edge" ? { edge: h.edge, distance: h.distance } : null;
  }
  animate() {
    const t = () => {
      this.plugins.updatePlugins(), requestAnimationFrame(t);
    };
    t();
  }
  get layoutManager() {
    var t;
    return (t = this.plugins.getPlugin("LayoutPlugin")) == null ? void 0 : t.layoutManager;
  }
  dispose() {
    this.plugins.disposePlugins(), this._listeners.clear();
  }
  exportGraphToJSON(t) {
    var e;
    return ((e = this.plugins.getPlugin("DataPlugin")) == null ? void 0 : e.exportGraphToJSON(t)) || null;
  }
  async importGraphFromJSON(t, e) {
    var s;
    return await ((s = this.plugins.getPlugin("DataPlugin")) == null ? void 0 : s.importGraphFromJSON(t, e)) || !1;
  }
}
const Xe = class Xe {
  getName() {
    return Xe.generatorName;
  }
  /**
   * Generates a graph from a file system like structure.
   * @param {object} fsData - The file system data. Expected format:
   *                          { name: "root", type: "directory", children: [ ... ] }
   *                          { name: "file.txt", type: "file", size: 1024 }
   * @param {S.SpaceGraph} space - The SpaceGraph instance.
   * @param {object} options - Options like rootPosition.
   */
  generate(t, e, s = {}) {
    if (!t || !e) {
      console.error("FileSystemGenerator: Missing fsData or space instance.");
      return;
    }
    const n = { ...{
      rootPosition: { x: 0, y: 0, z: 0 },
      nodeTypeMapping: {
        directory: "group",
        // Or 'html' with custom styling
        file: "document"
        // Or 'html'
      },
      directoryData: (o) => ({
        label: o.name,
        // For GroupNode
        // defaultCollapsed: item.children && item.children.length > 5,
        // backgroundColor: 'rgba(70, 90, 110, 0.2)',
        // For HtmlNode (if used for directory)
        content: `📁 ${o.name}`,
        width: 150 + o.name.length * 5,
        height: 60,
        backgroundColor: "#334455",
        type: "html"
        // Explicitly set if using HTML for dirs
      }),
      fileData: (o) => ({
        label: o.name,
        icon: this._getFileIcon(o.name),
        // documentUrl: item.path, // If you have full paths
        size: o.size || 50,
        // Visual size for DocumentNode
        type: "document"
      })
    }, ...s };
    this._traverseFsItem(t, e, n, n.rootPosition, null);
  }
  _traverseFsItem(t, e, s, i, n = null) {
    let o;
    const a = t.type === "directory" ? s.nodeTypeMapping.directory : s.nodeTypeMapping.file;
    let r = {};
    t.type === "directory" ? r = s.directoryData(t) : r = s.fileData(t);
    const l = r.type || a;
    if (o = e.createNode({
      id: T.generateId(t.name),
      // Consider more robust ID generation if names clash
      type: l,
      position: { ...i },
      // Copy position
      data: r,
      mass: t.type === "directory" ? 1.5 : 0.8
    }), n && o && e.addEdge(n, o, { type: "straight", color: 11184810, thickness: 1.5 }), t.type === "directory" && t.children && t.children.length > 0)
      if (l === "group" && o) {
        const c = [];
        t.children.forEach((d, h) => {
          const p = {
            x: i.x + (h % 3 - 1) * 100,
            // Simple spread for demo
            y: i.y - 100 - Math.floor(h / 3) * 80,
            z: i.z + h % 2 * 20
          }, f = this._traverseFsItem(d, e, s, p, o);
          f && c.push(f.id);
        });
      } else
        t.children.forEach((c, d) => {
          const h = {
            x: i.x + (d % 3 - 1) * 150,
            y: i.y - 150 - Math.floor(d / 3) * 120,
            z: i.z + d % 2 * 30
          };
          this._traverseFsItem(c, e, s, h, o);
        });
    return o;
  }
  _getFileIcon(t) {
    switch (t.slice(t.lastIndexOf(".") + 1).toLowerCase()) {
      case "txt":
        return "📄";
      case "json":
        return "{ }";
      case "js":
        return "📜";
      case "html":
        return "🌐";
      case "css":
        return "🎨";
      case "md":
        return "📝";
      case "png":
      case "jpg":
      case "gif":
        return "🖼️";
      default:
        return "❔";
    }
  }
};
g(Xe, "generatorName", "fileSystem");
let hs = Xe;
const Ye = class Ye {
  getName() {
    return Ye.generatorName;
  }
  /**
   * Generates a graph from a JavaScript object.
   * @param {object} obj - The JavaScript object to visualize.
   * @param {S.SpaceGraph} space - The SpaceGraph instance.
   * @param {object} options - Options.
   */
  generate(t, e, s = {}) {
    if (typeof t != "object" || t === null || !e) {
      console.error("ObjectPropertyGenerator: Invalid input object or space instance.");
      return;
    }
    const n = { ...{
      rootPosition: { x: 0, y: 0, z: 0 },
      nodeType: "html",
      // Default type for properties
      maxDepth: 5,
      // To prevent infinite recursion with circular objects
      valueNodeColor: 6728430,
      objectNodeColor: 15641190,
      arrayNodeColor: 6745770
    }, ...s };
    this._traverseObject(t, e, n, n.rootPosition, null, "root", 0);
  }
  _traverseObject(t, e, s, i, n, o, a) {
    if (a > s.maxDepth) {
      const c = e.createNode({
        id: T.generateId(`max_depth_${o}`),
        type: s.nodeType,
        position: i,
        data: {
          label: `${o}: (Max Depth)`,
          content: `<div style="color: #ffdddd; padding: 5px;">${o}: (Max Depth Reached)</div>`,
          width: 180,
          height: 40,
          backgroundColor: "#553333"
        },
        mass: 0.7
      });
      return n && c && e.addEdge(n, c, { color: 11184810 }), c;
    }
    let r;
    const l = { width: 180, height: 40 };
    if (Array.isArray(t))
      r = e.createNode({
        id: T.generateId(`array_${o}`),
        type: s.nodeType,
        position: i,
        data: {
          ...l,
          label: `${o} [Array]`,
          content: `<div style="font-weight:bold; padding:5px;">${o} [Array (${t.length})]</div>`,
          backgroundColor: T.toHexColor(s.arrayNodeColor)
        },
        mass: 1.2
      });
    else if (typeof t == "object" && t !== null)
      r = e.createNode({
        id: T.generateId(`object_${o}`),
        type: s.nodeType,
        position: i,
        data: {
          ...l,
          label: `${o} {Object}`,
          content: `<div style="font-weight:bold; padding:5px;">${o} {Object}</div>`,
          backgroundColor: T.toHexColor(s.objectNodeColor)
        },
        mass: 1.2
      });
    else {
      const c = String(t).length > 30 ? String(t).substring(0, 27) + "..." : String(t);
      r = e.createNode({
        id: T.generateId(`value_${o}`),
        type: s.nodeType,
        position: i,
        data: {
          ...l,
          width: Math.min(250, 80 + String(c).length * 7),
          // Adjust width for value
          label: `${o}: ${c}`,
          content: `<div><span style="color:#aaa; padding-right:5px;">${o}:</span> ${c}</div>`,
          backgroundColor: T.toHexColor(s.valueNodeColor)
        },
        mass: 0.8
      });
    }
    if (n && r && e.addEdge(n, r, { color: 12303291, thickness: 1.5 }), Array.isArray(t))
      t.forEach((c, d) => {
        const h = {
          x: i.x + (d % 3 - 1) * 200,
          y: i.y - 150 - Math.floor(d / 3) * 100,
          z: i.z + (d % 2 === 0 ? 20 : -20)
        };
        this._traverseObject(c, e, s, h, r, `[${d}]`, a + 1);
      });
    else if (typeof t == "object" && t !== null) {
      let c = 0;
      for (const d in t)
        if (Object.prototype.hasOwnProperty.call(t, d)) {
          const h = {
            x: i.x + (c % 3 - 1) * 220,
            y: i.y - 180 - Math.floor(c / 3) * 120,
            z: i.z + (c % 2 === 0 ? 25 : -25)
          };
          this._traverseObject(t[d], e, s, h, r, d, a + 1), c++;
        }
    }
    return r;
  }
};
g(Ye, "generatorName", "objectProperty");
let us = Ye;
class ze {
  static registerPreset(t, e) {
    this.presets.set(t, e);
  }
  static registerTemplate(t, e) {
    this.templates.set(t, e);
  }
  static createDashboard(t, e, s) {
    const {
      title: i = "Dashboard",
      width: n = 600,
      height: o = 400,
      layout: a = "grid",
      columns: r = 3,
      widgets: l = []
    } = s;
    return t.addNode({
      type: "meta-widget",
      id: s.id || `dashboard-${Date.now()}`,
      position: e,
      data: {
        title: i,
        width: n,
        height: o,
        layout: a,
        columns: r,
        widgets: l.map((d, h) => ({
          id: d.id || `widget-${h}`,
          ...d
        }))
      }
    });
  }
  static createControlCenter(t, e, s = []) {
    const i = s.map((n, o) => ({
      id: `control-${n.name}`,
      type: "control-panel",
      data: {
        title: n.title || n.name,
        controls: n.controls || [
          {
            id: "power",
            type: "switch",
            label: "Power",
            value: n.enabled || !1
          },
          {
            id: "level",
            type: "slider",
            label: "Level",
            value: n.level || 50,
            min: 0,
            max: 100
          }
        ]
      }
    }));
    return this.createDashboard(t, e, {
      title: "Control Center",
      width: 800,
      height: 500,
      layout: "grid",
      columns: 2,
      widgets: i
    });
  }
  static createMonitoringDashboard(t, e, s = []) {
    const i = [];
    return s.forEach((n, o) => {
      switch (n.type) {
        case "gauge":
          i.push({
            id: `gauge-${n.name}`,
            type: "progress",
            data: {
              label: n.title || n.name,
              progressType: "gauge",
              value: n.value || 0,
              max: n.max || 100,
              color: n.color || "#4a9eff"
            }
          });
          break;
        case "progress":
          i.push({
            id: `progress-${n.name}`,
            type: "progress",
            data: {
              label: n.title || n.name,
              progressType: "bar",
              value: n.value || 0,
              max: n.max || 100,
              color: n.color || "#00ff88"
            }
          });
          break;
        case "status":
          i.push({
            id: `status-${n.name}`,
            type: "info",
            data: {
              text: n.title || n.name,
              icon: n.status === "ok" ? "✅" : n.status === "warning" ? "⚠️" : "❌"
            }
          });
          break;
        case "chart":
          i.push({
            id: `chart-${n.name}`,
            type: "chart",
            data: {
              title: n.title || n.name,
              chartType: n.chartType || "line"
            }
          });
          break;
      }
    }), this.createDashboard(t, e, {
      title: "System Monitor",
      width: 900,
      height: 600,
      layout: "grid",
      columns: 3,
      widgets: i
    });
  }
  static createWorkflowBuilder(t, e, s = []) {
    const i = s.map((n, o) => ({
      id: `step-${o}`,
      type: "info",
      data: {
        text: n.title || `Step ${o + 1}`,
        icon: n.completed ? "✅" : n.active ? "⚡" : "⏳"
      }
    }));
    return i.push({
      id: "workflow-controls",
      type: "control-panel",
      data: {
        title: "Workflow Controls",
        controls: [
          {
            id: "start",
            type: "button",
            label: "Start Workflow",
            text: "Start"
          },
          {
            id: "pause",
            type: "button",
            label: "Pause",
            text: "Pause"
          },
          {
            id: "reset",
            type: "button",
            label: "Reset",
            text: "Reset"
          },
          {
            id: "auto",
            type: "switch",
            label: "Auto Mode",
            value: !1
          }
        ]
      }
    }), this.createDashboard(t, e, {
      title: "Workflow Builder",
      width: 700,
      height: 450,
      layout: "flex-column",
      widgets: i
    });
  }
  static createAnalyticsDashboard(t, e, s = {}) {
    const i = [];
    return s.keyMetrics && s.keyMetrics.forEach((n, o) => {
      i.push({
        id: `metric-${o}`,
        type: "progress",
        data: {
          label: n.name,
          progressType: "circular",
          value: n.value,
          max: n.max || 100,
          color: n.color || "#3498db"
        }
      });
    }), s.charts && s.charts.forEach((n, o) => {
      i.push({
        id: `chart-${o}`,
        type: "chart",
        data: {
          title: n.title,
          chartType: n.type || "line"
        }
      });
    }), i.push({
      id: "analytics-controls",
      type: "control-panel",
      data: {
        title: "Analytics Controls",
        controls: [
          {
            id: "timeRange",
            type: "select",
            label: "Time Range",
            value: "7d",
            options: [
              { value: "1d", label: "Last 24 Hours" },
              { value: "7d", label: "Last 7 Days" },
              { value: "30d", label: "Last 30 Days" },
              { value: "90d", label: "Last 90 Days" }
            ]
          },
          {
            id: "refresh",
            type: "button",
            label: "Refresh Data",
            text: "Refresh"
          },
          {
            id: "autoRefresh",
            type: "switch",
            label: "Auto Refresh",
            value: !0
          }
        ]
      }
    }), this.createDashboard(t, e, {
      title: "Analytics Dashboard",
      width: 1e3,
      height: 700,
      layout: "grid",
      columns: 3,
      widgets: i
    });
  }
  static createFormBuilder(t, e, s = {}) {
    const i = [];
    return s.fields && s.fields.forEach((n, o) => {
      i.push({
        id: `field-${o}`,
        type: "control-panel",
        data: {
          title: n.label || `Field ${o + 1}`,
          controls: [{
            id: n.name || `field${o}`,
            type: n.type || "text",
            label: n.label || "",
            value: n.defaultValue || "",
            required: n.required || !1,
            placeholder: n.placeholder || "",
            options: n.options || []
          }]
        }
      });
    }), i.push({
      id: "form-actions",
      type: "control-panel",
      data: {
        title: "Form Actions",
        controls: [
          {
            id: "submit",
            type: "button",
            label: "Submit Form",
            text: "Submit"
          },
          {
            id: "clear",
            type: "button",
            label: "Clear Form",
            text: "Clear"
          },
          {
            id: "save",
            type: "button",
            label: "Save Draft",
            text: "Save Draft"
          }
        ]
      }
    }), this.createDashboard(t, e, {
      title: s.title || "Form Builder",
      width: 600,
      height: 500,
      layout: "flex-column",
      widgets: i
    });
  }
  static createDataVisualization(t, e, s = []) {
    const i = [];
    return s.forEach((n, o) => {
      i.push({
        id: `chart-${o}`,
        type: "chart",
        data: {
          title: n.name || `Dataset ${o + 1}`,
          chartType: n.chartType || "line"
        }
      }), n.stats && i.push({
        id: `stats-${o}`,
        type: "info",
        data: {
          text: `Records: ${n.stats.count || 0}
Avg: ${n.stats.average || 0}`,
          icon: "📊"
        }
      });
    }), i.push({
      id: "viz-controls",
      type: "control-panel",
      data: {
        title: "Visualization Controls",
        controls: [
          {
            id: "chartType",
            type: "select",
            label: "Chart Type",
            value: "line",
            options: [
              { value: "line", label: "Line Chart" },
              { value: "bar", label: "Bar Chart" },
              { value: "pie", label: "Pie Chart" },
              { value: "scatter", label: "Scatter Plot" }
            ]
          },
          {
            id: "showGrid",
            type: "switch",
            label: "Show Grid",
            value: !0
          },
          {
            id: "animate",
            type: "switch",
            label: "Animate",
            value: !0
          }
        ]
      }
    }), this.createDashboard(t, e, {
      title: "Data Visualization",
      width: 900,
      height: 600,
      layout: "grid",
      columns: 2,
      widgets: i
    });
  }
  static createGameHUD(t, e, s = {}) {
    const i = [];
    return s.playerStats && i.push({
      id: "player-stats",
      type: "control-panel",
      data: {
        title: "Player Stats",
        controls: Object.keys(s.playerStats).map((n) => ({
          id: n,
          type: "progress",
          label: n.charAt(0).toUpperCase() + n.slice(1),
          value: s.playerStats[n],
          max: 100
        }))
      }
    }), i.push({
      id: "health",
      type: "progress",
      data: {
        label: "Health",
        progressType: "bar",
        value: s.health || 100,
        max: 100,
        color: "#e74c3c",
        animated: !0
      }
    }), i.push({
      id: "energy",
      type: "progress",
      data: {
        label: "Energy",
        progressType: "bar",
        value: s.energy || 100,
        max: 100,
        color: "#3498db",
        animated: !0
      }
    }), i.push({
      id: "minimap",
      type: "info",
      data: {
        text: "Mini Map",
        icon: "🗺️"
      }
    }), i.push({
      id: "inventory",
      type: "info",
      data: {
        text: `Items: ${s.inventoryCount || 0}`,
        icon: "🎒"
      }
    }), i.push({
      id: "game-controls",
      type: "control-panel",
      data: {
        title: "Game Controls",
        controls: [
          {
            id: "pause",
            type: "button",
            label: "Pause",
            text: "⏸️"
          },
          {
            id: "settings",
            type: "button",
            label: "Settings",
            text: "⚙️"
          },
          {
            id: "menu",
            type: "button",
            label: "Menu",
            text: "📋"
          }
        ]
      }
    }), this.createDashboard(t, e, {
      title: "Game HUD",
      width: 800,
      height: 200,
      layout: "flex-row",
      widgets: i
    });
  }
  static connectWidgets(t, e, s, i = "data") {
    const n = t.addEdge(e, s, {
      type: "flow",
      particleCount: 5,
      particleSpeed: 0.3,
      particleColor: i === "data" ? 65416 : i === "control" ? 16739125 : 4890367,
      flowDirection: 1,
      thickness: 2,
      label: i
    });
    return t.on("meta-widget:control-changed", (o) => {
      o.metaWidget === e && this.propagateData(o, s, i);
    }), n;
  }
  static propagateData(t, e, s) {
    const { controlId: i, value: n } = t;
    e.getAllWidgets().forEach((o) => {
      if (o.data.controls) {
        const a = o.data.controls.find((r) => r.id === i);
        a && (a.value = n, e.updateWidget(o.id, o.data));
      }
    });
  }
  static exportConfiguration(t) {
    return {
      type: "meta-widget",
      layout: t.getLayoutData(),
      position: {
        x: t.position.x,
        y: t.position.y,
        z: t.position.z
      },
      data: t.data
    };
  }
  static importConfiguration(t, e) {
    return t.addNode({
      type: "meta-widget",
      position: e.position,
      data: e.data
    });
  }
  static createWidgetLibrary() {
    return {
      // Basic widgets
      slider: (t, e, s = 50, i = 0, n = 100) => ({
        id: t || "slider",
        type: "control-panel",
        data: {
          title: "Slider Control",
          controls: [{
            id: t,
            type: "slider",
            label: e,
            value: s,
            min: i,
            max: n
          }]
        }
      }),
      button: (t, e, s) => ({
        id: t || "button",
        type: "control-panel",
        data: {
          title: "Button Control",
          controls: [{
            id: t,
            type: "button",
            label: e || s,
            text: s || e
          }]
        }
      }),
      progressBar: (t, e, s = 0, i = 100) => ({
        id: t || "progress",
        type: "progress",
        data: {
          label: e,
          progressType: "bar",
          value: s,
          max: i
        }
      }),
      gauge: (t, e, s = 0, i = 100) => ({
        id: t || "gauge",
        type: "progress",
        data: {
          label: e,
          progressType: "gauge",
          value: s,
          max: i
        }
      }),
      infoPanel: (t, e, s = "ℹ") => ({
        id: t || "info",
        type: "info",
        data: {
          text: e,
          icon: s
        }
      }),
      chart: (t, e, s = "line") => ({
        id: t || "chart",
        type: "chart",
        data: {
          title: e,
          chartType: s
        }
      })
    };
  }
}
g(ze, "presets", /* @__PURE__ */ new Map()), g(ze, "templates", /* @__PURE__ */ new Map());
ze.registerPreset("monitoring", {
  title: "System Monitoring",
  layout: "grid",
  columns: 2,
  widgets: ["cpu-gauge", "memory-gauge", "disk-progress", "network-chart"]
});
ze.registerPreset("control-panel", {
  title: "Control Panel",
  layout: "flex-column",
  widgets: ["power-switch", "volume-slider", "brightness-slider", "mode-select"]
});
ze.registerPreset("analytics", {
  title: "Analytics Dashboard",
  layout: "grid",
  columns: 3,
  widgets: ["visitors-chart", "revenue-gauge", "conversion-progress", "goals-info"]
});
export {
  M as $,
  Zt as $$,
  eo as AdaptiveLayout,
  xn as AdvancedCameraControls,
  to as AdvancedLayoutManager,
  be as AudioNode,
  Is as BaseFactory,
  xt as BezierEdge,
  _ as CAMERA_MODES,
  Mn as Camera,
  An as CameraPlugin,
  Ct as CanvasNode,
  ve as ChartNode,
  Hn as CircularLayout,
  Kn as ConstraintLayout,
  Je as ContentAdapter,
  yt as ControlPanelNode,
  Te as CurvedEdge,
  Io as DataContentAdapter,
  ke as DataNode,
  bo as DataPlugin,
  Ce as DocumentNode,
  De as DottedEdge,
  we as DynamicThicknessEdge,
  V as Edge,
  Dn as EdgeFactory,
  Bn as EdgePlugin,
  hs as FileSystemGenerator,
  It as FlowEdge,
  Vn as ForceLayout,
  Co as FractalZoomManager,
  Mo as FractalZoomPlugin,
  Zn as GridLayout,
  Pe as GroupNode,
  wo as HTMLContentAdapter,
  Wn as HierarchicalLayout,
  L as HtmlNode,
  fe as IFrameNode,
  Le as ImageNode,
  Ne as LabeledEdge,
  Qn as LayoutConnector,
  Un as LayoutManager,
  so as LayoutPlugin,
  Lo as LayoutWorkerManager,
  wt as MetaWidgetNode,
  yo as MinimapPlugin,
  $n as NestedLayout,
  ie as Node,
  Tn as NodeFactory,
  Nn as NodePlugin,
  ye as NoteNode,
  us as ObjectPropertyGenerator,
  xo as PerformanceManager,
  Po as PerformancePlugin,
  U as Plugin,
  Li as PluginManager,
  vt as ProceduralShapeNode,
  bt as ProgressNode,
  St as RadialLayout,
  mn as RenderingPlugin,
  q as ShapeNode,
  zo as SpaceGraph,
  jn as SphericalLayout,
  Mt as SpringEdge,
  u as THREE,
  vo as TextContentAdapter,
  je as TextMeshNode,
  At as TreeMapLayout,
  uo as UIManager,
  go as UIPlugin,
  T as Utils,
  me as VideoNode,
  ze as WidgetComposer,
  Ls as WorkerManager,
  dt as createContentAdapter
};
