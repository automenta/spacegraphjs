import { HtmlNode } from './HtmlNode.js';
import { Utils, $ } from '../../utils.js';

/**
 * Represents a group node that can contain other nodes and be collapsed or expanded.
 * Visually, it's an `HtmlNode` with a custom header and behavior.
 */
export class GroupNode extends HtmlNode {
    /** @type {boolean} Whether the group is currently collapsed. */
    isCollapsed = false;
    /** @type {Set<string>} Stores the IDs of child nodes belonging to this group. */
    childNodeIds = new Set();

    /**
     * Creates an instance of GroupNode.
     * @param {string} id Unique ID for the node.
     * @param {{x: number, y: number, z: number}} position Initial position.
     * @param {Object} [data={}] Node data, including `label`, `width`, `height`, `collapsible`, `defaultCollapsed`, `children` (array of child node IDs).
     * @param {number} [mass=1.5] Mass for physics calculations.
     */
    constructor(id, position, data = {}, mass = 1.5) {
        // Modify default data for GroupNode appearance if needed
        const groupData = {
            width: data.width ?? 300,
            height: data.height ?? 200,
            label: data.label ?? 'Group',
            content: '', // GroupNode manages its own content structure
            type: 'group',
            backgroundColor: data.backgroundColor ?? 'rgba(50, 50, 70, 0.3)',
            borderColor: data.borderColor ?? 'rgba(150, 150, 180, 0.5)',
            collapsible: data.collapsible ?? true,
            defaultCollapsed: data.defaultCollapsed ?? false,
            headerColor: data.headerColor ?? 'rgba(0,0,0,0.2)',
            children: data.children || [], // Initial child node IDs
            ...data, // Allow overriding any of these
        };

        super(id, position, groupData, mass);

        this.isCollapsed = groupData.defaultCollapsed;
        (groupData.children || []).forEach((childId) => this.childNodeIds.add(childId));

        this._setupGroupElement();
        this.updateGroupAppearance();
    }

    getDefaultData() {
        // Override HtmlNode's default data
        return {
            ...super.getDefaultData(), // Inherit but then override
            label: 'Group',
            type: 'group',
            width: 300,
            height: 200,
            content: '', // Not directly used by user, group creates its own structure
            backgroundColor: 'rgba(50, 50, 70, 0.3)',
            borderColor: 'rgba(150, 150, 180, 0.5)',
            collapsible: true,
            defaultCollapsed: false,
            headerColor: 'rgba(0,0,0,0.2)',
            children: [], // Array of node IDs
            // Specific to GroupNode:
            padding: this.data.padding ?? 15, // Padding inside the group border for children
        };
    }

