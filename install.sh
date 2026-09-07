#!/usr/bin/env bash
# install.sh — set up claude-termux-x11 on this machine.
# Installs bin scripts, writes config, registers the MCP server with Claude Code.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$HOME/.config/claude-termux-x11"

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
if command -v claude &>/dev/null; then
  claude mcp add --scope user claude-termux-x11 node "$REPO_DIR/mcp-server/index.js" 2>&1 \
    | sed 's/^/[claude-termux-x11] /'
else
  echo "[claude-termux-x11] WARNING: claude CLI not found — register manually with:"
  echo "  claude mcp add --scope user claude-termux-x11 node $REPO_DIR/mcp-server/index.js"
fi

echo "[claude-termux-x11] done. Restart Claude Code to pick up the MCP server."
echo "[claude-termux-x11] openclaw plugin: symlink or copy openclaw-plugin/plugin/ into your openclaw plugin load path."
