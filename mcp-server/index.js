#!/usr/bin/env node
// MCP server adapter for claude-termux-x11.
// Exposes x11-screenshot, x11-click, x11-type, x11-key, x11-windows as MCP tools.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";

const execFileP = promisify(execFile);

// ── Config ────────────────────────────────────────────────────────────────────

const CONFIG_PATH = resolve(process.env.HOME, ".config/claude-termux-x11/config.yaml");
let cfg = { core: {}, mcp: {} };
if (existsSync(CONFIG_PATH)) {
  cfg = yaml.load(readFileSync(CONFIG_PATH, "utf8")) ?? cfg;
}

const DISPLAY   = cfg.core?.display        ?? process.env.X11_DISPLAY ?? ":1";
const BIN_DIR   = (cfg.core?.bin_dir       ?? "~/.config/claude-termux-x11/bin").replace(/^~/, process.env.HOME);
const SHOT_DIR  = (cfg.core?.screenshot_dir ?? "/tmp/x11-shots").replace(/^~/, process.env.HOME);
const SHOT_MODE = cfg.mcp?.screenshot_return ?? "base64";

function bin(name) { return resolve(BIN_DIR, name); }
function env() { return { ...process.env, X11_DISPLAY: DISPLAY, X11_SCREENSHOT_DIR: SHOT_DIR }; }

// ── Tools ─────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "x11_screenshot",
    description: "Take a screenshot of the X11 desktop. Returns base64 PNG or file path per config.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "x11_click",
    description: "Click at (x, y) on the X11 desktop.",
    inputSchema: {
      type: "object",
      required: ["x", "y"],
      properties: {
        x: { type: "integer", description: "X coordinate" },
        y: { type: "integer", description: "Y coordinate" },
        button: { type: "integer", description: "Mouse button (default 1)", default: 1 },
      },
    },
  },
  {
    name: "x11_type",
    description: "Type text into the currently focused X11 window.",
    inputSchema: {
      type: "object",
      required: ["text"],
      properties: {
        text: { type: "string", description: "Text to type" },
        delay: { type: "integer", description: "Ms between keystrokes (default 12)", default: 12 },
      },
    },
  },
  {
    name: "x11_key",
    description: "Send a key or key combo (e.g. ctrl+l, Return, super+d).",
    inputSchema: {
      type: "object",
      required: ["key"],
      properties: {
        key: { type: "string", description: "Key combo string (xdotool format)" },
        window: { type: "string", description: "Target window ID (optional)" },
      },
    },
  },
  {
    name: "x11_windows",
    description: "List visible X11 windows or focus one by name.",
    inputSchema: {
      type: "object",
      properties: {
        focus: { type: "string", description: "Window name to focus (omit to list all)" },
      },
    },
  },
];

// ── Handler ───────────────────────────────────────────────────────────────────

async function callTool(name, args) {
  switch (name) {
    case "x11_screenshot": {
      const flags = SHOT_MODE === "base64" ? ["--base64"] : [];
      const { stdout } = await execFileP(bin("x11-screenshot"), flags, { env: env(), maxBuffer: 10 * 1024 * 1024 });
      if (SHOT_MODE === "base64") {
        return [{ type: "image", data: stdout.trim(), mimeType: "image/png" }];
      }
      return [{ type: "text", text: stdout.trim() }];
    }
    case "x11_click": {
      const { x, y, button = 1 } = args;
      const { stdout } = await execFileP(bin("x11-click"), ["--button", String(button), String(x), String(y)], { env: env() });
      return [{ type: "text", text: stdout.trim() }];
    }
    case "x11_type": {
      const { text, delay = 12 } = args;
      const { stdout } = await execFileP(bin("x11-type"), ["--delay", String(delay), text], { env: env() });
      return [{ type: "text", text: stdout.trim() }];
    }
    case "x11_key": {
      const { key, window } = args;
      const flags = window ? ["--window", window, key] : [key];
      const { stdout } = await execFileP(bin("x11-key"), flags, { env: env() });
      return [{ type: "text", text: stdout.trim() }];
    }
    case "x11_windows": {
      const { focus } = args ?? {};
      const flags = focus ? ["--focus", focus] : [];
      const { stdout } = await execFileP(bin("x11-windows"), flags, { env: env() });
      return [{ type: "text", text: stdout.trim() }];
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "claude-termux-x11", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    const content = await callTool(req.params.name, req.params.arguments ?? {});
    return { content };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
