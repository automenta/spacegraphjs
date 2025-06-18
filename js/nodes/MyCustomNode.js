import { HtmlAppNode } from '../HtmlAppNode.js';

export class MyCustomNode extends HtmlAppNode {
    onInit() {
        super.onInit(); // Important to call super.onInit() if extending HtmlAppNode

        // Keep HTML simple, rely on CSS for styling
        this.htmlElement.innerHTML = `
            <div class="my-custom-node-title">${this.data.label || 'Custom Node'}</div>
            <div class="my-custom-node-content">
                <p>ID: ${this.id}</p>
                <p>Position: ${this.x.toFixed(0)}, ${this.y.toFixed(0)}</p>
            </div>
        `;
        // Add any specific event listeners or logic here
        // Example: this.getChild('.my-custom-node-title').addEventListener(...)
    }

    // Optionally, override onDataUpdate if you need to react to specific data changes
    onDataUpdate(updatedData) {
        super.onDataUpdate(updatedData); // Handle base updates (like width/height, bound props)

        if (updatedData.label !== undefined) {
            const titleElement = this.getChild('.my-custom-node-title');
            if (titleElement) {
                titleElement.textContent = this.data.label;
            }
        }
        // Add more reactions to data changes as needed
    }
}

// --- Custom Node Definition ---
export const myCustomNodeDefinition = {
    typeName: 'my-custom-node', // Will result in 'my-custom-node-node' CSS class
    nodeClass: MyCustomNode,
    getDefaults: (nodeInst) => ({ // Default data for new instances
        width: 200,
        height: 100,
        label: nodeInst?.id ? `Custom ${nodeInst.id}` : 'Custom Node',
        // Add any other default properties for your node's data
    }),
    // Optional: define default ports, styles, etc.
    // defaultPorts: { inputs: { in1: {} }, outputs: { out1: {} } },
    // defaultStyle: { backgroundColor: '#abcdef' } // Only if not handled by CSS
};
