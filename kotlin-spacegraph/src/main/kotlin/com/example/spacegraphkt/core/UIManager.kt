package com.example.spacegraphkt.core

import com.example.spacegraphkt.data.*
import com.example.spacegraphkt.external.*
import kotlinx.browser.document
import kotlinx.browser.window
import kotlinx.dom.addClass
import kotlinx.dom.clear
import kotlinx.dom.removeClass
import org.w3c.dom.*
import org.w3c.dom.css.CSSStyleDeclaration
import org.w3c.dom.events.Event
import org.w3c.dom.events.KeyboardEvent
import org.w3c.dom.events.MouseEvent
import org.w3c.dom.events.WheelEvent
import org.w3c.dom.pointerevents.PointerEvent // Using PointerEvent for broader compatibility
import kotlin.math.max

/**
 * Represents the state of pointer (mouse/touch) interactions.
 * @property down True if a pointer button is currently pressed.
 * @property primary True if the primary button (typically left mouse) is pressed.
 * @property secondary True if the secondary button (typically right mouse) is pressed.
 * @property middle True if the middle mouse button is pressed.
 * @property potentialClick True if the current interaction could still be a click (no significant drag).
 * @property lastPos Last recorded pointer position ([Point]).
 * @property startPos Pointer position ([Point]) where the current interaction started.
 */
internal data class PointerState( // KDoc for internal data class
    var down: Boolean = false,
    var primary: Boolean = false,
    var secondary: Boolean = false,
    var middle: Boolean = false,
    var potentialClick: Boolean = true,
    var lastPos: Point = Point(),
    var startPos: Point = Point()
)

/**
 * Represents a 2D point.
 * @property x The x-coordinate.
 * @property y The y-coordinate.
 */
internal data class Point(var x: Double = 0.0, var y: Double = 0.0) // KDoc for internal data class

/**
 * Represents an item in a context menu.
 * @property label The text displayed for the menu item.
 * @property action A string identifier for the action to perform when clicked.
 * @property data A map of custom data attributes to attach to the menu item element.
 * @property type Type of item, e.g., "item" or "separator".
 * @property classNames CSS class names to apply to the menu item element.
 * @property disabled True if the menu item should be disabled.
 */
internal data class MenuItemData( // KDoc for internal data class
    val label: String,
    val action: String,
    val data: Map<String, String> = emptyMap(),
    val type: String = "item",
    val classNames: String = "",
    val disabled: Boolean = false
)

/**
 * Manages all user interface interactions for the SpaceGraph, including
 * pointer events (dragging, clicking, resizing), context menus, dialogs,
 * keyboard shortcuts, and edge linking.
 *
 * @param spaceGraph The [SpaceGraph] instance this UIManager is associated with.
 * @param uiElements Optional [UiElements] configuration providing custom HTML elements for UI components.
 *                   If null, default elements are created.
 *
 * @property container The main HTML container element for the SpaceGraph, used for event listening.
 * @property contextMenuElement The [HTMLDivElement] used for displaying context menus.
 * @property confirmDialogElement The [HTMLDivElement] used for displaying confirmation dialogs.
 * @property statusIndicatorElement The [HTMLDivElement] used for displaying status messages.
 * @property edgeMenuObject A [CSS3DObject] that wraps the HTML element for the edge-specific editing menu. Null if not visible.
 */
