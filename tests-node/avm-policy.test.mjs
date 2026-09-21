import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { configuration, operationFor, validatePlan, assertEnvironmentProtection, makeManifest, verifyManifest, MAX_AGE, topology } from "../scripts/avm-policy.mjs";
import { assertApprovedWiring, hash, verifyRootContract } from "../scripts/avm-dependencies.mjs";
import { terraformEnvironment, currentMain } from "../scripts/avm-delivery.mjs";
import { environment, fixture } from "./avm-fixtures.mjs";
const approvedSource = await readFile(new URL("../avm/main.tf", import.meta.url), "utf8");

test("only protected main push deploys; schedules report and dispatch only follows up or destroys", () => {
  assert.equal(operationFor("push"), "deploy"); assert.equal(operationFor("schedule"), "drift");
  for (const operation of ["destroy", "followup"]) assert.equal(operationFor("workflow_dispatch", operation), operation);
  for (const event of ["pull_request", "pull_request_target", "workflow_run"]) assert.throws(() => operationFor(event, "deploy"));
  for (const operation of ["deploy", "plan", "drift", "anything"]) assert.throws(() => operationFor("workflow_dispatch", operation));
});

test("configuration accepts the fixed isolated AVM context and binds explicit inputs", () => {
  const { inputs, binding } = configuration(environment());
  assert.equal(binding.root, "avm"); assert.equal(binding.stateKey, "avm/unit.tfstate"); assert.equal(inputs.tenant_id, environment().ARM_TENANT_ID);
  assert.equal(binding.inputs, hash(JSON.stringify(inputs)));
});

test("disabled, public, template, unprotected, PR and rerun contexts fail closed", () => {
  for (const [key, value] of Object.entries({ WORKSHOP_AZURE_ENABLED: "false", REPOSITORY_PRIVATE: "false", REPOSITORY_TEMPLATE: "true", GITHUB_REF: "refs/heads/dev", GITHUB_REF_PROTECTED: "false", GITHUB_RUN_ATTEMPT: "2", GITHUB_EVENT_NAME: "pull_request", ARM_USE_CLI: "true", OPERATION: "destroy" })) assert.throws(() => configuration({ ...environment(), [key]: value }), key);
});

test("scope, identity and backend mistakes cannot reuse the baseline state", () => {
  for (const [key, value] of Object.entries({ PLAN_CLIENT_ID: environment().APPLY_CLIENT_ID, STATE_KEY: "baseline/dev.tfstate", STATE_CONTAINER: "bad/container", STATE_STORAGE_ACCOUNT: "BAD", ARM_TENANT_ID: "not-guid", GITHUB_SHA: "main", WORKLOAD_RG: "some-other-rg" })) assert.throws(() => configuration({ ...environment(), [key]: value }), key);
  for (const key of ["avm/../baseline.tfstate", "avm/a/../../shared.tfstate"]) assert.throws(() => configuration({ ...environment(), STATE_KEY: key }));
});

test("ambient credentials, input injection and Terraform CLI/state overrides are rejected", () => {
  for (const key of ["ARM_CLIENT_SECRET", "ARM_ACCESS_KEY", "ARM_SAS_TOKEN", "ARM_CLIENT_CERTIFICATE", "ARM_OIDC_TOKEN", "ARM_USE_MSI", "TF_CLI_ARGS", "TF_CLI_ARGS_plan", "TF_LOG", "TF_VAR_name", "TF_WORKSPACE", "TF_DATA_DIR"]) assert.throws(() => configuration({ ...environment(), [key]: "untrusted" }), key);
  const input = JSON.parse(environment().WORKLOAD_INPUTS_JSON);
  for (const value of [{ ...input, subscription_id: "foreign" }, { ...input, name: "production" }, { ...input, address_space: ["999.0.0.0/16"] }, { ...input, subnets: { web: input.subnets.web } }, { ...input, subnets: { ...input.subnets, "../foreign": input.subnets.web } }]) assert.throws(() => configuration({ ...environment(), WORKLOAD_INPUTS_JSON: JSON.stringify(value) }));
});

