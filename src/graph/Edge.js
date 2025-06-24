import * as THREE from 'three';
import { Utils } from '../utils.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

export class Edge {
    static HIGHLIGHT_COLOR = 0x00ffff;
    static DEFAULT_OPACITY = 0.8; // Adjusted for potentially thicker lines
    static HIGHLIGHT_OPACITY = 1.0;
    line = null;
    arrowheads = { source: null, target: null };
    isInstanced = false; // Added for instanced rendering
    instanceId = null; // Added for instanced rendering

    // Default constraint: elastic spring
    data = {
        color: 0x00d0ff, // Default single color
        gradientColors: null, // E.g., [0xff0000, 0x0000ff] or ['#ff0000', '#0000ff']
        thickness: 3, // For Line2 (pixel units)
        thicknessInstanced: 0.5, // For InstancedEdgeManager (world units, cylinder radius)
        constraintType: 'elastic',
        constraintParams: { stiffness: 0.001, idealLength: 200 },
        arrowhead: false, // Can be true, 'source', 'target', or 'both'
        arrowheadSize: 10,
        arrowheadColor: null, // null means use edge color
    };

    constructor(id, sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode) throw new Error('Edge requires valid source and target nodes.');
        this.id = id;
        this.source = sourceNode;
        this.target = targetNode;

        // The 'type' property from 'data' might be used by subclasses (e.g. CurvedEdge).
        // If it's present in `data`, it will be merged into `this.data`.
        // For the base Edge class, it's not directly used in the constructor logic here.

        const defaultData = {
            color: 0x00d0ff,
            gradientColors: null,
            thickness: 3,
            thicknessInstanced: 0.5, // Default for instanced version
            constraintType: 'elastic',
            constraintParams: { stiffness: 0.001, idealLength: 200 },
            arrowhead: false,
            arrowheadSize: 10,
            arrowheadColor: null,
            // type: 'straight' // Default type if it were managed here
        };
        // this.data = Utils.mergeDeep({}, defaultData, restData); // If 'type' was extracted
        this.data = Utils.mergeDeep({}, defaultData, data);
        this.isInstanced = false; // Initialize instancing state
        this.instanceId = null;

        if (this.data.gradientColors && this.data.gradientColors.length === 2) {
            this.data.color = null; // Prioritize gradient if valid
        } else if (this.data.color === null) {
            this.data.color = defaultData.color; // Fallback if no gradient and no color
        }

