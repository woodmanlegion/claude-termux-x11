import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";

const execFileP = promisify(execFile);

// ── Config ────────────────────────────────────────────────────────────────────

const CONFIG_PATH = resolve(process.env.HOME, ".config/termux-x11/config.yaml");
let cfg = { core: {}, openclaw: {} };
if (existsSync(CONFIG_PATH)) {
  cfg = yaml.load(readFileSync(CONFIG_PATH, "utf8")) ?? cfg;
}

const DISPLAY   = cfg.core?.display         ?? process.env.X11_DISPLAY ?? ":1";
const BIN_DIR   = (cfg.core?.bin_dir        ?? "~/.config/termux-x11/bin").replace(/^~/, process.env.HOME);
const SHOT_DIR  = (cfg.core?.screenshot_dir ?? "/tmp/x11-shots").replace(/^~/, process.env.HOME);
const SHOT_MODE = cfg.openclaw?.screenshot_return ?? "base64";

function bin(name) { return resolve(BIN_DIR, name); }
function env() { return { ...process.env, X11_DISPLAY: DISPLAY, X11_SCREENSHOT_DIR: SHOT_DIR }; }

function textResult(text) {
  return { content: [{ type: "text", text: String(text) }], details: text };
}
function jsonResult(obj) {
  return textResult(JSON.stringify(obj, null, 2));
}

// ── Tool schemas (plain JSON Schema) ─────────────────────────────────────────

const EMPTY   = { type: "object", properties: {}, additionalProperties: false };
const CLICK   = { type: "object", required: ["x", "y"], additionalProperties: false, properties: {
  x:      { type: "number", description: "X coordinate in pixels" },
  y:      { type: "number", description: "Y coordinate in pixels" },
  button: { type: "number", description: "Mouse button: 1=left 2=middle 3=right. Default: 1" }
}};
const TYPE_S  = { type: "object", required: ["text"], additionalProperties: false, properties: {
  text:  { type: "string", description: "Text to type" },
  delay: { type: "number", description: "Delay between keystrokes in ms. Default: 12" }
}};
const KEY_S   = { type: "object", required: ["key"], additionalProperties: false, properties: {
  key:    { type: "string", description: "Key name or combination (xdotool key syntax)" },
  window: { type: "string", description: "Window ID or name to target (omit for focused window)" }
}};
const WIN_S   = { type: "object", additionalProperties: false, properties: {
  focus: { type: "string", description: "Window ID or name to focus" }
}};

// ── Plugin ────────────────────────────────────────────────────────────────────

export default definePluginEntry({
  id: "termux-x11",
  name: "Termux X11",
  description: "X11/VNC desktop control tools — screenshot, click, type, key, window management",

  register(api) {
    api.registerTool({
      name: "x11_screenshot",
      label: "X11 Screenshot",
      description: "Capture a screenshot of the X11 display. Returns a base64-encoded image or file path depending on config.",
      parameters: EMPTY,
      execute: async () => {
        const flags = SHOT_MODE === "base64" ? ["--base64"] : [];
        const { stdout } = await execFileP(bin("x11-screenshot"), flags, { env: env(), maxBuffer: 10 * 1024 * 1024 });
        return jsonResult({ result: stdout.trim(), mode: SHOT_MODE });
      }
    });

    api.registerTool({
      name: "x11_click",
      label: "X11 Click",
      description: "Send a mouse click at the specified X11 screen coordinates.",
      parameters: CLICK,
      execute: async (_id, { x, y, button = 1 }) => {
        const { stdout } = await execFileP(bin("x11-click"), ["--button", String(button), String(x), String(y)], { env: env() });
        return jsonResult({ result: stdout.trim() });
      }
    });

    api.registerTool({
      name: "x11_type",
      label: "X11 Type",
      description: "Type text into the focused X11 window using keyboard simulation.",
      parameters: TYPE_S,
      execute: async (_id, { text, delay = 12 }) => {
        const { stdout } = await execFileP(bin("x11-type"), ["--delay", String(delay), text], { env: env() });
        return jsonResult({ result: stdout.trim() });
      }
    });

    api.registerTool({
      name: "x11_key",
      label: "X11 Key",
      description: "Send a key or combination to a window (xdotool key syntax, e.g. 'ctrl+l', 'Return', 'Escape').",
      parameters: KEY_S,
      execute: async (_id, { key: k, window }) => {
        const flags = window ? ["--window", window, k] : [k];
        const { stdout } = await execFileP(bin("x11-key"), flags, { env: env() });
        return jsonResult({ result: stdout.trim() });
      }
    });

    api.registerTool({
      name: "x11_windows",
      label: "X11 Windows",
      description: "List open X11 windows. Optionally focus a specific window by ID or name.",
      parameters: WIN_S,
      execute: async (_id, { focus } = {}) => {
        const flags = focus ? ["--focus", focus] : [];
        const { stdout } = await execFileP(bin("x11-windows"), flags, { env: env() });
        return jsonResult({ result: stdout.trim() });
      }
    });
  }
});
