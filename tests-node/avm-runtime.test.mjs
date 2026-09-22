import assert from "node:assert/strict";
import { constants, createDecipheriv, generateKeyPairSync, privateDecrypt } from "node:crypto";
import test from "node:test";
import { format } from "node:util";
import { topology } from "../scripts/avm-policy.mjs";
import { armReader, verifyAzure } from "../scripts/avm-verify.mjs";
import { openPlan, sealPlan } from "../scripts/plan-envelope.mjs";
import { environment, fixture } from "./avm-fixtures.mjs";

// No CLI entry points, external requests, real approvals or persisted keys.
// Every key pair is generated inside a test callback, never during import.
test("plan envelopes use test-local keys and authenticated encryption", { concurrency: false }, async (t) => {
  const pair = (modulusLength = 3072) => generateKeyPairSync("rsa", {
    modulusLength,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const approved = pair();
  const plan = Buffer.concat([Buffer.from("SYNTHETIC-PLAN-ONLY\n"), Buffer.from([0, 1, 128, 255])]);
  const manifest = Buffer.from(JSON.stringify({ schemaVersion: 1, binding: fixture().binding, synthetic: true }));
  const sealed = sealPlan(plan, manifest, approved.publicKey);

  await t.test("RSA-3072 roundtrip preserves both binary inputs without mutating them", () => {
    const before = [Buffer.from(plan), Buffer.from(manifest), Buffer.from(sealed)];
    assert.deepEqual(openPlan(sealed, approved.privateKey), { plan, manifest });
    assert.deepEqual([plan, manifest, sealed], before);
    assert.equal(sealed.includes(plan), false);
    assert.equal(sealed.includes(manifest), false);
  });

  await t.test("wire format independently verifies RSA-OAEP/SHA-256 and AES-256-GCM with the fixed AAD", () => {
    const value = JSON.parse(sealed);
    assert.deepEqual(Object.keys(value).sort(), ["ciphertext", "iv", "key", "tag", "version"]);
    assert.equal(value.version, 1);
    assert.equal(Buffer.from(value.key, "base64").length, 384);
    assert.equal(Buffer.from(value.iv, "base64").length, 12);
    assert.equal(Buffer.from(value.tag, "base64").length, 16);
    const key = privateDecrypt({ key: approved.privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(value.key, "base64"));
    try {
      assert.equal(key.length, 32);
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "base64"));
      decipher.setAAD(Buffer.from("ws2-agentalvine-avm-plan-envelope:v1"));
      decipher.setAuthTag(Buffer.from(value.tag, "base64"));
      const plaintext = Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]);
      assert.deepEqual(JSON.parse(plaintext), { plan: plan.toString("base64"), manifest: manifest.toString("base64") });
    } finally { key.fill(0); }
    const second = JSON.parse(sealPlan(plan, manifest, approved.publicKey));
    assert.notEqual(second.iv, value.iv, "Repeated sealing must use a fresh IV");
    assert.notEqual(second.ciphertext, value.ciphertext, "Repeated sealing must not reuse the same ciphertext");
  });

  await t.test("tampering with ciphertext, GCM tag, IV or wrapped key cannot decrypt", () => {
    for (const field of ["ciphertext", "tag", "iv", "key"]) {
      const value = JSON.parse(sealed);
      const bytes = Buffer.from(value[field], "base64");
      bytes[bytes.length - 1] ^= 1;
      value[field] = bytes.toString("base64");
      assert.throws(() => openPlan(Buffer.from(JSON.stringify(value)), approved.privateKey), `${field} tampering must fail`);
    }
    assert.deepEqual(openPlan(sealed, approved.privateKey), { plan, manifest });
  });

  await t.test("a different otherwise-valid RSA-3072 private key cannot open the envelope", () => {
    const other = pair();
    assert.throws(() => openPlan(sealed, other.privateKey));
  });

  await t.test("malformed public and private keys fail without fallback or key generation", () => {
    for (const key of ["", "not-a-pem-key", "-----BEGIN PRIVATE KEY-----\ninvalid\n-----END PRIVATE KEY-----"]) {
      assert.throws(() => sealPlan(plan, manifest, key));
      assert.throws(() => openPlan(sealed, key));
    }
  });

  await t.test("RSA-2048 and non-RSA keys are rejected by both directions", () => {
    const weak = pair(2048);
    assert.throws(() => sealPlan(plan, manifest, weak.publicKey), /3072/);
    assert.throws(() => openPlan(sealed, weak.privateKey), /3072/);
    const ec = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    assert.throws(() => sealPlan(plan, manifest, ec.publicKey), { code: "ERR_ASSERTION" });
    assert.throws(() => openPlan(sealed, ec.privateKey), { code: "ERR_ASSERTION" });
  });

  await t.test("malformed envelopes, invalid lengths and empty or oversized plaintext inputs fail", () => {
    for (const bytes of [Buffer.from("not-json"), Buffer.from("{}"), Buffer.from("null")]) assert.throws(() => openPlan(bytes, approved.privateKey));
    for (const mutate of [
      (value) => { value.version = 2; },
      (value) => { delete value.key; },
      (value) => { value.iv = Buffer.alloc(11).toString("base64"); },
      (value) => { value.tag = Buffer.alloc(15).toString("base64"); },
      (value) => { delete value.ciphertext; },
      (value) => { value.ciphertext = ""; },
      (value) => { value.ciphertext = {}; },
    ]) {
      const value = JSON.parse(sealed); mutate(value);
      assert.throws(() => openPlan(Buffer.from(JSON.stringify(value)), approved.privateKey));
    }
    assert.throws(() => sealPlan(Buffer.alloc(0), manifest, approved.publicKey), { code: "ERR_ASSERTION" });
    assert.throws(() => sealPlan(plan, Buffer.alloc(100_000), approved.publicKey), { code: "ERR_ASSERTION" });
  });
});

