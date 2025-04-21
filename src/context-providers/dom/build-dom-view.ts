import { findInteractiveElements } from "./find-interactive-elements";
import { highlightElem } from "./highlight";
import { getXPath } from "./get-x-path";
import { CONTEXT_ATTRIBUTES } from "./const";
import { DOMStateRaw } from "./types";

export const buildDomView = (): DOMStateRaw => {
  const interactiveElements = findInteractiveElements();
  let index = 1;
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

  const domRepresentation: string[] = [];

  const getTextBetween = (node: Node, nextNode: Node | null): string => {
    const texts: string[] = [];
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
        attributes += ` ${attr.name}="${attr.value}"`;
      }
    });

    const textContent = el.textContent?.trim() || "";
    const indexPrefix = `[${element.highlightIndex}]`;
    const elementString = `${indexPrefix}<${tagName}${attributes}>${textContent.replace(/\s+/g, " ")}</${tagName}>`;
    domRepresentation.push(elementString);

    const nextElement = interactiveElements[i + 1]?.element || null;
    const betweenText = getTextBetween(el, nextElement);
    if (betweenText) {
      domRepresentation.push(betweenText);
    }
  }

  return {
    elements: interactiveElements,
    domState: domRepresentation.join("\n"),
  };
};
