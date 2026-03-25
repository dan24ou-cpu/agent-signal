/**
 * Auto-seed script: reads top category misses and generates seed data for them.
 * Run manually or on a schedule: npx tsx scripts/auto-seed-misses.ts
 */

import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import { resolve } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, "../.env") });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_uT5d2iXUWNDh@ep-super-mouse-am4gd9re-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({ connectionString: DATABASE_URL });

// Generic product templates by broad category prefix
const PRODUCT_TEMPLATES: Record<string, {
  products: { id: string; price: [number, number]; merchants: string[] }[];
  constraints: string[];
  deciding_factors: string[];
}> = {
  "electronics": {
    products: [
      { id: "top-rated-option-1", price: [29, 199], merchants: ["amazon", "bestbuy", "walmart"] },
      { id: "top-rated-option-2", price: [39, 249], merchants: ["amazon", "bestbuy", "target"] },
      { id: "budget-pick-1", price: [15, 79], merchants: ["amazon", "walmart"] },
      { id: "budget-pick-2", price: [19, 89], merchants: ["amazon", "target", "walmart"] },
      { id: "premium-pick-1", price: [99, 499], merchants: ["bestbuy", "amazon", "bhphoto"] },
      { id: "premium-pick-2", price: [149, 599], merchants: ["bestbuy", "amazon"] },
    ],
    constraints: ["wireless", "bluetooth", "usb-c", "compact", "portable", "long battery", "fast charging"],
    deciding_factors: ["price", "reviews", "brand reputation", "features", "build quality", "warranty"],
  },
  "clothing": {
    products: [
      { id: "popular-style-1", price: [25, 89], merchants: ["amazon", "nordstrom", "zara"] },
      { id: "popular-style-2", price: [30, 99], merchants: ["amazon", "hm", "uniqlo"] },
      { id: "budget-style-1", price: [15, 45], merchants: ["amazon", "walmart", "target"] },
      { id: "premium-style-1", price: [80, 250], merchants: ["nordstrom", "ssense", "farfetch"] },
      { id: "athletic-style-1", price: [35, 120], merchants: ["nike", "adidas", "amazon"] },
    ],
    constraints: ["breathable", "durable", "machine washable", "comfortable", "lightweight", "waterproof"],
    deciding_factors: ["fit", "material quality", "price", "style", "durability", "comfort"],
  },
  "home": {
    products: [
      { id: "home-essential-1", price: [20, 150], merchants: ["amazon", "wayfair", "ikea"] },
      { id: "home-essential-2", price: [30, 200], merchants: ["amazon", "target", "wayfair"] },
      { id: "home-budget-1", price: [10, 60], merchants: ["amazon", "walmart", "ikea"] },
      { id: "home-premium-1", price: [100, 500], merchants: ["wayfair", "potterybarn", "crateandbarrel"] },
      { id: "home-popular-1", price: [40, 180], merchants: ["amazon", "target", "wayfair"] },
    ],
    constraints: ["space-saving", "easy assembly", "modern design", "durable", "eco-friendly"],
    deciding_factors: ["price", "quality", "design", "size", "reviews", "shipping speed"],
  },
  "beauty": {
    products: [
      { id: "beauty-bestseller-1", price: [10, 45], merchants: ["sephora", "ulta", "amazon"] },
      { id: "beauty-bestseller-2", price: [15, 55], merchants: ["sephora", "ulta", "target"] },
      { id: "beauty-budget-1", price: [5, 20], merchants: ["amazon", "target", "walmart"] },
      { id: "beauty-premium-1", price: [40, 120], merchants: ["sephora", "nordstrom", "bluemercury"] },
    ],
    constraints: ["cruelty-free", "vegan", "fragrance-free", "sensitive skin", "long-lasting"],
    deciding_factors: ["ingredients", "reviews", "price", "brand trust", "skin type match"],
  },
  "sports": {
    products: [
      { id: "sports-gear-1", price: [20, 100], merchants: ["amazon", "dickssportinggoods", "rei"] },
      { id: "sports-gear-2", price: [30, 150], merchants: ["amazon", "nike", "underarmour"] },
      { id: "sports-budget-1", price: [10, 50], merchants: ["amazon", "walmart", "target"] },
      { id: "sports-premium-1", price: [80, 300], merchants: ["rei", "backcountry", "amazon"] },
    ],
    constraints: ["lightweight", "moisture-wicking", "durable", "ergonomic", "adjustable"],
    deciding_factors: ["performance", "comfort", "durability", "price", "brand", "weight"],
  },
  "food": {
    products: [
      { id: "food-popular-1", price: [5, 30], merchants: ["amazon", "wholefoods", "instacart"] },
      { id: "food-popular-2", price: [8, 40], merchants: ["amazon", "thrivmarket", "instacart"] },
      { id: "food-budget-1", price: [3, 15], merchants: ["amazon", "walmart", "costco"] },
      { id: "food-premium-1", price: [20, 80], merchants: ["wholefoods", "thrivmarket", "amazon"] },
    ],
    constraints: ["organic", "gluten-free", "non-gmo", "low sugar", "high protein", "vegan"],
    deciding_factors: ["ingredients", "nutrition", "taste reviews", "price per serving", "freshness"],
  },
  // Fallback for anything else
  "default": {
    products: [
      { id: "recommended-1", price: [20, 150], merchants: ["amazon", "walmart", "target"] },
      { id: "recommended-2", price: [30, 200], merchants: ["amazon", "bestbuy", "target"] },
      { id: "budget-option-1", price: [10, 60], merchants: ["amazon", "walmart"] },
      { id: "premium-option-1", price: [80, 400], merchants: ["amazon", "specialty-store"] },
    ],
    constraints: ["high quality", "good value", "well reviewed", "durable", "popular"],
    deciding_factors: ["price", "quality", "reviews", "brand", "value for money", "availability"],
  },
};

