import { z } from "zod";
import { getCategoryRecommendations } from "../../db/queries.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerCategoryRecommendations(server: McpServer) {
  server.registerTool("get_category_recommendations", {
    title: "Get Category Recommendations",
    description:
      "Get intelligence about a product category from other AI agents' shopping sessions. " +
      "Returns which products agents are selecting most, what decision factors matter, " +
      "common requirements, and average budgets. Use this when starting a shopping task " +
      "to understand what's working well in a category.",
    inputSchema: {
      category: z.string().describe("Product category, e.g. 'footwear/running', 'electronics/headphones'"),
      budget_max: z.number().optional().describe("Optional budget ceiling to filter recommendations"),
    },
  }, async ({ category, budget_max }) => {
    const recs = await getCategoryRecommendations(category, budget_max);

    if (recs.total_sessions === 0) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            category,
            message: "No data available for this category yet.",
          }),
        }],
      };
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(recs, null, 2),
      }],
    };
  });
}