test("native child environment excludes personal credentials, shell overrides and logs", () => {
  const cleaned = terraformEnvironment({ Path: "native-path", ARM_CLIENT_ID: "client", ARM_CLIENT_SECRET: "hidden", GH_TOKEN: "hidden", AZURE_CONFIG_DIR: "personal", TF_CLI_ARGS_apply: "-target=x", NODE_OPTIONS: "--require=evil", ACTIONS_ID_TOKEN_REQUEST_URL: "https://example.invalid", HOME: "personal" });
  assert.equal(cleaned.Path, "native-path"); assert.equal(cleaned.ARM_CLIENT_SECRET, undefined); assert.equal(cleaned.GH_TOKEN, undefined); assert.equal(cleaned.TF_CLI_ARGS_apply, undefined); assert.equal(cleaned.NODE_OPTIONS, undefined);
  assert.notEqual(cleaned.HOME, "personal"); assert.equal(cleaned.ARM_USE_CLI, "false"); assert.equal(cleaned.TF_WORKSPACE, "default");
});

test("AVM plan accepts only the exact known VNet, NSG and stable subnet addresses", () => {
  const { plan, inputs } = fixture();
  assert.deepEqual(validatePlan(plan, inputs, "deploy"), { create: 4, update: 0, delete: 0, noChange: 0 });
  for (const item of plan.resource_changes) { item.change.before = structuredClone(item.change.after); item.change.actions = ["no-op"]; }
  assert.equal(validatePlan(plan, inputs, "followup").noChange, 4);
});

test("unknown parent/NSG IDs are allowed only for create dependencies in the same plan", () => {
  const { plan, inputs } = fixture();
  for (const item of plan.resource_changes.filter((entry) => entry.address.includes("module.subnet"))) {
    delete item.change.after.parent_id; delete item.change.after.body.properties.networkSecurityGroup.id;
    item.change.after_unknown = { parent_id: true, body: { properties: { networkSecurityGroup: { id: true } } } };
  }
  assert.throws(() => validatePlan(plan, inputs, "deploy"), /Reviewed root wiring/);
  assert.equal(validatePlan(plan, inputs, "deploy", approvedSource).create, 4);
  const changed = structuredClone(plan); changed.resource_changes[0].change.actions = ["no-op"];
  assert.throws(() => validatePlan(changed, inputs, "deploy", approvedSource), /Unknown parent/);
  const other = structuredClone(plan); other.resource_changes[1].change.actions = ["no-op"];
  assert.throws(() => validatePlan(other, inputs, "deploy", approvedSource), /Unknown NSG/);
});

