<div align="center">
  <img src="assets/hyperagent-banner.png" alt="Hyperagent Banner" width="800"/>

  <p align="center">
    <strong>Intelligent Browser Automation with LLMs</strong>
  </p>

  <p align="center">
    <a href="https://www.npmjs.com/package/@hyperbrowser/agent">
      <img src="https://img.shields.io/npm/v/@hyperbrowser/agent?style=flat-square" alt="npm version" />
    </a>
    <a href="https://github.com/hyperbrowserai/hyperagent/blob/main/LICENSE">
      <img src="https://img.shields.io/npm/l/@hyperbrowser/agent?style=flat-square" alt="license" />
    </a>
    <a href="https://discord.gg/zsYzsgVRjh" style="text-decoration:none;">
      <img alt="Discord" src="https://img.shields.io/discord/1313014141165764619?style=flat-square&color=blue">
    </a>
    <a href="https://x.com/SukhaniShri">
      <img alt="X (formerly Twitter) Follow" src="https://img.shields.io/twitter/follow/SukhaniShri?style=social">
    </a>
  </p>
</div>

## Overview

Hyperagent is Playwright supercharged with AI.

### Features

- 🤖 **AI Commands**: Simple APIs like `page.ai()` and `executeTask()` for any AI automation
- 🛡️ **Stealth Mode**: Built-in patches to avoid being detcted
- ⚡ **Fallback to Regular Playwright**: Use regular Playwright when AI isn't needed

## Quick Start

### Installation

```bash
# Using npm
npm install @hyperbrowser/agent

# Using yarn
yarn add @hyperbrowser/agent
```

### Basic Usage

```typescript
import { HyperAgent } from "@hyperbrowser/agent";
import { ChatOpenAI } from "@langchain/openai";

// Initialize the agent
const agent = new HyperAgent({
  llm: new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o",
  }),
});

// Execute a task
const result = await agent.executeTask(
  "Navigate to amazon.com, search for 'laptop', and extract the prices of the first 5 results"
);

console.log(result.output);

// Clean up
await agent.closeAgent();
```

## Usage Guide

### Task Execution Modes

Hyperagent supports both synchronous and asynchronous task execution:

```typescript
// Synchronous execution
const result = await agent.executeTask("Extract data from the current page");

// Asynchronous execution with control
const task = await agent.executeTaskAsync("Long running scraping task");
await task.pause(); // Pause the task
await task.resume(); // Resume the task
await task.cancel(); // Cancel the task
```

### Multi-Page Management

```typescript
// Create and manage multiple pages
const page1 = await agent.newPage();
const page2 = await agent.newPage();

// Execute tasks on specific pages
await page1.ai("Navigate to google.com");
await page2.ai("Navigate to github.com");

// Get all active pages
const pages = await agent.getPages();
```

## Customization

### Output Schema Definition

HyperAgent can extract data in a specified schema. The schema can be passed in at a per-task level

```typescript
const agent = new HyperAgent();
const agentRepsone = await agent.executeTask(
  "Navigate to imdb.com, search for 'The Matrix', and extract the director, release year, and rating",
  outputSchema: z.object({
    director: z.string().describe("The name of the movie director"),
    releaseYear: z.number().describe("The year the movie was released"),
    rating: z.string().describe("The IMDb rating of the movie"),
  })
)
await agent.closeAgent()
console.log(result.output)
```

```bash
{
  "director": "Lana Wachowski, Lilly Wachowski",
  "releaseYear": 1999,
  "rating": "8.7/10"
}
```

### Using Different LLM Providers

Hyperagent supports various LLM providers:

```typescript
// Using OpenAI
const agent = new HyperAgent({
  llm: new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4",
  }),
});

// Using Anthropic's Claude
const agent = new HyperAgent({
  llm: new ChatAnthropic({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    modelName: "claude-2",
  }),
});
```

### Custom Actions

Extend Hyperagent's capabilities with custom actions:

```typescript
const customAction = {
  type: "CUSTOM_ACTION",
  description: "Performs a custom operation",
  parameters: {
    param1: { type: "string" },
    param2: { type: "number" },
  },
  execute: async (params) => {
    // Custom implementation
  },
};

const agent = new HyperAgent({
  customActions: [customAction],
});
```

## Contributing

We welcome contributions to Hyperagent! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://docs.hyperbrowser.ai/hyperagent/about-hyperagent)
- 💬 [Discord Community](https://discord.gg/zsYzsgVRjh)
- 🐛 [Issue Tracker](https://github.com/hyperbrowserai/HyperAgent/issues)
- 📧 [Email Support](mailto:info@hyperbrowser.ai)
