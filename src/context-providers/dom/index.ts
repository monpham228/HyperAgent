import { Page } from "playwright";
import { buildDomViewJs } from "./inject/build-dom-view";
import { DOMState, DOMStateRaw } from "./types";

export const getDom = async (page: Page): Promise<DOMState | null> => {
  const result = (await page.evaluate(buildDomViewJs)) as DOMStateRaw;
  const idxToXPath = new Map<number, string>();
  for (const element of result.elements) {
    if (element.highlightIndex && element.xPath) {
      idxToXPath.set(element.highlightIndex, element.xPath);
    }
  }
  return {
    elements: result.elements,
    domState: result.domState,
    idxToXPath,
  };
};

export const removeHighlight = async (page: Page) => {
  try {
    await page.evaluate(() => {
      const container = document.getElementById("hb-highlight-container");
      if (container) {
        container.remove();
      }
    });
  } catch (error) {
    console.error("Error removing highlight", error);
  }
};
