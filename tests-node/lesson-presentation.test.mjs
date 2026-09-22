import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import test from "node:test";
import { validateLessonPresentation } from "../scripts/auto-kit.mjs";

// Synthetic presentation/content contracts only, NOT live progress proof.
// Read local lessons; never execute examples, write files or call live APIs.
const guide = createRequire(import.meta.url)("../.github/agentalvine/auto-guide.cjs");
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const course = JSON.parse(read(".github/agentalvine/course.json"));
const concise = { beginnerSetup: true, lessonPresentation: "concise" };
const validate = (config, text) => validateLessonPresentation(config, text, guide.outsideCodeFences);
const fixture = `# Synthetic local lesson

### 1. Inspect the example
Open the existing local copy in your editor and inspect the named example before changing anything. Read the task and compare the current file with the expected structure. Keep unrelated work and all existing controls intact. This fixture describes a local exercise only and is not evidence of any account access, remote event, deployment or authorization.

### 2. Check the result
Review the change in the editor and use the documented offline checks for the exercise. Inspect the actual result rather than assuming that saving a file completes a task. Return to the current instructions if the result differs. Do not replace a failed check with a success claim.

**Expected:** The local example matches the requested structure without changing unrelated content.

**Recovery:** Stop at the first mismatch, preserve the original result and ask for help before continuing.

![Reference example](../../docs/images/example.png)
[Attribution](../../docs/images/NOTICE.md)
`;

test("kit policy import has no CLI output or repository inspection side effects", () => {
  const url = new URL("../scripts/auto-kit.mjs", import.meta.url).href;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", `await import(${JSON.stringify(url)});`], { cwd: tmpdir(), encoding: "utf8", timeout: 10_000, shell: false });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, ""); assert.equal(result.stderr, "");
});

test("concise kit accepts structured short instructions without padding to 2500 characters", () => {
  assert.ok(fixture.length < 2500);
  const before = JSON.stringify(concise), result = validate(concise, fixture);
  assert.ok(result.words >= 100 && result.words <= 650);
  assert.equal(result.actions, 2);
  assert.equal(JSON.stringify(concise), before);
  assert.deepEqual(validate({ ...concise, beginnerSetup: false }, fixture), result);
});

test("concise natural-word counts ignore Markdown URLs, comments and nested or tilde fences", () => {
  const baseline = validate(concise, fixture);
  const text = fixture.replace("../../docs/images/NOTICE.md", `https://example.invalid/${"ignored/".repeat(900)}NOTICE.md`)
    + `\n<!-- ${"ignored ".repeat(900)} -->\n\n\`\`\`\`markdown\n\`\`\`hcl\n${"ignored ".repeat(900)}\n\`\`\`\n[Example](relative.md)\n\`\`\`\`\n~~~text\n${"ignored ".repeat(900)}\n~~~\n`;
  assert.deepEqual(validate(concise, text), baseline);
});

test("concise kit accepts exactly 650 natural words and rejects 651", () => {
  const boundary = `${fixture}\n${"word ".repeat(650 - validate(concise, fixture).words)}`;
  assert.equal(validate(concise, boundary).words, 650);
  assert.throws(() => validate(concise, `${boundary}word`), /100.*650.*natural words/);
});