actual class UIManager actual constructor(
    actual val spaceGraph: SpaceGraph,
    actual val uiElements: UiElements?
) {
    actual val container: HTMLElement = spaceGraph.containerElement
    actual val contextMenuElement: HTMLDivElement
    actual val confirmDialogElement: HTMLDivElement
    actual val statusIndicatorElement: HTMLDivElement
    actual var edgeMenuObject: CSS3DObject? = null

    // Internal state for managing interactions
    private var draggedNode: BaseNode? = null
    private var resizedNode: HtmlNodeElement? = null
    private var hoveredEdge: Edge? = null
    private var resizeStartPos: Point = Point()
    private var resizeStartSize: Size = Size(0.0, 0.0)
    private var dragOffset: THREE.Vector3 = THREE.Vector3() // Offset from node origin to drag point

    private val pointerState: PointerState = PointerState() // Current pointer interaction state
    private var confirmCallback: (() -> Unit)? = null // Callback for 'Yes' in confirm dialog

    init {
        // Initialize UI elements, creating defaults if not provided
        contextMenuElement = uiElements?.contextMenuEl?.unsafeCast<HTMLDivElement>()
            ?: _createDefaultContextMenuElement()
        confirmDialogElement = uiElements?.confirmDialogEl?.unsafeCast<HTMLDivElement>()
            ?: _createDefaultConfirmDialogElement()
        statusIndicatorElement = uiElements?.statusIndicatorEl?.unsafeCast<HTMLDivElement>()
            ?: _createDefaultStatusIndicatorElement()

        // Ensure elements are in the DOM
        if (!document.body!!.contains(contextMenuElement)) document.body!!.appendChild(contextMenuElement)
        if (!document.body!!.contains(confirmDialogElement)) document.body!!.appendChild(confirmDialogElement)
        if (!document.body!!.contains(statusIndicatorElement)) document.body!!.appendChild(statusIndicatorElement)

        _bindEvents() // Set up all event listeners
    }

    /** Creates and styles a default HTML element for the context menu. @return The created [HTMLDivElement]. @internal */
    private fun _createDefaultContextMenuElement(): HTMLDivElement =
        (document.createElement("div") as HTMLDivElement).apply {
            id = "sg-context-menu"; addClass("context-menu")
            style.apply { position = "absolute"; zIndex = "10000"; display = "none"; backgroundColor = "white"; border = "1px solid #ccc"; boxShadow = "2px 2px 5px rgba(0,0,0,0.2)"; minWidth = "150px"; padding = "5px 0" }
        }

    /** Creates and styles a default HTML element for the confirmation dialog. @return The created [HTMLDivElement]. @internal */
    private fun _createDefaultConfirmDialogElement(): HTMLDivElement =
        (document.createElement("div") as HTMLDivElement).apply {
            id = "sg-confirm-dialog"; addClass("dialog"); style.display = "none"
            innerHTML = """<div style="padding:20px;background:white;border:1px solid #555;box-shadow:3px 3px 8px rgba(0,0,0,0.3);position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10001;">
                <p id="sg-confirm-message" style="margin:0 0 15px;">Are you sure?</p>
                <button id="sg-confirm-yes" style="margin-right:10px;">Yes</button><button id="sg-confirm-no">No</button></div>""".trimIndent()
        }

    /** Creates and styles a default HTML element for status messages. @return The created [HTMLDivElement]. @internal */
     private fun _createDefaultStatusIndicatorElement(): HTMLDivElement =
        (document.createElement("div") as HTMLDivElement).apply {
            id = "sg-status-indicator"; addClass("status-indicator")
            style.apply { position="fixed";bottom="20px";left="50%";transform="translateX(-50%)";padding="10px 20px";backgroundColor="rgba(0,0,0,0.7)";color="white";borderRadius="5px";zIndex="10002";display="none";transition="opacity 0.5s";opacity="0" }
        }

    /** Binds all necessary event listeners for UI interactions. @internal */
    private fun _bindEvents() {
        container.addEventListener("pointerdown", this::_onPointerDown.unsafeCast<(Event) -> Unit>())
        window.addEventListener("pointermove", this::_onPointerMove.unsafeCast<(Event) -> Unit>())
        window.addEventListener("pointerup", this::_onPointerUp.unsafeCast<(Event) -> Unit>())
        container.addEventListener("contextmenu", this::_onContextMenu.unsafeCast<(Event) -> Unit>())
        document.addEventListener("click", this::_onDocumentClick.unsafeCast<(Event) -> Unit>(), true) // Capture phase
        confirmDialogElement.querySelector("#sg-confirm-yes")?.addEventListener("click", { _onConfirmYes() })
        confirmDialogElement.querySelector("#sg-confirm-no")?.addEventListener("click", { _onConfirmNo() })
        window.addEventListener("keydown", this::_onKeyDown.unsafeCast<(Event) -> Unit>())
        container.addEventListener("wheel", this::_onWheel.unsafeCast<(Event) -> Unit>(), jsObject { passive = false }) // Prevent default scroll
        contextMenuElement.addEventListener("click", this::_onContextMenuClick.unsafeCast<(Event)->Unit>())
    }

    /** Updates the internal [pointerState] based on a [PointerEvent]. @param e The event. @param isDown True if pointer is down. @internal */
    private fun _updatePointerState(e: PointerEvent, isDown: Boolean) {
        pointerState.down = isDown
        pointerState.primary = isDown && e.button.toInt() == 0
        pointerState.secondary = isDown && e.button.toInt() == 2
        pointerState.middle = isDown && e.button.toInt() == 1
        if (isDown) {
            pointerState.potentialClick = true
            pointerState.startPos = Point(e.clientX.toDouble(), e.clientY.toDouble())
        }
        pointerState.lastPos = Point(e.clientX.toDouble(), e.clientY.toDouble())
    }

    /** Stores information about the target of a pointer event. @internal */
    private data class TargetInfo(
        val element: HTMLElement?, val nodeHtmlElement: HTMLDivElement?, val resizeHandle: HTMLElement?,
        val nodeControlsButton: HTMLButtonElement?, val contentEditable: HTMLElement?, val interactiveInNode: HTMLElement?,
        val node: BaseNode?, val intersectedEdge: Edge?
    )
    /** Analyzes a [PointerEvent] to determine the UI element or graph object being interacted with. @param event The pointer event. @return [TargetInfo] object. @internal */
    private fun _getTargetInfo(event: PointerEvent): TargetInfo {
        val element = document.elementFromPoint(event.clientX, event.clientY) as? HTMLElement
        val nodeHtmlElement = element?.closest(".node-html") as? HTMLDivElement
        val resizeHandle = element?.closest(".resize-handle") as? HTMLElement
        val nodeControlsButton = element?.closest(".node-controls button") as? HTMLButtonElement
        val contentEditable = element?.closest("[contenteditable='true']") as? HTMLElement
        val interactiveInNode = element?.closest(".node-content button, .node-content input, .node-content a") as? HTMLElement

        var node: BaseNode? = nodeHtmlElement?.dataset?.get("nodeId")?.let { spaceGraph.getNodeById(it) }
        var intersectedEdge: Edge? = null
        var intersectedShapeNode: BaseNode? = null

        val isDirectHtmlInteraction = nodeHtmlElement != null && (resizeHandle != null || nodeControlsButton != null || contentEditable != null || interactiveInNode != null)

        if (!isDirectHtmlInteraction) { // Only raycast if not interacting with specific HTML controls
            val intersected = spaceGraph.intersectedObject(event.clientX.toDouble(), event.clientY.toDouble())
            when (intersected) {
                is Edge -> intersectedEdge = intersected
                is ShapeNode -> { intersectedShapeNode = intersected; if (node == null) node = intersectedShapeNode }
                is BaseNode -> if(node == null) node = intersected
            }
        }
        return TargetInfo(element, nodeHtmlElement, resizeHandle, nodeControlsButton, contentEditable, interactiveInNode, node ?: intersectedShapeNode, intersectedEdge)
    }

    /** Handles "pointerdown" events for initiating drag, resize, selection, or panning. @param e The [PointerEvent]. @internal */
    private fun _onPointerDown(e: PointerEvent) {
        _updatePointerState(e, true)
        val targetInfo = _getTargetInfo(e)

        if (targetInfo.nodeControlsButton != null && targetInfo.node is HtmlNodeElement) { // Click on node control button
            e.preventDefault(); e.stopPropagation()
            _handleNodeControlButtonClick(targetInfo.nodeControlsButton, targetInfo.node as HtmlNodeElement)
            _hideContextMenu(); return
        }
        if (targetInfo.resizeHandle != null && targetInfo.node is HtmlNodeElement) { // Start resize
            e.preventDefault(); e.stopPropagation()
            this.resizedNode = targetInfo.node as HtmlNodeElement; this.resizedNode!!.startResize()
            this.resizeStartPos = Point(e.clientX.toDouble(), e.clientY.toDouble()); this.resizeStartSize = this.resizedNode!!.size.copy()
            container.style.cursor = "nwse-resize"; _hideContextMenu(); return
        }
        if (targetInfo.node != null) { // Interaction with a node
            if (targetInfo.interactiveInNode != null || targetInfo.contentEditable != null) { // Interaction with editable content within node
                e.stopPropagation(); if (spaceGraph.selectedNode != targetInfo.node) spaceGraph.selectedNode = targetInfo.node
                _hideContextMenu() // Hide context menu but allow event to proceed for editing
            } else { // Start dragging the node
                e.preventDefault(); this.draggedNode = targetInfo.node; this.draggedNode!!.startDrag()
                val worldPos = spaceGraph.screenToWorld(e.clientX.toDouble(), e.clientY.toDouble(), this.draggedNode!!.position.z)
                this.dragOffset = worldPos?.toThreeVector()?.sub(this.draggedNode!!.position.toThreeVector()) ?: THREE.Vector3()
                container.style.cursor = "grabbing"; if (spaceGraph.selectedNode != targetInfo.node) spaceGraph.selectedNode = targetInfo.node
                 _hideContextMenu(); return
            }
        } else if (targetInfo.intersectedEdge != null) { // Click on an edge
            e.preventDefault(); spaceGraph.selectedEdge = targetInfo.intersectedEdge
            _hideContextMenu(); return
        } else { // Click on background
            _hideContextMenu()
            // If not a potential click (i.e., starting a drag on background), or if it is a primary button click, start panning.
            if (pointerState.primary) spaceGraph.cameraController.startPan(e.unsafeCast<MouseEvent>())
        }
    }

    /** Handles clicks on internal node control buttons (zoom, resize, delete). @param button The clicked [HTMLButtonElement]. @param node The [HtmlNodeElement] owning the button. @internal */
    private fun _handleNodeControlButtonClick(button: HTMLButtonElement, node: HtmlNodeElement) {
        val actionMap = mapOf<String, () -> Unit>(
            "node-delete" to { _showConfirm("Delete node \"${node.id.take(10)}...\"?") { spaceGraph.removeNode(node.id) } },
            "node-content-zoom-in" to { node.adjustContentScale(1.15) }, "node-content-zoom-out" to { node.adjustContentScale(1 / 1.15) },
            "node-grow" to { node.adjustNodeSize(1.2) }, "node-shrink" to { node.adjustNodeSize(0.8) }
        )
        button.classList.forEach { cls -> actionMap[cls]?.invoke()?.let { return } } // Invoke first matching action
    }

    /** Handles "pointermove" events for dragging, resizing, linking, panning, or edge hovering. @param e The [PointerEvent]. @internal */
    private fun _onPointerMove(e: PointerEvent) {
        val dx = e.clientX - pointerState.lastPos.x; val dy = e.clientY - pointerState.lastPos.y
        if (dx != 0.0 || dy != 0.0) pointerState.potentialClick = false // Moved, so not a simple click
        pointerState.lastPos = Point(e.clientX.toDouble(), e.clientY.toDouble())

        resizedNode?.let { node -> // If resizing a node
            e.preventDefault(); val newWidth = resizeStartSize.width + dx; val newHeight = resizeStartSize.height + dy // dx/dy relative to start for resize
            node.resize(newWidth, newHeight); return
        }
        draggedNode?.let { node -> // If dragging a node
            e.preventDefault()
            val worldPos = spaceGraph.screenToWorld(e.clientX.toDouble(), e.clientY.toDouble(), node.position.z)
            worldPos?.let { node.drag(Vector3D.fromThreeVector(it.toThreeVector().sub(dragOffset))) }
            return
        }
        if (spaceGraph.isLinking) { // If in edge linking mode
            e.preventDefault(); _updateTempLinkLine(e.clientX.toDouble(), e.clientY.toDouble())
            val targetInfo = _getTargetInfo(e) // Highlight potential target node
            document.querySelectorAll(".node-html.linking-target").forEach { it.unsafeCast<HTMLElement>().removeClass("linking-target") }
            if (targetInfo.node != null && targetInfo.node != spaceGraph.linkSourceNode && targetInfo.node is HtmlNodeElement) {
                (targetInfo.node as HtmlNodeElement).htmlElement.addClass("linking-target")
            }
            return
        }
        if (pointerState.primary && spaceGraph.cameraController.isPanning) { // If panning camera
             spaceGraph.cameraController.pan(e.unsafeCast<MouseEvent>())
        }
        // Edge Hover effect if nothing else is active
        if (!pointerState.down && resizedNode == null && draggedNode == null && !spaceGraph.isLinking) {
            val targetInfo = _getTargetInfo(e); val currentHoveredEdge = targetInfo.intersectedEdge
            if (hoveredEdge != currentHoveredEdge) {
                hoveredEdge?.takeIf { it != spaceGraph.selectedEdge }?.setHighlight(false) // Unhighlight previous
                hoveredEdge = currentHoveredEdge
                hoveredEdge?.takeIf { it != spaceGraph.selectedEdge }?.setHighlight(true) // Highlight new
            }
        }
    }

    /** Handles "pointerup" events to finalize drag, resize, linking, or selection. @param e The [PointerEvent]. @internal */
    private fun _onPointerUp(e: PointerEvent) {
        container.style.cursor = if (spaceGraph.isLinking) "crosshair" else "grab" // Reset cursor

        resizedNode?.let { it.endResize(); resizedNode = null } // Finalize resize
        draggedNode?.let { it.endDrag(); draggedNode = null } // Finalize drag

        if (spaceGraph.isLinking && e.button.toInt() == 0) { // Complete linking on left click up
            _completeLinking(e)
        } else if (e.button.toInt() == 1 && pointerState.potentialClick) { // Middle mouse click for autoZoom
            val targetInfo = _getTargetInfo(e); targetInfo.node?.let { spaceGraph.autoZoom(it); e.preventDefault() }
        } else if (e.button.toInt() == 0 && pointerState.potentialClick) { // Left mouse click for selection
            val targetInfo = _getTargetInfo(e)
            if (targetInfo.node == null && targetInfo.intersectedEdge == null && !spaceGraph.cameraController.isPanning) {
                // Clicked on background without panning, clear selections
                spaceGraph.selectedNode = null
                spaceGraph.selectedEdge = null
            }
            // If targetInfo.node or .intersectedEdge is not null, selection is handled in _onPointerDown or by specific UI handlers
        }

        spaceGraph.cameraController.endPan() // Finalize panning
        _updatePointerState(e, false) // Reset pointer state
        document.querySelectorAll(".node-html.linking-target").forEach { it.unsafeCast<HTMLElement>().removeClass("linking-target") }
    }

    /** Handles "contextmenu" events (typically right-click) to show context-sensitive menus. @param e The [PointerEvent]. @internal */
    private fun _onContextMenu(e: PointerEvent) {
        e.preventDefault(); _hideContextMenu()
        val targetInfo = _getTargetInfo(e)
        val items: List<MenuItemData> = when {
            targetInfo.node != null -> { spaceGraph.selectedNode = targetInfo.node; _getContextMenuItemsNode(targetInfo.node) }
            targetInfo.intersectedEdge != null -> { spaceGraph.selectedEdge = targetInfo.intersectedEdge; _getContextMenuItemsEdge(targetInfo.intersectedEdge) }
            else -> { // Click on background
                spaceGraph.selectedNode = null; spaceGraph.selectedEdge = null
                val worldPos = spaceGraph.screenToWorld(e.clientX.toDouble(), e.clientY.toDouble(), 0.0)
                _getContextMenuItemsBackground(worldPos)
            }
        }
        if (items.isNotEmpty()) _showContextMenu(e.clientX.toDouble(), e.clientY.toDouble(), items)
    }

    /** Handles document-wide clicks, primarily to hide menus if click is outside them. @param e The [MouseEvent]. @internal */
    private fun _onDocumentClick(e: MouseEvent) { // Use MouseEvent as it's a general click
        if (!contextMenuElement.contains(e.target as? Node)) _hideContextMenu()
        edgeMenuObject?.element?.let { // Check if click is outside the edge menu
            if (!it.contains(e.target as? Node)) {
                 // Synthesize a PointerEvent to use _getTargetInfo for checking if the click was on the selected edge itself
                 val pointerEventInit = PointerEventInit(clientX = e.clientX, clientY = e.clientY, button = e.button.toShort())
                 val currentEvent = PointerEvent("pointerdown", pointerEventInit)
                 val targetInfo = _getTargetInfo(currentEvent)
                 if (spaceGraph.selectedEdge != targetInfo.intersectedEdge) { // If click was not on the selected edge
                    spaceGraph.selectedEdge = null // This will trigger hideEdgeMenu via setter in SpaceGraph
                 }
            }
        }
    }

    /** Generates menu items for a node context menu. @param node The target [BaseNode]. @return List of [MenuItemData]. @internal */
    private fun _getContextMenuItemsNode(node: BaseNode): List<MenuItemData> = mutableListOf<MenuItemData>().apply {
        if (node is HtmlNodeElement && node.data.editable == true) add(MenuItemData("Edit Content 📝", "edit-node", mapOf("nodeId" to node.id)))
        add(MenuItemData("Start Link ✨", "start-link", mapOf("nodeId" to node.id)))
        add(MenuItemData("Auto Zoom / Back 🖱️", "autozoom-node", mapOf("nodeId" to node.id)))
        add(MenuItemData("", "", type = "separator"))
        add(MenuItemData("Delete Node 🗑️", "delete-node", mapOf("nodeId" to node.id), classNames = "delete-action"))
    }

    /** Generates menu items for an edge context menu. @param edge The target [Edge]. @return List of [MenuItemData]. @internal */
    private fun _getContextMenuItemsEdge(edge: Edge): List<MenuItemData> = listOf(
        MenuItemData("Edit Edge Style...", "edit-edge", mapOf("edgeId" to edge.id)), // Placeholder for future
        MenuItemData("Reverse Edge Direction", "reverse-edge", mapOf("edgeId" to edge.id)),
        MenuItemData("", "", type = "separator"),
        MenuItemData("Delete Edge 🗑️", "delete-edge", mapOf("edgeId" to edge.id), classNames = "delete-action")
    )

    /** Generates menu items for the background context menu. @param worldPos Click position in world coords. @return List of [MenuItemData]. @internal */
    private fun _getContextMenuItemsBackground(worldPos: Vector3D?): List<MenuItemData> = mutableListOf<MenuItemData>().apply {
        worldPos?.let { pos ->
            val posStr = JSON.stringify(jsObject { x=pos.x; y=pos.y; z=pos.z }) // Serialize position for data attribute
            add(MenuItemData("Create Note Here 📝", "create-note", mapOf("position" to posStr)))
            add(MenuItemData("Create Box Here 📦", "create-box", mapOf("position" to posStr)))
            add(MenuItemData("Create Sphere Here 🌐", "create-sphere", mapOf("position" to posStr)))
        }
        add(MenuItemData("", "", type = "separator"))
        add(MenuItemData("Center View 🧭", "center-view"))
        add(MenuItemData("Reset Zoom & Pan", "reset-view"))
        val bgLabel = if (spaceGraph.background.alpha == 0.0) "Set Dark Background" else "Set Transparent BG"
        add(MenuItemData(bgLabel, "toggle-background"))
    }

    /** Handles clicks within the context menu. @param event The [MouseEvent] from the context menu. @internal */
    private fun _onContextMenuClick(event: MouseEvent){
        val li = (event.target as? HTMLElement)?.closest("li") as? HTMLLIElement ?: return
        val action = li.dataset["action"] ?: return; _hideContextMenu()
        val data = li.dataset // Access all data attributes

        when(action){ // Perform actions based on 'data-action' attribute
            "edit-node" -> spaceGraph.getNodeById(data["nodeId"]!!)?.let { if (it is HtmlNodeElement && it.data.editable == true) (it.htmlElement.querySelector(".node-content") as? HTMLElement)?.focus() }
            "delete-node" -> _showConfirm("Delete node \"${data["nodeId"]!!.take(10)}...\"?") { spaceGraph.removeNode(data["nodeId"]!!) }
            "delete-edge" -> _showConfirm("Delete edge \"${data["edgeId"]!!.take(10)}...\"?") { spaceGraph.removeEdge(data["edgeId"]!!) }
            "autozoom-node" -> spaceGraph.getNodeById(data["nodeId"]!!)?.let{ spaceGraph.autoZoom(it) }
            "create-note" -> _createNodeFromMenu(data["position"]!!, "note", jsObject{ content="New Note ✨" })
            "create-box" -> _createNodeFromMenu(data["position"]!!, "shape", jsObject{ label="Box"; shapeType="box"; shapeColor= (kotlin.js.Math.random()*0xFFFFFF).toInt() })
            "create-sphere" -> _createNodeFromMenu(data["position"]!!, "shape", jsObject{ label="Sphere"; shapeType="sphere"; shapeColor= (kotlin.js.Math.random()*0xFFFFFF).toInt() })
            "center-view" -> spaceGraph.centerView(null, 0.7)
            "reset-view" -> spaceGraph.cameraController.resetView()
            "start-link" -> spaceGraph.getNodeById(data["nodeId"]!!)?.let{ _startLinking(it) }
            "reverse-edge" -> spaceGraph.getEdgeById(data["edgeId"]!!)?.apply { val temp=source; source=target; target=temp; update(); spaceGraph.layoutEngine.kick() }
            "edit-edge" -> spaceGraph.getEdgeById(data["edgeId"]!!)?.let { spaceGraph.selectedEdge = it } // Select to show edge menu
            "toggle-background" -> spaceGraph.setBackground(if (spaceGraph.background.alpha == 0.0) 0x101018 else 0x000000, if (spaceGraph.background.alpha == 0.0) 1.0 else 0.0)
            else -> console.warn("Unknown context menu action: $action")
        }
    }

    /** Helper to create a node from context menu actions. @param positionData Serialized JSON string of position. @param type Node type string. @param nodeCustomData Dynamic object with type-specific data. @internal */
    private fun _createNodeFromMenu(positionData: String, type: String, nodeCustomData: dynamic) {
        try {
            val posJson = JSON.parse<dynamic>(positionData); val pos = Vector3D(posJson.x as Double, posJson.y as Double, posJson.z as Double)
            val nodeId = generateId("node-kt-") // Generate ID for new node
            // Base NodeData, specific fields will be overridden or added based on type
            val baseData = NodeData(id=nodeId, label=nodeCustomData.label as? String ?: type, type=type, custom=nodeCustomData)
            val finalData = when(type) { // Customize NodeData based on type
                "note" -> baseData.copy(content=nodeCustomData.content as? String ?: "New Note", editable=true, width=200.0, height=100.0)
                "shape" -> baseData.copy(shapeType=nodeCustomData.shapeType as? String ?: "sphere", shapeColor=nodeCustomData.shapeColor as? Int ?: 0xffffff, shapeSize=nodeCustomData.shapeSize as? Double ?: 50.0)
                else -> baseData
            }
            val newNode: BaseNode = when(type) { // Create specific node instance
                "note" -> NoteNode(nodeId, pos, finalData)
                "shape" -> ShapeNode(nodeId, pos, finalData, finalData.shapeType!!, finalData.shapeSize!!, finalData.shapeColor!!)
                else -> BaseNodeImpl(nodeId, pos, finalData) // Fallback, requires a concrete BaseNodeImpl
            }
            spaceGraph.addNode(newNode) // Add to graph
            spaceGraph.layoutEngine.kick(); window.setTimeout({ // Focus and select new node
                spaceGraph.focusOnNode(newNode, 0.6, true); spaceGraph.selectedNode = newNode
                if (newNode is NoteNode) (newNode.htmlElement.querySelector(".node-content") as? HTMLElement)?.focus()
            }, 100)
        } catch (err: dynamic) { console.error("Failed to create node from menu:", err); err.printStackTrace() }
    }
    /** Placeholder for a concrete BaseNode if generic ones are made via menu. @internal */
    private class BaseNodeImpl(id: String, position: Vector3D, data: NodeData) : BaseNode(id, position, data, data.mass) {
        override fun update() {} // Basic empty update
    }

    /** Displays the context menu at specified screen coordinates with given items. @param x Screen x. @param y Screen y. @param items List of [MenuItemData]. @internal */
    private fun _showContextMenu(x: Double, y: Double, items: List<MenuItemData>) {
        contextMenuElement.clear(); val ul = (document.createElement("ul") as HTMLUListElement).apply { style.listStyle="none"; style.margin="0"; style.padding="0" }
        items.forEach { item -> // Create list items for menu
            val li = (document.createElement("li") as HTMLLIElement)
            if (item.type == "separator") { li.style.apply { height="1px"; backgroundColor="#eee"; margin="5px 0" } }
            else {
                li.textContent = item.label; li.style.apply { padding="8px 15px"; cursor="pointer" }
                if (item.disabled) { li.style.opacity="0.5"; li.style.pointerEvents="none" }
                else { li.onmouseenter={ li.style.backgroundColor="#f0f0f0" }; li.onmouseleave={ li.style.backgroundColor="white" } }
                item.data.forEach { (k, v) -> li.dataset[k] = v }; li.dataset["action"] = item.action
                if(item.classNames.isNotBlank()) item.classNames.split(" ").forEach { li.addClass(it) }
            }
            ul.appendChild(li)
        }
        contextMenuElement.appendChild(ul) // Position and display menu
        val menuWidth=contextMenuElement.offsetWidth; val menuHeight=contextMenuElement.offsetHeight
        var finalX=x+5; var finalY=y+5
        if(finalX+menuWidth > window.innerWidth) finalX=x-menuWidth-5
        if(finalY+menuHeight > window.innerHeight) finalY=y-menuHeight-5
        contextMenuElement.style.apply { left="${max(5.0,finalX)}px"; top="${max(5.0,finalY)}px"; display="block" }
    }

    /** Hides the context menu. @internal */
    private fun _hideContextMenu() { contextMenuElement.style.display = "none" }

    /** Shows a confirmation dialog. @param message The message to display. @param onConfirm Callback if user confirms. @internal */
    private fun _showConfirm(message: String, onConfirm: () -> Unit) {
        (confirmDialogElement.querySelector("#sg-confirm-message") as? HTMLParagraphElement)?.textContent = message
        this.confirmCallback = onConfirm; confirmDialogElement.style.display = "block"
    }
    /** Hides the confirmation dialog. @internal */
    private fun _hideConfirm() { confirmDialogElement.style.display = "none"; this.confirmCallback = null }
    /** Handles 'Yes' click in confirm dialog. @internal */
    private fun _onConfirmYes() { this.confirmCallback?.invoke(); _hideConfirm() }
    /** Handles 'No' click in confirm dialog. @internal */
    private fun _onConfirmNo() { _hideConfirm() }

    /**
     * Initiates the edge linking mode, starting from a given source node.
     * Displays a temporary line that follows the mouse cursor.
     * @param sourceNode The [BaseNode] from which the link starts.
     */
    actual fun _startLinking(sourceNode: BaseNode) {
        if (spaceGraph.isLinking) return; spaceGraph.isLinking = true; spaceGraph.linkSourceNode = sourceNode
        container.style.cursor = "crosshair"; _createTempLinkLine(sourceNode)
        showStatus("Linking: Click on target node, or ESC to cancel.", 0) // Show status indefinitely until cancelled
        spaceGraph.agentApi?.dispatchGraphEvent("linkStarted", jsObject{this.sourceNodeId = sourceNode.id})
    }

    /** Creates the temporary visual line for edge linking. @param sourceNode The source. @internal */
    private fun _createTempLinkLine(sourceNode: BaseNode) {
        _removeTempLinkLine() // Remove any existing temp line
        val material = THREE.LineDashedMaterial(jsObject { color=0xffaa00; linewidth=2; dashSize=8; gapSize=4; transparent=true; opacity=0.9; depthTest=false })
        val points = arrayOf(sourceNode.position.toThreeVector(), sourceNode.position.toThreeVector().clone()) // Start and end at source initially
        val geometry = THREE.BufferGeometry().setFromPoints(points)
        spaceGraph.tempLinkLine = THREE.Line(geometry, material).apply { computeLineDistances(); renderOrder=1 } // Ensure visible
        spaceGraph.scene.add(spaceGraph.tempLinkLine!!)
    }
    /** Updates the end point of the temporary linking line to follow screen coordinates. @param screenX Mouse X. @param screenY Mouse Y. @internal */
    private fun _updateTempLinkLine(screenX: Double, screenY: Double) {
        val line = spaceGraph.tempLinkLine ?: return; val sourceNode = spaceGraph.linkSourceNode ?: return
        val targetPos = spaceGraph.screenToWorld(screenX, screenY, sourceNode.position.z) // Project to source node's Z-depth
        targetPos?.let { // Update line's second point
            val positions = line.geometry.attributes["position"].unsafeCast<THREE.BufferAttribute>()
            positions.setXYZ(1, it.x, it.y, it.z); positions.needsUpdate = true
            line.geometry.computeBoundingSphere(); line.computeLineDistances()
        }
    }
    /** Removes the temporary linking line from the scene. @internal */
    private fun _removeTempLinkLine() {
        spaceGraph.tempLinkLine?.let { line -> line.geometry.dispose(); line.material.dispose(); spaceGraph.scene.remove(line); spaceGraph.tempLinkLine = null }
    }
    /** Finalizes the edge linking process when a target is clicked. @param e The [PointerEvent]. @internal */
    actual fun _completeLinking(e: PointerEvent) {
        val targetInfo = _getTargetInfo(e); _removeTempLinkLine()
        val sourceNode = spaceGraph.linkSourceNode
        if (targetInfo.node != null && targetInfo.node != sourceNode && sourceNode != null) {
            val newEdge = spaceGraph.addEdge(sourceNode, targetInfo.node) // Add the actual edge
            newEdge?.let { spaceGraph.agentApi?.dispatchGraphEvent("linkCompletedViaUI", jsObject{this.edgeId = it.id; this.sourceNodeId=it.source.id; this.targetNodeId=it.target.id}) }
        } else {
            spaceGraph.agentApi?.dispatchGraphEvent("linkCancelled", jsObject{this.sourceNodeId = sourceNode?.id; this.reason="No valid target"})
        }
        cancelLinking() // Clean up linking state
    }

    /**
     * Cancels the current edge linking mode.
     * Removes temporary visuals and resets linking state.
     */
    actual fun cancelLinking() {
        _removeTempLinkLine(); spaceGraph.isLinking = false; spaceGraph.linkSourceNode = null
        container.style.cursor = "grab" // Reset cursor
        document.querySelectorAll(".node-html.linking-target").forEach { it.unsafeCast<HTMLElement>().removeClass("linking-target") }
        hideStatus() // Hide linking status message
        if(spaceGraph.linkSourceNode != null) { // Only dispatch if linking was truly active
             spaceGraph.agentApi?.dispatchGraphEvent("linkCancelled", jsObject{this.sourceNodeId = spaceGraph.linkSourceNode?.id; this.reason="User cancelled"})
        }
    }

    /** Handles global keydown events for shortcuts. @param e The [KeyboardEvent]. @internal */
    private fun _onKeyDown(e: KeyboardEvent) {
        val activeEl = document.activeElement; val isEditing = activeEl != null && (activeEl.tagName=="INPUT" || activeEl.tagName=="TEXTAREA" || (activeEl as? HTMLElement)?.isContentEditable==true)
        if (isEditing && e.key != "Escape") return // Allow typing in inputs, except for Escape key

        val selectedNode = spaceGraph.selectedNode; val selectedEdge = spaceGraph.selectedEdge
        var handled = false
        when (e.key) {
            "Delete", "Backspace" -> {
                selectedNode?.let { _showConfirm("Delete node \"${it.id.take(10)}...\"?") { spaceGraph.removeNode(it.id) }; handled=true }
                selectedEdge?.let { _showConfirm("Delete edge \"${it.id.take(10)}...\"?") { spaceGraph.removeEdge(it.id) }; handled=true }
            }
            "Escape" -> {
                if (spaceGraph.isLinking) { cancelLinking(); handled=true }
                else if (contextMenuElement.style.display=="block") { _hideContextMenu(); handled=true }
                else if (confirmDialogElement.style.display=="block") { _hideConfirm(); handled=true }
                else if (edgeMenuObject?.visible == true) { spaceGraph.selectedEdge = null; handled=true } // Will hide menu via setter
                else if (selectedNode != null || selectedEdge != null) { spaceGraph.selectedNode=null; spaceGraph.selectedEdge=null; handled=true }
            }
            "Enter" -> if (selectedNode is NoteNode) { (selectedNode.htmlElement.querySelector(".node-content") as? HTMLElement)?.focus(); handled=true }
            "+", "=" -> if (selectedNode is HtmlNodeElement) { if (e.ctrlKey||e.metaKey) selectedNode.adjustNodeSize(1.2) else selectedNode.adjustContentScale(1.15); handled=true }
            "-", "_" -> if (selectedNode is HtmlNodeElement) { if (e.ctrlKey||e.metaKey) selectedNode.adjustNodeSize(0.8) else selectedNode.adjustContentScale(1/1.15); handled=true }
            " " -> { // Spacebar for focus/center
                e.preventDefault() // Prevent page scroll
                when {
                    selectedNode != null -> { spaceGraph.focusOnNode(selectedNode, 0.5, true); handled=true }
                    selectedEdge != null -> { // Focus on midpoint of edge
                        val midPoint = selectedEdge.source.position.toThreeVector().lerp(selectedEdge.target.position.toThreeVector(),0.5)
                        val dist = selectedEdge.source.position.distanceTo(selectedEdge.target.position)
                        spaceGraph.cameraController.pushState()
                        spaceGraph.cameraController.moveTo(midPoint.x,midPoint.y,midPoint.z + dist*0.6+100, 0.5, Vector3D.fromThreeVector(midPoint))
                        handled=true
                    }
                    else -> { spaceGraph.centerView(null,0.7); handled=true }
                }
            }
        }
        if (handled) e.preventDefault() // Prevent default browser action if event was handled
    }

    /** Handles mouse wheel events for zooming or node content scaling. @param e The [WheelEvent]. @internal */
    private fun _onWheel(e: WheelEvent) {
        val targetInfo = _getTargetInfo(e.unsafeCast<PointerEvent>()) // Cast for clientX/Y, be cautious
        if (targetInfo.element?.closest(".node-controls, .edge-menu-frame") != null || targetInfo.contentEditable != null) {
            return // Don't interfere with scrolling inside specific UI parts or editable content
        }
        e.preventDefault() // Prevent default page scroll if not handled above
        if (e.ctrlKey || e.metaKey) { // Ctrl/Meta + Wheel: Adjust content scale of HTML node
            (targetInfo.node as? HtmlNodeElement)?.adjustContentScale(if (e.deltaY < 0) 1.1 else (1/1.1))
        } else { // Default wheel: Zoom camera
            spaceGraph.cameraController.zoom(e)
        }
    }

    /**
     * Displays a small menu attached to a selected edge for quick actions.
     * The menu is a [CSS3DObject] and billboards with the camera.
     * @param edge The [Edge] to show the menu for.
     */
    actual fun showEdgeMenu(edge: Edge) {
        if (edgeMenuObject?.userData?.edgeId == edge.id && edgeMenuObject?.visible == true) return // Already showing for this edge
        hideEdgeMenu() // Hide any existing menu

        val menuElement = (document.createElement("div") as HTMLDivElement).apply {
            className = "edge-menu-frame"; dataset["edgeId"] = edge.id
            style.apply { padding="5px"; background="rgba(50,50,50,0.8)"; borderRadius="4px"; display="flex"; gap="5px" }
            innerHTML = """
                <button title="Color (NYI)" data-action="color">🎨</button> <button title="Thickness (NYI)" data-action="thickness">➖</button>
                <button title="Style (NYI)" data-action="style">〰️</button> <button title="Constraint (NYI)" data-action="constraint">🔗</button>
                <button title="Delete Edge" class="delete" data-action="delete" style="color:red;">×</button>""".trimIndent()

            addEventListener("click", { event -> // Event listener for menu buttons
                ((event.target as? HTMLElement)?.closest("button") as? HTMLButtonElement)?.dataset?.get("action")?.let { action ->
                    event.stopPropagation()
                    when (action) {
                        "delete" -> _showConfirm("Delete edge \"${edge.id.take(10)}...\"?") { spaceGraph.removeEdge(edge.id) }
                        "color", "thickness", "style", "constraint" -> {
                            showStatus("Edge style editing for '$action' not fully implemented yet.", 2000)
                            console.warn("Edge menu action '$action' not fully implemented.")
                        }
                    }
                }
            })
            // Prevent graph interactions when clicking/interacting with the menu itself
            addEventListener("pointerdown", { it.stopPropagation() }); addEventListener("wheel", { it.stopPropagation() })
        }
        edgeMenuObject = CSS3DObject(menuElement).apply { userData = jsObject{this.edgeId = edge.id} }
        spaceGraph.cssScene.add(edgeMenuObject!!)
        updateEdgeMenuPosition() // Position it correctly
    }

    /** Hides the currently visible edge menu, if any. */
    actual fun hideEdgeMenu() {
        edgeMenuObject?.let { menu -> menu.element.remove(); menu.parent?.remove(menu); edgeMenuObject = null }
    }

    /** Updates the position and orientation of the edge menu to follow the selected edge and face the camera. */
    actual fun updateEdgeMenuPosition() {
        val edge = spaceGraph.selectedEdge ?: return; val menu = edgeMenuObject ?: return
        val midPoint = edge.source.position.toThreeVector().clone().lerp(edge.target.position.toThreeVector(), 0.5)
        menu.position.copy(midPoint) // Position at midpoint of edge
        spaceGraph._camera.let { menu.quaternion.copy(it.quaternion) } // Billboard to camera
    }

    /**
     * Displays a temporary status message to the user.
     * @param message The message string to display.
     * @param duration Time in milliseconds to display the message. If 0, message stays until explicitly hidden. Defaults to 3000ms.
     */
    fun showStatus(message: String, duration: Int = 3000) {
        statusIndicatorElement.textContent = message; statusIndicatorElement.style.opacity = "1"; statusIndicatorElement.style.display = "block"
        if (duration > 0) window.setTimeout({ hideStatus() }, duration)
    }
    /** Hides the status message. */
    fun hideStatus() {
        statusIndicatorElement.style.opacity = "0"
        window.setTimeout({ if (statusIndicatorElement.style.opacity == "0") statusIndicatorElement.style.display = "none" }, 500) // Hide after fade
    }

    /**
     * Disposes of the UIManager and its resources. Removes all event listeners and UI elements it created.
     */
    actual fun dispose() {
        // Remove all event listeners
        container.removeEventListener("pointerdown", this::_onPointerDown.unsafeCast<(Event) -> Unit>())
        window.removeEventListener("pointermove", this::_onPointerMove.unsafeCast<(Event) -> Unit>())
        window.removeEventListener("pointerup", this::_onPointerUp.unsafeCast<(Event) -> Unit>())
        container.removeEventListener("contextmenu", this::_onContextMenu.unsafeCast<(Event) -> Unit>())
        document.removeEventListener("click", this::_onDocumentClick.unsafeCast<(Event) -> Unit>(), true)
        confirmDialogElement.querySelector("#sg-confirm-yes")?.removeEventListener("click", { _onConfirmYes() }) // Might need to store bound refs
        confirmDialogElement.querySelector("#sg-confirm-no")?.removeEventListener("click", { _onConfirmNo() })
        window.removeEventListener("keydown", this::_onKeyDown.unsafeCast<(Event) -> Unit>())
        container.removeEventListener("wheel", this::_onWheel.unsafeCast<(Event) -> Unit>())
        contextMenuElement.removeEventListener("click", this::_onContextMenuClick.unsafeCast<(Event)->Unit>())

        // Remove dynamically created UI elements
        hideEdgeMenu(); contextMenuElement.remove(); confirmDialogElement.remove(); statusIndicatorElement.remove()

        // Clear internal state
        draggedNode = null; resizedNode = null; hoveredEdge = null; confirmCallback = null
        console.log("UIManager disposed.")
    }
}

// Helper extension for CSSStyleDeclaration.apply, if not already globally available.
internal fun CSSStyleDeclaration.apply(block: CSSStyleDeclaration.() -> Unit): Unit = block()
// Helper extension for Node.style, if not already globally available.
internal val Node.style: CSSStyleDeclaration get() = (this as HTMLElement).style
// Helper extension for CSS3DObject.element, if not already globally available.
internal val CSS3DObject.element : HTMLElement get() = this.asDynamic().element as HTMLElement
```
