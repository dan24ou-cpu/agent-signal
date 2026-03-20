import pool from "./client.js";
import type {
  LogSessionInput,
  LogEvaluationInput,
  LogComparisonInput,
  LogOutcomeInput,
  ShoppingSessionRow,
  ProductEvaluationRow,
  ComparisonRow,
  OutcomeRow,
} from "../types/index.js";

// ── Inserts ──

export async function insertSession(
  sessionId: string,
  input: LogSessionInput
): Promise<ShoppingSessionRow> {
  const result = await pool.query<ShoppingSessionRow>(
    `INSERT INTO shopping_sessions
       (session_id, agent_platform, raw_query, category, budget_max, budget_currency,
        constraints, exclusions, urgency, gift)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      sessionId,
      input.agent_platform,
      input.raw_query,
      input.category ?? null,
      input.budget_max ?? null,
      input.budget_currency,
      JSON.stringify(input.constraints),
      JSON.stringify(input.exclusions),
      input.urgency,
      input.gift,
    ]
  );
  return result.rows[0];
}

export async function insertEvaluation(
  input: LogEvaluationInput
): Promise<ProductEvaluationRow> {
  const result = await pool.query<ProductEvaluationRow>(
    `INSERT INTO product_evaluations
       (session_id, product_id, merchant_id, price_at_time, in_stock,
        match_score, match_reasons, disposition, rejection_reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.session_id,
      input.product_id,
      input.merchant_id ?? null,
      input.price_at_time ?? null,
      input.in_stock,
      input.match_score ?? null,
      JSON.stringify(input.match_reasons),
      input.disposition,
      input.rejection_reason ?? null,
    ]
  );
  return result.rows[0];
}

export async function insertComparison(
  input: LogComparisonInput
): Promise<ComparisonRow> {
  const result = await pool.query<ComparisonRow>(
    `INSERT INTO comparisons
       (session_id, products_compared, dimensions_compared, winner_product_id, deciding_factor)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.session_id,
      JSON.stringify(input.products_compared),
      JSON.stringify(input.dimensions_compared),
      input.winner_product_id,
      input.deciding_factor,
    ]
  );
  return result.rows[0];
}

export async function insertOutcome(
  input: LogOutcomeInput
): Promise<OutcomeRow> {
  const result = await pool.query<OutcomeRow>(
    `INSERT INTO outcomes
       (session_id, outcome_type, product_chosen_id, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      input.session_id,
      input.outcome_type,
      input.product_chosen_id ?? null,
      input.reason ?? null,
    ]
  );
  return result.rows[0];
}

// ── Reads ──

