#!/usr/bin/env bash
# install.sh — set up termux-x11 on this machine.
# Copies all artifacts to ~/.config/termux-x11/ so the repo can be removed after install.
#
# Flags:
#   --mcp       Install Claude Code MCP adapter (default: yes)
#   --openclaw  Install openclaw skill adapter
#   --all       Install all adapters
#   --no-mcp    Skip MCP adapter
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$HOME/.config/termux-x11"
MCP_INSTALL_DIR="$CONFIG_DIR/mcp-server"
OPENCLAW_SKILL_DIR="$HOME/.openclaw/workspace/skills/termux-x11"

INSTALL_MCP=1
INSTALL_OPENCLAW=0

for arg in "$@"; do
  case "$arg" in
    --openclaw) INSTALL_OPENCLAW=1 ;;
    --no-mcp)   INSTALL_MCP=0 ;;
    --all)      INSTALL_MCP=1; INSTALL_OPENCLAW=1 ;;
  esac
done

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

# 3. MCP server (Claude Code adapter)
if [[ "$INSTALL_MCP" -eq 1 ]]; then
  mkdir -p "$MCP_INSTALL_DIR"
  cp "$REPO_DIR/mcp-server/index.js"    "$MCP_INSTALL_DIR/"
  cp "$REPO_DIR/mcp-server/package.json" "$MCP_INSTALL_DIR/"
  if command -v npm &>/dev/null; then
    npm install --silent --prefix "$MCP_INSTALL_DIR"
    echo "[termux-x11] mcp-server installed to $MCP_INSTALL_DIR"
  else
    echo "[termux-x11] WARNING: npm not found — run: npm install --prefix $MCP_INSTALL_DIR"
  fi

  if command -v claude &>/dev/null; then
    claude mcp add --scope user termux-x11 node "$MCP_INSTALL_DIR/index.js" 2>&1 \
      | sed 's/^/[termux-x11] /'
  else
    echo "[termux-x11] WARNING: claude CLI not found — register manually with:"
    echo "  claude mcp add --scope user termux-x11 node $MCP_INSTALL_DIR/index.js"
  fi
fi

# 4. openclaw skill adapter
if [[ "$INSTALL_OPENCLAW" -eq 1 ]]; then
  mkdir -p "$OPENCLAW_SKILL_DIR/plugin"
  cp "$REPO_DIR/openclaw-plugin/SKILL.md" "$OPENCLAW_SKILL_DIR/"
  cp "$REPO_DIR/openclaw-plugin/plugin/index.js"              "$OPENCLAW_SKILL_DIR/plugin/"
  cp "$REPO_DIR/openclaw-plugin/plugin/package.json"          "$OPENCLAW_SKILL_DIR/plugin/"
  cp "$REPO_DIR/openclaw-plugin/plugin/openclaw.plugin.json"  "$OPENCLAW_SKILL_DIR/plugin/"
  if command -v npm &>/dev/null; then
    npm install --silent --prefix "$OPENCLAW_SKILL_DIR/plugin"
    echo "[termux-x11] openclaw skill installed to $OPENCLAW_SKILL_DIR"
  else
    echo "[termux-x11] WARNING: npm not found — run: npm install --prefix $OPENCLAW_SKILL_DIR/plugin"
  fi
fi

echo "[termux-x11] done. Repo can now be removed — all artifacts are in $CONFIG_DIR"
if [[ "$INSTALL_MCP" -eq 1 ]]; then
  echo "[termux-x11] Restart Claude Code to pick up the MCP server."
fi
if [[ "$INSTALL_OPENCLAW" -eq 1 ]]; then
  echo "[termux-x11] Restart openclaw to pick up the skill plugin."
fi