function privateFailure(pattern, sentinels) {
  return (error) => {
    const diagnostic = `${error.stack}\n${JSON.stringify(error)}`;
    assert.ok(sentinels.every((value) => !diagnostic.includes(value)), "Failure diagnostics must not contain token values");
    if (pattern) assert.ok(pattern.test(error.message), "Expected a sanitized failure at the requested boundary");
    return true;
  };
}

test("ARM authentication uses only an injected HTTP stub", { concurrency: false }, async (t) => {
  const tokens = { request: "synthetic-request-token-only", assertion: "synthetic-oidc-assertion-only", access: "synthetic-arm-access-token-only" };
  const sentinels = Object.values(tokens);
  const base = environment();
  const env = { ...base, ARM_CLIENT_ID: base.PLAN_CLIENT_ID, ACTIONS_ID_TOKEN_REQUEST_URL: "https://oidc.example.invalid/token?preserved=yes&audience=replace-me", ACTIONS_ID_TOKEN_REQUEST_TOKEN: tokens.request };
  const { rg, resources } = topology(fixture().inputs);
  const versions = new Map([[rg, "2021-04-01"], ...[...resources.values()].map((entry) => [entry.id, "2024-07-01"])]);
  let tokenLogged = false;
  for (const name of ["log", "info", "warn", "error", "debug"]) t.mock.method(console, name, (...args) => {
    const output = format(...args);
    tokenLogged ||= sentinels.some((value) => output.includes(value));
  });
  t.mock.method(globalThis, "fetch", async () => { throw new Error("External HTTP is forbidden in this test"); });
  t.after(() => assert.equal(tokenLogged, false, "No token may be logged, including on rejected requests"));

  function http(options = {}) {
    const calls = [], parsed = [];
    const request = async (url, init) => {
      const stage = calls.length === 0 ? "oidc" : calls.length === 1 ? "exchange" : "arm";
      const target = new URL(url);
      assert.equal(init.redirect, "error", "Every authenticated request must reject redirects");
      assert.ok(init.signal instanceof AbortSignal && !init.signal.aborted, "Every request must have a live timeout signal");
      calls.push({ stage, method: init.method ?? "GET", url: target.href });
      if (stage === "oidc") {
        assert.equal(init.method ?? "GET", "GET");
        assert.equal(target.origin, "https://oidc.example.invalid");
        assert.equal(target.pathname, "/token");
        assert.equal(target.searchParams.get("audience"), "api://AzureADTokenExchange");
        assert.equal(target.searchParams.getAll("audience").length, 1);
        assert.equal(target.searchParams.get("preserved"), "yes");
        assert.ok(init.headers.Authorization === `Bearer ${tokens.request}`, "OIDC request must use only its synthetic request token");
        assert.equal(init.body, undefined);
      } else if (stage === "exchange") {
        assert.equal(init.method, "POST");
        assert.equal(target.href, `https://login.microsoftonline.com/${env.ARM_TENANT_ID}/oauth2/v2.0/token`);
        assert.ok(init.body instanceof URLSearchParams);
        assert.deepEqual([...init.body.keys()].sort(), ["client_assertion", "client_assertion_type", "client_id", "grant_type", "scope"]);
        assert.equal(init.body.get("grant_type"), "client_credentials");
        assert.equal(init.body.get("client_id"), env.ARM_CLIENT_ID);
        assert.equal(init.body.get("scope"), "https://management.azure.com/.default");
        assert.equal(init.body.get("client_assertion_type"), "urn:ietf:params:oauth:client-assertion-type:jwt-bearer");
        assert.ok(init.body.get("client_assertion") === tokens.assertion, "Only the synthetic OIDC assertion may be exchanged");
        assert.equal(init.headers, undefined, "The GitHub request token must not be forwarded to the exchange");
      } else {
        assert.equal(init.method ?? "GET", "GET", "ARM verification must never mutate resources");
        assert.equal(target.origin, "https://management.azure.com");
        assert.ok(versions.has(target.pathname), "Only an explicitly requested synthetic topology ID may be read");
        assert.equal(target.searchParams.get("api-version"), versions.get(target.pathname));
        assert.ok(init.headers.Authorization === `Bearer ${tokens.access}`, "ARM must use only the exchanged synthetic token");
        assert.equal(init.body, undefined);
      }
      if (options.failure === stage) throw new Error("Synthetic HTTP transport failure");
      const status = options[`${stage}Status`] ?? 200;
      const body = Object.hasOwn(options, `${stage}Body`) ? options[`${stage}Body`]
        : stage === "oidc" ? { value: tokens.assertion } : stage === "exchange" ? { access_token: tokens.access } : { id: target.pathname };
      return { status, json: async () => { parsed.push(stage); return structuredClone(body); } };
    };
    return { request, calls, parsed };
  }

  await t.test("OIDC audience replacement, token exchange and all scoped ARM requests have the exact contract", async () => {
    const stub = http();
    const read = await armReader(env, stub.request);
    for (const [id, version] of versions) assert.deepEqual(await read(id, version), { status: 200, value: { id } });
    assert.deepEqual(stub.calls.map((call) => call.stage), ["oidc", "exchange", ...Array(versions.size).fill("arm")]);
    assert.deepEqual(stub.calls.map((call) => call.method), ["GET", "POST", ...Array(versions.size).fill("GET")]);
    assert.equal(stub.parsed.length, versions.size + 2);
  });

  await t.test("non-200 OIDC statuses stop before JSON parsing or Azure token exchange", async () => {
    for (const oidcStatus of [201, 302, 401, 403, 500]) {
      const stub = http({ oidcStatus });
      await assert.rejects(armReader(env, stub.request), privateFailure(/GitHub OIDC request failed/, sentinels));
      assert.equal(stub.calls.length, 1); assert.deepEqual(stub.parsed, []);
    }
  });

  await t.test("non-200 exchange statuses stop before reading a token or calling ARM", async () => {
    for (const exchangeStatus of [201, 302, 400, 401, 403, 500]) {
      const stub = http({ exchangeStatus });
      await assert.rejects(armReader(env, stub.request), privateFailure(/Azure OIDC exchange failed/, sentinels));
      assert.equal(stub.calls.length, 2); assert.deepEqual(stub.parsed, ["oidc"]);
    }
  });

  await t.test("missing, empty and non-string tokens are rejected without disclosure", async () => {
    for (const [stage, field] of [["oidc", "value"], ["exchange", "access_token"]]) {
      for (const body of [{}, { [field]: "" }, { [field]: 17 }]) {
        const stub = http({ [`${stage}Body`]: body });
        await assert.rejects(armReader(env, stub.request), privateFailure(null, sentinels));
        assert.equal(stub.calls.length, stage === "oidc" ? 1 : 2);
      }
    }
  });

  await t.test("ARM statuses are preserved and non-200 bodies are never mistaken for resources", async () => {
    for (const armStatus of [200, 301, 302, 401, 403, 404, 500]) {
      const stub = http({ armStatus });
      const read = await armReader(env, stub.request);
      assert.deepEqual(await read(rg, "2021-04-01"), { status: armStatus, value: armStatus === 200 ? { id: rg } : null });
      assert.deepEqual(stub.parsed, armStatus === 200 ? ["oidc", "exchange", "arm"] : ["oidc", "exchange"]);
      assert.equal(stub.calls.length, 3);
    }
  });

  await t.test("insecure OIDC URLs and out-of-scope ARM paths are rejected before a request", async () => {
    const insecure = http();
    await assert.rejects(armReader({ ...env, ACTIONS_ID_TOKEN_REQUEST_URL: "http://oidc.example.invalid/token" }, insecure.request), privateFailure(null, sentinels));
    assert.equal(insecure.calls.length, 0);
    const stub = http(), read = await armReader(env, stub.request);
    for (const id of ["https://elsewhere.example.invalid/", "/tenants/other", `${rg}?unbound=true`, `${rg}/providers/Microsoft.Authorization/roleAssignments/other`]) {
      await assert.rejects(read(id, "2021-04-01"), privateFailure(null, sentinels));
    }
    assert.equal(stub.calls.length, 2);
  });

  await t.test("OIDC, exchange and ARM transport failures propagate without retries or token logs", async () => {
    for (const failure of ["oidc", "exchange", "arm"]) {
      const stub = http({ failure });
      await assert.rejects(async () => {
        const read = await armReader(env, stub.request);
        await read(rg, "2021-04-01");
      }, privateFailure(/Synthetic HTTP transport failure/, sentinels));
      assert.equal(stub.calls.length, ["oidc", "exchange", "arm"].indexOf(failure) + 1);
    }
  });
});

