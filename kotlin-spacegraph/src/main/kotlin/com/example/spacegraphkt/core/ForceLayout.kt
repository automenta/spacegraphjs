package com.example.spacegraphkt.core

import com.example.spacegraphkt.data.ForceLayoutSettings
import com.example.spacegraphkt.data.RigidParams
import com.example.spacegraphkt.data.Vector3D
import com.example.spacegraphkt.data.WeldParams
import com.example.spacegraphkt.data.ElasticParams
// import com.example.spacegraphkt.external.THREE // Only if THREE.Vector3 is used directly
import kotlinx.browser.window
import kotlin.collections.MutableMap
import kotlin.collections.MutableSet
import kotlin.collections.List
import kotlin.collections.ArrayList
import kotlin.collections.HashMap
import kotlin.collections.HashSet
import kotlin.math.sqrt

/**
 * Implements a force-directed layout algorithm to position nodes in the graph.
 * It simulates physical forces: repulsion between all nodes, attraction along edges (springs),
 * and a centering force pulling nodes towards a gravitational center.
 *
 * @param spaceGraph The [SpaceGraph] instance this layout engine belongs to.
 * @param config Optional [ForceLayoutSettings] to customize the layout behavior. Uses defaults if null.
 *
 * @property nodes List of [BaseNode]s currently managed by the layout engine.
 * @property edges List of [Edge]s currently managed by the layout engine, used for spring forces.
 * @property velocities A map storing the current velocity [Vector3D] for each node, keyed by node ID.
 * @property fixedNodes A set of [BaseNode]s whose positions are fixed and not affected by layout forces.
 * @property isRunning True if the layout simulation is currently active.
 * @property settings The [ForceLayoutSettings] currently in use by the engine.
 */
