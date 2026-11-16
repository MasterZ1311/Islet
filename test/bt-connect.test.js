const test = require("node:test");
const assert = require("node:assert");
const bt = require("../src/bt-connect");

test("bt: lines parse to sorted unique names, junk is null", () => {
  assert.deepStrictEqual(bt.parseLine('["Buds","Mouse","Buds"]'), ["Buds", "Mouse"]);
  assert.deepStrictEqual(bt.parseLine('"Buds"'), ["Buds"]);
  assert.deepStrictEqual(bt.parseLine("[]"), []);
  assert.deepStrictEqual(bt.parseLine("null"), []);
  assert.deepStrictEqual(bt.parseLine('[1," ",null,"X"]'), ["X"]);
  assert.strictEqual(bt.parseLine("WARNING: blah"), null);
});

test("bt: the first list is a baseline, later ones report changes", () => {
  assert.deepStrictEqual(bt.diff(null, ["Buds"]), { connected: [], disconnected: [] });
  assert.deepStrictEqual(bt.diff(["Buds"], ["Mouse"]), { connected: ["Mouse"], disconnected: ["Buds"] });
  assert.deepStrictEqual(bt.diff(["Buds"], ["Buds"]), { connected: [], disconnected: [] });
});
