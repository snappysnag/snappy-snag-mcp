# SnappySnag Model Context Protocol (MCP) Server

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![SnappySnag](https://img.shields.io/badge/Service-SnappySnag-f59e0b.svg)](https://snappysnag.com)
[![pub.dev](https://img.shields.io/pub/v/snappy_snag.svg)](https://pub.dev/packages/snappy_snag)

The official **Model Context Protocol (MCP)** integration for [SnappySnag](https://snappysnag.com) — seamlessly bridge Flutter in-app bug reports, pin annotations, screen diagnostics, and device logs directly into **Cursor**, **Windsurf**, **Claude Desktop**, and other AI coding assistants.

---

## ⚡ What is SnappySnag MCP?

When testing Flutter applications, QA testers and end-users pinpoint visual bugs or unexpected behaviors directly on the mobile screen. SnappySnag captures:
- Exact visual pin coordinates and feedback comments
- Annotated high-resolution screenshot
- Active screen class & widget tree hierarchy
- Real-time device logs (OS, platform, version, device metadata)
- AI-generated root-cause insights and resolution prompts

With the **SnappySnag MCP Server**, your AI coding agent (in Cursor, Windsurf, Claude, etc.) can inspect these bug reports directly, jump straight to the relevant Flutter widget code, implement fixes, and mark tickets as resolved without ever switching context away from your editor.

---

## 🛠️ Available MCP Tools

| Tool | Description | Key Parameters |
| :--- | :--- | :--- |
| `get_latest_feedback` | Fetches the most recent bug report or user feedback with full details (active pins, screenshot, metadata, device info). | `status` (`open` \| `all`), `include_screenshot` (`true` \| `false`) |
| `list_feedbacks` | Searches and lists feedback tickets matching filter criteria (status, severity, keyword). Returns lightweight summaries. | `status` (`open` \| `resolved` \| `ignored` \| `all`), `severity`, `source`, `keyword`, `limit` |
| `get_feedback_detail` | Retrieves complete details for a specific feedback ID, including screenshot image, active pins, and discussion notes. | `feedback_id` (required), `include_screenshot` |
| `update_feedback_status` | Updates ticket status (`resolved` / `ignored` / `open`) and optionally attaches a developer resolution note. | `feedback_id` (required), `status` (required), `comment` |

---

## 🚀 Quick Start / Configuration

SnappySnag supports two connection options:
1. **Option A (Command / stdio with Demo Mode)**: Runs locally via standard MCP stdio. If no key is provided, an interactive **Demo Mode** with mock Flutter bug tickets is activated!
2. **Option B (Remote SSE / Streamable HTTP)**: Connects directly to SnappySnag's hosted endpoint without any local dependencies.

---

### 1. Get your MCP Secret Key (Optional for Demo)
1. Sign in to your [SnappySnag Dashboard](https://snappysnag.com/dashboard).
2. Open **Project Settings** (gear icon) -> **Integrations** or **MCP** tab.
3. Click **Generate MCP Secret Key** and copy your key (`snag_mcp_...`).

---

### 2. Configure Your AI Editor

#### 🔹 Option A: Command / stdio (`npx` or local build)

##### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "snappysnag": {
      "command": "node",
      "args": ["path/to/snappy-snag-mcp/dist/index.js", "--key=YOUR_MCP_SECRET_KEY"]
    }
  }
}
```
*(Tip: Omit `--key` or set `--key=demo` to test with demo data!)*

##### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "snappysnag": {
      "command": "node",
      "args": ["path/to/snappy-snag-mcp/dist/index.js", "--key=YOUR_MCP_SECRET_KEY"]
    }
  }
}
```

---

#### 🔹 Option B: Streamable HTTP (Remote SSE)

##### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "snappysnag": {
      "url": "https://snappysnag.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_SECRET_KEY"
      }
    }
  }
}
```

##### Windsurf (`~/.codeium/windsurf/mcp_config.json`)
```json
{
  "mcpServers": {
    "snappysnag": {
      "serverUrl": "https://snappysnag.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_SECRET_KEY"
      }
    }
  }
}
```

---

## 💡 Example Prompt Workflow

Once connected, you can instruct your AI assistant naturally:

> **"Check the latest open bug report from SnappySnag and fix the issue."**

The AI agent will:
1. Call `get_latest_feedback(status: "open")` to inspect the reported screen, pin position, and device specs.
2. Read the referenced Flutter widget file in your repository.
3. Apply the necessary code fix or layout adjustment.
4. Call `update_feedback_status(feedback_id: "...", status: "resolved", comment: "Fixed overflow in ProductCard layout")`.

---

## 🔒 Security & Privacy

- **Per-Project Scoped Keys**: Each MCP Secret Key is strictly scoped to its designated project.
- **Instant Revocation**: If compromised, keys can be regenerated or revoked with a single click in the dashboard.
- **Encrypted Transmission**: All data and screenshot assets are delivered via HTTPS with short-lived signed URLs.

---

## 📚 Resources & Links

- **SnappySnag Official Site**: [https://snappysnag.com](https://snappysnag.com)
- **Flutter SDK (`snappy_snag`)**: [pub.dev/packages/snappy_snag](https://pub.dev/packages/snappy_snag)
- **Model Context Protocol (Anthropic)**: [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
