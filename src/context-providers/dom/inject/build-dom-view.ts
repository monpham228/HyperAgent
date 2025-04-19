export const buildDomViewJs = `(() => {
  // src/context-providers/dom/const.ts
  var HIGHLIGHT_CONTAINER_ID = "hb-highlight-container";
  var INTERACTIVE_ELEMENTS = /* @__PURE__ */ new Set([
    "a",
    "input",
    "button",
    "select",
    "menu",
    "menuitem",
    "textarea",
    "canvas",
    "embed"
  ]);
  var INTERACTIVE_ROLES = /* @__PURE__ */ new Set([
    "button",
    "link",
    "checkbox",
    "radio",
    "textbox",
    "menuitem",
    "tab",
    "tabpanel",
    "tooltip",
    "slider",
    "progressbar",
    "switch",
    "listbox",
    "option",
    "combobox",
    "menu",
    "treeitem",
    "tree",
    "spinbutton",
    "scrollbar",
    "menuitemcheckbox",
    "menuitemradio"
  ]);
  var INTERACTIVE_EVENTS = /* @__PURE__ */ new Set([
    "click",
    "mousedown",
    "mouseup",
    "touchstart",
    "touchend"
  ]);
  var INTERACTIVE_ARIA_PROPS = [
    "aria-expanded",
    "aria-pressed",
    "aria-selected",
    "aria-checked"
  ];
  var CLICK_ATTRIBUTES = ["onclick", "ng-click", "@click", "v-on:click"];
  var CONTEXT_ATTRIBUTES = [
    "title",
    "type",
    "name",
    "role",
    "aria-label",
    "placeholder",
    "value",
    "alt",
    "aria-expanded"
  ];

  // src/context-providers/dom/elem-interactive.ts
  var isInteractiveElem = (element) => {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute("role");
    const ariaRole = element.getAttribute("aria-role");
    const hasInteractiveRole = INTERACTIVE_ELEMENTS.has(tagName) || INTERACTIVE_ROLES.has(role || "") || INTERACTIVE_ROLES.has(ariaRole || "");
    if (hasInteractiveRole) {
      let reason = "";
      if (INTERACTIVE_ELEMENTS.has(tagName)) {
        reason = \`Interactive HTML element: <\${tagName}>\`;
      } else if (INTERACTIVE_ROLES.has(role || "")) {
        reason = \`Interactive role: \${role}\`;
      } else if (INTERACTIVE_ROLES.has(ariaRole || "")) {
        reason = \`Interactive aria-role: \${ariaRole}\`;
      }
      return { isInteractive: true, reason };
    }
    const hasClickHandler = element.onclick !== null || element.getAttribute("onclick") !== null || CLICK_ATTRIBUTES.some((attr) => element.hasAttribute(attr));
    if (hasClickHandler) {
      return { isInteractive: true, reason: "Has click handler" };
    }
    const listeners = window.getEventListeners?.(element) || {};
    const hasClickListeners = Object.keys(listeners).some(
      (type) => INTERACTIVE_EVENTS.has(type) && listeners[type]?.length > 0
    );
    if (hasClickListeners) {
      return { isInteractive: true, reason: "Has interactive event listeners" };
    }
    const hasAriaProps = INTERACTIVE_ARIA_PROPS.some(
      (prop) => element.hasAttribute(prop)
    );
    if (hasAriaProps) {
      const props = INTERACTIVE_ARIA_PROPS.filter(
        (prop) => element.hasAttribute(prop)
      );
      return {
        isInteractive: true,
        reason: \`Has interactive ARIA properties: \${props.join(", ")}\`
      };
    }
    const isContentEditable = element.getAttribute("contenteditable") === "true" || element.isContentEditable;
    if (isContentEditable) {
      return { isInteractive: true, reason: "Is content editable" };
    }
    const isDraggable = element.draggable || element.getAttribute("draggable") === "true";
    if (isDraggable) {
      return { isInteractive: true, reason: "Is draggable" };
    }
    return { isInteractive: false, reason: "Not interactive" };
  };
  var isIgnoredElem = (element) => {
    const rect = element.getBoundingClientRect();
    const isNotVisible = rect.width === 0 || rect.height === 0;
    return element.tagName.toLowerCase() === "html" || element.tagName.toLowerCase() === "body" || isNotVisible || element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
  };

  // src/context-providers/dom/find-interactive-elements.ts
  var findInteractiveElements = () => {
    const intereactiveElements = [];
    const processedElements = /* @__PURE__ */ new Set();
    const processRoot = (root, rootInfo = {}) => {
      const elements = root.querySelectorAll("*");
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (processedElements.has(element)) {
          continue;
        }
        processedElements.add(element);
        const { isInteractive, reason } = isInteractiveElem(element);
        if (isIgnoredElem(element) || !isInteractive) {
          continue;
        }
        intereactiveElements.push({
          element,
          iframe: rootInfo.iframe,
          shadowHost: rootInfo.shadowHost,
          rect: element.getBoundingClientRect(),
          interactiveReason: reason
        });
        if (element.shadowRoot) {
          processRoot(element.shadowRoot, {
            iframe: rootInfo.iframe,
            shadowHost: element
          });
        }
      }
    };
    processRoot(document);
    const iframes = document.querySelectorAll("iframe");
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i];
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          processRoot(iframeDoc, { iframe });
        }
      } catch (e) {
        console.warn("error processing iframe", e);
      }
    }
    return intereactiveElements;
  };

  // src/context-providers/dom/highlight.ts
  var isElementPartiallyVisible = (rect) => {
    return rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;
  };
  var getHighlightContainer = () => {
    let container = document.getElementById(
      HIGHLIGHT_CONTAINER_ID
    );
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
  var getHighlightColor = (index) => {
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
      "#4682B4"
    ];
    const colorIndex = index % colors.length;
    const baseColor = colors[colorIndex];
    const backgroundColor = baseColor + "1A";
    return { baseColor, backgroundColor };
  };
  var createHighlightOverlay = (rect, iframeOffset, colors) => {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.border = \`2px solid \${colors.baseColor}\`;
    overlay.style.backgroundColor = colors.backgroundColor;
    overlay.style.pointerEvents = "none";
    overlay.style.boxSizing = "border-box";
    const top = rect.top + iframeOffset.y;
    const left = rect.left + iframeOffset.x;
    overlay.style.top = \`\${top}px\`;
    overlay.style.left = \`\${left}px\`;
    overlay.style.width = \`\${rect.width}px\`;
    overlay.style.height = \`\${rect.height}px\`;
    return overlay;
  };
  var calculateLabelPosition = (rect, iframeOffset, labelWidth, labelHeight) => {
    const top = rect.top + iframeOffset.y;
    const left = rect.left + iframeOffset.x;
    let labelTop = top - labelHeight;
    let labelLeft = left + rect.width - labelWidth;
    if (labelTop < 0 || labelLeft + labelWidth > window.innerWidth) {
      labelTop = top + rect.height;
      labelLeft = left + rect.width - labelWidth;
    }
    if (labelTop + labelHeight > window.innerHeight) {
      labelTop = top + rect.height;
      labelLeft = left;
    }
    if (labelLeft < 0) {
      labelTop = top - labelHeight;
      labelLeft = left;
    }
    labelTop = Math.max(0, Math.min(labelTop, window.innerHeight - labelHeight));
    labelLeft = Math.max(0, Math.min(labelLeft, window.innerWidth - labelWidth));
    return { top: labelTop, left: labelLeft };
  };
  var createHighlightLabel = (index, rect, iframeOffset, baseColor) => {
    const label = document.createElement("div");
    label.style.position = "fixed";
    label.style.background = baseColor;
    label.style.color = "white";
    label.style.borderRadius = "4px";
    label.style.padding = "2px 4px";
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.justifyContent = "center";
    label.style.fontSize = \`\${Math.min(12, Math.max(8, rect.height / 2))}px\`;
    label.style.lineHeight = "1";
    label.style.whiteSpace = "nowrap";
    label.textContent = index.toString();
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
    label.style.top = \`\${position.top}px\`;
    label.style.left = \`\${position.left}px\`;
    return label;
  };
  var createPositionUpdateHandler = (element, overlay, label, parentIframe) => {
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
      const isVisible = isElementPartiallyVisible(newRect);
      overlay.style.display = isVisible ? "block" : "none";
      label.style.display = isVisible ? "flex" : "none";
      if (isVisible) {
        overlay.style.top = \`\${newTop}px\`;
        overlay.style.left = \`\${newLeft}px\`;
        overlay.style.width = \`\${newRect.width}px\`;
        overlay.style.height = \`\${newRect.height}px\`;
        const newLabelRect = label.getBoundingClientRect();
        const position = calculateLabelPosition(
          newRect,
          newIframeOffset,
          newLabelRect.width,
          newLabelRect.height
        );
        label.style.top = \`\${position.top}px\`;
        label.style.left = \`\${position.left}px\`;
      }
    };
  };
  var highlightElem = (element, index, parentIframe = null) => {
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
      const isVisible = isElementPartiallyVisible(rect);
      overlay.style.display = isVisible ? "block" : "none";
      label.style.display = isVisible ? "flex" : "none";
      container.appendChild(overlay);
      container.appendChild(label);
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

  // src/context-providers/dom/get-x-path.ts
  var getXPath = (element) => {
    const segments = [];
    let currentElement = element;
    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
      if (currentElement.parentNode instanceof ShadowRoot || currentElement.parentNode instanceof HTMLIFrameElement) {
        break;
      }
      let index = 0;
      let hasSiblings = false;
      let sibling = currentElement.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === currentElement.nodeName) {
          index++;
          hasSiblings = true;
        }
        sibling = sibling.previousSibling;
      }
      if (!hasSiblings) {
        sibling = currentElement.nextSibling;
        while (sibling) {
          if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === currentElement.nodeName) {
            hasSiblings = true;
            break;
          }
          sibling = sibling.nextSibling;
        }
      }
      const tagName = currentElement.nodeName.toLowerCase();
      const xpathIndex = hasSiblings ? \`[\${index + 1}]\` : "";
      if (currentElement.id && currentElement.id.toString().trim() !== "") {
        segments.unshift(\`\${tagName}[@id="\${currentElement.id}"]\`);
      } else {
        segments.unshift(\`\${tagName}\${xpathIndex}\`);
      }
      currentElement = currentElement.parentElement;
    }
    return segments.join("/");
  };

  // src/context-providers/dom/build-dom-view.ts
  var buildDomView = () => {
    const interactiveElements = findInteractiveElements();
    let index = 0;
    const container = document.getElementById("hb-highlight-container");
    if (container) {
      container.remove();
    }
    for (const element of interactiveElements) {
      const success = highlightElem(element.element, index);
      if (success) {
        element.highlightIndex = index;
        index++;
      }
    }
    for (const element of interactiveElements) {
      if (element.highlightIndex) {
        element.xPath = getXPath(element.element);
      }
    }
    const domRepresentation = [];
    const getTextBetween = (node, nextNode) => {
      const texts = [];
      let current = node.nextSibling;
      while (current && current !== nextNode) {
        if (current.nodeType === Node.TEXT_NODE && current.textContent) {
          const text = current.textContent.trim();
          if (text) texts.push(text);
        }
        current = current.nextSibling;
      }
      return texts.join(" ");
    };
    for (let i = 0; i < interactiveElements.length; i++) {
      const element = interactiveElements[i];
      const el = element.element;
      const tagName = el.tagName.toLowerCase();
      let attributes = "";
      Array.from(el.attributes).forEach((attr) => {
        if (CONTEXT_ATTRIBUTES.includes(attr.name)) {
          attributes += \` \${attr.name}="\${attr.value}"\`;
        }
      });
      const textContent = el.textContent?.trim() || "";
      const indexPrefix = \`[\${element.highlightIndex}]\`;
      const elementString = \`\${indexPrefix}<\${tagName}\${attributes}>\${textContent.replace(/\\s+/g, " ")}</\${tagName}>\`;
      domRepresentation.push(elementString);
      const nextElement = interactiveElements[i + 1]?.element || null;
      const betweenText = getTextBetween(el, nextElement);
      if (betweenText) {
        domRepresentation.push(betweenText);
      }
    }
    return {
      elements: interactiveElements,
      domState: domRepresentation.join("\\n")
    };
  };
  return buildDomView();
})();`;