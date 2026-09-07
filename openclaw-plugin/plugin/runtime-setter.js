// openclaw runtime-setter for claude-termux-x11.
// Registers x11 tools with the openclaw agent tool registry.
// Skeleton — implementation pending confirmation of plugin SDK tool-registration API.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";

const execFileP = promisify(execFile);

// ── Config ────────────────────────────────────────────────────────────────────

const CONFIG_PATH = resolve(process.env.HOME, ".config/claude-termux-x11/config.yaml");
let cfg = { core: {}, openclaw: {} };
if (existsSync(CONFIG_PATH)) {
  cfg = yaml.load(readFileSync(CONFIG_PATH, "utf8")) ?? cfg;
}

const DISPLAY   = cfg.core?.display          ?? process.env.X11_DISPLAY ?? ":1";
const BIN_DIR   = (cfg.core?.bin_dir         ?? "~/.config/claude-termux-x11/bin").replace(/^~/, process.env.HOME);
const SHOT_DIR  = (cfg.core?.screenshot_dir  ?? "/tmp/x11-shots").replace(/^~/, process.env.HOME);
const SHOT_MODE = cfg.openclaw?.screenshot_return ?? "path";

function bin(name) { return resolve(BIN_DIR, name); }
function env() { return { ...process.env, X11_DISPLAY: DISPLAY, X11_SCREENSHOT_DIR: SHOT_DIR }; }

// ── Tool implementations ──────────────────────────────────────────────────────

export async function screenshot() {
  const flags = SHOT_MODE === "base64" ? ["--base64"] : [];
  const { stdout } = await execFileP(bin("x11-screenshot"), flags, { env: env(), maxBuffer: 10 * 1024 * 1024 });
  return { result: stdout.trim(), mode: SHOT_MODE };
}

export async function click({ x, y, button = 1 }) {
  const { stdout } = await execFileP(bin("x11-click"), ["--button", String(button), String(x), String(y)], { env: env() });
  return { result: stdout.trim() };
}

export async function type({ text, delay = 12 }) {
  const { stdout } = await execFileP(bin("x11-type"), ["--delay", String(delay), text], { env: env() });
  return { result: stdout.trim() };
}

export async function key({ key: k, window }) {
  const flags = window ? ["--window", window, k] : [k];
  const { stdout } = await execFileP(bin("x11-key"), flags, { env: env() });
  return { result: stdout.trim() };
}

export async function windows({ focus } = {}) {
  const flags = focus ? ["--focus", focus] : [];
  const { stdout } = await execFileP(bin("x11-windows"), flags, { env: env() });
  return { result: stdout.trim() };
}

// ── Plugin registration (TODO) ────────────────────────────────────────────────
// Replace this block once openclaw 7.1-2 plugin SDK tool-registration API is confirmed.
// Expected shape (based on termux-sms-channel pattern):
//
// registerPluginTool({ name: "x11_screenshot", description: "...", handler: screenshot });
// registerPluginTool({ name: "x11_click",      description: "...", handler: click });
// registerPluginTool({ name: "x11_type",       description: "...", handler: type });
// registerPluginTool({ name: "x11_key",        description: "...", handler: key });
// registerPluginTool({ name: "x11_windows",    description: "...", handler: windows });

export default { screenshot, click, type, key, windows };
