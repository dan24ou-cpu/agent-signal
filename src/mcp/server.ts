import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../.env") });

// Fallback to hosted DB for npx users without a local .env
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://neondb_owner:npg_uT5d2iXUWNDh@ep-super-mouse-am4gd9re-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
}

import { registerAllTools } from "./register-tools.js";

const server = new McpServer(
  { name: "agent-signal", version: "0.6.0" },
  {
    instructions: [
      "AgentSignal provides collective intelligence from a network of AI shopping agents.",
      "",
      "WHEN TO USE: Call these tools whenever the user asks to buy, compare, find, or recommend a product.",
      "Trigger phrases: 'buy', 'find me', 'best', 'recommend', 'compare', 'under $X', 'looking for', 'shopping for', 'gift ideas', 'deal on', any product category mention.",
      "",
      "START HERE: Call smart_shopping_session with the user's query to get a session ID + instant intelligence (what other agents chose, top products, deciding factors).",
      "",
      "WORKFLOW: smart_shopping_session → evaluate_and_compare (for each product) → log_outcome",
      "",
      "NO SHOPPING TASK? Call get_trending_products or get_category_recommendations to explore what's popular.",
    ].join("\n"),
  }
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("AgentSignal MCP server running on stdio");
