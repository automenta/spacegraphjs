export class Plugin {
    constructor(spaceGraphInstance: any, pluginManagerInstance: any);
    space: any;
    pluginManager: any;
    init(): void;
    update(): void;
    dispose(): void;
    getName(): string;
}
