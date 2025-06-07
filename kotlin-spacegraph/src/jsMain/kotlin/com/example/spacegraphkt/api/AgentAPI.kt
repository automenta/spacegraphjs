package com.example.spacegraphkt.api

import com.example.spacegraphkt.core.*
import com.example.spacegraphkt.data.*
import com.example.spacegraphkt.external.generateId
import com.example.spacegraphkt.external.jsObject
import kotlin.collections.HashMap
import kotlin.collections.List
import kotlin.collections.MutableList
import kotlin.collections.MutableMap
import kotlin.collections.arrayListOf
import kotlin.collections.set
import kotlin.js.Json as JsJson // Alias to avoid confusion with kotlinx.serialization.json.Json

@JsExport
class AgentAPI(private val spaceGraph: SpaceGraph) {

    private data class JsEventCallbackInfo(
        val eventType: String,
        val callback: (dynamic) -> Unit,
        val subscriptionId: String
    )

    private val eventSubscriptions: MutableList<JsEventCallbackInfo> = arrayListOf()
    private var nextSubscriptionId = 0

    // --- Node Operations ---
    fun addNode(id: String?, nodeConfigJs: JsAny?): JsAny? {
        try {
            val config = nodeConfigJs?.asDynamic() // This is the whole node object from agent/loadGraphData
            val nodeId = id ?: config?.id as? String ?: generateId("agent-node-")

            val type = config?.type as? String ?: "note"

            val positionData = config?.position?.asDynamic()
            val position = Vector3D(
                positionData?.x as? Double ?: 0.0,
                positionData?.y as? Double ?: 0.0,
                positionData?.z as? Double ?: 0.0
            )

            // The 'data' field from nodeConfigJs contains the actual node attributes
            val dataFields = config?.data?.asDynamic() ?: config // If no 'data' field, assume flat structure from agent call.

            val nodeData = NodeData(
                id = nodeId,
                type = type,
                label = dataFields?.label as? String ?: nodeId,
                content = dataFields?.content as? String,
                width = dataFields?.width as? Double,
                height = dataFields?.height as? Double,
                contentScale = dataFields?.contentScale as? Double ?: 1.0,
                backgroundColor = dataFields?.backgroundColor as? String,
                editable = dataFields?.editable as? Boolean ?: (type == "note"),
                billboard = dataFields?.billboard as? Boolean ?: true,
                shapeType = dataFields?.shapeType as? String ?: "sphere",
                shapeSize = dataFields?.shapeSize as? Double ?: 50.0,
                shapeColor = dataFields?.shapeColor as? Int ?: 0xffffff,
                mass = dataFields?.mass as? Double ?: 1.0,
                custom = dataFields?.custom ?: jsObject {}
            )

            val node: BaseNode = when (type) {
                "note" -> NoteNode(nodeId, position, nodeData) // Constructors should primarily use NodeData
                "html" -> HtmlNodeElement(nodeId, position, nodeData,
                    Size(nodeData.width ?: 160.0, nodeData.height ?: 70.0), // Size still needed for constructor
                    nodeData.billboard ?: true
                )
                "shape" -> ShapeNode(nodeId, position, nodeData, // Constructor uses NodeData
                    nodeData.shapeType ?: "sphere",
                    nodeData.shapeSize ?: 50.0,
                    nodeData.shapeColor ?: 0xffffff
                )
                else -> {
                    console.warn("AgentAPI: Unknown node type '$type'. Defaulting to NoteNode.")
                    NoteNode(nodeId, position, nodeData.copy(type = "note"))
                }
            }

            // Specific setters if constructor doesn't cover everything from NodeData or if it's an update path
            if (node is HtmlNodeElement) {
                 nodeData.backgroundColor?.let { node.setBackgroundColor(it) }
                 // node.setSize(nodeData.width ?: node.size.width, nodeData.height ?: node.size.height) // Ensure size is applied
            }


            spaceGraph.addNode(node)
            return convertNodeToJs(node)
        } catch (e: Exception) {
            console.error("AgentAPI.addNode failed:", e)
            e.printStackTrace()
            return null
        }
    }

