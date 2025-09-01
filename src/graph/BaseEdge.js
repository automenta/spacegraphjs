import * as THREE from "three";
import { Utils } from "../utils.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import {
  applyLabelLOD,
  createCSS3DLabelObject,
} from "../rendering/LabelManager.js";

/**
 * Base class for all edge types, providing common functionality
 */
export class BaseEdge {
  static HIGHLIGHT_COLOR = 0x00ffff;
  static DEFAULT_OPACITY = 0.8;
  static HIGHLIGHT_OPACITY = 1.0;
  static DEFAULT_HOVER_OPACITY_BOOST = 0.1;
  static DEFAULT_HOVER_THICKNESS_MULTIPLIER = 1.1;

  id = null;
  source = null;
  target = null;
  line = null;
  arrowheads = { source: null, target: null };
  isInstanced = false;
  instanceId = null;
  isHighlighted = false;
  isHovered = false;
  data = {};
  space = null;
  labelObject = null;

  // Pre-allocate THREE.Color instances for performance
  _colorStart = new THREE.Color();
  _colorEnd = new THREE.Color();

  constructor(id, sourceNode, targetNode, data = {}) {
    if (!sourceNode || !targetNode)
      throw new Error("Edge requires valid source and target nodes.");

    this.id = id;
    this.source = sourceNode;
    this.target = targetNode;

    const defaultData = {
      color: 0x00d0ff,
      gradientColors: null,
      thickness: 3,
      thicknessInstanced: 0.5,
      constraintType: "elastic",
      constraintParams: { stiffness: 0.001, idealLength: 200 },
      arrowhead: false,
      arrowheadSize: 10,
      arrowheadColor: null,
    };

    this.data = Utils.mergeDeep({}, defaultData, data);
    this.isInstanced = false;
    this.instanceId = null;

    if (this.data.gradientColors?.length === 2) {
      this.data.color = null; // Ensure color is null if gradient is used
    } else if (this.data.color === null) {
      this.data.color = defaultData.color; // Fallback if color is explicitly null but no gradient
    }

    this.line = this._createLine();
    this._createArrowheads();

    if (this.data.label) {
      this.labelObject = this._createLabel();
    }

    this.update();
  }

  /**
   * Creates the line geometry and material for the edge
   * @returns {Line2} The created line object
   * @protected
   */
  _createLine() {
    const geometry = new LineGeometry();
    geometry.setPositions([0, 0, 0, 0, 0, 0.001]);

    const materialConfig = {
      linewidth: this.data.thickness,
      transparent: true,
      opacity: BaseEdge.DEFAULT_OPACITY,
      depthTest: false,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      dashed: this.data.dashed || false,
      dashScale: this.data.dashScale ?? 1,
      dashSize: this.data.dashSize ?? 3,
      gapSize: this.data.gapSize ?? 1,
    };

    if (this.data.gradientColors?.length === 2) {
      materialConfig.vertexColors = true;
      this._colorStart.set(this.data.gradientColors[0]);
      this._colorEnd.set(this.data.gradientColors[1]);
      geometry.setColors([
        this._colorStart.r,
        this._colorStart.g,
        this._colorStart.b,
        this._colorEnd.r,
        this._colorEnd.g,
        this._colorEnd.b,
      ]);
    } else {
      materialConfig.vertexColors = false;
      materialConfig.color = this.data.color || 0x00d0ff;
    }

    const material = new LineMaterial(materialConfig);
    const line = new Line2(geometry, material);

    if (material.dashed) line.computeLineDistances();
    line.renderOrder = -1;
    line.userData = { edgeId: this.id };
    return line;
  }

  /**
   * Creates arrowheads for the edge based on configuration
   * @protected
   */
  _createArrowheads() {
    const arrowheadOpt = this.data.arrowhead;
    if (
      arrowheadOpt === true ||
      arrowheadOpt === "target" ||
      arrowheadOpt === "both"
    ) {
      this.arrowheads.target = this._createSingleArrowhead("target");
    }
    if (arrowheadOpt === "source" || arrowheadOpt === "both") {
      this.arrowheads.source = this._createSingleArrowhead("source");
    }
  }

  /**
   * Creates a single arrowhead
   * @param {string} type - The type of arrowhead ('source' or 'target')
   * @returns {THREE.Mesh} The created arrowhead mesh
   * @protected
   */
  _createSingleArrowhead(type) {
    const size = this.data.arrowheadSize || 10;
    const geometry = new THREE.ConeGeometry(size / 2, size, 8);
    const material = new THREE.MeshBasicMaterial({
      color: this.data.arrowheadColor || this.data.color,
      opacity: BaseEdge.DEFAULT_OPACITY,
      transparent: true,
      depthTest: false,
    });
    const arrowhead = new THREE.Mesh(geometry, material);
    arrowhead.renderOrder = this.line.renderOrder + 1;
    arrowhead.userData = { edgeId: this.id, type: "edge-arrowhead" };
    return arrowhead;
  }

