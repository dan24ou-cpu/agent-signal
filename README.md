# AgentSignal

Collective intelligence for AI shopping agents. Every agent that connects makes every other agent smarter.

## Quick Start (30 seconds)

**Remote — zero install:**
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

## What It Does

When AI agents shop on behalf of users, each agent starts from scratch. AgentSignal pools decision signals across all agents so every session benefits from collective intelligence.

### Read Tools — Make Better Decisions

| Tool | What it tells you |
|------|-------------------|
| `get_product_intelligence` | Selection rate, rejection reasons, which competitors beat it and why |
| `get_category_recommendations` | Top picks in a category, what decision factors matter, common requirements |
| `check_merchant_reliability` | Stock reliability, selection rate, purchase outcomes by merchant |
| `get_similar_session_outcomes` | What agents with similar constraints ended up choosing |
| `detect_deal` | Is this price good? Compares against historical prices from all agents |
| `get_warnings` | Stock issues, high rejection rates, abandonment signals |
| `get_constraint_match` | Exact match on your constraints — skip the search if a proven answer exists |

### Write Tools — Contribute Back

| Tool | What it captures |
|------|-----------------|
| `log_shopping_session` | Shopping intent, constraints, budget, exclusions |
| `log_product_evaluation` | Product considered, match score, selected/rejected/shortlisted + why |
| `log_comparison` | Products compared, dimensions, winner, deciding factor |
| `log_outcome` | Final result — purchased, recommended, abandoned, or deferred |
| `get_session_summary` | Retrieve full session details |

## How Agents Use It

**At the start of a shopping task:**
```
1. get_category_recommendations("footwear/running")
2. get_constraint_match("footwear/running", ["cushioned", "wide fit"], 150)
3. log_shopping_session(...)
```

**While evaluating products:**
```
4. get_product_intelligence("hoka-clifton-9")
5. detect_deal("hoka-clifton-9", 129.99)
6. get_warnings(product_id: "hoka-clifton-9", merchant_id: "amazon")
7. log_product_evaluation(...)
```

**Before recommending:**
```
8. check_merchant_reliability("amazon")
9. log_comparison(...)
10. log_outcome(...)
```

## REST API

Merchant-facing analytics at `https://agent-signal-production.up.railway.app/api`:

| Endpoint | Description |
|----------|-------------|
| `GET /api/products/:id/insights` | Product analytics — consideration rate, rejection reasons, competitors |
| `GET /api/categories/:category/trends` | Category trends — top factors, budgets, trending attributes |
| `GET /api/competitive/lost-to?product_id=X` | Competitive losses — what X loses to and why |
| `GET /api/sessions` | Recent sessions (paginated) |
| `GET /api/sessions/:id` | Full session detail |
| `POST /api/admin/aggregate` | Trigger insight computation |
| `GET /api/health` | Health check |

## Self-Hosting

```bash
git clone https://github.com/danhampton/agent-signal.git
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
- **12 MCP tools** — 7 read + 5 write

## License

MIT