    fun getNode(nodeId: String): JsAny? {
        return spaceGraph.getNodeById(nodeId)?.let { convertNodeToJs(it) }
    }

    fun updateNodeData(nodeId: String, newDataJs: JsAny?): Boolean {
        val node = spaceGraph.getNodeById(nodeId) ?: return false
        val dataToUpdate = newDataJs?.asDynamic() ?: return false
        var changed = false

        try {
            // Update common data properties in node.data
            (dataToUpdate.label as? String)?.let { node.data.label = it; changed = true }
            (dataToUpdate.content as? String)?.let { node.data.content = it; changed = true }
            (dataToUpdate.mass as? Double)?.let { node.data.mass = it; node.mass = it; changed = true }
            if (js("typeof dataToUpdate.custom === 'object' && dataToUpdate.custom !== null")) {
                 node.data.custom = dataToUpdate.custom // Overwrite or deep merge as needed
                 changed = true
            }

            // Update type-specific properties
            if (node is HtmlNodeElement) {
                var sizeChanged = false
                (dataToUpdate.width as? Double)?.let { node.data.width = it; sizeChanged = true; changed = true }
                (dataToUpdate.height as? Double)?.let { node.data.height = it; sizeChanged = true; changed = true }
                if(sizeChanged) {
                    node.setSize(node.data.width ?: node.size.width, node.data.height ?: node.size.height, false)
                }
                (dataToUpdate.contentScale as? Double)?.let { node.setContentScale(it); node.data.contentScale = it; changed = true }
                (dataToUpdate.backgroundColor as? String)?.let { node.setBackgroundColor(it); node.data.backgroundColor = it; changed = true }
                (dataToUpdate.editable as? Boolean)?.let { node.data.editable = it; changed = true }
                (dataToUpdate.billboard as? Boolean)?.let { node.data.billboard = it; node.billboard = it; changed = true }
            }
            if (node is ShapeNode) {
                val oldShapeType = node.shape
                val oldShapeSize = node.size
                var shapeOrSizeChanged = false

                (dataToUpdate.shapeType as? String)?.let { node.data.shapeType = it; shapeOrSizeChanged = true; changed = true }
                (dataToUpdate.shapeSize as? Double)?.let { node.data.shapeSize = it; shapeOrSizeChanged = true; changed = true }

                if(shapeOrSizeChanged) {
                    // Call setShape with the new values from node.data, which should have been updated
                    node.setShape(node.data.shapeType ?: oldShapeType, node.data.shapeSize ?: oldShapeSize)
                }
                (dataToUpdate.shapeColor as? Int)?.let { node.setColor(it); node.data.shapeColor = it; changed = true }
            }

            if (changed) {
                node.update()
                spaceGraph.layoutEngine.kick()
                dispatchGraphEvent("nodeDataChanged", jsObject {
                    this.nodeId = nodeId
                    this.changedData = newDataJs
                    this.fullNodeData = convertNodeToJs(node)
                })
            }
            return true
        } catch (e: Exception) {
            console.error("AgentAPI.updateNodeData for $nodeId failed:", e)
            e.printStackTrace()
            return false
        }
    }

    fun updateNodePosition(nodeId: String, newPositionJs: JsAny?, triggerLayoutKick: Boolean = true): Boolean {
        val node = spaceGraph.getNodeById(nodeId) ?: return false
        val pos = newPositionJs?.asDynamic() ?: return false
        try {
            val x = pos.x as? Double ?: node.position.x
            val y = pos.y as? Double ?: node.position.y
            val z = pos.z as? Double ?: node.position.z
            node.setPosition(x,y,z)
            if(triggerLayoutKick) spaceGraph.layoutEngine.kick()
            dispatchGraphEvent("nodePositionChanged", jsObject {
                this.nodeId = nodeId
                this.position = jsObject { this.x=x; this.y=y; this.z=z; }
            })
            return true
        } catch (e: Exception) {
            console.error("AgentAPI.updateNodePosition for $nodeId failed:", e)
            return false
        }
    }

