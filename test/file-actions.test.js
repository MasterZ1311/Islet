const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fa = require("../src/file-actions");

test("images get resize/convert/compress, everything gets zip", () => {
  assert.deepStrictEqual(fa.actionsFor("a.png").map(a => a.id), ["half", "fit1920", "jpg", "smaller", "zip"]);
  assert.deepStrictEqual(fa.actionsFor("a.JPG").map(a => a.id), ["half", "fit1920", "png", "smaller", "zip"]);
  assert.deepStrictEqual(fa.actionsFor("a.pdf").map(a => a.id), ["zip"]);
  assert.deepStrictEqual(fa.actionsFor("pics.png", true).map(a => a.id), ["zip"]);
});

test("outPath never overwrites", () => {
  const taken = new Set([path.join("d", "a (50%).png"), path.join("d", "a (50%) 2.png")]);
  assert.strictEqual(fa.outPath(path.join("d", "a.png"), " (50%)", ".png", p => taken.has(p)), path.join("d", "a (50%) 3.png"));
  assert.strictEqual(fa.outPath(path.join("d", "a.png"), "", ".zip", () => false), path.join("d", "a.zip"));
});

test("targetSize halves and fits without upscaling", () => {
  assert.deepStrictEqual(fa.targetSize({ width: 3840, height: 2160 }, "fit1920"), { width: 1920, height: 1080 });
  assert.deepStrictEqual(fa.targetSize({ width: 800, height: 600 }, "fit1920"), { width: 800, height: 600 });
  assert.deepStrictEqual(fa.targetSize({ width: 1, height: 3 }, "half"), { width: 1, height: 2 });
});

test("run rejects non-images for image actions", async () => {
  await assert.rejects(fa.run("x.pdf", "half", {}), /not an image/);
});
