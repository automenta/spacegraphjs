package com.example.spacegraphkt.core

import com.example.spacegraphkt.data.CameraState
import com.example.spacegraphkt.data.Vector3D
import com.example.spacegraphkt.external.THREE
import com.example.spacegraphkt.external.gsap // For GSAP animations
import com.example.spacegraphkt.external.jsObject // For creating JS objects for GSAP
import com.example.spacegraphkt.external.DEG2RAD_KT // Degree to Radian conversion constant
import kotlinx.browser.window
import org.w3c.dom.HTMLElement
import org.w3c.dom.events.MouseEvent // For pan events (could be PointerEvent)
import org.w3c.dom.events.WheelEvent // For zoom events
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.tan

/**
 * Clamps a [value] between a [minVal] and [maxVal].
 * @return The clamped value.
 */
internal fun clamp(value: Double, minVal: Double, maxVal: Double): Double {
    return max(minVal, min(maxVal, value))
}

/**
 * Manages the Three.js camera, providing functionalities like panning, zooming,
 * smooth movement to targets, and view history.
 *
 * @param camera The [THREE.PerspectiveCamera] instance to control.
 * @param domElement The HTML element to which event listeners for pan/zoom are attached (typically the canvas or graph container).
 *
 * @property isPanning True if a pan operation is currently active.
 * @property targetPosition The desired target position for the camera. Camera smoothly interpolates towards this.
 * @property targetLookAt The desired point in 3D space for the camera to look at. Camera smoothly interpolates its look-at direction.
 * @property viewHistory A list of saved [CameraState]s, enabling "back" navigation.
 * @property currentTargetNodeId Optional ID of the node the camera is currently focused on or moving towards.
 * @property initialState The initial [CameraState] (position and lookAt) saved when [setInitialState] is first called. Used for [resetView].
 */
