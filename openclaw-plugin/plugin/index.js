import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { Type } from "typebox";
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

// ── Plugin ────────────────────────────────────────────────────────────────────

export default defineToolPlugin({
  id: "termux-x11",
  name: "Termux X11",
  description: "X11/VNC desktop control tools — screenshot, click, type, key, window management",

  tools: (tool) => [
    tool({
      name: "x11_screenshot",
      label: "X11 Screenshot",
      description: "Capture a screenshot of the X11 display. Returns a base64-encoded image or a file path depending on config.",
      parameters: Type.Object({}),
      execute: async () => {
        const flags = SHOT_MODE === "base64" ? ["--base64"] : [];
        const { stdout } = await execFileP(bin("x11-screenshot"), flags, { env: env(), maxBuffer: 10 * 1024 * 1024 });
        return { result: stdout.trim(), mode: SHOT_MODE };
      }
    }),

    tool({
      name: "x11_click",
      label: "X11 Click",
      description: "Send a mouse click at the specified X11 screen coordinates.",
      parameters: Type.Object({
        x: Type.Number({ description: "X coordinate in pixels" }),
        y: Type.Number({ description: "Y coordinate in pixels" }),
        button: Type.Optional(Type.Number({ description: "Mouse button: 1=left 2=middle 3=right. Default: 1" }))
      }),
      execute: async ({ x, y, button = 1 }) => {
        const { stdout } = await execFileP(bin("x11-click"), ["--button", String(button), String(x), String(y)], { env: env() });
        return { result: stdout.trim() };
      }
    }),

    tool({
      name: "x11_type",
      label: "X11 Type",
      description: "Type text into the focused X11 window using keyboard simulation.",
      parameters: Type.Object({
        text: Type.String({ description: "Text to type" }),
        delay: Type.Optional(Type.Number({ description: "Delay between keystrokes in ms. Default: 12" }))
      }),
      execute: async ({ text, delay = 12 }) => {
        const { stdout } = await execFileP(bin("x11-type"), ["--delay", String(delay), text], { env: env() });
        return { result: stdout.trim() };
      }
    }),

    tool({
      name: "x11_key",
      label: "X11 Key",
      description: "Send a key or combination to a window (xdotool key syntax, e.g. 'ctrl+l', 'Return', 'Escape').",
      parameters: Type.Object({
        key: Type.String({ description: "Key name or combination" }),
        window: Type.Optional(Type.String({ description: "Window ID or name to target (omit for focused window)" }))
      }),
      execute: async ({ key: k, window }) => {
        const flags = window ? ["--window", window, k] : [k];
        const { stdout } = await execFileP(bin("x11-key"), flags, { env: env() });
        return { result: stdout.trim() };
      }
    }),

    tool({
      name: "x11_windows",
      label: "X11 Windows",
      description: "List open X11 windows. Optionally focus a specific window by ID or name.",
      parameters: Type.Object({
        focus: Type.Optional(Type.String({ description: "Window ID or name to focus" }))
      }),
      execute: async ({ focus } = {}) => {
        const flags = focus ? ["--focus", focus] : [];
        const { stdout } = await execFileP(bin("x11-windows"), flags, { env: env() });
        return { result: stdout.trim() };
      }
    })
  ]
});
