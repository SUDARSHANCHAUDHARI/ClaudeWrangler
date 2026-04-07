"use strict";

/**
 * process.js — Claude Code process detection & control.
 * Cross-platform: macOS, Linux, Windows.
 */

const { execSync, exec } = require("child_process");

const PLATFORM = process.platform;

// Patterns that match Claude Code processes
const CLAUDE_PATTERNS = ["claude", "@anthropic-ai/claude-code", "claude-code"];

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

function findPIDsUnix() {
  const lines = execSync("ps aux", { encoding: "utf8", stdio: ["pipe","pipe","ignore"] })
    .split("\n");

  const pids = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    const matchesClaude = CLAUDE_PATTERNS.some((p) => lower.includes(p));
    // Exclude our own electron process
    const isUs = lower.includes("claudewrangler") || lower.includes("electron");
    if (matchesClaude && !isUs) {
      const parts = line.trim().split(/\s+/);
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
  const blocks = output.split("\r\n\r\n");
  for (const block of blocks) {
    const lower = block.toLowerCase();
    if (CLAUDE_PATTERNS.some((p) => lower.includes(p))) {
      const pidMatch = block.match(/ProcessId=(\d+)/i);
      if (pidMatch) pids.push(parseInt(pidMatch[1]));
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

  // Windows fallback
  if (PLATFORM === "win32" && sent === 0) {
    exec(
      'wmic process where "commandline like \'%claude%\'" call terminate',
      () => {}
    );
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
      process.kill(pid, "SIGKILL");
      killed++;
    } catch (_) {}
  }

  // Platform-level fallbacks
  if (PLATFORM === "darwin" || PLATFORM === "linux") {
    try {
      execSync("pkill -9 -f 'claude' 2>/dev/null || true");
    } catch (_) {}
  } else if (PLATFORM === "win32") {
    exec("taskkill /F /IM node.exe /FI \"WINDOWTITLE eq claude*\"", () => {});
    exec(
      'wmic process where "commandline like \'%claude%\'" delete',
      () => {}
    );
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
  isClaudeRunning,
  interrupt,
  kill,
  typeIntoTerminal,
};
