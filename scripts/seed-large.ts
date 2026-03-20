import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });

import pool from "../src/db/client.js";
import {
  insertSession,
  insertEvaluation,
  insertComparison,
  insertOutcome,
} from "../src/db/queries.js";

// ── Expanded Product Catalog ──

const CATALOG: Record<string, {
  products: Array<{ id: string; merchants: Array<{ id: string; price: number }>}>;
  constraints: string[];
  queries: string[];
  rejection_reasons: string[];
  deciding_factors: string[];
}> = {
  "footwear/running": {
    products: [
      { id: "hoka-clifton-9", merchants: [{ id: "rei", price: 145 }, { id: "amazon", price: 139 }, { id: "runningwarehouse", price: 145 }] },
      { id: "hoka-bondi-8", merchants: [{ id: "rei", price: 165 }, { id: "zappos", price: 165 }, { id: "amazon", price: 155 }] },
      { id: "brooks-ghost-15", merchants: [{ id: "zappos", price: 140 }, { id: "amazon", price: 135 }, { id: "brooksrunning", price: 140 }] },
      { id: "brooks-glycerin-20", merchants: [{ id: "zappos", price: 160 }, { id: "rei", price: 160 }] },
      { id: "nike-pegasus-41", merchants: [{ id: "nike", price: 130 }, { id: "dickssporting", price: 130 }, { id: "amazon", price: 119 }] },
      { id: "nike-vomero-17", merchants: [{ id: "nike", price: 160 }, { id: "footlocker", price: 160 }] },
      { id: "asics-gel-nimbus-26", merchants: [{ id: "amazon", price: 160 }, { id: "asics", price: 160 }, { id: "runningwarehouse", price: 155 }] },
      { id: "asics-gel-kayano-30", merchants: [{ id: "asics", price: 170 }, { id: "amazon", price: 162 }] },
      { id: "new-balance-1080v13", merchants: [{ id: "newbalance", price: 165 }, { id: "amazon", price: 152 }] },
      { id: "new-balance-fresh-foam-x", merchants: [{ id: "newbalance", price: 140 }, { id: "zappos", price: 140 }] },
      { id: "saucony-ride-17", merchants: [{ id: "runningwarehouse", price: 140 }, { id: "amazon", price: 130 }] },
      { id: "saucony-triumph-21", merchants: [{ id: "saucony", price: 160 }, { id: "rei", price: 160 }] },
      { id: "on-cloudmonster-2", merchants: [{ id: "on-running", price: 170 }, { id: "rei", price: 170 }] },
      { id: "on-cloudrunner-2", merchants: [{ id: "on-running", price: 150 }, { id: "zappos", price: 150 }] },
      { id: "adidas-ultraboost-24", merchants: [{ id: "adidas", price: 190 }, { id: "amazon", price: 165 }] },
    ],
    constraints: ["wide fit", "cushioned", "neutral", "lightweight", "trail capable", "stability", "high arch support", "breathable", "waterproof", "reflective"],
    queries: [
      "find me running shoes under $150 for wide feet",
      "best cushioned running shoes for long distance",
      "neutral running shoes, not Nike, under $160",
      "lightweight trail running shoes",
      "stability running shoes for overpronation",
      "best running shoes for marathon training",
      "comfortable running shoes for daily use under $140",
      "waterproof running shoes for rainy weather",
      "best value running shoes for beginners",
      "running shoes with good arch support",
      "lightweight racing shoes under $170",
      "best shoes for half marathon training on roads",
    ],
    rejection_reasons: ["too narrow for wide feet", "insufficient cushioning", "poor durability reviews", "no wide sizes available", "heel drop too high", "too heavy for racing", "outsole wears too fast", "arch support insufficient", "price too high for features", "limited color options"],
    deciding_factors: ["cushioning", "fit/width", "weight", "price", "durability", "brand trust", "heel-to-toe drop", "breathability", "reviews", "return policy"],
  },
  "electronics/headphones": {
    products: [
      { id: "sony-wh1000xm5", merchants: [{ id: "bestbuy", price: 348 }, { id: "amazon", price: 328 }, { id: "sony", price: 348 }] },
      { id: "sony-wh1000xm4", merchants: [{ id: "amazon", price: 248 }, { id: "bestbuy", price: 248 }] },
      { id: "bose-qc-ultra", merchants: [{ id: "bose", price: 429 }, { id: "bestbuy", price: 429 }, { id: "amazon", price: 399 }] },
      { id: "bose-qc45", merchants: [{ id: "bose", price: 279 }, { id: "amazon", price: 249 }] },
      { id: "apple-airpods-max", merchants: [{ id: "apple", price: 549 }, { id: "bestbuy", price: 549 }, { id: "amazon", price: 479 }] },
      { id: "apple-airpods-pro-2", merchants: [{ id: "apple", price: 249 }, { id: "amazon", price: 199 }] },
      { id: "sennheiser-momentum-4", merchants: [{ id: "amazon", price: 300 }, { id: "sennheiser", price: 350 }] },
      { id: "jabra-elite-85h", merchants: [{ id: "amazon", price: 249 }, { id: "bestbuy", price: 249 }] },
      { id: "audio-technica-ath-m50x", merchants: [{ id: "amazon", price: 149 }, { id: "bhphoto", price: 149 }] },
      { id: "beyerdynamic-dt-770-pro", merchants: [{ id: "amazon", price: 159 }, { id: "bhphoto", price: 159 }] },
    ],
    constraints: ["noise cancelling", "wireless", "over-ear", "long battery", "comfortable", "microphone quality", "multipoint", "low latency", "foldable", "lightweight"],
    queries: [
      "best noise cancelling headphones under $400",
      "wireless over-ear headphones with long battery life",
      "compare Sony and Bose noise cancelling headphones",
      "headphones for working from home with good mic",
      "best headphones for music production under $200",
      "lightweight noise cancelling headphones for travel",
      "headphones that connect to two devices simultaneously",
      "best headphones under $300 for commuting",
      "audiophile headphones with great soundstage",
      "comfortable headphones for all-day wear",
    ],
    rejection_reasons: ["ANC not strong enough", "too heavy for long wear", "battery life too short", "microphone quality poor", "no multipoint support", "sound quality disappointing", "ear cups too small", "connectivity issues reported", "price too high", "build quality concerns"],
    deciding_factors: ["ANC quality", "sound quality", "comfort", "battery life", "price", "microphone quality", "build quality", "weight", "brand reputation", "codec support"],
  },
  "electronics/laptops": {
    products: [
      { id: "macbook-air-m3", merchants: [{ id: "apple", price: 1099 }, { id: "bestbuy", price: 1099 }, { id: "amazon", price: 1049 }] },
      { id: "macbook-pro-14-m3", merchants: [{ id: "apple", price: 1599 }, { id: "bestbuy", price: 1599 }] },
      { id: "thinkpad-x1-carbon-gen11", merchants: [{ id: "lenovo", price: 1299 }, { id: "amazon", price: 1199 }] },
      { id: "dell-xps-15", merchants: [{ id: "dell", price: 1199 }, { id: "bestbuy", price: 1199 }] },
      { id: "dell-xps-13-plus", merchants: [{ id: "dell", price: 999 }, { id: "amazon", price: 949 }] },
      { id: "framework-16", merchants: [{ id: "framework", price: 1399 }] },
      { id: "framework-13", merchants: [{ id: "framework", price: 849 }] },
      { id: "hp-spectre-x360-14", merchants: [{ id: "hp", price: 1149 }, { id: "bestbuy", price: 1149 }] },
      { id: "asus-zenbook-14-oled", merchants: [{ id: "asus", price: 999 }, { id: "amazon", price: 899 }] },
      { id: "surface-laptop-5", merchants: [{ id: "microsoft", price: 999 }, { id: "bestbuy", price: 999 }] },
      { id: "lg-gram-17", merchants: [{ id: "amazon", price: 1299 }, { id: "bestbuy", price: 1299 }] },
    ],
    constraints: ["lightweight", "long battery", "high resolution display", "16GB+ RAM", "SSD 512GB+", "thunderbolt", "touchscreen", "2-in-1", "repairability", "Linux compatible"],
    queries: [
      "lightweight laptop under $1300 for coding",
      "best laptop for photo editing with great display",
      "compare MacBook Air M3 vs ThinkPad X1 Carbon",
      "best laptop for software development",
      "thin and light laptop with all-day battery",
      "best 2-in-1 laptop for students under $1200",
      "most repairable laptop available",
      "best laptop for data science with 32GB RAM",
      "Linux-friendly laptop under $1000",
      "ultralight laptop under 3 pounds for travel",
    ],
    rejection_reasons: ["too heavy for daily carry", "display not bright enough", "keyboard feel poor", "fan noise too loud", "port selection limited", "RAM not upgradeable", "battery life below expectations", "webcam quality bad", "trackpad too small", "thermal throttling issues"],
    deciding_factors: ["performance", "weight", "battery life", "display quality", "keyboard", "build quality", "port selection", "price", "repairability", "ecosystem"],
  },
  "home/furniture/desks": {
    products: [
      { id: "uplift-v2", merchants: [{ id: "uplift", price: 599 }, { id: "amazon", price: 649 }] },
      { id: "uplift-v2-commercial", merchants: [{ id: "uplift", price: 699 }] },
      { id: "jarvis-standing", merchants: [{ id: "fully", price: 559 }, { id: "amazon", price: 589 }] },
      { id: "jarvis-l-shaped", merchants: [{ id: "fully", price: 789 }] },
      { id: "ikea-bekant", merchants: [{ id: "ikea", price: 349 }] },
      { id: "ikea-idasen", merchants: [{ id: "ikea", price: 499 }] },
      { id: "autonomous-smartdesk-pro", merchants: [{ id: "autonomous", price: 529 }] },
      { id: "autonomous-smartdesk-core", merchants: [{ id: "autonomous", price: 369 }] },
      { id: "flexispot-e7", merchants: [{ id: "flexispot", price: 479 }, { id: "amazon", price: 459 }] },
      { id: "vari-electric", merchants: [{ id: "vari", price: 695 }] },
      { id: "secretlab-magnus-pro", merchants: [{ id: "secretlab", price: 749 }] },
    ],
    constraints: ["standing", "adjustable height", "cable management", "large surface", "quiet motor", "memory presets", "L-shaped", "bamboo top", "programmable", "anti-collision"],
    queries: [
      "standing desk with good cable management under $600",
      "best adjustable desk for home office",
      "L-shaped standing desk for dual monitors",
      "quiet standing desk that won't disturb calls",
      "best budget standing desk under $400",
      "standing desk with bamboo top",
      "compare Uplift V2 vs Jarvis standing desk",
      "best standing desk for tall people",
      "motorized desk with memory presets",
      "sturdy standing desk for heavy equipment",
    ],
    rejection_reasons: ["wobbles at standing height", "motor too loud", "desktop quality poor", "shipping damage reported frequently", "assembly too difficult", "height range too limited", "no cable management included", "customer service unresponsive", "price increase since reviews", "surface scratches easily"],
    deciding_factors: ["stability", "price", "height range", "motor noise", "desktop material", "warranty", "assembly ease", "cable management", "weight capacity", "brand reputation"],
  },
  "kitchen/appliances": {
    products: [
      { id: "vitamix-a3500", merchants: [{ id: "vitamix", price: 549 }, { id: "amazon", price: 499 }] },
      { id: "vitamix-e310", merchants: [{ id: "vitamix", price: 349 }, { id: "amazon", price: 289 }] },
      { id: "ninja-professional-plus", merchants: [{ id: "amazon", price: 99 }, { id: "target", price: 99 }] },
      { id: "ninja-detect-duo", merchants: [{ id: "amazon", price: 179 }, { id: "ninjakitchen", price: 199 }] },
      { id: "kitchenaid-k400", merchants: [{ id: "target", price: 199 }, { id: "amazon", price: 179 }] },
      { id: "blendtec-total-classic", merchants: [{ id: "blendtec", price: 399 }, { id: "amazon", price: 359 }] },
      { id: "breville-super-q", merchants: [{ id: "breville", price: 499 }, { id: "williams-sonoma", price: 499 }] },
      { id: "nutribullet-pro-plus", merchants: [{ id: "amazon", price: 89 }, { id: "target", price: 89 }] },
    ],
    constraints: ["quiet", "dishwasher safe", "powerful motor", "compact", "self-cleaning", "variable speed", "hot soup capable", "BPA free", "personal size", "commercial grade"],
    queries: [
      "quiet blender under $200 for smoothies",
      "best blender for the price, dishwasher safe parts",
      "commercial grade blender for home use",
      "compact blender for small kitchen under $100",
      "best blender for hot soup and smoothies",
      "compare Vitamix vs Blendtec",
      "blender that can crush ice easily",
      "best personal blender for protein shakes",
      "quiet blender for early morning smoothies",
      "most durable blender under $300",
    ],
    rejection_reasons: ["too loud for apartment", "jar cracks after months", "hard to clean", "motor overheats", "too large for counter", "lid leaks", "blade dulls quickly", "warranty too short", "BPA concerns", "too expensive for features"],
    deciding_factors: ["noise level", "blending power", "price", "size", "durability", "ease of cleaning", "warranty", "versatility", "brand reputation", "capacity"],
  },
  "electronics/phones": {
    products: [
      { id: "iphone-16-pro", merchants: [{ id: "apple", price: 999 }, { id: "bestbuy", price: 999 }, { id: "amazon", price: 969 }] },
      { id: "iphone-16", merchants: [{ id: "apple", price: 799 }, { id: "amazon", price: 779 }] },
      { id: "samsung-galaxy-s24-ultra", merchants: [{ id: "samsung", price: 1299 }, { id: "bestbuy", price: 1299 }, { id: "amazon", price: 1199 }] },
      { id: "samsung-galaxy-s24", merchants: [{ id: "samsung", price: 799 }, { id: "amazon", price: 749 }] },
      { id: "google-pixel-9-pro", merchants: [{ id: "google", price: 999 }, { id: "bestbuy", price: 999 }] },
      { id: "google-pixel-9", merchants: [{ id: "google", price: 799 }, { id: "amazon", price: 749 }] },
      { id: "oneplus-12", merchants: [{ id: "oneplus", price: 799 }, { id: "amazon", price: 729 }] },
    ],
    constraints: ["great camera", "long battery", "5G", "water resistant", "wireless charging", "large screen", "compact size", "expandable storage", "stylus support", "AI features"],
    queries: [
      "best phone for photography under $1000",
      "compare iPhone 16 Pro vs Samsung Galaxy S24 Ultra camera",
      "longest battery life smartphone",
      "best compact phone that fits in pocket",
      "phone with best AI features",
      "best value flagship phone under $800",
      "phone with best video recording capabilities",
      "most durable smartphone for outdoor use",
    ],
    rejection_reasons: ["camera quality not as good as competitors", "battery drains too fast", "too expensive", "too large for one-hand use", "software updates too slow", "no headphone jack", "bloatware", "heating issues", "screen brightness insufficient"],
    deciding_factors: ["camera quality", "battery life", "price", "ecosystem", "display quality", "performance", "software updates", "build quality", "AI features", "size"],
  },
  "electronics/tablets": {
    products: [
      { id: "ipad-air-m2", merchants: [{ id: "apple", price: 599 }, { id: "bestbuy", price: 599 }, { id: "amazon", price: 549 }] },
      { id: "ipad-pro-m4", merchants: [{ id: "apple", price: 999 }, { id: "bestbuy", price: 999 }] },
      { id: "ipad-10th-gen", merchants: [{ id: "apple", price: 349 }, { id: "amazon", price: 299 }] },
      { id: "samsung-galaxy-tab-s9", merchants: [{ id: "samsung", price: 799 }, { id: "amazon", price: 719 }] },
      { id: "amazon-fire-max-11", merchants: [{ id: "amazon", price: 229 }] },
    ],
    constraints: ["stylus support", "long battery", "lightweight", "keyboard compatible", "high refresh display", "cellular option", "large storage", "split screen"],
    queries: [
      "best tablet for note taking with stylus",
      "tablet for reading and streaming under $400",
      "compare iPad Air vs Samsung Galaxy Tab S9",
      "best tablet for digital art",
      "cheapest tablet that supports a keyboard",
      "tablet for kids with parental controls",
    ],
    rejection_reasons: ["no stylus support", "storage too small", "too expensive for use case", "app ecosystem limited", "keyboard accessory overpriced", "display too dim", "too heavy for reading"],
    deciding_factors: ["display quality", "stylus experience", "app ecosystem", "price", "battery life", "performance", "portability", "accessory support"],
  },
  "home/smart-home": {
    products: [
      { id: "amazon-echo-show-10", merchants: [{ id: "amazon", price: 249 }] },
      { id: "google-nest-hub-max", merchants: [{ id: "google", price: 229 }, { id: "bestbuy", price: 229 }] },
      { id: "apple-homepod-2", merchants: [{ id: "apple", price: 299 }] },
      { id: "amazon-echo-dot-5", merchants: [{ id: "amazon", price: 49 }] },
      { id: "ring-video-doorbell-4", merchants: [{ id: "amazon", price: 199 }, { id: "bestbuy", price: 199 }] },
      { id: "nest-doorbell-wired", merchants: [{ id: "google", price: 179 }, { id: "bestbuy", price: 179 }] },
      { id: "philips-hue-starter-kit", merchants: [{ id: "amazon", price: 129 }, { id: "bestbuy", price: 129 }] },
    ],
    constraints: ["voice control", "privacy focused", "Matter compatible", "no subscription", "works with existing setup", "good speaker quality", "small form factor"],
    queries: [
      "best smart speaker with screen under $250",
      "smart home hub that works with everything",
      "video doorbell with no monthly subscription",
      "best smart lights for apartment",
      "privacy-focused smart home devices",
      "compare Alexa vs Google Home ecosystem",
    ],
    rejection_reasons: ["requires subscription for basic features", "privacy concerns with always-on mic", "not compatible with existing devices", "sound quality poor", "setup too complicated", "frequent disconnects", "ugly design"],
    deciding_factors: ["ecosystem compatibility", "privacy", "subscription cost", "sound quality", "ease of setup", "price", "design", "smart home protocol support"],
  },
  "fitness/wearables": {
    products: [
      { id: "apple-watch-series-9", merchants: [{ id: "apple", price: 399 }, { id: "bestbuy", price: 399 }, { id: "amazon", price: 349 }] },
      { id: "apple-watch-ultra-2", merchants: [{ id: "apple", price: 799 }] },
      { id: "garmin-forerunner-265", merchants: [{ id: "garmin", price: 449 }, { id: "rei", price: 449 }] },
      { id: "garmin-venu-3", merchants: [{ id: "garmin", price: 449 }, { id: "amazon", price: 399 }] },
      { id: "samsung-galaxy-watch-6", merchants: [{ id: "samsung", price: 299 }, { id: "amazon", price: 259 }] },
      { id: "fitbit-sense-2", merchants: [{ id: "fitbit", price: 249 }, { id: "amazon", price: 199 }] },
      { id: "whoop-4", merchants: [{ id: "whoop", price: 239 }] },
      { id: "oura-ring-gen-3", merchants: [{ id: "oura", price: 299 }] },
    ],
    constraints: ["GPS", "heart rate monitor", "sleep tracking", "waterproof", "long battery", "no subscription", "always-on display", "running metrics", "ECG", "blood oxygen"],
    queries: [
      "best running watch with GPS under $500",
      "fitness tracker with best sleep tracking",
      "smartwatch with longest battery life",
      "compare Apple Watch vs Garmin for running",
      "best fitness tracker without monthly fee",
      "waterproof smartwatch for swimming",
      "best wearable for health monitoring",
      "lightweight fitness tracker for everyday wear",
    ],
    rejection_reasons: ["battery only lasts one day", "requires subscription for features", "not compatible with my phone", "screen too small", "inaccurate heart rate readings", "GPS lock takes too long", "uncomfortable to sleep with", "app is buggy"],
    deciding_factors: ["battery life", "GPS accuracy", "health features", "price", "ecosystem", "comfort", "display quality", "subscription requirements", "water resistance", "app quality"],
  },
  "gaming/accessories": {
    products: [
      { id: "logitech-g-pro-x-superlight", merchants: [{ id: "amazon", price: 159 }, { id: "bestbuy", price: 159 }] },
      { id: "razer-deathadder-v3", merchants: [{ id: "razer", price: 89 }, { id: "amazon", price: 89 }] },
      { id: "steelseries-arctis-nova-pro", merchants: [{ id: "steelseries", price: 349 }, { id: "amazon", price: 319 }] },
      { id: "hyperx-cloud-iii", merchants: [{ id: "hyperx", price: 99 }, { id: "amazon", price: 89 }] },
      { id: "corsair-k100-rgb", merchants: [{ id: "corsair", price: 229 }, { id: "amazon", price: 199 }] },
      { id: "wooting-60he", merchants: [{ id: "wooting", price: 174 }] },
      { id: "secretlab-titan-evo", merchants: [{ id: "secretlab", price: 519 }] },
      { id: "xbox-elite-controller-2", merchants: [{ id: "microsoft", price: 179 }, { id: "amazon", price: 159 }] },
    ],
    constraints: ["wireless", "low latency", "ergonomic", "mechanical", "lightweight", "RGB", "long battery", "programmable", "hot swappable", "hall effect"],
    queries: [
      "best wireless gaming mouse under $160",
      "mechanical keyboard for competitive gaming",
      "gaming headset with best mic quality",
      "ergonomic gaming chair under $500",
      "best controller for PC gaming",
      "lightweight gaming mouse for FPS",
      "compare Logitech vs Razer gaming mouse",
      "best budget gaming headset under $100",
    ],
    rejection_reasons: ["double click issues reported", "software required is bloated", "build quality feels cheap", "mic quality terrible", "too heavy for competitive play", "switches feel mushy", "cushions flatten after months", "wireless drops in games"],
    deciding_factors: ["weight", "sensor accuracy", "latency", "build quality", "price", "software", "comfort", "battery life", "switch type", "brand reputation"],
  },
};

