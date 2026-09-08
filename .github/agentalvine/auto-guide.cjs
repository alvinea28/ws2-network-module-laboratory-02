"use strict";
// AgentAlvine: trusted control-plane code. Never import or execute learner code.
const fs = require("node:fs");
const path = require("node:path");
const BOT = "github-actions[bot]";
const MARKER = "<!-- agentalvine:auto:v2 -->";
const STATE = "<!-- agentalvine-state:v2 ";
const END = " -->";
const MAX_FILE = 180_000;
const shaPattern = /^[a-f0-9]{40}$/;
const bot = (item) => item?.user?.login === BOT && item.user.type === "Bot";
const ensure = (value, message) => { if (!value) throw new Error(message); };

function relativePath(value) {
  ensure(typeof value === "string" && /^[\w./-]+$/.test(value) && value.length < 240, "Invalid configured path");
  ensure(!value.startsWith("/") && !value.split("/").some((part) => ["", ".", ".."].includes(part)), "Unsafe path");
  ensure(!/\.tfstate|\.tfplan|(?:^|\/)\.terraform(?:\/|$)|(?:^|\/)\.env$/.test(value), "State and secrets are not exercise evidence");
  return value;
}

function readState(body, config) {
  const start = body.indexOf(STATE);
  ensure(start >= 0, "Exercise state is missing");
  const end = body.indexOf(END, start);
  ensure(end > start && end - start < 20_000, "Invalid exercise state");
  const state = JSON.parse(body.slice(start + STATE.length, end));
  ensure(state && state.lab === config.id && state.version === 2, "Wrong exercise state");
  ensure(Number.isInteger(state.step) && state.step >= 0 && state.step <= config.steps.length, "Invalid progress");
  ensure(shaPattern.test(state.startSha) && shaPattern.test(state.sha) && Number.isFinite(Date.parse(state.startedAt)), "Invalid source identity");
  ensure(Array.isArray(state.completed) && state.completed.length === state.step, "Invalid progress records");
  ensure(state.completed.every((item, index) => item.id === config.steps[index].id && shaPattern.test(item.sha)), "Invalid step sequence");
  ensure(Array.isArray(state.events) && state.events.length <= 100 && state.events.every((key) => typeof key === "string"), "Invalid event history");
  return state;
}

function eventSnapshot(context, current, state) {
  const event = context.eventName;
  const p = context.payload;
  if (event === "push") {
    if (p.deleted || !context.ref?.startsWith("refs/heads/") || !shaPattern.test(p.after || "")) return null;
    return { sha: p.after, branch: context.ref.slice("refs/heads/".length) };
  }
  if (["pull_request_target", "pull_request", "pull_request_review"].includes(event)) {
    const pr = p.pull_request;
    if (pr.head.repo?.full_name !== p.repository.full_name) return null;
    return { sha: pr.merged ? pr.merge_commit_sha : pr.head.sha, branch: pr.merged ? pr.base.ref : pr.head.ref };
  }
  if (event === "workflow_run") {
    const run = p.workflow_run;
    if (run.head_repository?.full_name !== p.repository.full_name || run.event === "pull_request_target") return null;
    // The live branch-head check in run() rejects stale completions. Comparing
    // only with cached state would also reject NEW CI after a cancelled push.
    return { sha: run.head_sha, branch: run.head_branch };
  }
  if (event === "release") return current;
  return state ? { sha: state.sha, branch: state.branch } : current;
}

function resolveField(value, dotted) {
  return dotted.split(".").reduce((object, key) => object?.[key], value);
}

