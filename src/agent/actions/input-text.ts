import { z } from "zod";
import { ActionContext, AgentActionDefinition } from "@/types";

export const InputTextAction = z
  .object({
    index: z
      .number()
      .describe("The numeric index of the element to input text."),
    text: z.string().describe("The text to input."),
  })
  .describe("Input text into a input interactive element");

export type InputTextActionType = typeof InputTextAction;

export const InputTextActionDefinition: AgentActionDefinition<InputTextActionType> =
  {
    type: "inputText" as const,
    actionParams: InputTextAction,
    run: async (ctx: ActionContext, action) => {
      const { index, text } = action;
      const xpath = ctx.domState.idxToXPath.get(index);
      if (!xpath) {
        return { success: false, message: "Element not found" };
      }
      await ctx.page.locator(`xpath=${xpath}`).fill(text);
      return {
        success: true,
        message: `Inputted text "${text}" into element with index ${index}`,
      };
    },
    pprintAction: function (params: z.infer<InputTextActionType>): string {
      return `Input text "${params.text}" into element at index ${params.index}`;
    },
  };
