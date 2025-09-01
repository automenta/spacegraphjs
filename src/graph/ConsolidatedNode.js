import * as THREE from "three";
import { CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import { BaseNode } from "./BaseNode.js";
import {
  applyLabelLOD,
  createCSS3DLabelObject,
} from "../rendering/LabelManager.js";

// Consolidated node class that handles multiple node types
export class ConsolidatedNode extends BaseNode {
  static typeName = "consolidated";

  constructor(id, position, data = {}, mass = 1.0) {
    super(id, position, data, mass);

    // Determine node type from data
    const nodeType = data.type || "shape";

    // Create appropriate visual representation based on type
    switch (nodeType) {
      case "html":
        this._createHtmlNode();
        break;
      case "image":
        this._createImageNode();
        break;
      case "video":
        this._createVideoNode();
        break;
      case "iframe":
        this._createIFrameNode();
        break;
      case "group":
        this._createGroupNode();
        break;
      case "note":
        this._createNoteNode();
        break;
      case "shape":
      default:
        this._createShapeNode();
        break;
    }

    if (this.data.label) {
      this.labelObject = this._createLabel();
    }
    this.update();
    this.updateBoundingSphere();
  }

  _createHtmlNode() {
    // Create HTML node representation
    this.htmlElement = this._createElement();
    this.cssObject = new CSS3DObject(this.htmlElement);
    this.cssObject.userData = { nodeId: this.id, type: "html-node" };
  }

  _createShapeNode() {
    // Create shape node representation
    const shape = this.data.shape || "sphere";
    const size = this.data.size || 50;
    const color = this.data.color || 0xffffff;

    let geometry;
    switch (shape) {
      case "box":
        geometry = new THREE.BoxGeometry(size, size, size);
        break;
      case "sphere":
      default:
        geometry = new THREE.SphereGeometry(size / 2, 32, 16);
        break;
    }

    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.1,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData = { nodeId: this.id, type: "shape-node" };
  }

  _createImageNode() {
    // Create image node representation
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: this.data.color || 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData = { nodeId: this.id, type: "image-node" };

    // Load image if URL provided
    if (this.data.imageUrl) {
      this._loadImageTexture();
    }
  }

  _createVideoNode() {
    // Create video node representation (simplified)
    this._createHtmlNode();
  }

  _createIFrameNode() {
    // Create iframe node representation (simplified)
    this._createHtmlNode();
  }

  _createGroupNode() {
    // Create group node representation (simplified)
    this._createHtmlNode();
  }

  _createNoteNode() {
    // Create note node representation (simplified)
    this._createHtmlNode();
  }

  _createElement() {
    const el = document.createElement("div");
    el.className = "node-html node-common";
    el.id = `node-html-${this.id}`;
    el.dataset.nodeId = this.id;
    el.style.width = `${this.data.width || 160}px`;
    el.style.height = `${this.data.height || 70}px`;
    el.draggable = false;
    el.ondragstart = (e) => e.preventDefault();

    el.innerHTML = `
            <div class="node-inner-wrapper">
                <div class="node-content" spellcheck="false" style="transform: scale(${this.data.contentScale || 1.0});">
                    ${this.data.content || this.data.label || ""}
                </div>
                <div class="node-controls">
                    <button class="node-quick-button node-content-zoom-in" title="Zoom In Content (+)">➕</button>
                    <button class="node-quick-button node-content-zoom-out" title="Zoom Out Content (-)">➖</button>
                    <button class="node-quick-button node-grow" title="Grow Node (Ctrl++)">↗️</button>
                    <button class="node-quick-button node-shrink" title="Shrink Node (Ctrl+-)">↙️</button>
                    <button class="node-quick-button delete-button node-delete" title="Delete Node (Del)">🗑️</button>
                </div>
            </div>
            <div class="resize-handle" title="Resize Node"></div>
        `;
    return el;
  }

  _loadImageTexture() {
    if (!this.data.imageUrl || !this.mesh) return;

    const loader = new THREE.TextureLoader();
    loader.load(
      this.data.imageUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        this.mesh.material.map = texture;
        this.mesh.material.needsUpdate = true;

        const imgAspect = texture.image.width / texture.image.height;
        let planeWidth, planeHeight;

        if (typeof this.data.size === "number") {
          const maxDim = this.data.size;
          [planeWidth, planeHeight] =
            imgAspect >= 1
              ? [maxDim, maxDim / imgAspect]
              : [maxDim * imgAspect, maxDim];
        } else {
          planeWidth = this.data.width || 100;
          planeHeight = this.data.height || 100;
        }

        this.mesh.scale.set(planeWidth, planeHeight, 1);
        this.updateBoundingSphere();
        this.space?.emit("node:updated", { node: this, property: "mesh" });
      },
      undefined,
      () => {
        this.mesh.material.color.set(0xff0000);
      },
    );
  }

  getDefaultData() {
    return {
      label: "",
      content: "",
      width: 160,
      height: 70,
      contentScale: 1.0,
      backgroundColor: "#333344",
      type: "shape",
      editable: false,
      labelLod: [],
    };
  }

  update(space) {
    super.update(space);
    // Additional update logic can be added here based on node type
  }

  dispose() {
    super.dispose();
    // Additional disposal logic can be added here based on node type
  }
}
