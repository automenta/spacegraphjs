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
    static generatorName: string;
    getName(): string;
    /**
     * Generates a graph from a file system like structure.
     * @param {object} fsData - The file system data. Expected format:
     *                          { name: "root", type: "directory", children: [ ... ] }
     *                          { name: "file.txt", type: "file", size: 1024 }
     * @param {S.SpaceGraph} space - The SpaceGraph instance.
     * @param {object} options - Options like rootPosition.
     */
    generate(fsData: object, space: S.SpaceGraph, options?: object): void;
    _traverseFsItem(item: any, space: any, config: any, position: any, parentNode?: any): any;
    _getFileIcon(fileName: any): "📄" | "{ }" | "📜" | "🌐" | "🎨" | "📝" | "🖼️" | "❔";
}
import * as S from '../index.js';
