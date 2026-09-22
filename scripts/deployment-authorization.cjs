"use strict";
const assert = require("node:assert/strict");

// Names alone are insufficient: a deleted/recreated or transferred copy must fail.
const PROFILES = Object.freeze({
  avm: Object.freeze({ id: 1379147533, repository: "alvine-aurelio-org/ws2-sim-20260921-network-module-laboratory-02", ruleset: 23780379,
    rulesetUpdatedAt: "2026-09-21T17:14:13.294Z",
    delivery: "avm-delivery.yml", cleanup: "avm-cleanup.yml", environments: ["avm-plan", "avm-apply"],
    checks: ["kit", "Test learner module", "Validate isolated Terraform companion"], validation: "Validate reviewed AVM revision", plan: "Trusted AVM plan" }),
  dev: Object.freeze({ id: 1379149907, repository: "alvine-aurelio-org/ws2-sim-20260921-azure-delivery-laboratory-07", ruleset: 23780383,
    rulesetUpdatedAt: "2026-09-21T17:14:22.201Z",
    delivery: "delivery.yml", cleanup: "cleanup.yml", environments: ["dev-plan", "dev-apply"],
    checks: ["kit", "Test learner module"], validation: "Validate reviewed delivery revision", plan: "Trusted dev plan" }),
});

function profileFor(name) {
  assert.ok(Object.hasOwn(PROFILES, name), "Unknown private deployment profile");
  return PROFILES[name];
}

function assertRepository(repository, profile) {
  const expected = profileFor(profile);
  assert.equal(repository.id, expected.id, "Unapproved immutable repository identity");
  assert.equal(repository.full_name, expected.repository, "Unapproved repository name/owner");
  assert.equal(repository.private, true, "Automatic deployment requires this private copy");
  assert.equal(repository.is_template, false, "Templates must never deploy");
  return expected;
}

function operationFor(event, input, workflowRef, profile) {
  const expected = profileFor(profile);
  const prefix = `${expected.repository}/.github/workflows/`;
  if (workflowRef === `${prefix}${expected.cleanup}@refs/heads/main`) {
    assert.equal(event, "workflow_dispatch", "Cleanup requires its dedicated explicit workflow dispatch");
    assert.ok(!input || input === "destroy", "Cleanup cannot become a deployment route");
    return "destroy";
  }
  assert.equal(workflowRef, `${prefix}${expected.delivery}@refs/heads/main`, "Only the exact protected-main workflow is trusted");
  if (event === "push") return "deploy";
  if (event === "schedule") return "drift";
  assert.equal(event, "workflow_dispatch", "Untrusted delivery event");
  assert.equal(input, "followup", "Main delivery dispatch permits followup only; cleanup has its own workflow");
  return "followup";
}

function assertEnvironmentProtection(environment, branches) {
  assert.deepEqual(environment.deployment_branch_policy, { protected_branches: false, custom_branch_policies: true });
  assert.ok(branches.length === 1 && branches[0].name === "main" && branches[0].type === "branch", "Only main can use this environment");
  assert.equal(environment.can_admins_bypass, false, "Environment bypass must remain disabled");
  assert.ok(Array.isArray(environment.protection_rules), "Read back actual environment protections");
  assert.ok(!environment.protection_rules.some((rule) => rule.type === "required_reviewers"), "The approved automatic path has no Required reviewers");
}

function assertRules(rules, expected) {
  assert.deepEqual(rules.map((rule) => rule.type).sort(), ["deletion", "non_fast_forward", "pull_request", "required_status_checks"].sort(), "Main protections changed");
  const pr = rules.find((rule) => rule.type === "pull_request").parameters;
  assert.equal(pr.required_approving_review_count, 0, "No separate approving PR review is required");
  assert.equal(pr.require_code_owner_review, false);
  assert.equal(pr.require_last_push_approval, false);
  assert.equal(pr.dismiss_stale_reviews_on_push, true);
  assert.equal(pr.required_review_thread_resolution, true, "Resolve all PR conversations");
  assert.equal(pr.required_reviewers?.length ?? 0, 0);
  const checks = rules.find((rule) => rule.type === "required_status_checks").parameters;
  assert.equal(checks.strict_required_status_checks_policy, true, "Required checks must be strict");
  assert.deepEqual(checks.required_status_checks.map((check) => [check.context, check.integration_id]).sort(), expected.checks.map((name) => [name, 15368]).sort(), "Retain every required GitHub Actions check");
}

