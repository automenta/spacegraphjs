import {BaseNode} from '../BaseNode.js';

/**
 * Base class for all node types - now extends BaseNode for common functionality
 */
export class Node extends BaseNode {
    // The Node class now inherits all common functionality from BaseNode
    // Specific node implementations can override methods as needed
    
    /**
     * Updates the node - to be implemented by subclasses
     * @param {SpaceGraph} space - The space graph instance
     */
    update(space) {
        // Call parent update method for common functionality
        super.update(space);
        // Subclasses can add specific update logic here
    }
    
    /**
     * Gets the bounding sphere radius - to be implemented by subclasses
     * @returns {number} The bounding sphere radius
     */
    getBoundingSphereRadius() {
        // Call parent method for default implementation
        return super.getBoundingSphereRadius();
    }
    
    /**
     * Sets the selected style - to be implemented by subclasses
     * @param {boolean} selected - Whether the node is selected
     */
    setSelectedStyle(selected) {
        // Call parent method for common functionality
        super.setSelectedStyle(selected);
        // Subclasses can add specific highlighting logic here
    }
}