        this.line = this._createLine();
        this._createArrowheads(); // Create arrowheads based on data
        this.update(); // This will also set initial colors and position arrowheads
    }

    _createArrowheads() {
        const arrowheadOpt = this.data.arrowhead;
        if (arrowheadOpt === true || arrowheadOpt === 'target' || arrowheadOpt === 'both') {
            this.arrowheads.target = this._createSingleArrowhead('target');
            if (this.line?.parent) this.line.parent.add(this.arrowheads.target); // Add to scene if line is already there
        }
        if (arrowheadOpt === 'source' || arrowheadOpt === 'both') {
            this.arrowheads.source = this._createSingleArrowhead('source');
            if (this.line?.parent) this.line.parent.add(this.arrowheads.source);
        }
    }

    _createLine() {
        const geometry = new LineGeometry();
        // Positions and colors will be set in update() or immediately after creation

        const materialConfig = {
            linewidth: this.data.thickness,
            transparent: true,
            opacity: Edge.DEFAULT_OPACITY,
            depthTest: false,
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
            dashed: this.data.dashed || false,
            dashScale: this.data.dashScale ?? 1,
            dashSize: this.data.dashSize ?? 3,
            gapSize: this.data.gapSize ?? 1,
        };

        if (this.data.gradientColors && this.data.gradientColors.length === 2) {
            materialConfig.vertexColors = true; // Enable vertex colors
            // Note: `color` property on material is ignored if vertexColors is true
        } else {
            materialConfig.color = this.data.color;
        }

        const material = new LineMaterial(materialConfig);
        const line = new Line2(geometry, material);

        if (material.dashed) {
            line.computeLineDistances(); // Required for dashed lines
        }
        line.renderOrder = -1;
        line.userData = { edgeId: this.id };
        return line;
    }

    _setGradientColors() {
        if (!this.line || !this.data.gradientColors || this.data.gradientColors.length !== 2) {
            // If switching from gradient to solid color, ensure vertexColors is off and material color is set
            if (this.line && this.line.material.vertexColors) {
                this.line.material.vertexColors = false;
                this.line.material.color.set(this.data.color || 0x00d0ff); // Fallback color
                this.line.material.needsUpdate = true;
            }
            // Clear any existing color attributes from geometry if necessary
            // For LineGeometry, simply not calling setColors or providing an empty array might suffice,
            // or ensure the material isn't expecting vertex colors.
            // The above vertexColors = false should handle it.
            return;
        }

        if (!this.line.material.vertexColors) {
            this.line.material.vertexColors = true;
            this.line.material.needsUpdate = true; // Crucial when changing material properties
        }

        const colorStart = new THREE.Color(this.data.gradientColors[0]);
        const colorEnd = new THREE.Color(this.data.gradientColors[1]);

        const colors = [];
        // For a simple line (source to target), we provide two colors.
        // LineGeometry expects colors for each *vertex* of the segments.
        // A single line segment in LineGeometry is made of two points,
        // and it interpolates colors between them if vertexColors is true.
        // The setColors method for LineGeometry takes a flat array for all points.
        // If the geometry has N points, it needs N*3 color values.
        // For a line with just a start and end point (2 points), we need 6 color values.
        colors.push(colorStart.r, colorStart.g, colorStart.b);
        colors.push(colorEnd.r, colorEnd.g, colorEnd.b);

        // If the line has more than 2 points (e.g. CurvedEdge), this needs adjustment.
        // For base Edge.js, it's always 2 points.
        // CurvedEdge will need to override this part if it wants a gradient over many segments.

        this.line.geometry.setColors(colors);
        this.line.geometry.attributes.instanceColorStart.needsUpdate = true;
        this.line.geometry.attributes.instanceColorEnd.needsUpdate = true;
    }

    update() {
        if (!this.line || !this.source || !this.target) return;

        const positions = [
            this.source.position.x,
            this.source.position.y,
            this.source.position.z,
            this.target.position.x,
            this.target.position.y,
            this.target.position.z,
        ];
        this.line.geometry.setPositions(positions);

        if (this.data.gradientColors && this.data.gradientColors.length === 2) {
            this._setGradientColors();
        } else {
            // Ensure no gradient if not specified (e.g., if it was previously a gradient)
            // This might involve setting material.vertexColors = false and material.color if state changed.
            // _setGradientColors() handles turning off vertexColors if gradientColors is invalid.
            // We also need to ensure the single color is correctly applied if switching from gradient.
            if (this.line.material.vertexColors) {
                // Was gradient, now isn't
                this.line.material.vertexColors = false;
                this.line.material.needsUpdate = true;
            }
            this.line.material.color.set(this.data.color); // Set solid color
        }

        if (this.line.material.dashed) {
            // Recompute if dashed (might be needed if positions change significantly)
            this.line.computeLineDistances();
        }
        // this.line.geometry.attributes.position.needsUpdate = true; // setPositions should handle this.
        this.line.geometry.computeBoundingSphere();

        this._updateArrowheads();
    }

    _updateArrowheads() {
        const sourcePos = this.source.position;
        const targetPos = this.target.position;

        if (this.arrowheads.target) {
            this.arrowheads.target.position.copy(targetPos);
            const direction = new THREE.Vector3().subVectors(targetPos, sourcePos).normalize();
            this._orientArrowhead(this.arrowheads.target, direction);
        }

        if (this.arrowheads.source) {
            this.arrowheads.source.position.copy(sourcePos);
            const direction = new THREE.Vector3().subVectors(sourcePos, targetPos).normalize(); // Reversed direction
            this._orientArrowhead(this.arrowheads.source, direction);
        }
    }

    _orientArrowhead(arrowheadMesh, direction) {
        if (!arrowheadMesh) return;
        if (direction.lengthSq() > 0.0001) {
            // Ensure not zero vector
            const quaternion = new THREE.Quaternion();
            const up = new THREE.Vector3(0, 1, 0); // Default orientation of ConeGeometry is along Y axis
            quaternion.setFromUnitVectors(up, direction);
            arrowheadMesh.quaternion.copy(quaternion);
        }
    }

    _createSingleArrowhead(_type) {
        // _type is 'source' or 'target' for potential differentiation (currently unused for geometry/material)
        const size = this.data.arrowheadSize || 10;
        // A cone is a common choice for an arrowhead
        // ConeGeometry(radius, height, radialSegments)
        const geometry = new THREE.ConeGeometry(size / 2, size, 8);
        // Rotate the cone so its tip points along the positive Y axis if default is different,
        // or adjust quaternion logic in update(). Default Cone points along +Y.

        const material = new THREE.MeshBasicMaterial({
            color: this.data.arrowheadColor || this.data.color,
            opacity: Edge.DEFAULT_OPACITY, // Match line opacity
            transparent: true,
            depthTest: false, // Render slightly "on top"
        });
        const arrowhead = new THREE.Mesh(geometry, material);
        arrowhead.renderOrder = this.line.renderOrder + 1; // Render after the line
        arrowhead.userData = { edgeId: this.id, type: 'edge-arrowhead' };
        return arrowhead;
    }

    setHighlight(highlight) {
        if (!this.line?.material) return;
        const mat = this.line.material;
        mat.opacity = highlight ? Edge.HIGHLIGHT_OPACITY : Edge.DEFAULT_OPACITY;
        mat.color.set(highlight ? Edge.HIGHLIGHT_COLOR : this.data.color); // Note: This won't work for gradient edges as color is from vertexColors
        mat.linewidth = highlight ? this.data.thickness * 1.5 : this.data.thickness; // Adjust thickness on highlight
        mat.needsUpdate = true;

        const highlightArrowhead = (arrowhead) => {
            if (arrowhead?.material) {
                arrowhead.material.color.set(
                    highlight ? Edge.HIGHLIGHT_COLOR : this.data.arrowheadColor || this.data.color
                );
                arrowhead.material.opacity = highlight ? Edge.HIGHLIGHT_OPACITY : Edge.DEFAULT_OPACITY;
                // Optionally scale arrowhead on highlight
                // const scale = highlight ? 1.2 : 1;
                // arrowhead.scale.set(scale, scale, scale);
            }
        };

        highlightArrowhead(this.arrowheads.source);
        highlightArrowhead(this.arrowheads.target);
    }

    // Call this if the window resizes, or ensure RenderingPlugin does.
    // For now, RenderingPlugin's resize handling should propagate to LineMaterial via renderer updates if it's automatic.
    // If not, EdgePlugin might need to call this on its edges.
    // For simplicity, direct call if needed, or rely on three.js internals.
    updateResolution(width, height) {
        if (this.line?.material) {
            this.line.material.resolution.set(width, height);
        }
    }

    dispose() {
        if (this.line) {
            this.line.geometry?.dispose();
            this.line.material?.dispose();
            this.line.parent?.remove(this.line);
            this.line = null;
        }

        const disposeArrowhead = (arrowhead) => {
            if (arrowhead) {
                arrowhead.geometry?.dispose();
                arrowhead.material?.dispose();
                arrowhead.parent?.remove(arrowhead);
            }
        };

        disposeArrowhead(this.arrowheads.source);
        this.arrowheads.source = null;
        disposeArrowhead(this.arrowheads.target);
        this.arrowheads.target = null;
    }
}
