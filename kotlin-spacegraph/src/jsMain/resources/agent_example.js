console.log("Agent Example Script Loaded");

function agentMain() {
    console.log("Agent: Waiting for spaceGraphAgent to be available...");

    const intervalId = setInterval(() => {
        if (window.spaceGraphAgent) {
            clearInterval(intervalId);
            console.log("Agent: spaceGraphAgent is now available!");
            runAgentLogic();
        }
    }, 100); // Check every 100ms
}

function runAgentLogic() {
    const agent = window.spaceGraphAgent;
    let testCounter = 1;

    function logTestResult(testName, condition, details) {
        const result = condition ? "PASSED" : "FAILED";
        console.log(`Agent Test ${testCounter++}: ${testName} - ${result}`);
        if (details) {
            console.log("  Details:", details);
        }
        if (!condition) {
            console.error(`Agent Test Failed: ${testName}`);
        }
    }

    // 1. Subscribe to events
    console.log("--- Subscribing to Events ---");
    const eventLogs = {};
    const eventTypesToLog = ['nodeAdded', 'nodeRemoved', 'edgeAdded', 'edgeRemoved', 'nodeSelected', 'edgeSelected', 'nodeDataChanged', 'nodePositionChanged', 'agentCustom:testEvent', 'graphCleared'];

    eventTypesToLog.forEach(eventType => {
        eventLogs[eventType] = [];
        agent.onGraphEvent(eventType, (data) => {
            console.log(`Agent: Event Received - ${eventType}`, data);
            eventLogs[eventType].push(data);
        });
        console.log(`Agent: Subscribed to '${eventType}'.`);
    });

    // 2. Add a new node
    console.log("\n--- Node Operations ---");
    const newNodeConfig1 = {
        type: 'note',
        position: { x: 100, y: 150, z: 10 },
        data: { label: 'Agent Note 1', content: 'Added by agent.', backgroundColor: 'rgba(200,100,100,0.9)', width: 180, height: 90 }
    };
    const addedNode1 = agent.addNode("agent-node-1", newNodeConfig1);
    logTestResult("Add Node 'agent-node-1'", addedNode1 && addedNode1.id === "agent-node-1" && addedNode1.data.label === "Agent Note 1", addedNode1);

    // 3. Get the added node
    const fetchedNode1 = agent.getNode("agent-node-1");
    logTestResult("Get Node 'agent-node-1'", fetchedNode1 && fetchedNode1.id === "agent-node-1", fetchedNode1);

    // 4. Update node data
    const updateDataPayload = { label: "Agent Note 1 (Updated)", content: "Content updated.", custom: { testTag: "updated" } };
    const update1Success = agent.updateNodeData("agent-node-1", updateDataPayload);
    const updatedNode1 = agent.getNode("agent-node-1");
    logTestResult("Update Node Data 'agent-node-1'", update1Success && updatedNode1 && updatedNode1.data.label === "Agent Note 1 (Updated)" && updatedNode1.data.custom.testTag === "updated", updatedNode1);

    // 5. Update node position
    const newPosition = { x: 120, y: 170, z: 15 };
    const updatePosSuccess = agent.updateNodePosition("agent-node-1", newPosition);
    const movedNode1 = agent.getNode("agent-node-1");
    logTestResult("Update Node Position 'agent-node-1'", updatePosSuccess && movedNode1 && movedNode1.position.x === 120 && movedNode1.position.y === 170, movedNode1?.position);

    // 6. Add a second node for edge testing and ShapeNode update testing
    const newNodeConfig2 = { type: 'shape', position: { x: -50, y: -150, z: 0 }, data: { label: 'Agent Shape 1', shapeType: 'box', shapeSize: 50, shapeColor: 0x00ff00 } };
    const addedNode2 = agent.addNode("agent-shape-1", newNodeConfig2);
    logTestResult("Add Node 'agent-shape-1' (type: box, size: 50)", addedNode2 && addedNode2.id === "agent-shape-1" && addedNode2.data.shapeType === "box" && addedNode2.data.shapeSize === 50, addedNode2);

    // START: Added tests for ShapeNode updates (Bug 2 verification)
    console.log("\n--- ShapeNode Update Test ---");
    const shapeUpdatePayload1 = { shapeType: "sphere" }; // Only type
    agent.updateNodeData("agent-shape-1", shapeUpdatePayload1);
    let updatedShape = agent.getNode("agent-shape-1");
    logTestResult("Update ShapeNode 'agent-shape-1' type to sphere", updatedShape && updatedShape.data.shapeType === "sphere" && updatedShape.data.shapeSize === 50, updatedShape?.data);

    const shapeUpdatePayload2 = { shapeSize: 75 }; // Only size
    agent.updateNodeData("agent-shape-1", shapeUpdatePayload2);
    updatedShape = agent.getNode("agent-shape-1");
    logTestResult("Update ShapeNode 'agent-shape-1' size to 75", updatedShape && updatedShape.data.shapeType === "sphere" && updatedShape.data.shapeSize === 75, updatedShape?.data);

    const shapeUpdatePayload3 = { shapeType: "box", shapeSize: 40, shapeColor: 0xff0000 }; // Type, size, and color
    agent.updateNodeData("agent-shape-1", shapeUpdatePayload3);
    updatedShape = agent.getNode("agent-shape-1");
    logTestResult("Update ShapeNode 'agent-shape-1' type to box, size to 40, color to red",
        updatedShape &&
        updatedShape.data.shapeType === "box" &&
        updatedShape.data.shapeSize === 40 &&
        updatedShape.data.shapeColor === 0xff0000,
        updatedShape?.data);
    // END: Added tests for ShapeNode updates

    // 7. Edge Operations
    console.log("\n--- Edge Operations ---");
    const edgeConfig1 = { data: { label: "agent-link", color: 0xff00ff } };
    const addedEdge1 = agent.addEdge("agent-edge-1", "agent-node-1", "agent-shape-1", edgeConfig1);
    logTestResult("Add Edge 'agent-edge-1'", addedEdge1 && addedEdge1.id === "agent-edge-1" && addedEdge1.data.label === "agent-link", addedEdge1);

    // 8. Get the added edge
    const fetchedEdge1 = agent.getEdge("agent-edge-1");
    logTestResult("Get Edge 'agent-edge-1'", fetchedEdge1 && fetchedEdge1.id === "agent-edge-1", fetchedEdge1);

    // 9. Update edge data
    const updateEdgePayload = { label: "Agent Link (Updated)", color: 0x00ffff };
    const updateEdgeSuccess = agent.updateEdgeData("agent-edge-1", updateEdgePayload);
    const updatedEdge1 = agent.getEdge("agent-edge-1");
    logTestResult("Update Edge Data 'agent-edge-1'", updateEdgeSuccess && updatedEdge1 && updatedEdge1.data.label === "Agent Link (Updated)" && updatedEdge1.data.color === 0x00ffff, updatedEdge1);

    // 10. Get all nodes and edges
    console.log("\n--- Graph Data Retrieval ---");
    const allNodes = agent.getAllNodes();
    logTestResult("Get All Nodes", allNodes && allNodes.length >= 2, `Found ${allNodes?.length} nodes.`);
    // console.log("All nodes:", JSON.stringify(allNodes, null, 2));

    const allEdges = agent.getAllEdges();
    logTestResult("Get All Edges", allEdges && allEdges.length >= 1, `Found ${allEdges?.length} edges.`);
    // console.log("All edges:", JSON.stringify(allEdges, null, 2));

    // 11. Get graph data
    const graphData = agent.getGraphData();
    logTestResult("Get Graph Data", graphData && graphData.nodes && graphData.edges && graphData.nodes.length === allNodes.length && graphData.edges.length === allEdges.length, graphData);
    // console.log("Full graph data:", JSON.stringify(graphData, null, 2));

    // 12. Remove an edge
    const removeEdgeSuccess = agent.removeEdge("agent-edge-1");
    logTestResult("Remove Edge 'agent-edge-1'", removeEdgeSuccess && !agent.getEdge("agent-edge-1"), `Edge exists after removal: ${!!agent.getEdge("agent-edge-1")}`);

    // 13. Remove a node
    const removeNodeSuccess = agent.removeNode("agent-node-1");
    logTestResult("Remove Node 'agent-node-1'", removeNodeSuccess && !agent.getNode("agent-node-1"), `Node exists after removal: ${!!agent.getNode("agent-node-1")}`);

    // 14. Load graph data (simple test)
    console.log("\n--- Load Graph Data ---");
    const simpleGraphToLoad = {
        nodes: [
            { id: "load-n1", type: "note", position: {x:0,y:0,z:0}, data: { label: "Loaded Node 1" } },
            { id: "load-n2", type: "shape", position: {x:100,y:0,z:0}, data: { label: "Loaded Shape 1", shapeType: "sphere", shapeSize: 30 } }
        ],
        edges: [
            { id: "load-e1", source: "load-n1", target: "load-n2", data: { label: "loaded link" } }
        ]
    };
    console.log("Agent: Clearing graph before load...");
    agent.clearGraph();
    logTestResult("Clear graph for loading", agent.getAllNodes().length === 0 && agent.getAllEdges().length === 0);

    const loadSuccess = agent.loadGraphData(simpleGraphToLoad, false);
    logTestResult("Load Graph Data", loadSuccess && agent.getNode("load-n1") && agent.getEdge("load-e1") && agent.getAllNodes().length === 2 && agent.getAllEdges().length === 1, {
        nodes: agent.getAllNodes().map(n=>n.id),
        edges: agent.getAllEdges().map(e=>e.id)
    });
    const loadedShapeNode = agent.getNode("load-n2");
    logTestResult("Loaded ShapeNode 'load-n2' properties", loadedShapeNode && loadedShapeNode.data.shapeType === "sphere" && loadedShapeNode.data.shapeSize === 30, loadedShapeNode?.data);

    // 15. Dispatch and receive a custom event
    console.log("\n--- Custom Event ---");
    const customEventPayload = { message: "Hello from agent!", value: 42 };
    agent.dispatchCustomEvent("testEvent", customEventPayload);

    setTimeout(() => {
         logTestResult("Custom Event Received", eventLogs["agentCustom:testEvent"] && eventLogs["agentCustom:testEvent"].some(p => p.message === "Hello from agent!" && p.value === 42), eventLogs["agentCustom:testEvent"]);
         logTestResult("Node Added Event Count (from agent nodes + load)", eventLogs["nodeAdded"]?.filter(e => e.nodeId?.startsWith("agent-") || e.nodeId?.startsWith("load-")).length >= 4, eventLogs["nodeAdded"]);
         logTestResult("Node Removed Event Count (from agent nodes)", eventLogs["nodeRemoved"]?.filter(e => e.nodeId?.startsWith("agent-")).length >= 1, eventLogs["nodeRemoved"]);
         logTestResult("Edge Added Event Count (from agent edges + load)", eventLogs["edgeAdded"]?.filter(e => e.edgeId?.startsWith("agent-") || e.edgeId?.startsWith("load-")).length >= 2, eventLogs["edgeAdded"]);
         logTestResult("Edge Removed Event Count (from agent edges)", eventLogs["edgeRemoved"]?.filter(e => e.edgeId?.startsWith("agent-")).length >= 1, eventLogs["edgeRemoved"]);
         logTestResult("Graph Cleared Event Received", eventLogs["graphCleared"]?.length >= 1, eventLogs["graphCleared"]);

         console.log("\n--- Agent Test Summary ---");
         console.log("See individual test results above.");
         console.log("Review event logs for 'Node Selected', 'Node Data Changed', 'Node Position Changed'.");
         console.log("Initial nodes from Main.kt (n1, n2, etc.) should also have generated 'nodeAdded' events if API was ready in time.");

    }, 1000);


    const initialNodeN1 = agent.getNode("n1");
    if (initialNodeN1) {
        console.log("\n--- Focus & Selection on Initial Nodes ---");
        console.log("Agent: Focusing on node 'n1' (from Main.kt) in 2 seconds...");
        setTimeout(() => {
            agent.focusOnNode("n1", 1.0);
            logTestResult("Focus on 'n1'", true, "Call initiated");
        }, 2000);

        console.log("Agent: Selecting node 'n2' (from Main.kt) in 4 seconds...");
        setTimeout(() => {
            agent.selectNode("n2");
            logTestResult("Select 'n2'", true, "Call initiated");

            setTimeout(() => {
                const selected = agent.getSelectedNode();
                logTestResult("Get Selected Node ('n2')", selected && selected.id === "n2", selected);
                agent.selectNode(null);
                logTestResult("Clear Selection", agent.getSelectedNode() === null);
            }, 1000);
        }, 4000);
    } else {
        console.warn("Agent: Initial nodes (n1, n2) from Main.kt not found during agent script execution. Some focus/selection tests on initial nodes might be affected if Main.kt nodes are added after agent runs or if there's an issue fetching them.");
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', agentMain);
} else {
    agentMain();
}
