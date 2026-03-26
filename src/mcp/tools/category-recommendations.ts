import { z } from "zod";
import { getCategoryRecommendations, getNetworkStats, logCategoryMiss, getSubcategoryBreakdown } from "../../db/queries.js";
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
      logCategoryMiss(category, undefined, "get_category_recommendations").catch(() => {});
      const stats = await getNetworkStats();
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            category,
            message: `No data for '${category}' yet, but the network has ${stats.total_sessions} sessions across ${stats.categories.length} categories.`,
            available_categories: stats.categories,
            tip: "Try one of these categories, or log your session to be the first contributor for this one!",
          }, null, 2),
        }],
      };
    }

    // Add subcategory breakdown for parent categories
    const subcats = await getSubcategoryBreakdown(category);
    const response: Record<string, unknown> = { ...recs };
    if (subcats.length > 0) {
      response.subcategories = subcats;
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(response, null, 2),
      }],
    };
  });
}
