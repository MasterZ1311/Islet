// Theme Studio (#222): colour themes, pill shapes, motion styles, and presets people can share as
// a short code. Everything is a closed list: a code from someone else can only pick from these.
const THEMES = {
  midnight: { name: "Midnight", ink: "#000000", card: "#18181b", secondary: "#27272a", border: "#27272a", faint: "#27272a" },
  graphite: { name: "Graphite", ink: "#1c1c1e", card: "#2c2c2e", secondary: "#3a3a3c", border: "#3a3a3c", faint: "#3a3a3c" },
  ocean: { name: "Ocean", ink: "#08111f", card: "#0f1d33", secondary: "#182a47", border: "#1e3456", faint: "#1e3456" },
  forest: { name: "Forest", ink: "#0a140e", card: "#122119", secondary: "#1a3024", border: "#1f3a2b", faint: "#1f3a2b" },
  mocha: { name: "Mocha", ink: "#16100d", card: "#241b16", secondary: "#33271f", border: "#3d2f26", faint: "#3d2f26" },
  plum: { name: "Plum", ink: "#120b18", card: "#1f1428", secondary: "#2d1e3a", border: "#382548", faint: "#382548" },
};
const SHAPES = { notch: "Notch", island: "Island", square: "Square" };
const MOTIONS = { bouncy: "Bouncy", smooth: "Smooth", snappy: "Snappy", off: "Off" };
const DEFAULT = { themeBase: "midnight", pillShape: "notch", motion: "bouncy" };

// any input -> a valid studio setting (unknown values fall back to the default)
function clean(v = {}) {
  return {
    themeBase: Object.hasOwn(THEMES, v.themeBase) ? v.themeBase : DEFAULT.themeBase,
    pillShape: Object.hasOwn(SHAPES, v.pillShape) ? v.pillShape : DEFAULT.pillShape,
    motion: Object.hasOwn(MOTIONS, v.motion) ? v.motion : DEFAULT.motion,
  };
}

// what the notch needs: the colour tokens, the shape and the motion
function forNotch(config) {
  const s = clean(config), { name, ...tokens } = THEMES[s.themeBase];
  return { ...s, tokens };
}

// a preset as a code to paste anywhere: "islet-theme:" + base64url(JSON)
const PREFIX = "islet-theme:";
function encode(config) {
  const s = clean(config);
  const accent = /^#[0-9a-f]{6}$/i.test(config?.accent) ? config.accent.toLowerCase() : "album";
  return PREFIX + Buffer.from(JSON.stringify({ v: 1, t: s.themeBase, s: s.pillShape, m: s.motion, a: accent })).toString("base64url");
}
// a pasted code -> the settings it sets, or null when it isn't a valid Islet theme
function decode(code) {
  const text = String(code || "").trim();
  if (!text.startsWith(PREFIX) || text.length > 400) return null;
  let p;
  try { p = JSON.parse(Buffer.from(text.slice(PREFIX.length), "base64url").toString("utf8")); } catch { return null; }
  if (!p || p.v !== 1 || !Object.hasOwn(THEMES, p.t) || !Object.hasOwn(SHAPES, p.s) || !Object.hasOwn(MOTIONS, p.m)) return null;
  const accent = p.a === "album" || /^#[0-9a-f]{6}$/i.test(p.a) ? p.a : null;
  if (!accent) return null;
  return { themeBase: p.t, pillShape: p.s, motion: p.m, accent };
}

module.exports = { THEMES, SHAPES, MOTIONS, DEFAULT, clean, forNotch, encode, decode };