export async function sessionExists(sessionId: string): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM shopping_sessions WHERE session_id = $1",
    [sessionId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function getSessionSummary(sessionId: string) {
  const [session, evaluations, comparisons, outcome] = await Promise.all([
    pool.query<ShoppingSessionRow>(
      "SELECT * FROM shopping_sessions WHERE session_id = $1",
      [sessionId]
    ),
    pool.query<ProductEvaluationRow>(
      "SELECT * FROM product_evaluations WHERE session_id = $1 ORDER BY created_at",
      [sessionId]
    ),
    pool.query<ComparisonRow>(
      "SELECT * FROM comparisons WHERE session_id = $1 ORDER BY created_at",
      [sessionId]
    ),
    pool.query<OutcomeRow>(
      "SELECT * FROM outcomes WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1",
      [sessionId]
    ),
  ]);

  if (session.rowCount === 0) return null;

  return {
    session: session.rows[0],
    evaluations: evaluations.rows,
    comparisons: comparisons.rows,
    outcome: outcome.rows[0] ?? null,
  };
}

export async function getRecentSessions(limit = 20, offset = 0) {
  const result = await pool.query<ShoppingSessionRow>(
    "SELECT * FROM shopping_sessions ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  return result.rows;
}

// ── Aggregation Queries ──

export async function getProductAggregates(productId: string) {
  const [counts, rejections, lostTo] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) AS times_considered,
         COUNT(*) FILTER (WHERE disposition = 'shortlisted') AS times_shortlisted,
         COUNT(*) FILTER (WHERE disposition = 'selected') AS times_selected,
         COUNT(*) FILTER (WHERE disposition = 'rejected') AS times_rejected
       FROM product_evaluations
       WHERE product_id = $1`,
      [productId]
    ),
    pool.query(
      `SELECT rejection_reason, COUNT(*) AS count
       FROM product_evaluations
       WHERE product_id = $1 AND disposition = 'rejected' AND rejection_reason IS NOT NULL
       GROUP BY rejection_reason
       ORDER BY count DESC
       LIMIT 10`,
      [productId]
    ),
    pool.query(
      `SELECT c.winner_product_id AS competitor_product_id,
              COUNT(*) AS count,
              MODE() WITHIN GROUP (ORDER BY c.deciding_factor) AS primary_reason
       FROM comparisons c
       WHERE $1 = ANY(
         SELECT jsonb_array_elements_text(c.products_compared)
       )
       AND c.winner_product_id != $1
       GROUP BY c.winner_product_id
       ORDER BY count DESC
       LIMIT 10`,
      [productId]
    ),
  ]);

  const row = counts.rows[0];
  const considered = Number(row.times_considered);
  const selected = Number(row.times_selected);

  return {
    product_id: productId,
    times_considered: considered,
    times_shortlisted: Number(row.times_shortlisted),
    times_selected: selected,
    times_rejected: Number(row.times_rejected),
    top_rejection_reasons: rejections.rows.map((r) => ({
      reason: r.rejection_reason,
      count: Number(r.count),
    })),
    lost_to: lostTo.rows.map((r) => ({
      competitor_product_id: r.competitor_product_id,
      count: Number(r.count),
      primary_reason: r.primary_reason,
    })),
    consideration_to_selection_rate:
      considered > 0 ? selected / considered : 0,
  };
}

export async function getCategoryAggregates(category: string) {
  const [sessions, evalStats, compStats, factors, constraints] =
    await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total,
                AVG(budget_max) AS avg_budget
         FROM shopping_sessions
         WHERE category = $1`,
        [category]
      ),
      pool.query(
        `SELECT s.session_id, COUNT(e.id) AS eval_count
         FROM shopping_sessions s
         LEFT JOIN product_evaluations e ON e.session_id = s.session_id
         WHERE s.category = $1
         GROUP BY s.session_id`,
        [category]
      ),
      pool.query(
        `SELECT s.session_id, COUNT(c.id) AS comp_count
         FROM shopping_sessions s
         LEFT JOIN comparisons c ON c.session_id = s.session_id
         WHERE s.category = $1
         GROUP BY s.session_id`,
        [category]
      ),
      pool.query(
        `SELECT c.deciding_factor AS factor, COUNT(*) AS count
         FROM comparisons c
         JOIN shopping_sessions s ON s.session_id = c.session_id
         WHERE s.category = $1
         GROUP BY c.deciding_factor
         ORDER BY count DESC
         LIMIT 10`,
        [category]
      ),
      pool.query(
        `SELECT value, COUNT(*) AS count
         FROM shopping_sessions,
              jsonb_array_elements_text(constraints) AS value
         WHERE category = $1
         GROUP BY value
         ORDER BY count DESC
         LIMIT 10`,
        [category]
      ),
    ]);

  const totalSessions = Number(sessions.rows[0]?.total ?? 0);
  const avgEvals =
    evalStats.rows.length > 0
      ? evalStats.rows.reduce((sum, r) => sum + Number(r.eval_count), 0) /
        evalStats.rows.length
      : 0;
  const avgComps =
    compStats.rows.length > 0
      ? compStats.rows.reduce((sum, r) => sum + Number(r.comp_count), 0) /
        compStats.rows.length
      : 0;

  return {
    category,
    total_sessions: totalSessions,
    avg_products_considered: Math.round(avgEvals * 100) / 100,
    avg_comparisons_made: Math.round(avgComps * 100) / 100,
    top_decision_factors: factors.rows.map((r) => ({
      factor: r.factor,
      count: Number(r.count),
    })),
    trending_constraints: constraints.rows.map((r) => ({
      attribute: r.value,
      count: Number(r.count),
    })),
  };
}

