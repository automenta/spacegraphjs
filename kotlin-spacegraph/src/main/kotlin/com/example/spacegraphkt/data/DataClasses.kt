package com.example.spacegraphkt.data

import com.example.spacegraphkt.external.THREE
import com.example.spacegraphkt.external.generateId // Assuming generateId is moved or accessible
import org.w3c.dom.HTMLElement // For UiElements

/**
 * Represents a 3D vector or point.
 * @property x The x-coordinate.
 * @property y The y-coordinate.
 * @property z The z-coordinate.
 */
data class Vector3D(var x: Double, var y: Double, var z: Double) {
    /**
     * Converts this [Vector3D] to a THREE.js [THREE.Vector3] instance.
     * @return A new [THREE.Vector3] instance.
     */
    fun toThreeVector(): THREE.Vector3 = THREE.Vector3(x, y, z)

    /**
     * Sets the coordinates of this vector.
     * @param x The new x-coordinate.
     * @param y The new y-coordinate.
     * @param z The new z-coordinate.
     */
    fun set(x: Double, y: Double, z: Double) {
        this.x = x
        this.y = y
        this.z = z
    }

    /**
     * Copies the coordinates from another [Vector3D] into this vector.
     * @param v The vector to copy from.
     * @return This [Vector3D] instance.
     */
    fun copy(v: Vector3D): Vector3D {
        this.x = v.x
        this.y = v.y
        this.z = v.z
        return this
    }

    /**
     * Calculates the Euclidean distance to another [Vector3D].
     * @param other The other vector.
     * @return The distance between this vector and the other vector.
     */
    fun distanceTo(other: Vector3D): Double {
        val dx = x - other.x
        val dy = y - other.y
        val dz = z - other.z
        return kotlin.math.sqrt(dx * dx + dy * dy + dz * dz)
    }

    companion object {
        /**
         * Creates a [Vector3D] from a THREE.js [THREE.Vector3] instance.
         * @param tv The THREE.js vector.
         * @return A new [Vector3D] instance.
         */
        fun fromThreeVector(tv: THREE.Vector3) = Vector3D(tv.x, tv.y, tv.z)
    }
}

/**
 * Represents a 2D size.
 * @property width The width value.
 * @property height The height value.
 */
data class Size(var width: Double, var height: Double)

/**
 * Unified data structure for representing node properties and configuration.
 *
 * @property id The unique identifier of the node.
 * @property label The primary text label displayed for the node.
 * @property type The type of the node, determining its behavior and appearance (e.g., "note", "html", "shape").
 * @property content Optional content for HTML or Note nodes (can be HTML string or plain text).
 * @property width Optional width for HTML-based nodes.
 * @property height Optional height for HTML-based nodes.
 * @property contentScale Optional scaling factor for the content within an HTML-based node.
 * @property backgroundColor Optional background color (CSS string) for HTML-based nodes.
 * @property editable Optional flag indicating if the node's content (e.g., NoteNode) is editable by the user.
 * @property billboard Optional flag for HTML-based nodes indicating if they should always face the camera.
 * @property shapeType Optional type of shape for ShapeNodes (e.g., "sphere", "box").
 * @property shapeSize Optional size parameter for ShapeNodes (e.g., diameter for sphere, side length for box).
 * @property shapeColor Optional color (hex integer) for ShapeNodes.
 * @property mass The mass of the node, used in physics calculations by the layout engine.
 * @property custom A dynamic property bag for storing any other non-standard or application-specific data related to the node.
 */
data class NodeData(
    val id: String,
    var label: String?,
    var type: String,

    // HTML Specific
    var content: String? = null,
    var width: Double? = null,
    var height: Double? = null,
    var contentScale: Double? = 1.0,
    var backgroundColor: String? = null,
    var editable: Boolean? = false,
    var billboard: Boolean? = true,

    // Shape Specific
    var shapeType: String? = "sphere",
    var shapeSize: Double? = 50.0,
    var shapeColor: Int? = 0xffffff,

    // Common
    var mass: Double = 1.0,
    var custom: dynamic = js("({})")
)

/**
 * Represents the data and styling properties for an edge connecting two nodes.
 *
 * @property id The unique identifier of the edge.
 * @property label An optional text label to display near the edge.
 * @property color The color of the edge line (hex integer, e.g., 0x00d0ff).
 * @property thickness The thickness of the edge line.
 * @property style The visual style of the edge line (e.g., "solid"). Future versions might support "dashed".
 * @property constraintType The type of physics constraint this edge imposes in the layout engine (e.g., "elastic", "rigid", "weld").
 * @property constraintParams Parameters specific to the chosen [constraintType]. See [EdgeConstraintParams].
 * @property custom A dynamic property bag for storing any other non-standard or application-specific data related to the edge.
 */
data class EdgeData(
    val id: String,
    var label: String? = null,
    var color: Int = 0x00d0ff,
    var thickness: Double = 1.5,
    var style: String = "solid",
    var constraintType: String = "elastic",
    var constraintParams: EdgeConstraintParams = ElasticParams(),
    var custom: dynamic = js("({})")
)