actual class CameraController actual constructor(
    actual val camera: THREE.PerspectiveCamera,
    actual val domElement: HTMLElement
) {
    actual var isPanning: Boolean = false
    private val panStart: THREE.Vector2 = THREE.Vector2() // Stores mouse position at pan start

    actual val targetPosition: THREE.Vector3 = camera.position.clone() // Target camera position for smooth damping
    actual val targetLookAt: THREE.Vector3 = THREE.Vector3(0.0, 0.0, 0.0) // Target look-at point
    private val currentLookAt: THREE.Vector3 = targetLookAt.clone() // Current actual look-at point after damping

    // Configuration for camera controls
    private val zoomSpeed: Double = 0.0015
    private val panSpeed: Double = 0.8
    private val minZoomDist: Double = 20.0  // Minimum distance from camera to its look-at target
    private val maxZoomDist: Double = 15000.0 // Maximum distance
    private val dampingFactor: Double = 0.12 // Factor for smooth camera movement (lerp)

    private var animationFrameId: Int? = null // ID for the camera's internal animation loop

    actual val viewHistory: MutableList<CameraState> = mutableListOf()
    private val maxHistory: Int = 20 // Max number of states in view history
    actual var currentTargetNodeId: String? = null // ID of the node currently being focused on
    actual var initialState: CameraState? = null // Saved initial camera state for reset

    init {
        this.camera.lookAt(currentLookAt) // Ensure camera initially looks at the correct point
        _updateLoop() // Start the internal loop for smooth camera movements
    }

    /**
     * Saves the current camera's target position and look-at point as the initial state.
     * This state is used by [resetView]. Called once when first needed or explicitly.
     */
    actual fun setInitialState() {
        if (initialState == null) {
            initialState = CameraState(
                position = Vector3D.fromThreeVector(targetPosition.clone()),
                lookAt = Vector3D.fromThreeVector(targetLookAt.clone()),
                targetNodeId = currentTargetNodeId // Capture if a node is targeted initially
            )
        }
    }

    /**
     * Starts a pan operation. Called on pointer/mouse down.
     * Kills any ongoing GSAP animations for camera position and look-at.
     * @param event The [MouseEvent] (or [PointerEvent]) that initiated the pan.
     */
    actual fun startPan(event: MouseEvent) {
        if (event.button.toInt() != 0 || isPanning) return // Only pan with left mouse button
        isPanning = true
        panStart.set(event.clientX.toDouble(), event.clientY.toDouble())
        domElement.classList.add("panning") // Add CSS class for cursor styling
        gsap.killTweensOf(targetPosition) // Stop programmatic movements
        gsap.killTweensOf(targetLookAt)
        currentTargetNodeId = null // Panning clears node focus
    }

    /**
     * Performs panning based on mouse movement. Called on pointer/mouse move if [isPanning] is true.
     * Calculates pan displacement based on mouse delta and current view parameters.
     * @param event The [MouseEvent] (or [PointerEvent]) providing the current mouse position.
     */
    actual fun pan(event: MouseEvent) {
        if (!isPanning) return

        val deltaX = event.clientX - panStart.x
        val deltaY = event.clientY - panStart.y

        val cameraDist = camera.position.distanceTo(currentLookAt) // Distance to the look-at point
        val vFOV = camera.fov.toDouble() * DEG2RAD_KT // Vertical field of view in radians
        val viewHeight = domElement.clientHeight.toDouble().coerceAtLeast(1.0) // Height of the viewport

        // Calculate the visible height in the scene at the distance of the currentLookAt point
        val heightAtLookAt = 2 * tan(vFOV / 2) * max(1.0, cameraDist)

        // Calculate pan amounts proportional to mouse movement and visible height
        val panXAmount = -(deltaX / viewHeight) * heightAtLookAt * panSpeed
        val panYAmount = (deltaY / viewHeight) * heightAtLookAt * panSpeed

        // Get camera's right and up vectors in world space
        val right = THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
        val up = THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
        // Calculate total pan offset vector
        val panOffset = right.multiplyScalar(panXAmount).add(up.multiplyScalar(panYAmount))

        // Apply pan offset to both target camera position and target look-at point
        targetPosition.add(panOffset)
        targetLookAt.add(panOffset)
        panStart.set(event.clientX.toDouble(), event.clientY.toDouble()) // Update pan start for next delta
    }

    /**
     * Ends the current pan operation. Called on pointer/mouse up.
     */
    actual fun endPan() {
        if (isPanning) {
            isPanning = false
            domElement.classList.remove("panning") // Remove panning cursor style
        }
    }

    /**
     * Performs zooming based on mouse wheel events.
     * Adjusts the [targetPosition] of the camera along the direction towards the mouse cursor
     * (projected onto the current look-at plane) or along the camera's view direction as a fallback.
     * Kills any ongoing GSAP animations for camera position and look-at.
     * @param event The [WheelEvent] providing zoom delta.
     */
    actual fun zoom(event: WheelEvent) {
        gsap.killTweensOf(targetPosition) // Stop programmatic movements
        gsap.killTweensOf(targetLookAt)
        currentTargetNodeId = null // Zooming clears node focus

        val delta = -event.deltaY * zoomSpeed // Calculate zoom delta amount
        val currentDist = targetPosition.distanceTo(targetLookAt)
        var newDist = currentDist * (0.95.pow(delta * 12)) // Exponential zoom factor
        newDist = clamp(newDist, minZoomDist, maxZoomDist) // Clamp within min/max zoom distance

        val zoomFactorAmount = newDist - currentDist // The actual change in distance

        // Determine direction for zooming: towards mouse cursor on the look-at plane
        val mouseWorldPos = _getLookAtPlaneIntersection(event.clientX.toDouble(), event.clientY.toDouble())
        val direction = THREE.Vector3()

        if (mouseWorldPos != null) { // If mouse projection is successful
            direction.copy(mouseWorldPos).sub(targetPosition).normalize() // Zoom towards mouse
        } else { // Fallback: zoom along camera's current view direction
            camera.getWorldDirection(direction)
        }
        targetPosition.addScaledVector(direction, zoomFactorAmount) // Apply zoom to target position
    }

    /**
     * Calculates the intersection point of a ray cast from screen coordinates with the current camera's look-at plane.
     * This point is used as the focal point for mouse-directed zoom operations.
     * @param screenX The x-coordinate on the screen.
     * @param screenY The y-coordinate on the screen.
     * @return A [THREE.Vector3] representing the intersection point in world space, or null if no intersection.
     * @internal
     */
    actual fun _getLookAtPlaneIntersection(screenX: Double, screenY: Double): THREE.Vector3? {
        val vecNDC = THREE.Vector2( // Convert screen coords to Normalized Device Coordinates
            (screenX / window.innerWidth.toDouble()) * 2 - 1,
            -(screenY / window.innerHeight.toDouble()) * 2 + 1
        )
        val raycaster = THREE.Raycaster()
        raycaster.setFromCamera(vecNDC, camera) // Set raycaster from camera and NDCs

        val camDir = THREE.Vector3()
        camera.getWorldDirection(camDir) // Get camera's current look direction

        // Create a plane at the targetLookAt point, with its normal opposite to camera's view direction
        val planeNormal = camDir.clone().negate()
        val plane = THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, targetLookAt)

        val intersectPoint = THREE.Vector3() // To store the intersection result
        return if (raycaster.ray.intersectPlane(plane, intersectPoint) != null) {
            intersectPoint
        } else {
            null // No intersection
        }
    }

    /**
     * Smoothly moves the camera to a specified target position and look-at point using GSAP animation.
     * Ensures [initialState] is set before the first programmed move.
     * @param x Target x-coordinate for the camera.
     * @param y Target y-coordinate for the camera.
     * @param z Target z-coordinate for the camera.
     * @param duration Duration of the animation in seconds.
     * @param lookAt Optional [Vector3D] target for the camera to look at. If null, looks at `(x, y, 0)`.
     */
    actual fun moveTo(x: Double, y: Double, z: Double, duration: Double, lookAt: Vector3D?) {
        setInitialState() // Ensure initial state is captured if this is the first move

        val targetPosVec = THREE.Vector3(x, y, z)
        val targetLookVec = lookAt?.toThreeVector() ?: THREE.Vector3(x, y, 0.0) // Default lookAt if null

        gsap.killTweensOf(targetPosition) // Kill existing tweens for targetPosition
        gsap.killTweensOf(targetLookAt)   // Kill existing tweens for targetLookAt

        // Animate targetPosition
        gsap.to(targetPosition, jsObject {
            this.x = targetPosVec.x; this.y = targetPosVec.y; this.z = targetPosVec.z
            this.duration = duration
            this.ease = "power3.out" // GSAP easing function
            this.overwrite = true    // Overwrite any conflicting tweens
        })
        // Animate targetLookAt
        gsap.to(targetLookAt, jsObject {
            this.x = targetLookVec.x; this.y = targetLookVec.y; this.z = targetLookVec.z
            this.duration = duration
            this.ease = "power3.out"
            this.overwrite = true
        })
    }

    /**
     * Resets the camera to its saved [initialState] or a default view.
     * Clears view history and current target node ID.
     * @param duration Duration of the animation in seconds.
     */
    actual fun resetView(duration: Double) {
        initialState?.let { // If initial state is saved
            moveTo(it.position.x, it.position.y, it.position.z, duration, it.lookAt)
        } ?: moveTo(0.0, 0.0, 700.0, duration, Vector3D(0.0,0.0,0.0)) // Default initial view

        viewHistory.clear()
        currentTargetNodeId = null
    }

    /**
     * Pushes the current camera's target state ([targetPosition], [targetLookAt], [currentTargetNodeId])
     * onto the [viewHistory] stack. Limits history size to [maxHistory].
     */
    actual fun pushState() {
        if (viewHistory.size >= maxHistory) {
            viewHistory.removeAt(0) // Remove oldest state if history is full
        }
        viewHistory.add(
            CameraState(
                Vector3D.fromThreeVector(targetPosition.clone()),
                Vector3D.fromThreeVector(targetLookAt.clone()),
                currentTargetNodeId
            )
        )
    }

    /**
     * Pops a state from the [viewHistory] and moves the camera to it.
     * If history is empty, resets the view using [resetView].
     * @param duration Duration of the animation in seconds.
     */
    actual fun popState(duration: Double) {
        if (viewHistory.isNotEmpty()) {
            val prevState = viewHistory.removeAt(viewHistory.lastIndex) // Get last state
            moveTo(prevState.position.x, prevState.position.y, prevState.position.z, duration, prevState.lookAt)
            currentTargetNodeId = prevState.targetNodeId // Restore targeted node ID
        } else {
            resetView(duration) // Reset if no history
        }
    }

    /** @return The ID of the node currently targeted by camera focus/movement, or null. */
    actual fun getCurrentTargetNodeId(): String? = currentTargetNodeId
    /** Sets the ID of the node currently targeted by camera focus/movement. */
    actual fun setCurrentTargetNodeId(nodeId: String?) {
        this.currentTargetNodeId = nodeId
    }

    /**
     * Internal animation loop for smoothly interpolating the camera's actual position and look-at point
     * towards their respective targets ([targetPosition], [targetLookAt]) using damping.
     * Runs continuously via `requestAnimationFrame`.
     * @internal
     */
    actual fun _updateLoop() {
        val deltaPos = targetPosition.distanceTo(camera.position) // Distance to target position
        val deltaLookAt = targetLookAt.distanceTo(currentLookAt) // Distance to target look-at

        // Only update if there's a significant difference or panning is active
        if (deltaPos > 0.01 || deltaLookAt > 0.01 || isPanning) {
            camera.position.lerp(targetPosition, dampingFactor) // Interpolate camera position
            currentLookAt.lerp(targetLookAt, dampingFactor)     // Interpolate look-at point
            camera.lookAt(currentLookAt)                        // Apply look-at
        } else if (!gsap.isTweening(targetPosition) && !gsap.isTweening(targetLookAt)) {
            // If very close to targets and not animating, snap to final state to avoid tiny drifts
            if (deltaPos > 0 || deltaLookAt > 0) {
                camera.position.copy(targetPosition)
                currentLookAt.copy(targetLookAt)
                camera.lookAt(currentLookAt)
            }
        }
        // Continue the loop
        animationFrameId = window.requestAnimationFrame { _updateLoop() }
    }

    /**
     * Disposes of the CameraController. Cancels its animation frame loop and kills any active GSAP tweens.
     * Clears the view history.
     */
    actual fun dispose() {
        animationFrameId?.let { window.cancelAnimationFrame(it) } // Stop internal loop
        gsap.killTweensOf(targetPosition) // Kill GSAP animations
        gsap.killTweensOf(targetLookAt)
        viewHistory.clear()
        console.log("CameraController disposed.")
    }
}
