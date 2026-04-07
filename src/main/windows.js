"use strict";

/**
 * windows.js — Creates and manages all BrowserWindows.
 *
 * Windows:
 *   overlay   — Toast notification (frameless, transparent, always-on-top, non-interactive)
 *   dashboard — Stats + history panel (can be left open)
 *   settings  — Settings panel
 */

const { BrowserWindow, screen } = require("electron");
const path = require("path");
const store = require("./store");

const RENDERER_DIR = path.join(__dirname, "..", "renderer");

let overlayWin   = null;
let dashboardWin = null;
let settingsWin  = null;
let overlayTimer = null;

// ── Overlay ───────────────────────────────────────────────────────────────────

function showOverlay({ mode, message, pidsFound, killed }) {
  // Dismiss existing overlay immediately
  if (overlayWin && !overlayWin.isDestroyed()) {
    clearTimeout(overlayTimer);
    overlayWin.close();
    overlayWin = null;
  }

  const settings = store.getSettings();
  const duration = settings.overlayDuration || 3000;
  const position = settings.overlayPosition || "bottom-center";

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const W = 540, H = 100;
  const MARGIN = 24;
  const coords = {
    "bottom-center": { x: Math.floor(width / 2 - W / 2), y: height - H - MARGIN },
    "top-center":    { x: Math.floor(width / 2 - W / 2), y: MARGIN },
    "bottom-right":  { x: width - W - MARGIN,              y: height - H - MARGIN },
    "top-right":     { x: width - W - MARGIN,              y: MARGIN },
  }[position] || { x: Math.floor(width / 2 - W / 2), y: height - H - MARGIN };

  overlayWin = new BrowserWindow({
    width: W, height: H,
    x: coords.x, y: coords.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    movable: false,
    hasShadow: false,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWin.loadFile(path.join(RENDERER_DIR, "overlay", "index.html"));
  overlayWin.setIgnoreMouseEvents(true);

  overlayWin.webContents.once("did-finish-load", () => {
    overlayWin.webContents.send("overlay:show", {
      mode, message,
      meta: { pidsFound, killed },
    });
  });

  overlayTimer = setTimeout(() => {
    if (overlayWin && !overlayWin.isDestroyed()) {
      overlayWin.webContents.send("overlay:hide");
      setTimeout(() => {
        if (overlayWin && !overlayWin.isDestroyed()) {
          overlayWin.close();
          overlayWin = null;
        }
      }, 400); // wait for fade-out animation
    }
  }, duration);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function showDashboard() {
  if (dashboardWin && !dashboardWin.isDestroyed()) {
    dashboardWin.focus();
    refreshDashboard();
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  dashboardWin = new BrowserWindow({
    width: 480, height: 620,
    x: Math.floor(width / 2 - 240),
    y: Math.floor(height / 2 - 310),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    vibrancy: "under-window",           // macOS frosted glass
    backgroundMaterial: "acrylic",      // Windows acrylic
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  dashboardWin.loadFile(path.join(RENDERER_DIR, "dashboard", "index.html"));

  dashboardWin.webContents.once("did-finish-load", () => {
    sendDashboardData();
  });

  dashboardWin.on("closed", () => { dashboardWin = null; });
}

function closeDashboard() {
  if (dashboardWin && !dashboardWin.isDestroyed()) dashboardWin.close();
}

function refreshDashboard() {
  if (dashboardWin && !dashboardWin.isDestroyed()) {
    sendDashboardData();
  }
}

function sendDashboardData() {
  if (!dashboardWin || dashboardWin.isDestroyed()) return;
  dashboardWin.webContents.send("dashboard:data", {
    stats:   store.getStats(),
    history: store.getHistory(),
    settings: store.getSettings(),
  });
}

// ── Settings ──────────────────────────────────────────────────────────────────

function showSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  settingsWin = new BrowserWindow({
    width: 440, height: 560,
    x: Math.floor(width / 2 - 220),
    y: Math.floor(height / 2 - 280),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    vibrancy: "under-window",
    backgroundMaterial: "acrylic",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWin.loadFile(path.join(RENDERER_DIR, "settings", "index.html"));

  settingsWin.webContents.once("did-finish-load", () => {
    settingsWin.webContents.send("settings:data", store.getSettings());
  });

  settingsWin.on("closed", () => {
    settingsWin = null;
    // Re-apply shortcuts after settings change
    require("./shortcuts").reinit();
  });
}

function closeSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.close();
}

module.exports = {
  showOverlay,
  showDashboard,
  closeDashboard,
  refreshDashboard,
  showSettings,
  closeSettings,
};