export async function getCompetitiveLosses(productId: string) {
  const result = await pool.query(
    `SELECT c.winner_product_id,
            COUNT(*) AS times_lost,
            c.deciding_factor,
            array_agg(DISTINCT d.value) AS dimensions
     FROM comparisons c,
          jsonb_array_elements_text(c.dimensions_compared) AS d(value)
     WHERE $1 = ANY(
       SELECT jsonb_array_elements_text(c.products_compared)
     )
     AND c.winner_product_id != $1
     GROUP BY c.winner_product_id, c.deciding_factor
     ORDER BY times_lost DESC
     LIMIT 20`,
    [productId]
  );

  return result.rows.map((r) => ({
    competitor_product_id: r.winner_product_id,
    times_lost: Number(r.times_lost),
    deciding_factor: r.deciding_factor,
    dimensions: r.dimensions,
  }));
}

// ── Agent Intelligence Queries ──

export async function getProductIntelligence(productId: string) {
  const [stats, rejections, competitors, avgPrice, recentOutcomes] =
    await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) AS times_considered,
           COUNT(*) FILTER (WHERE disposition = 'selected') AS times_selected,
           COUNT(*) FILTER (WHERE disposition = 'rejected') AS times_rejected,
           COUNT(*) FILTER (WHERE disposition = 'shortlisted') AS times_shortlisted,
           ROUND(AVG(match_score), 2) AS avg_match_score
         FROM product_evaluations
         WHERE product_id = $1`,
        [productId]
      ),
      pool.query(
        `SELECT rejection_reason, COUNT(*) AS count
         FROM product_evaluations
         WHERE product_id = $1 AND disposition = 'rejected' AND rejection_reason IS NOT NULL
         GROUP BY rejection_reason
         ORDER BY count DESC
         LIMIT 5`,
        [productId]
      ),
      pool.query(
        `SELECT c.winner_product_id AS product,
                COUNT(*) AS wins,
                MODE() WITHIN GROUP (ORDER BY c.deciding_factor) AS why
         FROM comparisons c
         WHERE $1 = ANY(SELECT jsonb_array_elements_text(c.products_compared))
           AND c.winner_product_id != $1
         GROUP BY c.winner_product_id
         ORDER BY wins DESC
         LIMIT 5`,
        [productId]
      ),
      pool.query(
        `SELECT ROUND(AVG(price_at_time), 2) AS avg_price,
                MIN(price_at_time) AS min_price,
                MAX(price_at_time) AS max_price
         FROM product_evaluations
         WHERE product_id = $1 AND price_at_time IS NOT NULL`,
        [productId]
      ),
      pool.query(
        `SELECT o.outcome_type, COUNT(*) AS count
         FROM outcomes o
         WHERE o.product_chosen_id = $1
         GROUP BY o.outcome_type
         ORDER BY count DESC`,
        [productId]
      ),
    ]);

  const row = stats.rows[0];
  const considered = Number(row.times_considered);
  const selected = Number(row.times_selected);

  return {
    product_id: productId,
    selection_rate: considered > 0 ? Math.round((selected / considered) * 100) / 100 : null,
    times_considered: considered,
    times_selected: selected,
    times_rejected: Number(row.times_rejected),
    times_shortlisted: Number(row.times_shortlisted),
    avg_match_score: row.avg_match_score ? Number(row.avg_match_score) : null,
    top_rejection_reasons: rejections.rows.map((r) => r.rejection_reason),
    beats_these: competitors.rows.length > 0
      ? competitors.rows.map((r) => `${r.product} (${r.wins}x, reason: ${r.why})`)
      : [],
    price_range: avgPrice.rows[0]?.avg_price
      ? {
          avg: Number(avgPrice.rows[0].avg_price),
          min: Number(avgPrice.rows[0].min_price),
          max: Number(avgPrice.rows[0].max_price),
        }
      : null,
    outcomes_when_chosen: recentOutcomes.rows.map((r) => ({
      type: r.outcome_type,
      count: Number(r.count),
    })),
  };
}

export async function getCategoryRecommendations(category: string, budgetMax?: number) {
  const budgetFilter = budgetMax
    ? `AND e.price_at_time <= ${Number(budgetMax)}`
    : "";

  const [topPicks, decisionFactors, commonConstraints, avgStats] =
    await Promise.all([
      pool.query(
        `SELECT e.product_id,
                COUNT(*) FILTER (WHERE e.disposition = 'selected') AS selections,
                COUNT(*) AS considerations,
                ROUND(AVG(e.match_score), 2) AS avg_score,
                ROUND(AVG(e.price_at_time), 2) AS avg_price
         FROM product_evaluations e
         JOIN shopping_sessions s ON s.session_id = e.session_id
         WHERE s.category = $1 ${budgetFilter}
         GROUP BY e.product_id
         HAVING COUNT(*) FILTER (WHERE e.disposition = 'selected') > 0
         ORDER BY selections DESC, avg_score DESC
         LIMIT 10`,
        [category]
      ),
      pool.query(
        `SELECT c.deciding_factor, COUNT(*) AS count
         FROM comparisons c
         JOIN shopping_sessions s ON s.session_id = c.session_id
         WHERE s.category = $1
         GROUP BY c.deciding_factor
         ORDER BY count DESC
         LIMIT 5`,
        [category]
      ),
      pool.query(
        `SELECT value, COUNT(*) AS count
         FROM shopping_sessions,
              jsonb_array_elements_text(constraints) AS value
         WHERE category = $1
         GROUP BY value
         ORDER BY count DESC
         LIMIT 5`,
        [category]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT s.session_id) AS total_sessions,
                ROUND(AVG(s.budget_max), 2) AS avg_budget
         FROM shopping_sessions s
         WHERE s.category = $1`,
        [category]
      ),
    ]);

  return {
    category,
    total_sessions: Number(avgStats.rows[0]?.total_sessions ?? 0),
    avg_budget: avgStats.rows[0]?.avg_budget ? Number(avgStats.rows[0].avg_budget) : null,
    top_picks: topPicks.rows.map((r) => ({
      product_id: r.product_id,
      times_selected: Number(r.selections),
      times_considered: Number(r.considerations),
      avg_match_score: r.avg_score ? Number(r.avg_score) : null,
      avg_price: r.avg_price ? Number(r.avg_price) : null,
    })),
    what_matters_most: decisionFactors.rows.map((r) => r.deciding_factor),
    common_requirements: commonConstraints.rows.map((r) => r.value),
  };
}

