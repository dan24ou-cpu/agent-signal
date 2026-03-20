import { v4 as uuidv4 } from "uuid";
import pool from "../src/db/client.js";
import {
  insertSession,
  insertEvaluation,
  insertComparison,
  insertOutcome,
} from "../src/db/queries.js";
import type {
  LogSessionInput,
  LogEvaluationInput,
  LogComparisonInput,
  LogOutcomeInput,
} from "../src/types/index.js";

// ── Sample Data ──

const CATEGORIES = [
  "footwear/running",
  "electronics/headphones",
  "electronics/laptops",
  "home/furniture/desks",
  "kitchen/appliances",
];

const PRODUCTS: Record<string, Array<{ id: string; merchant: string; price: number }>> = {
  "footwear/running": [
    { id: "hoka-clifton-9", merchant: "rei", price: 145 },
    { id: "brooks-ghost-15", merchant: "zappos", price: 140 },
    { id: "nike-pegasus-41", merchant: "nike", price: 130 },
    { id: "asics-gel-nimbus-26", merchant: "amazon", price: 160 },
    { id: "new-balance-1080v13", merchant: "newbalance", price: 165 },
    { id: "saucony-ride-17", merchant: "runningwarehouse", price: 140 },
  ],
  "electronics/headphones": [
    { id: "sony-wh1000xm5", merchant: "bestbuy", price: 348 },
    { id: "bose-qc-ultra", merchant: "bose", price: 429 },
    { id: "apple-airpods-max", merchant: "apple", price: 549 },
    { id: "sennheiser-momentum-4", merchant: "amazon", price: 300 },
    { id: "jabra-elite-85h", merchant: "amazon", price: 249 },
  ],
  "electronics/laptops": [
    { id: "macbook-air-m3", merchant: "apple", price: 1099 },
    { id: "thinkpad-x1-carbon", merchant: "lenovo", price: 1299 },
    { id: "dell-xps-15", merchant: "dell", price: 1199 },
    { id: "framework-16", merchant: "framework", price: 1399 },
    { id: "hp-spectre-x360", merchant: "hp", price: 1149 },
  ],
  "home/furniture/desks": [
    { id: "uplift-v2", merchant: "uplift", price: 599 },
    { id: "jarvis-standing", merchant: "fully", price: 559 },
    { id: "ikea-bekant", merchant: "ikea", price: 349 },
    { id: "autonomous-smartdesk", merchant: "autonomous", price: 449 },
  ],
  "kitchen/appliances": [
    { id: "vitamix-a3500", merchant: "vitamix", price: 549 },
    { id: "ninja-professional", merchant: "amazon", price: 89 },
    { id: "kitchenaid-k400", merchant: "target", price: 199 },
    { id: "blendtec-total", merchant: "blendtec", price: 399 },
  ],
};

const REJECTION_REASONS = [
  "price too high",
  "poor reviews on durability",
  "out of stock in preferred variant",
  "shipping too slow",
  "brand excluded by user",
  "insufficient features",
  "poor review sentiment",
  "better alternative available",
  "weight too heavy",
  "not available in preferred color",
];

const DECIDING_FACTORS = [
  "price",
  "reviews",
  "brand reputation",
  "features",
  "availability",
  "durability",
  "weight",
  "battery life",
  "comfort",
  "warranty",
];

const CONSTRAINTS_BY_CATEGORY: Record<string, string[]> = {
  "footwear/running": ["wide fit", "cushioned", "neutral", "lightweight", "trail capable"],
  "electronics/headphones": ["noise cancelling", "wireless", "over-ear", "long battery", "comfortable"],
  "electronics/laptops": ["lightweight", "long battery", "high resolution display", "16GB RAM", "SSD"],
  "home/furniture/desks": ["standing", "adjustable height", "cable management", "large surface"],
  "kitchen/appliances": ["quiet", "dishwasher safe", "powerful motor", "compact"],
};

const AGENT_PLATFORMS = ["claude", "chatgpt", "gemini", "custom-agent", "shopify-sidekick"];

const SAMPLE_QUERIES: Record<string, string[]> = {
  "footwear/running": [
    "find me running shoes under $150 for wide feet",
    "best cushioned running shoes for long distance",
    "neutral running shoes, not Nike, under $160",
    "lightweight trail running shoes",
  ],
  "electronics/headphones": [
    "best noise cancelling headphones under $400",
    "wireless over-ear headphones with long battery life",
    "compare Sony and Bose noise cancelling headphones",
  ],
  "electronics/laptops": [
    "lightweight laptop under $1300 for coding",
    "best laptop for photo editing with great display",
    "compare MacBook Air M3 vs ThinkPad X1 Carbon",
  ],
  "home/furniture/desks": [
    "standing desk with good cable management under $600",
    "best adjustable desk for home office",
  ],
  "kitchen/appliances": [
    "quiet blender under $200 for smoothies",
    "best blender for the price, dishwasher safe parts",
  ],
};

