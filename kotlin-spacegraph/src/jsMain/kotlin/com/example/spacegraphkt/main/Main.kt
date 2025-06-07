package com.example.spacegraphkt.main

import com.example.spacegraphkt.api.AgentAPI
import com.example.spacegraphkt.core.NoteNode
import com.example.spacegraphkt.core.SpaceGraph
import com.example.spacegraphkt.data.NodeData
import com.example.spacegraphkt.data.Vector3D
import kotlinx.browser.document
import kotlinx.browser.window
import org.w3c.dom.HTMLDivElement

fun main() {
    window.onload = {
        val container = document.getElementById("space") as? HTMLDivElement
        if (container == null) {
            console.error("Container element #space not found!")
            return@onload
        }

        val spaceGraph = SpaceGraph(container, null) // Passing null for UiElements config

        // Instantiate AgentAPI and expose it to JavaScript
        val agentApi = AgentAPI(spaceGraph)
        window.asDynamic().spaceGraphAgent = agentApi

        // Now that AgentAPI is created, SpaceGraph needs a reference to it for dispatching events
        spaceGraph.agentApi = agentApi


        // Recreate nodes from example-text-nodes.html
        val nodeData1 = NodeData(
            id = "n1", label = "Hello", type = "note",
            content = "Welcome to SpaceGraphKT!\nThis is a NoteNode.",
            width = 200.0, height = 100.0,
            custom = jsObject { backgroundColor = "rgba(100,100,200,0.9)" }
        )
        val node1 = NoteNode(nodeData1.id, Vector3D(-150.0, 50.0, 0.0), nodeData1)
        (node1.data.custom as? dynamic)?.backgroundColor?.let { node1.setBackgroundColor(it as String) }


        val nodeData2 = NodeData(
            id = "n2", label = "World", type = "note",
            content = "You can drag nodes, pan (left-click drag bg), and zoom (wheel).\nRight-click for context menus.",
            width = 220.0, height = 120.0
        )
        val node2 = NoteNode(nodeData2.id, Vector3D(150.0, -50.0, 0.0), nodeData2)

        val nodeData3 = NodeData(
            id = "n3", label = "Features", type = "note",
            content = """
                - Create nodes (right-click bg)
                - Link nodes (right-click node -> Start Link)
                - Edit content (for NoteNodes)
                - Delete nodes/edges
                - Basic styling & customization
            """.trimIndent(),
            width = 250.0, height = 150.0,
            custom = jsObject { backgroundColor = "rgba(100,200,100,0.9)" }
        )
        val node3 = NoteNode(nodeData3.id, Vector3D(0.0, 150.0, -50.0), nodeData3)
        (node3.data.custom as? dynamic)?.backgroundColor?.let { node3.setBackgroundColor(it as String) }


        val nodeData4 = NodeData(
            id = "n4", label = "Editable", type = "note",
            content = "This node is editable. Try typing here!",
            editable = true,
            width = 180.0, height = 80.0
        )
        val node4 = NoteNode(nodeData4.id, Vector3D(-200.0, -150.0, 50.0), nodeData4)


        spaceGraph.addNode(node1)
        spaceGraph.addNode(node2)
        spaceGraph.addNode(node3)
        spaceGraph.addNode(node4)

        spaceGraph.addEdge(node1, node2, label = "connects to")
        spaceGraph.addEdge(node1, node3, label = "explains")
        spaceGraph.addEdge(node2, node4, label = "related to")
        spaceGraph.addEdge(node3, node4, label = "another link")

        spaceGraph.layoutEngine.kick(1.5)
        spaceGraph.layoutEngine.runOnce(150)

        window.setTimeout({
            spaceGraph.centerView(null, 0.8)
        }, 200)

        window.asDynamic().space = spaceGraph // For direct debugging of SpaceGraph
        console.log("SpaceGraph Kotlin/JS POC initialized. Agent API available at window.spaceGraphAgent")
        spaceGraph.uiManager.showStatus("Welcome to SpaceGraphKT POC! Agent API ready.", 5000)
    }
}

fun jsObject(init: dynamic.() -> Unit): dynamic {
    val o = js("{}")
    init(o)
    return o
}

// Extension property on Window to easily set spaceGraphAgent
var Window.spaceGraphAgent: AgentAPI?
    get() = this.asDynamic().spaceGraphAgent as? AgentAPI
    set(value) {
        this.asDynamic().spaceGraphAgent = value
    }