export async function getMerchantReliability(merchantId: string) {
  const [evalStats, stockAccuracy, outcomeStats, priceStats] =
    await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) AS total_evaluations,
           COUNT(*) FILTER (WHERE disposition = 'selected') AS times_selected,
           COUNT(*) FILTER (WHERE disposition = 'rejected') AS times_rejected,
           ROUND(AVG(match_score), 2) AS avg_match_score
         FROM product_evaluations
         WHERE merchant_id = $1`,
        [merchantId]
      ),
      pool.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE in_stock = true) AS in_stock_count,
           COUNT(*) FILTER (WHERE in_stock = false) AS out_of_stock_count
         FROM product_evaluations
         WHERE merchant_id = $1`,
        [merchantId]
      ),
      pool.query(
        `SELECT o.outcome_type, COUNT(*) AS count
         FROM outcomes o
         JOIN product_evaluations e ON e.session_id = o.session_id
           AND e.product_id = o.product_chosen_id
         WHERE e.merchant_id = $1
         GROUP BY o.outcome_type
         ORDER BY count DESC`,
        [merchantId]
      ),
      pool.query(
        `SELECT e.product_id,
                ROUND(AVG(e.price_at_time), 2) AS avg_price,
                COUNT(*) AS listings
         FROM product_evaluations e
         WHERE e.merchant_id = $1 AND e.price_at_time IS NOT NULL
         GROUP BY e.product_id
         ORDER BY listings DESC
         LIMIT 10`,
        [merchantId]
      ),
    ]);

  const row = evalStats.rows[0];
  const total = Number(row.total_evaluations);
  const selected = Number(row.times_selected);
  const stockTotal = Number(stockAccuracy.rows[0]?.total ?? 0);
  const inStock = Number(stockAccuracy.rows[0]?.in_stock_count ?? 0);

  return {
    merchant_id: merchantId,
    total_evaluations: total,
    selection_rate: total > 0 ? Math.round((selected / total) * 100) / 100 : null,
    avg_match_score: row.avg_match_score ? Number(row.avg_match_score) : null,
    stock_reliability: stockTotal > 0 ? Math.round((inStock / stockTotal) * 100) / 100 : null,
    outcomes_from_this_merchant: outcomeStats.rows.map((r) => ({
      type: r.outcome_type,
      count: Number(r.count),
    })),
    top_products: priceStats.rows.map((r) => ({
      product_id: r.product_id,
      avg_price: Number(r.avg_price),
      times_listed: Number(r.listings),
    })),
  };
}