function checkFile(check, text) {
  ensure(!check.caseInsensitive || (check.kind === "file" && check.path?.endsWith(".md")), "Case-insensitive prose checks are restricted to Markdown files");
  if (text === null) return `Create and push ${check.path}.`;
  if (/\.(?:tf|tftest\.hcl|tfvars\.example)$/.test(check.path || "")) text = text.split(/\r?\n/).filter((line) => !/^\s*(?:#|\/\/)/.test(line)).join("\n");
  if (check.kind === "json") {
    let value;
    try { value = JSON.parse(text); } catch { return `${check.path} needs valid JSON.`; }
    for (const [key, expected] of Object.entries(check.equals || {})) if (JSON.stringify(resolveField(value, key)) !== JSON.stringify(expected)) return `Set ${key} correctly in ${check.path}.`;
    for (const key of check.nonempty || []) {
      const field = resolveField(value, key);
      if (typeof field !== "string" || field.trim().length < 3 || /TODO|REPLACE_ME|YOUR_NAME/i.test(field)) return `Fill in ${key} in ${check.path}.`;
    }
  }
  const contains = (token) => check.caseInsensitive ? text.toLowerCase().includes(token.toLowerCase()) : text.includes(token);
  for (const token of check.contains || []) if (!contains(token)) return `${check.path} is missing required text: “${token}”. Follow this step's example.`;
  for (const token of check.notContains || []) if (contains(token)) return `Finish the marked task “${token}” in ${check.path}.`;
  if (check.pattern && !new RegExp(check.pattern, "m").test(text)) return `Check the required structure in ${check.path}.`;
  return null;
}

function makeReader(github, repo, sha) {
  const cache = new Map();
  return async (file) => {
    relativePath(file);
    if (cache.has(file)) return cache.get(file);
    try {
      const { data } = await github.rest.repos.getContent({ ...repo, path: file, ref: sha });
      if (Array.isArray(data) || data.type !== "file" || data.encoding !== "base64" || data.size > MAX_FILE) return null;
      const text = Buffer.from(data.content, "base64").toString("utf8");
      cache.set(file, text);
      return text;
    } catch (error) { if (error.status === 404) { cache.set(file, null); return null; } throw error; }
  };
}

async function evaluate(check, api) {
  const { github, repo, full, state, read, defaultBranch } = api;
  if (["file", "json"].includes(check.kind)) return checkFile(check, await read(check.path));
  if (check.kind === "setting") {
    ensure(["has_issues", "has_discussions", "has_projects"].includes(check.name), "Unsupported setting");
    const { data } = await github.rest.repos.get(repo);
    return data[check.name] === check.value ? null : `Enable ${check.name.replace("has_", "")} in repository Settings, then use Actions → AgentAlvine → Check progress.`;
  }
  if (check.kind === "issue") {
    const issues = await github.paginate(github.rest.issues.listForRepo, { ...repo, state: "all", per_page: 100 });
    return issues.some((issue) => !issue.pull_request && issue.user.type === "User" && Date.parse(issue.created_at) >= Date.parse(state.startedAt) && issue.title.includes(check.titleIncludes || "") && (check.bodyIncludes || []).every((part) => (issue.body || "").includes(part))) ? null : `Open the change-request issue described below (title includes “${check.titleIncludes}”).`;
  }
  if (check.kind === "pull_request") {
    const prs = await github.paginate(github.rest.pulls.list, { ...repo, state: "all", base: defaultBranch, per_page: 100 });
    for (const summary of prs) {
      if (summary.head.repo?.full_name !== full || summary.user.type !== "User" || Date.parse(summary.created_at) < Date.parse(state.startedAt)) continue;
      if (check.branchPrefix && !summary.head.ref.startsWith(check.branchPrefix)) continue;
      const { data: pr } = await github.rest.pulls.get({ ...repo, pull_number: summary.number });
      if (check.state === "merged" ? !pr.merged : pr.state !== "open" || pr.draft) continue;
      if (check.state !== "merged" && pr.head.sha !== state.sha) continue;
      if (check.changed?.length) {
        const files = await github.paginate(github.rest.pulls.listFiles, { ...repo, pull_number: pr.number, per_page: 100 });
        if (!check.changed.every((file) => files.some((item) => item.filename === file && item.status !== "removed"))) continue;
      }
      if (check.reviewed) {
        const reviews = await github.paginate(github.rest.pulls.listReviews, { ...repo, pull_number: pr.number, per_page: 100 });
        const decisions = new Map();
        for (const review of reviews) if (["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(review.state)) decisions.set(review.user.login, review);
        if ([...decisions.values()].some((review) => review.state === "CHANGES_REQUESTED")) continue;
        if (![...decisions.values()].some((review) => review.state === "APPROVED" && review.commit_id === pr.head.sha && review.user.type === "User" && review.user.login !== pr.user.login)) continue;
      }
      return null;
    }
    return check.state === "merged" ? "Have a peer review the final revision, then merge your lab PR." : "Open the lab pull request from your exercise branch.";
  }
  if (["workflow", "trusted-run"].includes(check.kind)) {
    ensure(/^[\w-]+\.yml$/.test(check.file), "Unsupported workflow file");
    const trusted = check.kind === "trusted-run";
    const params = { ...repo, workflow_id: check.file, per_page: 100 };
    if (!trusted) params.head_sha = state.sha;
    else params.branch = "main";
    let runs;
    try { runs = await github.paginate(github.rest.actions.listWorkflowRuns, params); } catch (error) { if (error.status === 404) return `Create and run ${check.file} as shown below.`; throw error; }
    const candidates = runs.filter((run) => run.head_repository?.full_name === full && run.path === `.github/workflows/${check.file}` && run.status === "completed" && run.conclusion === (check.conclusion || "success") && Date.parse(run.created_at) >= Date.parse(state.startedAt) && (trusted ? run.head_branch === "main" && ["push", "workflow_dispatch", "schedule"].includes(run.event) && run.run_attempt === 1 : run.head_sha === state.sha && ["push", "pull_request", "workflow_dispatch"].includes(run.event)));
    for (const run of candidates) {
      if (trusted && (run.head_sha !== state.sha || Date.parse(run.created_at) < Date.parse(state.completed.at(-1)?.at || state.startedAt))) continue;
      if (check.jobs?.length) {
        const jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRun, { ...repo, run_id: run.id, filter: "latest", per_page: 100 });
        if (!check.jobs.every((name) => jobs.some((job) => job.name === name && job.conclusion === "success"))) continue;
      }
      return null;
    }
    return trusted ? "Waiting for the real instructor-enabled run below. Skipped jobs and practice evidence do not count as an Azure deployment." : `Waiting for ${check.file} to ${check.conclusion === "failure" ? "reject the seeded defect" : "pass"} on your latest pushed commit.`;
  }
  if (check.kind === "release") {
    let release;
    try { ({ data: release } = await github.rest.repos.getReleaseByTag({ ...repo, tag: check.tag })); } catch (error) { if (error.status === 404) return `Publish the reviewed ${check.tag} release using GitHub Releases.`; throw error; }
    if (release.draft || release.prerelease || Date.parse(release.published_at) < Date.parse(state.startedAt)) return `Publish ${check.tag} as a final reviewed release, not a draft.`;
    const { data: commit } = await github.rest.repos.getCommit({ ...repo, ref: `tags/${check.tag}` });
    return commit.sha === state.sha ? null : "The release tag must point at the current reviewed exercise revision; never move a published tag to fake progress.";
  }
  throw new Error(`Unsupported check kind: ${check.kind}`);
}

function outsideCodeFences(markdown, transform) {
  let fence = null, pending = "", output = "";
  const flush = () => { output += transform(pending); pending = ""; };
  for (const line of markdown.split(/(?<=\n)/)) {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})([^\r\n]*)/);
    if (!fence && match) {
      flush(); fence = { char: match[1][0], length: match[1].length }; output += line;
    } else if (fence) {
      output += line;
      if (match && match[1][0] === fence.char && match[1].length >= fence.length && !match[2].trim()) fence = null;
    } else pending += line;
  }
  flush();
  return output;
}

