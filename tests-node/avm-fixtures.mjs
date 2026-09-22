// Approved repository identity allowlist with synthetic runs, plans and HTTP
// responses. These offline fixtures are never live GitHub or cloud evidence.
import { configuration, TERRAFORM, topology } from "../scripts/avm-policy.mjs";

export function environment() {
  const repository = "alvine-aurelio-org/ws2-sim-20260921-network-module-laboratory-02";
  return { WORKSHOP_AZURE_ENABLED: "true", REPOSITORY_PRIVATE: "true", REPOSITORY_TEMPLATE: "false", GITHUB_REF: "refs/heads/main", GITHUB_REF_PROTECTED: "true", GITHUB_RUN_ATTEMPT: "1", GITHUB_EVENT_NAME: "push", OPERATION: "deploy", ARM_USE_OIDC: "true", ARM_USE_AZUREAD: "true", ARM_USE_CLI: "false", ARM_TENANT_ID: "00000000-0000-0000-0000-000000000000", ARM_SUBSCRIPTION_ID: "00000000-0000-0000-0000-000000000000", PLAN_CLIENT_ID: "11111111-1111-1111-1111-111111111111", APPLY_CLIENT_ID: "22222222-2222-2222-2222-222222222222", GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_ID: "1379147533", GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/avm-delivery.yml@refs/heads/main`, GITHUB_SHA: "a".repeat(40), GITHUB_RUN_ID: "123", STATE_STORAGE_ACCOUNT: "unitstateonly", STATE_CONTAINER: "unit-container", STATE_KEY: "avm/unit.tfstate", WS2_STATE_LOCK_ID: "unit-avm", WORKLOAD_RG: "rg-unit-only", WORKLOAD_INPUTS_JSON: JSON.stringify({ name: "ws2-avm-unit", location: "eastus", resource_group_name: "rg-unit-only", address_space: ["10.42.0.0/16"], subnets: { web: { address_prefixes: ["10.42.1.0/24"] }, data: { address_prefixes: ["10.42.2.0/24"] } } }) };
}

export function fixture() {
  const { inputs, binding } = configuration(environment());
  const { resources, nsg } = topology(inputs);
  const plan = { format_version: "1.2", terraform_version: TERRAFORM, complete: true, resource_changes: [...resources.entries()].map(([address, expected]) => {
    const after = { id: expected.id, name: expected.name, location: inputs.location, tags: { workshop: "ws2", environment: "dev", example: "terraform-avm" } };
    if (expected.kind === "nsg") Object.assign(after, { resource_group_name: inputs.resource_group_name, security_rule: [] });
    else Object.assign(after, { type: expected.api, parent_id: expected.parent, identity: [], body: { properties: expected.kind === "vnet" ? { addressSpace: { addressPrefixes: inputs.address_space }, enableDdosProtection: false, enableVmProtection: false } : { addressPrefixes: inputs.subnets[expected.name].address_prefixes, defaultOutboundAccess: false, networkSecurityGroup: { id: nsg }, delegations: [] } } });
    return { address, mode: "managed", type: expected.type, provider_name: expected.provider, change: { actions: ["create"], before: null, after, after_unknown: {} } };
  }) };
  return { inputs, binding, plan };
}
