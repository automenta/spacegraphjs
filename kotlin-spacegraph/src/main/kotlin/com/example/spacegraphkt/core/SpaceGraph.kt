package com.example.spacegraphkt.core

import com.example.spacegraphkt.api.AgentAPI
import com.example.spacegraphkt.data.*
import com.example.spacegraphkt.external.*
import kotlinx.browser.document
import kotlinx.browser.window
import org.w3c.dom.HTMLCanvasElement
import org.w3c.dom.HTMLDivElement
import org.w3c.dom.HTMLElement
import org.w3c.dom.css.CSSStyleDeclaration

/**
 * Main class for the SpaceGraphKT library. It orchestrates the 3D graph visualization,
 * managing nodes, edges, rendering, layout, camera, and user interactions.
 *
 * @param containerElement The HTML element (typically a `div`) that will host the SpaceGraph visualization.
 * @param uiElementsConfig Optional configuration for providing custom HTML elements for UI components like context menus.
 *
 * @property agentApi Reference to the [AgentAPI] instance, set after construction to allow event dispatching.
 * @property nodes A map of all nodes currently in the graph, keyed by their IDs.
 * @property edges A map of all edges currently in the graph, keyed by their IDs.
 * @property selectedNode The currently selected [BaseNode], or null if no node is selected. Setting this property dispatches a "nodeSelected" event.
 * @property selectedEdge The currently selected [Edge], or null if no edge is selected. Setting this property dispatches an "edgeSelected" event and manages the edge menu visibility.
 * @property isLinking Flag indicating if the graph is currently in "edge linking" mode (initiated by user).
 * @property linkSourceNode The source [BaseNode] for the new edge being interactively created.
 * @property tempLinkLine A temporary [THREE.Line] object used to visualize the edge being created during linking mode.
 * @property scene The main [THREE.Scene] for WebGL-rendered objects (like [ShapeNode] meshes and [Edge] lines).
 * @property cssScene A separate [THREE.Scene] for CSS3D-rendered objects (like [HtmlNodeElement]s and labels).
 * @property _camera The [THREE.PerspectiveCamera] used for viewing the graph. The underscore suggests it's primarily managed internally or by [CameraController].
 * @property webglRenderer The [THREE.WebGLRenderer] for the main 3D scene.
 * @property cssRenderer The [CSS3DRenderer] for the CSS objects scene.
 * @property uiManager The [UIManager] instance responsible for handling all user interactions.
 * @property cameraController The [CameraController] instance responsible for managing camera movements and state.
 * @property layoutEngine The [ForceLayout] instance responsible for calculating node positions.
 * @property background Current background state (color and alpha).
 */
