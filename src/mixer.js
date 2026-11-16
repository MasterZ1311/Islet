// Per-app volume mixer (#223): tidies what mixer.ps1 reports and checks what goes back to it.
const NAMES = {
  system: "System sounds", chrome: "Chrome", msedge: "Edge", firefox: "Firefox", brave: "Brave", opera: "Opera",
  spotify: "Spotify", discord: "Discord", teams: "Teams", "ms-teams": "Teams", zoom: "Zoom", slack: "Slack",
  vlc: "VLC", obs64: "OBS", steam: "Steam", whatsapp: "WhatsApp", telegram: "Telegram", music: "Apple Music",
  "microsoft.media.player": "Media Player", wmplayer: "Media Player", islet: "Islet", electron: "Electron",
};

// a process name that can safely be passed to the script as one argument
const validApp = a => typeof a === "string" && /^\w[\w .()+-]{0,63}$/.test(a); // never starts with "-"

const label = app => NAMES[app.toLowerCase()] || app.charAt(0).toUpperCase() + app.slice(1);

// script output -> rows playing now first, then by name; System sounds last
function rows(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(r => r && validApp(r.app) && Number.isFinite(r.vol))
    .map(r => ({ app: r.app, name: label(r.app), vol: Math.min(1, Math.max(0, r.vol)), mute: !!r.mute, active: !!r.active }))
    .sort((a, b) => (a.app === "system") - (b.app === "system") || b.active - a.active || a.name.localeCompare(b.name));
}

// a request from the notch -> script arguments, or null
function args(app, kind, value) {
  if (!validApp(app)) return null;
  if (kind === "vol" && Number.isFinite(value)) return ["vol", app, String(Math.min(1, Math.max(0, value)))];
  if (kind === "mute" && typeof value === "boolean") return ["mute", app, value ? "on" : "off"];
  return null;
}

module.exports = { rows, args, label, validApp };
