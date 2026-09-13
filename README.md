# termux-x11

X11/VNC desktop control for Claude Code and openclaw agents on Android/Termux (and Linux).

Provides `xdotool` + `scrot` based tools — screenshot, click, type, key combos, window management — via two adapters from a shared core:

| Adapter | Consumer |
|---------|---------|
| `mcp-server/` | Claude Code CLI (stdio MCP server) |
| `openclaw-plugin/` | openclaw SMS agent (plugin tool registry) |

## Requirements

- `xdotool`
- `scrot`
- Node.js ≥ 18
- A running X11 display (default `:1`)

## Install

```bash
git clone https://github.com/woodmanlegion/termux-x11
cd termux-x11
bash install.sh
```

`install.sh` will:
1. Write `~/.config/termux-x11/config.yaml` (from `config.yaml.example`) if not present
2. Install bin scripts to `~/.config/termux-x11/bin/`
3. Run `npm install` in `mcp-server/`
4. Register the MCP server in `~/.claude/mcp.json`

For the openclaw plugin, run `bash install.sh --openclaw` or symlink `openclaw-plugin/plugin/` into your openclaw plugin load path and add it to `openclaw.json`.

## Configuration

Edit `~/.config/termux-x11/config.yaml`:

```yaml
core:
  display: ":1"
  bin_dir: "~/.config/termux-x11/bin"
  screenshot_dir: "/tmp/x11-shots"

mcp:
  screenshot_return: base64   # base64 | path

openclaw:
  screenshot_return: path     # path | base64
  plugin_path: "~/.openclaw/workspace/skills/termux-x11"
```

## Tools

| Tool | Description |
|------|-------------|
| `x11_screenshot` | Screenshot the X11 display |
| `x11_click` | Click at (x, y) |
| `x11_type` | Type text into focused window |
| `x11_key` | Send key combo (e.g. `ctrl+l`, `Return`) |
| `x11_windows` | List visible windows or focus one by name |

## Status

- `bin/` — complete
- `mcp-server/` — complete
- `openclaw-plugin/` — complete
