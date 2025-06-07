package com.example.spacegraphkt.external

import org.w3c.dom.Element
import org.w3c.dom.HTMLCanvasElement
import org.w3c.dom.HTMLElement

@JsModule("three") @JsNonModule
external object THREE {
    open class EventDispatcher {
        fun addEventListener(type: String, listener: (event: dynamic) -> Unit)
        fun hasEventListener(type: String, listener: (event: dynamic) -> Unit): Boolean
        fun removeEventListener(type: String, listener: (event: dynamic) -> Unit)
        fun dispatchEvent(event: dynamic)
    }

    open class Object3D : EventDispatcher {
        var position: Vector3
        var quaternion: Quaternion
        var userData: dynamic
        var parent: Object3D?
        var visible: Boolean
        var castShadow: Boolean
        var receiveShadow: Boolean
        var id: Int
        var name: String

        fun add(obj: Object3D)
        fun remove(obj: Object3D)
        fun traverse(callback: (obj: Object3D) -> Unit)
        fun getWorldPosition(target: Vector3): Vector3
        fun getWorldQuaternion(target: Quaternion): Quaternion
        fun getWorldScale(target: Vector3): Vector3
        fun lookAt(vector: Vector3)
        fun lookAt(x: Double, y: Double, z: Double)
    }

    class Scene : Object3D {
        var background: dynamic // Color, Texture, or null
        var fog: dynamic // Fog instance or null
        fun clear()
    }

    open class Camera : Object3D {
        var projectionMatrix: Matrix4
        fun getWorldDirection(target: Vector3): Vector3
    }

    class PerspectiveCamera(fov: Number, aspect: Number, near: Number, far: Number) : Camera {
        var fov: Number
        var aspect: Number
        var near: Number
        var far: Number
        var zoom: Number
        fun updateProjectionMatrix()
        fun setViewOffset(fullWidth: Number, fullHeight: Number, x: Number, y: Number, width: Number, height: Number)
        fun clearViewOffset()
    }

    class WebGLRenderer(parameters: WebGLRendererParameters = definedExternally) {
        val domElement: HTMLCanvasElement
        fun setSize(width: Number, height: Number, updateStyle: Boolean = definedExternally)
        fun setPixelRatio(value: Number)
        fun setClearColor(color: Color, alpha: Number)
        fun setClearColor(colorHex: Number, alpha: Number = definedExternally)
        fun render(scene: Scene, camera: Camera)
        fun dispose()
        var shadowMap: WebGLShadowMap
    }

    interface WebGLRendererParameters {
        var canvas: HTMLCanvasElement?
        var context: dynamic // WebGLRenderingContext
        var precision: String? // "highp", "mediump", "lowp"
        var alpha: Boolean?
        var premultipliedAlpha: Boolean?
        var antialias: Boolean?
        var stencil: Boolean?
        var preserveDrawingBuffer: Boolean?
        var powerPreference: String? // "high-performance", "low-power", "default"
        var failIfMajorPerformanceCaveat: Boolean?
        var depth: Boolean?
        var logarithmicDepthBuffer: Boolean?
    }

    interface WebGLShadowMap {
        var enabled: Boolean
        var type: Int // PCFShadowMap, etc.
    }
    val PCFSoftShadowMap: Int get() = definedExternally

    class Vector3(var x: Double = definedExternally, var y: Double = definedExternally, var z: Double = definedExternally) {
        fun set(x: Double, y: Double, z: Double): Vector3
        fun copy(v: Vector3): Vector3
        fun clone(): Vector3
        fun add(v: Vector3): Vector3
        fun sub(v: Vector3): Vector3
        fun subVectors(a: Vector3, b: Vector3): Vector3
        fun multiplyScalar(s: Double): Vector3
        fun divideScalar(s: Double): Vector3
        fun length(): Double
        fun lengthSq(): Double
        fun normalize(): Vector3
        fun distanceTo(v: Vector3): Double
        fun distanceToSquared(v: Vector3): Double
        fun applyMatrix4(m: Matrix4): Vector3
        fun applyQuaternion(q: Quaternion): Vector3
        fun lerp(v: Vector3, alpha: Double): Vector3
        fun lerpVectors(v1: Vector3, v2: Vector3, alpha: Double): Vector3
        fun randomDirection(): Vector3
    }

    class Quaternion(var x: Double = definedExternally, var y: Double = definedExternally, var z: Double = definedExternally, var w: Double = definedExternally) {
        fun set(x: Double, y: Double, z: Double, w: Double): Quaternion
        fun copy(q: Quaternion): Quaternion
        fun clone(): Quaternion
        fun setFromEuler(euler: Euler, update: Boolean = definedExternally): Quaternion
        fun multiply(q: Quaternion): Quaternion
        fun invert(): Quaternion
        fun conjugate(): Quaternion
        fun slerp(qb: Quaternion, t: Double) : Quaternion
    }
    class Euler(var x: Double = definedExternally, var y: Double = definedExternally, var z: Double = definedExternally, var order: String = definedExternally) {
        fun set(x: Double, y: Double, z: Double, order: String = definedExternally) : Euler
        fun copy(euler: Euler) : Euler
        fun setFromQuaternion(q: Quaternion, order: String = definedExternally, update: Boolean = definedExternally) : Euler
    }


    class Matrix4 {
        val elements: Array<Double>
        fun copy(m: Matrix4): Matrix4
        fun multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4
        fun invert(): Matrix4
        fun transpose(): Matrix4
        fun lookAt(eye: Vector3, target: Vector3, up: Vector3): Matrix4
        fun compose(translation: Vector3, rotation: Quaternion, scale: Vector3) : Matrix4
        fun decompose(translation: Vector3, rotation: Quaternion, scale: Vector3) : Matrix4
    }

    open class Material : EventDispatcher {
        var opacity: Double
        var transparent: Boolean
        var visible: Boolean
        var side: Int // FrontSide, BackSide, DoubleSide
        var needsUpdate: Boolean
        fun dispose()
        // common properties
        var alphaTest: Double
        var blendDst: Int
        var blendDstAlpha: Int?
        var blendEquation: Int
        var blendEquationAlpha: Int?
        var blendSrc: Int
        var blendSrcAlpha: Int?
        var blending: Int // NoBlending, NormalBlending, AdditiveBlending, SubtractiveBlending, MultiplyBlending, CustomBlending
        var clipIntersection: Boolean
        var clipShadows: Boolean
        var colorWrite: Boolean
        var depthFunc: Int
        var depthTest: Boolean
        var depthWrite: Boolean
        var stencilWrite: Boolean
        var stencilFunc: Int
        var stencilRef: Int
        var stencilMask: Int
        var stencilFail: Int
        var stencilZFail: Int
        var stencilZPass: Int
        var id: Int
        var name: String
        var precision: String? // "highp", "mediump", "lowp"
        var premultipliedAlpha: Boolean
        var dithering: Boolean
        var shadowSide: Int? // FrontSide, BackSide, DoubleSide
        var toneMapped: Boolean
        var version: Int
    }
    val FrontSide: Int get() = definedExternally
    val BackSide: Int get() = definedExternally
    val DoubleSide: Int get() = definedExternally

    val NoBlending: Int get() = definedExternally
    val NormalBlending: Int get() = definedExternally


    class LineBasicMaterial(parameters: dynamic = definedExternally) : Material {
        var color: Color
        var linewidth: Double
        var linecap: String // "butt", "round", "square"
        var linejoin: String // "round", "bevel", "miter"
    }

    class MeshStandardMaterial(parameters: dynamic = definedExternally) : Material {
        var color: Color
        var roughness: Double
        var metalness: Double
        var emissive: Color
        var emissiveIntensity: Double
        var map: Texture?
        var normalMap: Texture?
        var metalnessMap: Texture?
        var roughnessMap: Texture?
        var emissiveMap: Texture?
        // ... and many other properties
    }

    open class BufferGeometry : EventDispatcher {
        val attributes: dynamic // JS object: { position: BufferAttribute, normal: BufferAttribute, ... }
        var boundingBox: Box3?
        var boundingSphere: Sphere?
        var drawRange: dynamic // { start: Int, count: Int }
        val groups: Array<dynamic> // Array of { start: Int, count: Int, materialIndex: Int? }
        var id: Int
        var index: BufferAttribute?
        var morphAttributes: dynamic
        var name: String
        var userData: dynamic
        fun addGroup(start: Int, count: Int, materialIndex: Int = definedExternally)
        fun clearGroups()
        fun computeBoundingBox()
        fun computeBoundingSphere()
        fun computeVertexNormals()
        fun dispose()
        fun getAttribute(name: String): BufferAttribute
        fun setAttribute(name: String, attribute: BufferAttribute)
        fun deleteAttribute(name: String): BufferAttribute
        fun setFromPoints(points: Array<Vector3>): BufferGeometry
        fun setIndex(index: Array<Int>)
        fun center(): BufferGeometry
    }

    class BufferAttribute(array: dynamic, itemSize: Int, normalized: Boolean = definedExternally) {
        var array: dynamic // TypedArray
        var count: Int
        var itemSize: Int
        var needsUpdate: Boolean
        var normalized: Boolean
        fun getX(index: Int): Double
        fun setX(index: Int, x: Double): BufferAttribute
        // Similar for Y, Z, W
        fun getXYZ(index: Int, target: Vector3): Vector3
        fun setXYZ(index: Int, x: Double, y: Double, z: Double): BufferAttribute
    }
    class Float32BufferAttribute(array: dynamic, itemSize: Int, normalized: Boolean = definedExternally) : BufferAttribute
    class Uint16BufferAttribute(array: dynamic, itemSize: Int, normalized: Boolean = definedExternally) : BufferAttribute


    class Line(geometry: BufferGeometry? = definedExternally, material: Material? = definedExternally, mode: Int = definedExternally) : Object3D {
        var geometry: BufferGeometry
        var material: Material // Or Array<Material>
        var renderOrder: Int
        fun computeLineDistances(): Line
    }
    val LineSegments: Int get() = definedExternally
    val LineLoop: Int get() = definedExternally


    class Mesh(geometry: BufferGeometry? = definedExternally, material: Material? = definedExternally) : Object3D {
        var geometry: BufferGeometry
        var material: Material // Or Array<Material>
        fun updateMorphTargets()
    }

    class Color(r: Double = definedExternally, g: Double = definedExternally, b: Double = definedExternally) {
        var r: Double
        var g: Double
        var b: Double
        fun set(value: dynamic): Color // number, string, Color
        fun setHex(hex: Number): Color
        fun setRGB(r: Double, g: Double, b: Double): Color
        fun copy(color: Color): Color
        fun clone(): Color
    }

    class AmbientLight(color: dynamic = definedExternally, intensity: Number = definedExternally) : Light
    class DirectionalLight(color: dynamic = definedExternally, intensity: Number = definedExternally) : Light {
        var target: Object3D
        var shadow: DirectionalLightShadow
    }
    open class Light(color: dynamic = definedExternally, intensity: Number = definedExternally) : Object3D {
        var color: Color
        var intensity: Number
    }
    open class LightShadow(camera: Camera) {
        var camera: Camera
        var bias: Double
        var normalBias: Double
        var radius: Double
        var mapSize: Vector2
        var map: WebGLRenderTarget?
        var matrix: Matrix4
        fun updateMatrices(light: Light, viewportIndex: Int = definedExternally)
    }
    class DirectionalLightShadow : LightShadow {}


    class BoxGeometry(width: Number = definedExternally, height: Number = definedExternally, depth: Number = definedExternally, widthSegments: Int = definedExternally, heightSegments: Int = definedExternally, depthSegments: Int = definedExternally) : BufferGeometry
    class SphereGeometry(radius: Number = definedExternally, widthSegments: Int = definedExternally, heightSegments: Int = definedExternally, phiStart: Number = definedExternally, phiLength: Number = definedExternally, thetaStart: Number = definedExternally, thetaLength: Number = definedExternally) : BufferGeometry

    class Raycaster(origin: Vector3 = definedExternally, direction: Vector3 = definedExternally, near: Number = definedExternally, far: Number = definedExternally) {
        var ray: Ray
        var near: Number
        var far: Number
        var params: RaycasterParameters
        fun set(origin: Vector3, direction: Vector3)
        fun setFromCamera(coords: Vector2, camera: Camera)
        fun intersectObject(obj: Object3D, recursive: Boolean = definedExternally, intersects: Array<Intersection> = definedExternally): Array<Intersection>
        fun intersectObjects(objects: Array<Object3D>, recursive: Boolean = definedExternally, intersects: Array<Intersection> = definedExternally): Array<Intersection>
    }
    interface RaycasterParameters {
        // Define specific parameters if needed, e.g., for Line, Points
        var Line: dynamic get() = definedExternally; set(value) {} // { threshold: Double }
        var Points: dynamic get() = definedExternally; set(value) {} // { threshold: Double }
    }
    class Ray(origin: Vector3 = definedExternally, direction: Vector3 = definedExternally) {
        var origin: Vector3
        var direction: Vector3
        fun intersectPlane(plane: Plane, target: Vector3): Vector3?
    }
    class Plane(normal: Vector3 = definedExternally, constant: Number = definedExternally) {
        var normal: Vector3
        var constant: Number
        fun setFromNormalAndCoplanarPoint(normal: Vector3, point: Vector3): Plane
        fun intersectLine(line: Line3, target: Vector3): Vector3? // Line3 is another class
    }
    class Vector2(var x: Double = definedExternally, var y: Double = definedExternally) {
        fun set(x: Double, y: Double): Vector2
    }
    interface Intersection {
        var distance: Double
        var point: Vector3
        var obj: Object3D
        // ... other properties like face, faceIndex, uv
    }

    // Dummy Texture class for now
    open class Texture : EventDispatcher {
        var needsUpdate: Boolean
        fun dispose()
    }

    // Dummy Box3 and Sphere for BoundingBox/Sphere
    class Box3(min: Vector3 = definedExternally, max: Vector3 = definedExternally) {
        var min: Vector3
        var max: Vector3
    }
    class Sphere(center: Vector3 = definedExternally, radius: Number = definedExternally) {
        var center: Vector3
        var radius: Number
    }

    class WebGLRenderTarget(width: Number, height: Number, options: dynamic = definedExternally) : EventDispatcher {
        var texture: Texture
    }
}

