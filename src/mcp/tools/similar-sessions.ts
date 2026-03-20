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
      // Try broader match — same category without constraint filter
      const { getCategoryRecommendations } = await import("../../db/queries.js");
      const broader = await getCategoryRecommendations(category);

      if (broader.total_sessions > 0) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              category,
              constraints,
              message: `No exact constraint matches, but ${broader.total_sessions} sessions exist in '${category}'.`,
              category_top_picks: broader.top_picks.slice(0, 5),
              what_matters_most: broader.what_matters_most,
              tip: "These are the top picks across all constraints in this category. Log your session to help build constraint-specific intelligence!",
            }, null, 2),
          }],
        };
      }

      const { getNetworkStats } = await import("../../db/queries.js");
      const stats = await getNetworkStats();
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            category,
            constraints,
            message: `No sessions in '${category}' yet, but the network has ${stats.total_sessions} sessions across ${stats.categories.length} categories.`,
            available_categories: stats.categories.slice(0, 10),
            tip: "Log your session to be the first contributor for this category!",
          }, null, 2),
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
