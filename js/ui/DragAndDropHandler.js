// js/ui/DragAndDropHandler.js

export class DragAndDropHandler {
    constructor(spaceGraph, uiManagerFacade) {
        this.spaceGraph = spaceGraph;
        this.uiManager = uiManagerFacade; // The main UIManager
        this.container = spaceGraph.container;
    }

    bindEvents() {
        this.container.addEventListener('dragover', this.handleDragOver.bind(this), false);
        this.container.addEventListener('drop', this.handleDrop.bind(this), false);
        // Optional: Add dragleave or dragend to remove 'drag-over-active' class if drop doesn't occur
        this.container.addEventListener('dragleave', this.handleDragLeave.bind(this), false);
        this.container.addEventListener('dragend', this.handleDragEnd.bind(this), false); // For drag operations ending outside the window
    }

    dispose() {
        this.container.removeEventListener('dragover', this.handleDragOver.bind(this));
        this.container.removeEventListener('drop', this.handleDrop.bind(this));
        this.container.removeEventListener('dragleave', this.handleDragLeave.bind(this));
        this.container.removeEventListener('dragend', this.handleDragEnd.bind(this));
        // console.log("DragAndDropHandler disposed.");
    }

    handleDragOver(event) {
        // Logic from UIManager._onDragOver
        event.preventDefault();
        if (event.dataTransfer?.types.includes('application/x-spacegraph-node-type')) {
            event.dataTransfer.dropEffect = 'copy';
            this.container.classList.add('drag-over-active');
        } else {
            event.dataTransfer.dropEffect = 'none';
        }
    }

    handleDragLeave(event) {
        // If the drag leaves the container, remove the visual feedback
        if (event.target === this.container) {
            this.container.classList.remove('drag-over-active');
        }
    }

    handleDragEnd(event) {
        // This event fires on the source element of the drag, even if it ends outside the window
        // Useful for cleanup if the drag operation is cancelled or ends elsewhere.
        this.container.classList.remove('drag-over-active');
    }

    handleDrop(event) {
        // Logic from UIManager._onDrop
        event.preventDefault();
        this.container.classList.remove('drag-over-active');

        const rawData = event.dataTransfer?.getData('application/x-spacegraph-node-type');
        if (!rawData) {
            console.warn("Drop event without 'application/x-spacegraph-node-type' data.");
            return;
        }

        let nodeCreationData;
        try {
            nodeCreationData = JSON.parse(rawData);
        } catch (err) {
            console.error("Failed to parse dragged node data JSON:", err, "Raw data:", rawData);
            // Use uiManager to show status, assuming DialogManager is part of it or accessible
            this.uiManager.showStatus("Error: Could not parse node data for drop.", "error");
            return;
        }

        if (!nodeCreationData.type) {
            console.error("Dragged node data is missing 'type' property.", nodeCreationData);
            this.uiManager.showStatus("Error: Node data from drop is missing 'type'.", "error");
            return;
        }

        const worldPos = this.spaceGraph.screenToWorld(event.clientX, event.clientY, 0);
        if (!worldPos) {
            console.error("Could not convert drop position to world coordinates.");
            this.uiManager.showStatus("Error: Could not determine drop location.", "error");
            return;
        }

        const finalNodeData = { x: worldPos.x, y: worldPos.y, z: worldPos.z, ...nodeCreationData };
        const newNode = this.spaceGraph.addNode(finalNodeData);

        if (newNode) {
            // console.log(`Node of type '${finalNodeData.type}' created by drop:`, newNode.id);
            this.spaceGraph.setSelectedNode(newNode);
            this.spaceGraph.layoutEngine?.kick();
            this.uiManager.showStatus(`Node '${newNode.data.label || newNode.id}' created.`, "info");
            // Optional: Focus on the new node
            // setTimeout(() => this.spaceGraph.focusOnNode(newNode, 0.6, true), 100);
        } else {
            this.uiManager.showStatus(`Failed to create node of type '${finalNodeData.type}' from drop.`, 'error');
        }
    }
}
