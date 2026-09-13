# termux-x11 — openclaw skill

Gives openclaw agents direct control over the X11 desktop running in Termux (Xfce4 + TigerVNC).

## Tools

| Tool | Description |
|------|-------------|
| `x11_screenshot` | Capture the current X11 display as a base64 image (or file path) |
| `x11_click` | Mouse click at pixel coordinates |
| `x11_type` | Type text into the focused window |
| `x11_key` | Send a key or combination (xdotool syntax: `ctrl+l`, `Return`, `Escape`) |
| `x11_windows` | List open windows; optionally focus one by ID or name |

## Usage examples

```
# Navigate Chromium to a URL
x11_key key="ctrl+l"
x11_type text="https://example.com"
x11_key key="Return"
x11_screenshot
```

## Config

Config file: `~/.config/termux-x11/config.yaml`

```yaml
core:
  display: ":1"
  bin_dir: "~/.config/termux-x11/bin"
  screenshot_dir: "/tmp/x11-shots"

openclaw:
  screenshot_return: "base64"   # "base64" | "path"
```

`screenshot_return: "base64"` — image data inline in tool result (recommended for agents).  
`screenshot_return: "path"` — agent receives the file path; it must read or serve the file separately.

## Installation

Run the termux-x11 `install.sh --openclaw` from the repo, or copy the `openclaw-plugin/plugin/` directory to:

```
~/.openclaw/workspace/skills/termux-x11/plugin/
```

Then in `~/.openclaw/workspace/skills/termux-x11/` also place a `SKILL.md` (this file) so openclaw loads it into the agent's system prompt.

Run `npm install` in the plugin directory before first use.
