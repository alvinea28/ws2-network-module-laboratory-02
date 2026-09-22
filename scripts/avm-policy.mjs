import assert from "node:assert/strict";
import { assertApprovedWiring, hash } from "./avm-dependencies.mjs";
import authorization from "./deployment-authorization.cjs";

export const TERRAFORM = "1.16.1";
export const PROVIDERS = Object.freeze({ "registry.terraform.io/hashicorp/azurerm": "4.81.0", "registry.terraform.io/azure/azapi": "2.12.0", "registry.terraform.io/azure/modtm": "0.3.5", "registry.terraform.io/hashicorp/random": "3.9.1" });
export const MAX_AGE = 2 * 60 * 60 * 1000;
const guid = /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const operations = new Set(["deploy", "destroy", "followup", "drift"]);
const identicalId = (actual, expected) => assert.ok(typeof actual === "string" && actual.toLowerCase() === expected.toLowerCase(), "Resource is outside the exact owned topology");

export function operationFor(event, input, workflowRef) {
  return authorization.operationFor(event, input, workflowRef, "avm");
}

export function configuration(env) {
  for (const [key, value] of Object.entries({ WORKSHOP_AZURE_ENABLED: "true", REPOSITORY_PRIVATE: "true", REPOSITORY_TEMPLATE: "false", GITHUB_REF: "refs/heads/main", GITHUB_REF_PROTECTED: "true", GITHUB_RUN_ATTEMPT: "1", ARM_USE_OIDC: "true", ARM_USE_AZUREAD: "true", ARM_USE_CLI: "false" })) assert.equal(env[key], value, `Invalid trusted context: ${key}`);
  const profile = authorization.assertRepository({ id: Number(env.GITHUB_REPOSITORY_ID), full_name: env.GITHUB_REPOSITORY, private: env.REPOSITORY_PRIVATE === "true", is_template: env.REPOSITORY_TEMPLATE !== "false" }, "avm");
  assert.equal(env.GITHUB_REPOSITORY_ID, String(profile.id), "Unapproved immutable repository identity");
  assert.ok(["push", "schedule", "workflow_dispatch"].includes(env.GITHUB_EVENT_NAME));
  assert.ok(operations.has(env.OPERATION));
  assert.equal(env.OPERATION, operationFor(env.GITHUB_EVENT_NAME, env.OPERATION, env.GITHUB_WORKFLOW_REF), "Operation differs from trusted workflow/event");
  for (const key of Object.keys(env)) {
    if (/^ARM_.*(?:SECRET|CERTIFICATE|ACCESS_KEY|SAS|TOKEN_FILE|CLIENT_ID_FILE|TENANT_ID_FILE)/.test(key)) assert.ok(!env[key], "Ambient credentials are forbidden");
    if (/^TF_(?:VAR_|CLI_ARGS|LOG)/.test(key)) assert.ok(!env[key], "Ambient Terraform overrides are forbidden");
  }
  for (const key of ["ARM_OIDC_TOKEN", "ARM_USE_MSI", "ARM_USE_AKS_WORKLOAD_IDENTITY", "TF_DATA_DIR", "TF_WORKSPACE"]) assert.ok(!env[key], "Alternate auth/state contexts are forbidden");
  for (const key of ["ARM_TENANT_ID", "ARM_SUBSCRIPTION_ID", "PLAN_CLIENT_ID", "APPLY_CLIENT_ID"]) assert.match(env[key] ?? "", guid);
  assert.notEqual(env.PLAN_CLIENT_ID.toLowerCase(), env.APPLY_CLIENT_ID.toLowerCase(), "Plan/apply identities must differ");
  assert.match(env.GITHUB_REPOSITORY ?? "", /^[\w.-]+\/[\w.-]+$/);
  assert.match(env.GITHUB_SHA ?? "", /^[a-f\d]{40}$/);
  assert.match(env.GITHUB_RUN_ID ?? "", /^\d+$/);
  assert.match(env.STATE_STORAGE_ACCOUNT ?? "", /^[a-z\d]{3,24}$/);
  assert.match(env.STATE_CONTAINER ?? "", /^[a-z\d][a-z\d-]{1,61}[a-z\d]$/);
  assert.match(env.STATE_KEY ?? "", /^avm\/[a-zA-Z\d][a-zA-Z\d_./-]{0,180}\.tfstate$/);
  assert.ok(!env.STATE_KEY.split("/").includes(".."));
  assert.match(env.WS2_STATE_LOCK_ID ?? "", /^[a-zA-Z\d-]{3,80}$/);
  const raw = JSON.parse(env.WORKLOAD_INPUTS_JSON);
  assert.deepEqual(Object.keys(raw).sort(), ["address_space", "location", "name", "resource_group_name", "subnets"]);
  assert.equal(raw.resource_group_name, env.WORKLOAD_RG);
  assert.match(raw.resource_group_name, /^[a-zA-Z\d_().-]{1,90}$/);
  assert.match(raw.name, /^ws2-avm-[a-z\d][a-z\d-]{1,35}$/);
  assert.match(raw.location, /^[a-z][a-z\d]{1,30}$/);
  const cidrs = (list) => assert.ok(Array.isArray(list) && list.length > 0 && list.every((cidr) => {
    if (typeof cidr !== "string") return false;
    const parts = cidr.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);
    return parts && parts.slice(1, 5).every((part) => Number(part) <= 255) && Number(parts[5]) <= 32;
  }), "Use approved IPv4 prefixes");
  cidrs(raw.address_space);
  assert.ok(raw.subnets && !Array.isArray(raw.subnets) && Object.keys(raw.subnets).length >= 2);
  for (const [key, value] of Object.entries(raw.subnets)) { assert.match(key, /^[a-z][a-z\d-]{0,40}$/); assert.deepEqual(Object.keys(value), ["address_prefixes"]); cidrs(value.address_prefixes); }
  const inputs = { ...raw, tenant_id: env.ARM_TENANT_ID, subscription_id: env.ARM_SUBSCRIPTION_ID };
  const binding = { root: "avm", environment: "avm", operation: env.OPERATION, repository: env.GITHUB_REPOSITORY, repositoryId: env.GITHUB_REPOSITORY_ID, workflowRef: env.GITHUB_WORKFLOW_REF, sha: env.GITHUB_SHA, runId: env.GITHUB_RUN_ID, runAttempt: "1", tenant: env.ARM_TENANT_ID, subscription: env.ARM_SUBSCRIPTION_ID, planClientId: env.PLAN_CLIENT_ID, applyClientId: env.APPLY_CLIENT_ID, resourceGroup: env.WORKLOAD_RG, stateAccount: env.STATE_STORAGE_ACCOUNT, stateContainer: env.STATE_CONTAINER, stateKey: env.STATE_KEY, stateLockId: env.WS2_STATE_LOCK_ID, terraform: TERRAFORM, providers: PROVIDERS, inputs: hash(JSON.stringify(inputs)) };
  return { inputs, binding };
}

