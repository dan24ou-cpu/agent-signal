import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import pool from "../db/client.js";

import { registerStatus } from "./tools/status.js";
import { registerSmartSession } from "./tools/smart-session.js";
import { registerEvaluateAndCompare } from "./tools/evaluate-and-compare.js";
import { registerTrendingProducts } from "./tools/trending-products.js";
import { registerCategoryRecommendations } from "./tools/category-recommendations.js";
import { registerConstraintMatch } from "./tools/constraint-match.js";
import { registerDealDetector } from "./tools/deal-detector.js";
import { registerBudgetSearch } from "./tools/budget-search.js";
import { registerWarnings } from "./tools/warnings.js";
import { registerMerchantReliability } from "./tools/merchant-reliability.js";
import { registerProductIntelligence } from "./tools/product-intelligence.js";
import { registerSimilarSessions } from "./tools/similar-sessions.js";
import { registerImportSession } from "./tools/import-session.js";
import { registerLogSession } from "./tools/log-session.js";
import { registerLogEvaluation } from "./tools/log-evaluation.js";
import { registerLogComparison } from "./tools/log-comparison.js";
import { registerLogOutcome } from "./tools/log-outcome.js";
import { registerGetSummary } from "./tools/get-summary.js";
import { registerPriceAlerts } from "./tools/price-alerts.js";
import { registerCompetitiveLandscape } from "./tools/competitive-landscape.js";
import { registerRejectionAnalysis } from "./tools/rejection-analysis.js";
import { registerCategoryDemand } from "./tools/category-demand.js";
import { registerMerchantScorecard } from "./tools/merchant-scorecard.js";

export function registerAllTools(server: McpServer, transport: "stdio" | "http" = "stdio") {
  // Wrap registerTool to log every tool call
  const origRegister = server.registerTool.bind(server);
  server.registerTool = ((name: string, config: any, cb: any) => {
    const wrappedCb = async (...args: any[]) => {
      pool.query(
        "INSERT INTO tool_calls (tool_name, transport) VALUES ($1, $2)",
        [name, transport]
      ).catch(() => {});
      return cb(...args);
    };
    return origRegister(name, config, wrappedCb);
  }) as typeof server.registerTool;

  // 1. Entry points — highest activation priority
  registerStatus(server);
  registerSmartSession(server);
  registerEvaluateAndCompare(server);

  // 2. Discovery — browsing & exploration
  registerTrendingProducts(server);
  registerCategoryRecommendations(server);
  registerBudgetSearch(server);
  registerConstraintMatch(server);

  // 3. Intelligence — product & deal analysis
  registerDealDetector(server);
  registerProductIntelligence(server);
  registerWarnings(server);
  registerMerchantReliability(server);
  registerSimilarSessions(server);

  // 4. Write — manual logging (smart tools preferred)
  registerLogSession(server);
  registerLogEvaluation(server);
  registerLogComparison(server);
  registerLogOutcome(server);
  registerGetSummary(server);
  registerImportSession(server);

  // 5. Monitoring
  registerPriceAlerts(server);

  // 6. Seller intelligence
  registerCompetitiveLandscape(server);
  registerRejectionAnalysis(server);
  registerCategoryDemand(server);
  registerMerchantScorecard(server);
}