actual class SpaceGraph actual constructor(
    actual val containerElement: HTMLElement,
    uiElementsConfig: UiElements?
) {
    var agentApi: AgentAPI? = null

    actual val nodes: MutableMap<String, BaseNode> = mutableMapOf()
    actual val edges: MutableMap<String, Edge> = mutableMapOf()

    actual var selectedNode: BaseNode? = null
        set(value) {
            val oldSelection = field
            if (oldSelection == value) return

            oldSelection?.setSelectedStyle(false)
            field = value
            field?.setSelectedStyle(true)

            if (value != null) this.selectedEdge = null

            agentApi?.dispatchGraphEvent("nodeSelected", jsObject {
                this.nodeId = value?.id
                this.previousNodeId = oldSelection?.id
            })
        }

    actual var selectedEdge: Edge? = null
        set(value) {
            val oldSelection = field
            if (oldSelection == value) return

            oldSelection?.setHighlight(false)

            field = value
            field?.setHighlight(true)

            if (value != null) {
                this.selectedNode = null
                uiManager.showEdgeMenu(value)
            } else {
                 uiManager.hideEdgeMenu()
            }

            agentApi?.dispatchGraphEvent("edgeSelected", jsObject {
                this.edgeId = value?.id
                this.previousEdgeId = oldSelection?.id
            })
        }

    actual var isLinking: Boolean = false
    actual var linkSourceNode: BaseNode? = null
    actual var tempLinkLine: THREE.Line? = null

    actual val scene: THREE.Scene = THREE.Scene()
    actual val cssScene: THREE.Scene = THREE.Scene()
    actual var _camera: THREE.PerspectiveCamera
    actual var webglRenderer: THREE.WebGLRenderer
    actual var cssRenderer: CSS3DRenderer
    private var webglCanvas: HTMLCanvasElement
    private var css3dContainer: HTMLDivElement

    actual val uiManager: UIManager
    actual val cameraController: CameraController
    actual val layoutEngine: ForceLayout

    actual var background: BackgroundState = BackgroundState(color = 0x000000, alpha = 0.0)
    /** Represents the visual state of the graph's background. @property color Hex color. @property alpha Alpha transparency. */
    data class BackgroundState(var color: Int, var alpha: Double)

    init {
        containerElement.style.position = "relative" // Crucial for positioning internal elements
        this._camera = THREE.PerspectiveCamera(70, window.innerWidth.toDouble() / window.innerHeight.toDouble(), 1, 20000)
        this._camera.position.z = 700.0

        val (canvas, cssContainer) = _setupRenderers()
        webglCanvas = canvas
        css3dContainer = cssContainer

        this.webglRenderer = THREE.WebGLRenderer(jsObject { this.canvas = webglCanvas; this.antialias = true; this.alpha = true })
        this.webglRenderer.setSize(window.innerWidth, window.innerHeight)
        this.webglRenderer.setPixelRatio(window.devicePixelRatio)

        this.cssRenderer = CSS3DRenderer()
        this.cssRenderer.setSize(window.innerWidth, window.innerHeight)
        this.css3dContainer.appendChild(this.cssRenderer.domElement)

        setBackground(this.background.color, this.background.alpha) // Apply initial background
        _setupLighting()

        // Initialize core components
        this.cameraController = CameraController(this._camera, this.webglCanvas)
        this.layoutEngine = ForceLayout(this, ForceLayoutSettings()) // Use default layout settings
        this.uiManager = UIManager(this, uiElementsConfig) // Initialize UIManager

        this.cameraController.setInitialState() // Save initial camera state for reset
        window.addEventListener("resize", { _onWindowResize() }, false) // Handle window resizing
        _animate() // Start the main animation loop
        layoutEngine.start() // Start the force layout simulation
    }

    /**
     * Sets up the WebGL canvas and CSS3D container elements within the main [containerElement].
     * Creates these elements if they don't already exist with specific IDs.
     * @return A Pair containing the WebGL [HTMLCanvasElement] and the CSS3D [HTMLDivElement] container.
     * @internal
     */
    actual fun _setupRenderers(): Pair<HTMLCanvasElement, HTMLDivElement> {
        var canvas = document.querySelector("#webgl-canvas") as? HTMLCanvasElement ?:
            (document.createElement("canvas") as HTMLCanvasElement).apply { id = "webgl-canvas"; containerElement.appendChild(this) }
        var cssContainer = document.querySelector("#css3d-container") as? HTMLDivElement ?:
            (document.createElement("div") as HTMLDivElement).apply { id = "css3d-container"; containerElement.appendChild(this) }

        cssContainer.style.apply { position = "absolute"; inset = "0"; width = "100%"; height = "100%"; pointerEvents = "none"; zIndex = "2" }
        canvas.style.apply { position = "absolute"; inset = "0"; zIndex = "1" } // WebGL behind CSS3D
        return Pair(canvas, cssContainer)
    }

    /**
     * Sets up basic lighting (ambient and directional) for the WebGL [scene].
     * @internal
     */
    actual fun _setupLighting() {
        scene.add(THREE.AmbientLight(0xffffff, 0.8)) // Soft white light
        scene.add(THREE.DirectionalLight(0xffffff, 0.7).apply { position.set(0.5, 1.0, 0.75) }) // Main light source
    }

    /**
     * Sets the background color and opacity of the SpaceGraph visualization.
     * @param color The background color as a hex integer (e.g., 0x000000 for black).
     * @param alpha The opacity of the background (0.0 for transparent, 1.0 for opaque).
     */
    actual fun setBackground(color: Int, alpha: Double) {
        this.background = BackgroundState(color, alpha)
        webglRenderer.setClearColor(color, alpha) // For WebGL background
        webglCanvas.style.backgroundColor = if (alpha == 0.0) "transparent" else "#${color.toString(16).padStart(6, '0')}" // For canvas CSS background
        agentApi?.dispatchGraphEvent("backgroundChanged", jsObject { this.color = color; this.alpha = alpha })
    }

    /**
     * Adds a node to the graph.
     * The node is added to the internal nodes map, its respective scene (WebGL or CSS3D),
     * and registered with the layout engine.
     * Dispatches a "nodeAdded" event via the AgentAPI.
     * @param nodeInstance The [BaseNode] derivative (e.g., [NoteNode], [ShapeNode]) to add.
     * @return The node instance that was added, or the existing node if an ID conflict occurs.
     */
    actual fun addNode(nodeInstance: BaseNode): BaseNode {
        if (nodes.containsKey(nodeInstance.id)) {
            console.warn("Node with id ${nodeInstance.id} already exists.")
            return nodes[nodeInstance.id]!!
        }
        nodes[nodeInstance.id] = nodeInstance
        nodeInstance.spaceGraphInstance = this

        when (nodeInstance) {
            is HtmlNodeElement -> cssScene.add(nodeInstance.css3dObject) // HTML nodes go to CSS scene
            is ShapeNode -> { // Shape nodes go to WebGL scene, their labels to CSS scene
                scene.add(nodeInstance.mesh)
                nodeInstance.labelObject?.let { cssScene.add(it) }
            }
            // Potentially other types of nodes could be handled here
        }
        layoutEngine.addNode(nodeInstance) // Add to physics layout
        agentApi?.dispatchGraphEvent("nodeAdded", jsObject { this.nodeId = nodeInstance.id; this.nodeData = agentApi?.getNode(nodeInstance.id) })
        return nodeInstance
    }

    /**
     * Removes a node from the graph by its ID.
     * Also removes all edges connected to this node.
     * The node is removed from scenes, layout engine, and internal maps.
     * Dispatches a "nodeRemoved" event via the AgentAPI.
     * @param nodeId The ID of the node to remove.
     * @return The removed [BaseNode] instance, or null if no node with that ID was found.
     */
    actual fun removeNode(nodeId: String): BaseNode? {
        val node = nodes.remove(nodeId) ?: return null.also { console.warn("Node $nodeId not found for removal.") }

        if (selectedNode == node) this.selectedNode = null // Clear selection if this node was selected
        if (linkSourceNode == node) uiManager.cancelLinking() // Cancel linking if this was the source

        // Remove all edges connected to this node
        edges.values.filter { it.source == node || it.target == node }.toList().forEach { removeEdge(it.id) }

        node.dispose() // Node handles its own scene removal and resource cleanup
        layoutEngine.removeNode(node) // Remove from physics layout
        agentApi?.dispatchGraphEvent("nodeRemoved", jsObject { this.nodeId = nodeId })
        return node
    }

    /**
     * Adds an edge between two nodes.
     * The edge is added to internal maps, the WebGL scene, and the layout engine.
     * Dispatches an "edgeAdded" event via the AgentAPI.
     * @param sourceNode The source [BaseNode] of the edge.
     * @param targetNode The target [BaseNode] of the edge.
     * @param data Optional [EdgeData] for the edge. If null or ID is missing, an ID is generated.
     * @return The created [Edge] instance, or null if the edge could not be created (e.g., self-loop, duplicate).
     */
    actual fun addEdge(sourceNode: BaseNode, targetNode: BaseNode, data: EdgeData?): Edge? {
        if (sourceNode == targetNode) return null.also { console.warn("Cannot add self-edge.") }
        // Prevent duplicate edges (same source and target, regardless of direction for this check)
        if (edges.values.any { (it.source == sourceNode && it.target == targetNode) || (it.source == targetNode && it.target == sourceNode) })
            return null.also { console.warn("Duplicate edge ignored between ${sourceNode.id} and ${targetNode.id}.") }

        val edgeId = data?.id?.takeIf { it.isNotBlank() } ?: generateId("edge-kt-")
        val edgeDataForConstructor = data?.copy(id = edgeId) ?: EdgeData(id = edgeId) // Ensure data has consistent ID

        val edge = Edge(edgeId, sourceNode, targetNode, edgeDataForConstructor).apply { spaceGraphInstance = this }

        edges[edge.id] = edge
        scene.add(edge.threeJsLine) // Edges are WebGL objects
        layoutEngine.addEdge(edge) // Add to physics layout
        agentApi?.dispatchGraphEvent("edgeAdded", jsObject { this.edgeId = edge.id; this.edgeData = agentApi?.getEdge(edge.id) })
        return edge
    }

    /**
     * Convenience overload for adding an edge with minimal parameters.
     * @param sourceNode The source node.
     * @param targetNode The target node.
     * @param label Optional label for the edge.
     * @param color Optional color (hex int) for the edge.
     * @param thickness Optional thickness for the edge line.
     * @return The created [Edge] instance or null.
     */
    fun addEdge(sourceNode: BaseNode, targetNode: BaseNode, label: String? = null, color: Int? = null, thickness: Double? = null): Edge? =
        addEdge(sourceNode, targetNode, EdgeData(id = generateId("edge-kt-"), label = label, color = color ?: 0x00d0ff, thickness = thickness ?: 1.5))

    /**
     * Removes an edge from the graph by its ID.
     * The edge is removed from scenes, layout engine, and internal maps.
     * Dispatches an "edgeRemoved" event via the AgentAPI.
     * @param edgeId The ID of the edge to remove.
     * @return The removed [Edge] instance, or null if no edge with that ID was found.
     */
    actual fun removeEdge(edgeId: String): Edge? {
        val edge = edges.remove(edgeId) ?: return null.also { console.warn("Edge $edgeId not found for removal.") }
        if (selectedEdge == edge) this.selectedEdge = null // Clear selection if this edge was selected

        edge.dispose() // Edge handles its own scene removal and resource cleanup
        layoutEngine.removeEdge(edge) // Remove from physics layout
        agentApi?.dispatchGraphEvent("edgeRemoved", jsObject { this.edgeId = edgeId })
        return edge
    }

    /** @return The [BaseNode] with the given ID, or null if not found. */
    actual fun getNodeById(id: String): BaseNode? = nodes[id]
    /** @return The [Edge] with the given ID, or null if not found. */
    actual fun getEdgeById(id: String): Edge? = edges[id]

    /**
     * Updates all nodes and edges. Called each frame before rendering.
     * Invokes `update()` on each node and edge, and updates UI components like the edge menu position.
     * @internal
     */
    actual fun _updateNodesAndEdges() {
        nodes.values.forEach { it.update() } // For billboarding, custom animations, etc.
        edges.values.forEach { it.update() } // For updating line geometry based on node positions
        uiManager.updateEdgeMenuPosition() // Keep edge menu correctly positioned if visible
    }

    /**
     * Renders both the WebGL and CSS3D scenes. Called each frame.
     * @internal
     */
    actual fun _render() {
        webglRenderer.render(scene, _camera)
        cssRenderer.render(cssScene, _camera)
    }

    private var animationFrameId: Int = -1 // ID for the main animation frame request
    /**
     * The main animation loop. Calls updates for nodes/edges and renders the scenes.
     * This loop is managed by `requestAnimationFrame`.
     * [ForceLayout] and [CameraController] manage their own independent animation loops for physics and camera smoothness.
     * @internal
     */
    actual fun _animate() {
        _updateNodesAndEdges() // Update visual states based on layout changes etc.
        _render() // Render the current state
        animationFrameId = window.requestAnimationFrame { _animate() } // Request next frame
    }

    /**
     * Handles window resize events to update camera aspect ratio and renderer sizes.
     * Dispatches a "windowResized" event via AgentAPI.
     * @internal
     */
    actual fun _onWindowResize() {
        _camera.aspect = window.innerWidth.toDouble() / window.innerHeight.toDouble()
        _camera.updateProjectionMatrix()
        webglRenderer.setSize(window.innerWidth, window.innerHeight)
        cssRenderer.setSize(window.innerWidth, window.innerHeight)
        agentApi?.dispatchGraphEvent("windowResized", jsObject { this.width = window.innerWidth; this.height = window.innerHeight })
    }

    /**
     * Centers the camera view on a target position or the average position of all nodes.
     * Uses [CameraController] to animate the camera movement.
     * Dispatches a "viewCentered" event via AgentAPI.
     * @param targetPosition Optional [Vector3D] to center on. If null, centers on average node position or origin.
     * @param duration Duration of the camera animation in seconds.
     */
    actual fun centerView(targetPosition: Vector3D?, duration: Double) {
        val pos = targetPosition ?: nodes.values.takeIf { it.isNotEmpty() }?.let { allNodes ->
            Vector3D( // Calculate average position of all nodes
                allNodes.sumOf { it.position.x } / allNodes.size,
                allNodes.sumOf { it.position.y } / allNodes.size,
                allNodes.sumOf { it.position.z } / allNodes.size
            )
        } ?: Vector3D(0.0,0.0,0.0) // Default to origin if no nodes or targetPosition

        val distance = if (nodes.size > 1) 700.0 else 400.0 // Heuristic for camera distance
        cameraController.moveTo(pos.x, pos.y, pos.z + distance, duration, pos) // Move camera
        agentApi?.dispatchGraphEvent("viewCentered", jsObject { this.target = pos; this.duration = duration })
    }

    /**
     * Focuses the camera on a specific node, adjusting zoom to fit the node in view.
     * Uses [CameraController] to animate the camera.
     * Dispatches a "nodeFocused" event via AgentAPI.
     * @param node The [BaseNode] to focus on.
     * @param duration Duration of the camera animation in seconds.
     * @param pushHistory If true, current camera state is pushed to history for "back" functionality.
     */
    actual fun focusOnNode(node: BaseNode, duration: Double, pushHistory: Boolean) {
        val targetPos = node.position.copy() // Target camera to look at node's position
        val fov = _camera.fov.toDouble() * DEG2RAD_KT
        val aspect = _camera.aspect.toDouble()

        // Estimate node size for appropriate zoom level
        var nodeVisualSize = when (node) {
            is HtmlNodeElement -> kotlin.math.max(node.size.width / aspect, node.size.height) * (node.data.contentScale ?: 1.0) * 1.2
            is ShapeNode -> node.getBoundingSphereRadius() * 2.0 // Diameter
            else -> node.getBoundingSphereRadius() * 2.0
        }.coerceAtLeast(50.0) // Ensure a minimum visual size for reasonable zoom

        val distance = (nodeVisualSize / (2 * kotlin.math.tan(fov / 2.0))) + 50.0 // Calculate camera distance + padding

        if (pushHistory) cameraController.pushState()
        cameraController.moveTo(targetPos.x, targetPos.y, targetPos.z + distance, duration, targetPos)
        agentApi?.dispatchGraphEvent("nodeFocused", jsObject { this.nodeId = node.id; this.duration = duration })
    }

    /**
     * Automatically zooms on a node. If already focused on this node, it navigates back in view history.
     * Called by [UIManager] typically on middle-mouse click or specific interactions.
     * @param node The [BaseNode] to auto-zoom on.
     */
    actual fun autoZoom(node: BaseNode) {
        if (cameraController.getCurrentTargetNodeId() == node.id) {
            cameraController.popState() // Go back if already focused
        } else {
            cameraController.pushState() // Save current view before focusing
            cameraController.setCurrentTargetNodeId(node.id)
            focusOnNode(node, 0.6, false) // Focus without pushing to history again
        }
    }

    /**
     * Converts screen coordinates (e.g., from a mouse event) to 3D world coordinates
     * on a plane at a specified Z-depth.
     * @param screenX X-coordinate on the screen.
     * @param screenY Y-coordinate on the screen.
     * @param targetZ The Z-depth of the target plane in world coordinates.
     * @return A [Vector3D] representing the world coordinates, or null if intersection fails.
     */
    actual fun screenToWorld(screenX: Double, screenY: Double, targetZ: Double): Vector3D? {
        val vecNDC = THREE.Vector3( // Normalized Device Coordinates
            (screenX / window.innerWidth) * 2 - 1,
            -(screenY / window.innerHeight) * 2 + 1,
            0.5 // Z component for unprojecting (0.5 is middle of near-far plane)
        )
        val raycaster = THREE.Raycaster()
        // setFromCamera expects Vector2 for screen coords, but we use unproject for world coords
        raycaster.setFromCamera(THREE.Vector2(vecNDC.x, vecNDC.y), _camera) // Use only x,y for ray direction from camera

        // Define a plane at targetZ, normal to Z-axis (facing camera)
        val plane = THREE.Plane(THREE.Vector3(0.0, 0.0, 1.0), -targetZ) // Plane equation: z = targetZ
        val intersectPoint = THREE.Vector3()

        return raycaster.ray.intersectPlane(plane, intersectPoint)?.let { Vector3D.fromThreeVector(it) }
    }

    /**
     * Determines which graph object (node or edge) is intersected by a ray cast from screen coordinates.
     * Used by [UIManager] for object picking.
     * @param screenX X-coordinate on the screen.
     * @param screenY Y-coordinate on the screen.
     * @return The intersected [BaseNode] or [Edge], or null if no object is intersected.
     *         Returns a dynamic type as it can be either Node or Edge.
     */
    actual fun intersectedObject(screenX: Double, screenY: Double): dynamic {
        val vecNDC = THREE.Vector2( // Normalized Device Coordinates for raycasting
            (screenX / window.innerWidth) * 2 - 1,
            -(screenY / window.innerHeight) * 2 + 1
        )
        val raycaster = THREE.Raycaster().apply {
            setFromCamera(vecNDC, _camera)
            params.Line = jsObject { this.threshold = 5 } // Intersection threshold for lines (edges)
        }

        // Check for intersections with ShapeNode meshes first
        nodes.values.mapNotNull { (it as? ShapeNode)?.mesh }.toTypedArray().takeIf { it.isNotEmpty() }?.let { meshes ->
            raycaster.intersectObjects(meshes).firstOrNull()?.obj?.let { intersectedMesh ->
                return nodes.values.find { (it as? ShapeNode)?.mesh == intersectedMesh } // Return the ShapeNode
            }
        }
        // Then check for intersections with Edge lines
        edges.values.mapNotNull { it.threeJsLine }.toTypedArray().takeIf { it.isNotEmpty() }?.let { lines ->
            raycaster.intersectObjects(lines).firstOrNull()?.obj?.let { intersectedLine ->
                return edges.values.find { it.threeJsLine == intersectedLine } // Return the Edge
            }
        }
        return null // No intersection
    }

    /**
     * Disposes of all resources used by SpaceGraph, including nodes, edges, renderers,
     * and managers. Removes event listeners and cancels animation frames.
     * Dispatches a "graphDisposed" event via AgentAPI.
     */
    actual fun dispose() {
        window.removeEventListener("resize", { _onWindowResize() })
        window.cancelAnimationFrame(animationFrameId) // Stop main animation loop

        cameraController.dispose()
        layoutEngine.stop(); layoutEngine.dispose()
        uiManager.dispose()

        // Dispose all nodes and edges
        nodes.values.forEach(BaseNode::dispose); nodes.clear()
        edges.values.forEach(Edge::dispose); edges.clear()

        scene.clear(); cssScene.clear() // Clear Three.js scenes
        webglRenderer.dispose() // Dispose WebGL renderer
        cssRenderer.domElement.remove() // Remove CSS3D renderer's DOM element
        css3dContainer.remove(); webglCanvas.remove() // Remove internally created canvas/container

        agentApi?.dispatchGraphEvent("graphDisposed", jsObject {})
        console.log("SpaceGraph disposed.")
    }
}

/**
 * Kotlin extension to simplify applying styles to an [HTMLElement]'s [CSSStyleDeclaration].
 * Example: `myElement.style.apply { color = "red"; fontWeight = "bold" }`
 */
fun CSSStyleDeclaration.apply(block: CSSStyleDeclaration.() -> Unit): Unit = block()
```
