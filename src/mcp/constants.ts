export const MCP_VERSION = "0.6.2";

export const MCP_INSTRUCTIONS = [
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
].join("\n");
