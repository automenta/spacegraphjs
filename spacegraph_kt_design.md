# SpaceGraph.js to Kotlin/JS Design

## 1. Core JavaScript Classes

Based on the `spacegraph.js` content, the major classes are:

*   `SpaceGraph`: The main class orchestrating the graph, rendering, and interactions.
*   `BaseNode`: An abstract base class for graph nodes.
*   `HtmlNodeElement`: A node type that uses HTML/CSS for its visual representation (rendered via `CSS3DRenderer`).
*   `NoteNode`: A specialized `HtmlNodeElement` for creating editable text notes.
*   `ShapeNode`: A node type that uses Three.js geometries (like spheres, boxes) for its visual representation (rendered via WebGL).
*   `Edge`: Represents the connections between nodes.
*   `UIManager`: Handles all user interactions, context menus, dialogs, and input events.
*   `CameraController`: Manages camera movements, zoom, pan, and view history.
*   `ForceLayout`: Implements the force-directed layout algorithm to position nodes.

Helper functions (outside classes but exported):

*   `$`, `$$`: DOM selector utilities.
*   `clamp`, `lerp`: Math utilities.
*   `generateId`: ID generation utility.
*   `DEG2RAD`: Constant for degree to radian conversion.

## 2. Core Functionalities

### `SpaceGraph`
*   **Responsibilities:**
    *   Manages collections of nodes and edges.
    *   Initializes Three.js scenes (WebGL and CSS3D), camera, and renderers.
    *   Handles adding, removing, and retrieving nodes and edges.
    *   Orchestrates the animation loop (update and render).
    *   Provides methods for view manipulation (centering, focusing).
    *   Handles node/edge selection.
    *   Provides utility for screen-to-world coordinate conversion.
    *   Manages background settings.
*   **Key Methods:** `constructor`, `addNode`, `removeNode`, `addEdge`, `removeEdge`, `getNodeById`, `setSelectedNode`, `setSelectedEdge`, `centerView`, `focusOnNode`, `_animate`, `dispose`.

### `BaseNode`
*   **Responsibilities:**
    *   Serves as a common interface and base implementation for all node types.
    *   Stores basic node properties: `id`, `position`, `data`, `mass`.
    *   Holds references to Three.js objects (`mesh`, `cssObject`, `labelObject`).
*   **Key Methods:** `constructor`, `setPosition`, `update`, `dispose`, `getBoundingSphereRadius`, `setSelectedStyle`, `startDrag`, `drag`, `endDrag`.

### `HtmlNodeElement` (extends `BaseNode`)
*   **Responsibilities:**
    *   Represents nodes rendered as HTML elements.
    *   Creates and manages the HTML structure for the node.
    *   Handles sizing, content scaling, and background color.
    *   Supports billboarding (orienting towards the camera).
    *   Manages content editability.
*   **Key Methods:** `constructor`, `_createHtmlElement`, `setPosition`, `setSize`, `setContentScale`, `setBackgroundColor`, `update`, `dispose`, `getBoundingSphereRadius`, `startResize`, `resize`, `endResize`.

### `NoteNode` (extends `HtmlNodeElement`)
*   **Responsibilities:**
    *   A specialized `HtmlNodeElement` pre-configured for editable text notes.
*   **Key Methods:** `constructor`.

### `ShapeNode` (extends `BaseNode`)
*   **Responsibilities:**
    *   Represents nodes rendered as 3D shapes using WebGL.
    *   Creates Three.js meshes (sphere, box).
    *   Manages an optional 3D label for the shape.
*   **Key Methods:** `constructor`, `_createMesh`, `_createLabel`, `update`, `dispose`, `getBoundingSphereRadius`, `setSelectedStyle`.

### `Edge`
*   **Responsibilities:**
    *   Represents a link between two nodes (`source` and `target`).
    *   Creates and manages a Three.js `Line` object for visual representation.
    *   Stores edge data like color, thickness, style, and layout constraint parameters.
*   **Key Methods:** `constructor`, `_createThreeObject`, `update`, `setHighlight`, `dispose`.

