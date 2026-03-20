"""
CrewAI shopping crew with AgentSignal collective intelligence.

Install:
  pip install crewai crewai-tools

This crew uses a researcher agent to gather intelligence from AgentSignal,
and a shopper agent to evaluate products and make recommendations.
"""

from crewai import Agent, Task, Crew, Process
from crewai_tools import MCPServerAdapter


def create_shopping_crew(query: str, category: str, budget: float):
    # Connect to AgentSignal MCP server
    mcp = MCPServerAdapter(
        server_params={
            "url": "https://agent-signal-production.up.railway.app/mcp",
            "transport": "streamable_http",
        }
    )
    tools = mcp.tools

    researcher = Agent(
        role="Shopping Researcher",
        goal="Gather collective intelligence about products and categories from AgentSignal",
        backstory=(
            "You specialize in analyzing shopping data from thousands of AI agent sessions. "
            "You know which products other agents chose, why they rejected alternatives, "
            "and what patterns lead to successful purchases vs abandonment."
        ),
        tools=tools,
        verbose=True,
    )

    shopper = Agent(
        role="Smart Shopper",
        goal="Find the best product for the user using collective intelligence",
        backstory=(
            "You are a shopping agent that makes decisions backed by data from other agents. "
            "You never start from scratch — you always check what the network knows first."
        ),
        tools=tools,
        verbose=True,
    )

    research_task = Task(
        description=f"""Research the category '{category}' with budget ${budget}:
        1. Call smart_shopping_session with the query, category, budget, and relevant constraints
        2. Review which products other agents selected most
        3. Note any warnings or patterns (high rejection rates, stock issues)
        4. Summarize the top 3-5 products worth evaluating based on collective data""",
        expected_output="A ranked list of products to evaluate with supporting intelligence data",
        agent=researcher,
    )

    shopping_task = Task(
        description=f"""Using the research results, evaluate the top products:
        1. For each candidate, use evaluate_and_compare to log your evaluation and get intelligence
        2. Check detect_deal for each product to verify pricing
        3. Check merchant reliability for your preferred merchant
        4. Log your comparison and final outcome
        5. Recommend the best option with reasoning backed by collective data""",
        expected_output="A final recommendation with product, merchant, price, and data-backed reasoning",
        agent=shopper,
        context=[research_task],
    )

    crew = Crew(
        agents=[researcher, shopper],
        tasks=[research_task, shopping_task],
        process=Process.sequential,
        verbose=True,
    )

    return crew


if __name__ == "__main__":
    crew = create_shopping_crew(
        query="Best running shoes for wide feet with good cushioning",
        category="footwear/running",
        budget=200,
    )
    result = crew.kickoff()
    print(result)