// ── Differentiator Queries ──

/**
 * Cross-agent learning: find sessions with similar category/constraints and
 * return what those agents ended up selecting.
 */
export async function getSimilarSessionOutcomes(
  category: string,
  constraints: string[],
  budgetMax?: number
) {
  // Find sessions in the same category that share at least one constraint
  const constraintFilter = constraints.length > 0
    ? `AND s.constraints ?| $2::text[]`
    : "";
  const budgetFilter = budgetMax
    ? `AND (s.budget_max IS NULL OR s.budget_max <= ${Number(budgetMax)} * 1.2)`
    : "";

  const params: (string | string[])[] = [category];
  if (constraints.length > 0) params.push(constraints);

  const [matchingSessions, topSelections, commonPatterns] = await Promise.all([
    // Count how many similar sessions exist
    pool.query(
      `SELECT COUNT(DISTINCT s.session_id) AS total,
              COUNT(DISTINCT o.session_id) FILTER (WHERE o.outcome_type = 'purchased') AS purchased,
              COUNT(DISTINCT o.session_id) FILTER (WHERE o.outcome_type = 'recommended') AS recommended,
              COUNT(DISTINCT o.session_id) FILTER (WHERE o.outcome_type = 'abandoned') AS abandoned
       FROM shopping_sessions s
       LEFT JOIN outcomes o ON o.session_id = s.session_id
       WHERE s.category = $1 ${constraintFilter} ${budgetFilter}`,
      params
    ),
    // What products did similar sessions select?
    pool.query(
      `SELECT e.product_id,
              COUNT(*) AS times_selected,
              ROUND(AVG(e.match_score), 2) AS avg_score,
              ROUND(AVG(e.price_at_time), 2) AS avg_price,
              MODE() WITHIN GROUP (ORDER BY e.merchant_id) AS common_merchant
       FROM product_evaluations e
       JOIN shopping_sessions s ON s.session_id = e.session_id
       WHERE s.category = $1 ${constraintFilter} ${budgetFilter}
         AND e.disposition = 'selected'
       GROUP BY e.product_id
       ORDER BY times_selected DESC
       LIMIT 5`,
      params
    ),
    // What deciding factors mattered in similar sessions?
    pool.query(
      `SELECT c.deciding_factor, COUNT(*) AS count
       FROM comparisons c
       JOIN shopping_sessions s ON s.session_id = c.session_id
       WHERE s.category = $1 ${constraintFilter} ${budgetFilter}
       GROUP BY c.deciding_factor
       ORDER BY count DESC
       LIMIT 5`,
      params
    ),
  ]);

  const stats = matchingSessions.rows[0];
  return {
    similar_sessions_found: Number(stats?.total ?? 0),
    outcome_distribution: {
      purchased: Number(stats?.purchased ?? 0),
      recommended: Number(stats?.recommended ?? 0),
      abandoned: Number(stats?.abandoned ?? 0),
    },
    what_agents_chose: topSelections.rows.map((r) => ({
      product_id: r.product_id,
      times_selected: Number(r.times_selected),
      avg_match_score: r.avg_score ? Number(r.avg_score) : null,
      avg_price: r.avg_price ? Number(r.avg_price) : null,
      common_merchant: r.common_merchant,
    })),
    deciding_factors: commonPatterns.rows.map((r) => r.deciding_factor),
  };
}

