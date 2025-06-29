export const InteractionState = {
    IDLE: 'IDLE',
    PANNING: 'PANNING',
    DRAGGING_NODE: 'DRAGGING_NODE', // Dragging node directly (without gizmo)
    RESIZING_NODE: 'RESIZING_NODE', // Resizing with Metaframe handles
    LINKING_NODE: 'LINKING_NODE',
    /** User is actively dragging a gizmo handle (e.g., for translation, rotation, or scaling). */
    GIZMO_DRAGGING: 'GIZMO_DRAGGING',
    /** Adaptive Geometric Hub is active, awaiting specific fractal tool interaction. */
    FRACTAL_HUB_ACTIVE: 'FRACTAL_HUB_ACTIVE',
    /** User is actively dragging a fractal UI manipulator element. */
    FRACTAL_DRAGGING: 'FRACTAL_DRAGGING',
    // Future gizmo states could be more specific:
    // GIZMO_TRANSLATE_X: 'GIZMO_TRANSLATE_X',
    // GIZMO_ROTATE_Y: 'GIZMO_ROTATE_Y',
    // GIZMO_SCALE_XY: 'GIZMO_SCALE_XY',
};
