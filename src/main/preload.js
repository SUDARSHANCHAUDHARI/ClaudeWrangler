"use strict";

/**
 * preload.js — Context bridge between main process and renderer.
 * Exposes only the APIs renderers need. No nodeIntegration.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("boss", {

  // ── Overlay ────────────────────────────────────────────────────────────────
  onOverlayShow: (cb) => ipcRenderer.on("overlay:show", (_e, data) => cb(data)),
  onOverlayHide: (cb) => ipcRenderer.on("overlay:hide", () => cb()),

  // ── Dashboard ──────────────────────────────────────────────────────────────
  onDashboardData: (cb) => ipcRenderer.on("dashboard:data", (_e, data) => cb(data)),
  closeDashboard:  ()   => ipcRenderer.send("window:close-dashboard"),
  openSettings:    ()   => ipcRenderer.send("window:open-settings"),

  // Actions from dashboard buttons
  whip:   () => ipcRenderer.send("action:whip"),
  praise: () => ipcRenderer.send("action:praise"),
  fire:   () => ipcRenderer.send("action:fire"),

  resetStats: () => ipcRenderer.invoke("store:reset-stats"),

  // ── Settings ───────────────────────────────────────────────────────────────
  onSettingsData:  (cb) => ipcRenderer.on("settings:data", (_e, data) => cb(data)),
  closeSettings:   ()   => ipcRenderer.send("window:close-settings"),
  saveSettings:    (data) => ipcRenderer.invoke("settings:save", data),
  getAutoLaunch:   ()   => ipcRenderer.invoke("autolaunch:get"),
  setAutoLaunch:   (v)  => ipcRenderer.invoke("autolaunch:set", v),

  // ── Shared ─────────────────────────────────────────────────────────────────
  platform: process.platform,
});
