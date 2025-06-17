// js/ui/WheelInputHandler.js
import { HtmlNodeElement } from '../../spacegraph.js'; // Adjust path as necessary

export class WheelInputHandler {
    constructor(spaceGraph, uiManagerFacade) {
        this.spaceGraph = spaceGraph;
        this.uiManager = uiManagerFacade; // The main UIManager
        this.container = spaceGraph.container;
    }

    bindEvents() {
        // Use non-passive listener to allow preventDefault
        this.container.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    }

    dispose() {
        this.container.removeEventListener('wheel', this.handleWheel.bind(this));
        // console.log("WheelInputHandler disposed.");
    }

    handleWheel(event) {
        // Logic from UIManager._onWheel
        // It needs _getTargetInfo, which is currently in PointerInputHandler.
        // For now, let's assume UIManager facade will provide it, or we pass PointerInputHandler instance.
        // Let's assume: const targetInfo = this.uiManager.getTargetInfo(event);
        // For the subtask, we can temporarily duplicate _getTargetInfo or use a placeholder.
        // For this subtask, to keep it focused on WheelInputHandler, we'll rely on the UIManager facade
        // to eventually provide access to targetInfo.
        // So, we'll call `this.uiManager.getTargetInfoForWheel(event)` which the UIManager facade will need to implement,
        // likely by calling its pointerInputHandler._getTargetInfo(event).

        const targetInfo = this.uiManager.getTargetInfoForWheel(event); // UIManager facade will provide this

        // Do not interfere if wheeling over node controls, edge menu, or inside an editable area that handles scroll
        if (event.target.closest('.node-controls, .edge-menu-frame') || targetInfo.contentEditable) {
            if (targetInfo.contentEditable) {
                const el = targetInfo.contentEditable;
                // Allow native scroll for contentEditable if it's scrollable
                if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
                    return;
                }
            } else {
                return; // Other specific UI elements, don't interfere
            }
        }

        event.preventDefault(); // Prevent default browser scroll/zoom for the container

        if (event.ctrlKey || event.metaKey) {
            // Ctrl/Meta + Wheel for content scaling
            if (targetInfo.node instanceof HtmlNodeElement) {
                event.stopPropagation(); // Stop propagation to prevent graph zoom as well
                targetInfo.node.adjustContentScale(event.deltaY < 0 ? 1.1 : 1 / 1.1);
            }
        } else {
            // Default wheel action: graph zoom
            this.spaceGraph.cameraController?.zoom(event);
        }
    }
}