### `UIManager`
*   **Responsibilities:**
    *   Manages all user input events (pointer, context menu, keyboard, wheel).
    *   Handles node dragging, resizing.
    *   Manages selection of nodes and edges.
    *   Displays and handles context menus for nodes, edges, and the background.
    *   Manages a confirmation dialog.
    *   Handles the temporary linking line when creating edges.
    *   Shows/hides and updates an edge-specific menu.
*   **Key Methods:** `constructor`, `_bindEvents`, `_onPointerDown`, `_onPointerMove`, `_onPointerUp`, `_onContextMenu`, `_showContextMenu`, `_hideContextMenu`, `_startLinking`, `_completeLinking`, `cancelLinking`, `showEdgeMenu`, `hideEdgeMenu`, `dispose`.

### `CameraController`
*   **Responsibilities:**
    *   Controls the Three.js camera.
    *   Handles panning, zooming.
    *   Provides smooth camera movement (`moveTo`).
    *   Manages a view history for "back" functionality.
    *   Damps camera movements for a smoother experience.
*   **Key Methods:** `constructor`, `startPan`, `pan`, `endPan`, `zoom`, `moveTo`, `resetView`, `pushState`, `popState`, `_updateLoop`, `dispose`.

### `ForceLayout`
*   **Responsibilities:**
    *   Implements a force-directed graph layout algorithm.
    *   Calculates forces (repulsion between nodes, attraction along edges, centering).
    *   Updates node positions based on calculated forces.
    *   Manages node velocities, fixed nodes, and simulation energy.
    *   Can be started, stopped, and "kicked" to re-energize.
*   **Key Methods:** `constructor`, `addNode`, `removeNode`, `addEdge`, `removeEdge`, `fixNode`, `releaseNode`, `start`, `stop`, `kick`, `_calculateStep`, `dispose`.

## 3. Design Kotlin/JS Class Structure

Here's a proposed Kotlin/JS class structure:

```kotlin
// package spacegraphkt

// Data classes (see section 5)
data class Vector3D(var x: Double, var y: Double, var z: Double)
data class NodeData(
    val id: String,
    var label: String?,
    // ... other common data fields (type, color, size for shapes, content for html)
    var rawJsData: dynamic // For any other custom data
)
data class EdgeData(
    val id: String,
    var color: Int = 0x00d0ff,
    var thickness: Double = 1.5,
    // ... other data fields
    var rawJsData: dynamic
)

// Main Graph Class
class SpaceGraph(val containerElement: HTMLElement, uiElements: UiElements? = null) {
    val nodes: MutableMap<String, BaseNode> = mutableMapOf()
    val edges: MutableMap<String, Edge> = mutableMapOf()
    var selectedNode: BaseNode? = null
    var selectedEdge: Edge? = null
    // ... other properties like isLinking, linkSourceNode

    // Three.js related properties (external)
    lateinit var scene: THREE.Scene
    lateinit var cssScene: THREE.Scene
    lateinit var camera: THREE.PerspectiveCamera
    lateinit var webglRenderer: THREE.WebGLRenderer
    lateinit var cssRenderer: CSS3DRenderer // External type

    val cameraController: CameraController
    val layoutEngine: ForceLayout
    val uiManager: UIManager

    init {
        // Initialization logic similar to JS constructor
        // Setup scenes, camera, renderers
        // Initialize cameraController, layoutEngine, uiManager
    }

    fun addNode(node: BaseNode): BaseNode { /* ... */ }
    fun removeNode(nodeId: String) { /* ... */ }
    fun addEdge(sourceNode: BaseNode, targetNode: BaseNode, data: EdgeData? = null): Edge? { /* ... */ }
    fun removeEdge(edgeId: String) { /* ... */ }
    // ... other methods
    fun dispose() { /* ... */ }
}

// Node Hierarchy
sealed class BaseNode(
    open var id: String,
    open var position: Vector3D,
    open var data: NodeData, // Or specific data classes per node type
    open var mass: Double = 1.0
) {
    var spaceGraphInstance: SpaceGraph? = null // Weak reference or callback interface
    var threeJsObject: dynamic = null // THREE.Object3D for ShapeNode, CSS3DObject for HtmlNode
    var labelObject: CSS3DObject? = null // For ShapeNode labels

    abstract fun update() // Pass camera for billboarding if needed
    abstract fun dispose()
    open fun getBoundingSphereRadius(): Double = 10.0
    open fun setSelectedStyle(selected: Boolean) { /* ... */ }

    // Drag handlers
    open fun startDrag() { /* ... */ }
    open fun drag(newPosition: Vector3D) { this.position = newPosition }
    open fun endDrag() { /* ... */ }
}

class HtmlNode(
    override var id: String,
    override var position: Vector3D,
    override var data: NodeData, // Consider specific HtmlNodeData
    var size: Size = Size(160.0, 70.0),
    var billboard: Boolean = true
) : BaseNode(id, position, data, data.rawJsData?.mass ?: 1.0) {
    val htmlElement: HTMLElement
    val css3dObject: CSS3DObject // external type

    init {
        // Create htmlElement using kotlinx.dom
        // Create css3dObject
        // Initialize content, scale, background
    }

    fun setSize(width: Double, height: Double, scaleContent: Boolean = false) { /* ... */ }
    fun setContentScale(scale: Double) { /* ... */ }
    fun setBackgroundColor(color: String) { /* ... */ }
    // ... other HtmlNodeElement methods

    override fun update() { /* Update css3dObject position, billboard if camera provided */ }
    override fun dispose() { /* Remove htmlElement, dispose css3dObject */ }
    override fun getBoundingSphereRadius(): Double { /* Calculate based on size and scale */ }
}

class NoteNode(
    override var id: String,
    override var position: Vector3D,
    override var data: NodeData // Specific NoteData with 'content'
) : HtmlNode(id, position, data.apply { /* ensure type='note', editable=true */ }) {
    // Note-specific logic if any, defaults handled by HtmlNode
}

class ShapeNode(
    override var id: String,
    override var position: Vector3D,
    override var data: NodeData, // Specific ShapeNodeData with shape, size, color
    var shape: String = "sphere", // Enum ShapeType might be better
    var size: Double = 50.0,
    var color: Int = 0xffffff
) : BaseNode(id, position, data, data.rawJsData?.mass ?: 1.5) {
    val mesh: THREE.Mesh // external type
    // labelObject from BaseNode used here

    init {
        // Create mesh (THREE.SphereGeometry, BoxGeometry)
        // Create labelObject (CSS3DObject with a div) if label exists
    }

    override fun update() { /* Update mesh position, label position and billboard */ }
    override fun dispose() { /* Dispose mesh geometry/material, remove label */ }
    override fun getBoundingSphereRadius(): Double { /* Calculate based on shape and size */ }
}

// Edge Class
class Edge(
    val id: String,
    var source: BaseNode,
    var target: BaseNode,
    val data: EdgeData = EdgeData(id = generateId("edge-kt-"))
) {
    var spaceGraphInstance: SpaceGraph? = null
    val threeJsLine: THREE.Line // external type

    init {
        // Create THREE.LineBasicMaterial, THREE.BufferGeometry, THREE.Line
    }

    fun update() { /* Update line geometry from source/target positions */ }
    fun setHighlight(highlight: Boolean) { /* Change material opacity/color */ }
    fun dispose() { /* Dispose geometry/material, remove from scene */ }
}

// UI and Control Classes
class UIManager(val spaceGraph: SpaceGraph, val uiElements: UiElements?) {
    // DOM elements (context menu, dialogs) managed using kotlinx.browser.document
    // Event listeners using addEventListener on container and window
    // State properties like draggedNode, resizedNode, pointerState

    init {
        // Bind events
        // Create/find DOM elements for context menu, dialog
    }

    // Methods for handling pointer events, context menu, linking, etc.
    // e.g., onPointerDown, showContextMenu, startLinking

    fun dispose() { /* Remove event listeners, DOM elements */ }
}

class CameraController(
    val camera: THREE.PerspectiveCamera, // external
    val domElement: HTMLElement
) {
    // Properties for targetPosition, targetLookAt, zoomSpeed, panSpeed, history
    var isPanning: Boolean = false
    val targetPosition: THREE.Vector3 // external
    val targetLookAt: THREE.Vector3 // external
    val viewHistory: MutableList<CameraState> = mutableListOf() // CameraState is a data class

    init {
        // Initialize targetPosition, targetLookAt
        // Start update loop (e.g., using kotlinx.coroutines.GlobalScope.launch or window.requestAnimationFrame)
    }

    fun startPan(event: PointerEvent) { /* ... */ }
    fun pan(event: PointerEvent) { /* ... */ }
    fun endPan() { /* ... */ }
    fun zoom(event: WheelEvent) { /* ... */ }
    fun moveTo(x: Double, y: Double, z: Double, duration: Double = 0.7, lookAt: Vector3D? = null) { /* Use GSAP via external interface */ }
    // ... other methods like resetView, pushState, popState

    fun dispose() { /* Cancel animation frame, kill GSAP tweens */ }
}

data class CameraState(val position: Vector3D, val lookAt: Vector3D, val targetNodeId: String?)

class ForceLayout(val spaceGraph: SpaceGraph, config: ForceLayoutSettings? = null) {
    val nodes: MutableList<BaseNode> = mutableListOf()
    val edges: MutableList<Edge> = mutableListOf()
    val velocities: MutableMap<String, Vector3D> = mutableMapOf() // NodeId to Vector3D
    val fixedNodes: MutableSet<BaseNode> = mutableSetOf()
    var isRunning: Boolean = false
    val settings: ForceLayoutSettings = config ?: ForceLayoutSettings()

    // Methods for addNode, removeNode, start, stop, kick, calculateStep
    fun calculateStep(): Double { /* ... complex physics calculation ... */ return 0.0 }
    fun kick(intensity: Double = 1.0) { /* ... */ }
    fun start() { /* ... use requestAnimationFrame or coroutine for loop ... */ }
    fun stop() { /* ... */ }

    fun dispose() { /* Stop simulation */ }
}

data class ForceLayoutSettings(
    var repulsion: Double = 3000.0,
    var attraction: Double = 0.001,
    // ... other settings
)

// Helper for UI elements that might be passed in
data class UiElements(
    val contextMenuEl: HTMLElement?,
    val confirmDialogEl: HTMLElement?,
    val statusIndicatorEl: HTMLElement?
)

// Helper for Size
data class Size(var width: Double, var height: Double)

// Utility functions (can be top-level or in a companion object)
fun generateId(prefix: String = "id-kt"): String = TODO() // Implement similar to JS
val DEG2RAD_KT = kotlin.math.PI / 180.0
// DOM selectors can use kotlinx.browser.document.querySelector / querySelectorAll
```

