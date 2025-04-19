export interface InteractiveElement {
  element: HTMLElement;
  iframe?: HTMLIFrameElement;
  shadowHost?: HTMLElement;
  rect: DOMRect;
  interactiveReason?: string;
  highlightIndex?: number;
  xPath?: string;
}

export interface DOMStateRaw {
  elements: InteractiveElement[];
  domState: string;
}

export interface DOMState {
  elements: InteractiveElement[];
  domState: string;
  idxToXPath: Map<number, string>;
}
