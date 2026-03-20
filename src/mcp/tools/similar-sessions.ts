import { z } from "zod";
import { getSimilarSessionOutcomes } from "../../db/queries.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerSimilarSessions(server: McpServer) {
  server.registerTool("get_similar_session_outcomes", {
    title: "Learn from Similar Sessions",
    description:
      "Cross-agent learning: see what other AI agents chose when shopping for similar items " +
      "with similar constraints. Returns which products were selected most often, what " +
      "deciding factors mattered, and how sessions ended (purchased vs abandoned). " +
      "Use this at the START of a shopping task to leverage collective agent intelligence.",
    inputSchema: {
      category: z.string().describe("Product category, e.g. 'footwear/running'"),
      constraints: z.array(z.string()).describe("Shopping constraints, e.g. ['lightweight', 'cushioned', 'wide fit']"),
      budget_max: z.number().optional().describe("Maximum budget to filter similar sessions"),
    },
  }, async ({ category, constraints, budget_max }) => {
    const result = await getSimilarSessionOutcomes(category, constraints, budget_max);

    if (result.similar_sessions_found === 0) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            category,
            constraints,
            message: "No similar sessions found yet. You'll be the first!",
          }),
        }],
      };
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  });
}
