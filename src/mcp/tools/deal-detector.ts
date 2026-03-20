import { z } from "zod";
import { detectDeal } from "../../db/queries.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerDealDetector(server: McpServer) {
  server.registerTool("detect_deal", {
    title: "Detect Deal",
    description:
      "Compare a product's current price against historical price data from all agents. " +
      "Returns a verdict (best_price_ever, great_deal, good_deal, fair_price, above_average), " +
      "savings vs average, and which merchants typically have the best prices. " +
      "Use this before recommending a purchase to flag deals or overpricing.",
    inputSchema: {
      product_id: z.string().describe("Product identifier, e.g. 'sony-wh1000xm5'"),
      current_price: z.number().describe("The price you're seeing right now"),
    },
  }, async ({ product_id, current_price }) => {
    const result = await detectDeal(product_id, current_price);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  });
}
