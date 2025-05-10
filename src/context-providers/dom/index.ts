import { Page } from "playwright";
import { Page as PuppeteerPage } from "puppeteer";
import { buildDomViewJs } from "./inject/build-dom-view";
import { DOMState, DOMStateRaw, InteractiveElement } from "./types";

export const getDom = async (page: Page): Promise<DOMState | null> => {
  const result = (await page.evaluate(buildDomViewJs)) as DOMStateRaw;
  const elements = new Map<number, InteractiveElement>();
  for (const element of result.elements) {
    if (element.highlightIndex !== undefined) {
      elements.set(element.highlightIndex, element);
    }
  }
  return {
    elements,
    domState: result.domState,
    screenshot: result.screenshot,
  };
};
export const getDomPuppeteer = async (page: PuppeteerPage): Promise<DOMState | null> => {
  const result = (await page.evaluate(buildDomViewJs)) as DOMStateRaw;
  const elements = new Map<number, InteractiveElement>();
  for (const element of result.elements) {
    if (element.highlightIndex !== undefined) {
      elements.set(element.highlightIndex, element);
    }
  }
  return {
    elements,
    domState: result.domState,
    screenshot: result.screenshot,
  };
};