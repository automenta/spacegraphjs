export class ContextMenu {
    constructor(space: any, contextMenuElement: any, uiPluginCallbacks: any);
    space: any;
    contextMenuElement: any;
    _uiPluginCallbacks: any;
    _bindEvents(): void;
    _onContextMenuClick: (e: any) => void;
    _getContextMenuItemsForNode(node: any): ({
        label: string;
        action: string;
        nodeId: any;
        type?: undefined;
        isDestructive?: undefined;
    } | {
        type: string;
        label?: undefined;
        action?: undefined;
        nodeId?: undefined;
        isDestructive?: undefined;
    } | {
        label: string;
        action: string;
        nodeId: any;
        isDestructive: boolean;
        type?: undefined;
    })[];
    _getContextMenuItemsForEdge(edge: any): ({
        label: string;
        action: string;
        edgeId: any;
        type?: undefined;
        isDestructive?: undefined;
    } | {
        type: string;
        label?: undefined;
        action?: undefined;
        edgeId?: undefined;
        isDestructive?: undefined;
    } | {
        label: string;
        action: string;
        edgeId: any;
        isDestructive: boolean;
        type?: undefined;
    })[];
    _getContextMenuItemsForBackground(worldPos: any): ({
        positionX: any;
        positionY: any;
        positionZ: any;
        label: string;
        action: string;
        type?: undefined;
    } | {
        type: string;
        label?: undefined;
        action?: undefined;
    } | {
        label: string;
        action: string;
        type?: undefined;
    })[];
    show(x: any, y: any, targetInfo: any): void;
    hide: () => void;
    dispose(): void;
}
