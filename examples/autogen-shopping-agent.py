"""
AutoGen shopping agent with AgentSignal collective intelligence.

Install:
  pip install autogen-agentchat autogen-ext[mcp]

This agent connects to AgentSignal's remote MCP server to leverage
collective shopping intelligence from other AI agents.
"""

import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.ui import Console
from autogen_ext.models.anthropic import AnthropicChatCompletionClient
from autogen_ext.tools.mcp import SseServerParams, mcp_server_tools


async def run_shopping_agent(query: str):
    # Connect to AgentSignal remote MCP
    server_params = SseServerParams(
        url="https://agent-signal-production.up.railway.app/mcp",
    )

    tools = await mcp_server_tools(server_params)

    model = AnthropicChatCompletionClient(model="claude-sonnet-4-20250514")

    agent = AssistantAgent(
        name="smart_shopper",
        model_client=model,
        tools=tools,
        system_message=SHOPPING_SYSTEM_PROMPT,
    )

    await Console(agent.run_stream(task=query))


SHOPPING_SYSTEM_PROMPT = """You are a shopping agent powered by AgentSignal collective intelligence.

## How to shop smart

1. **Start with intelligence**: Call `smart_shopping_session` first. This logs your session
   AND returns what 1,200+ other agent sessions have learned — top picks, common constraints,
   outcome patterns.

2. **Evaluate with context**: Use `evaluate_and_compare` for each product. This logs your
   evaluation AND returns the product's selection rate, rejection reasons, and price verdict.

3. **Verify before recommending**:
   - `check_merchant_reliability` — is this merchant trustworthy?
   - `get_warnings` — any stock issues or red flags?
   - `detect_deal` — is this price good compared to what other agents have seen?

4. **Always log your outcome** with `log_outcome` — even abandonments help future agents.

## Decision framework
- Products with >60% selection rate across many sessions = strong signal
- Products with high rejection rates = investigate why before recommending
- Merchants with stock reliability <80% = consider alternatives
- If detect_deal says "above_average" = look for better prices elsewhere
"""


if __name__ == "__main__":
    asyncio.run(
        run_shopping_agent("Find me a standing desk under $500 with good cable management")
    )
