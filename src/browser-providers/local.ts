import { chromium, Browser, LaunchOptions } from "playwright";
import BrowserProvider from "@/types/browser-providers/types";

export class LocalBrowserProvider extends BrowserProvider {
  options: Omit<Omit<LaunchOptions, "headless">, "channel"> | undefined;
  browser: Browser | undefined;
  constructor(options?: Omit<Omit<LaunchOptions, "headless">, "channel">) {
    super();
    this.options = options;
  }
  async start(): Promise<Browser> {
    const launchArgs = this.options?.args ?? [];
    const browser = await chromium.launch({
      ...(this.options ?? {}),
      channel: "chrome",
      headless: false,
      args: ["--disable-blink-features=AutomationControlled", ...launchArgs],
    });
    this.browser = browser;
    return this.browser;
  }
  async close(): Promise<void> {
    return await this.browser?.close();
  }
}
