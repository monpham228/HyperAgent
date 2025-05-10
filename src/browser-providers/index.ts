import { HyperbrowserProvider } from "./hyperbrowser";
import { PlaywrightBrowserProvider } from "./local";
import { PuppeteerBrowserProvider } from "./puppeteer";

type LocalBrowserProvider = PlaywrightBrowserProvider | PuppeteerBrowserProvider;
export { HyperbrowserProvider, PlaywrightBrowserProvider ,PuppeteerBrowserProvider,LocalBrowserProvider};
