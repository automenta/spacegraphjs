package com.example.spacegraphkt.core

import com.example.spacegraphkt.data.NodeData
import com.example.spacegraphkt.data.Size
import com.example.spacegraphkt.data.Vector3D
import com.example.spacegraphkt.external.CSS3DObject
import com.example.spacegraphkt.external.THREE // Only needed if referencing THREE types directly here.
import kotlinx.browser.document
import kotlinx.dom.addClass
import kotlinx.dom.removeClass
import org.w3c.dom.HTMLDivElement
import org.w3c.dom.HTMLElement
import org.w3c.dom.events.Event // For event handlers
import org.w3c.dom.pointerevents.PointerEvent // For pointer events if used directly
import kotlin.math.max
import kotlin.math.sqrt

/**
 * A type of [BaseNode] that is represented by an HTML element in the 3D space,
 * rendered using Three.js [CSS3DRenderer].
 *
 * @property id Unique identifier for the node.
 * @property position Initial 3D position of the node.
 * @property data Data object ([NodeData]) containing configuration like label, content, type, etc.
 *              Specific fields like `data.width`, `data.height`, `data.contentScale`, `data.backgroundColor`,
 *              `data.billboard`, `data.editable` are used to configure this HTML node.
 * @property size The initial width and height of the HTML element. See [Size].
 * @property billboard If true, the HTML element will always face the camera.
 * @property htmlElement The root [HTMLDivElement] for this node, managed by this class.
 * @property css3dObject The [CSS3DObject] that wraps the [htmlElement] for rendering in the CSS3D scene.
 *                       This is assigned to `this.threeJsObject` from [BaseNode].
 */
