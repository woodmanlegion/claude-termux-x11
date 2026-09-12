#!/usr/bin/env bash
# install.sh — set up termux-x11 on this machine.
# Copies all artifacts to ~/.config/termux-x11/ so the repo can be removed after install.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$HOME/.config/termux-x11"
MCP_INSTALL_DIR="$CONFIG_DIR/mcp-server"

echo "[termux-x11] installing..."

# 1. Config
mkdir -p "$CONFIG_DIR"
if [[ ! -f "$CONFIG_DIR/config.yaml" ]]; then
  cp "$REPO_DIR/config.yaml.example" "$CONFIG_DIR/config.yaml"
  echo "[termux-x11] wrote default config to $CONFIG_DIR/config.yaml"
else
  echo "[termux-x11] config already exists, skipping"
fi

# 2. Bin scripts
mkdir -p "$CONFIG_DIR/bin"
for f in "$REPO_DIR/bin"/x11-*; do
  cp "$f" "$CONFIG_DIR/bin/"
  chmod +x "$CONFIG_DIR/bin/$(basename "$f")"
done
echo "[termux-x11] installed bin scripts to $CONFIG_DIR/bin/"

# 3. MCP server — copy to config dir, install deps there
mkdir -p "$MCP_INSTALL_DIR"
cp "$REPO_DIR/mcp-server/index.js"    "$MCP_INSTALL_DIR/"
cp "$REPO_DIR/mcp-server/package.json" "$MCP_INSTALL_DIR/"
if command -v npm &>/dev/null; then
  npm install --silent --prefix "$MCP_INSTALL_DIR"
  echo "[termux-x11] mcp-server installed to $MCP_INSTALL_DIR"
else
  echo "[termux-x11] WARNING: npm not found — run: npm install --prefix $MCP_INSTALL_DIR"
fi

# 4. Register MCP server with Claude Code (points to config dir, not repo)
if command -v claude &>/dev/null; then
  claude mcp add --scope user termux-x11 node "$MCP_INSTALL_DIR/index.js" 2>&1 \
    | sed 's/^/[termux-x11] /'
else
  echo "[termux-x11] WARNING: claude CLI not found — register manually with:"
  echo "  claude mcp add --scope user termux-x11 node $MCP_INSTALL_DIR/index.js"
fi

echo "[termux-x11] done. Repo can now be removed — all artifacts are in $CONFIG_DIR"
echo "[termux-x11] Restart Claude Code to pick up the MCP server."