export function topology(inputs) {
  const rg = `/subscriptions/${inputs.subscription_id}/resourceGroups/${inputs.resource_group_name}`;
  const vnet = `${rg}/providers/Microsoft.Network/virtualNetworks/${inputs.name}`;
  const nsg = `${rg}/providers/Microsoft.Network/networkSecurityGroups/${inputs.name}-nsg`;
  const resources = new Map([
    ["module.network.azapi_resource.vnet", { kind: "vnet", name: inputs.name, type: "azapi_resource", provider: "registry.terraform.io/azure/azapi", api: "Microsoft.Network/virtualNetworks@2024-07-01", id: vnet, parent: rg }],
    ["module.security.azurerm_network_security_group.this", { kind: "nsg", name: `${inputs.name}-nsg`, type: "azurerm_network_security_group", provider: "registry.terraform.io/hashicorp/azurerm", id: nsg }],
  ]);
  for (const key of Object.keys(inputs.subnets)) resources.set(`module.network.module.subnet[${JSON.stringify(key)}].azapi_resource.subnet[0]`, { kind: "subnet", name: key, type: "azapi_resource", provider: "registry.terraform.io/azure/azapi", api: "Microsoft.Network/virtualNetworks/subnets@2024-07-01", id: `${vnet}/subnets/${key}`, parent: vnet });
  return { rg, vnet, nsg, resources };
}

