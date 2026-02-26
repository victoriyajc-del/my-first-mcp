import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TIMERS_FILE = path.join(__dirname, "timers.json");

// ------------------------------------------------------------
// FILE PERSISTENCE
// ------------------------------------------------------------
function loadTimers() {
  try {
    return JSON.parse(fs.readFileSync(TIMERS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveTimers(timers) {
  fs.writeFileSync(TIMERS_FILE, JSON.stringify(timers, null, 2));
}

// ------------------------------------------------------------
// ELAPSED TIME FORMATTER
// ------------------------------------------------------------
function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? "s" : ""}`);
  return parts.join(", ");
}

// ------------------------------------------------------------
// SSE BROADCAST SERVER (port 3001)
// ------------------------------------------------------------
const clients = [];

function broadcastEvent(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((res) => res.write(payload));
}

http.createServer((req, res) => {
  if (req.url === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write("\n");
    clients.push(res);
    req.on("close", () => {
      const i = clients.indexOf(res);
      if (i !== -1) clients.splice(i, 1);
    });
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(3001).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    process.stderr.write("Port 3001 already in use — browser notifications unavailable\n");
  }
});

// ------------------------------------------------------------
// CREATE THE MCP SERVER
// ------------------------------------------------------------
const server = new McpServer({
  name: "project-timer",
  version: "1.0.0",
});

// ------------------------------------------------------------
// REGISTER THE TOOL: project_timer
// ------------------------------------------------------------
server.tool(
  "project_timer",
  {
    action: z
      .enum(["start", "stop"])
      .describe('What to do: "start" begins timing, "stop" ends it'),
    taskName: z.string().describe("Name of the task to time"),
  },
  async ({ action, taskName }) => {
    const timers = loadTimers();

    if (action === "start") {
      const startTime = new Date().toISOString();
      timers[taskName] = { startTime };
      saveTimers(timers);
      broadcastEvent({ type: "start", taskName });
      return {
        content: [
          {
            type: "text",
            text: `Timer started for: "${taskName}"\nStart time: ${startTime}`,
          },
        ],
      };
    }

    if (action === "stop") {
      const timer = timers[taskName];
      if (!timer) {
        return {
          content: [
            {
              type: "text",
              text: `No timer found for: "${taskName}". Did you start it?`,
            },
          ],
        };
      }
      const stopTime = new Date().toISOString();
      const elapsed = new Date(stopTime) - new Date(timer.startTime);
      delete timers[taskName];
      saveTimers(timers);
      broadcastEvent({ type: "stop", taskName, formatted: formatElapsed(elapsed) });
      return {
        content: [
          {
            type: "text",
            text: `Timer stopped for: "${taskName}"\n\nStart:   ${timer.startTime}\nStop:    ${stopTime}\nElapsed: ${elapsed} ms (${formatElapsed(elapsed)})`,
          },
        ],
      };
    }
  }
);

// ------------------------------------------------------------
// START THE SERVER
// ------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
