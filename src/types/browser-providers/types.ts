import { Browser } from "playwright";

abstract class BrowserProvider {
  abstract start(): Promise<Browser>;
  abstract close(): Promise<void>;
}

export default BrowserProvider;