actual open class HtmlNodeElement actual constructor(
    actual override var id: String,
    actual override var position: Vector3D,
    actual override var data: NodeData,
    actual var size: Size,
    actual var billboard: Boolean
) : BaseNode(id, position, data, data.mass) {

    actual val htmlElement: HTMLDivElement = _createHtmlElement()
    val css3dObject: CSS3DObject = CSS3DObject(htmlElement)

    init {
        this.threeJsObject = css3dObject // Assign to the BaseNode property for generic handling
        this.threeJsObject.position.set(position.x, position.y, position.z)
        this.threeJsObject.userData = jsObject { this.nodeId = this@HtmlNodeElement.id; this.type = "html-node" }

        // Apply initial data values from NodeData if they were set there and not overridden by constructor params
        this.size.width = data.width ?: this.size.width
        this.size.height = data.height ?: this.size.height
        this.billboard = data.billboard ?: this.billboard

        data.backgroundColor?.let { setBackgroundColor(it) } // Apply if present in NodeData
        data.contentScale?.let { setContentScale(it) }     // Apply if present in NodeData

        // Ensure element reflects these initial sizes from constructor or NodeData
        htmlElement.style.width = "${this.size.width}px"
        htmlElement.style.height = "${this.size.height}px"
    }

    /**
     * Creates the root HTML element for this node, including its inner structure and controls.
     * Populates content based on `data.label` or `data.content`.
     * Initializes content editability if `data.editable` is true.
     * @return The created [HTMLDivElement].
     */
    private fun _createHtmlElement(): HTMLDivElement {
        val el = document.createElement("div") as HTMLDivElement
        el.className = "node-html"
        data.type.let { type -> if (type.isNotBlank()) el.addClass("type-$type") }
        if (data.type == "note") el.addClass("note-node") // Specific compatibility class

        el.id = "node-html-${this.id}"
        el.dataset["nodeId"] = this.id
        // Size is applied in init after NodeData might override constructor Size object

        val initialContent = data.content ?: data.label ?: id // Default content
        val initialScale = data.contentScale ?: 1.0

        // Simplified innerHTML. Consider kotlinx.html for complex, type-safe building.
        el.innerHTML = """
            <div class="node-inner-wrapper">
                <div class="node-content" spellcheck="false" style="transform: scale($initialScale);">${initialContent}</div>
                <div class="node-controls">
                    <button class="node-quick-button node-content-zoom-in" title="Zoom In Content (+)">+</button>
                    <button class="node-quick-button node-content-zoom-out" title="Zoom Out Content (-)">-</button>
                    <button class="node-quick-button node-grow" title="Grow Node (Ctrl++)">➚</button>
                    <button class="node-quick-button node-shrink" title="Shrink Node (Ctrl+-)">➘</button>
                    <button class="node-quick-button delete-button node-delete" title="Delete Node (Del)">×</button>
                </div>
            </div>
            <div class="resize-handle" title="Resize Node"></div>
        """.trimIndent()

        if (data.editable == true) {
            _initContentEditable(el)
        }
        return el
    }

    /**
     * Initializes content editable features for the node's content area if `data.editable` is true.
     * Sets up event listeners for input, pointerdown, and wheel to manage editing and interaction.
     * @param element The HTML element (usually the root [htmlElement]) containing the content div.
     */
    private fun _initContentEditable(element: HTMLElement) {
        val contentDiv = element.querySelector(".node-content") as? HTMLDivElement
        contentDiv?.apply {
            contentEditable = "true"
            var debounceTimer: Int? = null
            addEventListener("input", {
                debounceTimer?.let { kotlinx.browser.window.clearTimeout(it) }
                debounceTimer = kotlinx.browser.window.setTimeout({
                    this@HtmlNodeElement.data.content = innerHTML // Update NodeData
                    this@HtmlNodeElement.data.label = textContent ?: "" // Update label from text
                    // TODO: Consider dispatching a 'nodeDataChanged' event via AgentAPI
                }, 300)
            })
            // Prevent SpaceGraph drag operations when interacting with contentEditable
            addEventListener("pointerdown", { e -> e.stopPropagation() })
            addEventListener("touchstart", { e -> e.stopPropagation() })
            addEventListener("wheel", { e -> // Prevent graph zoom if content is scrollable
                if (scrollHeight > clientHeight || scrollWidth > clientWidth) {
                    e.stopPropagation()
                }
            }, jsObject{this.passive = false})
        }
    }

    /**
     * Sets the size of the HTML node.
     * Updates `data.width` and `data.height`.
     * Optionally scales content based on the size change.
     * Notifies the layout engine by calling `kick()`.
     * @param width The new width. Minimum is 80.
     * @param height The new height. Minimum is 40.
     * @param scaleContent If true, attempts to scale content proportionally to the size change.
     */
    actual open fun setSize(width: Double, height: Double, scaleContent: Boolean) {
        val oldWidth = this.size.width
        val oldHeight = this.size.height
        this.size.width = max(80.0, width)
        this.size.height = max(40.0, height)

        htmlElement.style.width = "${this.size.width}px"
        htmlElement.style.height = "${this.size.height}px"

        if (scaleContent && oldWidth > 0 && oldHeight > 0) {
            val currentContentScale = this.data.contentScale ?: 1.0
            val scaleFactor = sqrt((this.size.width * this.size.height) / (oldWidth * oldHeight))
            setContentScale(currentContentScale * scaleFactor)
        }
        this.data.width = this.size.width // Update NodeData
        this.data.height = this.size.height // Update NodeData
        spaceGraphInstance?.layoutEngine?.kick()
    }

    /**
     * Sets the scaling factor for the node's content.
     * Updates `data.contentScale`.
     * The scale is clamped between 0.3 and 3.0.
     * @param scale The new content scale factor.
     */
    actual open fun setContentScale(scale: Double) {
        val newScale = scale.coerceIn(0.3, 3.0)
        this.data.contentScale = newScale // Update NodeData
        val contentEl = htmlElement.querySelector(".node-content") as? HTMLElement
        contentEl?.style?.transform = "scale($newScale)"
    }

    /**
     * Sets the background color of the HTML node.
     * Updates `data.backgroundColor`.
     * @param color A CSS color string (e.g., "rgba(255,0,0,0.5)", "#FF0000", "var(--my-color)").
     */
    actual open fun setBackgroundColor(color: String) {
        this.data.backgroundColor = color // Update NodeData
        htmlElement.style.setProperty("--node-bg", color) // If using CSS variables
        // htmlElement.style.backgroundColor = color // Or set directly
    }

    /**
     * Adjusts the content scale by a delta factor.
     * @param deltaFactor Factor to multiply the current content scale by (e.g., 1.1 for 10% larger).
     */
    actual fun adjustContentScale(deltaFactor: Double) {
        setContentScale((data.contentScale ?: 1.0) * deltaFactor)
    }

    /**
     * Adjusts the node's overall size by a factor. Content is not scaled with this call.
     * @param factor Factor to multiply current width and height by.
     */
    actual fun adjustNodeSize(factor: Double) {
        setSize(size.width * factor, size.height * factor, false)
    }

    /**
     * Updates the node, primarily for billboarding if enabled.
     * Called each frame by the [SpaceGraph] animation loop.
     * The position of [css3dObject] is generally managed by the `setPosition` via `BaseNode.threeJsObject`.
     */
    actual override fun update() {
        if (billboard && spaceGraphInstance?._camera != null) {
            // css3dObject (which is threeJsObject) inherits from THREE.Object3D, so it has a quaternion
            css3dObject.quaternion.copy(spaceGraphInstance!!._camera!!.quaternion)
        }
    }

    /**
     * Disposes of the HTML node, removing its HTML element from the DOM and calling superclass dispose.
     */
    actual override fun dispose() {
        htmlElement.remove() // Remove from DOM
        super.dispose() // Handles removal of css3dObject (as threeJsObject) from scene
    }

    /**
     * Calculates an approximate bounding sphere radius for layout purposes.
     * Based on the diagonal of the node's current width and height, scaled by contentScale.
     * @return The approximate radius.
     */
    actual override fun getBoundingSphereRadius(): Double {
        return sqrt(size.width * size.width + size.height * size.height) / 2.0 * (data.contentScale ?: 1.0)
    }

    /**
     * Sets the visual style for selection. Adds/removes a "selected" CSS class to the [htmlElement].
     * @param selected True if selected, false otherwise.
     */
    actual override fun setSelectedStyle(selected: Boolean) {
        // super.setSelectedStyle(selected) // BaseNode's implementation is for Mesh, not relevant here.
        if (selected) {
            htmlElement.addClass("selected")
        } else {
            htmlElement.removeClass("selected")
        }
    }

    /**
     * Called by [UIManager] when a resize operation starts on this node.
     * Adds "resizing" CSS class and fixes node in layout.
     */
    actual open fun startResize() {
        htmlElement.addClass("resizing")
        spaceGraphInstance?.layoutEngine?.fixNode(this)
    }

    /**
     * Called by [UIManager] during a resize operation. Updates node size.
     * @param newWidth The target new width.
     * @param newHeight The target new height.
     */
    actual open fun resize(newWidth: Double, newHeight: Double) {
        setSize(newWidth, newHeight, false)
    }

    /**
     * Called by [UIManager] when a resize operation ends.
     * Removes "resizing" CSS class and releases node in layout.
     */
    actual open fun endResize() {
        htmlElement.removeClass("resizing")
        spaceGraphInstance?.layoutEngine?.releaseNode(this)
    }
}

// Helper for jsObject if not already in a common place, used for userData and event listener options
internal fun jsObject(init: dynamic.() -> Unit): dynamic {
    val o = js("{}")
    init(o)
    return o
}
