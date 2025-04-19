import { HyperAgent } from "./agent";

import {
  HyperbrowserProvider,
  LocalBrowserProvider,
} from "./browser-providers";

import { TaskStatus } from "./types/agent/types";

// Export the class directly for both named and default exports
export { HyperAgent };
export default HyperAgent;

export { HyperbrowserProvider, LocalBrowserProvider, TaskStatus };

// For CommonJS compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = HyperAgent;
  module.exports.Hyperbrowser = HyperAgent;
  module.exports.HyperbrowserAgent = HyperAgent;
  module.exports.default = HyperAgent;
}
