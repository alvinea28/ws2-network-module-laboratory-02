import assert from "node:assert/strict";
import test from "node:test";
import authorization from "../scripts/deployment-authorization.cjs";
import localAuthorize from "../scripts/avm-approval.cjs";
import { PROFILES, OTHER_SHA, workflowRef, authorizationFixture, assertNoOutput, setEvent } from "./deployment-fixtures.mjs";

// Unit/mocked coverage only. No GitHub SDK, credentials, network or CLI exists
// here. Repeated API responses below model freshness; they do not prove live state.
const LOCAL_PROFILE = "avm";
const { authorize } = authorization;
const rejected = async (fixture, invoke = authorize, expected) => {
  await assert.rejects(() => invoke(fixture.args), expected);
  assertNoOutput(fixture);
};
const successful = async (fixture, invoke = authorize) => {
  const result = await invoke(fixture.args);
  assert.deepEqual(result, { operation: fixture.env.OPERATION, mainSha: fixture.context.sha });
  assert.deepEqual(fixture.outputs, [["operation", fixture.env.OPERATION], ["main_sha", fixture.context.sha]]);
  assert.equal(fixture.summaries.filter(([kind]) => kind === "write").length, 1);
  assert.ok(!fixture.calls.includes("FORBIDDEN approvals"));
};