    fun removeNode(nodeId: String): Boolean {
        return spaceGraph.removeNode(nodeId) != null
    }

    fun getAllNodes(): Array<JsAny> {
        return spaceGraph.nodes.values.mapNotNull { convertNodeToJs(it) }.toTypedArray()
    }


    // --- Edge Operations ---
    fun addEdge(id: String?, sourceNodeId: String, targetNodeId: String, edgeConfigJs: JsAny?): JsAny? {
        try {
            val sourceNode = spaceGraph.getNodeById(sourceNodeId) ?: return null.also { console.error("AgentAPI.addEdge: Source node '$sourceNodeId' not found.") }
            val targetNode = spaceGraph.getNodeById(targetNodeId) ?: return null.also { console.error("AgentAPI.addEdge: Target node '$targetNodeId' not found.") }

            val config = edgeConfigJs?.asDynamic() // This is the whole edge object from agent/loadGraphData
            val edgeId = id ?: config?.id as? String ?: generateId("agent-edge-")

            // The 'data' field from edgeConfigJs contains the actual edge attributes
            val dataFields = config?.data?.asDynamic() ?: config // If no 'data' field, assume flat structure

            val edgeData = EdgeData(
                id = edgeId,
                label = dataFields?.label as? String,
                color = dataFields?.color as? Int ?: 0x00d0ff,
                thickness = dataFields?.thickness as? Double ?: 1.5,
                style = dataFields?.style as? String ?: "solid",
                constraintType = dataFields?.constraintType as? String ?: "elastic",
                // TODO: Parse constraintParams based on constraintType
                constraintParams = parseConstraintParams(dataFields?.constraintType as? String, dataFields?.constraintParams?.asDynamic()),
                custom = dataFields?.custom ?: jsObject {}
            )
            val edge = spaceGraph.addEdge(sourceNode, targetNode, edgeData)
            return edge?.let { convertEdgeToJs(it) }
        } catch (e: Exception) {
            console.error("AgentAPI.addEdge failed:", e)
            e.printStackTrace()
            return null
        }
    }

    private fun parseConstraintParams(type: String?, params: dynamic): EdgeConstraintParams {
        return when (type) {
            "rigid" -> RigidParams(
                distance = params?.distance as? Double,
                stiffness = params?.stiffness as? Double ?: 0.1
            )
            "weld" -> WeldParams(
                distance = params?.distance as? Double,
                stiffness = params?.stiffness as? Double ?: 0.5
            )
            "elastic" -> ElasticParams(
                stiffness = params?.stiffness as? Double ?: 0.001,
                idealLength = params?.idealLength as? Double ?: 200.0
            )
            else -> ElasticParams() // Default
        }
    }


    fun getEdge(edgeId: String): JsAny? {
        return spaceGraph.getEdgeById(edgeId)?.let { convertEdgeToJs(it) }
    }

    fun updateEdgeData(edgeId: String, newDataJs: JsAny?): Boolean {
        val edge = spaceGraph.getEdgeById(edgeId) ?: return false
        val dataToUpdate = newDataJs?.asDynamic() ?: return false // dataToUpdate is the "data" field of an edge object
        var changed = false
        try {
            (dataToUpdate.label as? String)?.let { edge.data.label = it; changed = true }
            (dataToUpdate.color as? Int)?.let { edge.data.color = it; changed = true }
            (dataToUpdate.thickness as? Double)?.let { edge.data.thickness = it; changed = true }
            (dataToUpdate.style as? String)?.let { edge.data.style = it; changed = true }
            (dataToUpdate.constraintType as? String)?.let {
                edge.data.constraintType = it
                edge.data.constraintParams = parseConstraintParams(it, dataToUpdate.constraintParams?.asDynamic())
                changed = true
            } ?: (dataToUpdate.constraintParams?.asDynamic())?.let {
                edge.data.constraintParams = parseConstraintParams(edge.data.constraintType, it)
                changed = true
            }

            if (js("typeof dataToUpdate.custom === 'object' && dataToUpdate.custom !== null")) {
                 edge.data.custom = dataToUpdate.custom
                 changed = true
            }

            if(changed) {
                edge.updateData(edge.data)
                dispatchGraphEvent("edgeDataChanged", jsObject {
                    this.edgeId = edgeId
                    this.changedData = newDataJs
                    this.fullEdgeData = convertEdgeToJs(edge)
                })
            }
            return true
        } catch (e: Exception) {
            console.error("AgentAPI.updateEdgeData for $edgeId failed:", e)
            return false
        }
    }

