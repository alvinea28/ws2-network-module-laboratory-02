"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const run = require("./auto-guide.cjs");
const A = "a".repeat(40), B = "b".repeat(40), C = "c".repeat(40);
const bot = { login: "github-actions[bot]", type: "Bot" };
const config = { id: "test", title: "Test exercise", steps: [
  { id: "1", title: "Push first change", lesson: ".github/steps/01.md", checks: [{ kind: "json", path: "exercise/team.json", nonempty: ["team"] }] },
  { id: "2", title: "Push second change", lesson: ".github/steps/02.md", checks: [{ kind: "file", path: "exercise/notes.md", contains: ["reviewed"], notContains: ["TODO"] }] },
] };
function fake() {
  const m = { issues: [], comments: [], branches: { dev: A }, files: new Map(), writes: [], runs: [], jobs: [], prs: [], reviews: [], metadata: { full_name: "test/copy", default_branch: "dev", is_template: false }, denyReadme: false };
  const repo = { owner: "test", repo: "copy" };
  const readme = "# Lab\n<!-- AGENTALVINE:START -->\nCopy exercise\n<!-- AGENTALVINE:END -->\n";
  m.files.set("README.md", readme);
  m.files.set("exercise/team.json", '{"team":"TODO"}');
  m.files.set("exercise/notes.md", "TODO");
  const response = (value) => ({ data: structuredClone(value) });
  const github = { rest: {
    repos: {
      get: async () => response(m.metadata),
      getBranch: async ({ branch }) => { if (!m.branches[branch]) throw Object.assign(new Error(), { status: 404 }); return response({ commit: { sha: m.branches[branch] } }); },
      getContent: async ({ path }) => { if (!m.files.has(path)) throw Object.assign(new Error(), { status: 404 }); const text = m.files.get(path); return response({ type: "file", encoding: "base64", size: text.length, sha: A, content: Buffer.from(text).toString("base64") }); },
      createOrUpdateFileContents: async (args) => { if (m.denyReadme) throw Object.assign(new Error(), { status: 403 }); m.writes.push(args); m.files.set(args.path, Buffer.from(args.content, "base64").toString()); return response({}); },
      getReleaseByTag: async () => response(m.release), getCommit: async () => response({ sha: m.tagSha }),
    },
    issues: {
      listForRepo: async () => response(m.issues),
      create: async (args) => { const issue = { ...args, number: 1, state: "open", user: bot, html_url: "https://github.com/test/copy/issues/1" }; m.issues.push(issue); return response(issue); },
      update: async (args) => { Object.assign(m.issues.find((issue) => issue.number === args.issue_number), args); return response({}); },
      createComment: async (args) => { m.comments.push(args); return response({}); },
    },
    actions: { listWorkflowRuns: async () => response({ workflow_runs: m.runs }), listJobsForWorkflowRun: async () => response({ jobs: m.jobs }) },
    pulls: { list: async () => response(m.prs), get: async () => response(m.pr), listFiles: async () => response(m.changed), listReviews: async () => response(m.reviews) },
  }, paginate: async (endpoint, args) => { const { data } = await endpoint(args); return Array.isArray(data) ? data : data.workflow_runs || data.jobs; } };
  const context = { repo, eventName: "push", ref: "refs/heads/dev", runId: 1, payload: { repository: { full_name: "test/copy" }, sender: { type: "User" }, after: A } };
  const core = { notice: () => {} };
  const call = () => run({ github, context, core, config, now: () => "2026-09-07T12:00:00Z", readLesson: () => "Edit the file, commit and push. [Help](../../solutions/README.md)" });
  const push = (sha, file, text) => { context.runId += 1; context.eventName = "push"; context.payload.after = sha; m.branches.dev = sha; if (file) m.files.set(file, text); };
  return { m, github, context, core, call, push, state: () => run.readState(m.issues[0].body, config) };
}

