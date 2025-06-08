package com.example.spacegraphkt.core

import com.example.spacegraphkt.data.EdgeData
import com.example.spacegraphkt.external.THREE
import com.example.spacegraphkt.external.generateId // Ensure this is accessible
import com.example.spacegraphkt.external.jsObject     // Ensure this is accessible

/**
 * Represents a connection (edge) between two [BaseNode]s in the SpaceGraph.
 * Visually, it's rendered as a line using [THREE.Line].
 *
 * @property id Unique identifier for the edge. Auto-generated if not provided in [data].
 * @property source The source [BaseNode] this edge connects from.
 * @property target The target [BaseNode] this edge connects to.
 * @property data Data object ([EdgeData]) containing properties like label, color, thickness, and constraint parameters.
 * @property spaceGraphInstance A reference to the [SpaceGraph] instance this edge belongs to. Null if not added to a graph.
 * @property threeJsLine The [THREE.Line] instance representing this edge in the Three.js scene.
 */
actual class Edge actual constructor(
    actual val id: String, // Note: Original JS takes id first, then nodes, then data. Kotlin constructor matches.
    actual var source: BaseNode,
    actual var target: BaseNode,
    actual var data: EdgeData
) {
    actual var spaceGraphInstance: SpaceGraph? = null
    actual val threeJsLine: THREE.Line

    private var originalColor: Int
    private var originalOpacity: Double = 0.6 // Default opacity, can be adjusted by data if needed

    init {
        // If ID in data is blank or different, prioritize constructor ID, but ensure data.id is consistent.
        this.data = this.data.copy(id = if (this.id.isBlank()) generateId("edge-kt-") else this.id)

        this.originalColor = this.data.color
        // this.originalOpacity = this.data.custom?.opacity as? Double ?: 0.6 // Example if opacity is in custom data

        val material = THREE.LineBasicMaterial(jsObject {
            this.color = THREE.Color(this@Edge.data.color)
            this.linewidth = this@Edge.data.thickness // Note: linewidth in LineBasicMaterial has limitations.
            this.transparent = true
            this.opacity = this@Edge.originalOpacity
            this.depthTest = false // Often true for edges to prevent z-fighting or being hidden by nodes.
        })

        val points = arrayOf(
            source.position.toThreeVector(),
            target.position.toThreeVector()
        )
        val geometry = THREE.BufferGeometry().setFromPoints(points)

        threeJsLine = THREE.Line(geometry, material)
        threeJsLine.renderOrder = data.custom?.renderOrder as? Int ?: -1 // Render edges typically behind nodes.
        threeJsLine.userData = jsObject { this.edgeId = this@Edge.id }
    }

    /**
     * Updates the edge's visual representation (the [THREE.Line]) based on the current positions
     * of its source and target nodes.
     * Called each frame by the [SpaceGraph] animation loop.
     */
    actual fun update() {
        if (!threeJsLine.visible && threeJsLine.parent == null) return // Don't update if not visible or not in scene

        val positions = threeJsLine.geometry.attributes["position"] as? THREE.BufferAttribute
        if (positions == null) {
            console.error("Edge ${this.id}: BufferAttribute 'position' not found.")
            return
        }

        val sourcePos = source.position
        val targetPos = target.position

        positions.setXYZ(0, sourcePos.x, sourcePos.y, sourcePos.z)
        positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z)
        positions.needsUpdate = true // Important to tell Three.js to update the buffer
        threeJsLine.geometry.computeBoundingSphere() // Useful for raycasting if edges become interactive
    }

    /**
     * Sets the highlight state of the edge.
     * When highlighted, the edge typically becomes more opaque and changes color (e.g., to cyan).
     * @param highlight True to highlight the edge, false to return to its original appearance.
     */
    actual fun setHighlight(highlight: Boolean) {
        val material = threeJsLine.material.unsafeCast<THREE.LineBasicMaterial>()
        if (highlight) {
            material.opacity = 1.0
            material.color.setHex(0x00ffff) // Highlight color (cyan)
        } else {
            material.opacity = originalOpacity
            material.color.setHex(this.originalColor)
        }
        // material.needsUpdate = true; // Not always needed for LineBasicMaterial color/opacity, but good practice.
    }

    /**
     * Disposes of the edge's resources, including its Three.js geometry and material.
     * Removes the edge's [threeJsLine] from the scene.
     */
    actual fun dispose() {
        threeJsLine.geometry.dispose()
        threeJsLine.material.dispose()
        threeJsLine.parent?.remove(threeJsLine) // Remove from scene graph
        spaceGraphInstance = null
        // source and target nodes are not owned by the Edge, so they are not disposed here.
    }

    /**
     * Updates the edge's data and visual properties.
     * This can be used to change color, thickness, label, or constraint parameters dynamically.
     * @param newData The new [EdgeData] to apply. The ID will be preserved.
     */
    actual fun updateData(newData: EdgeData) {
        this.data = newData.copy(id = this.id) // Ensure ID remains unchanged
        this.originalColor = this.data.color // Update original color if it changed

        val material = threeJsLine.material.unsafeCast<THREE.LineBasicMaterial>()
        material.color.setHex(this.data.color)
        material.linewidth = this.data.thickness
        // For style changes (e.g. dashed), material might need to be recreated or LineDashedMaterial used.
        // this.originalOpacity = this.data.custom?.opacity as? Double ?: this.originalOpacity
        // material.opacity = if (this.spaceGraphInstance?.selectedEdge == this) 1.0 else this.originalOpacity

        // If constraint parameters changed, the layout engine might need to be notified
        spaceGraphInstance?.layoutEngine?.kick() // Or a more specific update to the layout engine for this edge
    }
}
