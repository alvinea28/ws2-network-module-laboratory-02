import assert from "node:assert/strict";

// In-memory unit fixtures, not GitHub observations or deployment evidence. Only
// the approved profile allowlist is real; users, commits, runs and jobs are fake.
// Each repository carries its own copy so no cross-repository import is needed.
export const PROFILES = {
  avm: { id: 1379147533, repository: "alvine-aurelio-org/ws2-sim-20260921-network-module-laboratory-02", ruleset: 23780379,
    rulesetUpdatedAt: "2026-09-21T17:14:13.294Z",
    delivery: "avm-delivery.yml", cleanup: "avm-cleanup.yml", environments: ["avm-plan", "avm-apply"],
    checks: ["kit", "Test learner module", "Validate isolated Terraform companion"], validation: "Validate reviewed AVM revision", plan: "Trusted AVM plan" },
  dev: { id: 1379149907, repository: "alvine-aurelio-org/ws2-sim-20260921-azure-delivery-laboratory-07", ruleset: 23780383,
    rulesetUpdatedAt: "2026-09-21T17:14:22.201Z",
    delivery: "delivery.yml", cleanup: "cleanup.yml", environments: ["dev-plan", "dev-apply"],
    checks: ["kit", "Test learner module"], validation: "Validate reviewed delivery revision", plan: "Trusted dev plan" },
};
export const OTHER_SHA = "b".repeat(40);
export const workflowRef = (profile, cleanup = false) => `${PROFILES[profile].repository}/.github/workflows/${PROFILES[profile][cleanup ? "cleanup" : "delivery"]}@refs/heads/main`;

