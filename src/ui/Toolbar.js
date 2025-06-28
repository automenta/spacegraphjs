// import { $ } from '../utils.js'; // Unused
import * as THREE from 'three';

export class Toolbar {
    constructor(space, toolbarElement) {
        this.space = space;
        this.toolbarElement = toolbarElement;
        this._setupToolbar();
    }

    _setupToolbar() {
        if (!this.toolbarElement) return;
        this.toolbarElement.innerHTML = '';
        const buttons = [
            { id: 'tb-add-node', text: '➕', title: 'Add Default Node', action: 'addNode' },
            { id: 'tb-center-view', text: '🎯', title: 'Center View', action: 'centerView' },
            { id: 'tb-reset-view', text: '🔄', title: 'Reset View', action: 'resetView' },
            { id: 'tb-toggle-theme', text: '🎨', title: 'Toggle Light/Dark Theme', action: 'toggleTheme' },
        ];
        buttons.forEach((btnData) => {
            const button = document.createElement('button');
            button.id = btnData.id;
            button.textContent = btnData.text;
            button.title = btnData.title;
            button.addEventListener('click', () => this._handleToolbarAction(btnData.action));
            this.toolbarElement.appendChild(button);
        });
    }

    _handleToolbarAction(action) {
        switch (action) {
            case 'addNode': {
                const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
                const cam = camPlugin?.getCameraInstance();
                let nodePos = { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100, z: 0 };
                if (cam) {
                    const camPos = new THREE.Vector3();
                    const camDir = new THREE.Vector3();
                    cam.getWorldPosition(camPos);
                    cam.getWorldDirection(camDir);
                    const distanceInFront = 300;
                    const targetPos = camPos.add(camDir.multiplyScalar(distanceInFront));
                    nodePos = { x: targetPos.x, y: targetPos.y, z: 0 };
                }
                this.space.emit('ui:request:createNode', {
                    type: 'html',
                    position: nodePos,
                    data: { label: 'New Node', content: 'Edit me!' },
                });
                break;
            }
            case 'centerView':
                this.space.emit('ui:request:centerView');
                break;
            case 'resetView':
                this.space.emit('ui:request:resetView');
                break;
            case 'toggleTheme': {
                document.body.classList.toggle('theme-light');
                const currentTheme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
                localStorage.setItem('spacegraph-theme', currentTheme);
                this.space.emit('theme:changed', { theme: currentTheme });
                break;
            }
            default:
            // console.warn('Toolbar: Unknown action:', action);
        }
    }

    dispose() {
        if (this.toolbarElement) {
            // Remove all event listeners by recreating the element or iterating
            // For simplicity, just clear innerHTML and nullify reference
            this.toolbarElement.innerHTML = '';
            this.toolbarElement = null;
        }
        this.space = null;
    }
}