    _setupGroupElement() {
        // Customize the HTML structure created by HtmlNode's _createElement
        // Or, if HtmlNode's structure is too different, GroupNode might need its own _createElement
        // For now, let's assume we can modify/add to what HtmlNode provides.

        // Remove default HtmlNode controls if they are not suitable for a group
        const controls = $('.node-controls', this.htmlElement);
        if (controls) controls.remove(); // Or selectively remove buttons

        const contentDiv = $('.node-content', this.htmlElement);
        if (contentDiv) {
            contentDiv.innerHTML = ''; // Clear HtmlNode's default content area
            contentDiv.style.overflow = 'hidden'; // Group content area shouldn't scroll typically
        }

        this.htmlElement.style.setProperty('--node-bg', this.data.backgroundColor);
        this.htmlElement.style.border = `1px dashed ${this.data.borderColor}`;
        this.htmlElement.style.boxSizing = 'border-box';

        const header = document.createElement('div');
        header.className = 'group-node-header';
        Object.assign(header.style, {
            padding: '5px',
            backgroundColor: this.data.headerColor,
            cursor: this.data.collapsible ? 'pointer' : 'default',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${this.data.borderColor}`,
        });

        const title = document.createElement('span');
        title.className = 'group-node-title';
        title.textContent = this.data.label;
        title.style.fontWeight = 'bold';

        header.appendChild(title);

        if (this.data.collapsible) {
            const collapseButton = document.createElement('button');
            collapseButton.className = 'group-node-collapse-button';
            // Style it simply for now
            Object.assign(collapseButton.style, {
                background: 'transparent',
                border: '1px solid #fff',
                color: '#fff',
                borderRadius: '3px',
                cursor: 'pointer',
                padding: '2px 5px',
            });
            collapseButton.textContent = this.isCollapsed ? '⊕' : '⊖';
            collapseButton.title = this.isCollapsed ? 'Expand' : 'Collapse';
            collapseButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCollapse();
            });
            header.appendChild(collapseButton);
        }

        // Prepend header to the inner wrapper or the main element
        const innerWrapper = $('.node-inner-wrapper', this.htmlElement);
        if (innerWrapper) {
            innerWrapper.insertBefore(header, innerWrapper.firstChild);
        } else {
            this.htmlElement.insertBefore(header, this.htmlElement.firstChild);
        }
    }

    /**
     * Toggles the collapsed/expanded state of the group.
     * Updates visual appearance, child node visibility, and notifies the layout.
     * Does nothing if `data.collapsible` is false.
     */
    toggleCollapse() {
        if (!this.data.collapsible) return;
        this.isCollapsed = !this.isCollapsed;
        this.updateGroupAppearance();
        this._updateChildNodeVisibility();

        this.space?.emit('node:group:stateChanged', { groupNode: this, isCollapsed: this.isCollapsed });
        this.space?.layout?.kick(); // Important: notify layout
    }

    updateGroupAppearance() {
        const button = $('.group-node-collapse-button', this.htmlElement);
        if (button) {
            button.textContent = this.isCollapsed ? '⊕' : '⊖';
            button.title = this.isCollapsed ? 'Expand' : 'Collapse';
        }
        // Optionally, change size or style when collapsed
        if (this.isCollapsed) {
            // Example: might shrink or change style
            // this.htmlElement.style.height = 'auto'; // Or a fixed collapsed height
        } else {
            // this.htmlElement.style.height = `${this.size.height}px`;
        }
    }

    _updateChildNodeVisibility() {
        const nodePlugin = this.space?.plugins.getPlugin('NodePlugin');
        if (!nodePlugin) return;

        this.childNodeIds.forEach((childId) => {
            const childNode = nodePlugin.getNodeById(childId);
            if (childNode) {
                const newVisibility = !this.isCollapsed;
                if (childNode.mesh) childNode.mesh.visible = newVisibility;
                if (childNode.cssObject) childNode.cssObject.visible = newVisibility;
                if (childNode.labelObject) childNode.labelObject.visible = newVisibility;

                // Inform layout about visibility change for children.
                // LayoutPlugin should ideally listen to node:visibilityChanged or similar.
                // For now, kicking the main layout is done by toggleCollapse.
                // Individual nodes' fixed/pinned state might need to be handled by layout
                // if they are part of a collapsed group.
                if (this.isCollapsed) {
                    // When collapsing, we might want to "absorb" children's velocities or fix them relative to group.
                    // For now, they just become invisible to the main layout.
                } else {
                    // When expanding, children are re-introduced.
                }
            }
        });
    }

    // Methods to manage children
    /**
     * Adds a node to this group by its ID.
     * @param {string} nodeId The ID of the node to add.
     */
    addChild(nodeId) {
        if (this.childNodeIds.has(nodeId) || nodeId === this.id) return;
        this.childNodeIds.add(nodeId);
        this._updateChildNodeVisibility(); // Apply current collapsed state to new child
        // TODO: Potentially update group bounds or notify layout
    }

    /**
     * Removes a node from this group by its ID.
     * Ensures the child node is made visible if it was previously hidden by the group.
     * @param {string} nodeId The ID of the node to remove.
     */
    removeChild(nodeId) {
        if (!this.childNodeIds.has(nodeId)) return;
        // Make sure child is visible before removing from group logic
        const nodePlugin = this.space?.plugins.getPlugin('NodePlugin');
        const childNode = nodePlugin?.getNodeById(nodeId);
        if (childNode) {
            if (childNode.mesh) childNode.mesh.visible = true;
            if (childNode.cssObject) childNode.cssObject.visible = true;
            if (childNode.labelObject) childNode.labelObject.visible = true;
        }
        this.childNodeIds.delete(nodeId);
        // TODO: Potentially update group bounds or notify layout
    }

    /**
     * Retrieves all child node instances currently part of this group.
     * @returns {Array<BaseNode>} An array of child node instances.
     */
    getChildNodes() {
        const nodePlugin = this.space?.plugins.getPlugin('NodePlugin');
        if (!nodePlugin) return [];
        return Array.from(this.childNodeIds)
            .map((id) => nodePlugin.getNodeById(id))
            .filter((node) => node != null);
    }

    /**
     * Updates the GroupNode's position.
     * (Future: Could handle sub-layout updates for children if expanded).
     * @param {import('../../core/SpaceGraph.js').SpaceGraph} space The SpaceGraph instance.
     */
    update(space) {
        super.update(space); // Handles GroupNode's own position
        // If expanded and using a sub-layout, update children positions relative to group
        // For now, children are positioned by global layout.
        // If group is dragged, children should ideally be dragged with it.
        // This requires LayoutPlugin/InteractionPlugin to know about groups.
    }

    // Override getBoundingSphereRadius for layout calculations
    getBoundingSphereRadius() {
        if (this.isCollapsed) {
            // Use a smaller radius or calculate based on collapsed size
            // For now, use HtmlNode's calculation which is based on this.size
            return super.getBoundingSphereRadius();
        }
        // When expanded, the bounding sphere should ideally encompass all children.
        // This is complex. For a first pass, the group's own defined size is used.
        // A more advanced approach would calculate a bounding box around children.
        return super.getBoundingSphereRadius();
    }

    // When a group is removed, what happens to its children?
    // Default: children remain, ungrouped. Could be configurable.
    /**
     * Disposes of the GroupNode, clearing its child associations.
     * Child nodes themselves are not disposed by this method.
     */
    dispose() {
        // Child nodes are not disposed by the group, just disassociated.
        this.childNodeIds.clear();
        super.dispose();
    }
}
