import * as THREE from "three";
import { $$ } from "../utils.js";

// Simplified UIManager that consolidates functionality
export class SimplifiedUIManager {
  space = null;
  container = null;

  // State management
  currentState = "IDLE";
  activePointerId = null;

  // Interaction tracking
  draggedNode = null;
  draggedNodeInitialZ = 0;
  dragOffset = new THREE.Vector3();

  resizedNode = null;
  resizeStartPointerPos = { x: 0, y: 0 };
  resizeStartNodeSize = { width: 0, height: 0 };
  resizeNodeScreenScaleX = 1;
  resizeNodeScreenScaleY = 1;

  hoveredEdge = null;

  pointerState = {
    down: false,
    button: -1,
    clientX: 0,
    clientY: 0,
    startClientX: 0,
    startClientY: 0,
    isDraggingThresholdMet: false,
    DRAG_THRESHOLD: 5,
  };

  tempLinkLine = null;

  // Callbacks provided by the UIPlugin
  _uiPluginCallbacks = {
    setSelectedNode: () => {},
    setSelectedEdge: () => {},
    cancelLinking: () => {},
    getIsLinking: () => false,
    getLinkSourceNode: () => null,
    getSelectedNodes: () => new Set(),
    getSelectedEdges: () => new Set(),
    completeLinking: () => {},
  };

  constructor(space, contextMenuEl, confirmDialogEl, uiPluginCallbacks) {
    if (!space || !contextMenuEl || !confirmDialogEl)
      throw new Error(
        "UIManager requires SpaceGraph instance and UI elements.",
      );
    this.space = space;
    this.container = space.container;

    this._uiPluginCallbacks = {
      ...this._uiPluginCallbacks,
      ...uiPluginCallbacks,
    };

    this._applySavedTheme();
    this._bindEvents();
    this._subscribeToSpaceGraphEvents();
  }

  _applySavedTheme() {
    // Apply saved theme from localStorage
    const savedTheme = localStorage.getItem("spacegraph-theme");
    if (savedTheme === "light") {
      document.body.classList.add("theme-light");
    } else {
      document.body.classList.remove("theme-light");
    }
  }

  _bindEvents() {
    const passiveFalse = { passive: false };
    this.container.addEventListener(
      "pointerdown",
      this._onPointerDown,
      passiveFalse,
    );
    window.addEventListener("pointermove", this._onPointerMove, passiveFalse);
    window.addEventListener("pointerup", this._onPointerUp, passiveFalse);
    this.container.addEventListener(
      "contextmenu",
      this._onContextMenu,
      passiveFalse,
    );
    document.addEventListener("click", this._onDocumentClick, true);
    window.addEventListener("keydown", this._onKeyDown);
    this.container.addEventListener("wheel", this._onWheel, passiveFalse);
  }

  _subscribeToSpaceGraphEvents() {
    this.space.on("ui:request:confirm", this._onRequestConfirm);
    this.space.on("selection:changed", this._onSelectionChanged);
    this.space.on("linking:started", this._onLinkingStarted);
    this.space.on("linking:cancelled", this._onLinkingCancelled);
    this.space.on("linking:succeeded", this._onLinkingCompleted);
    this.space.on("linking:failed", this._onLinkingCompleted);
    this.space.on("camera:modeChanged", this._onCameraModeChanged);
  }

  _onRequestConfirm = (payload) => {
    // Handle confirmation dialog
    if (payload.onConfirm) {
      payload.onConfirm();
    }
  };

  _onCameraModeChanged = (data) => {
    // Handle camera mode changes
  };

  _onSelectionChanged = (payload) => {
    // Handle selection changes
  };

  _updateNormalizedPointerState(e, isDownEvent = undefined) {
    this.pointerState.clientX = e.clientX;
    this.pointerState.clientY = e.clientY;

    if (isDownEvent !== undefined) {
      this.pointerState.down = isDownEvent;
      if (isDownEvent) {
        this.pointerState.button = e.button;
        this.pointerState.startClientX = e.clientX;
        this.pointerState.startClientY = e.clientY;
        this.pointerState.isDraggingThresholdMet = false;
      } else {
        this.pointerState.button = -1;
      }
    }

    if (this.pointerState.down && !this.pointerState.isDraggingThresholdMet) {
      const dx = this.pointerState.clientX - this.pointerState.startClientX;
      const dy = this.pointerState.clientY - this.pointerState.startClientY;
      if (Math.sqrt(dx * dx + dy * dy) > this.pointerState.DRAG_THRESHOLD) {
        this.pointerState.isDraggingThresholdMet = true;
      }
    }
  }

