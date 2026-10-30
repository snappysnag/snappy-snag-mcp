#!/usr/bin/env node

/**
 * SnappySnag Model Context Protocol (MCP) Server
 *
 * Connects Cursor, Windsurf, Claude, and other AI IDEs to SnappySnag's
 * Flutter bug tracking, visual pin annotations, and device diagnostics.
 *
 * Supports live proxying to https://snappysnag.com/api/mcp with an API key,
 * or an interactive demo mode when no key (or "demo") is provided.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ============================================================================
// 1. Configuration & Argument Parsing
// ============================================================================

function parseApiKey(): string {
  // 1. Check CLI arguments (e.g., --key=xxx or --api-key xxx)
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--key=")) {
      return arg.split("=")[1].trim();
    }
    if (arg.startsWith("--api-key=")) {
      return arg.split("=")[1].trim();
    }
    if ((arg === "--key" || arg === "-k" || arg === "--api-key") && i + 1 < args.length) {
      return args[i + 1].trim();
    }
  }

  // 2. Check environment variables
  if (process.env.SNAPPY_SNAG_MCP_KEY) {
    return process.env.SNAPPY_SNAG_MCP_KEY.trim();
  }
  if (process.env.SNAPPY_SNAG_API_KEY) {
    return process.env.SNAPPY_SNAG_API_KEY.trim();
  }

  return "";
}

const apiKey = parseApiKey();
const isDemoMode = !apiKey || apiKey.toLowerCase() === "demo";
const ENDPOINT_URL = process.env.SNAPPY_SNAG_ENDPOINT || "https://snappysnag.com/api/mcp";

// ============================================================================
// 2. Demo Mock Data (For evaluation, catalogs, & new users)
// ============================================================================

const DEMO_ONBOARDING_NOTE = `
ℹ️ [SnappySnag Demo Mode]
You are currently viewing mock demo data.
To connect to your real Flutter project and inspect live visual feedback, device logs, and screenshots:
1. Sign up for free at https://snappysnag.com
2. Go to Project Settings -> MCP Tab to generate your Secret Key.
3. Configure your AI IDE with: --key=snag_mcp_YOUR_SECRET_KEY
--------------------------------------------------------------------------------
`.trim();

const DEMO_FEEDBACK_ITEMS = [
  {
    id: "demo-fb-001",
    summary: "[Pin #1] Cart checkout button overflows on smaller screen heights",
    title: "[Pin #1] Cart checkout button overflows on smaller screen heights",
    status: "open",
    severity: "high",
    source: "dev",
    active_pin_count: 2,
    screen_category: "CartCheckoutScreen",
    state_signature: "cart_with_items",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    user_memo: "Bottom overflow of 18 pixels when keyboard appears on Cart screen.",
    platform: "ios",
    os_name: "iOS",
    os_version: "18.2",
    device_model: "iPhone 15 Pro",
    pins: [
      {
        number: 1,
        comment: "The Checkout button RenderFlex overflows at the bottom here.",
        x_ratio: 0.5,
        y_ratio: 0.88,
        is_active: true,
      },
      {
        number: 2,
        comment: "Coupon input field gets hidden under keyboard.",
        x_ratio: 0.5,
        y_ratio: 0.65,
        is_active: true,
      },
    ],
    ai_suggestion:
      "Wrap the checkout column in a `SingleChildScrollView` or use `SafeArea` + `Expanded` to prevent bottom overflow when the on-screen keyboard appears.",
    target_widget: "lib/features/cart/presentation/cart_checkout_screen.dart",
    breadcrumbs: [
      { category: "navigation", message: "push: /home" },
      { category: "action", message: "tap: 'View Cart' Button" },
      { category: "navigation", message: "push: /home -> /cart" },
      { category: "action", message: "tap: 'Apply Coupon' TextField" },
    ],
  },
  {
    id: "demo-fb-002",
    summary: "[Pin #1] User profile avatar fails to load when offline",
    title: "[Pin #1] User profile avatar fails to load when offline",
    status: "open",
    severity: "medium",
    source: "user",
    active_pin_count: 1,
    screen_category: "ProfileScreen",
    state_signature: "offline_mode",
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    user_memo: "App shows a blank broken box instead of fallback initials when network is weak.",
    platform: "android",
    os_name: "Android",
    os_version: "14",
    device_model: "Pixel 8",
    pins: [
      {
        number: 1,
        comment: "Should show fallback avatar or default user icon.",
        x_ratio: 0.5,
        y_ratio: 0.22,
        is_active: true,
      },
    ],
    ai_suggestion:
      "Add `errorBuilder` to `Image.network` or use `CachedNetworkImage` with a placeholder fallback widget.",
    target_widget: "lib/features/profile/widgets/user_avatar.dart",
  },
];

// ============================================================================
// 3. Remote Server Proxy Logic
// ============================================================================

async function forwardToRemoteMcp(method: string, params: any) {
  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  };

  const res = await fetch(ENDPOINT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`SnappySnag remote MCP error (HTTP ${res.status}): ${errorBody || res.statusText}`);
  }

  const json: any = await res.json();
  if (json.error) {
    throw new Error(json.error.message || `MCP Error: ${JSON.stringify(json.error)}`);
  }

  return json.result;
}

// ============================================================================
// 4. MCP Server Definition & Handlers
// ============================================================================

const server = new Server(
  {
    name: "snappysnag",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tools Manifest
const TOOLS = [
  {
    name: "get_latest_feedback",
    description:
      "Fetch the most recent in-app bug report or user feedback from SnappySnag, including screenshot, visual pin annotations, screen name, device metadata, and AI fix prompts.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "resolved", "ignored", "all"],
          description: "Filter by status before picking the latest item. Defaults to 'open'.",
        },
        include_screenshot: {
          type: "boolean",
          description: "Whether to include the screenshot image in the response. Defaults to true.",
        },
      },
    },
  },
  {
    name: "list_feedbacks",
    description:
      "List and search feedback / bug reports in the SnappySnag project. Returns lightweight summaries (ID, title, status, severity, active pin count, screen category, created_at).",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "resolved", "ignored", "all"],
          description: "Filter by feedback status. Defaults to 'open'.",
        },
        severity: {
          type: "string",
          enum: ["high", "medium", "low", "unassessed", "all"],
          description: "Filter by severity level. Defaults to 'all'.",
        },
        source: {
          type: "string",
          enum: ["user", "dev", "all"],
          description: "Filter by submission mode ('user' for live end-users, 'dev' for internal QA). Defaults to 'all'.",
        },
        keyword: {
          type: "string",
          description: "Optional search keyword to match against pin comments or user memo.",
        },
        limit: {
          type: "number",
          description: "Maximum number of items to return (1 to 30). Defaults to 10.",
        },
      },
    },
  },
  {
    name: "get_feedback_detail",
    description:
      "Fetch the full details of a specific feedback item by its ID, including active pin annotations, Flutter widget hierarchy, developer notes, AI fix prompt, and screenshot image.",
    inputSchema: {
      type: "object",
      properties: {
        feedback_id: {
          type: "string",
          description: "The UUID of the feedback item to retrieve.",
        },
        include_screenshot: {
          type: "boolean",
          description: "Whether to include the screenshot image in the response. Defaults to true.",
        },
      },
      required: ["feedback_id"],
    },
  },
  {
    name: "update_feedback_status",
    description:
      "Update the status of a feedback ticket (e.g., mark as 'resolved' after fixing the bug in your codebase, or 'ignored'), and optionally attach an internal developer resolution note.",
    inputSchema: {
      type: "object",
      properties: {
        feedback_id: {
          type: "string",
          description: "The UUID of the feedback item to update.",
        },
        status: {
          type: "string",
          enum: ["open", "resolved", "ignored"],
          description: "The new status to set ('resolved', 'ignored', or 'open').",
        },
        comment: {
          type: "string",
          description:
            "Optional summary of what was fixed or investigated (e.g., 'Fixed bottom overflow in CartCheckoutScreen').",
        },
      },
      required: ["feedback_id", "status"],
    },
  },
];

// Handler: List Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handler: Call Tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // 1. Live Mode: Forward to SnappySnag Remote Endpoint
  if (!isDemoMode) {
    try {
      return await forwardToRemoteMcp("tools/call", { name, arguments: args });
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `SnappySnag Remote MCP Error: ${err.message}`,
          },
        ],
      };
    }
  }

  // 2. Demo Mode Handlers
  if (name === "get_latest_feedback") {
    const item = DEMO_FEEDBACK_ITEMS[0];
    const textOutput = `
${DEMO_ONBOARDING_NOTE}

=== Latest Feedback: ${item.id} ===
Title: ${item.title}
Status: ${item.status.toUpperCase()} | Severity: ${item.severity.toUpperCase()} | Source: ${item.source}
Screen: ${item.screen_category} (State: ${item.state_signature})
Target Widget: ${item.target_widget}
Device: ${item.device_model} (${item.os_name} ${item.os_version})

Active Pins (${item.pins.length}):
${item.pins.map((p) => `  [Pin #${p.number}] (x: ${p.x_ratio}, y: ${p.y_ratio}): ${p.comment}`).join("\n")}

User Memo:
${item.user_memo}

AI Technical Resolution Guide:
${item.ai_suggestion}
`.trim();

    return {
      content: [
        {
          type: "text",
          text: textOutput,
        },
      ],
    };
  }

  if (name === "list_feedbacks") {
    const textOutput = `
${DEMO_ONBOARDING_NOTE}

=== SnappySnag Demo Feedbacks (${DEMO_FEEDBACK_ITEMS.length} tickets) ===
${DEMO_FEEDBACK_ITEMS.map(
  (f) =>
    `• [${f.id}] [${f.status.toUpperCase()}] [${f.severity.toUpperCase()}] ${f.title}\n   Screen: ${f.screen_category} | Device: ${f.device_model} | Pins: ${f.active_pin_count}`
).join("\n\n")}
`.trim();

    return {
      content: [
        {
          type: "text",
          text: textOutput,
        },
      ],
    };
  }

  if (name === "get_feedback_detail") {
    const fbId = args?.feedback_id as string;
    const item = DEMO_FEEDBACK_ITEMS.find((f) => f.id === fbId) || DEMO_FEEDBACK_ITEMS[0];

    const textOutput = `
${DEMO_ONBOARDING_NOTE}

=== Feedback Detail: ${item.id} ===
Title: ${item.title}
Status: ${item.status.toUpperCase()} | Severity: ${item.severity.toUpperCase()}
Screen Class: ${item.screen_category}
Target File: ${item.target_widget}
Device: ${item.device_model} (${item.os_name} ${item.os_version})

Active Pins (${item.pins.length}):
${item.pins.map((p) => `  • Pin #${p.number}: "${p.comment}" (Pos: ${p.x_ratio}, ${p.y_ratio})`).join("\n")}
${(item as any).breadcrumbs && (item as any).breadcrumbs.length > 0 ? `\nUser Breadcrumbs (${(item as any).breadcrumbs.length} steps):\n${(item as any).breadcrumbs.map((b: any, idx: number) => `  ${idx + 1}. [${b.category}] ${b.message}`).join("\n")}\n` : ""}
AI Suggested Fix:
${item.ai_suggestion}
`.trim();

    return {
      content: [
        {
          type: "text",
          text: textOutput,
        },
      ],
    };
  }

  if (name === "update_feedback_status") {
    const fbId = (args?.feedback_id as string) || "demo-fb-001";
    const status = (args?.status as string) || "resolved";
    const comment = (args?.comment as string) || "Bug addressed in codebase";

    return {
      content: [
        {
          type: "text",
          text: `
${DEMO_ONBOARDING_NOTE}

✅ [Demo Mode] Successfully updated ticket ${fbId} to "${status}".
Resolution note recorded: "${comment}".
(In live mode, this status and note are synchronized to your SnappySnag Dashboard and team members.)
`.trim(),
        },
      ],
    };
  }

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `Unknown tool: ${name}`,
      },
    ],
  };
});

// ============================================================================
// 5. Start Server via Stdio Transport
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error starting SnappySnag MCP server:", error);
  process.exit(1);
});