## 4. Plan JavaScript Interoperability (Kotlin/JS)

### External JavaScript Libraries
*   **THREE.js**: Core 3D library.
*   **CSS3DRenderer**: Add-on for THREE.js to render DOM elements in 3D.
*   **GSAP (GreenSock Animation Platform)**: Used for smooth camera animations.

### `external` Declarations

Kotlin's `external` keyword is crucial for interfacing with these. We'll need to define Kotlin declarations that mirror the parts of these libraries we use.

**Example for THREE.js:**

```kotlin
@JsModule("three") @JsNonModule
external object THREE {
    class Scene : EventDispatcher {
        fun add(obj: Object3D)
        fun remove(obj: Object3D)
        fun clear()
        // ... other Scene properties/methods needed
    }

    open class Object3D : EventDispatcher {
        var position: Vector3
        var quaternion: Quaternion
        var userData: dynamic
        // ...
    }

    class Vector3(x: Double = definedExternally, y: Double = definedExternally, z: Double = definedExternally) {
        fun set(x: Double, y: Double, z: Double): Vector3
        fun copy(v: Vector3): Vector3
        fun add(v: Vector3): Vector3
        fun sub(v: Vector3): Vector3
        fun multiplyScalar(s: Double): Vector3
        fun distanceTo(v: Vector3): Double
        // ... other Vector3 methods
    }

    class PerspectiveCamera(fov: Number, aspect: Number, near: Number, far: Number) : Camera {
        // ...
    }

    class WebGLRenderer(parameters: WebGLRendererParameters = definedExternally) {
        val domElement: HTMLCanvasElement
        fun setSize(width: Number, height: Number)
        fun setPixelRatio(value: Number)
        fun setClearColor(color: Color, alpha: Number)
        fun render(scene: Scene, camera: Camera)
        fun dispose()
    }

    interface WebGLRendererParameters {
        var canvas: HTMLCanvasElement?
        var antialias: Boolean?
        var alpha: Boolean?
    }

    class LineBasicMaterial(parameters: dynamic = definedExternally) : Material { /*...*/ }
    class BufferGeometry : EventDispatcher {
        // ...
        fun setFromPoints(points: Array<Vector3>): BufferGeometry
        val attributes: dynamic // For position attribute
        fun computeBoundingSphere()
        fun dispose()
    }
    class Line(geometry: BufferGeometry? = definedExternally, material: Material? = definedExternally) : Object3D {
        var renderOrder: Int
        fun computeLineDistances(): Line // For dashed lines
        // ...
    }
    // ... Other THREE classes: AmbientLight, DirectionalLight, Raycaster, Plane, BoxGeometry, SphereGeometry, MeshStandardMaterial, Mesh, Color, Quaternion etc.
}

// For CSS3DRenderer (assuming it's in a separate file/module from 'three')
@JsModule("three/addons/renderers/CSS3DRenderer.js") @JsNonModule
external class CSS3DObject(element: HTMLElement) : THREE.Object3D {
    // any specific properties/methods if needed, inherits from THREE.Object3D
}

@JsModule("three/addons/renderers/CSS3DRenderer.js") @JsNonModule
external class CSS3DRenderer {
    val domElement: HTMLElement
    fun setSize(width: Number, height: Number)
    fun render(scene: THREE.Scene, camera: THREE.Camera)
}


// For GSAP (simplified example)
@JsModule("gsap") @JsNonModule
external object gsap {
    fun to(targets: dynamic, vars: dynamic): dynamic // Timeline or Tween instance
    fun killTweensOf(targets: dynamic)
    fun isTweening(target: dynamic): Boolean
}
```
This will be a significant part of the porting effort, defining these external interfaces accurately.