  /**
   * Updates the edge's visual representation
   */
  update() {
    if (!this.line || !this.source || !this.target) return;

    const sourcePos = this.source.position;
    const targetPos = this.target.position;

    if (
      !isFinite(sourcePos.x) ||
      !isFinite(sourcePos.y) ||
      !isFinite(sourcePos.z) ||
      !isFinite(targetPos.x) ||
      !isFinite(targetPos.y) ||
      !isFinite(targetPos.z)
    ) {
      return;
    }

    this.line.geometry.setPositions([
      sourcePos.x,
      sourcePos.y,
      sourcePos.z,
      targetPos.x,
      targetPos.y,
      targetPos.z,
    ]);

    if (this.line.geometry.attributes.position.count === 0) return;

    this._setGradientColors(); // Call the optimized method

    if (this.line.material.dashed) this.line.computeLineDistances();
    this.line.geometry.computeBoundingSphere();

    this._updateArrowheads();
    this._updateLabelPosition();
  }

  /**
   * Updates arrowhead positions and orientations
   * @protected
   */
  _updateArrowheads() {
    const sourcePos = this.source.position;
    const targetPos = this.target.position;

    if (this.arrowheads.target) {
      this.arrowheads.target.position.copy(targetPos);
      const direction = new THREE.Vector3()
        .subVectors(targetPos, sourcePos)
        .normalize();
      this._orientArrowhead(this.arrowheads.target, direction);
    }

    if (this.arrowheads.source) {
      this.arrowheads.source.position.copy(sourcePos);
      const direction = new THREE.Vector3()
        .subVectors(sourcePos, targetPos)
        .normalize();
      this._orientArrowhead(this.arrowheads.source, direction);
    }
  }

  /**
   * Orients an arrowhead to point in the specified direction
   * @param {THREE.Mesh} arrowhead - The arrowhead mesh
   * @param {THREE.Vector3} direction - The direction vector
   * @protected
   */
  _orientArrowhead(arrowhead, direction) {
    const coneUp = new THREE.Vector3(0, 1, 0);
    arrowhead.quaternion.setFromUnitVectors(coneUp, direction);
  }

  /**
   * Sets gradient colors on the line material
   * @protected
   */
  _setGradientColors() {
    if (!this.line || !this.line.material) return;

    if (this.data.gradientColors?.length === 2) {
      if (!this.line.material.vertexColors) {
        this.line.material.vertexColors = true;
        this.line.material.needsUpdate = true;
      }

      this._colorStart.set(this.data.gradientColors[0]);
      this._colorEnd.set(this.data.gradientColors[1]);

      const colors = this.line.geometry.attributes.color?.array || [];
      if (colors.length >= 6) {
        // Ensure array is large enough for at least 2 points (6 components)
        colors[0] = this._colorStart.r;
        colors[1] = this._colorStart.g;
        colors[2] = this._colorStart.b;
        colors[3] = this._colorEnd.r;
        colors[4] = this._colorEnd.g;
        colors[5] = this._colorEnd.b;
        this.line.geometry.attributes.color.needsUpdate = true;
      } else {
        // If geometry has more points, interpolate colors for all points
        const posAttribute = this.line.geometry.attributes.position;
        if (posAttribute) {
          const numPoints = posAttribute.count;
          const newColors = new Float32Array(numPoints * 3);
          for (let i = 0; i < numPoints; i++) {
            const t = numPoints > 1 ? i / (numPoints - 1) : 0;
            const interpolatedColor = this._colorStart
              .clone()
              .lerp(this._colorEnd, t);
            newColors[i * 3] = interpolatedColor.r;
            newColors[i * 3 + 1] = interpolatedColor.g;
            newColors[i * 3 + 2] = interpolatedColor.b;
          }
          this.line.geometry.setColors(newColors);
        }
      }
    } else {
      if (this.line.material.vertexColors) {
        this.line.material.vertexColors = false;
        this.line.material.needsUpdate = true;
      }
      this.line.material.color.set(this.data.color || 0x00d0ff);
    }
  }

  /**
   * Creates a label for the edge
   * @returns {CSS3DObject} The created label object
   * @protected
   */
  _createLabel() {
    const styleData = {
      color: this.data.labelColor || "var(--sg-edge-label-text, white)",
      backgroundColor:
        this.data.labelBackgroundColor ||
        "var(--sg-edge-label-bg, rgba(0,0,0,0.6))",
      padding: "2px 5px",
      borderRadius: "3px",
      fontSize: this.data.labelFontSize || "12px",
    };
    return createCSS3DLabelObject(
      this.data.label,
      this.id,
      "edge-label",
      styleData,
      "edge-label",
    );
  }