/**
 * Deal detection: compare a given price against historical price data.
 */
export async function detectDeal(productId: string, currentPrice: number) {
  const [priceHistory, merchantPrices] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) AS total_sightings,
         ROUND(AVG(price_at_time), 2) AS avg_price,
         MIN(price_at_time) AS lowest_seen,
         MAX(price_at_time) AS highest_seen,
         PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price_at_time) AS p25,
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_at_time) AS median,
         PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price_at_time) AS p75
       FROM product_evaluations
       WHERE product_id = $1 AND price_at_time IS NOT NULL`,
      [productId]
    ),
    pool.query(
      `SELECT merchant_id,
              ROUND(AVG(price_at_time), 2) AS avg_price,
              MIN(price_at_time) AS best_price,
              COUNT(*) AS sightings
       FROM product_evaluations
       WHERE product_id = $1 AND price_at_time IS NOT NULL
       GROUP BY merchant_id
       ORDER BY avg_price ASC
       LIMIT 5`,
      [productId]
    ),
  ]);

  const h = priceHistory.rows[0];
  if (!h || Number(h.total_sightings) === 0) {
    return {
      product_id: productId,
      current_price: currentPrice,
      verdict: "unknown",
      message: "No price history available for this product.",
    };
  }

  const avg = Number(h.avg_price);
  const lowest = Number(h.lowest_seen);
  const median = Number(h.median);
  const savings = Math.round((avg - currentPrice) * 100) / 100;
  const pctBelow = Math.round(((avg - currentPrice) / avg) * 100);

  let verdict: string;
  if (currentPrice <= lowest) verdict = "best_price_ever";
  else if (currentPrice <= Number(h.p25)) verdict = "great_deal";
  else if (currentPrice <= median) verdict = "good_deal";
  else if (currentPrice <= Number(h.p75)) verdict = "fair_price";
  else verdict = "above_average";

  return {
    product_id: productId,
    current_price: currentPrice,
    verdict,
    savings_vs_avg: savings,
    pct_below_avg: pctBelow,
    price_history: {
      avg: avg,
      median: median,
      lowest_seen: lowest,
      highest_seen: Number(h.highest_seen),
      total_sightings: Number(h.total_sightings),
    },
    cheapest_merchants: merchantPrices.rows.map((r) => ({
      merchant_id: r.merchant_id,
      avg_price: Number(r.avg_price),
      best_price: Number(r.best_price),
      sightings: Number(r.sightings),
    })),
  };
}

/**
 * Failure prevention: surface recent problems with a product or merchant
 * (stock issues, high rejection rates, abandonment signals).
 */
export async function getRecentWarnings(productId?: string, merchantId?: string) {
  const warnings: { type: string; severity: string; message: string; data?: Record<string, unknown> }[] = [];

  if (productId) {
    // Check recent rejection rate
    const recentEvals = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE disposition = 'rejected') AS rejected,
         COUNT(*) FILTER (WHERE in_stock = false) AS out_of_stock
       FROM product_evaluations
       WHERE product_id = $1
         AND created_at > NOW() - INTERVAL '7 days'`,
      [productId]
    );
    const r = recentEvals.rows[0];
    const total = Number(r.total);
    const rejected = Number(r.rejected);
    const oos = Number(r.out_of_stock);

    if (total > 0 && rejected / total > 0.6) {
      const reasons = await pool.query(
        `SELECT rejection_reason, COUNT(*) AS count
         FROM product_evaluations
         WHERE product_id = $1 AND disposition = 'rejected'
           AND rejection_reason IS NOT NULL
           AND created_at > NOW() - INTERVAL '7 days'
         GROUP BY rejection_reason ORDER BY count DESC LIMIT 3`,
        [productId]
      );
      warnings.push({
        type: "high_rejection_rate",
        severity: "warning",
        message: `${Math.round((rejected / total) * 100)}% rejection rate in the last 7 days (${rejected}/${total} evaluations)`,
        data: { reasons: reasons.rows.map((row) => row.rejection_reason) },
      });
    }

    if (oos > 0) {
      warnings.push({
        type: "stock_issues",
        severity: oos / total > 0.3 ? "critical" : "info",
        message: `${oos} out of ${total} recent evaluations found this product out of stock`,
      });
    }

    // Check abandonment rate when this product was chosen
    const abandonments = await pool.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE o.outcome_type = 'abandoned') AS abandoned
       FROM outcomes o
       JOIN product_evaluations e ON e.session_id = o.session_id
       WHERE e.product_id = $1 AND e.disposition = 'selected'`,
      [productId]
    );
    const ab = abandonments.rows[0];
    const abTotal = Number(ab.total);
    const abCount = Number(ab.abandoned);
    if (abTotal > 2 && abCount / abTotal > 0.3) {
      warnings.push({
        type: "high_abandonment",
        severity: "warning",
        message: `${Math.round((abCount / abTotal) * 100)}% of sessions selecting this product ended in abandonment`,
      });
    }
  }

  if (merchantId) {
    // Check merchant stock reliability
    const stockCheck = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE in_stock = false) AS oos
       FROM product_evaluations
       WHERE merchant_id = $1
         AND created_at > NOW() - INTERVAL '7 days'`,
      [merchantId]
    );
    const s = stockCheck.rows[0];
    const sTotal = Number(s.total);
    const sOos = Number(s.oos);
    if (sTotal > 0 && sOos / sTotal > 0.2) {
      warnings.push({
        type: "merchant_stock_unreliable",
        severity: "warning",
        message: `${Math.round((sOos / sTotal) * 100)}% out-of-stock rate at ${merchantId} in the last 7 days`,
      });
    }

    // Check merchant rejection rate
    const merchantRejects = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE disposition = 'rejected') AS rejected
       FROM product_evaluations
       WHERE merchant_id = $1
         AND created_at > NOW() - INTERVAL '7 days'`,
      [merchantId]
    );
    const mr = merchantRejects.rows[0];
    const mrTotal = Number(mr.total);
    const mrRejected = Number(mr.rejected);
    if (mrTotal > 3 && mrRejected / mrTotal > 0.5) {
      warnings.push({
        type: "merchant_high_rejection",
        severity: "warning",
        message: `${Math.round((mrRejected / mrTotal) * 100)}% of products from ${merchantId} were rejected recently`,
      });
    }
  }

  return {
    product_id: productId ?? null,
    merchant_id: merchantId ?? null,
    warnings,
    all_clear: warnings.length === 0,
  };
}

/**
 * Decision shortcuts: match on exact constraints and return what worked
 * for agents with the same requirements.
 */
export async function getConstraintMatch(
  category: string,
  constraints: string[],
  budgetMax?: number
) {
  if (constraints.length === 0) {
    return { message: "Provide at least one constraint for matching." };
  }

  // Find sessions that contain ALL of the given constraints
  const budgetFilter = budgetMax
    ? `AND (s.budget_max IS NULL OR s.budget_max >= ${Number(budgetMax) * 0.8})`
    : "";

  const [exactMatches, partialMatches] = await Promise.all([
    // Sessions matching ALL constraints
    pool.query(
      `SELECT s.session_id, s.raw_query, s.budget_max, s.constraints,
              o.outcome_type, o.product_chosen_id, o.reason,
              e.product_id, e.price_at_time, e.match_score, e.merchant_id
       FROM shopping_sessions s
       JOIN outcomes o ON o.session_id = s.session_id
       LEFT JOIN product_evaluations e ON e.session_id = s.session_id AND e.disposition = 'selected'
       WHERE s.category = $1
         AND s.constraints @> $2::jsonb
         ${budgetFilter}
       ORDER BY s.created_at DESC
       LIMIT 20`,
      [category, JSON.stringify(constraints)]
    ),
    // Sessions matching ANY constraint (broader pool for aggregation)
    pool.query(
      `SELECT e.product_id,
              COUNT(*) FILTER (WHERE e.disposition = 'selected') AS selections,
              COUNT(*) AS considerations,
              ROUND(AVG(e.match_score), 2) AS avg_score,
              ROUND(AVG(e.price_at_time), 2) AS avg_price,
              array_agg(DISTINCT e.merchant_id) FILTER (WHERE e.disposition = 'selected') AS merchants
       FROM product_evaluations e
       JOIN shopping_sessions s ON s.session_id = e.session_id
       WHERE s.category = $1
         AND s.constraints ?| $2::text[]
         ${budgetFilter}
       GROUP BY e.product_id
       HAVING COUNT(*) FILTER (WHERE e.disposition = 'selected') > 0
       ORDER BY selections DESC
       LIMIT 5`,
      [category, constraints]
    ),
  ]);

  // Deduplicate and summarize exact matches
  const exactResults = new Map<string, {
    product_id: string;
    times_chosen: number;
    outcomes: string[];
    avg_price: number | null;
    avg_score: number | null;
    reasons: string[];
    merchants: Set<string>;
  }>();

  for (const row of exactMatches.rows) {
    if (!row.product_chosen_id) continue;
    const existing = exactResults.get(row.product_chosen_id);
    if (existing) {
      existing.times_chosen++;
      if (row.outcome_type && !existing.outcomes.includes(row.outcome_type))
        existing.outcomes.push(row.outcome_type);
      if (row.reason && !existing.reasons.includes(row.reason))
        existing.reasons.push(row.reason);
      if (row.merchant_id) existing.merchants.add(row.merchant_id);
    } else {
      exactResults.set(row.product_chosen_id, {
        product_id: row.product_chosen_id,
        times_chosen: 1,
        outcomes: row.outcome_type ? [row.outcome_type] : [],
        avg_price: row.price_at_time ? Number(row.price_at_time) : null,
        avg_score: row.match_score ? Number(row.match_score) : null,
        reasons: row.reason ? [row.reason] : [],
        merchants: new Set(row.merchant_id ? [row.merchant_id] : []),
      });
    }
  }

  const shortcut = Array.from(exactResults.values())
    .sort((a, b) => b.times_chosen - a.times_chosen)
    .slice(0, 3)
    .map((r) => ({
      product_id: r.product_id,
      times_chosen: r.times_chosen,
      outcomes: r.outcomes,
      avg_price: r.avg_price,
      avg_match_score: r.avg_score,
      reasons: r.reasons.slice(0, 3),
      available_at: Array.from(r.merchants),
    }));

  return {
    category,
    constraints_matched: constraints,
    budget_max: budgetMax ?? null,
    exact_constraint_matches: shortcut.length,
    recommended_products: shortcut,
    broader_recommendations: partialMatches.rows.map((r) => ({
      product_id: r.product_id,
      times_selected: Number(r.selections),
      times_considered: Number(r.considerations),
      avg_match_score: r.avg_score ? Number(r.avg_score) : null,
      avg_price: r.avg_price ? Number(r.avg_price) : null,
      available_at: r.merchants?.filter(Boolean) ?? [],
    })),
  };
}

// ── Network stats (fallback for empty results) ──

export async function getNetworkStats() {
  const [categories, totals] = await Promise.all([
    pool.query(
      `SELECT category, COUNT(*) AS sessions
       FROM shopping_sessions
       WHERE category IS NOT NULL
       GROUP BY category
       ORDER BY sessions DESC`
    ),
    pool.query(
      `SELECT
         COUNT(DISTINCT s.session_id) AS total_sessions,
         COUNT(DISTINCT e.product_id) AS total_products,
         COUNT(DISTINCT e.merchant_id) FILTER (WHERE e.merchant_id IS NOT NULL) AS total_merchants
       FROM shopping_sessions s
       LEFT JOIN product_evaluations e ON e.session_id = s.session_id`
    ),
  ]);

  return {
    total_sessions: Number(totals.rows[0]?.total_sessions ?? 0),
    total_products: Number(totals.rows[0]?.total_products ?? 0),
    total_merchants: Number(totals.rows[0]?.total_merchants ?? 0),
    categories: categories.rows.map((r) => ({
      category: r.category,
      sessions: Number(r.sessions),
    })),
  };
}
