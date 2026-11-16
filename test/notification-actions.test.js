const test = require("node:test");
const assert = require("node:assert");
const { actionsOf } = require("../src/notifications");

test("actions: a protocol launch is the toast's own link, a text input means a reply", () => {
  const xml = '<toast launch="ms-phone:conv?id=1&amp;x=2" activationType="protocol"><visual/><actions><input id="reply" type="text"/><action content="Send" arguments="send" activationType="background"/></actions></toast>';
  assert.deepStrictEqual(actionsOf(xml), { link: "ms-phone:conv?id=1&x=2", reply: true });
});

test("actions: foreground (COM) launches and missing links give no link", () => {
  assert.deepStrictEqual(actionsOf('<toast launch="0|0|Default|0|https://x.test"><visual/></toast>'), { link: null, reply: false });
  assert.deepStrictEqual(actionsOf("<toast><visual/></toast>"), { link: null, reply: false });
  assert.deepStrictEqual(actionsOf(""), { link: null, reply: false });
});

test("actions: a link that isn't a scheme is refused, choice inputs aren't replies", () => {
  assert.strictEqual(actionsOf('<toast launch="just text" activationType="protocol"/>').link, null);
  assert.strictEqual(actionsOf('<toast><actions><input id="c" type="selection"/></actions></toast>').reply, false);
});
