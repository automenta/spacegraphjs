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
    static generatorName: string;
    getName(): string;
    /**
     * Generates a graph from a JavaScript object.
     * @param {object} obj - The JavaScript object to visualize.
     * @param {S.SpaceGraph} space - The SpaceGraph instance.
     * @param {object} options - Options.
     */
    generate(obj: object, space: S.SpaceGraph, options?: object): void;
    _traverseObject(currentObject: any, space: any, config: any, position: any, parentNode: any, keyName: any, depth: any): any;
}
import * as S from '../index.js';
