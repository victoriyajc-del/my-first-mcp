# My First MCP Server — Process Notes

A personal record of how this project was built, what it does, and how to use it.

---

## What This Is

An MCP (Model Context Protocol) server with one tool: **Project Timer**.

It lets Claude track how long you spend on tasks — start a timer by name, stop it when you're done, and get back the elapsed time in a friendly format.

**Example:**
> "Start a timer for Sunny Side Cafe hero image"
> *(do your work)*
> "Stop the timer for Sunny Side Cafe hero image"
> → `Elapsed: 1 hour, 12 minutes, 45 seconds`

---

## How It Was Built

### Step 1 — Set up the project
```bash
mkdir ~/mcp-projects/my-first-mcp
cd ~/mcp-projects/my-first-mcp
npm init -y
npm install @modelcontextprotocol/sdk
```

### Step 2 — Write the server (`index.js`)
- Used `McpServer` from the MCP SDK to create the server
- Registered one tool: `project_timer` with two parameters: `action` and `taskName`
- Used `StdioServerTransport` so Claude can communicate with the server over stdin/stdout

### Step 3 — Add file-based persistence
The first version stored timers in a JavaScript `Map` (in memory).
The problem: every time the server process restarted, the Map was wiped — so start and stop couldn't talk to each other.

**Fix:** Save timers to `timers.json` on disk.
- `loadTimers()` reads the file before every action
- `saveTimers()` writes the updated data back after every action
- `timers.json` is excluded from git (it's runtime data, not source code)

### Step 4 — Connect to Claude
```bash
claude mcp add --transport stdio my-first-mcp -- node /full/path/to/index.js
```

### Step 5 — Push to GitHub
```bash
git init
# Created .gitignore to exclude node_modules/ and timers.json
gh repo create my-first-mcp --public --source=. --remote=origin --push
```

---

## Project Structure

```
my-first-mcp/
├── index.js        — MCP server + Project Timer tool
├── package.json    — dependencies (@modelcontextprotocol/sdk)
├── .gitignore      — excludes node_modules/ and timers.json
└── PROCESS.md      — this file
```

---

## How to Use

### Setup (first time)
```bash
git clone https://github.com/victoriyajc-del/my-first-mcp
cd my-first-mcp
npm install
claude mcp add --transport stdio my-first-mcp -- node /full/path/to/index.js
```

### Using the timer in Claude
Just talk naturally:
- **"Start a timer for [task name]"**
- **"Stop the timer for [task name]"**

Claude will call the `project_timer` tool automatically.

### What the tool returns

**On start:**
```
Timer started for: "Sunny Side Cafe hero image"
Start time: 2026-02-19T03:23:30.746Z
```

**On stop:**
```
Timer stopped for: "Sunny Side Cafe hero image"

Start:   2026-02-19T03:23:30.746Z
Stop:    2026-02-19T04:36:15.210Z
Elapsed: 4364464 ms (1 hour, 12 minutes, 44 seconds)
```

---

## Key Concepts Learned

| Concept | What it means |
|---|---|
| **MCP server** | A program that exposes tools Claude can call |
| **stdio transport** | Claude talks to the server through the terminal (stdin/stdout) |
| **Zod schema** | Defines and validates the parameters a tool accepts |
| **In-memory vs. file persistence** | In-memory data resets on restart; writing to a file survives it |
| **.gitignore** | Tells git which files to never commit (e.g. `node_modules/`, runtime data) |