### DOM Manipulation
The helper functions `$` and `$$` will be replaced by Kotlin/JS's standard library for DOM manipulation:
*   `kotlinx.browser.document.querySelector(selector)`
*   `kotlinx.browser.document.querySelectorAll(selector)` (returns a `NodeList`, which can be converted to a List)
*   `kotlinx.browser.document.createElement(tagName)` as `kotlinx.dom.createElement(tagName) { /* attributes */ }` or `document.createElement(tagName).unsafeCast<HTMLDivElement>()`
*   Event handling will use `element.addEventListener("type", callback)`.

Kotlin's type safety and extension functions can make DOM manipulation more robust. For example, for `HtmlNodeElement._createHtmlElement`:
```kotlin
// In HtmlNode class
import kotlinx.browser.document
import kotlinx.dom.addClass
import kotlinx.dom.append
import kotlinx.dom.createElement
import org.w3c.dom.HTMLDivElement

private fun createHtmlElement(): HTMLDivElement {
    return document.createElement("div") {
        addClass("node-html")
        id = "node-html-${this@HtmlNode.id}"
        asDynamic().dataset.nodeId = this@HtmlNode.id // Or use setAttribute
        style.width = "${size.width}px"
        style.height = "${size.height}px"

        // ...innerHTML can be built using kotlinx.html.div or by setting innerHTML string directly
        // For complex structures, kotlinx.html offers a typesafe builder.
        // For simpler cases, setting innerHTML might be quicker if the structure is stable.
        innerHTML = """
            <div class="node-inner-wrapper">
                <div class="node-content" spellcheck="false" style="transform: scale(${data.rawJsData?.contentScale ?: 1.0});">${data.label ?: data.rawJsData?.content ?: ""}</div>
                // ... controls ...
            </div>
            <div class="resize-handle" title="Resize Node"></div>
        """
        if (data.rawJsData?.type == "note") addClass("note-node")
        if (data.rawJsData?.editable == true) initContentEditable(this)

    }.unsafeCast<HTMLDivElement>()
}
```

