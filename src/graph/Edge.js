import * as THREE from 'three';
import { Utils } from '../utils.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

export class Edge {
    static HIGHLIGHT_COLOR = 0x00ffff;
    static DEFAULT_OPACITY = 0.8; // Adjusted for potentially thicker lines
    static HIGHLIGHT_OPACITY = 1.0;
    static DEFAULT_HOVER_OPACITY_BOOST = 0.1; // How much to increase opacity for hover
    static DEFAULT_HOVER_THICKNESS_MULTIPLIER = 1.1; // How much to scale thickness for hover

    line = null;
    arrowheads = { source: null, target: null };
    isInstanced = false; // Added for instanced rendering
    instanceId = null; // Added for instanced rendering
    isHighlighted = false; // For selection state
    isHovered = false; // For hover state

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
        // Fix B2: Initialize with placeholder positions to ensure attributes exist and are valid.
        // Use slightly offset points to ensure non-zero length for initial bounding sphere.
        const placeholderPositions = [0,0,0, 0,0,0.001];
        geometry.setPositions(placeholderPositions);

        // Fix B2: If default is gradient and material expects vertex colors, set placeholder colors.
        // This requires materialConfig.vertexColors to be true for this to be effective.
        if (this.data.gradientColors && this.data.gradientColors.length === 2) {
            const colorStart = new THREE.Color(this.data.gradientColors[0]);
            const colorEnd = new THREE.Color(this.data.gradientColors[1]);
            const placeholderColors = [colorStart.r, colorStart.g, colorStart.b, colorEnd.r, colorEnd.g, colorEnd.b];
            // Note: Material must also have vertexColors = true for LineGeometry.setColors to work as expected.
            // We'll ensure this when creating the material.
            geometry.setColors(placeholderColors); // This should be safe now.
        }

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
            // Ensure placeholder colors were set if this path is taken.
            // Note: `color` property on material is ignored if vertexColors is true
        } else {
            materialConfig.vertexColors = false; // Explicitly false if not gradient
            materialConfig.color = this.data.color || 0x00d0ff; // Ensure color is set
        }

        const material = new LineMaterial(materialConfig);
        // If we set placeholder colors, ensure material's vertexColors is true.
        // The materialConfig should handle this. If geometry.setColors was called, material.vertexColors must be true.

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

        // Fix B1: Strengthen guard for setColors
        const posAttribute = this.line.geometry.attributes.position;
        const expectedMinLength = 6; // For Edge.js: 1 segment, 2 points, 3 floats/point

        if (posAttribute && typeof posAttribute.count === 'number' && posAttribute.count >= 2 && // Need at least 2 points for a line
            posAttribute.array && typeof posAttribute.array.length === 'number' &&
            posAttribute.array.length >= expectedMinLength && posAttribute.array.length % 3 === 0) {

            this.line.geometry.setColors(colors);
            if (this.line.geometry.attributes.instanceColorStart) this.line.geometry.attributes.instanceColorStart.needsUpdate = true;
            if (this.line.geometry.attributes.instanceColorEnd) this.line.geometry.attributes.instanceColorEnd.needsUpdate = true;
        } else {
            console.warn(`Edge ${this.id} (${this.constructor.name}): Skipping setColors in _setGradientColors due to missing/empty/invalid geometry positions.
                Count: ${posAttribute?.count}, Array Length: ${posAttribute?.array?.length}, Expected Min Length: ${expectedMinLength}`);
        }
    }

    update() {
        if (!this.line || !this.source || !this.target) return;

        // Fix A3: Check for NaN positions in source/target nodes
        const sourcePos = this.source.position;
        const targetPos = this.target.position;

        if (!isFinite(sourcePos.x) || !isFinite(sourcePos.y) || !isFinite(sourcePos.z) ||
            !isFinite(targetPos.x) || !isFinite(targetPos.y) || !isFinite(targetPos.z)) {
            console.warn(`Edge ${this.id}: Source or target node has NaN position. Skipping update. Source: (${sourcePos.x},${sourcePos.y},${sourcePos.z}), Target: (${targetPos.x},${targetPos.y},${targetPos.z})`);
            // Optionally hide the edge or set to a degenerate state to avoid rendering stale info
            // this.line.visible = false; // Or set positions to [0,0,0,0,0,0]
            return;
        }
        // this.line.visible = true; // Ensure visible if previously hidden due to NaN

        const positions = [
            sourcePos.x, sourcePos.y, sourcePos.z,
            targetPos.x, targetPos.y, targetPos.z,
        ];
        this.line.geometry.setPositions(positions);

        // Ensure the geometry is valid before proceeding to color or bounding sphere computation
        if (this.line.geometry.attributes.position.count === 0) return; // Should not happen if positions were just set with valid data

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
        this.isHighlighted = highlight; // Set the state
        if (!this.line?.material) return;
        const mat = this.line.material;
        mat.opacity = highlight ? Edge.HIGHLIGHT_OPACITY : Edge.DEFAULT_OPACITY;

        let thicknessMultiplier = 1.5;
        // For gradient edges, since color doesn't change, make thickness more pronounced.
        if (this.data.gradientColors && this.data.gradientColors.length === 2 && mat.vertexColors) {
            thicknessMultiplier = 2.0;
        }
        mat.linewidth = highlight ? this.data.thickness * thicknessMultiplier : this.data.thickness;

        // Only set mat.color directly if not using vertexColors (i.e., not a gradient edge)
        if (!mat.vertexColors) {
            mat.color.set(highlight ? Edge.HIGHLIGHT_COLOR : this.data.color);
        }
        // For gradient edges, the color aspect of highlight is handled by arrowheads changing color,
        // and the line itself becoming more prominent through opacity and thickness.

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

        // If highlighted, ensure hover effect is off or overridden
        if (highlight && this.isHovered) {
            this.setHoverStyle(false, true); // Force remove hover style
        }
    }

    setHoverStyle(hovered, force = false) {
        if (!force && this.isHighlighted) return; // Don't apply hover if already highlighted, unless forced
        if (!this.line?.material) return;

        this.isHovered = hovered;

        const mat = this.line.material;
        const baseOpacity = Edge.DEFAULT_OPACITY; // Could also be this.data.opacity if edges have individual base opacities
        const baseThickness = this.data.thickness;

        if (hovered) {
            mat.opacity = Math.min(1.0, baseOpacity + Edge.DEFAULT_HOVER_OPACITY_BOOST);
            mat.linewidth = baseThickness * Edge.DEFAULT_HOVER_THICKNESS_MULTIPLIER;
        } else {
            // Revert to non-hovered state (which is default, unless it's selected)
            // If selected, setHighlight would have set the correct values.
            // This path is primarily for un-hovering an unselected item.
            mat.opacity = baseOpacity;
            mat.linewidth = baseThickness;
        }

        mat.needsUpdate = true;

        const hoverArrowhead = (arrowhead) => {
            if (arrowhead?.material) {
                const arrowBaseOpacity = Edge.DEFAULT_OPACITY; // Assuming arrowheads share base opacity
                arrowhead.material.opacity = hovered
                    ? Math.min(1.0, arrowBaseOpacity + Edge.DEFAULT_HOVER_OPACITY_BOOST)
                    : arrowBaseOpacity;
                // Optionally, slightly scale arrowheads on hover if desired:
                // const scale = hovered ? 1.05 : 1;
                // arrowhead.scale.set(scale, scale, scale);
            }
        };

        if (!this.isHighlighted) { // Only apply hover visual changes if not selected
            hoverArrowhead(this.arrowheads.source);
            hoverArrowhead(this.arrowheads.target);
        }
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