function getTemplate(category: string) {
  const prefix = category.split("/")[0].toLowerCase();
  return PRODUCT_TEMPLATES[prefix] || PRODUCT_TEMPLATES["default"];
}

function randBetween(min: number, max: number) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function pick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const PLATFORMS = ["claude", "chatgpt", "gemini", "custom-agent", "copilot", "perplexity", "cursor-agent"];
const OUTCOMES: ("purchased" | "recommended" | "abandoned" | "deferred")[] = ["purchased", "recommended", "abandoned", "deferred"];
const OUTCOME_WEIGHTS = [0.35, 0.30, 0.20, 0.15];
const REJECTION_REASONS = [
  "too expensive", "poor reviews", "missing features", "out of stock",
  "wrong size/fit", "better alternative found", "slow shipping", "unknown brand",
];

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

async function seedCategory(category: string, sessionCount: number) {
  const template = getTemplate(category);
  // Prefix product IDs with category for uniqueness
  const catPrefix = category.replace(/\//g, "-");

  console.log(`Seeding ${category} with ${sessionCount} sessions...`);

  for (let i = 0; i < sessionCount; i++) {
    const sessionId = uuidv4();
    const platform = pick(PLATFORMS, 1)[0];
    const budget = randBetween(30, 500);
    const sessionConstraints = pick(template.constraints, Math.floor(Math.random() * 3) + 1);

    // Insert session
    await pool.query(
      `INSERT INTO shopping_sessions (session_id, agent_platform, raw_query, category, budget_max, constraints)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, platform, `Find ${category} products`, category, budget, JSON.stringify(sessionConstraints)]
    );

    // Evaluate 2-4 products
    const evalCount = Math.floor(Math.random() * 3) + 2;
    const products = pick(template.products, evalCount);
    let selectedProduct: string | null = null;

    for (let j = 0; j < products.length; j++) {
      const p = products[j];
      const productId = `${catPrefix}-${p.id}`;
      const merchant = pick(p.merchants, 1)[0];
      const price = randBetween(p.price[0], p.price[1]);
      const matchScore = randBetween(0.4, 0.95);

      // First product often selected, others mixed
      let disposition: "selected" | "rejected" | "shortlisted";
      let rejectionReason: string | null = null;

      if (j === 0 && Math.random() > 0.3) {
        disposition = "selected";
        selectedProduct = productId;
      } else if (Math.random() > 0.5) {
        disposition = "rejected";
        rejectionReason = pick(REJECTION_REASONS, 1)[0];
      } else {
        disposition = "shortlisted";
      }

      await pool.query(
        `INSERT INTO product_evaluations (session_id, product_id, merchant_id, price_at_time, match_score, match_reasons, disposition, rejection_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [sessionId, productId, merchant, price, matchScore, JSON.stringify(pick(template.constraints, 2)), disposition, rejectionReason]
      );
    }

    // Log a comparison if we have 2+ products
    if (products.length >= 2) {
      const compared = products.slice(0, 2).map((p) => `${catPrefix}-${p.id}`);
      const winner = selectedProduct || compared[0];
      const factor = pick(template.deciding_factors, 1)[0];

      await pool.query(
        `INSERT INTO comparisons (session_id, products_compared, winner_product_id, deciding_factor, dimensions_compared)
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, JSON.stringify(compared), winner, factor, JSON.stringify(pick(template.deciding_factors, 3))]
      );
    }

    // Log outcome
    const outcomeType = weightedPick(OUTCOMES, OUTCOME_WEIGHTS);
    await pool.query(
      `INSERT INTO outcomes (session_id, outcome_type, product_chosen_id)
       VALUES ($1, $2, $3)`,
      [sessionId, outcomeType, outcomeType === "purchased" || outcomeType === "recommended" ? selectedProduct : null]
    );
  }

  console.log(`  ✓ ${category}: ${sessionCount} sessions seeded`);
}

async function main() {
  // Get top missed categories
  const misses = await pool.query(
    `SELECT category, COUNT(*) AS miss_count
     FROM category_misses
     WHERE created_at > NOW() - INTERVAL '30 days'
     GROUP BY category
     ORDER BY miss_count DESC
     LIMIT 20`
  );

  if (misses.rows.length === 0) {
    console.log("No category misses to seed. Exiting.");
    await pool.end();
    return;
  }

  console.log(`Found ${misses.rows.length} missed categories:\n`);

  for (const row of misses.rows) {
    const category = row.category;
    const missCount = Number(row.miss_count);

    // Check if this category already has data now
    const existing = await pool.query(
      `SELECT COUNT(*) AS n FROM shopping_sessions WHERE category = $1 OR category LIKE $1 || '/%'`,
      [category]
    );

    if (Number(existing.rows[0].n) > 0) {
      console.log(`  ⏭ ${category} (${missCount} misses) — already has ${existing.rows[0].n} sessions, skipping`);
      continue;
    }

    // Seed based on demand: more misses = more sessions
    const sessionCount = Math.min(Math.max(missCount * 20, 50), 150);
    await seedCategory(category, sessionCount);
  }

  // Clear processed misses
  await pool.query(`DELETE FROM category_misses WHERE created_at > NOW() - INTERVAL '30 days'`);
  console.log("\n✓ Cleared processed misses");

  await pool.end();
  console.log("Done!");
}

main().catch((e) => {
  console.error(e);
  pool.end();
  process.exit(1);
});