## 5. Define Kotlin Data-Oriented Classes

```kotlin
// Already defined above, but reiterated here for clarity:

// Basic 3D Vector (can be replaced by THREE.Vector3 where appropriate,
// but having a simple internal data class can be useful).
data class Vector3D(var x: Double, var y: Double, var z: Double) {
    fun toThreeVector(): THREE.Vector3 = THREE.Vector3(x, y, z)
    companion object {
        fun fromThreeVector(tv: THREE.Vector3) = Vector3D(tv.x, tv.y, tv.z)
    }
}

data class Size(var width: Double, var height: Double)

// Common Node Data Structure
// Using 'dynamic' for rawJsData allows flexibility but sacrifices some type safety.
// Alternatively, create more specific data classes for each node type.
data class NodeCommonData(
    var label: String? = null,
    var type: String, // e.g., "html", "note", "shape"
    var mass: Double? = null,
    var rawJsData: dynamic = js("({})") // Store other properties
)

data class HtmlNodeSpecificData(
    var content: String? = null,
    var width: Double? = null,
    var height: Double? = null,
    var contentScale: Double? = null,
    var backgroundColor: String? = null,
    var editable: Boolean? = null,
    var billboard: Boolean? = null
) // Can be merged into a single NodeData with nullable fields or kept separate.

data class ShapeNodeSpecificData(
    var shape: String? = null, // Consider an enum: enum class ShapeType { SPHERE, BOX }
    var size: Double? = null,
    var color: Int? = null // Or String for CSS colors
)

// Unified NodeData (example)
data class NodeData(
    val id: String, // Usually generated or passed in
    var label: String?,
    var type: String, // "html", "note", "shape"
    // HTML Specific
    var content: String? = null,
    var width: Double? = null,
    var height: Double? = null,
    var contentScale: Double? = null,
    var backgroundColor: String? = null,
    var editable: Boolean? = null,
    var billboard: Boolean? = null, // Also for HtmlNode
    // Shape Specific
    var shapeType: String? = null, // e.g., "sphere", "box"
    var shapeSize: Double? = null,
    var shapeColor: Int? = null, // Or String
    // Common
    var mass: Double = 1.0,
    var custom: dynamic = js("({})") // For any other non-standard data
)


data class EdgeData(
    val id: String, // Usually generated
    var color: Int = 0x00d0ff, // Default color
    var thickness: Double = 1.5,
    var style: String = "solid", // TODO: Implement different line styles
    var constraintType: String = "elastic", // "elastic", "rigid", "weld"
    var constraintParams: EdgeConstraintParams = ElasticParams() // Default
)

sealed class EdgeConstraintParams
data class ElasticParams(var stiffness: Double = 0.001, var idealLength: Double = 200.0) : EdgeConstraintParams()
data class RigidParams(var distance: Double? = null, var stiffness: Double = 0.1) : EdgeConstraintParams() // distance can be calculated
data class WeldParams(var distance: Double? = null, var stiffness: Double = 0.5) : EdgeConstraintParams() // distance from node radii

// For CameraController history
data class CameraState(
    val position: Vector3D,
    val lookAt: Vector3D,
    val targetNodeId: String? = null
)

// For ForceLayout settings
data class ForceLayoutSettings(
    var repulsion: Double = 3000.0,
    var attraction: Double = 0.001,
    var idealEdgeLength: Double = 200.0,
    var centerStrength: Double = 0.0005,
    var damping: Double = 0.92,
    var minEnergyThreshold: Double = 0.1,
    var gravityCenter: Vector3D = Vector3D(0.0, 0.0, 0.0),
    var zSpreadFactor: Double = 0.15,
    var autoStopDelay: Long = 4000L, // milliseconds
    var nodePadding: Double = 1.2,
    var defaultElasticStiffness: Double = 0.001,
    var defaultElasticIdealLength: Double = 200.0,
    var defaultRigidStiffness: Double = 0.1,
    var defaultWeldStiffness: Double = 0.5
) {
    init {
        defaultElasticStiffness = attraction
        defaultElasticIdealLength = idealEdgeLength
    }
}
```

