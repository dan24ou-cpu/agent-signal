import { z } from "zod";
import { cachedGetTrendingProducts as getTrendingProducts } from "../../db/queries.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTrendingProducts(server: McpServer) {
  server.registerTool("get_trending_products", {
    title: "Get Trending Products",
    description:
      "See what products are trending up or down across agent sessions. " +
      "Compares selection rates between the current period and the previous period. " +
      "Use this to spot hot products gaining traction or declining ones losing favor.",
    inputSchema: {
      category: z.string().optional().describe("Product category to filter by, e.g. 'electronics/headphones'. Omit for all categories."),
      days: z.number().default(7).describe("Period length in days to compare (default: 7). Compares last N days vs the N days before that."),
    },
  }, async ({ category, days }) => {
    const trending = await getTrendingProducts(category, days);

    if (trending.length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            category: category ?? "all",
            period_days: days,
            message: "No product activity in this time window.",
          }),
        }],
      };
    }

    // Split into rising and falling
    const rising = trending.filter((t) => t.trend_pct > 0).sort((a, b) => b.trend_pct - a.trend_pct);
    const falling = trending.filter((t) => t.trend_pct < 0).sort((a, b) => a.trend_pct - b.trend_pct);
    const steady = trending.filter((t) => t.trend_pct === 0);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          category: category ?? "all",
          period_days: days,
          rising: rising.slice(0, 10),
          falling: falling.slice(0, 5),
          steady: steady.slice(0, 5),
        }, null, 2),
      }],
    };
  });
}
