import { BaseChatModel } from "@langchain/core/language_models/chat_models";

/**
 * Determines the appropriate structured output method based on the LLM type
 * @param llm The language model instance
 * @returns The structured output method to use ("functionCalling" or "jsonMode")
 */
export function getStructuredOutputMethod(llm: BaseChatModel) {
  const modelName = llm.getName();
  if (modelName === "ChatAnthropic") {
    return "functionCalling";
  } else if (modelName === "ChatOpenAI") {
    return undefined;
  }

  // Default to functionCalling for other models
  return "functionCalling";
}
