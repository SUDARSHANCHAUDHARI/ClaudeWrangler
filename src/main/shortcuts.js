"use strict";

/**
 * shortcuts.js — Global keyboard shortcuts.
 * Registered via Electron's globalShortcut module.
 * Reads from settings so user can customize.
 */

const { globalShortcut } = require("electron");
const store   = require("./store");
const actions = require("./actions");

function init() {
  registerAll();
}

function reinit() {
  unregisterAll();
  registerAll();
}

function registerAll() {
  const s = store.getSettings();

  safeRegister(s.shortcutWhip,   () => actions.whip());
  safeRegister(s.shortcutPraise, () => actions.praise());
  safeRegister(s.shortcutFire,   () => actions.fire());
}

function safeRegister(accelerator, fn) {
  if (!accelerator) return;
  try {
    const ok = globalShortcut.register(accelerator, fn);
    if (!ok) console.warn(`[shortcuts] Failed to register: ${accelerator}`);
  } catch (e) {
    console.warn(`[shortcuts] Error registering ${accelerator}:`, e.message);
  }
}

function unregisterAll() {
  globalShortcut.unregisterAll();
}

module.exports = { init, reinit, unregisterAll };
