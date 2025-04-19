import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Browser, BrowserContext, Page } from "playwright";
import * as z from "zod";

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";

import { HyperagentConfig, MCPConfig, MCPServerConfig } from "@/types/config";
import { sleep, retry } from "@/utils";

import { SYSTEM_PROMPT } from "./messages/system-prompt";
import { buildAgentStepMessages } from "./messages/builder";
import { HyperagentError } from "./error";
import { getStructuredOutputMethod } from "./llms/structured-output";

import {
  TaskState,
  AgentOutputFn,
  TaskParams,
  Task,
  TaskStatus,
  TaskOutput,
  AgentStep,
  endTaskStatuses,
  AgentActionDefinition,
  ActionType,
  ActionOutput,
  ActionContext,
} from "@/types";
import {
  CompleteActionDefinition,
  generateCompleteActionWithOutputDefinition,
  ActionNotFoundError,
  DEFAULT_ACTIONS,
} from "./actions";
import {
  HyperbrowserProvider,
  LocalBrowserProvider,
} from "../browser-providers";

import { MCPClient } from "./mcp/client";
import BrowserProvider from "@/types/browser-providers/types";
import { getDom } from "@/context-providers/dom";
import { removeHighlight } from "@/context-providers/dom";
import { DOMState } from "@/context-providers/dom/types";

export class HyperAgent {
  private llm: BaseChatModel;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private tasks: Record<string, TaskState> = {};
  private tokenLimit: number = 128000;
  public currentPage: Page | null = null;
  private debug: boolean = false;
  private mcpClient: MCPClient | null = null;
  private browserProvider: BrowserProvider;
  private actions: Array<AgentActionDefinition> = [...DEFAULT_ACTIONS];

  constructor(params: HyperagentConfig = {}) {
    if (!params.llm) {
      console.log(
        "No LLM provider provided as a param. Will use OPENAI_API_KEY as a fallback along with GPT-4o as the LLM model."
      );
      if (process.env.OPENAI_API_KEY) {
        this.llm = new ChatOpenAI({
          openAIApiKey: process.env.OPENAI_API_KEY,
          modelName: "gpt-4o",
          temperature: 0,
        });
      } else {
        throw new HyperagentError("OpenAI API key is required", 400);
      }
    } else {
      this.llm = params.llm;
    }

    if (params.outputSchema) {
      this.registerAction(
        generateCompleteActionWithOutputDefinition(params.outputSchema)
      );
    } else {
      this.registerAction(CompleteActionDefinition);
    }

    if (params.hyperbrowserConfig) {
      this.browserProvider = new HyperbrowserProvider(
        params.hyperbrowserConfig
      );
    } else {
      this.browserProvider = new LocalBrowserProvider();
    }

    if (params.customActions) {
      params.customActions.forEach(this.registerAction, this);
    }

    this.debug = params.debug ?? false;
  }

  async initializeMCPClient(config: MCPConfig): Promise<void> {
    if (config && config.servers.length > 0) {
      this.mcpClient = new MCPClient();

      try {
        for (const serverConfig of config.servers) {
          try {
            const { serverId, actions } =
              await this.mcpClient.connectToServer(serverConfig);
            for (const action of actions) {
              this.registerAction(action);
            }
            console.log(`MCP server ${serverId} initialized successfully`);
          } catch (error) {
            console.error(
              `Failed to initialize MCP server ${serverConfig.id || "unknown"}:`,
              error
            );
          }
        }

        const serverIds = this.mcpClient.getServerIds();
        console.log(
          `Successfully connected to ${serverIds.length} MCP servers`
        );
      } catch (error) {
        console.error("Failed to initialize MCP client:", error);
        this.mcpClient = null;
      }
    }
  }

