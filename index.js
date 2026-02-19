// ============================================================
// MY FIRST MCP SERVER — Project Timer
// ============================================================
// An MCP (Model Context Protocol) server exposes "tools" that
// Claude can call. This server has one tool: "project_timer".
// It lets you start and stop a timer for any named task, so
// you can track how long you spend on design work, client
// calls, writing, etc.
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// __dirname isn't available in ES modules — this recreates it
const __dirname = dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------
// FILE-BASED TIMER STORAGE
// ------------------------------------------------------------
// Instead of keeping timers in memory (which resets on every
// restart), we read/write a JSON file called timers.json in
// the same folder as index.js.
//
// The file looks like this:
// {
//   "Sunny Side Cafe hero image": 1708123456789,
//   "Client call prep": 1708123500000
// }
//
// loadTimers() reads it fresh from disk on every tool call.
// saveTimers() writes the updated data back to disk.
// ------------------------------------------------------------
const TIMERS_FILE = join(__dirname, "timers.json");

function loadTimers() {
  // If the file doesn't exist yet, return an empty object
  if (!existsSync(TIMERS_FILE)) return {};
  return JSON.parse(readFileSync(TIMERS_FILE, "utf8"));
}

function saveTimers(timers) {
  // null, 2 = pretty-print with 2-space indent (easy to read)
  writeFileSync(TIMERS_FILE, JSON.stringify(timers, null, 2));
}

// ------------------------------------------------------------
// HELPER: Format milliseconds into a human-friendly string
// ------------------------------------------------------------
// Example: 3_750_000 ms → "1 hour, 2 minutes, 30 seconds"
// ------------------------------------------------------------
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0)   parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} second${seconds !== 1 ? "s" : ""}`);
  }

  return parts.join(", ");
}

// ------------------------------------------------------------
// CREATE THE MCP SERVER
// ------------------------------------------------------------
// McpServer is the main class from the SDK. You give it a
// name and version — these show up when Claude connects.
// ------------------------------------------------------------
const server = new McpServer({
  name: "project-timer",
  version: "1.0.0",
});

// ------------------------------------------------------------
// REGISTER THE TOOL: project_timer
// ------------------------------------------------------------
// server.tool() takes three arguments:
//   1. Tool name   — how Claude identifies it
//   2. Parameters  — what Claude must pass in (validated with zod)
//   3. Handler     — the async function that does the actual work
// ------------------------------------------------------------
server.tool(
  // 1. Tool name (Claude will call this by name)
  "project_timer",

  // 2. Parameter schema — z.object() defines what's required
  {
    action: z
      .enum(["start", "stop"])
      .describe('What to do: "start" begins timing, "stop" ends it'),

    taskName: z
      .string()
      .min(1)
      .describe('The name of the task, e.g. "Sunny Side Cafe hero image"'),
  },

  // 3. Handler function — runs when Claude calls the tool
  async ({ action, taskName }) => {

    // ── START ──────────────────────────────────────────────
    if (action === "start") {

      // Record the current time in milliseconds
      const startTime = Date.now();

      // Load the current timers from disk, add this one, save back
      const timers = loadTimers();
      timers[taskName] = startTime;
      saveTimers(timers);

      // Convert to a readable timestamp for the response
      const startTimestamp = new Date(startTime).toISOString();

      return {
        content: [
          {
            type: "text",
            text: [
              `Timer started for: "${taskName}"`,
              `Start time: ${startTimestamp}`,
              `Call project_timer with action "stop" and the same taskName when you're done.`,
            ].join("\n"),
          },
        ],
      };
    }

    // ── STOP ───────────────────────────────────────────────
    if (action === "stop") {

      // Load timers from disk and look up this task
      const timers = loadTimers();
      const startTime = timers[taskName];

      // If there's no matching start, let Claude know
      if (startTime === undefined) {
        return {
          content: [
            {
              type: "text",
              text: `No active timer found for "${taskName}". Did you start one first?`,
            },
          ],
        };
      }

      // Calculate elapsed time
      const stopTime = Date.now();
      const elapsedMs = stopTime - startTime;
      const friendlyDuration = formatDuration(elapsedMs);

      // Clean up — remove the timer from disk so the name can be reused
      delete timers[taskName];
      saveTimers(timers);

      const startTimestamp = new Date(startTime).toISOString();
      const stopTimestamp  = new Date(stopTime).toISOString();

      return {
        content: [
          {
            type: "text",
            text: [
              `Timer stopped for: "${taskName}"`,
              ``,
              `Start:   ${startTimestamp}`,
              `Stop:    ${stopTimestamp}`,
              `Elapsed: ${elapsedMs} ms (${friendlyDuration})`,
            ].join("\n"),
          },
        ],
      };
    }
  }
);

// ------------------------------------------------------------
// CONNECT THE SERVER VIA STDIO TRANSPORT
// ------------------------------------------------------------
// Claude communicates with MCP servers over stdin/stdout.
// StdioServerTransport handles that piping automatically.
// The server is now listening and ready for Claude to call it.
// ------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
