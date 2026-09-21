// Same reviewed envelope format as Lab07; this copy has its own private writer.
import assert from "node:assert/strict";
import { randomBytes, createCipheriv, createDecipheriv, createPublicKey, createPrivateKey, publicEncrypt, privateDecrypt, constants } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const AAD = Buffer.from("ws2-agentalvine-avm-plan-envelope:v1");
const MAX = 64 * 1024 * 1024;
function rsa(pem, privateKey = false) {
  const key = privateKey ? createPrivateKey(pem) : createPublicKey(pem);
  assert.equal(key.asymmetricKeyType, "rsa");
  assert.ok(key.asymmetricKeyDetails.modulusLength >= 3072, "Use an approved RSA 3072-bit or stronger key");
  return key;
}

export function sealPlan(plan, manifest, publicKey) {
  assert.ok(plan.length > 0 && plan.length < MAX && manifest.length < 100_000);
  const key = randomBytes(32);
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(AAD);
    const payload = Buffer.from(JSON.stringify({ plan: plan.toString("base64"), manifest: manifest.toString("base64") }));
    const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
    const wrapped = publicEncrypt({ key: rsa(publicKey), padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, key);
    return Buffer.from(JSON.stringify({ version: 1, key: wrapped.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") }));
  } finally { key.fill(0); }
}

export function openPlan(bytes, privateKey) {
  assert.ok(bytes.length < MAX * 2);
  const value = JSON.parse(bytes);
  assert.equal(value.version, 1);
  const key = privateDecrypt({ key: rsa(privateKey, true), padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(value.key, "base64"));
  try {
    const iv = Buffer.from(value.iv, "base64"), tag = Buffer.from(value.tag, "base64");
    assert.equal(key.length, 32); assert.equal(iv.length, 12); assert.equal(tag.length, 16);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(AAD); decipher.setAuthTag(tag);
    const valueBytes = Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]);
    const payload = JSON.parse(valueBytes);
    const plan = Buffer.from(payload.plan, "base64"), manifest = Buffer.from(payload.manifest, "base64");
    assert.ok(plan.length > 0 && plan.length < MAX && manifest.length < 100_000);
    return { plan, manifest };
  } finally { key.fill(0); }
}

async function main(mode) {
  assert.equal(process.env.WORKSHOP_AZURE_ENABLED, "true", "Only an explicitly enabled protected job may handle saved plans");
  if (mode === "seal") {
    assert.ok(process.env.PLAN_ENCRYPTION_PUBLIC_KEY);
    await mkdir(".workshop/sealed", { recursive: true, mode: 0o700 });
    const envelope = sealPlan(await readFile(".workshop/private/reviewed.tfplan"), await readFile(".workshop/private/manifest.json"), process.env.PLAN_ENCRYPTION_PUBLIC_KEY);
    await writeFile(".workshop/sealed/plan.enc", envelope, { mode: 0o600 });
  } else if (mode === "open") {
    assert.ok(process.env.PLAN_DECRYPTION_PRIVATE_KEY);
    const { plan, manifest } = openPlan(await readFile(".workshop/sealed/plan.enc"), process.env.PLAN_DECRYPTION_PRIVATE_KEY);
    await mkdir(".workshop/private", { recursive: true, mode: 0o700 });
    await writeFile(".workshop/private/reviewed.tfplan", plan, { mode: 0o600 });
    await writeFile(".workshop/private/manifest.json", manifest, { mode: 0o600 });
  } else throw new Error("Use protected seal/open only");
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main(process.argv[2]).catch(() => { console.error("Plan envelope stopped; check approved key access and integrity privately. No key or plaintext was printed."); process.exitCode = 1; });
