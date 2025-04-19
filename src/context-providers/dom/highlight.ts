import { HIGHLIGHT_CONTAINER_ID } from "./const";

interface IframeOffset {
  x: number;
  y: number;
}

const isElementPartiallyVisible = (rect: DOMRect): boolean => {
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  );
};

const getHighlightContainer = (): HTMLDivElement => {
  let container = document.getElementById(
    HIGHLIGHT_CONTAINER_ID
  ) as HTMLDivElement;
  if (!container) {
    container = document.createElement("div");
    container.id = HIGHLIGHT_CONTAINER_ID;
    container.style.position = "fixed";
    container.style.pointerEvents = "none";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.zIndex = "2147483647";
    document.body.appendChild(container);
  }
  return container;
};

const getHighlightColor = (
  index: number
): { baseColor: string; backgroundColor: string } => {
  const colors = [
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFA500",
    "#800080",
    "#008080",
    "#FF69B4",
    "#4B0082",
    "#FF4500",
    "#2E8B57",
    "#DC143C",
    "#4682B4",
  ];
  const colorIndex = index % colors.length;
  const baseColor = colors[colorIndex];
  const backgroundColor = baseColor + "1A";
  return { baseColor, backgroundColor };
};

const createHighlightOverlay = (
  rect: DOMRect,
  iframeOffset: IframeOffset,
  colors: { baseColor: string; backgroundColor: string }
): HTMLDivElement => {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.border = `2px solid ${colors.baseColor}`;
  overlay.style.backgroundColor = colors.backgroundColor;
  overlay.style.pointerEvents = "none";
  overlay.style.boxSizing = "border-box";

  const top = rect.top + iframeOffset.y;
  const left = rect.left + iframeOffset.x;

  overlay.style.top = `${top}px`;
  overlay.style.left = `${left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;

  return overlay;
};

const calculateLabelPosition = (
  rect: DOMRect,
  iframeOffset: IframeOffset,
  labelWidth: number,
  labelHeight: number
): { top: number; left: number } => {
  const top = rect.top + iframeOffset.y;
  const left = rect.left + iframeOffset.x;

  // Try positions in order: top-right, bottom-right, bottom-left, top-left
  let labelTop = top - labelHeight;
  let labelLeft = left + rect.width - labelWidth;

  // If not enough space in top-right, try bottom-right
  if (labelTop < 0 || labelLeft + labelWidth > window.innerWidth) {
    labelTop = top + rect.height;
    labelLeft = left + rect.width - labelWidth;
  }

  // If not enough space in bottom-right, try bottom-left
  if (labelTop + labelHeight > window.innerHeight) {
    labelTop = top + rect.height;
    labelLeft = left;
  }

  // If not enough space in bottom-left, try top-left
  if (labelLeft < 0) {
    labelTop = top - labelHeight;
    labelLeft = left;
  }

  // Keep label within viewport bounds
  labelTop = Math.max(0, Math.min(labelTop, window.innerHeight - labelHeight));
  labelLeft = Math.max(0, Math.min(labelLeft, window.innerWidth - labelWidth));

  return { top: labelTop, left: labelLeft };
};

const createHighlightLabel = (
  index: number,
  rect: DOMRect,
  iframeOffset: IframeOffset,
  baseColor: string
): HTMLDivElement => {
  const label = document.createElement("div");
  label.style.position = "fixed";
  label.style.background = baseColor;
  label.style.color = "white";
  label.style.borderRadius = "4px";
  label.style.padding = "2px 4px";
  label.style.display = "flex";
  label.style.alignItems = "center";
  label.style.justifyContent = "center";
  label.style.fontSize = `${Math.min(12, Math.max(8, rect.height / 2))}px`;
  label.style.lineHeight = "1";
  label.style.whiteSpace = "nowrap";
  label.textContent = index.toString();

  // Add the label to DOM temporarily to get its actual dimensions
  label.style.visibility = "hidden";
  document.body.appendChild(label);
  const labelRect = label.getBoundingClientRect();
  document.body.removeChild(label);
  label.style.visibility = "visible";

  const position = calculateLabelPosition(
    rect,
    iframeOffset,
    labelRect.width,
    labelRect.height
  );

  label.style.top = `${position.top}px`;
  label.style.left = `${position.left}px`;

  return label;
};

const createPositionUpdateHandler = (
  element: HTMLElement,
  overlay: HTMLDivElement,
  label: HTMLDivElement,
  parentIframe: HTMLElement | null
) => {
  return () => {
    const newRect = element.getBoundingClientRect();
    let newIframeOffset = { x: 0, y: 0 };

    if (parentIframe) {
      const iframeRect = parentIframe.getBoundingClientRect();
      newIframeOffset.x = iframeRect.left;
      newIframeOffset.y = iframeRect.top;
    }

    const newTop = newRect.top + newIframeOffset.y;
    const newLeft = newRect.left + newIframeOffset.x;

    // Update visibility based on element's position
    const isVisible = isElementPartiallyVisible(newRect);
    overlay.style.display = isVisible ? "block" : "none";
    label.style.display = isVisible ? "flex" : "none";

    if (isVisible) {
      overlay.style.top = `${newTop}px`;
      overlay.style.left = `${newLeft}px`;
      overlay.style.width = `${newRect.width}px`;
      overlay.style.height = `${newRect.height}px`;

      // Update label position
      const newLabelRect = label.getBoundingClientRect();
      const position = calculateLabelPosition(
        newRect,
        newIframeOffset,
        newLabelRect.width,
        newLabelRect.height
      );

      label.style.top = `${position.top}px`;
      label.style.left = `${position.left}px`;
    }
  };
};

export const highlightElem = (
  element: HTMLElement,
  index: number,
  parentIframe: HTMLElement | null = null
): boolean => {
  if (!element) return false;

  try {
    const container = getHighlightContainer();
    const rect = element.getBoundingClientRect();
    if (!rect) return false;

    const iframeOffset = { x: 0, y: 0 };
    if (parentIframe) {
      const iframeRect = parentIframe.getBoundingClientRect();
      iframeOffset.x = iframeRect.left;
      iframeOffset.y = iframeRect.top;
    }

    const colors = getHighlightColor(index);
    const overlay = createHighlightOverlay(rect, iframeOffset, colors);
    const label = createHighlightLabel(
      index,
      rect,
      iframeOffset,
      colors.baseColor
    );

    // Do initial visibility check
    const isVisible = isElementPartiallyVisible(rect);
    overlay.style.display = isVisible ? "block" : "none";
    label.style.display = isVisible ? "flex" : "none";

    // Add to container
    container.appendChild(overlay);
    container.appendChild(label);

    // Set up position updates
    const updatePositions = createPositionUpdateHandler(
      element,
      overlay,
      label,
      parentIframe
    );
    window.addEventListener("scroll", updatePositions);
    window.addEventListener("resize", updatePositions);

    return true;
  } catch (error) {
    console.error("Error highlighting element", error);
    return false;
  }
};
