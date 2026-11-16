const test = require("node:test");
const assert = require("node:assert");
const { clean, forNotch, encode, decode, THEMES } = require("../src/theme-studio");
const { checkConfig } = require("../src/config-check");

test("studio: unknown values fall back to the default look", () => {
  assert.deepStrictEqual(clean({ themeBase: "ocean", pillShape: "island", motion: "off" }), { themeBase: "ocean", pillShape: "island", motion: "off" });
  assert.deepStrictEqual(clean({ themeBase: "__proto__", pillShape: "star", motion: 3 }), { themeBase: "midnight", pillShape: "notch", motion: "bouncy" });
  assert.deepStrictEqual(clean(), { themeBase: "midnight", pillShape: "notch", motion: "bouncy" });
});

test("studio: the notch gets colour tokens, not the theme's display name", () => {
  const n = forNotch({ themeBase: "graphite" });
  assert.strictEqual(n.tokens.ink, THEMES.graphite.ink);
  assert.strictEqual(n.tokens.name, undefined);
  for (const t of Object.values(THEMES)) for (const [k, v] of Object.entries(t)) if (k !== "name") assert.match(v, /^#[0-9a-f]{6}$/, k);
});

test("studio: a code round-trips the theme, shape, motion and accent", () => {
  const code = encode({ themeBase: "plum", pillShape: "square", motion: "snappy", accent: "#FF00AA" });
  assert.match(code, /^islet-theme:[\w-]+$/);
  assert.deepStrictEqual(decode(code), { themeBase: "plum", pillShape: "square", motion: "snappy", accent: "#ff00aa" });
  assert.strictEqual(decode(`  ${encode({ accent: "album" })} \n`).accent, "album");
});

test("studio: anything that isn't a valid code is refused", () => {
  const bad = o => "islet-theme:" + Buffer.from(JSON.stringify(o)).toString("base64url");
  for (const c of ["", "hello", "islet-theme:!!!", bad({ v: 2, t: "plum", s: "notch", m: "off", a: "album" }), bad({ v: 1, t: "evil", s: "notch", m: "off", a: "album" }),
    bad({ v: 1, t: "plum", s: "notch", m: "off", a: "red; background:url(x)" }), "islet-theme:" + "A".repeat(500), null]) {
    assert.strictEqual(decode(c), null, String(c).slice(0, 40));
  }
});

test("studio: hand-edited config values are checked", () => {
  const { config, invalid } = checkConfig({ themeBase: "nope", pillShape: "island", motion: "off" }, { themeBase: "midnight", pillShape: "notch", motion: "bouncy" });
  assert.deepStrictEqual([config.themeBase, config.pillShape, config.motion], ["midnight", "island", "off"]);
  assert.deepStrictEqual(invalid, ["themeBase"]);
});
