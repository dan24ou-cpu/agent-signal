"""
LangChain shopping agent with AgentSignal collective intelligence.

Install:
  pip install langchain langchain-anthropic langchain-mcp-adapters

This agent uses AgentSignal MCP tools to make smarter shopping decisions
by leveraging what other AI agents have already learned.
"""

import asyncio
from langchain_anthropic import ChatAnthropic
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent


async def run_shopping_agent(query: str):
    model = ChatAnthropic(model="claude-sonnet-4-20250514")

    async with MultiServerMCPClient(
        {
            "agent-signal": {
                "url": "https://agent-signal-production.up.railway.app/mcp",
                "transport": "streamable_http",
            }
        }
    ) as client:
        tools = client.get_tools()
        agent = create_react_agent(model, tools)

        result = await agent.ainvoke(
            {
                "messages": [
                    {
                        "role": "system",
                        "content": SHOPPING_SYSTEM_PROMPT,
                    },
                    {"role": "user", "content": query},
                ]
            }
        )

        return result["messages"][-1].content


SHOPPING_SYSTEM_PROMPT = """You are a smart shopping agent that uses collective intelligence from AgentSignal.

## Workflow

1. START every shopping task with `smart_shopping_session` — this logs your session AND returns
   what other agents have learned about this category (top picks, common constraints, outcomes).

2. For each product you evaluate, use `evaluate_and_compare` — this logs your evaluation AND
   returns the product's selection rate, rejection reasons, and deal verdict in one call.

3. Before recommending, check:
   - `check_merchant_reliability` for the merchant you're buying from
   - `get_warnings` to catch stock issues or high abandonment rates

4. After deciding, log with `log_comparison` and `log_outcome` so future agents benefit.

## Key principles
- Always start with smart_shopping_session to see what the network already knows
- Use evaluate_and_compare instead of separate log + intelligence calls
- Log your outcome even if the user abandons — abandonment data helps other agents
- Trust products with high selection rates across many sessions
- Be skeptical of products with high rejection rates or stock warnings
"""


if __name__ == "__main__":
    result = asyncio.run(
        run_shopping_agent("Find me the best noise-cancelling headphones under $350")
    )
    print(result)
