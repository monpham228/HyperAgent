import { HyperAgent as HyperAgentClass } from "./agent";

import {
  HyperbrowserProvider,
  LocalBrowserProvider,
} from "./browser-providers";

import { TaskStatus } from "./types/agent/types";

export const HyperAgent = HyperAgentClass;
export default HyperAgentClass;

export { HyperbrowserProvider, LocalBrowserProvider, TaskStatus };

// For CommonJS compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = HyperAgent;
  module.exports.Hyperbrowser = HyperAgent;
  module.exports.HyperbrowserAgent = HyperAgent;
  module.exports.default = HyperAgent;
}
