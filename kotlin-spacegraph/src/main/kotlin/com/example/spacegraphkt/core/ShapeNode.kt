package com.example.spacegraphkt.core

import com.example.spacegraphkt.data.NodeData
import com.example.spacegraphkt.data.Vector3D
import com.example.spacegraphkt.external.CSS3DObject
import com.example.spacegraphkt.external.THREE
import kotlinx.browser.document
import org.w3c.dom.HTMLDivElement
import kotlin.math.max
import kotlin.math.sqrt

/**
 * A type of [BaseNode] that is represented by a 3D geometric shape (e.g., sphere, box)
 * in the WebGL scene, rendered using Three.js [THREE.Mesh].
 * It can also display a text label using a [CSS3DObject].
 *
 * @property id Unique identifier for the node.
 * @property position Initial 3D position of the node.
 * @property data Data object ([NodeData]) containing configuration.
 *              Key fields used: `data.label` (for the 3D label), `data.shapeType` (e.g., "sphere", "box"),
 *              `data.shapeSize` (diameter or side length), `data.shapeColor` (hex color).
 * @property shape The type of geometric shape to display (e.g., "sphere", "box"). Defaults from `data.shapeType`.
 * @property size The size of the shape (e.g., diameter for a sphere, side length for a box). Defaults from `data.shapeSize`.
 * @property color The color of the shape's material (hex integer). Defaults from `data.shapeColor`.
 * @property mesh The [THREE.Mesh] instance representing the 3D shape.
 *              This is assigned to `this.threeJsObject` from [BaseNode].
 *
 * The label for the shape is stored in `this.labelObject` from [BaseNode].
 */
