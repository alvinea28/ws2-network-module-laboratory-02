import assert from "node:assert/strict";
import { topology } from "./avm-policy.mjs";

export async function armReader(env, request = fetch) {
  const oidc = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
  assert.equal(oidc.protocol, "https:");
  oidc.searchParams.set("audience", "api://AzureADTokenExchange");
  const tokenResponse = await request(oidc, { headers: { Authorization: `Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` }, redirect: "error", signal: AbortSignal.timeout(30_000) });
  assert.equal(tokenResponse.status, 200, "GitHub OIDC request failed");
  const assertion = (await tokenResponse.json()).value;
  assert.ok(typeof assertion === "string" && assertion.length > 0);
  const exchange = await request(`https://login.microsoftonline.com/${env.ARM_TENANT_ID}/oauth2/v2.0/token`, { method: "POST", redirect: "error", signal: AbortSignal.timeout(30_000), body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.ARM_CLIENT_ID, scope: "https://management.azure.com/.default", client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer", client_assertion: assertion }) });
  assert.equal(exchange.status, 200, "Azure OIDC exchange failed");
  const token = (await exchange.json()).access_token;
  assert.ok(typeof token === "string" && token.length > 0);
  return async (id, version) => {
    assert.match(id, /^\/subscriptions\/[a-f\d-]+\/resourceGroups\/[a-zA-Z\d_().-]+(?:\/providers\/Microsoft\.Network\/[a-zA-Z\d_()./-]+)?$/i);
    const response = await request(`https://management.azure.com${id}?api-version=${version}`, { headers: { Authorization: `Bearer ${token}` }, redirect: "error", signal: AbortSignal.timeout(30_000) });
    return { status: response.status, value: response.status === 200 ? await response.json() : null };
  };
}

export async function verifyAzure(inputs, destroyed, read) {
  const { rg, vnet, nsg, resources } = topology(inputs);
  const group = await read(rg, "2021-04-01");
  assert.equal(group.status, 200, "Retained RG must remain accessible; bare resource errors do not prove cleanup");
  assert.equal(group.value.id.toLowerCase(), rg.toLowerCase());
  for (const expected of resources.values()) {
    const response = await read(expected.id, "2024-07-01");
    if (destroyed) { assert.equal(response.status, 404, "Owned resource still exists or absence is unverified"); continue; }
    assert.equal(response.status, 200, "Resource cannot be verified");
    const actual = response.value;
    assert.equal(actual.id.toLowerCase(), expected.id.toLowerCase());
    assert.equal(actual.properties.provisioningState, "Succeeded");
    if (expected.kind === "subnet") {
      const prefixes = actual.properties.addressPrefixes ?? [actual.properties.addressPrefix];
      assert.deepEqual([...prefixes].sort(), [...inputs.subnets[expected.name].address_prefixes].sort());
      assert.equal(actual.properties.networkSecurityGroup.id.toLowerCase(), nsg.toLowerCase());
      assert.equal(actual.properties.defaultOutboundAccess, false);
    } else {
      assert.equal(actual.location, inputs.location);
      assert.equal(actual.tags?.workshop, "ws2");
      assert.equal(actual.tags?.environment, "dev");
      if (expected.kind === "vnet") {
        assert.equal(actual.id.toLowerCase(), vnet.toLowerCase());
        assert.deepEqual([...actual.properties.addressSpace.addressPrefixes].sort(), [...inputs.address_space].sort());
        assert.deepEqual(actual.properties.subnets.map((entry) => entry.name).sort(), Object.keys(inputs.subnets).sort());
        assert.equal(actual.properties.virtualNetworkPeerings?.length ?? 0, 0, "Unexpected VNet peering is not a verified configuration");
      } else assert.equal(actual.properties.securityRules?.length ?? 0, 0, "Unexpected custom NSG rules");
    }
  }
  return resources.size;
}