test("copy automatically opens first issue and replaces README start block", async () => {
  const f = fake(); await f.call(); assert.equal(f.m.issues.length, 1); assert.equal(f.state().step, 0);
  assert.match(f.m.issues[0].body, /Step 1: Push first change/); assert.match(f.m.files.get("README.md"), /Start here → open your exercise issue/);
  assert.match(f.m.issues[0].body, /blob\/dev\/solutions\/README.md/);
});
test("no-change starter does not auto-complete and repeated startup creates no duplicate", async () => {
  const f = fake(); await f.call(); f.context.runId++; await f.call(); assert.equal(f.m.issues.length, 1); assert.equal(f.state().step, 0);
});
test("real pushes update the ISSUE BODY checklist and current instructions automatically", async () => {
  const f = fake(); await f.call(); f.push(B, "exercise/team.json", '{"team":"Team One"}'); await f.call();
  assert.equal(f.state().step, 1); assert.match(f.m.issues[0].body, /\[x\] 1\./); assert.match(f.m.issues[0].body, /Step 2: Push second change/);
  assert.equal(f.m.comments.length, 1); assert.equal(f.m.issues.length, 1);
});
test("replaying the same Actions run cannot skip the next step", async () => {
  const f = fake(); await f.call(); f.push(B, "exercise/team.json", '{"team":"Team One"}'); await f.call();
  f.m.files.set("exercise/notes.md", "reviewed"); await f.call(); assert.equal(f.state().step, 1);
});
test("bad push stays on the current step with useful feedback", async () => {
  const f = fake(); await f.call(); f.push(B, "exercise/team.json", "broken JSON"); await f.call();
  assert.equal(f.state().step, 0); assert.match(f.m.issues[0].body, /needs valid JSON/);
});
test("completion closes issue and links completed progress from README", async () => {
  const f = fake(); await f.call(); f.push(B, "exercise/team.json", '{"team":"Team One"}'); await f.call();
  f.push(C, "exercise/notes.md", "reviewed"); await f.call(); assert.equal(f.m.issues[0].state, "closed"); assert.equal(f.state().step, 2);
  assert.match(f.m.files.get("README.md"), /Review your completed exercise/);
});
test("template maintenance stays inert; preview is explicit and never awards progress", async () => {
  const f = fake(); f.m.metadata.is_template = true; await f.call(); assert.equal(f.m.issues.length, 0);
  f.context.eventName = "workflow_dispatch"; f.context.payload.inputs = { mode: "Preview" }; await f.call();
  assert.equal(f.state().preview, true); assert.equal(f.m.writes.length, 0); f.context.runId++; await f.call(); assert.equal(f.state().step, 0);
});
test("protected README is respected without breaking issue progress", async () => {
  const f = fake(); f.m.denyReadme = true; await f.call(); assert.equal(f.m.issues.length, 1);
  f.push(B, "exercise/team.json", '{"team":"Team One"}'); await f.call(); assert.equal(f.state().step, 1);
});
test("late pushes and stale/forked workflow completions cannot move progress backwards", async () => {
  const f = fake(); await f.call(); f.push(B, "exercise/team.json", '{"team":"Team One"}'); await f.call();
  f.context.runId++; f.context.payload.after = A; await f.call(); assert.equal(f.state().sha, B);
  f.context.eventName = "workflow_run"; f.context.payload.workflow_run = { head_sha: A, head_branch: "dev", head_repository: { full_name: "test/copy" } }; await f.call(); assert.equal(f.state().sha, B);
  assert.equal(run.eventSnapshot({ eventName: "workflow_run", payload: { repository: { full_name: "test/copy" }, workflow_run: { head_sha: B, head_branch: "dev", head_repository: { full_name: "outsider/fork" } } } }, { sha: C }, f.state()), null);
});
test("file checks reject placeholders and unsafe paths without executing data", () => {
  assert.ok(run.checkFile({ kind: "json", nonempty: ["team"] }, '{"team":"TODO"}'));
  assert.equal(run.checkFile({ kind: "file", contains: ["for_each"], notContains: ["TODO"] }, "for_each = var.subnets"), null);
  for (const name of ["../secret", "/tmp/file", "terraform.tfstate", ".terraform/providers", "folder//file", ".env"]) assert.throws(() => run.relativePath(name));
});
test("workflow gate requires current SHA, real workflow path and successful named jobs", async () => {
  const f = fake(); await f.call(); const state = { ...f.state(), sha: B };
  const api = { github: f.github, repo: f.context.repo, full: "test/copy", state };
  const check = { kind: "workflow", file: "lab-checks.yml", jobs: ["Test learner module"] };
  f.m.runs = [{ id: 5, path: ".github/workflows/lab-checks.yml", head_sha: B, head_repository: { full_name: "test/copy" }, status: "completed", conclusion: "success", event: "push", created_at: "2026-09-07T12:01:00Z" }];
  f.m.jobs = [{ name: "Test learner module", conclusion: "success" }]; assert.equal(await run.evaluate(check, api), null);
  f.m.jobs[0].conclusion = "skipped"; assert.ok(await run.evaluate(check, api)); f.m.jobs[0].conclusion = "success";
  f.m.runs[0].head_sha = A; assert.ok(await run.evaluate(check, api));
});
test("live jobs cannot be replaced by skipped, old, fork, PR or rerun records", async () => {
  const f = fake(); await f.call(); const api = { github: f.github, repo: f.context.repo, full: "test/copy", state: f.state() };
  const check = { kind: "trusted-run", file: "delivery.yml", jobs: ["Apply reviewed dev plan"] };
  const base = { id: 8, head_sha: A, path: ".github/workflows/delivery.yml", head_branch: "main", head_repository: { full_name: "test/copy" }, status: "completed", conclusion: "success", event: "workflow_dispatch", run_attempt: 1, created_at: "2026-09-07T12:01:00Z" };
  f.m.jobs = [{ name: "Apply reviewed dev plan", conclusion: "success" }]; f.m.runs = [base]; assert.equal(await run.evaluate(check, api), null);
  for (const patch of [{ conclusion: "skipped" }, { event: "pull_request" }, { run_attempt: 2 }, { created_at: "2026-09-06T12:00:00Z" }, { head_branch: "dev" }, { head_repository: { full_name: "bad/fork" } }]) { f.m.runs = [{ ...base, ...patch }]; assert.ok(await run.evaluate(check, api)); }
});
test("state corruption is rejected, not treated as completion", async () => {
  const f = fake(); await f.call(); assert.throws(() => run.readState(f.m.issues[0].body.replace('"step":0', '"step":999'), config));
});

