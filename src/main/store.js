"use strict";

/**
 * store.js — Persistent data layer using electron-store.
 * Handles: stats, action history, user settings.
 */

let Store = null;
let _store = null;

const DEFAULTS = {
  stats: {
    whips:   0,
    praises: 0,
    fires:   0,
    totalSessions: 0,
    firstUsed: null,
    lastUsed: null,
  },
  history: [],         // last 100 actions
  settings: {
    overlayDuration:  3000,      // ms overlay stays visible
    overlayPosition:  "bottom-center",  // bottom-center | top-center | bottom-right
    soundEnabled:     true,
    shortcutWhip:     "CommandOrControl+Shift+W",
    shortcutPraise:   "CommandOrControl+Shift+P",
    shortcutFire:     "CommandOrControl+Shift+F",
    leftClickAction:  "whip",    // whip | praise | fire | menu
    startAtLogin:     false,
    theme:            "dark",    // dark | light | system
  },
};

function init() {
  // electron-store v10 uses ESM — we use dynamic import wrapped in a sync init
  // For CJS compat, we use the older API path
  try {
    Store = require("electron-store");
  } catch (_) {
    // Fallback: in-memory store (when electron-store not yet installed)
    _store = { data: JSON.parse(JSON.stringify(DEFAULTS)) };
    _store.get = (key) => key.split(".").reduce((o, k) => o?.[k], _store.data);
    _store.set = (key, val) => {
      const keys = key.split(".");
      let obj = _store.data;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = val;
    };
    _store.store = _store.data;
    console.warn("[store] electron-store not found, using in-memory fallback.");
    return;
  }

  _store = new Store({
    name: "claudewrangler",
    defaults: DEFAULTS,
    schema: {
      stats: { type: "object" },
      history: { type: "array" },
      settings: { type: "object" },
    },
  });

  // Increment session count
  _store.set("stats.totalSessions", (_store.get("stats.totalSessions") || 0) + 1);
  if (!_store.get("stats.firstUsed")) {
    _store.set("stats.firstUsed", new Date().toISOString());
  }
}

function get(key) {
  return _store.get(key);
}

function set(key, value) {
  return _store.set(key, value);
}

function all() {
  return _store.store || _store.data;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function incrementStat(type) {
  const key = `stats.${type}`;
  _store.set(key, (_store.get(key) || 0) + 1);
  _store.set("stats.lastUsed", new Date().toISOString());
}

function getStats() {
  return _store.get("stats");
}

function resetStats() {
  _store.set("stats", {
    ...DEFAULTS.stats,
    firstUsed: _store.get("stats.firstUsed"),
    totalSessions: _store.get("stats.totalSessions"),
  });
  _store.set("history", []);
}

// ── History ───────────────────────────────────────────────────────────────────
function addHistory(action) {
  const entry = {
    type:    action,  // 'whip' | 'praise' | 'fire'
    time:    new Date().toISOString(),
    message: null,    // filled in by actions.js
  };
  const history = _store.get("history") || [];
  history.unshift(entry);
  if (history.length > 100) history.splice(100);
  _store.set("history", history);
  return entry;
}

function updateLastHistory(message) {
  const history = _store.get("history") || [];
  if (history.length > 0) {
    history[0].message = message;
    _store.set("history", history);
  }
}

function getHistory() {
  return _store.get("history") || [];
}

// ── Settings ──────────────────────────────────────────────────────────────────
function getSettings() {
  return _store.get("settings") || DEFAULTS.settings;
}

function saveSettings(partial) {
  const current = getSettings();
  const merged  = { ...current, ...partial };
  _store.set("settings", merged);
  return merged;
}

module.exports = {
  init,
  get,
  set,
  all,
  incrementStat,
  getStats,
  resetStats,
  addHistory,
  updateLastHistory,
  getHistory,
  getSettings,
  saveSettings,
};
