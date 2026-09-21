import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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

test("zero PR approvals cannot replace independent apply/cleanup environment approval", () => {
  const environment = { deployment_branch_policy: { protected_branches: false, custom_branch_policies: true }, can_admins_bypass: false, protection_rules: [{ type: "required_reviewers", reviewers: [{}], prevent_self_review: true }] };
  const branches = [{ name: "main", type: "branch" }];
  assert.doesNotThrow(() => assertEnvironmentProtection(environment, branches, true));
  for (const change of [
    { protection_rules: [] }, { can_admins_bypass: true },
    { protection_rules: [{ type: "required_reviewers", reviewers: [{}], prevent_self_review: false }] },
  ]) assert.throws(() => assertEnvironmentProtection({ ...environment, ...change }, branches, true));
});

test("PR guide distinguishes source merge from live approval and has valid standalone links", async () => {
  const doc = await read("docs/pr-author-merge.md");
  for (const token of ["zero required PR approvals", "not a fabricated self-approval", "This is not a solo Azure deployment route", "does **not** install it", "independent"]) assert.ok(doc.includes(token), `Missing distinction: ${token}`);
  for (const file of ["README.md", "docs/delivery-configuration.md", "docs/git-workflow.md"]) assert.ok((await read(file)).includes("pr-author-merge.md"));
  for (const [, href] of doc.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(?:[a-z]+:|#)/i.test(href)) continue;
    const target = resolve(root, "docs", decodeURIComponent(href.split("#")[0]));
    assert.ok(target.startsWith(resolve(root) + "/") || target.startsWith(resolve(root) + "\\"));
    await access(target);
  }
});
