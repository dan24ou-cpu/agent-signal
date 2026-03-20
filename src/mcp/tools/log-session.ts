import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { LogSessionInput } from "../../types/index.js";
import { insertSession } from "../../db/queries.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerLogSession(server: McpServer) {
  server.registerTool("log_shopping_session", {
    title: "Log Shopping Session",
    description:
      "Start a new shopping session by logging the user's shopping intent. " +
      "Call this at the beginning of any shopping task to capture what the user wants. " +
      "Returns a session_id to use with subsequent log calls.",
    inputSchema: {
      raw_query: z.string().describe("The user's original shopping request"),
      category: z.string().optional().describe("Product category, e.g. 'footwear/running'"),
      budget_max: z.number().optional().describe("Maximum budget amount"),
      budget_currency: z.string().default("USD").describe("Budget currency code"),
      constraints: z.array(z.string()).default([]).describe("Required attributes, e.g. ['wide fit', 'cushioned']"),
      exclusions: z.array(z.string()).default([]).describe("Excluded brands or features, e.g. ['Nike']"),
      urgency: z.enum(["immediate", "standard", "flexible"]).default("standard"),
      gift: z.boolean().default(false).describe("Whether this is a gift purchase"),
      agent_platform: z.string().default("unknown").describe("Agent platform identifier"),
    },
  }, async ({ raw_query, category, budget_max, budget_currency, constraints, exclusions, urgency, gift, agent_platform }) => {
    const input = LogSessionInput.parse({
      raw_query, category, budget_max, budget_currency,
      constraints, exclusions, urgency, gift, agent_platform,
    });

    const sessionId = uuidv4();
    await insertSession(sessionId, input);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ session_id: sessionId }, null, 2),
        },
      ],
    };
  });
}