/**
 * Sealed class representing parameters for different types of edge constraints in the force layout.
 */
sealed class EdgeConstraintParams

/**
 * Parameters for an "elastic" edge constraint.
 * The edge behaves like a spring.
 * @property stiffness The stiffness of the spring. Higher values mean a stronger pull towards the ideal length.
 * @property idealLength The resting length of the spring.
 */
data class ElasticParams(var stiffness: Double = 0.001, var idealLength: Double = 200.0) : EdgeConstraintParams()

/**
 * Parameters for a "rigid" edge constraint.
 * The edge tries to maintain a fixed distance.
 * @property distance The target distance to maintain. If null, might be initialized from current node distance.
 * @property stiffness The strength of the constraint. Higher values mean a stronger force to maintain the distance.
 */
data class RigidParams(var distance: Double? = null, var stiffness: Double = 0.1) : EdgeConstraintParams()

/**
 * Parameters for a "weld" edge constraint.
 * The edge tries to maintain a distance based on the sum of node radii (nodes touching).
 * @property distance The target distance, typically sum of node radii. If null, might be auto-calculated.
 * @property stiffness The strength of the constraint.
 */
data class WeldParams(var distance: Double? = null, var stiffness: Double = 0.5) : EdgeConstraintParams()


/**
 * Represents a saved state of the camera, used for view history.
 * @property position The camera's position.
 * @property lookAt The point the camera is looking at.
 * @property targetNodeId Optional ID of a node that was the primary target of this camera state.
 */
data class CameraState(
    val position: Vector3D,
    val lookAt: Vector3D,
    val targetNodeId: String? = null
)

/**
 * Configuration settings for the [com.example.spacegraphkt.core.ForceLayout] engine.
 *
 * @property repulsion Strength of the repulsive force between nodes.
 * @property attraction Default attraction force (used for elastic spring stiffness if not overridden).
 * @property idealEdgeLength Default ideal length for edges (used for elastic springs if not overridden).
 * @property centerStrength Strength of the force pulling nodes towards the [gravityCenter].
 * @property damping Factor by which node velocities are multiplied each step, simulating friction.
 * @property minEnergyThreshold Energy level below which the simulation might auto-stop if no recent kicks.
 * @property gravityCenter The point towards which the centerStrength force pulls nodes.
 * @property zSpreadFactor Multiplier for forces and velocities in the Z-axis, affecting depth distribution.
 * @property autoStopDelay Milliseconds to wait after the energy drops below threshold before auto-stopping.
 * @property nodePadding Factor by which node radii are multiplied for repulsion calculations (to create space).
 * @property defaultElasticStiffness Default stiffness for "elastic" edges if not specified in [EdgeData]. Initialized from [attraction] if not set.
 * @property defaultElasticIdealLength Default ideal length for "elastic" edges if not specified in [EdgeData]. Initialized from [idealEdgeLength] if not set.
 * @property defaultRigidStiffness Default stiffness for "rigid" edges if not specified in [EdgeData].
 * @property defaultWeldStiffness Default stiffness for "weld" edges if not specified in [EdgeData].
 */
data class ForceLayoutSettings(
    var repulsion: Double = 3000.0,
    var attraction: Double = 0.001,
    var idealEdgeLength: Double = 200.0,
    var centerStrength: Double = 0.0005,
    var damping: Double = 0.92,
    var minEnergyThreshold: Double = 0.1,
    var gravityCenter: Vector3D = Vector3D(0.0, 0.0, 0.0),
    var zSpreadFactor: Double = 0.15,
    var autoStopDelay: Long = 4000L,
    var nodePadding: Double = 1.2,
    var defaultElasticStiffness: Double = attraction, // Initialize from attraction by default
    var defaultElasticIdealLength: Double = idealEdgeLength, // Initialize from idealEdgeLength by default
    var defaultRigidStiffness: Double = 0.1,
    var defaultWeldStiffness: Double = 0.5
)

/**
 * Data class to hold references to optional UI elements that can be passed to SpaceGraph/UIManager.
 * @property contextMenuEl Optional custom HTML element for the context menu.
 * @property confirmDialogEl Optional custom HTML element for the confirmation dialog.
 * @property statusIndicatorEl Optional custom HTML element for the status indicator.
 */
data class UiElements(
    val contextMenuEl: HTMLElement?,
    val confirmDialogEl: HTMLElement?,
    val statusIndicatorEl: HTMLElement?
)

/**
 * Contains mathematical and generation constants and utility functions.
 */
object Constants {
    /** Conversion factor from degrees to radians. */
    const val DEG2RAD = kotlin.math.PI / 180.0
}

// generateId is in external/threejs_interop.kt
// KDoc for it (if it were here):
/**
 * Generates a unique ID string with a given prefix.
 * @param prefix The prefix for the generated ID. Defaults to "id-kt".
 * @return A unique ID string.
 */

// RandomDateProvider is internal and does not require public KDocs.
@Suppress("FunctionName")
private class RandomDateProvider {
    fun random(): Double = kotlin.js.Math.random()
    fun now(): Double = kotlin.js.Date.now()
}
