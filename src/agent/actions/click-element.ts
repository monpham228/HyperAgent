import { z } from "zod";
import { ActionContext, ActionOutput, AgentActionDefinition } from "@/types";

const ClickElementAction = z
  .object({
    index: z.number().describe("The numeric index of the element to click."),
  })
  .describe("Click on an element identified by its index");

type ClickElementActionType = z.infer<typeof ClickElementAction>;

export const ClickElementActionDefinition: AgentActionDefinition = {
  type: "clickElement" as const,
  actionParams: ClickElementAction,
  run: async function (
    ctx: ActionContext,
    action: ClickElementActionType
  ): Promise<ActionOutput> {
    const { index } = action;
    const xpath = ctx.domState.idxToXPath.get(index);
    if (!xpath) {
      return { success: false, message: "Element not found" };
    }
    const locator = ctx.page.locator(`xpath=${xpath}`);
    const exists = (await locator.count()) > 0;
    if (!exists) {
      return { success: false, message: "Element not found on page" };
    }
    await ctx.page.locator(`xpath=${xpath}`).click({ timeout: 1000 });
    return { success: true, message: `Clicked element with index ${index}` };
  },
  pprintAction: function (params: ClickElementActionType): string {
    return `Click element at index ${params.index}`;
  },
};
