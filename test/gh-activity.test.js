const test = require("node:test");
const assert = require("node:assert");
const { runs, prChecks, deployment, diff, collect } = require("../src/gh-activity");

test("runs map status and conclusion", () => {
  const r = runs([
    { databaseId: 1, status: "in_progress", workflowName: "CI", displayTitle: "fix x", url: "https://github.com/a/b/actions/runs/1" },
    { databaseId: 2, status: "completed", conclusion: "success", workflowName: "Release" },
    { databaseId: 3, status: "completed", conclusion: "failure", workflowName: "CI" },
    { databaseId: 4, status: "queued", workflowName: "CI" },
  ], "a/b");
  assert.deepStrictEqual(r.map(x => x.state), ["running", "pass", "fail", "running"]);
  assert.strictEqual(r[0].id, "run:a/b:1");
  assert.deepStrictEqual(runs(null, "a/b"), []);
});

test("PR checks roll up CheckRuns and StatusContexts", () => {
  const pr = { number: 7, title: "t", url: "u", statusCheckRollup: [
    { __typename: "CheckRun", status: "COMPLETED", conclusion: "SUCCESS" },
    { __typename: "StatusContext", state: "PENDING" },
  ] };
  assert.strictEqual(prChecks(pr, "a/b").state, "running");
  assert.match(prChecks(pr, "a/b").label, /1\/2 checks/);
  pr.statusCheckRollup[1].state = "FAILURE";
  assert.strictEqual(prChecks(pr, "a/b").state, "fail");
  pr.statusCheckRollup[1].state = "SUCCESS";
  assert.strictEqual(prChecks(pr, "a/b").state, "pass");
  assert.strictEqual(prChecks({ number: 1, statusCheckRollup: [] }, "a/b"), null);
  assert.strictEqual(prChecks(null, "a/b"), null);
});

test("deployment state comes from its latest status", () => {
  const d = { id: 9, environment: "production", ref: "main" };
  assert.strictEqual(deployment(d, [{ state: "in_progress" }], "a/b").state, "running");
  assert.strictEqual(deployment(d, [], "a/b").state, "running");
  assert.strictEqual(deployment(d, [{ state: "success", environment_url: "https://x" }], "a/b").url, "https://x");
  assert.strictEqual(deployment(d, [{ state: "error" }], "a/b").state, "fail");
  assert.strictEqual(deployment(null, [], "a/b"), null);
});

test("diff reports only runs that finished while watched", () => {
  const prev = new Map();
  let u = diff(prev, [{ id: "a", state: "running" }, { id: "b", state: "pass" }]);
  assert.deepStrictEqual(u.live.map(x => x.id), ["a"]);
  assert.deepStrictEqual(u.finished, []); // b was already done when first seen
  u = diff(prev, [{ id: "a", state: "fail" }, { id: "b", state: "pass" }]);
  assert.deepStrictEqual(u.finished.map(x => x.id), ["a"]);
  assert.deepStrictEqual(u.live, []);
  diff(prev, []);
  assert.strictEqual(prev.size, 0);
});

test("collect asks gh once for the repo, then runs, PR and deployments", async () => {
  const calls = [];
  const call = async args => {
    calls.push(args.slice(0, 2).join(" "));
    if (args[0] === "repo") return { nameWithOwner: "a/b" };
    if (args[0] === "run") return [{ databaseId: 1, status: "in_progress", workflowName: "CI" }];
    if (args[0] === "pr") return null; // no PR for this branch
    if (args[1].endsWith("deployments?per_page=1")) return [{ id: 5, environment: "prod" }];
    return [{ state: "success" }];
  };
  const cache = new Map();
  const out = await collect("C:\p", cache, call);
  assert.deepStrictEqual(out.map(a => a.kind), ["run", "deploy"]);
  await collect("C:\p", cache, call);
  assert.strictEqual(calls.filter(c => c === "repo view").length, 1);
  assert.deepStrictEqual(await collect("C:\q", new Map([["C:\q", null]]), call), []);
});
