interface Window {
  getEventListeners?: (element: HTMLElement) => {
    [eventName: string]: Array<{
      listener: Function;
      useCapture: boolean;
    }>;
  };
}
