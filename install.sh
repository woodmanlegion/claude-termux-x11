#!/usr/bin/env bash
# install.sh — set up claude-termux-x11 on this machine.
# Installs bin scripts, writes config, registers the MCP server with Claude Code.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$HOME/.config/claude-termux-x11"
MCP_CONFIG="$HOME/.claude/mcp.json"

echo "[claude-termux-x11] installing..."

# 1. Create config dir and write example config if not present
mkdir -p "$CONFIG_DIR"
if [[ ! -f "$CONFIG_DIR/config.yaml" ]]; then
  cp "$REPO_DIR/config.yaml.example" "$CONFIG_DIR/config.yaml"
  echo "[claude-termux-x11] wrote default config to $CONFIG_DIR/config.yaml"
else
  echo "[claude-termux-x11] config already exists, skipping"
fi

# 2. Install bin scripts
mkdir -p "$CONFIG_DIR/bin"
for f in "$REPO_DIR/bin"/x11-*; do
  cp "$f" "$CONFIG_DIR/bin/"
  chmod +x "$CONFIG_DIR/bin/$(basename "$f")"
done
echo "[claude-termux-x11] installed bin scripts to $CONFIG_DIR/bin/"

# 3. Install MCP server deps
cd "$REPO_DIR/mcp-server"
if command -v npm &>/dev/null; then
  npm install --silent
  echo "[claude-termux-x11] mcp-server deps installed"
else
  echo "[claude-termux-x11] WARNING: npm not found — skipping mcp-server deps"
fi
cd "$REPO_DIR"

# 4. Register MCP server with Claude Code
mkdir -p "$(dirname "$MCP_CONFIG")"
if [[ ! -f "$MCP_CONFIG" ]]; then
  echo '{"mcpServers":{}}' > "$MCP_CONFIG"
fi

node - "$MCP_CONFIG" "$REPO_DIR/mcp-server/index.js" <<'EOF'
const fs = require("fs");
const path = process.argv[2];
const entry = process.argv[3];
const cfg = JSON.parse(fs.readFileSync(path, "utf8"));
cfg.mcpServers = cfg.mcpServers ?? {};
cfg.mcpServers["claude-termux-x11"] = {
  command: "node",
  args: [entry],
  env: {}
};
fs.writeFileSync(path, JSON.stringify(cfg, null, 2) + "\n");
console.log("[claude-termux-x11] registered MCP server in", path);
EOF

echo "[claude-termux-x11] done. Restart Claude Code to pick up the MCP server."
echo "[claude-termux-x11] openclaw plugin: symlink or copy openclaw-plugin/plugin/ into your openclaw plugin load path."