export function authorizationFixture(profile, { operation = "deploy", phase = "apply" } = {}) {
  const expected = PROFILES[profile], sha = "a".repeat(40), runId = 901;
  const [owner, name] = expected.repository.split("/");
  const user = { id: 101, login: "unit-author-merger-admin", type: "User" };
  const repository = { id: expected.id, full_name: expected.repository, private: true, is_template: false };
  const eventName = operation === "deploy" ? "push" : operation === "drift" ? "schedule" : "workflow_dispatch";
  const env = {
    WORKSHOP_AZURE_ENABLED: "true", REPOSITORY_PRIVATE: "true", REPOSITORY_TEMPLATE: "false",
    GITHUB_REPOSITORY: expected.repository, GITHUB_REPOSITORY_ID: String(expected.id),
    GITHUB_REF: "refs/heads/main", GITHUB_REF_PROTECTED: "true", GITHUB_SHA: sha,
    GITHUB_RUN_ID: String(runId), GITHUB_RUN_ATTEMPT: "1", GITHUB_EVENT_NAME: eventName,
    GITHUB_WORKFLOW_REF: workflowRef(profile, operation === "destroy"), OPERATION: operation, WS2_STATE_LOCK_ID: `unit-${profile}-state`,
  };
  const context = { repo: { owner, repo: name }, sha, runId, actor: user.login, eventName,
    payload: { repository: structuredClone(repository), sender: structuredClone(user) } };
  if (operation === "followup") context.payload.inputs = { operation };
  if (operation === "destroy") context.payload.inputs = { authorization: `destroy:${expected.id}:${sha}:${env.WS2_STATE_LOCK_ID}` };
  const rules = [
    { type: "deletion" }, { type: "non_fast_forward" },
    { type: "pull_request", parameters: { required_approving_review_count: 0, require_code_owner_review: false, require_last_push_approval: false,
      dismiss_stale_reviews_on_push: true, required_review_thread_resolution: true, required_reviewers: [] } },
    { type: "required_status_checks", parameters: { strict_required_status_checks_policy: true,
      required_status_checks: expected.checks.map((check) => ({ context: check, integration_id: 15368 })) } },
  ];
  const state = {
    repository, branch: { name: "main", protected: true, commit: { sha } },
    run: { id: runId, run_attempt: 1, head_sha: sha, head_branch: "main", event: eventName, status: "in_progress",
      path: `.github/workflows/${operation === "destroy" ? expected.cleanup : expected.delivery}`,
      repository: structuredClone(repository), head_repository: structuredClone(repository), actor: structuredClone(user), triggering_actor: structuredClone(user) },
    ruleset: { id: expected.ruleset, target: "branch", source_type: "Repository", source: expected.repository, enforcement: "active", bypass_actors: [],
      updated_at: expected.rulesetUpdatedAt,
      conditions: { ref_name: { include: ["refs/heads/main"], exclude: [] } }, rules },
    effective: rules.map((rule) => ({ ...structuredClone(rule), ruleset_id: expected.ruleset })),
    prs: [{ number: 7, state: "closed", merged_at: "2026-09-21T00:00:00Z", merge_commit_sha: sha,
      base: { ref: "main", repo: structuredClone(repository) }, user: structuredClone(user), merged_by: structuredClone(user) }],
    environments: Object.fromEntries(expected.environments.map((environment) => [environment, {
      name: environment, deployment_branch_policy: { protected_branches: false, custom_branch_policies: true }, can_admins_bypass: false, protection_rules: [],
    }])),
    branches: Object.fromEntries(expected.environments.map((environment) => [environment, [{ id: 11, name: "main", type: "branch" }]])),
    permission: { permission: "admin", user: structuredClone(user) },
    jobs: [expected.validation, expected.plan].map((job, index) => ({ id: index + 1, name: job, run_id: runId, head_sha: sha, status: "completed", conclusion: "success" })),
    approvals: [], errors: new Map(),
  };
  const calls = [], outputs = [], summaries = [];
  const reply = (label, actual, fields, value) => {
    calls.push(label);
    assert.deepEqual(actual, { ...context.repo, ...fields }, `Exact read-only fixture request: ${label}`);
    if (state.errors.has(label)) throw state.errors.get(label);
    return structuredClone(value);
  };
  const noApprovals = (route) => {
    if (typeof route === "string" && route.includes("/approvals")) {
      calls.push("FORBIDDEN approvals");
      throw new Error("Approval history must never be requested, even when empty");
    }
  };
  const listPrs = () => assert.fail("Use the paginated unit fixture");
  const listBranches = () => assert.fail("Use the paginated unit fixture");
  const github = {
    rest: {
      repos: {
        get: async (args) => ({ data: reply("repository", args, {}, state.repository) }),
        getBranch: async (args) => ({ data: reply("branch", args, { branch: "main" }, state.branch) }),
        getEnvironment: async (args) => {
          assert.ok(expected.environments.includes(args.environment_name));
          return { data: reply(`environment:${args.environment_name}`, args, { environment_name: args.environment_name }, state.environments[args.environment_name]) };
        },
        getCollaboratorPermissionLevel: async (args) => ({ data: reply("permission", args, { username: state.run.actor.login }, state.permission) }),
        listPullRequestsAssociatedWithCommit: listPrs, listDeploymentBranchPolicies: listBranches,
      },
      actions: { getWorkflowRun: async (args) => ({ data: reply("run", args, { run_id: context.runId }, state.run) }) },
    },
    request: async (route, args) => {
      noApprovals(route);
      assert.equal(route, "GET /repos/{owner}/{repo}/rulesets/{ruleset_id}", "No live/mutating API client exists in this fixture");
      return { data: reply("ruleset", args, { ruleset_id: expected.ruleset }, state.ruleset) };
    },
    paginate: async (route, args) => {
      noApprovals(route);
      if (route === listPrs) return reply("prs", args, { commit_sha: context.sha, per_page: 100 }, state.prs);
      if (route === listBranches) {
        assert.ok(expected.environments.includes(args.environment_name));
        return reply(`branches:${args.environment_name}`, args, { environment_name: args.environment_name, per_page: 100 }, state.branches[args.environment_name]);
      }
      if (route === "GET /repos/{owner}/{repo}/rules/branches/{branch}") return reply("effective", args, { branch: "main", per_page: 100 }, state.effective);
      assert.equal(route, "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs", "Only expected read-only fixture routes exist");
      return reply("jobs", args, { run_id: context.runId, attempt_number: 1, per_page: 100 }, state.jobs);
    },
  };
  const summary = {
    addHeading(value) { summaries.push(["heading", value]); return this; },
    addRaw(value, newline) { summaries.push(["raw", value, newline]); return this; },
    async write() { summaries.push(["write"]); },
  };
  const core = { setOutput: (key, value) => outputs.push([key, value]), summary };
  return { expected, state, env, context, calls, outputs, summaries, args: { github, context, core, env, profile, phase } };
}

export function setEvent(fixture, event) {
  fixture.context.eventName = event;
  fixture.env.GITHUB_EVENT_NAME = event;
  fixture.state.run.event = event;
}

export function assertNoOutput(fixture) {
  assert.deepEqual(fixture.outputs, [], "Rejection must not emit an apply binding");
  assert.deepEqual(fixture.summaries, [], "Rejection must not claim successful authorization");
  assert.ok(!fixture.calls.includes("FORBIDDEN approvals"), "No approval-history request is permitted");
}
