export class DataPlugin extends Plugin {
    exportGraphToJSON(options?: {
        prettyPrint: boolean;
        includeCamera: boolean;
    }): string;
    importGraphFromJSON(jsonData: any, options?: {
        clearExistingGraph: boolean;
    }): Promise<boolean>;
}
import { Plugin } from '../core/Plugin.js';
