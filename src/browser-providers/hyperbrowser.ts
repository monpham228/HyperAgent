import { chromium, Browser, ConnectOverCDPOptions } from "playwright";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import {
  CreateSessionParams,
  HyperbrowserConfig,
  SessionDetail,
} from "@hyperbrowser/sdk/types";

import BrowserProvider from "@/types/browser-providers/types";

export class HyperbrowserProvider extends BrowserProvider {
  browserOptions: Omit<ConnectOverCDPOptions, "endpointURL"> | undefined;
  hyperbrowserSessionOptions: CreateSessionParams | undefined;
  hyperbrowserConfig: HyperbrowserConfig | undefined;
  browser: Browser | undefined;
  session: SessionDetail | undefined;
  hbClient: Hyperbrowser | undefined;

  constructor(params?: {
    browserOptions?: Omit<ConnectOverCDPOptions, "endpointURL">;
    hyperbrowserSessionOptions?: CreateSessionParams;
    hyperbrowserConfig?: HyperbrowserConfig;
  }) {
    super();
    this.browserOptions = params?.browserOptions;
    this.hyperbrowserSessionOptions = params?.hyperbrowserSessionOptions;
    this.hyperbrowserConfig = params?.hyperbrowserConfig;
  }

  async start(): Promise<Browser> {
    const client = new Hyperbrowser(this.hyperbrowserConfig);
    const session = await client.sessions.create(
      this.hyperbrowserSessionOptions
    );
    this.hbClient = client;
    this.session = session;
    this.browser = await chromium.connectOverCDP(
      session.wsEndpoint,
      this.browserOptions
    );
    return this.browser;
  }

  async close(): Promise<void> {
    await this.browser?.close();
    if (this.session) {
      await this.hbClient?.sessions.stop(this.session.id);
    }
  }
}