const invalidLessons = [
  ["empty", "", /100.*650.*natural words/],
  ["whitespace only", " \n\t", /100.*650.*natural words/],
  ["undersized prose", "### 1. Read\n### 2. Check\n**Expected:** Ready.\n**Recovery:** Stop.\n![Example](../../docs/images/example.png) [Attribution](../../docs/images/NOTICE.md)", /100.*650.*natural words/],
  ["no action sections", fixture.replace(/^### \d+\. /gm, "### "), /numbered action sections/],
  ["one action section", fixture.replace("### 2. Check the result", "### Check the result"), /numbered action sections/],
  ["no expected result", fixture.replace("**Expected:**", "**Outcome:**"), /Expected/],
  ["no recovery", fixture.replace("**Recovery:**", "**Help:**"), /Recovery/],
  ["no visual", fixture.replace(/!\[[^\]]+\]\([^)]*\)/, "Reference example"), /visual reference/],
  ["no attribution", fixture.replace("NOTICE.md", "other.md"), /NOTICE/],
  ["code-only instructions", `\`\`\`\`markdown\n${fixture}\n\`\`\`\`\n`, /100.*650.*natural words/],
  ["tilde code-only instructions", `~~~markdown\n${fixture}\n~~~\n`, /100.*650.*natural words/],
  ["actions only in code", fixture.replace(/^(### \d+\. .+)$/gm, "```markdown\n$1\n```"), /numbered action sections/],
  ["expected result only in code", fixture.replace(/^(\*\*Expected:\*\*.+)$/m, "~~~text\n$1\n~~~"), /Expected/],
  ["recovery only in code", fixture.replace(/^(\*\*Recovery:\*\*.+)$/m, "~~~text\n$1\n~~~"), /Recovery/],
  ["oversized", `${fixture}\n${"word ".repeat(651)}`, /100.*650.*natural words/],
];
for (const [name, text, error] of invalidLessons) test(`concise kit rejects ${name}`, () => {
  assert.throws(() => validate(concise, text), error);
});

for (const [name, flag] of [["undefined", undefined], ["null", null], ["boolean", true], ["false", false], ["number", 2], ["object", {}], ["array", []], ["boxed string", new String("concise")], ["empty string", ""], ["unknown string", "legacy"], ["case variant", "Concise"], ["padded string", " concise "]]) {
  test(`kit rejects a present malformed presentation flag: ${name}`, () => {
    assert.throws(() => validate({ ...concise, lessonPresentation: flag }, fixture), /lessonPresentation/);
  });
}

test("legacy beginner lessons retain the exact 2500-character minimum and visual/recovery checks", () => {
  const legacy = { beginnerSetup: true }, text = fixture.padEnd(2500, "x");
  assert.throws(() => validate(legacy, fixture), /Beginner lessons/);
  assert.throws(() => validate(legacy, text.slice(0, 2499)), /Beginner lessons/);
  assert.doesNotThrow(() => validate(legacy, text));
  assert.throws(() => validate(legacy, text.replace(/!\[/, "[ ")), /visual reference/);
  assert.throws(() => validate(legacy, text.replace("NOTICE.md", "missing.md")), /NOTICE/);
  assert.throws(() => validate(legacy, text.replaceAll("Expected", "Outcomes").replaceAll("expected", "outcomes")));
  assert.throws(() => validate(legacy, text.replace("Recovery", "Helptext")));
});

test("legacy lessons do not acquire concise maximum-word or numbered-action requirements", () => {
  const text = `${fixture.replace(/^### \d+\. /gm, "### ")}\n${"word ".repeat(700)}`;
  assert.doesNotThrow(() => validate({ number: 8, beginnerSetup: true }, text));
  assert.doesNotThrow(() => validate({ beginnerSetup: false }, "Short legacy prompt."));
});

const limits = { 2: [420, 420, 350, 650], 7: [500, 420, 500, 380, 350] }[course.number];
assert.equal(course.lessonPresentation, "concise");
assert.equal(course.steps.length, limits.length);
const lessons = course.steps.map(({ lesson }) => read(lesson));
for (const [index, step] of course.steps.entries()) test(`actual Step ${index + 1} passes the kit policy and its ${limits[index]}-word cap`, () => {
  assert.ok(validate(course, lessons[index]).words <= limits[index], step.lesson);
});

for (let progress = 0; progress <= course.steps.length; progress++) {
  test(`actual concise guide renders progress ${progress}/${course.steps.length} with its full inline lesson and unchanged state`, () => {
    const done = progress === course.steps.length, index = done ? progress - 1 : progress;
    const state = { version: 2, lab: course.id, startedAt: "2026-09-21T12:00:00Z", startSha: "a".repeat(40), sha: "b".repeat(40), branch: "lab/synthetic", step: progress,
      completed: course.steps.slice(0, progress).map(({ id }, i) => ({ id, sha: (i % 2 ? "b" : "a").repeat(40), at: "2026-09-21T12:01:00Z" })),
      events: ["synthetic:historical"], preview: false, cycle: 2 };
    const before = JSON.stringify(state), metadata = JSON.stringify(course), reads = [];
    const full = "fixture/own-copy", branch = "trusted-default", step = course.steps[index];
    const learnerPaths = new Set(course.steps.flatMap(({ checks }) => checks).filter(({ path }) => path).map(({ path }) => path));
    const expected = guide.lessonLinks(lessons[index], step.lesson, full, branch, state.sha, learnerPaths, course.sourceRepository, course.sourceBranch);
    const body = guide.render(course, state, "Synthetic only; not live evidence.", full, branch, (file) => { reads.push(file); assert.equal(file, step.lesson); return lessons[index]; });
    assert.deepEqual(reads, [step.lesson]);
    assert.equal(body.split(expected).length, 2, "Full existing body appears exactly once, not a link-only hand-off");
    assert.ok(body.includes(`**${progress}/${course.steps.length} steps complete**`));
    assert.ok(body.includes(`https://raw.githubusercontent.com/${course.sourceRepository}/${course.sourceBranch}/docs/images/`));
    assert.match(body, /teaching checklist, not Azure authorization/);
    assert.equal(JSON.stringify(state), before);
    assert.equal(JSON.stringify(guide.readState(body, course)), before);
    assert.equal(JSON.stringify(course), metadata);
    if (done) {
      assert.ok(body.includes(`Step ${course.steps.length} — final instructions (retained): ${step.title}`));
      assert.ok(body.indexOf(course.completion) < body.indexOf(expected));
      assert.ok(body.indexOf(expected) < body.indexOf("<details>"), "Final instructions remain expanded");
      assert.doesNotMatch(body, /AgentAlvine is watching/);
      if (course.number === 2) assert.match(body, /4\/4 is offline learner-root proof only/);
    } else assert.doesNotMatch(body, /final instructions \(retained\)/);
    const required = course.number === 2 ? { 3: ["Merge pull request", "https://portal.azure.com", "Directories + subscriptions", "Resource groups", "Trusted AVM cleanup (explicit owner authorization required)", "Apply exact authorized AVM destroy plan"] }
      : { 1: ["Merge pull request"], 2: ["https://portal.azure.com", "Directories + subscriptions", "Resource groups"], 4: ["https://portal.azure.com", "Resource groups", "Trusted dev cleanup (explicit owner authorization required)", "Apply exact authorized dev destroy plan"] };
    for (const token of required[index] ?? []) assert.ok(body.includes(token), `Inline instruction missing: ${token}`);
  });
}
