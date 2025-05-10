import { Browser } from "playwright";
import { Browser as PuppeteerBrowser } from "puppeteer";

abstract class BrowserProvider<T> {
  abstract session: unknown;
  abstract start(): Promise<Browser | PuppeteerBrowser>;
  abstract close(): Promise<void>;
  abstract getSession(): T|null;
}

export default BrowserProvider;