export function validatePlan(plan, inputs, operation, reviewedSource) {
  assert.match(String(plan.format_version), /^1\./);
  assert.equal(plan.terraform_version, TERRAFORM);
  assert.ok(operations.has(operation));
  assert.ok(!plan.errored && plan.complete !== false && !plan.deferred_changes?.length, "Incomplete or errored plan");
  const { resources, nsg } = topology(inputs);
  const changes = plan.resource_changes ?? [];
  assert.ok(Array.isArray(changes));
  assert.equal(new Set(changes.map((entry) => entry.address)).size, changes.length);
  if (operation !== "destroy") assert.deepEqual(changes.map((entry) => entry.address).sort(), [...resources.keys()].sort(), "Plan must cover exactly this AVM network topology");
  const creates = new Set(changes.filter((entry) => JSON.stringify(entry.change?.actions) === '["create"]').map((entry) => entry.address));
  const totals = { create: 0, update: 0, delete: 0, noChange: 0 };
  for (const item of changes) {
    const expected = resources.get(item.address);
    assert.ok(expected, "Unexpected resource address; no roles, telemetry, peering or shared infrastructure");
    assert.equal(item.mode, "managed", "Unreviewed data lookup is not permitted");
    assert.equal(item.type, expected.type);
    assert.equal(item.provider_name, expected.provider);
    assert.ok(!item.change.importing && !item.previous_address, "No import or moved ownership in this route");
    const actions = item.change.actions;
    assert.ok(Array.isArray(actions) && actions.length === 1, "Replacement requires separately authorized full cleanup");
    const action = actions[0];
    assert.ok((operation === "destroy" ? ["delete", "no-op"] : ["create", "update", "no-op"]).includes(action), "Destruction is explicit, never an ordinary push");
    if (item.change.before) identicalId(item.change.before.id, expected.id);
    const after = item.change.after;
    if (action !== "delete") {
      assert.ok(after && typeof after === "object");
      assert.equal(after.name, expected.name);
      if (after.id) identicalId(after.id, expected.id);
      if (expected.kind === "nsg") {
        assert.equal(after.resource_group_name, inputs.resource_group_name);
        assert.equal(after.location, inputs.location);
        assert.ok(!after.security_rule?.length, "Additional NSG rules are outside this profile");
      } else {
        assert.equal(after.type, expected.api);
        assert.ok(!after.identity?.length && !after.sensitive_body, "No identities or hidden resource properties");
        if (after.parent_id) identicalId(after.parent_id, expected.parent);
        else {
          assertApprovedWiring(reviewedSource);
          assert.ok(expected.kind === "subnet" && action === "create" && item.change.after_unknown?.parent_id === true && creates.has("module.network.azapi_resource.vnet"), "Unknown parent is only allowed for the network created in this same plan");
        }
        const properties = after.body?.properties;
        assert.ok(properties);
        if (expected.kind === "vnet") {
          assert.equal(after.location, inputs.location);
          assert.deepEqual(properties.addressSpace?.addressPrefixes, inputs.address_space);
          for (const field of ["ddosProtectionPlan", "dhcpOptions", "encryption", "bgpCommunities"]) assert.ok(properties[field] == null, "Unreviewed network extension");
          assert.equal(properties.enableDdosProtection, false);
          assert.equal(properties.enableVmProtection, false);
          assert.equal(properties.virtualNetworkPeerings?.length ?? 0, 0, "Unreviewed VNet peering");
          assert.ok(!after.body.extendedLocation && !properties.addressSpace.ipamPoolPrefixAllocations);
        } else {
          assert.deepEqual(properties.addressPrefixes, inputs.subnets[expected.name].address_prefixes);
          assert.equal(properties.defaultOutboundAccess, false);
          assert.ok(!properties.delegations?.length && !properties.natGateway && !properties.routeTable && !properties.serviceEndpointPolicies?.length && !properties.serviceEndpoints?.length, "Unreviewed subnet extension");
          const association = properties.networkSecurityGroup?.id;
          if (association) identicalId(association, nsg);
          else {
            assertApprovedWiring(reviewedSource);
            assert.ok(action === "create" && item.change.after_unknown?.body?.properties?.networkSecurityGroup?.id === true && creates.has("module.security.azurerm_network_security_group.this"), "Unknown NSG must be the new same-plan NSG");
          }
        }
      }
      if (expected.kind !== "subnet") { assert.equal(after.tags?.workshop, "ws2"); assert.equal(after.tags?.environment, "dev"); }
    }
    totals[action === "no-op" ? "noChange" : action] += 1;
  }
  return totals;
}

export function assertEnvironmentProtection(environment, branches) {
  return authorization.assertEnvironmentProtection(environment, branches);
}

export function makeManifest(binding, plan, exitCode, now = Date.now()) {
  assert.ok([0, 2].includes(exitCode), "Only successful Terraform plans may continue");
  return { schemaVersion: 1, binding, planSha256: hash(plan), createdAt: new Date(now).toISOString(), exitCode };
}

export function verifyManifest({ manifestBytes, planBytes, binding, planHash, manifestHash, mainSha, now = Date.now() }) {
  assert.match(planHash, /^[a-f\d]{64}$/); assert.match(manifestHash, /^[a-f\d]{64}$/);
  assert.equal(hash(manifestBytes), manifestHash, "Manifest altered");
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.schemaVersion, 1); assert.deepEqual(manifest.binding, binding, "Commit/run/root/state/inputs/dependencies mismatch; repository and workflow identity must also match");
  assert.equal(mainSha, binding.sha, "Main moved; start a fresh protected-main run and saved plan");
  assert.ok(["deploy", "destroy"].includes(binding.operation), "Read-only operations cannot apply");
  assert.equal(hash(planBytes), planHash, "Plan altered"); assert.equal(manifest.planSha256, planHash);
  const age = now - Date.parse(manifest.createdAt);
  assert.ok(Number.isFinite(age) && age >= 0 && age <= MAX_AGE, "Plan expired or has an invalid timestamp");
  assert.ok([0, 2].includes(manifest.exitCode));
  return manifest;
}