actual class ForceLayout actual constructor(
    actual val spaceGraph: SpaceGraph,
    config: ForceLayoutSettings?
) {
    actual val nodes: MutableList<BaseNode> = ArrayList()
    actual val edges: MutableList<Edge> = ArrayList()
    actual val velocities: MutableMap<String, Vector3D> = HashMap()
    actual val fixedNodes: MutableSet<BaseNode> = HashSet()

    actual var isRunning: Boolean = false
    private var animationFrameId: Int? = null // ID for the requestAnimationFrame loop
    private var energy: Double = Double.POSITIVE_INFINITY // Current system energy, used for auto-stop
    private var lastKickTime: Double = 0.0 // Timestamp of the last kick, for auto-stop logic
    private var autoStopTimeout: Int? = null // Timeout ID for auto-stopping the simulation

    actual val settings: ForceLayoutSettings = config ?: ForceLayoutSettings()

    init {
        // Ensure default elastic stiffness and ideal length in settings are correctly initialized
        // if they were at their data class defaults but attraction/idealEdgeLength were different.
        if (this.settings.defaultElasticStiffness == 0.001 && this.settings.attraction != 0.001) {
            this.settings.defaultElasticStiffness = this.settings.attraction
        }
        if (this.settings.defaultElasticIdealLength == 200.0 && this.settings.idealEdgeLength != 200.0) {
            this.settings.defaultElasticIdealLength = this.settings.idealEdgeLength
        }
    }

    /**
     * Adds a node to the layout simulation.
     * Initializes its velocity if not already present. Kicks the simulation.
     * @param node The [BaseNode] to add.
     */
    actual fun addNode(node: BaseNode) {
        if (nodes.find { it.id == node.id } == null) { // Avoid duplicates
            nodes.add(node)
            velocities[node.id] = Vector3D(0.0, 0.0, 0.0) // Initialize velocity
            kick()
        }
    }

    /**
     * Removes a node from the layout simulation.
     * Also removes its velocity and releases it if fixed.
     * @param node The [BaseNode] to remove.
     */
    actual fun removeNode(node: BaseNode) {
        nodes.removeAll { it.id == node.id }
        velocities.remove(node.id)
        fixedNodes.remove(node)
        if (nodes.size < 2 && isRunning) { // Stop if too few nodes
            stop()
        } else {
            kick() // Readjust layout
        }
    }

    /**
     * Adds an edge to the layout simulation. Edges typically create spring-like forces.
     * @param edge The [Edge] to add.
     */
    actual fun addEdge(edge: Edge) {
        if (!edges.contains(edge)) { // Avoid duplicates
            edges.add(edge)
            kick()
        }
    }

    /**
     * Removes an edge from the layout simulation.
     * @param edge The [Edge] to remove.
     */
    actual fun removeEdge(edge: Edge) {
        edges.remove(edge)
        kick()
    }

    /**
     * Fixes a node's position, preventing the layout engine from moving it.
     * Its velocity is set to zero.
     * @param node The [BaseNode] to fix.
     */
    actual fun fixNode(node: BaseNode) {
        fixedNodes.add(node)
        velocities[node.id]?.set(0.0, 0.0, 0.0) // Stop movement
    }

    /**
     * Releases a previously fixed node, allowing the layout engine to move it again.
     * @param node The [BaseNode] to release.
     */
    actual fun releaseNode(node: BaseNode) {
        fixedNodes.remove(node)
        // No need to kick here usually, natural forces will take over or user will move it.
    }

    /**
     * Runs the layout simulation for a fixed number of steps or until energy is low.
     * Useful for initial stabilization after loading a graph.
     * @param steps The maximum number of simulation steps to run.
     */
    fun runOnce(steps: Int = 100) {
        console.log("ForceLayout: Running $steps initial stabilization steps...")
        var i = 0
        for (s_i in 0 until steps) {
            i = s_i
            if (_calculateStep() < settings.minEnergyThreshold) break // Stop if system is stable
        }
        console.log("ForceLayout: Initial steps completed after $i iterations.")
        spaceGraph._updateNodesAndEdges() // Ensure visual state reflects final positions
        spaceGraph.agentApi?.dispatchGraphEvent("layoutStabilized", jsObject{this.steps = i})
    }

    /**
     * Starts the continuous layout simulation loop using `requestAnimationFrame`.
     * The simulation automatically stops if system energy is low for a certain duration.
     */
    actual fun start() {
        if (isRunning || nodes.size < 2) return // No need to run for less than 2 nodes
        console.log("ForceLayout: Starting simulation.")
        isRunning = true
        lastKickTime = kotlin.js.Date.now()
        spaceGraph.agentApi?.dispatchGraphEvent("layoutStarted", jsObject{})

        fun loop() {
            if (!isRunning) return
            energy = _calculateStep() // Calculate one step of the simulation
            // Auto-stop logic
            if (energy < settings.minEnergyThreshold && (kotlin.js.Date.now() - lastKickTime > settings.autoStopDelay)) {
                stop()
                spaceGraph.agentApi?.dispatchGraphEvent("layoutStopped", jsObject{this.reason="autoStopLowEnergy"; this.energy=energy})
            } else {
                animationFrameId = window.requestAnimationFrame { loop() } // Continue loop
            }
        }
        animationFrameId = window.requestAnimationFrame { loop() }
    }

    /**
     * Stops the layout simulation loop.
     */
    actual fun stop() {
        if (!isRunning) return
        isRunning = false
        animationFrameId?.let { window.cancelAnimationFrame(it) }
        autoStopTimeout?.let { window.clearTimeout(it) }
        animationFrameId = null
        autoStopTimeout = null
        console.log("ForceLayout: Simulation stopped. Energy: ${energy.asDynamic().toFixed(4)}")
        spaceGraph.agentApi?.dispatchGraphEvent("layoutStopped", jsObject{this.reason="manualStop"; this.energy=energy})
    }

    /**
     * "Kicks" the simulation by applying a small random velocity to non-fixed nodes.
     * Useful to escape local energy minima or to re-energize the layout after changes.
     * Restarts the simulation if it was stopped.
     * @param intensity Multiplier for the random kick velocity.
     */
    actual fun kick(intensity: Double) {
        if (nodes.isEmpty()) return
        lastKickTime = kotlin.js.Date.now()
        energy = Double.POSITIVE_INFINITY // Reset energy to prevent immediate auto-stop

        nodes.forEach { node ->
            if (!fixedNodes.contains(node)) {
                // Create a small random velocity vector
                val randomVec = Vector3D(
                    kotlin.js.Math.random() - 0.5,
                    kotlin.js.Math.random() - 0.5,
                    (kotlin.js.Math.random() - 0.5) * settings.zSpreadFactor // Apply Z-spread to kick
                )
                // Normalize the random vector
                val length = sqrt(randomVec.x*randomVec.x + randomVec.y*randomVec.y + randomVec.z*randomVec.z)
                if(length > 1e-6){ // Avoid division by zero if vector is zero
                    val normFactor = 1.0 / length
                    randomVec.x *= normFactor
                    randomVec.y *= normFactor
                    randomVec.z *= normFactor
                }

                val kickStrength = intensity * (1 + kotlin.js.Math.random() * 2) // Randomize kick strength slightly
                velocities[node.id]?.let { vel -> // Add kick to current velocity
                    vel.x += randomVec.x * kickStrength
                    vel.y += randomVec.y * kickStrength
                    vel.z += randomVec.z * kickStrength
                }
            }
        }

        if (!isRunning) start() // Restart simulation if it was stopped

        // Reset auto-stop timer
        autoStopTimeout?.let { window.clearTimeout(it) }
        autoStopTimeout = window.setTimeout({
            if (isRunning && energy < settings.minEnergyThreshold) {
                stop()
                spaceGraph.agentApi?.dispatchGraphEvent("layoutStopped", jsObject{this.reason="autoStopLowEnergyAfterKick"; this.energy=energy})
            }
        }, settings.autoStopDelay.toInt())
        spaceGraph.agentApi?.dispatchGraphEvent("layoutKicked", jsObject{this.intensity = intensity})
    }

    /**
     * Updates the layout engine's settings.
     * Kicks the simulation after applying new settings.
     * @param newSettings The [ForceLayoutSettings] object with new values.
     */
    actual fun setSettings(newSettings: ForceLayoutSettings) {
        // Update individual properties or replace the settings object
        // For a data class, replacing might be simpler if all properties are typically changed.
        // settings = newSettings.copy() // If settings is a val
        settings.repulsion = newSettings.repulsion
        settings.attraction = newSettings.attraction
        settings.idealEdgeLength = newSettings.idealEdgeLength
        settings.centerStrength = newSettings.centerStrength
        settings.damping = newSettings.damping
        settings.minEnergyThreshold = newSettings.minEnergyThreshold
        settings.gravityCenter.copy(newSettings.gravityCenter)
        settings.zSpreadFactor = newSettings.zSpreadFactor
        settings.autoStopDelay = newSettings.autoStopDelay
        settings.nodePadding = newSettings.nodePadding
        settings.defaultElasticStiffness = newSettings.defaultElasticStiffness
        settings.defaultElasticIdealLength = newSettings.defaultElasticIdealLength
        settings.defaultRigidStiffness = newSettings.defaultRigidStiffness
        settings.defaultWeldStiffness = newSettings.defaultWeldStiffness

        console.log("ForceLayout settings updated: $settings")
        kick() // Re-energize simulation with new settings
        spaceGraph.agentApi?.dispatchGraphEvent("layoutSettingsChanged", settingsToJsObject(settings))
    }

    private fun settingsToJsObject(s: ForceLayoutSettings): dynamic {
        return jsObject {
            this.repulsion = s.repulsion; this.attraction = s.attraction; this.idealEdgeLength = s.idealEdgeLength;
            this.centerStrength = s.centerStrength; this.damping = s.damping; this.minEnergyThreshold = s.minEnergyThreshold;
            // ... and so on for all relevant settings
        }
    }

    /**
     * Performs a single step of the force-directed layout calculation.
     * Updates node positions based on calculated forces.
     * @return The total kinetic energy of the system after this step.
     * @internal
     */
    actual fun _calculateStep(): Double {
        if (nodes.size < 2 && edges.isEmpty() && settings.centerStrength <= 0) return 0.0 // No forces if single node and no center gravity

        var totalSystemEnergy = 0.0
        // Initialize forces map for this step
        val forces = HashMap<String, Vector3D>()
        nodes.forEach { node -> forces[node.id] = Vector3D(0.0, 0.0, 0.0) }

        val tempDelta = Vector3D(0.0, 0.0, 0.0) // Reusable vector for delta calculations

        // Repulsion forces (all pairs of nodes)
        for (i in 0 until nodes.size) {
            val nodeA = nodes[i]
            for (j in i + 1 until nodes.size) {
                val nodeB = nodes[j]

                tempDelta.x = nodeB.position.x - nodeA.position.x
                tempDelta.y = nodeB.position.y - nodeA.position.y
                tempDelta.z = nodeB.position.z - nodeA.position.z

                var distSq = tempDelta.x * tempDelta.x + tempDelta.y * tempDelta.y + tempDelta.z * tempDelta.z
                if (distSq < 1e-4) { // Avoid division by zero or extreme forces if nodes are too close
                    distSq = 1e-4
                    // Slightly perturb if nodes are exactly on top of each other to avoid stuck state
                    tempDelta.x = (kotlin.js.Math.random() - 0.5) * 0.01
                    tempDelta.y = (kotlin.js.Math.random() - 0.5) * 0.01
                    tempDelta.z = (kotlin.js.Math.random() - 0.5) * 0.01 * settings.zSpreadFactor
                }
                val dist = sqrt(distSq)

                // Repulsion force magnitude: F_r = k_r / d^2
                var forceMag = -settings.repulsion / distSq

                // Additional repulsion for overlap based on node radii
                val radiusA = nodeA.getBoundingSphereRadius() * settings.nodePadding
                val radiusB = nodeB.getBoundingSphereRadius() * settings.nodePadding
                val combinedRadius = radiusA + radiusB
                val overlap = combinedRadius - dist
                if (overlap > 0) {
                    forceMag -= (settings.repulsion * (overlap * overlap) * 0.01) / dist // Stronger repulsion for overlap
                }

                val normFactor = 1.0 / dist // Normalization factor for delta vector
                val forceVecX = tempDelta.x * normFactor * forceMag
                val forceVecY = tempDelta.y * normFactor * forceMag
                val forceVecZ = tempDelta.z * normFactor * forceMag * settings.zSpreadFactor // Apply Z-spread to repulsion

                // Apply force to nodes if not fixed
                if (!fixedNodes.contains(nodeA)) {
                    forces[nodeA.id]?.let { f -> f.x += forceVecX; f.y += forceVecY; f.z += forceVecZ }
                }
                if (!fixedNodes.contains(nodeB)) {
                    forces[nodeB.id]?.let { f -> f.x -= forceVecX; f.y -= forceVecY; f.z -= forceVecZ }
                }
            }
        }

        // Attraction forces (along edges)
        edges.forEach { edge ->
            val source = edge.source
            val target = edge.target
            // Ensure both nodes are part of the simulation (e.g., not removed mid-step)
            if (velocities[source.id] == null || velocities[target.id] == null) return@forEach

            tempDelta.x = target.position.x - source.position.x
            tempDelta.y = target.position.y - source.position.y
            tempDelta.z = target.position.z - source.position.z

            val distance = sqrt(tempDelta.x*tempDelta.x + tempDelta.y*tempDelta.y + tempDelta.z*tempDelta.z) + 1e-6 // Add epsilon to avoid zero distance
            val normFactor = 1.0 / distance
            var forceMag = 0.0

            val params = edge.data.constraintParams
            when (edge.data.constraintType) {
                "rigid" -> {
                    val rParams = params as? RigidParams ?: RigidParams(stiffness = settings.defaultRigidStiffness)
                    val targetDist = rParams.distance ?: source.position.distanceTo(target.position) // Initialize if null
                    forceMag = rParams.stiffness * (distance - targetDist)
                }
                "weld" -> {
                    val wParams = params as? WeldParams ?: WeldParams(stiffness = settings.defaultWeldStiffness)
                    // Default distance for weld is sum of radii
                    val weldDist = wParams.distance ?: (source.getBoundingSphereRadius() + target.getBoundingSphereRadius())
                    forceMag = wParams.stiffness * (distance - weldDist)
                }
                "elastic" -> { // Default case
                    val eParams = params as? ElasticParams ?: ElasticParams(stiffness = settings.defaultElasticStiffness, idealLength = settings.defaultElasticIdealLength)
                    forceMag = eParams.stiffness * (distance - eParams.idealLength)
                }
                // else -> { /* No other types defined, could default to elastic or log warning */ }
            }

            val forceVecX = tempDelta.x * normFactor * forceMag
            val forceVecY = tempDelta.y * normFactor * forceMag
            val forceVecZ = tempDelta.z * normFactor * forceMag * settings.zSpreadFactor // Apply Z-spread to attraction

            // Apply force to nodes if not fixed
            if (!fixedNodes.contains(source)) {
                forces[source.id]?.let { f -> f.x += forceVecX; f.y += forceVecY; f.z += forceVecZ }
            }
            if (!fixedNodes.contains(target)) {
                forces[target.id]?.let { f -> f.x -= forceVecX; f.y -= forceVecY; f.z -= forceVecZ }
            }
        }

        // Center gravity force
        if (settings.centerStrength > 0) {
            nodes.forEach { node ->
                if (fixedNodes.contains(node)) return@forEach // Don't apply to fixed nodes

                tempDelta.x = settings.gravityCenter.x - node.position.x
                tempDelta.y = settings.gravityCenter.y - node.position.y
                tempDelta.z = settings.gravityCenter.z - node.position.z

                // Weaker Z centering often feels more natural for 2.5D layouts
                val forceVecX = tempDelta.x * settings.centerStrength
                val forceVecY = tempDelta.y * settings.centerStrength
                val forceVecZ = tempDelta.z * settings.centerStrength * settings.zSpreadFactor * 0.5

                forces[node.id]?.let { f -> f.x += forceVecX; f.y += forceVecY; f.z += forceVecZ }
            }
        }

        // Apply forces to update velocities and positions
        nodes.forEach { node ->
            if (fixedNodes.contains(node)) return@forEach // Skip fixed nodes

            val force = forces[node.id] ?: return@forEach // Should always exist if node is in 'nodes' list
            val velocity = velocities[node.id] ?: return@forEach // Should always exist
            val mass = node.mass.coerceAtLeast(0.1) // Ensure mass is not zero or too small

            // Acceleration: a = F/m
            val accelX = force.x / mass
            val accelY = force.y / mass
            val accelZ = force.z / mass

            // Update velocity: v_new = (v_old + a) * damping
            velocity.x = (velocity.x + accelX) * settings.damping
            velocity.y = (velocity.y + accelY) * settings.damping
            velocity.z = (velocity.z + accelZ) * settings.damping

            // Speed limit (max velocity) to prevent nodes from "exploding"
            val speedSq = velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z
            val maxSpeed = 50.0 // Configurable max speed; 50 is from original JS
            if (speedSq > maxSpeed * maxSpeed) {
                val speed = sqrt(speedSq)
                val limitFactor = maxSpeed / speed
                velocity.x *= limitFactor
                velocity.y *= limitFactor
                velocity.z *= limitFactor
            }

            // Update position: p_new = p_old + v_new
            // This directly modifies the shared Node object's position.
            node.position.x += velocity.x
            node.position.y += velocity.y
            node.position.z += velocity.z

            // Accumulate kinetic energy for system stability check (E = 0.5 * m * v^2)
            totalSystemEnergy += 0.5 * mass * (velocity.x*velocity.x + velocity.y*velocity.y + velocity.z*velocity.z)
        }
        return totalSystemEnergy
    }

    /**
     * Disposes of the ForceLayout engine. Stops the simulation.
     * Clears internal collections of nodes, edges, velocities, and fixed nodes.
     */
    actual fun dispose() {
        stop() // Ensure simulation is stopped
        nodes.clear()
        edges.clear()
        velocities.clear()
        fixedNodes.clear()
        // spaceGraph reference is not nulled here as it's passed in constructor, GC will handle.
        console.log("ForceLayout disposed.")
    }
}

// Helper for jsObject if not in a common file
private fun jsObject(builder: dynamic.() -> Unit): dynamic {
    val obj = js("{}")
    builder(obj)
    return obj
}