## 6. Summarize Key Differences/Challenges

*   **External Declarations:** The most laborious part will be creating accurate and comprehensive `external` declarations for THREE.js, CSS3DRenderer, and GSAP. This requires careful mapping of JS APIs to Kotlin. Any missing or incorrect declaration will lead to runtime errors.
*   **DOM Manipulation:** While `kotlinx.browser` and `kotlinx.html` are powerful, the directness of JS `innerHTML` and `querySelector` for complex, pre-defined HTML structures (like in `HtmlNodeElement._createHtmlElement`) might feel more verbose to translate one-to-one. Using template strings or `kotlinx.html` builders are options.
*   **Dynamic Nature vs. Static Typing:**
    *   JavaScript's dynamic typing allows for flexible property additions (e.g., `node.data` can hold anything). Kotlin's static typing encourages more structured data classes. Using `dynamic` type in Kotlin is possible but sacrifices type safety. A balance needs to be struck, perhaps with a core typed model and an additional `customProperties: MutableMap<String, Any?>` or `dynamic` field for extensibility.
    *   The `edge.data.constraintParams` in JS is dynamically structured based on `constraintType`. In Kotlin, this is well-modeled with `sealed class EdgeConstraintParams` and specific data classes for each type.
*   **`this` Context:** JavaScript's `this` can be tricky (e.g., in event handlers). Kotlin's `this` is generally more predictable. Lambdas and function references in Kotlin will handle this well.
*   **Prototypal Inheritance vs. Classical Inheritance:** JavaScript uses prototypal inheritance. Kotlin uses classical. This is generally a smooth translation for class-based JS code, but nuances might arise if the JS code heavily relies on prototype manipulation directly. The provided `spacegraph.js` uses ES6 classes, so this is less of an issue.
*   **Callbacks and Event Handling:** JS heavily uses callbacks. Kotlin can use lambdas, which are similar. For event handling, Kotlin's `addEventListener` works fine.
*   **Animation Loop:** `requestAnimationFrame(this._animate.bind(this))` in JS. In Kotlin, this can be `window.requestAnimationFrame { animate(it) }` where `animate` is a top-level or member function. If using coroutines, a dedicated animation loop can be built with `while(isActive) { ...; delay(16) }`.
*   **GSAP Integration:** Animating Kotlin data class properties directly with GSAP might require some workarounds or ensuring GSAP can access/mutate Kotlin object properties. External interfaces for GSAP will be key.
*   **Null Safety:** Kotlin's null safety is a major advantage. It will force explicit handling of potentially null values (e.g., `selectedNode`, DOM elements not found), making the code more robust than typical JS. This might require more upfront null checks or safe calls (`?.`).
*   **Helper Functions (`$`, `$$`, etc.):** These are easily replaceable. `$` becomes `document.querySelector`, `$$` becomes `document.querySelectorAll`. Math utils like `clamp` and `lerp` are available in Kotlin's standard library or can be easily written as extension functions. `generateId` is straightforward to reimplement.
*   **`CSS3DObject.userData` and `Mesh.userData`:** These are `dynamic` in Three.js. In Kotlin, if we want type safety, we might wrap these objects or use extension properties with specific backing fields if the structure of `userData` is consistent. Otherwise, accessing them via `asDynamic().nodeId` is the direct translation.
*   **Performance:** Generally, Kotlin/JS performance is good. However, frequent interop calls between Kotlin and JS can have some overhead. For performance-critical sections like the `ForceLayout._calculateStep`, minimizing interop within the tight loops would be beneficial. Using Kotlin's primitive types and arrays where possible for calculations can help.

This design provides a solid foundation for porting `spacegraph.js` to Kotlin/JS. The primary challenges will be the detailed implementation of external interfaces and carefully translating DOM interactions and dynamic data patterns into a more type-safe Kotlin environment.