// ── Helpers ──

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(n, arr.length));
}

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// ── Seed Logic ──

async function seed() {
  console.log("Seeding AgentSignal database...\n");

  let totalSessions = 0;
  let totalEvaluations = 0;
  let totalComparisons = 0;
  let totalOutcomes = 0;

  for (const category of CATEGORIES) {
    const products = PRODUCTS[category];
    const queries = SAMPLE_QUERIES[category];
    const categoryConstraints = CONSTRAINTS_BY_CATEGORY[category];
    const sessionsToCreate = 10 + Math.floor(Math.random() * 15);

    for (let i = 0; i < sessionsToCreate; i++) {
      const sessionId = uuidv4();
      const budgetMax = rand(50, 600);

      const sessionInput: LogSessionInput = {
        raw_query: pick(queries),
        category,
        budget_max: budgetMax,
        budget_currency: "USD",
        constraints: pickN(categoryConstraints, 1 + Math.floor(Math.random() * 3)),
        exclusions: Math.random() > 0.7 ? [pick(products).merchant] : [],
        urgency: pick(["immediate", "standard", "flexible"] as const),
        gift: Math.random() > 0.85,
        agent_platform: pick(AGENT_PLATFORMS),
      };

      await insertSession(sessionId, sessionInput);
      totalSessions++;

      // Evaluate 3-6 products
      const evaluatedProducts = pickN(products, 3 + Math.floor(Math.random() * 4));
      const selectedProduct = pick(evaluatedProducts);

      for (const product of evaluatedProducts) {
        const isSelected = product === selectedProduct;
        const isShortlisted = !isSelected && Math.random() > 0.5;

        const evalInput: LogEvaluationInput = {
          session_id: sessionId,
          product_id: product.id,
          merchant_id: product.merchant,
          price_at_time: product.price + rand(-20, 20),
          in_stock: Math.random() > 0.1,
          match_score: isSelected ? rand(0.8, 1) : rand(0.3, 0.85),
          match_reasons: isSelected
            ? pickN(categoryConstraints, 2)
            : pickN(categoryConstraints, 1),
          disposition: isSelected
            ? "selected"
            : isShortlisted
              ? "shortlisted"
              : "rejected",
          rejection_reason:
            !isSelected && !isShortlisted ? pick(REJECTION_REASONS) : undefined,
        };

        await insertEvaluation(evalInput);
        totalEvaluations++;
      }

      // Create 1-3 comparisons
      const numComparisons = 1 + Math.floor(Math.random() * 3);
      for (let c = 0; c < numComparisons && evaluatedProducts.length >= 2; c++) {
        const comparedPair = pickN(evaluatedProducts, 2);
        const compInput: LogComparisonInput = {
          session_id: sessionId,
          products_compared: comparedPair.map((p) => p.id),
          dimensions_compared: pickN(DECIDING_FACTORS, 2 + Math.floor(Math.random() * 3)),
          winner_product_id: pick(comparedPair).id,
          deciding_factor: pick(DECIDING_FACTORS),
        };

        await insertComparison(compInput);
        totalComparisons++;
      }

      // Log outcome
      const outcomeType = pick([
        "purchased",
        "purchased",
        "purchased",
        "recommended",
        "recommended",
        "abandoned",
        "deferred",
      ] as const);

      const outcomeInput: LogOutcomeInput = {
        session_id: sessionId,
        outcome_type: outcomeType,
        product_chosen_id:
          outcomeType === "purchased" || outcomeType === "recommended"
            ? selectedProduct.id
            : undefined,
        reason:
          outcomeType === "purchased"
            ? "best match for user requirements"
            : outcomeType === "abandoned"
              ? "user decided not to purchase"
              : outcomeType === "deferred"
                ? "waiting for better price"
                : "recommended for user review",
      };

      await insertOutcome(outcomeInput);
      totalOutcomes++;
    }

    console.log(`  ${category}: ${sessionsToCreate} sessions`);
  }

  console.log(`\nSeed complete:`);
  console.log(`  Sessions: ${totalSessions}`);
  console.log(`  Evaluations: ${totalEvaluations}`);
  console.log(`  Comparisons: ${totalComparisons}`);
  console.log(`  Outcomes: ${totalOutcomes}`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