function azureFixture(inputs = fixture().inputs, destroyed = false) {
  const { rg, vnet, nsg, resources } = topology(inputs);
  const calls = [], responses = new Map();
  const tags = { workshop: "ws2", environment: "dev", example: "terraform-avm" };
  const subnets = Object.entries(inputs.subnets).map(([name, value], index) => ({
    id: `${vnet}/subnets/${name}`, name, type: "Microsoft.Network/virtualNetworks/subnets",
    properties: {
      provisioningState: "Succeeded",
      ...(index === 0 && value.address_prefixes.length === 1 ? { addressPrefix: value.address_prefixes[0] } : { addressPrefixes: [...value.address_prefixes] }),
      networkSecurityGroup: { id: nsg }, defaultOutboundAccess: false,
    },
  }));
  responses.set(rg, { status: 200, value: { id: rg, name: inputs.resource_group_name, type: "Microsoft.Resources/resourceGroups", location: inputs.location, properties: { provisioningState: "Succeeded" } } });
  responses.set(vnet, { status: 200, value: { id: vnet, name: inputs.name, type: "Microsoft.Network/virtualNetworks", location: inputs.location, tags: { ...tags }, properties: { provisioningState: "Succeeded", addressSpace: { addressPrefixes: [...inputs.address_space] }, subnets: structuredClone(subnets) } } });
  responses.set(nsg, { status: 200, value: { id: nsg, name: `${inputs.name}-nsg`, type: "Microsoft.Network/networkSecurityGroups", location: inputs.location, tags: { ...tags }, properties: { provisioningState: "Succeeded", securityRules: [], defaultSecurityRules: [{ id: `${nsg}/defaultSecurityRules/DenyAllInBound`, name: "DenyAllInBound", properties: { access: "Deny", direction: "Inbound", priority: 65500 } }] } } });
  for (const subnet of subnets) responses.set(subnet.id, { status: 200, value: subnet });
  if (destroyed) for (const { id } of resources.values()) responses.set(id, { status: 404, value: null });
  const read = async (id, version) => {
    assert.ok(responses.has(id), "Unexpected resource read; no fallback to HTTP is allowed");
    assert.equal(version, id === rg ? "2021-04-01" : "2024-07-01");
    calls.push({ id, version });
    return structuredClone(responses.get(id));
  };
  return { inputs, ids: { rg, vnet, nsg, web: `${vnet}/subnets/web`, data: `${vnet}/subnets/data` }, resources, responses, read, calls };
}