function lessonLinks(markdown, file, full, branch, learnerSha = branch, learnerPaths = new Set(), imageRepository = full, imageRef = branch) {
  return outsideCodeFences(markdown, (text) => text.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)\)/g, (whole, image, label, target) => {
    if (/^(?:https?:|#)/.test(target)) return whole;
    const marker = target.search(/[?#]/);
    const pathname = marker < 0 ? target : target.slice(0, marker);
    const suffix = marker < 0 ? "" : target.slice(marker);
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), pathname));
    const reference = /^(?:solutions|exercises|scripts|docs|\.github\/(?:steps|agentalvine))\//.test(resolved) && !learnerPaths.has(resolved);
    const ref = reference ? branch : learnerSha;
    if (resolved.startsWith("../")) return whole;
    // Official documentation images are public, non-learner assets. Rendering a
    // private blob URL as an image would break GitHub issue images/Camo access.
    if (image && resolved.startsWith("docs/images/")) return `![${label}](https://raw.githubusercontent.com/${imageRepository}/${imageRef}/${resolved}${suffix})`;
    return `${image}[${label}](https://github.com/${full}/blob/${ref}/${resolved}${suffix})`;
  }));
}

function beginnerSetup(config, full, branch) {
  if (!config.beginnerSetup) return "";
  ensure(/^[\w.-]+\/[\w.-]+$/.test(full), "Invalid repository identity");
  const docs = `https://github.com/${full}/blob/${branch}/docs`;
  return `\n> [!IMPORTANT]\n> **First time with GitHub or VS Code? Start with [the illustrated setup guide](${docs}/start-here.md).**\n> Your working repository is **${full}**, not the public template.\n\n### Before editing: clone, open and sign in\n\n1. In your browser, verify the intended personal GitHub account and open **this copy**.\n2. In VS Code press **Ctrl+Shift+P** (macOS **Cmd+Shift+P**), choose **Git: Clone**, and paste **https://github.com/${full}.git**.\n3. Complete browser sign-in for the intended account, choose a local parent folder, then select **Open** for **${full.split("/")[1]}**. Trust only this known workshop copy.\n4. Use **Accounts → Sign in with GitHub to use GitHub Copilot** (or the Copilot status menu). Confirm account/seat and [extension account preferences](${docs}/copilot-guide.md). Git commit name/email is not sign-in.\n5. Open **Terminal → New Terminal** in this clone, verify the [pinned tools](${docs}/toolchain.md), then run **node scripts/doctor.mjs**. It is read-only; browser/Copilot access still needs your manual check.\n6. Return to the current task below. [Save, stage, commit and push](${docs}/git-workflow.md) are different actions; GitHub cannot see unsaved/unpushed work.\n\n**Need Settings or Actions?** Use [the illustrated recovery guide](${docs}/troubleshooting.md); do not widen permissions or disable safeguards to make a task pass.\n`;
}