    fun removeEdge(edgeId: String): Boolean {
        return spaceGraph.removeEdge(edgeId) != null
    }

    fun getAllEdges(): Array<JsAny> {
        return spaceGraph.edges.values.mapNotNull { convertEdgeToJs(it) }.toTypedArray()
    }

    // --- View & Layout Control ---
    fun focusOnNode(nodeId: String, duration: Double = 0.6): Boolean {
        val node = spaceGraph.getNodeById(nodeId) ?: return false
        spaceGraph.focusOnNode(node, duration, true)
        return true
    }

    fun centerView(targetPositionJs: JsAny? = null, duration: Double = 0.7) {
        val pos = targetPositionJs?.asDynamic()?.let { Vector3D(it.x as Double, it.y as Double, it.z as Double) }
        spaceGraph.centerView(pos, duration)
    }

    fun kickLayout(intensity: Double = 1.0) {
        spaceGraph.layoutEngine.kick(intensity)
    }

    fun resetView(duration: Double = 0.7) {
        spaceGraph.cameraController.resetView(duration)
    }

    // --- Selection ---
    fun selectNode(nodeId: String?) {
        spaceGraph.selectedNode = nodeId?.let { spaceGraph.getNodeById(it) }
    }

    fun selectEdge(edgeId: String?) {
        spaceGraph.selectedEdge = edgeId?.let { spaceGraph.getEdgeById(it) }
    }

    fun getSelectedNode(): JsAny? {
        return spaceGraph.selectedNode?.let { convertNodeToJs(it) }
    }

    fun getSelectedEdge(): JsAny? {
        return spaceGraph.selectedEdge?.let { convertEdgeToJs(it) }
    }


    // --- Event Handling ---
    fun onGraphEvent(eventType: String, callback: (dynamic) -> Unit): String {
        val subId = "sub_${nextSubscriptionId++}"
        eventSubscriptions.add(JsEventCallbackInfo(eventType, callback, subId))
        return subId
    }

    fun offGraphEvent(subscriptionId: String): Boolean {
        return eventSubscriptions.removeAll { it.subscriptionId == subscriptionId }
    }

    fun dispatchGraphEvent(eventType: String, payload: dynamic) {
        eventSubscriptions.filter { it.eventType == eventType || it.eventType == "*" }
            .forEach { subInfo ->
                try {
                    subInfo.callback(payload)
                } catch (e: Exception) {
                    console.error("Error in JS event callback for event '$eventType' (subId: ${subInfo.subscriptionId}):", e)
                }
            }
    }

    fun dispatchCustomEvent(eventType: String, payload: JsAny?) {
        dispatchGraphEvent("agentCustom:$eventType", payload?.asDynamic() ?: jsObject {})
    }


    // --- Data Serialization ---
    fun getGraphData(): JsAny {
        return jsObject {
            this.nodes = getAllNodes() // these already return JsAny
            this.edges = getAllEdges() // these already return JsAny
        }
    }