test("Azure verification consumes synthetic responses in real ARM API shape", { concurrency: false }, async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("External HTTP is forbidden in this test"); });
  await t.test("all four topology resources, both subnet prefix shapes and the retained RG are checked", async () => {
    const sample = azureFixture();
    assert.equal(await verifyAzure(sample.inputs, false, sample.read), 4);
    assert.deepEqual(sample.calls, [{ id: sample.ids.rg, version: "2021-04-01" }, ...[...sample.resources.values()].map(({ id }) => ({ id, version: "2024-07-01" }))]);
    assert.ok(sample.responses.get(sample.ids.nsg).value.properties.defaultSecurityRules.length > 0, "Azure default rules are not custom security rules");
  });

  await t.test("case-insensitive resource IDs and unordered CIDR/subnet arrays are accepted", async () => {
    const inputs = fixture().inputs;
    inputs.address_space.push("10.43.0.0/16");
    inputs.subnets.data.address_prefixes.push("10.43.2.0/24");
    const sample = azureFixture(inputs);
    for (const { value } of sample.responses.values()) value.id = value.id.toUpperCase();
    sample.responses.get(sample.ids.vnet).value.properties.addressSpace.addressPrefixes.reverse();
    sample.responses.get(sample.ids.vnet).value.properties.subnets.reverse();
    sample.responses.get(sample.ids.data).value.properties.addressPrefixes.reverse();
    for (const id of [sample.ids.web, sample.ids.data]) sample.responses.get(id).value.properties.networkSecurityGroup.id = sample.ids.nsg.toUpperCase();
    assert.equal(await verifyAzure(inputs, false, sample.read), 4);
  });

  await t.test("mismatched IDs, CIDRs, NSG association, outbound access and extra topology are rejected", async () => {
    const mutations = [
      ...["rg", "vnet", "nsg", "web"].map((kind) => [`${kind} ID`, (s) => { s.responses.get(s.ids[kind]).value.id += "-foreign"; }]),
      ["VNet CIDR", (s) => { s.responses.get(s.ids.vnet).value.properties.addressSpace.addressPrefixes = ["10.99.0.0/16"]; }],
      ["subnet CIDR", (s) => { s.responses.get(s.ids.web).value.properties.addressPrefix = "10.99.1.0/24"; }],
      ["NSG association", (s) => { s.responses.get(s.ids.web).value.properties.networkSecurityGroup.id += "-foreign"; }],
      ["outbound enabled", (s) => { s.responses.get(s.ids.web).value.properties.defaultOutboundAccess = true; }],
      ["outbound unspecified", (s) => { delete s.responses.get(s.ids.web).value.properties.defaultOutboundAccess; }],
      ["extra subnet", (s) => { s.responses.get(s.ids.vnet).value.properties.subnets.push({ name: "unowned", id: `${s.ids.vnet}/subnets/unowned` }); }],
      ["out-of-band peering", (s) => { s.responses.get(s.ids.vnet).value.properties.virtualNetworkPeerings = [{ name: "foreign-peering" }]; }],
      ["missing subnet", (s) => { s.responses.get(s.ids.vnet).value.properties.subnets.pop(); }],
      ["custom NSG rule", (s) => { s.responses.get(s.ids.nsg).value.properties.securityRules.push({ name: "unreviewed-allow" }); }],
      ["unfinished provisioning", (s) => { s.responses.get(s.ids.vnet).value.properties.provisioningState = "Updating"; }],
      ["wrong location", (s) => { s.responses.get(s.ids.nsg).value.location = "westus"; }],
      ["wrong ownership tag", (s) => { s.responses.get(s.ids.vnet).value.tags.workshop = "other"; }],
    ];
    for (const [name, mutate] of mutations) {
      const sample = azureFixture(); mutate(sample);
      await assert.rejects(verifyAzure(sample.inputs, false, sample.read), { code: "ERR_ASSERTION" }, name);
    }
  });

  await t.test("401, 403, 404 and 500 resource responses cannot pass deployment verification", async () => {
    for (const status of [401, 403, 404, 500]) {
      const sample = azureFixture(); sample.responses.set(sample.ids.web, { status, value: null });
      await assert.rejects(verifyAzure(sample.inputs, false, sample.read), /Resource cannot be verified/);
    }
  });

  await t.test("destroy succeeds only with exact owned-resource 404s and an accessible same-ID RG", async () => {
    const sample = azureFixture(fixture().inputs, true);
    assert.equal(await verifyAzure(sample.inputs, true, sample.read), 4);
    assert.deepEqual(sample.calls.map(({ id }) => id), [sample.ids.rg, ...[...sample.resources.values()].map(({ id }) => id)]);
  });

  await t.test("retained resources, redirects, auth/server errors, 410 and string 404 cannot prove destruction", async () => {
    for (const status of [200, 202, 301, 302, 401, 403, 410, 500, "404"]) {
      const sample = azureFixture(fixture().inputs, true);
      sample.responses.set(sample.ids.web, { status, value: null });
      await assert.rejects(verifyAzure(sample.inputs, true, sample.read), /Owned resource still exists or absence is unverified/);
    }
  });

  await t.test("an inaccessible, missing or wrong-ID retained RG invalidates both live and cleanup claims", async () => {
    for (const destroyed of [false, true]) {
      for (const status of [401, 403, 404, 500]) {
        const sample = azureFixture(fixture().inputs, destroyed);
        sample.responses.set(sample.ids.rg, { status, value: null });
        await assert.rejects(verifyAzure(sample.inputs, destroyed, sample.read), /Retained RG must remain accessible/);
        assert.equal(sample.calls.length, 1, "No resource 404s may be credited without the positive RG control");
      }
      const sample = azureFixture(fixture().inputs, destroyed);
      sample.responses.get(sample.ids.rg).value.id += "-foreign";
      await assert.rejects(verifyAzure(sample.inputs, destroyed, sample.read), { code: "ERR_ASSERTION" });
      assert.equal(sample.calls.length, 1);
    }
  });
});

// The former reviewer-exclusion tail is replaced by the complete scoped
// authorization matrix in deployment-authorization.test.mjs. Crypto and
// injected ARM-HTTP/lifecycle tests above remain independent and unchanged.
