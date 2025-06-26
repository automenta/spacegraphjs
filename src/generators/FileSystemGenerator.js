import * as S from '../index.js'; // Assuming S is the SpaceGraph library import

/**
 * Generates a graph representation of a file system structure.
 * Takes a JSON-like object describing directories and files and converts it
 * into nodes and edges for SpaceGraph.
 *
 * Usage:
 * const fsGen = new FileSystemGenerator();
 * const fsData = { name: "root", type: "directory", children: [...] };
 * fsGen.generate(fsData, spaceGraphInstance, { rootPosition: {x:0,y:0,z:0} });
 * // Then apply a layout.
 */
export class FileSystemGenerator {
    static generatorName = 'fileSystem';

    getName() {
        return FileSystemGenerator.generatorName;
    }

    /**
     * Generates a graph from a file system like structure.
     * @param {object} fsData - The file system data. Expected format:
     *                          { name: "root", type: "directory", children: [ ... ] }
     *                          { name: "file.txt", type: "file", size: 1024 }
     * @param {S.SpaceGraph} space - The SpaceGraph instance.
     * @param {object} options - Options like rootPosition.
     */
    generate(fsData, space, options = {}) {
        if (!fsData || !space) {
            console.error("FileSystemGenerator: Missing fsData or space instance.");
            return;
        }

        const defaultOptions = {
            rootPosition: { x: 0, y: 0, z: 0 },
            nodeTypeMapping: {
                directory: 'group', // Or 'html' with custom styling
                file: 'document', // Or 'html'
            },
            directoryData: (item) => ({
                label: item.name,
                // For GroupNode
                // defaultCollapsed: item.children && item.children.length > 5,
                // backgroundColor: 'rgba(70, 90, 110, 0.2)',
                // For HtmlNode (if used for directory)
                content: `📁 ${item.name}`,
                width: 150 + item.name.length * 5,
                height: 60,
                backgroundColor: '#334455',
                type: 'html' // Explicitly set if using HTML for dirs
            }),
            fileData: (item) => ({
                label: item.name,
                icon: this._getFileIcon(item.name),
                // documentUrl: item.path, // If you have full paths
                size: item.size || 50, // Visual size for DocumentNode
                type: 'document'
            }),
        };

        const config = { ...defaultOptions, ...options };
        this._traverseFsItem(fsData, space, config, config.rootPosition, null);
    }

    _traverseFsItem(item, space, config, position, parentNode = null) {
        let currentNode;
        const nodeType = item.type === 'directory' ? config.nodeTypeMapping.directory : config.nodeTypeMapping.file;

        let nodeData = {};
        if (item.type === 'directory') {
            nodeData = config.directoryData(item);
        } else {
            nodeData = config.fileData(item);
        }

        // Ensure the type from mapping/data is used for node creation
        const createType = nodeData.type || nodeType;

        currentNode = space.createNode({
            id: S.Utils.generateId(item.name), // Consider more robust ID generation if names clash
            type: createType,
            position: { ...position }, // Copy position
            data: nodeData,
            mass: item.type === 'directory' ? 1.5 : 0.8,
        });

        if (parentNode && currentNode) {
            space.addEdge(parentNode, currentNode, { type: 'straight', color: 0xaaaaaa, thickness: 1.5 });
        }

        if (item.type === 'directory' && item.children && item.children.length > 0) {
            // For GroupNode, add children to its data for potential sub-layout
            if (createType === 'group' && currentNode) {
                const childIds = [];
                 // Temporarily store children to get their IDs after creation
                const tempChildren = [];

                item.children.forEach((childItem, index) => {
                    // For now, we'll just create them and let a global layout handle it.
                    // A sub-layout would position them relative to the group.
                    // This simple version just creates them somewhere near.
                    const childPosition = {
                        x: position.x + (index % 3 - 1) * 100, // Simple spread for demo
                        y: position.y - 100 - Math.floor(index/3) * 80,
                        z: position.z + (index % 2) * 20
                    };
                    const childNode = this._traverseFsItem(childItem, space, config, childPosition, currentNode);
                    if (childNode) {
                       childIds.push(childNode.id);
                    }
                });
                // If GroupNode, update its children list
                // currentNode.data.children = childIds; // This would be if GroupNode handles child IDs itself
            } else {
                 item.children.forEach((childItem, index) => {
                    const childPosition = {
                        x: position.x + (index % 3 - 1) * 150,
                        y: position.y - 150 - Math.floor(index/3) * 120,
                        z: position.z + (index % 2) * 30
                    };
                    this._traverseFsItem(childItem, space, config, childPosition, currentNode);
                });
            }
        }
        return currentNode;
    }

    _getFileIcon(fileName) {
        const ext = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();
        switch (ext) {
            case 'txt': return '📄';
            case 'json': return '{ }';
            case 'js': return '📜';
            case 'html': return '🌐';
            case 'css': return '🎨';
            case 'md': return '📝';
            case 'png': case 'jpg': case 'gif': return '🖼️';
            default: return '❔';
        }
    }
}
