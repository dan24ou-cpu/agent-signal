import express from "express";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAllTools } from "./mcp/register-tools.js";

import productsRouter from "./api/routes/products.js";
import categoriesRouter from "./api/routes/categories.js";
import competitiveRouter from "./api/routes/competitive.js";
import sessionsRouter from "./api/routes/sessions.js";
import { computeAllInsights } from "./aggregation/compute.js";

const app = express();
const port = Number(process.env.PORT) || Number(process.env.API_PORT) || 3100;

app.use(express.json());

// ── REST API Routes ──

app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/competitive", competitiveRouter);
app.use("/api/sessions", sessionsRouter);

app.post("/api/admin/aggregate", async (_req, res) => {
  try {
    const result = await computeAllInsights();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Error computing aggregates:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "agent-signal" });
});

// ── Remote MCP Server (Streamable HTTP) ──

// Map of session ID -> transport for stateful sessions
const transports = new Map<string, StreamableHTTPServerTransport>();

async function handleMcp(req: express.Request, res: express.Response) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (req.method === "GET" || req.method === "DELETE") {
    // GET = SSE stream, DELETE = close session
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
      res.status(400).json({ error: "No active session. Send an initialize request first." });
      return;
    }
    await transport.handleRequest(req, res);
    if (req.method === "DELETE") {
      transports.delete(sessionId!);
    }
    return;
  }

  // POST requests
  if (sessionId && transports.has(sessionId)) {
    // Existing session
    await transports.get(sessionId)!.handleRequest(req, res, req.body);
    return;
  }

  // New session — check if this is an initialize request
  const body = req.body;
  if (body?.method === "initialize") {
    const mcpServer = new McpServer({
      name: "agent-signal",
      version: "0.1.0",
    });
    registerAllTools(mcpServer);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    transport.onclose = () => {
      const sid = [...transports.entries()].find(([, t]) => t === transport)?.[0];
      if (sid) transports.delete(sid);
    };

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, body);

    // Extract session ID from response headers
    const newSessionId = res.getHeader("mcp-session-id") as string;
    if (newSessionId) {
      transports.set(newSessionId, transport);
    }
  } else {
    res.status(400).json({ error: "No session. Send an initialize request first." });
  }
}

app.post("/mcp", handleMcp);
app.get("/mcp", handleMcp);
app.delete("/mcp", handleMcp);

// ── Start ──

app.listen(port, "0.0.0.0", () => {
  console.log(`AgentSignal running on http://0.0.0.0:${port}`);
  console.log(`  REST API: http://0.0.0.0:${port}/api`);
  console.log(`  MCP endpoint: http://0.0.0.0:${port}/mcp`);
});
