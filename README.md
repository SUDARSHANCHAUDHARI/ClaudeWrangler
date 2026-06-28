# 🤠 ClaudeWrangler

> Wrangle Claude Code from your menu bar.  
> Whip it into shape. Praise it when it delivers. Fire it when it doesn't.

Inspired by [badclaude](https://github.com/GitFrog1111/badclaude) — rebuilt from scratch with proper architecture, persistent stats, global shortcuts, and a full settings panel.

---

## Install

```bash
npm install -g claudewrangler
claudewrangler
```

Or run locally:

```bash
git clone https://github.com/SUDARSHANCHAUDHARI/claudewrangler
cd claudewrangler
npm install
npm start
```

---

## What It Does

Look for the **🤠** icon in your system tray / menu bar.

| Action | Shortcut | What Happens |
|--------|----------|-------------|
| 🔴 **Whip Claude** | `Ctrl+Shift+W` | Sends `SIGINT` to interrupt Claude Code + shows harsh message |
| 🟡 **Praise Claude** | `Ctrl+Shift+P` | Types an encouraging message into your active terminal |
| ⚫ **Fire Claude** | `Ctrl+Shift+F` | `SIGKILL` — kills Claude Code process entirely |
| 📊 **Dashboard** | tray menu | Stats, action history, quick-action buttons |
| ⚙️ **Settings** | tray menu | Customize everything |

**Left-click** the tray icon = configurable (default: Whip).  
**Right-click** = full context menu.

---

## Features

### 🔴 Whip
Sends `SIGINT` (Ctrl-C) to all running Claude Code processes to interrupt the current task without killing it. Useful when Claude is stuck in a loop or going in the wrong direction.

### 🟡 Praise
Types an encouraging message directly into your active terminal. On macOS it targets iTerm2 or Terminal.app. On Linux it uses `xdotool`. On Windows it uses clipboard paste.

### ⚫ Fire
Sends `SIGKILL` to all Claude Code processes, terminating them immediately. The nuclear option.

### 📊 Dashboard
- Live stats: whips / praises / fires
- Session count and first-used date
- Full action history (last 100) with timestamps
- Quick-action buttons to trigger any action without touching the tray
- Reset stats button

### ⚙️ Settings
- **Left-click action** — configure what tray click does (whip / praise / fire / show menu)
- **Overlay position** — bottom-center / top-center / bottom-right / top-right
- **Overlay duration** — 2 / 3 / 5 / 8 seconds
- **Sound effects** toggle *(coming soon)*
- **Global shortcuts** — fully customizable keyboard shortcuts
- **Start at login** — launch with your OS

### 🔍 Smart Claude Detection
ClaudeWrangler finds Claude Code by scanning running processes — not just looking for a hardcoded binary name. It detects `@anthropic-ai/claude-code` and related node processes, and shows live status in the tray menu.

---

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS | ✅ Full | Template icon for dark/light mode, iTerm2 + Terminal support |
| Linux | ✅ Full | Requires `xdotool` for Praise |
| Windows | ✅ Full | PowerShell clipboard paste for Praise |

**Linux — install xdotool for Praise:**
```bash
sudo apt install xdotool      # Debian/Ubuntu
sudo pacman -S xdotool        # Arch
sudo dnf install xdotool      # Fedora
```

---

## Build from Source

```bash
npm run build:mac    # → dist/*.dmg  (arm64 + x64)
npm run build:win    # → dist/*.exe  (NSIS installer)
npm run build:linux  # → dist/*.AppImage + *.deb
npm run build:all    # → all platforms
```

**Regenerate placeholder icons:**
```bash
node assets/icons/generate.js
```
Replace the generated PNGs with proper 22×22 designed icons before shipping.

---

## Project Structure

```
claudewrangler/
├── src/
│   ├── main/
│   │   ├── index.js       ← App entry, lifecycle, IPC hub
│   │   ├── tray.js        ← Tray icon + context menu
│   │   ├── windows.js     ← Window factory (overlay / dashboard / settings)
│   │   ├── actions.js     ← Whip / Praise / Fire logic
│   │   ├── shortcuts.js   ← Global keyboard shortcuts
│   │   ├── store.js       ← Persistent storage (electron-store)
│   │   ├── process.js     ← Claude Code process detection & control
│   │   └── preload.js     ← Context bridge (main ↔ renderer)
│   └── renderer/
│       ├── overlay/       ← Toast notification (frameless, non-interactive)
│       ├── dashboard/     ← Stats + history + quick actions
│       └── settings/      ← Settings panel
├── assets/
│   ├── icons/             ← Tray icons (tray, whip, praise, fire)
│   └── sounds/            ← Sound effects (coming soon)
├── bin/
│   └── claudewrangler.js  ← CLI entry point (npm -g)
├── package.json
└── README.md
```

---

## Roadmap

- [x] v1 — Whip, Praise, Fire with overlay
- [x] v1 — Proper architecture, persistent stats, shortcuts, settings
- [ ] Sound effects (whip crack, applause, door slam)
- [ ] Rage mode — rapid whipping triggers screen shake effect
- [ ] Weekly performance report notification
- [ ] Custom messages — add your own lines per action
- [ ] Claude status polling — detect when Claude finishes a task
- [ ] Cease and desist letter from Anthropic

---

## Author

Built by **Sudarshan Chaudhari** — SudarshanTechLabs.  
[github.com/SUDARSHANCHAUDHARI](https://github.com/SUDARSHANCHAUDHARI)

---

## License

MIT — wrangle responsibly.
