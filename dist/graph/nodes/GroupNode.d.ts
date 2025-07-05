export class GroupNode extends HtmlNode {
    isCollapsed: boolean;
    childNodeIds: Set<any>;
    getDefaultData(): {
        label: string;
        type: string;
        width: number;
        height: number;
        content: string;
        backgroundColor: string;
        borderColor: string;
        collapsible: boolean;
        defaultCollapsed: boolean;
        headerColor: string;
        children: any[];
        padding: any;
        contentScale: number;
        editable: boolean;
        labelLod: any[];
    };
    _setupGroupElement(): void;
    toggleCollapse(): void;
    updateGroupAppearance(): void;
    _updateChildNodeVisibility(): void;
    addChild(nodeId: any): void;
    removeChild(nodeId: any): void;
    getChildNodes(): any[];
}
import { HtmlNode } from './HtmlNode.js';
