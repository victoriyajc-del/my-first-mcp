# Build Plan — Alert Notifications

A record of how browser alert notifications were added to this project, broken into small reviewable steps.

---

## Overview

The goal was to connect Claude's MCP timer tool to real-time browser notifications so that when Claude starts or stops a timer, a toast notification appears in the browser automatically.

**Libraries used:** [Toastify JS](https://apvarun.github.io/toastify-js/)
**Bridge method:** Server-Sent Events (SSE) over HTTP on port 3001

---

## Steps

### Step 1 — Verify Toastify works in the browser

**What changed:** `index.html`

Added a test button and loaded Toastify from CDN. Also removed the existing `<script src="./index.js">` tag — `index.js` is the Node.js MCP server and cannot run in the browser.

**How to test:** Open `index.html`, click the button, confirm a blue toast appears.

---

### Step 2 — Add the 3 alert types

**What changed:** `index.html`, new `app.js`

Moved JavaScript out of `index.html` into a dedicated `app.js` file. Created a reusable `showAlert(message, type)` function with three types:

| Type | Color |
|---|---|
| `success` | `#2e7d32` (green) |
| `error` | `#c62828` (red) |
| `info` | `#1565c0` (blue) |

**How to test:** Click each button and confirm each toast shows the correct color.

---

### Step 3 — Simulate timer alerts with realistic UI

**What changed:** `index.html`, `app.js`

Replaced the generic type buttons with a task name input and Start/Stop buttons. Added validation so clicking without a task name shows an error toast.

**How to test:**
- Click Start/Stop with no input → red error toast
- Type a task name, click Start → green toast
- Click Stop → blue toast

---

### Step 4 — Clean up `index.js`

**What changed:** `index.js`

Removed Toastify imports and the `showAlert` function — they don't belong in a Node.js process. Restored the complete working MCP server with:

- Proper SDK imports (`McpServer`, `StdioServerTransport`, `z`)
- File persistence (`loadTimers`, `saveTimers`)
- Elapsed time formatter (`formatElapsed`)
- Correct `return { content: [...] }` responses

**How to test:** Ask Claude to start and stop a timer. Confirm it returns elapsed time correctly.

---

### Step 5 — Bridge server events to browser (SSE)

**What changed:** `index.js`, `app.js`

Added a lightweight HTTP server inside `index.js` (port 3001) that streams Server-Sent Events to any connected browser tab. When Claude triggers a timer action, the server broadcasts the event and the browser shows the appropriate toast.

**Architecture:**

```
Claude
  └── stdio → index.js (MCP server)
                 ├── writes to timers.json
                 ├── returns text to Claude
                 └── broadcasts SSE → browser (port 3001)
                                         └── app.js → showAlert()
```

**How to test:**
1. Restart the MCP server so Claude picks up the changes
2. Open `index.html` in the browser
3. Ask Claude: `"Start a timer for [task name]"`
4. Confirm a green toast appears in the browser

---

## Bugs Fixed

| Bug | File | Description | Fix |
|---|---|---|---|
| `splice(-1, 1)` | `index.js` | If `indexOf` returns `-1`, removes the last client instead of nothing | Guard with `if (i !== -1)` |
| Port conflict crash | `index.js` | No error handler on HTTP server — crashes if port 3001 is in use | Added `EADDRINUSE` handler |
| Uncaught parse error | `app.js` | `JSON.parse` on SSE payload throws uncaught browser error | Wrapped in `try/catch` |
| `"1 minute, 0 seconds"` | `index.js` | `formatElapsed` always appended seconds even when 0 | Only push seconds if `> 0` or it's the only unit |

---

## File Structure After This Feature

```
my-first-mcp/
├── index.js        — MCP server + SSE broadcast server
├── app.js          — Browser JS: showAlert(), SSE listener, manual buttons
├── index.html      — Browser UI: styled card with task input
├── package.json    — dependencies (MCP SDK, toastify-js)
├── timers.json     — runtime data (excluded from git)
├── PROCESS.md      — project history
└── docs/
    └── BUILD-PLAN.md  — this file
```
