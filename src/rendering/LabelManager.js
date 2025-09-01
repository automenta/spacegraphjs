import { CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";

export function createLabelElement(labelText, id, className, styleData = {}) {
  const div = document.createElement("div");
  div.className = `${className} node-common`;
  div.textContent = labelText;
  div.dataset.id = id;
  Object.assign(div.style, {
    pointerEvents: "none",
    textAlign: "center",
    whiteSpace: "nowrap",
    backdropFilter: "blur(4px)",
    border: "1px solid var(--sg-accent-secondary)",
    ...styleData,
  });
  return div;
}

export function createCSS3DLabelObject(
  labelText,
  id,
  className,
  styleData,
  type,
) {
  const div = createLabelElement(labelText, id, className, styleData);
  const label = new CSS3DObject(div);
  label.userData = { id: id, type: type };
  return label;
}

function applyHtmlNodeContentScale(element, baseScale, lodScale = 1.0) {
  const contentEl = element.querySelector(".node-content");
  if (contentEl) contentEl.style.transform = `scale(${baseScale * lodScale})`;
}

export function applyLabelLOD(
  labelObject,
  labelLodData,
  space,
  baseScale = 1.0,
) {
  if (!labelObject?.element || !labelLodData?.length) {
    if (labelObject?.element) {
      labelObject.element.style.visibility = "";
      if (labelObject.element.classList.contains("node-html")) {
        applyHtmlNodeContentScale(labelObject.element, baseScale);
      }
    }
    return;
  }

  const camera = space?.plugins?.getPlugin("CameraPlugin")?.getCameraInstance();
  if (!camera) return;

  const distanceToCamera = labelObject.position.distanceTo(camera.position);
  const sortedLodLevels = [...labelLodData].sort(
    (a, b) => (b.distance || 0) - (a.distance || 0),
  );

  let ruleApplied = false;
  for (const level of sortedLodLevels) {
    if (distanceToCamera >= (level.distance || 0)) {
      labelObject.element.style.visibility = level.style?.includes(
        "visibility:hidden",
      )
        ? "hidden"
        : "";
      if (labelObject.element.classList.contains("node-html")) {
        applyHtmlNodeContentScale(
          labelObject.element,
          baseScale,
          level.scale ?? 1.0,
        );
      }
      ruleApplied = true;
      break;
    }
  }

  if (!ruleApplied) {
    labelObject.element.style.visibility = "";
    if (labelObject.element.classList.contains("node-html")) {
      applyHtmlNodeContentScale(labelObject.element, baseScale);
    }
  }
}
