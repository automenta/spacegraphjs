import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { CSS3DObject } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/renderers/CSS3DRenderer.js';

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
        this.shapeMesh = mesh; // Keep a reference for scaling

        if (this.data.label) {
            this.createLabel(this.data.label);
        }
        this.createResizeHandle();
    }

    createResizeHandle() {
        const handleSize = 4;
        const handleGeometry = new THREE.BoxGeometry(handleSize, handleSize, handleSize);
        const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.name = 'resizeHandle';

        const size = this.data.size || 10;
        const scale = this.data.scale || 1;
        handle.position.set(size * scale, -size * scale, 0);

        this.object.add(handle);
        this.resizeHandle = handle;
    }

    setScale(scale) {
        if (this.type === 'shape' && this.shapeMesh) {
            this.shapeMesh.scale.set(scale, scale, scale);
            this.data.scale = scale;

            const size = this.data.size || 10;
            this.resizeHandle.position.set(size * scale, -size * scale, 0);

            // Also scale the label
            const label = this.object.children.find(c => c.type === 'Sprite');
            if (label) {
                label.position.y = (size * scale) + 20;
            }
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
        // This is important to allow interaction with the content of the node
        element.style.pointerEvents = 'auto';

        const cssObject = new CSS3DObject(element);
        this.object.add(cssObject);

        // Add an invisible plane for raycasting, sized to the HTML content
        const width = this.data.width || 200; // default width
        const height = this.data.height || 100; // default height
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geometry, material);
        this.object.add(mesh);
    }
}
