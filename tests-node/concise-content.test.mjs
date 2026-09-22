import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { posix } from "node:path";
import test from "node:test";

// Pedagogy only: read local source; never execute examples or contact services.
const read = async (path) => (await readFile(new URL(`../${path}`, import.meta.url), "utf8")).replaceAll("\r\n", "\n");
const { outsideCodeFences, lessonLinks, render, readState } = createRequire(import.meta.url)("../.github/agentalvine/auto-guide.cjs");
const segmenter = new Intl.Segmenter("en", { granularity: "word" });
const visible = (text) => text.replace(/<details\b[^>]*>[\s\S]*?<\/details>/gi, "");
function prose(text) {
  let result = "";
  outsideCodeFences(visible(text), (part) => { result += part; return part; });
  return result.replace(/<!--[\s\S]*?-->/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*`]/g, "").replace(/\s+/g, " ").trim();
}
const words = (text) => [...segmenter.segment(prose(text))].filter(({ isWordLike }) => isWordLike).length;
function section(text, kind) {
  const start = `<!-- FULL-WS-${kind}:START -->`, end = `<!-- FULL-WS-${kind}:END -->`;
  assert.equal(text.split(start).length, 2, `Exactly one ${kind} start`);
  assert.equal(text.split(end).length, 2, `Exactly one ${kind} end`);
  assert.ok(text.indexOf(start) < text.indexOf(end));
  return text.slice(text.indexOf(start) + start.length, text.indexOf(end)).trim();
}
function rebase(text, source) {
  return outsideCodeFences(text, (part) => part.replace(/\]\(([^)\s]+)\)/g, (match, href) => {
    if (/^(?:https?:|mailto:|#)/.test(href)) return match;
    const separator = href.search(/[?#]/);
    const path = separator < 0 ? href : href.slice(0, separator);
    const suffix = separator < 0 ? "" : href.slice(separator);
    const target = posix.normalize(posix.join(posix.dirname(source), path));
    const step = /^\.github\/steps\/(\d\d)\.md$/.exec(target);
    return `](${step ? `activity-${step[1]}.md` : posix.relative("full-ws-content", target)}${suffix})`;
  }));
}
const commands = ["npm run workflow:check", "npm test", "npm run kit:check", "npm run companion:check", "node scripts/check-learner.mjs"];
const ids = ["01", "02", "03", "04"];
const limits = [420, 420, 350, 650];
const course = JSON.parse(await read(".github/agentalvine/course.json"));
const lessons = await Promise.all(ids.map((id) => read(`.github/steps/${id}.md`)));
const blocks = (text) => [...text.matchAll(/^```([^\n]*)\n([\s\S]*?)^```/gm)].map(([, language, body]) => ({ language, body: body.trim() }));
function requirePoints(text, points, source) {
  for (const [name, pattern] of Object.entries(points)) assert.ok(pattern.test(prose(text)), `${source}: missing ${name}`);
}

test("word budgets count natural words, not Markdown URLs, history or fenced commands", () => {
  assert.equal(words("**Do this.** [Help](https://example.invalid/long/path)\n```powershell\nignored command\n```\n<details><summary>History</summary>old words</details>"), 3);
  for (const limit of limits) assert.equal(words("action ".repeat(limit + 1)), limit + 1);
});

const budgets = [
  ["README.md", 250], ["full-ws-content/README.md", 250],
  ...ids.flatMap((id, index) => [
    [`.github/steps/${id}.md`, limits[index]], [`full-ws-content/activity-${id}.md`, limits[index], "LESSON"],
  ]),
];
for (const [path, limit, kind] of budgets) test(`${path} keeps current instructions within ${limit} natural words`, async () => {
  const text = await read(path), count = words(kind ? section(text, kind) : text);
  assert.ok(count > 0 && count <= limit, `${path}: ${count} prose words > ${limit}; shorten actions, not kit minima`);
});

for (const [index, id] of ids.entries()) {
  test(`Step ${id} is visible concise instruction, mirrored in its current activity body`, async () => {
    const lesson = lessons[index];
    assert.doesNotMatch(lesson, /<details\b|FULL-WS-ACTIONS|actions-and-azure\.md|\]\([^)]*workflow-authoring\.md\)/i);
    assert.doesNotMatch(lesson, /^#{2,3} Required (?:next )?activity/im);
    assert.match(lesson, /\*\*Expected(?:, not observed)?:\*\*/);
    assert.match(lesson, /\*\*Recovery:\*\*/);
    assert.equal((lesson.match(/!\[[^\]]+\]\(/g) ?? []).length, 1, "One useful reference image per step");
    assert.match(lesson, /REFERENCE.*CC BY.*NOTICE\.md/);
    assert.deepEqual(blocks(lesson).map(({ language }) => language), [["powershell"], ["hcl", "powershell"], ["hcl", "powershell"], []][index]);
    assert.equal(section(await read(`full-ws-content/activity-${id}.md`), "LESSON"), rebase(lesson, `.github/steps/${id}.md`).trim());
  });

  test(`Step ${id} renders its entire current instructions without mutating synthetic progress`, () => {
    // Existing active-step rendering only. Completed-step retention is tested by
    // the separate renderer change; no API, progress writer or fake live event.
    const sha = "a".repeat(40);
    const completed = course.steps.slice(0, index).map(({ id }) => ({ id, sha, at: "2026-09-22T00:00:00Z" }));
    const state = { version: 2, lab: course.id, step: index, sha, startSha: sha, branch: "lab/network", startedAt: "2026-09-22T00:00:00Z", completed, events: [], preview: false };
    const before = structuredClone(state);
    const learnerPaths = new Set(course.steps.flatMap(({ checks }) => checks).filter(({ path }) => path).map(({ path }) => path));
    const expected = lessonLinks(lessons[index], course.steps[index].lesson, "test/copy", "dev", sha, learnerPaths, course.sourceRepository, course.sourceBranch);
    const body = render(course, state, "Synthetic document test, not live evidence.", "test/copy", "dev", (path) => {
      assert.equal(path, course.steps[index].lesson);
      return lessons[index];
    });
    assert.ok(body.includes(expected), "A link-only hand-off must not replace the active lesson");
    assert.deepEqual(state, before);
    assert.deepEqual(readState(body, course), before);
  });
}

test("Step 1 has independent actionable setup and a design task, not another required lab", () => {
  requirePoints(lessons[0], {
    independence: /No earlier lab or Azure account.*Reuse your existing private copy/i,
    tools: /installers.*Git, desktop VS Code, Node 24\.16\.0, Terraform 1\.16\.1 and actionlint 1\.7\.12/i,
    accounts: /Create\/verify.*GitHub account.*sign in.*invitation\/SSO.*Accounts.*GitHub\/Copilot.*Manage Extension Account Preferences/i,
    copy: /Use this template.*Create a new repository.*Owner.*Private.*Include all branches.*off/i,
    clone: /Code.*HTTPS.*Git: Clone.*paste URL.*parent folder.*Open.*Explorer.*lab root/i,
    branch: /actual default branch.*dev.*Git: Create Branch.*lab\/network.*reuse/i,
    design: /Reuse decision.*network baseline.*web.*data.*subnet-security.*caller owns.*RG.*provider.*credentials.*state.*Remove TODO/i,
    route: /2 network \+ create Actions.*3 outputs \+ checks.*4 PR, live inspection, update and cleanup/i,
  }, "Step 1");
  assert.deepEqual(blocks(lessons[0])[0].body.split("\n"), ["node --version", "terraform version", "node scripts/doctor.mjs"]);
});

test("Step 2 constructs all real workflow jobs before one disabled atomic install", async () => {
  requirePoints(lessons[1], {
    disabled: /WORKSHOP_AZURE_ENABLED=false.*no Azure login, live backend\/state or real plan\/apply/i,
    roots: /separate avm root.*AzureRM 4\.81\.0.*original 5\.4\.0 learner root.*state\/ownership separate/i,
    editor: /solutions\/avm-delivery\.yml.*non-runnable reference.*File.*New Text File.*untitled.*YAML/i,
    header: /Copy the complete header: name, on, permissions, concurrency, env, including jobs:/i,
    preservation: /Preserve indentation, pinned actions, driver calls, conditions, permissions and expressions exactly/i,
    comparison: /Compare the whole untitled document.*Still disabled, atomically replace all of \.github\/workflows\/avm-delivery\.yml.*one complete editor save/i,
    singleWriter: /without saving another workflow.*avm-cleanup\.yml.*separate and unchanged.*Never install partial drafts, alternate filenames or an extra writer/i,
    honestDiff: /exact reconstruction may produce no Git diff.*valid.*Do not invent a YAML change or empty commit/i,
  }, "Step 2");
  const workflow = await read(".github/workflows/avm-delivery.yml");
  const jobs = [...workflow.matchAll(/^ {2}([a-z][a-z\d_-]*):[ \t]*$/gm)].map((match) => match[1]).filter((name) => !["push", "workflow_dispatch", "schedule"].includes(name));
  assert.deepEqual(jobs, ["preflight", "validation", "plan", "apply", "followup", "drift"]);
  const copied = [...lessons[1].matchAll(/(?:Copy|then) the complete `([a-z]+)` job/g)].map((match) => match[1]);
  assert.deepEqual(copied, jobs, "Teach complete jobs in their actual order");
});

test("Step 3 contains all five offline commands and exact current-revision CI labels", async () => {
  assert.deepEqual(blocks(lessons[2]).find(({ language }) => language === "powershell").body.split("\n"), commands);
  requirePoints(lessons[2], {
    counts: /Expected, not observed:.*4 core \+ 3 AVM provider-mocked cases.*zero failed, errored or skipped/i,
    isolation: /backend-disabled.*read-only locks.*no Azure credentials, OIDC, CLI caches or live state/i,
    mockOnly: /mock AzureRM, AzAPI, ModTM and Random.*synthetic IDs are not Azure proof/i,
    push: /Source Control.*inspect diff.*Stage Changes.*intended files only.*Commit.*Publish Branch\/Push.*lab\/network/i,
    revision: /Actions.*current commit SHA.*Require success, not an old green run, source-template skip or zero tests/i,
    progress: /4\/4 is offline proof only.*continue Step 4 even after automatic advancement/i,
  }, "Step 3");
  for (const file of ["quality.yml", "lab-checks.yml", "companion-checks.yml"]) {
    const workflow = await read(`.github/workflows/${file}`);
    for (const [, name] of workflow.matchAll(/^(?:name:|    name:) (.+)$/gm)) assert.ok(prose(lessons[2]).includes(name), `Missing CI label ${name}`);
  }
});

const livePoints = {
  offlineBoundary: /4\/4 is offline proof only.*not deployment, authorization or cleanup.*AgentAlvine never authorizes Azure.*expected, not observed/i,
  stop: /STOP.*WORKSHOP_AZURE_ENABLED=false.*owner approves private non-template alvine-aurelio-org\/ws2-sim-20260921-network-module-laboratory-02, ID 1379147533/i,
  ownerScope: /subscription\/RG\/region\/CIDRs.*scope\/budget\/lifetime.*explicit bootstrap authorization/i,
  protection: /protected main\/strict checks.*main-only avm-plan\/avm-apply.*no Required reviewers\/admin bypass/i,
  identityState: /distinct scoped OIDC.*reachable private backend.*Blob lease locking.*own separate state.*trusted ephemeral ws2-trusted runner.*encryption keys ready/i,
  failClosed: /Generic\/public copies stay offline.*never repin or bypass flags.*Missing main.*Stop.*only the owner establishes protected main while false after readiness review/i,
  realChange: /no diff.*owner approval.*activity = "actions-azure".*existing locals\.tags in avm\/main\.tf.*No empty commit or fake YAML change/i,
  commit: /Repeat Step 3 checks.*Source Control.*Stage Changes.*intended files.*Commit.*Push/i,
  pr: /Pull requests.*New pull request.*base: existing main.*compare: lab\/network.*Files changed.*required checks.*resolve conversations.*Merge pull request.*Confirm merge/i,
  authorMerge: /author may merge their own passing PR.*no independent PR\/deployment reviewer.*fabricated self-approval/i,
  exactPlan: /main SHA, fresh attempt 1.*Main push applies that same run's encrypted saved plan, not a replacement plan.*No manual review wait or second deploy dispatch.*never rerun live jobs/i,
  portal: /Azure portal.*Directories \+ subscriptions.*assigned directory\/subscription.*Resource groups.*assigned RG.*owner-provided VNet name.*Compare with owner inputs.*retain resource IDs privately/i,
  overview: /Overview.*JSON View.*Approved region.*provisioningState: Succeeded/i,
  address: /Address space.*Approved CIDR ranges/i,
  subnet: /Subnets.*each subnet.*Approved names\/prefixes.*NSG association <name>-nsg/i,
  outbound: /JSON View.*properties\.subnets.*defaultOutboundAccess: false/i,
  nsg: /RG.*&lt;name&gt;-nsg.*Subnets.*Same subnet associations/i,
  tags: /VNet and NSG Tags.*workshop=ws2.*environment=dev/i,
  honestProof: /Subnets are nested, not standalone RG rows.*Green Actions\/mocks are not configuration proof/i,
  update: /owner approval.*activity = "actions-azure-updated".*same locals\.tags.*Keep names\/CIDRs\/subnet keys\/required tags.*passing PR merge.*in-place update, no replacement, same VNet\/subnet\/NSG IDs.*portal Tags.*new value/i,
  followup: /Run workflow.*main.*operation: followup.*only.*fresh plan exit 0.*Confirm AVM no-change.*exit 2 is not success.*Followup never applies.*drift is report-only/i,
  cleanupOwner: /current authenticated repository admin.*separate explicit owner authorization.*whole owned workload.*Actions.*Trusted AVM cleanup.*Run workflow.*main/i,
  cleanupInput: /Required string authorization: destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>.*Owner supplies.*real 40-character SHA\/state-lock value.*never submit placeholders.*No operation input or independent cleanup reviewer/i,
  absence: /same-run exact saved destroy plan.*empty managed state.*portal VNet\/NSG absence.*Retain RG\/backend\/identities\/runner.*Ordinary pushes never clean up.*deletion\/replacement is rejected/i,
  recovery: /live continuation pending.*Source maintenance stays on dev.*Recovery: stop.*owner.*never force-unlock, widen roles, delete state or use local destroy/i,
};

test("Step 4 itself contains PR merge, portal configuration, update, followup and separate cleanup", async () => {
  requirePoints(lessons[3], livePoints, "Step 4");
  assert.equal((lessons[3].match(/^> \*\*STOP/gm) ?? []).length, 1);
  assert.match(lessons[3], /^\| Click \| Expected configuration \|$/m);
  for (const file of ["avm-delivery.yml", "avm-cleanup.yml"]) {
    const workflow = await read(`.github/workflows/${file}`);
    assert.ok(prose(lessons[3]).includes(/^name: (.+)$/m.exec(workflow)[1]));
    for (const [, name] of workflow.matchAll(/^    name: (.+)$/gm)) {
      if (/^(?:Verify scoped|Validate reviewed|Trusted AVM plan|Apply exact|Confirm AVM)/.test(name)) assert.ok(prose(lessons[3]).includes(name), `Missing actual job ${name}`);
    }
  }
});

test("the complete lesson contract rejects missing safety rather than accepting a link-only guide", () => {
  assert.throws(() => requirePoints("Read [the guide](docs/workflow-authoring.md).", livePoints, "fixture"));
  for (const text of ["WORKSHOP_AZURE_ENABLED=false", "1379147533", "defaultOutboundAccess: false", "Merge pull request", "exit 2 is not success", "empty managed state", "never submit placeholders"]) {
    assert.throws(() => requirePoints(lessons[3].replaceAll(text, "omitted"), livePoints, "fixture"), `Missing ${text} must fail`);
  }
});

test("course presentation requests concise inline lessons without claiming live completion", () => {
  assert.equal(course.lessonPresentation, "concise");
  assert.deepEqual(course.steps.map(({ id, lesson }) => ({ id, lesson })), ids.map((id, index) => ({ id: String(index + 1), lesson: `.github/steps/${id}.md` })));
  assert.match(course.steps[1].title, /GitHub Actions/);
  assert.match(course.steps[2].title, /checks/);
  assert.match(course.steps[3].title, /Azure.*offline/i);
  assert.match(course.completion, /4\/4 is offline.*No Azure resources were deployed by these checks.*inside Step 4 after automatic advancement.*no fifth activity or live completion is awarded/i);
  assert.doesNotMatch(course.description + course.completion, /after the four.*required.*activity/i);
});

test("entry navigation goes straight to the four existing lessons, not an additional page", async () => {
  for (const path of ["README.md", "docs/start-here.md", ".github/agentalvine/README.md", "full-ws-content/README.md", "full-ws-content/00-start-here.md"]) {
    const text = visible(await read(path));
    for (const id of ids) assert.match(text, new RegExp(`\\]\\([^)]*(?:steps/${id}|activity-${id})\\.md\\)`), `${path}: step ${id}`);
    assert.doesNotMatch(text, /Required (?:next )?activity|actions-and-azure\.md|\]\([^)]*workflow-authoring\.md\)/i);
  }
});

test("full folder navigation is local and historical tables/preview are collapsed after current steps", async () => {
  const index = await read("full-ws-content/README.md"), current = visible(index);
  for (const file of ["00-start-here.md", "azure-setup.md", "activity-01.md", "activity-02.md", "activity-03.md", "activity-04.md"]) assert.ok(current.includes(`](${file})`), `Missing same-folder ${file}`);
  assert.equal((index.match(/<details>/g) ?? []).length, 1);
  assert.ok(index.indexOf("<details>") > index.indexOf("](activity-04.md)"));
  assert.doesNotMatch(index, /<details\s+open/i);
  const historical = /<details>([\s\S]*?)<\/details>/.exec(index)[1];
  for (const retained of ["2026-09-08", "Cycle A", "Cycle B", "Recorded verified", "2026-09-14", "images/exercise-preview.png", "images/provenance.json"]) assert.ok(historical.includes(retained));
});

test("lessons keep trusted step links and contain no invented live result", () => {
  for (const lesson of lessons) {
    assert.doesNotMatch(lesson, /\]\([^)]*full-ws-content\//);
    assert.doesNotMatch(prose(lesson), /(?:we|I) (?:deployed|created Azure|verified live)|Azure deployment (?:completed|succeeded)|live (?:test|run) passed/i);
  }
});
