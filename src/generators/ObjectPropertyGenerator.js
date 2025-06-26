import * as S from '../index.js'; // Assuming S is the SpaceGraph library import

/**
 * Generates a graph representation of a JavaScript object's properties.
 * Recursively traverses an object and creates nodes for keys and values,
 * linking them to represent the object's structure.
 *
 * Usage:
 * const objGen = new ObjectPropertyGenerator();
 * const myObject = { id: 1, name: "Test", data: { value: 10, active: true } };
 * objGen.generate(myObject, spaceGraphInstance, { rootPosition: {x:0,y:0,z:0}, maxDepth: 3 });
 * // Then apply a layout.
 */
export class ObjectPropertyGenerator {
    static generatorName = 'objectProperty';

    getName() {
        return ObjectPropertyGenerator.generatorName;
    }

    /**
     * Generates a graph from a JavaScript object.
     * @param {object} obj - The JavaScript object to visualize.
     * @param {S.SpaceGraph} space - The SpaceGraph instance.
     * @param {object} options - Options.
     */
    generate(obj, space, options = {}) {
        if (typeof obj !== 'object' || obj === null || !space) {
            console.error("ObjectPropertyGenerator: Invalid input object or space instance.");
            return;
        }

        const defaultOptions = {
            rootPosition: { x: 0, y: 0, z: 0 },
            nodeType: 'html', // Default type for properties
            maxDepth: 5, // To prevent infinite recursion with circular objects
            valueNodeColor: 0x66aaee,
            objectNodeColor: 0xeeaa66,
            arrayNodeColor: 0x66eeaa,
        };
        const config = { ...defaultOptions, ...options };

        this._traverseObject(obj, space, config, config.rootPosition, null, 'root', 0);
    }

    _traverseObject(currentObject, space, config, position, parentNode, keyName, depth) {
        if (depth > config.maxDepth) {
            // Create a node indicating max depth reached
            const maxDepthNode = space.createNode({
                id: S.Utils.generateId(`max_depth_${keyName}`),
                type: config.nodeType,
                position,
                data: {
                    label: `${keyName}: (Max Depth)`,
                    content: `<div style="color: #ffdddd; padding: 5px;">${keyName}: (Max Depth Reached)</div>`,
                    width: 180, height: 40, backgroundColor: '#553333',
                },
                mass: 0.7
            });
            if (parentNode && maxDepthNode) {
                space.addEdge(parentNode, maxDepthNode, { color: 0xaaaaaa });
            }
            return maxDepthNode;
        }

        let currentNode;
        const commonNodeData = { width: 180, height: 40 }; // Default size for HtmlNode

        if (Array.isArray(currentObject)) {
            currentNode = space.createNode({
                id: S.Utils.generateId(`array_${keyName}`),
                type: config.nodeType,
                position,
                data: {
                    ...commonNodeData,
                    label: `${keyName} [Array]`,
                    content: `<div style="font-weight:bold; padding:5px;">${keyName} [Array (${currentObject.length})]</div>`,
                    backgroundColor: S.Utils.toHexColor(config.arrayNodeColor),
                },
                mass: 1.2
            });
        } else if (typeof currentObject === 'object' && currentObject !== null) {
            currentNode = space.createNode({
                id: S.Utils.generateId(`object_${keyName}`),
                type: config.nodeType,
                position,
                data: {
                    ...commonNodeData,
                    label: `${keyName} {Object}`,
                    content: `<div style="font-weight:bold; padding:5px;">${keyName} {Object}</div>`,
                    backgroundColor: S.Utils.toHexColor(config.objectNodeColor),
                },
                mass: 1.2
            });
        } else { // Primitive value
            const displayValue = String(currentObject).length > 30 ? String(currentObject).substring(0, 27) + '...' : String(currentObject);
            currentNode = space.createNode({
                id: S.Utils.generateId(`value_${keyName}`),
                type: config.nodeType,
                position,
                data: {
                    ...commonNodeData,
                    width: Math.min(250, 80 + String(displayValue).length * 7), // Adjust width for value
                    label: `${keyName}: ${displayValue}`,
                    content: `<div><span style="color:#aaa; padding-right:5px;">${keyName}:</span> ${displayValue}</div>`,
                    backgroundColor: S.Utils.toHexColor(config.valueNodeColor),
                },
                mass: 0.8
            });
        }

        if (parentNode && currentNode) {
            space.addEdge(parentNode, currentNode, { color: 0xbbbbbb, thickness: 1.5 });
        }

        if (Array.isArray(currentObject)) {
            currentObject.forEach((item, index) => {
                const childPos = {
                    x: position.x + (index % 3 - 1) * 200,
                    y: position.y - 150 - Math.floor(index/3) * 100,
                    z: position.z + (index % 2 === 0 ? 20 : -20)
                };
                this._traverseObject(item, space, config, childPos, currentNode, `[${index}]`, depth + 1);
            });
        } else if (typeof currentObject === 'object' && currentObject !== null) {
            let index = 0;
            for (const prop in currentObject) {
                if (Object.prototype.hasOwnProperty.call(currentObject, prop)) {
                    const childPos = {
                        x: position.x + (index % 3 - 1) * 220,
                        y: position.y - 180 - Math.floor(index/3) * 120,
                        z: position.z + (index % 2 === 0 ? 25 : -25)
                    };
                    this._traverseObject(currentObject[prop], space, config, childPos, currentNode, prop, depth + 1);
                    index++;
                }
            }
        }
        return currentNode;
    }
}