function render(config, state, feedback, full, branch, readLesson) {
  const done = state.step === config.steps.length;
  const bar = config.steps.map((_, index) => index < state.step ? "🟩" : "⬜").join("");
  const checklist = config.steps.map((step, index) => `- [${index < state.step ? "x" : " "}] ${index + 1}. ${step.title}`).join("\n");
  let body = `${MARKER}\n# ${config.title}\n\nHi, I'm **AgentAlvine**, your lab guide. ${state.preview ? "**This is an instructor preview; learner progress is disabled.**" : "Do the current task below. I'll update this issue when you push your work."}\n\n${bar} **${state.step}/${config.steps.length} steps complete**\n\n${checklist}\n\n---\n`;
  if (done) body += `\n## Exercise complete 🎉\n\nYou completed this lab's checks. ${config.completion || "Keep your changes and explain the result to your partner."}\n\n${config.nextRepository ? `**Next:** [Open the next lab](https://github.com/${config.nextRepository}).\n` : ""}`;
  else {
    const step = config.steps[state.step];
    const learnerPaths = new Set(config.steps.flatMap((task) => task.checks).filter((check) => check.path).map((check) => check.path));
    if (state.step === 0) body += beginnerSetup(config, full, branch);
    else if (config.beginnerSetup) body += `\n**Setup help:** [Clone, open VS Code and verify accounts](https://github.com/${full}/blob/${branch}/docs/start-here.md) · [Git click-by-click](https://github.com/${full}/blob/${branch}/docs/git-workflow.md).\n`;
    const imageRepository = config.sourceRepository || full;
    ensure(/^[\w.-]+\/[\w.-]+$/.test(imageRepository), "Invalid image repository");
    body += `\n## Step ${state.step + 1}: ${step.title}\n\n${lessonLinks(readLesson(step.lesson), step.lesson, full, branch, state.sha, learnerPaths, imageRepository, config.sourceBranch || branch)}\n\n### AgentAlvine is watching\n\n${feedback || "Waiting for your GitHub activity. Follow the task above, commit and push."}\n\nNo check command or evidence PR is needed. For an administrative setting that has no event, use **Actions → AgentAlvine → Run workflow → Check progress**.\n`;
  }
  body += `\n<details>\n<summary>Progress details</summary>\n\nObserved branch: \`${state.branch}\`. Last checked revision: \`${state.sha}\`.\n\n${state.completed.map((item) => `- ${item.id}: [verified revision](https://github.com/${full}/commit/${item.sha})`).join("\n") || "No completed steps yet."}\n\nThis is a teaching checklist, not Azure authorization. Independent review and cloud approvals remain separate.\n</details>\n\n${STATE}${JSON.stringify(state)}${END}`;
  return body;
}

async function updateReadme(github, repo, branch, url, completed) {
  const { data } = await github.rest.repos.getContent({ ...repo, path: "README.md", ref: branch });
  ensure(data.type === "file" && data.encoding === "base64" && data.size < MAX_FILE, "README unavailable");
  const original = Buffer.from(data.content, "base64").toString("utf8");
  const from = "<!-- AGENTALVINE:START -->";
  const to = "<!-- AGENTALVINE:END -->";
  const start = original.indexOf(from);
  const end = original.indexOf(to);
  ensure(start >= 0 && end > start, "README start markers missing");
  const text = `${from}\n### ${completed ? "Exercise complete" : "Your exercise is ready"}\n\n**[${completed ? "Review your completed exercise" : "Start here → open your exercise issue"}](${url})**\n\nAgentAlvine keeps the instructions and progress in that issue.\n${to}`;
  const updated = original.slice(0, start) + text + original.slice(end + to.length);
  if (updated !== original) {
    try { await github.rest.repos.createOrUpdateFileContents({ ...repo, path: "README.md", branch, sha: data.sha, message: completed ? "AgentAlvine: exercise complete" : "AgentAlvine: start your exercise", content: Buffer.from(updated).toString("base64") }); }
    catch (error) {
      // Respect protected branches. The issue remains usable through Issues;
      // never weaken protection merely to decorate the landing page.
      if (![403, 409, 422].includes(error.status)) throw error;
    }
  }
}

async function run({ github, context, core, config: supplied, readLesson: suppliedLesson, now = () => new Date().toISOString() }) {
  const config = supplied || JSON.parse(fs.readFileSync(path.join(__dirname, "course.json"), "utf8"));
  const readLesson = suppliedLesson || ((file) => fs.readFileSync(path.resolve(__dirname, "../..", relativePath(file)), "utf8"));
  const { data: metadata } = await github.rest.repos.get(context.repo);
  const full = metadata.full_name;
  const branch = metadata.default_branch;
  const preview = context.eventName === "workflow_dispatch" && context.payload.inputs?.mode === "Preview";
  if (metadata.is_template && !preview) return core.notice("Source template: copy the exercise to start. No learner progress changed.");
  if (context.eventName !== "workflow_run" && context.payload.sender?.type === "Bot") return;
  const { data: currentBranch } = await github.rest.repos.getBranch({ ...context.repo, branch });
  const current = { sha: currentBranch.commit.sha, branch };
  const issues = await github.paginate(github.rest.issues.listForRepo, { ...context.repo, state: "all", per_page: 100 });
  let issue = issues.find((item) => bot(item) && !item.pull_request && item.body?.startsWith(MARKER) && item.title === `Exercise: ${config.title}`);
  let state = issue ? readState(issue.body, config) : null;
  let changed = [];
  if (state && state.step === config.steps.length && config.repeatOnChange && context.eventName === "push" && context.ref === `refs/heads/${branch}` && shaPattern.test(context.payload.before || "")) {
    // Actions' push payload omits per-commit file lists; ask the commit API.
    const { data: comparison } = await github.rest.repos.compareCommits({ ...context.repo, base: context.payload.before, head: context.payload.after });
    changed = (comparison.files || []).map((file) => file.filename);
  }
  const newCycle = state && !state.preview && state.step === config.steps.length && config.repeatOnChange?.some((file) => changed.includes(file)) && context.eventName === "push" && context.ref === `refs/heads/${branch}` && context.payload.after !== state.sha;
  if (newCycle) {
    // A capstone pin/input change needs NEW live observations, not old baseline runs.
    state = { ...state, startedAt: now(), startSha: context.payload.before, sha: context.payload.after, branch, step: 0, completed: [], events: [], cycle: (state.cycle || 1) + 1 };
    await github.rest.issues.update({ ...context.repo, issue_number: issue.number, state: "open", state_reason: "reopened", body: render(config, state, "A new reviewed workload revision starts a fresh delivery cycle. Previous runs do not count.", full, branch, readLesson) });
    issue.state = "open";
    issue.body = render(config, state, "A new reviewed workload revision starts a fresh delivery cycle. Previous runs do not count.", full, branch, readLesson);
  }
  if (!issue && context.eventName === "pull_request_target") return;
  if (!issue && context.eventName === "workflow_run") {
    const trigger = context.payload.workflow_run;
    // A queued startup push can be replaced by its own CI completion. Only
    // a completed same-copy push at CURRENT default HEAD may recover startup.
    if (trigger.event !== "push" || trigger.status !== "completed" || trigger.head_branch !== branch || trigger.head_sha !== current.sha || trigger.head_repository?.full_name !== full) return;
  }
  const selected = eventSnapshot(context, current, state);
  if (!selected || !shaPattern.test(selected.sha)) return;
  const eventKey = `${context.eventName}:${context.runId}`;
  if (!issue) {
    state = { version: 2, lab: config.id, startedAt: now(), startSha: current.sha, sha: current.sha, branch, step: 0, completed: [], events: [eventKey], preview: metadata.is_template || preview };
    const body = render(config, state, "Your first task is ready. Start below.", full, branch, readLesson);
    ({ data: issue } = await github.rest.issues.create({ ...context.repo, title: `Exercise: ${config.title}`, body }));
    if (!state.preview) await updateReadme(github, context.repo, branch, issue.html_url, false);
    core.notice(`AgentAlvine opened ${issue.html_url}`);
    return;
  }
  if (!state.preview && issue.state !== "closed") await updateReadme(github, context.repo, branch, issue.html_url, state.step === config.steps.length);
  if (state.preview || state.step === config.steps.length) {
    const body = render(config, state, "Preview only. Use COPY EXERCISE for a real lab.", full, branch, readLesson);
    if (body !== issue.body) await github.rest.issues.update({ ...context.repo, issue_number: issue.number, body });
    if (!state.preview && state.step === config.steps.length) {
      await updateReadme(github, context.repo, branch, issue.html_url, true);
      if (issue.state !== "closed") await github.rest.issues.update({ ...context.repo, issue_number: issue.number, state: "closed", state_reason: "completed" });
    }
    return;
  }
  if (state.events.includes(eventKey)) return;
  // Reject late events for commits already superseded on the observed branch.
  if (["push", "workflow_run", "pull_request_target", "pull_request_review"].includes(context.eventName)) {
    let latest;
    try { ({ data: latest } = await github.rest.repos.getBranch({ ...context.repo, branch: selected.branch })); }
    catch (error) { if (error.status === 404) return; throw error; }
    if (latest.commit.sha !== selected.sha) return;
  }
  state.sha = selected.sha;
  state.branch = selected.branch;
  state.events = [...state.events, eventKey].slice(-100);
  const read = makeReader(github, context.repo, state.sha);
  let feedback;
  const advanced = [];
  // GitHub may coalesce pending events despite cancel-in-progress:false.
  // Reconcile the bounded sequence from immutable files/live metadata, stopping
  // at the FIRST unmet check. Never count lost events as completed work.
  while (state.step < config.steps.length) {
    const step = config.steps[state.step];
    feedback = undefined;
    if (step.requiresCommit !== false && state.sha === state.startSha) feedback = "Make the change in this step, then commit and push it. The starter copy is not a completed exercise.";
    else {
      for (const check of step.checks) {
        feedback = await evaluate(check, { github, repo: context.repo, full, state, read, defaultBranch: branch });
        if (feedback) break;
      }
    }
    if (feedback) break;
    state.completed.push({ id: step.id, sha: state.sha, at: now() });
    state.step += 1;
    advanced.push({ number: state.step, title: step.title });
  }
  const body = render(config, state, feedback, full, branch, readLesson);
  if (body !== issue.body) await github.rest.issues.update({ ...context.repo, issue_number: issue.number, body });
  for (const item of advanced) await github.rest.issues.createComment({ ...context.repo, issue_number: issue.number, body: `**AgentAlvine:** Step ${item.number} passed — ${item.title}. ${item.number === config.steps.length ? "Exercise complete!" : "The current task is now at the top of this issue."}` });
  if (state.step === config.steps.length) {
    await updateReadme(github, context.repo, branch, issue.html_url, true);
    await github.rest.issues.update({ ...context.repo, issue_number: issue.number, state: "closed", state_reason: "completed" });
  }
}

module.exports = run;
Object.assign(module.exports, { relativePath, checkFile, readState, eventSnapshot, outsideCodeFences, lessonLinks, render, evaluate, updateReadme, MARKER, STATE });