  /**
   * Updates the label position
   * @protected
   */
  _updateLabelPosition() {
    if (this.labelObject) {
      const sourcePos = this.source.position;
      const targetPos = this.target.position;
      this.labelObject.position
        .addVectors(sourcePos, targetPos)
        .multiplyScalar(0.5);

      if (this.space?._cam)
        this.labelObject.quaternion.copy(this.space._cam.quaternion);
      applyLabelLOD(this.labelObject, this.data.labelLod, this.space);
    }
  }

  /**
   * Sets the highlight state for the edge
   * @param {boolean} highlight - Whether to highlight the edge
   */
  setHighlight(highlight) {
    this.isHighlighted = highlight;
    if (!this.line?.material) return;
    const mat = this.line.material;
    mat.opacity = highlight
      ? BaseEdge.HIGHLIGHT_OPACITY
      : BaseEdge.DEFAULT_OPACITY;

    const thicknessMultiplier =
      this.data.gradientColors?.length === 2 && mat.vertexColors ? 2.0 : 1.5;
    mat.linewidth = highlight
      ? this.data.thickness * thicknessMultiplier
      : this.data.thickness;

    if (!mat.vertexColors)
      mat.color.set(highlight ? BaseEdge.HIGHLIGHT_COLOR : this.data.color);
    mat.needsUpdate = true;

    const highlightArrowhead = (arrowhead) => {
      if (arrowhead?.material) {
        arrowhead.material.color.set(
          highlight
            ? BaseEdge.HIGHLIGHT_COLOR
            : this.data.arrowheadColor || this.data.color,
        );
        arrowhead.material.opacity = highlight
          ? BaseEdge.HIGHLIGHT_OPACITY
          : BaseEdge.DEFAULT_OPACITY;
      }
    };
    highlightArrowhead(this.arrowheads.source);
    highlightArrowhead(this.arrowheads.target);

    if (highlight && this.isHovered) this.setHoverStyle(false, true);

    // Highlight label if it exists
    this.labelObject?.element?.classList.toggle("selected", highlight);
  }

  /**
   * Sets the hover style for the edge
   * @param {boolean} hovered - Whether the edge is hovered
   * @param {boolean} force - Whether to force the hover state
   */
  setHoverStyle(hovered, force = false) {
    if (!force && this.isHighlighted) return;
    if (!this.line?.material) return;

    this.isHovered = hovered;

    const mat = this.line.material;
    const baseOpacity = BaseEdge.DEFAULT_OPACITY;
    const baseThickness = this.data.thickness;

    mat.opacity = hovered
      ? Math.min(1.0, baseOpacity + BaseEdge.DEFAULT_HOVER_OPACITY_BOOST)
      : baseOpacity;
    mat.linewidth = hovered
      ? baseThickness * BaseEdge.DEFAULT_HOVER_THICKNESS_MULTIPLIER
      : baseThickness;
    mat.needsUpdate = true;

    const hoverArrowhead = (arrowhead) => {
      if (arrowhead?.material) {
        const arrowBaseOpacity = BaseEdge.DEFAULT_OPACITY;
        arrowhead.material.opacity = hovered
          ? Math.min(
              1.0,
              arrowBaseOpacity + BaseEdge.DEFAULT_HOVER_OPACITY_BOOST,
            )
          : arrowBaseOpacity;
      }
    };
    if (!this.isHighlighted) {
      hoverArrowhead(this.arrowheads.source);
      hoverArrowhead(this.arrowheads.target);
    }

    // Hover effect on label if it exists
    if (!this.isHighlighted) {
      this.labelObject?.element?.classList.toggle("hovered", hovered);
    }
  }

  /**
   * Updates the resolution for the line material
   * @param {number} width - Width of the rendering area
   * @param {number} height - Height of the rendering area
   */
  updateResolution(width, height) {
    if (this.line?.material) this.line.material.resolution.set(width, height);
  }

  /**
   * Disposes of the edge's resources
   */
  dispose() {
    this.line?.geometry?.dispose();
    this.line?.material?.dispose();
    this.line?.parent?.remove(this.line);
    this.line = null;

    const disposeArrowhead = (arrowhead) => {
      arrowhead?.geometry?.dispose();
      arrowhead?.material?.dispose();
      arrowhead?.parent?.remove(arrowhead);
    };
    disposeArrowhead(this.arrowheads.source);
    this.arrowheads.source = null;
    disposeArrowhead(this.arrowheads.target);
    this.arrowheads.target = null;

    // Dispose of label
    this.labelObject?.element?.remove();
    this.labelObject?.parent?.remove(this.labelObject);
    this.labelObject = null;
  }
}
