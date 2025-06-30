# TODO: Unified Fractal Interaction System

This document outlines the vision, principles, planned features, and open questions for the Unified Fractal Interaction System. Its purpose is to guide future iterations and development.

## 1. Overall Vision

To create a revolutionary 3D interaction system for manipulating objects within SpaceGraph. This system will be:

- **Ergonomic:** Minimizing physical and cognitive strain.
- **Intuitive:** Easy to learn, predictable, and natural to use.
- **Precise:** Allowing for both broad and fine-grained adjustments.
- **Smooth:** Providing fluid visual feedback and responsive interactions.
- **Visually Clear & Unobtrusive:** Offering powerful controls without overwhelming the user or occluding the workspace unnecessarily.

It aims to replace current disparate interaction mechanisms with a single, cohesive, and contextually adaptive interface based on fractal geometry and semantic zooming.

## 2. Core Principles

- **Fractal UI Elements:** Interactions are mediated through UI elements that exhibit fractal characteristics (self-similarity, recursive detail, organic/geometric growth).
- **Contextual Emergence:** The UI appears and adapts based on user selection and focus.
- **Semantic Zooming:** Zooming into parts of the fractal UI reveals more detailed controls, options, or information, managing complexity.
- **Unified Interaction Model:** A single paradigm for transformations (move, rotate, scale) and contextual actions (edit, link, delete, etc.).
- **Discoverability:** Users should be able to explore and understand the UI's capabilities organically.
- **Performance:** Real-time interactivity is paramount.

## 3. Key UX Flow Stages

1.  **Object Selection & UI Activation:**
    - Single/Multi-selection of nodes.
    - Appearance of a central **Adaptive Geometric Hub (AGH)**.
2.  **Primary Mode Access (via AGH):**
    - Hovering/Clicking AGH reveals primary **Mode Branches (MBs)** (e.g., Transform, Actions, Properties).
3.  **Tool Fractal (TF) Interaction:**
    - Selecting an MB expands it into specific **Tool Fractals (TFs)** (e.g., Fractal Axis Manipulators for translation, Fractal Ring Manipulators for rotation, Fractal Cube Manipulators for scaling).
    - Direct manipulation of TFs to affect selected node(s).
4.  **Semantic Zoom for Precision:**
    - User can "zoom into" components of a TF to access finer-grained controls, numerical inputs, or modifiers. The TF visually transforms to reveal these details.
5.  **Multi-Object Handling:**
    - Transformations applied coherently to groups of objects around a common pivot (the AGH).
6.  **General UI Behavior:**
    - Smooth animated transitions for all UI appearances/disappearances/transformations.
    - Clear visual feedback for hover, active, and selection states.
    - Easy "escape" or "back" functionality to navigate UI hierarchy.

## 4. Visual Design Aspirations

- **AGH/MB/TF Themes:** Adaptive geometric structures (e.g., polyhedral, crystalline) or bio-inspired forms (e.g., unfolding blossoms, branching tendrils) that communicate function through form.
- **Aesthetics:** Ethereal, luminous, semi-transparent materials to be informative yet unobtrusive.
- **Animation:** Fluid, purposeful animations for UI element growth, transformation, and feedback.
- **Color-Coding:** Use of color to distinguish axes (XYZ), modes, or states, while maintaining overall visual harmony.
- **Fractal Geometry:** Exploration of L-Systems, recursive geometric construction, or simple IFS for generating UI elements. Level of Detail (LOD) is critical for performance and clarity.

## 5. Planned Features & Functionality (Future Iterations)

This represents a roadmap beyond the initial prototype.

- **Phase 2 - Prototyping (Ongoing):**

    - [x] Basic AGH and Fractal Axis Manipulator (lines/cylinders) geometry.
    - [x] AGH appearance on single node select.
    - [x] Basic X-axis translation via manipulator drag.
    - [x] Placeholder for semantic zoom on axis (console log, temporary visual change).
    - [ ] **Iteration 1 (based on upcoming testing):**
        - Refine AGH activation (e.g., click-to-open MBs).
        - Improve manipulator grab-points and hover feedback.
        - Implement a more concrete semantic zoom visual change for one axis.
        - Full XYZ translation.
    - [ ] **Iteration 2:**
        - Introduce basic Fractal Ring Manipulators for Y-axis rotation.
        - Semantic zoom for rotation (e.g., show degree markers).
    - [ ] **Iteration 3:**
        - Introduce basic Fractal Cube Manipulators for uniform scale.
        - Semantic zoom for scaling.
    - [ ] **Further Prototyping:**
        - Multi-node selection and coordinated transformation (basic).
        - One example of an "Action" MB and TF (e.g., a "Delete" fractal).
        - Refine visual style of one chosen theme (e.g., "Adaptive Geometric Hub").

- **Phase 3 - Full Implementation & Integration (Future):**
    - **Transformations:**
        - Full 3-axis and planar translation.
        - Full 3-axis rotation.
        - Uniform and axial scaling.
        - Advanced semantic zoom for all transform tools (numerical input, snapping, constraints).
    - **Contextual Actions:**
        - Implement TFs for Link, Edit, Duplicate, Delete, etc.
        - Visual feedback specific to each action.
    - **Multi-Node Manipulation:**
        - Robust handling of group transformations, including choices for how individual orientations/scales are affected.
    - **Visual & Interaction Polish:**
        - Refined fractal aesthetics and animations across the entire UI.
        - Optimized hover, active, and selection feedback.
        - Ensure visual clarity and minimize intrusiveness (LOD, transparency).
    - **Performance:**
        - Optimize fractal generation and rendering.
        - Ensure smooth interaction even with multiple selected objects or complex scenes.
    - **Pointer Ray & Billboard:**
        - Ensure precise and intuitive targeting of all fractal elements (refining "pointer ray geometry" in practice).
        - Implement billboarding for any UI text/icons that must face the camera (e.g., labels within the fractal UI).
    - **Integration:**
        - Clean integration with `Node.js`, `Camera.js`.
        - Significant refactor/replacement of `UIManager.js` interaction state logic.
    - **Accessibility (Initial Considerations):**
        - Keyboard navigation for fractal UI elements.
        - Text alternatives for iconic fractal elements.
    - **User Customization (Optional):**
        - Allow users to adjust UI scale, animation speed, or fractal complexity (if performant).
    - **Comprehensive Testing:**
        - Usability testing with target users.
        - Performance profiling.

## 6. Open Questions & Challenges

- **Performance Scalability:** How complex can fractal UIs become before performance degrades unacceptably on typical hardware?
- **Optimal Semantic Zoom Triggers/Interactions:** What is the most intuitive way for users to engage semantic zoom for a specific UI element without conflicting with camera controls?
- **Navigability in Dense Fractal UIs:** If the fractal UI becomes very branched or deep, how do we prevent users from getting lost? (e.g., breadcrumbs, mini-maps of the UI structure itself).
- **Learnability of Abstract Fractal Forms:** How quickly can users learn to associate specific fractal forms or behaviors with their functions, especially for actions? The balance between symbolic fractals and clear text labels.
- **True Ergonomics:** Will the multi-step process of (select node -> activate AGH -> select MB -> select TF -> interact -> semantic zoom) feel efficient or cumbersome for frequent tasks?
- **Universality vs. Specificity:** How to make fractal forms that are universally understandable for common actions (translate, rotate, scale) while still being distinct enough not to be confused.
- **Touch/Pen Input:** How would this paradigm adapt to other input modalities beyond mouse/keyboard?

This document will be updated as the project progresses.