test("D01 learner links use the observed SHA while reference links stay trusted", () => {
  const text = "[Work](../../exercise/team.json#owner) [API](../../docs/module-api.md) [Help](../../solutions/README.md) [Setup](../../docs/delivery-configuration.md) [Web](https://example.com/a)";
  const links = run.lessonLinks(text, ".github/steps/01.md", "test/copy", "dev", B, new Set(["exercise/team.json", "docs/module-api.md"]));
  assert.ok(links.includes(`blob/${B}/exercise/team.json#owner`));
  assert.ok(links.includes(`blob/${B}/docs/module-api.md`));
  assert.ok(links.includes("blob/dev/solutions/README.md"));
  assert.ok(links.includes("blob/dev/docs/delivery-configuration.md"));
  assert.ok(links.includes("](https://example.com/a)"));
});

test("D03 prose case folding is opt-in and restricted to Markdown", () => {
  const check = { kind: "file", path: "exercise/handover.md", contains: ["retained resources"], notContains: ["TODO"], caseInsensitive: true };
  assert.equal(run.checkFile(check, "## Retained resources\nExisting owners keep the shared RG."), null);
  assert.ok(run.checkFile(check, "## Retained resources\ntodo: identify owners"));
  assert.match(run.checkFile({ ...check, caseInsensitive: false }, "## Retained resources"), /retained resources/);
  assert.match(run.checkFile(check, "## Handover"), /retained resources/);
  assert.throws(() => run.checkFile({ ...check, path: "main.tf" }, "retained resources"), /Markdown/);
  assert.throws(() => run.checkFile({ kind: "json", path: "answer.json", caseInsensitive: true, equals: { cause: "subject-mismatch" } }, '{"cause":"SUBJECT-MISMATCH"}'), /Markdown/);
  assert.ok(run.checkFile({ kind: "json", path: "answer.json", equals: { cause: "subject-mismatch" } }, '{"cause":"SUBJECT-MISMATCH"}'));
});

test("R01 one surviving event reconciles consecutive completed tasks without skipping an unmet task", async () => {
  const f = fake(); await f.call();
  f.push(B, "exercise/team.json", '{"team":"Team One"}');
  f.m.files.set("exercise/notes.md", "reviewed");
  await f.call();
  assert.equal(f.state().step, 2);
  assert.equal(f.m.comments.length, 2);
  assert.ok(f.state().completed.every((item) => item.sha === B));
  assert.equal(f.m.issues[0].state, "closed");

  const incomplete = fake(); await incomplete.call();
  incomplete.push(B, "exercise/notes.md", "reviewed"); await incomplete.call();
  assert.equal(incomplete.state().step, 0);
});

test("R01 latest same-repository CI recovers a cancelled push without moving backwards", async () => {
  const f = fake(); await f.call();
  f.m.branches.dev = B;
  f.m.files.set("exercise/team.json", '{"team":"Team One"}');
  f.context.eventName = "workflow_run"; f.context.runId++;
  f.context.payload.workflow_run = { event: "push", status: "completed", head_sha: B, head_branch: "dev", head_repository: { full_name: "test/copy" } };
  await f.call();
  assert.equal(f.state().sha, B);
  assert.equal(f.state().step, 1);
  f.context.runId++; f.context.payload.workflow_run.head_sha = A;
  await f.call(); assert.equal(f.state().sha, B); assert.equal(f.state().step, 1);
});

test("R01 a surviving default-branch push-CI completion can initialize a lost startup", async () => {
  const f = fake(); f.context.eventName = "workflow_run";
  f.context.payload.workflow_run = { event: "push", status: "completed", head_sha: A, head_branch: "dev", head_repository: { full_name: "test/copy" } };
  await f.call();
  assert.equal(f.m.issues.length, 1);
  assert.equal(f.state().step, 0);
  assert.equal(f.state().startSha, A);
  assert.match(f.m.files.get("README.md"), /Start here/);
});

