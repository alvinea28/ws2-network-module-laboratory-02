import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { sourceBinding, verifyInstalledModules, verifyRootContract } from "./avm-dependencies.mjs";
import { validatePlan } from "./avm-policy.mjs";

const course = JSON.parse(await readFile(".github/agentalvine/course.json", "utf8"));
const profiles = { 2: ["avm", 3], 3: ["governance", 2], 5: ["stack", 2], 8: ["monitoring", 2] };
assert.ok(profiles[course.number], "This lab has no isolated Terraform companion");
const [root, expected] = profiles[course.number];
const env = { ...process.env, TF_INPUT: "0", TF_IN_AUTOMATION: "true" };
for (const key of Object.keys(env)) if (/^(ARM_|AZURE_|ACTIONS_ID_TOKEN_|TF_VAR_|TF_CLI_ARGS|TF_LOG|GH_TOKEN$|GITHUB_TOKEN$)/.test(key)) delete env[key];
env.ARM_USE_CLI = "false";
env.ARM_USE_MSI = "false";
env.ARM_USE_OIDC = "false";
const run = (args) => {
  const result = spawnSync(process.env.TERRAFORM_BIN || "terraform", [`-chdir=${root}`, ...args], { env, encoding: "utf8", shell: false, timeout: 600_000, maxBuffer: 20 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
};
const tests = (await readdir(`${root}/tests`)).filter((file) => file.endsWith(".tftest.hcl"));
assert.ok(tests.length > 0, "Tests cannot be removed to claim success");
for (const file of tests) {
  const body = await readFile(`${root}/tests/${file}`, "utf8");
  assert.match(body, /^mock_provider "/m, "Companion CI is credential-free and explicitly mocked");
  assert.ok(!/^\s*command\s*=\s*apply\b/m.test(body), "No provisioning in companion CI");
}
run(["fmt", "-check", "-recursive"]);
run(["init", "-backend=false", "-input=false", "-lockfile=readonly", "-no-color"]);
await sourceBinding(root);
const reviewedSource = await verifyRootContract(root);
await verifyInstalledModules(root);
run(["validate", "-no-color"]);
const version = JSON.parse(run(["version", "-json"]));
assert.equal(version.terraform_version, "1.16.1");
const events = run(["test", "-json", "-verbose", "-no-color"]).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const summary = events.findLast((item) => item.type === "test_summary")?.test_summary;
assert.ok(summary && summary.status === "pass", "Require an actual completed test summary");
assert.equal(summary.passed, expected);
for (const key of ["failed", "errored", "skipped"]) assert.equal(summary[key], 0);
// The verbose test envelope is produced by Terraform with ALL providers mocked.
// Adapt its documented plan-format field, never represent this as a real plan.
const mocked = events.find((item) => item.type === "test_plan")?.test_plan;
assert.ok(mocked?.resource_changes, "A real provider-mocked plan must exercise admission");
const inputs = { tenant_id: "00000000-0000-0000-0000-000000000000", subscription_id: "00000000-0000-0000-0000-000000000000", resource_group_name: "rg-contract-only", location: "eastus", name: "ws2-avm-contract", address_space: ["10.42.0.0/16"], subnets: { web: { address_prefixes: ["10.42.1.0/24"] }, data: { address_prefixes: ["10.42.2.0/24"] } } };
const admitted = validatePlan({ format_version: mocked.plan_format_version, terraform_version: version.terraform_version, resource_changes: mocked.resource_changes }, inputs, "deploy", reviewedSource);
assert.equal(admitted.create, 4, "The native mocked plan must contain the exact network topology");
console.log(`${root}: schema valid; ${summary.passed} mocked authoring contracts passed, 0 failed/skipped; native mocked plan admission verified. Not live Azure acceptance.`);