// CSS3DRenderer
@JsModule("three/addons/renderers/CSS3DRenderer.js") @JsNonModule
external class CSS3DObject(element: HTMLElement) : THREE.Object3D

@JsModule("three/addons/renderers/CSS3DRenderer.js") @JsNonModule
external class CSS3DRenderer(parameters: dynamic = definedExternally) {
    val domElement: HTMLElement
    fun setSize(width: Number, height: Number)
    fun render(scene: THREE.Scene, camera: THREE.Camera)
}

// GSAP (very basic for now)
@JsModule("gsap") @JsNonModule
external object gsap {
    fun to(targets: dynamic, vars: dynamic): dynamic // Timeline or Tween instance
    fun killTweensOf(targets: dynamic)
    fun isTweening(target: dynamic): Boolean
}

// Helper to create JS object for parameters
fun jsObject(init: dynamic.() -> Unit): dynamic {
    val o = js("{}")
    init(o)
    return o
}

// Helper for DEG2RAD if not part of a Math utility object yet
val DEG2RAD_KT = kotlin.math.PI / 180.0
fun generateId(prefix: String = "id-kt"): String {
    val randomPart = (kotlin.js.Math.random() * 1000000).toInt()
    return "$prefix-${kotlin.js.Date.now().toLong()}-$randomPart"
}

// Polyfill for isNaN if it's not available or behaving differently
fun isNaN_KT(value: Any?): Boolean {
    if (value is Number) {
        return value.toDouble().isNaN()
    }
    return true // Or handle other types as needed
}