async function authorize({ github, context, core, profile, phase = "apply", env = process.env }) {
  assert.ok(["preflight", "plan", "apply"].includes(phase));
  assert.equal(env.WORKSHOP_AZURE_ENABLED, "true", "Deployment remains disabled until prerequisites are authorized and ready");
  assert.equal(env.GITHUB_RUN_ATTEMPT, "1", "Use a fresh run, not a credentialled rerun");
  assert.equal(env.GITHUB_REF, "refs/heads/main");
  assert.equal(env.GITHUB_REF_PROTECTED, "true");
  assert.equal(env.GITHUB_SHA, context.sha);
  assert.equal(env.GITHUB_RUN_ID, String(context.runId));
  assert.equal(env.GITHUB_EVENT_NAME, context.eventName);
  assert.match(context.sha, /^[a-f\d]{40}$/);
  const expected = profileFor(profile);
  assert.equal(`${context.repo.owner}/${context.repo.repo}`, expected.repository);
  assert.equal(env.GITHUB_REPOSITORY, expected.repository);
  assert.equal(env.GITHUB_REPOSITORY_ID, String(expected.id));
  assertRepository(context.payload.repository, profile);
  const { data: repository } = await github.rest.repos.get(context.repo);
  assertRepository(repository, profile);
  const operation = operationFor(context.eventName, context.payload.inputs?.operation, env.GITHUB_WORKFLOW_REF, profile);
  if (env.OPERATION) assert.equal(env.OPERATION, operation, "Operation differs from trusted workflow/event");
  const { data: run } = await github.rest.actions.getWorkflowRun({ ...context.repo, run_id: context.runId });
  assert.equal(run.id, context.runId); assert.equal(run.run_attempt, 1);
  assert.equal(run.head_sha, context.sha); assert.equal(run.head_branch, "main");
  assert.equal(run.event, context.eventName); assert.equal(run.status, "in_progress");
  assert.equal(run.repository?.id, expected.id); assert.equal(run.head_repository?.id, expected.id);
  assert.equal(run.path, `.github/workflows/${operation === "destroy" ? expected.cleanup : expected.delivery}`);
  const { data: branch } = await github.rest.repos.getBranch({ ...context.repo, branch: "main" });
  assert.ok(branch.protected && branch.commit.sha === context.sha, "Main moved or is unprotected");
  const { data: ruleset } = await github.request("GET /repos/{owner}/{repo}/rulesets/{ruleset_id}", { ...context.repo, ruleset_id: expected.ruleset });
  assert.equal(ruleset.id, expected.ruleset); assert.equal(ruleset.enforcement, "active");
  assert.equal(ruleset.target, "branch"); assert.equal(ruleset.source_type, "Repository");
  assert.equal(ruleset.source, expected.repository);
  // GitHub hides bypass_actors from read-only job tokens. These server-issued
  // revisions were read back with owner/admin access and an EMPTY bypass list.
  // A hidden field is NOT assumed empty: a new/missing revision fails closed.
  // Any later settings edit requires a fresh admin readback and reviewed pin.
  assert.equal(ruleset.updated_at, expected.rulesetUpdatedAt, "Ruleset revision changed or unavailable; reverify actual bypass actors before updating the pin");
  if (Object.hasOwn(ruleset, "bypass_actors")) assert.deepEqual(ruleset.bypass_actors, []);
  assert.deepEqual(ruleset.conditions, { ref_name: { include: ["refs/heads/main"], exclude: [] } });
  assertRules(ruleset.rules, expected);
  const effective = await github.paginate("GET /repos/{owner}/{repo}/rules/branches/{branch}", { ...context.repo, branch: "main", per_page: 100 });
  assertRules(effective, expected);
  assert.ok(effective.every((rule) => rule.ruleset_id === expected.ruleset), "Unexpected inherited main policy");
  const prs = await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, { ...context.repo, commit_sha: context.sha, per_page: 100 });
  assert.ok(prs.some((pr) => pr.merged_at && pr.base?.ref === "main" && pr.base.repo?.id === expected.id && pr.merge_commit_sha === context.sha), "Only an actual merged protected-main PR is eligible; self-approval is unnecessary");
  for (const name of expected.environments) {
    const { data: environment } = await github.rest.repos.getEnvironment({ ...context.repo, environment_name: name });
    const branches = await github.paginate(github.rest.repos.listDeploymentBranchPolicies, { ...context.repo, environment_name: name, per_page: 100 });
    assertEnvironmentProtection(environment, branches);
  }
  if (operation === "destroy") {
    assert.match(env.WS2_STATE_LOCK_ID ?? "", /^[a-zA-Z\d-]{3,80}$/);
    const authorization = `destroy:${expected.id}:${context.sha}:${env.WS2_STATE_LOCK_ID}`;
    assert.equal(context.payload.inputs?.authorization, authorization, "Explicit cleanup authorization must bind this repository, current SHA and owned state");
    assert.equal(run.actor?.type, "User", "Cleanup requires an authenticated repository owner/admin");
    assert.ok(Number.isSafeInteger(run.actor.id));
    assert.equal(run.triggering_actor?.id, run.actor.id);
    assert.equal(context.payload.sender?.id, run.actor.id);
    const { data: permission } = await github.rest.repos.getCollaboratorPermissionLevel({ ...context.repo, username: run.actor.login });
    assert.equal(permission.permission, "admin", "Only a current repository admin may authorize cleanup");
    assert.equal(permission.user?.id, run.actor.id, "Cleanup owner identity mismatch");
  }
  if (phase !== "preflight") {
    const jobs = await github.paginate("GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs", { ...context.repo, run_id: context.runId, attempt_number: 1, per_page: 100 });
    for (const name of phase === "apply" ? [expected.validation, expected.plan] : [expected.validation]) {
      const matches = jobs.filter((job) => job.name === name);
      assert.equal(matches.length, 1, "Require the unique same-run validation/plan job");
      const job = matches[0];
      assert.equal(job.run_id, context.runId); assert.equal(job.head_sha, context.sha);
      assert.equal(job.status, "completed"); assert.equal(job.conclusion, "success", "Validation and saved planning must pass");
    }
  }
  if (phase === "apply") assert.ok(["deploy", "destroy"].includes(operation), "Read-only operations cannot apply");
  core.setOutput("operation", operation);
  core.setOutput("main_sha", branch.commit.sha);
  core.summary.addHeading(operation === "destroy" ? "Separate cleanup authorization verified" : "Scoped automatic deployment policy verified")
    .addRaw(`Repository ID ${expected.id}; run ${context.runId}/1; commit ${context.sha}. No human deployment approval was requested or inferred. Exact saved-plan integrity, expiry and state bindings remain mandatory.`, true);
  await core.summary.write();
  return { operation, mainSha: branch.commit.sha };
}

module.exports = { authorize, assertRepository, assertEnvironmentProtection, assertRules, operationFor };
