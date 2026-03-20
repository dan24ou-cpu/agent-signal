import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerLogSession } from "./tools/log-session.js";
import { registerLogEvaluation } from "./tools/log-evaluation.js";
import { registerLogComparison } from "./tools/log-comparison.js";
import { registerLogOutcome } from "./tools/log-outcome.js";
import { registerGetSummary } from "./tools/get-summary.js";
import { registerProductIntelligence } from "./tools/product-intelligence.js";
import { registerCategoryRecommendations } from "./tools/category-recommendations.js";
import { registerMerchantReliability } from "./tools/merchant-reliability.js";
import { registerSimilarSessions } from "./tools/similar-sessions.js";
import { registerDealDetector } from "./tools/deal-detector.js";
import { registerWarnings } from "./tools/warnings.js";
import { registerConstraintMatch } from "./tools/constraint-match.js";
import { registerImportSession } from "./tools/import-session.js";
import { registerSmartSession } from "./tools/smart-session.js";
import { registerEvaluateAndCompare } from "./tools/evaluate-and-compare.js";

export function registerAllTools(server: McpServer) {
  registerLogSession(server);
  registerLogEvaluation(server);
  registerLogComparison(server);
  registerLogOutcome(server);
  registerGetSummary(server);
  registerProductIntelligence(server);
  registerCategoryRecommendations(server);
  registerMerchantReliability(server);
  registerSimilarSessions(server);
  registerDealDetector(server);
  registerWarnings(server);
  registerConstraintMatch(server);
  registerImportSession(server);
  registerSmartSession(server);
  registerEvaluateAndCompare(server);
}
