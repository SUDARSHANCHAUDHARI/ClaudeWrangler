"use strict";

const { app, ipcMain } = require("electron");
const path = require("path");

// ── Single instance lock ──────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ── Lazy-load modules after app is ready ─────────────────────────────────────
let trayManager   = null;
let windowManager = null;
let shortcutMgr   = null;
let store         = null;
let actions       = null;

app.whenReady().then(async () => {
  // macOS: hide from dock — we're a tray-only app
  if (process.platform === "darwin" && app.dock) {
    app.dock.hide();
  }

  // Init store first (other modules depend on it)
  store         = require("./store");
  actions       = require("./actions");
  trayManager   = require("./tray");
  windowManager = require("./windows");
  shortcutMgr   = require("./shortcuts");

  // Boot sequence
  store.init();
  trayManager.init();
  shortcutMgr.init();

  // Register IPC handlers (must happen before any window opens)
  registerIPC();
});

// ── Keep app alive even with all windows closed ───────────────────────────────
app.on("window-all-closed", (e) => e.preventDefault());

app.on("second-instance", () => {
  // If user launches again, just show dashboard
  windowManager && windowManager.showDashboard();
});

app.on("will-quit", () => {
  shortcutMgr && shortcutMgr.unregisterAll();
});

// ── IPC hub ──────────────────────────────────────────────────────────────────
function registerIPC() {
  const { ipcMain } = require("electron");

  // Actions triggered from renderer buttons (dashboard)
  ipcMain.on("action:whip",   () => actions.whip());
  ipcMain.on("action:praise", () => actions.praise());
  ipcMain.on("action:fire",   () => actions.fire());

  // Window controls
  ipcMain.on("window:close-dashboard",  () => windowManager.closeDashboard());
  ipcMain.on("window:close-settings",   () => windowManager.closeSettings());
  ipcMain.on("window:open-settings",    () => windowManager.showSettings());
  ipcMain.on("window:open-dashboard",   () => windowManager.showDashboard());

  // Store read/write
  ipcMain.handle("store:get",   (_e, key)        => store.get(key));
  ipcMain.handle("store:set",   (_e, key, value) => store.set(key, value));
  ipcMain.handle("store:all",   ()               => store.all());
  ipcMain.handle("store:reset-stats", ()         => store.resetStats());

  // Settings
  ipcMain.handle("settings:get", ()          => store.getSettings());
  ipcMain.handle("settings:save", (_e, data) => store.saveSettings(data));

  // Auto-launch toggle
  ipcMain.handle("autolaunch:get", ()       => getAutoLaunch());
  ipcMain.handle("autolaunch:set", (_e, v)  => setAutoLaunch(v));
}

// ── Auto-launch (login item) ──────────────────────────────────────────────────
function getAutoLaunch() {
  if (process.platform === "linux") return false; // handled differently
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
}

function setAutoLaunch(enable) {
  if (process.platform === "linux") return;
  app.setLoginItemSettings({ openAtLogin: enable });
}
