"use strict";

/**
 * tray.js — System tray icon + context menu.
 */

const { Tray, Menu, nativeImage, shell, app } = require("electron");
const path = require("path");
const fs   = require("fs");

const store   = require("./store");
const actions = require("./actions");
const windows = require("./windows");

let tray = null;

const ICON_DIR = path.join(__dirname, "..", "..", "assets", "icons");

function getIcon(name) {
  const p = path.join(ICON_DIR, `${name}.png`);
  if (fs.existsSync(p)) return nativeImage.createFromPath(p);
  return nativeImage.createEmpty();
}

function init() {
  const icon = getIcon("tray");
  tray = new Tray(icon);

  // macOS: set template image for dark/light mode support
  if (process.platform === "darwin") {
    const template = getIcon("tray-template");
    if (!template.isEmpty()) {
      template.setTemplateImage(true);
      tray.setImage(template);
    }
    tray.setTitle("🤠");
  }

  const settings = store.getSettings();

  // Left-click behavior based on settings
  tray.on("click", () => {
    const action = (store.getSettings() || {}).leftClickAction || "whip";
    switch (action) {
      case "whip":   actions.whip();   break;
      case "praise": actions.praise(); break;
      case "fire":   actions.fire();   break;
      case "menu":
      default:
        tray.popUpContextMenu();
    }
  });

  update();
}

function update() {
  if (!tray) return;
  const stats = store.getStats();

  const menu = Menu.buildFromTemplate([
    // Header
    { label: "🤠  CLAUDEWRANGLER", enabled: false },
    { label: `v${require("../../package.json").version}  ·  ${formatLastUsed(stats.lastUsed)}`, enabled: false },
    { type: "separator" },

    // ── Actions
    {
      label: `🔴  Whip Claude`,
      sublabel: `${stats.whips} times · Ctrl-C interrupt`,
      accelerator: store.getSettings().shortcutWhip,
      click: () => actions.whip(),
    },
    {
      label: `🟡  Praise Claude`,
      sublabel: `${stats.praises} times · Types into terminal`,
      accelerator: store.getSettings().shortcutPraise,
      click: () => actions.praise(),
    },
    {
      label: `⚫  Fire Claude`,
      sublabel: `${stats.fires} times · Kills process`,
      accelerator: store.getSettings().shortcutFire,
      click: () => actions.fire(),
    },
    { type: "separator" },

    // ── Status
    {
      label: claudeStatusLabel(),
      enabled: false,
    },
    { type: "separator" },

    // ── Panels
    {
      label: "📊  Dashboard & History",
      click: () => windows.showDashboard(),
    },
    {
      label: "⚙️  Settings",
      click: () => windows.showSettings(),
    },
    { type: "separator" },

    {
      label: "🐙  View on GitHub",
      click: () => shell.openExternal("https://github.com/SUDARSHANCHAUDHARI/claudewrangler"),
    },
    { type: "separator" },

    { label: "Quit ClaudeWrangler", role: "quit" },
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip(
    `ClaudeWrangler  |  Whipped: ${stats.whips}  Praised: ${stats.praises}  Fired: ${stats.fires}`
  );
}

function claudeStatusLabel() {
  try {
    const { running, count } = actions.getClaudeStatus();
    if (running) return `🟢  Claude Code running  (${count} process${count > 1 ? "es" : ""})`;
    return "🔴  Claude Code not detected";
  } catch (_) {
    return "⚪  Claude Code status unknown";
  }
}

function formatLastUsed(iso) {
  if (!iso) return "never used";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000)  return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

module.exports = { init, update };
