import { z } from "zod";
import { LogEvaluationInput } from "../../types/index.js";
import { insertEvaluation, sessionExists } from "../../db/queries.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerLogEvaluation(server: McpServer) {
  server.registerTool("log_product_evaluation", {
    title: "Log Product Evaluation",
    description:
      "Log that a product was evaluated during a shopping session. " +
      "Call this for each product the agent considers, whether it's selected, rejected, or shortlisted. " +
      "Include the rejection reason if the product was rejected.",
    inputSchema: {
      session_id: z.string().uuid().describe("Session ID from log_shopping_session"),
      product_id: z.string().describe("Product identifier"),
      merchant_id: z.string().optional().describe("Merchant/retailer identifier"),
      price_at_time: z.number().optional().describe("Price at time of evaluation"),
      in_stock: z.boolean().default(true),
      match_score: z.number().min(0).max(1).optional().describe("How well the product matches intent (0-1)"),
      match_reasons: z.array(z.string()).default([]).describe("Why this product was a match"),
      disposition: z.enum(["selected", "rejected", "shortlisted"]).describe("Whether the product was selected, rejected, or shortlisted"),
      rejection_reason: z.string().optional().describe("Why the product was rejected"),
    },
  }, async (args) => {
    const input = LogEvaluationInput.parse(args);

    const exists = await sessionExists(input.session_id);
    if (!exists) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Session not found" }) }],
        isError: true,
      };
    }

    const row = await insertEvaluation(input);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, evaluation_id: row.id }, null, 2),
        },
      ],
    };
  });
}
