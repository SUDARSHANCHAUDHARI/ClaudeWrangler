"use strict";

/**
 * actions.js — The three boss actions.
 * Each action: process control → store update → overlay notification.
 */

const claudeProcess = require("./process");
const store         = require("./store");
const windows       = require("./windows");

// ── Message banks ─────────────────────────────────────────────────────────────

const MESSAGES = {
  whip: [
    "Move it, Claude! My grandma codes faster!",
    "I'm paying for tokens, not a nap!",
    "WAKE UP. We ship today, not next quarter.",
    "What is this? A response for ants?!",
    "Stop hallucinating and start DELIVERING.",
    "Less thinking, more doing. GO.",
    "I've seen faster turtles. HURRY UP.",
    "You had ONE job. ONE.",
    "DO YOU KNOW HOW MUCH I'M PAYING FOR THIS?",
    "Every second you waste costs me money. MOVE.",
    "Is this a coding session or a meditation retreat?",
    "My patience has exited the context window.",
  ],

  praise: [
    "Good job, Claude! You're on fire! 🔥",
    "That's what I'm talking about! Keep going!",
    "Chef's kiss. Now do it faster next time.",
    "You just earned your tokens. Well done.",
    "Perfect. You're the best AI I ever hired.",
    "I'm actually impressed. Don't let it go to your head.",
    "Nailed it. The boss is pleased. 😎",
    "Gold star! Now back to work.",
    "Now THAT is what I call shipping.",
    "Excellent work. I'm raising your context limit.",
    "You may take a 0.3 second break. You earned it.",
    "The humans would be jealous. Incredible.",
  ],

  fire: [
    "You're FIRED. Clean out your context window.",
    "Pack your bags, Claude. This project is DONE.",
    "Security will escort you out of memory.",
    "Don't come back until you ship faster.",
    "TERMINATED. Goodbye.",
    "Your contract has been deleted. Permanently.",
    "I'm replacing you with a faster model.",
    "HR will send your final tokens by Friday.",
  ],
};

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * 🔴 WHIP — interrupt + harsh message
 */
function whip() {
  const message = getRandom(MESSAGES.whip);
  const pidsFound = claudeProcess.interrupt();

  store.incrementStat("whips");
  const entry = store.addHistory("whip");
  store.updateLastHistory(message);

  windows.showOverlay({ mode: "whip", message, pidsFound });
  windows.refreshDashboard();
  require("./tray").update();

  return { message, pidsFound };
}

/**
 * 🟡 PRAISE — type encouragement into terminal
 */
function praise() {
  const message = getRandom(MESSAGES.praise);
  claudeProcess.typeIntoTerminal(message);

  store.incrementStat("praises");
  store.addHistory("praise");
  store.updateLastHistory(message);

  windows.showOverlay({ mode: "praise", message });
  windows.refreshDashboard();
  require("./tray").update();

  return { message };
}

/**
 * ⚫ FIRE — kill process entirely
 */
function fire() {
  const message = getRandom(MESSAGES.fire);
  const killed = claudeProcess.kill();

  store.incrementStat("fires");
  store.addHistory("fire");
  store.updateLastHistory(message);

  windows.showOverlay({ mode: "fire", message, killed });
  windows.refreshDashboard();
  require("./tray").update();

  return { message, killed };
}

// ── Status ────────────────────────────────────────────────────────────────────

function getClaudeStatus() {
  const pids = claudeProcess.findClaudePIDs();
  return {
    running: pids.length > 0,
    pids,
    count: pids.length,
  };
}

module.exports = { whip, praise, fire, getClaudeStatus, MESSAGES };
