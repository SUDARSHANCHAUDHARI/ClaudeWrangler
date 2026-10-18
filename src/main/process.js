"use strict";

/**
 * process.js — Claude Code process detection & control.
 * Cross-platform: macOS, Linux, Windows.
 */

const { execSync, exec } = require("child_process");

const PLATFORM = process.platform;

// ── Process detection ─────────────────────────────────────────────────────────

/**
 * Find all PIDs of running Claude Code processes.
 * @returns {number[]} array of PIDs
 */
function findClaudePIDs() {
  try {
    if (PLATFORM === "win32") {
      return findPIDsWindows();
    } else {
      return findPIDsUnix();
    }
  } catch (_) {
    return [];
  }
}

/**
 * True only for the Claude Code CLI: the executable (argv[0]) is named
 * `claude`/`claude.exe`, or node is running the @anthropic-ai/claude-code package.
 * Case-sensitive on macOS/Linux so the Claude desktop app (`.../MacOS/Claude`) never matches.
 * Windows paths are case-insensitive, so that branch lowercases and instead excludes the
 * desktop app by its install folder and Electron helpers by `--type=`.
 * shortcut: unquoted argv[0] paths containing spaces (ps output) are not matched, upgrade to `ps -o comm=` if needed.
 * shortcut: desktop-app exclusion knows only the AnthropicClaude and WindowsApps folders, extend if it installs elsewhere.
 */
function isClaudeCodeCommand(command, windows = PLATFORM === "win32") {
  const cmd = windows ? command.trim().toLowerCase() : command.trim();
  // Windows quotes argv[0] when its path has spaces ("C:\Program Files\nodejs\node.exe")
  const tokens = (cmd.match(/"[^"]*"|\S+/g) || []).map((t) => t.replace(/"/g, ""));
  const [exe = "", script = ""] = tokens;
  const name = exe.split(/[\\/]/).pop();
  const isNode = name === "node" || name === "node.exe";
  if (isNode) return script.replace(/\\/g, "/").includes("@anthropic-ai/claude-code/");
  if (name === "claude") return true;
  if (name !== "claude.exe") return false;
  if (!windows) return true;
  const isDesktopApp = /\\(anthropicclaude|windowsapps)\\/.test(exe) || tokens.some((t) => t.startsWith("--type="));
  return !isDesktopApp;
}

function findPIDsUnix() {
  const lines = execSync("ps aux", { encoding: "utf8", stdio: ["pipe","pipe","ignore"] })
    .split("\n");

  const pids = [];
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    // ps aux: 10 fixed columns, then the full command line
    if (isClaudeCodeCommand(parts.slice(10).join(" "))) {
      const pid = parseInt(parts[1]);
      if (!isNaN(pid)) pids.push(pid);
    }
  }
  return pids;
}

function findPIDsWindows() {
  const output = execSync(
    'wmic process get processid,commandline /format:list',
    { encoding: "utf8", stdio: ["pipe","pipe","ignore"] }
  );
  const pids = [];
  // /format:list prints CommandLine= then ProcessId= per process (lines end \r\r\n when piped)
  let commandLine = "";
  for (const line of output.split(/\r*\n/)) {
    if (line.startsWith("CommandLine=")) {
      commandLine = line.slice("CommandLine=".length);
    } else if (line.startsWith("ProcessId=")) {
      const pid = parseInt(line.slice("ProcessId=".length));
      if (!isNaN(pid) && isClaudeCodeCommand(commandLine, true)) pids.push(pid);
      commandLine = "";
    }
  }
  return pids;
}

/**
 * Check if Claude Code is currently running.
 */
function isClaudeRunning() {
  return findClaudePIDs().length > 0;
}

// ── Process control ───────────────────────────────────────────────────────────

/**
 * Send SIGINT (Ctrl-C) to all Claude Code processes.
 * This interrupts the current task without killing the process.
 */
function interrupt() {
  const pids = findClaudePIDs();
  let sent = 0;
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGINT");
      sent++;
    } catch (_) {}
  }

  return sent;
}

/**
 * Kill all Claude Code processes (SIGKILL).
 */
function kill() {
  const pids = findClaudePIDs();
  let killed = 0;

  for (const pid of pids) {
    try {
      if (PLATFORM === "win32") {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      } else {
        process.kill(pid, "SIGKILL");
      }
      killed++;
    } catch (_) {}
  }

  return killed;
}

/**
 * Type a message into the active terminal (for Praise mode).
 * macOS: AppleScript → Terminal/iTerm2
 * Linux: xdotool
 * Windows: clipboard paste via PowerShell
 */
function typeIntoTerminal(message) {
  const escaped = message.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  if (PLATFORM === "darwin") {
    // Try iTerm2 first, fallback to Terminal.app
    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
      end tell
      if frontApp contains "iTerm" then
        tell application "iTerm2"
          tell current session of current window
            write text "${escaped}"
          end tell
        end tell
      else
        tell application "Terminal"
          do script "${escaped}" in front window
        end tell
      end if
    `;
    exec(`osascript -e '${script.replace(/'/g, "'\\''")}' 2>/dev/null`, () => {});

  } else if (PLATFORM === "linux") {
    exec(
      `xdotool type --clearmodifiers --delay 20 '${message.replace(/'/g, "'\\''")}' 2>/dev/null`,
      () => {}
    );

  } else if (PLATFORM === "win32") {
    const ps = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Clipboard]::SetText("${escaped}")
      [System.Windows.Forms.SendKeys]::SendWait("^v")
      [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    `;
    exec(`powershell -NoProfile -NonInteractive -Command "${ps}"`, () => {});
  }
}

module.exports = {
  findClaudePIDs,
  isClaudeCodeCommand,
  isClaudeRunning,
  interrupt,
  kill,
  typeIntoTerminal,
};
