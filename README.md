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
const result = await agent.executeTask(
  "Tell me if there's any steps I have to take care of a toyger cat."
);

// Asynchronous execution with control
const task = await agent.executeTaskAsync(
  "Tell me if there's any steps I have to take care of a tiger."
);
await task.pause(); // Pause the task
await task.resume(); // Resume the task
await task.cancel(); // Cancel the task
```

**Note**: In async mode, pause will only pause the task after the current step is completed.

### Multi-Page Management

```typescript
// Create and manage multiple pages
const page1 = await agent.newPage();
const page2 = await agent.newPage();

// Execute tasks on specific pages
const page1Response = await page1.ai(
  "Go to google.com/travel/explore and set the starting location to New York. Then, return to me the first recommended destination that shows up. Return to me only the name of the location."
);
const page2Response = await page2.ai(
  `I want to plan a trip to ${page1Response.output}. Recommend me places to visit there.`
);

console.log(page2Response.output);

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

Hyperagent supports multiple LLM providers. A provider can be anything that extends to the Langchain `BaseChatModel` class.

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

### MCP Support

HyperAgent functions as a fully functional MCP client.

Here is an example which reads from wikipedia, and inserts information into a google sheet using the composio Google Sheet MCP.

```typescript
const agent = new HyperAgent({
  llm: llm,
  debug: true,
});

await agent.initializeMCPClient({
  servers: [
    {
      command: "npx",
      args: [
        "@composio/mcp@latest",
        "start",
        "--url",
        "https://mcp.composio.dev/googlesheets/...",
      ],
      env: {
        npm_config_yes: "true",
      },
    },
  ],
});

const response = await agent.executeTask(
  "Go to https://en.wikipedia.org/wiki/List_of_U.S._states_and_territories_by_population and get the data on the top 5 most populous states from the table. Then insert that data into a google sheet. You may need to first check if there is an active connection to google sheet, and if there isn't connect to it and present me with the link to sign in. "
);

console.log(response);
```

### Custom Actions

HyperAgent's capabilities can be extended with custom actions. Custom actions require 3 things

- type: Name of the action. Should be something descriptive about the action.
- actionParams: A zod object describing the parameters that the action may consume
- run: A function that takes in a context, and the params for the action and produces a result based on the params.

Here is an example that performs a search using Exa

```typescript
const exaInstance = new Exa(process.env.EXA_API_KEY);

export const RunSearchActionDefinition: AgentActionDefinition = {
  type: "perform_search",
  actionParams: z.object({
    search: z
      .string()
      .describe(
        "The search query for something you want to search about. Keep the search query concise and to-the-point."
      ),
  }).describe("Search and return the results for a given query.");,
  run: async function (
    ctx: ActionContext,
    params: z.infer<typeof searchSchema>
  ): Promise<ActionOutput> {
    const results = (await exaInstance.search(params.search, {})).results
      .map(
        (res) =>
          `title: ${res.title} || url: ${res.url} || relevance: ${res.score}`
      )
      .join("\n");

    return {
      success: true,
      message: `Succesfully performed search for query ${params.search}. Got results: \n${results}`,
    };
  },
};

const agent = new HyperAgent({
  "Search about the news for today in New York",
  customActions: [RunSearchActionDefinition],
});
```

## Cloud Support

HyperAgent is built with cloud deployments in mind, utilising Hyperbrowser to offer the best environment for running web agents.

Configuring HyperAgent for web deployments can be done simply using

```typescript
const agent = new HyperAgent({
  llm: llm,
  debug: true,
  // Set browserProvider to "Hyperbrowser"
  browserProvider: "Hyperbrowser",
});

const response = await agent.executeTask(
  "Go to hackernews, and list me the 5 most recent article titles"
);

console.log(response);
```

### Further Configuring Hyperbrowser

HyperAgent also supports customising the Hyperbrowser session. The session parameters can be provided in the `hyperbrowserConfig` param passed when initializing HyperAgent

```typescript
const agent = new HyperAgent({
  llm: llm,
  debug: true,
  browserProvider: "Hyperbrowser",
  hyperbrowserConfig: {
    hyperbrowserSessionOptions: {
      useProxy: true,
      proxyCountry: "AU",
    },
  },
});

const response = await agent.executeTask(
  "Go to hackernews, and list me the 5 most recent article titles"
);

console.log(response);
```

A list of all parameters supported can be seen on our [docs](https://docs.hyperbrowser.ai/reference/sdks/node/sessions)

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
