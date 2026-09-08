import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, readdir, mkdir, cp, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const config = JSON.parse(await readFile(".github/agentalvine/course.json", "utf8"));
const tf = process.env.TERRAFORM_BIN || "terraform";

export function testSummary(output) {
  const events = output.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const summary = events.findLast((item) => item.type === "test_summary")?.test_summary;
  assert.ok(summary && summary.status === "pass" && summary.passed > 0 && summary.failed === 0 && summary.errored === 0 && summary.skipped === 0, "Tests must actually run and pass; zero/skipped tests are not success");
  return summary;
}

function execute(root, args, json = false) {
  const env = { ...process.env, TF_INPUT: "0", TF_IN_AUTOMATION: "true" };
  for (const key of Object.keys(env)) if (/^(ARM_|AZURE_|ACTIONS_ID_TOKEN_|TF_VAR_|TF_CLI_ARGS|TF_LOG)/.test(key)) delete env[key];
  const result = spawnSync(tf, [`-chdir=${root}`, ...args], { encoding: "utf8", shell: false, env, maxBuffer: 20 * 1024 * 1024, timeout: 600_000 });
  if (result.status !== 0) {
    if (json) for (const line of result.stdout.split(/\r?\n/)) { try { const item = JSON.parse(line); if (item.type === "diagnostic") console.error(item.diagnostic.summary, item.diagnostic.detail); } catch {} }
    else console.error(result.stdout, result.stderr);
    throw new Error(`Terraform ${args[0]} failed in ${root}; fix the learner code, do not bypass this check.`);
  }
  return result.stdout;
}

async function verifyMockFiles(root) {
  const files = (await readdir(join(root, "tests"))).filter((file) => file.endsWith(".tftest.hcl"));
  assert.ok(files.length > 0, "Supply a provider-mocked test suite");
  let runs = 0;
  for (const file of files) {
    const text = await readFile(join(root, "tests", file), "utf8");
    const count = [...text.matchAll(/^run "/gm)].length;
    if (count === 0) { assert.ok(text.includes("TODO"), "Unexpected empty test file"); continue; }
    assert.match(text, /^mock_provider "azurerm"\s*\{/m);
    assert.ok(!/^\s*(?:provider\s+"|providers\s*=|alias\s*=|module\s*\{|override_module\s*\{)/m.test(text), "Do not replace the tested module or redirect its mock provider");
    assert.equal(count, [...text.matchAll(/^\s*command\s*=\s*plan\s*$/gm)].length, "Each run must be mock-only plan");
    runs += count;
  }
  assert.ok(runs > 0);
}

async function checkRoot(root, extra = []) {
  await verifyMockFiles(root);
  execute(root, ["fmt", "-check", "-recursive"]);
  execute(root, ["init", "-backend=false", "-lockfile=readonly", "-input=false", "-no-color"]);
  execute(root, ["validate", "-no-color"]);
  const result = testSummary(execute(root, ["test", "-json", "-no-color", ...extra], true));
  console.log(`${root}: ${result.passed} provider-mocked tests passed; no Azure calls.`);
}

async function main() {
  if (config.number === 1) return console.log("Collaboration is checked through the actual issue and PR events.");
  if (config.number === 5) { await import("./check-consumer.mjs"); return; }
  if (config.number === 7) {
    const prepare = spawnSync(process.execPath, ["scripts/prepare-offline.mjs"], { encoding: "utf8" });
    assert.equal(prepare.status, 0, prepare.stderr);
    await checkRoot(".workshop/offline"); return;
  }
  if (config.number === 4) {
    const learner = await readFile("tests/learner.tftest.hcl", "utf8");
    for (const name of ["learner_valid_subnets", "learner_reject_invalid_cidr"]) assert.ok(learner.includes(`run "${name}"`), "Finish both learner test cases");
    assert.ok(!learner.includes("TODO"));
    const rule = await readFile("exercise/rules.tfvars.example", "utf8");
    assert.match(rule, /source_address_prefix\s*=\s*"10\.42\.1\.0\/24"/);
    await checkRoot(".");
    await checkRoot("modules/subnet-security");
    const nativeFilter = process.platform === "win32" ? "tests\\learner.tftest.hcl" : "tests/learner.tftest.hcl";
    const fixture = testSummary(execute(".", ["test", "-json", "-no-color", `-filter=${nativeFilter}`, `-var-file=${resolve("exercise/rules.tfvars.example")}`], true));
    assert.equal(fixture.passed, 2);
    const seed = spawnSync(process.execPath, ["scripts/test-seeded-defect.mjs"], { encoding: "utf8", timeout: 600_000, maxBuffer: 10 * 1024 * 1024 });
    assert.equal(seed.status, 0, seed.stdout + seed.stderr);
    console.log(seed.stdout.trim());
    const { generateDocumentation } = await import("./generate-docs.mjs");
    await generateDocumentation({ check: true });
    console.log("Canonical generated module API is current.");
    return;
  }
  if (config.number === 8) {
    const root = ".workshop/capstone";
    await rm(root, { recursive: true, force: true }); await mkdir(root, { recursive: true });
    await cp("module", root, { recursive: true, filter: (file) => !file.replaceAll("\\", "/").includes("/.terraform/") && !file.endsWith(".terraform") });
    await cp("solutions/capstone/tests/capstone.tftest.hcl", join(root, "tests/capstone.tftest.hcl"));
    const example = await readFile("examples/dev.tfvars.example", "utf8");
    assert.match(example, /^\s*app\s*=\s*\{/m, "Add the named app subnet in the actual example");
    await checkRoot(root);
    await cp("exercises/example.tftest.hcl", join(root, "tests/example.tftest.hcl"));
    const filter = process.platform === "win32" ? "tests\\example.tftest.hcl" : "tests/example.tftest.hcl";
    const result = testSummary(execute(root, ["test", "-json", "-no-color", `-filter=${filter}`, `-var-file=${resolve("examples/dev.tfvars.example")}`], true));
    assert.equal(result.passed, 1, "The actual caller example must be tested separately from test-file variable overrides");
    return;
  }
  await checkRoot(config.number === 6 ? "module" : ".");
}

await main();
