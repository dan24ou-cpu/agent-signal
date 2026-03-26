# AgentSignal

[![npm version](https://img.shields.io/npm/v/agent-signal)](https://www.npmjs.com/package/agent-signal)
[![GitHub stars](https://img.shields.io/github/stars/dan24ou-cpu/agent-signal)](https://github.com/dan24ou-cpu/agent-signal)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP Tools](https://img.shields.io/badge/MCP_Tools-23-green)](https://github.com/dan24ou-cpu/agent-signal)

**The collective intelligence layer for AI shopping agents.**

Every agent that connects makes every other agent smarter. 1,200+ shopping sessions, 95 products, 50 merchants, 10 categories — and growing.

> **Why this exists:** When AI agents shop for users, each agent starts from zero. AgentSignal pools decision signals across all agents so every session benefits from what every other agent has already learned — selection rates, rejection patterns, price intelligence, merchant reliability, and proven constraint matches.

## Quick Start (30 seconds)

**Remote — zero install, instant intelligence:**
```json
{
  "mcpServers": {
    "agent-signal": {
      "url": "https://agent-signal-production.up.railway.app/mcp"
    }
  }
}
```

**Local via npx:**
```bash
npx agent-signal
```

**Claude Desktop / Claude Code:**
```json
{
  "mcpServers": {
    "agent-signal": {
      "command": "npx",
      "args": ["agent-signal"]
    }
  }
}
```

## One Call to Start Shopping Smarter

The `smart_shopping_session` tool logs your session AND returns all available intelligence in a single call:

```
smart_shopping_session({
  raw_query: "lightweight running shoes with good cushioning",
  category: "footwear/running",
  budget_max: 200,
  constraints: ["lightweight", "cushioned"]
})
```

**Returns:**
- Your session ID for subsequent logging
- Top picks from other agents in that category
- What constraints and factors mattered most
- How similar sessions ended (purchased vs abandoned)
- Network-wide stats

## 23 MCP Tools

### Smart Combo Tools (recommended)

| Tool | What it does |
|------|-------------|
| `smart_shopping_session` | Start session + get category intelligence + similar session outcomes — all in one call |
| `evaluate_and_compare` | Log product evaluation + get product intelligence + deal verdict — all in one call |

### Buyer Intelligence — Shop Smarter

| Tool | What it tells you |
|------|-------------------|
| `get_product_intelligence` | Selection rate, rejection reasons, which competitors beat it and why |
| `get_category_recommendations` | Top picks, decision factors, common requirements, average budgets |
| `check_merchant_reliability` | Stock accuracy, selection rate, purchase outcomes by merchant |
| `get_similar_session_outcomes` | What agents with similar constraints ended up choosing |
| `detect_deal` | Price verdict against historical data — best_price_ever to above_average |
| `get_warnings` | Stock issues, high rejection rates, abandonment signals |
| `get_constraint_match` | Products that exactly match your constraints — skip the search |

### Seller Intelligence — Understand Your Market

| Tool | What it tells you |
|------|-------------------|
| `get_competitive_landscape` | Category rank, head-to-head win rate, who beats you and why, price positioning |
| `get_rejection_analysis` | Why agents reject your product, weekly trends, what they chose instead |
| `get_category_demand` | What agents are searching for, unmet needs, budget distribution, market gaps |
| `get_merchant_scorecard` | Full merchant report — stock reliability, price competitiveness, selection rates by category |

### Discovery & Monitoring

| Tool | What it tells you |
|------|-------------------|
| `get_budget_products` | Best products within a specific budget — ranked by agent selections, with merchant availability |
| `get_trending_products` | Products trending up or down — compares current vs previous period selection rates |
| `create_price_alert` | Set a price alert — triggers when agents spot the product at or below your target |
| `check_price_alerts` | Check which alerts have been triggered by recent agent activity |

### Write Tools — Contribute Back

| Tool | What it captures |
|------|-----------------|
| `log_shopping_session` | Shopping intent, constraints, budget, exclusions |
| `log_product_evaluation` | Product considered, match score, disposition + rejection reason |
| `log_comparison` | Products compared, dimensions, winner, deciding factor |
| `log_outcome` | Final result — purchased, recommended, abandoned, or deferred |
| `import_completed_session` | Bulk import a completed session retroactively |
| `get_session_summary` | Retrieve full session details |

## Example: Full Agent Workflow

```
# 1. Start smart — one call gets you session ID + intelligence
smart_shopping_session(category: "electronics/headphones", constraints: ["noise-cancelling", "wireless"], budget_max: 400)

# 2. Evaluate products — get intel as you log
evaluate_and_compare(session_id: "...", product_id: "sony-wh1000xm5", price_at_time: 349, disposition: "selected")
evaluate_and_compare(session_id: "...", product_id: "bose-qc45", price_at_time: 279, disposition: "rejected", rejection_reason: "inferior ANC")

# 3. Compare and close
log_comparison(products_compared: ["sony-wh1000xm5", "bose-qc45"], winner: "sony-wh1000xm5", deciding_factor: "noise cancellation quality")
log_outcome(session_id: "...", outcome_type: "purchased", product_chosen_id: "sony-wh1000xm5")
```

Every step feeds the network. The next agent shopping for headphones benefits from your data.

## Example: Seller Intelligence Workflow

```
# 1. How is my product performing vs competitors?
get_competitive_landscape(product_id: "sony-wh1000xm5")
# → Category rank #1, 68% head-to-head win rate, beats bose-qc45 on ANC quality

# 2. Why are agents rejecting my product?
get_rejection_analysis(product_id: "bose-qc45")
# → 45% rejected for "inferior ANC", agents chose sony-wh1000xm5 instead 3x more

# 3. What do agents want in my category?
get_category_demand(category: "electronics/headphones")
# → Top demands: noise-cancelling (89%), wireless (82%), unmet need: "spatial audio"

# 4. How does my store perform?
get_merchant_scorecard(merchant_id: "amazon")
# → 34% selection rate, 2% out-of-stock, cheapest option 41% of the time
```

## Categories with Active Intelligence

| Category | Sessions |
|----------|----------|
| footwear/running | 150+ |
| electronics/headphones | 140+ |
| gaming/accessories | 130+ |
| electronics/tablets | 130+ |
| home/furniture/desks | 120+ |
| fitness/wearables | 118+ |
| electronics/phones | 115+ |
| home/smart-home | 107+ |
| kitchen/appliances | 105+ |
| electronics/laptops | 98+ |

## Agent Framework Examples

Ready-to-run examples in [`/examples`](./examples):

| Framework | File | Description |
|-----------|------|-------------|
| **LangChain** | [`langchain-shopping-agent.py`](./examples/langchain-shopping-agent.py) | ReAct agent with LangGraph + MCP adapter |
| **CrewAI** | [`crewai-shopping-crew.py`](./examples/crewai-shopping-crew.py) | Two-agent crew (researcher + shopper) |
| **AutoGen** | [`autogen-shopping-agent.py`](./examples/autogen-shopping-agent.py) | AutoGen agent with MCP tools |
| **OpenAI Agents** | [`openai-agents-shopping.py`](./examples/openai-agents-shopping.py) | OpenAI Agents SDK with Streamable HTTP |
| **Claude** | [`claude-system-prompt.md`](./examples/claude-system-prompt.md) | Optimized system prompt for Claude Desktop/Code |

All examples connect to the hosted MCP endpoint — no setup beyond `pip install` required.

## REST API

Merchant-facing analytics at `https://agent-signal-production.up.railway.app/api`:

| Endpoint | Description |
|----------|-------------|
| `GET /api/products/:id/insights` | Product analytics — consideration rate, rejection reasons |
| `GET /api/categories/:category/trends` | Category trends — top factors, budgets, attributes |
| `GET /api/competitive/lost-to?product_id=X` | Competitive losses — what X loses to and why |
| `GET /api/sessions` | Recent sessions (paginated) |
| `GET /api/sessions/:id` | Full session detail |
| `POST /api/admin/aggregate` | Trigger insight computation |
| `GET /api/health` | Health check |

## Self-Hosting

```bash
git clone https://github.com/dan24ou-cpu/agent-signal.git
cd agent-signal
npm install
cp .env.example .env  # set DATABASE_URL to your PostgreSQL
npm run migrate
npm run seed           # optional: sample data
npm run dev            # starts API + MCP server on port 3100
```

## Architecture

- **MCP Server** — Stdio transport (local) + Streamable HTTP (remote)
- **REST API** — Express on the same port
- **Database** — PostgreSQL (Neon-compatible)
- **23 MCP tools** — 17 read (buyer + seller + discovery) + 6 write

## License

MIT
