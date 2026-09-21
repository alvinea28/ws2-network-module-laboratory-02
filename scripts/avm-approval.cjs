"use strict";
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { resolve } = require("node:path");

module.exports = async function approve({ github, context, core }) {
  assert.equal(process.env.GITHUB_RUN_ATTEMPT, "1", "Use a new plan and approval, not a credentialled rerun");
  const { data: branch } = await github.rest.repos.getBranch({ ...context.repo, branch: "main" });
  assert.ok(branch.protected && branch.commit.sha === context.sha, "Main moved or is unprotected");
  const { data: run } = await github.rest.actions.getWorkflowRun({ ...context.repo, run_id: context.runId });
  const prs = await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, { ...context.repo, commit_sha: context.sha, per_page: 100 });
  const merged = prs.filter((pr) => pr.merged_at && pr.base.ref === "main" && pr.merge_commit_sha === context.sha);
  assert.ok(merged.length, "Only a reviewed merged-main commit may mutate Azure");
  const authors = new Set(merged.map((pr) => pr.user.id));
  const actors = new Set([run.actor?.id, run.triggering_actor?.id, context.payload?.sender?.id].filter(Number.isSafeInteger));
  const actorLogins = new Set([run.actor?.login, run.triggering_actor?.login, context.actor].filter((login) => typeof login === "string").map((login) => login.toLowerCase()));
  const approvals = await github.paginate("GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals", { ...context.repo, run_id: context.runId, per_page: 100 });
  const approval = approvals.find((entry) => entry.state === "approved" && entry.environments?.some((env) => env.name === "avm-apply") && entry.user?.type === "User" && Number.isSafeInteger(entry.user.id) && typeof entry.user.login === "string" && !authors.has(entry.user.id) && !actors.has(entry.user.id) && !actorLogins.has(entry.user.login.toLowerCase()));
  assert.ok(approval, "A real independent avm-apply environment approval is required");
  const { assertEnvironmentProtection } = await import(pathToFileURL(resolve("scripts/avm-policy.mjs")).href);
  const { data: environment } = await github.rest.repos.getEnvironment({ ...context.repo, environment_name: "avm-apply" });
  const branches = await github.paginate(github.rest.repos.listDeploymentBranchPolicies, { ...context.repo, environment_name: "avm-apply", per_page: 100 });
  assertEnvironmentProtection(environment, branches);
  core.setOutput("main_sha", branch.commit.sha);
  core.summary.addHeading("Independent AVM approval verified").addRaw(`Run ${context.runId}; exact plan, provenance and current-main bindings are checked immediately before apply.`, true);
  await core.summary.write();
};
