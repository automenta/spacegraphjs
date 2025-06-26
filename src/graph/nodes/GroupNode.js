import {HtmlNode} from './HtmlNode.js';
import {$} from '../../utils.js';

export class GroupNode extends HtmlNode {
    static typeName = 'group';
    isCollapsed = false;
    childNodeIds = new Set();

    constructor(id, position, data = {}, mass = 1.5) {
        const groupData = {
            width: data.width ?? 300,
            height: data.height ?? 200,
            label: data.label ?? 'Group',
            content: '',
            type: 'group',
            backgroundColor: data.backgroundColor ?? 'rgba(50, 50, 70, 0.3)',
            borderColor: data.borderColor ?? 'rgba(150, 150, 180, 0.5)',
            collapsible: data.collapsible ?? true,
            defaultCollapsed: data.defaultCollapsed ?? false,
            headerColor: data.headerColor ?? 'rgba(0,0,0,0.2)',
            children: data.children || [],
            ...data,
        };

        super(id, position, groupData, mass);

        this.isCollapsed = groupData.defaultCollapsed;
        groupData.children.forEach((childId) => this.childNodeIds.add(childId));

        this._setupGroupElement();
        this.updateGroupAppearance();
    }

    getDefaultData() {
        return {
            ...super.getDefaultData(),
            label: 'Group',
            type: 'group',
            width: 300,
            height: 200,
            content: '',
            backgroundColor: 'rgba(50, 50, 70, 0.3)',
            borderColor: 'rgba(150, 150, 180, 0.5)',
            collapsible: true,
            defaultCollapsed: false,
            headerColor: 'rgba(0,0,0,0.2)',
            children: [],
            padding: this.data.padding ?? 15,
        };
    }

    _setupGroupElement() {
        $('.node-controls', this.htmlElement)?.remove();

        const contentDiv = $('.node-content', this.htmlElement);
        if (contentDiv) {
            contentDiv.innerHTML = '';
            contentDiv.style.overflow = 'hidden';
        }

        this.htmlElement.style.setProperty('--node-bg', this.data.backgroundColor);
        this.htmlElement.style.border = `1px dashed ${this.data.borderColor}`;
        this.htmlElement.style.boxSizing = 'border-box';

        const header = document.createElement('div');
        header.className = 'group-node-header';
        Object.assign(header.style, {
            padding: '5px',
            backgroundColor: this.data.headerColor,
            cursor: this.data.collapsible ? 'pointer' : 'default',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${this.data.borderColor}`,
        });

        const title = document.createElement('span');
        title.className = 'group-node-title';
        title.textContent = this.data.label;
        title.style.fontWeight = 'bold';

        header.appendChild(title);

        if (this.data.collapsible) {
            const collapseButton = document.createElement('button');
            collapseButton.className = 'group-node-collapse-button';
            Object.assign(collapseButton.style, {
                background: 'transparent',
                border: '1px solid #fff',
                color: '#fff',
                borderRadius: '3px',
                cursor: 'pointer',
                padding: '2px 5px',
            });
            collapseButton.textContent = this.isCollapsed ? '⊕' : '⊖';
            collapseButton.title = this.isCollapsed ? 'Expand' : 'Collapse';
            collapseButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCollapse();
            });
            header.appendChild(collapseButton);
        }

        const innerWrapper = $('.node-inner-wrapper', this.htmlElement);
        innerWrapper ? innerWrapper.insertBefore(header, innerWrapper.firstChild) : this.htmlElement.insertBefore(header, this.htmlElement.firstChild);
    }

    toggleCollapse() {
        if (!this.data.collapsible) return;
        this.isCollapsed = !this.isCollapsed;
        this.updateGroupAppearance();
        this._updateChildNodeVisibility();

        this.space?.emit('node:group:stateChanged', { groupNode: this, isCollapsed: this.isCollapsed });
        this.space?.plugins.getPlugin('LayoutPlugin')?.kick();
    }

    updateGroupAppearance() {
        const button = $('.group-node-collapse-button', this.htmlElement);
        if (button) {
            button.textContent = this.isCollapsed ? '⊕' : '⊖';
            button.title = this.isCollapsed ? 'Expand' : 'Collapse';
        }
    }

    _updateChildNodeVisibility() {
        const nodePlugin = this.space?.plugins.getPlugin('NodePlugin');
        if (!nodePlugin) return;

        this.childNodeIds.forEach((childId) => {
            const childNode = nodePlugin.getNodeById(childId);
            if (childNode) {
                const newVisibility = !this.isCollapsed;
                if (childNode.mesh) childNode.mesh.visible = newVisibility;
                if (childNode.cssObject) childNode.cssObject.visible = newVisibility;
                if (childNode.labelObject) childNode.labelObject.visible = newVisibility;
            }
        });
    }

    addChild(nodeId) {
        if (this.childNodeIds.has(nodeId) || nodeId === this.id) return;
        this.childNodeIds.add(nodeId);
        this._updateChildNodeVisibility();
    }

    removeChild(nodeId) {
        if (!this.childNodeIds.has(nodeId)) return;
        const nodePlugin = this.space?.plugins.getPlugin('NodePlugin');
        const childNode = nodePlugin?.getNodeById(nodeId);
        if (childNode) {
            if (childNode.mesh) childNode.mesh.visible = true;
            if (childNode.cssObject) childNode.cssObject.visible = true;
            if (childNode.labelObject) childNode.labelObject.visible = true;
        }
        this.childNodeIds.delete(nodeId);
    }

    getChildNodes() {
        const nodePlugin = this.space?.plugins.getPlugin('NodePlugin');
        return nodePlugin ? Array.from(this.childNodeIds).map((id) => nodePlugin.getNodeById(id)).filter((node) => node != null) : [];
    }

    update(space) {
        super.update(space);
    }

    getBoundingSphereRadius() {
        return super.getBoundingSphereRadius();
    }

    dispose() {
        this.childNodeIds.clear();
        super.dispose();
    }
}
