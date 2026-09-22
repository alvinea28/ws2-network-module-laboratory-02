import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (file) => readFile(resolve(root, file), "utf8");
const course = JSON.parse(await read(".github/agentalvine/course.json"));
const ruleset = JSON.parse(await read(".github/rulesets/main-author-merge.json"));
const contexts = course.number === 2 ? ["kit", "Test learner module", "Validate isolated Terraform companion"] : ["kit", "Test learner module"];
const { assertEnvironmentProtection } = await import(pathToFileURL(resolve(root, course.number === 2 ? "scripts/avm-policy.mjs" : "scripts/plan-policy.mjs")).href);

function validate(value) {
  assert.ok([2, 7].includes(course.number));
  assert.equal(value.name, `WS2 Lab ${String(course.number).padStart(2, "0")} - author-merge main`);
  assert.equal(value.target, "branch"); assert.equal(value.enforcement, "active");
  assert.deepEqual(value.bypass_actors, []);
  assert.deepEqual(value.conditions, { ref_name: { include: ["refs/heads/main"], exclude: [] } });
  assert.deepEqual(value.rules.map((rule) => rule.type), ["deletion", "non_fast_forward", "pull_request", "required_status_checks"]);
  assert.deepEqual(value.rules[2].parameters, { required_approving_review_count: 0, dismiss_stale_reviews_on_push: true, require_code_owner_review: false, require_last_push_approval: false, required_review_thread_resolution: true });
  assert.deepEqual(value.rules[3].parameters, { strict_required_status_checks_policy: true, do_not_enforce_on_create: true, required_status_checks: contexts.map((context) => ({ context, integration_id: 15368 })) });
}

test("main ruleset requires a PR with zero approving PR reviews, not self-approval", () => validate(ruleset));

test("PR policy rejects wider refs, bypass actors, missing checks and accidental review requirements", () => {
  for (const mutate of [
    (r) => { r.conditions.ref_name.include.push("refs/heads/dev"); },
    (r) => { r.conditions.ref_name.include = ["~ALL"]; },
    (r) => { r.bypass_actors = [{ actor_type: "RepositoryRole", actor_id: 5, bypass_mode: "always" }]; },
    (r) => { r.rules[2].parameters.required_approving_review_count = 1; },
    (r) => { r.rules[2].parameters.require_code_owner_review = true; },
    (r) => { r.rules[2].parameters.require_last_push_approval = true; },
    (r) => { r.rules[2].parameters.required_review_thread_resolution = false; },
    (r) => { r.rules[3].parameters.strict_required_status_checks_policy = false; },
    (r) => { r.rules[3].parameters.required_status_checks.pop(); },
    (r) => { r.rules[3].parameters.required_status_checks[0].integration_id = null; },
    (r) => { r.rules.shift(); },
    (r) => { r.enforcement = "disabled"; },
  ]) { const changed = structuredClone(ruleset); mutate(changed); assert.throws(() => validate(changed)); }
});

test("automatic deployment environments require main-only access, no reviewers and no bypass", () => {
  const environment = { deployment_branch_policy: { protected_branches: false, custom_branch_policies: true }, can_admins_bypass: false, protection_rules: [] };
  const branches = [{ name: "main", type: "branch" }];
  assert.doesNotThrow(() => assertEnvironmentProtection(environment, branches));
  for (const change of [
    { protection_rules: undefined }, { can_admins_bypass: true },
    { deployment_branch_policy: { protected_branches: true, custom_branch_policies: false } },
    { deployment_branch_policy: null },
    { protection_rules: [{ type: "required_reviewers", reviewers: [{}], prevent_self_review: true }] },
    { protection_rules: [{ type: "required_reviewers", reviewers: [{}], prevent_self_review: false }] },
  ]) assert.throws(() => assertEnvironmentProtection({ ...environment, ...change }, branches));
  for (const changed of [[], [{ name: "dev", type: "branch" }], [{ name: "main", type: "tag" }], [...branches, { name: "*", type: "branch" }]]) {
    assert.throws(() => assertEnvironmentProtection(environment, changed));
  }
});

test("PR guide explains automatic exact-plan apply and separate cleanup with standalone links", async () => {
  const doc = await read("docs/pr-author-merge.md");
  for (const token of ["zero required PR approvals", "not a fabricated self-approval", "No manual deployment reviewer is required", "does **not** install it", "deployment-authorization.cjs", "2-hour plan validity", "1-day artifact retention"]) assert.ok(doc.includes(token), `Missing distinction: ${token}`);
  const prose = doc.replace(/[*`]/g, "").replace(/\s+/g, " ");
  const id = course.number === 2 ? "1379147533" : "1379149907";
  const cleanup = course.number === 2 ? "avm-cleanup.yml" : "cleanup.yml";
  assert.ok(prose.includes(`destroy:${id}:<current full main SHA>:<WS2_STATE_LOCK_ID>`));
  assert.ok(doc.includes(`../.github/workflows/${cleanup}`));
  for (const pattern of [/no Required reviewers/i, /no admin bypass/i, /same run/i, /no operation input/i, /no independent cleanup reviewer/i, /actor\/sender\/trigger IDs/i, /same run's exact destroy plan/i, /followup only/i, /ordinary main never cleans up/i, /wrong IDs\/public\/templates fail/i, /AgentAlvine only observes\/guides, never authorizes Azure/i]) assert.match(prose, pattern);
  assert.doesNotMatch(prose, /wait for.*independent.*reviewer|This is not a solo Azure deployment route/i);
  for (const file of ["README.md", "docs/delivery-configuration.md", "docs/git-workflow.md"]) assert.ok((await read(file)).includes("pr-author-merge.md"));
  for (const [, href] of doc.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(?:[a-z]+:|#)/i.test(href)) continue;
    const target = resolve(root, "docs", decodeURIComponent(href.split("#")[0]));
    assert.ok(target.startsWith(resolve(root) + "/") || target.startsWith(resolve(root) + "\\"));
    await access(target);
  }
});

test("PR instructions stop at absent main without importing private evidence into public prerequisites", async () => {
  const doc = await read("docs/pr-author-merge.md");
  const text = doc.replace(/[*`]/g, "").replace(/\s+/g, " ");
  for (const pattern of [/If protected main does not exist.*stop at the offline handoff/i, /Do not create main or open a PR into a nonexistent branch/i, /only after baseline\/readiness review, while delivery is disabled/i, /No live success is claimed/i, /Source maintenance stays on dev/i, /no empty commit or fake change/i, /author.*offline.*only.*exact approved private profile/i]) assert.match(text, pattern);
  const generic = (await read("docs/delivery-configuration.md")).includes("**Public-source context:**");
  if (generic) {
    assert.match(text, /generic source guide supplies no current configuration inventory, approved Azure scope, budget, lifetime or bootstrap authorization/i);
    assert.doesNotMatch(text, /ws2-sim-\d{8}-|Last supplied readback|\b\d{11}\b|Verified configuration update|\/actions\/runs\/\d+/);
  } else {
    assert.match(text, /alvine-aurelio-org\/ws2-sim-20260921-network-module-laboratory-02/);
    assert.ok(doc.includes("delivery-configuration.md#private-copy-configuration-record"));
    assert.match(text, /not a fresh Azure-readiness or deployment claim/i);
  }
});