  _transitionToState(newState, data = {}) {
    if (this.currentState === newState) return;

    // Clean up previous state
    switch (this.currentState) {
      case "DRAGGING_NODE":
        this.draggedNode?.endDrag();
        this.container.style.cursor = "grab";
        this.draggedNode = null;
        break;
      case "RESIZING_NODE":
        this.resizedNode?.endResize();
        this.container.style.cursor = "grab";
        this.resizedNode = null;
        break;
      case "PANNING":
        // End panning
        this.container.style.cursor = "grab";
        break;
      case "LINKING_NODE":
        this.container.style.cursor = "grab";
        $$(".node-common.linking-target").forEach((el) =>
          el.classList.remove("linking-target"),
        );
        break;
    }

    this.currentState = newState;

    // Set up new state
    switch (newState) {
      case "DRAGGING_NODE":
        this.draggedNode = data.node;
        this.draggedNodeInitialZ = this.draggedNode.position.z;
        this.draggedNode.startDrag();
        this.container.style.cursor = "grabbing";
        break;

      case "RESIZING_NODE":
        this.resizedNode = data.node;
        this.resizedNode.startResize();
        this.container.style.cursor = "nwse-resize";
        break;

      case "PANNING":
        this.container.style.cursor = "grabbing";
        break;

      case "LINKING_NODE":
        this.container.style.cursor = "crosshair";
        break;

      case "IDLE":
        this.container.style.cursor = "grab";
        break;
    }
  }

  _onPointerDown = (e) => {
    // Handle pointer down events
    this._updateNormalizedPointerState(e, true);
  };

  _onPointerMove = (e) => {
    // Handle pointer move events
    const prevX = this.pointerState.clientX;
    const prevY = this.pointerState.clientY;
    this._updateNormalizedPointerState(e);

    const dx = this.pointerState.clientX - prevX;
    const dy = this.pointerState.clientY - prevY;

    switch (this.currentState) {
      case "IDLE":
        // Handle hover effects
        break;

      case "DRAGGING_NODE":
        // Handle node dragging
        break;

      case "RESIZING_NODE":
        // Handle node resizing
        break;

      case "PANNING":
        // Handle panning
        break;

      case "LINKING_NODE":
        // Handle linking
        break;
    }
  };

  _onPointerUp = (e) => {
    // Handle pointer up events
    this._updateNormalizedPointerState(e, false);
    this._transitionToState("IDLE");
    this.activePointerId = null;
  };

  _onContextMenu = (e) => {
    // Handle context menu
    e.preventDefault();
  };

  _onDocumentClick = (e) => {
    // Handle document clicks
  };

  _onKeyDown = (e) => {
    // Handle key presses
  };

  _onWheel = (e) => {
    // Handle wheel events
    e.preventDefault();
  };

  dispose() {
    // Clean up event listeners
    const passiveFalse = { passive: false };
    this.container.removeEventListener(
      "pointerdown",
      this._onPointerDown,
      passiveFalse,
    );
    window.removeEventListener(
      "pointermove",
      this._onPointerMove,
      passiveFalse,
    );
    window.removeEventListener("pointerup", this._onPointerUp, passiveFalse);
    this.container.removeEventListener(
      "contextmenu",
      this._onContextMenu,
      passiveFalse,
    );
    document.removeEventListener("click", this._onDocumentClick, true);
    window.removeEventListener("keydown", this._onKeyDown);
    this.container.removeEventListener("wheel", this._onWheel, passiveFalse);

    // Clean up space graph event listeners
    this.space.off("ui:request:confirm", this._onRequestConfirm);
    this.space.off("selection:changed", this._onSelectionChanged);
    this.space.off("linking:started", this._onLinkingStarted);
    this.space.off("linking:cancelled", this._onLinkingCancelled);
    this.space.off("linking:succeeded", this._onLinkingCompleted);
    this.space.off("linking:failed", this._onLinkingCompleted);
    this.space.off("camera:modeChanged", this._onCameraModeChanged);

    this.space = null;
    this.container = null;
    this.draggedNode = null;
    this.resizedNode = null;
    this.hoveredEdge = null;
    this._uiPluginCallbacks = null;
  }
}