actual class ShapeNode actual constructor(
    actual override var id: String,
    actual override var position: Vector3D,
    actual override var data: NodeData,
    actual var shape: String,
    actual var size: Double,
    actual var color: Int
) : BaseNode(id, position, data, data.mass) {

    actual val mesh: THREE.Mesh // The primary Three.js object for this node type

    init {
        // Initialize properties from NodeData if they were provided there, overriding constructor defaults if necessary
        this.shape = data.shapeType ?: this.shape
        this.size = data.shapeSize ?: this.size
        this.color = data.shapeColor ?: this.color
        this.data.label = data.label ?: id // Ensure label in data is at least the ID

        this.mesh = _createMesh()
        this.threeJsObject = mesh // Assign to the BaseNode property for generic handling
        this.threeJsObject.position.set(position.x, position.y, position.z)
        this.threeJsObject.userData = jsObject { this.nodeId = this@ShapeNode.id; this.type = "shape-node" }

        // Create and assign the 3D text label if a label string is available in NodeData
        if (!this.data.label.isNullOrBlank()) {
            this.labelObject = _createLabel() // Assigns to BaseNode's labelObject
        }
    }

    /**
     * Creates the [THREE.Mesh] for the shape based on [shape], [size], and [color] properties.
     * Supports "box" and "sphere" shapes.
     * @return The created [THREE.Mesh].
     */
    private fun _createMesh(): THREE.Mesh {
        val geometry: THREE.BufferGeometry
        val effectiveSize = max(1.0, this.size) // Ensure size is positive for geometry creation

        when (this.shape.lowercase()) {
            "box" -> {
                geometry = THREE.BoxGeometry(effectiveSize, effectiveSize, effectiveSize)
            }
            "sphere" -> {
                geometry = THREE.SphereGeometry(effectiveSize / 2.0, 32, 16) // Increased segments for smoother sphere
            }
            else -> {
                console.warn("Unknown shape type '${this.shape}', defaulting to sphere.")
                this.shape = "sphere" // Correct the internal state
                this.data.shapeType = "sphere" // Correct NodeData as well
                geometry = THREE.SphereGeometry(effectiveSize / 2.0, 32, 16)
            }
        }

        val material = THREE.MeshStandardMaterial(jsObject {
            this.color = THREE.Color(this@ShapeNode.color)
            this.roughness = 0.6
            this.metalness = 0.2
        })

        return THREE.Mesh(geometry, material)
    }

    /**
     * Creates a [CSS3DObject] containing an HTML div element to serve as a text label for the shape.
     * The label text is taken from `data.label`.
     * @return The created [CSS3DObject] for the label.
     */
    private fun _createLabel(): CSS3DObject {
        val div = document.createElement("div") as HTMLDivElement
        div.className = "node-label-3d"
        div.textContent = data.label
        div.dataset["nodeId"] = this.id
        // Basic styling, can be enhanced via CSS class ".node-label-3d"
        div.style.color = data.custom?.labelColor?.unsafeCast<String>() ?: "white"
        div.style.backgroundColor = data.custom?.labelBackgroundColor?.unsafeCast<String>() ?: "rgba(0,0,0,0.65)"
        div.style.padding = "4px 8px"
        div.style.borderRadius = "4px"
        div.style.fontSize = "14px"
        div.style.pointerEvents = "none" // Label should not interfere with interactions on the main shape
        div.style.textAlign = "center"

        val cssLabel = CSS3DObject(div)
        cssLabel.userData = jsObject { this.nodeId = this@ShapeNode.id; this.type = "shape-label" }
        // Initial positioning of the label is handled in the update() method.
        return cssLabel
    }

    /**
     * Updates the node. For [ShapeNode], this involves repositioning and billboarding the text label ([labelObject])
     * relative to the shape's current position and the camera.
     * The mesh ([threeJsObject]) position is managed by [BaseNode.setPosition].
     */
    actual override fun update() {
        labelObject?.let { lbl ->
            val camera = spaceGraphInstance?._camera
            // Position label above the node's bounding sphere
            val offsetDistance = getBoundingSphereRadius() * 1.1 + 15 // Adjust offset as needed
            lbl.position.copy(this.position.toThreeVector()) // Start from node's current world position
            lbl.position.y += offsetDistance // Offset in Y-axis (world space or local, depending on setup)

            if (camera != null) { // Billboard the label to face the camera
                lbl.quaternion.copy(camera.quaternion)
            }
        }
    }

    /**
     * Disposes of the ShapeNode's resources, including its mesh geometry, material, and label.
     */
    actual override fun dispose() {
        // super.dispose() already handles mesh (as threeJsObject) geometry, material, and removal.
        // It also handles removal of labelObject from its parent scene.
        // We only need to ensure the HTML element of the CSS3D label is also cleaned up if necessary.
        labelObject?.element?.remove() // Explicitly remove the HTML element of the label from DOM
        super.dispose()
    }

    /**
     * Calculates the bounding sphere radius for the shape.
     * Essential for layout engine spacing and camera focusing logic.
     * @return The radius based on the current [shape] and [size].
     */
    actual override fun getBoundingSphereRadius(): Double {
        val s = max(0.0, this.size)
        return when (this.shape.lowercase()) {
            "box" -> sqrt(3.0 * (s / 2.0) * (s / 2.0)) // Half-diagonal of the box
            "sphere" -> s / 2.0 // Radius of the sphere
            else -> s / 2.0 // Default for unknown shapes
        }
    }

    /**
     * Sets the visual style for selection. For [ShapeNode], this typically involves
     * making the material emissive or changing its color.
     * Also toggles a "selected" class on the label's HTML element.
     * @param selected True if the node is selected, false otherwise.
     */
    actual override fun setSelectedStyle(selected: Boolean) {
        // super.setSelectedStyle(selected) // Calls the BaseNode's emissive logic
        // Or, be more specific if BaseNode's version is too generic:
        val material = this.mesh.material.unsafeCast<THREE.MeshStandardMaterial>()
        if (selected) {
            material.emissive = THREE.Color(0x999900) // A slightly different emissive for ShapeNode
        } else {
            material.emissive = THREE.Color(0x000000)
        }
        material.needsUpdate = true

        labelObject?.element?.classList?.toggle("selected", selected)
    }

    /**
     * Changes the shape and optionally the size of this [ShapeNode].
     * Disposes the old geometry and creates a new one. Triggers a layout kick.
     * Updates `this.shape`, `this.size`, and corresponding fields in `this.data`.
     * @param newShape The new shape type string (e.g., "box", "sphere").
     * @param newSize Optional new size for the shape. If null, current size is maintained.
     */
    actual fun setShape(newShape: String, newSize: Double?) {
        this.shape = newShape
        newSize?.let { this.size = it }

        // Update NodeData to reflect the change
        this.data.shapeType = this.shape
        this.data.shapeSize = this.size

        // Dispose old geometry and assign new one to the existing mesh
        this.mesh.geometry.dispose() // Dispose the old geometry
        this.mesh.geometry = _createMesh().geometry // Create new geometry based on current this.shape, this.size
        // Note: _createMesh() uses current instance properties.

        spaceGraphInstance?.layoutEngine?.kick() // Notify layout engine of potential size change
    }

    /**
     * Changes the color of this [ShapeNode].
     * Updates `this.color` and `this.data.shapeColor`.
     * @param newColor The new color as a hex integer.
     */
    actual fun setColor(newColor: Int) {
        this.color = newColor
        this.data.shapeColor = newColor // Update NodeData
        this.mesh.material.unsafeCast<THREE.MeshStandardMaterial>().color.setHex(newColor)
    }
}

// Helper for jsObject if not in a common file yet
private fun jsObject(init: dynamic.() -> Unit): dynamic {
    val o = js("{}")
    init(o)
    return o
}