test("reviewed root permits literal lesson tags but cannot redirect a computed NSG or parent", async () => {
  assert.equal(assertApprovedWiring(approvedSource), true);
  assert.equal(assertApprovedWiring(approvedSource.replace('    example     = "terraform-avm"', '    example     = "terraform-avm"\n    iteration   = "two"')), true);
  assert.throws(() => assertApprovedWiring(approvedSource.replace("id = module.security.resource_id", 'id = replace(module.security.resource_id, "-nsg", "-shared")')), /wiring changed/);
  assert.throws(() => assertApprovedWiring(approvedSource.replace('"terraform-avm"', '"${var.name}"')), /literal/);
  assert.throws(() => assertApprovedWiring(approvedSource.replace("parent_id        = local.resource_group_id", 'parent_id        = "foreign"')), /wiring changed/);
  assert.equal(typeof await verifyRootContract(new URL("../avm/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "string");
});

test("unexpected data lookups, provider/resource/API changes and extra resources fail", () => {
  for (const mutate of [
    (p) => { p.resource_changes[0].mode = "data"; },
    (p) => { p.resource_changes[0].provider_name = "registry.terraform.io/hashicorp/external"; },
    (p) => { p.resource_changes[0].type = "azapi_resource_action"; },
    (p) => { p.resource_changes[0].change.after.type = "Microsoft.Authorization/roleAssignments@2022-04-01"; },
    (p) => { p.resource_changes.push({ ...p.resource_changes[0], address: "module.network.azapi_resource.role_assignments" }); },
    (p) => { p.resource_changes.pop(); },
    (p) => { p.resource_changes[0].change.importing = { id: "existing" }; },
    (p) => { p.complete = false; },
  ]) { const { plan, inputs } = fixture(); mutate(plan); assert.throws(() => validatePlan(plan, inputs, "deploy")); }
});

test("foreign existing IDs, parents and NSG associations are rejected even inside the same RG", () => {
  for (const mutate of [
    (p) => { p.resource_changes[0].change.after.id += "-other"; },
    (p) => { p.resource_changes[0].change.before = { id: p.resource_changes[0].change.after.id + "-shared" }; },
    (p) => { p.resource_changes[0].change.after.parent_id += "-other"; },
    (p) => { p.resource_changes[2].change.after.body.properties.networkSecurityGroup.id += "-shared"; },
    (p) => { p.resource_changes[1].change.after.resource_group_name = "other"; },
  ]) { const { plan, inputs } = fixture(); mutate(plan); assert.throws(() => validatePlan(plan, inputs, "deploy")); }
});

test("unexpected addresses, open outbound access, extensions and custom NSG rules fail", () => {
  for (const mutate of [
    (p) => { p.resource_changes[2].change.after.body.properties.defaultOutboundAccess = true; },
    (p) => { p.resource_changes[2].change.after.body.properties.routeTable = { id: "foreign" }; },
    (p) => { p.resource_changes[0].change.after.body.properties.addressSpace.addressPrefixes = ["10.9.0.0/16"]; },
    (p) => { p.resource_changes[1].change.after.security_rule = [{ access: "Allow" }]; },
    (p) => { p.resource_changes[0].change.after.identity = [{ type: "SystemAssigned" }]; },
  ]) { const { plan, inputs } = fixture(); mutate(plan); assert.throws(() => validatePlan(plan, inputs, "deploy")); }
});

test("ordinary pushes cannot delete or replace; cleanup may delete only owned IDs", () => {
  const { plan, inputs } = fixture();
  plan.resource_changes[0].change.actions = ["delete", "create"];
  assert.throws(() => validatePlan(plan, inputs, "deploy"), /Replacement/);
  for (const item of plan.resource_changes) { item.change.before = item.change.after; item.change.after = null; item.change.actions = ["delete"]; }
  assert.throws(() => validatePlan(plan, inputs, "deploy"), /Destruction/);
  assert.equal(validatePlan(plan, inputs, "destroy").delete, 4);
  plan.resource_changes[0].change.before.id += "-other";
  assert.throws(() => validatePlan(plan, inputs, "destroy"));
});

test("environment policy requires a single main branch, independent reviewers and no bypass", () => {
  const env = { deployment_branch_policy: { protected_branches: false, custom_branch_policies: true }, can_admins_bypass: false, protection_rules: [{ type: "required_reviewers", prevent_self_review: true, reviewers: [{}] }] };
  const branches = [{ name: "main", type: "branch" }];
  assert.doesNotThrow(() => assertEnvironmentProtection(env, branches));
  for (const bad of [{ ...env, can_admins_bypass: true }, { ...env, protection_rules: [] }]) assert.throws(() => assertEnvironmentProtection(bad, branches));
  assert.throws(() => assertEnvironmentProtection(env, [{ name: "*", type: "branch" }]));
  assert.throws(() => assertEnvironmentProtection(env, [{ name: "main", type: "tag" }]));
});

test("saved plan binds current SHA/run/attempt/root/state/inputs/dependencies and age", () => {
  const { binding } = fixture(); const planBytes = Buffer.from("synthetic-only"); const now = Date.UTC(2026, 8, 21);
  const manifest = makeManifest(binding, planBytes, 2, now); const manifestBytes = Buffer.from(JSON.stringify(manifest));
  const args = { manifestBytes, planBytes, binding, planHash: hash(planBytes), manifestHash: hash(manifestBytes), mainSha: binding.sha, now };
  assert.equal(verifyManifest(args).exitCode, 2);
  assert.throws(() => verifyManifest({ ...args, now: now + MAX_AGE + 1 }));
  assert.throws(() => verifyManifest({ ...args, now: now - 1 }));
  assert.throws(() => verifyManifest({ ...args, mainSha: "b".repeat(40) }));
  assert.throws(() => verifyManifest({ ...args, planBytes: Buffer.from("tampered") }));
  for (const field of ["root", "stateKey", "inputs", "sha", "runId", "runAttempt", "operation", "planClientId"]) assert.throws(() => verifyManifest({ ...args, binding: { ...binding, [field]: "different" } }));
  assert.throws(() => makeManifest(binding, planBytes, 1));
});

test("fresh main check fails closed on unavailable API, lost protection and moved SHA", async () => {
  const { binding } = fixture();
  assert.equal(await currentMain(binding, async () => ({ status: 200, json: async () => ({ protected: true, commit: { sha: binding.sha } }) })), binding.sha);
  for (const data of [{ protected: false, commit: { sha: binding.sha } }, { protected: true, commit: { sha: "b".repeat(40) } }]) await assert.rejects(currentMain(binding, async () => ({ status: 200, json: async () => data })));
  await assert.rejects(currentMain(binding, async () => ({ status: 403 })));
  assert.equal(topology(fixture().inputs).resources.size, 4);
});
