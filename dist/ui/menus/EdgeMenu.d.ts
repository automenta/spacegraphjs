export class EdgeMenu {
    constructor(space: any, uiPluginCallbacks: any);
    space: any;
    _uiPluginCallbacks: any;
    edgeMenuObject: any;
    show(edge: any): void;
    _createEdgeMenuElement(edge: any): HTMLDivElement;
    hide: () => void;
    updatePosition: (edge: any) => void;
    dispose(): void;
}
