import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

export class Node {
    constructor(config, space) {
        this.id = config.id;
        this.type = config.type || 'shape';
        this.data = config.data || {};
        this.space = space;
        this.object = new THREE.Object3D();

        this.createVisuals();

        if (config.position) {
            this.object.position.set(config.position.x, config.position.y, config.position.z);
        }
    }

    createVisuals() {
        if (this.type === 'shape') {
            this.createShape();
        } else if (this.type === 'html') {
            this.createHtml();
        }
    }

    createShape() {
        const size = this.data.size || 10;
        const color = this.data.color || 0xffffff;
        const geometry = new THREE.SphereGeometry(size, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        this.object.add(mesh);

        if (this.data.label) {
            this.createLabel(this.data.label);
        }
    }

    createLabel(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = '24px Arial';
        const textWidth = context.measureText(text).width;

        canvas.width = textWidth;
        canvas.height = 28;

        context.font = '24px Arial';
        context.fillStyle = 'rgba(255, 255, 255, 1.0)';
        context.fillText(text, 0, 22);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);

        sprite.scale.set(textWidth, 28, 1.0);
        sprite.position.y = (this.data.size || 10) + 20;

        this.object.add(sprite);
    }

    createHtml() {
        const element = document.createElement('div');
        element.innerHTML = this.data.content;
        element.className = 'node-html-content';
        // Allow interactions with this specific HTML element
        element.style.pointerEvents = 'auto';

        const cssObject = new CSS3DObject(element);
        this.object.add(cssObject);
    }
}
