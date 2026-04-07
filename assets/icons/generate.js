#!/usr/bin/env node
"use strict";

/**
 * generate.js — Generates placeholder tray icons (22×22 PNG).
 * Run once: node assets/icons/generate.js
 * Replace the output PNGs with proper designed icons before shipping.
 * No external dependencies — uses Node's built-in zlib only.
 */

const fs   = require("fs");
const path = require("path");
const zlib = require("zlib");

// ── Minimal PNG encoder ────────────────────────────────────────────────────────
const crc32 = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

function u32be(v) {
  return Buffer.from([(v>>>24)&0xff,(v>>>16)&0xff,(v>>>8)&0xff,v&0xff]);
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const crc = u32be(crc32(Buffer.concat([t, data])));
  return Buffer.concat([u32be(data.length), t, data, crc]);
}

function makePng(w, h, pixels) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 4);
    row[0] = 0; // no filter
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      row[1 + x*4]   = pixels[i];
      row[1 + x*4+1] = pixels[i+1];
      row[1 + x*4+2] = pixels[i+2];
      row[1 + x*4+3] = pixels[i+3];
    }
    rows.push(row);
  }
  const raw = zlib.deflateSync(Buffer.concat(rows));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8]=8; ihdr[9]=6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", raw),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Draw a circle icon ─────────────────────────────────────────────────────────
function circleIcon(size, r, g, b) {
  const px = new Uint8Array(size * size * 4);
  const cx = size / 2, cy = size / 2, radius = size / 2 - 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x-cx)**2 + (y-cy)**2);
      const i = (y * size + x) * 4;
      if (dist <= radius) {
        // Inner highlight for depth
        const bright = Math.max(0, 1 - dist / radius) * 40;
        px[i]   = Math.min(255, r + bright);
        px[i+1] = Math.min(255, g + bright);
        px[i+2] = Math.min(255, b + bright);
        px[i+3] = 255;
      } else if (dist <= radius + 1) {
        // Anti-alias edge
        const alpha = Math.round((1 - (dist - radius)) * 200);
        px[i]=r; px[i+1]=g; px[i+2]=b; px[i+3]=alpha;
      }
      // else transparent
    }
  }
  return px;
}

// ── Crown/template icon (white, for macOS template) ────────────────────────────
function templateIcon(size) {
  // Solid white circle — macOS will invert for dark/light mode
  return circleIcon(size, 255, 255, 255);
}

// ── Icon definitions ──────────────────────────────────────────────────────────
const ICONS = [
  { name: "tray",          pixels: (s) => circleIcon(s, 120, 120, 125) }, // neutral gray
  { name: "tray-template", pixels: (s) => templateIcon(s) },              // white, macOS template
  { name: "idle",          pixels: (s) => circleIcon(s, 100, 100, 110) },
  { name: "whip",          pixels: (s) => circleIcon(s, 220,  38,  38) }, // red
  { name: "praise",        pixels: (s) => circleIcon(s,  22, 163,  74) }, // green
  { name: "fire",          pixels: (s) => circleIcon(s,  20,  20,  20) }, // near-black
];

const OUT_DIR = path.join(__dirname);
const SIZE    = 22; // standard macOS tray icon size

for (const icon of ICONS) {
  const pixels = icon.pixels(SIZE);
  const png    = makePng(SIZE, SIZE, pixels);
  const outPath = path.join(OUT_DIR, `${icon.name}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✅  ${icon.name}.png  (${SIZE}×${SIZE})`);
}

console.log("\n🎉  Icons generated.");
console.log("    Replace with proper designed icons before shipping.");
console.log("    Recommended tool: https://www.figma.com or Sketch → export @1x @2x");