for (const profile of Object.keys(PROFILES)) test(`${profile}: scoped authorization (in-memory GitHub only)`, { concurrency: false }, async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("External HTTP is forbidden in authorization unit tests"); });
  const other = PROFILES[profile === "avm" ? "dev" : "avm"];

  for (const phase of ["preflight", "plan", "apply"]) for (const operation of ["deploy", "destroy"]) await t.test(`${operation}/${phase}: hidden bypass list needs the exact owner-verified server revision`, async () => {
    const f = authorizationFixture(profile, { phase, operation });
    delete f.state.ruleset.bypass_actors;
    await successful(f);
    for (const revision of [undefined, null, "2026-09-21T17:14:23.000Z"]) {
      const changed = authorizationFixture(profile, { phase, operation });
      delete changed.state.ruleset.bypass_actors;
      changed.state.ruleset.updated_at = revision;
      await rejected(changed, authorize, /Ruleset revision changed or unavailable/);
    }
  });

  await t.test("same user authors and merges the PR, with empty approval history and no approvals request", async () => {
    const f = authorizationFixture(profile), before = structuredClone(f.state);
    assert.equal(f.state.prs[0].user.id, f.state.prs[0].merged_by.id);
    assert.equal(f.state.prs[0].user.id, f.state.run.actor.id);
    assert.deepEqual(f.state.approvals, []);
    await successful(f);
    assert.deepEqual(f.state, before, "Authorization must not mutate its read-only metadata");
    assert.deepEqual(f.calls, ["repository", "run", "branch", "ruleset", "effective", "prs", ...f.expected.environments.flatMap((name) => [`environment:${name}`, `branches:${name}`]), "jobs"]);
    assert.match(f.summaries.flat().join(" "), /No human deployment approval was requested or inferred/);
  });

  await t.test("preflight needs no completed jobs or precomputed operation; plan needs validation only; apply needs both", async () => {
    const f = authorizationFixture(profile, { phase: "preflight" });
    const completeJobs = structuredClone(f.state.jobs);
    f.state.jobs = [];
    delete f.env.OPERATION;
    assert.deepEqual(await authorize(f.args), { operation: "deploy", mainSha: f.context.sha });
    assert.ok(!f.calls.includes("jobs"));
    f.outputs.length = 0; f.summaries.length = 0; f.env.OPERATION = "deploy";
    f.args.phase = "plan"; f.state.jobs = [completeJobs[0]];
    await successful(f);
    f.outputs.length = 0; f.summaries.length = 0;
    f.args.phase = "apply"; f.state.jobs = completeJobs;
    await successful(f);
    for (const label of ["repository", "run", "branch", "ruleset", "effective", "prs", ...f.expected.environments.map((name) => `environment:${name}`)]) assert.equal(f.calls.filter((call) => call === label).length, 3, `${label} must be reread for every phase`);
    assert.equal(f.calls.filter((call) => call === "jobs").length, 2);
  });

  for (const operation of ["followup", "drift"]) {
    for (const phase of ["preflight", "plan"]) await t.test(`${operation}/${phase} is read-only and needs no saved-plan job`, async () => {
      const f = authorizationFixture(profile, { operation, phase });
      f.state.jobs = phase === "preflight" ? [] : [f.state.jobs[0]];
      await successful(f);
    });
    await t.test(`${operation} cannot apply even with otherwise successful same-run jobs`, async () => {
      await rejected(authorizationFixture(profile, { operation }), authorize, /Read-only operations cannot apply/);
    });
  }

  const identityCases = [
    ["unapproved profile", (f) => { f.args.profile = "other"; }],
    ["disabled deployment", (f) => { f.env.WORKSHOP_AZURE_ENABLED = "false"; }],
    ["same-name recreation in API metadata", (f) => { f.state.repository.id += 1; }],
    ["same-name recreation across every advertised identity", (f) => { const id = f.expected.id + 1; f.env.GITHUB_REPOSITORY_ID = String(id); f.state.repository.id = id; f.context.payload.repository.id = id; f.state.run.repository.id = id; f.state.run.head_repository.id = id; }],
    ["numeric ID is required from GitHub", (f) => { f.state.repository.id = String(f.expected.id); }],
    ["cross-lab immutable ID", (f) => { f.env.GITHUB_REPOSITORY_ID = String(other.id); f.state.repository.id = other.id; f.context.payload.repository.id = other.id; }],
    ["environment-vs-API ID mismatch", (f) => { f.env.GITHUB_REPOSITORY_ID = String(f.expected.id + 1); }],
    ["payload-vs-API ID mismatch", (f) => { f.context.payload.repository.id += 1; }],
    ["missing immutable ID", (f) => { delete f.env.GITHUB_REPOSITORY_ID; }],
    ["public live repository", (f) => { f.state.repository.private = false; }],
    ["template live repository", (f) => { f.state.repository.is_template = true; }],
    ["public event repository", (f) => { f.context.payload.repository.private = false; }],
    ["template event repository", (f) => { f.context.payload.repository.is_template = true; }],
    ["wrong live owner", (f) => { f.state.repository.full_name = f.expected.repository.replace("alvine-aurelio-org/", "other-owner/"); }],
    ["wrong live name", (f) => { f.state.repository.full_name += "-renamed"; }],
    ["wrong event name", (f) => { f.context.payload.repository.full_name += "-renamed"; }],
    ["wrong environment name", (f) => { f.env.GITHUB_REPOSITORY = other.repository; }],
    ["wrong context owner", (f) => { f.context.repo.owner = "other-owner"; }],
    ["wrong context repository", (f) => { f.context.repo.repo += "-other"; }],
    ["unprotected Actions ref", (f) => { f.env.GITHUB_REF_PROTECTED = "false"; }],
    ["non-main Actions ref", (f) => { f.env.GITHUB_REF = "refs/heads/dev"; }],
    ["environment SHA mismatch", (f) => { f.env.GITHUB_SHA = OTHER_SHA; }],
    ["malformed source SHA", (f) => { f.env.GITHUB_SHA = f.context.sha = "main"; }],
    ["environment run ID mismatch", (f) => { f.env.GITHUB_RUN_ID = "902"; }],
    ["environment event mismatch", (f) => { f.env.GITHUB_EVENT_NAME = "workflow_dispatch"; }],
    ["Actions rerun attempt", (f) => { f.env.GITHUB_RUN_ATTEMPT = "2"; }],
    ["missing attempt", (f) => { delete f.env.GITHUB_RUN_ATTEMPT; }],
    ["main moved", (f) => { f.state.branch.commit.sha = OTHER_SHA; }],
    ["main unprotected in API", (f) => { f.state.branch.protected = false; }],
  ];
  for (const [label, mutate] of identityCases) await t.test(`reject ${label} without outputs`, async () => {
    const f = authorizationFixture(profile); mutate(f); await rejected(f);
  });

  for (const [label, mutate] of [
    ["wrong run ID", (r) => { r.id += 1; }], ["wrong attempt", (r) => { r.run_attempt = 2; }],
    ["wrong head SHA", (r) => { r.head_sha = OTHER_SHA; }], ["wrong head branch", (r) => { r.head_branch = "dev"; }],
    ["wrong event", (r) => { r.event = "workflow_dispatch"; }], ["wrong workflow path", (r) => { r.path = ".github/workflows/other.yml"; }],
    ["wrong run repository", (r) => { r.repository.id = other.id; }], ["wrong head repository", (r) => { r.head_repository.id = other.id; }],
    ["missing head repository", (r) => { delete r.head_repository; }],
    ...["completed", "queued", "waiting", "requested"].map((status) => [`non-progress run ${status}`, (r) => { r.status = status; }]),
  ]) await t.test(`reject ${label}`, async () => {
    const f = authorizationFixture(profile); mutate(f.state.run); await rejected(f);
  });

  for (const [label, mutate] of [
    ["different ruleset ID", (f) => { f.state.ruleset.id += 1; }],
    ["inactive ruleset", (f) => { f.state.ruleset.enforcement = "evaluate"; }],
    ["tag ruleset", (f) => { f.state.ruleset.target = "tag"; }],
    ["inherited ruleset source", (f) => { f.state.ruleset.source_type = "Organization"; }],
    ["different ruleset repository", (f) => { f.state.ruleset.source = other.repository; }],
    ["bypass actor", (f) => { f.state.ruleset.bypass_actors = [{ actor_id: 5, actor_type: "RepositoryRole", bypass_mode: "always" }]; }],
    ["non-main ruleset", (f) => { f.state.ruleset.conditions.ref_name.include = ["refs/heads/dev"]; }],
    ["broad ruleset", (f) => { f.state.ruleset.conditions.ref_name.include.push("refs/heads/other"); }],
    ["excluded main", (f) => { f.state.ruleset.conditions.ref_name.exclude = ["refs/heads/main"]; }],
    ["different effective ruleset", (f) => { f.state.effective[0].ruleset_id = other.ruleset; }],
  ]) await t.test(`reject ${label}`, async () => {
    const f = authorizationFixture(profile); mutate(f); await rejected(f);
  });

  const prRule = (rules) => rules.find((rule) => rule.type === "pull_request").parameters;
  const checkRule = (rules) => rules.find((rule) => rule.type === "required_status_checks").parameters;
  for (const source of ["stored", "effective"]) for (const [label, mutate] of [
    ["missing deletion protection", (r) => { r.splice(r.findIndex((rule) => rule.type === "deletion"), 1); }],
    ["missing force-push protection", (r) => { r.splice(r.findIndex((rule) => rule.type === "non_fast_forward"), 1); }],
    ["missing PR requirement", (r) => { r.splice(r.findIndex((rule) => rule.type === "pull_request"), 1); }],
    ["extra policy", (r) => { r.push({ type: "required_signatures" }); }],
    ["changed approving review count", (r) => { prRule(r).required_approving_review_count = 1; }],
    ["changed code-owner review", (r) => { prRule(r).require_code_owner_review = true; }],
    ["changed last-push approval", (r) => { prRule(r).require_last_push_approval = true; }],
    ["disabled stale-review dismissal", (r) => { prRule(r).dismiss_stale_reviews_on_push = false; }],
    ["unresolved PR threads", (r) => { prRule(r).required_review_thread_resolution = false; }],
    ["new required PR reviewer", (r) => { prRule(r).required_reviewers = [{ id: 77 }]; }],
    ["non-strict checks", (r) => { checkRule(r).strict_required_status_checks_policy = false; }],
    ["wrong check app identity", (r) => { checkRule(r).required_status_checks[0].integration_id = 1; }],
    ["unbound check app identity", (r) => { checkRule(r).required_status_checks[0].integration_id = null; }],
    ["missing check", (r) => { checkRule(r).required_status_checks.pop(); }],
    ["duplicate check", (r) => { checkRule(r).required_status_checks.push(structuredClone(checkRule(r).required_status_checks[0])); }],
    ["renamed check", (r) => { checkRule(r).required_status_checks[0].context = "untrusted check"; }],
  ]) await t.test(`reject ${source} rules: ${label}`, async () => {
    const f = authorizationFixture(profile); mutate(source === "stored" ? f.state.ruleset.rules : f.state.effective); await rejected(f);
  });

  for (const [label, mutate] of [
    ["missing merged PR", (f) => { f.state.prs = []; }], ["unmerged PR", (f) => { f.state.prs[0].merged_at = null; }],
    ["wrong base branch", (f) => { f.state.prs[0].base.ref = "dev"; }], ["wrong base repository", (f) => { f.state.prs[0].base.repo.id = other.id; }],
    ["different merged commit", (f) => { f.state.prs[0].merge_commit_sha = OTHER_SHA; }],
  ]) await t.test(`reject ${label}`, async () => {
    const f = authorizationFixture(profile); mutate(f); await rejected(f, authorize, /actual merged protected-main PR/);
  });

  for (const name of PROFILES[profile].environments) for (const [label, mutate] of [
    ["reviewers reintroduced", (e) => { e.protection_rules.push({ type: "required_reviewers", prevent_self_review: true, reviewers: [{ id: 88 }] }); }],
    ["empty required-reviewers rule", (e) => { e.protection_rules.push({ type: "required_reviewers", reviewers: [] }); }],
    ["unknown protections", (e) => { delete e.protection_rules; }],
    ["admin bypass", (e) => { e.can_admins_bypass = true; }], ["unknown bypass", (e) => { delete e.can_admins_bypass; }],
    ["all protected branches", (e) => { e.deployment_branch_policy = { protected_branches: true, custom_branch_policies: false }; }],
  ]) await t.test(`reject ${name}: ${label}`, async () => {
    const f = authorizationFixture(profile); mutate(f.state.environments[name]); await rejected(f);
  });
  for (const name of PROFILES[profile].environments) for (const branches of [[], [{ name: "dev", type: "branch" }], [{ name: "*", type: "branch" }], [{ name: "main", type: "tag" }], [{ name: "main", type: "branch" }, { name: "dev", type: "branch" }]]) await t.test(`reject ${name} branches ${JSON.stringify(branches)}`, async () => {
    const f = authorizationFixture(profile); f.state.branches[name] = branches; await rejected(f, authorize, /Only main/);
  });

  for (const [label, mutate] of [
    ...["pull_request", "pull_request_target", "workflow_run", "repository_dispatch"].map((event) => [`unsupported event ${event}`, (f) => setEvent(f, event)]),
    ...[undefined, "plan", "deploy", "destroy", "drift"].map((operation) => [`unsupported delivery dispatch ${String(operation)}`, (f) => { setEvent(f, "workflow_dispatch"); f.context.payload.inputs = { operation }; f.env.OPERATION = operation; }]),
    ["event-operation mismatch", (f) => { f.env.OPERATION = "destroy"; }],
    ["scheduled deploy", (f) => setEvent(f, "schedule")],
    ["missing workflow ref", (f) => { delete f.env.GITHUB_WORKFLOW_REF; }],
    ["non-main workflow ref", (f) => { f.env.GITHUB_WORKFLOW_REF = workflowRef(profile).replace("@refs/heads/main", "@refs/heads/dev"); }],
    ["foreign workflow ref", (f) => { f.env.GITHUB_WORKFLOW_REF = workflowRef(profile === "avm" ? "dev" : "avm"); }],
    ["unsupported workflow path", (f) => { f.env.GITHUB_WORKFLOW_REF = workflowRef(profile).replace(f.expected.delivery, "other.yml"); }],
  ]) await t.test(`reject route: ${label}`, async () => {
    const f = authorizationFixture(profile); mutate(f); await rejected(f);
  });

  for (const phase of ["plan", "apply"]) for (const jobIndex of phase === "plan" ? [0] : [0, 1]) for (const [label, mutate] of [
    ["missing", (jobs, i) => { jobs.splice(i, 1); }], ["duplicate", (jobs, i) => { jobs.push(structuredClone(jobs[i])); }],
    ["wrong run", (jobs, i) => { jobs[i].run_id += 1; }], ["wrong SHA", (jobs, i) => { jobs[i].head_sha = OTHER_SHA; }],
    ["wrong name", (jobs, i) => { jobs[i].name += "-untrusted"; }],
    ...["queued", "in_progress"].map((status) => [status, (jobs, i) => { jobs[i].status = status; jobs[i].conclusion = null; }]),
    ...["failure", "cancelled", "skipped", "timed_out", "neutral", null].map((conclusion) => [String(conclusion), (jobs, i) => { jobs[i].conclusion = conclusion; }]),
  ]) await t.test(`${phase} rejects ${jobIndex === 0 ? "validation" : "saved-plan"} job ${label}`, async () => {
    const f = authorizationFixture(profile, { phase }); mutate(f.state.jobs, jobIndex); await rejected(f);
  });

  for (const phase of ["preflight", "plan", "apply"]) await t.test(`dedicated cleanup/${phase} accepts exact admin authorization with matching User IDs`, async () => {
    const f = authorizationFixture(profile, { operation: "destroy", phase });
    if (phase === "preflight") f.state.jobs = [];
    if (phase === "plan") f.state.jobs.pop();
    assert.equal(f.context.payload.inputs.authorization, `destroy:${f.expected.id}:${f.context.sha}:${f.env.WS2_STATE_LOCK_ID}`);
    for (const user of [f.state.run.actor, f.state.run.triggering_actor, f.context.payload.sender, f.state.permission.user]) { assert.equal(user.type, "User"); assert.equal(user.id, f.state.run.actor.id); }
    await successful(f);
    assert.ok(f.calls.includes("permission"));
    assert.match(f.summaries.flat().join(" "), /Separate cleanup authorization verified/);
  });

  for (const [label, mutate] of [
    ["missing authorization", (f) => { delete f.context.payload.inputs.authorization; }],
    ["generic confirmation", (f) => { f.context.payload.inputs.authorization = "destroy"; }],
    ["wrong repository authorization", (f) => { f.context.payload.inputs.authorization = `destroy:${other.id}:${f.context.sha}:${f.env.WS2_STATE_LOCK_ID}`; }],
    ["stale SHA authorization", (f) => { f.context.payload.inputs.authorization = `destroy:${f.expected.id}:${OTHER_SHA}:${f.env.WS2_STATE_LOCK_ID}`; }],
    ["wrong state authorization", (f) => { f.context.payload.inputs.authorization += "-other"; }],
    ["changed state lock", (f) => { f.env.WS2_STATE_LOCK_ID += "-other"; }],
    ["missing state lock", (f) => { delete f.env.WS2_STATE_LOCK_ID; }],
    ["invalid state lock", (f) => { f.env.WS2_STATE_LOCK_ID = "bad/state"; f.context.payload.inputs.authorization = `destroy:${f.expected.id}:${f.context.sha}:bad/state`; }],
    ...["write", "maintain", "read", "none"].map((permission) => [`non-admin ${permission}`, (f) => { f.state.permission.permission = permission; }]),
    ["wrong current owner ID", (f) => { f.state.permission.user.id += 1; }],
    ["missing current owner ID", (f) => { delete f.state.permission.user.id; }],
    ["bot actor", (f) => { f.state.run.actor.type = "Bot"; }],
    ["missing actor ID", (f) => { delete f.state.run.actor.id; }],
    ["nonnumeric actor ID", (f) => { f.state.run.actor.id = "101"; }],
    ["different triggering actor", (f) => { f.state.run.triggering_actor.id += 1; }],
    ["missing triggering actor", (f) => { delete f.state.run.triggering_actor; }],
    ["different sender", (f) => { f.context.payload.sender.id += 1; }],
    ["missing sender", (f) => { delete f.context.payload.sender; }],
    ["delivery workflow cannot clean up", (f) => { f.env.GITHUB_WORKFLOW_REF = workflowRef(profile); f.state.run.path = `.github/workflows/${f.expected.delivery}`; }],
    ["push cannot clean up", (f) => setEvent(f, "push")], ["schedule cannot clean up", (f) => setEvent(f, "schedule")],
    ["cleanup cannot deploy", (f) => { f.context.payload.inputs.operation = "deploy"; }],
  ]) await t.test(`reject cleanup: ${label}`, async () => {
    const f = authorizationFixture(profile, { operation: "destroy" }); mutate(f); await rejected(f);
  });

  for (const phase of ["plan", "apply"]) for (const [label, mutate] of [
    ["repository became public", (f) => { f.state.repository.private = false; }],
    ["main moved", (f) => { f.state.branch.commit.sha = OTHER_SHA; }],
    ["ruleset gained bypass", (f) => { f.state.ruleset.bypass_actors = [{ actor_id: 1 }]; }],
    ["reviewers reintroduced", (f) => { f.state.environments[f.expected.environments[1]].protection_rules = [{ type: "required_reviewers" }]; }],
  ]) await t.test(`fresh mocked ${phase} metadata rejects ${label} after successful preflight`, async () => {
    const f = authorizationFixture(profile, { phase: "preflight" });
    await successful(f); f.outputs.length = 0; f.summaries.length = 0;
    f.args.phase = phase; mutate(f); await rejected(f);
    assert.equal(f.calls.filter((call) => call === "repository").length, 2);
  });
  await t.test("cleanup rechecks current admin permission rather than caching successful preflight", async () => {
    const f = authorizationFixture(profile, { operation: "destroy", phase: "preflight" });
    await successful(f); f.outputs.length = 0; f.summaries.length = 0;
    f.args.phase = "apply"; f.state.permission.permission = "write";
    await rejected(f, authorize, /current repository admin/);
    assert.equal(f.calls.filter((call) => call === "permission").length, 2);
  });
  const endpoints = ["repository", "run", "branch", "ruleset", "effective", "prs", ...PROFILES[profile].environments.flatMap((name) => [`environment:${name}`, `branches:${name}`]), "permission", "jobs"];
  for (const endpoint of endpoints) await t.test(`unavailable mocked ${endpoint} metadata fails closed`, async () => {
    const f = authorizationFixture(profile, { operation: "destroy" });
    const error = Object.assign(new Error(`Synthetic unavailable metadata: ${endpoint}`), { status: 403 });
    f.state.errors.set(endpoint, error); await rejected(f, authorize, (actual) => actual === error);
  });
});

test("local historical wrapper fixes its profile and never accepts the other lab or caller-selected scope", { concurrency: false }, async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("External HTTP is forbidden in wrapper unit tests"); });
  for (const operation of ["deploy", "destroy"]) {
    const f = authorizationFixture(LOCAL_PROFILE, { operation });
    f.args.profile = LOCAL_PROFILE === "avm" ? "dev" : "avm";
    await successful(f, localAuthorize);
  }
  const other = authorizationFixture(LOCAL_PROFILE === "avm" ? "dev" : "avm");
  await rejected(other, localAuthorize);
});
