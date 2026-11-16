// Bluetooth connect / disconnect pop-ups. bt-connect.ps1 runs for as long as Islet does and
// prints the connected device names whenever they change; this turns that into events.
const { spawn } = require("child_process");
const path = require("path");

// one line of output -> sorted list of names, or null for junk
function parseLine(line) {
  let raw;
  try { raw = JSON.parse(String(line).trim()); } catch { return null; }
  if (raw === null) return [];
  return [...new Set([].concat(raw).filter(n => typeof n === "string" && n.trim()).map(n => n.trim().slice(0, 60)))].sort();
}

// what changed between two lists; the first list (prev null) is only a baseline
function diff(prev, next) {
  if (!prev) return { connected: [], disconnected: [] };
  return { connected: next.filter(n => !prev.includes(n)), disconnected: prev.filter(n => !next.includes(n)) };
}

let child = null, retry = null, stopped = true;
function start(onEvent, { script = path.join(__dirname, "bt-connect.ps1") } = {}) {
  stop();
  stopped = false;
  let prev = null, buf = "", fails = 0;
  const run = () => {
    child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, String(process.pid)], { windowsHide: true });
    child.on("error", () => {});
    child.stdout.on("data", d => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const list = parseLine(buf.slice(0, i)); buf = buf.slice(i + 1);
        if (!list) continue;
        fails = 0;
        const { connected, disconnected } = diff(prev, list);
        prev = list;
        for (const name of connected) onEvent({ type: "connected", name });
        for (const name of disconnected) onEvent({ type: "disconnected", name });
      }
    });
    child.on("exit", () => {
      child = null; buf = "";
      if (!stopped && ++fails <= 5) retry = setTimeout(run, 10000 * fails);
    });
  };
  run();
}
function stop() {
  stopped = true;
  clearTimeout(retry);
  if (child) { try { child.kill(); } catch {} child = null; }
}

module.exports = { start, stop, parseLine, diff };
