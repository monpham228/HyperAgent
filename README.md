# @hyperbrowser/agent

A powerful browser automation agent built for web navigation, interaction, and data extraction.

## Overview

Hyperbrowser Agent provides a JavaScript/TypeScript library for browser automation with AI capabilities. It uses Playwright for browser control and integrates with LLMs to perform complex web tasks. The agent can navigate websites, interact with elements, and extract data intelligently.

## Features

- 🤖 AI-powered browser automation
- 🌐 Web navigation and interaction
- 📊 Data extraction and scraping
- ⏯️ Task management (start, pause, resume, cancel)
- 🔄 Async task execution

## Installation

```bash
npm install @hyperbrowser/agent
# or
yarn add @hyperbrowser/agent
```

## Requirements

- Node.js 16+
- OpenAI API key

## Quick Start

```typescript
import { HyperAgent } from "@hyperbrowser/agent";

// Initialize the agent
const agent = new HyperAgent({
  openAIApiKey: "your-openai-api-key",
  modelName: "gpt-4o", // optional, defaults to gpt-4o
  temperature: 0, // optional, defaults to 0
});

// Execute a task
const result = await agent.executeTask(
  "Go to example.com and extract the main heading"
);

console.log(result.output);

// Clean up when done
await agent.closeAgent();
```