test("R01 fork, PR, alternate-branch, stale or incomplete CI cannot initialize a copy", async () => {
  for (const patch of [
    { head_repository: { full_name: "outsider/fork" } }, { event: "pull_request" },
    { head_branch: "lab/other" }, { head_sha: B }, { status: "in_progress" },
  ]) {
    const f = fake(); f.context.eventName = "workflow_run";
    f.context.payload.workflow_run = { event: "push", status: "completed", head_sha: A, head_branch: "dev", head_repository: { full_name: "test/copy" }, ...patch };
    await f.call(); assert.equal(f.m.issues.length, 0);
  }
});

test("beginner issue explicitly clones the actual copy and explains VS Code/account setup", async () => {
  const f = fake();
  await run({ github: f.github, context: f.context, core: f.core, config: { ...config, beginnerSetup: true, sourceRepository: "publisher/template", sourceBranch: "dev" }, now: () => "2026-09-08T12:00:00Z", readLesson: () => "## Your task\nEdit the named file." });
  const body = f.m.issues[0].body;
  for (const part of ["Git: Clone", "https://github.com/test/copy.git", "VS Code", "Accounts", "GitHub Copilot", "Terminal", "node scripts/doctor.mjs", "docs/start-here.md", "docs/git-workflow.md"]) assert.ok(body.includes(part), part);
  assert.ok(!body.includes("https://github.com/publisher/template.git"));
});

test("official reference screenshots use the public source branch, not private blob URLs", () => {
  const text = "![Clone screen](../../docs/images/vscode-clone-github.png) [Work](../../exercise/team.json) [Setup](../../docs/start-here.md#clone)";
  const links = run.lessonLinks(text, ".github/steps/01.md", "learner/private-copy", "main", B, new Set(["exercise/team.json"]), "publisher/public-lab", "dev");
  assert.ok(links.includes("![Clone screen](https://raw.githubusercontent.com/publisher/public-lab/dev/docs/images/vscode-clone-github.png)"));
  assert.ok(links.includes(`https://github.com/learner/private-copy/blob/${B}/exercise/team.json`));
  assert.ok(links.includes("https://github.com/learner/private-copy/blob/main/docs/start-here.md#clone"));
});

test("README automation preserves first-time clone/setup instructions outside its marker", async () => {
  const f = fake();
  f.m.files.set("README.md", "# Lab\nFirst time? [Clone and sign in](docs/start-here.md).\n<!-- AGENTALVINE:START -->\nCopy exercise\n<!-- AGENTALVINE:END -->\nOpen THIS clone in VS Code.\n");
  await f.call();
  assert.match(f.m.files.get("README.md"), /Clone and sign in/);
  assert.match(f.m.files.get("README.md"), /Open THIS clone in VS Code/);
  assert.match(f.m.files.get("README.md"), /Start here → open your exercise issue/);
});

test("public template remains inert even with detailed beginner setup enabled", async () => {
  const f = fake(); f.m.metadata.is_template = true;
  await run({ github: f.github, context: f.context, core: f.core, config: { ...config, beginnerSetup: true, sourceRepository: "publisher/public-lab", sourceBranch: "dev" }, now: () => "2026-09-08T12:00:00Z", readLesson: () => "Not executed" });
  assert.equal(f.m.issues.length, 0); assert.equal(f.m.writes.length, 0);
});

test("rich lesson rendering never rewrites Markdown links inside copyable code examples", () => {
  const code = '```markdown\n[API](docs/module-api.md)\n![Example](images/example.png)\n```\n';
  const text = `[Setup](../../docs/start-here.md)\n${code}[Work](../../exercise/team.json)\n`;
  const rendered = run.lessonLinks(text, ".github/steps/04.md", "learner/copy", "dev", B, new Set(["exercise/team.json"]));
  assert.ok(rendered.includes(code), "Code examples must be copied byte-for-byte, not rebound relative to the lesson");
  assert.ok(rendered.includes(`blob/${B}/exercise/team.json`));
  assert.ok(rendered.includes("blob/dev/docs/start-here.md"));
});

test("fenced Markdown with nested shorter fences and tilde fences remains verbatim", () => {
  const text = "before\n````markdown\n```hcl\nvalue = 1\n```\n[API](docs/module-api.md)\n````\nafter\n~~~text\n[Keep](local.md)\n~~~\nend\n";
  const result = run.outsideCodeFences(text, (part) => part.toUpperCase());
  assert.ok(result.includes("BEFORE\n")); assert.ok(result.includes("AFTER\n")); assert.ok(result.endsWith("END\n"));
  assert.ok(result.includes("[API](docs/module-api.md)")); assert.ok(result.includes("[Keep](local.md)"));
});
