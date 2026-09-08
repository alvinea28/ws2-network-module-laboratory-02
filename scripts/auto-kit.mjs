import assert from "node:assert/strict";
import { readFile, access, readdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const root = fileURLToPath(new URL("../", import.meta.url));
const read = (file) => readFile(join(root, file), "utf8");
const { outsideCodeFences } = createRequire(import.meta.url)(join(root, ".github/agentalvine/auto-guide.cjs"));
const config = JSON.parse(await read(".github/agentalvine/course.json"));
assert.equal(new Set(config.steps.map((step) => step.id)).size, config.steps.length);
assert.ok(config.steps.length >= 3 && config.steps.length <= 6);
const readme = await read("README.md");
assert.ok(readme.split(/\r?\n/).length <= 140, "Keep the landing page navigable; put the full first-time walkthrough in docs/start-here.md");
assert.ok(readme.includes("<!-- AGENTALVINE:START -->") && readme.includes("<!-- AGENTALVINE:END -->"));
assert.ok(readme.includes("Copy exercise") || readme.includes("Your exercise is ready") || readme.includes("Exercise complete"));
assert.ok(!readme.includes("@agentalvine check"), "No manual evidence-check protocol");
if (config.beginnerSetup) {
  assert.match(config.sourceRepository, new RegExp(`^alvinea28/ws2-[a-z0-9-]+-laboratory-${String(config.number).padStart(2, "0")}$`));
  assert.equal(config.sourceBranch, "dev");
  for (const phrase of ["Git: Clone", "VS Code", "Copilot", "docs/start-here.md", "Private", "independent", "Public source template", "not the clone URL"]) assert.ok(readme.includes(phrase), `Beginner landing page must explain ${phrase}`);
  for (const doc of ["start-here.md", "git-workflow.md", "copilot-guide.md", "toolchain.md", "troubleshooting.md", "glossary.md", "images/NOTICE.md", "images/manifest.json"]) await access(join(root, "docs", doc));
  await access(join(root, "scripts/doctor.mjs"));
  const setup = await read("docs/start-here.md");
  for (const token of ["Git: Clone", "Open Folder", "Accounts", "Copilot", "git config --local", "git remote -v", "Terminal", "doctor.mjs"]) assert.ok(setup.includes(token), `Setup guide lacks ${token}`);
  const manifest = JSON.parse(await read("docs/images/manifest.json"));
  assert.ok(manifest.images.length >= 12);
  for (const image of manifest.images) {
    assert.ok(["Microsoft", "GitHub"].includes(image.publisher));
    assert.ok(["CC-BY-3.0-US", "CC-BY-4.0"].includes(image.license));
    const bytes = await readFile(join(root, "docs/images", image.file));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), image.sha256, `Reference screenshot changed: ${image.file}`);
  }
}
for (const step of config.steps) {
  const text = await read(step.lesson);
  assert.ok(!text.includes("@agentalvine check") && !text.includes("release_pr"));
  if (config.beginnerSetup) {
    assert.ok(text.length >= 2500, "Beginner lessons need explicit actions, results and recovery, not just a short prompt");
    assert.match(text, /!\[[^\]]+\]\([^)]*docs\/images\//, "Each lesson needs an attributed useful visual reference");
    assert.ok(text.includes("NOTICE.md"));
    assert.match(text, /(?:Expected|expected)/);
    assert.match(text, /(?:Trouble|trouble|Stuck|stuck|Recovery|recovery|Blocked|blocked)/);
  }
  const activeLinks = [];
  outsideCodeFences(text, (part) => { activeLinks.push(...part.matchAll(/\]\(([^)\s]+)\)/g)); return part; });
  for (const match of activeLinks) {
    if (/^(?:https?:|#)/.test(match[1])) continue;
    const target = resolve(root, dirname(step.lesson), decodeURIComponent(match[1].split("#")[0]));
    const createdByLearner = config.steps.flatMap((task) => task.checks).some((check) => check.path && resolve(root, check.path) === target);
    await access(target).catch((error) => { if (!createdByLearner || error.code !== "ENOENT") throw error; });
  }
  assert.ok(step.checks.length > 0);
  for (const check of step.checks) if (check.caseInsensitive) assert.ok(check.kind === "file" && check.path?.endsWith(".md"), "Only Markdown prose checks may opt into case-insensitive matching");
}
const guide = await read(".github/workflows/agentalvine.yml");
assert.ok(guide.includes("ref: ${{ github.event.repository.default_branch }}"), "Writer must load trusted branch only");
assert.ok(guide.includes("persist-credentials: false"));
assert.ok(!guide.includes("id-token:") && !guide.includes("secrets.") && !guide.includes("download-artifact") && !guide.includes("npm "), "Guide cannot execute learner code or access cloud secrets/artifacts");
for (const name of await readdir(join(root, ".github/workflows"))) {
  if (!name.endsWith(".yml")) continue;
  const workflow = await read(`.github/workflows/${name}`);
  for (const match of workflow.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)/gm)) if (!match[1].startsWith("./")) assert.match(match[1], /^[\w./-]+@[a-f0-9]{40}$/, `Pin ${name} actions`);
  if (["quality.yml", "lab-checks.yml", "validate.yml"].includes(name)) assert.ok(!/id-token:|secrets\.|ws2-trusted|contents: write|pull_request_target:/.test(workflow), "Learner CI is credential-free");
}
console.log(`Lab ${config.number}: illustrated beginner entry, ${config.steps.length} automatic steps, valid links and safe workflows.`);
