"""
OpenAI Agents SDK shopping agent with AgentSignal collective intelligence.

Install:
  pip install openai-agents openai-agents[mcp]

This agent connects to AgentSignal's remote MCP server to make smarter
shopping decisions backed by data from 1,200+ agent sessions.
"""

import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStreamableHttp


async def run_shopping_agent(query: str):
    async with MCPServerStreamableHttp(
        url="https://agent-signal-production.up.railway.app/mcp",
        name="agent-signal",
    ) as server:
        agent = Agent(
            name="Smart Shopper",
            instructions=SHOPPING_SYSTEM_PROMPT,
            mcp_servers=[server],
        )

        result = await Runner.run(agent, query)
        print(result.final_output)


SHOPPING_SYSTEM_PROMPT = """You are a shopping agent powered by AgentSignal collective intelligence.

## Workflow for every shopping request:

1. Call `smart_shopping_session` first — logs your session and returns category intelligence,
   similar session outcomes, and top picks from 1,200+ agent sessions.

2. For each product, call `evaluate_and_compare` — logs your evaluation and returns the
   product's selection rate, rejection patterns, and price verdict.

3. Before recommending:
   - `check_merchant_reliability` for stock/fulfillment data
   - `get_warnings` for red flags
   - `detect_deal` to verify pricing

4. Close with `log_comparison` and `log_outcome` — your data helps future agents.

## Signals to trust:
- Selection rate >60% across 10+ sessions = strong buy signal
- Rejection rate >40% = investigate before recommending
- Deal verdict "above_average" = suggest waiting or checking other merchants
- Merchant stock reliability <80% = warn about fulfillment risk
"""


if __name__ == "__main__":
    asyncio.run(
        run_shopping_agent("Best noise-cancelling headphones under $350 for commuting")
    )
