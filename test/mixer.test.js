const test = require("node:test");
const assert = require("node:assert");
const { rows, args, label, validApp } = require("../src/mixer");

test("mixer: rows clamp, name and sort apps", () => {
  const r = rows([
    { app: "system", vol: 1, mute: false, active: false },
    { app: "Discord", vol: 0.5, mute: true, active: false },
    { app: "chrome", vol: 1.4, mute: false, active: true },
    { app: "bad\"name", vol: 1 }, null, { app: "x", vol: "loud" },
  ]);
  assert.deepStrictEqual(r.map(x => x.name), ["Chrome", "Discord", "System sounds"]);
  assert.strictEqual(r[0].vol, 1);
  assert.strictEqual(r[1].mute, true);
  assert.deepStrictEqual(rows(null), []);
});

test("mixer: only safe requests reach the script", () => {
  assert.deepStrictEqual(args("chrome", "vol", 0.3), ["vol", "chrome", "0.3"]);
  assert.deepStrictEqual(args("chrome", "vol", 7), ["vol", "chrome", "1"]);
  assert.deepStrictEqual(args("Spotify", "mute", true), ["mute", "Spotify", "on"]);
  assert.strictEqual(args("a;rm", "vol", 0.3), null);
  assert.strictEqual(args("chrome", "vol", NaN), null);
  assert.strictEqual(args("chrome", "mute", "yes"), null);
  assert.strictEqual(args("chrome", "drop", 1), null);
  assert.strictEqual(validApp("-x".repeat(40)), false);
});

test("mixer: unknown apps get a capitalised process name", () => {
  assert.strictEqual(label("msedge"), "Edge");
  assert.strictEqual(label("foobar2000"), "Foobar2000");
});