    fun loadGraphData(graphDataJs: JsAny?, autoLayout: Boolean = true): Boolean {
        val data = graphDataJs?.asDynamic() ?: return false
        try {
            clearGraph()

            val nodesArray = data.nodes as? Array<JsAny>
            val edgesArray = data.edges as? Array<JsAny>

            nodesArray?.forEach { nodeConfigJs -> // nodeConfigJs is the full node object
                val id = nodeConfigJs.asDynamic().id as? String
                addNode(id = id, nodeConfigJs = nodeConfigJs) // Pass the full object
            }

            edgesArray?.forEach { edgeConfigJs -> // edgeConfigJs is the full edge object
                val id = edgeConfigJs.asDynamic().id as? String
                val sourceId = edgeConfigJs.asDynamic().source as? String ?: ""
                val targetId = edgeConfigJs.asDynamic().target as? String ?: ""
                addEdge(id = id, sourceNodeId = sourceId, targetNodeId = targetId, edgeConfigJs = edgeConfigJs) // Pass the full object
            }

            if (autoLayout) {
                spaceGraph.layoutEngine.kick(1.5)
                spaceGraph.layoutEngine.runOnce(150) // Consider making this configurable
                spaceGraph.centerView(null, 0.7)
            }
            return true
        } catch (e: Exception) {
            console.error("AgentAPI.loadGraphData failed:", e)
            e.printStackTrace()
            return false
        }
    }

    fun clearGraph() {
        ArrayList(spaceGraph.nodes.keys).forEach { nodeId -> spaceGraph.removeNode(nodeId) }
        ArrayList(spaceGraph.edges.keys).forEach { edgeId -> spaceGraph.removeEdge(edgeId) }
        dispatchGraphEvent("graphCleared", jsObject {})
    }

    private fun convertNodeToJs(node: BaseNode): JsAny? {
       try {
            return jsObject {
                this.id = node.id
                this.type = node.data.type
                this.position = jsObject { this.x = node.position.x; this.y = node.position.y; this.z = node.position.z }
                this.data = jsObject { // This is the 'data' field for the agent API
                    this.label = node.data.label
                    this.content = node.data.content
                    this.width = node.data.width
                    this.height = node.data.height
                    this.contentScale = node.data.contentScale
                    this.backgroundColor = node.data.backgroundColor
                    this.editable = node.data.editable
                    this.billboard = node.data.billboard
                    this.shapeType = node.data.shapeType
                    this.shapeSize = node.data.shapeSize
                    this.shapeColor = node.data.shapeColor
                    this.mass = node.data.mass
                    this.custom = node.data.custom
                }
            }
        } catch (e: Exception) {
            console.error("Failed to convert node ${node.id} to JS:", e)
            return null
        }
    }

    private fun convertEdgeToJs(edge: Edge): JsAny? {
        try {
            return jsObject {
                this.id = edge.id
                this.source = edge.source.id
                this.target = edge.target.id
                this.data = jsObject { // This is the 'data' field for the agent API
                    this.label = edge.data.label
                    this.color = edge.data.color
                    this.thickness = edge.data.thickness
                    this.style = edge.data.style
                    this.constraintType = edge.data.constraintType
                    this.constraintParams = convertConstraintParamsToJs(edge.data.constraintParams)
                    this.custom = edge.data.custom
                }
            }
        } catch (e: Exception) {
            console.error("Failed to convert edge ${edge.id} to JS:", e)
            return null
        }
    }

    private fun convertConstraintParamsToJs(params: EdgeConstraintParams): JsAny {
        return when (params) {
            is ElasticParams -> jsObject { this.stiffness = params.stiffness; this.idealLength = params.idealLength }
            is RigidParams -> jsObject { this.distance = params.distance; this.stiffness = params.stiffness }
            is WeldParams -> jsObject { this.distance = params.distance; this.stiffness = params.stiffness }
            // else -> jsObject {} // Should not happen if sealed class is exhaustive
        }
    }
}

fun JsAny.asDynamic(): dynamic = this.unsafeCast<dynamic>()
fun JsAny?.asDynamic(): dynamic = this?.unsafeCast<dynamic>()

// Extension to print stack trace for better debugging from Kotlin
fun Throwable.printStackTrace() {
    console.error(this.message)
    this.asDynamic().stack?.let { console.error(it) }
}