const AGENT_PLATFORMS = [
  "claude", "claude", "claude",
  "chatgpt", "chatgpt",
  "gemini", "gemini",
  "copilot",
  "custom-agent",
  "shopify-sidekick",
  "perplexity",
  "cursor-agent",
];

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
  console.log("Seeding AgentSignal with large dataset...\n");

  let totalSessions = 0;
  let totalEvaluations = 0;
  let totalComparisons = 0;
  let totalOutcomes = 0;

  const categories = Object.keys(CATALOG);

  for (const category of categories) {
    const cat = CATALOG[category];
    const sessionsToCreate = 80 + Math.floor(Math.random() * 60); // 80-140 per category

    for (let i = 0; i < sessionsToCreate; i++) {
      const sessionId = uuidv4();
      const numConstraints = 1 + Math.floor(Math.random() * 4);
      const selectedConstraints = pickN(cat.constraints, numConstraints);

      // Realistic budget based on category price range
      const prices = cat.products.flatMap(p => p.merchants.map(m => m.price));
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const budgetMax = rand(minPrice * 0.7, maxPrice * 1.3);

      await insertSession(sessionId, {
        raw_query: pick(cat.queries),
        category,
        budget_max: budgetMax,
        budget_currency: "USD",
        constraints: selectedConstraints,
        exclusions: Math.random() > 0.75 ? [pick(cat.products).merchants[0].id] : [],
        urgency: pick(["immediate", "standard", "standard", "standard", "flexible"] as const),
        gift: Math.random() > 0.9,
        agent_platform: pick(AGENT_PLATFORMS),
      });
      totalSessions++;

      // Evaluate 3-7 products
      const numToEval = 3 + Math.floor(Math.random() * 5);
      const evaluatedProducts = pickN(cat.products, numToEval);
      const selectedProduct = pick(evaluatedProducts);

      for (const product of evaluatedProducts) {
        const isSelected = product === selectedProduct;
        const merchantListing = pick(product.merchants);
        const priceVariation = rand(-15, 15);
        const isInBudget = (merchantListing.price + priceVariation) <= budgetMax;
        const isShortlisted = !isSelected && Math.random() > 0.45;
        const isRejected = !isSelected && !isShortlisted;

        await insertEvaluation({
          session_id: sessionId,
          product_id: product.id,
          merchant_id: merchantListing.id,
          price_at_time: merchantListing.price + priceVariation,
          in_stock: Math.random() > 0.08,
          match_score: isSelected
            ? rand(0.78, 1)
            : isShortlisted
              ? rand(0.55, 0.85)
              : rand(0.2, 0.65),
          match_reasons: isSelected
            ? pickN(selectedConstraints, Math.min(2, selectedConstraints.length))
            : pickN(cat.constraints, 1),
          disposition: isSelected ? "selected" : isShortlisted ? "shortlisted" : "rejected",
          rejection_reason: isRejected
            ? (!isInBudget && Math.random() > 0.5)
              ? "price exceeds budget"
              : pick(cat.rejection_reasons)
            : undefined,
        });
        totalEvaluations++;
      }

      // Create 1-4 comparisons
      const numComparisons = 1 + Math.floor(Math.random() * 4);
      for (let c = 0; c < numComparisons && evaluatedProducts.length >= 2; c++) {
        const comparedPair = pickN(evaluatedProducts, 2 + Math.floor(Math.random() * 2));
        const winner = comparedPair.includes(selectedProduct) && Math.random() > 0.3
          ? selectedProduct
          : pick(comparedPair);

        await insertComparison({
          session_id: sessionId,
          products_compared: comparedPair.map(p => p.id),
          dimensions_compared: pickN(cat.deciding_factors, 2 + Math.floor(Math.random() * 3)),
          winner_product_id: winner.id,
          deciding_factor: pick(cat.deciding_factors),
        });
        totalComparisons++;
      }

      // Log outcome
      const outcomeRoll = Math.random();
      const outcomeType = outcomeRoll < 0.45 ? "purchased"
        : outcomeRoll < 0.72 ? "recommended"
        : outcomeRoll < 0.88 ? "abandoned"
        : "deferred";

      await insertOutcome({
        session_id: sessionId,
        outcome_type: outcomeType as "purchased" | "recommended" | "abandoned" | "deferred",
        product_chosen_id:
          outcomeType === "purchased" || outcomeType === "recommended"
            ? selectedProduct.id
            : undefined,
        reason:
          outcomeType === "purchased" ? pick(["best match for requirements", "best price found", "highly rated and in budget", "recommended by agent consensus"])
          : outcomeType === "recommended" ? pick(["strong match, user to confirm", "top pick in category", "best value option"])
          : outcomeType === "abandoned" ? pick(["nothing met all constraints", "user changed mind", "prices too high", "out of stock everywhere"])
          : pick(["waiting for sale", "user wants to research more", "checking in-store first"]),
      });
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
