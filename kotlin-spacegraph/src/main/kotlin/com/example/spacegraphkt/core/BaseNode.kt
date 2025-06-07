package com.example.spacegraphkt.core

import com.example.spacegraphkt.data.NodeData
import com.example.spacegraphkt.data.Vector3D
import com.example.spacegraphkt.external.CSS3DObject
import com.example.spacegraphkt.external.THREE
import com.example.spacegraphkt.external.generateId

/**
 * Abstract base class for all nodes in the SpaceGraph.
 * It provides common properties like ID, position, data, and mass,
 * as well as base implementations for node behaviors.
 *
 * @property id Unique identifier for the node. Auto-generated if not provided.
 * @property position Current 3D position of the node. See [Vector3D].
 * @property data Data object associated with the node, containing properties like label, type, and custom attributes. See [NodeData].
 * @property mass Mass of the node, used by the [ForceLayout] engine for physics calculations.
 * @property spaceGraphInstance A reference to the [SpaceGraph] instance this node belongs to. Null if not added to a graph.
 * @property threeJsObject The primary Three.js object representing this node in the WebGL scene (e.g., a [THREE.Mesh] for [ShapeNode])
 *                         or CSS scene (e.g., a [CSS3DObject] for [HtmlNodeElement]). This is a dynamic type.
 * @property labelObject An optional [CSS3DObject] used for displaying text labels, typically for [ShapeNode]s or complex HTML nodes.
 */
actual abstract class BaseNode actual constructor(
    actual open var id: String,
    actual open var position: Vector3D,
    actual open var data: NodeData,
    actual open var mass: Double
) {
    actual var spaceGraphInstance: SpaceGraph? = null
    actual open var threeJsObject: dynamic = null
    actual open var labelObject: CSS3DObject? = null

    init {
        if (id.isBlank()) {
            this.id = generateId("node-kt-") // Ensure ID is generated if blank
        }
        // Ensure the data object also has the final, potentially generated, ID.
        this.data = this.data.copy(id = this.id)
    }

    /**
     * Sets the 3D position of the node.
     * Also updates the position of the associated [threeJsObject] and [labelObject] if they exist.
     * @param x The new x-coordinate.
     * @param y The new y-coordinate.
     * @param z The new z-coordinate.
     */
    actual open fun setPosition(x: Double, y: Double, z: Double) {
        this.position.set(x, y, z)
        threeJsObject?.position?.set(x,y,z) // Update Three.js object's position
        // Basic label positioning, subclasses might provide more sophisticated offset logic in update()
        labelObject?.position?.set(x,y,z)
    }

    /**
     * Abstract method to be implemented by subclasses for updating the node's state or appearance each frame.
     * This is often used for tasks like billboarding labels to face the camera.
     */
    actual abstract fun update()

    /**
     * Disposes of the node and its associated resources, removing them from the scene.
     * This includes disposing Three.js geometries, materials, and removing objects from their parents.
     */
    actual open fun dispose() {
        threeJsObject?.let { obj ->
            obj.parent?.remove(obj) // Remove from scene
            // If it's a Mesh, dispose geometry and material
            if (obj is THREE.Mesh) {
                obj.geometry?.dispose()
                obj.material?.dispose()
            }
            // If CSS3DObject, its element might need manual removal if not handled by parent's remove.
            // However, CSS3DObject.element is typically managed by its own lifecycle or UIManager.
        }
        labelObject?.let { lbl ->
            lbl.parent?.remove(lbl)
            // (lbl.element as? HTMLElement)?.remove() // If labelObject.element needs manual DOM removal
        }
        threeJsObject = null
        labelObject = null
        spaceGraphInstance = null // Clear reference
    }

    /**
     * Gets the bounding sphere radius of the node.
     * Used by layout algorithms for collision detection and spacing.
     * Subclasses should override this to provide an accurate radius based on their specific shape or size.
     * @return The radius of the node's bounding sphere. Defaults to 10.0.
     */
    actual open fun getBoundingSphereRadius(): Double = 10.0

    /**
     * Sets the visual style of the node to indicate selection state.
     * Subclasses should override this to implement specific visual feedback (e.g., highlighting, changing border).
     * @param selected True if the node is selected, false otherwise.
     */
    actual open fun setSelectedStyle(selected: Boolean) {
        // Basic example for ShapeNodes (emissive highlight)
        if (threeJsObject is THREE.Mesh) {
            val material = threeJsObject?.material?.unsafeCast<THREE.MeshStandardMaterial>()
            if (selected) {
                material?.emissive?.setHex(0x888800) // Yellowish emissive highlight
            } else {
                material?.emissive?.setHex(0x000000) // No emission
            }
            material?.needsUpdate = true
        }
        // HTML nodes will typically handle this by adding/removing CSS classes.
    }

    /**
     * Called when a drag operation starts on this node.
     * Typically invoked by the [UIManager]. This implementation fixes the node in the [ForceLayout].
     */
    actual open fun startDrag() {
        spaceGraphInstance?.layoutEngine?.fixNode(this)
        (threeJsObject as? CSS3DObject)?.element?.classList?.add("dragging")
    }

    /**
     * Called during a drag operation with the new proposed position.
     * Updates the node's position.
     * @param newPosition The new [Vector3D] position for the node.
     */
    actual open fun drag(newPosition: Vector3D) {
        setPosition(newPosition.x, newPosition.y, newPosition.z)
    }

    /**
     * Called when a drag operation ends on this node.
     * Typically invoked by the [UIManager]. This implementation releases the node in the [ForceLayout] and triggers a layout kick.
     */
    actual open fun endDrag() {
        spaceGraphInstance?.layoutEngine?.releaseNode(this)
        spaceGraphInstance?.layoutEngine?.kick() // Re-energize layout after manual move
        (threeJsObject as? CSS3DObject)?.element?.classList?.remove("dragging")
    }
}
