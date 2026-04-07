#!/usr/bin/env node
"use strict";

const { spawn } = require("child_process");
const path = require("path");

let electronPath;
try {
  electronPath = require("electron");
} catch (_) {
  console.error("❌  electron not found. Run: npm install");
  process.exit(1);
}

const appPath = path.resolve(__dirname, "..");
const args    = process.argv.slice(2);

const child = spawn(electronPath, [appPath, ...args], {
  detached: true,
  stdio:    "ignore",
  env: { ...process.env, ELECTRON_IS_DEV: "0" },
});

child.unref();
console.log("🤠  ClaudeWrangler launched. Check your system tray.");