  private async createBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await this.browserProvider.start();
      this.context = await this.browser.newContext({
        viewport: null,
      });
      return this.browser;
    }
    return this.browser;
  }

  public async closeAgent(): Promise<void> {
    for (const taskId in this.tasks) {
      const task = this.tasks[taskId];
      if (!endTaskStatuses.has(task.status)) {
        task.status = TaskStatus.CANCELLED;
      }
    }

    if (this.mcpClient) {
      await this.mcpClient.disconnect();
      this.mcpClient = null;
    }

    if (this.browser) {
      await this.browserProvider.close();
      this.browser = null;
      this.context = null;
    }
  }

  public async getCurrentPage(): Promise<Page> {
    if (!this.browser) {
      await this.createBrowser();
    }
    if (!this.context) {
      throw new HyperagentError("No context found");
    }
    if (!this.currentPage || this.currentPage.isClosed()) {
      this.currentPage = await this.context.newPage();
      return this.currentPage;
    }
    return this.currentPage;
  }

  private async getScreenshot(page: Page): Promise<string> {
    // TODO maybe cache cdp sessions?
    const cdpSession = await page.context().newCDPSession(page);
    const screenshot = await cdpSession.send("Page.captureScreenshot");
    await cdpSession.detach();
    return screenshot.data;
  }

  private async runAction(
    action: ActionType,
    domState: DOMState,
    page: Page,
    debugDir?: string
  ): Promise<ActionOutput> {
    const ctx: ActionContext = {
      domState,
      page,
      tokenLimit: this.tokenLimit,
      llm: this.llm,
      debugDir: debugDir,
      mcpClient: this.mcpClient || undefined,
    };
    const actionType = action.type;
    const actionHandler = this.getActionHandler(action.type);
    if (!actionHandler) {
      return {
        success: false,
        message: `Unknown action type: ${actionType}`,
      };
    }
    try {
      return await actionHandler(ctx, action.params);
    } catch (error) {
      return {
        success: false,
        message: `Action ${action.type} failed: ${error}`,
      };
    }
  }

  private async executeTaskInner(
    taskId: string,
    params?: TaskParams
  ): Promise<TaskOutput> {
    const taskState = this.tasks[taskId];
    const debugDir = params?.debugDir || `debug/${taskId}`;
    if (this.debug) {
      console.log(`Debugging task ${taskId} in ${debugDir}`);
    }
    if (!taskState) {
      throw new HyperagentError(`Task ${taskId} not found`);
    }

    taskState.status = TaskStatus.RUNNING as TaskStatus;
    if (!this.llm) {
      throw new HyperagentError("LLM not initialized");
    }
    const llmStructured = this.llm.withStructuredOutput(
      AgentOutputFn(this.getActionSchema()),
      {
        method: getStructuredOutputMethod(this.llm),
      }
    );
    const baseMsgs = [{ role: "system", content: SYSTEM_PROMPT }];

    let output = "";
    const page = taskState.startingPage;
    let currStep = 0;
    while (true) {
      // Status Checks
      if ((taskState.status as TaskStatus) == TaskStatus.PAUSED) {
        await sleep(100);
        continue;
      }
      if (endTaskStatuses.has(taskState.status)) {
        break;
      }
      if (params?.maxSteps && currStep >= params.maxSteps) {
        taskState.status = TaskStatus.CANCELLED;
        break;
      }
      const debugStepDir = `${debugDir}/step-${currStep}`;
      if (this.debug) {
        fs.mkdirSync(debugStepDir, { recursive: true });
      }

      // Get DOM State
      const domState = await retry({ func: () => getDom(page) });
      if (!domState) {
        console.log("no dom state, waiting 1 second.");
        await sleep(1000);
        continue;
      }
      const screenshot = await this.getScreenshot(page);

      // Store Dom State for Debugging
      if (this.debug) {
        fs.mkdirSync(debugDir, { recursive: true });
        fs.writeFileSync(`${debugStepDir}/elems.txt`, domState.domState);
        if (screenshot) {
          fs.writeFileSync(
            `${debugStepDir}/screenshot.png`,
            Buffer.from(screenshot, "base64")
          );
        }
      }

      // Build Agent Step Messages
      const msgs = await buildAgentStepMessages(
        baseMsgs,
        this.tasks[taskId].steps,
        taskState.task,
        page,
        domState,
        screenshot
      );

      // Store Agent Step Messages for Debugging
      if (this.debug) {
        fs.writeFileSync(
          `${debugStepDir}/msgs.json`,
          JSON.stringify(msgs, null, 2)
        );
      }

      // Invoke LLM
      const agentOutput = await retry({
        func: () => llmStructured.invoke(msgs),
      });

      params?.debugOnAgentOutput?.(agentOutput);

      // Status Checks
      if ((taskState.status as TaskStatus) == TaskStatus.PAUSED) {
        await sleep(100);
        continue;
      }
      if (endTaskStatuses.has(taskState.status)) {
        break;
      }

      // Remove Highlights
      await removeHighlight(page);

      // Run Actions
      const actions = agentOutput.actions;
      const actionOutputs: ActionOutput[] = [];
      for (const action of actions) {
        if (action.type === "complete") {
          taskState.status = TaskStatus.COMPLETED;
          const actionDefinition = this.actions.find(
            (actionDefinition) => actionDefinition.type === "complete"
          );
          if (actionDefinition) {
            output =
              (await actionDefinition.completeAction?.(action.params)) ??
              "No complete action found";
          } else {
            output = "No complete action found";
          }
        }
        const actionOutput = await this.runAction(
          action as ActionType,
          domState,
          page,
          debugStepDir
        );
        actionOutputs.push(actionOutput);
        await sleep(2000); // TODO: look at this - smarter page loading
      }
      const step: AgentStep = {
        idx: currStep,
        agentOutput: agentOutput,
        actionOutputs,
      };
      taskState.steps.push(step);
      params?.onStep?.(step);
      currStep = currStep + 1;

      if (this.debug) {
        fs.writeFileSync(
          `${debugStepDir}/stepOutput.json`,
          JSON.stringify(step, null, 2)
        );
      }
    }

    const taskOutput: TaskOutput = {
      status: taskState.status,
      steps: taskState.steps,
      output,
    };
    if (this.debug) {
      fs.writeFileSync(
        `${debugDir}/taskOutput.json`,
        JSON.stringify(taskOutput, null, 2)
      );
    }
    params?.onComplete?.(taskOutput);
    return taskOutput;
  }

  private getTaskControl(taskId: string): Task {
    const taskState = this.tasks[taskId];
    if (!taskState) {
      throw new HyperagentError(`Task ${taskId} not found`);
    }
    return {
      getStatus: () => taskState.status,
      pause: () => {
        if (taskState.status === TaskStatus.RUNNING) {
          taskState.status = TaskStatus.PAUSED;
        }
        return taskState.status;
      },
      resume: () => {
        if (taskState.status === TaskStatus.PAUSED) {
          taskState.status = TaskStatus.RUNNING;
        }
        return taskState.status;
      },
      cancel: () => {
        if (taskState.status != TaskStatus.COMPLETED) {
          taskState.status = TaskStatus.CANCELLED;
        }
        return taskState.status;
      },
    };
  }

  public async executeTaskAsync(
    task: string,
    params?: TaskParams
  ): Promise<Task> {
    const taskId = uuidv4();
    const page = params?.startingPage || (await this.getCurrentPage());
    const taskState: TaskState = {
      id: taskId,
      task: task,
      status: TaskStatus.PENDING,
      startingPage: page,
      steps: [],
    };
    this.tasks[taskId] = taskState;
    this.executeTaskInner(taskId, params).catch((error) => {
      taskState.status = TaskStatus.FAILED;
      taskState.error = error.message;
    });
    return this.getTaskControl(taskId);
  }

  public async executeTask(
    task: string,
    params?: TaskParams
  ): Promise<TaskOutput> {
    const taskId = uuidv4();
    const page = params?.startingPage || (await this.getCurrentPage());
    const taskState: TaskState = {
      id: taskId,
      task: task,
      status: TaskStatus.PENDING,
      startingPage: page,
      steps: [],
    };
    this.tasks[taskId] = taskState;
    try {
      return await this.executeTaskInner(taskId, params);
    } catch (error) {
      taskState.status = TaskStatus.FAILED;
      throw error;
    }
  }

  private async registerAction(action: AgentActionDefinition) {
    const actionsList = new Set(
      this.actions.map((registeredAction) => registeredAction.type)
    );
    if (actionsList.has(action.type)) {
      throw new Error(
        `Could not register action of type ${action.type}. Action with the same name is already registered`
      );
    } else {
      this.actions.push(action);
    }
  }

  private getActionSchema() {
    const zodDefs = this.actions.map((action) =>
      z.object({
        type: z.nativeEnum([action.type] as unknown as z.EnumLike),
        params: action.actionParams,
      })
    );
    return z.union([zodDefs[0], zodDefs[1], ...zodDefs.splice(2)]);
  }

  private getActionHandler(type: string) {
    const foundAction = this.actions.find((actions) => actions.type === type);
    if (foundAction) {
      return foundAction.run;
    } else {
      throw new ActionNotFoundError(type);
    }
  }

  /**
   * Connect to an MCP server at runtime
   * @param serverConfig Configuration for the MCP server
   * @returns Server ID if connection was successful
   */
  public async connectToMCPServer(
    serverConfig: MCPServerConfig
  ): Promise<string | null> {
    if (!this.mcpClient) {
      this.mcpClient = new MCPClient();
    }

    try {
      const { serverId, actions } =
        await this.mcpClient.connectToServer(serverConfig);

      // Register the actions from this server
      for (const action of actions) {
        this.registerAction(action);
      }

      console.log(`Connected to MCP server with ID: ${serverId}`);
      return serverId;
    } catch (error) {
      console.error(`Failed to connect to MCP server:`, error);
      return null;
    }
  }

  /**
   * Disconnect from a specific MCP server
   * @param serverId ID of the server to disconnect from
   * @returns Boolean indicating if the disconnection was successful
   */
  public disconnectFromMCPServer(serverId: string): boolean {
    if (!this.mcpClient) {
      return false;
    }

    try {
      this.mcpClient.disconnectServer(serverId);
      return true;
    } catch (error) {
      console.error(`Failed to disconnect from MCP server ${serverId}:`, error);
      return false;
    }
  }

  /**
   * Check if a specific MCP server is connected
   * @param serverId ID of the server to check
   * @returns Boolean indicating if the server is connected
   */
  public isMCPServerConnected(serverId: string): boolean {
    if (!this.mcpClient) {
      return false;
    }
    return this.mcpClient.getServerIds().includes(serverId);
  }

  /**
   * Get all connected MCP server IDs
   * @returns Array of server IDs
   */
  public getMCPServerIds(): string[] {
    if (!this.mcpClient) {
      return [];
    }
    return this.mcpClient.getServerIds();
  }

  /**
   * Get information about all connected MCP servers
   * @returns Array of server information objects or null if no MCP client is initialized
   */
  public getMCPServerInfo(): Array<{
    id: string;
    toolCount: number;
    toolNames: string[];
  }> | null {
    if (!this.mcpClient) {
      return null;
    }

    return this.mcpClient.getServerInfo();
  }

  public pprintAction(action: ActionType): string {
    const foundAction = this.actions.find(
      (actions) => actions.type === action.type
    );
    if (foundAction && foundAction.pprintAction) {
      return foundAction.pprintAction(action.params);
    }
    return "";
  }
}
